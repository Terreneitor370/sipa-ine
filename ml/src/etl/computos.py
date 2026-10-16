"""Convierte los cómputos distritales del INE (por casilla) a abstención por sección.

Se usa siempre la elección de diputaciones federales de mayoría relativa,
porque es la única que existe en las tres elecciones (2018, 2021 y 2024).

Reglas de limpieza:
- Se descartan filas sin sección o con sección 0 (voto en el extranjero,
  voto anticipado y similares).
- Se descartan casillas especiales (TIPO_CASILLA = 'S'): sus votantes no
  pertenecen a la sección y no tienen lista nominal propia.
- Se descartan casillas sin lista nominal o sin total de votos (no instaladas
  o con paquete no computado).
"""
from pathlib import Path

import pandas as pd

from .comun import a_numero, leer_csv_con_encabezado, primera_columna

COL_ENTIDAD = ("ID_ENTIDAD", "ID_ESTADO")
COL_DISTRITO = ("ID_DISTRITO_FEDERAL", "ID_DISTRITO")
COL_SECCION = ("SECCION",)
COL_TIPO = ("TIPO_CASILLA",)
COL_TOTAL = ("TOTAL_VOTOS_CALCULADOS", "TOTAL_VOTOS", "TOTAL_VOTOS_ASENTADO")
COL_LISTA = ("LISTA_NOMINAL", "LISTA_NOMINAL_CASILLA")


def encontrar_archivo_diputaciones(carpeta: Path) -> Path:
    candidatos = [
        p for p in Path(carpeta).rglob("*.csv")
        if "dip" in p.name.lower()
        and "candidat" not in p.name.lower()
        and "rp" not in p.stem.lower().split("_")
    ]
    if not candidatos:
        raise FileNotFoundError(f"No hay CSV de diputaciones en {carpeta}")
    # el más grande es el de resultados por casilla
    return max(candidatos, key=lambda p: p.stat().st_size)


def casillas(ruta_csv: Path) -> pd.DataFrame:
    df = leer_csv_con_encabezado(ruta_csv, ("SECCION", "CASILLA"))
    c_ent = primera_columna(df, COL_ENTIDAD)
    c_dis = primera_columna(df, COL_DISTRITO, obligatoria=False)
    c_sec = primera_columna(df, COL_SECCION)
    c_tip = primera_columna(df, COL_TIPO, obligatoria=False)
    c_tot = primera_columna(df, COL_TOTAL)
    c_lis = primera_columna(df, COL_LISTA)

    out = pd.DataFrame({
        "entidad": a_numero(df[c_ent]),
        "distrito_federal": a_numero(df[c_dis]) if c_dis else pd.NA,
        "seccion": a_numero(df[c_sec]),
        "tipo_casilla": df[c_tip].astype(str).str.strip().str.upper() if c_tip else "",
        "votos_totales": a_numero(df[c_tot]),
        "lista_nominal": a_numero(df[c_lis]),
    })
    return out


def por_seccion(cas: pd.DataFrame, anio: int, tipo_eleccion: str, entidades=None):
    """Agrega casillas a sección. Devuelve (tabla_por_seccion, resumen_de_limpieza)."""
    resumen = {"casillas_leidas": len(cas)}
    df = cas.copy()
    if entidades:
        df = df[df["entidad"].isin(list(entidades))]
    resumen["casillas_en_alcance"] = len(df)

    mascara_validas = (
        df["seccion"].fillna(0).gt(0)
        & df["entidad"].between(1, 32)
        & df["tipo_casilla"].ne("S")
        & df["lista_nominal"].fillna(0).gt(0)
        & df["votos_totales"].notna()
    )
    resumen["casillas_especiales"] = int(df["tipo_casilla"].eq("S").sum())
    resumen["casillas_descartadas"] = int((~mascara_validas).sum())
    df = df[mascara_validas]

    g = (df.groupby(["entidad", "seccion"], as_index=False)
           .agg(distrito_federal=("distrito_federal", "first"),
                casillas=("seccion", "size"),
                lista_nominal=("lista_nominal", "sum"),
                votos_totales=("votos_totales", "sum")))
    g["participacion"] = (g["votos_totales"] / g["lista_nominal"]).clip(upper=1.0)
    g["abstencion"] = 1.0 - g["participacion"]
    g["anio"] = anio
    g["tipo_eleccion"] = tipo_eleccion
    g[["entidad", "seccion", "casillas"]] = g[["entidad", "seccion", "casillas"]].astype(int)

    resumen["secciones"] = len(g)
    resumen["secciones_participacion_mayor_100"] = int((df.groupby(["entidad", "seccion"])["votos_totales"].sum()
                                                       > df.groupby(["entidad", "seccion"])["lista_nominal"].sum()).sum())
    return g, resumen
