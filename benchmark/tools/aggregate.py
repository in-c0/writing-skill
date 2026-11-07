#!/usr/bin/env python3
"""Aggregate every benchmark signal into benchmark/results.json and the README/BENCHMARK tables.

Inputs (all in benchmark/):
  outputs/<brief>/<config>.md        generated pieces
  judging/<brief>/<judge>.json       unblinded AI-judge scores (config -> scores)
  storyscope/<brief>/<config>.*      StoryScope annotations + classifier scores (stories only)
  human-reviews/*.json               best/worst picks from humans (site or GitHub issue)
Output: results.json, and tables between <!-- BENCH:... --> markers in README.md and benchmark/BENCHMARK.md
"""
import json, math, re, statistics as st, sys
from pathlib import Path

B = Path(__file__).resolve().parent.parent
ROOT = B.parent
sys.path.insert(0, str(B / "tools"))
from polish_lint import lint

CFG = ["baseline", "writing-skill", "merged", "storyscope"]
LABEL = {"baseline": "No skill (control)", "writing-skill": "writing-skill", "merged": "writing-skill + StoryScope", "storyscope": "StoryScope only"}
GENRES = {"journal": "Journal / blog post", "sales": "Sales copy", "story": "Short story"}
briefs = json.load(open(B / "briefs.json"))
mean = lambda xs: round(st.mean(xs), 2) if xs else None

res = {"configs": LABEL, "genres": GENRES, "briefs": briefs, "per_genre": {}, "per_brief": {}}
humans = []
for f in sorted((B / "human-reviews").glob("*.json")):
    try:
        humans.append(json.load(open(f)))
    except Exception:
        pass
res["human_reviewers"] = len(humans)

for g in GENRES:
    acc = {c: {"overall": [], "human": [], "job": [], "specific": [], "p_human": [], "rank": [], "lint": [], "ssi": [], "logit_full": [], "logit_narr": [], "hbest": 0, "hworst": 0, "hn": 0} for c in CFG}
    for br in [b for b in briefs if b["genre"] == g]:
        pb = {}
        for c in CFG:
            p = B / "outputs" / br["id"] / f"{c}.md"
            if not p.exists():
                continue
            L = lint(p.read_text()); acc[c]["lint"].append(L["per_100w"])
            pb[c] = {"lint": L, "judges": {}}
        for jf in sorted((B / "judging" / br["id"]).glob("*.json")):
            d = json.load(open(jf))
            for c, s in d.items():
                if c not in acc:
                    continue
                for k in ("overall", "human", "job", "specific", "p_human", "rank"):
                    acc[c][k].append(s[k])
                pb[c]["judges"][jf.stem] = s
        for c in CFG:
            sf = B / "storyscope" / br["id"] / f"{c}.score.json"
            if sf.exists():
                s = json.load(open(sf))
                acc[c]["ssi"].append(s["ai_default_index"])
                for k, m in (("logit_full", "p_human_full"), ("logit_narr", "p_human_narrative")):
                    p = min(max(s[m], 1e-6), 1 - 1e-6); acc[c][k].append(math.log(p / (1 - p)))
                pb[c]["storyscope"] = s
        for h in humans:
            pick = h.get("picks", {}).get(br["id"])
            if not pick:
                continue
            for c in pick.get("shown", CFG):
                if c in acc:
                    acc[c]["hn"] += 1
            if pick.get("best") in acc: acc[pick["best"]]["hbest"] += 1
            if pick.get("worst") in acc: acc[pick["worst"]]["hworst"] += 1
        res["per_brief"][br["id"]] = pb
    out = {}
    for c in CFG:
        a = acc[c]
        out[c] = {k: mean(a[k]) for k in ("overall", "human", "job", "specific", "p_human", "rank", "lint", "ssi", "logit_full", "logit_narr")}
        out[c]["human_bws"] = round(100 * (a["hbest"] - a["hworst"]) / a["hn"]) if a["hn"] else None
        out[c]["human_n"] = a["hn"]
        out[c]["firsts"] = sum(1 for r in a["rank"] if r == 1)
        out[c]["n_judgements"] = len(a["rank"])
    res["per_genre"][g] = out

# composite: mean AI-judge overall across genres, human BWS used when present
def comp(c):
    xs = [res["per_genre"][g][c]["overall"] for g in GENRES if res["per_genre"][g][c]["overall"] is not None]
    return round(st.mean(xs), 2) if xs else None
res["overall"] = {c: {"judge_overall": comp(c), "firsts": sum(res["per_genre"][g][c]["firsts"] for g in GENRES),
                      "judgements": sum(res["per_genre"][g][c]["n_judgements"] for g in GENRES)} for c in CFG}
# neutral-rubric re-judging (judging-neutral/<brief>/*.json): same pieces, prompt never mentions AI
neu = {c: {"all": [], "firsts": 0, **{g: [] for g in GENRES}, **{g + "_f": 0 for g in GENRES}} for c in CFG}
for br in briefs:
    for jf in sorted((B / "judging-neutral" / br["id"]).glob("*.json")):
        for c, s in json.load(open(jf)).items():
            if c in neu:
                neu[c]["all"].append(s["overall"]); neu[c][br["genre"]].append(s["overall"]); neu[c]["firsts"] += s["rank"] == 1; neu[c][br["genre"] + "_f"] += s["rank"] == 1
for c in CFG:
    res["overall"][c]["neutral_overall"] = mean(neu[c]["all"])
    res["overall"][c]["neutral_firsts"] = neu[c]["firsts"]
    res["overall"][c]["neutral_judgements"] = len(neu[c]["all"])
    for g in GENRES:
        res["per_genre"][g][c]["neutral_overall"] = mean(neu[c][g])
        res["per_genre"][g][c]["neutral_firsts"] = neu[c][g + "_f"]
res["ranking"] = sorted(CFG, key=lambda c: -(res["overall"][c]["judge_overall"] or 0))
res["winner_by_genre"] = {g: max(CFG, key=lambda c: res["per_genre"][g][c]["overall"] or 0) for g in GENRES}
json.dump(res, open(B / "results.json", "w"), indent=1)

# ---- tables
f = lambda x, d=1: "–" if x is None else f"{float(x):.{d}f}"
def table():
    L = ["| Configuration | Journal | Sales | Story | **Avg** | 1st places | Human best–worst |", "|---|---|---|---|---|---|---|"]
    for c in res["ranking"]:
        hb = [res["per_genre"][g][c]["human_bws"] for g in GENRES if res["per_genre"][g][c]["human_bws"] is not None]
        crown = " 👑" if c == res["ranking"][0] else ""
        L.append(f"| {LABEL[c]}{crown} | " + " | ".join(f(res["per_genre"][g][c]["overall"]) for g in GENRES) +
                 f" | **{f(res['overall'][c]['judge_overall'],2)}** | {res['overall'][c]['firsts']}/{res['overall'][c]['judgements']} | " +
                 (f"{round(st.mean(hb)):+d}" if hb else "pending") + " |")
    return "\n".join(L)
def detail():
    L = []
    for g, gn in GENRES.items():
        L += [f"#### {gn}", "", "| Configuration | Overall | Reads human | Does the job | Specific | Judge P(human) | Avg rank | Polish lint /100w ↓ |" + (" StoryScope AI-default index ↓ | Classifier log-odds ↑ |" if g == "story" else "") + " Human best–worst |",
              "|---|---|---|---|---|---|---|---|" + ("---|---|" if g == "story" else "") + "---|"]
        for c in sorted(CFG, key=lambda c: -(res["per_genre"][g][c]["overall"] or 0)):
            r = res["per_genre"][g][c]
            row = f"| {LABEL[c]} | {f(r['overall'])} | {f(r['human'])} | {f(r['job'])} | {f(r['specific'])} | {f(r['p_human'],0)}% | {f(r['rank'])} | {f(r['lint'],2)} |"
            if g == "story":
                row += f" {f(r['ssi'],2)} | {f(r['logit_full'])} |"
            row += (f" {r['human_bws']:+d} (n={r['human_n']}) |" if r["human_bws"] is not None else " pending |")
            L.append(row)
        L.append("")
    return "\n".join(L)
for target in (ROOT / "README.md", B / "BENCHMARK.md"):
    if not target.exists():
        continue
    t = target.read_text()
    t = re.sub(r"(<!-- BENCH:summary -->).*?(<!-- /BENCH:summary -->)", lambda m: m.group(1) + "\n" + table() + "\n" + m.group(2), t, flags=re.S)
    t = re.sub(r"(<!-- BENCH:detail -->).*?(<!-- /BENCH:detail -->)", lambda m: m.group(1) + "\n" + detail() + "\n" + m.group(2), t, flags=re.S)
    t = re.sub(r"(<!-- BENCH:reviewers -->).*?(<!-- /BENCH:reviewers -->)", lambda m: m.group(1) + str(res["human_reviewers"]) + m.group(2), t, flags=re.S)
    target.write_text(t)
print(json.dumps({"ranking": res["ranking"], "overall": res["overall"], "winner_by_genre": res["winner_by_genre"]}, indent=1))
