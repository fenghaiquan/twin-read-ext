# Sprint 1 人工验收清单

> 交付物：Options 设置页、`chrome.storage.local` 配置持久化、Background `llm-client`（ADR-001 OpenAI 兼容通信）、
> `packages/core-llm` 纯逻辑层（Prompt 组装 / 请求体构造 / 响应解析）。

## 自动化关卡（已完成 ✅）

- [x] `npm run gate` 全绿：tsc（含 tsconfig.node.json）→ ESLint 零警告 → Vitest 16/16 → depcruise 无违规
- [x] `npm run build` 产出 `dist/`，background / options 入口均已打包

## 手动验收步骤（需要人工执行）

1. **加载扩展**
   - Chrome 打开 `chrome://extensions` → 开发者模式 → 「加载已解压的扩展程序」→ 选择项目下的 `dist/` 目录
   - （若此前已加载过，请点扩展卡片上的 ↻ 重新加载）

2. **打开设置页**
   - 右键工具栏 Twin Read 图标 → 「选项」（或在 `chrome://extensions` 中 Twin Read 卡片点「扩展程序选项」）
   - 预期：Base URL 默认显示 `https://dashscope.aliyuncs.com/compatible-mode/v1`，Model 默认 `qwen-plus`

3. **配置持久化**
   - 填入阿里云百炼（DashScope）API Key（获取：https://bailian.console.aliyun.com → API-KEY 管理）
   - 可选：Model 改为 `qwen-flash` / `qwen-max`
   - 点击「保存设置」→ 显示「已保存。」
   - 关闭设置页后重新打开 → **预期：所有字段保持上次保存的值不丢失**

4. **测试连接（正向用例）**
   - 点击「测试连接」→ 显示「正在测试连接…」
   - **预期：数秒内显示「连接成功！模型回复：连接成功」**

5. **错误路径用例**
   - 把 API Key 改成一个错误值（如 `sk-invalid`）→ 保存 → 点「测试连接」
   - **预期：显示红色错误信息（HTTP 401 等），而非空白或无响应**
   - 把 API Key 清空 → 保存 → 点「测试连接」
   - **预期：提示「尚未配置 API Key，请先在设置页填写并保存」**
   - 验收完成后改回正确的 Key 并保存

## 边界确认（架构不越界）

- [x] Options / Popup / Content 均未直接发起网络请求（depcruise 宪法强制，仅 `src/background/llm-client.ts` 可 fetch）
- [x] 翻译响应解析强制「等长 JSON 数组」，长度不符即拒绝（防 Sprint 4 注入错位）

## 验收结论记录

| 项目 | 结果 | 备注 |
| :--- | :--- | :--- |
| 配置持久化 | ☐ 待验收 | |
| 测试连接（正向） | ☐ 待验收 | |
| 测试连接（错误路径） | ☐ 待验收 | |
| 扩展加载无报错 | ☐ 待验收 | |

验收人：＿＿＿＿　日期：＿＿＿＿
