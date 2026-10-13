/**
 * Prompt assembly for translation requests (pure functions, per-module contract:
 * receives plain text, returns standardized message arrays).
 */

import { classifySelection } from '@shared/selection';
import type { SourceLanguage, TargetLanguage, TranslationRequest } from '@shared/types';
import type { ChatMessage } from './chat';

/** Language preferences threaded from BehaviorSettings into prompt assembly. */
export interface PromptLanguages {
  source: SourceLanguage;
  target: TargetLanguage;
}

const DEFAULT_LANGUAGES: PromptLanguages = { source: 'auto', target: 'zh-CN' };

/** Prompt wording per language (kept Chinese-concise for token economy). */
const TARGET_NAMES: Record<TargetLanguage, string> = {
  'zh-CN': '中文',
  'zh-TW': '繁体中文',
  en: 'English',
};

const SOURCE_NAMES: Record<SourceLanguage, string> = {
  auto: '',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
};

function sourceHint(languages: PromptLanguages): string {
  const name = SOURCE_NAMES[languages.source];
  return name ? `（源语言：${name}）` : '';
}

function wordSystemPrompt(languages: PromptLanguages): string {
  return `你是翻译专家，擅长根据上下文给出词汇/短语最准确的释义。只针对「选中的内容」回答；上下文仅用于理解语义，不要翻译或解释上下文。回答格式：第一行给出“词性. ${TARGET_NAMES[languages.target]}释义”（如 adv. 故意地；蓄意地），第二行起用一句话解释该词在当前上下文中的具体含义。`;
}

function paragraphSystemPrompt(languages: PromptLanguages): string {
  return `你是专业的翻译器。只翻译「选中的内容」；「上下文」仅用于理解语义以便翻译更准确，绝对不要翻译或输出上下文。只输出选中内容的${TARGET_NAMES[languages.target]}翻译，不要添加任何解释。`;
}

function fullPageSystemPrompt(languages: PromptLanguages): string {
  return `你是专业的网页翻译器，将外语文本翻译为流畅自然的${TARGET_NAMES[languages.target]}，保持原文语气与格式。只输出翻译结果，不要添加任何解释。`;
}

function selectionUserTemplate(languages: PromptLanguages): string {
  return `请翻译选中的内容${sourceHint(languages)}：\n【{selected}】\n\n上下文（仅供参考，禁止翻译它）：\n【{context}】`;
}

function selectionContext(request: TranslationRequest): string {
  return (request.context ?? '').trim() || '（无上下文）';
}

function format(template: string, selected: string, context: string): string {
  return template.replace('{selected}', selected).replace('{context}', context);
}

/** Build the ChatMessages for a translation request (selection or full-page batch). */
export function buildTranslationMessages(
  request: TranslationRequest,
  languages: PromptLanguages = DEFAULT_LANGUAGES,
): ChatMessage[] {
  if (request.type === 'selection') {
    const selected = request.texts[0] ?? '';
    const context = selectionContext(request);
    const mode = classifySelection(selected);
    const system = mode === 'word' ? wordSystemPrompt(languages) : paragraphSystemPrompt(languages);
    const template = selectionUserTemplate(languages);
    return [
      { role: 'system', content: system },
      { role: 'user', content: format(template, selected, context) },
    ];
  }
  return fullPageMessages(request, languages);
}

function fullPageMessages(request: TranslationRequest, languages: PromptLanguages): ChatMessage[] {
  return [
    { role: 'system', content: fullPageSystemPrompt(languages) },
    {
      role: 'user',
      content:
        `请将以下 JSON 数组中的每一项文本${sourceHint(languages)}翻译为${TARGET_NAMES[languages.target]}，并返回相同长度的 JSON 数组，必须保持原有的索引顺序，不要输出数组以外的任何内容。\n` +
        `示例：输入 ["Apple is red", "Banana is yellow"] -> 输出 ["苹果是红色的", "香蕉是黄色的"]\n` +
        `输入：${JSON.stringify(request.texts)}`,
    },
  ];
}

/** Minimal round-trip probe used by the Options "测试连接" button. */
export function buildTestConnectionMessages(): ChatMessage[] {
  return [{ role: 'user', content: '这是一次连接测试。请只回复四个字：连接成功' }];
}
