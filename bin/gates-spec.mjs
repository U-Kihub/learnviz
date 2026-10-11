import { baseReceipt } from './receipts.mjs'

const TYPES = ['algorithm', 'structure', 'flow']
const FIDELITY = ['exact', 'simplified', 'schematic']

const EXTERNAL_PATTERNS = [
  { re: /<script[^>]*\bsrc\s*=/i, id: 'script-src' },
  { re: /<link\b/i, id: 'link-tag' },
  { re: /@import\b/i, id: 'css-import' },
  { re: /url\(\s*['"]?\s*(?:https?:)?\/\//i, id: 'css-url' },
  { re: /\b(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i, id: 'remote-attr' },
  { re: /\bfetch\s*\(/, id: 'fetch' },
  { re: /\bXMLHttpRequest\b/, id: 'xhr' },
  { re: /\bnew\s+WebSocket\b/, id: 'websocket' },
  { re: /\bimport\s*\(/, id: 'dynamic-import' }
]

export function extractMeta(text) {
  const m = /<script\s+id="viz-meta"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i.exec(text)
  if (!m) return { error: 'missing <script id="viz-meta" type="application/json">' }
  try {
    return { meta: JSON.parse(m[1]) }
  } catch (e) {
    return { error: 'viz-meta is not valid JSON: ' + e.message }
  }
}

export function runSpecChecks(text) {
  const findings = []
  const fail = (rule, message, subject) => findings.push({ rule, status: 'fail', message, ...(subject ? { subject } : {}) })
  const warn = (rule, message, subject) => findings.push({ rule, status: 'warn', message, ...(subject ? { subject } : {}) })
  const pass = (rule, message) => findings.push({ rule, status: 'pass', message })

  // 1. 单文件自包含
  let external = 0
  for (const p of EXTERNAL_PATTERNS) {
    if (p.re.test(text)) { external++; fail('containment/' + p.id, 'external reference is not allowed: ' + p.id) }
  }
  if (!external) pass('containment', 'single-file, no external references')

  // 2. viz-meta
  const { meta, error } = extractMeta(text)
  if (error) {
    fail('meta/parse', error)
  } else {
    if (meta.specVersion !== 1) fail('meta/specVersion', 'specVersion must be 1', 'specVersion')
    if (!TYPES.includes(meta.type)) fail('meta/type', 'type must be one of ' + TYPES.join('|'), 'type')
    if (typeof meta.title !== 'string' || !meta.title.trim()) fail('meta/title', 'title must be a non-empty string', 'title')
    if (typeof meta.slug !== 'string' || !/^[a-z0-9-]+$/.test(meta.slug)) fail('meta/slug', 'slug must match ^[a-z0-9-]+$', 'slug')
    if (typeof meta.mentalModel !== 'string' || !meta.mentalModel.trim()) fail('meta/mentalModel', 'mentalModel must be a non-empty string', 'mentalModel')
    if (!meta.fidelity || !FIDELITY.includes(meta.fidelity.level)) fail('meta/fidelity', 'fidelity.level must be one of ' + FIDELITY.join('|'), 'fidelity')
    if (meta.sources !== undefined) {
      if (!Array.isArray(meta.sources)) fail('meta/sources', 'sources must be an array', 'sources')
      else meta.sources.forEach((s, i) => {
        if (!s || typeof s.path !== 'string' || !s.path) fail('meta/sources', 'source #' + i + ' needs a non-empty path', 'sources[' + i + ']')
      })
    }
    if (!findings.some(f => f.rule.startsWith('meta/') && f.status === 'fail')) pass('meta', 'viz-meta schema valid (type=' + meta.type + ')')
  }

  // 3. 外壳槽位
  const need = ['header', 'mental-model', 'controls', 'narration', 'stage', 'notes']
  for (const slot of need) {
    if (text.includes('data-lv="' + slot + '"')) pass('slot/' + slot, 'slot present')
    else fail('slot/' + slot, 'missing required slot data-lv="' + slot + '"', 'data-lv="' + slot + '"')
  }
  if (!text.includes('data-lv="legend"')) warn('slot/legend', 'legend slot recommended', 'data-lv="legend"')

  // 4. 类型结构
  if (meta && meta.type === 'algorithm') {
    for (const slot of ['code', 'input']) {
      if (text.includes('data-lv="' + slot + '"')) pass('type/' + slot, 'algorithm slot present')
      else fail('type/' + slot, 'algorithm page needs data-lv="' + slot + '"', 'data-lv="' + slot + '"')
    }
  } else if (meta && meta.type === 'structure') {
    for (const v of ['logical', 'physical']) {
      if (text.includes('data-lv-view="' + v + '"')) pass('type/' + v, 'structure view present')
      else fail('type/' + v, 'structure page needs data-lv-view="' + v + '"', 'data-lv-view="' + v + '"')
    }
  } else if (meta && meta.type === 'flow') {
    for (const slot of ['storyboard', 'state-table']) {
      if (text.includes('data-lv="' + slot + '"')) pass('type/' + slot, 'flow slot present')
      else fail('type/' + slot, 'flow page needs data-lv="' + slot + '"', 'data-lv="' + slot + '"')
    }
  }

  // 5. 运行时标记
  if (text.includes('learnviz-tokens v1')) pass('runtime/tokens', 'design tokens inlined')
  else fail('runtime/tokens', 'missing learnviz-tokens v1 marker (use the official template)')
  if (text.includes('window.__LEARNVIZ__')) pass('runtime/hook', 'test hook present')
  else fail('runtime/hook', 'missing window.__LEARNVIZ__ hook (use the official template)')
  if (text.includes('data-lv-runtime')) pass('runtime/attr', 'runtime attribute present')
  else fail('runtime/attr', 'missing data-lv-runtime attribute')

  return { findings, meta: meta || null }
}

export function specCheckArtifact(artifact) {
  const { findings, meta } = runSpecChecks(artifact.text)
  const receipt = baseReceipt('spec-check', artifact)
  receipt.findings = findings
  receipt.ok = !findings.some(f => f.status === 'fail')
  receipt.summary = findings.reduce((r, f) => { r[f.status] = (r[f.status] || 0) + 1; return r }, {})
  receipt.meta = meta ? { type: meta.type, slug: meta.slug, title: meta.title } : null
  return receipt
}
