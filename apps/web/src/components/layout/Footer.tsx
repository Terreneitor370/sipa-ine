export function Footer() {
  return (
    <footer className="flex h-8 items-center justify-between border-t border-linea bg-white px-3 text-[11px] text-ink-2">
      <span>
        Estimaciones de un modelo estadístico con fines de planeación; no son predicciones exactas.
      </span>
      <span className="hidden md:inline">
        Metodología INE · Marco Geográfico Electoral · Fuentes públicas
      </span>
    </footer>
  );
}
