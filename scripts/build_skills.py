#!/usr/bin/env python3
"""Build installable skill folders under skills/ from the root rulebook.

skills/writing-skill/            root SKILL.md + CHECKLIST.md + extensions/
skills/storyscope/               hand-written (source of truth for StoryScope assets)
skills/writing-skill-storyscope/ writing-skill + skills/_src/storyscope-layer.md + StoryScope assets

Run after editing SKILL.md, CHECKLIST.md, extensions/ or skills/_src/.
"""
import shutil
from pathlib import Path

R = Path(__file__).resolve().parent.parent
S = R / "skills"
ROOT = (R / "SKILL.md").read_text()
FM_WS = """---
name: writing-skill
description: Rulebook for clear, natural, reader-first prose that avoids AI-polish (aphorisms, triads, "not X but Y", metaphor clusters, inspirational closers) while preserving the writer's voice. Use for any substantial writing or rewriting — blog and journal posts, docs, tutorials, emails, essays, landing and sales copy, scripts — and whenever someone says a text sounds robotic, generic, over-polished or "like ChatGPT/Claude".
---

"""
FM_MERGED = """---
name: writing-skill-storyscope
description: Reader-first writing rulebook plus StoryScope's measured map of where AI text converges (61k stories, human vs 5 LLMs) and its human-vs-AI story classifier. Use for any substantial writing or rewriting — short stories and fiction, journal and blog posts, essays, sales and landing copy, emails, docs — especially when the text must not read as AI-written, generic, over-polished or "Claude-y", or when a story draft should be scored.
---

"""


def fresh(d):
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)


def common(d):
    shutil.copy(R / "CHECKLIST.md", d / "CHECKLIST.md")
    shutil.copytree(R / "extensions", d / "extensions")


ws = S / "writing-skill"; fresh(ws); common(ws)
(ws / "SKILL.md").write_text(FM_WS + ROOT)

m = S / "writing-skill-storyscope"; fresh(m); common(m)
(m / "SKILL.md").write_text(FM_MERGED + ROOT.rstrip() + "\n" + (S / "_src" / "storyscope-layer.md").read_text())
ss = S / "storyscope"
for sub in ("assets", "scripts"):
    shutil.copytree(ss / sub, m / sub, ignore=shutil.ignore_patterns("__pycache__"))
(m / "references").mkdir()
shutil.copy(ss / "references" / "ai-defaults.md", m / "references")
shutil.copy(S / "_src" / "scoring.md", m / "references" / "scoring.md")
shutil.copy(ss / "LICENSE-storyscope", m)
print("built:", ", ".join(p.name for p in (ws, m)))
