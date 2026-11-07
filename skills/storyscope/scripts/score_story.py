#!/usr/bin/env python3
"""Score StoryScope feature annotations with the paper's released XGBoost classifiers.

Input: a JSON file mapping feature IDs (e.g. "STY_FIG_001") to values, or
{"features": {...}}. Several files may be passed.
Output: P(human-written) from the narrative-only and full models, plus the
features pushing the score most toward "AI" (per-story SHAP contributions).

Adapted from github.com/jenna-russell/storyscope (MIT, (c) 2026 Jenna Russell).
"""
import argparse, json, re, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
NA_CODE = -1


def norm(s):
    s = str(s).strip().lower()
    s = re.sub(r"\s*\([^)]*\)", "", s)
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def best_match(raw, allowed):
    r = norm(raw)
    for c in allowed:
        if norm(c) == r:
            return c
    m = re.match(r"^(\d+)", r)
    if m:
        for c in allowed:
            cm = re.match(r"^(\d+)", norm(c))
            if cm and cm.group(1) == m.group(1):
                return c
    for c in allowed:
        cn = norm(c)
        if r.startswith(cn) or cn.startswith(r):
            return c
    rt = set(r.split("_")); best, bc = 0, None
    for c in allowed:
        ct = set(norm(c).split("_"))
        sc = len(rt & ct) / max(len(rt), len(ct)) if ct else 0
        if sc > best:
            best, bc = sc, c
    return bc if best >= 0.33 else None


def load_tax():
    t = json.load(open(ASSETS / "taxonomy.json"))["feature_taxonomy"]
    feats = []
    for dk, dd in t.items():
        for ad in dd["aspects"].values():
            for f in ad["features"]:
                feats.append(dict(f, dim=dk))
    return feats


def encode(values, feats, exclude=()):
    row, names = [], []
    for f in feats:
        if f["dim"] in exclude:
            continue
        allowed = [str(v) for v in f["values"]]
        x = values.get(f["id"])
        if x is None:
            s = None
        else:
            parts = [str(v) for v in x] if isinstance(x, list) else (str(x).split("|") if f["type"] == "multi_select" else [str(x)])
            if parts == ["n/a"]:
                s = "n/a"
            else:
                s = frozenset(m for m in (p if p in allowed else best_match(p, allowed) for p in parts if p and p != "n/a") if m)
        if f["type"] == "multi_select":
            s2 = frozenset() if s == "n/a" else s
            for v in allowed:
                row.append(np.nan if s2 is None else float(v in s2)); names.append(f"{f['id']}__{v}")
        else:
            if s is None:
                row.append(np.nan)
            elif s == "n/a":
                row.append(NA_CODE)
            else:
                first = next((v for v in allowed if v in s), None)
                row.append(np.nan if first is None else allowed.index(first))
            names.append(f["id"])
    return np.array([row], dtype=np.float32), names


def main():
    import xgboost as xgb
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--top", type=int, default=8)
    a = ap.parse_args()
    feats = load_tax(); fmeta = {f["id"]: f for f in feats}
    models = {}
    for name, excl in (("narrative", ("style",)), ("full", ())):
        b = xgb.Booster(); b.load_model(str(ASSETS / "models" / f"binary_{name}.json"))
        models[name] = (b, excl)
    out = []
    for fp in a.files:
        d = json.load(open(fp)); vals = d.get("features", d)
        res = {"file": fp, "coverage": sum(1 for f in feats if f["id"] in vals) / len(feats)}
        for name, (b, excl) in models.items():
            X, names = encode(vals, feats, excl)
            dm = xgb.DMatrix(X, feature_names=names)
            p = float(b.predict(dm)[0])
            contrib = b.predict(dm, pred_contribs=True)[0][:-1]
            order = np.argsort(contrib)[: a.top]  # most negative = pushes toward AI
            res[f"p_human_{name}"] = round(p, 4)
            res[f"ai_tells_{name}"] = [
                {"feature": n.split("__")[0], "name": fmeta[n.split("__")[0]]["name"], "value": vals.get(n.split("__")[0]), "push": round(float(contrib[i]), 3)}
                for i, n in ((i, names[i]) for i in order) if contrib[i] < 0
            ]
        out.append(res)
    if a.json:
        print(json.dumps(out, indent=1, ensure_ascii=False)); return
    for r in out:
        print(f"{r['file']}  coverage={r['coverage']:.0%}  P(human): narrative={r['p_human_narrative']:.3f}  full={r['p_human_full']:.3f}")
        for t in r["ai_tells_full"]:
            print(f"   AI-tell  {t['push']:+.2f}  {t['name']} = {t['value']}")

if __name__ == "__main__":
    main()
