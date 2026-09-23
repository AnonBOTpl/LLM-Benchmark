import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  GitCompare,
  History,
  Info,
  Loader2,
  FolderOpen,
  Trash2,
} from "lucide-react";

import * as api from "../lib/api";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { average, DASH, fmtDate, fmtDuration, fmtMb, fmtMs, fmtNum } from "../lib/format";
import { describeOptions } from "../lib/modelSettings";
import { PYTHON_OK, PYTHON_SYNTAX_ERROR, pythonVerdictKey } from "../lib/pythonVerdict";
import {
  CLASSIFICATION_LABELS,
  KIND_LABEL,
  labelKey,
  modelSource,
  type BenchmarkRun,
  type CategoryKind,
  type ModelSummary,
} from "../lib/types";
import { Empty, Metric, Pill, SectionHeader } from "../components/ui";

type SortKey =
  | "model"
  | "category"
  | "count"
  | "tps"
  | "measured"
  | "ttft"
  | "vram"
  | "gpu"
  | "empty";

interface Aggregate {
  model: string;
  categoryId: string;
  categoryName: string;
  kind: CategoryKind;
  count: number;
  tps: number | null;
  measured: number | null;
  ttft: number | null;
  vram: number | null;
  /** Podział pamięci modelu (warstw) między GPU i CPU w tym przebiegu. */
  gpu: number | null;
  modelMb: number | null;
  errors: number;
  /** Odpowiedzi, w których model nie wygenerował ani jednego tokenu. */
  empty: number;
  labels: Record<string, number>;
  /** Odpowiedzi sprawdzone walidatorem JSON (kategoria `json`). */
  jsonChecked: number;
  /** Z nich: poprawne JSON-y. */
  jsonOk: number;
  /**
   * Odpowiedzi, w których **był kod Pythona do sprawdzenia** (kategoria
   * „Kodowanie”). Odpowiedzi bez kodu nie wchodzą do mianownika: nie są ani
   * poprawne, ani błędne, więc liczenie ich jako błędu zaniżałoby wynik.
   */
  pythonChecked: number;
  /** Z nich: kod, który się parsuje. */
  pythonOk: number;
  /** `registry` albo `huggingface` - patrz `modelSource`. */
  source: string;
}

/**
 * Plakietka ze źródłem modelu.
 *
 * Po co w tabeli wyników: ten sam model z rejestru i z `hf.co` może wypaść
 * inaczej (szablon i parser przychodzą wtedy z repozytorium), więc bez tej
 * informacji dwa różne wyniki wyglądają jak rozrzut jednego pomiaru.
 */
function SourceBadge({ source, title }: { source: string; title: string }) {
  const { t } = useI18n();
  const huggingface = source === "huggingface";
  return (
    <span
      title={title}
      className={`ml-1.5 shrink-0 rounded-full border px-1.5 text-[12px] leading-[18px] font-medium ${
        huggingface
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-ink-700 bg-ink-800 text-slate-500"
      }`}
    >
      {t(huggingface ? "results.source_huggingface" : "results.source_registry")}
    </span>
  );
}

function sortValue(row: Aggregate, key: SortKey): string | number | null {
  switch (key) {
    case "model":
      return row.model;
    case "category":
      return row.categoryName;
    case "count":
      return row.count;
    case "tps":
      return row.tps;
    case "measured":
      return row.measured;
    case "ttft":
      return row.ttft;
    case "vram":
      return row.vram;
    case "gpu":
      return row.gpu;
    case "empty":
      return row.empty;
  }
}

export function ResultsTab() {
  const { runs, refreshRuns, lastRunId } = useApp();
  const { t, locale } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "tps",
    dir: "desc",
  });
  const [focus, setFocus] = useState<{ model: string; categoryId: string } | null>(null);
  const [openResponse, setOpenResponse] = useState<string | null>(null);
  const [compare, setCompare] = useState<{ a: string; b: string }>({ a: "", b: "" });
  const [exported, setExported] = useState<{ format: string; path: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wybieramy przebieg dopiero gdy istnieje na dysku: `lastRunId` ustawia się na
  // starcie testu, a plik z historią powstaje dopiero po jego zakończeniu.
  useEffect(() => {
    if (lastRunId && runs.some((summary) => summary.id === lastRunId)) {
      setSelectedId(lastRunId);
    }
  }, [lastRunId, runs]);

  useEffect(() => {
    if (!selectedId && runs.length) setSelectedId(runs[0].id);
  }, [runs, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setRun(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getRun(selectedId)
      .then((loaded) => {
        if (!cancelled) {
          setRun(loaded);
          setFocus(null);
          setExported(null);
          const models = Array.from(new Set(loaded.models.map((entry) => entry.model)));
          setCompare({ a: models[0] ?? "", b: models[1] ?? "" });
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const aggregates = useMemo<Aggregate[]>(() => {
    if (!run) return [];
    return run.models.map((modelRun) => {
      const labels: Record<string, number> = {};
      for (const result of modelRun.results) {
        // `labelKey` tlumaczy etykiety zapisane przez starsze wersje (polski
        // tekst wprost w danych), wiec stare przebiegi licza sie tak samo.
        const key = labelKey(result.label);
        if (key) labels[key] = (labels[key] ?? 0) + 1;
      }
      return {
        model: modelRun.model,
        categoryId: modelRun.categoryId,
        categoryName: modelRun.categoryName,
        kind: modelRun.kind,
        source: modelSource(modelRun.model, modelRun.source),
        count: modelRun.results.length,
        tps: average(modelRun.results.map((result) => result.tokensPerSec)),
        measured: average(modelRun.results.map((result) => result.measuredTokensPerSec)),
        ttft: average(modelRun.results.map((result) => result.ttftMs)),
        vram: modelRun.results.reduce<number | null>((max, result) => {
          if (result.vramPeakMb === null) return max;
          return max === null ? result.vramPeakMb : Math.max(max, result.vramPeakMb);
        }, null),
        gpu: modelRun.results.reduce<number | null>(
          (found, result) => found ?? result.gpuOffloadPercent ?? null,
          null,
        ),
        modelMb: modelRun.results.reduce<number | null>(
          (found, result) => found ?? result.modelSizeMb ?? null,
          null,
        ),
        errors: modelRun.results.filter((result) => result.error).length,
        empty: modelRun.results.filter(
          (result) => !result.error && !result.response.trim(),
        ).length,
        labels,
        // Werdykt jest `null` dla innych kategorii i dla starszych przebiegów -
        // liczymy tylko to, co naprawdę zostało sprawdzone.
        jsonChecked: modelRun.results.filter((result) => result.jsonValid != null).length,
        jsonOk: modelRun.results.filter((result) => result.jsonValid === true).length,
        // „Brak kodu” nie jest błędem - model po prostu nie napisał Pythona.
        pythonChecked: modelRun.results.filter(
          (result) =>
            result.pythonVerdict === PYTHON_OK ||
            result.pythonVerdict === PYTHON_SYNTAX_ERROR,
        ).length,
        pythonOk: modelRun.results.filter((result) => result.pythonVerdict === PYTHON_OK).length,
      };
    });
  }, [run]);

  const sorted = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...aggregates].sort((a, b) => {
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      if (typeof left === "string" || typeof right === "string") {
        return String(left).localeCompare(String(right)) * direction;
      }
      return ((left ?? Number.NEGATIVE_INFINITY) - (right ?? Number.NEGATIVE_INFINITY)) * direction;
    });
  }, [aggregates, sort]);

  const modelNames = useMemo(
    () => (run ? Array.from(new Set(run.models.map((entry) => entry.model))) : []),
    [run],
  );

  const compareRows = useMemo(() => {
    if (!run || !compare.a || !compare.b) return [];
    const ids = Array.from(
      new Set(
        run.models
          .filter((entry) => entry.model === compare.a || entry.model === compare.b)
          .map((entry) => entry.categoryId),
      ),
    );
    return ids.map((id) => {
      const left = aggregates.find((row) => row.model === compare.a && row.categoryId === id);
      const right = aggregates.find((row) => row.model === compare.b && row.categoryId === id);
      return {
        id,
        name: left?.categoryName ?? right?.categoryName ?? id,
        left,
        right,
      };
    });
  }, [aggregates, compare, run]);

  /**
   * "Model A vs B w czasie": dla każdego zapisanego przebiegu pokazujemy średnie
   * tokens/s obu modeli, żeby dało się zobaczyć trend, a nie tylko jeden pomiar.
   */
  const trend = useMemo(() => {
    if (!compare.a || !compare.b) return [];
    return runs
      .map((summary) => ({
        summary,
        left: summary.modelStats.find((stats) => stats.model === compare.a) as
          | ModelSummary
          | undefined,
        right: summary.modelStats.find((stats) => stats.model === compare.b) as
          | ModelSummary
          | undefined,
      }))
      .filter((row) => row.left || row.right);
  }, [compare, runs]);

  const focused = useMemo(() => {
    if (!run || !focus) return null;
    return (
      run.models.find(
        (entry) => entry.model === focus.model && entry.categoryId === focus.categoryId,
      ) ?? null
    );
  }, [focus, run]);

  const toggleSort = (key: SortKey) =>
    setSort((previous) =>
      previous.key === key
        ? { key, dir: previous.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "model" || key === "category" ? "asc" : "desc" },
    );

  const applyLabel = async (
    model: string,
    categoryId: string,
    index: number,
    label: string | null,
  ) => {
    if (!run) return;
    try {
      await api.setLabel(run.id, model, categoryId, index, label);
      setRun((previous) =>
        previous
          ? {
              ...previous,
              models: previous.models.map((modelRun) =>
                modelRun.model === model && modelRun.categoryId === categoryId
                  ? {
                      ...modelRun,
                      results: modelRun.results.map((result, i) =>
                        i === index ? { ...result, label } : result,
                      ),
                    }
                  : modelRun,
              ),
            }
          : previous,
      );
    } catch (cause) {
      setError(String(cause));
    }
  };

  const doExport = async (format: "csv" | "html") => {
    if (!run) return;
    setError(null);
    try {
      const path = await api.exportRun(run.id, format);
      setExported({ format, path });
    } catch (cause) {
      setError(String(cause));
    }
  };

  const removeRun = async (id: string) => {
    try {
      await api.deleteRun(id);
      if (selectedId === id) setSelectedId(null);
      setConfirmDelete(null);
      await refreshRuns();
    } catch (cause) {
      setError(String(cause));
    }
  };

  // `label` to klucz tłumaczenia - te same polskie stringi są zapisywane
  // w historii jako etykiety klasyfikacji.
  // Kolumna z walidatorem JSON pojawia się **tylko** wtedy, gdy w przebiegu jest
  // co pokazać - inaczej tabela rośnie o kolumnę pełną kresek.
  const hasJson = aggregates.some((row) => row.jsonChecked > 0);
  const hasPython = aggregates.some((row) => row.pythonChecked > 0);

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "model", label: "common.model" },
    { key: "category", label: "common.category" },
    { key: "count", label: "results.col.prompts", align: "right" },
    { key: "tps", label: "results.col.tps_ollama", align: "right" },
    { key: "measured", label: "results.col.tps_clock", align: "right" },
    { key: "ttft", label: "results.col.avg_ttft", align: "right" },
    { key: "vram", label: "metrics.vram_peak", align: "right" },
    { key: "gpu", label: "metrics.gpu_cpu", align: "right" },
    { key: "empty", label: "results.col.empty", align: "right" },
  ];

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-5 lg:grid-cols-[264px_minmax(0,1fr)]">
      <div className="card flex max-h-full flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-700/70 bg-ink-850/60 px-3 py-2.5">
          <History size={14} className="text-accent-400" />
          <span className="text-sm font-semibold text-slate-200">{t("results.history")}</span>
          <span className="ml-auto text-[12px] text-slate-500">{runs.length}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              {t("results.no_runs")}
            </div>
          ) : (
            runs.map((summary) => {
              const active = summary.id === selectedId;
              return (
                <div
                  key={summary.id}
                  onClick={() => setSelectedId(summary.id)}
                  className={`cursor-pointer border-b border-ink-800 px-3 py-2.5 transition-colors ${
                    active ? "bg-ink-800/80" : "hover:bg-ink-850"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-slate-200">
                      {fmtDate(summary.startedAt, locale)}
                    </span>
                    {summary.cancelled ? <Pill tone="warn">{t("results.interrupted")}</Pill> : null}
                    <div className="ml-auto flex items-center gap-1">
                      {confirmDelete === summary.id ? (
                        <button
                          className="btn-danger btn-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeRun(summary.id);
                          }}
                        >
                          {t("common.confirm")}
                        </button>
                      ) : (
                        <button
                          className="text-slate-600 transition-colors hover:text-red-300"
                          title={t("results.delete_run")}
                          onClick={(event) => {
                            event.stopPropagation();
                            setConfirmDelete(summary.id);
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
                    <span className="font-mono">
                      {t("results.tps_short", { count: fmtNum(summary.avgTokensPerSec) })}
                    </span>
                    <span>·</span>
                    <span>{t("common.count_prompts", { count: summary.prompts })}</span>
                    <span>·</span>
                    <span>{fmtDuration(summary.durationMs)}</span>
                  </div>
                  <div className="mt-1 truncate text-[12px] text-slate-600">
                    {summary.models.join(", ")}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="min-h-0 space-y-4 overflow-y-auto">
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        {!run ? (
          <Empty
            icon={<BarChart3 size={22} />}
            title={t("results.no_selection")}
            hint={t(
              "results.no_selection_hint",
            )}
          />
        ) : (
          <>
            <div className="card p-4">
              <SectionHeader
                icon={<BarChart3 size={15} />}
                title={t("results.run_title", { id: run.id })}
                subtitle={`${fmtDate(run.startedAt, locale)} · ${fmtDuration(run.durationMs)}${run.gpu ? ` · GPU: ${run.gpu}` : ""}`}
                right={
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost btn-xs" onClick={() => void doExport("csv")}>
                      <FileSpreadsheet size={12} />
                      CSV
                    </button>
                    <button className="btn-ghost btn-xs" onClick={() => void doExport("html")}>
                      <FileText size={12} />
                      HTML
                    </button>
                    {loading ? <Loader2 size={14} className="animate-spin text-slate-500" /> : null}
                  </div>
                }
              />

              {exported ? (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-[12px] text-emerald-200">
                  <span className="truncate">
                    {t("results.export_saved", {
                      format: exported.format.toUpperCase(),
                      path: exported.path,
                    })}
                  </span>
                  <button
                    className="btn-ghost btn-xs ml-auto shrink-0"
                    onClick={() => {
                      void api
                        .openPath(exported.path)
                        .catch((cause) =>
                          setError(t("results.open_failed", { error: String(cause) })),
                        );
                    }}
                  >
                    <FolderOpen size={12} />
                    {t("common.open")}
                  </button>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-lg border border-ink-700">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          onClick={() => toggleSort(column.key)}
                          className={`cell-head cursor-pointer select-none hover:text-slate-300 ${
                            column.align === "right" ? "text-right" : ""
                          }`}
                        >
                          {t(column.label)}
                          {sort.key === column.key ? (
                            <span className="ml-1 text-accent-400">
                              {sort.dir === "asc" ? "▲" : "▼"}
                            </span>
                          ) : null}
                        </th>
                      ))}
                      {hasJson ? (
                        <th className="cell-head text-right" title={t("results.json_tip")}>
                          {t("results.json_column")}
                        </th>
                      ) : null}
                      {hasPython ? (
                        <th className="cell-head text-right" title={t("results.python_tip")}>
                          {t("results.python_column")}
                        </th>
                      ) : null}
                      <th className="cell-head">{t("results.labels")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row) => {
                      const active =
                        focus?.model === row.model && focus?.categoryId === row.categoryId;
                      return (
                        <tr
                          key={`${row.model}-${row.categoryId}`}
                          onClick={() => setFocus({ model: row.model, categoryId: row.categoryId })}
                          className={`cursor-pointer border-t border-ink-800 transition-colors ${
                            active ? "bg-ink-800/70" : "hover:bg-ink-850/60"
                          }`}
                        >
                          <td className="cell font-mono text-[12px]">
                            {row.model}
                            <SourceBadge source={row.source} title={t("results.source_tip")} />
                          </td>
                          <td className="cell">
                            <span className="text-slate-300">{row.categoryName}</span>
                            <span className="ml-2 text-[12px] text-slate-600">
                              {KIND_LABEL[row.kind]}
                            </span>
                          </td>
                          <td className="cell text-right font-mono">{row.count}</td>
                          <td className="cell text-right font-mono text-accent-400">
                            {fmtNum(row.tps)}
                          </td>
                          <td className="cell text-right font-mono">{fmtNum(row.measured)}</td>
                          <td className="cell text-right font-mono">{fmtMs(row.ttft)}</td>
                          <td className="cell text-right font-mono">{fmtMb(row.vram)}</td>
                          <td
                            className="cell text-right font-mono text-[12px]"
                            title={
                              row.modelMb
                                ? t(
                                    "metrics.model_size_tip",
                                    { size: fmtMb(row.modelMb) },
                                  )
                                : t("metrics.split_tip")
                            }
                          >
                            {row.gpu === null
                              ? DASH
                              : `${row.gpu.toFixed(0)}/${(100 - row.gpu).toFixed(0)}%`}
                          </td>
                          <td className="cell text-right font-mono">
                            {row.empty ? (
                              <span
                                className="text-amber-300"
                                title={t(
                                  "results.empty_response_hint",
                                )}
                              >
                                {row.empty}
                              </span>
                            ) : (
                              DASH
                            )}
                          </td>
                          {hasJson ? (
                            <td className="cell text-right">
                              {row.jsonChecked > 0 ? (
                                <span
                                  className={`font-mono ${
                                    row.jsonOk === row.jsonChecked
                                      ? "text-emerald-300"
                                      : "text-amber-300"
                                  }`}
                                >
                                  {row.jsonOk}/{row.jsonChecked}
                                </span>
                              ) : (
                                <span className="text-slate-600">{DASH}</span>
                              )}
                            </td>
                          ) : null}
                          {hasPython ? (
                            <td className="cell text-right">
                              {row.pythonChecked > 0 ? (
                                <span
                                  className={`font-mono ${
                                    row.pythonOk === row.pythonChecked
                                      ? "text-emerald-300"
                                      : "text-amber-300"
                                  }`}
                                >
                                  {row.pythonOk}/{row.pythonChecked}
                                </span>
                              ) : (
                                <span className="text-slate-600">{DASH}</span>
                              )}
                            </td>
                          ) : null}
                          <td className="cell">
                            {row.kind === "classification" ? (
                              <div className="flex flex-wrap gap-1">
                                {CLASSIFICATION_LABELS.map((label) =>
                                  row.labels[label] ? (
                                    <Pill key={label} tone="accent">
                                      {t(label)}: {row.labels[label]}
                                    </Pill>
                                  ) : null,
                                )}
                                {!Object.keys(row.labels).length ? (
                                  <span className="text-[12px] text-slate-600">{t("results.no_grades")}</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-600">
                                {row.errors ? t("results.errors", { count: row.errors }) : DASH}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500">
                <ChevronRight size={12} />
                {t("results.row_hint")}
              </div>
            </div>

            {focused ? (
              <div className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-ink-700/70 bg-ink-850/60 px-4 py-2.5">
                  <span className="font-mono text-[13px] text-slate-200">{focused.model}</span>
                  <SourceBadge
                    source={modelSource(focused.model, focused.source)}
                    title={t("results.source_tip")}
                  />
                  <span className="text-[12px] text-slate-500">{focused.categoryName}</span>
                  <span className="ml-auto text-[12px] text-slate-500">
                    {t("common.count_prompts", { count: focused.results.length })}
                  </span>
                </div>
                <div className="border-b border-ink-700/70 bg-ink-850/40 px-4 py-2 text-[12px] leading-relaxed text-slate-500">
                  <span className="label mr-1.5">{t("common.badge_settings")}</span>
                  {t(describeOptions(focused.options))}
                  {" · "}
                  {focused.systemPrompt
                    ? t("results.system_field", { prompt: focused.systemPrompt })
                    : t("results.system_none")}
                </div>
                <div className="divide-y divide-ink-800">
                  {focused.results.map((result, index) => {
                    const key = `${focused.model}-${focused.categoryId}-${index}`;
                    const open = openResponse === key;
                    return (
                      <div key={key} className="px-4 py-3">
                        <div
                          className="flex cursor-pointer items-start gap-2"
                          onClick={() => setOpenResponse(open ? null : key)}
                        >
                          <span className="w-5 shrink-0 pt-0.5 text-right font-mono text-[12px] text-slate-500">
                            {index + 1}
                          </span>
                          <span className="flex-1 text-[13px] text-slate-300">
                            {result.prompt}
                            {result.imagePath ? (
                              <span className="ml-2 font-mono text-[12px] text-slate-500">
                                [{result.imagePath}]
                              </span>
                            ) : null}
                          </span>
                          <ChevronRight
                            size={14}
                            className={`mt-0.5 shrink-0 text-slate-600 transition-transform ${
                              open ? "rotate-90" : ""
                            }`}
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 pl-7">
                          <Metric label={t("metrics.ttft")} value={fmtMs(result.ttftMs)} tone="accent" />
                          <Metric label={t("metrics.tps")} value={fmtNum(result.tokensPerSec)} tone="accent" />
                          <Metric
                            label={t("results.tps_clock")}
                            value={fmtNum(result.measuredTokensPerSec)}
                            tone="soft"
                          />
                          <Metric label={t("metrics.vram_peak")} value={fmtMb(result.vramPeakMb)} />
                          <Metric
                            label={t("metrics.gpu_cpu_wide")}
                            value={
                              result.gpuOffloadPercent === null
                                ? DASH
                                : t("metrics.gpu_cpu_split", {
                                    gpu: result.gpuOffloadPercent.toFixed(0),
                                    cpu: (100 - result.gpuOffloadPercent).toFixed(0),
                                  })
                            }
                            hint={t("metrics.split_tip")}
                          />
                          <Metric label={t("common.time")} value={fmtMs(result.totalMs)} tone="soft" />
                          {result.jsonValid != null ? (
                            <Metric
                              label={t("results.json_column")}
                              value={
                                result.jsonValid ? t("results.json_valid") : t("results.json_invalid")
                              }
                              tone={result.jsonValid ? "accent" : "default"}
                              hint={t("results.json_tip")}
                            />
                          ) : null}
                          {result.pythonVerdict != null ? (
                            <Metric
                              label={t("results.python_column")}
                              value={t(pythonVerdictKey(result.pythonVerdict))}
                              tone={result.pythonVerdict === PYTHON_OK ? "accent" : "default"}
                              hint={t("results.python_tip")}
                            />
                          ) : null}
                        </div>

                        {result.error ? (
                          <div className="mt-2 pl-7 text-[12px] text-red-300">{result.error}</div>
                        ) : null}

                        {!result.error && !result.response.trim() ? (
                          <div className="mt-2 pl-7 text-[12px] text-amber-300">
                            {t(
                              "results.empty_response_hint",
                            )}
                          </div>
                        ) : null}

                        {open ? (
                          <pre className="mt-2 ml-7 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-[12px] leading-relaxed text-slate-200">
                            {result.response || t("results.zero_tokens")}
                          </pre>
                        ) : null}

                        {focused.kind === "classification" ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
                            <span className="label mr-1">{t("results.grade")}</span>
                            {CLASSIFICATION_LABELS.map((label) => {
                              const active = labelKey(result.label) === label;
                              return (
                                <button
                                  key={label}
                                  className={active ? "chip-on" : "chip-off"}
                                  onClick={() =>
                                    void applyLabel(
                                      focused.model,
                                      focused.categoryId,
                                      index,
                                      active ? null : label,
                                    )
                                  }
                                >
                                  {t(label)}
                                </button>
                              );
                            })}
                            {result.label ? (
                              <button
                                className="text-[12px] text-slate-500 hover:text-slate-300"
                                onClick={() =>
                                  void applyLabel(focused.model, focused.categoryId, index, null)
                                }
                              >
                                {t("results.clear_grade")}
                              </button>
                            ) : (
                              <span className="text-[12px] text-amber-400">{t("results.ungraded")}</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="card p-4">
              <SectionHeader
                icon={<GitCompare size={15} />}
                title={t("results.compare_title")}
                subtitle={t(
                  "results.compare_hint",
                )}
              />

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  className="input max-w-[240px] font-mono"
                  value={compare.a}
                  onChange={(event) => setCompare((prev) => ({ ...prev, a: event.target.value }))}
                >
                  <option value="">{t("results.compare_a")}</option>
                  {modelNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">vs</span>
                <select
                  className="input max-w-[240px] font-mono"
                  value={compare.b}
                  onChange={(event) => setCompare((prev) => ({ ...prev, b: event.target.value }))}
                >
                  <option value="">{t("results.compare_b")}</option>
                  {modelNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {compare.a && compare.b && compare.a === compare.b ? (
                <div className="text-xs text-amber-300">{t("results.compare_pick")}</div>
              ) : null}

              {compareRows.length ? (
                <div className="overflow-hidden rounded-lg border border-ink-700">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr>
                        <th className="cell-head">{t("common.category")}</th>
                        <th className="cell-head text-right">{t("results.compare_a_tps")}</th>
                        <th className="cell-head text-right">{t("results.compare_b_tps")}</th>
                        <th className="cell-head text-right">{t("results.compare_delta_tps")}</th>
                        <th className="cell-head text-right">{t("results.compare_a_ttft")}</th>
                        <th className="cell-head text-right">{t("results.compare_b_ttft")}</th>
                        <th className="cell-head text-right">{t("results.compare_delta_vram")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((row) => {
                        const deltaTps =
                          row.left?.tps !== null &&
                          row.left?.tps !== undefined &&
                          row.right?.tps !== null &&
                          row.right?.tps !== undefined
                            ? (row.left.tps as number) - (row.right.tps as number)
                            : null;
                        const deltaVram =
                          row.left?.vram !== null &&
                          row.left?.vram !== undefined &&
                          row.right?.vram !== null &&
                          row.right?.vram !== undefined
                            ? (row.left.vram as number) - (row.right.vram as number)
                            : null;
                        return (
                          <tr key={row.id} className="border-t border-ink-800">
                            <td className="cell">{row.name}</td>
                            <td className="cell text-right font-mono text-accent-400">
                              {fmtNum(row.left?.tps)}
                            </td>
                            <td className="cell text-right font-mono">
                              {fmtNum(row.right?.tps)}
                            </td>
                            <td
                              className={`cell text-right font-mono ${
                                deltaTps === null
                                  ? ""
                                  : deltaTps >= 0
                                    ? "text-emerald-300"
                                    : "text-red-300"
                              }`}
                            >
                              {deltaTps === null
                                ? DASH
                                : `${deltaTps >= 0 ? "+" : ""}${deltaTps.toFixed(2)}`}
                            </td>
                            <td className="cell text-right font-mono">{fmtMs(row.left?.ttft)}</td>
                            <td className="cell text-right font-mono">{fmtMs(row.right?.ttft)}</td>
                            <td className="cell text-right font-mono">
                              {deltaVram === null
                                ? DASH
                                : `${deltaVram >= 0 ? "+" : ""}${Math.round(deltaVram)} MB`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {trend.length ? (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] text-slate-500">
                    <Info size={12} />
                    {t("results.trend_title")}
                  </div>
                  <div className="overflow-hidden rounded-lg border border-ink-700">
                    <table className="w-full border-collapse text-[12px]">
                      <thead>
                        <tr>
                          <th className="cell-head">{t("results.col.run")}</th>
                          <th className="cell-head text-right">{t("results.compare_a_tps")}</th>
                          <th className="cell-head text-right">{t("results.compare_b_tps")}</th>
                          <th className="cell-head text-right">{t("results.compare_delta")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trend.map((row) => {
                          const left = row.left?.avgTokensPerSec ?? null;
                          const right = row.right?.avgTokensPerSec ?? null;
                          const delta =
                            left !== null && right !== null ? left - right : null;
                          return (
                            <tr key={row.summary.id} className="border-t border-ink-800">
                              <td className="cell">
                                <button
                                  className="text-left text-slate-300 hover:text-accent-400"
                                  onClick={() => setSelectedId(row.summary.id)}
                                >
                                  {fmtDate(row.summary.startedAt, locale)}
                                </button>
                              </td>
                              <td className="cell text-right font-mono text-accent-400">
                                {fmtNum(left)}
                              </td>
                              <td className="cell text-right font-mono">{fmtNum(right)}</td>
                              <td
                                className={`cell text-right font-mono ${
                                  delta === null
                                    ? ""
                                    : delta >= 0
                                      ? "text-emerald-300"
                                      : "text-red-300"
                                }`}
                              >
                                {delta === null
                                  ? DASH
                                  : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
