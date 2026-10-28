/**
 * Avisos de error de la API, traducidos desde el bloque Error del contrato
 * (docs/openapi.yaml): NoAutenticado, SinPermiso, NoEncontrado,
 * ErrorValidacion, ServicioNoDisponible. Con mocks no ocurren, pero el modo
 * real necesita que la app deje de estar "Cargando…" y pida reintentar.
 */

export interface Aviso {
  id: number;
  texto: string;
  /** Si existe, el botón "Reintentar" lo dispara. */
  onReintentar?: () => void;
}

let avisos: Aviso[] = [];
let seq = 0;
const suscriptores = new Set<(l: Aviso[]) => void>();

function notificar() {
  for (const f of suscriptores) f(avisos);
}

export function publicarAviso(a: Omit<Aviso, "id">) {
  avisos = [...avisos, { ...a, id: ++seq }].slice(-4);
  notificar();
  // Auto-ocultar tras 8 s si no necesita reintento (los errores con Reintentar persisten)
  if (!a.onReintentar) {
    const id = seq;
    window.setTimeout(() => quitarAviso(id), 8000);
  }
}

export function reiniciarAvisos() {
  avisos = [];
  notificar();
}

export function quitarAviso(id: number) {
  avisos = avisos.filter((a) => a.id !== id);
  notificar();
}

export function suscribirseAvisos(fn: (l: Aviso[]) => void): () => void {
  suscriptores.add(fn);
  fn(avisos);
  return () => {
    suscriptores.delete(fn);
  };
}

interface CuerpoErrorContrato {
  error?: { code?: string; message?: string };
}

/**
 * Traduce un error (axios u otro) al mensaje para el aviso.
 * Regresa `null` cuando el 401 ya se maneja en AuthContext (limpia sesión),
 * para no duplicar avisos.
 */
export function mensajeDeError(e: unknown): string | null {
  const axios = e as {
    response?: { status?: number; data?: CuerpoErrorContrato };
    code?: string;
  };
  if (axios?.response) {
    const { status, data } = axios.response;
    const codigo = data?.error?.code ?? "";
    if (status === 401 || codigo === "NoAutenticado") return null;
    if (codigo === "SinPermiso" || status === 403)
      return "No tienes permiso para esta consulta con tu rol actual.";
    if (codigo === "NoEncontrado" || status === 404)
      return "El recurso pedido no existe (puede haber sido eliminado).";
    if (codigo === "ErrorValidacion")
      return data?.error?.message ?? "Los datos enviados no pasaron la validación.";
    if (codigo === "ServicioNoDisponible" || status === 503 || status === 502)
      return "El servicio no está disponible en este momento. Intenta de nuevo.";
    return data?.error?.message ?? `La consulta falló (código ${status}).`;
  }
  if (axios?.code === "ECONNABORTED" || /NETWORK$/i.test(axios?.code ?? ""))
    return "Sin conexión con la API. Verifica el servicio y reintenta.";
  return "Error inesperado. Intenta de nuevo.";
}
