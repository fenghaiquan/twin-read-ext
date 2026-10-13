import { describe, expect, it } from 'vitest';

import { isLocalBaseUrl, originPatternFromBaseUrl } from '../packages/shared/permissions';
import { getCustomHeaders, PROVIDER_PRESETS } from '../packages/shared/providers';

describe('PROVIDER_PRESETS', () => {
  it('预设列表非空且每项字段完整', () => {
    expect(PROVIDER_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const preset of PROVIDER_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.baseUrl).toMatch(/^https?:\/\//);
      expect(preset.model).toBeTruthy();
      expect(preset.keyUrl).toMatch(/^https?:\/\//);
    }
  });

  it('每个预设的 Base URL 都能解析出合法 match pattern（可被动态授权）', () => {
    for (const preset of PROVIDER_PRESETS) {
      expect(originPatternFromBaseUrl(preset.baseUrl)).not.toBeNull();
    }
  });

  it('Base URL 唯一（作为 select 去重与回填匹配依据）', () => {
    const urls = PROVIDER_PRESETS.map((p) => p.baseUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('包含默认的阿里云百炼（DashScope）', () => {
    const dashscope = PROVIDER_PRESETS.find((p) => p.baseUrl.includes('dashscope.aliyuncs.com'));
    expect(dashscope?.model).toBe('qwen-plus');
  });

  it('包含主流平台：DeepSeek / Kimi / 智谱 / OpenAI / 本地 Ollama', () => {
    const urls = PROVIDER_PRESETS.map((p) => p.baseUrl).join(' ');
    expect(urls).toContain('api.deepseek.com');
    expect(urls).toContain('api.moonshot.cn');
    expect(urls).toContain('open.bigmodel.cn');
    expect(urls).toContain('api.openai.com');
    expect(urls).toContain('localhost:11434');
  });

  it('包含 opencode-go 平台预设', () => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === 'opencode-go');
    expect(preset).toBeDefined();
    expect(preset?.baseUrl).toBe('https://opencode.ai/zen/go/v1');
    expect(preset?.model).toBe('qwen3.7-plus');
    expect(preset?.customHeaders).toBeDefined();
    expect(preset?.customHeaders?.['x-opencode-session']).toBe('twin-read-opencode-go');
  });
});

describe('getCustomHeaders', () => {
  it('已知预设返回对应的自定义头', () => {
    const headers = getCustomHeaders('https://opencode.ai/zen/go/v1');
    expect(headers['x-opencode-session']).toBe('twin-read-opencode-go');
  });

  it('未知 baseUrl 返回空对象', () => {
    const headers = getCustomHeaders('https://unknown.example.com/v1');
    expect(headers).toEqual({});
  });

  it('没有 customHeaders 字段的预设返回空对象', () => {
    const headers = getCustomHeaders('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(headers).toEqual({});
  });
});

describe('isLocalBaseUrl', () => {
  it('localhost 与 127.0.0.1 判定为本地（无需 API Key）', () => {
    expect(isLocalBaseUrl('http://localhost:11434/v1')).toBe(true);
    expect(isLocalBaseUrl('http://127.0.0.1:8000/v1')).toBe(true);
  });

  it('远程域名与非法输入判定为非本地', () => {
    expect(isLocalBaseUrl('https://dashscope.aliyuncs.com/compatible-mode/v1')).toBe(false);
    expect(isLocalBaseUrl('https://api.deepseek.com/v1')).toBe(false);
    expect(isLocalBaseUrl('not a url')).toBe(false);
    expect(isLocalBaseUrl('')).toBe(false);
  });
});
