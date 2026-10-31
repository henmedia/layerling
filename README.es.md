<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="Logotipo de layerling">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">CAD 3D sencillo para la impresión 3D</h3>
        <p align="right">
          Pon una forma, abre un orificio, redondea una arista e imprímelo. En el navegador, sin cuenta y sin saber de CAD.
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="Licencia GNU AGPLv3" src="https://img.shields.io/badge/licencia-AGPLv3-663399"></a>
    <img alt="Sin cuenta" src="https://img.shields.io/badge/sin%20cuenta-nada%20que%20registrar-dd7906">
    <img alt="Hecho para la impresión 3D" src="https://img.shields.io/badge/hecho%20para-impresión%203D-ff9e2c">
    <a href="#skill-mcp-de-layerling"><img alt="Manejable por una IA" src="https://img.shields.io/badge/manejable%20por%20IA-servidor%20MCP-16c0d4"></a>
  </p>

  <p><a href="README.md">English</a> · <a href="README.de.md">Deutsch</a> · <strong>Español</strong> · <a href="README.nl.md">Nederlands</a> · <a href="README.ar.md">العربية</a> · <a href="README.zh-cn.md">简体中文</a> · <a href="README.zh-tw.md">繁體中文</a></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-en.png" width="763" alt="layerling en el navegador">
</p>

<p align="center"><em>layerling en el navegador</em></p>

<p align="center"><a href="https://layerling.com/guia-es/index.html"><strong>Guía de usuario</strong></a>, paso a paso y con imágenes</p>

## Para quién es

Tienes una impresora 3D. Quieres una pieza que encaje en algo, no hacer carrera en el CAD.

layerling funciona como ya piensas: pones una forma en la placa, la arrastras hasta el tamaño que quieres, conviertes una segunda forma en orificio, agrupas las dos, exportas e imprimes. No hay nada que aprender antes de empezar ni **nada en lo que registrarse**: abres la página y construyes. Tus diseños se quedan de entrada en tu propio navegador: sin cuenta, sin nube, sin subir nada a ningún sitio. Si tienes tu propia copia, pueden vivir en cambio en una carpeta de tu servidor, y así todos los dispositivos de casa ven los mismos.

### ¿Vienes de Tinkercad?

layerling está un paso más allá de Tinkercad, camino de Fusion 360: se maneja igual, así que lo reconocerás todo (la placa, las formas, los sólidos y los orificios, agrupar y desagrupar, los conjuntos, Alt y arrastrar para copiar), pero no se detiene donde se detiene Tinkercad. Te esperan cosas que echabas de menos:

- **Chaflán y redondeo.** Elige una arista y achaflánala o redondéala: es lo que más pide la gente en cuanto una pieza impresa tiene que verse acabada o encajar en algo. Las aristas tratadas se pueden seguir cambiando: quita el tratamiento o pulsa Editar para cambiar su valor en las mismas aristas.
- **Vaciar, dividir, bocetos, roscas.** Vacía un cuerpo con una pared uniforme, divídelo con un plano, dibuja bocetos con longitudes y ángulos exactos y extrúyelos o haz con ellos un cuerpo de revolución, y añade tornillos, tuercas y orificios roscados.
- **Patrones y envolver.** Repite una forma en fila, en círculo o en espiral, o envuelve un dibujo o un texto alrededor de un cilindro.
- **Patrones de orificios.** Haz clic en una cara plana y reparte por ella orificios redondos, cuadrados, rectangulares, hexagonales o alargados, en cuadrícula o al tresbolillo, con separación, margen y profundidad: rejillas de ventilación, de altavoz y cestas en un solo paso.
- **Escalar en porcentaje.** Agranda o reduce una o varias piezas en un porcentaje: juntas, para que la disposición crezca con ellas, o cada una en su sitio.
- **Igualar tamaños.** Mantén pulsado Alt sobre un punto de alineación y las piezas se estiran en vez de moverse: hasta el lado de otra pieza, o hasta su anchura, longitud o altura; por ejemplo, para cambiar una caja por un cilindro del mismo tamaño.
- **Medir y mirar dentro.** Cinta métrica, reglas, una vista de sección que abre el modelo y un control deslizante del historial para volver a mirar estados anteriores.
- **Geometría de verdad por debajo.** layerling guarda formas CAD exactas, no solo una malla, así que una arista redondeada sigue siendo una arista redondeada, hasta en un archivo STEP para un programa de CAD completo.

No es un paquete de CAD completo: no tiene línea de tiempo paramétrica ni ensamblajes. Y puedes **tenerlo tú mismo**: instalarlo como aplicación (entonces arranca sin internet) o montar tu propia copia en Windows, en un NAS o en un servidor de casa; mira [Primeros pasos](#primeros-pasos).

> **Una IA puede construir contigo.** layerling trae un servidor MCP. Un cliente de IA como Gemini, Claude o Codex ve una
> pestaña abierta del editor y trabaja en ella: añade formas, cambia medidas, agrupa, corta, redondea aristas, lee la escena
> y hace fotos de la vista. Tú describes la pieza, la IA la construye y tú lo ves pasar e intervienes cuando quieras. Todo
> funciona en tu equipo, sin que nada salga del navegador; la configuración está en [Skill MCP de layerling](#skill-mcp-de-layerling).

## Qué hace

### Construir

- **Una placa de verdad**: cuadrícula, ajuste, tiradores para mover, cambiar el tamaño y girar, y un panel con los números exactos cuando los necesitas.
- **Escribir la posición**: la tarjeta Posición coloca un cuerpo en una X, una Y y una Z exactas, medidas desde su centro o desde sus aristas izquierda y delantera, y las piezas se pueden aparcar junto a la placa, como en Tinkercad.
- **Flechas de los ejes**: unas flechas roja, verde y azul en la esquina delantera izquierda de la placa muestran X, Y y Z en el sentido en que cuentan los números, como en Bambu Studio y OrcaSlicer; se pueden desactivar en los ajustes.
- **Un punto de giro que se queda**: fija un punto de giro para un cuerpo y se queda con ese cuerpo: se mueve, gira y escala con él, se guarda y se puede escribir como X, Y y Z o arrastrar con el ratón, ajustándose a esquinas y puntos medios de aristas, o con Mayús al centro de una cara (el eje de un pasador, la punta de un cono, incluso a través de cuerpos transparentes); para bisagras y articulaciones.
- **Luz y sombras a tu gusto**: contraste del sombreado, intensidad y suavidad de las sombras, y dirección y altura de la luz, hasta justo encima como en Tinkercad, todo en los ajustes. El botón «Aspecto clásico» deja de una vez colores, cuadrícula y luz como allí, y las líneas más oscuras de la cuadrícula pueden ir cada centímetro y con un color propio.
- **Modo rápido**: para ordenadores más lentos, un interruptor en los ajustes apaga las sombras, las líneas de las aristas y la inercia de la cámara, y dibuja la vista a la resolución de la pantalla; la inercia de la cámara también se puede apagar por separado, para que la vista se pare en cuanto sueltas.
- **Alinear caras y ver los ángulos**: la herramienta Alinear caras lleva una cara de una pieza contra una cara de otra, en contacto o a ras, con una separación si quieres, o pone un orificio o un pasador en el eje de otro orificio; un cuerpo girado muestra sus ángulos respecto a X, Y y Z bajo la selección, y la tarjeta Rotación de sus ajustes los admite como números.
- **Ajustar a otras formas**: al moverla, una forma engancha sus aristas o su centro a las aristas y los centros de las formas que la rodean, con una línea guía, para que las piezas queden a ras sin escribir números. Alt durante el arrastre lo pausa; Mayús mantiene el movimiento en un eje, y Alt pulsado desde el principio arrastra una copia, como en Tinkercad.
- **Posar sobre caras**: como Cruise en Tinkercad, una forma nueva se apoya en la cara que hay bajo el puntero, también en las inclinadas, y C levanta la selección y la posa del mismo modo sobre otra cara.
- **Puntos de referencia**: con clic derecho en un cuerpo marcas su centro, sus esquinas o los puntos medios de sus aristas con puntos que no se imprimen y a los que se ajustan las formas que arrastras; arrastra un punto o escribe sus coordenadas, y las marcas se guardan con el diseño. La cinta métrica puede marcar el punto medio de una medida; por ejemplo, el centro de un orificio redondo.
- **Ayuda interactiva**: pulsa Mayús+F1 o el signo de interrogación del grupo Ayuda y haz clic en cualquier botón, campo o ventana: una ventanita muestra la parte de la guía de usuario que habla de él y la abre si se lo pides.
- **Búsqueda de comandos**: pulsa Ctrl+K y escribe una herramienta, una forma o una orden («fillet», «mirror», «cylinder») para ir directamente a ella; entiende palabras en inglés y en alemán y muestra el atajo de teclado junto a cada entrada.
- **Vista del historial**: vuelve a mirar cualquier estado anterior del proyecto con un control deslizante, sin cambiar nada; exporta ese estado o empieza un proyecto nuevo a partir de él. Aportado por @rmpel. Deshacer y Rehacer dicen en su descripción emergente qué paso deshacen, con su medida («Aristas redondeadas: Caja (5 mm)»), y una lista en la vista del historial nombra cada paso para saltar a cualquiera de ellos con un clic.
- **Milímetros o pulgadas**: con las unidades imperiales cada medida se muestra en pulgadas, como fracciones al estilo de Tinkercad (1 5/8) o con decimales, la cuadrícula de ajuste va de 1/64 a 1 pulgada y la cuadrícula de la placa se dibuja en pulgadas.
- **La cama de tu impresora**: elige una de más de 230 impresoras habituales y la placa toma su tamaño, redonda en una impresora delta como una FLSun. Su nombre y su volumen de impresión aparecen en la esquina del plano de trabajo (un interruptor de los ajustes oculta esto y el nombre del diseño) y sale un aviso cuando un cuerpo se pasa del borde.
- **Voladizos y filamento**: «Mostrar voladizos» raya cada cara con más de 45° de inclinación (o el ángulo de tu impresora) que necesitaría soportes, y la ventana de exportación muestra el volumen, el peso y los metros de filamento antes de laminar.
- **Biblioteca de formas**: cajas, cilindros, cápsulas (con un extremo más pequeño si hace falta, por ejemplo para un protector de correa), esferas, conos, pirámides, cuñas, texto, tejados, semiesferas, paraboloides, toroides, tubos, transiciones de un contorno a otro (por ejemplo, de cuadrado a redondo, macizas o con pared, rectas o abriéndose con suavidad, retorcidas o con la tapa inclinada), prismas de tres a veinticuatro lados, muelles helicoidales, una bisagra que se imprime montada (con orificios para tornillos o como bisagra de nudillos), cajas y placas base de Gridfinity, empuñaduras moleteadas (rectas, cruzadas o redondas), aberturas para conectores USB-C, Micro-USB, USB-A, HDMI, DisplayPort y RJ45 en la pared de una caja, y más.
- **Jarrones, macetas y pantallas de lámpara**: una forma Jarrón propia, con forma del cuerpo, sección (también dibujada) y una segunda sección hacia la que transformarse, giro, relieves, orificios de drenaje, un pie, un plato y una tapa, maciza para el modo jarrón del laminador o hueca. Aportado por @marcus040473.
- **Roscas que encajan**: varillas roscadas, tornillos con cabeza cilíndrica, avellanada o hexagonal y huella hexagonal, Torx, Phillips, ranurada o Robertson (cuadrada) (diámetro de la cabeza, tamaño y profundidad de la huella a tu medida), tuercas hexagonales, arandelas según ISO 7089 y orificios roscados. De M2 a M12, UNC/UNF desde el n.º 4 hasta una pulgada y las roscas de tubo Whitworth de G1/16 a G4 (ISO 228-1) se eligen directamente, o pon tú el diámetro y el paso, también a izquierdas; un tamaño en pulgadas o G pide hilos por pulgada en vez de milímetros. Los extremos admiten un chaflán, y un orificio roscado es un cortador: suéltalo en una pieza, agrupa y el orificio sale roscado.
- **Engranajes que engranan**: engranajes rectos, helicoidales, en espiga y cónicos, coronas dentadas y cremalleras con dientes de evolvente, definidos por módulo y número de dientes como en un generador de engranajes, con ángulo de presión y holgura para imprimir, o con dientes redondos, más tolerantes en engranajes pequeños impresos y suaves al tacto en los pomos. Selecciona dos engranajes y el panel da la distancia entre centros a la que engranan.
- **Juntas Hirth**: un disco con dientes en V que salen del centro; una copia volteada encaja en él en cualquier múltiplo de un diente y se centra sola, para bisagras regulables, cabezas de trípode y pomos con posiciones. Ajusta el número de dientes, su altura y el taladro central; es un cuerpo exacto para las herramientas de aristas y para STEP.
- **Sólidos y orificios**: convierte formas en cortadores y agrúpalas en la geometría final. Editar grupo (**E**) deja sueltas las piezas de un grupo para cambiarlas y lo vuelve a construir con Listo, también un grupo dentro de otro, tan hondo como llegue el diseño.
- **Grupos multicolor**: un grupo puede mostrar cada pieza con su propio color, también después de abrirle orificios, y la exportación a 3MF u OBJ conserva esos colores, para que el laminador asigne las piezas a los filamentos.
- **Conjunto**: Ctrl+B mantiene juntas las piezas como los conjuntos de Tinkercad: se mueven, giran y escalan como una sola, pero conservan sus colores y siguen siendo cuerpos separados en la exportación; muy práctico para impresiones multicolor.
- **Intersección**: deja solo lo que tienen en común dos o más sólidos seleccionados, o donde se solapan sólidos y orificios.
- **Envolvente**: envuelve las formas seleccionadas en su envolvente convexa, el cuerpo más pequeño sin entrantes que las rodea a todas: una semiesfera sobre un cilindro se convierte en una cúpula, y cuatro postes en una caja con las esquinas redondeadas. Los orificios de la selección se recortan después.
- **Cortador de galletas**: una pared y un reborde plano alrededor del contorno de un boceto o de un SVG, o de aquello sobre lo que se apoya una forma, desde una sola ventanita; el interior de una e o de una a recibe su propia pared, sujeta por puentes al reborde o por una placa sobre todo el contorno, con pequeños redondeos para que las partes finas no se rompan, y si se hace más bajo, solo marca un texto en la masa en vez de recortarlo. El contorno se refleja, para que el texto y los logotipos salgan de la masa al derecho, y la pared acaba en un filo de corte fino. El grosor de pared, el filo, la altura y el reborde son los modos de relleno del boceto, así que cada uno se puede cambiar después.
- **Articulaciones flexi**: corta un cuerpo plano que hayas dibujado tú (un pez, una serpiente o un dragón) en eslabones con una articulación impresa en su sitio en cada corte: un nudillo vertical con conos de 45° alojado en un hueco del eslabón siguiente, para que la figura se mueva nada más imprimirla, sin soportes ni montaje. Se pueden ajustar el número de articulaciones, la holgura, el giro y el tamaño de la articulación.
- **Transición entre bocetos**: dos bocetos o SVG importados se convierten en un cuerpo exacto, con el contorno del de abajo en la base y el del de arriba en la parte superior, y paredes rectas entre ellos: un embudo, una transición de cuadrado a redondo o, con dos anillos, un marco que se estrecha. Editar grupo vuelve a abrir los dos bocetos.
- **Dividir**: corta sólidos u orificios en dos con un plano; un cuerpo vaciado conserva su cavidad. Gira el plano para un corte en ángulo, arrastra su flecha o apóyalo en cualquier cara con «Elegir cara».

### Afinar

- **Chaflán y redondeo**: achaflana o redondea cualquier arista de un sólido, y quita o cambia el tratamiento más adelante.
- **Bocetos**: dibuja contornos con líneas, curvas y formas ya hechas, fija las líneas por longitud y ángulo mientras dibujas («50<30»; Mayús ajusta en pasos de 15°), escribe longitudes, ángulos, tamaños y la posición de un contorno seleccionado (en cualquier campo numérico valen sumas como «60+12.5»), redondea o achaflana esquinas, ajústate a los contornos de otros cuerpos, dibuja líneas de construcción a las que ajustarte, y extrúyelos, haz con ellos un cuerpo de revolución o bárrelos a lo largo de una trayectoria para obtener cuerpos exactos. Una revolución con paso enrolla el contorno en una sola hebra helicoidal continua en vez de anillos, como el filamento en una bobina. Un boceto también se puede construir como trazo: un contorno cerrado se convierte en un marco, por dentro, por fuera o centrado en la línea, y una línea abierta en una franja con extremos planos, cuadrados o redondos. Un dibujo o una foto colocados debajo del boceto se calcan en líneas de boceto con un clic, su parte oscura o su parte clara, con el umbral que elijas.
- **Vaciar**: convierte un cuerpo en paredes de un mismo grosor, abierto por los lados que elijas (arriba, abajo, delante, detrás, izquierda, derecha, en cualquier combinación) o cerrado; para cajas, vasos y carcasas.
- **Pendiente y estrechamiento a lo largo**: baja la parte superior de una caja, un cilindro, un polígono, un tubo, una cuña o un tejado redondo hacia un extremo, o los lados de todos ellos menos el tubo hacia dentro en un extremo, en recto o en curva, con un número o con un punto en el extremo: un tejado que cae a lo largo, una rampa, el extremo biselado de un tubo, la proa de un barco. Una pendiente sigue siendo exacta para chaflanes, redondeos y STEP, y lo mismo una caja, una cuña o un tejado redondo estrechados. Aportado por @plazmabokor.
- **Tapas**: la tapa para una caja, una maceta o una bandeja abierta por arriba, a partir de su propio contorno, redondo o anguloso: encajada en la abertura, puesta por fuera, abrazando la pared por los dos lados como un táper o apoyada encima, con ajuste justo, normal u holgado (0,1; 0,2 o 0,3 mm por lado) o con la holgura que tú digas, grosor de la tapa y profundidad y pared del labio. Sale junto al cuerpo, volteada con la placa hacia abajo, lista para imprimir sin soportes.
- **Desfasar y recortar**: haz crecer o encoger un cuerpo exacto por todas sus caras entre 0,01 y 10 mm, o solo hacia los lados para que conserve su altura, para la holgura de un ajuste a presión o de un encaje elástico, o recorta una pieza de otra con una holgura alrededor en un solo paso, sin que la pieza se mueva de su sitio.
- **Textura de superficie**: aplica un relieve a cualquier cuerpo, para que agarre mejor o por estética: estrías, moleteado, panal, bultos, celdas de Voronoi, ladrillos, punto de lana, cuerda, cestería, fibra de carbono, corteza de árbol, veta de madera, grietas, una imagen como mapa de alturas o un texto, alrededor de cuerpos redondos o en plano a lo largo de un eje.
- **Eliminar cara**: haz clic en las caras de un redondeo, un orificio o un saliente y elimínalas: las caras de alrededor crecen hasta cerrar el hueco y el cuerpo sigue siendo exacto para más redondeos y para exportar a STEP.
- **Formas personalizadas**: guarda los cuerpos que necesitas una y otra vez arriba del todo en la biblioteca de formas e insértalos en cualquier diseño con un clic o arrastrándolos; en el navegador, o con el almacenamiento compartido del servidor para todos los dispositivos. «Hacer copia de seguridad» se las lleva también.
- **Patrón de orificios**: perfora una cara plana de un cuerpo: elige la cara, escoge orificios redondos, cuadrados, rectangulares, hexagonales o alargados, ajusta el tamaño, la separación, la cuadrícula o el tresbolillo, el margen hasta el borde y la profundidad (a través de toda la pieza o hasta una profundidad dada) y mira los orificios en una vista previa antes de crearlos. Siguen siendo orificios normales agrupados con el cuerpo, así que al desagrupar quedan libres otra vez.
- **Cara**: empuja hacia fuera una cara plana de un cuerpo o abre un hueco en ella: elige la cara, escoge «Hacia fuera» o «Hacia dentro», ajusta un margen desde el borde, un radio de esquina y la profundidad, y mira el resultado en una vista previa. Funciona también con STL importados, y lo que añade sigue siendo un cuerpo de boceto normal agrupado con el cuerpo.
- **Envolver alrededor de un cilindro**: coloca un dibujo SVG, un logotipo o unas letras en la pared de un vaso o de un tubo, en relieve o grabados, y céntralos en el cilindro.

### Archivos

- **Tus propias fuentes**: usa cualquier fuente TrueType, OpenType o WOFF para el texto o, en Chrome y Edge, una fuente instalada en el ordenador. Un diseño guarda solo los contornos de las letras que usa, así que se abre en cualquier sitio. El árabe y el hebreo se escriben de derecha a izquierda, y las letras árabes se enlazan.
- **Trae tus propios modelos**: importa STL, OBJ, 3MF, STEP, SVG o DXF y construye a su alrededor. El contorno de una pieza en DXF, tal como lo envía un taller de corte láser o un proveedor, llega como un cuerpo con sus orificios como orificios propios, y los arcos y círculos se mantienen exactos. Un SVG llega como cuerpo de boceto: una superficie, un trazo por fuera o por dentro de sus líneas, una silueta sin sus huecos o el dibujo ensanchado por todo su contorno; juntos, un cortador de galletas a partir de un solo archivo, o las capas de un logotipo multicolor. La forma Texto tiene los mismos modos de relleno y puede apilar sus letras de arriba abajo; la biblioteca de formas trae una placa con nombre (un texto en capas de colores para una impresión multicolor, con un orificio de llavero opcional y la arista de las letras redondeada o achaflanada) y una placa con icono (un icono SVG en las mismas capas de colores, con una cantidad y «tantas como quepan» para llenar una cama). Un OBJ con colores (de layerling, o de Tinkercad como ZIP con su `.mtl`) o un 3MF con colores, incluidos los proyectos de laminador, llega como un cuerpo por color, y un 3MF con varios objetos, como un cuerpo por objeto. Un archivo STEP con varios sólidos llega como un cuerpo por sólido, con su nombre y su color.
- **Exporta lo que pida tu laminador**: STL, 3MF con nombres y colores u OBJ con colores, de la selección o de toda la escena (las piezas ocultas se quedan fuera), además de STEP si el diseño tiene que seguir su camino en un programa de CAD completo, y la vista superior como SVG o como DXF con arcos y círculos exactos para una cortadora láser, con puentes de plantilla opcionales que sujetan el centro de una o o de una b. PNG guarda una imagen limpia de la vista, al doble de resolución y con fondo transparente si quieres.
- **Exportar un plano**: selecciona una pieza, o quita la selección para todo el diseño visible, y elige **Exportar → Plano → PDF o SVG**. Genera el alzado, la planta y el perfil derecho en disposición de primer diedro (sistema europeo) sobre una hoja técnica con marco, números de zona y un cajetín abajo a la derecha, con las cotas generales, las aristas ocultas y tablas de diámetro y posición para los taladros circulares alineados con los ejes. Las vistas van a escala 1:1 en milímetros; la hoja usa el formato ISO apaisado más pequeño en el que quepan (o uno personalizado más grande). Imprímela al **100 % / tamaño real**. Las posiciones se miden desde la esquina inferior izquierda del contorno de cada vista. Las tablas de orificios usan la geometría nominal de la malla y no acotan por sí solas orificios inclinados o no circulares, roscas, profundidades ni tolerancias. El motor de proyección está adaptado del trabajo de planos de [Cadverix-3D](https://github.com/WC3D/Cadverix-3D).
- **Aviso de actualización**: en el programa publicado, una página abierta se da cuenta sola de que hay una versión nueva y ofrece guardar y recargar, con la lista de novedades.
- **Eliminar varios diseños a la vez**: **Seleccionar**, en la página de inicio, elige diseños con un clic en sus tarjetas (o todos), y una sola pregunta elimina toda la selección; también funciona en la carpeta del servidor.
- **Carpetas para tus diseños**: ordena los diseños de la página de inicio en carpetas (y carpetas dentro de carpetas) arrastrándolos o con «Mover a…»; la búsqueda mira en todas, y «Hacer copia de seguridad» las conserva.
- **Proyectos como archivos**: guarda un proyecto entero, con historial, bocetos y grupos, como archivo `.lyl` y sigue en otro sitio. En Chrome y Edge eliges tú la carpeta y Ctrl+S vuelve a guardar en ese mismo archivo; los demás navegadores lo descargan. Los archivos `.skf` de versiones anteriores se siguen abriendo; al guardar, se escribe un `.lyl` a su lado.
- **Informe de error**: un enlace en el pie de página guarda un ZIP con el diseño como `.lyl` y un texto con la versión, el navegador y los últimos mensajes, listo para adjuntarlo en el foro o en GitHub, que no aceptan un `.lyl` suelto.
- **Diseños que reconoces**: cada diseño con su miniatura, en tu navegador o en la carpeta del servidor.
- **Adjuntos**: guarda dentro del diseño notas, una foto de la pieza impresa o una hoja de datos: los archivos `.md` y `.txt`, las imágenes `.png`, `.jpg` y `.webp` y los PDF viajan con el archivo `.lyl`. El ojo abre un texto o una imagen en una ventana; un PDF se descarga. SVG no se admite, porque puede llevar scripts.

### Visualización

- **Perspectiva o de frente**: cambia entre la vista normal y una plana, ortográfica, con el botón del cubo que hay junto a los controles de zoom, o pulsando **O**. Se conservan la dirección desde la que miras y el encuadre.
- **Girar la vista desde el cubo**: arrastrar el cubo de vista gira la vista como el botón derecho del ratón, o con un dedo en una tableta; un clic sigue saltando a esa cara, y un clic en una esquina o una arista mira desde ahí. Las teclas **1**–**6** también saltan, y **Mayús+1**–**6** además hacen zoom a la selección.
- **Cuatro vistas guardadas por diseño**: **Mayús+7**, **8**, **9** o **0** guarda la vista tal como está (ángulo, desplazamiento, zoom), y la tecla sola la recupera. Cada diseño guarda las suyas, y un archivo `.lyl` guardado se las lleva consigo.
- **El cubo de vista en cualquier esquina**: **Ajustes > Aspecto > Posición del cubo** pone el cubo arriba a la izquierda, arriba a la derecha, abajo a la izquierda o abajo a la derecha; en cualquier esquina que no sea la de arriba a la izquierda, los controles de cámara suben a su sitio.
- **En tu idioma**: el programa y su guía de usuario están en inglés, alemán y otros 17 idiomas; la lista de idiomas está arriba del todo a la derecha.
- **Mirar desde abajo**: el ojo sobre una cuadrícula de la barra de cámara oculta la placa, para ver la parte de abajo de un diseño sin que estorbe.
- **Una segunda vista en su propia ventana**: un botón de la barra de cámara abre una segunda ventana que muestra el mismo diseño a través de una cámara propia, con su propio cubo de vista y su propia barra de cámara, y sigue cada cambio. Se abre donde la dejaste la última vez.
- **Los paneles donde quieras**: la lista de objetos, los ajustes, la vista de sección, la cinta métrica y los paneles de las herramientas de aristas, vaciado y patrones se mueven por su barra de título y vuelven a abrirse ahí; un doble clic los acopla.
- **Menú del clic derecho**: un clic derecho corto sobre un cuerpo muestra las órdenes más usadas: duplicar, orificio o sólido, agrupar, chaflán, redondeo y vaciar para un cuerpo, reflejar y escalar en porcentaje, ocultar, bloquear, bajar al plano de trabajo y eliminar. Arrastrar con el botón derecho sigue girando la vista.
- **Vista de sección**: abre la vista por un plano perpendicular a X, Y o Z para ver paredes, cavidades y piezas que encajan entre sí, con un control deslizante grueso y otro fino. Solo se corta la vista: el diseño y todas las exportaciones quedan enteros. El corte se raya como en un plano, y un cuerpo dentro de otro con el rayado al revés; también se puede rellenar liso o dejar abierto. «Sección como SVG» guarda el propio corte a escala 1:1, para un láser o una plantilla; «Medir» lee el grosor de las paredes y las holguras directamente sobre el corte, ajustándose en perpendicular a la pared, y «Boceto desde el corte» empieza un boceto justo en el corte con sus contornos dentro (los orificios como círculos exactos), para una tapa, un inserto o una junta que encaje.
- **Plano de trabajo en cualquier cara**: pulsa W y haz clic en una cara para construir sobre ella; un clic cerca de una esquina lo pone justo en la esquina, cerca de una arista lo pone en la arista con la cuadrícula a lo largo de ella, y en la placa vacía, donde hagas clic. Un ojo oculta el plano para ver despejado mientras sigue aplicándose. Una IA también puede ponerlo en una cara.
- **Botones del ratón como en tu laminador, y ratón 3D**: en los ajustes, los botones del ratón pueden funcionar como en Bambu Studio y OrcaSlicer: arrastrar con el botón izquierdo sobre un espacio vacío gira la vista, el botón derecho la desplaza y Mayús con el botón izquierdo dibuja el recuadro de selección. Un SpaceMouse u otro ratón 3D gira, desplaza y acerca la vista en Chrome y Edge una vez conectado allí.
- **En una tableta**: un dedo trabaja en el diseño exactamente igual que el botón izquierdo del ratón: toca para seleccionar, arrastra para mover y arrastra sobre un espacio vacío para un recuadro de selección. **Dos dedos son para la vista**: sepáralos o júntalos para hacer zoom y muévelos a la vez para desplazar el plano de trabajo. Al apoyar un segundo dedo se deshace lo que el primero hubiera empezado, así que un pellizco nunca empuja una pieza. Girar la vista no tiene un gesto propio; la barra de cámara lleva un interruptor para ello, que solo aparece en pantallas táctiles, y mientras está activado un dedo orbita en vez de seleccionar. Los campos numéricos te dan su valor entero al tocarlos, listo para sobrescribirlo, porque un teclado numérico no tiene flechas para mover el cursor. Un dedo alcanza los puntos de boceto, las líneas, los tiradores, los puntos de medida y las aristas desde un poco más lejos que el ratón, pero **en una tableta la mejor herramienta es un lápiz**: es más fino y no tapa aquello a lo que apuntas.

### Vídeos

Hechos por otros, no por este proyecto:

<!-- videos:start -->
- [Layerling Tutorials](https://www.youtube.com/playlist?list=PLZ-ZWS0D1JIk) – HL ModTech (inglés). Una lista de reproducción de un usuario de Tinkercad, por ahora con una presentación de layerling de unos 23 minutos (un CAD gratuito en el navegador que amplía Tinkercad), un repaso más a fondo de sus funciones y una breve actualización sobre roscas impresas.
- [Layerling – Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) – Making Layers (inglés). Una serie sobre layerling, por ahora con «Tinkercad alternative / upgrade? Introducing Layerling!», una presentación para quien viene de Tinkercad, y «Layerling Sketch Tools!», sobre las herramientas de boceto.
- [Layerling](https://www.youtube.com/playlist?list=PLYqVFeqYBrPE) – TECHNOBENTO (inglés). Una lista de reproducción sobre layerling, por ahora con «A new way to sketch in Layerling».
- [Layerling CAD Videos](https://www.youtube.com/playlist?list=PLc09BHr_6nn8) – Printology (inglés). Una lista de reproducción sobre layerling, por ahora con «I'm 100% In on Layerling - The Next Big Free CAD» y «Layerling Features That Blow Tinkercad Out Of The Water».
- [I Tried Layerling After Tinkercad… Is It REALLY Better?](https://youtu.be/5DpOxdoNwqs) – Maker Mates Studio 3D Printing (inglés). Alguien que viene de Tinkercad prueba layerling y compara los dos.
- [Print by Layer](https://www.youtube.com/playlist?list=PLejZBz4L7CGQ) – Print N Repeat (inglés). Una lista de reproducción sobre layerling, por ahora con «The EASIEST Way to Design Hinges in Layerling» y «The EASIEST Way to 3D Model Threads!».
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) – 3D Jesus | 3D Printing & Design (inglés). Una primera prueba de layerling sin ningún manual: redondeos y chaflanes, vaciado, roscas, bocetos, cuerpos de revolución, patrones, importación y perfiles de impresora.
- [Layerling en español: el CAD gratis que reemplaza a Tinkercad (2026)](https://youtu.be/iroftGBX-0Y) – Random Maker (español). Una primera mirada de alguien que lleva años usando Tinkercad: cómo se siente la interfaz, qué cambia, qué puede hacer layerling que en Tinkercad cuesta o no se puede, y para quién sirve.
- [Proyectos en Layerling](https://www.youtube.com/playlist?list=PLTEdmvVC2bxs) – Fulcro 1900 (español). Una lista de reproducción con proyectos en layerling, por ahora con una presentación de layerling como herramienta gratuita más completa que Tinkercad, accesorios para escritorio (tres modelos), una carcasa para móvil y una varilla roscada, tuerca y tornillo.
- [Layerling](https://www.youtube.com/playlist?list=PLQuXPoMXTnRQ) – Werkplaats Marc (neerlandés). Una lista de reproducción sobre layerling, por ahora con un primer vistazo para usuarios de Tinkercad («Layerling - De Gratis Tussenstap van Tinkercad naar Fusion 360») y un tutorial de bocetos: calcar una foto, revolución y barrido a lo largo de un camino («Schetsen Uitgelegd»).
<!-- videos:end -->

## Primeros pasos

Lo más rápido es la versión publicada. Nada que instalar, nada en lo que registrarse: ábrela y construye:

**https://layerling.com/**

El resto de este apartado trata de tener tu propia copia: en tu ordenador, o en una máquina del taller que todo el mundo abre en su navegador. Se sirva desde donde se sirva la aplicación, no se envía nada a nadie: los diseños se quedan en el navegador en el que se hicieron (o en la carpeta del servidor que tú mismo configures) y las exportaciones se descargan directamente en el ordenador de cada persona.

### Inicio rápido en Windows

¿No has usado nunca un terminal? En un equipo con Windows 11 (o un Windows 10 actualizado) sin nada instalado todavía, abre
**PowerShell** (búscalo en el menú Inicio; no hacen falta permisos de administrador) y pega esta línea:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

Instala Git y Node.js si faltan, descarga layerling en `%USERPROFILE%\layerling` y lo abre en tu navegador en
`http://127.0.0.1:3000/`. Deja abierta la ventana de PowerShell mientras usas layerling; `Ctrl+C` en esa ventana lo
detiene.

Vuelve a ejecutar exactamente la misma línea cada vez que quieras **actualizar** layerling: ve que la carpeta ya existe
y trae la última versión en vez de descargarlo otra vez. El propio script está en
[`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1), así que puedes leer exactamente lo que hace antes de
ejecutarlo, o descargarlo y ejecutarlo en tu equipo en vez de pasárselo a PowerShell con una tubería.

#### Volver a abrirlo más tarde

La línea de arriba también deja en tu escritorio un acceso directo llamado **«Start layerling»**. Haz doble clic en él
cada vez que quieras volver a abrir layerling: sin PowerShell, sin reinstalar y sin volver a descargar; solo arranca el
servidor y se abre el navegador por sí solo. Además, **primero actualiza layerling** (si la carpeta no tiene cambios
tuyos) y abre el navegador solo cuando el servidor está listo de verdad. Si layerling ya está en marcha, no arranca un
segundo servidor ni actualiza por debajo del que está funcionando: solo abre la página. ¿Querías layerling en otro sitio,
por ejemplo en otra unidad? Ejecuta el script con la carpeta que quieras:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

Si tu acceso directo lo creó una versión anterior del script, ejecuta la línea una vez más; sustituye el acceso directo por el nuevo.

¿Prefieres hacerlo a mano? Abre PowerShell y ejecuta:

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

y abre tú mismo `http://127.0.0.1:3000/`. En cualquier caso, `Ctrl+C` en esa ventana lo detiene.

### Docker

Para tener layerling en un ordenador, un NAS (Synology, Unraid, etc.) o un servidor de casa sin instalar Node.js, usa la imagen ya hecha **`henmedia/layerling`** de Docker Hub (también en **`ghcr.io/henmedia/layerling`**, que es la misma imagen). Cada versión la publica para amd64 y arm64 (Raspberry Pi, NAS con ARM) con su número de versión y como `latest`. La aplicación escucha en el puerto **3000**.

Lo más rápido es una sola orden:

```bash
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

La opción `-v` guarda las miniaturas de la página de inicio en un volumen de Docker llamado `layerling-thumbnails`, para que sobrevivan a una actualización; sin ella quedan dentro del contenedor y se pierden cada vez que se vuelve a crear (a los diseños no les afecta: viven en el navegador o en la carpeta del servidor). En un NAS con gestor de contenedores (Container Manager de Synology, Unraid, Portainer), busca `henmedia/layerling` en su registro (Docker Hub) o escribe `henmedia/layerling:latest`, asigna el puerto 3000 y añade un volumen para `/app/.codex/project-thumbnails`. Para actualizar, vuelve a descargar la imagen y crea de nuevo el contenedor (o deja que lo haga Watchtower).

Las etiquetas de la imagen son números de versión sin más, **sin «v»**: `ghcr.io/henmedia/layerling:1.42.0`, mientras que la versión de GitHub se llama `v1.42.0`. Un `pull` solo trae la imagen nueva; un contenedor que ya existe sigue ejecutando la antigua hasta que se elimina y se vuelve a crear:

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`docker inspect layerling | grep image.version` muestra qué versión ejecuta de verdad el contenedor. Si montaste una carpeta para el almacenamiento del servidor, vuelve a añadir la misma opción `-v`.

Si prefieres construir tú la imagen, usa el [`Dockerfile`](docker/Dockerfile) y el [`compose.yml`](docker/compose.yml) incluidos:

1. **Instala Docker.** En Windows o macOS, instala y arranca [Docker Desktop](https://www.docker.com/products/docker-desktop/). En Linux o en un NAS necesitas Docker con Compose (`docker compose` o el `docker-compose` independiente).
2. **Consigue los archivos.** Descarga el repositorio como ZIP ([Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)) y descomprímelo, o clónalo:
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **Arráncalo.** Abre un terminal en la carpeta del proyecto (por ejemplo, PowerShell en Windows) y ejecuta:
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   Con el antiguo programa independiente, escribe `docker-compose` en vez de `docker compose`. Docker construye la imagen y ejecuta el contenedor en segundo plano (`-d`); la primera construcción tarda unos 2–3 minutos. Sin `--build`, la misma orden descarga en cambio la imagen ya hecha.
4. **Ábrelo.** En el mismo ordenador, en **`http://localhost:3000/`**; desde otros dispositivos de tu red, en **`http://<IP-DE-TU-SERVIDOR>:3000/`**.

Órdenes del día a día:

- **Detener:** `docker compose -f docker/compose.yml down`
- **Volver a arrancar:** `docker compose -f docker/compose.yml up -d`
- **Actualizar** (después de traer código nuevo o descomprimir un ZIP nuevo): `docker compose -f docker/compose.yml up -d --build`; con la imagen ya hecha, `docker compose -f docker/compose.yml pull` y después `up -d`

**Instalarlo como aplicación y usarlo sin conexión requiere https y la exportación estática.** Un navegador instala una aplicación y la guarda para usarla sin conexión solo en `https://` o en `localhost`; en una dirección `http://192.168.x.x:3000` normal no ofrece ninguna de las dos cosas (layerling oculta ahí su sugerencia de instalación). Incluso con https, los archivos para usarlo sin conexión (`sw.js`) solo se escriben en la exportación estática (mira [Alojamiento estático](#alojamiento-estático-archivos-en-un-servidor-web)), no en esta imagen, que ejecuta la versión de servidor. Para instalarlo y usarlo sin conexión en una red, sirve la exportación estática por https; para tener una dirección https delante del contenedor, usa un proxy inverso como Caddy o nginx con un certificado (por ejemplo, de mkcert).

La imagen ejecuta `next start` en modo de producción, así que el puente MCP está desactivado salvo que lo actives (mira [Conectar un cliente de IA a una copia en un NAS o servidor](#conectar-un-cliente-de-ia-a-una-copia-en-un-nas-o-servidor)). Para ofrecer una carpeta de proyectos compartida, monta un directorio con permiso de escritura y pon en `LAYERLING_SHARED_PROJECTS_DIR`, en `compose.yml`, la ruta dentro del contenedor en la que está montado; por ejemplo, `./shared-projects:/shared-projects` con `LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"` (mira [Diseños compartidos en una red](#diseños-compartidos-en-una-red)). El contenedor se ejecuta como el usuario con el número 999, así que ese usuario tiene que poder escribir en la carpeta: `sudo chown 999:999 ./shared-projects`, o añade `user: "1000:1000"` al servicio (tus propios números de usuario y grupo, que muestran `id -u` e `id -g`) para que el contenedor se ejecute como tú. Si no, la carpeta aparece en la página de inicio, pero no se puede guardar nada en ella. Después de cambiarlo, ejecuta `docker compose up -d`: `docker compose restart` mantiene el ajuste antiguo. `docker exec <contenedor> printenv LAYERLING_SHARED_PROJECTS_DIR` muestra el que está en uso.

Para guardar todos los diseños en esa carpeta y ninguno en el navegador, hay una guía completa en inglés y alemán, con su propio archivo compose y un script de actualización que comprueba la configuración, hace una copia de seguridad de la carpeta y deshace una actualización fallida: [docs/docker](docs/docker/README.md), escrita por Jürgen Keller. Con `LAYERLING_NEW_DESIGNS_ON_SERVER: "always"`, todo lo que crea un diseño va a la carpeta del servidor: la tarjeta «Crear nuevo diseño 3D», abrir o importar un archivo, restaurar una copia de seguridad (con sus carpetas), duplicar y un estado sacado del historial; y «Nueva carpeta», en la página de inicio, crea una carpeta en el servidor.

Para elegir el tema de colores que se ve en la primera visita, pon `LAYERLING_DEFAULT_THEME` a `system`, `light`, `dark` o `graphite` (de la misma forma, en `compose.yml` o en el entorno de `npm run start`). Quien ya haya abierto layerling antes conserva el tema que tiene su navegador, y cualquiera puede seguir cambiándolo con el selector de tema. Sin el ajuste, el tema sigue al del sistema. Una copia servida como archivos sin más no tiene servidor que lo lea, así que ahí no se aplica.

Para una clase o un taller con niños, `LAYERLING_SIMPLE_MODE` arranca layerling en su modo sencillo: la cinta se queda con las herramientas que usa un taller, la biblioteca de formas con una lista corta, los botones se hacen más grandes y la página de inicio muestra los diseños y nada de novedades, ni texto de bienvenida, ni enlaces que salgan de layerling. `true` es el punto de partida para quien no haya elegido (los ajustes tienen un interruptor, y para salir del modo hay que mantener pulsado un botón dos segundos); `always` vale para todos y quita el interruptor. Un enlace que termina en `?mode=simple` lo activa en el dispositivo que lo abre, y `?mode=full` lo vuelve a desactivar. Se configura igual que los demás, y una copia servida como archivos sin más no tiene servidor que lo lea (el enlace y el ajuste siguen funcionando ahí).

Con la carpeta compartida activada, `LAYERLING_NEW_DESIGNS_ON_SERVER` hace que los diseños nuevos empiecen en el servidor: `true` es el punto de partida para quien no haya elegido (puede desmarcar **Diseños nuevos en el servidor** en la página de inicio); `always` vale para todos y bloquea la casilla. Se configura igual, y una copia servida como archivos sin más no tiene servidor que lo lea.

Detrás de un proxy inverso con un dominio, el proxy tiene que pasar las cabeceras `Host` y `X-Forwarded-Proto` originales (nginx: `proxy_set_header Host $host;` y `proxy_set_header X-Forwarded-Proto $scheme;`); si no, al guardar en el servidor sale el error «Los diseños del servidor solo aceptan peticiones de este sitio.». Si el proxy reescribe el host y no puedes cambiarlo, pon la dirección que usa la gente en `LAYERLING_ALLOWED_ORIGINS` (separadas por comas; por ejemplo, `https://layerling.example.com`).

### Alojamiento estático: archivos en un servidor web

Cualquier servidor web puede servir layerling como archivos sin más; no hace falta que ejecute Node.js. Construye los archivos una vez en un ordenador que tenga Node.js (mira [Qué necesitas](#qué-necesitas)):

```bash
npm install
npm run export
```

El sitio terminado está en **`apps/web/.next-export/`**. Copia el **contenido** de esa carpeta (no la carpeta en sí) en la raíz de documentos del servidor web, de modo que `index.html` quede directamente en ella.

Cuatro cosas que conviene saber:

- **layerling necesita una dirección propia.** Los archivos se refieren unos a otros con rutas que empiezan en la raíz (`/_next/...`), así que layerling tiene que servirse en la raíz de una dirección, como `https://layerling.example.com/` o `http://192.168.0.5:8080/`. No funciona en una subcarpeta (`https://example.com/layerling/`) ni se puede abrir desde el disco (`file://`). Si solo ves un bloque de texto sin ningún estilo, no se han cargado los archivos de scripts y estilos: abre las herramientas de desarrollo del navegador (F12), busca en la pestaña Red entradas `/_next/...` en rojo y compara su dirección con el sitio donde pusiste los archivos.
- **Hay que servir las carpetas que empiezan por guion bajo.** Algunos servidores las ocultan (GitHub Pages lo hace si no hay un archivo `.nojekyll`, por ejemplo), y `_next` contiene todo el programa.
- **Una prueba rápida en tu propio ordenador:** `npx serve apps/web/.next-export` y abre la dirección que muestra.
- **Instalarlo como aplicación y usarlo sin conexión requiere https.** La exportación lleva los archivos para usarlo sin conexión (`sw.js`), pero un navegador solo los usa en una dirección `https://` o en `localhost`, no en una dirección `http://` normal de tu red.

### Diseños compartidos en una red

layerling en sí son solo archivos, así que la carpeta compartida necesita en el servidor algo que pueda escribir. Hay dos formas y te basta con una: **Node o Docker** (este apartado, con `LAYERLING_SHARED_PROJECTS_DIR`) o **un servidor web normal con PHP** (la carpeta `store`, más abajo). Un servidor web que sirve los archivos sin ninguno de los dos (`npx serve`, nginx o Apache sin PHP) muestra layerling sin problemas, pero no tiene carpeta en el servidor.

Si ejecutas layerling con `npm run dev` o `npm run start` en una máquina que otras personas abren en su navegador, puede ofrecer una
carpeta compartida para diseños `.lyl`. `npm run start` sirve lo que hizo `npm run build`, así que ejecuta eso una vez antes. Apunta `LAYERLING_SHARED_PROJECTS_DIR` a un directorio en el que pueda escribir el usuario que arranca layerling (una carpeta bajo `/srv` suele ser de root: crea una tuya o cambia su propietario) y arranca:

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projects npm run start
```

La página de inicio muestra entonces, junto a los diseños de tu navegador, una carpeta llamada **En el servidor**. Ábrela y
estarás en esa carpeta: **Nuevo diseño** crea uno ahí mismo, **Nueva carpeta** crea una subcarpeta y una ruta bajo el
título dice dónde estás. Una tarjeta `..` lleva hacia fuera, y **Volver a los diseños de este navegador**, a la izquierda de los botones, vuelve a los diseños de este navegador. Los diseños se mueven arrastrándolos a una carpeta, a esa tarjeta o a un tramo de la
ruta, o con **Mover a…** en su menú. Un diseño de tu navegador pasa al servidor del mismo modo: arrastra su
tarjeta a la carpeta del servidor.

Dos botones de la página de inicio ahorran el trabajo de mover los diseños de uno en uno: **Pasar todos al servidor** mueve de una vez todos los diseños de este navegador a la carpeta del servidor, y la casilla **Diseños nuevos en el servidor** hace que cada diseño nuevo empiece en la carpeta del servidor, para que se guarde allí desde el primer cambio. Un diseño cuyo nombre ya está ocupado en el servidor se queda en el navegador.

El cuadro de búsqueda de arriba busca en toda la carpeta del servidor, no solo en la que estás. Cada resultado dice
qué carpeta lo contiene, y esa carpeta es un botón: un clic y estás allí, con la búsqueda borrada. Las carpetas
también se encuentran por su nombre. Mientras buscas, la tarjeta del servidor en la página de inicio dice cuántas
coincidencias te esperan allí.

**Duplicar**, en el menú de un diseño, hace una copia. En el servidor se copia el propio archivo, junto al original y
con un nombre libre, imagen incluida: no se vuelve a empaquetar nada, así que la copia lleva exactamente la geometría del original. En
tu navegador, la copia se convierte en un diseño propio, con las mismas formas, el mismo historial y su propia miniatura,
y no pertenece a nadie en el servidor.

Un diseño que vive en el servidor se guarda allí solo, cinco segundos después del último cambio y cuando sales del
editor. Las miniaturas van junto a los archivos, en `.thumbnails`. Los diseños que solo están en tu navegador se quedan ahí, sin tocar.

Las formas personalizadas guardadas en el servidor van a una carpeta llamada `Custom shapes` arriba del todo en el almacenamiento, cada una como un `.lyl` con su
imagen. layerling la crea con la primera de esas formas; es una carpeta normal, así que aparece en la página de inicio y
una forma de ella se abre y se guarda como cualquier diseño. Ni la vía de Node ni `store.php` necesitan nada más para ello.

Los ajustes guardados con «Fijar por defecto» en los ajustes del espacio de trabajo también se guardan en el almacenamiento, como `.settings/default.json`
(una carpeta oculta que la página de inicio no muestra). Un navegador que ha perdido los suyos, porque se borraron sus datos o porque es
otro navegador, los recoge al cargar la página de inicio, así que un diseño nuevo vuelve a empezar con ellos. Hay unos ajustes por defecto para
todo el almacenamiento; ganan los últimos guardados en cualquier navegador. Elimina el archivo para volver a los de cada navegador.

Abrir un diseño del servidor te da una copia de trabajo local y privada. Al volver a guardarlo, primero se comprueba la revisión en el
servidor; si otra persona ha cambiado el archivo entretanto, layerling se niega a sobrescribirlo y te pide que recargues o que guardes
con otro nombre. Esto es almacenamiento compartido de archivos, no edición simultánea.

Detrás de un proxy inverso con autenticación (como Authelia, oauth2-proxy, Cloudflare Access o la autenticación básica HTTP), pon en `LAYERLING_USER_HEADER` la cabecera que pone tu proxy (por ejemplo, `LAYERLING_USER_HEADER=X-Forwarded-Email` o, en Apache, `SetEnv LAYERLING_USER_HEADER Remote-User`) para separar los diseños de cada usuario en `.users/<usuario>/`. Esto solo es seguro cuando a layerling únicamente se puede llegar a través del proxy, para que nadie pueda enviar cabeceras arbitrarias directamente al servidor.

#### Sin Node: la carpeta `store`

Una instalación servida como exportación estática (archivos sin más en un servidor web) no puede escribir nada por sí sola. Para ese caso,
`store.php` viaja con la exportación. Crea junto a `index.html` una carpeta llamada `store` en la que pueda escribir el servidor web,
y layerling ofrece el mismo almacenamiento compartido de arriba, carpetas incluidas. Sin la carpeta, la función sigue invisible,
y la guía breve del editor explica cómo activarla. El servidor web necesita PHP.

PHP limita de entrada lo que se puede subir (`upload_max_filesize` y `post_max_size`, unos pocos megabytes), y un diseño grande o una copia de seguridad de
muchos diseños puede ocupar más. `store.php` dice entonces con qué límite ha topado y en cuánto está; sube los dos en `php.ini` o, en la
imagen de Docker, con un archivo como `uploads.ini` en `/usr/local/etc/php/conf.d/` (`upload_max_filesize = 512M`, `post_max_size = 512M`).

La carpeta **no tiene inicio de sesión**: quien pueda llegar a la página puede leer, escribir y eliminar lo que hay en ella. En una red de casa o en
un taller, de eso se trata; en un sitio accesible desde internet, protégela o no la pongas.

Nada de la carpeta está pensado para abrirse por su dirección: layerling solo la lee y la escribe a través de `store.php`.
En Apache, `store.php` escribe en la carpeta un `.htaccess` que rechaza cualquier petición directa. Apache solo lo lee donde
`AllowOverride` se lo permite (lo predeterminado en Debian para `/var/www` es `None`, que lo ignora), y nginx y otros servidores no lo leen
nunca, así que ahí niega tú el acceso a `store/` (en Apache: `<Directory /var/www/html/store> Require all denied </Directory>`;
en nginx: `location /store/ { deny all; }`). `store.php` también comprueba cada exportación que guarda, así que un archivo que pudiera ejecutarse en un
navegador se rechaza de todos modos.

La carpeta también puede estar fuera de la raíz web, donde no llega ninguna dirección, haya `.htaccess` o no: pon en
`LAYERLING_SHARED_PROJECTS_DIR`, el mismo ajuste que lee el servidor de Node, su ruta; en Apache con
`SetEnv LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects`, en nginx con
`fastcgi_param LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects;` y en Docker como variable de entorno del
contenedor. Esa carpeta ocupa entonces el lugar de `store`; también tiene que existir y el servidor web tiene que poder escribir en ella.

Algo que hay que recordar al desplegar: si replicas la exportación con una opción que elimina todo lo que sobra (`rsync
--delete`, `robocopy /MIR`, `-delete` de WinSCP), excluye `store` expresamente, o cada actualización borrará los proyectos.

## Desarrollar layerling

Este es el camino si quieres cambiar el código.

### Qué necesitas

- Node.js 22.18 o posterior (los scripts de la guía y de las fuentes cargan directamente archivos TypeScript, y las versiones anteriores no pueden); la 24 también sirve, y es la que usa la imagen de Docker
- npm, que viene con Node.js

Comprueba tus versiones con `node -v` y `npm -v`. Si esas órdenes no funcionan, instala Node.js desde su web oficial
y vuelve a abrir el terminal.

### Instalar y arrancar

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

¿No tienes Git? Pulsa el botón verde **Code** de la página de GitHub, elige **Download ZIP**, descomprímelo, abre un terminal en la
carpeta descomprimida y empieza con `npm install`.

Luego abre `http://127.0.0.1:3000/`. Deja el terminal abierto mientras usas la aplicación; `Ctrl+C` detiene el servidor de desarrollo.

Para abrir el servidor de desarrollo desde otro ordenador por un nombre, como `http://myhost.local:3000/`, pon ese nombre en la variable de entorno `LAYERLING_ALLOWED_DEV_ORIGINS` antes de arrancar (varios nombres separados por comas; `*.local` para todos los que terminan en `.local`). Sin ella, el servidor de desarrollo solo responde a `localhost` y `127.0.0.1`. La exportación estática y `npm run start` no la necesitan.

En Linux y macOS, `scripts/start-layerling.sh` se encarga del arranque diario: primero actualiza la copia de trabajo (se lo salta si cambiaste archivos en ella), arranca el servidor, espera a que responda y luego abre el navegador. Ejecútalo desde cualquier sitio; por ejemplo, `~/layerling/scripts/start-layerling.sh`. Necesita Git y Node.js, como antes. Si layerling ya está en marcha en ese puerto, solo abre el navegador en vez de arrancar un segundo servidor. ¿El puerto 3000 lo ocupa otra cosa? Arráncalo con `PORT=3100 scripts/start-layerling.sh`. Se ha probado en Debian Linux (sin escritorio, así que el paso del navegador solo muestra la dirección) y en un terminal de Windows; en macOS está sin probar: si en tu sistema no se porta bien, cuéntanoslo en las discusiones.

### Desarrollar en un contenedor

¿Prefieres no instalar Node.js? Desarrolla en un contenedor. Necesitas un motor de contenedores con Compose
(`docker compose` o `podman compose`; Podman sin root con SELinux también funciona: la opción `:z` del archivo compose se encarga
de las etiquetas de los archivos):

```bash
docker compose -f docker/compose.dev.yml up
```

Abre `http://127.0.0.1:3000/`. El primer arranque instala las dependencias; los siguientes van directamente al servidor de desarrollo con
recarga en caliente. Detenlo con `Ctrl+C`. Si actualizas las dependencias y algo parece desfasado, borra `node_modules/` en la
carpeta del proyecto y arranca de nuevo.

¿Tienes a la vez en marcha el contenedor de producción de `docker/compose.yml`? También usa el puerto 3000: cambia el
puerto del lado del anfitrión en uno de los dos (por ejemplo, `"3100:3000"`).

### Órdenes útiles

| Orden | Qué hace |
| --- | --- |
| `npm run typecheck` | Comprobaciones de TypeScript |
| `npm run test` | Pruebas unitarias |
| `npm run test:e2e` | Pruebas de extremo a extremo |
| `npm run build` | Construcción de producción (la sirve `npm run start`) |
| `npm run export` | Exportación estática para un alojamiento web normal |
| `npm run guide` | Construye las páginas de la guía de usuario a partir de `docs/guide` (la exportación y `npm run dev` también lo hacen) |
| `npm run guide:images` | Vuelve a hacer las imágenes de la guía desde el programa en marcha (necesita `npm run dev -- -p 3010`; mira `docs/guide/README.md`) |
| `npm run printers:update` | Actualiza los perfiles de impresora a partir de los de OrcaSlicer |
| `npm run mcp:layerling` | Arranca el servidor MCP para clientes de IA (mira más abajo) |

## Skill MCP de layerling

layerling incluye un servidor MCP local para los clientes de IA que admiten herramientas MCP. Permite a un agente examinar y manejar una pestaña
del editor en vivo: listar los editores abiertos, leer la escena, crear, cambiar y seleccionar objetos, agrupar, cortar y separar piezas, listar los
identificadores de las aristas CAD, aplicar chaflanes o redondeos, vaciar un cuerpo, revisar errores y hacer fotos de la vista.

Funciona con un servidor de desarrollo local. En las construcciones de producción y en el alojamiento estático la ruta MCP está desactivada, salvo que el
servidor la active con un token de acceso ([mira más abajo](#conectar-un-cliente-de-ia-a-una-copia-en-un-nas-o-servidor)); en layerling.com está siempre desactivada.

1. Arranca layerling desde la carpeta del proyecto con `npm run dev` (mira [Instalar y arrancar](#instalar-y-arrancar)).
2. Abre una pestaña del editor, por ejemplo `http://127.0.0.1:3000/?editor=1`, o no lo hagas: si no hay ningún editor abierto, la primera herramienta que lo necesita arranca tu navegador con un editor (no con una copia en un NAS o servidor; `LAYERLING_MCP_OPEN_EDITOR=0` lo desactiva).
3. Conecta tu cliente de IA como se explica más abajo. Él mismo arranca el servidor MCP con
   `node scripts/layerling-mcp-server.mjs`.

Las herramientas principales son `layerling_list_editors`, `layerling_read_scene`, `layerling_list_objects`,
`layerling_create_shape`, `layerling_update_object`, `layerling_list_edges`, `layerling_apply_edge_treatment`,
`layerling_hollow_object`, `layerling_make_lid`, `layerling_offset_object`, `layerling_cut_out`, `layerling_array_objects`, `layerling_set_section_view` y `layerling_capture_image`.

### Claude Code

No hay que instalar nada: el repositorio ya trae un `.mcp.json`, que registra el servidor MCP para este proyecto, y una copia de la
skill en `.claude/skills/layerling-mcp-skill`, que es donde Claude Code las busca. Abre la carpeta de layerling en
Claude Code y pide:

```text
Usa las herramientas MCP de layerling para listar mis editores de layerling abiertos y examinar la escena actual.
```

### Claude Desktop

Claude Desktop no lee el `.mcp.json` ni los archivos de skills de un proyecto, pero puede usar el mismo servidor MCP desde su propia
configuración. Añade allí el servidor tomando como plantilla [`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json)
y cambiando la ruta del script por la ruta absoluta en tu equipo. Después de reiniciar Claude Desktop, pide:

```text
Usa las herramientas MCP de layerling para listar los editores abiertos, examinar la escena y cambiar el objeto seleccionado.
```

### Codex

Copia la skill de `docs/skills/layerling-mcp-skill` en tu carpeta de skills de Codex.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.codex\skills\layerling-mcp-skill"
```

macOS o Linux:

```bash
mkdir -p ~/.codex/skills
cp -R docs/skills/layerling-mcp-skill ~/.codex/skills/
```

Luego añade una entrada de servidor MCP a tu configuración de Codex tomando como plantilla [`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml)
y cambiando la ruta del script por la ruta absoluta en tu equipo. Reinicia Codex y pide:

```text
Usa $layerling-mcp-skill para listar mis editores de layerling abiertos y examinar la escena actual.
```

### Gemini y Antigravity

Para Antigravity, el repositorio trae una copia de la skill en `.agents/skills/layerling-mcp-skill`, que Antigravity encuentra por sí solo. Para Gemini CLI, copia la skill de `docs/skills/layerling-mcp-skill` en tu carpeta global de skills.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.gemini\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.gemini\skills\layerling-mcp-skill"
```

macOS o Linux:

```bash
mkdir -p ~/.gemini/skills
cp -R docs/skills/layerling-mcp-skill ~/.gemini/skills/
```

Luego añade el servidor al `settings.json` de Gemini CLI o al `mcp_config.json` de Antigravity tomando como plantilla [`docs/mcp/gemini-config.example.json`](docs/mcp/gemini-config.example.json) y cambiando la ruta del script por la ruta absoluta en tu equipo. Reinicia el cliente y pide:

```text
Usa las herramientas MCP de layerling para listar mis editores de layerling abiertos y examinar la escena actual.
```

### Conectar un cliente de IA a una copia en un NAS o servidor

Una copia que alojas tú (la imagen de Docker en un NAS, un servidor de casa) puede dejar que un cliente de IA maneje sus editores abiertos a través de la
red. Esta opción viene **desactivada de fábrica**, porque quien pueda manejar el puente puede leer y cambiar los diseños abiertos. Se activa
con dos ajustes en el servidor, que se leen al arrancar; la imagen ya hecha no hay que volver a construirla:

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "un-secreto-largo-y-aleatorio-de-al-menos-16-caracteres"
```

Sin un token de al menos 16 caracteres, el puente sigue cerrado. Después:

1. Abre en un navegador una pestaña del editor de esa copia, por ejemplo `http://nas:3000/?editor=1`, y déjala abierta.
2. Dale al cliente MCP la dirección y el mismo token: pon `LAYERLING_URL=http://nas:3000` y
   `LAYERLING_MCP_TOKEN=<el token>` en su configuración (mira los ejemplos de `docs/mcp`).

El token protege las órdenes: solo un cliente que lo envía puede listar o manejar los editores. Las páginas del editor no lo necesitan,
pero solo cuentan si son páginas de esa copia, abiertas con una dirección o un nombre que solo pueda usar alguien de tu propia
red (una dirección IP, un nombre sin punto o uno que termine en `.local` o `.lan`). Así una página web de
internet no puede llegar a tu NAS a través de tu navegador. Si abres la copia con un dominio real, por ejemplo detrás de un
proxy inverso, ponlo en `LAYERLING_MCP_ALLOWED_HOSTS` (separados por comas). Úsalo en una red de confianza, y con HTTPS
para todo lo que vaya más allá: el token viaja en una cabecera.

## Contribuir

Las contribuciones son bienvenidas, y no hace falta saber de impresión 3D para ayudar: una frase más clara en este README
también cuenta. Buenos sitios por los que empezar:

- arreglos de errores del editor
- casos de prueba de geometría y de operaciones booleanas
- casos límite de importación y exportación (STL, OBJ, 3MF, STEP, SVG, DXF)
- pulir la interfaz
- capturas de pantalla y vídeos para la documentación
- mejoras de accesibilidad y de rendimiento

Lee [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) antes de abrir un *pull request*. Lo que cambió en cada versión está en
el [registro de cambios](docs/CHANGELOG.md) (en inglés).

## Seguridad

Por favor, no abras incidencias públicas para avisos que afecten a la seguridad. Lee [.github/SECURITY.md](.github/SECURITY.md) para ver
cómo informar.

## De dónde viene

layerling es una bifurcación de [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D), de Formsmith746 y los colaboradores
de SketchForge. La bifurcación empezó el 16 de septiembre de 2026 a partir de SketchForge 1.0.9. SketchForge sigue siendo un proyecto excelente y
la razón de que este exista.

## Marcas

Tinkercad es una marca comercial de Autodesk, Inc. layerling es un proyecto independiente: no está afiliado a Autodesk ni cuenta con su respaldo ni su patrocinio.

## Licencia

Copyright (C) 2026 layerling contributors.
Copyright (C) 2026 SketchForge contributors.

layerling es una versión modificada de SketchForge-3D y se distribuye bajo la **GNU Affero General Public License v3.0 only**
(`AGPL-3.0-only`), la misma licencia que el original. Mira [LICENSE](LICENSE).

Si modificas layerling y dejas que otras personas usen la versión modificada a través de una red, la sección 13 de la licencia te obliga a
ofrecerles el código fuente correspondiente. El panel lleva un enlace **Source** precisamente para eso: al construir, pon en
`NEXT_PUBLIC_SOURCE_CODE_URL` la dirección pública del código fuente del que sale tu construcción.
