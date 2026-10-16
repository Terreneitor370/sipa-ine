import { describe, expect, it } from "vitest";
import type { FeatureCollectionGeo, RiesgoRespuesta } from "../types/api";
import riesgo from "../mocks/riesgo.json";
import geo from "../mocks/geo-sonora.json";

/**
 * Consistencia de los mocks con el contrato congelado (16 de octubre).
 * Cuando exista la API real, estas verificaciones se reemplazan por pruebas de contrato.
 */
describe("mocks del contrato de API", () => {
  const r = riesgo as unknown as RiesgoRespuesta;

  it("cada sección del riesgo tiene geometría y clave única", () => {
    const claves = r.secciones.map((s) => s.claveSeccion);
    expect(new Set(claves).size).toBe(claves.length);

    const geoClaves = new Set(
      (geo as unknown as FeatureCollectionGeo).features.map((f) => f.properties.claveSeccion),
    );
    for (const clave of claves) {
      expect(geoClaves.has(clave)).toBe(true);
    }
  });

  it("la abstención está en escala 0 a 1 y el intervalo contiene a la media", () => {
    for (const s of r.secciones) {
      expect(s.abstencionPredicha).toBeGreaterThanOrEqual(0);
      expect(s.abstencionPredicha).toBeLessThanOrEqual(1);
      expect(s.p10).toBeLessThanOrEqual(s.abstencionPredicha);
      expect(s.p90).toBeGreaterThanOrEqual(s.abstencionPredicha);
    }
  });

  it("la distribución por nivel suma el total de secciones", () => {
    const f = r.porNivel;
    expect(f.MUY_ALTO + f.ALTO + f.MEDIO + f.BAJO).toBe(r.totalSecciones);
  });
});
