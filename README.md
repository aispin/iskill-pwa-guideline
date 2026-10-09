# iskill-pwa-guideline

PWA 标准化最佳实践指南——从线上验证过的电子书 PWA（[iskill-build-books](https://github.com/aispin/iskill-build-books)）实现中抽取的完整配方，覆盖五个关键面：

| 主题 | 一句话 |
|------|--------|
| ① Manifest 与安装 | 子路径部署不破、安装校验全过、自绘安装提示 |
| ② 图标 | 按应用名程序化生成全套图标（SVG/PNG/maskable/iOS），三级回退光栅链，无需设计师 |
| ③ 离线与缓存 | 按资源类型选 SW 策略的决策表（预缓存/SWR/NetworkFirst/CacheFirst） |
| ④ 版本更新感知 | 双指纹检测 + 静默提醒 + 设置页检查更新 + 一键清缓存——解决「更新后看不到新内容」 |
| ⑤ 访问门禁 | 纯客户端邀请码：哈希校验 / 内容加密（PBKDF2+AES-256-GCM）两档，记住设备、平滑接后端 |

纯客户端方案，零后端依赖；参考代码在 `references/`，可直接拷用。

## 目录

```
SKILL.md                          # 完整指南（决策表 + 施工步骤 + 踩坑清单）
references/
  update/                         # ④ 版本更新感知
    inject-fingerprint.mjs        #   构建前注入双指纹（node 直跑）
    useAppUpdate.ts               #   Vue 3 composable（零新增依赖）
    vite-pwa-config.snippet.ts    #   vite.config 缓存配方
  icons/                          # ② 图标
    generate-icons.mjs            #   程序化生成 + 三级回退光栅链（含零依赖 PNG 编码器）
    manifest-icons.snippet.ts     #   manifest 图标段 + <head> 接线
  gate/                           # ⑤ 访问门禁
    gate-cli.mjs                  #   构建侧：生成/加密/解密（node:crypto，零依赖）
    gate-client.ts                #   浏览器侧：解锁/记住设备/解密
```

## 快速接入

做 PWA 时把 SKILL.md 当 checklist 过一遍：Manifest → 图标 → 缓存策略 → 更新感知 →（需要时）门禁。每个主题的参考代码标注了拷贝位置与前置条件。

> 依赖同步：本仓库含 iskill 共享真源的 vendored 副本（清单见 `package.json` 的 `iskillDeps`），**不要手改**。使用前请同时安装 iskill-dep-sync：对 agent 说「请帮我安装 Skill：aispin/iskill-dep-sync」；用法见 SKILL.md「依赖同步」节。
