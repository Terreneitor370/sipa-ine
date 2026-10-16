import { useQuery } from "@tanstack/react-query";
import type { Entidad, FeatureCollectionGeo, RiesgoRespuesta } from "../types/api";
import * as api from "../api/recursos";

export function useRiesgo(filtros: {
  entidad: string;
  municipio?: string;
  distrito?: number;
  nivel?: string;
}) {
  return useQuery<RiesgoRespuesta>({
    queryKey: ["riesgo", filtros],
    queryFn: () => api.obtenerRiesgo(filtros),
    enabled: Boolean(filtros.entidad),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEntidades() {
  return useQuery<Entidad[]>({
    queryKey: ["entidades"],
    queryFn: api.obtenerEntidades,
    staleTime: 60 * 60 * 1000,
  });
}

export function useMunicipios(entidad: string) {
  return useQuery<string[]>({
    queryKey: ["municipios", entidad],
    queryFn: () => api.obtenerMunicipios(entidad),
    staleTime: 60 * 60 * 1000,
  });
}

export function useGeo(entidad: string) {
  return useQuery<FeatureCollectionGeo>({
    queryKey: ["geo", entidad],
    queryFn: () => api.obtenerGeo(entidad),
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });
}
