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
- [`demo/static/`](./demo/static/) — source for the free in-browser Hugging Face comparison playground.

## Interactive approach lab

**[▶ Try the Writing Skill Approach Lab on Hugging Face](https://huggingface.co/spaces/wldud5192/writing-skill-approach-lab)**

The lab compares four ways of applying the same writing skill to the same brief using the **same model and deterministic decoding**.

| Approach | What changes |
| --- | --- |
| **Baseline** | No added writing-style instructions. |
| **Rules first** | The full rulebook is supplied before the model writes. |
| **Draft → review** | The exact baseline draft is reviewed against the rulebook and minimally corrected. |
| **Hybrid** | Core principles guide the first draft, then the full rulebook is used for review. |

The public demo runs `onnx-community/SmolLM2-135M-Instruct-ONNX` directly in the reader's browser with Transformers.js. No API key or paid inference server is required. The first run downloads about 180 MB of quantized model data; the browser cache is reused afterward.

Inference runs inside a Web Worker and streams partial text back to the page, so the interface stays responsive during generation. The demo includes several unrelated example briefs—community garden, science explainer, workplace update, and repair-café introduction—or readers can enter their own.

The goal is not to prove that one workflow always wins. Try different briefs and compare the actual writing. Look at clarity, naturalness, usefulness, voice preservation, reader effort, concreteness, recoverability, rhetorical over-engineering, rhythm, genre fit, and whether you would actually keep reading.

Because **Draft → review** starts from the exact baseline produced in the same run, it gives a particularly direct view of what the rulebook changes after generation.

### Run the browser lab locally

```bash
git clone https://github.com/in-c0/writing-skill.git
cd writing-skill
python -m http.server 8000
```

Then open `http://localhost:8000/demo/static/`.

### Deployment

The repo includes [`demo/deploy_to_hf.py`](./demo/deploy_to_hf.py) and a GitHub Actions workflow at [`.github/workflows/deploy-hf-space.yml`](./.github/workflows/deploy-hf-space.yml).

The Space is a **static Hugging Face Space**. The model runs on each visitor's device, so the public demo does not require Hugging Face compute hosting.

The repository owner configures:

- GitHub secret `HF_TOKEN` — a Hugging Face token with permission to create/update the Space.
- GitHub variable `HF_SPACE_REPO` — currently `wldud5192/writing-skill-approach-lab`.

Changes to the rulebook, checklist, or demo automatically redeploy the Space.

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
