# ml/ - Datos y Machine Learning

## Preparar el entorno (una vez)

Requiere Python 3.11. Desde la raíz del repositorio, en PowerShell:

```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r ml/requirements.txt
```

## 1. Descargar las fuentes (~45 MB)

```
python -m ml.src.etl.descargar
```

Descarga y descomprime en `data/raw/` (carpeta ignorada por git):

| Clave | Fuente |
|---|---|
| computos_2018 | INE - Cómputos distritales 2018 |
| computos_2021 | INE - Cómputos distritales 2021 |
| computos_2024 | INE - Cómputos distritales 2024 |
| eceg_2020 | INEGI-INE - Estadísticas Censales a Escalas Geoelectorales 2020 |
| imm_2020 | CONAPO - Índice de marginación municipal 2020 (datos.gob.mx) |

Si una descarga falla, el script indica la página oficial para bajarla a mano.

**Marginación:** el servidor original de CONAPO ya no sirve el Excel, así que se usa la
copia oficial en CSV publicada en https://www.datos.gob.mx/dataset/indices_marginacion

**Claves de municipio:** el INE y el INEGI numeran distinto los municipios (por ejemplo,
Hermosillo es 030 en INEGI y 49 en INE). La equivalencia se toma del catálogo que trae el
ECEG (`catalogos/cat_municipios_2020_INEGI-INE-ECEG.xlsx`).

## 2. Validar y generar tablas intermedias

```
python -m ml.src.etl.validar
```

Por defecto procesa Sonora (26) y Baja California (2). Genera en `data/interim/`
las tablas en parquet y `reporte_validacion.md`, que se comparte con el equipo.

## 3. Tabla maestra y modelo

```
python -m ml.src.etl.validar --todas
python -m ml.src.features.tabla_maestra
python -m ml.src.train.train
```

- `tabla_maestra` arma una fila por sección y elección objetivo (2021, 2024, 2027) con
  rezagos de elecciones anteriores, censo 2020 y marginación. El objetivo es la
  abstención relativa al nivel nacional de cada elección.
- `train` valida con 5 pliegues espaciales por municipio sobre 2024, compara contra dos
  baselines, entrena el modelo final y pronostica 2027 con intervalo P10-P90, nivel de
  riesgo y los 5 factores SHAP de cada sección. Tarda alrededor de 2 minutos.
- Supuesto: la abstención nacional de 2027 es la de la última intermedia (2021). Se
  cambia con `python -m ml.src.train.train --nivel-2027 0.45`.

Resultados actuales (validación espacial sobre 2024):

| | RMSE | MAE | R2 |
|---|---|---|---|
| Modelo XGBoost | 5.49 pp | 3.70 pp | 0.74 |
| Baseline: última elección del mismo tipo | 7.18 pp | 4.91 pp | 0.56 |

Salidas: `ml/artifacts/` (modelos y `metadata.json`, se suben al repo) y
`data/processed/predicciones_2027.parquet` y `.csv` (no se suben).

Para el API (apps/api) se exportan los resultados a JSON en `data/processed/api/`:

```
python -m ml.src.export.exportar_api
```

Opcional, cartografía de secciones y colonias desde la BGD del INE (requiere geopandas):

```
python -m ml.src.export.cartografia data/raw/cartografia/bgd_26_sonora
```

Limitación: no hay validación temporal estricta entre intermedias porque faltan los
datos de 2015.

## Pruebas

```
python -m pytest ml/tests -q
```
