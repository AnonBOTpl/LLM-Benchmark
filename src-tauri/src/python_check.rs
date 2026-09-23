//! Ocena odpowiedzi kategorii „Kodowanie": czy da się tu w ogóle mówić o składni.
//!
//! Czego ten moduł **nie** twierdzi: że kod jest poprawny, że coś robi, albo że
//! robi to, o co proszono. Znacznik odpowiada wyłącznie na pytanie „czy to się
//! parsuje jako Python" - i tak samo jest nazwany w interfejsie. Funkcja
//! z idealną składnią, która zwraca bzdury, dostanie ✓ i to jest w porządku,
//! dopóki nazwa tego nie ukrywa.
//!
//! Dlaczego akurat Python, a nie „dowolny kod": parser jest jeden, więc
//! sprawdzamy jeden język i mówimy o tym wprost. Odpowiedź w SQL-u albo w
//! JavaScripcie nie dostaje ani ✓, ani ✗ - dostaje stan „nie ma tu Pythona"
//! (`NO_CODE`), bo wystawienie ✗ za coś, czego nie sprawdzaliśmy, byłoby
//! kłamstwem w drugą stronę.
//!
//! ## Wybór parsera: zmierzony, nie „ładniejszy w kodzie"
//!
//! Sprawdzone na ośmiu odpowiedziach, które wyglądają jak prawdziwe (dwa
//! parsery, ten sam zestaw):
//!
//! | odpowiedź | tree-sitter | rustpython |
//! |---|---|---|
//! | poprawna funkcja | ✓ | ✓ |
//! | **brak wcięcia po dwukropku** | **✓ (przepuszcza)** | **✗ (łapie)** |
//! | niedomknięty nawias | ✗ | ✗ |
//! | urwany operator na końcu | ✗ | ✗ |
//! | `match`/`case` (3.10) | ✓ | ✓ |
//! | typy w nawiasach kwadratowych (3.12) | ✓ | ✓ |
//! | f-string z zagnieżdżonymi cudzysłowami (3.12) | ✓ | ✓ |
//!
//! Tree-sitter jest **odporny** z założenia: brak wcięcia po dwukropku składa
//! w dwie osobne instrukcje i uznaje całość za poprawną. A brak wcięcia to
//! najczęstszy błąd małych modeli, czyli dokładnie ten, dla którego znacznik
//! ma sens. `rustpython-parser` jest **ścisły** jak interpreter (wcięcia pilnuje
//! tokenizer) i rozumie nowszą składnię, więc wybieramy jego - a nie ten,
//! który rzadziej mówi „nie".
//!
//! ## Reguły
//!
//! 1. Bierzemy **pierwszy** blok kodu z ogrodzenia. Bez etykiety języka też
//!    jest dobry (modele często piszą samo ```` ``` ````).
//! 2. Jeśli ogrodzenie nazywa inny język (`sql`, `bash`, `javascript`…),
//!    kończymy na `NO_CODE` - tego nie sprawdzamy i nie udajemy, że sprawdzamy.
//! 3. Bez żadnego ogrodzenia próbujemy całą odpowiedź: jeśli parsuje się jak
//!    Python, to jest kod. Jeśli nie - **nie zgadujemy**, czy to proza, czy
//!    połamany kod, i mówimy „nie ma tu Pythona".
//! 4. Proza **wokół** bloku kodu nie psuje wyniku. W kategorii JSON proza
//!    oznacza porażkę, bo tam mierzymy trzymanie się formatu; tutaj znacznik
//!    nie twierdzi nic o formacie odpowiedzi, więc nie ma czego karać.
//!
//! Znacznik jest **dodatkową informacją obok pomiaru**, nigdy zamiast niego:
//! tokeny na sekundę i TTFT liczą się normalnie także dla kodu, który się nie
//! parsuje.

use rustpython_parser::{parse, Mode};

/// Kod parsuje się jako Python.
pub const OK: &str = "ok";
/// Kod się nie parsuje - to jest właśnie błąd składni.
pub const SYNTAX_ERROR: &str = "syntax_error";
/// Nie ma czego sprawdzać: proza, inny język, puste ogrodzenie.
pub const NO_CODE: &str = "no_code";

/// Werdykt dla odpowiedzi modelu. Zwraca **kod**, nie zdanie: interfejs mówi
/// w siedmiu językach, a backend nie wie, w którym.
pub fn check(response: &str) -> &'static str {
    match crate::code_fence::first_fenced_block(response) {
        Some((language, body)) => {
            if !is_python_label(language) {
                return NO_CODE;
            }
            verdict(body)
        }
        // Bez ogrodzenia cała odpowiedź jest kandydatem, ale tylko wtedy, gdy
        // faktycznie parsuje - inaczej nie odróżnimy prozy od połamanego kodu.
        None => {
            let text = response.trim();
            if text.is_empty() {
                NO_CODE
            } else if parses(text) {
                OK
            } else {
                NO_CODE
            }
        }
    }
}

fn verdict(body: &str) -> &'static str {
    let code = body.trim();
    if code.is_empty() {
        return NO_CODE;
    }
    if parses(code) {
        OK
    } else {
        SYNTAX_ERROR
    }
}

/// Czy etykieta ogrodzenia mówi „Python". Brak etykiety też jest w porządku:
/// ```` ``` ```` to najczęstszy sposób, w jaki modele zamykają kod.
fn is_python_label(language: Option<&str>) -> bool {
    let Some(label) = language else {
        return true;
    };
    let label = label.trim().to_ascii_lowercase();
    label == "py" || label == "py3" || label.starts_with("python")
}

/// Czy tekst parsuje się jako Python.
///
/// Ścieżka źródła jest nazwana `<answer>`, bo parser wplata ją w komunikat
/// błędu - a ten komunikat nigdzie nie trafia, więc nie może sugerować, że
/// chodzi o plik użytkownika.
fn parses(code: &str) -> bool {
    parse(code, Mode::Module, "<answer>").is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fenced_python_is_checked() {
        assert_eq!(check("```python\ndef add(a, b):\n    return a + b\n```"), OK);
        assert_eq!(check("```py\nx = 1\n```"), OK);
        assert_eq!(check("```\nprint('hi')\n```"), OK);
    }

    #[test]
    fn syntax_errors_are_caught() {
        // Brak nawiasu zamykającego.
        assert_eq!(check("```python\ndef add(a, b:\n    return a + b\n```"), SYNTAX_ERROR);
        // Brak wcięcia po dwukropku - najczęstszy błąd małych modeli.
        assert_eq!(check("```python\ndef f():\nprint(1)\n```"), SYNTAX_ERROR);
        // Ucięta odpowiedź: kod niedokończony to też błąd składni.
        assert_eq!(check("```python\ndef f(x):\n    return x +\n```"), SYNTAX_ERROR);
        // Niedomknięty cudzysłów.
        assert_eq!(check("```python\ns = 'abc\n```"), SYNTAX_ERROR);
    }

    /// Nowa składnia nie może dawać fałszywego ✗ - inaczej znacznik karze
    /// model za to, że pisze nowocześnie.
    #[test]
    fn modern_syntax_is_not_punished() {
        assert_eq!(
            check("```python\nmatch value:\n    case 1:\n        print('jeden')\n```"),
            OK
        );
        assert_eq!(check("```python\ndef f[T](x: T) -> T:\n    return x\n```"), OK);
        assert_eq!(check("```python\nprint(f\"{'x'!r:>10}\")\n```"), OK);
        assert_eq!(check("```python\nasync def main():\n    await task()\n```"), OK);
    }

    /// Odpowiedź w innym języku nie dostaje ani ✓, ani ✗ - nie sprawdzamy jej
    /// i nie udajemy, że sprawdziliśmy.
    #[test]
    fn other_languages_are_not_judged() {
        assert_eq!(check("```sql\nSELECT name FROM users;\n```"), NO_CODE);
        assert_eq!(check("```javascript\nconst a = 1;\n```"), NO_CODE);
        assert_eq!(check("```bash\nls -la\n```"), NO_CODE);
    }

    #[test]
    fn prose_around_code_does_not_spoil_the_verdict() {
        assert_eq!(
            check("Oto funkcja:\n```python\ndef f(x):\n    return x * 2\n```\nMam nadzieję, że pasuje."),
            OK
        );
    }

    #[test]
    fn prose_without_code_has_nothing_to_check() {
        assert_eq!(check("Nie mogę tego zrobić."), NO_CODE);
        assert_eq!(check(""), NO_CODE);
        assert_eq!(check("   \n  "), NO_CODE);
        assert_eq!(check("```python\n```"), NO_CODE);
    }

    /// Kod bez ogrodzenia, ale parsujący się, liczy się jako kod.
    #[test]
    fn bare_code_counts_when_it_parses() {
        assert_eq!(check("import os\nprint(os.getcwd())"), OK);
        assert_eq!(check("def f():\n    return 1"), OK);
    }

    /// Pułapka tej reguły, zapisana świadomie: jedno słowo bez ogrodzenia,
    /// które przypadkiem jest poprawnym wyrażeniem Pythona, wyjdzie jako ✓.
    /// Przy system prompcie proszącym o blok kodu to nie jest realny
    /// przypadek, a każda inna reguła wymagałaby zgadywania „czy to proza".
    #[test]
    fn a_bare_word_that_parses_is_treated_as_code() {
        assert_eq!(check("hello"), OK);
    }

    #[test]
    fn unclosed_fence_still_gets_checked() {
        // Model urwał odpowiedź w połowie bloku - treść nadal jest kodem.
        assert_eq!(check("```python\nx = 1"), OK);
    }

    /// Tylko pierwszy blok się liczy: odpowiedź z SQL-em i potem Pythonem
    /// jest oceniana po tym, co przyszło pierwsze.
    #[test]
    fn only_the_first_block_is_judged() {
        assert_eq!(check("```sql\nSELECT 1;\n```\n```python\nx = 1\n```"), NO_CODE);
    }
}
