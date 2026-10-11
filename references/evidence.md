# Evidence and fidelity

Learning pages are only worth making if they are *true*. This reference defines how truth is recorded.

## Sources

When the topic is a real codebase or document, record what the page is grounded in, inside the embedded `viz-meta`:

```json
"sources": [
  { "path": "src/framework/script/Bindings.cpp", "line": 254, "label": "registerBindings" },
  { "path": "docs/M4-water-sort.md", "label": "倒水五阶段动画" }
]
```

- `path` is repo-relative (or doc-relative); `line` is 1-based; both optional only when citing a whole file.
- Cite behavior, not vibes: if the page claims "依赖先加载后本体", a source line where that order is enforced must exist in `sources`.
- If you could not verify a claim against the source, do not state it as fact — state it as schematic.

## Fidelity

`viz-meta.fidelity` is required and says how close the model is:

| Level | Meaning |
|---|---|
| `exact` | Behavior and constants match the cited sources. |
| `simplified` | Same mechanism, reduced scale or elided branches; the elisions are listed. |
| `schematic` | Illustrative reconstruction; numbers and paths are examples, not measurements. |

```json
"fidelity": { "level": "simplified", "notes": "容量取小素数序列；省略了并发与异常分支" }
```

The fidelity statement must also appear in the page's notes so a reader sees it.

## Reproducibility

- Randomness uses a seeded generator; the seed is visible or resettable.
- Any input the page ships with must actually produce the shipped steps (the browser gate runs `demo()` for algorithm pages).

## Honesty

Never let polish outrun truth: a beautiful diagram of a wrong mechanism is a defect of the highest class. When evidence and a nicer story conflict, evidence wins.
