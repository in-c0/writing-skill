---
title: Writing Skill Approach Lab
emoji: ✍️
colorFrom: indigo
colorTo: blue
sdk: gradio
sdk_version: 5.44.1
app_file: app.py
pinned: false
license: apache-2.0
---

# Writing Skill Approach Lab

An interactive qualitative experiment for comparing four ways of applying the [`writing-skill`](https://github.com/in-c0/writing-skill) rulebook to the same writing brief.

The Space uses the same model and deterministic decoding for every condition:

- **Baseline** — no added writing-style instructions.
- **Rules first** — the full rulebook is supplied before generation.
- **Draft → review** — the exact baseline draft is reviewed against the full rulebook and minimally corrected.
- **Hybrid** — core principles guide the initial draft, then the full rulebook is used for review.

The default model is `Qwen/Qwen2.5-1.5B-Instruct`. Set the `MODEL_ID` Space variable to use another compatible instruct model.

This is not intended as a benchmark. It is a playground for seeing how prompting workflow changes prose and for comparing clarity, naturalness, usefulness, voice preservation, reader effort, recoverability, rhetorical over-engineering, rhythm, and genre fit.

The Space is deployed automatically from the GitHub repository, together with the current `SKILL.md` and `CHECKLIST.md`, so the live experiment tracks the rulebook itself.
