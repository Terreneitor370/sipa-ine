"""
Convierte la Base Geográfica Digital (BGD) del INE a los archivos del mapa.

Entrada: carpeta descomprimida de la BGD de una entidad (shapefiles), por ejemplo
    data/raw/cartografia/bgd_26_sonora/
Se buscan dentro (en cualquier subcarpeta) las capas SECCION y COLONIA.

Salida (data/processed/geo/):
    secciones_EE.geojson  polígonos de sección en WGS84, simplificados
    colonias_EE.json      [{seccion, municipio, colonia, pctArea, bbox}]
    mac_EE.json           {seccion: km al Módulo de Atención Ciudadana más cercano}

pctArea = fracción del área de la sección que ocupa la colonia (0 a 1).

Uso (desde la raíz del repo):
    python -m ml.src.export.cartografia data/raw/cartografia/bgd_26_sonora
    python -m ml.src.export.cartografia data/raw/cartografia/bgd_02_baja_california

Requiere geopandas (pip install geopandas).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
SALIDA = RAIZ / "data" / "processed" / "geo"

# Proyección métrica de México (INEGI, Lambert cónica conforme) para calcular áreas
CRS_METRICO = "EPSG:6372"
TOLERANCIA_M = 8  # simplificación en metros: suficiente para el mapa y reduce peso


def buscar_capa(carpeta: Path, nombre: str) -> Path | None:
    candidatos = [p for p in carpeta.rglob("*.shp") if p.stem.upper() == nombre]
    if not candidatos:
        candidatos = [p for p in carpeta.rglob("*.shp") if p.stem.upper().startswith(nombre)]
    return candidatos[0] if candidatos else None


def columna(gdf, *opciones):
    mapa = {c.upper(): c for c in gdf.columns}
    for o in opciones:
        if o in mapa:
            return mapa[o]
    return None


def main(argv=None) -> int:
    import geopandas as gpd

    ap = argparse.ArgumentParser()
    ap.add_argument("carpeta", type=Path, help="Carpeta descomprimida de la BGD de una entidad")
    args = ap.parse_args(argv)
    carpeta = args.carpeta if args.carpeta.is_absolute() else RAIZ / args.carpeta

    shp_sec = buscar_capa(carpeta, "SECCION")
    if shp_sec is None:
        print(f"No se encontró la capa SECCION en {carpeta}", file=sys.stderr)
        return 1
    sec = gpd.read_file(shp_sec)
    if sec.crs is None:
        print("La capa SECCION no trae proyección (.prj); no se puede convertir.", file=sys.stderr)
        return 1
    c_ent = columna(sec, "ENTIDAD")
    c_mun = columna(sec, "MUNICIPIO")
    c_sec = columna(sec, "SECCION")
    if not (c_ent and c_sec):
        print(f"Columnas inesperadas en SECCION: {list(sec.columns)}", file=sys.stderr)
        return 1
    entidad = int(sec[c_ent].mode().iloc[0])
    sec = sec.rename(columns={c_ent: "entidad", c_sec: "seccion", **({c_mun: "municipio"} if c_mun else {})})
    sec["entidad"] = sec["entidad"].astype(int)
    sec["seccion"] = sec["seccion"].astype(int)
    sec = sec[sec["entidad"] == entidad].dissolve(by="seccion", as_index=False, aggfunc="first")

    SALIDA.mkdir(parents=True, exist_ok=True)
    met = sec.to_crs(CRS_METRICO)
    met["area_sec"] = met.geometry.area
    simpl = met[["seccion", "geometry"]].copy()
    simpl["geometry"] = simpl.geometry.simplify(TOLERANCIA_M, preserve_topology=True)
    wgs = simpl.to_crs("EPSG:4326")
    destino = SALIDA / f"secciones_{entidad:02d}.geojson"
    destino.write_text(wgs.to_json(drop_id=True, to_wgs84=True), encoding="utf-8")
    print(f"Secciones: {len(wgs)} -> {destino} ({destino.stat().st_size / 1e6:.1f} MB)")

    # Distancia del centro de cada sección al módulo de atención (capa MODULO)
    shp_mac = buscar_capa(carpeta, "MODULO")
    if shp_mac is not None:
        mac = gpd.read_file(shp_mac).to_crs(CRS_METRICO)
        if len(mac):
            centros = gpd.GeoDataFrame({"seccion": met["seccion"]},
                                       geometry=met.geometry.representative_point(), crs=CRS_METRICO)
            cerca = gpd.sjoin_nearest(centros, mac[["geometry"]], distance_col="dist_m")
            cerca = cerca.groupby("seccion")["dist_m"].min()
            dist = {int(k): round(float(v) / 1000, 2) for k, v in cerca.items()}
            destino = SALIDA / f"mac_{entidad:02d}.json"
            destino.write_text(json.dumps(dist), encoding="utf-8")
            print(f"Distancia a módulo: {len(mac)} módulos, mediana {cerca.median() / 1000:.1f} km -> {destino}")

    shp_col = buscar_capa(carpeta, "COLONIA")
    if shp_col is None:
        print("No se encontró la capa COLONIA; se omite el cruce sección-colonia.")
        return 0
    col = gpd.read_file(shp_col).to_crs(CRS_METRICO)
    c_nom = columna(col, "NOMBRE", "NOM_COL", "COLONIA")
    if c_nom is None:
        print(f"Columnas inesperadas en COLONIA: {list(col.columns)}", file=sys.stderr)
        return 1
    col = col[[c_nom, "geometry"]].rename(columns={c_nom: "colonia"})
    col["colonia"] = col["colonia"].astype(str).str.strip().str.title()
    col["geometry"] = col.geometry.buffer(0)

    cruce = gpd.overlay(met[["seccion", "municipio", "area_sec", "geometry"]] if "municipio" in met
                        else met[["seccion", "area_sec", "geometry"]],
                        col, how="intersection", keep_geom_type=True)
    cruce["pctArea"] = cruce.geometry.area / cruce["area_sec"]
    # Se agrupan partes de una misma colonia y se descartan astillas por desfase de capas
    agg = {"pctArea": "sum"}
    if "municipio" in cruce:
        agg["municipio"] = "first"
    cruce = (cruce.dissolve(by=["seccion", "colonia"], aggfunc=agg, as_index=False))
    cruce = cruce[cruce["pctArea"] >= 0.02]
    cajas = cruce.to_crs("EPSG:4326").geometry.bounds.round(6)

    filas = []
    for (_, r), (_, b) in zip(cruce.iterrows(), cajas.iterrows()):
        filas.append({
            "seccion": int(r["seccion"]),
            "municipio": int(r["municipio"]) if "municipio" in r and r["municipio"] == r["municipio"] else None,
            "colonia": r["colonia"],
            "pctArea": round(min(float(r["pctArea"]), 1.0), 3),
            "bbox": [b.minx, b.miny, b.maxx, b.maxy],
        })
    destino = SALIDA / f"colonias_{entidad:02d}.json"
    destino.write_text(json.dumps(filas, ensure_ascii=False), encoding="utf-8")
    print(f"Cruce sección-colonia: {len(filas)} filas, {cruce['colonia'].nunique()} colonias -> {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
