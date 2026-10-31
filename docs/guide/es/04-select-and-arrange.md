---
title: Seleccionar y organizar
summary: Seleccionar formas, encontrarlas en la lista de objetos, alinearlas, reflejarlas, girarlas, apoyarlas sobre una cara y multiplicarlas con patrones.
---

## Seleccionar

Un clic en una forma la selecciona. Con [[Mayús]] añades más o las vuelves a quitar. Mientras mantienes pulsado [[Mayús]] y hay dos o más formas seleccionadas, un numerito debajo del puntero del ratón las va contando. Un clic en un espacio vacío quita la selección, y [[Esc]] también. Arrastra un recuadro en el plano de trabajo vacío para seleccionar todo lo que toque; con [[Mayús]] pulsado, el recuadro añade lo que no estaba seleccionado y quita lo que sí lo estaba. Si prefieres sacar una sola pieza de un montón, activa {{ui:workspace.frameByDirection}} en los ajustes (apartado {{ui:workspace.appearance}}): entonces, un recuadro arrastrado hacia la derecha solo coge lo que queda completamente dentro, uno arrastrado hacia la izquierda sigue cogiendo todo lo que toca, y su línea es discontinua. Mantén pulsado [[Alt]] mientras arrastras para invertir el recuadro solo durante ese arrastre, por ejemplo para coger cuerpos enteros desde el lado en que la dirección no lo permitiría. Y [[Ctrl]]+[[A]] selecciona todos los cuerpos visibles. Mientras arrastras un cuerpo o un tirador del recuadro, [[Esc]] lo cancela si aún tienes pulsado el botón del ratón: todo vuelve a como estaba y no se añade nada al historial.

Lo que te estorbe, ocúltalo ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Las formas ocultas siguen en el diseño; simplemente no se ven y se quedan fuera de la exportación, y la ventana de exportación te avisa antes de cuántas hay. [[Ctrl]]+[[Mayús]]+[[H]] las vuelve a mostrar todas. Lo que deba quedarse quieto, bloquéalo con el candado de la parte de arriba del panel de propiedades o con [[Ctrl]]+[[L]]. Una forma bloqueada no se puede mover, cambiar de tamaño, girar, cambiar de color ni eliminar: sus tiradores se vuelven grises, aparece un candado junto a la flecha de arriba y las herramientas que la cambiarían se ven en gris. Si pasas el ratón por encima de un tirador, sigues viendo sus medidas, y una tecla que la cambiaría avisa con «Objeto bloqueado». Mientras haya una forma bloqueada en la selección, tampoco cambia nada en las demás. Ocultar, cambiar el nombre, copiar y duplicar siguen funcionando.

Un número en el botón del grupo {{ui:editor.group.visibility}} indica cuántas formas están ocultas, y un clic en él las vuelve a mostrar todas. Cuando abres un diseño con formas ocultas, se te avisa una vez, con un botón para mostrarlas.

## La lista de objetos

Con muchas piezas, es fácil perderse en la vista. La lista de objetos ({{ui:editor.tool.showOutliner}} o [[Ctrl]]+[[Mayús]]+[[O]]) presenta todas las formas en una lista. Se queda abierta o cerrada tal como la dejaste, en todos los diseños, hasta que la cierres; la elección se guarda en el navegador.

![La lista de objetos: el grupo «Grupo» con dos piezas y una esfera al lado. Un icono de carpeta abre el grupo.](shot:object-list)

- Un clic en una entrada selecciona la forma, también las piezas que están dentro de un grupo. Con [[Mayús]] pulsado, añades más entradas o las vuelves a quitar, igual que en la vista. Las flechas despliegan y pliegan los grupos.
- La etiqueta indica si una pieza es {{ui:outliner.solid}} u {{ui:outliner.hole}}.
- El candado y el ojo bloquean y ocultan piezas sueltas.
- {{ui:outliner.rename}} le da a una pieza un nombre propio; el lápiz junto al nombre, en la parte de arriba del panel de propiedades, hace lo mismo con la forma seleccionada. En los diseños grandes, unos nombres con sentido ayudan muchísimo.
- El botón A–Z de la barra de título ({{ui:outliner.sortByName}}) ordena alfabéticamente las formas a las que has dado nombre, contando los números como números (Pieza 2 antes que Pieza 10). Las formas que conservan su nombre por defecto quedan debajo en el orden en que las añadiste, la más nueva al final, y las piezas dentro de los grupos se ordenan igual. Solo cambia la lista, nunca el diseño. Un segundo clic vuelve a mostrarlo todo en el orden en que se añadió, y el navegador recuerda la elección.
- El campo de búsqueda encuentra formas por su nombre y por su tipo, así que también puedes buscar «cilindro» u «orificio». Busca también dentro de los grupos, por muy anidados que estén: un grupo que contiene una coincidencia se queda en la lista y se despliega para mostrar las piezas que coinciden y los grupos que llevan hasta ellas. Un grupo encontrado por su propio nombre muestra todas sus piezas cuando lo abres.
- La flecha del extremo izquierdo de la barra de título pliega la lista hasta dejar solo la barra de título, y la vuelve a desplegar.

La lista está acoplada justo a la derecha del cubo de vista. Arrástrala por su barra de título para ponerla en cualquier punto del plano de trabajo; pasa por debajo del cubo de vista y de la barra de cámara. Si la sueltas otra vez junto al cubo de vista, o haces doble clic en la barra de título, se vuelve a acoplar. Este navegador recuerda dónde estaba y si estaba plegada.

## Escribir una posición

La tarjeta {{ui:inspector.position}} del panel de propiedades muestra dónde está el cuerpo seleccionado, y puedes escribir ahí la posición: {{ui:prop.positionX}} e {{ui:prop.positionY}} son el centro de su cuadro delimitador sobre la placa, con los mismos signos que las distancias que aparecen en el plano de trabajo, y {{ui:prop.positionZ}} es la altura de su base. X cuenta hacia la derecha, Y hacia el fondo y Z hacia arriba, según la regla de la mano derecha, como en Tinkercad y en los programas de CAD; las flechas de los ejes de la placa muestran las direcciones. Los valores van en la unidad que hayas elegido, y los controles deslizantes llegan tan lejos como al arrastrar.

## Aparcar piezas junto a la placa

Puedes arrastrar una forma más allá del borde de la placa y dejarla ahí, hasta más o menos el ancho de una placa por cada lado, para guardarla para luego. Con las flechas del teclado la llevas tan lejos como quieras. Una pieza aparcada sigue siendo parte del diseño y entra en la exportación con todo lo demás. Para dejarla fuera, ocúltala o exporta solo la selección. Si has elegido una impresora, layerling te avisa al exportar cuando algo queda fuera de su cama.

## Ajuste al mover

Cuando arrastras una forma por el plano de trabajo, se ajusta a otras formas: su lado izquierdo, derecho, delantero o trasero, o su centro, cae exactamente sobre un lado o el centro de otra forma. Una línea guía rosa muestra a qué se está ajustando. Así dejas dos piezas a ras una junto a otra, o centradas una detrás de otra, sin escribir números. También funciona con la cuadrícula desactivada.

Mantén pulsado [[Mayús]] mientras arrastras para que el movimiento siga un solo eje: la forma sigue la dirección, X o Y, en la que más hayas arrastrado y no se mueve en la otra. Lo mejor es pulsar [[Mayús]] cuando ya estás arrastrando; sobre una forma que aún no está seleccionada, un clic con [[Mayús]] solo la añade a la selección.

Si ya tienes pulsado [[Alt]] al empezar a arrastrar, arrastras una copia, como en Tinkercad: la forma se queda donde está y la copia cae donde sueltes. Si pulsas [[Alt]] cuando ya vas arrastrando, el ajuste se detiene y la forma solo sigue la cuadrícula. Con una copia pasa lo mismo: solo se ajusta cuando sueltas [[Alt]] durante el arrastre. Para desactivar el ajuste del todo, usa el menú de la cuadrícula de abajo a la derecha ({{ui:inspector.objectSnap}}) o la ventana de ajustes. De momento solo se ajusta el movimiento sobre el plano de trabajo normal, no al elevar ni al cambiar el tamaño.

## Alinear

Dos o más formas seleccionadas se alinean con {{ui:editor.tool.align}}: alrededor de la selección aparecen puntos para izquierda, centro y derecha; delante, centro y detrás; y arriba, centro y abajo. Un clic en un punto lleva ahí todas las formas. Si antes haces clic en una de las formas seleccionadas, esa se queda en su sitio y las demás se alinean con ella. Si en la selección hay una forma bloqueada, esa es automáticamente la que se queda fija. Izquierda, derecha, delante, detrás, arriba y abajo se rigen por el cuadro delimitador de cada forma; el centro de un triángulo, un pentágono o una estrella es su propio centro, así que un orificio centrado en una de esas formas queda en el centro de la forma y no en el de su cuadro.

Una forma girada en ángulo, por ejemplo 45°, se alinea por el cuadro que la rodea, no por sus propias aristas. Para alinear por las aristas, pon antes un plano de trabajo sobre una cara de esa forma ({{ui:camera.placeWorkplane}} y luego clic en la cara): los puntos se colocan entonces sobre los ejes de ese plano, y las formas se miden y se mueven según ellos, como en Tinkercad. Para volver a alinear según la placa, devuelve el plano de trabajo a su sitio.

![Alinear muestra los destinos posibles como puntos alrededor de la selección.](shot:align)

La tecla es [[L]]. [[Esc]] cancela.

## Reflejar

{{ui:editor.tool.mirror}} ([[M]], o haz clic derecho en la selección y elígelo) refleja la selección respecto a un plano: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} o {{ui:mirror.topBottom}}. Haz clic en la flecha del eje correspondiente. Es muy práctico para piezas simétricas: construye una mitad, cópiala y refleja la copia.

## Girar y fijar el punto de giro

Para girar, usa las flechas curvas de la forma, los números del panel de propiedades o [[R]], que gira en pasos de 45°. Cuando arrastras sobre el círculo de giro, el giro se ajusta a cada marca, es decir, cada 22,5°; mantén pulsado [[Mayús]] para pasos más finos, y aparecen marcas adicionales cada 11,25°. Arrastra fuera del círculo para girar libremente en pasos de 1°, o de 45° con [[Mayús]]. Normalmente, la selección gira alrededor de su centro. A veces no interesa, por ejemplo cuando quieres seguir girando un tubo inclinado por su extremo. Para eso está {{ui:editor.tool.rotationPivot}}: después, haz clic en una cara. Una cara plana aporta su centro, por ejemplo el eje del extremo de un tubo. A partir de ahí, la selección gira alrededor de ese punto. Un segundo clic en la herramienta lo vuelve a quitar.

Los ángulos se quedan con el cuerpo. En su panel de propiedades, {{ui:inspector.rotation}} los muestra como {{ui:prop.rotateX}}, {{ui:prop.rotateY}} y {{ui:prop.rotateZ}}, con los mismos nombres que la posición: Y cruza la placa y Z va hacia arriba. Escribe ahí un ángulo y el cuerpo gira hasta él, alrededor de su centro o de su propio punto de giro si lo tiene. Mientras hay un cuerpo girado seleccionado, sus ángulos también aparecen debajo de él en el plano de trabajo; {{ui:workspace.showRotationAngles}}, en los ajustes, lo desactiva.

![Un cuerpo girado respecto a dos ejes: sus ángulos aparecen debajo, y la tarjeta Rotación de su panel de propiedades los recoge como números.](shot:rotation-card)

Con **un solo cuerpo** seleccionado, el punto de giro pertenece a ese cuerpo: selecciona otras piezas, vuelve a él y el punto de giro sigue ahí. Se mueve, gira y escala con el cuerpo, se guarda en el proyecto y vuelve con Deshacer. En {{ui:inspector.position}}, el punto de giro tiene sus propias X, Y y Z, que puedes escribir o retocar, y {{ui:inspector.pivotRemove}} lo elimina. También puedes arrastrar con el ratón la marca roja del punto de giro: se desliza por la superficie de los cuerpos y se ajusta a esquinas, puntos medios de aristas y aristas, así que el pasador de una bisagra cae justo en una esquina. Con varios cuerpos seleccionados, el punto de giro solo vale para esa selección, y una selección nueva lo elimina. Al agruparlos o empaquetarlos se conserva: el grupo lo toma como su propio punto de giro, con X, Y y Z en {{ui:inspector.position}}.

## Apoyar sobre una cara

¿Quieres que una pieza se apoye en su mejor lado para imprimirla? Selecciónala, haz clic en {{ui:editor.tool.layFlat}} y luego en la cara que debe quedar abajo. Mientras pasas el puntero por encima de la pieza, la cara que hay debajo se ilumina, así que ves cuál vas a elegir; gira la vista para comprobar los otros lados. La pieza gira hasta que esa cara descansa sobre el plano de trabajo.

¿Quieres que dos piezas queden cara contra cara, o alineadas a ras? Selecciona la pieza que se va a mover, haz clic en {{ui:editor.tool.mateFaces}}, luego en su cara y, después, en la cara de la otra pieza. En el panel, {{ui:mate.mode.against}} pone las caras una contra otra (espalda con espalda, tocándose) y {{ui:mate.mode.flush}} las deja en un mismo plano, una al lado de la otra; {{ui:mate.gap}} deja espacio entre ellas, por ejemplo como holgura. {{ui:mate.apply}} mueve la pieza: gira por el camino más corto hasta que las caras son paralelas —nada, si ya lo son— y luego solo se desliza hacia la otra cara, de modo que conserva su posición lateral. La otra pieza se queda donde está, y un solo Deshacer lo revierte todo.

![El panel Alinear caras: la pieza que se mueve ya está elegida; luego viene una cara de la otra pieza, después cara contra cara o a ras, y una separación opcional.](shot:mate-faces)

**Agujeros en un mismo eje:** {{ui:mate.mode.concentric}} alinea en cambio caras redondas: un agujero sobre otro, un pasador en un agujero, un tornillo en su agujero pasante. Elígelo antes de hacer clic en las caras. Luego haz clic en el interior redondo de un agujero (o el exterior de un pasador) de la pieza que se mueve, y en una cara redonda de la otra pieza; toda la cara redonda se ilumina al señalarla. {{ui:mate.apply}} gira la pieza por el camino más corto hasta que los dos ejes son paralelos y la desliza de lado sobre el otro eje. A lo largo del eje se queda donde estaba, así que un pasador conserva su altura; empújalo después. También funciona con mallas importadas, siempre que el agujero esté hecho de facetas alrededor de un eje.

**Un ángulo exacto entre dos caras:** {{ui:editor.tool.mateFaces}} deja las caras paralelas; no hay una herramienta propia para dejar un ángulo entre ellas, pero así lo consigues. Primero junta las caras con {{ui:editor.tool.mateFaces}}, para que queden paralelas. Luego fija el punto de giro en la arista donde se encuentran ({{ui:editor.tool.rotationPivot}} y clic en la arista o en una esquina) y escribe el ángulo, por ejemplo 15 o 30, en la tarjeta {{ui:inspector.rotation}} de la pieza. La pieza gira alrededor de ese punto. Los ejes de la tarjeta son los de la placa, así que esto funciona cuando la arista va a lo largo de X, Y o Z.

Igual de sencillos son {{ui:editor.tool.dropToWorkplane}} ([[D]]), que baja la selección hasta el plano de trabajo, y {{ui:editor.tool.centerOnWorkplane}}.

[[C]] coge la selección, como Cruise en Tinkercad: la selección sigue al puntero del ratón y se posa sobre la cara del cuerpo que tengas debajo, también si es inclinada. Un clic la deja ahí, y [[Esc]] la deja donde estaba. Su base queda entonces apoyada en la cara, alineada con las aristas de la cara como lo estaría una forma nueva, y conserva su propio giro respecto a su eje vertical. Varias piezas viajan juntas y mantienen su separación. Sobre la placa vacía, [[C]] vuelve a poner de pie sobre el plano de trabajo una pieza inclinada. Sin teclado, el menú de la pulsación larga tiene {{ui:contextMenu.carry}} para lo mismo.

## Patrones: fila y círculo

Para rejillas y círculos de orificios, o para coronas de dientes, está el {{ui:editor.tool.array}}. Selecciona las formas que quieras multiplicar y haz clic en él, en la cinta.

![El patrón en modo «Círculo»: las copias aparecen primero como vista previa.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** la selección se repite a distancias iguales. La fila avanza por los tres ejes a la vez, con {{ui:array.spacingX}}, {{ui:array.spacingY}} y {{ui:array.spacingZ}}: con uno de ellos sale una fila recta, y con dos o tres, una fila en diagonal o una escalera. Una separación negativa coloca la fila hacia el otro lado.
- **{{ui:array.fit}}:** Para agujeros a lo largo de una placa, un colgador de llaves o un perchero. Pon la primera pieza sobre o dentro del cuerpo, elige {{ui:array.fit.x}} o {{ui:array.fit.y}} y ajusta el {{ui:array.fitGap}}: el original se mete esa distancia desde el extremo más cercano (del borde al lado de la pieza), y la última copia deja el mismo hueco hasta el otro extremo. La separación sigue entonces a {{ui:array.count}}: cinco agujeros o nueve, siempre llenan la placa por igual.
- **{{ui:array.mode.circle}}:** la selección se reparte alrededor de un centro. Cuántas copias hay lo eliges en {{ui:array.count}}, y {{ui:array.angle}} es de 360° para un círculo completo. Elige si las copias giran también. {{ui:array.rise}} eleva cada copia un poco más que la anterior (un tornillo o una espiral ascendente), y {{ui:array.radiusChange}} la aleja del centro o la acerca a él (una espiral plana); las dos juntas dan una espiral cónica. Una espiral da como mucho una vuelta: un ángulo de más de 360° cuenta como un círculo completo, y hay como máximo 100 copias.

Consejo: fija antes el punto de giro en una cara con {{ui:editor.tool.rotationPivot}}; así el centro del círculo queda justo ahí.

![El patrón en modo «Círculo» con subida y cambio de radio por copia: las copias suben y se abren como una espiral.](shot:pattern-spiral)

Las copias aparecen primero como vista previa. Solo {{ui:array.apply}} las crea. Si las copias son orificios, agrúpalas después con el cuerpo en el que deben cortar.

## Patrón de orificios en una cara

Para rejillas de ventilación, rejillas de altavoz, cestas y cajas de electrónica, el {{ui:holePattern.title}} reparte orificios por igual sobre una cara plana. Ya no tienes que hacer un orificio, repetirlo y colocarlo en la pared. Selecciona exactamente un cuerpo y haz clic en {{ui:holePattern.title}}, en el grupo {{ui:editor.group.modify}} de la barra de herramientas, junto al patrón. También puedes hacer clic derecho en el cuerpo o buscarlo con [[Ctrl]]+[[K]].

1. Haz clic en una cara plana del cuerpo. Cuenta toda la cara plana alrededor de tu clic, no solo el triángulo que hay bajo el puntero. Una cara curva no sirve: te sale un aviso y haces clic en una plana.
2. En la ventana, elige cómo son los orificios y cómo se colocan:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} o {{ui:holePattern.form.slot}}.
   - **Tamaño:** para un orificio redondo, {{ui:holePattern.size.diameter}}; para uno cuadrado, {{ui:holePattern.size.side}}; para un rectángulo y una ranura, {{ui:holePattern.size.width}} y {{ui:holePattern.size.height}}. En el hexágono, el tamaño es {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** la distancia del centro de un orificio al del siguiente. Si es menor de lo que permiten los orificios, layerling la sube al valor más pequeño posible para que quede una pared entre ellos.
   - **{{ui:holePattern.wall}}:** la misma distancia, dicha de otra manera: la pared que queda entre dos orificios vecinos, que es el grosor de pared en la pieza impresa. Si la fijas, la separación entre centros se adapta, y al revés. En hexágonos, rectángulos y ranuras, layerling mide la distancia mínima entre sus bordes.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} coloca los orificios en filas y columnas. {{ui:holePattern.arrangement.staggered}} desplaza una fila de cada dos media separación y acerca las filas, de modo que cada orificio tiene sus vecinos a la misma distancia; con hexágonos sale un panal.
   - **{{ui:holePattern.margin}}:** la distancia libre entre los orificios y el borde de la cara. Solo se hacen los orificios que caen por completo dentro de la cara descontando este margen; lo que se saldría queda fuera. El margen también se respeta alrededor de las aberturas de la cara.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (la opción predeterminada) corta toda la pared. Con {{ui:holePattern.depth.custom}} indicas la profundidad en milímetros, por ejemplo para hacer rebajes.
3. Los orificios aparecen al momento como vista previa sobre la cara y siguen cada valor. La ventana indica cuántos orificios caben. {{ui:holePattern.repick}} elige otra cara, [[Esc]] cierra la herramienta y, como las demás ventanas de herramientas, se mueve arrastrando su barra de título.
4. Solo {{ui:holePattern.apply}} hace los orificios.

Los orificios son orificios normales agrupados con el cuerpo, igual que después de {{ui:editor.tool.group}}: no queda nada fundido para siempre. {{ui:editor.tool.ungroup}} deshace el grupo y libera cada orificio, que entonces puedes mover, cambiar o eliminar uno a uno. Todo ello es un solo paso para {{ui:editor.tool.undo}}. La herramienta no hace más de 400 orificios a la vez; en ese caso, haz los orificios más grandes o aumenta la separación.

Una IA puede hacer lo mismo a través del puente MCP con `layerling_perforate_face` (consulta el capítulo [IA con MCP](chapter:ai-with-mcp)).

## Empujar una cara hacia fuera o hacia dentro

Para engrosar una pared, poner un resalte sobre una cara o abrir un hueco en ella, la herramienta {{ui:faceTool.title}} trabaja sobre una cara plana. También funciona con un STL importado, donde no hay ningún boceto que cambiar. Selecciona exactamente un cuerpo y haz clic en {{ui:faceTool.title}}, en el grupo {{ui:editor.group.modify}} de la barra de herramientas, junto al patrón de orificios. También puedes hacer clic derecho en el cuerpo o buscarla con [[Ctrl]]+[[K]].

1. Haz clic en una cara plana del cuerpo. Igual que con el patrón de orificios, cuenta toda la cara plana alrededor de tu clic; una cara curva no sirve.
2. En la ventana:
   - **{{ui:faceTool.direction}}:** elige {{ui:faceTool.direction.out}} para añadir material que sobresalga de la cara o {{ui:faceTool.direction.in}} para abrir un hueco en ella. Un hueco no llega más hondo que el cuerpo que hay detrás de la cara; en un cuerpo vaciado, aun así, puede llegar a la cavidad.
   - **{{ui:faceTool.inset}}:** cuánto queda el contorno nuevo hacia dentro del borde de la cara. Hacia fuera, con 0 se toma toda la cara, y así se engrosa una pared. Las aberturas de la cara crecen en la misma medida.
   - **{{ui:faceTool.radius}}:** redondea todas las esquinas del contorno, también las interiores, de modo que una punta afilada acaba en un arco. Una muesca más estrecha que el doble del radio se cierra, y una parte de la cara más estrecha que el doble del margen y el radio juntos queda fuera.
   - **{{ui:faceTool.depth}}:** cuánto sobresale de la cara la parte nueva, o lo hondo que llega el hueco.
3. El resultado aparece al momento como vista previa y sigue cada valor. {{ui:faceTool.repick}} elige otra cara, y [[Esc]] cierra la herramienta.
4. Solo {{ui:faceTool.apply}} lo crea.

Lo que añade la herramienta es un cuerpo de boceto normal agrupado con el cuerpo: no queda nada fundido para siempre. {{ui:group.edit}} abre el grupo, y {{ui:inspector.editSketch}} en la pieza nueva muestra el contorno que sigue. En la cara superior o inferior de un cuerpo de boceto sencillo —una sola superficie; sin agrupar, reflejar, estrechar, retorcer ni inclinar, y sin trazo, orificio para llavero, redondeo ni chaflán—, ese contorno es el del propio cuerpo, desfasado hacia dentro al construirlo, así que sus líneas y arcos siguen siendo exactos siempre que el núcleo CAD pueda desfasarlos, para las herramientas de aristas y la exportación a STEP. Si después le cambias el tamaño, la pieza conserva su margen. En cualquier otra cara, y en todas las caras de una malla importada, el contorno sigue los triángulos de la cara, y una curva se compone de tramos rectos cortos. Todo ello es un solo paso para {{ui:editor.tool.undo}}. Para cambiar más tarde el margen o el radio, deshaz y vuelve a usar la herramienta. Para redondear después la arista superior, usa {{ui:editor.tool.fillet}} con {{ui:edge.topEdges}} sobre el grupo como último paso: como cualquier tratamiento de aristas sobre un grupo, une el grupo en un solo cuerpo.

Una IA puede hacer lo mismo a través del puente MCP con `layerling_push_face` (consulta el capítulo [IA con MCP](chapter:ai-with-mcp)).

## Cambiar varias piezas a la vez

Con varias piezas seleccionadas, el panel de propiedades de la derecha muestra cuántas son y ofrece lo que se aplica a todas a la vez: {{ui:inspector.solid}} u {{ui:inspector.hole}}, un mismo color para todas (un clic en {{ui:inspector.solid}} abre los colores) y el candado. Si la selección es mixta, un clic las convierte todas en sólidos o todas en orificios. Si alguna de las piezas está bloqueada, solo se puede usar el candado. Los tamaños se cambian con los tiradores, con {{ui:scalePercent.title}} o escribiendo un número en una etiqueta de medida. Con varias piezas, el número es el tamaño de toda la selección: todas las piezas crecen con él, y también los espacios entre ellas, como cuando arrastras un tirador. Sólido y orificio también funcionan con el clic derecho o con las teclas [[S]] y [[H]].

## Escalar en porcentaje

Para hacer una o varias piezas más grandes o más pequeñas en la misma proporción, por ejemplo todas las piezas de un archivo de impresión un 20 %, usa {{ui:scalePercent.title}}. Selecciona las piezas, haz clic derecho sobre ellas y elige {{ui:scalePercent.title}}, o búscalo con [[Ctrl]]+[[K]].

En {{ui:scalePercent.percent}} escribes el tamaño nuevo como porcentaje del actual: 120 % es una quinta parte más grande y 50 %, la mitad. La anchura, la profundidad y la altura cambian igual, así que se mantienen las proporciones. La base se queda donde está, así que nada se hunde en la placa.

Con varias piezas, eliges cómo crecen:

- **{{ui:scalePercent.mode.together}}:** las piezas crecen alrededor de su centro común, y los espacios entre ellas crecen también. Todo se agranda como si fuera una sola pieza.
- **{{ui:scalePercent.mode.each}}:** cada pieza crece donde está, y los espacios entre ellas no cambian.

Solo {{ui:scalePercent.apply}} cambia el diseño, y un paso atrás lo deshace. Si hay una pieza bloqueada en la selección, no se abre.

## Deshacer

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) y {{ui:editor.tool.redo}} ([[Ctrl]]+[[Mayús]]+[[Z]] o [[Ctrl]]+[[Y]]) recorren tu historial paso a paso. Cuántos pasos viajan con el diseño guardado lo eliges en los ajustes, en {{ui:workspace.history}}. Al señalar cualquiera de los dos botones, su descripción nombra el paso que desharía o reharía, con la medida cuando el paso tiene una, por ejemplo «Aristas redondeadas: Box (5 mm)»; el mensaje posterior dice lo mismo. Para retroceder varios pasos de una vez, usa la vista del historial más abajo.

## Mirar atrás: la vista del historial

{{ui:editor.tool.history}}, junto a deshacer y rehacer, abre una vista de tu historial sin cambiar nada. La zona de trabajo muestra el diseño tal como era, y un control deslizante abajo recorre cada paso de deshacer: a la derecha del todo está el estado actual, cada paso hacia la izquierda es un deshacer más atrás, y los estados que has deshecho quedan a la derecha del actual. Las flechas del teclado recorren los estados, y [[Esc]] vuelve al estado actual. La rueda del ratón sobre el control deslizante hace lo mismo, un estado por cada paso de la rueda; hacia arriba, a uno anterior. [[Re Pág]] y [[Av Pág]] saltan diez estados, [[Inicio]] va al estado más antiguo y [[Fin]] vuelve al actual. Mientras tanto puedes girar la vista, hacer zoom y hacer clic en objetos para recuperarlos (se explica más abajo), pero no se puede mover nada; el diseño en sí se queda exactamente como está. Si la barra tapa algo, apártala arrastrando su barra de título; un doble clic en ella la devuelve a su sitio. El botón de lista de la barra de título muestra todos los pasos por su nombre en una lista, el más reciente arriba: un clic en un paso va a ese estado, el estado en el que está el diseño lleva la marca {{ui:historyView.listNow}} y los pasos deshechos aparecen en gris. Si dejas la lista abierta, la próxima vez seguirá abierta.

De un estado anterior puedes llevarte dos cosas. {{ui:historyView.createProject}} pone ese estado en un diseño nuevo en la página de inicio, con el nombre de este y la hora de ese estado entre paréntesis —un diseño guardado antes de que layerling registrara horas lleva «copia» en su lugar—, y con el historial hasta ese punto, para que deshacer siga funcionando allí. {{ui:historyView.export}} abre la exportación de siempre con ese estado como diseño, para que puedas guardarlo como STL, 3MF, STEP, imagen o archivo LYL con el historial hasta ese estado.

También puedes recuperar objetos sueltos en el diseño. Haz clic en un objeto del estado que se muestra —[[Mayús]]+clic añade más o vuelve a quitar uno, y un clic en un espacio vacío no elige nada— y elige {{ui:historyView.bringBack}}. La vista se cierra y una copia de cada objeto aparece en el diseño actual exactamente como era en ese estado y en el sitio que ocupaba entonces, seleccionada, junto a todo lo que tenga ahora el diseño; no cambia nada más. Es un solo paso, así que deshacer lo revierte. Sirve para recuperar una versión de una pieza que has cambiado desde entonces, o una que has eliminado. Un grupo vuelve entero; las notas y los puntos de referencia de un objeto se quedan atrás. Su nombre lleva la hora de ese estado, como «Caja (12:32)», para distinguirlo fácilmente de la versión que tiene ahora el diseño. Para recuperar una pieza que está dentro de un grupo, selecciona el grupo y elige {{ui:historyView.openGroup}} o pulsa [[E]], como en el diseño: sus piezas se colocan donde las pondría la edición del grupo, listas para elegirlas, y la barra indica en qué grupo estás. {{ui:historyView.backOut}} lo vuelve a cerrar. Esto es solo para mirar: el grupo, el diseño y el historial se quedan como están.

{{ui:historyView.delete}} está aparte, abajo a la izquierda de la barra. Tras pedirte confirmación, elimina para siempre todos los pasos anteriores: el diseño conserva el estado que tiene ahora (no el que se muestra), Deshacer ya no tiene adónde volver y un archivo guardado después no lleva historial. Úsalo para compartir un diseño sin su pasado o para empezar de cero los pasos de deshacer. No se puede deshacer; para compartir un archivo sin tocar tu propio diseño, elige mejor {{ui:export.historyNone}} al exportar.
