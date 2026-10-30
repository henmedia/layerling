---
title: Smussare gli spigoli e svuotare i corpi
summary: Smussi e raccordi sugli spigoli scelti, pareti di spessore uniforme per scatole, tazze e involucri.
---

## Smussare e raccordare gli spigoli

Gli spigoli vivi raramente stanno bene su un pezzo stampato e non sono particolarmente resistenti. Uno **smusso** taglia lo spigolo in diagonale; un **raccordo** lo arrotonda. Entrambi agiscono sugli spigoli che selezioni.

1. Seleziona il corpo (o il gruppo).
2. Fai clic su {{ui:editor.tool.fillet}} o {{ui:editor.tool.chamfer}} nella barra multifunzione, premi [[B]] per il raccordo o [[Shift+B]] per lo smusso, oppure fai clic destro sul corpo e scegli il comando dal menu.
3. Gli spigoli del corpo si illuminano. Fai clic su quelli da modificare; un altro clic li rimuove dalla selezione. Tieni premuto [[Shift]] per aggiungere o rimuovere un singolo spigolo.
4. Imposta la dimensione e conferma con {{ui:edge.apply}} o [[Enter]]. Dopo l’applicazione, la finestra resta aperta sul nuovo corpo e mantiene la stessa dimensione, così puoi aggiungere subito un altro raccordo o smusso. {{ui:edge.done}}, [[Esc]] o la croce chiudono la finestra. Tenendo premuto [[Shift]] o [[Ctrl]], un clic su {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} o {{ui:edge.horizontalEdges}} aggiunge quegli spigoli a quelli già selezionati invece di sostituirli.

![Lo strumento “Raccorda spigoli”: sono selezionati tutti gli spigoli vivi e l’anteprima mostra un raggio di 4 mm.](shot:fillet-preview)

Il pannello si trova in alto a destra. Se copre gli spigoli che vuoi selezionare, spostalo trascinando la barra del titolo; la prossima volta si aprirà nello stesso punto. Lo stesso vale per {{ui:editor.tool.hollow}} e {{ui:editor.tool.array}}. Fai doppio clic sulla barra del titolo per riportarlo nella posizione iniziale.

Se, mentre il pannello è aperto, scegli una forma dalla libreria, il pannello si chiude senza applicare la modifica e gli spigoli selezionati vengono dimenticati. Il clic inserisce la nuova forma invece di selezionare uno spigolo.

Nel pannello trovi:

- {{ui:edge.allSharpEdges}} seleziona tutti gli spigoli in una volta; {{ui:edge.clear}} svuota la selezione.
- **{{ui:edge.radius}}** imposta il raggio del raccordo. Per lo smusso, imposta {{ui:edge.distance}} oppure {{ui:edge.angle}}.
- {{ui:edge.variableRadius}} (solo per i raccordi) permette di variare il raggio lungo uno spigolo: piccolo a un’estremità, più grande all’altra e uniforme tra le due, per esempio nel punto in cui una parete verticale incontra una parete inclinata. Fai clic su un singolo spigolo e imposta {{ui:edge.radiusStart}} e {{ui:edge.radiusEnd}}. L’estremità iniziale dipende da come è stato creato lo spigolo; se il raggio più grande finisce dalla parte sbagliata, {{ui:edge.swapEnds}} inverte le estremità. Lo strumento agisce su un solo spigolo alla volta, quindi applica i raggi variabili a ciascuno separatamente. {{ui:edge.editAction}} ripristina entrambi i valori.
- {{ui:edge.sharpThreshold}} decide quali spigoli sono considerati vivi. Un valore di 25° seleziona solo gli angoli più marcati e ignora le transizioni piatte.
- {{ui:edge.verticalEdges}} seleziona gli spigoli verticali, come gli angoli di una scatola: con un solo raccordo puoi arrotondarli tutti insieme.
- {{ui:edge.topEdges}} seleziona solo gli spigoli sul bordo superiore del corpo. È una scorciatoia per creare un tagliabiscotti: disegna il contorno in uno schizzo come traccia e poi smussa il bordo superiore. {{ui:edge.angle}} imposta l’inclinazione dello smusso, che non può essere più profondo dello spessore della parete.
- {{ui:edge.bottomEdges}} seleziona solo gli spigoli sul bordo inferiore del corpo, l’opposto di {{ui:edge.topEdges}}. È un modo rapido per arrotondare o smussare solo la base di un pezzo.
- {{ui:edge.chamfillet}}, selezionato in cima alla finestra dello smusso accanto a {{ui:editor.tool.chamfer}}, crea una base adatta alla stampa: uno smusso sulla piastra che sfuma in modo tangenziale in un raccordo verso la parete. Così i primi strati non hanno bisogno di supporti e il bordo resta morbido. {{ui:edge.distance}} imposta l’altezza occupata dalla base e {{ui:edge.angle}} (da 15° a 75°) l’inclinazione dello smusso sulla piastra. Seleziona gli spigoli con {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} nasconde gli spigoli sul lato opposto del corpo rispetto alla vista. Inizialmente tutti gli spigoli sono visibili attraverso il corpo, cosa che può confondere nei pezzi complessi; attivando l’opzione puoi vedere e selezionare solo quelli rivolti verso di te. Ruota la vista per raggiungere gli altri. Gli spigoli evidenziati in rosso (vedi sotto) restano sempre visibili.
- {{ui:edge.tangentChains}} fa sì che un clic selezioni anche gli spigoli che proseguono in modo uniforme, per esempio tutti quelli attorno a una faccia con angoli arrotondati. L’opzione decide solo quali spigoli vengono selezionati con il clic: il kernel CAD estende comunque smussi e raccordi agli spigoli che proseguono senza interruzioni. Il pannello indica quanti altri spigoli vengono coinvolti.
- {{ui:edge.keepSize}} mantiene inalterata la dimensione dello smusso o del raccordo anche se in seguito ridimensioni il corpo.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} o {{ui:edge.fine}}) regola il livello di dettaglio dell’anteprima. Per i pezzi complessi, {{ui:edge.draft}} è più veloce.

Mentre modifichi la dimensione, layerling ricalcola l’anteprima. Può volerci qualche istante; puoi continuare a cambiare i valori e verrà calcolato quello scelto per ultimo.

Se la dimensione è eccessiva per lo spigolo, layerling te lo segnala e suggerisce un valore più piccolo. Spesso basta ridurlo di uno o due millimetri. Con angoli molto acuti, un raccordo richiede più spazio di quanto suggerisca il suo raggio. Sugli schermi piccoli, il pannello scorre automaticamente verso il basso per mostrare il messaggio.

Se una selezione che funzionava smette di funzionare quando aggiungi un altro spigolo, quello spigolo diventa rosso e viene disegnato più largo: con la dimensione impostata non è possibile lavorarlo insieme agli altri. Fai di nuovo clic per rimuoverlo oppure riduci la dimensione. Se selezioni altri spigoli mentre il messaggio è visibile, il primo resta rosso. Se invece non c’è una selezione precedente che funziona — per esempio al primo clic o dopo aver aumentato la dimensione — diventano rossi gli spigoli che non possono essere lavorati neppure da soli, oppure tutti se il problema è la loro combinazione.

Anche lo spigolo sotto il puntatore viene disegnato più largo, così puoi vedere quale selezionerai con il clic.

### Annullare un trattamento degli spigoli

Puoi sempre modificare di nuovo un corpo su cui hai applicato uno strumento per gli spigoli. Selezionalo e apri Raccordo, Smusso o Svuota: in ciascuno trovi l’elenco dei trattamenti già applicati sotto {{ui:edge.featureHistory}}. {{ui:edge.revertAction}} annulla un singolo trattamento. Se sopra ce ne sono di più recenti, verranno annullati insieme; il pannello ti indica quanti.

Accanto a uno smusso, un raccordo o uno svuotamento trovi anche {{ui:edge.editAction}}. Annulla il trattamento allo stesso modo, ma riapre subito lo strumento con gli stessi spigoli e il valore precedente. Puoi cambiare il valore e applicarlo di nuovo: per esempio, portare un raccordo da 3 mm a 5 mm senza riselezionare gli spigoli. Anche in questo caso vengono annullati i trattamenti successivi. Questo vale per i trattamenti degli spigoli che applichi da ora in poi; quelli precedenti permettono solo di essere annullati, così come i trattamenti applicati alle singole parti di un gruppo.

Su un gruppo, per esempio un cilindro con un foro, lo spigolo trattato appartiene al corpo finito, non a una delle parti che lo compongono. Il gruppo diventa quindi un corpo unico. {{ui:editor.tool.ungroup}} continua a funzionare: prima annulla i trattamenti degli spigoli e poi scioglie il gruppo, tutto in un solo passaggio, annullabile con [[Ctrl]]+[[Z]]. Annullando il trattamento come descritto sopra, il gruppo torna a contenere tutte le parti. È più semplice applicare i trattamenti agli spigoli per ultimi. Questo vale anche per le filettature: lo strumento usa la geometria esatta della filettatura, quindi puoi raccordare gli spigoli di un blocco con un foro filettato senza rimuovere la filettatura. Calcolare gli spigoli di una filettatura richiede più tempo che per una forma semplice: qualche secondo per un M6 e circa mezzo minuto per una filettatura per tubo G1/2.

> **Da sapere:** per raccordi e smussi layerling usa la vera geometria CAD, non solo una mesh di triangoli. Perciò nell’esportazione STEP uno spigolo arrotondato resta uno spigolo arrotondato.

Anche una parte importata da STEP conserva la propria geometria CAD: smussi, raccordi e svuotamento agiscono sul corpo del file, indipendentemente dal livello di dettaglio con cui viene disegnato sullo schermo. I file STL, OBJ e 3MF contengono solo triangoli e, se la mesh è molto dettagliata, lo strumento per gli spigoli potrebbe non riuscire a elaborarla. Se la parte è disponibile anche in formato STEP, importa quel file.

## Svuotare i corpi

Scatole, tazze, involucri e coperchi hanno una caratteristica in comune: sono vuoti all’interno e hanno pareti di spessore uniforme. È proprio quello che fa {{ui:editor.tool.hollow}}.

1. Seleziona il corpo e fai clic su {{ui:editor.tool.hollow}}, oppure fai clic destro sul corpo e scegli il comando dal menu.
2. Imposta {{ui:shell.wall}}.
3. In {{ui:shell.openings}}, attiva i lati che vuoi lasciare aperti: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} o {{ui:shell.side.right}}, anche più di uno. Solo {{ui:shell.side.front}} crea un’apertura per un cassetto; {{ui:shell.side.left}} e {{ui:shell.side.right}} creano un tunnel. Se non attivi nessun lato, il corpo resta chiuso su tutti i lati con una cavità al centro. {{ui:shell.side.closed}} disattiva tutti i lati con un clic. {{ui:shell.side.top}} è già attivo quando si apre il pannello; facendo clic lo disattivi e richiudi la parte superiore. Un corpo chiuso su tutti i lati appare invariato dall’esterno: la vista in sezione mostra la cavità.
4. Scegli se gli {{ui:shell.edges}} devono essere {{ui:shell.edges.round}} oppure {{ui:shell.edges.sharp}}.
5. Fai clic su {{ui:shell.apply}}.

![Il pannello Svuota, con lo spessore della parete, un interruttore per ogni lato da lasciare aperto e le opzioni per gli spigoli interni.](shot:hollow-panel)

Le pareti si sviluppano verso l’interno. L’esterno resta invariato.

{{ui:shell.edges}} conta solo nei punti in cui le pareti interne si allontanano, cioè in corrispondenza di un gradino del corpo o attorno a un’apertura. Gli angoli interni di una scatola semplice restano sempre vivi con entrambe le impostazioni. Per ottenere un interno arrotondato, arrotonda prima gli spigoli esterni del corpo (vedi sopra) e poi svuotalo: all’interno il raggio sarà quello esterno meno lo spessore della parete. Se non è possibile creare il raccordo interno — può capitare con un contorno composto da moltissimi brevi segmenti, per esempio un disegno ricalcato — layerling crea lo stesso corpo cavo con angoli interni vivi.

![Il risultato: un guscio con pareti spesse 3 mm e apertura superiore.](shot:hollow-result)

![La stessa scatola con il solo lato anteriore aperto: un’apertura per un cassetto.](shot:hollow-sides)

Per ogni lato aperto, il corpo deve avere una faccia piatta proprio sul bordo di quel lato. Perciò sfere e forme libere non possono essere svuotate con questo strumento. Se la parete è troppo spessa per il corpo, layerling te lo segnala e chiede di ridurla. Una scatola arrotondata anche sugli spigoli superiori e inferiori è un caso di questo tipo: la parete deve essere molto più sottile del raccordo oppure puoi impostare prima il raccordo su 0.

Puoi svuotare anche un corpo con una cavità, per esempio un blocco con un foro che non lo attraversa, ottenuto raggruppando una scatola e un foro sollevato. Aprendo la parte superiore, vengono svuotate anche le pareti attorno alla cavità: resta un’intercapedine anulare tra la parete esterna e quella interna, aperta in alto, oltre a una cavità sottile sotto il fondo della cavità.

**I corpi che terminano a punta,** come un cono o un triangolo ruotato, non hanno una faccia piatta superiore da lasciare aperta. Non è possibile neppure creare una cavità completamente chiusa, perché la punta non può essere spostata verso l’interno: anche con una parete di 1 mm, layerling segnala che è troppo spessa. Disegna invece lo spessore nel profilo prima di ruotarlo: duplica il contorno, riduci uniformemente la copia, posizionala al centro del contorno più grande e sottraila; poi ruota l’intero profilo (capitolo Schizzi, sezione Rotazione). La distanza tra i due contorni determina lo spessore della parete.

Se in seguito ridimensioni un corpo svuotato, layerling lo svuota di nuovo subito, usando la nuova dimensione. Lo spessore della parete resta quello scelto, anche sui corpi rotondi. Se allunghi un cilindro più in una direzione che nell’altra, diventa un’ellisse.

> **Suggerimento:** con un ugello da 0,4 mm, uno spessore tra 1,2 e 2 mm è un buon punto di partenza: abbastanza sottile da risparmiare materiale e abbastanza spesso da creare un pezzo robusto.

## Un coperchio per un corpo aperto

{{ui:editor.tool.lid}} crea il coperchio per un corpo aperto in alto: una scatola svuotata con il lato superiore aperto, un vaso, un vassoio. Seleziona il corpo e fai clic su {{ui:editor.tool.lid}}. Nella finestra scegli il tipo:

- {{ui:lid.type.plug}}: una piastra grande quanto il corpo con sotto un labbro che entra nell'apertura.
- {{ui:lid.type.cap}}: una piastra più larga del corpo di una parete con sotto un bordo che avvolge l'esterno.
- {{ui:lid.type.flat}}: solo la piastra, da appoggiare o incollare.

Poi imposti lo spessore ({{ui:lid.thickness}}), l'accoppiamento ({{ui:lid.fit}}, il gioco per lato tra coperchio e corpo: 0,1 mm stretto, 0,2 mm normale, 0,3 mm largo, o qualsiasi valore fino a 1 mm) e quanto scende il labbro o il bordo e quanto è spessa la sua parete. Fai clic su {{ui:lid.apply}}: il coperchio si trova accanto al corpo, capovolto con la piastra in basso, così si stampa senza supporti. Il corpo resta com'è. Il coperchio segue qualsiasi contorno, tondo o spigoloso, perché viene preso dal corpo stesso appena sotto il suo bordo. Un corpo senza apertura in alto riceve solo un coperchio piatto; per gli altri due, svuotalo prima con il lato superiore aperto.

> **Suggerimento:** Quanto un coperchio è stretto dipende dalla stampante. Stampa prima una piccola scatola con il suo coperchio; se è troppo stretto, scegli l'accoppiamento successivo, più largo.

## Offset dei corpi

Ogni faccia di un corpo può essere spostata della stessa distanza, verso l'esterno o l'interno. È ciò che serve a un accoppiamento, a un coperchio o a un incastro a scatto: un gioco di 0,1-0,3 mm tutto intorno mentre i dettagli restano dove sono, cosa che il ridimensionamento non dà.

1. Seleziona un corpo e clicca su {{ui:editor.tool.offset}}, oppure fai clic destro sul corpo e sceglilo lì.
2. Scegli {{ui:offset.grow}} o {{ui:offset.shrink}} e imposta la {{ui:offset.distance}}.
3. Gli {{ui:offset.edges}} decidono gli angoli esterni: arrotondato mantiene tonda la superficie, netto lascia proseguire le facce finché non si incontrano.
4. Spunta {{ui:offset.copy}} per tenere il pezzo com'è e ottenere il corpo ingrandito come copia che è già un vuoto. Raggruppa quel vuoto con il pezzo da accoppiare e taglia esattamente il gioco scelto.
5. Clicca su {{ui:offset.apply}}.

Senza la spunta viene spostato il corpo stesso. Diventa un corpo esatto fisso, come dopo uno smusso: l'elenco in alto nel pannello annulla l'offset e {{ui:edge.editAction}} riapre lo strumento con la distanza precedente. Si possono spostare solo corpi CAD esatti - scatole, cilindri e le altre forme, i loro gruppi, parti STEP importate. Un corpo che è solo una maglia di triangoli, come molte importazioni STL, spesso non può. Una distanza troppo grande per il corpo, ad esempio una riduzione oltre la parete più sottile, viene rifiutata.

## Eliminare facce

Un raccordo che intralcia, un foro nel posto sbagliato o una sporgenza che non serve più: {{ui:editor.tool.deleteFace}} rimuove queste parti dal corpo senza ricostruirlo da zero.

1. Seleziona il corpo e fai clic su {{ui:editor.tool.deleteFace}}, oppure fai clic destro sul corpo e scegli il comando dal menu.
2. Fai clic su tutte le facce della parte da eliminare: quelle di uno spigolo arrotondato, la parete di un foro oppure il lato e la sommità di una sporgenza. Le facce selezionate si illuminano; un altro clic le deseleziona. Il pannello mostra il numero di facce selezionate.
3. Fai clic su {{ui:deleteFace.apply}} o premi [[Delete]]. [[Esc]] chiude lo strumento senza modificare nulla.

Le facce attorno a quelle eliminate si estendono fino a chiudere il vuoto. Una scatola con i bordi superiori arrotondati riacquista gli spigoli vivi; un foro viene riempito e una sporgenza scompare. Il corpo resta una geometria esatta: puoi applicare di nuovo raccordi e smussi e l’esportazione STEP ne conserva le facce reali. [[Ctrl]]+[[Z]] annulla l’eliminazione in un solo passaggio. L’operazione compare anche in {{ui:edge.featureHistory}} insieme a raccordi e smussi; {{ui:edge.revertAction}} la annulla. Per questa operazione non è disponibile {{ui:edge.editAction}}. Su un gruppo, il risultato è un corpo unico, come con un trattamento degli spigoli.

Seleziona tutte e sole le facce della parte da eliminare. Se non è possibile chiudere il vuoto estendendo le facce vicine, layerling te lo segnala e non modifica nulla: per esempio, un lato principale di una scatola non ha una faccia vicina che possa sostituirlo. Eliminando solo il fondo di una cavità, questa diventa un foro passante perché le pareti proseguono fino all’altro lato.

{{ui:editor.tool.deleteFace}} richiede facce esatte: funziona sulle parti importate da STEP e sulle forme create in layerling. Non è disponibile per gli oggetti che layerling conserva come mesh: STL, OBJ o 3MF importati, corpi divisi, avvolti o semplificati, oppure forme molto dettagliate come un testo lungo. Se puoi, importa la parte in formato STEP. Su una parte importata e molto dettagliata, anche poche facce possono essere troppe per il kernel CAD: dopo 45 secondi l’eliminazione viene interrotta e non cambia nulla. Un corpo ridimensionato dopo un trattamento degli spigoli con l’opzione per mantenere la dimensione attiva non ha facce esatte alla nuova dimensione finché non annulli il ridimensionamento.
