// Acceso a los datos que exporta ml/src/export/exportar_api.py.
// Los archivos se leen una vez y quedan en memoria (son de solo lectura).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { topology } from "topojson-server";

export class Datos {
  constructor(dirProcesados) {
    this.dirApi = path.join(dirProcesados, "api");
    this.dirGeo = path.join(dirProcesados, "geo");
    this.cacheSecciones = new Map();
    this.cacheGeo = new Map();
    this._entidades = null;
    this._municipios = null;
    this._modelo = null;
    this._colonias = new Map();
    this._mac = new Map();
  }

  disponible() {
    return existsSync(path.join(this.dirApi, "entidades.json"));
  }

  _leer(archivo) {
    return JSON.parse(readFileSync(archivo, "utf-8"));
  }

  entidades() {
    this._entidades ??= this._leer(path.join(this.dirApi, "entidades.json"));
    return this._entidades;
  }

  existeEntidad(e) {
    return this.entidades().some((x) => x.entidad === e);
  }

  municipios(e) {
    this._municipios ??= this._leer(path.join(this.dirApi, "municipios.json"));
    return this._municipios[String(e)] ?? [];
  }

  nombreMunicipio(e, m) {
    return this.municipios(e).find((x) => x.municipio === m)?.nombre ?? `Municipio ${m}`;
  }

  modelo() {
    this._modelo ??= this._leer(path.join(this.dirApi, "modelo.json"));
    return this._modelo;
  }

  /** Secciones de una entidad, con índice por número de sección. */
  secciones(e) {
    if (!this.cacheSecciones.has(e)) {
      const archivo = path.join(this.dirApi, `secciones_${String(e).padStart(2, "0")}.json`);
      if (!existsSync(archivo)) return { lista: [], porSeccion: new Map() };
      const { secciones } = this._leer(archivo);
      this.cacheSecciones.set(e, { lista: secciones, porSeccion: new Map(secciones.map((s) => [s.seccion, s])) });
    }
    return this.cacheSecciones.get(e);
  }

  seccion(e, s) {
    return this.secciones(e).porSeccion.get(s) ?? null;
  }

  /**
   * Cartografía de secciones de la entidad. Se espera un GeoJSON en
   * data/processed/geo/secciones_EE.geojson con la propiedad "seccion".
   * Regresa { topo, bbox: Map(seccion -> [minLon, minLat, maxLon, maxLat]) } o null.
   */
  geo(e) {
    if (!this.cacheGeo.has(e)) {
      const archivo = path.join(this.dirGeo, `secciones_${String(e).padStart(2, "0")}.geojson`);
      if (!existsSync(archivo)) {
        this.cacheGeo.set(e, null);
      } else {
        const fc = this._leer(archivo);
        const bbox = new Map();
        for (const f of fc.features) {
          const s = Number(f.properties?.seccion ?? f.properties?.SECCION);
          f.properties = { claveSeccion: String(s).padStart(4, "0"), seccion: s };
          bbox.set(s, cajaGeometria(f.geometry));
        }
        this.cacheGeo.set(e, { topo: topology({ secciones: fc }, 1e5), bbox });
      }
    }
    return this.cacheGeo.get(e);
  }

  /**
   * Colonias por sección: data/processed/geo/colonias_EE.json con
   * [{ seccion, colonia, pctArea, bbox }]. Vacío si no se ha generado.
   */
  colonias(e) {
    if (!this._colonias.has(e)) {
      const archivo = path.join(this.dirGeo, `colonias_${String(e).padStart(2, "0")}.json`);
      this._colonias.set(e, existsSync(archivo) ? this._leer(archivo) : []);
    }
    return this._colonias.get(e);
  }

  /** Distancia (km) de cada sección al módulo de atención más cercano: geo/mac_EE.json. */
  distanciaMac(e, s) {
    if (!this._mac.has(e)) {
      const archivo = path.join(this.dirGeo, `mac_${String(e).padStart(2, "0")}.json`);
      this._mac.set(e, existsSync(archivo) ? this._leer(archivo) : {});
    }
    return this._mac.get(e)[String(s)] ?? null;
  }
}

function cajaGeometria(g) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const recorrer = (c) => {
    if (typeof c[0] === "number") {
      if (c[0] < minX) minX = c[0];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[1] > maxY) maxY = c[1];
    } else c.forEach(recorrer);
  };
  if (g?.coordinates) recorrer(g.coordinates);
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY].map((v) => Math.round(v * 1e6) / 1e6) : null;
}
