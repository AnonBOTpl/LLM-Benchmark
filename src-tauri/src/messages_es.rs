//! Hiszpanskie komunikaty backendu.
//!
//! Te same kody i te same `{placeholdery}` co w `messages_en.rs` - zgodnosci
//! pilnuja testy w `messages.rs`, wiec komunikat nie moze istniec tylko w jednym
//! jezyku. Tekst bledu jest **zapisywany** w historii przebiegu i w eksporcie,
//! dlatego jest tu gotowym zdaniem, a nie kodem do przetlumaczenia w UI.

pub const CATALOG: &[(&str, &str)] = &[
    // --- Ollama ------------------------------------------------------------
    ("ollama.status", "Ollama respondió con el estado {status}"),
    ("ollama.unreachable", "Sin conexión con {endpoint}: {error}"),
    (
        "ollama.connect_failed",
        "No se pudo conectar con Ollama ({endpoint}): {error}",
    ),
    ("ollama.returned", "Ollama devolvió {status}: {detail}"),
    ("ollama.returned_status", "Ollama devolvió {status}"),
    ("ollama.not_responding", "Ollama no responde: {error}"),
    ("ollama.connect", "No se pudo conectar con Ollama: {error}"),
    ("ollama.connection_error", "Error de conexión con Ollama: {error}"),
    (
        "ollama.memory_state",
        "No se pudo leer el estado de la memoria: {error}",
    ),
    (
        "ollama.model_not_downloaded",
        "El modelo {model} no está descargado - descárgalo primero",
    ),
    ("ollama.tag_required", "Escribe una etiqueta de modelo"),
    // --- Model registry ----------------------------------------------------
    ("registry.name_required", "Escribe un nombre de modelo"),
    (
        "registry.foreign",
        "Un registro de terceros ({host}) no admite consultar el tamaño - el tamaño aparecerá tras la descarga.",
    ),
    (
        "registry.not_found",
        "Modelo no encontrado en el registro de Ollama (HTTP {status})",
    ),
    (
        "registry.unreachable",
        "Sin conexión con el registro de Ollama: {error}",
    ),
    (
        "registry.manifest_failed",
        "No se pudo leer el manifiesto del registro: {error}",
    ),
    (
        "registry.no_size",
        "El registro no indicó un tamaño para este modelo",
    ),
    // --- Benchmark ---------------------------------------------------------
    ("run.already_running", "Ya hay un test en marcha"),
    ("run.bad_id", "Id de ejecución no válido: {id}"),
    ("run.not_found", "No se encontró la ejecución {id}"),
    ("run.cancelled", "Cancelado por el usuario"),
    (
        "classify.nothing_pending",
        "No hay ninguna respuesta esperando clasificación",
    ),
    (
        "classify.answer_not_found",
        "No se encontró en la ejecución la respuesta marcada",
    ),
    ("image.read_failed", "No se pudo leer la imagen {path}: {error}"),
    ("image.too_large", "La imagen es demasiado grande (límite de 40 MB)"),
    ("export.unsupported_format", "Formato de exportación no admitido: {format}"),
    // Etykiety sa zapisywane w historii jako kody (`label.*`), a tlumaczone
    // dopiero w raporcie - dlatego sa tu tekstem.
    ("label.completed", "Completado"),
    ("label.refused", "Rechazado"),
    ("label.limited", "Completado con limitaciones/cambios"),
    ("export.html_image", "imagen: {value}"),
    ("export.html_error", "Error: {value}"),
    ("export.json_valid", "JSON válido"),
    ("export.json_invalid", "JSON no válido"),
    ("export.python_ok", "sintaxis válida"),
    ("export.python_syntax_error", "error de sintaxis"),
    ("export.python_no_code", "sin código Python"),
    ("export.meta_run", "ejecución {id} · inicio {started} · duración {seconds} s"),
    ("export.meta_cancelled", "cancelada"),
    ("export.th_answer", "Respuesta"),
    ("export.th_label", "Etiquetas"),
    ("export.th_tps_wall", "tok/s (reloj)"),
    // --- HuggingFace (catálogo de modelos GGUF) ----------------------------
    ("hf.not_responding", "Sin conexión con HuggingFace: {error}"),
    (
        "hf.rate_limited",
        "HuggingFace está limitando las peticiones: inténtalo de nuevo en {seconds} s",
    ),
    ("hf.returned", "HuggingFace devolvió {status}"),
    ("hf.bad_response", "Respuesta ilegible de HuggingFace: {error}"),
    ("hf.repo_missing", "No existe ese repositorio en HuggingFace: {repo}"),
    (
        "hf.repo_forbidden",
        "HuggingFace no da acceso a ese repositorio ({status}): puede no existir o estar restringido",
    ),
    // --- System ------------------------------------------------------------
    ("open.bad_url", "Eso no es una dirección web, así que no la abriré."),
    ("export.source_registry", "registro de Ollama"),
    ("export.source_huggingface", "de HuggingFace"),
    (
        "export.source_tip",
        "De dónde viene el modelo. El mismo modelo puede dar resultados distintos desde el registro y desde HuggingFace, porque la plantilla y el analizador vienen del repositorio."
    ),
    ("gpu.nvml_failed", "No se pudo cargar NVML: {error}"),
    ("dialog.pick_image", "Selecciona una imagen de prueba"),
    ("dialog.image_filter", "Imagen"),
];
