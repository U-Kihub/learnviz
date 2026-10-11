// 算法型模块骨架：按 references/authoring-algorithm.md 与 teaching-contract.md 填充
// 契约：build(input) 产出 steps[]（含 narration / line / state），render 只读 step
// 下面是最小可过门示例（二分查找），请整体替换为你的题目

var SOURCE = [
  'int binarySearch(vector<int>& a, int target) {',
  '    int lo = 0, hi = (int)a.size() - 1;',
  '    while (lo <= hi) {',
  '        int mid = lo + (hi - lo) / 2;',
  '        if (a[mid] == target) return mid;',
  '        if (a[mid] < target) lo = mid + 1;',
  '        else hi = mid - 1;',
  '    }',
  '    return -1;',
  '}'
].join('\n')

function build(input) {
  var a = input.array, target = input.target
  var steps = [{
    narration: '<b>场景</b>：在有序数组 [' + a.join(', ') + '] 里找 ' + target + '。初始 lo=0，hi=' + (a.length - 1) + '。',
    line: 2, state: { a: a, lo: 0, hi: a.length - 1, mid: -1, found: -1 }
  }]
  var lo = 0, hi = a.length - 1
  while (lo <= hi) {
    var mid = lo + ((hi - lo) >> 1)
    steps.push({
      narration: '区间 [' + lo + ', ' + hi + '] 非空 → mid = ' + mid + '，比较 a[' + mid + ']=' + a[mid] + ' 与 ' + target + '。',
      line: 4, state: { a: a, lo: lo, hi: hi, mid: mid, found: -1 }
    })
    if (a[mid] === target) {
      steps.push({
        narration: '<b>a[' + mid + '] == ' + target + '，命中！</b>返回答案 ' + mid + '。',
        line: 5, state: { a: a, lo: lo, hi: hi, mid: mid, found: mid }
      })
      return steps
    }
    if (a[mid] < target) {
      steps.push({ narration: 'a[' + mid + ']=' + a[mid] + ' &lt; ' + target + ' → 答案只可能在右半，lo = ' + (mid + 1) + '。', line: 6, state: { a: a, lo: mid + 1, hi: hi, mid: mid, found: -1 } })
      lo = mid + 1
    } else {
      steps.push({ narration: 'a[' + mid + ']=' + a[mid] + ' &gt; ' + target + ' → 答案只可能在左半，hi = ' + (mid - 1) + '。', line: 7, state: { a: a, lo: lo, hi: mid - 1, mid: mid, found: -1 } })
      hi = mid - 1
    }
  }
  steps.push({ narration: '<b>区间空了（lo &gt; hi）也没找到</b> → 返回 -1，目标不存在。', line: 9, state: { a: a, lo: lo, hi: hi, mid: -1, found: -1 } })
  return steps
}

function parseInput() {
  var arr = document.getElementById('lvInputArray').value.split(',').map(function (s) { return parseInt(s.trim(), 10) }).filter(function (n) { return !isNaN(n) }).sort(function (x, y) { return x - y })
  var target = parseInt(document.getElementById('lvInputTarget').value.trim(), 10)
  if (arr.length === 0 || isNaN(target)) return null
  return { array: arr, target: target }
}

function render(step) {
  LearnVizCode.highlight(document.getElementById('lvCode'), step.lines || [step.line])
  var s = step.state
  document.getElementById('lvMain').innerHTML = s.a.map(function (v, i) {
    var cls = 'lv-badge'
    if (i === s.found) cls += ' ok'
    else if (i === s.mid) cls += ' warn'
    else if (i >= s.lo && i <= s.hi) cls += ' acc'
    return '<span class="' + cls + '" style="font-size:13px;padding:6px 10px">' + v + '<small style="display:block;color:var(--lv-dim-2)">' + i + '</small></span>'
  }).join(' ')
}

var api = LearnViz.attach({
  type: 'algorithm',
  render: render,
  demo: function (api) {
    document.getElementById('lvInputArray').value = '1,3,5,7,9'
    document.getElementById('lvInputTarget').value = '7'
    var steps = build({ array: [1, 3, 5, 7, 9], target: 7 })
    api.setSteps(steps)
    return steps.length
  }
})

document.getElementById('lvCode') && LearnVizCode.buildPanel(document.getElementById('lvCode'), SOURCE, 'cpp')
document.getElementById('lvRun').addEventListener('click', function () {
  var input = parseInput()
  if (input) api.setSteps(build(input))
})
document.getElementById('lvDemo').addEventListener('click', function () { window.__LEARNVIZ__.demo() })
window.__LEARNVIZ__.demo()
