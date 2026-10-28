import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Entidad,
  FeatureCollectionGeo,
  ModeloInfo,
  PriorizacionRespuesta,
  RiesgoNacionalRespuesta,
  RiesgoRespuesta,
  SeccionFicha,
  SimulacionRequest,
} from "../types/api";
import * as api from "../api/recursos";

export function useRiesgoNacional() {
  return useQuery<RiesgoNacionalRespuesta>({
    queryKey: ["riesgo", "nacional"],
    queryFn: api.obtenerRiesgoNacional,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRiesgo(filtros: {
  entidad: string;
  municipio?: string;
  distrito?: number;
  nivel?: string;
}, enabled = true) {
  return useQuery<RiesgoRespuesta>({
    queryKey: ["riesgo", filtros],
    queryFn: () => api.obtenerRiesgo(filtros),
    enabled: Boolean(filtros.entidad) && enabled,
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

export function useMunicipios(entidad: string, enabled = true) {
  return useQuery<string[]>({
    queryKey: ["municipios", entidad],
    queryFn: () => api.obtenerMunicipios(entidad),
    enabled: enabled && Boolean(entidad) && entidad !== "00",
    staleTime: 60 * 60 * 1000,
  });
}

export function useGeo(entidad: string, enabled = true) {
  return useQuery<FeatureCollectionGeo>({
    queryKey: ["geo", entidad],
    queryFn: () => api.obtenerGeo(entidad),
    enabled: Boolean(entidad) && enabled,
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });
}

export function useSeccion(id: string, entidad = "26") {
  return useQuery<SeccionFicha>({
    queryKey: ["seccion", id, entidad],
    queryFn: () => api.obtenerSeccion(id, entidad),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSimulacion() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (req: SimulacionRequest) => api.crearSimulacion(req),
    // Un escenario nuevo aparece en Priorización sin recargar
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["escenarios"] }),
  });
}

export function usePriorizacion(escenarioId: number) {
  return useQuery<PriorizacionRespuesta>({
    queryKey: ["priorizacion", escenarioId],
    queryFn: () => api.obtenerPriorizacion(escenarioId),
    enabled: escenarioId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useModelo() {
  return useQuery<ModeloInfo>({
    queryKey: ["modelo"],
    queryFn: api.obtenerModelo,
    staleTime: 60 * 60 * 1000,
  });
}

/** RF-08: escenarios guardados del analista (contrato GET /escenarios). */
export function useEscenarios() {
  return useQuery<import("../lib/adaptadores").EscenarioGuardado[]>({
    queryKey: ["escenarios"],
    queryFn: api.obtenerEscenarios,
    staleTime: 60 * 1000,
  });
}
