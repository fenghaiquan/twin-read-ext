# ADR-001: API 通信标准化（OpenAI 兼容格式）

- 状态：已接受
- 日期：2026-10-13

## 决策

所有模型 API 请求均采用兼容 **OpenAI ChatCompletions** 的接口格式（`POST {baseUrl}/chat/completions`）。

## 原因

阿里云百炼（DashScope）已完全兼容 OpenAI 接口。通过修改 `baseUrl` 与 `model` 即可零成本切换到
DeepSeek、Kimi（Moonshot）、OpenAI 或本地 Ollama，避免为不同厂商编写不同 SDK。

## 约束

- 所有外发 HTTP 请求只允许发生在 **background service worker** 中（规避 CORS、统一并发控制）。
- 配置数据模型见 `packages/shared/types.ts` 中的 `ProviderSettings`。
- 批量翻译必须要求模型返回与输入**等长**的 JSON 数组，保证索引一一对应。
