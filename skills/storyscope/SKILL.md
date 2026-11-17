---
name: storyscope
description: Write, revise or diagnose fiction so it does not land in the narrow region where AI stories cluster, using the measured narrative defaults from the StoryScope study (61k stories, 304 features, human vs GPT/Claude/Gemini/DeepSeek/Kimi) and its released human-vs-AI classifier. Use whenever someone asks for a short story, flash fiction, a scene, a chapter, a fable or any narrative; asks why a story "reads like AI"; wants a story to feel more human, less generic or less "Claude-y"; or wants a draft scored. Also use for narrative non-fiction and story-driven copy (brand stories, personal essays, journal posts with a story arc), applying the style-level findings only.
---

# StoryScope

StoryScope (Russell et al., 2026, arXiv:2604.03136) annotated 61,575 stories written to the same 10,272 prompts by human authors and five LLMs with 304 discourse-level features. Narrative features alone separate human from AI stories at 93% macro-F1. More useful for a writer: AI stories from every model pile into **one shared region** of narrative space, while human stories spread out.

This skill turns that into practice. It knows, with numbers, which choices AI fiction makes by default, and it ships the paper's classifier so a draft can be scored by something other than the model that wrote it.

The measured table is in `references/ai-defaults.md` (40 widest gaps). Read it before a substantial fiction task. The summary below is enough for short pieces.

## The AI centroid, in plain terms

These are the widest human/AI gaps. Percentages are "share of AI stories" vs "share of human stories".

1. **Emotion through metaphor and weather, not behaviour.** AI conveys feeling through embodied sensation and imagery (81% vs 39%) and through setting mirroring mood (87% vs 47%). Humans more often show it through what people do and say: a slammed door, a phone call not returned, a joke that lands wrong.
2. **Too much figurative language, and too much of it fresh.** Figurative density "4/5" in 65% of AI stories vs 18% of human. AI images are mostly "fresh and inventive" (65% vs 30%); humans mix stock phrases with a few fresh ones. A sustained extended conceit appears in 83% vs 40%, and a recurring metaphorical motif in 96% vs 69%.
3. **The theme is said out loud.** Explicit thematic statement or moralizing at level 4 in 75% vs 37%; a narrator commenting on what it all means in 76% vs 52%. Dialogue turns into a philosophical debate about the theme (59% vs 34%).
4. **One elevated register throughout.** "Consistently elevated or literary" in 40% vs 11%. Human prose code-switches: slang next to precise description, a flat line after a lyrical one (56% vs 19%).
5. **Earnest, lyrical, humourless.** Earnest or lyrical tone 71% vs 40%; ironic or wry 13% vs 36%. Entirely straight-faced 38% vs 12%.
6. **Audible prose.** Noticeable alliteration/assonance/rhythmic repetition in 91% vs 55%. Parallel and list-like sentences in 99% vs 70%.
7. **Tidy arc, long goodbye.** Protagonist grows or is enlightened (68% vs 44%), resolves things by their own choice (69% vs 46%) or through internal acceptance (47% vs 27%), and the story lingers in an extended denouement (51% vs 15%). Humans more often stop soon after the climax, leave the protagonist unchanged or morally mixed, let chance or other people decide things, and allow catastrophe.
8. **Small cast, everyone named, introduced by description.** 2–3 secondary characters (61% vs 46%), almost everyone given a proper name, central character introduced by appearance/background summary (52% vs 30%). Humans run larger, messier casts, call minor people "the landlord" or "Dev's cousin", and sometimes let a character speak before being described.
9. **Expectations set up, then fulfilled.** 73% vs 53%. Humans subvert set-ups more often (41% vs 24%).
10. **Sealed-off culture.** AI allusion is implicit (archetypes, unnamed myths); human stories name real songs, brands, books, places (pop-culture/brand allusion 40% vs 13%).

No single item is a flaw. A human story can be lyrical and end in acceptance. The tell is a story hitting **most** of them at once, which is what AI drafts do by default (median AI story sits on 67–77% of the top-30 AI defaults; median human story on 40%).

## Writing a new story

Decide a few deliberate departures before drafting, the way an author picks constraints. Pick 4–6 from the list above that suit the brief, for example:

- Emotion is carried by actions and dialogue. Allow at most a handful of figurative images in the whole piece, and let one of them be a stock phrase a person would actually think.
- Nobody states the theme. No character explains what the story means. Cut any closing paragraph that summarises the lesson.
- Mix registers. Let the narrator or a character be funny, petty or wrong at least once.
- End within a short scene of the climax. Let something stay unresolved, or let the outcome come from chance or from another person.
- Add names and textures from the real world: a specific bus route, a brand, a song, a TV show the character half-watches.
- More people, some unnamed. Introduce someone mid-conversation.

Then draft. Then reread once for clusters: if three paragraphs in a row end on an image, or the last line restates the theme, fix that spot rather than rewriting everything.

Keep the brief's genre in charge. A fable is allowed to have a moral; a literary piece may want a lyrical register. Departures are meant to free the story from the default, not to swap one formula (lyrical epiphany) for another (deadpan irony).

## Diagnosing or scoring a draft

When the user wants a draft checked, or when the stakes justify an outside judge:

1. `python scripts/annotation_prompts.py story.md work/prompts` writes the 10 per-dimension prompts the paper used.
2. Answer each prompt honestly as a careful annotator (or hand them to subagents, one dimension each, without telling them which draft is "supposed" to win). Save each answer as `work/answers/<dimension>.json`.
3. `python scripts/merge_annotations.py work/answers work/story.features.json`
4. `python scripts/score_story.py work/story.features.json` prints P(human) from the paper's two binary classifiers (narrative-only and full) and the features pushing hardest toward "AI".
5. `python scripts/ai_default_index.py work/story.features.json` prints the share of the 30 widest gaps the story sits on the AI side of.

Read the results as a diagnosis, then revise the two or three features with the biggest pushes. Re-score after revising.

Caveats to state when reporting scores: the classifiers were trained on ~5,000-word stories annotated by Gemini 3 Flash, so short pieces and other annotators shift the scale. P(human) is close to 0 for almost any AI draft; compare drafts by log-odds and by the AI-default index rather than by a pass/fail threshold. Never present a score as proof of human authorship.

Requires `pip install xgboost numpy` (and `pandas pyarrow` only for `derive_defaults.py` and `--calibrate`).

## Non-fiction and copy

The narrative features (plot, cast, denouement) do not transfer to a sales page. The style findings do: explicit moralizing, high figurative density, extended conceits, constant sound patterning, list-like parallelism and an unbroken earnest register read as AI in essays, journal posts and marketing too. Apply those six as cautions; leave the rest.

## Files

- `references/ai-defaults.md` — the 40 widest human/AI gaps with rates (Claude's own rate included).
- `references/feature_application_prompt.md` — the paper's annotation prompt template.
- `assets/taxonomy.json` — all 304 features. `assets/models/binary_{narrative,full}.json` — released XGBoost classifiers. `assets/ai_defaults_top30.json` — the index definition.
- `scripts/` — prompt builder, merger, scorer, index, and `derive_defaults.py` to rebuild the table from the raw parquet.

Data, taxonomy and models: github.com/jenna-russell/storyscope, MIT licence (see `LICENSE-storyscope`).
