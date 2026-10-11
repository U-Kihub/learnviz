# Teaching contract

A LearnViz page is a *lesson*, not a poster. Every page, regardless of type, must satisfy this contract. The default content language is Chinese (`zh-CN`) unless the user asks otherwise.

## The six questions

A page that cannot answer all six is incomplete:

1. **What picture should exist in the reader's head?** — the *mental model*: one sentence in the header's `mental-model` slot, before anything moves.
2. **How does it actually proceed?** — a numbered sequence of steps. Each step has a narration that says *what happens now and why*, in plain language.
3. **Where does the state live?** — the visual must be driven by state, and the state must be inspectable (highlighted nodes, tables, counters). No animation detached from state.
4. **What is it based on, and what is simplified?** — evidence (see `evidence.md`) plus a fidelity disclosure. Simplifications are stated, not hidden.
5. **Why is it designed this way? What are the traps?** — a rationale/misconceptions note. The one wrong picture the reader probably has; correct it explicitly.
6. **How do you say it in 30 seconds?** — a short review/interview pitch. The takeaway in spoken form.

## Step quality rules

- Steps are *meaningful beats*, not one per line of code. Merge trivial transitions; split anything that changes the reader's picture.
- Narration explains *cause → effect* ("先查缓存，命中就返回，所以后面步骤都不走"), never just restates the visual.
- Numbers that motivate the design (capacity, cost, thresholds) appear in narration or cost annotations, not only in code.
- The first step establishes the scene (inputs, actors, initial state). The last step is a summary a reader could recite.

## Prohibited

- Facts without evidence when the topic is a real system (mark as schematic instead).
- Decoration that carries no information.
- Auto-playing motion that cannot be paused, stepped, or reset.
- Content in a second language mixed into the UI chrome unless the audience needs it.
