# Especificación: Página Priorización (/priorizacion)

## Estructura general
- Breadcrumb: "SIPA-INE / Matriz de Priorización de Intervenciones" + 
  badge "ESTADO: SONORA" en rectángulo plano gris
- Fila de filtros (48px)
- Tabla densa
- Pie de tabla con total
- Barra inferior con metadatos

## Fila de filtros
- ESCENARIO: select "Simulación Operativa 2027 v1"
- TOP: select "50 secciones prioritarias"
- DISTRITO FEDERAL: select "Todos (01 a 07)"
- A la derecha: badge "● Algoritmo de Priorización INE-SIPA (v4.8)" 
  en 11px gris
- Botón "Exportar CSV" (secundario, bg-white, borde 1px #D1D5DB, 
  texto gris 12px, rounded-sm, ícono download 14px)

## Tabla
Densa, filas 32px, bordes horizontales 1px #E5E7EB, sin verticales.
Header 11px uppercase gris sobre #F3F4F6 con íconos de ordenamiento 
(flecha down 10px) en columnas activas.

Columnas:
| # | SECCIÓN ↓ | MUNICIPIO | NIVEL A | ABSTENCIÓN A | ABSTENCIÓN B | 
  Δ PP ↓ | VOTOS RECUPERABLES |

La columna "NIVEL A" usa un CUADRADO sólido de 12x12px del color 
de riesgo + el nombre del nivel al lado en 12px gris (NO dentro del 
cuadrado).

Números alineados a la derecha con font-variant-numeric: tabular-nums.

12 filas de datos (la fila 1 con fondo ligeramente más claro por hover):
| 1 | 1234 | Hermosillo | ■ Muy Alto | 62.1% | 55.4% | -6.7 | 2,340 |
| 2 | 0876 | Cajeme | ■ Muy Alto | 60.8% | 54.9% | -5.9 | 2,105 |
| 3 | 1543 | Nogales | ■ Muy Alto | 59.2% | 53.1% | -6.1 | 1,982 |
| 4 | 0451 | Hermosillo | ■ Alto | 57.4% | 52.8% | -4.6 | 1,754 |
| 5 | 1122 | San Luis Río Colorado | ■ Alto | 56.9% | 52.5% | -4.4 | 1,620 |
| 6 | 0234 | Guaymas | ■ Alto | 56.2% | 52.1% | -4.1 | 1,540 |
| 7 | 1876 | Hermosillo | ■ Alto | 55.8% | 51.9% | -3.9 | 1,480 |
| 8 | 0654 | Cajeme | ■ Medio | 54.1% | 51.2% | -2.9 | 1,120 |
| 9 | 1400 | Navojoa | ■ Medio | 53.7% | 51.0% | -2.7 | 1,050 |
| 10 | 0998 | Empalme | ■ Medio | 53.2% | 50.8% | -2.4 | 980 |
| 11 | 1721 | Agua Prieta | ■ Bajo | 51.8% | 50.2% | -1.6 | 620 |
| 12 | 0501 | Puerto Peñasco | ■ Bajo | 50.9% | 49.8% | -1.1 | 430 |

## Pie de tabla
Línea superior 1px #D1D5DB, dos líneas en 12px gris:
- Izquierda: "Visualizando 1 - 12 de 50 registros prioritarios · 
  Cálculo basado en Padrón Electoral validado 2024"
- Derecha: "TOTAL: 18,450 votos recuperables estimados"

## Barra inferior (fondo #FAFAFA, borde superior 1px)
Tres bloques en 11px gris separados por espacios:
- "ESTRATIFICACIÓN: Jenks Natural Breaks (k=4)"
- "ERROR ESTÁNDAR: ± 1.24 pp"
- "CORTE DE PADRÓN: 31/ENE/2024"
- A la derecha: ícono check + "Modelo evaluado con validación cruzada"

## Comportamiento
- Clic en una fila navega a /seccion/:id
- Columnas ordenables (clic en el header)
- Al hacer hover sobre una fila: fondo #F9FAFB

## Hook
usePriorizacion() con TanStack Query.