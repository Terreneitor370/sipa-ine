import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { CuadroNivel } from "../components/ui/NivelBadge";
import { useEscenarios, usePriorizacion } from "../hooks/useSipa";
import { formatEntero, formatPct } from "../lib/format";
import { ETIQUETA_NIVEL, NIVELES } from "../lib/riesgo";
import { nombreEntidad } from "../lib/adaptadores";
import type { FilaPriorizacion } from "../types/api";

/** Para descargar CSV con acentos correctos en Excel y cabeceras legibles. */
function descargarCsv(nombre: string, filas: string[][]) {
  const csv =
    "\uFEFF" + filas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

type CampoOrden = "claveSeccion" | "abstencionA" | "abstencionB" | "deltaPp" | "votosRecuperables";

function abstencionB(f: FilaPriorizacion): number {
  return f.abstencionA + f.deltaPp / 100;
}

export function PriorizacionPage() {
  // Se prioriza el escenario más reciente del simulador
  const escenarios = useEscenarios();
  const ESCENARIO_ID = escenarios.data?.[0]?.escenarioId ?? 0;
  const { data, isLoading } = usePriorizacion(ESCENARIO_ID);
  const [nivel, setNivel] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [top, setTop] = useState("50");
  const [orden, setOrden] = useState<{ campo: CampoOrden; dir: "asc" | "desc" }>({
    campo: "votosRecuperables",
    dir: "desc",
  });

  const filas = useMemo(() => {
    const valor = (f: FilaPriorizacion, campo: CampoOrden): number | string => {
      if (campo === "claveSeccion") return f.claveSeccion;
      if (campo === "abstencionB") return abstencionB(f);
      return f[campo];
    };
    const ordenadas = (data?.filas ?? [])
      .filter(
        (f) =>
          (nivel === "" || f.nivel === nivel) &&
          (municipio === "" || f.municipio.toLowerCase().includes(municipio.toLowerCase())),
      )
      .sort((a, b) => {
        const va = valor(a, orden.campo);
        const vb = valor(b, orden.campo);
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es-MX");
        return orden.dir === "asc" ? cmp : -cmp;
      });
    const n = top === "" ? ordenadas.length : Number(top);
    return ordenadas.slice(0, n);
  }, [data, nivel, municipio, top, orden]);

  const totalRecuperables = filas.reduce((acc, f) => acc + f.votosRecuperables, 0);

  const exportarCsv = () => {
    descargarCsv(`priorizacion-escenario-${ESCENARIO_ID}.csv`, [
      ["Sección (clave INE)", "Municipio", "Lista nominal (electores)", "Nivel sin intervención"],
      ["Abstención A (%)", "Abstención B (%)", "Δ PP (puntos porcentuales)", "Votos recuperables"],
      ...filas.map((f) => [
        f.claveSeccion,
        f.municipio,
        formatEntero(f.listaNominal),
        ETIQUETA_NIVEL[f.nivel],
        (f.abstencionA * 100).toFixed(1),
        (abstencionB(f) * 100).toFixed(1),
        f.deltaPp.toFixed(1),
        formatEntero(f.votosRecuperables),
      ]),
    ]);
  };

  const alternarOrden = (campo: CampoOrden) => {
    setOrden((o) =>
      o.campo === campo
        ? { campo, dir: o.dir === "asc" ? "desc" : "asc" }
        : { campo, dir: campo === "claveSeccion" ? "asc" : "desc" },
    );
  };

  /** Entidades presentes en el ranking (multientidad cuando el backend sirva todo México). */
  const entidadesRango = useMemo(
    () =>
      [...new Set((data?.filas ?? []).map((f) => f.entidad))]
        .map((c) => nombreEntidad(Number(c)))
        .join(", "),
    [data],
  );

  return (
    <div className="flex h-full flex-col">
      <EncabezadoPagina
        migas={["SIPA-INE", "Priorización"]}
        titulo="Matriz de priorización de intervenciones"
        descripcion="Secciones ordenadas por los votos que el modelo estima recuperar: arriba, dónde intervenir primero."
        badge={
          ESCENARIO_ID
            ? `ESCENARIO ${ESCENARIO_ID}${entidadesRango ? " · " + entidadesRango : ""}`
            : "SIN ESCENARIOS · CREA UNO EN EL SIMULADOR"
        }
      />

      <div className="flex-1 overflow-auto bg-fondo p-3">
        <Card
          titulo="Secciones prioritarias"
          subtitulo={`Orden por votos recuperables estimados · ${filas.length} de ${data?.total ?? 0} secciones`}
          sinPadding
        >
          <div className="flex flex-wrap items-end gap-3 border-b border-linea-2 bg-white px-3 py-2">
            <div className="w-40">
              <Select
                etiqueta="Top de secciones"
                value={top}
                onChange={(e) => setTop(e.target.value)}
                opciones={[
                  { valor: "20", texto: "Top 20" },
                  { valor: "50", texto: "Top 50" },
                  { valor: "100", texto: "Top 100" },
                  { valor: "", texto: "Todas" },
                ]}
              />
            </div>
            <div className="w-44">
              <Select
                etiqueta="Nivel A"
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
                opciones={[
                  { valor: "", texto: "Todos los niveles" },
                  ...NIVELES.map((n) => ({ valor: n, texto: ETIQUETA_NIVEL[n] })),
                ]}
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-2">
                Municipio
              </span>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Filtrar por municipio"
                className="h-8 w-56 rounded-sm border border-linea bg-white px-2 text-[13px] text-ink outline-none focus:border-acento"
              />
            </label>
            <div className="ml-auto">
              <Button variante="secundario" onClick={exportarCsv}>
                Exportar CSV
              </Button>
            </div>
          </div>

          {isLoading || !data ? (
            <p className="p-3 text-[12px] text-ink-2">Cargando ranking…</p>
          ) : (
            <div className="overflow-x-auto">
              <p className="mb-2 text-[11px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Δ PP</strong> = diferencia en{" "}
                <dfn title="Puntos porcentuales: la diferencia entre 50 % y 51 % es 1 pp.">
                  puntos porcentuales
                </dfn>{" "}
                entre el abstencionismo sin palancas (A) y con palancas (B). "Votos recuperables" =
                Δ PP × lista nominal de la sección.
              </p>
              <table className="w-full text-[12px]" data-testid="tabla-priorizacion">
                <thead>
                  <tr className="bg-tabla text-left text-[10px] uppercase tracking-wide text-ink-2">
                    <th className="px-3 py-2 font-semibold">#</th>
                    {/* Sección (ordenable) */}
                    <th className="px-3 py-2" aria-sort={orden.campo === "claveSeccion" ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}>
                      <button type="button" onClick={() => alternarOrden("claveSeccion")} title="Ordenar por sección" className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${orden.campo === "claveSeccion" ? "text-ink" : ""}`}>
                        Sección <span aria-hidden="true" className="text-[9px]">{orden.campo === "claveSeccion" ? (orden.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
                      </button>
                    </th>
                    <th className="px-3 py-2 font-semibold">Municipio</th>
                    <th className="px-3 py-2 text-right font-semibold">Lista nominal</th>
                    <th className="px-3 py-2 font-semibold">Nivel A</th>
                    {/* Abstención A (ordenable) */}
                    <th className="px-3 py-2 text-right" aria-sort={orden.campo === "abstencionA" ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}>
                      <button type="button" onClick={() => alternarOrden("abstencionA")} title="Ordenar por abstención A" className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${orden.campo === "abstencionA" ? "text-ink" : ""}`}>
                        Abstención A <span aria-hidden="true" className="text-[9px]">{orden.campo === "abstencionA" ? (orden.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
                      </button>
                    </th>
                    {/* Abstención B (ordenable) */}
                    <th className="px-3 py-2 text-right" aria-sort={orden.campo === "abstencionB" ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}>
                      <button type="button" onClick={() => alternarOrden("abstencionB")} title="Ordenar por abstención B" className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${orden.campo === "abstencionB" ? "text-ink" : ""}`}>
                        Abstención B <span aria-hidden="true" className="text-[9px]">{orden.campo === "abstencionB" ? (orden.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
                      </button>
                    </th>
                    {/* Δ PP (ordenable) */}
                    <th className="px-3 py-2 text-right" aria-sort={orden.campo === "deltaPp" ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}>
                      <button type="button" onClick={() => alternarOrden("deltaPp")} title="Ordenar por Δ PP" className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${orden.campo === "deltaPp" ? "text-ink" : ""}`}>
                        Δ PP <span aria-hidden="true" className="text-[9px]">{orden.campo === "deltaPp" ? (orden.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
                      </button>
                    </th>
                    {/* Votos recuperables (ordenable) */}
                    <th className="px-3 py-2 text-right" aria-sort={orden.campo === "votosRecuperables" ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}>
                      <button type="button" onClick={() => alternarOrden("votosRecuperables")} title="Ordenar por votos recuperables" className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${orden.campo === "votosRecuperables" ? "text-ink font-semibold" : "font-semibold"}`}>
                        Votos recuperables <span aria-hidden="true" className="text-[9px]">{orden.campo === "votosRecuperables" ? (orden.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={f.seccionId} className="h-8 border-t border-linea-2 hover:bg-tabla">
                      <td className="px-3 text-ink-2 tabular-nums">{i + 1}</td>
                      <td className="px-3">
                        <Link
                          to={`/seccion/${f.seccionId}`}
                          state={{ entidadClave: f.entidad }}
                          className="text-acento hover:underline"
                        >
                          {f.claveSeccion}
                        </Link>
                      </td>
                      <td className="px-3">{f.municipio}</td>
                      <td className="px-3 text-right tabular-nums">{formatEntero(f.listaNominal)}</td>
                      <td className="px-3">
                        <CuadroNivel nivel={f.nivel} />
                      </td>
                      <td className="px-3 text-right tabular-nums">{formatPct(f.abstencionA)}</td>
                      <td className="px-3 text-right tabular-nums">{formatPct(abstencionB(f))}</td>
                      <td className="px-3 text-right tabular-nums text-acento">{f.deltaPp} pp</td>
                      <td className="px-3 text-right font-semibold tabular-nums">
                        {formatEntero(f.votosRecuperables)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-linea bg-tabla text-[11px] font-semibold text-ink">
                    <td className="px-3 py-2" colSpan={8}>
                      Total · {filas.length} secciones
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatEntero(totalRecuperables)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-2">
          <span>Estratificación: corte por umbrales fijos del modelo (ADR-05)</span>
          <span>·</span>
          <span>Cálculo con el Padrón y Lista Nominal vigentes</span>
          <span>·</span>
          <span className="font-medium text-ink">Total visualizado: {formatEntero(totalRecuperables)} votos recuperables</span>
        </p>
      </div>
    </div>
  );
}
