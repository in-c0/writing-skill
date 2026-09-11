const MAX_BRIEF_CHARS = 5000;
const GENERATION_TIMEOUT_MS = 120000;
const ASSET_VERSION = '2026-09-11-3';

const EXAMPLES = {
  garden: `Write a short welcome note for a community garden volunteer guide. Explain how a new volunteer can get started, what they should bring, and what to do if they are unsure about a task. Keep it friendly, clear, practical, and easy to read.`,
  science: `Explain to a curious 13-year-old why a metal bench can feel colder than a wooden bench even when both have been in the same room. Use concrete everyday examples, avoid equations, and keep the explanation natural and easy to follow.`,
  workplace: `Write a short update to coworkers explaining that the meeting-room booking system will be unavailable on Friday from 4 to 5 p.m. for maintenance. Explain what is changing, what people should do during the outage, and where to ask for help. Keep it calm and practical.`,
  event: `Write a welcoming introduction for a neighborhood repair-cafe event. Explain what visitors can bring, how volunteers will help, and what kinds of repairs may not be possible. Keep it warm, specific, and realistic without sounding promotional.`,
};

// Compact public digest of the full skill. It deliberately keeps the highest-impact
// rules only so prompt prefill stays small enough for a browser model.
const COMPACT_RULES = `
Write for the reader, not for the performance of writing.
Start from what the reader needs to understand or do.
Prefer concrete situations and ordinary verbs before abstractions.
Let some sentences be ordinary; avoid constant hooks, contrasts, triads, slogans, and clinchers.
Keep the register stable, use important terms consistently, and allow useful repetition.
Create warmth by anticipating confusion and recovery instead of announcing empathy.
Keep examples close to the point and promises proportional to what the text can do.
When revising, preserve what works and make the smallest useful changes.
Write naturally for the ear as well as the eye. The reader should notice the idea before the prose.
`.trim();

const CORE_PRINCIPLES = `
Write for the reader, not for the performance of writing.
Prefer clear, natural, specific prose over conspicuously polished prose.
Start from the reader's problem or next natural question.
Use concrete situations before abstract philosophy.
Let some sentences be ordinary and keep rhetorical devices sparse.
Preserve useful repetition and natural connective tissue.
`.trim();

const $ = (id) => document.getElementById(id);
const briefEl = $('brief');
const modeEl = $('length-mode');
const runEl = $('run');
const statusEl = $('status');
const progressEl = $('progress');

let worker = null;
let modelReady = false;
let modelLoadPromise = null;
let modelLoadResolve = null;
let modelLoadReject = null;
let requestCounter = 0;
const pending = new Map();
const cache = new Map();

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

function setBusy(isBusy) {
  runEl.disabled = isBusy;
  document.querySelectorAll('.run-one').forEach((button) => {
    button.disabled = isBusy;
  });
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
      setStatus('Model ready.');
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
  setStatus('Preparing the local model. The first run downloads it once; later runs reuse the browser cache…');
  setProgress(1, true);

  modelLoadPromise = new Promise((resolve, reject) => {
    modelLoadResolve = resolve;
    modelLoadReject = reject;
    worker.postMessage({ type: 'load' });
  });

  try {
    await modelLoadPromise;
  } catch (error) {
    resetWorker(error?.message || String(error));
    throw error;
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
      if (outputId) show(outputId, 'Generation timed out. Try Quick mode or run this method again.', 'error');
      resetWorker('Generation timed out.');
      reject(new Error('Generation timed out.'));
    }, GENERATION_TIMEOUT_MS);

    pending.set(requestId, { resolve, reject, timer, outputId });
    worker.postMessage({ type: 'generate', requestId, messages, maxNewTokens });
  });
}

function getSettings() {
  const quick = modeEl?.value !== 'longer';
  return quick
    ? { maxNewTokens: 80, wordLimit: 75, label: 'Quick' }
    : { maxNewTokens: 150, wordLimit: 140, label: 'Longer' };
}

function controlledBrief(brief, wordLimit) {
  return `${brief}\n\nFor this comparison, keep the final answer under ${wordLimit} words.`;
}

function baselineMessages(brief, wordLimit) {
  return [{ role: 'user', content: controlledBrief(brief, wordLimit) }];
}

function rulesFirstMessages(brief, wordLimit) {
  return [
    {
      role: 'system',
      content: `Follow these writing rules while drafting. Specific instructions in the user's brief override general rules.\n\n${COMPACT_RULES}`,
    },
    { role: 'user', content: controlledBrief(brief, wordLimit) },
  ];
}

function reviewMessages(brief, draft, wordLimit) {
  return [
    {
      role: 'system',
      content: `Revise the existing draft using these rules diagnostically, not mechanically. Preserve strengths and make only useful corrections. Return only the revised writing.\n\n${COMPACT_RULES}`,
    },
    {
      role: 'user',
      content: `ORIGINAL BRIEF:\n${brief}\n\nDRAFT:\n${draft}\n\nKeep the final answer under ${wordLimit} words. Correct concrete weaknesses without rewriting merely for polish.`,
    },
  ];
}

// The browser demo uses a single model call for Hybrid: core principles guide the
// draft, then the model is explicitly told to review against the compact rules
// before returning only the final version. This preserves the workflow idea while
// avoiding an otherwise expensive extra generation pass.
function hybridMessages(brief, wordLimit) {
  return [
    {
      role: 'system',
      content: `${CORE_PRINCIPLES}\n\nDraft the answer internally, then review it against the following rules before returning only the final version:\n\n${COMPACT_RULES}`,
    },
    { role: 'user', content: controlledBrief(brief, wordLimit) },
  ];
}

function selectExample(key) {
  if (!EXAMPLES[key]) return;
  briefEl.value = EXAMPLES[key];
  cache.clear();
  document.querySelectorAll('.example').forEach((button) => {
    button.classList.toggle('active', button.dataset.example === key);
  });
}

function getInputs() {
  const brief = briefEl.value.trim();
  if (!brief) throw new Error('Enter a writing brief first.');
  if (brief.length > MAX_BRIEF_CHARS) {
    throw new Error(`Please keep the brief under ${MAX_BRIEF_CHARS.toLocaleString()} characters for this browser demo.`);
  }
  return { brief, ...getSettings() };
}

function cacheKey(method, brief, maxNewTokens) {
  return `${method}\u0000${maxNewTokens}\u0000${brief}`;
}

async function generateBaseline(brief, maxNewTokens, wordLimit, force = false) {
  const key = cacheKey('baseline', brief, maxNewTokens);
  if (!force && cache.has(key)) {
    const text = cache.get(key);
    show('baseline', text, 'complete');
    return text;
  }
  setStatus('Generating baseline…');
  const text = await generate(baselineMessages(brief, wordLimit), maxNewTokens, 'baseline');
  cache.set(key, text);
  return text;
}

async function runMethod(method, brief, maxNewTokens, wordLimit, force = false) {
  await ensureModel();
  const key = cacheKey(method, brief, maxNewTokens);
  if (!force && cache.has(key)) {
    const text = cache.get(key);
    show(method, text, 'complete');
    return text;
  }

  let text;
  if (method === 'baseline') {
    return generateBaseline(brief, maxNewTokens, wordLimit, force);
  }
  if (method === 'rules') {
    setStatus('Generating rules-first version…');
    text = await generate(rulesFirstMessages(brief, wordLimit), maxNewTokens, 'rules');
  } else if (method === 'review') {
    const baseline = await generateBaseline(brief, maxNewTokens, wordLimit, false);
    setStatus('Reviewing the exact baseline…');
    text = await generate(reviewMessages(brief, baseline, wordLimit), maxNewTokens, 'review');
  } else if (method === 'hybrid') {
    setStatus('Generating hybrid version with an internal review…');
    text = await generate(hybridMessages(brief, wordLimit), maxNewTokens, 'hybrid');
  } else {
    throw new Error(`Unknown method: ${method}`);
  }

  cache.set(key, text);
  return text;
}

async function runOne(method) {
  let inputs;
  try {
    inputs = getInputs();
  } catch (error) {
    setStatus(error.message);
    return;
  }

  setBusy(true);
  try {
    await runMethod(method, inputs.brief, inputs.maxNewTokens, inputs.wordLimit, true);
    setStatus(`Complete · ${inputs.label} mode. Run another method to compare.`);
  } catch (error) {
    console.error(error);
    setStatus(`This method stopped: ${error?.message || error}`);
  } finally {
    setBusy(false);
  }
}

async function runExperiment() {
  let inputs;
  try {
    inputs = getInputs();
  } catch (error) {
    setStatus(error.message);
    return;
  }

  setBusy(true);
  let failures = 0;
  const methods = ['baseline', 'rules', 'review', 'hybrid'];

  try {
    for (let i = 0; i < methods.length; i += 1) {
      const method = methods[i];
      const key = cacheKey(method, inputs.brief, inputs.maxNewTokens);
      if (!cache.has(key)) show(method, method === 'review' ? 'Waiting for baseline…' : 'Waiting…', 'waiting');
      setStatus(`${i + 1}/4 · ${method === 'baseline' ? 'Baseline' : method === 'rules' ? 'Rules first' : method === 'review' ? 'Draft → review' : 'Hybrid'}…`);
      try {
        await runMethod(method, inputs.brief, inputs.maxNewTokens, inputs.wordLimit, false);
      } catch (error) {
        failures += 1;
        console.error(`${method} failed`, error);
        if ($(method)?.dataset.state !== 'error') show(method, `Error: ${error?.message || error}`, 'error');
      }
    }
    setStatus(failures ? `Finished with ${failures} method${failures === 1 ? '' : 's'} unable to complete.` : `Complete · ${inputs.label} mode. Cached results are reused until the brief or length changes.`);
  } finally {
    setBusy(false);
  }
}

runEl.addEventListener('click', runExperiment);

document.querySelectorAll('.run-one').forEach((button) => {
  button.addEventListener('click', () => runOne(button.dataset.method));
});

document.querySelectorAll('.example').forEach((button) => {
  button.addEventListener('click', () => selectExample(button.dataset.example));
});

briefEl.addEventListener('input', () => {
  cache.clear();
  document.querySelectorAll('.example').forEach((button) => button.classList.remove('active'));
});

modeEl?.addEventListener('change', () => {
  cache.clear();
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
