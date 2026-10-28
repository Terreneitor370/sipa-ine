# Especificación: Página Simulador (/simulador)

## Estructura general
- Breadcrumb: "SIPA-INE / Simulador de Impacto Territorial / 
  DISTRITO FEDERAL 04 (SONORA)"
- Layout dos columnas 40/60 separadas por línea vertical 1px #D1D5DB

## Columna izquierda: PALANCAS DE INTERVENCIÓN
Card única con borde 1px, padding 12px, bg-white.
Header: "PALANCAS DE INTERVENCIÓN" 13px semibold + texto 11px gris
"Define parámetros geoestadísticos de ajuste para el cálculo predictivo."
A la derecha: badge "MODO: WHAT-IF" en rectángulo plano 10px.

Las 3 palancas separadas por líneas horizontales 1px #E5E7EB:

### Palanca 1: Más casillas
- Label 13px semibold + valor "20%" a la derecha en 13px tabular
- Slider: track 2px #D1D5DB, thumb cuadrado 12x12px #0F4C81, sin sombra
- Escala debajo en 10px gris: "0% (Inercial) — 40% (Máx. permitido)"

### Palanca 2: Módulos móviles MAC
- Label + valor "5 km"
- Mismo estilo slider
- Escala: "1 km (Alta cobertura) — 15 km (Restringido)"

### Palanca 3: Campaña digital
- Label + etiqueta "SUPUESTO" a la derecha en rectángulo #FEF3C7, 
  texto #92400E 10px uppercase, rounded-sm, padding 2x6px
- Dos sliders pequeños en línea:
  - "Efecto: 1.0 pp" (slider)
  - "Cobertura: 50%" (slider)
- Mismo estilo minimalista

### Focalización por nivel de riesgo
- Label 12px
- 4 checkboxes cuadrados nativos en línea horizontal:
  ☑ Muy Alto | ☑ Alto | ☐ Medio | ☐ Bajo

### Municipios focalizados
- Select 13px con opción "Todos los municipios de Sonora"

### Nombre del escenario
- Input 13px con placeholder "Simulación Operativa 2027 v1"

### Botón SIMULAR
- Ancho completo, 36px alto, #0F4C81, texto blanco 13px semibold, 
  rounded-sm, ícono play 14px. SIN gradiente.

### Al fondo de la card
En 10px gris italic: "Última actualización de modelo: 24/Feb/2025 · 
Kernel v2.14.8"

## Columna derecha: RESULTADO
Header: "RESULTADO: PROYECCIÓN DEL ESCENARIO" 13px semibold + texto 
11px gris "Comparativo paramétrico vs. Proyección inicial base 
(Baseline 2027)". A la derecha badge "STATUS: CONVERGIDO" en 
rectángulo plano con borde #6B7280.

### Card resumen (bg #F3F4F6, borde 1px, padding 12px)
Grid de 4 columnas con separadores verticales 1px #D1D5DB:
| SECCIONES AFECTADAS | ABSTENCIÓN A | ABSTENCIÓN B | VOTOS RECUPERABLES EST. |
| 412 | 51.2% | 48.7% | 18,450 |
| 67.3% del total distrital | Línea base sin intervención | 
  -2.5 pp reducción | +44.7 electores/sección |
Label arriba en 10px uppercase gris, número en 20px semibold, 
nota debajo en 10px gris.

### Card COMPARACIÓN POR NIVEL DE RIESGO DE ABSTENCIÓN
Subtítulo: "Distribución de secciones según umbral."
Tabla densa, filas 32px, bordes horizontales 1px #E5E7EB, header 
11px uppercase sobre #F3F4F6:
| NIVEL | ESCENARIO A | ESCENARIO B | Δ VARIACIÓN | IMPACTO RELATIVO |
| ■ MUY ALTO | 160 | 98 | -62 | [barra roja plana] |
| ■ ALTO | 210 | 145 | -65 | [barra roja plana] |
| ■ MEDIO | 178 | 169 | -9 | [barra roja fina] |
| ■ BAJO | 66 | 202 | +136 | [barra azul plana] |
Las barras de IMPACTO RELATIVO son rectángulos sólidos de 4px de 
alto: #B2182B para Δ negativos, #67A9CF para Δ positivos. 
SIN gradiente.

### Card MAPA COMPARATIVO TERRITORIAL A | B
Subtítulo: "DISTRITO 04 — GUAYMAS / HERMOSILLO SUR"
Dos mini-mapas lado a lado separados por línea vertical 1px #D1D5DB:
- IZQ: título "A (INERCIAL)" 10px + badge "164 SECCIONES CRÍTICAS" 
  en #B2182B texto blanco 10px rounded-sm
- DER: título "B (INTERVENCIÓN)" + badge "98 SECCIONES CRÍTICAS" 
  en #67A9CF
- Cada mini-mapa es una versión simplificada del mapa de Sonora con 
  secciones coloreadas según nivel. SIN gradiente de fondo.
- Al fondo: "Concentración: Polígono Periférico" / "Desplazamiento a 
  Riesgo Moderado" + "+66 Secciones en Riesgo Moderado" en 10px gris

### Aviso al fondo
Card con borde izquierdo 3px #F59E0B, fondo #FFFBEB, padding 12px, 
texto 12px #92400E:
"SUPUESTO METODOLÓGICO: el efecto de la campaña digital no se aprende 
de los datos históricos, sino que corresponde a una estimación exógena 
parametrizable sujeta a calibración empírica en comisiones distritales."

### Footer de la columna
"ID Simulación: SIM-2027-D04-0048 | Hash: 5f4e2b8..." en 10px gris.

## Hook
useSimulacion() con mutation POST /simulaciones.