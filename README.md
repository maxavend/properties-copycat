# Properties Copycat

Plugin de Figma que copia la configuración de una instancia y la pega en otras instancias del mismo componente.

## Qué copia

Recorre la instancia completa, incluidas las instancias anidadas, y guarda:

- **Propiedades de componente**: variantes, booleanos, textos e instance swap (también las enlazadas a variables).
- **Textos**: contenido, estilo de texto, color o estilo de color, tipografía y tamaño (cuando no hay estilo), alineación y auto-resize.
- **Auto layout**: dirección, alineación, paddings, espaciado, sizing (hug/fixed), `layoutAlign` y `layoutGrow`.
- **Variables (tokens)**: campos numéricos y de visibilidad, variables de color en rellenos y bordes, y variables de tipografía en textos sin estilo.

## Uso

1. Selecciona **una** instancia y pulsa **Copy**.
2. Selecciona una o varias instancias de destino y pulsa **Paste**.

Las capas se emparejan por tipo y nombre, así que el orden de las capas no importa. Las instancias de otro componente se omiten. Si algo no se pudo aplicar, el panel **Warnings** lo detalla. La interfaz del plugin está en inglés.

## Limitaciones

- Los textos con varias fuentes o estilos en el origen solo copian lo que es común a todo el texto.
- Una instancia anidada cambiada a mano (sin propiedad de instance swap) tiene otro nombre en el destino y no se empareja.
- No se copian efectos ni layout grids.

## Desarrollo

Requiere Node.js.

```bash
npm install
```

```bash
npm run build
```

```bash
npm run lint
```

- `code.ts` es la lógica del plugin y se compila a `code.js`.
- La interfaz está en `ui/` (`index.html`, `main.js`, `styles.css`) y usa los web components `fig-*` de [FigUI3](https://github.com/rogie/figui3) (núcleo MIT). Vite + `vite-plugin-singlefile` la empaqueta en un solo archivo, `dist/ui.html`, como exige Figma.
- `ui/icons.js` contiene íconos oficiales de Figma extraídos de `@create-figma-plugin/ui`. Para regenerarlo usa `npm run icons`.
- `npm run watch` recompila el código y la UI en cada cambio.

En Figma: *Plugins → Development → Import plugin from manifest…* y elige `manifest.json`. Hay que ejecutar `npm run build` antes, porque `code.js` y `dist/` no se versionan.

## Publicar en Figma Community

```bash
npm run release
```

Compila, pasa el lint y revisa que el plugin esté listo: manifest, build actualizado, sin recursos externos, avisos de licencia e imágenes de la ficha. Los textos, las imágenes y la prueba manual para el formulario de Figma están en [publish/LISTING.md](publish/LISTING.md).

Las imágenes (`publish/icon.png`, `publish/cover.png` y `publish/carousel-*.png`) se generan desde `publish/src/` con `npm run listing`, que usa Chrome. Están en inglés, como el plugin.

El logo, sus variantes y la guía de uso están en [publish/brand/](publish/brand/README.md). `publish/icon.svg` y `publish/logo.svg` son copias de `publish/brand/glass/glass-icon-dark.svg` y `glass-symbol.svg`.

## Licencias

El plugin es MIT ([LICENSE](LICENSE)). La interfaz incluye código de terceros con licencia MIT, detallado en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); esos avisos también van dentro de `dist/ui.html`.
