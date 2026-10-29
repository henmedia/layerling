---
title: Colocar y ajustar formas
summary: La biblioteca de formas, las medidas con números y con los tiradores, el color, el giro, el estrechamiento y la torsión.
---

En layerling, toda pieza empieza por una forma. Con ellas construyes todo lo demás: las formas se complementan, se recortan unas a otras o se unen en una forma nueva.

## Añadir una forma

Haz clic en {{ui:editor.addShape}}, en la cinta. Se abre la biblioteca de formas.

![La biblioteca de formas. Cada miniatura se genera a partir de la geometría real de la forma.](shot:shape-menu)

La biblioteca se cierra cada vez que eliges una forma. Puedes arrastrarla por la barra de título y llevarla a donde no tape el sitio en el que vas a colocar la forma, por ejemplo encima del panel de propiedades; un doble clic en la barra de título la devuelve a su sitio, debajo de su botón, y el navegador recuerda dónde la dejaste. La chincheta de la barra de título mantiene la biblioteca abierta mientras colocas varias formas seguidas. Tirando de sus bordes y esquinas la agrandas o la reduces, hasta tan ancha y tan alta como permita tu pantalla; el navegador también recuerda el tamaño, y un doble clic en un borde lo devuelve al original. Si la estrechas mucho, la biblioteca deja de mostrar los nombres y enseña solo las imágenes; el nombre aparece cuando pasas el ratón por encima de una forma.

Elige una forma. Ahora va pegada al puntero del ratón y se coloca donde hagas clic. Si la pasas por encima de un cuerpo, se apoya sobre la cara que queda bajo el puntero, también sobre las inclinadas, como el Cruise de Tinkercad; sobre la placa vacía, se coloca en el plano de trabajo. [[Esc]] cancela la colocación. Las herramientas que esperan un clic, como la cinta métrica, la escuadra, una nota, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} o las herramientas de aristas, se desactivan al elegir una forma, para que el clic coloque la forma. Y al revés: si activas una de esas herramientas, se cancela la forma que estabas colocando. Si prefieres que la forma aparezca en el centro de la placa, puedes desactivar la colocación con clic en los ajustes (apartado {{ui:workspace.appearance}}, interruptor {{ui:workspace.cruise}}).

Sobre una cara, la forma se ajusta al centro de esa cara cuando el puntero se acerca, como en una esquina o una arista; mantén [[Alt]] para dejarla en cualquier sitio. Si la arrastras desde la biblioteca a una cara, siempre cae en el centro, o con [[Alt]] donde la sueltes.

Lo que ofrece la biblioteca:

- **Formas básicas:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (de tres a veinticuatro lados), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (de tres a veinticuatro lados, así que también triangular), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} y {{ui:shape.torus}}.
- **Tubos:** {{ui:shape.tube}} y {{ui:shape.bentTube}}, formado por hasta doce tramos rectos con curvas entre ellos, y el {{ui:shape.loft}}, que pasa de un contorno a otro, por ejemplo de cuadrado a redondo.
- **Formas decorativas:** {{ui:shape.star}}, {{ui:shape.heart}} y {{ui:shape.crescent}}.
- **Letras:** {{ui:shape.text}}, también a lo largo de un arco de circunferencia. Más en [Texto](chapter:text).
- **Mecánica:** {{ui:shape.thread}} (varilla roscada, tornillo, tuerca y orificio roscado), {{ui:shape.spring}}, cajas y placas base de {{ui:shape.gridfinity}}, {{ui:shape.gear}} y el {{ui:shape.knurl}} para empuñaduras. Más en [Roscas y mecánica](chapter:threads-and-mechanics).
- **Para construcciones:** la {{ui:shape.hinge}} que se imprime ya articulada, la {{ui:shape.dovetail}}, el {{ui:shape.teardrop}} para orificios horizontales, el {{ui:shape.counterbore}} y el {{ui:shape.countersink}} para cabezas de tornillo, y la {{ui:shape.ruler}}, que es solo una herramienta de medida y nunca aparece en una exportación.

Un triángulo se consigue de dos maneras: el {{ui:shape.polygon}} de tres lados es un triángulo isósceles, el «Tejado» de Tinkercad, y la {{ui:shape.wedge}} es un triángulo rectángulo. Los dos son prismas triangulares de verdad. Para un orificio triangular, copia la forma, haz la copia más pequeña, conviértela en orificio y alinéala con {{ui:editor.tool.centerOnWorkplane}} o {{ui:editor.tool.align}}. Las dos herramientas trabajan con el cuadro delimitador de la forma, la caja más pequeña que la contiene, así que un cuadrado partido por la mitad sigue contando como un cuadrado entero. La búsqueda de comandos ([[Ctrl]]+[[K]]) también encuentra las dos formas si buscas «triángulo» o «tejado».

La {{ui:shape.slot}} puede ser más estrecha por un extremo que por el otro, por ejemplo para un protector que cubra una correa entre dos poleas. En {{ui:inspector.properties}}, ajusta {{ui:prop.slotSmallEnd}}; el extremo grande es tan ancho como la cápsula, y los lados van en línea recta de un arco al otro. {{ui:prop.slotCentreDistance}} es la distancia entre los centros de los dos arcos, es decir, la separación entre las poleas. Si cambias el extremo pequeño, la distancia entre centros se mantiene y la cápsula se alarga o se acorta. La cápsula estrechada también sigue siendo un cuerpo exacto, para redondeos y para STEP.

## Los ajustes de la forma

En cuanto seleccionas una forma, sus ajustes aparecen a la derecha. Arriba del todo está el nombre; con el lápiz que hay al lado ({{ui:outliner.rename}}) escribes uno nuevo. [[Intro]] lo confirma, [[Esc]] cancela y, si dejas el nombre vacío, la forma recupera su nombre predeterminado. Más a la derecha, el candado bloquea la forma para que no la muevas sin querer, y el ojo la oculta. La flecha del extremo izquierdo pliega los ajustes hasta dejar solo su barra de título. Las tarjetas de debajo se despliegan y se pliegan con un clic en su título ({{ui:inspector.properties}}, {{ui:inspector.position}}, {{ui:inspector.rotation}}, {{ui:inspector.taper}}, {{ui:inspector.twist}} y las tarjetas de las formas especiales); layerling recuerda cuáles dejaste abiertas, para la siguiente forma y para la próxima vez.

Los ajustes están acoplados al borde derecho. Si tapan algo que quieres ver, arrástralos por su barra de título y se quedarán flotando donde los sueltes, también para la siguiente forma. Si los vuelves a soltar arriba a la derecha, o haces doble clic en la barra de título, se acoplan otra vez. Mientras flotan o están plegados, el paso de ajuste pasa de la parte de abajo de los ajustes a la esquina inferior derecha del plano de trabajo.

![Los ajustes de un cilindro: sólido u orificio, y el diámetro y la altura como número y como control deslizante.](shot:editor-overview)

- **{{ui:inspector.solid}} o {{ui:inspector.hole}}:** Un sólido pone material y un orificio lo quita. Un clic en {{ui:inspector.solid}} abre los colores; los colores propios que mezcles ahí te esperan después en {{ui:inspector.recentColors}}: los ocho últimos. Más en [Sólidos y orificios](chapter:solids-and-holes). La chincheta de la fila {{ui:inspector.keptColors}} guarda para siempre el color que has elegido: queda en una fila aparte, los colores más nuevos nunca lo desplazan, y la misma chincheta lo vuelve a soltar; este navegador guarda hasta 21 colores.
- **{{ui:inspector.transparent}}:** Deja ver a través del cuerpo, por ejemplo para localizar una forma que hay detrás.
- **{{ui:inspector.multicolor}}:** Solo en un grupo; [[Mayús]]+[[M]] lo activa y lo desactiva. Activado, cada pieza del grupo se ve con su propio color, también en un grupo en el que los orificios ya se han recortado y forman un solo cuerpo (las paredes que deja un orificio toman el color del cuerpo en el que se recortó). Si eliges un color para el grupo, se desactiva y todo el grupo se pinta de ese color. Los conjuntos siempre conservan los colores de sus piezas. En una exportación 3MF, cada pieza conserva su color, para que el laminador (*slicer*) pueda asignar las piezas a filamentos; OBJ lleva los colores en sus vértices, así que ahí la frontera entre dos colores queda algo más tosca.
- **{{ui:inspector.properties}}:** Las medidas y todo lo propio de esta forma. En un cilindro, el diámetro, la altura y el número de lados. En un tubo o un anillo redondos, el {{ui:prop.outerDiameter}}, el {{ui:prop.innerDiameter}} (para un casquillo sobre un eje de medida conocida) y el grosor de pared: dos cualesquiera dan el tercero, en el orden en que los escribas. El diámetro exterior conserva el hueco y cambia la pared; el interior conserva el diámetro exterior y cambia la pared, y un hueco más ancho que el tubo hace crecer el diámetro exterior en lo que mide la pared. La longitud del tubo es su altura. Un tubo que ya no es redondo, porque has tirado de uno de sus lados, tiene los lados Longitud y Anchura en lugar del diámetro exterior único; en ese caso, la pared se mantiene cuando cambias la anchura. En un engranaje, los dientes; en un muelle, las espiras. Un valor que hayas cambiado respecto al predeterminado lleva una flechita junto a su nombre: un clic devuelve solo ese valor, hagas lo que hayas hecho después, a diferencia de Deshacer. Un doble clic en un control deslizante hace lo mismo, aquí y en los controles deslizantes de los ajustes del espacio de trabajo. Si lo arrastras con el ratón, el control deslizante de una longitud va a saltos del paso de ajuste, así que una altura sale en milímetros enteros (salvo con la cuadrícula desactivada o en los controles deslizantes cortos); un valor escrito y las teclas de flecha sobre el control deslizante son exactos. {{ui:inspector.saveDefaults}}, abajo, convierte los valores actuales en los valores iniciales de este tipo de forma (lo mismo que {{ui:workspace.shapeDefaults}} en los ajustes), y {{ui:inspector.resetDefaults}} vuelve a los de la aplicación. Con {{ui:prop.tubeBoreHole}} el agujero cuenta como hueco al agrupar el tubo: así también corta la pared de aquello con lo que se agrupa, y dos tubos en una unión en T se abren uno hacia el otro.
- **{{ui:inspector.makeEllipse}}:** Solo en un cilindro. Un cilindro siempre es redondo: tiene un único diámetro, y cada tirador cambia los dos lados a la vez. Para un óvalo, haz clic aquí y se convierte en una {{ui:shape.ellipse}}: el mismo cuerpo, pero con la longitud y la anchura por separado. Un cilindro con chaflán, redondeo o pared, o uno girado o agrupado, no se puede convertir así; en esos casos, empieza directamente con la {{ui:shape.ellipse}}.
- **{{ui:inspector.taper}}:** Medidas distintas arriba y abajo, por ejemplo para una pendiente o un embudo.
- **{{ui:inspector.twist}}:** Gira la cara superior respecto a la inferior o la desplaza hacia un lado. Así salen columnas retorcidas y torres inclinadas.

![Un grupo formado por un bloque naranja, un tetón azul y un orificio, recortados en un solo cuerpo. Con Multicolor activado, el tetón sigue azul, el bloque naranja, y las paredes del orificio toman el color del bloque.](shot:group-multicolor)

El estrechamiento y la torsión funcionan en casi todas las formas. Las únicas que no los tienen son el engranaje, la rosca, el muelle, Gridfinity, la bisagra, la pirámide, el tubo curvado, el orificio en lágrima, el escariado, el avellanado y la regla: tienen medidas fijas propias o, como la pirámide, ya tienen su propia parte superior.

![Un cono al que se le han cambiado el radio superior y la altura: la flechita junto a cada valor lo devuelve al original, y los dos botones de abajo guardan o restablecen los valores predeterminados de la forma.](shot:property-reset)

{{ui:inspector.saveDefaults}} guarda lo que has cambiado en esta forma como punto de partida de cada forma nueva de su tipo: las medidas, los ajustes de la forma y su color. Pinta un cilindro de verde, pulsa el botón, y todos los cilindros que añadas a partir de entonces serán verdes; los demás tipos conservan sus propios colores. {{ui:inspector.resetDefaults}} devuelve el tipo a los valores con los que lo trae la aplicación. Los tipos que tienen valores predeterminados propios aparecen marcados en los ajustes, en {{ui:workspace.shapeDefaults}}. Un diseño nuevo que empieces desde la página de inicio también los usa; los valores se guardan en este navegador.

Una caja, un cilindro, una elipse, un polígono, un tubo o un anillo estrechados o inclinados conservan su forma exacta, y lo mismo pasa con la cápsula, la estrella, el corazón, la media luna, la cola de milano, una caja redondeada sin redondeo en las aristas superior e inferior y un moleteado recto o redondo (los chaflanes de sus extremos se estrechan con él): los chaflanes y los redondeos funcionan igual que en la forma sin modificar, y la exportación STEP la guarda tal cual. Lo mismo vale para una forma torcida: su sección gira de forma exacta a medida que sube, y los lados se enroscan de manera uniforme de abajo arriba.

Escribir es más exacto que arrastrar. Todos los campos numéricos admiten milímetros, pero también porcentajes: si escribes «50 %» en una anchura de 40 mm, obtienes 20 mm. También calculan: «15*3», «120-2*4» o «(40+2)/2» dan 45, 112 y 21; en lugar de * también vale x. El campo recuerda la operación, tanto en el panel de propiedades como en los recuadros de medida que rodean el cuerpo seleccionado: si más tarde vuelves a hacer clic en él, aparece la fórmula en lugar del número, mientras el valor siga coincidiendo con ella, y la puedes cambiar ahí mismo: «(140+2)/2» pasa a ser «(40+6)/2». Si arrastras el cuerpo por un tirador o lo escalas, la fórmula deja de cuadrar y el campo vuelve a mostrar solo el número. En un campo numérico en el que has hecho clic, la rueda del ratón y las teclas [[↑]] y [[↓]] cambian el valor un paso, con [[Shift]] un paso mayor y con [[Alt]] uno más fino. En un campo de tamaño o posición, [[Shift]] avanza en cambio un paso de la cuadrícula, y diez pasos si la cuadrícula está desactivada.

### Elegir colores

Un clic en {{ui:inspector.solid}}, en las propiedades de un cuerpo, abre la tarjeta de colores, con el título {{ui:inspector.shapeColor}}. Arriba muestra el valor hexadecimal del color que tiene ahora el cuerpo. Debajo están los colores ya preparados de la paleta; un clic en uno pinta el cuerpo y cierra la tarjeta.

{{ui:inspector.custom}} abre el selector de color de tu navegador, para un color a tu gusto. Lo que ofrece depende del navegador: en Chrome y Edge tiene un campo de color, un control deslizante para el tono, un cuentagotas que toma un color de cualquier punto de la pantalla y el valor en HEX, RGB o HSL, entre los que cambias con las flechas de al lado. El color se aplica cuando cierras el selector o haces clic fuera de él.

Los colores propios que mezcles ahí te esperan después en {{ui:inspector.recentColors}}: los ocho últimos. La chincheta de la fila {{ui:inspector.keptColors}} guarda para siempre el color que has elegido: queda en una fila aparte, los colores más nuevos nunca lo desplazan, y la misma chincheta lo vuelve a soltar; este navegador guarda hasta 21 colores. La chincheta es para los colores propios; los de la paleta están siempre. Con varios colores en la selección, o con un orificio, no hay un único color que guardar.

Los colores de la zona de trabajo, en los ajustes, tienen su propio selector, más sencillo, con un campo de color, una fila de colores preparados y un campo para el valor hexadecimal; consulta [Los ajustes](chapter:view-and-workplane).

## ¿Cómo de redondo es redondo? El número de lados

Las formas redondas, como el cilindro, el cono, el tubo, la elipse o los taladros, tienen en sus propiedades el interruptor {{ui:prop.sidesFollowSize}} y el control deslizante {{ui:prop.sides}}. El {{ui:shape.torus}} tiene dos controles deslizantes: {{ui:prop.torusSides}}, alrededor del anillo, y {{ui:prop.torusSteps}}, alrededor del tubo. También ahí siguen al tamaño hasta que los fijas, así que un toroide grande no muestra facetas. El motivo: para la vista y para STL, 3MF y OBJ, layerling dibuja un círculo como un polígono de muchos lados pequeños. Cuantos más lados, más liso queda, y más triángulos hacen falta.

{{ui:prop.torusTube}} fija lo grueso que es el tubo visto desde arriba. La altura solo aplasta o estira el tubo, así que un anillo plano conserva su agujero; a la mitad de la medida exterior el agujero se cierra. Al tirar de los tiradores, el tubo se escala con la forma. Solo un toro cuyo tubo es tan grueso como alto es el toro sigue siendo un cuerpo exacto para chaflanes, redondeos y STEP.

**Dónde importa el número de lados**

- **En la exportación para el laminador** (STL, 3MF, OBJ). Un cilindro con pocos lados llega allí como un polígono.
- **Al combinar cuerpos y orificios.** Un taladro hecho con un orificio de pocos lados queda poligonal en la pieza terminada. Eso incluye los orificios para tornillos.
- **En la vista.** Muchas formas muy finas ralentizan el editor.

**Dónde no importa**

- **En la exportación STEP.** Guarda la forma redonda, no el polígono.
- **En chaflanes y redondeos** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}), mientras la forma siga siendo redonda. Lo es si no has fijado un número de lados, si el número es al menos el predeterminado de la forma o si el polígono se aparta como mucho {{value:EXACT_ROUND_TOLERANCE}} mm del círculo. El valor predeterminado es de {{value:ROUND_FROM_SIDES}} lados en el cilindro, la elipse, el tubo y el cono; {{value:ROUND_FROM_ROOF_SIDES}} en el {{ui:shape.roundRoof}}; {{value:ROUND_FROM_SPHERE_STEPS}} pasos en la {{ui:shape.sphere}}; {{value:ROUND_FROM_HALF_SPHERE_STEPS}} en la {{ui:shape.halfSphere}}; {{value:ROUND_FROM_TORUS_SIDES}} lados y {{value:ROUND_FROM_TORUS_STEPS}} pasos en el {{ui:shape.torus}}, y una {{ui:prop.quality}} de {{value:ROUND_FROM_BENT_TUBE_QUALITY}} en un {{ui:shape.bentTube}} redondo.
- **En una rosca, un muelle o un engranaje helicoidal.** La herramienta de aristas y la exportación STEP usan su cuerpo exacto; su {{ui:prop.quality}} solo decide con qué finura se dibuja.

**Dónde vuelve a importar**

- **En chaflanes y redondeos sobre una forma de pocos lados.** Si pones el número de lados por debajo del predeterminado, la herramienta de aristas toma la forma tal como está dibujada: un cilindro de 6 lados sigue siendo una barra hexagonal, y el redondeo recorre sus seis aristas. Así puedes construir, por ejemplo, un alojamiento para tuerca con las esquinas redondeadas. Para una forma redonda, deja activado {{ui:prop.sidesFollowSize}}.

**Cómo usarlo**

- **Deja activado {{ui:prop.sidesFollowSize}}.** Así layerling elige el número de lados según el diámetro, de modo que el polígono se aparte como mucho {{value:ROUND_DEVIATION_TOLERANCE}} mm del círculo real, muy por debajo de lo que resuelve una impresora. Las formas pequeñas tienen al menos {{value:MIN_AUTOMATIC_SIDES}} lados; las grandes, más.
- **Menos lados** te convienen cuando quieres un polígono a propósito (aunque para eso está el {{ui:shape.polygon}}) o cuando el editor va lento con muchísimas formas redondas.
- **Más lados** casi nunca te harán falta. Solo en piezas redondas muy grandes, cuando ves aristas en el STL.
- **En piezas que solo vas a tratar con las herramientas de aristas o a entregar como STEP,** el número de lados da igual.

## Trabajar con los tiradores

Además de los ajustes, la propia forma tiene tiradores:

- Las **esquinas y aristas** agrandan o encogen la forma. Si arrastras una más allá del lado opuesto, la forma sigue creciendo por allí, al otro lado de esa arista. La flecha de arriba hace lo mismo por debajo de la base. Mantén pulsada [[Mayús]] mientras arrastras una esquina para escalar a la vez la anchura, la profundidad y la altura y conservar las proporciones; mantén pulsada [[Alt]] para escalar desde el centro en lugar de desde la esquina opuesta. Sin teclado, o si no quieres mantener pulsada una tecla, activa {{ui:inspector.keepProportions}} arriba, en las propiedades: así las esquinas siempre conservan las proporciones y, si escribes la anchura, la profundidad o la altura, las otras dos se escalan en la misma proporción. El ajuste se recuerda.
- La **flecha negra encima** de la forma la sube o la baja; con [[Alt]] pulsada desde el principio se crea una copia donde sueltas, para apilar. El tirador blanco **de la cara superior** cambia la altura.
- Las **flechas curvas** la giran.
- Los **números** junto a la forma muestran las medidas. Un clic en uno abre un campo en el que escribes el número que quieras. Con [[Intro]], la forma crece desde la arista opuesta al número, como al arrastrar; con [[Alt]]+[[Intro]] crece alrededor de su centro, así que una forma que estaba alineada con otra sigue alineada. Esto vale para la anchura y la longitud; la altura siempre crece hacia arriba desde la cara inferior. Los campos de las propiedades, a la derecha, mantienen el centro sin necesidad de tecla. [[Tab]] confirma el número y abre el siguiente (anchura, profundidad, altura); [[Mayús]]+[[Tab]] vuelve atrás. En un campo de las propiedades en el que hayas hecho clic, la rueda del ratón también cambia el valor: una unidad por cada paso de la rueda, diez veces más con [[Mayús]], una décima con [[Ctrl]] y una centésima con [[Alt]]. Un campo en el que no hayas hecho clic deja la rueda al panel, que se desplaza.
- Un **clic en una esquina** (sin arrastrar) abre a la vez la anchura y la profundidad. Escribe la primera, pulsa [[Tab]] para pasar a la segunda e [[Intro]] para aplicar las dos. [[Esc]] cancela.

Cuando giras una forma en ángulos rectos, por ejemplo al tumbarla de lado con {{ui:editor.tool.layFlat}}, los campos de las propiedades se llaman según la dirección en la que va ahora cada medida: {{ui:prop.height}} es lo que va hacia arriba, {{ui:prop.width}} va a lo largo de X y {{ui:prop.length}}, a lo largo de Y. Por eso, si escribes la altura de una forma tumbada, cambia la medida vertical, y su cara inferior se queda sobre la placa. Una forma inclinada en cualquier otro ángulo muestra en los campos sus propias medidas, y una nota debajo lo indica.

Sin ratón, usa el teclado: las teclas de flecha mueven la selección un paso de ajuste (0,01 mm con la cuadrícula desactivada); con [[Mayús]], cinco pasos, o diez si en los ajustes, en {{ui:workspace.appearance}}, pones {{ui:workspace.gridMajorEvery}} en {{ui:workspace.gridMajorSteps|10}}: hasta la siguiente línea más oscura, como en Tinkercad. Siguen a la vista: [[→]] la mueve hacia la derecha de la pantalla y [[↑]] la aleja de ti, aunque hayas girado la placa. Si sacas una forma de la imagen, la vista la acompaña. [[Ctrl]]+[[↑]] y [[Ctrl]]+[[↓]] la suben y la bajan. Una serie de pulsaciones de flecha cuenta como un solo paso en el historial: mientras la siguiente pulsación llegue antes de un segundo y medio, Deshacer revierte la serie entera, no pulsación a pulsación. [[R]] gira 45° y [[Mayús]]+[[R]], 22,5°. [[D]] baja la selección al plano de trabajo.

Con los tiradores, una forma puede llegar a ser tan grande como tu placa, y como mínimo 220 mm de ancho y de fondo. Escribiendo un número en las propiedades puedes pasar de ahí, y una forma así de grande no vuelve a encogerse cuando la agarras otra vez. Un límite propio para cada forma se fija en los ajustes, en {{ui:workspace.shapeDefaults}}, con {{ui:workspace.customLimit}}.

El paso de ajuste está abajo a la derecha del editor y puedes cambiarlo en cualquier momento.

## Copiar y duplicar

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} y {{ui:editor.tool.duplicate}} están en la cinta ({{ui:editor.group.clipboard}}). [[Ctrl]]+[[D]] duplica una selección. layerling recuerda cómo moviste o giraste la última copia y vuelve a aplicar lo mismo en el siguiente duplicado. Así sale una fila de orificios o de escalones con unas pocas pulsaciones. Para disposiciones regulares también está el patrón, que se explica en [Seleccionar y organizar](chapter:select-and-arrange).

> **Consejo:** Si una forma se niega a tomar el tamaño que quieres, a menudo es por los límites de las formas nuevas. En los ajustes, en {{ui:workspace.shapeDefaults}}, decides cómo empieza cada forma y hasta qué tamaño puede llegar.

## Formas personalizadas

Un soporte, una empuñadura o una placa base que necesitas una y otra vez se guarda en {{ui:myShapes.title}}. Están arriba del todo en la biblioteca de formas, encima de {{ui:myShapes.basicShapes}}, y se pliegan con su flecha.

1. Selecciona uno o varios cuerpos; también valen orificios, grupos o un modelo importado.
2. Abre la biblioteca de formas y haz clic en {{ui:myShapes.saveSelection}}. Escribe un nombre y confirma con {{ui:common.save}}.
3. En cualquier diseño, un clic en la miniatura inserta la forma, como cualquier otra. También puedes arrastrar la miniatura al plano de trabajo; entonces cae donde la sueltes. Después, la forma va pegada al puntero, como cualquier otra: lo sigue, también por encima de las caras de otros cuerpos; un clic la coloca y [[Esc]] la descarta.

Varios cuerpos vuelven juntos, colocados como estaban entre sí, y se pueden seguir seleccionando uno a uno. Las [notas](chapter:measuring-and-notes) fijadas a los cuerpos guardados viajan con ellos y vuelven cerradas, fijadas a los cuerpos insertados; las notas sueltas y los puntos de referencia se quedan en el diseño. El lápiz de una miniatura le cambia el nombre, y la papelera la elimina tras pedir confirmación. Las formas ya insertadas en diseños se quedan como están.

Las {{ui:myShapes.title}} se guardan en este navegador, aparte de los diseños, y vuelven a estar ahí la próxima vez que abras el programa. {{ui:dashboard.backupAll}}, en la página de inicio, las incluye en la copia de seguridad junto con los diseños, y al abrir la copia vuelven las dos cosas. Para llevar solo las formas a otro navegador, {{ui:myShapes.backup}} (la flecha hacia abajo) las guarda en un archivo ZIP y {{ui:myShapes.load}} (la flecha hacia arriba) las recupera allí. {{ui:myShapes.load}} también admite diseños `.lyl` sueltos; cada uno se convierte en una forma. Las formas que ya están no se añaden dos veces.

### Carpetas

Si tienes muchas formas personalizadas, se ordenan mejor en carpetas. {{ui:myShapes.newFolder}} (la carpeta con el signo más, junto a {{ui:myShapes.saveSelection}}) pide un nombre y crea una carpeta en el nivel superior; la carpeta con el signo más que tiene cada carpeta, {{ui:myShapes.newSubfolder}}, crea otra dentro de ella. Las carpetas llegan hasta tres niveles: una carpeta del tercer nivel admite formas, pero no más carpetas. Las carpetas aparecen encima de las formas que no están en ninguna, por orden alfabético, y se abren y se cierran con su flecha; el número de una carpeta cuenta las formas que contiene y las de las carpetas que tiene dentro. Al guardar, elige la carpeta en la lista que hay junto al nombre; con {{ui:myShapes.noFolder}}, la forma se queda en el nivel superior.

La carpeta con la flecha de una miniatura mueve esa forma a otra carpeta, o la saca con {{ui:myShapes.noFolder}}. El lápiz de una carpeta le cambia el nombre, y la papelera la elimina tras pedir confirmación, junto con las carpetas y las formas que contiene. Una carpeta en sí no se puede mover: crea la nueva donde corresponda y pasa a ella las formas. Una copia de seguridad conserva las carpetas, y al cargarla las formas vuelven al mismo sitio.

### Formas personalizadas en el servidor

Con el [almacenamiento compartido en el servidor](chapter:files-and-saving) activado, el apartado muestra dos grupos: {{ui:myShapes.onServer}} y {{ui:myShapes.inBrowser}}. Al guardar, eliges dónde va la forma; de entrada está elegido el servidor. Allí se guarda en la carpeta `Custom shapes`, como un archivo `.lyl` propio con una imagen, disponible en cualquier dispositivo que tenga acceso al servidor; sus carpetas son carpetas dentro de `Custom shapes`. Cada lado tiene sus propias carpetas, y una forma se mueve entre las carpetas de su lado. La nube de una miniatura del navegador pasa esa forma al servidor; a partir de ahí ya no se guarda por duplicado.

La carpeta `Custom shapes` también aparece en la página de inicio. Abre ahí una forma como si fuera un diseño, cámbiala, y se guardará automáticamente como cualquier diseño del servidor; la próxima vez que la insertes, entrará la versión nueva. Como el almacenamiento del servidor no tiene inicio de sesión, todo el que tenga acceso al servidor ve las mismas formas.

## Envolver alrededor de un cilindro

¿Quieres poner un dibujo, un logotipo o un rótulo en una taza, una lata o un tubo? Primero colócalo plano sobre la placa, por ejemplo como SVG importado o como texto, tal como debe verse desde arriba. Después, envuélvelo alrededor de un cilindro en los ajustes de la forma, en {{ui:inspector.wrapCylinder}}:

1. Abre {{ui:inspector.wrapCylinder}} y escribe el {{ui:inspector.wrapDiameter}} de la pared del cilindro, por ejemplo el diámetro exterior de tu taza. También valen décimas de milímetro, como 63,5.
2. Haz clic en {{ui:inspector.wrapApply}}. Lo que iba de izquierda a derecha ahora rodea el cilindro, el lado de atrás pasa a quedar arriba y el grosor sobresale de la pared.
3. Selecciona la forma envuelta y el cilindro, y céntralos los dos de izquierda a derecha y de delante atrás. El centro de la forma envuelta es el eje del cilindro, así que entonces queda justo sobre su pared.

Para un grabado, activa {{ui:inspector.wrapInward}}: el grosor se mete entonces en la pared. Convierte la forma en orificio, céntrala y agrúpala con el cilindro.

Una forma ya envuelta es una malla del resultado y no se puede volver a envolver: deshaz el envoltorio o vuelve a envolver el original plano con otro diámetro.

El resultado es una malla, como un modelo importado. Deshacer vuelve a dejar la forma plana; para otro diámetro, primero deshaz y luego vuelve a envolver. No puede dar más de una vuelta al cilindro; en ese caso, layerling te indica el diámetro más pequeño que cabe.
