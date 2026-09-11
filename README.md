# writing-skill

A rulebook for agents that need to write clearly without turning every paragraph into polished AI copy.

> Write for the reader, not for the performance of writing.

The skill is meant for explanatory, educational, technical, and professional writing. It is also useful when editing human-written text and you want to improve clarity without replacing the writer's voice with a generic "better" voice.

**[Try the writing-skill playground on Hugging Face](https://huggingface.co/spaces/wldud5192/writing-skill-approach-lab)**

## Why this exists

AI writing often becomes less natural as it becomes more polished. Ordinary sentences disappear. Paragraphs become too symmetrical. Simple points are turned into aphorisms. The prose starts announcing importance instead of explaining the subject.

`writing-skill` collects practical rules for avoiding that failure mode. It prefers clear explanations, concrete situations, useful repetition, stable terminology, natural connective language, and edits that solve a real reader-facing problem.

The rules are defaults rather than bans. A speech, advertisement, manifesto, or literary passage may need a very different style.

## Start here

- [`SKILL.md`](./SKILL.md) is the main agent-facing rulebook.
- [`CHECKLIST.md`](./CHECKLIST.md) is a shorter final review.
- [`AGENTS.md`](./AGENTS.md) explains how an agent should use the repository.
- [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md) covers written, spoken, and visual versions of the same material, including equations, code, diagrams, tables, figures, and companion material.

For most writing tasks, read `SKILL.md` before drafting and use `CHECKLIST.md` before delivery. When editing existing writing, preserve what already works and make the smallest change that improves the reader's experience.

## Try the different workflows

There is no assumption that one prompting method will always work best. The playground keeps the model and writing brief fixed and lets you move through the approaches one at a time.

The first output is a **baseline** with no added writing instructions. After that you can try:

1. **Rules first** — give the model the rulebook before it writes.
2. **Draft → review** — generate normally, then revise the exact baseline against the rulebook.
3. **Hybrid** — draft with a small set of core principles, then review that draft against the full rulebook.

The useful comparison is not simply which version sounds more polished. Look at whether the writing is easier to follow, more concrete, less performative, easier to recover after a lapse in attention, and better matched to its reader and genre.

The playground uses `Qwen/Qwen2.5-1.5B-Instruct` with deterministic decoding. Generation runs on Hugging Face ZeroGPU, so visitors do not have to download a local model or provide an API key. The full `SKILL.md` and `CHECKLIST.md` are deployed with the Space, so the Rules-first and review stages use the same public rulebook as this repository.

ZeroGPU is shared infrastructure, so a request can occasionally wait for GPU capacity. Hugging Face also applies daily usage quotas; signed-in users receive more quota than anonymous visitors.

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
demo/app.py                      hosted Hugging Face playground
demo/SPACE_README.md             Space description and configuration
demo/deploy_to_hf.py             deployment script
```

## Run the playground locally

The public demo is designed for Hugging Face ZeroGPU. You can still run the Gradio app locally if you have enough memory; a CUDA GPU is recommended for useful generation speed.

```bash
git clone https://github.com/in-c0/writing-skill.git
cd writing-skill
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r demo/requirements.txt
python demo/app.py
```

## Deployment

Changes to `SKILL.md`, `CHECKLIST.md`, or `demo/` automatically redeploy the Hugging Face Space through GitHub Actions.

The repository uses two GitHub Actions settings:

- secret `HF_TOKEN` — a Hugging Face token that can update the Space;
- variable `HF_SPACE_REPO` — the target Space repository.

The deploy script uploads the current rulebook with the app and requests Hugging Face ZeroGPU hardware.

## License

Apache-2.0.
