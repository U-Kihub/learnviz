import { pathToFileURL } from 'node:url'
import { baseReceipt } from './receipts.mjs'
import { Browser, findBrowser } from './cdp.mjs'
import { extractMeta } from './gates-spec.mjs'

const VIEWPORTS = [[1440, 900], [1600, 1000], [1920, 1080], [2048, 1320]]
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// 在页面里完整走查一遍并自测，一次求值返回全部测量
const PROBE_JS = `(function(){
  var out = { ok: false, errors: [], warnings: [] }
  try {
    var lv = window.__LEARNVIZ__
    if (!lv) { out.errors.push('missing window.__LEARNVIZ__ hook'); return out }
    out.type = lv.type
    var total = lv.total()
    out.total = total
    if (!(total >= 2)) out.errors.push('total steps < 2 (got ' + total + ')')

    function visible(sel) {
      var el = document.querySelector(sel)
      return !!el && el.offsetWidth > 0 && el.offsetHeight > 0
    }
    out.slots = {
      controls: visible('[data-lv="controls"]'),
      narration: visible('[data-lv="narration"]'),
      stage: visible('[data-lv="stage"]'),
      notes: visible('[data-lv="notes"]')
    }
    for (var k in out.slots) if (!out.slots[k]) out.errors.push('slot not visible: ' + k)

    out.scrollWidth = document.documentElement.scrollWidth
    out.innerWidth = window.innerWidth
    if (out.scrollWidth > out.innerWidth) out.errors.push('horizontal overflow: ' + out.scrollWidth + ' > ' + out.innerWidth)

    var minFont = Infinity
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    var checked = 0
    while (walker.nextNode() && checked < 600) {
      var t = walker.currentNode
      if (!t.textContent.trim()) continue
      var el = t.parentElement
      if (!el) continue
      var cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      if (el.offsetParent === null && cs.position !== 'fixed') continue
      var px = parseFloat(cs.fontSize)
      if (px && px < minFont) minFont = px
      checked++
    }
    out.minFont = isFinite(minFont) ? minFont : null
    if (out.minFont !== null && out.minFont < 10) out.errors.push('text below 10px (min ' + out.minFont + ')')

    var stage = document.querySelector('[data-lv="stage"]')
    function sig() {
      var s = stage ? stage.innerHTML : ''
      var h = 5381
      for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
      return h + ':' + s.length
    }
    var narrations = [], sigs = []
    for (var i = 0; i < total; i++) {
      lv.go(i)
      narrations.push((lv.narration() || '').trim())
      sigs.push(sig())
    }
    out.narrationEmpty = narrations.filter(function (x) { return !x }).length
    if (out.narrationEmpty > 0) out.errors.push(out.narrationEmpty + ' step(s) with empty narration')
    out.narrationDistinct = Array.from(new Set(narrations)).length
    if (out.narrationDistinct < total) out.warnings.push('duplicate narrations: ' + (total - out.narrationDistinct))
    var changes = 0
    for (var j = 1; j < sigs.length; j++) if (sigs[j] !== sigs[j - 1]) changes++
    out.stageChanges = changes
    if (total >= 2 && changes === 0) out.errors.push('stage never mutates across steps')

    lv.go(0)
    var before = lv.index(); lv.prev()
    if (lv.index() !== before) out.errors.push('prev() at first step moved the index')
    lv.go(total - 1)
    before = lv.index(); lv.next()
    if (lv.index() !== before) out.errors.push('next() at last step moved the index')
    lv.reset()
    if (lv.index() !== 0) out.errors.push('reset() did not return to step 0')

    if (lv.type === 'algorithm') {
      if (typeof lv.demo !== 'function') out.errors.push('algorithm page must expose __LEARNVIZ__.demo()')
      else {
        var produced = lv.demo()
        if (!(produced > 0) || lv.total() === 0) out.errors.push('demo() produced no steps')
        lv.reset()
      }
    }
    out.ok = out.errors.length === 0
  } catch (e) {
    out.errors.push('probe exception: ' + (e && e.message ? e.message : String(e)))
  }
  return out
})()`

async function dispatchKey(browser, key, code, vk) {
  await browser.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk }, browser.sessionId)
  await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }, browser.sessionId)
}

export async function runBrowserCheck(artifact, opts = {}) {
  const receipt = baseReceipt('browser-check', artifact)
  receipt.evidenceKind = 'automated-browser'

  const exe = findBrowser(opts.browser)
  if (!exe) {
    receipt.status = 'skipped'
    receipt.ok = false
    receipt.reason = 'no usable browser found (set LEARNVIZ_BROWSER or pass --browser)'
    return { receipt, exitCode: 2 }
  }
  receipt.chrome = { executable: exe }

  const { meta } = extractMeta(artifact.text)
  const url = pathToFileURL(artifact.path).href
  const findings = []
  const fail = (rule, message, subject) => findings.push({ rule, status: 'fail', message, ...(subject ? { subject } : {}) })
  const warn = (rule, message) => findings.push({ rule, status: 'warn', message })

  const browser = new Browser(exe)
  const consoleErrors = []
  const viewports = []
  try {
    await browser.launch()
    await browser.attach('about:blank')
    const s = browser.sessionId
    await browser.send('Page.enable', {}, s)
    await browser.send('Runtime.enable', {}, s)
    browser.on('Runtime.consoleAPICalled', (p, sid) => {
      if (sid !== s || p.type !== 'error') return
      const text = (p.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ')
      consoleErrors.push(text)
    })
    browser.on('Runtime.exceptionThrown', (p, sid) => {
      if (sid !== s) return
      const d = p.exceptionDetails || {}
      consoleErrors.push(d.text + (d.exception && d.exception.description ? ' ' + d.exception.description : ''))
    })

    let navigated = false
    for (const [w, h] of VIEWPORTS) {
      await browser.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, s)
      if (!navigated) {
        const loaded = browser.once('Page.loadEventFired', s, 20000)
        await browser.send('Page.navigate', { url }, s)
        await loaded
        navigated = true
        await sleep(350)
      } else {
        await sleep(200)
      }
      const r = await browser.evaluate(PROBE_JS, 45000)
      const probe = r && r.result ? r.result.value : null
      if (!probe) {
        fail('probe/run', 'in-page probe did not return a value', w + 'x' + h)
        viewports.push({ width: w, height: h, ok: false })
        continue
      }
      if (meta && probe.type && probe.type !== meta.type) {
        fail('probe/type', 'hook type "' + probe.type + '" does not match viz-meta type "' + meta.type + '"', w + 'x' + h)
      }
      for (const e of probe.errors || []) fail('probe', e, w + 'x' + h)
      for (const wa of probe.warnings || []) warn('probe', wa + ' @ ' + w + 'x' + h)
      viewports.push({
        width: w, height: h, ok: (probe.errors || []).length === 0,
        total: probe.total, minFont: probe.minFont,
        stageChanges: probe.stageChanges, narrationDistinct: probe.narrationDistinct,
        scrollWidth: probe.scrollWidth, innerWidth: probe.innerWidth
      })
    }

    // 真实键盘事件（只在第一个视口做）
    await browser.evaluate('window.__LEARNVIZ__ && window.__LEARNVIZ__.go(0)')
    await dispatchKey(browser, 'ArrowRight', 'ArrowRight', 39)
    const r1 = await browser.evaluate('window.__LEARNVIZ__ ? window.__LEARNVIZ__.index() : -1')
    const idxAfterRight = r1 && r1.result ? r1.result.value : -1
    await dispatchKey(browser, 'ArrowLeft', 'ArrowLeft', 37)
    const r2 = await browser.evaluate('window.__LEARNVIZ__ ? window.__LEARNVIZ__.index() : -1')
    const idxAfterLeft = r2 && r2.result ? r2.result.value : -1
    if (idxAfterRight !== 1) fail('keyboard/arrow-right', 'ArrowRight moved index to ' + idxAfterRight + ' (expected 1)')
    if (idxAfterLeft !== 0) fail('keyboard/arrow-left', 'ArrowLeft moved index to ' + idxAfterLeft + ' (expected 0)')
  } catch (e) {
    fail('browser/run', e.message || String(e))
  } finally {
    await browser.close()
  }

  if (consoleErrors.length) {
    const unique = Array.from(new Set(consoleErrors)).slice(0, 10)
    for (const e of unique) fail('console/error', e)
  }

  receipt.viewports = viewports
  receipt.findings = findings
  receipt.summary = findings.reduce((r, f) => { r[f.status] = (r[f.status] || 0) + 1; return r }, {})
  receipt.ok = !findings.some(f => f.status === 'fail')
  receipt.status = receipt.ok ? 'pass' : 'fail'
  return { receipt, exitCode: receipt.ok ? 0 : 1 }
}
