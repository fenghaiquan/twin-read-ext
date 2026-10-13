# ADR-003: 划词浮窗 UI 隔离机制（Shadow DOM）

- 状态：已接受
- 日期：2026-10-13

## 决策

划词翻译的浮窗必须挂载在原生 Web Components 的 **`ShadowRoot`**（`attachShadow({ mode: 'closed' })`）
内的顶层容器元素中，浮窗定位基于 `Selection.getRangeAt(0).getBoundingClientRect()` 计算。

## 原因

彻底隔离宿主页面的 CSS：否则浮窗样式会被目标网站的全局规则（如 `div { margin: 0 }`）破坏。
closed mode 可防止宿主页面脚本探测/篡改浮窗内部。

## 约束

- 浮窗内部样式全部内联在 ShadowRoot 的 `<style>` 中，不依赖外部样式表。
- 浮窗容器使用唯一 ID（如 `twin-read-host`），挂载前先检查避免重复创建。
