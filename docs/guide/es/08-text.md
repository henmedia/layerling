---
title: Texto y letras en arco
summary: Letras en relieve o grabadas, con ocho tipos de letra o uno tuyo y, si quieres, siguiendo un arco de circunferencia, como en una moneda, una tapa o un anillo.
---

## Añadir texto

Elige {{ui:shape.text}} en la biblioteca de formas y colócalo. En el campo {{ui:prop.text}} de la derecha, escribe lo que debe poner. Debajo tienes los ajustes:

- **{{ui:prop.font}}:** Hay ocho tipos de letra: Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil (letras hechas de líneas rectas) y Japanese (Zen Maru Gothic). El texto nuevo empieza en Sans. Las letras con tilde o diéresis, como ä, ö, ü o é, y el signo € están en todos los tipos de letra, igual que los kana, los kanji habituales y muchos de los poco frecuentes que aparecen en nombres, como 澤, 槇 y 檜: un nombre japonés funciona con cualquier tipo de letra y en una placa con nombre. Las letras japonesas se descargan la primera vez que un texto las necesita (los kanji poco frecuentes, en un segundo archivo y solo cuando un texto lleva alguno), así que ese texto muestra signos de interrogación durante un momento. Después se quedan en el ordenador, de modo que a partir de entonces el japonés también funciona sin conexión. Además puedes añadir tus propias fuentes: lo explica [Tus propias fuentes](#tus-fuentes), más abajo.
- **{{ui:nameTag.letterSize}}:** El tamaño de las letras vistas desde arriba; {{ui:prop.height}} fija su grosor.
- **{{ui:prop.height}}:** Cuánto sobresalen las letras de la superficie.
- **{{ui:prop.bevel}}:** Redondea las aristas de las letras para que se vean más suaves. Con {{ui:prop.segments}} decides en cuántos pasos.
- **{{ui:nameTag.letterEdge}}:** redondea o achaflana la arista superior de las letras, como en una placa con nombre: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} o {{ui:nameTag.edge.chamfer}}, con el {{ui:nameTag.letterEdgeSize}} (0,4 mm para empezar, como mucho la altura del texto). Llega más lejos que el {{ui:prop.bevel}}, pero solo hasta donde lo permite la anchura de los trazos: donde un trazo es más fino que el doble de ese tamaño, la arista termina en una cara superior más estrecha. La parte de abajo queda plana, así que después se pueden pegar letras sueltas. Mientras haya una arista elegida, sustituye al {{ui:prop.bevel}}.
- **Tamaño:** La longitud y la anchura de la línea de texto se ajustan como en cualquier forma. Arrastra los tiradores o escribe las medidas.
- **{{ui:prop.textSpacing}}:** El espacio entre letras que se suma al que ya trae la fuente, en porcentaje del tamaño de letra: 0 lo deja como lo hizo la fuente; por encima, las letras quedan más separadas, y por debajo (hasta -50), más juntas, algo que una fuente propia necesita a menudo. Las letras conservan su tamaño y el recuadro se adapta a la línea, tanto en texto recto como curvado. El espaciado no se aplica al árabe ni al hebreo, cuyas letras van unidas.
- **{{ui:prop.textStretch}}:** Al principio está desactivado: las letras conservan sus proporciones y se colocan en el centro del marco, así que un marco estirado más ancho o más profundo de lo que necesita la palabra sigue siendo más grande que las letras. Si lo activas, las letras se estiran hasta llenar todo el marco en las dos direcciones: una mayúscula puede quedar más baja o más estrecha, como en Tinkercad. Es para texto recto; el texto curvado tiene su propio tamaño de letra.

Al principio, un texto es un solo cuerpo. Si quieres trabajar con las letras por separado, haz clic en {{ui:inspector.separateParts}}. Entonces cada letra pasa a ser una forma independiente.

Las aristas del texto también se pueden achaflanar o redondear, tanto si es recto como si es curvado: consulta [Romper aristas y vaciar cuerpos](chapter:edges-and-hollowing). Usa medidas pequeñas, de 0,2 a 0,5 mm, porque los trazos de las letras son estrechos.

## Tus fuentes

Además de las ocho fuentes incluidas, puedes usar cualquier fuente propia: un archivo de fuente de tu ordenador o, en Chrome y Edge, una fuente instalada en tu ordenador. Elige {{ui:font.manage}} al final de la lista {{ui:prop.font}}. Se abre la ventana {{ui:font.title}}.

- **{{ui:font.addFile}}** admite un archivo TrueType (`.ttf`), OpenType (`.otf`) o WOFF (`.woff`). También puedes arrastrar el archivo a la ventana sin más.
- **En Windows**, las fuentes instaladas están en la carpeta Fuentes (`C:\Windows\Fonts`), que el cuadro de diálogo de archivos del navegador oculta. Ábrela en el Explorador y arrastra la fuente desde allí a la ventana {{ui:font.title}}. Las fuentes instaladas solo para tu usuario están en `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, una carpeta que el cuadro de diálogo sí muestra. En un Mac, las fuentes están en `/Library/Fonts` y `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** muestra las fuentes instaladas en tu ordenador. La primera vez, el navegador pregunta si layerling puede leerlas. Con el campo de búsqueda encuentras una fuente enseguida, y un clic la elige.

Si hay un texto seleccionado, recibe la nueva fuente al instante. Si no, la fuente aparece en {{ui:prop.font}}, en el grupo {{ui:font.customGroup}}, y {{ui:font.use}}, en la ventana, la aplica a los textos seleccionados. Las fuentes propias se comportan como las incluidas: el texto en arco, los chaflanes y redondeos de las aristas y la exportación a STEP funcionan igual. Las letras que le faltan a una fuente se toman de Sans.

### Árabe y hebreo

El árabe, el persa, el urdu y el hebreo se escriben de derecha a izquierda: la primera letra queda a la derecha y, en un texto mixto como «Nombre عربي», solo la palabra árabe va al revés; las cifras se quedan como siempre. Las letras árabes se unen a sus vecinas como pide la escritura, y lam-alif se convierte en una ligadura. Para ello hace falta una fuente que tenga esas letras; las incluidas no las tienen. Añade una propia, como Arial, Tahoma o Segoe UI en Windows, o una gratuita como Noto Naskh Arabic, Noto Sans Arabic o Amiri. Los signos vocálicos se colocan sobre la letra a la que pertenecen. El texto en arco, el contorno, la silueta, las capas y las placas con nombre funcionan con estas escrituras igual que con cualquier otro texto.

### Qué funciona en cada navegador

| Navegador | Elegir un archivo de fuente | Fuente del ordenador |
| --- | --- | --- |
| Chrome y Edge en un ordenador, también la aplicación de layerling instalada | sí | sí, después de que el navegador pregunte |
| Firefox | sí | no |
| Safari en un Mac | sí | no |
| Tableta y móvil | sí, desde los archivos del dispositivo | no |

Las páginas web no pueden leer sin más las fuentes instaladas. Solo Chrome y Edge tienen un permiso para ello, y solo en páginas seguras, por `https`, como en layerling.com. Cuando layerling funciona por `http`, por ejemplo en tu propio servidor o como instalación de Docker en la red de tu casa, no aparece {{ui:font.fromSystem}}; en ese caso, arrastra la fuente desde el Explorador. En los demás navegadores eliges el archivo de fuente en la carpeta de fuentes, con el mismo resultado. Si rechazaste la pregunta en Chrome o Edge, vuelve a dar el permiso en la configuración del sitio, en el candado que hay a la izquierda de la dirección.

layerling no puede leer archivos WOFF2 (casi siempre hay una versión TTF u OTF), colecciones de fuentes (`.ttc`, varias fuentes en un mismo archivo) ni fuentes de emojis en color. De las fuentes muy grandes, como las chinas, layerling toma los primeros 8000 caracteres. Una fuente variable se lee con su ajuste predeterminado, normalmente el peso normal.

Algunas fuentes, sobre todo las caligráficas y las variables, dibujan una letra con trazos que se superponen. layerling los fusiona en un único contorno limpio al leer la fuente, para que el cuerpo se pueda imprimir. Esas letras quedan formadas por tramos rectos muy cortos en lugar de curvas, pero no se nota.

### Dónde se guardan las fuentes

Una fuente propia se queda **en este navegador de este ordenador**. Otro navegador u otro ordenador no la conocen hasta que la añadas también allí. Si borras los datos de sitios del navegador, se borran también las fuentes. En la ventana {{ui:font.title}}, la papelera quita una fuente del navegador. Tus diseños no pierden nada por ello, como explica el apartado siguiente.

### Compartir diseños con una fuente propia

Un diseño **no guarda el archivo de la fuente**, sino solo los contornos de las letras que usan sus textos, incluidas las de pasos anteriores del historial. Si un texto dice «Hola», solo viajan con él la H, la o, la l y la a. Esto vale para todas las formas de guardar un diseño: en el navegador, en tu propio servidor, como archivo `.lyl` y en {{ui:myShapes.title}}.

Por tanto:

- **El diseño se abre bien en cualquier parte**, también en un ordenador que no tenga la fuente. Los textos se ven igual y se pueden mover, girar, escalar y redondear.
- **Las letras nuevas necesitan la fuente.** Si alguien que no tiene la fuente escribe una letra que el diseño no traía, layerling la dibuja con Sans. En {{ui:prop.font}}, la fuente aparece entonces marcada como {{ui:font.fromDesign}}. Al añadir el archivo de la fuente vuelven todas las letras.
- **Las exportaciones solo contienen geometría.** STL, 3MF, OBJ, STEP y SVG contienen cuerpos y contornos, no la fuente.
- **Las versiones antiguas de layerling** todavía no admiten fuentes propias y dibujan esos textos en Multilanguage.

**Licencias:** Las fuentes están protegidas por derechos de autor, y su licencia dice qué puedes hacer con ellas. Los contornos de letras incrustados son lo mismo que los archivos PDF se llevan de una fuente, y la mayoría de las licencias lo permiten. Sin embargo, algunas fuentes comerciales prohíben distribuir incluso letras sueltas. Antes de compartir o publicar un diseño con una fuente propia, comprueba la licencia de la fuente. Las fuentes libres, como las de Google Fonts (casi siempre con la SIL Open Font License), se pueden compartir sin problema. Para una pieza impresa o un STL exportado da igual: ya no contienen ninguna fuente, solo geometría.

## En relieve o grabado

- **En relieve:** Coloca el texto sobre la superficie y agrúpalo con el cuerpo. Sobresale como un relieve.
- **Grabado:** Cambia el texto a {{ui:inspector.hole}}, haz que se meta un poco en la superficie y agrúpalo con el cuerpo. Las letras quedan grabadas.

Para rotular una cara lateral, coloca antes el plano de trabajo sobre esa cara: consulta [Vista y plano de trabajo](chapter:view-and-workplane).

## Contorno, silueta y más ancho

Un texto no tiene por qué construirse con letras rellenas. {{ui:prop.textFill}}, en las propiedades, ofrece las mismas opciones que Tinkercad:

- **{{ui:prop.textFill.filled}}:** las letras tal cual.
- **{{ui:prop.textFill.outline}}:** una línea que sigue el contorno de las letras, mitad por dentro y mitad por fuera.
- **{{ui:prop.textFill.outer}}:** una línea que rodea las letras por fuera.
- **{{ui:prop.textFill.inner}}:** una línea por el interior de las letras.

Si eliges una línea, aparecen dos ajustes justo debajo de la lista: {{ui:prop.sketchLineWidth}} fija el grosor de la línea, y {{ui:sketch.strokeJoin}}, cómo dobla las esquinas ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} o {{ui:sketch.strokeJoin.miter}}). Los ajustes menos habituales están en {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} deja fuera los huecos de la O, la A o la e, y {{ui:prop.textWider}} mantiene las letras rellenas y las engorda por todo el contorno en la anchura de la línea; las letras que se tocan se unen en una sola pieza.

Con una línea exterior, una línea centrada o «Más ancho», el recuadro del texto crece, pero las letras conservan su tamaño. {{ui:prop.bevel}} y {{ui:prop.segments}} solo existen para las letras rellenas.

## Capas y placas con nombre

Una placa con nombre para impresión multicolor es un texto en capas: arriba, las letras; debajo, el mismo texto un poco más ancho en un segundo color, y abajo del todo, una placa sin huecos en un tercero. layerling la hace con un clic:

- **Una placa con nombre nueva:** Elige {{ui:shape.nameTag}} en la biblioteca de formas y colócala. Pone «Nombre» en letras blancas sobre un borde rojo y una placa oscura.
- **A partir de un texto:** Selecciona el texto y haz clic en {{ui:nameTag.makeLayers}}, en la parte de arriba de sus ajustes.

Todos los ajustes de la placa están en la tarjeta {{ui:nameTag.title}}, en la parte de arriba de los ajustes:

- **{{ui:prop.text}}** y **{{ui:prop.font}}**, también con fuentes propias. La placa crece con las palabras.
- **{{ui:nameTag.letterSize}}:** la altura de las mayúsculas, en mm. Todas las capas la siguen y se mantienen alineadas.
- **{{ui:nameTag.layers}}:** una fila por capa, de arriba abajo. Cada fila tiene el color (haz clic en el cuadrado de color), cuánto más ancha es la capa que las letras, su altura y {{ui:nameTag.noHoles}}, que rellena los huecos de letras como la O y la A. {{ui:nameTag.corners}} fija cómo rodea una capa más ancha las esquinas de las letras: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} o {{ui:nameTag.corner.miter}}. La fila de arriba son las propias letras. **+** añade una capa abajo y **–** quita la capa de abajo. Una placa tiene de dos a seis capas.
- **{{ui:nameTag.keyring}}:** da a la capa inferior una lengüeta recta con el extremo redondeado y un orificio para la anilla de un llavero; la lengüeta crece con el orificio. Un orificio de 3 mm, el predeterminado, da una lengüeta de 6,5 mm de ancho que sobresale 6,75 mm, con el borde del orificio a 2 mm del borde de la capa inferior. Elige el {{ui:nameTag.keyringDiameter}} y el {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} o {{ui:nameTag.side.top}}. {{ui:nameTag.side.free}} quita el orificio de la placa y pone a su lado una {{ui:nameTag.keyringTab}} propia, del color y la altura de la capa inferior: una forma normal que mueves y giras con sus tiradores hasta donde la placa la necesite. Cuando esté en su sitio, {{ui:nameTag.keyringTabFix}}, en su panel, la convierte en parte de la placa más cercana, justo donde está: el orificio atraviesa todas las capas a las que llega, la lengüeta se une a la capa inferior y las dos se mantienen en esa esquina de las letras aunque cambien las palabras o el tamaño. {{ui:nameTag.side.free}} vuelve a sacar la lengüeta donde estaba, para moverla otra vez. El orificio atraviesa todas las capas que toca, y la lengüeta se desplaza con ellas cuando cambias las palabras, el tamaño de letra o la fuente. {{ui:nameTag.keyringAlong}} mueve la lengüeta hacia arriba o hacia abajo a lo largo de su lado (en el lado de arriba, a izquierda o derecha), hasta donde se saldría del lado; 0 es el centro. Úsalo cuando el centro del lado cae en un hueco, como junto a una J, y lleva la lengüeta a la parte de la letra que sobresale.
- **{{ui:nameTag.letterEdge}}:** redondea o achaflana la arista superior de las letras de la capa de arriba, que es como se remata una placa impresa: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} o {{ui:nameTag.edge.chamfer}}, con el {{ui:nameTag.letterEdgeSize}} (0,4 mm para empezar, como mucho la altura de la capa). Funciona con cualquier fuente y cualquier palabra. La arista forma parte de la malla de las letras, así que la herramienta de aristas trata ese texto como una malla, lo que con un texto tan fino resulta pesado; mejor elige aquí la arista.

Cada cambio se ve al instante. La placa es un conjunto: se mueve como una sola pieza, y cada capa sigue siendo un cuerpo independiente con su propio color, tal como los necesita un laminador (*slicer*) para una impresión multicolor. Para redondear o biselar las aristas de una capa, haz clic en {{ui:group.editBundle}} y elige la capa: consulta [Romper aristas y vaciar cuerpos](chapter:edges-and-hollowing).

### Muchas placas con nombre a la vez

Escribe los nombres en {{ui:textLayers.names}}, uno por línea, hasta cien. El botón de debajo dice cuántas placas va a crear, por ejemplo «Crear 12 placas con nombre». Todas las placas reciben las mismas capas, el mismo tamaño de letra y el mismo orificio para el llavero, y cada una es un objeto independiente; se colocan en filas debajo de la primera, a 5 mm unas de otras. Un texto normal también tiene la lista de nombres, más abajo en sus ajustes.

## Placas con icono

Una placa con icono es la misma placa, pero con un icono SVG en lugar de letras: un corazón, una nube, el logotipo de un club. Arriba, el icono; debajo, el mismo contorno un poco más ancho en un segundo color, y abajo del todo, una placa sin huecos.

- **Una placa con icono nueva:** Elige {{ui:shape.iconTag}} en la biblioteca de formas. Se abre una ventana pequeña: haz clic en {{ui:iconTag.browse}}, elige un archivo SVG, PNG o JPG, comprueba la imagen, escribe la {{ui:iconTag.width}} del icono y haz clic en {{ui:iconTag.ok}}. La placa aparece en el centro de la placa base, con las mismas capas que una placa con nombre nueva.
- **A partir de un cuerpo de boceto:** Un SVG importado, o un boceto que hayas dibujado, tiene {{ui:nameTag.makeLayers}} en la parte de arriba de sus ajustes.

La tarjeta {{ui:iconTag.title}}, en la parte de arriba de los ajustes, contiene:

- **{{ui:iconTag.replace}}:** pone en la placa el icono de otro archivo (SVG, PNG o JPG); las capas y la anchura no cambian.
- **{{ui:iconTag.iconWidth}}:** la anchura del icono de arriba, en mm. Todas las capas la siguen y se mantienen alineadas.
- **{{ui:nameTag.layers}}:** las filas, igual que en una placa con nombre: color, cuánto más ancha, {{ui:nameTag.corners}}, altura y {{ui:nameTag.noHoles}}, **+** y **–**, de dos a seis capas. La fila de arriba es el propio icono.
- **{{ui:nameTag.keyring}}:** como en una placa con nombre: un orificio para el llavero que atraviesa todas las capas, con una lengüeta de extremo redondeado en la capa inferior, fuera del icono. {{ui:nameTag.keyringDiameter}} y {{ui:nameTag.keyringSide}} eligen su tamaño y su posición; {{ui:nameTag.side.free}} da una lengüeta propia, como en una placa con nombre. La lengüeta se adapta al contorno del icono, así que, con un icono muy irregular, comprueba por dónde se une a la placa. {{ui:nameTag.keyringAlong}} desplaza la lengüeta a lo largo de su lado, como en la placa con nombre.
- **{{ui:iconTag.count}}:** cuántas placas quieres, de 1 a 100. {{ui:iconTag.fill}} lo calcula a partir de la cama de la impresora elegida en los ajustes: con logotipos pequeños, una cama llena. El botón de debajo las crea, a 5 mm unas de otras, repartidas en el centro de la placa base; la primera es la propia placa.

El SVG necesita contornos cerrados; un dibujo hecho solo de líneas abiertas no puede convertirse en una placa. Un cuerpo de boceto cuyo relleno es una línea la conserva: la superficie de esa línea es el icono.

**Una imagen (PNG o JPG)** se calca para convertirla en un contorno, y la vista previa muestra ese contorno. En {{ui:iconTag.part}} eliges si el icono sale de {{ui:iconTag.part.dark}} o de {{ui:iconTag.part.light}}; al principio es la parte que no es el fondo. Los píxeles transparentes nunca forman parte del icono. Un SVG que solo contiene una imagen, como los que guarda Inkscape al importar un mapa de bits, se calca de la misma forma. El contorno sigue los píxeles, así que una imagen pequeña da un borde irregular: funcionan mejor las imágenes de unos cientos de píxeles o más. {{ui:iconTag.replace}} toma la parte de una imagen que no es el fondo.

## Códigos QR

Un código QR convierte un texto o una dirección web en un patrón que lee la cámara de un móvil: un enlace a tu tienda en un letrero, el nombre de la wifi en un posavasos, un número de teléfono en un llavero.

Elige {{ui:shape.qrCode}} en la biblioteca de formas. Se abre una ventana; el cursor ya está en el campo de texto:

- **{{ui:qrCode.text}}:** lo que dice el código. Intro crea el código y Mayús+Intro empieza una línea nueva. Debajo del campo ves cuánto espacio está ocupado; las vocales con tilde y otros caracteres especiales ocupan dos bytes. Si el texto es demasiado largo, el campo te lo dice.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q o H. Un nivel más alto se sigue leyendo aunque parte del código esté sucia o rayada (L, en torno al 7 %; M, el 15 %; Q, el 25 %; H, el 30 %), pero necesita más módulos para el mismo texto, así que cada módulo queda más pequeño. Al principio está elegido M.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} crea solo el código, de 4 mm de alto. {{ui:qrCode.style.raised}} lo pone, con 1 mm de alto, sobre una placa blanca de 3 mm de grosor, como un conjunto de dos colores, para que una impresión multicolor imprima el código oscuro y la placa clara. {{ui:qrCode.style.engraved}} graba el código 1 mm de profundidad en la placa.
- **{{ui:qrCode.sizeBy}}:** escribe la {{ui:qrCode.sizeBy.width}} del código entero (40 mm al principio) o el tamaño de un módulo; el otro valor aparece debajo. Los módulos de menos de 0,8 mm reciben un aviso. Es una regla práctica para una boquilla de 0,4 mm, no una garantía: la impresora, el material, los colores y el móvil influyen.
- **{{ui:qrCode.quietZone}}:** los lectores necesitan alrededor del código un margen vacío de cuatro módulos de ancho. En una placa, el margen forma parte de la placa; desactívalo solo si la placa va sobre una superficie clara más grande. El código solo no tiene margen propio: deja libre el espacio a su alrededor.
- **Alturas:** la altura del código o, en una placa, la altura del código o la profundidad del grabado, y el grosor de la placa.

La vista previa muestra el código tal como se va a construir. {{ui:qrCode.ok}} lo coloca en el centro de la placa base.

El código es un cuerpo como cualquier otro: muévelo, gíralo, escálalo (mantén iguales la anchura y la profundidad, o el código se deforma), agrúpalo, o conviértelo en orificio y agrúpalo con una pieza tuya para grabarlo en ella. Al escalarlo se escala el código entero; cada módulo sigue siendo cuadrado.

La tarjeta {{ui:qrCode.title}}, en la parte de arriba de sus ajustes, contiene el texto. Cámbialo y haz clic en {{ui:qrCode.regenerate}}: el código se vuelve a construir donde está y con la anchura que tiene ahora. La corrección de errores, la zona de silencio y la forma de construirlo se quedan como se eligieron; para otras opciones, crea un código nuevo desde la biblioteca.

Escanea el código con el móvil antes de imprimirlo, y otra vez después. Oscuro sobre claro se lee mejor; un código claro sobre una placa oscura no lo leen todos los móviles.

## Texto en un arco de circunferencia

¿Quieres que las letras no vayan rectas, sino que sigan el borde de una moneda, una tapa o un anillo? Para eso está el ajuste {{ui:prop.textCurved}}.

![Un texto que sigue un círculo. Todas las letras se apoyan en una misma línea.](shot:curved-text)

En cuanto lo activas, el texto recorre el círculo. Todas las letras se apoyan en la misma línea base, tan regulares como en un texto normal. Hay cuatro ajustes:

- **{{ui:prop.textRadius}}** (de 5 a 500 mm): El radio del círculo por el que va la línea base de las letras. Las letras se quedan donde están; solo cambia su curvatura.
- **{{ui:nameTag.letterSize}}:** La altura de las letras. Ya no depende de la anchura de la forma.
- **{{ui:prop.textInward}}:** Lleva el texto de la parte de arriba del círculo a la de abajo. Las letras apuntan entonces con la cabeza hacia el centro.
- **{{ui:prop.textFlipped}}:** Da la vuelta solo a las letras, para que puedas leerlas desde el otro lado. El texto se queda en su sitio en el círculo.

**El centro del círculo es el centro de la forma.** Por eso alinear funciona como siempre: si centras el texto con un cilindro o un anillo, queda exactamente concéntrico con él. Al arrastrar un tirador, el radio y el tamaño de letra crecen a la vez, así que las letras no se deforman.

> **Consejo:** En la parte de arriba del círculo, las letras quedan por fuera de la línea base; con {{ui:prop.textInward}} quedan por dentro, con la cabeza hacia el centro. Para que las letras quepan en un disco, el radio más el tamaño de letra debe ser menor que el radio del disco.
