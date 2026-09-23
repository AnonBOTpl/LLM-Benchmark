# AI Benchmark

A desktop app (Tauri v2 + React) for comparing **local LLMs served by Ollama**.
It measures time to first token, generation speed (tokens/s) and VRAM usage while generating.

> 🇵🇱 Polish documentation: [README-pl.md](README-pl.md)

[![A run in progress: live progress, the streamed answer and the metrics](docs/screenshots/test-run.png)](docs/screenshots/test-run.png?raw=true)

<a href="docs/screenshots/classification.png?raw=true"><img src="docs/screenshots/classification.png" width="200" alt="Manual response classification"></a> <a href="docs/screenshots/results.png?raw=true"><img src="docs/screenshots/results.png" width="200" alt="Results table with an A/B comparison"></a> <a href="docs/screenshots/models.png?raw=true"><img src="docs/screenshots/models.png" width="200" alt="Model panel with live VRAM state"></a> <a href="docs/screenshots/model-search.png?raw=true"><img src="docs/screenshots/model-search.png" width="200" alt="HuggingFace catalogue with memory verdicts"></a>

*From left: grading an answer by hand, the results table with the A/B comparison, a model panel with
live VRAM state, and the HuggingFace catalogue with its memory verdicts. Every image is a real
1440 x 920 window, and clicking one opens it at full size - use Ctrl+click or middle-click to keep
this page open, because a README cannot ask for a new tab (GitHub strips the `target` attribute).*

## Installing (for users)

The release is a single **Windows installer** built with NSIS: `AI-Benchmark_1.0.0_x64-setup.exe`. It
installs **per user** (no administrator prompt) and is removed from "Apps & features" like any other
program. Building from source produces the same file in
`src-tauri/target/release/bundle/nsis/`.

Two things to know before you run it:

- **Ollama is not bundled.** Install it separately from [ollama.com](https://ollama.com) and leave it
  running – the app talks to it over `http://127.0.0.1:11434` and generates nothing on its own.
  Everything here was measured against **Ollama 0.34.3**.
- **The installer is unsigned**, so SmartScreen shows *“Windows protected your PC”* the first time.
  That is what an unsigned build looks like, not a sign of a problem: **More info** → **Run anyway**.
  If that is not acceptable, build from source – all of it is in this repository.

Models are not bundled either. They are downloaded on demand from the **Models** tab into Ollama's own
folder, and the app shows the size of each one **before** you download it (a 3B model is ~2 GB, a 7–8B
one 4–5 GB), so check your free space first. The VRAM metrics need an NVIDIA card and driver; without
one the app still works and only those metrics are skipped.

To remove the app: uninstall it like any other program, then delete its data yourself – the data folder
(`%APPDATA%\com.aibenchmark.dev\`) and the exports in `Downloads\AI Benchmark\`. The uninstaller
leaves both alone on purpose.

The two sections that follow are for **building from source**.

## Requirements

- Node.js ≥ 18, Rust (stable)
- [Ollama](https://ollama.com) running locally (default `http://127.0.0.1:11434`)
- Optional: an NVIDIA card and driver to measure VRAM (NVML). Without it the app still works,
  only the VRAM metrics are skipped.

## Running

```bash
npm install
npm run tauri dev      # development
npm run tauri build    # production installer
```

## Language

The interface is **English by default** and ships with six more languages (Polish, German, Spanish,
French, Brazilian Portuguese, Italian). You switch between them in **Settings**; the choice is
written to `settings.json` immediately, so it survives a restart. Each language is listed **in
itself** (`Deutsch`, `Español`) rather than with a flag - a flag names a country, not a language, and
would turn `es` into Spain while most Spanish speakers are elsewhere. The row of labels wraps, so it
still fits at this size; past roughly a dozen languages it should become a dropdown.

Language files are **one file per language**, on both sides:

| Where | Files |
|---|---|
| Interface | `src/lib/locales/<code>.ts` - one per language (`en.ts`, `pl.ts`, …) |
| Backend messages | `src-tauri/src/messages_<code>.rs` - one per language |

Keys are **neutral** - `models.row.download`, `settings.language_title` - and every file carries the
same set of them. No interface text lives in a component: a string there would show up in the same
shape in every language, so the checker treats Polish text in a component as an error, and legacy
values stored in old history are the single documented exception.

A missing entry **falls back to English**, not to the source text, so an incomplete translation shows
English fragments rather than Polish ones.

**Adding a language** touches five places, and the checker fails if they disagree - a language offered
in the UI with no catalogue (or missing from the whitelist in `settings.rs`, which would silently
revert the choice to English on restart) does not get through:

1. `src/lib/locales/<code>.ts` - the interface text,
2. `src-tauri/src/messages_<code>.rs` - the backend messages,
3. the label in `LANGUAGES` (`src/lib/i18n.tsx`), its locale in `LOCALES`, and the `Language` type,
4. the whitelist in `settings.rs`,
5. nothing else - the checker finds the new files by name.

**Backend messages are separate from all this**: they are resolved to a finished sentence in Rust,
because error text is also *stored* in run history and written into the CSV/HTML export
(`PromptResult::error`). A code sent to the UI would end up in the export as a code. The language
follows `settings.json`, and `settings::sync_language` keeps it in step.

Classification labels are **codes** (`label.completed`, …) on both sides, so a run graded in Polish
reads the same in English; the export localises them, and `labelKey()` recognises the Polish values
written by older versions, so old runs keep their grades.

The checker verifies both sides: every language file holds identical keys (all of them neutral -
ASCII, lower case, dot-separated) **and identical `{placeholders}`**, every key used in a component
exists (and none is orphaned), no Polish text is left in a component, every Rust catalogue holds the
same codes, every code used in the code exists, and the list of languages agrees across all five
places listed above.

```bash
npm run check:i18n
```

## Tabs

| Tab | What it does |
|---|---|
| **Models** | Ollama tags with checkboxes, download size, a “Download” button (`/api/pull` with a streamed progress bar), a “Models in memory (VRAM)” panel with load/unload, per-model **settings** (parameters + system prompt), adding your own models with a suggested category, removing from the list or from disk |
| **Model search** | The HuggingFace GGUF catalogue: browse it with no query or search it, filters, a per-repository **variant table with the real download size before you download**, and *Add to Models* with the categories picked up front |
| **Categories** | Editing category names and prompt lists (including VLM tasks: image path + prompt). A **checkbox per prompt** decides what joins the test |
| **Test** | A model × category matrix, start/stop, live streamed response and metrics, plus a **VRAM forecast** before you start. The answer preview **auto-scrolls** to the newest tokens (switch above it, remembered in Settings); scrolling up pauses it until you return to the bottom |
| **Results** | A model × category table sortable by tokens/s with each model's **source** (`registry` / `HF`) next to its name, run history, A vs B comparison, CSV/HTML export |
| **Settings** | Language, checks and display (JSON and Python answer checks, auto-scroll), history and export cleanup, global default system prompts, restoring defaults |

## Categories

The app ships with **seven** categories:

1. **Coding** – tokens/s, time to first token, **plus** a check whether the answer parses as **Python**
   (three states, see below)
2. **Chat / creativity** – as above
3. **Images (VLM)** – needs a multimodal model (llava / moondream / qwen2-vl), prompt + image
4. **Reasoning / math** – as above
5. **Structured output (JSON)** – tokens/s and TTFT like the rest, **plus** a check whether the answer
   actually parses as JSON. That check is computed **once, in Rust** (`json_check.rs`), stored with the
   result and carried into both exports, so the screen and the report cannot drift apart. It is
   information *next to* the measurement, never instead of it – the answer is always shown in full.
6. **Long context / summarization** – as above
7. **Response classification** – no tokens/s as the headline result; every answer is graded **by
   hand** with one of three labels: *Completed*, *Refused*, *Completed with limits/changes*. History
   stores those as **codes** (`label.completed`, …), not as text, so a run graded in Polish reads the
   same in English and comparing a run from last month does not depend on the language of the moment.
   Runs graded by older versions (which wrote the Polish text) are still understood.

### Answer checks (JSON and Python)

Both checks are **information next to the measurement**, never instead of it – tokens/s and TTFT are
measured the same way for an answer that parses and for one that does not, and the answer is always
shown in full. Both are computed **once, in Rust** (`json_check.rs`, `python_check.rs`), stored with
the result and carried into both exports, so the screen and the report cannot drift apart. Both are
stored as **codes** (`ok` / `syntax_error` / `no_code`), not as sentences, because the interface
speaks seven languages.

The Python check has **three** states, not two, and that is the point: *valid syntax*, *syntax error*
and *no Python code*. A model that answered in prose - or in SQL, or in JavaScript - did not write
bad code, it wrote none, and marking that ✗ would be untrue.

What the check does **not** claim: that the code is correct, that it runs, or that it does what was
asked. It only says the answer parses. It is never executed. The interface says `Python` and the
verdict reads *valid syntax*, not *correct code*, precisely so the label cannot be over-read.

Measured while choosing the parser: **`rustpython-parser`** catches a missing indent after a colon,
which `tree-sitter` silently accepts as two statements - and a missing indent is the most common
error small models make, i.e. exactly the case the check exists for. `rustpython-parser` also
understands newer syntax (3.10 `match`, 3.12 type parameters, 3.12 f-strings), so a modern answer is
never punished. Tree-sitter's dependency is gone.

Both checks can be **turned off in Settings** (Checks and display). Off means the check is not
computed **at all**: the result keeps "no information" - never "invalid" - and the column disappears
from results and exports. Two separate switches, because they cover different categories: whoever
tests code in JavaScript does not want "no Python code" in every row.

**Category names are always English** (`Coding`, `Chat / creativity`, `Reasoning / math`,
`Structured output (JSON)`, `Long context / summarization`, `Images (VLM)`,
`Response classification`) regardless of the interface language, and they stay editable. These are
just labels and keeping one version avoids maintaining two that could drift apart. An existing
`config.json` holding the old Polish names is moved over once, on first load - but only when **none**
of the known categories has been renamed, so a name you changed by hand is never overwritten.

**No category ships with example prompts.** Every list starts empty and you fill it in yourself, in
whatever language you want; the app cannot guess which language you think in. What the empty field
does show is a **hint** - an example suited to the kind of category - and that hint follows the
interface language.

### Choosing which prompts run

Every prompt (including a VLM task: image + prompt) has a **checkbox**. An unchecked prompt stays
on the list with its text but never reaches the model, so you can hide one prompt for a run without
deleting it. Each category header has a *Check all* / *Uncheck all* button, and the counter reads
`1 of 2 prompts enabled`. When every prompt in a category is unchecked, the category is skipped
(the matrix shows `no prompts`).

`config.json` accepts both formats: the old one (a list of bare strings) loads with no migration –
a missing “enabled” flag means “enabled”.

## Where the data lives

- Configuration and history: the app data directory (`%APPDATA%\com.aibenchmark.dev\`)
  - `config.json` – models and categories
  - `settings.json` – language, default system prompt overrides, the two answer checks and the
    answer-preview auto-scroll
  - `history/<id>.json` – one file per run
- Exports: `Downloads/AI Benchmark/`

## Model search (HuggingFace catalogue)

The second tab browses and searches **GGUF repositories on HuggingFace** and hands a chosen
repository to Ollama - the app never downloads weights itself.

- **An empty query is the catalogue**, a typed query is a search (debounced by 400 ms).
- Filters sit on the left and **every group carries a badge saying where it comes from**: `HF` means
the work happens on HuggingFace's side, `ours` means we compute it here from the file list and from
your card's memory. Without the badge you cannot tell which numbers are facts from the repository and
which are our estimates.
- Sizes come from **the repository's own file list**, never from the parameter count:

| Rule | Why |
|---|---|
| a **projector** (`mmproj-*`) is not a variant | Ollama will not run it on its own, but it *is* pulled alongside a vision model - so it is added to the size and the number is marked `≈` |
| the projector is the `Q8_0` one, or the smallest when there is no `Q8_0` | measured: Ollama picked the same `Q8_0` projector for both `:Q4_K_M` and `:Q8_0` of the same repository, and on a second model (InternVL3-2B) our prediction matched the downloaded bytes exactly |
| a quantization split into `-00001-of-00003` parts is **skipped, but named** | Ollama cannot pull such a tag; hiding the group would make the repository look like it has fewer variants than it does |
| sketch files (`eagle3-*`) are not variants either | they are a second model, not a quantization of this one |
| the tag is always `hf.co/<repo>:<file>` | a tag **without** a file name makes Ollama pick the file itself - measured: it silently took the `Q4_K_M` file, so our size and the downloaded size could disagree |
| the quantization label comes from a list of known families (`Q*`, `IQ*`, `F*`, `BF*`, `MXFP*`) | “the token after the last dash” would call `IQ2_XS-mtp` a `mtp` |

- **Add to Models** puts the variant on your model list with the **categories chosen up front**;
downloading is then the ordinary `ollama pull` in the Models tab, with the same progress bar.
- Repositories marked **gated** get a warning - they need a licence accepted on HuggingFace before
Ollama will fetch them.
- Repositories are read a few at a time in the background, the tab refreshes **by hand** and never
polls on its own.

One consequence worth knowing: **the same model from the Ollama registry and from HuggingFace can
score differently**, because the chat template and the parser come from the repository. That is why
every run records its **source** and both exports carry it.

## Model management

- **Model size** is shown for every entry, including models that are not on disk yet:
  - downloaded → the on-disk size from `GET /api/tags`,
  - not downloaded → the sum of layers from the Ollama registry manifest
    (`registry.ollama.ai/v2/<repo>/manifests/<tag>`) plus parameter size and quantization from the
    config blob (`8.2B · Q4_K_M`).
  - The same works for a tag being typed into “Add your own model” (debounced), so the size is
    visible **before** you add and download it.
  - Models from `hf.co/...` cannot be measured that way (the Ollama registry does not know them),
    but the **Model search** tab reads the repository's own file list and shows the exact size of
    every variant **with the projector added in**, so the number is known before the download.
- **The download bar** disappears on success (the confirmation is a message, not a frozen bar); on
  failure it stays with the error text. Progress is counted **per layer** – Ollama sends
  `total`/`completed` for one layer at a time and layers differ wildly in size (one of them is a
  90-byte manifest), so the counter restarts when the layer changes and shows downloaded bytes next
  to the percentage (`4.5 MB / 87.5 MB`).
- **The trash icon** is the only destructive action in this tab, so it offers a choice: “List only”
  (leaves the files alone) or “Delete from disk (size)” (`DELETE /api/delete`).
- **Category suggestion** for a typed tag. Ollama **does not publish a model's purpose**
  (“coding” / “chat”) – not in `/api/show`, not in `/api/tags`, not in the registry manifest. The
  only hard data is `capabilities`, where `vision` unambiguously means a multimodal model, and only
  for models already downloaded. Therefore the app:
  - takes the category from `capabilities` when available (the UI says “certain”),
  - otherwise guesses from the name (`-coder`, `llava`, `moondream`, `qwen`, `llama`, ...) and says
    plainly that it is a heuristic,
  - **never overwrites a manual choice** – the category is set automatically only when none is
    selected yet,
  - does not guess at all for unknown names (the model lands in “Without a category”).
- **Image warning**: a model assigned to the Images (VLM) category that does not report image
  support gets a warning in its row and in the Test tab, instead of a silent failure in the results.

## Model settings (parameters and system prompt)

Opening a model's **row in the Models tab** reveals its settings panel; the row then carries a
“custom parameters” mark so you can see from the list which model differs from the defaults. The
panel configures generation parameters and the system prompt **for that model only**, and it has a
**Save** button with a bar that appears as soon as something is unsaved - switching to another model
mid-edit does not silently drop the value.

- **Parameters**: `temperature`, `top_p`, `top_k`, `repeat_penalty`, `num_ctx`, `num_predict`,
  `seed`, `num_gpu`. An empty field leaves the decision to Ollama, so by default we send nothing.
- **“Insert suggested”** is **our recommendation**, not data from Ollama – Ollama does not publish
  suggested parameters (for `qwen2.5-coder:3b` the `parameters` field in `/api/show` is empty). The
  only hard value from the model is its maximum context (`/api/tags`), which caps the suggested
  `num_ctx`.
- **System prompt**: custom, or the default for the category kind (below). The default prompt is
  resolved **per model × category pair**, so the same model gets a different prompt in “Coding” and
  in “Chat” without duplicating settings.
- Settings are stored **with the run's results**, shown in the “Results” tab and included in the
  CSV/HTML export – later you can see exactly what produced a given number.

> Technical note: Ollama expects **snake_case** keys in `options` (`num_ctx`, `num_gpu`) and
> silently drops unknown keys. camelCase therefore looks like a success while doing nothing, which
> is why the conversion has its own regression test.

### Default system prompts

Each category kind has its own general instruction, editable in **Settings** (app-wide, per kind):

- **Coding** – working code in a fenced block, without restating the request;
- **Chat** – to the point, no filler, admitting uncertainty instead of guessing;
- **Images (VLM)** – a description of what is visible and nothing else: subject, action, setting,
  colours, lighting, style, with an explicit "describe only what you can actually see";
- **Classification** – neutral, so it does not hint at any of the three labels.

**The built-in instructions are English in every interface language.** They do not live in the
language files at all. Two reasons, and the second is the one that matters:

- small models (this app is about 3B-8B, precisely the ones that lose an instruction) follow an
  English instruction more reliably;
- **a benchmark has to be reproducible.** If the instruction followed the interface language, the
  same model and the same prompt would get different input depending on which language you happened
to have open - a hidden variable in a tool whose whole job is measuring. The instruction also tells
  the model to answer in the language of the question, so a Polish prompt still gets a Polish
  answer.

An override you write yourself is **one text for every language**: it is your choice, not interface
text, so switching the language does not silently replace it. The only built-in instruction that asks
for an English answer regardless of the question is the one for images – the vision models this
category targets (`llava`, `moondream`) are trained mostly on English.

**Not every model receives the system prompt.** The app reads the model template (`/api/show`) and
when it has no `{{ .System }}`, it warns that the model “ignores the system prompt” – the
instruction then has to go into the prompt itself. That is the case for `moondream`, whose template
is `Question: {{ .Prompt }} Answer: {{ .Response }}`.

## Model memory (VRAM)

The “Models in memory (VRAM)” panel shows what Ollama currently holds (`GET /api/ps`) and lets you:

- **Load** (`keep_alive: "30m"`) – the model enters VRAM up front, so the first prompt does not pay
  for a cold start (in tests TTFT dropped from ~6.7 s to ~80 ms),
- **Unload** / **Unload all** (`keep_alive: 0`) – returns the card's memory,
- inspect the **GPU/CPU split**: `/api/ps` reports `size` and `size_vram`, so you can see
  `GPU 100% / CPU 0%` or, with `num_gpu`, a partial offload of layers.

**Automatic unload at run start.** Models taking part in the current run stay in VRAM (a test with
two models keeps both resident), but a model left over from a previous test is freed *before* the
first generation, so it does not hold memory needlessly. The “Live progress” panel then says what
was released. Manual “Unload” / “Unload all” in the “Models” tab works as before.

The split is measured **for every prompt** and lands in the results (the **GPU/CPU** column in
“Test” and “Results”, plus the export). It is controlled by `num_gpu` in the model settings –
measured live on `qwen2.5-coder:3b` (`num_ctx: 2048`):

| `num_gpu` | Split | tokens/s | VRAM peak |
|---|---|---|---|
| empty (auto) | GPU 100 / CPU 0% | ~37 | ~3100 MB |
| `10` | GPU 34 / CPU 66% | ~6.2 | ~1825 MB |

> This is a **memory (layer)** split, not a share of compute time – Ollama does not expose
> per-device compute time. The drop in tokens/s under partial offload comes from two thirds of the
> layers running on the CPU.

## VRAM forecast

Before you start, the Test tab estimates whether the selected models will fit on the card. It is
built from things we can actually know:

- models **already in memory** get their exact size from `/api/ps`,
- models **on disk** get weights from `/api/tags` plus a KV cache computed from the architecture
  metadata in `/api/show` (`block_count`, `attention.head_count_kv`, `embedding_length`),
- memory used by everything else on the card is `NVML used − what Ollama holds`.

The KV cache formula is `2 (K and V) × layers × kv_heads × head_dim × 2 bytes (f16)`. It was
verified empirically on this machine: for `qwen2.5-coder:3b` it yields 36 864 B/token, while
`/api/ps` shows a 38 912 B/token increase between a 8192 and a 16384 context – about 5% off, mostly
allocation rounding. For the whole model the estimate is 1841 + 288 + 64 MB = 2193 MB against a
measured 2292 MB, so ~4% under.

The panel says **estimate**, not measurement, and reports **four** states: on the card / on the card
but with no headroom / partly on the CPU / will not run at all. The last one is compared against the
**card plus system memory**, because a model that does not fit in VRAM can still run on the CPU -
that only becomes impossible when it does not fit in memory either. It also notes the cases where the
estimate is weaker: a model that is not
downloaded (`/api/ps` cannot confirm anything), missing architecture metadata (KV not computed),
a multimodal model (the vision encoder does not always land in VRAM), and `num_gpu` set (some
layers may run on the CPU, so real usage can be lower).

### The four states, checked on real weights

Measured on 23 September (GTX 1060 6 GB, 16 GB RAM): the card had 5113 MB free and RAM had 7456 MB
usable after the 1536 MB reserve, so *will not run at all* began at 12 569 MB. Three states were
confirmed on downloaded models, the fourth in the catalogue (nothing to download):

| model | forecast | what really happened |
|---|---|---|
| `qwen2.5-coder:3b` | on the card, 2048 MB | `/api/ps` holds it entirely in VRAM, the app reads **GPU 100%** |
| `llava:7b` | on the card, no headroom, 5090 MB | 3574 MB of 4597 MB in VRAM (**77.7%**), the app reads **GPU 78%** |
| `qwen3:8b` | partly on the CPU, 5623 MB | 4141 MB of 5685 MB in VRAM (**72.8%**), the app reads **GPU 73%**, 5.5 tok/s |
| a 72B GGUF in the catalogue | will not run at all | its smallest variant is 22.1 GB, above the 12 569 MB budget |

Three conclusions from that comparison. The estimate ran **1% under** for `qwen3:8b` (5623 predicted
vs 5685 real) and **11% over** for `llava:7b` (5090 vs 4597). *On the card, with no headroom* means
exactly that: Ollama keeps a margin of its own and moved **22% of `llava:7b` to the CPU** without
being asked, which the GPU/CPU column then showed. And that column is trustworthy - it agreed with
`/api/ps` **77.75% vs 78%**, two readings from two different sources.

The catalogue states its own limit in the variant table: for HuggingFace files the KV cache is **not**
counted, because HF reports neither the layer count nor the KV head count, so the number there is a
**lower bound**. For the same model both places still give the same verdict - `Qwen2.5-Coder-3B`
q4_k_m reads 2071 MB in the catalogue and the installed `qwen2.5-coder:3b` reads 2048 MB in the Test
tab, and both say *on the card*.

## Settings and housekeeping

- **Checks and display** – two switches for the answer checks (JSON, Python) and one for
  auto-scrolling the answer preview. All three are **on by default**, and a `settings.json` from an
  older version (with none of those fields) reads as *on* rather than silently switching features
  off. They persist across restarts.
- **History cleanup** with a preview: the list of runs to delete and the space it will free are
  computed **before** you confirm. Filters: all / older than N days / interrupted only. History is
  one JSON file per run, so it can also be copied together with the data folder.
- **Export files** are deleted by a **separate** action – they are your CSV/HTML files, never
  removed together with the history.
- **Restore defaults** deletes `settings.json` and returns to the defaults. Models, categories,
  history and export files are left untouched, which is exactly why settings live in their own file
  rather than in `config.json`.

## Verification tools

A few helper scripts for checking the pipeline without clicking through the GUI:

```bash
# Checks the Ollama calls 1:1 with what ollama.rs does (generate, not pull):
# measures TTFT, tokens/s and shows a cold vs warm start.
node scripts/ollama-smoke.mjs qwen2.5-coder:3b

# VLM diagnostics: sends an image with several prompts and shows the raw stream
# (chunk count, character count, TTFT, eval_count, tokens/s, done_reason).
# Useful when a model "says nothing" - you can see whether the response is empty.
# It also prints the model template and whether it uses the `system` field at all.
node scripts/vision-probe.mjs moondream "C:/path/to/image.jpg"

# ...or check whether a model reacts to the `system` field:
SYSTEM_PROMPT="Answer in English." node scripts/vision-probe.mjs moondream "C:/image.jpg"

# Drives the real UI over the Chrome DevTools Protocol.
# Needs a temporary debug port - see the header of scripts/ui-drive.mjs.
# `source scripts/dev-ensure-app.sh && ensure_app` first if the window is not up
# yet: it builds nothing, it just starts Vite and the built binary and waits.
cat expr.js | node scripts/ui-drive.mjs

# Screenshots of the real window over the same protocol, driven by a JSON plan:
# it sets an exact viewport, can click through the app first (`prepare`) and
# writes PNGs. `capture: false` measures a layout without saving a file - that
# is how the screenshots in `docs/screenshots` were made.
node scripts/screenshot.mjs plan.json

# Translation completeness in both directions, plus a length check on every
# text (a label that outgrows its column breaks the layout).
npm run check:i18n

# Interface rule: no text smaller than 12 px, anywhere.
npm run check:ui
```

Backend unit tests (export logic, the fixed starting model list, path traversal protection, NVML
detection, category heuristics, the GGUF variant and projector rules, the GPU/CPU split, the KV
cache formula, prompt migration, the model source):

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Metrics

- **TTFT** – time from sending the request to the first token (on a cold start it includes loading
  the model)
- **tokens/s** – `eval_count / eval_duration` from Ollama, plus a variant measured with our own
  clock. The value is **skipped** when the measurement makes no sense: Ollama can return
  `eval_count: 1` with `eval_duration: 1000` (1 µs) for an empty response, and dividing those gives
  1 000 000 tokens/s.
- **VRAM peak** – the highest GPU memory usage (NVML) during that prompt

## Empty responses

Ollama can report success while generating **not a single token**. This happens with small VLM
models – for instance `moondream` on a prompt in a language other than English stops immediately at
EOS (0 characters, `eval_count: 1`). The app names that instead of showing an empty box and
meaningless metrics:

- in the **Test** tab the response panel shows `(0 tokens)` plus an explanation,
- in the table `tokens/s` and `TTFT` show `—` instead of a number out of nowhere,
- in the **Results** tab there is an **Empty** column counting such cases per run,
- expanding a prompt shows a hint to try an English prompt.

## If a section stops working

A crash while drawing the interface used to take down the **whole window** and leave it blank – no message, and nothing in
the backend log, so the symptom pointed nowhere near the cause. Each tab now has its own safety net:
the failing part is replaced by a message with the technical detail and a **Try again** button, while
the rest of the app keeps working (the title bar, the Ollama and GPU status, the other tabs).

A benchmark run survives this, because its state lives **outside** the tab: if the Response
classification window breaks, the run stays paused and waiting for your label. *Try again* brings
the window back and you can carry on with the answers already collected.

The message text is deliberately raw (it is the error, not a translation of it) – that is the bit
worth copying when reporting a problem. The section *above* the safety nets (the app's own data
providers) is the one case left uncovered, so that the message itself always has a language to
speak in.

## License

**MIT** – see [LICENSE](LICENSE). Use it, change it, ship it, including commercially; keep the
copyright notice and the licence text with your copies.

The licence covers **this application only**. Ollama has its own licence, and every model you
download carries the licence of the repository it came from – the app pulls models, it does not
relicense them.

