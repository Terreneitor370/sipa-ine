# Especificación: Página Mapa de Riesgo (ruta /)

## Estructura general
- Breadcrumb: "SIPA-INE / Mapa de Riesgo" + badge "ENTORNO FEDERAL 2027"
- Fila de filtros (48px, bg-white, border-b)
- Fila de metadatos (32px, bg-[#FAFAFA], texto 11px gris)
- Área principal dividida 70/30 con línea vertical 1px #D1D5DB:
  - 70% izquierda: mapa coroplético
  - 30% derecha: panel con 4 cards

## Fila de filtros
Labels en 11px uppercase gris arriba, select abajo (input HTML clásico):
- ENTIDAD: "Sonora"
- MUNICIPIO: "Todos"
- DISTRITO: "Todos"
- NIVEL DE RIESGO: "Todos"
- ESCENARIO: "Inercial 2027"

Botón a la derecha: "Aplicar" — bg-[#0F4C81], texto blanco 13px, 
altura 32px, rounded-sm, ícono filter 14px, SIN glow.

## Fila de metadatos
Texto en 11px gris separado por pipes:
"PROYECCIÓN: 8P10-6362 (ITF/2028 / UTM 12N) | CAPA: Polígonos de 
Sección Electoral | SONORA: 72 Municipios | ● GEOMETRÍA VALIDADA | 
CORTE ALFANUMÉRICO: 15/OCT/2024"

## Mapa (columna izquierda)
- react-leaflet con MapContainer
- Capa GeoJSON desde TopoJSON (topojson-client)
- preferCanvas={true}
- Cada sección rellena con el color de su nivel de riesgo
- Bordes entre secciones: 0.5px blanco
- Controles de zoom (+/-) cuadrados 28x28px, borde 1px #D1D5DB
- Escala gráfica al fondo izquierdo: 0-50-100-200 km
- Barra inferior con coordenadas: "LAT: 29°15' 44" N | LON: 110°56' 28" W"
- Al hacer hover sobre una sección: tooltip con:
  - Header: "■ SECCIÓN: 0432 (Nogales Centro)"
  - "Lista Nominal: 2,842 electores"
  - "Abstención Proyectada: 64.8% (P90)"
  - "Casillas Programadas: 3 (1B, 2C)"
- Tooltip: bg-[#FFF9F0] borde 1px #D1D5DB, texto 11px, rounded-sm

## Panel derecho (30%)
4 cards apiladas con gap de 12px:

### Card 1: RESUMEN
Título: "RESUMEN" + a la derecha "ESTADÍSTICA 2027" en 10px gris.
Dos filas clave-valor en 13px, borde entre ellas 1px #E5E7EB:
- Secciones: 2,847 (a la derecha, tabular)
- Abstención promedio: 51.2%

### Card 2: DISTRIBUCIÓN POR NIVEL
Título + "N=2,847" a la derecha.
Tabla de 5 filas (4 niveles + total), header en 11px uppercase:
| NIVEL | SECCIONES | % |
Cuadro sólido de 10x10px del color de riesgo + nombre del nivel:
- ■ Muy Alto | 428 | 15.0%
- ■ Alto | 612 | 21.5%
- ■ Medio | 891 | 31.3%
- ■ Bajo | 916 | 32.2%
- Total | 2,847 | 100.0% (fila en semibold, fondo #F3F4F6)

### Card 3: LEYENDA DE CORTE
Título + "UMBRALES" a la derecha.
4 filas en 11px gris:
- ■ Muy Alto: ≥P90 (>58.4% abstención proyectada)
- ■ Alto: P70-P90 (52.1% - 58.4%)
- ■ Medio: P30-P70 (44.5% - 52.1%)
- ■ Bajo: <P30 (<44.5% abstención proyectada)
Nota al fondo en 10px italic: "Percentiles calculados sobre la serie 
histórica 2012-2021 ajustada por reseccionamiento federal."

### Card 4: CONVERGENCIA DEL MODELO
Título + badge "OK" en rectángulo verde no (usar gris #6B7280).
Texto en 12px: "Error cuadrático medio serial (RMSE): 8.845. Sin 
casillas atípicas ni convergentes."
Al fondo dos columnas: "Iteraciones: 1,000/1,000" | "R² Ajustado: 0.892"

## Datos mock
Ver apps/web/src/mocks/riesgo.json

## Hook
useRiesgo() con TanStack Query. Si VITE_USE_MOCKS=true, leer de mocks.