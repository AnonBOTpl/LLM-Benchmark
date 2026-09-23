import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Info,
  Loader2,
  MemoryStick,
  Play,
  RefreshCw,
  Square,
  Terminal,
} from "lucide-react";

import * as api from "../lib/api";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { DASH, fmtMs, fmtMb, fmtNum } from "../lib/format";
import { installedEntry as findInstalled } from "../lib/models";
import {
  pythonVerdictClass,
  pythonVerdictKey,
  pythonVerdictMark,
} from "../lib/pythonVerdict";
import {
  describeOptions,
  hasCustomOptions,
  resolveSystemPrompt,
} from "../lib/modelSettings";
import {
  KIND_LABEL,
  enabledPromptCount,
  totalPromptCount,
  type Category,
  type CategoryKind,
  type MemoryFit,
  type ModelEntry,
  type ModelForecast,
  type ModelOptions,
  type ProgressPhase,
  type VramForecast,
} from "../lib/types";
import { Empty, Metric, Pill, ProgressBar, SectionHeader } from "../components/ui";

interface Row {
  model: string;
  categoryId: string;
  categoryName: string;
  promptIndex: number;
  ttftMs: number | null;
  tokensPerSec: number | null;
  measuredTokensPerSec: number | null;
  vramPeakMb: number | null;
  modelSizeMb: number | null;
  gpuOffloadPercent: number | null;
  totalMs: number;
  response: string;
  /** Werdykt walidatora JSON - `null` poza kategorią `json`. */
  jsonValid: boolean | null;
  /** Werdykt składni Pythona - `null` poza kategorią „Kodowanie”. */
  pythonVerdict: string | null;
  error: string | null;
  startedAt: number;
}

/**
 * Od ilu znaków prompt w panelu „Postęp na żywo” zwijamy do trzech linii.
 * Prompt testu długiego kontekstu ma ~27 tys. znaków i rozwijał całe okno
 * w pionie - metryki i odpowiedź uciekały wtedy poza ekran.
 */
const PROMPT_PREVIEW_CHARS = 240;

const keyOf = (model: string, categoryId: string) => `${model}::${categoryId}`;

/** Kolor werdyktu pamięci - jeden odcień na stan, wspólny dla panelu i wierszy. */
const fitColor = (fit: MemoryFit | null) =>
  fit === "on_gpu"
    ? "text-emerald-300"
    : fit === "on_gpu_tight" || fit === "partial_cpu"
      ? "text-amber-300"
      : fit === "no_fit"
        ? "text-red-300"
        : "text-slate-500";

// Kategoria z samymi odznaczonymi promptami nie ma czego uruchomić - liczy się
// wyłącznie to, co jest włączone.
const hasPrompts = (category: Category) => enabledPromptCount(category) > 0;

export function TestTab() {
  const {
    config,
    status,
    vram,
    refreshRuns,
    setLastRunId,
    classifyRequest,
    settings,
    updateSettings,
  } = useApp();
  const { t, language, locale } = useI18n();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [current, setCurrent] = useState<{
    model: string;
    categoryName: string;
    promptIndex: number;
    promptTotal: number;
    overallDone: number;
    overallTotal: number;
    prompt: string;
    kind: string;
  } | null>(null);
  const [phase, setPhase] = useState<ProgressPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  /**
   * Postęp całego przebiegu, aktualizowany także po zakończeniu promptu.
   * Wcześniej licznik stał na wartości z `prompt-start`, więc po ostatnim
   * promptcie pasek zatrzymywał się w połowie drogi.
   */
  const [overall, setOverall] = useState<{ done: number; total: number } | null>(null);
  /** Modele zwolnione z VRAM przy starcie tego przebiegu. */
  const [unloaded, setUnloaded] = useState<string[]>([]);
  const [forecast, setForecast] = useState<VramForecast | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  /**
   * Trzymamy **tekst** rozwiniętego promptu, a nie samą flagę: dzięki temu
   * następny prompt jest znowu zwinięty bez pilnowania tego efektem.
   */
  const [openPrompt, setOpenPrompt] = useState<string | null>(null);

  const buffer = useRef("");
  const initialized = useRef(false);
  const rowStart = useRef(0);
  /** Pole podglądu odpowiedzi - potrzebne do autoscrolla niżej. */
  const answerRef = useRef<HTMLPreElement | null>(null);
  /**
   * Czy użytkownik jest „na dole” podglądu. W `ref`, a nie w stanie: zmienia
   * się przy każdym zdarzeniu przewijania, a nie wpływa na wygląd.
   */
  const stickToBottom = useRef(true);

  /** Ustawienie z Ustawień; brak wczytanych = włączone, tak jak domyślnie. */
  const autoScroll = settings?.autoScrollAnswer ?? true;

  /**
   * Modele, o których **wiemy**, że nie ma ich na dysku. Pusta lista
   * `installed` znaczy „Ollama nie odpowiada", a nie „wszystkie brakują" -
   * inaczej przy zatrzymanej Ollamie zablokowalibyśmy całą macierz.
   */
  const missingModels = useMemo(() => {
    const installed = status?.installed ?? [];
    if (!config || !installed.length) return new Set<string>();
    return new Set(
      config.models
        .filter((model) => !findInstalled(installed, model.tag))
        .map((model) => model.tag),
    );
  }, [config, status]);

  const initialSelection = useMemo(() => {
    const next: Record<string, boolean> = {};
    if (!config) return next;
    for (const model of config.models) {
      for (const category of config.categories) {
        next[keyOf(model.tag, category.id)] =
          model.categoryIds.includes(category.id) && !missingModels.has(model.tag);
      }
    }
    return next;
  }, [config, missingModels]);

  useEffect(() => {
    if (!config || initialized.current) return;
    setSelected(initialSelection);
    initialized.current = true;
  }, [config, initialSelection]);

  // Token stream: buffered in a ref and flushed ~8x/second so a fast model
  // cannot choke the renderer.
  useEffect(() => {
    const promise = api.onToken((payload) => {
      buffer.current += payload.token;
    });
    return () => {
      promise.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setText((previous) => (previous === buffer.current ? previous : buffer.current));
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  /**
   * Autoscroll podglądu odpowiedzi.
   *
   * Dwie rzeczy decydują o tym, czy to pomaga, czy przeszkadza:
   * - przewijamy **tylko**, gdy użytkownik już był na dole - inaczej tekst
   *   uciekałby spod palca, gdy ktoś czyta początek długiej odpowiedzi;
   * - `text` zmienia się porcjami (~8×/s, tak samo jak bufor strumienia), więc
   *   nie dokładamy ani jednego renderu.
   */
  useEffect(() => {
    const element = answerRef.current;
    if (!element || !autoScroll || !stickToBottom.current) return;
    element.scrollTop = element.scrollHeight;
  }, [text, autoScroll]);

  useEffect(() => {
    const promise = api.onProgress((payload) => {
      setPhase(payload.phase);

      if (payload.phase === "run-start") {
        buffer.current = "";
        setText("");
        setRows([]);
        setError(null);
        setRunning(true);
        setCurrent(null);
        setUnloaded([]);
        setOverall({ done: payload.overallDone ?? 0, total: payload.overallTotal ?? 0 });
        setLastRunId(payload.runId);
      }

      // Modele z poprzedniego testu zwolnione z pamięci, żeby nowy model miał
      // cały VRAM dla siebie.
      if (payload.phase === "models-unloaded") {
        setUnloaded(payload.models ?? []);
      }

      if (payload.phase === "prompt-start") {
        buffer.current = "";
        setText("");
        rowStart.current = Date.now();
        setOverall({ done: payload.overallDone, total: payload.overallTotal });
        setCurrent({
          model: payload.model ?? "",
          categoryName: payload.categoryName ?? "",
          promptIndex: payload.promptIndex ?? 0,
          promptTotal: payload.promptTotal ?? 0,
          overallDone: payload.overallDone,
          overallTotal: payload.overallTotal,
          prompt: payload.prompt ?? "",
          kind: payload.kind ?? "",
        });
      }

      if (payload.phase === "prompt-done" && payload.model && payload.categoryId) {
        setOverall({ done: payload.overallDone, total: payload.overallTotal });
        setRows((previous) =>
          [
            {
              model: payload.model!,
              categoryId: payload.categoryId!,
              categoryName: payload.categoryName ?? "",
              promptIndex: (payload.promptIndex ?? 0) + 1,
              ttftMs: payload.ttftMs ?? null,
              tokensPerSec: payload.tokensPerSec ?? null,
              measuredTokensPerSec: payload.measuredTokensPerSec ?? null,
              vramPeakMb: payload.vramPeakMb ?? null,
              modelSizeMb: payload.modelSizeMb ?? null,
              gpuOffloadPercent: payload.gpuOffloadPercent ?? null,
              totalMs: payload.totalMs ?? 0,
              response: payload.response ?? "",
              jsonValid: payload.jsonValid ?? null,
              pythonVerdict: payload.pythonVerdict ?? null,
              error: payload.error ?? null,
              startedAt: Date.now(),
            },
            ...previous,
          ].slice(0, 40),
        );
      }

      if (payload.phase === "run-done") {
        setRunning(false);
        setCurrent(null);
        // Przebieg jest skończony, więc pasek domykamy na 100% - bez tego
        // zostawał na wartości z ostatniego promptu (wyglądało jak zawieszenie).
        setOverall({ done: payload.overallTotal ?? 0, total: payload.overallTotal ?? 0 });
        void refreshRuns();
      }
    });

    return () => {
      promise.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, [refreshRuns, setLastRunId]);

  // Kolumna walidatora JSON pojawia się dopiero, gdy przebieg ma co pokazać -
  // tabela jest wąska i nie ma sensu wozić w niej kolumny pełnej kresek.
  const showJson = rows.some((row) => row.jsonValid !== null);
  const showPython = rows.some((row) => row.pythonVerdict !== null);

  /**
   * Krótka etykieta werdyktu przy modelu w panelu prognozy. Zdania są osobne od
   * nagłówka panelu: tam mowa o całym zestawie, tu o jednym modelu.
   */
  const fitLabel = (model: ModelForecast) => {
    if (!model.fit) return null;
    return (
      <span className={`text-[12px] ${fitColor(model.fit)}`}>
        {model.fit === "on_gpu"
          ? t("vram.fit.on_gpu")
          : model.fit === "on_gpu_tight"
            ? t("vram.fit.on_gpu_tight")
            : model.fit === "partial_cpu"
              ? t("vram.fit.partial_cpu")
              : model.fit === "no_fit"
                ? t("vram.fit.no_fit")
                : t("vram.fit.unknown_gpu")}
      </span>
    );
  };

  const enabledModels = useMemo(
    () => (config?.models ?? []).filter((model) => model.enabled),
    [config],
  );
  const usableCategories = useMemo(
    () => (config?.categories ?? []).filter(hasPrompts),
    [config],
  );

  /**
   * Modele przypisane do kategorii obrazów, które - według Ollamy - nie mają
   * capability `vision`. Taki prompt z obrazem skończy się błędem, więc lepiej
   * ostrzec przed startem niż pokazać błąd w wynikach.
   */
  const vlmMismatch = useMemo(() => {
    if (!config || !status) return [];
    const vlmCategory = config.categories.find((category) => category.kind === "vlm");
    if (!vlmCategory) return [];
    return config.models
      .filter((model) => model.enabled && model.categoryIds.includes(vlmCategory.id))
      .filter((model) => {
        const installed = findInstalled(status.installed, model.tag);
        return !!installed && !installed.capabilities.includes("vision");
      })
      .map((model) => model.tag);
  }, [config, status]);

  const pairs = useMemo(() => {
    const result: {
      model: string;
      category: Category;
      systemPrompt: string | null;
      options: ModelOptions;
    }[] = [];
    for (const model of enabledModels) {
      // Modelu, którego nie ma na dysku, nie ma też w przebiegu: każdy prompt
      // skończyłby się błędem, a zaznaczenie jest zablokowane w macierzy.
      if (missingModels.has(model.tag)) continue;
      for (const category of usableCategories) {
        if (!selected[keyOf(model.tag, category.id)]) continue;
        result.push({
          model: model.tag,
          category,
          // System prompt rozwiązujemy dla pary model × kategoria: własny, jeśli
          // użytkownik go ustawił, a inaczej domyślny dla typu tej kategorii
          // (z uwzględnieniem nadpisań z Ustawień).
          systemPrompt:
            resolveSystemPrompt(model, category.kind, settings?.defaultSystemPrompts).text.trim() ||
            null,
          options: model.options ?? {},
        });
      }
    }
    return result;
  }, [enabledModels, missingModels, selected, usableCategories, settings]);

  /**
   * Ostrzeżenie o VRAM liczymy dla **modeli** (nie par): model z dwiema
   * kategoriami wczytuje się raz, więc liczenie go dwa razy zawyżyłoby wynik.
   */
  const forecastTargets = useMemo(() => {
    const unique = new Map<string, { model: string; numCtx: number | null; numGpu: number | null }>();
    for (const pair of pairs) {
      if (unique.has(pair.model)) continue;
      unique.set(pair.model, {
        model: pair.model,
        numCtx: pair.options.numCtx ?? null,
        numGpu: pair.options.numGpu ?? null,
      });
    }
    return [...unique.values()];
  }, [pairs]);

  const forecastKey = useMemo(
    () => forecastTargets.map((target) => `${target.model}:${target.numCtx}:${target.numGpu}`).join("|"),
    [forecastTargets],
  );

  useEffect(() => {
    setForecastError(null);
    if (!forecastTargets.length) {
      setForecast(null);
      return;
    }
    // Debounce: zaznaczanie kilku kolumn naraz nie może wystrzelić kilkunastu
    // zapytań do `/api/show`.
    const timer = window.setTimeout(() => {
      api
        .vramForecast(forecastTargets)
        .then(setForecast)
        .catch((cause) => setForecastError(String(cause)));
    }, 500);
    return () => window.clearTimeout(timer);
    // `running` w zależnościach: po przebiegu modele są już w pamięci, więc
    // rozmiary z `/api/ps` są dokładniejsze niż przed startem.
  }, [forecastKey, forecastTargets, running]);

  /**
   * **Jeden** komunikat o pamięci, po kolei od najgorszego przypadku. Werdykt
   * per model mówi, gdzie wyląduje pojedynczy model; tu chodzi o cały zestaw,
   * więc dochodzi jeszcze suma - bez tego plakietka mówiła „na karcie", gdy po
   * wczytaniu wszystkiego zostawało 285 MB.
   */
  const memoryBox: "no_fit" | "short" | "partial" | "tight" | null = !forecast
    ? null
    : !forecast.available
      ? null
      : forecast.verdict === "no_fit"
        ? "no_fit"
        : // Kolejność jest decyzją: najpierw mówimy, gdzie model wyląduje
          // („częściowo na CPU" znaczy „ruszy, tylko wolno"), a dopiero potem
          // o tym, że **zestaw** nie mieści się na karcie naraz.
          forecast.verdict === "partial_cpu"
          ? "partial"
          : !forecast.fits
            ? "short"
            : forecast.tight
              ? "tight"
              : null;

  if (!config) return null;

  const toggle = (model: string, categoryId: string) =>
    setSelected((previous) => ({
      ...previous,
      [keyOf(model, categoryId)]: !previous[keyOf(model, categoryId)],
    }));

  /**
   * Czy tę parę w ogóle da się uruchomić. Zaznaczanie zbiorcze musi to
   * respektować: kategoria bez promptów i model, którego nie ma na dysku, nie
   * wejdą do przebiegu, więc wpisanie ich do zaznaczenia obiecałoby więcej, niż
   * ruszy - a licznik pod tabelą pokazywałby pary, których nie ma.
   */
  const applicable = (model: ModelEntry, category: Category) =>
    hasPrompts(category) && !missingModels.has(model.tag);

  const setAll = (
    matches: (model: ModelEntry, category: Category) => boolean,
    value: boolean,
  ) =>
    setSelected((previous) => {
      const next = { ...previous };
      for (const model of enabledModels) {
        for (const category of config.categories) {
          if (!applicable(model, category) || !matches(model, category)) continue;
          next[keyOf(model.tag, category.id)] = value;
        }
      }
      return next;
    });

  /**
   * Przełącznik zbiorczy działa jak checkbox: dopóki coś jest odznaczone,
   * kliknięcie zaznacza wszystko, a dopiero potem odznacza. Bez tego drugie
   * kliknięcie w kolumnę, w której brakuje jednej pary, tylko ją dopełniało
   * i wyglądało jak brak reakcji.
   */
  const anyOff = (matches: (model: ModelEntry, category: Category) => boolean) =>
    enabledModels.some((model) =>
      config.categories.some(
        (category) =>
          applicable(model, category) &&
          matches(model, category) &&
          !selected[keyOf(model.tag, category.id)],
      ),
    );

  const toggleColumn = (category: Category) =>
    setAll((model, current) => current.id === category.id, anyOff((_, current) => current.id === category.id));

  const toggleRow = (model: ModelEntry) =>
    setAll((current) => current.tag === model.tag, anyOff((current) => current.tag === model.tag));

  const start = async () => {
    if (!pairs.length) {
      setError(t("test.pick_pair"));
      return;
    }
    setError(null);
    setRunning(true);
    try {
      const id = await api.runBenchmark(pairs);
      setLastRunId(id);
    } catch (cause) {
      setRunning(false);
      setError(String(cause));
    }
  };

  const stop = async () => {
    try {
      await api.cancelRun();
    } catch (cause) {
      setError(String(cause));
    }
  };

  // Ostatnio zakończony prompt bez ani jednego znaku odpowiedzi - to nie jest
  // "brak danych", tylko konkretny wynik, który trzeba nazwać po imieniu.
  const emptyResponse =
    !running && !!rows[0] && !rows[0].error && rows[0].response.trim() === "";

  const progressPercent = overall && overall.total > 0 ? (overall.done / overall.total) * 100 : 0;
  const promptText = current?.prompt ?? "";
  const promptLong = promptText.length > PROMPT_PREVIEW_CHARS;
  const promptExpanded = promptLong && openPrompt === promptText;

  return (
    <div className="grid h-full grid-cols-1 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="space-y-4">
        <div className="card p-4">
          <SectionHeader
            icon={<Play size={15} />}
            title={t("test.selection_title")}
            subtitle={t(
              "test.selection_hint",
            )}
            right={
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost btn-xs"
                  onClick={() => setSelected(initialSelection)}
                  disabled={running}
                >
                  <RefreshCw size={12} />
                  {t("common.reset")}
                </button>
                {/*
                  Zaznaczanie globalne stoi tu, a nie w osobnym pasku nad tabelą:
                  obok „Reset" już jest sterowanie zaznaczeniem, a pasek z
                  chipami kosztował zmierzone +62 px wysokości przy 906 px
                  szerokości kontenera (2 wiersze), czyli więcej, niż oddaje
                  zabranie liczników z nagłówków.
                */}
                <button
                  className="btn-ghost btn-xs"
                  onClick={() => setAll(() => true, true)}
                  disabled={running}
                >
                  {t("test.select_all")}
                </button>
                <button
                  className="btn-ghost btn-xs"
                  onClick={() => setAll(() => true, false)}
                  disabled={running}
                >
                  {t("test.select_none")}
                </button>
                {running ? (
                  <button className="btn-danger" onClick={() => void stop()}>
                    <Square size={13} />
                    {t("test.stop")}
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => void start()}>
                    <Play size={14} />
                    {t("test.start")}
                  </button>
                )}
              </div>
            }
          />

          {!status?.running ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
              <AlertTriangle size={12} />
              {t("test.ollama_down", {
                endpoint: status?.endpoint ?? "http://127.0.0.1:11434",
              })}
            </div>
          ) : null}

          {enabledModels.length === 0 ? (
            <Empty
              title={t("test.no_models")}
              hint={t("test.no_models_hint")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="cell-head">{t("common.model")}</th>
                    {config.categories.map((category) => {
                      // Nagłówek kolumny jest przyciskiem zaznaczania całej
                      // kolumny. Ta sama funkcja, którą miały tu kiedyś przyciski
                      // „wszystkie / żadne", ale kosztuje zero pikseli: tamta
                      // para tekstowych przycisków nie mogła się zawinąć, więc
                      // dyktowała minimalną szerokość kolumny (w polskim 101 px
                      // przy nazwie mieszczącej się w 80) i to przez nią ostatnia
                      // kategoria wychodziła za tabelę. Osobny pasek nad tabelą
                      // też odpada - zmierzone +62 px wysokości przy 906 px
                      // szerokości kontenera, czyli więcej, niż oddaje zabranie
                      // licznika z nagłówka (-24 px).
                      const clickable = !running && hasPrompts(category);
                      return (
                        <th key={category.id} className="cell-head text-center">
                          <button
                            type="button"
                            className={`flex w-full flex-col items-center gap-1 ${
                              clickable ? "cursor-pointer hover:text-slate-300" : ""
                            }`}
                            onClick={() => toggleColumn(category)}
                            disabled={!clickable}
                            title={
                              hasPrompts(category)
                                ? t("test.select_column_tip")
                                : t("test.no_prompts")
                            }
                          >
                            <span>{category.name}</span>
                            {hasPrompts(category) ? (
                              // Licznik musi być w jednej linii: bez tego kolumna
                              // „Coding" łamała go na „4" i „prompty", a przy
                              // dłuższych słowach („2 imágenes", „2 immagini")
                              // nagłówek rósł do trzech linii w hiszpańskim
                              // i włoskim. Zmierzone we wszystkich siedmiu
                              // językach: min-content tabeli rośnie o 9-20 px
                              // (769 -> 789 w najgorszym wypadku przy 906 px
                              // kontenera), a w es/it nagłówek maleje o 20 px.
                              <span className="whitespace-nowrap text-[12px] font-normal normal-case text-slate-500">
                                {t(category.kind === "vlm" ? "test.count_images" : "test.count_prompts", {
                                  count: enabledPromptCount(category),
                                })}
                                {enabledPromptCount(category) < totalPromptCount(category)
                                  ? t("test.count_total_suffix", { total: totalPromptCount(category) })
                                  : ""}
                              </span>
                            ) : (
                              <span className="whitespace-nowrap text-[12px] font-normal normal-case text-amber-400">
                                {t("test.no_prompts")}
                              </span>
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {enabledModels.map((model) => (
                    <tr key={model.tag} className="border-t border-ink-800">
                      <td className="cell">
                        {/* Nazwa modelu jest przyciskiem zaznaczania całego
                            wiersza - ta sama zasada co w nagłówku kolumny. */}
                        <button
                          type="button"
                          className={`block text-left font-mono text-[13px] text-slate-200 ${
                            running || missingModels.has(model.tag)
                              ? ""
                              : "cursor-pointer hover:text-white"
                          }`}
                          onClick={() => toggleRow(model)}
                          disabled={running || missingModels.has(model.tag)}
                          title={
                            missingModels.has(model.tag)
                              ? t("test.not_downloaded_locked")
                              : t("test.select_row_tip")
                          }
                        >
                          {model.tag}
                        </button>
                        {hasCustomOptions(model.options) || model.systemPrompt ? (
                          <div
                            className="mt-0.5 text-[12px] text-accent-400"
                            title={`${t(describeOptions(model.options))}${
                              model.systemPrompt
                                ? ` · ${t("test.badge_system")}`
                                : ` · ${t("test.badge_system_default")}`
                            }`}
                          >
                            {t("test.custom_settings")}
                          </div>
                        ) : null}
                        {missingModels.has(model.tag) ? (
                          <div className="mt-0.5 text-[12px] text-amber-400">
                            {t("common.not_downloaded")}
                          </div>
                        ) : null}
                      </td>
                      {config.categories.map((category) => {
                        const usable = hasPrompts(category);
                        const missing = missingModels.has(model.tag);
                        const active = !!selected[keyOf(model.tag, category.id)];
                        return (
                          <td key={category.id} className="cell text-center">
                            <input
                              type="checkbox"
                              // Modelu, którego nie ma na dysku, nie da się
                              // przetestować - checkbox jest zablokowany, a nie
                              // ukryty, żeby było widać, czego brakuje.
                              disabled={!usable || running || missing}
                              // Kategorie bez promptów i modele bez pliku nie
                              // wchodzą do testu, więc bez zaznaczenia.
                              checked={usable && !missing ? active : false}
                              onChange={() => toggle(model.tag, category.id)}
                              title={missing ? t("test.not_downloaded_locked") : undefined}
                              className="h-4 w-4 accent-cyan-400 disabled:opacity-20"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
            <span>
              {t("test.selected", {
                count: pairs.length,
                models: enabledModels.length,
              })}
            </span>
            <span>
              {t("test.categories_ready", {
                count: usableCategories.length,
                total: config.categories.length,
              })}
            </span>
          </div>
          {vlmMismatch.length ? (
            <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{t("test.vision_warning", { models: vlmMismatch.join(", ") })}</span>
            </div>
          ) : null}
          {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
        </div>

        {forecast ? (
          <div className="card p-4">
            <SectionHeader
              icon={<MemoryStick size={15} />}
              title={t("vram.title")}
              subtitle={t("vram.required", {
                required: forecast.requiredMb,
                total: forecast.totalMb,
              })}
              right={
                memoryBox === null ? (
                  forecast.available ? (
                    <Pill tone="ok" icon={<CheckCircle2 size={11} />}>
                      {t("vram.free_after", { free: forecast.headroomMb })}
                    </Pill>
                  ) : null
                ) : memoryBox === "tight" ? (
                  <Pill tone="warn" icon={<AlertTriangle size={11} />}>
                    {t("vram.free_after", { free: forecast.headroomMb })}
                  </Pill>
                ) : (
                  <Pill tone={memoryBox === "no_fit" ? "bad" : "warn"} icon={<AlertTriangle size={11} />}>
                    {t("vram.short", {
                      missing: Math.abs(Math.min(0, forecast.headroomMb)),
                    })}
                  </Pill>
                )
              }
            />

            {!forecast.available ? (
              <div className="mb-2 rounded-lg border border-dashed border-ink-700 px-3 py-3 text-[12px] text-slate-500">
                {t("vram.nvml_unavailable")}
              </div>
            ) : null}

            {/*
              „Nie zmieści się" mówi o pamięci, nie o rozmiarze pliku - stąd
              osobne zdanie o pliku wymiany, żeby nikt nie próbował czekać na
              model z dysku.
            */}
            {memoryBox ? (
              <div
                className={`mb-2 flex flex-col gap-1 rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${
                  memoryBox === "no_fit"
                    ? "border-red-500/25 bg-red-500/5 text-red-200"
                    : "border-amber-500/25 bg-amber-500/5 text-amber-200"
                }`}
              >
                <span className="flex items-start gap-1.5">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>
                    {memoryBox === "no_fit"
                      ? t("vram.verdict.no_fit", {
                          needed: forecast.requiredMb,
                          available: forecast.freeVramMb + forecast.ramUsableMb,
                        })
                      : memoryBox === "partial"
                        ? t("vram.verdict.partial_cpu")
                        : memoryBox === "short"
                          ? t("vram.short_hint")
                          : t("vram.tight")}
                  </span>
                </span>
                {memoryBox === "no_fit" ? (
                  <span className="pl-4 opacity-70">{t("vram.swap_hint")}</span>
                ) : memoryBox === "partial" ? (
                  <span className="pl-4 opacity-70">{t("vram.short_hint")}</span>
                ) : null}
              </div>
            ) : null}

            <>

                <div className="space-y-1.5">
                  {forecast.models.map((model) => (
                    <div
                      key={model.model}
                      className="rounded-lg border border-ink-700 bg-ink-850/40 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] text-slate-200">{model.model}</span>
                        <Pill tone={model.status === "loaded" ? "ok" : model.status === "missing" ? "warn" : "neutral"}>
                          {model.status === "loaded"
                            ? t("vram.confirmed")
                            : model.status === "cpu"
                              ? t("test.cpu_only")
                              : model.status === "missing"
                                ? t("common.not_downloaded")
                                : t("test.estimate")}
                        </Pill>
                        {fitLabel(model)}
                        <span className="ml-auto font-mono text-[12px] text-slate-300">
                          {fmtMb(model.totalMb)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-500">
                        {model.weightsMb !== null
                          ? t("vram.breakdown", {
                              weights: model.weightsMb,
                              kv: model.kvMb,
                              context: model.context ?? 0,
                            })
                          : t("vram.context", { context: model.context ?? 0 })}
                      </div>
                      {model.note ? (
                        <div className="mt-1 text-[12px] leading-relaxed text-amber-300/80">
                          {t(model.note)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                  <span>{t("vram.other", { other: forecast.otherMb })}</span>
                  <span>·</span>
                  <span>
                    {t("vram.loaded_now", {
                      loaded: Math.max(0, forecast.usedMb - forecast.otherMb),
                    })}
                  </span>
                </div>

                {/*
                  Werdykt porównuje model z tymi dwiema liczbami, więc obie
                  muszą być widoczne - inaczej ocena wygląda na wziętą znikąd.
                */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
                  <span>{t("vram.card_free", { free: forecast.freeVramMb })}</span>
                  <span>·</span>
                  <span>
                    {t("vram.ram", {
                      free: forecast.ramAvailableMb,
                      total: forecast.ramTotalMb,
                      usable: forecast.ramUsableMb,
                      reserve: forecast.ramReserveMb,
                    })}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-slate-600">
                  {t("vram.ram_snapshot")}
                </div>

                {forecast.notes.length ? (
                  <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-slate-500">
                    {forecast.notes.map((note) => (
                      <li key={note} className="flex items-start gap-1.5">
                        <Info size={11} className="mt-0.5 shrink-0" />
                        <span>{t(note)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
            </>
          </div>
        ) : null}

        {forecastError ? (
          <div className="text-[12px] text-amber-300">{forecastError}</div>
        ) : null}

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-700/70 bg-ink-850/60 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-200">{t("test.recent_title")}</span>
            <span className="text-[12px] text-slate-500">
              {t("test.finished_prompts", { count: rows.length })}
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              {t("test.recent_empty")}
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className="cell-head">{t("common.model")}</th>
                    <th className="cell-head">{t("common.category")}</th>
                    <th className="cell-head">#</th>
                    <th className="cell-head text-right">{t("metrics.ttft")}</th>
                    <th className="cell-head text-right">{t("metrics.tps")}</th>
                    <th className="cell-head text-right">{t("metrics.vram")}</th>
                    <th
                      className="cell-head text-right"
                      title={t(
                        "metrics.gpu_cpu_tip",
                      )}
                    >
                      {t("metrics.gpu_cpu")}
                    </th>
                    <th className="cell-head text-right">{t("common.time")}</th>
                    {showJson ? (
                      <th className="cell-head text-right" title={t("results.json_tip")}>
                        {t("results.json_column")}
                      </th>
                    ) : null}
                    {showPython ? (
                      <th className="cell-head text-right" title={t("results.python_tip")}>
                        {t("results.python_column")}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t border-ink-800">
                      <td className="cell font-mono text-[12px]">{row.model}</td>
                      <td className="cell text-slate-400">{row.categoryName}</td>
                      <td className="cell text-slate-500">{row.promptIndex}</td>
                      <td className="cell text-right font-mono">{fmtMs(row.ttftMs)}</td>
                      <td className="cell text-right font-mono text-accent-400">
                        {fmtNum(row.tokensPerSec ?? row.measuredTokensPerSec)}
                      </td>
                      <td className="cell text-right font-mono">{fmtMb(row.vramPeakMb)}</td>
                      <td className="cell text-right font-mono text-[12px]">
                        {row.gpuOffloadPercent === null
                          ? DASH
                          : `${row.gpuOffloadPercent.toFixed(0)}/${(100 - row.gpuOffloadPercent).toFixed(0)}%`}
                      </td>
                      <td className="cell text-right font-mono">{fmtMs(row.totalMs)}</td>
                      {showJson ? (
                        <td className="cell text-right">
                          {row.jsonValid === null ? (
                            <span className="text-slate-600">{DASH}</span>
                          ) : (
                            <span
                              className={
                                row.jsonValid ? "text-emerald-300" : "text-amber-300"
                              }
                            >
                              {row.jsonValid ? "✓" : "✗"}
                            </span>
                          )}
                        </td>
                      ) : null}
                      {showPython ? (
                        <td className="cell text-right">
                          {/* Znak zamiast zdania: kolumna musi zostać czytelna
                              przy ośmiu modelach, a pełny opis jest w podpowiedzi. */}
                          {row.pythonVerdict === null ? (
                            <span className="text-slate-600">{DASH}</span>
                          ) : (
                            <span
                              className={pythonVerdictClass(row.pythonVerdict)}
                              title={t(pythonVerdictKey(row.pythonVerdict))}
                            >
                              {pythonVerdictMark(row.pythonVerdict)}
                            </span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <SectionHeader
            icon={<Gauge size={15} />}
            title={t("test.progress_title")}
            subtitle={
              current
                ? t("test.progress_line", {
                    model: current.model,
                    category: current.categoryName,
                    index: current.promptIndex + 1,
                    total: current.promptTotal,
                  })
                : running
                  ? t("test.preparing")
                  : t("test.not_running")
            }
            right={
              running ? (
                <Pill tone="accent" icon={<Loader2 size={11} className="animate-spin" />}>
                  {phase === "prompt-start" ? t("test.generating") : t("test.in_progress")}
                </Pill>
              ) : null
            }
          />

          {/* Pasek tylko w trakcie przebiegu. Wcześniej renderował się zawsze,
              więc po zakończeniu zostawał wypełniony do końca pod napisem
              „Test nie jest uruchomiony” - wyglądało to jak zawieszony test. */}
          {running ? <ProgressBar value={progressPercent} className="mb-3" /> : null}

          {current ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <Metric
                  label={t("test.progress")}
                  value={
                    overall
                      ? `${overall.done}/${overall.total}`
                      : `${current.overallDone}/${current.overallTotal}`
                  }
                  tone="soft"
                />
                <Metric
                  label={t("common.category")}
                  value={current.kind ? KIND_LABEL[current.kind as CategoryKind] : "—"}
                />
                <Metric label={t("test.vram_now")} value={fmtMb(vram?.usedMb)} tone="soft" />
                <Metric label={t("metrics.vram_peak")} value={fmtMb(vram?.peakMb)} tone="soft" />
              </div>
              <div className="mb-2 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[12px] text-slate-400">
                <div
                  className={`whitespace-pre-wrap ${
                    promptExpanded ? "max-h-64 overflow-y-auto" : promptLong ? "line-clamp-3" : ""
                  }`}
                >
                  {current.prompt}
                </div>
                {promptLong ? (
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <button
                      className="text-[12px] text-accent-400 transition-colors hover:text-accent-300"
                      onClick={() => setOpenPrompt(promptExpanded ? null : current.prompt)}
                    >
                      {promptExpanded ? t("test.prompt_hide") : t("test.prompt_show")}
                    </button>
                    <span className="text-[12px] text-slate-600">
                      {t("test.prompt_chars", { chars: promptText.length.toLocaleString(locale) })}
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {unloaded.length ? (
            <div className="mb-3 flex items-start gap-1.5 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[12px] leading-relaxed text-slate-400">
              <Info size={12} className="mt-0.5 shrink-0 text-slate-500" />
              <span>
                {t(
                  "test.unloaded_previous",
                  { models: unloaded.join(", ") },
                )}
              </span>
            </div>
          ) : null}

          {classifyRequest ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
              <AlertTriangle size={12} />
              {t("test.paused")}
            </div>
          ) : null}

          <div className="mb-1 flex items-center gap-2">
            <Terminal size={13} className="text-slate-500" />
            <span className="label">{t("test.streamed_response")}</span>
            {/* Przełącznik tuż nad podglądem, bo dotyczy tylko jego. */}
            <label
              className="ml-auto flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-300"
              title={t("test.autoscroll_hint")}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-cyan-400"
                checked={autoScroll}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  // Włączenie ma zadziałać od razu: wracamy „na dół” i pozwalamy
                  // efektowi przewinąć podgląd, żeby nie czekać na następny token.
                  stickToBottom.current = true;
                  updateSettings((current) => ({ ...current, autoScrollAnswer: enabled }));
                }}
              />
              {t("test.autoscroll")}
            </label>
          </div>
          {emptyResponse ? (
            <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>
                {t(
                  "test.empty_response_explained",
                )}
              </span>
            </div>
          ) : null}
          <pre
            ref={answerRef}
            // Przewinięcie ręcznie w górę wyłącza autoscroll do czasu powrotu na
            // dół - margines 24 px, żeby „prawie na dole” też się liczyło.
            onScroll={(event) => {
              const element = event.currentTarget;
              stickToBottom.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 24;
            }}
            className="h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-200"
          >
            {text || (running ? "…" : emptyResponse ? t("test.zero_tokens") : t("test.no_data"))}
          </pre>

          {rows[0] ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Metric label={t("metrics.ttft")} value={fmtMs(rows[0].ttftMs)} tone="accent" />
              <Metric
                label={t("metrics.tps")}
                value={fmtNum(rows[0].tokensPerSec ?? rows[0].measuredTokensPerSec)}
                tone="accent"
              />
              <Metric label={t("metrics.vram_peak")} value={fmtMb(rows[0].vramPeakMb)} />
              <Metric
                label={t("metrics.gpu_cpu_wide")}
                value={
                  rows[0].gpuOffloadPercent === null
                    ? DASH
                    : t("metrics.gpu_cpu_split", {
                        gpu: rows[0].gpuOffloadPercent.toFixed(0),
                        cpu: (100 - rows[0].gpuOffloadPercent).toFixed(0),
                      })
                }
                hint={
                  rows[0].modelSizeMb
                    ? t("metrics.model_size_tip", {
                        size: fmtMb(rows[0].modelSizeMb),
                      })
                    : t("metrics.split_tip")
                }
              />
              <Metric label={t("common.time")} value={fmtMs(rows[0].totalMs)} tone="soft" />
            </div>
          ) : null}

          {rows[0]?.error ? (
            <div className="mt-2 text-[12px] text-red-300">{rows[0].error}</div>
          ) : null}
        </div>

        <div className="card p-4 text-[12px] leading-relaxed text-slate-500">
          <div className="mb-1 text-xs font-semibold text-slate-300">
            {t("test.metrics_title")}
          </div>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              {t(
                "test.metrics_ttft",
              )}
            </li>
            <li>
              {t(
                "test.metrics_tps",
              )}
            </li>
            <li>
              {t(
                "test.metrics_vram",
              )}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
