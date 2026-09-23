import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FolderOpen,
  Globe,
  HardDrive,
  Info,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import * as api from "../lib/api";
import { useApp } from "../lib/store";
import { LANGUAGES, useI18n } from "../lib/i18n";
import { fmtBytes, fmtDate } from "../lib/format";
import { builtinSystemPrompt } from "../lib/modelSettings";
import {
  CATEGORY_KINDS,
  KIND_LABEL,
  type CategoryKind,
  type StoragePaths,
  type StorageStats,
} from "../lib/types";
import { Pill } from "../components/ui";

/**
 * Kolejność typów w edytorze domyślnych promptów - bierzemy ją ze wspólnej
 * listy w `types.ts`, żeby dodanie typu nie wymagało pamiętania o tym pliku.
 */
const KINDS: CategoryKind[] = CATEGORY_KINDS;

type HistoryFilter = "all" | "older" | "cancelled";

const DAY_MS = 86_400_000;

type SettingsSection = "language" | "checks" | "prompts" | "history" | "exports" | "reset";

/**
 * Sekcje zakładki. Nazwa bierze się z tego samego klucza, co nagłówek treści,
 * więc spis po lewej i to, co po prawej, nie mogą się rozjechać.
 */
const SECTIONS: { id: SettingsSection; title: string; icon: React.ReactNode }[] = [
  { id: "language", title: "settings.language_title", icon: <Globe size={13} /> },
  { id: "checks", title: "settings.checks_title", icon: <ShieldCheck size={13} /> },
  { id: "prompts", title: "settings.prompts_title", icon: <Info size={13} /> },
  { id: "history", title: "settings.history_title", icon: <HardDrive size={13} /> },
  { id: "exports", title: "settings.exports_title", icon: <FolderOpen size={13} /> },
  { id: "reset", title: "settings.reset_title", icon: <RotateCcw size={13} /> },
];

/**
 * Wiersz ustawienia: nazwa i wyjaśnienie po lewej, sterowanie po prawej.
 *
 * To jest cała zmiana układu tej zakładki. Wcześniej każde ustawienie stało
 * w stosie „nagłówek, akapit, pole”, więc przy szerokim oknie połowa ekranu
 * była pusta, a tekst sięgał 1 800 px. Teraz sterowanie siedzi obok nazwy,
 * a akapit jest krótki (`70ch`), bo dłuższego nikt nie przeczyta.
 */
function Row({
  title,
  hint,
  children,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-4 py-3">
      <div className="min-w-0">
        {title ? <div className="text-[13px] text-slate-200">{title}</div> : null}
        {hint ? (
          <div className="mt-0.5 max-w-[70ch] text-[12px] leading-relaxed text-slate-500">
            {hint}
          </div>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * Przełącznik wł/wył dla jednego ustawienia. Checkbox, a nie własny suwak:
 * tak samo wygląda wybór promptów i modeli w reszcie aplikacji.
 */
function Check({
  on,
  onChange,
  title,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  title?: string;
}) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 shrink-0 accent-cyan-400"
      checked={on}
      title={title}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

export function SettingsTab() {
  const { settings, updateSettings, restoreDefaultSettings, runs, refreshRuns } = useApp();
  const { t, language } = useI18n();

  const [section, setSection] = useState<SettingsSection>("language");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [days, setDays] = useState(7);
  const [paths, setPaths] = useState<StoragePaths | null>(null);
  const [exports_, setExports] = useState<StorageStats | null>(null);
  const [confirmHistory, setConfirmHistory] = useState(false);
  const [confirmExports, setConfirmExports] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const refreshStorage = useCallback(async () => {
    try {
      const [nextPaths, nextExports] = await Promise.all([api.storagePaths(), api.exportsStats()]);
      setPaths(nextPaths);
      setExports(nextExports);
    } catch (error) {
      setMessage({ tone: "bad", text: String(error) });
    }
  }, []);

  useEffect(() => {
    void refreshStorage();
  }, [refreshStorage]);

  const historyBytes = useMemo(
    () => runs.reduce((sum, run) => sum + (run.bytes ?? 0), 0),
    [runs],
  );

  /**
   * Lista przebiegów do usunięcia liczona **raz**, po stronie frontendu - to
   * dokładnie ta sama lista, którą widać w podglądzie, więc nie ma ryzyka, że
   * między podglądem a potwierdzeniem zbiór się zmieni.
   */
  const targets = useMemo(() => {
    if (filter === "all") return runs;
    if (filter === "cancelled") return runs.filter((run) => run.cancelled);
    const threshold = Date.now() - days * DAY_MS;
    return runs.filter((run) => new Date(run.startedAt).getTime() < threshold);
  }, [runs, filter, days]);

  const targetBytes = useMemo(
    () => targets.reduce((sum, run) => sum + (run.bytes ?? 0), 0),
    [targets],
  );

  const removeHistory = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const outcome = await api.clearHistory(targets.map((run) => run.id));
      setConfirmHistory(false);
      await refreshRuns();
      setMessage({
        tone: "ok",
        text: t("settings.deleted", {
          count: outcome.removed,
          size: fmtBytes(outcome.freedBytes),
        }),
      });
    } catch (error) {
      setMessage({ tone: "bad", text: String(error) });
    } finally {
      setBusy(false);
    }
  };

  const removeExports = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const outcome = await api.clearExports();
      setConfirmExports(false);
      await refreshStorage();
      setMessage({
        tone: "ok",
        text: t("settings.exports_deleted", {
          count: outcome.removed,
          size: fmtBytes(outcome.freedBytes),
        }),
      });
    } catch (error) {
      setMessage({ tone: "bad", text: String(error) });
    } finally {
      setBusy(false);
    }
  };

  const resetSettings = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await restoreDefaultSettings();
      setConfirmReset(false);
      setMessage({ tone: "ok", text: t("settings.reset_done") });
    } catch (error) {
      setMessage({ tone: "bad", text: String(error) });
    } finally {
      setBusy(false);
    }
  };

  const setPromptOverride = (kind: CategoryKind, text: string) => {
    updateSettings((current) => {
      const next = { ...current.defaultSystemPrompts };
      // Tekst równy wbudowanemu to **nie** nadpisanie. Bez tego warunku wpisany
      // i skasowany dopisek zostawał w pliku na zawsze: plakietka mówiła
      // „Wbudowany”, a plik trzymał własną kopię, więc poprawka wbudowanego
      // promptu w przyszłej wersji nigdy by do tego użytkownika nie dotarła.
      if (text === builtinSystemPrompt(kind)) delete next[kind];
      else next[kind] = text;
      return { ...current, defaultSystemPrompts: next };
    });
  };

  const clearPromptOverride = (kind: CategoryKind) => {
    updateSettings((current) => {
      const next = { ...current.defaultSystemPrompts };
      delete next[kind];
      return { ...current, defaultSystemPrompts: next };
    });
  };

  const openFolder = (path: string | undefined) => {
    if (!path) return;
    void api.openPath(path).catch((error) => setMessage({ tone: "bad", text: String(error) }));
  };

  if (!settings) return null;

  const active = SECTIONS.find((entry) => entry.id === section) ?? SECTIONS[0];
  const nothingMatches = runs.length === 0 || targets.length === 0;

  return (
    <div className="flex h-full">
      {/* ── Spis sekcji ────────────────────────────────────────────────────── */}
      <aside className="flex w-[252px] shrink-0 flex-col border-r border-ink-700/70 bg-ink-900/40">
        <div className="flex shrink-0 items-center gap-2 border-b border-ink-700/70 p-3">
          <span className="text-[13px] font-medium text-slate-200">{t("nav.settings")}</span>
          {/* Granica „ustawienia aplikacji, nie modelu” - jedno zdanie, na życzenie. */}
          <span
            className="ml-auto text-slate-500 hover:text-slate-300"
            title={`${t("settings.scope_title")}\n\n${t("settings.scope_hint")}`}
          >
            <Info size={13} />
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {SECTIONS.map((entry) => {
            const isActive = entry.id === active.id;
            return (
              <button
                key={entry.id}
                className={`${isActive ? "fopt-on" : "fopt"} px-2.5 py-2`}
                onClick={() => setSection(entry.id)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={isActive ? "" : "text-slate-500"}>{entry.icon}</span>
                  <span className="min-w-0 truncate text-[13px]">{t(entry.title)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Treść wybranej sekcji ──────────────────────────────────────────── */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-5">
          <div className="text-[16px] font-semibold text-slate-100">{t(active.title)}</div>

          {message ? (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-[12px] ${
                message.tone === "ok"
                  ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-200"
                  : "border-red-500/30 bg-red-500/5 text-red-300"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          {section === "language" ? (
            <div className="card mt-3 divide-y divide-ink-700/50">
              {/* Nazwy sekcji nie powtarzamy w wierszu - nagłówek nad nim mówi to samo. */}
              <Row hint={t("settings.language_hint")}>
                {/* Pas się zawija, więc kolejny język nie wymaga zmiany układu. */}
                <div className="flex max-w-[520px] flex-wrap justify-end gap-1.5">
                  {LANGUAGES.map((entry) => {
                    const isActive = settings.language === entry.id;
                    return (
                      <button
                        key={entry.id}
                        className={`${isActive ? "chip-on" : "chip-off"} text-[12px]`}
                        onClick={() =>
                          updateSettings((current) => ({ ...current, language: entry.id }))
                        }
                      >
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
              </Row>
            </div>
          ) : null}

          {section === "checks" ? (
            <div className="card mt-3 divide-y divide-ink-700/50">
              <Row title={t("settings.check_json")} hint={t("settings.check_json_hint")}>
                <Check
                  on={settings.checkJson}
                  title={t("settings.check_json")}
                  onChange={(next) =>
                    updateSettings((current) => ({ ...current, checkJson: next }))
                  }
                />
              </Row>
              <Row title={t("settings.check_python")} hint={t("settings.check_python_hint")}>
                <Check
                  on={settings.checkPython}
                  title={t("settings.check_python")}
                  onChange={(next) =>
                    updateSettings((current) => ({ ...current, checkPython: next }))
                  }
                />
              </Row>
              <Row title={t("settings.auto_scroll")} hint={t("settings.auto_scroll_hint")}>
                <Check
                  on={settings.autoScrollAnswer}
                  title={t("settings.auto_scroll")}
                  onChange={(next) =>
                    updateSettings((current) => ({ ...current, autoScrollAnswer: next }))
                  }
                />
              </Row>
            </div>
          ) : null}

          {section === "prompts" ? (
            <div className="card mt-3 divide-y divide-ink-700/50">
              <Row hint={t("settings.prompts_hint")} />
              {KINDS.map((kind) => {
                const builtin = builtinSystemPrompt(kind);
                const override = settings.defaultSystemPrompts[kind];
                const changed = typeof override === "string" && override !== builtin;
                return (
                  <div key={kind} className="flex items-start gap-6 px-4 py-3">
                    <div className="w-[190px] shrink-0">
                      <div className="text-[13px] text-slate-200">{KIND_LABEL[kind]}</div>
                      <div className="mt-1.5">
                        {changed ? (
                          <Pill tone="warn">{t("settings.prompt_changed")}</Pill>
                        ) : (
                          <Pill>{t("settings.prompt_builtin")}</Pill>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <textarea
                        className="input min-h-[96px] resize-y font-mono text-[13px] leading-relaxed"
                        value={override ?? builtin}
                        onChange={(event) => setPromptOverride(kind, event.target.value)}
                      />
                      {changed ? (
                        <button
                          className="btn-ghost btn-xs mt-2 text-[12px]"
                          onClick={() => clearPromptOverride(kind)}
                        >
                          <RotateCcw size={12} />
                          {t("settings.prompt_restore")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {section === "history" ? (
            <div className="card mt-3 divide-y divide-ink-700/50">
              <Row
                hint={
                  <>
                    <div className="text-slate-400">
                      {t("settings.history_stats", {
                        count: runs.length,
                        size: fmtBytes(historyBytes),
                      })}
                    </div>
                    {t("settings.history_hint")}
                  </>
                }
              >
                <button
                  className="btn-ghost btn-xs text-[12px]"
                  disabled={!paths}
                  title={t("settings.data_folder")}
                  onClick={() => openFolder(paths?.dataDir)}
                >
                  <FolderOpen size={12} />
                  {t("settings.open_folder")}
                </button>
              </Row>

              <Row title={t("settings.filter")}>
                {(
                  [
                    ["all", "settings.filter_all"],
                    ["older", "settings.filter_older"],
                    ["cancelled", "settings.filter_interrupted"],
                  ] as [HistoryFilter, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    className={`${filter === id ? "chip-on" : "chip-off"} text-[12px]`}
                    onClick={() => setFilter(id)}
                  >
                    {t(label)}
                  </button>
                ))}
                {filter === "older" ? (
                  <span className="flex items-center gap-1.5">
                    <input
                      className="input w-20 font-mono text-[12px]"
                      inputMode="numeric"
                      value={days}
                      onChange={(event) => {
                        const parsed = Number(event.target.value.replace(/\D/g, ""));
                        setDays(Number.isFinite(parsed) ? Math.max(1, parsed) : 1);
                      }}
                    />
                    <span className="text-[12px] text-slate-500">{t("settings.days", { count: days })}</span>
                  </span>
                ) : null}
              </Row>

              <div className="flex items-start justify-between gap-6 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-slate-200">
                    {runs.length === 0
                      ? t("results.no_runs")
                      : targets.length === 0
                        ? t("settings.nothing_matches")
                        : t("settings.to_delete", {
                            count: targets.length,
                            size: fmtBytes(targetBytes),
                          })}
                  </div>
                  {targets.length > 0 && targets.length <= 5 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-slate-500">
                      {targets.map((run) => (
                        <li key={run.id}>
                          <span className="font-mono">{fmtDate(run.startedAt)}</span>
                          {run.cancelled ? ` · ${t("results.interrupted")}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {targets.length > 0 ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {confirmHistory ? (
                      <>
                        <span className="flex items-center gap-1.5 text-[12px] text-red-200">
                          <AlertTriangle size={12} className="text-red-300" />
                          {t("settings.reset_warning")}
                        </span>
                        <button
                          className="btn-danger btn-xs text-[12px]"
                          disabled={busy}
                          onClick={() => void removeHistory()}
                        >
                          <Trash2 size={12} />
                          {t("common.confirm")}
                        </button>
                        <button
                          className="btn-ghost btn-xs text-[12px]"
                          onClick={() => setConfirmHistory(false)}
                        >
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-danger btn-xs text-[12px]"
                        onClick={() => setConfirmHistory(true)}
                      >
                        <Trash2 size={12} />
                        {t("settings.delete_selected")}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {section === "exports" ? (
            <div className="card mt-3 divide-y divide-ink-700/50">
              <Row
                hint={
                  <>
                    <div className="text-slate-400">
                      {exports_
                        ? t("settings.exports_stats", {
                            dir: paths?.exportDir ?? "",
                            count: exports_.files,
                            size: fmtBytes(exports_.bytes),
                          })
                        : t("app.reading")}
                    </div>
                    {t("settings.exports_hint")}
                  </>
                }
              >
                <button
                  className="btn-ghost btn-xs text-[12px]"
                  disabled={!paths}
                  onClick={() => openFolder(paths?.exportDir)}
                >
                  <FolderOpen size={12} />
                  {t("settings.open_folder")}
                </button>
                {confirmExports ? (
                  <>
                    <button
                      className="btn-danger btn-xs text-[12px]"
                      disabled={busy}
                      onClick={() => void removeExports()}
                    >
                      <Trash2 size={12} />
                      {t("common.confirm")}
                    </button>
                    <button
                      className="btn-ghost btn-xs text-[12px]"
                      onClick={() => setConfirmExports(false)}
                    >
                      {t("common.cancel")}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-danger btn-xs text-[12px]"
                    disabled={!exports_?.files}
                    onClick={() => setConfirmExports(true)}
                  >
                    <Trash2 size={12} />
                    {t("settings.delete_exports")}
                  </button>
                )}
              </Row>
            </div>
          ) : null}

          {section === "reset" ? (
            <div className="card mt-3 divide-y divide-ink-700/50">
              <Row hint={t("settings.reset_hint")}>
                {confirmReset ? (
                  <>
                    <span className="flex items-center gap-1.5 text-[12px] text-red-200">
                      <AlertTriangle size={12} className="text-red-300" />
                      {t("settings.reset_warning")}
                    </span>
                    <button
                      className="btn-danger btn-xs text-[12px]"
                      disabled={busy}
                      onClick={() => void resetSettings()}
                    >
                      <RotateCcw size={12} />
                      {t("common.confirm")}
                    </button>
                    <button
                      className="btn-ghost btn-xs text-[12px]"
                      onClick={() => setConfirmReset(false)}
                    >
                      {t("common.cancel")}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-ghost btn-xs text-[12px]"
                    onClick={() => setConfirmReset(true)}
                  >
                    <RotateCcw size={12} />
                    {t("settings.reset_action")}
                  </button>
                )}
              </Row>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
