import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { TourGuiado } from "../components/ui/TourGuiado";
import { LevelDistribution } from "../components/charts/LevelDistribution";
import { Legend } from "../components/map/Legend";
import { RiskMap } from "../components/map/RiskMap";
import { MexicoStatesMap } from "../components/map/MexicoStatesMap";
import { ColoniaSearch } from "../components/map/ColoniaSearch";
import { useEntidades, useGeo, useModelo, useMunicipios, useRiesgo, useRiesgoNacional } from "../hooks/useSipa";
import { entidadesConGeo } from "../api/recursos";
import { abstencionPromedio, contarPorNivel, nivelDesdeAbstencion } from "../lib/riesgo";
import { formatEntero, formatPct } from "../lib/format";

const TODOS = "__todos__";
const VISTA_NACIONAL = "00";

interface Filtros {
  entidad: string;
  municipio: string;
  distrito: string;
  nivel: string;
  escenario: string;
}

const INICIAL: Filtros = {
  entidad: VISTA_NACIONAL,
  municipio: TODOS,
  distrito: TODOS,
  nivel: TODOS,
  escenario: "inercial",
};

export function MapaPage() {
  const navigate = useNavigate();
  const [borrador, setBorrador] = useState<Filtros>(INICIAL);
  const [filtros, setFiltros] = useState<Filtros>(INICIAL);

  const entidades = useEntidades();
  const esNacional = filtros.entidad === VISTA_NACIONAL;
  const claveEntidadDatos = esNacional ? VISTA_NACIONAL : filtros.entidad;
  const municipios = useMunicipios(claveEntidadDatos, !esNacional);
  const geo = useGeo(claveEntidadDatos, !esNacional);
  const riesgo = useRiesgo({ entidad: claveEntidadDatos }, !esNacional);
  const riesgoNacional = useRiesgoNacional();
  const modelo = useModelo();

  const todos = useMemo(() => riesgo.data?.secciones ?? [], [riesgo.data]);

  const sinMunicipiosDemo = !esNacional && claveEntidadDatos !== "26";
  const opcionesMunicipios = useMemo(
    () => [
      { valor: TODOS, texto: sinMunicipiosDemo ? "Sin datos en la demo (solo Sonora)" : `Todos (${municipios.data?.length ?? 0})` },
      ...(municipios.data ?? []).map((m) => ({ valor: m, texto: m })),
    ],
    [municipios.data, sinMunicipiosDemo],
  );

  const visibles = useMemo(
    () =>
      todos.filter(
        (s) =>
          (filtros.municipio === TODOS || s.municipio === filtros.municipio) &&
          (filtros.distrito === TODOS || String(s.distrito) === filtros.distrito) &&
          (filtros.nivel === TODOS || s.nivel === filtros.nivel),
      ),
    [todos, filtros.municipio, filtros.distrito, filtros.nivel],
  );

  const filtrado = riesgo.data ? { ...riesgo.data, secciones: visibles } : undefined;
  const porNivel = contarPorNivel(visibles);

  const entidadesConDatos = useMemo(
    () => new Set((riesgoNacional.data?.entidades ?? []).map((e) => e.clave)),
    [riesgoNacional.data],
  );
  /** Entidades que cumplen el filtro de nivel aplicado (vista nacional) */
  const entidadesVisibles = useMemo(() => {
    const lista = riesgoNacional.data?.entidades ?? [];
    if (filtros.nivel === TODOS) return lista;
    return lista.filter((e) => nivelDesdeAbstencion(e.abstencionPredicha) === filtros.nivel);
  }, [riesgoNacional.data, filtros.nivel]);
  const abstencionPorEntidad = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entidadesVisibles) {
      m.set(e.clave, e.abstencionPredicha);
    }
    if (!esNacional && riesgo.data?.secciones.length) {
      m.set(claveEntidadDatos, abstencionPromedio(riesgo.data.secciones));
    }
    return m;
  }, [entidadesVisibles, riesgo.data, esNacional, claveEntidadDatos]);
  const umbrales =
    (esNacional ? riesgoNacional.data?.umbrales : riesgo.data?.umbrales) ?? undefined;
  const resumenNacional = useMemo(() => {
    if (entidadesVisibles.length === 0) return undefined;
    const entidades = entidadesVisibles;
    const totalSecciones = entidades.reduce((acc, e) => acc + e.secciones, 0);
    const ponderada =
      entidades.reduce((acc, e) => acc + e.abstencionPredicha * e.secciones, 0) / totalSecciones;
    const porNivel = contarPorNivel(
      entidades.map((e) => ({ nivel: nivelDesdeAbstencion(e.abstencionPredicha) })) as never,
    );
    return { entidades: entidades.length, totalSecciones, ponderada, porNivel };
  }, [entidadesVisibles]);

  const seccionesPorEntidad = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of riesgoNacional.data?.entidades ?? []) m.set(e.clave, e.secciones);
    return m;
  }, [riesgoNacional.data]);

  /** Entidades con cartografía disponible (vía /geo/{entidad}/{municipio} del contrato). */
  const entidadesConCartografia = useMemo(() => entidadesConGeo(), []);

  const irAEntidad = (clave: string) => {    const next = { ...borrador, entidad: clave, municipio: TODOS, distrito: TODOS };
    setBorrador(next);
    setFiltros(next);
  };

  const cambiar = (parcial: Partial<Filtros>) => {
    const next = { ...borrador, ...parcial };
    if (parcial.entidad) {
      next.municipio = TODOS;
      next.distrito = TODOS;
    }
    setBorrador(next);
    // Aplicado en vivo: el mapa responde al instante (sin botón intermedio)
    setFiltros({
      ...next,
      municipio: next.entidad === VISTA_NACIONAL ? TODOS : next.municipio,
      distrito: next.entidad === VISTA_NACIONAL ? TODOS : next.distrito,
    });
  };
  const limpiar = () => {
    setBorrador(INICIAL);
    setFiltros(INICIAL);
  };

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Mapa de Riesgo"]}
        titulo="Mapa de riesgo de abstención 2027"
        descripcion="Toca cualquier estado para abrir su vista por secciones · filtra, busca una colonia o pulsa una sección para ver su ficha."
        badge="Entorno federal 2027"
      />

      <div
        className="flex flex-wrap items-end gap-3 border-b border-linea bg-white px-3 py-2"
        data-tour="filtros"
      >
        <div className="w-40">
          <Select
            etiqueta="Entidad"
            value={borrador.entidad}
            onChange={(e) => cambiar({ entidad: e.target.value, municipio: TODOS, distrito: TODOS })}
            opciones={(entidades.data ?? []).map((e) => ({
              valor: e.clave,
              texto: e.nombre,
            }))}
          />
        </div>
        <ColoniaSearch entidadClave={borrador.entidad} />
        <div className="w-44" title={sinMunicipiosDemo ? "La demo solo tiene catálogo de municipios para Sonora; con la API real se carga el de cada entidad" : "Municipios con secciones cartografiadas en la demo"}>
          <Select
            etiqueta="Municipio"
            value={borrador.municipio}
            disabled={borrador.entidad === VISTA_NACIONAL}
            onChange={(e) => cambiar({ municipio: e.target.value })}
            opciones={opcionesMunicipios}
          />
        </div>
        <div className="w-36" title="El API v1 entrega el distrito federal solo por sección (en la ficha), no en la lista de riesgo. Vendrá como filtro cuando el contrato lo incluya.">
          <Select
            etiqueta="Distrito"
            value={TODOS}
            disabled
            onChange={() => undefined}
            opciones={[{ valor: TODOS, texto: "Pendiente en el API v1" }]}
          />
        </div>
        <div className="w-40">
          <Select
            etiqueta="Nivel de riesgo"
            value={borrador.nivel}
            onChange={(e) => cambiar({ nivel: e.target.value })}
            opciones={[
              { valor: TODOS, texto: "Todos" },
              { valor: "MUY_ALTO", texto: "Muy Alto" },
              { valor: "ALTO", texto: "Alto" },
              { valor: "MEDIO", texto: "Medio" },
              { valor: "BAJO", texto: "Bajo" },
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            etiqueta="Escenario"
            value={borrador.escenario}
            disabled
            onChange={() => undefined}
            opciones={[{ valor: "inercial", texto: "Inercial 2027" }]}
          />
        </div>
        <Button className="ml-auto" variante="secundario" onClick={limpiar}>
          Limpiar
        </Button>
      </div>

      <p className="flex items-center gap-2 border-b border-linea bg-fondo px-3 py-1 text-[11px] text-ink-2">
        <span title="La geometría electoral se muestra sobre el mapa base de OpenStreetMap">
          Escenario inercial 2027 · Cómputos INE 2018–2024 · Mapa OpenStreetMap
        </span>
        {!esNacional && claveEntidadDatos !== "26" && (
          <span className="border border-[#B45309] bg-[#FFFBEB] px-1.5 py-0.5 text-[#92400E]">
            Demo: secciones cartografiadas solo en Sonora
          </span>
        )}
        {claveEntidadDatos === "26" && (
          <span title="La demo solo incluye 10 municipios de Sonora; con la API real se cargan los 72">
            Demo: 10 de 72 municipios de Sonora
          </span>
        )}
      </p>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:divide-x md:divide-linea">
        <div
          className="relative h-[45vh] w-full shrink-0 bg-white md:h-auto md:w-[70%]"
          data-tour="mapa"
        >
          {esNacional ? (
            <MexicoStatesMap
              entidadesConDatos={entidadesConDatos}
              conSecciones={entidadesConCartografia}
              abstencionPromedioPorEntidad={abstencionPorEntidad}
              seccionesPorEntidad={seccionesPorEntidad}
              umbrales={umbrales}
              onSeleccionEntidad={(clave) => irAEntidad(clave)}
            />
          ) : geo.data && geo.data.features.length > 0 && filtrado ? (
            <RiskMap
              geo={geo.data}
              riesgo={filtrado}
              onSeleccion={(id) =>
                navigate(`/seccion/${id}`, { state: { entidadClave: claveEntidadDatos } })
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-fondo p-6">
              <div className="max-w-[380px] border border-linea bg-white p-5 text-center">
                <h3 className="text-[14px] font-semibold text-ink">
                  {entidades.data?.find((e) => e.clave === filtros.entidad)?.nombre ?? "Esta entidad"}
                  : secciones aún sin cartografía en la demo
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
                  Esta entidad participa en el mapa nacional con su nivel de riesgo estimado. Con la
                  API real del INE se cargan sus secciones aquí.
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className="w-full space-y-3 overflow-auto bg-fondo p-3 md:w-[30%]"
          data-tour="panel"
        >
          <Card titulo="Resumen">
            <div className="divide-y divide-linea-2 text-[13px]">
              {esNacional && resumenNacional ? (
                <>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-ink-2">Entidades</span>
                    <span className="font-semibold tabular-nums">
                      {formatEntero(resumenNacional.entidades)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-ink-2">Secciones</span>
                    <span className="font-semibold tabular-nums">
                      {formatEntero(resumenNacional.totalSecciones)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-ink-2">Abstención ponderada</span>
                    <span className="font-semibold tabular-nums">
                      {formatPct(resumenNacional.ponderada)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-ink-2">Secciones</span>
                    <span className="font-semibold tabular-nums">{formatEntero(visibles.length)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-ink-2">Abstención promedio</span>
                    <span className="font-semibold tabular-nums">
                      {formatPct(abstencionPromedio(visibles))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card
            titulo={esNacional ? "Distribución por nivel (entidades)" : "Distribución por nivel"}
            sinPadding
          >
            {esNacional && resumenNacional ? (
              <LevelDistribution porNivel={resumenNacional.porNivel} unidad="Entidades" />
            ) : filtrado ? (
              <LevelDistribution porNivel={porNivel} />
            ) : (
              <p className="p-3 text-[13px] text-ink-2">Cargando…</p>
            )}
          </Card>

          <Card titulo="Leyenda de corte">
            <Legend umbrales={umbrales} />
          </Card>

          <Card
            titulo="Convergencia del modelo"
            accion={
              <span
                role="status"
                aria-label={
                  modelo.data
                    ? "Convergencia verificada: el modelo está listo"
                    : "Verificando convergencia"
                }
                title="Estado, no botón: indica que la convergencia del modelo fue verificada"
                className={`rounded-sm border px-1.5 py-0.5 text-[10px] uppercase ${
                  modelo.data
                    ? "border-[#31703e] bg-[#e7f3ea] text-[#31703e]"
                    : "border-linea text-ink-2"
                }`}
              >
                {modelo.data ? "Verificado" : "…"}
              </span>
            }
          >
            {modelo.data ? (
              <>
                <p className="text-[12px] text-ink-2">
                  RMSE (validación OOT 2024):{" "}
                  {modelo.data.metricas.find((m) => m.nombre.includes("RMSE"))?.modelo ?? "—"} pp.
                  Modelo {modelo.data.version} · {modelo.data.algoritmo}.
                </p>
                <div className="mt-2 flex gap-4 text-[11px] text-ink-2">
                  <span>
                    R²:{" "}
                    {modelo.data.metricas.find((m) => m.nombre.startsWith("R²"))?.modelo ?? "—"}
                  </span>
                  <span>Entrenamiento: {modelo.data.entrenamiento}</span>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-ink-2">Cargando métricas del modelo…</p>
            )}
          </Card>
        </div>
      </div>

      <TourGuiado
        pasos={[
          {
            sel: '[data-tour="filtros"]',
            titulo: "Filtros que responden al instante",
            texto:
              "Cambia entidad, municipio, distrito o nivel de riesgo: el mapa y las cifras se actualizan solos. Usa Limpiar para regresar todo.",
          },
          {
            sel: '[data-tour="mapa"]',
            titulo: "Mapa navegable de México",
            texto:
              "Toca un estado con color para ver sus secciones electorales (Sonora en esta demo). Selecciona una sección para abrir su ficha con predicción e histórico.",
          },
          {
            sel: '[data-tour="panel"]',
            titulo: "Análisis a la derecha",
            texto:
              "Resumen del entorno, distribución por nivel de riesgo, leyenda con los umbrales fijos del modelo y convergencia.",
          },
          {
            sel: 'a[href="/simulador"]',
            titulo: "Simula una intervención",
            texto:
              "En el Simulador mueves las palancas que el INE controla (casillas, módulos MAC, campaña digital) y comparas el escenario A contra el B.",
            cta: "Ir al simulador",
            ctaRuta: "/simulador",
          },
        ]}
      />
    </div>
  );
}
