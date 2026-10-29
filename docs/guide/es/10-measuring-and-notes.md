---
title: Medidas y notas
summary: Cinta métrica, regla y escuadra, distancias al origen, notas que se quedan unidas a una pieza y puntos de referencia a los que se ajustan las cosas.
---

Para construir una pieza con exactitud hay que medir. layerling tiene varias herramientas para ello, y ninguna acaba en una exportación. El grosor de las paredes y las holguras dentro de una pieza se miden mejor en la [vista de sección](chapter:view-and-workplane) con {{ui:camera.sectionMeasure}}.

## La cinta métrica

La cinta métrica está en el extremo inferior de la barra de cámara, en el borde izquierdo ({{ui:camera.tapeTools}}). Mide distancias entre vértices, aristas y caras. Al hacer clic en ella se abren cinco botones. Si tapan lo que quieres medir, arrástralos por el asa de la izquierda a cualquier punto de la zona de trabajo; un doble clic en el asa los devuelve a su sitio:

![La cinta métrica con sus botones: añadir medida, mover los puntos de medida, quitar medida, aristas enteras y eliminar todas las medidas.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Haz clic en un punto, arrastra hasta el siguiente y haz clic en él. La distancia aparece rotulada, con delante los ejes que recorre: X, Y o Z para una recta, XY, XZ o YZ a través de un plano, 3D para los tres. Pasa el puntero sobre el rótulo para ver cuánto abarca la medida en cada eje, y sobre un punto para ver sus coordenadas. Mientras colocas el segundo punto, los ejes, la distancia y lo que abarca en cada eje aparecen junto al puntero. Una medida que queda casi toda detrás de otro cuerpo se atenúa; al pasar el puntero sobre su línea o su rótulo vuelve a verse entera. En una arista o una cara opuesta, el segundo punto se ajusta en ángulo recto con el primero cuando el puntero se acerca, o en cualquier punto de esa arista o cara mientras mantienes pulsada [[Mayús]]. Sobre la misma cara o sobre la zona de trabajo, [[Mayús]] mantiene la medida recta a lo largo del eje principal.
2. **{{ui:camera.moveMeasurement}}:** Agarra los puntos y muévelos; el número se actualiza solo.
3. **{{ui:camera.deleteMeasurement}}:** Después, haz clic en una medida para quitarla. Mientras **{{ui:camera.addMeasurement}}** está activo, si mantienes pulsada [[Mayús]] o [[Ctrl]] ([[Cmd]] en el Mac) y haces clic en un punto o una línea de medida, se elimina al momento sin cambiar de modo.
4. **{{ui:camera.tapeWholeEdges}}:** Un clic en una arista la mide entera; por ejemplo, la longitud de una circunferencia. Con esta opción desactivada, el clic pone un punto en la arista y el segundo punto puede ir en cualquier sitio, así que puedes medir el diámetro o cualquier otra distancia. [[Alt]] invierte la opción durante un clic. En un círculo, el punto opuesto al primero se ajusta cuando el puntero se acerca, y los puntos quedan sobre el círculo real, así que el diámetro sale exacto.
5. **{{ui:camera.deleteAllMeasurements}}:** Quita todas las medidas a la vez. Como no se puede deshacer, layerling te lo pregunta antes; si no hay medidas, no hay nada que hacer.
6. **{{ui:camera.tapeMarkMiddle}}:** En el centro de cada medida hay una pequeña marca redonda con la mitad inferior rellena. Pone un [punto de referencia](#puntos-de-referencia) en el centro de la medida: si has hecho clic en una arista redonda, como el contorno de un orificio, en el centro de ese círculo (también en una malla importada, donde nada más marca el centro de un orificio); en un diámetro o en cualquier medida recta, en su punto medio. Una forma que arrastres se ajusta entonces a ese punto con su centro. Si el punto ya existe, no se crea dos veces. La cinta métrica se ajusta a un punto de referencia igual que a un vértice, así que puedes medir desde el centro de un círculo o desde el punto medio de una línea: márcalo y luego haz clic en el punto.
7. **{{ui:camera.tapeTypeLength}}:** Cuando al menos un extremo de una medida recta está sobre un cuerpo, se puede hacer clic en su número. Escribe una longitud nueva y pulsa [[Intro]]: el cuerpo del segundo punto se mueve a lo largo de la línea medida hasta que la distancia sea exactamente esa, como con la regla de Tinkercad. Si solo está seleccionado el cuerpo del primer punto, se mueve ese. Los puntos de medida siguen en el cuerpo, así que la medida lo acompaña. Mide desde una esquina, una arista o un [punto de referencia](#puntos-de-referencia), como el centro de un círculo, para colocar piezas a una distancia exacta. Una longitud negativa lo lleva esa distancia más allá del primer punto, por ejemplo 5 mm hacia dentro desde el borde de una caja.

[[Esc]] sale del modo de medición.

## La regla

La {{ui:shape.ruler}} la sacas de la biblioteca de formas. Es solo una herramienta de medida: no aparece en ninguna exportación y no se puede agrupar ni cortar. Para cada cuerpo que toque la regla o se solape con ella, muestra su extensión como un número flotante, directamente en la vista. Puedes cambiar ese número ahí mismo y el cuerpo se adapta. El símbolo más flotante crea una copia de la forma medida. Su escala impresa está en milímetros; si cambias la unidad a pulgadas (el interruptor de abajo a la derecha), pasa a pulgadas, con una raya cada dieciseisavo de pulgada y las pulgadas enteras numeradas.

## La escuadra

A veces se mide mejor en ángulo recto. Haz clic en {{ui:camera.cornerRulerTool}} en la barra de cámara y luego en la zona de trabajo. Ahí se coloca una escuadra con dos brazos en ángulo recto y marcas de graduación, como una escuadra de carpintero. Tampoco tiene cuerpo propio. Si haces clic cerca de la esquina de un cuerpo, su esquina se ajusta justo ahí.

La escuadra se apoya en el plano de trabajo. Si este está sobre el lateral de un cuerpo, la escuadra también queda sobre ese lateral; consulta [Vista y plano de trabajo](chapter:view-and-workplane). Así se acota en una pared vertical: coloca el plano de trabajo sobre la pared, pon la escuadra en su esquina superior izquierda y haz clic en el tirador hasta que los brazos apunten a la derecha y hacia abajo.

- **Arrastrar el tirador** la mueve.
- **Un clic corto en el tirador** la gira 90°.
- **La ×** que hay al lado la quita.
- **El botoncito a la izquierda del tirador** cambia desde dónde se mide: desde el exterior de un cuerpo (extremo, un icono con líneas) o desde su centro (punto medio, un punto de mira). Junto a cada número verde hay un pequeño interruptor del mismo tipo que solo cambia ese número: en un cilindro de pie, el centro en los dos brazos y la base en la altura; en uno tumbado, el centro a lo ancho y un extremo a lo largo. Cuando los tres vuelven a coincidir, el botón del tirador muestra el modo común.

Si hay cuerpos junto a uno de los brazos, la escuadra muestra sus medidas automáticamente. Esto solo funciona en la placa base, no en el lateral de un cuerpo. El botón con la flecha bajo el asa de la escuadra lo desactiva, de modo que solo los cuerpos seleccionados muestran sus medidas; se guarda con el diseño.

Cuando seleccionas un cuerpo, la escuadra muestra en verde a qué distancia está de la esquina, a lo largo de los dos brazos y en altura. Haz clic en un número verde para escribir una distancia, y el cuerpo se desplaza exactamente ahí. Con varios cuerpos seleccionados, cuentan como uno solo: se mide su contorno común, y un valor escrito los mueve todos juntos sin cambiar su posición relativa.

Las líneas guía de los números verdes van por el suelo, el plano en el que está la escuadra, hasta el punto que queda debajo o al lado del cuerpo; la altura tiene su propia flecha. El interruptor de cada número está en el marco del número. Los brazos y las marcas son líneas en el espacio: un cuerpo situado delante las tapa, igual que taparía una escuadra de verdad. El ojito que hay debajo del tirador cambia esto: con el ojo tachado, los cuerpos tapan la escuadra (así empieza); con el ojo abierto, la escuadra se ve siempre por encima de todo. Los números de los brazos se atenúan donde hay un cuerpo delante.

Con el punto medio, los números verdes cuentan hasta el centro del cuerpo, también en altura. Así colocas una esfera con su centro exactamente a 15 mm de una arista sin tener que restar el radio. En una pared, colocas así un orificio a 40 mm de la izquierda y a 190 mm de arriba: selecciona el orificio, cambia a punto medio y escribe 40 y 190. Ahí la altura se cuenta desde la pared hacia fuera.

Tanto la cinta métrica como la escuadra se quedan donde están mientras dibujas un boceto y vuelves a la vista 3D. Ninguna de las dos entra en el historial. La escuadra se guarda con el diseño, y también las mediciones de la cinta métrica, en el navegador y en el archivo .lyl: vuelven a estar ahí al abrir el diseño. El botón del ojo entre los botones de la cinta métrica oculta todas las mediciones y las vuelve a mostrar; también se guarda si están ocultas, y al añadir, mover o borrar una medición se muestran primero.

## Distancias al origen y al mover

En los ajustes, en {{ui:workspace.appearance}}, hay dos interruptores para ver medidas en directo:

- {{ui:workspace.showMoveDimensions}} muestra cuánto te desplazas mientras arrastras. También al levantar con la flecha negra sobre un cuerpo; el recorrido aparece en su esquina delantera. Al soltar, haz clic en ese número y escribe la distancia exacta; un valor negativo baja.
- {{ui:workspace.showOriginDimensions}} muestra las distancias de la selección al origen de la placa, también con varios cuerpos seleccionados.

Con {{ui:workspace.dimensionsAlwaysVisible}}, las medidas se ven siempre. Un cuerpo que no está sobre el plano de trabajo muestra también su altura sobre él; haz clic en el número para escribir otra.

Si estorban un momento, pulsa [[Q]]: las medidas y distancias alrededor de la selección desaparecen y la pieza que mueves se ve bien. Otra vez [[Q]] las recupera. Un tirador al que apuntas sigue mostrando su medida.

## Notas

Una nota recoge lo que la geometría no dice: «Este tornillo va 0,3 mm demasiado justo», «falta imprimir la tapa», «medida de Pedro». Coloca una con {{ui:editor.tool.note}} o con la tecla [[N]].

- Si colocas la nota **sobre un cuerpo**, se desplaza con él.
- Si la colocas **al lado**, se queda en el plano de trabajo ({{ui:note.free}}).
- {{ui:note.detach}} suelta del cuerpo una nota unida a él.
- {{ui:editor.tool.group}} incluye en el grupo una nota unida; {{ui:editor.tool.ungroup}} se la pasa a la pieza visible que tenga debajo, aunque sea un grupo interior. Mientras un grupo está abierto con {{ui:group.edit}}, sus notas se mueven con la pieza que tienen debajo y vuelven al grupo con {{ui:group.done}}; si cancelas, vuelven a quedar como estaban.
- Si se elimina su cuerpo, o ya no queda ningún cuerpo visible debajo, la nota se queda donde estaba, sobre el plano de trabajo.
- Arrastrar la chincheta mueve la nota. Un clic en la chincheta pliega la tarjeta y solo queda el número pequeño; otro clic la vuelve a abrir. Un clic en el texto lo edita.
- Mientras escribes, [[Intro]] guarda el texto y [[Esc]] lo deja como estaba antes de empezar; [[Mayús]]+[[Intro]] empieza una línea nueva.
- **En un boceto**, {{ui:editor.tool.note}} (en {{ui:editor.group.manage}}) o [[N]] también colocan una nota, en cualquier lugar del boceto. Todas las notas de un boceto pertenecen a su cuerpo: en la vista 3D se sitúan sobre él, encima de un cuerpo hecho con {{ui:sketch.extrude}} o {{ui:sketch.sweep}} y sobre el perfil dibujado de uno hecho con {{ui:sketch.revolve}}, y se mueven con él. Cuando vuelves a abrir el boceto, muestra las notas del cuerpo, también las colocadas en 3D. En el boceto, {{ui:sketch.undo}} deshace una nota como una línea, y {{ui:sketch.cancel}} descarta lo que hayas cambiado en las notas. [[Mayús]]+[[N]] también aquí muestra u oculta las notas.

Las notas se guardan en el diseño, no aparecen en ninguna exportación y se pueden mostrar u ocultar con {{ui:visibility.notes}} (en {{ui:editor.visibilityOptions}}, la flecha junto al icono del ojo) o con [[Mayús]]+[[N]].

## Puntos de referencia

Un punto de referencia es una simple marca en el espacio, como una raya de lápiz o un punto de trazado en un taller: no pertenece a ningún cuerpo, nunca se imprime y otras cosas se ajustan a él. Haz clic derecho en un cuerpo y elige {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} o {{ui:contextMenu.markMidpoints}}: los puntos aparecen en la cara superior del cuerpo (de toda la selección, si has seleccionado varios). {{ui:contextMenu.markFaceCenter}} pone en cambio uno en el centro de la cara plana sobre la que hiciste clic derecho, en un lateral o en un extremo, por ejemplo. Con un punto de giro fijado, {{ui:contextMenu.markPivot}} pone uno justo encima, para que el centro de otra pieza se ajuste al punto sobre el que gira la selección.

- Arrastra un punto para moverlo, o haz clic en él para ver sus coordenadas y escribir otras; están en la unidad que tengas configurada. Si una tarjeta tapa algo, puedes apartarla arrastrándola por su título, y cada una por separado: las demás se quedan donde están, y un doble clic en el título la devuelve a su sitio. La última tarjeta que has tocado queda delante de las demás. **Eliminar todo** en una tarjeta, o **Eliminar todos los puntos de referencia** en el menú del clic derecho (de un cuerpo o de una zona vacía de la vista 3D), elimina todos los puntos a la vez. {{ui:common.delete}} quita ese punto.
- La cinta métrica también puede marcar un punto: {{ui:camera.tapeMarkMiddle}}, la marca medio rellena en el centro de una medida, pone uno en su centro, por ejemplo en el centro de un orificio redondo. Y mide desde un punto: la cinta se ajusta a los puntos de referencia igual que a los vértices.
- Cuando arrastras una forma, sus aristas y su centro se ajustan a un punto igual que se ajustan a otras formas ({{ui:workspace.objectSnap}}). La escuadra también se ajusta a los puntos.
- Los puntos se guardan en el diseño, no aparecen en ninguna exportación y se muestran u ocultan junto con las notas mediante {{ui:visibility.notes}} ([[Mayús]]+[[N]]).
- Una IA puede marcarlos, listarlos y quitarlos con `layerling_add_reference_points`, `layerling_list_reference_points` y `layerling_remove_reference_points`.

## Imágenes de referencia

Una imagen de referencia es una imagen sobre la que alinear piezas: coloca la foto de una placa de circuito en el fondo de su caja y sitúa encima los separadores, los orificios y los recortes de los conectores. Es una guía, no un cuerpo: nunca se imprime ni se exporta (STL, 3MF, OBJ, STEP, SVG), nunca forma parte de un grupo, un conjunto o un corte, y la estimación de impresión no la cuenta.

- Abre {{ui:editor.import}} y elige {{ui:import.referenceImage}}; después, una imagen PNG, JPG, WebP, GIF o BMP. Se coloca sobre el plano de trabajo (en la placa o en la cara en la que pusiste el plano de trabajo) con 100 mm en su lado más largo y semitransparente.
- Muévela, gírala y cambia su tamaño con sus tiradores como cualquier forma. Un cuerpo situado delante se selecciona primero, así que trabajar encima de ella no agarra la imagen.
- {{ui:referenceImage.seeThrough}} en sus ajustes la difumina desde opaca hasta casi invisible.
- {{ui:referenceImage.calibrate}} le da su tamaño real, como en el boceto: haz clic en dos puntos de la imagen cuya distancia real conozcas (por ejemplo, dos orificios de montaje de la placa) y escribe esa distancia en {{ui:referenceImage.distance}}. La imagen conserva sus proporciones y su centro.
- Bloquéala con el candado de la cabecera de sus ajustes y se quedará en su sitio: los clics la atraviesan hasta la placa. Selecciónala en la lista de objetos para desbloquearla.
- La imagen se guarda una sola vez en el archivo del diseño, por muchas veces que se copie o se deshaga. Una imagen grande hace crecer el archivo en la misma medida; el mensaje al añadirla indica su tamaño.
- Una IA la añade, la mueve, la calibra, la difumina y la bloquea con `layerling_reference_image`.
