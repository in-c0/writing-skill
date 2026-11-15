#!/usr/bin/env python3
"""Conservative candidate-span finder for Korean editorial review (not AI detection)."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

# Narrow high-confidence indicators, not a complete taxonomy.
PATTERNS = (
    ("translationese_location", re.compile(r"에 있어서"), "Check whether a simpler locative fits."),
    ("translationese_relation", re.compile(r"와 관련하여|과 관련하여"), "Check for an overextended relation phrase."),
    ("double_passive", re.compile(r"되어진(?:다|것|다고|다면)|보여진(?:다|것|다고|다면)"), "Check passive voice; preserve the actual agent."),
    ("stock_conclusion", re.compile(r"시사하는 바가 크다|결론적으로"), "Check whether the transition adds meaning."),
)

FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
INLINE_CODE = re.compile(r"`[^`]*`")
URL = re.compile(r"https?://[^\s)]+")
QUOTED = re.compile(r'“[^”]*”|"[^"\n]*"')


def _blank_matched(text: str, pattern: re.Pattern[str]) -> str:
    return pattern.sub(lambda m: " " * (m.end() - m.start()), text)


def audit(text: str) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    fence_char = ""
    fence_width = 0
    for line_number, line in enumerate(text.splitlines(), 1):
        fence = FENCE.match(line)
        if fence:
            marker = fence.group(1)
            if not fence_char:
                fence_char, fence_width = marker[0], len(marker)
            elif marker[0] == fence_char and len(marker) >= fence_width:
                fence_char, fence_width = "", 0
            continue
        if fence_char or line.lstrip().startswith((">", "#!")):
            continue
        masked = line
        for token in (INLINE_CODE, URL, QUOTED):
            masked = _blank_matched(masked, token)
        for category, pattern, rationale in PATTERNS:
            for match in pattern.finditer(masked):
                findings.append({
                    "line": line_number,
                    "column": match.start() + 1,
                    "category": category,
                    "span": line[match.start():match.end()],
                    "guidance": rationale,
                })
    return findings


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="UTF-8 text/Markdown file")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    args = parser.parse_args()
    findings = audit(args.input.read_text(encoding="utf-8"))
    if args.format == "json":
        print(json.dumps({"candidates": findings, "count": len(findings)}, ensure_ascii=False, indent=2))
    else:
        print(f"{len(findings)} candidate(s); manual review required")
        for item in findings:
            print(f"{item['line']}:{item['column']} [{item['category']}] {item['span']} — {item['guidance']}")


if __name__ == "__main__":
    main()
