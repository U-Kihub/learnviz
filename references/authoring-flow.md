# Authoring: flow

A runtime or build-time process as a numbered storyboard with live state.

## Required anatomy

- `data-lv="storyboard"` — numbered nodes (phases/calls/decisions). Each step activates exactly the node(s) being executed and dims the rest. Splits (parallel branches, error paths) are visible as layout, not only narration.
- `data-lv="state-table"` — at least one table whose values change with steps: reference counts, queue contents, cache entries, lock holders. This is what makes a flow *verifiable* instead of a slideshow.

## Step model

```js
{ narration: '…', on: ['n-cache'], tables: { refs: [0, 1, 1, 1] }, note: '未命中' }
```

- `on`: storyboard node ids active this step.
- `tables`: named payloads the state tables render from. Snapshots, not live references.
- `note`: optional short answer displayed inside a node (e.g. a decision result).

## Content rules

- Establish phases first: if the process spans build-time vs run-time (or client vs server), a compact pre-section shows how the inputs were produced before the stepper starts.
- Include provenance: which file/table/actor each datum comes from and who reads it. A table that is written but never read is a finding — show it as such.
- Cover at least one non-happy path explicitly: a cache hit short-circuit, a failure, a retry, an unload. Either as steps or as a visible branch with narration.
- End with a summary step that recites the whole chain in one breath.

## Pitfalls

- A storyboard where every step lights the whole diagram (nothing is distinguishable).
- State tables that never change, or change without narration noticing.
- A flow with no decision points — then it is a list, and should be shorter.
