import { describe, expect, it } from 'vitest';
import { buildChatCompletionBody, buildChatCompletionsUrl } from '@core-llm/chat';
import { buildTestConnectionMessages, buildTranslationMessages } from '@core-llm/prompt';
import { buildModelsUrl, parseModelsResponse } from '@core-llm/models';
import { parseJsonStringArray, parseTranslationReply } from '@core-llm/parse';
import type { TranslationRequest } from '@shared/types';

const fullPageRequest = (texts: string[]): TranslationRequest => ({
  id: 'req-1',
  type: 'full-page',
  texts,
});

describe('chat wire format (ADR-001)', () => {
  it('joins base URL with the chat completions path, trimming trailing slashes', () => {
    expect(buildChatCompletionsUrl('https://dashscope.aliyuncs.com/compatible-mode/v1/')).toBe(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    );
    expect(buildChatCompletionsUrl('https://api.openai.com/v1')).toBe(
      'https://api.openai.com/v1/chat/completions',
    );
  });

  it('builds an OpenAI-shaped body with streaming disabled', () => {
    const body = buildChatCompletionBody('qwen-plus', [{ role: 'user', content: 'hi' }]);
    expect(body).toEqual({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.3,
      stream: false,
    });
  });
});

describe('translation prompt building', () => {
  it('embeds the selection and its paragraph context', () => {
    const request: TranslationRequest = {
      id: 'sel-1',
      type: 'selection',
      texts: ['apple'],
      context: 'Apple announced a new MacBook Pro today.',
    };
    const user = buildTranslationMessages(request).at(-1);
    expect(user?.content).toContain('【apple】');
    expect(user?.content).toContain('Apple announced a new MacBook Pro today.');
  });

  it('paragraph prompts explicitly forbid translating the context', () => {
    const request: TranslationRequest = {
      id: 'sel-p',
      type: 'selection',
      texts: ['The selected sentence to translate.'],
      context: 'A much longer paragraph that also contains the selected sentence plus other sentences around it.',
    };
    const all = buildTranslationMessages(request)
      .map((message) => message.content)
      .join('\n');
    expect(all).toContain('禁止翻译');
    expect(all).toContain('The selected sentence to translate.');
    expect(all).toContain('A much longer paragraph');
  });

  it('falls back to a placeholder when no context is available', () => {
    const request: TranslationRequest = { id: 'sel-2', type: 'selection', texts: ['bank'] };
    expect(buildTranslationMessages(request).at(-1)?.content).toContain('（无上下文）');
  });

  it('serializes a full-page batch as a JSON array', () => {
    const user = buildTranslationMessages(fullPageRequest(['Hello', 'World'])).at(-1);
    expect(user?.content).toContain('["Hello","World"]');
    expect(user?.content).toContain('相同长度的 JSON 数组');
  });

  it('uses a minimal probe message for test connections', () => {
    expect(buildTestConnectionMessages()).toEqual([
      { role: 'user', content: expect.stringContaining('连接成功') },
    ]);
  });
});

describe('parseTranslationReply', () => {
  it('passes selection replies through as a single trimmed item', () => {
    const request: TranslationRequest = { id: 'sel-1', type: 'selection', texts: ['apple'] };
    expect(parseTranslationReply('  苹果公司（科技公司）  ', request)).toEqual(['苹果公司（科技公司）']);
  });

  it('rejects empty selection replies', () => {
    const request: TranslationRequest = { id: 'sel-1', type: 'selection', texts: ['apple'] };
    expect(() => parseTranslationReply('   ', request)).toThrow('空内容');
  });

  it('parses a plain JSON array reply preserving index order', () => {
    const request = fullPageRequest(['a', 'b']);
    expect(parseTranslationReply('["甲","乙"]', request)).toEqual(['甲', '乙']);
  });

  it('parses a code-fenced JSON array reply', () => {
    const request = fullPageRequest(['a', 'b']);
    expect(parseTranslationReply('```json\n["甲","乙"]\n```', request)).toEqual(['甲', '乙']);
  });

  it('rejects replies whose length mismatches the request', () => {
    const request = fullPageRequest(['a', 'b', 'c']);
    expect(() => parseTranslationReply('["甲"]', request)).toThrow(/不一致/);
  });

  it('rejects non-JSON replies for full-page batches', () => {
    const request = fullPageRequest(['a']);
    expect(() => parseTranslationReply('好的，翻译如下：甲', request)).toThrow(/JSON/);
  });
});

describe('parseJsonStringArray (guard against index misalignment)', () => {
  it('stringifies non-string array items to keep 1:1 mapping intact', () => {
    expect(parseJsonStringArray('[{"a":1}, "ok"]', 2)).toEqual(['{"a":1}', 'ok']);
  });
});

describe('parseModelsResponse', () => {
  it('解析标准 OpenAI 格式 {data:[{id}]}（DashScope/DeepSeek/OpenAI）', () => {
    expect(parseModelsResponse({ data: [{ id: 'qwen-plus' }, { id: 'qwen-max' }] })).toEqual([
      'qwen-max',
      'qwen-plus',
    ]);
  });

  it('解析 {models:[{id}]} 变体', () => {
    expect(parseModelsResponse({ models: [{ id: 'glm-4-flash' }, { id: 'glm-4' }] })).toEqual([
      'glm-4',
      'glm-4-flash',
    ]);
  });

  it('解析字符串数组变体 {data:["id"]}', () => {
    expect(parseModelsResponse({ data: ['llama3.1', 'qwen2.5:7b'] })).toEqual(['llama3.1', 'qwen2.5:7b']);
  });

  it('容忍混合与脏数据：跳过非字符串 id，剔除空串与重复项', () => {
    expect(
      parseModelsResponse({ data: [{ id: 'm1' }, { id: '' }, { id: 42 }, { id: 'm1' }, 'm2'] }),
    ).toEqual(['m1', 'm2']);
  });

  it('非法输入（null / 空对象 / 缺 id 字段）返回空数组', () => {
    expect(parseModelsResponse(null)).toEqual([]);
    expect(parseModelsResponse({})).toEqual([]);
    expect(parseModelsResponse({ data: [{ name: 'no-id' }] })).toEqual([]);
    expect(parseModelsResponse('oops')).toEqual([]);
  });

  it('模型名按字母序稳定排序（下拉展示友好）', () => {
    expect(parseModelsResponse({ data: [{ id: 'zeta' }, { id: 'alpha' }, { id: 'mid' }] })).toEqual([
      'alpha',
      'mid',
      'zeta',
    ]);
  });
});

describe('buildModelsUrl', () => {
  it('从 Base URL 拼出 /models 端点，容忍末尾斜杠与空白', () => {
    expect(buildModelsUrl('https://api.deepseek.com/v1')).toBe('https://api.deepseek.com/v1/models');
    expect(buildModelsUrl(' http://localhost:11434/v1/ ')).toBe('http://localhost:11434/v1/models');
  });
});

describe('buildTranslationMessages 语言偏好参数化', () => {
  it('默认（auto → zh-CN）与原版提示词逐字节一致', () => {
    const all = buildTranslationMessages(fullPageRequest(['Hello']));
    expect(all[0]?.content).toBe('你是专业的网页翻译器，将外语文本翻译为流畅自然的中文，保持原文语气与格式。只输出翻译结果，不要添加任何解释。');
    expect(all.at(-1)?.content).toContain('翻译为中文');
    expect(all.at(-1)?.content).not.toContain('源语言');
  });

  it('目标繁体中文：系统与用户提示均含「繁体中文」', () => {
    const all = buildTranslationMessages(fullPageRequest(['Hello']), { source: 'auto', target: 'zh-TW' });
    expect(all[0]?.content).toContain('繁体中文');
    expect(all.at(-1)?.content).toContain('翻译为繁体中文');
  });

  it('指定源语言（日语）：出现源语言提示；auto 时不出现', () => {
    const hinted = buildTranslationMessages(fullPageRequest(['こんにちは']), { source: 'ja', target: 'zh-CN' });
    expect(hinted.at(-1)?.content).toContain('源语言：日语');
    const auto = buildTranslationMessages(fullPageRequest(['こんにちは']), { source: 'auto', target: 'zh-CN' });
    expect(auto.at(-1)?.content).not.toContain('源语言');
  });

  it('划词段落模式同样应用目标语言', () => {
    const request: TranslationRequest = { id: 'r', type: 'selection', texts: ['Hello world, this is a test.'], context: 'Hello world, this is a test.' };
    const messages = buildTranslationMessages(request, { source: 'en', target: 'zh-TW' });
    expect(messages[0]?.content).toContain('繁体中文');
    expect(messages[0]?.content).toContain('只翻译「选中的内容」');
    expect(messages.at(-1)?.content).toContain('源语言：英语');
  });
});
