# Extension: Written, Spoken, and Visual Adaptation

Use this extension when the same material will appear across written/visual and spoken/audio forms: books, ebooks, audiobooks, lectures, narration, podcasts, companion websites, or multimodal learning material.

Read [`../SKILL.md`](../SKILL.md) first. The core writing rules still apply. This extension changes how the same ideas should be expressed for different media.

## Core principle

Do not treat the spoken version as a text-to-speech copy of the written version.

Do not treat the written version as a transcript of the spoken version.

Preserve the same underlying meaning, teaching intent, factual content, and conceptual progression, but adapt the expression to the medium.

A useful source model is:

1. **Core narrative** — the ideas that every version should communicate.
2. **Written / visual layer** — prose, equations, code, diagrams, tables, figures, citations, captions, typography, and layout.
3. **Spoken / audio layer** — narration adapted for listening, memory, pacing, and lack of visual access.
4. **Audio adaptation notes** — instructions for how visual or symbolic material should be explained aloud.
5. **Companion layer** — optional web material such as diagrams, equations, source code, simulations, animations, datasets, exercises, or interactive demonstrations.

The layers may share source material, but they should not be forced into identical wording.

---

# 1. Written version

The written version may assume the reader can:

- pause,
- reread,
- scan,
- compare distant parts of a page,
- inspect notation,
- follow indentation,
- look at a diagram while reading its explanation,
- and move non-linearly through the material.

Use those affordances when they genuinely help.

Written material may therefore include:

- equations in symbolic form,
- code blocks,
- diagrams and labelled figures,
- tables,
- sidebars,
- footnotes,
- cross-references,
- definitions placed near the relevant term,
- dense lists that are easier to scan than hear,
- and visual hierarchy that carries part of the structure.

Do not make prose unnecessarily dense merely because the reader can reread it. The core skill still favors clarity and moderate semantic compression.

## Written-version test

Ask:

> Does the page use visual structure to reduce effort, or is it merely storing more information on the page?

A diagram, equation, table, or code block should earn its place by making something easier to see, compare, inspect, or verify.

---

# 2. Spoken version

The spoken version is a genuine adaptation.

A listener usually cannot:

- glance back three paragraphs,
- hold a long list in view,
- inspect punctuation or indentation,
- compare two equations visually,
- see which part of a diagram the narrator means,
- or pause mentally while narration continues.

Write for that reality.

The spoken version may:

- shorten dense lists,
- repeat an important noun instead of using pronouns,
- add brief reminders of context,
- replace visual comparison with sequential explanation,
- split long sentences,
- use more explicit transitions,
- repeat a key idea once when memory benefits,
- remove visually obvious labels,
- and reorder a local explanation if that makes it easier to follow by ear.

Do not make narration artificially chatty. The target is natural spoken explanation, not filler.

## Spoken-version test

Ask:

> If the listener is walking, commuting, cooking, or looking away from a screen, can they still follow the idea?

If not, adapt it further.

---

# 3. Equations and mathematical notation

The written version may show the exact equation.

The spoken version should usually explain what the equation *says* before, or instead of, reading its symbols mechanically.

For example, instead of narrating every operator and subscript in an equation, explain:

- what quantity is changing,
- what it depends on,
- which terms increase or decrease it,
- what the variables represent,
- what happens in important limiting cases,
- and why the relationship matters.

Read exact notation aloud only when the exact notation itself is part of the learning objective.

### Bad default

> "d x over d t equals alpha x open parenthesis one minus x over k close parenthesis."

### Better default

> "The equation says that the quantity grows quickly when it is small, then slows as it approaches a maximum value."

If exact symbolic detail matters, give the conceptual explanation first, then the exact verbal form in a controlled way.

Do not assume that saying every symbol preserves information better. In audio, mechanical symbol reading can destroy the model the equation was meant to communicate.

---

# 4. Code

Written material may contain complete source code when the code itself is useful to inspect, copy, run, or modify.

The audiobook should almost never read a non-trivial code block character by character.

Instead, explain:

- what the code is trying to do,
- the important data flowing through it,
- the main control structure,
- the role of important functions or objects,
- the surprising or error-prone part,
- and the result the reader should expect.

Mention exact identifiers only when they matter conceptually or are needed to connect narration with the companion material.

Example:

Written version:

```python
for item in queue:
    if item.ready:
        process(item)
```

Spoken adaptation:

> "The loop walks through each queued item. It processes only the items that are ready and skips the rest."

If listeners need the exact code, place it in the written edition and/or companion website and tell them where it can be found without making the audio dependent on staring at it.

---

# 5. Diagrams, illustrations, and figures

Do not narrate a diagram by listing every visible object.

First identify why the figure exists.

Then describe the relationship the reader is meant to notice.

Useful questions:

- What is changing?
- What is connected to what?
- What is larger, smaller, earlier, later, inside, outside, upstream, or downstream?
- What pattern should the reader notice?
- What conclusion does the figure support?

### Weak narration

> "On the left is a blue circle. An arrow points to a green rectangle, and another arrow points downward..."

### Better narration

> "The diagram follows data from the input through two processing stages before it reaches the final output. The important point is that the second stage receives both the transformed input and a shortcut connection from the original signal."

Describe visual appearance only when appearance carries meaning.

---

# 6. Graphs and plots

Do not read every axis label and data point by default.

In speech, explain:

1. what is being compared,
2. the direction or shape of the main trend,
3. any important threshold, peak, reversal, or outlier,
4. and what that observation means.

If exact values matter, give only the values needed for the argument and leave the complete plot available in the written or companion version.

---

# 7. Tables

A table is spatial. Audio is sequential.

Do not turn a large table into a long recital of cells.

Instead:

- state what is being compared,
- summarize the strongest differences,
- mention exceptions that matter,
- and direct the listener to the written/companion table for exact values when appropriate.

If every cell genuinely matters, consider restructuring the content into several short comparisons instead of reading the table row by row.

---

# 8. Images whose visual appearance is the subject

Sometimes the visual cannot be reduced to a proposition because learning to *see* it is the objective: anatomy, microscopy, art, geometry, interfaces, spatial design, graphs, simulations, or visual pattern recognition.

In that case, the audio should:

- explain what to look for,
- provide enough conceptual orientation to remain useful without the image,
- and point to the figure or companion material for the visual experience itself.

Do not pretend that words fully replace a visual when they do not.

---

# 9. Companion website and interactive material

Use the companion layer for material that benefits from inspection or interaction, such as:

- full equations,
- source code,
- downloadable examples,
- diagrams,
- animations,
- interactive simulations,
- datasets,
- visual comparisons,
- exercises,
- references,
- and extended derivations.

The companion site should deepen the material, not repair an audiobook that is otherwise impossible to understand.

Prefer this relationship:

> The audio communicates the core idea. The companion material lets the learner inspect, manipulate, verify, or explore it further.

Avoid this relationship:

> The audio repeatedly says "look at the figure" and becomes useless without a screen.

When the visual is inherently necessary, say so plainly.

---

# 10. Keep cross-format identity without forcing identical wording

The written and spoken versions should feel like the same book made for different modes of attention.

Preserve:

- terminology,
- conceptual order where possible,
- examples that work in both media,
- claims and qualifications,
- narrator personality,
- level of technical depth,
- and chapter-level learning goals.

Allow changes in:

- sentence shape,
- pacing,
- repetition,
- list length,
- local ordering,
- explanation of notation,
- and references to visual material.

Do not introduce new factual claims in one format merely to make it livelier.

---

# 11. Recommended source structure

For publishing systems, a chapter may be represented conceptually as:

```text
Core narrative
├── Written / print / ebook
│   ├── prose
│   ├── equations
│   ├── code
│   ├── diagrams / figures
│   └── references / captions
├── Spoken / audiobook
│   ├── adapted narration
│   └── pronunciation / delivery notes
├── Audio adaptation notes
│   ├── equation explanation
│   ├── code explanation
│   ├── diagram explanation
│   └── material to omit or reframe
└── Companion
    ├── full visuals
    ├── source code
    ├── equations / derivations
    ├── simulations
    └── interactive or downloadable material
```

This is a conceptual organization, not a required file format.

---

# 12. Adaptation workflow

A reliable multimodal workflow is:

1. Establish the core narrative and learning objective.
2. Draft the written version using the main writing skill.
3. Identify every element that relies on visual access: equation, code block, diagram, table, figure, typography, spatial comparison, or cross-reference.
4. Decide what the listener actually needs to understand from each element.
5. Write the spoken version as narration, not as a transcription.
6. Read the spoken version aloud or simulate listening without looking at the written page.
7. Move exact visual/symbolic detail to the written or companion layer where appropriate.
8. Check that the audio still communicates the core idea independently.
9. Compare written and spoken versions for factual drift.

---

# 13. Applying the writing rules: try more than one approach

There is no single best way to use the writing rulebook with an AI system. Different models, genres, source texts, and prompts can respond better to different workflows.

Users and agents are encouraged to generate multiple variants and compare them rather than assuming one prompting strategy is universally superior.

## Approach A: Rules first

Give the agent the relevant writing rules before generation, then ask it to write the piece.

Conceptually:

```text
1. Read SKILL.md.
2. Read any relevant extension.
3. Understand the brief, audience, genre, and source material.
4. Generate the writing under those constraints.
5. Run the final checklist.
```

This is often efficient for writing from scratch because the first draft is already shaped by the desired style.

Possible advantage:

- fewer obvious AI-polish problems in the first draft.

Possible risk:

- the model may become overly self-conscious about the rules and produce cautious or flattened prose.

## Approach B: Draft first, then review rule by rule

Generate a draft without forcing every rule into the initial generation step. Then review the draft against the rulebook and revise where each rule exposes a real problem.

Conceptually:

```text
1. Generate the best natural draft from the brief.
2. Preserve that draft as a baseline.
3. Review it against the rulebook.
4. For each relevant rule:
   a. identify a concrete violation or weakness,
   b. explain why it harms the reader,
   c. make the smallest useful correction,
   d. compare the revision with the previous version.
5. Stop changing a passage when the revision is no longer better.
6. Run a final holistic read.
```

This approach is especially useful when:

- preserving an existing voice,
- editing human writing,
- diagnosing why prose feels wrong,
- or studying which rules actually change the result.

Possible advantage:

- the agent can reason from concrete evidence in the draft instead of trying to obey many abstract constraints simultaneously.

Possible risk:

- mechanical rule-by-rule editing can overcorrect the prose, create contradictions between passes, or remove qualities that were working.

Therefore, never treat every rule as requiring a change. A review item may conclude: **no correction needed**.

## Approach C: Hybrid

A useful default experiment is:

1. Give the agent only the core principles before drafting.
2. Generate a natural first version.
3. Apply the detailed checklist afterward.
4. Make a small number of focused revision passes.

This often balances direction with spontaneity.

---

# 14. Compare approaches experimentally

When quality matters, produce multiple versions from the same brief.

For example:

- **A — rules-first generation**
- **B — draft-first + iterative rule review**
- **C — hybrid**

Keep the source brief, factual inputs, intended audience, and required length as constant as possible.

Then compare the outputs on criteria such as:

- clarity,
- naturalness,
- usefulness,
- voice preservation,
- reader effort,
- concreteness,
- recoverability,
- rhetorical over-engineering,
- spoken rhythm,
- genre fit,
- and factual fidelity.

When possible, compare versions without labeling which workflow produced them. This reduces preference for a method merely because it sounds more systematic.

Do not ask only:

> Which version is more polished?

Also ask:

> Which one would I rather keep reading?

> Which one makes the idea easiest to understand?

> Which one sounds most like a knowledgeable person actually trying to help me?

> Which changes improved the piece, and which only made the writing more noticeable?

Keep the winning passages, not necessarily the winning workflow. Different sections may benefit from different methods.

---

# 15. Iterative-review discipline

When reviewing against the rules one item at a time:

- preserve the original draft,
- make minimal corrections,
- do not rewrite unaffected passages automatically,
- record the reason for a meaningful change when useful,
- check whether a later correction damages an earlier strength,
- periodically reread the entire passage rather than only the sentence under review,
- and stop when further editing produces stylistic churn instead of reader benefit.

The rulebook is a diagnostic instrument, not a machine for maximizing compliance.

The purpose of iteration is to improve the reader's experience, not to achieve a perfect rule score.

---

# Final multimodal test

For the written version:

> Does the page let the reader see, inspect, compare, and return to information efficiently?

For the spoken version:

> Can a listener understand the core idea without needing to see the page?

For both:

> Do these feel like the same knowledgeable person explaining the same subject naturally in two different media?
