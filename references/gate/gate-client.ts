/**
 * 邀请码门禁（纯客户端）
 * - hash 档：SHA-256(salt + 规范化码) 本地比对
 * - encrypted 档：PBKDF2 派生 AES-256-GCM 密钥解密数据；解锁后导出密钥
 *   存 localStorage（记住设备，刷新免重输）
 * - 宽松容错：去所有空白 + 忽略大小写
 * 未来接后端：submitCode 改为接口校验、密钥改服务端下发，其余不变
 */
import { ref, computed } from 'vue'

const base = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/')
const LS_UNLOCKED = 'pwa.gate.unlocked'
const LS_KEY = 'pwa.gate.key'
const LS_SALT = 'pwa.gate.salt'

export interface GateInfo {
  gate: number
  enabled: boolean
  mode: 'hash' | 'encrypted'
  salt: string
  hash: string
  kdf?: { name: string; iterations: number; hash: string }
  cipher?: string
}

export const gateInfo = ref<GateInfo | null>(null)
export const unlocked = ref(false)
export const gateError = ref('')
export const gateChecking = ref(false)
export const gateIniting = ref(true)

/** 门禁通过（无门禁 / 已解锁）→ App 主内容可渲染 */
export const gatePass = computed(() => !gateInfo.value?.enabled || unlocked.value)

function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

let encKey: CryptoKey | null = null

async function importJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  // extractable 须与导出 JWK 的 ext:true 一致——WebKit 对不一致会抛 DataError
  return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, ['decrypt'])
}

/** 应用启动时调用：探测 gate.json，恢复记住的解锁状态 */
export async function initGate(): Promise<void> {
  gateIniting.value = true
  try {
    const r = await fetch(`${base}data/gate.json`, { cache: 'no-cache' })
    if (r.ok) {
      const g = (await r.json()) as GateInfo
      if (g?.enabled) {
        gateInfo.value = g
        // 记住的解锁状态绑定 salt：换码/重新加密生成新 salt，旧密钥解不开新数据，
        // 必须丢弃记忆重新弹解锁层（否则拿旧钥匙解新锁 → WebCrypto OperationError 死锁）
        const remembered = localStorage.getItem(LS_UNLOCKED) === '1' && localStorage.getItem(LS_SALT) === g.salt
        if (remembered) {
          if (g.mode === 'encrypted') {
            const jwk = localStorage.getItem(LS_KEY)
            if (jwk) { try { encKey = await importJwk(JSON.parse(jwk)) } catch { encKey = null } }
          }
          // 加密档拿不到密钥（如换浏览器数据迁移）→ 重新要求输入
          unlocked.value = g.mode !== 'encrypted' || !!encKey
        }
        if (!unlocked.value) {
          localStorage.removeItem(LS_UNLOCKED)
          localStorage.removeItem(LS_KEY)
          localStorage.removeItem(LS_SALT)
        }
      }
    }
  } catch { /* 无 gate.json = 无门禁 */ }
  gateIniting.value = false
}

/** 提交邀请码。成功返回 true（解锁 + 记忆设备 + 密钥就绪） */
export async function submitCode(input: string): Promise<boolean> {
  const g = gateInfo.value
  if (!g) return true
  gateChecking.value = true
  gateError.value = ''
  try {
    const norm = normalize(input)
    if (!norm) { gateError.value = '请输入邀请码'; return false }
    if ((await sha256Hex(g.salt + norm)) !== g.hash) {
      gateError.value = '邀请码不正确，请重试'
      return false
    }
    if (g.mode === 'encrypted') {
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm), 'PBKDF2', false, ['deriveKey'])
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: hexToBytes(g.salt), iterations: g.kdf?.iterations ?? 150_000, hash: 'SHA-256' },
        km, { name: 'AES-GCM', length: 256 }, true, ['decrypt'],
      )
      const jwk = await crypto.subtle.exportKey('jwk', key)
      localStorage.setItem(LS_KEY, JSON.stringify(jwk))
      encKey = key
    }
    unlocked.value = true
    localStorage.setItem(LS_UNLOCKED, '1')
    localStorage.setItem(LS_SALT, g.salt)
    return true
  } catch {
    gateError.value = '校验失败，请重试'
    return false
  } finally {
    gateChecking.value = false
  }
}

/** 上锁：清除记忆并刷新（同时清空内存中的解密数据缓存） */
export function lockAgain(): void {
  localStorage.removeItem(LS_UNLOCKED)
  localStorage.removeItem(LS_KEY)
  localStorage.removeItem(LS_SALT)
  location.reload()
}

/**
 * 数据加载统一解密入口：内容形如 ENC1:iv.tag.ct 时用派生密钥解密
 * 未加密数据（hash 档 / 无门禁）直接 JSON.parse
 */
export async function decodePayload(text: string): Promise<unknown> {
  if (!text.startsWith('ENC1:')) return JSON.parse(text)
  if (!encKey) throw new Error('数据已加密，请先输入邀请码解锁')
  const [, payload] = text.split(':')
  const [ivB64, tagB64, ctB64] = payload.split('.')
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0))
  const tag = Uint8Array.from(atob(tagB64), (c) => c.charCodeAt(0))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, encKey, appendTag(ct, tag))
  return JSON.parse(new TextDecoder().decode(pt))
}

function appendTag(ct: Uint8Array<ArrayBuffer>, tag: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(ct.length + tag.length)
  out.set(ct); out.set(tag, ct.length)
  return out
}
