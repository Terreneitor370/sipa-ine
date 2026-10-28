import type { NivelRiesgo } from "../../types/api";
import { COLOR_NIVEL, ETIQUETA_NIVEL, NIVELES } from "../../lib/riesgo";
import { formatPct } from "../../lib/format";

export function Legend({
  umbrales,
}: {
  umbrales?: Record<NivelRiesgo, { min: number | null; max: number | null }>;
}) {
  return (
    <div aria-label="Leyenda de niveles de riesgo">
      <ul className="divide-y divide-linea-2" data-testid="leyenda">
        {NIVELES.map((nivel) => {
          const u = umbrales?.[nivel];
          const rango = u
            ? u.min !== null && u.max !== null
              ? `${formatPct(u.min)} – ${formatPct(u.max)}`
              : u.min !== null
                ? `≥ ${formatPct(u.min)}`
                : `< ${formatPct(u.max!)}`
            : "";
          return (
            <li key={nivel} className="flex items-center gap-2 py-1.5 text-[11px] text-ink-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 border border-black/10"
                style={{ backgroundColor: COLOR_NIVEL[nivel] }}
              />
              <span className="font-medium text-ink">{ETIQUETA_NIVEL[nivel]}</span>
              {rango && <span className="ml-auto tabular-nums">{rango}</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] italic text-ink-2">
        Umbrales fijos por versión de modelo (v1.2.0). No se recalculan por cuantiles del escenario
        (ADR-05).
      </p>
    </div>
  );
}
