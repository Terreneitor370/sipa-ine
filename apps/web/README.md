# apps/web — Frontend SIPA-INE

React + Vite + Tailwind + react-leaflet + TanStack Query. TypeScript estricto.

## Arranque

```bash
cd apps/web
npm install
npm run dev      # http://localhost:5173
```

El frontend arranca en **modo demo con datos simulados** (`USAR_MOCKS`).
Los mocks viven en `src/mocks/` y ya tienen la forma del contrato congelado
(`docs/openapi.yaml`, PR #3), de modo que las respuestas pasan por la misma
capa de adaptadores que usará la API real (`src/lib/adaptadores.ts`).

Para probar contra el backend real (cuando exista `apps/api`):

```bash
# .env local
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:4000/api/v1
```

## Modo demo (sin backend)

- El login acepta cualquier correo con formato válido y cualquier contraseña
  (se crea el usuario "Analista demo", rol ANALISTA, sesión demo de 8 h).
- La cartografía de **secciones** funciona solo en Sonora (48 secciones de
  demostración alrededor de colonias reales); el mapa **nacional** cubre las
  32 entidades. Ese único punto vive en `api/recursos.ts → entidadesConGeo()`.
- El municipio ficticio del primer prototipo "Obregón" se fusionó en
  "Cajeme" en todos los mocks y en la geografía de demo.

## Endpoints que consume el frontend

| Pantalla | Llamadas (siempre vía adaptador) |
|---|---|
| Login / sesión | `POST /auth/login` → `Sesion {token, expiraEn, usuario}`; `GET /auth/me` al restaurar |
| Mapa nacional | `GET /riesgo` por entidad (escenario inercial, para calcular el tablero por entidad), catálogo `GET /entidades` |
| Mapa de secciones (x entidad) | `GET /riesgo?entidad=&municipio=&nivel=`, búsqueda `GET /buscar?q=&entidad=` (se centra con el **bbox**) |
| Ficha de sección | `GET /secciones/{e}/{s}` + `/explicacion` (SHAP) + `/colonias` |
| Simulador | `POST /simulaciones` (cuerpo `SimulacionEntrada {nombre, entidad, palancas}`; los municipios de `focalizacion` van como claves numéricas INE), listado RF-08 `GET /escenarios` |
| Priorización | `GET /priorizacion?escenario=` |
| Model card | `GET /modelo` |

Notas de integración:

- El token JWT se manda en `Authorization: Bearer`; un 401 limpia la sesión y
  redirige a `/login` automáticamente.
- Los errores del contrato (`Error {code, message}`) se muestran como avisos
  con botón **Reintentar** (`lib/aviso.ts` + `QueryCache/MutationCache`,
  excluyendo `NoAutenticado` que maneja el auth).
- Geometría: cuando `/geo/{entidad}/{municipio}` entrega TopoJSON, se convierte
  con `topojsonAGeojson()` (topojson-client ya está en dependencias).

## Accesibilidad (RNF-05 / RNF-13)

- Paleta de niveles apta para daltonismo; etiquetas de nivel con **texto marino
  `#1a2a4a`** sobre los rellenos claros (ALTO/MEDIO/BAJO) y blanco sobre
  `MUY_ALTO`: todos los pares contra los 4 rellenos quedan ≥ 5.5:1.
- Texto secundario `ink-2` = `#5A6272` (≥ 5.0:1 sobre blanco y sobre el
  encabezado de tabla; el `#6B7280` original 4.39:1 quedaba fuera de AA en
  tablas).
- Foco visible por teclado en toda la app (`:focus-visible` rosa `#d5007f`) y
  `role/aria-label` en leyenda de mapas, tabla de distribución y avisos.
- El mapa es interactivo con puntero; para lectores de pantalla los mismos
  datos están en el panel lateral (Resumen, distribución por nivel) y en las
  tablas del simulador/priorización.

## Documentación de producto

- Rutas: `/`, `/seccion/:id`, `/simulador`, `/priorizacion`, `/modelo`, `/login`
- Conventional Commits (`feat(web)/fix(web)/chore(web)`); los PRs van hacia
  `develop` y hacen rebase antes de subir.
