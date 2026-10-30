export function LeverSlider({
  etiqueta,
  valor,
  min,
  max,
  step,
  sufijo,
  ayuda,
  onChange,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  step: number;
  sufijo: string;
  ayuda?: string;
  onChange: (valor: number) => void;
}) {
  const id = `lever-${etiqueta.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[11px] uppercase tracking-wide text-ink-2">
          {etiqueta}
        </label>
        <span className="rounded-sm bg-tabla px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink tabular-nums">
          {valor}
          {sufijo}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={etiqueta}
      />
      {ayuda && <p className="mt-0.5 text-[10px] text-ink-2">{ayuda}</p>}
    </div>
  );
}
