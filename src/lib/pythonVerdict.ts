/**
 * Werdykt sprawdzenia składni Pythona: kod z backendu → to, co widać.
 *
 * Po co osobny modulik: czyta go i tabela na żywo w „Teście”, i szczegóły
 * w „Wynikach”. Dwie kopie tego mapowania rozjechałyby się przy pierwszej
 * zmianie i ten sam kod byłby opisany dwoma różnymi zdaniami.
 *
 * Trzy stany są świadome, nie dwa. „Nie ma tu Pythona” to nie to samo, co
 * „błąd składni”: model, który odpowiedział prozą, nie napisał złego kodu -
 * napisał żaden, i nazwanie tego ✗ byłoby nieprawdą.
 */

/** Kod parsuje się jako Python. Ta sama wartość co `python_check::OK` w Ruście. */
export const PYTHON_OK = "ok";
/** Kod się nie parsuje. Ta sama wartość co `python_check::SYNTAX_ERROR`. */
export const PYTHON_SYNTAX_ERROR = "syntax_error";
/** Nie ma czego sprawdzać: proza, kod w innym języku, puste ogrodzenie. */
export const PYTHON_NO_CODE = "no_code";

/**
 * Klucz tłumaczenia dla kodu z backendu. Nieznany kod ląduje na „nie ma tu
 * Pythona”, bo to jedyny stan, który nie twierdzi nic o odpowiedzi - a kod
 * spoza tej trójki może pochodzić z nowszej wersji backendu.
 */
export function pythonVerdictKey(verdict: string): string {
  if (verdict === PYTHON_OK) return "results.python_ok";
  if (verdict === PYTHON_SYNTAX_ERROR) return "results.python_syntax_error";
  return "results.python_no_code";
}

/**
 * Znak do wąskiej tabeli na żywo: ✓ parsuje się, ✗ błąd składni, kreska brak
 * kodu. Pełne zdanie jest w podpowiedzi, bo kolumna musi zostać czytelna przy
 * ośmiu modelach.
 */
export function pythonVerdictMark(verdict: string): string {
  if (verdict === PYTHON_OK) return "✓";
  if (verdict === PYTHON_SYNTAX_ERROR) return "✗";
  return "—";
}

/** Kolor werdyktu - jeden odcień na stan, wspólny dla obu zakładek. */
export function pythonVerdictClass(verdict: string): string {
  if (verdict === PYTHON_OK) return "text-emerald-300";
  if (verdict === PYTHON_SYNTAX_ERROR) return "text-amber-300";
  return "text-slate-500";
}
