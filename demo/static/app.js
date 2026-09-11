const MAX_BRIEF_CHARS = 5000;
const GENERATION_TIMEOUT_MS = 120000;
const ASSET_VERSION = '2026-09-11-1';

const EXAMPLES = {
  garden: `Write a short welcome note for a community garden volunteer guide. Explain how a new volunteer can get started, what they should bring, and what to do if they are unsure about a task. Keep it friendly, clear, practical, and easy to read.`,
  science: `Explain to a curious 13-year-old why a metal bench can feel colder than a wooden bench even when both have been in the same room. Use concrete everyday examples, avoid equations, and keep the explanation natural and easy to follow.`,
  workplace: `Write a short update to coworkers explaining that the meeting-room booking system will be unavailable on Friday from 4 to 5 p.m. for maintenance. Explain what is changing, what people should do during the outage, and where to ask for help. Keep it calm and practical.`,
  event: `Write a welcoming introduction for a neighborhood repair-cafe event. Explain what visitors can bring, how volunteers will help, and what kinds of repairs may not be possible. Keep it warm, specific, and realistic without sounding promotional.`,
};

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

let skill = '';
let checklist = '';
let worker = null;
let modelReady = false;
let modelLoadPromise = null;
let modelLoadResolve = null;
let modelLoadReject = null;
let requestCounter = 0;
const pending = new Map();

function setStatus(text) {
  statusEl.textContent = text;
}

function setProgress(value, visible = true) {
  progressEl.hidden = !visible;
  progressEl.value = Math.max(0, Math.min(100, Number(value) || 0));
}

function show(id, value, state = '') {
  const el = $(id);
  el.textContent = value || '(No text returned.)';
  el.dataset.state = state;
}

async function fetchFirst(paths) {
  let lastError = null;
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-cache' });
      if (response.ok) return response.text();
      lastError = new Error(`Could not load ${path}: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Could not load ${paths.join(' or ')}`);
}

async function loadRules() {
  if (skill) return;
  [skill, checklist] = await Promise.all([
    fetchFirst(['./SKILL.md', '../../SKILL.md']),
    fetchFirst(['./CHECKLIST.md', '../../CHECKLIST.md']),
  ]);
}

function resetWorker(reason = null) {
  if (worker) worker.terminate();
  worker = null;
  modelReady = false;
  modelLoadPromise = null;
  modelLoadResolve = null;
  modelLoadReject = null;
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    reject(new Error(reason || 'The model worker was restarted.'));
  }
  pending.clear();
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(`./worker.js?v=${ASSET_VERSION}`, { type: 'module' });

  worker.addEventListener('message', (event) => {
    const message = event.data || {};

    if (message.type === 'model-status') {
      setStatus(message.message || 'Loading model…');
      return;
    }

    if (message.type === 'model-progress') {
      if (typeof message.progress === 'number') {
        setProgress(message.progress, true);
        const file = message.file ? ` · ${message.file.split('/').pop()}` : '';
        setStatus(`Loading model in your browser… ${Math.round(message.progress)}%${file}`);
      } else if (message.status) {
        setStatus(`Loading model in your browser… ${message.status}`);
      }
      return;
    }

    if (message.type === 'model-ready') {
      modelReady = true;
      setProgress(100, false);
      setStatus(`Model ready with ${message.device === 'webgpu' ? 'WebGPU' : 'CPU/WASM'}.`);
      if (modelLoadResolve) modelLoadResolve(message);
      modelLoadResolve = null;
      modelLoadReject = null;
      return;
    }

    if (message.type === 'generation-stream') {
      const job = pending.get(message.requestId);
      if (job?.outputId) show(job.outputId, message.text, 'streaming');
      return;
    }

    if (message.type === 'generation-complete') {
      const job = pending.get(message.requestId);
      if (!job) return;
      clearTimeout(job.timer);
      pending.delete(message.requestId);
      if (job.outputId) show(job.outputId, message.text, 'complete');
      job.resolve(message.text);
      return;
    }

    if (message.type === 'worker-error') {
      const error = new Error(message.message || 'Browser model failed.');
      if (message.requestId && pending.has(message.requestId)) {
        const job = pending.get(message.requestId);
        clearTimeout(job.timer);
        pending.delete(message.requestId);
        if (job.outputId) show(job.outputId, `Error: ${error.message}`, 'error');
        job.reject(error);
      } else if (modelLoadReject) {
        modelLoadReject(error);
        modelLoadResolve = null;
        modelLoadReject = null;
      } else {
        setStatus(`Model error: ${error.message}`);
      }
    }
  });

  worker.addEventListener('error', (event) => {
    const error = new Error(event.message || 'The browser model worker crashed.');
    if (modelLoadReject) modelLoadReject(error);
    setStatus(error.message);
    resetWorker(error.message);
  });

  return worker;
}

async function ensureModel() {
  if (modelReady) return;
  if (modelLoadPromise) return modelLoadPromise;

  ensureWorker();
  setStatus('Preparing a small local model. The first run downloads about 180 MB and caches it in your browser…');
  setProgress(1, true);

  modelLoadPromise = new Promise((resolve, reject) => {
    modelLoadResolve = resolve;
    modelLoadReject = reject;
    worker.postMessage({ type: 'load', preferWebGPU: Boolean(navigator.gpu) });
  });

  try {
    await modelLoadPromise;
  } finally {
    modelLoadPromise = null;
  }
}

function generate(messages, maxNewTokens, outputId = null) {
  const requestId = `job-${++requestCounter}`;
  if (outputId) show(outputId, 'Starting…', 'running');

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      if (outputId) show(outputId, 'Generation timed out. Reload the page and try a shorter output.', 'error');
      resetWorker('Generation timed out.');
      reject(new Error('Generation timed out after two minutes.'));
    }, GENERATION_TIMEOUT_MS);

    pending.set(requestId, { resolve, reject, timer, outputId });
    worker.postMessage({ type: 'generate', requestId, messages, maxNewTokens });
  });
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

function selectExample(key) {
  if (!EXAMPLES[key]) return;
  briefEl.value = EXAMPLES[key];
  document.querySelectorAll('.example').forEach((button) => {
    button.classList.toggle('active', button.dataset.example === key);
  });
}

async function runExperiment() {
  const brief = briefEl.value.trim();
  const maxNewTokens = Math.max(80, Math.min(320, Number(tokensEl.value) || 180));

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
  show('baseline', 'Waiting for model…', 'waiting');
  show('rules', 'Waiting for baseline…', 'waiting');
  show('review', 'Waiting for baseline…', 'waiting');
  show('hybrid', 'Waiting…', 'waiting');

  try {
    await loadRules();
    await ensureModel();

    setStatus('1/5 · Generating baseline…');
    const baseline = await generate(baselineMessages(brief), maxNewTokens, 'baseline');

    setStatus('2/5 · Generating rules-first version…');
    const rulesFirst = await generate(rulesFirstMessages(brief), maxNewTokens, 'rules');

    setStatus('3/5 · Reviewing the exact baseline against the rulebook…');
    const reviewed = await generate(reviewMessages(brief, baseline), maxNewTokens, 'review');

    setStatus('4/5 · Generating hybrid first draft…');
    const hybridDraft = await generate(hybridInitialMessages(brief), maxNewTokens);

    setStatus('5/5 · Reviewing the hybrid draft against the full rulebook…');
    const hybrid = await generate(reviewMessages(brief, hybridDraft), maxNewTokens, 'hybrid');

    if (!rulesFirst || !reviewed || !hybrid) throw new Error('One or more variants returned no text.');
    setStatus('Complete. Compare the writing, not just the amount of polish.');
  } catch (error) {
    console.error(error);
    setStatus(`Experiment stopped: ${error?.message || error}`);
  } finally {
    runEl.disabled = false;
  }
}

runEl.addEventListener('click', runExperiment);

document.querySelectorAll('.example').forEach((button) => {
  button.addEventListener('click', () => selectExample(button.dataset.example));
});

briefEl.addEventListener('input', () => {
  document.querySelectorAll('.example').forEach((button) => button.classList.remove('active'));
});

document.querySelectorAll('.copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = $(button.dataset.target);
    await navigator.clipboard.writeText(target.textContent || '');
    const old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = old; }, 900);
  });
});
