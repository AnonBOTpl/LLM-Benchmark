import { useState } from "react";
import { CheckSquare, FileImage, Info, Plus, Square, Trash2 } from "lucide-react";

import * as api from "../lib/api";
import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import {
  KIND_LABEL,
  PROMPT_HINT,
  enabledPromptCount,
  totalPromptCount,
  type Category,
  type TextPrompt,
  type VlmPrompt,
} from "../lib/types";
import { Pill } from "../components/ui";

const newPrompt = (): TextPrompt => ({ text: "", enabled: true });

/**
 * Zakładka „Kategorie” w szerokim układzie: lista kategorii po lewej, prompty
 * po prawej.
 *
 * Powód podziału jest ten sam, co w „Modelach”: prompty to długie zdania, więc
 * w wąskiej kolumnie łamały się po dwa razy na linijkę, a po bokach zostawało
 * pół okna. Tutaj szerokość okna idzie na **prompty**, a nie na marginesy.
 */
export function CategoriesTab() {
  const { config, updateConfig } = useApp();
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!config) return null;

  // Wybór trzymamy po `id`, nie po pozycji: kolejność kategorii może się
  // zmienić, a id jest stałe. Gdy nic nie wybrano, pokazujemy pierwszą.
  const category =
    config.categories.find((entry) => entry.id === selectedId) ?? config.categories[0];

  if (!category) return null;

  /**
   * Zmiana w kategorii. `patch` może być funkcją dostającą **najświeższy** stan
   * kategorii - i tak muszą go podawać wszystkie zmiany tablic (dodanie,
   * usunięcie, edycja wiersza). Powód: trzy szybkie kliknięcia „Dodaj prompt"
   * wpadają w jedno odświeżenie interfejsu, więc patch policzony z migawki
   * z renderu złożyłby trzy razy tę samą tablicę - i zostałby jeden wiersz.
   */
  const patchCategory = (
    categoryId: string,
    patch: Partial<Category> | ((current: Category) => Partial<Category>),
  ) => {
    updateConfig((current) => ({
      ...current,
      categories: current.categories.map((entry) =>
        entry.id === categoryId
          ? { ...entry, ...(typeof patch === "function" ? patch(entry) : patch) }
          : entry,
      ),
    }));
  };

  const patchPrompt = (categoryId: string, index: number, patch: Partial<TextPrompt>) =>
    patchCategory(categoryId, (current) => ({
      prompts: current.prompts.map((prompt, i) =>
        i === index ? { ...prompt, ...patch } : prompt,
      ),
    }));

  const addPrompt = (categoryId: string) =>
    patchCategory(categoryId, (current) => ({
      prompts: [...current.prompts, newPrompt()],
    }));

  const removePrompt = (categoryId: string, index: number) =>
    patchCategory(categoryId, (current) => ({
      prompts: current.prompts.filter((_, i) => i !== index),
    }));

  const patchVlm = (categoryId: string, index: number, patch: Partial<VlmPrompt>) => {
    patchCategory(categoryId, (current) => ({
      vlmPrompts: current.vlmPrompts.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const addVlm = (categoryId: string) =>
    patchCategory(categoryId, (current) => ({
      vlmPrompts: [
        ...current.vlmPrompts,
        { prompt: "", imagePath: "", enabled: true },
      ],
    }));

  const removeVlm = (categoryId: string, index: number) =>
    patchCategory(categoryId, (current) => ({
      vlmPrompts: current.vlmPrompts.filter((_, i) => i !== index),
    }));

  const pickImage = async (categoryId: string, index: number) => {
    const path = await api.pickImage();
    if (path) patchVlm(categoryId, index, { imagePath: path });
  };

  /** Zaznacza albo odznacza wszystkie prompty kategorii jednym klikiem. */
  const setAllEnabled = (target: Category, enabled: boolean) => {
    if (target.kind === "vlm") {
      patchCategory(target.id, {
        vlmPrompts: target.vlmPrompts.map((item) => ({ ...item, enabled })),
      });
    } else {
      patchCategory(target.id, {
        prompts: target.prompts.map((prompt) => ({ ...prompt, enabled })),
      });
    }
  };

  const isVlm = category.kind === "vlm";
  const total = totalPromptCount(category);
  const enabled = enabledPromptCount(category);
  const allEnabled = total > 0 && enabled === total;

  /**
   * Licznik kategorii. Gdy wszystko jest zaznaczone, mówi tylko ile promptów
   * jest - liczba „5 z 5” nic nie wnosi. Pusta kategoria nie pokazuje nic,
   * bo „0 promptów” to ta sama informacja co brak wiersza.
   */
  const countLabel = (entry: Category) => {
    const entryTotal = totalPromptCount(entry);
    if (entryTotal === 0) return "";
    const entryEnabled = enabledPromptCount(entry);
    if (entryEnabled === entryTotal) {
      return t(entry.kind === "vlm" ? "categories.count_images" : "common.count_prompts", {
        count: entryTotal,
      });
    }
    return t(
      entry.kind === "vlm" ? "categories.enabled_tasks" : "categories.enabled_prompts",
      { count: entryEnabled, total: entryTotal },
    );
  };

  return (
    <div className="flex h-full">
      {/* ── Kolumna listy: które kategorie mam i ile w każdej promptów ─────── */}
      <aside className="flex w-[252px] shrink-0 flex-col border-r border-ink-700/70 bg-ink-900/40">
        <div className="flex shrink-0 items-baseline gap-2 border-b border-ink-700/70 p-3">
          <span className="text-[13px] font-medium text-slate-200">{t("nav.categories")}</span>
          <span className="text-[12px] text-slate-500">{config.categories.length}</span>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {config.categories.map((entry) => {
            const entryTotal = totalPromptCount(entry);
            const entryEnabled = enabledPromptCount(entry);
            const active = entry.id === category.id;
            return (
              <button
                key={entry.id}
                className={`${active ? "fopt-on" : "fopt"} px-2.5 py-2`}
                title={countLabel(entry)}
                onClick={() => setSelectedId(entry.id)}
              >
                <span className="min-w-0 truncate text-[13px]">{entry.name}</span>
                {entryTotal > 0 ? (
                  <span className="shrink-0 font-mono text-[12px] opacity-70">
                    {entryEnabled === entryTotal ? entryTotal : `${entryEnabled}/${entryTotal}`}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Kolumna promptów: cała szerokość, bo to długie zdania ─────────── */}
      <section className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-ink-700/70 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="input -ml-2 max-w-md !border-transparent !bg-transparent !px-2 text-[16px] font-semibold !text-slate-100 focus:!border-ink-600"
              value={category.name}
              onChange={(event) => patchCategory(category.id, { name: event.target.value })}
            />
            <Pill tone="accent">{KIND_LABEL[category.kind]}</Pill>
            {total > 0 ? (
              <span className="text-[12px] text-slate-500">{countLabel(category)}</span>
            ) : null}
            <span className="text-slate-500 hover:text-slate-300" title={t("categories.intro")}>
              <Info size={14} />
            </span>

            <div className="ml-auto flex items-center gap-2">
              {total > 0 ? (
                <button
                  className="btn-ghost btn-xs text-[12px]"
                  title={t(allEnabled ? "categories.uncheck_all_tip" : "categories.check_all_tip")}
                  onClick={() => setAllEnabled(category, !allEnabled)}
                >
                  {allEnabled ? <Square size={12} /> : <CheckSquare size={12} />}
                  {allEnabled ? t("categories.uncheck_all") : t("categories.check_all")}
                </button>
              ) : null}
              <button
                className="btn-ghost btn-xs text-[12px]"
                onClick={() => (isVlm ? addVlm(category.id) : addPrompt(category.id))}
              >
                <Plus size={12} />
                {isVlm ? t("categories.add_image") : t("categories.add_prompt")}
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-3 p-5">
            {category.kind === "classification" ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
                {t("categories.classification_intro")}
                <strong>{t("label.completed")}</strong>, <strong>{t("label.refused")}</strong>,{" "}
                <strong>{t("label.limited")}</strong>
                {t("categories.classification_outro")}
              </div>
            ) : null}

            {/* Jedyna kategoria, która wymaga ustawienia czegoś po stronie
                użytkownika: bez podniesionego `num_ctx` Ollama po cichu ucina
                wejście i kategoria mierzy nie to, co chcemy. */}
            {category.kind === "long_context" ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
                {t("categories.long_context_note")}
              </div>
            ) : null}

            {total === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-700 px-3 py-6 text-center text-[12px] text-slate-500">
                {t("categories.empty")}
              </div>
            ) : (
              <div className="card divide-y divide-ink-700/50">
                {isVlm
                  ? category.vlmPrompts.map((item, index) => (
                      <div
                        key={index}
                        className={`px-3 py-2.5 ${item.enabled ? "" : "opacity-60"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 accent-cyan-400"
                            checked={item.enabled}
                            title={t("categories.task_enabled_tip")}
                            onChange={(event) =>
                              patchVlm(category.id, index, { enabled: event.target.checked })
                            }
                          />
                          <FileImage size={13} className="shrink-0 text-accent-400" />
                          <span className="text-[13px] text-slate-300">
                            {t("categories.image_label", { index: index + 1 })}
                          </span>
                          <button
                            className="btn-danger btn-xs ml-auto shrink-0"
                            onClick={() => removeVlm(category.id, index)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="mt-2 flex gap-2">
                          <input
                            className="input font-mono text-[12px]"
                            placeholder={t("categories.image_placeholder")}
                            value={item.imagePath}
                            onChange={(event) =>
                              patchVlm(category.id, index, { imagePath: event.target.value })
                            }
                          />
                          <button
                            className="btn-ghost shrink-0 text-[13px]"
                            onClick={() => void pickImage(category.id, index)}
                          >
                            {t("categories.choose_file")}
                          </button>
                        </div>

                        <textarea
                          className="input mt-2 min-h-[64px] resize-y text-[13px]"
                          placeholder={t(PROMPT_HINT.vlm)}
                          value={item.prompt}
                          onChange={(event) =>
                            patchVlm(category.id, index, { prompt: event.target.value })
                          }
                        />
                      </div>
                    ))
                  : category.prompts.map((prompt, index) => (
                      <div key={index} className="flex items-start gap-3 px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="mt-2 h-4 w-4 shrink-0 accent-cyan-400"
                          checked={prompt.enabled}
                          title={t("categories.prompt_enabled_tip")}
                          onChange={(event) =>
                            patchPrompt(category.id, index, { enabled: event.target.checked })
                          }
                        />
                        <span className="mt-2 w-5 shrink-0 text-right font-mono text-[12px] text-slate-500">
                          {index + 1}
                        </span>
                        <textarea
                          className={`input min-h-[44px] resize-y text-[13px] ${
                            prompt.enabled ? "" : "opacity-60"
                          }`}
                          placeholder={t(PROMPT_HINT[category.kind] ?? "categories.prompt_text")}
                          value={prompt.text}
                          onChange={(event) =>
                            patchPrompt(category.id, index, { text: event.target.value })
                          }
                        />
                        <button
                          className="btn-danger btn-xs mt-1 shrink-0"
                          onClick={() => removePrompt(category.id, index)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
              </div>
            )}

            {total > 0 && enabled === 0 ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
                {t("categories.all_unchecked")}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
