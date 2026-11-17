#!/usr/bin/env python3
"""Count surface "AI-polish" signatures per 100 words. Crude by design: a lint, not a judge.

Signals (each is a regex count):
  em_dash        — em dashes (and spaced double hyphens)
  not_x_but_y    — "not X, but Y" / "isn't just X" / "It's not X. It's Y" contrasts
  triad          — "A, B, and C" lists of three short items
  stock_words    — a fixed list of words over-used by LLMs (tapestry, testament, delve, ...)
  punch_paras    — one-sentence paragraphs under 8 words (the "short punchline" beat)
usage: polish_lint.py FILE.md [...]  (--json for machine output)
"""
import json, re, sys

STOCK = r"\b(tapestry|testament|delve|delving|realm|landscape|journey|navigate|navigating|elevate|seamless|seamlessly|unlock|embark|vibrant|resonate|resonates|profound|liminal|whisper(?:ed|s)?|symphony|beacon|intricate|meticulous|crafted|bustling|ever-evolving|game-changer|embrace|testimony|unwavering|kaleidoscope)\b"
PAT = {
    "em_dash": r"—|\s--\s",
    "not_x_but_y": r"\bnot (?:just |only |merely |simply )?[^.,;]{1,40}, but\b|\b(?:isn't|is not|wasn't|was not) (?:just|only|merely|about)\b|\bIt(?:'s| is| was)n(?:'|o)t [^.]{1,40}\. It(?:'s| is| was)\b",
    "triad": r"\b\w+(?: \w+)?, \w+(?: \w+)?,? and \w+(?: \w+)?\b",
    "stock_words": STOCK,
}


def lint(text):
    body = re.sub(r"^#.*$", "", text, flags=re.M)
    words = len(re.findall(r"\b[\w'’]+\b", body)) or 1
    c = {k: len(re.findall(p, body, flags=re.I)) for k, p in PAT.items()}
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip() and not p.strip().startswith(("-", "*", "|"))]
    c["punch_paras"] = sum(1 for p in paras if len(re.findall(r"[.!?]", p)) <= 1 and len(p.split()) < 8)
    total = sum(c.values())
    return {"words": words, **c, "per_100w": round(100 * total / words, 2)}


if __name__ == "__main__":
    js = "--json" in sys.argv
    res = {f: lint(open(f).read()) for f in sys.argv[1:] if f != "--json"}
    if js:
        print(json.dumps(res, indent=1))
    else:
        for f, r in res.items():
            print(f"{r['per_100w']:5.2f}/100w  {f}  {r}")
