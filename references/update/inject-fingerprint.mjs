/**
 * 构建指纹注入 —— 在 vite build 之前调用
 *
 *   node inject-fingerprint.mjs <appDir> [--version 1.2.0]
 *
 * 生成两份指纹（内容一致，用途不同）：
 *   <appDir>/public/build-info.json  → 进 dist，线上应用带 cache-bust 拉取比对（网络优先）
 *   <appDir>/src/version.ts          → 打进 JS 包，代表「客户端当前运行的应用壳版本」
 *
 * version 缺省取 <appDir>/package.json 的 version 字段。
 * buildAt 用毫秒时间戳（同一次构建写入两份，比对无时钟偏差）。
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const appDir = path.resolve(args[0] || '.')
const verIdx = args.indexOf('--version')
const version = verIdx > -1 ? args[verIdx + 1] : JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).version

const now = Date.now()
const info = { version, builtAt: now, builtAtText: new Date(now).toLocaleString('zh-CN') }

fs.writeFileSync(path.join(appDir, 'public', 'build-info.json'), JSON.stringify(info, null, 2) + '\n')
fs.writeFileSync(
  path.join(appDir, 'src', 'version.ts'),
  `// 由构建脚本自动生成，请勿手改\nexport const BUILD_INFO = ${JSON.stringify(info)} as const\n`,
)
console.log(`✓ 构建指纹 v${info.version} @ ${info.builtAtText}`)
