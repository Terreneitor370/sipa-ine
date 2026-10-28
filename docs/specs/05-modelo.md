# Especificación: Página Panel del Modelo (/modelo)

## Estructura general
- Breadcrumb: "SIPA-INE / Especificación y Validación del Modelo Predictivo"
- Header de metadatos
- Fila media: dos cards lado a lado (Métricas | Importancia)
- Fila inferior: dos cards lado a lado (Fuentes | Limitaciones)

## Header de metadatos (32px, bg #FAFAFA, border-b)
- Izquierda: "Versión activa: 1.2.0 (Gradient Boosting Regressor)" 
  en 13px semibold + badge "REG. PRODUCTION. RELEASE" en rectángulo 
  plano #6B7280, texto blanco 10px, rounded-sm
- Derecha: "Fecha de entrenamiento: octubre 2026" en 11px gris + 
  badge "REG. PRODUCTION. RELEASE" (mismo estilo) + "HASH: 4b9e28f" 
  en 11px monospace gris

## Card izquierda: Métricas vs Baseline
- Título + subtítulo "Target: abstención_sección_pct" a la derecha
- Texto 12px gris: "Evaluación comparativa contra estimador inercial 
  univariado bajo partición temporal out-of-time (OOT 2024)."
- Tabla HTML clásica, bordes 1px #E5E7EB, header #F3F4F6 11px 
  uppercase gris, filas 32px:
  | MÉTRICA | MODELO (V1.2) | BASELINE (INERCIAL) | MEJORA |
  | RMSE (Error Cuadrático Medio) | 4.21 pp | 4.89 pp | -13.9% meta ≥10% |
  | MAE (Error Absoluto Medio) | 3.15 pp | 3.72 pp | -15.3% |
  | R² (Coeficiente de Determinación) | 0.412 | — | — |
  La columna MEJORA: valor en #0F4C81 semibold + texto "meta ≥10%" 
  al lado en 10px gris. SIN íconos verdes.
- Al fondo en 11px gris italic: "Muestra n = 68,432 secciones 
  electorales ordinarias · K-Fold Temporal CV (k=5)"

## Card derecha: Importancia global de variables (gain)
- Título + "Norm. Σ = 1.00" a la derecha en 11px gris
- 8 barras horizontales SÓLIDAS #0F4C81 sobre fondo #F3F4F6, 
  filas de 22px. Etiqueta a la izquierda en 12px monospace, 
  valor a la derecha en 12px tabular:
  | abst_lag_mismo_tipo | 0.28 |
  | electores_por_casilla | 0.21 |
  | abst_lag1 | 0.17 |
  | dist_mac_km | 0.11 |
  | marginacion | 0.09 |
  | delta_abst | 0.07 |
  | pct_viv_internet | 0.04 |
  | escolaridad | 0.03 |
- Al fondo en 10px gris: "Métrica: Split Gain ponderado por cobertura | 
  k_trees=450 | l1=0.04"

## Card inferior izquierda: Fuentes de datos
- Título + "Catálogo Oficial INE-INEGI-CONAPO" a la derecha en 11px gris
- Texto introductorio 12px gris: "Registros administrativos, 
  cartografía vectorial y microdatos censales integrados a nivel 
  sección electoral."
- 6 viñetas cuadradas pequeñas (3x3px #6B7280) en 13px:
  • INE Cómputos distritales 2018-2024
  • INE Padrón y lista nominal
  • INE Marco Geográfico Electoral
  • INE Directorio de MAC (Módulos de Atención Ciudadana)
  • INEGI Censo de Población y Vivienda 2020
  • CONAPO Índice de Marginación 2020
- Al fondo en 10px gris: "Corteo de integridad vectorial: GeoJSON / 
  Shapefile | SRCID: 6362 (EPSG:MEXICO_ITRF2008)"

## Card inferior derecha: Limitaciones metodológicas
- Título + "Alcances y Restricciones" a la derecha en 11px gris
- Texto introductorio 12px gris: "Criterios de validez inferencial y 
  supuestos operacionales del modelo predictivo supervisado:"
- 4 viñetas cuadradas en 13px gris:
  • Entrenamiento 2018-2021, prueba 2024
  • Correlación no implica causalidad en las intervenciones
  • Excluye secciones con reseccionamiento distrital reciente
  • Sólo datos agregados por sección, sin datos personales ni 
    en cuestas
- Al fondo en 10px gris: "Gobernanza del Dato: Clasificación Reservada 
  Operativa | Art. 113 LFTAIP"

## Footer
"Actualización de capas: Diaria vía pipeline institucional | 
CRAN / GDAL v3.8 | Dictamen: Aprobado por el Comité Técnico Asesor | 
CTA-SIPA/2026/04"
A la derecha: "SECCIÓN_REF_ACTUAL: ORD-NAL-2026"

## Hook
useModelo() con TanStack Query.