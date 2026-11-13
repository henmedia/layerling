---
title: Construir con una IA (MCP)
summary: Cómo un asistente de IA como Gemini, Claude o Codex crea y cambia formas, las agrupa y hace capturas de la vista en tu editor abierto.
---

layerling incluye un servidor MCP. MCP es un estándar con el que un asistente de IA puede usar herramientas de otros programas. Gracias a él, un cliente de IA como Gemini, Claude o Codex ve una pestaña abierta del editor y trabaja en ella: crea formas, cambia medidas, agrupa, corta, redondea aristas, lee la escena y hace capturas de la vista. Tú describes la pieza y la IA la construye; tú lo ves todo y puedes intervenir en cualquier momento.

El puente entre el cliente de IA y el editor funciona **en local, en tu ordenador**. Pero ten en cuenta que lo que lee la IA, es decir, la escena y las capturas de la vista, va al proveedor de tu cliente de IA, como cualquier otra cosa que le escribas.

> **Importante:** El puente MCP existe en el servidor de desarrollo que arrancas tú mismo en tu ordenador. En layerling.com y en las instalaciones con alojamiento estático está desactivado. Una copia que alojes tú, como la imagen de Docker en un NAS, puede activarlo con un token de acceso; consulta «Una copia en un NAS o un servidor», más abajo.

## Paso a paso para principiantes

No necesitas saber nada de programación para esto.

**El camino más corto:** dale a tu IA favorita la dirección del proyecto, `https://github.com/henmedia/layerling`, y pídele: «Instala layerling en mi ordenador para que pueda construir modelos 3D contigo a través de su servidor MCP». Descarga e instala todo ella sola y te avisa cuando termina. Funciona con una IA que puede trabajar en tu ordenador, como la pestaña Code de la app de Claude, Codex, Antigravity o Gemini CLI. Un chat en el navegador no puede hacerlo, porque no puede instalar nada en tu ordenador.

**O hazlo tú mismo, en Windows con la app de Claude, en cinco pasos:**

**1. Instala layerling.** Abre el menú Inicio, escribe `PowerShell` y abre Windows PowerShell. Copia esta línea, pégala en la ventana con un clic derecho y pulsa Intro:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

Instala lo que layerling necesita, descarga layerling en la carpeta `layerling` de tu carpeta de usuario (`C:\Users\<tu nombre>\layerling`) y lo abre en tu navegador. La primera vez tarda unos minutos.

![Windows PowerShell con la línea pegada. Pulsa Intro y empieza.](still:ai-quickstart-powershell)

**2. Deja layerling en marcha.** layerling funciona mientras la ventana de PowerShell siga abierta, y la IA solo puede construir mientras funciona. La próxima vez, haz doble clic en «Start layerling» en tu escritorio.

**3. Instala la app de Claude.** Instala la app de Claude para Windows e inicia sesión. La pestaña Code del siguiente paso forma parte de los planes de pago de Claude.

**4. Abre la carpeta layerling en la pestaña Code.** En la app de Claude, cambia arriba a Code y elige la carpeta `layerling` de tu carpeta de usuario como carpeta de trabajo. layerling ya trae todo lo que Claude necesita para encontrar sus herramientas. Si Claude pregunta si puede usar el servidor MCP «layerling» de esta carpeta, permíteselo.

**5. Dile a Claude qué construir.** Por ejemplo: «Usa las herramientas de layerling y constrúyeme una caja redonda de 60 mm de diámetro y 40 mm de alto, con una pared de 2,5 mm». Si no hay ningún editor abierto, Claude abre uno en tu navegador, construye allí la caja paso a paso y hace capturas para comprobar su trabajo. Tú miras y puedes cambiar cualquier cosa en cualquier momento.

**En un Mac** es igual, con estos cambios. En el paso 1, abre la aplicación Terminal (pulsa Cmd+Espacio, escribe `Terminal` y pulsa Intro), pega esta línea y pulsa Intro:

```bash
curl -fsSL https://raw.githubusercontent.com/henmedia/layerling/main/scripts/mac-quickstart.sh | sh
```

Si falta Git o Node.js, te dice qué instalar (macOS ofrece Git en una ventana, Node.js se instala con el instalador de nodejs.org); después ejecuta la misma línea otra vez. En el paso 2, el acceso directo del escritorio también se llama «Start layerling». En el paso 3, instala la aplicación Claude para Mac.

> **Consejo:** Si algo no funciona, dile a Claude lo que ves. Puede leer el error y normalmente lo arregla solo. Si no pasa nada en el editor, comprueba primero que layerling sigue en marcha (paso 2).

## Configuración

1. Descarga layerling de [GitHub](https://github.com/henmedia/layerling) y arráncalo en la carpeta del proyecto con `npm run dev`. Necesitas tener instalado Node.js. En Windows, de eso se encarga la línea de inicio rápido del README.
2. Abre una pestaña del editor, por ejemplo `http://127.0.0.1:3000/?editor=1`. También puedes dejárselo a la IA: si no hay ningún editor abierto, la primera herramienta que lo necesite abre tu navegador con un editor y espera a que se conecte. Esto funciona con un layerling en tu propio ordenador; con una copia en un NAS o un servidor, el editor lo tienes que abrir tú. Para desactivarlo, pon `LAYERLING_MCP_OPEN_EDITOR=0` en el servidor MCP.
3. Conecta tu cliente de IA al servidor MCP. El propio cliente lo arranca con `node scripts/layerling-mcp-server.mjs`.

### Claude Code

No hay que instalar nada: el proyecto trae un `.mcp.json` que registra el servidor, y la skill en `.claude/skills/layerling-mcp-skill`. Abre la carpeta de layerling en Claude Code y pídele, por ejemplo: «Usa las herramientas MCP de layerling para listar mis editores abiertos e inspeccionar la escena».

### Claude Desktop

Claude Desktop no lee los archivos del proyecto. Añade el servidor en su propia configuración. Como plantilla, usa `docs/mcp/claude-desktop-config.example.json` del proyecto y sustituye la ruta del script por la ruta absoluta en tu ordenador. Después, reinicia Claude Desktop.

### Codex

Copia la skill de `docs/skills/layerling-mcp-skill` en tu carpeta de skills de Codex, añade el servidor a tu configuración de Codex a partir de `docs/mcp/codex-config.example.toml` y reinicia Codex.

### Gemini y Antigravity

Antigravity detecta por sí solo la skill del espacio de trabajo en `.agents/skills/layerling-mcp-skill`. Para Gemini CLI, copia la skill de `docs/skills/layerling-mcp-skill` en tu carpeta global de skills (`~/.gemini/skills/`), añade el servidor a tus ajustes a partir de `docs/mcp/gemini-config.example.json` y reinicia el cliente.

Las instrucciones detalladas para cada cliente están en el [README de GitHub](https://github.com/henmedia/layerling/blob/main/README.es.md#skill-mcp-de-layerling).

## Una copia en un NAS o un servidor

Una copia que alojes tú puede dejar que un cliente de IA maneje sus editores abiertos a través de la red. Está desactivado de forma predeterminada, porque quien pueda manejar el puente puede leer y cambiar los diseños abiertos. En el servidor, pon `LAYERLING_MCP_REMOTE` a `true` y `LAYERLING_MCP_TOKEN` a un secreto de al menos 16 caracteres (en la imagen de Docker, en `environment:` del archivo compose; no hace falta reconstruirla). Abre una pestaña del editor de esa copia y déjala abierta, y dale al cliente MCP la dirección y el mismo token: `LAYERLING_URL=http://nas:3000` y `LAYERLING_MCP_TOKEN=<the token>`.

Solo un cliente con el token puede listar o manejar los editores. Las páginas del editor no lo necesitan, pero solo cuentan si usan una dirección o un nombre que únicamente pueda usar tu propia red (una dirección IP, un nombre sin punto o uno que termine en `.local` o `.lan`); un dominio real detrás de un proxy inverso va en `LAYERLING_MCP_ALLOWED_HOSTS`. Úsalo en una red de confianza, y con HTTPS fuera de ella. El README tiene los detalles.

## Lo que puede hacer la IA

La IA trabaja con las mismas funciones que tú, por el mismo camino que sigues cuando manejas el editor. Las funciones nuevas de layerling reciben enseguida su acción MCP. Las herramientas:

| Herramienta | Qué hace |
| --- | --- |
| `layerling_list_editors` | lista las pestañas abiertas del editor |
| `layerling_rename_project` | da un nombre al proyecto, como el lápiz junto al nombre del proyecto |
| `layerling_open_editor` | abre una pestaña nueva del editor en tu navegador predeterminado y espera a que se conecte (solo en tu propio ordenador) |
| `layerling_read_scene` | lee la escena, la selección, las unidades y las medidas exactas de todos los objetos |
| `layerling_list_objects` | lista todos los objetos con sus medidas, posición, giro e id |
| `layerling_select_objects` | selecciona objetos |
| `layerling_hide_others` | oculta todo salvo la selección o los objetos indicados, en un solo paso de deshacer |
| `layerling_delete_objects` | elimina objetos |
| `layerling_move_object` | mueve un objeto a otro lugar de la lista de objetos |
| `layerling_create_shape` | crea una forma: caja, cilindro, texto (también curvado), rosca, engranaje, cuerpo de boceto y todas las demás |
| `layerling_import_file` | importa un archivo igual que la ventana de importación: un OBJ o 3MF con colores, como un cuerpo por color; un 3MF con varios objetos, como un cuerpo por objeto |
| `layerling_add_font` | añade una fuente propia para textos desde un archivo TrueType, OpenType o WOFF; se queda en el navegador, y un diseño solo guarda las letras que usa |
| `layerling_list_fonts` | lista las fuentes integradas y las propias, con id y nombre |
| `layerling_import_mesh` | trae una malla de triángulos al diseño |
| `layerling_update_object` | cambia las medidas, la posición, el color, el nombre, si es sólido u orificio y todo lo demás que define la forma, incluido el canto de las letras de un texto |
| `layerling_align_objects` | alinea objetos entre sí |
| `layerling_scale_objects` | escala objetos en un porcentaje, juntos o cada uno en su sitio |
| `layerling_lay_flat` | apoya un objeto sobre la placa por una de sus caras |
| `layerling_place_on_face` | posa objetos sobre una cara de otro, aunque esté inclinada, como la tecla C |
| `layerling_perforate_face` | corta un patrón de orificios en una cara plana o alrededor de la pared de un cilindro, un tubo o un taladro; los orificios se quedan como orificios agrupados con el cuerpo |
| `layerling_sweep_sketch` | hace un barrido de una sección rectangular o redonda a lo largo de una trayectoria de puntos, como un único cuerpo exacto; una trayectoria cerrada da un anillo |
| `layerling_push_face` | empuja hacia fuera una cara plana o abre un hueco en ella, con un desfase hacia dentro desde la arista y un radio de esquina; la parte nueva es un cuerpo de boceto agrupado con el cuerpo, o un cuerpo independiente con `separate` |
| `layerling_paint` | pinta partes de un cuerpo en colores propios para imprimir en varios colores (Pintar): rellenar una cara hasta sus aristas vivas, una mancha redonda o un lazo trazado en una vista plana; borrar, quitar todo; se guarda con el cuerpo y se escribe en un 3MF como caras pintadas |
| `layerling_support_rib` | pone un nervio de soporte fino bajo la cara inferior de una pieza impresa inclinada sobre una arista, con puentes de una capa de alto (Nervio de soporte) |
| `layerling_stencil_bridges` | sujeta las partes de una placa atravesada por un texto que se caerían, con puentes agrupados con la placa, del ancho y alto indicados (Puentes de plantilla) |
| `layerling_mate_faces` | lleva una cara de un objeto contra una cara de otro, cara contra cara o a ras, o pone dos caras redondas en un mismo eje |
| `layerling_open_group` | abre un grupo para poder cambiar sus piezas una a una, también un grupo dentro de otro abierto |
| `layerling_close_group` | lo vuelve a cerrar («Listo») o cancela |
| `layerling_add_to_group` | mete objetos sueltos en un grupo sin abrirlo |
| `layerling_take_out_of_group` | saca una pieza de un grupo sin abrirlo |
| `layerling_group_objects` | agrupa objetos |
| `layerling_ungroup_objects` | desagrupa grupos |
| `layerling_boolean_cut` | corta sólidos con orificios |
| `layerling_intersect_objects` | conserva solo lo que los objetos tienen en común (Intersección) |
| `layerling_hull_objects` | envuelve los objetos en un solo cuerpo convexo, como con film retráctil (Envolvente) |
| `layerling_cookie_cutter` | crea un cortador de galletas a partir de los objetos: una pared con filo y un reborde alrededor del contorno reflejado (Cortador de galletas) |
| `layerling_flexi_joints` | corta un cuerpo plano en eslabones con articulaciones impresas ya montadas que giran hacia los lados (Articulaciones flexi) |
| `layerling_make_lid` | crea una tapa para un cuerpo abierto por arriba: encajada dentro, por encima o plana, con el ajuste que elijas y, si quieres, con imanes (Tapa) |
| `layerling_make_cable_channel` | abre un canal redondo para un cable a través de un cuerpo, de una entrada a una salida, y encuentra solo el camino con curvas suaves (Canal para cable) |
| `layerling_loft_sketches` | une dos cuerpos de boceto en una transición de un contorno al otro (Transición entre bocetos) |
| `layerling_separate_parts` | separa una forma en sus piezas sueltas, y un cuerpo de boceto en un cuerpo por contorno |
| `layerling_split_objects` | corta sólidos u orificios en dos con un plano |
| `layerling_list_edges` | lista las aristas CAD reales de un objeto |
| `layerling_apply_edge_treatment` | achaflana o redondea las aristas elegidas |
| `layerling_hollow_object` | vacía un cuerpo con una pared uniforme |
| `layerling_cut_out` | recorta un sólido de otro para que encajen: la pieza se queda, una copia ampliada con la holgura se resta del otro cuerpo |
| `layerling_punch` | troquela el contorno de un sólido, visto a lo largo de x, y o z, en línea recta a través de otro; el troquel se queda y no tiene que tocarlo |
| `layerling_offset_object` | desfasa todas las caras de un cuerpo para la holgura de un ajuste: lo agranda o reduce, o añade la copia agrandada como orificio, o mueve solo los lados |
| `layerling_list_faces` | lista las caras de un cuerpo exacto |
| `layerling_delete_faces` | elimina caras y cierra el hueco |
| `layerling_array_objects` | multiplica en una fila, una cuadrícula o un círculo |
| `layerling_bundle_objects` | crea un conjunto con objetos, como Ctrl+B: se mueven juntos, conservan su color y su tipo, y en una exportación salen por separado |
| `layerling_layer_text` | convierte un texto en una pila de capas para una impresión multicolor (letras, contornos más anchos, una placa sin orificios) o vuelve a construir una pila, con orificio para llavero, las esquinas de cada capa y un canto de letra redondeado o achaflanado; con una lista de nombres, hace una placa por nombre |
| `layerling_text_block` | crea un bloque de texto: un texto pasa a ser la primera de varias líneas, cada una un texto propio debajo de la anterior, alineadas a la izquierda, al centro o a la derecha, cada línea del mismo tamaño o más pequeña |
| `layerling_layer_icon` | convierte un icono SVG (el texto del archivo o un cuerpo de boceto extruido) en una placa con icono por capas para una impresión multicolor (el icono, contornos más anchos, una placa sin orificios) o vuelve a construir una con otra anchura u otras capas; con un número, llena la placa de copias |
| `layerling_create_qr_code` | crea un código QR a partir de un texto o una dirección web, como {{ui:shape.qrCode}} en la biblioteca de formas: el código solo, en relieve sobre una placa o grabado, con corrección de errores, anchura, altura, zona de silencio y, si se pide, como orificio; avisa cuando un módulo baja de 0,8 mm |
| `layerling_create_sbc_board` | coloca una placa SBC a tamaño real, como {{ui:shape.sbcBoard}} en la biblioteca de formas: Raspberry Pi 5, 4, 3 B+, Zero 2 W o BIGTREETECH Pi, con orificios y conectores, la holgura alrededor de los conectores del borde, la posición y como orificio para recortar una caja |
| `layerling_reference_image` | añade una imagen de referencia a partir de una imagen, como hace {{ui:import.referenceImage}}, o mueve, gira, calibra (dos puntos de la imagen y su distancia real), difumina o bloquea una: una guía que nunca se exporta ni se imprime; `trace` convierte su parte oscura o clara en un cuerpo de boceto apoyado sobre ella |
| `layerling_measure_section` | mide en un plano de corte entre dos puntos que se ajustan al contorno: grosores de pared, holguras, ajustes |
| `layerling_show_overhangs` | activa o desactiva el rayado de voladizos, fija el ángulo e indica para cada cuerpo la superficie que necesitaría soportes |
| `layerling_estimate_print` | calcula el volumen, el peso y el filamento de la selección o del diseño entero: para un cuerpo macizo y, como estimación aproximada, con paredes y relleno, igual que la ventana de exportación |
| `layerling_check_clearance` | comprueba antes de imprimir qué piezas se solapan, se tocan o quedan más cerca que una holgura mínima, también las piezas separadas de un mismo objeto |
| `layerling_printer_play` | lee, fija o borra la holgura de la impresora ({{ui:workspace.printerPlay}} en los ajustes) y coloca la prueba de ajuste que la mide |
| `layerling_check_print` | comprueba antes de imprimir qué saldría mal: paredes demasiado finas para la boquilla, piezas flotantes, poco contacto con la placa, voladizos y mallas abiertas |
| `layerling_add_reference_points` | marca puntos de referencia (en el centro, las esquinas o los puntos medios de las aristas de los objetos, o en posiciones exactas) a los que se ajustan las formas |
| `layerling_list_reference_points` | lista los puntos de referencia con sus id y posiciones |
| `layerling_remove_reference_points` | elimina puntos de referencia por id, o todos |
| `layerling_list_notes` | lee las notas del usuario con su texto, el cuerpo al que está fijada cada una y si es un encargo para la IA |
| `layerling_wait_for_notes` | espera hasta que marques {{ui:note.forAi}} en una nota y entrega la petición al momento |
| `layerling_add_note` | pone una nota en el modelo, fijada a un objeto o libre en la placa |
| `layerling_update_note` | cambia una nota o la responde; una respuesta cierra el encargo |
| `layerling_remove_notes` | borra notas por id |
| `layerling_inspect_errors` | muestra el último mensaje y el último error, además de los mensajes y errores de la sesión |
| `layerling_wrap_around_cylinder` | envuelve un cuerpo plano, como un SVG o un texto, alrededor de un cilindro, hacia fuera o hacia dentro como grabado |
| `layerling_texture_surface` | aplica una textura de superficie a un cuerpo: estrías, moleteado, panal o bultos, para un mejor agarre o por estética, y la cambia o la quita después |
| `layerling_simplify_mesh` | reduce el número de triángulos de una malla importada, a un porcentaje o a un número de triángulos |
| `layerling_make_exact` | convierte una malla importada en un cuerpo CAD exacto: planos, cilindros, conos, esferas y toros pasan a ser caras reales, para redondear aristas limpiamente y que STEP las lleve |
| `layerling_save_custom_shape` | guarda cuerpos como forma personalizada, en el servidor o en el navegador, para insertarlos en otros diseños |
| `layerling_list_custom_shapes` | lista las formas personalizadas del servidor y del navegador |
| `layerling_insert_custom_shape` | inserta una forma personalizada en el diseño abierto, en un punto x/z si quieres |
| `layerling_delete_custom_shape` | elimina una forma personalizada; los cuerpos ya insertados se quedan |
| `layerling_show_workplane` | oculta y muestra la placa con su cuadrícula, por ejemplo para una captura de la parte de abajo (solo la vista) |
| `layerling_focus_mode` | activa y desactiva el modo concentración: oculta la fila del título y el pie de página para tener más espacio (solo el marco del editor) |
| `layerling_set_section_view` | abre la vista en corte por un plano para mirar dentro (solo la vista: no se corta nada) |
| `layerling_measurements` | muestra u oculta las mediciones de la cinta métrica y las lista con sus longitudes, y oculta o muestra las medidas alrededor de la selección como [[Q]], y escribe una longitud para una de ellas, que mueve el cuerpo de su extremo como un clic en su número |
| `layerling_measure_angle` | mide un ángulo como el transportador: en el vértice de tres puntos o entre dos caras planas, y lo muestra en la vista |
| `layerling_saved_view` | guarda la vista actual en la tecla 7, 8, 9 o 0 y vuelve a ella, como Mayús+tecla y la tecla (solo la vista); también fija la vista de arranque de los diseños nuevos |
| `layerling_build_plates` | lista, añade, nombra, ordena y quita las placas de impresión, mueve objetos a una placa y los reparte en las placas, como la barra de placas |
| `layerling_clear_history` | elimina para siempre todos los pasos de deshacer, como el botón «Eliminar historial» de la vista del historial; necesita `confirm: true` |
| `layerling_list_backups` | lista las copias automáticas (Versiones anteriores) del diseño abierto, o con `all: true` de todos los diseños de este navegador |
| `layerling_open_backup` | abre una copia por su `id` como diseño nuevo, nunca ligado al archivo original |
| `layerling_set_history_view` | consulta un estado anterior del proyecto, como la vista del historial (el diseño real no se toca; las herramientas que cambian algo esperan a que se cierre) |
| `layerling_restore_from_history` | trae al diseño, como copias, objetos de un estado anterior (también piezas dentro de grupos), igual que «Traer al diseño» en la vista del historial; es un solo paso, que deshacer revierte |
| `layerling_export_section_svg` | devuelve los contornos en un plano de corte como SVG a escala 1:1, a partir de los mismos cuerpos que la exportación |
| `layerling_sketch_from_section` | crea un boceto con los contornos de un plano de corte, sobre el propio corte: abierto en el editor para cambiarlo, o construido enseguida como un cuerpo de la altura indicada |
| `layerling_export_drawing` | hace el plano para el taller de la exportación «2D»: tres vistas a escala 1:1 en una hoja ISO, con las medidas totales y una tabla de los taladros redondos, como texto SVG o como PDF |
| `layerling_export_mesh` | escribe el archivo de la ventana de exportación en STL, 3MF, OBJ, SVG (vista superior, huella o aristas visibles) o DXF para corte láser, a partir de los mismos cuerpos; en una ruta de este ordenador o en base64 |
| `layerling_save_project` | guarda el diseño editable completo como archivo .lyl en una ruta del ordenador donde funciona el servidor MCP, sin cuadro de diálogo; un archivo existente solo se sustituye con `overwrite`, se escribe a través de un archivo temporal y el destino de Ctrl+S en el editor no cambia |
| `layerling_list_attachments` | lista los archivos adjuntos al diseño (nombre, tipo, tamaño), como los muestra el panel Adjuntos |
| `layerling_get_attachment` | lee un archivo adjunto, sus bytes en base64, como Descargar en el panel |
| `layerling_add_attachment` | adjunta un archivo dado en base64, con las comprobaciones del panel; un nombre ya adjunto solo se sobrescribe con `replace` |
| `layerling_rename_attachment` | cambia el nombre de un archivo adjunto; su contenido se mantiene |
| `layerling_remove_attachment` | quita un archivo adjunto para siempre; necesita `confirm: true` |
| `layerling_set_workplane` | coloca el plano de trabajo en un lateral de un cuerpo o lo devuelve a la placa base, y lo oculta o lo muestra |
| `layerling_capture_image` | hace una captura de la vista: de frente, desde arriba, de lado, en diagonal desde una esquina y más |

Así la IA puede comprobar su propio trabajo: crea algo, hace una captura, la mira y lo mejora.

## Un ejemplo

Le dices: «Hazme una caja redonda de 60 mm de diámetro y 40 mm de altura con una pared de 2,5 mm, abierta por arriba, y una tapa plana con “Té” escrito en arco». La IA crea los cilindros, vacía uno, pone el texto curvado sobre la tapa y, al final, hace capturas para ver si todo encaja.

> **Consejo:** Dale a la IA medidas concretas y dile para qué es la pieza («soporte para una varilla de 12 mm, que quepa en una Bambu Lab A1»). Así toma decisiones más sensatas. Y mírala mientras construye: puedes intervenir tú en cualquier momento, porque es el mismo editor.
