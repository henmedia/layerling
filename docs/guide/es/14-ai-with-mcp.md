---
title: Construir con una IA (MCP)
summary: Cómo un asistente de IA como Gemini, Claude o Codex crea y cambia formas, las agrupa y hace capturas de la vista en tu editor abierto.
---

layerling incluye un servidor MCP. MCP es un estándar con el que un asistente de IA puede usar herramientas de otros programas. Gracias a él, un cliente de IA como Gemini, Claude o Codex ve una pestaña abierta del editor y trabaja en ella: crea formas, cambia medidas, agrupa, corta, redondea aristas, lee la escena y hace capturas de la vista. Tú describes la pieza y la IA la construye; tú lo ves todo y puedes intervenir en cualquier momento.

El puente entre el cliente de IA y el editor funciona **en local, en tu ordenador**. Pero ten en cuenta que lo que lee la IA, es decir, la escena y las capturas de la vista, va al proveedor de tu cliente de IA, como cualquier otra cosa que le escribas.

> **Importante:** El puente MCP existe en el servidor de desarrollo que arrancas tú mismo en tu ordenador. En layerling.com y en las instalaciones con alojamiento estático está desactivado. Una copia que alojes tú, como la imagen de Docker en un NAS, puede activarlo con un token de acceso; consulta «Una copia en un NAS o un servidor», más abajo.

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

Las instrucciones detalladas para cada cliente están en el [README de GitHub](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## Una copia en un NAS o un servidor

Una copia que alojes tú puede dejar que un cliente de IA maneje sus editores abiertos a través de la red. Está desactivado de forma predeterminada, porque quien pueda manejar el puente puede leer y cambiar los diseños abiertos. En el servidor, pon `LAYERLING_MCP_REMOTE` a `true` y `LAYERLING_MCP_TOKEN` a un secreto de al menos 16 caracteres (en la imagen de Docker, en `environment:` del archivo compose; no hace falta reconstruirla). Abre una pestaña del editor de esa copia y déjala abierta, y dale al cliente MCP la dirección y el mismo token: `LAYERLING_URL=http://nas:3000` y `LAYERLING_MCP_TOKEN=<the token>`.

Solo un cliente con el token puede listar o manejar los editores. Las páginas del editor no lo necesitan, pero solo cuentan si usan una dirección o un nombre que únicamente pueda usar tu propia red (una dirección IP, un nombre sin punto o uno que termine en `.local` o `.lan`); un dominio real detrás de un proxy inverso va en `LAYERLING_MCP_ALLOWED_HOSTS`. Úsalo en una red de confianza, y con HTTPS fuera de ella. El README tiene los detalles.

## Lo que puede hacer la IA

La IA trabaja con las mismas funciones que tú, por el mismo camino que sigues cuando manejas el editor. Las funciones nuevas de layerling reciben enseguida su acción MCP. Las herramientas:

| Herramienta | Qué hace |
| --- | --- |
| `layerling_list_editors` | lista las pestañas abiertas del editor |
| `layerling_open_editor` | abre una pestaña nueva del editor en tu navegador predeterminado y espera a que se conecte (solo en tu propio ordenador) |
| `layerling_read_scene` | lee la escena, la selección, las unidades y las medidas exactas de todos los objetos |
| `layerling_list_objects` | lista todos los objetos con sus medidas, posición, giro e id |
| `layerling_select_objects` | selecciona objetos |
| `layerling_delete_objects` | elimina objetos |
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
| `layerling_perforate_face` | corta un patrón de orificios en una cara plana; los orificios se quedan como orificios agrupados con el cuerpo |
| `layerling_sweep_sketch` | hace un barrido de una sección rectangular o redonda a lo largo de una trayectoria de puntos, como un único cuerpo exacto; una trayectoria cerrada da un anillo |
| `layerling_push_face` | empuja hacia fuera una cara plana o abre un hueco en ella, con un desfase hacia dentro desde la arista y un radio de esquina; la parte nueva es un cuerpo de boceto agrupado con el cuerpo |
| `layerling_mate_faces` | lleva una cara de un objeto contra una cara de otro, cara contra cara o a ras |
| `layerling_open_group` | abre un grupo para poder cambiar sus piezas una a una, también un grupo dentro de otro abierto |
| `layerling_close_group` | lo vuelve a cerrar («Listo») o cancela |
| `layerling_group_objects` | agrupa objetos |
| `layerling_ungroup_objects` | desagrupa grupos |
| `layerling_boolean_cut` | corta sólidos con orificios |
| `layerling_intersect_objects` | conserva solo lo que los objetos tienen en común (Intersección) |
| `layerling_hull_objects` | envuelve los objetos en un solo cuerpo convexo, como con film retráctil (Envolvente) |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | separa una forma en sus piezas sueltas, y un cuerpo de boceto en un cuerpo por contorno |
| `layerling_split_objects` | corta sólidos u orificios en dos con un plano |
| `layerling_list_edges` | lista las aristas CAD reales de un objeto |
| `layerling_apply_edge_treatment` | achaflana o redondea las aristas elegidas |
| `layerling_hollow_object` | vacía un cuerpo con una pared uniforme |
| `layerling_cut_out` | recorta un sólido de otro para que encajen: la pieza se queda, una copia ampliada con el margen se resta del otro cuerpo |
| `layerling_offset_object` | desfasa todas las caras de un cuerpo para la holgura de un ajuste: lo agranda o reduce, o añade la copia agrandada como hueco |
| `layerling_list_faces` | lista las caras de un cuerpo exacto |
| `layerling_delete_faces` | elimina caras y cierra el hueco |
| `layerling_array_objects` | multiplica en una fila o en un círculo |
| `layerling_bundle_objects` | crea un conjunto con objetos, como Ctrl+B: se mueven juntos, conservan su color y su tipo, y en una exportación salen por separado |
| `layerling_layer_text` | convierte un texto en una pila de capas para una impresión multicolor (letras, contornos más anchos, una placa sin orificios) o vuelve a construir una pila, con orificio para llavero, las esquinas de cada capa y un canto de letra redondeado o achaflanado; con una lista de nombres, hace una placa por nombre |
| `layerling_layer_icon` | convierte un icono SVG (el texto del archivo o un cuerpo de boceto extruido) en una placa con icono por capas para una impresión multicolor (el icono, contornos más anchos, una placa sin orificios) o vuelve a construir una con otra anchura u otras capas; con un número, llena la placa de copias |
| `layerling_create_qr_code` | crea un código QR a partir de un texto o una dirección web, como {{ui:shape.qrCode}} en la biblioteca de formas: el código solo, en relieve sobre una placa o grabado, con corrección de errores, anchura, altura, zona de silencio y, si se pide, como orificio; avisa cuando un módulo baja de 0,8 mm |
| `layerling_reference_image` | añade una imagen de referencia a partir de una imagen, como hace {{ui:import.referenceImage}}, o mueve, gira, calibra (dos puntos de la imagen y su distancia real), difumina o bloquea una: una guía que nunca se exporta ni se imprime |
| `layerling_measure_section` | mide en un plano de corte entre dos puntos que se ajustan al contorno: grosores de pared, holguras, ajustes |
| `layerling_show_overhangs` | activa o desactiva el rayado de voladizos, fija el ángulo e indica para cada cuerpo la superficie que necesitaría soportes |
| `layerling_estimate_print` | calcula el volumen, el peso y el filamento de la selección o del diseño entero: para un cuerpo macizo y, como estimación aproximada, con paredes y relleno, igual que la ventana de exportación |
| `layerling_add_reference_points` | marca puntos de referencia (en el centro, las esquinas o los puntos medios de las aristas de los objetos, o en posiciones exactas) a los que se ajustan las formas |
| `layerling_list_reference_points` | lista los puntos de referencia con sus id y posiciones |
| `layerling_remove_reference_points` | elimina puntos de referencia por id, o todos |
| `layerling_inspect_errors` | muestra el último mensaje y el último error, además de los mensajes y errores de la sesión |
| `layerling_wrap_around_cylinder` | envuelve un cuerpo plano, como un SVG o un texto, alrededor de un cilindro, hacia fuera o hacia dentro como grabado |
| `layerling_texture_surface` | aplica una textura de superficie a un cuerpo: estrías, moleteado, panal o relieves, para un mejor agarre o por estética, y la cambia o la quita después |
| `layerling_simplify_mesh` | reduce el número de triángulos de una malla importada, a un porcentaje o a un número de triángulos |
| `layerling_save_custom_shape` | guarda cuerpos como forma personalizada, en el servidor o en el navegador, para insertarlos en otros diseños |
| `layerling_list_custom_shapes` | lista las formas personalizadas del servidor y del navegador |
| `layerling_insert_custom_shape` | inserta una forma personalizada en el diseño abierto, en un punto x/z si quieres |
| `layerling_delete_custom_shape` | elimina una forma personalizada; los cuerpos ya insertados se quedan |
| `layerling_show_workplane` | oculta y muestra la placa con su cuadrícula, por ejemplo para una captura de la parte de abajo (solo la vista) |
| `layerling_set_section_view` | abre la vista en corte por un plano para mirar dentro (solo la vista: no se corta nada) |
| `layerling_measurements` | muestra u oculta las mediciones de la cinta métrica y las lista con sus longitudes, y oculta o muestra las medidas alrededor de la selección como [[Q]] |
| `layerling_saved_view` | guarda la vista actual en la tecla 7, 8, 9 o 0 y vuelve a ella, como Mayús+tecla y la tecla (solo la vista); también fija la vista de arranque de los diseños nuevos |
| `layerling_clear_history` | elimina para siempre todos los pasos de deshacer, como el botón «Eliminar historial» de la vista del historial; necesita `confirm: true` |
| `layerling_set_history_view` | consulta un estado anterior del proyecto, como la vista del historial (el diseño real no se toca; las herramientas que cambian algo esperan a que se cierre) |
| `layerling_restore_from_history` | trae al diseño, como copias, objetos de un estado anterior (también piezas dentro de grupos), igual que «Traer al diseño» en la vista del historial; es un solo paso, que deshacer revierte |
| `layerling_export_section_svg` | devuelve los contornos en un plano de corte como SVG a escala 1:1, a partir de los mismos cuerpos que la exportación |
| `layerling_export_drawing` | hace el plano para el taller de la exportación «2D»: tres vistas a escala 1:1 en una hoja ISO, con las medidas totales y una tabla de los taladros redondos, como texto SVG o como PDF |
| `layerling_export_mesh` | escribe el archivo de la ventana de exportación en STL, 3MF, OBJ, SVG (vista superior, huella o aristas visibles) o DXF para corte láser, a partir de los mismos cuerpos; en una ruta de este ordenador o en base64 |
| `layerling_save_project` | guarda el diseño editable completo como archivo .lyl en una ruta del ordenador donde funciona el servidor MCP, sin cuadro de diálogo; un archivo existente solo se sustituye con `overwrite`, se escribe a través de un archivo temporal y el destino de Ctrl+S en el editor no cambia |
| `layerling_list_attachments` | lista los archivos adjuntos al diseño (nombre, tipo, tamaño), como los muestra el panel Attachments |
| `layerling_get_attachment` | lee un archivo adjunto, sus bytes en base64, como Download en el panel |
| `layerling_add_attachment` | adjunta un archivo dado en base64, con las comprobaciones del panel; un nombre ya adjunto solo se sobrescribe con `replace` |
| `layerling_rename_attachment` | cambia el nombre de un archivo adjunto; su contenido se mantiene |
| `layerling_remove_attachment` | quita un archivo adjunto para siempre; necesita `confirm: true` |
| `layerling_set_workplane` | coloca el plano de trabajo en un lateral de un cuerpo o lo devuelve a la placa base, y lo oculta o lo muestra |
| `layerling_capture_image` | hace una captura de la vista: de frente, desde arriba, de lado, en diagonal desde una esquina y más |

Así la IA puede comprobar su propio trabajo: crea algo, hace una captura, la mira y lo mejora.

## Un ejemplo

Le dices: «Hazme una caja redonda de 60 mm de diámetro y 40 mm de altura con una pared de 2,5 mm, abierta por arriba, y una tapa plana con “Té” escrito en arco». La IA crea los cilindros, vacía uno, pone el texto curvado sobre la tapa y, al final, hace capturas para ver si todo encaja.

> **Consejo:** Dale a la IA medidas concretas y dile para qué es la pieza («soporte para una varilla de 12 mm, que quepa en una Bambu Lab A1»). Así toma decisiones más sensatas. Y mírala mientras construye: puedes intervenir tú en cualquier momento, porque es el mismo editor.
