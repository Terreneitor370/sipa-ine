import type { ReactNode } from "react";

/** Encabezado de página: migas de pan + badge opcional + título + acciones. */
export function EncabezadoPagina({
  migas,
  titulo,
  descripcion,
  badge,
  accion,
}: {
  migas: string[];
  titulo?: string;
  /** Subtítulo con guía de uso (qué hace el usuario en esta pantalla). */
  descripcion?: string;
  badge?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-linea bg-white px-3 py-2">
      <div className="min-w-0">
        <nav className="truncate text-[11px] text-ink-2" aria-label="Migas de pan">
          {migas.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="px-1 text-linea">/</span>}
              {m}
            </span>
          ))}
        </nav>
        {titulo && <h1 className="text-[16px] font-semibold text-ink">{titulo}</h1>}
        {descripcion && <p className="mt-0.5 truncate text-[12px] text-ink-2">{descripcion}</p>}
      </div>
      <div className="flex items-center gap-2">
        {accion}
        {badge && (
          <span className="rounded-sm border border-linea px-2 py-1 text-[10px] uppercase tracking-wide text-ink-2">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
