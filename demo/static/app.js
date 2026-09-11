import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

const BACKENDS = [
  { id: "openbmb/MiniCPM5-2B-Demo", label: "OpenBMB MiniCPM5-2B" },
  { id: "openbmb/MiniCPM5-1B-Demo", label: "OpenBMB MiniCPM5-1B" },
];

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
let client = null;
let activeBackend = null;
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

function baselinePrompt(brief) {
  return brief;
}

function rulesPrompt(brief) {
  return `Write the requested piece. Use the rulebook below while drafting. Specific instructions in the brief override general rules. Return only the finished writing.\n\nRULEBOOK\n${skill}\n\nWRITING BRIEF\n${brief}`;
}

function reviewPrompt(brief, draft) {
  return `Revise the draft below using the rulebook diagnostically, not mechanically. A rule may require no change. Preserve what already works and make the smallest useful corrections. Return only the complete revised writing.\n\nRULEBOOK\n${skill}\n\n${checklist ? `FINAL CHECKLIST\n${checklist}\n\n` : ""}ORIGINAL BRIEF\n${brief}\n\nDRAFT TO REVIEW\n${draft}`;
}

function hybridDraftPrompt(brief) {
  return `Use these core writing principles while drafting. Return only the finished writing.\n\n${CORE}\n\nWRITING BRIEF\n${brief}`;
}

async function submitWithClient(targetClient, message, onText) {
  const job = targetClient.submit("/predict", {
    message,
    history: [],
    thinking_mode: false,
    temperature: 0.2,
    top_p: 0.9,
  });

  let latest = "";
  for await (const event of job) {
    if (event.type === "data" && event.data) {
      latest = clean(event.data[0]);
      if (latest && onText) onText(latest);
    } else if (event.type === "status" && event.stage === "error") {
      throw new Error(event.message || "Hosted generation failed.");
    }
  }
  if (!latest) throw new Error("The hosted model returned no text.");
  return latest;
}

async function selectBackend(message, onText) {
  let lastError = null;
  for (const backend of BACKENDS) {
    try {
      backendStatus.textContent = `Connecting to ${backend.label}…`;
      const candidate = await Client.connect(backend.id, { events: ["data", "status"] });
      const text = await submitWithClient(candidate, message, onText);
      client = candidate;
      activeBackend = backend;
      backendStatus.textContent = `Using ${backend.label} · public Hugging Face ZeroGPU Space.`;
      return text;
    } catch (error) {
      console.warn(`${backend.id} failed`, error);
      lastError = error;
    }
  }
  throw new Error(`No public model backend was available. ${lastError?.message || "Try again later."}`);
}

async function remoteGenerate(message, onText) {
  if (!client || !activeBackend) return selectBackend(message, onText);
  return submitWithClient(client, message, onText);
}

async function runStage(stage, work) {
  buttons[stage].disabled = true;
  setStage(stage, "running", "Generating on the hosted model…");
  try {
    await work();
    setStage(stage, "complete", "Complete.");
  } catch (error) {
    console.error(error);
    setStage(stage, "error", error?.message || String(error));
    buttons[stage].disabled = false;
  }
}

buttons.baseline.addEventListener("click", async () => {
  const brief = briefEl.value.trim();
  if (!brief) return;
  await loadRules();
  await runStage("baseline", async () => {
    baseline = await remoteGenerate(baselinePrompt(brief), (text) => output("baseline", text));
    baselineBrief = brief;
    output("baseline", baseline);
    unlock("rules", "Ready. Generate a fresh answer with the rules supplied first.");
    $("stage-rules").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

buttons.rules.addEventListener("click", async () => {
  const brief = briefEl.value.trim();
  await runStage("rules", async () => {
    const text = await remoteGenerate(rulesPrompt(brief), (value) => output("rules", value));
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
    const text = await remoteGenerate(reviewPrompt(brief, baseline), (value) => output("review", value));
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
    const draft = await remoteGenerate(hybridDraftPrompt(brief), (value) => output("hybrid", value));
    setStage("hybrid", "running", "Phase 2/2 · reviewing that draft against the full rulebook…");
    const finalText = await remoteGenerate(reviewPrompt(brief, draft), (value) => output("hybrid", value));
    output("hybrid", finalText);
    setStage("hybrid", "complete", "Complete. You now have all four versions to compare.");
  } catch (error) {
    setStage("hybrid", "error", error?.message || String(error));
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

resetFromBrief();
