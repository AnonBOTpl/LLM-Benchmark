mod code_fence;
mod export;
mod forecast;
mod gpu;
mod hf;
mod json_check;
mod messages;
mod ollama;
mod python_check;
mod settings;
mod store;
mod sysmem;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use base64::Engine as _;
use serde::Deserialize;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_window_state::StateFlags;
use tokio::sync::oneshot;

use crate::forecast::{Forecast, ForecastTarget};
use crate::gpu::{Vram, VramSample};
use crate::hf::{HfQuery, HfRepoDetails, HfSearch};
use crate::ollama::OllamaStatus;
use crate::settings::{ClearOutcome, Settings, StoragePaths, StorageStats};
use crate::store::{
    AppConfig, BenchmarkRun, Category, ModelOptions, ModelRun, PromptResult, RunSummary,
};

const PROGRESS_EVENT: &str = "bench-progress";
const CLASSIFY_EVENT: &str = "bench-classify-request";

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

pub struct AppState {
    vram: Vram,
    cancel: AtomicBool,
    running: AtomicBool,
    /// Pending manual classification: the run waits here until the user picks
    /// one of the three labels in the UI.
    label_tx: Mutex<Option<oneshot::Sender<String>>>,
}

// ---------------------------------------------------------------------------
// Config / status commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    store::load_config(&app)
}

#[tauri::command]
async fn set_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    store::save_config(&app, &config)
}

#[tauri::command]
async fn ollama_status() -> Result<OllamaStatus, String> {
    Ok(ollama::status().await)
}

#[tauri::command]
async fn pull_model(app: AppHandle, model: String) -> Result<(), String> {
    ollama::pull(&app, &model).await
}

#[tauri::command]
async fn model_info(tag: String) -> Result<ollama::ModelInfo, String> {
    Ok(ollama::model_info(&tag).await)
}

#[tauri::command]
async fn delete_model(model: String) -> Result<(), String> {
    ollama::delete_model(&model).await
}

#[tauri::command]
async fn loaded_models() -> Result<Vec<ollama::LoadedModel>, String> {
    ollama::loaded_models().await
}

#[tauri::command]
async fn load_model(model: String) -> Result<ollama::LoadOutcome, String> {
    ollama::set_loaded(&model, true).await
}

#[tauri::command]
async fn unload_model(model: String) -> Result<ollama::LoadOutcome, String> {
    ollama::set_loaded(&model, false).await
}

#[tauri::command]
fn vram_snapshot(state: State<'_, AppState>) -> VramSample {
    state.vram.snapshot()
}

#[tauri::command]
fn is_running(state: State<'_, AppState>) -> bool {
    state.running.load(Ordering::SeqCst)
}

#[tauri::command]
async fn pick_image(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel::<Option<String>>();
    app.dialog()
        .file()
        .set_title(&messages::msg("dialog.pick_image", &[]))
        .add_filter(
            &messages::msg("dialog.image_filter", &[]),
            &["png", "jpg", "jpeg", "webp", "gif", "bmp"],
        )
        .pick_file(move |path| {
            let value = path
                .and_then(|p| p.into_path().ok())
                .map(|p| p.to_string_lossy().to_string());
            let _ = tx.send(value);
        });

    tauri::async_runtime::spawn_blocking(move || rx.recv().unwrap_or(None))
        .await
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// HuggingFace catalogue
// ---------------------------------------------------------------------------

/// Katalog modeli GGUF z HuggingFace. Zwraca gotowe wiersze listy - pamięć
/// dokłada dopiero `hf_repo`, bo tylko ono potrzebuje stanu tego komputera.
#[tauri::command]
async fn hf_search(query: HfQuery) -> Result<HfSearch, String> {
    hf::search(&query).await
}

/// Szczegóły repozytorium: warianty, projektor, notatki o pominiętych plikach
/// i prognoza pamięci dla każdego wariantu.
#[tauri::command]
async fn hf_repo(state: State<'_, AppState>, repo: String) -> Result<HfRepoDetails, String> {
    let mut details = hf::repo_details(&repo).await?;

    // Ten sam wzór, co w zakładce „Test": modele wczytane przez Ollamę nie
    // odbierają budżetu, bo przed przebiegiem można je zwolnić, a pamięć zajęta
    // przez inne programy - odbiera.
    let snapshot = state.vram.snapshot();
    let loaded = ollama::loaded_models().await.unwrap_or_default();
    let loaded_mb: u64 = loaded
        .iter()
        .map(|entry| forecast::bytes_to_mb(entry.size_bytes))
        .sum();
    let free_vram_mb = forecast::free_after_other_apps(snapshot.total_mb, snapshot.used_mb, loaded_mb);
    let usable_ram_mb = sysmem::snapshot().usable_mb();

    for variant in &mut details.files.variants {
        variant.memory = Some(hf::memory_for(
            variant.download_bytes,
            free_vram_mb,
            usable_ram_mb,
            snapshot.available,
        ));
    }

    Ok(details)
}

// ---------------------------------------------------------------------------
// History commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn list_runs(app: AppHandle) -> Result<Vec<RunSummary>, String> {
    store::list_runs(&app)
}

#[tauri::command]
async fn get_run(app: AppHandle, id: String) -> Result<BenchmarkRun, String> {
    store::load_run(&app, &id)
}

#[tauri::command]
async fn delete_run(app: AppHandle, id: String) -> Result<(), String> {
    store::delete_run(&app, &id)
}

#[tauri::command]
async fn set_label(
    app: AppHandle,
    id: String,
    model: String,
    category_id: String,
    index: usize,
    label: Option<String>,
) -> Result<(), String> {
    store::set_label(&app, &id, &model, &category_id, index, label)
}

#[tauri::command]
async fn export_run(app: AppHandle, id: String, format: String) -> Result<String, String> {
    let run = store::load_run(&app, &id)?;

    let dir = settings::export_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let (extension, contents) = match format.as_str() {
        "csv" => ("csv", export::to_csv(&run)),
        "html" => ("html", export::to_html(&run)),
        other => {
            return Err(messages::msg(
                "export.unsupported_format",
                &[("format", other)],
            ))
        }
    };

    let path = dir.join(format!("ai-benchmark-{}-{}.{extension}", run.id, run.started_at.replace([':', '.'], "-")));
    std::fs::write(&path, contents).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn open_path(path: String) -> Result<(), String> {
    opener::open(std::path::Path::new(&path)).map_err(|e| e.to_string())
}

/// Otwiera adres w przeglądarce - osobno od `open_path` z jednego powodu:
/// tamten opakowuje tekst w `Path`, a na Windows `Path` to **ścieżka systemowa**,
/// więc `https://huggingface.co/...` (dwa ukośniki, dwukropek) mogłoby się
/// rozjechać przy normalizacji. Adres idzie tu do `opener` jako zwykły tekst.
///
/// Sprawdzenie schematu jest siatką bezpieczeństwa, nie ścieżką użytkownika:
/// adres składa aplikacja z identyfikatora repozytorium, więc ten błąd może
/// się zdarzyć tylko przy naszej literówce.
#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    let url = url.trim();
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err(messages::msg("open.bad_url", &[]));
    }
    opener::open(url).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Ustawienia, miejsce na dysku i ostrzeżenie o VRAM
// ---------------------------------------------------------------------------

#[tauri::command]
async fn get_settings(app: AppHandle) -> Result<Settings, String> {
    let settings = settings::load_settings(&app);
    messages::set_language(&settings.language);
    Ok(settings)
}

#[tauri::command]
async fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    // Kolejność ma znaczenie: najpierw zapis, potem przełączenie języka, żeby
    // komunikaty backendu (np. z odczytu stanu pamięci) wróciły już w nowym
    // języku - bez tego jedno odświeżenie pokazałoby stary język.
    settings::save_settings(&app, &settings)?;
    messages::set_language(&settings.language);
    Ok(())
}

#[tauri::command]
async fn reset_settings(app: AppHandle) -> Result<Settings, String> {
    let settings = settings::reset_settings(&app)?;
    messages::set_language(&settings.language);
    Ok(settings)
}

#[tauri::command]
async fn storage_paths(app: AppHandle) -> Result<StoragePaths, String> {
    settings::storage_paths(&app)
}

#[tauri::command]
async fn exports_stats(app: AppHandle) -> Result<StorageStats, String> {
    settings::exports_stats(&app)
}

#[tauri::command]
async fn clear_history(app: AppHandle, ids: Vec<String>) -> Result<ClearOutcome, String> {
    settings::clear_history(&app, &ids)
}

#[tauri::command]
async fn clear_exports(app: AppHandle) -> Result<ClearOutcome, String> {
    settings::clear_exports(&app)
}

/// Czy wybrane modele zmieszczą się w VRAM karty. Zwraca **szacunek**, nie
/// pomiar - modele już załadowane mają rozmiar dokładny z `/api/ps`.
#[tauri::command]
async fn vram_forecast(
    state: State<'_, AppState>,
    targets: Vec<ForecastTarget>,
) -> Result<Forecast, String> {
    let snapshot = state.vram.snapshot();
    // RAM czytamy przy każdym zapytaniu, a nie raz przy starcie: wolna pamięć
    // zmienia się z sekundy na sekundę i użytkownik ma dostać migawkę z tej
    // chwili, a nie liczbę z uruchomienia aplikacji.
    Ok(forecast::forecast(
        &targets,
        snapshot.total_mb,
        snapshot.used_mb,
        snapshot.available,
        sysmem::snapshot(),
    )
    .await)
}

// ---------------------------------------------------------------------------
// Benchmark run
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunPair {
    model: String,
    category: Category,
    /// System prompt rozwiązany już przez UI: własny użytkownika albo domyślny
    /// dla typu kategorii.
    #[serde(default)]
    system_prompt: Option<String>,
    #[serde(default)]
    options: ModelOptions,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunPlan {
    pairs: Vec<RunPair>,
}

struct Item {
    prompt: String,
    image_path: Option<String>,
}

/// Zadania do wykonania w kategorii. Wyłączone prompty zostają w configu, ale
/// nie trafiają do testu.
fn items_for(category: &Category) -> Vec<Item> {
    if category.kind == "vlm" {
        category
            .vlm_prompts
            .iter()
            .filter(|v| v.enabled)
            .map(|v| Item {
                prompt: v.prompt.clone(),
                image_path: Some(v.image_path.clone()),
            })
            .collect()
    } else {
        category
            .prompts
            .iter()
            .filter(|p| p.enabled)
            .map(|p| Item {
                prompt: p.text.clone(),
                image_path: None,
            })
            .collect()
    }
}

fn load_image(path: &str) -> Result<String, String> {
    let bytes =
        std::fs::read(path).map_err(|e| {
            messages::msg(
                "image.read_failed",
                &[("path", path), ("error", &e.to_string())],
            )
        })?;
    if bytes.len() > 40 * 1024 * 1024 {
        return Err(messages::msg("image.too_large", &[]));
    }
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

fn emit_progress(app: &AppHandle, payload: serde_json::Value) {
    let _ = app.emit(PROGRESS_EVENT, payload);
}

/// Blocks the run until the user labels the response (or the run is cancelled).
async fn wait_for_label(state: &AppState) -> Option<String> {
    let (tx, mut rx) = oneshot::channel::<String>();
    {
        let mut slot = state.label_tx.lock().unwrap_or_else(|e| e.into_inner());
        *slot = Some(tx);
    }

    loop {
        tokio::select! {
            received = &mut rx => {
                let mut slot = state.label_tx.lock().unwrap_or_else(|e| e.into_inner());
                *slot = None;
                return received.ok();
            }
            _ = tokio::time::sleep(Duration::from_millis(150)) => {
                if state.cancel.load(Ordering::SeqCst) {
                    let mut slot = state.label_tx.lock().unwrap_or_else(|e| e.into_inner());
                    *slot = None;
                    return None;
                }
            }
        }
    }
}

#[tauri::command]
fn submit_classification(state: State<'_, AppState>, label: String) -> Result<(), String> {
    let mut slot = state.label_tx.lock().map_err(|e| e.to_string())?;
    match slot.take() {
        Some(tx) => {
            let _ = tx.send(label);
            Ok(())
        }
        None => Err(messages::msg("classify.nothing_pending", &[])),
    }
}

#[tauri::command]
fn cancel_run(state: State<'_, AppState>) {
    state.cancel.store(true, Ordering::SeqCst);
    let mut slot = state.label_tx.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(tx) = slot.take() {
        let _ = tx.send("(przerwano)".to_string());
    }
}

/// Zwalnia z pamięci modele, których nie ma w bieżącym przebiegu.
///
/// Modele biorące udział w tym teście zostają - jeśli przebieg używa dwóch
/// różnych modeli, oba trzymają się w VRAM równolegle. Natomiast model
/// pozostawiony po poprzednim teście jest usuwany, żeby nie zabierał pamięci
/// bez potrzeby (na małej karcie potrafi to zablokować start nowego modelu).
async fn unload_stale_models(models: &[String]) -> Vec<String> {
    let loaded = ollama::loaded_models().await.unwrap_or_default();
    let mut unloaded = Vec::new();

    for entry in loaded {
        if models
            .iter()
            .any(|tag| ollama::tag_matches(&entry.name, tag))
        {
            continue;
        }
        if ollama::set_loaded(&entry.name, false).await.is_ok() {
            unloaded.push(entry.name);
        }
    }

    unloaded
}

#[tauri::command]
async fn run_benchmark(
    app: AppHandle,
    state: State<'_, AppState>,
    plan: RunPlan,
) -> Result<String, String> {
    if state.running.swap(true, Ordering::SeqCst) {
        return Err(messages::msg("run.already_running", &[]));
    }
    let inner = state.inner();
    let result = run_benchmark_inner(&app, inner, plan).await;
    inner.running.store(false, Ordering::SeqCst);
    result
}

async fn run_benchmark_inner(
    app: &AppHandle,
    state: &AppState,
    plan: RunPlan,
) -> Result<String, String> {
    let id = chrono::Local::now().format("%Y%m%d-%H%M%S%.3f").to_string();
    let started_at = chrono::Local::now().to_rfc3339();
    let started = Instant::now();

    state.cancel.store(false, Ordering::SeqCst);
    state.vram.reset_peak();

    // Sprawdzenia odpowiedzi czytamy **raz**, przed przebiegiem. Zmiana
    // przełącznika w trakcie testu nie może zmienić zasad w połowie: przebieg
    // jest jedną całością i ma być opisywalny jednym zestawem ustawień.
    let checks = settings::load_settings(app);

    // Licznik zamiast `items_for(..).len()` - ta sama liczba, ale bez budowania
    // wektora zadań tylko po to, żeby go policzyć.
    let overall_total: usize = plan.pairs.iter().map(|p| p.category.enabled_count()).sum();
    let mut overall_done = 0usize;
    let mut model_runs: Vec<ModelRun> = Vec::new();

    emit_progress(
        app,
        json!({
            "runId": id,
            "phase": "run-start",
            "overallDone": 0,
            "overallTotal": overall_total,
            "gpu": state.vram.name(),
        }),
    );

    // Modele spoza tego przebiegu zwalniamy **przed** pierwszą generacją, żeby
    // pamięć była wolna, zanim nowy model zacznie się wczytywać.
    let run_models: Vec<String> = plan.pairs.iter().map(|pair| pair.model.clone()).collect();
    let unloaded = unload_stale_models(&run_models).await;
    if !unloaded.is_empty() {
        emit_progress(
            app,
            json!({
                "runId": id,
                "phase": "models-unloaded",
                "overallDone": 0,
                "overallTotal": overall_total,
                "models": unloaded,
            }),
        );
    }

    'pairs: for pair in &plan.pairs {
        let category = &pair.category;
        let items = items_for(category);
        let mut results: Vec<PromptResult> = Vec::new();

        for (index, item) in items.iter().enumerate() {
            if state.cancel.load(Ordering::SeqCst) {
                break 'pairs;
            }

            emit_progress(
                app,
                json!({
                    "runId": id,
                    "phase": "prompt-start",
                    "model": pair.model,
                    "categoryId": category.id,
                    "categoryName": category.name,
                    "kind": category.kind,
                    "promptIndex": index,
                    "promptTotal": items.len(),
                    "overallDone": overall_done,
                    "overallTotal": overall_total,
                    "prompt": item.prompt,
                    "imagePath": item.image_path,
                }),
            );

            let images = match &item.image_path {
                Some(path) => match load_image(path) {
                    Ok(encoded) => vec![encoded],
                    Err(message) => {
                        let failed = PromptResult {
                            prompt: item.prompt.clone(),
                            image_path: item.image_path.clone(),
                            error: Some(message.clone()),
                            ..Default::default()
                        };
                        overall_done += 1;
                        emit_progress(
                            app,
                            json!({
                                "runId": id,
                                "phase": "prompt-done",
                                "model": pair.model,
                                "categoryId": category.id,
                                "categoryName": category.name,
                                "kind": category.kind,
                                "promptIndex": index,
                                "promptTotal": items.len(),
                                "overallDone": overall_done,
                                "overallTotal": overall_total,
                                "error": message,
                            }),
                        );
                        results.push(failed);
                        continue;
                    }
                },
                None => vec![],
            };

            state.vram.reset_peak();
            // Uwaga: do Ollamy idzie snake_case (`num_ctx`, `num_gpu`) - inne
            // klucze są po cichu pomijane i parametr "działa", ale nic nie robi.
            let options = pair.options.to_ollama_options();
            let outcome = ollama::generate(
                app,
                &pair.model,
                &item.prompt,
                &images,
                &category.id,
                index,
                pair.system_prompt.as_deref(),
                &options,
                &state.cancel,
            )
            .await;
            let vram_peak = state.vram.peak_mb();

            // Podział warstw GPU/CPU odczytujemy zaraz po generowaniu - model
            // jest jeszcze w pamięci, więc `/api/ps` opisuje stan, w którym
            // liczył. To podział pamięci, nie czasu.
            let loaded = ollama::loaded_models()
                .await
                .unwrap_or_default()
                .into_iter()
                .find(|entry| ollama::tag_matches(&entry.name, &pair.model));
            let model_size_mb = loaded
                .as_ref()
                .map(|entry| entry.size_bytes / (1024 * 1024));
            let gpu_offload_percent = loaded.as_ref().and_then(|entry| entry.gpu_percent);

            let mut result = PromptResult {
                prompt: item.prompt.clone(),
                image_path: item.image_path.clone(),
                response: outcome.response,
                ttft_ms: outcome.ttft_ms,
                eval_count: outcome.eval_count,
                eval_duration_ns: outcome.eval_duration_ns,
                tokens_per_sec: outcome.tokens_per_sec,
                measured_tokens_per_sec: outcome.measured_tokens_per_sec,
                total_ms: outcome.total_ms,
                load_ms: outcome.load_ms,
                vram_peak_mb: vram_peak,
                model_size_mb,
                gpu_offload_percent,
                label: None,
                json_valid: None,
                python_verdict: None,
                error: outcome.error,
            };

            // Kategoria JSON: dodatkowa informacja obok pomiaru (nie zamiast).
            // Błąd generowania to brak informacji, a nie „niepoprawny JSON”.
            // Wyłączone w Ustawieniach = nie liczymy wcale (`None`).
            if checks.check_json && category.kind == "json" && result.error.is_none() {
                result.json_valid = Some(json_check::is_valid_json(&result.response));
            }

            // Kategoria „Kodowanie”: składnia Pythona. Ten sam układ co przy
            // JSON-ie - informacja **obok** pomiaru, nigdy zamiast. Werdykt nie
            // mówi, że kod jest poprawny, tylko że się parsuje; tak samo jest
            // nazwany w interfejsie.
            if checks.check_python && category.kind == "coding" && result.error.is_none() {
                result.python_verdict = Some(python_check::check(&result.response).to_string());
            }

            // Category 4 is graded by hand: show the full answer and wait.
            if category.kind == "classification" && result.error.is_none() {
                let _ = app.emit(
                    CLASSIFY_EVENT,
                    json!({
                        "runId": id,
                        "model": pair.model,
                        "categoryId": category.id,
                        "categoryName": category.name,
                        "promptIndex": index,
                        "prompt": result.prompt,
                        "response": result.response,
                        "ttftMs": result.ttft_ms,
                        "tokensPerSec": result.tokens_per_sec,
                        "totalMs": result.total_ms,
                        "vramPeakMb": result.vram_peak_mb,
                        "gpuOffloadPercent": result.gpu_offload_percent,
                    }),
                );
                result.label = wait_for_label(state).await;
            }

            overall_done += 1;
            emit_progress(
                app,
                json!({
                    "runId": id,
                    "phase": "prompt-done",
                    "model": pair.model,
                    "categoryId": category.id,
                    "categoryName": category.name,
                    "kind": category.kind,
                    "promptIndex": index,
                    "promptTotal": items.len(),
                    "overallDone": overall_done,
                    "overallTotal": overall_total,
                    "ttftMs": result.ttft_ms,
                    "tokensPerSec": result.tokens_per_sec,
                    "measuredTokensPerSec": result.measured_tokens_per_sec,
                    "totalMs": result.total_ms,
                    "vramPeakMb": result.vram_peak_mb,
                    "modelSizeMb": result.model_size_mb,
                    "gpuOffloadPercent": result.gpu_offload_percent,
                    "label": result.label,
                    "jsonValid": result.json_valid,
                    "pythonVerdict": result.python_verdict,
                    "response": result.response,
                    "error": result.error,
                }),
            );

            results.push(result);
        }

        model_runs.push(ModelRun {
            model: pair.model.clone(),
            category_id: category.id.clone(),
            category_name: category.name.clone(),
            kind: category.kind.clone(),
            // Skąd model przyszedł - zapisane w wyniku, bo ten sam model
            // z rejestru i z `hf.co` może wypaść inaczej (szablon i parser
            // przychodzą wtedy z repozytorium na HF).
            source: Some(store::model_source(&pair.model).to_string()),
            // Zapisujemy ustawienia razem z wynikami, żeby po czasie było
            // wiadomo, czym je uzyskano (i żeby trafiły do eksportu).
            system_prompt: pair.system_prompt.clone(),
            options: pair.options.clone(),
            results,
        });
    }

    let cancelled = state.cancel.load(Ordering::SeqCst);
    let run = BenchmarkRun {
        id: id.clone(),
        started_at,
        finished_at: chrono::Local::now().to_rfc3339(),
        duration_ms: started.elapsed().as_secs_f64() * 1000.0,
        cancelled,
        gpu: state.vram.name(),
        models: model_runs,
    };
    store::save_run(app, &run)?;

    emit_progress(
        app,
        json!({
            "runId": id,
            "phase": "run-done",
            "cancelled": cancelled,
            "overallDone": overall_done,
            "overallTotal": overall_total,
        }),
    );

    Ok(id)
}

// ---------------------------------------------------------------------------
// Okno
// ---------------------------------------------------------------------------

/// Czy okno da się dosięgnąć po przywróceniu zapamiętanego stanu.
///
/// Zapisana pozycja może pochodzić z innego układu monitorów albo z momentu,
/// gdy okno zostało przeciągnięte poza ekran. Sprawdzenie w pluginie (i w
/// Tauri) pyta tylko, czy okno **przecina** monitor - wystarcza jeden piksel,
/// żeby uznać pozycję za dobrą. Użytkownik widzi wtedy róg okna i nie ma czego
/// złapać, więc pasek tytułu jest poza zasięgiem.
///
/// Dlatego sprawdzamy, czy **całe** okno mieści się w obszarze obejmującym
/// wszystkie monitory. To przepuszcza okno rozłożone na dwóch ekranach, a
/// odrzuca wyjazd poza pulpit. Gdy się nie mieści, rozmiar jest ścinany do
/// największego monitora, a okno wraca na środek.
fn ensure_window_reachable(window: &tauri::WebviewWindow) {
    let (Ok(position), Ok(size), Ok(monitors)) = (
        window.outer_position(),
        window.inner_size(),
        window.available_monitors(),
    ) else {
        return;
    };
    if monitors.is_empty() {
        return;
    }

    let left = monitors.iter().map(|m| m.position().x).min().unwrap_or(0);
    let top = monitors.iter().map(|m| m.position().y).min().unwrap_or(0);
    let right = monitors
        .iter()
        .map(|m| m.position().x + m.size().width as i32)
        .max()
        .unwrap_or(0);
    let bottom = monitors
        .iter()
        .map(|m| m.position().y + m.size().height as i32)
        .max()
        .unwrap_or(0);

    let fits = position.x >= left
        && position.y >= top
        && position.x.saturating_add(size.width as i32) <= right
        && position.y.saturating_add(size.height as i32) <= bottom;
    if fits {
        return;
    }

    // Mniejszy ekran nie pomieści okna zapamiętanego na większym, więc najpierw
    // ścinamy rozmiar, a dopiero potem środkujemy - inaczej dolna krawędź
    // zostałaby poza ekranem i pasek tytułu byłby jedyną dosięgalną częścią.
    let widest = monitors.iter().map(|m| m.size().width).max().unwrap_or(size.width);
    let tallest = monitors.iter().map(|m| m.size().height).max().unwrap_or(size.height);
    if size.width > widest || size.height > tallest {
        let _ = window.set_size(tauri::PhysicalSize::new(
            size.width.min(widest),
            size.height.min(tallest),
        ));
    }
    let _ = window.center();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        // Rozmiar i pozycja okna przeżywają zamknięcie aplikacji, więc użytkownik
        // ustawia wygodny rozmiar raz, a nie przy każdym uruchomieniu.
        //
        // Flagi wybrane świadomie: rozmiar, pozycja, maksymalizacja i widoczność.
        // Dekoracji i pełnego ekranu **nie** przywracamy - okno jest bezramkowe
        // (`decorations: false`), a pełny ekran nigdy nie jest włączany, więc
        // ich odtwarzanie tworzyłoby pole na błąd bez żadnego zysku.
        //
        // Uwaga: to idzie w parze z `"visible": false` w `tauri.conf.json`.
        // Okno startuje ukryte, a plugin pokazuje je **po** przywróceniu
        // rozmiaru - bez tego widać skok okna tuż po starcie. Usunięcie jednego
        // bez drugiego psuje albo wygląd, albo widoczność okna.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED | StateFlags::VISIBLE,
                )
                .build(),
        )
        .setup(|app| {
            // Język komunikatów backendu musi być znany zanim wystartuje
            // próbkowanie VRAM - inaczej błąd NVML wróciłby po angielsku
            // niezależnie od wybranego języka.
            settings::sync_language(app.handle());
            let vram = gpu::start_sampler(app.handle().clone(), Duration::from_millis(700));
            app.manage(AppState {
                vram,
                cancel: AtomicBool::new(false),
                running: AtomicBool::new(false),
                label_tx: Mutex::new(None),
            });

            // Okno dostaje zapamiętaną pozycję **po** utworzeniu, a `setup`
            // wykonuje się przed nim. Zamiast zakładać kolejność, czekamy na
            // okno, a potem jeszcze chwilę na przywrócenie stanu - dopiero
            // wtedy wiadomo, gdzie okno naprawdę stanęło.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                for _ in 0..40 {
                    if handle.get_webview_window("main").is_some() {
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
                tokio::time::sleep(Duration::from_millis(350)).await;
                if let Some(window) = handle.get_webview_window("main") {
                    ensure_window_reachable(&window);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            ollama_status,
            pull_model,
            model_info,
            delete_model,
            loaded_models,
            load_model,
            unload_model,
            vram_snapshot,
            is_running,
            pick_image,
            list_runs,
            get_run,
            delete_run,
            set_label,
            export_run,
            open_path,
            open_url,
            hf_search,
            hf_repo,
            get_settings,
            set_settings,
            reset_settings,
            storage_paths,
            exports_stats,
            clear_history,
            clear_exports,
            vram_forecast,
            run_benchmark,
            cancel_run,
            submit_classification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::{TextPrompt, VlmPrompt};

    fn category(kind: &str) -> Category {
        Category {
            id: "test".into(),
            name: "Test".into(),
            kind: kind.into(),
            prompts: vec![TextPrompt::new("p1"), TextPrompt::new("p2")],
            vlm_prompts: vec![VlmPrompt {
                prompt: "Opisz obraz".into(),
                image_path: "C:/obrazy/a.png".into(),
                enabled: true,
            }],
        }
    }

    #[test]
    fn vlm_category_runs_one_job_per_image() {
        let items = items_for(&category("vlm"));
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].prompt, "Opisz obraz");
        assert_eq!(items[0].image_path.as_deref(), Some("C:/obrazy/a.png"));
    }

    #[test]
    fn text_categories_use_plain_prompts_without_images() {
        for kind in [
            "coding",
            "chat",
            "classification",
            "reasoning",
            "json",
            "long_context",
        ] {
            let items = items_for(&category(kind));
            assert_eq!(items.len(), 2, "kategoria {kind}");
            assert!(items.iter().all(|item| item.image_path.is_none()));
        }
    }

    /// Wyłączony prompt zostaje w configu, ale nie wchodzi do przebiegu.
    #[test]
    fn disabled_prompts_are_skipped() {
        let mut coding = category("coding");
        coding.prompts[0].enabled = false;
        let items = items_for(&coding);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].prompt, "p2");

        let mut vlm = category("vlm");
        vlm.vlm_prompts[0].enabled = false;
        assert!(items_for(&vlm).is_empty());
    }
}
