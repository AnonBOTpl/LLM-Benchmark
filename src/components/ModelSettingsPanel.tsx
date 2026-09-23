import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";

import { useI18n } from "../lib/i18n";
import {
  OPTION_FIELDS,
  OPTION_KEYS,
  OPTION_LABELS,
  OPTION_PLACEHOLDERS,
  emptyOptions,
  formatOption,
  parseOption,
  recommendedOptions,
} from "../lib/modelSettings";
import {
  KIND_LABEL,
  type CategoryKind,
  type ModelEntry,
  type ModelOptions,
} from "../lib/types";
import { HINT, LABEL } from "./ui";

/**
 * Szkic ustawień modelu - czyli to, co użytkownik ma **w polach**, a nie to, co
 * jest zapisane.
 *
 * Rozdzielenie jest celowe: parametry wpływają na wyniki, więc zapis jest
 * decyzją (przycisk), a nie skutkiem klikania. Dopóki szkic istnieje, panel
 * pokazuje jego wartości, a pasek na dole przypomina, że czekają na zapis.
 *
 * Szkic jest kluczowany **tagiem**, nie pozycją na liście: dodanie albo
 * usunięcie modelu przesuwa pozycje, a tag się nie przesuwa.
 */
export interface ModelSettingsDraft {
  options: ModelOptions;
  /** Własny prompt zamiast domyślnego dla typu kategorii. */
  customPrompt: boolean;
  promptText: string;
}

/**
 * Czy szkic różni się od tego, co jest zapisane w konfiguracji.
 *
 * Bez tego pasek „niezapisane zmiany” zostałby po samym kliknięciu
 * **domyślne → własne → domyślne**: szkic istnieje, ale nie różni się od
 * zapisanego stanu, więc nie ma czego zapisywać. Porównanie idzie **tak samo
 * jak zapis**: gdy prompt jest domyślny, jego tekst nie liczy się wcale (zapis
 * i tak wstawia wtedy `null`), a brak parametru i `null` to to samo.
 */
export function draftIsDirty(entry: ModelEntry, draft: ModelSettingsDraft): boolean {
  const savedCustom = entry.systemPrompt !== null && entry.systemPrompt !== undefined;
  if (savedCustom !== draft.customPrompt) return true;
  if (draft.customPrompt && (draft.promptText.trim() || null) !== (entry.systemPrompt?.trim() ?? null)) {
    return true;
  }

  const saved = entry.options ?? {};
  return OPTION_KEYS.some(
    (key) => (draft.options[key] ?? null) !== (saved[key] ?? null),
  );
}

/**
 * Karty ustawień modelu: parametry generowania i system prompt. To ta sama
 * treść, która wcześniej siedziała w wyskakującym okienku - teraz widoczna
 * obok modelu, którego dotyczy, bez otwierania czegokolwiek.
 */
export function ModelSettingsCards({
  kind,
  contextLength,
  supportsSystem,
  draft,
  defaultPrompt,
  onChange,
}: {
  kind: CategoryKind | null;
  contextLength: number | null;
  /** `false` = szablon modelu nie ma miejsca na `system`, więc Ollama go odrzuci. */
  supportsSystem: boolean | null;
  draft: ModelSettingsDraft;
  /** Domyślny prompt dla typu kategorii - podgląd i punkt startu dla własnego. */
  defaultPrompt: string;
  onChange: (next: ModelSettingsDraft) => void;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<ModelSettingsDraft>) => onChange({ ...draft, ...patch });

  return (
    <>
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={LABEL}>{t("settings.model.params_title")}</span>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost btn-xs"
              title={t("settings.model.insert_suggested_tip")}
              onClick={() => set({ options: recommendedOptions(kind ?? "chat", contextLength) })}
            >
              <RotateCcw size={12} />
              {t("settings.model.insert_suggested")}
            </button>
            <button className="btn-ghost btn-xs" onClick={() => set({ options: emptyOptions() })}>
              <Trash2 size={12} />
              {t("common.clear")}
            </button>
          </div>
        </div>

        <div className="mt-2">
          {OPTION_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex items-center justify-between gap-3 border-b border-ink-700/50 py-1 last:border-0"
              title={t(field.hint)}
            >
              <span className="text-[13px] text-slate-400">{OPTION_LABELS[field.key]}</span>
              <input
                className="input w-28 py-1 text-right font-mono text-[13px]"
                inputMode="decimal"
                placeholder={
                  OPTION_PLACEHOLDERS[field.key]
                    ? t(OPTION_PLACEHOLDERS[field.key] as string)
                    : t("common.default")
                }
                value={formatOption(draft.options[field.key])}
                onChange={(event) =>
                  set({
                    options: {
                      ...draft.options,
                      [field.key]: parseOption(event.target.value, field.integer),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>

        {/* Obsługiwany kontekst musi być widoczny: bez niego nie wiadomo, czemu
            `num_ctx` nie da się ustawić wyżej. */}
        <div className={`mt-2 space-y-0.5 ${HINT}`}>
          <p>
            {contextLength
              ? t("settings.model.context_supported", { context: contextLength })
              : t("settings.model.context_unknown")}
          </p>
          <p>{t("settings.model.params_hint")}</p>
        </div>
      </div>

      <div className="card p-4 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={LABEL}>{t("settings.model.system_title")}</span>
          <div className="flex items-center gap-1.5">
            <button
              className={`${draft.customPrompt ? "chip-off" : "chip-on"} text-[12px]`}
              onClick={() => set({ customPrompt: false })}
            >
              {t("common.default")}
            </button>
            <button
              className={`${draft.customPrompt ? "chip-on" : "chip-off"} text-[12px]`}
              title={t("settings.model.system_custom")}
              onClick={() =>
                set({
                  customPrompt: true,
                  // Własny prompt startuje z tekstu, który widać - czyli
                  // z domyślnego - żeby nie zaczynać od pustego pola.
                  promptText: draft.promptText.trim() ? draft.promptText : defaultPrompt,
                })
              }
            >
              {t("common.badge_custom")}
            </button>
          </div>
        </div>

        <textarea
          className={`input mt-2 min-h-[120px] resize-y font-mono text-[13px] leading-relaxed ${
            draft.customPrompt ? "" : "opacity-60"
          }`}
          value={draft.customPrompt ? draft.promptText : defaultPrompt}
          disabled={!draft.customPrompt}
          onChange={(event) => set({ promptText: event.target.value })}
        />

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={HINT}>
            {draft.customPrompt
              ? t("settings.model.system_hint")
              : kind
                ? t("settings.model.system_preview", { kind: KIND_LABEL[kind] })
                : t("settings.model.system_no_kind")}
          </span>
          <button
            className="btn-ghost btn-xs ml-auto"
            disabled={!kind || !draft.customPrompt || draft.promptText === defaultPrompt}
            onClick={() => set({ promptText: defaultPrompt })}
          >
            <RotateCcw size={12} />
            {t("settings.model.insert_default")}
          </button>
        </div>

        {supportsSystem === false ? (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>{t("settings.model.no_system_support")}</span>
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * Pasek niezapisanych zmian. Przyklejony do dołu panelu, więc widać go także
 * wtedy, gdy użytkownik zjedzie niżej - i także wtedy, gdy przełączy model i
 * wróci: szkic czeka na swoim modelu, a nie na ekranie.
 */
export function ModelSettingsBar({
  onSave,
  onDiscard,
}: {
  onSave: () => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-accent-500/40 bg-ink-900/95 px-4 py-3 shadow-lg backdrop-blur">
      <span className="text-[13px] text-slate-200">{t("settings.model.unsaved")}</span>
      <div className="ml-auto flex items-center gap-2">
        <button className="btn-ghost" onClick={onDiscard}>
          {t("common.cancel")}
        </button>
        <button className="btn-primary" onClick={onSave}>
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
