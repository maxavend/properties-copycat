# Logo de Properties Copycat

**Origen y copia.** La instancia de origen asoma detrás y la copia llega llena, cargada de sus propiedades. El símbolo se construye con el diamante de instancia de Figma, así que se reconoce dentro de Figma sin imitar su logo. El degradado de la copia parte del violeta del origen para mostrar que las propiedades pasan de una instancia a otra.

El símbolo tiene dos versiones:

- **Plano** (`logo/`): es la versión maestra. Se usa en tamaños chicos, en un color, en impresión y junto al nombre.
- **Liquid Glass** (`glass/`): es la versión con volumen para el ícono del plugin y la portada. La instancia de origen es un anillo de vidrio violeta y la copia es un vidrio translúcido que deja ver el anillo detrás. Figma muestra los íconos de plugins como imágenes planas, así que los brillos y las sombras ya están incluidos en el archivo; no los aplica ningún sistema.

## Archivos

| Archivo | Uso |
|---|---|
| `glass/glass-icon-dark.svg` / `.png` | Ícono del plugin (fondo tinta). Es la fuente de `publish/icon.svg`. |
| `glass/glass-icon-light.svg` / `.png` | Ícono en fondo claro, como alternativa. |
| `glass/glass-symbol.svg` / `.png` | Símbolo de vidrio sin fondo. Es la fuente de `publish/logo.svg` y se usa en la portada. |
| `logo/symbol.svg` | Símbolo plano a color, con degradado. |
| `logo/symbol-flat.svg` | Símbolo plano sin degradado, para impresión o cuando no se puede usar degradado. |
| `logo/symbol-small.svg` | Versión para 32 px o menos: trazo y separación más gruesos. |
| `logo/horizontal*.svg` | Lockup horizontal: a color, sobre oscuro, negro y blanco. |
| `logo/stacked*.svg` | Lockup apilado, en las mismas cuatro versiones. |
| `variants/` | Un color (negro, blanco, violeta), versión cuadrada, favicons (`.ico`, `.svg`, PNG) e íconos de 192 y 512 px. |
| `presentation/board.html` | Presentación con mockups. En `slides/` están las mismas láminas en PNG. |
| `palette.json` | Colores. |
| `src/` | Generadores (`brand.py`, `glass.py`, `text2path.py`). |

## Colores

| Nombre | HEX | RGB | Uso |
|---|---|---|---|
| Violeta instancia | `#9747FF` | 151 71 255 | El origen. También sirve como color único de la marca. |
| Rosa copia | `#FF4F9A` | 255 79 154 | La copia. |
| Naranja | `#FF8A3D` | 255 138 61 | Final del degradado de la copia. |
| Inicio del degradado | `#C04BFF` | 192 75 255 | Comienzo del degradado de la copia. |
| Tinta | `#17112B` | 23 17 43 | Nombre y fondos oscuros. |
| Lila | `#F3EDFF` | 243 237 255 | Fondos claros. |

El degradado de la copia va en diagonal, de la esquina superior izquierda a la inferior derecha: `#C04BFF` → `#FF4F9A` (55 %) → `#FF8A3D`. No hay equivalencias CMYK ni Pantone, porque la marca es solo digital. Si algún día se imprime, conviene ajustarlas con una prueba de color.

## Tipografía

El nombre usa **Inter SemiBold** (peso 600, tamaño óptico display) con un tracking de −1,2 %. Inter es la tipografía de la interfaz de Figma y tiene licencia SIL Open Font License, que permite usarla en un logo. En los lockups el texto ya está convertido en trazos, así que no hace falta tener la fuente instalada.

## Espacio libre y tamaños mínimos

- **Unidad x**: el grosor del trazo del origen, que mide cerca del 13 % de la altura del símbolo. Alrededor del símbolo y de los lockups hay que dejar al menos **2x** libre.
- En el lockup horizontal, el nombre tiene una altura de mayúscula igual a la mitad de la altura del símbolo. La separación entre ambos es igual a la media diagonal de la copia. No cambies estas proporciones.

| Pieza | Mínimo |
|---|---|
| Símbolo plano | 16 px. Entre 16 y 32 px usa `symbol-small.svg`. |
| Ícono Liquid Glass | 48 px. Por debajo usa el símbolo plano. |
| Lockup horizontal | 160 px de ancho. |
| Lockup apilado | 96 px de ancho. |

## Fondos

- Blanco, lila o gris claro: usa el símbolo a color y el nombre en tinta.
- Tinta o casi negro: usa el símbolo a color y el nombre en blanco (`*-on-dark.svg`), o el ícono de vidrio.
- Sobre violeta u otro color fuerte, o sobre fotos: usa la versión blanca. El símbolo a color se pierde sobre el violeta.

## Qué no hacer

- Separar el origen de la copia, invertir su orden o cambiar el espacio entre ellos.
- Usar el degradado en el origen o el violeta plano en la copia, porque se pierde la idea de que las propiedades pasan de una a otra.
- Agregar resplandor, contornos o sombras a la versión plana. El volumen es solo de la versión Liquid Glass.
- Usar la versión de vidrio a menos de 48 px o en un solo color.
- Rotar, deformar o cambiar la tipografía del nombre.

## Regenerar

Los SVG de este directorio son la fuente. Solo hace falta usar los scripts para cambiar la geometría o los colores.

1. Crea un entorno con `fonttools`, `brotli` y `uharfbuzz`.
2. Guarda Inter variable como `src/inter-opsz.ttf`. Se puede convertir desde el `.woff2` de `@fontsource-variable/inter` con fontTools.
3. Ejecuta:

```bash
python publish/brand/src/glass.py publish/brand/out
```

`glass.py` también ejecuta `brand.py`. Después copia las piezas que cambiaron y ejecuta `npm run listing` para actualizar `publish/icon.png` y `publish/cover.png`.

> Antes de publicar, haz una búsqueda de marcas registradas y una búsqueda inversa de imágenes. Ninguna de las dos se ha hecho todavía.
