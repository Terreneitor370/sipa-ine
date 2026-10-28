"""
Exporta los resultados del modelo a JSON para el API (apps/api).

Lee:
    data/processed/predicciones_2027.parquet   (pronóstico por sección)
    data/processed/tabla_maestra.parquet       (filas objetivo 2027 para simular)
    data/interim/resultados_seccion.parquet    (historial 2018, 2021, 2024)
    data/interim/censo_seccion.parquet         (indicadores)
    data/interim/equivalencia_municipios.parquet (nombres de municipio)
    data/interim/marginacion_municipio.parquet (grado de marginación)
    ml/artifacts/model.json + metadata.json

Escribe en data/processed/api/:
    entidades.json, municipios.json, modelo.json
    secciones_EE.json  (una por entidad, con ficha, explicación y efecto de palancas)

El efecto de la palanca "reducir electores por casilla" se calcula con el
mismo modelo XGBoost: se vuelve a predecir cada sección con
electores_por_casilla reducido 10, 20, 30 y 40 % y se guarda la diferencia.

Uso (desde la raíz del repo):
    python -m ml.src.export.exportar_api
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

RAIZ = Path(__file__).resolve().parents[3]
DATA = RAIZ / "data"
PROCESSED = DATA / "processed"
INTERIM = DATA / "interim"
ARTIFACTS = RAIZ / "ml" / "artifacts"
SALIDA = PROCESSED / "api"

REDUCCIONES = [0.1, 0.2, 0.3, 0.4]

NOMBRES_ENTIDAD = {
    1: "Aguascalientes",
    2: "Baja California",
    3: "Baja California Sur",
    4: "Campeche",
    5: "Coahuila",
    6: "Colima",
    7: "Chiapas",
    8: "Chihuahua",
    9: "Ciudad de México",
    10: "Durango",
    11: "Guanajuato",
    12: "Guerrero",
    13: "Hidalgo",
    14: "Jalisco",
    15: "Estado de México",
    16: "Michoacán",
    17: "Morelos",
    18: "Nayarit",
    19: "Nuevo León",
    20: "Oaxaca",
    21: "Puebla",
    22: "Querétaro",
    23: "Quintana Roo",
    24: "San Luis Potosí",
    25: "Sinaloa",
    26: "Sonora",
    27: "Tabasco",
    28: "Tamaulipas",
    29: "Tlaxcala",
    30: "Veracruz",
    31: "Yucatán",
    32: "Zacatecas",
}

INDICADORES = {
    "pct_18_24": "pct1824", "pct_60ymas": "pct60ymas", "escolaridad_prom": "escolaridadProm",
    "pct_posbasica": "pctPosbasica", "tasa_act_econ": "tasaActEcon", "pct_desocupada": "pctDesocupada",
    "pct_sin_servicio_salud": "pctSinServicioSalud", "pct_migrante_reciente": "pctMigranteReciente",
    "pct_viv_internet": "pctVivInternet", "pct_viv_pc": "pctVivPc", "pct_viv_auto": "pctVivAuto",
    "prom_ocupantes": "promOcupantes",
}


def r4(x):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return round(float(x), 4)


def efecto_casillas(t27: pd.DataFrame, features: list[str]) -> np.ndarray:
    """Diferencia de abstención (fracción) al reducir electores por casilla."""
    booster = xgb.Booster()
    booster.load_model(str(ARTIFACTS / "model.json"))
    base = booster.predict(xgb.DMatrix(t27[features]))
    deltas = []
    for r in REDUCCIONES:
        x = t27[features].copy()
        x["electores_por_casilla"] = x["electores_por_casilla"] * (1 - r)
        deltas.append(booster.predict(xgb.DMatrix(x)) - base)
    return np.column_stack(deltas)


def main() -> int:
    meta = json.loads((ARTIFACTS / "metadata.json").read_text(encoding="utf-8"))
    features = meta["features"]
    pred = pd.read_parquet(PROCESSED / "predicciones_2027.parquet").drop_duplicates(["entidad", "seccion"])
    tabla = pd.read_parquet(PROCESSED / "tabla_maestra.parquet")
    res = pd.read_parquet(INTERIM / "resultados_seccion.parquet")
    censo = pd.read_parquet(INTERIM / "censo_seccion.parquet")
    equiv = pd.read_parquet(INTERIM / "equivalencia_municipios.parquet")
    marg = pd.read_parquet(INTERIM / "marginacion_municipio.parquet")

    SALIDA.mkdir(parents=True, exist_ok=True)

    # Efecto de la palanca de casillas con el modelo
    t27 = (tabla[tabla.anio_objetivo == 2027]
           .drop_duplicates(["entidad", "seccion"]).reset_index(drop=True))
    dc = efecto_casillas(t27, features)
    efecto = pd.DataFrame(dc, columns=[f"dc{i}" for i in range(len(REDUCCIONES))])
    efecto[["entidad", "seccion", "electores_por_casilla"]] = t27[["entidad", "seccion", "electores_por_casilla"]]

    pred = (pred.merge(efecto, on=["entidad", "seccion"], how="left")
                .merge(censo, on=["entidad", "seccion"], how="left", suffixes=("", "_c"))
                .merge(marg[["entidad", "municipio_inegi", "grado_marginacion"]],
                       on=["entidad", "municipio_inegi"], how="left"))

    nombres_mun = {(int(r.entidad), int(r.municipio_ine)): r.nombre_inegi for r in equiv.itertuples()}

    # Catálogos
    entidades = [{"entidad": int(e), "nombre": NOMBRES_ENTIDAD[int(e)], "secciones": int(n)}
                 for e, n in pred.groupby("entidad").size().items()]
    (SALIDA / "entidades.json").write_text(json.dumps(entidades, ensure_ascii=False), encoding="utf-8")

    municipios = {}
    for (e, m), _ in pred.groupby(["entidad", "municipio_ine"]):
        municipios.setdefault(str(int(e)), []).append(
            {"entidad": int(e), "municipio": int(m),
             "nombre": nombres_mun.get((int(e), int(m)), f"Municipio {int(m)}")})
    (SALIDA / "municipios.json").write_text(json.dumps(municipios, ensure_ascii=False), encoding="utf-8")

    # Historial por sección
    hist = {}
    for r in res.itertuples():
        hist.setdefault((int(r.entidad), int(r.seccion)), []).append({
            "anio": int(r.anio), "tipoEleccion": r.tipo_eleccion,
            "listaNominal": int(r.lista_nominal), "votosTotales": int(r.votos_totales),
            "participacion": r4(r.participacion), "abstencion": r4(r.abstencion)})

    # Secciones por entidad
    for e, g in pred.groupby("entidad"):
        filas = []
        for r in g.itertuples():
            clave = (int(r.entidad), int(r.seccion))
            h = sorted(hist.get(clave, []), key=lambda x: x["anio"])
            h.append({"anio": 2027, "tipoEleccion": "intermedia", "abstencion": r4(r.abstencion_pred)})
            ind = {"listaNominal": int(r.lista_nominal_2024) if pd.notna(r.lista_nominal_2024) else None,
                   "electoresPorCasilla": r4(r.electores_por_casilla),
                   "distMacKm": None,
                   "marginacion": r.grado_marginacion if isinstance(r.grado_marginacion, str) else None}
            for col, nombre in INDICADORES.items():
                ind[nombre] = r4(getattr(r, col))
            filas.append({
                "seccion": int(r.seccion),
                "municipio": int(r.municipio_ine),
                "distritoFederal": int(r.distrito_federal) if pd.notna(r.distrito_federal) else None,
                "tipoSeccion": r.tipo_seccion if isinstance(r.tipo_seccion, str) else None,
                "listaNominal": int(r.lista_nominal_2024) if pd.notna(r.lista_nominal_2024) else 0,
                "abstencionPred": r4(r.abstencion_pred),
                "p10": r4(r.p10), "p90": r4(r.p90),
                "nivelRiesgo": r.nivel_riesgo,
                "indicadores": ind,
                "historial": h,
                "factores": json.loads(r.factores_top),
                "efectoCasillas": [r4(getattr(r, f"dc{i}")) or 0.0 for i in range(len(REDUCCIONES))],
            })
        (SALIDA / f"secciones_{int(e):02d}.json").write_text(
            json.dumps({"entidad": int(e), "secciones": filas}, ensure_ascii=False), encoding="utf-8")

    # Model card
    v = meta["validacion"]
    base = v["baselines"][v["mejorBaseline"]]
    modelo = {
        "version": meta["version"],
        "entrenadoEn": meta["entrenadoEn"],
        "eleccionPrueba": 2024,
        "eleccionObjetivo": meta["eleccionObjetivo"],
        "seccionesEntrenamiento": meta["seccionesEntrenamiento"],
        "metricas": v["modelo"],
        "baseline": {**base, "descripcion": "Abstención de la última elección del mismo tipo"},
        "umbrales": meta["umbrales"],
        "valorBase": meta["valorBaseShap"],
        "nivelNacional": meta["nivelNacional"],
        "supuestoNivelNacional2027": meta["supuestoNivelNacional2027"],
        "reduccionesCasillas": REDUCCIONES,
        "importancia": meta["importancia"],
        "fuentes": [
            "INE, Cómputos distritales 2018, 2021 y 2024 (diputaciones de mayoría relativa)",
            "INEGI, Estadísticas Censales a Escalas Geoelectorales 2020 (ECEG)",
            "CONAPO, Índice de marginación por municipio 2020",
        ],
        "limitaciones": [
            "La validación es cruzada espacial por municipio sobre 2024; no hay una elección intermedia futura para validar 2027.",
            "El pronóstico 2027 supone una abstención nacional igual a la de 2021 (" +
            f"{meta['supuestoNivelNacional2027']:.1%}); el nivel absoluto cambia si cambia ese supuesto.",
            "Las variables censales son de 2020 y la marginación es municipal, no por sección.",
            "El efecto de las palancas del simulador es una estimación del modelo, no un efecto causal medido.",
            "El modelo no usa la distancia a módulos de atención (solo se muestra en la ficha donde hay cartografía); la palanca de distancia no modifica el resultado.",
            "Las secciones creadas o modificadas en la cartografía 2025 no tienen historial 2018-2024 y aparecen sin pronóstico.",
        ],
    }
    (SALIDA / "modelo.json").write_text(json.dumps(modelo, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Exportadas {len(pred)} secciones de {len(entidades)} entidades en {SALIDA}")
    print("Efecto medio de reducir 20 % electores por casilla:",
          f"{efecto['dc1'].mean()*100:.2f} pp")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
