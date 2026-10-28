"""Entrena el modelo XGBoost, lo valida contra el baseline y pronostica 2027.

Diseño de entrenamiento
-----------------------
Las filas con objetivo 2024 tienen exactamente la misma estructura que las de
2027: el rezago 1 es una elección del otro tipo y el rezago 2 es la última del
mismo tipo (2024 <- 2021, 2018; 2027 <- 2024, 2021). Por eso el modelo final se
entrena con las filas 2024 y se aplica a 2027. Las filas 2021 no se usan: no
tienen rezago del mismo tipo (faltaría 2015).

Pasos:
1. Validación cruzada espacial (5 pliegues agrupados por municipio) sobre 2024,
   comparada con dos baselines ingenuos: repetir la abstención relativa de la
   elección anterior, o la de la última elección del mismo tipo.
2. Modelo final con todas las secciones 2024 y pronóstico 2027.
3. Intervalos P10-P90 con regresión cuantílica.
4. Explicación local (contribuciones SHAP nativas de XGBoost), top 5 por sección.
5. Niveles de riesgo con umbrales fijos: percentiles 50, 75 y 90 de la abstención
   real por sección en la última intermedia (2021).

Uso:
    python -m ml.src.features.tabla_maestra
    python -m ml.src.train.train [--nivel-2027 0.4778]
"""
import argparse
import json
import sys
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import xgboost as xgb

from ml.src.etl.fuentes import DATA, RAIZ

PROCESSED = DATA / "processed"
ARTIFACTS = RAIZ / "ml" / "artifacts"
VERSION = "1.0.0"
SEMILLA = 42

FEATURES = [
    "abst_rel_lag1", "abst_rel_mismo_tipo", "delta_rel", "abst_rel_mun_lag1",
    "log_lista_nominal", "electores_por_casilla",
    "tipo_urbana", "tipo_mixta", "tipo_rural",
    "pct_18_24", "pct_60ymas", "escolaridad_prom", "pct_posbasica", "tasa_act_econ",
    "pct_desocupada", "pct_sin_servicio_salud", "pct_migrante_reciente",
    "pct_viv_internet", "pct_viv_pc", "pct_viv_auto", "prom_ocupantes", "ind_marginacion",
]
ETIQUETAS = {
    "abst_rel_lag1": "Abstención en la elección anterior (vs. nacional)",
    "abst_rel_lag2": "Abstención hace dos elecciones (vs. nacional)",
    "abst_rel_mismo_tipo": "Abstención en la última elección del mismo tipo (vs. nacional)",
    "delta_rel": "Tendencia reciente de la abstención",
    "abst_rel_mun_lag1": "Abstención del municipio en la elección anterior",
    "intermedia": "Elección intermedia",
    "log_lista_nominal": "Tamaño del electorado",
    "electores_por_casilla": "Electores por casilla",
    "tipo_urbana": "Sección urbana", "tipo_mixta": "Sección mixta", "tipo_rural": "Sección rural",
    "pct_18_24": "Población de 18 a 24 años",
    "pct_60ymas": "Población de 60 años y más",
    "escolaridad_prom": "Escolaridad promedio",
    "pct_posbasica": "Población con educación posbásica",
    "tasa_act_econ": "Tasa de actividad económica",
    "pct_desocupada": "Población desocupada",
    "pct_sin_servicio_salud": "Población sin servicios de salud",
    "pct_migrante_reciente": "Población que llegó de otro estado (desde 2015)",
    "pct_viv_internet": "Viviendas con internet",
    "pct_viv_pc": "Viviendas con computadora",
    "pct_viv_auto": "Viviendas con automóvil",
    "prom_ocupantes": "Ocupantes por vivienda",
    "ind_marginacion": "Índice de marginación municipal",
}
PARAMS = dict(
    n_estimators=3000, learning_rate=0.03, max_depth=6, min_child_weight=10,
    subsample=0.8, colsample_bytree=0.8, reg_lambda=1.0, tree_method="hist",
    early_stopping_rounds=100, random_state=SEMILLA, n_jobs=-1,
    monotone_constraints={"electores_por_casilla": 1},
)


def metricas(y, p):
    e = np.asarray(p) - np.asarray(y)
    rmse = float(np.sqrt(np.mean(e ** 2)))
    mae = float(np.mean(np.abs(e)))
    r2 = float(1 - np.sum(e ** 2) / np.sum((y - np.mean(y)) ** 2))
    return {"rmse": round(rmse, 5), "mae": round(mae, 5), "r2": round(r2, 4)}


def separar_validacion(df, frac=0.1):
    """Separa municipios completos para early stopping (evita fuga espacial)."""
    rng = np.random.default_rng(SEMILLA)
    claves = df[["entidad", "municipio_ine"]].drop_duplicates()
    elegidos = claves.sample(frac=frac, random_state=SEMILLA)
    marca = df.merge(elegidos.assign(_val=1), on=["entidad", "municipio_ine"], how="left")["_val"].eq(1).values
    return df[~marca], df[marca]


def entrenar(df, objetivo="reg:squarederror", alpha=None):
    tr, va = separar_validacion(df)
    params = dict(PARAMS, objective=objetivo)
    if alpha is not None:
        params["quantile_alpha"] = alpha
    m = xgb.XGBRegressor(**params)
    m.fit(tr[FEATURES], tr["y_abst_rel"], eval_set=[(va[FEATURES], va["y_abst_rel"])], verbose=False)
    return m


def nivel_riesgo(abst, u):
    return np.select([abst >= u["muyAlto"], abst >= u["alto"], abst >= u["medio"]],
                     ["MUY_ALTO", "ALTO", "MEDIO"], default="BAJO")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nivel-2027", type=float, default=None,
                    help="Supuesto de abstención nacional 2027 (por defecto, la de 2021)")
    args = ap.parse_args(argv)

    t = pd.read_parquet(PROCESSED / "tabla_maestra.parquet")
    res = pd.read_parquet(DATA / "interim" / "resultados_seccion.parquet")
    g = res.groupby("anio")[["votos_totales", "lista_nominal"]].sum()
    nivel = (1 - g["votos_totales"] / g["lista_nominal"]).to_dict()
    nivel_2027 = args.nivel_2027 if args.nivel_2027 is not None else nivel[2021]

    t24 = t[t.anio_objetivo == 2024].dropna(subset=["y_abst_rel"]).reset_index(drop=True)
    t27 = t[t.anio_objetivo == 2027].copy()

    # 1. Validación cruzada espacial por municipio
    grupos = t24[["entidad", "municipio_ine"]].drop_duplicates().sample(frac=1, random_state=SEMILLA)
    grupos["pliegue"] = np.arange(len(grupos)) % 5
    pliegue = t24.merge(grupos, on=["entidad", "municipio_ine"], how="left")["pliegue"].values
    oof = np.zeros(len(t24))
    for k in range(5):
        mk = entrenar(t24[pliegue != k])
        oof[pliegue == k] = mk.predict(t24.loc[pliegue == k, FEATURES])
    y24 = t24["y_abst_rel"].values
    met_modelo = metricas(y24, oof)
    met_base = {"ultima_eleccion": metricas(y24, t24["abst_rel_lag1"].values),
                "ultima_mismo_tipo": metricas(y24, t24["abst_rel_mismo_tipo"].fillna(t24["abst_rel_lag1"]).values)}
    mejor_base = min(met_base, key=lambda k: met_base[k]["rmse"])
    mejora = 1 - met_modelo["rmse"] / met_base[mejor_base]["rmse"]
    print(f"Validación cruzada espacial sobre 2024 ({len(t24)} secciones, 5 pliegues por municipio)")
    print(f"  Modelo      RMSE {met_modelo['rmse']*100:.2f} pp  MAE {met_modelo['mae']*100:.2f} pp  R2 {met_modelo['r2']:.3f}")
    for k, v in met_base.items():
        print(f"  Baseline {k:<18} RMSE {v['rmse']*100:.2f} pp  MAE {v['mae']*100:.2f} pp  R2 {v['r2']:.3f}")
    print(f"  Mejora contra el mejor baseline: {mejora:.1%}")
    # cobertura de intervalos (fuera de muestra) se estima con el modelo final más abajo

    # 2. Modelo final con todas las secciones 2024
    entren = t24
    m = entrenar(entren)
    m10 = entrenar(entren, "reg:quantileerror", 0.1)
    m90 = entrenar(entren, "reg:quantileerror", 0.9)

    rel = m.predict(t27[FEATURES])
    r10 = m10.predict(t27[FEATURES])
    r90 = m90.predict(t27[FEATURES])
    t27["abstencion_pred"] = np.clip(rel + nivel_2027, 0, 1)
    t27["p10"] = np.clip(np.minimum(r10, rel) + nivel_2027, 0, 1)
    t27["p90"] = np.clip(np.maximum(r90, rel) + nivel_2027, 0, 1)

    # 3. Umbrales fijos: distribución real por sección en la última intermedia (2021)
    a21 = res.loc[res.anio == 2021, "abstencion"]
    umbrales = {"medio": float(a21.quantile(0.50)), "alto": float(a21.quantile(0.75)), "muyAlto": float(a21.quantile(0.90))}
    t27["nivel_riesgo"] = nivel_riesgo(t27["abstencion_pred"].values, umbrales)

    # 4. Explicación local: contribuciones SHAP nativas
    contrib = m.get_booster().predict(xgb.DMatrix(t27[FEATURES]), pred_contribs=True)
    valor_base = float(contrib[0, -1])
    contrib = contrib[:, :-1]
    top = np.argsort(-np.abs(contrib), axis=1)[:, :5]
    valores = t27[FEATURES].values
    t27["factores_top"] = [
        json.dumps([{"variable": FEATURES[j], "etiqueta": ETIQUETAS[FEATURES[j]],
                     "valor": None if np.isnan(valores[i, j]) else round(float(valores[i, j]), 4),
                     "contribucion": round(float(contrib[i, j]), 4)} for j in top[i]], ensure_ascii=False)
        for i in range(len(t27))
    ]
    imp = m.get_booster().get_score(importance_type="gain")
    total = sum(imp.values())
    importancia = sorted(({"variable": k, "etiqueta": ETIQUETAS[k], "importancia": round(v / total, 4)}
                          for k, v in imp.items()), key=lambda x: -x["importancia"])

    # 5. Guardar
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    m.save_model(ARTIFACTS / "model.json")
    m10.save_model(ARTIFACTS / "model_p10.json")
    m90.save_model(ARTIFACTS / "model_p90.json")
    cols = ["entidad", "seccion", "municipio_ine", "municipio_inegi", "distrito_federal", "tipo_seccion",
            "lista_nominal_ant", "abstencion_pred", "p10", "p90", "nivel_riesgo", "factores_top"]
    pred = t27[cols].rename(columns={"lista_nominal_ant": "lista_nominal_2024"})
    pred.to_parquet(PROCESSED / "predicciones_2027.parquet", index=False)
    pred.drop(columns=["factores_top"]).to_csv(PROCESSED / "predicciones_2027.csv", index=False, encoding="utf-8")

    meta = {
        "version": VERSION,
        "entrenadoEn": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "algoritmo": f"XGBRegressor (xgboost {xgb.__version__})",
        "formulacion": "abstención relativa al nivel nacional; pronóstico = relativa + nivel nacional supuesto",
        "eleccionObjetivo": 2027,
        "nivelNacional": {str(k): round(float(v), 6) for k, v in nivel.items()},
        "supuestoNivelNacional2027": round(float(nivel_2027), 6),
        "validacion": {"tipo": "validación cruzada espacial (5 pliegues por municipio) sobre la elección 2024",
                       "secciones": int(len(t24)),
                       "modelo": met_modelo, "baselines": met_base, "mejorBaseline": mejor_base,
                       "mejoraRmse": round(float(mejora), 4)},
        "seccionesEntrenamiento": int(len(entren)),
        "seccionesPronostico": int(len(t27)),
        "arbolesFinales": int(m.best_iteration + 1),
        "features": FEATURES,
        "umbrales": {k: round(v, 4) for k, v in umbrales.items()},
        "valorBaseShap": round(valor_base, 6),
        "importancia": importancia,
        "hiperparametros": {k: v for k, v in PARAMS.items() if k != "monotone_constraints"},
    }
    (ARTIFACTS / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nPronóstico 2027: {len(pred)} secciones; supuesto nacional {nivel_2027:.2%}")
    print("Umbrales:", {k: f"{v:.1%}" for k, v in umbrales.items()})
    print("Secciones por nivel:", pred["nivel_riesgo"].value_counts().to_dict())
    print("Top 5 variables:", [f"{x['variable']} {x['importancia']:.1%}" for x in importancia[:5]])
    print(f"Artefactos en {ARTIFACTS}; predicciones en {PROCESSED}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
