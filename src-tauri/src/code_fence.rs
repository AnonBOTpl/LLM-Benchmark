//! Ogrodzenia z markdowna: wyciąganie kodu z odpowiedzi modelu.
//!
//! Po co osobny moduł: robią to **dwa** znaczniki (JSON i składnia Pythona),
//! a różnica między nimi jest w tym, co z treścią robią dalej - nie w tym,
//! jak ją wyciągają. Dwie kopie tego samego kodu rozjechałyby się przy
//! pierwszej poprawce, a wtedy dwa znaczniki w tej samej tabeli znaczyłyby
//! co innego, mimo że użytkownik czyta je tak samo.
//!
//! Wspólna jest też jedna pułapka: odpowiedź **cała** w ogrodzeniu to nadal
//! ta sama odpowiedź (modele doklejają ``` mimo wyraźnej instrukcji), ale
//! trzy daszki bywają też **w środku** treści - więc zdejmujemy dokładnie
//! jeden płot z początku i jeden z końca, nigdy wszystkich wystąpień.

/// Zdejmuje ogrodzenie, jeśli odpowiedź składa się z niego w całości.
///
/// Zwraca wejście bez zmian, gdy ogrodzenia nie ma albo gdy otwarcie nie ma
/// zamknięcia (przy uciętej odpowiedzi nie ma czego zdejmować - lepiej oddać
/// tekst, niż udawać, że wiemy, gdzie kończy się kod).
pub fn strip_whole_fence(response: &str) -> &str {
    let text = response.trim();
    let Some(rest) = text.strip_prefix("```") else {
        return text;
    };
    // Pierwsza linia to język (`json`, `python`, ``) - albo od razu treść.
    let body = match rest.find('\n') {
        Some(newline) => &rest[newline + 1..],
        None => return text,
    };
    let body = body.trim_end();
    match body.strip_suffix("```") {
        Some(inner) => inner.trim(),
        None => text,
    }
}

/// Pierwszy blok kodu w odpowiedzi: język z ogrodzenia (jeśli podany) i treść.
///
/// Treść bywa ucięta (model przestał generować) - to nie jest przypadek
/// błędny, tylko zwykły wynik testu, więc oddajemy to, co jest, a decyzję
/// o poprawności zostawiamy sprawdzającemu.
pub fn first_fenced_block(response: &str) -> Option<(Option<&str>, &str)> {
    let mut consumed = 0usize;
    for line in response.split_inclusive('\n') {
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if let Some(rest) = trimmed.trim_start().strip_prefix("```") {
            let info = rest.trim();
            let language = if info.is_empty() { None } else { Some(info) };
            let start = consumed + line.len();
            return Some((language, block_body(&response[start..])));
        }
        consumed += line.len();
    }
    None
}

/// Treść bloku: wszystko do linii zamykającej, a bez zamknięcia - do końca.
fn block_body(rest: &str) -> &str {
    let mut offset = 0usize;
    for line in rest.split_inclusive('\n') {
        if line.trim_start().starts_with("```") {
            return &rest[..offset];
        }
        offset += line.len();
    }
    rest
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whole_fence_is_removed() {
        assert_eq!(strip_whole_fence("```json\n{\"a\": 1}\n```"), "{\"a\": 1}");
        assert_eq!(strip_whole_fence("```\n{\"a\": 1}\n```"), "{\"a\": 1}");
        assert_eq!(strip_whole_fence("{\"a\": 1}"), "{\"a\": 1}");
    }

    #[test]
    fn fences_inside_the_payload_survive() {
        assert_eq!(
            strip_whole_fence("```json\n{\"code\": \"```py\"}\n```"),
            "{\"code\": \"```py\"}"
        );
    }

    #[test]
    fn unterminated_fence_is_left_alone() {
        // Ucięta odpowiedź: nie zgadujemy, gdzie kończy się kod.
        assert_eq!(strip_whole_fence("```json\n{\"a\": 1}"), "```json\n{\"a\": 1}");
    }

    #[test]
    fn first_block_carries_its_language() {
        let (language, body) = first_fenced_block("Oto kod:\n```python\nprint(1)\n```\nGotowe.").unwrap();
        assert_eq!(language, Some("python"));
        assert_eq!(body, "print(1)\n");
    }

    #[test]
    fn block_without_language_or_closing_fence() {
        let (language, body) = first_fenced_block("```\nx = 1").unwrap();
        assert_eq!(language, None);
        assert_eq!(body, "x = 1");
    }

    #[test]
    fn only_the_first_block_counts() {
        let (language, body) = first_fenced_block("```sql\nSELECT 1;\n```\n```python\nx = 1\n```").unwrap();
        assert_eq!(language, Some("sql"));
        assert_eq!(body, "SELECT 1;\n");
    }

    #[test]
    fn prose_without_fence_has_no_block() {
        assert!(first_fenced_block("Nie mogę tego zrobić.").is_none());
    }
}
