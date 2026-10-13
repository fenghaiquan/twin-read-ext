/**
 * Prompt assembly for translation requests (pure functions, per-module contract:
 * receives plain text, returns standardized message arrays).
 */

import type { TranslationRequest } from '@shared/types';
import type { ChatMessage } from './chat';

const SELECTION_SYSTEM_PROMPT =
  '你是翻译专家，擅长结合上下文给出词汇或短语最准确的释义，回答简洁、贴合语境。';

const FULL_PAGE_SYSTEM_PROMPT =
  '你是专业的网页翻译器，将外语文本翻译为流畅自然的中文，保持原文语气与格式。只输出翻译结果，不要添加任何解释。';

/** Build the ChatMessages for a translation request (selection or full-page batch). */
export function buildTranslationMessages(request: TranslationRequest): ChatMessage[] {
  return request.type === 'selection' ? selectionMessages(request) : fullPageMessages(request);
}

function selectionMessages(request: TranslationRequest): ChatMessage[] {
  const selected = request.texts[0] ?? '';
  const context = (request.context ?? '').trim() || '（无上下文）';
  return [
    { role: 'system', content: SELECTION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请翻译用户选中的词汇/短语：【${selected}】。它所在的上下文是：【${context}】。请给出在此上下文中最准确的释义，并简要解释。`,
    },
  ];
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
