import type { SelectHTMLAttributes } from "react";

export function Select({
  etiqueta,
  opciones,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
}) {
  const id = props.id ?? `sel-${etiqueta.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-2">{etiqueta}</span>
      <select
        id={id}
        className={`h-8 w-full rounded-sm border border-linea bg-white px-2 text-[13px] text-ink focus:border-acento focus:outline-none ${className}`}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}
