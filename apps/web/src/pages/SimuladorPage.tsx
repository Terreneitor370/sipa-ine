import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { KpiCard } from "../components/ui/KpiCard";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { PalancasPanel } from "../components/simulator/PalancasPanel";
import { ScenarioCompare } from "../components/simulator/ScenarioCompare";
import { RiskMap } from "../components/map/RiskMap";
import { useGeo, useRiesgo, useSimulacion, useEscenarios, useEntidades } from "../hooks/useSipa";
import type { Palancas, SimulacionResumen } from "../types/api";
import { formatEntero, formatPp, formatPct } from "../lib/format";
import { nombreEntidad } from "../lib/adaptadores";

const PALANCAS_INICIALES: Palancas = {
  reduccionElectoresCasilla: 0.2,
  distMacMaxKm: null,
  campanaDigital: { efectoPp: 1, cobertura: 0.5 },
  focalizacion: { niveles: ["MUY_ALTO", "ALTO"], municipios: [] },
};

export function SimuladorPage() {
  const [nombre, setNombre] = useState("Simulación operativa 2027");
  /** Entidad del escenario: la demo trae cartografía de Sonora, pero el
   * simulador funciona con cualquier entidad desde el contrato. */
  const [entidad, setEntidad] = useState("26");
  const [palancas, setPalancas] = useState<Palancas>(PALANCAS_INICIALES);
  const [resultado, setResultado] = useState<SimulacionResumen | null>(null);

  const entidades = useEntidades();
  const geo = useGeo(entidad);
  const riesgo = useRiesgo({ entidad });
  const escenarios = useEscenarios();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useSimulacion();

  /** En la demo solo Sonora tiene secciones: con otra entidad no se simula. */
  const sinSecciones = !riesgo.isLoading && (riesgo.data?.secciones.length ?? 0) === 0;

  const ejecutar = () => {
    if (sinSecciones) return;
    mutate(
      { nombre, entidad, palancas },
      {
        onSuccess: (res) => {
          setResultado(res);
          // RF-08: el escenario queda guardado; se refresca el listado
          void queryClient.invalidateQueries({ queryKey: ["escenarios"] });
        },
      },
    );
  };

  /** Primera simulación automática al entrar y recálculo al mover palancas
   * o cambiar de entidad (borrando el resultado desactualizado). */
  const tempo = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    setResultado(null);
    if (riesgo.isLoading || sinSecciones) return;
    clearTimeout(tempo.current);
    tempo.current = setTimeout(ejecutar, 400);
    return () => clearTimeout(tempo.current);
    // `nombre` no dispara recálculo; ejecutar es estable por cierre del render
  }, [palancas, entidad, riesgo.data, sinSecciones]);

  const deltaAbstencion = resultado
    ? (resultado.resumen.abstencionPromedio.B - resultado.resumen.abstencionPromedio.A) * 100
    : 0;

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Simulador"]}
        titulo="Simulador de escenarios"
        descripcion="Mueve las palancas y compara qué pasa: escenario A (inercial) vs B (intervención)."
        badge={`Escenario · ${entidades.data?.find((e) => e.clave === entidad)?.nombre ?? nombreEntidad(Number(entidad))}`}
      />

      <div className="flex-1 overflow-auto bg-fondo p-3">
        <div className="grid gap-3 lg:grid-cols-[2fr_3fr]">
          <Card
            titulo="Palancas de intervención"
            accion={
              <Button onClick={ejecutar} disabled={isPending || sinSecciones}>
                {isPending ? "Calculando…" : "Recalcular"}
              </Button>
            }
          >
            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-2">
                Entidad del escenario
              </span>
              <select
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                className="h-8 w-full rounded-sm border border-linea bg-white px-2 text-[13px] text-ink outline-none focus:border-acento"
              >
                {(entidades.data ?? [{ clave: entidad, nombre: `Entidad ${entidad}` }])
                  .filter((e) => e.clave !== "00")
                  .map((e) => (
                    <option key={e.clave} value={e.clave}>
                      {e.nombre}
                    </option>
                  ))}
              </select>
            </label>
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
            {sinSecciones ? (
            <div className="border border-[#B45309] bg-[#FFFBEB] p-4 text-[12px] leading-relaxed text-[#92400E]">
              <p className="font-semibold">
                La demo solo tiene secciones de Sonora
              </p>
              <p className="mt-1">
                Elige <strong>Sonora</strong> en "Entidad del escenario" para simular con la
                cartografía disponible; con la API real del INE el simulador funcionará con
                cualquiera de las 32 entidades.
              </p>
            </div>
          ) : (
            <>
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
                <p className="col-span-2 text-[11px] leading-relaxed text-ink-2 xl:col-span-4">
                  <strong className="font-semibold text-ink">Unidades:</strong> A = escenario
                  inercial; B = con las palancas. Δ en{" "}
                  <dfn title="Puntos porcentuales: 50 % → 51 % es 1 pp.">pp</dfn> de abstención.
                </p>
              </div>

              <Card titulo="Impacto por nivel de riesgo">
                {resultado ? (
                  <ScenarioCompare
                    porNivelA={resultado.resumen.porNivel.A}
                    porNivelB={resultado.resumen.porNivel.B}
                  />
                ) : (
                  <p className="py-4 text-center text-[12px] text-ink-2">
                    Calculando la comparación A vs B…
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
                <Card titulo="Escenario B · secciones focalizadas" sinPadding>
                  <div className="h-[260px]">
                    {geo.data && riesgo.data ? (
                      <RiskMap
                        geo={geo.data}
                        riesgo={riesgo.data}
                        resaltadas={(s) =>
                          palancas.focalizacion.niveles.includes(s.nivel) &&
                          (palancas.focalizacion.municipios.length === 0 ||
                            palancas.focalizacion.municipios.includes(s.municipio))
                        }
                      />
                    ) : (
                      <p className="p-3 text-[12px] text-ink-2">Cargando cartografía…</p>
                    )}
                  </div>
                </Card>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-2">
                El mapa B resalta en vino las secciones que toca la intervención (los niveles y
                municipios elegidos en las palancas); el resto se atenúa.
              </p>
            </>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <Card titulo="Escenarios guardados">
              <p className="text-[11px] text-ink-2">
                Cada simulación que calculas queda guardada, con quién la creó y cuántos votos
                recuperables proyectó.
              </p>
              {escenarios.isLoading ? (
                <p className="py-3 text-[12px] text-ink-2">Cargando escenarios guardados…</p>
              ) : (escenarios.data?.length ?? 0) > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {escenarios.data!.slice(0, 6).map((e) => (
                    <li
                      key={e.escenarioId}
                      className="flex items-center justify-between gap-2 border border-linea bg-white px-2 py-1.5 text-[12px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{e.nombre}</p>
                        <p className="text-[10px] text-ink-2">
                          {e.entidadNombre} · {e.creadoPor} ·{" "}
                          {e.creadoEn ? new Date(e.creadoEn).toLocaleDateString("es-MX") : "—"}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-[12px] font-semibold text-ink">
                        {e.votosRecuperables.toLocaleString("es-MX")} votos
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-[12px] text-ink-2">
                  Aún no hay escenarios guardados: calcula uno arriba y aparecerá aquí.
                </p>
              )}
            </Card>
          </div>

          <div className="border-l-2 border-[#B45309] bg-[#FFFBEB] px-3 py-2 text-[11px] leading-4 text-[#92400E]">
            <span className="font-semibold uppercase tracking-wide">Supuesto · </span>
            el efecto de la campaña digital es una estimación exógena, no se aprende de los datos y
            la reducción proyectada no está garantizada.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
