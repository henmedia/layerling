---
title: Vista y plano de trabajo
summary: Moverse por la escena, mirar de frente y colocar formas nuevas sobre la superficie que quieras.
---

## Moverse por la escena

Con el ratón:

| Qué haces | Qué pasa |
| --- | --- |
| arrastrar con el botón derecho | girar la vista |
| hacer clic con el botón derecho | sobre un cuerpo, un menú con las órdenes más usadas: duplicar, orificio o sólido, agrupar, ocultar, bloquear, eliminar y más; sobre un espacio vacío, Pegar y Seleccionar todo |
| arrastrar con el botón central | desplazar la vista |
| rueda del ratón | acercar y alejar |
| mantener pulsado [[Ctrl]] / [[Cmd]] y arrastrar con el botón izquierdo | desplazar también la vista (en el panel táctil de un MacBook: mantén pulsado [[Cmd]], pulsa y arrastra) |
| doble clic en un punto vacío del plano de trabajo o fuera de la placa | desplaza la vista hasta que ese punto queda en el centro; después la vista gira alrededor de él |

La rapidez con que hace zoom la rueda se regula con {{ui:workspace.zoomSpeed}} en los ajustes, dentro de {{ui:workspace.appearance}}: es un control deslizante de 1 a 14 que empieza en 5. Solo afecta a la rueda y al panel táctil: los botones y las teclas [[+]] y [[−]] hacen zoom siempre en los mismos pasos pequeños. Cada muesca de la rueda del ratón hace el mismo zoom en todos los navegadores; en un panel táctil, el zoom depende de cuánto deslices los dedos.

En una tableta o un móvil, dos dedos hacen zoom (separándolos y pellizcando) y desplazan la vista (deslizándolos juntos). Un dedo sobre un espacio vacío gira la vista, y un toque ahí quita la selección; sobre una forma o un tirador, el dedo trabaja en el diseño, igual que el botón izquierdo del ratón. Si quieres girar la vista también con un dedo que empiece sobre una forma, activa {{ui:camera.touchRotate}} en la barra de cámara. Ese interruptor aparece en los dispositivos con pantalla táctil.

Una tableta gráfica con lápiz se comporta como un ratón: la punta es el botón izquierdo y el botón lateral del lápiz, el derecho, para girar la vista y para abrir el menú. Las teclas rápidas de la tableta se pueden asignar en su controlador a los [atajos de teclado](chapter:shortcuts) de layerling.

**En una tableta, trabaja con un lápiz si puedes.** Su punta es mucho más fina que la yema de un dedo y no tapa lo que quieres tocar, así que aciertas con exactitud los puntos pequeños, las líneas finas y los tiradores de un boceto, los puntos de medida y las aristas, y cansa menos trabajar mucho rato. layerling ya deja que un dedo alcance puntos, líneas, tiradores y aristas desde un poco más lejos que el puntero del ratón, pero el lápiz sigue siendo lo más preciso. Esto vale para un lápiz que la tableta reconoce como tal (un S Pen, un Apple Pencil y similares). Un lápiz sencillo con punta de goma cuenta para la pantalla como un dedo y no es más fino que uno.

En una tableta no hay botón derecho: mantén un dedo quieto medio segundo sobre una forma o sobre un espacio vacío y se abre el mismo menú que abre el clic derecho, con **Seleccionar todo** si es sobre un espacio vacío. **Seleccionar varios**, en ese mismo menú, hace en la tableta las veces de la tecla Mayús: cada toque sobre un cuerpo lo añade a la selección o lo vuelve a quitar, hasta que toques un espacio vacío o pulses [[Esc]]; un dedo sobre un espacio vacío sigue girando la vista. Los tiradores que rodean una forma seleccionada se pueden coger con el dedo aunque lo pongas un poco al lado.

### El cubo de vista

El cubo de arriba a la izquierda muestra hacia dónde miras. Un clic en una de sus caras salta a la vista principal desde arriba, abajo, delante, detrás, la izquierda o la derecha. Un clic en una esquina del cubo mira el modelo en diagonal desde esa esquina, y un clic cerca de una arista mira desde esa arista, entre dos caras; la zona se ilumina mientras el puntero está encima. Las teclas numéricas [[1]] a [[6]] también dan las vistas principales. Si mantienes pulsado [[Mayús]] a la vez, la vista además hace zoom a la selección, como con [[Mayús]]+[[F]].

Si arrastras el cubo, giras la vista, igual que al arrastrar con el botón derecho del ratón. Sin nada seleccionado, las flechas del teclado también giran la vista: 15° por pulsación, 90° con [[Mayús]]. Giran el modelo hacia donde apuntan: [[→]] gira su parte delantera hacia la derecha y [[↑]] inclina su parte delantera hacia arriba. Manteniendo pulsado [[Ctrl]], las flechas desplazan en cambio la vista por la pantalla: una décima parte de la imagen por pulsación, o la mitad si además pulsas [[Mayús]]. El modelo se mueve hacia donde apuntan. Si hay algo seleccionado, las flechas mueven la selección; para girar la vista, haz antes clic en un espacio vacío. En una pantalla táctil, esto se hace con un dedo, sin activar {{ui:camera.touchRotate}}.

### La barra de cámara

En el borde izquierdo hay una barra estrecha. De arriba abajo:

- {{ui:camera.home}} vuelve a encuadrar toda la escena. La tecla es [[Inicio]]; [[F]] hace lo mismo si no hay nada seleccionado.
- {{ui:camera.focusSelection}} hace zoom a la selección ([[F]] o [[Mayús]]+[[F]]).
- {{ui:camera.zoomIn}} y {{ui:camera.zoomOut}} hacen zoom paso a paso, igual que las teclas [[+]] y [[−]].
- {{ui:camera.orthographic}} cambia a una vista plana en la que las aristas paralelas siguen siendo paralelas. Para medir y alinear aristas suele ser más cómoda que la vista en perspectiva. [[O]] alterna entre las dos, y un segundo clic vuelve a la de antes.
- {{ui:camera.secondView}} abre una segunda vista del diseño en una ventana propia, descrita más abajo. Un segundo clic la cierra.
- {{ui:camera.hideWorkplane}} (el ojo sobre una cuadrícula) oculta la placa con su cuadrícula, para que puedas mirar desde abajo la parte inferior de un diseño. Solo cambia la vista: las formas nuevas siguen apareciendo en el plano de trabajo. Un segundo clic vuelve a mostrarla.
- {{ui:camera.placeWorkplane}}, la cinta métrica y la escuadra son herramientas aparte; se explican más abajo y en [Medidas y notas](chapter:measuring-and-notes).

La flechita de arriba del todo de la barra la oculta si te estorba.

Un diseño se abre tal como lo dejaste: el ángulo, el zoom y la posición de la vista se guardan con él en este navegador, así que retomas el trabajo donde te quedaste, también después de volver a Inicio o de cerrar la página. Un archivo guardado (.lyl) lleva la vista consigo, así que en otro sitio también se abre con ella. La vista no forma parte del historial de deshacer.

Además, en cada diseño puedes guardar cuatro vistas propias. [[Mayús]]+[[7]], [[Mayús]]+[[8]], [[Mayús]]+[[9]] o [[Mayús]]+[[0]] guarda en esa tecla la vista exactamente como está —ángulo, posición, zoom y si es plana o en perspectiva—, y la tecla sola ([[7]], [[8]], [[9]] o [[0]]) la recupera. Un mensaje abajo confirma que se ha guardado; si vuelves a guardar en la misma tecla, se sustituye la vista. Igual que la vista de antes, las vistas guardadas se quedan con el diseño en este navegador y viajan en un archivo guardado (.lyl), y no forman parte del historial de deshacer.

### Una segunda vista en su propia ventana

{{ui:camera.secondView}} abre una ventana que muestra el mismo diseño a través de una cámara propia, para que puedas verlo desde dos lados a la vez; por ejemplo, de frente mientras trabajas desde arriba. Cada cambio que haces en el editor aparece allí al instante; el diseño solo se cambia en la ventana principal, y los tiradores también se quedan allí. En la segunda ventana, el ratón y el cubo de vista giran su vista como aquí, y también las teclas: [[1]] a [[6]], [[F]], [[Inicio]], [[O]], [[+]] y [[−]], las flechas para girar y [[Ctrl]] con las flechas para desplazar. [[F]] allí hace zoom sobre lo que está seleccionado en el editor. Las cuatro vistas guardadas del diseño también funcionan allí: [[7]], [[8]], [[9]] y [[0]] las recuperan, y [[Mayús]] con una de esas teclas guarda en ella la vista de esa ventana, para las dos ventanas. Su propia barra de cámara tiene {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} y {{ui:camera.hideWorkplane}}, que actúan solo sobre esa ventana. La ventana se abre donde la dejaste, con el mismo tamaño, y se cierra con el editor. En móviles y tabletas el botón no aparece.

## Mirar por dentro: la vista de sección

{{ui:camera.sectionView}}, el último botón de la barra (la herramienta de corte), abre la vista con un corte a lo largo de un plano para que puedas comprobar paredes, cavidades y piezas que encajan unas en otras. No se corta nada de verdad: el diseño, sus archivos y cualquier exportación quedan enteros. Donde el plano atraviesa un sólido, el corte se rellena con el color del cuerpo algo más oscuro, y un orificio dentro de él queda vacío, así que distingues lo macizo de lo hueco; la cara rellena aparece un momento después de que el plano deja de moverse. En {{ui:camera.sectionCutFace}} eliges cómo se ve el corte: {{ui:camera.sectionCutFaceHatch}}, la opción inicial, lo raya como un plano, y un cuerpo que está dentro de otro se raya en el otro sentido, para que se distingan; {{ui:camera.sectionCutFaceFill}} lo rellena de un solo color; {{ui:camera.sectionCutFaceOpen}} lo deja abierto y ves el interior de la piel del cuerpo. La elección vale para todos los diseños.

- Elige el eje al que el plano queda perpendicular: X (anchura), Y (profundidad) o Z (altura), como en los campos de posición. El plano empieza en el centro de tu diseño.
- {{ui:camera.sectionOrientation}} decide a qué se refieren estos ejes. {{ui:camera.sectionOrientationWorld}} toma los ejes del diseño. {{ui:camera.sectionOrientationWorkplane}} toma los del plano de trabajo: Z corta entonces en paralelo a él, X e Y en perpendicular, y la posición se cuenta desde su origen. Con el plano de trabajo sobre una cara inclinada, cortas en paralelo a esa cara, y el corte se desplaza con él cuando mueves el plano de trabajo. {{ui:camera.sectionOrientationView}} pone el plano de cara a la pantalla: quita lo que queda por delante, y el control deslizante lo empuja más adentro del diseño en la dirección en que miras, por ejemplo para llegar a una pieza tapada y hacer clic en ella. Si después giras la vista, vuelve a hacer clic en este botón y el corte sigue a la nueva vista.
- {{ui:camera.sectionCoarse}} mueve el plano por todo el diseño; {{ui:camera.sectionFine}} lo mueve solo un poco a cada lado de donde está, para afinar en décimas de milímetro. También puedes escribir la posición.
- El botón junto a los ejes muestra el otro lado del corte, {{ui:camera.sectionReset}} devuelve el plano al centro y {{ui:camera.sectionShowPlane}} oculta el plano azul.
- Puedes hacer clic en lo que deja al descubierto el corte y seleccionarlo, paredes interiores incluidas.
- {{ui:camera.sectionWorkplane}} pone el plano de trabajo sobre el corte. Queda en el plano de la sección y mira hacia fuera del cuerpo que se conserva, como la cara que deja un corte. Si después cambias al boceto, este empieza justo ahí, y el contorno tenue muestra el corte, que puedes seguir al dibujar y al que puedes ajustar. Así dibujas, por ejemplo, una tapa que encaje en la cavidad que has abierto con la sección. El botón junto a los ejes elige qué lado se conserva y, con ello, hacia dónde mira el plano de trabajo. El plano de trabajo se devuelve a la placa base como siempre.
- {{ui:camera.sectionSketch}} inicia un boceto nuevo justo sobre el corte, con los contornos del corte ya dentro como líneas: un agujero entra como un círculo de verdad, una esquina redondeada como un arco. Cámbialos, borra lo que no necesites, sigue dibujando y termina: el cuerpo crece desde el corte hacia el lado que se quita, de modo que una pieza que debe encajar con otra, como una tapa, un inserto o una junta, parte del contorno de esa misma pieza. El botón junto a los ejes elige ese lado. Como en el SVG, solo cuentan los cuerpos visibles y los agujeros ya están restados.
- {{ui:camera.sectionMeasure}} mide directamente sobre el corte: el contorno se ve en azul, y dos clics sobre él dan la distancia, además de sus componentes a lo largo de los dos ejes del plano. Los dos puntos se ajustan al contorno, con preferencia por las esquinas. Cuando el segundo clic cae en cualquier punto de la pared de enfrente, se ajusta en perpendicular al primer punto, así que lees grosores de pared, huecos y holguras sin tener que apuntar con exactitud. Un tercer clic empieza la siguiente medición, y [[Esc]] termina de medir. Al mover el plano se borra la medición. En un contorno redondo, como el corte de un cilindro o de un orificio, una crucecita marca el centro, y el centro también sirve para ajustar. Haz clic en un punto de la circunferencia y acércate luego al punto opuesto: el segundo clic cae justo enfrente, pasando por el centro, y la cifra lleva Ø, el diámetro. Del centro a un punto de la circunferencia obtienes R, el radio.
- {{ui:camera.sectionExportSvg}} guarda los contornos del plano de corte como SVG a escala 1:1, para un láser, un plóter, una plantilla o una junta. Un corte en X se ve desde la derecha, uno en Y desde delante y uno en Z desde arriba. Como en la exportación, solo entran los cuerpos visibles, los orificios ya están restados y los cuerpos del mismo color se unen en un solo contorno. Cada color queda como un trazado propio sin relleno, para que el programa del láser los separe en capas.

El panel cuelga de su botón. Si tapa algo, arrástralo por su barra de título a cualquier punto del plano de trabajo; la próxima vez también se abre ahí. Para devolverlo a su sitio, haz doble clic en la barra de título o suéltalo sobre el botón.

La X y [[Esc]] cierran el panel; si hay una medición en curso, [[Esc]] la termina primero. El corte se mantiene hasta que lo desactivas con {{ui:camera.sectionActive}} o vuelves a la página de inicio. Mientras está activo, su botón sigue resaltado. Lo que coloques en el lado que queda cortado solo se ve cuando desactivas el corte. Una tableta no tiene [[Esc]], así que ahí el panel tiene dos botones más: {{ui:camera.sectionBack}} termina la medición si hay una en curso y, si no, cierra el panel, y {{ui:camera.sectionConfirm}} cierra el panel de una vez. En un ordenador no aparecen.

## El plano de trabajo

Las formas nuevas se alinean con el plano de trabajo. Al principio es la placa base con la cuadrícula, pero puedes ponerlo sobre cualquier superficie para colocar algo en un lateral o en una cara inclinada.

1. Pulsa [[W]] o haz clic en {{ui:camera.placeWorkplane}}.
2. Pasa el ratón por encima de una cara de un cuerpo. La cara se ilumina.
3. Un clic pone ahí el plano de trabajo. Todo lo que añadas a partir de ahora se apoya en esa cara.

Si en cambio haces clic en la placa vacía, el plano de trabajo queda horizontal en el punto donde has hecho clic, ajustado a la cuadrícula. Las formas nuevas y los bocetos terminados, también los de revolución, aparecen entonces ahí y no en el centro de la placa. Mientras el plano de trabajo esté así, tendido sobre la placa, la placa solo muestra su contorno: dos cuadrículas en el mismo plano formarían un dibujo que parpadea.

En una cara, el origen del plano de trabajo se ajusta normalmente a la cuadrícula. Si haces clic cerca de una esquina de la cara, queda justo en esa esquina. Cerca de una arista, queda sobre la arista y la cuadrícula se alinea con ella; así eliges a propósito el ángulo de la cuadrícula. Sin una esquina ni una arista cerca, la cuadrícula de una cara horizontal va paralela al cuerpo, así que en una caja girada queda girada con ella.

Un clic fuera de la placa o [[Esc]] devuelve el plano de trabajo a la placa base. Más rápido aún es {{ui:camera.resetWorkplane}}: el botón con la flecha hacia abajo está en la barra de cámara, debajo del ojo, mientras el plano de trabajo está sobre una cara. [[Mayús]]+[[W]] lo pone directamente sobre la cara que tengas seleccionada. [[Alt]]+[[W]] lo devuelve a la placa base en cualquier momento, haya algo seleccionado o no. Si mantienes pulsado [[Mayús]] al hacer clic, el plano mira hacia el otro lado.

Mientras hay un plano de trabajo sobre una cara, aparece un ojo junto a {{ui:camera.placeWorkplane}}. Oculta el plano de trabajo sin quitarlo, para que veas el diseño sin estorbos: las formas nuevas siguen apareciendo en esa cara y los giros se siguen haciendo respecto a ella. Un clic en el ojo vuelve a mostrarlo, y lo mismo ocurre al colocar un plano de trabajo nuevo.

## Cuadrícula y ajuste

La cuadrícula muestra el tamaño de la placa. Abajo a la derecha está el **paso de ajuste**: al mover y al cambiar el tamaño, las formas avanzan a saltos de ese tamaño, por ejemplo de 1 mm. Hazlo más pequeño para el trabajo fino y más grande para colocar a grandes rasgos. {{ui:editor.tool.snapToGrid}}, en la cinta, lleva después las formas seleccionadas al cruce de la cuadrícula más cercano. Al moverlas, las formas también se ajustan a otras formas: consulta [Seleccionar y organizar](chapter:select-and-arrange).

> **Consejo:** cuando encajes piezas con exactitud, deja de girar la vista. Con las teclas numéricas, pasa a la vista desde arriba o de frente y pulsa [[O]] para la vista plana. Así ves enseguida si dos aristas están de verdad a ras.

### La ventana de ajustes

La rueda dentada de la cinta ({{ui:editor.workspaceSettings}}) abre los ajustes. A la izquierda hay cinco apartados: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} y {{ui:workspace.history}}. Los cambios se aplican al momento. {{ui:workspace.makeDefault}}, abajo, guarda los ajustes actuales como predeterminados, para que los diseños nuevos empiecen con ellos, y {{ui:workspace.close}}, arriba a la derecha, cierra la ventana. Esta parte repasa los ajustes uno por uno.

### Aspecto: tema, barra de herramientas y cubo de vista

{{ui:workspace.theme}} elige la combinación de colores de todo el programa: {{ui:workspace.themeSystem}} sigue la de tu ordenador, y las demás son {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} y {{ui:workspace.themeGraphite}}. También puedes cambiarla arriba a la derecha del editor.

{{ui:workspace.toolbarSize}} hace más pequeños o más grandes los botones de la cinta de arriba, su menú de formas, los controles de cámara de la izquierda y el panel de propiedades de la derecha: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (como ha sido siempre) o {{ui:workspace.toolbarSizeLarge}}. El tamaño pequeño deja más sitio al plano de trabajo en un portátil; el grande es más fácil de acertar en una pantalla grande o con el dedo. Con botones grandes, los grupos de la cinta pasan a una segunda fila cuando la ventana se queda estrecha. El tamaño se guarda en este navegador y vale para todos los diseños.

{{ui:workspace.shapeColors}} pone en las imágenes de la biblioteca de formas el color con el que empieza una forma nueva (el de su tipo, o el que guardaste con {{ui:inspector.saveDefaults}}). Desactívalo si prefieres las imágenes en gris; el navegador recuerda lo que elijas.

{{ui:workspace.viewCubePosition}} lleva el cubo de vista a otra esquina del plano de trabajo: {{ui:workspace.viewCubePositionTopLeft}} (como ha sido siempre), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} o {{ui:workspace.viewCubePositionBottomRight}}. En cualquier esquina que no sea la de arriba a la izquierda, los controles de cámara suben al hueco que deja el cubo. Abajo a la derecha, el cubo queda justo encima del control {{ui:inspector.snapGrid}}. Mientras las propiedades de una forma están abiertas a la derecha, un cubo situado a la derecha se aparta a su izquierda. La esquina se guarda en este navegador y vale para todos los diseños. En una ventana estrecha, como la de un móvil, el ajuste no aparece y el cubo se queda arriba a la izquierda.

### Aspecto: modo rápido

{{ui:workspace.fastMode}} es para ordenadores más lentos. Desactiva las sombras, las líneas de arista en todos los cuerpos y la inercia de la cámara, y dibuja la vista solo a la resolución de la pantalla. Tus propios ajustes se guardan para más adelante, y mientras está activado, los interruptores que anula indican {{ui:workspace.offInFastMode}}. Más cosas que ayudan en un ordenador lento, en «Cuando layerling va lento», más abajo.

### Aspecto: colores de la zona de trabajo y del boceto

Los colores de la zona de trabajo se eligen en {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} y {{ui:workspace.surfaceColor}} para el tema claro (los temas oscuros tienen los suyos), y el color de la cuadrícula, en {{ui:workspace.workplane}}. Cada color es un botón que muestra ese color. Un clic abre una ventanita con el selector de color, una fila de colores ya preparados, un campo para el valor hexadecimal y una flecha que devuelve el color al que traía layerling. [[Intro]] acepta un valor hexadecimal escrito, y un clic fuera de la ventana también.

La vista de boceto tiene sus propios colores: {{ui:workspace.sketchBackground}} para la ventana alrededor de la hoja, {{ui:workspace.sketchPlateColor}} para la hoja bajo la cuadrícula y {{ui:workspace.sketchGridColor}}, todos para el tema claro. {{ui:workspace.sketchMatch}} copia de un clic los tres colores de la zona de trabajo.

{{ui:workspace.classicLook}} deja la zona de trabajo como la muestra Tinkercad: fondo blanco, una cuadrícula milimétrica de color azul pálido con una línea más oscura cada centímetro, líneas de arista negras y luz desde arriba con sombras suaves. Después puedes seguir cambiando cada valor por separado. Todos empiezan como layerling se ha visto siempre, y lo que mejor te vaya depende de tu monitor.

![Los ajustes de Aspecto: colores del fondo y del plano de trabajo para el tema claro, y el interruptor de las líneas de arista en todos los cuerpos.](shot:settings-appearance)

![El editor con la combinación de colores oscura. La combinación de colores se elige arriba a la derecha: Sistema, Claro, Oscuro o Grafito.](shot:editor-dark)

### Aspecto: flechas de los ejes y líneas de arista

{{ui:workspace.showAxes}} (activado de forma predeterminada) dibuja tres flechas en la esquina trasera izquierda de la placa: **X** en rojo hacia la derecha, **Y** en verde hacia el fondo y **Z** en azul hacia arriba, igual que cuentan los campos de posición. Es la regla de la mano derecha, la misma que usan Tinkercad, los programas de CAD y los laminadores (*slicers*). Con el plano de trabajo sobre una cara, las flechas lo siguen. Si te estorban, desactívalas aquí.

{{ui:workspace.edgeLines}} dibuja un contorno en cada cuerpo, del color de {{ui:workspace.edgeColor}} (negro al principio, como en Tinkercad): ayuda cuando los colores oscuros se confunden entre sí. Está desactivado de forma predeterminada, y las mallas importadas muy grandes quedan fuera.

![Tres cuerpos oscuros con las líneas de arista activadas: los contornos los separan.](shot:edge-lines)

{{ui:workspace.strongHoles}} dibuja los orificios en un gris más oscuro, menos transparente y con una línea oscura alrededor. Ayuda cuando cuesta encontrar un orificio entre cuerpos transparentes. A diferencia de las líneas de arista, sigue activo en el modo rápido.

### Aspecto: luz y sombras

{{ui:workspace.showShadows}} activa y desactiva las sombras proyectadas. Dos controles deslizantes ajustan cómo se iluminan los cuerpos. {{ui:workspace.shadowStrength}} indica lo oscuras que son las sombras proyectadas, y {{ui:workspace.shadeContrast}} pasa luz de la iluminación ambiental uniforme a la luz principal: hacia «intenso», los lados en sombra se oscurecen y las sombras se notan más; hacia «suave», todo se ve más plano. En el extremo superior, el contraste es muy fuerte, de modo que los lados en sombra y las sombras se vuelven muy oscuros. {{ui:workspace.shadowSoftness}} hace que los bordes de las sombras sean suaves en lugar de nítidos. {{ui:workspace.lightAzimuth}} gira la luz principal alrededor de la placa (0° desde delante, 90° desde la derecha), y {{ui:workspace.lightElevation}} la eleva; a 90° queda justo encima de la placa, como en Tinkercad, y las sombras caen justo debajo de los cuerpos. {{ui:workspace.lightReset}} lo devuelve todo a como estaba.

### Aspecto: medidas en el plano de trabajo

{{ui:workspace.showMoveDimensions}} muestra cuánto desplazas lo que arrastras, y {{ui:workspace.showOriginDimensions}}, las distancias de la selección al origen de la placa, también con varios cuerpos seleccionados. Con {{ui:workspace.dimensionsAlwaysVisible}}, estas medidas se quedan siempre a la vista, y no solo mientras arrastras. Mientras hay un cuerpo girado seleccionado, sus ángulos aparecen debajo de él en el plano de trabajo; {{ui:workspace.showRotationAngles}} lo desactiva. Más en [Medidas y notas](chapter:measuring-and-notes).

### Aspecto: seleccionar y mover

{{ui:workspace.selectBeforeMoving}}: con este ajuste, primero hay que seleccionar un cuerpo, y solo el siguiente arrastre lo mueve. Ayuda cuando tocan los cuerpos niños o manos con prisa, y en una pantalla táctil.

{{ui:workspace.frameByDirection}}: un recuadro arrastrado hacia la derecha selecciona solo lo que queda completamente dentro de él, y uno arrastrado hacia la izquierda, todo lo que toca (se dibuja con línea discontinua), como en SketchUp.

{{ui:workspace.doubleClickOpensSketch}} decide si un doble clic sobre un boceto extruido vuelve a abrir el boceto, como en Tinkercad, y {{ui:workspace.doubleClickOpensGroup}}, si un doble clic sobre un grupo o un conjunto lo abre para editarlo. {{ui:workspace.doubleClickCentersView}} decide si un doble clic en un punto vacío del plano de trabajo lleva la vista hasta allí.

{{ui:workspace.objectSnap}} hace que los lados y el centro de una forma se ajusten a otras formas mientras la arrastras; el menú de la cuadrícula, abajo a la derecha, tiene el mismo interruptor. {{ui:workspace.cruise}} hace que una forma nueva quede enganchada al puntero del ratón y se pose en la cara que haya debajo, como Cruise en Tinkercad; si lo desactivas, las formas nuevas aparecen en el centro de la placa. Más en [Seleccionar y organizar](chapter:select-and-arrange).

### Aspecto: la vista

{{ui:workspace.startInPerspective}}: el editor se abre entonces en la vista en perspectiva, no en la plana.

{{ui:workspace.zoomSpeed}} es un control deslizante que va de lento a rápido: la rapidez con que hacen zoom la rueda y el panel táctil; los botones y las teclas de zoom mantienen sus propios pasos pequeños. {{ui:workspace.cameraInertia}}: después de soltar el ratón, la vista sigue girando un momento y frena con suavidad. Si lo desactivas, se para en seco, como en Tinkercad y Fusion 360.

{{ui:workspace.overhangAngle}} es el ángulo a partir del cual una cara cuenta como voladizo cuando activas Mostrar voladizos en el menú de visibilidad: esas caras se rayan en rojo y blanco. 30° es prudente y 70° cuenta con una buena refrigeración de capa; 45° es lo habitual para empezar.

{{ui:workspace.booleanTriangleLimit}} limita cuántos triángulos puede tener una malla importada cuando la cortas, la fusionas o haces una intersección con ella, porque ese cálculo se hace en tu navegador. Una malla que pasa del límite no se procesa: simplifícala antes, o sube el límite si tu ordenador lo aguanta. Un límite más alto puede dejar el editor congelado unos segundos.

### Medidas: unidades, escala y pasos de ajuste

En {{ui:workspace.measurement}} eliges las {{ui:workspace.units}}, la unidad en que se muestran las medidas ({{ui:workspace.scale}}: milímetros, centímetros o metros en el sistema métrico; pulgadas o pies en el imperial), cuántos decimales muestra un número ({{ui:workspace.accuracy}}), con {{ui:workspace.snapGrid}} el paso al que se ajustan los movimientos y los cambios de tamaño, y tus propios pasos de ajuste en {{ui:workspace.customSnapGrids}}.

En {{ui:workspace.measurement}}, dentro de los ajustes, eliges las {{ui:workspace.units}}. Con {{ui:units.imperial}}, layerling muestra todas las medidas en pulgadas: en la forma, en el panel de propiedades, en la cinta métrica y en la regla. La cuadrícula de ajuste ofrece entonces pasos de 1/64 a 1 pulgada, y la cuadrícula de la placa se dibuja en pulgadas (de 1/8 a 1 pulgada; 1/4 de pulgada de forma predeterminada), con una línea más marcada en cada pulgada entera. En {{ui:workspace.inchFormat}} eliges si las pulgadas aparecen como fracciones, igual que en Tinkercad (1 5/8, redondeado a 1/64 de pulgada), o como decimales (1.625), con tantos decimales como indique {{ui:workspace.accuracy}}. Puedes escribirlas de las dos formas, «1 5/8» incluido. Para cambiar rápido entre milímetros y pulgadas está el pequeño interruptor **mm | in**, junto a {{ui:inspector.snapGrid}}, en la parte de abajo de la ventana de propiedades: cambia la unidad, la cuadrícula de la placa y el paso de ajuste igual que los ajustes, para este diseño.

En {{ui:workspace.customSnapGrids}}, en ese mismo sitio, añades pasos de ajuste propios: un nombre y un tamaño en milímetros, por ejemplo «Paso de pines 2,54 mm» para la separación de los chips DIP, las tiras de pines y los orificios de las placas perforadas, o «MX Key Unit» con 19,05 mm para la separación de las teclas de un teclado. El menú del paso de ajuste ofrece entonces esa medida entera, a la mitad y a un cuarto (1 ×, ½ × y ¼ ×), para que puedas mover formas un paso entero, medio paso o un cuarto de paso. Si solo quieres la medida tal cual, desmarca {{ui:workspace.customSnapGridParts}}, al lado; el menú tendrá entonces solo ese paso. Los pasos propios se guardan con el diseño y se incluyen al usar {{ui:workspace.makeDefault}}.

### Plano de trabajo: placa e impresora

{{ui:workspace.printer}} adapta el plano de trabajo a la cama de tu impresora y señala los cuerpos que se salen de ella; consulta [Impresión](chapter:printing). {{ui:workspace.showPlateLabels}} escribe en la placa el nombre del diseño y, si has elegido una impresora, su nombre y su volumen de impresión.

{{ui:workspace.size}} da a la placa un tamaño propio, con {{ui:workspace.width}} y {{ui:workspace.length}} en milímetros o en la unidad que hayas elegido. La cuadrícula siempre pasa por el origen, así que las líneas más marcadas caen sobre los ejes, mida lo que mida la placa.

### Plano de trabajo: cuadrícula

{{ui:workspace.showGrid}} muestra u oculta la cuadrícula de la placa. {{ui:workspace.gridBlockSize}} fija la separación entre sus líneas, y {{ui:workspace.gridMajorEvery}}, si la línea más oscura aparece cada 5 o cada 10 pasos de la cuadrícula; {{ui:workspace.gridMajorColor}} le da a esa línea un color propio, que también toman la cruz central y el contorno de la placa. {{ui:workspace.gridColor}} es el color de las líneas normales.

Todas las líneas de la cuadrícula se ensanchan al acercar el zoom, como en Tinkercad, y siguen viéndose al alejarlo. Si te parece demasiado, desactiva {{ui:workspace.gridLinesGrow}} y las líneas se quedarán de un píxel de ancho con cualquier zoom, como en el boceto.

Si la cuadrícula ha desaparecido, por ejemplo porque se le ha puesto el mismo color que la placa, {{ui:workspace.resetGrid}}, al final del apartado {{ui:workspace.workplane}}, devuelve a sus valores estándar la visibilidad, los colores, la separación y el grosor de sus líneas, aquí y en los valores predeterminados guardados con {{ui:workspace.makeDefault}}.

### Valores iniciales de las formas

En {{ui:workspace.shapeDefaults}} eliges una forma con {{ui:workspace.shape}} y fijas cómo empieza al añadirla: su anchura, su longitud y su altura. {{ui:workspace.useAppDefaults}} devuelve la forma a los valores con los que la crea la aplicación. Las formas con ajustes propios los muestran en {{ui:workspace.shapeDetails}}. Los valores se aplican a las formas nuevas, no a las que ya están en la placa. {{ui:workspace.customLimit}} pone un tope propio a lo grande que pueden hacer esa forma los tiradores y el panel de propiedades; si lo dejas en blanco, se mantienen los límites habituales.

### Historial guardado

En {{ui:workspace.history}}, el control deslizante {{ui:workspace.savedHistory}} fija cuántas acciones terminadas siguen disponibles para Deshacer después de guardar o volver a abrir un diseño. El valor predeterminado es de 100 acciones por diseño. Un límite más bajo descarta para siempre los pasos de deshacer más antiguos del diseño.

## Cuando layerling va lento

layerling calcula y dibuja todo en tu navegador. Por eso, en un ordenador antiguo, con una tarjeta gráfica modesta o con varias pantallas grandes, la vista puede ir lenta y pesada. Esto ayuda:

- **{{ui:workspace.fastMode}}**, en {{ui:workspace.appearance}}, desactiva de golpe todo lo que más le cuesta a la vista: las sombras, las líneas de arista en todos los cuerpos y la inercia de la cámara. Además, dibuja la vista solo a la resolución propia de la pantalla, lo que en pantallas de alta resolución supone hasta cuatro veces menos píxeles. Tus propios ajustes se conservan y vuelven a aplicarse en cuanto lo desactivas.
- **La cámara sigue girando:** cuando sueltas el ratón después de girar, la vista sigue girando un momento y frena con suavidad. Es a propósito, no son tirones. Si vienes de Tinkercad o de Fusion 360, desactiva {{ui:workspace.cameraInertia}} en {{ui:workspace.appearance}} y la vista se parará en seco.
- **Interruptores sueltos:** sin el modo rápido, también puedes desactivar solo {{ui:workspace.showShadows}} o {{ui:workspace.edgeLines}}.
- **Usa la tarjeta gráfica:** en Chrome, abre `chrome://gpu` (en Edge, `edge://gpu`). Junto a «WebGL» debería poner «Hardware accelerated». Si pone «Software only», la aceleración por hardware está desactivada en los ajustes del navegador. En Windows también puedes elegir «Alto rendimiento» para el navegador en Configuración → Sistema → Pantalla → Gráficos, para que use la tarjeta gráfica de verdad y no la más débil que lleva integrada el procesador.
- **Simplifica las mallas importadas grandes:** un modelo de muchos cientos de miles de triángulos ralentiza cualquier vista. Cómo aligerarlo se explica en el capítulo de archivos, en «Simplificar una malla importada».
- **Cierra otras pestañas:** todas las pestañas de layerling abiertas y cualquier otra página en 3D comparten la misma tarjeta gráfica.
