# ADR-004: 块级锚点注入与视口懒翻译

- 状态：已接受
- 日期：2025-01-15
- 修订：ADR-002（注入锚点从 TextNode 改为叶子块级元素）

## 决策

1. **块级锚点注入**：翻译 span 插入在**叶子块级元素**（p/li/h1-h6 等）之后，而非原 TextNode 之后。译文 span 设置 `display: block`，在原文下方独立成行。
2. **文本单位升级**：从「TextNode 片段」改为「整段合并文本」（一个块内所有可翻译文本拼接），减少 LLM 请求次数与 token 开销。
3. **视口懒翻译**：IntersectionObserver 仅观察当前可见及附近块，按需触发翻译请求，不再一次性全页发送。
4. **同页内存缓存**：`Map<原文, 译文>` 模块级缓存，命中即注入（零请求、无 pending 闪烁）；toggle off→on 靠缓存即时恢复；页面刷新自然清空。

## 原因

- **换行展示更清晰**：原文与译文在视觉上分离，避免 inline span 打断段落流（ADR-002 修订）
- **控制 token 消耗**：长页面只翻译用户实际阅读的部分，滚动触发懒加载
- **快速切换体验**：缓存避免重复请求，toggle off→on 无感知延迟
- **零额外依赖**：IntersectionObserver 浏览器原生支持，缓存纯内存实现

## 约束

- 注入 span 仍为 `class="twin-read-trans"`（ADR-002 约定不变），仍可 `removeAllTranslations` 一键清除
- 叶子块级元素白名单：`p / h1-h6 / li / blockquote / td / th / dd / dt / figcaption / summary`
- 块内仍跳过 `script/style/code/pre/noscript/textarea` 等标签（ADR-002 约束继承）
- 缓存键为原文字符串，模块级生命周期（页面刷新即失）
- 预加载边距 ~600px（约一屏），常量可调

## 后果

- ✅ 译文在原文下方独立成行，阅读体验改善
- ✅ 长页面仅翻译可见部分，token 消耗可控
- ✅ toggle off→on 靠缓存即时恢复，无 API 调用
- ✅ 失败段落可见「⚠ 翻译失败」标示，用户可重试
- ⚠️ 无语义老页面（无 p/li 的纯 div 排版）暂不翻译（白名单策略，验收后视情况扩展）
