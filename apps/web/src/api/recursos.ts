/**
 * Capa de recursos: cada función habla el contrato congelado (docs/openapi.yaml,
 * PR #3) y convierte las respuestas con lib/adaptadores.ts al modelo interno.
 * Con USAR_MOCKS, los mocks están en forma contrato y pasan por el mismo código.
 */
import type {
  ColoniaResultado,
  Entidad,
  FeatureCollectionGeo,
  ModeloInfo,
  PriorizacionRespuesta,
  RiesgoNacionalRespuesta,
  RiesgoRespuesta,
  SeccionFicha,
  SimulacionRequest,
  SimulacionResumen,
} from "../types/api";
import { USAR_MOCKS, http } from "./client";
import {
  adaptarBusqueda,
  adaptarEntidades,
  adaptarFicha,
  adaptarModelo,
  adaptarPriorizacion,
  adaptarRiesgoSecciones,
  adaptarSimulacion,
  adaptarUmbrales,
  aSimulacionEntrada,
  adaptarEscenarios,
  nombreEntidad,
  type EscenarioGuardado,
  type EscenarioResumenContrato,
  type EntidadContrato,
  type MunicipioContrato,
  type RiesgoSeccionesContrato,
  type FichaContrato,
  type ExplicacionContrato,
  type ColoniaSeccionContrato,
  type ResultadoBusquedaContrato,
  type ModeloContrato,
  type PriorizacionContrato,
  type SimulacionResultadoContrato,
} from "../lib/adaptadores";

import catalogosMock from "../mocks/catalogos.json";
import riesgoMock from "../mocks/riesgo.json";
import riesgoNacionalMock from "../mocks/riesgo-nacional.json";
import geoMock from "../mocks/geo-sonora.json";
import fichaMock from "../mocks/seccion-ficha.json";
import explicacionMock from "../mocks/seccion-explicacion.json";
import simulacionMock from "../mocks/simulacion.json";
import priorizacionMock from "../mocks/priorizacion.json";
import modeloMock from "../mocks/modelo.json";
import coloniasMock from "../mocks/colonias.json";

export type { ColoniaResultado } from "../types/api";

const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const pad4 = (n: number | string) => String(n).padStart(4, "0");

/* ======== Catálogo de municipios (contrato: objetos, no strings) ======== */

interface CatalogoMunicipios {
  nombres: string[];
  clavePorNombre: Record<string, number>;
  nombrePorClave: Record<number, string>;
}

let cacheMunicipios: CatalogoMunicipios | null = null;
const cacheMunicipiosReal = new Map<string, CatalogoMunicipios>();

function municipiosDemo(): CatalogoMunicipios {
  if (cacheMunicipios) return cacheMunicipios;
  const lista = (catalogosMock as { municipiosSonora: MunicipioContrato[] }).municipiosSonora;
  const clavePorNombre: Record<string, number> = {};
  const nombrePorClave: Record<number, string> = {};
  for (const m of lista) {
    clavePorNombre[m.nombre] = m.municipio;
    nombrePorClave[m.municipio] = m.nombre;
  }
  cacheMunicipios = { nombres: lista.map((m) => m.nombre), clavePorNombre, nombrePorClave };
  return cacheMunicipios;
}

/** Une varios catálogos por entidad (para respuestas que mezclan entidades). */
function unirCatalogos(lista: CatalogoMunicipios[]): CatalogoMunicipios {
  const clavePorNombre: Record<string, number> = {};
  const nombrePorClave: Record<number, string> = {};
  let nombres: string[] = [];
  for (const c of lista) {
    Object.assign(clavePorNombre, c.clavePorNombre);
    Object.assign(nombrePorClave, c.nombrePorClave);
    if (!nombres.length) nombres = c.nombres;
  }
  return { nombres, clavePorNombre, nombrePorClave };
}

export async function obtenerCatalogoMunicipios(entidad: string): Promise<CatalogoMunicipios> {
  if (USAR_MOCKS) {
    await espera(80);
    return municipiosDemo();
  }
  const enCache = cacheMunicipiosReal.get(entidad);
  if (enCache) return enCache;
  const { data } = await http.get<MunicipioContrato[]>(`/entidades/${entidad}/municipios`);
  const clavePorNombre: Record<string, number> = {};
  const nombrePorClave: Record<number, string> = {};
  for (const m of data) {
    clavePorNombre[m.nombre] = m.municipio;
    nombrePorClave[m.municipio] = m.nombre;
  }
  const catalogo = { nombres: data.map((m) => m.nombre), clavePorNombre, nombrePorClave };
  cacheMunicipiosReal.set(entidad, catalogo);
  return catalogo;
}

/* ======== Entidades ======== */

export async function obtenerEntidades(): Promise<Entidad[]> {
  if (USAR_MOCKS) {
    await espera(80);
    const lista = adaptarEntidades((catalogosMock as { entidades: EntidadContrato[] }).entidades);
    // Opción "vista nacional" del selector (sintetizada, no viene del contrato)
    const totalSecciones = lista.reduce((a, e) => a + (e.secciones ?? 0), 0);
    return [{ clave: "00", nombre: "México (vista nacional)", secciones: totalSecciones }, ...lista];
  }
  const { data } = await http.get<EntidadContrato[]>("/entidades");
  const lista = adaptarEntidades(data);
  const totalSecciones = lista.reduce((a, e) => a + (e.secciones ?? 0), 0);
  return [{ clave: "00", nombre: "México (vista nacional)", secciones: totalSecciones }, ...lista];
}

export async function obtenerMunicipios(entidad: string): Promise<string[]> {
  return (await obtenerCatalogoMunicipios(entidad)).nombres;
}

/* ======== Riesgo por sección ======== */

export async function obtenerRiesgo(filtros: {
  entidad: string;
  municipio?: string;
  distrito?: number;
  nivel?: string;
}): Promise<RiesgoRespuesta> {
  if (USAR_MOCKS) {
    await espera();
    const catalogo = municipiosDemo();
    return adaptarRiesgoSecciones(
      riesgoMock as unknown as RiesgoSeccionesContrato,
      catalogo.nombrePorClave,
    );
  }
  const catalogo = await obtenerCatalogoMunicipios(filtros.entidad);
  const { data } = await http.get<RiesgoSeccionesContrato>("/riesgo", {
    params: {
      entidad: Number(filtros.entidad),
      municipio: filtros.municipio != null ? catalogo.clavePorNombre[filtros.municipio] : undefined,
      nivel: filtros.nivel,
    },
  });
  return adaptarRiesgoSecciones(data, catalogo.nombrePorClave);
}

export async function obtenerRiesgoNacional(): Promise<RiesgoNacionalRespuesta> {
  if (USAR_MOCKS) {
    await espera(120);
    const nacional = riesgoNacionalMock as unknown as RiesgoNacionalRespuesta;
    // Mantener a Sonora consistente con las secciones de demo (mocks/riesgo.json)
    const seccionesSonora = adaptarRiesgoSecciones(
      riesgoMock as unknown as RiesgoSeccionesContrato,
      municipiosDemo().nombrePorClave,
    );
    return {
      ...nacional,
      entidades: nacional.entidades.map((e) =>
        e.clave === "26" ? { ...e, abstencionPredicha: seccionesSonora.abstencionPromedio } : e,
      ),
    };
  }
  // El contrato no expone un agregado nacional; se consulta por entidad. En
  // producción esto lo cachea el backend; aquí agrupamos de forma paralela.
  const catalogo = await obtenerEntidades();
  const respuestas = await Promise.all(
    catalogo
      .filter((e) => e.clave !== "00")
      .map(async (e) => {
        const { data } = await http.get<RiesgoSeccionesContrato>("/riesgo", {
          params: { entidad: Number(e.clave), escenario: "inercial" },
        });
        const r = adaptarRiesgoSecciones(data);
        return { clave: e.clave, promedio: r.abstencionPromedio, niveles: r.porNivel };
      }),
  );
  const entidades = catalogo
    .filter((e) => e.clave !== "00")
    .map((e) => {
      const r = respuestas.find((x) => x.clave === e.clave);
      return {
        clave: e.clave,
        nombre: e.nombre,
        secciones: e.secciones ?? 0,
        abstencionPredicha: r?.promedio ?? 0,
      };
    });
  return {
    escenario: "inercial" as "inercial",
    totalSecciones: entidades.reduce((a, e) => a + e.secciones, 0),
    abstencionPromedio: 0,
    umbrales: adaptarUmbrales(undefined),
    entidades,
  };
}

/* ======== Geografía de demo ======== */

/**
 * Cartografía de secciones de Sonora (demo, GeoJSON pregenerado). Cuando el
 * backend sirva /geo/{entidad}/{municipio} en TopoJSON, se convierte con
 * topojsonAGeojson() del paquete topojson-client.
 */
export async function obtenerGeo(entidad: string): Promise<FeatureCollectionGeo> {
  if (USAR_MOCKS) {
    await espera(120);
    return geoMock as FeatureCollectionGeo;
  }
  // Versión real: TopoJSON del contrato.
  const { topojsonAGeojson } = await import("../lib/adaptadores");
  const { data } = await http.get<unknown>(`/geo/${entidad}`);
  const fc = topojsonAGeojson(data);
  return fc as unknown as FeatureCollectionGeo;
}

/* ======== Ficha de sección (ficha + explicación + colonias) ======== */

export async function obtenerSeccion(id: string, entidad = "26"): Promise<SeccionFicha & { coloniasQueCubre: { colonia: string; pctArea?: number }[] }> {
  if (USAR_MOCKS) {
    await espera();
    const ficha = fichaMock as unknown as FichaContrato;
    // La demo pide secciones 0401-448; el mock ficha fija la sección pedida
    const fichaPedida = { ...ficha, seccion: Number(id) } as FichaContrato;
    const base = adaptarFicha(
      fichaPedida,
      { ...explicacionMock, seccion: Number(id) } as ExplicacionContrato,
      coloniasDeSeccion(id),
    );
    return base;
  }
  const [ficha, explicacion, colonias] = await Promise.all([
    http
      .get<FichaContrato>(`/secciones/${entidad}/${Number(id)}`)
      .catch(() => ({ data: null as unknown as FichaContrato })),
    http
      .get<ExplicacionContrato>(`/secciones/${entidad}/${Number(id)}/explicacion`)
      .catch(() => null),
    http
      .get<{ colonias: ColoniaSeccionContrato[] }>(`/secciones/${entidad}/${Number(id)}/colonias`)
      .catch(() => null),
  ]);
  if (!ficha.data) throw new Error(`No se encontró la sección ${entidad}/${id}`);
  return adaptarFicha(
    ficha.data,
    explicacion?.data ?? null,
    colonias?.data?.colonias ?? null,
  );
}

/** Colonias que cubre una sección (dataset local de demo con lat/lon). */
export function coloniasDeSeccion(id: string): ColoniaSeccionContrato[] {
  const clave = pad4(id);
  return (coloniasMock as unknown as ColoniaResultado[])
    .filter((c) => c.claveSeccion === clave)
    .map((c) => ({ colonia: c.colonia, pctArea: 0.3 }));
}

/* ======== Búsqueda (el contrato entrega bbox, no lat/lon) ======== */

export async function buscarColonias(
  consulta: string,
  entidadClave?: string,
): Promise<ColoniaResultado[]> {
  if (USAR_MOCKS) {
    await espera(80);
    const q = consulta.trim().toLowerCase();
    if (q.length < 2) return [];
    const resultados: ResultadoBusquedaContrato[] = (coloniasMock as unknown as ColoniaResultado[])
      .filter((c) => {
        if (entidadClave && entidadClave !== "00" && c.entidadClave !== entidadClave) return false;
        return `${c.colonia} ${c.municipio} ${c.entidad}`.toLowerCase().includes(q);
      })
      .map((c) => ({
        tipo: "colonia" as const,
        etiqueta: c.colonia,
        entidad: Number(c.entidadClave),
        municipio: municipiosDemo().clavePorNombre[c.municipio],
        seccion: c.seccionId,
        bbox: [
          c.lon - 0.004,
          c.lat - 0.003,
          c.lon + 0.004,
          c.lat + 0.003,
        ] as [number, number, number, number],
      }));
    return adaptarBusqueda(resultados);
  }
  const { data } = await http.get<ResultadoBusquedaContrato[]>("/buscar", {
    params: { q: consulta, entidad: entidadClave && entidadClave !== "00" ? Number(entidadClave) : undefined },
  });
  return adaptarBusqueda(data);
}

/* ======== Simulador ======== */

/** Escenarios guardados (RF-08): listado local de demo + endpoint real. */
let escenariosDemo: EscenarioResumenContrato[] = [
  {
    escenarioId: 12,
    nombre: "Reingeniería de casillas Sonora",
    entidad: 26,
    creadoPor: "Ana Torres",
    creadoEn: "2026-10-15T21:30:00Z",
    votosRecuperables: 18450,
  },
  {
    escenarioId: 9,
    nombre: "MAC móviles en zona rural",
    entidad: 26,
    creadoPor: "Kassie",
    creadoEn: "2026-10-10T16:00:00Z",
    votosRecuperables: 9210,
  },
];

export async function crearSimulacion(req: SimulacionRequest): Promise<SimulacionResumen> {
  if (USAR_MOCKS) {
    await espera(400);
    // Se interpreta la petición interna → cuerpo del contrato y se guarda como escenario (RF-08)
    const catalogo = municipiosDemo();
    void aSimulacionEntrada(req, catalogo.clavePorNombre);
    const creado = {
      escenarioId: Math.floor(100 + Math.random() * 899),
      nombre: req.nombre || "Escenario sin nombre",
      entidad: Number(req.entidad) || 26,
      creadoPor: "Analista demo",
      creadoEn: new Date().toISOString(),
      votosRecuperables:
        (simulacionMock as unknown as SimulacionResultadoContrato).resumen.votosRecuperables,
    };
    escenariosDemo = [creado, ...escenariosDemo].slice(0, 20);
    return adaptarSimulacion(simulacionMock as unknown as SimulacionResultadoContrato) as unknown as SimulacionResumen;
  }
  const catalogo = await obtenerCatalogoMunicipios(req.entidad);
  const { data } = await http.post<SimulacionResultadoContrato>(
    "/simulaciones",
    aSimulacionEntrada(req, catalogo.clavePorNombre),
  );
  return adaptarSimulacion(data) as unknown as SimulacionResumen;
}

export async function obtenerEscenarios(): Promise<EscenarioGuardado[]> {
  if (USAR_MOCKS) {
    await espera(150);
    return adaptarEscenarios(escenariosDemo);
  }
  const { data } = await http.get<EscenarioResumenContrato[]>("/escenarios");
  return adaptarEscenarios(data);
}

/* ======== Priorización (ranking de votos recuperables) ======== */

export async function obtenerPriorizacion(escenarioId: number): Promise<PriorizacionRespuesta> {
  if (USAR_MOCKS) {
    await espera();
    return adaptarPriorizacion(
      priorizacionMock as unknown as PriorizacionContrato[],
      escenarioId,
      municipiosDemo().nombrePorClave,
    );
  }
  const { data } = await http.get<PriorizacionContrato[]>("/priorizacion", {
    params: { escenario: escenarioId },
  });
  // Los municipios se resuelven por las entidades presentes en las filas
  const entidadesEnFilas = [...new Set(data.map((p) => String(p.entidad)))];
  const catalogo = unirCatalogos(
    await Promise.all(entidadesEnFilas.map((e) => obtenerCatalogoMunicipios(e))),
  );
  return adaptarPriorizacion(data, escenarioId, catalogo.nombrePorClave);
}

/* ======== Model card ======== */

export async function obtenerModelo(): Promise<ModeloInfo> {
  if (USAR_MOCKS) {
    await espera();
    return adaptarModelo(modeloMock as unknown as ModeloContrato);
  }
  const { data } = await http.get<ModeloContrato>("/modelo");
  return adaptarModelo(data);
}

export { nombreEntidad };

/**
 * Cartografía de secciones disponible. En demo solo Sonora tiene polígonos
 * (48 secciones de prueba); en producción el backend sirve /geo/{entidad}/
 * {municipio} para las 32 entidades y este catálogo se deriva de /entidades.
 */
export function entidadesConGeo(): Set<string> {
  if (USAR_MOCKS) return new Set(["26"]); // cartografía de demo: solo Sonora
  return new Set(
    Array.from({ length: 32 }, (_, i) => String(i + 1).padStart(2, "0")),
  );
}

