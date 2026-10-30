/** Leyenda legal obligatoria (doc de arquitectura 6.10 y RNF-05). Debe verse en toda pantalla de resultados. */
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] text-ink-2 ${className}`}>
      Estimaciones de un modelo estadístico con fines de planeación; no son predicciones exactas.
    </p>
  );
}
