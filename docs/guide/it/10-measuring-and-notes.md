---
title: Misurazioni e annotazioni
summary: Metro a nastro, righello e squadra, distanze dall’origine, note che restano associate a una parte e punti di riferimento a cui gli oggetti possono agganciarsi.
---

Per costruire un pezzo con precisione, devi poterlo misurare. layerling offre diversi strumenti per farlo. Nessuno compare nelle esportazioni. Per misurare lo spessore delle pareti e le distanze all’interno di un pezzo, è preferibile usare la [vista in sezione](chapter:view-and-workplane) con {{ui:camera.sectionMeasure}}.

## Il metro a nastro

Il metro a nastro si trova in fondo alla barra della telecamera, sul bordo sinistro ({{ui:camera.tapeTools}}). Misura la distanza tra angoli, spigoli e facce. Facendo clic si apre una serie di sei pulsanti. Se coprono la zona che vuoi misurare, trascinali dalla maniglia a sinistra e spostali sul piano di lavoro; un doppio clic sulla maniglia li riporta al loro posto:

![Il metro a nastro con i pulsanti: aggiungi misura, sposta i punti di misurazione, rimuovi misura, misura spigoli interi, elimina tutte le misure.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** fai clic su un punto, trascina fino al successivo e fai clic. Viene indicata la distanza, preceduta dagli assi lungo cui corre: X, Y o Z per una misura dritta, XY, XZ o YZ attraverso un piano, 3D per tutti e tre. Passa il puntatore sull’etichetta per vedere quanto si estende la misura lungo ogni asse, e su un punto per vederne le coordinate. Mentre posizioni il secondo punto, gli assi, la distanza e l’estensione lungo ogni asse compaiono accanto al puntatore. Una misura che sta per lo più dietro un altro corpo sbiadisce; passando il puntatore sulla sua linea o etichetta torna ben visibile. Se il secondo punto si trova su uno spigolo o una faccia opposta, quando il puntatore si avvicina si aggancia perpendicolarmente al primo; tenendo premuto [[Shift]], puoi agganciarlo ovunque su quello spigolo o quella faccia. Sulla stessa faccia o sul piano di lavoro, [[Shift]] vincola la misura lungo l’asse principale.
2. **{{ui:camera.moveMeasurement}}:** afferra i punti e spostali; il valore della misura li segue.
3. **{{ui:camera.deleteMeasurement}}:** attiva lo strumento e fai clic sulla misura da rimuovere. Se invece, con {{ui:camera.addMeasurement}} attivo, tieni premuto [[Shift]] o [[Ctrl]] ([[Cmd]] su Mac) mentre fai clic su un punto o una linea di misura, lo elimini subito senza cambiare modalità.
4. **{{ui:camera.tapeWholeEdges}}:** facendo clic su uno spigolo, ne misura l’intera lunghezza, per esempio la circonferenza di un cerchio. Se disattivi l’opzione, il clic posiziona un punto sullo spigolo e il secondo può essere ovunque: puoi misurare il diametro o qualsiasi altra distanza. [[Alt]] inverte l’opzione per un solo clic. Su un cerchio, quando il puntatore si avvicina, il secondo punto si aggancia a quello opposto al primo; entrambi i punti restano sulla circonferenza esatta, così la misura del diametro è precisa.
5. **{{ui:camera.deleteAllMeasurements}}:** elimina tutte le misure in una volta. Poiché non è possibile annullare l’operazione, layerling chiede conferma; se non ci sono misure, il comando non fa nulla.
6. **{{ui:camera.tapeMarkMiddle}}:** al centro di ogni misura c’è un piccolo segno rotondo con la metà inferiore piena. Posiziona un [punto di riferimento](#punti-di-riferimento) al centro della misura: dopo aver fatto clic su uno spigolo rotondo, per esempio il bordo di un foro, lo mette al centro del cerchio (anche su una mesh importata, dove non c’è un altro indicatore del centro del foro); per un diametro o una misura rettilinea, lo posiziona a metà. Trascinando una forma, il suo centro si aggancia al punto. Se il punto esiste già, non ne viene creato un duplicato. Il metro a nastro si aggancia ai punti di riferimento come agli angoli, quindi puoi misurare dal centro di un cerchio o dal punto medio di una linea: crea il punto e poi fai clic su di esso.
7. **{{ui:camera.tapeTypeLength}}:** Quando almeno un'estremità di una misura dritta si trova su un corpo, il suo numero si può cliccare. Digita una nuova lunghezza e premi [[Enter]]: il corpo al secondo punto si sposta lungo la linea misurata finché la distanza è esattamente quella, come con il righello di Tinkercad. Se è selezionato solo il corpo al primo punto, si sposta quello. I punti di misura restano sul corpo, quindi la misura lo segue. Misura da uno spigolo, un bordo o un [punto di riferimento](#punti-di-riferimento), come il centro di un cerchio, per mettere i pezzi a una distanza esatta. Una lunghezza negativa lo porta altrettanto oltre il primo punto, per esempio 5 mm all'interno del bordo di una scatola.

Premi [[Esc]] per uscire dalla modalità di misurazione.

## Il righello

Seleziona {{ui:shape.ruler}} nella libreria delle forme. È solo uno strumento di misurazione: non appare in alcuna esportazione e non può essere raggruppato o tagliato. Per ogni corpo che tocca o interseca il righello, mostra direttamente nella vista una misura sospesa che ne indica l’estensione. Puoi modificare il valore in quel punto e il corpo si adegua. Il simbolo più sospeso crea una copia della forma misurata. La scala è stampata in millimetri; quando passi ai pollici (con l’interruttore in basso a destra), mostra i pollici, con una tacca ogni sedicesimo e i pollici interi numerati.

## La squadra

A volte è più semplice misurare perpendicolarmente. Fai clic su {{ui:camera.cornerRulerTool}} nella barra della telecamera, poi sul piano di lavoro. Qui viene posizionata una squadra con due bracci ad angolo retto e tacche come quelle di una squadra da falegname. Anche la squadra non è un corpo vero e proprio. Fai clic vicino all’angolo di un corpo e l’angolo della squadra vi si aggancia con precisione.

La squadra poggia sul piano di lavoro. Se questo si trova sul lato di un corpo, anche la squadra si appoggia a quel lato; vedi [Vista e piano di lavoro](chapter:view-and-workplane). Così puoi quotare una parete verticale: posiziona il piano di lavoro sulla parete, metti la squadra nell’angolo superiore sinistro e fai clic sulla maniglia finché i bracci puntano a destra e verso il basso.

- **Trascina la maniglia** per spostare la squadra.
- **Fai un clic breve sulla maniglia** per ruotarla di 90°.
- **Fai clic sulla ×** accanto alla maniglia per rimuoverla.
- **Il pulsante piccolo a sinistra della maniglia** cambia il riferimento della misura: il bordo esterno del corpo (estremità, icona con linee) oppure il suo centro (punto medio, mirino). Un pulsante dello stesso tipo accanto a ciascun numero verde imposta il riferimento solo per quella misura: per un cilindro verticale, il centro sui due bracci e il fondo per l’altezza; per un cilindro coricato, il centro in larghezza e un’estremità in lunghezza. Quando tutte e tre le misure usano lo stesso riferimento, il pulsante sulla maniglia mostra la modalità comune.

Se i corpi sono posizionati accanto a uno dei bracci, la squadra ne mostra automaticamente le dimensioni. Funziona solo sulla piastra di base, non sul lato di un corpo. Il pulsante con la freccia sotto la maniglia della squadra lo disattiva, così solo i corpi selezionati mostrano le misure; viene salvato con il progetto.

Quando selezioni un corpo, la squadra mostra in verde quanto dista dall’angolo, lungo entrambi i bracci e in altezza. Fai clic su un numero verde e digita una distanza per spostare il corpo esattamente lì. Se selezioni più corpi, vengono considerati come un unico insieme: la squadra ne misura il profilo complessivo e un valore digitato li sposta tutti insieme, mantenendo invariata la distanza reciproca.

Le linee guida dei valori verdi seguono il pavimento, cioè il piano su cui poggia la squadra, fino al punto sotto o accanto al corpo; l’altezza ha una freccia dedicata. Il riferimento di ogni misura si cambia dal riquadro del relativo valore. I bracci e le tacche sono linee nello spazio: un corpo davanti a loro le nasconde, come farebbe con una squadra vera. Il piccolo occhio sotto la maniglia cambia questo comportamento: con l’occhio barrato, come all’inizio, i corpi nascondono la squadra; con l’occhio aperto, la squadra resta visibile sopra gli oggetti. Le tacche dei bracci si attenuano quando un corpo si trova davanti.

Usando il punto medio, i numeri verdi misurano fino al centro del corpo, anche in altezza. Puoi così posizionare una sfera con il centro esattamente a 15 mm da uno spigolo, senza sottrarne il raggio. Per mettere un foro su una parete a 40 mm da sinistra e 190 mm dall’alto, seleziona il foro, imposta il riferimento al punto medio e digita 40 e 190. In questo caso l’altezza si misura verso l’esterno della parete.

Il metro a nastro e la squadra restano al loro posto mentre lavori nello schizzo e ricompaiono quando torni alla vista 3D. Nessuno dei due entra nella cronologia. La squadra viene salvata con il progetto, e così le misurazioni del metro a nastro, nel browser e nel file .lyl: quando apri il progetto sono di nuovo al loro posto. Il pulsante con l’occhio tra i pulsanti del metro a nastro nasconde tutte le misurazioni e le mostra di nuovo; viene salvato anche se sono nascoste, e aggiungere, spostare o eliminare una misurazione le mostra prima.

## Distanze dall’origine e durante lo spostamento

Nelle impostazioni, sotto {{ui:workspace.appearance}}, trovi due interruttori per visualizzare le misure in tempo reale:

- {{ui:workspace.showMoveDimensions}} mostra di quanto si sposta il corpo mentre lo trascini. Vale anche per il sollevamento con la freccia nera sopra il corpo; lo spostamento appare al suo angolo anteriore. Dopo aver rilasciato, fai clic su quel numero e digita la distanza esatta; un valore negativo scende.
- {{ui:workspace.showOriginDimensions}} mostra la distanza della selezione dall’origine della piastra, anche quando sono selezionati più corpi.

Con {{ui:workspace.dimensionsAlwaysVisible}} le misure restano sempre visibili.

Se per un momento danno fastidio, premi [[Q]]: le misure e le distanze attorno alla selezione spariscono e il pezzo che sposti si vede bene. Di nuovo [[Q]] le riporta. Una maniglia su cui punti mostra comunque la sua misura.

## Note

Una nota registra informazioni che la geometria non può esprimere: “Questa vite è troppo stretta di 0,3 mm”, “stampare il coperchio?” oppure “misura presa da Peter”. Inseriscila con {{ui:editor.tool.note}} o premendo [[N]].

- Se posizioni la nota **su un corpo**, si sposta insieme a esso.
- Se la posizioni **accanto a un corpo**, resta sul piano di lavoro ({{ui:note.free}}).
- {{ui:note.detach}} stacca dal corpo una nota associata.
- {{ui:editor.tool.group}} include nel gruppo una nota associata; {{ui:editor.tool.ungroup}} la assegna alla parte visibile sottostante, anche se si trova in un gruppo interno. Mentre modifichi un gruppo con {{ui:group.edit}}, le sue note si spostano insieme alle parti a cui sono associate e tornano nel gruppo con {{ui:group.done}}; annullando la modifica, tornano alla posizione originale.
- Se il corpo viene eliminato, o se sotto la nota non resta più alcun corpo visibile, la nota rimane nella stessa posizione sul piano di lavoro.
- Trascina il fermaglio per spostare la nota. Facendo clic sul fermaglio, la scheda si comprime e resta visibile solo il numero; fai di nuovo clic per riaprirla. Fai clic sul testo per modificarlo.
- Durante la modifica, [[Enter]] salva il testo e [[Esc]] lo ripristina com’era prima; [[Shift]]+[[Enter]] inserisce una nuova riga.
- **In uno schizzo**, anche {{ui:editor.tool.note}} (in {{ui:editor.group.manage}}) o [[N]] inseriscono una nota, in qualsiasi punto dello schizzo. Tutte le note di uno schizzo appartengono al suo corpo: nella vista 3D stanno su di esso, sopra un corpo creato con {{ui:sketch.extrude}} o {{ui:sketch.sweep}} e sul profilo disegnato di uno creato con {{ui:sketch.revolve}}, e si spostano con lui. Quando riapri lo schizzo, mostra le note del corpo, comprese quelle inserite in 3D. Nello schizzo, {{ui:sketch.undo}} annulla una nota come una linea e {{ui:sketch.cancel}} scarta ciò che hai cambiato nelle note. Anche qui [[Shift]]+[[N]] mostra o nasconde le note.

Le note vengono salvate nel progetto, non compaiono nelle esportazioni e possono essere mostrate o nascoste con {{ui:visibility.notes}} (in {{ui:editor.visibilityOptions}}, la freccia accanto all’icona dell’occhio) o con [[Shift]]+[[N]].

## Immagini di riferimento

Un’immagine di riferimento è una fotografia da usare per allineare le parti: puoi appoggiare, per esempio, la foto di una scheda elettronica sul fondo del suo contenitore e posizionare direttamente su di essa i distanziatori, i fori e le aperture per i connettori. È una guida, non un corpo: non viene mai stampata né esportata (STL, 3MF, OBJ, STEP, SVG), non entra in un gruppo, un insieme o un taglio e non viene conteggiata nella stima di stampa.

- Apri {{ui:editor.import}}, scegli {{ui:import.referenceImage}} e seleziona un’immagine PNG, JPG, WebP, GIF o BMP. Viene posizionata sul piano di lavoro, sulla piastra oppure sulla faccia su cui hai disposto il piano, con il lato più lungo di 100 mm e una trasparenza del 50%.
- Spostala, ruotala e ridimensionala con le maniglie, come qualsiasi forma. Se davanti all’immagine c’è un corpo, viene selezionato prima quello: lavorando sopra la foto non la afferrerai per sbaglio.
- {{ui:referenceImage.seeThrough}} nelle sue impostazioni ne regola la trasparenza, da completamente opaca a appena visibile.
- {{ui:referenceImage.calibrate}} imposta la dimensione reale, come nello schizzo: fai clic su due punti dell’immagine di cui conosci la distanza reale, per esempio due fori di fissaggio della scheda, poi inseriscila in {{ui:referenceImage.distance}}. L’immagine mantiene le proporzioni e il centro.
- Blocca l’immagine con il lucchetto nell’intestazione delle sue impostazioni: resterà ferma e i clic passeranno attraverso di essa fino alla piastra. Per sbloccarla, selezionala nell’elenco degli oggetti.
- L’immagine viene salvata una sola volta nel file del progetto, anche se la copi o annulli l’operazione più volte. Un’immagine grande aumenta il file della stessa quantità; il messaggio che appare quando la aggiungi ne indica la dimensione.
- Un sistema di IA può aggiungere, spostare, calibrare, rendere trasparente e bloccare un’immagine con `layerling_reference_image`.

## Punti di riferimento

Un punto di riferimento è un semplice segno nello spazio, come una tacca fatta a matita o un punto di tracciatura in officina: non appartiene a un corpo, non viene mai stampato e permette agli altri oggetti di agganciarsi. Fai clic destro su un corpo e scegli {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} o {{ui:contextMenu.markMidpoints}}: i punti vengono posizionati sulla faccia superiore del corpo o, se hai selezionato più corpi, dell’intera selezione. {{ui:contextMenu.markFaceCenter}} mette invece un punto al centro della faccia piana su cui hai fatto clic destro, per esempio su un lato o su un’estremità. Con un perno impostato, {{ui:contextMenu.markPivot}} ne mette uno esattamente lì, così il centro di un'altra parte si aggancia al punto attorno a cui ruota la selezione.

- Trascina un punto per spostarlo oppure fai clic per visualizzarne le coordinate e digitarne di nuove; viene usata l’unità selezionata. Puoi spostare ogni scheda trascinandone la barra del titolo, senza influenzare le altre. Un doppio clic sulla barra la riporta al suo posto. L’ultima scheda toccata appare sopra le altre. **Elimina tutto** in una scheda o **Elimina tutti i punti di riferimento** nel menu che si apre facendo clic destro (su un corpo o in uno spazio vuoto della vista 3D) rimuove tutti i punti in una volta. {{ui:common.delete}} elimina il punto selezionato.
- Anche il metro a nastro può creare un punto: {{ui:camera.tapeMarkMiddle}}, il segno pieno a metà al centro di una misura, lo posiziona al centro; per esempio, al centro di un foro rotondo. Puoi anche misurare a partire da un punto: il metro si aggancia ai punti di riferimento come agli angoli.
- Quando trascini una forma, i suoi spigoli e il suo centro si agganciano ai punti proprio come si agganciano alle altre forme ({{ui:workspace.objectSnap}}). Anche la squadra si aggancia ai punti.
- I punti vengono salvati nel progetto, non compaiono nelle esportazioni e possono essere mostrati o nascosti insieme alle note con {{ui:visibility.notes}} ([[Shift]]+[[N]]).
- Un’IA può crearli, elencarli ed eliminarli con `layerling_add_reference_points`, `layerling_list_reference_points` e `layerling_remove_reference_points`.
