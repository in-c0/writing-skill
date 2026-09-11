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

This Space is static. It does not run a model on Hugging Face CPU or ZeroGPU, and it does not download model weights to the reader's computer.

Generation goes through Puter.js using NVIDIA Nemotron 3 Nano Omni:

`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`

Puter currently lists that route at $0 for input and output. Puter may ask a visitor to sign in so it can associate AI usage with that person's account. No Puter API key is stored in this Space.

The same model and settings are used for every stage in a comparison.

The full `SKILL.md` and `CHECKLIST.md` are deployed with this static Space and are used to build the Rules-first and review prompts.
