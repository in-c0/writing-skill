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

The writing skill uses **Rules first** as its default mode: give the model the rulebook before it writes, then run the final checklist.

This playground also includes a baseline control and two experimental modes so you can see what the workflow changes:

1. **Baseline control** — normal generation with no writing-skill instructions.
2. **Rules first · default** — give the model the full rulebook before drafting.
3. **Draft → review · experimental** — revise the exact baseline against the rulebook.
4. **Hybrid · experimental** — draft with the core principles, then review that draft against the full rulebook.

Read each result before continuing. The useful question is not simply which version sounds more polished. Look for writing that is easier to follow, concrete where it should be concrete, natural in rhythm, and appropriate to the reader.

This Space is static. It does not use Hugging Face CPU or ZeroGPU for inference, and it does not download model weights to the reader's computer.

Generation is handled by a small Vercel serverless endpoint owned by this project. The endpoint calls Vercel AI Gateway with server-side deployment identity, so readers do not need to sign in or provide an API key.

The current model is `inclusionai/ling-3.0-flash`. Reasoning is disabled for this writing comparison, and the same model and generation settings are used throughout one run.

The full `SKILL.md` and `CHECKLIST.md` are deployed with this Space. Rules first uses the rulebook as the normal workflow; Draft → review and Hybrid are included only as experimental comparison modes.

Hosted inference still has owner-side credits and limits. On the free tier, the model allows only a few generations every few minutes across all visitors, so a stage may report a rate limit; wait a few minutes and run it again. The backend caps request size and output length. Do not submit private or sensitive writing to this public playground.
