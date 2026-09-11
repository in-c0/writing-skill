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
- **Rules first** — a condensed, faithful rule digest is supplied before generation.
- **Draft → review** — the exact baseline draft is reviewed against the same digest and minimally corrected.
- **Hybrid** — core principles guide the initial draft, then the same review pass is applied.

The browser demo uses `onnx-community/SmolLM2-360M-Instruct-ONNX` with q4 quantized weights. The q4 model is about 386 MB. The first run downloads it to the browser cache; later runs reuse the cached files.

The public demo deliberately defaults to **CPU/WASM** and does not require WebGPU or browser feature flags. Inference runs in a Web Worker and streams partial output back to the interface so the page remains responsive.

Because a small local model cannot use a very long instruction prefix efficiently, the browser lab uses a compact agent-facing digest of the public rulebook rather than injecting the full `SKILL.md` into every prompt. The complete rulebook remains available in the GitHub repository.

Readers can choose from several unrelated sample briefs—community garden, science explainer, workplace update, and repair-café introduction—or enter their own brief. Each method can be run independently, or all four can be run in sequence.

This is not intended as a benchmark. It is a playground for seeing how prompting workflow changes prose and for comparing clarity, naturalness, usefulness, voice preservation, reader effort, recoverability, rhetorical over-engineering, rhythm, and genre fit.

The Space is deployed automatically from the GitHub repository together with the current rulebook files, so the live experiment tracks the project itself.
