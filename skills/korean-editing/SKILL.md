---
name: korean-editing
description: Conservative Korean editorial review for translationese, repetitive AI-like phrasing, and clarity, while protecting meaning, genre and register.
---

# Korean editing — evidence-first pass

Use when asked to polish Korean prose, remove unnatural translationese, or refine a Korean translation. This is **not** an AI-authorship classifier or an instruction to disguise provenance. For proofreading only, fix just spelling and spacing. For user-requested substantive rewriting, clarify the different scope in the edit notes.

## Workflow

1. **Establish contract.** Record intended audience, purpose, genre (chat, product, documentation, essay, academic, legal), register (해요체 / 합니다체 / 해체), and requested edit intensity. Defaults: retain the source's genre and formality; make minimal edits. Treat English-Korean bilingual terminology as deliberate unless it is actually distracting.
2. **Freeze content anchors.** Identify dates, numbers, units, named entities, product identifiers, technical terms, URLs, quoted language, legal phrasing, and each claim's subject / relation / object. Protect headings and lists where structure conveys information. Preserve source uncertainty (`가능하다`, `추정`, `일 수 있다`) and normative force (`해야 한다`, `권고`).
3. **Diagnose specific spans, not presumed authorship.** Use the following conditional checks. Report the location and why it may be unnatural; do not globally replace every matched phrase.
   - Overextended nominal phrases: `~에 있어서`, `~와 관련하여`, or `~에 대한` where a direct particle is clearer.
   - Repeated `~를 통해`, `~에 기반하여`, `~할 수 있다`: check each instance for actual instrumentality, evidential basis, or possibility. Keep when semantically needed.
   - Inflated passive forms such as `되어진다` or `보여진다`: simplify only if agency and meaning remain intact.
   - Repetitive lead-ins `또한`, `따라서`, `결론적으로`, or boilerplate significance claims: remove only redundant transitions and retain warranted conclusions.
   - Forced pronouns (`이는`, `그것`, `그들`): omit only when antecedent stays unambiguous. Keep quotations and deliberate contrast.
   - Mechanical parallel structures, unvarying sentence endings, parenthetical English explanations, typography or emoji excess: adjust based on genre; preserve instructional lists and marketing voice when intended.
   - Unnatural metaphors or borrowed management vocabulary (`렌즈`, `축`, `레버리지`): **context first**; these can be valid established terms.
4. **Edit locally.** Prefer deleting filler or untangling syntax to introducing new synonyms or rhetorical flourishes. Do not manufacture statistics, add unsupported claims, inflate confidence, or change tense/aspect. Revisit one paragraph at a time and minimize the touched area.
5. **Verify.** Compare original and revised sentences directly. Check protected anchors, quantitative claims, scope, modality, negation, quotations, actor/action, genre, and register. If a sentence is ambiguous, preserve it and flag it for human review. Do **not** claim a deterministic check passed unless it actually ran.
6. **Deliver.** Show the edited text followed by a compact change log (`original → revised — rationale`). For high-stakes or extensive changes, separately list unresolved meaning questions and the verification performed.

## Effort routing

- **Light:** already clear / short copy → minimal local edits and source comparison.
- **Standard:** multiple candidates → short diagnosis, one focused editing pass, original/revision comparison.
- **Deep:** legal, scientific, publication-ready, or ambiguity-sensitive prose → claim-by-claim audit and explicit unresolved items. Never silently reclassify speculation as fact.

Use `python3 scripts/korean_audit.py --input <file> --format json` from the repository root when source is a local text file. Treat its result as **heuristic candidates only**; it does not rewrite text, detect AI authorship, compute semantic equivalence, or measure perceived naturalness.

## Stop/rollback conditions

- A number, name, quote, URL, unit, date, or technical identifier changes without authorization.
- Possibility turns into certainty, a recommendation turns into a requirement, or a negation/condition disappears.
- Register or genre changes without user intent.
- The rewrite adds a claim or causal relationship absent from the source.

Restore the offending sentence instead of polishing past uncertainty.

## Upstream acknowledgement

Conceptual inspiration: [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai) (MIT, © 2026 epoko77-ai), especially its translationese categories, minimal-edit approach, semantic anchors, and distinction between humanization and provenance. This skill is independently written, intentionally smaller, and makes no claim to reproduce upstream accuracy or tests.
