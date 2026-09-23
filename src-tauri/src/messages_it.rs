//! Wloskie komunikaty backendu.
//!
//! Te same kody i te same `{placeholdery}` co w `messages_en.rs` - zgodnosci
//! pilnuja testy w `messages.rs`, wiec komunikat nie moze istniec tylko w jednym
//! jezyku. Tekst bledu jest **zapisywany** w historii przebiegu i w eksporcie,
//! dlatego jest tu gotowym zdaniem, a nie kodem do przetlumaczenia w UI.

pub const CATALOG: &[(&str, &str)] = &[
    // --- Ollama ------------------------------------------------------------
    ("ollama.status", "Ollama ha risposto con lo stato {status}"),
    ("ollama.unreachable", "Nessuna connessione a {endpoint}: {error}"),
    (
        "ollama.connect_failed",
        "Non è stato possibile connettersi a Ollama ({endpoint}): {error}",
    ),
    ("ollama.returned", "Ollama ha restituito {status}: {detail}"),
    ("ollama.returned_status", "Ollama ha restituito {status}"),
    ("ollama.not_responding", "Ollama non risponde: {error}"),
    ("ollama.connect", "Non è stato possibile connettersi a Ollama: {error}"),
    ("ollama.connection_error", "Errore di connessione a Ollama: {error}"),
    (
        "ollama.memory_state",
        "Non è stato possibile leggere lo stato della memoria: {error}",
    ),
    (
        "ollama.model_not_downloaded",
        "Il modello {model} non è scaricato - scaricalo prima",
    ),
    ("ollama.tag_required", "Inserisci un tag di modello"),
    // --- Model registry ----------------------------------------------------
    ("registry.name_required", "Inserisci un nome di modello"),
    (
        "registry.foreign",
        "Un registro di terze parti ({host}) non permette di consultare la dimensione - la dimensione apparirà dopo il download.",
    ),
    (
        "registry.not_found",
        "Modello non trovato nel registro di Ollama (HTTP {status})",
    ),
    (
        "registry.unreachable",
        "Nessuna connessione al registro di Ollama: {error}",
    ),
    (
        "registry.manifest_failed",
        "Non è stato possibile leggere il manifesto del registro: {error}",
    ),
    (
        "registry.no_size",
        "Il registro non ha indicato una dimensione per questo modello",
    ),
    // --- Benchmark ---------------------------------------------------------
    ("run.already_running", "C'è già un test in corso"),
    ("run.bad_id", "Id di esecuzione non valido: {id}"),
    ("run.not_found", "Esecuzione {id} non trovata"),
    ("run.cancelled", "Annullato dall'utente"),
    (
        "classify.nothing_pending",
        "Nessuna risposta è in attesa di classificazione",
    ),
    (
        "classify.answer_not_found",
        "La risposta annotata non è stata trovata nell'esecuzione",
    ),
    ("image.read_failed", "Non è stato possibile leggere l'immagine {path}: {error}"),
    ("image.too_large", "L'immagine è troppo grande (limite di 40 MB)"),
    ("export.unsupported_format", "Formato di esportazione non supportato: {format}"),
    // Etykiety sa zapisywane w historii jako kody (`label.*`), a tlumaczone
    // dopiero w raporcie - dlatego sa tu tekstem.
    ("label.completed", "Eseguito"),
    ("label.refused", "Rifiutato"),
    ("label.limited", "Eseguito con limiti/modifiche"),
    ("export.html_image", "immagine: {value}"),
    ("export.html_error", "errore: {value}"),
    ("export.json_valid", "JSON valido"),
    ("export.json_invalid", "JSON non valido"),
    ("export.python_ok", "sintassi valida"),
    ("export.python_syntax_error", "errore di sintassi"),
    ("export.python_no_code", "nessun codice Python"),
    ("export.meta_run", "esecuzione {id} · inizio {started} · durata {seconds} s"),
    ("export.meta_cancelled", "interrotta"),
    ("export.th_answer", "Risposta"),
    ("export.th_label", "Etichette"),
    ("export.th_tps_wall", "tok/s (orologio)"),
    // --- HuggingFace (catalogo di modelli GGUF) ----------------------------
    ("hf.not_responding", "Nessuna connessione a HuggingFace: {error}"),
    (
        "hf.rate_limited",
        "HuggingFace sta limitando le richieste: riprova tra {seconds} s",
    ),
    ("hf.returned", "HuggingFace ha restituito {status}"),
    ("hf.bad_response", "Risposta illeggibile da HuggingFace: {error}"),
    ("hf.repo_missing", "Nessun repository di questo nome su HuggingFace: {repo}"),
    (
        "hf.repo_forbidden",
        "HuggingFace non dà accesso a questo repository ({status}) - potrebbe non esistere o essere limitato",
    ),
    // --- System ------------------------------------------------------------
    ("open.bad_url", "Questo non è un indirizzo web, quindi non lo apro."),
    ("export.source_registry", "registro di Ollama"),
    ("export.source_huggingface", "da HuggingFace"),
    (
        "export.source_tip",
        "Da dove viene il modello. Lo stesso modello può dare risultati diversi dal registro e da HuggingFace, perché il template e il parser arrivano dal repository."
    ),
    ("gpu.nvml_failed", "Non è stato possibile caricare NVML: {error}"),
    ("dialog.pick_image", "Seleziona un'immagine di prova"),
    ("dialog.image_filter", "Immagine"),
];
