import { useEffect, useState } from "react";
import { quitarAviso, suscribirseAvisos, type Aviso } from "../../lib/aviso";

/** Toasts de error de la API (abajo al centro, estilo plano del sistema govtech). */
export function Avisos() {
  const [lista, setLista] = useState<Aviso[]>([]);
  useEffect(() => suscribirseAvisos(setLista), []);
  if (!lista.length) return null;
  return (
    <div
      className="fixed bottom-3 left-1/2 z-[1400] w-[min(560px,92vw)] -translate-x-1/2 space-y-1.5"
      role="alert"
      aria-live="assertive"
    >
      {lista.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 border border-[#B45309] bg-[#FFFBEB] px-3 py-2 text-[12px] leading-4 text-[#92400E]"
        >
          <span className="min-w-0 flex-1">{a.texto}</span>
          {a.onReintentar && (
            <button
              type="button"
              onClick={() => {
                a.onReintentar?.();
                quitarAviso(a.id);
              }}
              className="shrink-0 border border-[#B45309] px-2 py-0.5 text-[11px] font-medium hover:bg-[#FEF3C7]"
            >
              Reintentar
            </button>
          )}
          <button
            type="button"
            aria-label="Descartar aviso"
            onClick={() => quitarAviso(a.id)}
            className="shrink-0 px-1 text-[13px] hover:underline"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
