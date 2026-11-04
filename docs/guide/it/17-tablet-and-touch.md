---
title: Tablet e comandi touch
summary: Lavorare con le dita o uno stilo: selezionare più corpi, ruotare e ingrandire la vista, usare il menu con pressione prolungata e conoscere le particolarità dell’iPad.
---

## Dita e stilo

layerling funziona nel browser di un tablet e come app dalla schermata Home. Un tocco con un dito equivale a un clic del tasto sinistro del mouse. Tre elementi che mancano su un tablet — il tasto destro del mouse, il tasto Maiusc e la rotellina — hanno gesti dedicati:

| Operazione | Su un tablet |
| --- | --- |
| Selezionare un corpo | Toccalo. |
| Selezionare più corpi | Tieni il dito fermo per mezzo secondo, scegli {{ui:contextMenu.selectMultiple}}, poi tocca i corpi uno dopo l’altro. Toccando di nuovo un corpo selezionato, lo rimuovi dalla selezione. |
| Selezionare tutti i corpi | Tieni il dito fermo per mezzo secondo su uno spazio vuoto e scegli {{ui:contextMenu.selectAll}}. |
| Aprire il menu del clic destro | Tieni il dito fermo per mezzo secondo su un corpo o su uno spazio vuoto. |
| Spostare un corpo | Trascinalo. |
| Ridimensionare, ruotare o sollevare un corpo | Trascina le maniglie, i piccoli quadrati e le frecce attorno al corpo. Puoi toccarle anche leggermente di lato. |
| Ruotare la vista | Trascina un dito su uno spazio vuoto oppure trascina il cubo di orientamento. |
| Ingrandire o ridurre la vista | Usa due dita: allargale per avvicinarti, avvicinale per allontanarti. |
| Spostare la vista | Fai scorrere insieme due dita. |
| Annullare la selezione | Tocca uno spazio vuoto. Non farlo mentre è attivo {{ui:camera.touchRotate}}, perché in quel caso un dito ruota la vista. Inoltre, in modalità {{ui:contextMenu.selectMultiple}}, il primo tocco su uno spazio vuoto chiude la modalità senza modificare la selezione; il tocco successivo la annulla. |

## Selezionare più corpi

Su un computer, {{ui:contextMenu.selectMultiple}} nel menu che appare tenendo premuto sostituisce Maiusc+clic. Quando la modalità è attiva, un messaggio te lo segnala e ogni tocco su un corpo lo aggiunge alla selezione o lo rimuove. Toccando uno spazio vuoto o premendo [[Esc]] su una tastiera, esci dalla modalità senza modificare la selezione. Nel frattempo puoi continuare a ruotare la vista trascinando un dito su uno spazio vuoto. A quel punto {{ui:editor.tool.group}}, {{ui:editor.tool.align}} o lo spostamento si applicano a tutti i corpi selezionati.

Lo stesso menu contiene {{ui:contextMenu.carry}}, che su un dispositivo touch corrisponde al tasto [[C]]. La selezione segue il dito sulle facce degli altri corpi; tocca una faccia per appoggiarvi gli oggetti, anche se è inclinata. Basta un solo tocco. Puoi trovare la voce del menu anche cercando «appoggia» o «naviga» nella ricerca dei comandi ([[Ctrl]]+[[K]] sulla tastiera).

## Ruotare e ingrandire la vista

Trascinando un dito su uno spazio vuoto ruoti la vista; usando due dita puoi ingrandirla e spostarla. Se inizi il gesto su un corpo, agisci sul corpo e non sulla vista. Se preferisci ruotare la vista anche iniziando il gesto su un corpo, attiva {{ui:camera.touchRotate}} nella barra della videocamera: un dito ruoterà la vista invece di selezionare, a prescindere da dove inizi il gesto. L’interruttore compare solo sui dispositivi con schermo touch.

Trascina il cubo di orientamento in alto a sinistra per ruotare la vista. Toccandone una faccia, uno spigolo o un angolo passi direttamente alla vista corrispondente. Vedi [Vista e piano di lavoro](chapter:view-and-workplane).

## Maniglie, punti piccoli e stilo

La punta del dito copre ciò che vuoi selezionare. layerling permette di raggiungere maniglie, punti, linee e spigoli anche con un po’ più di margine rispetto al puntatore del mouse, ma uno stilo è più preciso. Questo vale per uno stilo riconosciuto dal tablet come penna, come Apple Pencil o S Pen. Uno stilo semplice con punta di gomma viene rilevato come un dito e non è più preciso: usalo come useresti un dito. Su iPad, se Apple Pencil supporta il rilevamento quando è sollevata dallo schermo, dopo un momento compare anche il nome del controllo in un piccolo fumetto, come il suggerimento mostrato dal puntatore del mouse.

In modalità schizzo, {{ui:sketch.freehand}} disegna con la penna o un dito come sulla carta; quando lo sollevi, la linea diventa punti dello schizzo che puoi modificare, vedi [Schizzi](chapter:sketches).

Se i bambini o chi ha fretta spostano i corpi per errore, attiva {{ui:workspace.selectBeforeMoving}} nelle impostazioni: prima dovrai selezionare il corpo; solo un trascinamento successivo lo sposterà.

## Su iPad e iPhone

- **Installalo come app.** In Safari, tocca l’icona di condivisione e scegli «Aggiungi alla schermata Home». L’app si apre in una finestra propria, senza barra degli indirizzi, e funziona anche senza connessione; vedi [Lavorare offline e installare l’app](chapter:offline-and-install).
- **I progetti restano nel browser.** Non serve un account e i dati non vengono caricati online. Safari applica una propria regola contro il tracciamento: elimina i dati salvati da un sito dopo sette giorni senza visite al sito in Safari. Come documentato da WebKit, questa regola non si applica alle web app aggiunte alla schermata Home. Ecco un altro motivo per usare l’app dalla schermata Home e fare copie di sicurezza dei lavori importanti: {{ui:dashboard.backupAll}} nella pagina iniziale raccoglie tutti i progetti in un unico file.
- **File.** Safari consente a una pagina di scrivere in un file solo tramite un download. Perciò {{ui:editor.export}} salva il file nella cartella Download dell’app File e [[Ctrl]]+[[S]] sulla tastiera lo scarica di nuovo; vedi [File, salvataggio e condivisione](chapter:files-and-saving).
- **La tastiera non è necessaria.** Ogni strumento ha un pulsante nella barra e toccando un campo numerico si apre la tastiera su schermo. Una tastiera collegata all’iPad aggiunge le [scorciatoie da tastiera](chapter:shortcuts). Un riquadro di valore accanto a un corpo apre il suo campo numerico solo al secondo tocco: il primo lo segna soltanto, così un dito che ci finisce sopra per sbaglio non fa comparire la tastiera.

## Laboratori con bambini

In questo caso le dita e gli stilo con la punta di gomma funzionano allo stesso modo. Due impostazioni semplificano le attività di gruppo: {{ui:workspace.selectBeforeMoving}} impedisce che un tocco sposti accidentalmente un corpo; {{ui:camera.touchRotate}} fa sì che un dito ruoti sempre la vista. Il pulsante con il punto interrogativo nel gruppo Aiuto della barra attiva {{ui:interactiveHelp.title}}: toccando un pulsante, un campo o una maniglia ne viene spiegato il funzionamento. Tocca di nuovo lo stesso pulsante o premi [[Esc]] per uscire.

Per un’intera classe, attiva {{ui:workspace.simpleMode}} nelle impostazioni. La barra mostra solo gli strumenti utili in laboratorio (copia, incolla, duplica, elimina, annulla, raggruppa, specchia, smussa, raccorda, svuota, allinea ed esporta); la raccolta delle forme mostra un elenco ridotto e i pulsanti sono più grandi. La pagina iniziale mostra solo i progetti, senza notizie, testo di benvenuto, pulsanti di aiuto o collegamenti che portano fuori da layerling. Basta un tocco per attivare questa modalità; per disattivarla, tieni premuto per due secondi il pulsante che la sostituisce. Un link che termina con `?mode=simple` attiva la modalità semplificata sul dispositivo che lo apre; `?mode=full` la disattiva. Chi gestisce layerling su un server può avviare tutti gli utenti in modalità semplificata impostando `LAYERLING_SIMPLE_MODE=true`, oppure renderla obbligatoria per tutti con `always`, in modo che non sia possibile disattivarla. Vedi il README.
