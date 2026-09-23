//! CSV / HTML report generation for a finished run.

use crate::messages::{self, Lang};
use crate::store::{model_source, BenchmarkRun};

/// Trzy etykiety klasyfikacji w postaci kodów - jedynej, jaką znamy na pewno.
const LABEL_CODES: [&str; 3] = ["label.completed", "label.refused", "label.limited"];

/// Rozpoznaje, którą z trzech etykiet ktoś zapisał, i zwraca jej **kod**.
///
/// Zapisana wartość występuje w trzech postaciach i każdą rozpoznajemy: obecny kod
/// (`label.completed`, tak zapisuje dzisiejszy interfejs), polski tekst z przebiegów
/// starszych wersji (`Wykonał`) oraz angielski tekst. Porównanie idzie z katalogiem,
/// więc brzmienie etykiety istnieje tylko w plikach językowych.
///
/// `None` znaczy „nie znam tego zapisu” - wtedy wołający zostawia wartość taką,
/// jaka jest. Lepiej pokazać ją w raporcie, niż ją zgubić.
fn label_code(label: &str) -> Option<&'static str> {
    LABEL_CODES.into_iter().find(|code| {
        label == *code
            || messages::text(Lang::Pl, code, &[]) == label
            || messages::text(Lang::En, code, &[]) == label
    })
}

/// Etykieta dla człowieka - HTML. Przetłumaczona na język raportu.
fn localized_label(label: &str, language: Lang) -> String {
    match label_code(label) {
        Some(code) => messages::text(language, code, &[]),
        None => label.to_string(),
    }
}

/// Etykieta dla danych - CSV. Zawsze **kod**, niezależnie od języka interfejsu,
/// ze starym zapisem znormalizowanym do tego samego kodu.
///
/// Po co: dwa pliki z tego samego przebiegu, zrobione przy innym języku interfejsu,
/// muszą być identyczne - inaczej porównanie przebiegów w czasie zależy od tego,
/// w jakim języku ktoś miał wtedy aplikację. Tak samo idą już `kind`,
/// `model_source` i `python_verdict`.
fn label_for_csv(label: &str) -> String {
    match label_code(label) {
        Some(code) => code.to_string(),
        None => label.to_string(),
    }
}

fn csv_field(value: &str) -> String {
    let cleaned = value.replace(['\r', '\n'], " ");
    format!("\"{}\"", cleaned.replace('"', "\"\""))
}

fn num(value: Option<f64>) -> String {
    value.map(|v| format!("{v:.2}")).unwrap_or_default()
}

fn opt<T: ToString>(value: Option<T>) -> String {
    value.map(|v| v.to_string()).unwrap_or_default()
}

/// "GPU 100% / CPU 0%" - podział pamięci modelu między kartę i procesor.
fn gpu_split(percent: Option<f64>) -> String {
    match percent {
        Some(value) => format!("GPU {value:.0}% / CPU {:.0}%", 100.0 - value),
        None => "—".to_string(),
    }
}

pub fn to_csv(run: &BenchmarkRun) -> String {
    let mut out = String::new();
    out.push('\u{feff}'); // BOM so Excel reads UTF-8 correctly
    out.push_str(
        "run_id,started_at,model,model_source,category,kind,prompt_index,prompt,image_path,response,\
         ttft_ms,tokens_per_sec,measured_tokens_per_sec,eval_count,total_ms,vram_peak_mb,label,error,\
         json_valid,python_verdict,model_size_mb,gpu_offload_percent,system_prompt,temperature,num_ctx,num_predict,num_gpu\n",
    );

    for model_run in &run.models {
        for (index, result) in model_run.results.iter().enumerate() {
            let row = [
                csv_field(&run.id),
                csv_field(&run.started_at),
                csv_field(&model_run.model),
                // Kod, nie tekst - tak samo jak `kind` i `label`: eksport jest
                // danymi, a tłumaczenie należy do tego, kto go czyta.
                csv_field(model_run.source.as_deref().unwrap_or_else(|| model_source(&model_run.model))),
                csv_field(&model_run.category_name),
                csv_field(&model_run.kind),
                index.to_string(),
                csv_field(&result.prompt),
                csv_field(result.image_path.as_deref().unwrap_or("")),
                csv_field(&result.response),
                num(result.ttft_ms),
                num(result.tokens_per_sec),
                num(result.measured_tokens_per_sec),
                result
                    .eval_count
                    .map(|v| v.to_string())
                    .unwrap_or_default(),
                num(Some(result.total_ms)),
                result
                    .vram_peak_mb
                    .map(|v| v.to_string())
                    .unwrap_or_default(),
                // Kod etykiety, nie tekst - powód w `label_for_csv`.
                csv_field(
                    &result
                        .label
                        .as_deref()
                        .map(label_for_csv)
                        .unwrap_or_default(),
                ),
                csv_field(result.error.as_deref().unwrap_or("")),
                // Puste dla wszystkich kategorii poza `json` i dla starszych
                // przebiegów - brak informacji to nie to samo, co „false".
                opt(result.json_valid),
                // Kod werdyktu (`ok` | `syntax_error` | `no_code`), jak `kind`
                // i `label`: eksport jest danymi, tłumaczenie należy do czytającego.
                // Puste, gdy sprawdzenie było wyłączone albo to inna kategoria.
                csv_field(result.python_verdict.as_deref().unwrap_or("")),
                opt(result.model_size_mb),
                num(result.gpu_offload_percent),
                csv_field(model_run.system_prompt.as_deref().unwrap_or("")),
                num(model_run.options.temperature),
                opt(model_run.options.num_ctx),
                opt(model_run.options.num_predict),
                opt(model_run.options.num_gpu),
            ];
            debug_assert_eq!(row.len(), csv_header_fields());
            out.push_str(&row.join(","));
            out.push('\n');
        }
    }

    out
}

/// Liczba kolumn w nagłówku CSV - pilnowana `debug_assert`em, żeby dodanie
/// pola do wyniku nie rozjechało kolumn z danymi (częsty cichy błąd).
fn csv_header_fields() -> usize {
    27
}

/// Plakietka ze źródłem modelu w nagłówku sekcji raportu HTML.
///
/// Po co w raporcie: ten sam model z rejestru i z `hf.co` może wypaść inaczej
/// (szablon i parser przychodzą wtedy z repozytorium na HF), więc dwa wyniki
/// bez tej informacji wyglądają jak rozrzut pomiaru, a nie jak dwa modele.
///
/// Przebiegi sprzed tej zmiany mają puste `source`, więc źródło liczymy wtedy
/// z tagu - tag `hf.co/...` mówi to samo i żaden stary raport nie traci treści.
fn source_badge(model_run: &crate::store::ModelRun) -> String {
    let source = model_run
        .source
        .as_deref()
        .unwrap_or_else(|| model_source(&model_run.model));
    let (code, class) = match source {
        "huggingface" => ("export.source_huggingface", "src hf"),
        _ => ("export.source_registry", "src"),
    };
    format!(
        "<span class=\"{class}\" title=\"{tip}\">{label}</span>",
        tip = esc(&messages::msg("export.source_tip", &[])),
        label = esc(&messages::msg(code, &[])),
    )
}

fn esc(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn fmt_num(value: Option<f64>, digits: usize, suffix: &str) -> String {
    match value {
        Some(v) => format!("{v:.digits$}{suffix}"),
        None => "—".to_string(),
    }
}

/// Linia z ustawieniami, którymi uzyskano wyniki - bez niej raport po czasie
/// nie mówi, czym właściwie testowano.
fn settings_line(model_run: &crate::store::ModelRun) -> String {
    let mut parts: Vec<String> = Vec::new();
    if let Some(system) = model_run
        .system_prompt
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        parts.push(format!("<strong>system:</strong> {}", esc(system)));
    }
    let options = &model_run.options;
    let mut numbers: Vec<String> = Vec::new();
    if let Some(v) = options.temperature {
        numbers.push(format!("temperature {v}"));
    }
    if let Some(v) = options.top_p {
        numbers.push(format!("top_p {v}"));
    }
    if let Some(v) = options.top_k {
        numbers.push(format!("top_k {v}"));
    }
    if let Some(v) = options.repeat_penalty {
        numbers.push(format!("repeat_penalty {v}"));
    }
    if let Some(v) = options.num_ctx {
        numbers.push(format!("num_ctx {v}"));
    }
    if let Some(v) = options.num_predict {
        numbers.push(format!("num_predict {v}"));
    }
    if let Some(v) = options.seed {
        numbers.push(format!("seed {v}"));
    }
    if let Some(v) = options.num_gpu {
        numbers.push(format!("num_gpu {v}"));
    }
    if !numbers.is_empty() {
        parts.push(numbers.join(" · "));
    }

    if parts.is_empty() {
        return String::new();
    }
    format!("<div class=\"settings\">{}</div>", parts.join(" · "))
}

pub fn to_html(run: &BenchmarkRun) -> String {
    let mut body = String::new();

    // Nagłówki tabeli: przez katalog idą te, które są **tekstem dla człowieka**.
    // Identyfikatory techniczne (`#`, `Prompt`, `TTFT`, `tok/s`, `VRAM peak`,
    // `GPU/CPU`, `JSON`, `Python`) zostają takie same we wszystkich językach - dokładnie
    // tak, jak w interfejsie aplikacji, gdzie te etykiety też są niezmienne.
    // Wcześniej stały tu polskie literały („Odpowiedź”, „Etykieta”, „tok/s (wall)”),
    // więc angielski czy niemiecki użytkownik dostawał pół na pół dokument.
    let th = |code: &str| esc(&messages::msg(code, &[]));
    let head = format!(
        "<thead><tr><th>#</th><th>Prompt</th><th>{answer}</th><th>TTFT</th><th>tok/s</th>\
         <th>{tps_wall}</th><th>VRAM peak</th><th>GPU/CPU</th><th>{label}</th><th>JSON</th><th>Python</th></tr></thead><tbody>",
        answer = th("export.th_answer"),
        tps_wall = th("export.th_tps_wall"),
        label = th("export.th_label"),
    );

    for model_run in &run.models {
        body.push_str(&format!(
            "<section><h2>{model} <span class=\"cat\">{cat}</span>{source}</h2>{settings}<table>{head}",
            model = esc(&model_run.model),
            cat = esc(&model_run.category_name),
            source = source_badge(model_run),
            settings = settings_line(model_run),
            head = head,
        ));

        for (index, result) in model_run.results.iter().enumerate() {
            let image = result
                .image_path
                .as_deref()
                .map(|p| {
                    let label = crate::messages::msg("export.html_image", &[("value", p)]);
                    format!("<div class=\"img\">{}</div>", esc(&label))
                })
                .unwrap_or_default();
            let error = result
                .error
                .as_deref()
                .map(|e| {
                    let label = crate::messages::msg("export.html_error", &[("value", e)]);
                    format!("<div class=\"err\">{}</div>", esc(&label))
                })
                .unwrap_or_default();
            let label = result
                .label
                .as_deref()
                .map(|l| {
                    let text = localized_label(l, messages::language());
                    format!("<span class=\"label\">{}</span>", esc(&text))
                })
                .unwrap_or_default();
            // Werdykt walidatora JSON - tylko dla kategorii `json`, w tym samym
            // języku co reszta raportu (dlatego przez `messages`, nie literałem).
            let json = result
                .json_valid
                .map(|valid| {
                    let code = if valid {
                        "export.json_valid"
                    } else {
                        "export.json_invalid"
                    };
                    format!("<span class=\"label\">{}</span>", esc(&messages::msg(code, &[])))
                })
                .unwrap_or_default();
            // Werdykt składni Pythona - kod zapisany w wyniku tłumaczymy przez
            // katalog, tak samo jak etykiety klasyfikacji.
            let python = result
                .python_verdict
                .as_deref()
                .map(|verdict| {
                    let code = match verdict {
                        crate::python_check::OK => "export.python_ok",
                        crate::python_check::SYNTAX_ERROR => "export.python_syntax_error",
                        _ => "export.python_no_code",
                    };
                    format!("<span class=\"label\">{}</span>", esc(&messages::msg(code, &[])))
                })
                .unwrap_or_default();

            body.push_str(&format!(
                "<tr><td>{index}</td><td class=\"prompt\">{prompt}{image}{error}</td>\
                 <td class=\"resp\">{response}</td><td>{ttft}</td><td>{tps}</td>\
                 <td>{mtps}</td><td>{vram}</td><td>{gpu}</td><td>{label}</td><td>{json}</td>\
                 <td>{python}</td></tr>",
                index = index + 1,
                prompt = esc(&result.prompt),
                image = image,
                error = error,
                response = esc(&result.response),
                ttft = fmt_num(result.ttft_ms, 0, " ms"),
                tps = fmt_num(result.tokens_per_sec.or(result.measured_tokens_per_sec), 2, ""),
                mtps = fmt_num(result.measured_tokens_per_sec, 2, ""),
                vram = match result.vram_peak_mb {
                    Some(v) => format!("{v} MB"),
                    None => "—".to_string(),
                },
                gpu = gpu_split(result.gpu_offload_percent),
                label = label,
                json = json,
                python = python,
            ));
        }
        body.push_str("</tbody></table></section>");
    }

    // Linia opisu: jedno zdanie z trzema wartościami, żeby dało się je przetłumaczyć
    // w całości (w niektórych językach kolejność części jest inna).
    let seconds = format!("{:.1}", run.duration_ms / 1000.0);
    let meta = messages::msg(
        "export.meta_run",
        &[
            ("id", &run.id),
            ("started", &run.started_at),
            ("seconds", &seconds),
        ],
    );
    let cancelled = if run.cancelled {
        format!(" · {}", messages::msg("export.meta_cancelled", &[]))
    } else {
        String::new()
    };

    format!(
        r#"<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8" />
<title>AI Benchmark — {title}</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 0; padding: 32px; background: #0d1220; color: #e6ecf7;
         font-family: "Segoe UI", system-ui, sans-serif; }}
  h1 {{ margin: 0 0 4px; font-size: 22px; }}
  .meta {{ color: #8fa1c0; font-size: 13px; margin-bottom: 28px; }}
  section {{ margin-bottom: 40px; }}
  h2 {{ font-size: 16px; margin: 0 0 10px; display: flex; gap: 10px; align-items: baseline; }}
  .cat {{ color: #22d3ee; font-size: 12px; font-weight: 500; }}
  .src {{ color: #8fa1c0; font-size: 11px; border: 1px solid #2b3852; border-radius: 999px;
         padding: 1px 7px; }}
  .src.hf {{ color: #f0b46b; border-color: #6b4c22; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12.5px;
           background: #121828; border-radius: 10px; overflow: hidden; }}
  th {{ text-align: left; padding: 10px; background: #1a2237; color: #9fb2d1;
        font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }}
  td {{ padding: 10px; border-top: 1px solid #1e273d; vertical-align: top; }}
  td.resp {{ white-space: pre-wrap; max-width: 460px; color: #cfe0f5; }}
  td.prompt {{ max-width: 260px; }}
  .img, .err {{ font-size: 11px; color: #8fa1c0; margin-top: 4px; }}
  .err {{ color: #f87171; }}
  .label {{ display: inline-block; padding: 3px 8px; border-radius: 999px;
            background: #1d3a4d; color: #7fe3f5; font-size: 11px; }}
  .settings {{ margin: -4px 0 10px; color: #8fa1c0; font-size: 11.5px; }}
  .settings strong {{ color: #9fb2d1; }}
</style>
</head>
<body>
  <h1>AI Benchmark</h1>
  <div class="meta">{meta}{cancelled}{gpu}</div>
  {body}
</body>
</html>
"#,
        lang = messages::language().code(),
        title = esc(&run.id),
        meta = esc(&meta),
        cancelled = cancelled,
        gpu = run
            .gpu
            .as_deref()
            .map(|g| format!(" · GPU: {}", esc(g)))
            .unwrap_or_default(),
        body = body,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::{BenchmarkRun, ModelRun, PromptResult};

    fn sample_run() -> BenchmarkRun {
        BenchmarkRun {
            id: "20260913-213000.123".into(),
            started_at: "2026-09-13T21:30:00+02:00".into(),
            finished_at: "2026-09-13T21:31:00+02:00".into(),
            duration_ms: 60_000.0,
            cancelled: false,
            gpu: Some("NVIDIA GeForce GTX 1060 6GB".into()),
            models: vec![
                ModelRun {
                    model: "qwen2.5-coder:3b".into(),
                    category_id: "coding".into(),
                    category_name: "Kodowanie".into(),
                    kind: "coding".into(),
                    source: Some("registry".into()),
                    system_prompt: Some("Jesteś asystentem programisty.".into()),
                    options: crate::store::ModelOptions {
                        temperature: Some(0.15),
                        num_ctx: Some(8192),
                        ..Default::default()
                    },
                    results: vec![PromptResult {
                        prompt: "Napisz \"hello\", proszę\nw jednej linii".into(),
                        response: "def f():\n    return 1 < 2".into(),
                        ttft_ms: Some(53.4),
                        eval_count: Some(133),
                        eval_duration_ns: Some(3_542_000_000),
                        tokens_per_sec: Some(37.54),
                        measured_tokens_per_sec: Some(37.1),
                        total_ms: 3597.0,
                        load_ms: Some(3.0),
                        vram_peak_mb: Some(3038),
                        model_size_mb: Some(2148),
                        gpu_offload_percent: Some(100.0),
                        ..Default::default()
                    }],
                },
                ModelRun {
                    model: "hf.co/ggml-org/SmolVLM2-256M-Video-Instruct-GGUF:Q4_K_M".into(),
                    category_id: "classification".into(),
                    category_name: "Klasyfikacja odpowiedzi".into(),
                    kind: "classification".into(),
                    source: Some("huggingface".into()),
                    results: vec![PromptResult {
                        prompt: "Czy potrafisz to zrobić?".into(),
                        response: "Nie mogę.".into(),
                        label: Some("Odmówił".into()),
                        total_ms: 1200.0,
                        gpu_offload_percent: Some(62.5),
                        ..Default::default()
                    }],
                    ..Default::default()
                },
            ],
        }
    }

    /// Liczy pola CSV z pominięciem przecinków w cudzysłowach ("a, b").
    fn field_count(line: &str) -> usize {
        let mut count = 1;
        let mut in_quotes = false;
        let mut chars = line.chars().peekable();
        while let Some(c) = chars.next() {
            match c {
                '"' if in_quotes && chars.peek() == Some(&'"') => {
                    chars.next();
                }
                '"' => in_quotes = !in_quotes,
                ',' if !in_quotes => count += 1,
                _ => {}
            }
        }
        count
    }

    #[test]
    fn csv_has_bom_header_and_one_row_per_prompt() {
        let csv = to_csv(&sample_run());
        assert!(csv.starts_with('\u{feff}'));

        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 3, "nagłówek + 2 prompty");
        assert!(lines[0].contains("run_id,started_at,model,model_source,category"));
        assert!(lines[1].contains("qwen2.5-coder:3b"));
        assert!(lines[1].contains("registry"), "źródło modelu z rejestru");
        assert!(lines[2].contains("huggingface"), "źródło modelu z HF");
        // Etykieta w CSV idzie **kodem**, a nie tekstem, więc plik nie zależy od
        // języka interfejsu - polską wartość pokrywa
        // `label_is_translated_in_html_and_kept_as_a_code_in_csv`.
        assert!(lines[2].contains("label.refused"));
    }

    /// Etykiety zapisane przez starsze wersje (polski tekst) i obecne (kod) są
    /// tłumaczone na język raportu.
    #[test]
    fn label_is_localized_for_both_languages() {
        assert_eq!(localized_label("Wykonał", Lang::En), "Completed");
        assert_eq!(localized_label("Wykonał", Lang::Pl), "Wykonał");
        assert_eq!(localized_label("Odmówił", Lang::En), "Refused");
        assert_eq!(
            localized_label("Wykonał ale ograniczył/zmienił", Lang::En),
            "Completed with limits/changes"
        );
        // Nieznana wartość wraca bez zmian, zamiast zniknąć z raportu.
        assert_eq!(localized_label("coś nowego", Lang::En), "coś nowego");
    }

    /// Ten sam zapis idzie dwiema drogami: do HTML przetłumaczony, do CSV jako kod.
    /// Stary polski tekst normalizuje się do tego samego kodu, więc pliki sprzed
    /// zmiany i po niej da się zestawić w jednej kolumnie.
    #[test]
    fn label_is_translated_in_html_and_kept_as_a_code_in_csv() {
        for code in LABEL_CODES {
            assert_eq!(localized_label(code, Lang::En), messages::text(Lang::En, code, &[]));
            assert_eq!(localized_label(code, Lang::Pl), messages::text(Lang::Pl, code, &[]));
            assert!(
                !localized_label(code, Lang::En).contains("label."),
                "do HTML kod nie moze trafic jako kod: {code}"
            );
            assert_eq!(label_for_csv(code), code);
        }

        // Trzy zapisy tej samej etykiety dają w CSV jedną wartość.
        assert_eq!(label_for_csv("Wykonał"), "label.completed");
        assert_eq!(label_for_csv("Completed"), "label.completed");
        // Nieznana wartość nie ginie - w CSV zostaje taka, jaka jest.
        assert_eq!(label_for_csv("coś nowego"), "coś nowego");
    }

    /// Skąd model - w CSV kodem, w HTML plakietką z wytłumaczeniem.
    #[test]
    fn export_carries_the_model_source() {
        let csv = to_csv(&sample_run());
        assert!(csv.contains("model_source"));

        let html = to_html(&sample_run());
        let registry = messages::text(Lang::En, "export.source_registry", &[]);
        let huggingface = messages::text(Lang::En, "export.source_huggingface", &[]);
        assert!(html.contains(&registry), "plakietka rejestru w HTML");
        assert!(html.contains(&huggingface), "plakietka HF w HTML");
        // Wytłumaczenie jest w podpowiedzi, żeby nagłówek został krótki.
        assert!(html.contains(&messages::text(Lang::En, "export.source_tip", &[])));
        // Model z HF jest wyróżniony kolorem - to ten, który może wypaść inaczej.
        assert!(html.contains("class=\"src hf\""));
        assert!(html.contains("class=\"src\""));
    }

    /// Starszy przebieg nie ma pola `source`, więc źródło musi wyjść z tagu -
    /// inaczej raport z historii zgubiłby informację.
    #[test]
    fn old_runs_get_the_source_from_the_tag() {
        let mut run = sample_run();
        for model_run in &mut run.models {
            model_run.source = None;
        }
        let csv = to_csv(&run);
        assert!(csv.contains("registry"), "tag bez hf.co");
        assert!(csv.contains("huggingface"), "tag hf.co");
        let html = to_html(&run);
        assert!(html.contains(&messages::text(Lang::En, "export.source_huggingface", &[])));
    }

    /// Regresja: każdy wiersz musi mieć dokładnie tyle kolumn, co nagłówek.
    #[test]
    fn csv_rows_match_header_columns() {
        let csv = to_csv(&sample_run());
        let mut lines = csv.trim_start_matches('\u{feff}').lines();
        let header = field_count(lines.next().unwrap());
        assert_eq!(header, csv_header_fields(), "nagłówek vs licznik w kodzie");
        for line in lines {
            assert_eq!(field_count(line), header, "rozjechane kolumny: {line}");
        }
    }

    /// Ustawienia i podział GPU/CPU muszą trafić do eksportu - inaczej raport
    /// po czasie nie mówi, czym testowano.
    #[test]
    fn export_carries_settings_and_gpu_split() {
        let csv = to_csv(&sample_run());
        assert!(csv.contains("model_size_mb,gpu_offload_percent,system_prompt"));
        assert!(csv.contains("Jesteś asystentem programisty."));
        assert!(csv.contains("0.15"), "temperatura w CSV");
        assert!(csv.contains("8192"), "num_ctx w CSV");

        let html = to_html(&sample_run());
        assert!(html.contains("GPU 100% / CPU 0%"));
        assert!(html.contains("GPU 62% / CPU 38%"));
        assert!(html.contains("temperature 0.15"));
        assert!(html.contains("num_ctx 8192"));
    }

    #[test]
    fn csv_escapes_quotes_and_collapses_newlines() {
        let csv = to_csv(&sample_run());
        assert!(csv.contains("\"Napisz \"\"hello\"\", proszę w jednej linii\""));
        assert!(!csv.contains("proszę\nw jednej"));
    }

    #[test]
    fn html_escapes_markup_and_keeps_the_label() {
        let html = to_html(&sample_run());
        assert!(html.starts_with("<!DOCTYPE html>"));
        assert!(html.contains("20260913-213000.123"));
        assert!(html.contains("return 1 &lt; 2"));
        assert!(!html.contains("return 1 < 2"));
        assert!(html.contains("Refused"), "etykieta w języku raportu");
    }

    /// W raporcie HTML nie może zostać ani jedno słowo interfejsu wklejone
    /// w kod: raport jest dokumentem użytkownika, więc musi być w **jego**
    /// języku (testy nie zmieniają języka globalnego, więc ten raport jest
    /// angielski). Regresja: nagłówki „Odpowiedź” i „Etykieta”, linia
    /// „przebieg · start · czas trwania” i `lang="pl"` stały tu niegdyś
    /// jako literały.
    #[test]
    fn html_uses_the_report_language_not_polish_literals() {
        let html = to_html(&sample_run());

        for word in [
            "Odpowiedź",
            "Etykieta",
            "przebieg",
            "czas trwania",
            "przerwany",
            "tok/s (wall)",
            "lang=\"pl\"",
        ] {
            assert!(!html.contains(word), "polski literal w raporcie: {word}");
        }

        assert!(html.contains(&format!("lang=\"{}\"", Lang::En.code())));
        assert!(html.contains(&messages::text(Lang::En, "export.th_answer", &[])));
        assert!(html.contains(&messages::text(Lang::En, "export.th_label", &[])));
        assert!(html.contains(&messages::text(Lang::En, "export.th_tps_wall", &[])));
        // Linia opisu ma podstawione wartości, a nie placeholdery.
        assert!(html.contains("run 20260913-213000.123"));
        assert!(!html.contains("{id}") && !html.contains("{started}"));
    }

    /// Werdykt walidatora JSON idzie do raportu (kolumna w CSV, kolumna w HTML),
    /// a brak informacji - inne kategorie i starsze przebiegi - zostaje **pusty**,
    /// żeby nie udawać zmierzonego „niepoprawny”.
    #[test]
    fn export_carries_the_json_verdict() {
        // Sam `sample_run` nie ma werdyktu: żadne pole nie może się z nim pomylić.
        let plain_csv = to_csv(&sample_run());
        assert!(!plain_csv.contains("true") && !plain_csv.contains("false"));

        let mut run = sample_run();
        run.models[0].kind = "json".into();
        run.models[0].results[0].json_valid = Some(true);
        run.models[0].results.push(PromptResult {
            prompt: "Podaj dane jako JSON".into(),
            response: "Oto JSON: {}".into(),
            json_valid: Some(false),
            total_ms: 10.0,
            ..Default::default()
        });

        let csv = to_csv(&run);
        assert!(csv.contains(",error,json_valid,"), "nagłówek CSV");
        assert!(csv.contains(",true,"), "poprawny JSON w CSV");
        assert!(csv.contains(",false,"), "niepoprawny JSON w CSV");

        let html = to_html(&run);
        assert!(html.contains("<th>JSON</th>"));
        assert!(html.contains(&messages::text(Lang::En, "export.json_valid", &[])));
        assert!(html.contains(&messages::text(Lang::En, "export.json_invalid", &[])));
    }

    /// Werdykt składni Pythona trafia do obu formatów jako **kod** (CSV) i jako
    /// przetłumaczony tekst (HTML). Trzeci stan - „nie ma tu Pythona” - musi
    /// być rozróżnialny od błędu składni, bo model odpowiadający prozą nie
    /// napisał złego kodu, tylko żadnego.
    #[test]
    fn export_carries_the_python_verdict() {
        let mut run = sample_run();
        run.models[0].kind = "coding".into();
        run.models[0].results[0].python_verdict = Some(crate::python_check::OK.into());
        run.models[0].results.push(PromptResult {
            prompt: "Napisz funkcję".into(),
            response: "```python\ndef f(:\n```".into(),
            python_verdict: Some(crate::python_check::SYNTAX_ERROR.into()),
            total_ms: 12.0,
            ..Default::default()
        });
        run.models[0].results.push(PromptResult {
            prompt: "Napisz funkcję".into(),
            response: "Nie mogę tego zrobić.".into(),
            python_verdict: Some(crate::python_check::NO_CODE.into()),
            total_ms: 8.0,
            ..Default::default()
        });

        let csv = to_csv(&run);
        assert!(csv.contains(",json_valid,python_verdict,"), "nagłówek CSV");
        // `csv_field` cytuje każdą wartość, więc kod jest w cudzysłowach.
        assert!(csv.contains(",\"ok\","), "poprawna składnia w CSV");
        assert!(csv.contains(",\"syntax_error\","));
        assert!(csv.contains(",\"no_code\","));

        let html = to_html(&run);
        assert!(html.contains("<th>Python</th>"));
        assert!(html.contains(&messages::text(Lang::En, "export.python_ok", &[])));
        assert!(html.contains(&messages::text(Lang::En, "export.python_syntax_error", &[])));
        assert!(html.contains(&messages::text(Lang::En, "export.python_no_code", &[])));
    }
}
