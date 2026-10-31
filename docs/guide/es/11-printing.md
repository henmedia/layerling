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

Los perfiles de impresora vienen de OrcaSlicer, así que son los mismos que conoce tu laminador (*slicer*). Si prefieres trabajar sin impresora, elige {{ui:workspace.printerNone}}. También puedes fijar a mano el tamaño del plano de trabajo.

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

## Grosor de pared, holgura y chaflanes

- Las paredes deberían tener como mínimo dos líneas de extrusión de ancho, es decir, 0,8 mm con una boquilla de 0,4 mm. Las piezas resistentes necesitan de 1,2 a 2 mm.
- Donde dos piezas encajan una en otra, necesitas holgura: normalmente de 0,2 a 0,4 mm, según la impresora. Haz una pequeña pareja de prueba antes de imprimir la pieza grande.
- Mucha gente achaflana ligeramente la arista inferior que se apoya en la cama. Así se evita que la primera capa se ensanche («pata de elefante»).

## Cuando lo tengas listo

Elige {{ui:editor.export}} y luego **STL** o **3MF**. STL es el formato más sencillo. 3MF conserva los nombres y los colores de cada cuerpo, así que es práctico cuando imprimes en varios colores. La ventana de exportación también muestra cuántos gramos y metros de filamento necesitaría la pieza impresa maciza. Más en [Archivos y guardado](chapter:files-and-saving).
