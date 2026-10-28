# Especificación: Página Ficha de Sección (/seccion/:id)

## Estructura general
- Breadcrumb: "SIPA-INE / Mapa de Riesgo / Sección 1234 · Hermosillo, Sonora"
- Header con:
  - Link "← Volver al mapa" en 12px gris a la izquierda
  - Título "Sección 1234 · Hermosillo, Sonora" en 16px semibold
  - Badge "DF 04 · SECC 1234" en rectángulo plano gris
  - A la derecha en 11px gris: "Corte Geoestadístico: 15 Ene 2025 | 
    AUDITORÍA VALIDADOR: A-942"
- Fila superior: dos cards lado a lado (Predicción | Indicadores)
- Fila media: dos cards lado a lado (Histórico | Top 5 SHAP)
- Fila inferior: barra de metadatos + botones secundarios

## Card izquierda superior: PREDICCIÓN 2027
- Label "PREDICCIÓN 2027" en 11px uppercase gris
- A la derecha: "Modelo: XGBoost v2.4" en 10px gris
- Número "54.3%" en 32px semibold #111827 alineado a la izquierda
- Al lado del número: badge "ALTO" en #EF8A62, texto blanco 11px 
  uppercase, rounded-sm, padding 4x8px
- Debajo en 12px gris: "Probabilidad estimada de abstención para la 
  elección concurrente intermedia 2027 en esta casilla y distrito."
- Bloque "INTERVALO DE CREDIBILIDAD BAYESIANA (P10 - P90)":
  - Label en 11px uppercase gris
  - A la derecha: "Amplitud: 9.1 pp" en 10px gris italic
  - LÍNEA horizontal fina de 1px #6B7280 con 2 marcas verticales 
    (ticks) en los extremos. NO barra rellena. NO gradiente.
  - Etiquetas debajo: "49.8% (P10)" | "54.3% (Media)" | "58.9% (P90)"
    en 11px gris, distribuidas equitativamente

## Card derecha superior: INDICADORES OPERATIVOS SECCIONALES
- Título + a la derecha link "Ver fuente de datos (DERFE) ↗" en 11px 
  color #0F4C81
- Tabla clave-valor de 6 filas en 13px, bordes internos 1px #E5E7EB:
  | Lista nominal | 12,450 electores |
  | Casillas | 18 (1 Básica + 17 Contiguas) |
  | Electores por casilla | 692 |
  | Distancia MAC | 3.2 km |
  | Marginación CONAPO | Media (Estrato 3) |
  | % Viviendas con internet | 38% (Censo INEGI) |
- Números alineados a la derecha con tabular-nums

## Card izquierda media: HISTÓRICO DE ABSTENCIÓN (2018-2027)
- Título + a la derecha leyenda: "— Real | --- Proyección" en 11px
- Recharts LineChart:
  - Grid horizontal 1px #E5E7EB
  - Eje Y de 45% a 60%, etiquetas 11px gris
  - Línea #0F4C81 de 1.5px con puntos 4px sólidos (sin borde blanco)
  - Datos: 2018 (48.2%), 2021 (53.5%), 2024 (50.3%), 2027 (54.3%)
  - Tramo 2024-2027 con línea punteada gris
  - Etiquetas bajo el eje: Presid. 2018 / Interm. 2021 / Presid. 2024 / 
    Interm. 2027 (Est.)
  - Etiquetas sobre los puntos: 48.2%, 53.5%, 50.3%, 54.3% en 10px gris
- Al fondo en 10px gris italic: "Comportamiento electoral registrado en 
  actas de escrutinio DERFE. | Nivel de confianza: 95%"

## Card derecha media: ¿POR QUÉ ESTE RIESGO? TOP 5 FACTORES SHAP
- Título + a la derecha "Explicabilidad Local (KernelSHAP)" en 10px gris
- Texto introductorio en 11px gris: "Contribución marginal de atributos 
  socio-electorales sobre el signo de abstención respecto a la media 
  distrital (+44.1%)."
- Barras horizontales SÓLIDAS (sin gradiente) sobre fondo #F3F4F6, 
  filas de 24px:
  Positivas en #B2182B:
  - Electores/casilla | +4.2 pp
  - Abstención intermedia previa | +3.1 pp
  - Distancia MAC | +2.3 pp
  - Marginación | +1.4 pp
  - % sin internet | +0.8 pp
  Negativas en #67A9CF (separar con línea 1px #E5E7EB):
  - Escolaridad | -0.9 pp
- Etiqueta a la izquierda en 12px, valor a la derecha en 12px semibold
- Al fondo leyenda: cuadro rojo "Aumenta abstención" | cuadro azul 
  "Disminuye abstención" | "Baseline E[f(x)] = 44.1%" en 10px gris

## Fila inferior
Barra en 11px gris sobre fondo #FAFAFA con borde superior 1px:
"Estatus de Validación: Conforme a Marco Geoestadístico 2024 | 
Distrito Federal: 04 (Hermosillo) | Tipo de Casilla Predominante: 
Urbana Básica"
A la derecha: dos botones secundarios (bg-white, borde 1px #D1D5DB, 
texto gris 12px, rounded-sm, ícono 14px):
- "Descargar Ficha PDF"
- "Exportar Datos SHAP (CSV)"

## Hooks
useSeccion(id) y useExplicacion(id) con TanStack Query.