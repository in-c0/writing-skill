#!/usr/bin/env python3
"""Copy the four outputs for one brief into a blind folder as A–D (seeded shuffle) and record the key.

usage: make_blind.py BRIEF_ID JUDGE_ID OUT_DIR KEY_JSON
"""
import json, random, shutil, sys, hashlib
from pathlib import Path

CFG = ["baseline", "writing-skill", "merged", "storyscope"]
brief, judge, out, keyf = sys.argv[1:5]
R = Path(__file__).resolve().parent.parent
order = CFG[:]
random.Random(int(hashlib.sha256(f"{brief}/{judge}".encode()).hexdigest(), 16)).shuffle(order)
o = Path(out); o.mkdir(parents=True, exist_ok=True)
for lab, c in zip("ABCD", order):
    shutil.copy(R / "outputs" / brief / f"{c}.md", o / f"{lab}.md")
k = json.load(open(keyf)) if Path(keyf).exists() else {}
k[f"{brief}/{judge}"] = dict(zip("ABCD", order))
json.dump(k, open(keyf, "w"), indent=1)
print(o, dict(zip("ABCD", order)))
