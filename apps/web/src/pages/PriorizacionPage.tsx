import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { EncabezadoPagina } from "../components/ui/EncabezadoPagina";
import { CuadroNivel } from "../components/ui/NivelBadge";
import { usePriorizacion } from "../hooks/useSipa";
import { formatEntero, formatPct } from "../lib/format";
import { ETIQUETA_NIVEL, NIVELES } from "../lib/riesgo";
import { nombreEntidad } from "../lib/adaptadores";
import type { FilaPriorizacion } from "../types/api";

const ESCENARIO_ID = 12;

function abstencionB(f: FilaPriorizacion): number {
  return f.abstencionA + f.deltaPp / 100;
}

export function PriorizacionPage() {
  const { data, isLoading } = usePriorizacion(ESCENARIO_ID);
  const [nivel, setNivel] = useState("");
  const [municipio, setMunicipio] = useState("");

  const filas = useMemo(() => {
    return (data?.filas ?? [])
      .filter(
        (f) =>
          (nivel === "" || f.nivel === nivel) &&
          (municipio === "" || f.municipio.toLowerCase().includes(municipio.toLowerCase())),
      )
      .sort((a, b) => b.votosRecuperables - a.votosRecuperables);
  }, [data, nivel, municipio]);

  const totalRecuperables = filas.reduce((acc, f) => acc + f.votosRecuperables, 0);

  const exportarCsv = () => {
    const encabezado = [
      "seccion",
      "municipio",
      "lista_nominal",
      "nivel",
      "abstencion_a",
      "abstencion_b",
      "delta_pp",
      "votos_recuperables",
    ];
    const cuerpo = filas.map((f) => [
      f.claveSeccion,
      f.municipio,
      f.listaNominal,
      f.nivel,
      (f.abstencionA * 100).toFixed(2),
      (abstencionB(f) * 100).toFixed(2),
      f.deltaPp.toFixed(2),
      f.votosRecuperables,
    ]);
    const csv = [encabezado, ...cuerpo].map((f) => f.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `priorizacion-${ESCENARIO_ID}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
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
        badge={`ESCENARIO ${ESCENARIO_ID}${entidadesRango ? " · " + entidadesRango : ""}`}
      />

      <div className="flex-1 overflow-auto bg-fondo p-3">
        <Card
          titulo="Secciones prioritarias"
          subtitulo={`Orden por votos recuperables estimados · ${filas.length} de ${data?.total ?? 0} secciones`}
          sinPadding
        >
          <div className="flex flex-wrap items-end gap-3 border-b border-linea-2 bg-white px-3 py-2">
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
              <table className="w-full text-[12px]" data-testid="tabla-priorizacion">
                <thead>
                  <tr className="bg-tabla text-left text-[10px] uppercase tracking-wide text-ink-2">
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Sección</th>
                    <th className="px-3 py-2 font-semibold">Municipio</th>
                    <th className="px-3 py-2 text-right font-semibold">Lista nominal</th>
                    <th className="px-3 py-2 font-semibold">Nivel A</th>
                    <th className="px-3 py-2 text-right font-semibold">Abstención A</th>
                    <th className="px-3 py-2 text-right font-semibold">Abstención B</th>
                    <th className="px-3 py-2 text-right font-semibold">Δ PP</th>
                    <th className="px-3 py-2 text-right font-semibold">Votos recuperables</th>
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

        <p className="mt-3 text-[11px] text-ink-2">
          Corte de niveles: umbrales fijos por versión de modelo (ADR-05), no cuantiles del
          escenario. Orden por votos recuperables estimados.
        </p>
      </div>
    </div>
  );
}
