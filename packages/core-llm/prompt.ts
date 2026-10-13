/**
 * Prompt assembly for translation requests (pure functions, per-module contract:
 * receives plain text, returns standardized message arrays).
 */

import { classifySelection } from '@shared/selection';
import type { TranslationRequest } from '@shared/types';
import type { ChatMessage } from './chat';

const WORD_SYSTEM_PROMPT =
  '你是翻译专家，擅长根据上下文给出词汇/短语最准确的释义。回答格式：第一行给出“词性. 中文释义”（如 adv. 故意地；蓄意地），第二行起用一句话解释该词在当前上下文中的具体含义。';

const PARAGRAPH_SYSTEM_PROMPT =
  '你是专业的网页翻译器，将外语文本翻译为流畅自然的中文，保持原文语气与格式。只输出翻译结果，不要添加任何解释。';

const FULL_PAGE_SYSTEM_PROMPT =
  '你是专业的网页翻译器，将外语文本翻译为流畅自然的中文，保持原文语气与格式。只输出翻译结果，不要添加任何解释。';

const SELECTION_USER_TEMPLATE = '选中的内容：【{selected}】\n它所在的上下文：【{context}】';

function selectionContext(request: TranslationRequest): string {
  return (request.context ?? '').trim() || '（无上下文）';
}

function format(template: string, selected: string, context: string): string {
  return template.replace('{selected}', selected).replace('{context}', context);
}

/** Build the ChatMessages for a translation request (selection or full-page batch). */
export function buildTranslationMessages(request: TranslationRequest): ChatMessage[] {
  if (request.type === 'selection') {
    const selected = request.texts[0] ?? '';
    const context = selectionContext(request);
    const mode = classifySelection(selected);
    if (mode === 'word') {
      return [
        { role: 'system', content: WORD_SYSTEM_PROMPT },
        { role: 'user', content: format(SELECTION_USER_TEMPLATE, selected, context) },
      ];
    }
    return [
      { role: 'system', content: PARAGRAPH_SYSTEM_PROMPT },
      { role: 'user', content: format(SELECTION_USER_TEMPLATE, selected, context) },
    ];
  }
  return fullPageMessages(request);
}

function fullPageMessages(request: TranslationRequest): ChatMessage[] {
  return [
    { role: 'system', content: FULL_PAGE_SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        '请将以下 JSON 数组中的每一项文本翻译为中文，并返回相同长度的 JSON 数组，必须保持原有的索引顺序，不要输出数组以外的任何内容。\n' +
        '示例：输入 ["Apple is red", "Banana is yellow"] -> 输出 ["苹果是红色的", "香蕉是黄色的"]\n' +
        `输入：${JSON.stringify(request.texts)}`,
    },
  ];
}

/** Minimal round-trip probe used by the Options "测试连接" button. */
export function buildTestConnectionMessages(): ChatMessage[] {
  return [{ role: 'user', content: '这是一次连接测试。请只回复四个字：连接成功' }];
}
