import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { DE } from "./locales/de";
import { EN } from "./locales/en";
import { ES } from "./locales/es";
import { FR } from "./locales/fr";
import { IT } from "./locales/it";
import { PL } from "./locales/pl";
import { PT } from "./locales/pt";
import type { Language } from "./types";

export type { Language };

/**
 * Języki do wyboru w Ustawieniach. Etykieta to nazwa języka **w nim samym**
 * (`Deutsch`, a nie „German”), bo tak rozpoznaje go każdy, kto go szuka - i jest
 * to jedyny zapis, który nie myli państwa z językiem. Nie używamy flag.
 * Pas się zawija, więc nawet kilka języków zmieści się bez zmiany układu.
 */
export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "en", label: "English" },
  { id: "pl", label: "Polski" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português (BR)" },
  { id: "it", label: "Italiano" },
];

/**
 * Kod języka dla `toLocaleDateString` / `toLocaleTimeString`. Bez tego daty
 * szłyby formatem brytyjskim we wszystkich językach - Niemiec zobaczyłby
 * `14/09/2026` zamiast `14.09.2026`.
 */
const LOCALES: Record<Language, string> = {
  en: "en-GB",
  pl: "pl-PL",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-BR",
  it: "it-IT",
};

/**
 * Tłumaczenia kluczowane **neutralnym kluczem**, z osobnym plikiem na język.
 *
 * Klucz (`models.row.download`) nic nie mówi o treści, więc ten sam zestaw
 * kluczy obsługuje wszystkie języki i żaden tekst nie jest wpisany w komponent.
 * Nowy język to nowy plik i jedna linia tutaj.
 *
 * Brak wpisu spada **do angielskiego**, nie do tekstu źródłowego: niepełne
 * tłumaczenie pokazuje angielskie wstawki, a nie polskie. Dopiero brak wpisu
 * w `en.ts` (co jest błędem, bo to język źródłowy) pokazuje sam klucz.
 * `npm run check:i18n` pilnuje, że oba pliki mają dokładnie te same klucze.
 */
const CATALOGS: Record<Language, Record<string, string>> = {
  en: EN,
  pl: PL,
  de: DE,
  es: ES,
  fr: FR,
  pt: PT,
  it: IT,
};

export type TranslateParams = Record<string, string | number>;

/**
 * Formy liczby mnogiej, których używa słownik. Te same nazwy zwraca
 * `Intl.PluralRules`, a `npm run check:i18n` pilnuje - czytając tę listę
 * ze źródła - żeby każdy język miał dokładnie te formy, których jego reguły
 * mogą użyć, i żadnej więcej.
 *
 * Polska potrzebuje trzech (`1 prompt`, `2 prompty`, `5 promptów`),
 * angielski czy niemiecki dwóch. To dlatego forma jest wybierana **regułami
 * języka**, a nie licznikiem w kodzie.
 */
export const PLURAL_FORMS = ["zero", "one", "two", "few", "many", "other"] as const;

const pluralRules = new Map<Language, Intl.PluralRules>();

/** Reguły liczby mnogiej języka, liczone raz na język. */
function pluralRulesOf(language: Language): Intl.PluralRules {
  let rules = pluralRules.get(language);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALES[language] ?? "en-GB");
    pluralRules.set(language, rules);
  }
  return rules;
}

function lookup(language: Language, key: string): string | undefined {
  return CATALOGS[language]?.[key] ?? EN[key];
}

/**
 * Liczba mnoga. Formę wybiera parametr **`count`**: `key.one`, `key.few`,
 * `key.many` albo `key.other`.
 *
 * Gdy formy nie ma, wracamy do klucza bez formy. Dzięki temu klucz, w którym
 * nic się nie odmienia (`{count} tok/s`), nie potrzebuje ani jednego wpisu
 * więcej - a klucz odmienny nie zadziała „po cichu po angielsku”, bo brak
 * formy pokaże sam klucz i skaner to złapie.
 */
function lookupPlural(language: Language, key: string, count: number): string | undefined {
  const form = pluralRulesOf(language).select(count);
  return (
    lookup(language, `${key}.${form}`) ??
    lookup(language, `${key}.other`) ??
    lookup(language, key)
  );
}

export function translate(language: Language, key: string, params?: TranslateParams): string {
  const count = params?.count;
  const template =
    typeof count === "number"
      ? (lookupPlural(language, key, count) ?? key)
      : (lookup(language, key) ?? key);

  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Wykrywa brakujące tłumaczenie w trybie deweloperskim, zamiast milczeć. */
export function missingTranslation(
  language: Language,
  key: string,
  params?: TranslateParams,
): boolean {
  const count = params?.count;
  if (typeof count === "number") {
    const form = pluralRulesOf(language).select(count);
    if (!(language in CATALOGS)) return true;
    // Ta sama kolejność co w `translate`: forma → `.other` → klucz podstawowy.
    // Bez dwóch ostatnich kroków klucz, który się nie odmienia („{count} tok/s”),
    // wyglądał tu na brakujące tłumaczenie, choć `translate` renderuje go dobrze.
    return (
      lookup(language, `${key}.${form}`) === undefined &&
      lookup(language, `${key}.other`) === undefined &&
      lookup(language, key) === undefined
    );
  }
  return !(key in (CATALOGS[language] ?? EN));
}

interface I18nValue {
  language: Language;
  /** Kod języka dla `toLocaleDateString` / `toLocaleTimeString`. */
  locale: string;
  t: (key: string, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nValue>({
  language: "en",
  locale: "en-GB",
  t: (key) => key,
});

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  // Język dokumentu idzie za wyborem użytkownika. Bez tego `index.html`
  // zostawiał `lang="pl"` na stałe, więc czytnik ekranu w angielskim czy
  // niemieckim interfejsie czytał tekst z polską wymową. Ten sam błąd co
  // w eksporcie HTML, tylko po stronie okna.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      locale: LOCALES[language] ?? "en-GB",
      t: (key, params) => {
        if (import.meta.env.DEV && missingTranslation(language, key, params)) {
          // Ostrzeżenie dla programisty, nie tekst interfejsu.
          console.warn(`[i18n] missing translation (${language}): ${JSON.stringify(key)}`);
        }
        return translate(language, key, params);
      },
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
