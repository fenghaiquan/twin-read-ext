import { describe, expect, it } from 'vitest';

import { DEFAULT_ORIGIN_PATTERN, originPatternFromBaseUrl } from '../packages/shared/permissions';
import { DEFAULT_PROVIDER_SETTINGS } from '../packages/shared/types';

describe('originPatternFromBaseUrl', () => {
  it('从带路径的 Base URL 提取源站 match pattern', () => {
    expect(originPatternFromBaseUrl('https://dashscope.aliyuncs.com/compatible-mode/v1')).toBe(
      'https://dashscope.aliyuncs.com/*',
    );
  });

  it('裸域名（无路径）同样归一化为 /* 结尾', () => {
    expect(originPatternFromBaseUrl('https://api.deepseek.com')).toBe('https://api.deepseek.com/*');
  });

  it('末尾斜杠与多余空白被容忍', () => {
    expect(originPatternFromBaseUrl('  https://api.moonshot.cn/v1/ ')).toBe(
      'https://api.moonshot.cn/*',
    );
  });

  it('本地端口（如 Ollama）去掉端口——match pattern 不支持端口且默认匹配任意端口', () => {
    expect(originPatternFromBaseUrl('http://localhost:11434/v1')).toBe('http://localhost/*');
  });

  it('IP 地址主机合法', () => {
    expect(originPatternFromBaseUrl('http://192.168.1.10:8000/v1')).toBe('http://192.168.1.10/*');
  });

  it('非法输入返回 null：空字符串', () => {
    expect(originPatternFromBaseUrl('')).toBeNull();
    expect(originPatternFromBaseUrl('   ')).toBeNull();
  });

  it('非法输入返回 null：无协议的裸字符串', () => {
    expect(originPatternFromBaseUrl('api.deepseek.com/v1')).toBeNull();
    expect(originPatternFromBaseUrl('just some text')).toBeNull();
  });

  it('非法输入返回 null：不支持的协议', () => {
    expect(originPatternFromBaseUrl('ftp://example.com/v1')).toBeNull();
    expect(originPatternFromBaseUrl('file:///etc')).toBeNull();
  });

  it('默认配置的 Base URL 可解析出 pattern', () => {
    expect(originPatternFromBaseUrl(DEFAULT_PROVIDER_SETTINGS.baseUrl)).toBe(
      'https://dashscope.aliyuncs.com/*',
    );
  });

  it('预计算的默认 pattern 与默认 Base URL 对应', () => {
    expect(DEFAULT_ORIGIN_PATTERN).toBe('https://dashscope.aliyuncs.com/*');
  });
});
