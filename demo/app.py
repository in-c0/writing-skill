from pathlib import Path
import os
import textwrap

import gradio as gr
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = os.getenv("MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")
MAX_INPUT_CHARS = 12000
DEFAULT_MAX_NEW_TOKENS = 700

ROOT = Path(__file__).resolve().parent.parent


def _read(name: str, fallback: str = "") -> str:
    path = ROOT / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return fallback


SKILL = _read(
    "SKILL.md",
    """Write for the reader, not for the performance of writing. Prefer concrete situations, ordinary connective prose, useful redundancy, stable register, moderate semantic compression, and natural spoken rhythm. Avoid overusing aphorisms, metaphors, rhetorical symmetry, abstract noun stacks, inspirational closers, and polished persona lists. Preserve genre and source voice. Make the smallest change that improves the reader's experience.""",
)
CHECKLIST = _read("CHECKLIST.md", "")

CORE_PRINCIPLES = """
Write for the reader, not for the performance of writing.
Prefer clear, natural, specific prose over conspicuously polished prose.
Start from the reader's problem or next natural question.
Use concrete situations before abstract philosophy.
Let some sentences be ordinary.
Keep semantic compression moderate and the register stable.
Use rhetorical devices sparingly.
Preserve useful repetition, connective tissue, and a human narrator-reader relationship.
Write so the idea is noticed before the prose.
""".strip()

print(f"Loading {MODEL_ID}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype="auto",
    low_cpu_mem_usage=True,
)
model.eval()


def generate(messages, max_new_tokens: int) -> str:
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(prompt, return_tensors="pt")
    with torch.inference_mode():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
    new_tokens = output[0, inputs["input_ids"].shape[1]:]
    return tokenizer.decode(new_tokens, skip_special_tokens=True).strip()


def baseline_prompt(user_prompt: str):
    # Deliberately no writing-style instruction beyond the user's own request.
    return [{"role": "user", "content": user_prompt}]


def rules_first_prompt(user_prompt: str):
    return [
        {
            "role": "system",
            "content": (
                "Follow this writing rulebook while drafting. Specific instructions in the user's brief win over general rules.\n\n"
                + SKILL
            ),
        },
        {"role": "user", "content": user_prompt},
    ]


def review_prompt(user_prompt: str, draft: str):
    return [
        {
            "role": "system",
            "content": "You are revising an existing draft. Use the rulebook diagnostically, not mechanically. A rule may require no change. Preserve strengths and make the smallest useful corrections. Return only the complete revised writing.\n\nRULEBOOK:\n" + SKILL + ("\n\nFINAL CHECKLIST:\n" + CHECKLIST if CHECKLIST else ""),
        },
        {
            "role": "user",
            "content": textwrap.dedent(
                f"""
                ORIGINAL BRIEF:
                {user_prompt}

                DRAFT TO REVIEW:
                {draft}

                Review the draft against the relevant rules. For each relevant rule, decide internally whether a concrete weakness exists. Correct only real weaknesses. Re-read the whole passage after the corrections so local edits do not damage the voice or flow. Return only the final revised version.
                """
            ).strip(),
        },
    ]


def hybrid_initial_prompt(user_prompt: str):
    return [
        {"role": "system", "content": CORE_PRINCIPLES},
        {"role": "user", "content": user_prompt},
    ]


def compare(user_prompt: str, max_new_tokens: int):
    user_prompt = (user_prompt or "").strip()
    if not user_prompt:
        raise gr.Error("Enter a writing brief first.")
    if len(user_prompt) > MAX_INPUT_CHARS:
        raise gr.Error(f"Please keep the brief under {MAX_INPUT_CHARS:,} characters for this demo.")

    max_new_tokens = int(max_new_tokens or DEFAULT_MAX_NEW_TOKENS)

    # A shared baseline is generated once. Approach B revises this exact output,
    # which makes the delta easier to inspect than regenerating a second baseline.
    baseline = generate(baseline_prompt(user_prompt), max_new_tokens)

    rules_first = generate(rules_first_prompt(user_prompt), max_new_tokens)

    draft_then_review = generate(
        review_prompt(user_prompt, baseline),
        max_new_tokens,
    )

    hybrid_draft = generate(hybrid_initial_prompt(user_prompt), max_new_tokens)
    hybrid = generate(
        review_prompt(user_prompt, hybrid_draft),
        max_new_tokens,
    )

    return baseline, rules_first, draft_then_review, hybrid


DEFAULT_BRIEF = """Write a short introduction for a practical book that helps people understand and use English vocabulary in the technology industry. The audience includes students and working professionals. Keep it welcoming, useful, and easy to read."""

with gr.Blocks(title="Writing Skill Approach Lab") as demo:
    gr.Markdown(
        f"""
# Writing Skill Approach Lab

Compare four ways of prompting the **same model** (`{MODEL_ID}`) with deterministic decoding.

The experiment holds the model, user brief, and decoding settings constant. The main variable is **when and how the writing rules are applied**.

- **Baseline** — no added writing-style instruction.
- **Rules first** — full rulebook is supplied before drafting.
- **Draft → review** — the baseline draft is reviewed against the full rulebook and minimally corrected.
- **Hybrid** — core principles guide the first draft, then the full rulebook is used for review.

This is a qualitative playground, not a benchmark. Try several briefs and compare what actually reads better.
"""
    )

    brief = gr.Textbox(
        label="Writing brief",
        value=DEFAULT_BRIEF,
        lines=8,
        placeholder="Describe what you want the model to write...",
    )
    max_tokens = gr.Slider(
        minimum=200,
        maximum=1200,
        value=DEFAULT_MAX_NEW_TOKENS,
        step=50,
        label="Maximum new tokens per generation",
    )
    run = gr.Button("Compare approaches", variant="primary")

    with gr.Tabs():
        with gr.Tab("Baseline — no instructions"):
            out_baseline = gr.Markdown()
        with gr.Tab("Rules first"):
            out_rules = gr.Markdown()
        with gr.Tab("Draft → review"):
            out_review = gr.Markdown()
        with gr.Tab("Hybrid"):
            out_hybrid = gr.Markdown()

    gr.Markdown(
        """
### What to look for

Do not ask only which version is more polished. Compare clarity, naturalness, usefulness, voice, reader effort, concreteness, recoverability, rhetorical over-engineering, rhythm, genre fit, and whether you would actually keep reading.

Because the baseline is reused as the starting draft for **Draft → review**, that tab shows the most direct effect of applying the rulebook after generation.
"""
    )

    run.click(
        fn=compare,
        inputs=[brief, max_tokens],
        outputs=[out_baseline, out_rules, out_review, out_hybrid],
    )

if __name__ == "__main__":
    demo.queue(default_concurrency_limit=1).launch()
