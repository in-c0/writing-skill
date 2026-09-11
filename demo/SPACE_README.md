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

This Space is static. It does not use Hugging Face CPU or ZeroGPU for inference, and it does not download model weights to the reader's computer.

Generation is handled by a small Vercel serverless endpoint owned by this project. The endpoint calls Vercel AI Gateway with server-side deployment identity, so readers do not need to sign in or provide an API key.

The current model is `inclusionai/ling-3.0-flash`. Reasoning is disabled for this writing comparison, and the same model and generation settings are used throughout one run.

The full `SKILL.md` and `CHECKLIST.md` are deployed with this Space and are used to build the Rules-first and review prompts.

Hosted inference still has owner-side credits and limits. The backend caps request size and output length, and availability depends on the project's Vercel AI Gateway allowance. Do not submit private or sensitive writing to this public playground.
