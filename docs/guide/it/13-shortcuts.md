---
title: Scorciatoie da tastiera
summary: Tutti i tasti a colpo d’occhio, direttamente dall’applicazione, per avere un elenco sempre aggiornato.
---

Le scorciatoie funzionano quando il piano di lavoro è attivo. Mentre scrivi in un campo, non interferiscono con la digitazione. Su Mac, [[Cmd]] sostituisce [[Ctrl]] ovunque sia indicato in questo capitolo.

Nell’editor, {{ui:editor.keyboardShortcuts}} nell’area {{ui:editor.group.help}} apre lo stesso elenco in una finestra. Il pulsante di stampa nella finestra ({{ui:shortcuts.print}}) stampa l’elenco da solo, in bianco e nero, su un unico lato di un foglio A4 o Letter, disposto in tre colonne: puoi tenerlo a portata di mano come promemoria. La finestra di stampa del browser permette anche di salvarlo in PDF.

La casella in cima alla finestra cerca nell’elenco: tiene solo le scorciatoie la cui frase, il cui gruppo o i cui tasti contengono ogni parola scritta, così "ctrl+z" lascia solo quelle righe. Maiuscole e accenti non contano, e una sola lettera o cifra trova quel tasto e le parole che iniziano con essa. La X in fondo alla casella la svuota; con la casella vuota torna l’elenco intero. Il pulsante di stampa stampa ciò che mostra la finestra, quindi dopo una ricerca stampa solo le scorciatoie trovate.

![La finestra delle scorciatoie da tastiera nell’editor.](shot:shortcuts)

## Ricerca dei comandi

Non trovi uno strumento? Premi [[Ctrl]]+[[K]] oppure fai clic sulla lente d’ingrandimento nell’area {{ui:editor.group.help}}, poi digita ciò che cerchi: uno strumento («raccordo», «specchia»), una forma («cilindro») o un comando («esporta», «annulla»). Spostati con i tasti freccia e premi [[Enter]], oppure fai clic sul risultato.

- La ricerca riconosce sia il termine inglese sia quello tedesco e non distingue maiuscole e dieresi: «aushoehlen» trova {{ui:editor.tool.hollow}}.
- Ogni risultato mostra i tasti che eseguono la stessa operazione e il gruppo della barra degli strumenti in cui si trova, così puoi imparare dove cercarlo.
- Le voci disattivate non sono disponibili in quel momento, spesso perché non hai selezionato nulla. Restano nell’elenco, così la ricerca ti indica comunque dove si trova lo strumento.

Anche la guida che stai leggendo ha una casella di ricerca in cima a ogni pagina: digita una o due parole e verranno elencate le sezioni che le contengono tutte, con i termini corrispondenti evidenziati. Fai clic su una sezione oppure premi [[Enter]] per aprire la prima. La pagina che si apre evidenzia ogni punto in cui compaiono le tue parole e scorre fino al primo in quella sezione; [[Esc]] o un clic su un'evidenziazione le rimuove.

- Il nome di una forma la aggiunge al piano di lavoro, proprio come se la scegliessi dal menu delle forme.
- Se il campo è vuoto, in cima compaiono i comandi usati più di recente.
- Se cerchi il nome di un corpo del progetto, la ricerca lo trova e lo seleziona: è utile quando il progetto contiene molti pezzi. I corpi compaiono solo dopo che inizi a digitare.
- Anche una forma personalizzata salvata si trova dal nome, appena digiti, e un clic la inserisce nel progetto come nel pannello delle forme.
- La ricerca funziona anche in modalità schizzo, con gli strumenti per gli schizzi.

## I tuoi tasti

Ogni comando della ricerca comandi può andare su un tasto tuo: uno strumento che usi di continuo, una forma, {{ui:editor.tool.centerOnWorkplane}} o {{ui:palette.openShapes}}.

1. Apri {{ui:editor.keyboardShortcuts}} e fai clic su {{ui:customKeys.add}} sotto {{ui:customKeys.title}}, in alto nella finestra.
2. Digita qualche lettera del comando e fai clic su di esso, oppure premi [[Enter]] per il primo.
3. Premi il tasto che vuoi, da solo o con [[Ctrl]], [[Alt]] o [[Shift]]. Lettere, cifre e i tasti da F1 a F12 possono portare un comando.

Un tasto che l’editor usa già, uno che il browser tiene per sé (come [[Ctrl]]+[[W]]) o uno dei tuoi tasti viene rifiutato, e la finestra dice a cosa serve. Fai clic su un tasto nell’elenco per cambiarlo, sulla X accanto per rimuoverlo, oppure su {{ui:customKeys.removeAll}} per ricominciare.

- Il tasto avvia il comando proprio come la ricerca comandi. Se al momento non può partire, di solito perché non è selezionato nulla, lo dice la barra di stato.
- I tuoi tasti compaiono accanto ai loro comandi nella ricerca comandi e nell’elenco stampato.
- Restano in questo browser, come il tema. Un tasto per uno strumento dello schizzo funziona in modalità schizzo, uno per l’editor 3D fuori da essa.
- Mentre scrivi in un campo, i tuoi tasti si fanno da parte come tutti gli altri.

## Guida interattiva

Non sai dove trovare le informazioni su un pulsante o un campo? Lascia che sia l’applicazione a indicartelo. Fai clic sul punto interrogativo nell’area {{ui:editor.group.help}} oppure premi [[Shift]]+[[F1]]. Il puntatore diventa un punto interrogativo e l’elemento sotto di esso viene evidenziato.

- Fai clic su un pulsante, un campo, un interruttore, una maniglia, un gruppo della barra o sulla barra del titolo di una finestra. L’elemento **non** esegue la sua normale funzione: si apre invece una piccola finestra con il nome dell’elemento, un breve riepilogo della sezione pertinente della guida, fino a due altri riferimenti e {{ui:interactiveHelp.open}}.
- La guida riguarda l’elemento che hai indicato, non l’intera finestra in cui si trova. Se un elemento non ha un nome proprio, viene usato quello dell’elemento più vicino; all’interno di una finestra, in mancanza di un riferimento specifico, viene usato il punto interrogativo della finestra.
- {{ui:interactiveHelp.open}} apre la guida in una nuova scheda direttamente alla sezione pertinente, evidenziata a colori dal titolo fino alla fine: puoi vedere subito dove inizia e dove termina.
- Se la guida non contiene informazioni sull’elemento, la finestra te lo segnala e propone {{ui:interactiveHelp.search}}.
- Premi [[Esc]] o fai di nuovo clic sul punto interrogativo per uscire dalla modalità. Sugli schermi tattili non c’è il passaggio del puntatore: tocca un elemento per aprire direttamente la finestra informativa.

Come le altre finestre, anche questa si sposta trascinandola dalla barra del titolo. L’applicazione trova la sezione in base al nome dell’elemento — l’etichetta di un pulsante o il nome di un campo — perché nella guida i pulsanti sono indicati con lo stesso nome usato nell’applicazione. La ricerca avviene con la stessa funzione disponibile in cima alle pagine della guida, nella lingua selezionata, e tutto funziona nel browser.

{{shortcuts}}
