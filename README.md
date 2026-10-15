# SIPA-INE

Sistema de Identificación Predictiva de Abstencionismo y Simulación de Impacto Territorial.
Hackatón INE - Reto 2: Predicción y escenarios de riesgo de abstención.

**Entrega:** miércoles 28 de octubre de 2026.

## Equipo

| Integrante | Rol |
|---|---|
| Isabel | Líder técnica, datos y Machine Learning |
| Jeshua | Backend, base de datos y DevOps |
| Kassandra | Frontend, UX y presentación |

## Stack

- **Frontend:** React 18 + Vite + TypeScript + react-leaflet + Recharts
- **API:** Node.js 22 + Express
- **Servicio ML:** Python 3.11 + FastAPI + XGBoost + SHAP
- **Base de datos:** MySQL 8

## Estructura

```
apps/web/              Frontend React
apps/api/              API Node + Express
services/ml-service/   Servicio de inferencia (FastAPI)
ml/                    ETL, features, entrenamiento y artefactos del modelo
db/                    Migraciones y seeds
public-geo/            Cartografía TopoJSON por entidad
docs/                  Arquitectura, propuesta, reporte técnico
```

La arquitectura completa está en `docs/SIPA-INE_Arquitectura.docx`.

## Reglas de trabajo en GitHub

1. Nadie hace push directo a `main` ni a `develop`.
2. Cada integrante crea y trabaja solo en sus propias ramas, desde `develop`:
   `<tipo>/<nombre>/<area>-<descripcion>`, por ejemplo `feature/kassandra/web-mapa-riesgo`.
3. Al terminar, se abre un Pull Request hacia `develop`. Otro integrante lo revisa y aprueba.
4. Solo Isabel pasa `develop` a `main` en cada hito y crea la etiqueta de versión.
5. Commits con formato Conventional Commits: `feat(web): agrega leyenda de riesgo`.
6. Está prohibido incluir líneas `Co-Authored-By` o atribuciones a herramientas de IA en commits, PRs o documentos.
7. No se suben archivos `.env` ni datos crudos (`data/`).

## Hitos

| Fecha | Hito |
|---|---|
| Vie 16 oct | Contrato de API congelado |
| Mié 21 oct | v0.1.0: mapa inercial de punta a punta |
| Dom 25 oct | Congelamiento de funciones |
| Mar 27 oct | v1.0.0-demo en `main` |
| Mié 28 oct | Entrega |
