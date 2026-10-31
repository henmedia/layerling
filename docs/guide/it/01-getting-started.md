---
title: Primi passi
summary: Dalla pagina vuota al primo pezzo per la stampante 3D in cinque minuti, senza account e senza installare nulla.
---

layerling è un programma di progettazione per la stampa 3D che funziona direttamente nel browser. Puoi creare un pezzo partendo da forme semplici, praticarvi fori, arrotondarne gli spigoli e inviarlo allo slicer. Non devi installare nulla né registrarti. I progetti restano sul tuo computer.

![La pagina iniziale di layerling: in alto «Crea un nuovo progetto 3D», sotto i tuoi progetti e la guida rapida.](shot:start-page)

## Creare un progetto

Apri [layerling.com](https://layerling.com/). Nella pagina iniziale fai clic su {{ui:dashboard.createDesign}}. Si apre l’editor con il piano di lavoro vuoto: la griglia su cui prenderà forma il progetto.

Se hai già un file da cui continuare, usa {{ui:dashboard.importGeometry}}. Puoi aprire progetti layerling (`.lyl`) e file STL, OBJ, 3MF, STEP o SVG.

In seguito, tutti i tuoi progetti compariranno nella pagina iniziale con un’immagine di anteprima. Sono conservati nella memoria del browser e salvati automaticamente dopo ogni modifica: non c’è un pulsante Salva. **layerling non si assume responsabilità per i progetti conservati nel browser.** Il browser potrebbe danneggiarsi o un aggiornamento potrebbe causare problemi; perciò crea periodicamente una copia di sicurezza con {{ui:dashboard.backupAll}} nella pagina iniziale oppure salva i progetti come file. Puoi ripristinare una copia con {{ui:dashboard.restoreBackup}}. Il capitolo [File, salvataggio e condivisione](chapter:files-and-saving) spiega come raccogliere i progetti in un file e condividerli. Se desideri un promemoria, attiva {{ui:workspace.confirmTabClose}} nelle impostazioni (l’ingranaggio nella barra): il browser chiede conferma prima di chiudere o ricaricare una scheda con un progetto aperto.

## Panoramica dell’editor

![L’editor con due forme sul piano di lavoro. In alto la barra degli strumenti, a sinistra i controlli della vista e a destra le impostazioni della forma selezionata.](shot:editor-overview)

- **In alto** trovi la barra degli strumenti, organizzata per attività: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} e {{ui:editor.group.help}}. Passa il puntatore su un’icona per vederne il nome. I punti interrogativi — per esempio nelle impostazioni di una forma, nella raccolta delle forme o nei pannelli degli strumenti — rimandano direttamente al capitolo pertinente di questa guida.
- **Al centro** si trova il piano di lavoro. Qui posizioni le forme, le modifichi e ne osservi il risultato.
- **A destra** trovi le impostazioni della forma selezionata: colore, dimensioni, posizione e tutte le altre proprietà. Inserire numeri è più preciso che trascinare.
- **A sinistra** ci sono i controlli della vista, con il cubo di orientamento sopra di essi. Ti permettono di muoverti nella scena; trovi maggiori informazioni in [Vista e piano di lavoro](chapter:view-and-workplane).
- **In cima alla finestra** puoi passare da {{ui:editor.modeGeometry}} a {{ui:editor.modeSketch}}, rinominare il progetto e scegliere la lingua e il tema.

## I pulsanti attorno all’area di lavoro

Passa il puntatore su un pulsante per vederne il nome. Se non sai a cosa serve, fai clic su {{ui:interactiveHelp.title}} nell’area {{ui:editor.group.help}} ([[Shift]]+[[F1]]) e poi sul pulsante. Ecco quelli su cui si chiedono più spesso informazioni.

### Incolla

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) aggiunge al progetto ciò che hai copiato con {{ui:editor.tool.copy}}. {{ui:common.duplicate}} copia e incolla in un solo passaggio.

### Elimina

{{ui:common.delete}} ([[Delete]]) rimuove le forme selezionate. {{ui:editor.tool.undo}} le ripristina.

### Separa gruppo

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) separa il gruppo selezionato nelle forme che lo compongono.

### Impostazioni dello spazio di lavoro

{{ui:editor.workspaceSettings}} apre le impostazioni dell’area di lavoro: unità, dimensioni della piastra, stampante, griglia, colori, illuminazione e altro. Per saperne di più, vedi [Vista e piano di lavoro](chapter:view-and-workplane).

### Tema

{{ui:common.theme}}, in cima alla finestra, permette di scegliere l’aspetto di layerling: come il sistema, chiaro, scuro o grafite.

### Rinominare il progetto

{{ui:editor.renameProject}} è la matita accanto al nome in cima alla finestra. Digita il nuovo nome e premi [[Enter]].

### Nome del progetto

Il nome del progetto ({{ui:confirm.projectName}}) si trova in cima alla finestra. Fai clic, digita il nome e premi [[Enter]] per confermarlo.

### Opzioni di visibilità

{{ui:editor.visibilityOptions}}, la freccia accanto all’icona dell’occhio, apre le opzioni per mostrare o nascondere elementi: l’elenco degli oggetti, quelli nascosti, le annotazioni e i sovrasbalzi di stampa. Per saperne di più, vedi [Selezionare e disporre](chapter:select-and-arrange).

### Nascondere gli elementi selezionati

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) nasconde le forme selezionate. Restano nel progetto e nell’elenco degli oggetti; {{ui:editor.visibilityOptions}} permette di mostrarle di nuovo.

### Cercare comandi

{{ui:palette.open}}: digita il nome di uno strumento, di una forma o di un’impostazione, poi fai clic sul risultato.

### Nascondere i controlli della vista

{{ui:camera.hide}} chiude i controlli della vista a sinistra e lascia più spazio all’area di lavoro; {{ui:camera.show}} li mostra di nuovo.

### Griglia di aggancio

{{ui:inspector.snapGrid}}, in fondo alle proprietà, imposta l’intervallo degli scatti a cui si agganciano gli spostamenti e i ridimensionamenti. L’interruttore **mm | in** accanto permette di cambiare unità. Per saperne di più, vedi [Vista e piano di lavoro](chapter:view-and-workplane).

### Unità: millimetri o pollici

L’interruttore **mm | in** accanto a {{ui:inspector.snapGrid}} cambia l’unità di misura, la griglia della piastra e l’intervallo di aggancio per il progetto corrente.

### Piè di pagina

In fondo alla finestra trovi {{ui:dashboard.sponsor}}, che porta alla pagina per sostenere il progetto; {{ui:dashboard.userGuide}}, che apre questa guida; {{ui:dashboard.forum}}, per domande, idee e segnalazioni di problemi (le discussioni su GitHub oppure, in tedesco, il forum di drucktipps3d); {{ui:editor.bugReport}}, che crea un file ZIP per segnalare un problema; e {{ui:dashboard.projectOnGitHub}}, che porta al progetto su GitHub. Il numero di versione apre le note di rilascio. I collegamenti alle note legali e all’informativa sulla privacy dipendono da chi gestisce la copia di layerling che stai usando.

## Il tuo primo pezzo

Come esempio, creiamo un cubo con un foro.

1. Fai clic su {{ui:editor.addShape}} nella barra e scegli {{ui:shape.box}}. La forma resta agganciata al puntatore del mouse. Fai clic sul piano di lavoro per posizionarla.
2. A destra imposta le dimensioni, per esempio 40 mm di lunghezza, 40 mm di larghezza e 20 mm di altezza.
3. Allo stesso modo, posiziona un {{ui:shape.cylinder}} al centro, largo 14 mm e alto 30 mm. Deve essere più alto del cubo, così lo attraversa completamente.
4. Seleziona il cilindro e fai clic su {{ui:inspector.hole}} a destra. Diventa trasparente: il solido si è trasformato in uno strumento che asporta materiale.
5. Seleziona entrambe le forme e fai clic su {{ui:editor.tool.group}}. Nel cubo si forma un foro.

![Il cilindro è impostato come foro e sporge dalla parte superiore del cubo.](shot:hole-before)

![Dopo aver raggruppato le forme, il cubo ha un foro passante.](shot:hole-after)

È così che si creano fori, asole e tasche. Il capitolo [Solidi e fori](chapter:solids-and-holes) lo spiega in dettaglio.

## Novità dalla tua ultima visita

Quando riapri layerling dopo un aggiornamento, nella pagina iniziale un riquadro elenca tutte le novità introdotte dalla tua ultima visita, dalla versione più recente alla meno recente. Se è passato molto tempo, scorri il contenuto del riquadro. Sotto, {{ui:whatsNew.earlier}} aggiunge anche le versioni precedenti alla tua ultima visita. Chiudi il riquadro con {{ui:whatsNew.dismiss}}: resterà nascosto fino al prossimo aggiornamento. Puoi riaprire in qualsiasi momento l’elenco delle ultime novità con {{ui:whatsNew.footerLink}}, nel piè di pagina della pagina iniziale. Il browser ricorda l’ultima versione che hai visualizzato e nessun dato su di te viene trasmesso.

Se usi una copia di layerling sul tuo computer o server, l’avviso «Aggiornamento disponibile» include un pulsante, {{ui:update.previewShow}}, che mostra le novità prima di installare l’aggiornamento. L’elenco viene scaricato da GitHub solo quando premi il pulsante.

## Dal progetto alla stampa

Quando il pezzo è pronto, fai clic su {{ui:editor.export}}, scegli STL o 3MF e scarica il file. Aprilo nel tuo slicer, per esempio Bambu Studio, PrusaSlicer, OrcaSlicer o Cura. Se selezioni la tua stampante nelle impostazioni, durante la progettazione puoi controllare se il pezzo entra nel piano di stampa. Per saperne di più, vedi [Preparare la stampa 3D](chapter:printing).

> **Suggerimento:** se conosci Tinkercad, ti orienterai in fretta: piano, forme, solido e foro, raggruppamento, allineamento e specchiatura funzionano quasi allo stesso modo. Le novità principali sono smussi e raccordi, svuotamento, filettature e schizzi. Anche i tuoi design di Tinkercad possono venire con te, vedi [File, salvataggio e condivisione](chapter:files-and-saving).
