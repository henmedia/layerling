---
title: Voorbereiden op 3D-printen
summary: Je eigen printer kiezen, een waarschuwing krijgen als iets niet past, en het onderdeel goed neerleggen.
---

## Je printer kiezen

Open de instellingen (het tandwiel in de titelrij, {{ui:editor.workspaceSettings}}) en ga naar het onderdeel {{ui:workspace.workplane}}. Onder {{ui:workspace.printer}} kies je je printer uit een lijst van meer dan 230 gangbare modellen, waaronder Bambu Lab, Prusa, Creality, Anycubic, Elegoo en nog veel meer.

![De werkvlakinstellingen met een gekozen printer. Printbed en maximale printhoogte komen uit het slicerprofiel.](shot:settings-workplane)

Er gebeuren drie dingen:

- Het werkvlak krijgt de maat van het printbed.
- In de hoek van het werkvlak verschijnen de naam van de printer en zijn printvolume. Zit de tekst in de weg, zet hem dan uit met {{ui:workspace.showPlateLabels}} onder {{ui:workspace.workplane}}; dat geldt ook voor de naam van het ontwerp linksvoor.
- layerling **waarschuwt** als iets niet past.

De printerprofielen komen uit OrcaSlicer, dus het zijn dezelfde die je slicer kent. Werk je liever zonder printer, kies dan {{ui:workspace.printerNone}}. Je kunt de maat van het werkvlak ook met de hand instellen.

Deltaprinters zoals die van FLSun of SeeMeCNC of de Anycubic Predator printen op een rond bed. Met een van hen is het werkvlak ook rond, even breed als het bed, en een lichaam is te groot zodra het over de rand steekt. Een rond lichaam wordt gemeten aan zijn eigen omtrek, niet aan de doos eromheen, dus een cilinder die bijna zo breed is als het bed past nog.

## Als iets niet past

Een lichaam dat over de rand van de printplaat steekt, wordt gemarkeerd. Een melding vertelt welke kanten uitsteken en hoeveel. Hetzelfde geldt als het onderdeel **te hoog** is: de hoogte telt vanaf het laagste lichaam, net zoals de slicer het model neerzet.

![Het blok is breder dan het printbed van de Bambu Lab A1 mini. De melding onderaan zegt hoeveel.](shot:printer-overhang)

De waarschuwing houdt je niet tegen om verder te werken. Het is een hint, zodat je niet pas in de slicer ontdekt dat het onderdeel te groot is. Een onderdeel dat te groot is, kun je vaak splitsen: snijd het in tweeën met {{ui:editor.tool.split}} en print beide helften apart.

## Het onderdeel goed neerleggen

Hoe een onderdeel op de plaat ligt, bepaalt zijn sterkte en uiterlijk. Twee gereedschappen in het gebied {{ui:editor.group.arrange}} helpen daarbij:

- {{ui:editor.tool.layFlat}}: klik op een vlak en het onderdeel ligt met die kant naar beneden. De beste printrichting in één klik.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): zet het onderdeel op het werkvlak als het ergens in de lucht zweeft.

Een paar vuistregels voor de richting:

- Grote platte vlakken naar beneden. Die hechten het best.
- Leg lange, belaste onderdelen zo neer dat de lagen niet loodrecht op de belasting lopen. Tussen de lagen is een onderdeel het zwakst.
- Vermijd overhangen die steiler zijn dan 45°, of geef ze support in de slicer.

## Overhangen vinden

In het menu naast het oog ({{ui:editor.group.visibility}}) zet **Overhang tonen** de overhangen aan. Elk vlak dat steiler dan 45° naar beneden wijst, wordt dan rood-wit gearceerd: daar zou de printer support nodig hebben. Wat op de plaat rust, blijft vrij. Zo zie je al tijdens het ontwerpen of een bol, een boog of een liggend gat zonder support te printen is; het [druppelgat](chapter:schroefdraad-en-mechanica) is precies daarvoor gemaakt. Draai het onderdeel of leg het op een ander vlak met {{ui:editor.tool.layFlat}}, en de arcering volgt meteen.

Hoe steil jouw printer aankan, stel je in bij de instellingen onder {{ui:workspace.appearance}}: van 30° (voorzichtig) tot 70° (voor printers met goede koeling). Een vlak dat op een ander lichaam rust, wordt toch gemarkeerd: layerling kijkt alleen naar het vlak zelf.

## Steunribben voor een schuin onderdeel

Een onderdeel dat schuin op een rand wordt geprint, bijvoorbeeld onder 45°, heeft vaak geen steun nodig: de vlakken zijn steil genoeg. Maar het staat op een smalle rand en kan omvallen. De {{ui:supportRib.title}} houdt het vast: onder het onderste vlak staat op kleine afstand een dunne rib op een ovale voet, en piepkleine bruggen houden het onderdeel vast. Kantel het onderdeel eerst op zijn rand en laat het op de plaat staan.

1. Selecteer het onderdeel en klik in het lint in de groep {{ui:editor.group.modify}} op {{ui:supportRib.title}}, klik met rechts op het onderdeel of zoek het met [[Ctrl]]+[[K]].
2. Klik op het onderste vlak waar de rib moet staan. Het vlak moet naar beneden kijken, tussen 15° en 75° hellen en tot op de plaat reiken; de rib staat vanaf je klik recht langs het vlak omlaag.
3. Stel {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} en {{ui:supportRib.firstLayer}} in zoals in je slicer. De rib is twee nozzlebanen dik, de spleet tot het onderdeel een halve baan; elke brug is één baan breed en precies één laag hoog en ligt op een laag van de print, zodat de slicer hem als één dunne baan print die er netjes af breekt. {{ui:supportRib.height}} zegt hoe ver de rib langs het vlak omhoog reikt (eerst tot halverwege), {{ui:supportRib.bridgeSpacing}} hoe ver de bruggen uit elkaar liggen, in hele lagen.
4. Onder {{ui:supportRib.more}} stel je de dikte, de spleet, de breedte van de bruggen en de dikte van de voet met de hand in (tot dan volgen ze de nozzle en de lagen), en ook de breedte van de voet en de afrondingen aan de voet en bovenaan.
5. {{ui:supportRib.apply}} voegt de rib toe. Met {{ui:supportRib.bundle}} (eerst aan) zijn rib en onderdeel gebundeld: ze bewegen samen en gaan als twee lichamen naast elkaar naar de slicer, in de print verbonden door de bruggen.

De rib is een meshlichaam: om hem te veranderen verwijder je hem en maak je hem opnieuw. Elke klik maakt één rib; voor meer klik je op {{ui:supportRib.repick}} of herhaal je hem met {{ui:editor.tool.array}}. De rib mag nergens in het onderdeel lopen en het onderdeel moet op de plaat staan - anders zegt het venster waarom. Je instellingen blijven in deze browser bewaard voor de volgende rib.

## Wanddikte, speling en afschuiningen

- Wanden moeten minstens twee extrusielijnen breed zijn, dus 0,8 mm bij een spuitmond van 0,4 mm. Stevige onderdelen hebben 1,2 tot 2 mm nodig.
- Waar twee onderdelen in elkaar passen, heb je speling nodig: meestal 0,2 tot 0,4 mm, afhankelijk van de printer. Maak een klein testpaar voordat je het grote onderdeel print.
- Veel mensen schuinen de onderste rand die op de plaat ligt licht af. Zo loopt de eerste laag niet uit ("olifantenvoet").

## De speling van je printer: de pastest

Elke printer print gaten iets kleiner en pennen iets dikker dan ze getekend zijn, elk met een eigen maat. De speling die twee geprinte onderdelen nodig hebben, is daarom eerst een gok. Meet hem liever één keer: in de instellingen onder {{ui:workspace.workplane}} legt {{ui:workspace.fitTestMake}} een pastest op de plaat. Dat is een plaatje van 60 × 20 × 4 mm met zeven gaten voor één pen van 5 mm, elk getekend als 5 mm plus twee keer 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 of 0,40 mm, met de waarde in reliëf ernaast, en de pen van 5 mm zelf, die naast het plaatje staat met een kleine afschuining bovenop. Hij bestaat uit gewone vormen, dus hij wordt met de rest van de plaat geprint, zonder support.

Print hem zoals hij ligt en steek dan de pen, met de afschuining eerst, in de gaten, te beginnen bij het nauwste. **Het nauwste gat waarin de pen nog draait** geeft de speling van je printer. Typ dat getal in bij {{ui:workspace.printerPlay}} of klik het aan bij de waarden onder het veld. De speling geldt per kant, in millimeters, en de browser bewaart hem voor elk ontwerp; een leeg veld betekent: niet gemeten.
Met meerdere printers kies je eerst onder {{ui:workspace.printer}} de printer waarop je print: elke printer houdt een eigen speling, en nieuw gebruik start van de speling van de printer waarop het ontwerp staat. Een printer zonder eigen speling neemt de speling die is ingesteld toen er geen printer gekozen was.

Vanaf dan beginnen nieuwe toepassingen met de speling in plaats van met de ingebouwde waarde: {{ui:lid.gap}} en {{ui:lid.hingePinPlay}} in het gereedschap {{ui:editor.tool.lid}}, de speling van een nieuwe {{ui:shape.dovetail}} en {{ui:shape.snapFit}}, {{ui:prop.clearance}} van een nieuwe moer of een nieuw getapt gat – twee keer de speling, want dat is de ruimte over de hele diameter – en {{ui:clearance.threshold}} bij {{ui:editor.tool.clearance}}. Net zo de {{ui:split.connectorClearance}} van de deuvels, tappen en zwaluwstaarten bij {{ui:editor.tool.split}}. Zolang zo'n veld die waarde nog heeft, zegt "{{ui:printerPlay.fromFitTest}}" ernaast waar het getal vandaan komt. Een scharnier dat in één stuk geprint wordt en de gewrichten van het gereedschap {{ui:editor.tool.flexi}} houden hun 0,4 mm: in één stuk geprint moeten hun spleten ook tussen de lagen open blijven, en dat meet een los geprinte pen niet. Ruimte om een magneet of een Gridfinity-sleutel in te drukken en ruimte voor een gekochte aansluiting of printplaat houden ook hun eigen waarden. Lichamen die al in een ontwerp staan, veranderen nooit, en een ontwerp dat je opent ook niet.

## De print controleren

{{ui:editor.tool.printCheck}}, naast {{ui:editor.tool.clearance}} onder {{ui:editor.group.combine}}, bekijkt de geselecteerde objecten, of alle zichtbare als niets geselecteerd is, en zegt in één venster wat er bij het printen mis zou gaan. Elk van de vijf regels is groen als hij niets vond, en oranje met wat en waar als hij wel iets vond:

- **{{ui:printCheck.thin.title}}**: plekken dunner dan twee lijnen van de nozzle - 0,8 mm bij een nozzle van 0,4 mm. De slicer laat zo'n wand weg of print hem als één zwakke lijn. Kies bovenaan het venster onder {{ui:printCheck.nozzle}} je nozzle (0,2 tot 0,8 met één klik, elke andere in het veld). De dunne plekken worden rood met een licht raster op de lichamen geschilderd, en de regel noemt de dunste plek en hoeveel oppervlak te dun is. Plekken kleiner dan 1 mm² en scherpe randen, zoals die van een wig, tellen niet mee.
- **{{ui:printCheck.floating.title}}**: een lichaam, of een los deel ervan, dat de plaat noch een ander deel raakt (op 0,05 mm na). Het zou in de lucht geprint worden. Een deel dat op een staand deel ligt, is in orde.
- **{{ui:printCheck.contact.title}}**: een deel op de plaat waarvan de eerste laag erg klein is voor zijn hoogte, zoals een bol of een kegel op zijn punt. Het kan tijdens het printen loskomen. De controle waarschuwt onder 0,5 mm² standvlak, 0,1 mm boven de plaat gemeten, per millimeter hoogte: een bol zit daar altijd onder, een kubus van 10 mm heeft 10.
- **{{ui:printCheck.overhang.title}}**: dezelfde getallen als bij **Overhang tonen**, met de hoek die daar is ingesteld.
- **{{ui:printCheck.openMesh.title}}**: een geïmporteerde mesh met open randen, of randen waar drie of meer vlakken aan zitten. De slicer moet dan raden waar binnen is.

![Een bak waarvan de rechterwand maar 0,6 mm dik is: Print controleren kleurt hem rood en noemt hem in het venster.](shot:print-check)

{{ui:printCheck.show}} bij een regel brengt de camera erheen; het selecteert de zwevende delen, die met weinig houvast en de open meshes, en bij de overhangen zet het **Overhang tonen** aan. Lichamen die overlappen worden samengevoegd gecontroleerd, zoals de slicer ze samenvoegt. Verander je het ontwerp terwijl het venster open is, dan staat er {{ui:printCheck.stale}}; klik daarop of op {{ui:printCheck.checkAgain}}. [[Esc]] sluit het venster. Aan het ontwerp verandert niets. Een AI doet dezelfde controle met `layerling_check_print`.

## Als je klaar bent

Kies {{ui:editor.export}} en daarna **STL** of **3MF**. STL is het eenvoudigste formaat. 3MF bewaart namen en kleuren van de afzonderlijke lichamen en is daarom handig als je in meerdere kleuren print. Het exportvenster laat ook zien hoeveel gram en meter filament het onderdeel massief geprint zou kosten. Meer in [Bestanden en opslaan](chapter:bestanden-en-opslaan).
