# Authoring: algorithm

Step-through of an algorithm with code synced to the current step.

## Required anatomy

- `data-lv="input"` slot: a way to run with concrete input. Minimum: a built-in default executed by `__LEARNVIZ__.demo()`. Manual inputs and a seeded random generator are recommended.
- `data-lv="code"` slot: the source (C++/Lua/TS/C#…), one row per line, with the current line(s) highlighted per step.
- Stage: the data being transformed (arrays, pointers, trees, graphs), redrawn from step state.

## Step model

```js
{ narration: '<b>① 收缩区间</b>：mid=5, a[5]=7 &lt; 9 → 去右半', line: 6, lines: [6, 7], state: { lo, hi, mid, found } }
```

- `narration` (required): what happens now and why. Cause → effect.
- `line` / `lines` (required): 1-based line number(s) in the code panel. The mapping is a manual contract — if you edit the source text, re-check every step's line numbers.
- `state` (required): everything the stage needs to render. `render(step, index)` reads only `step.state` (plus narration) — never hidden globals.

## Content rules

- Logic (step generation) and view (render) are separate: `build(input)` returns `steps[]`; `render` only paints.
- Use a seeded RNG for "random" input so results are reproducible.
- Intermediate micro-steps may exist, but each must still carry narration; if it is truly transitional, say so in the narration.
- Notes must cover: complexity (time/space) with the reason, boundary cases (empty input, single element, not-found), and one common misconception.

## Pitfalls

- Line numbers drifting from source after edits (the classic bug).
- Steps that mutate `state` in place — snapshots must be self-contained; the player can revisit any step.
- Highlighting the wrong line "because it looks better". The highlight is the contract.
