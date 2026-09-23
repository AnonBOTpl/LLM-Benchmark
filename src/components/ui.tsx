import type { ReactNode } from "react";

/**
 * Trzy poziomy tekstu: liczba, etykieta, podpowiedź. Trzymamy je w jednym
 * miejscu, żeby nowe ekrany nie wprowadzały znowu jednego rozmiaru dla
 * wszystkiego - tak było, gdy 91% tekstu miało 11 px. Rozmiarów pilnuje `npm run check:ui` (nic poniżej 12 px).
 */
export const LABEL = "text-[12px] font-semibold uppercase tracking-wide text-slate-500";
export const HINT = "text-[12px] leading-relaxed text-slate-500";

export function Pill({
  tone = "neutral",
  icon,
  children,
  title,
}: {
  tone?: "neutral" | "ok" | "warn" | "bad" | "accent";
  icon?: ReactNode;
  children: ReactNode;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-800 text-slate-400 border-ink-700",
    ok: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    warn: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    bad: "bg-red-500/10 text-red-300 border-red-500/30",
    accent: "bg-accent-500/10 text-accent-400 border-accent-500/30",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "accent",
  className = "",
}: {
  value: number | null;
  tone?: "accent" | "emerald" | "amber";
  className?: string;
}) {
  const tones = {
    accent: "bg-accent-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };
  const pct = value === null ? null : Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-800 ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-200 ${tones[tone]} ${
          pct === null ? "w-1/3 animate-pulse" : ""
        }`}
        style={pct === null ? undefined : { width: `${pct}%` }}
      />
    </div>
  );
}

export function Empty({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-700 px-6 py-10 text-center">
      {icon ? <div className="text-slate-600">{icon}</div> : null}
      <div className="text-sm font-medium text-slate-300">{title}</div>
      {hint ? <div className="max-w-md text-xs text-slate-500">{hint}</div> : null}
      {action}
    </div>
  );
}

export function Metric({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "accent" | "soft";
  hint?: string;
}) {
  const tones = {
    default: "text-slate-100",
    accent: "text-accent-400",
    soft: "text-slate-400",
  };
  return (
    <div className="min-w-[86px] rounded-lg border border-ink-700 bg-ink-850 px-3 py-2" title={hint}>
      <div className="label">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${tones[tone]}`}>{value}</div>
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="flex items-start gap-2.5">
        {icon ? <div className="mt-0.5 text-accent-400">{icon}</div> : null}
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {right}
    </div>
  );
}
