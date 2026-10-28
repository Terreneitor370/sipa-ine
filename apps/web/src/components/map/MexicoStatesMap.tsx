import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, ScaleControl, TileLayer, useMapEvents } from "react-leaflet";
import type { Layer, Path, PathOptions } from "leaflet";
import { OsmAttribution } from "./OsmAttribution";
import { LeyendaFlotante } from "./LeyendaFlotante";
import { COLOR_NIVEL, ETIQUETA_NIVEL, nivelDesdeAbstencion } from "../../lib/riesgo";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function Coordenadas() {
  const [pos, setPos] = useState<[number, number] | null>(null);
  useMapEvents({
    mousemove: (e) => setPos([e.latlng.lat, e.latlng.lng]),
    mouseout: () => setPos(null),
  });
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 z-[500] border-t border-l border-linea bg-white/90 px-2 py-1 text-[10px] text-ink-2">
      {pos
        ? `LAT: ${Math.abs(pos[0]).toFixed(4)}° ${pos[0] >= 0 ? "N" : "S"} | LON: ${Math.abs(pos[1]).toFixed(4)}° ${pos[1] >= 0 ? "E" : "O"}`
        : "LAT: — | LON: —"}
    </div>
  );
}

function claveEntidadDesdeFeature(props: Record<string, unknown> | null | undefined): string | null {
  if (!props) return null;
  const code = props.state_code as number | undefined;
  if (code != null) return String(code).padStart(2, "0");
  return null;
}

export function MexicoStatesMap({
  entidadesConDatos,
  conSecciones,
  abstencionPromedioPorEntidad,
  seccionesPorEntidad,
  umbrales,
  entidadResaltada,
  onSeleccionEntidad,
}: {
  entidadesConDatos: Set<string>;
  /** Entidades con cartografía de secciones cargada (demo: Sonora) */
  conSecciones?: Set<string>;
  abstencionPromedioPorEntidad: Map<string, number>;
  /** Secciones por entidad para el tooltip (mapa nacional). */
  seccionesPorEntidad?: Map<string, number>;
  /** Umbrales del modelo para la leyenda flotante. */
  umbrales?: Record<string, { min: number | null; max: number | null }>;
  entidadResaltada?: string;
  onSeleccionEntidad?: (clave: string, nombre: string) => void;
}) {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/geo/mexico-estados.json")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelado) setGeo(data as GeoJSON.FeatureCollection);
      })
      .catch(() => {
        if (!cancelado) setGeo(null);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (!geo) {
    return (
      <p className="p-4 text-[13px] text-ink-2">Cargando mapa de México…</p>
    );
  }

  return (
    <MapContainer
      center={[23.63, -102.55]}
      zoom={5}
      minZoom={4}
      preferCanvas
      scrollWheelZoom
      attributionControl={false}
      className="h-full w-full"
      data-testid="mexico-states-map"
    >
      <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
      <ScaleControl position="bottomleft" imperial={false} />
      <OsmAttribution />
      <LeyendaFlotante umbrales={umbrales} />
      <Coordenadas />
      <GeoJSON
        data={geo}
        style={(feature): PathOptions => {
          const clave = claveEntidadDesdeFeature(feature?.properties as Record<string, unknown>);
          const tieneDatos = clave != null && entidadesConDatos.has(clave);
          const abst = clave != null ? abstencionPromedioPorEntidad.get(clave) : undefined;
          const resaltada = clave != null && clave === entidadResaltada;
          if (tieneDatos && clave && abst != null) {
            const nivel = nivelDesdeAbstencion(abst);
            return {
              fillColor: COLOR_NIVEL[nivel],
              fillOpacity: 0.6,
              weight: resaltada ? 2 : 1,
              color: resaltada ? "#d5007f" : "#ffffff",
            };
          }
          if (tieneDatos) {
            // Cumple datos pero quedó fuera del filtro de nivel aplicado
            return {
              fillColor: "#f3f4f6",
              fillOpacity: 0.3,
              weight: 0.8,
              color: "#e5e7eb",
            };
          }
          return {
            fillColor: "#e5e7eb",
            fillOpacity: 0.45,
            weight: 0.8,
            color: "#ffffff",
          };
        }}
        onEachFeature={(feature, layer: Layer) => {
          const props = feature.properties as { state_name?: string; state_code?: number };
          const clave = claveEntidadDesdeFeature(props);
          const nombre = props.state_name ?? "Entidad";
          const tieneDatos = clave != null && entidadesConDatos.has(clave);
          const navegable = clave != null && (conSecciones?.has(clave) ?? false);
          const abst = clave != null ? abstencionPromedioPorEntidad.get(clave) : undefined;
          const nivel = abst != null ? nivelDesdeAbstencion(abst) : null;
          const fueraDelFiltro = tieneDatos && abst == null;
          const nSecciones = clave != null ? seccionesPorEntidad?.get(clave) : undefined;
          const html =
            `<div style="font-size:11px;line-height:1.45">` +
            `<b>${nombre}</b><br/>` +
            (tieneDatos && nivel && abst != null
              ? `<span><span style="background:${COLOR_NIVEL[nivel]};color:${
                  nivel === "MEDIO" || nivel === "BAJO" || nivel === "ALTO" ? "#1a2a4a" : "#fff"
                };padding:0 4px;border-radius:2px">${ETIQUETA_NIVEL[nivel]} · ${(abst * 100).toFixed(1)}%</span></span><br/>` +
                (nSecciones != null
                  ? `<span>${nSecciones.toLocaleString("es-MX")} secciones electorales</span><br/>`
                  : "") +
                (navegable
                  ? `<span>Secciones con cartografía de demo · clic para detalle</span>`
                  : `<span style="color:#6B7280">Cartografía de secciones pendiente en la demo</span>`)
              : fueraDelFiltro
                ? `<span style="color:#6B7280">Fuera del filtro de nivel aplicado</span>`
                : `<span style="color:#6B7280">Sin predicciones en este entorno de demo</span>`) +
            `</div>`;
          layer.bindTooltip(html, { sticky: true });
          if (navegable && clave && !fueraDelFiltro) {
            layer.on("click", () => onSeleccionEntidad?.(clave, nombre));
            (layer as Path).on("mouseover", function (this: Path) {
              this.setStyle({ weight: 2, color: "#d5007f" });
            });
            (layer as Path).on("mouseout", function (this: Path) {
              this.setStyle({ weight: 1, color: "#ffffff" });
            });
          }
        }}
      />
    </MapContainer>
  );
}
