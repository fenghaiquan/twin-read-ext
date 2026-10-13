# Chrome Web Store 上架素材（Store Listing）

## 一句话简介（Summary，≤132 字符）

- **中文**：大模型驱动的沉浸式双语网页翻译与语境划词工具，自带 API Key 即用，零数据收集。
- **English**: Immersive bilingual web translation & contextual word lookup — powered by your own LLM API key. No tracking.

## 详细描述（Description）

```
Twin Read —— 轻量级沉浸式双语阅读扩展（Manifest V3）

🌐 整页对照式翻译
- 译文在原文下方独立成行，字体、字号、行高与排版宽度与原文对齐
- 视口懒翻译：滚动到哪翻译到哪，长页面不浪费 token
- 同页缓存：关闭再开启即时恢复，零重复请求

🔍 语境划词取义
- 单词模式：词性 + 释义 + 结合所在段落的语境解释（多义词不再张冠李戴）
- 段落模式：原文对照 + 中文翻译

🔑 Bring Your Own Key
- 内置常用平台预设：阿里云百炼（Qwen）/ DeepSeek / Kimi / 智谱 GLM /
  OpenAI / 本地 Ollama，选择即自动填充，附「获取 API Key」直达链接
- 「获取模型列表」一键拉取平台全部可用模型，下拉选择免手填
- 也支持任意 OpenAI 兼容服务；非默认域名保存时浏览器弹窗授权（可随时撤销）
- API Key 仅保存在本机 chrome.storage.local；本地 Ollama 无需 Key

🔒 零数据收集
- 无埋点、无统计、无上报；网页文本仅在你触发翻译时直达你配置的 API 服务
- 不经过任何中间服务器：https://github.com/fenghaiquan/twin-read-ext/blob/main/PRIVACY.md
```

## 素材清单

| 素材 | 文件 | 状态 |
| :--- | :--- | :--- |
| 应用图标 16/32/48/128 | `public/icons/icon-*.png` | ✅ |
| 宣传大图 1280×800 | `docs/store-assets/promo-1280x800.png` | ✅ |
| 功能截图 1280×800（≥3） | `docs/screenshots/*.png`（需按商店比例裁切） | 待裁切 |
| 隐私政策 URL | `https://github.com/fenghaiquan/twin-read-ext/blob/main/PRIVACY.md` | ✅ |

## 表单字段

- **分类**：生产力工具（Productivity）
- **语言**：中文（简体）为主，附英文简介
- **数据用途申报**：不收集任何数据（Web Store 数据使用表单勾选 "I do not collect"）；「网页内容」用途声明为「翻译功能处理用户主动触发的页面文本，直接发送至用户自行配置的 API 服务」
- **权限理由（审核必填）**：
  - `storage`：保存用户本机的 API 配置
  - `activeTab`：整页翻译开关与当前标签页通信
  - content script（所有站点）：读取页面文本并注入译文（核心功能）
  - `optional_host_permissions`：用户配置非默认 LLM 服务商时按需授权域名
