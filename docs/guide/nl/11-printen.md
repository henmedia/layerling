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

## Wanddikte, speling en afschuiningen

- Wanden moeten minstens twee extrusielijnen breed zijn, dus 0,8 mm bij een spuitmond van 0,4 mm. Stevige onderdelen hebben 1,2 tot 2 mm nodig.
- Waar twee onderdelen in elkaar passen, heb je speling nodig: meestal 0,2 tot 0,4 mm, afhankelijk van de printer. Maak een klein testpaar voordat je het grote onderdeel print.
- Veel mensen schuinen de onderste rand die op de plaat ligt licht af. Zo loopt de eerste laag niet uit ("olifantenvoet").

## De speling van je printer: de pastest

Elke printer print gaten iets kleiner en pennen iets dikker dan ze getekend zijn, elk met een eigen maat. De speling die twee geprinte onderdelen nodig hebben, is daarom eerst een gok. Meet hem liever één keer: in de instellingen onder {{ui:workspace.workplane}} legt {{ui:workspace.fitTestMake}} een pastest op de plaat. Dat is een plaatje van 60 × 20 × 4 mm met zeven gaten voor één pen van 5 mm, elk getekend als 5 mm plus twee keer 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 of 0,40 mm, met de waarde in reliëf ernaast, en de pen van 5 mm zelf, die naast het plaatje staat met een kleine afschuining bovenop. Hij bestaat uit gewone vormen, dus hij wordt met de rest van de plaat geprint, zonder support.

Print hem zoals hij ligt en steek dan de pen, met de afschuining eerst, in de gaten, te beginnen bij het nauwste. **Het nauwste gat waarin de pen nog draait** geeft de speling van je printer. Typ dat getal in bij {{ui:workspace.printerPlay}} of klik het aan bij de waarden onder het veld. De speling geldt per kant, in millimeters, en de browser bewaart hem voor elk ontwerp; een leeg veld betekent: niet gemeten.

Vanaf dan beginnen nieuwe toepassingen met de speling in plaats van met de ingebouwde waarde: {{ui:lid.gap}} en {{ui:lid.hingePinPlay}} in het gereedschap {{ui:editor.tool.lid}}, de speling van een nieuwe {{ui:shape.dovetail}} en {{ui:shape.snapFit}}, {{ui:prop.clearance}} van een nieuwe moer of een nieuw getapt gat – twee keer de speling, want dat is de ruimte over de hele diameter – en {{ui:clearance.threshold}} bij {{ui:editor.tool.clearance}}. Zolang zo'n veld die waarde nog heeft, zegt "{{ui:printerPlay.fromFitTest}}" ernaast waar het getal vandaan komt. Een scharnier dat in één stuk geprint wordt en de gewrichten van het gereedschap {{ui:editor.tool.flexi}} houden hun 0,4 mm: in één stuk geprint moeten hun spleten ook tussen de lagen open blijven, en dat meet een los geprinte pen niet. Ruimte om een magneet of een Gridfinity-sleutel in te drukken en ruimte voor een gekochte aansluiting of printplaat houden ook hun eigen waarden. Lichamen die al in een ontwerp staan, veranderen nooit, en een ontwerp dat je opent ook niet.

## Als je klaar bent

Kies {{ui:editor.export}} en daarna **STL** of **3MF**. STL is het eenvoudigste formaat. 3MF bewaart namen en kleuren van de afzonderlijke lichamen en is daarom handig als je in meerdere kleuren print. Het exportvenster laat ook zien hoeveel gram en meter filament het onderdeel massief geprint zou kosten. Meer in [Bestanden en opslaan](chapter:bestanden-en-opslaan).
