//! Persistence layer: user config (models + categories) and benchmark history.
//!
//! Layout inside the app data dir:
//!   config.json          - the user's models and categories
//!   history/<id>.json    - one file per benchmark run
//!   exports/             - fallback location for CSV/HTML exports

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

fn default_true() -> bool {
    true
}

/// Parametry generowania przekazywane do Ollamy w polu `options`.
///
/// Wszystkie są opcjonalne i `None` znaczy "zostaw decyzję Ollamie" - przy
/// serializacji pomijamy puste pola, więc do modelu trafia wyłącznie to, co
/// użytkownik naprawdę ustawił.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelOptions {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_k: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repeat_penalty: Option<f64>,
    /// Rozmiar kontekstu. Ollama domyślnie używa 4096, a większy kontekst
    /// zajmuje więcej VRAM - przy porównywaniu przebiegów warto trzymać jedną
    /// wartość.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub num_ctx: Option<u32>,
    /// Limit długości odpowiedzi; `-1` znaczy "bez limitu".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub num_predict: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
    /// Ile warstw oddać karcie: `0` = tylko CPU, liczba = tyle warstw,
    /// brak wartości = Ollama decyduje sama.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub num_gpu: Option<i32>,
}

impl ModelOptions {
    /// Parametry w formacie, którego oczekuje Ollama: w `options` klucze są
    /// **snake_case** (`num_ctx`, `num_gpu`, `top_p`), a nie w naszym camelCase
    /// z `config.json`. Ollama nieznane klucze po cichu pomija, więc wysłanie
    /// `numGpu` wygląda jak sukces, a nie robi nic.
    pub fn to_ollama_options(&self) -> serde_json::Value {
        let mut map = serde_json::Map::new();
        let mut put = |key: &str, value: Option<serde_json::Value>| {
            if let Some(value) = value {
                map.insert(key.to_string(), value);
            }
        };
        put("temperature", self.temperature.map(|v| serde_json::json!(v)));
        put("top_p", self.top_p.map(|v| serde_json::json!(v)));
        put("top_k", self.top_k.map(|v| serde_json::json!(v)));
        put(
            "repeat_penalty",
            self.repeat_penalty.map(|v| serde_json::json!(v)),
        );
        put("num_ctx", self.num_ctx.map(|v| serde_json::json!(v)));
        put("num_predict", self.num_predict.map(|v| serde_json::json!(v)));
        put("seed", self.seed.map(|v| serde_json::json!(v)));
        put("num_gpu", self.num_gpu.map(|v| serde_json::json!(v)));
        serde_json::Value::Object(map)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModelEntry {
    pub tag: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub category_ids: Vec<String>,
    /// Własny system prompt. `None` oznacza "użyj domyślnego dla typu
    /// kategorii, w której model startuje" - dzięki temu ten sam model
    /// w kategorii kodowania i rozmowy dostaje inny prompt, a użytkownik może
    /// go nadpisać jednym polem.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    #[serde(default)]
    pub options: ModelOptions,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VlmPrompt {
    pub prompt: String,
    #[serde(default)]
    pub image_path: String,
    /// Wyłączony prompt zostaje w configu, ale nie wchodzi do testu.
    #[serde(default = "default_true")]
    pub enabled: bool,
}

/// Pojedynczy prompt kategorii tekstowej.
///
/// Trzymamy go jako obiekt, a nie goły string, żeby dało się go **wyłączyć
/// z testu bez kasowania treści** - prompt zostaje na liście z odznaczonym
/// checkboxem.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TextPrompt {
    pub text: String,
    pub enabled: bool,
}

impl TextPrompt {
    /// Wygodny konstruktor dla testów: kategorie startują z pustymi listami,
    /// więc w kodzie produkcyjnym prompty przychodzą z `config.json`.
    #[cfg(test)]
    pub fn new(text: impl Into<String>) -> Self {
        TextPrompt {
            text: text.into(),
            enabled: true,
        }
    }
}

/// Stary `config.json` trzymał listę samych stringów. Czytamy oba formaty -
/// brak informacji o wyłączeniu znaczy "prompt włączony", więc nic nie ginie.
impl<'de> Deserialize<'de> for TextPrompt {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum Helper {
            Plain(String),
            Detailed {
                text: String,
                #[serde(default = "default_true")]
                enabled: bool,
            },
        }

        Ok(match Helper::deserialize(deserializer)? {
            Helper::Plain(text) => TextPrompt { text, enabled: true },
            Helper::Detailed { text, enabled } => TextPrompt { text, enabled },
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    /// One of: coding | chat | vlm | classification | reasoning | json | long_context
    ///
    /// Zwykły tekst, nie typ wyliczeniowy: backend rozgałęzia się na `kind`
    /// tylko w trzech miejscach (`vlm` x2, `classification`), więc nowa
    /// kategoria tekstowa nie dodaje żadnego rozgałęzienia.
    pub kind: String,
    #[serde(default)]
    pub prompts: Vec<TextPrompt>,
    #[serde(default)]
    pub vlm_prompts: Vec<VlmPrompt>,
}

impl Category {
    /// Prompty faktycznie biorące udział w teście (bez wyłączonych).
    pub fn enabled_count(&self) -> usize {
        if self.kind == "vlm" {
            self.vlm_prompts.iter().filter(|p| p.enabled).count()
        } else {
            self.prompts.iter().filter(|p| p.enabled).count()
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub models: Vec<ModelEntry>,
    pub categories: Vec<Category>,
}

fn model(tag: &str, category_ids: &[&str]) -> ModelEntry {
    ModelEntry {
        tag: tag.to_string(),
        enabled: true,
        category_ids: category_ids.iter().map(|c| c.to_string()).collect(),
        // Bez własnych ustawień: startujemy na domyślnych promptach dla typu
        // kategorii i parametrach dobranych przez Ollamę.
        system_prompt: None,
        options: ModelOptions::default(),
    }
}

/// Starting configuration.
///
/// Two rules here:
/// - the model list is fixed by the spec - do not add extra "helpful" models;
/// - **no example prompts**. The lists start empty and the user fills them in
///   with whatever they want, in whatever language they want. Shipping seeded
///   prompts meant shipping Polish text into an English interface, and there is
///   no way to guess which language the user thinks in.
///
/// Category **names** are the one thing the app does provide, always in English:
/// they are just labels (coding, chat, images, classification) and keeping one
/// version avoids having to maintain two and keeping them in sync. They stay
/// editable - see [`migrate_category_names`], which also moves the old Polish
/// names of an existing `config.json` over to English.
///
/// Ten sam zasiew jest **jedynym** źródłem listy kategorii - nie ma drugiej
/// listy w kodzie, która mogłaby się z nim rozjechać.
///
/// Uwaga na przyszłość: nowy zasiew nie dopisuje się do **istniejącego**
/// `config.json`. Migracji nie piszemy świadomie (aplikacja nie wyszła jeszcze
/// do nikogo), więc starszy plik z czterema kategoriami zostanie z czterema -
/// dopisanie trzech nowych to jednorazowa edycja pliku, nie kod.
pub fn default_config() -> AppConfig {
    AppConfig {
        models: vec![
            model("qwen2.5-coder:3b", &["coding"]),
            model("qwen2.5-coder:7b", &["coding"]),
            model("qwen3:8b", &["chat"]),
            model("moondream", &["vlm"]),
            model("llava:7b", &["vlm"]),
        ],
        categories: SEEDED_CATEGORIES
            .iter()
            .map(|(id, name, kind)| Category {
                id: (*id).to_string(),
                name: (*name).to_string(),
                kind: (*kind).to_string(),
                prompts: vec![],
                vlm_prompts: vec![],
            })
            .collect(),
    }
}

/// Kategorie, którymi aplikacja zasiewa nowy `config.json`: `id`, nazwa, typ.
///
/// Nazwy są angielskie i **edytowalne** - to etykiety, nie tłumaczenia (patrz
/// `KIND_LABEL` we froncie: typ kategorii też jest zawsze angielski, żeby
/// użytkownik nie widział obok siebie „Coding” i „Kodowanie”).
const SEEDED_CATEGORIES: [(&str, &str, &str); 7] = [
    ("coding", "Coding", "coding"),
    ("chat", "Chat / creativity", "chat"),
    ("reasoning", "Reasoning / math", "reasoning"),
    ("json", "Structured output (JSON)", "json"),
    ("long_context", "Long context / summarization", "long_context"),
    ("vlm", "Images (VLM)", "vlm"),
    // Klasyfikacja na końcu: zatrzymuje przebieg na ręczną ocenę, więc
    // naturalnie wypada po pomiarach, a nie w środku nich.
    (
        "classification",
        "Response classification",
        "classification",
    ),
];

/// Dawne polskie nazwy czterech kategorii sprzed zmiany języka interfejsu.
///
/// To **nie jest lista kategorii** - tylko tabela rozpoznawcza dla starego
/// `config.json`. Trzy nowe kategorie nigdy nie miały polskich nazw, więc nie
/// wchodzą tu i nie mogą zepsuć ostrego warunku migracji (patrz
/// [`migrate_category_names`]).
const LEGACY_CATEGORY_NAMES: [(&str, &str, &str); 4] = [
    ("coding", "Coding", "Kodowanie"),
    ("chat", "Chat / creativity", "Rozmowa/kreatywność"),
    ("vlm", "Images (VLM)", "Obrazy (VLM)"),
    (
        "classification",
        "Response classification",
        "Klasyfikacja odpowiedzi",
    ),
];

/// Podmienia stare polskie nazwy kategorii na angielskie.
///
/// Warunek jest celowo ostry: migracja działa tylko wtedy, gdy **wszystkie**
/// znane kategorie mają jeszcze dokładnie swoją starą nazwę. Dzięki temu nazwa
/// zmieniona ręcznie przez użytkownika nigdy nie zostanie nadpisana, a my nie
/// musimy zgadywać, czy „Kodowanie” to jeszcze domyślna wartość, czy czyjaś
/// decyzja. Zwraca `true`, jeśli coś zmieniono.
pub fn migrate_category_names(config: &mut AppConfig) -> bool {
    let untouched = LEGACY_CATEGORY_NAMES.iter().all(|(id, _, legacy)| {
        config
            .categories
            .iter()
            .any(|category| category.id == *id && category.name == *legacy)
    });
    if !untouched {
        return false;
    }

    for category in config.categories.iter_mut() {
        if let Some((_, english, _)) = LEGACY_CATEGORY_NAMES
            .iter()
            .find(|(id, _, _)| *id == category.id)
        {
            category.name = (*english).to_string();
        }
    }
    true
}

pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn history_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join("history");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("config.json"))
}

pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(default_config());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    match serde_json::from_str::<AppConfig>(&raw) {
        Ok(mut cfg) => {
            // Jednorazowa migracja nazw kategorii. Zapisujemy od razu, żeby
            // kolejne wczytania nie miały już czego zmieniać.
            if migrate_category_names(&mut cfg) {
                let _ = save_config(app, &cfg);
            }
            Ok(cfg)
        }
        Err(_) => {
            // Never lose the user's prompts because of a bad edit: keep a copy.
            let _ = fs::rename(&path, path.with_extension("json.broken"));
            Ok(default_config())
        }
    }
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let raw = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PromptResult {
    pub prompt: String,
    #[serde(default)]
    pub image_path: Option<String>,
    #[serde(default)]
    pub response: String,
    #[serde(default)]
    pub ttft_ms: Option<f64>,
    #[serde(default)]
    pub eval_count: Option<u64>,
    #[serde(default)]
    pub eval_duration_ns: Option<u64>,
    /// tokens/s as reported by Ollama (eval_count / eval_duration)
    #[serde(default)]
    pub tokens_per_sec: Option<f64>,
    /// tokens/s measured against the wall clock on our side
    #[serde(default)]
    pub measured_tokens_per_sec: Option<f64>,
    #[serde(default)]
    pub total_ms: f64,
    #[serde(default)]
    pub load_ms: Option<f64>,
    #[serde(default)]
    pub vram_peak_mb: Option<u64>,
    /// Cała pamięć zajęta przez model w trakcie generowania (`/api/ps`).
    #[serde(default)]
    pub model_size_mb: Option<u64>,
    /// Jaka część pamięci modelu leżała na GPU. To podział **warstw/pamięci**,
    /// a nie czasu liczenia - Ollama nie udostępnia podziału czasu.
    #[serde(default)]
    pub gpu_offload_percent: Option<f64>,
    /// Only meaningful for the classification category - set by hand in the UI.
    #[serde(default)]
    pub label: Option<String>,
    /// Czy odpowiedź jest poprawnym JSON-em. Wypełniane **tylko** dla kategorii
    /// `json` - to dodatkowa informacja obok pomiaru, nie zamiast niego: model
    /// dostaje surowe zadanie, bez wymuszania schematu po stronie Ollamy (inaczej
    /// mierzylibyśmy jej maszynerię, a nie umiejętność modelu).
    ///
    /// `None` dla pozostałych kategorii, dla błędów i dla przebiegów zapisanych
    /// przed tą zmianą - brak informacji to nie to samo, co „niepoprawny”.
    #[serde(default)]
    pub json_valid: Option<bool>,
    /// Werdykt sprawdzenia składni Pythona: `ok` | `syntax_error` | `no_code`.
    ///
    /// Trzymamy **kod**, nie zdanie: interfejs mówi w siedmiu językach, więc
    /// tekst dobiera frontend (i tylko on wie, w którym języku).
    ///
    /// `None` znaczy „nie sprawdzano” - inne kategorie, błąd generowania,
    /// wyłączone sprawdzenie w Ustawieniach albo przebieg z przed tej zmiany.
    /// To celowo ten sam `None`, co brak informacji: nigdy nie udajemy, że
    /// odpowiedź jest niepoprawna, jeśli nikt jej nie sprawdził.
    #[serde(default)]
    pub python_verdict: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ModelRun {
    pub model: String,
    pub category_id: String,
    pub category_name: String,
    pub kind: String,
    ///
    /// Skąd model przyszedł: `registry` albo `huggingface`.
    ///
    /// Po co to w wyniku: ten sam model pobrany z rejestru Ollamy i z `hf.co`
    /// **może wypaść inaczej**, bo szablon i parser modelu przychodzą wtedy
    /// z repozytorium na HF. Bez tej informacji dwa różne wyniki wyglądają jak
    /// rozrzut tego samego pomiaru, a nie jak dwa różne modele.
    ///
    /// Zapisywane wprost (a nie tylko liczone z tagu), bo gdyby Ollama kiedyś
    /// zmieniła sposób oznaczania, stary przebieg zachowa to, co było prawdą
    /// w chwili pomiaru. Dla przebiegów sprzed tej zmiany pole jest puste -
    /// wtedy źródło liczymy z tagu (patrz `model_source`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    /// Ustawienia faktycznie użyte w tym przebiegu - zapisane razem z wynikami,
    /// żeby po czasie było wiadomo, czym je uzyskano.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    #[serde(default)]
    pub options: ModelOptions,
    pub results: Vec<PromptResult>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BenchmarkRun {
    pub id: String,
    pub started_at: String,
    pub finished_at: String,
    pub duration_ms: f64,
    #[serde(default)]
    pub cancelled: bool,
    #[serde(default)]
    pub gpu: Option<String>,
    pub models: Vec<ModelRun>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModelSummary {
    pub model: String,
    pub prompts: usize,
    pub avg_tokens_per_sec: Option<f64>,
    pub avg_ttft_ms: Option<f64>,
    pub peak_vram_mb: Option<u64>,
    /// To samo źródło co w `ModelRun`, wyniesione na wierzch, żeby lista
    /// historii pokazywała je bez wczytywania całego pliku przebiegu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

/// Skąd wziął się model - rozpoznane **z tagu**, bo Ollama nie ma na to pola.
///
/// Rozróżniamy dwie rzeczy i tylko dwie, bo tylko tyle da się ustalić:
/// `huggingface` dla tagu `hf.co/...` i `registry` dla reszty. To drugie znaczy
/// „nie z HuggingFace”, a nie „na pewno z rejestru” - model zbudowany lokalnie
/// (`ollama create`) wygląda tak samo i Ollama tego nie rozróżnia. Interfejs
/// musi to mówić uczciwie, więc etykieta brzmi „rejestr”, a nie „z rejestru
/// Ollamy” z kropką na końcu.
pub fn model_source(tag: &str) -> &'static str {
    if tag.trim().to_ascii_lowercase().starts_with("hf.co/") {
        "huggingface"
    } else {
        "registry"
    }
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RunSummary {
    pub id: String,
    pub started_at: String,
    pub duration_ms: f64,
    pub cancelled: bool,
    pub models: Vec<String>,
    pub categories: Vec<String>,
    pub prompts: usize,
    pub avg_tokens_per_sec: Option<f64>,
    /// Rozmiar pliku przebiegu na dysku. Frontend pokazuje z tego, ile miejsca
    /// odzyska czyszczenie historii - i pokazuje to **przed** usunięciem.
    #[serde(default)]
    pub bytes: u64,
    /// Per-model averages for a run, so model A vs model B can be compared
    /// across the whole history without re-reading every run file.
    pub model_stats: Vec<ModelSummary>,
}

fn avg(values: &[f64]) -> Option<f64> {
    if values.is_empty() {
        None
    } else {
        Some(values.iter().sum::<f64>() / values.len() as f64)
    }
}

pub fn safe_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.contains('/')
        || id.contains('\\')
        || id.contains("..")
        || id.contains(':')
    {
        return Err(crate::messages::msg("run.bad_id", &[("id", id)]));
    }
    Ok(())
}

fn run_path(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    safe_id(id)?;
    Ok(history_dir(app)?.join(format!("{id}.json")))
}

pub fn save_run(app: &AppHandle, run: &BenchmarkRun) -> Result<(), String> {
    let path = run_path(app, &run.id)?;
    let raw = serde_json::to_string_pretty(run).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

pub fn load_run(app: &AppHandle, id: &str) -> Result<BenchmarkRun, String> {
    let path = run_path(app, id)?;
    if !path.exists() {
        return Err(crate::messages::msg("run.not_found", &[("id", id)]));
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

pub fn delete_run(app: &AppHandle, id: &str) -> Result<(), String> {
    let path = run_path(app, id)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn list_runs(app: &AppHandle) -> Result<Vec<RunSummary>, String> {
    let dir = history_dir(app)?;
    let mut runs: Vec<(BenchmarkRun, u64)> = Vec::new();
    let entries = match fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(vec![]),
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let Ok(raw) = fs::read_to_string(&path) else {
            continue;
        };
        let bytes = fs::metadata(&path).map(|meta| meta.len()).unwrap_or(0);
        if let Ok(run) = serde_json::from_str::<BenchmarkRun>(&raw) {
            runs.push((run, bytes));
        }
    }

    struct Acc {
        model: String,
        prompts: usize,
        tps: Vec<f64>,
        ttft: Vec<f64>,
        peak_vram_mb: Option<u64>,
        source: Option<String>,
    }

    let mut summaries: Vec<RunSummary> = runs
        .into_iter()
        .map(|(run, bytes)| {
            let mut models: Vec<String> = Vec::new();
            let mut categories: Vec<String> = Vec::new();
            let mut prompts = 0usize;
            let mut accs: Vec<Acc> = Vec::new();

            for model_run in &run.models {
                if !models.contains(&model_run.model) {
                    models.push(model_run.model.clone());
                }
                if !categories.contains(&model_run.category_name) {
                    categories.push(model_run.category_name.clone());
                }
                prompts += model_run.results.len();

                let position = accs.iter().position(|a| a.model == model_run.model);
                let index = match position {
                    Some(i) => i,
                    None => {
                        accs.push(Acc {
                            model: model_run.model.clone(),
                            prompts: 0,
                            tps: Vec::new(),
                            ttft: Vec::new(),
                            peak_vram_mb: None,
                            source: model_run
                                .source
                                .clone()
                                .or_else(|| Some(model_source(&model_run.model).to_string())),
                        });
                        accs.len() - 1
                    }
                };
                let acc = &mut accs[index];
                acc.prompts += model_run.results.len();

                for result in &model_run.results {
                    if let Some(v) = result.tokens_per_sec.or(result.measured_tokens_per_sec) {
                        acc.tps.push(v);
                    }
                    if let Some(v) = result.ttft_ms {
                        acc.ttft.push(v);
                    }
                    if let Some(v) = result.vram_peak_mb {
                        acc.peak_vram_mb = Some(acc.peak_vram_mb.map_or(v, |p| p.max(v)));
                    }
                }
            }

            let model_stats: Vec<ModelSummary> = accs
                .iter()
                .map(|acc| ModelSummary {
                    model: acc.model.clone(),
                    prompts: acc.prompts,
                    avg_tokens_per_sec: avg(&acc.tps),
                    avg_ttft_ms: avg(&acc.ttft),
                    peak_vram_mb: acc.peak_vram_mb,
                    source: acc.source.clone(),
                })
                .collect();

            let all_tps: Vec<f64> = accs.iter().flat_map(|a| a.tps.iter().copied()).collect();

            RunSummary {
                id: run.id,
                started_at: run.started_at,
                duration_ms: run.duration_ms,
                cancelled: run.cancelled,
                models,
                categories,
                prompts,
                avg_tokens_per_sec: avg(&all_tps),
                bytes,
                model_stats,
            }
        })
        .collect();

    summaries.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    Ok(summaries)
}

pub fn set_label(
    app: &AppHandle,
    id: &str,
    model: &str,
    category_id: &str,
    index: usize,
    label: Option<String>,
) -> Result<(), String> {
    let mut run = load_run(app, id)?;
    let mut found = false;
    for mr in run.models.iter_mut() {
        if mr.model == model && mr.category_id == category_id {
            if let Some(result) = mr.results.get_mut(index) {
                result.label = label.clone();
                found = true;
            }
        }
    }
    if !found {
        return Err(crate::messages::msg("classify.answer_not_found", &[]));
    }
    save_run(app, &run)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Regresja z realnego przebiegu: `num_gpu: 10` było wysyłane jako
    /// `numGpu` i Ollama je ignorowała (podział zostawał 100% GPU), mimo że
    /// w configu i w zapisanym wyniku wartość była poprawna.
    #[test]
    fn ollama_options_use_snake_case_keys() {
        let options = ModelOptions {
            temperature: Some(0.2),
            top_p: Some(0.9),
            top_k: Some(40),
            repeat_penalty: Some(1.05),
            num_ctx: Some(2048),
            num_predict: Some(512),
            seed: Some(7),
            num_gpu: Some(10),
        };
        let json = options.to_ollama_options();

        for key in [
            "temperature",
            "top_p",
            "top_k",
            "repeat_penalty",
            "num_ctx",
            "num_predict",
            "seed",
            "num_gpu",
        ] {
            assert!(json.get(key).is_some(), "brak klucza {key} w {json}");
        }
        // Klucze camelCase nie mogą się tu nigdy pojawić.
        assert!(json.get("numCtx").is_none() && json.get("numGpu").is_none());
        assert_eq!(json["num_gpu"], serde_json::json!(10));

        // Puste pola nie są wysyłane.
        let empty = ModelOptions::default().to_ollama_options();
        assert!(empty.as_object().unwrap().is_empty());
    }

    /// Ustawienia modelu muszą się zapisywać i czytać bez utraty, a puste
    /// `options` nie mogą zaśmiecać `config.json`.
    #[test]
    fn model_options_round_trip_and_skip_empty_fields() {
        let config = AppConfig {
            models: vec![ModelEntry {
                tag: "qwen3:8b".into(),
                enabled: true,
                category_ids: vec!["chat".into()],
                system_prompt: Some("Mów krótko.".into()),
                options: ModelOptions {
                    temperature: Some(0.15),
                    num_ctx: Some(8192),
                    num_gpu: Some(10),
                    ..Default::default()
                },
            }],
            categories: default_config().categories,
        };

        let raw = serde_json::to_string(&config).unwrap();
        assert!(raw.contains("\"temperature\":0.15"));
        assert!(raw.contains("\"numGpu\":10"));
        // Puste pola nie trafiają do pliku.
        assert!(!raw.contains("top_k") && !raw.contains("topK"));
        assert!(!raw.contains("seed"));

        let back: AppConfig = serde_json::from_str(&raw).unwrap();
        assert_eq!(back.models[0].options, config.models[0].options);
        assert_eq!(back.models[0].system_prompt.as_deref(), Some("Mów krótko."));
    }

    /// Stary format promptów - lista gołych stringów - musi czytać się bez
    /// migracji, a brak informacji o wyłączeniu oznacza prompt włączony.
    #[test]
    fn old_string_prompts_load_as_enabled() {
        let raw = r#"{
            "models": [],
            "categories": [{
                "id": "coding", "name": "Kodowanie", "kind": "coding",
                "prompts": ["pierwszy", "drugi"],
                "vlmPrompts": [{ "prompt": "Opisz", "imagePath": "C:/a.png" }]
            }]
        }"#;
        let parsed: AppConfig = serde_json::from_str(raw).unwrap();
        let category = &parsed.categories[0];
        assert_eq!(category.prompts.len(), 2);
        assert_eq!(category.prompts[0].text, "pierwszy");
        assert!(category.prompts.iter().all(|p| p.enabled));
        assert!(category.vlm_prompts[0].enabled);
        assert_eq!(category.enabled_count(), 2);
    }

    /// Nowy format (obiekt z `text` i `enabled`) musi przechodzić round-trip,
    /// a wyłączony prompt nie może być liczony do testu.
    #[test]
    fn text_prompts_round_trip_with_enabled_flag() {
        let mut config = default_config();
        let coding = config
            .categories
            .iter_mut()
            .find(|c| c.id == "coding")
            .unwrap();
        // Listy startują puste, więc budujemy w teście własne dwa prompty.
        coding.prompts.push(TextPrompt::new("pierwszy prompt"));
        coding.prompts.push(TextPrompt::new("drugi prompt"));
        coding.prompts[1].enabled = false;

        let raw = serde_json::to_string(&config).unwrap();
        assert!(raw.contains("\"enabled\":false"));

        let back: AppConfig = serde_json::from_str(&raw).unwrap();
        let coding = back.categories.iter().find(|c| c.id == "coding").unwrap();
        assert_eq!(coding.prompts.len(), 2);
        assert_eq!(coding.prompts[1].text, "drugi prompt");
        assert!(!coding.prompts[1].enabled);
        assert_eq!(coding.enabled_count(), 1);
    }

    /// Stary `config.json` (bez pól ustawień) musi czytać się bez migracji.
    #[test]
    fn old_config_without_settings_still_loads() {
        let raw = r#"{
            "models": [ { "tag": "qwen2.5-coder:3b", "enabled": true, "categoryIds": ["coding"] } ],
            "categories": []
        }"#;
        let parsed: AppConfig = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.models[0].tag, "qwen2.5-coder:3b");
        assert!(parsed.models[0].system_prompt.is_none());
        assert_eq!(parsed.models[0].options, ModelOptions::default());
    }

    #[test]
    fn safe_id_rejects_path_traversal_and_separators() {
        for bad in ["", "..", "../x", "a/b", "a\\b", "C:x", "a:b"] {
            assert!(safe_id(bad).is_err(), "powinno odrzucić: {bad:?}");
        }
        assert!(safe_id("20260913-213000.123").is_ok());
    }

    /// Pilnuje wymagania ze specyfikacji: dokładnie ta lista startowa, żadnych
    /// dodatkowych modeli, kategoria klasyfikacji bez domyślnych promptów.
    #[test]
    fn default_config_is_exactly_the_specified_starting_point() {
        let config = default_config();

        let tags: Vec<&str> = config.models.iter().map(|m| m.tag.as_str()).collect();
        assert_eq!(
            tags,
            vec![
                "qwen2.5-coder:3b",
                "qwen2.5-coder:7b",
                "qwen3:8b",
                "moondream",
                "llava:7b",
            ]
        );
        assert!(config.models.iter().all(|m| m.enabled));

        let ids: Vec<&str> = config.categories.iter().map(|c| c.id.as_str()).collect();
        assert_eq!(
            ids,
            vec![
                "coding",
                "chat",
                "reasoning",
                "json",
                "long_context",
                "vlm",
                "classification",
            ]
        );

        let classification = config
            .categories
            .iter()
            .find(|c| c.id == "classification")
            .expect("kategoria klasyfikacji istnieje");
        assert!(classification.prompts.is_empty());
        assert!(classification.vlm_prompts.is_empty());
    }

    /// Żadna kategoria nie przychodzi z kodem z przykładowym pytaniem - listy
    /// startują puste i to użytkownik wpisuje własne, w swoim języku.
    #[test]
    fn no_category_ships_with_example_prompts() {
        for category in default_config().categories {
            assert!(
                category.prompts.is_empty(),
                "{}: kategoria z domyślnym promptem",
                category.id
            );
            assert!(
                category.vlm_prompts.is_empty(),
                "{}: kategoria z domyślnym zadaniem obrazowym",
                category.id
            );
        }
    }

    /// Nazwy kategorii są zawsze angielskie, niezależnie od języka interfejsu.
    #[test]
    fn default_category_names_are_english() {
        let config = default_config();
        assert_eq!(config.categories.len(), SEEDED_CATEGORIES.len());
        for (id, english, _) in SEEDED_CATEGORIES {
            let category = config.categories.iter().find(|c| c.id == id).unwrap();
            assert_eq!(category.name, english);
        }
    }

    /// Zasiew nie może zawierać literówki w typie: nieznany `kind` po cichu
    /// nie znajdzie ani system promptu, ani etykiety we froncie.
    #[test]
    fn seeded_kinds_and_ids_are_known_and_unique() {
        let known = [
            "coding",
            "chat",
            "vlm",
            "classification",
            "reasoning",
            "json",
            "long_context",
        ];
        let mut ids: Vec<&str> = SEEDED_CATEGORIES.iter().map(|(id, _, _)| *id).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), SEEDED_CATEGORIES.len(), "duplikat id w zasiewie");

        for (id, _, kind) in SEEDED_CATEGORIES {
            assert!(known.contains(&kind), "{id}: nieznany typ {kind}");
            assert_eq!(id, kind, "{id}: id i typ rozjechały się");
        }
    }

    /// Tabela dawnych nazw dotyczy **wyłącznie** starych kategorii - gdyby
    /// dorzucić do niej nowe, ich brak polskiej nazwy zablokowałby migrację
    /// na zawsze (warunek wymaga kompletu).
    #[test]
    fn legacy_names_cover_only_the_old_categories() {
        let seeded: Vec<&str> = SEEDED_CATEGORIES.iter().map(|(id, _, _)| *id).collect();
        for (id, _, _) in LEGACY_CATEGORY_NAMES {
            assert!(seeded.contains(&id), "{id}: nazwa spoza zasiewu");
        }
        assert_eq!(LEGACY_CATEGORY_NAMES.len(), 4);
    }

    /// Stary, w całości nietknięty `config.json` przechodzi na angielskie nazwy.
    ///
    /// Nowe kategorie **nie mają** polskich nazw, więc migracja ich nie dotyka -
    /// zostają dokładnie takie, jakie dał zasiew.
    #[test]
    fn legacy_polish_names_are_migrated() {
        let mut config = default_config();
        for category in config.categories.iter_mut() {
            if let Some((_, _, legacy)) = LEGACY_CATEGORY_NAMES
                .iter()
                .find(|(id, _, _)| *id == category.id)
            {
                category.name = (*legacy).to_string();
            }
        }

        assert!(migrate_category_names(&mut config));
        for category in &config.categories {
            let expected = LEGACY_CATEGORY_NAMES
                .iter()
                .find(|(id, _, _)| *id == category.id)
                .map(|(_, english, _)| *english)
                .or_else(|| {
                    SEEDED_CATEGORIES
                        .iter()
                        .find(|(id, _, _)| *id == category.id)
                        .map(|(_, name, _)| *name)
                });
            assert_eq!(Some(category.name.as_str()), expected, "{}", category.id);
        }
        // Drugie wywołanie nie ma już nic do zrobienia.
        assert!(!migrate_category_names(&mut config));
    }

    /// Nazwa zmieniona ręcznie przez użytkownika zostaje nietknięta - nawet
    /// jeśli dotyczy tylko jednej kategorii.
    #[test]
    fn migrated_names_never_overwrite_a_manual_rename() {
        let mut config = default_config();
        for category in config.categories.iter_mut() {
            if let Some((_, _, legacy)) = LEGACY_CATEGORY_NAMES
                .iter()
                .find(|(id, _, _)| *id == category.id)
            {
                category.name = (*legacy).to_string();
            }
        }
        let chat = config
            .categories
            .iter_mut()
            .find(|c| c.id == "chat")
            .unwrap();
        chat.name = "Moje rozmowy".into();
        // Kategoria spoza znanej czwórki też nie może zniknąć.
        config.categories.push(Category {
            id: "custom".into(),
            name: "Moja kategoria".into(),
            kind: "chat".into(),
            prompts: vec![TextPrompt::new("cokolwiek")],
            vlm_prompts: vec![],
        });

        assert!(!migrate_category_names(&mut config));
        assert_eq!(
            config.categories.iter().find(|c| c.id == "chat").unwrap().name,
            "Moje rozmowy"
        );
        assert_eq!(
            config
                .categories
                .iter()
                .find(|c| c.id == "coding")
                .unwrap()
                .name,
            "Kodowanie"
        );
    }

    /// Źródło modelu rozpoznajemy z tagu, bo Ollama nie ma na to osobnego pola.
    #[test]
    fn source_comes_from_the_tag() {
        assert_eq!(model_source("qwen2.5-coder:3b"), "registry");
        assert_eq!(
            model_source("hf.co/ggml-org/SmolVLM2-256M-Video-Instruct-GGUF:Q4_K_M"),
            "huggingface"
        );
        // Repozytorium w tagu jest zapisane tak, jak je wpisał użytkownik -
        // duże litery nie mogą zmienić rozpoznania.
        assert_eq!(model_source("HF.CO/owner/repo:file.gguf"), "huggingface");
        // Nazwa tylko **zawierająca** `hf.co` to wciąż model z rejestru:
        // prefiks musi być na początku tagu.
        assert_eq!(model_source("moj-hf.co-model:latest"), "registry");
        assert_eq!(model_source("  hf.co/owner/repo "), "huggingface");
    }
}
