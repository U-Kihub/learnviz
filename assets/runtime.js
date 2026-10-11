/* learnviz-runtime v1 */
(function () {
  'use strict'

  var VERSION = 1

  function $(sel, root) { return (root || document).querySelector(sel) }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)) }

  function attach(module, opts) {
    opts = opts || {}
    var els = {
      narration: $('[data-lv="narration"]'),
      stepLabel: $('[data-lv="step-label"]'),
      stage: $('[data-lv="stage"]'),
      controls: $('[data-lv="controls"]')
    }
    var state = {
      steps: [],
      index: 0,
      playing: false,
      speed: opts.speed || 700,
      timer: null
    }

    function total() { return state.steps.length }
    function current() { return state.steps[state.index] || null }

    function updatePlayLabel() {
      $all('[data-lv-action="play"]').forEach(function (b) { b.textContent = state.playing ? '暂停' : '播放' })
    }

    function stopTimer() {
      if (state.timer) { clearTimeout(state.timer); state.timer = null }
      state.playing = false
      updatePlayLabel()
    }

    function updateButtons() {
      $all('[data-lv-action="prev"]').forEach(function (b) { b.disabled = state.index <= 0 })
      $all('[data-lv-action="next"]').forEach(function (b) { b.disabled = state.index >= total() - 1 })
      if (els.stepLabel) els.stepLabel.textContent = (total() === 0 ? 0 : state.index + 1) + ' / ' + total()
    }

    function syncHash() {
      try { history.replaceState(null, '', '#step=' + state.index) } catch (e) { /* file:// 下静默 */ }
    }

    function render() {
      var step = current()
      if (els.narration) els.narration.innerHTML = step && step.narration ? step.narration : ''
      updateButtons()
      syncHash()
      if (module.render && step) module.render(step, state.index, els)
      try { document.dispatchEvent(new CustomEvent('lv:step', { detail: { index: state.index, step: step } })) } catch (e) {}
    }

    function go(i) {
      var t = total()
      if (t === 0) return
      var n = Math.max(0, Math.min(t - 1, i | 0))
      state.index = n
      render()
    }

    function next() {
      stopTimer()
      if (state.index < total() - 1) go(state.index + 1)
    }

    function prev() {
      stopTimer()
      go(state.index - 1)
    }

    function reset() {
      stopTimer()
      go(0)
    }

    function play() {
      if (state.playing) { stopTimer(); return }
      if (total() === 0) return
      state.playing = true
      updatePlayLabel()
      var tick = function () {
        if (!state.playing) return
        if (state.index >= total() - 1) { stopTimer(); return }
        go(state.index + 1)
        state.timer = setTimeout(tick, state.speed)
      }
      state.timer = setTimeout(tick, state.speed)
    }

    function setSpeed(ms) {
      state.speed = ms
      $all('[data-lv-action="speed"]').forEach(function (b) {
        b.classList.toggle('active', +b.getAttribute('data-speed') === ms)
      })
    }

    var api = {
      setSteps: function (steps) { stopTimer(); state.steps = steps || []; state.index = 0; render() },
      getSteps: function () { return state.steps },
      getIndex: function () { return state.index },
      go: go, next: next, prev: prev, reset: reset, play: play, pause: stopTimer,
      setSpeed: setSpeed,
      els: els
    }

    $all('[data-lv-action]').forEach(function (btn) {
      var act = btn.getAttribute('data-lv-action')
      if (act === 'speed') {
        btn.addEventListener('click', function () { setSpeed(+btn.getAttribute('data-speed')) })
      } else if (act === 'prev') { btn.addEventListener('click', prev) }
      else if (act === 'next') { btn.addEventListener('click', next) }
      else if (act === 'play') { btn.addEventListener('click', play) }
      else if (act === 'reset') { btn.addEventListener('click', reset) }
    })

    document.addEventListener('keydown', function (e) {
      var t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      else if (e.key === ' ') { e.preventDefault(); play() }
      else if (e.key === 'Home') { e.preventDefault(); go(0) }
      else if (e.key === 'End') { e.preventDefault(); go(total() - 1) }
      else if (e.key === 'r' || e.key === 'R') { reset() }
    })

    window.__LEARNVIZ__ = {
      version: VERSION,
      type: module.type || null,
      total: total,
      index: function () { return state.index },
      go: go, next: next, prev: prev, reset: reset,
      play: play, pause: stopTimer,
      setSpeed: setSpeed,
      narration: function () { return els.narration ? els.narration.textContent : '' },
      demo: typeof module.demo === 'function' ? function () { return module.demo(api) } : undefined
    }

    if (typeof module.setup === 'function') module.setup(els, api)
    if (module.steps) api.setSteps(module.steps)

    var m = /#step=(\d+)/.exec(location.hash || '')
    if (m && total() > 0) go(parseInt(m[1], 10))
    else render()

    return api
  }

  window.LearnViz = { attach: attach, version: VERSION }
})()
