import type {
  Entidad,
  FeatureCollectionGeo,
  ModeloInfo,
  PriorizacionRespuesta,
  RiesgoRespuesta,
  SeccionFicha,
  SimulacionRequest,
  SimulacionResumen,
} from "../types/api";
import { USAR_MOCKS, http } from "./client";

import riesgoMock from "../mocks/riesgo.json";
import catalogosMock from "../mocks/catalogos.json";
import geoMock from "../mocks/geo-sonora.json";
import seccionMock from "../mocks/seccion-1234.json";
import simulacionMock from "../mocks/simulacion.json";
import priorizacionMock from "../mocks/priorizacion.json";
import modeloMock from "../mocks/modelo.json";

const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export async function obtenerRiesgo(filtros: {
  entidad: string;
  municipio?: string;
  distrito?: number;
  nivel?: string;
}): Promise<RiesgoRespuesta> {
  if (USAR_MOCKS) {
    await espera();
    return riesgoMock as unknown as RiesgoRespuesta;
  }
  const { data } = await http.get<RiesgoRespuesta>("/riesgo", { params: filtros });
  return data;
}

export async function obtenerEntidades(): Promise<Entidad[]> {
  if (USAR_MOCKS) {
    await espera(80);
    return (catalogosMock as { entidades: Entidad[] }).entidades;
  }
  const { data } = await http.get<Entidad[]>("/entidades");
  return data;
}

export async function obtenerMunicipios(entidad: string): Promise<string[]> {
  if (USAR_MOCKS) {
    await espera(80);
    return (catalogosMock as { municipios: string[] }).municipios;
  }
  const { data } = await http.get<string[]>(`/entidades/${entidad}/municipios`);
  return data;
}

export async function obtenerGeo(entidad: string): Promise<FeatureCollectionGeo> {
  if (USAR_MOCKS) {
    await espera(120);
    return geoMock as FeatureCollectionGeo;
  }
  const { data } = await http.get<FeatureCollectionGeo>(`/geo/${entidad}`);
  return data;
}

export async function obtenerSeccion(id: string): Promise<SeccionFicha> {
  if (USAR_MOCKS) {
    await espera();
    return { ...(seccionMock as unknown as SeccionFicha), claveSeccion: id };
  }
  const { data } = await http.get<SeccionFicha>(`/secciones/${id}`);
  return data;
}

export async function crearSimulacion(req: SimulacionRequest): Promise<SimulacionResumen> {
  if (USAR_MOCKS) {
    await espera(400);
    return simulacionMock as unknown as SimulacionResumen;
  }
  const { data } = await http.post<SimulacionResumen>("/simulaciones", req);
  return data;
}

export async function obtenerPriorizacion(escenarioId: number): Promise<PriorizacionRespuesta> {
  if (USAR_MOCKS) {
    await espera();
    return priorizacionMock as unknown as PriorizacionRespuesta;
  }
  const { data } = await http.get<PriorizacionRespuesta>(`/escenarios/${escenarioId}/priorizacion`);
  return data;
}

export async function obtenerModelo(): Promise<ModeloInfo> {
  if (USAR_MOCKS) {
    await espera();
    return modeloMock as unknown as ModeloInfo;
  }
  const { data } = await http.get<ModeloInfo>("/modelo");
  return data;
}
