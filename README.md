# iskill-pwa-update

给任意 **Vite + vite-plugin-pwa** 项目补上「版本更新感知」，解决 PWA 更新后客户端缓存看不到新内容的问题。纯客户端方案，无需后端。

## 一句话原理

应用壳变化靠 SW 预缓存 diff 发现；**数据-only 变化 SW 根本感知不到**，所以每次构建注入双指纹（打进 JS 包的 `src/version.ts` + 进 dist 的 `public/build-info.json`），线上应用启动时网络优先拉取比对，发现新版本只亮一条可关闭的轻提示，用户可随时在设置面板手动检查并「立即更新」（清全部缓存 + 注销 SW + 强制刷新）。

## 内容

| 文件 | 说明 |
|------|------|
| `SKILL.md` | 完整施工指南：三类更新决策表、施工五步、立即更新三步法、7 条踩坑清单、iOS/后端演进 |
| `references/useAppUpdate.ts` | Vue 3 composable（零新增依赖），检测 + 静默提醒 + 一键更新 |
| `references/inject-fingerprint.mjs` | 构建前注入双指纹的脚本（node 直跑） |
| `references/vite-pwa-config.snippet.ts` | vite.config 关键片段：registerType + 按资源类型的 runtimeCaching 配方 |

## 快速接入（4 步）

1. `node references/inject-fingerprint.mjs <appDir>` 挂到构建流程（vite build 之前）
2. 按片段改 `vite.config.ts`（`registerType: 'prompt'` + runtimeCaching 配方）
3. 拷 `useAppUpdate.ts` 到 `src/composables/`
4. 设置面板加「关于」区 + 全局轻提示（UI 原则见 SKILL.md）

> 来源：从 [iskill-build-books](https://github.com/aispin/iskill-build-books)（Vue 3 电子书 PWA）v1.5.0 的线上验证实现中抽取泛化。
