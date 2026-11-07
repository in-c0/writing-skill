# Agent instructions

Before substantial writing or rewriting work in this repository, read [`SKILL.md`](./SKILL.md).

Use [`CHECKLIST.md`](./CHECKLIST.md) for the final review.

If the task involves written/spoken variants, audiobook adaptation, equations, code, diagrams, figures, tables, or companion web material, also read [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md).

The main default is:

> Write for the reader, not for the performance of writing.

Preserve a user's existing voice unless they explicitly ask for a new one. Do not automatically make prose more polished, literary, corporate, inspirational, compressed, or rhetorically symmetrical.

## Default workflow: rules first

Use **rules-first generation** by default for substantial writing and rewriting:

1. Read `SKILL.md` and any relevant extension.
2. Understand the brief, audience, genre, source material, and constraints.
3. Write or revise with those rules active from the start.
4. Run `CHECKLIST.md` before delivery.

Do not routinely generate several workflow variants when the user asked for one piece of writing.

## Experimental workflows

**Draft → review** and **Hybrid** are experimental modes. Use them when the user explicitly asks to compare prompting strategies, when evaluating the skill, or when a concrete diagnostic question makes the comparison useful.

For experimental iterative review, preserve the baseline draft, make only corrections justified by a real reader-facing problem, allow a rule check to conclude that no change is needed, and periodically reread the whole passage so local edits do not destroy global voice or flow.

Specific user instructions override the defaults in this repository.

## Installable skills and the benchmark

`skills/` holds the installable skill folders. `skills/storyscope/` is hand-maintained; `skills/writing-skill/` and `skills/writing-skill-storyscope/` are built from the root rulebook and `skills/_src/` by `python scripts/build_skills.py`, so edit the sources and rebuild rather than editing the built copies.

`benchmark/` holds the comparison of the skills. After adding outputs, judge files or human reviews, run `python benchmark/tools/aggregate.py` to refresh `results.json` and the tables in `README.md` and `benchmark/BENCHMARK.md`.
