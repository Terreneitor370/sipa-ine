import type { ReactNode } from "react";

export function Card({
  titulo,
  subtitulo,
  accion,
  children,
  className = "",
  sinPadding = false,
}: {
  titulo?: string;
  subtitulo?: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  sinPadding?: boolean;
}) {
  return (
    <section className={`rounded-sm border border-linea bg-white ${className}`}>
      {(titulo || accion) && (
        <header className="flex items-center justify-between gap-2 border-b border-linea-2 px-3 py-2">
          <div>
            {titulo && (
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                {titulo}
              </h2>
            )}
            {subtitulo && <p className="text-[11px] text-ink-2">{subtitulo}</p>}
          </div>
          {accion}
        </header>
      )}
      <div className={sinPadding ? "" : "p-3"}>{children}</div>
    </section>
  );
}
