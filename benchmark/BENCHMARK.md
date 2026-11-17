# Benchmark details

Six briefs × four setups, written by fresh Claude Opus 5.5 sessions. Two blind AI editors (Claude Opus, Claude Sonnet) per brief. Human best/worst picks from the [site](https://wldud5192-writing-skill.static.hf.space/#arena) are added automatically.

<!-- BENCH:summary -->
| Configuration | Journal | Sales | Story | **Avg** | 1st places | Human best–worst |
|---|---|---|---|---|---|---|
| StoryScope only 👑 | 8.8 | 8.0 | 8.8 | **8.50** | 9/12 | pending |
| writing-skill + StoryScope | 8.0 | 6.8 | 8.2 | **7.67** | 1/12 | pending |
| No skill (control) | 5.2 | 6.5 | 6.0 | **5.92** | 2/12 | pending |
| writing-skill | 6.0 | 5.0 | 6.8 | **5.92** | 0/12 | pending |
<!-- /BENCH:summary -->

## By genre

Scores are means over both judges and both briefs in the genre (1–10). "Judge P(human)" is the judges' own estimate that a human wrote the piece. Polish lint counts surface tells per 100 words (lower = fewer). For stories, the AI-default index is the share of StoryScope's 30 widest human/AI gaps where the story takes the AI-side value (paper corpus medians: human 0.40, Claude 0.67), and log-odds come from the paper's full classifier; both are relative only (see calibration).

<!-- BENCH:detail -->
#### Journal / blog post

| Configuration | Overall | Reads human | Does the job | Specific | Judge P(human) | Avg rank | Polish lint /100w ↓ | Human best–worst |
|---|---|---|---|---|---|---|---|---|
| StoryScope only | 8.8 | 8.0 | 9.0 | 9.0 | 71% | 1.0 | 0.09 | pending |
| writing-skill + StoryScope | 8.0 | 7.8 | 8.0 | 7.5 | 65% | 2.0 | 0.08 | pending |
| writing-skill | 6.0 | 6.2 | 6.8 | 6.2 | 50% | 3.0 | 0.07 | pending |
| No skill (control) | 5.2 | 4.2 | 6.8 | 5.8 | 29% | 4.0 | 0.24 | pending |

#### Sales copy

| Configuration | Overall | Reads human | Does the job | Specific | Judge P(human) | Avg rank | Polish lint /100w ↓ | Human best–worst |
|---|---|---|---|---|---|---|---|---|
| StoryScope only | 8.0 | 7.8 | 8.5 | 8.0 | 61% | 1.5 | 0.93 | pending |
| writing-skill + StoryScope | 6.8 | 6.8 | 7.5 | 6.5 | 51% | 2.5 | 1.13 | pending |
| No skill (control) | 6.5 | 5.8 | 7.0 | 6.5 | 40% | 2.2 | 1.12 | pending |
| writing-skill | 5.0 | 5.0 | 6.0 | 5.0 | 34% | 3.8 | 0.39 | pending |

#### Short story

| Configuration | Overall | Reads human | Does the job | Specific | Judge P(human) | Avg rank | Polish lint /100w ↓ | StoryScope AI-default index ↓ | Classifier log-odds ↑ | Human best–worst |
|---|---|---|---|---|---|---|---|---|---|---|
| StoryScope only | 8.8 | 8.8 | 8.8 | 9.0 | 74% | 1.5 | 0.94 | 0.00 | 10.8 | pending |
| writing-skill + StoryScope | 8.2 | 8.0 | 8.2 | 8.8 | 66% | 1.8 | 1.05 | 0.05 | 8.1 | pending |
| writing-skill | 6.8 | 7.0 | 7.2 | 7.2 | 57% | 3.0 | 0.90 | 0.07 | 10.2 | pending |
| No skill (control) | 6.0 | 4.5 | 7.5 | 6.8 | 27% | 3.8 | 1.38 | 0.18 | -1.9 | pending |

<!-- /BENCH:detail -->

## Rubric check: neutral re-judging

The main rubric asks judges whether a piece "reads like a skilled human wrote it, rather than generic AI prose (formulaic structure, staged profundity, metaphor clusters, tidy moral endings, slogan-ish triads)". That list overlaps with what the StoryScope skill tells the writer to avoid, so the rubric itself could favour StoryScope. To test this, the same 24 pieces were re-judged with a fresh shuffle and a neutral prompt that never mentions AI ("which would you publish, send or keep reading?", overall 1–10 and rank). Raw scores: `judging-neutral/`.

| Setup | Main rubric avg | Neutral avg | Neutral 1st places | Neutral journal | Neutral sales | Neutral story |
|---|---|---|---|---|---|---|
| StoryScope only | 8.50 | **8.50** | **9/12** | 9.00 | 8.50 | 8.00 |
| No skill (control) | 5.92 | 7.25 | 2/12 | 7.00 | 7.00 | 7.75 |
| writing-skill + StoryScope | 7.67 | 7.08 | 0/12 | 7.25 | 6.75 | 7.25 |
| writing-skill | 5.92 | 6.08 | 1/12 | 6.00 | 5.25 | 7.00 |

What changed:

- StoryScope's lead survives without the AI-tells wording: same average, same 9 of 12 first places, first in all 8 journal and sales judgements.
- The control gains about 1.3 points once judges stop looking for AI tells, and the merged skill drops below it. The merged skill's advantage over the control came mostly from the rubric.
- On short stories, StoryScope's home genre, the neutral judges barely separate it from the control (8.00 vs 7.75), and the control took 2 of 4 first places there. More samples are needed before claiming a fiction advantage.

## Files

| What | Where |
|---|---|
| Briefs | [`briefs.json`](./briefs.json) |
| Outputs | `outputs/<brief>/<setup>.md` — setups: `baseline` (no skill), `writing-skill`, `merged` (writing-skill + StoryScope), `storyscope` |
| Judge scores and notes (unblinded, with the label each judge saw) | `judging/<brief>/{opus,sonnet}-judge.json`, neutral re-judging in `judging-neutral/` |
| StoryScope annotations and classifier scores | `storyscope/<brief>/<setup>.{features,score}.json` |
| Annotator calibration | `storyscope/calibration/` |
| Human reviews | `human-reviews/*.json` |
| Aggregated results | [`results.json`](./results.json) |
| Tools | `tools/` — `polish_lint.py`, `make_blind.py`, `judge_prompt.md`, `aggregate.py`, `ingest_review.py` |

## Calibration of the StoryScope annotator

The paper annotated stories with Gemini 3 Flash. Here a Claude Sonnet annotator was used, blind to the setup. To see how far that shifts the scale, the same annotator rated a Claude Sonnet 4.6 story from the paper's dev set (prompt 5557, ~3,000 words):

| Annotation | AI-default index | P(human), full model |
|---|---|---|
| Paper (Gemini 3 Flash) | 0.80 | 0.000 |
| This benchmark (Claude Sonnet) | 0.53 | 0.097 |

Exact agreement on the 304 features was 63%. This annotator is more lenient, and the benchmark stories are shorter than the paper's, so the absolute numbers here are inflated toward "human". Compare setups with each other, not with the paper.

## Rerun or extend

```bash
python benchmark/tools/make_blind.py <brief> <judge-id> <out-dir> <key.json>   # blind A–D copies
python benchmark/tools/polish_lint.py benchmark/outputs/*/*.md
python benchmark/tools/aggregate.py                                             # results.json + tables
```
