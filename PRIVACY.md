# 隐私政策（Privacy Policy）

> *English summary: Twin Read collects no user data whatsoever — no analytics, no telemetry, no uploads. Web/selection text is sent only when you explicitly trigger a translation, directly from your browser to the LLM API service you configure. Your API key is stored locally in `chrome.storage.local` and never leaves your device except to your own provider.*

最后更新：2025-10 · 适用版本：v0.2.0+

## 数据收集

**本扩展不收集任何用户隐私数据。**

- 无埋点、无统计、无崩溃上报
- 无任何形式的遥测（telemetry）
- 不建立用户画像，不要求账号注册
- 不内置任何第三方统计 SDK（Google Analytics 等）

## 数据流向

本扩展仅在**你主动触发翻译**（开启整页翻译、划词取义）时处理网页内容：

1. 扩展读取当前页面/选中的文本
2. 文本经浏览器 background Service Worker，**直接发送至你在设置页配置的 API 服务**（默认为阿里云百炼 DashScope，可更换为任意 OpenAI 兼容提供商）
3. 翻译结果返回后注入页面展示

上述过程**不经过任何中间服务器**——请求从你的浏览器直达你配置的 API 端点。文本内容由你所配置的 LLM 提供商按其自身的隐私政策处理，请参阅对应服务商条款。

## 本地存储

- API Key、Base URL、模型名仅保存在本机 `chrome.storage.local`
- 同页翻译缓存仅存在于内存中，关闭页面即消失
- 本扩展不使用任何 Web 存储（cookie / localStorage）留存数据

## 权限用途

| 权限 | 用途 |
| :--- | :--- |
| `storage` | 在本机保存你的提供商配置（API Key 等） |
| `activeTab` | 获取当前标签页状态，用于整页翻译开关通信 |
| Content Script（注入所有 http/https 页面） | 读取页面文本并注入译文；仅在触发翻译时读取内容 |
| Host Permission（默认仅 DashScope 域名） | 允许 Service Worker 向你配置的 API 端点发起请求 |
| 可选域名授权（`optional_host_permissions`） | 当你配置非默认服务商时，保存设置会触发浏览器弹窗，**仅在你确认后**才授权访问该域名；可在 Chrome 设置 → 扩展 → Twin Read 中随时撤销 |

## 联系与修订

对本政策有疑问，请通过 [GitHub Issues](https://github.com/fenghaiquan/twin-read-ext/issues) 联系。政策如有修订，将在本仓库更新并同步修改日期。
