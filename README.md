# writing-skill

A practical rulebook for agents that need to write clear, natural prose without defaulting to over-polished, generic AI copy.

The central principle is simple:

> Write for the reader, not for the performance of writing.

The skill is especially useful for:

- educational writing,
- technical explanations,
- textbooks and learning resources,
- professional communication,
- documentation,
- nonfiction prose,
- scripts and narration,
- multimodal publishing across print, ebook, audiobook, and companion web material,
- and editing existing human-written text without erasing its voice.

## Files

- [`SKILL.md`](./SKILL.md) — canonical agent-facing rulebook.
- [`CHECKLIST.md`](./CHECKLIST.md) — compact preflight and revision checklist.
- [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md) — adaptation rules for written vs spoken versions, equations, code, diagrams, tables, figures, companion material, and alternative rule-application workflows.

## What this skill tries to prevent

A common failure mode in AI-assisted writing is that the revision becomes more polished while becoming less alive. Typical symptoms include:

- too many aphorisms,
- abstract noun stacking,
- constant rhetorical contrasts,
- every paragraph having a neat takeaway,
- unnecessary metaphors,
- generic motivational language,
- over-segmented paragraphs,
- audience-persona enumeration,
- inflated promises,
- and prose that sounds designed to be quoted rather than simply understood.

This skill treats those as editing risks, not as universal bans.

## Default writing target

For most explanatory and educational prose, aim for the feeling that a knowledgeable person is sitting beside the reader and explaining the subject naturally.

That often means:

- keeping some ordinary sentences,
- repeating important terms instead of constantly finding synonyms,
- using concrete situations,
- allowing useful redundancy,
- giving the reader recovery paths,
- keeping rhetorical devices sparse,
- and preserving the source voice during revision.

## Written, spoken, and visual forms

When material will exist in more than one medium, do not force identical wording across formats.

Use a shared core narrative, then adapt it to the medium:

- written/visual versions can use equations, code, diagrams, tables, layout, and cross-reference;
- spoken versions should explain the underlying idea in a form that works by ear;
- exact visual or interactive material can live in the written edition and/or companion website;
- the audiobook should still communicate the core idea without requiring the listener to stare at a screen.

See [`extensions/WRITTEN_SPOKEN.md`](./extensions/WRITTEN_SPOKEN.md).

## Try different rule-application workflows

Do not assume there is one universally best prompting strategy.

The extension defines three useful experiments:

- **Rules first** — show the agent the rules before generation.
- **Draft first, then review** — generate a natural baseline, then inspect and revise it against the rules one item at a time.
- **Hybrid** — provide the core principles before generation and apply detailed review afterward.

When quality matters, generate more than one version from the same brief and compare the results. Judge clarity, naturalness, usefulness, voice, genre fit, recoverability, spoken rhythm, and factual fidelity—not just polish.

## Usage

Agents should read `SKILL.md` before substantial writing or rewriting tasks where naturalness, clarity, teaching quality, or voice preservation matters.

Use `CHECKLIST.md` as the final review before delivery.

If the task involves audiobook narration, spoken adaptation, equations, code, diagrams, figures, tables, or companion web material, also read `extensions/WRITTEN_SPOKEN.md`.

Specific user instructions always override the defaults in this repository.
