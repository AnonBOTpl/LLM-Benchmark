//! User settings and storage housekeeping.
//!
//! Settings live in their own `settings.json`, **separate** from `config.json`
//! (models + categories) and from the benchmark history. That separation is
//! deliberate: "restore defaults" wipes this file and nothing else, so nobody
//! loses their prompts or measurements by resetting a language preference.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::store;

fn default_language() -> String {
    "en".to_string()
}

/// Sprawdzenia i autoscroll są **domyślnie włączone**, bo tak zachowuje się
/// aplikacja bez tego pola. `serde(default = "default_true")` dotyczy więc też
/// plików sprzed tej zmiany - brak wpisu nie może po cichu wyłączyć funkcji.
fn default_true() -> bool {
    true
}

/// Settings are what the user chose about the app itself, not about a model.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// Kod języka interfejsu (`en` domyślnie); listę obsługiwanych podaje
    /// `LANGUAGES` niżej.
    #[serde(default = "default_language")]
    pub language: String,
    /// Nadpisania wbudowanych system promptów, kluczowane typem kategorii
    /// (`coding` | `chat` | `vlm` | `classification`). Pusty wpis = wbudowany
    /// tekst z frontendu, więc nowe domyślne prompty działają bez migracji.
    #[serde(default)]
    pub default_system_prompts: BTreeMap<String, String>,
    /// Czy liczyć i pokazywać werdykt sprawdzenia JSON-a (kategoria `json`).
    ///
    /// Wyłączone znaczy **nie liczymy wcale**: w wyniku zostaje `None`, czyli
    /// dokładnie to, co już oznacza „brak informacji” (nie „niepoprawny”),
    /// a kolumna znika z przebiegu. Wybór świadomy wobec alternatywy „licz,
    /// ale nie pokazuj”: użytkownik, który wyłącza sprawdzenie, nie chce, żeby
    /// aplikacja robiła coś, czego nie widzi.
    #[serde(default = "default_true")]
    pub check_json: bool,
    /// To samo dla składni Pythona (kategoria `coding`). Osobny przełącznik,
    /// bo to inne kategorie: kto testuje kod w JavaScripcie, dostawałby przy
    /// każdym wierszu „nie ma tu Pythona”.
    #[serde(default = "default_true")]
    pub check_python: bool,
    /// Czy podgląd odpowiedzi ma sam przewijać się do nowych znaków.
    #[serde(default = "default_true")]
    pub auto_scroll_answer: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            language: default_language(),
            default_system_prompts: BTreeMap::new(),
            check_json: true,
            check_python: true,
            auto_scroll_answer: true,
        }
    }
}

/// Lista obsługiwanych języków. Musi się zgadzać z `messages::Lang::parse`
/// i z `LANGUAGES` w `src/lib/i18n.tsx` - literówka w `settings.json`
/// (albo język dopisany w UI, a pominięty tutaj) kończy się angielskim,
/// więc rozjazd oznaczałby wybór, który nie przeżywa restartu.
const LANGUAGES: [&str; 7] = ["en", "pl", "de", "es", "fr", "pt", "it"];

/// Kod bazowy języka (`pt-BR` -> `pt`). Cokolwiek spoza listy traktujemy jak
/// angielski, żeby literówka nie zostawiła użytkownika z pustym UI.
fn normalize_language(language: &str) -> String {
    let lower = language.trim().to_lowercase();
    let base = lower.split('-').next().unwrap_or("");
    if LANGUAGES.contains(&base) {
        base.to_string()
    } else {
        "en".to_string()
    }
}

pub fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(store::data_dir(app)?.join("settings.json"))
}

/// Przekazuje język z `settings.json` do [`crate::messages`], żeby komunikaty
/// backendu (błędy Ollamy, NVML, eksportu) były w tym samym języku co
/// interfejs. Wywoływane przy starcie i przy każdym odczycie/zapisie ustawień.
pub fn sync_language(app: &AppHandle) {
    let settings = load_settings(app);
    crate::messages::set_language(&settings.language);
}

pub fn load_settings(app: &AppHandle) -> Settings {
    let Ok(path) = settings_path(app) else {
        return Settings::default();
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return Settings::default();
    };
    let mut parsed: Settings = serde_json::from_str(&raw).unwrap_or_default();
    parsed.language = normalize_language(&parsed.language);
    parsed
}

pub fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    let mut normalized = settings.clone();
    normalized.language = normalize_language(&normalized.language);
    let raw = serde_json::to_string_pretty(&normalized).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

/// Usuwa plik ustawień użytkownika. Modele, kategorie, historia i eksporty
/// zostają nietknięte - reset dotyczy wyłącznie ustawień aplikacji.
pub fn reset_settings(app: &AppHandle) -> Result<Settings, String> {
    if let Ok(path) = settings_path(app) {
        if path.exists() {
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }
    Ok(Settings::default())
}

// ---------------------------------------------------------------------------
// Ścieżki i miejsce na dysku
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StoragePaths {
    pub data_dir: String,
    pub history_dir: String,
    pub export_dir: String,
}

pub fn export_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = match app.path().download_dir() {
        Ok(dir) => dir,
        Err(_) => store::data_dir(app)?,
    };
    Ok(base.join("AI Benchmark"))
}

pub fn storage_paths(app: &AppHandle) -> Result<StoragePaths, String> {
    let stringify = |path: PathBuf| path.to_string_lossy().to_string();
    Ok(StoragePaths {
        data_dir: stringify(store::data_dir(app)?),
        history_dir: stringify(store::history_dir(app)?),
        export_dir: stringify(export_dir(app)?),
    })
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct StorageStats {
    pub files: usize,
    pub bytes: u64,
}

/// Liczy pliki i ich rozmiary w katalogu (bez podkatalogów).
fn dir_stats(dir: &Path) -> StorageStats {
    let mut stats = StorageStats::default();
    let Ok(entries) = fs::read_dir(dir) else {
        return stats;
    };
    for entry in entries.flatten() {
        if !entry.path().is_file() {
            continue;
        }
        stats.files += 1;
        if let Ok(meta) = entry.metadata() {
            stats.bytes += meta.len();
        }
    }
    stats
}

pub fn exports_stats(app: &AppHandle) -> Result<StorageStats, String> {
    Ok(dir_stats(&export_dir(app)?))
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClearOutcome {
    pub removed: usize,
    pub freed_bytes: u64,
}

/// Usuwa wskazane przebiegi. Identyfikatory podaje frontend, więc użytkownik
/// widzi dokładnie tę listę, którą zatwierdził - filtr nie jest liczony drugi
/// raz (i nie może się rozjechać między podglądem a usunięciem).
pub fn clear_history(app: &AppHandle, ids: &[String]) -> Result<ClearOutcome, String> {
    let dir = store::history_dir(app)?;
    let mut outcome = ClearOutcome::default();

    for id in ids {
        // Ta sama walidacja co przy zapisie - chronimy się przed `..` i
        // separatorami ścieżki w identyfikatorze.
        store::safe_id(id)?;
        let path = dir.join(format!("{id}.json"));
        let Ok(meta) = fs::metadata(&path) else {
            continue;
        };
        fs::remove_file(&path).map_err(|e| e.to_string())?;
        outcome.removed += 1;
        outcome.freed_bytes += meta.len();
    }

    Ok(outcome)
}

/// Usuwa pliki CSV/HTML wygenerowane przez eksport. To osobna akcja, bo to
/// materiały użytkownika, a nie zwykłe dane aplikacji.
pub fn clear_exports(app: &AppHandle) -> Result<ClearOutcome, String> {
    let dir = export_dir(app)?;
    let mut outcome = ClearOutcome::default();
    let Ok(entries) = fs::read_dir(&dir) else {
        return Ok(outcome);
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let extension = path.extension().and_then(|value| value.to_str());
        if !matches!(extension, Some("csv") | Some("html")) {
            continue;
        }
        let Ok(meta) = entry.metadata() else {
            continue;
        };
        fs::remove_file(&path).map_err(|e| e.to_string())?;
        outcome.removed += 1;
        outcome.freed_bytes += meta.len();
    }

    Ok(outcome)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_are_english_with_builtin_prompts() {
        let settings = Settings::default();
        assert_eq!(settings.language, "en");
        assert!(settings.default_system_prompts.is_empty());
    }

    /// Stary/nieznany język nie może zostawić użytkownika z pustym UI.
    #[test]
    fn unknown_language_falls_back_to_english() {
        assert_eq!(normalize_language("PL"), "pl");
        assert_eq!(normalize_language(" pl "), "pl");
        assert_eq!(normalize_language("pl-PL"), "pl");
        assert_eq!(normalize_language("de"), "de");
        assert_eq!(normalize_language("DE"), "de");
        assert_eq!(normalize_language("de-AT"), "de");
        assert_eq!(normalize_language("es"), "es");
        assert_eq!(normalize_language("fr"), "fr");
        assert_eq!(normalize_language("pt-BR"), "pt");
        assert_eq!(normalize_language("it"), "it");
        assert_eq!(normalize_language("en"), "en");
        assert_eq!(normalize_language(""), "en");
        assert_eq!(normalize_language("xx"), "en");
    }

    #[test]
    fn settings_round_trip_keeps_prompt_overrides() {
        let mut settings = Settings::default();
        settings.language = "pl".into();
        settings
            .default_system_prompts
            .insert("coding".into(), "Odpowiadaj krótko.".into());

        let raw = serde_json::to_string(&settings).unwrap();
        let back: Settings = serde_json::from_str(&raw).unwrap();
        assert_eq!(back, settings);
        assert_eq!(back.default_system_prompts.get("coding").map(String::as_str), Some("Odpowiadaj krótko."));
    }

    /// Plik bez pól (albo pusty) musi dać domyślne ustawienia, a nie błąd.
    #[test]
    fn missing_fields_load_as_defaults() {
        let parsed: Settings = serde_json::from_str("{}").unwrap();
        assert_eq!(parsed, Settings::default());
    }

    /// Plik sprzed tej zmiany (bez pól sprawdzeń) nie może po cichu wyłączyć
    /// funkcji - brak wpisu znaczy „włączone”, tak jak dotąd.
    #[test]
    fn checks_default_to_on_for_older_settings_files() {
        let parsed: Settings = serde_json::from_str(r#"{"language":"pl"}"#).unwrap();
        assert!(parsed.check_json);
        assert!(parsed.check_python);
        assert!(parsed.auto_scroll_answer);
    }

    /// Wyłączenie sprawdzenia przeżywa zapis i odczyt - inaczej przełącznik
    /// wracałby do „włączone” po restarcie.
    #[test]
    fn turning_a_check_off_round_trips() {
        let mut settings = Settings::default();
        settings.check_json = false;
        settings.auto_scroll_answer = false;

        let raw = serde_json::to_string(&settings).unwrap();
        let back: Settings = serde_json::from_str(&raw).unwrap();
        assert!(!back.check_json);
        assert!(!back.auto_scroll_answer);
        assert!(back.check_python, "nietknięte sprawdzenie zostaje włączone");
    }
}
