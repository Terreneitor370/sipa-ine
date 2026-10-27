import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buscarColonias, type ColoniaResultado } from "../../api/recursos";

export function ColoniaSearch({ entidadClave }: { entidadClave: string }) {
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ColoniaResultado[]>([]);
  const [abierto, setAbierto] = useState(false);

  const placeholder = useMemo(
    () => 'Buscar colonia (ej. "Pueblo Nuevo, San Luis Río Colorado")',
    [],
  );

  const buscar = async (texto: string) => {
    setConsulta(texto);
    if (texto.trim().length < 2) {
      setResultados([]);
      setAbierto(false);
      return;
    }
    const hits = await buscarColonias(texto, entidadClave);
    setResultados(hits);
    setAbierto(hits.length > 0);
  };

  const elegir = (r: ColoniaResultado) => {
    setConsulta(`${r.colonia}, ${r.municipio}`);
    setAbierto(false);
    navigate(`/seccion/${r.seccionId}`, {
      state: { lat: r.lat, lon: r.lon, claveSeccion: r.claveSeccion },
    });
  };

  return (
    <div className="relative w-full max-w-md">
      <label className="text-[11px] uppercase text-ink-2" htmlFor="buscar-colonia">
        Colonia
      </label>
      <input
        id="buscar-colonia"
        type="search"
        value={consulta}
        placeholder={placeholder}
        onChange={(e) => void buscar(e.target.value)}
        onFocus={() => resultados.length > 0 && setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="mt-0.5 h-8 w-full rounded-sm border border-linea bg-white px-2 text-[13px] text-ink focus:border-acento focus:outline-none"
      />
      {abierto ? (
        <ul
          className="absolute z-[600] mt-0.5 max-h-48 w-full overflow-auto border border-linea bg-white rounded-sm"
          role="listbox"
        >
          {resultados.map((r) => (
            <li key={`${r.colonia}-${r.municipio}-${r.claveSeccion}`}>
              <button
                type="button"
                className="flex h-8 w-full items-center px-2 text-left text-[12px] hover:bg-tabla"
                onMouseDown={() => elegir(r)}
              >
                <span className="font-semibold text-ink">{r.colonia}</span>
                <span className="ml-1 text-ink-2">
                  · {r.municipio} · Secc. {r.claveSeccion}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
