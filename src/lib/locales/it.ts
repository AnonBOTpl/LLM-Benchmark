/**
 * Testi dell'interfaccia in italiano.
 *
 * Le chiavi sono neutre e identiche in ogni file di lingua (`en.ts`, `pl.ts`,
 * `de.ts`, `es.ts`, `fr.ts`, `pt.ts`, `it.ts`), quindi una traduzione mancante
 * ricade sull'inglese e non sul polacco. I segnaposto usano `{name}` e vengono
 * riempiti da `t(key, { name })`.
 *
 * Non mettere mai testo italiano in un componente: ogni testo visibile passa da
 * `t("area.thing")` e vive qui. `npm run check:i18n` verifica che ogni file
 * abbia esattamente le stesse chiavi e gli stessi segnaposto.
 */
export const IT: Record<string, string> = {
  // --- struttura / schede ---------------------------------------------------
  "nav.models": "Modelli",
  "nav.search": "Cerca modelli",
  "nav.categories": "Categorie",
  "nav.test": "Test",
  "nav.results": "Risultati",
  "nav.settings": "Impostazioni",
  "app.subtitle": "Ollama · modelli LLM locali",
  "window.minimize": "Riduci a icona",
  "window.maximize": "Ingrandisci",
  "window.restore": "Ripristina",
  "app.loading_config": "Caricamento della configurazione…",
  "app.reading": "lettura…",
  "gpu.nvml_unavailable": "NVML non disponibile",

  // --- osłona na błędy (ErrorBoundary) --------------------------------------
  "error.title": "Questa sezione ha smesso di funzionare",
  "error.window_title": "La finestra ha smesso di disegnarsi",
  "error.hint": "Solo questa parte si è bloccata: il resto dell'app funziona ancora.",
  "error.details": "Dettaglio tecnico",
  "error.retry": "Riprova",

  // --- etichette di classificazione -----------------------------------------
  "label.completed": "Eseguito",
  "label.refused": "Rifiutato",
  "label.limited": "Eseguito con limiti/modifiche",
  "label.completed.help": "Il modello ha svolto il compito come richiesto.",
  "label.refused.help": "Il modello ha rifiutato di svolgere il compito.",
  "label.limited.help":
    "Il modello ha svolto il compito, ma ne ha cambiato la portata, ha aggiunto riserve o ha saltato una parte della consegna.",

  // --- comuni ---------------------------------------------------------------
  "common.cancel": "Annulla",
  "common.save": "Salva",
  "common.open": "Apri",
  "common.close": "Chiudi",
  "common.retry": "riprova",
  "common.prompt": "Prompt",
  "common.model": "Modello",
  "common.category": "Categoria",
  "common.time": "Tempo",
  "common.add": "Aggiungi",
  "common.set": "Imposta",
  "common.clear": "Pulisci",
  "common.reset": "Reimposta",
  "common.confirm": "Conferma",
  "common.default": "predefinito",
  "common.auto": "auto",
  "common.no_limit": "senza limite",
  "common.badge_custom": "personali",
  "common.badge_settings": "impostazioni",
  "common.not_downloaded": "non scaricato",
  // Liczba mnoga: formę wybiera język (`Intl.PluralRules`), patrz `lib/i18n.tsx`.
  "common.count_prompts.one": "{count} prompt",
  "common.count_prompts.many": "{count} di prompt",
  "common.count_prompts.other": "{count} prompt",

  // --- ClassifyModal --------------------------------------------------------
  "classify.title": "Classificazione manuale della risposta",
  "classify.hint":
    "Leggi tutta la risposta e scegli una delle tre etichette. Il test attende la tua scelta.",
  "classify.response": "Risposta del modello",
  "classify.empty_response": "(risposta vuota)",
  "classify.start_failed": "Avvio non riuscito",

  // --- ModelsTab: barra di avanzamento del download -------------------------
  "models.pull.manifest": "download del manifesto",
  "models.pull.checksum": "verifica del checksum",
  "models.pull.writing": "scrittura del manifesto",
  "models.pull.removing_layers": "rimozione dei livelli inutilizzati",
  "models.pull.done": "completato",
  "models.pull.layer": "livello {id}",

  // --- ModelsTab: messaggi --------------------------------------------------
  "models.msg.downloaded": "Modello {model} scaricato",
  "models.msg.download_failed": "Download di {model} non riuscito: {error}",
  "models.msg.loaded": "{tag} caricato in {duration}",
  "models.msg.gpu_share": "{gpu}% della memoria del modello sulla GPU",
  "models.msg.load_failed": "Impossibile caricare {tag}: {error}",
  "models.msg.unloaded": "{tag} liberato dalla memoria",
  "models.msg.unload_failed": "Impossibile liberare {tag}: {error}",
  "models.msg.unloaded_all": "Memoria liberata da tutti i modelli caricati",
  "models.msg.deleted": "Modello {tag} rimosso dal disco",
  "models.msg.delete_failed": "Impossibile rimuovere {tag}: {error}",
  "models.msg.enter_tag": "Inserisci un tag di modello, ad es. mistral:7b",
  "models.msg.already_on_list": "{tag} è già nella lista",
  "models.msg.added": "{tag} aggiunto",

  // --- ModelsTab: lista modeli i panel wybranego modelu ---------------------
  "models.list.search": "Cerca modelli…",
  "models.list.no_match": "Nessun modello corrisponde a «{query}».",
  "models.detail.memory_title": "Memoria (VRAM)",
  "models.detail.in_memory": "in memoria",
  "models.detail.not_in_memory": "non caricato",
  "models.detail.vram_short": "{used} / {total} MB VRAM",

  // --- ModelsTab: riquadri --------------------------------------------------
  "models.status.running": "attivo · {version}",
  "models.status.offline": "nessuna connessione",
  "models.tile.vram_skipped": "le misure di VRAM saranno ignorate",
  "models.tile.probing_nvml": "verifica di NVML…",
  "models.installed": "Modelli installati",
  "models.refresh_state": "Aggiorna lo stato",

  // --- ModelsTab: pannello memoria ------------------------------------------
  "models.memory.unload_all": "Libera tutto",
  "models.memory.hint_empty":
    "Al momento non c'è nulla di caricato. Il primo prompt di ogni modello pagherà l'avvio a freddo (in misure precedenti il TTFT è passato da circa 6,7 s a circa 80 ms dopo il caricamento del modello).",
  "models.memory.split_unknown": "ripartizione sconosciuta",
  "models.memory.split": "GPU {gpu}% / CPU {cpu}%",
  "models.memory.vram_of_total": "{vram} di {total}",
  "models.memory.context": "· contesto {context}",
  "models.memory.expires": "· si libera verso {time}",
  "models.memory.unloading": "Libero…",
  "models.memory.unload": "Libera",
  "models.memory.unload_tip": "Libera la VRAM occupata da questo modello",
  "models.memory.split_tip":
    "Ripartizione della memoria del modello tra GPU e CPU (livelli, non tempo di calcolo)",

  // --- ModelsTab: aggiunta di un modello ------------------------------------
  "models.add.title": "Aggiungi un tuo modello",
  "models.add.hint":
    "Qualsiasi tag di Ollama. È l'unico modo per allungare la lista: nulla viene scelto automaticamente.",
  "models.add.placeholder": "ad es. mistral:7b",
  "models.add.duplicate": "Questo tag è già nella lista.",
  "models.add.checking_size": "Consulto la dimensione nel registro di Ollama…",
  "models.add.size_to_download": "{size} da scaricare",
  "models.add.suggested": "categoria suggerita: {name}",
  "models.add.certain_vision": "Certo: Ollama dichiara la capacità 'vision' per questo modello",
  "models.add.heuristic":
    "Euristico dal nome: Ollama non dichiara la vocazione di un modello",
  "models.add.reports_vision": "Ollama dichiara il supporto alle immagini per questo modello",
  "models.add.by_name": "dal nome del modello: Ollama non indica la vocazione",
  "models.add.auto_suffix": " · impostata automaticamente, puoi togliere la spunta",

  // --- ModelsTab: righe dei modelli -----------------------------------------
  "models.row.no_category": "Senza categoria",
  "models.row.empty_category": "Nessun modello in questa categoria.",
  "models.row.include": "Includi nei test",
  "models.row.assign_tip": "Assegna il modello a una categoria",
  "models.row.suggest": "Suggerimento: {name}",
  "models.row.suggest_why":
    "Suggerimento dal nome del modello: Ollama non dichiara la vocazione",
  "models.row.vision_yes": "immagini",
  "models.row.vision_no": "nessun supporto alle immagini",
  "models.row.vision_warning":
    "Questo modello è assegnato alla categoria Immagini (VLM), ma Ollama non dichiara il supporto alle immagini: un prompt con immagine fallirà.",
  "models.row.vision_tip": "Ollama dichiara la capacità 'vision': il modello elabora le immagini",
  "models.row.downloaded": "scaricato · {size}",
  "models.row.checking_size": "verifica della dimensione…",
  "models.row.size_unknown": "dimensione sconosciuta",
  "models.row.loading": "Caricamento in VRAM…",
  "models.row.load": "Carica",
  "models.row.load_tip":
    "Carica il modello in VRAM in anticipo, così il primo prompt non paga l'avvio a freddo",
  "models.row.downloading": "Download…",
  "models.row.download": "Scarica",
  "models.row.remove_tip": "Togli il modello (anche dal disco)",
  "models.row.remove": "Togli dalla lista",
  "models.row.remove_confirm": "Togliere {tag}?",
  "models.row.delete_keep": "Tieni i file del modello sul disco",
  "models.row.delete_keep_action": "Solo dalla lista",
  "models.row.delete_disk_hint": "Cancella i file del modello tramite Ollama",
  "models.row.deleting": "Cancellazione…",
  "models.row.delete_from_disk": "Cancella dal disco ({size})",
  "models.empty.title": "La lista dei modelli è vuota",
  "models.empty.hint": "Aggiungi un tag di Ollama qui sopra per poter avviare un test.",

  // --- CategoriesTab --------------------------------------------------------
  "categories.intro":
    "Le categorie e i prompt sono completamente modificabili: nulla è fissato nel codice. La casella davanti a ogni prompt decide se entra nel test: un prompt deselezionato resta nella lista con il suo testo, ma i modelli non lo vedono mai. La categoria \"Response classification\" parte di proposito senza prompt: i suoi risultati li annoti a mano dopo averli letti, quindi sei tu a decidere cosa chiedere ai modelli.",
  "categories.enabled_prompts": "Prompt attivi: {count} su {total}",
  "categories.enabled_tasks": "Attività attive: {count} su {total}",
  "categories.count_images.one": "{count} attività con immagine",
  "categories.count_images.many": "{count} di attività con immagine",
  "categories.count_images.other": "{count} attività con immagine",
  "categories.uncheck_all": "Deseleziona tutto",
  "categories.check_all": "Seleziona tutto",
  "categories.uncheck_all_tip": "Deseleziona tutti i prompt di questa categoria",
  "categories.check_all_tip": "Seleziona tutti i prompt di questa categoria",
  "categories.add_image": "Aggiungi immagine + prompt",
  "categories.add_prompt": "Aggiungi un prompt",
  "categories.classification_intro":
    "Nessun prompt predefinito. Dopo ogni risposta il test si ferma e ti mostra tre pulsanti: ",
  "categories.long_context_note": "Ollama taglia l'input a 4096 token per impostazione predefinita e lo fa in silenzio. Prima di misurare questa categoria imposta num_ctx del modello nella scheda Modelli - altrimenti il modello vedrà solo l'inizio.",
  "categories.classification_outro": ". Potrai cambiare l'etichetta più tardi nella scheda \"Risultati\".",
  "categories.task_enabled_tip": "Questa attività deve entrare nel test?",
  "categories.prompt_enabled_tip": "Questo prompt deve entrare nel test?",
  "categories.image_label": "Immagine {index}",
  "categories.image_placeholder": "percorso del file, ad es. C:\\\\immagini\\\\test.png",
  "categories.choose_file": "Scegli…",
  "categories.prompt_text": "Testo del prompt",
  "categories.empty":
    "Questa categoria non ha ancora prompt: le categorie vuote vengono ignorate dal test.",
  "categories.all_unchecked":
    "Tutti i prompt di questa categoria sono deselezionati, quindi la categoria sarà ignorata dal test.",

  // --- suggerimenti nei campi prompt vuoti ----------------------------------
  "hint.coding": "ad es. Scrivi una funzione Python che inverta l'ordine dei caratteri del testo dato.",
  "hint.chat": "ad es. Spiega in tre frasi che cos'è la fotosintesi.",
  "hint.vlm": "ad es. Descrivi cosa si vede nell'immagine e elenca gli oggetti riconoscibili.",
  "hint.reasoning": "es. Un treno parte alle 14:20 e percorre 63 km in 45 minuti. A che velocità viaggia?",
  "hint.json": "es. Restituisci un oggetto JSON con le tre città più grandi della Polonia, ciascuna con nome, popolazione e voivodato.",
  "hint.long_context": "es. Incolla un articolo lungo e chiedi un riassunto in cinque punti.",
  "hint.classification": "ad es. Descrivi in una frase a cosa serve il ciclo for in Python.",

  // --- ModelSettingsModal ---------------------------------------------------
  "settings.model.hint":
    "I parametri e il prompt di sistema valgono solo per questo modello e vengono salvati con i risultati della sessione: col tempo si vedrà con cosa sono stati ottenuti.",
  "settings.model.context_supported": "il modello supporta un contesto fino a {context} token",
  "settings.model.context_unknown":
    "non si conosce il contesto del modello (non scaricato, oppure Ollama non lo indica)",
  "settings.model.params_title": "Parametri di generazione",
  "settings.model.unsaved": "Modifiche non salvate",
  "settings.model.saved": "Impostazioni di {tag} salvate",
  "settings.model.params_hint": "campo vuoto = lasciamo decidere a Ollama",
  "settings.model.insert_suggested": "Inserisci quelli proposti",
  "settings.model.insert_suggested_tip":
    "Inserisci i parametri proposti per questo tipo di categoria (sono le nostre raccomandazioni, non dati di Ollama)",
  "settings.model.ollama_default": "predefinito di Ollama (4096)",
  "settings.model.help_temperature":
    "Creatività: 0 resta aderente allo schema, più alto = più libero. Codice 0,1-0,3, conversazione 0,6-0,8.",
  "settings.model.help_top_p": "Soglia di probabilità (0-1). Di norma 0,9.",
  "settings.model.help_top_k": "Quanti token migliori considerare. 0 = tutti.",
  "settings.model.help_repeat_penalty":
    "Penalità di ripetizione: 1 = nessuna penalità, più alta = meno ripetizioni.",
  "settings.model.help_num_ctx":
    "Dimensione del contesto. Ollama usa 4096 per impostazione predefinita, e un contesto più grande occupa più VRAM: mantieni lo stesso valore per confrontare le sessioni.",
  "settings.model.help_num_predict": "Limite di lunghezza della risposta in token. -1 = senza limite.",
  "settings.model.help_num_gpu":
    "Quanti livelli affidare alla scheda: 0 = solo CPU, un numero = altrettanti livelli, vuoto = decide Ollama. Il risultato si vede nella colonna GPU/CPU.",
  "settings.model.help_seed": "Casualità fissa: gli stessi risultati ripetendo.",
  "settings.model.system_title": "Prompt di sistema",
  "settings.model.system_custom": "personale (altrimenti quello predefinito del tipo di categoria)",
  "settings.model.system_hint": "Va al modello nel campo system.",
  "settings.model.system_preview": "Anteprima del prompt predefinito per il tipo \"{kind}\".",
  "settings.model.system_no_kind": "Nessuna categoria, quindi nessun prompt predefinito da riprendere.",
  "settings.model.insert_default": "Inserisci quello predefinito del tipo",
  "settings.model.no_system_support":
    "Questo modello non riceve il prompt di sistema: il suo modello di prompt (Modelfile) non ha spazio per il campo system, quindi Ollama lo scarta in silenzio. Verificato su `moondream`. Scrivi piuttosto l'istruzione nel prompt stesso.",

  // --- TestTab --------------------------------------------------------------
  "test.selection_title": "Scelta dei modelli e delle categorie",
  "test.selection_hint":
    "Le coppie selezionate per impostazione predefinita derivano dall'assegnazione di ogni modello alla sua categoria. Puoi cambiare tutto liberamente.",
  "test.stop": "Ferma",
  "test.start": "Avvia il test",
  "test.ollama_down": "Ollama non risponde su {endpoint}: il test non partirà.",
  "test.no_models": "Nessun modello attivato",
  "test.no_models_hint":
    "Attiva dei modelli nella scheda \"Modelli\" per costruire la matrice dei test.",
  "test.count_prompts.one": "{count} prompt",
  "test.count_prompts.many": "{count} di prompt",
  "test.count_prompts.other": "{count} prompt",
  "test.count_images.one": "{count} immagine",
  "test.count_images.many": "{count} di immagini",
  "test.count_images.other": "{count} immagini",
  "test.count_total_suffix": " su {total}",
  "test.select_all": "Tutti",
  "test.select_none": "Nessuno",
  "test.select_column_tip": "Clic: seleziona tutti i modelli di questa categoria",
  "test.select_row_tip": "Clic: seleziona tutte le categorie di questo modello",
  "test.no_prompts": "nessun prompt",
  "test.custom_settings": "impostazioni personali",
  "test.selected": "Sessioni selezionate: {count} · modelli: {models}",
  "test.not_downloaded_locked": "Non scaricato: scaricalo prima nella scheda Modelli.",
  "test.categories_ready": "Categorie con prompt: {count} su {total}",
  "test.badge_system": "prompt di sistema personale",
  "test.badge_system_default": "prompt di sistema predefinito del tipo di categoria",
  "test.badge_params_default": "parametri predefiniti di Ollama",
  "test.estimate": "stima",
  "test.cpu_only": "solo CPU",
  "test.vision_warning":
    "Ollama non dichiara il supporto alle immagini per: {models}. Questi modelli sono assegnati alla categoria immagini, quindi un prompt con immagine fallirà: usa una variante multimodale (ad es. `llava`, `moondream`, `qwen2.5vl`).",
  "test.pick_pair": "Seleziona almeno una coppia modello × categoria.",
  "test.recent_title": "Ultime misure",
  "test.finished_prompts.one": "{count} prompt completato",
  "test.finished_prompts.many": "{count} di prompt completati",
  "test.finished_prompts.other": "{count} prompt completati",
  "test.recent_empty": "Le misure dei prossimi prompt appariranno qui.",

  // --- metriche (Test e Risultati) ------------------------------------------
  "metrics.ttft": "TTFT",
  "metrics.tps": "tok/s",
  "metrics.vram": "VRAM",
  "metrics.vram_peak": "Picco VRAM",
  "metrics.gpu_cpu": "GPU/CPU",
  "metrics.gpu_cpu_wide": "GPU / CPU",
  "metrics.gpu_cpu_split": "{gpu} / {cpu}%",
  "metrics.gpu_cpu_tip":
    "La ripartizione della memoria del modello tra GPU e CPU (livelli), non il tempo di calcolo",
  "metrics.model_size_tip":
    "il modello occupa {size}: è la ripartizione della memoria (livelli), non il tempo di calcolo",
  "metrics.split_tip": "la ripartizione della memoria del modello tra GPU e CPU",
  "test.progress_title": "Avanzamento in diretta",
  "test.progress_line": "{model} · {category} · prompt {index} su {total}",
  "test.preparing": "Preparazione del primo prompt…",
  "test.not_running": "Il test non è avviato",
  "test.prompt_show": "Mostra il prompt intero",
  "test.prompt_hide": "Comprimi il prompt",
  "test.prompt_chars": "caratteri: {chars}",
  "test.generating": "generazione",
  "test.in_progress": "in corso",
  "test.progress": "Avanzamento",
  "test.vram_now": "VRAM adesso",
  "test.paused": "Test in pausa: annota la risposta nella finestra di classificazione.",
  "test.streamed_response": "Risposta in streaming",
  "test.autoscroll": "Scorrimento automatico",
  "test.autoscroll_hint": "Tiene l'anteprima sui token più recenti. Scorrere in alto lo mette in pausa finché non torni in fondo.",
  "test.no_data": "Nessun dato: avvia un test.",
  "test.zero_tokens": "(0 token)",
  "test.metrics_title": "Come vengono calcolate le misure",
  "test.metrics_ttft":
    "TTFT: tempo tra l'invio della richiesta e il primo token; a freddo include il caricamento del modello in memoria.",
  "test.metrics_tps":
    "tok/s: calcolati da Ollama come eval_count / eval_duration, e misurati con il nostro orologio quando quei dati mancano.",
  "test.metrics_vram":
    "Picco VRAM: il massimo uso di memoria della GPU rilevato da NVML durante la generazione di questo prompt.",
  "test.empty_response_explained":
    "Il modello ha concluso la generazione senza un solo carattere di risposta (0 token). Ollama ha segnalato un successo, quindi il prompt gli è arrivato: capita che una formulazione precisa finisca subito sul token di fine (è il caso di moondream: la stessa immagine la descrive normalmente con un'altra formulazione). Un'altra formulazione o un prompt in inglese aiuta.",
  "test.unloaded_previous":
    "Modelli del test precedente liberati dalla memoria: {models}. I modelli che partecipano a questa sessione restano in VRAM.",

  // --- avviso VRAM ----------------------------------------------------------
  "vram.title": "Stima della VRAM",
  "vram.fit.on_gpu": "sulla scheda",
  "vram.fit.on_gpu_tight": "sulla scheda, senza margine",
  "vram.fit.partial_cpu": "in parte sulla CPU",
  "vram.fit.no_fit": "non si avvia",
  "vram.fit.unknown_gpu": "GPU sconosciuta",
  "vram.verdict.partial_cpu": "La scheda è troppo piccola, quindi parte del modello girerà sulla CPU. Più lento, ma gira.",
  "vram.verdict.no_fit": "Su questa macchina non si avvia: servono circa {needed} MB e ce ne sono {available} MB (scheda + memoria).",
  "vram.card_free": "Liberi sulla scheda adesso: {free} MB",
  "vram.ram": "Memoria: {free} MB liberi di {total} MB · utilizzabili dai modelli: {usable} MB (riserva {reserve} MB)",
  "vram.ram_snapshot": "La memoria libera è un'istantanea di questo momento: altri programmi la cambiano di secondo in secondo.",
  "vram.swap_hint": "Il sistema potrebbe caricare il modello dal disco, ma sono gigabyte al secondo di swapping e un modello che conta un carattere al minuto.",
  "vram.required": "Fabbisogno stimato: {required} MB dei {total} MB della scheda",
  "vram.free_after": "Liberi dopo il caricamento: ~{free} MB",
  "vram.short": "Mancano circa {missing} MB di memoria sulla scheda.",
  "vram.short_hint": "Riduci num_ctx o dividi la sessione in parti più piccole.",
  "vram.tight": "Ci sta, ma senza margine: Ollama può allocare più di quanto supponiamo.",
  "vram.breakdown": "Pesi {weights} MB · cache KV {kv} MB · contesto {context}",
  "vram.confirmed": "dimensione confermata da /api/ps",
  "vram.other": "fuori da Ollama: {other} MB",
  "vram.loaded_now": "già in memoria: {loaded} MB",
  "vram.context": "contesto {context}",
  "vram.nvml_unavailable":
    "Non è stato possibile calcolare il fabbisogno di VRAM perché NVML non risponde: la misura della memoria della scheda non è disponibile su questa macchina.",

  // --- codici di nota del backend (forecast.rs) -----------------------------
  "forecast.no_targets": "Non è ancora selezionata nessuna coppia modello × categoria.",
  "forecast.nvml_unavailable":
    "NVML non risponde, quindi non sappiamo quanta memoria abbia la scheda: non c'è nulla con cui confrontare la stima.",
  "forecast.estimate_explained":
    "Stima: pesi + cache KV calcolati dai metadati del modello + un margine per il grafo di calcolo. Ollama può allocare un po' di più.",
  "forecast.nothing_loaded":
    "Nessuno di questi modelli è in memoria adesso, quindi /api/ps non può confermarne la dimensione.",
  "forecast.partial_offload":
    "num_gpu è impostato, quindi alcuni livelli possono girare sulla CPU: l'uso reale di VRAM può essere più basso della stima.",
  "forecast.cpu_only": "num_gpu = 0, quindi questo modello gira sulla CPU e non occupa VRAM.",
  "forecast.not_downloaded":
    "Questo modello non è scaricato, non conosciamo né i pesi né l'architettura: resta fuori dalla stima.",
  "forecast.no_architecture_metadata":
    "Nessun metadato di architettura, quindi la cache KV non è stata calcolata: la stima copre solo i pesi.",
  "forecast.multimodal":
    "Modello multimodale: il codificatore di immagini non finisce sempre in VRAM, quindi l'uso reale può differire.",

  // --- ResultsTab -----------------------------------------------------------
  "results.history": "Cronologia",
  "results.no_runs": "Nessuna sessione registrata.",
  "results.interrupted": "interrotta",
  "results.delete_run": "Elimina la sessione",
  "results.tps_short": "{count} tok/s",
  "results.no_selection": "Nessuna sessione selezionata",
  "results.no_selection_hint":
    "Avvia un test nella scheda \"Test\": i suoi risultati appariranno qui e verranno salvati in locale.",
  "results.run_title": "Risultati della sessione {id}",
  "results.export_saved": "{format} salvato: {path}",
  "results.open_failed": "Impossibile aprire il file: {error}",
  /* Skąd przyszedł model - plakietka przy nazwie w tabeli wyników. */
  "results.source_registry": "registro",
  "results.source_huggingface": "HF",
  "results.source_tip":
    "Da dove viene il modello. Lo stesso modello può dare risultati diversi dal registro e da HuggingFace, perché il template e il parser arrivano dal repository.",
  "results.col.prompts": "Prompt",
  "results.col.tps_ollama": "tok/s (Ollama)",
  "results.col.tps_clock": "tok/s (orologio)",
  "results.col.avg_ttft": "TTFT medio",
  "results.col.empty": "Risp. vuote",
  "results.json_column": "JSON",
  "results.python_column": "Python",
  "results.python_tip": "Verifichiamo solo se la risposta si legge come Python. Non dice che il codice è corretto né che fa ciò che era richiesto. Una risposta senza codice ha uno stato a parte. Non eseguiamo mai nulla.",
  "results.python_ok": "sintassi valida",
  "results.python_syntax_error": "errore di sintassi",
  "results.python_no_code": "nessun codice Python",
  "results.json_valid": "valido",
  "results.json_invalid": "non valido",
  "results.json_tip": "La risposta si può leggere come JSON? Verifichiamo senza forzare uno schema in Ollama, quindi misuriamo il modello e non il runtime. Anche un blocco di codice vale.",
  "results.labels": "Etichette",
  "results.no_grades": "nessuna valutazione",
  "results.errors.one": "{count} errore",
  "results.errors.many": "{count} di errori",
  "results.errors.other": "{count} errori",
  "results.row_hint":
    "Clicca una riga per vedere le risposte complete e valutare la classificazione.",
  "results.system_field": "system: {prompt}",
  "results.system_none": "system: nessuno (sessione precedente alle impostazioni)",
  "results.tps_clock": "tok/s orologio",
  "results.empty_response_hint":
    "Risposta vuota: Ollama ha segnalato un successo, ma il modello non ha generato nessun token. I piccoli modelli VLM (moondream, per esempio) a volte tacciono con un prompt in un'altra lingua: prova in inglese.",
  "results.zero_tokens": "(0 token - nessun testo di risposta)",
  "results.grade": "Valutazione:",
  "results.clear_grade": "pulisci",
  "results.ungraded": "non valutata",
  "results.compare_title": "Confronto del modello A e B",
  "results.compare_hint":
    "Differenze nella sessione attuale e medie di tok/s su tutta la cronologia salvata.",
  "results.compare_a": "— modello A —",
  "results.compare_b": "— modello B —",
  "results.compare_pick": "Scegli due modelli diversi.",
  "results.compare_a_tps": "A: tok/s",
  "results.compare_b_tps": "B: tok/s",
  "results.compare_delta_tps": "Δ tok/s",
  "results.compare_a_ttft": "A: TTFT",
  "results.compare_b_ttft": "B: TTFT",
  "results.compare_delta_vram": "Δ VRAM",
  "results.trend_title": "Media di tok/s per sessione (confronto nel tempo)",
  "results.col.run": "Sessione",
  "results.compare_delta": "Δ",

  // --- Impostazioni ---------------------------------------------------------
  "settings.language_title": "Lingua dell'applicazione",
  "settings.checks_title": "Controlli e visualizzazione",
  "settings.check_json": "Controlla la validità del JSON",
  "settings.check_json_hint": "Nella categoria JSON aggiunge un verdetto accanto alla misura: la risposta si legge come JSON? Se disattivato, il controllo non viene eseguito e la colonna sparisce dai risultati e dall'esportazione.",
  "settings.check_python": "Controlla la sintassi Python",
  "settings.check_python_hint": "Nella categoria Coding: la risposta si legge come Python? Il codice non viene eseguito e questo non dice che è corretto, solo che non è rotto. Disattivalo se provi codice in altre lingue.",
  "settings.auto_scroll": "Scorrimento automatico della risposta",
  "settings.auto_scroll_hint": "L'anteprima scorre da sola fino ai token più recenti. Scorrere in alto lo mette in pausa finché non torni in fondo, e si ferma a fine esecuzione. Lo stesso interruttore è sopra l'anteprima nella scheda Test.",
  "settings.language_hint":
    "L'inglese è la lingua predefinita. Il cambio vale subito e viene salvato in `settings.json`, quindi sopravvive al riavvio.",
  "settings.history_title": "Cronologia delle sessioni",
  "settings.history_stats": "Sessioni registrate: {count} · {size}",
  "settings.history_hint":
    "La cronologia è salvata come un file JSON per sessione. Puoi copiarla insieme alla cartella dei dati.",
  "settings.filter": "Filtro",
  "settings.filter_all": "Tutte",
  "settings.filter_older": "Più vecchie di",
  "settings.filter_interrupted": "Solo interrotte",
  "settings.days.one": "{count} giorno",
  "settings.days.many": "{count} di giorni",
  "settings.days.other": "{count} giorni",
  "settings.to_delete.one": "Da eliminare: {count} sessione · {size}",
  "settings.to_delete.many": "Da eliminare: {count} di sessioni · {size}",
  "settings.to_delete.other": "Da eliminare: {count} sessioni · {size}",
  "settings.nothing_matches": "Nulla corrisponde al filtro.",
  "settings.delete_selected": "Elimina la selezione",
  "settings.deleted.one": "{count} sessione eliminata, {size} liberati.",
  "settings.deleted.many": "{count} di sessioni eliminate, {size} liberati.",
  "settings.deleted.other": "{count} sessioni eliminate, {size} liberati.",
  "settings.data_folder": "Cartella dei dati",
  "settings.open_folder": "Apri la cartella",
  "settings.exports_title": "File di esportazione",
  "settings.exports_stats.one": "La cartella {dir} contiene {count} file ({size}).",
  "settings.exports_stats.many": "La cartella {dir} contiene {count} di file ({size}).",
  "settings.exports_stats.other": "La cartella {dir} contiene {count} file ({size}).",
  "settings.exports_hint":
    "Sono i tuoi file CSV/HTML, quindi hanno un'azione di eliminazione propria: mai insieme alla cronologia.",
  "settings.delete_exports": "Elimina i file di esportazione",
  "settings.exports_deleted.one": "{count} file di esportazione eliminato, {size} liberati.",
  "settings.exports_deleted.many": "{count} di file di esportazione eliminati, {size} liberati.",
  "settings.exports_deleted.other": "{count} file di esportazione eliminati, {size} liberati.",
  "settings.prompts_title": "Prompt di sistema predefiniti",
  "settings.prompts_hint":
    "Usati quando un modello non ha un proprio prompt. Il predefinito dipende dal tipo di categoria in cui il modello parte: l'impostazione vale per tipo, non per modello. Il testo integrato è in inglese di proposito: i modelli piccoli seguono più sicuramente un'istruzione in inglese, e le sessioni restano confrontabili qualunque sia la lingua dell'interfaccia. Scrivi il tuo nella lingua che vuoi: è una tua decisione, non un testo dell'applicazione.",
  "settings.prompt_changed": "Modificato",
  "settings.prompt_builtin": "Integrato",
  "settings.prompt_restore": "Ripristina l'integrato",
  "settings.reset_title": "Ripristina le impostazioni predefinite",
  "settings.reset_hint":
    "Elimina il file delle impostazioni utente e torna ai valori predefiniti. Modelli, categorie, cronologia e file di esportazione restano intatti.",
  "settings.reset_action": "Ripristina i predefiniti",
  "settings.reset_done": "Impostazioni predefinite ripristinate.",
  "settings.reset_warning": "Questa azione è irreversibile.",
  "settings.scope_title": "Impostazioni dell'applicazione, non del modello",
  "settings.scope_hint":
    "Lingua, cronologia, esportazioni e prompt predefiniti. Le impostazioni di ogni modello sono nella scheda \"Modelli\".",

  // --- Katalog modeli z HuggingFace --------------------------------------
  "search.title": "Catalogo HuggingFace",
  "search.subtitle":
    "Repository GGUF che Ollama può scaricare. Un campo vuoto scorre il catalogo per popolarità.",
  "search.placeholder": "Cerca repository (es. qwen2.5-coder)",
  "search.button": "Cerca",
  "search.refresh": "Aggiorna",
  "search.filters": "Filtri",
  /* Plakietka przy grupie filtrów: skąd pochodzi filtr. */
  "search.origin_hf": "HF",
  "search.origin_ours": "nostro",
  "search.open_hf": "Apri su HuggingFace",
  "search.badge_hf": "Dati dall'API di HuggingFace",
  "search.task": "Attività",
  "search.task.text": "Testo",
  "search.task.vision": "Con immagini",
  "search.task.all": "Tutto",
  "search.task.text_tip": "Generazione di testo: modelli per codice e conversazione. La maggior parte.",
  "search.task.vision_tip":
    "Comprensione delle immagini (image-text-to-text). Ollama li esegue come VLM.",
  "search.task.all_tip":
    "Senza filtro di attività. Lascia passare anche modelli che Ollama non esegue, es. il riconoscimento vocale.",
  "search.size": "Dimensione del download",
  "search.size_any": "qualsiasi",
  "search.size_up_to": "fino a {size}",
  "search.size_note": "Confronta la variante più piccola del repository.",
  "search.fits_only": "Solo ciò che entra nella mia scheda",
  "search.fits_note": "Tiene i modelli che partiranno, anche se in parte sulla CPU.",
  "search.hide_owned": "Nascondi quelli già scaricati",
  "search.counts_note":
    "Numeri e filtri riguardano la parte caricata della lista, non tutto il catalogo.",
  "search.installed": "scaricato",
  "search.on_list": "nell'elenco",
  "search.gated": "chiuso",
  "search.gated_note":
    "Repository chiuso: Ollama lo apre con la propria chiave SSH, non con un token API. Qui non c'è nulla da incollare.",
  "search.reading": "leggo i file…",
  "search.detail_failed": "Non riesco a leggere l'elenco dei file: la riga resta senza dimensioni.",
  "search.count_variants.one": "{count} variante",
  "search.count_variants.many": "{count} varianti",
  "search.count_variants.other": "{count} varianti",
  "search.col_variant": "Variante",
  "search.col_size": "Download",
  "search.col_memory": "Memoria",
  "search.with_projector": "+ proiettore",
  "search.projector_tip": "Include il proiettore ({size}) che Ollama scarica con il modello.",
  "search.split_skipped": "Divise in parti, quindi fuori elenco: {list}",
  "search.groups_skipped": "File ausiliari saltati: {list}",
  "search.memory_note":
    "La dimensione è un minimo: la memoria del contesto (KV) non è inclusa, perché HF non indica strati né teste KV.",
  "search.context": "contesto {value}",
  "search.arch": "architettura {name}",
  "search.no_variants":
    "Questo repository non ha GGUF in un unico file: ogni file del modello è diviso in parti.",
  "search.pick_categories": "Categorie per il modello aggiunto",
  "search.added": "Aggiunto {tag} con le categorie scelte.",
  "search.added_no_category": "Aggiunto {tag}. Scegli le categorie nella scheda Modelli.",
  "search.downloads": "Download su HuggingFace",
  "search.likes": "Mi piace su HuggingFace",
  "search.expand": "Mostra le varianti",
  "search.collapse": "Nascondi le varianti",
  "search.more": "Mostra di più",
  "search.loading": "Carico…",
  "search.failed": "HuggingFace non ha risposto",
  "search.empty": "Niente trovato",
  "search.empty_hint": "Svuota il campo per scorrere il catalogo, oppure prova un altro nome.",
  "search.search_all_tasks": "Cerca in tutte le attività",
  "search.footer":
    "Questi modelli li scarica Ollama, con il tag della riga. Il download parte dalla scheda Modelli.",
};
