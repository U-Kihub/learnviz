# Quality gates and repair loop

Four gates, run by `node bin/learnviz.mjs verify <file.html> [--json]` in this order. The first failing gate stops the run. A non-zero exit is never success.

## Gate 1: spec-check (static)

Reads the file and checks:

- **Containment**: single file; no external URLs (`<script src>`, `<link>`, `@import`, remote images, `fetch`/XHR to network).
- **Metadata**: `<script id="viz-meta" type="application/json">` parses against the embedded schema: `specVersion: 1`, `type ∈ {algorithm, structure, flow}`, non-empty `title`, `slug` (`^[a-z0-9-]+$`), non-empty `mentalModel`, `fidelity.level ∈ {exact, simplified, schematic}`.
- **Shell slots**: `header` (+`title`, `mental-model`), `controls`, `narration`, `stage`, `notes` present; `legend` recommended (warn).
- **Type structure**: algorithm → `code` + `input` slots; structure → `data-lv-view="logical"` and `="physical"`; flow → `storyboard` + `state-table`.
- **Runtime markers**: token block marker, `window.__LEARNVIZ__` hook, `data-lv-runtime` attribute.

Receipt: `<stem>.lv-spec.json`.

## Gate 2: publish (provenance)

Writes `<stem>.lv-publish.json`: artifact absolute path, SHA-256, byte count, UTC timestamp, receipt id. No transformation; this binds later checks to exact bytes.

## Gate 3: artifact-check (integrity)

Re-reads the artifact, re-hashes, compares to the publish sidecar; re-runs the full spec-check against artifact bytes. Receipt: `<stem>.lv-artifact.json`.

## Gate 4: browser-check (real browser)

Launches Edge/Chrome/Chromium headless via the DevTools protocol (override with `--browser <path>` or `LEARNVIZ_BROWSER`). For each viewport 1440×900, 1600×1000, 1920×1080, 2048×1320:

- No horizontal overflow (`scrollWidth <= innerWidth`).
- Zero console errors and zero uncaught exceptions.
- Hook present; `__LEARNVIZ__.type` matches `viz-meta.type`; `total() >= 2`.
- **Full step walk**: every step has non-empty narration; narrations differ step to step; the stage DOM mutates across the walk.
- Boundaries: `prev()` at 0 and `next()` at last are no-ops; `reset()` returns to 0.
- Keyboard: a real `ArrowRight`/`ArrowLeft` dispatch moves the index.
- Readability floor: no visible text below 10px.
- Slot visibility: controls, narration, stage, notes render with non-zero size.
- Type probe: `algorithm` → `__LEARNVIZ__.demo()` exists and yields `total() > 0`.

Receipt: `<stem>.lv-browser.json`. Exit codes: 0 pass, 1 fail, 2 skipped (no browser). A skip is reported as `skipped`, never as pass.

## verify summary

Compact JSON on stdout plus `<stem>.lv-verify.json`:

```json
{ "ok": true, "gates": { "spec-check": "pass", "publish": "pass", "artifact-check": "pass", "browser-check": "pass" }, "artifact": { "path": "...", "sha256": "...", "bytes": 0 }, "visualReview": "not-requested" }
```

## Repair loop

1. Read the failing gate's receipt; each finding has `rule`, `subject`, and a concrete message.
2. Fix the named subject; do not redesign around a failing check.
3. Rerun the full `verify`. Receipts bind bytes, so any edit invalidates prior passes.
4. Two focused repair rounds per defect class; if still failing, report the concrete gap instead of looping.

## Honesty rules

- Never report a gate as passed without a passing receipt.
- Browser evidence and perceptual review are different claims; the default is `visual_review: not-requested`.
- Never claim visual inspection you did not perform.
