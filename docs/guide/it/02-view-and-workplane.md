---
title: Vista e piano di lavoro
summary: Muoversi nella scena, osservarla da una direzione precisa e posizionare nuove forme su qualsiasi superficie.
---

## Muoversi nella scena

Con il mouse:

| Cosa fai | Cosa succede |
| --- | --- |
| trascini con il tasto destro | ruoti la vista |
| fai clic con il tasto destro | su un corpo apre un menu con i comandi più usati: duplica, foro o solido, raggruppa, nascondi, blocca, elimina e altro; nello spazio vuoto mostra Incolla e Seleziona tutto |
| trascini con il tasto centrale | sposti la vista |
| rotellina del mouse | avvicina o allontana la vista |
| tieni premuto [[Ctrl]] e trascini con il tasto sinistro | sposti la vista anche così |
| doppio clic su un punto vuoto del piano di lavoro o accanto alla piastra | sposti la vista finché quel punto è al centro; poi la vista ruota attorno a esso |

La velocità dello zoom con la rotellina si imposta con {{ui:workspace.zoomSpeed}} nelle impostazioni, sotto {{ui:workspace.appearance}}: è un cursore da 1 a 14, impostato inizialmente su 5; sopra 10 aumenta la velocità solo della rotellina. Un singolo scatto della rotellina ingrandisce allo stesso modo in tutti i browser; con il trackpad lo zoom dipende da quanto fai scorrere le dita.

Su tablet o telefono, due dita ingrandiscono (allontanandole) o rimpiccioliscono (avvicinandole) la vista e la spostano (facendole scorrere insieme). Un dito nello spazio vuoto ruota la vista e un tocco lì deseleziona tutto; su una forma o una maniglia agisce sul progetto, proprio come il tasto sinistro del mouse. Per ruotare la vista anche iniziando il gesto sopra una forma, attiva {{ui:camera.touchRotate}} nella barra della telecamera. Questo interruttore è disponibile sui dispositivi con schermo tattile.

Una tavoletta grafica con penna funziona come un mouse: la punta corrisponde al tasto sinistro, il pulsante sul fusto della penna al tasto destro, utile per ruotare la vista e aprire il menu. Puoi configurare i tasti rapidi della tavoletta nel relativo driver per richiamare le [scorciatoie da tastiera](chapter:shortcuts) di layerling.

**Su un tablet, se puoi, usa uno stilo.** La sua punta è molto più precisa di un dito e non copre il punto che vuoi raggiungere: così puoi selezionare con precisione punti piccoli, linee sottili e maniglie di uno schizzo, oltre a punti di misura e spigoli, e lavorare più a lungo con meno fatica. layerling permette già al dito di raggiungere punti, linee, maniglie e spigoli un po’ più lontani rispetto al puntatore del mouse, ma lo stilo resta lo strumento più preciso. Vale per una penna riconosciuta dal tablet come tale, come S Pen o Apple Pencil. Uno stilo semplice con la punta in gomma viene invece considerato un dito dallo schermo e non è più preciso.

Su un tablet non c’è il tasto destro: tieni fermo per mezzo secondo un dito su una forma o nello spazio vuoto per aprire il menu che comparirebbe con un clic destro. Nello spazio vuoto trovi anche **Seleziona tutto**. Nel menu, **Selezione multipla** sostituisce il tasto Maiusc sui tablet: ogni tocco su un corpo lo aggiunge alla selezione o lo rimuove, finché non tocchi lo spazio vuoto o premi [[Esc]]; con un dito nello spazio vuoto puoi comunque ruotare la vista. Puoi afferrare con un dito le maniglie attorno a una forma selezionata anche toccandole leggermente di lato.

### Il cubo di visualizzazione

Il cubo in alto a sinistra indica da dove stai guardando. Facendo clic su una sua faccia passi alla vista dritta dall’alto, dal basso, dal davanti, dal retro, da sinistra o da destra. Facendo clic su un angolo del cubo osservi il modello in diagonale da quell’angolo; facendo clic vicino a uno spigolo lo osservi da quella direzione, a metà tra due facce. Il punto si illumina quando ci passi sopra con il puntatore. Anche i tasti numerici da [[1]] a [[6]] richiamano le viste dritte. Tieni premuto [[Shift]] insieme a uno di questi tasti per ingrandire la selezione, come con [[Shift]]+[[F]].

Trascina il cubo per ruotare la vista, proprio come trascinando con il tasto destro del mouse. Se non hai selezionato nulla, puoi ruotare la vista anche con i tasti freccia: ogni pressione ruota di 15°, oppure di 90° con [[Shift]]. La vista ruota nella direzione indicata: [[→]] sposta il fronte verso destra, [[↑]] inclina il fronte verso l’alto. Se c’è una selezione, le frecce spostano gli oggetti; fai prima clic nello spazio vuoto per ruotare la vista. Su uno schermo tattile funziona con un dito, senza attivare {{ui:camera.touchRotate}}.

### La barra della telecamera

Sul bordo sinistro trovi una barra sottile. Dall’alto:

- {{ui:camera.home}} mostra di nuovo l’intera scena. Il tasto corrispondente è [[Home]]; anche [[F]] lo fa quando non è selezionato nulla.
- {{ui:camera.focusSelection}} ingrandisce la selezione ([[F]] o [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} e {{ui:camera.zoomOut}} ingrandiscono o rimpiccioliscono a scatti, come i tasti [[+]] e [[−]].
- {{ui:camera.orthographic}} attiva una vista piatta, in cui gli spigoli paralleli restano paralleli. Per misurare e allineare gli spigoli è spesso più comoda della prospettiva. Premi [[O]] per alternare le due viste; un secondo clic torna alla vista precedente.
- {{ui:camera.hideWorkplane}} (l’occhio sopra una griglia) nasconde il piano con la griglia, così puoi guardare da sotto il lato inferiore del progetto. Cambia solo la vista: le nuove forme continuano a essere posizionate sul piano di lavoro. Fai di nuovo clic per mostrarlo.
- {{ui:camera.placeWorkplane}}, il metro a nastro e la squadra sono strumenti separati, descritti qui sotto e in [Misurazioni e annotazioni](chapter:measuring-and-notes).

La piccola freccia in cima alla barra la nasconde se è d’ingombro.

Quando riapri un progetto, la vista è come l’avevi lasciata: in questo browser vengono conservati angolazione, zoom e posizione, così puoi riprendere da dove ti eri fermato anche dopo aver premuto Home o chiuso la pagina. Anche il file salvato (.lyl) memorizza la vista, che ritroverai aprendolo altrove. La vista non fa parte della cronologia delle operazioni annullabili.

Puoi salvare anche quattro viste personalizzate in ogni progetto. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] o [[Shift]]+[[0]] salva la vista esattamente com’è — angolazione, posizione, zoom e modalità piatta o prospettica — associandola a quel tasto; premendo il tasto da solo ([[7]], [[8]], [[9]] o [[0]]) la richiami. Un messaggio in fondo conferma il salvataggio; salvando di nuovo sulla stessa combinazione, la vista precedente viene sostituita. Come la vista abituale, anche le viste salvate restano associate al progetto in questo browser e vengono incluse nel file .lyl salvato; non fanno parte della cronologia delle operazioni annullabili.

### Una seconda vista in una finestra separata

{{ui:camera.secondView}} apre una finestra che mostra lo stesso progetto attraverso una telecamera indipendente, così puoi osservarlo da due lati contemporaneamente: per esempio dal davanti mentre lavori dall’alto. Ogni modifica apportata nell’editor appare subito anche lì; il progetto si modifica solo nella finestra principale, dove restano anche le maniglie. Nella seconda finestra puoi ruotare la vista con il mouse o con il cubo di visualizzazione, proprio come qui, e puoi usare anche i tasti: da [[1]] a [[6]], [[F]], [[Home]], [[O]], [[+]] e [[−]], le frecce per ruotare e [[Ctrl]] insieme alle frecce per spostare la vista. Qui [[F]] ingrandisce la selezione nell’editor. Funzionano anche le quattro viste salvate del progetto: [[7]], [[8]], [[9]] e [[0]] le richiamano; premendo [[Shift]] insieme a uno di questi tasti, salvi la vista di quella finestra con quel numero, per entrambe le finestre. La sua barra della telecamera ha {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} e {{ui:camera.hideWorkplane}}: i comandi agiscono solo su quella finestra. La finestra si apre nella posizione e con le dimensioni che aveva l’ultima volta e si chiude insieme all’editor. Su telefoni e tablet il pulsante non è visibile.

## Guardare all’interno: vista in sezione

{{ui:camera.sectionView}}, l’ultimo pulsante della barra (lo strumento di taglio), apre una sezione lungo un piano, così puoi controllare pareti, cavità e parti che devono combaciare. Non viene tagliato nulla in modo permanente: il progetto, i suoi file e tutte le esportazioni rimangono integri. Dove il piano attraversa un solido, la superficie di taglio viene riempita con un colore leggermente più scuro di quello del corpo; un foro al suo interno resta vuoto, così puoi distinguere il pieno dal vuoto. La superficie riempita appare per un istante dopo che il piano ha smesso di muoversi. In {{ui:camera.sectionCutFace}} scegli come appare il taglio: {{ui:camera.sectionCutFaceHatch}}, l'impostazione iniziale, lo tratteggia come un disegno, e un corpo che sta dentro un altro è tratteggiato nell'altro verso, così i due si distinguono; {{ui:camera.sectionCutFaceFill}} lo riempie di un solo colore; {{ui:camera.sectionCutFaceOpen}} lo lascia aperto e vedi dentro il guscio del corpo. La scelta vale per ogni progetto.

- Scegli l’asse attraversato dal piano: X (larghezza), Y (profondità) o Z (altezza), come nei campi di posizione. Inizialmente il piano si trova al centro del progetto.
- {{ui:camera.sectionOrientation}} stabilisce a quali assi fare riferimento. {{ui:camera.sectionOrientationWorld}} usa gli assi del progetto; {{ui:camera.sectionOrientationWorkplane}} usa quelli del piano di lavoro: Z taglia parallelamente al piano, X e Y perpendicolarmente, e la posizione viene calcolata a partire dalla sua origine. Se il piano di lavoro è appoggiato a una faccia inclinata, il taglio è parallelo a quella faccia e si sposta insieme al piano di lavoro. {{ui:camera.sectionOrientationView}} orienta il piano verso lo schermo: il taglio rimuove ciò che si trova davanti e il cursore lo fa avanzare nel progetto lungo la linea di vista, per esempio per raggiungere e selezionare una parte nascosta. Dopo aver ruotato la vista, fai di nuovo clic sull’opzione perché il taglio segua la nuova direzione.
- {{ui:camera.sectionCoarse}} sposta il piano lungo tutto il progetto; {{ui:camera.sectionFine}} lo sposta di poco in entrambe le direzioni, a decimi di millimetro. Puoi anche digitare la posizione.
- Il pulsante accanto agli assi mostra l’altro lato del taglio; {{ui:camera.sectionReset}} riporta il piano al centro e {{ui:camera.sectionShowPlane}} nasconde il piano blu.
- Puoi fare clic e selezionare ciò che la sezione porta allo scoperto, comprese le pareti interne.
- {{ui:camera.sectionWorkplane}} posiziona il piano di lavoro sulla sezione. Il piano di lavoro coincide con il piano di taglio e guarda verso l’esterno del corpo conservato, come la faccia lasciata dal taglio. Se poi passi allo schizzo, questo inizia esattamente lì; il contorno tenue mostra la sezione, così puoi disegnarci sopra e agganciarvi gli elementi. Per esempio, puoi disegnare un coperchio che si adatti alla cavità aperta con la sezione. Il pulsante accanto agli assi sceglie quale lato conservare e quindi in quale direzione sarà rivolto il piano di lavoro. Per riportare quest’ultimo sulla piastra di base, usa il comando abituale.
- {{ui:camera.sectionSketch}} avvia un nuovo schizzo direttamente sulla sezione, con i contorni della sezione già presenti come linee: un foro arriva come un vero cerchio, un angolo arrotondato come un arco. Modificali, elimina ciò che non serve, continua a disegnare e completa: il corpo cresce dalla sezione verso il lato tagliato via, così un pezzo che deve combaciare con un altro, come un coperchio, un inserto o una guarnizione, parte proprio dal contorno di quel pezzo. Il pulsante accanto agli assi sceglie quel lato. Come per l'SVG, contano solo i corpi visibili e i fori sono già sottratti.
- {{ui:camera.sectionMeasure}} misura direttamente sulla sezione: il contorno appare blu e con due clic ottieni la distanza e le sue componenti lungo i due assi del piano. Entrambi i punti si agganciano al contorno, dando la precedenza agli angoli. Se il secondo clic cade in un punto qualsiasi della parete opposta, viene agganciato perpendicolarmente al primo: puoi così leggere lo spessore della parete, le distanze e i giochi senza dover mirare con precisione. Un terzo clic avvia la misura successiva; [[Esc]] termina la misurazione. Se sposti il piano, la misura viene cancellata. Su un contorno circolare, come una sezione di cilindro o di foro, una piccola croce indica il centro, a cui puoi agganciarti. Fai clic su un punto del cerchio e poi avvicinati al punto opposto: il secondo clic si posiziona esattamente dall’altra parte del centro e il valore mostra Ø, cioè il diametro. Dal centro a un punto del cerchio ottieni invece R, il raggio.
- {{ui:camera.sectionExportSvg}} salva i contorni sul piano di taglio in formato SVG in scala 1:1, per un laser, un plotter, una dima o una guarnizione. Una sezione lungo X viene vista da destra, lungo Y dal davanti e lungo Z dall’alto. Come nell’esportazione, vengono inclusi solo i corpi visibili, i fori sono già sottratti e i corpi dello stesso colore vengono uniti in un unico contorno. Ogni colore resta su un tracciato separato senza riempimento, così il software del laser li mantiene distinti come livelli.

Il pannello resta ancorato al pulsante che lo apre. Se copre qualcosa, trascinalo dalla barra del titolo in un punto qualsiasi del piano di lavoro; la prossima volta si aprirà lì. Fai doppio clic sulla barra del titolo o riportalo sul pulsante per rimetterlo al suo posto.

I tasti X e [[Esc]] chiudono il pannello; se è in corso una misurazione, [[Esc]] la termina per prima. Il taglio resta attivo finché non lo disattivi con {{ui:camera.sectionActive}} o non torni alla vista generale del progetto. Quando è attivo, il relativo pulsante resta evidenziato. Gli elementi posizionati sul lato tagliato si vedono solo dopo aver disattivato il taglio. Su un tablet non c’è [[Esc]], quindi il pannello mostra due pulsanti aggiuntivi: {{ui:camera.sectionBack}} termina la misurazione in corso oppure, se non ce n’è una, chiude il pannello; {{ui:camera.sectionConfirm}} chiude il pannello in un solo passaggio. Su computer questi pulsanti non compaiono.

## Il piano di lavoro

Le nuove forme si allineano al piano di lavoro. Inizialmente è la piastra di base con la griglia, ma puoi posizionarlo su qualsiasi superficie per aggiungere elementi su un lato o su una faccia inclinata.

1. Premi [[W]] oppure fai clic su {{ui:camera.placeWorkplane}}.
2. Sposta il mouse sopra una faccia di un corpo. La faccia si illumina.
3. Fai clic per posizionare lì il piano di lavoro. Da quel momento, tutto ciò che aggiungi si appoggia a quella faccia.

Fai invece clic sulla piastra vuota e il piano di lavoro si dispone in orizzontale nel punto che hai selezionato, agganciandosi alla griglia. Le nuove forme e gli schizzi completati, compresi quelli ottenuti con una rotazione, compariranno in quel punto invece che al centro della piastra. Quando il piano di lavoro è orizzontale sulla piastra, questa mostra soltanto il proprio contorno: due griglie sullo stesso piano produrrebbero uno sfarfallio.

Su una faccia, di norma l’origine del piano di lavoro si aggancia alla griglia. Fai clic vicino a un angolo della faccia per posizionarla esattamente lì; vicino a uno spigolo, il piano si dispone sullo spigolo e la griglia si allinea a esso. In questo modo puoi scegliere intenzionalmente l’angolazione della griglia. Se non c’è un angolo o uno spigolo vicino, la griglia sul piano appoggiato alla faccia resta parallela al corpo: se la scatola è ruotata, anche la griglia ruota con essa.

Fai clic accanto alla piastra o premi [[Esc]] per riportare il piano di lavoro sulla piastra di base. Ancora più rapido è {{ui:camera.resetWorkplane}}: il pulsante con la freccia verso il basso si trova nella barra della telecamera, sotto l’occhio, quando il piano di lavoro è appoggiato a una faccia. [[Shift]]+[[W]] lo posiziona direttamente sulla faccia selezionata. [[Alt]]+[[W]] lo riporta sulla piastra di base in qualsiasi momento, che ci sia una selezione o no. Se tieni premuto [[Shift]] mentre fai clic, il piano è rivolto nella direzione opposta.

Quando il piano di lavoro è posizionato su una faccia, accanto a {{ui:camera.placeWorkplane}} appare un occhio. Puoi nascondere il piano di lavoro senza rimuoverlo, per osservare meglio il progetto: le nuove forme continueranno a essere posizionate su quella faccia e la rotazione continuerà a farle ruotare attorno a essa. Fai clic sull’occhio per mostrarlo di nuovo; anche impostare un nuovo piano di lavoro lo rende visibile.

## Griglia e aggancio

La griglia mostra le dimensioni della piastra. In basso a destra trovi il **passo di aggancio**: spostamento e ridimensionamento procedono a scatti della misura impostata, per esempio 1 mm. Riducila per lavorare con precisione e aumentala per disporre gli elementi in modo approssimativo. {{ui:editor.tool.snapToGrid}} nella barra multifunzione sposta le forme selezionate sull’incrocio della griglia più vicino. Durante lo spostamento, le forme possono anche agganciarsi ad altre forme; vedi [Selezionare e disporre](chapter:select-and-arrange).

> **Suggerimento:** interrompi la rotazione della vista quando devi far combaciare con precisione alcuni elementi. Premi i tasti numerici per passare alla vista dritta dall’alto o dal davanti e premi [[O]] per attivare la vista piatta. Vedrai subito se due spigoli sono davvero allineati.

### La finestra delle impostazioni

L’ingranaggio nella barra multifunzione ({{ui:editor.workspaceSettings}}) apre le impostazioni. A sinistra trovi cinque sezioni: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} e {{ui:workspace.history}}. Ogni modifica viene applicata subito. {{ui:workspace.makeDefault}} in fondo salva le impostazioni correnti come predefinite, così i nuovi progetti iniziano con quelle; {{ui:workspace.close}} in alto a destra chiude la finestra. Di seguito sono descritte le opzioni una per una.

### Aspetto: tema, barra degli strumenti e cubo di visualizzazione

{{ui:workspace.theme}} imposta la combinazione di colori dell’intero programma: {{ui:workspace.themeSystem}} segue le impostazioni del computer; le altre opzioni sono {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} e {{ui:workspace.themeGraphite}}. Puoi cambiare tema anche in alto a destra nell’editor.

{{ui:workspace.toolbarSize}} ridimensiona i pulsanti della barra multifunzione in alto, il relativo menu delle forme, i controlli della telecamera a sinistra e il pannello delle proprietà a destra: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (la dimensione abituale) o {{ui:workspace.toolbarSizeLarge}}. La dimensione piccola lascia più spazio al piano di lavoro sul portatile; quella grande è più facile da premere su uno schermo ampio o con un dito. Se la finestra è troppo stretta per i pulsanti grandi, i gruppi della barra multifunzione passano a una seconda riga. La dimensione viene memorizzata in questo browser ed è la stessa per tutti i progetti.

{{ui:workspace.shapeColors}} mostra nelle anteprime della libreria delle forme il colore iniziale di ogni nuova forma (quello predefinito per il suo tipo oppure quello salvato con {{ui:inspector.saveDefaults}}). Disattivalo se preferisci anteprime grigie; il browser ricorda la scelta.

{{ui:workspace.viewCubePosition}} sposta il cubo di visualizzazione in un altro angolo del piano di lavoro: {{ui:workspace.viewCubePositionTopLeft}} (la posizione abituale), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} o {{ui:workspace.viewCubePositionBottomRight}}. Se lo sposti in un angolo diverso da quello in alto a sinistra, i controlli della telecamera occupano lo spazio lasciato libero. In basso a destra, il cubo si trova appena sopra il controllo {{ui:inspector.snapGrid}}. Quando a destra è aperto il pannello delle proprietà di una forma, il cubo sul lato destro si sposta alla sua sinistra. La posizione viene memorizzata in questo browser ed è la stessa per tutti i progetti. Nelle finestre strette, per esempio su un telefono, l’impostazione è nascosta e il cubo resta in alto a sinistra.

### Aspetto: modalità veloce

{{ui:workspace.fastMode}} è pensata per i computer più lenti. Disattiva le ombre, i contorni di tutti i corpi e l’inerzia della telecamera, e disegna la vista soltanto alla risoluzione dello schermo. Le tue impostazioni vengono conservate; mentre la modalità è attiva, gli interruttori che la modalità veloce disabilita mostrano {{ui:workspace.offInFastMode}}. Per altri suggerimenti sui computer lenti, vedi “Quando layerling è lento” qui sotto.

### Aspetto: colori dell’area di lavoro e dello schizzo

I colori dell’area di lavoro si impostano in {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} e {{ui:workspace.surfaceColor}} per il tema chiaro (i temi scuri mantengono i propri colori), oltre al colore della griglia nella sezione {{ui:workspace.workplane}}. Ogni colore è un pulsante che mostra il colore corrente. Facendo clic si apre una piccola finestra con il campo del colore, una fila di colori predefiniti, un campo per il valore esadecimale e una freccia per ripristinare il colore iniziale di layerling. [[Enter]] conferma il valore esadecimale digitato; lo conferma anche un clic fuori dalla finestra.

La vista dello schizzo ha colori propri: {{ui:workspace.sketchBackground}} per la finestra intorno al foglio, {{ui:workspace.sketchPlateColor}} per il foglio sotto la griglia e {{ui:workspace.sketchGridColor}} per la griglia, tutti riferiti al tema chiaro. {{ui:workspace.sketchMatch}} applica in un solo clic i tre colori dell’area di lavoro.

{{ui:workspace.classicLook}} configura l’area di lavoro come in Tinkercad: fondo bianco, griglia millimetrica azzurra con una linea più scura ogni centimetro, contorni neri e luce dall’alto con ombre morbide. In seguito puoi modificare comunque ogni valore separatamente. Inizialmente tutte le impostazioni mantengono l’aspetto abituale di layerling; la scelta più adatta dipende dal monitor.

![Le impostazioni di Aspetto: colori dello sfondo e del piano di lavoro nel tema chiaro, e interruttore per i contorni su tutti i corpi.](shot:settings-appearance)

![L’editor con una combinazione di colori scura. Puoi scegliere il tema in alto a destra: Sistema, Chiaro, Scuro o Grafite.](shot:editor-dark)

### Aspetto: frecce degli assi e contorni

{{ui:workspace.showAxes}}, attivo per impostazione predefinita, disegna tre frecce nell’angolo posteriore sinistro della piastra: **X** in rosso verso destra, **Y** in verde verso il fondo e **Z** in blu verso l’alto, secondo il sistema usato dai campi di posizione. È la regola della mano destra, adottata anche da Tinkercad, dai programmi CAD e dagli slicer. Se il piano di lavoro è appoggiato a una faccia, gli assi lo seguono. Se sono d’intralcio, puoi disattivarli qui.

{{ui:workspace.edgeLines}} disegna il contorno di ogni corpo nel colore indicato da {{ui:workspace.edgeColor}} (inizialmente nero, come in Tinkercad), utile quando i colori scuri si confondono tra loro. L’opzione è disattivata per impostazione predefinita e non viene applicata alle mesh importate molto grandi.

![Tre corpi scuri con i contorni attivati: le linee li tengono distinti.](shot:edge-lines)

{{ui:workspace.strongHoles}} disegna i fori in grigio più scuro, meno trasparente e con un contorno scuro. È utile quando è difficile distinguere un foro tra corpi trasparenti. A differenza dei contorni, questa opzione resta attiva in modalità veloce.

### Aspetto: luce e ombre

{{ui:workspace.showShadows}} attiva o disattiva le ombre proiettate. Due cursori regolano l’illuminazione dei corpi. {{ui:workspace.shadowStrength}} determina quanto sono scure le ombre; {{ui:workspace.shadeContrast}} sposta l’equilibrio tra la luce ambientale uniforme e la luce principale: verso “deciso”, le facce in ombra diventano più scure e le ombre più evidenti; verso “morbido”, l’illuminazione è più uniforme. Al valore massimo il contrasto è molto forte e le facce in ombra, come le ombre, diventano davvero scure. {{ui:workspace.shadowSoftness}} rende morbidi i bordi delle ombre invece di lasciarli netti. {{ui:workspace.lightAzimuth}} ruota la luce principale intorno alla piastra (0° dal davanti, 90° da destra); {{ui:workspace.lightElevation}} ne modifica l’altezza: a 90° la luce si trova direttamente sopra la piastra, come in Tinkercad, e le ombre cadono sotto i corpi. {{ui:workspace.lightReset}} ripristina tutti i valori.

### Aspetto: misure sul piano di lavoro

{{ui:workspace.showMoveDimensions}} mostra di quanto ti sposti mentre trascini; {{ui:workspace.showOriginDimensions}} mostra la distanza della selezione dall’origine della piastra, anche quando selezioni più corpi. Con {{ui:workspace.dimensionsAlwaysVisible}} queste misure restano sempre visibili, non soltanto durante il trascinamento. Quando selezioni un corpo ruotato, gli angoli vengono mostrati sotto di esso sul piano di lavoro; {{ui:workspace.showRotationAngles}} disattiva questa visualizzazione. Altre informazioni in [Misurazioni e annotazioni](chapter:measuring-and-notes).

### Aspetto: selezione e spostamento

Con {{ui:workspace.selectBeforeMoving}} devi prima selezionare un corpo e solo un trascinamento successivo lo sposta. È utile quando a usare il dispositivo sono bambini o persone che potrebbero toccare i corpi per sbaglio, e sugli schermi tattili.

Con {{ui:workspace.frameByDirection}}, trascinando un riquadro verso destra selezioni solo gli oggetti che vi rientrano completamente; trascinandolo verso sinistra selezioni tutto ciò che tocca, come indicato dal contorno tratteggiato. Funziona come in SketchUp.

{{ui:workspace.doubleClickOpensSketch}} decide se un doppio clic su uno schizzo estruso lo riapre per modificarlo, come in Tinkercad; {{ui:workspace.doubleClickOpensGroup}} decide se un doppio clic su un gruppo o un insieme lo apre per la modifica. {{ui:workspace.doubleClickCentersView}} decide se un doppio clic su un punto vuoto del piano di lavoro sposta lì la vista.

{{ui:workspace.objectSnap}} permette agli spigoli e al centro di una forma di agganciarsi ad altre forme durante il trascinamento; lo stesso interruttore si trova nel menu della griglia in basso a destra. {{ui:workspace.cruise}} fa sì che una nuova forma segua il puntatore e si appoggi alla faccia sottostante, come la funzione Cruise di Tinkercad; se è disattivato, la nuova forma compare al centro della piastra. Altre informazioni in [Selezionare e disporre](chapter:select-and-arrange).

### Aspetto: vista

Con {{ui:workspace.startInPerspective}} l’editor si apre nella vista prospettica invece che in quella piatta.

{{ui:workspace.zoomSpeed}} è un cursore da lento a veloce e regola la velocità dello zoom con rotellina e trackpad; i pulsanti e i tasti dello zoom mantengono i propri piccoli incrementi. Con {{ui:workspace.cameraInertia}}, dopo che rilasci il mouse la vista continua a ruotare per un momento e poi rallenta gradualmente. Se disattivi l’opzione, si ferma subito, come in Tinkercad e Fusion 360.

{{ui:workspace.overhangAngle}} imposta l’angolo oltre il quale una faccia viene considerata uno sbalzo quando attivi Mostra sbalzi nel menu della visibilità: quelle facce sono tratteggiate in rosso e bianco. 30° è un’impostazione prudente; 70° presuppone un buon raffreddamento della stampa. Il valore iniziale consigliato è 45°.

{{ui:workspace.booleanTriangleLimit}} limita il numero di triangoli che può avere una mesh importata quando la tagli, la unisci o ne calcoli l’intersezione, perché queste operazioni vengono elaborate nel browser. Le mesh che superano il limite non vengono elaborate: semplifica prima la mesh oppure aumenta il limite se il computer è abbastanza potente. Un limite più alto può bloccare l’editor per alcuni secondi.

### Misurazione: unità, scala e passi di aggancio

In {{ui:workspace.measurement}} scegli {{ui:workspace.units}}, l’unità in cui visualizzare le misure ({{ui:workspace.scale}}: millimetri, centimetri o metri nel sistema metrico; pollici o piedi nel sistema imperiale), il numero di cifre decimali ({{ui:workspace.accuracy}}), il {{ui:workspace.snapGrid}} a cui si agganciano spostamento e ridimensionamento e i tuoi passi personalizzati in {{ui:workspace.customSnapGrids}}.

Nelle impostazioni, sotto {{ui:workspace.measurement}}, scegli {{ui:workspace.units}}. Con {{ui:units.imperial}}, layerling mostra tutte le misure in pollici: sulla forma, nel pannello delle proprietà, nel metro a nastro e nel righello. La griglia di aggancio offre passi da 1/64 a 1 pollice; la griglia sulla piastra è disegnata in pollici, da 1/8 a 1 pollice (1/4 di pollice per impostazione predefinita), con una linea più marcata ogni pollice. In {{ui:workspace.inchFormat}} scegli se visualizzare i pollici come frazioni, come in Tinkercad (1 5/8, arrotondato a 1/64 di pollice), oppure come numeri decimali (1,625), con il numero di cifre decimali impostato in {{ui:workspace.accuracy}}. Puoi digitare entrambe le forme, compreso “1 5/8”. Per passare rapidamente da millimetri a pollici e viceversa, usa il piccolo interruttore **mm | in** accanto a {{ui:inspector.snapGrid}}, in fondo al pannello delle proprietà: per il progetto corrente cambia l’unità, la griglia della piastra e il passo di aggancio, proprio come le impostazioni.

Nella stessa sezione, in {{ui:workspace.customSnapGrids}}, puoi aggiungere passi di aggancio personalizzati: indica un nome e una misura in millimetri. Per esempio, puoi creare “Passo pin 2,54 mm” per la distanza tra i piedini dei chip DIP, delle strip e dei fori delle basette millefori, oppure “Unità tasto MX” con una distanza di 19,05 mm per la spaziatura dei tasti di una tastiera. Il menu del passo di aggancio offrirà allora quella misura intera, dimezzata e divisa per quattro (1×, ½× e ¼×), così potrai spostare le forme di un passo, mezzo passo o un quarto di passo. Se vuoi usare soltanto la misura intera, deseleziona {{ui:workspace.customSnapGridParts}} accanto al nome: il menu mostrerà solo quel passo. I passi personalizzati vengono salvati con il progetto e inclusi in {{ui:workspace.makeDefault}}.

### Piano di lavoro: piastra e stampante

{{ui:workspace.printer}} adatta le dimensioni del piano di lavoro al piatto di stampa della tua stampante e segnala i corpi che lo oltrepassano; vedi [Stampa](chapter:printing). {{ui:workspace.showPlateLabels}} mostra sulla piastra il nome del progetto e, se hai scelto una stampante, il nome della stampante e il volume di stampa.

{{ui:workspace.size}} permette di impostare dimensioni personalizzate per la piastra, con {{ui:workspace.width}} e {{ui:workspace.length}} in millimetri o nell’unità scelta. La griglia passa sempre per l’origine, quindi le linee più marcate restano sugli assi qualunque siano le dimensioni della piastra.

### Piano di lavoro: griglia

{{ui:workspace.showGrid}} mostra o nasconde la griglia sulla piastra. {{ui:workspace.gridBlockSize}} imposta la distanza tra le linee; {{ui:workspace.gridMajorEvery}} stabilisce se la linea più scura compare ogni 5 o ogni 10 passi. {{ui:workspace.gridMajorColor}} assegna un colore specifico a quella linea, usato anche per la croce centrale e il bordo della piastra. {{ui:workspace.gridColor}} imposta il colore delle linee normali.

Ogni linea della griglia si allarga man mano che ingrandisci la vista, come in Tinkercad, e resta visibile quando la rimpicciolisci. Se preferisci, disattiva {{ui:workspace.gridLinesGrow}}: le linee rimarranno larghe un pixel a qualsiasi zoom, come nello schizzo.

Se la griglia è scomparsa, per esempio perché le è stato assegnato lo stesso colore della piastra, {{ui:workspace.resetGrid}} in fondo alla sezione {{ui:workspace.workplane}} ripristina visibilità, colori, spaziatura e spessore delle linee, sia nel progetto corrente sia nelle impostazioni predefinite salvate con {{ui:workspace.makeDefault}}.

### Impostazioni predefinite delle forme

In {{ui:workspace.shapeDefaults}} scegli una forma con {{ui:workspace.shape}} e imposta le dimensioni iniziali con cui verrà aggiunta: larghezza, lunghezza e altezza. {{ui:workspace.useAppDefaults}} ripristina i valori iniziali dell’applicazione. Le forme con opzioni specifiche le mostrano sotto {{ui:workspace.shapeDetails}}. I valori si applicano alle nuove forme, non a quelle già presenti sulla piastra. {{ui:workspace.customLimit}} imposta un limite massimo personalizzato per le dimensioni raggiungibili con le maniglie e dal pannello delle proprietà; se il campo è vuoto, restano in vigore i limiti abituali.

### Cronologia salvata

In {{ui:workspace.history}}, il cursore {{ui:workspace.savedHistory}} imposta quante operazioni completate restano disponibili per Annulla dopo aver salvato o riaperto un progetto. Il valore predefinito è di 100 operazioni per progetto. Un limite più basso elimina definitivamente i passaggi di annullamento più vecchi.

## Quando layerling è lento

layerling calcola e disegna tutto nel browser. Per questo, su un computer datato, con una scheda grafica poco potente o con più schermi di grandi dimensioni, la vista può risultare lenta. Ecco cosa puoi fare:

- **{{ui:workspace.fastMode}}** in {{ui:workspace.appearance}} disattiva subito gli elementi che appesantiscono maggiormente la vista: ombre, contorni su tutti i corpi e inerzia della telecamera. Inoltre, riduce la risoluzione della vista a quella effettiva dello schermo; sugli schermi ad alta risoluzione questo può significare fino a quattro volte meno pixel. Le tue impostazioni vengono conservate e tornano attive appena disattivi questa modalità.
- **La telecamera continua a ruotare:** quando rilasci il mouse dopo aver ruotato la vista, questa continua a girare per un momento e poi rallenta gradualmente. È un comportamento intenzionale, non uno scatto. Se sei abituato a Tinkercad o Fusion 360, disattiva {{ui:workspace.cameraInertia}} in {{ui:workspace.appearance}}: la vista si fermerà subito.
- **Interruttori singoli:** senza attivare la modalità veloce puoi disattivare soltanto {{ui:workspace.showShadows}} o {{ui:workspace.edgeLines}}.
- **Usa la scheda grafica:** in Chrome apri `chrome://gpu` (in Edge `edge://gpu`). Accanto a “WebGL” dovrebbe comparire “Accelerazione hardware”. Se invece leggi “Solo software”, l’accelerazione hardware è disattivata nelle impostazioni del browser. In Windows puoi anche scegliere “Prestazioni elevate” per il browser in Impostazioni → Sistema → Schermo → Grafica, così userà la scheda grafica dedicata e non quella meno potente integrata nel processore.
- **Semplifica le mesh importate molto grandi:** un modello con centinaia di migliaia di triangoli rallenta qualsiasi vista. La procedura per alleggerirlo è descritta nel capitolo sui file, alla sezione “Semplificare una mesh importata”.
- **Chiudi le altre schede:** tutte le schede di layerling aperte e le altre pagine 3D condividono la stessa scheda grafica.
