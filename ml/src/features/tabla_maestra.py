"""Construye la tabla maestra: una fila por sección y elección objetivo.

Formulación del problema
------------------------
La abstención cambia mucho entre elecciones presidenciales e intermedias por
razones nacionales (en 2021 subió casi 10 puntos en todo el país). Para que el
modelo aprenda lo que distingue a cada sección, el objetivo es la abstención
RELATIVA: abstención de la sección menos la abstención nacional de esa elección.

    abst_rel(t) = abst(t) - abst_nacional(t)

Para 2027 la predicción final es:

    abst_pred_2027 = abst_rel_pred_2027 + nivel_nacional_2027

donde nivel_nacional_2027 es un supuesto explícito (por defecto, la abstención
nacional de la última intermedia, 2021).

Filas que se generan
--------------------
- objetivo 2021 (intermedia):   rezagos de 2018                 -> entrenamiento
- objetivo 2024 (presidencial): rezagos de 2021 y 2018          -> entrenamiento / prueba
- objetivo 2027 (intermedia):   rezagos de 2024 y 2021          -> pronóstico (sin objetivo)

Regla anti-fuga: ninguna variable de una fila proviene de su año objetivo o de
un año posterior. Lo verifica tests/test_tabla_maestra.py.

Uso:
    python -m ml.src.features.tabla_maestra
"""
import sys

import numpy as np
import pandas as pd

from ml.src.etl.fuentes import DATA, INTERIM

PROCESSED = DATA / "processed"
ELECCIONES = {2018: "presidencial", 2021: "intermedia", 2024: "presidencial", 2027: "intermedia"}
ANTERIOR = {2021: 2018, 2024: 2021, 2027: 2024}

VARIABLES_CENSO = [
    "pob_total", "pct_18_24", "pct_60ymas", "escolaridad_prom", "pct_posbasica",
    "tasa_act_econ", "pct_desocupada", "pct_sin_servicio_salud", "pct_migrante_reciente",
    "pct_viv_internet", "pct_viv_pc", "pct_viv_auto", "prom_ocupantes",
]


def niveles_nacionales(res: pd.DataFrame) -> dict[int, float]:
    """Abstención nacional ponderada por lista nominal, por año."""
    g = res.groupby("anio")[["votos_totales", "lista_nominal"]].sum()
    return (1 - g["votos_totales"] / g["lista_nominal"]).to_dict()


def construir(res: pd.DataFrame, censo: pd.DataFrame, equiv: pd.DataFrame | None = None,
              marg: pd.DataFrame | None = None) -> tuple[pd.DataFrame, dict]:
    nivel = niveles_nacionales(res)
    res = res.copy()
    res["abst_rel"] = res["abstencion"] - res["anio"].map(nivel)
    res["electores_por_casilla"] = res["lista_nominal"] / res["casillas"]
    por_anio = {a: g.set_index(["entidad", "seccion"]) for a, g in res.groupby("anio")}

    # abstención relativa promedio del municipio (clave INE) por año
    mun = censo[["entidad", "seccion", "municipio_ine"]]
    rm = res.merge(mun, on=["entidad", "seccion"], how="left")
    rm["votos_x"] = rm["abstencion"] * rm["lista_nominal"]
    g = rm.groupby(["anio", "entidad", "municipio_ine"]).agg(v=("votos_x", "sum"), ln=("lista_nominal", "sum"))
    g["abst_mun"] = g["v"] / g["ln"] - g.index.get_level_values("anio").map(nivel)
    abst_mun = g["abst_mun"]

    filas = []
    for objetivo in (2021, 2024, 2027):
        previo = ANTERIOR[objetivo]
        base = por_anio[previo][["lista_nominal", "casillas", "electores_por_casilla", "abst_rel", "distrito_federal"]].copy()
        base.columns = ["lista_nominal_ant", "casillas_ant", "electores_por_casilla", "abst_rel_lag1", "distrito_federal"]
        # rezago 2: la elección anterior a la anterior (si existe en los datos)
        previo2 = ANTERIOR.get(previo)
        if previo2 in por_anio:
            base = base.join(por_anio[previo2]["abst_rel"].rename("abst_rel_lag2"), how="left")
        else:
            base["abst_rel_lag2"] = np.nan
        # última elección del mismo tipo que el objetivo, solo si es anterior al objetivo
        mismos = [a for a in por_anio if a < objetivo and ELECCIONES[a] == ELECCIONES[objetivo]]
        if mismos:
            base = base.join(por_anio[max(mismos)]["abst_rel"].rename("abst_rel_mismo_tipo"), how="left")
        else:
            base["abst_rel_mismo_tipo"] = np.nan
        base["delta_rel"] = base["abst_rel_lag1"] - base["abst_rel_lag2"]
        base["anio_objetivo"] = objetivo
        base["intermedia"] = int(ELECCIONES[objetivo] == "intermedia")
        base["anio_lag1"] = previo
        base["anio_lag2"] = previo2 if previo2 in por_anio else np.nan
        if objetivo in por_anio:
            obj = por_anio[objetivo][["abst_rel", "abstencion", "lista_nominal"]]
            obj.columns = ["y_abst_rel", "y_abstencion", "lista_nominal_obj"]
            base = base.join(obj, how="left")
        else:
            base["y_abst_rel"] = np.nan
            base["y_abstencion"] = np.nan
            base["lista_nominal_obj"] = np.nan
        filas.append(base.reset_index())
    t = pd.concat(filas, ignore_index=True)

    # censo (2020) y municipio
    t = t.merge(censo[["entidad", "seccion", "municipio_ine", "tipo_seccion"] + VARIABLES_CENSO],
                on=["entidad", "seccion"], how="inner")
    t["abst_rel_mun_lag1"] = [abst_mun.get((a, e, m), np.nan) for a, e, m in
                              zip(t["anio_lag1"], t["entidad"], t["municipio_ine"])]
    t["log_lista_nominal"] = np.log1p(t["lista_nominal_ant"])
    for tipo in ("urbana", "mixta", "rural"):
        t[f"tipo_{tipo}"] = (t["tipo_seccion"] == tipo).astype(int)

    if equiv is not None and marg is not None:
        t = t.merge(equiv[["entidad", "municipio_ine", "municipio_inegi"]], on=["entidad", "municipio_ine"], how="left")
        t = t.merge(marg[["entidad", "municipio_inegi", "ind_marginacion"]], on=["entidad", "municipio_inegi"], how="left")
    else:
        t["ind_marginacion"] = np.nan

    t = t[t["abst_rel_lag1"].notna()].reset_index(drop=True)
    info = {"nivel_nacional": {int(k): round(float(v), 6) for k, v in nivel.items()},
            "filas_por_objetivo": t.groupby("anio_objetivo").size().astype(int).to_dict()}
    return t, info


def main() -> int:
    res = pd.read_parquet(INTERIM / "resultados_seccion.parquet")
    censo = pd.read_parquet(INTERIM / "censo_seccion.parquet")
    equiv = pd.read_parquet(INTERIM / "equivalencia_municipios.parquet")
    marg_path = INTERIM / "marginacion_municipio.parquet"
    marg = pd.read_parquet(marg_path) if marg_path.exists() else None
    t, info = construir(res, censo, equiv, marg)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    t.to_parquet(PROCESSED / "tabla_maestra.parquet", index=False)
    print(f"Tabla maestra: {len(t)} filas -> {PROCESSED / 'tabla_maestra.parquet'}")
    print("Filas por elección objetivo:", info["filas_por_objetivo"])
    print("Abstención nacional:", {k: f"{v:.2%}" for k, v in info["nivel_nacional"].items()})
    return 0


if __name__ == "__main__":
    sys.exit(main())
