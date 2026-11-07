#!/usr/bin/env python3
"""AI-default index: share of the 30 widest human/AI gaps where a story takes the AI-modal value.

0.0 = never on the AI default, 1.0 = on every one. In the StoryScope corpus the
human median sits far below the AI median (run --calibrate to see it).

usage: ai_default_index.py FEATURES.json [...]   |   ai_default_index.py --calibrate PARQUET
"""
import json, sys
from pathlib import Path

TOP = json.load(open(Path(__file__).resolve().parent.parent / "assets" / "ai_defaults_top30.json"))


def hit(val, row):
    if val is None:
        return None
    vals = val if isinstance(val, list) else str(val).split("|")
    vals = [str(v).strip() for v in vals]
    a = str(row["ai_val"])
    return any(v == a or v.split(" ")[0] == a.split(" ")[0] for v in vals)


def index(feats):
    hs = [hit(feats.get(r["id"]), r) for r in TOP]
    hs = [h for h in hs if h is not None]
    return (sum(hs) / len(hs)) if hs else float("nan"), [r["name"] for r, h in zip(TOP, [hit(feats.get(r["id"]), r) for r in TOP]) if h]


if sys.argv[1] == "--calibrate":
    import pandas as pd
    df = pd.read_parquet(sys.argv[2])
    for src, g in df.groupby("source"):
        xs = g.head(2000).apply(lambda r: index(r.to_dict())[0], axis=1)
        print(f"{src:9s} median={xs.median():.2f}  p10={xs.quantile(.1):.2f}  p90={xs.quantile(.9):.2f}")
    sys.exit()
for fp in sys.argv[1:]:
    d = json.load(open(fp)); d = d.get("features", d)
    i, hits = index(d)
    print(f"{fp}: AI-default index {i:.2f}  ({len(hits)}/30)")
