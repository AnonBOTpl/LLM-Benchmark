//! Ollama REST client: model pull and streamed generation.
//!
//! Everything goes through Rust instead of the webview so that we never hit
//! CORS restrictions (`OLLAMA_ORIGINS`) and so we can measure timing + VRAM
//! while a request is in flight.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter};

use crate::messages::msg;

pub const TOKEN_EVENT: &str = "bench-token";
pub const PULL_EVENT: &str = "pull-progress";

/// Respects `OLLAMA_HOST` when it is set, defaults to the standard local port.
pub fn base_url() -> String {
    match std::env::var("OLLAMA_HOST") {
        Ok(host) if !host.trim().is_empty() => {
            let host = host.trim().trim_end_matches('/').to_string();
            if host.starts_with("http://") || host.starts_with("https://") {
                host
            } else {
                format!("http://{host}")
            }
        }
        _ => "http://127.0.0.1:11434".to_string(),
    }
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct InstalledModel {
    pub name: String,
    /// Rozmiar na dysku w bajtach (z `/api/tags`).
    pub size: u64,
    /// Umiejętności zgłaszane przez Ollamę. Dla modeli multimodalnych zawiera
    /// `vision` - to jedyny wiarygodny sygnał, że model obsługuje obrazy.
    pub capabilities: Vec<String>,
    /// Sugerowane id kategorii, liczone lokalnie z `capabilities` i nazwy -
    /// dzięki temu model na dysku dostaje podpowiedź bez pytania rejestru.
    pub suggested_kind: Option<String>,
    /// "capabilities" (pewne) albo "name" (heurystyka).
    pub suggestion_source: Option<String>,
    /// Maksymalny kontekst modelu - podstawa dla proponowanego `num_ctx`.
    pub context_length: Option<u64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OllamaStatus {
    pub running: bool,
    pub version: Option<String>,
    pub installed: Vec<InstalledModel>,
    pub endpoint: String,
    pub error: Option<String>,
}

#[derive(Deserialize)]
struct VersionResponse {
    version: Option<String>,
}

#[derive(Deserialize)]
struct TagModel {
    name: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    capabilities: Vec<String>,
    #[serde(default)]
    details: Option<ShowDetails>,
}

#[derive(Deserialize)]
struct TagsResponse {
    #[serde(default)]
    models: Vec<TagModel>,
}

pub async fn status() -> OllamaStatus {
    let endpoint = base_url();
    let mut result = OllamaStatus {
        running: false,
        version: None,
        installed: vec![],
        endpoint: endpoint.clone(),
        error: None,
    };

    let c = match client() {
        Ok(c) => c,
        Err(e) => {
            result.error = Some(e);
            return result;
        }
    };

    match c
        .get(format!("{endpoint}/api/version"))
        .timeout(Duration::from_secs(4))
        .send()
        .await
    {
        Ok(res) if res.status().is_success() => {
            if let Ok(v) = res.json::<VersionResponse>().await {
                result.version = v.version;
            }
            result.running = true;
        }
        Ok(res) => {
            result.error = Some(msg(
                "ollama.status",
                &[("status", &res.status().to_string())],
            ));
            return result;
        }
        Err(e) => {
            result.error = Some(msg(
                "ollama.unreachable",
                &[("endpoint", &endpoint), ("error", &e.to_string())],
            ));
            return result;
        }
    }

    if let Ok(res) = c
        .get(format!("{endpoint}/api/tags"))
        .timeout(Duration::from_secs(6))
        .send()
        .await
    {
        if let Ok(tags) = res.json::<TagsResponse>().await {
            result.installed = tags
                .models
                .into_iter()
                .map(|m| {
                    let (kind, source) = suggest_kind(&m.name, &m.capabilities);
                    let context_length = m
                        .details
                        .as_ref()
                        .and_then(|details| details.context_length);
                    InstalledModel {
                        name: m.name,
                        size: m.size,
                        capabilities: m.capabilities,
                        suggested_kind: kind,
                        suggestion_source: source,
                        context_length,
                    }
                })
                .collect();
        }
    }

    result
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct PullChunk {
    status: Option<String>,
    total: Option<u64>,
    completed: Option<u64>,
    error: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PullProgress {
    model: String,
    status: String,
    total: Option<u64>,
    completed: Option<u64>,
    percent: Option<f64>,
    done: bool,
    error: Option<String>,
}

fn emit_pull(app: &AppHandle, model: &str, chunk: PullChunk, done: bool) {
    let percent = match (chunk.completed, chunk.total) {
        // Zabezpieczenie przed wartościami spoza zakresu: procent nigdy nie
        // może wyjść poza 0-100, niezależnie od tego, co przyśle Ollama.
        (Some(done_b), Some(total)) if total > 0 => {
            Some((done_b as f64 / total as f64 * 100.0).clamp(0.0, 100.0))
        }
        _ => None,
    };
    let _ = app.emit(
        PULL_EVENT,
        PullProgress {
            model: model.to_string(),
            status: chunk.status.unwrap_or_default(),
            total: chunk.total,
            completed: chunk.completed,
            percent,
            done,
            error: chunk.error,
        },
    );
}

/// Streams `POST /api/pull` and forwards progress through the `pull-progress`
/// event. Returns an error only when the pull itself failed.
pub async fn pull(app: &AppHandle, model: &str) -> Result<(), String> {
    let endpoint = base_url();
    let c = client()?;

    let res = c
        .post(format!("{endpoint}/api/pull"))
        .json(&json!({ "model": model, "stream": true }))
        .send()
        .await
        .map_err(|e| {
            msg(
                "ollama.connect_failed",
                &[("endpoint", &endpoint), ("error", &e.to_string())],
            )
        })?;

    if !res.status().is_success() {
        let code = res.status();
        let body = res.text().await.unwrap_or_default();
        let message = msg(
            "ollama.returned",
            &[("status", &code.to_string()), ("detail", body.trim())],
        );
        emit_pull(
            app,
            model,
            PullChunk {
                status: None,
                total: None,
                completed: None,
                error: Some(message.clone()),
            },
            true,
        );
        return Err(message);
    }

    let mut stream = res.bytes_stream();
    let mut buf: Vec<u8> = Vec::new();
    // Postęp liczymy **dla bieżącej warstwy**. Ollama przysyła `total`
    // i `completed` jednej warstwy naraz, a rozmiary warstw różnią się
    // drastycznie (jedna z nich to np. 90-bajtowy manifest). Dlatego zmiana
    // `total` oznacza nową warstwę i zeruje licznik - bez tego resztka dużej
    // warstwy zderzona z małą dawała w UI 97 638 328%.
    let mut layer_total: Option<u64> = None;
    let mut layer_completed: Option<u64> = None;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        buf.extend_from_slice(&chunk);

        while let Some(pos) = buf.iter().position(|b| *b == b'\n') {
            let line: Vec<u8> = buf.drain(..=pos).collect();
            let text = String::from_utf8_lossy(&line);
            let text = text.trim();
            if text.is_empty() {
                continue;
            }
            let Ok(mut parsed) = serde_json::from_str::<PullChunk>(text) else {
                continue;
            };
            if let Some(total) = parsed.total {
                if layer_total != Some(total) {
                    layer_total = Some(total);
                    layer_completed = Some(0);
                }
            }
            if let Some(completed) = parsed.completed {
                layer_completed = Some(completed);
            } else {
                // Końcowe kroki ("verifying sha256 digest", "success") nie
                // niosą licznika - zostawiamy ostatni znany dla tej warstwy,
                // żeby pasek nie cofał się do stanu "nie wiadomo ile".
                parsed.completed = layer_completed;
            }
            parsed.total = layer_total;

            if let Some(err) = parsed.error.clone() {
                emit_pull(app, model, parsed, true);
                return Err(err);
            }
            emit_pull(app, model, parsed, false);
        }
    }

    emit_pull(
        app,
        model,
        PullChunk {
            status: Some("success".into()),
            total: layer_total,
            // Sukces = ostatnia warstwa pobrana w całości.
            completed: layer_total.or(layer_completed),
            error: None,
        },
        true,
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Info o modelu (rozmiar do pobrania) + usuwanie z dysku
// ---------------------------------------------------------------------------

const REGISTRY: &str = "https://registry.ollama.ai";

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub tag: String,
    /// "local" gdy model jest już na dysku, "registry" gdy dane pochodzą z rejestru.
    pub source: String,
    pub size_bytes: Option<u64>,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
    pub family: Option<String>,
    /// Umiejętności zgłaszane przez Ollamę - puste dla modeli spoza dysku
    /// (rejestr ich nie publikuje).
    #[serde(default)]
    pub capabilities: Vec<String>,
    /// Sugerowane id kategorii z configu (`coding` | `chat` | `vlm`).
    pub suggested_kind: Option<String>,
    /// Skąd pochodzi sugestia: "capabilities" (pewne) albo "name" (heurystyka).
    pub suggestion_source: Option<String>,
    /// Czy szablon modelu w ogóle korzysta z pola `system`. `false` znaczy, że
    /// system prompt jest po cichu ignorowany (tak ma np. moondream).
    pub supports_system: Option<bool>,
    pub error: Option<String>,
}

#[derive(Deserialize, Default)]
struct ShowDetails {
    #[serde(default)]
    parameter_size: Option<String>,
    #[serde(default)]
    quantization_level: Option<String>,
    #[serde(default)]
    family: Option<String>,
    #[serde(default)]
    context_length: Option<u64>,
}

#[derive(Deserialize, Default)]
struct ShowResponse {
    #[serde(default)]
    details: Option<ShowDetails>,
    #[serde(default)]
    capabilities: Vec<String>,
    #[serde(default)]
    template: Option<String>,
    /// Pełne metadane architektury (`qwen2.block_count`, `phi2.attention.head_count_kv`, ...).
    /// Bez nich nie da się policzyć KV cache, a bez tego ostrzeżenie o VRAM
    /// byłoby zgadywaniem na podstawie samego rozmiaru pliku.
    #[serde(default)]
    model_info: serde_json::Map<String, serde_json::Value>,
}

/// Czy szablon modelu zawiera `{{ .System }}`. Bez tego pola Ollama nie ma
/// gdzie wstawić system promptu i po cichu go pomija - np. szablon moondreama to
/// `Question: {{ .Prompt }} Answer: {{ .Response }}`.
fn template_supports_system(template: Option<&str>) -> Option<bool> {
    template.map(|value| value.contains(".System"))
}

#[derive(Deserialize, Default)]
struct RegistryManifest {
    #[serde(default)]
    layers: Vec<RegistryBlob>,
    #[serde(default)]
    config: Option<RegistryBlob>,
}

#[derive(Deserialize, Default)]
struct RegistryBlob {
    #[serde(default)]
    digest: String,
    #[serde(default)]
    size: u64,
}

#[derive(Deserialize, Default)]
struct RegistryConfig {
    #[serde(default)]
    model_type: Option<String>,
    #[serde(default)]
    file_type: Option<String>,
    #[serde(default)]
    model_family: Option<String>,
}

/// Ollama zapisuje "qwen3:8b" jako nazwę+tag, a brak tagu oznacza `latest`.
fn split_tag(tag: &str) -> (String, String) {
    match tag.split_once(':') {
        Some((name, reference)) if !reference.trim().is_empty() => {
            (name.trim().to_string(), reference.trim().to_string())
        }
        _ => (tag.trim().to_string(), "latest".to_string()),
    }
}

/// Buduje ścieżkę repozytorium w rejestrze: modele oficjalne mieszkają pod
/// `library/`, własne pod `uzytkownik/nazwa`.
fn registry_repo(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(msg("registry.name_required", &[]));
    }

    let parts: Vec<&str> = name.split('/').collect();
    match parts.len() {
        // "qwen2.5-coder" -> model oficjalny (kropka w nazwie jest normalna!)
        1 => Ok(format!("library/{name}")),
        // "uzytkownik/model"
        2 => Ok(name.to_string()),
        // "hf.co/uzytkownik/model" - obcy rejestr, tam nie pytamy
        _ => {
            let host = parts[0];
            if host.contains('.') || host.contains(':') {
                Err(msg("registry.foreign", &[("host", host)]))
            } else {
                Ok(name.to_string())
            }
        }
    }
}

pub(crate) fn tag_matches(installed: &str, tag: &str) -> bool {
    if installed == tag {
        return true;
    }
    let (name, reference) = split_tag(tag);
    reference == "latest" && installed == format!("{name}:latest")
}

/// Rozmiar modelu i jego podstawowe parametry. Najpierw pytamy lokalną Ollamę,
/// a gdy modelu nie ma na dysku - rejestr Ollamy o manifest.
pub async fn model_info(tag: &str) -> ModelInfo {
    let tag = tag.trim().to_string();
    let mut info = ModelInfo {
        tag: tag.clone(),
        source: "registry".into(),
        size_bytes: None,
        parameter_size: None,
        quantization_level: None,
        family: None,
        capabilities: vec![],
        suggested_kind: None,
        suggestion_source: None,
        supports_system: None,
        error: None,
    };

    if tag.is_empty() {
        info.error = Some(msg("ollama.tag_required", &[]));
        return info;
    }

    let client = match client() {
        Ok(client) => client,
        Err(error) => {
            info.error = Some(error);
            return info;
        }
    };

    // 1. Czy model jest już lokalnie?
    match client
        .post(format!("{}/api/show", base_url()))
        .json(&json!({ "model": tag }))
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Err(error) => {
            info.error = Some(msg("ollama.not_responding", &[("error", &error.to_string())]));
            return info;
        }
        Ok(response) if response.status().is_success() => {
            info.source = "local".into();
            if let Ok(show) = response.json::<ShowResponse>().await {
                info.capabilities = show.capabilities;
                info.supports_system = template_supports_system(show.template.as_deref());
                if let Some(details) = show.details {
                    info.parameter_size = details.parameter_size;
                    info.quantization_level = details.quantization_level;
                    info.family = details.family;
                }
            }
            if let Ok(response) = client
                .get(format!("{}/api/tags", base_url()))
                .timeout(Duration::from_secs(6))
                .send()
                .await
            {
                if let Ok(tags) = response.json::<TagsResponse>().await {
                    for model in tags.models {
                        if tag_matches(&model.name, &tag) {
                            info.size_bytes = Some(model.size);
                        }
                    }
                }
            }
            return with_suggestion(info);
        }
        // 404 = nie ma lokalnie, sprawdzamy rejestr
        Ok(_) => {}
    }

    // 2. Manifest z rejestru: suma warstw to dokładnie to, co poleci do pobrania.
    let repo = match registry_repo(&split_tag(&tag).0) {
        Ok(repo) => repo,
        Err(message) => {
            info.error = Some(message);
            return info;
        }
    };
    let (_, reference) = split_tag(&tag);
    let url = format!("{REGISTRY}/v2/{repo}/manifests/{reference}");

    let manifest = match client
        .get(&url)
        .header(
            "Accept",
            "application/vnd.docker.distribution.manifest.v2+json",
        )
        .timeout(Duration::from_secs(20))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => response,
        Ok(response) => {
            info.error = Some(msg(
                "registry.not_found",
                &[("status", &response.status().to_string())],
            ));
            return info;
        }
        Err(error) => {
            info.error = Some(msg("registry.unreachable", &[("error", &error.to_string())]));
            return info;
        }
    };

    let manifest = match manifest.json::<RegistryManifest>().await {
        Ok(manifest) => manifest,
        Err(error) => {
            info.error = Some(msg("registry.manifest_failed", &[("error", &error.to_string())]));
            return info;
        }
    };

    let total: u64 = manifest.layers.iter().map(|layer| layer.size).sum();
    if total > 0 {
        info.size_bytes = Some(total);
    }

    // Config blob zawiera rozmiar parametrów i kwantyzację - miło wiedzieć
    // przed pobraniem, ale nie jest krytyczne.
    if let Some(config) = manifest.config {
        let blob_url = format!("{REGISTRY}/v2/{repo}/blobs/{}", config.digest);
        if let Ok(response) = client
            .get(&blob_url)
            .timeout(Duration::from_secs(20))
            .send()
            .await
        {
            if let Ok(config) = response.json::<RegistryConfig>().await {
                info.parameter_size = config.model_type;
                info.quantization_level = config.file_type;
                info.family = config.model_family;
            }
        }
    }

    if info.size_bytes.is_none() && info.error.is_none() {
        info.error = Some(msg("registry.no_size", &[]));
    }
    with_suggestion(info)
}

// ---------------------------------------------------------------------------
// Rozmiar modelu potrzebny do ostrzeżenia o VRAM
// ---------------------------------------------------------------------------

/// Metadane potrzebne do oszacowania pamięci: wagi z `/api/tags` oraz KV cache
/// policzony z `model_info`.
#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ModelSizing {
    pub tag: String,
    pub size_bytes: Option<u64>,
    pub context_length: Option<u64>,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
    pub capabilities: Vec<String>,
    /// Bajty KV cache na jeden token kontekstu (f16). `None` = brak metadanych
    /// (model niepobrany albo Ollama nie podaje architektury).
    pub kv_per_token_bytes: Option<u64>,
}

/// Klucze `model_info` są prefiksowane architekturą (`qwen2.`, `phi2.`, `llama.`),
/// więc szukamy po sufiksie zamiast wpisywać nazwę rodziny na sztywno.
fn info_number(
    map: &serde_json::Map<String, serde_json::Value>,
    suffix: &str,
) -> Option<u64> {
    map.iter()
        .find(|(key, _)| key.ends_with(suffix))
        .and_then(|(_, value)| value.as_u64())
}

/// KV cache: dwa tensory (K i V) po 2 bajty (f16) na element.
///
/// `head_dim` bierzemy z `embedding_length / head_count`, a gdy się nie dzieli
/// (albo embeddingu nie ma) - z `rope.dimension_count`, tak jak robi to
/// llama.cpp. `head_count_kv` jest mniejsze od `head_count` przy GQA, a to
/// właśnie ono decyduje o rozmiarze cache.
///
/// Zweryfikowane empirycznie na tej maszynie: dla `qwen2.5-coder:3b` daje
/// 36 864 B/token, a `/api/ps` pokazuje przyrost 38 912 B/token przy zmianie
/// kontekstu 8192 → 16384 (różnica ~5%, głównie zaokrąglenia alokacji).
pub fn kv_per_token_bytes(
    model_info: &serde_json::Map<String, serde_json::Value>,
) -> Option<u64> {
    let layers = info_number(model_info, ".block_count")?;
    let kv_heads = info_number(model_info, ".attention.head_count_kv")?;
    let heads = info_number(model_info, ".attention.head_count")?;
    let embedding = info_number(model_info, ".embedding_length")?;
    if layers == 0 || kv_heads == 0 || heads == 0 {
        return None;
    }
    let head_dim = if embedding > 0 && embedding % heads == 0 {
        embedding / heads
    } else {
        info_number(model_info, ".rope.dimension_count")?
    };
    if head_dim == 0 {
        return None;
    }
    Some(2 * layers * kv_heads * head_dim * 2)
}

/// Rozmiar i architektura modelu z lokalnej Ollamy. `None` oznacza, że modelu
/// nie ma na dysku (albo nie udało się go odpytać) - wtedy nie da się
/// oszacować pamięci i mówimy o tym wprost.
pub async fn model_sizing(tag: &str) -> Option<ModelSizing> {
    let tag = tag.trim();
    if tag.is_empty() {
        return None;
    }
    let client = client().ok()?;

    let response = client
        .post(format!("{}/api/show", base_url()))
        .json(&json!({ "model": tag }))
        .timeout(Duration::from_secs(8))
        .send()
        .await
        .ok()?;
    if !response.status().is_success() {
        return None;
    }
    let show = response.json::<ShowResponse>().await.ok()?;

    let mut sizing = ModelSizing {
        tag: tag.to_string(),
        context_length: show.details.as_ref().and_then(|d| d.context_length),
        parameter_size: show.details.as_ref().and_then(|d| d.parameter_size.clone()),
        quantization_level: show
            .details
            .as_ref()
            .and_then(|d| d.quantization_level.clone()),
        capabilities: show.capabilities.clone(),
        kv_per_token_bytes: kv_per_token_bytes(&show.model_info),
        ..Default::default()
    };

    if let Ok(response) = client
        .get(format!("{}/api/tags", base_url()))
        .timeout(Duration::from_secs(6))
        .send()
        .await
    {
        if let Ok(tags) = response.json::<TagsResponse>().await {
            for model in tags.models {
                if tag_matches(&model.name, tag) {
                    sizing.size_bytes = Some(model.size);
                }
            }
        }
    }

    Some(sizing)
}

// ---------------------------------------------------------------------------
// Zgadywanie przeznaczenia modelu
// ---------------------------------------------------------------------------

/// Ollama **nie publikuje** przeznaczenia modelu ("kodowanie" / "rozmowa") -
/// ani w `/api/show`, ani w `/api/tags`, ani w manifeście rejestru. Jedynym
/// twardym sygnałem są `capabilities` (dla modeli na dysku), gdzie `vision`
/// jednoznacznie oznacza model multimodalny. Reszta to heurystyka z nazwy,
/// dlatego zwracamy też źródło sugestii, żeby UI mogło je pokazać.
fn name_suggests_kind(tag: &str) -> Option<&'static str> {
    let lower = tag.to_lowercase();
    // Nazwa bez tagu ("qwen2.5-coder:7b" -> "qwen2.5-coder"), żeby "7b" nie
    // przypadkiem nie wpadało w żadną regułę.
    let name = lower.split(':').next().unwrap_or(&lower).to_string();

    let has_segment = |needle: &str| {
        name.split(['-', '_', '.', '/', ' '])
            .any(|part| part == needle)
    };

    // 1. Multimodalne - najwęższa grupa, więc sprawdzana pierwsza.
    const VLM_HINTS: [&str; 12] = [
        "llava",
        "bakllava",
        "moondream",
        "smolvlm",
        "minicpm-v",
        "internvl",
        "pixtral",
        "granite-vision",
        "llama3.2-vision",
        "qwen2-vl",
        "qwen2.5vl",
        "qwen2.5-vl",
    ];
    if VLM_HINTS.iter().any(|hint| name.contains(hint)) || has_segment("vl") {
        return Some("vlm");
    }

    // 2. Kodowanie.
    const CODING_HINTS: [&str; 12] = [
        "coder",
        "codestral",
        "codegemma",
        "starcoder",
        "sqlcoder",
        "magicoder",
        "wizardcoder",
        "deepseek-coder",
        "devstral",
        "phind",
        "opencoder",
        "granite-code",
    ];
    if CODING_HINTS.iter().any(|hint| name.contains(hint)) {
        return Some("coding");
    }

    // 3. Rodziny konwersacyjne.
    const CHAT_HINTS: [&str; 22] = [
        "qwen",
        "llama",
        "mistral",
        "mixtral",
        "gemma",
        "gemini",
        "phi",
        "dolphin",
        "vicuna",
        "deepseek",
        "granite",
        "hermes",
        "command-r",
        "nemotron",
        "smollm",
        "tinyllama",
        "olmo",
        "exaone",
        "yi",
        "falcon",
        "gpt-oss",
        "aya",
    ];
    if CHAT_HINTS.iter().any(|hint| name.contains(hint)) {
        return Some("chat");
    }

    // Nie znamy przeznaczenia - lepiej nie zgadywać, użytkownik wybierze sam.
    None
}

fn with_suggestion(mut info: ModelInfo) -> ModelInfo {
    let (kind, source) = suggest_kind(&info.tag, &info.capabilities);
    info.suggested_kind = kind;
    info.suggestion_source = source;
    info
}

fn suggest_kind(tag: &str, capabilities: &[String]) -> (Option<String>, Option<String>) {
    if capabilities
        .iter()
        .any(|capability| capability.eq_ignore_ascii_case("vision"))
    {
        return (Some("vlm".to_string()), Some("capabilities".to_string()));
    }
    match name_suggests_kind(tag) {
        Some(kind) => (Some(kind.to_string()), Some("name".to_string())),
        None => (None, None),
    }
}

// ---------------------------------------------------------------------------
// Pamięć: co siedzi w VRAM (`/api/ps`) i sterowanie `keep_alive`
// ---------------------------------------------------------------------------

/// Jak długo model zostaje w pamięci po ręcznym załadowaniu.
const LOAD_KEEP_ALIVE: &str = "30m";

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoadedModel {
    pub name: String,
    /// Cała pamięć zajęta przez model (wagi + kontekst).
    pub size_bytes: u64,
    /// Część tej pamięci trzymana na GPU. Reszta to warstwy policzone na CPU.
    pub size_vram_bytes: u64,
    /// Procent pamięci modelu na GPU. To podział warstw/pamięci, a nie czasu
    /// liczenia - Ollama nie udostępnia podziału czasu między CPU i GPU.
    pub gpu_percent: Option<f64>,
    pub expires_at: Option<String>,
    pub context_length: Option<u64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoadOutcome {
    pub model: String,
    /// "load" albo "unload".
    pub action: String,
    pub elapsed_ms: f64,
    /// Stan modelu po załadowaniu (przy wyładowaniu: `None`).
    pub loaded: Option<LoadedModel>,
}

#[derive(Deserialize, Default)]
struct PsModel {
    #[serde(default)]
    name: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    size_vram: u64,
    #[serde(default)]
    expires_at: Option<String>,
    #[serde(default)]
    context_length: Option<u64>,
}

#[derive(Deserialize, Default)]
struct PsResponse {
    #[serde(default)]
    models: Vec<PsModel>,
}

#[derive(Deserialize, Default)]
struct OllamaError {
    #[serde(default)]
    error: String,
}

fn gpu_percent(size: u64, size_vram: u64) -> Option<f64> {
    if size == 0 {
        return None;
    }
    Some(size_vram as f64 / size as f64 * 100.0)
}

/// `GET /api/ps` - modele trzymane teraz w pamięci.
pub async fn loaded_models() -> Result<Vec<LoadedModel>, String> {
    let client = client()?;
    let response = client
        .get(format!("{}/api/ps", base_url()))
        .timeout(Duration::from_secs(6))
        .send()
        .await
        .map_err(|error| msg("ollama.memory_state", &[("error", &error.to_string())]))?;

    if !response.status().is_success() {
        return Err(msg(
            "ollama.returned_status",
            &[("status", &response.status().to_string())],
        ));
    }

    let parsed = response
        .json::<PsResponse>()
        .await
        .map_err(|error| msg("ollama.memory_state", &[("error", &error.to_string())]))?;

    Ok(parsed
        .models
        .into_iter()
        .map(|model| LoadedModel {
            gpu_percent: gpu_percent(model.size, model.size_vram),
            name: model.name,
            size_bytes: model.size,
            size_vram_bytes: model.size_vram,
            expires_at: model.expires_at,
            context_length: model.context_length,
        })
        .collect())
}

/// `keep_alive` przez `/api/generate` bez promptu: dodatnia wartość ładuje
/// model z góry (bez czekania na pierwszy prompt), `0` wyładowuje go z pamięci.
async fn keep_alive(model: &str, keep_alive: serde_json::Value) -> Result<(), String> {
    let client = client()?;
    let response = client
        .post(format!("{}/api/generate", base_url()))
        .json(&json!({ "model": model, "keep_alive": keep_alive, "stream": false }))
        .timeout(Duration::from_secs(600))
        .send()
        .await
        .map_err(|error| msg("ollama.connect", &[("error", &error.to_string())]))?;

    if response.status().is_success() {
        return Ok(());
    }

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let message = serde_json::from_str::<OllamaError>(&body)
        .ok()
        .filter(|parsed| !parsed.error.is_empty())
        .map(|parsed| parsed.error)
        .unwrap_or_else(|| body.trim().to_string());

    if status.as_u16() == 404 {
        return Err(msg("ollama.model_not_downloaded", &[("model", model)]));
    }
    Err(msg(
        "ollama.returned",
        &[("status", &status.to_string()), ("detail", &message)],
    ))
}

/// Ładuje model do pamięci albo go z niej usuwa. Wyładowanie modelu, którego
/// nie ma w pamięci, jest traktowane jak sukces (efekt jest ten sam).
pub async fn set_loaded(model: &str, load: bool) -> Result<LoadOutcome, String> {
    let tag = model.trim();
    if tag.is_empty() {
        return Err(msg("ollama.tag_required", &[]));
    }

    let started = Instant::now();
    let keep = if load {
        json!(LOAD_KEEP_ALIVE)
    } else {
        json!(0)
    };
    keep_alive(tag, keep).await?;

    let loaded = if load {
        loaded_models()
            .await
            .unwrap_or_default()
            .into_iter()
            .find(|entry| tag_matches(&entry.name, tag))
    } else {
        None
    };

    Ok(LoadOutcome {
        model: tag.to_string(),
        action: if load { "load" } else { "unload" }.to_string(),
        elapsed_ms: started.elapsed().as_secs_f64() * 1000.0,
        loaded,
    })
}

/// `DELETE /api/delete` - usuwa model z dysku. Brak modelu traktujemy jako
/// sukces, bo efekt jest ten sam.
pub async fn delete_model(model: &str) -> Result<(), String> {
    let client = client()?;
    let response = client
        .delete(format!("{}/api/delete", base_url()))
        .json(&json!({ "model": model }))
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|error| msg("ollama.connect", &[("error", &error.to_string())]))?;

    if response.status().is_success() || response.status().as_u16() == 404 {
        return Ok(());
    }

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    Err(msg(
        "ollama.returned",
        &[("status", &status.to_string()), ("detail", body.trim())],
    ))
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TokenEvent {
    pub model: String,
    pub category_id: String,
    pub prompt_index: usize,
    pub token: String,
}

#[derive(Deserialize, Default)]
struct GenChunk {
    response: Option<String>,
    done: Option<bool>,
    error: Option<String>,
    eval_count: Option<u64>,
    eval_duration: Option<u64>,
    prompt_eval_count: Option<u64>,
    load_duration: Option<u64>,
}

/// Progi sensowności pomiaru. Ollama potrafi zwrócić `eval_count: 1` i
/// `eval_duration: 1000` (1 µs) dla **pustej odpowiedzi** - dzielenie tych
/// liczb daje 1 000 000 tok/s, czyli wartość, która nie ma nic wspólnego
/// z rzeczywistością. Lepiej pokazać brak danych niż liczbę z kosmosu.
const MIN_EVAL_TOKENS: u64 = 2;
const MIN_EVAL_DURATION_NS: u64 = 20_000_000; // 20 ms

fn tokens_per_sec(eval_count: Option<u64>, eval_duration_ns: Option<u64>) -> Option<f64> {
    let (count, duration) = (eval_count?, eval_duration_ns?);
    if count < MIN_EVAL_TOKENS || duration < MIN_EVAL_DURATION_NS {
        return None;
    }
    Some(count as f64 / (duration as f64 / 1e9))
}

#[derive(Default, Clone, Debug)]
pub struct GenOutcome {
    pub response: String,
    /// Time to the first streamed token, measured from the moment the request
    /// was sent (so a cold model load is included).
    pub ttft_ms: Option<f64>,
    pub total_ms: f64,
    pub eval_count: Option<u64>,
    pub eval_duration_ns: Option<u64>,
    pub tokens_per_sec: Option<f64>,
    pub measured_tokens_per_sec: Option<f64>,
    pub load_ms: Option<f64>,
    pub error: Option<String>,
}

struct StreamState {
    response: String,
    first_token_at: Option<Instant>,
    ttft_ms: Option<f64>,
    done: bool,
    error: Option<String>,
    eval_count: Option<u64>,
    eval_duration: Option<u64>,
    load_duration: Option<u64>,
}

/// Streams `POST /api/generate`, emitting `bench-token` for every chunk.
///
/// `system` to system prompt (pusty = nie wysyłamy go wcale), a `options` to
/// parametry generowania - wysyłamy tylko te, które użytkownik naprawdę ustawił.
pub async fn generate(
    app: &AppHandle,
    model: &str,
    prompt: &str,
    images: &[String],
    category_id: &str,
    prompt_index: usize,
    system: Option<&str>,
    options: &serde_json::Value,
    cancel: &AtomicBool,
) -> GenOutcome {
    let started = Instant::now();
    let mut outcome = GenOutcome::default();

    let finish = |outcome: &mut GenOutcome| {
        outcome.total_ms = started.elapsed().as_secs_f64() * 1000.0;
        outcome.tokens_per_sec = tokens_per_sec(outcome.eval_count, outcome.eval_duration_ns);
        if outcome.measured_tokens_per_sec.is_none() {
            if let Some(ttft) = outcome.ttft_ms {
                let gen_secs = (outcome.total_ms - ttft) / 1000.0;
                if gen_secs > 0.05 {
                    let count = outcome
                        .eval_count
                        .unwrap_or_else(|| (outcome.response.chars().count() as u64 / 4).max(1));
                    outcome.measured_tokens_per_sec = Some(count as f64 / gen_secs);
                }
            }
        }
    };

    let client = match client() {
        Ok(c) => c,
        Err(e) => {
            outcome.error = Some(e);
            finish(&mut outcome);
            return outcome;
        }
    };

    let mut body = json!({ "model": model, "prompt": prompt, "stream": true });
    if !images.is_empty() {
        body["images"] = json!(images);
    }
    if let Some(system) = system.filter(|value| !value.trim().is_empty()) {
        body["system"] = json!(system);
    }
    if options.as_object().is_some_and(|map| !map.is_empty()) {
        body["options"] = options.clone();
    }

    let res = match client
        .post(format!("{}/api/generate", base_url()))
        .json(&body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            outcome.error = Some(msg("ollama.connection_error", &[("error", &e.to_string())]));
            finish(&mut outcome);
            return outcome;
        }
    };

    if !res.status().is_success() {
        let code = res.status();
        let body = res.text().await.unwrap_or_default();
        outcome.error = Some(msg(
            "ollama.returned",
            &[("status", &code.to_string()), ("detail", body.trim())],
        ));
        finish(&mut outcome);
        return outcome;
    }

    let mut stream = res.bytes_stream();
    let mut buf: Vec<u8> = Vec::new();

    let mut state = StreamState {
        response: String::new(),
        first_token_at: None,
        ttft_ms: None,
        done: false,
        error: None,
        eval_count: None,
        eval_duration: None,
        load_duration: None,
    };

    'stream: loop {
        if cancel.load(Ordering::SeqCst) {
            state.error = Some(msg("run.cancelled", &[]));
            break;
        }

        let item = match stream.next().await {
            Some(Ok(chunk)) => chunk,
            Some(Err(e)) => {
                state.error = Some(e.to_string());
                break;
            }
            None => break,
        };

        buf.extend_from_slice(&item);

        while let Some(pos) = buf.iter().position(|b| *b == b'\n') {
            let line: Vec<u8> = buf.drain(..=pos).collect();
            let text = String::from_utf8_lossy(&line);
            let text = text.trim();
            if text.is_empty() {
                continue;
            }
            let Ok(parsed) = serde_json::from_str::<GenChunk>(text) else {
                continue;
            };

            if let Some(err) = parsed.error {
                state.error = Some(err);
                break 'stream;
            }

            if let Some(token) = parsed.response {
                if !token.is_empty() {
                    if state.first_token_at.is_none() {
                        state.first_token_at = Some(Instant::now());
                        state.ttft_ms =
                            Some(started.elapsed().as_secs_f64() * 1000.0);
                    }
                    state.response.push_str(&token);
                    let _ = app.emit(
                        TOKEN_EVENT,
                        TokenEvent {
                            model: model.to_string(),
                            category_id: category_id.to_string(),
                            prompt_index,
                            token,
                        },
                    );
                }
            }

            if parsed.eval_count.is_some() {
                state.eval_count = parsed.eval_count;
            }
            if parsed.eval_duration.is_some() {
                state.eval_duration = parsed.eval_duration;
            }
            if parsed.load_duration.is_some() {
                state.load_duration = parsed.load_duration;
            }
            if parsed.done == Some(true) {
                state.done = true;
                break 'stream;
            }
            let _ = parsed.prompt_eval_count;
        }
    }

    outcome.response = state.response;
    outcome.ttft_ms = state.ttft_ms;
    outcome.error = state.error;
    outcome.eval_count = state.eval_count;
    outcome.eval_duration_ns = state.eval_duration;
    outcome.load_ms = state.load_duration.map(|d| d as f64 / 1e6);
    finish(&mut outcome);
    outcome
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_tag_defaults_to_latest() {
        assert_eq!(split_tag("qwen3"), ("qwen3".to_string(), "latest".to_string()));
        assert_eq!(split_tag("qwen3:8b").1, "8b");
        assert_eq!(split_tag("  qwen3:8b  ").0, "qwen3");
        assert_eq!(split_tag("qwen3:").1, "latest");
    }

    #[test]
    fn registry_repo_prefixes_official_models_only() {
        assert_eq!(registry_repo("qwen3").unwrap(), "library/qwen3");
        assert_eq!(registry_repo("user/model").unwrap(), "user/model");
        assert!(registry_repo("hf.co/user/model").is_err());
        assert!(registry_repo("  ").is_err());
    }

    /// Regresja: nazwy modeli mogą zawierać kropki (qwen2.5, llama3.2),
    /// więc kropka w nazwie nie może być traktowana jak domena rejestru.
    #[test]
    fn registry_repo_keeps_dotted_model_names_official() {
        assert_eq!(
            registry_repo("qwen2.5-coder").unwrap(),
            "library/qwen2.5-coder"
        );
        assert_eq!(registry_repo("llama3.2").unwrap(), "library/llama3.2");
    }

    #[test]
    fn tag_matches_handles_implicit_latest() {
        assert!(tag_matches("qwen3:latest", "qwen3"));
        assert!(tag_matches("qwen3:8b", "qwen3:8b"));
        assert!(!tag_matches("qwen3:8b", "qwen3"));
    }

    /// `vision` z capabilities jest pewne - wygrywa nawet z nazwą, która
    /// sugerowałaby coś innego.
    #[test]
    fn vision_capability_beats_name_heuristic() {
        let (kind, source) = suggest_kind("qwen2.5-coder:3b", &["completion".into(), "vision".into()]);
        assert_eq!(kind.as_deref(), Some("vlm"));
        assert_eq!(source.as_deref(), Some("capabilities"));
    }

    #[test]
    fn name_heuristic_detects_coding_and_vision_families() {
        for tag in ["qwen2.5-coder:7b", "deepseek-coder:6.7b", "starcoder2:3b", "codestral"] {
            assert_eq!(name_suggests_kind(tag), Some("coding"), "{tag}");
        }
        for tag in ["llava:7b", "moondream", "bakllava:11b", "minicpm-v:8b", "qwen2.5vl:7b"] {
            assert_eq!(name_suggests_kind(tag), Some("vlm"), "{tag}");
        }
    }

    #[test]
    fn name_heuristic_detects_chat_families_and_keeps_unknown_unset() {
        for tag in ["qwen3:8b", "llama3.2:3b", "mistral:7b", "gemma3:4b", "phi4:14b"] {
            assert_eq!(name_suggests_kind(tag), Some("chat"), "{tag}");
        }
        // Nie znamy przeznaczenia - nie zgadujemy na siłę.
        assert_eq!(name_suggests_kind("totally-unknown-model:1b"), None);
    }

    /// Regresja: tag z rozmiarem ("7b") nie może wpływać na wykrytą rodzinę,
    /// a nazwy z kropkami muszą dalej działać.
    #[test]
    fn suggestion_ignores_tag_suffix() {
        assert_eq!(name_suggests_kind("qwen2.5-coder:7b"), Some("coding"));
        assert_eq!(name_suggests_kind("llama3.2:3b"), Some("chat"));
        assert_eq!(name_suggests_kind("llava:13b"), Some("vlm"));
    }

    /// Regresja z prawdziwego przebiegu: moondream na polski prompt zwrócił
    /// pustą odpowiedź (`eval_count: 1`, `eval_duration: 1000`), a aplikacja
    /// pokazywała 1 000 000 tok/s.
    #[test]
    fn tokens_per_sec_rejects_empty_response_measurement() {
        assert_eq!(tokens_per_sec(Some(1), Some(1000)), None);
        assert_eq!(tokens_per_sec(Some(1), Some(4_000_000_000)), None);
        assert_eq!(tokens_per_sec(Some(0), Some(1_000_000_000)), None);
        assert_eq!(tokens_per_sec(None, None), None);
        // Realne pomiary z tej maszyny muszą dalej przechodzić.
        let moondream = tokens_per_sec(Some(48), Some(4_747_765_000)).unwrap();
        assert!((moondream - 10.11).abs() < 0.05, "{moondream}");
        let coder = tokens_per_sec(Some(158), Some(4_350_000_000)).unwrap();
        assert!((coder - 36.32).abs() < 0.05, "{coder}");
    }

    /// Moondream ma szablon bez `{{ .System }}` - jego system prompt nie dociera
    /// do modelu i aplikacja musi to pokazać, zamiast udawać, że działa.
    #[test]
    fn detects_templates_that_ignore_system_prompt() {
        let moondream = "{{ if .Prompt }} Question: {{ .Prompt }}\n\n{{ end }} Answer: {{ .Response }}\n\n";
        assert_eq!(template_supports_system(Some(moondream)), Some(false));

        let llava = "{{ if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}<|im_start|>user\n{{ .Prompt }}";
        assert_eq!(template_supports_system(Some(llava)), Some(true));

        // Brak szablonu = nie wiemy, więc nie straszymy użytkownika.
        assert_eq!(template_supports_system(None), None);
    }

    #[test]
    fn gpu_percent_is_none_for_empty_size() {
        assert_eq!(gpu_percent(0, 0), None);
        assert_eq!(gpu_percent(2_159_374_499, 2_159_374_499), Some(100.0));
        let partial = gpu_percent(2_365_262_395, 799_822_314).unwrap();
        assert!((partial - 33.8).abs() < 0.1, "{partial}");
    }

    /// Metadane skopiowane z odpowiedzi żywej Ollamy, więc test pilnuje tego,
    /// co serwer naprawdę przysyła, a nie tego, co wydaje się poprawne.
    #[test]
    fn kv_cache_matches_live_ollama_metadata() {
        let coder = json!({
            "qwen2.block_count": 36,
            "qwen2.attention.head_count": 16,
            "qwen2.attention.head_count_kv": 2,
            "qwen2.embedding_length": 2048,
            "qwen2.context_length": 32768
        });
        let info = coder.as_object().unwrap().clone();
        // 2 (K,V) × 36 warstw × 2 głowy KV × 128 (2048/16) × 2 bajty = 36 864 B/token.
        assert_eq!(kv_per_token_bytes(&info), Some(36_864));
        // Przy 8192 tokenach daje to 288 MB - czyli tę różnicę, którą widać było
        // na żywym modelu między num_ctx 2048 i 8192.
        assert_eq!(36_864u64 * 8192 / (1024 * 1024), 288);

        // Phi2 (moondream) nie ma GQA, więc głów KV jest tyle samo co głów.
        let moondream = json!({
            "phi2.block_count": 24,
            "phi2.attention.head_count": 32,
            "phi2.attention.head_count_kv": 32,
            "phi2.embedding_length": 2048,
            "phi2.rope.dimension_count": 32
        });
        assert_eq!(
            kv_per_token_bytes(moondream.as_object().unwrap()),
            Some(196_608)
        );
    }

    /// Bez architektury nie ma z czego liczyć - lepiej zwrócić `None`
    /// (i powiedzieć "nie wiem") niż podstawić zmyśloną liczbę.
    #[test]
    fn kv_cache_is_none_without_architecture_metadata() {
        let unknown = json!({ "general.architecture": "unknown" });
        assert_eq!(kv_per_token_bytes(unknown.as_object().unwrap()), None);

        // Zerowe/brakujące głowy też nie mogą dać dzielenia przez zero.
        let broken = json!({
            "llama.block_count": 0,
            "llama.attention.head_count": 0,
            "llama.attention.head_count_kv": 0,
            "llama.embedding_length": 0
        });
        assert_eq!(kv_per_token_bytes(broken.as_object().unwrap()), None);
    }
}
