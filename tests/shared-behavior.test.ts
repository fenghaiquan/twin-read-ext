import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BEHAVIOR_SETTINGS,
  LANGUAGE_LABELS,
  SOURCE_LANGUAGES,
  STORAGE_KEYS,
  TARGET_LANGUAGES,
  type BehaviorSettings,
} from '@shared/types';

describe('BehaviorSettings 契约', () => {
  it('默认值：划词开启、源语言自动检测、目标简体中文', () => {
    expect(DEFAULT_BEHAVIOR_SETTINGS).toEqual({
      selectionEnabled: true,
      sourceLanguage: 'auto',
      targetLanguage: 'zh-CN',
    });
  });

  it('默认值满足 BehaviorSettings 类型（可安全整体写入存储）', () => {
    const settings: BehaviorSettings = DEFAULT_BEHAVIOR_SETTINGS;
    expect(settings.selectionEnabled).toBeTypeOf('boolean');
  });

  it('语言选项列表含 auto（源）与 zh-CN（目标）且无重复', () => {
    expect(SOURCE_LANGUAGES).toContain('auto');
    expect(TARGET_LANGUAGES).toContain('zh-CN');
    expect(new Set(SOURCE_LANGUAGES).size).toBe(SOURCE_LANGUAGES.length);
    expect(new Set(TARGET_LANGUAGES).size).toBe(TARGET_LANGUAGES.length);
  });

  it('每个语言选项都有展示标签（下拉框可直接渲染）', () => {
    for (const lang of [...SOURCE_LANGUAGES, ...TARGET_LANGUAGES]) {
      expect(LANGUAGE_LABELS[lang], `语言 ${lang} 缺少标签`).toBeTruthy();
    }
  });

  it('存储键注册 behaviorSettings', () => {
    expect(STORAGE_KEYS.behaviorSettings).toBe('behaviorSettings');
  });
});
