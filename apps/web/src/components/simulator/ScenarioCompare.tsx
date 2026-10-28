import type { ResumenNivel } from "../../types/api";
import { ETIQUETA_NIVEL, NIVELES } from "../../lib/riesgo";

export function ScenarioCompare({
  porNivelA,
  porNivelB,
}: {
  porNivelA: ResumenNivel;
  porNivelB: ResumenNivel;
}) {
  const maxDelta = Math.max(
    1,
    ...NIVELES.map((n) => Math.abs(porNivelB[n] - porNivelA[n])),
  );

  return (
    <table className="w-full text-[12px]" data-testid="scenario-compare">
      <thead>
        <tr className="bg-tabla text-left text-[10px] uppercase tracking-wide text-ink-2">
          <th className="px-2 py-1.5 font-semibold">Nivel</th>
          <th className="px-2 py-1.5 text-right font-semibold">Escenario A</th>
          <th className="px-2 py-1.5 text-right font-semibold">Escenario B</th>
          <th className="px-2 py-2 text-right font-semibold">Δ pp</th>
          <th className="px-3 py-2">Impacto relativo</th>
        </tr>
      </thead>
      <tbody>
        {NIVELES.map((nivel) => {
          const delta = porNivelB[nivel] - porNivelA[nivel];
          const ancho = (Math.abs(delta) / maxDelta) * 100;
          const color = delta <= 0 ? "#d5007f" : "#B2182B";
          return (
            <tr key={nivel} className="border-t border-linea-2">
              <td className="py-1.5">{ETIQUETA_NIVEL[nivel]}</td>
              <td className="py-1.5 text-right tabular-nums text-ink-2">{porNivelA[nivel]}</td>
              <td className="py-1.5 text-right tabular-nums">{porNivelB[nivel]}</td>
              <td
                className={`py-1.5 text-right font-semibold tabular-nums ${
                  delta < 0 ? "text-acento" : delta > 0 ? "text-riesgo-muy-alto" : "text-ink-2"
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </td>
              <td className="py-1.5 pl-3">
                <span
                  className="block h-2"
                  style={{ width: `${ancho}%`, background: color }}
                  data-testid={`barra-${nivel}`}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
