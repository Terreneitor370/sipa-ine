import type { NivelRiesgo, Palancas } from "../../types/api";
import { ETIQUETA_NIVEL, NIVELES } from "../../lib/riesgo";
import { LeverSlider } from "./LeverSlider";

export function PalancasPanel({
  palancas,
  onChange,
}: {
  palancas: Palancas;
  onChange: (palancas: Palancas) => void;
}) {
  const actualizar = (parcial: Partial<Palancas>) => onChange({ ...palancas, ...parcial });
  const alternarNivel = (nivel: NivelRiesgo) => {
    const niveles = palancas.focalizacion.niveles.includes(nivel)
      ? palancas.focalizacion.niveles.filter((n) => n !== nivel)
      : [...palancas.focalizacion.niveles, nivel];
    actualizar({ focalizacion: { ...palancas.focalizacion, niveles } });
  };

  return (
    <div className="space-y-4">
      <LeverSlider
        etiqueta="Más casillas · reducción de electores/casilla"
        valor={Math.round(palancas.reduccionElectoresCasilla * 100)}
        min={0}
        max={40}
        step={1}
        sufijo="%"
        ayuda="reduccion_electores_casilla: electores por casilla ajustados."
        onChange={(v) => actualizar({ reduccionElectoresCasilla: v / 100 })}
      />
      <LeverSlider
        etiqueta="Distancia MAC máxima"
        valor={palancas.distMacMaxKm ?? 0}
        min={0}
        max={50}
        step={1}
        sufijo=" km"
        ayuda="0 km desactiva la palanca de distancia a casilla."
        onChange={(v) => actualizar({ distMacMaxKm: v > 0 ? v : null })}
      />
      <div className="border border-[#FDE68A] bg-[#FFFBEB] p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#92400E]">
          Campaña digital focalizada · Supuesto
        </p>
        <div className="space-y-4">
          <LeverSlider
            etiqueta="Efecto por punto porcentual"
            valor={palancas.campanaDigital?.efectoPp ?? 0}
            min={0}
            max={5}
            step={0.5}
            sufijo=" pp"
            ayuda="Estimación exógena del modelo; no se aprende de los datos."
            onChange={(v) =>
              actualizar({
                campanaDigital: { efectoPp: v, cobertura: palancas.campanaDigital?.cobertura ?? 0.5 },
              })
            }
          />
          <LeverSlider
            etiqueta="Cobertura territorial"
            valor={Math.round((palancas.campanaDigital?.cobertura ?? 0.5) * 100)}
            min={0}
            max={100}
            step={5}
            sufijo="%"
            onChange={(v) =>
              actualizar({
                campanaDigital: {
                  efectoPp: palancas.campanaDigital?.efectoPp ?? 0,
                  cobertura: v / 100,
                },
              })
            }
          />
        </div>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-2">
          Focalización por nivel de riesgo
        </legend>
        <div className="flex flex-wrap gap-3">
          {NIVELES.map((nivel) => (
            <label key={nivel} className="flex items-center gap-1.5 text-[12px] text-ink">
              <input
                type="checkbox"
                className="accent-acento"
                checked={palancas.focalizacion.niveles.includes(nivel)}
                onChange={() => alternarNivel(nivel)}
              />
              {ETIQUETA_NIVEL[nivel]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
