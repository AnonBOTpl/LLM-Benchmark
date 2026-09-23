# AI Benchmark

Desktopowa aplikacja (Tauri v2 + React) do porównywania **lokalnych modeli LLM przez Ollamę**.
Mierzy czas do pierwszego tokenu, tokens/s generowania oraz zużycie VRAM w trakcie generowania.

> 🇬🇧 English documentation: [README.md](README.md)

[![Przebieg w trakcie: postęp, streamowana odpowiedź i metryki](docs/screenshots/test-run.png)](docs/screenshots/test-run.png?raw=true)

<a href="docs/screenshots/classification.png?raw=true"><img src="docs/screenshots/classification.png" width="200" alt="Ręczna klasyfikacja odpowiedzi"></a> <a href="docs/screenshots/results.png?raw=true"><img src="docs/screenshots/results.png" width="200" alt="Tabela wyników z porównaniem A i B"></a> <a href="docs/screenshots/models.png?raw=true"><img src="docs/screenshots/models.png" width="200" alt="Panel modelu ze stanem VRAM"></a> <a href="docs/screenshots/model-search.png?raw=true"><img src="docs/screenshots/model-search.png" width="200" alt="Katalog HuggingFace z werdyktami pamięci"></a>

*Od lewej: ręczna ocena odpowiedzi, tabela wyników z porównaniem A i B, panel modelu ze stanem VRAM
na żywo i katalog HuggingFace z werdyktami pamięci. Każde zdjęcie to prawdziwe okno 1440 x 920,
a kliknięcie otwiera je w pełnym rozmiarze - użyj Ctrl+kliku albo środkowego przycisku, żeby nie
tracić tej strony, bo README nie może poprosić o nową kartę (GitHub wycina atrybut `target`).*

## Instalacja (dla użytkownika)

Wydanie to **jeden instalator Windows** zbudowany NSIS-em: `AI-Benchmark_1.0.0_x64-setup.exe`.
Instaluje się **per użytkownik** (bez pytania o administratora) i znika z „Aplikacji i funkcji” jak
każdy inny program. Budowanie ze źródeł tworzy ten sam plik w
`src-tauri/target/release/bundle/nsis/`.

Dwie rzeczy, które trzeba wiedzieć, zanim go uruchomisz:

- **Ollama nie jest dołączona.** Zainstaluj ją osobno z [ollama.com](https://ollama.com) i zostaw
  uruchomioną - aplikacja rozmawia z nią przez `http://127.0.0.1:11434` i sama nic nie generuje.
  Wszystko tutaj było mierzone na **Ollamie 0.34.3**.
- **Instalator nie jest podpisany**, więc Windows pokaże za pierwszym razem SmartScreen
  *„Windows protected your PC”*. Tak wygląda niepodpisana kompilacja, nie problem: **More info** →
  **Run anyway**. Jeśli to nie do przyjęcia, zbuduj ze źródeł - całość jest w tym repozytorium.

Modele też nie są dołączone. Pobiera się je na żądanie z zakładki **Modele**, do własnego folderu
Ollamy, a aplikacja pokazuje rozmiar każdego z nich **przed** pobraniem (model 3B to ~2 GB, 7-8B -
4-5 GB), więc najpierw sprawdź miejsce na dysku. Metryki VRAM wymagają karty NVIDIA i sterownika; bez
niej aplikacja nadal działa i tylko te metryki są pomijane.

Żeby usunąć aplikację: odinstaluj ją jak każdy inny program, a potem skasuj jej dane sam - katalog
danych (`%APPDATA%\com.aibenchmark.dev\`) i eksporty w `Pobrane/AI Benchmark/`. Odinstalowanie celowo
zostawia jedno i drugie.

Dwie sekcje poniżej są dla **budowania ze źródeł**.

## Wymagania

- Node.js ≥ 18, Rust (stable)
- [Ollama](https://ollama.com) uruchomiona lokalnie (domyślnie `http://127.0.0.1:11434`)
- Opcjonalnie: karta NVIDIA + sterownik, żeby mierzyć VRAM (NVML). Bez niej aplikacja działa
  normalnie, tylko metryki VRAM są pomijane.

## Uruchomienie

```bash
npm install
npm run tauri dev      # tryb deweloperski
npm run tauri build    # instalator produkcyjny
```

## Język

Interfejs jest **domyślnie angielski** i ma sześć kolejnych języków (polski, niemiecki, hiszpański,
francuski, portugalski brazylijski, włoski). Przełączasz je w **Ustawieniach**, a wybór trafia od razu
do `settings.json`, więc przetrwa restart. Każdy język jest opisany **w nim samym** (`Deutsch`,
`Español`), a nie flagą - flaga nazywa państwo, nie język, i zrobiłaby z hiszpańskiego Hiszpanię,
gdy większość jego użytkowników mieszka gdzie indziej. Pas etykiet się zawija, więc przy tej liczbie
języków nadal się mieści; po przekroczeniu kilkunastu trzeba go zamienić na listę rozwijaną.

Pliki językowe to **jeden plik na język**, po obu stronach:

| Gdzie | Pliki |
|---|---|
| Interfejs | `src/lib/locales/<kod>.ts` - po jednym na język (`en.ts`, `pl.ts`, …) |
| Komunikaty backendu | `src-tauri/src/messages_<kod>.rs` - po jednym na język |

Klucze są **neutralne** - `models.row.download`, `settings.language_title` - i każdy plik ma dokładnie
ten sam ich zestaw. Żaden tekst interfejsu nie mieszka w komponencie: taki tekst pokazałby się w tej
samej postaci w każdym języku, dlatego skaner traktuje polski tekst w komponencie jako błąd. Jedyny
udokumentowany wyjątek to stare wartości zapisane w historii.

Brak wpisu spada **do angielskiego**, a nie do tekstu źródłowego - niepełne tłumaczenie pokazuje więc
angielskie wstawki, a nie polskie.

**Dodanie języka** dotyka pięciu miejsc, a skaner zgłasza błąd, gdy się rozjadą - język oferowany w UI
bez katalogu (albo pominięty w liście w `settings.rs`, co po cichu cofałoby wybór do angielskiego po
restarcie) nie przejdzie:

1. `src/lib/locales/<kod>.ts` - teksty interfejsu,
2. `src-tauri/src/messages_<kod>.rs` - komunikaty backendu,
3. etykieta w `LANGUAGES` (`src/lib/i18n.tsx`), jej locale w `LOCALES` i typ `Language`,
4. lista w `settings.rs`,
5. nic więcej - nowe pliki skaner znajduje sam, po nazwie.

**Komunikaty backendu są osobną sprawą**: powstają od razu jako gotowe zdanie w Rust, bo tekst błędu
jest też **zapisywany** w historii przebiegu i w eksporcie CSV/HTML (`PromptResult::error`). Kod
wysłany do UI trafiłby do eksportu jako kod. Język bierze się z `settings.json`, a pilnuje go
`settings::sync_language`.

Etykiety klasyfikacji to po obu stronach **kody** (`label.completed`, …), więc przebieg oceniony po
polsku czyta się tak samo po angielsku; eksport tłumaczy je na język raportu, a `labelKey()`
rozpoznaje polskie wartości zapisane przez starsze wersje, żeby stare przebiegi nie straciły ocen.

Skaner sprawdza obie strony: każdy plik językowy ma identyczne klucze (wszystkie neutralne - ASCII,
małe litery, segmenty po kropce) **i identyczne `{symbole}`**, każdy klucz użyty w komponencie
istnieje (i żaden nie jest osierocony), w komponentach nie został polski tekst, każdy katalog Rusta
ma te same kody, każdy użyty kod istnieje, a lista języków zgadza się we wszystkich pięciu miejscach
wymienionych wyżej:

```bash
npm run check:i18n
```

## Zakładki

| Zakładka | Co robi |
|---|---|
| **Modele** | Lista tagów Ollama z checkboxami, rozmiar do pobrania, przycisk „Pobierz” (`/api/pull`, streamowany progress bar), panel „Modele w pamięci (VRAM)” z ładowaniem/zwalnianiem, **ustawienia modelu** (parametry + system prompt), dodawanie własnych modeli z podpowiedzią kategorii, usuwanie z listy lub z dysku |
| **Szukaj modeli** | Katalog modeli GGUF na HuggingFace: przeglądanie bez zapytania albo szukanie, filtry, **tabela wariantów z prawdziwym rozmiarem do pobrania jeszcze przed pobraniem** oraz „Dodaj do Modeli” z kategoriami wybranymi z góry |
| **Kategorie** | Edycja nazw kategorii i list promptów (w tym zadania VLM: ścieżka do obrazu + prompt). **Checkbox przy każdym promptcie** decyduje, co wchodzi do testu |
| **Test** | Macierz model × kategoria, start/stop, podgląd na żywo strumieniowanej odpowiedzi i metryk oraz **szacunek VRAM** przed startem. Podgląd odpowiedzi **sam się przewija** do najnowszych tokenów (przełącznik nad nim, zapamiętywany w Ustawieniach); przewinięcie w górę wstrzymuje to do powrotu na dół |
| **Wyniki** | Tabela model × kategoria sortowalna po tokens/s, przy nazwie modelu jego **źródło** (`rejestr` / `HF`), historia przebiegów, porównanie A vs B, eksport CSV/HTML |
| **Ustawienia** | Język, sprawdzenia i widok (sprawdzenia odpowiedzi JSON i Python, autoprzewijanie), czyszczenie historii i eksportów, globalne domyślne system prompty, przywracanie domyślnych |

## Kategorie

Aplikacja startuje z **siedmioma** kategoriami:

1. **Coding** – tokens/s, czas do pierwszego tokenu, **plus** sprawdzenie, czy odpowiedź parsuje się
   jako **Python** (trzy stany, patrz niżej)
2. **Chat / creativity** – jak wyżej
3. **Images (VLM)** – wymaga modelu multimodalnego (llava / moondream / qwen2-vl), prompt + obraz
4. **Reasoning / math** – jak wyżej
5. **Structured output (JSON)** – tokens/s i TTFT jak reszta, **plus** sprawdzenie, czy odpowiedź
   faktycznie parsuje się jako JSON. To sprawdzenie liczy się **raz, w Ruście** (`json_check.rs`),
   jest zapisywane razem z wynikiem i idzie do obu eksportów, więc ekran i raport nie mogą się
   rozjechać. To informacja **obok** pomiaru, nigdy zamiast niego - odpowiedź zawsze widać w całości.
6. **Long context / summarization** – jak wyżej
7. **Response classification** – bez pomiaru tokens/s jako wyniku głównego; każda odpowiedź jest
   oznaczana **ręcznie** jedną z trzech etykiet: *Wykonał*, *Odmówił*, *Wykonał ale
   ograniczył/zmienił*. Historia zapisuje je jako **kody** (`label.completed`, …), nie jako tekst,
   więc przebieg oceniony po polsku czyta się tak samo po angielsku, a porównanie przebiegu sprzed
   miesiąca nie zależy od języka, jaki był wtedy ustawiony. Przebiegi ocenione przez starsze wersje
   (te zapisywały polski tekst) są nadal rozumiane.

### Sprawdzenia odpowiedzi (JSON i Python)

Oba sprawdzenia są **informacją obok pomiaru**, nigdy zamiast niego - tokens/s i TTFT mierzy się tak
samo dla odpowiedzi, która się parsuje, i dla takiej, która nie, a odpowiedź zawsze widać w całości.
Oba liczą się **raz, w Ruście** (`json_check.rs`, `python_check.rs`), są zapisywane razem z wynikiem
i idą do obu eksportów, więc ekran i raport nie mogą się rozjechać. Oba są zapisane jako **kody**
(`ok` / `syntax_error` / `no_code`), a nie jako zdania, bo interfejs mówi w siedmiu językach.

Sprawdzenie Pythona ma **trzy** stany, nie dwa, i o to właśnie chodzi: *poprawna składnia*,
*błąd składni* i *brak kodu Python*. Model, który odpowiedział prozą - albo w SQL-u, albo w
JavaScripcie - nie napisał złego kodu, tylko żaden, a oznaczenie tego ✗ byłoby nieprawdą.

Czego to sprawdzenie **nie** twierdzi: że kod jest poprawny, że się uruchomi, ani że robi to, o co
proszono. Mówi tylko, że odpowiedź się parsuje. Nigdy nie jest uruchamiane. W interfejsie kolumna
nazywa się `Python`, a werdykt brzmi *poprawna składnia*, a nie *poprawny kod* - właśnie po to, żeby
nie dało się tego nadinterpretować.

Pomiar przy wyborze parsera: **`rustpython-parser`** łapie brak wcięcia po dwukropku, które
`tree-sitter` po cichu składa w dwie osobne instrukcje - a brak wcięcia to najczęstszy błąd małych
modeli, czyli dokładnie ten przypadek, dla którego to sprawdzenie istnieje. `rustpython-parser`
rozumie też nowszą składnię (3.10 `match`, 3.12 typy w nawiasach kwadratowych, 3.12 f-stringi), więc
nowoczesna odpowiedź nie jest karana. Zależność od tree-sittera została usunięta.

Oba sprawdzenia można **wyłączyć w Ustawieniach** (Sprawdzenia i widok). Wyłączone znaczy, że
sprawdzenie **nie jest w ogóle liczone**: w wyniku zostaje „brak informacji” - nigdy „niepoprawne” -
a kolumna znika z wyników i z eksportu. Przełączniki są dwa, bo dotyczą różnych kategorii: kto
testuje kod w JavaScripcie, nie chce w każdym wierszu czytać „brak kodu Python”.

**Nazwy kategorii są zawsze po angielsku** (`Coding`, `Chat / creativity`, `Reasoning / math`,
`Structured output (JSON)`, `Long context / summarization`, `Images (VLM)`,
`Response classification`), niezależnie od języka interfejsu, i pozostają edytowalne. To tylko
etykiety - trzymanie dwóch wersji groziłoby ich rozjazdem. Istniejący `config.json` ze starymi
polskimi nazwami jest przenoszony raz, przy pierwszym wczytaniu - ale tylko gdy **żadna** ze znanych
kategorii nie została zmieniona ręcznie, żeby nie nadpisać Twojej nazwy.

**Żadna kategoria nie przychodzi z przykładowym promptem.** Wszystkie listy startują puste
i wypełniasz je sam, w języku, w którym chcesz - aplikacja nie zgadnie, w jakim języku myślisz.
To, co puste pole pokazuje, to **podpowiedź** (przykład pasujący do typu kategorii), i ta
podpowiedź idzie za językiem interfejsu.

### Wybór promptów do testu

Każdy prompt (także zadanie VLM: obraz + prompt) ma **checkbox**. Odznaczony prompt zostaje na
liście razem z treścią, ale nie trafia do przebiegu - można więc wyłączyć jeden prompt na czas
testu bez jego kasowania. W nagłówku kategorii jest zbiorcze *Zaznacz wszystkie* / *Odznacz
wszystkie*, a licznik pokazuje `1 z 2 promptów włączonych`. Kiedy wszystkie prompty kategorii są
odznaczone, kategoria jest pomijana (macierz w zakładce „Test” pokazuje wtedy `brak promptów`).

Format `config.json` przyjmuje oba warianty: stary (lista samych stringów) czyta się bez migracji -
brak informacji o wyłączeniu znaczy „prompt włączony”.

## Gdzie trafiają dane

- Konfiguracja i historia: katalog danych aplikacji (`%APPDATA%\com.aibenchmark.dev\`)
  - `config.json` – modele i kategorie
  - `settings.json` – język, nadpisania domyślnych system promptów, dwa sprawdzenia odpowiedzi
    i autoprzewijanie podglądu odpowiedzi
  - `history/<id>.json` – jeden plik na przebieg
- Eksporty: `Pobrane/AI Benchmark/`

## Szukaj modeli (katalog HuggingFace)

Druga zakładka przegląda i przeszukuje **repozytoria GGUF na HuggingFace** i przekazuje wybrane
repozytorium Ollamie - aplikacja nigdy nie pobiera wag sama.

- **Puste pole to katalog**, wpisane zapytanie to szukanie (z opóźnieniem 400 ms).
- Filtry stoją po lewej, a **każda grupa ma plakietkę, skąd pochodzi**: `HF` znaczy, że robotę robi
HuggingFace, `nasze` - że liczymy to tutaj z listy plików i z pamięci Twojej karty. Bez plakietki
nie da się odróżnić faktów z repozytorium od naszych szacunków.
- Rozmiary biorą się **z listy plików repozytorium**, nigdy z liczby parametrów:

| Reguła | Dlaczego |
|---|---|
| **projektor** (`mmproj-*`) nie jest wariantem | Ollama nie uruchomi go osobno, ale **pobiera go** razem z modelem z obrazami - dlatego wchodzi do rozmiaru, a liczba dostaje „≈” |
| wybieramy projektor `Q8_0`, a gdy go nie ma - najmniejszy | zmierzone: Ollama wzięła ten sam projektor `Q8_0` przy `:Q4_K_M` i przy `:Q8_0` z tego samego repozytorium, a na drugim modelu (InternVL3-2B) nasze przewidywanie zgodziło się z pobranymi bajtami co do bajtu |
| kwantyzacja rozbita na `-00001-of-00003` jest **pomijana, ale wymieniona z nazwy** | Ollama nie pobierze takiego tagu; ukrycie grupy wyglądałoby, jakby repozytorium miało mniej wariantów, niż ma |
| pliki szkicujące (`eagle3-*`) też nie są wariantami | to drugi model, nie kwantyzacja tego |
| tag zawsze `hf.co/<repo>:<plik>` | tag **bez** nazwy pliku pozwala Ollamie wybrać plik samej - zmierzone: sięgnęła po `Q4_K_M`, więc nasz rozmiar i pobrany mogłyby się rozjechać |
| etykieta kwantyzacji z listy znanych rodzin (`Q*`, `IQ*`, `F*`, `BF*`, `MXFP*`) | „token po ostatnim myślniku” nazwałby `IQ2_XS-mtp` kwantyzacją `mtp` |

- **Dodaj do Modeli** wrzuca wariant na listę modeli z **kategoriami wybranymi z góry**; pobieranie
to potem zwykłe `ollama pull` w zakładce „Modele”, z tym samym paskiem postępu.
- Repozytoria oznaczone jako **gated** dostają ostrzeżenie - wymagają zaakceptowania licencji na
HuggingFace, zanim Ollama je pobierze.
- Repozytoria czytamy partiami w tle, zakładka odświeża się **ręcznie** i nigdy nie odpytuje sama.

Jedna rzecz warta świadomości: **ten sam model z rejestru Ollamy i z HuggingFace może wypaść
inaczej**, bo szablon rozmowy i parser pochodzą z repozytorium. Dlatego każdy przebieg zapisuje swoje
**źródło**, a oba eksporty je niosą.

## Zarządzanie modelami

- **Rozmiar modelu** pokazuje się przy każdym wpisie, także dla modeli, których nie ma
  jeszcze na dysku:
  - pobrane → rozmiar na dysku z `GET /api/tags`,
  - niepobrane → suma warstw z manifestu w rejestrze Ollamy
    (`registry.ollama.ai/v2/<repo>/manifests/<tag>`) plus rozmiar parametrów i kwantyzacja
    z config bloba (`8.2B · Q4_K_M`).
  - To samo działa dla tagu wpisywanego właśnie w „Dodaj własny model” (z debounce), więc
    rozmiar widać **przed** dodaniem i pobraniem.
  - Modeli z `hf.co/...` nie da się zmierzyć w ten sposób (rejestr Ollamy ich nie zna), ale
    zakładka **Szukaj modeli** czyta własną listę plików repozytorium i pokazuje dokładny rozmiar
    każdego wariantu **razem z projektorem**, więc liczba jest znana **przed** pobraniem.
- **Pasek pobierania** znika po udanym pobraniu (potwierdzeniem jest komunikat, a nie zamrożony słupek);
  przy błędzie zostaje razem z treścią błędu. Postęp liczony jest **dla bieżącej warstwy** -
  Ollama przysyła `total`/`completed` jednej warstwy naraz, a warstwy mają skrajnie różne rozmiary
  (jedna bywa 90-bajtowym manifestem), więc przy zmianie warstwy licznik startuje od zera,
  a obok procentu widać pobrane bajty (`4.5 MB / 87.5 MB`).
- **Kosz** przy modelu to jedyna destrukcyjna akcja w tej zakładce, więc pokazuje wybór:
  „Tylko z listy” (nie rusza plików) albo „Usuń z dysku (rozmiar)” (`DELETE /api/delete`).
- **Podpowiedź kategorii** przy wpisywanym tagu. Ollama **nie publikuje przeznaczenia modelu**
  („kodowanie” / „rozmowa”) - ani w `/api/show`, ani w `/api/tags`, ani w manifeście rejestru.
  Jedyne twarde dane to `capabilities`, gdzie `vision` jednoznacznie oznacza model multimodalny,
  ale tylko dla modeli już pobranych. Dlatego aplikacja:
  - bierze kategorię z `capabilities`, gdy są dostępne (UI pokazuje wtedy „pewne”),
  - w innym wypadku zgaduje z nazwy (`-coder`, `llava`, `moondream`, `qwen`, `llama`, ...),
    a UI mówi wprost, że to heurystyka,
  - **nigdy nie nadpisuje ręcznego wyboru** użytkownika - kategoria ustawia się sama tylko
    wtedy, gdy żadna nie jest jeszcze wybrana,
  - nie zgaduje wcale dla nieznanych nazw (model trafia do „Bez przypisanej kategorii”).
- **Ostrzeżenie o obrazach**: model przypisany do kategorii Obrazy (VLM), który według
  `capabilities` nie obsługuje obrazów, dostaje ostrzeżenie w wierszu i w zakładce Test -
  zamiast cichego błędu w wynikach.

## Ustawienia modelu (parametry i system prompt)

Rozwinięcie **wiersza modelu w zakładce „Modele”** pokazuje jego panel ustawień, a wiersz dostaje
znaczek „własne parametry”, żeby z listy było widać, który model różni się od domyślnych. Panel
ustawia parametry generowania i system prompt **tylko dla tego modelu** i ma **przycisk zapisu**
oraz pasek niezapisanych zmian - przełączenie na inny model w trakcie edycji **nie gubi** wartości.

- **Parametry**: `temperature`, `top_p`, `top_k`, `repeat_penalty`, `num_ctx`, `num_predict`,
  `seed`, `num_gpu`. Puste pole = zostawiamy decyzję Ollamie, więc domyślnie nic nie wysyłamy.
- **„Wstaw proponowane”** to **nasze rekomendacje**, nie dane od Ollamy - Ollama nie publikuje
  zalecanych parametrów (dla `qwen2.5-coder:3b` pole `parameters` w `/api/show` jest puste).
  Jedyną twardą wartością z modelu jest jego maksymalny kontekst (`/api/tags`), którym
  ograniczamy proponowany `num_ctx`.
- **System prompt**: własny albo domyślny dla typu kategorii (poniżej). Domyślny prompt jest
  rozwiązywany **per para model × kategoria**, więc ten sam model w „Kodowaniu” i „Rozmowie”
  dostaje inny prompt bez duplikowania ustawień.
- Ustawienia są zapisywane **razem z wynikami przebiegu**, pokazane w zakładce „Wyniki”
  i w eksporcie CSV/HTML - po czasie widać, czym uzyskano dane liczby.

> Uwaga techniczna: Ollama przyjmuje w `options` klucze **snake_case** (`num_ctx`, `num_gpu`),
> a nieznane klucze po cichu pomija. camelCase wygląda więc na sukces, a nic nie robi - dlatego
> konwersja ma własny test regresyjny.

### Domyślne system prompty

Każdy typ kategorii ma własną, ogólną instrukcję, edytowalną w **Ustawieniach** (globalnie, per typ):

- **Kodowanie** – działający kod w bloku, bez powtarzania polecenia;
- **Rozmowa** – rzeczowo, bez lania wody, z przyznaniem się do niewiedzy;
- **Obrazy (VLM)** – opis tego, co widać, i nic więcej: temat, akcja, otoczenie, kolory,
  światło, styl, z wyraźnym „opisuj tylko to, co naprawdę widzisz”;
- **Klasyfikacja** – neutralny, żeby nie sugerować modelowi żadnej z trzech ocen.

**Wbudowane instrukcje są po angielsku w każdym języku interfejsu.** Nie ma ich w plikach językowych
w ogóle. Dwa powody, a drugi jest ten istotny:

- małe modele (ta aplikacja jest o modelach 3B-8B, czyli dokładnie tych, które gubią instrukcję)
  pewniej słuchają instrukcji po angielsku;
- **benchmark musi być powtarzalny.** Gdyby instrukcja szła za językiem interfejsu, ten sam model
  z tym samym promptem dostawałby inny tekst w zależności od tego, jaki język miałeś akurat otwarty
  - ukryta zmienna w narzędziu, którego całym zadaniem jest mierzenie. Instrukcja mówi też modelowi,
  żeby odpowiadał w języku pytania, więc polski prompt nadal dostaje polską odpowiedź.

Własne nadpisanie, które napiszesz, jest **jedno dla wszystkich języków**: to Twoja decyzja, nie tekst
interfejsu, więc zmiana języka nie podmienia go po cichu. Jedyna wbudowana instrukcja, która prosi
o odpowiedź po angielsku niezależnie od pytania, to ta dla obrazów - modele widzące z tej kategorii
(`llava`, `moondream`) są trenowane głównie na angielskim.

**Nie każdy model odbiera system prompt.** Aplikacja czyta szablon modelu (`/api/show`) i gdy
nie ma w nim `{{ .System }}`, pokazuje ostrzeżenie „ignoruje system prompt” - wtedy instrukcję
trzeba wpisać w samym prompcie. Tak ma np. `moondream`, którego szablon to
`Question: {{ .Prompt }} Answer: {{ .Response }}`.

## Pamięć modeli (VRAM)

Panel „Modele w pamięci (VRAM)” pokazuje, co Ollama trzyma w pamięci (`GET /api/ps`), i pozwala:

- **Załaduj** (`keep_alive: "30m"`) - model wchodzi do VRAM z góry, więc pierwszy prompt nie
  płaci za zimny start (w testach TTFT spadał z ~6,7 s do ~80 ms),
- **Zwolnij** / **Zwolnij wszystko** (`keep_alive: 0`) - zwraca pamięć karty,
- podejrzeć **podział GPU/CPU**: `/api/ps` podaje `size` i `size_vram`, więc widać np.
  `GPU 100% / CPU 0%` albo, przy `num_gpu`, częściowe offloadowanie warstw.

**Auto-zwalnianie przy starcie testu.** Modele biorące udział w bieżącym przebiegu zostają
w VRAM (jeśli test używa dwóch modeli, oba siedzą w pamięci równolegle), ale model pozostawiony
po poprzednim teście jest zwalniany *przed* pierwszą generacją, żeby nie zabierał pamięci
bez potrzeby. W panelu „Postęp na żywo” pojawia się wtedy informacja, co zostało zwolnione.
Ręczne „Zwolnij” / „Zwolnij wszystko” w zakładce „Modele” działa jak dotąd.

Podział jest mierzony **przy każdym promptcie** i trafia do wyników (kolumna **GPU/CPU**
w zakładkach „Test” i „Wyniki” oraz do eksportu). Steruje się nim przez `num_gpu`
w ustawieniach modelu - zmierzone na żywo na `qwen2.5-coder:3b` (`num_ctx: 2048`):

| `num_gpu` | Podział | tok/s | VRAM peak |
|---|---|---|---|
| puste (auto) | GPU 100 / CPU 0% | ~37 | ~3100 MB |
| `10` | GPU 34 / CPU 66% | ~6,2 | ~1825 MB |

> To podział **pamięci (warstw)**, nie czasu liczenia - Ollama nie udostępnia przez API
> podziału czasu między CPU i GPU. Spadek tok/s przy częściowym offloadzie bierze się
> z tego, że ⅔ warstw liczy procesor.

## Szacunek VRAM przed startem

Zakładka „Test” liczy przed startem, czy wybrane modele zmieszczą się na karcie. Szacunek opiera
się na tym, co da się naprawdę poznać:

- modele **już w pamięci** dostają dokładny rozmiar z `/api/ps`,
- modele **na dysku** dostają wagi z `/api/tags` plus KV cache policzony z metadanych
  architektury w `/api/show` (`block_count`, `attention.head_count_kv`, `embedding_length`),
- pamięć zajęta przez resztę systemu to `NVML used − to, co trzyma Ollama`.

Wzór na KV cache to `2 (K i V) × warstwy × głowy_kv × wymiar_głowy × 2 bajty (f16)`.
Został zweryfikowany empirycznie na tej maszynie: dla `qwen2.5-coder:3b` daje 36 864 B/token,
a `/api/ps` pokazuje przyrost 38 912 B/token między kontekstem 8192 i 16384 - różnica ~5%,
głównie zaokrąglenia alokacji. Dla całego modelu szacunek to 1841 + 288 + 64 MB = 2193 MB
przy zmierzonych 2292 MB, czyli ~4% poniżej.

Panel mówi wprost, że to **szacunek**, a nie pomiar, i rozróżnia **cztery** stany: na karcie /
na karcie bez zapasu / częściowo na CPU / nie uruchomi się wcale. Ten ostatni porównuje się z pamięcią
**karty i systemu razem**, bo model, który nie mieści się w VRAM, nadal może iść na CPU - dopiero to
drugie jest twardą granicą. Oznacza też przypadki, w których szacunek jest słabszy:
model niepobrany (nie ma czego potwierdzić przez `/api/ps`), brak metadanych architektury
(KV niepoliczony), model multimodalny (enkoder obrazu nie zawsze trafia do VRAM) oraz
ustawione `num_gpu` (część warstw może iść na CPU, więc realne zużycie bywa mniejsze).

### Cztery stany sprawdzone na prawdziwych wagach

Pomiar z 23 września (GTX 1060 6 GB, 16 GB RAM): karta miała **5113 MB wolne**, a RAM **7456 MB do
użycia** po rezerwie 1536 MB, więc „nie uruchomi się wcale" zaczynało się od **12 569 MB**. Trzy stany
potwierdzone na pobranych modelach, czwarty w katalogu (bez pobierania ani jednego bajta):

| model | prognoza | co było naprawdę |
|---|---|---|
| `qwen2.5-coder:3b` | na karcie, 2048 MB | `/api/ps` trzyma go w całości w VRAM, aplikacja pokazuje **GPU 100%** |
| `llava:7b` | na karcie, bez zapasu, 5090 MB | 3574 MB z 4597 MB w VRAM (**77,7%**), aplikacja pokazuje **GPU 78%** |
| `qwen3:8b` | częściowo na CPU, 5623 MB | 4141 MB z 5685 MB w VRAM (**72,8%**), aplikacja pokazuje **GPU 73%**, 5,5 tok/s |
| 72B GGUF w katalogu | nie uruchomi się wcale | najmniejszy wariant 22,1 GB, czyli powyżej budżetu 12 569 MB |

Trzy wnioski z tego porównania. Szacunek wypadł **1% pod** dla `qwen3:8b` (5623 prognozowane vs 5685
rzeczywiste) i **11% nad** dla `llava:7b` (5090 vs 4597). „Na karcie, bez zapasu" znaczy dokładnie to:
Ollama trzyma własny margines i **sama zrzuciła 22% `llava:7b` na procesor**, a kolumna GPU/CPU to
pokazała. Ta kolumna jest wiarygodna - zgodziła się z `/api/ps` **77,75% vs 78%**, czyli dwa odczyty
z dwóch różnych źródeł.

Katalog mówi o swoim ograniczeniu wprost, przy tabeli wariantów: dla plików z HuggingFace **KV cache
nie jest liczony**, bo HF nie podaje ani liczby warstw, ani liczby głów KV - więc liczba jest tam
**dolną granicą**. Dla tego samego modelu oba miejsca dają mimo to ten sam werdykt:
`Qwen2.5-Coder-3B` q4_k_m pokazuje w katalogu 2071 MB, a zainstalowany `qwen2.5-coder:3b` w zakładce
Test 2048 MB - i oba mówią „na karcie".

## Ustawienia i porządki

- **Sprawdzenia i widok** – dwa przełączniki sprawdzeń odpowiedzi (JSON, Python) i jeden dla
  autoprzewijania podglądu odpowiedzi. Wszystkie trzy są **domyślnie włączone**, a `settings.json`
  ze starszej wersji (bez tych pól) czyta się jako *włączone*, a nie po cichu wyłącza funkcje.
  Przeżywają restart aplikacji.
- **Czyszczenie historii** z podglądem: lista przebiegów do usunięcia i miejsce, które się zwolni,
  są liczone **przed** potwierdzeniem. Filtry: wszystkie / starsze niż N dni / tylko przerwane.
  Historia to jeden plik JSON na przebieg, więc można ją skopiować razem z folderem danych.
- **Pliki eksportu** usuwa **osobna** akcja - to Twoje pliki CSV/HTML i nigdy nie znikają razem
  z historią.
- **Przywróć domyślne** usuwa `settings.json` i wraca do wartości domyślnych. Modele, kategorie,
  historia i eksporty zostają nietknięte - właśnie dlatego ustawienia mieszkają w osobnym pliku,
  a nie w `config.json`.

## Narzędzia weryfikacyjne

Kilka skryptów pomocniczych do sprawdzania pipeline'u bez klikania w GUI:

```bash
# Sprawdza wywołania Ollamy 1:1 z tym, co robi ollama.rs (pull nie, generate tak):
# mierzy TTFT, tok/s i pokazuje zimny vs ciepły start.
node scripts/ollama-smoke.mjs qwen2.5-coder:3b

# Diagnostyka modeli VLM: wysyła obraz z kilkoma promptami i pokazuje surowy
# strumień (ile chunków, ile znaków, TTFT, eval_count, tok/s, done_reason).
# Przydatne, gdy model "nic nie mówi" - widać wtedy, czy to pusta odpowiedź.
# Na starcie wypisuje też szablon modelu i to, czy w ogóle używa pola `system`.
node scripts/vision-probe.mjs moondream "C:/sciezka/do/obrazu.jpg"

# ...albo sprawdź, czy model reaguje na pole `system`:
SYSTEM_PROMPT="Answer in English." node scripts/vision-probe.mjs moondream "C:/obraz.jpg"

# Steruje prawdziwym UI aplikacji przez Chrome DevTools Protocol.
# Wymaga tymczasowego debug portu - patrz nagłówek scripts/ui-drive.mjs.
# `source scripts/dev-ensure-app.sh && ensure_app` najpierw, gdy okno nie stoi:
# nic nie buduje, tylko uruchamia Vite i zbudowany plik i czeka.
cat expr.js | node scripts/ui-drive.mjs

# Zdjęcia prawdziwego okna tym samym protokołem, sterowane planem JSON:
# ustawia dokładny widok, potrafi najpierw poklikać w aplikacji (`prepare`)
# i zapisuje PNG. `capture: false` mierzy układ bez zapisywania pliku - tak
# powstały zdjęcia w `docs/screenshots`.
node scripts/screenshot.mjs plan.json

# Kompletność tłumaczeń w obie strony plus reguła długości każdego tekstu
# (etykieta, która wyrasta z kolumny, rozjeżdża układ).
npm run check:i18n

# Reguła wyglądu: żaden tekst w interfejsie nie może być mniejszy niż 12 px.
npm run check:ui
```

Testy jednostkowe backendu (logika eksportu, lista startowa modeli, ochrona
ścieżek, wykrywanie NVML, heurystyka kategorii, reguły wariantów GGUF i projektora,
podział GPU/CPU, wzór na KV cache, migracja promptów, źródło modelu):

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

## Metryki

- **TTFT** – czas od wysłania żądania do pierwszego tokenu (przy zimnym starcie zawiera wczytanie modelu)
- **tok/s** – `eval_count / eval_duration` z Ollamy; dodatkowo wariant mierzony naszym zegarem.
  Wartość jest **pomijana**, gdy pomiar nie ma sensu: Ollama potrafi zwrócić `eval_count: 1`
  z `eval_duration: 1000` (1 µs) przy pustej odpowiedzi, a dzielenie tego daje 1 000 000 tok/s.
- **VRAM peak** – najwyższe użycie pamięci GPU (NVML) w trakcie danego promptu

## Puste odpowiedzi

Ollama może zgłosić sukces, nie generując **ani jednego tokenu**. Zdarza się to małym modelom VLM -
na przykład `moondream` na prompt w innym języku niż angielski kończy od razu na EOS (0 znaków
odpowiedzi, `eval_count: 1`). Aplikacja nazywa to po imieniu, zamiast pokazywać puste pole
i bezsensowne metryki:

- w zakładce **Test** panel odpowiedzi pokazuje `(0 tokenów)` plus wyjaśnienie,
- w tabeli `tok/s` i `TTFT` pokazują `—`, a nie liczbę z kosmosu,
- w zakładce **Wyniki** jest kolumna **Puste odp.** licząca takie przypadki w danym przebiegu,
- przy rozwinięciu promptu widać podpowiedź, żeby spróbować promptu po angielsku.

## Gdy jakaś sekcja przestaje działać

Awaria w trakcie rysowania interfejsu zabierała **całe okno** i zostawiała puste miejsce — bez
komunikatu i bez śladu w logu backendu, więc objaw wskazywał zupełnie gdzie indziej niż przyczyna.
Każda zakładka ma teraz własną siatkę bezpieczeństwa: zepsuta część ustępuje miejsca komunikatowi
ze szczegółem technicznym i przyciskiem **Spróbuj ponownie**, a reszta aplikacji działa dalej
(pasek tytułu, status Ollamy i karty graficznej, pozostałe zakładki).

Przebieg testu to przeżywa, bo jego stan mieszka **poza** zakładką: jeśli wysypie się okno
klasyfikacji, przebieg stoi i czeka na Twoją etykietę. *Spróbuj ponownie* przywraca okno i możesz
kontynuować z odpowiedziami, które już są zebrane.

Tekst komunikatu jest celowo surowy (to błąd, a nie jego tłumaczenie) — właśnie ten fragment warto
przepisać przy zgłaszaniu problemu. Jedno miejsce zostało bez osłony: warstwa **nad** siatkami
(źródła danych aplikacji), żeby sam komunikat zawsze miał w jakim języku mówić.

## Licencja

**MIT** — patrz [LICENSE](LICENSE). Możesz tego używać, zmieniać i rozprowadzać, także komercyjnie;
zachowaj tylko notę o prawach autorskich i treść licencji w kopiach.

Licencja dotyczy **samej aplikacji**. Ollama ma własną licencję, a każdy pobrany model niesie
licencję repozytorium, z którego przyszedł — aplikacja modele pobiera, a nie zmienia im licencji.

