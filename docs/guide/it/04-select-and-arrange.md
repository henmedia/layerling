---
title: Selezionare e disporre
summary: Selezionare le forme, trovarle nell’elenco degli oggetti, allinearle, specchiarle, ruotarle, appoggiarle su una faccia e moltiplicarle con gli schemi.
---

## Selezionare

Fai clic su una forma per selezionarla. Tieni premuto [[Shift]] per aggiungere altre forme alla selezione o rimuoverle. Se tieni premuto [[Shift]] con due o più forme selezionate, un piccolo numero sotto il puntatore indica quante sono. Fai clic nello spazio vuoto o premi [[Esc]] per deselezionare tutto. Trascina un riquadro sul piano di lavoro vuoto per selezionare tutto ciò che tocca; tenendo premuto [[Shift]], il riquadro aggiunge gli elementi non selezionati e rimuove quelli già selezionati. Se preferisci selezionare un solo elemento in un gruppo affollato, attiva {{ui:workspace.frameByDirection}} nelle impostazioni, nella sezione {{ui:workspace.appearance}}: trascinando il riquadro verso destra selezioni solo gli oggetti completamente al suo interno; trascinandolo verso sinistra selezioni invece tutti quelli che tocca, e il contorno diventa tratteggiato. Tieni premuto [[Alt]] mentre trascini per invertire la direzione del riquadro solo per quel gesto, per esempio per selezionare interi corpi dal lato in cui la direzione normale non lo permetterebbe. [[Ctrl]]+[[A]] seleziona tutti i corpi visibili. Mentre trascini un corpo o una maniglia del riquadro, [[Esc]] annulla l’operazione finché tieni premuto il pulsante del mouse: tutto torna com’era e la cronologia non registra alcuna modifica.

Nascondi ciò che intralcia con {{ui:editor.tool.hideSelected}} o [[Ctrl]]+[[H]]. Le forme nascoste restano nel progetto, ma non sono visibili e non vengono incluse nell’esportazione; la finestra di esportazione ne indica prima il numero. [[Ctrl]]+[[Shift]]+[[H]] le mostra di nuovo tutte. Blocca con il lucchetto in cima alle impostazioni gli elementi che devono restare fermi, oppure premi [[Ctrl]]+[[L]]. Una forma bloccata non può essere spostata, ridimensionata, ruotata, ricolorata o eliminata: le maniglie diventano grigie, accanto alla freccia in alto compare un lucchetto e gli strumenti che la modificherebbero sono disattivati. Passando sopra una maniglia continui a vederne le dimensioni, mentre un tasto che proverebbe a modificarla mostra “Oggetto bloccato”. Se nella selezione c’è una forma bloccata, anche le altre non possono essere modificate. Restano disponibili nascondere, rinominare, copiare e duplicare.

Un numero sul pulsante del gruppo {{ui:editor.group.visibility}} indica quante forme sono nascoste; facendoci clic le mostri tutte. Se apri un progetto che contiene forme nascoste, un messaggio te lo segnala una volta e offre un pulsante per mostrarle.

## L’elenco degli oggetti

Quando ci sono molte parti, è facile perderne qualcuna nella vista. L’elenco degli oggetti ({{ui:editor.tool.showOutliner}} o [[Ctrl]]+[[Shift]]+[[O]]) mostra tutte le forme in un elenco. Rimane aperto o chiuso come l’hai lasciato, per ogni progetto, finché non lo chiudi; la scelta viene memorizzata nel browser.

![L’elenco degli oggetti: il gruppo “Gruppo” contiene due parti e accanto c’è una sfera. L’icona della cartella apre il gruppo.](shot:object-list)

- Fai clic su una voce per selezionare la forma, anche se si trova dentro un gruppo. Tieni premuto [[Shift]] per aggiungere o rimuovere altre voci, proprio come nella vista. Le frecce aprono e chiudono i gruppi.
- L’etichetta indica se una parte è {{ui:outliner.solid}} oppure {{ui:outliner.hole}}.
- Il lucchetto e l’occhio bloccano o nascondono le singole parti.
- {{ui:outliner.rename}} assegna un nome alla parte; la matita accanto al nome in cima alle impostazioni rinomina allo stesso modo la forma selezionata. In un progetto grande, nomi chiari sono di grande aiuto.
- Il campo di ricerca trova le forme per nome e per tipo, per esempio “cilindro” o “foro”. Cerca anche all’interno dei gruppi, a qualsiasi livello: se un gruppo contiene una corrispondenza, resta nell’elenco e si apre mostrando le parti trovate e i gruppi che conducono a esse. Se invece il nome del gruppo stesso corrisponde alla ricerca, aprendolo vedrai tutte le sue parti.
- La freccia all’estrema sinistra della barra del titolo comprime l’elenco nella sola barra e lo riapre.

L’elenco è ancorato subito a destra del cubo di visualizzazione. Trascinalo dalla barra del titolo per posizionarlo ovunque sul piano di lavoro; può sovrapporsi al cubo e alla barra della telecamera. Riportalo accanto al cubo o fai doppio clic sulla barra del titolo per ancorarlo di nuovo. In questo browser vengono ricordati posizione e stato aperto o compresso.

## Digitare una posizione

Il riquadro {{ui:inspector.position}} nel pannello delle proprietà mostra la posizione del corpo selezionato e permette di modificarla digitando i valori. {{ui:prop.positionX}} e {{ui:prop.positionY}} indicano il centro del riquadro d’ingombro sulla piastra, con gli stessi segni delle distanze mostrate sul piano di lavoro; {{ui:prop.positionZ}} indica invece l’altezza della parte inferiore del corpo. X aumenta verso destra, Y verso il fondo e Z verso l’alto, secondo la regola della mano destra usata anche in Tinkercad e nei programmi CAD. Le frecce degli assi sulla piastra mostrano le direzioni. I valori usano l’unità selezionata; i cursori hanno lo stesso intervallo dello spostamento con le maniglie.

## Parcheggiare parti accanto alla piastra

Puoi trascinare una forma oltre il bordo della piastra e lasciarla lì, fino a circa una larghezza della piastra oltre ogni lato, per conservarla e usarla più tardi. Con i tasti freccia puoi spostarla ancora più lontano. Una parte parcheggiata resta nel progetto e viene inclusa nell’esportazione insieme al resto. Per escluderla, nascondila oppure esporta solo la selezione. Se hai scelto una stampante, durante l’esportazione layerling ti avvisa quando un elemento si trova fuori dal suo piatto.

## Aggancio durante lo spostamento

Quando trascini una forma sul piano di lavoro, questa si aggancia alle altre forme: il bordo sinistro, destro, anteriore o posteriore, oppure il centro, coincide esattamente con un bordo o con il centro di un’altra forma. Una guida rosa indica il punto di aggancio. Così puoi affiancare due parti senza spazi o centrarne una dietro l’altra senza digitare valori. Funziona anche con la griglia disattivata.

Tieni premuto [[Shift]] mentre trascini per vincolare lo spostamento a un asse: la forma segue la direzione in cui ti sei spostato di più, X oppure Y, e non si muove lungo l’altro asse. È preferibile premere [[Shift]] dopo aver iniziato a trascinare; se la forma non è ancora selezionata, un clic con [[Shift]] la aggiunge soltanto alla selezione.

Se tieni già premuto [[Alt]] quando inizi a trascinare, sposti una copia, come in Tinkercad: la forma originale resta dov’è e la copia si posiziona quando rilasci il pulsante. Premendo [[Alt]] solo durante il trascinamento, sospendi l’aggancio e la forma segue soltanto la griglia. Anche la copia si aggancia solo dopo aver rilasciato [[Alt]]. Per disattivare definitivamente l’aggancio, usa il menu della griglia in basso a destra ({{ui:inspector.objectSnap}}) o le impostazioni. Per ora l’aggancio funziona solo quando sposti una forma sul piano di lavoro normale, non quando la sollevi o la ridimensioni.

## Allineare

Seleziona almeno due forme e usa {{ui:editor.tool.align}} per allinearle: intorno alla selezione compaiono punti per allineare a sinistra, al centro o a destra, davanti, al centro o dietro, in alto, al centro o in basso. Facendo clic su un punto, tutte le forme si spostano in quella posizione. Se prima fai clic su una delle forme selezionate, questa resta ferma e le altre si allineano a essa. Se nella selezione c’è una forma bloccata, quella diventa l’unico riferimento fisso. Sinistra, destra, davanti, dietro, sopra e sotto si riferiscono al riquadro d’ingombro della forma; invece, per un triangolo, un pentagono o una stella, il centro è il centro geometrico della forma stessa. Così un foro centrato su di essa finisce nel suo centro, non in quello del riquadro.

Una forma ruotata, per esempio di 45°, viene allineata usando il proprio riquadro d’ingombro e non i suoi spigoli. Per allinearla secondo gli spigoli, imposta prima il piano di lavoro su una sua faccia ({{ui:camera.placeWorkplane}}, poi fai clic sulla faccia): i punti corrisponderanno agli assi del piano e le forme saranno misurate e spostate lungo quegli assi, come in Tinkercad. Reimposta il piano di lavoro per tornare ad allineare rispetto alla piastra.

![Lo strumento Allinea mostra con dei punti le possibili posizioni attorno alla selezione.](shot:align)

Il tasto è [[L]]. [[Esc]] annulla.

## Specchiare

{{ui:editor.tool.mirror}} ([[M]], oppure clic destro sulla selezione e scelta del comando) riflette la selezione rispetto a un piano: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} o {{ui:mirror.topBottom}}. Fai clic sulla freccia dell’asse corrispondente. È utile per le parti simmetriche: costruisci una metà, copiala e specchia la copia.

## Ruotare e impostare il punto di rotazione

Puoi ruotare una forma con le frecce curve, con i valori nelle impostazioni oppure premendo [[R]], a scatti di 45°. Trascinando la circonferenza di rotazione, la rotazione si aggancia a ogni tacca, cioè ogni 22,5°; tieni premuto [[Shift]] per incrementi più piccoli, con tacche aggiuntive ogni 11,25°. Trascina fuori dalla circonferenza per ruotare liberamente a incrementi di 1°, oppure di 45° con [[Shift]]. Di norma, la selezione ruota attorno al proprio centro. A volte serve un altro punto di rotazione, per esempio per ruotare ulteriormente l’estremità di un tubo inclinato. Usa {{ui:editor.tool.rotationPivot}} e poi fai clic su una faccia. Una faccia piatta fornisce il proprio centro, per esempio l’asse dell’estremità di un tubo. Da quel momento la selezione ruota intorno a quel punto. Fai di nuovo clic sullo strumento per rimuoverlo.

Gli angoli restano associati al corpo. Nelle impostazioni, {{ui:inspector.rotation}} li mostra come {{ui:prop.rotateX}}, {{ui:prop.rotateY}} e {{ui:prop.rotateZ}}, nominati come le coordinate della posizione: Y attraversa la piastra, Z è verticale. Digita un angolo per ruotare il corpo a quel valore, attorno al proprio centro o al suo punto di rotazione personalizzato, se presente. Quando selezioni un corpo ruotato, gli angoli compaiono anche sotto di esso sul piano di lavoro; {{ui:workspace.showRotationAngles}} nelle impostazioni li nasconde.

![Un corpo ruotato attorno a due assi: gli angoli sono indicati sotto di esso e il riquadro Rotazione nelle impostazioni permette di inserirli numericamente.](shot:rotation-card)

Selezionando **un solo corpo**, il punto di rotazione appartiene a quel corpo: puoi selezionare altre parti e tornare a esso, il punto resta al suo posto. Si sposta, ruota e si ridimensiona insieme al corpo, viene salvato nel progetto ed è ripristinato con Annulla. In {{ui:inspector.position}} il punto di rotazione ha coordinate X, Y e Z proprie, che puoi digitare o regolare a piccoli incrementi; {{ui:inspector.pivotRemove}} lo elimina. Puoi anche trascinare con il mouse il suo indicatore rosso: scorre sulla superficie dei corpi e si aggancia agli angoli, ai punti medi degli spigoli e agli spigoli, così il perno di una cerniera può finire esattamente su un angolo. Se selezioni più corpi, il punto di rotazione vale solo per quella selezione e scompare quando ne crei una nuova. Raggruppandoli o legandoli in un fascio resta: il gruppo lo prende come proprio perno, con X, Y e Z sotto {{ui:inspector.position}}.

## Appoggiare una forma su una faccia

Vuoi appoggiare una parte sul lato migliore per stamparla? Selezionala, fai clic su {{ui:editor.tool.layFlat}} e poi sulla faccia che vuoi rivolgere verso il basso. Spostando il puntatore sulla parte, la faccia sottostante si illumina e puoi vedere quale stai per scegliere; ruota la vista per controllare gli altri lati. La parte ruota fino ad appoggiare quella faccia sul piano di lavoro.

Vuoi unire due parti faccia a faccia o allinearle sullo stesso piano? Seleziona la parte da spostare, fai clic su {{ui:editor.tool.mateFaces}}, poi sulla sua faccia e infine sulla faccia dell’altra parte. Nel pannello, {{ui:mate.mode.against}} mette le facce una contro l’altra, a contatto; {{ui:mate.mode.flush}} le dispone sullo stesso piano, affiancate. {{ui:mate.gap}} lascia uno spazio tra loro, utile per esempio per il gioco. {{ui:mate.apply}} sposta la parte: la ruota per la via più breve finché le facce diventano parallele, oppure non la ruota affatto se lo sono già, poi la sposta soltanto verso l’altra faccia, senza modificarne la posizione laterale. L’altra parte resta ferma e un solo Annulla ripristina tutto.

![Il pannello Allinea facce: scegli la parte da spostare, poi una faccia dell’altra parte, quindi il contatto faccia a faccia o l’allineamento e, facoltativamente, la distanza.](shot:mate-faces)

**Fori sullo stesso asse:** {{ui:mate.mode.concentric}} allinea invece facce tonde: un foro sopra un foro, un perno in un foro, una vite nel suo foro passante. Sceglilo prima di fare clic sulle facce. Poi fai clic sull'interno tondo di un foro (o sull'esterno di un perno) del pezzo che si muove, e su una faccia tonda dell'altro pezzo; tutta la faccia tonda si illumina mentre la indichi. {{ui:mate.apply}} ruota il pezzo per la via più breve finché i due assi sono paralleli e lo fa scorrere di lato sull'altro asse. Lungo l'asse resta dov'era, quindi un perno mantiene la sua altezza; spingilo dentro dopo. Funziona anche con mesh importate, purché il foro sia fatto di faccette attorno a un asse.

**Impostare un angolo preciso tra due facce:** {{ui:editor.tool.mateFaces}} rende le facce parallele; non esiste uno strumento dedicato per impostare un angolo tra loro, ma puoi ottenere lo stesso risultato così. Prima metti a contatto le facce con {{ui:editor.tool.mateFaces}}, in modo che siano parallele. Poi imposta il punto di rotazione sullo spigolo di contatto ({{ui:editor.tool.rotationPivot}}, quindi fai clic sullo spigolo o su un angolo) e inserisci l’angolo desiderato, per esempio 15 o 30, nel riquadro {{ui:inspector.rotation}} della parte. La rotazione avviene attorno a quel punto. Gli assi del riquadro sono quelli della piastra: il metodo funziona se lo spigolo segue X, Y o Z.

Puoi anche usare {{ui:editor.tool.dropToWorkplane}} ([[D]]) per appoggiare la selezione sul piano di lavoro, oppure {{ui:editor.tool.centerOnWorkplane}}.

[[C]] solleva la selezione, come Cruise in Tinkercad: la selezione segue il puntatore e si appoggia alla faccia del corpo su cui passi, anche se inclinata. Fai clic per posizionarla; [[Esc]] la lascia dov’era. Il lato inferiore si appoggia alla faccia e si allinea ai suoi spigoli come farebbe una nuova forma; la selezione mantiene la propria rotazione attorno all’asse verticale. Più parti si spostano insieme mantenendo la distanza reciproca. Sopra la piastra vuota, [[C]] rimette in verticale una parte inclinata. Se non hai una tastiera, il menu che appare tenendo premuto offre {{ui:contextMenu.carry}} per la stessa operazione.

## Schemi: righe e cerchi

Per creare griglie di fori, circonferenze di bulloni e corone dentate, usa {{ui:editor.tool.array}}. Seleziona le forme da moltiplicare e fai clic sullo strumento nella barra multifunzione.

![Lo schema in modalità “Cerchio”: inizialmente le copie sono mostrate come anteprima.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** ripete la selezione a intervalli regolari. La riga può avanzare contemporaneamente lungo tutti e tre gli assi con {{ui:array.spacingX}}, {{ui:array.spacingY}} e {{ui:array.spacingZ}}: un solo valore crea una riga dritta, due o tre una riga diagonale o una scala. Un intervallo negativo inverte la direzione.
- **{{ui:array.mode.circle}}:** dispone la selezione attorno a un centro. Imposta il numero di copie con {{ui:array.count}} e usa 360° in {{ui:array.angle}} per ottenere un cerchio completo. Puoi decidere se le copie devono ruotare lungo il percorso. {{ui:array.rise}} solleva ogni copia leggermente più della precedente, formando una vite o una spirale ascendente; {{ui:array.radiusChange}} la allontana dal centro o l’avvicina, formando una spirale piatta. Usandoli insieme ottieni una spirale conica. La spirale compie al massimo un giro: un angolo superiore a 360° viene considerato un cerchio completo e il numero di copie non può superare 100.

Suggerimento: imposta prima il punto di rotazione su una faccia con {{ui:editor.tool.rotationPivot}}, così il centro del cerchio coinciderà esattamente con quel punto.

![Lo schema in modalità “Cerchio”, con un incremento di altezza e una variazione del raggio per ogni copia: le copie salgono e si allargano formando una spirale.](shot:pattern-spiral)

Inizialmente le copie sono mostrate come anteprima. Solo {{ui:array.apply}} le crea. Se sono fori, al termine raggruppali con il corpo da tagliare.

## Schema di fori su una faccia

Per creare prese d’aria, griglie per altoparlanti, cestini e involucri, {{ui:holePattern.title}} distribuisce regolarmente i fori su una faccia piatta. Non devi più creare un foro, duplicarlo e posizionarlo sulla parete. Seleziona esattamente un corpo e fai clic su {{ui:holePattern.title}} nel gruppo {{ui:editor.group.modify}} della barra degli strumenti, accanto allo strumento per gli schemi. Puoi anche fare clic destro sul corpo o cercare lo strumento con [[Ctrl]]+[[K]].

1. Fai clic su una faccia piatta del corpo. Viene considerata tutta la faccia piatta intorno al punto, non solo il triangolo sotto il puntatore. Le facce curve non sono supportate: compare un suggerimento e puoi fare clic su una faccia piatta.
2. Nella finestra, imposta forma e disposizione dei fori:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} o {{ui:holePattern.form.slot}}.
   - **Dimensioni:** {{ui:holePattern.size.diameter}} per il diametro di un foro rotondo, {{ui:holePattern.size.side}} per il lato di un quadrato e {{ui:holePattern.size.width}} e {{ui:holePattern.size.height}} per rettangoli e asole. Per gli esagoni, la misura è {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** distanza tra i centri di due fori consecutivi. Se è troppo piccola rispetto ai fori, layerling la aumenta fino al minimo possibile per mantenere una parete tra i fori.
   - **{{ui:holePattern.wall}}:** esprime la stessa misura come larghezza della parete rimasta tra due fori vicini, cioè lo spessore che avrà nella stampa. Modificando questo valore, cambia la distanza tra i centri, e viceversa. Per esagoni, rettangoli e asole layerling calcola la distanza minima tra i bordi.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} dispone i fori in righe e colonne; {{ui:holePattern.arrangement.staggered}} sposta di metà passo ogni seconda riga e avvicina le righe, così ciascun foro è alla stessa distanza dai vicini. Con gli esagoni, questa disposizione crea un alveare.
   - **{{ui:holePattern.margin}}:** distanza libera tra i fori e il bordo della faccia. Vengono creati solo i fori che rientrano completamente nella faccia al netto di questo margine; quelli che lo oltrepasserebbero sono esclusi. Il margine viene mantenuto anche attorno alle aperture presenti sulla faccia.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (impostazione iniziale) attraversa l’intera parete; con {{ui:holePattern.depth.custom}} puoi impostare la profondità in millimetri, per esempio per creare incavi.
3. Un’anteprima dei fori compare subito sulla faccia e si aggiorna con ogni valore. La finestra indica quanti fori entrano. {{ui:holePattern.repick}} permette di scegliere un’altra faccia; [[Esc]] chiude lo strumento. Come le altre finestre degli strumenti, puoi spostarla trascinando la barra del titolo.
4. Solo {{ui:holePattern.apply}} crea i fori.

I fori sono normali forme raggruppate con il corpo, come dopo aver usato {{ui:editor.tool.group}}: non vengono incorporati in modo permanente. {{ui:editor.tool.ungroup}} scioglie di nuovo il gruppo e libera ogni foro, che puoi poi spostare, modificare o eliminare singolarmente. L’intera operazione è un solo passaggio per {{ui:editor.tool.undo}}. Lo strumento crea al massimo 400 fori per volta; se ne servono di più, aumenta la dimensione dei fori o la loro spaziatura.

Un’IA può eseguire la stessa operazione tramite il bridge MCP con `layerling_perforate_face` (vedi il capitolo [Progettare con un’IA (MCP)](chapter:ai-with-mcp)).

## Estrudere una faccia verso l’esterno o l’interno

Per ispessire una parete, aggiungere una sporgenza su una faccia o ricavarvi una cavità, lo strumento {{ui:faceTool.title}} agisce su una singola faccia piatta. Funziona anche con un file STL importato, che non contiene schizzi modificabili. Seleziona esattamente un corpo e fai clic su {{ui:faceTool.title}} nel gruppo {{ui:editor.group.modify}} della barra degli strumenti, accanto allo schema di fori. Puoi anche fare clic destro sul corpo o cercare lo strumento con [[Ctrl]]+[[K]].

1. Fai clic su una faccia piatta del corpo. Come per lo schema di fori, viene considerata l’intera faccia piatta intorno al punto; le facce curve non sono supportate.
2. Nella finestra:
   - **{{ui:faceTool.direction}}:** scegli {{ui:faceTool.direction.out}} per aggiungere materiale sulla faccia o {{ui:faceTool.direction.in}} per ricavare una cavità. La cavità non può essere più profonda del corpo dietro la faccia; in un corpo cavo può comunque raggiungere la cavità interna.
   - **{{ui:faceTool.inset}}:** definisce quanto il nuovo contorno deve restare all’interno rispetto al bordo della faccia. Quando aggiungi materiale verso l’esterno, il valore 0 usa tutta la faccia e ispessisce la parete. Anche le aperture sulla faccia si allargano della stessa misura.
   - **{{ui:faceTool.radius}}:** arrotonda tutti gli angoli del contorno, compresi quelli interni, così anche una punta aguzza termina con un arco. Un intaglio più stretto del doppio del raggio si chiude; una parte della faccia più stretta del doppio dell’incasso più il raggio viene esclusa.
   - **{{ui:faceTool.depth}}:** indica quanto il nuovo elemento sporge dalla faccia o la profondità della cavità.
3. Il risultato appare subito come anteprima e si aggiorna con ogni valore. {{ui:faceTool.repick}} permette di scegliere un’altra faccia; [[Esc]] chiude lo strumento.
4. Solo {{ui:faceTool.apply}} applica la modifica.

L’elemento aggiunto è un normale corpo creato da uno schizzo e raggruppato con il corpo originale: non viene incorporato in modo permanente. {{ui:group.edit}} apre il gruppo e {{ui:inspector.editSketch}} sulla nuova parte mostra il contorno seguito. Sulla faccia superiore o inferiore di un corpo creato da uno schizzo semplice — una sola area, non raggruppata, specchiata, rastremata, attorcigliata o inclinata e senza estrusione di contorno, anello portachiavi, raccordo o smusso — viene usato il contorno originale del corpo. Le linee e gli archi restano così esatti, ovunque il kernel CAD possa definirli come tali, per gli strumenti sugli spigoli e per l’esportazione STEP. Se in seguito ridimensioni la parte, l’incasso resta invariato. Su qualsiasi altra faccia, e su tutte le facce di una mesh importata, il contorno segue i triangoli della faccia e le curve diventano una serie di brevi segmenti rettilinei. L’intera operazione è un solo passaggio per {{ui:editor.tool.undo}}. Per modificare in seguito l’incasso o il raggio, annulla l’operazione e usa di nuovo lo strumento. Per arrotondare il bordo superiore, usa {{ui:editor.tool.fillet}} con {{ui:edge.topEdges}} sul gruppo come ultimo passaggio: come ogni trattamento degli spigoli applicato a un gruppo, lo unisce in un unico corpo.

Un’IA può eseguire la stessa operazione tramite il bridge MCP con `layerling_push_face` (vedi il capitolo [Progettare con un’IA (MCP)](chapter:ai-with-mcp)).

## Modificare più parti insieme

Quando selezioni più parti, il pannello delle proprietà a destra mostra quante sono e offre le operazioni applicabili a tutte: {{ui:inspector.solid}} o {{ui:inspector.hole}}, un unico colore (facendo clic su {{ui:inspector.solid}} si apre la scelta dei colori) e il blocco. Se la selezione contiene sia solidi sia fori, un clic li trasforma tutti in solidi oppure tutti in fori. Se anche una sola parte è bloccata, puoi usare soltanto il comando per bloccare o sbloccare. Modifica le dimensioni con le maniglie, con {{ui:scalePercent.title}} o digitando un valore nella quota della forma. Con più parti selezionate, la quota si riferisce all’intera selezione: tutte le parti si ingrandiscono in proporzione, compresi gli spazi che le separano, come quando trascini una maniglia. Anche solido e foro si possono impostare con il clic destro o con i tasti [[S]] e [[H]].

## Ridimensionare in percentuale

Per ingrandire o rimpicciolire una o più parti della stessa percentuale, per esempio tutte le parti di un file di stampa del 20%, usa {{ui:scalePercent.title}}. Seleziona le parti, fai clic destro e scegli {{ui:scalePercent.title}}, oppure cercalo con [[Ctrl]]+[[K]].

In {{ui:scalePercent.percent}} digita la nuova dimensione come percentuale di quella attuale: 120% è un quinto in più, 50% è la metà. Larghezza, profondità e altezza cambiano nella stessa proporzione, mantenendo la forma. La base resta nella posizione iniziale, così l’oggetto non sprofonda nella piastra.

Selezionando più parti, puoi scegliere come ridimensionarle:

- **{{ui:scalePercent.mode.together}}:** le parti crescono attorno al centro comune e anche le distanze tra loro aumentano. L’intero insieme si ingrandisce come fosse un unico oggetto.
- **{{ui:scalePercent.mode.each}}:** ogni parte si ridimensiona nella posizione in cui si trova e le distanze tra le parti restano invariate.

Solo {{ui:scalePercent.apply}} modifica il progetto; un solo Annulla ripristina la situazione precedente. Se nella selezione c’è una parte bloccata, lo strumento non si apre.

## Annullare

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) e {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] o [[Ctrl]]+[[Y]]) permettono di scorrere la cronologia. Nelle impostazioni, sotto {{ui:workspace.history}}, scegli quante operazioni mantenere nel progetto salvato. Passando sopra uno dei due pulsanti, il suggerimento nomina il passaggio che annullerebbe o ripeterebbe, con la misura quando il passaggio ne ha una, per esempio «Arrotondati gli spigoli di Box (5 mm)»; il messaggio successivo dice lo stesso. Per tornare indietro di più passaggi alla volta, usa la vista della cronologia qui sotto.

## Rivedere la cronologia

{{ui:editor.tool.history}}, accanto ai comandi Annulla e Ripeti, apre una vista della cronologia senza modificare nulla. L’area di lavoro mostra il progetto com’era e un cursore in basso scorre tutti i passaggi annullabili: all’estrema destra trovi lo stato corrente; ogni passo verso sinistra mostra uno stato precedente, mentre gli stati già annullati si trovano a destra di quello corrente. I tasti freccia passano da uno stato all’altro; [[Esc]] torna allo stato corrente. Anche la rotellina sopra il cursore scorre la cronologia, uno stato per scatto, verso quelli precedenti; [[Page Up]] e [[Page Down]] saltano dieci stati, [[Home]] mostra il più vecchio e [[End]] torna a quello corrente. Nel frattempo puoi ruotare e ingrandire la vista e fare clic sugli oggetti per recuperarli, come descritto qui sotto, ma non puoi spostarli: il progetto non viene modificato. Se la barra copre qualcosa, spostala trascinando la barra del titolo; un doppio clic la riporta al suo posto. Il pulsante elenco nella barra del titolo mostra tutti i passaggi per nome in un elenco, il più recente in alto: un clic su un passaggio va a quello stato, lo stato in cui si trova il progetto è segnato con {{ui:historyView.listNow}} e i passaggi annullati sono grigi. Se lasci l'elenco aperto, la volta successiva sarà ancora aperto.

Puoi recuperare due elementi da uno stato precedente. {{ui:historyView.createProject}} crea un nuovo progetto nella panoramica, con il nome del progetto corrente seguito tra parentesi dall’ora di quello stato; se il progetto era stato salvato prima che layerling registrasse gli orari, lo chiama “copia”. Il nuovo progetto contiene la cronologia fino a quel punto e permette quindi di continuare a usare Annulla. {{ui:historyView.export}} apre la normale finestra di esportazione usando quello stato come progetto, così puoi salvarlo in STL, 3MF, STEP, come immagine o come file LYL con la cronologia fino a quel momento.

Puoi anche recuperare singoli oggetti nel progetto corrente. Fai clic su un oggetto nello stato visualizzato; [[Shift]]+clic ne aggiunge altri o li rimuove dalla selezione, mentre un clic nello spazio vuoto deseleziona tutto. Poi scegli {{ui:historyView.bringBack}}. La vista si chiude e nel progetto corrente viene inserita una copia di ciascun oggetto, esattamente com’era e nella posizione che occupava in quello stato. Le copie vengono selezionate e aggiunte accanto agli elementi che il progetto contiene già; nient’altro cambia. È un’unica operazione, quindi Annulla la rimuove. Puoi usarla per recuperare una versione precedente di una parte modificata o una parte eliminata. Un gruppo viene recuperato per intero; le note e i punti di riferimento associati a un oggetto non vengono copiati. Il nome include l’ora dello stato, per esempio “Scatola (12:32)”, così puoi distinguerlo dalla versione attuale. Per recuperare una parte interna a un gruppo, seleziona il gruppo e scegli {{ui:historyView.openGroup}} o premi [[E]], come nel progetto: le parti vengono disposte come quando si modifica il gruppo e puoi selezionare quella che ti serve; la barra indica il gruppo aperto. {{ui:historyView.backOut}} lo chiude. Questa operazione serve solo a esplorare: gruppo, progetto e cronologia non vengono modificati.

{{ui:historyView.delete}} si trova da solo in basso a sinistra sulla barra. Dopo una richiesta di conferma, elimina definitivamente tutti i passaggi precedenti: il progetto conserva lo stato attuale, non quello visualizzato, e Annulla non ha più operazioni a cui tornare. I file salvati in seguito non conterranno la cronologia. Puoi usarlo per condividere un progetto senza il suo passato o per ricominciare la cronologia da zero. L’eliminazione non si può annullare; se vuoi esportare un file senza modificare il tuo progetto, scegli {{ui:export.historyNone}} durante l’esportazione.
