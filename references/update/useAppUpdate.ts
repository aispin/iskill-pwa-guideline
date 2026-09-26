/**
 * useAppUpdate —— PWA 更新感知 composable（Vue 3，零依赖新增）
 *
 * 拷到 src/composables/ 后即可用。检测双通道：
 *   A. SW 预缓存 diff（onNeedRefresh）→ 应用壳/代码变化
 *   B. 构建指纹比对（网络优先拉 build-info.json）→ 数据-only 变化（SW diff 发现不了）
 *
 * UI 接线：
 *   - 设置面板：updateStatus 四态（idle/checking/latest/available/offline）+ localBuildInfo() 显示版本；
 *     available 时「立即更新」按钮调 applyUpdate()
 *   - 全局轻提示：hasUpdate 为 true 时显示「新版本已就绪」（可关闭，绝不弹窗打断）
 *
 * 前置：vite-plugin-pwa registerType: 'prompt'；构建时注入 public/build-info.json + src/version.ts
 * （见 references/inject-fingerprint.mjs）。React/Svelte 项目可按相同思路改写为 hook/store。
 */
import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import { BUILD_INFO } from '../version'

export type UpdateStatus = 'idle' | 'checking' | 'latest' | 'available' | 'offline'

const localInfo = { version: BUILD_INFO.version, builtAt: BUILD_INFO.builtAt, builtAtText: BUILD_INFO.builtAtText }

export const updateStatus = ref<UpdateStatus>('idle')
export const hasUpdate = ref(false)
export const remoteInfo = ref<{ version?: string; builtAtText?: string } | null>(null)

export function localBuildInfo() { return localInfo }

// 通道 A：SW 预缓存 diff（应用壳/代码变化）
registerSW({
  immediate: true,
  onNeedRefresh: () => {
    hasUpdate.value = true
    if (updateStatus.value !== 'checking') updateStatus.value = 'available'
  },
})

/** 手动/静默检查更新（通道 B：指纹比对）；返回最新状态 */
export async function checkForUpdate(silent = false): Promise<UpdateStatus> {
  if (!silent) updateStatus.value = 'checking'
  try {
    // cache: 'no-store' 必须加——只加 ?t= 参数不够，部分 HTTP 缓存层会吃掉带 query 的请求
    const res = await fetch(`build-info.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const info = await res.json()
    remoteInfo.value = info
    if (typeof info?.builtAt === 'number' && info.builtAt > localInfo.builtAt) {
      hasUpdate.value = true
      updateStatus.value = 'available'
    } else {
      updateStatus.value = 'latest'
    }
  } catch {
    // 静默模式下离线失败不打扰用户；手动检查给出反馈
    updateStatus.value = silent ? 'idle' : 'offline'
  }
  return updateStatus.value
}

/** 立即更新：清缓存 + 注销 SW + 强制刷新（比 updateSW(true) 彻底——旧的运行时缓存一并清掉） */
export async function applyUpdate(): Promise<void> {
  try {
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)))
  } catch { /* 忽略清理失败，刷新兜底 */ }
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
  } catch { /* 同上 */ }
  location.reload()
}

// 启动静默检查：等 SW 就绪（或 4s 超时兜底）后静默比对一次，仅亮轻提示不弹窗
if (typeof window !== 'undefined') {
  const arm = () => {
    const ready = navigator.serviceWorker?.ready ?? Promise.resolve()
    Promise.race([ready, new Promise((r) => setTimeout(r, 4000))])
      .then(() => checkForUpdate(true))
      .catch(() => {})
  }
  if (document.readyState === 'complete') arm()
  else window.addEventListener('load', arm, { once: true })
}
