---
title: Installare come app, lavorare offline e ospitare layerling
summary: Avviare layerling come un normale programma anche senza connessione e usarlo sul proprio computer.
---

## Installare come app

Puoi installare layerling come un normale programma. Avrà un’icona e una finestra proprie, senza barra degli indirizzi. Dopo la prima visita, si avvia anche **senza connessione Internet**. I tuoi progetti restano sul computer. Installare l’app è comodo: si avvia più rapidamente perché non deve essere ricaricata ogni volta, funziona offline e riduce il carico sul server. Non perdi gli aggiornamenti: layerling ti avvisa quando è disponibile una nuova versione. Questo protegge anche i tuoi progetti: Safari su Mac, iPhone e iPad cancella i dati salvati di un sito non visitato da sette giorni, ma non quelli di un'app installata.

Se il browser lo consente, nella pagina iniziale compare l’avviso {{ui:installHint.install}}. In caso contrario:

- **Chrome ed Edge:** fai clic sull’icona di installazione a destra della barra degli indirizzi oppure scegli «Installa come app» dal menu del browser.
- **Safari su Mac:** apri il menu «File» e scegli «Aggiungi al Dock».
- **Safari su iPhone e iPad:** tocca l’icona di condivisione e poi «Aggiungi alla schermata Home».
- **Firefox:** su Windows, dalla versione 143, fai clic sull’icona «Aggiungi scheda alla barra delle applicazioni» a destra nella barra degli indirizzi; in una finestra anonima non c’è. I tuoi progetti restano come sono. Altrove layerling funziona offline in una scheda.

Puoi chiudere l’avviso nella pagina iniziale con {{ui:installHint.dismiss}}. Se avvii una seconda volta layerling installato in Chrome o Edge, la finestra già aperta torna in primo piano invece di aprirne un’altra.

Su computer, layerling installato con Chrome o Edge si registra anche come programma per i file `.lyl`: facendo doppio clic su un progetto nel gestore file, questo si apre in layerling e [[Ctrl]]+[[S]] lo salva di nuovo nello stesso file. Su Android non è possibile, perché il browser non offre l’associazione dei file alle app web installate; per aprire un progetto, usa {{ui:dashboard.importGeometry}} nella pagina iniziale.

## Aggiornamenti

Quando è disponibile una nuova versione, layerling lo segnala nella pagina iniziale. Con {{ui:dashboard.updateBannerLink}} puoi leggere le novità. Il numero di versione si trova in basso a destra. Dopo aver ricaricato la pagina, avrai la nuova versione.

Su layerling.com e sugli altri server web, una pagina aperta rileva automaticamente gli aggiornamenti. Controlla di tanto in tanto la versione sul server quando torni alla scheda e subito se scompare un file del programma di cui ha bisogno. Se nel frattempo è stata installata una nuova versione, in basso a destra compare un riquadro con le novità. {{ui:newVersion.reload}} prima salva nel browser il progetto aperto e poi ricarica la pagina: ritroverai il progetto nello stato in cui l’avevi lasciato. {{ui:newVersion.later}} nasconde il riquadro per 15 minuti. Ricarica la pagina appena possibile: se continui a usare la versione precedente, potrebbe caricare componenti della nuova versione incompatibili con essa. Lo stesso riquadro compare se questo è già successo: i processi CAD, che vengono caricati solo al primo utilizzo, indicano la propria versione. Se non corrisponde a quella della pagina — dopo un aggiornamento o quando è stata conservata una copia di una vecchia versione — il riquadro chiede di ricaricare la pagina prima che le due versioni entrino in conflitto.

Se layerling è aperto in più schede, queste si controllano a vicenda: quando una scheda rileva che un’altra sta già usando una versione più recente, mostra un avviso in basso e ti chiede di ricaricarla. Se lo stesso progetto è aperto in due schede, entrambe ti avvisano, perché il salvataggio automatico potrebbe sovrascrivere le modifiche dell’altra scheda. Se apri layerling in una nuova scheda mentre è già aperto, la nuova scheda ti propone di continuare in quella esistente e offre di chiudersi. Se invece vuoi usare intenzionalmente due schede, per esempio per affiancare due progetti, fai clic su {{ui:tabs.keepHere}}. Anche questa guida si apre in una scheda separata: mentre layerling è aperto accanto, il pulsante in alto a destra mostra «Torna all’editor» e chiude la guida, invece di aprire una seconda istanza dell’editor.

## Lingua e aspetto

Scegli la lingua nell’elenco in alto a destra. Accanto trovi il tema: {{ui:theme.short.system}} segue le impostazioni del sistema operativo, {{ui:theme.short.light}} e {{ui:theme.short.dark}} selezionano il tema chiaro o scuro, mentre {{ui:theme.short.graphite}} applica un grigio scuro neutro.

## Usare layerling sul proprio computer o server

layerling è software libero (AGPL-3.0) e puoi usarlo sul tuo computer o server, per esempio in un laboratorio, un’associazione o una scuola. Ci sono diversi metodi, descritti nel [README su GitHub](https://github.com/henmedia/layerling/blob/main/README.md#getting-started):

- **Avvio rapido su Windows:** una sola riga in PowerShell installa tutto e crea un collegamento sul desktop. Se layerling è già in esecuzione, un altro doppio clic non avvia un secondo server: apre semplicemente la pagina.
- **Docker:** per dispositivi NAS e server domestici, senza bisogno di installare Node.js. Ogni versione viene pubblicata su Docker Hub come immagine pronta all’uso `henmedia/layerling` (disponibile anche come `ghcr.io/henmedia/layerling`) per amd64 e arm64. Per avviarla, usa `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest`; su un NAS puoi cercarla nel registro del gestore dei container. Il volume `layerling-thumbnails` conserva le immagini di anteprima della pagina iniziale quando aggiorni il programma. Senza il volume, le anteprime scompaiono ogni volta che viene ricreato il container e ricompaiono solo dopo aver aperto il progetto.
- **Esportazione statica:** il risultato è composto da normali file che qualsiasi server web può pubblicare. Devono trovarsi nella radice dell’indirizzo (`https://layerling.example.com/` oppure `http://192.168.0.5:8080/`), non in una sottocartella e non possono essere aperti direttamente dal disco; nel README trovi i passaggi. Se sul server è presente una cartella `store` scrivibile accanto a `index.html` e PHP è attivo, la cartella diventa anche lo spazio condiviso per i progetti.

Il collegamento MCP per gli assistenti IA è disponibile solo nel server di sviluppo o in una copia ospitata da te che lo attiva; vedi [Progettare con un’IA](chapter:ai-with-mcp).

## Aiuto e commenti

- Nell’editor, l’area {{ui:editor.group.help}} contiene {{ui:editor.guide}}, con i movimenti principali e la panoramica delle [scorciatoie da tastiera](chapter:shortcuts). Ogni sezione della guida rapida ha un punto interrogativo che rimanda al capitolo corrispondente di questa guida. In cima alla guida rapida, {{ui:guide.fullGuide}} apre questa guida; la trova anche la ricerca dei comandi ([[Ctrl]]+[[K]]).

![La guida rapida nell’editor. In alto sono elencati i video realizzati da altri e ogni sezione ha un punto interrogativo.](shot:quick-guide)

- Puoi fare domande, inviare suggerimenti e segnalare problemi nel [forum](https://forum.drucktipps3d.de/forum/board/127-layerling/) o su [GitHub](https://github.com/henmedia/layerling/discussions).
- Le novità di ciascuna versione sono nelle note di rilascio, in fondo alla pagina iniziale e all’editor.
