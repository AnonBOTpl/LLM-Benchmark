//! VRAM forecast: "will the models I selected fit on this card?"
//!
//! The estimate is deliberately built from things we can actually know:
//!
//! * models already in memory get their **exact** size from `/api/ps`,
//! * models on disk get weights from `/api/tags` plus a KV cache computed from
//!   the architecture metadata in `/api/show` (`block_count`,
//!   `attention.head_count_kv`, `embedding_length`),
//! * memory used by everything else on the card is `used - what Ollama holds`,
//!   read from NVML.
//!
//! It is still an estimate - the UI says so - but it is not a guess. Measured
//! on this machine: `qwen2.5-coder:3b` (a 1841 MB file, `num_ctx` 8192) was
//! really 2292 MB in `/api/ps`, while this formula gives 1841 + 288 + 64 =
//! 2193 MB, about 4% under.

use serde::{Deserialize, Serialize};

use crate::ollama;
use crate::sysmem::{Ram, RAM_RESERVE_MB};

/// Ollama alokuje bufor obliczeń obok wag i KV cache. Na tej maszynie różnica
/// między rozmiarem pliku a zajętością VRAM wynosiła ~40-70 MB, więc przyjmujemy
/// jawną, stałą rezerwę zamiast udawać, że znamy ją dokładnie.
const GRAPH_OVERHEAD_MB: u64 = 64;

/// Poniżej tego marginesu mówimy „zmieści się na styk" - alokacja Ollamy nie
/// jest co do bajtu przewidywalna, więc dokładne „mieści się" to za mało.
const TIGHT_RATIO: f64 = 0.08;
const TIGHT_MIN_MB: i64 = 512;

/// Domyślny kontekst Ollamy, gdy model nie ma zapisanego `num_ctx` i nie
/// znamy jego własnego limitu.
const DEFAULT_CONTEXT: u64 = 4096;

/// Ile z **wolnej** VRAM uznajemy za komfortowe. Poniżej 80% mówimy „na
/// karcie", powyżej - „na karcie, ale ciasno": Ollama alokuje bufor obliczeń
/// obok wag, a sterownik zostawia sobie kawałek pamięci karty.
const GPU_COMFORT_RATIO: f64 = 0.8;

pub const STATUS_LOADED: &str = "loaded";
pub const STATUS_ESTIMATED: &str = "estimated";
pub const STATUS_MISSING: &str = "missing";
pub const STATUS_CPU: &str = "cpu";

// Uwagi zwracamy jako **kody**, nie zdania. Backend nie wie, w jakim języku
// mówi interfejs, więc copy należy do frontendu - tutaj tylko stwierdzamy fakt.
pub const NOTE_CPU_ONLY: &str = "forecast.cpu_only";
pub const NOTE_NOT_DOWNLOADED: &str = "forecast.not_downloaded";
pub const NOTE_NO_ARCHITECTURE: &str = "forecast.no_architecture_metadata";
pub const NOTE_MULTIMODAL: &str = "forecast.multimodal";
pub const NOTE_NO_TARGETS: &str = "forecast.no_targets";
pub const NOTE_NVML_UNAVAILABLE: &str = "forecast.nvml_unavailable";
pub const NOTE_ESTIMATE: &str = "forecast.estimate_explained";
pub const NOTE_NOTHING_LOADED: &str = "forecast.nothing_loaded";
pub const NOTE_PARTIAL_OFFLOAD: &str = "forecast.partial_offload";

// Cztery stany pamięci + jeden uczciwy wyjątek. To też są **kody**, nie zdania:
// backend stwierdza fakt („zmieści się na karcie, ale ciasno"), a zdanie po
// polsku, angielsku czy japońsku dobiera interfejs.
pub const FIT_ON_GPU: &str = "on_gpu";
pub const FIT_ON_GPU_TIGHT: &str = "on_gpu_tight";
pub const FIT_PARTIAL_CPU: &str = "partial_cpu";
pub const FIT_NO_FIT: &str = "no_fit";
/// NVML nie odpowiada, więc o karcie nie wiemy nic - sprawdzony został tylko RAM.
pub const FIT_UNKNOWN_GPU: &str = "unknown_gpu";

/// Czy model zmieści się w pamięci tego komputera - i gdzie wyląduje.
///
/// Model **nie jest** albo-albo: to, co nie mieści się na karcie, Ollama
/// rozkłada między kartę i RAM. Dlatego werdykt mówi „częściowo na CPU", a nie
/// „za duże" - to różnica między „wolno" a „wcale".
pub fn memory_verdict(
    needed_mb: u64,
    free_vram_mb: u64,
    usable_ram_mb: u64,
    gpu_known: bool,
) -> &'static str {
    if !gpu_known {
        // Bez NVML nie wiemy, ile karta ma wolnego. Zgadywanie stanu karty
        // byłoby kłamstwem, więc mówimy wprost, że sprawdzony został tylko RAM.
        return FIT_UNKNOWN_GPU;
    }
    if needed_mb <= ((free_vram_mb as f64) * GPU_COMFORT_RATIO) as u64 {
        FIT_ON_GPU
    } else if needed_mb <= free_vram_mb {
        FIT_ON_GPU_TIGHT
    } else if needed_mb <= free_vram_mb.saturating_add(usable_ram_mb) {
        FIT_PARTIAL_CPU
    } else {
        FIT_NO_FIT
    }
}

/// Kolejność ważności stanów - do wyboru najgorszego z nich.
fn severity(fit: &str) -> u8 {
    match fit {
        FIT_ON_GPU => 0,
        FIT_ON_GPU_TIGHT => 1,
        FIT_PARTIAL_CPU => 2,
        FIT_UNKNOWN_GPU => 3,
        _ => 4,
    }
}

/// Werdykt dla całego zestawu to **najgorszy** ze stanów. Jeden model, który się
/// nie zmieści, psuje cały przebieg, więc branie najlepszego (albo średniej)
/// byłoby wprowadzaniem w błąd.
pub fn worst_verdict<'a>(fits: impl IntoIterator<Item = &'a str>) -> Option<&'a str> {
    fits.into_iter().max_by_key(|fit| severity(fit))
}

pub fn bytes_to_mb(bytes: u64) -> u64 {
    bytes / 1_048_576
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ForecastTarget {
    pub model: String,
    #[serde(default)]
    pub num_ctx: Option<u32>,
    #[serde(default)]
    pub num_gpu: Option<i32>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModelForecast {
    pub model: String,
    /// `loaded` | `estimated` | `missing` | `cpu`.
    pub status: String,
    pub weights_mb: Option<u64>,
    pub kv_mb: u64,
    /// Ile VRAM zajmie ten model według szacunku.
    pub total_mb: u64,
    pub context: Option<u64>,
    /// Gdzie ten model wyląduje: `on_gpu` | `on_gpu_tight` | `partial_cpu` |
    /// `no_fit` | `unknown_gpu`. `None`, gdy nie ma czego porównywać (model
    /// niepobrany, wymuszony na CPU).
    pub fit: Option<String>,
    pub note: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Forecast {
    /// Czy NVML w ogóle działa - bez tego nie ma z czym porównywać.
    pub available: bool,
    pub total_mb: u64,
    /// Bieżące użycie całej karty (NVML).
    pub used_mb: u64,
    /// Użycie karty poza Ollamą: pulpit, gry, inne aplikacje.
    pub other_mb: u64,
    /// Ile karty jest wolne **teraz** (= total - other).
    pub free_vram_mb: u64,
    pub required_mb: u64,
    /// Ile zostanie wolne po wczytaniu wszystkiego; wartość ujemna = brakuje.
    pub headroom_mb: i64,
    pub fits: bool,
    /// Mieści się, ale bez zapasu - warto się temu przyjrzeć.
    pub tight: bool,
    /// Werdykt zbiorczy: najgorszy stan w całym zestawie.
    pub verdict: Option<String>,
    pub ram_total_mb: u64,
    pub ram_available_mb: u64,
    /// Wolny RAM po odjęciu rezerwy dla systemu - tyle możemy zaangażować.
    pub ram_usable_mb: u64,
    pub ram_reserve_mb: u64,
    pub models: Vec<ModelForecast>,
    pub notes: Vec<String>,
}

/// Wagi + KV cache + rezerwa na bufor obliczeń.
pub fn estimate_model(
    weights_bytes: u64,
    kv_per_token_bytes: Option<u64>,
    context: u64,
) -> (u64, u64, u64) {
    let weights_mb = bytes_to_mb(weights_bytes);
    let kv_mb = kv_per_token_bytes
        .map(|per_token| per_token.saturating_mul(context) / 1_048_576)
        .unwrap_or(0);
    (weights_mb, kv_mb, weights_mb + kv_mb + GRAPH_OVERHEAD_MB)
}

/// Wolna pamięć karty: budżet pomniejsza to, co zajmują **inne** programy, a nie
/// modele wczytane przez Ollamę - te można zwolnić przed testem. Wyszukiwarka
/// liczy tym samym wzorem co zakładka „Test", żeby obie mówiły o pamięci tak
/// samo; dlatego to funkcja, a nie dwie kopie tych samych dwóch odejmowań.
/// Clamp do zera, bo między odczytem NVML a listą wczytanych modeli mija chwila
/// i wartości potrafią się „minąć".
pub fn free_after_other_apps(total_mb: u64, used_mb: u64, loaded_mb: u64) -> u64 {
    total_mb.saturating_sub(used_mb.saturating_sub(loaded_mb))
}

/// Czy przy takim zapasie mówimy „na styk".
pub fn is_tight(headroom_mb: i64, total_mb: u64) -> bool {
    if headroom_mb < 0 {
        return false;
    }
    let margin = ((total_mb as f64) * TIGHT_RATIO) as i64;
    headroom_mb < margin.max(TIGHT_MIN_MB)
}

pub async fn forecast(
    targets: &[ForecastTarget],
    total_mb: u64,
    used_mb: u64,
    nvml_available: bool,
    ram: Ram,
) -> Forecast {
    let mut notes: Vec<String> = Vec::new();
    let mut models: Vec<ModelForecast> = Vec::new();

    if targets.is_empty() {
        notes.push(NOTE_NO_TARGETS.into());
    }

    let loaded = ollama::loaded_models().await.unwrap_or_default();
    let loaded_mb: u64 = loaded.iter().map(|entry| bytes_to_mb(entry.size_bytes)).sum();
    let other_mb = used_mb.saturating_sub(loaded_mb);
    let free_vram_mb = free_after_other_apps(total_mb, used_mb, loaded_mb);
    let usable_ram_mb = ram.usable_mb();

    let mut any_estimate = false;
    let mut any_partial_offload = false;

    for target in targets {
        let in_memory = loaded
            .iter()
            .find(|entry| ollama::tag_matches(&entry.name, &target.model));

        if let Some(entry) = in_memory {
            models.push(ModelForecast {
                model: target.model.clone(),
                status: STATUS_LOADED.into(),
                weights_mb: None,
                kv_mb: 0,
                total_mb: bytes_to_mb(entry.size_bytes),
                context: entry.context_length.or(target.num_ctx.map(u64::from)),
                // Już siedzi w pamięci, więc to nie prognoza, a fakt.
                fit: Some(FIT_ON_GPU.into()),
                note: None,
            });
            continue;
        }

        if target.num_gpu == Some(0) {
            models.push(ModelForecast {
                model: target.model.clone(),
                status: STATUS_CPU.into(),
                weights_mb: None,
                kv_mb: 0,
                total_mb: 0,
                context: target.num_ctx.map(u64::from),
                // `num_gpu = 0` to wybór użytkownika, a nie wynik porównania
                // z pamięcią - werdykt zostaje pusty, a fakt tłumaczy uwaga.
                fit: None,
                note: Some(NOTE_CPU_ONLY.into()),
            });
            continue;
        }

        let sizing = match ollama::model_sizing(&target.model).await {
            Some(sizing) if sizing.size_bytes.is_some() => sizing,
            _ => {
                models.push(ModelForecast {
                    model: target.model.clone(),
                    status: STATUS_MISSING.into(),
                    weights_mb: None,
                    kv_mb: 0,
                    total_mb: 0,
                    context: target.num_ctx.map(u64::from),
                    // Bez pliku nie znamy rozmiaru, więc nie ma czego porównywać.
                    fit: None,
                    note: Some(NOTE_NOT_DOWNLOADED.into()),
                });
                continue;
            }
        };

        let context = target
            .num_ctx
            .map(u64::from)
            .or(sizing.context_length)
            .unwrap_or(DEFAULT_CONTEXT);
        let (weights_mb, kv_mb, total) = estimate_model(
            sizing.size_bytes.unwrap_or(0),
            sizing.kv_per_token_bytes,
            context,
        );
        any_estimate = true;

        if target.num_gpu.is_some() {
            any_partial_offload = true;
        }

        let mut note = None;
        if sizing.kv_per_token_bytes.is_none() {
            note = Some(NOTE_NO_ARCHITECTURE.into());
        } else if sizing.capabilities.iter().any(|capability| capability == "vision") {
            note = Some(NOTE_MULTIMODAL.into());
        }

        models.push(ModelForecast {
            model: target.model.clone(),
            status: STATUS_ESTIMATED.into(),
            weights_mb: Some(weights_mb),
            kv_mb,
            total_mb: total,
            context: Some(context),
            fit: Some(memory_verdict(total, free_vram_mb, usable_ram_mb, nvml_available).into()),
            note,
        });
    }

    let required_mb: u64 = models.iter().map(|model| model.total_mb).sum();
    let headroom_mb = total_mb as i64 - other_mb as i64 - required_mb as i64;
    let fits = nvml_available && headroom_mb >= 0;
    let tight = nvml_available && is_tight(headroom_mb, total_mb);

    if !nvml_available {
        notes.push(NOTE_NVML_UNAVAILABLE.into());
    } else if !targets.is_empty() {
        notes.push(NOTE_ESTIMATE.into());
    }
    if any_estimate && models.iter().all(|model| model.status != STATUS_LOADED) {
        notes.push(NOTE_NOTHING_LOADED.into());
    }
    if any_partial_offload {
        notes.push(NOTE_PARTIAL_OFFLOAD.into());
    }

    let verdict = worst_verdict(models.iter().filter_map(|model| model.fit.as_deref()))
        .map(str::to_string);

    Forecast {
        available: nvml_available,
        total_mb,
        used_mb,
        other_mb,
        free_vram_mb,
        required_mb,
        headroom_mb,
        fits,
        tight,
        verdict,
        ram_total_mb: ram.total_mb,
        ram_available_mb: ram.available_mb,
        ram_usable_mb: usable_ram_mb,
        ram_reserve_mb: RAM_RESERVE_MB,
        models,
        notes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Realny przypadek zmierzony na tej maszynie: plik 1841 MB, kontekst 8192,
    /// KV 36 864 B/token (≈288 MB) - `/api/ps` pokazał 2292 MB.
    #[test]
    fn estimate_matches_measured_coder_footprint() {
        let (weights, kv, total) = estimate_model(1_930_000_000, Some(36_864), 8192);
        assert_eq!(weights, 1840);
        assert_eq!(kv, 288);
        assert_eq!(total, 1840 + 288 + GRAPH_OVERHEAD_MB);

        // Zmierzone 2292 MB - szacunek nie może się rozmijać o więcej niż 10%.
        let measured = 2292u64;
        let diff = (total as f64 - measured as f64).abs() / measured as f64;
        assert!(diff < 0.10, "różnica {:.1}%", diff * 100.0);
    }

    /// Bez metadanych architektury nie udajemy, że KV nie istnieje - po prostu
    /// nie doliczamy go, a UI dostaje o tym notkę.
    #[test]
    fn estimate_without_kv_metadata_counts_weights_only() {
        let (weights, kv, total) = estimate_model(1_000_000_000, None, 8192);
        assert_eq!(weights, 953);
        assert_eq!(kv, 0);
        assert_eq!(total, 953 + GRAPH_OVERHEAD_MB);
    }

    /// Modele wczytane przez Ollamę nie odbierają budżetu (można je zwolnić),
    /// a pamięć zajęta przez inne programy - tak. Wartości poniżej zera nie
    /// mogą się pojawić, gdy odczyty miną się w czasie.
    #[test]
    fn free_memory_ignores_ollama_models_but_not_other_apps() {
        assert_eq!(free_after_other_apps(6144, 1443, 0), 4701);
        assert_eq!(free_after_other_apps(6144, 1443, 2292), 6144);
        assert_eq!(free_after_other_apps(6144, 500, 900), 6144);
        assert_eq!(free_after_other_apps(6144, 8000, 0), 0);
    }

    #[test]
    fn context_scales_kv_linearly() {
        let (_, small, _) = estimate_model(0, Some(36_864), 2048);
        let (_, large, _) = estimate_model(0, Some(36_864), 8192);
        assert_eq!(small, 72);
        assert_eq!(large, 288);
        assert_eq!(large, small * 4);
    }

    /// Uwagi są kodami, nie zdaniami - inaczej backend decydowałby o języku UI.
    #[test]
    fn notes_are_stable_codes_not_sentences() {
        for code in [
            NOTE_CPU_ONLY,
            NOTE_NOT_DOWNLOADED,
            NOTE_NO_ARCHITECTURE,
            NOTE_MULTIMODAL,
            NOTE_NO_TARGETS,
            NOTE_NVML_UNAVAILABLE,
            NOTE_ESTIMATE,
            NOTE_NOTHING_LOADED,
            NOTE_PARTIAL_OFFLOAD,
            FIT_ON_GPU,
            FIT_ON_GPU_TIGHT,
            FIT_PARTIAL_CPU,
            FIT_NO_FIT,
            FIT_UNKNOWN_GPU,
        ] {
            assert!(
                code.is_ascii() && !code.contains(' '),
                "kod uwagi ma być identyfikatorem: {code:?}"
            );
        }
    }

    #[test]
    fn tight_when_margin_is_below_the_threshold() {
        assert!(!is_tight(-1, 6144), "brak miejsca to nie 'na styk'");
        assert!(is_tight(0, 6144));
        assert!(is_tight(400, 6144), "mniej niż 512 MB zapasu");
        assert!(!is_tight(1024, 6144), "ponad 8% wolnego");
        // Na dużej karcie 8% to więcej niż 512 MB, więc próg rośnie.
        assert!(is_tight(1000, 24576));
        assert!(!is_tight(2500, 24576));
    }

    /// Progi czterech stanów na liczbach z tej maszyny: ~5 GB wolnej karty
    /// i ~7 GB RAM po odjęciu rezerwy, czyli budżet ~12 GB.
    #[test]
    fn verdict_bounds_follow_the_measured_machine() {
        let (vram, ram) = (5_000u64, 7_000u64);

        // Komfort to 80% wolnej karty - 4 000 MB z 5 000.
        assert_eq!(memory_verdict(4_000, vram, ram, true), FIT_ON_GPU);
        assert_eq!(memory_verdict(4_001, vram, ram, true), FIT_ON_GPU_TIGHT);
        assert_eq!(memory_verdict(5_000, vram, ram, true), FIT_ON_GPU_TIGHT);

        // Powyżej karty, ale w zasięgu karta + RAM: model ruszy, tylko wolno.
        assert_eq!(memory_verdict(5_001, vram, ram, true), FIT_PARTIAL_CPU);
        assert_eq!(memory_verdict(12_000, vram, ram, true), FIT_PARTIAL_CPU);

        // 13 200 MB z planu przekracza budżet - na tym komputerze nie wstanie.
        assert_eq!(memory_verdict(13_200, vram, ram, true), FIT_NO_FIT);
        assert_eq!(memory_verdict(12_001, vram, ram, true), FIT_NO_FIT);
    }

    /// Bez NVML nie udajemy, że znamy stan karty - nawet dla modelu, który
    /// zmieściłby się w samym RAM-ie.
    #[test]
    fn unknown_gpu_is_not_guessed() {
        assert_eq!(memory_verdict(100, 0, 7_000, false), FIT_UNKNOWN_GPU);
        assert_eq!(memory_verdict(999_000, 0, 7_000, false), FIT_UNKNOWN_GPU);
    }

    /// Karta zajęta do zera (albo bez NVML) to nie „ciasno" - model idzie na CPU,
    /// o ile zmieści się w samym RAM-ie.
    #[test]
    fn empty_card_falls_back_to_ram() {
        assert_eq!(memory_verdict(1_000, 0, 7_000, true), FIT_PARTIAL_CPU);
        assert_eq!(memory_verdict(8_000, 0, 7_000, true), FIT_NO_FIT);
    }

    /// Werdykt zbiorczy bierze najgorszy stan: jeden model, który się nie
    /// zmieści, psuje cały przebieg, więc uśrednianie byłoby kłamstwem.
    #[test]
    fn worst_verdict_picks_the_grimmest_state() {
        assert_eq!(
            worst_verdict([FIT_ON_GPU, FIT_ON_GPU_TIGHT]),
            Some(FIT_ON_GPU_TIGHT)
        );
        assert_eq!(
            worst_verdict([FIT_PARTIAL_CPU, FIT_ON_GPU, FIT_NO_FIT]),
            Some(FIT_NO_FIT)
        );
        assert_eq!(
            worst_verdict([FIT_ON_GPU, FIT_ON_GPU]),
            Some(FIT_ON_GPU)
        );
        let empty: [&str; 0] = [];
        assert_eq!(worst_verdict(empty), None::<&str>);
    }
}
