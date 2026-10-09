---
name: iskill-pwa-guideline
description: PWA 标准化最佳实践指南——Manifest 与安装（含 theme-color 状态栏色同步）、图标（程序化生成/maskable 安全区）、离线缓存策略、版本更新感知（双指纹+静默提醒+一键清缓存）、纯客户端访问门禁（哈希/内容加密两档）。当用户要做 PWA 应用、提到 SW 缓存旧内容、缓存不刷新、图标生成、应用加锁/邀请码、离线策略、主题切换状态栏颜色时使用。
---

# PWA 最佳实践指南（Vite + vite-plugin-pwa）

一套从线上验证过的电子书 PWA（iskill-build-books）中抽取的标准配方，覆盖 PWA 应用的五个关键面。每个主题按「决策 → 施工 → 参考实现」组织，参考代码可直接拷用。

## 总览

| 主题 | 核心问题 | 参考实现（references/） |
|------|----------|------------------------|
| ① Manifest 与安装 | 装得上、装得对 | —（本文档够用） |
| ② 图标 | 各平台形状/尺寸全覆盖，无需设计师 | `icons/generate-icons.mjs` |
| ③ 离线与缓存 | 什么资源用什么策略（选错=更新失灵） | `update/vite-pwa-config.snippet.ts` |
| ④ 版本更新感知 | 更新后老用户看不到新内容 | `update/` 三件套 |
| ⑤ 访问门禁 | 受限内容分发（纯客户端天花板） | `gate/` 两件套 |

---

## ① Manifest 与安装

必查清单：
- `id`、`start_url`、`scope` 三处统一用相对根（如 `'./'`），保证部署到任意子路径都不破
- `display: 'standalone'`、`lang`、`theme_color`、`background_color` 齐全——Chrome 安装校验与启动画面的来源
- 自定义安装提示：监听 `beforeinstallprompt` 存下事件，用自绘 UI 触发 `prompt()`（浏览器默认横幅无法控样式，且错过就不再弹）
- iOS 没有 beforeinstallprompt，只能引导用户「分享 → 添加到主屏幕」，另需 `apple-touch-icon` link

### theme-color：两个同名配置，管的东西不同

| 配置 | 作用范围 |
|------|----------|
| manifest 的 `theme_color` | **已安装** App 的标题栏/启动画面（Android） |
| `<meta name="theme-color">` | **浏览器内**访问时的地址栏色（Android Chrome / iOS Safari 15+ 标签栏） |

两者都要设，且值保持一致。iOS **独立窗口模式**下状态栏色不看 theme-color，由
`apple-mobile-web-app-status-bar-style`（default/black/black-translucent）决定——三处一起检查。

**运行时主题必须同步 meta（高频翻车点）**：构建时写入的静态 meta 只对应默认主题，
应用内切主题后状态栏颜色不变，看起来像「主题没生效」的 bug。修复——切主题时把当前
背景色写回 meta：

```ts
function syncThemeColor() {
  const root = document.documentElement
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    // 主题色以 CSS 变量承载时，getComputedStyle 会强制重算样式，读到切换后的值
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
    if (bg) meta.setAttribute('content', bg)
  }
}
// 切主题入口调用；若主题以 data-theme 属性切换，watch 该属性即可
```

纯明暗两态（无自定义主题）可用无 JS 方案：多个带 `media="(prefers-color-scheme: dark)"`
的 meta theme-color，浏览器自动选。

## ② 图标

**决策**：SVG（`sizes: 'any'`）为主 + PNG 192/512（Chrome 安装校验硬要求）+ maskable-512（Android 自适应裁切）+ apple-touch-icon-180（iOS）。manifest 管不到 iOS 主屏图标，必须另放 `<link rel="apple-touch-icon">`。

**maskable 安全区**：图形主体放中央 80%，四周留纯色背景，否则圆形裁切切掉内容——最常见的图标翻车点。

**没有设计师怎么办**：`references/icons/generate-icons.mjs` 按应用名哈希出稳定色相，程序化生成整套图标。内置三级回退光栅链：resvg → 纯 JS 光栅（自带零依赖 PNG 编码器）→ svg-only（自动改写 manifest 不留死链），任何环境构建不中断。图形本身按需替换，工程骨架（色相哈希、maskable 缩放 0.8、回退链）直接复用。manifest 图标段与 `<head>` 接线见 `references/icons/manifest-icons.snippet.ts`。

## ③ 离线与缓存策略

按资源类型选策略，选错是 PWA 大半事故的根源：

| 资源 | 策略 | 理由 |
|------|------|------|
| 应用壳 JS/CSS/HTML | 预缓存（globPatterns） | 文件名带 hash，天然可更新 |
| 内容/数据 JSON | **StaleWhileRevalidate** | 离线可读，后台拉新 |
| 配置类小 JSON（门禁/开关） | **NetworkFirst**（3s 超时） | SWR 会「先旧后新」，改配置老访客必见旧值——高频踩坑点 |
| 大体积媒体（音视频） | CacheFirst | 基本不变，吃缓存 |
| HTML 导航 | navigateFallback | SPA 离线直达路由 |

注意 runtimeCaching 路由**先匹配先生效**，具体 pattern 放宽 pattern 前面。完整配置见 `references/update/vite-pwa-config.snippet.ts`。

## ④ 版本更新感知

### 三类更新，两条检测通道

| 更新内容 | SW 预缓存 diff 能发现吗 | 检测通道 |
|---|---|---|
| 应用壳（JS/CSS/HTML/图标） | **能** | SW `onNeedRefresh` |
| 运行时数据（内容 JSON） | **不能** | 双指纹比对 |
| 配置类小文件 | 不能 | 直接 NetworkFirst |

**只把 registerType 改成 prompt 是不够的**——数据-only 的更新不触发 SW 更新事件，必须靠构建指纹。

### 施工五步

1. **注入双指纹**（build 前跑 `references/update/inject-fingerprint.mjs`）：`public/build-info.json`（进 dist，线上带 cache-bust 网络优先拉取）+ `src/version.ts`（打进 JS 包，代表当前运行版本）。两份 builtAt 同源写入，比对无时钟偏差。
2. **vite.config**：`registerType: 'prompt'` + ③ 的缓存配方。
3. **接入 composable**：拷 `references/update/useAppUpdate.ts`，注册 SW 监听 + 启动静默比对 + 暴露检查/更新 API。
4. **UI 接线**：设置面板「关于」区（版本/构建时间/检查更新/立即更新）+ 启动后发现新版本只亮一条可关闭的底部轻提示。三条 UX 原则：**不打断主任务**、**可关闭**、**发现 ≠ 强制**。
5. **验证**：改内容 → 重建 → 部署 → 已访问浏览器应见提示；立即更新后 Cache Storage 只剩新 SW 写入；`grep NetworkFirst dist/sw.js`；`vue-tsc --noEmit`。

### 更新感知为什么「过一会儿才弹」（线上实测）

`registerType: 'prompt'` 下，从发布新版到提示弹出有三个延迟来源，逐个消除：

1. **`sw.js` 的 HTTP 缓存（最大元凶）**：托管方没下发 `Cache-Control` 时，浏览器按启发式缓存（基于 Last-Modified，最长 24h 内视为新鲜）——发布后一段时间内更新检查拉到的还是旧 `sw.js`，比对不出差异，**时间因此漂移不定**。修复：注册时声明绕过 HTTP 缓存
   ```ts
   registerSW({ immediate: true, onNeedRefresh,
     registrationOptions: { updateViaCache: 'none' } })
   ```
   （`updateViaCache: 'none'` 是标准 RegistrationOptions，更新检查不读 HTTP 缓存；静态资源预缓存不受影响）
2. **浏览器只在页面打开/导航时检查**（另加每 24h / push / sync），App 长驻后台不会自己查。修复：`visibilitychange` → visible 时调 `registration.update()`
3. **发现 diff ≠ 立即弹**：要等新 SW 下载并预缓存全部资源装完才触发 `onNeedRefresh`，弱网下数十秒属正常。无须修，但要知道这不是 bug。

修复后语义：发布新版 → 用户**下次打开 App 必发现**（秒级链路）→ 弹可关闭轻提示 → 点「刷新」走三步法切换。prompt 交互不变。

### 「立即更新」为什么是三步法，而不是 updateSW(true)

```ts
await Promise.all((await caches.keys()).map((k) => caches.delete(k)))   // 1. 清全部 Cache Storage
await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()))  // 2. 注销 SW
location.reload()                                                        // 3. 强制刷新
```

`updateSW(true)` 只让新 SW 接管，**旧的运行时缓存（SWR 攒下的旧数据）原样保留**——正是「看不到新内容」的元凶。三步法全部推倒由新 SW 重建，代价只是首访多拉几次数据；且清缓存+reload 不依赖 SW 接管时序，iOS Safari 上同样可靠。

## ⑤ 访问门禁（纯客户端邀请码）

**两档防护**（`references/gate/`，构建侧 + 浏览器侧各一份，算法严格对齐）：

| 档位 | 原理 | 防护强度 |
|------|------|----------|
| hash 档 | 只存 `SHA-256(salt + 规范化码)`，产物内无明码 | 防君子；短码有被枚举的理论风险 |
| encrypted 档 | 数据 JSON 用 `PBKDF2(码, 15万次)` 派生 AES-256-GCM 密钥整体加密 | 天花板：扒走数据文件没有码也解不开 |

关键设计：
- **规范化两端一致**：去所有空白 + 忽略大小写（`replace(/\s+/g,'').toLowerCase()`），用户体验宽松、比对不误伤
- **记住设备**：解锁后导出派生密钥 JWK 存 localStorage，刷新免重输；设置面板可「上锁」重新要求输入
- **换码安全**：加密数据改码/移除前必须先用原码 `decryptData` 解回明文，再重新加密
- **移除不删文件**：写 `{ enabled: false }` 覆盖 gate.json，幂等且免删除权限
- **缓存配合**：gate.json 必须 NetworkFirst（见 ③），否则换码后老访客首访见旧门禁
- **UX**：全屏磨砂覆盖层解锁后才渲染主内容（加密数据物理上不可读，不是「隐藏」）；错误提示不泄露是码错还是数据坏

纯客户端的边界：码本身可被分享，适合「礼貌性付费/邀请制」，不适合作强安全。将来接后端：校验换接口、密钥改服务端下发，UI 与 gate.json 格式不变。

---

## 通用踩坑清单

1. 指纹拉取必须 `cache: 'no-store'`——只加 `?t=` 参数不够，部分 HTTP 缓存层会吃掉带 query 的请求
2. 配置类文件别用 SWR（先旧后新），改 NetworkFirst
3. runtimeCaching 路由先匹配先生效，具体 pattern 在前
4. TS 5.9+ 的 `Uint8Array<ArrayBufferLike>` 不满足 `BufferSource`：传给 `crypto.subtle` 的字节数组显式标注 `Uint8Array<ArrayBuffer>`（`new Uint8Array(new ArrayBuffer(n))`）
5. 静默检查要等 `navigator.serviceWorker.ready` + 超时兜底，避免冷启动竞态误报
6. dev 模式没有 SW：所有 SW 调用可选链 + try/catch
7. 若你的项目是「模板 + 实例」结构：改了模板必须先 init/upgrade 再 build，否则实例里还是旧配置
8. SW 注册一律带 `updateViaCache: 'none'`——无 Cache-Control 的托管（很多静态托管都这样）会启发式缓存 `sw.js`，更新检测时间漂移（见 ④）
9. App 可能长驻后台不重开：`visibilitychange` → visible 时主动 `registration.update()`，否则只有重开才感知新版
10. 有运行时主题的 App，切主题必须同步 `<meta name="theme-color">`，否则状态栏颜色不变、像主题失灵（见 ①）

## 边界与演进

- **纯客户端做不到真推送**：④ 是「启动时版本比对」的准推送效果；接后端后换服务端版本接口 + Web Push（VAPID），交互层零改动
- **多标签页**：一个标签更新会连带其它标签刷新（SW 注销是全局的），一般无需处理；讲究可用 BroadcastChannel 先提示
- **iOS Safari**：SW 更新节奏保守，④ 的三步法不依赖接管时序，iOS 上可靠

## 依赖同步

本仓库 `promo-page/assets/{app.js,style.css,icons.js}` 是 [iskill-promo-page](https://github.com/aispin/iskill-promo-page)
模板引擎的 vendored 副本（锁定版本见 `package.json` 的 `iskillDeps`），**不要手改**——
去真源仓库改并升 `@iskill-version`，再用 iskill-utils 同步回来。本机未装该工具时，先安装：对 agent 说「请帮我安装 Skill：aispin/iskill-utils」，或按下方自举命令现场拉取：

```bash
T="$HOME/.workbuddy/skills/iskill-utils/scripts/skill-deps.mjs"
[ -f "$T" ] || { TMP="$(mktemp -d)"; curl -fsSL "https://raw.githubusercontent.com/aispin/iskill-utils/HEAD/scripts/skill-deps.mjs" -o "$TMP/skill-deps.mjs"; T="$TMP/skill-deps.mjs"; }
node "$T" check "$(pwd)"     # 漂移检测；node "$T" sync "$(pwd)" 恢复/升级；node "$T" env "$(pwd)" 冷启动自检
```
