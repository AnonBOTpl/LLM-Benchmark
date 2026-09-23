#!/usr/bin/env node
// Headless smoke test for the exact Ollama calls AI Benchmark makes.
//
// It mirrors the streaming + parsing logic of src-tauri/src/ollama.rs
// (first non-empty `response` chunk => TTFT, eval_count/eval_duration => tok/s)
// so the pipeline can be verified without clicking through the GUI.
//
//   node scripts/ollama-smoke.mjs [model] [prompt] [runs]

const rawHost = process.env.OLLAMA_HOST ?? "127.0.0.1:11434";
const BASE = rawHost.startsWith("http") ? rawHost.replace(/\/$/, "") : `http://${rawHost}`;

const model = process.argv[2] ?? "qwen2.5-coder:3b";
const prompt =
  process.argv[3] ??
  "Napisz w Pythonie funkcję, która odwraca kolejność znaków w podanym tekście.";
const runs = Number(process.argv[4] ?? 2);

const ms = (start) => Number(process.hrtime.bigint() - start) / 1e6;

async function generate(label) {
  const started = process.hrtime.bigint();
  const response = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${(await response.text()).trim()}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let ttftMs = null;
  let evalCount = null;
  let evalDuration = null;
  let loadDuration = null;
  let chunks = 0;
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;

      const part = JSON.parse(line);
      if (part.error) throw new Error(part.error);

      if (typeof part.response === "string" && part.response.length > 0) {
        if (ttftMs === null) ttftMs = ms(started);
        text += part.response;
        chunks += 1;
      }
      if (part.eval_count != null) evalCount = part.eval_count;
      if (part.eval_duration != null) evalDuration = part.eval_duration;
      if (part.load_duration != null) loadDuration = part.load_duration;
      if (part.done === true) done = true;
    }
  }

  const totalMs = ms(started);

  return {
    label,
    ttftMs,
    totalMs,
    evalCount,
    tokensPerSec: evalCount && evalDuration ? evalCount / (evalDuration / 1e9) : null,
    measuredTokensPerSec:
      evalCount && ttftMs !== null && totalMs - ttftMs > 50
        ? evalCount / ((totalMs - ttftMs) / 1000)
        : null,
    loadMs: loadDuration != null ? loadDuration / 1e6 : null,
    chunks,
    text,
  };
}

const fmt = (value, digits = 2) => (value === null ? "—" : value.toFixed(digits));

const version = await fetch(`${BASE}/api/version`)
  .then((res) => res.json())
  .then((data) => data.version)
  .catch(() => "?");

console.log(`Ollama ${version} @ ${BASE}`);
console.log(`model: ${model}`);
console.log(`prompt: ${prompt}\n`);

const results = [];
for (let index = 1; index <= runs; index += 1) {
  const label = index === 1 ? "przebieg 1 (zimny start)" : `przebieg ${index}`;
  const result = await generate(label);
  results.push(result);
  console.log(
    `${label.padEnd(24)} TTFT ${fmt(result.ttftMs, 0).padStart(6)} ms | ` +
      `tok/s ${fmt(result.tokensPerSec).padStart(6)} | ` +
      `eval_count ${String(result.evalCount).padStart(4)} | ` +
      `load ${fmt(result.loadMs, 0).padStart(6)} ms | ` +
      `total ${fmt(result.totalMs, 0).padStart(6)} ms`,
  );
}

if (results.length >= 2) {
  const first = results[0];
  const last = results[results.length - 1];
  console.log(
    `\nTTFT: ${fmt(first.ttftMs, 0)} ms -> ${fmt(last.ttftMs, 0)} ms ` +
      `(różnica ${fmt(first.ttftMs - last.ttftMs, 0)} ms)`,
  );
}

console.log(`\n--- odpowiedź (przebieg ${results.length}) ---`);
console.log(results[results.length - 1].text.trim().slice(0, 700));
