# apps/api · API de SIPA-INE

API en Node 22 + Express que implementa `docs/openapi.yaml`. Sirve el pronóstico
de abstención 2027 que genera el pipeline de `ml/`; para la demo no necesita
MySQL ni el servicio FastAPI: lee los JSON que exporta Python y los mantiene en memoria.

## Requisitos

1. Haber corrido el pipeline de `ml/` (ver `ml/README.md`) hasta tener
   `data/processed/predicciones_2027.parquet`.
2. Exportar los datos para el API (desde la raíz del repo):

   ```
   python -m ml.src.export.exportar_api
   ```

   Genera `data/processed/api/` (entidades, municipios, model card y un archivo
   por entidad con ficha, explicación SHAP y efecto de palancas). La carpeta
   `data/` no se sube al repositorio.

3. Opcional, mapa por sección y colonias: descomprimir la BGD del INE de la
   entidad en `data/raw/cartografia/...` y ejecutar

   ```
   pip install geopandas
   python -m ml.src.export.cartografia data/raw/cartografia/bgd_26_sonora
   ```

   Genera `data/processed/geo/secciones_26.geojson`, `colonias_26.json` y `mac_26.json`
   (distancia de cada sección al Módulo de Atención Ciudadana más cercano, que aparece en la ficha).
   Sin este paso el API responde una cartografía vacía y la ficha no lista colonias.

## Configuración

Copiar `.env.example` de la raíz a `.env` y llenar las variables del API. Las
credenciales nunca se suben al repositorio.

| Variable | Uso |
|---|---|
| `API_PORT` | Puerto (4000) |
| `JWT_SECRET` | Secreto para firmar tokens; obligatorio fuera de desarrollo |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Usuario administrador |
| `ANALISTA_EMAIL`, `ANALISTA_PASSWORD` | Usuario analista (opcional) |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma (por defecto Vite en 5173) |
| `DATA_DIR` | Carpeta de datos procesados (por defecto `data/processed`) |

## Uso

```
cd apps/api
npm install
npm start          # http://localhost:4000/api/v1
npm test           # pruebas con datos de ejemplo (test/fixtures)
```

Para que el frontend use el API real: en `apps/web/.env.local` poner
`VITE_USE_MOCKS=false` y reiniciar `npm run dev`.

## Rutas

Todas bajo `/api/v1` y con `Authorization: Bearer <token>`, salvo `/health` y `/auth/login`.

| Ruta | Descripción |
|---|---|
| `POST /auth/login` | Sesión JWT de 8 h; 5 intentos fallidos por 15 min |
| `GET /auth/me`, `GET /usuarios` | Usuario actual; lista de usuarios (ADMIN) |
| `GET /entidades`, `GET /entidades/{e}/municipios` | Catálogos |
| `GET /riesgo?entidad=&municipio=&nivel=` | Pronóstico por sección |
| `GET /riesgo/municipios?entidad=` | Agregado por municipio, ponderado por lista nominal |
| `GET /secciones/{e}/{s}` | Ficha: historial 2018-2024, indicadores, pronóstico |
| `GET /secciones/{e}/{s}/explicacion` | Top 5 factores SHAP |
| `GET /secciones/{e}/{s}/colonias` | Colonias que cubre la sección |
| `GET /geo/{e}` y `GET /geo/{e}/{m}` | Polígonos de sección en TopoJSON |
| `GET /buscar?q=` | Secciones (número), municipios y colonias (texto) |
| `GET /modelo` | Model card: métricas, baseline, importancia, limitaciones |
| `POST /simulaciones`, `GET /escenarios`, `GET /priorizacion?escenario=` | Simulador y ranking |

## Simulador

- Escenario A: pronóstico inercial 2027.
- Reducir electores por casilla: el efecto se calcula con el mismo modelo XGBoost
  (se vuelve a predecir cada sección con 10, 20, 30 y 40 % menos electores por casilla).
  El modelo le da poco peso a esta variable, así que el efecto es pequeño.
- Campaña digital: supuesto del usuario (puntos porcentuales por la cobertura).
- Distancia a módulo de atención: se muestra en la ficha, pero el modelo no la usa como
  variable, así que esta palanca no cambia el resultado.
- Los escenarios se guardan en memoria y se pierden al reiniciar el API.
