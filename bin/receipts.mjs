import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

export function readArtifact(path) {
  const abs = resolve(path)
  const buf = readFileSync(abs)
  return { path: abs, bytes: buf.length, sha256: sha256(buf), buf, text: buf.toString('utf8') }
}

export function receiptStem(file) {
  return resolve(file).replace(/\.html?$/i, '')
}

export function writeReceipt(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', 'utf8')
  return path
}

export function baseReceipt(command, artifact) {
  return {
    schemaVersion: 1,
    receiptId: randomUUID(),
    command,
    checkedAt: new Date().toISOString(),
    artifact: artifact ? { path: artifact.path, sha256: artifact.sha256, bytes: artifact.bytes } : null
  }
}

export function summarize(findings) {
  const r = { pass: 0, fail: 0, warn: 0 }
  for (const f of findings) r[f.status] = (r[f.status] || 0) + 1
  return r
}
