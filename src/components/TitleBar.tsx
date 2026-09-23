import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

import { isTauri } from "../lib/api";
import { useI18n } from "../lib/i18n";

export function TitleBar() {
  const { t } = useI18n();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    const appWindow = getCurrentWindow();
    let dispose: (() => void) | undefined;

    appWindow
      .isMaximized()
      .then(setMaximized)
      .catch(() => undefined);

    appWindow
      .onResized(() => {
        appWindow
          .isMaximized()
          .then(setMaximized)
          .catch(() => undefined);
      })
      .then((unlisten) => {
        dispose = unlisten;
      })
      .catch(() => undefined);

    return () => dispose?.();
  }, []);

  const minimize = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isTauri()) return;
    await getCurrentWindow().minimize();
  };

  const toggleMaximize = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isTauri()) return;
    await getCurrentWindow().toggleMaximize();
  };

  const close = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isTauri()) return;
    await getCurrentWindow().close();
  };

  return (
    <div className="relative flex h-11 shrink-0 items-center justify-between border-b border-ink-700/70 bg-ink-900 px-3">
      {/* Drag region - sits behind everything so buttons stay clickable */}
      <div data-tauri-drag-region className="absolute inset-0 z-0" />

      <div className="pointer-events-none relative z-10 flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-400 to-indigo-500">
          <span className="text-[12px] font-bold text-ink-950">AI</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-100">AI Benchmark</span>
          <span className="text-[12px] text-slate-500">{t("app.subtitle")}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-0.5">
        <button
          onClick={minimize}
          title={t("window.minimize")}
          className="flex h-7 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-ink-700 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={toggleMaximize}
          title={maximized ? t("window.restore") : t("window.maximize")}
          className="flex h-7 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-ink-700 hover:text-white"
        >
          <Square size={12} />
        </button>
        <button
          onClick={close}
          title={t("common.close")}
          className="flex h-7 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/80 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
