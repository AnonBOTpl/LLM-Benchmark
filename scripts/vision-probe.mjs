#!/usr/bin/env node
// Surowe wywołanie `/api/generate` z obrazem, żeby zobaczyć dokładnie, co
// Ollama odsyła dla modeli VLM (puste odpowiedzi, brak tokenów, dziwne czasy).
//
//   node scripts/vision-probe.mjs <model> <ścieżka-do-obrazu> [prompt...]
//
// Domyślnie wysyła ten sam zestaw promptów, żeby porównać, który format
// model faktycznie obsługuje.

import { readFileSync } from "node:fs";

const [, , modelArg, imageArg, ...promptParts] = process.argv;
const model = modelArg ?? "moondream";
const imagePath = imageArg;

if (!imagePath) {
  console.error("Użycie: node scripts/vision-probe.mjs <model> <obraz> [prompt]");
  process.exit(2);
}

const endpoint = (process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").replace(/\/$/, "");
const image = readFileSync(imagePath).toString("base64");

const prompts = promptParts.length
  ? [promptParts.join(" ")]
  : [
      "Describe this image.",
      "Describe this image in detail.",
      "What do you see in this picture?",
      "Opisz, co widzisz na zdjęciu, i napisz po angielsku prompt do Stable Diffusion.",
    ];

// Ustaw SYSTEM_PROMPT=... żeby sprawdzić, czy model w ogóle respektuje pole
// `system` (część małych modeli VLM ma szablon, który je ignoruje).
const system = process.env.SYSTEM_PROMPT;

async function probe(prompt) {
  const started = Date.now();
  const body = { model, prompt, images: [image], stream: true };
  if (system) body.system = system;
  const response = await fetch(`${endpoint}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { prompt, status: response.status, error: (await response.text()).slice(0, 300) };
  }

  const chunks = [];
  let buffer = "";
  let firstToken = null;

  const decoder = new TextDecoder();
  for await (const part of response.body) {
    buffer += decoder.decode(part, { stream: true });
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        chunks.push(parsed);
        if (parsed.response && firstToken === null) firstToken = Date.now() - started;
      } catch {
        chunks.push({ nieparsowalne: line.slice(0, 120) });
      }
    }
  }

  const last = chunks.filter((c) => c.done).at(-1) ?? {};
  const text = chunks.map((c) => c.response ?? "").join("");
  const evalCount = last.eval_count ?? null;
  const evalDuration = last.eval_duration ?? null;

  return {
    prompt: prompt.slice(0, 55),
    chunkow: chunks.length,
    znakowOdpowiedzi: text.length,
    ttftMs: firstToken,
    evalCount,
    evalDurationNs: evalDuration,
    tokSPoliczone: evalCount && evalDuration ? +(evalCount / (evalDuration / 1e9)).toFixed(2) : null,
    doneReason: last.done_reason ?? null,
    error: last.error ?? null,
    odpowiedz: text.slice(0, 160),
  };
}

/// Szablon modelu: jeśli nie ma w nim `{{ .System }}`, pole `system` jest
/// ignorowane i instrukcja musi iść w samym prompcie.
async function template() {
  const response = await fetch(`${endpoint}/api/show`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return (data.template ?? "").slice(0, 400);
}

const tmpl = await template();
console.log(
  JSON.stringify(
    {
      model,
      uzywaSystem: tmpl ? tmpl.includes(".System") : null,
      szablon: tmpl,
      systemPrompt: system ?? null,
    },
    null,
    2,
  ),
);

for (const prompt of prompts) {
  const result = await probe(prompt);
  console.log(JSON.stringify(result, null, 2));
}
