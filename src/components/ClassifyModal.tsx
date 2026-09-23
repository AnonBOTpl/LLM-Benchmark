import { AlertTriangle, Ban, CheckCircle2, Gauge, Loader2, Wrench } from "lucide-react";

import { useApp } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { fmtMs, fmtNum, fmtMb } from "../lib/format";
import { CLASSIFICATION_LABELS, type ClassificationLabel, type ClassifyRequest } from "../lib/types";
import { Metric, Pill } from "./ui";

/**
 * Wygląd i podpowiedź etykiety, kluczowane **kodem** etykiety - tym samym,
 * który trafia do historii i eksportu (`label.completed`).
 *
 * Typ `Record<ClassificationLabel, ...>` pilnuje tu kompletu: brakujący wpis jest
 * błędem kompilacji, a nie pustym oknem w trakcie przebiegu. Dwa wpisy zostały tu
 * kiedyś po starym polskim tekście - `meta` było wtedy `undefined`, `meta.hint`
 * rzucało wyjątek, a React odmontowywał całą aplikację i zostawiał białe okno
 * w chwili pojawienia się pierwszego okna klasyfikacji.
 */
const LABEL_META: Record<
  ClassificationLabel,
  { tone: "ok" | "bad" | "warn"; icon: React.ReactNode; hint: string }
> = {
  "label.completed": {
    tone: "ok",
    icon: <CheckCircle2 size={14} />,
    hint: "label.completed.help",
  },
  "label.refused": {
    tone: "bad",
    icon: <Ban size={14} />,
    hint: "label.refused.help",
  },
  "label.limited": {
    tone: "warn",
    icon: <Wrench size={14} />,
    hint: "label.limited.help",
  },
};

export function ClassifyModal({ request }: { request: ClassifyRequest }) {
  const { answerClassification } = useApp();
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-6 backdrop-blur-sm">
      <div className="card flex max-h-full w-full max-w-4xl flex-col overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-accent-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                {t("classify.title")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t(
                "classify.hint",
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Pill tone="accent">{request.model}</Pill>
            <span className="text-[12px] text-slate-500">{request.categoryName}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div>
            <div className="label mb-1">{t("common.prompt")}</div>
            <div className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-slate-300">
              {request.prompt}
            </div>
          </div>

          <div>
            <div className="label mb-1">{t("classify.response")}</div>
            <pre className="max-h-[42vh] overflow-auto whitespace-pre-wrap rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-200">
              {request.response || t("classify.empty_response")}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Metric label={t("metrics.ttft")} value={fmtMs(request.ttftMs)} tone="accent" />
            <Metric label={t("metrics.tps")} value={fmtNum(request.tokensPerSec)} tone="accent" />
            <Metric label={t("common.time")} value={fmtMs(request.totalMs)} />
            <Metric label={t("metrics.vram_peak")} value={fmtMb(request.vramPeakMb)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-700 px-5 py-4">
          {CLASSIFICATION_LABELS.map((label) => {
            const meta = LABEL_META[label];
            return (
              <button
                key={label}
                title={t(meta.hint)}
                onClick={() => void answerClassification(label)}
                className={`btn ${
                  meta.tone === "ok"
                    ? "btn-success"
                    : meta.tone === "bad"
                      ? "btn-danger"
                      : "btn-ghost !text-amber-300 !border-amber-500/30 hover:!bg-amber-500/10"
                }`}
              >
                {meta.icon}
                {t(label)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-slate-400">
      <Loader2 size={18} className="animate-spin" />
      {message}
    </div>
  );
}

export function ErrorScreen({ error }: { error: string }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="card flex max-w-xl items-start gap-3 p-5">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
        <div>
          <div className="text-sm font-semibold text-slate-100">
            {t("classify.start_failed")}
          </div>
          <p className="mt-1 text-xs text-slate-400">{error}</p>
        </div>
      </div>
    </div>
  );
}
