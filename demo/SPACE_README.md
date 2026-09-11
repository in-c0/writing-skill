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

An interactive qualitative experiment for comparing different ways of applying the [`writing-skill`](https://github.com/in-c0/writing-skill) rulebook to the same writing brief.

The Space runs entirely in the visitor's browser with Transformers.js and uses the same model and deterministic decoding throughout.

The interface is intentionally staged rather than running every generation behind one button:

1. **Load model** — initialize the local model once.
2. **Generate baseline** — create the no-instructions control output from a brief.
3. **Approach 1: Rules first** — generate a fresh answer with a compact, faithful rule digest supplied before drafting.
4. **Approach 2: Draft → review** — revise the exact baseline against the same rule digest.
5. **Approach 3: Hybrid** — draft with the core principles, then run a separate review pass.

Readers can inspect each output before moving to the next stage. There is no artificial short-word cap; the output token budget is set in the baseline stage and reused through the comparison.

The browser demo uses `onnx-community/SmolLM2-360M-Instruct-ONNX` with q4 quantized weights. The first visit downloads the model to the browser cache; later visits can reuse the cached files.

The public demo deliberately defaults to **CPU/WASM** and does not require WebGPU or browser feature flags. Inference runs in a Web Worker and streams partial output back to the interface so the page remains responsive.

Because a small local model cannot use a very long instruction prefix efficiently, the browser lab uses a compact agent-facing digest of the public rulebook rather than injecting the full `SKILL.md` into every prompt. The complete rulebook remains available in the GitHub repository.

Readers can choose from several unrelated sample briefs—community garden, science explainer, workplace update, and repair-café introduction—or enter their own brief.

This is not intended as a benchmark. It is a playground for seeing how prompting workflow changes prose and for comparing clarity, naturalness, usefulness, voice preservation, reader effort, recoverability, rhetorical over-engineering, rhythm, and genre fit.

The Space is deployed automatically from the GitHub repository together with the current rulebook files, so the live experiment tracks the project itself.
