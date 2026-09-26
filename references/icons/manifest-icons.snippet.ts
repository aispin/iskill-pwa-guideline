/**
 * manifest 图标段 + index.html 头部 —— 图标接线片段
 *
 * 要点：
 *  - SVG 矢量图标 sizes:'any'，现代浏览器优先采用；PNG 是老系统/各商店的兜底
 *  - maskable 图标：图形主体放在中央 80% 安全区内（safe zone），四周留背景色，
 *    否则 Android 自适应圆形/圆角裁切会切掉内容
 *  - apple-touch-icon 是 iOS 添加到主屏用的，manifest 管不到它，必须放 <link>
 */

// ---------- vite.config.ts 的 manifest.icons ----------
export const manifestIcons = [
  // SVG 矢量：任意尺寸无损
  { src: './icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  // PNG 兜底（192/512 是 Chrome PWA 安装校验的硬要求）
  { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  // Android 自适应图标（圆形/圆角裁切），图形主体必须在中央 80% 安全区
  { src: './icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

// ---------- index.html <head> ----------
export const headLinks = `
<link rel="icon" href="./icons/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
<meta name="theme-color" content="#f3efe6" />
`
