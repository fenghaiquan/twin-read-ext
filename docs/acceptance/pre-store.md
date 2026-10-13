# 上架前收尾（Pre-Store）人工验收清单

> 对应改动：动态权限、平台预设、模型列表一键获取、安装引导、错误文案、图标、商店素材、隐私政策更新
> 版本：v0.2.0 · 验收环境：Chrome ≥ 116，`npm run build` 后重新加载 `dist/`

## A. 动态权限与平台预设（Blocker 修复）

- [ ] 设置页顶部「常用平台」下拉框：百炼 / DeepSeek / Kimi / 智谱 / OpenAI / Ollama / 自定义，共 6 预设
- [ ] 选择 DeepSeek → Base URL 与模型名自动填充，提示区出现「获取 API Key →」链接
- [ ] 选择 Ollama → 自动填充 localhost，提示「本地运行无需 API Key」；Key 留空也能「测试连接」成功（需本机运行 Ollama）
- [ ] 填好 Key 后点「获取模型列表」→ 状态栏「已获取 N 个模型」→ 点击模型名输入框出现下拉候选，选择后可正常测试连接
- [ ] 未填 Key（非本地）点「获取模型列表」→ 提示「尚未填写 API Key」
- [ ] 获取非默认平台的模型列表时，同样先弹域名授权弹窗
- [ ] 重新加载后，已保存的配置能回填到对应预设选项（改过则显示「自定义」）
- [ ] manifest 含 `optional_host_permissions: ["*://*/*"]`，默认 DashScope 无需授权即可用
- [ ] 设置页 Base URL 改为 `https://api.deepseek.com/v1`（或任意非默认域名）→ 点击「保存设置」→ 浏览器弹出「读取 api.deepseek.com」授权弹窗
- [ ] 点击「允许」→ 状态栏显示「已保存」→ 「测试连接」能收到 DeepSeek 模型回复（需有效 Key）
- [ ] 点击「阻止」→ 状态栏提示「设置已保存，但未授权该域名…」，再次点击保存可重新弹窗
- [ ] Base URL 填入非法值（如 `abc`）→ 状态栏提示「Base URL 无效」，不弹授权、不保存
- [ ] 本地 Ollama 场景：`http://localhost:11434/v1` 可保存并正常请求（端口自动剥离）
- [ ] 切回默认 DashScope → 无弹窗（默认域名已在 manifest 中）

## B. Onboarding 与错误引导

- [ ] 全新安装（或 chrome://extensions 移除后重新加载）→ 自动打开设置页
- [ ] 设置页有折叠教程「如何获取阿里云百炼 API Key？」，含控制台直链
- [ ] 未填 Key 且非本地服务时，测试连接提示「尚未配置 API Key，请先在设置页选择平台并填写」
- [ ] 填一个错误 Key → 「测试连接」→ 提示含「API Key 无效或未授权（HTTP 401）」
- [ ] Base URL 指向不通域名 → 提示含「网络请求失败…请检查网络与 Base URL」
- [ ] 划词翻译在 Key 错误时浮窗显示错误信息，不会永久转圈
- [ ] 整页翻译在 Key 错误时段末「⚠」红字，不会永久转圈

## C. 商店素材

- [ ] Chrome 工具栏与 chrome://extensions 显示新图标（靛蓝渐变 + 双横条），16px 缩小后仍可辨识
- [ ] `docs/store-assets/promo-1280x800.png`：中英双语文案 + 截图 mockup，无文字溢出/错位
- [ ] `docs/store-listing.md` 文案、素材清单、表单字段齐备

## D. 合规与发版

- [ ] PRIVACY.md 权限表已含「可选域名授权」条目，与实际行为一致
- [ ] manifest version = 0.2.0，`npm run gate` 全绿
- [ ] v0.2.0 zip 可从 Release 下载并直接加载使用

## 结论

| 项 | 结果 |
| :--- | :--- |
| 验收人 | 项目所有者 |
| 结果 | ☐ 通过 ☐ 不通过 |
