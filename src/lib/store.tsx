import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import * as api from "./api";
import type {
  AppConfig,
  AppSettings,
  ClassifyRequest,
  OllamaStatus,
  RunSummary,
  VramSample,
} from "./types";

interface AppContextValue {
  ready: boolean;
  bootError: string | null;
  config: AppConfig | null;
  updateConfig: (mutate: (config: AppConfig) => AppConfig) => void;
  settings: AppSettings | null;
  updateSettings: (mutate: (settings: AppSettings) => AppSettings) => void;
  /** Usuwa `settings.json` i wraca do wartości domyślnych. */
  restoreDefaultSettings: () => Promise<void>;
  status: OllamaStatus | null;
  refreshStatus: () => Promise<void>;
  vram: VramSample | null;
  runs: RunSummary[];
  refreshRuns: () => Promise<void>;
  lastRunId: string | null;
  setLastRunId: (id: string | null) => void;
  classifyRequest: ClassifyRequest | null;
  answerClassification: (label: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [config, setConfigState] = useState<AppConfig | null>(null);
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [vram, setVram] = useState<VramSample | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [classifyRequest, setClassifyRequest] = useState<ClassifyRequest | null>(null);

  const configRef = useRef<AppConfig | null>(null);
  const settingsRef = useRef<AppSettings | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.ollamaStatus());
    } catch (error) {
      setBootError(String(error));
    }
  }, []);

  const refreshRuns = useCallback(async () => {
    try {
      setRuns(await api.listRuns());
    } catch (error) {
      setBootError(String(error));
    }
  }, []);

  useEffect(() => {
    if (!api.isTauri()) {
      setBootError(
        // Komunikat dla programisty, nie tekst interfejsu (widać go tylko przy
        // otwarciu strony w przeglądarce), więc zostaje po angielsku.
        "This app only runs inside the Tauri window. Use `npm run tauri dev` instead of opening the page in a browser.",
      );
      return;
    }

    api
      .getConfig()
      .then((loaded) => {
        configRef.current = loaded;
        setConfigState(loaded);
      })
      .catch((error) => setBootError(String(error)))
      .finally(() => setReady(true));

    // Ustawienia ładujemy osobno i od razu: język decyduje o tym, jak wygląda
    // każdy napis w aplikacji, więc nie może czekać na konfigurację modeli.
    api
      .getSettings()
      .then((loaded) => {
        settingsRef.current = loaded;
        setSettingsState(loaded);
      })
      .catch(() => undefined);

    void refreshStatus();
    void refreshRuns();
    // The sampler thread emits its first sample while the webview is still
    // booting, so ask for the current state explicitly instead of waiting for
    // the next tick.
    api
      .vramSnapshot()
      .then(setVram)
      .catch(() => undefined);

    const disposers: (() => void)[] = [];
    const register = <T,>(promise: Promise<() => void>, _unused?: T) => {
      promise.then((unlisten) => disposers.push(unlisten)).catch(() => undefined);
    };

    register(api.onVram(setVram));
    register(
      api.onClassifyRequest((payload) => setClassifyRequest(payload)),
    );
    register(
      api.onProgress((payload) => {
        if (payload.phase === "run-start") setLastRunId(payload.runId);
        if (payload.phase === "run-done") {
          // A run can end while the classification modal is open (Stop button).
          setClassifyRequest(null);
          void refreshRuns();
        }
      }),
    );

    // Stan Ollamy pytamy **raz na jakiś czas**, nie tylko przy starcie.
    //
    // Bez tego wystarczy, że Ollama wstanie chwilę po aplikacji (albo
    // użytkownik uruchomi ją dopiero teraz) i aplikacja do końca życia pokazuje
    // „brak połączenia”, liczy zero modeli na dysku i pokazuje każdy model jako
    // niepobrany - dopóki ktoś nie kliknie ręcznie „Odśwież stan”. Zapytanie
    // jest lokalne i tanie (dwa krótkie żądania do Ollamy), więc odpytujemy bez
    //warunków, tak samo jak listę modeli w pamięci.
    const statusTimer = window.setInterval(() => void refreshStatus(), 15_000);
    disposers.push(() => window.clearInterval(statusTimer));

    return () => disposers.forEach((dispose) => dispose());
  }, [refreshRuns, refreshStatus]);

  const updateConfig = useCallback((mutate: (current: AppConfig) => AppConfig) => {
    const previous = configRef.current;
    if (!previous) return;

    const next = mutate(previous);
    configRef.current = next;
    setConfigState(next);

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      api.setConfig(next).catch((error) => setBootError(String(error)));
    }, 350);
  }, []);

  const updateSettings = useCallback((mutate: (current: AppSettings) => AppSettings) => {
    const previous = settingsRef.current;
    if (!previous) return;

    const next = mutate(previous);
    settingsRef.current = next;
    setSettingsState(next);

    // Bez debounce: to pojedyncze kliknięcia, a język ma się zapisać od razu.
    api.setSettings(next).catch((error) => setBootError(String(error)));
  }, []);

  const restoreDefaultSettings = useCallback(async () => {
    const defaults = await api.resetSettings();
    settingsRef.current = defaults;
    setSettingsState(defaults);
  }, []);

  const answerClassification = useCallback(async (label: string) => {
    setClassifyRequest(null);
    await api.submitClassification(label);
  }, []);

  return (
    <AppContext.Provider
      value={{
        ready,
        bootError,
        config,
        updateConfig,
        settings,
        updateSettings,
        restoreDefaultSettings,
        status,
        refreshStatus,
        vram,
        runs,
        refreshRuns,
        lastRunId,
        setLastRunId,
        classifyRequest,
        answerClassification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
