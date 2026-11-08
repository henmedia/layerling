---
title: Atajos de teclado
summary: Todas las teclas de un vistazo, sacadas directamente del programa para que la lista esté siempre al día.
---

Los atajos funcionan mientras la zona de trabajo tiene el foco. Cuando escribes en un campo, no interfieren. En el Mac, [[Cmd]] sirve en todos los sitios donde aquí pone [[Ctrl]].

En el editor, {{ui:editor.keyboardShortcuts}}, en el grupo {{ui:editor.group.help}}, abre esta misma lista en una ventana. El botón de la impresora de la ventana ({{ui:shortcuts.print}}) imprime solo la lista, en negro sobre blanco y entera en una cara de una hoja A4 o carta, a tres columnas, para tenerla a mano como referencia rápida; el cuadro de diálogo de impresión del navegador también te ofrece guardarla como PDF.

El cuadro de la parte superior de la ventana busca en la lista: deja solo los atajos cuya frase, grupo o teclas contienen todas las palabras que escribes, así que «redondeo» o «ctrl+z» dejan solo esas filas. Las mayúsculas y los acentos no importan, y una sola letra o cifra encuentra esa tecla y las palabras que empiezan por ella. La X del final del cuadro lo vacía; con el cuadro vacío vuelve la lista entera. El botón de la impresora imprime lo que muestra la ventana, así que después de una búsqueda imprime solo los atajos encontrados.

![La ventana de los atajos de teclado en el editor.](shot:shortcuts)

## Búsqueda de comandos

¿No encuentras una herramienta? Pulsa [[Ctrl]]+[[K]] o haz clic en la lupa del grupo {{ui:editor.group.help}} y escribe lo que buscas: una herramienta («redondeo», «reflejar»), una forma («cilindro») o un comando («exportar», «deshacer»). Muévete con las flechas y pulsa [[Intro]], o haz clic en la entrada.

- La búsqueda entiende igual la palabra en castellano que en inglés o en alemán, y no distingue mayúsculas, tildes ni diéresis: «aushoehlen» encuentra {{ui:editor.tool.hollow}}.
- Cada entrada muestra las teclas que hacen lo mismo y el grupo de la cinta en el que está, para que aprendas dónde se encuentra.
- Las entradas en gris no se pueden ejecutar en ese momento, casi siempre porque no hay nada seleccionado. Siguen en la lista para que la búsqueda te diga igualmente dónde está la herramienta.

La guía que estás leyendo también tiene un cuadro de búsqueda, arriba en cada página: escribe una o dos palabras y te mostrará las secciones que las contienen todas, con las coincidencias resaltadas. Haz clic en una, o pulsa [[Intro]] para ir a la primera, y llegarás directamente. La página que se abre marca cada lugar donde aparecen tus palabras y se desplaza al primero de esa sección; [[Esc]] o un clic en una marca las quita.
- El nombre de una forma añade esa forma a la zona de trabajo, igual que si hicieras clic en ella en el menú de formas.
- Con el campo vacío, la búsqueda muestra arriba los últimos comandos que has usado.
- El nombre de un cuerpo de tu diseño encuentra ese cuerpo y lo selecciona, algo muy útil en un diseño con muchas piezas. Los cuerpos solo aparecen cuando empiezas a escribir.
- Una forma personalizada que guardaste también se encuentra por su nombre en cuanto escribes, y un clic la inserta en el diseño como en el panel de formas.
- También funciona en el modo de boceto, con las herramientas de boceto.

## Tus propias teclas

Cualquier comando de la búsqueda de comandos puede ir en una tecla tuya: una herramienta que usas todo el rato, una forma, {{ui:editor.tool.centerOnWorkplane}} o {{ui:palette.openShapes}}.

1. Abre {{ui:editor.keyboardShortcuts}} y haz clic en {{ui:customKeys.add}} bajo {{ui:customKeys.title}}, arriba en la ventana.
2. Escribe unas letras del comando y haz clic en él, o pulsa [[Intro]] para el primero.
3. Pulsa la tecla que quieras, sola o con [[Ctrl]], [[Alt]] o [[Mayús]]. Las letras, los números y F1 a F12 pueden llevar un comando.

Una tecla que el editor ya usa, una que el navegador guarda para sí (como [[Ctrl]]+[[W]]) o una de tus propias teclas se rechaza, y la ventana dice para qué sirve. Haz clic en una tecla de la lista para cambiarla, en la X de al lado para quitarla, o en {{ui:customKeys.removeAll}} para empezar de nuevo.

- La tecla ejecuta el comando igual que la búsqueda de comandos. Si ahora no puede ejecutarse, casi siempre porque no hay nada seleccionado, la barra de estado lo dice.
- Tus teclas aparecen junto a sus comandos en la búsqueda de comandos y en la lista impresa.
- Se quedan en este navegador, como el tema. Una tecla para una herramienta de boceto funciona en el modo Boceto, una para el editor 3D fuera de él.
- Mientras escribes en un campo, tus teclas no estorban, como todas las demás.

## Ayuda interactiva

¿No encuentras dónde se explica un botón o un campo? Deja que el programa te lleve. Haz clic en el signo de interrogación del grupo {{ui:editor.group.help}} o pulsa [[Mayús]]+[[F1]]. El puntero se convierte en un signo de interrogación, y lo que tenga debajo se marca con un contorno.

- Haz clic en un botón, un campo, un interruptor, un tirador, un grupo de la cinta o la barra de título de una ventana. **No** hará lo que hace normalmente. En su lugar se abre una ventanita con el nombre del elemento, un breve resumen de la parte de esta guía que trata de él, hasta otros dos sitios donde se menciona y {{ui:interactiveHelp.open}}.
- La ayuda trata del elemento que has señalado, no de toda la ventana que lo rodea. Un elemento sin nombre propio toma el del elemento más cercano que lo contiene; dentro de una ventana, recurre al signo de interrogación de esa ventana.
- {{ui:interactiveHelp.open}} abre la guía por esa sección en una pestaña nueva. Allí la sección aparece enmarcada en color, desde su título hasta su final, para que veas dónde empieza y dónde termina.
- Si la guía no dice nada del elemento, la ventana te lo indica y te ofrece {{ui:interactiveHelp.search}}.
- [[Esc]], o volver a hacer clic en el signo de interrogación, sale de este modo. En una pantalla táctil no se puede pasar el ratón por encima: al tocar un elemento, la ventana se abre directamente.

La ventana se mueve desde su barra de título, como las demás. El programa encuentra la sección por el nombre del elemento (el texto de un botón, el nombre de un campo), porque esta guía escribe cada botón tal como se llama en el programa. Lo busca con el mismo buscador que el cuadro de la parte superior de cada página de la guía, en el idioma que estés usando, y todo funciona dentro de tu navegador.

{{shortcuts}}
