#!/usr/bin/env python3
"""Write the 10 StoryScope per-dimension annotation prompts for one story.

Reproduces the prompt built by storyscope/5_feature_application/apply_features.py
(github.com/jenna-russell/storyscope, MIT). Hand each prompt to a model (or a
subagent), save each JSON answer, then merge them with merge_annotations.py and
score with score_story.py.

usage: annotation_prompts.py STORY.md OUT_DIR
"""
import json, sys
from pathlib import Path

ASSETS = Path(__file__).resolve().parent.parent / "assets"


def main():
    story = Path(sys.argv[1]).read_text()
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    tax = json.load(open(ASSETS / "taxonomy.json"))["feature_taxonomy"]
    for key, dim in tax.items():
        specs = []
        for asp in dim["aspects"].values():
            for f in asp["features"]:
                vals = ", ".join(str(v) for v in f["values"][:10])
                if len(f["values"]) > 10:
                    vals += f" (+ {len(f['values']) - 10} more)"
                specs.append(f"**{f['id']}** [{f['type']}]: {f['question']}")
                specs.append(f"  → Values: {vals}")
                if f.get("condition"):
                    specs.append(f"  → Condition: {f['condition']}")
        name = dim.get("dimension_name", key)
        prompt = f"""You are a literary analyst specializing in {name.lower()}.

Extract structured features about **{name}** from the story below.
Focus area: {dim.get('dimension_description', '')}

# FEATURES TO EXTRACT

For each feature, select the appropriate value(s) from the allowed options.

**Response format rules:**
- For "binary" features: respond with exactly "yes" or "no"
- For "categorical" features: respond with exactly ONE value from the list
- For "ordinal" features: respond with exactly ONE value from the list
- For "multi_select" features: respond with a JSON array of ALL applicable values
- For "scale" features: respond with an integer within the specified range
- ONLY use values from the provided lists
- If a feature has a condition that is not met, use "n/a"
- **Never use null or omit a key** — every feature must have a value

{chr(10).join(specs)}

# STORY TO ANALYZE

<story>
{story}
</story>

# OUTPUT

Return a single JSON object with feature IDs as keys.
"""
        (out / f"{key}.prompt.md").write_text(prompt)
    print(f"wrote {len(tax)} prompts to {out}")


if __name__ == "__main__":
    main()
