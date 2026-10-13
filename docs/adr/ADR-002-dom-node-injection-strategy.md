# ADR-002: DOM 节点注入策略（不破坏宿主页面）

- 状态：已接受
- 日期：2026-10-13

## 决策

整页对照翻译**不修改**原 TextNode 的 `nodeValue`，**不使用** `innerHTML` 重写父容器；必须使用
`Node.parentNode.insertBefore` 在原文本节点之后插入带 `class="twin-read-trans"` 的 `<span>` 元素。

## 原因

直接替换 HTML 会破坏 React/Vue 等前端框架的 Virtual DOM 映射，导致页面交互失效。
仅追加兄弟节点不会影响框架的 diff 算法。

## 约束

- 翻译节点统一使用 `twin-read-trans` class，便于一键清除（恢复原文）。
- 提取阶段跳过 `<script>` / `<style>` / `<code>` / `<pre>` / `<noscript>` 等标签。
- DOM 提取与分块逻辑必须是**纯函数**，由单元测试覆盖（Sprint 3）。
