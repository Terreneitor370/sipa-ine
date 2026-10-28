"""Pruebas de la tabla maestra: rezagos correctos y sin fuga de información."""
import pandas as pd
import pytest

from ml.src.features.tabla_maestra import construir


def _resultados():
    filas = []
    # dos secciones con historia 2018, 2021, 2024; una sección nueva en 2024
    for anio, abst in [(2018, (0.30, 0.50)), (2021, (0.40, 0.60)), (2024, (0.35, 0.55))]:
        for sec, a in zip((1, 2), abst):
            filas.append(dict(entidad=26, seccion=sec, distrito_federal=1, casillas=2, lista_nominal=1000,
                              votos_totales=round(1000 * (1 - a)), participacion=1 - a, abstencion=a,
                              anio=anio, tipo_eleccion="x"))
    filas.append(dict(entidad=26, seccion=3, distrito_federal=1, casillas=1, lista_nominal=500,
                      votos_totales=250, participacion=0.5, abstencion=0.5, anio=2024, tipo_eleccion="x"))
    return pd.DataFrame(filas)


def _censo():
    base = dict(entidad=26, municipio_ine=55, tipo_seccion="urbana", pob_total=1000, pct_18_24=0.2,
                pct_60ymas=0.1, escolaridad_prom=10.0, pct_posbasica=0.5, tasa_act_econ=0.6,
                pct_desocupada=0.02, pct_sin_servicio_salud=0.2, pct_migrante_reciente=0.05,
                pct_viv_internet=0.6, pct_viv_pc=0.4, pct_viv_auto=0.7, prom_ocupantes=3.5)
    return pd.DataFrame([dict(base, seccion=s) for s in (1, 2, 3)])


def test_rezagos_y_objetivo():
    t, info = construir(_resultados(), _censo())
    nivel = info["nivel_nacional"]
    f24 = t[(t.anio_objetivo == 2024) & (t.seccion == 1)].iloc[0]
    # objetivo 2024: rezago 1 = 2021, mismo tipo = 2018
    assert f24["abst_rel_lag1"] == pytest.approx(0.40 - nivel[2021])
    assert f24["abst_rel_mismo_tipo"] == pytest.approx(0.30 - nivel[2018])
    assert f24["y_abst_rel"] == pytest.approx(0.35 - nivel[2024])
    f27 = t[(t.anio_objetivo == 2027) & (t.seccion == 1)].iloc[0]
    # objetivo 2027: rezago 1 = 2024, mismo tipo = 2021, sin objetivo
    assert f27["abst_rel_lag1"] == pytest.approx(0.35 - nivel[2024])
    assert f27["abst_rel_mismo_tipo"] == pytest.approx(0.40 - nivel[2021])
    assert pd.isna(f27["y_abst_rel"])


def test_sin_fuga_temporal():
    t, _ = construir(_resultados(), _censo())
    assert (t["anio_lag1"] < t["anio_objetivo"]).all()
    assert (t["anio_lag2"].dropna() < t.loc[t["anio_lag2"].notna(), "anio_lag1"]).all()


def test_seccion_nueva_sin_historial_no_entra_a_2024():
    t, _ = construir(_resultados(), _censo())
    # la sección 3 solo existe en 2024: no tiene rezagos para 2024, pero sí entra a 2027
    assert not ((t.seccion == 3) & (t.anio_objetivo == 2024)).any()
    assert ((t.seccion == 3) & (t.anio_objetivo == 2027)).any()
