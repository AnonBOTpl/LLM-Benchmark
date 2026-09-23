//! Portugalskie (Brazylia) komunikaty backendu.
//!
//! Te same kody i te same `{placeholdery}` co w `messages_en.rs` - zgodnosci
//! pilnuja testy w `messages.rs`, wiec komunikat nie moze istniec tylko w jednym
//! jezyku. Tekst bledu jest **zapisywany** w historii przebiegu i w eksporcie,
//! dlatego jest tu gotowym zdaniem, a nie kodem do przetlumaczenia w UI.

pub const CATALOG: &[(&str, &str)] = &[
    // --- Ollama ------------------------------------------------------------
    ("ollama.status", "O Ollama respondeu com o estado {status}"),
    ("ollama.unreachable", "Sem conexão com {endpoint}: {error}"),
    (
        "ollama.connect_failed",
        "Não foi possível conectar ao Ollama ({endpoint}): {error}",
    ),
    ("ollama.returned", "O Ollama devolveu {status}: {detail}"),
    ("ollama.returned_status", "O Ollama devolveu {status}"),
    ("ollama.not_responding", "O Ollama não está respondendo: {error}"),
    ("ollama.connect", "Não foi possível conectar ao Ollama: {error}"),
    ("ollama.connection_error", "Erro de conexão com o Ollama: {error}"),
    (
        "ollama.memory_state",
        "Não foi possível ler o estado da memória: {error}",
    ),
    (
        "ollama.model_not_downloaded",
        "O modelo {model} não está baixado - baixe-o primeiro",
    ),
    ("ollama.tag_required", "Digite uma etiqueta de modelo"),
    // --- Model registry ----------------------------------------------------
    ("registry.name_required", "Digite um nome de modelo"),
    (
        "registry.foreign",
        "Um registro de terceiros ({host}) não permite consultar o tamanho - o tamanho aparecerá depois do download.",
    ),
    (
        "registry.not_found",
        "Modelo não encontrado no registro do Ollama (HTTP {status})",
    ),
    (
        "registry.unreachable",
        "Sem conexão com o registro do Ollama: {error}",
    ),
    (
        "registry.manifest_failed",
        "Não foi possível ler o manifesto do registro: {error}",
    ),
    (
        "registry.no_size",
        "O registro não informou um tamanho para este modelo",
    ),
    // --- Benchmark ---------------------------------------------------------
    ("run.already_running", "Já existe um teste em andamento"),
    ("run.bad_id", "Id de execução inválido: {id}"),
    ("run.not_found", "A execução {id} não foi encontrada"),
    ("run.cancelled", "Cancelado pelo usuário"),
    (
        "classify.nothing_pending",
        "Nenhuma resposta está aguardando classificação",
    ),
    (
        "classify.answer_not_found",
        "A resposta marcada não foi encontrada na execução",
    ),
    ("image.read_failed", "Não foi possível ler a imagem {path}: {error}"),
    ("image.too_large", "A imagem é grande demais (limite de 40 MB)"),
    ("export.unsupported_format", "Formato de exportação não suportado: {format}"),
    // Etykiety sa zapisywane w historii jako kody (`label.*`), a tlumaczone
    // dopiero w raporcie - dlatego sa tu tekstem.
    ("label.completed", "Concluiu"),
    ("label.refused", "Recusou"),
    ("label.limited", "Concluiu com limites/mudanças"),
    ("export.html_image", "imagem: {value}"),
    ("export.html_error", "erro: {value}"),
    ("export.json_valid", "JSON válido"),
    ("export.json_invalid", "JSON inválido"),
    ("export.python_ok", "sintaxe válida"),
    ("export.python_syntax_error", "erro de sintaxe"),
    ("export.python_no_code", "sem código Python"),
    ("export.meta_run", "execução {id} · início {started} · duração {seconds} s"),
    ("export.meta_cancelled", "interrompida"),
    ("export.th_answer", "Resposta"),
    ("export.th_label", "Rótulos"),
    ("export.th_tps_wall", "tok/s (relógio)"),
    // --- HuggingFace (catálogo de modelos GGUF) ----------------------------
    ("hf.not_responding", "Sem conexão com o HuggingFace: {error}"),
    (
        "hf.rate_limited",
        "O HuggingFace está a limitar pedidos: tente novamente em {seconds} s",
    ),
    ("hf.returned", "O HuggingFace devolveu {status}"),
    ("hf.bad_response", "Resposta ilegível do HuggingFace: {error}"),
    ("hf.repo_missing", "Não existe esse repositório no HuggingFace: {repo}"),
    (
        "hf.repo_forbidden",
        "O HuggingFace não dá acesso a esse repositório ({status}) - pode não existir ou estar restrito",
    ),
    // --- System ------------------------------------------------------------
    ("open.bad_url", "Isso não é um endereço web, então não vou abri-lo."),
    ("export.source_registry", "registro do Ollama"),
    ("export.source_huggingface", "do HuggingFace"),
    (
        "export.source_tip",
        "De onde veio o modelo. O mesmo modelo pode render resultados diferentes do registro e do HuggingFace, porque o template e o analisador vêm do repositório."
    ),
    ("gpu.nvml_failed", "Não foi possível carregar o NVML: {error}"),
    ("dialog.pick_image", "Selecione uma imagem de teste"),
    ("dialog.image_filter", "Imagem"),
];
