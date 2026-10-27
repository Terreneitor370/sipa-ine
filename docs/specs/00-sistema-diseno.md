# Sistema de diseño SIPA-INE

## Paleta de colores

### Niveles de riesgo (obligatorios)
| Nivel | Hex | Uso |
|-------|-----|-----|
| Muy Alto | #B2182B | Rojo profundo |
| Alto | #EF8A62 | Naranja coral |
| Medio | #FDDBC7 | Durazno claro |
| Bajo | #67A9CF | Azul medio |

### Interfaz
| Uso | Hex |
|-----|-----|
| Fondo app | #FAFAFA |
| Fondo cards | #FFFFFF |
| Bordes | #D1D5DB |
| Bordes internos | #E5E7EB |
| Texto principal | #111827 |
| Texto secundario | #6B7280 |
| Header tabla | #F3F4F6 |
| Acento/botón | #d5007f (rosa mexicano INE) |
| Sidebar | #950054 (vino INE) |
| Etiqueta SUPUESTO | fondo #FEF3C7, texto #92400E |

## Tipografía
- Fuente: IBM Plex Sans (Google Fonts)
- Cuerpo: 13px
- Labels: 11px uppercase #6B7280
- Encabezados de página: 16px semibold
- Números destacados: 32px máximo

## Reglas de estilo (NO NEGOCIABLES)
1. CERO sombras. Todo separado por borde 1px #D1D5DB.
2. Radio de esquinas: máximo 2px (rounded-sm en Tailwind).
3. CERO gradientes.
4. Íconos: 14px, color #6B7280, Lucide React.
5. Filas de tabla: 32px de alto (h-8).
6. Padding de cards: 12px (p-3).
7. Densidad alta, poco aire.
8. Estilo govtech, no startup.

## Clases Tailwind base
- Card: `bg-white border border-[#D1D5DB] rounded-sm p-3`
- Fondo app: `bg-[#FAFAFA]`
- Texto cuerpo: `text-[13px] text-[#111827]`
- Label: `text-[11px] uppercase text-[#6B7280] tracking-wide`
- Botón primario: `bg-[#0F4C81] text-white text-[13px] font-semibold px-3 h-8 rounded-sm`
- Botón secundario: `bg-white border border-[#D1D5DB] text-[#6B7280] text-[12px] px-3 h-8 rounded-sm`
- Fila tabla: `h-8 border-b border-[#E5E7EB] text-[13px]`
- Header tabla: `bg-[#F3F4F6] text-[11px] uppercase text-[#6B7280] h-8`

## Layout global
- Sidebar: 220px, bg-[#1F2937], texto blanco
- Header: 48px, bg-white, border-b border-[#D1D5DB]
- Footer: 32px con disclaimer legal
- Área principal: bg-[#FAFAFA]

## Disclaimer legal (footer de TODAS las páginas)
"Estimaciones de un modelo estadístico con fines de planeación; no son predicciones exactas."

## Idioma
Todo el contenido de la UI en español (México).