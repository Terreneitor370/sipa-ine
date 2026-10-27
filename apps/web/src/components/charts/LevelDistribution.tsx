import type { ResumenNivel } from "../../types/api";
import { COLOR_NIVEL, ETIQUETA_NIVEL, NIVELES } from "../../lib/riesgo";
import { formatEntero } from "../../lib/format";

export function LevelDistribution({
  porNivel,
  unidad = "Secciones",
}: {
  porNivel: ResumenNivel;
  unidad?: string;
}) {
  const total = NIVELES.reduce((acc, n) => acc + porNivel[n], 0);
  return (
    <table className="w-full text-[12px]" data-testid="distribucion-nivel">
      <thead>
        <tr className="bg-tabla text-left text-[10px] uppercase tracking-wide text-ink-2">
          <th className="px-1 py-1 font-medium">Nivel</th>
          <th className="px-1 py-1 text-right font-medium">{unidad}</th>
          <th className="px-1 py-1 text-right font-medium">%</th>
        </tr>
      </thead>
      <tbody>
        {NIVELES.map((nivel) => (
          <tr key={nivel} className="h-8 border-b border-linea-2">
            <td className="px-1">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 border border-black/10"
                  style={{ backgroundColor: COLOR_NIVEL[nivel] }}
                />
                {ETIQUETA_NIVEL[nivel]}
              </span>
            </td>
            <td className="px-1 text-right tabular-nums">{formatEntero(porNivel[nivel])}</td>
            <td className="px-1 text-right tabular-nums text-ink-2">
              {total ? `${((porNivel[nivel] / total) * 100).toFixed(1)}%` : "—"}
            </td>
          </tr>
        ))}
        <tr className="h-8 bg-tabla font-semibold">
          <td className="px-1">Total</td>
          <td className="px-1 text-right tabular-nums">{formatEntero(total)}</td>
          <td className="px-1 text-right tabular-nums">100.0%</td>
        </tr>
      </tbody>
    </table>
  );
}
