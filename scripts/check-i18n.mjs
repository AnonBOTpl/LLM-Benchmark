#!/usr/bin/env node
// Sprawdza kompletność tłumaczeń w obie strony - i to, czy tekst nie zrobił się akapitem.
//
// Interfejs ma **neutralne klucze** i osobny plik na język (`locales/en.ts`,
// `locales/pl.ts`), patrz `src/lib/i18n.tsx`. Ten skrypt pilnuje czterech rzeczy:
//
//   1. oba pliki mają dokładnie ten sam zestaw kluczy,
//   2. klucz jest poprawny: ASCII, małe litery, kropki, bez polskiego tekstu,
//   3. każdy klucz użyty w komponencie istnieje w słowniku (i odwrotnie),
//   4. w komponentach nie ma polskiego tekstu - czyli nic nie omija słowników,
//   5. żaden tekst nie jest dłuższy niż MAX_TEXT znaków (patrz LONG_TEXT_OK).
//
// Piąta reguła jest tu, a nie w `check-ui.mjs`, bo ten skan i tak czyta
// **wszystkie** katalogi w wszystkich językach - a właśnie w tekstach, nie
// w rozmiarach czcionki, robi się ściana słów. Porządki w tekstach są
// jednorazowe, jeśli ich nie przypilnujemy: wystarczy dołożyć 200-znakowe
// wyjaśnienie i ekran znów czyta się jak instrukcja. Tego nie złapie ani typ,
// ani test jednostkowy.
//
//   npm run check:i18n
//
// Używa wyrażeń regularnych, a nie parsera - świadomie. Komunikaty są zawsze
// literałami w `t("...")`, a drugą stronę (klucze używane dynamicznie, np.
// `t(column.label)`) pokrywa skan **wszystkich** literałów w źródłach, bo takie
// wartości też są w kodzie zdefiniowane jako stringi.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const LOCALES = join(SRC, "lib", "locales");

/**
 * Najdłuższy dozwolony tekst - próg dobrany **pomiarem, nie zgadywaniem**.
 *
 * Plan zakładał orientacyjnie 110 znaków i to było o wiele za mało: zmierzone
 * 17 września na wszystkich katalogach i we wszystkich językach, przy 110 wpada
 * 24 klucze, czyli 168 zdań do przepisania. Rozkład długości ma jednak wyraźnę
 * **przerwę**: ostrzeżenia i podpowiedzi kończą się na **232** znakach (najdłuższy
 * to włoska wersja ostrzeżenia o system promptcie), a akapity, które mają prawo
 * być długie, zaczynają się od **347** (wyjaśnienie pustej odpowiedzi).
 *
 * 240 leży w tej przerwie, więc próg nie jest arbitralny: oddziela ostrzeżenia
 * od akapitów i każde nowe 240-znakowe wyjaśnienie zatrzyma. Liczba mnoga
 * i odmiana sprawiają, że teksty romańskie są 10-20% dłuższe od angielskiego,
 * więc próg patrzy na **najdłuższą** wersję językową, nie na angielską.
 *
 * Liczby z tego pomiaru: najdłuższy tekst w aplikacji to `settings.prompts_hint`
 * (389 znaków po angielsku, **456 po niemiecku**) i to on, a nie angielski,
 * decyduje o tym, jak wygląda ekran.
 */
const MAX_TEXT = 240;

/**
 * Teksty, które mają prawo być długie. Powód jest **obowiązkowy** - jak przy
 * `font-ok` w `check-ui.mjs`, bo wyjątek bez uzasadnienia to ten sam problem,
 * tylko z adnotacją. Wyjątek dotyczy **klucza**, więc obejmuje wszystkie języki:
 * rozjazd w tłumaczeniu nie jest powodem, żeby jeden język miał inny próg.
 *
 * To teksty napisane wcześniej, nie nowe - skracamy je po jednym, przy okazji
 * innych prac, a nie hurtem, bo nikt nie oceni z zewnątrz, czy zdanie nadal
 * brzmi naturalnie w siedmiu językach.
 */
const LONG_TEXT_OK = new Map([
  ["settings.prompts_hint", "wyjaśnia, skąd bierze się domyślny prompt i czemu jest po angielsku - jedno miejsce, w którym to jest powiedziane"],
  ["categories.intro", "wprowadzenie do zakładki Kategorie - jeden akapit na całą zakładkę"],
  ["test.empty_response_explained", "wyjaśnia pustą odpowiedź modelu, czyli wynik, którego nie da się pokazać liczbą"],
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (path.replace(/\\/g, "/").endsWith("lib/locales")) continue;
      out.push(...walk(path));
    } else if (/\.(ts|tsx)$/.test(path)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Klucze słownika: klucz w cudzysłowie na początku linii (z dowolnym wcięciem).
 * Cudzysłów jest obowiązkowy - klucze mają kropki (`models.row.download`),
 * więc jako gołe identyfikatory nie byłyby poprawną składnią.
 */
function catalogKeys(source) {
  const keys = [];
  const re = /^\s*"((?:[^"\\]|\\.)*)":/gm;
  let match;
  while ((match = re.exec(source)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

/**
 * Klucz musi być neutralny: ASCII, małe litery, segmenty oddzielone kropką.
 * To właśnie ten warunek sprawia, że żaden tekst interfejsu (a więc i polski)
 * nie może wrócić do kodu jako klucz.
 */
const KEY_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;

/**
 * Wpisy słownika jako klucz -> wartość. Wartość może stać w następnej linii
 * (tak zapisujemy długie teksty), stąd skan po indeksach, a nie po liniach.
 */
function catalogEntries(source) {
  const out = new Map();
  const re = /^\s*"((?:[^"\\]|\\.)*)":[^\S\n]*\n?[^\S\n]*"((?:[^"\\]|\\.)*)"/gm;
  let match;
  while ((match = re.exec(source)) !== null) out.set(match[1], match[2]);
  return out;
}

/**
 * Symbole zastępcze w tekście (`{model}`, `{count}`). Tłumaczenie musi mieć
 * dokładnie ten sam ich zestaw - inaczej nazwa modelu albo liczba po cichu
 * zniknie z komunikatu, a klucz nadal będzie "przetłumaczony".
 */
function placeholders(text) {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
}

/**
 * Kody uwag z backendu: `pub const NOTE_X: &str = "code";` w `forecast.rs`.
 * Frontend tłumaczy je przez `t(note)`, więc skan literałów by ich nie zobaczył,
 * a rozjazd między Rustem i słownikiem byłby cichy.
 *
 * Tylko `NOTE_*`: `STATUS_*` frontend mapuje jawnymi warunkami (`=== "loaded"`),
 * więc te kody nie są kluczami tłumaczeń.
 */
function rustCodes(path) {
  const source = readFileSync(path, "utf8");
  const codes = [];
  const re = /pub const NOTE_\w+\s*:\s*&str\s*=\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    codes.push(match[1]);
  }
  return codes;
}

function stringLiterals(source) {
  const out = new Set();
  for (const re of [/"(?:[^"\\]|\\.)*"/g, /'(?:[^'\\]|\\.)*'/g, /`(?:[^`\\]|\\.)*`/g]) {
    for (const match of source.match(re) ?? []) {
      out.add(match.slice(1, -1));
    }
  }
  return out;
}

/** Klucze użyte jawnie w `t("...")`. */
function translateKeys(source) {
  const out = [];
  const re = /[^\w$.]t\(\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    out.push(match[1]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Backend (Rust)
//
// Komunikaty backendu mieszkaja w plikach jezykowych `messages_en.rs`
// i `messages_pl.rs` (kod -> tekst), a nie w en.ts, bo tekst bledu jest tez
// **zapisywany** w historii przebiegu i w eksporcie - wiec musi byc gotowym
// zdaniem, a nie kodem do przetlumaczenia w UI.
//
// Ten skan pilnuje trzech rzeczy: ze oba pliki maja dokladnie te same kody, ze
// kazdy kod uzyty w kodzie ma wpis w katalogu oraz ze w kodzie produkcyjnym nie
// zostal polski literat (czyli ze komunikat nie omija plikow jezykowych).

const RUST_DIR = join(ROOT, "src-tauri", "src");
/**
 * Pliki jezykowe backendu - jedyne, w ktorych wolno trzymac tekst w innym
 * jezyku niz angielski. Wykrywane po nazwie, zeby nowy jezyk nie wymagal
 * zmiany w tym skrypcie.
 */
const RUST_CATALOG_FILES = readdirSync(RUST_DIR)
  .filter((file) => /^messages_.+\.rs$/.test(file))
  .sort();

/** Pliki Rusta, w ktorych komunikaty moga trafic do uzytkownika. */
function rustFiles() {
  const out = [];
  for (const entry of readdirSync(RUST_DIR)) {
    if (entry.endsWith(".rs")) out.push(entry);
  }
  return out;
}

/** Kody z jednego pliku jezykowego: [(kod, tekst), ...]. */
function rustCatalog(source) {
  const start = source.indexOf("const CATALOG");
  const body = start < 0 ? "" : source.slice(start, source.indexOf("];", start));
  const entries = [];
  const re = /\(\s*"([^"]+)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,?\s*\)/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    entries.push({ code: match[1], text: match[2] });
  }
  return entries;
}

/** Kod produkcyjny bez modulu testow (testy moga miec polskie dane). */
function production(source) {
  const cut = source.indexOf("#[cfg(test)]");
  return cut < 0 ? source : source.slice(0, cut);
}

/**
 * Literaty, ktore wygladaja na komunikat dla uzytkownika po polsku. Kryterium
 * jest celowo waskie: polskie znaki albo konkretne slowa z komunikatow. Dzieki
 * temu identyfikatory (`"model"`, `"coding"`) i nazwy zdarzen nie zasmiecaja
 * wyniku, a prawdziwy polski tekst nie przejdzie.
 */
const POLISH_MARKERS =
  /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\b(Nie|Brak|Podaj|Zwróciła|Odpowiedziała|Odpowiada|Rejestr|Nieprawidłowy|Wybrano|Wybierz|Pobrano|Usunięto|Zapisano|Wczytano|Gotowe|Przerwano|Wstrzymano|Najpierw|Musisz|Ustawiono|Zmieniono|Ostrzeżenie|Błąd|Obraz|jest|zbyt|duży|najpierw|rozmiar\w*|znaleziono|zapisać|odczytać|wszystkich|język\w*)\b/;

/**
 * Literaly z Rusta. W odroznieniu od `stringLiterals` nie przechodza przez
 * koniec linii - inaczej komentarz miedzy dwoma stringami zlepialby je w jeden
 * "literal" i skan raportowalby polskie komentarze jako komunikaty.
 */
/**
 * Usuwa komentarze, nie ruszajac ich wewnatrz stringow (`//` w URL-u). Bez tego
 * polski komentarz w cudzyslowie bylby raportowany jako komunikat.
 */
function stripComments(source) {
  return source
    .split("\n")
    .map((line) => {
      let inString = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === "\\" && inString) {
          i += 1;
          continue;
        }
        if (char === '"') inString = !inString;
        else if (!inString && char === "/" && line[i + 1] === "/") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");
}

function rustLiterals(source) {
  const out = [];
  for (const re of [/"(?:[^"\\\n]|\\.)*"/g, /r#"(?:[^"\n])*"#/g]) {
    for (const match of source.match(re) ?? []) out.push(match.replace(/^r#"|"#$/g, "").slice(1, -1));
  }
  return out;
}

function polishLiterals(source) {
  const out = [];
  for (const literal of rustLiterals(stripComments(production(source)))) {
    if (literal.length < 3) continue;
    if (POLISH_MARKERS.test(literal)) out.push(literal);
  }
  return out;
}

/**
 * Zamienia komentarze na spacje, **nie ruszając ich w środku stringów** (`//`
 * w adresie URL zostaje).
 *
 * Robimy to przed skanem literałów, bo skan czyta źródło **wyrażeniem
 * regularnym, a nie parserem**: jeden prosty cudzysłów postawiony w komentarzu
 * (np. `(„pobrany")` w opisie przycisku) rozjeżdżał parowanie cudzysłowów
 * w całym pliku i skan przestawał widzieć klucze z tego pliku - a komunikat
 * mówił o nieużywanych tłumaczeniach, czyli o czymś zupełnie innym niż przyczyna.
 * Kosztuje to obsługę `/*` w stringu (w `src` takiego nie ma), a ratuje cały
 * skan przed komentarzem.
 */
function blankComments(source) {
  return stripComments(
    source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " ")),
  );
}

const files = walk(SRC);
const literals = new Set();
const used = new Map(); // klucz -> pliki

for (const file of files) {
  const source = blankComments(readFileSync(file, "utf8"));
  for (const literal of stringLiterals(source)) literals.add(literal);
  for (const key of translateKeys(source)) {
    const where = relative(ROOT, file).replace(/\\/g, "/");
    if (!used.has(key)) used.set(key, []);
    used.get(key).push(where);
  }
}

// Uwagi z `forecast.rs` trafiają do UI przez `t(note)`, więc dopisujemy je do
// zbioru użytych kluczy razem z informacją, skąd pochodzą.
const FORECAST = join(ROOT, "src-tauri", "src", "forecast.rs");
const rustNotes = existsSync(FORECAST) ? rustCodes(FORECAST) : [];
for (const code of rustNotes) {
  if (!used.has(code)) used.set(code, []);
  used.get(code).push("src-tauri/src/forecast.rs");
  literals.add(code);
}

// Wszystkie pliki językowe interfejsu, nie tylko polski: nowy język to nowy plik
// i ma być sprawdzony bez dotykania tego skryptu.
const LOCALE_FILES = readdirSync(LOCALES)
  .filter((file) => file.endsWith(".ts"))
  .sort();
if (!LOCALE_FILES.includes("en.ts")) {
  console.error("Brak `src/lib/locales/en.ts` - to język źródłowy, bez niego nie ma do czego porównywać.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Liczba mnoga
//
// Klucz z formą (`common.count_prompts.few`) należy do klucza podstawowego
// (`common.count_prompts`), a formę wybiera **język**, nie licznik w kodzie:
// polski potrzebuje trzech (`1 prompt`, `2 prompty`, `5 promptów`), angielski
// dwóch. W kodzie występuje więc tylko klucz podstawowy, a wymagany zestaw form
// liczymy regułami `Intl.PluralRules` dla języka - tymi samymi, których używa
// `src/lib/i18n.tsx`.
//
// Listę form i kody języków czytamy z `i18n.tsx`, żeby nie mieć drugiej prawdy.
const i18nSource = readFileSync(join(SRC, "lib", "i18n.tsx"), "utf8");
const PLURAL_FORMS = (i18nSource.match(/export const PLURAL_FORMS = \[([^\]]*)\]/) ?? ["", ""])[1]
  .split(",")
  .map((part) => part.trim().replace(/"/g, ""))
  .filter(Boolean);
const LOCALES_BLOCK = (i18nSource.match(/const LOCALES[^=]*=\s*\{([^}]*)\}/) ?? ["", ""])[1];
const LOCALE_OF = Object.fromEntries(
  [...LOCALES_BLOCK.matchAll(/([a-z]{2}):\s*"([^"]+)"/g)].map((match) => [match[1], match[2]]),
);

/**
 * Klucz podstawowy, gdy klucz jest formą liczby mnogiej; inaczej `null`.
 *
 * O tym, czy klucz jest liczbą mnogą, decyduje to, że w `en.ts` ma **więcej niż
 * jedną formę** - a nie samo zakończenie nazwy. Bez tego zwykły klucz kończący
 * się słowem z listy form byłby brany za liczbę mnogą: `vram.other` („poza
 * Ollamą”) jest jedynym takim kluczem pod `vram`, a `"vram"` występuje w kodzie
 * jako zwykły napis. Przy okazji literówka w nazwie formy (`..._prompts.feww`)
 * zachowuje się jak zwykły klucz, więc skaner ją pokaże, zamiast cicho pominąć.
 */
function pluralBase(key) {
  const cut = key.lastIndexOf(".");
  if (cut < 0) return null;
  const base = key.slice(0, cut);
  if (!PLURAL_FORMS.includes(key.slice(cut + 1))) return null;
  return pluralBases.has(base) ? base : null;
}

/** Formy liczby mnogiej danego klucza podstawowego w danym pliku. */
function pluralForms(keys, base) {
  return keys
    .filter((key) => pluralBase(key) === base)
    .map((key) => key.slice(base.length + 1))
    .sort();
}

// Nazwa nie może kolidować z katalogami backendu niżej (`catalogs`).
const interfaceCatalogs = new Map(
  LOCALE_FILES.map((file) => [file, catalogKeys(readFileSync(join(LOCALES, file), "utf8"))]),
);
const enKeys = interfaceCatalogs.get("en.ts");
const enSet = new Set(enKeys);

// W `en.ts` formy danego klucza stoją razem, więc wystarczy zgrupować klucze po
// nazwie bez ostatniego segmentu i zostawić te, które mają co najmniej dwie.
const formCount = new Map();
for (const key of enKeys) {
  const cut = key.lastIndexOf(".");
  if (cut < 0 || !PLURAL_FORMS.includes(key.slice(cut + 1))) continue;
  const base = key.slice(0, cut);
  formCount.set(base, (formCount.get(base) ?? 0) + 1);
}
const pluralBases = new Set(
  [...formCount].filter(([, count]) => count > 1).map(([base]) => base),
);

// Klucze podstawowe: formy liczby mnogiej mają **własne**, zależne od języka
// zestawy, więc porównanie "ten sam zestaw kluczy w każdym pliku" ich nie dotyczy.
const enBaseKeys = enKeys.filter((key) => pluralBase(key) === null);

const duplicates = enKeys.filter((key, index) => enKeys.indexOf(key) !== index);
const invalidKeys = [...new Set([...interfaceCatalogs.values()].flat())].filter(
  (key) => !KEY_PATTERN.test(key),
);

// Ten sam zestaw kluczy podstawowych w każdym pliku, w obie strony.
const keyMismatch = [];
for (const [file, keys] of interfaceCatalogs) {
  if (file === "en.ts") continue;
  const own = keys.filter((key) => pluralBase(key) === null);
  const set = new Set(own);
  for (const key of enBaseKeys) {
    if (!set.has(key)) keyMismatch.push(`${file}: brak ${JSON.stringify(key)}`);
  }
  for (const key of own) {
    if (!enSet.has(key)) keyMismatch.push(`en.ts: brak ${JSON.stringify(key)} (jest w ${file})`);
  }
  const ownDuplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  for (const key of new Set(ownDuplicates)) {
    duplicates.push(`${file}: ${JSON.stringify(key)}`);
  }
}

// Każdy język ma dokładnie te formy liczby mnogiej, których mogą użyć jego
// reguły. Brak formy to zdanie po cichu po angielsku albo sam klucz w interfejsie,
// a forma nadmiarowa (np. `few` po angielsku) to tekst, który nigdy się nie pokaże.
const pluralMismatch = [];
for (const [file, keys] of interfaceCatalogs) {
  const language = file.replace(/\.ts$/, "");
  const locale = LOCALE_OF[language] ?? language;
  const required = [...new Intl.PluralRules(locale).resolvedOptions().pluralCategories].sort();
  for (const base of pluralBases) {
    const present = pluralForms(keys, base);
    if (present.join(",") !== required.join(",")) {
      pluralMismatch.push(
        `${file}: ${JSON.stringify(base)} - dla ${locale} wymagane: ${required.join(", ") || "(brak)"}, jest: ${present.join(", ") || "(brak)"}`,
      );
    }
    if (keys.includes(base)) {
      pluralMismatch.push(
        `${file}: ${JSON.stringify(base)} ma formę podstawową **i** formy liczby mnogiej - forma podstawowa nigdy się nie pokaże`,
      );
    }
  }
}

// Ten sam zestaw symboli zastępczych w każdym języku.
const interfaceEntries = new Map(
  LOCALE_FILES.map((file) => [file, catalogEntries(readFileSync(join(LOCALES, file), "utf8"))]),
);
const enEntries = interfaceEntries.get("en.ts");
const placeholderMismatch = [];
for (const [file, entries] of interfaceEntries) {
  if (file === "en.ts") continue;
  for (const [key, value] of entries) {
    if (pluralBase(key)) continue;
    const expected = placeholders(enEntries.get(key) ?? "").join(", ");
    const actual = placeholders(value).join(", ");
    if (expected !== actual) {
      placeholderMismatch.push(
        `${file}: ${JSON.stringify(key)} - en: ${expected || "(brak)"}, ${file}: ${actual || "(brak)"}`,
      );
    }
  }
}

// Formy liczby mnogiej jednego klucza muszą mieć te same symbole zastępcze -
// inaczej forma zniknie z komunikatu tylko w niektórych językach albo liczbach.
const pluralSignature = new Map();
for (const [file, entries] of interfaceEntries) {
  for (const [key, value] of entries) {
    const base = pluralBase(key);
    if (!base) continue;
    if (!pluralSignature.has(base)) pluralSignature.set(base, new Map());
    const bySignature = pluralSignature.get(base);
    const signature = placeholders(value).join(", ");
    if (!bySignature.has(signature)) bySignature.set(signature, []);
    bySignature.get(signature).push(`${file}:${key}`);
  }
}
for (const [base, bySignature] of pluralSignature) {
  if (bySignature.size < 2) continue;
  placeholderMismatch.push(
    `${JSON.stringify(base)} - formy liczby mnogiej mają różne symbole:\n      ${[...bySignature]
      .map(([signature, where]) => `${signature || "(brak)"}  ← ${where.join(", ")}`)
      .join("\n      ")}`,
  );
}

// Klucz z liczbą mnogą nie ma w słowniku formy podstawowej - on sam jest
// reprezentowany przez formy, więc nie jest to brak tłumaczenia.
const missing = [...used.keys()].filter(
  (key) => !enSet.has(key) && !pluralBases.has(key),
);
// Forma liczby mnogiej nie występuje w kodzie jako literał - w kodzie jest klucz
// podstawowy. Bez tego każda forma byłaby raportowana jako "bez użycia".
const unused = enKeys.filter((key) => {
  const base = pluralBase(key);
  return base ? !literals.has(base) : !literals.has(key);
});

// Polski tekst w komponentach: to komunikat, który omija słowniki i pokaże się
// w tej samej postaci w obu językach. Wyjątkiem są dane, które już są zapisane
// w historii starszych przebiegów (`LEGACY_DATA_LITERALS` w `lib/types.ts`).
const LEGACY_DATA_LITERALS = new Set([
  "Wykonał",
  "Odmówił",
  "Wykonał ale ograniczył/zmienił",
]);
const frontendPolish = [];
for (const file of files) {
  const source = blankComments(readFileSync(file, "utf8"));
  for (const literal of stringLiterals(source)) {
    if (literal.length < 3) continue;
    if (LEGACY_DATA_LITERALS.has(literal)) continue;
    if (POLISH_MARKERS.test(literal)) {
      frontendPolish.push({ file: relative(ROOT, file).replace(/\\/g, "/"), literal });
    }
  }
}

// Katalogi komunikatow backendu i ich uzycie.
const languageFiles = RUST_CATALOG_FILES.filter((file) => existsSync(join(RUST_DIR, file)));
const catalogs = new Map(
  languageFiles.map((file) => [file, rustCatalog(readFileSync(join(RUST_DIR, file), "utf8"))]),
);
const catalogCodes = new Map(
  [...catalogs].map(([file, entries]) => [file, new Set(entries.map((entry) => entry.code))]),
);

// Kod uzyty = literal rownajacy sie kodowi. Sprawdzamy literaty, a nie samo
// `msg("...")`, bo kod potrafi trafic do komunikatu takze z `match`
// (`localized_label` w export.rs) - i wtedy tez musi istniec.
const rustUsed = new Map();
const rustPolish = [];

for (const file of rustFiles()) {
  const source = readFileSync(join(RUST_DIR, file), "utf8");
  const isLanguageFile = RUST_CATALOG_FILES.includes(file);
  for (const literal of rustLiterals(stripComments(production(source)))) {
    for (const codes of catalogCodes.values()) {
      if (!codes.has(literal)) continue;
      if (!rustUsed.has(literal)) rustUsed.set(literal, []);
      if (!rustUsed.get(literal).includes(file)) rustUsed.get(literal).push(file);
    }
  }
  // Pliki jezykowe maja prawo zawierac polski - to ich zadanie.
  if (!isLanguageFile) {
    for (const literal of polishLiterals(source)) rustPolish.push({ file, literal });
  }
}

// Ten sam zestaw kodow po obu stronach.
const [firstFile, ...restFiles] = languageFiles;
const codesMissing = [];
for (const file of restFiles) {
  for (const code of catalogCodes.get(firstFile)) {
    if (!catalogCodes.get(file).has(code)) codesMissing.push(`${file}: brak ${JSON.stringify(code)}`);
  }
  for (const code of catalogCodes.get(file)) {
    if (!catalogCodes.get(firstFile).has(code)) codesMissing.push(`${firstFile}: brak ${JSON.stringify(code)}`);
  }
}

const everyCode = new Set([...catalogCodes.values()].flatMap((codes) => [...codes]));
const rustMissing = [...rustUsed.keys()].filter((code) => !everyCode.has(code));
const rustUnused = [...everyCode].filter((code) => !rustUsed.has(code));

// ---------------------------------------------------------------------------
// Jedna lista języków w czterech miejscach
//
// Język do wyboru w UI to: etykieta (`LANGUAGES` w i18n.tsx), typ (`Language`
// w types.ts), plik interfejsu (`locales/<kod>.ts`), plik komunikatów backendu
// (`messages_<kod>.rs`) i whitelist w `settings.rs` (bez niej `settings.json`
// cofa wybór do angielskiego - ten błąd raz już wystąpił).
//
// Rozjazd jest cichy: użytkownik wybiera język i po restarcie widzi angielski,
// albo dostaje komunikat backendu w innym języku niż interfejs. Dlatego pilnuje
// tego skan, a nie pamięć.
const languagesFromLabels = [
  ...readFileSync(join(SRC, "lib", "i18n.tsx"), "utf8").matchAll(/\{\s*id:\s*"([a-z]{2})"\s*,\s*label:/g),
].map((match) => match[1]);
const languagesFromType = (
  readFileSync(join(SRC, "lib", "types.ts"), "utf8").match(/export type Language =([^;]+);/) ?? ["", ""]
)[1]
  .split("|")
  .map((part) => part.trim().replace(/"/g, ""))
  .filter(Boolean);
const languagesFromLocales = LOCALE_FILES.map((file) => file.replace(/\.ts$/, ""));
const languagesFromRust = RUST_CATALOG_FILES.map((file) =>
  file.replace(/^messages_/, "").replace(/\.rs$/, ""),
);
const languagesFromSettings = (
  readFileSync(join(RUST_DIR, "settings.rs"), "utf8").match(
    /const LANGUAGES:[^=]*=\s*\[([^\]]*)\]/,
  ) ?? ["", ""]
)[1]
  .split(",")
  .map((part) => part.trim().replace(/"/g, ""))
  .filter(Boolean);

const LANGUAGE_SOURCES = [
  ["src/lib/i18n.tsx (LANGUAGES)", languagesFromLabels],
  ["src/lib/types.ts (Language)", languagesFromType],
  ["src/lib/locales/*.ts", languagesFromLocales],
  ["src-tauri/src/messages_*.rs", languagesFromRust],
  ["src-tauri/src/settings.rs (LANGUAGES)", languagesFromSettings],
];
const languageMismatch = [];
for (const [where, codes] of LANGUAGE_SOURCES) {
  if (!codes.length) {
    languageMismatch.push(`${where}: nie udało się odnaleźć listy języków`);
    continue;
  }
  for (const code of languagesFromLabels) {
    if (!codes.includes(code)) languageMismatch.push(`${where}: brak ${JSON.stringify(code)}`);
  }
  for (const code of codes) {
    if (!languagesFromLabels.includes(code)) {
      languageMismatch.push(`${where}: ${JSON.stringify(code)} nie jest w LANGUAGES w i18n.tsx`);
    }
  }
}

/**
 * Najdłuższa wersja każdego wpisu: jedna poprawka na klucz, a nie siedem (jedna
 * na język). To także jedyne miejsce, w którym widać, jak długi jest tekst
 * w najgorszym języku - a to on decyduje o układzie ekranu.
 */
const longestText = new Map();
for (const [file, entries] of interfaceEntries) {
  for (const [key, value] of entries) {
    const current = longestText.get(key);
    if (!current || value.length > current.length) {
      longestText.set(key, { file, key, length: value.length });
    }
  }
}
for (const [file, entries] of catalogs) {
  for (const { code, text } of entries) {
    const current = longestText.get(code);
    if (!current || text.length > current.length) {
      longestText.set(code, { file, key: code, length: text.length });
    }
  }
}

const tooLong = [...longestText.values()]
  .filter((entry) => entry.length > MAX_TEXT && !LONG_TEXT_OK.has(entry.key))
  .sort((a, b) => b.length - a.length)
  .map((entry) => `${entry.file}: ${JSON.stringify(entry.key)} - ${entry.length} znaków`);

const longestTextEntry = [...longestText.values()].reduce(
  (longest, entry) => (entry.length > longest.length ? entry : longest),
  { file: "", key: "(brak)", length: 0 },
);

const problems = [];
if (languageMismatch.length) {
  problems.push(
    `Lista języków nie zgadza się między plikami (język do wyboru bez pliku komunikatów albo bez wpisu w settings.rs nie zadziała):\n  ${languageMismatch.join("\n  ")}`,
  );
}
if (codesMissing.length) {
  problems.push(`Kody nie zgadzaja sie miedzy plikami jezykowymi:\n  ${codesMissing.join("\n  ")}`);
}
if (rustMissing.length) {
  problems.push(
    `Kod komunikatu uzyty w Rust bez wpisu w plikach jezykowych:\n  ${rustMissing
      .map((code) => `${JSON.stringify(code)}  ← ${rustUsed.get(code).join(", ")}`)
      .join("\n  ")}`,
  );
}
if (rustUnused.length) {
  problems.push(
    `Kody w plikach jezykowych bez uzycia:\n  ${rustUnused.map((c) => JSON.stringify(c)).join("\n  ")}`,
  );
}
if (rustPolish.length) {
  problems.push(
    `Polski komunikat w kodzie produkcyjnym Rusta (musi isc przez messages::msg):\n  ${rustPolish
      .map((entry) => `${entry.file}: ${JSON.stringify(entry.literal)}`)
      .join("\n  ")}`,
  );
}
if (duplicates.length) {
  problems.push(`Zduplikowane klucze w en.ts:\n  ${[...new Set(duplicates)].join("\n  ")}`);
}
if (invalidKeys.length) {
  problems.push(
    `Klucz nie jest neutralny (ASCII, małe litery, segmenty po kropce):\n  ${invalidKeys
      .map((key) => JSON.stringify(key))
      .join("\n  ")}`,
  );
}
if (keyMismatch.length) {
  problems.push(`Klucze nie zgadzają się między plikami językowymi:\n  ${keyMismatch.join("\n  ")}`);
}
if (pluralMismatch.length) {
  problems.push(
    `Formy liczby mnogiej nie zgadzają się z regułami języka (Intl.PluralRules):\n  ${pluralMismatch.join("\n  ")}`,
  );
}
if (placeholderMismatch.length) {
  problems.push(
    `Symbole zastępcze nie zgadzają się z en.ts:\n  ${placeholderMismatch.join("\n  ")}`,
  );
}
if (missing.length) {
  problems.push(
    `Klucz użyty w komponencie, którego nie ma w słowniku:\n  ${missing
      .map((key) => `${JSON.stringify(key)}  ← ${used.get(key).join(", ")}`)
      .join("\n  ")}`,
  );
}
if (unused.length) {
  problems.push(
    `Klucze w słowniku bez odpowiednika w kodzie:\n  ${unused.map((key) => JSON.stringify(key)).join("\n  ")}`,
  );
}
if (frontendPolish.length) {
  problems.push(
    `Polski tekst w komponencie (musi iść przez słownik, klucz typu \`models.row.download\`):\n  ${frontendPolish
      .map((entry) => `${entry.file}: ${JSON.stringify(entry.literal)}`)
      .join("\n  ")}`,
  );
}
if (tooLong.length) {
  problems.push(
    `Tekst dłuższy niż ${MAX_TEXT} znaków - skróć go albo dopisz klucz do LONG_TEXT_OK z powodem:\n  ${tooLong.join("\n  ")}`,
  );
}

console.log(
  `Języki:   ${languagesFromLabels.length} (${languagesFromLabels.join(", ")}) - sprawdzone w UI, typie, plikach interfejsu, komunikatach backendu i settings.rs`,
);
console.log(
  `Frontend: ${files.length} plików · ${used.size} komunikatów (w tym ${rustNotes.length} kodów z forecast.rs) · ${enKeys.length} kluczy w ${LOCALE_FILES.join(" + ")}`,
);
console.log(
  `Backend:  ${everyCode.size} komunikatów w ${languageFiles.join(" + ")} · ${rustUsed.size} użytych kodów`,
);
console.log(
  `Teksty:   ${longestText.size} wpisów · najdłuższy ${longestTextEntry.length} znaków (${longestTextEntry.key}) · próg ${MAX_TEXT} · świadomych wyjątków: ${LONG_TEXT_OK.size}`,
);

if (problems.length) {
  console.error(`\n${problems.join("\n\n")}\n`);
  process.exit(1);
}

console.log("Tłumaczenia kompletne.");
