import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const LLAVE_TOUR = "sipa_ine_tour_v1";

export interface PasoTour {
  /** Selector CSS del elemento a resaltar; si falta, el paso se muestra centrado. */
  sel?: string;
  titulo: string;
  texto: string;
  /** En el último paso, texto del botón final (ej. "Ir al simulador"). */
  cta?: string;
  /** Ruta a la que va el CTA final. */
  ctaRuta?: string;
}

/**
 * Tour guiado de primera visita (RNF-05: usabilidad). Se muestra una sola vez,
 * resalta el elemento del paso y permite saltarlo o terminarlo.
 */
export function TourGuiado({ pasos }: { pasos: PasoTour[] }) {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const [visible, setVisible] = useState(false);
  const [caja, setCaja] = useState<{ top: number; left: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const visto = window.localStorage.getItem(LLAVE_TOUR);
    if (!visto) setVisible(true);
  }, []);

  const terminar = () => {
    window.localStorage.setItem(LLAVE_TOUR, new Date().toISOString());
    setVisible(false);
  };

  const actual = pasos[paso];

  useLayoutEffect(() => {
    if (!visible || !actual) return;
    const medir = () => {
      if (!actual.sel) {
        setCaja(null);
        return;
      }
      const el = document.querySelector(actual.sel);
      if (!el) {
        setCaja(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setCaja({ top: r.top, left: r.left, w: r.width, h: r.height });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [visible, actual, paso]);

  if (!visible || !actual) return null;

  const enMapa = caja != null && caja.w > 0;
  const esUltimo = paso === pasos.length - 1;

  // Posición de la tarjeta del tour
  const cardClases = enMapa && caja
    ? caja.top + caja.h + 190 < window.innerHeight
      ? "left-1/2 -translate-x-1/2"
      : ""
    : "";
  const cardEstilo = enMapa && caja
    ? caja.top + caja.h + 190 < window.innerHeight
      ? { top: caja.top + caja.h + 12, left: caja.left + caja.w / 2, transform: "translateX(-50%)" }
      : caja.top > 230
        ? { top: caja.top - 190, left: caja.left + caja.w / 2, transform: "translateX(-50%)" }
        : undefined
    : { top: "35%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[1200]" role="dialog" aria-modal="true" aria-label="Tour de introducción">
      {/* Atenuado general; el elemento resaltado queda "recortado" con el aro */}
      {enMapa && caja ? (
        <div
          className="pointer-events-auto absolute rounded-sm border-2 border-acento"
          style={{
            top: caja.top - 6,
            left: caja.left - 6,
            width: caja.w + 12,
            height: caja.h + 12,
            boxShadow: "0 0 0 9999px rgba(26, 42, 74, 0.45)",
          }}
        />
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-[#1a2a4a]/45" />
      )}

      <div
        className={`absolute z-10 w-[330px] max-w-[92vw] rounded-sm border border-linea bg-white p-3 ${cardClases}`}
        style={cardEstilo}
      >
        <p className="text-[10px] uppercase tracking-wide text-acento">
          Paso {paso + 1} de {pasos.length}
        </p>
        <h2 className="mt-0.5 text-[14px] font-semibold text-ink">{actual.titulo}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{actual.texto}</p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={terminar}
            className="text-[11px] text-ink-2 hover:underline"
          >
            Saltar tour
          </button>
          <div className="flex gap-1.5">
            {paso > 0 && (
              <button
                type="button"
                onClick={() => setPaso(paso - 1)}
                className="rounded-sm border border-linea px-2 py-1 text-[11px] text-ink hover:bg-fondo"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (esUltimo) {
                  terminar();
                  if (actual.ctaRuta) navigate(actual.ctaRuta);
                } else {
                  setPaso(paso + 1);
                }
              }}
              className="rounded-sm bg-acento px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90"
            >
              {esUltimo ? (actual.cta ?? "Terminar") : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
