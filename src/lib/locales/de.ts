/**
 * Deutsch interface text.
 *
 * Keys are neutral and identical in every language file (`en.ts`, `pl.ts`, `de.ts`),
 * so a missing translation falls back to English rather than to Polish.
 * Placeholders use `{name}` and are filled by `t(key, { name })`.
 *
 * Never put German text in a component: every user-facing string goes through
 * `t("area.thing")` and lives here. `npm run check:i18n` verifies that every file
 * carries exactly the same keys and the same placeholders.
 */
export const DE: Record<string, string> = {
  // --- shell / tabs ---------------------------------------------------------
  "nav.models": "Modelle",
  "nav.search": "Modelle suchen",
  "nav.categories": "Kategorien",
  "nav.test": "Test",
  "nav.results": "Ergebnisse",
  "nav.settings": "Einstellungen",
  "app.subtitle": "Ollama · lokale LLMs",
  "window.minimize": "Minimieren",
  "window.maximize": "Maximieren",
  "window.restore": "Wiederherstellen",
  "app.loading_config": "Konfiguration wird geladen…",
  "app.reading": "wird gelesen…",
  "gpu.nvml_unavailable": "NVML nicht verfügbar",

  // --- osłona na błędy (ErrorBoundary) --------------------------------------
  "error.title": "Dieser Bereich funktioniert nicht mehr",
  "error.window_title": "Das Fenster zeichnet sich nicht mehr",
  "error.hint": "Nur dieser Teil ist ausgefallen - der Rest der App läuft weiter.",
  "error.details": "Technisches Detail",
  "error.retry": "Erneut versuchen",

  // --- etykiety klasyfikacji ------------------------------------------------
  "label.completed": "Ausgeführt",
  "label.refused": "Verweigert",
  "label.limited": "Ausgeführt, aber eingeschränkt/geändert",
  "label.completed.help": "Das Modell hat die Aufgabe wie verlangt ausgeführt.",
  "label.refused.help": "Das Modell hat die Ausführung verweigert.",
  "label.limited.help":
    "Das Modell hat die Aufgabe ausgeführt, aber den Umfang geändert, Vorbehalte ergänzt oder einen Teil der Anweisung ausgelassen.",

  // --- wspólne --------------------------------------------------------------
  "common.cancel": "Abbrechen",
  "common.save": "Speichern",
  "common.open": "Öffnen",
  "common.close": "Schließen",
  "common.retry": "erneut versuchen",
  "common.prompt": "Prompt",
  "common.model": "Modell",
  "common.category": "Kategorie",
  "common.time": "Zeit",
  "common.add": "Hinzufügen",
  "common.set": "Setzen",
  "common.clear": "Leeren",
  "common.reset": "Zurücksetzen",
  "common.confirm": "Bestätigen",
  "common.default": "Standard",
  "common.auto": "auto",
  "common.no_limit": "ohne Limit",
  "common.badge_custom": "eigene",
  "common.badge_settings": "Einstellungen",
  "common.not_downloaded": "nicht geladen",
  // Liczba mnoga: formę wybiera język (`Intl.PluralRules`), patrz `lib/i18n.tsx`.
  "common.count_prompts.one": "{count} Prompt",
  "common.count_prompts.other": "{count} Prompts",

  // --- ClassifyModal --------------------------------------------------------
  "classify.title": "Manuelle Klassifizierung der Antwort",
  "classify.hint":
    "Lies die ganze Antwort und wähle eine der drei Markierungen. Der Test wartet, bis du dich entschieden hast.",
  "classify.response": "Antwort des Modells",
  "classify.empty_response": "(leere Antwort)",
  "classify.start_failed": "Start fehlgeschlagen",

  // --- ModelsTab: pasek statusu pobierania ---------------------------------
  "models.pull.manifest": "Manifest wird geladen",
  "models.pull.checksum": "Prüfsumme wird geprüft",
  "models.pull.writing": "Manifest wird geschrieben",
  "models.pull.removing_layers": "nicht mehr genutzte Layer werden entfernt",
  "models.pull.done": "fertig",
  "models.pull.layer": "Layer {id}",

  // --- ModelsTab: komunikaty -----------------------------------------------
  "models.msg.downloaded": "Modell {model} geladen",
  "models.msg.download_failed": "Laden von {model} fehlgeschlagen: {error}",
  "models.msg.loaded": "{tag} in {duration} geladen",
  "models.msg.gpu_share": "{gpu}% des Modellspeichers auf der GPU",
  "models.msg.load_failed": "{tag} konnte nicht geladen werden: {error}",
  "models.msg.unloaded": "{tag} aus dem Speicher entlassen",
  "models.msg.unload_failed": "{tag} konnte nicht entlassen werden: {error}",
  "models.msg.unloaded_all": "Speicher aller geladenen Modelle freigegeben",
  "models.msg.deleted": "Modell {tag} von der Platte gelöscht",
  "models.msg.delete_failed": "{tag} konnte nicht gelöscht werden: {error}",
  "models.msg.enter_tag": "Modell-Tag eingeben, z. B. mistral:7b",
  "models.msg.already_on_list": "{tag} steht schon auf der Liste",
  "models.msg.added": "{tag} hinzugefügt",

  // --- ModelsTab: lista modeli i panel wybranego modelu ---------------------
  "models.list.search": "Modelle suchen…",
  "models.list.no_match": "Kein Modell passt zu „{query}“.",
  "models.detail.memory_title": "Speicher (VRAM)",
  "models.detail.in_memory": "im Speicher",
  "models.detail.not_in_memory": "nicht geladen",
  "models.detail.vram_short": "{used} / {total} MB VRAM",

  // --- ModelsTab: kafelki --------------------------------------------------
  "models.status.running": "läuft · {version}",
  "models.status.offline": "keine Verbindung",
  "models.tile.vram_skipped": "VRAM-Messwerte werden übersprungen",
  "models.tile.probing_nvml": "NVML wird geprüft…",
  "models.installed": "Installierte Modelle",
  "models.refresh_state": "Status aktualisieren",

  // --- ModelsTab: panel pamięci --------------------------------------------
  "models.memory.unload_all": "Alle entlassen",
  "models.memory.hint_empty":
    "Gerade ist nichts geladen. Der erste Prompt jedes Modells zahlt den Kaltstart (in früheren Messungen fiel TTFT nach dem Laden des Modells von ~6,7 s auf ~80 ms).",
  "models.memory.split_unknown": "Aufteilung unbekannt",
  "models.memory.split": "GPU {gpu}% / CPU {cpu}%",
  "models.memory.vram_of_total": "{vram} von {total}",
  "models.memory.context": "· Kontext {context}",
  "models.memory.expires": "· gibt sich frei um {time}",
  "models.memory.unloading": "Wird entlassen…",
  "models.memory.unload": "Entlassen",
  "models.memory.unload_tip": "Den VRAM freigeben, den dieses Modell belegt",
  "models.memory.split_tip":
    "Wie der Speicher des Modells zwischen GPU und CPU aufgeteilt ist (Layer, nicht Rechenzeit)",

  // --- ModelsTab: dodawanie modelu -----------------------------------------
  "models.add.title": "Eigenes Modell hinzufügen",
  "models.add.hint":
    "Jeder Ollama-Tag. Das ist der einzige Weg, die Liste zu erweitern - nichts wird automatisch ausgewählt.",
  "models.add.placeholder": "z. B. mistral:7b",
  "models.add.duplicate": "Dieser Tag steht schon auf der Liste.",
  "models.add.checking_size": "Größe wird im Ollama-Register geprüft…",
  "models.add.size_to_download": "{size} zum Laden",
  "models.add.suggested": "vorgeschlagene Kategorie: {name}",
  "models.add.certain_vision": "Sicher: Ollama meldet die Fähigkeit 'vision' für dieses Modell",
  "models.add.heuristic":
    "Heuristik aus dem Namen - Ollama veröffentlicht den Zweck eines Modells nicht",
  "models.add.reports_vision": "Ollama meldet Bildunterstützung für dieses Modell",
  "models.add.by_name": "nach dem Modellnamen - Ollama gibt den Zweck nicht an",
  "models.add.auto_suffix": " · automatisch gesetzt, du kannst sie abwählen",

  // --- ModelsTab: wiersze modeli -------------------------------------------
  "models.row.no_category": "Ohne Kategorie",
  "models.row.empty_category": "Keine Modelle in dieser Kategorie.",
  "models.row.include": "In Tests einbeziehen",
  "models.row.assign_tip": "Modell einer Kategorie zuordnen",
  "models.row.suggest": "Vorschlag: {name}",
  "models.row.suggest_why":
    "Vorschlag nach dem Modellnamen - Ollama veröffentlicht den Zweck nicht",
  "models.row.vision_yes": "Bilder",
  "models.row.vision_no": "keine Bildunterstützung",
  "models.row.vision_warning":
    "Dieses Modell ist der Kategorie Bilder (VLM) zugeordnet, aber Ollama meldet dafür keine Bildunterstützung - ein Prompt mit Bild wird scheitern.",
  "models.row.vision_tip": "Ollama meldet die Fähigkeit 'vision' - das Modell verarbeitet Bilder",
  "models.row.downloaded": "geladen · {size}",
  "models.row.checking_size": "Größe wird geprüft…",
  "models.row.size_unknown": "Größe unbekannt",
  "models.row.loading": "Wird ins VRAM geladen…",
  "models.row.load": "Laden",
  "models.row.load_tip":
    "Das Modell vorab in den VRAM laden, damit der erste Prompt keinen Kaltstart zahlt",
  "models.row.downloading": "Wird heruntergeladen…",
  "models.row.download": "Herunterladen",
  "models.row.remove_tip": "Modell entfernen (auch von der Platte)",
  "models.row.remove": "Von der Liste entfernen",
  "models.row.remove_confirm": "{tag} entfernen?",
  "models.row.delete_keep": "Lässt die Modelldateien auf der Platte",
  "models.row.delete_keep_action": "Nur von der Liste",
  "models.row.delete_disk_hint": "Löscht die Modelldateien über Ollama",
  "models.row.deleting": "Wird gelöscht…",
  "models.row.delete_from_disk": "Von der Platte löschen ({size})",
  "models.empty.title": "Die Modellliste ist leer",
  "models.empty.hint": "Füge oben einen Ollama-Tag hinzu, um einen Test starten zu können.",

  // --- CategoriesTab --------------------------------------------------------
  "categories.intro":
    "Kategorien und Prompts sind vollständig editierbar - nichts ist im Code festgeschrieben. Das Kästchen bei jedem Prompt entscheidet, ob er in den Test kommt: ein abgewählter Prompt bleibt mit seinem Text auf der Liste, aber die Modelle sehen ihn nie. Die Kategorie „Response classification” startet bewusst ohne Prompts: ihre Ergebnisse bewertest du nach dem Lesen von Hand, also entscheidest du, was du die Modelle fragst.",
  "categories.enabled_prompts": "Aktivierte Prompts: {count} von {total}",
  "categories.enabled_tasks": "Aktivierte Aufgaben: {count} von {total}",
  "categories.count_images.one": "{count} Bildaufgabe",
  "categories.count_images.other": "{count} Bildaufgaben",
  "categories.uncheck_all": "Alle abwählen",
  "categories.check_all": "Alle auswählen",
  "categories.uncheck_all_tip": "Alle Prompts dieser Kategorie abwählen",
  "categories.check_all_tip": "Alle Prompts dieser Kategorie auswählen",
  "categories.add_image": "Bild + Prompt hinzufügen",
  "categories.add_prompt": "Prompt hinzufügen",
  "categories.classification_intro":
    "Keine Standard-Prompts. Nach jeder Antwort hält der Test an und zeigt dir drei Schaltflächen: ",
  "categories.long_context_note": "Ollama kürzt die Eingabe standardmäßig bei 4096 Token und tut das still. Stelle vor der Messung dieser Kategorie num_ctx für das Modell im Tab Modelle ein - sonst sieht das Modell nur den Anfang.",
  "categories.classification_outro": ". Die Markierung kannst du später im Tab „Ergebnisse” ändern.",
  "categories.task_enabled_tip": "Soll diese Aufgabe in den Test",
  "categories.prompt_enabled_tip": "Soll dieser Prompt in den Test",
  "categories.image_label": "Bild {index}",
  "categories.image_placeholder": "Pfad zur Datei, z. B. C:\\bilder\\test.png",
  "categories.choose_file": "Auswählen…",
  "categories.prompt_text": "Prompt-Text",
  "categories.empty":
    "Diese Kategorie hat noch keine Prompts - leere Kategorien werden im Test übersprungen.",
  "categories.all_unchecked":
    "Alle Prompts dieser Kategorie sind abgewählt, die Kategorie wird im Test übersprungen.",

  // --- podpowiedzi w pustych polach promptu --------------------------------
  "hint.coding":
    "z. B. Schreibe eine Python-Funktion, die die Reihenfolge der Zeichen im gegebenen Text umkehrt.",
  "hint.chat": "z. B. Erkläre in drei Sätzen, was Photosynthese ist.",
  "hint.vlm": "z. B. Beschreibe, was auf dem Bild zu sehen ist, und nenne die erkennbaren Gegenstände.",
  "hint.reasoning": "z. B. Ein Zug fährt um 14:20 ab und legt in 45 Minuten 63 km zurück. Wie schnell fährt er?",
  "hint.json": "z. B. Gib ein JSON-Objekt mit den drei größten Städten Polens zurück, jeweils mit Name, Einwohnerzahl und Woiwodschaft.",
  "hint.long_context": "z. B. Einen langen Artikel einfügen und um eine Zusammenfassung in fünf Punkten bitten.",
  "hint.classification": "z. B. Beschreibe in einem Satz, wofür in Python die for-Schleife dient.",

  // --- ModelSettingsModal ---------------------------------------------------
  "settings.model.hint":
    "Parameter und System-Prompt gelten nur für dieses Modell und werden mit den Ergebnissen des Durchlaufs gespeichert - später ist zu sehen, womit sie erzielt wurden.",
  "settings.model.context_supported": "das Modell unterstützt Kontext bis {context} Token",
  "settings.model.context_unknown":
    "der Kontext des Modells ist unbekannt (nicht geladen oder Ollama gibt ihn nicht an)",
  "settings.model.params_title": "Parameter der Generierung",
  "settings.model.unsaved": "Nicht gespeicherte Änderungen",
  "settings.model.saved": "Einstellungen für {tag} gespeichert",
  "settings.model.params_hint": "leeres Feld = die Entscheidung bleibt bei Ollama",
  "settings.model.insert_suggested": "Vorschlag einsetzen",
  "settings.model.insert_suggested_tip":
    "Die für diesen Kategorietyp vorgeschlagenen Parameter einsetzen (unsere Empfehlung, keine Daten von Ollama)",
  "settings.model.ollama_default": "Ollama-Standard (4096)",
  "settings.model.help_temperature":
    "Kreativität: 0 hält sich ans Schema, höher = freier. Coding 0,1-0,3, Chat 0,6-0,8.",
  "settings.model.help_top_p": "Wahrscheinlichkeitsschwelle (0-1). Üblich ist 0,9.",
  "settings.model.help_top_k": "Wie viele der besten Token berücksichtigt werden. 0 = alle.",
  "settings.model.help_repeat_penalty":
    "Strafe für Wiederholungen: 1 = keine Strafe, höher = weniger Wiederholungen.",
  "settings.model.help_num_ctx":
    "Kontextgröße. Ollama nutzt standardmäßig 4096, und ein größerer Kontext belegt mehr VRAM - beim Vergleich von Durchläufen einen Wert beibehalten.",
  "settings.model.help_num_predict": "Längenlimit der Antwort in Token. -1 = kein Limit.",
  "settings.model.help_num_gpu":
    "Wie viele Layer an die Grafikkarte gehen: 0 = nur CPU, eine Zahl = so viele Layer, leer = Ollama entscheidet. Das Ergebnis steht in der Spalte GPU/CPU.",
  "settings.model.help_seed": "Feste Zufälligkeit - gleiche Ergebnisse beim Wiederholen.",
  "settings.model.system_title": "System-Prompt",
  "settings.model.system_custom": "eigener (sonst der Standard des Kategorietyps)",
  "settings.model.system_hint": "Wird im Feld system an das Modell gesendet.",
  "settings.model.system_preview": "Vorschau des Standard-Prompts für den Typ „{kind}”.",
  "settings.model.system_no_kind": "Keine Kategorie, also gibt es keinen Standard-Prompt.",
  "settings.model.insert_default": "Standard für den Typ einsetzen",
  "settings.model.no_system_support":
    "Dieses Modell bekommt den System-Prompt nicht - sein Template (Modelfile) hat keinen Platz für das Feld system, deshalb lässt Ollama es still weg. Bestätigt bei `moondream`. Schreibe die Anweisung stattdessen in den Prompt selbst.",

  // --- TestTab --------------------------------------------------------------
  "test.selection_title": "Auswahl von Modellen und Kategorien",
  "test.selection_hint":
    "Vorausgewählt sind die Paare, die sich aus der Kategoriezuordnung der Modelle ergeben. Du kannst das frei ändern.",
  "test.stop": "Stoppen",
  "test.start": "Test starten",
  "test.ollama_down": "Ollama antwortet nicht unter {endpoint} - der Test startet nicht.",
  "test.no_models": "Keine Modelle aktiviert",
  "test.no_models_hint":
    "Aktiviere Modelle im Tab „Modelle”, um die Testmatrix aufzubauen.",
  "test.count_prompts.one": "{count} Prompt",
  "test.count_prompts.other": "{count} Prompts",
  "test.count_images.one": "{count} Bild",
  "test.count_images.other": "{count} Bilder",
  "test.count_total_suffix": " von {total}",
  "test.select_all": "Alle",
  "test.select_none": "Keine",
  "test.select_column_tip": "Klicken: alle Modelle dieser Kategorie auswählen",
  "test.select_row_tip": "Klicken: alle Kategorien dieses Modells auswählen",
  "test.no_prompts": "keine Prompts",
  "test.custom_settings": "eigene Einstellungen",
  "test.selected": "Ausgewählte Durchläufe: {count} · Modelle: {models}",
  "test.not_downloaded_locked": "Nicht heruntergeladen - lade es zuerst im Tab Modelle.",
  "test.categories_ready": "Kategorien mit Prompts: {count} von {total}",
  "test.badge_system": "eigener System-Prompt",
  "test.badge_system_default": "Standard-System-Prompt des Kategorietyps",
  "test.badge_params_default": "Ollama-Standardparameter",
  "test.estimate": "Schätzung",
  "test.cpu_only": "nur CPU",
  "test.vision_warning":
    "Ollama meldet keine Bildunterstützung für: {models}. Diese Modelle sind der Bildkategorie zugeordnet, ein Prompt mit Bild wird also scheitern - nutze eine multimodale Variante (z. B. `llava`, `moondream`, `qwen2.5vl`).",
  "test.pick_pair": "Wähle mindestens ein Paar Modell × Kategorie.",
  "test.recent_title": "Letzte Messwerte",
  "test.finished_prompts.one": "{count} abgeschlossener Prompt",
  "test.finished_prompts.other": "{count} abgeschlossene Prompts",
  "test.recent_empty": "Hier erscheinen die Messwerte der nächsten Prompts.",

  // --- metryki (wspolne dla Test i Wyniki) ---------------------------------
  "metrics.ttft": "TTFT",
  "metrics.tps": "tok/s",
  "metrics.vram": "VRAM",
  "metrics.vram_peak": "VRAM-Spitze",
  "metrics.gpu_cpu": "GPU/CPU",
  "metrics.gpu_cpu_wide": "GPU / CPU",
  "metrics.gpu_cpu_split": "{gpu} / {cpu}%",
  "metrics.gpu_cpu_tip":
    "Die Aufteilung des Modellspeichers zwischen GPU und CPU (Layer), nicht die Rechenzeit",
  "metrics.model_size_tip":
    "das Modell belegt {size} - das ist die Speicheraufteilung (Layer), nicht die Rechenzeit",
  "metrics.split_tip": "die Speicheraufteilung des Modells zwischen GPU und CPU",
  "test.progress_title": "Fortschritt live",
  "test.progress_line": "{model} · {category} · Prompt {index} von {total}",
  "test.preparing": "Der erste Prompt wird vorbereitet…",
  "test.not_running": "Der Test läuft nicht",
  "test.prompt_show": "Ganzen Prompt anzeigen",
  "test.prompt_hide": "Prompt einklappen",
  "test.prompt_chars": "Zeichen: {chars}",
  "test.generating": "generiert",
  "test.in_progress": "läuft",
  "test.progress": "Fortschritt",
  "test.vram_now": "VRAM jetzt",
  "test.paused": "Test angehalten - bewerte die Antwort im Klassifizierungsfenster.",
  "test.streamed_response": "Gestreamte Antwort",
  "test.autoscroll": "Auto-Scroll",
  "test.autoscroll_hint": "Hält die Vorschau bei den neuesten Tokens. Hochscrollen pausiert, bis du wieder unten bist.",
  "test.no_data": "Keine Daten - starte einen Test.",
  "test.zero_tokens": "(0 Token)",
  "test.metrics_title": "Wie die Messwerte berechnet werden",
  "test.metrics_ttft":
    "TTFT - Zeit vom Absenden der Anfrage bis zum ersten Token; beim Kaltstart enthält sie das Laden des Modells in den Speicher.",
  "test.metrics_tps":
    "tok/s - von Ollama als eval_count / eval_duration berechnet, und mit unserer Uhr gemessen, wenn diese Daten fehlen.",
  "test.metrics_vram":
    "VRAM-Spitze - die höchste GPU-Speichernutzung, die NVML während der Generierung dieses Prompts erfasst hat.",
  "test.empty_response_explained":
    "Das Modell hat die Generierung ohne ein einziges Zeichen Antwort beendet (0 Token). Ollama meldete Erfolg, der Prompt kam also an - es kommt vor, dass eine bestimmte Formulierung sofort auf dem End-Token endet (so verhält sich z. B. moondream: dasselbe Bild beschreibt es mit anderer Formulierung normal). Eine andere Formulierung oder ein englischer Prompt hilft.",
  "test.unloaded_previous":
    "Aus dem Speicher entlassen wurden Modelle aus dem vorherigen Test: {models}. Modelle, die an diesem Durchlauf teilnehmen, bleiben im VRAM.",

  // --- ostrzeżenie o VRAM ---------------------------------------------------
  "vram.title": "VRAM-Schätzung",
  "vram.fit.on_gpu": "auf der Karte",
  "vram.fit.on_gpu_tight": "auf der Karte, ohne Reserve",
  "vram.fit.partial_cpu": "teils auf der CPU",
  "vram.fit.no_fit": "läuft nicht",
  "vram.fit.unknown_gpu": "GPU unbekannt",
  "vram.verdict.partial_cpu": "Die Karte ist dafür zu klein, ein Teil des Modells läuft also auf der CPU. Langsamer, aber es läuft.",
  "vram.verdict.no_fit": "Auf diesem Rechner läuft das nicht: rund {needed} MB nötig, {available} MB verfügbar (Karte + Arbeitsspeicher).",
  "vram.card_free": "Jetzt frei auf der Karte: {free} MB",
  "vram.ram": "Arbeitsspeicher: {free} MB frei von {total} MB · nutzbar für Modelle: {usable} MB (Reserve {reserve} MB)",
  "vram.ram_snapshot": "Der freie Arbeitsspeicher ist eine Momentaufnahme - andere Programme ändern ihn von Sekunde zu Sekunde.",
  "vram.swap_hint": "Das System könnte das Modell von der Platte nachladen, aber das sind Gigabyte pro Sekunde Auslagerung und ein Modell, das ein Zeichen pro Minute zählt.",
  "vram.required": "Geschätzter Bedarf: {required} MB von {total} MB der Karte",
  "vram.free_after": "Nach dem Laden frei: ~{free} MB",
  "vram.short": "Es fehlen etwa {missing} MB Grafikkartenspeicher.",
  "vram.short_hint": "Verringere num_ctx oder teile den Durchlauf in kleinere Teile.",
  "vram.tight":
    "Es passt, aber ohne Reserve - Ollama kann mehr belegen, als wir annehmen.",
  "vram.breakdown": "Gewichte {weights} MB · KV-Cache {kv} MB · Kontext {context}",
  "vram.confirmed": "Größe von /api/ps bestätigt",
  "vram.other": "außerhalb Ollamas: {other} MB",
  "vram.loaded_now": "schon jetzt im Speicher: {loaded} MB",
  "vram.context": "Kontext {context}",
  "vram.nvml_unavailable":
    "Der VRAM-Bedarf lässt sich nicht berechnen, weil NVML nicht antwortet - die Messung des Grafikkartenspeichers ist auf dieser Maschine nicht verfügbar.",

  // --- kody uwag z backendu (forecast.rs) ----------------------------------
  "forecast.no_targets": "Es ist noch kein Paar Modell × Kategorie ausgewählt.",
  "forecast.nvml_unavailable":
    "NVML antwortet nicht, wir wissen also nicht, wie viel Speicher die Karte hat - es gibt nichts, womit wir die Schätzung vergleichen könnten.",
  "forecast.estimate_explained":
    "Schätzung: Gewichte + KV-Cache aus den Metadaten des Modells + ein Puffer für den Rechengraphen. Ollama kann etwas mehr belegen.",
  "forecast.nothing_loaded":
    "Keines dieser Modelle ist gerade im Speicher, /api/ps kann ihre Größe also nicht bestätigen.",
  "forecast.partial_offload":
    "num_gpu ist gesetzt, daher können einige Layer auf der CPU laufen - der echte VRAM-Bedarf kann niedriger sein als die Schätzung.",
  "forecast.cpu_only": "num_gpu = 0, dieses Modell läuft also auf der CPU und belegt keinen VRAM.",
  "forecast.not_downloaded":
    "Dieses Modell ist nicht geladen, wir kennen weder Gewichte noch Architektur - es bleibt aus der Schätzung heraus.",
  "forecast.no_architecture_metadata":
    "Keine Architektur-Metadaten, der KV-Cache wurde also nicht berechnet - die Schätzung deckt nur die Gewichte ab.",
  "forecast.multimodal":
    "Multimodales Modell: der Bildencoder landet nicht immer im VRAM, der echte Bedarf kann deshalb abweichen.",

  // --- ResultsTab -----------------------------------------------------------
  "results.history": "Verlauf",
  "results.no_runs": "Keine gespeicherten Durchläufe.",
  "results.interrupted": "abgebrochen",
  "results.delete_run": "Durchlauf löschen",
  "results.tps_short": "{count} tok/s",
  "results.no_selection": "Kein Durchlauf ausgewählt",
  "results.no_selection_hint":
    "Starte einen Test im Tab „Test”, seine Ergebnisse erscheinen hier und werden lokal gespeichert.",
  "results.run_title": "Ergebnisse des Durchlaufs {id}",
  "results.export_saved": "{format} gespeichert: {path}",
  "results.open_failed": "Datei konnte nicht geöffnet werden: {error}",
  /* Skąd przyszedł model - plakietka przy nazwie w tabeli wyników. */
  "results.source_registry": "Registry",
  "results.source_huggingface": "HF",
  "results.source_tip":
    "Woher das Modell kommt. Dasselbe Modell kann aus der Registry und von HuggingFace anders abschneiden, weil Template und Parser aus dem Repository stammen.",
  "results.col.prompts": "Prompts",
  "results.col.tps_ollama": "tok/s (Ollama)",
  "results.col.tps_clock": "tok/s (Uhr)",
  "results.col.avg_ttft": "Ø TTFT",
  "results.col.empty": "Leere Antw.",
  "results.json_column": "JSON",
  "results.python_column": "Python",
  "results.python_tip": "Geprüft wird nur, ob die Antwort als Python parst. Das heißt nicht, dass der Code korrekt ist oder tut, was gefordert war. Eine Antwort ganz ohne Code hat einen eigenen Zustand. Es wird nichts ausgeführt.",
  "results.python_ok": "gültige Syntax",
  "results.python_syntax_error": "Syntaxfehler",
  "results.python_no_code": "kein Python-Code",
  "results.json_valid": "gültig",
  "results.json_invalid": "ungültig",
  "results.json_tip": "Lässt sich die Antwort als JSON parsen? Geprüft ohne erzwungenes Schema in Ollama, misst also das Modell und nicht die Laufzeitumgebung. Ein Codeblock zählt ebenfalls.",
  "results.labels": "Markierungen",
  "results.no_grades": "keine Bewertungen",
  "results.errors.one": "{count} Fehler",
  "results.errors.other": "{count} Fehler",
  "results.row_hint":
    "Klicke eine Zeile an, um die vollständigen Antworten zu sehen und die Klassifizierung zu bewerten.",
  "results.system_field": "system: {prompt}",
  "results.system_none": "system: keiner (Durchlauf von vor den Einstellungen)",
  "results.tps_clock": "tok/s Uhr",
  "results.empty_response_hint":
    "Leere Antwort: Ollama meldete Erfolg, aber das Modell hat kein einziges Token erzeugt. Kleine VLM-Modelle (z. B. moondream) verstummen manchmal bei einem Prompt in einer anderen Sprache - versuche es auf Englisch.",
  "results.zero_tokens": "(0 Token - kein Antworttext)",
  "results.grade": "Bewertung:",
  "results.clear_grade": "löschen",
  "results.ungraded": "unbewertet",
  "results.compare_title": "Vergleich von Modell A und B",
  "results.compare_hint":
    "Unterschiede im aktuellen Durchlauf sowie durchschnittliche tok/s über den gesamten gespeicherten Verlauf.",
  "results.compare_a": "— Modell A —",
  "results.compare_b": "— Modell B —",
  "results.compare_pick": "Wähle zwei verschiedene Modelle.",
  "results.compare_a_tps": "A: tok/s",
  "results.compare_b_tps": "B: tok/s",
  "results.compare_delta_tps": "Δ tok/s",
  "results.compare_a_ttft": "A: TTFT",
  "results.compare_b_ttft": "B: TTFT",
  "results.compare_delta_vram": "Δ VRAM",
  "results.trend_title": "Durchschnittliche tok/s pro Durchlauf (Vergleich über die Zeit)",
  "results.col.run": "Durchlauf",
  "results.compare_delta": "Δ",

  // --- Ustawienia -----------------------------------------------------------
  "settings.language_title": "Sprache der Anwendung",
  "settings.checks_title": "Prüfungen und Ansicht",
  "settings.check_json": "JSON-Gültigkeit prüfen",
  "settings.check_json_hint": "Fügt in der JSON-Kategorie ein Urteil neben der Messung hinzu: parst die Antwort als JSON? Aus heißt: die Prüfung läuft gar nicht, und die Spalte verschwindet aus Ergebnissen und Export.",
  "settings.check_python": "Python-Syntax prüfen",
  "settings.check_python_hint": "In der Kategorie Coding: parst die Antwort als Python? Der Code wird nicht ausgeführt, und das heißt nicht, dass er korrekt ist - nur, dass er nicht kaputt ist. Ausschalten, wenn du Code in anderen Sprachen testest.",
  "settings.auto_scroll": "Antwort automatisch scrollen",
  "settings.auto_scroll_hint": "Die Vorschau scrollt selbst zu den neuesten Tokens. Hochscrollen pausiert das, bis du wieder unten bist, und nach dem Ende des Durchlaufs hört es auf. Derselbe Schalter steht über der Vorschau im Tab „Test“. ",
  "settings.language_hint":
    "Englisch ist die Standardsprache. Die Änderung wirkt sofort und wird in `settings.json` gespeichert, übersteht also einen Neustart.",
  "settings.history_title": "Verlauf der Durchläufe",
  "settings.history_stats": "Gespeicherte Durchläufe: {count} · {size}",
  "settings.history_hint":
    "Der Verlauf liegt als eine JSON-Datei pro Durchlauf. Du kannst ihn zusammen mit dem Datenordner kopieren.",
  "settings.filter": "Filter",
  "settings.filter_all": "Alle",
  "settings.filter_older": "Älter als",
  "settings.filter_interrupted": "Nur abgebrochene",
  "settings.days.one": "{count} Tag",
  "settings.days.other": "{count} Tage",
  "settings.to_delete.one": "Zum Löschen: {count} Durchlauf · {size}",
  "settings.to_delete.other": "Zum Löschen: {count} Durchläufe · {size}",
  "settings.nothing_matches": "Nichts passt zum Filter.",
  "settings.delete_selected": "Ausgewählte löschen",
  "settings.deleted.one": "{count} Durchlauf gelöscht, {size} freigegeben.",
  "settings.deleted.other": "{count} Durchläufe gelöscht, {size} freigegeben.",
  "settings.data_folder": "Datenordner",
  "settings.open_folder": "Ordner öffnen",
  "settings.exports_title": "Exportdateien",
  "settings.exports_stats.one": "Im Ordner {dir} liegt {count} Datei ({size}).",
  "settings.exports_stats.other": "Im Ordner {dir} liegen {count} Dateien ({size}).",
  "settings.exports_hint":
    "Das sind deine CSV/HTML-Dateien, deshalb werden sie mit einer eigenen Aktion gelöscht - nie zusammen mit dem Verlauf.",
  "settings.delete_exports": "Exportdateien löschen",
  "settings.exports_deleted.one": "{count} Exportdatei gelöscht, {size} freigegeben.",
  "settings.exports_deleted.other": "{count} Exportdateien gelöscht, {size} freigegeben.",
  "settings.prompts_title": "Standard-System-Prompts",
  "settings.prompts_hint":
    "Werden genutzt, wenn ein Modell keinen eigenen Prompt hat. Der Standard hängt vom Kategorietyp ab, in dem das Modell startet - die Einstellung gilt also pro Typ, nicht pro Modell. Der eingebaute Text ist bewusst englisch: kleine Modelle folgen englischen Anweisungen zuverlässiger, und so bleiben Durchläufe vergleichbar, egal welche Sprache die Oberfläche hat. Schreib deinen eigenen in jeder Sprache - das ist deine Entscheidung, kein Text der Anwendung.",
  "settings.prompt_changed": "Geändert",
  "settings.prompt_builtin": "Eingebaut",
  "settings.prompt_restore": "Eingebauten wiederherstellen",
  "settings.reset_title": "Standardeinstellungen wiederherstellen",
  "settings.reset_hint":
    "Löscht die Einstellungsdatei des Nutzers und kehrt zu den Standardwerten zurück. Modelle, Kategorien, Verlauf und Exportdateien bleiben unberührt.",
  "settings.reset_action": "Standard wiederherstellen",
  "settings.reset_done": "Standardeinstellungen wiederhergestellt.",
  "settings.reset_warning": "Diese Aktion kann nicht rückgängig gemacht werden.",
  "settings.scope_title": "Einstellungen der Anwendung, nicht des Modells",
  "settings.scope_hint":
    "Sprache, Verlauf, Exporte und Standard-Prompts. Die Einstellungen einzelner Modelle sind im Tab „Modelle”.",

  // --- Katalog modeli z HuggingFace --------------------------------------
  "search.title": "HuggingFace-Katalog",
  "search.subtitle":
    "GGUF-Repositories, die Ollama laden kann. Ein leeres Feld durchsucht den Katalog nach Beliebtheit.",
  "search.placeholder": "Repositories suchen (z. B. qwen2.5-coder)",
  "search.button": "Suchen",
  "search.refresh": "Aktualisieren",
  "search.filters": "Filter",
  /* Plakietka przy grupie filtrów: skąd pochodzi filtr. */
  "search.origin_hf": "HF",
  "search.origin_ours": "unseres",
  "search.open_hf": "Auf HuggingFace öffnen",
  "search.badge_hf": "Daten aus der HuggingFace-API",
  "search.task": "Aufgabe",
  "search.task.text": "Text",
  "search.task.vision": "Mit Bildern",
  "search.task.all": "Alles",
  "search.task.text_tip": "Texterzeugung - Modelle für Code und Gespräch. Die meisten.",
  "search.task.vision_tip":
    "Bildverständnis (image-text-to-text). Ollama führt sie als VLM aus.",
  "search.task.all_tip":
    "Ohne Aufgabenfilter. Lässt auch Modelle zu, die Ollama nicht ausführt, z. B. Spracherkennung.",
  "search.size": "Downloadgröße",
  "search.size_any": "beliebig",
  "search.size_up_to": "bis {size}",
  "search.size_note": "Vergleicht die kleinste Variante im Repository.",
  "search.fits_only": "Nur was auf meine Karte passt",
  "search.fits_note": "Lässt Modelle drin, die laufen - auch teilweise auf der CPU.",
  "search.hide_owned": "Bereits geladene ausblenden",
  "search.counts_note":
    "Zahlen und Filter betreffen den geladenen Teil der Liste, nicht den ganzen Katalog.",
  "search.installed": "geladen",
  "search.on_list": "auf der Liste",
  "search.gated": "geschlossen",
  "search.gated_note":
    "Geschlossenes Repository: Ollama öffnet es mit eigenem SSH-Schlüssel, nicht mit einem API-Token. Hier gibt es nichts einzufügen.",
  "search.reading": "lese Dateien…",
  "search.detail_failed": "Dateiliste nicht lesbar - die Zeile hat keine Größen.",
  "search.count_variants.one": "{count} Variante",
  "search.count_variants.other": "{count} Varianten",
  "search.col_variant": "Variante",
  "search.col_size": "Download",
  "search.col_memory": "Speicher",
  "search.with_projector": "+ Projektor",
  "search.projector_tip": "Enthält den Projektor ({size}), den Ollama mit dem Modell lädt.",
  "search.split_skipped": "In Teile zerlegt, daher nicht in der Liste: {list}",
  "search.groups_skipped": "Übersprungene Hilfsdateien: {list}",
  "search.memory_note":
    "Die Größe ist eine Untergrenze: Der KV-Cache fehlt, weil HF weder Layer noch KV-Heads nennt.",
  "search.context": "Kontext {value}",
  "search.arch": "Architektur {name}",
  "search.no_variants":
    "Dieses Repository hat kein GGUF als Einzeldatei - jede Modelldatei ist in Teile zerlegt.",
  "search.pick_categories": "Kategorien für das hinzugefügte Modell",
  "search.added": "{tag} mit den gewählten Kategorien hinzugefügt.",
  "search.added_no_category": "{tag} hinzugefügt. Kategorien wählst du im Tab Modelle.",
  "search.downloads": "Downloads auf HuggingFace",
  "search.likes": "Likes auf HuggingFace",
  "search.expand": "Varianten anzeigen",
  "search.collapse": "Varianten ausblenden",
  "search.more": "Mehr anzeigen",
  "search.loading": "Lade…",
  "search.failed": "HuggingFace hat nicht geantwortet",
  "search.empty": "Nichts gefunden",
  "search.empty_hint": "Feld leeren, um den Katalog zu durchsuchen, oder einen anderen Namen versuchen.",
  "search.search_all_tasks": "In allen Aufgaben suchen",
  "search.footer":
    "Diese Modelle lädt Ollama selbst, mit dem Tag aus der Zeile. Den Download startest du im Tab Modelle.",
};
