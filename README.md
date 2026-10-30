# SIPA-INE

Sistema de Identificación Predictiva de Abstencionismo y Simulación de Impacto Territorial.
Hackatón INE - Reto 2: Predicción y escenarios de riesgo de abstención.

**Versión actual:** v1.0.0

## Equipo

| Integrante | Rol |
|---|---|
| Isabel | Líder técnica, datos y Machine Learning |
| Jeshua | Backend, base de datos y DevOps |
| Kassandra | Frontend, UX y presentación |

## Qué hace

- Pronostica la abstención 2027 por sección electoral (67,735 secciones, 32 entidades) con
  intervalo P10-P90 y explicación por sección (TreeSHAP).
- Muestra un mapa de riesgo nacional y por entidad (Leaflet + OpenStreetMap).
- Permite simular escenarios (casillas y campaña) y priorizar secciones.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + react-leaflet
- **API:** Node.js 22 + Express 5 (contrato en `docs/openapi.yaml`)
- **ML:** Python 3.11 + pandas + XGBoost + scikit-learn + geopandas
- **Base de datos:** MySQL 8 (migraciones y seeds; el API lee datos precalculados)

## Estructura

```
apps/web/              Frontend React
apps/api/              API Node + Express
ml/                    ETL, features, entrenamiento, exportación y artefactos del modelo
db/                    Migraciones y seeds MySQL
docs/                  Arquitectura, propuesta y contrato de API
data/                  Datos locales (ignorada por git, se regenera con el ETL)
```

La arquitectura completa está en `docs/SIPA-INE_Arquitectura.docx`.

## Cómo correrlo

1. Copia `.env.example` a `.env` y define `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `ANALISTA_EMAIL` y `ANALISTA_PASSWORD`. Nunca se suben credenciales al repositorio.
2. En `apps/web/.env.local` pon `VITE_USE_MOCKS=false`.
3. Los datos de `data/processed` se generan con el pipeline de `ml/README.md`.

API (`http://localhost:4000`):

```
cd apps/api
npm install
npm start
```

Frontend (`http://localhost:5173`), en otra terminal:

```
cd apps/web
npm install
npm run dev
```

Pruebas: `npm test` dentro de `apps/api` o `apps/web`.

Cartografía de secciones: ver `ml/README.md`. Las entidades con polígonos se listan en
`VITE_ENTIDADES_CON_GEO` (actualmente Sonora `26` y Baja California `02`).

## Limitaciones conocidas

- La validación del modelo es espacial (por municipio), no temporal.
- El nivel nacional de 2027 es un supuesto (el de 2021).
- El efecto de casillas en el simulador es pequeño; el de campaña lo asume el usuario.
- Solo Sonora y Baja California tienen polígonos de sección convertidos.

## Reglas de trabajo en GitHub

1. Nadie hace push directo a `main` ni a `develop`.
2. Cada integrante crea y trabaja solo en sus propias ramas, desde `develop`:
   `<tipo>/<nombre>/<area>-<descripcion>`, por ejemplo `feature/kassandra/web-mapa-riesgo`.
3. Al terminar, se abre un Pull Request hacia `develop`. Otro integrante lo revisa y aprueba.
4. Solo Isabel pasa `develop` a `main` en cada hito y crea la etiqueta de versión.
5. Commits con formato Conventional Commits: `feat(web): agrega leyenda de riesgo`.
6. Está prohibido incluir líneas `Co-Authored-By` o atribuciones a herramientas de IA en commits, PRs o documentos.
7. No se suben archivos `.env` ni datos crudos (`data/`).
