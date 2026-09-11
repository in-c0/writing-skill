const API_URL = "https://writing-skill-api.vercel.app/api/generate";
const MODEL_LABEL = "Vercel AI Gateway · Ling 3.0 Flash";
const REQUEST_TIMEOUT_MS = 90000;

const EXAMPLES = {
  garden: "Write a short welcome note for a community garden volunteer guide. Explain how a new volunteer can get started, what they should bring, and what to do if they are unsure about a task. Keep it friendly, clear, practical, and easy to read.",
  science: "Explain to a curious 13-year-old why a metal bench can feel colder than a wooden bench even when both have been in the same room. Use concrete everyday examples, avoid equations, and keep the explanation natural and easy to follow.",
  workplace: "Write a short update to coworkers explaining that the meeting-room booking system will be unavailable on Friday from 4 to 5 p.m. for maintenance. Explain what is changing, what people should do during the outage, and where to ask for help. Keep it calm and practical.",
  event: "Write a welcoming introduction for a neighborhood repair-café event. Explain what visitors can bring, how volunteers will help, and what kinds of repairs may not be possible. Keep it warm, specific, and realistic without sounding promotional.",
};

const CORE = `Write for the reader, not for the performance of writing.
Prefer clear, natural, specific prose over conspicuously polished prose.
Start from what the reader needs to understand or do.
Use concrete situations before abstract philosophy.
Let some sentences be ordinary. Keep rhetorical devices sparse.
Preserve useful repetition and natural connective tissue.`;

const $ = (id) => document.getElementById(id);
const briefEl = $("brief");
const backendStatus = $("backend-status");
const buttons = {
  baseline: $("run-baseline"),
  rules: $("run-rules"),
  review: $("run-review"),
  hybrid: $("run-hybrid"),
};

let skill = "";
let checklist = "";
let baseline = "";
let baselineBrief = "";

async function fetchFirst(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-cache" });
      if (response.ok) return await response.text();
    } catch (_) {}
  }
  return "";
}

async function loadRules() {
  if (skill) return;
  [skill, checklist] = await Promise.all([
    fetchFirst(["./SKILL.md", "../../SKILL.md"]),
    fetchFirst(["./CHECKLIST.md", "../../CHECKLIST.md"]),
  ]);
  if (!skill) throw new Error("Could not load SKILL.md.");
}

function clean(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\|im_end\|>/g, "")
    .trim();
}

function setStage(stage, state, status) {
  const block = $(`stage-${stage}`);
  block.classList.remove("locked", "ready", "running", "complete", "error");
  block.classList.add(state);
  $(`${stage}-status`).textContent = status;
}

function output(stage, text) {
  $(`${stage}-output`).textContent = text || "";
}

function unlock(stage, status) {
  buttons[stage].disabled = false;
  setStage(stage, "ready", status);
}

function resetFromBrief() {
  baseline = "";
  baselineBrief = "";
  buttons.baseline.disabled = false;
  setStage("baseline", "ready", "Ready.");
  output("baseline", "The baseline will appear here.");
  for (const stage of ["rules", "review", "hybrid"]) {
    buttons[stage].disabled = true;
    setStage(stage, "locked", stage === "rules" ? "Generate the baseline first." : "Complete the previous stage first.");
    output(stage, "This stage is locked.");
  }
}

function baselineMessages(brief) {
  return [{ role: "user", content: brief }];
}

function rulesMessages(brief) {
  return [
    {
      role: "system",
      content: `Use the writing rulebook below while drafting. Specific instructions in the user's brief override general rules. Return only the finished writing.\n\nRULEBOOK\n${skill}`,
    },
    { role: "user", content: brief },
  ];
}

function reviewMessages(brief, draft) {
  return [
    {
      role: "system",
      content: `Revise an existing draft using the rulebook diagnostically, not mechanically. A rule may require no change. Preserve what already works and make the smallest useful corrections. Return only the complete revised writing.\n\nRULEBOOK\n${skill}${checklist ? `\n\nFINAL CHECKLIST\n${checklist}` : ""}`,
    },
    {
      role: "user",
      content: `ORIGINAL BRIEF\n${brief}\n\nDRAFT TO REVIEW\n${draft}`,
    },
  ];
}

function hybridDraftMessages(brief) {
  return [
    {
      role: "system",
      content: `Use these core writing principles while drafting. Return only the finished writing.\n\n${CORE}`,
    },
    { role: "user", content: brief },
  ];
}

function readableError(data, raw, status) {
  if (typeof data?.error === "string") {
    if (typeof data?.detail === "string" && data.detail) {
      return `${data.error} ${data.detail}`.slice(0, 320);
    }
    return data.error;
  }
  if (typeof data?.detail === "string") return data.detail.slice(0, 320);
  if (raw) return raw.slice(0, 320);
  return `HTTP ${status}`;
}

async function hostedGenerate(messages, onText) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  backendStatus.textContent = `Generating with ${MODEL_LABEL}…`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (_) {}

    if (!response.ok) {
      throw new Error(`Hosted model returned ${response.status}: ${readableError(data, raw, response.status)}`);
    }

    const text = clean(data?.text);
    if (!text) throw new Error("The hosted model returned no text.");

    if (onText) onText(text);
    backendStatus.textContent = `${MODEL_LABEL} · server-side inference · no reader sign-in required.`;
    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The hosted model took too long to respond. Try the stage again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function runStage(stage, work) {
  buttons[stage].disabled = true;
  setStage(stage, "running", "Generating…");
  try {
    await work();
    setStage(stage, "complete", "Complete.");
  } catch (error) {
    console.error(error);
    const message = error?.message || String(error);
    setStage(stage, "error", message);
    backendStatus.textContent = message;
    buttons[stage].disabled = false;
  }
}

buttons.baseline.addEventListener("click", async () => {
  const brief = briefEl.value.trim();
  if (!brief) return;
  await loadRules();
  await runStage("baseline", async () => {
    baseline = await hostedGenerate(baselineMessages(brief), (text) => output("baseline", text));
    baselineBrief = brief;
    output("baseline", baseline);
    unlock("rules", "Ready. Generate a fresh answer with the rules supplied first.");
    $("stage-rules").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

buttons.rules.addEventListener("click", async () => {
  const brief = briefEl.value.trim();
  await runStage("rules", async () => {
    const text = await hostedGenerate(rulesMessages(brief), (value) => output("rules", value));
    output("rules", text);
    unlock("review", "Ready. Revise the exact baseline against the rulebook.");
    $("stage-review").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

buttons.review.addEventListener("click", async () => {
  const brief = briefEl.value.trim();
  if (!baseline || baselineBrief !== brief) {
    setStage("review", "error", "The brief changed. Generate a new baseline first.");
    return;
  }
  await runStage("review", async () => {
    const text = await hostedGenerate(reviewMessages(brief, baseline), (value) => output("review", value));
    output("review", text);
    unlock("hybrid", "Ready. Draft with core principles, then review that draft.");
    $("stage-hybrid").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

buttons.hybrid.addEventListener("click", async () => {
  const brief = briefEl.value.trim();
  buttons.hybrid.disabled = true;
  setStage("hybrid", "running", "Phase 1/2 · drafting with core principles…");
  try {
    const draft = await hostedGenerate(hybridDraftMessages(brief), (value) => output("hybrid", value));
    setStage("hybrid", "running", "Phase 2/2 · reviewing that draft against the full rulebook…");
    const finalText = await hostedGenerate(reviewMessages(brief, draft), (value) => output("hybrid", value));
    output("hybrid", finalText);
    setStage("hybrid", "complete", "Complete. You now have all four versions to compare.");
  } catch (error) {
    const message = error?.message || String(error);
    setStage("hybrid", "error", message);
    backendStatus.textContent = message;
    buttons.hybrid.disabled = false;
  }
});

document.querySelectorAll(".example").forEach((button) => {
  button.addEventListener("click", () => {
    briefEl.value = EXAMPLES[button.dataset.example];
    document.querySelectorAll(".example").forEach((item) => item.classList.toggle("active", item === button));
    resetFromBrief();
  });
});

briefEl.addEventListener("input", () => {
  document.querySelectorAll(".example").forEach((item) => item.classList.remove("active"));
  resetFromBrief();
});

backendStatus.textContent = `${MODEL_LABEL} · server-side inference · no reader sign-in required.`;
resetFromBrief();
