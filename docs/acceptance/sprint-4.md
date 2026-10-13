# Sprint 4 人工验收清单

> 交付物：整页对照翻译系统组装 —— popup 开关、批请求队列（后台并发 ≤ 3）、翻译节点注入（ADR-002）。
> - `src/popup/`：「开启/关闭整页翻译」按钮 + 状态回显 + 模型设置入口
> - `src/background/queue.ts`：并发限制器（最多同时 3 个 LLM 请求，FIFO 排队，失败释放槽位）
> - `src/content/inject.ts`：`insertBefore` 在原 TextNode 后插入 `span.twin-read-trans`（零修改原文），一键清除
> - `src/content/index.ts`：toggle 编排 —— Sprint 3 解析分块 → 逐批发 background → 逐批渐进注入；runToken 防止取消后的迟到响应写入

## 自动化关卡（已完成 ✅）

- [x] `npm run gate` 全绿：Vitest **69/69**（新增 14：并发队列 5 + 注入器 7 等），tsc / ESLint / depcruise 无违规
- [x] 注入器单测：插入位置紧跟原 TextNode、原 nodeValue 不变、空翻译/脱挂节点跳过、译文 trim、重新提取不含已注入译文
- [x] 队列单测：并发峰值 ≤ limit、FIFO 唤醒顺序、失败任务释放槽位
- [x] `npm run build` 产出 `dist/`

## 手动验收步骤（Proof：对照指南）

### 1. 重新加载扩展

`chrome://extensions` → Twin Read 卡片点 ↻

### 2. 核心证明：整页对照翻译

打开一篇英文文章页（如 Wikipedia / MDN / 英文新闻）：

- 点击浏览器右上角 Twin Read 图标 → popup 出现「开启整页翻译」按钮
- 点击按钮 → popup 显示「本页翻译已开启」，按钮变为「关闭整页翻译」
- **预期**：页面段落**按批次逐步**在原文下方出现灰色中文对照（非一次全部出现，证明并发队列在工作）
- 等待全部完成：正文段落均有对照，`code`/`pre` 代码块、导航数字等**未被翻译**

### 3. 原页面交互不崩溃（关键 Proof）

- 翻译完成后：页面上的**链接可点击**、按钮可交互、滚动/悬浮动画正常
- 若是 React/Vue 站点（如 GitHub）：点击、展开折叠等交互不报错

### 4. 开关关闭恢复

- popup 点击「关闭整页翻译」→ **预期**：所有中文对照消失，页面完全恢复原文（无残留节点）
- 再次点击「开启」→ 重新逐步翻译（幂等，无重复对照）

### 5. popup 状态一致性

- 开启翻译后关闭 popup 再打开 → 按钮仍显示「关闭整页翻译」（状态正确回显）
- 在 `chrome://` 页面打开 popup → 按钮禁用 + 提示「此页面不可用」
- 点击「模型设置」→ 正常打开 Options 页

### 6. 划词功能回归（Sprint 2 不受影响）

- 在已整页翻译的页面上划词 → 圆点 → 卡片翻译功能正常

### 7. 稳健性边界

- 未配置 API Key 的浏览器 profile 打开 → popup 开关可用，但页面不出现译文（失败批次在控制台 warning，不崩溃）
- 快速连续 开→关→开 → 无重复注入（runToken 丢弃迟到响应）
- 长页面（>60 段）：Network 面板中同时进行的 LLM 请求 **≤ 3**

## 边界确认（架构不越界）

- [x] content 仅经 `chrome.runtime.sendMessage` 请求翻译，零直接网络（ADR-001，depcruise 强制）
- [x] 注入用 `parentNode.insertBefore`，永不改写容器 innerHTML（ADR-002）
- [x] 注入节点统一 `twin-read-trans` class，dom-parser 递归跳过 → 关→开无重复翻译

## 验收结论记录

| 项目 | 结果 | 备注 |
| :--- | :--- | :--- |
| popup 开关可用，状态回显 | ☐ 待验收 | |
| 段落按批次逐步出现中文对照 | ☐ 待验收 | |
| code/pre/script 等未被翻译 | ☐ 待验收 | |
| 原页面点击/链接/排版不崩溃 | ☐ 待验收 | |
| 关闭开关完全恢复原文 | ☐ 待验收 | |
| 并发 ≤ 3（Network 面板） | ☐ 待验收 | |
| 划词功能回归正常 | ☐ 待验收 | |
| 边界用例（无 Key/快速开关/长页面） | ☐ 待验收 | |

验收人：＿＿＿＿　日期：＿＿＿＿
