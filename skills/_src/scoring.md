# Scoring a story with StoryScope

1. `python scripts/annotation_prompts.py story.md work/prompts` writes the 10 per-dimension prompts the StoryScope paper used.
2. Answer each as a careful annotator (or give each to a separate subagent that does not know which draft is expected to win). Save as `work/answers/<dimension>.json`.
3. `python scripts/merge_annotations.py work/answers work/story.features.json`
4. `python scripts/score_story.py work/story.features.json` → P(human) from the paper's narrative-only and full XGBoost classifiers, plus the features pushing most toward "AI".
5. `python scripts/ai_default_index.py work/story.features.json` → share of the 30 widest human/AI gaps where the story takes the AI-side value (corpus medians: human 0.40, Claude 0.67, GPT 0.77).

Caveats: the classifiers were trained on ~5,000-word stories annotated by Gemini 3 Flash; short pieces and other annotators shift the scale. Nearly every AI draft gets P(human) near 0, so compare drafts by log-odds and the index, never as proof of authorship.

Needs `pip install xgboost numpy`.
