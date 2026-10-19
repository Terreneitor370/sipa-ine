"""Índice de Marginación municipal 2020 (CONAPO) y su unión con las secciones.

Las claves de municipio del INE NO coinciden con las del INEGI/CONAPO (por
ejemplo, Hermosillo es 030 en INEGI y 49 en INE). La tabla de equivalencias
viene en el ECEG: catalogos/cat_municipios_2020_INEGI-INE-ECEG.xlsx
"""
import io
from pathlib import Path

import pandas as pd

from .comun import a_numero, leer_texto, normalizar, primera_columna


def leer(ruta_xlsx: Path, entidades=None) -> pd.DataFrame:
    """Acepta el CSV de datos.gob.mx o el Excel original de CONAPO."""
    ruta_xlsx = Path(ruta_xlsx)
    if ruta_xlsx.suffix.lower() == ".csv":
        hojas = {"csv": pd.read_csv(io.StringIO(leer_texto(ruta_xlsx)), dtype=str)}
    else:
        hojas = pd.read_excel(ruta_xlsx, sheet_name=None, dtype=str)
    for _, df in hojas.items():
        df.columns = [normalizar(c) for c in df.columns]
        if any(c.startswith("IM_") or c == "IM" for c in df.columns):
            break
    else:
        raise ValueError(f"No se encontró la columna del índice en {ruta_xlsx}")

    c_ent = primera_columna(df, ("CVE_ENT", "ENT"))
    c_mun = primera_columna(df, ("CVE_MUN", "MUN"))
    c_nom = primera_columna(df, ("NOM_MUN", "MUNICIPIO"), obligatoria=False)
    c_im = primera_columna(df, ("IM_2020", "IM"))
    c_gm = primera_columna(df, ("GM_2020", "GM"), obligatoria=False)
    c_imn = primera_columna(df, ("IMN_2020", "IMN"), obligatoria=False)

    cve_mun = a_numero(df[c_mun])
    cve_mun = cve_mun.where(cve_mun < 1000, cve_mun % 1000)  # 26055 -> 55

    out = pd.DataFrame({
        "entidad": a_numero(df[c_ent]),
        "municipio_inegi": cve_mun,
        "nombre_municipio": df[c_nom] if c_nom else pd.NA,
        "ind_marginacion": a_numero(df[c_im]),
        "grado_marginacion": df[c_gm] if c_gm else pd.NA,
        "ind_marginacion_norm": a_numero(df[c_imn]) if c_imn else pd.NA,
    }).dropna(subset=["entidad", "municipio_inegi"])
    out[["entidad", "municipio_inegi"]] = out[["entidad", "municipio_inegi"]].astype(int)
    if entidades:
        out = out[out["entidad"].isin(list(entidades))]
    return out.reset_index(drop=True)


def equivalencias_ine_inegi(carpeta_eceg: Path) -> pd.DataFrame:
    """Tabla municipio INE -> municipio INEGI a partir del catálogo del ECEG.

    El Excel tiene dos bloques lado a lado (INEGI a la izquierda, INE a la
    derecha) alineados por fila. Los nombres pueden diferir por abreviaturas
    ("DR. ARROYO" vs "Doctor Arroyo"), así que la validación es por entidad.
    """
    ruta = next(Path(carpeta_eceg).rglob("cat_municipios_2020*.xlsx"))
    x = pd.read_excel(ruta, header=None, dtype=str)
    fila_enc = x.index[x.apply(lambda r: r.astype(str).str.strip().eq("CVE_MUN").any(), axis=1)][0]
    datos = x.iloc[fila_enc + 1:]
    tabla = pd.DataFrame({
        "entidad": a_numero(datos[2]),
        "municipio_inegi": a_numero(datos[3]),
        "nombre_inegi": datos[4],
        "entidad_ine": a_numero(datos[7]),
        "municipio_ine": a_numero(datos[8]),
        "nombre_ine": datos[9],
    }).dropna(subset=["entidad", "municipio_inegi", "entidad_ine", "municipio_ine"])
    tabla = tabla[tabla["entidad"].eq(tabla["entidad_ine"])]
    tabla = tabla[["entidad", "municipio_ine", "municipio_inegi", "nombre_inegi"]].astype(
        {"entidad": int, "municipio_ine": int, "municipio_inegi": int})
    return tabla.reset_index(drop=True)
