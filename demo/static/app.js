import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct-ONNX';
const MAX_BRIEF_CHARS = 5000;

const CORE_PRINCIPLES = `
Write for the reader, not for the performance of writing.
Prefer clear, natural, specific prose over conspicuously polished prose.
Start from the reader's problem or next natural question.
Use concrete situations before abstract philosophy.
Let some sentences be ordinary.
Keep semantic compression moderate and the register stable.
Use rhetorical devices sparingly.
Preserve useful repetition, connective tissue, and a human narrator-reader relationship.
Write so the idea is noticed before the prose.
`.trim();

const $ = (id) => document.getElementById(id);
const briefEl = $('brief');
const tokensEl = $('tokens');
const runEl = $('run');
const statusEl = $('status');
const progressEl = $('progress');

let generator = null;
let skill = '';
let checklist = '';

function setStatus(text) {
  statusEl.textContent = text;
}

function setProgress(value, visible = true) {
  progressEl.hidden = !visible;
  progressEl.value = Math.max(0, Math.min(100, Number(value) || 0));
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.text();
}

async function loadRules() {
  if (skill) return;
  [skill, checklist] = await Promise.all([
    fetchText('./SKILL.md'),
    fetchText('./CHECKLIST.md'),
  ]);
}

async function createGenerator(device) {
  return pipeline('text-generation', MODEL_ID, {
    dtype: 'q4',
    device,
    progress_callback: (info) => {
      const pct = typeof info?.progress === 'number' ? info.progress : null;
      if (pct !== null) {
        setProgress(pct, true);
        setStatus(`Loading model in your browser… ${Math.round(pct)}%`);
      } else if (info?.status) {
        setStatus(`Loading model in your browser… ${info.status}`);
      }
    },
  });
}

async function loadModel() {
  if (generator) return generator;
  setProgress(1, true);
  const preferWebGPU = Boolean(navigator.gpu);

  if (preferWebGPU) {
    try {
      setStatus('Loading the quantized model with WebGPU… first run downloads the weights.');
      generator = await createGenerator('webgpu');
      setProgress(100, false);
      setStatus('Model loaded with WebGPU. Running experiment…');
      return generator;
    } catch (error) {
      console.warn('WebGPU load failed; falling back to WASM.', error);
      setStatus('WebGPU was unavailable for this model. Falling back to CPU/WASM…');
    }
  }

  generator = await createGenerator('wasm');
  setProgress(100, false);
  setStatus('Model loaded with CPU/WASM. Running experiment…');
  return generator;
}

function extractText(result) {
  const value = result?.[0]?.generated_text;
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const assistant = [...value].reverse().find((message) => message?.role === 'assistant');
    if (assistant?.content) return String(assistant.content).trim();
  }
  return String(value ?? '').trim();
}

async function generate(messages, maxNewTokens) {
  const result = await generator(messages, {
    max_new_tokens: maxNewTokens,
    do_sample: false,
    return_full_text: false,
    repetition_penalty: 1.04,
  });
  return extractText(result);
}

function baselineMessages(brief) {
  return [{ role: 'user', content: brief }];
}

function rulesFirstMessages(brief) {
  return [
    {
      role: 'system',
      content: `Follow this writing rulebook while drafting. Specific instructions in the user's brief override general rules.\n\n${skill}`,
    },
    { role: 'user', content: brief },
  ];
}

function reviewMessages(brief, draft) {
  return [
    {
      role: 'system',
      content: `You are revising an existing draft. Use the rulebook diagnostically, not mechanically. A rule may require no change. Preserve strengths and make the smallest useful corrections. Return only the complete revised writing.\n\nRULEBOOK:\n${skill}\n\nFINAL CHECKLIST:\n${checklist}`,
    },
    {
      role: 'user',
      content: `ORIGINAL BRIEF:\n${brief}\n\nDRAFT TO REVIEW:\n${draft}\n\nReview the draft against the relevant rules. For each relevant rule, decide internally whether a concrete weakness exists. Correct only real weaknesses. Re-read the whole passage after the corrections so local edits do not damage the voice or flow. Return only the final revised version.`,
    },
  ];
}

function hybridInitialMessages(brief) {
  return [
    { role: 'system', content: CORE_PRINCIPLES },
    { role: 'user', content: brief },
  ];
}

function show(id, value) {
  $(id).textContent = value || '(No text returned.)';
}

async function runExperiment() {
  const brief = briefEl.value.trim();
  const maxNewTokens = Math.max(80, Math.min(500, Number(tokensEl.value) || 260));

  if (!brief) {
    setStatus('Enter a writing brief first.');
    briefEl.focus();
    return;
  }
  if (brief.length > MAX_BRIEF_CHARS) {
    setStatus(`Please keep the brief under ${MAX_BRIEF_CHARS.toLocaleString()} characters for this browser demo.`);
    return;
  }

  runEl.disabled = true;
  for (const id of ['baseline', 'rules', 'review', 'hybrid']) show(id, 'Generating…');

  try {
    await loadRules();
    await loadModel();

    setStatus('1/5 · Generating baseline…');
    const baseline = await generate(baselineMessages(brief), maxNewTokens);
    show('baseline', baseline);

    setStatus('2/5 · Generating rules-first version…');
    const rulesFirst = await generate(rulesFirstMessages(brief), maxNewTokens);
    show('rules', rulesFirst);

    setStatus('3/5 · Reviewing the exact baseline against the rulebook…');
    const reviewed = await generate(reviewMessages(brief, baseline), maxNewTokens);
    show('review', reviewed);

    setStatus('4/5 · Generating hybrid first draft…');
    const hybridDraft = await generate(hybridInitialMessages(brief), maxNewTokens);

    setStatus('5/5 · Reviewing the hybrid draft against the full rulebook…');
    const hybrid = await generate(reviewMessages(brief, hybridDraft), maxNewTokens);
    show('hybrid', hybrid);

    setStatus('Complete. Compare the writing, not just the amount of polish.');
    setProgress(100, false);
  } catch (error) {
    console.error(error);
    setStatus(`Experiment failed: ${error?.message || error}. Try a Chromium-based browser with WebGPU, or reload and use the CPU fallback.`);
  } finally {
    runEl.disabled = false;
  }
}

runEl.addEventListener('click', runExperiment);

document.querySelectorAll('.copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = $(button.dataset.target);
    await navigator.clipboard.writeText(target.textContent || '');
    const old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = old; }, 900);
  });
});
