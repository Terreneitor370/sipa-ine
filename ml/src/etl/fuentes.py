"""Catálogo de fuentes de datos públicas del proyecto SIPA-INE.

Todas las URLs fueron verificadas el 15 de octubre de 2026. Si alguna deja de
funcionar, descargue el archivo manualmente desde la página indicada en
`pagina` y colóquelo en data/raw/<clave>/ con el nombre de `archivo`.
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
DATA = RAIZ / "data"
RAW = DATA / "raw"
INTERIM = DATA / "interim"

# Claves INEGI/INE de entidad para el alcance del MVP
ENTIDADES_MVP = {2: "Baja California", 26: "Sonora"}

FUENTES = {
    "computos_2018": {
        "descripcion": "INE - Cómputos distritales 2018 (resultados por casilla)",
        "url": "https://computos2018.ine.mx/20180708_2130_CW.zip",
        "archivo": "20180708_2130_CW.zip",
        "pagina": "https://computos2018.ine.mx/#/descargaBase",
        "tipo": "computos",
        "anio": 2018,
        "tipo_eleccion": "presidencial",
    },
    "computos_2021": {
        "descripcion": "INE - Cómputos distritales 2021 (resultados por casilla)",
        "url": "https://computos2021.ine.mx/20210611_1000_CW.zip",
        "archivo": "20210611_1000_CW.zip",
        "pagina": "https://computos2021.ine.mx/",
        "tipo": "computos",
        "anio": 2021,
        "tipo_eleccion": "intermedia",
    },
    "computos_2024": {
        "descripcion": "INE - Cómputos distritales 2024 (resultados por casilla)",
        "url": "https://computos2024.ine.mx/20240608_2030_COMPUTOS.zip",
        "archivo": "20240608_2030_COMPUTOS.zip",
        "pagina": "https://computos2024.ine.mx/diputaciones/base-de-datos",
        "tipo": "computos",
        "anio": 2024,
        "tipo_eleccion": "presidencial",
    },
    "eceg_2020": {
        "descripcion": "INEGI-INE - Estadísticas Censales a Escalas Geoelectorales 2020 (CSV)",
        "url": "https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/geoelectorales/eceg_2020_csv.zip",
        "archivo": "eceg_2020_csv.zip",
        "pagina": "https://cartografia.ine.mx/sige8/estadisticos-Geoelectorales",
        "tipo": "censo",
    },
    "imm_2020": {
        "descripcion": "CONAPO - Índice de marginación por municipio 2020 (vía datos.gob.mx)",
        "url": "https://www.datos.gob.mx/dataset/d8f2a534-bcee-4114-853d-82982a81ce24/resource/551d8f48-5d0c-4d11-964a-e2911f732615/download/imm_2020-3.csv",
        "archivo": "IMM_2020.csv",
        "pagina": "https://www.datos.gob.mx/dataset/indices_marginacion",
        "tipo": "marginacion",
    },
}
