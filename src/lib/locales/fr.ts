/**
 * Français interface text.
 *
 * Keys are neutral and identical in every language file (`en.ts`, `pl.ts`, `de.ts`,
 * `es.ts`, `fr.ts`), so a missing translation falls back to English rather than to
 * Polish. Placeholders use `{name}` and are filled by `t(key, { name })`.
 *
 * Never put French text in a component: every user-facing string goes through
 * `t("area.thing")` and lives here. `npm run check:i18n` verifies that every file
 * carries exactly the same keys and the same placeholders.
 */
export const FR: Record<string, string> = {
  // --- shell / tabs ---------------------------------------------------------
  "nav.models": "Modèles",
  "nav.search": "Chercher des modèles",
  "nav.categories": "Catégories",
  "nav.test": "Test",
  "nav.results": "Résultats",
  "nav.settings": "Paramètres",
  "app.subtitle": "Ollama · modèles LLM locaux",
  "window.minimize": "Réduire",
  "window.maximize": "Agrandir",
  "window.restore": "Restaurer",
  "app.loading_config": "Chargement de la configuration…",
  "app.reading": "lecture…",
  "gpu.nvml_unavailable": "NVML indisponible",

  // --- osłona na błędy (ErrorBoundary) --------------------------------------
  "error.title": "Cette section ne fonctionne plus",
  "error.window_title": "La fenêtre ne s'affiche plus",
  "error.hint": "Seule cette partie a échoué, le reste de l'application fonctionne toujours.",
  "error.details": "Détail technique",
  "error.retry": "Réessayer",

  // --- étiquettes de classification -----------------------------------------
  "label.completed": "Terminé",
  "label.refused": "Refusé",
  "label.limited": "Terminé avec des limites/changements",
  "label.completed.help": "Le modèle a fait la tâche comme demandé.",
  "label.refused.help": "Le modèle a refusé de faire la tâche.",
  "label.limited.help":
    "Le modèle a fait la tâche, mais a changé sa portée, ajouté des réserves ou sauté une partie de la consigne.",

  // --- communs --------------------------------------------------------------
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.open": "Ouvrir",
  "common.close": "Fermer",
  "common.retry": "réessayer",
  "common.prompt": "Prompt",
  "common.model": "Modèle",
  "common.category": "Catégorie",
  "common.time": "Temps",
  "common.add": "Ajouter",
  "common.set": "Définir",
  "common.clear": "Effacer",
  "common.reset": "Réinitialiser",
  "common.confirm": "Confirmer",
  "common.default": "par défaut",
  "common.auto": "auto",
  "common.no_limit": "sans limite",
  "common.badge_custom": "personnels",
  "common.badge_settings": "réglages",
  "common.not_downloaded": "non téléchargé",
  // Liczba mnoga: formę wybiera język (`Intl.PluralRules`), patrz `lib/i18n.tsx`.
  "common.count_prompts.one": "{count} prompt",
  "common.count_prompts.many": "{count} de prompts",
  "common.count_prompts.other": "{count} prompts",

  // --- ClassifyModal --------------------------------------------------------
  "classify.title": "Classification manuelle de la réponse",
  "classify.hint":
    "Lis toute la réponse et choisis l'une des trois étiquettes. Le test attend ton choix.",
  "classify.response": "Réponse du modèle",
  "classify.empty_response": "(réponse vide)",
  "classify.start_failed": "Échec du démarrage",

  // --- ModelsTab : barre d'état du téléchargement ---------------------------
  "models.pull.manifest": "téléchargement du manifeste",
  "models.pull.checksum": "vérification de la somme de contrôle",
  "models.pull.writing": "écriture du manifeste",
  "models.pull.removing_layers": "suppression des couches inutilisées",
  "models.pull.done": "terminé",
  "models.pull.layer": "couche {id}",

  // --- ModelsTab : messages -------------------------------------------------
  "models.msg.downloaded": "Modèle {model} téléchargé",
  "models.msg.download_failed": "Le téléchargement de {model} a échoué : {error}",
  "models.msg.loaded": "{tag} chargé en {duration}",
  "models.msg.gpu_share": "{gpu}% de la mémoire du modèle sur le GPU",
  "models.msg.load_failed": "Impossible de charger {tag} : {error}",
  "models.msg.unloaded": "{tag} libéré de la mémoire",
  "models.msg.unload_failed": "Impossible de libérer {tag} : {error}",
  "models.msg.unloaded_all": "Mémoire libérée pour tous les modèles chargés",
  "models.msg.deleted": "Modèle {tag} supprimé du disque",
  "models.msg.delete_failed": "Impossible de supprimer {tag} : {error}",
  "models.msg.enter_tag": "Saisis une étiquette de modèle, p. ex. mistral:7b",
  "models.msg.already_on_list": "{tag} est déjà dans la liste",
  "models.msg.added": "{tag} ajouté",

  // --- ModelsTab: lista modeli i panel wybranego modelu ---------------------
  "models.list.search": "Rechercher un modèle…",
  "models.list.no_match": "Aucun modèle ne correspond à « {query} ».",
  "models.detail.memory_title": "Mémoire (VRAM)",
  "models.detail.in_memory": "en mémoire",
  "models.detail.not_in_memory": "non chargé",
  "models.detail.vram_short": "{used} / {total} MB VRAM",

  // --- ModelsTab : tuiles ---------------------------------------------------
  "models.status.running": "en marche · {version}",
  "models.status.offline": "pas de connexion",
  "models.tile.vram_skipped": "les mesures de VRAM seront ignorées",
  "models.tile.probing_nvml": "vérification de NVML…",
  "models.installed": "Modèles installés",
  "models.refresh_state": "Actualiser l'état",

  // --- ModelsTab : panneau mémoire ------------------------------------------
  "models.memory.unload_all": "Tout libérer",
  "models.memory.hint_empty":
    "Rien n'est chargé pour l'instant. Le premier prompt de chaque modèle paiera le démarrage à froid (dans des mesures précédentes, le TTFT est passé d'environ 6,7 s à environ 80 ms après chargement du modèle).",
  "models.memory.split_unknown": "répartition inconnue",
  "models.memory.split": "GPU {gpu}% / CPU {cpu}%",
  "models.memory.vram_of_total": "{vram} sur {total}",
  "models.memory.context": "· contexte {context}",
  "models.memory.expires": "· se libère vers {time}",
  "models.memory.unloading": "Libération…",
  "models.memory.unload": "Libérer",
  "models.memory.unload_tip": "Libérer la VRAM occupée par ce modèle",
  "models.memory.split_tip":
    "Répartition de la mémoire du modèle entre GPU et CPU (couches, pas temps de calcul)",

  // --- ModelsTab : ajout d'un modèle ----------------------------------------
  "models.add.title": "Ajouter ton propre modèle",
  "models.add.hint":
    "N'importe quelle étiquette Ollama. C'est le seul moyen d'allonger la liste : rien n'est choisi automatiquement.",
  "models.add.placeholder": "p. ex. mistral:7b",
  "models.add.duplicate": "Cette étiquette est déjà dans la liste.",
  "models.add.checking_size": "Consultation de la taille dans le registre Ollama…",
  "models.add.size_to_download": "{size} à télécharger",
  "models.add.suggested": "catégorie suggérée : {name}",
  "models.add.certain_vision": "Sûr : Ollama annonce la capacité 'vision' pour ce modèle",
  "models.add.heuristic":
    "Heuristique d'après le nom : Ollama ne publie pas la vocation d'un modèle",
  "models.add.reports_vision": "Ollama annonce la prise en charge des images pour ce modèle",
  "models.add.by_name": "d'après le nom du modèle : Ollama n'indique pas la vocation",
  "models.add.auto_suffix": " · définie automatiquement, tu peux la décocher",

  // --- ModelsTab : lignes de modèles ----------------------------------------
  "models.row.no_category": "Sans catégorie",
  "models.row.empty_category": "Aucun modèle dans cette catégorie.",
  "models.row.include": "Inclure dans les tests",
  "models.row.assign_tip": "Assigner le modèle à une catégorie",
  "models.row.suggest": "Suggestion : {name}",
  "models.row.suggest_why":
    "Suggestion d'après le nom du modèle : Ollama ne publie pas la vocation",
  "models.row.vision_yes": "images",
  "models.row.vision_no": "pas de prise en charge des images",
  "models.row.vision_warning":
    "Ce modèle est assigné à la catégorie Images (VLM), mais Ollama n'annonce pas la prise en charge des images : un prompt avec image échouera.",
  "models.row.vision_tip": "Ollama annonce la capacité 'vision' : le modèle traite les images",
  "models.row.downloaded": "téléchargé · {size}",
  "models.row.checking_size": "vérification de la taille…",
  "models.row.size_unknown": "taille inconnue",
  "models.row.loading": "Chargement en VRAM…",
  "models.row.load": "Charger",
  "models.row.load_tip":
    "Charger le modèle en VRAM d'avance pour que le premier prompt ne paie pas le démarrage à froid",
  "models.row.downloading": "Téléchargement…",
  "models.row.download": "Télécharger",
  "models.row.remove_tip": "Retirer le modèle (aussi du disque)",
  "models.row.remove": "Retirer de la liste",
  "models.row.remove_confirm": "Retirer {tag} ?",
  "models.row.delete_keep": "Garde les fichiers du modèle sur le disque",
  "models.row.delete_keep_action": "Seulement de la liste",
  "models.row.delete_disk_hint": "Supprime les fichiers du modèle via Ollama",
  "models.row.deleting": "Suppression…",
  "models.row.delete_from_disk": "Supprimer du disque ({size})",
  "models.empty.title": "La liste des modèles est vide",
  "models.empty.hint": "Ajoute une étiquette Ollama ci-dessus pour pouvoir lancer un test.",

  // --- CategoriesTab --------------------------------------------------------
  "categories.intro":
    "Les catégories et les prompts sont entièrement modifiables : rien n'est figé dans le code. La case devant chaque prompt décide s'il entre dans le test : un prompt décoché reste dans la liste avec son texte, mais les modèles ne le voient jamais. La catégorie « Response classification » démarre volontairement sans prompts : ses résultats, tu les notes à la main après les avoir lus, donc c'est toi qui décides ce que tu demandes aux modèles.",
  "categories.enabled_prompts": "Prompts activés : {count} sur {total}",
  "categories.enabled_tasks": "Tâches activées : {count} sur {total}",
  "categories.count_images.one": "{count} tâche avec image",
  "categories.count_images.many": "{count} de tâches avec image",
  "categories.count_images.other": "{count} tâches avec image",
  "categories.uncheck_all": "Tout décocher",
  "categories.check_all": "Tout cocher",
  "categories.uncheck_all_tip": "Décocher tous les prompts de cette catégorie",
  "categories.check_all_tip": "Cocher tous les prompts de cette catégorie",
  "categories.add_image": "Ajouter image + prompt",
  "categories.add_prompt": "Ajouter un prompt",
  "categories.classification_intro":
    "Aucun prompt par défaut. Après chaque réponse, le test s'arrête et te montre trois boutons : ",
  "categories.long_context_note": "Ollama tronque l'entrée à 4096 tokens par défaut, et le fait silencieusement. Avant de mesurer cette catégorie, règle num_ctx du modèle dans l'onglet Modèles - sinon le modèle ne verra que le début.",
  "categories.classification_outro": ". Tu pourras changer l'étiquette plus tard dans l'onglet « Résultats ».",
  "categories.task_enabled_tip": "Cette tâche doit-elle entrer dans le test ?",
  "categories.prompt_enabled_tip": "Ce prompt doit-il entrer dans le test ?",
  "categories.image_label": "Image {index}",
  "categories.image_placeholder": "chemin du fichier, p. ex. C:\\images\\test.png",
  "categories.choose_file": "Choisir…",
  "categories.prompt_text": "Texte du prompt",
  "categories.empty":
    "Cette catégorie n'a encore aucun prompt : les catégories vides sont ignorées par le test.",
  "categories.all_unchecked":
    "Tous les prompts de cette catégorie sont décochés, la catégorie sera donc ignorée par le test.",

  // --- suggestions dans les champs de prompt vides --------------------------
  "hint.coding": "p. ex. Écris une fonction Python qui inverse l'ordre des caractères du texte donné.",
  "hint.chat": "p. ex. Explique en trois phrases ce qu'est la photosynthèse.",
  "hint.vlm": "p. ex. Décris ce qu'on voit sur l'image et énumère les objets reconnaissables.",
  "hint.reasoning": "p. ex. Un train part à 14h20 et parcourt 63 km en 45 minutes. À quelle vitesse roule-t-il ?",
  "hint.json": "p. ex. Renvoie un objet JSON avec les trois plus grandes villes de Pologne, chacune avec son nom, sa population et sa voïvodie.",
  "hint.long_context": "p. ex. Colle un long article et demande un résumé en cinq points.",
  "hint.classification": "p. ex. Décris en une phrase à quoi sert la boucle for en Python.",

  // --- ModelSettingsModal ---------------------------------------------------
  "settings.model.hint":
    "Les paramètres et le prompt système ne concernent que ce modèle et sont enregistrés avec les résultats du passage : avec le temps, on verra avec quoi ils ont été obtenus.",
  "settings.model.context_supported": "le modèle prend en charge un contexte jusqu'à {context} tokens",
  "settings.model.context_unknown":
    "on ne connaît pas le contexte du modèle (non téléchargé, ou Ollama ne l'indique pas)",
  "settings.model.params_title": "Paramètres de génération",
  "settings.model.unsaved": "Modifications non enregistrées",
  "settings.model.saved": "Réglages de {tag} enregistrés",
  "settings.model.params_hint": "champ vide = on laisse la décision à Ollama",
  "settings.model.insert_suggested": "Insérer ceux proposés",
  "settings.model.insert_suggested_tip":
    "Insérer les paramètres proposés pour ce type de catégorie (ce sont nos recommandations, pas des données d'Ollama)",
  "settings.model.ollama_default": "par défaut d'Ollama (4096)",
  "settings.model.help_temperature":
    "Créativité : 0 s'en tient au schéma, plus haut = plus libre. Code 0,1-0,3, conversation 0,6-0,8.",
  "settings.model.help_top_p": "Seuil de probabilité (0-1). En général 0,9.",
  "settings.model.help_top_k": "Combien de meilleurs tokens prendre en compte. 0 = tous.",
  "settings.model.help_repeat_penalty":
    "Pénalité de répétition : 1 = aucune pénalité, plus haut = moins de répétitions.",
  "settings.model.help_num_ctx":
    "Taille du contexte. Ollama utilise 4096 par défaut, et un contexte plus grand occupe plus de VRAM : garde une même valeur pour comparer des passages.",
  "settings.model.help_num_predict": "Limite de longueur de la réponse en tokens. -1 = sans limite.",
  "settings.model.help_num_gpu":
    "Combien de couches confier à la carte : 0 = CPU seulement, un nombre = autant de couches, vide = Ollama décide. Le résultat se voit dans la colonne GPU/CPU.",
  "settings.model.help_seed": "Aléatoire fixe : les mêmes résultats en répétant.",
  "settings.model.system_title": "Prompt système",
  "settings.model.system_custom": "personnel (sinon celui par défaut du type de catégorie)",
  "settings.model.system_hint": "Sera envoyé au modèle dans le champ system.",
  "settings.model.system_preview": "Aperçu du prompt par défaut pour le type « {kind} ».",
  "settings.model.system_no_kind": "Pas de catégorie, donc pas de prompt par défaut à reprendre.",
  "settings.model.insert_default": "Insérer celui par défaut du type",
  "settings.model.no_system_support":
    "Ce modèle ne reçoit pas le prompt système : son gabarit (Modelfile) n'a pas de place pour le champ system, donc Ollama le laisse tomber en silence. Vérifié sur `moondream`. Écris plutôt la consigne dans le prompt lui-même.",

  // --- TestTab --------------------------------------------------------------
  "test.selection_title": "Choix des modèles et des catégories",
  "test.selection_hint":
    "Les paires cochées par défaut découlent de l'assignation de chaque modèle à sa catégorie. Tu peux changer tout ça librement.",
  "test.stop": "Arrêter",
  "test.start": "Lancer le test",
  "test.ollama_down": "Ollama ne répond pas sur {endpoint} : le test ne démarrera pas.",
  "test.no_models": "Aucun modèle activé",
  "test.no_models_hint":
    "Active des modèles dans l'onglet « Modèles » pour construire la matrice de tests.",
  "test.count_prompts.one": "{count} prompt",
  "test.count_prompts.many": "{count} de prompts",
  "test.count_prompts.other": "{count} prompts",
  "test.count_images.one": "{count} image",
  "test.count_images.many": "{count} d'images",
  "test.count_images.other": "{count} images",
  "test.count_total_suffix": " sur {total}",
  "test.select_all": "Tout",
  "test.select_none": "Aucun",
  "test.select_column_tip": "Cliquer : sélectionner tous les modèles de cette catégorie",
  "test.select_row_tip": "Cliquer : sélectionner toutes les catégories de ce modèle",
  "test.no_prompts": "aucun prompt",
  "test.custom_settings": "réglages personnels",
  "test.selected": "Passages sélectionnés : {count} · modèles : {models}",
  "test.not_downloaded_locked": "Non téléchargé - téléchargez-le d'abord dans l'onglet Modèles.",
  "test.categories_ready": "Catégories avec prompts : {count} sur {total}",
  "test.badge_system": "prompt système personnel",
  "test.badge_system_default": "prompt système par défaut du type de catégorie",
  "test.badge_params_default": "paramètres par défaut d'Ollama",
  "test.estimate": "estimation",
  "test.cpu_only": "CPU seulement",
  "test.vision_warning":
    "Ollama n'annonce pas la prise en charge des images pour : {models}. Ces modèles sont assignés à la catégorie images, donc un prompt avec image échouera : utilise une variante multimodale (p. ex. `llava`, `moondream`, `qwen2.5vl`).",
  "test.pick_pair": "Sélectionne au moins une paire modèle × catégorie.",
  "test.recent_title": "Dernières mesures",
  "test.finished_prompts.one": "{count} prompt terminé",
  "test.finished_prompts.many": "{count} de prompts terminés",
  "test.finished_prompts.other": "{count} prompts terminés",
  "test.recent_empty": "Les mesures des prompts suivants apparaîtront ici.",

  // --- métriques (Test et Résultats) ----------------------------------------
  "metrics.ttft": "TTFT",
  "metrics.tps": "tok/s",
  "metrics.vram": "VRAM",
  "metrics.vram_peak": "Pic VRAM",
  "metrics.gpu_cpu": "GPU/CPU",
  "metrics.gpu_cpu_wide": "GPU / CPU",
  "metrics.gpu_cpu_split": "{gpu} / {cpu}%",
  "metrics.gpu_cpu_tip":
    "La répartition de la mémoire du modèle entre GPU et CPU (couches), pas le temps de calcul",
  "metrics.model_size_tip":
    "le modèle occupe {size} : c'est la répartition de la mémoire (couches), pas le temps de calcul",
  "metrics.split_tip": "la répartition de la mémoire du modèle entre GPU et CPU",
  "test.progress_title": "Progression en direct",
  "test.progress_line": "{model} · {category} · prompt {index} sur {total}",
  "test.preparing": "Préparation du premier prompt…",
  "test.not_running": "Le test n'est pas lancé",
  "test.prompt_show": "Afficher tout le prompt",
  "test.prompt_hide": "Replier le prompt",
  "test.prompt_chars": "caractères : {chars}",
  "test.generating": "génération",
  "test.in_progress": "en cours",
  "test.progress": "Progression",
  "test.vram_now": "VRAM maintenant",
  "test.paused": "Test en pause : note la réponse dans la fenêtre de classification.",
  "test.streamed_response": "Réponse en flux",
  "test.autoscroll": "Défilement auto",
  "test.autoscroll_hint": "Garde l'aperçu sur les derniers tokens. Remonter le met en pause jusqu'au retour en bas.",
  "test.no_data": "Pas de données : lance un test.",
  "test.zero_tokens": "(0 token)",
  "test.metrics_title": "Comment les mesures sont calculées",
  "test.metrics_ttft":
    "TTFT : temps entre l'envoi de la requête et le premier token ; à froid, il inclut le chargement du modèle en mémoire.",
  "test.metrics_tps":
    "tok/s : calculés par Ollama comme eval_count / eval_duration, et mesurés avec notre horloge quand ces données manquent.",
  "test.metrics_vram":
    "Pic VRAM : la plus haute utilisation de mémoire GPU relevée par NVML pendant la génération de ce prompt.",
  "test.empty_response_explained":
    "Le modèle a terminé la génération sans un seul caractère de réponse (0 token). Ollama a signalé un succès, donc le prompt lui est bien parvenu : il arrive qu'une formulation précise finisse tout de suite sur le token de fin (c'est le cas de moondream : la même image, il la décrit normalement avec une autre formulation). Une autre formulation ou un prompt en anglais aide.",
  "test.unloaded_previous":
    "Modèles du test précédent libérés de la mémoire : {models}. Les modèles qui participent à ce passage restent en VRAM.",

  // --- avertissement VRAM ---------------------------------------------------
  "vram.title": "Estimation de la VRAM",
  "vram.fit.on_gpu": "sur la carte",
  "vram.fit.on_gpu_tight": "sur la carte, sans marge",
  "vram.fit.partial_cpu": "en partie sur le CPU",
  "vram.fit.no_fit": "ne démarrera pas",
  "vram.fit.unknown_gpu": "GPU inconnu",
  "vram.verdict.partial_cpu": "La carte est trop petite : une partie du modèle tournera sur le processeur. Plus lent, mais ça tourne.",
  "vram.verdict.no_fit": "Sur cette machine, ça ne démarrera pas : environ {needed} Mo nécessaires, {available} Mo disponibles (carte + mémoire).",
  "vram.card_free": "Libre sur la carte maintenant : {free} Mo",
  "vram.ram": "Mémoire : {free} Mo libres sur {total} Mo · utilisable par les modèles : {usable} Mo (réserve {reserve} Mo)",
  "vram.ram_snapshot": "La mémoire libre est un instantané : d'autres programmes la modifient d'une seconde à l'autre.",
  "vram.swap_hint": "Le système pourrait charger le modèle depuis le disque, mais c'est des gigaoctets par seconde d'échange et un modèle qui compte un caractère par minute.",
  "vram.required": "Besoin estimé : {required} Mo sur les {total} Mo de la carte",
  "vram.free_after": "Libre après chargement : ~{free} Mo",
  "vram.short": "Il manque environ {missing} Mo de mémoire sur la carte.",
  "vram.short_hint": "Réduis num_ctx ou découpe le passage en plus petites parties.",
  "vram.tight": "Ça passe, mais sans marge : Ollama peut allouer plus que ce qu'on suppose.",
  "vram.breakdown": "Poids {weights} Mo · cache KV {kv} Mo · contexte {context}",
  "vram.confirmed": "taille confirmée par /api/ps",
  "vram.other": "hors Ollama : {other} Mo",
  "vram.loaded_now": "déjà en mémoire : {loaded} Mo",
  "vram.context": "contexte {context}",
  "vram.nvml_unavailable":
    "Impossible de calculer le besoin de VRAM parce que NVML ne répond pas : la mesure de la mémoire de la carte n'est pas disponible sur cette machine.",

  // --- codes de remarque du backend (forecast.rs) ---------------------------
  "forecast.no_targets": "Aucune paire modèle × catégorie n'est encore sélectionnée.",
  "forecast.nvml_unavailable":
    "NVML ne répond pas, donc on ne sait pas combien de mémoire a la carte : il n'y a rien à quoi comparer l'estimation.",
  "forecast.estimate_explained":
    "Estimation : poids + cache KV calculés à partir des métadonnées du modèle + une marge pour le graphe de calcul. Ollama peut allouer un peu plus.",
  "forecast.nothing_loaded":
    "Aucun de ces modèles n'est en mémoire en ce moment, donc /api/ps ne peut pas confirmer leur taille.",
  "forecast.partial_offload":
    "num_gpu est défini, donc certaines couches peuvent tourner sur le CPU : l'usage réel de VRAM peut être plus bas que l'estimation.",
  "forecast.cpu_only": "num_gpu = 0, donc ce modèle tourne sur le CPU et n'occupe pas de VRAM.",
  "forecast.not_downloaded":
    "Ce modèle n'est pas téléchargé, on ne connaît ni ses poids ni son architecture : il est écarté de l'estimation.",
  "forecast.no_architecture_metadata":
    "Pas de métadonnées d'architecture, le cache KV n'a donc pas été calculé : l'estimation ne couvre que les poids.",
  "forecast.multimodal":
    "Modèle multimodal : l'encodeur d'images ne finit pas toujours en VRAM, l'usage réel peut donc différer.",

  // --- ResultsTab -----------------------------------------------------------
  "results.history": "Historique",
  "results.no_runs": "Aucun passage enregistré.",
  "results.interrupted": "interrompu",
  "results.delete_run": "Supprimer le passage",
  "results.tps_short": "{count} tok/s",
  "results.no_selection": "Aucun passage sélectionné",
  "results.no_selection_hint":
    "Lance un test dans l'onglet « Test » : ses résultats apparaîtront ici et seront enregistrés en local.",
  "results.run_title": "Résultats du passage {id}",
  "results.export_saved": "{format} enregistré : {path}",
  "results.open_failed": "Impossible d'ouvrir le fichier : {error}",
  /* Skąd przyszedł model - plakietka przy nazwie w tabeli wyników. */
  "results.source_registry": "registre",
  "results.source_huggingface": "HF",
  "results.source_tip":
    "D'où vient le modèle. Le même modèle peut donner des résultats différents depuis le registre et depuis HuggingFace, car le gabarit et l'analyseur viennent du dépôt.",
  "results.col.prompts": "Prompts",
  "results.col.tps_ollama": "tok/s (Ollama)",
  "results.col.tps_clock": "tok/s (horloge)",
  "results.col.avg_ttft": "TTFT moy.",
  "results.col.empty": "Rép. vides",
  "results.json_column": "JSON",
  "results.python_column": "Python",
  "results.python_tip": "On vérifie seulement si la réponse s'analyse comme du Python. Cela ne signifie pas que le code est correct ni qu'il fait ce qui était demandé. Une réponse sans code a son propre état. Rien n'est jamais exécuté.",
  "results.python_ok": "syntaxe valide",
  "results.python_syntax_error": "erreur de syntaxe",
  "results.python_no_code": "aucun code Python",
  "results.json_valid": "valide",
  "results.json_invalid": "invalide",
  "results.json_tip": "La réponse est-elle analysable comme du JSON ? Vérifié sans forcer de schéma côté Ollama : on mesure donc le modèle, pas l'environnement. Un bloc de code compte aussi.",
  "results.labels": "Étiquettes",
  "results.no_grades": "aucune note",
  "results.errors.one": "{count} erreur",
  "results.errors.many": "{count} d'erreurs",
  "results.errors.other": "{count} erreurs",
  "results.row_hint":
    "Clique sur une ligne pour voir les réponses complètes et noter la classification.",
  "results.system_field": "system : {prompt}",
  "results.system_none": "system : aucun (passage d'avant les réglages)",
  "results.tps_clock": "tok/s horloge",
  "results.empty_response_hint":
    "Réponse vide : Ollama a signalé un succès, mais le modèle n'a généré aucun token. Les petits modèles VLM (moondream, par exemple) se taisent parfois sur un prompt dans une autre langue : essaie en anglais.",
  "results.zero_tokens": "(0 token - pas de texte de réponse)",
  "results.grade": "Note :",
  "results.clear_grade": "effacer",
  "results.ungraded": "non noté",
  "results.compare_title": "Comparaison du modèle A et B",
  "results.compare_hint":
    "Différences dans le passage en cours et moyennes de tok/s sur tout l'historique enregistré.",
  "results.compare_a": "— modèle A —",
  "results.compare_b": "— modèle B —",
  "results.compare_pick": "Choisis deux modèles différents.",
  "results.compare_a_tps": "A : tok/s",
  "results.compare_b_tps": "B : tok/s",
  "results.compare_delta_tps": "Δ tok/s",
  "results.compare_a_ttft": "A : TTFT",
  "results.compare_b_ttft": "B : TTFT",
  "results.compare_delta_vram": "Δ VRAM",
  "results.trend_title": "Moyenne de tok/s par passage (comparaison dans le temps)",
  "results.col.run": "Passage",
  "results.compare_delta": "Δ",

  // --- Paramètres -----------------------------------------------------------
  "settings.language_title": "Langue de l'application",
  "settings.checks_title": "Vérifications et affichage",
  "settings.check_json": "Vérifier la validité du JSON",
  "settings.check_json_hint": "Dans la catégorie JSON, ajoute un verdict à côté de la mesure : la réponse s'analyse-t-elle comme du JSON ? Désactivé, la vérification n'est pas exécutée et la colonne disparaît des résultats et de l'export.",
  "settings.check_python": "Vérifier la syntaxe Python",
  "settings.check_python_hint": "Dans la catégorie Coding : la réponse s'analyse-t-elle comme du Python ? Le code n'est pas exécuté et cela ne signifie pas qu'il est correct, seulement qu'il n'est pas cassé. À désactiver si vous testez du code dans d'autres langages.",
  "settings.auto_scroll": "Défilement automatique de la réponse",
  "settings.auto_scroll_hint": "L'aperçu défile tout seul vers les derniers tokens. Remonter le met en pause jusqu'au retour en bas, et il s'arrête à la fin de l'exécution. Le même interrupteur est au-dessus de l'aperçu dans l'onglet Test.",
  "settings.language_hint":
    "L'anglais est la langue par défaut. Le changement s'applique tout de suite et est enregistré dans `settings.json`, il survit donc au redémarrage.",
  "settings.history_title": "Historique des passages",
  "settings.history_stats": "Passages enregistrés : {count} · {size}",
  "settings.history_hint":
    "L'historique est enregistré sous forme d'un fichier JSON par passage. Tu peux le copier avec le dossier de données.",
  "settings.filter": "Filtre",
  "settings.filter_all": "Tous",
  "settings.filter_older": "Plus anciens que",
  "settings.filter_interrupted": "Interrompus seulement",
  "settings.days.one": "{count} jour",
  "settings.days.many": "{count} de jours",
  "settings.days.other": "{count} jours",
  "settings.to_delete.one": "À supprimer : {count} passage · {size}",
  "settings.to_delete.many": "À supprimer : {count} de passages · {size}",
  "settings.to_delete.other": "À supprimer : {count} passages · {size}",
  "settings.nothing_matches": "Rien ne correspond au filtre.",
  "settings.delete_selected": "Supprimer la sélection",
  "settings.deleted.one": "{count} passage supprimé, {size} libérés.",
  "settings.deleted.many": "{count} de passages supprimés, {size} libérés.",
  "settings.deleted.other": "{count} passages supprimés, {size} libérés.",
  "settings.data_folder": "Dossier de données",
  "settings.open_folder": "Ouvrir le dossier",
  "settings.exports_title": "Fichiers d'export",
  "settings.exports_stats.one": "Le dossier {dir} contient {count} fichier ({size}).",
  "settings.exports_stats.many": "Le dossier {dir} contient {count} de fichiers ({size}).",
  "settings.exports_stats.other": "Le dossier {dir} contient {count} fichiers ({size}).",
  "settings.exports_hint":
    "Ce sont tes fichiers CSV/HTML, ils ont donc leur propre action de suppression : jamais avec l'historique.",
  "settings.delete_exports": "Supprimer les fichiers d'export",
  "settings.exports_deleted.one": "{count} fichier d'export supprimé, {size} libérés.",
  "settings.exports_deleted.many": "{count} de fichiers d'export supprimés, {size} libérés.",
  "settings.exports_deleted.other": "{count} fichiers d'export supprimés, {size} libérés.",
  "settings.prompts_title": "Prompts système par défaut",
  "settings.prompts_hint":
    "Utilisés quand un modèle n'a pas son propre prompt. Le défaut dépend du type de catégorie dans laquelle le modèle démarre : le réglage vaut donc par type, pas par modèle. Le texte intégré est en anglais à dessein : les petits modèles suivent plus sûrement une consigne en anglais, et les passages restent comparables quelle que soit la langue de l'interface. Écris le tien dans la langue que tu veux : c'est ta décision, pas un texte de l'application.",
  "settings.prompt_changed": "Modifié",
  "settings.prompt_builtin": "Intégré",
  "settings.prompt_restore": "Rétablir l'intégré",
  "settings.reset_title": "Rétablir les paramètres par défaut",
  "settings.reset_hint":
    "Supprime le fichier de paramètres de l'utilisateur et revient aux valeurs par défaut. Les modèles, les catégories, l'historique et les fichiers d'export restent intacts.",
  "settings.reset_action": "Rétablir les défauts",
  "settings.reset_done": "Paramètres par défaut rétablis.",
  "settings.reset_warning": "Cette action est irréversible.",
  "settings.scope_title": "Réglages de l'application, pas du modèle",
  "settings.scope_hint":
    "Langue, historique, exports et prompts par défaut. Les réglages de chaque modèle sont dans l'onglet « Modèles ».",

  // --- Katalog modeli z HuggingFace --------------------------------------
  "search.title": "Catalogue HuggingFace",
  "search.subtitle":
    "Dépôts GGUF qu'Ollama peut télécharger. Un champ vide parcourt le catalogue par popularité.",
  "search.placeholder": "Chercher des dépôts (ex. qwen2.5-coder)",
  "search.button": "Chercher",
  "search.refresh": "Actualiser",
  "search.filters": "Filtres",
  /* Plakietka przy grupie filtrów: skąd pochodzi filtr. */
  "search.origin_hf": "HF",
  "search.origin_ours": "nôtre",
  "search.open_hf": "Ouvrir sur HuggingFace",
  "search.badge_hf": "Données de l'API HuggingFace",
  "search.task": "Tâche",
  "search.task.text": "Texte",
  "search.task.vision": "Avec images",
  "search.task.all": "Tout",
  "search.task.text_tip": "Génération de texte : modèles pour le code et la conversation. La majorité.",
  "search.task.vision_tip":
    "Compréhension d'images (image-text-to-text). Ollama les exécute comme VLM.",
  "search.task.all_tip":
    "Sans filtre de tâche. Laisse aussi passer des modèles qu'Ollama n'exécute pas, p. ex. la reconnaissance vocale.",
  "search.size": "Taille du téléchargement",
  "search.size_any": "peu importe",
  "search.size_up_to": "jusqu'à {size}",
  "search.size_note": "Compare la plus petite variante du dépôt.",
  "search.fits_only": "Seulement ce qui tient sur ma carte",
  "search.fits_note": "Garde les modèles qui démarreront, même en partie sur le CPU.",
  "search.hide_owned": "Masquer les déjà téléchargés",
  "search.counts_note":
    "Les nombres et les filtres portent sur la partie chargée de la liste, pas sur tout le catalogue.",
  "search.installed": "téléchargé",
  "search.on_list": "dans la liste",
  "search.gated": "fermé",
  "search.gated_note":
    "Dépôt fermé : Ollama l'ouvre avec sa propre clé SSH, pas avec un jeton d'API. Il n'y a rien à coller ici.",
  "search.reading": "lecture des fichiers…",
  "search.detail_failed": "Liste des fichiers illisible : la ligne n'a pas de tailles.",
  "search.count_variants.one": "{count} variante",
  "search.count_variants.many": "{count} variantes",
  "search.count_variants.other": "{count} variantes",
  "search.col_variant": "Variante",
  "search.col_size": "Téléchargement",
  "search.col_memory": "Mémoire",
  "search.with_projector": "+ projecteur",
  "search.projector_tip": "Comprend le projecteur ({size}) qu'Ollama télécharge avec le modèle.",
  "search.split_skipped": "Découpées en parties, donc absentes de la liste : {list}",
  "search.groups_skipped": "Fichiers auxiliaires ignorés : {list}",
  "search.memory_note":
    "La taille est un minimum : la mémoire du contexte (KV) n'est pas comptée, car HF n'indique ni les couches ni les têtes KV.",
  "search.context": "contexte {value}",
  "search.arch": "architecture {name}",
  "search.no_variants":
    "Ce dépôt n'a pas de GGUF en un seul fichier : chaque fichier du modèle est découpé.",
  "search.pick_categories": "Catégories pour le modèle ajouté",
  "search.added": "Ajouté {tag} avec les catégories choisies.",
  "search.added_no_category": "Ajouté {tag}. Choisis ses catégories dans l'onglet Modèles.",
  "search.downloads": "Téléchargements sur HuggingFace",
  "search.likes": "J'aime sur HuggingFace",
  "search.expand": "Voir les variantes",
  "search.collapse": "Masquer les variantes",
  "search.more": "Voir plus",
  "search.loading": "Chargement…",
  "search.failed": "HuggingFace n'a pas répondu",
  "search.empty": "Rien trouvé",
  "search.empty_hint": "Vide le champ pour parcourir le catalogue, ou essaie un autre nom.",
  "search.search_all_tasks": "Chercher dans toutes les tâches",
  "search.footer":
    "Ces modèles, c'est Ollama qui les télécharge, avec l'étiquette de la ligne. Le téléchargement démarre dans l'onglet Modèles.",
};
