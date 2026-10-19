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

## Pruebas

```
python -m pytest ml/tests -q
```
