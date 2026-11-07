---
title: Lichamen en gaten
summary: Hoe eenvoudige vormen boringen, sleuven en kamers worden, en hoe je een groep later nog aanpast.
---

Dit is het belangrijkste idee in layerling, en je hebt het snel door: **Elke vorm is een lichaam of een gat.** Een lichaam blijft. Een gat is gereedschap dat materiaal weghaalt.

## Lichaam of gat

Selecteer een vorm en klik in de instellingen op {{ui:inspector.solid}} of {{ui:inspector.hole}}. Met het toetsenbord gaat het sneller: [[H]] maakt van de selectie een gat, [[S]] maakt er weer een lichaam van. Beide staan ook in het menu dat opent als je met de rechtermuisknop op het lichaam klikt. Een gat wordt doorzichtig getoond, zodat je ziet waar het zit. [[T]] maakt een lichaam doorzichtig, bijvoorbeeld om in een behuizing te kijken; nog een keer drukken maakt het weer ondoorzichtig. Het werkt op de hele selectie: is er al een lichaam doorzichtig, dan worden ze allemaal ondoorzichtig, anders worden ze allemaal doorzichtig.

Zolang er niets gegroepeerd is, doet een gat niets. Het ligt er gewoon en laat zien waar later iets verdwijnt.

![De cilinder is een gat. Hij steekt aan de bovenkant uit het blok, zodat hij er helemaal doorheen snijdt.](shot:hole-before)

## Groeperen

Selecteer lichamen en gat(en) en klik op {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Nu halen de gaten het materiaal weg uit de lichamen die ze raken. Wat overblijft is één nieuwe vorm.

![Het resultaat: een blok met een boring.](shot:hole-after)

Zo maak je:

- **Boringen:** een cilinder als gat door een lichaam.
- **Sleuven:** een langwerpig blok als gat aan de rand.
- **Kamers:** een gat dat niet helemaal doorloopt.
- **Schroefdraad in een onderdeel:** een draadgat als gat, zie [Schroefdraad en mechanica](chapter:schroefdraad-en-mechanica).

Zitten er meerdere lichamen in de groep, dan worden ze samengevoegd. Twee lichamen die elkaar raken worden één onderdeel.

Bij grote meshes, zoals een geïmporteerde STL met honderdduizenden driehoeken, duurt het snijden een paar seconden. layerling werkt dan op de achtergrond en toont "{{ui:status.computing}}"; intussen kun je de weergave draaien en de interface gebruiken. Verander je in die tijd de scène, dan wordt het resultaat weggegooid en zegt layerling dat. Hetzelfde geldt voor {{ui:editor.tool.split}}.

Je kunt een groep behandelen als een vorm: verplaatsen, draaien, kleuren, opnieuw groeperen. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) heft de groep op en de losse onderdelen zijn terug.

### Een groep een gat maken

Ook een hele groep kan een lichaam of een gat zijn. Daarbij geldt een eenvoudige regel:

- Bestaat de groep alleen uit lichamen (of alleen uit gaten), dan schakel je hem als geheel om en gaan de onderdelen mee.
- Bevat hij allebei, bijvoorbeeld een blok met een boring, dan houdt elk onderdeel zijn eigen stand. De hele groep wordt dan gereedschap, maar de boring blijft een boring.

### Een groep van formaat veranderen: gaten en kleine onderdelen behouden

Maak je een groep langer, breder of hoger, dan rekken de onderdelen mee alsof ze op rubber getekend zijn: de ronde gaten in een plaat worden ovaal en schuiven naar binnen. Om ze te houden zoals ze zijn, kies je in de instellingen van de groep onder {{ui:inspector.groupResize}} voor {{ui:inspector.groupResizeKeepParts}}; zonder die keuze geldt {{ui:inspector.groupResizeStretch}}, zoals tot nu toe bij elke groep. Vanaf dan wordt de groep bij elke formaatwijziging - met de grepen, in de maatvelden of met {{ui:scalePercent.title}} - volgens één regel opnieuw uit zijn onderdelen opgebouwd, voor elke richting apart:

- Een onderdeel dat over bijna de hele groep reikt, negen tiende of meer, groeit of krimpt mee en houdt zijn afstand tot beide zijden: de plaat zelf, een wand, of de binnenkant van een doos, waarvan de wanden even dik blijven.
- Elk ander onderdeel houdt zijn eigen maat en zijn afstand tot de dichtstbijzijnde zijde. Een onderdeel in het midden blijft in het midden.

Een plaat met een gat 5 mm van elke hoek en een sleuf in het midden, 40 mm langer gemaakt, houdt dus zijn gaten rond en 5 mm van de hoeken, en de sleuf in het midden. Er zit geen oplosser achter en je hoeft niets per onderdeel in te stellen: voor elk onderdeel geldt dezelfde regel, zodat je vooraf weet wat er gebeurt. Een gedraaid onderdeel telt met de doos die het in de groep inneemt en blijft gedraaid; een groep in de groep telt als één onderdeel. Terwijl je aan een greep trekt, rekt de groep als geheel; laat je los, dan wordt hij opnieuw opgebouwd, in dezelfde ongedaan-maakstap. Wordt de groep kleiner dan een onderdeel met zijn afstand nodig heeft, dan krimpt dat onderdeel zoals vroeger mee, en een melding zegt het. Een gespiegelde, taps toelopende of gedraaide groep, en een met eigen afrondingen, afschuiningen of een oppervlaktestructuur, rekt altijd alles uit. Kies je de instelling voor een groep die al uitgerekt is, dan legt hij zijn onderdelen meteen opnieuw neer.

![Een plaat met een gat 5 mm van elke hoek en een sleuf in het midden, met ‘Gaten en kleine onderdelen behouden’ 40 mm langer gemaakt: de gaten zijn nog rond en 5 mm van de hoeken, de sleuf zit nog in het midden.](shot:group-keep-parts)

## Bundelen

Soms moeten onderdelen alleen bij elkaar blijven zonder één te worden, bijvoorbeeld een wit logo op een zwarte plaat voor een meerkleurenprint. Daarvoor is {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), net als in Tinkercad. Een bundel verplaats, draai en schaal je als een vorm, maar er wordt niets samengevoegd:

- Elk onderdeel houdt zijn kleur en blijft een lichaam of een gat. De instellingen van de bundel hebben dezelfde kaarten als die van een groep: {{ui:inspector.solid}} en {{ui:inspector.hole}} voor de hele bundel (die de kleuren van de onderdelen houden), {{ui:inspector.transparent}} ([[T]]) en {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); met Meerkleurig uit toont en exporteert de bundel in één kleur. {{ui:inspector.separateParts}} haalt de bundel uit elkaar, zoals [[Ctrl]]+[[Shift]]+[[G]].
- Gaten snijden niets weg.
- Bij een export naar STL, 3MF of OBJ is elk onderdeel een eigen lichaam; in 3MF en OBJ met zijn kleur.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) haalt een bundel weer uit elkaar, [[E]] opent hem om te bewerken, net als een groep. Afschuinen, afronden en uithollen werken niet op een bundel, omdat het geen één lichaam is: groepeer hem daarvoor, of bewerk de onderdelen een voor een. Moet een gat in de bundel toch snijden, groepeer de bundel dan (Ctrl+G).

## Doorsnijding

{{ui:editor.tool.intersect}} houdt alleen over wat twee of meer lichamen gemeen hebben. Leg twee overlappende vormen over elkaar, selecteer ze allebei en klik erop. Zo maak je van een cilinder en een blok een stuk met één ronde en één rechte kant. Een groep telt zoals hij eruitziet, inclusief gaten. Is er ook een gat geselecteerd, dan blijft over wat alle lichamen gemeen hebben met alle gaten. Hebben de vormen niets gemeen, dan verandert er niets en zegt een melding dat. De eerste klik toont het gemeenschappelijke deel voordat het wordt toegepast: de geselecteerde vormen worden doorzichtig en wat ze gemeen hebben, wordt groen getekend. Selecteer en verplaats elke vorm afzonderlijk en het groene deel volgt; nog een klik op {{ui:editor.tool.intersect}} past het toe, [[Esc]] sluit de voorvertoning. Vormen met te veel driehoeken voor de voorvertoning, zoals grote geïmporteerde meshes, worden al bij de eerste klik doorsneden.

{{ui:editor.tool.hull}} pakt de geselecteerde vormen in één bol lichaam in, alsof ze in krimpfolie zitten: het kleinste lichaam zonder deuken dat ze allemaal bevat. Een halve bol op een cilinder wordt een koepel zonder trede, vier cilinders op de hoeken worden een doos met ronde hoeken, twee bollen een capsule. Gaten in de selectie worden daarna uit het omhulsel gesneden. De onderdelen blijven erin: {{ui:group.edit}} opent het omhulsel zoals een groep, en een onderdeel daar verplaatsen en weer sluiten bouwt het omhulsel opnieuw. Het omhulsel is een mesh, dus ronde vormen tonen facetten, en de randgereedschappen werken erop zoals op elke mesh. Zijn alleen gaten geselecteerd, dan is het omhulsel zelf een gat: twee cilindergaten snijden een sleuf.

{{ui:editor.tool.cookieCutter}} maakt een uitsteekvorm van de selectie: een dunne wand rond de omtrek, 15 mm hoog, en een platte rand van 2 mm rond de voet, zodat de vorm op de rand staat en een duim iets heeft om op te drukken. Selecteer één geïmporteerde SVG of één schetslichaam, en de eigen omtrek wordt gebruikt. Een liggende tekst geeft de eigen krommen van zijn letters. Elke andere vorm, een gebouwde, een geïmporteerde mesh of meerdere onderdelen, geeft waar hij op staat: de omtrek die het werkvlak erdoor snijdt, zet hem dus eerst op het werkvlak. Onderdelen die overlappen geven één omtrek om allemaal heen, alsof ze gegroepeerd zijn; onderdelen los van elkaar geven elk een uitsteekvorm, in dezelfde bundel. De omtrek wordt links-rechts gespiegeld: de vorm wordt op zijn rand staand geprint en omgedraaid om te steken, zodat een tekst of een logo goed om uit het deeg komt. De bovenkant van de wand loopt uit in een snijrand van 0,4 mm breed. Gaten in de omtrek, de binnenkant van een e of een a, krijgen eigen wanden, zodat ze ook uit het koekje gestoken worden. Ze zijn een eigen lichaam in de bundel, {{ui:cookieCutter.part.innerWalls}}: om een tekst of patroon alleen in het deeg te drukken in plaats van uit te steken, maak je ze lager onder Eigenschappen. Met een wand van 15 mm en deeg van 5 mm dik drukken binnenwanden van 12 mm 2 mm diep. Binnenwanden lager dan de buitenwand hebben een vlakke bovenkant in plaats van de snijrand: ze drukken alleen, en een snijrand zou dunne punten achterlaten die afbreken en groeven die deeg vasthouden. Geef ze een snijrand onder Eigenschappen als je er een wilt. Twee bruggen bij de rand, aan de kant waar je hand drukt, houden elke binnenwand vast aan de wand eromheen, verdeeld rondom, 4 mm breed en 3 mm hoog. Elke brug staat met zijn hele breedte op de wanden, midden op een zijde die langs de omtrek loopt, en nooit dwars over een ander stuk. Stukken naast elkaar, zoals de letters van een naam, worden ook met elkaar verbonden, de dichtstbijzijnde eerst, zodat de bruggen als een web door alle stukken lopen en ook een letter midden in een woord vastzit. Een klik op het gereedschap opent een klein venster: daar kies je een {{ui:cookieCutter.support.plate}} in plaats van de bruggen, die de hele omtrek vult aan de kant waar je drukt, steviger is en beter op het printbed hecht, maar waarmee je het deeg niet meer van achteren kunt uitduwen. {{ui:cookieCutter.fillet}} zet kleine schuine kantjes van 45° waar de wanden op de rand, de bruggen of de plaat staan, zodat dunne delen zoals de punt van een i niet afbreken; ze zijn een eigen lichaam in de bundel. Daar stel je ook in hoeveel lager de binnenwanden zijn en of de omtrek gespiegeld wordt; de waarden blijven voor de volgende vorm. Verander hun hoogte onder Eigenschappen zoals die van de rand. De uitsteekvorm vervangt de selectie als een bundel schetslichamen, {{ui:group.edit}} opent hem. Wand, binnenwanden en rand zijn de vulmodi van de schets, een lijn buiten het silhouet: verander de dikte, hoogte of kleur van elk onder Eigenschappen, en daar ook de {{ui:prop.sketchCuttingEdge}} van de wand (0 voor een vlakke bovenkant). Waar een krappe bocht geen ruimte laat voor een afschuining aan beide kanten, wordt de wand alleen aan de buitenkant afgeschuind, tot dezelfde snijrand. Waar een omtrek helemaal niet afgeschuind kan worden - een logo met scherpe punten, een omtrek uit de driehoeken van een lichaam gesneden - wordt de snijrand in plaats daarvan in fijne treden van 0,1 mm opgebouwd, die een printlaag van 0,2 mm niet van de helling kan onderscheiden; zo'n wand is een driehoeksmesh in plaats van een exact lichaam. Om de omtrek te houden zoals getekend, spiegel je de vorm terug met {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Een PNG- of JPG-afbeelding werkt ook: geïmporteerd wordt ze overgetrokken tot een schetslichaam, en de uitsteekvorm volgt dat.

{{ui:editor.tool.loftSketches}} verbindt twee schetslichamen of geïmporteerde SVG's tot één lichaam: de omtrek van het onderste onderaan, de omtrek van het bovenste bovenaan, met rechte wanden ertussen. Zo ontstaat een trechter, een overgangsstuk van vierkant naar rond of een lijst die naar boven smaller wordt. Zet de twee lichamen boven elkaar waar ze horen, verschoven en gedraaid als je wilt, selecteer beide en klik op het gereedschap. De loft reikt van de onderkant van het onderste lichaam tot de bovenkant van het bovenste.

## Het ene lichaam uit het andere snijden

Bij onderdelen die op elkaar moeten passen, een as in een huls of een bout in een behuizing, maak je het ene onderdeel en snijd je het uit het andere. Selecteer de twee lichamen en klik op {{ui:editor.tool.cutOut}} in het gebied {{ui:editor.group.combine}}, of klik met rechts en kies het daar. Het venster noemt het onderdeel dat blijft en het lichaam dat de holte krijgt; layerling neemt het kleinste als onderdeel, en {{ui:cutOut.swap}} draait het om. {{ui:cutOut.clearance}} maakt de holte rondom zoveel groter dan het onderdeel: 0 past precies, 0,2 mm is een gebruikelijke speling voor een geprinte pasvorm. {{ui:cutOut.apply}} snijdt een kopie van het onderdeel uit het andere lichaam en laat het onderdeel zelf waar het is. Het resultaat is een groep: {{ui:editor.tool.ungroup}} haalt de snede weer uit elkaar. Een speling vraagt dat het onderdeel een exact lichaam is, zoals bij het gereedschap {{ui:editor.tool.offset}}, dat hiervoor wordt gebruikt.

## Een omtrek door een lichaam ponsen

Om de omtrek van een lichaam recht door een ander te snijden, selecteer je eerst de stempel en dan het lichaam om te ponsen, en klik je op {{ui:editor.tool.punch}} in het gebied {{ui:editor.group.combine}}, of kies je het na een rechtsklik. De twee hoeven elkaar niet te raken: de stempel mag overal voor het lichaam staan, alleen zijn omtrek langs de {{ui:punch.axis}} telt. Een theepot boven een plaat laat zo een opening in de vorm van een theepot achter. layerling begint met de as waarlangs de stempel het verst van het lichaam staat; X loopt van links naar rechts, Y van voor naar achter, Z omhoog. {{ui:punch.swap}} draait de rollen om, en de {{ui:punch.clearance}} maakt de opening rondom groter, 0,2 mm voor een geprint onderdeel dat erdoorheen moet. {{ui:punch.apply}} groepeert de opening met het lichaam als exact schetslichaam dat op gat staat, dus {{ui:editor.tool.ungroup}} haalt haar er weer uit; de stempel blijft staan. Verschuif of draai hem en pons opnieuw voor een andere opening.

## Een groep bewerken

Is een boring te klein uitgevallen, dan hoef je de groep niet op te heffen en opnieuw te bouwen. Selecteer de groep en klik in de instellingen op {{ui:group.edit}}, op het mapje in de objectenlijst, of druk op [[E]]. Dubbelklikken op de groep doet hetzelfde, net als in Tinkercad, ook bij een bundel; wil je dat niet, zet dan {{ui:workspace.doubleClickOpensGroup}} uit in de instellingen. Een onderdeel gaat pas bewegen als de aanwijzer een paar pixels is versleept, zodat een trillende klik of dubbelklik het niet verschuift. De onderdelen liggen nu los en je past ze aan met alle gereedschappen: een gat groter maken, een lichaam verplaatsen, een gat toevoegen.

![De groep wordt bewerkt: de balk onderaan bevat Annuleren en Klaar, en de objectenlijst toont de onderdelen.](shot:open-group)

Onderaan het beeld verschijnt een balk. {{ui:group.done}} bouwt de groep opnieuw op, met zijn naam, zijn kleur en zijn stand als lichaam of gat. {{ui:common.cancel}} zet hem onaangeroerd terug.

Is een van de onderdelen zelf een groep, dan kun je die op dezelfde manier bewerken, en zo verder, zo diep als je ontwerp gaat. De balk laat zien waar je bent, bijvoorbeeld "Beugel › Schroefbus". {{ui:group.done}} en {{ui:common.cancel}} ronden altijd de binnenste groep af en brengen je één niveau terug naar buiten. Terwijl je in een groep bent, kun je alleen de groepen onder zijn onderdelen bewerken; wil je een andere bewerken, rond dan eerst af.

Anders dan {{ui:editor.tool.ungroup}}, dat een groep voorgoed uit elkaar haalt, houdt bewerken de groep intact: zijn naam en instellingen blijven, en je kunt altijd terug met {{ui:common.cancel}}.

Let op: afrondingen en afschuiningen die je op de **hele** groep had gezet, gaan bij het opnieuw opbouwen verloren. De balk meldt dat.

## Splitsen

{{ui:editor.tool.split}} in het gebied {{ui:editor.group.modify}} snijdt de selectie met een vlak in tweeën, bijvoorbeeld een onderdeel dat te groot is voor het printbed, of een waarvan je de binnenkant wilt zien. Selecteer een of meer lichamen of gaten en klik erop. Een doorschijnend vlak laat precies zien waar de snede komt; er verandert niets tot je het toepast.

- {{ui:split.orientation}}: **X** maakt een staande snede tussen links en rechts, **Y** tussen voor en achter, **Z** een liggende snede tussen boven en onder. De assen heten zoals op de kaart Positie, met Z omhoog; Z is waar het vlak begint.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} legt het vlak evenwijdig aan het werkvlak, {{ui:split.workplaneAcrossX}} en {{ui:split.workplaneAcrossY}} zetten het er haaks op, dwars op de X- of Y-richting. Snijdt de oorsprong van het werkvlak de selectie, dan gaat het vlak erdoor, anders door het midden. Zo zet je het werkvlak met [[W]] op een schuin vlak en snijd je precies daar, zonder aan de draairegelaars te draaien.
- {{ui:split.position}}: waar het vlak doorheen gaat, met de schuifregelaar of getypt. Het begint in het midden. Je kunt ook de pijlpunt op het vlak verslepen; het vlak beweegt dan langs de pijl in stappen van 0,1 mm.
- {{ui:split.pickFace}}, de knop naast de positie, legt het vlak op een zijvlak: klik erop en klik daarna op het zijvlak. Stand, beide draaiingen en positie worden erop afgestemd. Tijdens het kiezen laat een blauw vlak onder de aanwijzer zien welk zijvlak het wordt. Een zijvlak van een lichaam dat niet geselecteerd is werkt ook, om de snede erop uit te lijnen, maar het vlak blijft binnen de selectie. [[Esc]] stopt het kiezen en laat het vlak waar het was.
- Met de twee draaischuiven eronder draai je het vlak om de andere twee assen, tot 180° naar beide kanten, voor een schuine snede. Ze zijn te combineren.

{{ui:split.apply}} of [[Enter]] maakt de snede, [[Esc]] annuleert (tijdens het kiezen van een zijvlak stopt de eerste [[Esc]] alleen het kiezen). Elk object dat het vlak doorsnijdt wordt twee gesloten lichamen, genoemd naar hun kant, bijvoorbeeld "Blok (Z+)" en "Blok (Z-)"; objecten die het mist blijven zoals ze zijn. Een gat wordt twee gaten, en een uitgehold lichaam houdt zijn holte. Beide helften blijven waar ze waren; leg voor het printen elke helft op het snijvlak met {{ui:editor.tool.layFlat}}.

{{ui:split.connectors}} lijnen de helften weer uit, zoals de snijgereedschappen van PrusaSlicer, OrcaSlicer en Bambu Studio dat doen. Met {{ui:split.connectors.none}}, de standaard, wordt gesplitst zoals hierboven beschreven. {{ui:split.connectors.dowels}} maakt een gat in elke helft en losse deuvels die in beide gaan: de deuvels komen als derde lichaam, staand naast de helften op hun bodem, om mee te printen – staand worden ze in de lagen rond, net als hun gaten, en dat is wat de pastest meet. {{ui:split.connectors.plugs}} zet ronde tappen op de helft waarvan de naam op een min eindigt, met de gaten ervoor in de andere helft. De verbinders gaan haaks op het vlak naar binnen, hoe het ook gedraaid is, elk met zijn diameter en 1,2 mm materiaal tot elke rand van het snijvlak, en twee ervan twee keer zo ver uit elkaar. Elk los stuk van het snijvlak krijgt zijn eigen, gelijkmatig erover verdeeld: {{ui:split.connectorCount}} zegt hoeveel, en 0 laat het aan de grootte van het stuk over, minstens twee. Een stuk dat te klein is voor één krijgt er geen, en een verbinder valt weg waar een helft dunner is dan zijn gat diep is; het paneel zegt het voordat je splitst, en witte ringen op het vlak tonen waar ze komen. Past er helemaal geen, dan worden de delen zonder gesplitst en zegt de statusbalk dat.

- {{ui:split.connectorDiameter}} is die van de deuvels en tappen, om te beginnen 5 mm.
- {{ui:split.connectorDepth}} is hoe ver elk gat in zijn helft gaat. Een deuvel is twee keer zo lang min 0,6 mm en een tap 0,3 mm korter dan zijn gat, zodat ze nooit op de bodem van een gat staan en de helften helemaal sluiten. Deuvels en tappen hebben een kleine afschuining aan de uiteinden, en elk gat een aan zijn opening, zodat een uitgelopen eerste laag het niet nauwer maakt.
- {{ui:split.connectorClearance}} is de ruimte tussen een deuvel of tap en zijn gat. Heb je de speling van je printer met de pastest gemeten (in het hoofdstuk over printen), dan begint die daarmee, anders met 0,2 mm.

{{ui:split.connectors.dovetail}} houdt de helften zonder lijm bij elkaar, zoals de zwaluwstaartsnede van OrcaSlicer: een richel die breder wordt naarmate hij verder van het snijvlak komt, staat op de helft waarvan de naam op een min eindigt en loopt recht over het snijvlak, van rand tot rand; de andere helft krijgt de bijpassende groef, aan beide uiteinden open. Schuif de helften van opzij in elkaar, langs de richel; daarna kunnen ze dwars op de snede niet meer uit elkaar worden getrokken. De richels lopen in de lengte van het snijvlak, en raakt een lichaam het vlak in meerdere stukken, dan lopen ze op alle stukken dezelfde kant op, zodat een helft er in één beweging op schuift. {{ui:split.connectorCount}} is het aantal richels naast elkaar op elk stuk; 0 laat het aan de breedte van het stuk over, één per zes richelbreedtes, minstens één. Naast zijn brede bovenkant houdt een richel de helft van zijn eigen breedte en nog 1,2 mm materiaal tot de rand van het snijvlak, en twee richels twee keer zo veel van elkaar. Een stuk dat daarvoor te smal is, of in de lengte te kort, krijgt er geen, en een richel vervalt waar de andere helft dunner is dan zijn groef diep is. Witte omtrekken op het vlak laten zien waar ze komen: de gevulde strook is de voet van de richel, de lijn eromheen zijn brede bovenkant.

- {{ui:split.dovetailWidth}} is de breedte van de richel waar hij uit het snijvlak komt, om te beginnen 6 mm.
- {{ui:split.dovetailDepth}} is hoe ver hij uit het snijvlak in de andere helft steekt, om te beginnen 4 mm. De groef is 0,3 mm dieper, zodat de helften helemaal sluiten.
- {{ui:split.dovetailAngle}} is hoe ver elke flank naar buiten helt ten opzichte van loodrecht op het snijvlak, van 5° tot 30°, om te beginnen 15°. Hoe groter, hoe breder de bovenkant van de richel en hoe steviger hij houdt.
- {{ui:split.dovetailTurn}}: 0 legt de richels in de lengte, 90 dwars over het snijvlak, en een hoek daartussen draait ze zo ver.
- {{ui:split.connectorClearance}} is de ruimte aan elke kant tussen de richel en zijn groef, uit je pastest zoals bij de deuvels. De uiteinden van de richel zijn rondom afgeschuind, zodat hij de groef vindt, en de groef heeft een afschuining aan zijn opening.

Leg voor het printen de helft met de groef op zijn snijvlak, en print de helft met de richel andersom, met het snijvlak boven: de flanken van de richel hellen dan niet verder naar buiten dan hun hoek, en dat print zonder ondersteuning.

Vormen die een gat zijn, worden zonder verbinders gesplitst.

De helften zijn gewone meshes: instellingen zoals het aantal zijden van een cilinder of de letters van een tekst zijn weg, dus stel die eerst in. [[Ctrl]]+[[Z]] haalt het origineel in één stap terug. Vergrendelde en verborgen objecten kun je niet splitsen.

## Onderdelen scheiden

Bestaat een vorm uit meerdere losse stukken, zoals tekst van losse letters, dan splitst {{ui:inspector.separateParts}} die in zelfstandige vormen. Je vindt de optie ook in het menu dat opent met een rechtsklik op de vorm.

> **Tip:** Maak gaten altijd iets langer dan het onderdeel waar ze doorheen moeten. Eindigt het gat precies gelijk met het vlak, dan blijft er soms een flinterdun velletje over. Eén millimeter extra maakt het zeker.
