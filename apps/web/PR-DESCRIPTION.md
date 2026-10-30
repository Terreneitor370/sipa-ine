# PR: Frontend SIPA-INE (Kassie) — `feature/kassandra/web-ranking-modelo` → `develop`

React 18 + Vite + TypeScript estricto + Tailwind + react-leaflet + TanStack Query + Vitest.

**Estado:** build limpio, **27/27 pruebas verdes**, consola sin errores, vista móvil 375px verificada.
El frontend corre en **modo demo con datos honestos** (`USAR_MOCKS`) y pasa por la misma
capa de adaptadores que usará la API real — activar el modo real es solo
`VITE_USE_MOCKS=false` cuando `apps/api` exista.

---

## Mapeo spec↔entrega (docs/specs)

| Spec | Requisito | Dónde quedó |
|---|---|---|
| **00 Sistema de diseño** | Paleta INE, niveles daltónicos, cero sombras/gradientes, IBM Plex Sans, radio ≤2px, govtech | `index.css`, `tailwind.config.js`, todos los componentes. Contraste AA **calculado con WCAG real**: texto marino sobre niveles claros (≥5.5:1), `ink-2` oscurecido a `#5A6272` (≥5:1); foco visible rosa `:focus-visible` |
| **01 Mapa / ** **México 32 estados** pintados por nivel (bug de estilo-estático corregido: el GeoJSON se re-monta cuando llegan los datos); **todos los estados clickeables**; filtros en vivo (entidad/municipio/nivel); buscador de colonias centrado por bbox; tooltips con seccionismo (sección, lista nominal, P10–P90); búsqueda con aviso honesto de cartografía faltante; Distrito federal pendiente (del API v1) con tooltip explicativo | `pages/MapaPage.tsx`, `components/map/MexicoStatesMap.tsx`, `RiskMap.tsx`, `ColoniaSearch.tsx` |
| **02 Ficha de sección** | Predicción 2027 + intervalo P10–P90; indicadores operativos (DERFE); histórico real 2018–2027 con proyección punteada; top 5 SHAP con barras y leyenda de signo; municipio **real derivado por sección** de `/riesgo`; "Volver al mapa"; exportación ficha completa CSV + SHAP CSV con **BOM y cabeceras legibles en español con unidades** | `pages/SeccionPage.tsx` |
| **03 Simulador** | Palancas (casillas, MAC, campaña digital con supuesto), focalización por nivel **y por municipio** (select conectado a `focalizacion.municipios` del contrato), comparación A/B por nivel con barras de impacto relativo, **mapa B real con secciones focalizadas resaltadas en vino**, auto-recálculo con debounce 400 ms, RF-08 guardado/listado de escenarios, leyenda de unidades (pp/%/km) | `pages/SimuladorPage.tsx`, `components/simulator/*` |
| **04 Priorización** | Tabla densa con **columnas ordenables (clic) y aria-sort**, filtro **Top N** y nivel/municipio, pie con total, barra de metadatos sin números inventados, clic fila → ficha, **Exportar CSV legible** con BOM y unidades | `pages/PriorizacionPage.tsx` |
| **05 Panel del Modelo** | Métricas vs baseline, importancia (gain), fuentes y limitaciones textual del contrato | `pages/ModeloPage.tsx` |
| **RNF / contrato** | Login con roles y sesión **8 h con auto-cierre y limpieza por 401**; errores del contrato (`Error {code, message}`) como toasts con **Reintentar** cableados a `QueryCache/MutationCache` (`NoAutenticado` lo maneja AuthContext); README con nota de integración de endpoints/sesión/errores para backend | `auth/AuthContext.tsx`, `lib/aviso.ts`, `components/ui/Avisos.tsx`, `Root.tsx`, `apps/web/README.md` |

## Decisiones de diseño (documentadas, no descuidos)

- **Filtros aplican en vivo** en vez de botón "Aplicar" (spec 01): menos fricción, mismo resultado.
- **Acento rosa INE `#d5007f`** como tono de acción (spec base usaba `#0F4C81`); Sidebar vino `#950054` sí cumple spec.
- La tarjeta "Convergencia del modelo" del mapa y los badges de versión/producción se retiraron por saturación; su contenido vive en la pestaña Modelo.
- El disclaimer "no son predicciones exactas" vive **solo en el footer** de todas las pantallas, como pide el spec.
- **Demo honesta**: `/riesgo`, `/geo` y el catálogo de municipios solo entregan datos de Sonora; las demás entidades muestran un aviso de cartografía pendiente, sin inventarse datos.

## Qué queda delante (no frontend)

1. **Modo real** (`VITE_USE_MOCKS=false`): requiere `apps/api` (Jeshua). El único punto sin implementar adaptador es `/geo/{e}/{m}` TopoJSON (el front ya trae `topojson-client`).
2. **Datos nacionales del modelo** y métricas reales: Isabel.
3. **Filtro por distrito federal y casillas programadas en tooltip**: requieren campo nuevo en `RiesgoSeccion` del contrato (change request a specs, no bug de front).

## Pruebas

- 27/27 Vitest: contrato de adaptadores (15), avisos de error (5), riesgo/umbrales (4), slider (2), a11y básico y login.
- `npm run build` (tsc -b + vite) limpio.
