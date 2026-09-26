/**
 * PWA 图标生成（参考实现：程序化 SVG + 三级回退光栅链）
 * 优先用 @resvg/resvg-js 把 SVG 光栅化为 PNG；不可用时回退为「纯 JS 光栅 + PNG 编码」，
 * 任何情况下都保证构建不中断（最差情况只产出 SVG 图标）。
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { pathToFileURL } from 'node:url'

const WORKSPACE_NM = path.join(process.env.HOME || '', '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules')

async function loadResvg() {
  const candidates = [
    path.join(WORKSPACE_NM, '@resvg', 'resvg-js', 'index.js'),
    path.join(process.env.HOME || '', '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules', '@resvg', 'resvg-js', 'dist', 'index.js'),
  ]
  for (const p of candidates) {
    try {
      const m = await import(pathToFileURL(p).href)
      return m.Resvg ?? m.default?.Resvg ?? null
    } catch {}
  }
  try {
    const m = await import('@resvg/resvg-js')
    return m.Resvg ?? null
  } catch {}
  return null
}

/** 由种子文本（应用名/标识）派生稳定色相——同名永远同色 */
function hueOf(seedText) {
  let h = 2166136261
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h) % 360
}

/** 无字体依赖的「打开的书」抽象图形 */
export function iconSvg({ title = '', size = 512, maskable = false } = {}) {
  const h = hueOf(seed || 'app')
  const c1 = `hsl(${h} 42% 30%)`
  const c2 = `hsl(${(h + 34) % 360} 46% 46%)`
  const c3 = `hsl(${(h + 68) % 360} 44% 62%)`
  const wrap = maskable ? `<g transform="translate(${size * 0.1} ${size * 0.1}) scale(0.8)">` : '<g>'
  const end = maskable ? '</g>' : '</g>'
  const u = size / 512
  const line = (x, y, w, o) => `<rect x="${x * u}" y="${y * u}" width="${w * u}" height="${9 * u}" rx="${4.5 * u}" fill="#fff" opacity="${o}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="52%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <circle cx="${size * 0.78}" cy="${size * 0.2}" r="${size * 0.2}" fill="#fff" opacity="0.1"/>
  <circle cx="${size * 0.2}" cy="${size * 0.84}" r="${size * 0.16}" fill="#fff" opacity="0.08"/>
  ${wrap}
    <rect x="${104 * u}" y="${112 * u}" width="${142 * u}" height="${300 * u}" rx="${12 * u}" fill="#fff" opacity="0.94"/>
    <rect x="${266 * u}" y="${112 * u}" width="${142 * u}" height="${300 * u}" rx="${12 * u}" fill="#fff" opacity="0.94"/>
    <rect x="${249 * u}" y="${108 * u}" width="${14 * u}" height="${308 * u}" rx="${7 * u}" fill="${c1}" opacity="0.55"/>
    ${line(124, 156, 100, 0.32)}${line(124, 186, 84, 0.26)}${line(124, 216, 100, 0.26)}${line(124, 246, 68, 0.22)}
    ${line(286, 156, 100, 0.32)}${line(286, 186, 92, 0.26)}${line(286, 216, 76, 0.26)}${line(286, 246, 100, 0.22)}
  ${end}
</svg>`
}

/** 极简 PNG 编码器（RGBA → PNG），零依赖兜底 */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const off = y * (width * 4 + 1)
    raw[off] = 0
    rgba.copy(raw, off + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ])
}

let CRC_TABLE = null
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c
    }
  }
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

function hsl2rgb(h, s, l) {
  const S = s / 100, L = l / 100
  const k = (n) => (n + h / 30) % 12
  const a = S * Math.min(L, 1 - L)
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

/** 纯 JS 兜底光栅：渐变 + 书本色块（无文字） */
function rasterFallback(size, hue, maskable) {
  const buf = Buffer.alloc(size * size * 4)
  const [r1, g1, b1] = hsl2rgb(hue, 42, 30)
  const [r2, g2, b2] = hsl2rgb((hue + 34) % 360, 46, 46)
  const [r3, g3, b3] = hsl2rgb((hue + 68) % 360, 44, 62)
  const s = maskable ? 0.8 : 1
  const pad = maskable ? 0.1 : 0
  const inBook = (x, y) => {
    const nx = (x / size - pad) / s, ny = (y / size - pad) / s
    const px = nx * 512, py = ny * 512
    const page = (px >= 104 && px <= 246 && py >= 112 && py <= 412) || (px >= 266 && px <= 408 && py >= 112 && py <= 412)
    const spine = px >= 249 && px <= 263 && py >= 108 && py <= 416
    return { page, spine }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x / size) * 0.5 + (y / size) * 0.5
      let r, g, b
      if (t < 0.52) {
        const k = t / 0.52
        r = r1 + (r2 - r1) * k; g = g1 + (g2 - g1) * k; b = b1 + (b2 - b1) * k
      } else {
        const k = (t - 0.52) / 0.48
        r = r2 + (r3 - r2) * k; g = g2 + (g3 - g2) * k; b = b2 + (b3 - b2) * k
      }
      const { page, spine } = inBook(x, y)
      if (spine) { r = r1 * 0.6; g = g1 * 0.6; b = b1 * 0.6 }
      else if (page) { r = 250; g = 248; b = 243 }
      const o = (y * size + x) * 4
      buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255
    }
  }
  return encodePng(size, size, buf)
}

/**
 * 生成图标到 <publicDir>/icons
 * @returns {{engine: 'resvg'|'raster'|'svg-only', files: string[]}}
 */
export async function generateIcons({ publicDir, seed = '' }) {
  const iconsDir = path.join(publicDir, 'icons')
  fs.mkdirSync(iconsDir, { recursive: true })
  const hue = hueOf(seed || 'app')
  const files = []

  // SVG 图标始终产出（可作为 favicon 与兜底）
  const svg = iconSvg({ seed, size: 512 })
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg)
  files.push('icons/icon.svg')

  const Resvg = await loadResvg()
  const targets = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'maskable-512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ]

  if (Resvg) {
    try {
      for (const t of targets) {
        const png = new Resvg(iconSvg({ seed, size: t.size, maskable: t.maskable }), {
          fitTo: { mode: 'width', value: t.size },
        }).render().asPng()
        fs.writeFileSync(path.join(iconsDir, t.name), png)
        files.push(`icons/${t.name}`)
      }
      return { engine: 'resvg', files }
    } catch (e) {
      console.warn(`⚠️  resvg 光栅化失败（${e.message}），回退纯 JS 图标`)
    }
  }

  try {
    for (const t of targets) {
      fs.writeFileSync(path.join(iconsDir, t.name), rasterFallback(t.size, hue, t.maskable))
      files.push(`icons/${t.name}`)
    }
    return { engine: 'raster', files }
  } catch (e) {
    console.warn(`⚠️  纯 JS 图标生成失败（${e.message}），仅保留 SVG 图标`)
    return { engine: 'svg-only', files }
  }
}

/** svg-only 时改写 manifest 图标段，避免出现指向不存在 PNG 的链接 */
export function patchManifestIcons(viteConfigPath) {
  let src = fs.readFileSync(viteConfigPath, 'utf8')
  if (!src.includes('icon-192.png')) return false
  const replacement = `icons: [
          { src: './icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],`
  src = src.replace(/icons:\s*\[[\s\S]*?\],\n/, replacement)
  fs.writeFileSync(viteConfigPath, src)
  return true
}
