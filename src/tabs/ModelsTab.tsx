import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  HardDrive,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import * as api from "../lib/api";
import { useApp } from "../lib/store";
import { useI18n, type TranslateParams } from "../lib/i18n";
import { fmtBytes, fmtDuration } from "../lib/format";
import { installedEntry as findInstalled } from "../lib/models";
import {
  clampOptions,
  hasCustomOptions,
  primaryKind,
  resolveSystemPrompt,
} from "../lib/modelSettings";
import {
  ModelSettingsBar,
  ModelSettingsCards,
  draftIsDirty,
  type ModelSettingsDraft,
} from "../components/ModelSettingsPanel";
import {
  type Category,
  type LoadedModel,
  type ModelEntry,
  type ModelInfo,
  type PullProgress,
} from "../lib/types";
import { Empty, HINT, LABEL, Pill, ProgressBar, SectionHeader } from "../components/ui";
import { CategoryPills } from "../components/CategoryPills";

interface Group {
  category: Category | null;
  models: { entry: ModelEntry; index: number }[];
}

interface InfoState {
  status: "loading" | "ready" | "error";
  info?: ModelInfo;
  error?: string;
}

/**
 * Trzy poziomy tekstu zamiast jednego.
 *
 * W tej zakładce **nie ma już tekstu poniżej 12 px**: liczba i nazwa modelu
 * 16 px, etykieta i treść 13 px, podpowiedź 12 px. Wcześniej było tu 95
 * przycisków w jednej kolumnie 950 px, a 91% tekstu miało 11 px. Same stałe
 * przychodzą z `components/ui`, bo ten sam podział obowiązuje w panelu ustawień.
 */

/** Karta szczegółów: etykieta u góry, treść pod nią. */
function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={LABEL}>{title}</span>
        {right}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Wiersz „nazwa po lewej, wartość po prawej” - układ, który nie marnuje szerokości. */
function Row({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-700/50 py-1.5 last:border-0 last:pb-0">
      <span className="text-[13px] text-slate-400">{label}</span>
      <span className="text-right font-mono text-[13px] text-slate-100" title={title}>
        {value}
      </span>
    </div>
  );
}

/**
 * Ollama przysyła statusy po angielsku i z surowym skrótem warstwy. Tłumaczymy
 * to, co użytkownik widzi; nieznane statusy przepuszczamy bez zmian - nazwa
 * warstwy to identyfikator z serwera, więc zostaje taka, jaka przyszła.
 */
function pullStatusLabel(status: string, t: (key: string, params?: TranslateParams) => string): string {
  if (status === "pulling manifest") return t("models.pull.manifest");
  if (status === "verifying sha256 digest") return t("models.pull.checksum");
  if (status === "writing manifest") return t("models.pull.writing");
  if (status === "removing any unused layers") return t("models.pull.removing_layers");
  if (status === "success") return t("models.pull.done");
  if (status.startsWith("pulling ")) {
    return t("models.pull.layer", { id: status.slice("pulling ".length).slice(0, 12) });
  }
  return status;
}

export function ModelsTab() {
  const { config, updateConfig, status, refreshStatus, settings, vram } = useApp();
  const { t, locale } = useI18n();
  const [draftTag, setDraftTag] = useState("");
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [pull, setPull] = useState<Record<string, PullProgress>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [info, setInfo] = useState<Record<string, InfoState>>({});
  const [loaded, setLoaded] = useState<LoadedModel[]>([]);
  const [busyLoad, setBusyLoad] = useState<string | null>(null);
  // Szkic ustawień czekający na zapis. Kluczowany **tagiem**, nie pozycją na
  // liście: dodanie albo usunięcie modelu przesuwa pozycje, a tag nie.
  const [settingsDraft, setSettingsDraft] = useState<{
    tag: string;
    settings: ModelSettingsDraft;
  } | null>(null);
  // Lista po lewej wybiera, panel po prawej pokazuje. `adding` to stan
  // formularza „dodaj własny model”, który potrzebuje szerokości panelu,
  // a nie wąskiej kolumny listy.
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const infoCache = useRef<Map<string, InfoState>>(new Map());
  // Pilnuje, żeby sugestia kategorii nie wracała po tym, jak została odznaczona.
  const appliedSuggestion = useRef<string | null>(null);
  // Kategoria ustawiona przez sugestię - tylko taką wolno podmienić na inną;
  // ręcznego wyboru użytkownika nie ruszamy.
  const autoApplied = useRef<string[] | null>(null);

  useEffect(() => {
    const promise = api.onPullProgress((payload) => {
      // Po udanym pobraniu pasek znika - potwierdzeniem jest komunikat, a nie
      // zamrożony słupek na ostatniej warstwie. Przy błędzie pasek zostaje,
      // bo pokazuje, na czym stanęło.
      if (payload.done && !payload.error) {
        setPull((previous) => {
          const next = { ...previous };
          delete next[payload.model];
          return next;
        });
        setMessage({ tone: "ok", text: t("models.msg.downloaded", { model: payload.model }) });
        void refreshStatus();
        return;
      }

      setPull((previous) => ({ ...previous, [payload.model]: payload }));
      if (payload.done && payload.error) {
        setMessage({
          tone: "bad",
          text: t("models.msg.download_failed", {
            model: payload.model,
            error: payload.error,
          }),
        });
        void refreshStatus();
      }
    });
    return () => {
      promise.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, [refreshStatus, t]);

  // Co Ollama trzyma teraz w pamięci. Odświeżamy też cyklicznie, żeby
  // „zwolni się ok. HH:MM” nie kłamało po upływie `keep_alive`.
  const refreshLoaded = useCallback(async () => {
    try {
      setLoaded(await api.loadedModels());
    } catch {
      // Brak `/api/ps` nie może psuć całej zakładki.
      setLoaded([]);
    }
  }, []);

  useEffect(() => {
    void refreshLoaded();
    const timer = window.setInterval(() => void refreshLoaded(), 10_000);
    return () => window.clearInterval(timer);
  }, [refreshLoaded]);

  const load = async (tag: string) => {
    setBusyLoad(tag);
    setMessage(null);
    try {
      const outcome = await api.loadModel(tag);
      await refreshLoaded();
      const gpu = outcome.loaded?.gpuPercent;
      const text =
        t("models.msg.loaded", { tag, duration: fmtDuration(outcome.elapsedMs) }) +
        (typeof gpu === "number"
          ? ` · ${t("models.msg.gpu_share", { gpu: gpu.toFixed(0) })}`
          : "");
      setMessage({ tone: "ok", text });
    } catch (error) {
      setMessage({ tone: "bad", text: t("models.msg.load_failed", { tag, error: String(error) }) });
    } finally {
      setBusyLoad(null);
    }
  };

  const unload = async (tag: string) => {
    setBusyLoad(tag);
    setMessage(null);
    try {
      await api.unloadModel(tag);
      await refreshLoaded();
      setMessage({ tone: "ok", text: t("models.msg.unloaded", { tag }) });
    } catch (error) {
      setMessage({ tone: "bad", text: t("models.msg.unload_failed", { tag, error: String(error) }) });
    } finally {
      setBusyLoad(null);
    }
  };

  const unloadAll = async () => {
    for (const entry of loaded) {
      try {
        await api.unloadModel(entry.name);
      } catch {
        // Błąd pojedynczego modelu nie blokuje zwalniania pozostałych.
      }
    }
    await refreshLoaded();
    setMessage({ tone: "ok", text: t("models.msg.unloaded_all") });
  };

  const installedEntry = useCallback(
    (tag: string) => findInstalled(status?.installed, tag),
    [status],
  );

  const loadedEntry = useCallback(
    (tag: string) =>
      loaded.find((entry) => entry.name === tag || entry.name === `${tag}:latest`),
    [loaded],
  );

  /** `vision` w capabilities to jedyny pewny sygnał obsługi obrazów. */
  const visionCapable = useCallback(
    (tag: string) => installedEntry(tag)?.capabilities.includes("vision") ?? false,
    [installedEntry],
  );

  /**
   * Rozmiar i parametry modelu: dla pobranych lokalnie z Ollamy, dla reszty
   * z manifestu w rejestrze Ollamy (suma warstw = to, co poleci do pobrania).
   */
  const lookupTag = useCallback(async (tag: string, force = false) => {
    const clean = tag.trim();
    if (!clean) return;
    if (!force && infoCache.current.has(clean)) return;

    infoCache.current.set(clean, { status: "loading" });
    setInfo(Object.fromEntries(infoCache.current));

    try {
      const data = await api.modelInfo(clean);
      infoCache.current.set(
        clean,
        data.error ? { status: "error", error: data.error } : { status: "ready", info: data },
      );
    } catch (error) {
      infoCache.current.set(clean, { status: "error", error: String(error) });
    }
    setInfo(Object.fromEntries(infoCache.current));
  }, []);

  // Pytamy tylko o modele, których nie ma na dysku, plus o tag wpisywany
  // właśnie w formularzu - z debounce, żeby nie strzelać przy każdej literze.
  const wantedKey = useMemo(() => {
    const tags = new Set<string>();
    for (const model of config?.models ?? []) {
      if (!installedEntry(model.tag)) tags.add(model.tag);
    }
    const draft = draftTag.trim();
    if (draft.length >= 3 && !draft.includes(" ")) tags.add(draft);
    return [...tags].sort().join("|");
  }, [config, draftTag, installedEntry]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const tag of wantedKey ? wantedKey.split("|") : []) void lookupTag(tag);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [lookupTag, wantedKey]);

  /**
   * Auto-przypisanie kategorii. Pewne dane z Ollamy (`capabilities`) i
   * heurystyka z nazwy ustawiają kategorię tylko wtedy, gdy użytkownik sam nic
   * nie wybrał - ręcznego wyboru nigdy nie nadpisujemy.
   */
  useEffect(() => {
    const clean = draftTag.trim();
    if (!clean) return;
    if ((config?.models ?? []).some((entry) => entry.tag === clean)) return;
    const state = info[clean];
    if (!state || state.status === "loading") return;

    // Błąd zapytania (np. modelu nie ma w rejestrze) oznacza dokładnie to samo
    // co brak sugestii: nie wiemy nic, więc nie zostawiamy kategorii po
    // poprzednio wpisanym tagu.
    const kind = state.status === "ready" ? (state.info?.suggestedKind ?? null) : null;
    const auto = autoApplied.current;
    const untouched =
      draftCategories.length === 0 ||
      (auto !== null &&
        draftCategories.length === auto.length &&
        auto.every((id) => draftCategories.includes(id)));

    // Ręczny wybór użytkownika ma pierwszeństwo - nic tu nie podmieniamy.
    if (!untouched) return;

    if (!kind) {
      // Nie znamy przeznaczenia nowego tagu - nie zostawiamy kategorii
      // odziedziczonej po poprzednio wpisanym modelu.
      if (draftCategories.length > 0) {
        autoApplied.current = null;
        setDraftCategories([]);
      }
      return;
    }

    const marker = `${clean}:${kind}`;
    if (appliedSuggestion.current === marker) return;
    appliedSuggestion.current = marker;
    autoApplied.current = [kind];
    setDraftCategories([kind]);
  }, [config, draftCategories, draftTag, info]);

  const groups = useMemo<Group[]>(() => {
    if (!config) return [];
    const order = new Map(config.categories.map((category, index) => [category.id, index]));

    const primaryCategory = (entry: ModelEntry): string | null => {
      const known = entry.categoryIds.filter((id) => order.has(id));
      if (!known.length) return null;
      return known.reduce((best, id) => ((order.get(id) ?? 0) < (order.get(best) ?? 0) ? id : best));
    };

    const indexed = config.models.map((entry, index) => ({ entry, index }));
    const result: Group[] = config.categories.map((category) => ({
      category,
      models: indexed.filter(({ entry }) => primaryCategory(entry) === category.id),
    }));
    result.push({
      category: null,
      models: indexed.filter(({ entry }) => primaryCategory(entry) === null),
    });
    return result;
  }, [config]);

  /**
   * Wybór w liście. Gdy model zniknie z listy (albo pojawi się pierwszy),
   * zaznaczenie musi nadal wskazywać na istniejący wiersz - inaczej panel po
   * prawej zostałby pusty mimo niepustej listy.
   */
  useEffect(() => {
    if (!config) return;
    if (config.models.length === 0) {
      if (selected !== null) setSelected(null);
      return;
    }
    if (selected === null) {
      setSelected(0);
    } else if (selected >= config.models.length) {
      setSelected(config.models.length - 1);
    }
  }, [config, selected]);

  // `model_info` odpowiada na pytanie, czy szablon modelu w ogóle przyjmuje
  // system prompt - panel ustawień pokazuje ostrzeżenie, więc pytamy raz na
  // wybrany model. Odpowiedź jest pamiętana w `infoCache`, więc przechodzenie
  // po liście nie zamienia się w serię zapytań.
  useEffect(() => {
    if (!config || selected === null) return;
    const tag = config.models[selected]?.tag;
    if (tag) void lookupTag(tag);
  }, [config, lookupTag, selected]);

  if (!config) return null;

  const draft = draftTag.trim();
  const draftState = draft ? info[draft] : undefined;
  const draftAlreadyListed = !!draft && config.models.some((entry) => entry.tag === draft);
  const draftSuggestion =
    draftState?.status === "ready" ? (draftState.info?.suggestedKind ?? null) : null;
  const suggestionIsCertain =
    draftState?.status === "ready" && draftState.info?.suggestionSource === "capabilities";
  const draftSuggestionApplied = !!draftSuggestion && draftCategories.includes(draftSuggestion);
  const vlmCategoryId = config.categories.find((category) => category.kind === "vlm")?.id ?? null;

  const categoryName = (kind: string) =>
    config.categories.find((category) => category.id === kind)?.name ?? kind;

  const clock = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  const patchModel = (index: number, patch: Partial<ModelEntry>) => {
    // Zmiana tagu przenosi też szkic ustawień. Bez tego zapis szukałby modelu
    // po starej nazwie, nie znalazłby go i **po cichu** skasował szkic razem
    // z niezapisaną zmianą.
    if (patch.tag !== undefined) {
      const previousTag = config.models[index].tag;
      setSettingsDraft((current) =>
        current && current.tag === previousTag
          ? { ...current, tag: patch.tag as string }
          : current,
      );
    }
    updateConfig((current) => ({
      ...current,
      models: current.models.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    }));
  };

  /** Wartości pól ustawień: szkic użytkownika, a bez szkicu to, co jest zapisane. */
  const draftFor = (entry: ModelEntry): ModelSettingsDraft =>
    settingsDraft && settingsDraft.tag === entry.tag
      ? settingsDraft.settings
      : {
          options: entry.options ?? {},
          customPrompt: entry.systemPrompt !== null && entry.systemPrompt !== undefined,
          promptText: entry.systemPrompt ?? "",
        };

  /**
   * Zapis szkicu: parametry przycięte do zakresów, system prompt własny albo
   * `null`, czyli „weź domyślny dla typu kategorii”. Parametry idą do
   * `config.json`, więc zapis jest jedną operacją, a nie serią.
   */
  const saveDraft = (tag: string) => {
    if (!settingsDraft) return;
    const index = config.models.findIndex((entry) => entry.tag === tag);
    if (index >= 0) {
      patchModel(index, {
        options: clampOptions(settingsDraft.settings.options),
        systemPrompt: settingsDraft.settings.customPrompt
          ? settingsDraft.settings.promptText.trim() || null
          : null,
      });
      setMessage({ tone: "ok", text: t("settings.model.saved", { tag }) });
    }
    setSettingsDraft(null);
  };

  const toggleModelCategory = (index: number, categoryId: string) => {
    updateConfig((current) => ({
      ...current,
      models: current.models.map((entry, i) => {
        if (i !== index) return entry;
        const has = entry.categoryIds.includes(categoryId);
        return {
          ...entry,
          categoryIds: has
            ? entry.categoryIds.filter((id) => id !== categoryId)
            : [...entry.categoryIds, categoryId],
        };
      }),
    }));
  };

  const removeModel = (index: number) => {
    updateConfig((current) => ({
      ...current,
      models: current.models.filter((_, i) => i !== index),
    }));
  };

  /** Usuwa model z dysku przez `DELETE /api/delete` i zdejmuje go z listy. */
  const removeFromDisk = async (tag: string, index: number) => {
    setDeleting(tag);
    setMessage(null);
    try {
      await api.deleteModel(tag);
      infoCache.current.delete(tag);
      removeModel(index);
      setConfirmRemove(null);
      await refreshStatus();
      setMessage({ tone: "ok", text: t("models.msg.deleted", { tag }) });
    } catch (error) {
      setMessage({ tone: "bad", text: t("models.msg.delete_failed", { tag, error: String(error) }) });
    } finally {
      setDeleting(null);
    }
  };

  const addModel = () => {
    const tag = draftTag.trim();
    if (!tag) {
      setMessage({ tone: "bad", text: t("models.msg.enter_tag") });
      return;
    }
    if (config.models.some((entry) => entry.tag === tag)) {
      setMessage({ tone: "bad", text: t("models.msg.already_on_list", { tag }) });
      return;
    }
    const nextIndex = config.models.length;
    updateConfig((current) => ({
      ...current,
      models: [...current.models, { tag, enabled: true, categoryIds: draftCategories }],
    }));
    setDraftTag("");
    setDraftCategories([]);
    autoApplied.current = null;
    setMessage({ tone: "ok", text: t("models.msg.added", { tag }) });
    // Nowy model od razu zaznaczony - widać, co się właśnie dodało.
    setAdding(false);
    setSelected(nextIndex);
  };

  const download = async (tag: string) => {
    setMessage(null);
    setPull((previous) => ({
      ...previous,
      [tag]: {
        model: tag,
        status: "start",
        total: null,
        completed: null,
        percent: 0,
        done: false,
        error: null,
      },
    }));
    try {
      await api.pullModel(tag);
    } catch (error) {
      setPull((previous) => ({
        ...previous,
        [tag]: {
          model: tag,
          status: "error",
          total: null,
          completed: null,
          percent: null,
          done: true,
          error: String(error),
        },
      }));
    }
  };

  /** Wszystko, co trzeba wiedzieć o jednym modelu - jedno miejsce, dwa widoki. */
  const modelState = (index: number) => {
    const entry = config.models[index];
    const installed = installedEntry(entry.tag);
    const rowInfo = info[entry.tag];
    const isInstalled = !!installed;
    const hasVision = visionCapable(entry.tag);
    const suggestion =
      (rowInfo?.status === "ready" ? (rowInfo.info?.suggestedKind ?? null) : null) ??
      (isInstalled ? (installed?.suggestedKind ?? null) : null);
    return {
      entry,
      rowInfo,
      installed,
      isInstalled,
      hasVision,
      suggestion,
      suggestionCertain:
        (rowInfo?.status === "ready" && rowInfo.info?.suggestionSource === "capabilities") ||
        installed?.suggestionSource === "capabilities",
      memory: loadedEntry(entry.tag),
      size: installed?.size ?? rowInfo?.info?.sizeBytes ?? null,
      visionMismatch:
        isInstalled && !hasVision && !!vlmCategoryId && entry.categoryIds.includes(vlmCategoryId),
    };
  };

  const renderProgress = (progress: PullProgress) => (
    <div className="space-y-1">
      <div className="flex items-center gap-3 text-[12px] text-slate-400">
        <span className="w-44 shrink-0 truncate" title={progress.status}>
          {pullStatusLabel(progress.status, t)}
        </span>
        <ProgressBar value={progress.percent} tone={progress.error ? "amber" : "accent"} />
        <span className="w-32 shrink-0 text-right font-mono text-slate-500">
          {progress.completed !== null && progress.total !== null
            ? `${fmtBytes(progress.completed)} / ${fmtBytes(progress.total)}`
            : ""}
        </span>
        <span className="w-16 shrink-0 text-right font-mono">
          {progress.percent !== null ? `${progress.percent.toFixed(1)}%` : ""}
        </span>
      </div>
      {progress.error ? <div className="text-[12px] text-red-300">{progress.error}</div> : null}
    </div>
  );

  const renderList = () => {
    const needle = query.trim().toLowerCase();
    const visible = groups
      .map((group) => ({
        ...group,
        models: needle
          ? group.models.filter(({ entry }) => entry.tag.toLowerCase().includes(needle))
          : group.models,
      }))
      // Przy pustym polu szukania pokazujemy też puste kategorie - to jedyne
      // miejsce, w którym widać, że kategoria nie ma jeszcze modeli. Podczas
      // filtrowania grupy bez trafień znikają, bo liczy się tylko wynik.
      .filter((group) => !needle || group.models.length > 0);

    if (needle && visible.every((group) => group.models.length === 0)) {
      return (
        <div className="px-2 py-3 text-[12px] leading-relaxed text-slate-500">
          {t("models.list.no_match", { query: query.trim() })}
        </div>
      );
    }

    return visible.map((group) => (
      <div key={group.category?.id ?? "none"} className="mb-2">
        <div className="flex items-baseline gap-1.5 px-2 py-1">
          <span className={LABEL}>{group.category?.name ?? t("models.row.no_category")}</span>
          <span className="font-mono text-[12px] text-slate-600">{group.models.length}</span>
        </div>

        {group.models.length === 0 ? (
          <div className="px-2 pb-1 text-[12px] text-slate-600">
            {t("models.row.empty_category")}
          </div>
        ) : (
          group.models.map(({ entry, index }) => {
            const state = modelState(index);
            const progress = pull[entry.tag];
            const active = !adding && selected === index;
            const categories = entry.categoryIds.length
              ? entry.categoryIds.map(categoryName).join(", ")
              : t("models.row.no_category");
            return (
              <div
                key={`${entry.tag}-${index}`}
                onClick={() => {
                  setAdding(false);
                  setSelected(index);
                }}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 transition-colors ${
                  active
                    ? "border-accent-500/40 bg-accent-500/10"
                    : "border-transparent hover:border-ink-700 hover:bg-ink-850/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-400"
                    checked={entry.enabled}
                    title={t("models.row.include")}
                    onChange={(event) => patchModel(index, { enabled: event.target.checked })}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[13px] text-slate-100" title={entry.tag}>
                      {entry.tag}
                    </div>
                    <div className="mt-0.5 text-[12px] text-slate-500">
                      <span>{categories}</span>
                      {state.size !== null ? ` · ${fmtBytes(state.size)}` : ""}
                      {state.memory ? ` · ${t("models.detail.in_memory")}` : ""}
                      {!state.isInstalled && state.rowInfo?.status === "loading"
                        ? ` · ${t("models.row.checking_size")}`
                        : ""}
                      {!state.isInstalled && !state.rowInfo ? ` · ${t("common.not_downloaded")}` : ""}
                      {hasCustomOptions(entry.options) || entry.systemPrompt
                        ? ` · ${t("common.badge_custom")}`
                        : ""}
                      {settingsDraft &&
                      settingsDraft.tag === entry.tag &&
                      draftIsDirty(entry, settingsDraft.settings) ? (
                        <span
                          className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-400 align-middle"
                          title={t("settings.model.unsaved")}
                        />
                      ) : null}
                    </div>
                    {progress ? (
                      <div className="mt-1">
                        <ProgressBar value={progress.percent} tone={progress.error ? "amber" : "accent"} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    ));
  };

  const renderAdd = () => (
    <div className="space-y-4 p-5">
      <SectionHeader
        icon={<Plus size={15} />}
        title={t("models.add.title")}
        subtitle={t("models.add.hint")}
        right={
          <button className="btn-ghost btn-xs" onClick={() => setAdding(false)}>
            {t("common.cancel")}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-sm font-mono"
          placeholder={t("models.add.placeholder")}
          value={draftTag}
          autoFocus
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addModel();
          }}
        />
        <button className="btn-primary" onClick={addModel}>
          <Plus size={14} />
          {t("common.add")}
        </button>
      </div>

      {draft ? (
        <div className="text-[12px]">
          {draftAlreadyListed ? (
            <span className="text-slate-500">{t("models.add.duplicate")}</span>
          ) : draftState?.status === "loading" ? (
            <span className="text-slate-500">{t("models.add.checking_size")}</span>
          ) : draftState?.status === "ready" && draftState.info ? (
            <span className="text-slate-400">
              <span className="font-mono text-slate-200">{draftState.info.tag}</span>
              {" · "}
              <strong className="text-accent-400">
                {t("models.add.size_to_download", { size: fmtBytes(draftState.info.sizeBytes) })}
              </strong>
              {draftState.info.parameterSize ? ` · ${draftState.info.parameterSize}` : ""}
              {draftState.info.quantizationLevel
                ? ` · ${draftState.info.quantizationLevel}`
                : ""}
            </span>
          ) : draftState?.status === "error" ? (
            <span className="text-amber-300">{draftState.error}</span>
          ) : null}
        </div>
      ) : null}

      {draft && !draftAlreadyListed && draftSuggestion ? (
        <div className="flex flex-wrap items-center gap-2">
          <Pill
            tone={suggestionIsCertain ? "accent" : "neutral"}
            icon={<Sparkles size={11} />}
            title={t(suggestionIsCertain ? "models.add.certain_vision" : "models.add.heuristic")}
          >
            {t("models.add.suggested", { name: categoryName(draftSuggestion) })}
          </Pill>
          <span className={HINT}>
            {t(suggestionIsCertain ? "models.add.reports_vision" : "models.add.by_name")}
            {draftSuggestionApplied ? t("models.add.auto_suffix") : ""}
          </span>
          {!draftSuggestionApplied ? (
            <button
              className="btn-ghost btn-xs"
              onClick={() => {
                autoApplied.current = [draftSuggestion];
                setDraftCategories([draftSuggestion]);
              }}
            >
              {t("common.set")}
            </button>
          ) : null}
        </div>
      ) : null}

      <CategoryPills
        className="card p-4"
        stacked
        categories={config.categories}
        active={draftCategories}
        label={t("common.category")}
        onToggle={(categoryId) => {
          // Klik w chip to decyzja użytkownika - sugestia przestaje mieć prawo
          // cokolwiek nadpisywać.
          autoApplied.current = null;
          setDraftCategories((previous) =>
            previous.includes(categoryId)
              ? previous.filter((id) => id !== categoryId)
              : [...previous, categoryId],
          );
        }}
      />
    </div>
  );

  const renderDetail = () => {
    // Drugi warunek zdarza się **przez jeden render** po usunięciu modelu
    // z listy: tablica się skraca, a indeks zaznaczenia poprawia dopiero
    // `useEffect` - czyli **po** renderze. Bez tego strażnika panel sięgał po
    // `config.models[selected].tag` tam, gdzie wpisu już nie ma, i wywracał
    // całą zakładkę (znalezione 23 września przy usuwaniu modeli z dysku:
    // wystarczyło zaznaczyć **ostatni** wiersz i kliknąć kosz).
    //
    // Zwracamy `null` na ten jeden przebieg, a nie własne przycięcie indeksu:
    // źródło prawdy o zaznaczeniu ma zostać **jedno** (`useEffect` wyżej),
    // bo dwa niezależne przycinania tego samego stanu rozjadą się przy
    // pierwszej zmianie.
    if (selected === null || selected >= config.models.length) return null;
    // `index` zamiast `selected` w całym panelu - po sprawdzeniu na `null`
    // typ jest już pewny, także wewnątrz funkcji obsługi kliknięć.
    const index = selected;
    const state = modelState(index);
    const { entry, installed, memory, rowInfo } = state;
    const suggestion = state.suggestion;
    const progress = pull[entry.tag];
    const gpu = memory?.gpuPercent ?? null;
    const kind = primaryKind(entry, config.categories);
    // Domyślny prompt dla typu kategorii (z nadpisaniami z Ustawień) - podgląd
    // i punkt startu dla własnego promptu.
    const defaultPrompt = kind
      ? resolveSystemPrompt({ ...entry, systemPrompt: null }, kind, settings?.defaultSystemPrompts)
          .text
      : "";
    const panelDraft = draftFor(entry);

    return (
      <div className="space-y-4 p-5">
        {/* Nagłówek: nazwa, stan i akcje. Nazwa jest edytowalna - to ta sama
            możliwość, którą miał wiersz listy w poprzednim układzie. */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <input
              className="input max-w-[420px] font-mono text-[16px]"
              value={entry.tag}
              onChange={(event) => patchModel(index, { tag: event.target.value })}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {state.isInstalled ? (
                <Pill tone="ok" icon={<CheckCircle2 size={12} />}>
                  {t("models.row.downloaded", { size: fmtBytes(installed?.size) })}
                </Pill>
              ) : (
                <Pill
                  tone={rowInfo?.status === "error" ? "warn" : "neutral"}
                  icon={<HardDrive size={12} />}
                  title={rowInfo?.error}
                >
                  {rowInfo?.status === "loading"
                    ? t("models.row.checking_size")
                    : rowInfo?.status === "ready" && rowInfo.info?.sizeBytes
                      ? t("models.add.size_to_download", {
                          size: fmtBytes(rowInfo.info.sizeBytes),
                        })
                      : rowInfo?.status === "error"
                        ? t("models.row.size_unknown")
                        : t("common.not_downloaded")}
                </Pill>
              )}

              {rowInfo?.status === "ready" ? (
                <span className="text-[12px] text-slate-500">
                  {[rowInfo.info?.parameterSize, rowInfo.info?.quantizationLevel]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null}
              {!state.isInstalled && rowInfo?.status === "error" ? (
                <button
                  className="text-[12px] text-slate-500 underline decoration-dotted hover:text-slate-300"
                  title={rowInfo.error}
                  onClick={() => void lookupTag(entry.tag, true)}
                >
                  {t("common.retry")}
                </button>
              ) : null}

              {state.hasVision ? (
                <Pill
                  tone="accent"
                  icon={<Eye size={11} />}
                  title={t("models.row.vision_tip")}
                >
                  {t("models.row.vision_yes")}
                </Pill>
              ) : null}
              {state.visionMismatch ? (
                <Pill
                  tone="warn"
                  icon={<AlertTriangle size={11} />}
                  title={t("models.row.vision_warning")}
                >
                  {t("models.row.vision_no")}
                </Pill>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {state.isInstalled ? (
              memory ? (
                <button
                  className="btn-ghost"
                  disabled={busyLoad === entry.tag}
                  title={t("models.memory.unload_tip")}
                  onClick={() => void unload(entry.tag)}
                >
                  <PowerOff size={13} />
                  {busyLoad === entry.tag
                    ? t("models.memory.unloading")
                    : t("models.memory.unload")}
                </button>
              ) : (
                <button
                  className="btn-ghost"
                  disabled={busyLoad === entry.tag}
                  title={t("models.row.load_tip")}
                  onClick={() => void load(entry.tag)}
                >
                  <Zap size={13} />
                  {busyLoad === entry.tag ? t("models.row.loading") : t("models.row.load")}
                </button>
              )
            ) : null}

            {/* Pobranego modelu nie ma po co pobierać - przycisk znika i zostaje
                tylko wciąż aktualny stan („pobrany · rozmiar”) i usuwanie z dysku.
                Świadome: nie ma przez to jednego kliknięcia „pobierz ponownie”
                na wypadek uszkodzonego modelu - drogą do tego jest usunięcie
                i pobranie od nowa. */}
            {state.isInstalled ? null : (
              <button
                className="btn-ghost"
                disabled={(!!progress && !progress.done) || deleting === entry.tag}
                onClick={() => void download(entry.tag)}
              >
                <Download size={13} />
                {progress && !progress.done
                  ? t("models.row.downloading")
                  : t("models.row.download")}
              </button>
            )}

            <button
              className="btn-danger"
              title={t(state.isInstalled ? "models.row.remove_tip" : "models.row.remove")}
              onClick={() => setConfirmRemove(index)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Ustawienia są per model i zapisują się razem z wynikami, żeby po
            czasie było wiadomo, czym je uzyskano. */}
        <p className={HINT}>{t("settings.model.hint")}</p>

        {/* Kategorie testowe - to samo przypisanie, które robi się w „Teście”. */}
        <CategoryPills
          categories={config.categories}
          active={entry.categoryIds}
          label={t("common.category")}
          onToggle={(categoryId) => toggleModelCategory(index, categoryId)}
          /* Sugestia tylko przy modelu bez żadnej kategorii - gdy coś jest już
             wybrane, druga propozycja obok wyglądałaby na sprzeczność. */
          suggestion={
            !entry.categoryIds.length && suggestion
              ? {
                  id: suggestion,
                  name: categoryName(suggestion),
                  title: t(
                    state.suggestionCertain
                      ? "models.add.certain_vision"
                      : "models.row.suggest_why",
                  ),
                }
              : null
          }
        />

        {progress ? renderProgress(progress) : null}

        {confirmRemove === index ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2">
            <span className="text-[12px] text-slate-300">
              {t("models.row.remove_confirm", { tag: entry.tag })}
            </span>
            <button
              className="btn-ghost btn-xs"
              title={t("models.row.delete_keep")}
              onClick={() => {
                removeModel(index);
                setConfirmRemove(null);
              }}
            >
              {t("models.row.delete_keep_action")}
            </button>
            {state.isInstalled ? (
              <button
                className="btn-danger btn-xs"
                disabled={deleting === entry.tag}
                title={t("models.row.delete_disk_hint")}
                onClick={() => void removeFromDisk(entry.tag, index)}
              >
                <Trash2 size={12} />
                {deleting === entry.tag
                  ? t("models.row.deleting")
                  : t("models.row.delete_from_disk", { size: fmtBytes(installed?.size) })}
              </button>
            ) : null}
            <button className="btn-ghost btn-xs" onClick={() => setConfirmRemove(null)}>
              {t("common.cancel")}
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Card
            title={t("models.detail.memory_title")}
            right={
              <Pill tone={memory ? "accent" : "neutral"}>
                {t(memory ? "models.detail.in_memory" : "models.detail.not_in_memory")}
              </Pill>
            }
          >
            {memory ? (
              <>
                <Row
                  label={t("metrics.gpu_cpu_wide")}
                  title={t("models.memory.split_tip")}
                  value={
                    gpu === null
                      ? t("models.memory.split_unknown")
                      : t("models.memory.split", {
                          gpu: gpu.toFixed(0),
                          cpu: (100 - gpu).toFixed(0),
                        })
                  }
                />
                <Row
                  label={t("metrics.vram")}
                  value={t("models.memory.vram_of_total", {
                    vram: fmtBytes(memory.sizeVramBytes),
                    total: fmtBytes(memory.sizeBytes),
                  })}
                />
                <div className={`mt-2 ${HINT}`}>
                  {memory.contextLength
                    ? t("models.memory.context", { context: memory.contextLength })
                    : ""}
                  {memory.expiresAt
                    ? ` ${t("models.memory.expires", { time: clock(memory.expiresAt) })}`
                    : ""}
                </div>
              </>
            ) : (
              <p className={HINT}>{t("models.memory.hint_empty")}</p>
            )}
          </Card>

          <ModelSettingsCards
            kind={kind}
            contextLength={installed?.contextLength ?? null}
            supportsSystem={
              rowInfo?.status === "ready" ? (rowInfo.info?.supportsSystem ?? null) : null
            }
            draft={panelDraft}
            defaultPrompt={defaultPrompt}
            onChange={(next) => setSettingsDraft({ tag: entry.tag, settings: next })}
          />
        </div>

        {settingsDraft && settingsDraft.tag === entry.tag && draftIsDirty(entry, settingsDraft.settings) ? (
          <ModelSettingsBar
            onSave={() => saveDraft(entry.tag)}
            onDiscard={() => setSettingsDraft(null)}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* ── Kolumna listy: co mam i co chcę mieć ───────────────────────────── */}
      <aside className="flex w-[252px] shrink-0 flex-col border-r border-ink-700/70 bg-ink-900/40">
        <div className="border-b border-ink-700/70 p-2.5">
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              className="input py-1.5 pl-8 text-[13px]"
              placeholder={t("models.list.search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {config.models.length ? (
            renderList()
          ) : (
            <div className="px-2 py-3 text-[12px] leading-relaxed text-slate-500">
              {t("models.empty.hint")}
            </div>
          )}
        </div>

        <div className="border-t border-ink-700/70 p-2">
          <button
            className="btn-ghost w-full justify-center text-[13px]"
            onClick={() => setAdding(true)}
          >
            <Plus size={14} />
            {t("models.add.title")}
          </button>
        </div>

        {/* Stan Ollamy i karty - globalny, więc nie należy do żadnego modelu. */}
        <div className="space-y-1.5 border-t border-ink-700/70 p-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                status?.running ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span
              className="min-w-0 flex-1 truncate text-[12px] text-slate-400"
              title={status?.error ?? status?.endpoint}
            >
              {status?.running
                ? t("models.status.running", { version: status.version ?? "?" })
                : t("models.status.offline")}
            </span>
            <button
              className="btn-ghost btn-xs"
              title={t("models.refresh_state")}
              onClick={() => void refreshStatus()}
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div className="text-[12px] text-slate-500">
            {t("models.installed")}: {status?.installed.length ?? 0}
            {vram?.available
              ? ` · ${t("models.detail.vram_short", {
                  used: Math.round(vram.usedMb),
                  total: Math.round(vram.totalMb),
                })}`
              : ""}
          </div>

          {!vram ? <div className="text-[12px] text-slate-500">{t("models.tile.probing_nvml")}</div> : null}
          {vram && !vram.available ? (
            <div className="text-[12px] text-slate-500">{t("models.tile.vram_skipped")}</div>
          ) : null}
          {status?.error ? (
            <div className="flex items-start gap-1.5 text-[12px] text-amber-300">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{status.error}</span>
            </div>
          ) : null}
          {vram && !vram.available && vram.error ? (
            <div className="flex items-start gap-1.5 text-[12px] text-amber-300">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{vram.error}</span>
            </div>
          ) : null}

          {loaded.length ? (
            <button
              className="btn-ghost btn-xs w-full justify-center"
              title={loaded.map((entry) => entry.name).join("\n")}
              onClick={() => void unloadAll()}
            >
              <PowerOff size={12} />
              {t("models.memory.unload_all")} ({loaded.length})
            </button>
          ) : null}
        </div>
      </aside>

      {/* ── Panel: wszystko o jednym modelu, bez wyskakującego okienka ──────── */}
      <section className="flex min-h-0 flex-1 flex-col">
        {message ? (
          <div
            className={`border-b border-ink-700/70 px-5 py-2 text-[12px] ${
              message.tone === "ok" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {adding ? (
            renderAdd()
          ) : config.models.length ? (
            renderDetail()
          ) : (
            <div className="p-5">
              <Empty
                icon={<Cpu size={22} />}
                title={t("models.empty.title")}
                hint={t("models.empty.hint")}
                action={
                  <button className="btn-primary mt-1" onClick={() => setAdding(true)}>
                    <Plus size={14} />
                    {t("models.add.title")}
                  </button>
                }
              />
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
