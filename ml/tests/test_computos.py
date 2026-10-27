"""Pruebas del procesamiento de cómputos con datos sintéticos."""
import pandas as pd
import pytest

from ml.src.etl import computos

CSV_2024 = """DIPUTACIONES FEDERALES
08/06/2024 20:30

ACTAS_ESPERADAS,ACTAS_COMPUTADAS,TOTAL_VOTOS
6,6,1000

CLAVE_CASILLA,CLAVE_ACTA,ID_ENTIDAD,ENTIDAD,ID_DISTRITO_FEDERAL,DISTRITO_FEDERAL,SECCION,ID_CASILLA,TIPO_CASILLA,EXT_CONTIGUA,CASILLA,TIPO_ACTA,TOTAL_VOTOS_CALCULADOS,LISTA_NOMINAL
A1,X,26,SONORA,1,SLRC,100,1,B,0,Urbana,2,300,500
A2,X,26,SONORA,1,SLRC,100,1,C,0,Urbana,2,200,500
A3,X,26,SONORA,1,SLRC,101,1,B,0,Urbana,2,-,400
A4,X,26,SONORA,1,SLRC,102,1,S,0,Urbana,2,700,0
A5,X,2,BAJA CALIFORNIA,1,MXL,5,1,B,0,Urbana,2,"1,000","2,000"
A6,X,0,EXTRANJERO,0,EXT,0,1,B,0,Urbana,2,50,100
"""

CSV_2018 = """ID_ESTADO|NOMBRE_ESTADO|ID_DISTRITO|SECCION|ID_CASILLA|TIPO_CASILLA|TOTAL_VOTOS_CALCULADOS|LISTA_NOMINAL_CASILLA
26|SONORA|1|100|1|B|250|500
26|SONORA|1|100|1|C|250|500
"""


@pytest.fixture
def carpeta(tmp_path):
    (tmp_path / "DIP_FED_2024.csv").write_text(CSV_2024, encoding="utf-8")
    (tmp_path / "DIP_FED_CANDIDATURAS_2024.csv").write_text("x", encoding="utf-8")
    return tmp_path


def test_encuentra_archivo_de_resultados(carpeta):
    assert computos.encontrar_archivo_diputaciones(carpeta).name == "DIP_FED_2024.csv"


def test_agrega_por_seccion_y_limpia(carpeta):
    cas = computos.casillas(carpeta / "DIP_FED_2024.csv")
    sec, res = computos.por_seccion(cas, 2024, "presidencial", entidades=[26, 2])
    sec = sec.set_index(["entidad", "seccion"])
    # sección 100: (300 + 200) / (500 + 500) = 0.5 de participación
    assert sec.loc[(26, 100), "participacion"] == pytest.approx(0.5)
    assert sec.loc[(26, 100), "abstencion"] == pytest.approx(0.5)
    # separador de miles
    assert sec.loc[(2, 5), "abstencion"] == pytest.approx(0.5)
    # sin votos computados y casilla especial se descartan
    assert (26, 101) not in sec.index
    assert (26, 102) not in sec.index
    assert res["casillas_especiales"] == 1
    assert set(sec["anio"]) == {2024}


def test_formato_2018_con_pipes(tmp_path):
    ruta = tmp_path / "diputaciones.csv"
    ruta.write_text(CSV_2018, encoding="latin-1")
    sec, _ = computos.por_seccion(computos.casillas(ruta), 2018, "presidencial")
    assert sec.loc[0, "abstencion"] == pytest.approx(0.5)
    assert sec.loc[0, "casillas"] == 2


def test_formato_excel_2024():
    from ml.src.etl.comun import a_numero
    s = a_numero(pd.Series(['="01"', "'0338'", "1,234", "-", "Ilegible"]))
    assert s.tolist()[:3] == [1, 338, 1234]
    assert s.isna().tolist()[3:] == [True, True]
