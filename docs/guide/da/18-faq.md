---
title: Ofte stillede spørgsmål
summary: Korte svar på det, folk oftest spørger om, om at gemme, store modeller, rundinger, AI og print, hver med vejen til den fulde forklaring.
contents: questions
---

Hvert svar er kort og slutter med det sted i denne vejledning, der forklarer det helt. Søgefeltet øverst finder et spørgsmål ud fra et hvilket som helst ord i det.

## Lagring og sikkerhedskopier

### Hvor gemmes mine designs, og er der en sky?

I browseren på din egen computer. Der er ingen konto og ingen sky, og intet uploades; hver ændring gemmer sig selv. Den, der kører layerling på sin egen server, kan også opbevare designs i en delt mappe dér.

Mere: [Hvor dine designs bor](chapter:files-and-saving#hvor-dine-designs-bor)

### Mine designs er væk. Hvad er der sket?

Designs ligger i én browser på én computer. De er væk, hvis browserens data for siden er blevet slettet, og de vises ikke i en anden browser eller på en anden computer. Safari på Mac, iPhone og iPad sletter en sides data efter syv dage uden besøg, medmindre layerling er installeret som app. Har du en sikkerhedskopi, henter {{ui:dashboard.restoreBackup}} på startsiden dine designs tilbage, med deres mapper og billeder.

Mere: [Dine designs, din sikkerhedskopi](chapter:files-and-saving#dine-designs-din-sikkerhedskopi)

### Hvordan sikkerhedskopierer jeg det hele, også af sig selv til en mappe?

{{ui:dashboard.backupAll}} på startsiden pakker alle designs i én ZIP-fil. Derudover gemmer layerling selv tidligere versioner af hvert design, og i Chrome og Edge kan det skrive hver af dem som en .lyl-fil i en mappe, du vælger. Versionerne i browseren forsvinder, når browserens data forsvinder, så de erstatter hverken ZIP-filen eller mappen.

Mere: [Tidligere versioner](chapter:files-and-saving#tidligere-versioner)

### Hvordan tager jeg et design med til en anden computer eller browser?

Gem det som en .lyl-fil fra eksportvinduet, og åbn filen på den anden computer fra startsiden. For alle designs på én gang bruger du {{ui:dashboard.backupAll}} her og {{ui:dashboard.restoreBackup}} dér; designs, der allerede findes, tilføjes ikke to gange.

Mere: [Sikkerhedskopiér og giv videre](chapter:files-and-saving#sikkerhedskopier-og-giv-videre)

### Hvad sker der, når jeg sletter browserens data?

De designs, der er gemt i den browser, slettes, og det samme gør de tidligere versioner, som layerling gemte dér. En ZIP-fil fra {{ui:dashboard.backupAll}}, dine .lyl-filer og en mappe til sikkerhedskopier på dit drev bliver ikke rørt. Tag først en sikkerhedskopi, og slet så.

Mere: [Dine designs, din sikkerhedskopi](chapter:files-and-saving#dine-designs-din-sikkerhedskopi)

### Hvordan kommer jeg tilbage til en tidligere tilstand?

Fortryd går tilbage trin for trin. Historikvisningen viser hvert trin med en skyder uden at ændre designet og kan lave et nyt design ud fra et hvilket som helst af dem. Til en tilstand fra tidligere i dag eller sidste uge åbner listen over tidligere versioner en gammel version som et nyt design og lader det nuværende være, som det er.

Mere: [Se tilbage: historikvisningen](chapter:select-and-arrange#se-tilbage-historikvisningen) og [Tidligere versioner](chapter:files-and-saving#tidligere-versioner)

### Kan STL og 3MF gå direkte i min projektmappe? Og hvordan får jeg en download igen?

I Chrome og Edge spørger den første eksport af et design, hvor der skal gemmes, og senere eksporter skriver i den samme fil uden at spørge. Firefox og Safari downloader altid. Vil du have en download hver gang, så slå {{ui:workspace.stlAsDownload}} til i indstillingerne.

Mere: [Eksport](chapter:files-and-saving#eksport)

### Gem-dialogen lukkede, og der er ingen fil. Hvorfor?

Browseren melder en dialog, den ikke kunne bruge, på samme måde som en, du har annulleret, og en fil, som en virusscanner blokerer, kan heller ikke skrives. Meddelelsen øverst tilbyder så {{ui:status.saveAsDownload}}, som lægger filen i dine downloads. Vil du springe dialogen over for altid, så slå {{ui:workspace.lylAsDownload}} og {{ui:workspace.stlAsDownload}} til i indstillingerne.

Mere: [Sikkerhedskopiér og giv videre](chapter:files-and-saving#sikkerhedskopier-og-giv-videre)

## Installation og opdateringer

### Er der en app, jeg kan downloade?

layerling installeres fra browseren: så får det sit eget ikon og vindue og starter uden netværk. Der er intet installationsprogram at downloade, og originalen findes kun på layerling.com. **Download eller kør ikke et "layerling"-installationsprogram fra et andet websted:** det kommer ikke fra layerling og kan indeholde malware. Vil du køre din egen kopi, er der en hurtig start til Windows og et Docker-image.

Mere: [Installér som app](chapter:offline-and-install#installer-som-app) og [Kør det selv](chapter:offline-and-install#k-r-det-selv)

### Virker layerling uden internet?

Ja, efter det første besøg starter det uden netværk, bedst installeret som app. Én ting hentes først, når der er brug for den første gang: CAD-kernen til den første STEP-eksport, omkring 22 MB.

Mere: [Installér som app](chapter:offline-and-install#installer-som-app)

### Hvordan får jeg en opdatering?

Af sig selv. En åben side opdager en ny version og viser et kort med, hvad der er nyt; {{ui:newVersion.reload}} gemmer først det åbne design og indlæser så den nye version. Startsiden viser også en nyere version.

Mere: [Opdateringer](chapter:offline-and-install#opdateringer)

### Hvilke browsere og tablets virker?

Chrome, Edge, Firefox og Safari, på en computer, en tablet eller en telefon; 3D-visningen kræver WebGL. Et par ting kan kun Chrome og Edge: skrive i dine egne filer og mapper, mappen til sikkerhedskopier og åbne .lyl-filer med et dobbeltklik. På en tablet gør en finger det, som venstre museknap gør.

Mere: [Fingre og pen](chapter:tablet-and-touch#fingre-og-pen)

## AI

### Hvad er den nemmeste måde at sætte en AI op på?

Giv en AI, der kan arbejde på din computer, adressen `https://github.com/henmedia/layerling`, og bed den om at sætte layerling op med dets MCP-server for dig. Den skal bruge et program som fanen Code i Claude-appen, Claude Code, Codex, Antigravity eller Gemini CLI. Til Windows og Mac har vejledningen også trinene et for et.

Mere: [Trin for trin for begyndere](chapter:ai-with-mcp#trin-for-trin-for-begyndere)

### Hvorfor kan AI'en ikke nå layerling.com?

Broen mellem AI'en og editoren findes kun i en kopi af layerling, der kører på din egen computer. På layerling.com er den altid slået fra, og en chat i browseren kan ikke installere noget. Så AI'en skal bruge et layerling, der er startet lokalt, og et program, der taler MCP.

Mere: [Opsætning](chapter:ai-with-mcp#ops-tning)

### Hvilken AI virker, og hvad koster det?

Ethvert program, der taler MCP; vejledningen beskriver Claude, Codex, Gemini og Antigravity. layerling selv koster ikke noget. Hvad AI'en koster, bestemmer dens udbyder: fanen Code i Claude-appen er for eksempel en del af de betalte Claude-abonnementer.

Mere: [Opsætning](chapter:ai-with-mcp#ops-tning)

### Hvilke data går til udbyderen af AI'en?

Det, AI'en læser: objekterne i det åbne design og de billeder, den tager af visningen. Det går til udbyderen af dit AI-program ligesom alt andet, du skriver dér. Selve broen kører på din computer, og uden en AI forlader intet den.

Mere: [Hvad AI'en kan gøre](chapter:ai-with-mcp#hvad-ai-en-kan-g-re)

## Hukommelse, hastighed og historik

### Hvorfor bliver layerling langsomt med min STL?

En STL er et mesh af trekanter, og et meget stort mesh gør editoren langsommere, optager meget hukommelse og gør gemning langsom. layerling siger det efter importen fra 400.000 trekanter i ét mesh eller en million i hele designet. Forenkl meshet først, importér kun de dele, du har brug for, eller byg delen af layerlings egne former.

Mere: [Store mesh](chapter:files-and-saving#store-mesh)

### Hvorfor mangler der trin i min historik?

To ting gør den kortere. Indstillingen {{ui:workspace.savedHistory}} beholder 100 trin pr. design, medmindre du ændrer den, og ældre fjernes. Og når et design er for stort til at blive gemt med hele sin historik, gemmer layerling det med halvdelen af trinene, så halvdelen igen, og siger det til dig. Selve designet gemmes altid helt.

Mere: [Gemt historik](chapter:view-and-workplane#gemt-historik)

### Hvad gør jeg, når browserens lager er fuldt?

Luk eller genindlæs ikke fanen: dine nyeste ændringer findes kun dér. Gem først en kopi ved at eksportere som .lyl. Skaf så plads: slet trin i historikvisningen, fjern designs, du ikke længere har brug for, eller sikkerhedskopiér dem og slet dem.

Mere: [Dine designs, din sikkerhedskopi](chapter:files-and-saving#dine-designs-din-sikkerhedskopi)

### Mit design er for stort til at blive gemt. Hvad nu?

Dets historik og dets mesh fylder tilsammen for meget. layerling har allerede prøvet med færre historiktrin, før det siger det. Slet historikken i historikvisningen, forenkl de tungeste importerede mesh, eller gem en .lyl med kun den nuværende tilstand.

Mere: [Sikkerhedskopiér og giv videre](chapter:files-and-saving#sikkerhedskopier-og-giv-videre) og [Forenkling af et importeret mesh](chapter:files-and-saving#forenkling-af-et-importeret-mesh)

### Browseren er løbet tør for hukommelse. Hvad hjælper?

Det sker med mesh på millioner af trekanter, hvor ét trin kræver mere hukommelse, end en browserfane får. Reducér antallet af trekanter i importerede mesh med {{ui:editor.tool.simplify}}, luk andre faner, og prøv igen. En kortere historik hjælper også, når det sker, mens der gemmes.

Mere: [Store mesh](chapter:files-and-saving#store-mesh)

### Et design åbner meget langsomt eller slet ikke. Hvad kan jeg gøre?

Som regel er dets historik af fortryd-trin blevet meget stor. {{ui:dashboard.openWithoutHistory}} i designets menu på startsiden læser kun den nuværende tilstand; de tidligere trin slettes for altid, så sikkerhedskopiér designet først, hvis du vil beholde dem. En tidligere version fra sikkerhedskopierne åbner som et nyt design.

Mere: [Sikkerhedskopiér og giv videre](chapter:files-and-saving#sikkerhedskopier-og-giv-videre)

### layerling hakker. Hvilke indstillinger hjælper?

{{ui:workspace.fastMode}} i indstillingerne slår skygger, kantlinjerne på alle legemer og kameraets efterløb fra og tegner kun visningen i skærmens opløsning. Tjek, at browseren bruger grafikkortet: på `chrome://gpu` eller `edge://gpu` skal der stå "Hardware accelerated" ud for WebGL. Store importerede mesh er den anden almindelige årsag.

Mere: [Når layerling føles langsom](chapter:view-and-workplane#nar-layerling-f-les-langsom)

### Editoren står stille eller regner længe. Vente eller genindlæse?

Vent først. Udskæringer, grupper og kantbehandlinger beregnes i baggrunden, og {{ui:status.computing}} vises, mens de kører; lange opgaver som udhuling stopper af sig selv med en besked og ændrer intet. Hvis CAD-kernen måtte genstartes, siger beskeden det, og du behøver ikke at genindlæse. Det er sikkert at genindlæse, fordi hver ændring gemmer sig selv, med én undtagelse: så længe den røde meddelelse {{ui:notice.designNotSavedTitle}} vises, skal du først eksportere en .lyl.

Mere: [Når layerling føles langsom](chapter:view-and-workplane#nar-layerling-f-les-langsom)

### 3D-visningen forbliver tom, eller en besked siger, at den ikke kunne starte. Hvad nu?

Browseren kunne ikke starte WebGL, som tegner 3D-visningen. Årsagen ligger i browseren eller grafikdriveren, ikke i dit design, og dine gemte designs slettes ikke. Luk andre faner med 3D-indhold, og genstart browseren, slå hardwareacceleration til, tillad WebGL, hvis en indstilling for privatliv eller en udvidelse blokerer det, og opdatér browseren og grafikdriveren. En anden browser er en hurtig test.

Mere: [Når layerling føles langsom](chapter:view-and-workplane#nar-layerling-f-les-langsom)

## Importerede modeller

### "Forenkl mesh" eller "Gør eksakt": hvilken skal jeg vælge?

{{ui:editor.tool.simplify}} beholder en andel af trekanterne, så en tung model bliver lettere; den forbliver et mesh. {{ui:editor.tool.makeExact}} genopbygger en model, der består af planer, cylindre, kegler og kugler, som et rigtigt CAD-legeme, så rundinger og faser følger rene kanter, og en STEP-eksport bærer rigtige flader. Det tager op til 400.000 trekanter; en figur eller en scanning forbliver et mesh. Til en stor teknisk del: forenkl først, med {{ui:simplify.keepEdges}} slået til, og gør den så eksakt.

Mere: [Forenkling af et importeret mesh](chapter:files-and-saving#forenkling-af-et-importeret-mesh) og [Gør et importeret mesh eksakt](chapter:files-and-saving#g-r-et-importeret-mesh-eksakt)

### Hvorfor mislykkes en udskæring, eller hvorfor er mit mesh "ikke vandtæt"?

Der kan kun skæres i et legeme, når dets overflade er lukket. Har et importeret mesh huller, navngiver layerling delen og antallet af åbne kanter og udelader den. Små huller lukker det selv; større skal repareres i det program, modellen kommer fra, eller i et værktøj til reparation af mesh. Printtjekket viser, hvilket legeme der er åbent.

Mere: [Tjek printet](chapter:printing#tjek-printet)

### Hvordan importerer jeg en SVG på den rigtige måde?

En SVG kommer ind som en skitseform, 4 mm høj, og dens punkter kan ændres i skitsetilstand. Tast bredden i millimeter i importvinduet, før du importerer; uden et tal beholder den sin egen størrelse. Omrids, der krydser sig selv, kan ikke blive til en solid; de udelades og tælles: saml overlappende stykker, og luk omridsene i tegneprogrammet, og importér så igen.

Mere: [Import](chapter:files-and-saving#import)

## Rundinger og faser

### Hvorfor kan en runding ikke anvendes?

Som regel er den for stor til stedet: den ville løbe ind i nabofladerne, eller kanten krummer skarpere end radius. En eller to millimeter mindre er ofte nok, og ved spidse vinkler kræver en runding mere plads, end dens radius lader ane. Kan kanterne ikke rundes sammen, så tag færre ad gangen; den kant, der står i vejen, tegnes rød. {{ui:edge.findLargest}} finder størrelsen for dig.

Mere: [Fasning og runding af kanter](chapter:edges-and-hollowing#fasning-og-runding-af-kanter)

### Hvorfor er mine rundinger væk, efter at jeg har ændret skitsen?

Efter {{ui:inspector.editSketch}} bygges legemet på ny og får nye kanter. layerling lægger rundinger og faser igen på de kanter, der ligger, hvor de gamle lå, så længe legemet har lige så mange kanter som før. Med et hjørne mere eller mindre udelades de, og beskeden siger hvor mange. Fortryd bringer det hele tilbage.

Mere: [Lav en form af det](chapter:sketches#lav-en-form-af-det)

### Hvorfor kan jeg ikke vælge nogle af kanterne på en importeret model?

STL, OBJ og 3MF indeholder kun trekanter, og kantværktøjerne virker på mesh med op til 4.000 trekanter. {{ui:editor.tool.makeExact}} gør en teknisk del til et rigtigt CAD-legeme, hvor en boring har én rund kant, som en runding kan følge. En STEP-fil har eksakt geometri fra begyndelsen.

Mere: [Gør et importeret mesh eksakt](chapter:files-and-saving#g-r-et-importeret-mesh-eksakt)

## Grupper, huller og størrelser

### Hvorfor bliver huller ovale, når jeg strækker en gruppe?

En gruppe, der ændres i størrelse, strækker alt i den, som om det var tegnet på gummi. Vælg {{ui:inspector.groupResizeKeepParts}} under {{ui:inspector.groupResize}} i gruppens indstillinger: dele, der når tværs over gruppen, strækkes, og huller og små dele beholder deres størrelse og deres afstand til den nærmeste side.

Mere: [Ændre størrelse på en gruppe: huller og små dele bevares](chapter:solids-and-holes#ndre-st-rrelse-pa-en-gruppe-huller-og-sma-dele-bevares)

### Hvorfor mislykkes gruppering, eller hvorfor har resultatet sprækker?

Enten er en del ikke lukket, og så nævner beskeden den, eller også mødes to dele næsten uden rigtigt at røre hinanden. Opløs gruppen, justér delene præcist, eller ændr en størrelse eller en position en smule, og gruppér igen. Meget tætte mesh over grænsen for at skære i importerede mesh samles slet ikke.

Mere: [Gruppering](chapter:solids-and-holes#gruppering)

### Hvordan ændrer jeg én del inde i en gruppe?

Vælg gruppen, og tryk [[E]], eller dobbeltklik på den. Så ligger delene hver for sig og kan ændres; når du afslutter, bygges gruppen igen. Rundinger og faser, der var lagt på hele gruppen, går tabt, når den bygges igen.

Mere: [Redigering af en gruppe](chapter:solids-and-holes#redigering-af-en-gruppe)

### Hvordan får jeg én del tilbage fra en tidligere tilstand?

Åbn historikvisningen, flyt skyderen til den tilstand, der stadig havde delen, klik på delen, og vælg {{ui:historyView.bringBack}}. En kopi lander i det nuværende design, som delen var, og hvor den var, med tidspunktet i navnet.

Mere: [Se tilbage: historikvisningen](chapter:select-and-arrange#se-tilbage-historikvisningen)

## Print og eksport

### STL, 3MF, OBJ eller STEP: hvilken skal jeg vælge?

Til printeren 3MF eller STL. 3MF beholder hvert legeme som en del med navn og farve; STL er ét mesh i én farve. OBJ bærer også farver. STEP er til andre CAD-programmer: det indeholder den eksakte geometri med rundinger og faser.

Mere: [Eksport](chapter:files-and-saving#eksport)

### Hvordan får jeg mine farver ind i sliceren?

Eksportér 3MF. Hvert legeme beholder sin farve, og et legeme, der er malet i flere farver, har malingen på sine flader. Bambu Studio og OrcaSlicer spørger ved åbning, hvordan farverne skal mappes til dine filamenter.

Mere: [Mal i flere farver](chapter:shapes#mal-i-flere-farver)

### Mine dele passer ikke ind i hinanden. Hvor meget spillerum har de brug for?

Som regel 0,2 til 0,4 mm, afhængigt af printeren. Pasprøven måler det: print den lille plade med syv huller, find det strammeste hul, som stiften stadig kan drejes i, og indtast den værdi som din printers spillerum. Nye låg, svalehaler og gevind tager så udgangspunkt i den.

Mere: [Din printers spillerum: pasprøven](chapter:printing#din-printers-spillerum-paspr-ven)

### Hvorfor siger layerling, at en del ikke passer i printeren?

Delen stikker ud over kanten af pladen eller er højere, end den valgte printer kan bygge. Det er kun et tip, og det kan lukkes. Vælg din printer i indstillingerne, eller del en for stor del med {{ui:editor.tool.split}}.

Mere: [Når noget ikke passer](chapter:printing#nar-noget-ikke-passer)

## Om layerling

### Er layerling gratis, og må jeg sælge det, jeg designer med det?

layerling er fri software under AGPL-3.0-licensen, uden konto. Licensen handler om programmet: den, der ændrer layerling og tilbyder det til andre over et netværk, skal også tilbyde kildekoden. Den stiller ingen betingelser til de modeller, du laver. Skrifttyper og modeller, du importerer, beholder deres egne licenser.

Hvis du vil støtte projektet, hjælper en [lille donation](support:) med udgifterne til server og udvikling. Den er frivillig, og intet i layerling afhænger af den.

Mere: [Kør det selv](chapter:offline-and-install#k-r-det-selv)

### Hvordan rapporterer jeg en fejl eller ønsker mig noget?

{{ui:editor.bugReport}} i sidefoden gemmer en ZIP-fil med designet og en kort tekst om version og browser; der er intet personligt i den. Vedhæft den i forummet eller i diskussionerne på GitHub. Spørgsmål og ønsker er velkomne begge steder.

Mere: [Fejlrapportering](chapter:files-and-saving#fejlrapportering) og [Hjælp og feedback](chapter:offline-and-install#hj-lp-og-feedback)
