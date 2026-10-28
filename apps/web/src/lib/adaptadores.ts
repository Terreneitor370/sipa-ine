/**
 * Convertidores del contrato congelado (docs/openapi.yaml, v1 — PR #3)
 * al modelo interno del frontend. Toda respuesta de la API pasa por aquí,
 * para que las pantallas mantengan su modelo interno (types/api.ts).
 */
import { feature as topojsonFeature } from "topojson-client";
import type {
  NivelRiesgo,
  RiesgoRespuesta,
  RiesgoSeccion,
  SeccionFicha,
  ModeloInfo,
  PriorizacionRespuesta,
  ColoniaResultado,
  Entidad,
  Palancas,
  SimulacionRequest,
  Escenario,
} from "../types/api";
import { contarPorNivel, UMBRALES_V1 } from "./riesgo";

const pad2 = (n: number | string) => String(n).padStart(2, "0");
const pad4 = (n: number | string) => String(n).padStart(4, "0");

/* ======== Tipos del contrato (camelCase de openapi.yaml) ======== */

export interface SesionContrato {
  token: string;
  /** Fecha-hora ISO en la que expires el token JWT. */
  expiraEn: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: "ADMIN" | "ANALISTA";
    activo?: boolean;
    ultimoAcceso?: string | null;
  };
}

export interface EntidadContrato {
  entidad: number;
  nombre: string;
  secciones?: number;
}

export interface MunicipioContrato {
  entidad: number;
  municipio: number;
  nombre: string;
}

export interface UmbralesContrato {
  muyAlto?: number;
  alto?: number;
  medio?: number;
}

export interface RiesgoSeccionContrato {
  entidad: number;
  seccion: number;
  municipio: number;
  tipoSeccion?: "urbana" | "mixta" | "rural";
  listaNominal?: number;
  abstencionPred: number;
  p10?: number;
  p90?: number;
  nivelRiesgo: NivelRiesgo;
}

export interface RiesgoSeccionesContrato {
  escenario: string;
  modeloVersion?: string;
  eleccionObjetivo?: number;
  umbrales?: UmbralesContrato;
  secciones: RiesgoSeccionContrato[];
}

export interface HistorialContrato {
  anio: number;
  tipoEleccion: "presidencial" | "intermedia";
  listaNominal?: number;
  votosTotales?: number;
  participacion?: number;
  abstencion?: number;
}

export interface FichaContrato {
  entidad: number;
  seccion: number;
  municipio?: number;
  municipioNombre?: string;
  distritoFederal?: number;
  tipoSeccion?: "urbana" | "mixta" | "rural";
  modeloVersion?: string;
  indicadores?: Record<string, number | null>;
  historial: HistorialContrato[];
  prediccion: {
    escenario?: string;
    eleccionObjetivo?: number;
    abstencionPred?: number;
    p10?: number;
    p90?: number;
    nivelRiesgo?: NivelRiesgo;
  };
}

export interface ExplicacionContrato {
  entidad: number;
  seccion: number;
  valorBase?: number;
  abstencionPred?: number;
  factores?: {
    variable: string;
    etiqueta: string;
    valor?: number;
    contribucion: number;
  }[];
}

export interface ColoniaSeccionContrato {
  colonia: string;
  pctArea?: number;
}

export interface ResultadoBusquedaContrato {
  tipo: "colonia" | "municipio" | "seccion";
  etiqueta: string;
  entidad: number;
  municipio?: number;
  seccion?: number;
  secciones?: number[];
  bbox?: [number, number, number, number];
}

export interface ModeloContrato {
  version: string;
  entrenadoEn?: string;
  eleccionPrueba?: number;
  seccionesEntrenamiento?: number;
  metricas?: { rmse?: number; mae?: number; r2?: number };
  baseline?: { rmse?: number; mae?: number; r2?: number; descripcion?: string };
  umbrales?: UmbralesContrato;
  importancia?: { variable: string; etiqueta: string; importancia: number }[];
  /** Extensiones demo: fuentes y limitaciones metodológicas del model card. */
  fuentes?: string[];
  limitaciones?: string[];
}

export interface PriorizacionContrato {
  entidad: number;
  seccion: number;
  municipio?: number;
  listaNominal?: number;
  abstencionA: number;
  abstencionB?: number;
  votosRecuperables?: number;
  nivelRiesgoA?: NivelRiesgo;
}

export interface EscenarioResumenContrato {
  escenarioId: number;
  nombre: string;
  entidad: number;
  creadoPor?: string;
  creadoEn?: string;
  votosRecuperables?: number;
}

export interface PalancasContrato {
  reduccionElectoresCasilla: number;
  distMacMaxKm: number | null;
  campanaDigital: { efectoPp: number; cobertura: number } | null;
  focalizacion: { niveles: NivelRiesgo[]; municipios: number[] };
}

export interface SimulacionEntradaContrato {
  nombre?: string;
  entidad: number;
  palancas: PalancasContrato;
}

export interface SimulacionResultadoContrato {
  escenarioId: number;
  modeloVersion: string;
  cache: boolean;
  resumen: {
    seccionesAfectadas: number;
    abstencionPromedio: { A: number; B: number };
    porNivel: { A: Record<string, number>; B: Record<string, number> };
    votosRecuperables: number;
  };
}

/* ======== Catálogos estáticos ======== */

/** Nombres oficiales de las 32 entidades federativas (clave INE 1-32). */
export const NOMBRES_ENTIDAD: Record<number, string> = {
  1: "Aguascalientes",
  2: "Baja California",
  3: "Baja California Sur",
  4: "Campeche",
  5: "Chiapas",
  6: "Chihuahua",
  7: "Ciudad de México",
  8: "Coahuila",
  9: "Colima",
  10: "Durango",
  11: "Estado de México",
  12: "Guanajuato",
  13: "Guerrero",
  14: "Hidalgo",
  15: "Jalisco",
  16: "Michoacán",
  17: "Morelos",
  18: "Nayarit",
  19: "Nuevo León",
  20: "Oaxaca",
  21: "Puebla",
  22: "Querétaro",
  23: "Quintana Roo",
  24: "San Luis Potosí",
  25: "Sinaloa",
  26: "Sonora",
  27: "Tabasco",
  28: "Tamaulipas",
  29: "Tlaxcala",
  30: "Veracruz",
  31: "Yucatán",
  32: "Zacatecas",
};

export const nombreEntidad = (n: number): string => NOMBRES_ENTIDAD[n] ?? `Entidad ${pad2(n)}`;

/* ======== Convertidores ======== */

export function adaptarUmbrales(
  u: UmbralesContrato | undefined,
  respaldo: RiesgoRespuesta["umbrales"] = UMBRALES_V1,
): RiesgoRespuesta["umbrales"] {
  if (!u || u.alto == null || u.medio == null) return respaldo;
  const muyAlto = u.muyAlto ?? respaldo.MUY_ALTO.min ?? 0.559;
  return {
    MUY_ALTO: { min: muyAlto, max: null },
    ALTO: { min: u.alto, max: muyAlto },
    MEDIO: { min: u.medio, max: u.alto },
    BAJO: { min: null, max: u.medio },
  };
}

export function adaptarEntidades(lista: EntidadContrato[]): Entidad[] {
  return lista.map((e) => ({
    clave: pad2(e.entidad),
    nombre: e.nombre,
    secciones: e.secciones,
  }));
}

export function adaptarRiesgoSecciones(
  rs: RiesgoSeccionesContrato,
  municipiosPorClave: Record<number, string> = {},
): RiesgoRespuesta {
  const secciones: RiesgoSeccion[] = rs.secciones.map((s) => ({
    seccionId: s.seccion,
    claveSeccion: pad4(s.seccion),
    nombre: `Sección ${s.seccion}`,
    municipio: municipiosPorClave[s.municipio] ?? `Clave ${s.municipio}`,
    distrito: 0, // el contrato no entrega distrito federal en la lista de riesgo
    listaNominal: s.listaNominal ?? 0,
    abstencionPredicha: s.abstencionPred,
    p10: s.p10 ?? s.abstencionPred,
    p90: s.p90 ?? s.abstencionPred,
    nivel: s.nivelRiesgo,
  }));
  const promedio = secciones.length
    ? secciones.reduce((acc, s) => acc + s.abstencionPredicha, 0) / secciones.length
    : 0;
  return {
    entidad: secciones.length ? pad2(rs.secciones[0].entidad) : "00",
    escenario: rs.escenario as Escenario,
    totalSecciones: secciones.length,
    abstencionPromedio: promedio,
    porNivel: contarPorNivel(secciones),
    umbrales: adaptarUmbrales(rs.umbrales),
    secciones,
  };
}

const ESTRATO_MARG: Record<string | number, string> = {
  0: "Sin marginación",
  1: "Muy bajo",
  2: "Bajo",
  3: "Medio",
  4: "Alto",
  5: "Muy alto",
};

export function adaptarFicha(
  f: FichaContrato,
  explicacion?: ExplicacionContrato | null,
  colonias?: ColoniaSeccionContrato[] | null,
): SeccionFicha & { coloniasQueCubre: { colonia: string; pctArea?: number }[] } {
  const pred = f.prediccion ?? ({} as Partial<FichaContrato["prediccion"]>);
  const p10 = pred.p10 ?? 0;
  const p90 = pred.p90 ?? 0;
  const media = pred.abstencionPred ?? 0;
  const ind = f.indicadores ?? {};
  const num = (k: string, porDefecto = 0) =>
    typeof ind[k] === "number" ? (ind[k] as number) : porDefecto;
  const margRaw = ind.marginacion;
  const margLabel = ESTRATO_MARG[String(margRaw)] ?? (margRaw == null ? "—" : String(margRaw));
  return {
    seccionId: f.seccion,
    claveSeccion: pad4(f.seccion),
    nombre: `Sección ${f.seccion}`,
    municipio: f.municipioNombre ?? (f.municipio != null ? `Clave ${f.municipio}` : "—"),
    distrito: f.distritoFederal ?? 0,
    entidad: nombreEntidad(f.entidad),
    modeloVersion: f.modeloVersion ?? "—",
    predicciones: {
      p10,
      media,
      p90,
      amplitudPp: Math.round((p90 - p10) * 1000) / 10,
    },
    indicadores: {
      listaNominal: num("listaNominal"),
      electoresPorCasilla: num("electoresPorCasilla", 750),
      distMacKm: num("distMacKm"),
      marginacion: margLabel,
      pctInternet: num("pctVivInternet", num("pctInternet")),
    },
    historico: (f.historial ?? []).map((h) => ({
      anio: h.anio,
      tipo: h.tipoEleccion,
      abstencion: h.abstencion ?? null,
      proyectado: h.anio >= (pred.eleccionObjetivo ?? 2027),
    })),
    factoresTop: (explicacion?.factores ?? []).map((x) => ({
      variable: x.variable,
      descripcion: x.etiqueta,
      contribucion: x.contribucion,
    })),
    coloniasQueCubre: (colonias ?? []).map((c) => ({
      colonia: c.colonia,
      pctArea: c.pctArea,
    })),
  };
}

export function adaptarModelo(m: ModeloContrato): ModeloInfo {
  const met = m.metricas ?? {};
  const base = m.baseline ?? {};
  const filas: ModeloInfo["metricas"] = [];
  if (met.rmse != null) {
    filas.push({ nombre: "RMSE", modelo: met.rmse, baseline: base.rmse ?? null, mejora: null });
  }
  if (met.mae != null) {
    filas.push({ nombre: "MAE", modelo: met.mae, baseline: base.mae ?? null, mejora: null });
  }
  if (met.r2 != null) {
    filas.push({ nombre: "R²", modelo: met.r2, baseline: null, mejora: null });
  }
  return {
    version: m.version,
    algoritmo: "XGBoost (XGBRegressor)",
    entrenamiento: "2018–2021",
    prueba: `${m.eleccionPrueba ?? 2024} (OOT temporal)`,
    metricas: filas,
    importanciaVariables: (m.importancia ?? []).map((i) => ({
      variable: i.etiqueta,
      gain: i.importancia,
    })),
    fuentes: m.fuentes ?? [],
    limitaciones: m.limitaciones ?? [],
  };
}

export function adaptarPriorizacion(
  filas: PriorizacionContrato[],
  escenarioId: number,
  municipiosPorClave: Record<number, string> = {},
): PriorizacionRespuesta {
  const adaptadas = filas.map((p) => ({
    seccionId: p.seccion,
    claveSeccion: pad4(p.seccion),
    entidad: pad2(p.entidad),
    municipio: municipiosPorClave[p.municipio ?? -1] ?? String(p.municipio ?? "—"),
    listaNominal: p.listaNominal ?? 0,
    abstencionA: p.abstencionA,
    deltaPp:
      p.abstencionB != null
        ? Math.round((p.abstencionB - p.abstencionA) * 1000) / 10
        : 0,
    votosRecuperables: p.votosRecuperables ?? 0,
    nivel: p.nivelRiesgoA ?? "MEDIO",
  }));
  return {
    escenarioId,
    total: adaptadas.length,
    filas: adaptadas.sort((a, b) => b.votosRecuperables - a.votosRecuperables),
  };
}

export function adaptarBusqueda(
  items: ResultadoBusquedaContrato[],
): ColoniaResultado[] {
  return items.map((r) => ({
    colonia: r.etiqueta,
    municipio:
      r.tipo === "seccion"
        ? `Sección ${r.seccion}`
        : r.tipo === "colonia"
          ? r.etiqueta
          : r.etiqueta,
    entidad: nombreEntidad(r.entidad),
    entidadClave: pad2(r.entidad),
    seccionId: r.seccion ?? r.secciones?.[0] ?? 0,
    claveSeccion: pad4(r.seccion ?? r.secciones?.[0] ?? 0),
    // El contrato entrega bbox en lugar de lat/lon: se usa el centro del bbox
    // para centrar el mapa (comportamiento equivalente en la demo).
    lat: r.bbox ? Math.round(((r.bbox[1] + r.bbox[3]) / 2) * 1e6) / 1e6 : 0,
    lon: r.bbox ? Math.round(((r.bbox[0] + r.bbox[2]) / 2) * 1e6) / 1e6 : 0,
    bbox: r.bbox,
  }));
}

/** Entrada del simulador (modelo interno de palancas) → cuerpo del contrato. */
export function aSimulacionEntrada(
  req: SimulacionRequest,
  clavesMunicipio: Record<string, number> = {},
): SimulacionEntradaContrato {
  const pal: Palancas = req.palancas;
  return {
    nombre: req.nombre,
    entidad: Number(req.entidad) || 26,
    palancas: {
      reduccionElectoresCasilla: pal.reduccionElectoresCasilla,
      distMacMaxKm: pal.distMacMaxKm,
      campanaDigital: pal.campanaDigital,
      focalizacion: {
        niveles: pal.focalizacion.niveles,
        municipios: pal.focalizacion.municipios
          .map((m) => clavesMunicipio[m] ?? Number(m))
          .filter((n) => Number.isFinite(n) && n > 0),
      },
    },
  };
}

export function adaptarSimulacion(s: SimulacionResultadoContrato): SimulacionResultadoContrato {
  return s; // la forma del contrato coincide con el modelo interno SimulacionResumen
}

/** SesionContrato → (token, usuario interno). La expiración se valida por fecha. */
export function adaptarSesion(s: SesionContrato): { token: string; usuario: SesionContrato["usuario"] } {
  return { token: s.token, usuario: s.usuario };
}

export function sesionExpirada(expiraEn: string): boolean {
  const t = Date.parse(expiraEn);
  return Number.isNaN(t) || t <= Date.now();
}

export interface EscenarioGuardado {
  escenarioId: number;
  nombre: string;
  entidadClave: string;
  entidadNombre: string;
  creadoPor: string;
  creadoEn: string;
  votosRecuperables: number;
}

export function adaptarEscenarios(lista: EscenarioResumenContrato[]): EscenarioGuardado[] {
  return lista.map((e) => ({
    escenarioId: e.escenarioId,
    nombre: e.nombre,
    entidadClave: pad2(e.entidad),
    entidadNombre: nombreEntidad(e.entidad),
    creadoPor: e.creadoPor ?? "—",
    creadoEn: e.creadoEn ?? "",
    votosRecuperables: e.votosRecuperables ?? 0,
  }));
}

/** TopoJSON (contrato de /geo/*) → GeoJSON (react-leaflet). */
export function topojsonAGeojson(topo: unknown, nombreObjeto?: string): GeoJSON.FeatureCollection {
  const objects = (topo as { objects: Record<string, unknown> }).objects ?? {};
  const llave = nombreObjeto && objects[nombreObjeto] ? nombreObjeto : Object.keys(objects)[0];
  const fc = topojsonFeature(
    topo as never,
    (objects as Record<string, never>)[llave],
  ) as unknown as GeoJSON.FeatureCollection;
  return fc;
}
