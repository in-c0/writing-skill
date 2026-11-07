#!/usr/bin/env python3
"""Merge per-dimension JSON answers (*.json, fenced or bare) into one features file.

usage: merge_annotations.py DIR_WITH_DIMENSION_JSONS OUT.features.json
"""
import json, re, sys
from pathlib import Path

feats = {}
for p in sorted(Path(sys.argv[1]).glob("*.json")):
    t = p.read_text()
    m = re.search(r"\{.*\}", t, re.S)
    if m:
        feats.update(json.loads(m.group(0)))
Path(sys.argv[2]).write_text(json.dumps({"features": feats}, indent=1, ensure_ascii=False))
print(f"{len(feats)} features -> {sys.argv[2]}")
