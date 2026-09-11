import { pipeline, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

// 360M is materially more coherent than the 135M variant for this qualitative
// writing comparison. We deliberately omit `device` so Transformers.js uses its
// browser-compatible CPU/WASM backend without requiring WebGPU.
const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct-ONNX';
let generator = null;
let loadingPromise = null;

function post(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function normalizedProgress(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value <= 1 ? value * 100 : value;
}

async function createGenerator() {
  post('model-status', { message: 'Loading the writing model with CPU/WASM…' });
  const instance = await pipeline('text-generation', MODEL_ID, {
    dtype: 'q4',
    progress_callback: (info) => {
      const progress = normalizedProgress(info?.progress);
      post('model-progress', {
        progress,
        status: info?.status || null,
        file: info?.file || null,
      });
    },
  });
  return instance;
}

async function ensureGenerator() {
  if (generator) return generator;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    generator = await createGenerator();
    post('model-ready', { device: 'wasm', modelId: MODEL_ID });
    return generator;
  })();

  try {
    return await loadingPromise;
  } catch (error) {
    generator = null;
    throw new Error(`CPU/WASM model backend could not start: ${error?.message || error}`);
  } finally {
    loadingPromise = null;
  }
}

function extractText(result) {
  const value = result?.[0]?.generated_text;
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const assistant = [...value].reverse().find((message) => message?.role === 'assistant');
    if (assistant?.content) return String(assistant.content).trim();
  }
  return '';
}

async function generate({ requestId, messages, maxNewTokens }) {
  await ensureGenerator();

  let streamed = '';
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text) => {
      streamed += text;
      post('generation-stream', { requestId, text: streamed });
    },
  });

  // Greedy decoding is both deterministic and cheaper than sampling/beam search.
  const result = await generator(messages, {
    max_new_tokens: maxNewTokens,
    do_sample: false,
    streamer,
  });

  const finalText = extractText(result) || streamed.trim();
  post('generation-complete', { requestId, text: finalText, device: 'wasm' });
}

self.addEventListener('message', async (event) => {
  const message = event.data || {};
  try {
    if (message.type === 'load') {
      await ensureGenerator();
      return;
    }
    if (message.type === 'generate') {
      await generate(message);
    }
  } catch (error) {
    post('worker-error', {
      requestId: message.requestId || null,
      message: error?.message || String(error),
      stack: error?.stack || null,
    });
  }
});
