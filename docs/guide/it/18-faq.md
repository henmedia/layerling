---
title: Domande frequenti
summary: Risposte brevi alle domande più comuni, su salvataggio, modelli grandi, raccordi, IA e stampa, ognuna con il percorso verso la spiegazione completa.
contents: questions
---

Ogni risposta è breve e termina con il punto di questa guida che spiega tutto per intero. La casella di ricerca in alto trova una domanda con qualsiasi parola che contiene.

## Salvataggio e backup

### Dove sono salvati i miei progetti? C’è un cloud?

Nel browser del tuo computer. Non c’è un account né un cloud, e non viene caricato nulla; ogni modifica si salva da sola. Chi fa funzionare layerling su un proprio server può anche conservare lì i progetti in una cartella condivisa.

Per saperne di più: [Dove si trovano i progetti](chapter:files-and-saving#dove-si-trovano-i-progetti)

### I miei progetti sono spariti. Che cosa è successo?

I progetti si trovano in un solo browser su un solo computer. Spariscono se sono stati cancellati i dati che il browser conservava per la pagina, e non compaiono in un altro browser o su un altro computer. Safari su Mac, iPhone e iPad elimina i dati di una pagina dopo sette giorni senza visite, a meno che layerling non sia installato come app. Se hai un backup, {{ui:dashboard.restoreBackup}} nella pagina iniziale riporta i progetti, con le loro cartelle e immagini.

Per saperne di più: [I tuoi progetti, il tuo backup](chapter:files-and-saving#i-tuoi-progetti-il-tuo-backup)

### Come faccio il backup di tutto, anche automaticamente in una cartella?

{{ui:dashboard.backupAll}} nella pagina iniziale raccoglie tutti i progetti in un unico file ZIP. Inoltre layerling conserva da solo le versioni precedenti di ogni progetto, e in Chrome ed Edge può scrivere ognuna di esse, come file .lyl, in una cartella scelta da te. Le versioni conservate nel browser si perdono quando si perdono i dati del browser, quindi non sostituiscono lo ZIP né la cartella.

Per saperne di più: [Versioni precedenti](chapter:files-and-saving#versioni-precedenti)

### Come porto un progetto su un altro computer o browser?

Salvalo come file .lyl dalla finestra di esportazione e apri quel file sull’altro computer dalla pagina iniziale. Per tutti i progetti insieme, usa {{ui:dashboard.backupAll}} qui e {{ui:dashboard.restoreBackup}} là; i progetti già presenti non vengono aggiunti due volte.

Per saperne di più: [Fare copie di sicurezza e condividere i progetti](chapter:files-and-saving#fare-copie-di-sicurezza-e-condividere-i-progetti)

### Che cosa succede se cancello i dati del browser?

I progetti salvati in quel browser vengono eliminati, e così pure le versioni precedenti che layerling conservava lì. Uno ZIP creato con {{ui:dashboard.backupAll}}, i tuoi file .lyl e una cartella di backup sul tuo disco non vengono toccati. Prima fai il backup, poi cancella.

Per saperne di più: [I tuoi progetti, il tuo backup](chapter:files-and-saving#i-tuoi-progetti-il-tuo-backup)

### Come torno a uno stato precedente?

Annulla torna indietro un passaggio alla volta. La vista cronologia mostra ogni passaggio con un cursore senza modificare il progetto, e può creare un nuovo progetto da uno qualsiasi di essi. Per uno stato di qualche ora prima o della settimana scorsa, l’elenco delle versioni precedenti apre una vecchia versione come nuovo progetto e lascia quello attuale com’è.

Per saperne di più: [Rivedere la cronologia](chapter:select-and-arrange#rivedere-la-cronologia) e [Versioni precedenti](chapter:files-and-saving#versioni-precedenti)

### STL e 3MF possono andare direttamente nella cartella del mio progetto? E come torno ad avere un download?

In Chrome ed Edge la prima esportazione di un progetto chiede dove salvare, e le esportazioni successive scrivono nello stesso file senza chiedere. Firefox e Safari scaricano sempre. Se vuoi un download ogni volta, attiva {{ui:workspace.stlAsDownload}} nelle impostazioni.

Per saperne di più: [Esportare](chapter:files-and-saving#esportare)

### La finestra di salvataggio si è chiusa e non c’è nessun file. Perché?

Il browser segnala una finestra che non ha potuto usare allo stesso modo di una che hai annullato, e anche un file bloccato da un antivirus non può essere scritto. Il messaggio in alto offre allora {{ui:status.saveAsDownload}}, che mette il file tra i tuoi download. Per saltare la finestra una volta per tutte, attiva {{ui:workspace.lylAsDownload}} e {{ui:workspace.stlAsDownload}} nelle impostazioni.

Per saperne di più: [Fare copie di sicurezza e condividere i progetti](chapter:files-and-saving#fare-copie-di-sicurezza-e-condividere-i-progetti)

## Installazione e aggiornamenti

### C’è un’app da scaricare?

layerling si installa dal browser: ha poi un’icona e una finestra proprie e si avvia senza rete. Non c’è nessun programma di installazione da scaricare, e l’originale si trova solo su layerling.com. **Non scaricare né eseguire un programma di installazione di "layerling" da nessun altro sito:** non proviene da layerling e può contenere malware. Per far funzionare una tua copia ci sono un avvio rapido per Windows e un’immagine Docker.

Per saperne di più: [Installare come app](chapter:offline-and-install#installare-come-app) e [Usare layerling sul proprio computer o server](chapter:offline-and-install#usare-layerling-sul-proprio-computer-o-server)

### layerling funziona senza internet?

Sì, dopo la prima visita si avvia senza rete, meglio se installato come app. Una sola cosa viene caricata solo quando serve per la prima volta: il kernel CAD per la prima esportazione STEP, circa 22 MB.

Per saperne di più: [Installare come app](chapter:offline-and-install#installare-come-app)

### Come ricevo un aggiornamento?

Arriva da solo. Una pagina aperta si accorge di una nuova versione e mostra una scheda con le novità; {{ui:newVersion.reload}} salva prima il progetto aperto e poi carica la nuova versione. Anche la pagina iniziale segnala una versione più recente.

Per saperne di più: [Aggiornamenti](chapter:offline-and-install#aggiornamenti)

### Quali browser e tablet funzionano?

Chrome, Edge, Firefox e Safari, su computer, tablet o telefono; la vista 3D richiede WebGL. Alcune cose le sanno fare solo Chrome ed Edge: scrivere nei tuoi file e nelle tue cartelle, usare la cartella di backup e aprire i file .lyl con un doppio clic. Su un tablet un dito fa quello che fa il tasto sinistro del mouse.

Per saperne di più: [Dita e stilo](chapter:tablet-and-touch#dita-e-stilo)

## IA

### Qual è il modo più semplice per configurare un’IA?

Dai a un’IA che può lavorare sul tuo computer l’indirizzo `https://github.com/henmedia/layerling` e chiedile di configurare per te layerling con il suo server MCP. Serve un programma come la scheda Code dell’app Claude, Claude Code, Codex, Antigravity, Gemini CLI o Grok Build. Per Windows e Mac la guida riporta anche i passaggi uno per uno.

Per saperne di più: [Passo dopo passo per principianti](chapter:ai-with-mcp#passo-dopo-passo-per-principianti)

### Perché l’IA non riesce a raggiungere layerling.com?

Il ponte tra l’IA e l’editor esiste solo in una copia di layerling che funziona sul tuo computer. Su layerling.com è sempre disattivato, e una chat nel browser non può installare nulla. Quindi l’IA ha bisogno di un layerling avviato in locale e di un programma che parli MCP.

Per saperne di più: [Configurazione](chapter:ai-with-mcp#configurazione)

### L’app installata è una copia locale?

No, se l’hai installata da layerling.com: resta layerling.com in una finestra propria, anche se si avvia pure senza internet. Con una copia locale sul tuo computer è in funzione un piccolo server, e attraverso di esso l’IA parla con l’editor tramite MCP; l’app web non ha un server del genere. Dopo l’avvio rapido la tua copia è all’indirizzo `http://127.0.0.1:3000/`.

Per saperne di più: [Configurazione](chapter:ai-with-mcp#configurazione)

### Quale IA funziona, e quanto costa?

Qualsiasi programma che parli MCP; la guida descrive Claude, Codex, Gemini, Antigravity e Grok Build. Una chat su un sito web o in un’app per telefono non raggiunge layerling, perché non può avviare nulla sul tuo computer. layerling in sé non costa nulla. Il costo dell’IA dipende dal suo fornitore: la scheda Code dell’app Claude, per esempio, fa parte dei piani Claude a pagamento.

Per saperne di più: [Configurazione](chapter:ai-with-mcp#configurazione)

### Quali dati arrivano al fornitore dell’IA?

Quello che l’IA legge: gli oggetti del progetto aperto e le immagini della vista che acquisisce. Tutto questo arriva al fornitore del tuo programma di IA come qualsiasi altra cosa che scrivi lì. Il ponte funziona sul tuo computer, e senza un’IA non ne esce nulla.

Per saperne di più: [Cosa può fare l’IA](chapter:ai-with-mcp#cosa-puo-fare-l-ia)

## Memoria, velocità e cronologia

### Perché layerling diventa lento con il mio STL?

Un STL è una mesh di triangoli, e una mesh molto grande rallenta l’editor, occupa molta memoria e rende lento il salvataggio. layerling lo segnala dopo l’importazione a partire da 400.000 triangoli in una mesh, o un milione nell’intero progetto. Semplifica prima la mesh, importa solo le parti che ti servono, oppure costruisci il pezzo con le forme di layerling.

Per saperne di più: [Mesh grandi](chapter:files-and-saving#mesh-grandi)

### Perché mancano dei passaggi nella mia cronologia?

Due cose la accorciano. L’impostazione {{ui:workspace.savedHistory}} conserva 100 passaggi per progetto se non la cambi, e quelli più vecchi vengono scartati. E quando un progetto è troppo grande per essere salvato con tutta la sua cronologia, layerling lo salva con la metà dei passaggi, poi di nuovo con la metà, e te lo dice. Il progetto in sé viene sempre salvato per intero.

Per saperne di più: [Cronologia salvata](chapter:view-and-workplane#cronologia-salvata)

### Che cosa faccio quando lo spazio di archiviazione del browser è pieno?

Non chiudere e non ricaricare la scheda: le tue ultime modifiche sono solo lì. Metti prima al sicuro una copia con l’esportazione in .lyl. Poi libera spazio: elimina passaggi nella vista cronologia, rimuovi i progetti che non ti servono più, oppure fanne il backup ed eliminali.

Per saperne di più: [I tuoi progetti, il tuo backup](chapter:files-and-saving#i-tuoi-progetti-il-tuo-backup)

### Il mio progetto è troppo grande per essere salvato. E adesso?

La sua cronologia e le sue mesh insieme occupano troppo spazio. Prima di dirtelo, layerling ha già provato con meno passaggi di cronologia. Elimina la cronologia nella vista cronologia, semplifica le mesh importate più pesanti, oppure salva un .lyl con il solo stato attuale.

Per saperne di più: [Fare copie di sicurezza e condividere i progetti](chapter:files-and-saving#fare-copie-di-sicurezza-e-condividere-i-progetti) e [Semplificare una mesh importata](chapter:files-and-saving#semplificare-una-mesh-importata)

### Il browser ha esaurito la memoria. Che cosa aiuta?

Succede con mesh di milioni di triangoli, quando un solo passaggio richiede più memoria di quella che riceve una scheda del browser. Riduci i triangoli delle mesh importate con {{ui:editor.tool.simplify}}, chiudi le altre schede e riprova. Se succede durante il salvataggio, aiuta anche una cronologia più corta.

Per saperne di più: [Mesh grandi](chapter:files-and-saving#mesh-grandi)

### Un progetto si apre molto lentamente o non si apre. Che cosa posso fare?

Di solito la sua cronologia dei passaggi da annullare è diventata molto grande. {{ui:dashboard.openWithoutHistory}}, nel menu del progetto nella pagina iniziale, legge solo lo stato attuale; elimina per sempre i passaggi precedenti, quindi fai prima il backup del progetto se vuoi conservarli. Una versione precedente presa dai backup si apre come nuovo progetto.

Per saperne di più: [Fare copie di sicurezza e condividere i progetti](chapter:files-and-saving#fare-copie-di-sicurezza-e-condividere-i-progetti)

### layerling va a scatti. Quali impostazioni aiutano?

{{ui:workspace.fastMode}}, nelle impostazioni, disattiva le ombre, le linee degli spigoli su tutti i corpi e l’inerzia della telecamera, e disegna la vista solo alla risoluzione dello schermo. Controlla che il browser usi la scheda grafica: in `chrome://gpu` o `edge://gpu` accanto a WebGL dovrebbe esserci scritto “Hardware accelerated”. L’altra causa frequente sono le mesh importate grandi.

Per saperne di più: [Quando layerling è lento](chapter:view-and-workplane#quando-layerling-e-lento)

### L’editor resta fermo o calcola a lungo. Aspetto o ricarico?

Prima aspetta. Tagli, gruppi e lavorazioni sugli spigoli vengono calcolati in background, e intanto compare {{ui:status.computing}}; le operazioni lunghe come lo svuotamento si fermano da sole con un messaggio e non cambiano nulla. Se è stato necessario riavviare il kernel CAD, il messaggio lo dice e non serve ricaricare. Ricaricare è sicuro, perché ogni modifica si salva da sola, con un’eccezione: finché è visibile l’avviso rosso {{ui:notice.designNotSavedTitle}}, esporta prima un .lyl.

Per saperne di più: [Quando layerling è lento](chapter:view-and-workplane#quando-layerling-e-lento)

### La vista 3D resta vuota, o un messaggio dice che non è stato possibile avviarla. E adesso?

Il browser non è riuscito ad avviare WebGL, che disegna la vista 3D. La causa sta nel browser o nel driver grafico, non nel tuo progetto, e i progetti salvati non vengono eliminati. Chiudi le altre schede con contenuti 3D e riavvia il browser, attiva l’accelerazione hardware, consenti WebGL se un’impostazione sulla privacy o un’estensione lo blocca, e aggiorna il browser e il driver grafico. Provare con un altro browser è un test rapido.

Per saperne di più: [Quando layerling è lento](chapter:view-and-workplane#quando-layerling-e-lento)

## Modelli importati

### «Semplifica mesh» o «Rendi esatto»: quale scelgo?

{{ui:editor.tool.simplify}} conserva una parte dei triangoli, così un modello pesante diventa più leggero; resta una mesh. {{ui:editor.tool.makeExact}} ricostruisce un modello fatto di piani, cilindri, coni e sfere come un vero corpo CAD, così raccordi e smussi seguono spigoli puliti e un’esportazione STEP contiene facce vere. Accetta fino a 400.000 triangoli; una figura o una scansione resta una mesh. Per un pezzo tecnico grande: prima semplifica, con {{ui:simplify.keepEdges}} attivo, poi rendilo esatto.

Per saperne di più: [Semplificare una mesh importata](chapter:files-and-saving#semplificare-una-mesh-importata) e [Rendere esatta una mesh importata](chapter:files-and-saving#rendere-esatta-una-mesh-importata)

### Perché un taglio non riesce, o perché la mia mesh «non è a tenuta stagna»?

Un corpo si può tagliare solo se la sua superficie è chiusa. Se una mesh importata ha delle aperture, layerling indica il pezzo e il numero di spigoli aperti e lo lascia fuori. I fori piccoli li chiude da solo; quelli più grandi vanno riparati nel programma da cui proviene il modello o in uno strumento di riparazione delle mesh. Il controllo di stampa mostra quale corpo è aperto.

Per saperne di più: [Controllare la stampa](chapter:printing#controllare-la-stampa)

### Come importo correttamente un SVG?

Un SVG arriva come corpo da schizzo, alto 4 mm, e i suoi punti si possono modificare in modalità Schizzo. Scrivi la larghezza in millimetri nella finestra di importazione prima di importare; senza un numero mantiene le proprie dimensioni. I contorni che si incrociano da soli non possono diventare un solido: vengono lasciati fuori e contati. Unisci le parti sovrapposte e chiudi i contorni nel programma di disegno, poi importa di nuovo.

Per saperne di più: [Importare](chapter:files-and-saving#importare)

## Raccordi e smussi

### Perché non si riesce ad applicare un raccordo?

Di solito è troppo grande per quel punto: finirebbe nelle facce vicine, oppure lo spigolo curva più stretto del raggio. Spesso bastano uno o due millimetri in meno, e negli angoli acuti un raccordo ha bisogno di più spazio di quanto il raggio faccia pensare. Se gli spigoli non si possono arrotondare insieme, prendine meno alla volta; lo spigolo che dà problemi è disegnato in rosso. {{ui:edge.findLargest}} cerca la misura per te.

Per saperne di più: [Smussare e raccordare gli spigoli](chapter:edges-and-hollowing#smussare-e-raccordare-gli-spigoli)

### Perché i miei raccordi sono spariti dopo che ho modificato lo schizzo?

Dopo {{ui:inspector.editSketch}} il corpo viene ricostruito e ha spigoli nuovi. layerling rimette raccordi e smussi sugli spigoli che si trovano dove erano quelli vecchi, purché il corpo abbia lo stesso numero di spigoli di prima. Con un angolo in più o in meno vengono tralasciati, e il messaggio dice quanti. Annulla riporta tutto com’era.

Per saperne di più: [Trasformare lo schizzo in un corpo](chapter:sketches#trasformare-lo-schizzo-in-un-corpo)

### Perché non posso selezionare alcuni spigoli di un modello importato?

STL, OBJ e 3MF portano solo triangoli, e gli strumenti per gli spigoli funzionano su mesh fino a 4.000 triangoli. {{ui:editor.tool.makeExact}} trasforma un pezzo tecnico in un vero corpo CAD, nel quale un foro ha un unico bordo rotondo che un raccordo può seguire. Un file STEP porta fin dall’inizio la geometria esatta.

Per saperne di più: [Rendere esatta una mesh importata](chapter:files-and-saving#rendere-esatta-una-mesh-importata)

## Gruppi, fori e misure

### Perché i fori diventano ovali quando allungo un gruppo?

Un gruppo che viene ridimensionato allunga tutto quello che contiene, come se fosse disegnato sulla gomma. Nelle impostazioni del gruppo scegli {{ui:inspector.groupResizeKeepParts}} sotto {{ui:inspector.groupResize}}: le parti che attraversano il gruppo si allungano, mentre i fori e le parti piccole mantengono la loro dimensione e la distanza dal lato più vicino.

Per saperne di più: [Ridimensionare un gruppo: mantenere fori e parti piccole](chapter:solids-and-holes#ridimensionare-un-gruppo-mantenere-fori-e-parti-piccole)

### Perché il raggruppamento non riesce, o perché il risultato ha delle aperture?

O una parte non è chiusa, e il messaggio dice quale, oppure due parti quasi si incontrano senza toccarsi davvero. Separa il gruppo, allinea le parti con precisione o cambia di poco una dimensione o una posizione, e raggruppa di nuovo. Le mesh molto dense oltre il limite per il taglio delle mesh importate non vengono unite affatto.

Per saperne di più: [Raggruppare](chapter:solids-and-holes#raggruppare)

### Come modifico una parte all’interno di un gruppo?

Seleziona il gruppo e premi [[E]], oppure fai doppio clic su di esso. Le parti si trovano allora separate e si possono modificare; quando termini, il gruppo viene ricostruito. I raccordi e gli smussi applicati al gruppo intero si perdono quando viene ricostruito.

Per saperne di più: [Modificare un gruppo](chapter:solids-and-holes#modificare-un-gruppo)

### Come recupero una parte da uno stato precedente?

Apri la vista cronologia, sposta il cursore sullo stato che aveva ancora la parte, fai clic sulla parte e scegli {{ui:historyView.bringBack}}. Nel progetto attuale arriva una copia, com’era e dov’era, con l’ora nel nome.

Per saperne di più: [Rivedere la cronologia](chapter:select-and-arrange#rivedere-la-cronologia)

## Stampa ed esportazione

### STL, 3MF, OBJ o STEP: quale scelgo?

Per la stampante, 3MF o STL. 3MF conserva ogni corpo come una parte con il suo nome e il suo colore; STL è un’unica mesh in un solo colore. Anche OBJ porta i colori. STEP è per altri programmi CAD: contiene la geometria esatta con raccordi e smussi.

Per saperne di più: [Esportare](chapter:files-and-saving#esportare)

### Come arrivano i miei colori nello slicer?

Esporta in 3MF. Ogni corpo mantiene il suo colore, e un corpo dipinto in più colori porta la pittura sulle sue facce. All’apertura, Bambu Studio e OrcaSlicer chiedono come abbinare i colori ai tuoi filamenti.

Per saperne di più: [Dipingere in più colori](chapter:shapes#dipingere-in-piu-colori)

### Le mie parti non si incastrano. Quanto gioco serve?

Di solito da 0,2 a 0,4 mm, a seconda della stampante. La prova di accoppiamento lo misura: stampa la piccola piastra con sette fori, trova il foro più stretto in cui il perno gira ancora e inserisci quel valore come gioco della tua stampante. I nuovi coperchi, le code di rondine e le filettature partono poi da quel valore.

Per saperne di più: [Il gioco della tua stampante: la prova di accoppiamento](chapter:printing#il-gioco-della-tua-stampante-la-prova-di-accoppiamento)

### Perché layerling dice che un pezzo non entra nella stampante?

Il pezzo sporge dal bordo del piatto o è più alto di quanto possa costruire la stampante che hai scelto. È solo un suggerimento e si può chiudere. Scegli la tua stampante nelle impostazioni, oppure taglia un pezzo troppo grande con {{ui:editor.tool.split}}.

Per saperne di più: [Se qualcosa non entra](chapter:printing#se-qualcosa-non-entra)

## Informazioni su layerling

### layerling è gratuito? Posso vendere quello che progetto con layerling?

layerling è software libero con licenza AGPL-3.0, senza account. La licenza riguarda il programma: chi modifica layerling e lo offre ad altri attraverso una rete deve offrire anche il codice sorgente. Non pone condizioni sui modelli che crei. I font e i modelli che importi mantengono le proprie licenze.

Se vuoi sostenere il progetto, una [piccola donazione](support:) aiuta con i costi del server e dello sviluppo. È volontaria, e nulla in layerling dipende da essa.

Per saperne di più: [Usare layerling sul proprio computer o server](chapter:offline-and-install#usare-layerling-sul-proprio-computer-o-server)

### Come segnalo un problema o chiedo qualcosa?

{{ui:editor.bugReport}}, nella barra in basso, salva uno ZIP con il progetto e un breve testo su versione e browser; non contiene nulla di personale. Allegalo nel forum o nelle discussioni su GitHub. Domande e richieste sono benvenute in entrambi i posti.

Per saperne di più: [Segnalare un problema](chapter:files-and-saving#segnalare-un-problema) e [Aiuto e commenti](chapter:offline-and-install#aiuto-e-commenti)
