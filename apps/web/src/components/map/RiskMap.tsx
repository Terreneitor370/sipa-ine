import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, ScaleControl, TileLayer, useMap, useMapEvents } from "react-leaflet";
import * as L from "leaflet";
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

/** Ajusta la vista al rectángulo (potentreto/potretazo) del GeoJSON al cargar */
function AjusteVista({ geo }: { geo: FeatureCollectionGeo }) {
  const map = useMap();
  useEffect(() => {
    try {
      const b = L.geoJSON(geo as unknown as GeoJSON.GeoJsonObject).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [10, 10] });
    } catch {
      // geometría inválida: se deja la vista por defecto
    }
  }, [geo, map]);
  return null;
}

export function RiskMap({
  geo,
  riesgo,
  onSeleccion,
  /**
   * Si se pasa, solo las secciones que cumplen el predicado se pintan (con su
   * nivel y un contorno vino) y el resto se atenúa. Sirve para mostrar las
   * secciones focalizadas por la intervención (mapa del escenario B).
   */
  resaltadas,
  zoom = 8,
}: {
  geo: FeatureCollectionGeo;
  riesgo?: RiesgoRespuesta;
  onSeleccion?: (seccionId: number) => void;
  resaltadas?: (s: NonNullable<RiesgoRespuesta["secciones"]>[number]) => boolean;
  zoom?: number;
}) {
  const porClave = new Map(riesgo?.secciones.map((s) => [s.claveSeccion, s]) ?? []);
  void zoom;

  return (
    <MapContainer
      center={[23.2, -102.5]}
      zoom={5}
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
      <AjusteVista geo={geo} />
      <GeoJSON
        key={riesgo ? "riesgo-listo" : "riesgo-pendiente"}
        data={geo as unknown as GeoJSON.FeatureCollection}
        style={(feature): PathOptions => {
          const clave = feature?.properties?.claveSeccion as string | undefined;
          const seccion = clave ? porClave.get(clave) : undefined;
          if (!seccion) return SIN_DATOS;
          if (resaltadas) {
            // Modo foco: solo las secciones que la intervención toca se pintan
            return resaltadas(seccion)
              ? { ...estiloPoligono(seccion.nivel), weight: 2.5, color: "#950054", fillOpacity: 0.85 }
              : SIN_DATOS;
          }
          return estiloPoligono(seccion.nivel);
        }}
        onEachFeature={(feature, layer: Layer) => {
          const clave = feature?.properties?.claveSeccion as string | undefined;
          const seccion = clave ? porClave.get(clave) : undefined;
          if (!seccion) return;
          const html =
            `<div style="font-size:11px;line-height:1.45">` +
            `<b>&#9632; SECCIÓN: ${escapar(seccion.claveSeccion)} (${escapar(seccion.municipio)})</b><br/>` +
            (resaltadas
              ? `<b>Focalizada por la intervención</b><br/>`
              : "") +
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
