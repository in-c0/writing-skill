---
title: writing-skill playground
emoji: ✍️
colorFrom: indigo
colorTo: blue
sdk: static
app_file: index.html
pinned: false
license: apache-2.0
---

# writing-skill playground

Give one writing brief to the same hosted model and move through the writing approaches one stage at a time.

The first output is a normal baseline with no added writing instructions. After that, try:

1. **Rules first** — give the model the rulebook before it writes.
2. **Draft → review** — revise the exact baseline against the rulebook.
3. **Hybrid** — draft with the core principles, then review that draft against the full rulebook.

Read each result before continuing. The useful question is not simply which version sounds more polished. Look for writing that is easier to follow, concrete where it should be concrete, natural in rhythm, and appropriate to the reader.

This Space is static. It does not run a model on your computer and it does not use this Space owner's CPU quota. Generation is delegated through Hugging Face's public Gradio API to OpenBMB's official MiniCPM5 ZeroGPU demo. The playground tries the 2B demo first and can fall back to the 1B demo before the baseline is established.

Once the baseline has been generated, the same backend is kept for the rest of that comparison.

Public model Spaces are shared infrastructure. They can queue, rate-limit, sleep, change their API, or become temporarily unavailable. That dependency is intentionally stated here rather than hidden.

The full `SKILL.md` and `CHECKLIST.md` are deployed with this static Space and are used to build the Rules-first and review prompts.
