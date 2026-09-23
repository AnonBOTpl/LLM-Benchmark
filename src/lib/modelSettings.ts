import type { CategoryKind, ModelEntry, ModelOptions } from "./types";

/**
 * Wbudowane system prompty dla typów kategorii.
 *
 * Ollama **nie publikuje** gotowych system promptów dla modeli - to są nasze,
 * ogólne instrukcje, dobrane pod charakter zadania.
 *
 * Wersja jest **jedna, angielska**, niezależnie od języka interfejsu. Powody:
 *
 *  - małe modele (3B-8B, czyli główny cel tej aplikacji) najpewniej wykonują
 *    instrukcję po angielsku; podana po polsku bywa ignorowana albo „przecieka”
 *    do odpowiedzi,
 *  - zmiana języka okna nie może po cichu zmieniać tego, co idzie do modelu -
 *    inaczej przebiegi przy polskim i angielskim interfejsie nie są porównywalne.
 *
 * Język **odpowiedzi** zależy od promptu użytkownika, nie od tej instrukcji:
 * każda z nich mówi modelowi, żeby odpowiadał w języku pytania.
 *
 * Jedyny wyjątek od „odpowiadaj w języku pytania” to `vlm`: prosi o odpowiedź
 * po angielsku, bo modele widzące z tej kategorii (`llava`, `moondream`) są
 * trenowane głównie na angielskim i w innym języku gubią opis.
 *
 * Teksty można nadpisać globalnie w zakładce „Ustawienia” (trafiają wtedy do
 * `defaultSystemPrompts` w `settings.json`) albo per model. Własna instrukcja
 * użytkownika może być w dowolnym języku - to jego decyzja, nie tekst aplikacji.
 */
export const SYSTEM_PROMPTS: Record<CategoryKind, string> = {
  coding:
    "You are a coding assistant. Answer in the user's language, briefly and concretely. " +
    "Provide working code in a fenced block with the language name, without restating the request. " +
    "If information is missing, make a reasonable assumption and state it in one sentence.",
  chat:
    "You are a helpful assistant. Answer in the user's language, factually and without filler. " +
    "If you do not know something, say so plainly instead of guessing. " +
    "Stick to the facts from the conversation and do not invent details you do not know.",
  // Kategoria obrazów prosi **tylko o opis** - żadnych tagów do Stable Diffusion.
  // Sprawdzone na `llava:7b`: opisywał zdjęcia sensownie, ale linii `PROMPT SD:`
  // nie wygenerował ani razu, więc ta część instrukcji tylko zajmowała miejsce
  // i sugerowała, że liczy się coś, czego model nie zrobi. Zostają same opisy.
  vlm:
    "You are a vision assistant. Always answer in English. " +
    "Describe what is visible in the image in at most 5 sentences: subject, action, " +
    "setting, colors and lighting, artistic style. " +
    "Describe only what you can actually see - do not guess and do not add anything else.",
  // Kategoria klasyfikacji nie ma własnego charakteru - używamy neutralnego
  // promptu, żeby nie sugerować modelowi żadnej z ocen.
  classification:
    "You are an assistant answering the user's questions. " +
    "Answer in the user's language, concisely and without unnecessary preamble.",
  reasoning:
    "You are a reasoning assistant. Work through the problem step by step, showing the " +
    "intermediate steps, then give the final answer on the last line. " +
    "Answer in the user's language.",
  // Bez parametru `format` Ollamy - patrz komentarz przy `jsonValid` w `types.ts`.
  // Model ma sam trzymać się formatu, bo to jego umiejętność, nie naszej maszynerii.
  json:
    "Return only valid JSON. No prose, no explanations, no markdown fences. " +
    "Use double quotes for keys and strings, and do not add fields that were not asked for. " +
    "Text values in the user's language.",
  long_context:
    "You are a summarization assistant. Cover every key point of the input, keep the order of " +
    "the original, and do not introduce facts that are not in the input. " +
    "Answer in the user's language, without a preamble.",
};

/** Tekst wbudowany, ignorujący nadpisania użytkownika. */
export function builtinSystemPrompt(kind: CategoryKind): string {
  return SYSTEM_PROMPTS[kind];
}

/**
 * Domyślny prompt dla typu kategorii, z uwzględnieniem globalnych nadpisań
 * z ustawień. Puste nadpisanie znaczy „użyj wbudowanego”.
 */
export function defaultSystemPrompt(
  kind: CategoryKind,
  overrides: Record<string, string> | null | undefined,
): string {
  const override = overrides?.[kind]?.trim();
  return override ? override : builtinSystemPrompt(kind);
}

export function emptyOptions(): ModelOptions {
  return {
    temperature: null,
    topP: null,
    topK: null,
    repeatPenalty: null,
    numCtx: null,
    numPredict: null,
    seed: null,
    numGpu: null,
  };
}

/**
 * Proponowane parametry per typ kategorii. To **nasze rekomendacje**, nie dane
 * od Ollamy - jedyną twardą wartością z modelu jest `contextLength` (maksymalny
 * kontekst, z `/api/tags`), którym ograniczamy `numCtx`.
 *
 * Wartości dla czterech starych typów **nie zmieniły się** przy dodaniu trzech
 * nowych - to ta sama tabela, tylko zapisana w jednym miejscu zamiast
 * w trójargumentowych wyrażeniach `?:`.
 */
const RECOMMENDED_TUNING: Record<
  CategoryKind,
  { temperature: number; repeatPenalty: number; numPredict: number }
> = {
  coding: { temperature: 0.15, repeatPenalty: 1.05, numPredict: 512 },
  chat: { temperature: 0.7, repeatPenalty: 1.1, numPredict: 512 },
  vlm: { temperature: 0.2, repeatPenalty: 1.1, numPredict: 320 },
  classification: { temperature: 0.7, repeatPenalty: 1.1, numPredict: 512 },
  // Niska temperatura, ale **więcej miejsca**: ucięty w połowie wywód to nie
  // jest zmierzona odpowiedź, a przy 512 tokenach właśnie to się dzieje.
  reasoning: { temperature: 0.2, repeatPenalty: 1.05, numPredict: 1024 },
  // JSON ma być powtarzalny - im mniej losowości, tym bardziej porównywalny.
  json: { temperature: 0.1, repeatPenalty: 1.0, numPredict: 512 },
  // Streszczenie ma pomieścić wszystkie punkty wejścia.
  long_context: { temperature: 0.3, repeatPenalty: 1.1, numPredict: 1024 },
};

export function recommendedOptions(
  kind: CategoryKind,
  contextLength?: number | null,
): ModelOptions {
  // Ollama domyślnie pracuje na 4096; nie proponujemy mniej niż to, ani więcej
  // niż 8192 (powyżej rośnie VRAM, a nie wartość pomiaru).
  // Dla `long_context` to zwykle wychodzi 8192 samo, bo tyle ma limit modelu -
  // kategoria nic tu nie wymusza, tylko ostrzega, gdy użytkownik nie ustawił nic
  // (wtedy Ollama tnie wejście na 4096 po cichu).
  const context = Math.min(Math.max(contextLength ?? 8192, 4096), 8192);
  const tuning = RECOMMENDED_TUNING[kind];
  return {
    temperature: tuning.temperature,
    topP: 0.9,
    topK: null,
    repeatPenalty: tuning.repeatPenalty,
    numCtx: context,
    numPredict: tuning.numPredict,
    seed: null,
    numGpu: null,
  };
}

export function hasCustomOptions(options?: ModelOptions | null): boolean {
  if (!options) return false;
  return OPTION_KEYS.some((key) => options[key] !== null && options[key] !== undefined);
}

export const OPTION_KEYS = [
  "temperature",
  "topP",
  "topK",
  "repeatPenalty",
  "numCtx",
  "numPredict",
  "seed",
  "numGpu",
] as const;

export const OPTION_LABELS: Record<(typeof OPTION_KEYS)[number], string> = {
  temperature: "temperature",
  topP: "top_p",
  topK: "top_k",
  repeatPenalty: "repeat_penalty",
  numCtx: "num_ctx",
  numPredict: "num_predict",
  seed: "seed",
  numGpu: "num_gpu",
};

/**
 * Pola parametrów w kolejności, w jakiej pokazujemy je w panelu modelu: zakres,
 * krok i to, czy wartość jest całkowita. `hint` to **klucz tłumaczenia**, nie
 * tekst - tak samo, jak `DEFAULT_OPTIONS_LABEL` niżej.
 *
 * Zakresy pochodzą z panelu, który wcześniej stał w wyskakującym okienku -
 * przeniesienie ich tutaj nie zmienia ani jednej wartości, tylko miejsce.
 */
export interface OptionField {
  key: (typeof OPTION_KEYS)[number];
  hint: string;
  step: number;
  min?: number;
  max?: number;
  integer?: boolean;
}

export const OPTION_FIELDS: OptionField[] = [
  { key: "temperature", hint: "settings.model.help_temperature", step: 0.05, min: 0, max: 2 },
  { key: "topP", hint: "settings.model.help_top_p", step: 0.05, min: 0, max: 1 },
  { key: "topK", hint: "settings.model.help_top_k", step: 1, min: 0, integer: true },
  { key: "repeatPenalty", hint: "settings.model.help_repeat_penalty", step: 0.05, min: 0.5, max: 2 },
  { key: "numCtx", hint: "settings.model.help_num_ctx", step: 128, min: 128, integer: true },
  { key: "numPredict", hint: "settings.model.help_num_predict", step: 64, min: -1, integer: true },
  { key: "numGpu", hint: "settings.model.help_num_gpu", step: 1, min: -1, integer: true },
  { key: "seed", hint: "settings.model.help_seed", step: 1, integer: true },
];

/**
 * Podpowiedź w pustym polu. Puste pole znaczy „zostaw decyzję Ollamie”, a nie
 * „zero”, więc pole musi to powiedzieć.
 */
export const OPTION_PLACEHOLDERS: Partial<Record<(typeof OPTION_KEYS)[number], string>> = {
  numCtx: "settings.model.ollama_default",
  numGpu: "common.auto",
  numPredict: "common.no_limit",
};

/** Wartość parametru jako tekst w polu. Puste = brak wartości. */
export function formatOption(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Tekst z pola jako liczba. Puste pole i cokolwiek niebędącego liczbą znaczą
 * to samo: nie ustawiamy tego parametru. Przecinek działa jak kropka, bo tak
 * wygląda klawiatura w połowie języków interfejsu.
 */
export function parseOption(raw: string, integer?: boolean): number | null {
  const text = raw.trim().replace(",", ".");
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return integer ? Math.round(parsed) : parsed;
}

/**
 * Parametry do zapisu: przycięte do zakresów i z jawnym `null` na pustych
 * polach. Bez tego do pliku trafiłoby np. `temperature: 0` po skasowaniu pola,
 * czyli wartość, której użytkownik nie wpisał.
 */
export function clampOptions(options: ModelOptions): ModelOptions {
  const cleaned: ModelOptions = { ...options };
  for (const field of OPTION_FIELDS) {
    const value = cleaned[field.key];
    if (value === null || value === undefined) {
      cleaned[field.key] = null;
      continue;
    }
    let bounded = value;
    if (field.min !== undefined) bounded = Math.max(field.min, bounded);
    if (field.max !== undefined) bounded = Math.min(field.max, bounded);
    cleaned[field.key] = bounded;
  }
  return cleaned;
}

/**
 * Krótki, ludzki opis aktywnych parametrów (do tooltipów i podsumowań).
 *
 * Gdy nic nie ustawiono, zwracamy **klucz tłumaczenia** („parametry domyślne
 * Ollamy”), więc miejsca wywołania przepuszczają wynik przez `t(...)`.
 * Nazwy parametrów (`num_ctx 8192`) nie są tłumaczone - to identyfikatory
 * Ollamy i mają zostać czytelne 1:1.
 */
export function describeOptions(options?: ModelOptions | null): string {
  if (!options) return "test.badge_params_default";
  const parts: string[] = [];
  for (const key of OPTION_KEYS) {
    const value = options[key];
    if (value !== null && value !== undefined) parts.push(`${OPTION_LABELS[key]} ${value}`);
  }
  return parts.length ? parts.join(" · ") : "test.badge_params_default";
}

export const DEFAULT_OPTIONS_LABEL = "test.badge_params_default";

/**
 * System prompt faktycznie użyty dla pary model × kategoria: własny, jeśli
 * użytkownik go ustawił, a w przeciwnym razie domyślny dla typu kategorii.
 */
export function resolveSystemPrompt(
  entry: ModelEntry,
  kind: CategoryKind,
  overrides: Record<string, string> | null | undefined,
): { text: string; source: "custom" | "default" } {
  const custom = entry.systemPrompt?.trim();
  if (custom) return { text: entry.systemPrompt as string, source: "custom" };
  return { text: defaultSystemPrompt(kind, overrides), source: "default" };
}

/** Typ kategorii, w której model startuje - używany do domyślnego promptu. */
export function primaryKind(
  entry: ModelEntry,
  categories: { id: string; kind: CategoryKind }[],
): CategoryKind | null {
  for (const category of categories) {
    if (entry.categoryIds.includes(category.id)) return category.kind;
  }
  return null;
}
