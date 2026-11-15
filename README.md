# writing-skill

Reusable writing guidance for drafting and editing, with a Korean-language quality pass.

## Korean editing

The `skills/korean-editing/SKILL.md` module is a **conservative editing workflow**, not an AI-origin detector. It draws on the Korean translationese taxonomy and evidence-first editing philosophy of [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai). It does not copy that project's full taxonomy, lexicon, model orchestration, or benchmark claims.

**Use cases:** polishing Korean product pages, documentation, posts, emails, reports and bilingual drafts. A user can request `한국어 문장 자연스럽게 다듬어줘`, `번역투만 고쳐줘`, or `퇴고하면서 원문과 달라진 부분을 보여줘`.

**Principle:** preserve facts and intentional style. Diagnose exact passages first, edit only justified passages, then check before/after. Leave already-natural prose alone. Do not erase deliberate uncertainty, rewrite quotations, or simplify technical terminology by default.

### Local structural audit (no external API)

```bash
python3 scripts/korean_audit.py --input draft.md --format text
python3 scripts/korean_audit.py --input draft.md --format json
python3 -m unittest discover -s tests -v
```

The audit produces **candidate spans**, not automatic corrections or quality scores. It ignores fenced/inline code and quoted lines, and flags only a few high-precision patterns. Editorial judgment and factual comparison are still required.

### Provenance and limitations

Inspired by the MIT-licensed [im-not-ai](https://github.com/epoko77-ai/im-not-ai) project (© 2026 epoko77-ai). The implementation and instructions here are independent and narrower in scope. See the upstream `LICENSE`, `docs/en/evidence.md`, and `skills/humanize-korean/SKILL.md` before reusing substantial upstream assets. Neither this audit nor the upstream research should be interpreted as proof of AI authorship, foolproof detection, or a guarantee of undetectability.

Policy and infrastructure guidance live in [Project-harness](https://github.com/in-c0/Project-harness); this repository's existing `CLAUDE.md` remains unchanged.
