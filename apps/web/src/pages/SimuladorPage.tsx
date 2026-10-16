import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { KpiCard } from "../components/ui/KpiCard";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { PalancasPanel } from "../components/simulator/PalancasPanel";
import { ScenarioCompare } from "../components/simulator/ScenarioCompare";
import { RiskMap } from "../components/map/RiskMap";
import { useGeo, useRiesgo, useSimulacion } from "../hooks/useSipa";
import type { Palancas, SimulacionResumen } from "../types/api";
import { formatEntero, formatPp, formatPct } from "../lib/format";

const PALANCAS_INICIALES: Palancas = {
  reduccionElectoresCasilla: 0.2,
  distMacMaxKm: null,
  campanaDigital: { efectoPp: 1, cobertura: 0.5 },
  focalizacion: { niveles: ["MUY_ALTO", "ALTO"], municipios: [] },
};

export function SimuladorPage() {
  const [nombre, setNombre] = useState("Simulación operativa 2027");
  const [palancas, setPalancas] = useState<Palancas>(PALANCAS_INICIALES);
  const [resultado, setResultado] = useState<SimulacionResumen | null>(null);

  const geo = useGeo("26");
  const riesgo = useRiesgo({ entidad: "26" });
  const { mutate, isPending } = useSimulacion();

  const ejecutar = () => {
    mutate(
      { nombre, entidad: "26", palancas },
      { onSuccess: (res) => setResultado(res) },
    );
  };

  const deltaAbstencion = resultado
    ? (resultado.resumen.abstencionPromedio.B - resultado.resumen.abstencionPromedio.A) * 100
    : 0;

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Simulador"]}
        titulo="Simulador de Escenarios"
        badge="ESCENARIOS · SONORA"
        accion={<span className="text-[10px] text-ink-2">Comparación A (inercial) vs B (intervención)</span>}
      />

      <div className="flex-1 overflow-auto bg-fondo p-3">
        <div className="grid gap-3 lg:grid-cols-[2fr_3fr]">
          <Card
            titulo="Palancas de intervención"
            accion={
              <Button onClick={ejecutar} disabled={isPending}>
                {isPending ? "Calculando…" : "Ejecutar simulación"}
              </Button>
            }
          >
            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-2">
                Nombre del escenario
              </span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="h-8 w-full rounded-sm border border-linea bg-white px-2 text-[13px] text-ink outline-none focus:border-acento"
              />
            </label>
            <PalancasPanel palancas={palancas} onChange={setPalancas} />
          </Card>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard
                etiqueta="Secciones afectadas"
                valor={resultado ? formatEntero(resultado.resumen.seccionesAfectadas) : "—"}
              />
              <KpiCard
                etiqueta="Abstención A"
                valor={resultado ? formatPct(resultado.resumen.abstencionPromedio.A, 1) : "—"}
              />
              <KpiCard
                etiqueta="Abstención B"
                valor={resultado ? formatPct(resultado.resumen.abstencionPromedio.B, 1) : "—"}
                detalle={resultado ? formatPp(deltaAbstencion) : undefined}
              />
              <KpiCard
                etiqueta="Votos recuperables"
                valor={resultado ? formatEntero(resultado.resumen.votosRecuperables) : "—"}
              />
            </div>

            <Card titulo="Impacto por nivel de riesgo">
              {resultado ? (
                <ScenarioCompare
                  porNivelA={resultado.resumen.porNivel.A}
                  porNivelB={resultado.resumen.porNivel.B}
                />
              ) : (
                <p className="py-4 text-center text-[12px] text-ink-2">
                  Ejecuta la simulación para comparar el escenario A contra el B.
                </p>
              )}
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card titulo="Escenario A · inercial" sinPadding>
                <div className="h-[260px]">
                  {geo.data && riesgo.data ? (
                    <RiskMap geo={geo.data} riesgo={riesgo.data} />
                  ) : (
                    <p className="p-3 text-[12px] text-ink-2">Cargando cartografía…</p>
                  )}
                </div>
              </Card>
              <Card titulo="Escenario B · intervención" sinPadding>
                <div className="flex h-[260px] items-center justify-center border border-dashed border-linea bg-tabla p-4">
                  <p className="text-center text-[11px] text-ink-2">
                    La geometría por sección del escenario B se incorpora cuando el contrato
                    exponga el escenario en <code>/riesgo</code>. Por ahora el impacto se resume por
                    nivel.
                  </p>
                </div>
              </Card>
            </div>

            <div className="border-l-2 border-[#B45309] bg-[#FFFBEB] px-3 py-2 text-[11px] leading-4 text-[#92400E]">
              <span className="font-semibold uppercase tracking-wide">Supuesto · </span>
              el efecto de la campaña digital no se aprende de los datos: es una estimación exógena
              parametrizable sujeta a calibración empírica. La reducción es estimada por el modelo,
              no garantizada.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
