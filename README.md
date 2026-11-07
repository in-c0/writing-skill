# writing-skill

Agent skills that stop AI writing from sounding like AI, with a blind benchmark to show which one actually works.

**Best performer: [`storyscope`](./skills/storyscope/)** — the measured map of where AI text clusters (61,575 stories, human vs five LLMs), packaged as a skill. Across journal posts, sales copy and short stories it took **9 of 12 blind first places**.

**[Open the site](https://wldud5192-writing-skill.static.hf.space)** to read the outputs side by side, judge three rounds yourself, copy the prompts, or download the skills.

```bash
npx skills add in-c0/writing-skill --skill storyscope -g
```

## Benchmark

Same model, same six briefs, four setups. Two AI editors (Opus and Sonnet) scored every piece blind, 1–10. Human picks come from the [judging rounds on the site](https://wldud5192-writing-skill.static.hf.space/#arena).

<!-- BENCH:summary -->
| Configuration | Journal | Sales | Story | **Avg** | 1st places | Human best–worst |
|---|---|---|---|---|---|---|
| StoryScope only 👑 | 8.8 | 8.0 | 8.8 | **8.50** | 9/12 | pending |
| writing-skill + StoryScope | 8.0 | 6.8 | 8.2 | **7.67** | 1/12 | pending |
| No skill (control) | 5.2 | 6.5 | 6.0 | **5.92** | 2/12 | pending |
| writing-skill | 6.0 | 5.0 | 6.8 | **5.92** | 0/12 | pending |
<!-- /BENCH:summary -->

What came out of it:

- **StoryScope alone won every genre.** Judges' notes keep naming the same things: a real voice, dry humour, specific objects ("five $2 coins" for 32 g), endings that stop instead of explaining.
- **writing-skill alone removes the most surface tells but did not beat the control.** It had the lowest polish-lint score in every genre, and one judge summed up its product page as "clear and accurate but flat". Taking the AI polish out is not the same as putting a person in.
- **The merged skill landed in between.** The reader-first rules pulled StoryScope's departures back toward plainness, which helped sales copy a little and cost the fiction some edge.
- **The control won sales-2 (launch email) with both judges.** Short transactional copy is where the skills help least.
- **Rubric check.** The scoring rubric names AI tells that StoryScope trains the writer to avoid, so all 24 pieces were re-judged with a neutral prompt that never mentions AI. StoryScope kept its 8.50 average and 9 of 12 first places, but the control rose to 7.25 and overtook the merged skill (7.08), and on short stories StoryScope and the control nearly tie (8.0 vs 7.75). Details in [BENCHMARK.md](./benchmark/BENCHMARK.md#rubric-check-neutral-re-judging).

Each piece and every judge note is in [`benchmark/`](./benchmark/); the full breakdown, including the StoryScope classifier and the lint, is in [`benchmark/BENCHMARK.md`](./benchmark/BENCHMARK.md).

### Output examples

Same brief, opening lines. Full texts: [journal](./benchmark/outputs/journal-1/) · [sales](./benchmark/outputs/sales-1/) · [story](./benchmark/outputs/story-1/).

<table>
<tr><th>No skill</th><th>StoryScope</th></tr>
<tr><td valign="top">

**Journal: first month as an indie developer**

> On the first Monday after I quit, I woke up at 6:40 out of habit and lay there waiting for the part of my brain that checks Slack to settle down. It took about a week.

</td><td valign="top">

&nbsp;

> I quit on a Thursday in October. My manager said "living the dream" in a voice that suggested he'd be checking back, and someone from IT took my laptop and made me sign a sheet confirming I'd also returned the charger.

</td></tr>
<tr><td valign="top">

**Sales: the Laneway Pen**

> **Steel, ink, and a promise that outlasts the nib.**
>
> The Laneway Pen comes from a two-person workshop in Melbourne. It's a refillable stainless-steel fountain pen for the lists, letters and margin notes you write every day.

</td><td valign="top">

&nbsp;

> We're a workshop of two in Melbourne, so whoever answers your email probably had a hand in making your pen. [...] Throw it in a bag with your keys. It'll be fine.

</td></tr>
<tr><td valign="top">

**Story: the birthday candle**

> The candles lived in a mason jar beside the register, the last remains of a spring when someone at regional decided the pharmacy should carry party supplies.

</td><td valign="top">

&nbsp;

> "Just this," he said, and put the candle on the counter like it might roll away. That was the first Tuesday, or the first one I noticed.

</td></tr>
</table>

### Human reviews (welcome)

The AI judges are from the same model family as the writer, so human picks are what make this result trustworthy. One review takes about three minutes: three rounds, four anonymous pieces each, pick the best and the worst.

1. Go to the [judging rounds](https://wldud5192-writing-skill.static.hf.space/#arena).
2. Press **Send to leaderboard** at the end. It opens a prefilled GitHub issue; submit it.
3. A workflow validates the picks, adds them to [`benchmark/human-reviews/`](./benchmark/human-reviews/), re-scores, and updates this table and the site. Reviewers so far: <!-- BENCH:reviewers -->0<!-- /BENCH:reviewers -->.

New briefs, new genres and reruns on other models are welcome as pull requests: add a brief to [`benchmark/briefs.json`](./benchmark/briefs.json), outputs to `benchmark/outputs/<brief>/<setup>.md`, and run `python benchmark/tools/aggregate.py`.

## The skills

| Skill | What it does | Use it for |
|---|---|---|
| [`storyscope`](./skills/storyscope/) 👑 | Lists the choices AI text makes by default (with measured AI-vs-human rates), has the model pick deliberate departures before drafting, and ships the paper's human-vs-AI classifier to score a story. | Stories, personal posts, essays, product copy |
| [`writing-skill-storyscope`](./skills/writing-skill-storyscope/) | The full reader-first rulebook plus the StoryScope layer. | Long explanatory or teaching material that also needs a voice |
| [`writing-skill`](./skills/writing-skill/) | The original rulebook: write for the reader, strip AI polish, keep the writer's voice when editing. | Docs, tutorials, editing someone else's draft |

### Install

**Claude Code, Codex, Cursor and other agents** ([skills.sh](https://skills.sh)):

```bash
npx skills add in-c0/writing-skill --skill storyscope -g
npx skills add in-c0/writing-skill --skill writing-skill-storyscope -g
```

**Claude app:** download a zip from the [site](https://wldud5192-writing-skill.static.hf.space/#get) and upload it under Skills in settings.

**Any chat, no install:** copy a prompt from [`prompts/`](./prompts/) (or from the site) and add your task after the last line.

**Manual:** copy `skills/<name>/` into your agent's skills folder, for example `~/.claude/skills/`.

### Scoring a story with StoryScope

```bash
pip install xgboost numpy
python skills/storyscope/scripts/annotation_prompts.py story.md work/prompts   # 10 annotation prompts
# answer each prompt (or hand them to subagents) -> work/answers/<dimension>.json
python skills/storyscope/scripts/merge_annotations.py work/answers work/story.features.json
python skills/storyscope/scripts/score_story.py work/story.features.json        # P(human) + features pushing toward "AI"
python skills/storyscope/scripts/ai_default_index.py work/story.features.json   # share of the 30 widest AI defaults hit
```

## How the benchmark was run

- **Briefs:** two journal-style blog posts, two pieces of sales copy (product page, launch email), two short stories ([`briefs.json`](./benchmark/briefs.json)).
- **Writers:** one fresh Claude Opus 5.5 session per piece. Skill sessions were told to read the skill and follow it, in a single pass, without running the scoring scripts.
- **Judges:** Claude Opus and Claude Sonnet, blind (pieces labelled A–D in a seeded shuffle, separate shuffle per judge). Each scored *does the job*, *reads human*, *specific*, *overall*, an estimated P(human), and a rank. Raw scores: [`benchmark/judging/`](./benchmark/judging/).
- **StoryScope classifier (stories only):** each story was annotated on the paper's 304 features with its own prompts (Claude Sonnet as annotator, blind), then scored by the released XGBoost models. As a calibration check, the same annotator rated a known Claude story from the paper's dev set at an AI-default index of 0.53 where the paper's own annotation gives 0.80, so this annotator is more lenient and its absolute numbers are not comparable to the paper. The ordering is the useful part: control 0.18, writing-skill 0.07, merged 0.05, StoryScope 0.00.
- **Polish lint:** a deliberately crude count of em dashes, "not X but Y", triads, stock words and one-line punch paragraphs per 100 words ([`polish_lint.py`](./benchmark/tools/polish_lint.py)).

**Limits.** Twelve judgements per setup is small. The judges share a model family with the writer and may share its taste. One writing model was tested. Treat the result as a strong first signal, and help turn it into a solid one with a human review.

## The rulebook (writing-skill)

> Write for the reader, not for the performance of writing.

[`SKILL.md`](./SKILL.md) is the main rulebook, [`CHECKLIST.md`](./CHECKLIST.md) the final review, [`AGENTS.md`](./AGENTS.md) how an agent should use the repository, and [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md) covers written, spoken and visual versions of the same material. Edit those files, then run `python scripts/build_skills.py` to rebuild the installable folders under `skills/`.

The default workflow is **rules first**: read the rulebook before drafting, write with it active, run the checklist before delivery. **Draft → review** and **Hybrid** are experimental modes for comparing prompting strategies. The [Hugging Face playground](https://huggingface.co/spaces/wldud5192/writing-skill-approach-lab) compares them live on a small hosted model.

<details>
<summary>Playground and deployment details</summary>

The playground Space is static. Generation goes through a small Vercel function (`api/generate.js`) that calls Vercel AI Gateway with `inclusionai/ling-3.0-flash`, reasoning disabled, with request and output caps. It runs on the free tier (about five requests per five minutes, shared), and the page retries when throttled. Do not paste private text into it.

- Changes to `SKILL.md`, `CHECKLIST.md` or `demo/` redeploy the playground through GitHub Actions (`HF_TOKEN` secret, `HF_SPACE_REPO` variable).
- Changes to `site/`, `skills/`, `prompts/` or `benchmark/` redeploy the benchmark site to the Space in `HF_SITE_REPO` (default `wldud5192/writing-skill`).
- The Vercel API is deployed by hand with `vercel deploy --prod`; browsers may call it only from the playground origin and localhost unless `ALLOWED_ORIGINS` is set.

Run the playground locally with `python -m http.server 8000` and open `http://localhost:8000/demo/static/`.
</details>

## Repository layout

```text
skills/storyscope/                 StoryScope skill: SKILL.md, measured defaults, taxonomy, classifier, scripts
skills/writing-skill-storyscope/   merged skill (built)
skills/writing-skill/              rulebook skill (built)
skills/_src/                       sources for the merged layer
prompts/                           copy-paste prompt versions of each skill
benchmark/                         briefs, outputs, judge scores, StoryScope scores, human reviews, tools
site/                              benchmark site (deployed to Hugging Face)
SKILL.md, CHECKLIST.md, AGENTS.md, extensions/   rulebook sources
demo/, api/                        playground and its inference endpoint
scripts/                           build and deploy scripts
```

## Credits and license

StoryScope: Jenna Russell, Rishanth Rajendhran, Chau Minh Pham, Mohit Iyyer, John Wieting, *StoryScope: Investigating idiosyncrasies in AI fiction* (2026), [arXiv:2604.03136](https://arxiv.org/abs/2604.03136). Taxonomy, feature data and classifier weights come from [jenna-russell/storyscope](https://github.com/jenna-russell/storyscope) under the MIT licence (see `skills/storyscope/LICENSE-storyscope`).

Everything else: Apache-2.0.
