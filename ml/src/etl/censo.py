"""Lee las Estadísticas Censales a Escalas Geoelectorales 2020 (INEGI-INE).

Archivo usado: conjunto_de_datos/INE_SECCION_2020.csv (una fila por sección,
cartografía electoral al 20 de enero de 2021). Los nombres de las variables
siguen la nomenclatura del Censo 2020; la descripción de cada una está en
diccionario_de_datos/Descriptor_indicadores_ECEG_Seccion_2020.csv.csv
"""
from pathlib import Path

import pandas as pd

from .comun import a_numero, leer_csv_con_encabezado, primera_columna

# nombre_en_modelo: (numerador, denominador o None)
VARIABLES = {
    "pob_total": ("POBTOT", None),
    "pob_18ymas": ("P_18YMAS", None),
    "pct_18_24": ("P_18A24", "P_18YMAS"),
    "pct_60ymas": ("P_60YMAS", "P_18YMAS"),
    "escolaridad_prom": ("GRAPROES", None),
    "pct_posbasica": ("P18YM_PB", "P_18YMAS"),
    "tasa_act_econ": ("PEA", "P_12YMAS"),
    "pct_desocupada": ("PDESOCUP", "PEA"),
    "pct_sin_servicio_salud": ("PSINDER", "POBTOT"),
    "pct_migrante_reciente": ("PRESOE15", "P_5YMAS"),
    "pct_viv_internet": ("VPH_INTER", "TVIVPARHAB"),
    "pct_viv_pc": ("VPH_PC", "TVIVPARHAB"),
    "pct_viv_auto": ("VPH_AUTOM", "TVIVPARHAB"),
    "prom_ocupantes": ("PROM_OCUP", None),
}

# Tipo de sección electoral según el descriptor del INEGI
TIPOS_SECCION = {2: "urbana", 3: "mixta", 4: "rural"}


def _censal(serie: pd.Series) -> pd.Series:
    """Valor censal numérico. El INEGI usa códigos negativos (por ejemplo -6) para
    datos protegidos por confidencialidad o no aplicables; se convierten a NaN."""
    return a_numero(serie).where(lambda s: s >= 0)


def encontrar_csv_secciones(carpeta: Path) -> Path:
    candidatos = [p for p in Path(carpeta).rglob("*")
                  if p.is_file() and p.suffix.lower() == ".csv"
                  and "SECCION" in p.name.upper() and p.parent.name.lower() == "conjunto_de_datos"]
    if not candidatos:
        raise FileNotFoundError(f"No se encontró conjunto_de_datos/INE_SECCION_2020.csv en {carpeta}")
    return candidatos[0]


def leer(carpeta: Path, entidades=None) -> tuple[pd.DataFrame, dict]:
    ruta = encontrar_csv_secciones(carpeta)
    df = leer_csv_con_encabezado(ruta, ("ENTIDAD", "SECCION"))

    out = pd.DataFrame({
        "entidad": a_numero(df[primera_columna(df, ("ENTIDAD",))]),
        "seccion": a_numero(df[primera_columna(df, ("SECCION",))]),
        "municipio_ine": a_numero(df[primera_columna(df, ("MUNICIPIO",))]),
        "distrito_2021": a_numero(df[primera_columna(df, ("DISTRITO",))]),
    })
    c_tipo = primera_columna(df, ("TIPO",), obligatoria=False)
    out["tipo_seccion"] = a_numero(df[c_tipo]).map(TIPOS_SECCION) if c_tipo else pd.NA

    reporte = {"archivo": ruta.name, "columnas_disponibles": len(df.columns), "variables": {}}
    for nombre, (num, den) in VARIABLES.items():
        if num not in df.columns or (den and den not in df.columns):
            reporte["variables"][nombre] = "FALTANTE"
            continue
        valor = _censal(df[num])
        if den:
            valor = valor / _censal(df[den]).where(lambda s: s > 0)
        out[nombre] = valor
        reporte["variables"][nombre] = num + (f" / {den}" if den else "")

    out = out.dropna(subset=["entidad", "seccion"])
    out = out[out["seccion"] > 0]
    if entidades:
        out = out[out["entidad"].isin(list(entidades))]
    out[["entidad", "seccion"]] = out[["entidad", "seccion"]].astype(int)
    out = out.drop_duplicates(subset=["entidad", "seccion"])
    reporte["secciones"] = len(out)
    reporte["muestra_columnas"] = list(df.columns)[:60]
    return out.reset_index(drop=True), reporte
