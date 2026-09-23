//! Modele GGUF z HuggingFace: przeglądanie katalogu i czytanie plików repozytorium.
//!
//! To jedyne miejsce w backendzie, które rozmawia z **zewnętrznym** API (Ollama
//! jest lokalna, rejestr Ollamy tylko donosi rozmiar). Dlatego wszystko, co da
//! się oddzielić od sieci, jest tu **czystą funkcją** - reguły nazw i rozmiarów
//! mają testy, które nie potrzebują internetu i nie czekają na odpowiedź.
//!
//! Trzy decyzje, które nie są oczywiste, i ich powody:
//!
//! **Warianty wybieramy przez grupowanie, nie czarną listę.** W repozytorium
//! `ggml-org/gpt-oss-20b-GGUF` są trzy pliki GGUF, a tylko jeden to model -
//! pozostałe dwa (`eagle3-*`) to modele szkicujące do dekodowania
//! spekulatywnego. Wystawione jako „kwantyzacje" dałyby tag, którego Ollama nie
//! uruchomi. Zamiast wyliczać, czego nie chcemy, nazwy plików dzielimy na
//! **podstawę modelu** i **etykietę wariantu**, a potem bierzemy grupę, której
//! podstawa najlepiej pasuje do nazwy repozytorium. Reszta trafia do notatki -
//! pomijamy, ale mówimy o tym.
//!
//! **Podzielone pliki wypadają przed grupowaniem.** Kwantyzacja rozbita na
//! kawałki leży w podkatalogu (albo ma `-00001-of-00002` w nazwie), a Ollama
//! potrzebuje jednego pliku. Efektem ubocznym jest to, że rozmiar wariantu
//! zostaje rozmiarem jednego pliku i **znika całe sumowanie**.
//!
//! **Rozmiar pobrania to nie rozmiar pliku modelu.** Przy modelach z obrazami
//! Ollama dociąga projektor (`mmproj-*`) sama - zmierzone na `SmolVLM2-256M`:
//! `ollama pull` pobrał model 131 MB **plus** projektor 104 MB, a `ollama list`
//! pokazał 235 MB. Dlatego wariant liczy `downloadBytes`, a prognoza pamięci
//! używa tej liczby, nie rozmiaru pliku.
//!
//! Czego ten moduł **nie** używa, choć HF to ma: `gguf.totalFileSize` (to
//! rozmiar **jednego** pliku, nie pobrania - nazwa wprost zaprasza do pomyłki),
//! `library=` i `language=` (są **po cichu ignorowane**), `/api/quicksearch`
//! (zwraca tylko `id`, bez pobrań i tagów). `num_parameters`, `pipeline_tag=`
//! i `blobs=true` **działają, ale nie ma ich w OpenAPI** - więc traktujemy je
//! jako ułatwienia: gdyby HF je zmieniło, aplikacja ma dalej działać.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::forecast::{estimate_model, memory_verdict};
use crate::messages::msg;

const HF_API: &str = "https://huggingface.co/api";
const HF_WEB: &str = "https://huggingface.co";

/// Ile wyników na stronę. Jedna strona mieści się w oknie bez przewijania,
/// a kolejne doładowuje przycisk (kursorem z nagłówka `Link`).
const PAGE: u32 = 20;

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(6))
        .timeout(Duration::from_secs(25))
        .user_agent("ai-benchmark/0.1 (lokalny benchmark modeli Ollama)")
        .build()
        .map_err(|error| error.to_string())
}

// ---------------------------------------------------------------------------
// Reguły nazw plików (czyste funkcje - testy niżej)
// ---------------------------------------------------------------------------

fn is_gguf(path: &str) -> bool {
    path.to_ascii_lowercase().ends_with(".gguf")
}

/// Nazwa pliku bez ścieżki i bez rozszerzenia.
fn stem_of(path: &str) -> String {
    let name = path.rsplit('/').next().unwrap_or(path);
    name.strip_suffix(".gguf")
        .or_else(|| name.strip_suffix(".GGUF"))
        .unwrap_or(name)
        .to_string()
}

/// Projektor do modeli z obrazami. **Nie jest wariantem**: nie da się go
/// uruchomić osobno, a Ollama dociąga go sama razem z modelem.
fn is_projector(path: &str) -> bool {
    let name = path.rsplit('/').next().unwrap_or(path).to_ascii_lowercase();
    name.contains("mmproj") || name.contains("projector")
}

/// Znaczniki trybu stojące **za** kwantyzacją (`IQ2_XS-mtp`).
fn is_mode_token(token: &str) -> bool {
    matches!(token.to_ascii_lowercase().as_str(), "mtp")
}

/// Znaczniki wydania stojące **przed** kwantyzacją (`UD-Q4_K_XL` - unsloth
/// dynamic). Muszą trafić do etykiety, inaczej ta sama kwantyzacja w wydaniu
/// `UD` i bez niego rozjechałaby się na dwie grupy.
fn is_release_token(token: &str) -> bool {
    matches!(token.to_ascii_lowercase().as_str(), "ud")
}

/// Czy token to rozpoznana kwantyzacja. Rodziny: `Q`, `IQ`, `F`, `BF`, `FP`,
/// `MXFP`. Gdy nic nie pasuje, etykietą zostaje **pełna nazwa pliku** - i tak
/// działa jako tag Ollamy, więc nie zgadujemy na siłę.
fn is_quant_token(token: &str) -> bool {
    let upper = token.to_ascii_uppercase();

    // Q4_K_M, Q4_0_4_4, Q6_K, Q8_0 oraz IQ2_XS, IQ3_M, IQ4_NL.
    // Pierwszy blok musi być liczbą: bez tego `Qwen3` wyglądałby jak `Q` + `WEN3`.
    let body = upper
        .strip_prefix("IQ")
        .or_else(|| upper.strip_prefix('Q'))
        .filter(|rest| !rest.starts_with('_'));
    if let Some(body) = body {
        let mut blocks = body.split('_');
        let first = blocks.next().unwrap_or("");
        if !first.is_empty() && first.chars().all(|c| c.is_ascii_digit()) {
            return blocks.all(|block| {
                !block.is_empty()
                    && block.len() <= 3
                    && block.chars().all(|c| c.is_ascii_digit() || c.is_ascii_uppercase())
            });
        }
    }

    if matches!(upper.as_str(), "F16" | "F32" | "BF16" | "FP8" | "FP16" | "FP32") {
        return true;
    }
    if let Some(rest) = upper.strip_prefix("MXFP") {
        return !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit());
    }
    false
}

/// Rozbija nazwę na **podstawę modelu** i **etykietę wariantu**. `None` jako
/// etykieta znaczy „nie rozpoznaliśmy kwantyzacji" - wtedy wariantem jest cała
/// nazwa, bo dokładnie ona działa jako tag.
fn split_name(stem: &str) -> (String, Option<String>) {
    let parts: Vec<&str> = stem.split('-').collect();
    let mut end = parts.len();
    while end > 0 && is_mode_token(parts[end - 1]) {
        end -= 1;
    }
    if end == 0 || !is_quant_token(parts[end - 1]) {
        return (stem.to_string(), None);
    }
    let mut start = end - 1;
    while start > 0 && is_release_token(parts[start - 1]) {
        start -= 1;
    }
    (parts[..start].join("-"), Some(parts[start..].join("-")))
}

/// Kwantyzacja rozbita na kawałki: podkatalog albo `-00001-of-00002` w nazwie.
/// Pierwszy przypadek to `bartowski/Hermes-3-...-GGUF`, drugi trafia się
/// również w katalogu głównym (`Swift-Qwen3.8-27B-F16-00001-of-00003.gguf`).
fn is_split(path: &str) -> bool {
    if path.contains('/') {
        return true;
    }
    let bytes = path.as_bytes();
    for start in 0..bytes.len() {
        if bytes[start] != b'-' {
            continue;
        }
        let numer = bytes.get(start + 1..start + 6);
        let lacznik = bytes.get(start + 6..start + 10);
        let ile = bytes.get(start + 10..start + 15);
        if numer.is_some_and(|s| s.iter().all(u8::is_ascii_digit))
            && lacznik == Some(b"-of-")
            && ile.is_some_and(|s| s.iter().all(u8::is_ascii_digit))
        {
            return true;
        }
    }
    false
}

/// Usuwa końcówkę `-00001-of-00002`, żeby z nazwy kawałka została nazwa modelu.
fn strip_shard_suffix(stem: &str) -> String {
    let bytes = stem.as_bytes();
    for start in (0..bytes.len()).rev() {
        if bytes[start] != b'-' {
            continue;
        }
        let numer = bytes.get(start + 1..start + 6);
        let lacznik = bytes.get(start + 6..start + 10);
        let ile = bytes.get(start + 10..start + 15);
        if numer.is_some_and(|s| s.iter().all(u8::is_ascii_digit))
            && lacznik == Some(b"-of-")
            && ile.is_some_and(|s| s.iter().all(u8::is_ascii_digit))
        {
            return stem[..start].to_string();
        }
    }
    stem.to_string()
}

/// Etykieta pominiętej kwantyzacji podzielonej: bierzemy nazwę katalogu, gdy
/// plik leży w podkatalogu (tam stoi kwantyzacja), a inaczej nazwę pliku bez
/// końcówki kawałka. Gdy nic nie pasuje, zostaje pełna nazwa.
fn split_label(path: &str) -> String {
    let zrodlo = match path.rsplit_once('/') {
        Some((katalog, _)) => katalog.rsplit('/').next().unwrap_or(katalog).to_string(),
        None => stem_of(path),
    };
    let zrodlo = strip_shard_suffix(&zrodlo);
    let (base, label) = split_name(&zrodlo);
    match label {
        Some(label) => label,
        None if base.is_empty() => zrodlo.clone(),
        None => base,
    }
}

/// Tylko litery i cyfry, małymi - do porównywania podstawy z nazwą repozytorium.
fn normalize(text: &str) -> String {
    text.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_ascii_lowercase()
}

/// Najdłuższy wspólny fragment - ile znaków podstawa ma wspólnego z repozytorium.
fn common_run(base: &str, repo: &str) -> usize {
    let a: Vec<char> = base.chars().collect();
    let b: Vec<char> = repo.chars().collect();
    let mut best = 0;
    for i in 0..a.len() {
        for j in 0..b.len() {
            let mut len = 0;
            while i + len < a.len() && j + len < b.len() && a[i + len] == b[j + len] {
                len += 1;
            }
            best = best.max(len);
        }
    }
    best
}

/// Repozytorium bez właściciela i bez końcówki `-GGUF`, żeby porównanie
/// podstawy z nazwą repo nie łapało ogona nazwy repozytorium.
fn repo_stem(repo: &str) -> String {
    let name = repo.rsplit('/').next().unwrap_or(repo);
    let name = name
        .strip_suffix("-GGUF")
        .or_else(|| name.strip_suffix("-gguf"))
        .unwrap_or(name);
    normalize(name)
}

/// Grupa wariantów: pliki dzielące podstawę modelu.
struct Group {
    base: String,
    files: Vec<(String, u64, Option<String>)>,
    bytes: u64,
}

/// Którą grupę pokazujemy. Najpierw najdłuższy wspólny fragment z nazwą
/// repozytorium, potem **krótsza podstawa** (modele szkicujące mają przedrostek,
/// np. `eagle3-gpt-oss-20b` wobec `gpt-oss-20b`), na końcu większy rozmiar.
/// Kolejność samych grup nie może zmieniać wyniku - decyduje nazwa.
fn pick_group(groups: &[Group], repo: &str) -> usize {
    let repo = repo_stem(repo);
    let mut best = 0;
    for (index, group) in groups.iter().enumerate() {
        let (a, b) = (group, &groups[best]);
        let score_a = common_run(&normalize(&a.base), &repo);
        let score_b = common_run(&normalize(&b.base), &repo);
        let (dlugosc_a, dlugosc_b) = (a.base.chars().count(), b.base.chars().count());
        let wygrywa = score_a > score_b
            || (score_a == score_b && dlugosc_a < dlugosc_b)
            || (score_a == score_b && dlugosc_a == dlugosc_b && a.bytes > b.bytes);
        if wygrywa {
            best = index;
        }
    }
    best
}

/// Prognoza pamięci dla wariantu. Liczona **tymi samymi** funkcjami co zakładka
/// „Test", żeby wyszukiwarka i test nie mówiły o pamięci dwoma językami.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HfVariantMemory {
    pub needed_mb: u64,
    /// Zawsze `false` dla modeli z HF i to nie jest niedoróbka: HF nie podaje
    /// liczby warstw ani głów na KV, więc doliczenie pamięci kontekstu byłoby
    /// zgadywaniem. Szacunek jest więc **dolną granicą**, a interfejs musi to
    /// powiedzieć wprost - inaczej obiecałby więcej, niż model zajmie.
    pub kv_included: bool,
    pub fit: String,
}

/// Wariant modelu: jeden plik, jeden tag Ollamy.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HfVariant {
    /// Etykieta do pokazania: `Q4_K_M`, `UD-Q4_K_XL` albo pełna nazwa pliku.
    pub label: String,
    /// Czy etykieta to rozpoznana kwantyzacja (nie: cała nazwa pliku).
    pub known_quant: bool,
    pub file: String,
    /// Tag dla Ollamy: `hf.co/<repo>:<plik>`.
    pub tag: String,
    pub size_bytes: u64,
    /// Rozmiar pobrania: plik modelu **plus projektor**, gdy Ollama go dociągnie.
    pub download_bytes: u64,
    pub projector_bytes: Option<u64>,
    /// Wypełniane przez komendę, która zna pamięć tego komputera.
    pub memory: Option<HfVariantMemory>,
}

/// Gdzie wariant wyląduje w pamięci tego komputera.
///
/// KV cache nie jest doliczany (patrz `kv_included`) - dlatego wynik jest
/// dolną granicą, a nie prognozą co do megabajta.
pub fn memory_for(
    download_bytes: u64,
    free_vram_mb: u64,
    usable_ram_mb: u64,
    gpu_known: bool,
) -> HfVariantMemory {
    let (_, _, needed_mb) = estimate_model(download_bytes, None, 0);
    HfVariantMemory {
        needed_mb,
        kv_included: false,
        fit: memory_verdict(needed_mb, free_vram_mb, usable_ram_mb, gpu_known).into(),
    }
}

/// Grupa pominięta w całości (np. pliki szkicujące `eagle3-*`).
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HfSkippedGroup {
    pub base: String,
    pub files: u32,
}

#[derive(Serialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct HfFiles {
    pub variants: Vec<HfVariant>,
    /// Projektor, który Ollama dociągnie razem z modelem (jeśli jest).
    pub projector: Option<String>,
    pub projector_bytes: Option<u64>,
    pub projector_count: u32,
    /// Kwantyzacje rozbite na kawałki - pominięte, ale wypisane.
    pub skipped_split: Vec<String>,
    /// Grupy plików pomocniczych (modele szkicujące i podobne).
    pub skipped_groups: Vec<HfSkippedGroup>,
}

/// Projektor dla modelu z obrazami: Ollama bierze `Q8_0`, a gdy go nie ma -
/// najmniejszy. Zmierzone: przy `:Q4_K_M` i przy `:Q8_0` pobrała ten sam
/// `mmproj-...-Q8_0`, więc kolejność kwantyzacji modelu tu nie obowiązuje.
fn pick_projector(projectors: &[(String, u64)]) -> Option<(String, u64)> {
    if projectors.is_empty() {
        return None;
    }
    let q8 = projectors.iter().find(|(file, _)| {
        let (_, label) = split_name(&stem_of(file));
        matches!(label.as_deref(), Some("Q8_0") | Some("q8_0"))
    });
    q8.or_else(|| projectors.iter().min_by_key(|(_, size)| *size))
        .map(|(file, size)| (file.clone(), *size))
}

/// Zamienia listę plików repozytorium na warianty, notatki i rozmiar pobrania.
pub fn variants(repo: &str, files: &[(String, u64)]) -> HfFiles {
    let mut projectors: Vec<(String, u64)> = Vec::new();
    let mut skipped_split: Vec<String> = Vec::new();
    let mut groups: Vec<Group> = Vec::new();
    let mut by_base: std::collections::BTreeMap<String, usize> = std::collections::BTreeMap::new();

    for (file, size) in files {
        if !is_gguf(file) {
            continue;
        }
        if is_projector(file) {
            projectors.push((file.clone(), *size));
            continue;
        }
        if is_split(file) {
            let label = split_label(file);
            if !skipped_split.contains(&label) {
                skipped_split.push(label);
            }
            continue;
        }
        let (base, label) = split_name(&stem_of(file));
        match by_base.get(&base) {
            Some(index) => {
                groups[*index].files.push((file.clone(), *size, label));
                groups[*index].bytes += size;
            }
            None => {
                by_base.insert(base.clone(), groups.len());
                groups.push(Group {
                    base,
                    files: vec![(file.clone(), *size, label)],
                    bytes: *size,
                });
            }
        }
    }

    if groups.is_empty() {
        return HfFiles {
            skipped_split,
            projector_count: projectors.len() as u32,
            ..HfFiles::default()
        };
    }

    let chosen = pick_group(&groups, repo);
    let (projector, projector_bytes) = match pick_projector(&projectors) {
        Some((file, size)) => (Some(file), Some(size)),
        None => (None, None),
    };

    let mut variants: Vec<HfVariant> = groups[chosen]
        .files
        .iter()
        .map(|(file, size, label)| {
            let label = label.clone().unwrap_or_else(|| stem_of(file));
            HfVariant {
                label,
                known_quant: label_is_known(file),
                file: file.clone(),
                tag: format!("hf.co/{repo}:{file}"),
                size_bytes: *size,
                download_bytes: size + projector_bytes.unwrap_or(0),
                projector_bytes,
                memory: None,
            }
        })
        .collect();
    variants.sort_by(|a, b| a.size_bytes.cmp(&b.size_bytes));

    let mut skipped_groups: Vec<HfSkippedGroup> = groups
        .iter()
        .enumerate()
        .filter(|(index, _)| *index != chosen)
        .map(|(_, group)| HfSkippedGroup {
            base: group.base.clone(),
            files: group.files.len() as u32,
        })
        .collect();
    skipped_groups.sort_by(|a, b| a.base.cmp(&b.base));
    skipped_split.sort();

    HfFiles {
        variants,
        projector,
        projector_bytes,
        projector_count: projectors.len() as u32,
        skipped_split,
        skipped_groups,
    }
}

/// Czy etykieta pliku to rozpoznana kwantyzacja (do decyzji „pokazać ≈").
fn label_is_known(file: &str) -> bool {
    let (_, label) = split_name(&stem_of(file));
    match label {
        Some(label) => label
            .split('-')
            .any(is_quant_token),
        None => false,
    }
}

// ---------------------------------------------------------------------------
// Wyszukiwanie w katalogu
// ---------------------------------------------------------------------------

/// Filtry przekazywane do HF. Puste pole = przeglądanie katalogu.
#[derive(Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct HfQuery {
    #[serde(default)]
    pub search: Option<String>,
    /// Zadanie z HF (`text-generation`, `image-text-to-text`). Bez niego
    /// `filter=gguf` wpuszcza śmieci - w pierwszej trójce po popularności
    /// wypada model do rozpoznawania mowy, którego Ollama nie uruchomi.
    #[serde(default)]
    pub pipeline_tag: Option<String>,
    /// Zakres liczby parametrów, w miliardach - darmowy filtr po stronie HF.
    #[serde(default)]
    pub min_params_b: Option<f64>,
    #[serde(default)]
    pub max_params_b: Option<f64>,
    #[serde(default)]
    pub cursor: Option<String>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HfRepo {
    pub id: String,
    pub url: String,
    pub downloads: u64,
    pub likes: u64,
    pub pipeline_tag: Option<String>,
    /// Model z obrazami - pewny sygnał z zadania, nie zgadywanie z nazwy.
    pub vision: bool,
    pub last_modified: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HfSearch {
    pub repos: Vec<HfRepo>,
    pub next_cursor: Option<String>,
}

#[derive(Deserialize, Default)]
struct RawRepo {
    #[serde(default)]
    id: String,
    #[serde(default)]
    downloads: u64,
    #[serde(default)]
    likes: u64,
    #[serde(default)]
    pipeline_tag: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default, rename = "lastModified")]
    last_modified: Option<String>,
}

#[derive(Deserialize, Default)]
struct RawFile {
    #[serde(default)]
    rfilename: String,
    #[serde(default)]
    size: u64,
}

#[derive(Deserialize, Default)]
struct RawRepoFiles {
    #[serde(default)]
    siblings: Vec<RawFile>,
    /// W szczegółach repo `gated` jest (`"manual"`, `"auto"`), ale bywa `true`,
    /// `false` albo nieobecne - dlatego czytamy to jako wartość, nie jako `bool`.
    #[serde(default)]
    gated: serde_json::Value,
    /// Przychodzi tylko z `expand[]=gguf`, a i wtedy może być `null` - brak
    /// metadanych nie jest błędem, tylko brakiem.
    #[serde(default)]
    gguf: serde_json::Value,
}

/// `min:5B,max:9B` - składnia potwierdzona na żywym API (trzy zakresy trafione).
fn params_range(min: Option<f64>, max: Option<f64>) -> Option<String> {
    let czesc = |prefix: &str, value: Option<f64>| {
        value
            .filter(|v| *v > 0.0)
            .map(|v| format!("{prefix}:{}B", trim_number(v)))
    };
    let min = czesc("min", min);
    let max = czesc("max", max);
    match (min, max) {
        (None, None) => None,
        (min, max) => Some([min, max].into_iter().flatten().collect::<Vec<_>>().join(",")),
    }
}

/// `7.0` -> `7`, `1.5` -> `1.5` - HF przyjmuje oba, ale czytelniej bez zera.
fn trim_number(value: f64) -> String {
    if (value.fract()).abs() < f64::EPSILON {
        format!("{}", value as i64)
    } else {
        format!("{value}")
    }
}

/// Kursor następnej strony z nagłówka `Link`:
/// `<https://huggingface.co/api/models?...&cursor=abc>; rel="next"`.
fn next_cursor_from_link(link: &str) -> Option<String> {
    for part in link.split(',') {
        if !part.contains("rel=\"next\"") {
            continue;
        }
        let url = part.split('<').nth(1)?.split('>').next()?;
        let query = url.split('?').nth(1)?;
        for pair in query.split('&') {
            let (key, value) = pair.split_once('=')?;
            if key == "cursor" {
                return Some(value.to_string());
            }
        }
    }
    None
}

/// Parametry listy wyników. Wydzielone, bo **`expand[]` zastępuje zestaw pól,
/// a nie go rozszerza**: sprawdzone, że `?expand[]=lastModified` gubi przy tym
/// `downloads`, `pipeline_tag` i `tags` (zostają `_id`, `id`, `lastModified`,
/// `trendingScore`). Kolejność i kompletność tej listy jest więc warunkiem tego,
/// czy wiersz wyników ma z czego powstać - test niżej tego pilnuje.
fn search_params(query: &HfQuery) -> Vec<(String, String)> {
    let mut params: Vec<(String, String)> = vec![
        ("filter".into(), "gguf".into()),
        ("limit".into(), PAGE.to_string()),
        // Domyślną kolejnością HF jest popularność chwilowa (trending); przy
        // katalogu wolimy pobrania, bo to one mówią, co ludzie realnie używają.
        ("sort".into(), "downloads".into()),
        ("direction".into(), "-1".into()),
    ];
    for pole in ["downloads", "likes", "pipeline_tag", "tags", "lastModified"] {
        params.push(("expand[]".into(), pole.into()));
    }
    if let Some(text) = query.search.as_deref().map(str::trim).filter(|t| !t.is_empty()) {
        params.push(("search".into(), text.to_string()));
    }
    if let Some(tag) = query
        .pipeline_tag
        .as_deref()
        .map(str::trim)
        .filter(|t| !t.is_empty())
    {
        params.push(("pipeline_tag".into(), tag.to_string()));
    }
    if let Some(range) = params_range(query.min_params_b, query.max_params_b) {
        params.push(("num_parameters".into(), range));
    }
    if let Some(cursor) = query.cursor.as_deref().map(str::trim).filter(|t| !t.is_empty()) {
        params.push(("cursor".into(), cursor.to_string()));
    }
    params
}

/// Parametry szczegółów repozytorium. Ta sama pułapka co wyżej: `expand[]=gguf`
/// **gubi `gated`** (zostają `_id`, `id`, `siblings`), a to właśnie `gated`
/// ostrzega przed repozytorium zamkniętym - więc trzeba o nie poprosić osobno.
fn details_params() -> Vec<(String, String)> {
    vec![
        ("blobs".into(), "true".into()),
        ("expand[]".into(), "gated".into()),
        ("expand[]".into(), "gguf".into()),
    ]
}

fn gated(value: &serde_json::Value) -> bool {
    match value {
        serde_json::Value::Bool(flag) => *flag,
        serde_json::Value::String(text) => text != "false",
        _ => false,
    }
}

/// Odczyt nagłówka `Retry-After`. HF podaje sekundy, ale nagłówek może też być
/// datą - wtedy nie zgadujemy, tylko mówimy „za chwilę".
fn retry_after(value: Option<&str>) -> u64 {
    value
        .and_then(|text| text.trim().parse::<u64>().ok())
        .unwrap_or(30)
}

pub async fn search(query: &HfQuery) -> Result<HfSearch, String> {
    let client = client()?;
    let response = client
        .get(format!("{HF_API}/models"))
        .query(&search_params(query))
        .send()
        .await
        .map_err(|error| msg("hf.not_responding", &[("error", &error.to_string())]))?;

    let status = response.status();
    if status.as_u16() == 429 {
        let seconds = retry_after(
            response
                .headers()
                .get("retry-after")
                .and_then(|value| value.to_str().ok()),
        );
        return Err(msg("hf.rate_limited", &[("seconds", &seconds.to_string())]));
    }
    if !status.is_success() {
        return Err(msg("hf.returned", &[("status", &status.to_string())]));
    }

    let next_cursor = response
        .headers()
        .get("link")
        .and_then(|value| value.to_str().ok())
        .and_then(next_cursor_from_link);

    let raw: Vec<RawRepo> = response
        .json()
        .await
        .map_err(|error| msg("hf.bad_response", &[("error", &error.to_string())]))?;

    let repos = raw
        .into_iter()
        .filter(|repo| !repo.id.is_empty())
        .map(|repo| HfRepo {
            vision: repo.pipeline_tag.as_deref() == Some("image-text-to-text")
                || repo.tags.iter().any(|tag| tag == "image-text-to-text"),
            url: format!("{HF_WEB}/{}", repo.id),
            id: repo.id,
            downloads: repo.downloads,
            likes: repo.likes,
            pipeline_tag: repo.pipeline_tag,
            last_modified: repo.last_modified,
        })
        .collect();

    Ok(HfSearch { repos, next_cursor })
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HfRepoDetails {
    pub repo: String,
    pub url: String,
    pub files: HfFiles,
    /// Repozytorium zamknięte. Ollama obsługuje je **swoim kluczem SSH**, nie
    /// tokenem API - więc interfejs nie może obiecywać, że wystarczy coś wpisać.
    pub gated: bool,
    pub context_length: Option<u64>,
    pub architecture: Option<String>,
}

/// Jedno zapytanie na repozytorium: `blobs=true` daje rozmiar każdego pliku,
/// a `expand[]` architekturę, maksymalny kontekst i informację o zamknięciu.
/// Sprawdzone, że działają razem; `blobs=true` na **liście** wyników zwraca
/// pustą listę plików, więc na jedno repozytorium wypada jedno zapytanie.
pub async fn repo_details(repo: &str) -> Result<HfRepoDetails, String> {
    let client = client()?;
    let response = client
        .get(format!("{HF_API}/models/{repo}"))
        .query(&details_params())
        .send()
        .await
        .map_err(|error| msg("hf.not_responding", &[("error", &error.to_string())]))?;

    let status = response.status();
    if status.as_u16() == 429 {
        let seconds = retry_after(
            response
                .headers()
                .get("retry-after")
                .and_then(|value| value.to_str().ok()),
        );
        return Err(msg("hf.rate_limited", &[("seconds", &seconds.to_string())]));
    }
    if status.as_u16() == 404 {
        return Err(msg("hf.repo_missing", &[("repo", repo)]));
    }
    // Nieistniejące repozytorium HF odpowiada **401**, nie 404 - nie zdradza,
    // czy coś istnieje. Dlatego komunikat mówi obie możliwości naraz, zamiast
    // twierdzić, że repozytorium na pewno nie ma.
    if matches!(status.as_u16(), 401 | 403) {
        return Err(msg(
            "hf.repo_forbidden",
            &[("status", &status.to_string())],
        ));
    }
    if !status.is_success() {
        return Err(msg("hf.returned", &[("status", &status.to_string())]));
    }

    let raw: RawRepoFiles = response
        .json()
        .await
        .map_err(|error| msg("hf.bad_response", &[("error", &error.to_string())]))?;

    let files: Vec<(String, u64)> = raw
        .siblings
        .iter()
        .filter(|file| !file.rfilename.is_empty())
        .map(|file| (file.rfilename.clone(), file.size))
        .collect();

    Ok(HfRepoDetails {
        url: format!("{HF_WEB}/{repo}"),
        files: variants(repo, &files),
        gated: gated(&raw.gated),
        context_length: raw
            .gguf
            .get("context_length")
            .and_then(serde_json::Value::as_u64),
        architecture: raw
            .gguf
            .get("architecture")
            .and_then(serde_json::Value::as_str)
            .map(str::to_string),
        repo: repo.to_string(),
    })
}

// ---------------------------------------------------------------------------
// Testy
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// Prawdziwe pliki z `ggml-org/gpt-oss-20b-GGUF` (rozmiary z `blobs=true`).
    fn gpt_oss() -> Vec<(String, u64)> {
        vec![
            ("eagle3-gpt-oss-20b-BF16.gguf".into(), 1_722_588_800),
            ("eagle3-gpt-oss-20b-Q8_0.gguf".into(), 921_488_000),
            ("gpt-oss-20b-MXFP4.gguf".into(), 12_109_566_624),
        ]
    }

    /// Prawdziwe pliki z `ggml-org/SmolVLM2-256M-Video-Instruct-GGUF`.
    fn smolvlm() -> Vec<(String, u64)> {
        vec![
            ("SmolVLM2-256M-Video-Instruct-BF16.gguf".into(), 327_811_456),
            ("SmolVLM2-256M-Video-Instruct-Q4_K_M.gguf".into(), 131_234_176),
            ("SmolVLM2-256M-Video-Instruct-Q8_0.gguf".into(), 175_056_256),
            ("SmolVLM2-256M-Video-Instruct-f16.gguf".into(), 327_811_552),
            ("mmproj-SmolVLM2-256M-Video-Instruct-BF16.gguf".into(), 190_033_376),
            ("mmproj-SmolVLM2-256M-Video-Instruct-Q8_0.gguf".into(), 103_771_616),
            ("mmproj-SmolVLM2-256M-Video-Instruct-f16.gguf".into(), 190_033_440),
        ]
    }

    #[test]
    fn draft_files_are_not_quants() {
        let result = variants("ggml-org/gpt-oss-20b-GGUF", &gpt_oss());
        // Zapowiedź błędu, który ten test wyłapuje: gdyby pliki szkicujące
        // weszły jako warianty, lista pokazałaby trzy kwantyzacje, z których
        // dwie Ollama uruchomi jako model sam w sobie - i to słaby.
        assert_eq!(result.variants.len(), 1);
        assert_eq!(result.variants[0].label, "MXFP4");
        assert!(result.variants[0].known_quant);
        assert_eq!(result.skipped_groups.len(), 1);
        assert_eq!(result.skipped_groups[0].base, "eagle3-gpt-oss-20b");
        assert_eq!(result.skipped_groups[0].files, 2);
    }

    #[test]
    fn projector_is_not_a_variant_but_is_added_to_the_download() {
        let result = variants("ggml-org/SmolVLM2-256M-Video-Instruct-GGUF", &smolvlm());
        assert_eq!(result.variants.len(), 4);
        assert_eq!(result.projector_count, 3);
        assert_eq!(
            result.projector.as_deref(),
            Some("mmproj-SmolVLM2-256M-Video-Instruct-Q8_0.gguf")
        );

        let q4 = result
            .variants
            .iter()
            .find(|variant| variant.label == "Q4_K_M")
            .expect("wariant Q4_K_M");
        // Zmierzone na żywo: `ollama pull` pobrał 131 MB + 104 MB projektora.
        assert_eq!(q4.size_bytes, 131_234_176);
        assert_eq!(q4.download_bytes, 131_234_176 + 103_771_616);
        assert_eq!(q4.projector_bytes, Some(103_771_616));
    }

    #[test]
    fn projector_prefers_q8_and_falls_back_to_the_smallest() {
        let bez_q8 = vec![
            ("mmproj-BF16.gguf".to_string(), 190_033_376),
            ("mmproj-f16.gguf".to_string(), 190_033_440),
        ];
        let (file, size) = pick_projector(&bez_q8).expect("projektor");
        assert_eq!(file, "mmproj-BF16.gguf");
        assert_eq!(size, 190_033_376);
    }

    /// Prawdziwe pliki z `ggml-org/InternVL3-2B-Instruct-GGUF` (rozmiary z
    /// `blobs=true`). **Drugi VLM i inna rodzina niż SmolVLM**, żeby reguła
    /// projektora nie opierała się na jednym przypadku.
    fn internvl() -> Vec<(String, u64)> {
        vec![
            ("InternVL3-2B-Instruct-Q4_K_M.gguf".into(), 1_116_758_816),
            ("InternVL3-2B-Instruct-Q8_0.gguf".into(), 1_893_671_520),
            ("InternVL3-2B-Instruct-f16.gguf".into(), 3_558_801_120),
            ("mmproj-InternVL3-2B-Instruct-Q8_0.gguf".into(), 337_012_000),
            ("mmproj-InternVL3-2B-Instruct-f16.gguf".into(), 628_237_600),
        ]
    }

    /// Prawdziwe pliki z `ggml-org/gemma-3-4b-it-GGUF`: **jeden projektor i to
    /// bez `Q8_0`**, w dodatku o innym kształcie nazwy (`mmproj-model-f16`, bez
    /// nazwy modelu). Tu działa wyłącznie zapas „najmniejszy” - bez tego
    /// przypadku reguła byłaby sprawdzona tylko w połowie.
    fn gemma3() -> Vec<(String, u64)> {
        vec![
            ("gemma-3-4b-it-Q4_K_M.gguf".into(), 2_489_757_856),
            ("gemma-3-4b-it-Q8_0.gguf".into(), 4_130_226_336),
            ("gemma-3-4b-it-f16.gguf".into(), 7_767_474_336),
            ("mmproj-model-f16.gguf".into(), 851_251_104),
        ]
    }

    #[test]
    fn second_vision_model_gets_the_q8_projector() {
        let result = variants("ggml-org/InternVL3-2B-Instruct-GGUF", &internvl());
        assert_eq!(result.variants.len(), 3, "projektory nie są wariantami");
        assert_eq!(result.projector_count, 2);
        assert_eq!(
            result.projector.as_deref(),
            Some("mmproj-InternVL3-2B-Instruct-Q8_0.gguf")
        );

        let q4 = result
            .variants
            .iter()
            .find(|variant| variant.label == "Q4_K_M")
            .expect("wariant Q4_K_M");
        assert_eq!(q4.download_bytes, 1_116_758_816 + 337_012_000);
    }

    #[test]
    fn a_repo_with_a_single_projector_uses_it() {
        let result = variants("ggml-org/gemma-3-4b-it-GGUF", &gemma3());
        assert_eq!(result.variants.len(), 3);
        assert_eq!(result.projector_count, 1);
        assert_eq!(result.projector.as_deref(), Some("mmproj-model-f16.gguf"));

        let q4 = result
            .variants
            .iter()
            .find(|variant| variant.label == "Q4_K_M")
            .expect("wariant Q4_K_M");
        assert_eq!(q4.projector_bytes, Some(851_251_104));
        assert_eq!(q4.download_bytes, 2_489_757_856 + 851_251_104);
    }

    #[test]
    fn split_shards_are_listed_as_labels() {
        let files = vec![
            (
                "Hermes-3-Llama-3.1-70B-Q5_K_M/Hermes-3-Llama-3.1-70B-Q5_K_M-00001-of-00002.gguf".into(),
                39_875_467_488,
            ),
            (
                "Hermes-3-Llama-3.1-70B-Q5_K_M/Hermes-3-Llama-3.1-70B-Q5_K_M-00002-of-00002.gguf".into(),
                10_074_349_600,
            ),
            (
                "Hermes-3-Llama-3.1-70B-Q8_0/Hermes-3-Llama-3.1-70B-Q8_0-00001-of-00002.gguf".into(),
                39_808_936_192,
            ),
        ];
        let result = variants("bartowski/Hermes-3-Llama-3.1-70B-GGUF", &files);
        assert!(result.variants.is_empty());
        assert_eq!(result.skipped_split, vec!["Q5_K_M", "Q8_0"]);
    }

    #[test]
    fn shards_in_the_repository_root_are_detected_too() {
        assert!(is_split("Swift-Qwen3.8-27B-F16-00001-of-00003.gguf"));
        assert!(is_split("Q4_K_M/model-00001-of-00002.gguf"));
        assert!(!is_split("Llama-3.2-3B-Instruct-Q4_K_M.gguf"));
    }

    #[test]
    fn unsloth_release_prefix_keeps_plain_variants_in_one_group() {
        // `unsloth/Qwen3-8B-GGUF` ma obok siebie `Q4_K_M` i `UD-Q4_K_XL` - ten
        // sam model, inne wydanie. Bez reguły na `UD-` rozjechałyby się na dwie
        // grupy i połowa kwantyzacji zniknęłaby z listy jako „pominięte".
        let files = vec![
            ("Qwen3-8B-Q4_K_M.gguf".into(), 5_027_784_512),
            ("Qwen3-8B-Q8_0.gguf".into(), 8_709_519_168),
            ("Qwen3-8B-UD-Q4_K_XL.gguf".into(), 5_135_722_304),
            ("Qwen3-8B-UD-Q8_K_XL.gguf".into(), 10_824_038_208),
        ];
        let result = variants("unsloth/Qwen3-8B-GGUF", &files);
        let labels: Vec<&str> = result.variants.iter().map(|v| v.label.as_str()).collect();
        assert_eq!(labels, vec!["Q4_K_M", "UD-Q4_K_XL", "Q8_0", "UD-Q8_K_XL"]);
        assert!(result.skipped_groups.is_empty());
        assert_eq!(split_name("Qwen3-8B-UD-Q4_K_XL"), ("Qwen3-8B".into(), Some("UD-Q4_K_XL".into())));
    }

    #[test]
    fn mode_suffix_stays_in_the_label() {
        assert_eq!(
            split_name("Model-IQ2_XS-mtp"),
            ("Model".into(), Some("IQ2_XS-mtp".into()))
        );
    }

    #[test]
    fn recognized_quant_families() {
        for token in [
            "Q4_K_M", "Q6_K", "Q8_0", "Q4_0_4_4", "Q3_K_XL", "IQ3_M", "IQ4_XS", "IQ2_XXS", "F16",
            "f16", "BF16", "MXFP4",
        ] {
            assert!(is_quant_token(token), "{token} powinien być kwantyzacją");
        }
        for token in ["Qwen3", "Instruct", "27B", "gguf", "Hermes", "RCO", "mtp"] {
            assert!(!is_quant_token(token), "{token} nie jest kwantyzacją");
        }
    }

    #[test]
    fn unknown_quant_falls_back_to_the_whole_name() {
        // Realny przykład z planu: `GSQ-RCO` nie należy do znanych rodzin, więc
        // wariantem zostaje cała nazwa - i tak działa jako tag Ollamy.
        let files = vec![("Model-GSQ-RCO.gguf".to_string(), 4_000_000_000)];
        let result = variants("ktos/Model-GGUF", &files);
        assert_eq!(result.variants.len(), 1);
        assert_eq!(result.variants[0].label, "Model-GSQ-RCO");
        assert!(!result.variants[0].known_quant);
        assert_eq!(result.variants[0].tag, "hf.co/ktos/Model-GGUF:Model-GSQ-RCO.gguf");
    }

    #[test]
    fn repo_without_gguf_files_gives_nothing_not_junk() {
        // `nvidia_Llama-3_1-Nemotron-70B-Instruct-HF-GGUF` nazywa się GGUF
        // i nie ma ani jednego pliku GGUF.
        let files = vec![
            ("README.md".to_string(), 1000),
            ("model.safetensors".to_string(), 999),
        ];
        let result = variants("nvidia/x-GGUF", &files);
        assert!(result.variants.is_empty());
        assert!(result.projector.is_none());
    }

    #[test]
    fn tag_always_carries_the_quantization() {
        // Ollama bez kwantyzacji wybiera plik sama (domyślnie Q4_K_M), więc
        // pokazany rozmiar i pobrany plik mogłyby być różne.
        let result = variants("ggml-org/SmolVLM2-256M-Video-Instruct-GGUF", &smolvlm());
        for variant in &result.variants {
            assert!(
                variant.tag.contains(&format!(":{}", variant.file)),
                "tag bez nazwy pliku: {}",
                variant.tag
            );
        }
    }

    #[test]
    fn params_range_matches_the_hf_syntax() {
        assert_eq!(params_range(Some(5.0), Some(9.0)).as_deref(), Some("min:5B,max:9B"));
        assert_eq!(params_range(Some(70.0), None).as_deref(), Some("min:70B"));
        assert_eq!(params_range(None, Some(4.0)).as_deref(), Some("max:4B"));
        assert_eq!(params_range(Some(1.5), Some(2.0)).as_deref(), Some("min:1.5B,max:2B"));
        assert_eq!(params_range(None, None), None);
        assert_eq!(params_range(Some(0.0), None), None);
    }

    /// Werdykt musi być ten sam, co w zakładce „Test": 4 GB wagi na karcie
    /// z 5 GB wolnego to „na karcie", a 40 GB przy karcie i RAM-ie razem
    /// to „nie zmieści się".
    #[test]
    fn memory_hint_speaks_the_same_verdict_as_the_test_tab() {
        let fits = memory_for(4_000_000_000, 5_120, 3_823, true);
        assert_eq!(fits.fit, crate::forecast::FIT_ON_GPU);
        // 4 000 000 000 B = 3814 MB wag + 64 MB bufora obliczeń.
        assert_eq!(fits.needed_mb, 3_878);
        assert!(!fits.kv_included);

        let tight = memory_for(5_100_000_000, 5_120, 3_823, true);
        assert_eq!(tight.fit, crate::forecast::FIT_ON_GPU_TIGHT);

        let partial = memory_for(6_500_000_000, 5_120, 3_823, true);
        assert_eq!(partial.fit, crate::forecast::FIT_PARTIAL_CPU);

        let never = memory_for(40_000_000_000, 5_120, 3_823, true);
        assert_eq!(never.fit, crate::forecast::FIT_NO_FIT);

        // Bez NVML nie wiemy nic o karcie i tak to nazywamy.
        let unknown = memory_for(4_000_000_000, 0, 3_823, false);
        assert_eq!(unknown.fit, crate::forecast::FIT_UNKNOWN_GPU);
    }

    /// Pułapka, która kosztowała jedno kółko pomiarów: `expand[]` **zastępuje**
    /// zestaw pól, a nie go rozszerza. Bez imiennego wypisania `pipeline_tag`,
    /// `tags` i `downloads` wiersz wyników nie ma z czego powstać, a bez
    /// `expand[]=gated` znika ostrzeżenie o repozytorium zamkniętym.
    #[test]
    fn expand_replaces_the_field_set_so_we_ask_for_every_field_by_name() {
        let query = HfQuery {
            search: Some("qwen3".into()),
            pipeline_tag: Some("text-generation".into()),
            min_params_b: Some(4.0),
            max_params_b: Some(9.0),
            cursor: None,
        };
        let params = search_params(&query);
        let pola: Vec<&str> = params
            .iter()
            .filter(|(key, _)| key == "expand[]")
            .map(|(_, value)| value.as_str())
            .collect();
        for pole in ["downloads", "likes", "pipeline_tag", "tags", "lastModified"] {
            assert!(pola.contains(&pole), "brak expand[]={pole}");
        }
        assert!(params.contains(&("filter".to_string(), "gguf".to_string())));
        assert!(params.contains(&("num_parameters".to_string(), "min:4B,max:9B".to_string())));
        assert!(params.contains(&("pipeline_tag".to_string(), "text-generation".to_string())));
        assert!(!params.iter().any(|(key, _)| key == "cursor"));

        let szczegoly = details_params();
        assert!(szczegoly.contains(&("blobs".to_string(), "true".to_string())));
        assert!(szczegoly.contains(&("expand[]".to_string(), "gated".to_string())));
        assert!(szczegoly.contains(&("expand[]".to_string(), "gguf".to_string())));
    }

    #[test]
    fn next_cursor_comes_from_the_link_header() {
        let link = "<https://huggingface.co/api/models?filter=gguf&limit=20&cursor=eyJpIjoiYTQifQ%3D%3D>; rel=\"next\"";
        assert_eq!(
            next_cursor_from_link(link).as_deref(),
            Some("eyJpIjoiYTQifQ%3D%3D")
        );
        assert_eq!(next_cursor_from_link(""), None);
        assert_eq!(
            next_cursor_from_link("<https://huggingface.co/api/models?limit=20>; rel=\"prev\""),
            None
        );
    }

    #[test]
    fn gated_is_read_from_both_a_string_and_a_flag() {
        assert!(gated(&serde_json::Value::String("manual".into())));
        assert!(gated(&serde_json::Value::String("auto".into())));
        assert!(gated(&serde_json::Value::Bool(true)));
        assert!(!gated(&serde_json::Value::String("false".into())));
        assert!(!gated(&serde_json::Value::Bool(false)));
        assert!(!gated(&serde_json::Value::Null));
    }

    #[test]
    fn retry_after_falls_back_when_the_header_is_a_date() {
        assert_eq!(retry_after(Some("120")), 120);
        assert_eq!(retry_after(Some("Wed, 21 Oct 2026 07:28:00 GMT")), 30);
        assert_eq!(retry_after(None), 30);
    }

    #[test]
    fn best_group_wins_on_the_common_part() {
        let mut groups = vec![
            Group {
                base: "eagle3-gpt-oss-20b".into(),
                files: vec![],
                bytes: 2_644_076_800,
            },
            Group {
                base: "gpt-oss-20b".into(),
                files: vec![],
                bytes: 12_109_566_624,
            },
        ];
        let wybrany = pick_group(&groups, "ggml-org/gpt-oss-20b-GGUF");
        assert_eq!(groups[wybrany].base, "gpt-oss-20b");

        // Odwrotna kolejność grup nie może zmienić wyniku - inaczej wybór
        // zależałby od kolejności plików w odpowiedzi HF.
        groups.reverse();
        let wybrany = pick_group(&groups, "ggml-org/gpt-oss-20b-GGUF");
        assert_eq!(groups[wybrany].base, "gpt-oss-20b");
    }

    #[test]
    fn one_group_repo_keeps_every_variant() {
        let files = vec![
            ("Llama-3.2-3B-Instruct-Q4_K_M.gguf".into(), 2_019_000_000),
            ("Llama-3.2-3B-Instruct-f16.gguf".into(), 6_433_000_000),
        ];
        let result = variants("bartowski/Llama-3.2-3B-Instruct-GGUF", &files);
        assert_eq!(result.variants.len(), 2);
        // Sortowanie po rozmiarze: najmniejsze pierwsze, bo to one wejdą na kartę.
        assert_eq!(result.variants[0].label, "Q4_K_M");
        assert!(result.skipped_groups.is_empty());
        assert!(result.projector.is_none());
    }
}
