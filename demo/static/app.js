const MAX_BRIEF_CHARS = 5000;
const GENERATION_TIMEOUT_MS = 180000;
const ASSET_VERSION = '2026-09-11-4';

const EXAMPLES = {
  garden: `Write a short welcome note for a community garden volunteer guide. Explain how a new volunteer can get started, what they should bring, and what to do if they are unsure about a task. Keep it friendly, clear, practical, and easy to read.`,
  science: `Explain to a curious 13-year-old why a metal bench can feel colder than a wooden bench even when both have been in the same room. Use concrete everyday examples, avoid equations, and keep the explanation natural and easy to follow.`,
  workplace: `Write a short update to coworkers explaining that the meeting-room booking system will be unavailable on Friday from 4 to 5 p.m. for maintenance. Explain what is changing, what people should do during the outage, and where to ask for help. Keep it calm and practical.`,
  event: `Write a welcoming introduction for a neighborhood repair-cafe event. Explain what visitors can bring, how volunteers will help, and what kinds of repairs may not be possible. Keep it warm, specific, and realistic without sounding promotional.`,
};

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
const tokensEl = $('tokens');
const loadButton = $('load-model');
const baselineButton = $('generate-baseline');
const rulesButton = $('run-rules');
const reviewButton = $('run-review');
const hybridButton = $('run-hybrid');
const modelProgress = $('model-progress');
const modelStatus = $('model-status');

let worker = null;
let modelReady = false;
let modelLoadPromise = null;
let modelLoadResolve = null;
let modelLoadReject = null;
let requestCounter = 0;
let currentBriefKey = '';
let baselineText = '';
let rulesText = '';
let reviewText = '';
let hybridText = '';
const pending = new Map();

function setStageStatus(stage, text, state = '') {
  const el = $(`${stage}-status`);
  if (!el) return;
  el.textContent = text;
  el.dataset.state = state;
}

function showOutput(id, value, state = '') {
  const el = $(id);
  if (!el) return;
  el.textContent = value || '';
  el.dataset.state = state;
}

function setModelProgress(value, visible = true) {
  modelProgress.hidden = !visible;
  modelProgress.value = Math.max(0, Math.min(100, Number(value) || 0));
}

function setStageState(stage, state) {
  const block = $(`stage-${stage}`);
  if (block) block.dataset.stageState = state;
}

function unlock(button, stage) {
  button.disabled = false;
  setStageState(stage, 'ready');
}

function lock(button, stage) {
  button.disabled = true;
  setStageState(stage, 'locked');
}

function scrollToStage(stage) {
  const block = $(`stage-${stage}`);
  if (!block) return;
  window.setTimeout(() => block.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
}

function clearDownstream({ keepBaseline = false } = {}) {
  if (!keepBaseline) {
    baselineText = '';
    showOutput('baseline-output', 'Generate the baseline to see the unassisted model output.', 'empty');
    lock(baselineButton, 'baseline');
  }

  rulesText = '';
  reviewText = '';
  hybridText = '';
  showOutput('rules-output', 'Complete the previous stage to unlock this approach.', 'empty');
  showOutput('review-output', 'Complete the previous stage to unlock this approach.', 'empty');
  showOutput('hybrid-output', 'Complete the previous stage to unlock this approach.', 'empty');
  lock(rulesButton, 'rules');
  lock(reviewButton, 'review');
  lock(hybridButton, 'hybrid');
  setStageStatus('rules', 'Locked until the baseline is complete.', 'locked');
  setStageStatus('review', 'Locked until Approach 1 is complete.', 'locked');
  setStageStatus('hybrid', 'Locked until Approach 2 is complete.', 'locked');
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
      modelStatus.textContent = message.message || 'Loading model…';
      return;
    }

    if (message.type === 'model-progress') {
      if (typeof message.progress === 'number') {
        setModelProgress(message.progress, true);
        const file = message.file ? ` · ${message.file.split('/').pop()}` : '';
        modelStatus.textContent = `Loading model… ${Math.round(message.progress)}%${file}`;
      } else if (message.status) {
        modelStatus.textContent = `Loading model… ${message.status}`;
      }
      return;
    }

    if (message.type === 'model-ready') {
      modelReady = true;
      setModelProgress(100, false);
      modelStatus.textContent = 'Model loaded and ready. It stays loaded while this page remains open.';
      loadButton.textContent = 'Model loaded';
      loadButton.disabled = true;
      setStageState('model', 'complete');
      unlock(baselineButton, 'baseline');
      setStageStatus('baseline', 'Ready. Choose a brief and generate the baseline.', 'ready');
      if (modelLoadResolve) modelLoadResolve(message);
      modelLoadResolve = null;
      modelLoadReject = null;
      scrollToStage('baseline');
      return;
    }

    if (message.type === 'generation-stream') {
      const job = pending.get(message.requestId);
      if (job?.outputId) showOutput(job.outputId, message.text, 'streaming');
      return;
    }

    if (message.type === 'generation-complete') {
      const job = pending.get(message.requestId);
      if (!job) return;
      clearTimeout(job.timer);
      pending.delete(message.requestId);
      if (job.outputId) showOutput(job.outputId, message.text, 'complete');
      job.resolve(message.text);
      return;
    }

    if (message.type === 'worker-error') {
      const error = new Error(message.message || 'Browser model failed.');
      if (message.requestId && pending.has(message.requestId)) {
        const job = pending.get(message.requestId);
        clearTimeout(job.timer);
        pending.delete(message.requestId);
        if (job.outputId) showOutput(job.outputId, `Error: ${error.message}`, 'error');
        job.reject(error);
      } else if (modelLoadReject) {
        modelLoadReject(error);
        modelLoadResolve = null;
        modelLoadReject = null;
      }
    }
  });

  worker.addEventListener('error', (event) => {
    const error = new Error(event.message || 'The browser model worker crashed.');
    if (modelLoadReject) modelLoadReject(error);
    modelStatus.textContent = error.message;
    resetWorker(error.message);
    loadButton.disabled = false;
    loadButton.textContent = 'Load model';
    setStageState('model', 'error');
  });

  return worker;
}

async function loadModel() {
  if (modelReady) return;
  if (modelLoadPromise) return modelLoadPromise;

  ensureWorker();
  loadButton.disabled = true;
  loadButton.textContent = 'Loading…';
  setStageState('model', 'running');
  modelStatus.textContent = 'Preparing the local model. The first visit downloads it once; later visits can reuse the browser cache.';
  setModelProgress(1, true);

  modelLoadPromise = new Promise((resolve, reject) => {
    modelLoadResolve = resolve;
    modelLoadReject = reject;
    worker.postMessage({ type: 'load' });
  });

  try {
    await modelLoadPromise;
  } catch (error) {
    resetWorker(error?.message || String(error));
    modelStatus.textContent = `Could not load model: ${error?.message || error}`;
    loadButton.disabled = false;
    loadButton.textContent = 'Retry model load';
    setStageState('model', 'error');
  } finally {
    modelLoadPromise = null;
  }
}

function generate(messages, maxNewTokens, outputId) {
  const requestId = `job-${++requestCounter}`;
  showOutput(outputId, 'Starting…', 'running');

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      showOutput(outputId, 'Generation timed out. You can retry this stage without restarting the whole experiment.', 'error');
      reject(new Error('Generation timed out.'));
    }, GENERATION_TIMEOUT_MS);

    pending.set(requestId, { resolve, reject, timer, outputId });
    worker.postMessage({ type: 'generate', requestId, messages, maxNewTokens });
  });
}

function getInputs() {
  const brief = briefEl.value.trim();
  const maxNewTokens = Math.max(100, Math.min(360, Number(tokensEl.value) || 220));
  if (!brief) throw new Error('Enter a writing brief first.');
  if (brief.length > MAX_BRIEF_CHARS) throw new Error(`Please keep the brief under ${MAX_BRIEF_CHARS.toLocaleString()} characters.`);
  return { brief, maxNewTokens };
}

function baselineMessages(brief) {
  return [{ role: 'user', content: brief }];
}

function rulesFirstMessages(brief) {
  return [
    { role: 'system', content: `Follow these writing rules while drafting. Specific instructions in the user's brief override general rules.\n\n${COMPACT_RULES}` },
    { role: 'user', content: brief },
  ];
}

function reviewMessages(brief, draft) {
  return [
    { role: 'system', content: `Revise the existing draft using these rules diagnostically, not mechanically. Preserve strengths and make only useful corrections. Return only the complete revised writing.\n\n${COMPACT_RULES}` },
    { role: 'user', content: `ORIGINAL BRIEF:\n${brief}\n\nDRAFT TO REVIEW:\n${draft}\n\nCorrect concrete weaknesses while preserving useful content and voice. Return only the final revised version.` },
  ];
}

function hybridDraftMessages(brief) {
  return [
    { role: 'system', content: CORE_PRINCIPLES },
    { role: 'user', content: brief },
  ];
}

function hybridReviewMessages(brief, draft) {
  return reviewMessages(brief, draft);
}

async function runBaseline() {
  let inputs;
  try { inputs = getInputs(); } catch (error) { setStageStatus('baseline', error.message, 'error'); return; }

  baselineButton.disabled = true;
  setStageState('baseline', 'running');
  setStageStatus('baseline', 'Generating the no-instructions baseline…', 'running');
  try {
    baselineText = await generate(baselineMessages(inputs.brief), inputs.maxNewTokens, 'baseline-output');
    currentBriefKey = inputs.brief;
    setStageState('baseline', 'complete');
    setStageStatus('baseline', 'Baseline complete. This exact text will be reused by Draft → review.', 'complete');
    unlock(rulesButton, 'rules');
    setStageStatus('rules', 'Ready. This approach generates a fresh answer with the rules supplied before drafting.', 'ready');
    scrollToStage('rules');
  } catch (error) {
    setStageState('baseline', 'error');
    setStageStatus('baseline', error.message, 'error');
    baselineButton.disabled = false;
  }
}

async function runRules() {
  const { brief, maxNewTokens } = getInputs();
  rulesButton.disabled = true;
  setStageState('rules', 'running');
  setStageStatus('rules', 'Generating a fresh answer with the writing rules supplied first…', 'running');
  try {
    rulesText = await generate(rulesFirstMessages(brief), maxNewTokens, 'rules-output');
    setStageState('rules', 'complete');
    setStageStatus('rules', 'Approach 1 complete.', 'complete');
    unlock(reviewButton, 'review');
    setStageStatus('review', 'Ready. This approach revises the exact baseline instead of generating from scratch.', 'ready');
    scrollToStage('review');
  } catch (error) {
    setStageState('rules', 'error');
    setStageStatus('rules', error.message, 'error');
    rulesButton.disabled = false;
  }
}

async function runReview() {
  const { brief, maxNewTokens } = getInputs();
  if (!baselineText || currentBriefKey !== brief) {
    setStageStatus('review', 'The brief changed. Regenerate the baseline first.', 'error');
    return;
  }

  reviewButton.disabled = true;
  setStageState('review', 'running');
  setStageStatus('review', 'Reviewing and minimally correcting the exact baseline…', 'running');
  try {
    reviewText = await generate(reviewMessages(brief, baselineText), maxNewTokens, 'review-output');
    setStageState('review', 'complete');
    setStageStatus('review', 'Approach 2 complete.', 'complete');
    unlock(hybridButton, 'hybrid');
    setStageStatus('hybrid', 'Ready. Hybrid drafts with core principles, then performs a separate rule review.', 'ready');
    scrollToStage('hybrid');
  } catch (error) {
    setStageState('review', 'error');
    setStageStatus('review', error.message, 'error');
    reviewButton.disabled = false;
  }
}

async function runHybrid() {
  const { brief, maxNewTokens } = getInputs();
  hybridButton.disabled = true;
  setStageState('hybrid', 'running');
  setStageStatus('hybrid', 'Phase 1/2 · drafting with the core principles…', 'running');
  showOutput('hybrid-output', 'Drafting…', 'running');

  try {
    const firstDraft = await generate(hybridDraftMessages(brief), maxNewTokens, 'hybrid-output');
    setStageStatus('hybrid', 'Phase 2/2 · reviewing that draft against the writing rules…', 'running');
    hybridText = await generate(hybridReviewMessages(brief, firstDraft), maxNewTokens, 'hybrid-output');
    setStageState('hybrid', 'complete');
    setStageStatus('hybrid', 'Approach 3 complete. You now have the full comparison.', 'complete');
    $('comparison-summary').hidden = false;
    scrollToStage('summary');
  } catch (error) {
    setStageState('hybrid', 'error');
    setStageStatus('hybrid', error.message, 'error');
    hybridButton.disabled = false;
  }
}

function selectExample(key) {
  if (!EXAMPLES[key]) return;
  briefEl.value = EXAMPLES[key];
  document.querySelectorAll('.example').forEach((button) => button.classList.toggle('active', button.dataset.example === key));
  onBriefChanged();
}

function onBriefChanged() {
  currentBriefKey = '';
  clearDownstream({ keepBaseline: false });
  if (modelReady) {
    unlock(baselineButton, 'baseline');
    setStageStatus('baseline', 'Ready. Generate a new baseline for this brief.', 'ready');
  }
  $('comparison-summary').hidden = true;
}

loadButton.addEventListener('click', loadModel);
baselineButton.addEventListener('click', runBaseline);
rulesButton.addEventListener('click', runRules);
reviewButton.addEventListener('click', runReview);
hybridButton.addEventListener('click', runHybrid);

document.querySelectorAll('.example').forEach((button) => button.addEventListener('click', () => selectExample(button.dataset.example)));
briefEl.addEventListener('input', () => {
  document.querySelectorAll('.example').forEach((button) => button.classList.remove('active'));
  onBriefChanged();
});

document.querySelectorAll('.copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = $(button.dataset.target);
    await navigator.clipboard.writeText(target.textContent || '');
    const previous = button.textContent;
    button.textContent = 'Copied';
    window.setTimeout(() => { button.textContent = previous; }, 900);
  });
});

// Initial state
clearDownstream({ keepBaseline: false });
setStageState('model', 'ready');
setStageStatus('baseline', 'Load the model first.', 'locked');
