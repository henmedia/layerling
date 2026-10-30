---
title: "Bocetos: del contorno al cuerpo"
summary: Dibujar un contorno plano, redondear o achaflanar sus esquinas y convertirlo en un cuerpo estirándolo o haciéndolo girar.
---

No todo se puede montar con formas básicas. Para piezas con un contorno propio, como un soporte, el perfil de un diente o un jarrón, primero dibujas el **contorno** y luego haces un cuerpo a partir de él. Para eso está el modo de boceto.

## Empezar un boceto

Arriba, cambia de {{ui:editor.modeGeometry}} a {{ui:editor.modeSketch}}. En el grupo {{ui:sketch.group.create}} de la cinta hay tres botones, uno al lado del otro, según lo que quieras que salga del contorno:

- **{{ui:sketch.extrude}}:** El contorno se estira hacia arriba, como un cortador de galletas.
- **{{ui:sketch.revolve}}:** El contorno gira alrededor de un eje, como en un torno. Así salen jarrones, vasos, conos y todo lo que sea redondo.
- **{{ui:sketch.sweep}}:** El contorno avanza a lo largo de una trayectoria: una canaleta para cables que dobla una esquina, un conducto, un anillo alrededor de una forma. Lo tienes más abajo, en «Barrer a lo largo de una trayectoria».

El editor muestra entonces una hoja con cuadrícula. Esa es tu superficie de dibujo.

## Dibujar

En el modo de boceto, la cinta está dividida en zonas:

- **Dibujar:** {{ui:sketch.line}} traza tramos rectos: haz clic en un punto tras otro; si mantienes pulsada [[Mayús]], la nueva línea se ajusta en pasos de 15°, horizontal y vertical incluidas. Junto al puntero aparecen la longitud y el ángulo de la nueva línea. También puedes escribir cuánto debe medir: lo explica [Líneas a medida](#lineas-a-medida). {{ui:sketch.arc}} dibuja un arco de circunferencia de verdad que pasa por tres puntos: primero haz clic en sus dos extremos y luego en un tercer punto por el que pase el arco; hasta ese tercer clic, una vista previa sigue al puntero y el mensaje indica el radio. Si colocas un extremo sobre un punto que ya existe, se une a él, así que un arco puede cerrar un contorno. [[Esc]] descarta los puntos marcados hasta ese momento y vuelve a {{ui:sketch.select}}. Después, el arco es geometría normal, hecha de puntos y curvas: lo mueves, lo cortas o lo borras como cualquier otra línea. La {{ui:sketch.bezier}} se moldea con sus tiradores: haz clic en un punto y arrastra en la dirección en la que debe continuar la línea, como con la pluma de Illustrator o Inkscape. Cuanto más arrastras, más se curva; el tramo hasta el nuevo punto se va curvando mientras arrastras, así que ves lo que vas a obtener. Arrastrar al colocar un punto curva la línea; si vienes de Tinkercad y solo quieres hacer clic en puntos, usa la {{ui:sketch.smooth}}. La {{ui:sketch.smooth}} traza un recorrido fluido por los puntos en los que haces clic. Para cerrar el contorno, al final vuelve a hacer clic en el primer punto. Para terminar la cadena de líneas sin cerrar el contorno, haz clic derecho sin mover el puntero o doble clic en el último punto.
- **Formas:** {{ui:sketch.addShape}} ofrece contornos ya hechos: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (un disco con orificios), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, un {{ui:sketch.polygon}} y una {{ui:sketch.star}}. Haz clic en una para colocarla en el origen del boceto, o arrástrala desde el menú hasta donde la quieras. Al final del menú, {{ui:sketch.polygonSides}} fija el número de lados del polígono y de puntas de la estrella, y {{ui:sketch.starInner}}, cuánto se adentran los valles de la estrella hacia el centro (del 10 al 90 % del radio exterior); los dos valores se aplican a la siguiente forma que añadas. Como cualquier forma de boceto, después son simples puntos de esquina, así que puedes moverlos, redondearlos o achaflanarlos uno a uno.
- **Superponer:** Si pones dos contornos cerrados uno encima del otro, siguen siendo dos cuerpos, que se fusionan en el Editor 3D; la zona en común no es un orificio. Un orificio solo sale de un contorno que queda entero dentro de otro. Al mover, las líneas no se unen donde se cruzan, así que puedes volver a separar las formas. En cambio, si dibujas una línea que cruza otras, layerling pone un punto en cada cruce.
- **Selección:** {{ui:sketch.select}} mueve puntos y líneas. Un clic dentro de un contorno cerrado selecciona el contorno entero, para que puedas arrastrarlo o cambiar su tamaño enseguida; dentro de un orificio, selecciona el orificio. El marco que rodea la selección tiene ocho tiradores: los de las esquinas cambian la anchura y la altura a la vez, y conservan las proporciones mientras mantienes pulsada [[Mayús]]. Los de los lados solo cambian una dirección. {{ui:sketch.keepProportions}}, en la barra que aparece, conserva las proporciones sin [[Mayús]]: las esquinas y los lados estiran entonces por igual en las dos direcciones, y si escribes una anchura o una altura, la otra cambia también. layerling recuerda esta opción. A su lado, {{ui:sketch.lockOutline}} bloquea el contorno seleccionado, como un cuerpo bloqueado en el Editor 3D ([[Ctrl]]+[[L]] hace lo mismo): ya no se puede mover, redimensionar, girar ni modificar, sus líneas se vuelven más pálidas y sus puntos grises, y los tiradores del marco se vuelven grises y ya no responden. Mientras está seleccionado, un clic en el candado de su esquina lo desbloquea. Aun así, pueden salir líneas de sus esquinas. {{ui:sketch.unlockOutline}}, o volver a pulsar [[Ctrl]]+[[L]], lo libera. Las flechas curvas junto a las esquinas del marco giran toda la selección alrededor de su centro: la cifra sobre el puntero indica el ángulo, y con [[Mayús]] pulsada gira en pasos de 15°. Al girar aparece un anillo: con el puntero dentro, el giro se ajusta en pasos de 22,5°; fuera avanza en grados enteros, sea cual sea la cuadrícula. [[R]] gira 45° un contorno cerrado entero con cada pulsación. Haz clic en la etiqueta de la anchura o de la altura para escribir un tamaño nuevo, también como suma («60+12,5») o en porcentaje («150%»). Con [[Mayús]] pulsada, un clic en un punto o en una línea lo añade a la selección o lo vuelve a quitar, así que puedes elegir varios y moverlos juntos. Arrastra un recuadro sobre una zona vacía para seleccionar todo lo que quede dentro. También se puede arrastrar una línea (se mueve por sus dos extremos o, si forma parte de una selección, se mueve la selección entera). Las teclas de flecha mueven la selección un paso de cuadrícula, y con [[Mayús]], uno mayor; y si mantienes pulsada [[Mayús]] mientras arrastras, el movimiento se limita a un eje. {{ui:sketch.refine}}: un clic en un tramo añade un punto y un clic en un punto lo quita. Además están {{ui:sketch.erase}} (un clic en un punto o en una línea lo quita, una ventana arrastrada sobre varios quita todo lo que hay dentro y, si hay algo seleccionado, el botón borra la selección) y la inserción de una imagen de plantilla ({{ui:sketch.addImage}}). Cuando quitas un punto, layerling une sus dos vecinos para que el contorno siga cerrado. Para cerrar un hueco, por ejemplo después de borrar un lado de un hexágono, arrastra un extremo abierto hasta el otro: se engancha ahí y los dos se convierten en un solo punto, así que el contorno vuelve a quedar cerrado. En un cruce, como donde una línea corta un círculo, se unen los tramos que continúan en la misma dirección: arco con arco, línea con línea, y el círculo sigue siendo redondo. Para quitar solo un trozo de un círculo, por ejemplo para una esquina redondeada, haz clic con el borrador justo en ese trozo de arco entre dos puntos; el resto se queda.
- **Portapapeles:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} y {{ui:editor.tool.delete}} actúan sobre los puntos, las líneas y las imágenes seleccionados, igual que en el Editor 3D; [[Ctrl]]+[[X]] corta. Lo que pegas o duplicas aparece junto al original, a 10 mm de distancia, en un hueco libre donde no toca ninguna línea existente, de modo que nunca se une a lo que ya hay. Se queda seleccionado, para que puedas arrastrarlo directamente a su sitio.
- **Historial:** {{ui:sketch.undo}} y {{ui:sketch.redo}}.
- **Gestionar:** {{ui:editor.tool.note}} (o [[N]]) coloca una nota en el boceto, como en el editor 3D: el siguiente clic la coloca, en cualquier lugar, también sobre una línea. Arrastra la chincheta para moverla; un clic en la chincheta pliega la tarjeta. Las notas de un boceto pertenecen a su cuerpo: en la vista 3D se sitúan encima de un cuerpo hecho con {{ui:sketch.extrude}} o {{ui:sketch.sweep}} y sobre el perfil dibujado de uno hecho con {{ui:sketch.revolve}}, y se mueven con él. Al volver a abrir el boceto se muestran todas las notas del cuerpo, también las colocadas en 3D. {{ui:sketch.undo}} deshace una nota como una línea, y {{ui:sketch.cancel}} descarta lo que cambió en las notas. Más en el capítulo Medidas y notas.
- **Vista:** La desplazas con el botón central del ratón, o con [[Mayús]] o [[Ctrl]] y el botón derecho, como en el Editor 3D. Sin nada seleccionado, [[Ctrl]] y las flechas también la desplazan: una décima parte de la imagen por pulsación, o la mitad si además pulsas [[Mayús]]; el boceto se mueve hacia donde apuntan. [[Inicio]] encuadra el boceto entero, [[F]] hace zoom sobre la selección (sin selección, sobre todo el boceto), y [[+]] y [[−]] acercan y alejan, como en el Editor 3D. Sin nada seleccionado, un doble clic en un sitio vacío desliza la vista para que ese sitio quede en el centro, como en el Editor 3D; {{ui:workspace.doubleClickCentersView}} en los ajustes lo desactiva. La {{ui:camera.tapeTools}} de la barra lateral mide la distancia entre dos puntos. Además, el boceto muestra medidas en cuanto haces clic en algo: la longitud de una línea o, en un punto, las longitudes de las líneas que se juntan en él. El botón {{ui:sketch.showMeasurements}} de la barra lateral oculta y muestra estas medidas cuando estorban, por ejemplo mientras das forma a curvas; la cinta métrica sigue funcionando. En una línea recta puedes hacer clic en la etiqueta de la medida y escribir la longitud en milímetros; [[Intro]] la aplica y [[Esc]] cancela. La línea mantiene su dirección, su punto inicial se queda donde está y las líneas del otro extremo la siguen. Si tienes seleccionado un extremo, se mueve ese. [[Alt]]+[[Intro]] alarga la línea por los dos lados a partir de su centro. En las curvas, la etiqueta solo muestra la longitud.

Un cuerpo solo sale de un contorno **cerrado**.

![Un contorno en forma de L. En el punto de esquina seleccionado, arriba a la izquierda, aparecen las longitudes de las dos líneas en milímetros y el ángulo entre ellas en grados.](shot:sketch-outline)

Las teclas del [[1]] al [[4]] eligen las herramientas de dibujo, en el orden de la barra: {{ui:sketch.line}}, {{ui:sketch.bezier}}, {{ui:sketch.smooth}} y {{ui:sketch.refine}}. Funcionan mientras no estés dibujando una línea; si lo estás, las cifras son su longitud (lo verás a continuación).

## Líneas a medida

Una vez colocado el primer punto con {{ui:sketch.line}} o {{ui:sketch.smooth}}, basta con escribir un número: junto a la línea se abren dos campos, {{ui:sketch.typedLength}} en milímetros y {{ui:sketch.typedAngle}} en grados. [[<]] o [[Tab]] pasa al ángulo, así que «50<30» da una línea de 50 mm a 30°, como en AutoCAD. [[Intro]] fija el punto y puedes escribir la siguiente línea enseguida; [[Esc]] cierra los campos sin terminar la cadena de líneas.

El ángulo se cuenta desde la derecha en sentido antihorario: 0° hacia la derecha, 90° hacia arriba, 180° hacia la izquierda y 270° hacia abajo. Si lo dejas vacío, la línea sigue al puntero: das solo la longitud y marcas la dirección con el ratón. En los dos campos funcionan sumas como «40+12,5». Si el punto fuera a quedar fuera de la hoja, el campo te lo dice y espera otro valor.

## Curvar un lado recto

Selecciona una línea recta y haz clic en {{ui:sketch.curveLine}} en la barra que aparece: el lado se arquea y se convierte en una curva, como en Tinkercad, y muestra sus dos tiradores. Arrástralos para dar forma a la curva; cuanto más se aleja un tirador, más se curva. Bajo el puntero, un tirador se vuelve naranja y también recoge un clic justo al lado, para que una imagen de plantilla debajo no se mueva por error. {{ui:sketch.straightenLine}} vuelve a dejar recto el lado. Un punto seleccionado se puede redondear con {{ui:sketch.smooth}}: recibe sus propios tiradores y las líneas contiguas se convierten en curvas. Con tres o más puntos seleccionados, {{ui:sketch.curveThroughPoints}} en la barra traza una sola curva suave desde el primero hasta el último, pasando por cada punto intermedio, tal como la dibuja la herramienta {{ui:sketch.smooth}}; las líneas más allá de los dos extremos quedan como estaban. En otros programas se llama «Fit curve» o «Fit point spline». La diferencia: {{ui:sketch.curveLine}} curva cada lado seleccionado por separado y mantiene las esquinas entre ellos, para un arco en un lado; {{ui:sketch.curveThroughPoints}} pasa una sola curva por los puntos sin dejar esquinas, para suavizar un borde dentado calcado. Haz clic en un tirador y se ilumina: las teclas de flecha lo mueven entonces un paso de cuadrícula, y con [[Mayús]], un paso mayor, así que puedes ajustar una curva con precisión.

![El lado inferior del contorno en forma de L, curvado, con sus dos tiradores en los extremos.](shot:sketch-curve)

## Leer y escribir ángulos

Haz clic en un punto de esquina donde se juntan **dos líneas rectas**: junto a las longitudes, layerling muestra en grados el **ángulo** que forman, con un pequeño arco. En un contorno cerrado es el ángulo interior de la forma, así que en un entrante pasa de 180°. Haz clic en el valor y escribe un ángulo nuevo. Una de las dos líneas gira entonces alrededor de la esquina y conserva su longitud, y la otra se queda donde está. La línea que gira se dibuja discontinua; [[Tab]] cambia a la otra, [[Intro]] aplica y [[Esc]] cancela. Lo que cuelga del otro extremo de la línea girada se mueve con ella.

Al mover un punto cambian tres ángulos: el del propio punto y los de las dos esquinas vecinas, en el otro extremo de sus líneas. Por eso layerling muestra también esos dos, y en cada uno puedes hacer clic y escribir. Así puedes poner, por ejemplo, la esquina inferior izquierda a 75,5° mientras tienes seleccionado el punto superior izquierdo, que es el que se mueve para conseguirlo. Aquí también puedes hacer cálculos, como «90-14,5».

Una esquina no muestra ningún ángulo si llega a ella una curva o si se juntan en ella más de dos líneas. El botón {{ui:sketch.showMeasurements}} de la barra lateral oculta el ángulo junto con las longitudes.

## Redondear o achaflanar esquinas

Haz clic en un punto de esquina y elige {{ui:sketch.filletCorner}} o {{ui:sketch.chamferCorner}}. Aparece un pequeño campo para el {{ui:sketch.filletRadius}} o la {{ui:sketch.chamferDistance}}. Escribe la medida y confírmala con la marca de verificación. Funciona en esquinas entre dos líneas rectas.

También puedes hacer varias esquinas a la vez: selecciónalas con [[Mayús]] y un clic en cada una, o arrastra un marco a su alrededor, y elige {{ui:sketch.filletCorner}} o {{ui:sketch.chamferCorner}} en la barra que aparece. Todas reciben el mismo radio o la misma distancia. Cuando dos esquinas seleccionadas comparten un lado, cada una ocupa como mucho el 45 % de él, así que un rectángulo redondeado por completo queda igual en todas sus esquinas. Los puntos que no son una esquina entre dos líneas rectas se dejan fuera, y el mensaje dice cuántos son. Un marco alrededor de una forma entera, o un clic dentro de ella, selecciona a la vez sus esquinas y sus líneas, y la barra ofrece entonces, además de las herramientas de esquinas, {{ui:sketch.curveLine}} y {{ui:sketch.straightenLine}} para todas las líneas seleccionadas.

![La esquina superior izquierda se redondea con un radio de 12 mm.](shot:sketch-fillet)

## Reflejar

Selecciona puntos y líneas (con un clic, con [[Mayús]] y clic, o arrastrando un marco a su alrededor) y haz clic en {{ui:sketch.mirror}} en la barra. Después elige el eje: {{ui:sketch.mirrorLeftRight}} refleja respecto al eje vertical que pasa por el centro de la hoja; {{ui:sketch.mirrorTopBottom}}, respecto al horizontal, y {{ui:sketch.mirrorAcrossLine}}, respecto a una línea recta del boceto en la que haces clic a continuación. La copia se añade al otro lado y el original se queda; no hay ningún vínculo, así que puedes cambiar cada uno por separado. Los puntos que están sobre el eje se comparten, de modo que medio contorno con los extremos sobre el eje se convierte en un único contorno cerrado: dibuja la mitad de un soporte, selecciónala, refléjala y haz el cuerpo. Una línea de construcción sirve muy bien de eje. [[Esc]] cancela.

## Líneas de construcción

Una línea de construcción te ayuda a colocar puntos sin formar parte del cuerpo. Se dibuja discontinua y nunca cuenta como contorno: puedes alargarla todo lo que quieras más allá de la forma sin que el cuerpo crezca.

- Activa {{ui:sketch.construction}} en el grupo {{ui:sketch.group.draw}}. Las líneas nuevas, también las que escribes a medida, son entonces líneas de construcción. El mismo botón te devuelve a las líneas normales.
- Una línea ya dibujada se convierte en auxiliar si haces clic en ella y eliges {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} la vuelve a convertir en una línea normal.
- Los puntos nuevos se ajustan a los cruces de una línea de construcción con otra línea (lo indica un anillo azul) y a los extremos de la línea de construcción. Así pones una esquina en un punto medio, a una distancia fija de un lado o en un cruce, sin hacer cálculos.
- Los puntos nuevos también se ajustan al punto medio de cada línea recta del boceto, al centro de cada círculo y de cada esquina redondeada, y a los puntos medios de los lados de un cuerpo que se vea debajo (#624). Un punto que estás arrastrando no tiene en cuenta el punto medio de sus propias líneas.
- {{ui:sketch.fromMiddle}}, en el grupo {{ui:sketch.group.draw}}, dibuja una línea a partir de su centro: haz clic primero en el centro y luego en el extremo, y la línea se prolonga lo mismo hacia el otro lado. El centro pasa a ser un punto más. Vuelve a hacer clic en el botón para dibujar líneas normales.
- Una línea de construcción no corta el contorno donde lo cruza. En una revolución también puede quedar a la derecha del eje.

## Convertirlo en un cuerpo

Haz clic en {{ui:sketch.finishSketch}}. El contorno queda como un cuerpo sobre el plano de trabajo. En sus ajustes cambias la altura, el color y todo lo demás, como en cualquier otra forma. Si cambias su tamaño, layerling lo reconstruye a partir del boceto un momento después, y el boceto crece con él. Así sigue siendo un cuerpo exacto que admite chaflanes y redondeos, y la próxima vez que lo edites, el boceto tendrá el tamaño que tiene el cuerpo.

Si el plano de trabajo está sobre un lateral de un cuerpo, dibujas tal como ves ese lateral: lo que está arriba en el boceto también queda arriba en el cuerpo terminado. El contorno tenue del cuerpo en la vista del boceto muestra dónde está. Si el plano de trabajo atraviesa un cuerpo, la vista del boceto muestra en su lugar el contorno de ese corte, de modo que un cuerpo vaciado aparece como un anillo y puedes alinear el boceto con sus paredes. Un punto que colocas o arrastras cerca de una esquina de estos contornos se ajusta exactamente a ella; lo indica un pequeño anillo azul. Así llevas al boceto aristas de otros cuerpos, aunque el plano de trabajo no esté justo sobre ellas. Para calcar sobre lo que ya tienes hecho, activa {{ui:sketch.showPartEdges}} (el botón de las capas, entre los botones de vista de la izquierda): todas las aristas de los cuerpos se dibujan entonces sobre el plano del boceto, finas y tenues, como si miraras a través de ellos, estén a la altura que estén. Un plano vertical, colocado por ejemplo sobre una cara frontal, muestra así la vista de frente. La elección se guarda en el navegador.

![El contorno se ha convertido en un cuerpo. La esquina está redondeada.](shot:sketch-result)

Con {{ui:inspector.editSketch}} puedes volver al boceto en cualquier momento para cambiarlo. Un doble clic en el cuerpo hace lo mismo, como en Tinkercad (un cuerpo bloqueado no se abre); la opción {{ui:workspace.doubleClickOpensSketch}}, en los ajustes, lo desactiva. Eso sí, los chaflanes y redondeos que ya hubieras hecho en el cuerpo se pierden, porque las aristas se crean de nuevo. Un cuerpo que hayas girado o movido en el editor 3D se abre donde está sobre la placa, girado como lo ves allí y sobre la cuadrícula de la placa; solo un cuerpo inclinado o reflejado se abre en su propia orientación.

Un boceto con varios contornos da un solo cuerpo, y los contornos que se superponen se fusionan en él. Para que cada contorno vaya por su cuenta, selecciona el cuerpo y haz clic en {{ui:inspector.separateParts}}: cada contorno exterior pasa a ser un cuerpo independiente, con los orificios que tiene dentro, y conserva la altura, el color y la posición del cuerpo. Cada pieza tiene su propio boceto para editar, con las líneas de construcción, así que puedes subir o bajar las piezas una a una y después unirlas o restarlas. Los chaflanes y redondeos lo impiden, igual que haber estirado el cuerpo después: en ese caso se separa como malla.

**Otro tipo de cuerpo a partir del mismo boceto:** el indicador de la parte de arriba del boceto dice en qué se va a convertir: {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} o {{ui:sketch.modeBadgeSweep}}. Haz clic en él y elige otro, también mientras editas un cuerpo existente: un SVG importado, que llega extruido, se convierte en un jarrón o en un pomo si lo cambias a {{ui:sketch.modeBadgeRevolve}}. Un contorno que cruza el eje se desplaza a la izquierda hasta que su extremo derecho queda sobre el eje, así que la media sección de un SVG gira alrededor de su lado recto; [[Ctrl]]+[[Z]] deshace el desplazamiento. Al terminar, el cuerpo nuevo ocupa el lugar del anterior, con su nombre y su color, y con la base a la misma altura. Los chaflanes y redondeos se pierden, como en cualquier edición de un boceto.

### Revolución

En una revolución, dibujas media sección **a la izquierda del eje** que aparece en el boceto. Al lado ves una vista previa en 3D de la revolución, que muestra al instante cómo será el cuerpo. El contorno tiene que estar cerrado; si no, construye la línea abierta como trazo (lo verás más abajo). Al final, haz clic en {{ui:sketch.finishRevolve}}. Los demás cuerpos del diseño se ven de frente, en la misma vista que el perfil, con el eje en el centro: dibuja el perfil al lado o encima de ellos. El cuerpo queda donde lo dibujaste, y la línea horizontal que pasa por el centro del boceto es el suelo: un perfil dibujado por encima de ella da un cuerpo que queda más alto, y su punto más bajo es la base del cuerpo.

Un cuerpo de revolución es un cuerpo exacto, igual que uno extruido: admite chaflanes y redondeos, y puedes vaciarlo para hacer un vaso o un jarrón. Un cuerpo de revolución hecho con una versión antigua de layerling es una malla; abre {{ui:inspector.editSketch}} y vuelve a terminarlo para que sea exacto. Un perfil que cruza el eje no se puede construir de forma exacta y se convierte en una malla, como antes.

**Una hebra continua: {{ui:prop.pitch}}.** Una revolución convierte su contorno en anillos cerrados. Selecciona el cuerpo de revolución y, en el panel de propiedades, dale a {{ui:prop.pitch}} un valor mayor que 0, que es lo que sube en cada vuelta: el contorno se enrolla entonces en hélice, como una hebra continua, igual que el filamento en una bobina o una espiral. El ajuste {{ui:prop.sweep}} pasa a ser {{ui:prop.turns}}, hasta 200; un número negativo enrolla a izquierdas. Si las vueltas están más juntas de lo que mide de alto el contorno, se funden en un solo cuerpo, así que también funciona un núcleo macizo con un paso fino. Una hélice se construye como malla, así que no admite redondeos, chaflanes ni vaciado; con muchas vueltas, mantén bajo el valor de {{ui:prop.sides}}. Un paso de 0 vuelve a dar anillos.

## Barrer a lo largo de una trayectoria

{{ui:sketch.sweep}} hace avanzar un contorno a lo largo de una trayectoria: una canaleta para cables que dobla una esquina, un conducto, un protector alrededor de una correa, un anillo alrededor de un hexágono. Está junto a {{ui:sketch.extrude}} y {{ui:sketch.revolve}}, en el grupo {{ui:sketch.group.create}}.

Dibujas dos cosas en la misma hoja:

- **La sección**, como un contorno cerrado, igual que siempre. Dibújala tal como la verías si miraras a lo largo de la trayectoria desde su inicio: lo que va de lado a lado de la trayectoria es la izquierda y la derecha del boceto, y arriba es arriba en el cuerpo terminado. Una sección hueca, la de una canaleta o la de un tubo, es un contorno con otro dentro. De forma predeterminada, la sección se centra en la trayectoria. El menú que hay junto al indicador de arriba te deja poner en su lugar su borde izquierdo o derecho sobre la trayectoria ({{ui:sketch.sweepAnchorLeft}}, {{ui:sketch.sweepAnchorRight}}, mirando a lo largo de la trayectoria), para que un carril quede a un lado de la línea o siga el borde de una pieza. El cuerpo se apoya en el plano del boceto por el punto más bajo de la sección.

- **La trayectoria**, como una {{ui:sketch.construction}}: actívala y dibuja líneas o curvas, en una sola cadena, abierta o cerrada (una cadena cerrada da un anillo). La trayectoria queda plana en el plano del boceto.

Dibuja la sección cerca del extremo de la trayectoria por el que debe empezar; la trayectoria empieza en el extremo que le queda más cerca. Después haz clic en {{ui:sketch.finishSweep}}. Una esquina formada por tramos rectos se convierte en un inglete, una curva sigue siendo suave, y la sección se mantiene vertical durante todo el recorrido. El cuerpo es exacto, como uno extruido: admite redondeos, chaflanes y la exportación a STEP. Si falta un contorno cerrado o una trayectoria, o si hay varias trayectorias separadas, layerling te lo dice. Con {{ui:inspector.editSketch}} puedes volver al boceto y cambiar la sección o la trayectoria.

## Construir como trazo

Normalmente, el cuerpo es la superficie que hay dentro de un contorno cerrado. Con {{ui:sketch.stroke}}, en la sección {{ui:sketch.group.finish}}, construyes en cambio la propia línea, con la anchura que elijas. Marca {{ui:sketch.strokeOn}} en el panel; el boceto muestra enseguida lo que va a salir.

- Un **contorno cerrado** se convierte en un marco. {{ui:sketch.strokeAlign}} indica dónde queda la pared: {{ui:sketch.strokeAlign.center}}, sobre la línea dibujada; {{ui:sketch.strokeAlign.inside}}, por dentro, o {{ui:sketch.strokeAlign.outside}}, por fuera. Por fuera viene bien para una tolerancia: dibuja el contorno de un orificio, por ejemplo una cola de milano, y dale un trazo exterior de 0,2 mm para conseguir la holgura que necesita la pieza impresa.
- Una **línea abierta** se convierte en una franja centrada en la línea. {{ui:sketch.strokeCap}} fija cómo son sus extremos: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (más larga en media anchura) o {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} vale para los dos casos: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} o {{ui:sketch.strokeJoin.bevel}}.

El boceto conserva la línea dibujada. Si lo vuelves a abrir, sigues cambiando la línea y el trazo; si desmarcas la casilla, se vuelve a construir la superficie. Para ello, las curvas se dividen en tramos rectos cortos.

En una revolución, el trazo es una pared fina: dibuja la pared de un jarrón o de un vaso como **una sola línea abierta** a la izquierda del eje, activa {{ui:sketch.stroke}} y fija la anchura, y la revolución hace girar esa banda. Lo que cruza el eje se recorta en él.

## Relleno y silueta

También puedes fijar el trazo sin abrir el boceto: en las propiedades de un cuerpo de boceto, elige {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} o {{ui:prop.sketchFill.center}} en {{ui:prop.sketchFill}}, junto con {{ui:prop.sketchLineWidth}} y {{ui:sketch.strokeJoin}}. El cuerpo se vuelve a construir al momento, donde está. Equivalen a los modos de relleno de la importación de SVG de Tinkercad: predeterminado, línea exterior y línea interior. {{ui:prop.sketchFill.grow}} mantiene la superficie rellena y la agranda por todo el contorno en la anchura de la línea, con esquinas vivas, redondeadas o biseladas: es la capa base bajo un logotipo para una impresión multicolor, que con el trazo exterior por sí solo saldría como un anillo. {{ui:prop.sketchFill.shrink}} hace lo contrario: la superficie sigue rellena y su borde se desplaza hacia dentro en la anchura de la línea por todo el contorno, orificios incluidos (que crecen). Usa las dos opciones en copias de un mismo boceto para que algo encaje: el orificio a su tamaño dibujado y la pieza que pasa por él, con {{ui:prop.sketchFill.shrink}} de 0,5 mm, o una pared dentro de una forma recortada con el mismo contorno. Una anchura mayor de la que admite el contorno no deja nada. En el panel de trazo del boceto, estas dos mismas opciones están en {{ui:sketch.strokeAlign}}.

{{ui:prop.sketchSilhouette}} deja fuera todos los contornos que quedan dentro de otro: los orificios y lo que haya dentro de ellos. Solo queda el contorno exterior. Junto con {{ui:prop.sketchFill.outside}} sirve para hacer un cortador de galletas: importa un SVG dos veces, una con la silueta como superficie para la base y otra con la silueta y entre 1 y 2 mm de trazo exterior para la pared. Esta opción también está en el panel {{ui:sketch.stroke}} del modo de boceto.

Los redondeos y chaflanes de las aristas se pierden cuando el cuerpo se vuelve a construir, igual que al editar el boceto.

## Paredes inclinadas, para sellos

Un boceto extruido tiene las paredes verticales. Un sello, una matriz para estampar en relieve o un punzón las necesitan inclinadas, por fuera y por dentro, con el mismo grosor de pared en todo el recorrido. layerling no tiene ángulo de desmoldeo para la extrusión, pero con contornos sencillos lo consigues con {{ui:inspector.taper}}. Un método que funciona:

1. Dibuja el contorno con el orificio que necesita y haz un cuerpo con él. Duplica el cuerpo ([[Ctrl]]+[[D]]).
2. En el primer cuerpo, activa {{ui:prop.sketchSilhouette}}, para que el orificio quede relleno, y con {{ui:inspector.taper}} dale una base más ancha que la parte de arriba.
3. En la copia, vuelve a abrir su boceto y elimina el contorno exterior, de modo que solo quede el contorno del orificio. Termina el boceto, cambia el cuerpo a {{ui:inspector.hole}} y con {{ui:inspector.taper}} dale una base más estrecha que la parte de arriba.
4. Mete el orificio en el primer cuerpo, donde estaba el orificio, y agrupa los dos.

Ahora las paredes están inclinadas por fuera y por dentro. Esta opción escala el contorno entero, así que el resultado es exacto en formas sencillas, en las que puedes elegir las medidas para que las paredes queden paralelas, y solo aproximado en detalles finos como las letras.

## Una imagen como plantilla

Con {{ui:sketch.addImage}} pones una foto o un dibujo debajo del boceto y lo calcas. Puedes ajustar su tamaño, su opacidad y su posición. Cuando la imagen esté bien colocada, bloquéala con [[Ctrl]]+[[L]] para no moverla sin querer mientras dibujas. Una imagen bloqueada no estorba: los clics la atraviesan, así que puedes elegir líneas y puntos que estén encima y arrastrar un marco sobre ellos. Un clic en el candado de su esquina la desbloquea; [[Alt]]+clic la selecciona sin desbloquearla. Si sus ajustes, en el borde derecho, tapan la imagen, apártalos arrastrándolos por la barra de título; con un doble clic en ella vuelven a acoplarse.

En {{ui:sketch.imageAlign}} enderezas una foto que salió torcida:

- **{{ui:sketch.imageRotation}}:** Gira la imagen alrededor de su centro, con las flechas curvas junto a sus esquinas o escribiendo los grados. Con [[Mayús]], las flechas se ajustan en pasos de 15°. Dentro del anillo que aparece al girar se ajustan en pasos de 22,5°, fuera en grados enteros.
- **{{ui:sketch.centreImageX}}** y **{{ui:sketch.centreImageY}}:** colocan el centro de la imagen en X = 0 o en Y = 0. En una revolución, X = 0 es el eje, así que la imagen queda simétrica respecto a él.
- **{{ui:sketch.calibrateImage}}:** Su botón está arriba, justo debajo de la vista previa. Haz clic en dos puntos de la imagen cuya distancia conozcas, como los extremos de una regla o un diámetro conocido, y escribe la distancia real. La imagen se escala por igual para que esa distancia sea correcta; el primer punto se queda donde estaba.
- **{{ui:sketch.cropImage}}:** Los tiradores del marco recortan ahora la imagen en lugar de escalarla; lo recortado se guarda y vuelve con {{ui:sketch.uncropImage}} o al volver a estirar un tirador hacia fuera.

Las cuatro actúan solo sobre la imagen de plantilla, nunca sobre el boceto.

## Teclas en el modo de boceto

| Tecla | Efecto |
| --- | --- |
| [[Esc]] | soltar la herramienta de notas; si no, soltar la herramienta (volver a {{ui:sketch.select}}) y, después, quitar la selección |
| [[Supr]] | eliminar el elemento seleccionado |
| [[Ctrl]]+[[C]] | copiar la selección |
| [[Ctrl]]+[[X]] | cortar la selección |
| [[Ctrl]]+[[V]] | pegar |
| [[Ctrl]]+[[D]] | duplicar la selección |
| [[Ctrl]]+[[Z]] | deshacer |
| [[Ctrl]]+[[A]] | seleccionar todos los puntos y líneas |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Mayús]] | al dibujar: ajustar la línea en pasos de 15°; al arrastrar: limitar el movimiento a un eje |
| cifra, [[<]], [[Tab]], [[Intro]] | al dibujar: escribir y fijar la longitud y el ángulo de la línea siguiente |
| [[R]] | girar 45° el boceto cerrado |
| [[Ctrl]]+[[L]] | bloquear o desbloquear el contorno seleccionado o la imagen de plantilla |
| [[N]] | colocar una nota: el siguiente clic la pone en el boceto |
| [[Mayús]]+[[N]] | mostrar u ocultar las notas |

> **Consejo:** Dibuja solo los puntos que hagan falta. Un contorno con pocos puntos bien colocados da un cuerpo más suave que una maraña de muchos.
