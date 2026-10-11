// 结构型模块骨架：按 references/authoring-structure.md 与 teaching-contract.md 填充
// 契约：build/手写的 steps 是全部事实来源；render 只读 step.state / step.hl
// 下面是一个最小可过门的示例（迷你哈希表：桶数组 + 条目数组 + 头插法），请整体替换为你的主题

var steps = [
  {
    narration: '<b>场景</b>：一个桶数组 + 一个条目数组。初始容量 3，全部为空。',
    cost: '-',
    state: { buckets: [-1, -1, -1], entries: [], count: 0 },
    hl: {}
  },
  {
    narration: '<b>add("a")</b>：hash("a") % 3 = 桶 0，空桶 → 直接成为链头，entries[0] 记录数据。',
    cost: 'O(1)',
    state: { buckets: [0, -1, -1], entries: [{ k: 'a', next: -1 }], count: 1 },
    hl: { bucket: 0, entry: 0 }
  },
  {
    narration: '<b>add("b")</b>：hash("b") % 3 = 桶 0，<span class="lv-bad">冲突</span>！头插法：新节点 next 指向旧链头 entries[0]，桶改指 entries[1]。',
    cost: 'O(1)',
    state: { buckets: [1, -1, -1], entries: [{ k: 'a', next: -1 }, { k: 'b', next: 0 }], count: 2 },
    hl: { bucket: 0, entry: 1 }
  },
  {
    narration: '<b>小结</b>：桶存「链头下标」，条目按插入顺序连续存放；冲突靠 next 下标串成链。后续可演示扩容 / 删除挂空闲链。',
    cost: '均摊 O(1)',
    state: { buckets: [1, -1, -1], entries: [{ k: 'a', next: -1 }, { k: 'b', next: 0 }], count: 2 },
    hl: {}
  }
]

function render(step) {
  var s = step.state, hl = step.hl || {}
  var logical = document.getElementById('lvLogical')
  var physical = document.getElementById('lvPhysical')

  logical.innerHTML = s.buckets.map(function (head, b) {
    var onB = hl.bucket === b
    var chain = []
    var i = head, guard = 0
    while (i >= 0 && guard++ < 100) { chain.push(i); i = s.entries[i].next }
    var nodes = chain.length === 0
      ? '<span style="color:var(--lv-dim-2);font-style:italic">（空桶）</span>'
      : chain.map(function (ei) {
          var onE = hl.entry === ei
          return '<span class="lv-arrow">→</span><span class="lv-badge ' + (onE ? 'acc' : '') + '">' + s.entries[ei].k + ' <small>next=' + s.entries[ei].next + '</small></span>'
        }).join('') + '<span class="lv-arrow">→ ∅</span>'
    return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
      '<span class="lv-badge ' + (onB ? 'acc' : '') + '">buckets[' + b + '] → ' + head + '</span>' + nodes + '</div>'
  }).join('')

  var rows = s.entries.map(function (e, i) {
    return '<tr class="' + (hl.entry === i ? 'hl' : '') + '"><td class="n">[' + i + ']</td><td>' + e.k + '</td><td class="n">next=' + e.next + '</td></tr>'
  }).join('')
  physical.innerHTML =
    '<p class="lv-mono" style="margin:0 0 8px;color:var(--lv-dim)">buckets = [' + s.buckets.join(', ') + ']　count = ' + s.count + '</p>' +
    '<table class="lv-table"><tr><th>entries 下标</th><th>key</th><th>next</th></tr>' + (rows || '<tr><td colspan="3" style="color:var(--lv-dim-2)">（空）</td></tr>') + '</table>'
}

LearnViz.attach({ type: 'structure', steps: steps, render: render })
