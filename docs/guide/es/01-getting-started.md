---
title: Primeros pasos
summary: De la hoja en blanco a tu primera pieza para la impresora 3D en cinco minutos, sin crear ninguna cuenta y sin instalar nada.
---

layerling es un programa de diseño para impresión 3D que funciona directamente en el navegador. Construyes una pieza con formas sencillas, le haces orificios, redondeas sus aristas y la envías a tu laminador (*slicer*). No hay que instalar nada ni registrarse. Lo que construyes se queda en tu ordenador.

![La página de inicio de layerling: arriba, «Crear nuevo diseño 3D»; debajo, tus diseños y la guía rápida.](shot:start-page)

## Crear un diseño

Abre [layerling.com](https://layerling.com/). En la página de inicio, haz clic en {{ui:dashboard.createDesign}}. Se abre el editor con un plano de trabajo vacío: la cuadrícula sobre la que va tomando forma todo.

Si ya tienes un archivo con el que quieres seguir trabajando, usa {{ui:dashboard.importGeometry}}. Sirve tanto para diseños de layerling (`.lyl`) como para archivos STL, OBJ, 3MF, STEP o SVG.

Todos tus diseños aparecen después en la página de inicio, con una imagen de vista previa. Se guardan en el almacenamiento de tu navegador, automáticamente después de cada cambio, así que no hay botón de guardar. **layerling no se hace responsable de los diseños guardados en el navegador.** Un navegador puede fallar, o una actualización suya puede dar problemas, así que de vez en cuando haz una copia de seguridad de tus diseños con {{ui:dashboard.backupAll}}, en la página de inicio, o guárdalos como archivos. Una copia de seguridad se recupera con {{ui:dashboard.restoreBackup}}. Cómo meter diseños en un archivo y pasárselos a otras personas lo explica [Archivos y guardado](chapter:files-and-saving). Si quieres un aviso, activa {{ui:workspace.confirmTabClose}} en los ajustes (la rueda dentada de la cinta): el navegador preguntará antes de cerrar o recargar una pestaña con un diseño abierto.

## El editor de un vistazo

![El editor con dos formas sobre el plano de trabajo. Arriba, la cinta; a la izquierda, los controles de cámara; a la derecha, los ajustes de la forma seleccionada.](shot:editor-overview)

- **Arriba** está la cinta, ordenada por tareas: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} y {{ui:editor.group.help}}. Pasa el ratón por encima de un icono para ver su nombre. Allí donde veas un pequeño signo de interrogación, por ejemplo en los ajustes de una forma, en la biblioteca de formas o en los paneles de herramientas, te lleva directamente al capítulo de esta guía que trata ese tema.
- **En el centro** está el plano de trabajo. Ahí colocas las formas, las ajustas a tu gusto y ves el resultado.
- **A la derecha** aparecen los ajustes de la forma seleccionada: color, medidas, posición y todo lo demás que define la forma. Escribir números es más exacto que arrastrar.
- **A la izquierda** están los controles de cámara, con el cubo de vista encima. Con ellos te mueves por la escena; tienes más detalles en [Vista y plano de trabajo](chapter:view-and-workplane).
- **Arriba del todo** cambias entre {{ui:editor.modeGeometry}} y {{ui:editor.modeSketch}}, cambias el nombre del diseño y eliges el idioma y el tema.

## Los botones alrededor de la zona de trabajo

Pasa el ratón por encima de un botón para ver su nombre. Si no tienes claro qué hace un botón, haz clic en {{ui:interactiveHelp.title}}, en el grupo {{ui:editor.group.help}} ([[Mayús]]+[[F1]]), y después en el botón. Estos son los que más se preguntan.

### Pegar

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) añade al diseño lo que hayas copiado con {{ui:editor.tool.copy}}. {{ui:common.duplicate}} copia y pega en un solo paso.

### Eliminar

{{ui:common.delete}} ([[Supr]]) quita las formas seleccionadas. {{ui:editor.tool.undo}} las recupera.

### Desagrupar

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Mayús]]+[[G]]) vuelve a separar el grupo seleccionado en las formas con las que se hizo.

### Ajustes del espacio de trabajo

{{ui:editor.workspaceSettings}} abre los ajustes de la zona de trabajo: unidad, tamaño de la placa, impresora, cuadrícula, colores, luz y más. Tienes más detalles en [Vista y plano de trabajo](chapter:view-and-workplane).

### Tema

{{ui:common.theme}}, arriba del todo, elige el aspecto de layerling: como el de tu sistema, claro, oscuro o grafito.

### Cambiar nombre del diseño

{{ui:editor.renameProject}}: el lápiz que hay junto al nombre, arriba del todo. Escribe el nombre nuevo y pulsa [[Intro]].

### Nombre del diseño

El nombre del diseño ({{ui:confirm.projectName}}) está arriba del todo. Haz clic en él, escribe y pulsa [[Intro]] para conservar el nombre.

### Opciones de visibilidad

{{ui:editor.visibilityOptions}}, la flecha que hay junto al icono del ojo, reúne lo que puedes mostrar u ocultar: la lista de objetos, todo lo que hayas ocultado, las notas y los voladizos de la impresión. Tienes más detalles en [Seleccionar y organizar](chapter:select-and-arrange).

### Ocultar selección

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) oculta las formas seleccionadas. Siguen en el diseño y en la lista de objetos; {{ui:editor.visibilityOptions}} las vuelve a mostrar.

### Buscar comandos

{{ui:palette.open}}: escribe lo que buscas, ya sea una herramienta, una forma o un ajuste, y haz clic en el resultado.

### Ocultar los controles de cámara

{{ui:camera.hide}} recoge los controles de cámara de la izquierda y deja más sitio a la zona de trabajo; {{ui:camera.show}} los vuelve a mostrar.

### Cuadrícula de ajuste

{{ui:inspector.snapGrid}}, al final de las propiedades, es el paso al que se ajustan los movimientos y los cambios de tamaño. A su lado, el pequeño interruptor **mm | in** cambia la unidad. Tienes más detalles en [Vista y plano de trabajo](chapter:view-and-workplane).

### Unidad: milímetros o pulgadas

El interruptor **mm | in**, junto a {{ui:inspector.snapGrid}}, cambia en este diseño la unidad, la cuadrícula de la placa y el paso de ajuste.

### El pie de página

En la parte de abajo de la ventana: {{ui:dashboard.sponsor}} lleva a la página donde puedes apoyar el proyecto; {{ui:dashboard.userGuide}} abre esta guía; {{ui:dashboard.forum}} lleva al sitio para preguntas, ideas e informes de errores (las discusiones de GitHub; en alemán, el foro de drucktipps3d); {{ui:editor.bugReport}} genera un ZIP para un informe de error; {{ui:dashboard.projectOnGitHub}} lleva al proyecto en GitHub, y el número de versión abre las notas de la versión. Los enlaces al aviso legal y a la política de privacidad son responsabilidad de quien gestiona la copia de layerling que usas.

## Tu primera pieza

Como ejemplo, vamos a construir un cubo con un orificio.

1. Haz clic en {{ui:editor.addShape}}, en la cinta, y elige {{ui:shape.box}}. La forma se queda pegada al puntero del ratón. Un clic en el plano de trabajo la deja en su sitio.
2. A la derecha, fija las medidas, por ejemplo 40 mm de largo, 40 mm de ancho y 20 mm de alto.
3. Coloca del mismo modo un {{ui:shape.cylinder}} en el centro, de 14 mm de diámetro y 30 mm de alto. Tiene que ser más alto que el cubo para atravesarlo de arriba abajo.
4. Selecciona el cilindro y haz clic en {{ui:inspector.hole}}, a la derecha. Se vuelve transparente: el sólido se ha convertido en una herramienta que quita material.
5. Selecciona las dos formas y haz clic en {{ui:editor.tool.group}}. El cubo ya tiene un orificio.

![El cilindro es un orificio y sobresale por encima del cubo.](shot:hole-before)

![Después de agrupar, el cubo tiene un orificio que lo atraviesa.](shot:hole-after)

Así se hacen orificios, ranuras y huecos. El capítulo [Sólidos y orificios](chapter:solids-and-holes) lo explica con detalle.

## Novedades desde tu última visita

Cuando vuelves a abrir layerling después de una actualización, una tarjeta en la página de inicio muestra lo que se ha añadido desde tu última visita: cada versión publicada desde entonces, empezando por la más reciente. Si llevabas mucho tiempo sin entrar, desplázate hacia abajo dentro de la tarjeta. Debajo, {{ui:whatsNew.earlier}} añade también las versiones anteriores a tu última visita. Ciérrala con {{ui:whatsNew.dismiss}} y no volverá a aparecer hasta la próxima actualización. {{ui:whatsNew.footerLink}}, en el pie de la página de inicio, vuelve a mostrar las últimas novedades cuando quieras. El navegador recuerda la última versión que viste, y nada sobre ti sale de él.

En una copia de layerling instalada en tu propio ordenador o servidor, el aviso «Actualización disponible» tiene un botón, {{ui:update.previewShow}}, que muestra lo que trae la actualización antes de instalarla. La lista se descarga de GitHub solo cuando pulsas el botón.

## Del diseño a la impresión

Cuando tu pieza esté lista, haz clic en {{ui:editor.export}}, elige STL o 3MF y descarga el archivo. Ábrelo en tu laminador, por ejemplo Bambu Studio, PrusaSlicer, OrcaSlicer o Cura. Si eliges tu impresora en los ajustes, ves mientras construyes si la pieza cabe en la cama. Tienes más detalles en [Impresión](chapter:printing).

> **Consejo:** Si vienes de Tinkercad, te orientarás enseguida: la placa, las formas, sólidos y orificios, agrupar, alinear y reflejar funcionan casi igual. Lo nuevo es sobre todo el chaflán y el redondeo, el vaciado, las roscas y los bocetos. También puedes traer tus propios diseños de Tinkercad, consulta [Archivos: guardar y compartir](chapter:files-and-saving).
