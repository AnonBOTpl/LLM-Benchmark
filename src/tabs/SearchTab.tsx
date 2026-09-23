import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Heart,
  Loader2,
  RefreshCw,
  Search,
  SearchX,
} from "lucide-react";

import { Empty, HINT, LABEL, Pill, SectionHeader } from "../components/ui";
import { CategoryPills } from "../components/CategoryPills";
import * as api from "../lib/api";
import { DASH, fmtBytes } from "../lib/format";
import { useI18n } from "../lib/i18n";
import { useApp } from "../lib/store";
import {
  HF_TASKS,
  type HfRepo,
  type HfRepoDetails,
  type HfTaskFilter,
  type HfVariant,
  type MemoryFit,
} from "../lib/types";

/**
 * Ile repozytoriów czytamy naraz.
 *
 * Jedno zapytanie na repozytorium (HF zwraca puste listy plików, gdy poprosimy
 * o rozmiary na liście), więc 20 wierszy to 20 zapytań. Trzy równolegle to
 * kompromis: wiersze wypełniają się szybko, a zapytania nie lecą wszystkie
 * naraz - HF ma osobny budżet na odczyt plików i nie chcemy go wyczerpać.
 */
const DETAIL_WORKERS = 3;

/** Progi rozmiaru w filtrach, w GB. `0` = bez limitu. */
const SIZE_STEPS = [0, 2, 5, 10, 20, 50];

/**
 * Opcje filtra zadania. Klucze tłumaczeń wypisane z nazwy, a nie sklejane
 * z identyfikatorem: skaner tłumaczeń szuka w kodzie literałów, więc klucz
 * złożony ze zmiennej wyglądałby dla niego jak nieużywany.
 */
const TASK_OPTIONS: { id: HfTaskFilter; label: string; tip: string }[] = [
  { id: "text", label: "search.task.text", tip: "search.task.text_tip" },
  { id: "vision", label: "search.task.vision", tip: "search.task.vision_tip" },
  { id: "all", label: "search.task.all", tip: "search.task.all_tip" },
];

/** Ocena pamięci → kolor plakietki. Ten sam podział co w „Teście”. */
const FIT_TONE: Record<MemoryFit, "ok" | "warn" | "bad" | "neutral"> = {
  on_gpu: "ok",
  on_gpu_tight: "warn",
  partial_cpu: "warn",
  no_fit: "bad",
  unknown_gpu: "neutral",
};

/**
 * Czy któreś z repozytorium jest już pobrane.
 *
 * Ollama trzyma modele z HF pod tagiem `hf.co/<repo>:<kwantyzacja>`, więc
 * porównujemy **do dwukropka**: bez tego `owner/model` pasowałby także do
 * `owner/model-2`, czyli do zupełnie innego repozytorium.
 */
function isOwned(repo: string, installed: string[]): boolean {
  const marker = `hf.co/${repo}`.toLowerCase();
  return installed.some((name) => {
    const lower = name.toLowerCase();
    return lower === marker || lower.startsWith(`${marker}:`);
  });
}

/**
 * Czy repozytorium obsługuje obrazy.
 *
 * Dwa sygnały, żeby żaden sam nie decydował: zadanie z HF (pewne, gdy jest)
 * i **plik projektora**, który Ollama i tak musi pobrać, żeby zobaczyć obraz.
 * Repozytoria GGUF często mają puste zadanie, więc opieranie się tylko na nim
 * pokazywałoby VLM-y jako modele tekstowe.
 */
function isVisionRepo(
  repo: HfRepo,
  loaded: HfRepoDetails | "loading" | "error" | undefined,
): boolean {
  return repo.vision || (loadedDetails(loaded) && loaded.files.projector !== null);
}

/**
 * Czy szczegóły są już wczytane.
 *
 * Wiersz rysuje się **zanim** wystartuje zapytanie o pliki, więc `details[id]`
 * bywa `undefined` - i to nie jest ten sam stan co „czytam”. Bez tego
 * rozróżnienia pierwszy render sięgał po `files` z niczego.
 */
function loadedDetails(
  value: HfRepoDetails | "loading" | "error" | undefined,
): value is HfRepoDetails {
  return typeof value === "object" && value !== null;
}

export function SearchTab() {
  const { config, status, updateConfig } = useApp();
  const { t } = useI18n();

  // Pole szukania pisze do `text`, a zapytanie idzie z `search` po opóźnieniu.
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [task, setTask] = useState<HfTaskFilter>("text");

  const [fitsOnly, setFitsOnly] = useState(false);
  const [hideOwned, setHideOwned] = useState(false);
  const [maxSizeGb, setMaxSizeGb] = useState(0);

  const [repos, setRepos] = useState<HfRepo[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [details, setDetails] = useState<
    Record<string, HfRepoDetails | "loading" | "error">
  >({});
  const [expanded, setExpanded] = useState<string | null>(null);
  /**
   * Kategorie wybrane dla modelu, który dopiero wejdzie na listę.
   *
   * Kluczowane repozytorium, bo to ono jest jednostką dodawania: dodanie
   * drugiego wariantu z tego samego repozytorium ma dostać ten sam wybór,
   * a przejście do innego wiersza - wrócić do sugestii.
   */
  const [draft, setDraft] = useState<{ repo: string; ids: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

/**
   * Jedno zapytanie o pliki na repozytorium, trzymane poza stanem: to nie jest
   * stan interfejsu, a jego zmiana nie ma powodu przerysowywać listy.
   */
  const inFlight = useRef(new Map<string, Promise<void>>());

  const installed = useMemo(
    () => (status?.installed ?? []).map((model) => model.name),
    [status],
  );

  const load = useCallback(
    async (nextCursor: string | null) => {
      setLoading(true);
      setError(null);
      if (!nextCursor) {
        // Nowe zapytanie = nowa lista, więc czyścimy też cache szczegółów.
        inFlight.current.clear();
        setDetails({});
        setExpanded(null);
        setDraft(null);
      }
      try {
        const result = await api.hfSearch({
          search: search.trim() || undefined,
          pipelineTag: task === "all" ? undefined : HF_TASKS[task],
          cursor: nextCursor ?? undefined,
        });
        setRepos((previous) => (nextCursor ? [...previous, ...result.repos] : result.repos));
        setCursor(result.nextCursor);
      } catch (cause) {
        setError(String(cause));
        if (!nextCursor) setRepos([]);
      } finally {
        setLoading(false);
      }
    },
    [search, task],
  );

  // Opóźnienie 400 ms: HF nie lubi zapytania na każdą literę, a użytkownik
  // i tak pisze dłużej niż jedno słowo.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(text), 400);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    void load(null);
  }, [load]);

  /**
   * Szczegóły dogrywamy po liście, partiami.
   *
   * Efekt zależy **tylko** od listy i nie ma sprzątania, które anulowałoby
   * zapytania. Powód jest konkretny: React uruchamia efekty dwa razy (StrictMode
   * w trybie deweloperskim), więc wersja z anulowaniem po sprzątaniu znaczyła
   * „pierwsza tura wystartowała, druga zobaczyła, że id są już zajęte, i nic nie
   * zrobiła” - cała lista zostawała na „czytam pliki…” na zawsze. `inFlight`
   * pilnuje, żeby każde repozytorium miało **jedno** zapytanie, a nie żeby
   * jakiekolwiek zapytanie zostało przerwane.
   */
  useEffect(() => {
    const missing = repos.filter((repo) => !inFlight.current.has(repo.id));
    if (!missing.length) return;

    setDetails((previous) => {
      const next = { ...previous };
      missing.forEach((repo) => {
        next[repo.id] = "loading";
      });
      return next;
    });

    let index = 0;
    const worker = async () => {
      while (index < missing.length) {
        const repo = missing[index++];
        const task = api
          .hfRepo(repo.id)
          .then((loaded) => setDetails((previous) => ({ ...previous, [repo.id]: loaded })))
          // Bez rozmiarów wiersz nie może powiedzieć, czy model wejdzie na
          // kartę, więc pokazujemy to jako stan wiersza - nie ukrywamy.
          .catch(() => setDetails((previous) => ({ ...previous, [repo.id]: "error" })))
          .finally(() => inFlight.current.delete(repo.id));
        inFlight.current.set(repo.id, task);
        await task;
      }
    };
    void Promise.all(Array.from({ length: DETAIL_WORKERS }, () => worker()));
  }, [repos]);

  /** Warianty posortowane po rozmiarze pobrania - od najmniejszego. */
  const sortedVariants = useCallback(
    (loaded: HfRepoDetails | "loading" | "error" | undefined) => {
      if (!loadedDetails(loaded)) return [];
      return [...loaded.files.variants].sort((a, b) => a.downloadBytes - b.downloadBytes);
    },
    [],
  );

  const smallest = useCallback(
    (repo: HfRepo) => {
      const variants = sortedVariants(details[repo.id]);
      return variants.length ? variants[0] : null;
    },
    [details, sortedVariants],
  );

  const rows = useMemo(() => {
    return repos.filter((repo) => {
      const loaded = details[repo.id];
      if (hideOwned && isOwned(repo.id, installed)) return false;
      if (maxSizeGb === 0) return true;
      // Repozytorium bez wczytanych plików zostaje: „nie wiem” to nie „nie
      // pasuje”. Filtr ma zawężać, a nie chować wiersze w trakcie czytania.
      const variant = smallest(repo);
      if (!variant) return true;
      return variant.downloadBytes <= maxSizeGb * 1024 ** 3;
    }).filter((repo) => {
      if (!fitsOnly) return true;
      const variant = smallest(repo);
      if (!variant?.memory) return true;
      return variant.memory.fit !== "no_fit";
    });
  }, [repos, details, fitsOnly, hideOwned, installed, maxSizeGb, smallest]);

  /**
   * Kategorie, które dostanie dodawany model: wybór użytkownika, a bez niego -
   * sugestia. Dwa źródła sygnału VLM, bo samo `pipeline_tag` nie wystarcza:
   * większość repozytoriów GGUF z `ggml-org` ma je puste (`null`), choć to
   * zwykłe VLM-y. Projektor jest mocniejszy - bez niego Ollama obrazu nie
   * obsłuży (sprawdzone pobraniem).
   *
   * Dla kodowania i rozmowy nie zgadujemy: HF ma dla obu `text-generation`,
   * więc sugestia z nazwy byłaby loteryjna i nadpisałaby ręczny wybór.
   */
  const categoriesFor = (repo: HfRepo, loaded: HfRepoDetails | "loading" | "error" | undefined) => {
    if (draft?.repo === repo.id) return draft.ids;
    if (!isVisionRepo(repo, loaded)) return [];
    const vlm = config?.categories.find((category) => category.kind === "vlm")?.id;
    return vlm ? [vlm] : [];
  };

  const toggleCategory = (repo: HfRepo, categoryId: string) => {
    const current = categoriesFor(repo, details[repo.id]);
    setDraft({
      repo: repo.id,
      ids: current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    });
  };

  const addVariant = (repo: HfRepo, variant: HfVariant) => {
    if (config?.models.some((entry) => entry.tag === variant.tag)) {
      setMessage({ tone: "bad", text: t("models.msg.already_on_list", { tag: variant.tag }) });
      return;
    }
    const categoryIds = categoriesFor(repo, details[repo.id]);
    updateConfig((current) => ({
      ...current,
      models: [...current.models, { tag: variant.tag, enabled: true, categoryIds }],
    }));
    setMessage({
      tone: "ok",
      text: t(categoryIds.length ? "search.added" : "search.added_no_category", {
        tag: variant.tag,
      }),
    });
  };

  const refresh = () => {
    setMessage(null);
    void load(null);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-5 xl:grid-cols-[248px_minmax(0,1fr)]">
      {/* Filtry po lewej - jak w „Wynikach”, żeby układ zakładek był spójny. */}
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="card p-3">
          <div className={LABEL}>{t("search.filters")}</div>

          {/* Plakietka przy grupie mówi, skąd pochodzi filtr: `HF` to parametr
              zapytania do HuggingFace, „nasze” to liczone u nas z plików
              i z pamięci karty. Bez tego nie da się zgadnąć, co jest czym. */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
              {t("search.task")}
              <span className={HINT}>{t("search.origin_hf")}</span>
            </div>
            {TASK_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={task === option.id ? "fopt-on" : "fopt"}
                title={t(option.tip)}
                onClick={() => setTask(option.id)}
              >
                <span>{t(option.label)}</span>
              </button>
            ))}
          </div>          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
              {t("search.size")}
              <span className={HINT}>{t("search.origin_ours")}</span>
            </div>
            <select
              className="input"
              value={maxSizeGb}
              onChange={(event) => setMaxSizeGb(Number(event.target.value))}
            >
              {SIZE_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step === 0
                    ? t("search.size_any")
                    : t("search.size_up_to", { size: `${step} GB` })}
                </option>
              ))}
            </select>
            <div className={HINT}>{t("search.size_note")}</div>
          </div>

          <div className="mt-3 space-y-1">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-300">
              <input
                type="checkbox"
                checked={fitsOnly}
                onChange={(event) => setFitsOnly(event.target.checked)}
              />
              {t("search.fits_only")}
              <span className={HINT}>{t("search.origin_ours")}</span>
            </label>
            <div className={HINT}>{t("search.fits_note")}</div>

            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-300">
              <input
                type="checkbox"
                checked={hideOwned}
                onChange={(event) => setHideOwned(event.target.checked)}
              />
              {t("search.hide_owned")}
            </label>
          </div>
        </div>

        <div className={HINT}>{t("search.counts_note")}</div>
      </aside>

      {/* Prawa kolumna: szukanie i lista. */}
      <section className="flex min-h-0 flex-col gap-3">
        <SectionHeader
          icon={<Search size={15} />}
          title={t("search.title")}
          subtitle={t("search.subtitle")}
          right={
            <button className="btn-ghost" disabled={loading} onClick={refresh}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {t("search.refresh")}
            </button>
          }
        />

        <div className="flex gap-2">
          <input
            className="input"
            value={text}
            placeholder={t("search.placeholder")}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void load(null);
            }}
          />
          <button className="btn-primary" disabled={loading} onClick={() => void load(null)}>
            <Search size={13} />
            {t("search.button")}
          </button>
        </div>

        {message ? (
          <div
            className={`rounded-lg border px-3 py-2 text-[12px] ${
              message.tone === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {error ? (
            <div className="card flex items-start gap-2 border-red-500/30 bg-red-500/5 p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-300" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-red-200">{t("search.failed")}</div>
                <div className="mt-0.5 break-words text-[12px] text-slate-400">{error}</div>
              </div>
              <button className="btn-ghost btn-xs" onClick={refresh}>
                {t("common.retry")}
              </button>
            </div>
          ) : null}

          {loading && !repos.length ? (
            <div className="card flex items-center gap-2 p-3 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              {t("search.loading")}
            </div>
          ) : null}

          {!loading && !error && !repos.length ? (
            <Empty
              icon={<SearchX size={22} />}
              title={t("search.empty")}
              hint={t("search.empty_hint")}
              action={
                /* Filtr zadania potrafi ukryć model, który istnieje: repozytoria
                   z obrazami nie mają tagu `text-generation`, więc szukanie po
                   nazwie VLM przy filtrze „Tekst” daje zero wyników. Zamiast
                   zostawiać użytkownika z pustką, dajemy jedno kliknięcie
                   do tego samego zapytania bez filtra zadania. */
                task !== "all" ? (
                  <button className="btn-ghost btn-xs" onClick={() => setTask("all")}>
                    {t("search.search_all_tasks")}
                  </button>
                ) : null
              }
            />
          ) : null}

          {rows.map((repo) => {
            const loaded = details[repo.id];
            const variants = sortedVariants(loaded);
            const first = variants[0] ?? null;
            const last = variants.length ? variants[variants.length - 1] : null;
            const owned = isOwned(repo.id, installed);
            const open = expanded === repo.id;
            return (
              <div key={repo.id} className="card overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <button
                    className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-slate-200"
                    title={t(open ? "search.collapse" : "search.expand")}
                    onClick={() => setExpanded(open ? null : repo.id)}
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-[13px] text-slate-100">
                        {repo.id}
                      </span>
                      {/* Osobny przycisk, a nie klikalny identyfikator: obok
                          siedzi strzałka rozwijająca wiersz, więc klik w sam
                          napis byłby dwuznaczny. */}
                      <button
                        className="shrink-0 text-slate-500 transition-colors hover:text-slate-200"
                        title={t("search.open_hf")}
                        aria-label={t("search.open_hf")}
                        onClick={() => {
                          // Błąd pokazujemy tak samo jak przy dodawaniu modelu:
                          // cicha porażka wyglądałaby, jakby przycisk nie działał.
                          void api
                            .openUrl(`https://huggingface.co/${repo.id}`)
                            .catch((error) =>
                              setMessage({ tone: "bad", text: String(error) }),
                            );
                        }}
                      >
                        <ExternalLink size={13} />
                      </button>
                      <Pill tone="neutral" title={t("search.badge_hf")}>
                        HF
                      </Pill>
                      {isVisionRepo(repo, loaded) ? (
                        <Pill tone="accent">{t("search.task.vision")}</Pill>
                      ) : null}
                      {owned ? <Pill tone="ok">{t("search.installed")}</Pill> : null}
                      {loadedDetails(loaded) && loaded.gated ? (
                        <Pill tone="bad">{t("search.gated")}</Pill>
                      ) : null}
                      {first?.memory ? (
                        <Pill tone={FIT_TONE[first.memory.fit]}>
                          {t(`vram.fit.${first.memory.fit}`)}
                        </Pill>
                      ) : null}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                      {/* Kolejność ma znaczenie: `error` to napis, więc musi być
                          sprawdzony **przed** zawężeniem do wczytanych szczegółów. */}
                      {loaded === "error" ? (
                        <span className="text-amber-300">{t("search.detail_failed")}</span>
                      ) : !loadedDetails(loaded) ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={11} className="animate-spin" />
                          {t("search.reading")}
                        </span>
                      ) : (
                        <>
                          <span>{t("search.count_variants", { count: variants.length })}</span>
                          {first && last ? (
                            <span className="font-mono">
                              {variants.length === 1
                                ? fmtBytes(first.downloadBytes)
                                : `${fmtBytes(first.downloadBytes)} – ${fmtBytes(last.downloadBytes)}`}
                            </span>
                          ) : null}
                        </>
                      )}
                      <span className="flex items-center gap-1" title={t("search.downloads")}>
                        <Download size={11} />
                        {repo.downloads}
                      </span>
                      <span className="flex items-center gap-1" title={t("search.likes")}>
                        <Heart size={11} />
                        {repo.likes}
                      </span>
                    </div>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-ink-700/70 bg-ink-850/40 px-3 py-3">
                    {loaded === "error" ? (
                      <div className="text-[12px] text-amber-300">{t("search.detail_failed")}</div>
                    ) : !loadedDetails(loaded) ? (
                      <div className="flex items-center gap-2 text-[12px] text-slate-400">
                        <Loader2 size={12} className="animate-spin" />
                        {t("search.reading")}
                      </div>
                    ) : variants.length ? (
                      <>
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="text-left text-slate-500">
                              <th className="pb-1 font-medium">{t("search.col_variant")}</th>
                              <th className="pb-1 text-right font-medium">
                                {t("search.col_size")}
                              </th>
                              <th className="pb-1 text-right font-medium">
                                {t("search.col_memory")}
                              </th>
                              <th className="pb-1 text-right font-medium" />
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map((variant) => (
                              <tr key={variant.file} className="border-t border-ink-800">
                                <td className="py-1.5 pr-2">
                                  <span className="font-mono text-slate-200">{variant.label}</span>
                                  {variant.projectorBytes ? (
                                    <span
                                      className="ml-2 text-slate-500"
                                      title={t("search.projector_tip", {
                                        size: fmtBytes(variant.projectorBytes),
                                      })}
                                    >
                                      {t("search.with_projector")}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-1.5 text-right font-mono text-slate-300">
                                  {fmtBytes(variant.downloadBytes)}
                                </td>
                                <td className="py-1.5 text-right font-mono text-slate-400">
                                  {variant.memory ? `${variant.memory.neededMb} MB` : DASH}
                                </td>
                                <td className="py-1.5 pl-2 text-right">
                                  {/* Trzy różne stany, bo „na liście” i „pobrany” to nie
                                      to samo: pierwszy znaczy wpis w konfiguracji,
                                      drugi - plik na dysku. Bez rozróżnienia klik
                                      w „Dodaj” nie dawał żadnej widocznej zmiany. */}
                                  {installed.some(
                                    (name) => name.toLowerCase() === variant.tag.toLowerCase(),
                                  ) ? (
                                    <span className="text-[12px] text-emerald-300">
                                      {t("search.installed")}
                                    </span>
                                  ) : config?.models.some((entry) => entry.tag === variant.tag) ? (
                                    <span className="text-[12px] text-slate-500">
                                      {t("search.on_list")}
                                    </span>
                                  ) : (
                                    <button
                                      className="btn-ghost btn-xs"
                                      onClick={() => addVariant(repo, variant)}
                                    >
                                      {t("common.add")}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="mt-2 space-y-1">
                          {loaded.files.skippedSplit.length ? (
                            <div className={HINT}>
                              {t("search.split_skipped", {
                                list: loaded.files.skippedSplit.join(", "),
                              })}
                            </div>
                          ) : null}
                          {loaded.files.skippedGroups.length ? (
                            <div className={HINT}>
                              {t("search.groups_skipped", {
                                list: loaded.files.skippedGroups
                                  .map((group) => `${group.base} (${group.files})`)
                                  .join(", "),
                              })}
                            </div>
                          ) : null}
                          {loaded.gated ? (
                            <div className="text-[12px] text-red-300">{t("search.gated_note")}</div>
                          ) : null}
                          <CategoryPills
                            className="mt-3"
                            categories={config?.categories ?? []}
                            active={categoriesFor(repo, loaded)}
                            label={t("search.pick_categories")}
                            onToggle={(categoryId) => toggleCategory(repo, categoryId)}
                          />
                          <div className={`${HINT} mt-2`}>{t("search.memory_note")}</div>
                          <div className={HINT}>
                            {[
                              loaded.contextLength
                                ? t("search.context", { value: String(loaded.contextLength) })
                                : null,
                              loaded.architecture
                                ? t("search.arch", { name: loaded.architecture })
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-[12px] text-amber-300">{t("search.no_variants")}</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}

          {cursor && !loading ? (
            <button className="btn-ghost w-full" onClick={() => void load(cursor)}>
              {t("search.more")}
            </button>
          ) : null}

          {loading && repos.length ? (
            <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-slate-500">
              <Loader2 size={12} className="animate-spin" />
              {t("search.loading")}
            </div>
          ) : null}
        </div>

        <div className={HINT}>{t("search.footer")}</div>
      </section>
    </div>
  );
}
