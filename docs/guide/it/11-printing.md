---
title: Preparare la stampa 3D
summary: Scegliere la propria stampante, ricevere avvisi quando un pezzo non entra e orientarlo nel modo corretto.
---

## Scegliere la stampante

Apri le impostazioni con l’ingranaggio nella barra multifunzione ({{ui:editor.workspaceSettings}}) e passa alla sezione {{ui:workspace.workplane}}. In {{ui:workspace.printer}} scegli la tua stampante da un elenco di oltre 230 modelli comuni, tra cui Bambu Lab, Prusa, Creality, Anycubic, Elegoo e molti altri.

![Le impostazioni del piano di lavoro con una stampante selezionata. Il piatto e l’altezza massima di stampa provengono dal profilo dello slicer.](shot:settings-workplane)

Succedono tre cose:

- Il piano di lavoro assume le dimensioni del piatto di stampa.
- In un angolo del piano di lavoro compaiono il nome della stampante e il suo volume di stampa. Se le scritte sono d’intralcio, disattivale con {{ui:workspace.showPlateLabels}} nella sezione {{ui:workspace.workplane}}; puoi nascondere anche il nome del progetto, che appare davanti a sinistra.
- layerling **mostra un avviso** se qualcosa non entra.

I profili delle stampanti provengono da OrcaSlicer, quindi sono gli stessi disponibili nel tuo slicer. Se preferisci lavorare senza una stampante selezionata, scegli {{ui:workspace.printerNone}}. Puoi anche impostare manualmente le dimensioni del piano di lavoro.

Le stampanti delta, come quelle di FLSun o SeeMeCNC o la Anycubic Predator, stampano su una piastra rotonda. Con una di queste anche il piano di lavoro è rotondo e largo quanto la piastra, e un corpo è troppo grande appena supera il bordo. Un corpo rotondo viene misurato sul proprio contorno e non sul riquadro che lo racchiude, quindi ci sta anche un cilindro largo quasi quanto la piastra.

## Se qualcosa non entra

Un corpo che sporge oltre il bordo del piatto di stampa viene evidenziato. Un messaggio indica quali lati oltrepassa e di quanto. Lo stesso vale se il pezzo è **troppo alto**: l’altezza viene misurata a partire dal corpo più basso, proprio come quando lo slicer appoggia il modello sul piatto.

![La scatola è più larga del piatto della Bambu Lab A1 mini. Il messaggio in basso indica di quanto lo supera.](shot:printer-overhang)

L’avviso non impedisce di continuare a lavorare. Serve a evitare che tu scopra solo nello slicer che il pezzo è troppo grande. Spesso puoi dividerlo: taglialo in due con {{ui:editor.tool.split}} e stampa le due metà separatamente.

Se parcheggi intenzionalmente dei pezzi accanto al piatto, fai clic sulla piccola croce nel messaggio per ignorare l’avviso relativo proprio a quei corpi. L’avviso ricompare se uno dei pezzi rientra nel piatto e poi lo sposti di nuovo fuori, oppure se un altro corpo lo oltrepassa. I corpi nascosti non vengono conteggiati: puoi anche nascondere i pezzi parcheggiati.

## Orientare correttamente il pezzo

Il modo in cui un pezzo poggia sul piatto ne determina la resistenza e l’aspetto. Nel gruppo {{ui:editor.group.arrange}} trovi due strumenti utili:

- {{ui:editor.tool.layFlat}}: fai clic su una faccia per appoggiarvi il pezzo. Un clic solo per scegliere l’orientamento di stampa migliore.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): appoggia il pezzo sul piano di lavoro se è sospeso in aria.

Alcune regole pratiche per scegliere l’orientamento:

- Appoggia sul piatto le facce piane più grandi: aderiscono meglio.
- Orienta i pezzi lunghi sottoposti a carico in modo che gli strati non siano perpendicolari alla forza. La direzione degli strati è quella più debole.
- Evita gli sbalzi più ripidi di 45° oppure aggiungi supporti nello slicer.

## Individuare gli sbalzi

Nel menu accanto all’occhio ({{ui:editor.group.visibility}}), attiva **Mostra sbalzi** per visualizzarli. Le facce rivolte verso il basso con un’inclinazione superiore a 45° vengono tratteggiate in rosso e bianco: sono le zone in cui la stampante potrebbe aver bisogno di supporti. Le superfici appoggiate sul piatto restano senza tratteggio. Durante la progettazione puoi così verificare se una sfera, un arco o un foro orizzontale si stampa senza supporti; il [foro teardrop](chapter:threads-and-mechanics) è pensato proprio per questo. Ruota il pezzo o appoggialo su un’altra faccia con {{ui:editor.tool.layFlat}}: il tratteggio si aggiorna subito.

Nelle impostazioni, sotto {{ui:workspace.appearance}}, imposta l’inclinazione massima gestita dalla tua stampante: da 30° (prudente) a 70° (per stampanti con un buon raffreddamento del pezzo). Anche una faccia appoggiata a un altro corpo viene segnalata: layerling considera solo la faccia in sé.

## Spessore delle pareti, gioco e smussi

- Le pareti dovrebbero essere larghe almeno due linee di estrusione: 0,8 mm con un ugello da 0,4 mm. Per pezzi robusti, servono da 1,2 a 2 mm.
- Quando due parti devono incastrarsi, occorre lasciare del gioco: in genere da 0,2 a 0,4 mm, in base alla stampante. Prima di stampare il pezzo grande, prova un piccolo incastro di test.
- Molti smussano leggermente il bordo inferiore appoggiato sul piatto. Questo limita l’allargamento del primo strato (il cosiddetto “piede d’elefante”).

## Quando il pezzo è pronto

Scegli {{ui:editor.export}}, poi **STL** o **3MF**. STL è il formato più semplice. 3MF conserva i nomi e i colori dei singoli corpi, quindi è comodo per la stampa multicolore. La finestra di esportazione mostra anche quanti grammi e metri di filamento servirebbero per stampare il pezzo pieno. Altre informazioni in [File e salvataggio](chapter:files-and-saving).
