export function KpiCard({
  etiqueta,
  valor,
  detalle,
  grande = false,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  grande?: boolean;
}) {
  return (
    <div className="rounded-sm border border-linea bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-2">{etiqueta}</p>
      <p className={`mt-1 font-semibold tabular-nums text-ink ${grande ? "text-[32px]" : "text-[20px]"}`}>
        {valor}
      </p>
      {detalle && <p className="mt-0.5 text-[10px] text-ink-2">{detalle}</p>}
    </div>
  );
}
