/**
 * Pure parser for OpenAI-compatible `GET /models` responses.
 *
 * Tolerates the common response shapes across providers:
 * - `{ "data": [{ "id": "qwen-plus" }, ...] }`  (OpenAI / DashScope / DeepSeek / Ollama)
 * - `{ "models": [{ "id": "glm-4" }, ...] }`    (some providers)
 * - `{ "data": ["model-id", ...] }`             (string-array variant)
 *
 * Always returns a de-duplicated, alphabetically sorted list — empty on any
 * malformed input so callers can surface a friendly error instead.
 */

function addId(id: string, out: Set<string>): void {
  const trimmed = id.trim();
  if (trimmed) out.add(trimmed);
}

function collectItemIds(item: unknown, out: Set<string>): void {
  if (typeof item === 'string') {
    addId(item, out);
    return;
  }
  if (typeof item !== 'object' || item === null) return;
  const id = (item as { id?: unknown }).id;
  if (typeof id === 'string') addId(id, out);
}

function collectIds(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    addId(value, out);
    return;
  }
  if (!Array.isArray(value)) return;
  for (const item of value) collectItemIds(item, out);
}

/** Build the `GET {base}/models` URL from an OpenAI-compatible base URL. */
export function buildModelsUrl(baseUrl: string): string {
  return `${baseUrl.trim().replace(/\/+$/, '')}/models`;
}

export function parseModelsResponse(data: unknown): string[] {
  if (typeof data !== 'object' || data === null) return [];
  const record = data as Record<string, unknown>;
  const ids = new Set<string>();
  collectIds(record.data, ids);
  collectIds(record.models, ids);
  return [...ids].sort();
}
