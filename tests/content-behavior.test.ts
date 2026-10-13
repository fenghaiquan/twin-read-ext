import { describe, expect, it } from 'vitest';
import { readSelectionEnabled } from '../src/content/behavior';

describe('readSelectionEnabled（划词开关容错读取）', () => {
  it('存储值 false → 关闭划词', () => {
    expect(readSelectionEnabled({ selectionEnabled: false })).toBe(false);
  });

  it('存储值 true → 开启', () => {
    expect(readSelectionEnabled({ selectionEnabled: true, sourceLanguage: 'en', targetLanguage: 'zh-CN' })).toBe(true);
  });

  it('字段缺失 / 类型不对 / 非对象 / null → 默认开启（不因脏数据关掉用户功能）', () => {
    expect(readSelectionEnabled({})).toBe(true);
    expect(readSelectionEnabled({ selectionEnabled: 'off' })).toBe(true);
    expect(readSelectionEnabled('junk')).toBe(true);
    expect(readSelectionEnabled(null)).toBe(true);
    expect(readSelectionEnabled(undefined)).toBe(true);
  });
});
