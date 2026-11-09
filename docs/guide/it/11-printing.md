---
title: Preparare la stampa 3D
summary: Scegliere la propria stampante, ricevere avvisi quando un pezzo non entra e orientarlo nel modo corretto.
---

## Scegliere la stampante

Apri le impostazioni con l’ingranaggio nella riga del titolo ({{ui:editor.workspaceSettings}}) e passa alla sezione {{ui:workspace.workplane}}. In {{ui:workspace.printer}} scegli la tua stampante da un elenco di oltre 230 modelli comuni, tra cui Bambu Lab, Prusa, Creality, Anycubic, Elegoo e molti altri.

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

## Nervature di supporto per un pezzo inclinato

Un pezzo stampato inclinato su uno spigolo, per esempio a 45°, spesso non ha bisogno di supporti: le sue facce sono abbastanza ripide. Però poggia su uno spigolo sottile e può cadere. La {{ui:supportRib.title}} lo regge: una nervatura sottile sta sotto la sua faccia inferiore a breve distanza, su un piede ovale, e piccoli ponti lo trattengono. Prima ruota il pezzo sul suo spigolo e appoggialo sul piano.

1. Seleziona il pezzo e fai clic su {{ui:supportRib.title}} nel gruppo {{ui:editor.section.splitShape}} della barra, fai clic destro sul pezzo oppure cercala con [[Ctrl]]+[[K]].
2. Fai clic sulla faccia inferiore dove deve stare la nervatura. La faccia deve guardare in basso, essere inclinata tra 15° e 75° e scendere fino al piano; la nervatura scende dritta lungo la faccia dal punto del clic. Se lo spigolo inferiore del pezzo è arrotondato o smussato, la faccia può finire fino a 3 mm sopra il piano: fai clic sulla faccia piana sopra l'arrotondamento.
3. Imposta {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} e {{ui:supportRib.firstLayer}} come nel tuo slicer. La nervatura è spessa due linee dell'ugello, la distanza dal pezzo mezza linea; ogni ponte è largo una linea e alto esattamente un layer e poggia su un layer della stampa, così lo slicer lo stampa come una sola linea sottile che si stacca in modo pulito. {{ui:supportRib.height}} dice fin dove la nervatura sale lungo la faccia (a metà all'inizio), {{ui:supportRib.bridgeSpacing}} quanto distano i ponti, in layer interi.
4. In {{ui:supportRib.more}} si impostano a mano spessore, distanza, larghezza dei ponti e spessore del piede (fino ad allora seguono ugello e layer), oltre alla larghezza del piede e ai raccordi al piede e in alto.
5. {{ui:supportRib.apply}} aggiunge la nervatura. Con {{ui:supportRib.bundle}} (attivo all'inizio) nervatura e pezzo sono raggruppati: si muovono insieme e arrivano nello slicer come due corpi affiancati, uniti dai ponti nella stampa.

La nervatura è un corpo mesh: per cambiarla, eliminala e rifalla. Ogni clic crea una nervatura; per altre fai clic su {{ui:supportRib.repick}} o ripetila con {{ui:editor.tool.array}}. La nervatura non deve entrare nel pezzo da nessuna parte e il pezzo deve poggiare sul piano, altrimenti la finestra dice perché. Le impostazioni restano in questo browser per la nervatura successiva.

{{ui:clearance.title}} e {{ui:printCheck.title}} conoscono la nervatura: che i suoi ponti entrino nel pezzo e che nervatura e ponti siano sottili e attraversino la fessura all'altezza di uno strato è voluto e non viene segnalato. Una nervatura fatta con layerling 1.148.0 non porta ancora questo contrassegno; rifalla e i controlli la lasceranno fuori.

## Spessore delle pareti, gioco e smussi

- Le pareti dovrebbero essere larghe almeno due linee di estrusione: 0,8 mm con un ugello da 0,4 mm. Per pezzi robusti, servono da 1,2 a 2 mm.
- Quando due parti devono incastrarsi, occorre lasciare del gioco: in genere da 0,2 a 0,4 mm, in base alla stampante. Prima di stampare il pezzo grande, prova un piccolo incastro di test.
- Molti smussano leggermente il bordo inferiore appoggiato sul piatto. Questo limita l’allargamento del primo strato (il cosiddetto “piede d’elefante”).

## Il gioco della tua stampante: la prova di accoppiamento

Ogni stampante stampa i fori un po' più piccoli e i perni un po' più spessi di come sono disegnati, ognuna di una misura sua, quindi il gioco che serve a due parti stampate all'inizio è una stima. Misuralo invece una volta: nelle impostazioni, in {{ui:workspace.workplane}}, {{ui:workspace.fitTestMake}} mette una prova di accoppiamento sul piatto. È una piastrina di 60 × 20 × 4 mm con sette fori per un perno da 5 mm, ognuno disegnato da 5 mm più due volte 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 o 0,40 mm, con il valore in rilievo accanto, e il perno da 5 mm stesso, in piedi accanto alla piastrina con un piccolo smusso in cima. È fatta di forme comuni, quindi si stampa con il resto del piatto, senza supporti.

Su una stampante il cui piano si muove avanti e indietro, il perno alto e sottile può oscillare, staccarsi o venire ondulato alla base, con o senza brim. Spunta {{ui:workspace.fitTestBase}} prima di creare la prova di accoppiamento: il perno poggia allora su una piccola piastra di 10 mm che aderisce al piano. Non tocca la parete della sua sede ma poggia su un piccolo dente sul fondo; dopo la stampa, piegalo avanti e indietro e si stacca.

Stampala così com'è, poi infila il perno, con lo smusso davanti, nei fori a partire dal più stretto. **Il foro più stretto in cui il perno gira ancora** dà il gioco della tua stampante. Scrivi il suo numero in {{ui:workspace.printerPlay}} oppure fai clic su di esso tra i valori sotto il campo. Il gioco è per lato, in millimetri, e il browser lo conserva per tutti i progetti; un campo vuoto significa non misurato.
Con più stampanti, scegli prima in {{ui:workspace.printer}} quella su cui stampi: ogni stampante conserva il proprio gioco, e i nuovi usi partono dal gioco della stampante impostata per il progetto. Una stampante senza gioco proprio usa quello impostato quando non era scelta nessuna stampante.

Da quel momento i nuovi utilizzi partono dal gioco invece che dal valore predefinito: {{ui:lid.gap}} e {{ui:lid.hingePinPlay}} nello strumento {{ui:editor.tool.lid}}, il gioco di una nuova {{ui:shape.dovetail}} e di un nuovo {{ui:shape.snapFit}}, {{ui:prop.clearance}} di un nuovo dado o foro filettato – il doppio del gioco, perché è lo spazio su tutto il diametro – e {{ui:clearance.threshold}} in {{ui:editor.tool.clearance}}. Lo stesso vale per il {{ui:split.connectorClearance}} di spine, perni e code di rondine in {{ui:editor.tool.split}}. Finché un campo così mantiene quel valore, “{{ui:printerPlay.fromFitTest}}” accanto dice da dove viene il numero. Una cerniera stampata in un pezzo e le articolazioni dello strumento {{ui:editor.tool.flexi}} mantengono i loro 0,4 mm: stampate in un pezzo unico, le loro fessure devono restare aperte anche tra gli strati, e questo un perno stampato a parte non lo misura. Lo spazio per inserire a pressione un magnete o una chiave Gridfinity e lo spazio per una presa o una scheda acquistate mantengono anch'essi i propri valori. I corpi già presenti in un progetto non cambiano mai, e nemmeno un progetto che apri.

## Controllare la stampa

{{ui:editor.tool.printCheck}}, accanto a {{ui:editor.tool.clearance}} in {{ui:editor.group.combine}}, esamina gli oggetti selezionati, o tutti quelli visibili se non è selezionato nulla, e dice in una finestra cosa andrebbe storto in stampa. Ognuna delle sue cinque righe è verde se non ha trovato nulla, e arancione con cosa e dove se ha trovato qualcosa:

- **{{ui:printCheck.thin.title}}**: punti più sottili di due linee dell'ugello, cioè 0,8 mm con un ugello da 0,4 mm. Lo slicer tralascia una parete così o la stampa come un'unica linea debole. In alto nella finestra scegli il tuo ugello in {{ui:printCheck.nozzle}} (da 0,2 a 0,8 con un clic, qualsiasi altro nel campo). I punti sottili vengono dipinti di rosso con una griglia chiara sui corpi, e la riga indica il punto più sottile e quanta superficie è troppo sottile. I punti sotto 1 mm² e gli spigoli vivi, come quello di un cuneo, sono esclusi.
- **{{ui:printCheck.floating.title}}**: un corpo, o una parte separata di un corpo, che non tocca né il piatto né un'altra parte (entro 0,05 mm). Verrebbe stampato nel vuoto. Una parte appoggiata su una parte che sta in piedi va bene.
- **{{ui:printCheck.contact.title}}**: una parte sul piatto il cui primo strato è molto piccolo per la sua altezza, come una sfera o un cono sulla punta. Può staccarsi durante la stampa. L'avviso compare sotto 0,5 mm² di appoggio, misurato 0,1 mm sopra il piatto, per ogni millimetro di altezza: una sfera è sempre sotto, un cubo di 10 mm ha 10.
- **{{ui:printCheck.overhang.title}}**: gli stessi numeri di **Mostra sbalzi**, con l'angolo impostato lì.
- **{{ui:printCheck.openMesh.title}}**: una mesh importata con spigoli aperti, o spigoli condivisi da tre o più facce. Lo slicer deve allora indovinare dov'è l'interno.

![Una vaschetta la cui parete destra è spessa solo 0,6 mm: Controlla la stampa la colora di rosso e la segnala nella finestra.](shot:print-check)

{{ui:printCheck.show}} su una riga porta lì la telecamera; seleziona le parti sospese, quelle con poco appoggio e le mesh aperte, e per le sporgenze attiva **Mostra sbalzi**. I corpi che si sovrappongono vengono controllati uniti, come li unisce lo slicer. Se modifichi il progetto mentre la finestra è aperta, compare {{ui:printCheck.stale}}; fai clic lì o su {{ui:printCheck.checkAgain}}. [[Esc]] chiude la finestra. Il progetto non cambia. Un'IA fa lo stesso controllo con `layerling_check_print`.

## Quando il pezzo è pronto

Scegli {{ui:editor.export}}, poi **STL** o **3MF**. STL è il formato più semplice. 3MF conserva i nomi e i colori dei singoli corpi, quindi è comodo per la stampa multicolore. La finestra di esportazione mostra anche quanti grammi e metri di filamento servirebbero per stampare il pezzo pieno. Altre informazioni in [File e salvataggio](chapter:files-and-saving).
