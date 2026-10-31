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

Je kunt een groep behandelen als een vorm: verplaatsen, draaien, kleuren, opnieuw groeperen. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) heft de groep op en de losse onderdelen zijn terug.

### Een groep een gat maken

Ook een hele groep kan een lichaam of een gat zijn. Daarbij geldt een eenvoudige regel:

- Bestaat de groep alleen uit lichamen (of alleen uit gaten), dan schakel je hem als geheel om en gaan de onderdelen mee.
- Bevat hij allebei, bijvoorbeeld een blok met een boring, dan houdt elk onderdeel zijn eigen stand. De hele groep wordt dan gereedschap, maar de boring blijft een boring.

## Bundelen

Soms moeten onderdelen alleen bij elkaar blijven zonder één te worden, bijvoorbeeld een wit logo op een zwarte plaat voor een meerkleurenprint. Daarvoor is {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), net als in Tinkercad. Een bundel verplaats, draai en schaal je als een vorm, maar er wordt niets samengevoegd:

- Elk onderdeel houdt zijn kleur en blijft een lichaam of een gat.
- Gaten snijden niets weg.
- Bij een export naar STL, 3MF of OBJ is elk onderdeel een eigen lichaam; in 3MF en OBJ met zijn kleur.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) haalt een bundel weer uit elkaar, [[E]] opent hem om te bewerken, net als een groep. Afschuinen, afronden en uithollen werken niet op een bundel, omdat het geen één lichaam is: groepeer hem daarvoor, of bewerk de onderdelen een voor een. Moet een gat in de bundel toch snijden, groepeer de bundel dan (Ctrl+G).

## Doorsnijding

{{ui:editor.tool.intersect}} houdt alleen over wat twee of meer lichamen gemeen hebben. Leg twee overlappende vormen over elkaar, selecteer ze allebei en klik erop. Zo maak je van een cilinder en een blok een stuk met één ronde en één rechte kant. Een groep telt zoals hij eruitziet, inclusief gaten. Is er ook een gat geselecteerd, dan blijft over wat alle lichamen gemeen hebben met alle gaten. Hebben de vormen niets gemeen, dan verandert er niets en zegt een melding dat. Ernaast toont {{ui:editor.tool.intersectPreview}} het gemeenschappelijke deel voordat je het toepast: de geselecteerde vormen worden doorzichtig en wat ze gemeen hebben, wordt groen getekend. Selecteer en verplaats elke vorm afzonderlijk en het groene deel volgt; {{ui:editor.tool.intersect}} past het toe, [[Esc]] sluit de voorvertoning.

## Het ene lichaam uit het andere snijden

Bij onderdelen die op elkaar moeten passen, een as in een huls of een bout in een behuizing, maak je het ene onderdeel en snijd je het uit het andere. Selecteer de twee lichamen en klik op {{ui:editor.tool.cutOut}} in het gebied {{ui:editor.group.combine}}, of klik met rechts en kies het daar. Het venster noemt het onderdeel dat blijft en het lichaam dat de holte krijgt; layerling neemt het kleinste als onderdeel, en {{ui:cutOut.swap}} draait het om. {{ui:cutOut.clearance}} maakt de holte rondom zoveel groter dan het onderdeel: 0 past precies, 0,2 mm is een gebruikelijke speling voor een geprinte pasvorm. {{ui:cutOut.apply}} snijdt een kopie van het onderdeel uit het andere lichaam en laat het onderdeel zelf waar het is. Het resultaat is een groep: {{ui:editor.tool.ungroup}} haalt de snede weer uit elkaar. Een speling vraagt dat het onderdeel een exact lichaam is, zoals bij het gereedschap {{ui:editor.tool.offset}}, dat hiervoor wordt gebruikt.

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

De helften zijn gewone meshes: instellingen zoals het aantal zijden van een cilinder of de letters van een tekst zijn weg, dus stel die eerst in. [[Ctrl]]+[[Z]] haalt het origineel in één stap terug. Vergrendelde en verborgen objecten kun je niet splitsen.

## Onderdelen scheiden

Bestaat een vorm uit meerdere losse stukken, zoals tekst van losse letters, dan splitst {{ui:inspector.separateParts}} die in zelfstandige vormen. Je vindt de optie ook in het menu dat opent met een rechtsklik op de vorm.

> **Tip:** Maak gaten altijd iets langer dan het onderdeel waar ze doorheen moeten. Eindigt het gat precies gelijk met het vlak, dan blijft er soms een flinterdun velletje over. Eén millimeter extra maakt het zeker.
