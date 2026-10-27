export type NivelRiesgo = "MUY_ALTO" | "ALTO" | "MEDIO" | "BAJO";

export interface Entidad {
  clave: string;
  nombre: string;
  secciones?: number;
}

export type Escenario = "inercial" | "intervencion";

export interface ResumenNivel {
  MUY_ALTO: number;
  ALTO: number;
  MEDIO: number;
  BAJO: number;
}

export interface RiesgoSeccion {
  seccionId: number;
  claveSeccion: string;
  nombre: string;
  municipio: string;
  distrito: number;
  listaNominal: number;
  abstencionPredicha: number;
  p10: number;
  p90: number;
  nivel: NivelRiesgo;
}

export interface RiesgoRespuesta {
  entidad: string;
  escenario: Escenario;
  totalSecciones: number;
  abstencionPromedio: number;
  porNivel: ResumenNivel;
  umbrales: Record<NivelRiesgo, { min: number | null; max: number | null }>;
  secciones: RiesgoSeccion[];
}

export interface EntidadRiesgo {
  clave: string;
  nombre: string;
  secciones: number;
  abstencionPredicha: number;
}

export interface RiesgoNacionalRespuesta {
  escenario: Escenario;
  totalSecciones: number;
  abstencionPromedio: number;
  umbrales: Record<NivelRiesgo, { min: number | null; max: number | null }>;
  entidades: EntidadRiesgo[];
}

export interface IndicadoresSeccion {
  listaNominal: number;
  electoresPorCasilla: number;
  distMacKm: number;
  marginacion: string;
  pctInternet: number;
}

export interface PuntoHistorico {
  anio: number;
  tipo: "presidencial" | "intermedia";
  abstencion: number | null;
  proyectado?: boolean;
}

export interface FactorShap {
  variable: string;
  descripcion: string;
  contribucion: number;
}

export interface SeccionFicha {
  seccionId: number;
  claveSeccion: string;
  nombre: string;
  municipio: string;
  distrito: number;
  entidad: string;
  modeloVersion: string;
  predicciones: {
    p10: number;
    media: number;
    p90: number;
    amplitudPp: number;
  };
  indicadores: IndicadoresSeccion;
  historico: PuntoHistorico[];
  factoresTop: FactorShap[];
}

export interface ColoniaResultado {
  colonia: string;
  municipio: string;
  entidad: string;
  entidadClave: string;
  seccionId: number;
  claveSeccion: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number];
}

export interface Palancas {
  reduccionElectoresCasilla: number;
  distMacMaxKm: number | null;
  campanaDigital: { efectoPp: number; cobertura: number } | null;
  focalizacion: { niveles: NivelRiesgo[]; municipios: string[] };
}

export interface SimulacionRequest {
  nombre: string;
  entidad: string;
  palancas: Palancas;
}

export interface SimulacionResumen {
  escenarioId: number;
  modeloVersion: string;
  cache: boolean;
  resumen: {
    seccionesAfectadas: number;
    abstencionPromedio: { A: number; B: number };
    porNivel: { A: ResumenNivel; B: ResumenNivel };
    votosRecuperables: number;
  };
}

export interface FilaPriorizacion {
  seccionId: number;
  claveSeccion: string;
  municipio: string;
  listaNominal: number;
  abstencionA: number;
  deltaPp: number;
  votosRecuperables: number;
  nivel: NivelRiesgo;
}

export interface PriorizacionRespuesta {
  escenarioId: number;
  total: number;
  filas: FilaPriorizacion[];
}

export interface MetricaModelo {
  nombre: string;
  modelo: number | null;
  baseline: number | null;
  mejora: string | null;
}

export interface ModeloInfo {
  version: string;
  algoritmo: string;
  entrenamiento: string;
  prueba: string;
  metricas: MetricaModelo[];
  importanciaVariables: { variable: string; gain: number }[];
  fuentes: string[];
  limitaciones: string[];
}

export type GeoJSONGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export interface FeatureCollectionGeo {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { claveSeccion: string };
    geometry: GeoJSONGeometry;
  }[];
}
