//! Niemieckie komunikaty backendu.
//!
//! Te same kody i te same `{placeholdery}` co w `messages_en.rs` - zgodności
//! pilnują testy w `messages.rs`, więc komunikat nie może istnieć tylko w jednym
//! języku. Tekst błędu jest **zapisywany** w historii przebiegu i w eksporcie,
//! dlatego jest tu gotowym zdaniem, a nie kodem do przetłumaczenia w UI.

pub const CATALOG: &[(&str, &str)] = &[
    // --- Ollama ------------------------------------------------------------
    ("ollama.status", "Ollama hat mit Status {status} geantwortet"),
    ("ollama.unreachable", "Keine Verbindung zu {endpoint}: {error}"),
    (
        "ollama.connect_failed",
        "Verbindung zu Ollama fehlgeschlagen ({endpoint}): {error}",
    ),
    ("ollama.returned", "Ollama hat {status} zurückgegeben: {detail}"),
    ("ollama.returned_status", "Ollama hat {status} zurückgegeben"),
    ("ollama.not_responding", "Ollama antwortet nicht: {error}"),
    ("ollama.connect", "Verbindung zu Ollama fehlgeschlagen: {error}"),
    ("ollama.connection_error", "Verbindungsfehler zu Ollama: {error}"),
    (
        "ollama.memory_state",
        "Der Speicherzustand konnte nicht gelesen werden: {error}",
    ),
    (
        "ollama.model_not_downloaded",
        "Modell {model} ist nicht geladen - lade es zuerst",
    ),
    ("ollama.tag_required", "Gib einen Modell-Tag ein"),
    // --- Model registry ----------------------------------------------------
    ("registry.name_required", "Gib einen Modellnamen ein"),
    (
        "registry.foreign",
        "Ein fremdes Register ({host}) unterstützt keine Größenabfrage - die Größe erscheint nach dem Herunterladen.",
    ),
    (
        "registry.not_found",
        "Modell nicht im Ollama-Register gefunden (HTTP {status})",
    ),
    (
        "registry.unreachable",
        "Keine Verbindung zum Ollama-Register: {error}",
    ),
    (
        "registry.manifest_failed",
        "Das Register-Manifest konnte nicht gelesen werden: {error}",
    ),
    (
        "registry.no_size",
        "Das Register hat keine Größe für dieses Modell gemeldet",
    ),
    // --- Benchmark ---------------------------------------------------------
    ("run.already_running", "Ein Test läuft bereits"),
    ("run.bad_id", "Ungültige Durchlauf-ID: {id}"),
    ("run.not_found", "Durchlauf {id} nicht gefunden"),
    ("run.cancelled", "Vom Nutzer abgebrochen"),
    (
        "classify.nothing_pending",
        "Keine Antwort wartet auf Klassifizierung",
    ),
    (
        "classify.answer_not_found",
        "Die markierte Antwort wurde im Durchlauf nicht gefunden",
    ),
    ("image.read_failed", "Das Bild {path} konnte nicht gelesen werden: {error}"),
    ("image.too_large", "Das Bild ist zu groß (Limit 40 MB)"),
    ("export.unsupported_format", "Nicht unterstütztes Exportformat: {format}"),
    // Etykiety sa zapisywane w historii jako kody (`label.*`), a tlumaczone
    // dopiero w raporcie - dlatego sa tu tekstem.
    ("label.completed", "Ausgeführt"),
    ("label.refused", "Verweigert"),
    ("label.limited", "Ausgeführt, aber eingeschränkt/geändert"),
    ("export.html_image", "Bild: {value}"),
    ("export.html_error", "Fehler: {value}"),
    ("export.json_valid", "gültiges JSON"),
    ("export.json_invalid", "ungültiges JSON"),
    ("export.python_ok", "gültige Syntax"),
    ("export.python_syntax_error", "Syntaxfehler"),
    ("export.python_no_code", "kein Python-Code"),
    ("export.meta_run", "Durchlauf {id} · Start {started} · Dauer {seconds} s"),
    ("export.meta_cancelled", "abgebrochen"),
    ("export.th_answer", "Antwort"),
    ("export.th_label", "Markierungen"),
    ("export.th_tps_wall", "tok/s (Uhr)"),
    // --- HuggingFace (GGUF-Modellkatalog) ----------------------------------
    ("hf.not_responding", "Keine Verbindung zu HuggingFace: {error}"),
    (
        "hf.rate_limited",
        "HuggingFace begrenzt die Anfragen - versuche es in {seconds} s erneut",
    ),
    ("hf.returned", "HuggingFace hat {status} zurückgegeben"),
    ("hf.bad_response", "Unlesbare Antwort von HuggingFace: {error}"),
    ("hf.repo_missing", "Kein Repository dieses Namens auf HuggingFace: {repo}"),
    (
        "hf.repo_forbidden",
        "HuggingFace gibt dieses Repository nicht frei ({status}) - es existiert vielleicht nicht oder ist geschützt",
    ),
    // --- Skąd model (raport HTML) ------------------------------------------
    ("export.source_registry", "Ollama-Registry"),
    ("export.source_huggingface", "von HuggingFace"),
    (
        "export.source_tip",
        "Woher das Modell kommt. Dasselbe Modell kann aus der Registry und von HuggingFace anders abschneiden, weil Template und Parser aus dem Repository stammen."
    ),
    // --- System ------------------------------------------------------------
    ("open.bad_url", "Das ist keine Webadresse, ich öffne sie nicht."),
    ("gpu.nvml_failed", "NVML konnte nicht geladen werden: {error}"),
    ("dialog.pick_image", "Testbild auswählen"),
    ("dialog.image_filter", "Bild"),
];
