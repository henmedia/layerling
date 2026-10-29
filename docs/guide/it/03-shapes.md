---
title: Inserire e modificare le forme
summary: La libreria delle forme, le dimensioni impostate con valori numerici o maniglie, il colore, la rotazione, la rastremazione e la torsione.
---

In layerling ogni progetto parte da una forma. Da queste puoi costruire tutto il resto: le forme si completano a vicenda, si sottraggono materiale oppure si uniscono per crearne una nuova.

## Aggiungere una forma

Fai clic su {{ui:editor.addShape}} nella barra multifunzione. Si apre la libreria delle forme.

![La libreria delle forme. Ogni anteprima è generata usando la geometria reale della forma.](shot:shape-menu)

La libreria si chiude dopo aver scelto una forma. Puoi spostarla trascinando la barra del titolo, per esempio sopra il pannello delle proprietà, in un punto che non copra quello che vuoi raggiungere. Un doppio clic sulla barra la riporta sotto il pulsante; il browser ricorda dove l’avevi lasciata. Il fermaglio sulla barra del titolo mantiene aperta la libreria mentre inserisci più forme una dopo l’altra. Puoi ridimensionarla trascinandone i bordi o gli angoli, fino ai limiti dello schermo; anche le dimensioni vengono ricordate dal browser. Un doppio clic su un bordo ripristina la dimensione iniziale. Se la restringi, la libreria nasconde i nomi e mostra solo le anteprime; il nome appare quando passi il puntatore su una forma.

Scegli una forma. Ora segue il puntatore del mouse e viene posizionata dove fai clic. Passa sopra un corpo e si appoggia alla faccia sottostante, anche se inclinata, come con Cruise in Tinkercad; sopra la piastra vuota si appoggia al piano di lavoro. [[Esc]] annulla il posizionamento. Gli strumenti che aspettano un clic, come il metro a nastro, la squadra, una nota, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} o gli strumenti per gli spigoli, si disattivano quando scegli una forma, così il clic la posiziona. Al contrario, attivando uno di quegli strumenti la forma viene posizionata. Se preferisci che le forme appaiano al centro della piastra, puoi disattivare il posizionamento con un clic nelle impostazioni, nella sezione {{ui:workspace.appearance}}, usando l’interruttore {{ui:workspace.cruise}}.

Su una faccia la forma si aggancia al centro della faccia quando il puntatore si avvicina, come a uno spigolo o a un bordo; tieni premuto [[Alt]] per posarla ovunque. Trascinata dalla libreria su una faccia, finisce sempre al centro, oppure con [[Alt]] dove la rilasci.

La libreria contiene:

- **Forme di base:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (da tre a ventiquattro lati), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (da tre a ventiquattro lati, anche triangolare), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} e {{ui:shape.torus}}.
- **Tubi:** {{ui:shape.tube}} e {{ui:shape.bentTube}}, composti da un massimo di dodici tratti rettilinei con curve intermedie, e {{ui:shape.loft}}, che passa da un profilo a un altro, per esempio da quadrato a rotondo.
- **Forme decorative:** {{ui:shape.star}}, {{ui:shape.heart}} e {{ui:shape.crescent}}.
- **Testo:** {{ui:shape.text}}, anche disposto lungo un arco circolare. Altre informazioni in [Testo](chapter:text).
- **Meccanica:** {{ui:shape.thread}} (asta filettata, vite, dado e foro filettato), {{ui:shape.spring}}, contenitori e piastre {{ui:shape.gridfinity}}, {{ui:shape.gear}} e {{ui:shape.knurl}} per le impugnature. Altre informazioni in [Filettature e meccanica](chapter:threads-and-mechanics).
- **Per le costruzioni:** la cerniera stampabile già assemblata {{ui:shape.hinge}}, {{ui:shape.dovetail}}, {{ui:shape.teardrop}} per fori orizzontali, {{ui:shape.counterbore}} e {{ui:shape.countersink}} per le teste delle viti e {{ui:shape.ruler}}, che è solo uno strumento di misura e non compare mai nelle esportazioni.

Puoi ottenere un triangolo in due modi: {{ui:shape.polygon}} con tre lati crea un triangolo isoscele, il “Tetto” di Tinkercad; {{ui:shape.wedge}} crea invece un triangolo rettangolo. Entrambi sono veri prismi triangolari. Per creare un foro triangolare, duplica la forma, rimpicciolisci la copia, impostala come foro e allineala con {{ui:editor.tool.centerOnWorkplane}} o {{ui:editor.tool.align}}. Entrambi i comandi usano il riquadro d’ingombro della forma, cioè il più piccolo parallelepipedo che la contiene; perciò anche un quadrato tagliato a metà viene considerato un quadrato intero. La ricerca dei comandi ([[Ctrl]]+[[K]]) trova entrambe le forme anche cercando “triangolo” o “tetto”.

{{ui:shape.slot}} può essere più stretta a un’estremità che all’altra, per esempio per creare una protezione sopra la cinghia tra due pulegge. In {{ui:inspector.properties}} imposta {{ui:prop.slotSmallEnd}}: l’estremità più larga ha la stessa larghezza della capsula e i lati sono rettilinei da un arco all’altro. {{ui:prop.slotCentreDistance}} è la distanza tra i centri dei due archi, cioè la distanza tra le pulegge. Modificando l’estremità più stretta, la distanza tra i centri rimane invariata e la capsula si allunga o si accorcia. Anche la capsula rastremata resta un corpo geometrico esatto, compatibile con raccordi e file STEP.

## Le impostazioni della forma

Quando selezioni una forma, le sue impostazioni appaiono a destra. In alto c’è il nome; la matita accanto ({{ui:outliner.rename}}) permette di modificarlo. [[Enter]] conferma il nuovo nome, [[Esc]] annulla e, se il campo è vuoto, viene ripristinato il nome predefinito della forma. Più a destra, il lucchetto impedisce spostamenti accidentali e l’occhio nasconde la forma. La freccia all’estrema sinistra comprime le impostazioni lasciando visibile solo la barra del titolo. Puoi aprire e chiudere i riquadri sottostanti facendo clic sui titoli ({{ui:inspector.properties}}, {{ui:inspector.position}}, {{ui:inspector.rotation}}, {{ui:inspector.taper}}, {{ui:inspector.twist}} e i riquadri delle forme speciali). layerling ricorda quali hai lasciato aperti, per le forme successive e per la prossima visita.

Le impostazioni sono ancorate al bordo destro. Se coprono qualcosa, trascinale dalla barra del titolo: diventeranno un pannello flottante e resteranno dove le hai lasciate anche per la forma successiva. Riportale in alto a destra oppure fai doppio clic sulla barra del titolo per riancorarle. Quando il pannello è flottante o compresso, il passo di aggancio si sposta dal fondo delle impostazioni all’angolo inferiore destro del piano di lavoro.

![Le impostazioni di un cilindro: solido o foro, diametro e altezza impostabili con un numero o un cursore.](shot:editor-overview)

- **{{ui:inspector.solid}} o {{ui:inspector.hole}}:** un solido viene mantenuto, un foro sottrae materiale. Facendo clic su {{ui:inspector.solid}} si apre la scelta dei colori; i colori personalizzati creati lì vengono poi raccolti in {{ui:inspector.recentColors}}, gli ultimi otto. Altre informazioni in [Solidi e fori](chapter:solids-and-holes). Il fermaglio nella riga {{ui:inspector.keptColors}} conserva il colore scelto: resta in una riga separata, senza essere rimosso dai colori più recenti. Facendo di nuovo clic sul fermaglio lo rimuovi dall’elenco. In questo browser puoi conservarne fino a 21.
- **{{ui:inspector.transparent}}:** rende il corpo trasparente, per esempio per vedere una forma che si trova dietro.
- **{{ui:inspector.multicolor}}:** disponibile solo per un gruppo; si attiva o disattiva anche con [[Shift]]+[[M]]. Quando è attivo, ogni parte del gruppo mantiene il proprio colore, anche se il gruppo è stato tagliato con fori fino a formare un solo corpo (le pareti create dal foro assumono il colore del corpo tagliato). Scegliendo un colore per il gruppo, questa modalità si disattiva e l’intero gruppo assume quel colore. Gli insiemi mantengono sempre i colori delle proprie parti. Nell’esportazione 3MF ogni parte conserva il proprio colore, così lo slicer può associarla a un filamento; OBJ registra i colori sui vertici, quindi il confine tra due colori risulta un po’ più irregolare.
- **{{ui:inspector.properties}}:** dimensioni e altre proprietà della forma. Per un cilindro, diametro, altezza e numero di lati; per un tubo o un anello circolare, {{ui:prop.outerDiameter}}, {{ui:prop.innerDiameter}} (utile per una boccola su un albero di dimensioni note) e spessore della parete: specificandone due qualsiasi, il programma calcola la terza, in qualsiasi ordine. Il diametro esterno mantiene il foro e modifica la parete; quello interno mantiene il diametro esterno e modifica la parete. Se il foro è più largo del tubo, il diametro esterno aumenta per mantenere lo spessore della parete. La lunghezza del tubo corrisponde alla sua altezza. Se deformi un tubo non circolare trascinando un lato, i campi Larghezza e Lunghezza sostituiscono il solo diametro esterno; in questo caso, modificando la larghezza lo spessore della parete resta invariato. Per un ingranaggio puoi impostare i denti, per una molla le spire. Quando modifichi un valore rispetto a quello predefinito, accanto al nome appare una piccola freccia: facendo clic ripristini solo quel valore, indipendentemente dalle altre modifiche fatte nel frattempo; diversamente da Annulla, non annulla altre operazioni. Un doppio clic su un cursore produce lo stesso effetto, qui e nei cursori delle impostazioni dell’area di lavoro. Trascinando con il mouse il cursore di una lunghezza, il valore si aggancia al passo di aggancio, così l’altezza viene espressa in millimetri interi (tranne quando la griglia è disattivata e sui cursori più corti); digitando un valore o usando i tasti freccia sul cursore, invece, la misura resta precisa. {{ui:inspector.saveDefaults}} in fondo imposta i valori correnti come predefiniti per quel tipo di forma, come {{ui:workspace.shapeDefaults}} nelle impostazioni; {{ui:inspector.resetDefaults}} ripristina quelli iniziali dell’applicazione. Con {{ui:prop.tubeBoreHole}} il foro conta come vuoto quando il tubo viene raggruppato: taglia allora anche la parete di ciò con cui è raggruppato, così due tubi in un raccordo a T si aprono l'uno nell'altro.
- **{{ui:inspector.makeEllipse}}:** disponibile solo per i cilindri. Un cilindro è sempre rotondo: ha un solo diametro e ogni maniglia modifica entrambi i lati insieme. Per ottenere un ovale, fai clic qui: il corpo diventa un’{{ui:shape.ellipse}}, la cui lunghezza e larghezza possono essere regolate separatamente. Non è possibile convertire in questo modo un cilindro con smusso, raccordo o parete, né uno ruotato o raggruppato; per questi casi scegli {{ui:shape.ellipse}} fin dall’inizio.
- **{{ui:inspector.taper}}:** imposta dimensioni diverse in alto e in basso, per esempio per creare una superficie inclinata o un imbuto.
- **{{ui:inspector.twist}}:** ruota la parte superiore rispetto a quella inferiore oppure la sposta lateralmente, creando colonne attorcigliate e torri inclinate.

![Un gruppo composto da un blocco arancione, un perno blu e un foro ricavato nel blocco. Con Multicolore attivato, il perno resta blu, il blocco arancione e le pareti del foro assumono il colore del blocco.](shot:group-multicolor)

Rastremazione e torsione funzionano con quasi tutte le forme. Sono escluse: ingranaggio, filettatura, molla, Gridfinity, cerniera, piramide, tubo curvo, teardrop, utensili per le teste delle viti e righello. Queste forme hanno dimensioni specifiche oppure, come la piramide, hanno già una propria sommità.

![Un cono con raggio superiore e altezza modificati: accanto a ciascun valore c’è una freccia per ripristinarlo; i due pulsanti in basso salvano o reimpostano i valori predefiniti della forma.](shot:property-reset)

{{ui:inspector.saveDefaults}} salva le modifiche apportate alla forma come valori iniziali per tutte le nuove forme dello stesso tipo: dimensioni, impostazioni e colore. Colora di verde un cilindro e premi il pulsante: da quel momento ogni nuovo cilindro sarà verde, mentre gli altri tipi di forma manterranno i propri colori. {{ui:inspector.resetDefaults}} ripristina i valori iniziali dell’applicazione. Nelle impostazioni, sotto {{ui:workspace.shapeDefaults}}, sono indicate le forme che hanno valori predefiniti personalizzabili. Anche un nuovo progetto avviato dalla pagina iniziale li utilizza; i valori sono conservati in questo browser.

Una scatola, un cilindro, un’ellisse, un poligono, un tubo o un anello rastremato o inclinato conserva la propria geometria esatta. Lo stesso vale per capsule, stelle, cuori, mezzelune, code di rondine, scatole arrotondate senza bordi arrotondati in alto e in basso e zigrinature dritte o circolari (le cui estremità smussate si restringono insieme alla forma). Smussi e raccordi funzionano come sulla forma semplice e l’esportazione STEP li mantiene. Lo stesso vale per le forme attorcigliate: la sezione ruota esattamente mentre sale e i lati si avvolgono in modo uniforme dal basso verso l’alto.

Digitare è più preciso che trascinare. Tutti i campi numerici accettano millimetri e percentuali: per esempio, digitando “50 %” in una larghezza di 40 mm si ottengono 20 mm. Puoi anche usare i calcoli: “15*3”, “120-2*4” o “(40+2)/2” restituiscono rispettivamente 45, 112 e 21; puoi usare x al posto di *. Il campo conserva la formula, sia nel pannello delle proprietà sia nelle quote attorno al corpo selezionato: quando torni a fare clic, vedrai la formula invece del risultato, purché il valore corrisponda ancora. Puoi modificarla direttamente, per esempio da “(140+2)/2” a “(40+6)/2”. Se trascini una maniglia o ridimensioni il corpo, la formula non corrisponde più e il campo mostra di nuovo soltanto il numero. In un campo numerico su cui hai fatto clic, la rotellina del mouse e i tasti [[↑]] e [[↓]] cambiano il valore di un passo, con [[Shift]] di un passo più grande e con [[Alt]] di uno più fine. In un campo di dimensione o posizione, [[Shift]] avanza invece di un passo della griglia, e di dieci passi quando la griglia è disattivata.

### Scegliere i colori

Facendo clic su {{ui:inspector.solid}} nelle proprietà di un corpo si apre il riquadro dei colori, intitolato {{ui:inspector.shapeColor}}. In alto mostra il valore esadecimale del colore corrente. Sotto trovi i colori predefiniti della palette: facendo clic su uno, il corpo cambia colore e il riquadro si chiude.

{{ui:inspector.custom}} apre il selettore di colori del browser, per scegliere un colore personalizzato. Le opzioni dipendono dal browser: Chrome ed Edge offrono un campo colore, un cursore per la tonalità, un contagocce per prelevare un colore da qualsiasi punto dello schermo e il valore in formato HEX, RGB o HSL, selezionabile con le frecce accanto. Il colore viene applicato quando chiudi il selettore o fai clic al di fuori.

I colori personalizzati creati lì vengono poi raccolti in {{ui:inspector.recentColors}}, gli ultimi otto. Il fermaglio nella riga {{ui:inspector.keptColors}} conserva il colore scelto in una riga separata, senza che i colori più recenti lo rimuovano; facendo di nuovo clic sul fermaglio lo togli dall’elenco. In questo browser puoi conservarne fino a 21. Il fermaglio serve per i colori personalizzati; quelli della palette sono sempre disponibili. Se sono selezionati più colori o un foro, non c’è un unico colore da conservare.

I colori dell’area di lavoro nelle impostazioni hanno un selettore più semplice, con un campo colore, una fila di colori predefiniti e un campo per il valore esadecimale; vedi [Le impostazioni](chapter:view-and-workplane).

## Quanto è rotondo un cerchio? Numero di lati

Le forme rotonde, come cilindri, coni, tubi, ellissi e fori, hanno nelle proprietà l’interruttore {{ui:prop.sidesFollowSize}} e il cursore {{ui:prop.sides}}. {{ui:shape.torus}} ha due cursori: {{ui:prop.torusSides}} attorno all’anello e {{ui:prop.torusSteps}} attorno al tubo. Anche questi seguono le dimensioni finché non li regoli manualmente, così un toro grande non mostra facce piatte. Il motivo è che, per la visualizzazione e per le esportazioni STL, 3MF e OBJ, layerling rappresenta un cerchio come un poligono formato da tanti lati piccoli. Più lati ci sono, più la forma è liscia e più triangoli richiede.

{{ui:prop.torusTube}} stabilisce quanto è spesso il tubo visto dall'alto. L'altezza schiaccia o allunga soltanto il tubo, quindi un anello piatto conserva il suo foro; a metà della misura esterna il foro si chiude. Trascinando le maniglie, il tubo si ridimensiona insieme alla forma. Solo un toro il cui tubo è spesso quanto il toro è alto resta un corpo esatto per smussi, raccordi e STEP.

**Quando il numero di lati è importante**

- **Nell’esportazione per lo slicer** (STL, 3MF, OBJ): un cilindro con pochi lati viene esportato come poligono.
- **Quando unisci corpi e fori:** se un foro con pochi lati viene sottratto a un corpo, il foro risultante è spigoloso. Questo vale anche per i fori delle viti.
- **Nella visualizzazione:** molte forme molto dettagliate rallentano l’editor.

**Quando non è importante**

- **Nell’esportazione STEP:** viene scritta la geometria rotonda, non il poligono.
- **Per smussi e raccordi** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}), finché la forma resta rotonda. Accade se non hai impostato un numero di lati, se il numero è almeno pari al valore predefinito della forma oppure se il poligono si discosta dal cerchio al massimo di {{value:EXACT_ROUND_TOLERANCE}} mm. I valori predefiniti sono {{value:ROUND_FROM_SIDES}} lati per cilindro, ellisse, tubo e cono; {{value:ROUND_FROM_ROOF_SIDES}} per {{ui:shape.roundRoof}}; {{value:ROUND_FROM_SPHERE_STEPS}} passaggi per {{ui:shape.sphere}}; {{value:ROUND_FROM_HALF_SPHERE_STEPS}} per {{ui:shape.halfSphere}}; {{value:ROUND_FROM_TORUS_SIDES}} lati e {{value:ROUND_FROM_TORUS_STEPS}} passaggi per {{ui:shape.torus}}; e {{value:ROUND_FROM_BENT_TUBE_QUALITY}} di {{ui:prop.quality}} per un {{ui:shape.bentTube}} circolare.
- **Per filettature, molle e ingranaggi elicoidali:** lo strumento per gli spigoli e l’esportazione STEP usano il corpo esatto; {{ui:prop.quality}} determina solo il livello di dettaglio della visualizzazione.

**Quando torna a essere importante**

- **Per smussi e raccordi su una forma con pochi lati:** se imposti un numero di lati inferiore al valore predefinito, lo strumento per gli spigoli usa la forma così come viene visualizzata. Un cilindro con 6 lati resta un prisma esagonale e il raccordo segue i sei spigoli. Puoi usarlo, per esempio, per creare una sede per dado con angoli arrotondati. Per mantenere rotonda la forma, lascia attivo {{ui:prop.sidesFollowSize}}.

**Come usarlo**

- **Lascia attivo {{ui:prop.sidesFollowSize}}.** layerling sceglierà il numero di lati in base al diametro, in modo che il poligono si discosti dal cerchio al massimo di {{value:ROUND_DEVIATION_TOLERANCE}} mm, molto meno di quanto una stampante riesca a riprodurre. Le forme piccole hanno almeno {{value:MIN_AUTOMATIC_SIDES}} lati; quelle grandi ne hanno di più.
- **Scegli meno lati** se vuoi ottenere un poligono apposta (ma per questo c’è {{ui:shape.polygon}}) oppure se l’editor rallenta a causa di molte forme rotonde.
- **Aumentare i lati** è quasi sempre inutile. Fallo solo per parti rotonde molto grandi, se nell’STL sono visibili gli spigoli.
- **Se devi solo applicare smussi o raccordi o esportare in STEP,** il numero di lati non è rilevante.

## Usare le maniglie

Oltre alle impostazioni, sulla forma trovi alcune maniglie:

- Gli **angoli e gli spigoli** ingrandiscono o rimpiccioliscono la forma. Se trascini una maniglia oltre il lato opposto, la forma continua a crescere dall’altra parte dello spigolo. La freccia in alto produce lo stesso effetto verso il basso della base. Tieni premuto [[Shift]] mentre trascini un angolo per ridimensionare insieme larghezza, profondità e altezza mantenendo le proporzioni; tieni premuto [[Alt]] per ridimensionare dal centro anziché dal vertice opposto. Se non hai una tastiera o preferisci non tenere premuto un tasto, attiva {{ui:inspector.keepProportions}} in alto nelle proprietà: gli angoli manterranno sempre le proporzioni e, digitando una tra larghezza, profondità e altezza, le altre due verranno ridimensionate dello stesso fattore. L’impostazione viene ricordata.
- La **freccia nera sopra** la forma la solleva o la abbassa; con [[Alt]] tenuto dall’inizio si crea una copia dove rilasci, per impilare. La maniglia bianca **sulla faccia superiore** modifica l’altezza.
- Le **frecce curve** la ruotano.
- I **numeri** accanto alla forma ne indicano le dimensioni. Facendo clic su un numero si apre un campo in cui digitare il valore desiderato. Premendo [[Enter]], la forma cresce dal bordo opposto al numero, come quando la trascini; con [[Alt]]+[[Enter]] cresce dal centro, così resta allineata agli altri oggetti. Questo vale per larghezza e lunghezza; l’altezza cresce sempre verso l’alto a partire dal lato inferiore. I campi delle proprietà a destra mantengono il centro senza bisogno di premere tasti. [[Tab]] conferma il valore e passa al campo successivo (larghezza, profondità, altezza); [[Shift]]+[[Tab]] torna al precedente. Quando hai fatto clic su un campo delle proprietà, anche la rotellina del mouse ne modifica il valore: una unità per scatto, dieci volte tanto con [[Shift]], un decimo con [[Ctrl]] e un centesimo con [[Alt]]. Se non hai fatto clic sul campo, la rotellina scorre il pannello.
- **Facendo clic su un angolo** senza trascinarlo, puoi modificare insieme larghezza e profondità. Digita il primo valore, premi [[Tab]] per passare al secondo e [[Enter]] per applicarli entrambi. [[Esc]] annulla.

Quando ruoti una forma di angoli retti, per esempio appoggiandola su un lato con {{ui:editor.tool.layFlat}}, i campi delle proprietà prendono il nome della direzione in cui è orientata ciascuna misura: {{ui:prop.height}} indica la dimensione verticale, {{ui:prop.width}} quella lungo X e {{ui:prop.length}} quella lungo Y. Quindi, digitando l’altezza di una forma coricata, modifichi la misura verticale e il lato inferiore resta appoggiato alla piastra. Una forma inclinata a un angolo diverso mostra nei campi le proprie misure e una nota sottostante lo indica.

Puoi usare la tastiera al posto del mouse: i tasti freccia spostano la selezione di un passo di aggancio (0,01 mm quando la griglia è disattivata), oppure di cinque passi con [[Shift]]. Se nelle impostazioni, sotto {{ui:workspace.appearance}}, imposti {{ui:workspace.gridMajorEvery}} su {{ui:workspace.gridMajorSteps|10}}, lo spostamento sarà di dieci passi: raggiungerai la linea più scura successiva, come in Tinkercad. I movimenti seguono la vista: [[→]] sposta verso destra sullo schermo, [[↑]] allontana da te, anche dopo aver ruotato la piastra. Se spingi una forma fuori dalla vista, la visuale la segue. [[Ctrl]]+[[↑]] e [[Ctrl]]+[[↓]] la alzano o abbassano. Una serie di pressioni dei tasti freccia costituisce un’unica operazione nella cronologia: se una pressione segue la precedente entro un secondo e mezzo, Annulla annulla l’intera serie, non una pressione alla volta. [[R]] ruota di 45°; [[Shift]]+[[R]] di 22,5°. [[D]] appoggia la selezione sul piano di lavoro.

Le maniglie permettono di allargare una forma fino alle dimensioni della piastra, almeno 220 mm in larghezza e profondità. Digitando un valore nel pannello delle proprietà puoi superare questo limite; una forma così ingrandita non si riduce di nuovo quando la trascini. Nelle impostazioni puoi definire un limite massimo per ogni forma, sotto {{ui:workspace.shapeDefaults}} usando {{ui:workspace.customLimit}}.

Il passo di aggancio si trova nell’angolo inferiore destro dell’editor e può essere modificato in qualsiasi momento.

## Copiare e duplicare

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} e {{ui:editor.tool.duplicate}} si trovano nella barra multifunzione ({{ui:editor.group.clipboard}}). [[Ctrl]]+[[D]] duplica la selezione. layerling ricorda l’ultimo spostamento o l’ultima rotazione applicati alla copia e ripete lo stesso movimento alla duplicazione successiva. In questo modo puoi creare una fila di fori o gradini in pochi passaggi. Per le disposizioni regolari è disponibile anche lo strumento Pattern, descritto in [Selezionare e disporre](chapter:select-and-arrange).

> **Suggerimento:** se non riesci a impostare la dimensione che vuoi, spesso dipende dai limiti delle nuove forme. Nelle impostazioni, sotto {{ui:workspace.shapeDefaults}}, puoi decidere le dimensioni iniziali di ogni forma e quanto può diventare grande.

## Forme personalizzate

Un supporto, un’impugnatura o una piastra di base che ti serve spesso può essere salvato in {{ui:myShapes.title}}. Le forme personalizzate si trovano in cima alla libreria, sopra {{ui:myShapes.basicShapes}}, e puoi comprimere l’elenco con la freccia.

1. Seleziona uno o più corpi, fori, gruppi o anche un modello importato.
2. Apri la libreria delle forme e fai clic su {{ui:myShapes.saveSelection}}. Inserisci un nome e conferma con {{ui:common.save}}.
3. In qualsiasi progetto, fai clic sulla tessera della forma per inserirla, come faresti con una forma normale. Puoi anche trascinare la tessera sul piano di lavoro: la forma verrà posizionata dove la lasci. Poi seguirà il puntatore come qualsiasi altra forma, anche sopra le facce di altri corpi; un clic la posiziona e [[Esc]] la annulla.

I corpi multipli vengono reinseriti insieme, mantenendo le posizioni relative, ma restano selezionabili singolarmente. Le [note](chapter:measuring-and-notes) ancorate ai corpi salvati vengono incluse e ricompaiono chiuse, ancorate agli oggetti inseriti; le note libere e i punti di riferimento restano nel progetto. La matita su una tessera permette di rinominarla; il cestino la elimina dopo una richiesta di conferma. Le forme già inserite nei progetti non cambiano.

Le forme personalizzate {{ui:myShapes.title}} vengono conservate in questo browser, separatamente dai progetti, e saranno disponibili anche la prossima volta. {{ui:dashboard.backupAll}} nella pagina iniziale ne crea una copia di sicurezza insieme ai progetti; aprendo il backup, entrambi vengono ripristinati. Per trasferire solo le forme in un altro browser, {{ui:myShapes.backup}} (la freccia verso il basso) le salva in un file ZIP e {{ui:myShapes.load}} (la freccia verso l’alto) le importa nell’altro browser. {{ui:myShapes.load}} accetta anche singoli progetti `.lyl`, ognuno dei quali diventa una forma. Le forme già presenti non vengono aggiunte una seconda volta.

### Cartelle

Puoi organizzare molte forme personalizzate in cartelle. {{ui:myShapes.newFolder}} (la cartella con il segno più, accanto a {{ui:myShapes.saveSelection}}) chiede un nome e crea una cartella principale; il pulsante con il più su una cartella, {{ui:myShapes.newSubfolder}}, ne crea una al suo interno. Puoi creare fino a tre livelli: una cartella del terzo livello può contenere forme ma non altre cartelle. Le cartelle, ordinate per nome, compaiono sopra le forme non inserite in nessuna cartella e si aprono o chiudono con la freccia. Il numero sulla cartella indica quante forme contiene, comprese quelle nelle sottocartelle. Quando salvi una forma, scegli la cartella dal menu accanto al nome; {{ui:myShapes.noFolder}} la lascia al livello principale.

Il pulsante con la freccia su una tessera sposta la forma in un’altra cartella; con {{ui:myShapes.noFolder}} la riporta al livello principale. La matita su una cartella la rinomina; il cestino la elimina dopo una richiesta di conferma, insieme alle cartelle e alle forme che contiene. Non puoi spostare direttamente una cartella: creane una nuova nella posizione desiderata e sposta al suo interno le forme. I backup mantengono le cartelle; ripristinandoli, le forme tornano nella stessa posizione.

### Forme personalizzate sul server

Quando è attivo il [server condiviso](chapter:files-and-saving), questa sezione mostra due gruppi: {{ui:myShapes.onServer}} e {{ui:myShapes.inBrowser}}. Quando salvi, scegli dove archiviare la forma; inizialmente è selezionato il server. La forma viene salvata lì, nella cartella `Custom shapes`, come file `.lyl` autonomo con un’immagine di anteprima, e sarà disponibile su ogni dispositivo che può accedere al server. Le sue sottocartelle corrispondono alle cartelle della libreria. I due gruppi hanno cartelle separate e una forma può essere spostata solo tra le cartelle del proprio gruppo. L’icona a forma di nuvola su una tessera del browser sposta la forma sul server, evitando di conservarne due copie.

La cartella `Custom shapes` compare anche nella pagina iniziale. Apri una forma da lì come se fosse un progetto, modificala e verrà salvata automaticamente come qualsiasi progetto sul server; al prossimo inserimento verrà usata la nuova versione. Il server condiviso non richiede un accesso, quindi tutte le persone che possono raggiungerlo vedono le stesse forme.

## Avvolgere una forma attorno a un cilindro

Vuoi applicare un motivo, un logo o una scritta su una tazza, una lattina o un tubo? Per prima cosa disponili sulla piastra, per esempio come SVG importato o come testo, con l’orientamento che dovranno avere visti dall’alto. Poi avvolgili attorno a un cilindro nelle impostazioni della forma, sotto {{ui:inspector.wrapCylinder}}:

1. Apri {{ui:inspector.wrapCylinder}} e inserisci {{ui:inspector.wrapDiameter}}, cioè il diametro della parete del cilindro, per esempio il diametro esterno della tazza. Puoi specificare anche i decimi di millimetro, come 63,5.
2. Fai clic su {{ui:inspector.wrapApply}}. Ciò che andava da sinistra a destra ora gira attorno al cilindro, il bordo posteriore diventa quello superiore e lo spessore sporge dalla parete.
3. Seleziona la forma avvolta e il cilindro e centra entrambi in orizzontale e in profondità. Il centro della forma avvolta coincide con l’asse del cilindro, così aderisce alla parete.

Per un’incisione, attiva {{ui:inspector.wrapInward}}: lo spessore penetrerà nella parete. Imposta la forma come foro, centrala e raggruppala con il cilindro.

Una forma già avvolta diventa una mesh e non può essere avvolta di nuovo. Annulla l’operazione oppure riparti dall’originale piatto e avvolgilo di nuovo con un diametro diverso.

Il risultato è una mesh, come un modello importato. Annullando, la forma torna piatta; per usare un altro diametro, annulla prima l’avvolgimento e applicalo di nuovo. La forma non può compiere più di un giro intorno al cilindro; se il diametro non lo consente, layerling indica il diametro minimo necessario.
