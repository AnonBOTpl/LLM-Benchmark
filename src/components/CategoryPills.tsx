import { Sparkles } from "lucide-react";

import { LABEL } from "./ui";
import { useI18n } from "../lib/i18n";
import type { Category } from "../lib/types";

/**
 * Pigułki kategorii - jedno miejsce dla trzech miejsc, które robią to samo:
 * formularz „Dodaj własny model”, panel modelu i wiersz wyszukiwarki.
 *
 * Powód wyciągnięcia jest praktyczny, nie estetyczny: **te same pigułki**
 * pojawiły się w trzech miejscach, a każda kopia to osobne miejsce, w którym
 * można zapomnieć o wyłączonej kategorii albo o tytule podpowiedzi. Różnią się
 * tylko układem etykiety i tym, czy pokazujemy pigułkę sugestii - stąd dwa
 * opcjonalne pola, a nie dwa komponenty.
 */
export function CategoryPills({
  categories,
  active,
  onToggle,
  label,
  suggestion = null,
  stacked = false,
  className = "",
}: {
  categories: Category[];
  /** Id kategorii już wybranych. */
  active: string[];
  onToggle: (categoryId: string) => void;
  /** Etykieta po lewej (albo nad pigułkami, gdy `stacked`). */
  label?: string;
  /**
   * Sugestia kategorii. Pokazujemy ją **tylko**, gdy nie jest jeszcze wybrana -
   * pigułka, która nic nie zmienia, wygląda na zepsutą.
   */
  suggestion?: { id: string; name: string; title: string } | null;
  /** Etykieta nad pigułkami zamiast obok nich (formularz dodawania). */
  stacked?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  const pills = (
    <div className={`flex flex-wrap items-center gap-1.5 ${stacked ? "mt-2" : ""}`}>
      {categories.map((category) => {
        const chosen = active.includes(category.id);
        return (
          <button
            key={category.id}
            className={`${chosen ? "chip-on" : "chip-off"} text-[12px]`}
            title={t("models.row.assign_tip")}
            onClick={() => onToggle(category.id)}
          >
            {category.name}
          </button>
        );
      })}
      {suggestion && !active.includes(suggestion.id) ? (
        <button
          className="chip-off text-[12px]"
          title={suggestion.title}
          onClick={() => onToggle(suggestion.id)}
        >
          <Sparkles size={11} className="mr-1" />
          {t("models.row.suggest", { name: suggestion.name })}
        </button>
      ) : null}
    </div>
  );

  if (!label) return <div className={className}>{pills}</div>;

  return stacked ? (
    <div className={className}>
      <span className={LABEL}>{label}</span>
      {pills}
    </div>
  ) : (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className={LABEL}>{label}</span>
      {pills}
    </div>
  );
}
