# writing-skill

A rulebook for agents that need to write clearly without turning every paragraph into polished AI copy.

> Write for the reader, not for the performance of writing.

The skill is useful for explanatory, educational, technical, and professional writing. It is also useful when editing existing text and you want to improve clarity without replacing the writer's voice with a generic "better" voice.

**[Try the writing-skill playground on Hugging Face](https://huggingface.co/spaces/wldud5192/writing-skill-approach-lab)**

## Why this exists

AI writing often becomes less natural as it becomes more polished. Ordinary sentences disappear. Paragraphs become too symmetrical. Simple points are turned into aphorisms. The prose starts announcing importance instead of explaining the subject.

`writing-skill` collects practical rules for avoiding that failure mode. It prefers clear explanations, concrete situations, useful repetition, stable terminology, natural connective language, and edits that solve a real reader-facing problem.

The rules are defaults rather than bans. A speech, advertisement, manifesto, or literary passage may need a very different style.

## Start here

- [`SKILL.md`](./SKILL.md) — the main agent-facing rulebook.
- [`CHECKLIST.md`](./CHECKLIST.md) — a shorter final review.
- [`AGENTS.md`](./AGENTS.md) — how an agent should use the repository.
- [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md) — written, spoken, and visual versions of the same material, including equations, code, diagrams, tables, figures, and companion material.

For most writing tasks, read `SKILL.md` before drafting and use `CHECKLIST.md` before delivery. When editing existing writing, preserve what already works and make the smallest change that improves the reader's experience.

## Try the workflows

There is no assumption that one prompting method will always work best. The playground keeps the brief and model fixed and lets you move through the approaches one at a time.

The first output is a **baseline** with no added writing instructions. After that you can try:

1. **Rules first** — give the model the rulebook before it writes.
2. **Draft → review** — generate normally, then revise the exact baseline against the rulebook.
3. **Hybrid** — draft with a small set of core principles, then review that draft against the full rulebook.

The useful comparison is not simply which version sounds more polished. Look at whether the writing is easier to follow, more concrete, less performative, easier to recover after a lapse in attention, and better matched to its reader and genre.

## How the playground runs

The Hugging Face Space is a **static page**. It does not run a model on Hugging Face CPU or ZeroGPU, and readers do not download a model into their browser.

Generation is sent directly from the page to Pollinations' anonymous text API. The playground currently fixes the backend to `openai-fast`, which Pollinations lists as an anonymous-tier GPT-OSS 20B model. The same model, temperature, seed, token budget, and reasoning setting are used for every stage in a comparison.

There is no playground account or API key to configure. Because generation is handled by an external service, do not use the public playground for private or sensitive writing. Anonymous public endpoints can also be rate-limited or changed by their provider.

The full `SKILL.md` and `CHECKLIST.md` are deployed with the static page. Rules-first and review prompts therefore use the same public rulebook as this repository rather than a separate condensed copy.

## Written, spoken, and visual versions

A written version and a spoken version should not be forced into identical wording.

The written version can rely on layout, equations, code, diagrams, tables, captions, and material the reader can inspect at their own pace. The spoken version should still make sense when the listener cannot see the page. Equations should usually be explained conceptually rather than read symbol by symbol; code should be explained through purpose and behavior rather than punctuation; figures and graphs should be described through the relationship or pattern the learner needs to notice.

Material that genuinely needs to be seen can remain in the written edition or a companion site. The audio should orient the listener honestly rather than pretending that every visual can be replaced by words.

See [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md) for the full adaptation rules and workflow experiments.

## Repository layout

```text
SKILL.md                         main writing rulebook
CHECKLIST.md                     compact review checklist
AGENTS.md                        instructions for agents
extensions/WRITTEN_SPOKEN.md    written / spoken / visual adaptation
demo/static/                     static playground
demo/SPACE_README.md             Hugging Face Space description
demo/deploy_to_hf.py             deployment script
```

## Run the playground locally

The playground is a static site. Serve the repository over HTTP and open the demo directory:

```bash
git clone https://github.com/in-c0/writing-skill.git
cd writing-skill
python -m http.server 8000
```

Then open `http://localhost:8000/demo/static/`.

Generation still goes through the same anonymous hosted model API, so the local page does not need model weights or an API key.

## Deployment

Changes to `SKILL.md`, `CHECKLIST.md`, or `demo/` automatically redeploy the static Hugging Face Space through GitHub Actions.

The repository uses two GitHub Actions settings:

- secret `HF_TOKEN` — a Hugging Face token that can update the Space;
- variable `HF_SPACE_REPO` — the target Space repository.

The deploy script uploads the static interface together with the current rulebook files. It does not request Hugging Face compute hardware.

## License

Apache-2.0.
