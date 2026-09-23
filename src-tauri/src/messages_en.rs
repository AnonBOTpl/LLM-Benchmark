//! English backend messages.
//!
//! Same codes and the same `{placeholders}` as `messages_pl.rs` - the pair is
//! kept in step by the tests in `messages.rs`, so a message can never exist in
//! one language only.

pub const CATALOG: &[(&str, &str)] = &[
    // --- Ollama ------------------------------------------------------------
    ("ollama.status", "Ollama responded with status {status}"),
    ("ollama.unreachable", "No connection to {endpoint}: {error}"),
    (
        "ollama.connect_failed",
        "Could not connect to Ollama ({endpoint}): {error}",
    ),
    ("ollama.returned", "Ollama returned {status}: {detail}"),
    ("ollama.returned_status", "Ollama returned {status}"),
    ("ollama.not_responding", "Ollama is not responding: {error}"),
    ("ollama.connect", "Could not connect to Ollama: {error}"),
    ("ollama.connection_error", "Ollama connection error: {error}"),
    (
        "ollama.memory_state",
        "Could not read the memory state: {error}",
    ),
    (
        "ollama.model_not_downloaded",
        "Model {model} is not downloaded - download it first",
    ),
    ("ollama.tag_required", "Enter a model tag"),
    // --- Model registry ----------------------------------------------------
    ("registry.name_required", "Enter a model name"),
    (
        "registry.foreign",
        "Third-party registry ({host}) does not support size lookup - the size will appear after downloading.",
    ),
    (
        "registry.not_found",
        "Model not found in the Ollama registry (HTTP {status})",
    ),
    (
        "registry.unreachable",
        "No connection to the Ollama registry: {error}",
    ),
    (
        "registry.manifest_failed",
        "Could not read the registry manifest: {error}",
    ),
    (
        "registry.no_size",
        "The registry did not report a size for this model",
    ),
    // --- Benchmark ---------------------------------------------------------
    ("run.already_running", "A test is already running"),
    ("run.bad_id", "Invalid run id: {id}"),
    ("run.not_found", "Run {id} not found"),
    ("run.cancelled", "Cancelled by the user"),
    (
        "classify.nothing_pending",
        "No answer is waiting for classification",
    ),
    (
        "classify.answer_not_found",
        "The marked answer was not found in the run",
    ),
    ("image.read_failed", "Could not read the image {path}: {error}"),
    ("image.too_large", "The image is too large (40 MB limit)"),
    ("export.unsupported_format", "Unsupported export format: {format}"),
    // Classification labels are stored in the history as codes (`label.*`), so
    // they are translated only when the report is built - never on disk.
    ("label.completed", "Completed"),
    ("label.refused", "Refused"),
    ("label.limited", "Completed with limits/changes"),
    ("export.html_image", "image: {value}"),
    ("export.html_error", "error: {value}"),
    ("export.json_valid", "valid JSON"),
    ("export.json_invalid", "not valid JSON"),
    ("export.python_ok", "valid syntax"),
    ("export.python_syntax_error", "syntax error"),
    ("export.python_no_code", "no Python code"),
    ("export.meta_run", "run {id} · start {started} · duration {seconds} s"),
    ("export.meta_cancelled", "cancelled"),
    ("export.th_answer", "Answer"),
    ("export.th_label", "Labels"),
    ("export.th_tps_wall", "tok/s (clock)"),
    // --- HuggingFace (GGUF model catalogue) --------------------------------
    ("hf.not_responding", "No connection to HuggingFace: {error}"),
    (
        "hf.rate_limited",
        "HuggingFace is limiting requests - try again in {seconds} s",
    ),
    ("hf.returned", "HuggingFace returned {status}"),
    ("hf.bad_response", "Unreadable response from HuggingFace: {error}"),
    ("hf.repo_missing", "No repository of that name on HuggingFace: {repo}"),
    (
        "hf.repo_forbidden",
        "HuggingFace does not expose this repository ({status}) - it may not exist or may be gated",
    ),
    // --- Skąd model (raport HTML) ------------------------------------------
    ("export.source_registry", "Ollama registry"),
    ("export.source_huggingface", "HuggingFace"),
    (
        "export.source_tip",
        "Where the model came from. The same model from the registry and from HuggingFace can score differently, because the template and parser come from the repository."
    ),
    // --- System ------------------------------------------------------------
    ("open.bad_url", "That is not a web address, so I will not open it."),
    ("gpu.nvml_failed", "Could not load NVML: {error}"),
    ("dialog.pick_image", "Select a test image"),
    ("dialog.image_filter", "Image"),
];
