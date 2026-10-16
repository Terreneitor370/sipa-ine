# apps/web - Frontend SIPA-INE

Interfaz de SIPA-INE: mapa de riesgo por sección, ficha de sección, simulador
What-If, ranking de priorización y panel del modelo. React 18 + Vite + TypeScript,
react-leaflet (mapa), Recharts (gráficas), TanStack Query (estado del servidor) y
Tailwind CSS.

## Requisitos

- Node.js 20+
- npm 10+

## Levantar en local

```
npm install
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:5173
```

Por defecto `VITE_USE_MOCKS=true`: la app funciona con los mocks de
`src/mocks/` (contrato de API congelado el 16 de octubre), sin necesitar el backend.
Para conectar con el API real, en `.env.local`:

```
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:4000/api/v1
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 5173) |
| `npm run build` | `tsc -b` + build de producción en `dist/` |
| `npm test` | Pruebas con Vitest (leyenda, slider, contrato de mocks, umbrales) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Estructura

```
src/
  api/         cliente axios y funciones por recurso
  hooks/       useRiesgo, useSeccion, useModelo... (TanStack Query)
  components/
    map/       RiskMap, Legend, SectionTooltip
    charts/    HistoryChart, ShapBarChart, LevelDistribution
    simulator/ LeverSlider, PalancasPanel, ScenarioCompare
    ui/        Button, Card, Select, Badge, KpiCard, Disclaimer
  pages/       MapaPage, SeccionPage, SimuladorPage, PriorizacionPage, ModeloPage
  mocks/       JSON de ejemplo con el contrato congelado
  lib/         colores y umbrales de riesgo, formateadores
  types/       tipos TypeScript del contrato de la API
  test/        setup de Vitest y pruebas de contrato de los mocks
```

## Notas de diseño

- Paleta de niveles de riesgo fija (`src/lib/riesgo.ts`): umbrales históricos, no
  cuantiles por escenario (ADR-05). El color siempre va acompañado de la etiqueta
  textual para accesibilidad.
- La leyenda legal (`Disclaimer`) se muestra en el pie de todas las pantallas.
- Los mocks de cartografía son una cuadrícula sintética; el TopoJSON real se
  genera con `public-geo/scripts/simplificar.mjs` y llega por `GET /geo/:entidad`.
