/**
 * vite.config.ts 关键片段 —— PWA 更新感知相关配置
 *
 * 1) registerType 改 'prompt'：新 SW 先安装待命，等 onNeedRefresh 通知 UI，
 *    而不是 autoUpdate 静默接管（用户感知不到，也不知道要刷新）。
 * 2) runtimeCaching 按资源类型配方（注意顺序：具体 pattern 在前，宽 pattern 在后）。
 */
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // ① 配置类小文件（门禁/开关/远端参数）：网络优先。
            //    SWR 会「先旧后新」，配置变更后老访客首访必见旧值——这是常见踩坑点。
            urlPattern: /\/gate\.json(\?.*)?$/i, // 换成你项目的配置文件 pattern
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-config',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // ② 内容/数据 JSON：SWR，离线可读已缓存内容，后台静默拉新。
            //    注意：这类文件的「新内容」不会触发 SW 更新事件，靠构建指纹兜底检测。
            urlPattern: /\/data\/.*\.json(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-data',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // ③ 大体积媒体（音频/视频）：CacheFirst，基本不变的资源直接吃缓存。
            urlPattern: /\.(mp3|m4a|ogg|oga|wav|flac|aac)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-media',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
