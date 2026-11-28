---
title: Preguntas frecuentes
summary: Respuestas breves a lo que más se pregunta, sobre el guardado, los modelos grandes, los redondeos, la IA y la impresión, cada una con el camino a la explicación completa.
contents: questions
---

Cada respuesta es breve y termina con el lugar de esta guía que lo explica por completo. El cuadro de búsqueda de arriba encuentra una pregunta por cualquiera de sus palabras.

## Guardado y copias de seguridad

### ¿Dónde se guardan mis diseños? ¿Hay una nube?

En el navegador de tu propio ordenador. No hay cuenta ni nube y no se sube nada; cada cambio se guarda solo. Quien tenga layerling en un servidor propio puede además guardar allí los diseños en una carpeta compartida.

Más información: [Dónde se guardan tus diseños](chapter:files-and-saving#donde-se-guardan-tus-disenos)

### Mis diseños han desaparecido. ¿Qué ha pasado?

Los diseños están en un solo navegador de un solo ordenador. Desaparecen si se han borrado los datos que el navegador guardaba de la página, y no aparecen en otro navegador ni en otro ordenador. Safari en Mac, iPhone y iPad borra los datos de una página después de siete días sin visitarla, a menos que layerling esté instalado como aplicación. Si tienes una copia de seguridad, {{ui:dashboard.restoreBackup}} en la página de inicio recupera los diseños, con sus carpetas e imágenes.

Más información: [Tus diseños, tu copia de seguridad](chapter:files-and-saving#tus-disenos-tu-copia-de-seguridad)

### ¿Cómo hago una copia de seguridad de todo, incluso automáticamente en una carpeta?

{{ui:dashboard.backupAll}} en la página de inicio reúne todos los diseños en un archivo ZIP. Además, layerling conserva por sí solo versiones anteriores de cada diseño, y en Chrome y Edge puede escribir cada una de ellas como archivo .lyl en una carpeta que tú elijas. Las versiones guardadas en el navegador se pierden cuando se pierden los datos del navegador, así que no sustituyen ni al ZIP ni a la carpeta.

Más información: [Versiones anteriores](chapter:files-and-saving#versiones-anteriores)

### ¿Cómo llevo un diseño a otro ordenador o navegador?

Guárdalo como archivo .lyl desde la ventana de exportación y abre ese archivo en el otro ordenador desde la página de inicio. Para todos los diseños a la vez, usa {{ui:dashboard.backupAll}} aquí y {{ui:dashboard.restoreBackup}} allí; los diseños que ya estén no se añaden dos veces.

Más información: [Hacer copias de seguridad y compartir](chapter:files-and-saving#hacer-copias-de-seguridad-y-compartir)

### ¿Qué pasa si borro los datos del navegador?

Se eliminan los diseños guardados en ese navegador, y también las versiones anteriores que layerling conservaba allí. Un ZIP de {{ui:dashboard.backupAll}}, tus archivos .lyl y una carpeta de copias de seguridad en tu disco no se tocan. Primero haz la copia de seguridad y después borra.

Más información: [Tus diseños, tu copia de seguridad](chapter:files-and-saving#tus-disenos-tu-copia-de-seguridad)

### ¿Cómo vuelvo a un estado anterior?

Deshacer retrocede paso a paso. La vista del historial muestra cada paso con un control deslizante sin cambiar el diseño, y puede crear un diseño nuevo a partir de cualquiera de ellos. Para un estado de hace unas horas o de la semana pasada, la lista de versiones anteriores abre una versión antigua como diseño nuevo y deja el actual tal como está.

Más información: [Mirar atrás: la vista del historial](chapter:select-and-arrange#mirar-atras-la-vista-del-historial) y [Versiones anteriores](chapter:files-and-saving#versiones-anteriores)

### ¿Pueden ir el STL y el 3MF directamente a la carpeta de mi proyecto? ¿Y cómo vuelvo a tener una descarga?

En Chrome y Edge, la primera exportación de un diseño pregunta dónde guardar, y las siguientes escriben en ese mismo archivo sin preguntar. Firefox y Safari siempre descargan. Si quieres una descarga cada vez, activa {{ui:workspace.stlAsDownload}} en los ajustes.

Más información: [Exportar](chapter:files-and-saving#exportar)

### El cuadro de guardado se ha cerrado y no hay ningún archivo. ¿Por qué?

El navegador informa de un cuadro que no ha podido usar igual que de uno que has cancelado, y tampoco se puede escribir un archivo que un antivirus bloquea. Entonces el mensaje de arriba ofrece {{ui:status.saveAsDownload}}, que deja el archivo en tus descargas. Para prescindir del cuadro de forma permanente, activa {{ui:workspace.lylAsDownload}} y {{ui:workspace.stlAsDownload}} en los ajustes.

Más información: [Hacer copias de seguridad y compartir](chapter:files-and-saving#hacer-copias-de-seguridad-y-compartir)

## Instalación y actualizaciones

### ¿Hay una aplicación para descargar?

layerling se instala desde el navegador: entonces tiene su propio icono y su propia ventana y arranca sin red. No hay ningún instalador para descargar, y el original solo está en layerling.com. **No descargues ni ejecutes un instalador de "layerling" desde ningún otro sitio:** no procede de layerling y puede contener software malicioso. Para tener tu propia copia hay un inicio rápido para Windows y una imagen de Docker.

Más información: [Instalar como aplicación](chapter:offline-and-install#instalar-como-aplicacion) y [Alojarlo tú mismo](chapter:offline-and-install#alojarlo-tu-mismo)

### ¿Funciona layerling sin internet?

Sí, después de la primera visita arranca sin red, mejor si está instalado como aplicación. Solo hay una cosa que se carga cuando se necesita por primera vez: el núcleo CAD para la primera exportación STEP, unos 22 MB.

Más información: [Instalar como aplicación](chapter:offline-and-install#instalar-como-aplicacion)

### ¿Cómo consigo una actualización?

Llega sola. Una página abierta detecta una versión nueva y muestra una tarjeta con las novedades; {{ui:newVersion.reload}} guarda primero el diseño abierto y después carga la versión nueva. La página de inicio también indica si hay una versión más reciente.

Más información: [Actualizaciones](chapter:offline-and-install#actualizaciones)

### ¿Qué navegadores y tabletas funcionan?

Chrome, Edge, Firefox y Safari, en un ordenador, una tableta o un teléfono; la vista 3D necesita WebGL. Algunas cosas solo las pueden hacer Chrome y Edge: escribir en tus propios archivos y carpetas, la carpeta de copias de seguridad y abrir archivos .lyl con un doble clic. En una tableta, un dedo hace lo mismo que el botón izquierdo del ratón.

Más información: [Dedos y lápiz](chapter:tablet-and-touch#dedos-y-lapiz)

## IA

### ¿Cuál es la forma más fácil de configurar una IA?

Dale a una IA que pueda trabajar en tu ordenador la dirección `https://github.com/henmedia/layerling` y pídele que instale y configure para ti layerling con su servidor MCP. Necesita un programa como la pestaña Code de la aplicación de Claude, Claude Code, Codex, Antigravity o Gemini CLI. Para Windows y Mac, la guía tiene además los pasos uno por uno.

Más información: [Paso a paso para principiantes](chapter:ai-with-mcp#paso-a-paso-para-principiantes)

### ¿Por qué la IA no puede conectar con layerling.com?

El puente entre la IA y el editor solo existe en una copia de layerling que se ejecute en tu propio ordenador. En layerling.com está siempre desactivado, y un chat en el navegador no puede instalar nada. Así que la IA necesita un layerling arrancado en local y un programa que hable MCP.

Más información: [Configuración](chapter:ai-with-mcp#configuracion)

### ¿Qué IA sirve y cuánto cuesta?

Cualquier programa que hable MCP; la guía describe Claude, Codex, Gemini y Antigravity. layerling no cuesta nada. Lo que cueste la IA depende de su proveedor: la pestaña Code de la aplicación de Claude, por ejemplo, forma parte de los planes de pago de Claude.

Más información: [Configuración](chapter:ai-with-mcp#configuracion)

### ¿Qué datos llegan al proveedor de la IA?

Lo que la IA lee: los objetos del diseño abierto y las imágenes de la vista que toma. Eso llega al proveedor de tu programa de IA como cualquier otra cosa que escribas en él. El puente se ejecuta en tu ordenador, y sin una IA no sale nada de él.

Más información: [Lo que puede hacer la IA](chapter:ai-with-mcp#lo-que-puede-hacer-la-ia)

## Memoria, velocidad e historial

### ¿Por qué layerling va lento con mi STL?

Un STL es una malla de triángulos, y una muy grande hace que el editor vaya más lento, ocupa mucha memoria y hace que el guardado sea lento. layerling lo avisa después de la importación a partir de 400 000 triángulos en una malla, o de un millón en todo el diseño. Simplifica primero la malla, importa solo las partes que necesites o construye la pieza con las formas propias de layerling.

Más información: [Mallas grandes](chapter:files-and-saving#mallas-grandes)

### ¿Por qué faltan pasos en mi historial?

Hay dos cosas que lo acortan. El ajuste {{ui:workspace.savedHistory}} conserva 100 pasos por diseño si no lo cambias, y los más antiguos se descartan. Y cuando un diseño es demasiado grande para guardarse con todo su historial, layerling lo guarda con la mitad de los pasos, después otra vez con la mitad, y te avisa. El diseño en sí se guarda siempre completo.

Más información: [Historial guardado](chapter:view-and-workplane#historial-guardado)

### ¿Qué hago cuando el almacenamiento del navegador está lleno?

No cierres ni recargues la pestaña: tus últimos cambios solo están ahí. Primero guarda una copia exportando como .lyl. Después haz sitio: elimina pasos en la vista del historial, quita los diseños que ya no necesites, o haz una copia de seguridad de ellos y elimínalos.

Más información: [Tus diseños, tu copia de seguridad](chapter:files-and-saving#tus-disenos-tu-copia-de-seguridad)

### Mi diseño es demasiado grande para guardarlo. ¿Y ahora qué?

Su historial y sus mallas ocupan juntos demasiado espacio. layerling ya lo ha intentado con menos pasos del historial antes de avisarte. Borra el historial en la vista del historial, simplifica las mallas importadas más pesadas o guarda un .lyl solo con el estado actual.

Más información: [Hacer copias de seguridad y compartir](chapter:files-and-saving#hacer-copias-de-seguridad-y-compartir) y [Simplificar una malla importada](chapter:files-and-saving#simplificar-una-malla-importada)

### El navegador se ha quedado sin memoria. ¿Qué ayuda?

Esto pasa con mallas de millones de triángulos, en las que un solo paso necesita más memoria de la que recibe una pestaña del navegador. Reduce los triángulos de las mallas importadas con {{ui:editor.tool.simplify}}, cierra otras pestañas y vuelve a intentarlo. Si ocurre al guardar, un historial más corto también ayuda.

Más información: [Mallas grandes](chapter:files-and-saving#mallas-grandes)

### Un diseño se abre muy despacio o no se abre. ¿Qué puedo hacer?

Casi siempre es que su historial de pasos para deshacer ha crecido mucho. {{ui:dashboard.openWithoutHistory}}, en el menú del diseño en la página de inicio, lee solo el estado actual; elimina para siempre los pasos anteriores, así que haz antes una copia de seguridad del diseño si quieres conservarlos. Una versión anterior de las copias de seguridad se abre como diseño nuevo.

Más información: [Hacer copias de seguridad y compartir](chapter:files-and-saving#hacer-copias-de-seguridad-y-compartir)

### layerling va a tirones. ¿Qué ajustes ayudan?

{{ui:workspace.fastMode}}, en los ajustes, desactiva las sombras, las líneas de arista de todos los cuerpos y la inercia de la cámara, y dibuja la vista solo con la resolución de la pantalla. Comprueba que el navegador usa la tarjeta gráfica: en `chrome://gpu` o `edge://gpu` debería poner "Hardware accelerated" junto a WebGL. La otra causa habitual son las mallas importadas grandes.

Más información: [Cuando layerling va lento](chapter:view-and-workplane#cuando-layerling-va-lento)

### El editor se queda parado o calcula durante mucho tiempo. ¿Espero o recargo?

Primero espera. Los cortes, los grupos y el trabajo con aristas se calculan en segundo plano, y mientras tanto se muestra {{ui:status.computing}}; las tareas largas, como el vaciado, se detienen solas con un mensaje y no cambian nada. Si ha habido que reiniciar el núcleo CAD, el mensaje lo dice y no hace falta recargar. Recargar es seguro, porque cada cambio se guarda solo, con una excepción: mientras se muestre el aviso rojo {{ui:notice.designNotSavedTitle}}, exporta antes un .lyl.

Más información: [Cuando layerling va lento](chapter:view-and-workplane#cuando-layerling-va-lento)

### La vista 3D se queda vacía, o un mensaje dice que no ha podido iniciarse. ¿Y ahora qué?

El navegador no ha podido iniciar WebGL, que es lo que dibuja la vista 3D. La causa está en el navegador o en el controlador gráfico, no en tu diseño, y tus diseños guardados no se eliminan. Cierra otras pestañas con contenido 3D y reinicia el navegador, activa la aceleración por hardware, permite WebGL si un ajuste de privacidad o una extensión lo bloquea, y actualiza el navegador y el controlador gráfico. Probar con otro navegador es una comprobación rápida.

Más información: [Cuando layerling va lento](chapter:view-and-workplane#cuando-layerling-va-lento)

## Modelos importados

### «Simplificar malla» o «Hacer exacto»: ¿cuál elijo?

{{ui:editor.tool.simplify}} conserva una parte de los triángulos, así que un modelo pesado se vuelve más ligero; sigue siendo una malla. {{ui:editor.tool.makeExact}} reconstruye un modelo formado por planos, cilindros, conos y esferas como un cuerpo CAD de verdad, de modo que los redondeos y chaflanes siguen aristas limpias y una exportación STEP lleva caras reales. Admite hasta 400 000 triángulos; una figura o un escaneado se quedan como malla. Para una pieza técnica grande: primero simplifica, con {{ui:simplify.keepEdges}} activado, y después hazla exacta.

Más información: [Simplificar una malla importada](chapter:files-and-saving#simplificar-una-malla-importada) y [Hacer exacta una malla importada](chapter:files-and-saving#hacer-exacta-una-malla-importada)

### ¿Por qué falla un corte, o por qué mi malla «no es estanca»?

Un cuerpo solo se puede cortar si su superficie está cerrada. Si una malla importada tiene huecos, layerling nombra la pieza y el número de aristas abiertas y la deja fuera. Los agujeros pequeños los cierra él mismo; los más grandes hay que repararlos en el programa del que procede el modelo o en una herramienta de reparación de mallas. La comprobación de impresión muestra qué cuerpo está abierto.

Más información: [Comprobar la impresión](chapter:printing#comprobar-la-impresion)

### ¿Cómo importo bien un SVG?

Un SVG entra como cuerpo de boceto, de 4 mm de alto, y sus puntos se pueden cambiar en el modo de boceto. Escribe la anchura en milímetros en la ventana de importación antes de importar; sin un número, conserva su propio tamaño. Los contornos que se cruzan consigo mismos no pueden convertirse en un sólido: se dejan fuera y se cuentan. Une en el programa de dibujo las partes que se solapan, cierra los contornos y vuelve a importar.

Más información: [Importar](chapter:files-and-saving#importar)

## Redondeos y chaflanes

### ¿Por qué no se puede aplicar un redondeo?

Casi siempre es demasiado grande para ese sitio: invadiría las caras vecinas, o la arista se curva más de lo que permite el radio. A menudo basta con uno o dos milímetros menos, y en los ángulos agudos un redondeo necesita más espacio del que su radio hace pensar. Si las aristas no se pueden redondear juntas, coge menos a la vez; la arista que estorba se dibuja en rojo. {{ui:edge.findLargest}} busca el tamaño por ti.

Más información: [Achaflanar y redondear aristas](chapter:edges-and-hollowing#achaflanar-y-redondear-aristas)

### ¿Por qué han desaparecido mis redondeos después de cambiar el boceto?

Después de {{ui:inspector.editSketch}}, el cuerpo se construye de nuevo y tiene aristas nuevas. layerling vuelve a poner los redondeos y chaflanes en las aristas que están donde estaban las antiguas, siempre que el cuerpo tenga tantas aristas como antes. Con una esquina más o menos se dejan fuera, y el mensaje dice cuántos. Deshacer lo recupera todo.

Más información: [Convertirlo en un cuerpo](chapter:sketches#convertirlo-en-un-cuerpo)

### ¿Por qué no puedo elegir algunas aristas de un modelo importado?

STL, OBJ y 3MF solo traen triángulos, y las herramientas de aristas trabajan con mallas de hasta 4000 triángulos. {{ui:editor.tool.makeExact}} convierte una pieza técnica en un cuerpo CAD de verdad, en el que un taladro tiene un único borde redondo que un redondeo puede seguir. Un archivo STEP trae geometría exacta desde el principio.

Más información: [Hacer exacta una malla importada](chapter:files-and-saving#hacer-exacta-una-malla-importada)

## Grupos, orificios y medidas

### ¿Por qué los orificios se vuelven ovalados cuando estiro un grupo?

Un grupo al que se le cambia el tamaño estira todo lo que contiene, como si estuviera dibujado sobre goma. En los ajustes del grupo, elige {{ui:inspector.groupResizeKeepParts}} en {{ui:inspector.groupResize}}: las piezas que atraviesan el grupo de lado a lado se estiran, y los orificios y las piezas pequeñas conservan su tamaño y su distancia al lado más cercano.

Más información: [Cambiar el tamaño de un grupo: mantener orificios y piezas pequeñas](chapter:solids-and-holes#cambiar-el-tamano-de-un-grupo-mantener-orificios-y-piezas-pequenas)

### ¿Por qué falla la agrupación, o por qué el resultado tiene huecos?

O bien una pieza no está cerrada, y el mensaje dice cuál, o bien dos piezas casi se encuentran sin llegar a tocarse. Desagrupa, alinea las piezas con exactitud o cambia un poco un tamaño o una posición, y vuelve a agrupar. Las mallas muy densas que superan el límite para cortar mallas importadas no se unen en absoluto.

Más información: [Agrupar](chapter:solids-and-holes#agrupar)

### ¿Cómo cambio una pieza dentro de un grupo?

Selecciona el grupo y pulsa [[E]], o haz doble clic en él. Entonces las piezas quedan por separado y se pueden cambiar; al terminar, el grupo se construye de nuevo. Los redondeos y chaflanes que se habían puesto en el grupo entero se pierden al reconstruirlo.

Más información: [Editar un grupo](chapter:solids-and-holes#editar-un-grupo)

### ¿Cómo recupero una pieza de un estado anterior?

Abre la vista del historial, mueve el control deslizante al estado que todavía tenía la pieza, haz clic en ella y elige {{ui:historyView.bringBack}}. En el diseño actual aparece una copia, tal como era y donde estaba, con la hora en el nombre.

Más información: [Mirar atrás: la vista del historial](chapter:select-and-arrange#mirar-atras-la-vista-del-historial)

## Impresión y exportación

### STL, 3MF, OBJ o STEP: ¿cuál elijo?

Para la impresora, 3MF o STL. 3MF conserva cada cuerpo como una pieza con su nombre y su color; STL es una sola malla de un solo color. OBJ también lleva colores. STEP es para otros programas de CAD: contiene la geometría exacta, con redondeos y chaflanes.

Más información: [Exportar](chapter:files-and-saving#exportar)

### ¿Cómo llegan mis colores al laminador?

Exporta en 3MF. Cada cuerpo conserva su color, y un cuerpo pintado de varios colores lleva la pintura en sus caras. Al abrirlo, Bambu Studio y OrcaSlicer preguntan cómo se asignan los colores a tus filamentos.

Más información: [Pintar en varios colores](chapter:shapes#pintar-en-varios-colores)

### Mis piezas no encajan entre sí. ¿Cuánta holgura necesitan?

Normalmente de 0,2 a 0,4 mm, según la impresora. La prueba de ajuste la mide: imprime la placa pequeña con siete orificios, busca el orificio más estrecho en el que la espiga todavía gira e introduce ese valor como holgura de tu impresora. A partir de entonces, las nuevas tapas, colas de milano y roscas parten de él.

Más información: [La holgura de tu impresora: la prueba de ajuste](chapter:printing#la-holgura-de-tu-impresora-la-prueba-de-ajuste)

### ¿Por qué dice layerling que una pieza no cabe en la impresora?

La pieza sobresale del borde de la placa o es más alta de lo que puede construir la impresora que has elegido. Es solo un aviso y se puede cerrar. Elige tu impresora en los ajustes, o corta una pieza demasiado grande con {{ui:editor.tool.split}}.

Más información: [Cuando algo no cabe](chapter:printing#cuando-algo-no-cabe)

## Sobre layerling

### ¿Es gratis layerling? ¿Puedo vender lo que diseño con él?

layerling es software libre bajo la licencia AGPL-3.0, sin cuenta. La licencia se refiere al programa: quien modifique layerling y lo ofrezca a otros a través de una red tiene que ofrecer también el código fuente. No pone condiciones a los modelos que hagas. Las fuentes tipográficas y los modelos que importes conservan sus propias licencias.

Si quieres apoyar el proyecto, una [pequeña donación](support:) ayuda con los costes del servidor y del desarrollo. Es voluntaria, y nada en layerling depende de ella.

Más información: [Alojarlo tú mismo](chapter:offline-and-install#alojarlo-tu-mismo)

### ¿Cómo informo de un error o pido algo?

{{ui:editor.bugReport}}, en la barra inferior, guarda un ZIP con el diseño y un breve texto sobre la versión y el navegador; no contiene nada personal. Adjúntalo en el foro o en las discusiones de GitHub. En ambos sitios son bienvenidas las preguntas y las peticiones.

Más información: [Informar de un error](chapter:files-and-saving#informar-de-un-error) y [Ayuda y comentarios](chapter:offline-and-install#ayuda-y-comentarios)
