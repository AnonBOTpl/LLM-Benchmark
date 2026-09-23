import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { useI18n } from "../lib/i18n";

/**
 * Osłona na błędy renderowania: awaria jednej części pokazuje **komunikat
 * w jej miejscu**, a nie puste okno.
 *
 * Skąd ta potrzeba: 21 września okno klasyfikacji sięgało po opis etykiety,
 * którego nie było (`meta.hint`, gdy `meta` było `undefined`). React bez osłony
 * odmontowuje wtedy **całe** drzewo, więc użytkownik widzi okno z pustą treścią,
 * proces żyje, a w logu backendu nie ma nic - czyli objaw („aplikacja się
 * zamknęła”) wskazuje zupełnie gdzie indziej niż przyczyna. Zajęło to godzinę
 * szukania; ten komponent jest po to, żeby drugi raz nie zajęło.
 *
 * Trzy decyzje warte zapisania:
 *
 * **Klasa, nie funkcja.** To jedyna funkcja Reacta bez odpowiednika w hookach
 * (`getDerivedStateFromError`). Cała reszta to zwykły komponent funkcyjny
 * w środku, bo tylko funkcja może użyć `useI18n`.
 *
 * **Osłona stoi w zakładkach, nie nad całym `AppProvider`.** Stan przebiegu
 * (postęp, odpowiedzi, kolejka) mieszka w `AppProvider`, czyli **nad** osłoną -
 * więc awaria widoku nie przerywa przebiegu, tylko usuwa jego widok. Odwrotne
 * ustawienie (osłona nad dostawcą) kazałoby użytkownikowi zaczynać test od zera
 * po błędzie w jednej tabeli.
 *
 * **Warstwa zagnieżdżona.** Zakładki są zamontowane na stałe (tak trzeba, bo
 * przebieg ma żyć, gdy użytkownik patrzy na inną zakładkę), więc osłona jest
 * osobna dla każdej z nich: awaria w „Test” nie zabiera „Modeli”. Najwyższa
 * osłona obejmuje `Shell`, gdyby padło coś poza zakładkami (pasek, nawigacja,
 * okno klasyfikacji).
 *
 * Czego osłona **nie** łapie: błędów w obsłudze zdarzeń i w kodzie
 * asynchronicznym (`void (async () => …)()`). Nie trzeba ich łapać - takie błędy
 * nie odmontowują Reacta, więc nigdy nie kończą się pustym oknem. Osłona pokrywa
 * dokładnie ten przypadek, który kończy: wyjątek w trakcie renderowania.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // `componentStack` mówi, **który** komponent rzucił - bez tego w konsoli
    // zostaje sam komunikat i trzeba zgadywać, gdzie szukać.
    console.error("[boundary]", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <BoundaryFallback
        error={error}
        titleKey={this.props.titleKey ?? "error.title"}
        variant={this.props.variant ?? "section"}
        // Zdjęcie błędu ze stanu montuje dzieci od nowa, razem z ich stanem -
        // czyli to, co się zepsuło, nie wraca w tej samej, uszkodzonej postaci.
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}

interface ErrorBoundaryProps {
  /**
   * Klucz tytułu komunikatu: `error.title` dla sekcji, `error.window_title`,
   * gdy padła cała treść okna.
   */
  titleKey?: string;
  /** `overlay` dla okien (klasyfikacja), `section` dla zakładek. */
  variant?: "section" | "overlay";
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function BoundaryFallback({
  error,
  titleKey,
  variant,
  onRetry,
}: {
  error: Error;
  titleKey: string;
  variant: "section" | "overlay";
  onRetry: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={
        variant === "overlay"
          ? "fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-6 backdrop-blur-sm"
          : "flex h-full items-center justify-center p-8"
      }
    >
      <div className="card w-full max-w-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100">{t(titleKey)}</div>
            <p className="mt-1 text-xs text-slate-400">{t("error.hint")}</p>
          </div>
        </div>

        {/* Surowy komunikat idzie do interfejsu, a nie tylko do konsoli: przy
            zgłaszaniu błędu to jedyna informacja, którą użytkownik może
            przepisać. Nie tłumaczymy go - to tekst techniczny. */}
        <div className="mt-4">
          <div className="label mb-1">{t("error.details")}</div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-300">
            {error.message || String(error)}
          </pre>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onRetry} className="btn btn-ghost">
            <RotateCcw size={14} />
            {t("error.retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
