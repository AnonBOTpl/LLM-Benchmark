/**
 * Español interface text.
 *
 * Keys are neutral and identical in every language file (`en.ts`, `pl.ts`, `de.ts`,
 * `es.ts`), so a missing translation falls back to English rather than to Polish.
 * Placeholders use `{name}` and are filled by `t(key, { name })`.
 *
 * Never put Spanish text in a component: every user-facing string goes through
 * `t("area.thing")` and lives here. `npm run check:i18n` verifies that every file
 * carries exactly the same keys and the same placeholders.
 */
export const ES: Record<string, string> = {
  // --- shell / tabs ---------------------------------------------------------
  "nav.models": "Modelos",
  "nav.search": "Buscar modelos",
  "nav.categories": "Categorías",
  "nav.test": "Test",
  "nav.results": "Resultados",
  "nav.settings": "Ajustes",
  "app.subtitle": "Ollama · modelos LLM locales",
  "window.minimize": "Minimizar",
  "window.maximize": "Maximizar",
  "window.restore": "Restaurar",
  "app.loading_config": "Cargando la configuración…",
  "app.reading": "leyendo…",
  "gpu.nvml_unavailable": "NVML no disponible",

  // --- osłona na błędy (ErrorBoundary) --------------------------------------
  "error.title": "Esta sección dejó de funcionar",
  "error.window_title": "La ventana dejó de dibujarse",
  "error.hint": "Solo falló esta parte: el resto de la aplicación sigue funcionando.",
  "error.details": "Detalle técnico",
  "error.retry": "Reintentar",

  // --- etiquetas de clasificación -------------------------------------------
  "label.completed": "Completado",
  "label.refused": "Rechazado",
  "label.limited": "Completado con limitaciones/cambios",
  "label.completed.help": "El modelo hizo la tarea tal como se pedía.",
  "label.refused.help": "El modelo se negó a hacer la tarea.",
  "label.limited.help":
    "El modelo hizo la tarea, pero cambió su alcance, añadió reservas o se saltó parte de la petición.",

  // --- comunes --------------------------------------------------------------
  "common.cancel": "Cancelar",
  "common.save": "Guardar",
  "common.open": "Abrir",
  "common.close": "Cerrar",
  "common.retry": "reintentar",
  "common.prompt": "Prompt",
  "common.model": "Modelo",
  "common.category": "Categoría",
  "common.time": "Tiempo",
  "common.add": "Añadir",
  "common.set": "Establecer",
  "common.clear": "Borrar",
  "common.reset": "Restablecer",
  "common.confirm": "Confirmar",
  "common.default": "predeterminado",
  "common.auto": "auto",
  "common.no_limit": "sin límite",
  "common.badge_custom": "propios",
  "common.badge_settings": "ajustes",
  "common.not_downloaded": "sin descargar",
  // Liczba mnoga: formę wybiera język (`Intl.PluralRules`), patrz `lib/i18n.tsx`.
  "common.count_prompts.one": "{count} prompt",
  "common.count_prompts.many": "{count} de prompts",
  "common.count_prompts.other": "{count} prompts",

  // --- ClassifyModal --------------------------------------------------------
  "classify.title": "Clasificación manual de la respuesta",
  "classify.hint":
    "Lee la respuesta entera y elige una de las tres etiquetas. El test espera hasta que elijas.",
  "classify.response": "Respuesta del modelo",
  "classify.empty_response": "(respuesta vacía)",
  "classify.start_failed": "No se pudo iniciar",

  // --- ModelsTab: barra de estado de descarga -------------------------------
  "models.pull.manifest": "descargando el manifiesto",
  "models.pull.checksum": "verificando la suma de comprobación",
  "models.pull.writing": "escribiendo el manifiesto",
  "models.pull.removing_layers": "eliminando las capas que ya no se usan",
  "models.pull.done": "listo",
  "models.pull.layer": "capa {id}",

  // --- ModelsTab: avisos ----------------------------------------------------
  "models.msg.downloaded": "Modelo {model} descargado",
  "models.msg.download_failed": "La descarga de {model} ha fallado: {error}",
  "models.msg.loaded": "{tag} cargado en {duration}",
  "models.msg.gpu_share": "{gpu}% de la memoria del modelo en la GPU",
  "models.msg.load_failed": "No se pudo cargar {tag}: {error}",
  "models.msg.unloaded": "{tag} liberado de la memoria",
  "models.msg.unload_failed": "No se pudo liberar {tag}: {error}",
  "models.msg.unloaded_all": "Memoria liberada de todos los modelos cargados",
  "models.msg.deleted": "Modelo {tag} borrado del disco",
  "models.msg.delete_failed": "No se pudo borrar {tag}: {error}",
  "models.msg.enter_tag": "Escribe una etiqueta de modelo, p. ej. mistral:7b",
  "models.msg.already_on_list": "{tag} ya está en la lista",
  "models.msg.added": "{tag} añadido",

  // --- ModelsTab: lista modeli i panel wybranego modelu ---------------------
  "models.list.search": "Buscar modelos…",
  "models.list.no_match": "Ningún modelo coincide con «{query}».",
  "models.detail.memory_title": "Memoria (VRAM)",
  "models.detail.in_memory": "en memoria",
  "models.detail.not_in_memory": "sin cargar",
  "models.detail.vram_short": "{used} / {total} MB VRAM",

  // --- ModelsTab: tarjetas --------------------------------------------------
  "models.status.running": "funcionando · {version}",
  "models.status.offline": "sin conexión",
  "models.tile.vram_skipped": "las mediciones de VRAM se omitirán",
  "models.tile.probing_nvml": "comprobando NVML…",
  "models.installed": "Modelos instalados",
  "models.refresh_state": "Actualizar el estado",

  // --- ModelsTab: panel de memoria ------------------------------------------
  "models.memory.unload_all": "Liberar todo",
  "models.memory.hint_empty":
    "Ahora mismo no hay nada cargado. El primer prompt de cada modelo pagará el arranque en frío (en mediciones anteriores el TTFT bajó de ~6,7 s a ~80 ms tras cargar el modelo).",
  "models.memory.split_unknown": "reparto desconocido",
  "models.memory.split": "GPU {gpu}% / CPU {cpu}%",
  "models.memory.vram_of_total": "{vram} de {total}",
  "models.memory.context": "· contexto {context}",
  "models.memory.expires": "· se libera sobre las {time}",
  "models.memory.unloading": "Liberando…",
  "models.memory.unload": "Liberar",
  "models.memory.unload_tip": "Liberar la VRAM que ocupa este modelo",
  "models.memory.split_tip":
    "Cómo se reparte la memoria del modelo entre la GPU y la CPU (capas, no tiempo de cálculo)",

  // --- ModelsTab: añadir modelo ---------------------------------------------
  "models.add.title": "Añadir tu propio modelo",
  "models.add.hint":
    "Cualquier etiqueta de Ollama. Es la única forma de ampliar la lista: nada se elige automáticamente.",
  "models.add.placeholder": "p. ej. mistral:7b",
  "models.add.duplicate": "Esta etiqueta ya está en la lista.",
  "models.add.checking_size": "Consultando el tamaño en el registro de Ollama…",
  "models.add.size_to_download": "{size} por descargar",
  "models.add.suggested": "categoría sugerida: {name}",
  "models.add.certain_vision": "Seguro: Ollama indica la capacidad 'vision' para este modelo",
  "models.add.heuristic":
    "Heurística a partir del nombre: Ollama no publica la finalidad del modelo",
  "models.add.reports_vision": "Ollama indica soporte de imágenes para este modelo",
  "models.add.by_name": "según el nombre del modelo: Ollama no indica la finalidad",
  "models.add.auto_suffix": " · establecida automáticamente, puedes desmarcarla",

  // --- ModelsTab: filas de modelos ------------------------------------------
  "models.row.no_category": "Sin categoría",
  "models.row.empty_category": "No hay modelos en esta categoría.",
  "models.row.include": "Incluir en los tests",
  "models.row.assign_tip": "Asignar el modelo a una categoría",
  "models.row.suggest": "Sugerencia: {name}",
  "models.row.suggest_why":
    "Sugerencia según el nombre del modelo: Ollama no publica la finalidad",
  "models.row.vision_yes": "imágenes",
  "models.row.vision_no": "sin soporte de imágenes",
  "models.row.vision_warning":
    "Este modelo está asignado a la categoría de imágenes (VLM), pero Ollama no indica soporte de imágenes: un prompt con imagen fallará.",
  "models.row.vision_tip": "Ollama indica la capacidad 'vision': el modelo procesa imágenes",
  "models.row.downloaded": "descargado · {size}",
  "models.row.checking_size": "comprobando el tamaño…",
  "models.row.size_unknown": "tamaño desconocido",
  "models.row.loading": "Cargando en la VRAM…",
  "models.row.load": "Cargar",
  "models.row.load_tip":
    "Cargar el modelo en la VRAM de antemano para que el primer prompt no pague el arranque en frío",
  "models.row.downloading": "Descargando…",
  "models.row.download": "Descargar",
  "models.row.remove_tip": "Quitar el modelo (también del disco)",
  "models.row.remove": "Quitar de la lista",
  "models.row.remove_confirm": "¿Quitar {tag}?",
  "models.row.delete_keep": "Deja los archivos del modelo en el disco",
  "models.row.delete_keep_action": "Solo de la lista",
  "models.row.delete_disk_hint": "Borra los archivos del modelo a través de Ollama",
  "models.row.deleting": "Borrando…",
  "models.row.delete_from_disk": "Borrar del disco ({size})",
  "models.empty.title": "La lista de modelos está vacía",
  "models.empty.hint": "Añade arriba una etiqueta de Ollama para poder lanzar un test.",

  // --- CategoriesTab --------------------------------------------------------
  "categories.intro":
    "Las categorías y los prompts son totalmente editables: nada está fijado en el código. La casilla de cada prompt decide si entra en el test: un prompt desmarcado se queda en la lista con su texto, pero los modelos nunca lo ven. La categoría «Response classification» empieza a propósito sin prompts: sus resultados los valoras tú a mano después de leerlos, así que tú decides qué preguntas a los modelos.",
  "categories.enabled_prompts": "Prompts activados: {count} de {total}",
  "categories.enabled_tasks": "Tareas activadas: {count} de {total}",
  "categories.count_images.one": "{count} tarea con imagen",
  "categories.count_images.many": "{count} de tareas con imagen",
  "categories.count_images.other": "{count} tareas con imagen",
  "categories.uncheck_all": "Desmarcar todo",
  "categories.check_all": "Marcar todo",
  "categories.uncheck_all_tip": "Desmarcar todos los prompts de esta categoría",
  "categories.check_all_tip": "Marcar todos los prompts de esta categoría",
  "categories.add_image": "Añadir imagen + prompt",
  "categories.add_prompt": "Añadir prompt",
  "categories.classification_intro":
    "No hay prompts predeterminados. Tras cada respuesta el test se detiene y te muestra tres botones: ",
  "categories.long_context_note": "Ollama recorta la entrada a 4096 tokens de forma predeterminada y lo hace en silencio. Antes de medir esta categoría, ajusta num_ctx del modelo en la pestaña Modelos; si no, el modelo solo verá el principio.",
  "categories.classification_outro": ". Puedes cambiar la etiqueta más tarde en la pestaña «Resultados».",
  "categories.task_enabled_tip": "¿Debe entrar esta tarea en el test?",
  "categories.prompt_enabled_tip": "¿Debe entrar este prompt en el test?",
  "categories.image_label": "Imagen {index}",
  "categories.image_placeholder": "ruta del archivo, p. ej. C:\\imagenes\\test.png",
  "categories.choose_file": "Elegir…",
  "categories.prompt_text": "Texto del prompt",
  "categories.empty":
    "Esta categoría aún no tiene prompts: las categorías vacías se omiten en el test.",
  "categories.all_unchecked":
    "Todos los prompts de esta categoría están desmarcados, así que la categoría se omitirá en el test.",

  // --- sugerencias en los campos de prompt vacíos ---------------------------
  "hint.coding":
    "p. ej. Escribe una función en Python que invierta el orden de los caracteres del texto dado.",
  "hint.chat": "p. ej. Explica en tres frases qué es la fotosíntesis.",
  "hint.vlm": "p. ej. Describe lo que se ve en la imagen y enumera los objetos que reconozcas.",
  "hint.reasoning": "p. ej. Un tren sale a las 14:20 y recorre 63 km en 45 minutos. ¿A qué velocidad va?",
  "hint.json": "p. ej. Devuelve un objeto JSON con las tres ciudades más grandes de Polonia, cada una con nombre, población y voivodato.",
  "hint.long_context": "p. ej. Pega un artículo largo y pide un resumen en cinco puntos.",
  "hint.classification": "p. ej. Describe en una frase para qué sirve el bucle for en Python.",

  // --- ModelSettingsModal ---------------------------------------------------
  "settings.model.hint":
    "Los parámetros y el prompt de sistema solo afectan a este modelo y se guardan junto con los resultados de la ejecución: con el tiempo se verá con qué se obtuvieron.",
  "settings.model.context_supported": "el modelo admite un contexto de hasta {context} tokens",
  "settings.model.context_unknown":
    "no conocemos el contexto del modelo (sin descargar o Ollama no lo indica)",
  "settings.model.params_title": "Parámetros de generación",
  "settings.model.unsaved": "Cambios sin guardar",
  "settings.model.saved": "Ajustes de {tag} guardados",
  "settings.model.params_hint": "campo vacío = la decisión se deja a Ollama",
  "settings.model.insert_suggested": "Insertar los propuestos",
  "settings.model.insert_suggested_tip":
    "Insertar los parámetros propuestos para este tipo de categoría (son nuestras recomendaciones, no datos de Ollama)",
  "settings.model.ollama_default": "predeterminado de Ollama (4096)",
  "settings.model.help_temperature":
    "Creatividad: 0 se ciñe al patrón, más alto = más libre. Código 0,1-0,3, conversación 0,6-0,8.",
  "settings.model.help_top_p": "Umbral de probabilidad (0-1). Lo habitual es 0,9.",
  "settings.model.help_top_k": "Cuántos de los mejores tokens se tienen en cuenta. 0 = todos.",
  "settings.model.help_repeat_penalty":
    "Penalización por repetición: 1 = sin penalización, más alto = menos repeticiones.",
  "settings.model.help_num_ctx":
    "Tamaño del contexto. Ollama usa 4096 por defecto, y un contexto mayor ocupa más VRAM: mantén un mismo valor al comparar ejecuciones.",
  "settings.model.help_num_predict": "Límite de longitud de la respuesta en tokens. -1 = sin límite.",
  "settings.model.help_num_gpu":
    "Cuántas capas van a la tarjeta: 0 = solo CPU, un número = esas capas, vacío = decide Ollama. El resultado se ve en la columna GPU/CPU.",
  "settings.model.help_seed": "Aleatoriedad fija: los mismos resultados al repetir.",
  "settings.model.system_title": "Prompt de sistema",
  "settings.model.system_custom": "propio (si no, el predeterminado del tipo de categoría)",
  "settings.model.system_hint": "Se enviará al modelo en el campo system.",
  "settings.model.system_preview": "Vista previa del prompt predeterminado para el tipo «{kind}».",
  "settings.model.system_no_kind": "No hay categoría, así que no hay de dónde sacar un prompt predeterminado.",
  "settings.model.insert_default": "Insertar el predeterminado del tipo",
  "settings.model.no_system_support":
    "Este modelo no recibe el prompt de sistema: su plantilla (Modelfile) no tiene sitio para el campo system, así que Ollama lo descarta en silencio. Comprobado con `moondream`. Escribe la instrucción dentro del propio prompt.",

  // --- TestTab --------------------------------------------------------------
  "test.selection_title": "Selección de modelos y categorías",
  "test.selection_hint":
    "Vienen marcados los pares que se derivan de la asignación de cada modelo a su categoría. Puedes cambiarlo como quieras.",
  "test.stop": "Detener",
  "test.start": "Iniciar el test",
  "test.ollama_down": "Ollama no responde en {endpoint}: el test no se iniciará.",
  "test.no_models": "No hay modelos activados",
  "test.no_models_hint": "Activa modelos en la pestaña «Modelos» para construir la matriz de tests.",
  "test.count_prompts.one": "{count} prompt",
  "test.count_prompts.many": "{count} de prompts",
  "test.count_prompts.other": "{count} prompts",
  "test.count_images.one": "{count} imagen",
  "test.count_images.many": "{count} de imágenes",
  "test.count_images.other": "{count} imágenes",
  "test.count_total_suffix": " de {total}",
  "test.select_all": "Todos",
  "test.select_none": "Ninguno",
  "test.select_column_tip": "Clic: seleccionar todos los modelos de esta categoría",
  "test.select_row_tip": "Clic: seleccionar todas las categorías de este modelo",
  "test.no_prompts": "sin prompts",
  "test.custom_settings": "ajustes propios",
  "test.selected": "Ejecuciones seleccionadas: {count} · modelos: {models}",
  "test.not_downloaded_locked": "No descargado: descárgalo primero en la pestaña Modelos.",
  "test.categories_ready": "Categorías con prompts: {count} de {total}",
  "test.badge_system": "prompt de sistema propio",
  "test.badge_system_default": "prompt de sistema predeterminado del tipo de categoría",
  "test.badge_params_default": "parámetros predeterminados de Ollama",
  "test.estimate": "estimación",
  "test.cpu_only": "solo CPU",
  "test.vision_warning":
    "Ollama no indica soporte de imágenes para: {models}. Estos modelos están asignados a la categoría de imágenes, así que un prompt con imagen fallará: usa una variante multimodal (p. ej. `llava`, `moondream`, `qwen2.5vl`).",
  "test.pick_pair": "Selecciona al menos un par modelo × categoría.",
  "test.recent_title": "Últimas mediciones",
  "test.finished_prompts.one": "{count} prompt terminado",
  "test.finished_prompts.many": "{count} de prompts terminados",
  "test.finished_prompts.other": "{count} prompts terminados",
  "test.recent_empty": "Aquí aparecerán las métricas de los siguientes prompts.",

  // --- métricas (Test y Resultados) -----------------------------------------
  "metrics.ttft": "TTFT",
  "metrics.tps": "tok/s",
  "metrics.vram": "VRAM",
  "metrics.vram_peak": "Máx. VRAM",
  "metrics.gpu_cpu": "GPU/CPU",
  "metrics.gpu_cpu_wide": "GPU / CPU",
  "metrics.gpu_cpu_split": "{gpu} / {cpu}%",
  "metrics.gpu_cpu_tip":
    "El reparto de la memoria del modelo entre GPU y CPU (capas), no el tiempo de cálculo",
  "metrics.model_size_tip":
    "el modelo ocupa {size}: es el reparto de memoria (capas), no el tiempo de cálculo",
  "metrics.split_tip": "el reparto de la memoria del modelo entre GPU y CPU",
  "test.progress_title": "Progreso en vivo",
  "test.progress_line": "{model} · {category} · prompt {index} de {total}",
  "test.preparing": "Preparando el primer prompt…",
  "test.not_running": "El test no está en marcha",
  "test.prompt_show": "Mostrar el prompt completo",
  "test.prompt_hide": "Contraer el prompt",
  "test.prompt_chars": "caracteres: {chars}",
  "test.generating": "generando",
  "test.in_progress": "en curso",
  "test.progress": "Progreso",
  "test.vram_now": "VRAM ahora",
  "test.paused": "Test en pausa: valora la respuesta en la ventana de clasificación.",
  "test.streamed_response": "Respuesta en streaming",
  "test.autoscroll": "Desplazamiento automático",
  "test.autoscroll_hint": "Mantiene la vista previa en los tokens más recientes. Desplazarse hacia arriba lo pausa hasta volver abajo.",
  "test.no_data": "Sin datos: lanza un test.",
  "test.zero_tokens": "(0 tokens)",
  "test.metrics_title": "Cómo se calculan las métricas",
  "test.metrics_ttft":
    "TTFT: tiempo desde que se envía la petición hasta el primer token; en un arranque en frío incluye cargar el modelo en memoria.",
  "test.metrics_tps":
    "tok/s: los calcula Ollama como eval_count / eval_duration, y se miden con nuestro reloj cuando faltan esos datos.",
  "test.metrics_vram":
    "Máx. VRAM: el uso de memoria de GPU más alto que NVML registró mientras se generaba ese prompt.",
  "test.empty_response_explained":
    "El modelo terminó de generar sin un solo carácter de respuesta (0 tokens). Ollama informó de éxito, así que el prompt sí llegó: ocurre que una redacción concreta acaba de inmediato en el token de fin (así se comporta p. ej. moondream: la misma imagen la describe con normalidad con otra formulación). Ayuda cambiar la redacción o usar un prompt en inglés.",
  "test.unloaded_previous":
    "Se liberaron de la memoria los modelos del test anterior: {models}. Los modelos que participan en esta ejecución se quedan en la VRAM.",

  // --- aviso de VRAM --------------------------------------------------------
  "vram.title": "Estimación de VRAM",
  "vram.fit.on_gpu": "en la tarjeta",
  "vram.fit.on_gpu_tight": "en la tarjeta, sin margen",
  "vram.fit.partial_cpu": "en parte en la CPU",
  "vram.fit.no_fit": "no se ejecutará",
  "vram.fit.unknown_gpu": "GPU desconocida",
  "vram.verdict.partial_cpu": "La tarjeta es demasiado pequeña, así que parte del modelo se ejecutará en la CPU. Más lento, pero funcionará.",
  "vram.verdict.no_fit": "En este equipo no se ejecutará: hacen falta unos {needed} MB y hay {available} MB (tarjeta + memoria).",
  "vram.card_free": "Libre en la tarjeta ahora: {free} MB",
  "vram.ram": "Memoria: {free} MB libres de {total} MB · usable por los modelos: {usable} MB (reserva {reserve} MB)",
  "vram.ram_snapshot": "La memoria libre es una instantánea de este momento: otros programas la cambian de un segundo a otro.",
  "vram.swap_hint": "El sistema podría traer el modelo desde el disco, pero eso son gigabytes por segundo de intercambio y un modelo contando un carácter por minuto.",
  "vram.required": "Necesidad estimada: {required} MB de los {total} MB de la tarjeta",
  "vram.free_after": "Libre tras cargar: ~{free} MB",
  "vram.short": "Faltan unos {missing} MB de memoria de la tarjeta.",
  "vram.short_hint": "Reduce num_ctx o divide la ejecución en partes más pequeñas.",
  "vram.tight": "Cabe, pero sin margen: Ollama puede reservar más de lo que suponemos.",
  "vram.breakdown": "Pesos {weights} MB · caché KV {kv} MB · contexto {context}",
  "vram.confirmed": "tamaño confirmado por /api/ps",
  "vram.other": "fuera de Ollama: {other} MB",
  "vram.loaded_now": "ya en memoria: {loaded} MB",
  "vram.context": "contexto {context}",
  "vram.nvml_unavailable":
    "No se puede calcular la necesidad de VRAM porque NVML no responde: la medición de la memoria de la tarjeta no está disponible en esta máquina.",

  // --- códigos de aviso del backend (forecast.rs) ---------------------------
  "forecast.no_targets": "Todavía no hay ningún par modelo × categoría seleccionado.",
  "forecast.nvml_unavailable":
    "NVML no responde, así que no sabemos cuánta memoria tiene la tarjeta: no hay con qué comparar la estimación.",
  "forecast.estimate_explained":
    "Estimación: pesos + caché KV calculados a partir de los metadatos del modelo + un margen para el grafo de cómputo. Ollama puede reservar algo más.",
  "forecast.nothing_loaded":
    "Ninguno de estos modelos está en memoria ahora mismo, así que /api/ps no puede confirmar su tamaño.",
  "forecast.partial_offload":
    "num_gpu está definido, así que algunas capas pueden ejecutarse en la CPU: el uso real de VRAM puede ser menor que la estimación.",
  "forecast.cpu_only": "num_gpu = 0, así que este modelo se ejecuta en la CPU y no ocupa VRAM.",
  "forecast.not_downloaded":
    "Este modelo no está descargado, no conocemos ni sus pesos ni su arquitectura: queda fuera de la estimación.",
  "forecast.no_architecture_metadata":
    "Sin metadatos de arquitectura, la caché KV no se calculó: la estimación solo cubre los pesos.",
  "forecast.multimodal":
    "Modelo multimodal: el codificador de visión no siempre acaba en la VRAM, así que el uso real puede diferir.",

  // --- ResultsTab -----------------------------------------------------------
  "results.history": "Historial",
  "results.no_runs": "No hay ejecuciones guardadas.",
  "results.interrupted": "interrumpida",
  "results.delete_run": "Borrar la ejecución",
  "results.tps_short": "{count} tok/s",
  "results.no_selection": "Ninguna ejecución seleccionada",
  "results.no_selection_hint":
    "Lanza un test en la pestaña «Test»: sus resultados aparecerán aquí y se guardarán en local.",
  "results.run_title": "Resultados de la ejecución {id}",
  "results.export_saved": "{format} guardado: {path}",
  "results.open_failed": "No se pudo abrir el archivo: {error}",
  /* Skąd przyszedł model - plakietka przy nazwie w tabeli wyników. */
  "results.source_registry": "registro",
  "results.source_huggingface": "HF",
  "results.source_tip":
    "De dónde viene el modelo. El mismo modelo puede dar resultados distintos desde el registro y desde HuggingFace, porque la plantilla y el analizador vienen del repositorio.",
  "results.col.prompts": "Prompts",
  "results.col.tps_ollama": "tok/s (Ollama)",
  "results.col.tps_clock": "tok/s (reloj)",
  "results.col.avg_ttft": "TTFT med.",
  "results.col.empty": "Resp. vacías",
  "results.json_column": "JSON",
  "results.python_column": "Python",
  "results.python_tip": "Solo se comprueba si la respuesta se analiza como Python. Eso no significa que el código sea correcto ni que haga lo que se pidió. Una respuesta sin código tiene su propio estado. Nunca se ejecuta nada.",
  "results.python_ok": "sintaxis válida",
  "results.python_syntax_error": "error de sintaxis",
  "results.python_no_code": "sin código Python",
  "results.json_valid": "válido",
  "results.json_invalid": "no válido",
  "results.json_tip": "¿Se puede analizar la respuesta como JSON? Se comprueba sin forzar un esquema en Ollama, así que mide el modelo y no el entorno. Un bloque de código también cuenta.",
  "results.labels": "Etiquetas",
  "results.no_grades": "sin valoraciones",
  "results.errors.one": "{count} error",
  "results.errors.many": "{count} de errores",
  "results.errors.other": "{count} errores",
  "results.row_hint":
    "Haz clic en una fila para ver las respuestas completas y valorar la clasificación.",
  "results.system_field": "system: {prompt}",
  "results.system_none": "system: ninguno (ejecución anterior a los ajustes)",
  "results.tps_clock": "tok/s reloj",
  "results.empty_response_hint":
    "Respuesta vacía: Ollama informó de éxito, pero el modelo no generó ni un token. Los modelos VLM pequeños (p. ej. moondream) a veces se callan con un prompt en otro idioma: prueba en inglés.",
  "results.zero_tokens": "(0 tokens: sin texto de respuesta)",
  "results.grade": "Valoración:",
  "results.clear_grade": "borrar",
  "results.ungraded": "sin valorar",
  "results.compare_title": "Comparación del modelo A y B",
  "results.compare_hint":
    "Diferencias dentro de la ejecución actual y medias de tok/s en todo el historial guardado.",
  "results.compare_a": "— modelo A —",
  "results.compare_b": "— modelo B —",
  "results.compare_pick": "Elige dos modelos distintos.",
  "results.compare_a_tps": "A: tok/s",
  "results.compare_b_tps": "B: tok/s",
  "results.compare_delta_tps": "Δ tok/s",
  "results.compare_a_ttft": "A: TTFT",
  "results.compare_b_ttft": "B: TTFT",
  "results.compare_delta_vram": "Δ VRAM",
  "results.trend_title": "Media de tok/s por ejecución (comparación en el tiempo)",
  "results.col.run": "Ejecución",
  "results.compare_delta": "Δ",

  // --- Ajustes --------------------------------------------------------------
  "settings.language_title": "Idioma de la aplicación",
  "settings.checks_title": "Comprobaciones y vista",
  "settings.check_json": "Comprobar la validez del JSON",
  "settings.check_json_hint": "En la categoría JSON añade un veredicto junto a la medición: ¿la respuesta se analiza como JSON? Si está desactivado, la comprobación no se ejecuta y la columna desaparece de los resultados y de la exportación.",
  "settings.check_python": "Comprobar la sintaxis de Python",
  "settings.check_python_hint": "En la categoría Coding: ¿la respuesta se analiza como Python? No se ejecuta el código y esto no significa que sea correcto, solo que no está roto. Desactívalo si pruebas código en otros lenguajes.",
  "settings.auto_scroll": "Desplazar la respuesta automáticamente",
  "settings.auto_scroll_hint": "La vista previa se desplaza sola hasta los tokens más recientes. Desplazarse hacia arriba lo pausa hasta volver abajo, y se detiene al terminar la ejecución. El mismo interruptor está encima de la vista previa en la pestaña Test.",
  "settings.language_hint":
    "El inglés es el idioma predeterminado. El cambio se aplica al momento y se guarda en `settings.json`, así que sobrevive al reinicio.",
  "settings.history_title": "Historial de ejecuciones",
  "settings.history_stats": "Ejecuciones guardadas: {count} · {size}",
  "settings.history_hint":
    "El historial se guarda como un archivo JSON por ejecución. Puedes copiarlo junto con la carpeta de datos.",
  "settings.filter": "Filtro",
  "settings.filter_all": "Todas",
  "settings.filter_older": "Más antiguas que",
  "settings.filter_interrupted": "Solo interrumpidas",
  "settings.days.one": "{count} día",
  "settings.days.many": "{count} de días",
  "settings.days.other": "{count} días",
  "settings.to_delete.one": "Se borrará: {count} ejecución · {size}",
  "settings.to_delete.many": "Se borrarán: {count} de ejecuciones · {size}",
  "settings.to_delete.other": "Se borrarán: {count} ejecuciones · {size}",
  "settings.nothing_matches": "Nada coincide con el filtro.",
  "settings.delete_selected": "Borrar las seleccionadas",
  "settings.deleted.one": "{count} ejecución borrada, {size} liberados.",
  "settings.deleted.many": "{count} de ejecuciones borradas, {size} liberados.",
  "settings.deleted.other": "{count} ejecuciones borradas, {size} liberados.",
  "settings.data_folder": "Carpeta de datos",
  "settings.open_folder": "Abrir la carpeta",
  "settings.exports_title": "Archivos de exportación",
  "settings.exports_stats.one": "En la carpeta {dir} hay {count} archivo ({size}).",
  "settings.exports_stats.many": "En la carpeta {dir} hay {count} de archivos ({size}).",
  "settings.exports_stats.other": "En la carpeta {dir} hay {count} archivos ({size}).",
  "settings.exports_hint":
    "Son tus archivos CSV/HTML, así que se borran con una acción aparte: nunca junto con el historial.",
  "settings.delete_exports": "Borrar los archivos de exportación",
  "settings.exports_deleted.one": "{count} archivo de exportación borrado, {size} liberados.",
  "settings.exports_deleted.many": "{count} de archivos de exportación borrados, {size} liberados.",
  "settings.exports_deleted.other": "{count} archivos de exportación borrados, {size} liberados.",
  "settings.prompts_title": "Prompts de sistema predeterminados",
  "settings.prompts_hint":
    "Se usan cuando un modelo no tiene prompt propio. El predeterminado depende del tipo de categoría en la que arranca el modelo, así que el ajuste va por tipo, no por modelo. El texto integrado está en inglés a propósito: los modelos pequeños siguen mejor las instrucciones en inglés y así las ejecuciones siguen siendo comparables sea cual sea el idioma de la interfaz. Escribe el tuyo en el idioma que quieras: es tu decisión, no texto de la aplicación.",
  "settings.prompt_changed": "Modificado",
  "settings.prompt_builtin": "Integrado",
  "settings.prompt_restore": "Restaurar el integrado",
  "settings.reset_title": "Restaurar los ajustes predeterminados",
  "settings.reset_hint":
    "Borra el archivo de ajustes del usuario y vuelve a los valores predeterminados. Los modelos, las categorías, el historial y los archivos de exportación no se tocan.",
  "settings.reset_action": "Restaurar predeterminados",
  "settings.reset_done": "Ajustes predeterminados restaurados.",
  "settings.reset_warning": "Esta acción no se puede deshacer.",
  "settings.scope_title": "Ajustes de la aplicación, no del modelo",
  "settings.scope_hint":
    "Idioma, historial, exportaciones y prompts predeterminados. Los ajustes de cada modelo están en la pestaña «Modelos».",

  // --- Katalog modeli z HuggingFace --------------------------------------
  "search.title": "Catálogo de HuggingFace",
  "search.subtitle":
    "Repositorios GGUF que Ollama puede descargar. Un campo vacío recorre el catálogo por popularidad.",
  "search.placeholder": "Buscar repositorios (p. ej. qwen2.5-coder)",
  "search.button": "Buscar",
  "search.refresh": "Actualizar",
  "search.filters": "Filtros",
  /* Plakietka przy grupie filtrów: skąd pochodzi filtr. */
  "search.origin_hf": "HF",
  "search.origin_ours": "nuestro",
  "search.open_hf": "Abrir en HuggingFace",
  "search.badge_hf": "Datos de la API de HuggingFace",
  "search.task": "Tarea",
  "search.task.text": "Texto",
  "search.task.vision": "Con imágenes",
  "search.task.all": "Todo",
  "search.task.text_tip": "Generación de texto: modelos para código y conversación. La mayoría.",
  "search.task.vision_tip":
    "Comprensión de imágenes (image-text-to-text). Ollama los ejecuta como VLM.",
  "search.task.all_tip":
    "Sin filtro de tarea. También deja pasar modelos que Ollama no ejecuta, p. ej. reconocimiento de voz.",
  "search.size": "Tamaño de descarga",
  "search.size_any": "cualquiera",
  "search.size_up_to": "hasta {size}",
  "search.size_note": "Compara la variante más pequeña del repositorio.",
  "search.fits_only": "Solo lo que cabe en mi tarjeta",
  "search.fits_note": "Deja los modelos que arrancarán, aunque sea en parte en la CPU.",
  "search.hide_owned": "Ocultar los ya descargados",
  "search.counts_note":
    "Las cifras y los filtros cubren la parte cargada de la lista, no todo el catálogo.",
  "search.installed": "descargado",
  "search.on_list": "en la lista",
  "search.gated": "cerrado",
  "search.gated_note":
    "Repositorio cerrado: Ollama lo abre con su propia clave SSH, no con un token de API. Aquí no hay nada que pegar.",
  "search.reading": "leyendo archivos…",
  "search.detail_failed": "No se pudo leer la lista de archivos: la fila no tiene tamaños.",
  "search.count_variants.one": "{count} variante",
  "search.count_variants.many": "{count} variantes",
  "search.count_variants.other": "{count} variantes",
  "search.col_variant": "Variante",
  "search.col_size": "Descarga",
  "search.col_memory": "Memoria",
  "search.with_projector": "+ proyector",
  "search.projector_tip": "Incluye el proyector ({size}) que Ollama descarga con el modelo.",
  "search.split_skipped": "Divididas en partes, por eso no están en la lista: {list}",
  "search.groups_skipped": "Archivos auxiliares omitidos: {list}",
  "search.memory_note":
    "El tamaño es un mínimo: no incluye la memoria del contexto (KV), porque HF no indica capas ni cabezas KV.",
  "search.context": "contexto {value}",
  "search.arch": "arquitectura {name}",
  "search.no_variants":
    "Este repositorio no tiene GGUF en un solo archivo: cada archivo del modelo está dividido en partes.",
  "search.pick_categories": "Categorías para el modelo añadido",
  "search.added": "Añadido {tag} con las categorías elegidas.",
  "search.added_no_category": "Añadido {tag}. Elige sus categorías en la pestaña Modelos.",
  "search.downloads": "Descargas en HuggingFace",
  "search.likes": "Me gusta en HuggingFace",
  "search.expand": "Ver variantes",
  "search.collapse": "Ocultar variantes",
  "search.more": "Ver más",
  "search.loading": "Cargando…",
  "search.failed": "HuggingFace no respondió",
  "search.empty": "No se encontró nada",
  "search.empty_hint": "Vacía el campo para recorrer el catálogo o prueba otro nombre.",
  "search.search_all_tasks": "Buscar en todas las tareas",
  "search.footer":
    "Estos modelos los descarga Ollama, con la etiqueta de la fila. La descarga se inicia en la pestaña Modelos.",
};
