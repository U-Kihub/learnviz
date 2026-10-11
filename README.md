# LearnViz

Interactive, self-contained single-file HTML **learning visualizations** — for teaching how a specific module works internally, verified by machine gates so every piece meets the same bar.

交互式、自包含的单文件 HTML **学习型可视化** —— 用来拆解一个具体模块的内部机制，并有机器质量门保证每次产出同一水准。

---

## English

### What it is

An agent skill that produces step-by-step explainer pages:

- **algorithm** — execution step-through with code highlighting synced to the current step, plus an input/demo entry.
- **structure** — storage/memory internals with a *logical view* and a *physical view*, cost annotations, capacity bookkeeping.
- **flow** — runtime/build-time processes as a numbered storyboard with live state tables and data provenance.

Every artifact is one `.html` file: no build step, no external assets, no network. Open it by double-clicking.

### Why

Ad-hoc explainer pages drift: different colors, different controls, missing narration, untestable. LearnViz fixes that with:

1. One **shell contract** (layout slots, controls, keyboard, deep links, test hook).
2. One **teaching contract** (mental model first, step narration, source evidence with file:line, fidelity disclosure, design rationale, misconceptions, review pitch).
3. Four **quality gates** that actually run the page in a real browser.

### Install

Copy this folder into your agent's skills directory (e.g. `~/.agents/skills/learnviz/`). Requires Node.js >= 18. No dependencies.

```bash
node bin/learnviz.mjs doctor    # checks Node and finds a usable browser
```

### Usage

```bash
# Scaffold a new visualization
node bin/learnviz.mjs new structure hash-map-internals ./out

# Run all four gates
node bin/learnviz.mjs verify ./out/hash-map-internals.html --json
```

Gates run in order and stop at the first failure:

| Gate | What it checks |
|---|---|
| `spec-check` | embedded metadata schema, single-file containment, required slots, per-type structure |
| `publish` | provenance sidecar (SHA-256 + bytes) |
| `artifact-check` | byte identity vs sidecar, spec re-run on artifact bytes |
| `browser-check` | real browser: 4 viewports, no horizontal overflow, zero console errors, full keyboard walk of every step, boundary/reset, readability floor, per-type probes |

If no browser is found, `browser-check` reports `skipped` (exit 2) — a skip is never reported as a pass.

### Writing content

Read `SKILL.md` for the routing and workflow, then the references:

- `references/teaching-contract.md` — what every learning page must contain
- `references/shell-contract.md` — layout slots, controls, keyboard, test hook
- `references/authoring-{algorithm,structure,flow}.md` — per-type specifics
- `references/evidence.md` — how to cite sources and disclose simplifications
- `references/quality-gates.md` — gate details and repair loop

### License

MIT — see `LICENSE`.

---

## 中文

### 这是什么

一个 agent 技能，用来产出「学习型」分步讲解页面：

- **algorithm**：算法执行步进，代码高亮与当前步骤联动，带输入/演示入口
- **structure**：数据结构/存储内部，逻辑视图 + 物理视图，成本标注、容量账本
- **flow**：运行时/构建期流程，编号故事板 + 实时状态表 + 数据来源去向

产物永远是一个 `.html` 文件：无构建、无外链、无网络，双击即开。

### 为什么

随手写的讲解页质量会漂移：配色不一、控制不一、缺叙事、不可测。LearnViz 用一套**外壳契约**、一套**教学契约**、四道**真实浏览器质量门**把水准钉死。

### 使用

```bash
node bin/learnviz.mjs doctor                                   # 自检（Node + 浏览器探测）
node bin/learnviz.mjs new structure hash-map-internals ./out   # 脚手架
node bin/learnviz.mjs verify ./out/hash-map-internals.html --json   # 四道门一次跑
```

写内容前先读 `SKILL.md` 与 `references/`。可视化页面内容默认中文。

### 许可

MIT，见 `LICENSE`。
