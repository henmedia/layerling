---
title: Preparar la impresión 3D
summary: Elegir tu impresora, recibir un aviso cuando algo no cabe y colocar bien la pieza.
---

## Elegir tu impresora

Abre los ajustes (la rueda dentada de la fila del título, {{ui:editor.workspaceSettings}}) y pasa al apartado {{ui:workspace.workplane}}. En {{ui:workspace.printer}} eliges tu impresora en una lista de más de 230 modelos habituales, entre ellos de Bambu Lab, Prusa, Creality, Anycubic, Elegoo y muchas marcas más.

![Los ajustes del plano de trabajo con una impresora elegida. La cama y la altura máxima de impresión salen del perfil del laminador.](shot:settings-workplane)

Pasan tres cosas:

- El plano de trabajo toma el tamaño de la cama.
- En la esquina del plano de trabajo aparecen el nombre de la impresora y su volumen de impresión. Si el texto te estorba, desactívalo con {{ui:workspace.showPlateLabels}}, en {{ui:workspace.workplane}}; eso vale también para el nombre del diseño, delante a la izquierda.
- layerling te **avisa** cuando algo no cabe.

La mayoría de los perfiles de impresora provienen de OrcaSlicer. Si prefieres trabajar sin impresora, elige {{ui:workspace.printerNone}}. También puedes fijar a mano el tamaño del plano de trabajo.

Las impresoras delta, como las de FLSun o SeeMeCNC o la Anycubic Predator, imprimen sobre una cama redonda. Con una de ellas, el plano de trabajo también es redondo y tan ancho como la cama, y un cuerpo es demasiado grande en cuanto sobresale del borde. Un cuerpo redondo se mide por su propio contorno y no por la caja que lo rodea, así que cabe incluso un cilindro casi tan ancho como la cama.

## Cuando algo no cabe

Un cuerpo que se sale por el borde de la cama queda marcado. Un mensaje te dice por qué lados sobresale y cuánto. Lo mismo pasa si la pieza es **demasiado alta**: la altura se cuenta desde el cuerpo más bajo, igual que el laminador apoya el modelo en la cama.

![La caja es más ancha que la cama de la Bambu Lab A1 mini. El mensaje de abajo dice cuánto.](shot:printer-overhang)

El aviso no te impide seguir trabajando. Es una pista para que no descubras ya en el laminador que la pieza es demasiado grande. Una pieza demasiado grande a menudo se puede partir: córtala en dos con {{ui:editor.tool.split}} e imprime las dos mitades por separado.

Si dejas piezas aparcadas fuera de la cama a propósito, haz clic en la crucecita del mensaje. El aviso desaparece entonces para esos cuerpos en concreto. Si uno de ellos vuelve a caber y más tarde lo vuelves a sacar, o si otro cuerpo se sale, el mensaje reaparece. Los cuerpos ocultos nunca cuentan, así que ocultar las piezas aparcadas también funciona.

## Colocar bien la pieza

Cómo se apoya una pieza en la cama decide su resistencia y su aspecto. Te ayudan dos herramientas del grupo {{ui:editor.group.arrange}}:

- {{ui:editor.tool.layFlat}}: haz clic en una cara y la pieza queda apoyada sobre ese lado. La mejor orientación de impresión con un solo clic.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): pone la pieza sobre el plano de trabajo cuando se ha quedado flotando en el aire.

Unas cuantas reglas prácticas para la orientación:

- Las caras grandes y planas, abajo. Son las que mejor se adhieren.
- Coloca las piezas largas que van a soportar esfuerzos de modo que las capas no queden perpendiculares a la carga. Las capas son la dirección más débil.
- Evita los voladizos de más de 45°, o ponles soportes en el laminador.

## Encontrar voladizos

En el menú que hay junto al ojo ({{ui:editor.group.visibility}}), **Mostrar voladizos** marca los voladizos. Toda cara que mire hacia abajo con una inclinación de más de 45° aparece entonces rayada en rojo y blanco: ahí la impresora necesitaría soportes. Lo que se apoya en la cama queda sin marcar. Así ves ya mientras diseñas si una esfera, un arco o un orificio horizontal se imprime sin soportes; el [orificio en lágrima](chapter:threads-and-mechanics) está pensado justo para eso. Gira la pieza o apóyala sobre otra cara con {{ui:editor.tool.layFlat}}, y el rayado se actualiza al momento.

La inclinación que aguanta tu impresora se fija en los ajustes, en {{ui:workspace.appearance}}: de 30° (prudente) a 70° (para impresoras con buena refrigeración de capa). Una cara que se apoya sobre otro cuerpo se marca igualmente: layerling solo mira la propia cara.

## Nervios de soporte para una pieza inclinada

Una pieza impresa inclinada sobre una arista, a 45° por ejemplo, a menudo no necesita soportes: sus caras son lo bastante empinadas. Pero se apoya en una arista fina y puede volcarse. El {{ui:supportRib.title}} la sujeta: un nervio fino queda bajo su cara inferior a poca distancia, sobre un pie ovalado, y pequeños puentes la sostienen. Gira primero la pieza sobre su arista y deja que se apoye en la cama.

1. Selecciona la pieza y haz clic en {{ui:supportRib.title}} en el grupo {{ui:editor.section.splitShape}} de la cinta, haz clic derecho en la pieza o búscalo con [[Ctrl]]+[[K]].
2. Haz clic en la cara inferior donde debe ir el nervio. La cara debe mirar hacia abajo, estar inclinada entre 15° y 75° y llegar hasta la cama; el nervio baja recto por la cara desde tu clic. Si la arista inferior de la pieza está redondeada o achaflanada, la cara puede terminar hasta 3 mm por encima de la cama: haz clic en la cara plana por encima del redondeo.
3. Ajusta {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} y {{ui:supportRib.firstLayer}} como en tu laminador. El nervio tiene dos líneas de boquilla de grosor y la separación con la pieza media línea; cada puente tiene una línea de ancho y exactamente una capa de alto y está sobre una capa de la impresión, para que el laminador lo imprima como una sola línea fina que se rompe limpiamente. {{ui:supportRib.height}} indica hasta dónde sube el nervio por la cara (hasta la mitad al principio) y {{ui:supportRib.bridgeSpacing}} la distancia entre puentes, en capas enteras.
4. En {{ui:supportRib.more}} se ajustan a mano el grosor, la separación, el ancho de los puentes y el grosor del pie (hasta entonces siguen a la boquilla y las capas), además del ancho del pie y los redondeos en el pie y arriba.
5. {{ui:supportRib.apply}} añade el nervio. Con {{ui:supportRib.bundle}} (activado al principio) nervio y pieza quedan agrupados: se mueven juntos y llegan al laminador como dos cuerpos uno junto al otro, unidos por los puentes en la impresión.

El nervio es un cuerpo de malla: para cambiarlo, bórralo y vuelve a hacerlo. Cada clic hace un nervio; para más, haz clic en {{ui:supportRib.repick}} o repítelo con {{ui:editor.tool.array}}. El nervio no debe entrar en la pieza por ningún lado y la pieza debe estar sobre la cama; si no, la ventana dice por qué. Tus ajustes se guardan en este navegador para el siguiente nervio.

{{ui:clearance.title}} y {{ui:printCheck.title}} conocen el nervio: que sus puentes entren en la pieza y que el nervio y sus puentes sean finos y crucen el hueco a una capa de altura es intencionado y no se avisa. Un nervio hecho con layerling 1.148.0 todavía no lleva esta marca; vuelve a hacerlo y las comprobaciones lo dejarán fuera.

## Grosor de pared, holgura y chaflanes

- Las paredes deberían tener como mínimo dos líneas de extrusión de ancho, es decir, 0,8 mm con una boquilla de 0,4 mm. Las piezas resistentes necesitan de 1,2 a 2 mm.
- Donde dos piezas encajan una en otra, necesitas holgura: normalmente de 0,2 a 0,4 mm, según la impresora. Haz una pequeña pareja de prueba antes de imprimir la pieza grande.
- Mucha gente achaflana ligeramente la arista inferior que se apoya en la cama. Así se evita que la primera capa se ensanche («pata de elefante»).

## La holgura de tu impresora: la prueba de ajuste

Cada impresora imprime los agujeros un poco más pequeños y los pasadores un poco más gruesos de lo dibujado, cada una en su propia medida, así que la holgura que necesitan dos piezas impresas es al principio una suposición. Mejor mídela una vez: en los ajustes, en {{ui:workspace.workplane}}, {{ui:workspace.fitTestMake}} pone una prueba de ajuste en la cama. Es una placa de 60 × 20 × 4 mm con siete agujeros para un pasador de 5 mm, cada uno dibujado de 5 mm más dos veces 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 o 0,40 mm, con el valor en relieve al lado, y el propio pasador de 5 mm, de pie junto a la placa con un pequeño chaflán arriba. Está hecha de formas normales, así que se imprime con el resto de la cama, sin soportes.

En una impresora cuya cama se mueve adelante y atrás, el pasador alto y delgado puede tambalearse, soltarse o salir ondulado en su base, con borde o sin él. Marca {{ui:workspace.fitTestBase}} antes de crear la prueba de ajuste: el pasador se apoya entonces en una pequeña placa de 10 mm que se agarra a la cama. No toca la pared de su alojamiento, sino que descansa sobre un pequeño saliente en su fondo; tras imprimir, mueve el pasador de un lado a otro y se desprende.

Imprímela tal como está y luego mete el pasador, con el chaflán por delante, en los agujeros, empezando por el más estrecho. **El agujero más estrecho en el que el pasador aún gira** da la holgura de tu impresora. Escribe su número en {{ui:workspace.printerPlay}} o haz clic en él entre los valores bajo el campo. La holgura es por lado, en milímetros, y el navegador la guarda para todos los diseños; un campo vacío significa sin medir.
Con varias impresoras, elige primero en {{ui:workspace.printer}} la que usas: cada impresora guarda su propia holgura, y lo nuevo parte de la holgura de la impresora elegida para el diseño. Una impresora sin holgura propia usa la que se puso cuando no había impresora elegida.

A partir de entonces, los nuevos usos empiezan con la holgura en lugar del valor integrado: {{ui:lid.gap}} y {{ui:lid.hingePinPlay}} en la herramienta {{ui:editor.tool.lid}}, la holgura de una nueva {{ui:shape.dovetail}} y {{ui:shape.snapFit}}, {{ui:prop.clearance}} de una nueva tuerca u orificio roscado – el doble de la holgura, porque es el espacio en todo el diámetro – y {{ui:clearance.threshold}} en {{ui:editor.tool.clearance}}. Lo mismo vale para la {{ui:split.connectorClearance}} de las clavijas, los tetones y las colas de milano en {{ui:editor.tool.split}}. Mientras uno de esos campos conserve ese valor, «{{ui:printerPlay.fromFitTest}}» a su lado dice de dónde viene el número. Una bisagra impresa en una pieza y las articulaciones de la herramienta {{ui:editor.tool.flexi}} mantienen sus 0,4 mm: impresas de una sola pieza, sus huecos también tienen que quedar abiertos entre las capas, y eso no lo mide un pasador impreso aparte. El espacio para encajar a presión un imán o una llave Gridfinity y el espacio para un conector o una placa comprados también mantienen sus propios valores. Los cuerpos que ya están en un diseño nunca cambian, ni tampoco un diseño que abras.

## Comprobar la impresión

{{ui:editor.tool.printCheck}}, junto a {{ui:editor.tool.clearance}} en {{ui:editor.group.combine}}, revisa los objetos seleccionados, o todos los visibles si no hay nada seleccionado, y dice en una ventana lo que saldría mal al imprimir. Cada una de sus cinco líneas sale en verde si no encontró nada, y en naranja con qué y dónde si encontró algo:

- **{{ui:printCheck.thin.title}}**: zonas más finas que dos líneas de la boquilla: 0,8 mm con una boquilla de 0,4 mm. El laminador omite una pared así o la imprime como una sola línea débil. Arriba en la ventana eliges tu boquilla en {{ui:printCheck.nozzle}} (de 0,2 a 0,8 con un clic, cualquier otra en el campo). Las zonas finas se pintan de rojo con una cuadrícula clara sobre los cuerpos, y la línea indica la zona más fina y cuánta superficie es demasiado fina. Se omiten las zonas de menos de 1 mm² y las aristas vivas, como la de una cuña.
- **{{ui:printCheck.floating.title}}**: un cuerpo, o una pieza separada de uno, que no toca ni la placa ni otra pieza (con 0,05 mm de margen). Se imprimiría en el aire. Una pieza apoyada en otra que está de pie no es problema.
- **{{ui:printCheck.contact.title}}**: una pieza en la placa cuya primera capa es muy pequeña para su altura, como una esfera o un cono sobre su punta. Puede despegarse mientras se imprime. El aviso salta por debajo de 0,5 mm² de apoyo, medido a 0,1 mm sobre la placa, por cada milímetro de altura: una esfera siempre queda por debajo, un cubo de 10 mm tiene 10.
- **{{ui:printCheck.overhang.title}}**: las mismas cifras que **Mostrar voladizos**, con el ángulo ajustado allí.
- **{{ui:printCheck.openMesh.title}}**: una malla importada con aristas abiertas, o aristas que comparten tres caras o más. El laminador tiene que adivinar dónde está el interior.

![Una bandeja cuya pared derecha solo tiene 0,6 mm: Comprobar impresión la pinta de rojo y la indica en la ventana.](shot:print-check)

{{ui:printCheck.show}} en una línea lleva allí la cámara; selecciona las piezas flotantes, las que se apoyan en muy poco y las mallas abiertas, y en los voladizos activa **Mostrar voladizos**. Los cuerpos que se solapan se comprueban unidos, como los une el laminador. Si cambias el diseño con la ventana abierta, aparece {{ui:printCheck.stale}}; haz clic ahí o en {{ui:printCheck.checkAgain}}. [[Esc]] cierra la ventana. El diseño no cambia. Una IA hace la misma comprobación con `layerling_check_print`.

## Cuando lo tengas listo

Elige {{ui:editor.export}} y luego **STL** o **3MF**. STL es el formato más sencillo. 3MF conserva los nombres y los colores de cada cuerpo, así que es práctico cuando imprimes en varios colores. La ventana de exportación también muestra cuántos gramos y metros de filamento necesitaría la pieza impresa maciza. Más en [Archivos y guardado](chapter:files-and-saving).
