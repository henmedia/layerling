---
title: Solidi e fori
summary: Come le forme semplici diventano fori passanti, asole e cavità, e come modificare un gruppo in seguito.
---

È il concetto più importante di layerling e si impara in fretta: **ogni forma è un solido oppure un foro.** Un solido viene mantenuto. Un foro è uno strumento che sottrae materiale.

## Solido o foro

Seleziona una forma e fai clic su {{ui:inspector.solid}} o {{ui:inspector.hole}} nelle sue impostazioni. Con la tastiera fai prima: [[H]] trasforma la selezione in un foro, [[S]] la rende di nuovo solida. Trovi entrambi i comandi anche nel menu che si apre facendo clic destro sul corpo. Un foro è visualizzato in trasparenza, così puoi vedere dov’è. [[T]] rende trasparente un corpo, per esempio per guardare dentro un involucro; premilo di nuovo per renderlo opaco. Il comando agisce sull’intera selezione: se almeno un corpo è già trasparente, li rende tutti opachi; altrimenti li rende tutti trasparenti.

Finché gli elementi non vengono raggruppati, il foro non ha effetto. Resta semplicemente nella posizione in cui verrà sottratto il materiale.

![Il cilindro è un foro. Sporge dalla parte superiore del cubo e lo attraversa da parte a parte.](shot:hole-before)

## Raggruppare

Seleziona solidi e uno o più fori e fai clic su {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). I fori sottraggono il materiale dai solidi che attraversano. Il materiale rimanente diventa un’unica nuova forma.

![Il risultato: un cubo con un foro passante.](shot:hole-after)

Con mesh grandi, come un STL importato con centinaia di migliaia di triangoli, il taglio richiede qualche secondo. layerling lavora allora in background e mostra "{{ui:status.computing}}"; nel frattempo puoi ruotare la vista e usare l'interfaccia. Se nel frattempo cambi la scena, il risultato viene scartato e layerling te lo dice. Lo stesso vale per {{ui:editor.tool.split}}.

In questo modo puoi creare:

- **Fori passanti:** un cilindro impostato come foro attraversa un corpo.
- **Asole:** una scatola allungata impostata come foro sul bordo.
- **Cavità:** un foro che non attraversa completamente il corpo.
- **Filettature in un pezzo:** un foro filettato impostato come foro; vedi [Filettature e meccanica](chapter:threads-and-mechanics).

Se il gruppo contiene più solidi, questi vengono uniti. Due solidi a contatto diventano un unico pezzo.

Puoi trattare un gruppo come una forma: spostarlo, ruotarlo, cambiarne il colore e raggrupparlo di nuovo. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) scioglie il gruppo e ripristina le singole parti.

### Trasformare un gruppo in un foro

Anche un intero gruppo può essere solido o foro. Si applica una regola semplice:

- Se il gruppo contiene solo solidi (o solo fori), puoi cambiare lo stato dell’intero gruppo e tutte le sue parti lo seguono.
- Se contiene sia solidi sia fori, come un cubo con un foro passante, ogni parte mantiene il proprio stato. L’intero gruppo diventa uno strumento di sottrazione, ma il foro resta un foro.

### Ridimensionare un gruppo: mantenere fori e parti piccole

Quando un gruppo diventa più lungo, più largo o più alto, le sue parti si allungano con lui come se fossero disegnate sulla gomma: i fori rotondi di una piastra diventano ovali e si spostano verso l'interno. Per lasciarli come sono, scegli {{ui:inspector.groupResizeKeepParts}} in {{ui:inspector.groupResize}} nelle impostazioni del gruppo; {{ui:inspector.groupResizeStretch}} è ciò che fa ogni gruppo finché non lo cambi. Da quel momento, ogni volta che il gruppo cambia dimensione - con le maniglie, nei campi delle misure o con {{ui:scalePercent.title}} - viene ricostruito dalle sue parti secondo un'unica regola, direzione per direzione:

- Una parte che attraversa quasi tutto il gruppo, nove decimi o più, cresce o si riduce con esso e mantiene la distanza da entrambi i lati: la piastra stessa, una parete o l'interno di una scatola, le cui pareti restano spesse come prima.
- Ogni altra parte mantiene la propria dimensione e la distanza dal lato più vicino. Una parte al centro resta al centro.

Una piastra con un foro a 5 mm da ogni angolo e un'asola al centro, allungata di 40 mm, mantiene quindi i fori rotondi e a 5 mm dagli angoli, e l'asola al centro. Dietro non c'è alcun risolutore di vincoli e non c'è niente da impostare parte per parte: la stessa regola vale per tutte le parti, così sai in anticipo cosa succederà. Una parte ruotata conta con il riquadro che occupa nel gruppo e resta ruotata; un gruppo dentro il gruppo conta come una sola parte. Mentre trascini una maniglia, il gruppo si allunga tutto intero; quando la rilasci, viene ricostruito, nello stesso passo di annullamento. Se il gruppo diventa più piccolo di quanto serve a una parte con la sua distanza, quella parte si riduce con esso come prima, e un messaggio lo segnala. Un gruppo specchiato, rastremato o ritorto, o con raccordi, smussi o una texture propri, allunga sempre tutto. Scelta per un gruppo già allungato, l'impostazione ridispone subito le sue parti.

![Una piastra con un foro a 5 mm da ogni angolo e un'asola al centro, allungata di 40 mm con «Mantieni fori e parti piccole»: i fori sono ancora rotondi e a 5 mm dagli angoli, l'asola è ancora al centro.](shot:group-keep-parts)

## Creare un insieme

A volte vuoi tenere insieme più parti senza fonderle, per esempio un logo bianco su una piastra nera per una stampa multicolore. A questo serve {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), come in Tinkercad. Un insieme si sposta, ruota e ridimensiona come una forma, ma le sue parti non vengono unite:

- Ogni parte mantiene il suo colore e resta un solido o un foro. Le impostazioni del gruppo libero hanno le stesse schede di un gruppo: {{ui:inspector.solid}} e {{ui:inspector.hole}} per l'intero insieme (che mantengono i colori delle parti), {{ui:inspector.transparent}} ([[T]]) e {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); con Multicolore disattivato l'insieme si mostra e si esporta in un solo colore. {{ui:inspector.separateParts}} scompone l'insieme, come fa [[Ctrl]]+[[Shift]]+[[G]].

- Ogni parte conserva il proprio colore e resta un solido o un foro.
- I fori non sottraggono materiale. Se raggruppi l’insieme con altre parti, i suoi fori sottraggono materiale da quelle parti, ma non dai solidi dello stesso insieme, come in Tinkercad. Puoi quindi riutilizzare, per esempio, un perno insieme al foro che lo affianca.
- Nell’esportazione STL, 3MF o OBJ ogni parte resta un corpo indipendente; in 3MF e OBJ mantiene anche il proprio colore.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) scioglie l’insieme; [[E]] lo apre per la modifica, come un gruppo. Smussi, raccordi e svuotamento non funzionano su un insieme perché non è un corpo unico: raggruppalo per applicare questi strumenti oppure modifica le parti singolarmente. Se un foro dell’insieme deve sottrarre materiale anche ai solidi che contiene, sciogli l’insieme e raggruppa le parti ([[Ctrl]]+[[G]]).

## Intersezione

{{ui:editor.tool.intersect}} conserva solo la parte condivisa da due o più corpi. Sovrapponi due forme, selezionale entrambe e fai clic sullo strumento. Per esempio, puoi combinare un cilindro e una scatola per ottenere un pezzo con un lato curvo e uno diritto. Un gruppo viene considerato per la forma che ha, compresi i fori. Se selezioni anche un foro, il risultato è la parte comune a tutti i solidi e a tutti i fori. Se le forme non hanno alcuna parte in comune, non cambia nulla e compare un messaggio. Il primo clic mostra la parte condivisa prima di applicare l’operazione: le forme selezionate diventano trasparenti e la parte comune viene evidenziata in verde. Seleziona e sposta ogni forma separatamente: la parte verde la segue. Un secondo clic su {{ui:editor.tool.intersect}} applica l’intersezione; [[Esc]] chiude l’anteprima. Le forme con troppi triangoli per l’anteprima, come mesh importate di grandi dimensioni, vengono intersecate già al primo clic.

{{ui:editor.tool.hull}} avvolge le forme selezionate in un unico corpo convesso, come se fossero termoretratte: il corpo più piccolo senza rientranze che le contiene tutte. Una semisfera su un cilindro diventa una cupola senza gradino, quattro cilindri agli angoli diventano una scatola con angoli arrotondati, due sfere una capsula. I fori nella selezione vengono poi tagliati dall'involucro. Le parti restano al suo interno: {{ui:group.edit}} apre l'involucro come un gruppo, e spostare lì una parte e richiuderlo ricostruisce l'involucro. L'involucro è una mesh, quindi le forme rotonde mostrano sfaccettature, e gli strumenti per gli spigoli funzionano su di esso come su qualsiasi mesh. Quando sono selezionati solo fori, l'involucro è esso stesso un foro: due fori cilindrici tagliano un'asola.

{{ui:editor.tool.cookieCutter}} crea un tagliabiscotti dalla selezione: una parete sottile attorno al contorno, alta 15 mm, e un bordo piatto di 2 mm attorno alla sua base, così il tagliabiscotti poggia sul bordo e il pollice ha qualcosa da premere. Seleziona un SVG importato o un corpo da schizzo e ne viene usato il contorno. Un testo disteso dà le curve stesse delle sue lettere. Qualsiasi altra forma, costruita, una mesh importata o più parti, dà ciò su cui poggia: il contorno che il piano di lavoro taglia attraverso di essa, quindi mettila prima sul piano di lavoro. Le parti che si sovrappongono danno un solo contorno attorno a tutte, come se fossero raggruppate; le parti separate danno un tagliabiscotti ciascuna, nello stesso insieme. Il contorno viene specchiato da sinistra a destra: il tagliabiscotti si stampa in piedi sul bordo e si capovolge per tagliare, così un testo o un logo esce dall'impasto nel verso giusto. La cima della parete si restringe in un tagliente largo 0,4 mm. I fori nel contorno, l'interno di una e o di una a, ricevono pareti proprie, così vengono anch'essi tagliati via dal biscotto. Sono un corpo a sé nell'insieme, {{ui:cookieCutter.part.innerWalls}}: per avere un testo o un motivo solo impresso nell'impasto invece che tagliato, rendile più basse nelle Proprietà. Con una parete di 15 mm e un impasto spesso 5 mm, pareti interne di 12 mm premono per 2 mm. Le pareti interne più basse della parete esterna hanno la cima piatta invece del tagliente: premono soltanto, e un tagliente lascerebbe punte sottili che si spezzano e solchi che trattengono l'impasto. Dai loro un tagliente nelle Proprietà se lo vuoi. Due ponti sul bordo, dal lato su cui preme la mano, tengono ogni parete interna alla parete che la circonda, distribuiti attorno, larghi 4 mm e alti 3 mm. Ogni ponte poggia con tutta la sua larghezza sulle pareti, al centro di un lato che corre lungo il contorno, e mai attraverso un altro pezzo. Anche i pezzi affiancati, come le lettere di un nome, vengono uniti tra loro, prima i più vicini, così i ponti corrono come una rete attraverso tutti e anche una lettera in mezzo a una parola resta tenuta. Un clic sullo strumento apre una piccola finestra: lì scegli una {{ui:cookieCutter.support.plate}} al posto dei ponti, che riempie l'intero contorno sul lato che premi, è più stabile e aderisce meglio al piano di stampa, ma non permette più di spingere fuori l'impasto da dietro. {{ui:cookieCutter.fillet}} mette piccoli raccordi a 45° dove le pareti poggiano sul bordo, sui ponti o sulla piastra, così le parti sottili come il punto di una i non si staccano; sono un corpo a sé nell'insieme. Lì imposti anche di quanto sono più basse le pareti interne e se il contorno viene specchiato; i valori restano per il tagliabiscotti successivo. Cambia la loro altezza nelle Proprietà come quella del bordo. Il tagliabiscotti sostituisce la selezione come un insieme di corpi da schizzo, {{ui:group.edit}} lo apre. Parete, pareti interne e bordo sono le modalità di riempimento dello schizzo, una linea all'esterno della sagoma: cambia spessore, altezza o colore di ciascuna nelle Proprietà, e lì anche il {{ui:prop.sketchCuttingEdge}} della parete (0 per una cima piatta). Dove una curva stretta non lascia spazio per uno smusso su entrambi i lati, la parete viene smussata solo all'esterno, fino allo stesso tagliente. Dove un contorno non si può smussare affatto - un logo con punte aguzze, un contorno tagliato dai triangoli di un corpo - il tagliente viene invece costruito a gradini fini di 0,1 mm, che uno strato di stampa di 0,2 mm non distingue dalla pendenza; una parete così è una mesh di triangoli invece di un corpo esatto. Per mantenere il contorno come disegnato, specchia di nuovo il tagliabiscotti con {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Funziona anche un'immagine PNG o JPG: importata, viene ricalcata in un corpo da schizzo, e il tagliabiscotti segue quello.

{{ui:editor.tool.loftSketches}} unisce due corpi da schizzo o SVG importati in un unico corpo: il contorno di quello in basso alla base, il contorno di quello in alto in cima, con pareti diritte tra loro. Così nasce un imbuto, un raccordo da quadrato a rotondo o una cornice che si restringe verso l'alto. Metti i due corpi uno sopra l'altro dove devono stare, spostati e ruotati se vuoi, selezionali entrambi e fai clic sullo strumento. Il loft va dalla base del corpo inferiore alla cima di quello superiore.

## Ritagliare un corpo da un altro

Per parti che devono combaciare, un albero in un manicotto o una vite in un alloggiamento, fai una parte e la ritagli dall'altra. Seleziona i due corpi e clicca su {{ui:editor.tool.cutOut}} nell'area {{ui:editor.group.combine}}, oppure fai clic destro e sceglilo lì. La finestra nomina la parte che resta e il corpo che riceve la cavità; layerling prende il più piccolo come parte, e {{ui:cutOut.swap}} lo inverte. {{ui:cutOut.clearance}} rende la cavità più grande della parte di altrettanto tutto intorno: 0 combacia esattamente, 0,2 mm è un gioco abituale per un accoppiamento stampato. {{ui:cutOut.apply}} ritaglia una copia della parte dall'altro corpo e lascia la parte dov'è. Il risultato è un gruppo: {{ui:editor.tool.ungroup}} separa di nuovo il taglio. Un gioco richiede che la parte sia un corpo esatto, come per lo strumento {{ui:editor.tool.offset}}, che viene usato per questo.

## Punzonare un contorno attraverso un corpo

Per tagliare il contorno di un corpo dritto attraverso un altro, seleziona prima il punzone e poi il corpo da punzonare, e fai clic su {{ui:editor.tool.punch}} nell'area {{ui:editor.group.combine}}, oppure sceglilo con un clic destro. I due non devono toccarsi: il punzone può stare ovunque davanti al corpo e conta solo il suo contorno visto lungo la {{ui:punch.axis}}. Una teiera tenuta sopra una piastra lascia così un'apertura a forma di teiera. layerling parte dall'asse lungo il quale il punzone è più lontano dal corpo; X va da sinistra a destra, Y da davanti a dietro, Z verso l'alto. {{ui:punch.swap}} inverte i ruoli, e il {{ui:punch.clearance}} allarga l'apertura su ogni lato, 0,2 mm per un pezzo stampato che deve passarci. {{ui:punch.apply}} raggruppa l'apertura con il corpo come corpo di schizzo esatto impostato come foro, così {{ui:editor.tool.ungroup}} la toglie di nuovo; il punzone resta dov'è. Spostalo o ruotalo e punzona di nuovo per un'altra apertura.

## Modificare un gruppo

Se il foro passante è venuto troppo piccolo, non devi sciogliere il gruppo e ricostruirlo. Seleziona il gruppo e fai clic su {{ui:group.edit}} nelle sue impostazioni, sull’icona della cartella nell’elenco degli oggetti oppure premi [[E]]. Anche un doppio clic sul gruppo lo apre, come in Tinkercad; lo stesso vale per un insieme. Se preferisci disattivare questa funzione, usa {{ui:workspace.doubleClickOpensGroup}} nelle impostazioni. Una parte inizia a spostarsi solo dopo che il puntatore ha percorso alcuni pixel, così un clic incerto o un doppio clic non la sposta accidentalmente. A questo punto le parti sono separate e puoi modificarle con qualsiasi strumento: ingrandire un foro, spostare un corpo o aggiungere un altro foro.

![Modifica del gruppo: la barra in basso contiene i comandi Annulla e Fine; l’elenco degli oggetti mostra le singole parti.](shot:open-group)

In fondo alla vista compare una barra. {{ui:group.done}} ricostruisce il gruppo mantenendone nome, colore e stato, solido o foro. {{ui:common.cancel}} lo ripristina senza modifiche.

Se una delle parti è a sua volta un gruppo, puoi modificarlo nello stesso modo e continuare a scendere nei livelli del progetto. La barra mostra dove ti trovi, per esempio “Supporto › Sede vite”. {{ui:group.done}} e {{ui:common.cancel}} chiudono sempre il gruppo più interno e risalgono di un livello. All’interno di un gruppo puoi modificare solo gli altri gruppi che ne fanno parte; per modificarne un altro, esci prima da quello corrente.

A differenza di {{ui:editor.tool.ungroup}}, che scioglie definitivamente il gruppo, la modifica lo conserva: nome e impostazioni restano e puoi sempre tornare indietro con {{ui:common.cancel}}.

Attenzione: ricostruendo il gruppo si perdono i raccordi e gli smussi applicati all’**intero** gruppo. La barra te lo segnala.

## Dividere

{{ui:editor.tool.split}} nell’area {{ui:editor.group.modify}} taglia la selezione in due parti lungo un piano, per esempio per separare un pezzo troppo grande per il piatto di stampa o per guardarne l’interno. Seleziona uno o più solidi o fori e fai clic sullo strumento. Un piano traslucido mostra esattamente dove avverrà il taglio; una linea bianca indica dove incontra i corpi. Finché non confermi, non cambia nulla.

- **{{ui:split.orientation}}:** **X** esegue un taglio verticale tra sinistra e destra; **Y** tra davanti e dietro; **Z** un taglio orizzontale tra sopra e sotto. Gli assi hanno lo stesso nome che compare nel riquadro Posizione, con Z verso l’alto. Il piano inizia parallelo al piano di lavoro, quindi lungo Z quando il piano di lavoro è sulla piastra di base.
- **{{ui:split.workplane}}:** {{ui:split.workplaneParallel}} dispone il piano di taglio parallelo al piano di lavoro; {{ui:split.workplaneAcrossX}} e {{ui:split.workplaneAcrossY}} lo dispongono perpendicolarmente, lungo la direzione X o Y del piano. Se l’origine del piano di lavoro attraversa la selezione, il taglio passa da lì; altrimenti passa per il centro. Puoi quindi posizionare il piano di lavoro su una faccia inclinata con [[W]] e tagliare proprio in quel punto, senza regolare i cursori.
- **{{ui:split.position}}:** imposta il punto attraversato dal piano, usando il cursore o digitando un valore. Inizialmente è al centro. Puoi anche trascinare la punta della freccia sul piano per spostarlo lungo di essa a intervalli di 0,1 mm.
- **{{ui:split.pickFace}}**, il pulsante accanto alla posizione, appoggia il piano su una faccia: fai clic sul pulsante e poi sulla faccia. L’orientamento, entrambe le rotazioni e la posizione vengono impostati per corrispondere a essa. Durante la selezione, un piano blu sotto il puntatore mostra quale faccia verrà usata. Puoi scegliere anche una faccia di un corpo non selezionato per allineare il taglio, ma il piano resta all’interno della selezione. [[Esc]] interrompe la scelta e lascia il piano dov’era.
- I due cursori di rotazione sottostanti inclinano il piano attorno agli altri due assi, fino a 180° in entrambe le direzioni, per eseguire un taglio obliquo. Puoi combinarli.

{{ui:split.apply}} o [[Enter]] esegue il taglio; [[Esc]] lo annulla. Durante la scelta di una faccia, il primo [[Esc]] interrompe solo quella selezione. Ogni oggetto attraversato dal piano diventa due corpi chiusi, nominati in base al lato, per esempio “Scatola (Z+)” e “Scatola (Z-)”; gli oggetti non raggiunti restano invariati. Un foro diventa due fori e un corpo svuotato conserva la cavità interna. Le due metà restano nella posizione originale; per stamparle, appoggiale sulla faccia appena tagliata con {{ui:editor.tool.layFlat}}.

I {{ui:split.connectors}} riallineano le metà, come fanno gli strumenti di taglio di PrusaSlicer, OrcaSlicer e Bambu Studio. Con {{ui:split.connectors.none}}, l'impostazione predefinita, la divisione avviene come descritto sopra. {{ui:split.connectors.dowels}} fa un foro in ciascuna metà e spine separate che entrano in entrambe: le spine arrivano come terzo corpo, in piedi accanto alle metà sul loro fondo, da stampare con esse – in piedi escono rotonde negli strati come i loro fori, ed è proprio ciò che misura la prova di accoppiamento. {{ui:split.connectors.plugs}} mette perni rotondi sulla metà il cui nome finisce con un meno, con i fori per loro nell'altra metà. I connettori entrano perpendicolari al piano, comunque sia ruotato, ciascuno con il suo diametro e 1,2 mm di materiale fino a ogni bordo della faccia di taglio, e due di loro al doppio di distanza tra loro. Ogni pezzo separato della faccia di taglio riceve i propri, distribuiti in modo uniforme: {{ui:split.connectorCount}} dice quanti, e 0 lo lascia alle dimensioni del pezzo, almeno due. Un pezzo troppo piccolo per uno non ne riceve nessuno, e un connettore viene omesso dove una metà è più sottile della profondità del suo foro; il pannello lo dice prima della divisione, e anelli bianchi sul piano mostrano dove andranno. Se non ne entra nessuno, le parti vengono divise senza e la barra di stato lo segnala.

- {{ui:split.connectorDiameter}} è quello delle spine e dei perni, all'inizio 5 mm.
- {{ui:split.connectorDepth}} è quanto ogni foro entra nella sua metà. Una spina è lunga il doppio meno 0,6 mm e un perno 0,3 mm meno del suo foro, così non poggiano mai sul fondo di un foro e le metà si chiudono del tutto. Spine e perni hanno un piccolo smusso alle estremità, e ogni foro uno all'imbocco, così un primo strato schiacciato non lo restringe.
- {{ui:split.connectorClearance}} è lo spazio tra una spina o un perno e il suo foro. Una volta misurato il gioco della tua stampante con la prova di accoppiamento (nel capitolo sulla stampa), parte da lì, altrimenti da 0,2 mm.

{{ui:split.connectors.dovetail}} tiene insieme le metà senza colla, come il taglio a coda di rondine di OrcaSlicer: una linguetta che si allarga allontanandosi dalla faccia di taglio sta sulla metà il cui nome finisce con un meno e attraversa la faccia in linea retta, da bordo a bordo; l'altra metà riceve la scanalatura corrispondente, aperta a entrambe le estremità. Fai scorrere le metà l'una nell'altra di lato, lungo la linguetta; una volta dentro non si possono più separare di traverso al taglio. Le linguette seguono il lato lungo della faccia di taglio, e quando un corpo incontra il piano in più pezzi vanno tutte nella stessa direzione, così una metà si infila con un solo movimento. {{ui:split.connectorCount}} è il numero di linguette affiancate su ogni pezzo; 0 lo lascia alla larghezza del pezzo, una ogni sei larghezze di linguetta, almeno una. Accanto alla sua sommità larga una linguetta tiene metà della propria larghezza e altri 1,2 mm di materiale fino al bordo della faccia di taglio, e due linguette il doppio tra loro. Un pezzo troppo stretto per una linguetta, o troppo corto nel suo senso, non ne riceve nessuna, e una linguetta viene omessa dove l'altra metà è più sottile della profondità della sua scanalatura. Contorni bianchi sul piano mostrano dove andranno: la striscia piena è il piede della linguetta, la linea intorno la sua sommità larga.

- {{ui:split.dovetailWidth}} è la larghezza della linguetta dove esce dalla faccia di taglio, 6 mm all'inizio.
- {{ui:split.dovetailDepth}} è quanto sporge dalla faccia di taglio nell'altra metà, 4 mm all'inizio. La scanalatura è 0,3 mm più profonda, così le metà si chiudono del tutto.
- {{ui:split.dovetailAngle}} è quanto ogni fianco si inclina verso l'esterno rispetto alla perpendicolare alla faccia di taglio, da 5° a 30°, 15° all'inizio. Più è grande, più la sommità della linguetta è larga e più tiene.
- {{ui:split.dovetailTurn}}: 0 mette le linguette per il lungo, 90 di traverso alla faccia di taglio, e un angolo intermedio le ruota altrettanto.
- {{ui:split.connectorClearance}} è lo spazio su ciascun lato tra la linguetta e la sua scanalatura, dalla tua prova di accoppiamento come per le spine. Le estremità della linguetta sono smussate tutto intorno perché trovi la scanalatura, e la scanalatura ha uno smusso all'imbocco.

Per la stampa appoggia la metà con la scanalatura sulla sua faccia di taglio e stampa la metà con la linguetta al contrario, con la faccia di taglio in alto: i fianchi della linguetta si inclinano allora verso l'esterno solo del loro angolo, e si stampa senza supporti.

Gli oggetti foro si dividono senza connettori.

Le metà sono mesh semplici: impostazioni come il numero di lati di un cilindro o le caratteristiche di un testo vengono perse, quindi regolale prima di dividere. [[Ctrl]]+[[Z]] ripristina l’originale in un solo passaggio. Gli oggetti bloccati o nascosti non possono essere divisi.

## Separare le parti

Se una forma è composta da più elementi separati, come un testo formato da lettere indipendenti, {{ui:inspector.separateParts}} li divide in forme autonome. Trovi il comando anche nel menu che si apre facendo clic destro sulla forma.

> **Suggerimento:** crea sempre i fori un po’ più lunghi della parte che devono attraversare. Se terminano esattamente a filo della faccia, a volte resta una pellicola sottilissima di materiale. Superare la faccia di un millimetro evita il problema.
