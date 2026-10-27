"""Funciones de apoyo para leer archivos de fuentes públicas."""
import io
import re
import unicodedata
from pathlib import Path

import pandas as pd

CODIFICACIONES = ("utf-8-sig", "utf-8", "latin-1")


def leer_texto(ruta: Path) -> str:
    datos = Path(ruta).read_bytes()
    for cod in CODIFICACIONES:
        try:
            return datos.decode(cod)
        except UnicodeDecodeError:
            continue
    return datos.decode("latin-1", errors="replace")


def normalizar(nombre: str) -> str:
    """'Lista Nominal ' -> 'LISTA_NOMINAL' (sin acentos, mayúsculas, guiones bajos)."""
    s = unicodedata.normalize("NFKD", str(nombre)).encode("ascii", "ignore").decode()
    s = re.sub(r"[^0-9A-Za-z]+", "_", s.strip()).strip("_")
    return s.upper()


def leer_csv_con_encabezado(ruta: Path, columnas_clave: tuple[str, ...]) -> pd.DataFrame:
    """Lee un CSV que puede tener líneas de resumen antes del encabezado real.

    Busca la primera línea que contenga todas las `columnas_clave` y detecta el
    separador ('|' o ',') en esa línea.
    """
    texto = leer_texto(ruta)
    lineas = texto.splitlines()
    for i, linea in enumerate(lineas[:50]):
        if all(normalizar(c) in normalizar(linea) for c in columnas_clave):
            sep = "|" if linea.count("|") > linea.count(",") else ","
            df = pd.read_csv(io.StringIO("\n".join(lineas[i:])), sep=sep, dtype=str,
                             keep_default_na=False, na_values=[""], low_memory=False)
            df.columns = [normalizar(c) for c in df.columns]
            return df
    raise ValueError(f"No se encontró un encabezado con {columnas_clave} en {ruta}")


def a_numero(serie: pd.Series) -> pd.Series:
    """Convierte a número; '-', 'N/A', '*' y textos se vuelven NaN.

    Quita separadores de miles y el formato de Excel ="01" que usa el INE en 2024.
    """
    limpia = (serie.astype(str)
              .str.replace(",", "", regex=False)
              .str.replace(r"[=\"']", "", regex=True)
              .str.strip())
    return pd.to_numeric(limpia, errors="coerce")


def primera_columna(df: pd.DataFrame, candidatas: tuple[str, ...], obligatoria: bool = True):
    for c in candidatas:
        if c in df.columns:
            return c
    if obligatoria:
        raise KeyError(f"Ninguna de las columnas {candidatas} existe. Columnas: {list(df.columns)[:40]}")
    return None
