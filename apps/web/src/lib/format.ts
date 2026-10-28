/** Porcentajes: la BD guarda 0 a 1; la interfaz muestra % */
export function formatPct(valor: number, decimales = 1): string {
  return `${(valor * 100).toFixed(decimales)}%`;
}

export function formatPp(valor: number, decimales = 1): string {
  const signo = valor > 0 ? "+" : "";
  return `${signo}${valor.toFixed(decimales)} pp`;
}

export function formatEntero(valor: number): string {
  return new Intl.NumberFormat("es-MX").format(valor);
}

export function formatKm(valor: number): string {
  return `${valor.toFixed(1)} km`;
}
