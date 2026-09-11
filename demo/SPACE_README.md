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

Generation is sent to Pollinations' anonymous text API using its `openai-fast` route, currently listed as an anonymous-tier GPT-OSS 20B model. No playground sign-in or API key is required. The same model and generation settings are used throughout one comparison.

The full `SKILL.md` and `CHECKLIST.md` are deployed with this Space and are used to build the Rules-first and review prompts.

The generation backend is an external public service. Do not submit private or sensitive writing, and expect that anonymous public endpoints can occasionally be rate-limited or changed by their provider.
