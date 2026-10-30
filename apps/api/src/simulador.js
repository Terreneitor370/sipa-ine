// Simulador de escenarios (RF-07). Escenario A = pronóstico inercial 2027;
// escenario B = A con las palancas aplicadas.
//
// - Reducir electores por casilla: efecto calculado con el modelo XGBoost
//   (se volvió a predecir cada sección con 10/20/30/40 % menos electores por
//   casilla en exportar_api.py); aquí se interpola linealmente.
// - Campaña digital: supuesto del usuario, resta efectoPp puntos a la
//   fracción "cobertura" del electorado de las secciones focalizadas.
// - Distancia a MAC: sin datos de ubicación de módulos; no cambia el resultado.
import { validacion } from "./errores.js";

export const NIVELES = ["MUY_ALTO", "ALTO", "MEDIO", "BAJO"];

export function nivelDe(abst, u) {
  if (abst >= u.muyAlto) return "MUY_ALTO";
  if (abst >= u.alto) return "ALTO";
  if (abst >= u.medio) return "MEDIO";
  return "BAJO";
}

/** Interpola el efecto de reducir electores por casilla en la fracción r. */
export function efectoCasillas(efectos, reducciones, r) {
  if (!r || r <= 0 || !efectos?.length) return 0;
  const xs = [0, ...reducciones];
  const ys = [0, ...efectos];
  if (r >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 1; i < xs.length; i++) {
    if (r <= xs[i]) {
      const t = (r - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return 0;
}

export function validarPalancas(p) {
  const det = [];
  if (!p || typeof p !== "object") throw validacion("Parámetros inválidos", [{ campo: "palancas", mensaje: "Es obligatorio" }]);
  const r = Number(p.reduccionElectoresCasilla ?? 0);
  if (!Number.isFinite(r) || r < 0 || r > 0.5) det.push({ campo: "palancas.reduccionElectoresCasilla", mensaje: "Debe estar entre 0 y 0.5" });
  if (p.campanaDigital != null) {
    const e = Number(p.campanaDigital.efectoPp);
    const c = Number(p.campanaDigital.cobertura);
    if (!Number.isFinite(e) || e < 0 || e > 10) det.push({ campo: "palancas.campanaDigital.efectoPp", mensaje: "Debe estar entre 0 y 10" });
    if (!Number.isFinite(c) || c < 0 || c > 100) det.push({ campo: "palancas.campanaDigital.cobertura", mensaje: "Debe estar entre 0 y 1" });
  }
  const f = p.focalizacion ?? {};
  if (f.niveles != null && (!Array.isArray(f.niveles) || f.niveles.some((n) => !NIVELES.includes(n)))) {
    det.push({ campo: "palancas.focalizacion.niveles", mensaje: `Valores permitidos: ${NIVELES.join(", ")}` });
  }
  if (f.municipios != null && (!Array.isArray(f.municipios) || f.municipios.some((m) => !Number.isInteger(Number(m))))) {
    det.push({ campo: "palancas.focalizacion.municipios", mensaje: "Debe ser una lista de claves de municipio" });
  }
  if (det.length) throw validacion("Parámetros inválidos", det);
  const cob = p.campanaDigital ? Number(p.campanaDigital.cobertura) : 0;
  return {
    reduccionElectoresCasilla: r,
    distMacMaxKm: p.distMacMaxKm ?? null,
    campanaDigital: p.campanaDigital
      ? { efectoPp: Number(p.campanaDigital.efectoPp), cobertura: cob > 1 ? cob / 100 : cob }
      : null,
    focalizacion: {
      niveles: f.niveles ?? [],
      municipios: (f.municipios ?? []).map(Number),
    },
  };
}

/**
 * Calcula el escenario B para las secciones de una entidad.
 * Regresa { filas, resumen } donde filas trae A, B y votos por sección.
 */
export function simular(secciones, palancas, modelo) {
  const u = modelo.umbrales;
  const red = modelo.reduccionesCasillas ?? [0.1, 0.2, 0.3, 0.4];
  const { niveles, municipios } = palancas.focalizacion;
  const focal = secciones.filter(
    (s) =>
      (niveles.length === 0 || niveles.includes(s.nivelRiesgo)) &&
      (municipios.length === 0 || municipios.includes(s.municipio)),
  );
  const campana = palancas.campanaDigital ? (palancas.campanaDigital.efectoPp / 100) * palancas.campanaDigital.cobertura : 0;

  const filas = focal.map((s) => {
    const a = s.abstencionPred;
    const d = efectoCasillas(s.efectoCasillas, red, palancas.reduccionElectoresCasilla) - campana;
    const b = Math.min(1, Math.max(0, a + d));
    return {
      entidad: s.entidad,
      seccion: s.seccion,
      municipio: s.municipio,
      listaNominal: s.listaNominal,
      abstencionA: a,
      abstencionB: Math.round(b * 1e4) / 1e4,
      votosRecuperables: Math.max(0, Math.round((a - b) * s.listaNominal)),
      nivelRiesgo: s.nivelRiesgo,
      nivelRiesgoA: s.nivelRiesgo,
      nivelRiesgoB: nivelDe(b, u),
    };
  });

  const prom = (campo) => (filas.length ? filas.reduce((acc, f) => acc + f[campo], 0) / filas.length : 0);
  const porNivelA = { MUY_ALTO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 };
  const porNivelB = { MUY_ALTO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 };
  for (const f of filas) {
    porNivelA[f.nivelRiesgoA] += 1;
    porNivelB[f.nivelRiesgoB] += 1;
  }
  return {
    filas,
    resumen: {
      seccionesAfectadas: filas.length,
      abstencionPromedio: { A: Math.round(prom("abstencionA") * 1e4) / 1e4, B: Math.round(prom("abstencionB") * 1e4) / 1e4 },
      porNivel: { A: porNivelA, B: porNivelB },
      votosRecuperables: filas.reduce((acc, f) => acc + f.votosRecuperables, 0),
    },
  };
}
