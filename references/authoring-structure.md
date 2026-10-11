# Authoring: structure

Storage/memory internals of a data structure. The defining feature is the **dual view**.

## Required anatomy

- `data-lv-view="logical"` — the picture in the reader's head (buckets and chains, a ring, a tree).
- `data-lv-view="physical"` — what memory actually contains (the real arrays, offsets, indices). No fake nodes: if the real structure uses index links instead of pointers, the physical view shows indices.
- A bookkeeping strip (counters): size, capacity, load factor, free-list head — whatever the structure actually maintains.
- Steps driven by operations (add/remove/find/insert…), each annotated with its cost.

## Step model

```js
{ narration: '…', cost: 'O(1) 均摊', state: { buckets, entries, count, freeList }, hl: { bucket: 2, entry: 5 } }
```

- `hl` (highlights): named targets the views light up. Prefer semantic names (`bucket`, `entry`, `slot`) over coordinates.
- `cost`: when the operation's cost is the point (amortized growth, rehash, lazy free), show it.

## Content rules

- Choose fidelity deliberately: if the real implementation is a library/VM you didn't build, state whether the model is exact, simplified, or schematic (`viz-meta.fidelity`), and simplify only along axes that don't change the mechanism.
- Show the *surprising* mechanics explicitly: rehash/growth as visible steps, tombstones/free-lists as visible rows, index arithmetic in narration.
- Logical and physical views must stay mutually consistent at every step — the browser gate samples stage mutation; consistency is the author's job.
- Notes must cover: why this layout (cache, memory, resizing strategy), and one comparison ("vs the other common implementation").

## Pitfalls

- A logical view that contradicts the physical view (arrows that don't correspond to real indices).
- Hiding growth/rehash because it is inconvenient — growth is usually the whole lesson.
- Operations without cost annotations.
