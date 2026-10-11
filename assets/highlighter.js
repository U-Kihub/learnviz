/* learnviz-highlighter v1 */
(function () {
  'use strict'

  var KW = {}
  var KWS = ('auto break case catch class const constexpr continue default delete do else enum explicit export extern false final finally fn for friend func function goto if impl import in interface let local loop match module mut namespace new nil none noexcept null nullptr operator override pass private protected pub public readonly ref register require return self short signed sizeof static struct switch template then this throw true try type typedef typename union unsigned using var virtual void volatile where while yield async await').split(' ')
  for (var i = 0; i < KWS.length; i++) KW[KWS[i]] = 1

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function span(cls, text) { return '<i class="lv-tk-' + cls + '">' + text + '</i>' }

  function isIdentStart(c) { return /[A-Za-z_]/.test(c) }
  function isIdent(c) { return /[A-Za-z0-9_]/.test(c) }
  function isDigit(c) { return /[0-9]/.test(c) }

  // 逐行着色；st.block 跟踪跨行块注释
  function tokenizeLine(line, st, lang) {
    var out = '', i = 0, n = line.length
    var lineComment = lang === 'lua' ? '--' : '//'
    var blockOpen = lang === 'lua' ? '--[[' : '/*'
    var blockClose = lang === 'lua' ? ']]' : '*/'
    while (i < n) {
      if (st.block) {
        var end = line.indexOf(blockClose, i)
        if (end === -1) { out += span('com', esc(line.slice(i))); return out }
        out += span('com', esc(line.slice(i, end + blockClose.length)))
        i = end + blockClose.length
        st.block = false
        continue
      }
      if (line.startsWith(blockOpen, i)) { st.block = true; continue }
      if (line.startsWith(lineComment, i)) { out += span('com', esc(line.slice(i))); break }
      var ch = line[i]
      if (ch === '#' && (lang === 'cpp' || lang === 'c') && /^\s*#/.test(line)) {
        out += span('pre', esc(line.slice(i))); break
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        var j = i + 1
        while (j < n) { if (line[j] === '\\') { j += 2; continue } if (line[j] === ch) { j++; break } j++ }
        out += span('str', esc(line.slice(i, j)))
        i = j
        continue
      }
      if (isDigit(ch)) {
        var k = i
        while (k < n && /[0-9a-fA-FxXoObB._eE+-]/.test(line[k]) && k - i < 24) k++
        out += span('num', esc(line.slice(i, k)))
        i = k
        continue
      }
      if (isIdentStart(ch)) {
        var m = i
        while (m < n && isIdent(line[m])) m++
        var word = line.slice(i, m)
        out += KW[word.toLowerCase()] || KW[word] ? span('kw', esc(word)) : esc(word)
        i = m
        continue
      }
      out += esc(ch)
      i++
    }
    return out
  }

  function render(source, lang) {
    var st = { block: false }
    return source.split('\n').map(function (line) { return tokenizeLine(line, st, lang || 'cpp') })
  }

  // 构建带行号的代码面板；返回容器元素
  function buildPanel(el, source, lang) {
    var lines = render(source, lang)
    el.classList.add('lv-code')
    el.innerHTML = lines.map(function (html, idx) {
      return '<div class="lv-code-line" data-line="' + (idx + 1) + '"><span class="lv-ln">' + (idx + 1) + '</span><span class="lv-lc">' + (html || ' ') + '</span></div>'
    }).join('')
    return el
  }

  // 高亮指定行（1 起）；lines 为数组
  function highlight(el, lines) {
    var want = {}
    ;(lines || []).forEach(function (n) { want[n] = 1 })
    Array.prototype.forEach.call(el.querySelectorAll('.lv-code-line'), function (row) {
      row.classList.toggle('lv-on', !!want[+row.getAttribute('data-line')])
    })
  }

  window.LearnVizCode = { render: render, buildPanel: buildPanel, highlight: highlight }
})()
