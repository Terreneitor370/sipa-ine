import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario";

export function Button({
  variante = "primario",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  const estilos =
    variante === "primario"
      ? "bg-acento text-white hover:bg-acento-claro disabled:bg-linea"
      : "border border-linea bg-white text-ink-2 hover:bg-tabla disabled:text-linea";
  return (
    <button
      className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-[13px] font-semibold transition ${estilos} ${className}`}
      {...props}
    />
  );
}
