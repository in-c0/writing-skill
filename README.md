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

For most writing tasks, use **Rules first** as the default workflow: read `SKILL.md` before drafting or rewriting, apply the rules while producing the piece, then use `CHECKLIST.md` before delivery.

When editing existing writing, preserve what already works and make the smallest change that improves the reader's experience.

## Workflow modes

### Default: Rules first

Give the model the rulebook before it writes. This is the normal operating mode for the skill.

```text
1. Read SKILL.md.
2. Read any relevant extension.
3. Understand the brief, audience, genre, source material, and constraints.
4. Write or revise with the rules active from the start.
5. Run CHECKLIST.md before delivery.
```

### Experimental: Draft → review

Generate a normal draft first, preserve it as a baseline, then review it against the rulebook. This is useful for studying what the skill actually changes or for diagnosing a draft, but it is not the default workflow.

### Experimental: Hybrid

Draft with a smaller set of core principles, then review that draft against the full rulebook. This is also an experimental comparison mode rather than the default.

The playground keeps the writing brief and model fixed so these modes can be compared. The baseline exists as a control for that experiment; it is not a recommended production mode.

The useful comparison is not simply which version sounds more polished. Look at whether the writing is easier to follow, more concrete, less performative, easier to recover after a lapse in attention, and better matched to its reader and genre.

## How the playground runs

The Hugging Face Space is a **static interface**. It does not run a model on Hugging Face CPU or ZeroGPU, and readers do not download model weights into their browser.

When the reader generates a version, the page sends the prompt to the project's small Vercel serverless endpoint. That endpoint calls Vercel AI Gateway using Vercel's deployment identity, so no inference credential is exposed in the browser and the reader does not need to sign in.

The playground currently uses `inclusionai/ling-3.0-flash` with a fixed temperature and output limit, with reasoning disabled. The same backend and generation settings are used for every stage in one comparison.

The full `SKILL.md` and `CHECKLIST.md` are deployed with the static page. Rules-first and experimental review prompts therefore use the same public rulebook as this repository rather than a separate condensed copy.

Hosted inference is paid or quota-limited infrastructure even when the public interface is free to use. Availability therefore depends on the project owner's Vercel AI Gateway credits and limits. The project runs on AI Gateway's free tier, which allows about five requests per five-minute window, shared across all visitors and models. One complete run of the four stages is five requests. When a stage is throttled, the page waits and retries on its own for up to about six minutes. The backend has input and output caps so a public demo cannot submit arbitrarily large requests.

Because writing submitted to the playground is sent to hosted inference, do not use the public demo for private or sensitive text.

## Written, spoken, and visual versions

A written version and a spoken version should not be forced into identical wording.

The written version can rely on layout, equations, code, diagrams, tables, captions, and material the reader can inspect at their own pace. The spoken version should still make sense when the listener cannot see the page. Equations should usually be explained conceptually rather than read symbol by symbol; code should be explained through purpose and behavior rather than punctuation; figures and graphs should be described through the relationship or pattern the learner needs to notice.

Material that genuinely needs to be seen can remain in the written edition or a companion site. The audio should orient the listener honestly rather than pretending that every visual can be replaced by words.

See [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md) for the full adaptation rules and experimental workflow comparisons.

## Repository layout

```text
SKILL.md                         main writing rulebook
CHECKLIST.md                     compact review checklist
AGENTS.md                        instructions for agents
extensions/WRITTEN_SPOKEN.md    written / spoken / visual adaptation
demo/static/                     static Hugging Face playground
demo/SPACE_README.md             Hugging Face Space description
demo/deploy_to_hf.py             static Space deployment script
api/generate.js                  Vercel serverless inference endpoint
package.json                     Vercel backend dependency metadata
vercel.json                      Vercel function configuration
```

## Run the playground locally

Serve the repository over HTTP and open the demo directory:

```bash
git clone https://github.com/in-c0/writing-skill.git
cd writing-skill
python -m http.server 8000
```

Then open `http://localhost:8000/demo/static/`.

The local interface still sends generation requests to the hosted Vercel endpoint; it does not download a model.

## Deployment

### Hugging Face interface

Changes to `SKILL.md`, `CHECKLIST.md`, or `demo/` automatically redeploy the static Hugging Face Space through GitHub Actions.

The repository uses two GitHub Actions settings for that deployment:

- secret `HF_TOKEN` — a Hugging Face token that can update the Space;
- variable `HF_SPACE_REPO` — the target Space repository.

The Space deployment uploads the static interface together with the current rulebook files. It does not request Hugging Face compute hardware.

### Generation backend

`api/generate.js` is deployed as a Vercel Function. It authenticates to Vercel AI Gateway with Vercel OIDC, validates incoming chat messages, applies request-size limits, and returns only the generated text and model identifier to the browser.

The production endpoint used by the playground is:

`https://writing-skill-api.vercel.app/api/generate`

Browsers may call it only from the Hugging Face Space origin (`https://wldud5192-writing-skill-approach-lab.static.hf.space`) and from `localhost` or `127.0.0.1` on any port. Other origins get a `403` JSON response. Set the `ALLOWED_ORIGINS` environment variable (comma-separated) on the Vercel project to allow more.

The Vercel project is not linked to this GitHub repository, so pushing to `main` does not redeploy the backend. To deploy the current `api/generate.js`, run `vercel deploy --prod` from the repository root; `.vercelignore` keeps the rulebook and playground files out of that deployment.

## License

Apache-2.0.
