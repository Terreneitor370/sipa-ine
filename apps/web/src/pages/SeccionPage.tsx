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

  /** Utilidad: genera y descarga un CSV con BOM (para que Excel respete acentos),
   * separado por comas y con cabeceras en español. */
  const descargarCsv = (nombre: string, filas: string[][]) => {
    const csv =
      "\uFEFF" + filas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  // Exporta la ficha completa a CSV (los datos, no una captura de pantalla)
  const exportarFicha = () => {
    const f = data.factoresTop;
    const campo = (v: string, u: string) => `${v} (${u})`;
    const filas: string[][] = [
      ["Sección (clave INE)", data.claveSeccion],
      ["Distrito electoral federal", String(data.distrito)],
      ["Municipio", data.municipio],
      ["Entidad federativa", data.entidad],
      ["Versión del modelo", data.modeloVersion],
      [campo("Abstención predicha 2027", "% de lista nominal"), (data.predicciones.media * 100).toFixed(1)],
      [campo("Abstención límite inferior (P10)", "%"), (data.predicciones.p10 * 100).toFixed(1)],
      [campo("Abstención límite superior (P90)", "%"), (data.predicciones.p90 * 100).toFixed(1)],
      [campo("Amplitud de la predicción", "puntos porcentuales"), String(data.predicciones.amplitudPp)],
      [campo("Lista nominal", "electores"), formatEntero(data.indicadores.listaNominal)],
      [campo("Distancia al módulo de atención (MAC) más cercano", "km"), String(data.indicadores.distMacKm)],
      ["Nivel de marginación", data.indicadores.marginacion],
      [campo("Viviendas con internet", "%"), String(data.indicadores.pctInternet)],
      ["Factores principales del modelo (SHAP)", f.map((x) => x.descripcion).join(" | ")],
      [campo("Contribución de cada factor", "puntos porcentuales"), f.map((x) => (x.contribucion * 100).toFixed(2)).join(" | ")],
    ];
    descargarCsv(`ficha-seccion-${data.claveSeccion}.csv`, filas);
  };

  // Exporta solo los factores SHAP (aporte de cada variable a la predicción)
  const exportarShap = () => {
    const filas: string[][] = [
      ["Factor del modelo (qué es)", "Variable técnica", "Contribución (puntos porcentuales)"],
      ...data.factoresTop.map((f) => [
        f.descripcion,
        f.variable,
        (f.contribucion * 100).toFixed(2),
      ]),
    ];
    descargarCsv(`factores-seccion-${data.claveSeccion}.csv`, filas);
  };

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Mapa de Riesgo", `Sección ${data.claveSeccion} · ${data.municipio}, ${data.entidad}`]}
        titulo={`Sección ${data.claveSeccion} · ${data.municipio}, ${data.entidad}`}
        badge={`DF ${data.distrito} · SECC ${data.claveSeccion}`}
        accion={
          <span className="flex items-center gap-3">
            <Link to="/" className="text-[11px] text-acento hover:underline">
              &larr; Volver al mapa
            </Link>
            <span className="text-[10px] text-ink-2">
              Datos agregados · corte ene 2025
            </span>
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
              Probabilidad estimada de abstención para la elección concurrente intermedia 2027.
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-ink-2">
                  Intervalo de credibilidad bayesiana (P10 - P90)
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
                <dd className="font-medium tabular-nums">{formatEntero(data.indicadores.listaNominal / 4000 < 1 ? 1 : Math.round(data.indicadores.listaNominal / data.indicadores.electoresPorCasilla)) || "18"}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">Electores por casilla</dt>
                <dd className="font-medium tabular-nums">{formatEntero(data.indicadores.electoresPorCasilla)}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-ink-2">Distancia MAC</dt>
                <dd className="font-medium tabular-nums">{formatKm(data.indicadores.distMacKm)}</dd>
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
              Comportamiento electoral registrado en actas de escrutinio DERFE. | Nivel de confianza: 95%
            </p>
          </Card>
          <Card
            titulo="¿Por qué este riesgo? · Top 5 factores SHAP"
            accion={<span className="text-[10px] text-ink-2">Explicabilidad Local (KernelSHAP)</span>}
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
