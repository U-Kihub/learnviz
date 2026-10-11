#!/usr/bin/env node
// learnviz CLI — new / spec-check / publish / artifact-check / browser-check / verify / doctor
// Zero dependencies. Node.js >= 18.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { baseReceipt, readArtifact, receiptStem, writeReceipt } from './receipts.mjs'
import { specCheckArtifact } from './gates-spec.mjs'
import { runBrowserCheck } from './gates-browser.mjs'
import { findBrowser } from './cdp.mjs'

const BIN_DIR = dirname(fileURLToPath(import.meta.url))
const ASSETS = join(BIN_DIR, '..', 'assets')

const TYPES = ['algorithm', 'structure', 'flow']

function fail(msg, code = 1) {
  console.error('[learnviz] ' + msg)
  process.exit(code)
}

function parseFlags(argv) {
  const flags = { json: false, force: false, browser: null }
  const pos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') flags.json = true
    else if (a === '--force') flags.force = true
    else if (a === '--browser') flags.browser = argv[++i]
    else if (a.startsWith('--browser=')) flags.browser = a.slice(10)
    else pos.push(a)
  }
  return { flags, pos }
}

function readAsset(...parts) {
  return readFileSync(join(ASSETS, ...parts), 'utf8')
}

function replaceAll(text, marker, value) {
  return text.split(marker).join(value)
}

function cmdNew(pos, flags) {
  const [type, slug, dir] = pos
  if (!TYPES.includes(type)) fail('usage: learnviz new <algorithm|structure|flow> <slug> [dir]')
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) fail('slug must match ^[a-z0-9-]+$')
  const outDir = resolve(dir || '.')
  mkdirSync(outDir, { recursive: true })
  const out = join(outDir, slug + '.html')
  if (existsSync(out) && !flags.force) fail('file exists: ' + out + ' (use --force to overwrite)')

  const template = readAsset('template.html')
  const tokens = readAsset('tokens.css')
  const runtime = readAsset('runtime.js')
  const highlighter = readAsset('highlighter.js')
  const stage = readAsset('starters', type + '.stage.html')
  const starter = readAsset('starters', type + '.module.js')

  const title = slug + ' 可视化'
  const meta = {
    specVersion: 1,
    type,
    title,
    slug,
    mentalModel: '一句话：读者看完应该在脑中建立的画面（必改）',
    language: 'zh-CN',
    fidelity: { level: 'schematic', notes: 'TODO：本页是 exact / simplified / schematic，简化与省略写在这里' },
    sources: [],
    runtimeVersion: 1
  }
  const notes = [
    '<div class="lv-note"><h4>为什么这样设计</h4><p>TODO：设计动机与关键取舍。</p></div>',
    '<div class="lv-note"><h4>常见误区</h4><p>TODO：读者最可能建立的错误画面，以及纠正。</p></div>',
    '<div class="lv-note"><h4>复习话术</h4><p>TODO：30 秒把这件事说清楚的版本。</p></div>',
    '<div class="lv-note"><h4>保真声明</h4><p>TODO：与 viz-meta.fidelity 一致；简化与省略写在这里。</p></div>'
  ].join('\n')

  let html = template
  html = replaceAll(html, '@@LEARNVIZ_TITLE@@', title)
  html = replaceAll(html, '@@LEARNVIZ_TYPE@@', type)
  html = replaceAll(html, '@@LEARNVIZ_MENTAL_MODEL@@', meta.mentalModel)
  html = replaceAll(html, '@@LEARNVIZ_META@@', JSON.stringify(meta, null, 2))
  html = replaceAll(html, '@@LEARNVIZ_STAGE@@', stage)
  html = replaceAll(html, '@@LEARNVIZ_NOTES@@', notes)
  html = html.split('/* @@LEARNVIZ_TOKENS@@ */').join(tokens)
  html = html.split('/* @@LEARNVIZ_CONTENT_CSS@@ */').join('/* content css：只用 var(--lv-*) token，不写死颜色 */')
  html = html.split('/* @@LEARNVIZ_RUNTIME@@ */').join(runtime)
  html = html.split('/* @@LEARNVIZ_HIGHLIGHTER@@ */').join(highlighter)
  html = html.split('/* @@LEARNVIZ_STARTER@@ */').join(starter)

  writeFileSync(out, html, 'utf8')
  console.log('[learnviz] created ' + out)
  console.log('[learnviz] next: fill every TODO, then run: node bin/learnviz.mjs verify "' + out + '" --json')
}

function gateReport(receipt, flags, extra) {
  if (flags.json) {
    console.log(JSON.stringify(receipt))
  } else {
    const fails = (receipt.findings || []).filter(f => f.status === 'fail')
    const warns = (receipt.findings || []).filter(f => f.status === 'warn')
    console.log('[learnviz] ' + receipt.command + ': ' + (receipt.ok ? 'PASS' : receipt.status === 'skipped' ? 'SKIPPED' : 'FAIL') +
      (receipt.summary ? ' (' + JSON.stringify(receipt.summary) + ')' : ''))
    for (const f of fails) console.error('  FAIL ' + f.rule + (f.subject ? ' [' + f.subject + ']' : '') + ': ' + f.message)
    for (const w of warns) console.error('  warn ' + w.rule + ': ' + w.message)
    if (extra) console.log(extra)
  }
}

async function cmdVerify(file, flags) {
  const t0 = Date.now()
  let artifact
  try { artifact = readArtifact(file) } catch (e) { fail('cannot read ' + file + ': ' + e.message) }
  const stem = receiptStem(file)
  const gates = {}
  const summary = baseReceipt('verify', artifact)
  summary.gates = gates
  summary.visualReview = 'not-requested'

  function finish(ok, status, code) {
    summary.ok = ok
    summary.status = status
    summary.durationMs = Date.now() - t0
    writeReceipt(stem + '.lv-verify.json', summary)
    if (flags.json) console.log(JSON.stringify(summary))
    else {
      console.log('[learnviz] verify: ' + status.toUpperCase() + ' — ' + JSON.stringify(gates))
      console.log('[learnviz] summary receipt: ' + stem + '.lv-verify.json')
    }
    process.exit(code)
  }

  // Gate 1: spec-check
  const spec = specCheckArtifact(artifact)
  writeReceipt(stem + '.lv-spec.json', spec)
  gates['spec-check'] = spec.ok ? 'pass' : 'fail'
  if (!flags.json) gateReport(spec, { json: false })
  if (!spec.ok) finish(false, 'fail', 1)

  // Gate 2: publish
  const pub = baseReceipt('publish', artifact)
  pub.status = 'current'
  pub.ok = true
  writeReceipt(stem + '.lv-publish.json', pub)
  gates.publish = 'pass'
  if (!flags.json) console.log('[learnviz] publish: PASS (sha256 ' + artifact.sha256.slice(0, 12) + '…)')

  // Gate 3: artifact-check
  const re = readArtifact(file)
  const ac = baseReceipt('artifact-check', re)
  const boundOk = re.sha256 === artifact.sha256 && re.bytes === artifact.bytes
  const reSpec = specCheckArtifact(re)
  ac.findings = reSpec.findings
  ac.ok = boundOk && reSpec.ok
  ac.provenanceBinding = boundOk ? 'match' : 'mismatch'
  writeReceipt(stem + '.lv-artifact.json', ac)
  gates['artifact-check'] = ac.ok ? 'pass' : 'fail'
  if (!flags.json) console.log('[learnviz] artifact-check: ' + (ac.ok ? 'PASS' : 'FAIL'))
  if (!ac.ok) finish(false, 'fail', 1)

  // Gate 4: browser-check
  const { receipt: br, exitCode } = await runBrowserCheck(re, flags)
  writeReceipt(stem + '.lv-browser.json', br)
  gates['browser-check'] = br.status
  if (!flags.json) gateReport(br, { json: false })
  if (br.status === 'skipped') finish(false, 'skipped', 2)
  if (!br.ok) finish(false, 'fail', 1)

  finish(true, 'pass', 0)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  const { flags, pos } = parseFlags(rest)

  switch (cmd) {
    case 'doctor': {
      const major = parseInt(process.versions.node.split('.')[0], 10)
      console.log('[learnviz] node ' + process.versions.node + (major >= 18 ? ' (ok)' : ' (FAIL: need >= 18)'))
      const exe = findBrowser(flags.browser)
      console.log('[learnviz] browser: ' + (exe || 'NOT FOUND — set LEARNVIZ_BROWSER or pass --browser'))
      process.exit(major >= 18 ? 0 : 1)
      break
    }
    case 'new':
      cmdNew(pos, flags)
      break
    case 'spec-check': {
      const artifact = readArtifact(pos[0])
      const receipt = specCheckArtifact(artifact)
      writeReceipt(receiptStem(pos[0]) + '.lv-spec.json', receipt)
      gateReport(receipt, flags)
      process.exit(receipt.ok ? 0 : 1)
      break
    }
    case 'publish': {
      const artifact = readArtifact(pos[0])
      const pub = baseReceipt('publish', artifact)
      pub.status = 'current'
      pub.ok = true
      writeReceipt(receiptStem(pos[0]) + '.lv-publish.json', pub)
      gateReport(pub, flags, '[learnviz] sidecar: ' + receiptStem(pos[0]) + '.lv-publish.json')
      process.exit(0)
      break
    }
    case 'artifact-check': {
      const artifact = readArtifact(pos[0])
      const stem = receiptStem(pos[0])
      const ac = baseReceipt('artifact-check', artifact)
      let boundOk = false
      try {
        const pub = JSON.parse(readFileSync(stem + '.lv-publish.json', 'utf8'))
        boundOk = pub.artifact && pub.artifact.sha256 === artifact.sha256 && pub.artifact.bytes === artifact.bytes
      } catch { boundOk = false }
      const reSpec = specCheckArtifact(artifact)
      ac.findings = reSpec.findings
      ac.ok = boundOk && reSpec.ok
      ac.provenanceBinding = boundOk ? 'match' : 'mismatch'
      writeReceipt(stem + '.lv-artifact.json', ac)
      gateReport(ac, flags)
      process.exit(ac.ok ? 0 : 1)
      break
    }
    case 'browser-check': {
      const artifact = readArtifact(pos[0])
      const { receipt, exitCode } = await runBrowserCheck(artifact, flags)
      writeReceipt(receiptStem(pos[0]) + '.lv-browser.json', receipt)
      gateReport(receipt, flags)
      process.exit(exitCode)
      break
    }
    case 'verify':
      await cmdVerify(pos[0], flags)
      break
    default:
      console.log(`learnviz — learning-visualization authoring & gates

usage:
  node bin/learnviz.mjs doctor
  node bin/learnviz.mjs new <algorithm|structure|flow> <slug> [dir] [--force]
  node bin/learnviz.mjs spec-check <file.html> [--json]
  node bin/learnviz.mjs publish <file.html> [--json]
  node bin/learnviz.mjs artifact-check <file.html> [--json]
  node bin/learnviz.mjs browser-check <file.html> [--json] [--browser <path>]
  node bin/learnviz.mjs verify <file.html> [--json] [--browser <path>]`)
      process.exit(cmd ? 1 : 0)
  }
}

main().catch(e => { console.error('[learnviz] ' + (e && e.message ? e.message : String(e))); process.exit(1) })
