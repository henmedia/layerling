---
title: Sólidos y orificios
summary: Cómo las formas sencillas se convierten en taladros, ranuras y huecos, y cómo cambiar un grupo más adelante.
---

Esta es la idea más importante de layerling, y se aprende enseguida: **toda forma es un sólido o un orificio.** Un sólido se queda tal cual. Un orificio es una herramienta que quita material.

## Sólido u orificio

Selecciona una forma y, en sus ajustes, haz clic en {{ui:inspector.solid}} o en {{ui:inspector.hole}}. Con el teclado es más rápido: [[H]] convierte la selección en orificio y [[S]] la vuelve a convertir en sólido. Las dos opciones están también en el menú que se abre al hacer clic derecho sobre el cuerpo. Un orificio se muestra transparente para que veas dónde está. [[T]] vuelve transparente un cuerpo, por ejemplo para mirar dentro de una carcasa; si la pulsas otra vez, vuelve a ser opaco. Actúa sobre toda la selección: si algún cuerpo ya es transparente, todos se vuelven opacos; si no, todos se vuelven transparentes.

Mientras no agrupes, el orificio no hace nada. Solo está ahí y marca dónde va a desaparecer algo más adelante.

![El cilindro es un orificio. Sobresale por encima del cubo para atravesarlo por completo.](shot:hole-before)

## Agrupar

Selecciona los sólidos y el orificio (o los orificios) y haz clic en {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Ahora los orificios quitan el material de los sólidos que tocan. Lo que queda es una única forma nueva.

![El resultado: un cubo con un taladro.](shot:hole-after)

Así se consiguen:

- **Taladros:** un cilindro convertido en orificio que atraviesa un cuerpo.
- **Ranuras:** una caja alargada convertida en orificio en una arista.
- **Huecos:** un orificio que no llega a atravesar la pieza.
- **Roscas dentro de una pieza:** un orificio roscado convertido en orificio; consulta [Roscas y mecánica](chapter:threads-and-mechanics).

Si en el grupo hay varios sólidos, se unen. Dos sólidos que se tocan pasan a ser una sola pieza.

Un grupo se maneja como cualquier forma: puedes moverlo, girarlo, darle color o volver a agruparlo. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Mayús]]+[[G]]) lo deshace y vuelves a tener las piezas sueltas.

### Convertir un grupo en orificio

Un grupo entero también puede ser un sólido o un orificio. Para eso hay una regla sencilla:

- Si el grupo solo tiene sólidos (o solo orificios), lo cambias entero y sus piezas cambian con él.
- Si tiene de las dos cosas, como un cubo con un taladro, cada pieza conserva su propio estado. El grupo entero pasa a ser una herramienta, pero el taladro sigue siendo un taladro.

## Crear conjuntos

A veces las piezas solo tienen que ir juntas sin convertirse en una sola: por ejemplo, un logotipo blanco sobre una placa negra para una impresión multicolor. Para eso está {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), como en Tinkercad. Un conjunto se mueve, gira y cambia de tamaño como una forma, pero no se fusiona nada:

- Cada pieza conserva su color y sigue siendo un sólido o un orificio.
- Los orificios no cortan nada. Cuando agrupas el conjunto con otras piezas, sus orificios cortan esas piezas, pero siguen sin cortar los sólidos del propio conjunto, como en Tinkercad. Así, por ejemplo, una espiga con su orificio al lado se puede usar una y otra vez como conjunto.
- Al exportar a STL, 3MF u OBJ, cada pieza es un cuerpo independiente; en 3MF y OBJ, con su color.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Mayús]]+[[G]]) vuelve a separar un conjunto, y [[E]] lo abre para editarlo como un grupo. Los chaflanes, los redondeos y el vaciado no funcionan en un conjunto, porque no es un único cuerpo: agrúpalo para eso o trabaja sus piezas una a una. Si quieres que un orificio del conjunto corte también los sólidos del propio conjunto, separa el conjunto y agrupa sus piezas ([[Ctrl]]+[[G]]).

## Intersección

{{ui:editor.tool.intersect}} conserva solo lo que dos o más cuerpos tienen en común. Coloca dos formas de modo que se solapen, selecciona las dos y haz clic en el botón. Así, de un cilindro y una caja sale una pieza con un lado redondo y otro recto. Un grupo cuenta tal como se ve, con sus orificios incluidos. Si también hay un orificio seleccionado, queda lo que todos los sólidos comparten con todos los orificios. Si las formas no tienen nada en común, no cambia nada y un mensaje te lo indica. Al lado, {{ui:editor.tool.intersectPreview}} muestra la parte común antes de aplicarla: las formas seleccionadas se vuelven transparentes y lo que comparten se dibuja en verde. Selecciona y mueve cada forma por separado y la parte verde la sigue; {{ui:editor.tool.intersect}} la aplica y [[Esc]] cierra la vista previa.

## Recortar un cuerpo de otro

En piezas que tienen que encajar, un eje en un casquillo o un tornillo en una carcasa, haces una pieza y la recortas de la otra. Selecciona los dos cuerpos y haz clic en {{ui:editor.tool.cutOut}} en la zona {{ui:editor.group.combine}}, o haz clic derecho y elígelo ahí. La ventana nombra la pieza que se queda y el cuerpo que recibe la cavidad; layerling toma el más pequeño como pieza, y {{ui:cutOut.swap}} lo invierte. {{ui:cutOut.clearance}} hace la cavidad tanto más grande que la pieza por todos lados: 0 encaja exacto, 0,2 mm es un margen habitual para un ajuste impreso. {{ui:cutOut.apply}} recorta una copia de la pieza del otro cuerpo y deja la pieza donde está. El resultado es un grupo: {{ui:editor.tool.ungroup}} vuelve a separar el recorte. Un margen exige que la pieza sea un cuerpo exacto, como en la herramienta {{ui:editor.tool.offset}}, que se usa para ello.

## Editar un grupo

Si un taladro te ha quedado demasiado pequeño, no hace falta deshacer el grupo y volver a construirlo. Selecciona el grupo y haz clic en {{ui:group.edit}} en sus ajustes o en el icono de carpeta de la lista de objetos, o pulsa [[E]]. Un doble clic sobre el grupo hace lo mismo, como en Tinkercad, también en un conjunto; si no te gusta, desactiva {{ui:workspace.doubleClickOpensGroup}} en los ajustes. Por cierto, una pieza solo empieza a moverse cuando el puntero se ha arrastrado unos cuantos píxeles, así que un clic o un doble clic con el pulso tembloroso no la desplaza. Ahora las piezas están sueltas y las cambias con cualquier herramienta: agrandar un orificio, mover un cuerpo, añadir un orificio.

![El grupo en edición: abajo está la barra con Cancelar y Listo, y la lista de objetos muestra las piezas.](shot:open-group)

En la parte inferior de la vista aparece una barra. {{ui:group.done}} vuelve a construir el grupo, con su nombre, su color y su estado de sólido u orificio. {{ui:common.cancel}} lo deja tal como estaba.

Si una de las piezas es a su vez un grupo, puedes editarla del mismo modo, y así sucesivamente hasta donde llegue tu diseño. La barra muestra dónde estás, por ejemplo «Soporte › Torreta del tornillo». {{ui:group.done}} y {{ui:common.cancel}} cierran siempre el grupo más interior y te devuelven un nivel hacia fuera. Mientras estás dentro de un grupo, solo puedes editar los grupos que haya entre sus piezas; para editar otro, termina primero.

A diferencia de {{ui:editor.tool.ungroup}}, que deshace un grupo para siempre, al editarlo el grupo se conserva: su nombre y sus ajustes se mantienen, y siempre puedes volver atrás con {{ui:common.cancel}}.

Un aviso: los redondeos y chaflanes que hubieras aplicado al grupo **entero** se pierden al reconstruirlo. La barra te lo advierte.

## Dividir

{{ui:editor.tool.split}}, en el grupo {{ui:editor.group.modify}}, corta la selección en dos con un plano: por ejemplo, una pieza demasiado grande para la cama de impresión o una cuyo interior quieres ver. Selecciona uno o varios sólidos u orificios y haz clic en el botón. Un plano translúcido muestra exactamente por dónde irá el corte, y una línea blanca lo marca sobre los propios cuerpos, allí donde el plano se cruza con ellos; no cambia nada hasta que lo aplicas.

- {{ui:split.orientation}}: **X** hace un corte vertical entre izquierda y derecha, **Y** entre delante y detrás, y **Z** un corte horizontal entre arriba y abajo. Los ejes se llaman como en la tarjeta de posición, con Z hacia arriba. El plano empieza paralelo al plano de trabajo; sobre la placa base, por tanto, con Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} coloca el plano paralelo al plano de trabajo; {{ui:split.workplaneAcrossX}} y {{ui:split.workplaneAcrossY}} lo ponen perpendicular a él, atravesando su dirección X o Y. Si el origen del plano de trabajo cae dentro de la selección, el plano pasa por él; si no, por el centro. Así puedes poner el plano de trabajo sobre una cara inclinada con [[W]] y cortar justo ahí, sin tocar los controles deslizantes de giro.
- {{ui:split.position}}: por dónde pasa el plano, con el control deslizante o escribiendo el valor. Empieza en el centro. También puedes arrastrar la punta de la flecha que hay sobre el plano; el plano se desplaza entonces a lo largo de la flecha en pasos de 0,1 mm.
- {{ui:split.pickFace}}, el botón que hay junto a la posición, coloca el plano sobre una cara: haz clic en él y luego en la cara. La orientación, los dos giros y la posición se ajustan a ella. Mientras eliges, un plano azul bajo el puntero muestra qué cara va a tomar. También sirve la cara de un cuerpo no seleccionado, para alinear el corte con ella, pero el plano no sale de la selección. [[Esc]] deja de elegir y deja el plano donde estaba.
- Los dos controles deslizantes de giro que hay debajo giran el plano alrededor de los otros dos ejes, hasta 180° en cada sentido, para hacer un corte inclinado. Se pueden combinar.

{{ui:split.apply}} o [[Intro]] hace el corte, y [[Esc]] lo cancela (mientras eliges una cara, el primer [[Esc]] solo deja de elegir). Cada objeto que atraviesa el plano se convierte en dos cuerpos cerrados, que llevan el nombre de su lado, por ejemplo «Caja (Z+)» y «Caja (Z-)»; los objetos que el plano no toca se quedan como están. Un orificio se convierte en dos orificios, y un cuerpo vaciado conserva su cavidad. Las dos mitades se quedan donde estaban: para imprimirlas, apoya cada una sobre su cara de corte con {{ui:editor.tool.layFlat}}.

Las mitades son simples mallas: ajustes como los lados de un cilindro o las letras de un texto se pierden, así que ajústalos antes. [[Ctrl]]+[[Z]] recupera el original en un solo paso. Los objetos bloqueados u ocultos no se pueden dividir.

## Separar piezas

Si una forma está hecha de varios trozos sueltos, como un texto formado por letras independientes, {{ui:inspector.separateParts}} la divide en formas independientes. La opción también está en el menú que aparece al hacer clic derecho sobre la forma.

> **Consejo:** Haz siempre los orificios un poco más largos que la pieza que tienen que atravesar. Si el orificio termina justo a ras de la cara, a veces queda una piel finísima. Con un milímetro de más vas sobre seguro.
