---
title: writing-skill playground
emoji: ✍️
colorFrom: indigo
colorTo: blue
sdk: gradio
app_file: app.py
python_version: 3.10.13
suggested_hardware: zero-a10g
pinned: false
license: apache-2.0
---

# writing-skill playground

This Space lets you give one writing brief to the same model and compare several ways of applying the [`writing-skill`](https://github.com/in-c0/writing-skill) rulebook.

Work through the stages one at a time:

1. Generate a normal baseline with no added writing instructions.
2. Generate a fresh version with the rules supplied before drafting.
3. Take the exact baseline and revise it against the rules.
4. Try the hybrid workflow: draft with the core principles, then review the draft against the full rulebook.

Read each result before continuing. The useful question is not simply which version sounds more polished. Look for writing that is easier to follow, concrete where it should be concrete, natural in rhythm, and appropriate to the reader.

The Space uses `Qwen/Qwen2.5-1.5B-Instruct` with deterministic decoding. Inference runs on Hugging Face ZeroGPU, so visitors do not need to download a local model or provide an API key.

ZeroGPU is shared infrastructure. A request can occasionally wait in a queue, and Hugging Face applies daily usage quotas. Signed-in users receive more quota than anonymous visitors.

The full `SKILL.md` and `CHECKLIST.md` are deployed with the app. Rules-first and review therefore use the actual public rulebook rather than a separate approximation.

The playground includes several unrelated example briefs, and you can replace them with your own.
