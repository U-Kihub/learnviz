# Shell contract

The shell is the shared frame every LearnViz page lives in. It is what makes pages feel identical to operate. Author content into the slots; do not redesign the shell.

## Single-file containment

One `.html` file. No external URLs of any kind: no `<script src>`, `<link>`, `@import`, images, fonts, or fetches over network. Everything (CSS, runtime, content) is inlined. System font stacks only (CJK-safe: includes "PingFang SC" and "Microsoft YaHei").

## Design tokens

All colors, spacing, radii, and fonts come from the inlined token block (marked `/* learnviz-tokens v1 */`). Content CSS may only use the CSS custom properties it defines (`var(--lv-*)`). Hard-coded color values in content styles are a spec failure. Dark theme is the default and only required theme.

## Layout slots

Slots are marked with `data-lv` attributes. Required slots must exist and be visible:

| Slot | Marker | Content |
|---|---|---|
| header | `data-lv="header"` | page title + `data-lv="mental-model"` one-sentence mental model |
| controls | `data-lv="controls"` | step controls (see below) |
| narration | `data-lv="narration"` | current step's narration, replaced each step |
| stage | `data-lv="stage"` | the main visual; per-type panels live here |
| notes | `data-lv="notes"` | rationale, misconceptions, comparison tables, review pitch |
| legend | `data-lv="legend"` | recommended: color/annotation key |

Per-type extras:

- `algorithm`: `data-lv="code"` (source with line numbers; current line(s) highlighted per step), `data-lv="input"` (input/demo entry that regenerates steps).
- `structure`: two stage panels marked `data-lv-view="logical"` and `data-lv-view="physical"`.
- `flow`: `data-lv="storyboard"` (numbered nodes) and at least one `data-lv="state-table"` (live counters/rows that change with steps).

## Controls

Standard controls, wired by the runtime via `data-lv-action`:

- `prev` / `next` / `play` (toggle) / `reset`
- speed choices: elements with `data-lv-action="speed"` and `data-speed="<ms>"`
- boundary states: prev disabled at first step, next disabled at last

## Interaction contract

- Keyboard: `←` prev, `→` next, `Space` play/pause, `Home` first, `End` last, `R` reset.
- Deep link: `#step=N` in the URL reflects the current step and is honored on load.
- Every step change must visibly mutate the stage (highlight, counter, or layout) — a step that changes nothing is a content bug.

## Test hook

The runtime exposes a deterministic hook for the browser gate:

```js
window.__LEARNVIZ__ = {
  version: 1,
  type: 'algorithm' | 'structure' | 'flow',
  total(), index(), go(i), next(), prev(), reset(),
  narration(),            // current narration text
  demo()                  // algorithm type only: run with built-in default input, returns step count
}
```

`demo()` is mandatory for `algorithm` pages so the gate can drive the page without typing into inputs.

## Accessibility floor

- Body text >= 13px; annotations/captions >= 11px; nothing readable below 10px.
- Controls are real `<button>`s with visible labels.
- Horizontal overflow is a failure at every desktop viewport (1440/1600/1920/2048 wide).
- If a canvas is used, account for devicePixelRatio (no blurry output).
