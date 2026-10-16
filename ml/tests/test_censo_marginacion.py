"""Pruebas de lectura del censo por sección y de la marginación municipal."""
import pandas as pd
import pytest

from ml.src.etl import censo, marginacion

CSV_ECEG = """ID,ENTIDAD,DISTRITO,MUNICIPIO,SECCION,TIPO,POBTOT,P_18YMAS,P_18A24,P_12YMAS,PEA,GRAPROES,TVIVPARHAB,VPH_INTER
1,26,1,55,100,2,1000,700,210,800,400,10.5,300,150
2,26,1,55,101,4,500,350,-6,400,200,9.1,150,30
3,2,1,2,5,3,2000,1400,280,1600,1000,11.2,600,480
"""


def test_censo_construye_variables(tmp_path):
    datos = tmp_path / "conjunto_de_datos"
    datos.mkdir()
    (datos / "INE_SECCION_2020.csv").write_text(CSV_ECEG, encoding="latin-1")
    (tmp_path / "cat_secciones_2020.csv").write_text("CVE_ENT,CVE_SECCION", encoding="utf-8")
    df, rep = censo.leer(tmp_path, entidades=[26])
    df = df.set_index("seccion")
    assert rep["secciones"] == 2
    assert df.loc[100, "pct_18_24"] == pytest.approx(0.3)
    assert df.loc[100, "tipo_seccion"] == "urbana"
    assert df.loc[100, "pct_viv_internet"] == pytest.approx(0.5)
    assert df.loc[100, "tasa_act_econ"] == pytest.approx(0.5)
    # dato confidencial (código negativo del INEGI) queda como NaN
    assert pd.isna(df.loc[101, "pct_18_24"])
    assert rep["variables"]["pct_viv_auto"] == "FALTANTE"


def test_marginacion_separa_clave_municipal(tmp_path):
    ruta = tmp_path / "IMM_2020.xlsx"
    pd.DataFrame({
        "CVE_ENT": ["26", "02"], "NOM_ENT": ["Sonora", "Baja California"],
        "CVE_MUN": ["26055", "02002"], "NOM_MUN": ["San Luis Río Colorado", "Mexicali"],
        "IM_2020": ["57.1", "58.3"], "GM_2020": ["Muy bajo", "Muy bajo"], "IMN_2020": ["0.9", "0.92"],
    }).to_excel(ruta, index=False)
    df = marginacion.leer(ruta, entidades=[26])
    assert df.loc[0, "municipio_inegi"] == 55
    assert df.loc[0, "ind_marginacion"] == pytest.approx(57.1)


def test_marginacion_csv_datos_gob(tmp_path):
    ruta = tmp_path / "IMM_2020.csv"
    ruta.write_text(
        "CVE_ENT,NOM_ENT,CVE_MUN,NOM_MUN,POB_TOT,IM_2020,GM_2020,IMN_2020\r\n"
        "26,Sonora,26055,San Luis Río Colorado,199021,57.1,Muy bajo,0.9\r\n"
        "1,Aguascalientes,1001,Aguascalientes,948990,60.3,Muy bajo,0.94\r\n",
        encoding="latin-1")
    df = marginacion.leer(ruta)
    assert sorted(df["municipio_inegi"]) == [1, 55]
