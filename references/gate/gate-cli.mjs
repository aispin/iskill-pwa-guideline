/**
 * 邀请码门禁 —— 构建侧（Node，零依赖，仅用 node:crypto）
 *
 * 两档防护：
 *   B 档（hash）：只存 SHA-256(salt + 规范化码)，产物内无明码（短码有被枚举的理论风险）
 *   C 档（encrypted）：数据 JSON 用 PBKDF2(码) 派生的 AES-256-GCM 密钥整体加密，
 *     扒走数据文件没有码也解不开 —— 纯客户端方案的天花板
 *
 * 未来接后端：校验换接口、密钥改服务端下发，客户端 UI 与 gate.json 格式不变。
 *
 * 用法（dataDir = 应用公开数据目录，如 <public>/data）：
 *   applyGate(dataDir, { code: 'INVITE2026', encrypt: false })  // 启用/换码（换码前先 decryptData）
 *   applyGate(dataDir, { code: 'INVITE2026', encrypt: true })   // 连数据一起加密
 *   decryptData(dataDir, oldCode)                               // 改码/移除前把加密数据解回明文
 *   // 移除门禁：写 { gate:1, enabled:false } 覆盖 gate.json（不删文件，幂等）
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const GATE_VERSION = 1
const PBKDF2_ITERATIONS = 150_000

/** 宽松规范化：去所有空白 + 忽略大小写（必须与客户端比对规则一致） */
export function normalizeCode(code) {
  return String(code ?? '').replace(/\s+/g, '').toLowerCase()
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

/** 生成 gate.json（B/C 档通用元信息；不含任何机密） */
export function makeGateMeta({ code, encrypt }) {
  const norm = normalizeCode(code)
  if (!norm) throw new Error('邀请码为空')
  const salt = crypto.randomBytes(16).toString('hex')
  return {
    gate: GATE_VERSION,
    enabled: true,
    mode: encrypt ? 'encrypted' : 'hash',
    salt,
    hash: sha256Hex(salt + norm), // 客户端比对用
    kdf: { name: 'PBKDF2', iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    cipher: 'AES-256-GCM',
  }
}

function deriveKey(norm, saltHex) {
  return crypto.pbkdf2Sync(norm, Buffer.from(saltHex, 'hex'), PBKDF2_ITERATIONS, 32, 'sha256')
}

/** 加密一个 JSON 对象 → 'ENC1:iv.tag.ct'（base64 三段） */
function encryptJSON(obj, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `ENC1:${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`
}

/**
 * 对 dataDir 全部 JSON 加密（gate.json 自身除外）并写入 gate.json
 * 返回 gate 元信息（供调用方记录配置）
 */
export function applyGate(dataDir, { code, encrypt }) {
  const meta = makeGateMeta({ code, encrypt })
  if (encrypt) {
    const key = deriveKey(normalizeCode(code), meta.salt)
    let n = 0
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name.endsWith('.json') && e.name !== 'gate.json') {
          fs.writeFileSync(p, encryptJSON(JSON.parse(fs.readFileSync(p, 'utf8')), key))
          n++
        }
      }
    }
    walk(dataDir)
    meta.files = n
  }
  fs.writeFileSync(path.join(dataDir, 'gate.json'), JSON.stringify(meta))
  return meta
}

/** 用原码把数据全部解密回明文（改码 / 移除门禁前调用） */
export function decryptData(dataDir, code) {
  const metaPath = path.join(dataDir, 'gate.json')
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  if (meta.mode !== 'encrypted') return 0
  const key = crypto.pbkdf2Sync(
    normalizeCode(code),
    Buffer.from(meta.salt, 'hex'),
    meta.kdf?.iterations ?? PBKDF2_ITERATIONS,
    32, 'sha256',
  )
  let n = 0
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.json') && e.name !== 'gate.json') {
        const raw = fs.readFileSync(p, 'utf8')
        if (!raw.startsWith('ENC1:')) continue
        const [ivB64, tagB64, ctB64] = raw.slice(5).split('.')
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
        decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
        const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()])
        fs.writeFileSync(p, JSON.stringify(JSON.parse(pt.toString('utf8'))))
        n++
      }
    }
  }
  walk(dataDir)
  return n
}
