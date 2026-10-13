# Twin Read

一个轻量级「沉浸式双语翻译」Chrome 扩展（Manifest V3），由大模型驱动，默认支持阿里云百炼（DashScope）的 Qwen 系列模型。

## 核心功能

1. **整页对照式翻译** —— 提取页面 DOM 文本，批量请求翻译，原位置注入双语对照节点（不破坏宿主页面交互）。
2. **基于上下文的划词取义** —— 选中文字后右下角显示粉色圆点指示器，点击圆点展开翻译面板。根据选词长度自动切换模式：
   - **单词模式**（≤3 词）：显示单词标题 + 词性释义 + 上下文解释
   - **段落模式**（长文本）：上方灰色背景显示原文 + 下方加粗显示中文翻译
3. **基于 API Key 的模型配置** —— 兼容 OpenAI ChatCompletions 格式，默认 Qwen，可切换任意兼容提供商。

## 架构概览

| 模块 | 职责边界 | 通信契约 |
| :--- | :--- | :--- |
| `src/background` | 后台 Service Worker。**所有外发 HTTP 请求**、并发控制、配置读取。禁止操作 DOM。 | 监听/响应 `TranslationRequest` |
| `src/content` | 注入目标网页。DOM 遍历、划词监听、Shadow DOM 浮窗、双语注入。**禁止直接发网络请求**。 | `chrome.runtime.sendMessage` |
| `src/options` | 设置页 UI。API Key / Base URL / Model 配置，读写 `chrome.storage.local`。 | `ProviderSettings` |
| `src/popup` | 弹出面板。整页翻译开关。 | 控制指令 |
| `packages/shared` | 纯类型与常量契约。**禁止依赖任何 src 代码。** | `types.ts` |

架构决策见 [docs/adr/](docs/adr/)：

- [ADR-001: OpenAI 兼容 API 通信](docs/adr/ADR-001-openai-compatible-api-communication.md)
- [ADR-002: DOM 节点注入策略](docs/adr/ADR-002-dom-node-injection-strategy.md)
- [ADR-003: Shadow DOM UI 隔离](docs/adr/ADR-003-shadow-dom-ui-isolation.md)

## 开发

```bash
npm install
npm run dev      # CRXJS 开发模式（HMR）
npm run build    # 类型检查 + 产出 dist/
npm run gate     # 宪法关卡：tsc + eslint + vitest + depcruise，必须全绿
```

加载扩展：Chrome → `chrome://extensions` → 开发者模式 → 「加载已解压的扩展程序」→ 选择 `dist/`。

### Gate（宪法）

`npm run gate` 依次执行：

1. `tsc --noEmit` —— TypeScript `strict: true` 全量类型检查
2. `eslint . --max-warnings=0` —— 零警告，含 `complexity ≤ 10` 复杂度上限
3. `vitest run` —— 单元测试
4. `depcruise src packages` —— 依赖边界（content/ui 不得 import background 内部；shared 不得依赖 src）

**每个 Sprint 提交前 gate 必须全绿，且只允许修改当前 Sprint 涉及的模块。**

## 构建计划（Sprint 路线）

| Sprint | 目标 | 交付证明 (Proof) | 状态 |
| :--- | :--- | :--- | :--- |
| **0** | 基础设施：脚手架、类型契约、Gate | `npm run gate` 全绿；`dist/` 可被 Chrome 无报错加载 | ✅ |
| **1** | 配置中心 + LLM 通信基建（options 页、`llm-client.ts`） | 填入 Qwen API Key 点「测试连接」能收到模型回复 | ✅ 已验收（[docs/acceptance/sprint-1.md](docs/acceptance/sprint-1.md)） |
| **2** | 上下文划词取义（mouseup 监听、Shadow DOM 浮窗） | 复杂网页选中多义词，浮窗给出语境化释义且样式不变形 | ✅ 已验收（[docs/acceptance/sprint-2.md](docs/acceptance/sprint-2.md)） |
| **3** | DOM 解析纯函数（`extractTextNodes` / `chunkTextNodes`，TDD） | 单元测试覆盖脏标签 HTML 用例，100% 通过 | ✅（55/55，见 [docs/acceptance/sprint-3.md](docs/acceptance/sprint-3.md)） |
| **4.1** | 整页翻译体验优化（块级锚点、译文换行、段末旋转加载圈、同页缓存、视口懒翻译、译文格式与原文对齐） | 译文在原文下方同格式对齐展示，滚动懒翻译，关→开即时恢复 | ✅ 已验收（[docs/acceptance/sprint-4.1.md](docs/acceptance/sprint-4.1.md)） |

每完成一个 Sprint，对照检查：

- [ ] 代码只修改了当前 Sprint 的模块（未越界）
- [ ] `npm run gate` 无任何警告
- [ ] 实际加载扩展完成本阶段手动 Proof
- [ ] 新增架构决策已更新 `docs/adr/`
