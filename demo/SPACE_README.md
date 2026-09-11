---
title: Writing Skill Approach Lab
emoji: ✍️
colorFrom: indigo
colorTo: blue
sdk: static
app_file: index.html
pinned: false
license: apache-2.0
---

# Writing Skill Approach Lab

An interactive qualitative experiment for comparing four ways of applying the [`writing-skill`](https://github.com/in-c0/writing-skill) rulebook to the same writing brief.

The Space runs entirely in the visitor's browser with Transformers.js. It uses the same model and deterministic decoding for every condition:

- **Baseline** — no added writing-style instructions.
- **Rules first** — the full rulebook is supplied before generation.
- **Draft → review** — the exact baseline draft is reviewed against the full rulebook and minimally corrected.
- **Hybrid** — core principles guide the initial draft, then the full rulebook is used for review.

The browser demo uses `onnx-community/SmolLM2-360M-Instruct-ONNX` with quantized weights. The first run downloads the model to the browser cache; later runs reuse the cached files.

This is not intended as a benchmark. It is a playground for seeing how prompting workflow changes prose and for comparing clarity, naturalness, usefulness, voice preservation, reader effort, recoverability, rhetorical over-engineering, rhythm, and genre fit.

The Space is deployed automatically from the GitHub repository together with the current `SKILL.md` and `CHECKLIST.md`, so the live experiment tracks the rulebook itself.
