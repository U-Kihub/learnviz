// Minimal zero-dependency DevTools-protocol client over --remote-debugging-pipe.
// Browser reads commands from fd 3, writes responses/events to fd 4; messages are
// NUL-terminated JSON. Works with Edge / Chrome / Chromium (headless).
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function findBrowser(explicit) {
  if (explicit && existsSync(explicit)) return explicit
  if (process.env.LEARNVIZ_BROWSER && existsSync(process.env.LEARNVIZ_BROWSER)) return process.env.LEARNVIZ_BROWSER
  const candidates = []
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null
    )
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    )
  } else {
    candidates.push(
      '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium', '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge', '/snap/bin/chromium'
    )
  }
  for (const p of candidates) if (p && existsSync(p)) return p
  return null
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export class Browser {
  constructor(executable) {
    this.executable = executable
    this.child = null
    this.userDir = null
    this.buf = Buffer.alloc(0)
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
    this.sessionId = null
    this.targetId = null
  }

  async launch() {
    this.userDir = mkdtempSync(join(tmpdir(), 'learnviz-browser-'))
    this.child = spawn(this.executable, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--disable-extensions', '--mute-audio', '--disable-background-networking',
      '--remote-debugging-pipe', '--user-data-dir=' + this.userDir, 'about:blank'
    ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
    this.writer = this.child.stdio[3]
    this.reader = this.child.stdio[4]
    this.reader.on('data', (chunk) => this._onData(chunk))
    this.child.on('error', () => {})
    // 等待 DevTools pipe 就绪
    const deadline = Date.now() + 20000
    for (;;) {
      try {
        await this.send('Browser.getVersion', {}, undefined, 3000)
        return
      } catch (e) {
        if (Date.now() > deadline) throw new Error('browser did not open its DevTools pipe: ' + e.message)
        await sleep(250)
      }
    }
  }

  _onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk])
    for (;;) {
      const idx = this.buf.indexOf(0)
      if (idx === -1) break
      const raw = this.buf.slice(0, idx).toString('utf8')
      this.buf = this.buf.slice(idx + 1)
      if (!raw.trim()) continue
      let msg
      try { msg = JSON.parse(raw) } catch { continue }
      this._dispatch(msg)
    }
  }

  _dispatch(msg) {
    if (msg.id != null && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)
      this.pending.delete(msg.id)
      clearTimeout(p.timer)
      if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
      else p.resolve(msg.result)
    } else if (msg.method) {
      const set = this.listeners.get(msg.method)
      if (set) for (const fn of Array.from(set)) fn(msg.params || {}, msg.sessionId)
    }
  }

  send(method, params = {}, sessionId = undefined, timeoutMs = 30000) {
    const id = this.nextId++
    const msg = { id, method, params }
    if (sessionId) msg.sessionId = sessionId
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('CDP timeout: ' + method))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      try {
        this.writer.write(JSON.stringify(msg) + '\0')
      } catch (e) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(e)
      }
    })
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set())
    this.listeners.get(method).add(fn)
  }

  once(method, sessionId, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.get(method).delete(fn)
        reject(new Error('CDP event timeout: ' + method))
      }, timeoutMs || 15000)
      const fn = (params, sid) => {
        if (sessionId && sid !== sessionId) return
        clearTimeout(timer)
        this.listeners.get(method).delete(fn)
        resolve(params)
      }
      this.on(method, fn)
    })
  }

  async attach(url) {
    const t = await this.send('Target.createTarget', { url: url || 'about:blank' })
    this.targetId = t.targetId
    const a = await this.send('Target.attachToTarget', { targetId: this.targetId, flatten: true })
    this.sessionId = a.sessionId
    return this.sessionId
  }

  evaluate(expression, timeoutMs = 30000) {
    return this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, this.sessionId, timeoutMs)
  }

  async close() {
    try { if (this.child) this.child.kill() } catch { /* ignore */ }
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('browser closed')) }
    this.pending.clear()
    await sleep(120)
    try { if (this.userDir) rmSync(this.userDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}
