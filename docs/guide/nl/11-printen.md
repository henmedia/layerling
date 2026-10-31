---
title: Voorbereiden op 3D-printen
summary: Je eigen printer kiezen, een waarschuwing krijgen als iets niet past, en het onderdeel goed neerleggen.
---

## Je printer kiezen

Open de instellingen (het tandwiel in het lint, {{ui:editor.workspaceSettings}}) en ga naar het onderdeel {{ui:workspace.workplane}}. Onder {{ui:workspace.printer}} kies je je printer uit een lijst van meer dan 230 gangbare modellen, waaronder Bambu Lab, Prusa, Creality, Anycubic, Elegoo en nog veel meer.

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

## Als je klaar bent

Kies {{ui:editor.export}} en daarna **STL** of **3MF**. STL is het eenvoudigste formaat. 3MF bewaart namen en kleuren van de afzonderlijke lichamen en is daarom handig als je in meerdere kleuren print. Het exportvenster laat ook zien hoeveel gram en meter filament het onderdeel massief geprint zou kosten. Meer in [Bestanden en opslaan](chapter:bestanden-en-opslaan).
