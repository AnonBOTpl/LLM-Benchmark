import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type {
  AppConfig,
  AppSettings,
  BenchmarkRun,
  BenchProgress,
  Category,
  ClassifyRequest,
  ClearOutcome,
  HfQuery,
  HfRepoDetails,
  HfSearch,
  LoadOutcome,
  LoadedModel,
  ModelInfo,
  ModelOptions,
  OllamaStatus,
  PullProgress,
  RunSummary,
  StoragePaths,
  StorageStats,
  TokenEvent,
  VramForecast,
  VramSample,
} from "./types";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// --- commands --------------------------------------------------------------

export const getConfig = () => invoke<AppConfig>("get_config");
export const setConfig = (config: AppConfig) => invoke<void>("set_config", { config });

export const ollamaStatus = () => invoke<OllamaStatus>("ollama_status");
export const pullModel = (model: string) => invoke<void>("pull_model", { model });
export const modelInfo = (tag: string) => invoke<ModelInfo>("model_info", { tag });
export const deleteModel = (model: string) => invoke<void>("delete_model", { model });

/** Co Ollama trzyma teraz w pamięci (`GET /api/ps`). */
export const loadedModels = () => invoke<LoadedModel[]>("loaded_models");
/** Ładuje model z góry, żeby pierwszy prompt nie płacił za zimny start. */
export const loadModel = (model: string) => invoke<LoadOutcome>("load_model", { model });
/** Zwalnia pamięć: `keep_alive: 0`. */
export const unloadModel = (model: string) => invoke<LoadOutcome>("unload_model", { model });

export const vramSnapshot = () => invoke<VramSample>("vram_snapshot");
export const isRunning = () => invoke<boolean>("is_running");
export const pickImage = () => invoke<string | null>("pick_image");

export const listRuns = () => invoke<RunSummary[]>("list_runs");
export const getRun = (id: string) => invoke<BenchmarkRun>("get_run", { id });
export const deleteRun = (id: string) => invoke<void>("delete_run", { id });
export const setLabel = (
  id: string,
  model: string,
  categoryId: string,
  index: number,
  label: string | null,
) => invoke<void>("set_label", { id, model, categoryId, index, label });

export const exportRun = (id: string, format: "csv" | "html") =>
  invoke<string>("export_run", { id, format });
export const openPath = (path: string) => invoke<void>("open_path", { path });
export const openUrl = (url: string) => invoke<void>("open_url", { url });

// --- ustawienia, miejsce na dysku, ostrzeżenie o VRAM -----------------------

export const getSettings = () => invoke<AppSettings>("get_settings");
export const setSettings = (settings: AppSettings) =>
  invoke<void>("set_settings", { settings });
/** Usuwa `settings.json` i zwraca wartości domyślne. */
export const resetSettings = () => invoke<AppSettings>("reset_settings");

export const storagePaths = () => invoke<StoragePaths>("storage_paths");
export const exportsStats = () => invoke<StorageStats>("exports_stats");
/**
 * Usuwa wskazane przebiegi. Identyfikatory liczy frontend, więc użytkownik
 * kasuje dokładnie tę listę, którą widział w podglądzie.
 */
export const clearHistory = (ids: string[]) =>
  invoke<ClearOutcome>("clear_history", { ids });
export const clearExports = () => invoke<ClearOutcome>("clear_exports");

/** Szacunek zużycia VRAM dla par, które mają wystartować. */
export const vramForecast = (
  targets: { model: string; numCtx?: number | null; numGpu?: number | null }[],
) => invoke<VramForecast>("vram_forecast", { targets });

/**
 * Każda para niesie ustawienia faktycznie użyte dla tego uruchomienia:
 * rozwiązany system prompt i parametry generowania.
 */
export const runBenchmark = (
  pairs: {
    model: string;
    category: Category;
    systemPrompt: string | null;
    options: ModelOptions;
  }[],
) => invoke<string>("run_benchmark", { plan: { pairs } });
export const cancelRun = () => invoke<void>("cancel_run");
export const submitClassification = (label: string) =>
  invoke<void>("submit_classification", { label });

// --- HuggingFace: katalog modeli GGUF --------------------------------------

/** Katalog albo szukanie. Puste `search` = przeglądanie po popularności. */
export const hfSearch = (query: HfQuery) => invoke<HfSearch>("hf_search", { query });
/**
 * Pliki jednego repozytorium plus ocena pamięci tego komputera.
 *
 * Jedno zapytanie na repozytorium, nie na plik: `blobs=true` daje rozmiary
 * wszystkich plików naraz, a na liście wyników HF zwraca pustą listę.
 */
export const hfRepo = (repo: string) => invoke<HfRepoDetails>("hf_repo", { repo });

// --- events ----------------------------------------------------------------

export const EVT_TOKEN = "bench-token";
export const EVT_PROGRESS = "bench-progress";
export const EVT_CLASSIFY = "bench-classify-request";
export const EVT_PULL = "pull-progress";
export const EVT_VRAM = "vram-sample";

export const onToken = (cb: (payload: TokenEvent) => void): Promise<UnlistenFn> =>
  listen<TokenEvent>(EVT_TOKEN, (e) => cb(e.payload));

export const onProgress = (cb: (payload: BenchProgress) => void): Promise<UnlistenFn> =>
  listen<BenchProgress>(EVT_PROGRESS, (e) => cb(e.payload));

export const onClassifyRequest = (
  cb: (payload: ClassifyRequest) => void,
): Promise<UnlistenFn> => listen<ClassifyRequest>(EVT_CLASSIFY, (e) => cb(e.payload));

export const onPullProgress = (cb: (payload: PullProgress) => void): Promise<UnlistenFn> =>
  listen<PullProgress>(EVT_PULL, (e) => cb(e.payload));

export const onVram = (cb: (payload: VramSample) => void): Promise<UnlistenFn> =>
  listen<VramSample>(EVT_VRAM, (e) => cb(e.payload));
