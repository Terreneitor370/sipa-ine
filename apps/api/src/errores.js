// Errores con el formato del contrato: { error: { code, message, details? } }
export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export const noEncontrado = (mensaje) => new ErrorApi(404, "NOT_FOUND", mensaje);
export const validacion = (mensaje, detalles) => new ErrorApi(400, "VALIDATION_ERROR", mensaje, detalles);

export function manejadorErrores(err, _req, res, _next) {
  if (err instanceof ErrorApi) {
    const cuerpo = { error: { code: err.codigo, message: err.message } };
    if (err.detalles) cuerpo.error.details = err.detalles;
    return res.status(err.estado).json(cuerpo);
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "El cuerpo no es JSON válido" } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } });
}

/** Entero dentro de un rango; lanza VALIDATION_ERROR si no lo es. */
export function entero(valor, campo, { min = -Infinity, max = Infinity, opcional = false } = {}) {
  if (valor == null || valor === "") {
    if (opcional) return undefined;
    throw validacion("Parámetros inválidos", [{ campo, mensaje: "Es obligatorio" }]);
  }
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) {
    const rango = Number.isFinite(min) && Number.isFinite(max) ? ` entre ${min} y ${max}` : "";
    throw validacion("Parámetros inválidos", [{ campo, mensaje: `Debe ser un entero${rango}` }]);
  }
  return n;
}
