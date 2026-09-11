const MAX_BRIEF_CHARS = 5000;
const GENERATION_TIMEOUT_MS = 180000;
const ASSET_VERSION = '2026-09-11-2';

const EXAMPLES = {
  garden: `Write a short welcome note for a community garden volunteer guide. Explain how a new volunteer can get started, what they should bring, and what to do if they are unsure about a task. Keep it friendly, clear, practical, and easy to read.`,
  science: `Explain to a curious 13-year-old why a metal bench can feel colder than a wooden bench even when both have been in the same room. Use concrete everyday examples, avoid equations, and keep the explanation natural and easy to follow.`,
  workplace: `Write a short update to coworkers explaining that the meeting-room booking system will be unavailable on Friday from 4 to 5 p.m. for maintenance. Explain what is changing, what people should do during the outage, and where to ask for help. Keep it calm and practical.`,
  event: `Write a welcoming introduction for a neighborhood repair-cafe event. Explain what visitors can bring, how volunteers will help, and what kinds of repairs may not be possible. Keep it warm, specific, and realistic without sounding promotional.`,
};

// A compact, agent-facing digest of SKILL.md. The full public rulebook remains
// linked from the page; this shorter form makes the experiment practical on a
// small browser model without changing the principles being tested.
const COMPACT_RULES = `
Write for the reader, not for the performance of writing.
Start from what the reader needs to understand or do, not from a grand observation.
Prefer concrete situations, actions, and ordinary verbs before abstract philosophy.
Keep semantic compression moderate. Spend words when they improve comprehension.
Let some sentences be ordinary connective prose; not every sentence needs a hook or payoff.
Keep the register stable and appropriate to the reader.
Repeat important terms when consistency helps. Allow useful redundancy for orientation or memory.
Use aphorisms, metaphors, rhetorical symmetry, triads, punchlines, and paragraph clinchers sparingly.
Address readers mainly through useful actions rather than long persona lists or identity claims.
Create warmth by anticipating confusion, mistakes, forgetting, and recovery rather than announcing empathy.
Keep promises proportional to what the text can actually do and avoid inflating the stakes.
Keep examples close to the point they teach. Do not over-explain the pedagogy.
When revising, preserve what already works and make the smallest useful changes.
Write for the ear as well as the eye. Prefer natural breath groups and a plain ending when the thought is finished.
The reader should notice the idea before noticing the prose.
`.trim();

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

let worker = null;
let modelReady = false;
let modelLoadPromise = null;
let modelLoadResolve = null;
let modelLoadReject = null;
let requestCounter = 0;
let lastBaselineBrief = '';
let lastBaselineText = '';
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
      setStatus('Model ready in CPU/WASM compatibility mode.');
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
  setStatus('Preparing the local writing model in CPU/WASM mode. First run downloads about 386 MB and caches it in your browser…');
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
      if (outputId) show(outputId, 'Generation timed out. Try fewer output tokens or run this method again.', 'error');
      resetWorker('Generation timed out.');
      reject(new Error('Generation timed out.'));
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
      content: `Follow these writing rules while drafting. Specific instructions in the user's brief override general rules.\n\n${COMPACT_RULES}`,
    },
    { role: 'user', content: brief },
  ];
}

function reviewMessages(brief, draft) {
  return [
    {
      role: 'system',
      content: `Revise the existing draft using these rules diagnostically, not mechanically. A rule may require no change. Preserve strengths and make the smallest useful corrections. Return only the complete revised writing.\n\n${COMPACT_RULES}`,
    },
    {
      role: 'user',
      content: `ORIGINAL BRIEF:\n${brief}\n\nDRAFT TO REVIEW:\n${draft}\n\nCorrect only concrete weaknesses. Preserve the draft's useful content and voice. Return only the final revised version.`,
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
  lastBaselineBrief = '';
  lastBaselineText = '';
  document.querySelectorAll('.example').forEach((button) => {
    button.classList.toggle('active', button.dataset.example === key);
  });
}

function getInputs() {
  const brief = briefEl.value.trim();
  const maxNewTokens = Math.max(60, Math.min(200, Number(tokensEl.value) || 120));

  if (!brief) throw new Error('Enter a writing brief first.');
  if (brief.length > MAX_BRIEF_CHARS) {
    throw new Error(`Please keep the brief under ${MAX_BRIEF_CHARS.toLocaleString()} characters for this browser demo.`);
  }
  return { brief, maxNewTokens };
}

async function generateBaseline(brief, maxNewTokens, force = false) {
  if (!force && lastBaselineBrief === brief && lastBaselineText) return lastBaselineText;
  setStatus('Generating baseline…');
  const text = await generate(baselineMessages(brief), maxNewTokens, 'baseline');
  lastBaselineBrief = brief;
  lastBaselineText = text;
  return text;
}

async function runMethod(method, brief, maxNewTokens) {
  await ensureModel();

  if (method === 'baseline') {
    return generateBaseline(brief, maxNewTokens, true);
  }

  if (method === 'rules') {
    setStatus('Generating rules-first version…');
    return generate(rulesFirstMessages(brief), maxNewTokens, 'rules');
  }

  if (method === 'review') {
    const baseline = await generateBaseline(brief, maxNewTokens, false);
    setStatus('Reviewing the exact baseline against the condensed rulebook…');
    return generate(reviewMessages(brief, baseline), maxNewTokens, 'review');
  }

  if (method === 'hybrid') {
    setStatus('Generating hybrid first draft…');
    const hybridDraft = await generate(hybridInitialMessages(brief), maxNewTokens);
    setStatus('Reviewing the hybrid draft against the condensed rulebook…');
    return generate(reviewMessages(brief, hybridDraft), maxNewTokens, 'hybrid');
  }

  throw new Error(`Unknown method: ${method}`);
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
    await runMethod(method, inputs.brief, inputs.maxNewTokens);
    setStatus('Complete. Compare the result with another method, or run all four.');
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
  show('baseline', 'Waiting…', 'waiting');
  show('rules', 'Waiting…', 'waiting');
  show('review', 'Waiting for baseline…', 'waiting');
  show('hybrid', 'Waiting…', 'waiting');

  const methods = ['baseline', 'rules', 'review', 'hybrid'];
  let failures = 0;

  try {
    for (const method of methods) {
      try {
        await runMethod(method, inputs.brief, inputs.maxNewTokens);
      } catch (error) {
        failures += 1;
        console.error(`${method} failed`, error);
        const outputId = method;
        if ($(outputId)?.dataset.state !== 'error') {
          show(outputId, `Error: ${error?.message || error}`, 'error');
        }
        // A timed-out generation restarts the worker. The next method will
        // re-initialize from the browser cache instead of being blocked.
      }
    }

    setStatus(failures ? `Finished with ${failures} method${failures === 1 ? '' : 's'} unable to complete. Other results remain usable.` : 'Complete. Compare the writing, not just the amount of polish.');
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
  lastBaselineBrief = '';
  lastBaselineText = '';
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
