# Ficha para Figma Community

Textos e imágenes listos para el formulario **Plugins → Manage plugins → Publish** de Figma desktop.

## Antes de publicar

1. Ejecuta `npm run release`. Compila, pasa el lint y revisa el manifest, el build, que no haya recursos externos, los avisos de licencia y las imágenes. Tiene que terminar con "Listo para publicar".
2. Prueba el plugin en Figma desktop con la lista de [Prueba manual](#prueba-manual).
3. Activa la verificación en dos pasos de tu cuenta de Figma; es obligatoria para publicar.
4. El `id` de `manifest.json` (`1600155551653803125`) tiene que ser el del plugin registrado en tu cuenta. Si Figma no lo reconoce, crea el plugin desde *Plugins → Development → New plugin…* y copia el id nuevo.

## Describe your resource

**Name:** Properties Copycat

**Tagline (ES):** Copia la configuración de una instancia y pégala en otras del mismo componente.

**Tagline (EN):** Copy an instance's setup and paste it onto other instances of the same component.

**Category:** Design tools

**Description (ES):**

> Configura una instancia una vez y replica esa configuración en todas las que necesites.
>
> Selecciona una instancia y pulsa **Copy**. Después selecciona una o varias instancias del mismo componente y pulsa **Paste**. Properties Copycat recorre toda la instancia, incluidas las instancias anidadas, y aplica:
>
> • Propiedades de componente: variantes, booleanos, textos e instance swap.
> • Textos: contenido, estilo de texto, color, alineación y auto-resize.
> • Auto layout: dirección, alineación, padding, espaciado y tamaño (hug/fixed).
> • Variables: espaciados, radios, tamaños, opacidad y colores de relleno y borde.
>
> Las capas se emparejan por nombre, así que el orden no importa. Las instancias de otro componente se omiten, y el panel **Warnings** explica lo que no se pudo aplicar.
>
> No copia efectos ni layout grids. El plugin no se conecta a internet ni guarda datos fuera del archivo. La interfaz está en inglés.
>
> Documentación: https://github.com/maxavend/properties-copycat#readme

**Description (EN):**

> Set up one instance and replicate that setup on as many instances as you need.
>
> Select an instance and click **Copy**. Then select one or more instances of the same component and click **Paste**. Properties Copycat walks the whole instance, nested instances included, and applies:
>
> • Component properties: variants, booleans, text and instance swap.
> • Text: content, text style, color, alignment and auto-resize.
> • Auto layout: direction, alignment, padding, spacing and sizing (hug/fixed).
> • Variables: spacing, radius, size, opacity, and fill and stroke colors.
>
> Layers are matched by name, so their order doesn't matter. Instances of a different component are skipped, and the **Warnings** panel explains anything that couldn't be applied.
>
> Effects and layout grids are not copied. The plugin never connects to the internet or stores data outside the file.
>
> Documentation: https://github.com/maxavend/properties-copycat#readme

## Images

- **Icon:** `publish/icon.png` (128 × 128).
- **Thumbnail:** `publish/cover.png` (1920 × 1080).
- **Carousel:** ocho imágenes de 1920 × 1080, en este orden (la portada va primero como thumbnail):
  1. `publish/carousel-1.png`: cómo funciona.
  2. `publish/carousel-2.png`: qué copia.
  3. `publish/carousel-3.png`: propiedades de componente.
  4. `publish/carousel-4.png`: textos.
  5. `publish/carousel-5.png`: auto layout.
  6. `publish/carousel-6.png`: variables.
  7. `publish/carousel-7.png`: instancias anidadas y avisos.
  8. `publish/carousel-8.png`: cierre, con el ícono y dónde encontrar el plugin.

Las fuentes de las imágenes están en `publish/src/`. Para regenerarlas usa `npm run build` y después `npm run listing`.

## Data security (opcional)

Respuestas sugeridas para el formulario de seguridad:

- **¿Envía datos fuera de Figma?** No. `networkAccess` es `none` y la interfaz no carga recursos externos.
- **¿Qué datos del archivo usa?** Solo la selección actual: propiedades de componente, textos, auto layout y variables de las instancias seleccionadas.
- **¿Guarda datos?** No. Lo copiado vive en memoria mientras el plugin está abierto y se pierde al cerrarlo. No usa `clientStorage` ni guarda datos en el archivo.
- **¿Requiere cuenta, pago o servicios de terceros?** No.

## Add the final details

- **Support contact:** por ejemplo, https://github.com/maxavend/properties-copycat/issues o el correo que prefieras.
- **Network access:** aparecerá como *No access*, porque `manifest.json` declara `allowedDomains: ["none"]`.
- **Comments:** a tu elección.

## Prueba manual

Hazla en Figma desktop, importando el plugin desde *Plugins → Development → Import plugin from manifest…* después de `npm run build`.

- [ ] Abre el plugin en tema claro y en tema oscuro: se ve bien y sin colores raros.
- [ ] Sin selección, **Copy** muestra "Select exactly one instance." y el botón vuelve a habilitarse.
- [ ] Copia una instancia con variantes, booleanos, texto e instance swap: la lista muestra las instancias.
- [ ] Pega en otra variante del mismo componente: se aplican propiedades, textos (con estilo y color), auto layout y variables.
- [ ] Pega en varias instancias a la vez: la barra de progreso avanza y termina.
- [ ] Pega en una instancia de otro componente: se omite y aparece en **Warnings**.
- [ ] Prueba con componentes, estilos y variables de una librería, habilitada y deshabilitada.
- [ ] Deshacer (Cmd/Ctrl+Z) revierte el pegado.
- [ ] Todo se puede usar con el teclado (Tab, Enter, Espacio).
