export type CategoryKind =
  | "coding"
  | "chat"
  | "vlm"
  | "classification"
  | "reasoning"
  | "json"
  | "long_context";

/**
 * Wszystkie typy kategorii w kolejności, w jakiej pokazujemy je w interfejsie.
 *
 * Jedna lista na całą aplikację, żeby nie powstała druga, która się rozjedzie:
 * **dodanie typu** to jeden wiersz tutaj plus `KIND_LABEL`, `PROMPT_HINT`
 * i `SYSTEM_PROMPTS` - kompilator wymusi komplet, bo wszystkie trzy są
 * `Record<CategoryKind, ...>`.
 */
export const CATEGORY_KINDS: CategoryKind[] = [
  "coding",
  "chat",
  "reasoning",
  "json",
  "long_context",
  "vlm",
  "classification",
];

export type Language = "en" | "pl" | "de" | "es" | "fr" | "pt" | "it";

/** Ustawienia aplikacji (osobny `settings.json`, nie modelu). */
export interface AppSettings {
  language: Language;
  /**
   * Nadpisania wbudowanych system promptów, kluczowane typem kategorii.
   * Brak wpisu = wbudowany tekst z `modelSettings.ts`.
   */
  defaultSystemPrompts: Record<string, string>;
  /**
   * Czy liczyć werdykt sprawdzenia JSON-a. Wyłączone znaczy **nie liczymy
   * wcale** - w wyniku zostaje brak informacji, a kolumna znika.
   */
  checkJson: boolean;
  /** To samo dla składni Pythona (kategoria „Kodowanie”). */
  checkPython: boolean;
  /** Czy podgląd odpowiedzi sam przewija się do nowych znaków. */
  autoScrollAnswer: boolean;
}

export interface StoragePaths {
  dataDir: string;
  historyDir: string;
  exportDir: string;
}

export interface StorageStats {
  files: number;
  bytes: number;
}

export interface ClearOutcome {
  removed: number;
  freedBytes: number;
}

/**
 * Gdzie model wyląduje w pamięci tego komputera. Model **nie jest** albo-albo:
 * to, co nie mieści się na karcie, Ollama rozkłada między kartę i RAM, więc
 * `partial_cpu` znaczy „wolno", a `no_fit` dopiero „wcale".
 *
 * `unknown_gpu` to uczciwy wyjątek: bez NVML nie wiemy, ile karta ma wolnego,
 * więc sprawdzony został tylko RAM.
 */
export type MemoryFit =
  | "on_gpu"
  | "on_gpu_tight"
  | "partial_cpu"
  | "no_fit"
  | "unknown_gpu";

/** Szacunek zużycia VRAM dla jednego modelu z wybranych par. */
export interface ModelForecast {
  model: string;
  /** `loaded` = dokładny rozmiar z `/api/ps`, reszta to szacunek. */
  status: "loaded" | "estimated" | "missing" | "cpu";
  weightsMb: number | null;
  kvMb: number;
  totalMb: number;
  context: number | null;
  /** Werdykt pamięci; `null`, gdy nie ma czego porównywać. */
  fit: MemoryFit | null;
  note: string | null;
}

export interface VramForecast {
  available: boolean;
  totalMb: number;
  usedMb: number;
  /** Użycie karty poza Ollamą (pulpit, inne aplikacje). */
  otherMb: number;
  /** Ile karty jest wolne teraz (= total - other). */
  freeVramMb: number;
  requiredMb: number;
  headroomMb: number;
  fits: boolean;
  /** Mieści się, ale bez zapasu. */
  tight: boolean;
  /** Najgorszy stan w zestawie (albo `null`, gdy nie ma czego oceniać). */
  verdict: MemoryFit | null;
  /** Pamięć systemowa: migawka z chwili odczytu. */
  ramTotalMb: number;
  ramAvailableMb: number;
  /** Wolny RAM po odjęciu rezerwy dla systemu. */
  ramUsableMb: number;
  ramReserveMb: number;
  models: ModelForecast[];
  notes: string[];
}

/**
 * Prompt kategorii tekstowej. Wyłączony (`enabled: false`) zostaje na liście,
 * ale nie wchodzi do testu - dzięki temu można go schować na jeden przebieg
 * bez kasowania treści.
 */
export interface TextPrompt {
  text: string;
  enabled: boolean;
}

export interface VlmPrompt {
  prompt: string;
  imagePath: string;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  prompts: TextPrompt[];
  vlmPrompts: VlmPrompt[];
}

/** Prompty faktycznie biorące udział w teście (bez wyłączonych). */
export function enabledPromptCount(category: Category): number {
  return category.kind === "vlm"
    ? category.vlmPrompts.filter((prompt) => prompt.enabled).length
    : category.prompts.filter((prompt) => prompt.enabled).length;
}

/** Łączna liczba promptów w kategorii, także wyłączonych. */
export function totalPromptCount(category: Category): number {
  return category.kind === "vlm" ? category.vlmPrompts.length : category.prompts.length;
}

/**
 * Parametry generowania przekazywane do Ollamy. `null`/brak = zostaw decyzję
 * Ollamie; do modelu trafia wyłącznie to, co użytkownik naprawdę ustawił.
 */
export interface ModelOptions {
  temperature?: number | null;
  topP?: number | null;
  topK?: number | null;
  repeatPenalty?: number | null;
  /** Rozmiar kontekstu; Ollama domyślnie używa 4096. */
  numCtx?: number | null;
  /** Limit odpowiedzi; `-1` = bez limitu. */
  numPredict?: number | null;
  seed?: number | null;
  /** Ile warstw oddać karcie: `0` = tylko CPU, brak = decyduje Ollama. */
  numGpu?: number | null;
}

export interface ModelEntry {
  tag: string;
  enabled: boolean;
  categoryIds: string[];
  /**
   * Własny system prompt. `null` = użyj domyślnego dla typu kategorii, w której
   * model startuje (dlatego jeden model może dostać inny prompt w „Kodowaniu”
   * i inny w „Rozmowie”).
   */
  systemPrompt?: string | null;
  options?: ModelOptions;
}

export interface AppConfig {
  models: ModelEntry[];
  categories: Category[];
}

export interface InstalledModel {
  name: string;
  /** Rozmiar na dysku w bajtach. */
  size: number;
  /** Umiejętności zgłaszane przez Ollamę; `vision` = obsługa obrazów. */
  capabilities: string[];
  /** Maksymalny kontekst modelu - podstawa dla proponowanego `numCtx`. */
  contextLength: number | null;
  /** Sugerowane id kategorii (wyliczone lokalnie z capabilities i nazwy). */
  suggestedKind: CategoryKind | null;
  /** `capabilities` = dane pewne, `name` = heurystyka z nazwy modelu. */
  suggestionSource: "capabilities" | "name" | null;
}

export interface OllamaStatus {
  running: boolean;
  version: string | null;
  installed: InstalledModel[];
  endpoint: string;
  error: string | null;
}

export interface ModelInfo {
  tag: string;
  /** "local" gdy model jest już na dysku, "registry" gdy dane są z rejestru Ollamy. */
  source: "local" | "registry";
  /** Rozmiar na dysku (local) albo do pobrania (registry), w bajtach. */
  sizeBytes: number | null;
  parameterSize: string | null;
  quantizationLevel: string | null;
  family: string | null;
  /** Umiejętności zgłaszane przez Ollamę (puste dla modeli niepobranych). */
  capabilities: string[];
  /** Sugerowane id kategorii: `coding` | `chat` | `vlm`. */
  suggestedKind: CategoryKind | null;
  /** `capabilities` = dane pewne, `name` = heurystyka z nazwy modelu. */
  suggestionSource: "capabilities" | "name" | null;
  /**
   * Czy szablon modelu zawiera `{{ .System }}`. `false` oznacza, że pole
   * `system` jest ignorowane (tak ma np. moondream) i instrukcja musi iść
   * w samym prompcie. `null` = nie da się ustalić (np. model niepobrany).
   */
  supportsSystem: boolean | null;
  error: string | null;
}

export interface LoadedModel {
  name: string;
  /** Cała pamięć zajęta przez model. */
  sizeBytes: number;
  /** Część pamięci trzymana na GPU; reszta to warstwy liczone na CPU. */
  sizeVramBytes: number;
  /** Procent pamięci modelu na GPU (podział warstw, nie czasu liczenia). */
  gpuPercent: number | null;
  expiresAt: string | null;
  contextLength: number | null;
}

export interface LoadOutcome {
  model: string;
  action: "load" | "unload";
  elapsedMs: number;
  loaded: LoadedModel | null;
}

export interface VramSample {
  available: boolean;
  name: string | null;
  usedMb: number;
  totalMb: number;
  peakMb: number;
  utilization: number | null;
  error: string | null;
}

export interface PullProgress {
  model: string;
  status: string;
  total: number | null;
  completed: number | null;
  percent: number | null;
  done: boolean;
  error: string | null;
}

export interface PromptResult {
  prompt: string;
  imagePath: string | null;
  response: string;
  ttftMs: number | null;
  evalCount: number | null;
  evalDurationNs: number | null;
  tokensPerSec: number | null;
  measuredTokensPerSec: number | null;
  totalMs: number;
  loadMs: number | null;
  vramPeakMb: number | null;
  /** Cała pamięć zajęta przez model w trakcie generowania (`/api/ps`). */
  modelSizeMb: number | null;
  /** Procent pamięci modelu na GPU; reszta to warstwy na CPU. */
  gpuOffloadPercent: number | null;
  label: string | null;
  /**
   * Czy odpowiedź jest poprawnym JSON-em. Wypełniane **tylko** dla kategorii
   * `json` - to dodatkowa informacja obok pomiaru, nie zamiast niego: model
   * nadal dostaje surowe zadanie, bez wymuszania schematu po stronie Ollamy.
   * `null` dla pozostałych kategorii, dla błędów i dla przebiegów sprzed tej
   * zmiany.
   */
  jsonValid: boolean | null;
  /**
   * Werdykt sprawdzenia składni Pythona: `ok` | `syntax_error` | `no_code`.
   *
   * Trzymamy kod, a nie zdanie, bo interfejs mówi w siedmiu językach - tekst
   * dobiera dopiero tłumaczenie. `null` znaczy „nie sprawdzano”: inna
   * kategoria, błąd generowania, sprawdzenie wyłączone w Ustawieniach albo
   * przebieg sprzed tej zmiany. Nigdy „niepoprawny”.
   */
  pythonVerdict: string | null;
  error: string | null;
}

export interface ModelRun {
  model: string;
  categoryId: string;
  categoryName: string;
  kind: CategoryKind;
  /**
   * Skąd przyszedł model: `registry` albo `huggingface`.
   *
   * Po co w wyniku: ten sam model pobrany z rejestru Ollamy i z `hf.co` może
   * wypaść inaczej, bo szablon i parser przychodzą wtedy z repozytorium na HF.
   * Bez tego dwa różne wyniki wyglądają jak rozrzut tego samego pomiaru.
   *
   * `null` dla przebiegów starszych niż ta zmiana - wtedy źródło liczymy
   * z tagu (`modelSource`), bo tag `hf.co/...` mówi to samo.
   */
  source?: string | null;
  /** Ustawienia faktycznie użyte w tym przebiegu (zapisane z wynikami). */
  systemPrompt?: string | null;
  options?: ModelOptions;
  results: PromptResult[];
}

export interface BenchmarkRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  cancelled: boolean;
  gpu: string | null;
  models: ModelRun[];
}

export interface ModelSummary {
  model: string;
  prompts: number;
  avgTokensPerSec: number | null;
  avgTtftMs: number | null;
  peakVramMb: number | null;
  /** To samo co `ModelRun.source`, wyniesione na wierzch dla listy historii. */
  source?: string | null;
}

/**
 * Skąd przyszedł model - **z tagu**, tak samo jak liczy to backend.
 *
 * Rozróżniamy dwie rzeczy i tylko dwie, bo tylko tyle da się ustalić:
 * `huggingface` dla tagu `hf.co/...` i `registry` dla reszty. To drugie znaczy
 * „nie z HuggingFace”, a nie „na pewno z rejestru”: model zbudowany lokalnie
 * (`ollama create`) wygląda tak samo i Ollama tego nie rozróżnia.
 */
export function modelSource(tag: string, stored?: string | null): string {
  if (stored) return stored;
  return tag.trim().toLowerCase().startsWith("hf.co/") ? "huggingface" : "registry";
}

export interface RunSummary {
  id: string;
  startedAt: string;
  durationMs: number;
  cancelled: boolean;
  models: string[];
  categories: string[];
  prompts: number;
  avgTokensPerSec: number | null;
  /** Rozmiar pliku przebiegu na dysku - podstawa podglądu czyszczenia historii. */
  bytes: number;
  modelStats: ModelSummary[];
}

export interface TokenEvent {
  model: string;
  categoryId: string;
  promptIndex: number;
  token: string;
}

export type ProgressPhase =
  | "run-start"
  | "models-unloaded"
  | "prompt-start"
  | "prompt-done"
  | "run-done";

export interface BenchProgress {
  runId: string;
  phase: ProgressPhase;
  model?: string;
  categoryId?: string;
  categoryName?: string;
  kind?: CategoryKind;
  promptIndex?: number;
  promptTotal?: number;
  overallDone: number;
  overallTotal: number;
  prompt?: string;
  imagePath?: string | null;
  ttftMs?: number | null;
  tokensPerSec?: number | null;
  measuredTokensPerSec?: number | null;
  totalMs?: number;
  vramPeakMb?: number | null;
  modelSizeMb?: number | null;
  gpuOffloadPercent?: number | null;
  label?: string | null;
  /** Werdykt walidatora JSON - tylko dla kategorii `json`. */
  jsonValid?: boolean | null;
  /** Werdykt składni Pythona - tylko dla kategorii `coding`. */
  pythonVerdict?: string | null;
  response?: string;
  error?: string | null;
  cancelled?: boolean;
  gpu?: string | null;
  /**
   * Modele zwolnione z pamięci przy starcie przebiegu - te, które zostały
   * w VRAM po poprzednim teście, a nie biorą udziału w tym.
   */
  models?: string[];
}

export interface ClassifyRequest {
  runId: string;
  model: string;
  categoryId: string;
  categoryName: string;
  promptIndex: number;
  prompt: string;
  response: string;
  ttftMs: number | null;
  tokensPerSec: number | null;
  totalMs: number;
  vramPeakMb: number | null;
  gpuOffloadPercent: number | null;
}

/**
 * Etykiety klasyfikacji. To **kody**, nie tekst: trafiają do historii i eksportu,
 * więc muszą być niezależne od języka - tłumaczenie dzieje się dopiero przy
 * wyświetlaniu (`t(label)`). Ten sam zestaw kodów zna backend, patrz `LABEL_CODES`
 * w `src-tauri/src/export.rs`.
 */
export const CLASSIFICATION_LABELS = [
  "label.completed",
  "label.refused",
  "label.limited",
] as const;

export type ClassificationLabel = (typeof CLASSIFICATION_LABELS)[number];

/**
 * Etykiety zapisane przez starsze wersje aplikacji: polski tekst wprost w danych,
 * bo wtedy klucz tłumaczenia był jednocześnie zapisywaną wartością. Czytamy je
 * dalej (patrz `labelKey`), żeby stare przebiegi nie straciły oceny - ale nic
 * nowego już tak nie zapisujemy. Te trzy literały to jedyny polski tekst w tym
 * pliku i nie są tekstem interfejsu, a zgodnością ze starymi danymi.
 */
const LEGACY_LABELS: Record<string, ClassificationLabel> = {
  Wykonał: "label.completed",
  Odmówił: "label.refused",
  "Wykonał ale ograniczył/zmienił": "label.limited",
};

/**
 * Kod etykiety z wartości zapisanej w historii - dawnej (polski tekst) albo
 * obecnej (kod). `null` dla braku oceny.
 */
export function labelKey(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return LEGACY_LABELS[stored] ?? stored;
}

/**
 * Nazwy typów kategorii. **Nie tłumaczymy ich** - kategoria nazywa się
 * „Coding” w każdym języku (tak samo jak nazwy kategorii zapisane w konfiguracji),
 * więc nie ma tu kluczy tłumaczeń. Wcześniej typ szedł przez `t()` i polski
 * użytkownik widział obok siebie „Coding” (nazwa) i „Kodowanie” (typ).
 */
export const KIND_LABEL: Record<CategoryKind, string> = {
  coding: "Coding",
  chat: "Chat",
  vlm: "Images (VLM)",
  classification: "Classification",
  reasoning: "Reasoning / math",
  json: "Structured output (JSON)",
  long_context: "Long context / summarization",
};

/**
 * Podpowiedź w pustym polu promptu, per typ kategorii.
 *
 * Prompty startują puste - kategorie nie przychodzą już z żadnym przykładowym
 * pytaniem, bo nie da się zgadnąć, w jakim języku użytkownik myśli. Ale puste
 * pole bez podpowiedzi nic nie mówi, więc pokazujemy **przykład** pasujący do
 * typu kategorii i idący za językiem interfejsu (`t(PROMPT_HINT[kind])`).
 * To podpowiedź, nie treść - wpisanie własnego pytania ją zastąpi.
 */
export const PROMPT_HINT: Record<CategoryKind, string> = {
  coding: "hint.coding",
  chat: "hint.chat",
  vlm: "hint.vlm",
  classification: "hint.classification",
  reasoning: "hint.reasoning",
  json: "hint.json",
  long_context: "hint.long_context",
};

// --- HuggingFace: katalog modeli GGUF --------------------------------------
//
// Wszystko poniżej to **odbicie kształtu** odpowiedzi z `src-tauri/src/hf.rs`.
// Reguły, które zamieniają listę plików w warianty, są po stronie Rusta (mają
// tam testy na prawdziwych nazwach plików) - interfejs ich nie powtarza, tylko
// pokazuje wynik. Dlatego nie ma tu nic, co samodzielnie liczy rozmiar.

/**
 * Gdzie wariant wyląduje w pamięci tego komputera.
 *
 * `kvIncluded: false` nie jest niedoróbką: HF nie podaje liczby warstw ani
 * głów na KV, więc doliczenie pamięci kontekstu byłoby zgadywaniem. Liczba
 * jest **dolną granicą** i interfejs musi to powiedzieć wprost.
 */
export interface HfVariantMemory {
  neededMb: number;
  kvIncluded: boolean;
  fit: MemoryFit;
}

/** Jeden plik GGUF repozytorium = jeden tag Ollamy. */
export interface HfVariant {
  /** `Q4_K_M`, `UD-Q4_K_XL` albo cała nazwa pliku, gdy kwantyzacji nie znamy. */
  label: string;
  knownQuant: boolean;
  file: string;
  /** Tag dla Ollamy: `hf.co/<repo>:<kwantyzacja>`. */
  tag: string;
  sizeBytes: number;
  /** Rozmiar pobrania: plik modelu plus projektor, gdy Ollama go dociągnie. */
  downloadBytes: number;
  projectorBytes: number | null;
  memory: HfVariantMemory | null;
}

/** Grupa plików pomocniczych, pominięta w całości (np. modele szkicujące). */
export interface HfSkippedGroup {
  base: string;
  files: number;
}

export interface HfFiles {
  variants: HfVariant[];
  projector: string | null;
  projectorBytes: number | null;
  projectorCount: number;
  /** Kwantyzacje rozbite na kawałki - pominięte, ale wypisane z nazwy. */
  skippedSplit: string[];
  skippedGroups: HfSkippedGroup[];
}

/** Filtry przekazywane do HF. Puste pole szukania = przeglądanie katalogu. */
export interface HfQuery {
  search?: string;
  pipelineTag?: string;
  minParamsB?: number;
  maxParamsB?: number;
  cursor?: string;
}

export interface HfRepo {
  id: string;
  url: string;
  downloads: number;
  likes: number;
  pipelineTag: string | null;
  /** Model z obrazami - pewny sygnał z zadania, nie zgadywanie z nazwy. */
  vision: boolean;
  lastModified: string | null;
}

export interface HfSearch {
  repos: HfRepo[];
  nextCursor: string | null;
}

export interface HfRepoDetails {
  repo: string;
  url: string;
  files: HfFiles;
  /**
   * Repozytorium zamknięte. Ollama obsługuje je **swoim kluczem SSH**, nie
   * tokenem API - więc interfejs nie może obiecać, że wystarczy coś wpisać.
   */
  gated: boolean;
  contextLength: number | null;
  architecture: string | null;
}

/**
 * Zadania z HF, dla których mamy filtry. Puste = bez filtra (katalog).
 *
 * Bez żadnego filtra samo `filter=gguf` wpuszcza śmieci - w pierwszej trójce
 * po popularności potrafi wypaść model do rozpoznawania mowy, którego Ollama
 * nie uruchomi. Te dwie wartości to zadania, które da się u nas odpalić.
 */
export const HF_TASKS = {
  text: "text-generation",
  vision: "image-text-to-text",
} as const;

export type HfTaskFilter = "text" | "vision" | "all";
