/* ============================================================================
 * iskill-pwa-guideline · 落地页内容
 * 事实来源：本技能 SKILL.md / README.md / references/
 * ==========================================================================*/
window.PROMO = {
  name: "ISKILL-PWA-GUIDELINE",
  brand: "#10b981",
  brand2: "#22d3ee",
  repo: "https://github.com/aispin/iskill-pwa-guideline",
  repoLabel: "aispin/iskill-pwa-guideline",
  license: "MIT",

  /* 纯规范文档 + 纯 Node 参考脚本（node:crypto / 零依赖），无平台命令 → all */
  platform: "all",

  lang: {
    /* ── 中文 ───────────────────────────────────────────────────────── */
    zh: {
      meta: {
        title: "ISKILL-PWA-GUIDELINE · PWA 从坑里爬出来的那套配方",
        description: "从线上验证过的电子书 PWA 抽取的标准配方：Manifest 与安装、程序化图标、离线缓存策略、版本更新感知、纯客户端访问门禁。决策表 + 施工步骤 + 踩坑清单 + 可直接拷用的参考代码。"
      },
      a11y: { skip: "跳到主要内容" },
      ui: { copy: "复制", copied: "已复制", failed: "复制失败" },
      nav: { features: "能力", shots: "截图", how: "上手", faq: "问答" },

      hero: {
        badge: "AI 技能",
        titlePre: "PWA 该踩的坑，",
        titleAccent: "一次过完",
        titlePost: "",
        sub: "一套从线上验证过的电子书 PWA 中抽取的标准配方，覆盖五个关键面：Manifest 与安装、图标、离线与缓存、版本更新感知、访问门禁。每个主题按「决策 → 施工 → 参考实现」组织，参考代码在 references/ 里，可直接拷用。纯客户端方案，零后端依赖。",
        ctaPrimary: "复制安装提示词",
        ctaSecondary: "看源码",
        meta1: "纯规范 · 可拷代码",
        meta2: "零后端依赖",
        meta3: "MIT 许可"
      },
      terminal: {
        title: "zsh — iskill-pwa-guideline",
        lines: [
          [{ t: "$ ", c: "p" }, { t: "node scripts/inject-fingerprint.mjs", c: "k" }],
          [{ t: "✓ ", c: "p" }, { t: "已写入 public/build-info.json 与 src/version.ts（builtAt 同源）", c: "s" }],
          [{ t: "$ ", c: "p" }, { t: "grep -n \"updateViaCache\" references/update/vite-pwa-config.snippet.ts", c: "k" }],
          [{ t: "✓ ", c: "p" }, { t: "registerSW({ updateViaCache: 'none' }) —— 解决发布后更新检测漂移", c: "s" }]
        ]
      },

      stats: [
        { value: "5", label: "关键面", note: "Manifest / 图标 / 缓存 / 更新感知 / 门禁" },
        { value: "10", label: "通用踩坑清单", note: "逐条来自线上 PWA 实战" },
        { value: "150,000", label: "PBKDF2 迭代（encrypted 档）", note: "派生 AES-256-GCM 密钥整体加密" },
        { value: "0", label: "新增依赖", note: "useAppUpdate 拷即用；gate 走 node:crypto" }
      ],

      compare: {
        eyebrow: "对比",
        title: "以前 vs 现在",
        sub: "",
        before: {
          title: "边踩边修",
          items: [
            "装不上 / 装上了图标被圆形裁切切掉",
            "更新后老用户死活看不到新内容，只能教人清缓存",
            "缓存策略选错，配置改了老访客还是见旧值"
          ]
        },
        after: {
          title: "照配方过一遍",
          items: [
            "maskable 留 80% 安全区 + 程序化图标，无需设计师",
            "双指纹检测 + 三步法「立即更新」，iOS 上也可靠",
            "按资源类型选策略的决策表：预缓存 / SWR / NetworkFirst / CacheFirst"
          ]
        }
      },

      features: {
        eyebrow: "能力",
        title: "它覆盖什么",
        sub: "",
        items: [
          { icon: "layers", title: "Manifest 与安装", desc: "id/start_url/scope 统一相对根，子路径部署不破；theme-color 三处同步、运行时切主题也回写。" },
          { icon: "grid", title: "程序化图标", desc: "按应用名哈希出稳定色相生成全套图标，maskable 缩放 0.8；resvg → 纯 JS 光栅 → svg-only 三级回退。" },
          { icon: "refresh", title: "缓存策略决策表", desc: "应用壳预缓存、内容 JSON 用 SWR、配置类小文件 NetworkFirst、媒体 CacheFirst，选错是事故之源。" },
          { icon: "bolt", title: "版本更新感知", desc: "双指纹检测覆盖数据-only 更新；registerType: 'prompt' + updateViaCache: 'none' 消除检测漂移。" },
          { icon: "shield", title: "纯客户端门禁", desc: "hash 档只存 SHA-256、encrypted 档用 PBKDF2+AES-256-GCM 整体加密，记住设备、换码安全。" },
          { icon: "copy", title: "参考代码可直拷", desc: "references/ 下 update / icons / gate 三套，标注了拷贝位置与前置条件，零新增依赖。" }
        ]
      },

      showcase: {
        eyebrow: "实拍",
        title: "看一眼真东西",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "上手",
        title: "三步跑起来",
        sub: "命令由 agent 跑，你只说要什么、看结果。",
        items: [
          { title: "交给 AI 装", desc: "把这句话粘进对话框，agent 会自己拉代码、读文档，再告诉你用法。", codeKey: "install" },
          { title: "让它按规范过一遍", desc: "这是指南型技能：代码由它按你的项目改，不是让你照抄片段。", codeName: "prompt", code: "按 PWA 规范检查我这个项目：manifest、图标、离线缓存、更新感知，缺什么补什么。" },
          { title: "装到桌面真机验一遍", desc: "缓存不刷新、状态栏颜色、maskable 安全区这些坑只有真机装一遍才看得出来——这步只能你做。" }
        ]
      },


      faq: {
        eyebrow: "问答",
        title: "常见问题",
        items: [
          { q: "它是代码库还是文档？", a: "主要是规范文档（SKILL.md 当 checklist 过一遍），外加 <code>references/</code> 里可直接拷用的参考代码。它不是 npm 包，不通过 <code>npm install</code> 引入。" },
          { q: "跨平台吗？", a: "是的，全平台。文档本身无平台依赖，参考脚本是纯 Node（<code>node:crypto</code>、零新增依赖），macOS / Windows / Linux 都能跑。" },
          { q: "访问门禁安全吗？", a: "纯客户端有天花板：码本身可被分享，适合「礼貌性付费 / 邀请制」，不适合作强安全。encrypted 档扒走数据文件没有码也解不开，但这是防护上限；将来接后端把校验换成接口、密钥服务端下发即可。" },
          { q: "一定要用 Vite 吗？", a: "参考实现基于 Vite + vite-plugin-pwa，缓存配置片段也是 vite.config 版；但决策表（什么资源用什么策略）与门禁算法是通用的，可移植到别的构建工具。" },
          { q: "更新感知为什么「过一会儿才弹」？", a: "三个延迟来源：<code>sw.js</code> 的 HTTP 缓存（最大元凶）、浏览器只在打开 / 导航时检查、以及要等新 SW 预缓存装完才触发。配方里都有对应修法（<code>updateViaCache: 'none'</code> + <code>visibilitychange</code> → <code>registration.update()</code>）。" },
          { q: "需要后端吗？", a: "不需要，整套是纯客户端方案、零后端依赖。真推送等能力要接后端时，交互层零改动。" }
        ]
      },

      cta: { title: "下次做 PWA 直接抄", desc: "把 SKILL.md 当 checklist 过一遍，五个面一次过完。", primary: "去 GitHub 看看", secondary: "复制安装提示词" },
      footer: { license: "MIT 许可", madeWith: "由 iskill-promo-page 生成" }
    },

    /* ── English ────────────────────────────────────────────────────── */
    en: {
      meta: {
        title: "ISKILL-PWA-GUIDELINE · The PWA recipe, learned the hard way",
        description: "A standard recipe extracted from a production e-book PWA: manifest and install, programmatic icons, offline caching strategy, update awareness, and pure-client access gating. Decision tables, build steps, a pitfalls list and copy-ready reference code."
      },
      a11y: { skip: "Skip to content" },
      ui: { copy: "Copy", copied: "Copied", failed: "Copy failed" },
      nav: { features: "Features", shots: "Screens", how: "Get started", faq: "FAQ" },

      hero: {
        badge: "AI skill",
        titlePre: "Clear the PWA traps ",
        titleAccent: "in one pass",
        titlePost: "",
        sub: "A standard recipe extracted from a production e-book PWA, covering five key areas: manifest and install, icons, offline and caching, update awareness, and access gating. Each topic is organised as decision → build → reference implementation, with copy-ready code under references/. A pure-client approach with zero backend dependencies.",
        ctaPrimary: "Copy install prompt",
        ctaSecondary: "View source",
        meta1: "Spec + copy-ready code",
        meta2: "Zero backend",
        meta3: "MIT licensed"
      },
      terminal: {
        title: "zsh — iskill-pwa-guideline",
        lines: [
          [{ t: "$ ", c: "p" }, { t: "node scripts/inject-fingerprint.mjs", c: "k" }],
          [{ t: "✓ ", c: "p" }, { t: "wrote public/build-info.json and src/version.ts (same builtAt source)", c: "s" }],
          [{ t: "$ ", c: "p" }, { t: "grep -n \"updateViaCache\" references/update/vite-pwa-config.snippet.ts", c: "k" }],
          [{ t: "✓ ", c: "p" }, { t: "registerSW({ updateViaCache: 'none' }) — fixes update-check drift after release", c: "s" }]
        ]
      },

      stats: [
        { value: "5", label: "key areas", note: "manifest / icons / caching / update awareness / gating" },
        { value: "10", label: "general pitfalls", note: "each one from real production PWA work" },
        { value: "150,000", label: "PBKDF2 iterations (encrypted tier)", note: "derives the AES-256-GCM key for whole-payload encryption" },
        { value: "0", label: "extra dependencies", note: "useAppUpdate is copy-paste; gate uses node:crypto" }
      ],

      compare: {
        eyebrow: "Comparison",
        title: "Before vs after",
        sub: "",
        before: {
          title: "Fixing as you break",
          items: [
            "It will not install, or the icon gets cropped by the circular mask",
            "After a release, existing users simply never see the new content",
            "Pick the wrong caching strategy and changed config still serves stale values"
          ]
        },
        after: {
          title: "Walk the recipe once",
          items: [
            "maskable keeps an 80% safe zone plus programmatic icons — no designer needed",
            "Dual-fingerprint detection plus a three-step \"update now\", reliable on iOS too",
            "A decision table by resource type: precache / SWR / NetworkFirst / CacheFirst"
          ]
        }
      },

      features: {
        eyebrow: "Features",
        title: "What it covers",
        sub: "",
        items: [
          { icon: "layers", title: "Manifest & install", desc: "id/start_url/scope all relative-root so subpath deploys survive; theme-color kept in sync across three places, including runtime theme switches." },
          { icon: "grid", title: "Programmatic icons", desc: "Hash the app name into a stable hue for a full icon set, maskable scaled 0.8; resvg → pure-JS raster → svg-only fallback chain." },
          { icon: "refresh", title: "Caching decision table", desc: "App shell precached, content JSON via SWR, small config files NetworkFirst, media CacheFirst — the wrong pick is where PWA incidents come from." },
          { icon: "bolt", title: "Update awareness", desc: "Dual-fingerprint detection covers data-only updates; registerType: 'prompt' + updateViaCache: 'none' removes detection drift." },
          { icon: "shield", title: "Pure-client gating", desc: "hash tier stores only SHA-256; encrypted tier encapsulates with PBKDF2 + AES-256-GCM, with device memory and safe code rotation." },
          { icon: "copy", title: "Copy-ready reference code", desc: "update / icons / gate under references/, each annotated with where to copy it and what it needs; zero new dependencies." }
        ]
      },

      showcase: {
        eyebrow: "Screens",
        title: "See the real thing",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "Get started",
        title: "Up and running in three steps",
        sub: "The agent runs the commands. You say what you want and check the result.",
        items: [
          { title: "Let your agent install it", desc: "Paste the line into the chat — it clones the repo, reads the docs, and tells you how to use it.", codeKey: "install" },
          { title: "Have it audit against the guide", desc: "It's a guideline skill: the agent adapts the snippets to your project instead of you copying them.", codeName: "prompt", code: "Audit my project against the PWA guidelines — manifest, icons, offline caching, update detection — and fix whatever's missing." },
          { title: "Install it and check on a real device", desc: "Stale caches, status-bar color and maskable safe zones only show up on a real install. That part is yours." }
        ]
      },


      faq: {
        eyebrow: "FAQ",
        title: "Frequently asked",
        items: [
          { q: "Is it a codebase or documentation?", a: "Mostly a spec (walk SKILL.md as a checklist) plus copy-ready reference code under <code>references/</code>. It is not an npm package and is not pulled in via <code>npm install</code>." },
          { q: "Is it cross-platform?", a: "Yes, all platforms. The docs have no platform dependency and the reference scripts are pure Node (<code>node:crypto</code>, zero new deps), so macOS / Windows / Linux all work." },
          { q: "Is the access gate secure?", a: "Pure client-side has a ceiling: the code itself can be shared, so it suits polite paid / invite-only access, not strong security. The encrypted tier is unreadable without the code even if the data file is taken, but that is the upper bound; wiring a backend later swaps validation for an API and moves the key server-side." },
          { q: "Must I use Vite?", a: "The reference implementation targets Vite + vite-plugin-pwa, and the caching snippet is vite.config-specific; but the decision table (what resource gets what strategy) and the gating algorithms are general and portable to other bundlers." },
          { q: "Why does the update prompt \"show up only after a while\"?", a: "Three sources of delay: the HTTP cache on <code>sw.js</code> (the biggest culprit), browsers only checking on open/navigation, and waiting for the new SW to finish precaching. The recipe covers each fix (<code>updateViaCache: 'none'</code> plus <code>visibilitychange</code> → <code>registration.update()</code>)." },
          { q: "Does it need a backend?", a: "No — the whole thing is a pure-client approach with zero backend dependencies. When you later need real push and add a backend, the interaction layer does not change." }
        ]
      },

      cta: { title: "Copy it for your next PWA", desc: "Walk SKILL.md as a checklist and clear all five areas at once.", primary: "Open on GitHub", secondary: "Copy install prompt" },
      footer: { license: "MIT licensed", madeWith: "Built with iskill-promo-page" }
    }
  }
};
