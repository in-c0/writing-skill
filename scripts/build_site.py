#!/usr/bin/env python3
"""Assemble the static site into dist/site: pages, data.json (briefs, outputs, results), prompts, skill zips."""
import json, shutil, zipfile
from pathlib import Path

R = Path(__file__).resolve().parent.parent
OUT = R / "dist" / "site"
if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(R / "site", OUT)
B = R / "benchmark"
res = json.load(open(B / "results.json"))
outputs = {}
for br in res["briefs"]:
    outputs[br["id"]] = {}
    for c in res["configs"]:
        p = B / "outputs" / br["id"] / f"{c}.md"
        if p.exists():
            outputs[br["id"]][c] = p.read_text()
prompts = {p.stem: p.read_text() for p in sorted((R / "prompts").glob("*.md"))}
json.dump({"results": res, "outputs": outputs, "prompts": prompts}, open(OUT / "data.json", "w"), ensure_ascii=False)
dl = OUT / "dl"; dl.mkdir()
for name in ("storyscope", "writing-skill-storyscope", "writing-skill"):
    src = R / "skills" / name
    with zipfile.ZipFile(dl / f"{name}.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(src.rglob("*")):
            if f.is_file() and "__pycache__" not in f.parts:
                z.write(f, Path(name) / f.relative_to(src))
(OUT / "README.md").write_text((R / "site" / "SPACE_README.md").read_text()) if (R / "site" / "SPACE_README.md").exists() else None
print("built", OUT, sorted(p.name for p in dl.iterdir()))
