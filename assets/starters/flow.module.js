// 流程型模块骨架：按 references/authoring-flow.md 与 teaching-contract.md 填充
// 契约：steps 带 on（故事板节点）与 tables（状态表快照）；render 只读 step
// 下面是最小可过门示例（三节点请求流程），请整体替换为你的主题

var NODES = ['n-req', 'n-handle', 'n-resp']

var steps = [
  {
    narration: '<b>场景</b>：客户端要发起一次请求，初始没有任何状态。',
    on: [], tables: { rows: [['请求', '未开始', 0], ['连接', '未建立', 0]] }
  },
  {
    narration: '<b>第 1 步</b>：客户端发起请求，连接建立，计数 +1。',
    on: ['n-req'], tables: { rows: [['请求', '进行中', 1], ['连接', '已建立', 1]] }
  },
  {
    narration: '<b>第 2 步</b>：服务端处理，状态表同步更新。',
    on: ['n-handle'], tables: { rows: [['请求', '处理中', 1], ['连接', '已建立', 1]] }
  },
  {
    narration: '<b>第 3 步</b>：返回结果，请求完成，连接释放，计数归零。',
    on: ['n-resp'], tables: { rows: [['请求', '已完成', 1], ['连接', '已释放', 0]] }
  },
  {
    narration: '<b>小结</b>：一句话复述整条链——请求 → 处理 → 返回，状态先建后释。',
    on: ['n-req', 'n-handle', 'n-resp'], tables: { rows: [['请求', '已完成', 1], ['连接', '已释放', 0]] }
  }
]

function render(step) {
  var on = {}
  ;(step.on || []).forEach(function (id) { on[id] = 1 })
  NODES.forEach(function (id) {
    var el = document.getElementById(id)
    if (!el) return
    el.classList.toggle('on', !!on[id])
    el.classList.toggle('dim', (step.on || []).length > 0 && !on[id])
  })
  var tbody = document.getElementById('lvState')
  tbody.innerHTML = (step.tables && step.tables.rows || []).map(function (r) {
    return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td class="n">' + r[2] + '</td></tr>'
  }).join('')
}

LearnViz.attach({ type: 'flow', steps: steps, render: render })
