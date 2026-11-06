---
title: Weergave en werkvlak
summary: Door de scène bewegen, recht van voren kijken en nieuwe vormen op elk vlak neerzetten dat je maar wilt.
---

## Rondkijken

Met de muis:

| Wat je doet | Wat er gebeurt |
| --- | --- |
| slepen met de rechterknop | de weergave draaien |
| klikken met de rechterknop | op een lichaam een menu met de meestgebruikte opdrachten: dupliceren, gat of lichaam, groeperen, verbergen, vergrendelen, verwijderen en meer; op een lege plek Plakken en Alles selecteren |
| slepen met de middelste knop | de weergave verschuiven |
| scrollwiel | in- en uitzoomen |
| [[Ctrl]] / [[Cmd]] ingedrukt houden en slepen met de linkerknop | verschuift ook de weergave |
| dubbelklik op een lege plek van het werkvlak of naast de plaat | verschuift de weergave tot die plek in het midden ligt; de weergave draait daarna om die plek |

Hoe snel het muiswiel zoomt, stel je in bij de instellingen onder {{ui:workspace.appearance}} met {{ui:workspace.zoomSpeed}}: een schuifregelaar van 1 tot 14, eerst 5; boven 10 wordt alleen het wiel sneller.

**Muisknoppen zoals in je slicer.** Ben je Bambu Studio of OrcaSlicer gewend, zet dan {{ui:workspace.mouseScheme}} in de instellingen, onder {{ui:workspace.appearance}}, op {{ui:workspace.mouseSchemeSlicer}}. Links slepen in een lege ruimte draait dan de weergave, de rechterknop verschuift hem zoals de middelste, en Shift met links slepen tekent het selectiekader. Slepen aan een lichaam verplaatst het nog steeds, en een korte rechtsklik opent nog steeds het menu. In een schets verschuift de rechterknop de weergave ook.

**3D-muis.** Een SpaceMouse of een andere 3D-muis draait, verschuift en zoomt de 3D-weergave: duw de kap van je af om in te zoomen, schuif hem om de weergave te verschuiven, kantel hem om de weergave te kantelen en draai hem om de weergave rond te draaien. Klik in de instellingen, onder {{ui:workspace.appearance}}, op {{ui:workspace.spaceMouseConnect}} en kies het apparaat in het venster dat de browser opent; die onthoudt de keuze, dus dit hoeft maar één keer. Het werkt in Chrome en Edge, die zulke apparaten kunnen bereiken; Firefox en Safari niet. Voelt een richting verkeerd om, vink hem dan onder de knop aan: zijwaarts schuiven, omhoog en omlaag schuiven, zoomen, kantelen of draaien.

Op een tablet of telefoon zoomen twee vingers (spreiden en knijpen) en verschuiven ze de weergave (samen schuiven). Eén vinger werkt op het ontwerp, net als de linkermuisknop. Om met één vinger te draaien, zet je {{ui:camera.touchRotate}} aan in de weergavebalk. Die schakelaar verschijnt alleen op apparaten met een touchscreen.

Een tekentablet met pen gedraagt zich als een muis: de punt is de linkerknop, de knop op de pen de rechter, voor het draaien van de weergave en voor het menu. De sneltoetsen van het tablet kun je in de driver instellen op de [sneltoetsen](chapter:sneltoetsen) van layerling.

**Werk op een tablet het liefst met een stylus.** De punt is veel fijner dan een vingertop en bedekt niet wat je wilt raken, dus kleine punten, dunne lijnen en grepen in een schets, meetpunten en randen worden precies geraakt, en langer werken is minder vermoeiend. layerling laat een vinger al wat verder reiken naar punten, lijnen, grepen en randen dan een muisaanwijzer, maar met een stylus blijft het nauwkeuriger.

### De weergavekubus

De kubus linksboven laat zien waar je naar kijkt. Een klik op een van de zijden springt naar het rechte aanzicht van boven, onder, voren, achteren, links of rechts. Een klik op een hoek van de kubus bekijkt het model schuin vanuit die hoek, en een klik vlak bij een rand kijkt vanaf die rand, tussen twee zijden in; de plek licht op zolang de aanwijzer erop staat. De cijfertoetsen [[1]] tot en met [[6]] geven ook de rechte aanzichten. Houd daarbij [[Shift]] ingedrukt en de weergave zoomt ook in op de selectie, zoals [[Shift]]+[[F]] doet.

Sleep aan de kubus om de weergave te draaien, net als slepen met de rechtermuisknop. Als er niets geselecteerd is, draaien ook de pijltjestoetsen de weergave: 15° per druk, 90° met [[Shift]]. Ze draaien het model de kant op waarnaar ze wijzen - [[→]] draait de voorkant naar rechts, [[↑]] kantelt de voorkant omhoog. Met [[Ctrl]] ingedrukt schuiven de pijltjes de weergave in plaats daarvan over het scherm: een tiende van het beeld per druk, de helft met [[Shift]] erbij. Het model beweegt de kant op waarnaar ze wijzen. Is er iets geselecteerd, dan verplaatsen de pijltjes dat; klik eerst op een lege plek om de weergave te draaien. Op een touchscreen werkt dit met één vinger, zonder {{ui:camera.touchRotate}} aan te zetten.

### De weergavebalk

Aan de linkerrand staat een smalle balk. Van boven naar beneden:

- {{ui:camera.home}} brengt de hele scène weer in beeld. De toets is [[Home]]; [[F]] doet het ook als er niets is geselecteerd.
- {{ui:camera.focusSelection}} zoomt in op de selectie ([[F]] of [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} en {{ui:camera.zoomOut}} zoomen stap voor stap, net als de toetsen [[+]] en [[−]].
- {{ui:camera.orthographic}} schakelt naar een platte weergave waarin evenwijdige randen evenwijdig blijven. Voor meten en randen uitlijnen is dat vaak prettiger dan de perspectiefweergave. [[O]] schakelt heen en weer, en een tweede klik zet het terug.
- {{ui:camera.secondView}} opent een tweede weergave van het ontwerp in een eigen venster, zie hieronder. Een tweede klik sluit het.
- {{ui:camera.showScrollbars}} zet een schuifbalk onderaan de weergave en een langs de rechterrand. Sleep een balk om de weergave vloeiend te verschuiven, klik op een pijl aan het eind om een klein stukje te schuiven (ingedrukt houden gaat door), of klik naast de balk om bijna een hele weergave verder te gaan. Er draait niets, en anders dan de pijltoetsen werken de balken ook terwijl een onderdeel geselecteerd is - handig van dichtbij bij kleine details. Een tweede klik verbergt ze; {{ui:workspace.startWithScrollbars}} in de instellingen bepaalt of een ontwerp ermee opent. Deze browser onthoudt de keuze bovendien.
- {{ui:camera.hideWorkplane}} (het oog boven een raster) verbergt de plaat met het raster, zodat je een ontwerp van onderen kunt bekijken. Alleen de weergave verandert: nieuwe vormen komen nog steeds op het werkvlak terecht. Een tweede klik toont de plaat weer.
- {{ui:camera.placeWorkplane}}, het meetlint en de winkelhaak zijn gereedschappen op zich, die hieronder en in [Meten en notities](chapter:meten-en-notities) aan bod komen.

Het pijltje helemaal bovenaan de balk verbergt hem als hij in de weg zit.

Een ontwerp opent zoals je het hebt achtergelaten: de hoek, de zoom en de positie van de weergave worden er in deze browser bij bewaard, zodat je verdergaat waar je gebleven was, ook nadat je naar de startpagina bent gegaan of de pagina hebt gesloten. Een opgeslagen bestand (.lyl) neemt de weergave mee, zodat het ook elders zo opent. De weergave hoort niet bij de geschiedenis van ongedaan maken.

Je kunt in elk ontwerp ook vier eigen weergaven bewaren. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] of [[Shift]]+[[0]] slaat de weergave precies op zoals ze is - hoek, positie, zoom, en vlak of in perspectief - onder die toets, en de toets alleen ([[7]], [[8]], [[9]] of [[0]]) brengt haar terug. Een melding onderaan bevestigt het opslaan; opnieuw opslaan onder dezelfde toets vervangt de weergave. Net als de weergave hierboven blijven de opgeslagen weergaven in deze browser bij het ontwerp en gaan ze mee in een opgeslagen bestand (.lyl); ze horen niet bij de geschiedenis van ongedaan maken.

### Een tweede weergave in een eigen venster

{{ui:camera.secondView}} opent een venster dat hetzelfde ontwerp door een eigen camera toont, zodat je het van twee kanten tegelijk ziet - bijvoorbeeld van voren terwijl je van boven werkt. Elke wijziging in de editor verschijnt daar meteen; het ontwerp wordt alleen in het hoofdvenster gewijzigd, en ook de grepen blijven daar. In het tweede venster draaien de muis en de weergavekubus de weergave zoals hier, en ook de toetsen: [[1]] tot [[6]], [[F]], [[Home]], [[O]], [[+]] en [[−]], de pijltjestoetsen om te draaien en [[Ctrl]] met de pijltjes om te schuiven. [[F]] zoomt daar in op wat in de editor geselecteerd is. Ook de vier opgeslagen weergaven van het ontwerp werken daar: [[7]], [[8]], [[9]] en [[0]] halen ze terug, en [[Shift]] met een van die toetsen slaat de weergave van dat venster eronder op - voor beide vensters. De eigen weergavebalk heeft {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} en {{ui:camera.hideWorkplane}}, en die werken alleen op dat venster. Het venster opent waar je het liet, even groot, en sluit samen met de editor. Op telefoons en tablets wordt de knop niet getoond.

## Naar binnen kijken: de doorsnede

{{ui:camera.sectionView}}, de laatste knop in de balk (het snijgereedschap), knipt de weergave open langs een vlak, zodat je wanden, holtes en in elkaar passende onderdelen kunt controleren. Er wordt niets echt doorgesneden: het ontwerp, de bestanden en elke export blijven heel. Waar het vlak door een lichaam gaat, is de snede gevuld met de iets donkerdere kleur van het lichaam, en een uitsparing erin blijft leeg, zo zie je massief en hol; het gevulde vlak verschijnt een moment nadat het vlak stilstaat. Bij {{ui:camera.sectionCutFace}} kies je hoe de snede eruitziet: {{ui:camera.sectionCutFaceHatch}}, de standaard, arceert hem als een tekening, en een lichaam dat in een ander ligt is de andere kant op gearceerd, zodat de twee zich onderscheiden; {{ui:camera.sectionCutFaceFill}} vult hem effen; {{ui:camera.sectionCutFaceOpen}} laat hem open, en je kijkt in de huid van het lichaam. De keuze geldt voor elk ontwerp.

- Kies de as waar het vlak dwars op staat: X (breedte), Y (diepte) of Z (hoogte), zoals in de positievelden. Het vlak begint in het midden van je ontwerp.
- {{ui:camera.sectionOrientation}} bepaalt wat deze assen volgen. {{ui:camera.sectionOrientationWorld}} neemt de assen van het ontwerp. {{ui:camera.sectionOrientationWorkplane}} neemt die van het werkvlak: Z snijdt dan evenwijdig eraan, X en Y haaks erop, en de positie telt vanaf de oorsprong. Ligt het werkvlak op een schuin vlak, dan snijd je zo evenwijdig aan dat vlak, en de snede beweegt mee als je het werkvlak verplaatst. {{ui:camera.sectionOrientationView}} zet het vlak naar het scherm: het haalt weg wat ervoor ligt, en met de schuifregelaar duw je het in kijkrichting dieper het ontwerp in, bijvoorbeeld om bij een verborgen deel te komen en het aan te klikken. Draai je daarna het beeld, klik er dan nog eens op en de snede volgt de nieuwe blik.
- {{ui:camera.sectionCoarse}} verschuift het vlak over het hele ontwerp, {{ui:camera.sectionFine}} verschuift het een klein stukje naar weerszijden van waar het staat, voor tienden van een millimeter. Je kunt de positie ook typen.
- De knop naast de assen toont de andere kant van de snede, {{ui:camera.sectionReset}} zet het vlak terug in het midden, en {{ui:camera.sectionShowPlane}} verbergt het blauwe vlak.
- Wat de snede blootlegt, kun je aanklikken en selecteren, binnenwanden inbegrepen.
- {{ui:camera.sectionWorkplane}} legt het werkvlak op de snede. Het ligt in het vlak van de doorsnede en wijst naar buiten, weg van het lichaam dat overblijft, zoals het vlak dat een snede achterlaat. Schakel je daarna naar de schets, dan begint die precies daar, en de vage omtrek toont de snede, waarlangs je kunt tekenen en waaraan je kunt vastklikken. Zo schets je bijvoorbeeld een deksel dat past in de holte die je met de doorsnede hebt geopend. De knop naast de assen kiest welke kant blijft, en daarmee welke kant het werkvlak op wijst. Het werkvlak zet je zoals gewoonlijk terug op de grondplaat.
- {{ui:camera.sectionSketch}} begint een nieuwe schets direct op de doorsnede, met de omtrekken van de doorsnede er al als lijnen in: een gat komt binnen als echte cirkel, een afgeronde hoek als boog. Pas ze aan, verwijder wat je niet nodig hebt, teken verder en voltooi: het lichaam groeit uit de doorsnede naar de kant die weggesneden is, zodat een onderdeel dat op een ander moet passen, zoals een deksel, een inzetstuk of een pakking, begint met de omtrek van precies dat onderdeel. De knop naast de assen kiest die kant. Net als bij de SVG tellen alleen zichtbare lichamen en zijn gaten al afgetrokken.
- {{ui:camera.sectionMeasure}} meet direct op de snede: de omtrek wordt blauw, en twee klikken erop geven de afstand, plus de delen daarvan langs de twee assen van het vlak. Beide punten klikken vast aan de omtrek, hoeken eerst. Komt de tweede klik ergens op de tegenoverliggende wand terecht, dan klikt hij haaks op het eerste punt vast - zo lees je wanddikte, spleten en speling af zonder precies te hoeven mikken. Een derde klik begint de volgende meting, [[Esc]] stopt met meten. Het vlak verschuiven wist de meting. Op een ronde omtrek, zoals de doorsnede door een cilinder of een gat, markeert een klein kruisje het middelpunt, en ook het middelpunt klikt vast. Klik een punt op de cirkel aan en ga dan in de buurt van het punt aan de overkant: de tweede klik landt precies recht tegenover, dwars door het middelpunt, en het getal krijgt een Ø, de diameter. Van het middelpunt naar een punt op de cirkel lees je R, de straal.
- {{ui:camera.sectionExportSvg}} slaat de omtrekken op het snijvlak op als SVG op schaal 1:1, voor een laser, een plotter, een mal of een pakking. Een X-snede wordt van rechts gezien, een Y-snede van voren, een Z-snede van boven. Net als bij de export gaan alleen zichtbare lichamen mee, zijn gaten al afgetrokken, en worden lichamen met dezelfde kleur samengevoegd tot één omtrek. Elke kleur blijft een eigen pad zonder vulling, zodat lasersoftware ze als lagen uit elkaar houdt.

Het kruisje en [[Esc]] sluiten het gereedschapsvenster; loopt er een meting, dan beëindigt [[Esc]] eerst die. De doorsnede blijft tot je hem uitzet met {{ui:camera.sectionActive}}, op zijn knop in de balk klikt terwijl het venster open is, of teruggaat naar het ontwerpoverzicht. Zolang hij aan staat, blijft zijn knop gemarkeerd. Wat je neerzet aan de kant die weggesneden is, verschijnt pas als je de doorsnede uitzet. Een tablet heeft geen [[Esc]], dus daar heeft het gereedschapsvenster twee knoppen meer: {{ui:camera.sectionBack}} beëindigt de meting als er een loopt en sluit anders het gereedschapsvenster, en {{ui:camera.sectionConfirm}} sluit het gereedschapsvenster in één stap. Een computer toont ze niet.

Het gereedschapsvenster hangt aan zijn knop. Zit het iets in de weg, sleep het dan aan de titelbalk naar een willekeurige plek op het werkvlak; de volgende keer opent het daar ook. Dubbelklik op de titelbalk of zet het neer bij de knop om het terug te zetten.

[[Esc]] sluit het venster; de snede blijft tot je hem uitzet of teruggaat naar het ontwerpoverzicht. Zolang hij aan staat, blijft de knop gemarkeerd. Wat je neerzet aan de kant die weggesneden is, verschijnt pas als je de snede uitzet.

## Het werkvlak

Nieuwe vormen richten zich naar het werkvlak. In het begin is dat de grondplaat met het raster. Maar je kunt het op elk vlak leggen, om iets op een zijkant of een schuin vlak te zetten.

1. Druk op [[W]] of klik op {{ui:camera.placeWorkplane}}.
2. Beweeg de muis over een vlak van een lichaam. Het licht op.
3. Een klik legt het werkvlak daar neer. Alles wat je nu toevoegt, staat op dat vlak.

Klik je in plaats daarvan op de lege plaat, dan ligt het werkvlak plat op de plek waar je klikte, op het uitlijnraster. Nieuwe vormen en een afgeronde schets, ook een omwentelingsschets, verschijnen dan daar in plaats van in het midden van de plaat. Zolang het werkvlak zo plat op de plaat ligt, toont de plaat alleen zijn omtrek: twee rasters in hetzelfde vlak zouden een flikkerend patroon geven.

Op een vlak klikt de oorsprong van het werkvlak verder vast aan het raster. Klik dicht bij een hoek van het vlak en hij zit precies op die hoek. Dicht bij een rand ligt hij op de rand en lijnt het raster ermee uit; zo kies je bewust de hoek van het raster. Zonder hoek of rand loopt het raster op een liggend vlak evenwijdig aan het lichaam, dus op een gedraaide kubus is het mee gedraaid.

Een klik naast de plaat of [[Esc]] zet het werkvlak terug op de grondplaat. Nog sneller is {{ui:camera.resetWorkplane}}: de knop met het pijltje omlaag staat in de weergavebalk onder het oog, zolang het werkvlak op een vlak ligt. [[Shift]]+[[W]] legt het direct op het geselecteerde vlak. [[Alt]]+[[W]] zet het altijd terug op de grondplaat, of er nu iets geselecteerd is of niet. Houd je [[Shift]] ingedrukt tijdens het klikken, dan wijst het vlak de andere kant op.

Zolang een werkvlak op een vlak ligt, verschijnt er een oog naast {{ui:camera.placeWorkplane}}. Dat verbergt het werkvlak zonder het los te laten, voor een vrij zicht op het ontwerp: nieuwe vormen komen nog steeds op dat vlak terecht, en draaien gebeurt nog steeds daaromheen. Een klik op het oog toont het weer, en een nieuw werkvlak neerleggen ook.

Om recht op het werkvlak te kijken, druk je op [[P]] of klik je in de weergavebalk naast {{ui:camera.placeWorkplane}} op {{ui:camera.lookOntoWorkplane}}. De weergave draait tot je het vlak recht van voren ziet, vanaf de kant waar nieuwe vormen naartoe groeien, met de oorsprong in het midden. Op de basisplaat is dat het bovenaanzicht.

## Bouwplaten

Als een ontwerp meer bevat dan één plaat kan printen, bijvoorbeeld een doos met deksel en inzetstukken, kan het meerdere bouwplaten krijgen. Klik op {{ui:editor.tool.buildPlates}} in de groep {{ui:editor.group.arrange}}, of kies {{ui:plates.moveTo}} in het menu van een rechtsklik op een lichaam. Onderaan de weergave verschijnt een balk met één knop per plaat; het getal erop zegt hoeveel lichamen op de plaat staan.

- Elke plaat is zo groot als het werkvlak, en de platen liggen naast elkaar rechts van de eerste, 20 mm uit elkaar. Een lichaam hoort bij de plaat waarop het midden van zijn voetafdruk staat; sleep je het naar de overkant, dan staat het op de andere plaat. Een ontwerp heeft tot 12 platen.
- Een klik op een plaat in de balk toont die, en nieuwe vormen komen er dan op. {{ui:plates.showAll}} toont ze allemaal. Een dubbelklik op een plaat, of {{ui:plates.rename}}, geeft haar een naam zoals "Deksel", die op de plaat staat.
- {{ui:plates.moveLeft}} en {{ui:plates.moveRight}} veranderen de volgorde, de lichamen gaan mee met hun plaat. {{ui:plates.remove}} haalt de actieve plaat weg; haar lichamen komen op dezelfde plek op de eerste plaat.
- {{ui:plates.arrange}} legt de geselecteerde lichamen, of alle, rij voor rij op de platen, de grootste eerst, 5 mm uit elkaar, en voegt platen toe zolang die nodig zijn. Een lichaam dat groter is dan een plaat blijft staan.
- Met een gekozen printer wordt elk lichaam tegen zijn eigen plaat gecontroleerd, en de bouwhoogte telt vanaf het laagste lichaam op die plaat. Een plaat met een lichaam dat niet past, toont haar getal in rood.
- In de eigenschappen telt X vanaf het midden van de eigen plaat van het lichaam.

Het exportvenster biedt dan {{ui:export.plates}}: alle platen in één bestand, naast elkaar zoals in het ontwerp; één bestand per plaat, samen in een ZIP (STL, 3MF en OBJ); of één enkele plaat, gezet waar de eerste plaat ligt. Een slicer opent elk bestand als één plaat; wie de platen na elkaar print, neemt dus de bestanden per plaat. Lichamen tussen platen verplaatsen en verdelen kun je ongedaan maken; platen toevoegen, benoemen, ordenen en verwijderen wordt met het ontwerp bewaard, maar niet ongedaan gemaakt.

## Raster en vastklikken

Het raster toont de grootte van de plaat. Rechtsonder staat de **snapstap**: verplaatsen en schalen klikken vast in stappen van die grootte, bijvoorbeeld 1 mm. Maak hem kleiner voor fijn werk en groter voor grof schikken. {{ui:editor.tool.snapToGrid}} in het lint verplaatst de geselecteerde vormen achteraf naar het dichtstbijzijnde rasterkruispunt. Tijdens het verplaatsen klikken vormen ook vast aan andere vormen, zie [Selecteren en schikken](chapter:selecteren-en-schikken). Zonder muis: [[Alt]]+[[1]] tot [[Alt]]+[[0]] kiezen het item met dat nummer in het menu ([[Alt]]+[[1]] zet vastklikken uit), en [[,]] en [[.]] maken de stap een maat fijner of grover. Dat werkt ook in een schets.

> **Tip:** Stop met draaien als je onderdelen precies op elkaar laat aansluiten. Ga met de cijfertoetsen naar het rechte aanzicht van boven of voren en druk op [[O]] voor de platte weergave. Dan zie je meteen of twee randen echt gelijk liggen.

### Het instellingenvenster

Het tandwiel in de titelregel ({{ui:editor.workspaceSettings}}) opent de instellingen. Links staan vijf onderdelen: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} en {{ui:workspace.history}}. Een wijziging telt meteen. {{ui:workspace.makeDefault}} onderaan bewaart de huidige instellingen als standaard, zodat een nieuw ontwerp ermee begint. Een bestand dat je opent, brengt zijn eigen instellingen mee; {{ui:workspace.useMyDefault}} ernaast zet je bewaarde kleuren, raster en de rest op het geopende ontwerp en houdt daarbij zijn eenheden. Heeft je standaard een printer, dan komt die printer mee met zijn plaatgrootte; zonder printer houdt het ontwerp zijn plaat en printer. {{ui:workspace.close}} rechtsboven sluit het venster. Dit deel loopt de instellingen een voor een door.

### Weergave: thema, werkbalk en kubus

{{ui:workspace.theme}} bepaalt het kleurenschema van het hele programma: {{ui:workspace.themeSystem}} volgt je computer, de andere zijn {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} en {{ui:workspace.themeGraphite}}. Je kunt het ook rechtsboven in de editor wisselen.

{{ui:workspace.toolbarSize}} onder {{ui:workspace.appearance}} maakt de knoppen van het lint bovenaan, het vormenmenu daarvan, de weergavebalk links en het eigenschappenpaneel rechts kleiner of groter: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (zoals het altijd was) of {{ui:workspace.toolbarSizeLarge}}. Klein laat op een laptop meer ruimte voor het werkvlak; groot is makkelijker te raken op een groot scherm of met een vinger. Met grote knoppen gaan de groepen van het lint naar een tweede rij als het venster er te smal voor is. De grootte wordt in deze browser bewaard en geldt voor elk ontwerp.

{{ui:workspace.shapeColors}} zet de kleur waarmee een nieuwe vorm begint op de plaatjes van de vormenbibliotheek (de kleur van zijn soort, of die je met {{ui:inspector.saveDefaults}} bewaarde). Zet het uit als je liever grijze plaatjes hebt; je browser onthoudt de keuze.

{{ui:workspace.viewCubePosition}} onder {{ui:workspace.appearance}} zet de richtingskubus in een andere hoek van het werkvlak: {{ui:workspace.viewCubePositionTopLeft}} (zoals het altijd was), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} of {{ui:workspace.viewCubePositionBottomRight}}. In elke hoek behalve linksboven schuift de weergavebalk omhoog naar de plek die de kubus vrijliet. Rechtsonder staat de kubus net boven de {{ui:inspector.snapGrid}}-knop. Zolang rechts de eigenschappen van een vorm open zijn, wijkt een kubus aan de rechterkant links ervan uit. De hoek wordt in deze browser bewaard en geldt voor elk ontwerp. In een smal venster, zoals op een telefoon, is de instelling verborgen en blijft de kubus linksboven.

### Weergave: snelle modus

{{ui:workspace.fastMode}} is voor tragere computers. Het zet schaduwen, randlijnen op alle lichamen en de naloop van de camera uit en tekent de weergave alleen op schermresolutie. Je eigen instellingen blijven bewaard voor later, en de schakelaars die het overneemt, zeggen {{ui:workspace.offInFastMode}} zolang het aan staat. Wat verder helpt op een trage computer, staat hieronder bij "Als layerling traag aanvoelt".

### Weergave: kleuren van het werkgebied en de schets

De kleuren van het werkgebied stel je in onder {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} en {{ui:workspace.surfaceColor}} voor het lichte thema (de donkere thema's houden hun eigen), naast de rasterkleur onder {{ui:workspace.workplane}}. Elke kleur is een knop die de kleur toont. Een klik opent een klein venster met het kleurvlak, een rij kant-en-klare kleuren, een veld voor de hexwaarde en een pijl die de kleur terugzet naar waarmee layerling begon. [[Enter]] neemt een getypte hexwaarde over, net als een klik buiten het venster.

De schetsweergave heeft eigen kleuren: {{ui:workspace.sketchBackground}} voor het venster rond het blad, {{ui:workspace.sketchPlateColor}} voor het blad onder het raster en {{ui:workspace.sketchGridColor}}, allemaal voor het lichte thema. {{ui:workspace.sketchMatch}} neemt de drie kleuren van het werkgebied in één klik over.

{{ui:workspace.classicLook}} richt het werkgebied in zoals Tinkercad het toont: witte ondergrond, een lichtblauw millimeterraster met elke centimeter een donkerdere lijn, zwarte randlijnen, licht van boven met zachte schaduwen. Elke waarde kun je daarna nog los wijzigen. Ze beginnen allemaal zoals layerling er altijd uitzag, en wat bij je past, hangt af van je monitor.

![De instellingen onder Weergave: achtergrond- en werkvlakkleuren voor het lichte thema, en de schakelaar voor randlijnen op alle lichamen.](shot:settings-appearance)

![De editor in het donkere kleurenschema. Het kleurenschema stel je rechtsboven in: Systeem, Licht, Donker of Grafiet.](shot:editor-dark)

### Weergave: aspijlen en randlijnen

{{ui:workspace.showAxes}} (standaard aan) tekent drie pijlen in de linkerachterhoek van de plaat: **X** in rood naar rechts, **Y** in groen naar achteren en **Z** in blauw omhoog, zoals de positievelden tellen. Dat is de rechterhandregel die ook Tinkercad, CAD-programma's en de slicers gebruiken. Met het werkvlak op een vlak volgen ze dat. Zet ze hier uit als ze je in de weg zitten.

{{ui:workspace.edgeLines}} tekent een omtrek op elk lichaam, in de kleur van {{ui:workspace.edgeColor}} (eerst zwart, zoals in Tinkercad): dat helpt als donkere kleuren in elkaar overlopen. Het staat standaard uit, en zeer grote geïmporteerde meshes worden overgeslagen.

![Drie donkere lichamen met randlijnen aan: de omtrekken houden ze uit elkaar.](shot:edge-lines)

{{ui:workspace.strongHoles}} tekent gaten in een donkerder grijs, minder doorzichtig en met een donkere lijn eromheen. Dat helpt als een gat tussen doorzichtige lichamen moeilijk te vinden is. Anders dan de randlijnen blijft het in de snelle modus aan.

### Weergave: licht en schaduwen

{{ui:workspace.showShadows}} zet de slagschaduwen aan en uit. Twee schuifregelaars bepalen hoe de lichamen belicht worden. {{ui:workspace.shadowStrength}} bepaalt hoe donker de slagschaduwen zijn, en {{ui:workspace.shadeContrast}} verschuift licht van het gelijkmatige omgevingslicht naar het hoofdlicht: richting "krachtig" worden de schaduwkanten donkerder en tekenen de schaduwen zich sterker af, richting "zacht" wordt alles vlakker. Helemaal bovenaan wordt het contrast heel sterk, zodat schaduwkanten en schaduwen echt donker worden. {{ui:workspace.shadowSoftness}} maakt de randen van de schaduwen zacht in plaats van scherp. {{ui:workspace.lightAzimuth}} draait het hoofdlicht rond de plaat (0° van voren, 90° van rechts), en {{ui:workspace.lightElevation}} tilt het op; bij 90° staat het recht boven de plaat zoals in Tinkercad, en vallen de schaduwen recht onder de lichamen. {{ui:workspace.softLighting}} laat het meeste licht komen van waar je kijkt en draait mee met de weergave: geen vlak blijft donker, en een naar boven gericht vlak in een donkere kleur wordt niet meer wit overbelicht. Het hoofdlicht blijft een beetje voor de schaduwen, en de contrastregelaar werkt nog steeds. Zie je met laag ingesteld licht nog een heldere reflectie, zet {{ui:workspace.lightElevation}} dan op 90°: dan lijkt het op Tinkercad. {{ui:workspace.lightReset}} zet alles terug.

### Weergave: maten op het werkvlak

{{ui:workspace.showMoveDimensions}} toont hoeveel je verschuift tijdens het slepen, {{ui:workspace.showOriginDimensions}} de afstanden van de selectie tot de oorsprong van de plaat, ook met meerdere lichamen geselecteerd. Met {{ui:workspace.dimensionsAlwaysVisible}} blijven deze maten altijd zichtbaar, niet alleen tijdens het slepen. Zolang een gedraaid lichaam geselecteerd is, staan zijn hoeken eronder op het werkvlak; {{ui:workspace.showRotationAngles}} zet dat uit. Meer in [Meten en notities](chapter:meten-en-notities).

### Weergave: selecteren en verplaatsen

{{ui:workspace.selectBeforeMoving}}: een lichaam moet dan eerst geselecteerd zijn, en pas het volgende slepen verplaatst het. Dat helpt als kinderen of gehaaste handen lichamen aanraken, en op een touchscreen.

{{ui:workspace.frameByDirection}}: een kader dat je naar rechts trekt, selecteert alleen wat er helemaal binnen ligt, een kader naar links alles wat het raakt (gestippeld getekend), zoals in SketchUp.

{{ui:workspace.doubleClickOpensSketch}} bepaalt of een dubbelklik op een geëxtrudeerde schets de schets weer opent, zoals in Tinkercad, en {{ui:workspace.doubleClickOpensGroup}} of een dubbelklik op een groep of bundel die opent om te bewerken. {{ui:workspace.doubleClickCentersView}} bepaalt of een dubbelklik op het lege werkvlak de weergave naar die plek verschuift.

{{ui:workspace.objectSnap}} laat de randen en het midden van een vorm vastklikken aan andere vormen terwijl je hem sleept; het rastermenu rechtsonder heeft dezelfde schakelaar. {{ui:workspace.cruise}} laat een nieuwe vorm aan de muisaanwijzer hangen en neerkomen op het vlak eronder, zoals Cruise in Tinkercad; uitgeschakeld verschijnt een nieuwe vorm in het midden van de plaat. Meer in [Selecteren en schikken](chapter:selecteren-en-schikken).

### Weergave: het beeld

{{ui:workspace.startInPerspective}}: de editor opent dan in het perspectiefaanzicht, niet in het vlakke.

{{ui:workspace.startWithScrollbars}}: een ontwerp opent dan met de schuifbalken van de weergave. De instelling wordt met het ontwerp en met {{ui:workspace.makeDefault}} bewaard.

{{ui:workspace.startView}} bepaalt de hoek waarin een nieuw ontwerp opent en waarnaar {{ui:camera.home}} teruggaat. Draai en zoom de weergave zoals je hem graag hebt en klik dan op {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} brengt het gewone aanzicht van rechtsvoor terug. Het geldt voor elk ontwerp in deze browser. Een ontwerp dat je opnieuw opent, opent nog steeds zoals je het achterliet.

{{ui:workspace.zoomSpeed}} is een schuifregelaar van langzaam naar snel: hoe snel het wieltje en het trackpad zoomen; de zoomknoppen en -toetsen houden hun eigen kleine stappen. {{ui:workspace.cameraInertia}}: als je de muis loslaat, draait de weergave nog even door en remt zacht af. Uitgeschakeld stopt hij meteen, zoals in Tinkercad en Fusion 360.

{{ui:workspace.overhangAngle}} is de hoek vanaf welke een vlak als overhang telt als je Overhangen tonen in het zichtbaarheidsmenu aanzet: die vlakken worden rood-wit gearceerd. 30° is voorzichtig, 70° rekent op goede koeling van de print; 45° is het gebruikelijke begin. Zolang ze getoond worden, zegt een regel onder de weergave wat de steilste overhang is en hoeveel cm² steun nodig heeft.

{{ui:workspace.booleanTriangleLimit}} beperkt hoeveel driehoeken een geïmporteerde mesh mag hebben als je hem snijdt, samenvoegt of doorsnijdt, omdat dat in je browser berekend wordt. Een mesh boven de grens wordt niet verwerkt; vereenvoudig de mesh eerst, of verhoog de grens als je computer het aankan. Een hogere grens kan de editor een paar seconden laten vastlopen.

### Maten: eenheden, schaal en snapstappen

Onder {{ui:workspace.measurement}} stel je de {{ui:workspace.units}} in, de eenheid waarin maten getoond worden ({{ui:workspace.scale}}: millimeter, centimeter of meter metrisch, inch of voet imperiaal), hoeveel decimalen een getal toont ({{ui:workspace.accuracy}}), de {{ui:workspace.snapGrid}} waarop verplaatsen en schalen vastklikken en je eigen snapstappen onder {{ui:workspace.customSnapGrids}}.

Onder {{ui:workspace.measurement}} in de instellingen stel je de {{ui:workspace.units}} in. Met {{ui:units.imperial}} toont layerling elke maat in inches: op de vorm, in het eigenschappenpaneel, op het meetlint en op de liniaal. Het uitlijnraster biedt dan stappen van 1/64 tot 1 inch, en het raster op de plaat wordt in inches getekend (1/8 tot 1 inch, standaard 1/4 inch) met een dikkere lijn bij elke hele inch. Onder {{ui:workspace.inchFormat}} kies je of inches als breuk verschijnen zoals in Tinkercad (1 5/8, afgerond op 1/64 inch) of als decimaal getal (1,625), met zoveel decimalen als ingesteld onder {{ui:workspace.accuracy}}. Je kunt beide typen, "1 5/8" inbegrepen. Sneller wisselen tussen millimeters en inches kan met de kleine schakelaar **mm | in** naast het {{ui:inspector.snapGrid}} onderaan het eigenschappenvenster: hij verandert de eenheid, het raster van de plaat en de vangstap zoals de instellingen, voor dit ontwerp.

Onder {{ui:workspace.customSnapGrids}} op dezelfde plek voeg je eigen snapstappen toe: een naam en een grootte in millimeters, bijvoorbeeld "Pinafstand 2,54 mm" voor de steek van DIP-chips, pinheaders en gaatjesprint, of "MX Key Unit" met 19,05 mm voor de afstand tussen toetsenbordtoetsen. Het snapstapmenu biedt die maat dan heel, gehalveerd en in vieren (1 ×, ½ × en ¼ ×), zodat je vormen een hele, halve of kwart steek kunt verplaatsen. Wil je alleen de maat zelf, haal dan het vinkje bij {{ui:workspace.customSnapGridParts}} ernaast weg; het menu heeft dan alleen die ene stap. Eigen stappen worden bij het ontwerp bewaard en gaan mee met {{ui:workspace.makeDefault}}. Wil je alleen de maat zelf, vink dan {{ui:workspace.customSnapGridParts}} ernaast uit; het menu heeft dan alleen die ene stap.

{{ui:workspace.startWithCornerRuler}}: elk nieuw ontwerp in deze browser begint dan met een winkelhaak in de oorsprong, zie [Meten en notities](chapter:meten-en-notities). Ontwerpen die je al hebt blijven zoals ze zijn, en een winkelhaak die je uit een ontwerp verwijdert, blijft weg.

### Werkvlak: plaat en printer

{{ui:workspace.printer}} maakt het werkvlak zo groot als de bouwplaat van je printer en markeert lichamen die erbuiten steken, zie [Printen](chapter:printen). {{ui:workspace.showPlateLabels}} schrijft de naam van het ontwerp op de plaat, en de naam en het bouwvolume van de printer als er een printer gekozen is.

{{ui:workspace.printerPlay}} is de ruimte per kant die een geprinte pen nodig heeft om in een geprint gat van je printer te draaien. {{ui:workspace.fitTestMake}} legt de pastest die hem meet op de plaat; nieuwe deksels, zwaluwstaarten, klikhaken, moeren en de spelingcontrole beginnen er dan mee, zie [Printen](chapter:printen). Hij blijft in deze browser, niet in het ontwerp.

{{ui:workspace.size}} geeft de plaat een eigen grootte, met {{ui:workspace.width}} en {{ui:workspace.length}} in millimeters of de eenheid die je koos. Het raster loopt altijd door de oorsprong, zodat de sterkere lijnen op de assen liggen, hoe groot de plaat ook is.

### Werkvlak: raster

{{ui:workspace.showGrid}} toont of verbergt het raster op de plaat. {{ui:workspace.gridBlockSize}} bepaalt de afstand tussen de lijnen, en {{ui:workspace.gridMajorEvery}} of de donkerdere lijn om de 5 of om de 10 rasterstappen komt; {{ui:workspace.gridMajorColor}} geeft die lijn een eigen kleur, en het middenkruis en de plaatrand nemen die ook over. {{ui:workspace.gridColor}} is de kleur van de gewone lijnen.

Elke lijn van het raster wordt breder als je inzoomt, zoals in Tinkercad, en blijft zichtbaar als je uitzoomt. Is dat je te veel, zet dan {{ui:workspace.gridLinesGrow}} uit en de lijnen blijven bij elke zoom één pixel breed, zoals in de schets.

Is het raster verdwenen, bijvoorbeeld omdat een kleur op die van de plaat gezet werd, dan brengt {{ui:workspace.resetGrid}} aan het eind van het onderdeel {{ui:workspace.workplane}} zijn zichtbaarheid, kleuren, afstand en lijndikte terug naar de standaard, hier en in de standaard die met {{ui:workspace.makeDefault}} bewaard is.

### Standaardwaarden van vormen

Onder {{ui:workspace.shapeDefaults}} kies je met {{ui:workspace.shape}} een vorm en stel je in hoe hij begint als je hem toevoegt: zijn breedte, lengte en hoogte. {{ui:workspace.useAppDefaults}} zet de vorm terug naar waarmee de app hem laat beginnen. Vormen met eigen instellingen tonen die onder {{ui:workspace.shapeDetails}}. De waarden gelden voor nieuwe vormen, niet voor die al op de plaat staan. {{ui:workspace.customLimit}} zet een eigen bovengrens voor hoe groot de grepen en de eigenschappen die vorm mogen maken; leeg gelaten blijven de gewone grenzen.

### Bewaarde geschiedenis

Onder {{ui:workspace.history}} bepaalt de schuifregelaar {{ui:workspace.savedHistory}} hoeveel afgeronde handelingen beschikbaar blijven voor Ongedaan maken nadat je een ontwerp opslaat of opnieuw opent. Standaard zijn dat 100 handelingen per ontwerp. Een lagere grens gooit de oudere ongedaan-maakstappen van het ontwerp definitief weg.

## Als layerling traag aanvoelt

layerling rekent en tekent alles in je browser. Op een oudere computer, met een zwakke videokaart of op meerdere grote schermen kan de weergave daardoor stroef aanvoelen. Dit helpt:

- **{{ui:workspace.fastMode}}** onder {{ui:workspace.appearance}} zet in één keer alles uit wat de weergave veel kost: schaduwen, randlijnen op alle lichamen en het doordraaien van de camera. Ook tekent het de weergave alleen op de eigen resolutie van het scherm, wat op schermen met hoge resolutie tot vier keer minder pixels is. Je eigen instellingen blijven bewaard en gelden weer zodra je het uitzet.
- **De camera blijft doordraaien:** Laat je na het draaien de muis los, dan draait de weergave nog even door en remt zachtjes af. Dat is zo bedoeld, geen haperen. Ben je gewend aan Tinkercad of Fusion 360, zet dan {{ui:workspace.cameraInertia}} uit onder {{ui:workspace.appearance}}, en de weergave stopt meteen.
- **Losse schakelaars:** Zonder snelle modus kun je ook alleen {{ui:workspace.showShadows}} of {{ui:workspace.edgeLines}} uitzetten.
- **Gebruik de videokaart:** Open in Chrome `chrome://gpu` (in Edge `edge://gpu`). Naast "WebGL" hoort "Hardware accelerated" te staan. Staat er "Software only", dan is hardwareversnelling uitgeschakeld in de instellingen van de browser. Op Windows kun je onder Instellingen → Systeem → Beeldscherm → Graphics ook "Hoge prestaties" kiezen voor de browser, zodat hij de echte videokaart gebruikt en niet de zwakkere in de processor.
- **Vereenvoudig grote geïmporteerde meshes:** Een model van vele honderdduizenden driehoeken vertraagt elke weergave. Hoe je het uitdunt, staat in het hoofdstuk over bestanden, onder "Een geïmporteerde mesh vereenvoudigen".
- **Sluit andere tabbladen:** Elk open layerling-tabblad en elke andere 3D-pagina deelt dezelfde videokaart.
