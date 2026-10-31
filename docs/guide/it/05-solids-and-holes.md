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

## Creare un insieme

A volte vuoi tenere insieme più parti senza fonderle, per esempio un logo bianco su una piastra nera per una stampa multicolore. A questo serve {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), come in Tinkercad. Un insieme si sposta, ruota e ridimensiona come una forma, ma le sue parti non vengono unite:

- Ogni parte conserva il proprio colore e resta un solido o un foro.
- I fori non sottraggono materiale. Se raggruppi l’insieme con altre parti, i suoi fori sottraggono materiale da quelle parti, ma non dai solidi dello stesso insieme, come in Tinkercad. Puoi quindi riutilizzare, per esempio, un perno insieme al foro che lo affianca.
- Nell’esportazione STL, 3MF o OBJ ogni parte resta un corpo indipendente; in 3MF e OBJ mantiene anche il proprio colore.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) scioglie l’insieme; [[E]] lo apre per la modifica, come un gruppo. Smussi, raccordi e svuotamento non funzionano su un insieme perché non è un corpo unico: raggruppalo per applicare questi strumenti oppure modifica le parti singolarmente. Se un foro dell’insieme deve sottrarre materiale anche ai solidi che contiene, sciogli l’insieme e raggruppa le parti ([[Ctrl]]+[[G]]).

## Intersezione

{{ui:editor.tool.intersect}} conserva solo la parte condivisa da due o più corpi. Sovrapponi due forme, selezionale entrambe e fai clic sullo strumento. Per esempio, puoi combinare un cilindro e una scatola per ottenere un pezzo con un lato curvo e uno diritto. Un gruppo viene considerato per la forma che ha, compresi i fori. Se selezioni anche un foro, il risultato è la parte comune a tutti i solidi e a tutti i fori. Se le forme non hanno alcuna parte in comune, non cambia nulla e compare un messaggio. {{ui:editor.tool.intersectPreview}}, accanto allo strumento, mostra la parte condivisa prima di applicare l’operazione: le forme selezionate diventano trasparenti e la parte comune viene evidenziata in verde. Seleziona e sposta ogni forma separatamente: la parte verde la segue. {{ui:editor.tool.intersect}} applica l’intersezione; [[Esc]] chiude l’anteprima.

## Ritagliare un corpo da un altro

Per parti che devono combaciare, un albero in un manicotto o una vite in un alloggiamento, fai una parte e la ritagli dall'altra. Seleziona i due corpi e clicca su {{ui:editor.tool.cutOut}} nell'area {{ui:editor.group.combine}}, oppure fai clic destro e sceglilo lì. La finestra nomina la parte che resta e il corpo che riceve la cavità; layerling prende il più piccolo come parte, e {{ui:cutOut.swap}} lo inverte. {{ui:cutOut.clearance}} rende la cavità più grande della parte di altrettanto tutto intorno: 0 combacia esattamente, 0,2 mm è un gioco abituale per un accoppiamento stampato. {{ui:cutOut.apply}} ritaglia una copia della parte dall'altro corpo e lascia la parte dov'è. Il risultato è un gruppo: {{ui:editor.tool.ungroup}} separa di nuovo il taglio. Un gioco richiede che la parte sia un corpo esatto, come per lo strumento {{ui:editor.tool.offset}}, che viene usato per questo.

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

Le metà sono mesh semplici: impostazioni come il numero di lati di un cilindro o le caratteristiche di un testo vengono perse, quindi regolale prima di dividere. [[Ctrl]]+[[Z]] ripristina l’originale in un solo passaggio. Gli oggetti bloccati o nascosti non possono essere divisi.

## Separare le parti

Se una forma è composta da più elementi separati, come un testo formato da lettere indipendenti, {{ui:inspector.separateParts}} li divide in forme autonome. Trovi il comando anche nel menu che si apre facendo clic destro sulla forma.

> **Suggerimento:** crea sempre i fori un po’ più lunghi della parte che devono attraversare. Se terminano esattamente a filo della faccia, a volte resta una pellicola sottilissima di materiale. Superare la faccia di un millimetro evita il problema.
