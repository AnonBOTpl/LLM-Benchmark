#!/usr/bin/env node
// Pilnuje reguł wyglądu, których nie złapie ani typy, ani testy jednostkowe.
//
// **Reguła pierwsza: żaden tekst w interfejsie nie ma mniej niż 12 px.**
//
// Skąd ta liczba: zmierzone w aplikacji było **6 958 znaków widocznego tekstu,
// z czego 6 337 (91%) miało ≤ 12 px** - etykiety, liczby, wyjaśnienia i
// ostrzeżenia tym samym rozmiarem i kolorem, więc oko nie miało się czego
// złapać i czytało ekran jak jeden szum. Trzy poziomy (liczba 15-22 px,
// etykieta 13 px, podpowiedź 12 px) to naprawa tego, ale jednorazowa: bez
// pilnowania w skanie 10 i 11 px wrócą przy pierwszej nowej tabeli.
//
//   npm run check:ui
//
// **Reguła druga: rozmiar jest pełną liczbą pikseli.** Skala ma trzy poziomy
// (12 etykieta i podpowiedź, 13 treść, 16 nagłówek), a `12.5 px` to czwarty
// poziom, który nic nie znaczy i wraca przy okazji każdej nowej tabeli.
//
// Świadome odstępstwo: linia z komentarzem `font-ok: <powód>` jest pomijana.
// Powód jest obowiązkowy, bo wyjątek bez uzasadnienia to ten sam problem,
// tylko z adnotacją.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

/** Najmniejszy dozwolony rozmiar tekstu w interfejsie. */
const MIN_PX = 12;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx|css)$/.test(path)) out.push(path);
  }
  return out;
}

/** Znacznik odstępstwa, z obowiązkowym powodem. */
const ALLOW = /font-ok:\s*\S/;

/**
 * Rozmiary tekstu w Tailwindzie: `text-[11px]`, `text-[0.7rem]` pomijamy, bo
 * nie używamy rem do tekstu - a gdyby ktoś zaczął, reguła go nie zobaczy, więc
 * trafia to do listy rzeczy do dopisania razem z pierwszą taką zmianą.
 */
const PX_CLASS = /text-\[(\d+(?:\.\d+)?)px\]/g;

/** Rozmiar wpisany w stylu: `fontSize: 11`. */
const INLINE_STYLE = /fontSize:\s*(\d+(?:\.\d+)?)\b/g;

const problems = [];
let checked = 0;

for (const file of walk(SRC)) {
  const where = relative(ROOT, file).replace(/\\/g, "/");
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (ALLOW.test(line)) return;
      for (const re of [PX_CLASS, INLINE_STYLE]) {
        re.lastIndex = 0;
        let match;
        while ((match = re.exec(line)) !== null) {
          checked += 1;
          const size = Number(match[1]);
          if (size < MIN_PX) {
            problems.push(
              `${where}:${index + 1}  ${match[0]}  (${size} px < ${MIN_PX} px - podnieś do 12 albo 13)`,
            );
          } else if (size % 1 !== 0) {
            problems.push(
              `${where}:${index + 1}  ${match[0]}  (rozmiar połówkowy - użyj 12, 13 albo 16)`,
            );
          }
        }
      }
    });
}

console.log(`Reguła wyglądu: sprawdzono ${checked} rozmiarów tekstu w src (minimum ${MIN_PX} px).`);

if (!problems.length) {
  console.log("Żaden tekst nie jest mniejszy niż 12 px.");
  process.exit(0);
}

console.error(
  `\nRozmiar tekstu do poprawy (podnieś go albo dodaj komentarz \`font-ok: powód\`):\n  ${problems.join(
    "\n  ",
  )}\n`,
);
process.exit(1);
