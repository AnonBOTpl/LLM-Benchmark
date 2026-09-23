import type { InstalledModel } from "./types";

/**
 * Ollama zwraca nazwy **z tagiem** (`moondream:latest`), a użytkownik wpisuje
 * go czasem bez (`moondream`). Bez tego dopasowania pobrany model wyglądałby
 * na niepobrany, a jego `capabilities` byłyby niedostępne - co psuło zarówno
 * znacznik „pobrany”, jak i wykrywanie obsługi obrazów.
 */
export function installedEntry(
  installed: InstalledModel[] | undefined | null,
  tag: string,
): InstalledModel | undefined {
  const list = installed ?? [];
  return (
    list.find((entry) => entry.name === tag) ??
    list.find((entry) => entry.name === `${tag}:latest`)
  );
}
