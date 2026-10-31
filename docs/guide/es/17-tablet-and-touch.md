---
title: Tableta y pantalla táctil
summary: Trabajar con los dedos o con un lápiz: seleccionar varios cuerpos, girar la vista y hacer zoom, el menú de la pulsación larga y lo que conviene saber en un iPad.
---

## Dedos y lápiz

layerling funciona en el navegador de una tableta, y también como aplicación desde su pantalla de inicio. Un dedo hace lo mismo que el botón izquierdo del ratón. Para tres cosas que una tableta no tiene —un botón derecho, una tecla Mayús y una rueda— hay una forma propia de hacerlo:

| Quieres… | En una tableta |
| --- | --- |
| Seleccionar un cuerpo | Tócalo. |
| Seleccionar varios cuerpos | Mantén un dedo quieto medio segundo, elige {{ui:contextMenu.selectMultiple}} y toca un cuerpo tras otro. Un toque en un cuerpo ya seleccionado lo vuelve a quitar. |
| Seleccionar todos los cuerpos | Mantén un dedo quieto medio segundo sobre un espacio vacío y elige {{ui:contextMenu.selectAll}}. |
| Abrir el menú del clic derecho | Mantén un dedo quieto medio segundo sobre un cuerpo o sobre un espacio vacío. |
| Mover un cuerpo | Arrástralo. |
| Cambiar el tamaño de un cuerpo, girarlo o elevarlo | Arrastra sus tiradores, los cuadraditos y las flechas que lo rodean. Un dedo los coge aunque lo pongas un poco al lado. |
| Girar la vista | Pasa un dedo por un espacio vacío, o arrastra el cubo de vista. |
| Hacer zoom | Dos dedos: sepáralos para acercarte y pellizca para alejarte. |
| Desplazar la vista | Desliza dos dedos juntos. |
| Quitar la selección | Toca un espacio vacío. No funciona mientras {{ui:camera.touchRotate}} está activado, porque entonces un dedo gira la vista; y en el modo {{ui:contextMenu.selectMultiple}}, el primer toque en un espacio vacío solo termina el modo y deja la selección como está, y el siguiente la quita. |

## Seleccionar varios cuerpos

Sin tecla Mayús, {{ui:contextMenu.selectMultiple}}, en el menú de la pulsación larga, hace lo mismo que Mayús+clic en un ordenador. Mientras está activo, un mensaje lo indica, y cada toque sobre un cuerpo lo añade a la selección o lo vuelve a quitar. Un toque en un espacio vacío, o [[Esc]] si tienes teclado, lo termina y deja la selección como está. Mientras tanto, un dedo sobre un espacio vacío sigue girando la vista. Después, {{ui:editor.tool.group}}, {{ui:editor.tool.align}} o un movimiento actúan sobre todos los cuerpos que hayas elegido.

El mismo menú tiene {{ui:contextMenu.carry}}, que hace en la pantalla táctil lo que la tecla [[C]]. La selección sigue entonces al dedo por las caras de otros cuerpos; un toque la deja sobre la cara que tocas, aunque sea inclinada, y basta con el primer toque. La entrada del menú también aparece si buscas «posar» o «cruise» en la búsqueda de comandos ([[Ctrl]]+[[K]] con teclado).

## Girar la vista y hacer zoom

Un dedo sobre un espacio vacío gira la vista; dos dedos hacen zoom y la desplazan. Un dedo que empieza sobre un cuerpo trabaja en el cuerpo, no en la vista. Si prefieres que gire la vista, activa {{ui:camera.touchRotate}} en la barra de vista: entonces un dedo gira la vista en lugar de seleccionar, empiece donde empiece. Ese interruptor solo aparece en dispositivos con pantalla táctil.

El cubo de vista de arriba a la izquierda gira la vista cuando lo arrastras, y un toque en una de sus caras, esquinas o aristas salta a esa vista. Consulta [Vista y plano de trabajo](chapter:view-and-workplane).

## Tiradores, puntos pequeños y lápiz

La yema del dedo tapa aquello a lo que apunta. layerling deja que un dedo alcance tiradores, puntos, líneas y aristas desde un poco más lejos que el puntero del ratón, pero un lápiz es más fino. Esto vale para un lápiz que la tableta reconoce como tal, como un Apple Pencil o un S Pen. Un lápiz sencillo con punta de goma cuenta para la pantalla como un dedo y no es más fino que uno, así que trabaja con él como con el dedo. En un iPad, un Apple Pencil que se mantiene sobre la pantalla sin tocarla también muestra al cabo de un momento el nombre de un control en una pequeña burbuja, igual que el puntero del ratón muestra una etiqueta emergente.

Si los cuerpos se desplazan sin querer cuando los tocan niños o manos con prisa, activa {{ui:workspace.selectBeforeMoving}} en los ajustes: con este ajuste, primero hay que seleccionar un cuerpo, y solo el siguiente arrastre lo mueve.

## En un iPad o un iPhone

- **Instálalo como aplicación.** En Safari, toca el icono de Compartir y elige «Añadir a pantalla de inicio». La aplicación se abre en una ventana propia sin barra de direcciones y funciona sin conexión; consulta [Sin conexión e instalación](chapter:offline-and-install).
- **Tus diseños viven en el navegador.** No hay cuenta y no se sube nada. Safari tiene una norma propia contra el rastreo: borra lo que una web ha guardado después de siete días en los que no la hayas visitado en Safari. Una aplicación web añadida a la pantalla de inicio está exenta de esa norma, según la documentación de WebKit. Es un motivo más para usar la aplicación desde la pantalla de inicio y para hacer copias de seguridad de lo importante: {{ui:dashboard.backupAll}}, en la página de inicio, mete todos los diseños en un solo archivo.
- **Archivos.** Safari solo deja que una página escriba en un archivo mediante una descarga, así que {{ui:editor.export}} pone el archivo en Descargas, en la aplicación Archivos, y [[Ctrl]]+[[S]] con teclado lo vuelve a descargar; consulta [Archivos y guardado](chapter:files-and-saving).
- **No hace falta teclado.** Cada herramienta tiene un botón en la cinta, y un campo numérico abre el teclado en pantalla. Con un teclado conectado al iPad tienes además los [atajos de teclado](chapter:shortcuts). Un recuadro de valor junto a un cuerpo abre su campo numérico con el segundo toque: el primero solo lo marca, así un dedo que cae allí por error no hace aparecer el teclado.

## Talleres con niños

Aquí los dedos y los lápices con punta de goma funcionan igual. Dos ajustes facilitan una clase: {{ui:workspace.selectBeforeMoving}}, para que un toque no mueva un cuerpo sin querer, y {{ui:camera.touchRotate}}, para que un dedo siempre gire la vista. El botón del signo de interrogación, en el grupo Ayuda de la cinta, activa la {{ui:interactiveHelp.title}}: a partir de ahí, un toque en cualquier botón, campo o tirador lo explica, y el mismo botón, o [[Esc]], la desactiva.

Para toda una clase, activa {{ui:workspace.simpleMode}} en los ajustes. La cinta se queda entonces solo con las herramientas que usa un taller (copiar, pegar, duplicar, eliminar, deshacer, agrupar, reflejar, chaflán, redondeo, vaciar, alinear, exportar), la biblioteca de formas con una lista corta, los botones se hacen más grandes y la página de inicio muestra los diseños y nada más: ni novedades, ni texto de bienvenida, ni botones de ayuda, ni enlaces que salgan de layerling. Activarlo es un toque; desactivarlo, mantener pulsado dos segundos el botón que aparece en su lugar. Un enlace que termina en `?mode=simple` lo activa en el dispositivo que lo abre, y `?mode=full` lo vuelve a desactivar. Quien tenga layerling en un servidor puede hacer que todos empiecen así con `LAYERLING_SIMPLE_MODE=true`, o fijarlo para todos con `always`, de modo que el programa no ofrezca forma de salir; lo explica el README.
