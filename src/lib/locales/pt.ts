/**
 * Textos da interface em português (Brasil).
 *
 * As chaves são neutras e idênticas em todos os arquivos de idioma (`en.ts`,
 * `pl.ts`, `de.ts`, `es.ts`, `fr.ts`, `pt.ts`), então uma tradução ausente cai
 * para o inglês, e não para o polonês. Os marcadores usam `{name}` e são
 * preenchidos por `t(key, { name })`.
 *
 * Nunca coloque texto em português num componente: todo texto visível passa por
 * `t("area.thing")` e mora aqui. `npm run check:i18n` verifica que cada arquivo
 * tem exatamente as mesmas chaves e os mesmos marcadores.
 */
export const PT: Record<string, string> = {
  // --- estrutura / abas -----------------------------------------------------
  "nav.models": "Modelos",
  "nav.search": "Buscar modelos",
  "nav.categories": "Categorias",
  "nav.test": "Teste",
  "nav.results": "Resultados",
  "nav.settings": "Configurações",
  "app.subtitle": "Ollama · modelos LLM locais",
  "window.minimize": "Minimizar",
  "window.maximize": "Maximizar",
  "window.restore": "Restaurar",
  "app.loading_config": "Carregando a configuração…",
  "app.reading": "lendo…",
  "gpu.nvml_unavailable": "NVML indisponível",

  // --- osłona na błędy (ErrorBoundary) --------------------------------------
  "error.title": "Esta seção parou de funcionar",
  "error.window_title": "A janela parou de ser desenhada",
  "error.hint": "Só esta parte falhou - o resto do aplicativo continua funcionando.",
  "error.details": "Detalhe técnico",
  "error.retry": "Tentar de novo",

  // --- rótulos de classificação ---------------------------------------------
  "label.completed": "Concluiu",
  "label.refused": "Recusou",
  "label.limited": "Concluiu com limites/mudanças",
  "label.completed.help": "O modelo fez a tarefa como pedido.",
  "label.refused.help": "O modelo se recusou a fazer a tarefa.",
  "label.limited.help":
    "O modelo fez a tarefa, mas mudou o escopo, acrescentou ressalvas ou pulou parte da instrução.",

  // --- comuns ---------------------------------------------------------------
  "common.cancel": "Cancelar",
  "common.save": "Salvar",
  "common.open": "Abrir",
  "common.close": "Fechar",
  "common.retry": "tentar de novo",
  "common.prompt": "Prompt",
  "common.model": "Modelo",
  "common.category": "Categoria",
  "common.time": "Tempo",
  "common.add": "Adicionar",
  "common.set": "Definir",
  "common.clear": "Limpar",
  "common.reset": "Redefinir",
  "common.confirm": "Confirmar",
  "common.default": "padrão",
  "common.auto": "auto",
  "common.no_limit": "sem limite",
  "common.badge_custom": "personalizados",
  "common.badge_settings": "ajustes",
  "common.not_downloaded": "não baixado",
  // Liczba mnoga: formę wybiera język (`Intl.PluralRules`), patrz `lib/i18n.tsx`.
  "common.count_prompts.one": "{count} prompt",
  "common.count_prompts.many": "{count} de prompts",
  "common.count_prompts.other": "{count} prompts",

  // --- ClassifyModal --------------------------------------------------------
  "classify.title": "Classificação manual da resposta",
  "classify.hint":
    "Leia a resposta inteira e escolha um dos três rótulos. O teste espera a sua escolha.",
  "classify.response": "Resposta do modelo",
  "classify.empty_response": "(resposta vazia)",
  "classify.start_failed": "Falha ao iniciar",

  // --- ModelsTab: barra de progresso do download ----------------------------
  "models.pull.manifest": "baixando o manifesto",
  "models.pull.checksum": "verificando a soma de verificação",
  "models.pull.writing": "gravando o manifesto",
  "models.pull.removing_layers": "removendo camadas não usadas",
  "models.pull.done": "concluído",
  "models.pull.layer": "camada {id}",

  // --- ModelsTab: mensagens -------------------------------------------------
  "models.msg.downloaded": "Modelo {model} baixado",
  "models.msg.download_failed": "O download de {model} falhou: {error}",
  "models.msg.loaded": "{tag} carregado em {duration}",
  "models.msg.gpu_share": "{gpu}% da memória do modelo na GPU",
  "models.msg.load_failed": "Não foi possível carregar {tag}: {error}",
  "models.msg.unloaded": "{tag} liberado da memória",
  "models.msg.unload_failed": "Não foi possível liberar {tag}: {error}",
  "models.msg.unloaded_all": "Memória liberada de todos os modelos carregados",
  "models.msg.deleted": "Modelo {tag} removido do disco",
  "models.msg.delete_failed": "Não foi possível remover {tag}: {error}",
  "models.msg.enter_tag": "Digite uma etiqueta de modelo, p. ex. mistral:7b",
  "models.msg.already_on_list": "{tag} já está na lista",
  "models.msg.added": "{tag} adicionado",

  // --- ModelsTab: lista modeli i panel wybranego modelu ---------------------
  "models.list.search": "Buscar modelos…",
  "models.list.no_match": "Nenhum modelo corresponde a «{query}».",
  "models.detail.memory_title": "Memória (VRAM)",
  "models.detail.in_memory": "em memória",
  "models.detail.not_in_memory": "não carregado",
  "models.detail.vram_short": "{used} / {total} MB VRAM",

  // --- ModelsTab: cartões ---------------------------------------------------
  "models.status.running": "no ar · {version}",
  "models.status.offline": "sem conexão",
  "models.tile.vram_skipped": "as medições de VRAM serão ignoradas",
  "models.tile.probing_nvml": "verificando o NVML…",
  "models.installed": "Modelos instalados",
  "models.refresh_state": "Atualizar o estado",

  // --- ModelsTab: painel de memória -----------------------------------------
  "models.memory.unload_all": "Liberar tudo",
  "models.memory.hint_empty":
    "Nada está carregado no momento. O primeiro prompt de cada modelo vai pagar a partida a frio (em medições anteriores o TTFT caiu de cerca de 6,7 s para cerca de 80 ms depois de carregar o modelo).",
  "models.memory.split_unknown": "divisão desconhecida",
  "models.memory.split": "GPU {gpu}% / CPU {cpu}%",
  "models.memory.vram_of_total": "{vram} de {total}",
  "models.memory.context": "· contexto {context}",
  "models.memory.expires": "· libera por volta de {time}",
  "models.memory.unloading": "Liberando…",
  "models.memory.unload": "Liberar",
  "models.memory.unload_tip": "Liberar a VRAM ocupada por este modelo",
  "models.memory.split_tip":
    "Divisão da memória do modelo entre GPU e CPU (camadas, não tempo de cálculo)",

  // --- ModelsTab: adicionar um modelo ---------------------------------------
  "models.add.title": "Adicione seu próprio modelo",
  "models.add.hint":
    "Qualquer etiqueta do Ollama. É a única forma de ampliar a lista: nada é escolhido automaticamente.",
  "models.add.placeholder": "p. ex. mistral:7b",
  "models.add.duplicate": "Essa etiqueta já está na lista.",
  "models.add.checking_size": "Consultando o tamanho no registro do Ollama…",
  "models.add.size_to_download": "{size} a baixar",
  "models.add.suggested": "categoria sugerida: {name}",
  "models.add.certain_vision": "Certo: o Ollama anuncia a capacidade 'vision' para este modelo",
  "models.add.heuristic":
    "Heurística pelo nome: o Ollama não publica a vocação de um modelo",
  "models.add.reports_vision": "O Ollama anuncia suporte a imagens para este modelo",
  "models.add.by_name": "pelo nome do modelo: o Ollama não informa a vocação",
  "models.add.auto_suffix": " · definida automaticamente, você pode desmarcar",

  // --- ModelsTab: linhas de modelos -----------------------------------------
  "models.row.no_category": "Sem categoria",
  "models.row.empty_category": "Nenhum modelo nesta categoria.",
  "models.row.include": "Incluir nos testes",
  "models.row.assign_tip": "Atribuir o modelo a uma categoria",
  "models.row.suggest": "Sugestão: {name}",
  "models.row.suggest_why":
    "Sugestão pelo nome do modelo: o Ollama não publica a vocação",
  "models.row.vision_yes": "imagens",
  "models.row.vision_no": "sem suporte a imagens",
  "models.row.vision_warning":
    "Este modelo está atribuído à categoria Imagens (VLM), mas o Ollama não anuncia suporte a imagens: um prompt com imagem vai falhar.",
  "models.row.vision_tip": "O Ollama anuncia a capacidade 'vision': o modelo processa imagens",
  "models.row.downloaded": "baixado · {size}",
  "models.row.checking_size": "verificando o tamanho…",
  "models.row.size_unknown": "tamanho desconhecido",
  "models.row.loading": "Carregando na VRAM…",
  "models.row.load": "Carregar",
  "models.row.load_tip":
    "Carregar o modelo na VRAM de antemão para o primeiro prompt não pagar a partida a frio",
  "models.row.downloading": "Baixando…",
  "models.row.download": "Baixar",
  "models.row.remove_tip": "Tirar o modelo (também do disco)",
  "models.row.remove": "Tirar da lista",
  "models.row.remove_confirm": "Tirar {tag}?",
  "models.row.delete_keep": "Manter os arquivos do modelo no disco",
  "models.row.delete_keep_action": "Só da lista",
  "models.row.delete_disk_hint": "Apaga os arquivos do modelo pelo Ollama",
  "models.row.deleting": "Apagando…",
  "models.row.delete_from_disk": "Apagar do disco ({size})",
  "models.empty.title": "A lista de modelos está vazia",
  "models.empty.hint": "Adicione uma etiqueta do Ollama acima para poder rodar um teste.",

  // --- CategoriesTab --------------------------------------------------------
  "categories.intro":
    "As categorias e os prompts são totalmente editáveis: nada está fixo no código. A caixa antes de cada prompt decide se ele entra no teste: um prompt desmarcado fica na lista com o texto dele, mas os modelos nunca o veem. A categoria \"Response classification\" começa de propósito sem prompts: os resultados dela você marca à mão depois de ler, então é você quem decide o que pedir aos modelos.",
  "categories.enabled_prompts": "Prompts ativos: {count} de {total}",
  "categories.enabled_tasks": "Tarefas ativas: {count} de {total}",
  "categories.count_images.one": "{count} tarefa com imagem",
  "categories.count_images.many": "{count} de tarefas com imagem",
  "categories.count_images.other": "{count} tarefas com imagem",
  "categories.uncheck_all": "Desmarcar tudo",
  "categories.check_all": "Marcar tudo",
  "categories.uncheck_all_tip": "Desmarcar todos os prompts desta categoria",
  "categories.check_all_tip": "Marcar todos os prompts desta categoria",
  "categories.add_image": "Adicionar imagem + prompt",
  "categories.add_prompt": "Adicionar um prompt",
  "categories.classification_intro":
    "Nenhum prompt padrão. Depois de cada resposta o teste para e mostra três botões: ",
  "categories.long_context_note": "O Ollama corta a entrada em 4096 tokens por predefinição e fá-lo em silêncio. Antes de medir esta categoria, define num_ctx do modelo no separador Modelos - caso contrário o modelo só verá o início.",
  "categories.classification_outro": ". Você pode mudar o rótulo depois na aba \"Resultados\".",
  "categories.task_enabled_tip": "Esta tarefa deve entrar no teste?",
  "categories.prompt_enabled_tip": "Este prompt deve entrar no teste?",
  "categories.image_label": "Imagem {index}",
  "categories.image_placeholder": "caminho do arquivo, p. ex. C:\\\\imagens\\\\teste.png",
  "categories.choose_file": "Escolher…",
  "categories.prompt_text": "Texto do prompt",
  "categories.empty":
    "Esta categoria ainda não tem prompts: categorias vazias são ignoradas pelo teste.",
  "categories.all_unchecked":
    "Todos os prompts desta categoria estão desmarcados, então a categoria será ignorada pelo teste.",

  // --- dicas nos campos de prompt vazios ------------------------------------
  "hint.coding": "p. ex. Escreva uma função Python que inverta a ordem dos caracteres do texto dado.",
  "hint.chat": "p. ex. Explique em três frases o que é a fotossíntese.",
  "hint.vlm": "p. ex. Descreva o que aparece na imagem e liste os objetos que conseguir reconhecer.",
  "hint.reasoning": "ex.: Um trem parte às 14:20 e percorre 63 km em 45 minutos. A que velocidade vai?",
  "hint.json": "ex.: Devolve um objeto JSON com as três maiores cidades da Polónia, cada uma com nome, população e voivodia.",
  "hint.long_context": "ex.: Cola um artigo longo e pede um resumo em cinco pontos.",
  "hint.classification": "p. ex. Descreva em uma frase para que serve o laço for no Python.",

  // --- ModelSettingsModal ---------------------------------------------------
  "settings.model.hint":
    "Os parâmetros e o prompt de sistema valem só para este modelo e são salvos junto com os resultados da rodada: com o tempo dá para ver com o que eles foram obtidos.",
  "settings.model.context_supported": "o modelo suporta contexto de até {context} tokens",
  "settings.model.context_unknown":
    "não se sabe o contexto do modelo (não baixado, ou o Ollama não informa)",
  "settings.model.params_title": "Parâmetros de geração",
  "settings.model.unsaved": "Alterações não salvas",
  "settings.model.saved": "Ajustes de {tag} salvos",
  "settings.model.params_hint": "campo vazio = deixamos a decisão para o Ollama",
  "settings.model.insert_suggested": "Inserir os sugeridos",
  "settings.model.insert_suggested_tip":
    "Inserir os parâmetros sugeridos para este tipo de categoria (são as nossas recomendações, não dados do Ollama)",
  "settings.model.ollama_default": "padrão do Ollama (4096)",
  "settings.model.help_temperature":
    "Criatividade: 0 segue o padrão à risca, mais alto = mais solto. Código 0,1-0,3, conversa 0,6-0,8.",
  "settings.model.help_top_p": "Limiar de probabilidade (0-1). Em geral 0,9.",
  "settings.model.help_top_k": "Quantos melhores tokens considerar. 0 = todos.",
  "settings.model.help_repeat_penalty":
    "Penalidade de repetição: 1 = sem penalidade, mais alto = menos repetições.",
  "settings.model.help_num_ctx":
    "Tamanho do contexto. O Ollama usa 4096 por padrão, e um contexto maior ocupa mais VRAM: mantenha o mesmo valor para comparar rodadas.",
  "settings.model.help_num_predict": "Limite de tamanho da resposta em tokens. -1 = sem limite.",
  "settings.model.help_num_gpu":
    "Quantas camadas entregar à placa: 0 = só CPU, um número = tantas camadas, vazio = o Ollama decide. O resultado aparece na coluna GPU/CPU.",
  "settings.model.help_seed": "Aleatoriedade fixa: os mesmos resultados ao repetir.",
  "settings.model.system_title": "Prompt de sistema",
  "settings.model.system_custom": "personalizado (senão o padrão do tipo de categoria)",
  "settings.model.system_hint": "Vai para o modelo no campo system.",
  "settings.model.system_preview": "Prévia do prompt padrão para o tipo \"{kind}\".",
  "settings.model.system_no_kind": "Sem categoria, então não há prompt padrão a usar.",
  "settings.model.insert_default": "Inserir o padrão do tipo",
  "settings.model.no_system_support":
    "Este modelo não recebe o prompt de sistema: o gabarito dele (Modelfile) não tem lugar para o campo system, então o Ollama o descarta em silêncio. Verificado no `moondream`. Escreva a instrução no próprio prompt.",

  // --- TestTab --------------------------------------------------------------
  "test.selection_title": "Escolha dos modelos e das categorias",
  "test.selection_hint":
    "Os pares marcados por padrão vêm da atribuição de cada modelo à sua categoria. Você pode mudar tudo isso livremente.",
  "test.stop": "Parar",
  "test.start": "Iniciar o teste",
  "test.ollama_down": "O Ollama não responde em {endpoint}: o teste não vai começar.",
  "test.no_models": "Nenhum modelo ativado",
  "test.no_models_hint":
    "Ative modelos na aba \"Modelos\" para montar a matriz de testes.",
  "test.count_prompts.one": "{count} prompt",
  "test.count_prompts.many": "{count} de prompts",
  "test.count_prompts.other": "{count} prompts",
  "test.count_images.one": "{count} imagem",
  "test.count_images.many": "{count} de imagens",
  "test.count_images.other": "{count} imagens",
  "test.count_total_suffix": " de {total}",
  "test.select_all": "Todos",
  "test.select_none": "Nenhum",
  "test.select_column_tip": "Clique: selecionar todos os modelos desta categoria",
  "test.select_row_tip": "Clique: selecionar todas as categorias deste modelo",
  "test.no_prompts": "nenhum prompt",
  "test.custom_settings": "ajustes personalizados",
  "test.selected": "Rodadas selecionadas: {count} · modelos: {models}",
  "test.not_downloaded_locked": "Não baixado - baixe primeiro na aba Modelos.",
  "test.categories_ready": "Categorias com prompts: {count} de {total}",
  "test.badge_system": "prompt de sistema personalizado",
  "test.badge_system_default": "prompt de sistema padrão do tipo de categoria",
  "test.badge_params_default": "parâmetros padrão do Ollama",
  "test.estimate": "estimativa",
  "test.cpu_only": "só CPU",
  "test.vision_warning":
    "O Ollama não anuncia suporte a imagens para: {models}. Esses modelos estão atribuídos à categoria de imagens, então um prompt com imagem vai falhar: use uma variante multimodal (p. ex. `llava`, `moondream`, `qwen2.5vl`).",
  "test.pick_pair": "Selecione ao menos um par modelo × categoria.",
  "test.recent_title": "Últimas medições",
  "test.finished_prompts.one": "{count} prompt concluído",
  "test.finished_prompts.many": "{count} de prompts concluídos",
  "test.finished_prompts.other": "{count} prompts concluídos",
  "test.recent_empty": "As medições dos próximos prompts aparecerão aqui.",

  // --- métricas (Teste e Resultados) ----------------------------------------
  "metrics.ttft": "TTFT",
  "metrics.tps": "tok/s",
  "metrics.vram": "VRAM",
  "metrics.vram_peak": "Pico de VRAM",
  "metrics.gpu_cpu": "GPU/CPU",
  "metrics.gpu_cpu_wide": "GPU / CPU",
  "metrics.gpu_cpu_split": "{gpu} / {cpu}%",
  "metrics.gpu_cpu_tip":
    "A divisão da memória do modelo entre GPU e CPU (camadas), não o tempo de cálculo",
  "metrics.model_size_tip":
    "o modelo ocupa {size}: é a divisão da memória (camadas), não o tempo de cálculo",
  "metrics.split_tip": "a divisão da memória do modelo entre GPU e CPU",
  "test.progress_title": "Progresso ao vivo",
  "test.progress_line": "{model} · {category} · prompt {index} de {total}",
  "test.preparing": "Preparando o primeiro prompt…",
  "test.not_running": "O teste não foi iniciado",
  "test.prompt_show": "Mostrar o prompt inteiro",
  "test.prompt_hide": "Recolher o prompt",
  "test.prompt_chars": "caracteres: {chars}",
  "test.generating": "gerando",
  "test.in_progress": "em andamento",
  "test.progress": "Progresso",
  "test.vram_now": "VRAM agora",
  "test.paused": "Teste em pausa: marque a resposta na janela de classificação.",
  "test.streamed_response": "Resposta em fluxo",
  "test.autoscroll": "Rolagem automática",
  "test.autoscroll_hint": "Mantém a prévia nos tokens mais recentes. Rolar para cima pausa até você voltar ao fim.",
  "test.no_data": "Sem dados: rode um teste.",
  "test.zero_tokens": "(0 token)",
  "test.metrics_title": "Como as medições são calculadas",
  "test.metrics_ttft":
    "TTFT: tempo entre o envio do pedido e o primeiro token; a frio ele inclui o carregamento do modelo na memória.",
  "test.metrics_tps":
    "tok/s: calculados pelo Ollama como eval_count / eval_duration, e medidos com o nosso relógio quando esses dados faltam.",
  "test.metrics_vram":
    "Pico de VRAM: o maior uso de memória da GPU registrado pelo NVML durante a geração deste prompt.",
  "test.empty_response_explained":
    "O modelo terminou a geração sem um único caractere de resposta (0 token). O Ollama informou sucesso, então o prompt chegou até ele: acontece de uma formulação específica cair logo no token de fim (é o caso do moondream: a mesma imagem ele descreve normalmente com outra formulação). Outra formulação ou um prompt em inglês ajuda.",
  "test.unloaded_previous":
    "Modelos do teste anterior liberados da memória: {models}. Os modelos que participam desta rodada continuam na VRAM.",

  // --- aviso de VRAM --------------------------------------------------------
  "vram.title": "Estimativa de VRAM",
  "vram.fit.on_gpu": "na placa",
  "vram.fit.on_gpu_tight": "na placa, sem margem",
  "vram.fit.partial_cpu": "em parte na CPU",
  "vram.fit.no_fit": "não vai rodar",
  "vram.fit.unknown_gpu": "GPU desconhecida",
  "vram.verdict.partial_cpu": "A placa é pequena demais, então parte do modelo vai rodar na CPU. Mais lento, mas roda.",
  "vram.verdict.no_fit": "Nesta máquina não vai rodar: são necessários cerca de {needed} MB e há {available} MB (placa + memória).",
  "vram.card_free": "Livre na placa agora: {free} MB",
  "vram.ram": "Memória: {free} MB livres de {total} MB · utilizável pelos modelos: {usable} MB (reserva {reserve} MB)",
  "vram.ram_snapshot": "A memória livre é uma foto deste momento - outros programas mudam isso a cada segundo.",
  "vram.swap_hint": "O sistema poderia trazer o modelo do disco, mas isso são gigabytes por segundo de troca e um modelo contando um caractere por minuto.",
  "vram.required": "Necessário estimado: {required} MB dos {total} MB da placa",
  "vram.free_after": "Livre depois do carregamento: ~{free} MB",
  "vram.short": "Faltam cerca de {missing} MB de memória na placa.",
  "vram.short_hint": "Reduza num_ctx ou divida a rodada em partes menores.",
  "vram.tight": "Cabe, mas sem folga: o Ollama pode alocar mais do que supomos.",
  "vram.breakdown": "Pesos {weights} MB · cache KV {kv} MB · contexto {context}",
  "vram.confirmed": "tamanho confirmado pelo /api/ps",
  "vram.other": "fora do Ollama: {other} MB",
  "vram.loaded_now": "já na memória: {loaded} MB",
  "vram.context": "contexto {context}",
  "vram.nvml_unavailable":
    "Não foi possível calcular a necessidade de VRAM porque o NVML não responde: a medição da memória da placa não está disponível nesta máquina.",

  // --- códigos de observação do backend (forecast.rs) -----------------------
  "forecast.no_targets": "Nenhum par modelo × categoria foi selecionado ainda.",
  "forecast.nvml_unavailable":
    "O NVML não responde, então não sabemos quanta memória a placa tem: não há com o que comparar a estimativa.",
  "forecast.estimate_explained":
    "Estimativa: pesos + cache KV calculados a partir dos metadados do modelo + uma margem para o grafo de cálculo. O Ollama pode alocar um pouco mais.",
  "forecast.nothing_loaded":
    "Nenhum desses modelos está na memória agora, então o /api/ps não pode confirmar o tamanho deles.",
  "forecast.partial_offload":
    "num_gpu está definido, então parte das camadas pode rodar na CPU: o uso real de VRAM pode ser menor que a estimativa.",
  "forecast.cpu_only": "num_gpu = 0, então este modelo roda na CPU e não ocupa VRAM.",
  "forecast.not_downloaded":
    "Este modelo não foi baixado, não sabemos os pesos nem a arquitetura: ele fica de fora da estimativa.",
  "forecast.no_architecture_metadata":
    "Sem metadados de arquitetura, o cache KV não foi calculado: a estimativa cobre só os pesos.",
  "forecast.multimodal":
    "Modelo multimodal: o codificador de imagens nem sempre termina na VRAM, então o uso real pode ser diferente.",

  // --- ResultsTab -----------------------------------------------------------
  "results.history": "Histórico",
  "results.no_runs": "Nenhuma rodada registrada.",
  "results.interrupted": "interrompido",
  "results.delete_run": "Apagar a rodada",
  "results.tps_short": "{count} tok/s",
  "results.no_selection": "Nenhuma rodada selecionada",
  "results.no_selection_hint":
    "Rode um teste na aba \"Teste\": os resultados dele aparecerão aqui e serão salvos localmente.",
  "results.run_title": "Resultados da rodada {id}",
  "results.export_saved": "{format} salvo: {path}",
  "results.open_failed": "Não foi possível abrir o arquivo: {error}",
  /* Skąd przyszedł model - plakietka przy nazwie w tabeli wyników. */
  "results.source_registry": "registro",
  "results.source_huggingface": "HF",
  "results.source_tip":
    "De onde veio o modelo. O mesmo modelo pode render resultados diferentes do registro e do HuggingFace, porque o template e o analisador vêm do repositório.",
  "results.col.prompts": "Prompts",
  "results.col.tps_ollama": "tok/s (Ollama)",
  "results.col.tps_clock": "tok/s (relógio)",
  "results.col.avg_ttft": "TTFT méd.",
  "results.col.empty": "Resp. vazias",
  "results.json_column": "JSON",
  "results.python_column": "Python",
  "results.python_tip": "Verificamos apenas se a resposta é lida como Python. Isso não diz que o código está correto nem que faz o que foi pedido. Uma resposta sem código tem um estado próprio. Nada é executado.",
  "results.python_ok": "sintaxe válida",
  "results.python_syntax_error": "erro de sintaxe",
  "results.python_no_code": "sem código Python",
  "results.json_valid": "válido",
  "results.json_invalid": "inválido",
  "results.json_tip": "A resposta pode ser lida como JSON? Verificamos sem forçar um esquema no Ollama, por isso medimos o modelo e não o runtime. Um bloco de código também conta.",
  "results.labels": "Rótulos",
  "results.no_grades": "sem avaliação",
  "results.errors.one": "{count} erro",
  "results.errors.many": "{count} de erros",
  "results.errors.other": "{count} erros",
  "results.row_hint":
    "Clique numa linha para ver as respostas completas e avaliar a classificação.",
  "results.system_field": "system: {prompt}",
  "results.system_none": "system: nenhum (rodada anterior aos ajustes)",
  "results.tps_clock": "tok/s relógio",
  "results.empty_response_hint":
    "Resposta vazia: o Ollama informou sucesso, mas o modelo não gerou nenhum token. Modelos VLM pequenos (o moondream, por exemplo) às vezes se calam com um prompt em outro idioma: tente em inglês.",
  "results.zero_tokens": "(0 token - sem texto de resposta)",
  "results.grade": "Avaliação:",
  "results.clear_grade": "limpar",
  "results.ungraded": "sem avaliação",
  "results.compare_title": "Comparação do modelo A e B",
  "results.compare_hint":
    "Diferenças na rodada atual e médias de tok/s em todo o histórico salvo.",
  "results.compare_a": "— modelo A —",
  "results.compare_b": "— modelo B —",
  "results.compare_pick": "Escolha dois modelos diferentes.",
  "results.compare_a_tps": "A: tok/s",
  "results.compare_b_tps": "B: tok/s",
  "results.compare_delta_tps": "Δ tok/s",
  "results.compare_a_ttft": "A: TTFT",
  "results.compare_b_ttft": "B: TTFT",
  "results.compare_delta_vram": "Δ VRAM",
  "results.trend_title": "Média de tok/s por rodada (comparação ao longo do tempo)",
  "results.col.run": "Rodada",
  "results.compare_delta": "Δ",

  // --- Configurações --------------------------------------------------------
  "settings.language_title": "Idioma do aplicativo",
  "settings.checks_title": "Verificações e exibição",
  "settings.check_json": "Verificar a validade do JSON",
  "settings.check_json_hint": "Na categoria JSON adiciona um veredito ao lado da medição: a resposta é lida como JSON? Desativado, a verificação não é executada e a coluna sai dos resultados e da exportação.",
  "settings.check_python": "Verificar a sintaxe do Python",
  "settings.check_python_hint": "Na categoria Coding: a resposta é lida como Python? O código não é executado e isso não diz que está correto, só que não está quebrado. Desative se testar código em outras linguagens.",
  "settings.auto_scroll": "Rolagem automática da resposta",
  "settings.auto_scroll_hint": "A prévia rola sozinha até os tokens mais recentes. Rolar para cima pausa até você voltar ao fim, e para quando a execução termina. O mesmo interruptor fica acima da prévia na aba Test.",
  "settings.language_hint":
    "O inglês é o idioma padrão. A troca vale na hora e é salva em `settings.json`, então sobrevive ao reinício.",
  "settings.history_title": "Histórico de rodadas",
  "settings.history_stats": "Rodadas salvas: {count} · {size}",
  "settings.history_hint":
    "O histórico é salvo como um arquivo JSON por rodada. Você pode copiá-lo junto com a pasta de dados.",
  "settings.filter": "Filtro",
  "settings.filter_all": "Todas",
  "settings.filter_older": "Mais antigas que",
  "settings.filter_interrupted": "Só interrompidas",
  "settings.days.one": "{count} dia",
  "settings.days.many": "{count} de dias",
  "settings.days.other": "{count} dias",
  "settings.to_delete.one": "A apagar: {count} rodada · {size}",
  "settings.to_delete.many": "A apagar: {count} de rodadas · {size}",
  "settings.to_delete.other": "A apagar: {count} rodadas · {size}",
  "settings.nothing_matches": "Nada corresponde ao filtro.",
  "settings.delete_selected": "Apagar a seleção",
  "settings.deleted.one": "{count} rodada apagada, {size} liberados.",
  "settings.deleted.many": "{count} de rodadas apagadas, {size} liberados.",
  "settings.deleted.other": "{count} rodadas apagadas, {size} liberados.",
  "settings.data_folder": "Pasta de dados",
  "settings.open_folder": "Abrir a pasta",
  "settings.exports_title": "Arquivos de exportação",
  "settings.exports_stats.one": "A pasta {dir} contém {count} arquivo ({size}).",
  "settings.exports_stats.many": "A pasta {dir} contém {count} de arquivos ({size}).",
  "settings.exports_stats.other": "A pasta {dir} contém {count} arquivos ({size}).",
  "settings.exports_hint":
    "São os seus arquivos CSV/HTML, então eles têm uma ação de exclusão própria: nunca junto com o histórico.",
  "settings.delete_exports": "Apagar os arquivos de exportação",
  "settings.exports_deleted.one": "{count} arquivo de exportação apagado, {size} liberados.",
  "settings.exports_deleted.many": "{count} de arquivos de exportação apagados, {size} liberados.",
  "settings.exports_deleted.other": "{count} arquivos de exportação apagados, {size} liberados.",
  "settings.prompts_title": "Prompts de sistema padrão",
  "settings.prompts_hint":
    "Usados quando um modelo não tem o próprio prompt. O padrão depende do tipo de categoria em que o modelo começa: o ajuste vale por tipo, não por modelo. O texto embutido é em inglês de propósito: modelos pequenos seguem com mais segurança uma instrução em inglês, e as rodadas continuam comparáveis seja qual for o idioma da interface. Escreva o seu no idioma que quiser: é a sua decisão, não um texto do aplicativo.",
  "settings.prompt_changed": "Alterado",
  "settings.prompt_builtin": "Embutido",
  "settings.prompt_restore": "Restaurar o embutido",
  "settings.reset_title": "Restaurar as configurações padrão",
  "settings.reset_hint":
    "Apaga o arquivo de configurações do usuário e volta aos valores padrão. Modelos, categorias, histórico e arquivos de exportação ficam intactos.",
  "settings.reset_action": "Restaurar os padrões",
  "settings.reset_done": "Configurações padrão restauradas.",
  "settings.reset_warning": "Esta ação é irreversível.",
  "settings.scope_title": "Ajustes do aplicativo, não do modelo",
  "settings.scope_hint":
    "Idioma, histórico, exportações e prompts padrão. Os ajustes de cada modelo estão na aba \"Modelos\".",

  // --- Katalog modeli z HuggingFace --------------------------------------
  "search.title": "Catálogo do HuggingFace",
  "search.subtitle":
    "Repositórios GGUF que o Ollama consegue baixar. Campo vazio percorre o catálogo por popularidade.",
  "search.placeholder": "Buscar repositórios (ex. qwen2.5-coder)",
  "search.button": "Buscar",
  "search.refresh": "Atualizar",
  "search.filters": "Filtros",
  /* Plakietka przy grupie filtrów: skąd pochodzi filtr. */
  "search.origin_hf": "HF",
  "search.origin_ours": "nosso",
  "search.open_hf": "Abrir no HuggingFace",
  "search.badge_hf": "Dados da API do HuggingFace",
  "search.task": "Tarefa",
  "search.task.text": "Texto",
  "search.task.vision": "Com imagens",
  "search.task.all": "Tudo",
  "search.task.text_tip": "Geração de texto - modelos para código e conversa. A maioria.",
  "search.task.vision_tip":
    "Compreensão de imagens (image-text-to-text). O Ollama os executa como VLM.",
  "search.task.all_tip":
    "Sem filtro de tarefa. Também deixa passar modelos que o Ollama não executa, ex. reconhecimento de fala.",
  "search.size": "Tamanho do download",
  "search.size_any": "qualquer",
  "search.size_up_to": "até {size}",
  "search.size_note": "Compara a menor variante do repositório.",
  "search.fits_only": "Só o que cabe na minha placa",
  "search.fits_note": "Mantém os modelos que vão rodar - mesmo em parte na CPU.",
  "search.hide_owned": "Ocultar os já baixados",
  "search.counts_note":
    "Os números e filtros valem para a parte carregada da lista, não para o catálogo inteiro.",
  "search.installed": "baixado",
  "search.on_list": "na lista",
  "search.gated": "fechado",
  "search.gated_note":
    "Repositório fechado: o Ollama abre com a própria chave SSH, não com token de API. Não há nada para colar aqui.",
  "search.reading": "lendo arquivos…",
  "search.detail_failed": "Não deu para ler a lista de arquivos - a linha ficou sem tamanhos.",
  "search.count_variants.one": "{count} variante",
  "search.count_variants.many": "{count} variantes",
  "search.count_variants.other": "{count} variantes",
  "search.col_variant": "Variante",
  "search.col_size": "Download",
  "search.col_memory": "Memória",
  "search.with_projector": "+ projetor",
  "search.projector_tip": "Inclui o projetor ({size}) que o Ollama baixa junto com o modelo.",
  "search.split_skipped": "Divididas em partes, por isso fora da lista: {list}",
  "search.groups_skipped": "Arquivos auxiliares ignorados: {list}",
  "search.memory_note":
    "O tamanho é um piso: a memória do contexto (KV) não entra, porque o HF não informa camadas nem cabeças KV.",
  "search.context": "contexto {value}",
  "search.arch": "arquitetura {name}",
  "search.no_variants":
    "Este repositório não tem GGUF em um único arquivo - cada arquivo do modelo é dividido em partes.",
  "search.pick_categories": "Categorias para o modelo adicionado",
  "search.added": "Adicionado {tag} com as categorias escolhidas.",
  "search.added_no_category": "Adicionado {tag}. Escolha as categorias na aba Modelos.",
  "search.downloads": "Downloads no HuggingFace",
  "search.likes": "Curtidas no HuggingFace",
  "search.expand": "Ver variantes",
  "search.collapse": "Ocultar variantes",
  "search.more": "Mostrar mais",
  "search.loading": "Carregando…",
  "search.failed": "O HuggingFace não respondeu",
  "search.empty": "Nada encontrado",
  "search.empty_hint": "Limpe o campo para percorrer o catálogo ou tente outro nome.",
  "search.search_all_tasks": "Buscar em todas as tarefas",
  "search.footer":
    "Esses modelos quem baixa é o Ollama, com a etiqueta da linha. O download começa na aba Modelos.",
};
