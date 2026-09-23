//! Ocena odpowiedzi kategorii „Structured output (JSON)”.
//!
//! Kategoria mierzy **surową umiejętność modelu**, nie maszynerię Ollamy:
//! nie ustawiamy parametru `format` (który kazałby Ollamie wygenerować JSON po
//! swojemu), a „zwróć tylko JSON” stoi w system prompcie. Ten moduł tylko
//! sprawdza, co model faktycznie zwrócił - i jest to **dodatkowa informacja
//! obok pomiaru**, nigdy zamiast niego: tokeny na sekundę i TTFT liczą się
//! normalnie, także dla odpowiedzi, która JSON-em nie jest.

use serde_json::Value;

/// Czy odpowiedź jest poprawnym JSON-em.
///
/// Reguła jest celowo prosta i przewidywalna:
/// 1. zdejmij ogrodzenie z markdowna (` ```json `), bo modele doklejają je
///    mimo wyraźnej instrukcji - to nadal ta sama odpowiedź,
/// 2. reszta musi się sparsować jako JSON.
///
/// Czego reguła **nie** robi: nie wybacza prozy wokół (`Oto JSON: {...}` to
/// niepoprawna odpowiedź - model nie wykonał instrukcji), nie sprawdza
/// wymaganych pól (o to pyta prompt użytkownika, a nie ten moduł) i nie liczy
/// osobno obiektu i tablicy - `5` też jest poprawnym JSON-em. Trzymamy jedną
/// definicję, żeby wynik był porównywalny między przebiegami.
pub fn is_valid_json(response: &str) -> bool {
    // Zdejmowanie ogrodzenia jest wspólne z walidatorem Pythona - patrz
    // `code_fence`: dwa znaczniki w jednej tabeli muszą czytać odpowiedź
    // tak samo, żeby różniły się tylko tym, co sprawdzają.
    let text = crate::code_fence::strip_whole_fence(response);
    if text.is_empty() {
        return false;
    }
    serde_json::from_str::<Value>(text).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Ogrodzenie zdejmuje `code_fence`, ale samo sprawdzenie musi działać
    /// dalej: ten test pilnuje, że przeniesienie kodu nie zmieniło wyniku.
    #[test]
    fn fence_handling_still_reaches_the_payload() {
        assert!(is_valid_json("```json\n{\"a\": 1}\n```"));
        assert!(is_valid_json("```json\n{\"code\": \"```py\"}\n```"));
        assert!(!is_valid_json("```json\n{\"a\": 1,}\n```"));
    }

    #[test]
    fn plain_json_is_valid() {
        assert!(is_valid_json("{\"a\": 1}"));
        assert!(is_valid_json("  {\"a\": [1, 2, 3]}  "));
        assert!(is_valid_json("[1, 2]"));
        assert!(is_valid_json("{\"nested\": {\"ok\": true}}"));
    }

    #[test]
    fn fenced_json_is_valid() {
        assert!(is_valid_json("```json\n{\"a\": 1}\n```"));
        assert!(is_valid_json("```JSON\n{\"a\": 1}\n```"));
        assert!(is_valid_json("```\n{\"a\": 1}\n```"));
    }

    #[test]
    fn prose_around_json_is_not_valid() {
        // Model nie wykonał instrukcji „bez prozy”, więc odpowiedź jest
        // niepoprawna - i tak ma być widoczne w wynikach.
        assert!(!is_valid_json("Oto JSON:\n{\"a\": 1}"));
        assert!(!is_valid_json("{\"a\": 1}\nMam nadzieję, że pomogłem!"));
    }

    #[test]
    fn broken_and_empty_answers_are_not_valid() {
        assert!(!is_valid_json(""));
        assert!(!is_valid_json("   \n  "));
        assert!(!is_valid_json("{\"a\": 1,}"));
        assert!(!is_valid_json("{\"a\": 1"));
        assert!(!is_valid_json("Nie mogę tego zrobić."));
        // Samotne ogrodzenie bez treści też nie jest JSON-em.
        assert!(!is_valid_json("```json\n```"));
    }

    #[test]
    fn fences_inside_the_payload_survive() {
        // Trzy daszki w środku stringa nie mogą uciąć odpowiedzi.
        assert!(is_valid_json("```json\n{\"code\": \"```py\"}\n```"));
    }
}
