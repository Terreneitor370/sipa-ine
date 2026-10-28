import type { NivelRiesgo, ResumenNivel, RiesgoSeccion } from "../types/api";

/** Paleta de niveles (apta para daltonismo) — ADR-05 / doc de arquitectura */
export const NIVELES: NivelRiesgo[] = ["MUY_ALTO", "ALTO", "MEDIO", "BAJO"];

export const COLOR_NIVEL: Record<NivelRiesgo, string> = {
  MUY_ALTO: "#B2182B",
  ALTO: "#EF8A62",
  MEDIO: "#FDDBC7",
  BAJO: "#67A9CF",
};

export const ETIQUETA_NIVEL: Record<NivelRiesgo, string> = {
  MUY_ALTO: "Muy Alto",
  ALTO: "Alto",
  MEDIO: "Medio",
  BAJO: "Bajo",
};

/**
 * Umbrales fijos del modelo v1.2.0 (referidos a p90/p75/p50 de la serie histórica).
 * ADR-05: se fijan por versión de modelo y NO se recalculan por cuantiles del escenario,
 * para que una intervención se refleje realmente en el mapa.
 */
export const UMBRALES_V1: Record<NivelRiesgo, { min: number | null; max: number | null }> = {
  MUY_ALTO: { min: 0.559, max: null },
  ALTO: { min: 0.522, max: 0.559 },
  MEDIO: { min: 0.485, max: 0.522 },
  BAJO: { min: null, max: 0.485 },
};

export function contarPorNivel(secciones: RiesgoSeccion[]): ResumenNivel {
  const conteo: ResumenNivel = { MUY_ALTO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 };
  for (const s of secciones) conteo[s.nivel] += 1;
  return conteo;
}

export function abstencionPromedio(secciones: RiesgoSeccion[]): number {
  if (secciones.length === 0) return 0;
  return secciones.reduce((acc, s) => acc + s.abstencionPredicha, 0) / secciones.length;
}

export function nivelDesdeAbstencion(
  abstencion: number,
  umbrales: Record<NivelRiesgo, { min: number | null; max: number | null }> = UMBRALES_V1,
): NivelRiesgo {
  if (umbrales.MUY_ALTO.min !== null && abstencion >= umbrales.MUY_ALTO.min) return "MUY_ALTO";
  if (umbrales.ALTO.min !== null && abstencion >= umbrales.ALTO.min) return "ALTO";
  if (umbrales.MEDIO.min !== null && abstencion >= umbrales.MEDIO.min) return "MEDIO";
  return "BAJO";
}

export function estiloPoligono(nivel: NivelRiesgo): {
  fillColor: string;
  weight: number;
  color: string;
  fillOpacity: number;
} {
  return {
    fillColor: COLOR_NIVEL[nivel],
    weight: 1,
    color: "#ffffff",
    fillOpacity: 0.6,
  };
}
