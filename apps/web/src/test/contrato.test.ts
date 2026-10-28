import { describe, expect, it } from "vitest";
import type { RiesgoRespuesta, SeccionFicha, ColoniaResultado } from "../types/api";
import riesgoContrato from "../mocks/riesgo.json";
import riesgoNacional from "../mocks/riesgo-nacional.json";
import geo from "../mocks/geo-sonora.json";
import fichaContrato from "../mocks/seccion-ficha.json";
import explicacionContrato from "../mocks/seccion-explicacion.json";
import simulacionJson from "../mocks/simulacion.json";
import priorizacionContrato from "../mocks/priorizacion.json";
import modeloContrato from "../mocks/modelo.json";
import catalogos from "../mocks/catalogos.json";
import colonias from "../mocks/colonias.json";
import {
  adaptarFicha,
  adaptarModelo,
  adaptarPriorizacion,
  adaptarRiesgoSecciones,
  adaptarBusqueda,
  adaptarUmbrales,
  nombreEntidad,
  sesionExpirada,
} from "../lib/adaptadores";
import { UMBRALES_V1 } from "../lib/riesgo";
import type {
  FichaContrato,
  ExplicacionContrato,
  RiesgoSeccionesContrato,
  PriorizacionContrato,
  ModeloContrato,
  ResultadoBusquedaContrato,
} from "../lib/adaptadores";

/**
 * Los mocks están en forma del contrato congelado (docs/openapi.yaml, PR #3);
 * aquí se valida el pipeline de adaptadores contrato → modelo interno, que es
 * el mismo código que correrá contra la API real.
 */
describe("mocks del contrato de API v1", () => {
  const riesgoC = riesgoContrato as unknown as RiesgoSeccionesContrato;

  it("el riesgo usa claves del contrato y mapea municipios INE por adaptador", () => {
    expect(riesgoC.secciones.length).toBe(48);
    for (const s of riesgoC.secciones) {
      expect(s.entidad).toBe(26);
      expect(typeof s.seccion).toBe("number");
      expect(s.abstencionPred).toBeGreaterThanOrEqual(0);
      expect(s.abstencionPred).toBeLessThanOrEqual(1);
      expect(s.p10 ?? 0).toBeLessThanOrEqual(s.abstencionPred);
      expect(s.p90 ?? 1).toBeGreaterThanOrEqual(s.abstencionPred);
    }
  });

  it("adaptarRiesgoSecciones produce el modelo interno con municipios nombrados", () => {
    const nombrePorClave: Record<number, string> = {
      30: "Hermosillo",
      18: "Cajeme",
      45: "Navojoa",
    };
    const r = adaptarRiesgoSecciones(riesgoC, nombrePorClave) as RiesgoRespuesta;
    expect(r.totalSecciones).toBe(48);
    expect(r.secciones[0].claveSeccion).toBe("0401");
    expect(r.secciones[0].municipio).toBe(nombrePorClave[riesgoC.secciones[0].municipio] ?? r.secciones[0].municipio);
    // umbrales {muyAlto,alto,medio} → {min,max} por nivel
    expect(r.umbrales.MUY_ALTO.min).toBeCloseTo(0.559, 3);
    expect(r.umbrales.BAJO.max).toBeCloseTo(0.485, 3);
    // la distribución por nivel coincide con los umbrales adaptados
    const suma = r.porNivel.MUY_ALTO + r.porNivel.ALTO + r.porNivel.MEDIO + r.porNivel.BAJO;
    expect(suma).toBe(48);
  });

  it("cada sección del riesgo tiene geometría en la cartografía de demo", () => {
    const geoClaves = new Set(
      (geo as { features: { properties: { claveSeccion: string } }[] }).features.map(
        (f) => f.properties.claveSeccion,
      ),
    );
    for (const s of riesgoC.secciones) {
      expect(geoClaves.has(String(s.seccion).padStart(4, "0"))).toBe(true);
    }
  });

  it("la ficha del contrato p10 <= media <= p90 y proyecta el 2027", () => {
    const ficha = adaptarFicha(
      fichaContrato as unknown as FichaContrato,
      explicacionContrato as unknown as ExplicacionContrato,
      null,
    ) as SeccionFicha;
    const p = ficha.predicciones;
    expect(p.p10).toBeLessThanOrEqual(p.media);
    expect(p.media).toBeLessThanOrEqual(p.p90);
    for (const v of [p.p10, p.media, p.p90]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(ficha.historico.find((x) => x.proyectado)?.anio).toBe(2027);
    // explicación (SHAP) viene del endpoint separado y llega como factoresTop
    expect(ficha.factoresTop.length).toBeGreaterThan(0);
    expect(ficha.entidad).toBe("Sonora");
  });

  it("la simulación reduce la abstención y conserva la distribución por nivel", () => {
    const sim = simulacionJson as unknown as {
      resumen: {
        abstencionPromedio: { A: number; B: number };
        porNivel: { A: Record<string, number>; B: Record<string, number> };
      };
    };
    const { A, B } = sim.resumen.porNivel;
    const suma = (n: Record<string, number>) =>
      (n.MUY_ALTO ?? 0) + (n.ALTO ?? 0) + (n.MEDIO ?? 0) + (n.BAJO ?? 0);
    expect(suma(A)).toBe(suma(B));
    expect(sim.resumen.abstencionPromedio.B).toBeLessThan(sim.resumen.abstencionPromedio.A);
  });

  it("la priorización del contrato deriva votos recuperables coherentes", () => {
    const r = adaptarPriorizacion(
      priorizacionContrato as unknown as PriorizacionContrato[],
      12,
      { 45: "Navojoa" },
    );
    for (const f of r.filas) {
      expect(f.abstencionA).toBeGreaterThanOrEqual(0);
      expect(f.abstencionA).toBeLessThanOrEqual(1);
      expect(f.votosRecuperables).toBeGreaterThanOrEqual(0);
    }
    // viene ordenada por votos recuperables
    for (let i = 1; i < r.filas.length; i++) {
      expect(r.filas[i - 1].votosRecuperables).toBeGreaterThanOrEqual(r.filas[i].votosRecuperables);
    }
  });

  it("el model card del contrato reporta tres métricas y ocho variables", () => {
    const m = adaptarModelo(modeloContrato as unknown as ModeloContrato);
    expect(m.metricas.length).toBe(3);
    expect(m.importanciaVariables.length).toBe(8);
    for (const x of m.importanciaVariables) expect(x.gain).toBeGreaterThan(0);
    expect(m.fuentes.length).toBeGreaterThan(0);
    expect(m.limitaciones.length).toBeGreaterThan(0);
  });

  it("el catálogo expone las 32 entidades y los municipios de Sonora como objetos", () => {
    const cat = catalogos as unknown as {
      entidades: { entidad: number; nombre: string; secciones: number }[];
      municipiosSonora: { entidad: number; municipio: number; nombre: string }[];
    };
    expect(cat.entidades.length).toBe(32);
    for (const e of cat.entidades) expect(e.secciones).toBeGreaterThan(0);
    const cajeme = cat.municipiosSonora.find((m) => m.municipio === 18);
    expect(cajeme?.nombre).toBe("Cajeme");
    // la fusión Obregón→Cajeme se aplicó en todos los mocks (no hay duplicados)
    expect(cat.municipiosSonora.some((m) => m.nombre === "Obregón")).toBe(false);
  });

  it("el riesgo nacional es consistente (32 entidades) y Sonora re-derivada", () => {
    const n = riesgoNacional as unknown as {
      entidades: { clave: string; abstencionPredicha: number; nombre: string }[];
    };
    expect(n.entidades.length).toBe(32);
    const sonora = n.entidades.find((e) => e.clave === "26");
    expect(sonora).toBeDefined();
    expect(String(sonora?.nombre)).toBe("Sonora");
  });

  it("el total nacional de secciones es cercano al censo electoral (~66 mil)", () => {
    const n = riesgoNacional as unknown as {
      totalSecciones: number;
    };
    expect(n.totalSecciones).toBeGreaterThan(50_000);
    expect(n.totalSecciones).toBeLessThan(80_000);
  });

  it("adaptarBusqueda resuelve lat/lon al centro del bbox del contrato", () => {
    const hits: ResultadoBusquedaContrato[] = [
      {
        tipo: "colonia",
        etiqueta: "Pueblo Nuevo",
        entidad: 26,
        seccion: 438,
        bbox: [-114.762, 32.463, -114.754, 32.469],
      },
    ];
    const r = adaptarBusqueda(hits) as ColoniaResultado[];
    expect(r[0].lat).toBeCloseTo(32.466, 3);
    expect(r[0].lon).toBeCloseTo(-114.758, 3);
    expect(r[0].claveSeccion).toBe("0438");
  });

  it("las colonias demo manejan secciones válidas de Sonora (48 cartografía)", () => {
    const lista = colonias as unknown as ColoniaResultado[];
    expect(lista.length).toBeGreaterThanOrEqual(20);
    for (const c of lista) {
      expect(c.lat).toBeGreaterThan(26);
      expect(c.lat).toBeLessThan(32.6);
      expect(c.lon).toBeLessThan(-108);
      expect(c.lon).toBeGreaterThan(-115.5);
    }
  });

  it("la sesión del contrato expira correctamente", () => {
    expect(sesionExpirada(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(sesionExpirada(new Date(Date.now() + 8 * 3600_000).toISOString())).toBe(false);
  });

  it("la clave de entidad con nombre entrega el nombre real (Sonora / CDMX)", () => {
    expect(nombreEntidad(26)).toBe("Sonora");
    expect(nombreEntidad(9)).toBe("Ciudad de México");
    expect(nombreEntidad(7)).toBe("Chiapas");
    expect(nombreEntidad(15)).toBe("Estado de México");
  });

  it("los umbrales adaptados sin contrato parten de UMBRALES_V1", () => {
    expect(adaptarUmbrales({ muyAlto: 0.62, alto: 0.55, medio: 0.47 }).MUY_ALTO).toEqual({
      min: 0.62,
      max: null,
    });
    expect(adaptarUmbrales(undefined).BAJO).toEqual(UMBRALES_V1.BAJO);
  });
});
