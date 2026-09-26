---
name: iskill-pwa-update
description: 给任意 Vite + vite-plugin-pwa 项目补上「版本更新感知」——构建双指纹、启动静默提醒、设置面板检查更新、立即更新一键清缓存；解决 PWA 更新后客户端缓存看不到新内容。当用户提到 PWA 更新、SW 缓存旧内容、缓存不刷新、检查新版本、Service Worker 更新提示时使用。
---

# PWA 更新感知（Vite + vite-plugin-pwa）

## 要解决什么

PWA 靠 Service Worker 缓存换来离线可用，代价是：应用更新后老用户可能长期停留在旧版本——

- SW 静默更新（autoUpdate）要等用户**下次刷新**才生效；
- 运行时数据走 SWR 策略更是「先给旧缓存、后台才拉新」，明明服务器已有新内容，用户看到的还是旧的；
- 配置类小文件（门禁、功能开关）被 SWR 缓存后，改了配置老访客毫无感知。

本 skill 提供一套**纯客户端**方案（无需后端）：让用户「知道有新版本、一键拿到新内容」，且不打断正常使用。

> 来源：从 iskill-build-books（电子书 PWA）v1.5.0 的真实实现中抽取泛化，已在线上实例验证。

## 核心认知：三类更新，两条检测通道

| 更新内容 | 例子 | SW 预缓存 diff 能发现吗 | 检测通道 |
|---|---|---|---|
| 应用壳（JS/CSS/HTML/图标） | UI 改动、模板升级 | **能**（产物文件名带 hash） | SW `onNeedRefresh` |
| 运行时数据 | 章节/列表/内容 JSON | **不能**（不进预缓存，SWR 先旧后新） | 双指纹比对 |
| 配置类小文件 | 门禁、开关、远端参数 | 不能 | 该类文件直接改 NetworkFirst |

**只把 registerType 改成 prompt 是不够的**——数据-only 的更新根本不触发 SW 更新事件，必须靠「构建指纹」兜底。

## 施工五步

1. **构建时注入双指纹**（检测的信号源）
   - `public/build-info.json` → 进 dist，供线上带 cache-bust 网络优先拉取；
   - `src/version.ts` → 打进 JS 包，代表「客户端当前运行的应用壳版本」。
   - 两份的 `builtAt` 都由同一次构建生成，比对无时钟偏差问题。
   - 参考 `references/inject-fingerprint.mjs`（在 vite build 之前调用）。

2. **vite.config 调整**：`registerType: 'prompt'` + runtimeCaching 按资源类型配方。
   参考 `references/vite-pwa-config.snippet.ts`。

3. **接入 useAppUpdate composable**：拷 `references/useAppUpdate.ts` 到 `src/composables/`。
   它做三件事：注册 SW 监听 onNeedRefresh；启动时静默比对指纹；暴露 `checkForUpdate` / `applyUpdate`。

4. **UI 接线**（两条交互 + 三条 UX 原则）：
   - 设置面板加「关于」区：当前版本 + 构建时间 + 「检查更新」按钮（检查中/已是最新/发现新版本 vN/网络不可用 四态反馈）+「立即更新」；
   - 应用启动后发现新版本，只亮**一条可关闭的底部轻提示**「新版本已就绪」；
   - 三条原则：**不打断主任务**（阅读中绝不弹窗）、**可关闭**（关了就别再骚扰）、**发现 ≠ 强制**（用户有「知道了但暂时不更」的权利）。

5. **验证清单**：
   - 改一点内容 → 重新构建 → 部署 → 打开已访问过的浏览器，应见轻提示；设置页「检查更新」应报新版本号；
   - 点「立即更新」→ 页面刷新后内容为最新、localStorage 之外的旧缓存全部消失（DevTools → Application → Cache Storage 应只剩新 SW 写入的）；
   - `grep NetworkFirst dist/sw.js` 确认配置类路由生成；`vue-tsc --noEmit` 过。

## 「立即更新」为什么是三步，而不是 updateSW(true)

```ts
await Promise.all((await caches.keys()).map((k) => caches.delete(k)))   // 1. 清全部 Cache Storage
await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()))  // 2. 注销 SW
location.reload()                                                        // 3. 强制刷新
```

`updateSW(true)` 只让新 SW 接管并发消息，**旧的运行时缓存（SWR 攒下的旧数据）原样保留**——正是「看不到新内容」的元凶。三步法把缓存全部推倒，刷新后由新 SW 重建，代价只是首访多拉几次数据，可接受。

## 踩坑清单

1. **指纹拉取必须 `cache: 'no-store'`**：只加 `?t=` 参数不够，部分 HTTP 缓存层会吃掉带 query 的请求。
2. **配置类文件别用 SWR**（如 gate/开关 JSON）：SWR 先旧后新，改配置后老访客首访必见旧值；改 NetworkFirst（`networkTimeoutSeconds: 3`）。
3. **runtimeCaching 路由有顺序**：先匹配先生效，更具体的 pattern（gate.json）要放在宽 pattern（data/*.json）**前面**。
4. **TS 5.9+ 的 `Uint8Array<ArrayBufferLike>` 不满足 `BufferSource`**：对要传给 `crypto.subtle` 的字节数组，显式标注/构造 `Uint8Array<ArrayBuffer>`（`new Uint8Array(new ArrayBuffer(n))`）。
5. **静默检查要等 SW ready**：`navigator.serviceWorker.ready` + 4s 超时兜底再比对，否则冷启动竞态下容易误报。
6. **dev 模式没有 SW**：composable 里所有 SW 调用都要可选链 + try/catch，别让开发环境报错。
7. **对已生成实例重跑 build 不会重拷模板**（若你的项目有类似"模板+实例"结构）：改了模板里的 vite.config 后必须先 init/upgrade 再 build，否则 SW 策略还是旧的。

## 边界与演进

- **纯客户端做不到真推送**：本方案是「启动时版本比对」的准推送效果。将来接后端，把比对目标换成服务端版本接口 + Web Push（VAPID）订阅，交互层零改动。
- **iOS Safari PWA**：SW 更新节奏更保守，「立即更新」的三步法在 iOS 上同样有效（清缓存 + reload 不依赖 SW 接管时序），这也是选三步法而非 updateSW 的原因之一。
- **多标签页**：一个标签更新会连带其它标签刷新（SW 注销是全局的），极端场景可用 BroadcastChannel 先提示再操作，一般无需处理。
