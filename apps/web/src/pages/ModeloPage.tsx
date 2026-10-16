import { Card } from "../components/ui/Card";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { Disclaimer } from "../components/ui/Disclaimer";
import { GainImportanceChart } from "../components/charts/GainImportanceChart";
import { useModelo } from "../hooks/useSipa";

export function ModeloPage() {
  const { data, isLoading } = useModelo();

  if (isLoading || !data) {
    return <p className="p-3 text-[12px] text-ink-2">Cargando model card…</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Modelo"]}
        titulo="Especificación y validación del modelo"
        badge={`v${data.version} · PRODUCCIÓN`}
        accion={<span className="text-[10px] text-ink-2">{data.algoritmo}</span>}
      />

      <div className="flex-1 space-y-3 overflow-auto bg-fondo p-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card titulo="Métricas vs baseline inercial">
            <table className="w-full text-[12px]" data-testid="tabla-metricas">
              <thead>
                <tr className="bg-tabla text-left text-[10px] uppercase tracking-wide text-ink-2">
                  <th className="px-3 py-2 font-semibold">Métrica</th>
                  <th className="px-3 py-2 text-right font-semibold">Modelo</th>
                  <th className="px-3 py-2 text-right font-semibold">Baseline</th>
                  <th className="px-3 py-2 text-right font-semibold">Mejora</th>
                </tr>
              </thead>
              <tbody>
                {data.metricas.map((m) => (
                  <tr key={m.nombre} className="h-8 border-t border-linea-2">
                    <td className="px-3">{m.nombre}</td>
                    <td className="px-3 text-right font-semibold tabular-nums">{m.modelo ?? "—"}</td>
                    <td className="px-3 text-right tabular-nums text-ink-2">{m.baseline ?? "—"}</td>
                    <td className="px-3 text-right font-semibold tabular-nums text-acento">
                      {m.mejora ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[10px] text-ink-2">
              Entrenamiento {data.entrenamiento} · prueba {data.prueba}
            </p>
          </Card>

          <Card titulo="Importancia global de variables (gain)">
            <GainImportanceChart importancia={data.importanciaVariables} />
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card titulo="Fuentes de datos">
            <ul className="list-inside list-disc space-y-1 text-[12px] text-ink">
              {data.fuentes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Card>
          <Card titulo="Limitaciones metodológicas">
            <ul className="list-inside list-disc space-y-1 text-[12px] text-ink">
              {data.limitaciones.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Disclaimer />
      </div>
    </div>
  );
}
