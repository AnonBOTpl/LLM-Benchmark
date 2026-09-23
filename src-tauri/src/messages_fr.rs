//! Francuskie komunikaty backendu.
//!
//! Te same kody i te same `{placeholdery}` co w `messages_en.rs` - zgodnosci
//! pilnuja testy w `messages.rs`, wiec komunikat nie moze istniec tylko w jednym
//! jezyku. Tekst bledu jest **zapisywany** w historii przebiegu i w eksporcie,
//! dlatego jest tu gotowym zdaniem, a nie kodem do przetlumaczenia w UI.

pub const CATALOG: &[(&str, &str)] = &[
    // --- Ollama ------------------------------------------------------------
    ("ollama.status", "Ollama a répondu avec le statut {status}"),
    ("ollama.unreachable", "Pas de connexion à {endpoint} : {error}"),
    (
        "ollama.connect_failed",
        "Impossible de se connecter à Ollama ({endpoint}) : {error}",
    ),
    ("ollama.returned", "Ollama a renvoyé {status} : {detail}"),
    ("ollama.returned_status", "Ollama a renvoyé {status}"),
    ("ollama.not_responding", "Ollama ne répond pas : {error}"),
    ("ollama.connect", "Impossible de se connecter à Ollama : {error}"),
    ("ollama.connection_error", "Erreur de connexion à Ollama : {error}"),
    (
        "ollama.memory_state",
        "Impossible de lire l'état de la mémoire : {error}",
    ),
    (
        "ollama.model_not_downloaded",
        "Le modèle {model} n'est pas téléchargé - télécharge-le d'abord",
    ),
    ("ollama.tag_required", "Saisis une étiquette de modèle"),
    // --- Model registry ----------------------------------------------------
    ("registry.name_required", "Saisis un nom de modèle"),
    (
        "registry.foreign",
        "Un registre tiers ({host}) ne permet pas de consulter la taille - la taille apparaîtra après le téléchargement.",
    ),
    (
        "registry.not_found",
        "Modèle introuvable dans le registre Ollama (HTTP {status})",
    ),
    (
        "registry.unreachable",
        "Pas de connexion au registre Ollama : {error}",
    ),
    (
        "registry.manifest_failed",
        "Impossible de lire le manifeste du registre : {error}",
    ),
    (
        "registry.no_size",
        "Le registre n'a pas indiqué de taille pour ce modèle",
    ),
    // --- Benchmark ---------------------------------------------------------
    ("run.already_running", "Un test est déjà en cours"),
    ("run.bad_id", "Identifiant de passage invalide : {id}"),
    ("run.not_found", "Passage {id} introuvable"),
    ("run.cancelled", "Interrompu par l'utilisateur"),
    (
        "classify.nothing_pending",
        "Aucune réponse n'attend d'être classée",
    ),
    (
        "classify.answer_not_found",
        "La réponse notée n'a pas été trouvée dans le passage",
    ),
    ("image.read_failed", "Impossible de lire l'image {path} : {error}"),
    ("image.too_large", "L'image est trop grande (limite de 40 Mo)"),
    ("export.unsupported_format", "Format d'export non pris en charge : {format}"),
    // Etykiety sa zapisywane w historii jako kody (`label.*`), a tlumaczone
    // dopiero w raporcie - dlatego sa tu tekstem.
    ("label.completed", "Terminé"),
    ("label.refused", "Refusé"),
    ("label.limited", "Terminé avec des limites/changements"),
    ("export.html_image", "image : {value}"),
    ("export.html_error", "erreur : {value}"),
    ("export.json_valid", "JSON valide"),
    ("export.json_invalid", "JSON invalide"),
    ("export.python_ok", "syntaxe valide"),
    ("export.python_syntax_error", "erreur de syntaxe"),
    ("export.python_no_code", "aucun code Python"),
    ("export.meta_run", "exécution {id} · début {started} · durée {seconds} s"),
    ("export.meta_cancelled", "interrompue"),
    ("export.th_answer", "Réponse"),
    ("export.th_label", "Étiquettes"),
    ("export.th_tps_wall", "tok/s (horloge)"),
    // --- HuggingFace (catalogue de modèles GGUF) ---------------------------
    ("hf.not_responding", "Pas de connexion à HuggingFace : {error}"),
    (
        "hf.rate_limited",
        "HuggingFace limite les requêtes : réessayez dans {seconds} s",
    ),
    ("hf.returned", "HuggingFace a renvoyé {status}"),
    ("hf.bad_response", "Réponse illisible de HuggingFace : {error}"),
    ("hf.repo_missing", "Aucun dépôt de ce nom sur HuggingFace : {repo}"),
    (
        "hf.repo_forbidden",
        "HuggingFace ne donne pas accès à ce dépôt ({status}) : il peut ne pas exister ou être restreint",
    ),
    // --- System ------------------------------------------------------------
    ("open.bad_url", "Ce n'est pas une adresse web, je ne l'ouvrirai pas."),
    ("export.source_registry", "registre Ollama"),
    ("export.source_huggingface", "de HuggingFace"),
    (
        "export.source_tip",
        "D'où vient le modèle. Le même modèle peut donner des résultats différents depuis le registre et depuis HuggingFace, car le gabarit et l'analyseur viennent du dépôt."
    ),
    ("gpu.nvml_failed", "Impossible de charger NVML : {error}"),
    ("dialog.pick_image", "Choisis une image de test"),
    ("dialog.image_filter", "Image"),
];
