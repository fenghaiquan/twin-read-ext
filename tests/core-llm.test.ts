import { describe, expect, it } from 'vitest';
import { buildChatCompletionBody, buildChatCompletionsUrl } from '@core-llm/chat';
import { buildTestConnectionMessages, buildTranslationMessages } from '@core-llm/prompt';
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
