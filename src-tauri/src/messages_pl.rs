//! Polskie komunikaty backendu.
//!
//! Te same kody i te same `{placeholdery}` co w `messages_en.rs` - zgodności
//! pilnują testy w `messages.rs`, więc komunikat nie może istnieć tylko w jednym
//! języku. Ten plik edytuje się samodzielnie: poprawka polskiego tekstu nie
//! dotyka angielskiego.

pub const CATALOG: &[(&str, &str)] = &[
    // --- Ollama ------------------------------------------------------------
    ("ollama.status", "Ollama odpowiedziała statusem {status}"),
    ("ollama.unreachable", "Brak połączenia z {endpoint}: {error}"),
    (
        "ollama.connect_failed",
        "Nie udało się połączyć z Ollamą ({endpoint}): {error}",
    ),
    ("ollama.returned", "Ollama zwróciła {status}: {detail}"),
    ("ollama.returned_status", "Ollama zwróciła {status}"),
    ("ollama.not_responding", "Ollama nie odpowiada: {error}"),
    ("ollama.connect", "Nie udało się połączyć z Ollamą: {error}"),
    ("ollama.connection_error", "Błąd połączenia z Ollamą: {error}"),
    (
        "ollama.memory_state",
        "Nie udało się odczytać stanu pamięci: {error}",
    ),
    (
        "ollama.model_not_downloaded",
        "Model {model} nie jest pobrany - najpierw go pobierz",
    ),
    ("ollama.tag_required", "Podaj tag modelu"),
    // --- Rejestr modeli ----------------------------------------------------
    ("registry.name_required", "Podaj nazwę modelu"),
    (
        "registry.foreign",
        "Rejestr zewnętrzny ({host}) nie obsługuje wyszukiwania rozmiaru - rozmiar pojawi się po pobraniu.",
    ),
    (
        "registry.not_found",
        "Nie znaleziono modelu w rejestrze Ollamy (HTTP {status})",
    ),
    (
        "registry.unreachable",
        "Brak połączenia z rejestrem Ollamy: {error}",
    ),
    (
        "registry.manifest_failed",
        "Nie udało się odczytać manifestu: {error}",
    ),
    ("registry.no_size", "Rejestr nie podał rozmiaru tego modelu"),
    // --- Test --------------------------------------------------------------
    ("run.already_running", "Test jest już w trakcie wykonywania"),
    ("run.bad_id", "Nieprawidłowy identyfikator przebiegu: {id}"),
    ("run.not_found", "Nie znaleziono przebiegu {id}"),
    ("run.cancelled", "Przerwano przez użytkownika"),
    (
        "classify.nothing_pending",
        "Brak odpowiedzi oczekującej na klasyfikację",
    ),
    (
        "classify.answer_not_found",
        "Nie znaleziono wskazanej odpowiedzi w przebiegu",
    ),
    ("image.read_failed", "Nie można odczytać obrazu {path}: {error}"),
    ("image.too_large", "Obraz jest zbyt duży (limit 40 MB)"),
    (
        "export.unsupported_format",
        "Nieobsługiwany format eksportu: {format}",
    ),
    // Etykiety klasyfikacji są zapisane w historii jako kody (`label.*`) -
    // tłumaczymy je dopiero w raporcie, żeby porównanie przebiegów nie zależało
    // od języka.
    ("label.completed", "Wykonał"),
    ("label.refused", "Odmówił"),
    ("label.limited", "Wykonał ale ograniczył/zmienił"),
    ("export.html_image", "obraz: {value}"),
    ("export.html_error", "błąd: {value}"),
    ("export.json_valid", "JSON poprawny"),
    ("export.json_invalid", "JSON niepoprawny"),
    ("export.python_ok", "poprawna składnia"),
    ("export.python_syntax_error", "błąd składni"),
    ("export.python_no_code", "brak kodu Python"),
    ("export.meta_run", "przebieg {id} · start {started} · czas trwania {seconds} s"),
    ("export.meta_cancelled", "przerwany"),
    ("export.th_answer", "Odpowiedź"),
    ("export.th_label", "Etykiety"),
    ("export.th_tps_wall", "tok/s (zegar)"),
    // --- HuggingFace (katalog modeli GGUF) ---------------------------------
    ("hf.not_responding", "Brak połączenia z HuggingFace: {error}"),
    (
        "hf.rate_limited",
        "HuggingFace ogranicza liczbę zapytań - spróbuj ponownie za {seconds} s",
    ),
    ("hf.returned", "HuggingFace zwrócił {status}"),
    ("hf.bad_response", "Nieczytelna odpowiedź HuggingFace: {error}"),
    ("hf.repo_missing", "Nie ma takiego repozytorium na HuggingFace: {repo}"),
    (
        "hf.repo_forbidden",
        "HuggingFace nie udostępnia tego repozytorium ({status}) - może nie istnieć albo być zamknięte",
    ),
    // --- Skąd model (raport HTML) ------------------------------------------
    ("export.source_registry", "rejestr Ollamy"),
    ("export.source_huggingface", "z HuggingFace"),
    (
        "export.source_tip",
        "Skąd przyszedł model. Ten sam model z rejestru i z HuggingFace może wypaść inaczej, bo szablon i parser pochodzą z repozytorium."
    ),
    // --- System ------------------------------------------------------------
    ("open.bad_url", "To nie jest adres internetowy, więc go nie otworzę."),
    ("gpu.nvml_failed", "Nie udało się załadować NVML: {error}"),
    ("dialog.pick_image", "Wybierz obraz testowy"),
    ("dialog.image_filter", "Obraz"),
];
