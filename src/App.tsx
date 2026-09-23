import { useState } from "react";
import { BarChart3, Cpu, ListChecks, Play, Search, Settings as SettingsIcon } from "lucide-react";

import { TitleBar } from "./components/TitleBar";
import { ClassifyModal, ErrorScreen, LoadingScreen } from "./components/ClassifyModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CategoriesTab } from "./tabs/CategoriesTab";
import { ModelsTab } from "./tabs/ModelsTab";
import { ResultsTab } from "./tabs/ResultsTab";
import { SearchTab } from "./tabs/SearchTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { TestTab } from "./tabs/TestTab";
import { AppProvider, useApp } from "./lib/store";
import { I18nProvider, useI18n } from "./lib/i18n";
import { Pill } from "./components/ui";

/**
 * Zakładka „Szukaj” stoi **druga**, zaraz po „Modele”, bo to ten sam temat:
 * skąd wziąć model. Kolejność jest decyzją, nie przypadkiem - najpierw lista
 * tego, co mam, potem katalog tego, czego jeszcze nie mam.
 */
type TabId = "models" | "search" | "categories" | "test" | "results" | "settings";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "models", label: "nav.models", icon: <Cpu size={15} /> },
  { id: "search", label: "nav.search", icon: <Search size={15} /> },
  { id: "categories", label: "nav.categories", icon: <ListChecks size={15} /> },
  { id: "test", label: "nav.test", icon: <Play size={15} /> },
  { id: "results", label: "nav.results", icon: <BarChart3 size={15} /> },
  { id: "settings", label: "nav.settings", icon: <SettingsIcon size={15} /> },
];

function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  // Tabs stay mounted so a running benchmark keeps its state and listeners
  // alive while the user looks at another tab.
  return <div className={active ? "h-full overflow-y-auto" : "hidden"}>{children}</div>;
}

function Shell() {
  const { ready, bootError, status, vram, classifyRequest } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("models");

  return (
    <div className="flex h-full flex-col">
      <TitleBar />

      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-ink-700/70 bg-ink-900/60 px-3">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              /* `whitespace-nowrap`: przy minimalnej szerokości okna (1000 px)
                 sześć zakładek zostawiało 20 px zapasu - bez tego etykieta
                 niemiecka zawijałaby się do dwóch linii i pasek rósł. */
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-ink-800 text-white shadow-inner"
                  : "text-slate-400 hover:bg-ink-850 hover:text-slate-200"
              }`}
            >
              <span className={active ? "text-accent-400" : ""}>{entry.icon}</span>
              {t(entry.label)}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <Pill
            tone={status?.running ? "ok" : "bad"}
            title={status?.error ?? status?.endpoint}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status?.running ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            {status?.running ? `Ollama ${status.version ?? ""}`.trim() : "Ollama offline"}
          </Pill>
          <Pill
            tone={vram?.available ? "accent" : vram ? "warn" : "neutral"}
            title={vram?.error ?? vram?.name ?? undefined}
          >
            GPU:{" "}
            {!vram
              ? t("app.reading")
              : vram.available
                ? `${Math.round(vram.usedMb)} / ${Math.round(vram.totalMb)} MB`
                : t("gpu.nvml_unavailable")}
          </Pill>
        </div>
      </div>

      <main className="min-h-0 flex-1">
        {bootError ? (
          <ErrorScreen error={bootError} />
        ) : !ready ? (
          <LoadingScreen message={t("app.loading_config")} />
        ) : (
          <>
            {/* Osłona **na zakładkę**, bo zakładki są zamontowane na stałe:
                bez tego awaria w jednej z nich zabierałaby widok wszystkim,
                a przebieg w tle nie miałby czego pokazać. */}
            <TabPanel active={tab === "models"}>
              <ErrorBoundary>
                <ModelsTab />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel active={tab === "search"}>
              <ErrorBoundary>
                <SearchTab />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel active={tab === "categories"}>
              <ErrorBoundary>
                <CategoriesTab />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel active={tab === "test"}>
              <ErrorBoundary>
                <TestTab />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel active={tab === "results"}>
              <ErrorBoundary>
                <ResultsTab />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel active={tab === "settings"}>
              <ErrorBoundary>
                <SettingsTab />
              </ErrorBoundary>
            </TabPanel>
          </>
        )}
      </main>

      {/* Okno klasyfikacji ma **własną** osłonę w wersji `overlay`: to ono
          kiedyś położyło całą aplikację, a przy awarii okna przebieg nadal
          czeka na etykietę - więc komunikat ma stanąć w jego miejscu. */}
      {classifyRequest ? (
        <ErrorBoundary titleKey="error.window_title" variant="overlay">
          <ClassifyModal request={classifyRequest} />
        </ErrorBoundary>
      ) : null}
    </div>
  );
}

/**
 * Język interfejsu pochodzi z zapisanych ustawień, więc dostawca tłumaczeń
 * musi być **wewnątrz** `AppProvider`. Do czasu wczytania `settings.json`
 * działamy na domyślnym angielskim - i taki jest domyślny język aplikacji.
 */
function Localized() {
  const { settings } = useApp();
  return (
    <I18nProvider language={settings?.language ?? "en"}>
      {/* Najwyższa osłona stoi **wewnątrz** dostawcy tłumaczeń, bo komunikat
          musi być w języku interfejsu - nad dostawcą nie miałaby skąd wziąć
          tekstu. Łapie to, co poza zakładkami: pasek, nawigację, okno. */}
      <ErrorBoundary titleKey="error.window_title">
        <Shell />
      </ErrorBoundary>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Localized />
    </AppProvider>
  );
}
