#!/usr/bin/env python3
"""Validate a human review from a GitHub issue body (env BODY, AUTHOR, NUM) and save it to benchmark/human-reviews/."""
import json, os, re
from pathlib import Path

B = Path(__file__).resolve().parent.parent
CFG = {"baseline", "writing-skill", "merged", "storyscope"}
briefs = {b["id"] for b in json.load(open(B / "briefs.json"))}
ok = False
m = re.search(r"```json\s*(\{.*?\})\s*```", os.environ.get("BODY", ""), re.S)
if m:
    try:
        d = json.loads(m.group(1))
        picks = {k: v for k, v in d.get("picks", {}).items()
                 if k in briefs and v.get("best") in CFG and v.get("worst") in CFG and v["best"] != v["worst"] and set(v.get("shown", [])) <= CFG}
        if picks:
            out = {"reviewer": os.environ.get("AUTHOR"), "source": f"issue #{os.environ.get('NUM')}", "picks": picks,
                   "seconds": {k: int(v) for k, v in d.get("seconds", {}).items() if k in picks}, "at": d.get("at")}
            (B / "human-reviews").mkdir(exist_ok=True)
            json.dump(out, open(B / "human-reviews" / f"issue-{os.environ.get('NUM')}.json", "w"), indent=1)
            ok = True
    except Exception as e:
        print("parse error:", e)
with open(os.environ.get("GITHUB_OUTPUT", "/dev/null"), "a") as f:
    f.write(f"ok={'true' if ok else 'false'}\n")
print("ok" if ok else "no valid picks")
