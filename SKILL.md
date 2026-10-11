---
name: learnviz
description: "Create interactive, self-contained single-file HTML learning visualizations that teach how a specific module works internally: algorithm step-throughs with synced code highlighting, data-structure/storage internals with logical-vs-physical views, and runtime process flows with storyboards and live state tables. Every artifact follows one shell contract (controls, narration, legend, notes, keyboard, deep links), one teaching contract (mental model, step narration, source evidence, fidelity disclosure, design rationale, misconceptions, review pitch), and is machine-verified by four quality gates (spec-check, publish, artifact-check, browser-check) through a single verify command. Use when the user wants to learn or explain a concrete mechanism, algorithm, structure, or process step by step. Not for overall system architecture or topology diagrams, and not for data charts or dashboards."
license: MIT
metadata:
  version: "0.1.0"
  author: yuyihao
---

# LearnViz

Create a single-file HTML learning visualization and verify it with four gates. Output is always one self-contained `.html` file: zero external assets, zero network requests, opens by double-click.

## When to use / not use

Use for *learning one concrete thing internally*: an algorithm's execution, a data structure's memory layout, a runtime process's step-by-step behavior. Do not use for system-wide architecture or topology overviews, data charts, or dashboards.

## Type router

| Type | Use for | Required extras |
|---|---|---|
| `algorithm` | Problem-solving techniques, algorithms, step-through with code | code panel synced to step lines, input/demo entry |
| `structure` | Storage/memory internals of a data structure | logical view + physical view, cost annotations |
| `flow` | Runtime or build-time processes, protocols, lifecycles | storyboard nodes + live state table, provenance of data |

When ambiguous, ask the user which of the three fits; do not guess.

## Fast authoring path

1. Pick the type from the router. Read `references/teaching-contract.md`, `references/shell-contract.md`, and `references/authoring-<type>.md` before writing.
2. If the topic comes from a real codebase or document, gather evidence per `references/evidence.md` and record it in the file's embedded `viz-meta` (`sources` + `fidelity`). Never invent facts; mark simplifications.
3. Scaffold: `node bin/learnviz.mjs new <type> <slug> [dir]`. Fill every slot; keep the default Chinese content language unless the user asks otherwise.
4. Verify: `node bin/learnviz.mjs verify <file.html> --json`. A non-zero exit is never success; read the summary receipt, repair per `references/quality-gates.md`, rerun. Two focused repair rounds per defect class, then report the concrete gap.
5. Deliver: report the absolute path, type, and each gate's status truthfully. Automated browser evidence and perceptual (visual) review are separate claims — never report one as the other. Default `visual_review: not-requested`; only claim a visual pass if you actually inspected captures.

## Quality gates

`verify` runs, in order, and stops at the first failure:

1. **spec-check** — embedded `viz-meta` schema, single-file containment, required slots, per-type structure, runtime markers.
2. **publish** — provenance sidecar binding the artifact's SHA-256 and byte count.
3. **artifact-check** — byte identity re-verified against the sidecar; spec checks re-run on artifact bytes.
4. **browser-check** — real browser (Edge/Chrome/Chromium via DevTools protocol): four viewports, no horizontal overflow, zero console errors, full keyboard walk of every step with narration and stage mutation, boundary/reset behavior, readability floor, per-type interaction probe. If no browser is available the gate reports `skipped` (exit 2); a skip is not a pass.

## Output contract

Report after delivery:

```text
type: algorithm|structure|flow
output: /absolute/path/to/file.html
gates: spec-check=pass|fail, publish=pass|fail, artifact-check=pass|fail, browser-check=pass|fail|skipped
visual_review: not-requested|passed|failed
```

## Setup

No install step; requires Node.js >= 18. Diagnose with `node bin/learnviz.mjs doctor` (checks Node and locates a usable browser). Everything runs offline.
