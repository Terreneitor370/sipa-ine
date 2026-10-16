import { describe, expect, it } from "vitest";
import type { FeatureCollectionGeo, RiesgoRespuesta, SeccionFicha } from "../types/api";
import riesgo from "../mocks/riesgo.json";
import geo from "../mocks/geo-sonora.json";
import seccionJson from "../mocks/seccion-1234.json";

/**
 * Consistencia de los mocks con el contrato congelado (16 de octubre).
 * Cuando exista la API real, estas verificaciones se reemplazan por pruebas de contrato.
 */
describe("mocks del contrato de API", () => {
  const r = riesgo as unknown as RiesgoRespuesta;
  const seccion = seccionJson as unknown as SeccionFicha;

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

  it("la ficha de sección mantiene p10 <= media <= p90 en escala 0 a 1", () => {
    const p = seccion.predicciones;
    expect(p.p10).toBeLessThanOrEqual(p.media);
    expect(p.media).toBeLessThanOrEqual(p.p90);
    for (const v of [p.p10, p.media, p.p90]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("el histórico de la ficha tiene valores válidos y un punto 2027 proyectado", () => {
    expect(seccion.historico.length).toBeGreaterThan(0);
    for (const punto of seccion.historico) {
      if (punto.abstencion !== null) {
        expect(punto.abstencion).toBeGreaterThanOrEqual(0);
        expect(punto.abstencion).toBeLessThanOrEqual(1);
      }
    }
    const proyectado = seccion.historico.find((p) => p.proyectado);
    expect(proyectado?.anio).toBe(2027);
  });
});
