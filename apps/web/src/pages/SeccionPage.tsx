import { Link, useLocation, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { NivelBadge } from "../components/ui/NivelBadge";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { IconoDescarga, IconoEnlace } from "../components/ui/Icons";
import { HistoryChart } from "../components/charts/HistoryChart";
import { ShapBarChart } from "../components/charts/ShapBarChart";
import { useSeccion } from "../hooks/useSipa";
import { coloniasDeSeccion } from "../api/recursos";
import { formatEntero, formatKm, formatPct } from "../lib/format";
import { nivelDesdeAbstencion } from "../lib/riesgo";

export function SeccionPage() {
  const { id = "1234" } = useParams();
  /** La entidad viene del contexto de navegación (contrato: /secciones/{e}/{s}); */
  const entidad = (useLocation().state as { entidadClave?: string } | null)?.entidadClave ?? "26";
  const { data, isLoading } = useSeccion(id, entidad);

  if (isLoading || !data) {
    return <p className="text-[13px] text-ink-2">Cargando ficha de sección…</p>;
  }

  const nivel = nivelDesdeAbstencion(data.predicciones.media);
  const colonias = coloniasDeSeccion(data.claveSeccion);

  // Exporta la ficha completa a CSV (los datos, no una captura de pantalla)
  const exportarFicha = () => {
    const f = data.factoresTop;
    const filas = [
      ["campo", "valor"],
      ["seccion", data.claveSeccion],
      ["municipio", data.municipio],
      ["entidad", data.entidad],
      ["distrito_federal", data.distrito],
      ["modelo_version", data.modeloVersion],
      ["abstencion_predicha_pct", (data.predicciones.media * 100).toFixed(1)],
      ["p10_pct", (data.predicciones.p10 * 100).toFixed(1)],
      ["p90_pct", (data.predicciones.p90 * 100).toFixed(1)],
      ["amplitud_pp", data.predicciones.amplitudPp],
      ["lista_nominal", data.indicadores.listaNominal],
      ["dist_mac_km", data.indicadores.distMacKm],
      ["marginacion", data.indicadores.marginacion],
      ["pct_internet", data.indicadores.pctInternet],
      ["factor_variable", f.map((x) => x.variable).join(" | ")],
      ["factor_contribucion_pp", f.map((x) => (x.contribucion * 100).toFixed(2)).join(" | ")],
    ];
    const csv = filas.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `ficha-seccion-${data.claveSeccion}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  // Exporta solo los factores SHAP (aporte de cada variable a la predicción)
  const exportarShap = () => {
    const filas = [
      ["variable", "descripcion", "contribucion_pp"],
      ...data.factoresTop.map((f) => [
        f.variable,
        f.descripcion.replace(/,/g, " "),
        (f.contribucion * 100).toFixed(2),
      ]),
    ];
    const csv = filas.map((f) => f.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `shap-seccion-${data.claveSeccion}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Mapa de Riesgo", `Sección ${data.claveSeccion} · ${data.municipio}, ${data.entidad}`]}
        titulo={`Sección ${data.claveSeccion} · ${data.municipio}, ${data.entidad}`}
        badge={`DF ${data.distrito} · SECC ${data.claveSeccion}`}
        accion={
          <span className="text-[10px] text-ink-2">
            Cómputos INE 2018-2024 · Censo 2020 · Datos agregados
          </span>
        }
      />

      <div className="flex flex-1 flex-col space-y-3 overflow-auto bg-fondo p-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card
            titulo="Predicción 2027"
            accion={<span className="text-[10px] text-ink-2">Modelo: v{data.modeloVersion}</span>}
          >
            <div className="flex items-baseline gap-3">
              <span className="text-[32px] font-semibold text-ink tabular-nums">
                {formatPct(data.predicciones.media, 1)}
              </span>
              <NivelBadge nivel={nivel} />
            </div>
            <p className="mt-1 text-[12px] text-ink-2">
              Abstención estimada para la elección federal intermedia de 2027.
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-ink-2">
                  Intervalo de predicción P10 - P90 (regresión cuantílica)
                </span>
                <span className="text-[10px] italic text-ink-2">
                  Amplitud: {data.predicciones.amplitudPp} pp
                </span>
              </div>
              <div className="relative mt-2">
                <div className="h-px w-full bg-ink" />
                <div
                  className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 bg-ink"
                  style={{ left: `${(data.predicciones.p10 * 100).toFixed(1)}%` }}
                />
                <div
                  className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 bg-ink"
                  style={{ left: `${(data.predicciones.p90 * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-ink-2">
                <span>{formatPct(data.predicciones.p10)} (P10)</span>
                <span>{formatPct(data.predicciones.media)} (Media)</span>
                <span>{formatPct(data.predicciones.p90)} (P90)</span>
              </div>
            </div>
          </Card>

          <Card
            titulo="Indicadores operativos seccionales"
            accion={
              <Link to="/modelo" className="inline-flex items-center gap-1 text-[11px] text-acento hover:underline">
                <IconoEnlace /> Ver fuente de datos (DERFE)
              </Link>
            }
          >
            <dl className="divide-y divide-linea-2 text-[12px]">
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">Lista nominal</dt>
                <dd className="font-medium tabular-nums">{formatEntero(data.indicadores.listaNominal)} electores</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">Casillas</dt>
                <dd className="font-medium tabular-nums">{data.indicadores.electoresPorCasilla > 0
                    ? formatEntero(Math.max(1, Math.round(data.indicadores.listaNominal / data.indicadores.electoresPorCasilla)))
                    : "Sin dato"}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">Electores por casilla</dt>
                <dd className="font-medium tabular-nums">{formatEntero(data.indicadores.electoresPorCasilla)}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">Distancia MAC</dt>
                <dd className="font-medium tabular-nums">{data.indicadores.distMacKm > 0 ? formatKm(data.indicadores.distMacKm) : "Sin dato"}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">Marginación CONAPO</dt>
                <dd className="font-medium">{data.indicadores.marginacion}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">% Viviendas con internet</dt>
                <dd className="font-medium tabular-nums">{formatPct(data.indicadores.pctInternet)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card titulo="Histórico de abstención (2018-2027)" accion={<span className="text-[10px] text-ink-2">— Real | --- Proyección</span>}>            <HistoryChart historico={data.historico} />
            <p className="mt-2 text-[10px] italic text-ink-2">
              Abstención observada en los cómputos distritales del INE (diputaciones de mayoría relativa); 2027 es pronóstico.
            </p>
          </Card>
          <Card
            titulo="¿Por qué este riesgo? · Top 5 factores SHAP"
            accion={<span className="text-[10px] text-ink-2">Explicabilidad local (TreeSHAP)</span>}
          >
            <p className="mb-2 text-[10px] text-ink-2">
              Contribución marginal de atributos socio-electorales sobre el signo de abstención respecto a la media.
            </p>
            <ShapBarChart factores={data.factoresTop} />
            <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-2">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-[#B2182B]" /> Aumenta abstención</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-[#67A9CF]" /> Disminuye abstención</span>
            </div>
          </Card>
        </div>

        <div className="flex items-center justify-between border-t border-linea bg-fondo px-1 py-2 text-[11px] text-ink-2">
          <span>
            Distrito electoral federal {data.distrito} · {data.municipio}, {data.entidad} · Datos agregados, sin datos personales
            {colonias.length > 0 && (
              <> · Cubre {colonias.length < 3
                ? colonias.map((c) => `Col. ${c.colonia}`).join(" y ")
                : `las colonias ${colonias.map((c) => `Col. ${c.colonia}`).join(", ")}`}</>
            )}
          </span>
          <div className="flex gap-2">
            <Button variante="secundario" onClick={exportarFicha}><IconoDescarga /> Exportar ficha completa (CSV)</Button>
            <Button variante="secundario" onClick={exportarShap}><IconoDescarga /> Exportar Datos SHAP (CSV)</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
