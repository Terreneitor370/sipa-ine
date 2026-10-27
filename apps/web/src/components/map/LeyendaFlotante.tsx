import { COLOR_NIVEL, ETIQUETA_NIVEL, NIVELES } from "../../lib/riesgo";

/** Rango en % a partir de { min, max } (fracciones 0-1). */
function rango(min: number | null, max: number | null): string {
  const p = (v: number) => `${(v * 100).toFixed(1)}%`.replace(".0%", "%");
  if (min == null && max != null) return `< ${p(max)}`;
  if (min != null && max == null) return `≥ ${p(min)}`;
  if (min != null && max != null) return `${p(min)} – ${p(max)}`;
  return "";
}

/**
 * Leyenda compacta fijada sobre el mapa (RNF-05: leyenda siempre visible),
 * para no depender del panel derecho en pantallas pequeñas.
 */
export function LeyendaFlotante({ umbrales }: { umbrales?: Record<string, { min: number | null; max: number | null }> | null }) {
  const u = umbrales ?? {
    MUY_ALTO: { min: 0.559, max: null },
    ALTO: { min: 0.522, max: 0.559 },
    MEDIO: { min: 0.485, max: 0.522 },
    BAJO: { min: null, max: 0.485 },
  };
  return (
    <div className="absolute bottom-8 left-2 z-[450] w-[150px] border border-linea bg-white/95 px-2 py-1.5 text-[10px] leading-relaxed text-ink">
      <p className="mb-1 font-semibold uppercase tracking-wide text-ink-2">Nivel de riesgo</p>
      <ul className="space-y-0.5">
        {NIVELES.map((nivel) => (
          <li key={nivel} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 border border-black/10"
                style={{ backgroundColor: COLOR_NIVEL[nivel] }}
              />
              {ETIQUETA_NIVEL[nivel]}
            </span>
            <span className="tabular-nums text-ink-2">{rango(u[nivel]?.min ?? null, u[nivel]?.max ?? null)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
