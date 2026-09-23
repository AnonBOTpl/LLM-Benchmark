export const DASH = "—";

export function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return value.toFixed(digits);
}

export function fmtMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

export function fmtMb(value: number | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  return `${Math.round(value)} MB`;
}

/**
 * `locale` pochodzi z `useI18n()` - daty muszą się formatować w języku
 * interfejsu, a nie na sztywno po polsku.
 */
export function fmtDate(iso: string, locale = "en-GB"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return DASH;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} min ${seconds} s`;
}

export function fmtBytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function average(values: (number | null | undefined)[]): number | null {
  const clean = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export const tokensPerSecOf = (result: {
  tokensPerSec: number | null;
  measuredTokensPerSec: number | null;
}): number | null => result.tokensPerSec ?? result.measuredTokensPerSec;
