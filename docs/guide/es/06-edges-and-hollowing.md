---
title: Romper aristas y vaciar cuerpos
summary: Chaflanes y redondeos en las aristas que elijas, y paredes de grosor uniforme para cajas, vasos y carcasas.
---

## Achaflanar y redondear aristas

Las aristas vivas rara vez quedan bien en una pieza impresa, y tampoco son especialmente resistentes. Un **chaflán** corta la arista en ángulo; un **redondeo** la redondea. Los dos actúan sobre las aristas en las que hagas clic.

1. Selecciona el cuerpo (o el grupo).
2. Haz clic en {{ui:editor.tool.fillet}} o {{ui:editor.tool.chamfer}} en la cinta, pulsa [[B]] para el redondeo o [[Shift+B]] para el chaflán, o haz clic derecho en el cuerpo y elige la opción en el menú.
3. Las aristas del cuerpo se resaltan. Haz clic en las que quieras modificar. Otro clic vuelve a quitar una arista. Con [[Mayús]] añades o quitas una sola arista.
4. Ajusta el tamaño y confirma con {{ui:edge.apply}} o [[Intro]]. Después, la ventana sigue abierta sobre el cuerpo nuevo con el mismo tamaño, para que puedas hacer enseguida el siguiente redondeo o chaflán; {{ui:edge.done}}, [[Esc]] o la cruz la cierran. Si mantienes pulsada [[Mayús]] o [[Ctrl]], un clic en {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} o {{ui:edge.horizontalEdges}} añade esas aristas a las que ya habías elegido en lugar de sustituirlas.

![La herramienta «Redondear aristas»: todas las aristas vivas están seleccionadas y la imagen muestra la vista previa con un radio de 4 mm.](shot:fillet-preview)

El panel está arriba a la derecha. Si tapa aristas en las que quieres hacer clic, arrástralo por su barra de título; la próxima vez se abrirá también ahí, y lo mismo pasa con {{ui:editor.tool.hollow}} y {{ui:editor.tool.array}}. Un doble clic en la barra de título lo devuelve a su sitio.

Si eliges una forma de la lista de formas con el panel abierto, este se cierra sin aplicar nada y se olvidan las aristas en las que habías hecho clic. Entonces el clic coloca la forma nueva en lugar de elegir aristas.

En el panel encontrarás:

- {{ui:edge.allSharpEdges}} selecciona todas las aristas a la vez, y {{ui:edge.clear}} vacía la selección.
- **{{ui:edge.radius}}**, para el redondeo. Para el chaflán ajustas {{ui:edge.distance}} o {{ui:edge.angle}}.
- {{ui:edge.variableRadius}} (solo en el redondeo) hace que el radio cambie a lo largo de una arista: pequeño en un extremo, mayor en el otro y uniforme entre ambos, como donde una pared recta se encuentra con una inclinada. Haz clic en una sola arista y ajusta {{ui:edge.radiusStart}} y {{ui:edge.radiusEnd}}. Qué extremo cuenta como el principio depende de cómo se construyó la arista; si el radio mayor sale en el extremo equivocado, {{ui:edge.swapEnds}} le da la vuelta. Funciona con una arista cada vez, así que redondea varias aristas una tras otra. {{ui:edge.editAction}} recupera los dos valores.
- {{ui:edge.sharpThreshold}} decide qué aristas cuentan como vivas. Con un valor de 25°, solo los quiebros claros se tratan como aristas y las transiciones suaves se dejan como están.
- {{ui:edge.verticalEdges}} elige las aristas que van en vertical, como las esquinas de una caja: así, un solo redondeo redondea a la vez todas las esquinas verticales.
- {{ui:edge.topEdges}} elige solo las aristas de la parte más alta del cuerpo. Es la forma rápida de hacer un cortador de galletas: crea el contorno en un boceto como trazo y luego achaflana las aristas superiores. {{ui:edge.angle}} fija la inclinación del chaflán; no puede ir más allá del grosor de la pared.
- {{ui:edge.bottomEdges}} elige solo las aristas de la parte más baja del cuerpo, el reflejo de {{ui:edge.topEdges}}. Es la forma rápida de redondear o achaflanar solo el pie de una pieza.
- {{ui:edge.chamfillet}}, que se elige arriba en la ventana de chaflán, junto a {{ui:editor.tool.chamfer}}, hace el pie imprimible de una pieza: un chaflán junto a la placa que se funde tangencialmente con un redondeo hacia la pared, para que las primeras capas no necesiten soportes y la arista termine suave de todos modos. {{ui:edge.distance}} es la altura que ocupa el pie, y {{ui:edge.angle}} (de 15° a 75°), la inclinación del chaflán junto a la placa. Elige las aristas con {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} oculta las aristas que quedan detrás del cuerpo desde donde miras. De forma predeterminada, todas las aristas se ven a través del cuerpo, lo que resulta confuso en una pieza complicada; con el interruptor activado solo ves las aristas que dan hacia ti, y solo puedes hacer clic en ellas. Gira la vista para llegar a las demás. Una arista dibujada en rojo (ver más abajo) se ve siempre.
- {{ui:edge.tangentChains}}: un clic elige también las aristas que se continúan suavemente unas en otras, por ejemplo todas las aristas alrededor de una cara con esquinas redondeadas. El interruptor solo decide qué elige un clic: el núcleo CAD siempre prolonga un chaflán o un redondeo por esas aristas que continúan suavemente. El panel te dice por cuántas aristas más pasa.
- {{ui:edge.keepSize}} mantiene el chaflán o el redondeo con el tamaño que tiene, aunque luego escales el cuerpo.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} o {{ui:edge.fine}}) decide con qué detalle se calcula la vista previa. Para piezas difíciles, {{ui:edge.draft}} es más rápido.

Mientras ajustas el tamaño, layerling recalcula la vista previa. Puede tardar un momento. Puedes seguir ajustando: lo que se calcula es el último valor que hayas elegido.

Si el tamaño es demasiado grande para la arista, layerling te lo dice y te propone un valor menor. A menudo basta con uno o dos milímetros menos. En ángulos agudos, un redondeo necesita más espacio del que hace pensar su radio. En una pantalla pequeña, el panel se desplaza solo hacia abajo para que el mensaje quede a la vista.

Si una selección que funcionaba falla al hacer clic en una arista más, esa arista se pone roja y se dibuja más gruesa: es la que no se puede tratar junto con las demás con ese tamaño. Vuelve a hacer clic en ella para quitarla, o reduce el tamaño. Si haces clic en más aristas mientras el mensaje sigue ahí, la primera sigue en rojo. Cuando no hay una selección anterior que funcionara (en el primerísimo clic, o con un tamaño que acabas de aumentar), se ponen en rojo las aristas que fallan incluso por sí solas, o todas, si lo que falla es solo su combinación.

La arista que hay bajo el puntero también se dibuja más gruesa, para que veas cuál va a elegir el clic.

Un hueco también admite {{ui:editor.tool.chamfer}} y {{ui:editor.tool.fillet}}, igual que {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} y {{ui:editor.tool.deleteFace}}: sigue siendo un hueco y corta con su nueva forma. Redondear las cuatro aristas verticales de un hueco en forma de caja da una cavidad con esquinas interiores redondeadas, y un hueco agrandado con {{ui:editor.tool.offset}} corta con ese margen de más. Para romper la arista donde un hueco se une a la pieza, trata el grupo terminado: esa arista es suya.

### Deshacer una operación de aristas

Un cuerpo con chaflanes, redondeos o vaciado siempre se puede volver a modificar. Selecciónalo de nuevo y abre la herramienta (Redondeo, Chaflán o Vaciar; todas muestran la lista): en {{ui:edge.featureHistory}} ves lo que ya tiene aplicado. {{ui:edge.revertAction}} deshace una sola operación. Atención: si hay operaciones más recientes encima, se van con ella, y el panel te dice cuántas.

Junto a un chaflán, un redondeo o un vaciado aparece también {{ui:edge.editAction}}. Deshace la operación del mismo modo, pero vuelve a abrir enseguida la herramienta con las mismas aristas y el valor anterior. Cambias el valor y lo vuelves a aplicar: un redondeo de 3 mm pasa a ser de 5 mm sin tener que volver a hacer clic en las aristas. Si hay operaciones más recientes encima, aquí también se van con ella. Esto vale para las operaciones de aristas que hagas a partir de ahora; las más antiguas solo ofrecen deshacerlas, y lo mismo ocurre con las piezas sueltas de un grupo.

En un grupo, por ejemplo un cilindro con un orificio, la arista tratada pertenece al cuerpo terminado, no a una de sus piezas. Por eso el grupo pasa a ser un único cuerpo. {{ui:editor.tool.ungroup}} sigue funcionando con él: primero retira las operaciones de aristas y después desagrupa, todo en un solo paso que puedes deshacer con [[Ctrl]]+[[Z]]. Si deshaces la operación como se explica más arriba, el grupo vuelve con todas sus piezas. Lo más sencillo es tratar las aristas al final. Eso vale también para las roscas: la herramienta de aristas toma una rosca como su cuerpo exacto, así que a un bloque con un orificio roscado se le redondean las aristas con la rosca en su sitio. Calcular las aristas de una rosca lleva más tiempo que en una forma sencilla: unos segundos para una M6 y cerca de medio minuto para una rosca de tubo G1/2.

> **Conviene saber:** Para los redondeos y chaflanes, layerling trabaja con geometría CAD real, no solo con una malla de triángulos. Por eso una arista redondeada sigue siendo una arista redondeada en la exportación STEP.

Una pieza importada en STEP también conserva su geometría CAD: los chaflanes, los redondeos y el vaciado trabajan sobre el cuerpo del archivo, por muy detallada que se dibuje la pieza en pantalla. STL, OBJ y 3MF solo traen triángulos, y una pieza dibujada con mucho detalle puede ser demasiado densa para la herramienta de aristas. Si una pieza también está disponible en STEP, importa esa.

## Vaciar cuerpos

Cajas, vasos, carcasas y tapas tienen algo en común: están huecos por dentro, con paredes de grosor uniforme. Eso es justo lo que hace {{ui:editor.tool.hollow}}.

1. Selecciona el cuerpo y haz clic en {{ui:editor.tool.hollow}}, o haz clic derecho en el cuerpo y elige la opción en el menú.
2. Ajusta el {{ui:shell.wall}}.
3. En {{ui:shell.openings}}, activa los lados que se quedan abiertos: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} o {{ui:shell.side.right}}, tantos como quieras. Solo con {{ui:shell.side.front}} sale el hueco para un cajón; con {{ui:shell.side.left}} y {{ui:shell.side.right}}, un túnel. Si no activas ningún lado, el cuerpo queda cerrado por todas partes, con una cavidad en el centro. {{ui:shell.side.closed}} desactiva todos los lados con un solo clic. {{ui:shell.side.top}} ya está activado al abrir el panel; un clic sobre él vuelve a cerrar la parte de arriba. Un cuerpo cerrado por todas partes se ve igual desde fuera: la vista de sección muestra la cavidad.
4. En {{ui:shell.edges}}, elige {{ui:shell.edges.round}} o {{ui:shell.edges.sharp}}.
5. Haz clic en {{ui:shell.apply}}.

![El panel de vaciado con el grosor de pared, un interruptor para cada lado que queda abierto y las aristas interiores.](shot:hollow-panel)

Las paredes crecen hacia dentro. El exterior se queda como está.

Lo que elijas en {{ui:shell.edges}} solo importa donde las paredes interiores se separan: en un escalón del cuerpo o alrededor de una abertura. Las esquinas de la cavidad de una caja sencilla son siempre vivas, con cualquiera de los dos ajustes. Para un interior redondeado, redondea primero las aristas exteriores del cuerpo (ver más arriba) y luego vacíalo: el interior sigue la forma con el radio menos el grosor de pared. Si no se puede construir el interior redondeado, algo que puede pasar con un contorno hecho de muchísimos tramos rectos cortos, como un dibujo vectorizado, layerling construye en su lugar el mismo cuerpo hueco con esquinas interiores vivas.

![El resultado: un cuerpo hueco con una pared de 3 mm, abierto por arriba.](shot:hollow-result)

![La misma caja con solo el lado delantero abierto: el hueco para un cajón.](shot:hollow-sides)

Para cada lado abierto, el cuerpo necesita una cara plana en su extremo de ese lado. Por eso las esferas y las formas libres no se pueden vaciar así. Si la pared es demasiado gruesa para el cuerpo, layerling te avisa y te pide una más fina. Una caja redondeada con las aristas superiores e inferiores también redondeadas es uno de esos casos: su pared tiene que ser claramente más fina que ese redondeo, o pon antes el redondeo a 0.

Un cuerpo con un hueco (un bloque con un orificio que no llega a atravesarlo, hecho agrupando una caja con un orificio elevado) también se puede vaciar, con la parte de arriba abierta: las paredes alrededor del hueco también se vacían, de modo que entre la pared exterior y el hueco queda un anillo de cavidad abierto por arriba, y bajo el fondo del hueco queda una cavidad fina.

**Los cuerpos que terminan en punta,** como un cono o un triángulo convertido en cuerpo de revolución, no tienen arriba una cara plana que pueda quedar abierta. Tampoco funciona una cavidad totalmente cerrada, porque una punta no se puede desfasar hacia dentro: incluso con una pared de 1 mm aparece el mensaje de que las paredes no pueden ser tan gruesas. En su lugar, dibuja la pared en el perfil antes de la revolución: duplica el contorno, reduce la copia de forma uniforme, colócala en el centro del contorno grande y corta el grande con ella; después aplica la revolución al resultado (capítulo Bocetos, apartado Revolución). La distancia entre los dos contornos es el grosor de la pared.

Si más adelante cambias el tamaño de un cuerpo vaciado, layerling lo vuelve a vaciar al momento con el tamaño nuevo. La pared mantiene el grosor que elegiste, también en los cuerpos redondos. Un cilindro que estires más en una dirección que en la otra se convierte en una elipse.

> **Consejo:** Con una boquilla de 0,4 mm, una pared de 1,2 a 2 mm es un buen punto de partida: lo bastante fina para ahorrar material y lo bastante gruesa para que la pieza sea resistente.

## Una tapa para un cuerpo abierto

{{ui:editor.tool.lid}} crea la tapa de un cuerpo abierto por arriba: una caja que vaciaste con la parte de arriba abierta, una maceta, una bandeja. Selecciona el cuerpo y haz clic en {{ui:editor.tool.lid}}. En la ventana eliges el tipo:

- {{ui:lid.type.plug}}: una placa tan grande como el cuerpo con un labio debajo que entra en la abertura.
- {{ui:lid.type.cap}}: una placa una pared más ancha que el cuerpo con un borde debajo que abraza el exterior.
- {{ui:lid.type.both}}: una placa una pared más ancha que el cuerpo con las dos cosas: un labio dentro de la abertura y un borde por fuera. La pared del cuerpo queda en una ranura entre ambos, como en un táper.
- {{ui:lid.type.flat}}: solo la placa, para apoyarla o pegarla.

Después ajustas el grosor ({{ui:lid.thickness}}), el ajuste ({{ui:lid.fit}}, la holgura por lado entre tapa y cuerpo: 0,1 mm apretado, 0,2 mm normal, 0,3 mm suelto, o cualquier valor hasta 1 mm) y cuánto baja el labio o el borde y lo gruesa que es su pared. Haz clic en {{ui:lid.apply}}: la tapa queda junto al cuerpo, dada la vuelta con la placa abajo, así se imprime sin soportes. El cuerpo queda como está. La tapa sigue cualquier contorno, redondo o anguloso, porque se toma del propio cuerpo justo debajo de su borde. Un cuerpo sin abertura arriba solo recibe una tapa plana; para las demás, vacíalo antes con la parte de arriba abierta.

> **Consejo:** Lo apretada que queda una tapa depende de la impresora. Imprime primero una caja pequeña con su tapa; si queda demasiado apretada, elige el siguiente ajuste más suelto.

## Desfasar cuerpos

Cada cara de un cuerpo puede moverse la misma distancia, hacia fuera o hacia dentro. Eso necesita un ajuste, una tapa o una unión a presión: una holgura de 0,1 a 0,3 mm alrededor mientras los detalles quedan donde están, algo que el escalado no da.

1. Selecciona un cuerpo y haz clic en {{ui:editor.tool.offset}}, o haz clic derecho en el cuerpo y elígelo ahí.
2. Elige {{ui:offset.grow}} o {{ui:offset.shrink}} y fija la {{ui:offset.distance}}.
3. Los {{ui:offset.edges}} deciden las esquinas exteriores: redondeado mantiene redonda la superficie desfasada, afilado deja que las caras sigan hasta encontrarse.
4. Marca {{ui:offset.copy}} para conservar la pieza tal cual y obtener el cuerpo agrandado como una copia que ya es un hueco. Agrupa ese hueco con la pieza que encaja y corta exactamente la holgura elegida.
5. Haz clic en {{ui:offset.apply}}.

Marca {{ui:offset.sideways}} cuando solo deba crecer o encoger el contorno: los lados se mueven la distancia, y cada cara plana de arriba y de abajo se queda a su altura. Un cartel recibe un borde alrededor, una base se ensancha y el cuerpo no se hace más alto. En un cuerpo escalonado, cada escalón conserva su altura. Un texto que se desfasa a través de sus contornos también conserva entonces su altura.

Sin la marca se desfasa el propio cuerpo. Pasa a ser un cuerpo exacto fijo, como tras un chaflán: la lista de arriba del panel deshace el desfase, y {{ui:edge.editAction}} abre de nuevo la herramienta con la distancia anterior. Solo se pueden desfasar cuerpos CAD exactos - cajas, cilindros y las demás formas, sus grupos, piezas STEP importadas. Un cuerpo que es solo una malla de triángulos, como muchas importaciones STL, a menudo no se puede. Una distancia demasiado grande para el cuerpo, por ejemplo reducir más allá de su pared más fina, se rechaza.

## Eliminar caras

Un redondeo que estorba, un orificio en el sitio equivocado, un saliente que ya no necesitas: {{ui:editor.tool.deleteFace}} lo quita del cuerpo sin tener que volver a construirlo.

1. Selecciona el cuerpo y haz clic en {{ui:editor.tool.deleteFace}}, o haz clic derecho en el cuerpo y elige la opción en el menú.
2. Haz clic en todas las caras de lo que quieras quitar: las caras de una arista redondeada, la pared de un orificio, el lateral y la parte superior de un saliente. Una cara elegida se resalta; otro clic la vuelve a quitar. El panel cuenta las caras.
3. Haz clic en {{ui:deleteFace.apply}} o pulsa [[Supr]]. [[Esc]] cierra la herramienta sin cambiar nada.

Las caras que rodean a las eliminadas crecen hasta cerrar el hueco. Una caja con las aristas superiores redondeadas recupera sus aristas vivas, un orificio se rellena, un saliente desaparece. El cuerpo sigue siendo exacto, así que se puede volver a redondear y achaflanar, y la exportación STEP conserva sus caras reales. [[Ctrl]]+[[Z]] deshace la eliminación en un solo paso. También aparece en {{ui:edge.featureHistory}} junto con los redondeos y chaflanes, donde {{ui:edge.revertAction}} la deshace; para ella no hay {{ui:edge.editAction}}. En un grupo, el resultado es un único cuerpo, como con una operación de aristas.

Elige todas las caras de lo que quieras quitar, y solo esas. Si las caras de alrededor no pueden cerrar el hueco, layerling te lo dice y no cambia nada: una cara principal de una caja, por ejemplo, no tiene ninguna vecina que pueda ocupar su lugar. Si eliminas solo el fondo de un hueco, se convierte en un orificio pasante, porque las paredes del hueco continúan hasta el otro lado.

{{ui:editor.tool.deleteFace}} necesita caras exactas: funciona en piezas importadas en STEP y en las formas de layerling. Lo que layerling guarda como malla no las tiene: un STL, OBJ o 3MF importado, un cuerpo dividido, envuelto o simplificado, o una forma muy detallada, como un texto largo. Si puedes, importa la pieza en STEP. En una pieza importada muy detallada, unas pocas caras pueden ser demasiado para el núcleo CAD: a los 45 segundos se detiene la eliminación y no cambia nada. Un cuerpo al que se ha cambiado el tamaño después de una operación de aristas, manteniendo el tamaño de las aristas, no tiene caras exactas con su nuevo tamaño hasta que se deshace ese cambio de tamaño.
