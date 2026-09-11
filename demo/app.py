from pathlib import Path
import os
import textwrap

import gradio as gr
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

try:
    import spaces
except ImportError:  # Lets the app run outside ZeroGPU for development.
    class _Spaces:
        @staticmethod
        def GPU(*args, **kwargs):
            def decorator(fn):
                return fn
            return decorator
    spaces = _Spaces()


MODEL_ID = os.getenv("MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")
MAX_INPUT_CHARS = 12000
DEFAULT_MAX_NEW_TOKENS = 320
HERE = Path(__file__).resolve().parent


def _read(name: str, fallback: str = "") -> str:
    for path in (HERE / name, HERE.parent / name):
        if path.exists():
            return path.read_text(encoding="utf-8")
    return fallback


SKILL = _read(
    "SKILL.md",
    "Write for the reader, not for the performance of writing. Prefer clear, natural, concrete prose. Preserve useful repetition and source voice. Use rhetorical devices sparingly.",
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
Preserve useful repetition and natural connective tissue.
The reader should notice the idea before the prose.
""".strip()

EXAMPLES = {
    "Community garden": "Write a short welcome note for a community garden volunteer guide. Explain how a new volunteer can get started, what they should bring, and what to do if they are unsure about a task. Keep it friendly, clear, practical, and easy to read.",
    "Science explainer": "Explain to a curious 13-year-old why a metal bench can feel colder than a wooden bench even when both have been in the same room. Use concrete everyday examples, avoid equations, and keep the explanation natural and easy to follow.",
    "Workplace update": "Write a short update to coworkers explaining that the meeting-room booking system will be unavailable on Friday from 4 to 5 p.m. for maintenance. Explain what is changing, what people should do during the outage, and where to ask for help. Keep it calm and practical.",
    "Repair-café introduction": "Write a welcoming introduction for a neighborhood repair-café event. Explain what visitors can bring, how volunteers will help, and what kinds of repairs may not be possible. Keep it warm, specific, and realistic without sounding promotional.",
}


print(f"Loading hosted model: {MODEL_ID}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16,
    low_cpu_mem_usage=True,
)
try:
    # ZeroGPU provides CUDA emulation while the Space starts, so the model can
    # be placed on CUDA before a real GPU is allocated to a request.
    model = model.to("cuda")
except Exception:
    # Keep local development possible on machines without CUDA.
    model = model.to("cpu")
model.eval()


def _validate_brief(brief: str, max_new_tokens: int) -> tuple[str, int]:
    brief = (brief or "").strip()
    if not brief:
        raise gr.Error("Enter a writing brief first.")
    if len(brief) > MAX_INPUT_CHARS:
        raise gr.Error(f"Please keep the brief under {MAX_INPUT_CHARS:,} characters for this demo.")
    return brief, int(max_new_tokens or DEFAULT_MAX_NEW_TOKENS)


def _generate(messages: list[dict], max_new_tokens: int) -> str:
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(prompt, return_tensors="pt")
    device = next(model.parameters()).device
    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.inference_mode():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    new_tokens = output[0, inputs["input_ids"].shape[1]:]
    return tokenizer.decode(new_tokens, skip_special_tokens=True).strip()


def baseline_prompt(brief: str) -> list[dict]:
    return [{"role": "user", "content": brief}]


def rules_first_prompt(brief: str) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "Follow this writing rulebook while drafting. Specific instructions in the user's brief override general rules.\n\n"
                + SKILL
            ),
        },
        {"role": "user", "content": brief},
    ]


def review_prompt(brief: str, draft: str) -> list[dict]:
    checklist = f"\n\nFINAL CHECKLIST:\n{CHECKLIST}" if CHECKLIST else ""
    return [
        {
            "role": "system",
            "content": (
                "Revise an existing draft using the rulebook diagnostically, not mechanically. A rule may require no change. Preserve strengths and make the smallest useful corrections. Return only the complete revised writing.\n\nRULEBOOK:\n"
                + SKILL
                + checklist
            ),
        },
        {
            "role": "user",
            "content": textwrap.dedent(
                f"""
                ORIGINAL BRIEF:
                {brief}

                DRAFT TO REVIEW:
                {draft}

                Review only for concrete reader-facing weaknesses. Preserve useful content, tone, and voice. Return only the final revised version.
                """
            ).strip(),
        },
    ]


@spaces.GPU(duration=30)
def run_baseline(brief: str, max_new_tokens: int):
    brief, max_new_tokens = _validate_brief(brief, max_new_tokens)
    text = _generate(baseline_prompt(brief), max_new_tokens)
    state = {"brief": brief, "text": text}
    return (
        text,
        state,
        "Baseline complete. This exact draft will be reused in Draft → review.",
        gr.update(interactive=True),
    )


@spaces.GPU(duration=30)
def run_rules_first(brief: str, max_new_tokens: int):
    brief, max_new_tokens = _validate_brief(brief, max_new_tokens)
    text = _generate(rules_first_prompt(brief), max_new_tokens)
    return (
        text,
        "Rules-first version complete.",
        gr.update(interactive=True),
    )


@spaces.GPU(duration=30)
def run_review(brief: str, max_new_tokens: int, baseline_state):
    brief, max_new_tokens = _validate_brief(brief, max_new_tokens)
    if not baseline_state or baseline_state.get("brief") != brief:
        raise gr.Error("The brief changed after the baseline was generated. Generate a new baseline first.")
    text = _generate(
        review_prompt(brief, baseline_state["text"]),
        max_new_tokens,
    )
    return (
        text,
        "Review complete. Compare it with the baseline to see what the rulebook actually changed.",
        gr.update(interactive=True),
    )


@spaces.GPU(duration=45)
def run_hybrid(brief: str, max_new_tokens: int):
    brief, max_new_tokens = _validate_brief(brief, max_new_tokens)
    first_draft = _generate(
        [
            {"role": "system", "content": CORE_PRINCIPLES},
            {"role": "user", "content": brief},
        ],
        max_new_tokens,
    )
    text = _generate(review_prompt(brief, first_draft), max_new_tokens)
    return text, "Hybrid complete. You now have all four versions to compare."


def _reset_values():
    return (
        None,
        "",
        "",
        "",
        "",
        "Generate the baseline first.",
        "Complete the previous stage to continue.",
        "Complete the previous stage to continue.",
        "Complete the previous stage to continue.",
        gr.update(interactive=False),
        gr.update(interactive=False),
        gr.update(interactive=False),
    )


def reset_after_edit():
    return _reset_values()


def choose_example_and_reset(name: str):
    return (EXAMPLES.get(name, EXAMPLES["Community garden"]),) + _reset_values()


CSS = """
.gradio-container { max-width: 1040px !important; }
.stage { border: 1px solid var(--border-color-primary); border-radius: 16px; padding: 20px; margin: 14px 0; }
.stage h2, .stage h3 { margin-top: 0; }
.stage-note { color: var(--body-text-color-subdued); }
.output textarea { font-size: 15px !important; line-height: 1.6 !important; }
"""


with gr.Blocks(title="writing-skill playground", css=CSS, theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        """
# writing-skill playground

Give one brief to the same model and move through the writing approaches one stage at a time. Read each result before continuing. The point is not to produce the most polished version; it is to see which workflow makes the writing clearer and more natural.

The model runs on Hugging Face ZeroGPU, so nothing large is downloaded to your computer.
"""
    )
    gr.Markdown(
        f"**Hosted model:** `{MODEL_ID}` · deterministic decoding · shared Hugging Face ZeroGPU"
    )

    baseline_state = gr.State(value=None)

    with gr.Group(elem_classes="stage"):
        gr.Markdown("## 1 · Generate the baseline\nStart with ordinary model output. No writing-skill instructions are added.")
        example = gr.Dropdown(
            choices=list(EXAMPLES.keys()),
            value="Community garden",
            label="Example brief",
        )
        brief = gr.Textbox(
            label="Writing brief",
            value=EXAMPLES["Community garden"],
            lines=6,
            placeholder="Describe what you want the model to write...",
        )
        max_tokens = gr.Slider(
            minimum=160,
            maximum=700,
            value=DEFAULT_MAX_NEW_TOKENS,
            step=20,
            label="Maximum new tokens",
        )
        baseline_button = gr.Button("Generate baseline", variant="primary")
        baseline_status = gr.Markdown("Generate the baseline first.", elem_classes="stage-note")
        baseline_output = gr.Textbox(
            label="Baseline · no added writing instructions",
            lines=12,
            interactive=False,
            show_copy_button=True,
            elem_classes="output",
        )

    with gr.Group(elem_classes="stage"):
        gr.Markdown("## 2 · Approach 1 — Rules first\nGenerate a fresh answer with the full writing rulebook supplied before drafting.")
        rules_button = gr.Button("Run rules first", interactive=False)
        rules_status = gr.Markdown("Complete the previous stage to continue.", elem_classes="stage-note")
        rules_output = gr.Textbox(
            label="Rules first",
            lines=12,
            interactive=False,
            show_copy_button=True,
            elem_classes="output",
        )

    with gr.Group(elem_classes="stage"):
        gr.Markdown("## 3 · Approach 2 — Draft → review\nTake the exact baseline from Stage 1 and revise it against the rulebook. This isolates what the review step changes.")
        review_button = gr.Button("Review the baseline", interactive=False)
        review_status = gr.Markdown("Complete the previous stage to continue.", elem_classes="stage-note")
        review_output = gr.Textbox(
            label="Draft → review",
            lines=12,
            interactive=False,
            show_copy_button=True,
            elem_classes="output",
        )

    with gr.Group(elem_classes="stage"):
        gr.Markdown("## 4 · Approach 3 — Hybrid\nDraft with the core principles, then review that draft against the full rulebook before returning the final version.")
        hybrid_button = gr.Button("Run hybrid", interactive=False)
        hybrid_status = gr.Markdown("Complete the previous stage to continue.", elem_classes="stage-note")
        hybrid_output = gr.Textbox(
            label="Hybrid",
            lines=12,
            interactive=False,
            show_copy_button=True,
            elem_classes="output",
        )

    gr.Markdown(
        """
## Compare the writing

Look at what changed, not just which version sounds more polished. Is it easier to follow? More concrete? Less performative? Does it preserve useful repetition? Does it sound like someone explaining the subject rather than displaying their writing?

The rulebook is a diagnostic tool, not a scorecard. Sometimes the baseline will already be better.

[Read the full writing skill on GitHub](https://github.com/in-c0/writing-skill)
"""
    )

    reset_outputs = [
        baseline_state,
        baseline_output,
        rules_output,
        review_output,
        hybrid_output,
        baseline_status,
        rules_status,
        review_status,
        hybrid_status,
        rules_button,
        review_button,
        hybrid_button,
    ]

    example.change(
        fn=choose_example_and_reset,
        inputs=example,
        outputs=[brief] + reset_outputs,
        queue=False,
    )
    brief.input(fn=reset_after_edit, inputs=None, outputs=reset_outputs, queue=False)
    max_tokens.change(fn=reset_after_edit, inputs=None, outputs=reset_outputs, queue=False)

    baseline_button.click(
        fn=run_baseline,
        inputs=[brief, max_tokens],
        outputs=[baseline_output, baseline_state, baseline_status, rules_button],
        api_name="baseline",
    )
    rules_button.click(
        fn=run_rules_first,
        inputs=[brief, max_tokens],
        outputs=[rules_output, rules_status, review_button],
        api_name="rules_first",
    )
    review_button.click(
        fn=run_review,
        inputs=[brief, max_tokens, baseline_state],
        outputs=[review_output, review_status, hybrid_button],
        api_name="draft_review",
    )
    hybrid_button.click(
        fn=run_hybrid,
        inputs=[brief, max_tokens],
        outputs=[hybrid_output, hybrid_status],
        api_name="hybrid",
    )


if __name__ == "__main__":
    demo.queue(default_concurrency_limit=2, max_size=32).launch()
