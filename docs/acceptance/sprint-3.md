# Sprint 3 人工验收清单

> 交付物：DOM 解析与分块纯函数（TDD，本阶段**不与真实网页交互**，交付证明即单元测试）。
> - `src/content/dom-parser.ts` —— `extractTextNodes(root)` 遍历 DOM 提取可翻译文本节点，
>   跳过 script/style/code/pre/noscript/textarea/template/svg/kbd/samp/math/iframe 子树、
>   hidden 元素（hidden 属性或 inline display/visibility）、已注入的翻译节点
>   （`.twin-read-trans`）、空白与纯数字/符号文本。
> - `src/content/batch-processor.ts` —— `chunkTextNodes(nodes, batchSize=20, maxChars=2000)`
>   按**节点数与字符总量双预算**分批，保留节点引用供 Sprint 4 一一对应注入（ADR-002）。

## 验收（自动化，已完成 ✅）

- [x] `npm run gate` 全绿：Vitest **55/55**（本阶段新增 22 个），tsc / ESLint / depcruise 无违规
- [x] 脏标签用例：模拟 HTML 含 script/style/code/pre/noscript/textarea/template/svg，
      提取结果仅保留正文文本，数量与预期一致
- [x] 注入幂等用例：含 `.twin-read-trans` 的节点不会被二次提取（防止重复翻译）
- [x] 分批用例：45 节点按 20 分批 → `[20, 20, 5]`；字符预算触发断批；超长单节点独立成批不丢弃
- [x] 引用对齐用例：`batch.nodes[i]` 与 `batch.texts[i]` 一一对应且为原节点引用（非克隆）
- [x] 无副作用用例：遍历前后 DOM `innerHTML` 不变（纯提取，零修改）

## 结论记录

| 项目 | 结果 | 备注 |
| :--- | :--- | :--- |
| gate 全绿（55/55） | ✅ 已验收 | 含新增 22 个 Sprint 3 用例 |
| 需人工确认项 | ☐ | 无 —— 本阶段证明即自动化测试 |

验收人：＿＿＿＿　日期：＿＿＿＿
