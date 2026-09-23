//! User-facing text produced by the **backend**.
//!
//! Why this lives in Rust and not in the frontend catalogue: error text is not
//! only displayed, it is also **persisted** in run history and written into the
//! CSV/HTML export (`ollama.rs` puts it in `PromptResult::error`). A code sent
//! to the UI would end up in the export as a code, so the message has to be a
//! ready-to-read sentence in the language the user is working in, resolved here
//! where it is produced.
//!
//! The frontend keeps its own catalogue for interface text (see
//! `src/lib/i18n.tsx`). The split is deliberate: the backend speaks for itself,
//! the interface speaks for itself, and neither needs the other to be loaded.
//!
//! **One language per file**: every `messages_<lang>.rs` holds its own texts
//! under the same codes, so editing one language never means touching the others.
//! This file only picks between them - the tests below are what guarantees that
//! every file stays in step (same codes, same placeholders) and that adding a
//! language is a compile error until its file is wired in here.
//!
//! The language comes from `settings.json`; `settings::sync_language` keeps it in
//! step. It is a process-wide value because the messages are produced deep in the
//! HTTP helpers, which have no `AppHandle` to read the settings from.
//!
//! `npm run check:i18n` verifies that every code used in the code exists in the
//! catalogue, and that no Polish literal is left in a displayed message.

use std::sync::RwLock;

#[path = "messages_de.rs"]
mod de;
#[path = "messages_en.rs"]
mod en;
#[path = "messages_es.rs"]
mod es;
#[path = "messages_fr.rs"]
mod fr;
#[path = "messages_it.rs"]
mod it;
#[path = "messages_pl.rs"]
mod pl;
#[path = "messages_pt.rs"]
mod pt;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Lang {
    En,
    Pl,
    De,
    Es,
    Fr,
    Pt,
    It,
}

impl Lang {
    /// Anything unknown falls back to English, so a typo in `settings.json`
    /// cannot leave the user with an empty interface. A region variant
    /// (`pl-PL`, `de-AT`) is trimmed to its base code.
    fn parse(raw: &str) -> Lang {
        let lower = raw.trim().to_lowercase();
        match lower.split('-').next().unwrap_or("") {
            "pl" => Lang::Pl,
            "de" => Lang::De,
            "es" => Lang::Es,
            "fr" => Lang::Fr,
            "pt" => Lang::Pt,
            "it" => Lang::It,
            _ => Lang::En,
        }
    }

    /// Kod języka (`en`, `pl`, …) - ten sam, jakim posługuje się `settings.json`.
    ///
    /// Potrzebny raportowi HTML, żeby atrybut `<html lang>` mówił prawdę: bez
    /// niego dokument w każdym języku był zadeklarowany jako polski.
    pub fn code(self) -> &'static str {
        match self {
            Lang::En => "en",
            Lang::Pl => "pl",
            Lang::De => "de",
            Lang::Es => "es",
            Lang::Fr => "fr",
            Lang::Pt => "pt",
            Lang::It => "it",
        }
    }
}

static LANGUAGE: RwLock<Lang> = RwLock::new(Lang::En);

pub fn set_language(raw: &str) {
    if let Ok(mut language) = LANGUAGE.write() {
        *language = Lang::parse(raw);
    }
}

pub fn language() -> Lang {
    LANGUAGE.read().map(|language| *language).unwrap_or(Lang::En)
}

/// Catalog for one language. `Lang` is exhaustive, so adding a language is a
/// compile error here until its file is wired in.
fn catalog(language: Lang) -> &'static [(&'static str, &'static str)] {
    match language {
        Lang::En => en::CATALOG,
        Lang::Pl => pl::CATALOG,
        Lang::De => de::CATALOG,
        Lang::Es => es::CATALOG,
        Lang::Fr => fr::CATALOG,
        Lang::Pt => pt::CATALOG,
        Lang::It => it::CATALOG,
    }
}

/// Fills `{name}` placeholders. An unknown placeholder is left as it is, so a
/// typo shows up in the interface instead of silently disappearing.
fn fill(template: &str, params: &[(&str, &str)]) -> String {
    let mut text = template.to_string();
    for (name, value) in params {
        text = text.replace(&format!("{{{name}}}"), value);
    }
    text
}

pub fn text(language: Lang, code: &str, params: &[(&str, &str)]) -> String {
    let entry = catalog(language).iter().find(|(entry, _)| *entry == code);
    match entry {
        Some((_, template)) => fill(template, params),
        // An unknown code means a message was used without a translation. We
        // show the code itself rather than an empty string so the gap is
        // visible; `npm run check:i18n` catches it before it ships.
        None => code.to_string(),
    }
}

/// [`text`] in the language currently chosen in settings.
pub fn msg(code: &str, params: &[(&str, &str)]) -> String {
    text(language(), code, params)
}

/// Pliki jezykowe backendu: (nazwa pliku, katalog). Jedyne miejsce, w ktorym
/// nowy jezyk trzeba dopisac - testy nizej sprawdzaja kazdy z nich wzgledem
/// angielskiego, wiec rozjazd nie przejdzie po cichu.
#[cfg(test)]
fn language_files() -> Vec<(&'static str, &'static [(&'static str, &'static str)])> {
    vec![
        ("messages_en.rs", en::CATALOG),
        ("messages_pl.rs", pl::CATALOG),
        ("messages_de.rs", de::CATALOG),
        ("messages_es.rs", es::CATALOG),
        ("messages_fr.rs", fr::CATALOG),
        ("messages_pt.rs", pt::CATALOG),
        ("messages_it.rs", it::CATALOG),
    ]
}

/// Tlumaczenie kodu w danym katalogu (pusty tekst, gdy kodu brak).
#[cfg(test)]
fn translation(catalog: &'static [(&'static str, &'static str)], code: &str) -> &'static str {
    catalog
        .iter()
        .find(|(other, _)| *other == code)
        .map(|(_, text)| *text)
        .unwrap_or("")
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Sedno rozdzielenia na pliki: te same kody w kazdym z nich.
    #[test]
    fn every_file_has_the_same_codes_as_english() {
        for (name, catalog) in language_files() {
            for &(code, english) in en::CATALOG {
                assert!(!translation(catalog, code).is_empty(), "{name}: brak {code}");
                assert!(!english.is_empty(), "messages_en.rs: brak {code}");
            }
            for (code, _) in catalog {
                assert!(
                    en::CATALOG.iter().any(|(other, _)| other == code),
                    "{name}: kod {code} spoza messages_en.rs"
                );
            }
        }
    }

    #[test]
    fn codes_are_unique_in_every_file() {
        for (name, catalog) in language_files() {
            let mut codes: Vec<&str> = catalog.iter().map(|(code, _)| *code).collect();
            codes.sort_unstable();
            let before = codes.len();
            codes.dedup();
            assert_eq!(before, codes.len(), "{name}: zduplikowany kod");
        }
    }

    /// Puste tlumaczenie albo kopia angielskiego to zwykle zapomniany wpis.
    /// Wyjatek: teksty identyczne z zalozenia, dlatego lista wyjatkow jest
    /// jawna i krotka. `dialog.image_filter` to nazwa filtra plikow („Image”
    /// po francusku brzmi tak samo), wiec nie ma czego tlumaczyc.
    #[test]
    fn no_translation_is_empty_or_a_copy_of_english() {
        const SHARED_BY_DESIGN: [&str; 1] = ["dialog.image_filter"];
        for (name, catalog) in language_files() {
            if name == "messages_en.rs" {
                continue;
            }
            for &(code, english) in en::CATALOG {
                let translated = translation(catalog, code);
                assert!(!translated.is_empty(), "{name}: brak {code}");
                if !SHARED_BY_DESIGN.contains(&code) {
                    assert_ne!(english, translated, "{name}: {code} jest kopią angielskiego");
                }
            }
        }
    }

    /// Ten sam zestaw placeholderów w kazdym jezyku - inaczej tlumaczenie
    /// zostawiloby `{error}` w tekscie albo zgubilo wartosc.
    #[test]
    fn placeholders_match_between_languages() {
        fn placeholders(text: &str) -> Vec<String> {
            let mut found = Vec::new();
            let mut rest = text;
            while let Some(start) = rest.find('{') {
                let Some(end) = rest[start..].find('}') else { break };
                found.push(rest[start + 1..start + end].to_string());
                rest = &rest[start + end + 1..];
            }
            found.sort();
            found
        }

        for (name, catalog) in language_files() {
            if name == "messages_en.rs" {
                continue;
            }
            for &(code, english) in en::CATALOG {
                assert_eq!(
                    placeholders(english),
                    placeholders(translation(catalog, code)),
                    "{name}: {code}: placeholdery"
                );
            }
        }
    }

    #[test]
    fn fills_placeholders_in_both_languages() {
        let params = [("endpoint", "http://127.0.0.1:11434"), ("error", "refused")];
        assert_eq!(
            text(Lang::En, "ollama.connect_failed", &params),
            "Could not connect to Ollama (http://127.0.0.1:11434): refused"
        );
        assert_eq!(
            text(Lang::Pl, "ollama.connect_failed", &params),
            "Nie udało się połączyć z Ollamą (http://127.0.0.1:11434): refused"
        );
    }

    #[test]
    fn unknown_code_is_visible_not_empty() {
        assert_eq!(text(Lang::En, "nie.ma.takiego", &[]), "nie.ma.takiego");
        assert_eq!(text(Lang::Pl, "nie.ma.takiego", &[]), "nie.ma.takiego");
    }

    #[test]
    fn language_parsing_is_forgiving() {
        assert_eq!(Lang::parse("pl"), Lang::Pl);
        assert_eq!(Lang::parse(" PL "), Lang::Pl);
        assert_eq!(Lang::parse("pl-PL"), Lang::Pl);
        assert_eq!(Lang::parse("de"), Lang::De);
        assert_eq!(Lang::parse("de-AT"), Lang::De);
        assert_eq!(Lang::parse("es"), Lang::Es);
        assert_eq!(Lang::parse("fr"), Lang::Fr);
        assert_eq!(Lang::parse("pt"), Lang::Pt);
        assert_eq!(Lang::parse("pt-BR"), Lang::Pt);
        assert_eq!(Lang::parse("it"), Lang::It);
        assert_eq!(Lang::parse("it-IT"), Lang::It);
        assert_eq!(Lang::parse("en"), Lang::En);
        // Kod, ktorego nie ma: angielski zamiast pustego interfejsu.
        assert_eq!(Lang::parse("xx"), Lang::En);
        assert_eq!(Lang::parse(""), Lang::En);
    }
}
