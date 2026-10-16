import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { IconoFiltro } from "../components/ui/Icons";
import { LevelDistribution } from "../components/charts/LevelDistribution";
import { Legend } from "../components/map/Legend";
import { RiskMap } from "../components/map/RiskMap";
import { useEntidades, useGeo, useMunicipios, useRiesgo } from "../hooks/useSipa";
import { abstencionPromedio, contarPorNivel } from "../lib/riesgo";
import { formatEntero, formatPct } from "../lib/format";

const TODOS = "__todos__";

interface Filtros {
  entidad: string;
  municipio: string;
  distrito: string;
  nivel: string;
  escenario: string;
}

const INICIAL: Filtros = {
  entidad: "26",
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
  const municipios = useMunicipios(filtros.entidad);
  const geo = useGeo(filtros.entidad);
  const riesgo = useRiesgo({ entidad: filtros.entidad });

  const todos = useMemo(() => riesgo.data?.secciones ?? [], [riesgo.data]);

  const opcionesMunicipios = useMemo(
    () => [
      { valor: TODOS, texto: `Todos (${municipios.data?.length ?? 0})` },
      ...(municipios.data ?? []).map((m) => ({ valor: m, texto: m })),
    ],
    [municipios.data],
  );

  const opcionesDistritos = useMemo(() => {
    const unicos = [...new Set(todos.map((s) => s.distrito))].sort((a, b) => a - b);
    return [
      { valor: TODOS, texto: `Todos (${unicos.length})` },
      ...unicos.map((d) => ({ valor: String(d), texto: `Distrito ${d}` })),
    ];
  }, [todos]);

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
  const nombreEntidad = entidades.data?.find((e) => e.clave === filtros.entidad)?.nombre ?? "Sonora";

  const cambiar = (parcial: Partial<Filtros>) => setBorrador((b) => ({ ...b, ...parcial }));
  const aplicar = () => setFiltros({ ...borrador, municipio: borrador.municipio });

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Mapa de Riesgo"]}
        badge="Entorno federal 2027"
      />

      <div className="flex flex-wrap items-end gap-3 border-b border-linea bg-white px-3 py-2">
        <div className="w-40">
          <Select
            etiqueta="Entidad"
            value={borrador.entidad}
            onChange={(e) => cambiar({ entidad: e.target.value, municipio: TODOS, distrito: TODOS })}
            opciones={(entidades.data ?? [{ clave: "26", nombre: "Sonora" }]).map((e) => ({
              valor: e.clave,
              texto: e.nombre,
            }))}
          />
        </div>
        <div className="w-44">
          <Select
            etiqueta="Municipio"
            value={borrador.municipio}
            onChange={(e) => cambiar({ municipio: e.target.value })}
            opciones={opcionesMunicipios}
          />
        </div>
        <div className="w-36">
          <Select
            etiqueta="Distrito"
            value={borrador.distrito}
            onChange={(e) => cambiar({ distrito: e.target.value })}
            opciones={opcionesDistritos}
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
        <Button className="ml-auto" onClick={aplicar}>
          <IconoFiltro />
          Aplicar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-linea bg-fondo px-3 py-1 text-[11px] text-ink-2">
        <span>PROYECCIÓN: escenario inercial 2027</span>
        <span className="text-linea">|</span>
        <span>CAPA: polígonos de sección electoral</span>
        <span className="text-linea">|</span>
        <span>{nombreEntidad.toUpperCase()}: {municipios.data?.length ?? "—"} municipios</span>
        <span className="text-linea">|</span>
        <span>&#9632; GEOMETRÍA: muestrario sintético (mocks)</span>
        <span className="text-linea">|</span>
        <span>FUENTE: cómputos INE 2018–2024</span>
      </div>

      <div className="flex min-h-0 flex-1 divide-x divide-linea">
        <div className="w-[70%] bg-white">
          {geo.data && filtrado ? (
            <RiskMap
              geo={geo.data}
              riesgo={filtrado}
              onSeleccion={(id) => navigate(`/seccion/${id}`)}
            />
          ) : (
            <p className="p-4 text-[13px] text-ink-2">Cargando cartografía y predicciones…</p>
          )}
        </div>

        <div className="w-[30%] space-y-3 overflow-auto bg-fondo p-3">
          <Card
            titulo="Resumen"
            accion={<span className="text-[10px] uppercase text-ink-2">Estadística 2027</span>}
          >
            <div className="divide-y divide-linea-2 text-[13px]">
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
            </div>
          </Card>

          <Card
            titulo="Distribución por nivel"
            accion={<span className="text-[10px] text-ink-2">N={formatEntero(visibles.length)}</span>}
            sinPadding
          >
            {filtrado ? (
              <LevelDistribution porNivel={porNivel} />
            ) : (
              <p className="p-3 text-[13px] text-ink-2">Cargando…</p>
            )}
          </Card>

          <Card
            titulo="Leyenda de corte"
            accion={<span className="text-[10px] uppercase text-ink-2">Umbrales</span>}
          >
            <Legend umbrales={riesgo.data?.umbrales} />
          </Card>

          <Card
            titulo="Convergencia del modelo"
            accion={
              <span className="rounded-sm border border-linea px-1.5 py-0.5 text-[10px] text-ink-2">
                PENDIENTE
              </span>
            }
          >
            <p className="text-[12px] text-ink-2">
              El informe de convergencia (RMSE serial, iteraciones, R² ajustado) se mostrará cuando
              la API exponga la métrica del modelo activo. Este panel no usa valores de ejemplo.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
