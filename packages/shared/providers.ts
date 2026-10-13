/**
 * Built-in provider presets for the Options page quick-fill dropdown.
 *
 * Selecting a preset fills Base URL + default model so the user only has
 * to paste an API key (or nothing at all for local runtimes like Ollama).
 */

export interface ProviderPreset {
  /** Stable id used as the <option> value. */
  id: string;
  /** Display name (Chinese-first for the target audience). */
  name: string;
  /** OpenAI-compatible base URL. */
  baseUrl: string;
  /** Recommended default model. */
  model: string;
  /** Where the user can create an API key (docs/console). */
  keyUrl: string;
  /** Short hint shown when the preset is selected. */
  keyHint: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'dashscope',
    name: '阿里云百炼（Qwen，默认）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    keyUrl: 'https://bailian.console.aliyun.com/?api-key',
    keyHint: '在百炼控制台「API-KEY」页创建，新用户通常有免费额度',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyHint: '在 DeepSeek 开放平台「API Keys」页创建',
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-latest',
    keyUrl: 'https://platform.moonshot.cn/console/api-keys',
    keyHint: '在 Kimi 开放平台「API Key 管理」页创建',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    keyHint: '在智谱开放平台「API Keys」页创建；glm-4-flash 免费额度较大',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: '在 OpenAI 平台「API keys」页创建（需海外支付方式）',
  },
  {
    id: 'ollama',
    name: '本地 Ollama（无需 Key）',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    keyUrl: 'https://ollama.com/library',
    keyHint: '本地运行无需 API Key，留空即可；模型名需与 ollama pull 的一致',
  },
];

/** Find a preset whose baseUrl + model both match the given settings. */
export function matchPreset(baseUrl: string, model: string): ProviderPreset | null {
  return PROVIDER_PRESETS.find((p) => p.baseUrl === baseUrl && p.model === model) ?? null;
}
