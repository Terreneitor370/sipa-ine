import type { NivelRiesgo } from "../../types/api";
import { COLOR_NIVEL, ETIQUETA_NIVEL } from "../../lib/riesgo";

/** Etiqueta de nivel (rectángulo plano, sin redondeo completo) para encabezados. */
export function NivelBadge({ nivel }: { nivel: NivelRiesgo }) {
  return (
    <span
      className="inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase text-white"
      style={{ backgroundColor: COLOR_NIVEL[nivel] }}
      data-testid={`nivel-${nivel}`}
    >
      {ETIQUETA_NIVEL[nivel]}
    </span>
  );
}

/** Cuadro sólido de color + nombre al lado (tablas, según spec 04). */
export function CuadroNivel({ nivel }: { nivel: NivelRiesgo }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-ink-2">
      <span
        className="inline-block h-3 w-3 shrink-0 border border-black/10"
        style={{ backgroundColor: COLOR_NIVEL[nivel] }}
      />
      {ETIQUETA_NIVEL[nivel]}
    </span>
  );
}
