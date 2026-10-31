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

Op een tablet of telefoon zoomen twee vingers (spreiden en knijpen) en verschuiven ze de weergave (samen schuiven). Eén vinger werkt op het ontwerp, net als de linkermuisknop. Om met één vinger te draaien, zet je {{ui:camera.touchRotate}} aan in de camerabalk. Die schakelaar verschijnt alleen op apparaten met een touchscreen.

Een tekentablet met pen gedraagt zich als een muis: de punt is de linkerknop, de knop op de pen de rechter, voor het draaien van de weergave en voor het menu. De sneltoetsen van het tablet kun je in de driver instellen op de [sneltoetsen](chapter:sneltoetsen) van layerling.

**Werk op een tablet het liefst met een stylus.** De punt is veel fijner dan een vingertop en bedekt niet wat je wilt raken, dus kleine punten, dunne lijnen en grepen in een schets, meetpunten en randen worden precies geraakt, en langer werken is minder vermoeiend. layerling laat een vinger al wat verder reiken naar punten, lijnen, grepen en randen dan een muisaanwijzer, maar met een stylus blijft het nauwkeuriger.

### De weergavekubus

De kubus linksboven laat zien waar je naar kijkt. Een klik op een van de zijden springt naar het rechte aanzicht van boven, onder, voren, achteren, links of rechts. Een klik op een hoek van de kubus bekijkt het model schuin vanuit die hoek, en een klik vlak bij een rand kijkt vanaf die rand, tussen twee zijden in; de plek licht op zolang de aanwijzer erop staat. De cijfertoetsen [[1]] tot en met [[6]] geven ook de rechte aanzichten. Houd daarbij [[Shift]] ingedrukt en de weergave zoomt ook in op de selectie, zoals [[Shift]]+[[F]] doet.

Sleep aan de kubus om de weergave te draaien, net als slepen met de rechtermuisknop. Als er niets geselecteerd is, draaien ook de pijltjestoetsen de weergave: 15° per druk, 90° met [[Shift]]. Ze draaien het model de kant op waarnaar ze wijzen - [[→]] draait de voorkant naar rechts, [[↑]] kantelt de voorkant omhoog. Met [[Ctrl]] ingedrukt schuiven de pijltjes de weergave in plaats daarvan over het scherm: een tiende van het beeld per druk, de helft met [[Shift]] erbij. Het model beweegt de kant op waarnaar ze wijzen. Is er iets geselecteerd, dan verplaatsen de pijltjes dat; klik eerst op een lege plek om de weergave te draaien. Op een touchscreen werkt dit met één vinger, zonder {{ui:camera.touchRotate}} aan te zetten.

### De camerabalk

Aan de linkerrand staat een smalle balk. Van boven naar beneden:

- {{ui:camera.home}} brengt de hele scène weer in beeld. De toets is [[Home]]; [[F]] doet het ook als er niets is geselecteerd.
- {{ui:camera.focusSelection}} zoomt in op de selectie ([[F]] of [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} en {{ui:camera.zoomOut}} zoomen stap voor stap, net als de toetsen [[+]] en [[−]].
- {{ui:camera.orthographic}} schakelt naar een platte weergave waarin evenwijdige randen evenwijdig blijven. Voor meten en randen uitlijnen is dat vaak prettiger dan de perspectiefweergave. [[O]] schakelt heen en weer, en een tweede klik zet het terug.
- {{ui:camera.secondView}} opent een tweede weergave van het ontwerp in een eigen venster, zie hieronder. Een tweede klik sluit het.
- {{ui:camera.hideWorkplane}} (het oog boven een raster) verbergt de plaat met het raster, zodat je een ontwerp van onderen kunt bekijken. Alleen de weergave verandert: nieuwe vormen komen nog steeds op het werkvlak terecht. Een tweede klik toont de plaat weer.
- {{ui:camera.placeWorkplane}}, het meetlint en de winkelhaak zijn gereedschappen op zich, die hieronder en in [Meten en notities](chapter:meten-en-notities) aan bod komen.

Het pijltje helemaal bovenaan de balk verbergt hem als hij in de weg zit.

Een ontwerp opent zoals je het hebt achtergelaten: de hoek, de zoom en de positie van de weergave worden er in deze browser bij bewaard, zodat je verdergaat waar je gebleven was, ook nadat je naar de startpagina bent gegaan of de pagina hebt gesloten. Een opgeslagen bestand (.lyl) neemt de weergave mee, zodat het ook elders zo opent. De weergave hoort niet bij de geschiedenis van ongedaan maken.

Je kunt in elk ontwerp ook vier eigen weergaven bewaren. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] of [[Shift]]+[[0]] slaat de weergave precies op zoals ze is - hoek, positie, zoom, en vlak of in perspectief - onder die toets, en de toets alleen ([[7]], [[8]], [[9]] of [[0]]) brengt haar terug. Een melding onderaan bevestigt het opslaan; opnieuw opslaan onder dezelfde toets vervangt de weergave. Net als de weergave hierboven blijven de opgeslagen weergaven in deze browser bij het ontwerp en gaan ze mee in een opgeslagen bestand (.lyl); ze horen niet bij de geschiedenis van ongedaan maken.

### Een tweede weergave in een eigen venster

{{ui:camera.secondView}} opent een venster dat hetzelfde ontwerp door een eigen camera toont, zodat je het van twee kanten tegelijk ziet - bijvoorbeeld van voren terwijl je van boven werkt. Elke wijziging in de editor verschijnt daar meteen; het ontwerp wordt alleen in het hoofdvenster gewijzigd, en ook de grepen blijven daar. In het tweede venster draaien de muis en de weergavekubus de weergave zoals hier, en ook de toetsen: [[1]] tot [[6]], [[F]], [[Home]], [[O]], [[+]] en [[−]], de pijltjestoetsen om te draaien en [[Ctrl]] met de pijltjes om te schuiven. [[F]] zoomt daar in op wat in de editor geselecteerd is. Ook de vier opgeslagen weergaven van het ontwerp werken daar: [[7]], [[8]], [[9]] en [[0]] halen ze terug, en [[Shift]] met een van die toetsen slaat de weergave van dat venster eronder op - voor beide vensters. De eigen camerabalk heeft {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} en {{ui:camera.hideWorkplane}}, en die werken alleen op dat venster. Het venster opent waar je het liet, even groot, en sluit samen met de editor. Op telefoons en tablets wordt de knop niet getoond.

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

Het paneel hangt aan zijn knop. Zit het iets in de weg, sleep het dan aan de titelbalk naar een willekeurige plek op het werkvlak; de volgende keer opent het daar ook. Dubbelklik op de titelbalk of zet het neer bij de knop om het terug te zetten.

[[Esc]] sluit het paneel; de snede blijft tot je hem uitzet of teruggaat naar het ontwerpoverzicht. Zolang hij aan staat, blijft de knop gemarkeerd. Wat je neerzet aan de kant die weggesneden is, verschijnt pas als je de snede uitzet.

## Het werkvlak

Nieuwe vormen richten zich naar het werkvlak. In het begin is dat de grondplaat met het raster. Maar je kunt het op elk vlak leggen, om iets op een zijkant of een schuin vlak te zetten.

1. Druk op [[W]] of klik op {{ui:camera.placeWorkplane}}.
2. Beweeg de muis over een vlak van een lichaam. Het licht op.
3. Een klik legt het werkvlak daar neer. Alles wat je nu toevoegt, staat op dat vlak.

Klik je in plaats daarvan op de lege plaat, dan ligt het werkvlak plat op de plek waar je klikte, op het uitlijnraster. Nieuwe vormen en een afgeronde schets, ook een omwentelingsschets, verschijnen dan daar in plaats van in het midden van de plaat. Zolang het werkvlak zo plat op de plaat ligt, toont de plaat alleen zijn omtrek: twee rasters in hetzelfde vlak zouden een flikkerend patroon geven.

Op een vlak klikt de oorsprong van het werkvlak verder vast aan het raster. Klik dicht bij een hoek van het vlak en hij zit precies op die hoek. Dicht bij een rand ligt hij op de rand en lijnt het raster ermee uit; zo kies je bewust de hoek van het raster. Zonder hoek of rand loopt het raster op een liggend vlak evenwijdig aan het lichaam, dus op een gedraaide kubus is het mee gedraaid.

Een klik naast de plaat of [[Esc]] zet het werkvlak terug op de grondplaat. Nog sneller is {{ui:camera.resetWorkplane}}: de knop met het pijltje omlaag staat in de camerabalk onder het oog, zolang het werkvlak op een vlak ligt. [[Shift]]+[[W]] legt het direct op het geselecteerde vlak. [[Alt]]+[[W]] zet het altijd terug op de grondplaat, of er nu iets geselecteerd is of niet. Houd je [[Shift]] ingedrukt tijdens het klikken, dan wijst het vlak de andere kant op.

Zolang een werkvlak op een vlak ligt, verschijnt er een oog naast {{ui:camera.placeWorkplane}}. Dat verbergt het werkvlak zonder het los te laten, voor een vrij zicht op het ontwerp: nieuwe vormen komen nog steeds op dat vlak terecht, en draaien gebeurt nog steeds daaromheen. Een klik op het oog toont het weer, en een nieuw werkvlak neerleggen ook.

## Raster en vastklikken

Het raster toont de grootte van de plaat. Rechtsonder staat de **snapstap**: verplaatsen en schalen klikken vast in stappen van die grootte, bijvoorbeeld 1 mm. Maak hem kleiner voor fijn werk en groter voor grof schikken. {{ui:editor.tool.snapToGrid}} in het lint verplaatst de geselecteerde vormen achteraf naar het dichtstbijzijnde rasterkruispunt. Tijdens het verplaatsen klikken vormen ook vast aan andere vormen, zie [Selecteren en schikken](chapter:selecteren-en-schikken). Zonder muis: [[Alt]]+[[1]] tot [[Alt]]+[[0]] kiezen het item met dat nummer in het menu ([[Alt]]+[[1]] zet vastklikken uit), en [[,]] en [[.]] maken de stap een maat fijner of grover. Dat werkt ook in een schets.

Onder {{ui:workspace.measurement}} in de instellingen stel je de {{ui:workspace.units}} in. Met {{ui:units.imperial}} toont layerling elke maat in inches: op de vorm, in het eigenschappenpaneel, op het meetlint en op de liniaal. Het uitlijnraster biedt dan stappen van 1/64 tot 1 inch, en het raster op de plaat wordt in inches getekend (1/8 tot 1 inch, standaard 1/4 inch) met een dikkere lijn bij elke hele inch. Onder {{ui:workspace.inchFormat}} kies je of inches als breuk verschijnen zoals in Tinkercad (1 5/8, afgerond op 1/64 inch) of als decimaal getal (1,625), met zoveel decimalen als ingesteld onder {{ui:workspace.accuracy}}. Je kunt beide typen, "1 5/8" inbegrepen. Sneller wisselen tussen millimeters en inches kan met de kleine schakelaar **mm | in** naast het {{ui:inspector.snapGrid}} onderaan het eigenschappenvenster: hij verandert de eenheid, het raster van de plaat en de vangstap zoals de instellingen, voor dit ontwerp.

Onder {{ui:workspace.customSnapGrids}} op dezelfde plek voeg je eigen snapstappen toe: een naam en een grootte in millimeters, bijvoorbeeld "Pinafstand 2,54 mm" voor de steek van DIP-chips, pinheaders en gaatjesprint, of "MX Key Unit" met 19,05 mm voor de afstand tussen toetsenbordtoetsen. Het snapstapmenu biedt die maat dan heel, gehalveerd en in vieren (1 ×, ½ × en ¼ ×), zodat je vormen een hele, halve of kwart steek kunt verplaatsen. Wil je alleen de maat zelf, haal dan het vinkje bij {{ui:workspace.customSnapGridParts}} ernaast weg; het menu heeft dan alleen die ene stap. Eigen stappen worden bij het ontwerp bewaard en gaan mee met {{ui:workspace.makeDefault}}.

Grootte, rasterbreedte en kleur van de plaat wijzig je in de instellingen (het tandwiel in het lint): de onderdelen zijn {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} en {{ui:workspace.history}}. Onder {{ui:workspace.appearance}} vind je schakelaars zoals {{ui:workspace.startInPerspective}} en {{ui:workspace.showShadows}}, onder {{ui:workspace.workplane}} {{ui:workspace.showGrid}}. De kleuren van het werkgebied stel je ook onder {{ui:workspace.appearance}} in: {{ui:workspace.backgroundColor}} en {{ui:workspace.surfaceColor}} voor het lichte thema (de donkere thema's houden hun eigen kleuren), naast de rasterkleur onder {{ui:workspace.workplane}}. Daar kies je ook of de donkerdere rasterlijn elke 5 of elke 10 rasterstappen komt ({{ui:workspace.gridMajorEvery}}) en geef je hem een eigen kleur met {{ui:workspace.gridMajorColor}}; het middenkruis en de plaatrand nemen die ook over. Elke lijn van het raster wordt breder naarmate je inzoomt, zoals in Tinkercad, en blijft zichtbaar als je uitzoomt; vind je dat te veel, zet dan {{ui:workspace.gridLinesGrow}} uit en de lijnen blijven bij elke zoom één pixel breed, zoals in de schets. In het kleurveld neemt [[Enter]] een getypte hexwaarde over. {{ui:workspace.edgeLines}} tekent een omtrek om elk lichaam, in de kleur van {{ui:workspace.edgeColor}} (in het begin zwart, zoals in Tinkercad): dat helpt als donkere kleuren in elkaar overlopen. Het staat standaard uit, en zeer grote geïmporteerde meshes worden overgeslagen. Het raster loopt altijd door de oorsprong, zodat de dikkere lijnen op de assen liggen, wat de plaat ook meet. Is het raster verdwenen, bijvoorbeeld omdat een kleur op die van het werkvlak is gezet, dan brengt {{ui:workspace.resetGrid}} onderaan het gebied {{ui:workspace.workplane}} zichtbaarheid, kleuren, afstand en lijndikte terug naar de standaard, hier en in de standaard die met {{ui:workspace.makeDefault}} is bewaard.

{{ui:workspace.strongHoles}} tekent gaten in een donkerder grijs, minder doorzichtig en met een donkere lijn eromheen. Dat helpt als een gat tussen doorzichtige lichamen moeilijk te vinden is. Anders dan de randlijnen blijft het in de snelle modus aan.

{{ui:workspace.showAxes}} (standaard aan) tekent drie pijlen in de linkerachterhoek van de plaat: **X** in rood naar rechts, **Y** in groen naar achteren en **Z** in blauw omhoog, zoals de positievelden tellen. Dat is de rechterhandregel die ook Tinkercad, CAD-programma's en de slicers gebruiken. Met het werkvlak op een vlak volgen ze dat. Zet ze hier uit als ze je in de weg zitten.

Twee schuifregelaars onder {{ui:workspace.appearance}} bepalen hoe de lichamen belicht worden. {{ui:workspace.shadowStrength}} bepaalt hoe donker de slagschaduwen zijn, en {{ui:workspace.shadeContrast}} verschuift licht van het gelijkmatige omgevingslicht naar het hoofdlicht: richting "krachtig" worden de schaduwzijden donkerder en vallen de schaduwen meer op, richting "zacht" wordt alles vlakker. Aan de bovenkant wordt het contrast heel sterk, zodat schaduwzijden en schaduwen echt donker worden. {{ui:workspace.shadowSoftness}} maakt de randen van de schaduwen zacht in plaats van scherp. {{ui:workspace.lightAzimuth}} draait het hoofdlicht rond de plaat (0° van voren, 90° van rechts), en {{ui:workspace.lightElevation}} tilt het op; bij 90° staat het recht boven de plaat zoals in Tinkercad, en vallen de schaduwen recht onder de lichamen. {{ui:workspace.lightReset}} zet alles terug. {{ui:workspace.classicLook}} richt het werkgebied in zoals Tinkercad het toont: witte ondergrond, een lichtblauw millimeterraster met een donkerdere lijn elke centimeter, zwarte randlijnen, licht van boven met zachte schaduwen. Elke waarde kun je daarna nog los aanpassen. Ze beginnen allemaal zoals layerling er altijd uitzag, en wat bij je past hangt af van je beeldscherm. De schetsweergave heeft eigen kleuren: {{ui:workspace.sketchBackground}} voor het venster rond het vel, {{ui:workspace.sketchPlateColor}} voor het vel onder het raster, en {{ui:workspace.sketchGridColor}}, allemaal voor het lichte thema. {{ui:workspace.sketchMatch}} neemt in één klik de drie kleuren van het werkgebied over.

![De instellingen onder Weergave: achtergrond- en werkvlakkleuren voor het lichte thema, en de schakelaar voor randlijnen op alle lichamen.](shot:settings-appearance)

![Drie donkere lichamen met randlijnen aan: de omtrekken houden ze uit elkaar.](shot:edge-lines)

![De editor in het donkere kleurenschema. Het kleurenschema stel je rechtsboven in: Systeem, Licht, Donker of Grafiet.](shot:editor-dark)

{{ui:workspace.toolbarSize}} onder {{ui:workspace.appearance}} maakt de knoppen van het lint bovenaan, het vormenmenu daarvan, de camerabediening links en het eigenschappenpaneel rechts kleiner of groter: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (zoals het altijd was) of {{ui:workspace.toolbarSizeLarge}}. Klein laat op een laptop meer ruimte voor het werkvlak; groot is makkelijker te raken op een groot scherm of met een vinger. Met grote knoppen gaan de groepen van het lint naar een tweede rij als het venster er te smal voor is. De grootte wordt in deze browser bewaard en geldt voor elk ontwerp.

{{ui:workspace.viewCubePosition}} onder {{ui:workspace.appearance}} zet de richtingskubus in een andere hoek van het werkvlak: {{ui:workspace.viewCubePositionTopLeft}} (zoals het altijd was), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} of {{ui:workspace.viewCubePositionBottomRight}}. In elke hoek behalve linksboven schuift de camerabediening omhoog naar de plek die de kubus vrijliet. Rechtsonder staat de kubus net boven de {{ui:inspector.snapGrid}}-knop. Zolang rechts de eigenschappen van een vorm open zijn, wijkt een kubus aan de rechterkant links ervan uit. De hoek wordt in deze browser bewaard en geldt voor elk ontwerp. In een smal venster, zoals op een telefoon, is de instelling verborgen en blijft de kubus linksboven.

> **Tip:** Stop met draaien als je onderdelen precies op elkaar laat aansluiten. Ga met de cijfertoetsen naar het rechte aanzicht van boven of voren en druk op [[O]] voor de platte weergave. Dan zie je meteen of twee randen echt gelijk liggen.

## Als layerling traag aanvoelt

layerling rekent en tekent alles in je browser. Op een oudere computer, met een zwakke videokaart of op meerdere grote schermen kan de weergave daardoor stroef aanvoelen. Dit helpt:

- **{{ui:workspace.fastMode}}** onder {{ui:workspace.appearance}} zet in één keer alles uit wat de weergave veel kost: schaduwen, randlijnen op alle lichamen en het doordraaien van de camera. Ook tekent het de weergave alleen op de eigen resolutie van het scherm, wat op schermen met hoge resolutie tot vier keer minder pixels is. Je eigen instellingen blijven bewaard en gelden weer zodra je het uitzet.
- **De camera blijft doordraaien:** Laat je na het draaien de muis los, dan draait de weergave nog even door en remt zachtjes af. Dat is zo bedoeld, geen haperen. Ben je gewend aan Tinkercad of Fusion 360, zet dan {{ui:workspace.cameraInertia}} uit onder {{ui:workspace.appearance}}, en de weergave stopt meteen.
- **Losse schakelaars:** Zonder snelle modus kun je ook alleen {{ui:workspace.showShadows}} of {{ui:workspace.edgeLines}} uitzetten.
- **Gebruik de videokaart:** Open in Chrome `chrome://gpu` (in Edge `edge://gpu`). Naast "WebGL" hoort "Hardware accelerated" te staan. Staat er "Software only", dan is hardwareversnelling uitgeschakeld in de instellingen van de browser. Op Windows kun je onder Instellingen → Systeem → Beeldscherm → Graphics ook "Hoge prestaties" kiezen voor de browser, zodat hij de echte videokaart gebruikt en niet de zwakkere in de processor.
- **Vereenvoudig grote geïmporteerde meshes:** Een model van vele honderdduizenden driehoeken vertraagt elke weergave. Hoe je het uitdunt, staat in het hoofdstuk over bestanden, onder "Een geïmporteerde mesh vereenvoudigen".
- **Sluit andere tabbladen:** Elk open layerling-tabblad en elke andere 3D-pagina deelt dezelfde videokaart.
