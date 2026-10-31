---
title: Progettare con un’IA (MCP)
summary: Come un assistente IA, per esempio Gemini, Claude o Codex, crea e modifica forme, le raggruppa e acquisisce immagini della vista nell’editor aperto.
---

layerling include un server MCP. MCP è uno standard che permette a un assistente IA di usare strumenti in altri programmi. Grazie a questo server, un client IA come Gemini, Claude o Codex può vedere una scheda dell’editor aperta e lavorarci: crea forme, ne modifica le dimensioni, le raggruppa, le taglia, arrotonda gli spigoli, legge la scena e acquisisce immagini della vista. Tu descrivi il pezzo, l’IA lo costruisce e tu puoi seguirla e intervenire in qualsiasi momento.

Il collegamento tra il client IA e l’editor funziona **in locale sul tuo computer**. Tieni però presente che ciò che l’IA legge — la scena e le immagini della vista — viene inviato al fornitore del client IA, come qualsiasi altro dato inserito in quel servizio.

> **Importante:** il collegamento MCP è disponibile nel server di sviluppo che avvii tu sul computer. È disattivato su layerling.com e nelle installazioni con hosting statico. Una copia ospitata da te, per esempio l’immagine Docker su un NAS, può attivarlo con un token di accesso; vedi «Una copia su NAS o server» più avanti.

## Configurazione

1. Scarica layerling da [GitHub](https://github.com/henmedia/layerling) e avvialo nella cartella del progetto con `npm run dev`. Devi avere installato Node.js. Su Windows, la riga di avvio rapido nel README si occupa di installare ciò che serve.
2. Apri una scheda dell’editor, per esempio `http://127.0.0.1:3000/?editor=1`. Puoi lasciare che se ne occupi l’IA: se non c’è un editor aperto, il primo strumento che ne ha bisogno avvia il browser con l’editor e attende che si colleghi. Funziona con layerling sul tuo computer; per una copia su NAS o server devi aprire tu l’editor. Per disattivare questa funzione nel server MCP, imposta `LAYERLING_MCP_OPEN_EDITOR=0`.
3. Collega il client IA al server MCP. Il client avvia il server con `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Non devi installare nulla: il progetto contiene un file `.mcp.json` che registra il server e la skill in `.claude/skills/layerling-mcp-skill`. Apri la cartella di layerling in Claude Code e chiedi, per esempio: «Usa gli strumenti MCP di layerling per elencare gli editor aperti e analizzare la scena».

### Claude Desktop

Claude Desktop non legge i file del progetto. Inserisci il server nella sua configurazione. Come modello, usa `docs/mcp/claude-desktop-config.example.json` nel progetto e sostituisci il percorso dello script con il percorso assoluto sul tuo computer. Poi riavvia Claude Desktop.

### Codex

Copia la skill da `docs/skills/layerling-mcp-skill` nella cartella delle skill di Codex, aggiungi il server alla configurazione di Codex usando `docs/mcp/codex-config.example.toml` e riavvia Codex.

### Gemini e Antigravity

Antigravity rileva automaticamente la skill dell’area di lavoro in `.agents/skills/layerling-mcp-skill`. Per Gemini CLI, copia la skill da `docs/skills/layerling-mcp-skill` nella cartella globale delle skill (`~/.gemini/skills/`), aggiungi il server alle impostazioni usando `docs/mcp/gemini-config.example.json` e riavvia il client.

Le istruzioni dettagliate per ciascun client sono nel [README su GitHub](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## Una copia su NAS o server

Una copia ospitata da te può consentire a un client IA di controllare via rete gli editor aperti. Questa funzione è disattivata per impostazione predefinita, perché chiunque possa controllare il collegamento può leggere e modificare i progetti aperti. Sul server imposta `LAYERLING_MCP_REMOTE` su `true` e `LAYERLING_MCP_TOKEN` su un segreto di almeno 16 caratteri (per l’immagine Docker, inseriscili nella sezione `environment:` del file compose; non serve ricostruire l’immagine). Apri una scheda dell’editor di quella copia e lasciala aperta; poi fornisci al client MCP l’indirizzo e lo stesso token: `LAYERLING_URL=http://nas:3000` e `LAYERLING_MCP_TOKEN=<il token>`.

Solo un client in possesso del token può elencare o controllare gli editor. Le pagine dell’editor non richiedono il token, ma vengono riconosciute solo se raggiunte tramite un indirizzo o un nome utilizzabile esclusivamente nella tua rete (un indirizzo IP, un nome senza punto oppure uno che termina in `.local` o `.lan`). Se usi un dominio reale dietro un proxy inverso, aggiungilo a `LAYERLING_MCP_ALLOWED_HOSTS`. Usa la funzione su una rete di cui ti fidi e attiva HTTPS quando il collegamento esce da quella rete. Il README contiene tutti i dettagli.

## Cosa può fare l’IA

L’IA usa le stesse funzioni che hai a disposizione, attraverso lo stesso percorso dell’editor. Quando layerling aggiunge una funzione, diventa subito disponibile anche un’azione MCP corrispondente. Gli strumenti sono:

| Strumento | Funzione |
| --- | --- |
| `layerling_list_editors` | Elenca le schede degli editor aperte. |
| `layerling_open_editor` | Apre una nuova scheda dell’editor nel browser predefinito e attende che si colleghi (solo sul tuo computer). |
| `layerling_read_scene` | Legge la scena, la selezione, le unità e le dimensioni esatte di tutti gli oggetti. |
| `layerling_list_objects` | Elenca tutti gli oggetti con dimensioni, posizione, rotazione e ID. |
| `layerling_select_objects` | Seleziona gli oggetti. |
| `layerling_delete_objects` | Elimina gli oggetti. |
| `layerling_create_shape` | Crea una forma: cubo, cilindro, testo (anche curvo), filettatura, ingranaggio, corpo da schizzo e tutte le altre forme. |
| `layerling_import_file` | Importa un file come fa la finestra di importazione: un OBJ o 3MF a colori diventa un corpo per colore; un 3MF con più oggetti diventa un corpo per oggetto. |
| `layerling_add_font` | Aggiunge un font personalizzato per il testo da un file TrueType, OpenType o WOFF. Il font resta nel browser e il progetto conserva solo le lettere che usa. |
| `layerling_list_fonts` | Elenca i font integrati e quelli personalizzati, con ID e nome. |
| `layerling_import_mesh` | Importa nel progetto una mesh di triangoli. |
| `layerling_update_object` | Modifica dimensioni, posizione, colore, nome, tipo pieno o foro e tutte le altre proprietà della forma, compreso il bordo delle lettere di un testo. |
| `layerling_align_objects` | Allinea gli oggetti tra loro. |
| `layerling_scale_objects` | Ridimensiona gli oggetti in percentuale, tutti insieme oppure ciascuno attorno alla propria posizione. |
| `layerling_lay_flat` | Appoggia un oggetto sul piano usando una delle sue facce. |
| `layerling_place_on_face` | Appoggia gli oggetti su una faccia di un altro, anche se inclinata, come con il tasto C. |
| `layerling_perforate_face` | Crea un motivo di fori su una faccia piana; i fori restano tali e vengono raggruppati con il corpo. |
| `layerling_sweep_sketch` | Estende una sezione rettangolare o circolare lungo un percorso di punti, creando un corpo esatto; se il percorso è chiuso, crea un anello. |
| `layerling_push_face` | Estende una faccia piana o crea una tasca al suo interno, impostando un margine dal bordo e il raggio degli angoli; la nuova parte è un corpo da schizzo raggruppato con il corpo originale. |
| `layerling_mate_faces` | Accosta una faccia di un oggetto a quella di un altro, facendole combaciare o allineandole a filo. |
| `layerling_open_group` | Apre un gruppo per modificare le parti singolarmente, anche se si trova dentro un altro gruppo già aperto. |
| `layerling_close_group` | Chiude il gruppo (con «Fine») oppure annulla l’operazione. |
| `layerling_group_objects` | Raggruppa gli oggetti. |
| `layerling_ungroup_objects` | Scioglie i gruppi. |
| `layerling_boolean_cut` | Sottrae i fori dai solidi. |
| `layerling_intersect_objects` | Conserva solo la parte comune agli oggetti (intersezione). |
| `layerling_hull_objects` | Avvolge gli oggetti in un unico corpo convesso, come con la pellicola termoretraibile (involucro). |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_make_lid` | makes a lid for a body open at the top: pushed in, over the top or flat, with the fit you choose (Lid) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | Separa una forma nelle sue parti distinte; un corpo da schizzo viene diviso in un corpo per contorno. |
| `layerling_split_objects` | Taglia a metà solidi o fori con un piano. |
| `layerling_list_edges` | Elenca gli spigoli CAD reali di un oggetto. |
| `layerling_apply_edge_treatment` | Applica smussi o raccordi agli spigoli selezionati. |
| `layerling_hollow_object` | Svuota un corpo mantenendo pareti di spessore uniforme. |
| `layerling_cut_out` | ritaglia un solido da un altro perché combacino: la parte resta, una copia ingrandita del gioco viene sottratta all'altro corpo |
| `layerling_offset_object` | sposta tutte le facce di un corpo per il gioco di un accoppiamento: lo ingrandisce o riduce, o aggiunge la copia ingrandita come vuoto, o sposta solo i lati |
| `layerling_list_faces` | Elenca le facce di un corpo CAD esatto. |
| `layerling_delete_faces` | Elimina le facce e chiude l’apertura. |
| `layerling_array_objects` | Crea copie in fila o disposte in cerchio. |
| `layerling_bundle_objects` | Raggruppa gli oggetti come con Ctrl+B: si spostano insieme, mantengono colore e tipo e vengono esportati separatamente. |
| `layerling_layer_text` | Trasforma un testo in una serie di livelli per la stampa multicolore (lettere, bordi più larghi e piastra senza fori) oppure ricostruisce la serie, con foro per portachiavi, angoli per livello e bordo delle lettere arrotondato o smussato. Se fornisci un elenco di nomi, crea un’etichetta per ciascuno. |
| `layerling_layer_icon` | Trasforma un’icona SVG (il testo del file o un corpo da schizzo estruso) in un’etichetta a livelli per la stampa multicolore — icona, bordi più larghi e piastra senza fori — oppure la ricrea con una nuova larghezza o nuovi livelli. Se specifichi una quantità, riempie la piastra con copie. |
| `layerling_create_qr_code` | Crea un codice QR da un testo o da un indirizzo web, come {{ui:shape.qrCode}} nella raccolta di forme: il solo codice, in rilievo su una piastra oppure inciso, con correzione degli errori, larghezza, altezza e zona libera; può anche creare un foro. Avvisa se un modulo è più piccolo di 0,8 mm. |
| `layerling_reference_image` | aggiunge un'immagine di riferimento da un'immagine, come {{ui:import.referenceImage}}, oppure ne sposta, ruota, calibra (due punti dell'immagine e la loro distanza reale), rende trasparente o blocca una: una guida che non viene mai esportata né stampata; `trace` trasforma la parte scura o chiara in un corpo di schizzo appoggiato sopra |
| `layerling_measure_section` | Misura su un piano di sezione tra due punti agganciati al contorno: spessore delle pareti, spazi e accoppiamenti. |
| `layerling_show_overhangs` | Attiva o disattiva la visualizzazione dei sovrasbalzi, ne imposta l’angolo e indica per ogni corpo l’area che richiederebbe supporti. |
| `layerling_estimate_print` | Stima volume, peso e filamento per la selezione o per l’intero progetto: calcola il corpo pieno e fornisce una stima approssimativa con pareti e riempimento, come nella finestra di esportazione. |
| `layerling_add_reference_points` | Aggiunge punti di riferimento — al centro, agli angoli o nei punti medi degli spigoli degli oggetti, oppure in posizioni precise — a cui si agganciano le forme. |
| `layerling_list_reference_points` | Elenca i punti di riferimento con i rispettivi ID e posizioni. |
| `layerling_remove_reference_points` | Elimina i punti di riferimento indicati tramite ID oppure li elimina tutti. |
| `layerling_inspect_errors` | Mostra l’ultimo messaggio e l’ultimo errore, oltre a tutti i messaggi e gli errori della sessione. |
| `layerling_wrap_around_cylinder` | Avvolge attorno a un cilindro un corpo appoggiato in piano, per esempio un SVG o un testo, verso l’esterno oppure verso l’interno come incisione. |
| `layerling_texture_surface` | Applica una texture di superficie a un corpo: scanalature, zigrinatura, nido d’ape o bugnature, per una presa migliore o per l’aspetto, e in seguito la modifica o la rimuove. |
| `layerling_simplify_mesh` | Riduce il numero di triangoli di una mesh importata, mantenendo una percentuale o un numero preciso di triangoli. |
| `layerling_save_custom_shape` | Salva i corpi come forma personalizzata, sul server o nel browser, per inserirli in altri progetti. |
| `layerling_list_custom_shapes` | Elenca le forme personalizzate salvate sul server e nel browser. |
| `layerling_insert_custom_shape` | Inserisce una forma personalizzata nel progetto aperto, anche in una posizione x/z specifica. |
| `layerling_delete_custom_shape` | Elimina una forma personalizzata; i corpi già inseriti restano nel progetto. |
| `layerling_show_workplane` | Nasconde o mostra il piano con la griglia, per esempio per fotografare la parte inferiore (modifica solo la vista). |
| `layerling_set_section_view` | Apre la vista lungo un piano di sezione per mostrare l’interno; non taglia realmente il pezzo (modifica solo la vista). |
| `layerling_measurements` | mostra o nasconde le misurazioni del metro a nastro e le elenca con le loro lunghezze, e nasconde o mostra le misure attorno alla selezione come [[Q]] |
| `layerling_saved_view` | Salva la vista corrente con il tasto 7, 8, 9 o 0 e la richiama in seguito, come con Maiusc+tasto e poi il tasto (modifica solo la vista). Imposta anche la vista di avvio dei nuovi progetti. |
| `layerling_clear_history` | Elimina definitivamente tutti i passaggi annullabili, come il pulsante «Elimina cronologia» nella vista Cronologia; richiede `confirm: true`. |
| `layerling_set_history_view` | Mostra uno stato precedente del progetto, come la vista Cronologia. Il progetto vero e proprio non viene modificato; gli strumenti di modifica restano in attesa finché la vista non viene chiusa. |
| `layerling_restore_from_history` | Ripristina nel progetto come copie gli oggetti di uno stato precedente, comprese le parti all’interno dei gruppi, come «Inserisci nel progetto» nella vista Cronologia; l’operazione è un singolo passaggio annullabile. |
| `layerling_export_section_svg` | Restituisce in formato SVG, in scala 1:1, i contorni sul piano di sezione, usando gli stessi corpi dell’esportazione. |
| `layerling_sketch_from_section` | Crea uno schizzo dai contorni su un piano di sezione, appoggiato sulla sezione: aperto nell'editor per modificarlo, oppure costruito subito come corpo di un'altezza data. |
| `layerling_export_drawing` | Crea il disegno tecnico dell’esportazione «2D»: tre viste in scala 1:1 su un foglio ISO, con dimensioni complessive e tabella dei fori circolari, in formato SVG testuale o PDF. |
| `layerling_export_mesh` | Esporta i corpi della finestra di esportazione in formato STL, 3MF, OBJ, SVG (vista dall’alto, impronta o spigoli visibili) o DXF per il taglio laser, in un percorso del computer o come base64. |
| `layerling_save_project` | Salva l’intero progetto modificabile come file `.lyl` in un percorso del computer su cui è in esecuzione il server MCP, senza finestra di dialogo. Un file esistente viene sostituito solo con `overwrite`; il salvataggio avviene tramite un file temporaneo e non modifica la destinazione di [[Ctrl]]+[[S]] nell’editor. |
| `layerling_list_attachments` | elenca i file allegati al progetto (nome, tipo, dimensione), come li mostra il pannello Attachments |
| `layerling_get_attachment` | legge un file allegato, i suoi byte in base64, come Download nel pannello |
| `layerling_add_attachment` | allega un file dato in base64, con i controlli del pannello; un nome già allegato viene sovrascritto solo con `replace` |
| `layerling_rename_attachment` | dà un altro nome a un file allegato; il contenuto resta |
| `layerling_remove_attachment` | rimuove un file allegato per sempre; richiede `confirm: true` |
| `layerling_set_workplane` | Posiziona il piano di lavoro su un lato di un corpo o lo riporta alla piastra di base, e lo nasconde o lo mostra. |
| `layerling_capture_image` | Acquisisce un’immagine della vista: frontale, dall’alto, laterale, diagonale da un angolo e altre prospettive. |

In questo modo l’IA può controllare il proprio lavoro: crea una forma, acquisisce un’immagine, la esamina e la migliora.

## Un esempio

Puoi chiedere: «Costruisci una scatola cilindrica di 60 mm di diametro e 40 mm di altezza, con pareti spesse 2,5 mm e aperta in cima, più un coperchio piatto con la scritta “Tea” disposta ad arco». L’IA crea i cilindri, svuota quello interno, dispone il testo curvo sul coperchio e alla fine acquisisce alcune immagini per verificare che tutto combaci.

> **Suggerimento:** indica all’IA misure precise e spiega a cosa serve il pezzo («supporto per un’asta da 12 mm, compatibile con Bambu Lab A1»). Potrà così fare scelte più sensate. E segui la costruzione: puoi intervenire in qualsiasi momento, perché l’IA lavora nello stesso editor.
