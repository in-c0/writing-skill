import { pipeline, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX';
let generator = null;
let loadingPromise = null;
let activeDevice = null;

function post(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function normalizedProgress(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value <= 1 ? value * 100 : value;
}

async function createGenerator(device) {
  post('model-status', { message: `Loading model with ${device === 'webgpu' ? 'WebGPU' : 'CPU/WASM'}…` });
  const instance = await pipeline('text-generation', MODEL_ID, {
    dtype: 'q4',
    device,
    progress_callback: (info) => {
      const progress = normalizedProgress(info?.progress);
      post('model-progress', {
        progress,
        status: info?.status || null,
        file: info?.file || null,
      });
    },
  });
  activeDevice = device;
  return instance;
}

async function ensureGenerator(preferWebGPU = true) {
  if (generator) return generator;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (preferWebGPU) {
      try {
        generator = await createGenerator('webgpu');
        post('model-ready', { device: 'webgpu', modelId: MODEL_ID });
        return generator;
      } catch (error) {
        post('model-status', {
          message: `WebGPU could not start (${error?.message || error}). Falling back to CPU/WASM…`,
        });
      }
    }

    generator = await createGenerator('wasm');
    post('model-ready', { device: 'wasm', modelId: MODEL_ID });
    return generator;
  })();

  try {
    return await loadingPromise;
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
  await ensureGenerator(Boolean(self.navigator?.gpu));

  let streamed = '';
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text) => {
      streamed += text;
      post('generation-stream', { requestId, text: streamed });
    },
  });

  const result = await generator(messages, {
    max_new_tokens: maxNewTokens,
    do_sample: false,
    repetition_penalty: 1.04,
    streamer,
  });

  const finalText = extractText(result) || streamed.trim();
  post('generation-complete', { requestId, text: finalText, device: activeDevice });
}

self.addEventListener('message', async (event) => {
  const message = event.data || {};
  try {
    if (message.type === 'load') {
      await ensureGenerator(Boolean(message.preferWebGPU));
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
