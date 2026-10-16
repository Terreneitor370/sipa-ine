import type { Entidad, FeatureCollectionGeo, RiesgoRespuesta } from "../types/api";
import { USAR_MOCKS, http } from "./client";

import riesgoMock from "../mocks/riesgo.json";
import catalogosMock from "../mocks/catalogos.json";
import geoMock from "../mocks/geo-sonora.json";

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
