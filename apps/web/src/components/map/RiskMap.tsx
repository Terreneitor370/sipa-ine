import { useState } from "react";
import { GeoJSON, MapContainer, ScaleControl, TileLayer, useMapEvents } from "react-leaflet";
import { OsmAttribution } from "./OsmAttribution";
import { LeyendaFlotante } from "./LeyendaFlotante";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
import type { Layer, PathOptions } from "leaflet";
import type { FeatureCollectionGeo, RiesgoRespuesta } from "../../types/api";
import { estiloPoligono } from "../../lib/riesgo";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

const SIN_DATOS: PathOptions = {
  fillColor: "#cbd5e1",
  fillOpacity: 0.25,
  weight: 0.5,
  color: "#e2e8f0",
};

/** Lee las coordenadas del cursor sobre el mapa (barra inferior tipo plataforma geoespacial). */
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

export function RiskMap({
  geo,
  riesgo,
  onSeleccion,
  centro = [28.9, -110.9],
  zoom = 6,
}: {
  geo: FeatureCollectionGeo;
  riesgo?: RiesgoRespuesta;
  onSeleccion?: (seccionId: number) => void;
  centro?: [number, number];
  zoom?: number;
}) {
  const porClave = new Map(riesgo?.secciones.map((s) => [s.claveSeccion, s]) ?? []);

  return (
    <MapContainer
      center={centro}
      zoom={zoom}
      preferCanvas
      scrollWheelZoom
      attributionControl={false}
      className="h-full w-full"
      data-testid="risk-map"
    >
      <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
      <ScaleControl position="bottomleft" imperial={false} />
      <OsmAttribution />
      <LeyendaFlotante umbrales={riesgo?.umbrales} />
      <Coordenadas />
      <GeoJSON
        data={geo as unknown as GeoJSON.FeatureCollection}
        style={(feature): PathOptions => {
          const clave = feature?.properties?.claveSeccion as string | undefined;
          const seccion = clave ? porClave.get(clave) : undefined;
          return seccion ? estiloPoligono(seccion.nivel) : SIN_DATOS;
        }}
        onEachFeature={(feature, layer: Layer) => {
          const clave = feature?.properties?.claveSeccion as string | undefined;
          const seccion = clave ? porClave.get(clave) : undefined;
          if (!seccion) return;
          const html =
            `<div style="font-size:11px;line-height:1.45">` +
            `<b>&#9632; SECCIÓN: ${escapar(seccion.claveSeccion)} (${escapar(seccion.municipio)})</b><br/>` +
            `Lista nominal: ${seccion.listaNominal.toLocaleString("es-MX")} electores<br/>` +
            `Abstención proyectada: ${(seccion.abstencionPredicha * 100).toFixed(1)}%<br/>` +
            `Intervalo P10–P90: ${(seccion.p10 * 100).toFixed(1)}% – ${(seccion.p90 * 100).toFixed(1)}%<br/>` +
            `<span style="color:#6B7280">Clic para ver la ficha</span></div>`;
          layer.bindTooltip(html, { sticky: true });
          layer.on("click", () => onSeleccion?.(seccion.seccionId));
        }}
      />
    </MapContainer>
  );
}
