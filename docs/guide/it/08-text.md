---
title: Testo e scritte curve
summary: Testo in rilievo o inciso, con otto caratteri tipografici o uno personalizzato, anche disposto lungo un arco circolare, per esempio su una moneta, un coperchio o un anello.
---

## Aggiungere testo

Scegli {{ui:shape.text}} nella libreria delle forme e posizionalo. Nel campo {{ui:prop.text}} a destra, digita il testo desiderato. Sotto trovi queste impostazioni:

- **{{ui:prop.font}}:** sono disponibili otto caratteri tipografici: Multilingua, Sans, Serif, Script, Monospazio, Arrotondato, Stencil (lettere composte da linee rette) e Giapponese (Zen Maru Gothic). Il nuovo testo usa inizialmente Sans. Tutti includono lettere accentate come ä, ö, ü ed é e il simbolo €, oltre ai kana, ai kanji più comuni e a molti kanji rari presenti in nomi come 澤, 槇 e 檜: un nome giapponese funziona con qualsiasi carattere tipografico e su un cartellino. I caratteri giapponesi vengono scaricati la prima volta che servono (i kanji rari sono in un secondo file, scaricato solo quando il testo ne contiene uno), quindi per qualche istante potrebbero apparire punti interrogativi. In seguito restano salvati sul computer e da quel momento il giapponese funziona anche offline. Puoi aggiungere caratteri tipografici personalizzati; vedi [Caratteri tipografici personalizzati](#caratteri-tipografici-personalizzati).
- **{{ui:nameTag.letterSize}}:** dimensione delle lettere vista dall’alto; {{ui:prop.height}} ne imposta lo spessore.
- **{{ui:prop.height}}:** quanto il testo sporge dalla superficie.
- **{{ui:prop.bevel}}:** arrotonda i bordi delle lettere per renderli più morbidi. Con {{ui:prop.segments}} scegli il numero di passaggi.
- **{{ui:nameTag.letterEdge}}:** arrotonda o smussa il bordo superiore delle lettere, come su un cartellino: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} o {{ui:nameTag.edge.chamfer}}, con {{ui:nameTag.letterEdgeSize}} (inizialmente 0,4 mm, al massimo pari all’altezza del testo). Può arrivare più lontano di {{ui:prop.bevel}}, ma solo fino alla larghezza dei tratti: dove un tratto è più sottile del doppio della misura, il bordo termina con una sommità più stretta. La parte inferiore resta piatta, così puoi incollare le singole lettere in seguito. Quando scegli un trattamento del bordo, questo sostituisce {{ui:prop.bevel}}.
- **Dimensioni:** imposta lunghezza e larghezza come per qualsiasi altra forma, trascinando le maniglie o digitando i valori.
- **{{ui:prop.textSpacing}}:** distanza aggiuntiva tra le lettere, espressa in percentuale della dimensione delle lettere. 0 mantiene la spaziatura del carattere tipografico; un valore positivo allontana le lettere, mentre un valore negativo (fino a -50) le avvicina, cosa spesso necessaria con un carattere personalizzato. Le lettere mantengono la propria dimensione e il riquadro segue il testo, sia diritto sia curvo. La spaziatura non si applica all’arabo e all’ebraico, perché le lettere si uniscono tra loro.
- **{{ui:prop.textStretch}}:** inizialmente disattivato; le lettere mantengono le proporzioni e restano al centro del riquadro, che può quindi essere più largo o profondo della parola. Se lo attivi, le lettere vengono allungate in entrambe le direzioni per riempire tutto il riquadro: puoi rendere le maiuscole più basse o più strette, come in Tinkercad. Si applica al testo diritto; il testo curvo ha una propria impostazione per la dimensione delle lettere.

Inizialmente il testo è un unico corpo. Se vuoi modificare le lettere singolarmente, fai clic su {{ui:inspector.separateParts}}: ogni lettera diventa una forma separata.

Puoi applicare smussi e raccordi anche agli spigoli del testo, diritto o curvo; vedi [Smussare gli spigoli e svuotare i corpi](chapter:edges-and-hollowing). Usa misure piccole, per esempio da 0,2 a 0,5 mm, perché i tratti delle lettere sono stretti.

## Caratteri tipografici personalizzati

Oltre agli otto caratteri inclusi puoi usare qualsiasi font personalizzato: un file dal tuo computer oppure, in Chrome ed Edge, un font installato nel sistema. Scegli {{ui:font.manage}} in fondo a {{ui:prop.font}}. Si apre la finestra {{ui:font.title}}.

- **{{ui:font.addFile}}** importa un file TrueType (`.ttf`), OpenType (`.otf`) o WOFF (`.woff`). Puoi anche trascinare il file direttamente nella finestra.
- **Su Windows**, i font installati si trovano nella cartella Fonts (`C:\Windows\Fonts`), che il selettore di file del browser nasconde. Aprila invece in Esplora file e trascina il font nella finestra {{ui:font.title}}. I font installati solo per il tuo account si trovano in `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, visibile anche nel selettore di file. Su Mac, i font si trovano in `/Library/Fonts` e `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** mostra i font installati sul computer. Al primo utilizzo, il browser chiede il permesso di leggerli. Il campo di ricerca trova rapidamente un font; fai clic per aggiungerlo.

Se hai selezionato del testo, il nuovo font viene applicato subito. Altrimenti compare nel gruppo {{ui:font.customGroup}} sotto {{ui:prop.font}}; il pulsante {{ui:font.use}} nella finestra lo applica ai testi selezionati. I font personalizzati funzionano come quelli inclusi: testo su arco circolare, smussi e raccordi degli spigoli ed esportazione STEP sono disponibili allo stesso modo. Le lettere non presenti nel font vengono prese da Sans.

### Arabo ed ebraico

Arabo, persiano, urdu ed ebraico si scrivono da destra a sinistra: la prima lettera si trova a destra e, in un testo misto come “Name عربي”, solo la parola araba procede in direzione inversa; le cifre mantengono l’ordine normale. Le lettere arabe si uniscono alle vicine secondo le regole della scrittura e lam-alif diventa una legatura. Serve un font che contenga questi caratteri; quelli inclusi non li hanno. Aggiungine uno personalizzato, come Arial, Tahoma o Segoe UI su Windows, oppure uno gratuito come Noto Naskh Arabic, Noto Sans Arabic o Amiri. I segni vocalici si dispongono sulla lettera corrispondente. Testo su arco circolare, contorno, sagoma, livelli e cartellini funzionano come per qualsiasi altro testo.

### Funzioni disponibili nei diversi browser

| Browser | Scegliere un file di font | Usare un font dal computer |
| --- | --- | --- |
| Chrome ed Edge su computer, anche nell’app di layerling installata | sì | sì, dopo aver concesso il permesso |
| Firefox | sì | no |
| Safari su Mac | sì | no |
| Tablet e telefono | sì, dai file del dispositivo | no |

Le pagine web non possono leggere liberamente i font installati. Solo Chrome ed Edge consentono di farlo, e solo sulle pagine sicure, con indirizzo `https`, come layerling.com. Se layerling viene aperto tramite `http`, per esempio sul tuo server o con un’installazione Docker nella rete di casa, {{ui:font.fromSystem}} non è disponibile: puoi trascinare il font da Esplora file. Negli altri browser scegli il file del font dalla cartella in cui si trova; il risultato è lo stesso. Se hai rifiutato la richiesta di Chrome o Edge, puoi concedere di nuovo il permesso nelle impostazioni del sito, aprendo il lucchetto a sinistra dell’indirizzo.

layerling non può leggere i file WOFF2 (di solito è disponibile anche una versione TTF o OTF), le raccolte di font (`.ttc`, che contengono più font in un solo file) o i font emoji a colori. Dei font molto grandi, come quelli cinesi, layerling carica i primi 8000 caratteri. Un font variabile viene letto con la propria impostazione predefinita, che di solito corrisponde allo spessore normale.

Alcuni font, soprattutto quelli corsivi e variabili, disegnano le lettere con tratti sovrapposti. Quando li importa, layerling unisce i tratti in un contorno pulito affinché il corpo resti stampabile. In questi casi le lettere sono composte da segmenti rettilinei molto brevi invece che da curve; la differenza non è visibile.

### Dove vengono conservati i font

Un font personalizzato resta **in questo browser e su questo computer**. Un altro browser o computer non lo conosce finché non lo aggiungi anche lì. Cancellando i dati del sito nel browser, elimini anche i font. Nella finestra {{ui:font.title}}, il cestino rimuove un font dal browser. I progetti non perdono nulla, come spiega la sezione seguente.

### Condividere progetti che usano font personalizzati

Un progetto **non contiene il file del font**, ma solo i contorni delle lettere usate nei testi, compresi quelli registrati nei passaggi precedenti della cronologia. Se un testo dice “Hello”, vengono conservate solo le lettere H, e, l e o. Vale per qualsiasi modalità di salvataggio: nel browser, sul tuo server, come file `.lyl` e in {{ui:myShapes.title}}.

Di conseguenza:

- **Il progetto si apre correttamente ovunque**, anche su un computer che non ha il font. Il testo mantiene lo stesso aspetto e puoi spostarlo, ruotarlo, ridimensionarlo e raccordarne gli spigoli.
- **Per le nuove lettere serve il font.** Se qualcuno che non possiede il font digita una lettera non inclusa nel progetto, layerling la disegna usando Sans. Sotto {{ui:prop.font}} il font viene indicato come {{ui:font.fromDesign}}. Aggiungendo il file del font ricompaiono tutte le lettere.
- **Le esportazioni contengono solo la geometria.** I file STL, 3MF, OBJ, STEP e SVG contengono corpi e contorni, non il font.
- **Le versioni precedenti di layerling** non supportano ancora i font personalizzati e visualizzano questi testi usando Multilingua.

**Licenze:** i font sono protetti dal diritto d’autore e la relativa licenza stabilisce come possono essere usati. I contorni delle lettere incorporati nei progetti sono simili a quelli inclusi nei file PDF, pratica consentita dalla maggior parte delle licenze. Alcuni font commerciali, però, vietano la condivisione anche di singole lettere. Prima di condividere o pubblicare un progetto che usa un font personalizzato, controllane la licenza. I font gratuiti, come quelli di Google Fonts (perlopiù rilasciati con licenza SIL Open Font License), si possono condividere liberamente. Per un pezzo stampato o un file STL esportato non ci sono problemi: non contengono più il font, ma solo la geometria.

## Testo in rilievo o inciso

- **In rilievo:** posiziona il testo sulla superficie e raggruppalo con il corpo. Le lettere sporgono come un rilievo.
- **Inciso:** imposta il testo come {{ui:inspector.hole}}, fallo penetrare leggermente nella superficie e raggruppalo con il corpo. Le lettere vengono incise.

Per scrivere su una faccia laterale, prima posiziona il piano di lavoro su quella faccia; vedi [Vista e piano di lavoro](chapter:view-and-workplane).

## Contorno, sagoma e spessore

Il testo non deve per forza essere composto da lettere piene. {{ui:prop.textFill}} nelle proprietà offre le stesse opzioni di Tinkercad:

- **{{ui:prop.textFill.filled}}:** lettere piene, come sono disegnate.
- **{{ui:prop.textFill.outline}}:** una linea lungo il contorno delle lettere, per metà all’interno e per metà all’esterno.
- **{{ui:prop.textFill.outer}}:** una linea attorno al contorno esterno delle lettere.
- **{{ui:prop.textFill.inner}}:** una linea lungo il contorno interno delle lettere.

Quando scegli una linea, subito sotto compaiono due impostazioni: {{ui:prop.sketchLineWidth}} determina lo spessore della linea e {{ui:sketch.strokeJoin}} la forma degli angoli ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} o {{ui:sketch.strokeJoin.miter}}). Le opzioni meno usate si trovano sotto {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} esclude i fori in lettere come O, A o e; {{ui:prop.textWider}} mantiene le lettere piene e le ispessisce in ogni direzione della larghezza della linea. Le lettere che si toccano si fondono in un unico pezzo.

Con una linea esterna, centrata o con l’opzione “Più spesso”, il riquadro del testo si allarga, mentre le lettere mantengono la propria dimensione. {{ui:prop.bevel}} e {{ui:prop.segments}} sono disponibili solo per le lettere piene.

## Livelli e cartellini con nome

Un cartellino per una stampa multicolore è composto da più livelli di testo: le lettere in cima, sotto lo stesso testo un po’ più largo in un secondo colore e, in basso, una piastra senza fori in un terzo colore. layerling lo crea con un solo comando:

- **Nuovo cartellino:** scegli {{ui:shape.nameTag}} nella libreria delle forme e posizionalo. Mostra la parola “Name” con lettere bianche, un bordo rosso e una piastra scura.
- **Da un testo:** seleziona il testo e fai clic su {{ui:nameTag.makeLayers}} in cima alle sue impostazioni.

Tutte le impostazioni del cartellino si trovano nel riquadro {{ui:nameTag.title}}, in cima alle impostazioni:

- **{{ui:prop.text}}** e **{{ui:prop.font}}**, anche con font personalizzati. Il cartellino si adatta alle parole.
- **{{ui:nameTag.letterSize}}:** altezza delle lettere maiuscole, in millimetri. Tutti i livelli si adattano e restano allineati.
- **{{ui:nameTag.layers}}:** una riga per ogni livello, dall’alto verso il basso. Ogni riga contiene il colore (fai clic sul quadratino colorato), quanto il livello supera la larghezza delle lettere, la sua altezza e {{ui:nameTag.noHoles}}, che riempie i fori di lettere come O e A. {{ui:nameTag.corners}} determina come il livello più largo gira attorno agli angoli delle lettere: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} o {{ui:nameTag.corner.miter}}. La riga superiore corrisponde alle lettere. **+** aggiunge un livello in fondo; **–** rimuove il livello inferiore. Un cartellino può avere da due a sei livelli.
- **{{ui:nameTag.keyring}}:** aggiunge al livello inferiore una linguetta rettilinea con estremità arrotondata e un foro per l’anello portachiavi; la linguetta si allarga insieme al foro. Il foro da 3 mm, predefinito, crea una linguetta larga 6,5 mm che sporge di 6,75 mm; il bordo del foro dista 2 mm dal bordo del livello inferiore. Scegli {{ui:nameTag.keyringDiameter}} e {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} o {{ui:nameTag.side.top}}. {{ui:nameTag.side.free}} separa il foro dal cartellino e crea accanto una {{ui:nameTag.keyringTab}} autonoma, dello stesso colore e altezza del livello inferiore: una forma normale che puoi spostare e ruotare con le maniglie nel punto desiderato. Quando è posizionata, {{ui:nameTag.keyringTabFix}} nel suo pannello la integra nel cartellino più vicino, esattamente dov’è: il foro attraversa tutti i livelli che incontra, la linguetta si unisce al livello inferiore e entrambi restano associati a quell’angolo delle lettere anche se cambiano parole o dimensioni. {{ui:nameTag.side.free}} stacca di nuovo la linguetta e la lascia dov’era, così puoi spostarla ancora. Il foro attraversa ogni livello che incontra; la linguetta si sposta con le modifiche al testo, alla dimensione delle lettere o al font. {{ui:nameTag.keyringAlong}} sposta la linguetta verso l’alto o il basso lungo il lato (a destra o a sinistra se si trova sul bordo superiore), fino al punto in cui uscirebbe dal lato; 0 corrisponde al centro. Usalo se al centro del lato c’è uno spazio, per esempio accanto a una J, e sposta la linguetta verso la parte sporgente della lettera.
- **{{ui:nameTag.letterEdge}}:** arrotonda o smussa il bordo superiore delle lettere del livello più alto, come nella finitura di un cartellino stampato: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} o {{ui:nameTag.edge.chamfer}}, con {{ui:nameTag.letterEdgeSize}} (inizialmente 0,4 mm, al massimo pari all’altezza del livello). Funziona con qualsiasi font e parola. Il bordo fa parte della mesh delle lettere, quindi lo strumento per gli spigoli considera il testo una mesh, troppo complessa per un testo così fine; scegli qui il trattamento del bordo.

Ogni modifica si vede subito. Il cartellino è un insieme: si sposta come un unico oggetto, ma ciascun livello resta un corpo indipendente del proprio colore, come serve allo slicer per una stampa multicolore. Per arrotondare o smussare gli spigoli di un singolo livello, fai clic su {{ui:group.editBundle}} e selezionalo; vedi [Smussare gli spigoli e svuotare i corpi](chapter:edges-and-hollowing).

### Creare molti cartellini insieme

Digita i nomi in {{ui:textLayers.names}}, uno per riga, fino a un massimo di cento. Il pulsante sottostante indica quanti cartellini verranno creati, per esempio “Crea 12 cartellini”. Ogni cartellino ha gli stessi livelli, dimensione delle lettere e foro per l’anello ed è un oggetto indipendente; vengono disposti in righe sotto al primo, con 5 mm di distanza. Anche un testo semplice offre l’elenco dei nomi, più in basso nelle proprie impostazioni.

## Cartellini con icona

Un cartellino con icona è uguale a un cartellino con nome, ma al posto delle lettere ha un’icona SVG, per esempio un cuore, una nuvola o il logo di un club. In cima c’è l’icona, sotto la stessa sagoma leggermente più larga in un secondo colore e, in basso, una piastra senza fori.

- **Nuovo cartellino con icona:** scegli {{ui:shape.iconTag}} nella libreria delle forme. Si apre una piccola finestra: fai clic su {{ui:iconTag.browse}}, scegli un file SVG, PNG o JPG, controlla l’anteprima, inserisci {{ui:iconTag.width}} dell’icona e fai clic su {{ui:iconTag.ok}}. Il cartellino appare al centro della piastra con gli stessi livelli di un nuovo cartellino con nome.
- **Da un corpo creato con uno schizzo:** un SVG importato o uno schizzo disegnato da te offre {{ui:nameTag.makeLayers}} in cima alle impostazioni.

Il riquadro {{ui:iconTag.title}}, in cima alle impostazioni, contiene:

- **{{ui:iconTag.replace}}:** sostituisce l’icona con quella di un altro file SVG, PNG o JPG, mantenendo livelli e larghezza.
- **{{ui:iconTag.iconWidth}}:** larghezza in millimetri dell’icona superiore. Tutti i livelli si adattano e restano allineati.
- **{{ui:nameTag.layers}}:** le stesse righe dei cartellini con nome: colore, larghezza aggiuntiva, {{ui:nameTag.corners}}, altezza e {{ui:nameTag.noHoles}}, più **+** e **–**, da due a sei livelli. La riga superiore contiene l’icona.
- **{{ui:nameTag.keyring}}:** come per i cartellini con nome, crea un foro per l’anello attraverso tutti i livelli e una linguetta con estremità arrotondata sul livello inferiore, oltre l’icona. {{ui:nameTag.keyringDiameter}} e {{ui:nameTag.keyringSide}} ne impostano dimensioni e posizione; {{ui:nameTag.side.free}} crea una linguetta autonoma, come per un cartellino con nome. La linguetta segue il contorno dell’icona: se è molto irregolare, controlla come si unisce alla piastra. {{ui:nameTag.keyringAlong}} sposta la linguetta lungo il lato, come per il cartellino con nome.
- **{{ui:iconTag.count}}:** numero di cartellini da creare, da 1 a 100. {{ui:iconTag.fill}} calcola quanti ne entrano sul piatto della stampante scelta nelle impostazioni; per loghi piccoli riempie l’intera piastra. Il pulsante sottostante li crea al centro della piastra, a 5 mm di distanza; il primo è il cartellino originale.

L’SVG deve avere contorni chiusi: un disegno composto solo da linee aperte non può diventare un cartellino. Un corpo creato da uno schizzo con riempimento a linea mantiene la forma; l’icona è l’area occupata dalla linea.

**Immagini PNG o JPG:** vengono ricalcate per crearne un contorno, mostrato nell’anteprima. In {{ui:iconTag.part}} scegli se usare la parte {{ui:iconTag.part.dark}} o {{ui:iconTag.part.light}} come icona; inizialmente viene scelta la parte che non corrisponde allo sfondo. I pixel trasparenti non fanno parte dell’icona. Anche un SVG che contiene solo un’immagine, come quando Inkscape salva una bitmap importata, viene ricalcato allo stesso modo. Il contorno segue i pixel, quindi un’immagine piccola avrà bordi irregolari: funzionano meglio immagini di almeno alcune centinaia di pixel. {{ui:iconTag.replace}} seleziona la parte dell’immagine che non corrisponde allo sfondo.

## Codici QR

Un codice QR trasforma un testo o un indirizzo web in un motivo leggibile dalla fotocamera di un telefono: per esempio un link al tuo negozio su un cartello, il nome della rete Wi-Fi su un sottobicchiere o un numero di telefono su un portachiavi.

Scegli {{ui:shape.qrCode}} nella libreria delle forme. Si apre una finestra con il cursore già nel campo di testo:

- **{{ui:qrCode.text}}:** contenuto del codice. Premi Invio per generarlo; Maiusc+Invio inserisce una nuova riga. Sotto il campo puoi vedere quanto spazio è stato usato; dieresi e altri caratteri speciali occupano due byte. Se il testo è troppo lungo, il campo te lo segnala.
- **{{ui:qrCode.errorCorrection}}:** livello L, M, Q o H. Un livello più alto permette di leggere il codice anche se una parte è sporca o graffiata (L circa 7%, M 15%, Q 25%, H 30%), ma per lo stesso testo richiede più moduli e quindi ciascun modulo diventa più piccolo. Inizialmente è selezionato M.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} crea il solo codice, alto 4 mm. {{ui:qrCode.style.raised}} lo mette in rilievo per 1 mm su una piastra bianca spessa 3 mm, come insieme a due colori, così una stampa multicolore realizza il codice scuro e la piastra chiara. {{ui:qrCode.style.engraved}} incide il codice per 1 mm nella piastra.
- **{{ui:qrCode.sizeBy}}:** inserisci {{ui:qrCode.sizeBy.width}}, cioè la larghezza totale del codice (inizialmente 40 mm), oppure la dimensione di un singolo modulo; l’altro valore compare sotto. Se i moduli sono più piccoli di 0,8 mm, appare un avviso. È una regola pratica per un ugello da 0,4 mm, non una garanzia: stampante, materiale, colori e telefono influiscono tutti sul risultato.
- **{{ui:qrCode.quietZone}}:** gli scanner hanno bisogno di un bordo vuoto largo quattro moduli attorno al codice. Su una piastra, il bordo fa parte della piastra; disattivalo solo se la piastra poggia su una superficie chiara più grande. Il codice semplice non ha un bordo proprio: lascia libero lo spazio attorno.
- **Altezze:** altezza del codice oppure, se è applicato a una piastra, altezza del rilievo o profondità dell’incisione e spessore della piastra.

L’anteprima mostra il codice così come verrà creato. {{ui:qrCode.ok}} lo posiziona al centro della piastra.

Il codice è un corpo come qualsiasi altro: puoi spostarlo, ruotarlo, ridimensionarlo (mantieni uguali larghezza e profondità, altrimenti il codice si deforma), raggrupparlo oppure trasformarlo in un foro e raggrupparlo con un tuo pezzo per inciderlo. Quando ridimensioni il codice, si ridimensiona l’intero motivo e ogni modulo resta quadrato.

Il riquadro {{ui:qrCode.title}} in cima alle impostazioni contiene il testo. Modificalo e fai clic su {{ui:qrCode.regenerate}}: il codice viene ricreato nella posizione e con la larghezza correnti. Livello di correzione, zona libera e tipo di rilievo o incisione restano invariati; per scegliere altre opzioni, crea un nuovo codice dalla libreria.

Scansiona il codice con il telefono prima di stamparlo e di nuovo dopo la stampa. I codici scuri su uno sfondo chiaro sono più facili da leggere; non tutti i telefoni riescono a leggere un codice chiaro su una piastra scura.

## Testo su un arco circolare

Vuoi che il testo segua il bordo di una moneta, un coperchio o un anello invece di procedere in linea retta? Usa l’impostazione {{ui:prop.textCurved}}.

![Il testo segue un cerchio. Tutte le lettere poggiano sulla stessa linea.](shot:curved-text)

Attivandola, il testo segue il cerchio. Tutte le lettere poggiano sulla stessa linea di base e hanno una spaziatura uniforme, come nel testo normale. Ci sono quattro impostazioni:

- **{{ui:prop.textRadius}}** (da 5 a 500 mm): raggio del cerchio su cui si dispone la linea di base delle lettere. Le lettere restano al loro posto; cambia solo la loro curvatura.
- **{{ui:nameTag.letterSize}}:** altezza delle lettere. Non dipende più dalla larghezza della forma.
- **{{ui:prop.textInward}}:** sposta il testo dalla parte superiore a quella inferiore del cerchio. Le lettere sono rivolte verso il centro.
- **{{ui:prop.textFlipped}}:** capovolge solo le lettere, per renderle leggibili dall’altro lato. Il testo resta nella stessa posizione sul cerchio.

**Il centro del cerchio coincide con il centro della forma.** Per questo l’allineamento funziona come al solito: centrando il testo con un cilindro o un anello, si dispone esattamente in modo concentrico. Quando trascini una maniglia, raggio e dimensione delle lettere aumentano insieme, così il testo non si deforma.

> **Suggerimento:** nella parte superiore del cerchio, le lettere si trovano all’esterno della linea di base; con {{ui:prop.textInward}} si spostano all’interno, rivolte verso il centro. Per far stare il testo su un disco, la somma del raggio e dell’altezza delle lettere deve essere inferiore al raggio del disco.
