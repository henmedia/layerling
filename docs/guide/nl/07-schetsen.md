---
title: "Schetsen: van omtrek naar lichaam"
summary: Teken een platte omtrek, rond de hoeken af of schuin ze af, en trek of draai er een lichaam van.
---

Niet alles laat zich uit basisvormen samenstellen. Voor onderdelen met een eigen contour, zoals een beugel, een tandprofiel of een vaas, teken je eerst de **omtrek** en maak je daar een lichaam van. Daar is de schetsmodus voor.

## Een schets beginnen

Schakel bovenaan over van {{ui:editor.modeGeometry}} naar {{ui:editor.modeSketch}}. In de groep {{ui:sketch.group.create}} van het lint staan drie knoppen naast elkaar voor wat de omtrek moet worden:

- **{{ui:sketch.extrude}}:** De omtrek wordt omhoog getrokken, als een koekjesvorm.
- **{{ui:sketch.revolve}}:** De omtrek wordt om een as gedraaid, als op een draaibank. Zo krijg je vazen, bekers, kegels en alles wat rond is.
- **{{ui:sketch.sweep}}:** De omtrek wordt langs een pad getrokken: een kabelgoot met een hoek, een leiding, een ring om een vorm. Zie hieronder Langs een pad trekken.

De editor toont dan een vel met een raster. Dat is je tekenvlak.

## Tekenen

Het lint in de schetsmodus is in gebieden verdeeld:

- **Tekenen:** {{ui:sketch.line}} maakt rechte stukken: klik punten na elkaar aan; met [[Shift]] ingedrukt klikt de nieuwe lijn vast in stappen van 15°, horizontaal en verticaal inbegrepen. De lengte en hoek van de nieuwe lijn staan bij de aanwijzer. Je kunt ook intypen hoe lang hij moet worden, zie [Lijnen met getallen](#lijnen-met-getallen). De {{ui:sketch.bezier}} vorm je met zijn handgrepen: klik een punt en sleep in de richting waarin de lijn verder moet lopen, zoals met het pengereedschap in Illustrator of Inkscape. Hoe verder je sleept, hoe sterker de bocht; het stuk naar het nieuwe punt buigt mee terwijl je sleept, zodat je ziet wat je krijgt. Slepen tijdens het plaatsen van een punt buigt de curve; kom je van Tinkercad en wil je gewoon punten klikken, neem dan de {{ui:sketch.smooth}}. De {{ui:sketch.smooth}} legt een vloeiend pad door de punten die je klikt. Om de omtrek te sluiten klik je aan het eind weer op het eerste punt. De reeks lijnen beëindig je zonder de omtrek te sluiten met een rechtsklik zonder te bewegen of een dubbelklik op het laatste punt.
- **Vormen:** {{ui:sketch.addShape}} biedt kant-en-klare omtrekken: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (een schijf met gaten), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, een {{ui:sketch.polygon}} en een {{ui:sketch.star}}. Klik er een aan om hem in de oorsprong van de schets te zetten, of sleep hem uit het menu naar de plek waar je hem wilt hebben. Onderaan het menu stelt {{ui:sketch.polygonSides}} het aantal zijden van de veelhoek en het aantal punten van de ster in, en {{ui:sketch.starInner}} hoe diep de dalen van de ster naar het midden reiken (10 tot 90 procent van de buitenstraal); beide gelden voor de volgende vorm die je toevoegt. Zoals elke schetsvorm zijn het daarna gewone hoekpunten, zodat je ze een voor een kunt verplaatsen, afronden of afschuinen.
- **Overlappen:** Schuif je twee gesloten omtrekken over elkaar, dan blijven het twee lichamen, die in de 3D-editor samensmelten; de overlap is geen gat. Een gat ontstaat alleen uit een omtrek die helemaal binnen een andere ligt. Verplaatsen verbindt de lijnen niet waar ze elkaar kruisen, zodat je de vormen weer uit elkaar kunt trekken. Teken je echter een lijn dwars over andere, dan zet layerling op elke kruising een punt.
- **Selectie:** {{ui:sketch.select}} verplaatst punten en lijnen. Een klik binnen een gesloten omtrek selecteert de hele omtrek, zodat je hem meteen kunt slepen of van maat veranderen; binnen een gat pakt hij het gat. Het kader rond de selectie heeft acht handgrepen: de hoeken veranderen breedte en hoogte samen, en houden de verhoudingen vast zolang je [[Shift]] ingedrukt houdt. Die aan de zijkanten veranderen maar één richting. {{ui:sketch.lockOutline}} (of [[Ctrl]]+[[L]]) vergrendelt de geselecteerde omtrek, zoals een vergrendeld lichaam in de 3D-editor: hij kan niet meer worden verplaatst of gewijzigd, zijn lijnen worden bleker, zijn punten grijs, en de handgrepen van het kader worden grijs en reageren niet meer. Zolang hij geselecteerd is, ontgrendelt een klik op het slotje in zijn hoek hem. De gebogen pijlen bij de hoeken van het kader draaien de hele selectie om zijn midden: het getal boven de muisaanwijzer toont de hoek, en met [[Shift]] ingedrukt gaat het in stappen van 15°. Tijdens het draaien verschijnt een ring: met de aanwijzer erbinnen klikt het draaien vast in stappen van 22,5°, erbuiten gaat het in hele graden, los van het raster. [[R]] draait een hele gesloten omtrek bij elke druk 45°. Klik op het label met de breedte of hoogte om een nieuwe maat in te typen, ook als som ("60+12.5") of in procenten ("150%"). Met [[Shift]] ingedrukt voegt een klik op een punt of lijn die aan de selectie toe of haalt hem er weer uit, zodat je er meerdere kunt kiezen en samen verplaatsen. Sleep een kader over een lege plek om alles daarbinnen te selecteren. Ook een lijn kun je slepen (hij beweegt aan zijn twee uiteinden mee, of de hele selectie als hij daar deel van is). De pijltjestoetsen verplaatsen de selectie een rasterstap, met [[Shift]] erbij een grotere, en [[Shift]] ingedrukt tijdens het slepen houdt de beweging op één as. {{ui:sketch.refine}}: een klik op een stuk voegt een punt toe, een klik op een punt verwijdert het. Verder zijn er {{ui:sketch.erase}} (een klik op een punt of lijn haalt het weg, een venster over meerdere heen getrokken haalt alles erin weg, en met een selectie wist de knop de selectie) en het invoegen van een sjabloonafbeelding ({{ui:sketch.addImage}}).
- **Klembord:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} en {{ui:editor.tool.delete}} werken op de geselecteerde punten, lijnen en afbeeldingen, net als in de 3D-editor; [[Ctrl]]+[[X]] knipt. Geplakte en gedupliceerde geometrie komt naast het origineel terecht met 10 mm tussenruimte, op een vrije plek waar ze geen bestaande lijn raakt, zodat ze nooit vastgemaakt wordt aan wat er al staat. Ze blijft geselecteerd, zodat je haar meteen op haar plek kunt slepen.
- **Geschiedenis:** {{ui:sketch.undo}} en {{ui:sketch.redo}}.
- **Beheren:** {{ui:editor.tool.note}} (of [[N]]) zet een notitie op de schets, zoals in de 3D-editor: de volgende klik plaatst haar, waar dan ook, ook op een lijn. Sleep aan de speld om haar te verplaatsen; een klik op de speld klapt de kaart in. De notities van een schets horen bij haar lichaam: in de 3D-weergave zitten ze bovenop een lichaam gemaakt met {{ui:sketch.extrude}} of {{ui:sketch.sweep}} en op het getekende profiel van een lichaam gemaakt met {{ui:sketch.revolve}}, en ze bewegen mee. Open je de schets opnieuw, dan toont ze alle notities van het lichaam, ook die in 3D zijn gezet. {{ui:sketch.undo}} neemt een notitie terug zoals een lijn, en {{ui:sketch.cancel}} verwerpt wat er aan de notities is veranderd. Meer in het hoofdstuk Meten en notities.
- **Weergave:** Verschuif het beeld met de middelste muisknop of met [[Shift]] of [[Ctrl]] plus de rechtermuisknop, net als in de 3D-editor. Als er niets geselecteerd is, schuiven [[Ctrl]] en de pijltjestoetsen het beeld ook: een tiende van het beeld per druk, de helft met [[Shift]] erbij; de schets beweegt de kant op waarnaar ze wijzen. [[Home]] past de hele schets in beeld, [[F]] zoomt in op de selectie (zonder selectie op de hele schets), en [[+]] en [[−]] zoomen in en uit, net als in de 3D-editor. Is er niets geselecteerd, dan schuift een dubbelklik op een lege plek het beeld zo dat die plek in het midden komt, net als in de 3D-editor; {{ui:workspace.doubleClickCentersView}} in de instellingen zet dat uit. De {{ui:camera.tapeTools}} in de zijbalk meet de afstand tussen twee punten. De schets toont ook maten zodra je iets aanklikt: de lengte van een lijn, of bij een punt de lengtes van de lijnen die daar samenkomen. De knop {{ui:sketch.showMeasurements}} in de zijbalk verbergt en toont deze maten als ze in de weg zitten, bijvoorbeeld bij het vormen van curves; het meetlint blijft werken. Op een rechte lijn kun je op het maatlabel klikken en de lengte in millimeters intypen; [[Enter]] past hem toe, [[Esc]] annuleert. De lijn houdt zijn richting, zijn beginpunt blijft waar het is, en de lijnen aan het andere eind volgen. Is er een eindpunt geselecteerd, dan beweegt dat. [[Alt]]+[[Enter]] laat de lijn naar beide kanten rond zijn midden groeien. Bij curves toont het label alleen de lengte.

Een lichaam ontstaat alleen uit een **gesloten** omtrek.

![Een L-vormige omtrek. Bij het geselecteerde hoekpunt linksboven staan de lengtes van de twee lijnen in millimeters, en de hoek ertussen in graden.](shot:sketch-outline)

De toetsen [[1]] tot en met [[4]] kiezen de tekengereedschappen, in de volgorde van de balk: {{ui:sketch.line}}, {{ui:sketch.bezier}}, {{ui:sketch.smooth}} en {{ui:sketch.refine}}. Ze werken zolang er geen lijn wordt getekend; tijdens een lijn zijn de cijfers de lengte ervan (zie hieronder).

## Lijnen met getallen

Heb je met {{ui:sketch.line}} of {{ui:sketch.smooth}} het eerste punt gezet, typ dan gewoon een getal: naast de lijn openen twee velden, {{ui:sketch.typedLength}} in millimeters en {{ui:sketch.typedAngle}} in graden. [[<]] of [[Tab]] springt naar de hoek, dus "50<30" geeft een lijn van 50 mm lang onder 30°, zoals in AutoCAD. [[Enter]] zet het punt, en je kunt meteen de volgende lijn intypen; [[Esc]] sluit de velden zonder de lijnketen te beëindigen.

De hoek telt tegen de klok in vanaf rechts: 0° naar rechts, 90° omhoog, 180° naar links, 270° omlaag. Laat je hem leeg, dan volgt de lijn de aanwijzer, zodat je alleen de lengte opgeeft en de richting met de muis aanwijst. Sommen als "40+12.5" werken in beide velden. Zou het punt buiten de plaat vallen, dan meldt het veld dat en wacht het op een andere waarde.

## Een rechte zijde buigen

Selecteer een rechte lijn en klik op {{ui:sketch.curveLine}} in de balk die verschijnt: de zijde buigt uit tot een curve, zoals in Tinkercad, en toont zijn twee handgrepen. Sleep eraan om de curve te vormen; hoe verder een handgreep uitsteekt, hoe sterker de bocht. Onder de aanwijzer kleurt een handgreep oranje, en hij vangt ook een klik vlak ernaast op, zodat een sjabloonafbeelding eronder niet per ongeluk verschuift. {{ui:sketch.straightenLine}} maakt de zijde weer recht. Een punt dat je selecteert kun je met {{ui:sketch.smooth}} rond maken: het krijgt eigen handgrepen en de lijnen ernaast worden curves. Met drie of meer punten geselecteerd legt {{ui:sketch.curveThroughPoints}} in de balk één vloeiende curve van het eerste tot het laatste, door elk punt ertussen, zoals het gereedschap {{ui:sketch.smooth}} er een tekent; de lijnen voorbij de twee uiteinden blijven zoals ze zijn. In andere programma's heet dit "Fit curve" of "Fit point spline". Het verschil: {{ui:sketch.curveLine}} buigt elke geselecteerde zijde apart en houdt de hoeken ertussen, voor een boog aan één zijde; {{ui:sketch.curveThroughPoints}} legt één kromme door de punten zonder hoeken, om een gekartelde, overgetrokken rand glad te maken. Klik op een greep en hij licht op: de pijltoetsen verplaatsen hem dan één rasterstap, met [[Shift]] een grotere stap, zodat je een kromme nauwkeurig instelt.

![De onderzijde van de L-vormige omtrek gebogen tot een curve, met zijn twee handgrepen aan de uiteinden.](shot:sketch-curve)

## Hoeken aflezen en intypen

Klik op een hoekpunt waar **twee rechte lijnen** samenkomen: naast de lengtes toont layerling de **hoek** ertussen in graden, met een kleine boog. Bij een gesloten omtrek is het de hoek binnen de vorm, dus een inham geeft meer dan 180°. Klik op de waarde en typ een nieuwe hoek. Een van de twee lijnen draait dan om de hoek en houdt zijn lengte, en de andere blijft waar hij is. De lijn die draait is gestreept getekend; [[Tab]] wisselt naar de andere, [[Enter]] past toe en [[Esc]] annuleert. Wat aan het verre eind van de gedraaide lijn hangt, gaat mee.

Het verplaatsen van een punt verandert drie hoeken: bij het punt zelf en bij de twee buurhoeken aan de verre uiteinden van zijn lijnen. Daarom toont layerling die twee ook, en elk ervan kun je aanklikken en intypen. Zo zet je bijvoorbeeld de hoek linksonder op 75.5° terwijl het punt linksboven, dat daarvoor beweegt, geselecteerd is. Ook hier kun je rekenen, bijv. "90-14.5".

Een hoek toont geen waarde waar een curve erop aansluit, of waar meer dan twee lijnen samenkomen. De knop {{ui:sketch.showMeasurements}} in de zijbalk verbergt de hoek samen met de lengtes.

## Hoeken afronden of afschuinen

Klik op een hoekpunt en kies {{ui:sketch.filletCorner}} of {{ui:sketch.chamferCorner}}. Er verschijnt een klein veld voor de {{ui:sketch.filletRadius}} of de {{ui:sketch.chamferDistance}}. Vul de maat in en bevestig met het vinkje. Dit werkt voor hoeken tussen twee rechte lijnen.

Meerdere hoeken tegelijk kan ook: selecteer ze met [[Shift]] en telkens een klik, of trek er een kader omheen, en kies {{ui:sketch.filletCorner}} of {{ui:sketch.chamferCorner}} in de balk die verschijnt. Ze krijgen allemaal dezelfde straal of afstand. Waar twee geselecteerde hoeken een zijde delen, neemt elk er hoogstens 45 % van, zodat een rechthoek die rondom wordt afgerond bij elke hoek gelijk uitkomt. Punten die geen hoek tussen twee rechte lijnen zijn, worden overgeslagen, en de melding zegt hoeveel. Een kader om een hele vorm, of een klik erbinnen, selecteert de hoeken en de lijnen samen, en de balk biedt dan naast de hoekgereedschappen ook {{ui:sketch.curveLine}} en {{ui:sketch.straightenLine}} voor alle geselecteerde lijnen.

![De hoek linksboven is afgerond met een straal van 12 mm.](shot:sketch-fillet)

## Spiegelen

Selecteer punten en lijnen (klikken, [[Shift]] en klikken, of er een kader omheen trekken) en klik in de balk op {{ui:sketch.mirror}}. Kies dan de as: {{ui:sketch.mirrorLeftRight}} spiegelt in de verticale as door het midden van de plaat, {{ui:sketch.mirrorTopBottom}} in de horizontale, en {{ui:sketch.mirrorAcrossLine}} in een rechte lijn van de schets die je daarna aanklikt. De kopie komt aan de andere kant, het origineel blijft; niets is gekoppeld, dus je kunt beide apart aanpassen. Punten op de as worden gedeeld, zodat een halve omtrek waarvan de uiteinden op de as liggen één gesloten omtrek wordt: teken de helft van een beugel, selecteer die, spiegel hem en maak het lichaam. Een hulplijn is een goede as. [[Esc]] breekt af.

## Hulplijnen

Een hulplijn helpt je punten te plaatsen zonder deel van het lichaam te worden. Hij wordt gestreept getekend en telt nooit als omtrek: je kunt hem zo ver voorbij de vorm trekken als je wilt, en het lichaam groeit niet mee.

- Zet {{ui:sketch.construction}} aan in de groep {{ui:sketch.group.draw}}. Nieuwe lijnen, ook die op maat ingetypt, zijn dan hulplijnen. De knop schakelt terug naar gewone lijnen.
- Een lijn die je al getekend hebt, wordt een hulplijn als je erop klikt en {{ui:sketch.makeConstruction}} kiest. {{ui:sketch.makeSolid}} maakt er weer een gewone lijn van.
- Nieuwe punten klikken vast op de plek waar een hulplijn een andere lijn kruist, wat een blauwe ring aangeeft, en op de uiteinden van de hulplijn. Zo zet je een hoek op een midden, op een vaste afstand van een rand of op een kruising, zonder te rekenen.
- Een hulplijn snijdt de omtrek niet in stukken waar hij die kruist. Bij draaien mag hij ook rechts van de as liggen.

## Er een lichaam van maken

Klik op {{ui:sketch.finishSketch}}. De omtrek staat als lichaam op het werkvlak. In zijn instellingen verander je de hoogte, de kleur en al het andere, net als bij elke andere vorm. Verander je de maat, dan bouwt layerling hem even later opnieuw op uit de schets, en de schets groeit mee. Zo blijft het een exact lichaam dat afschuiningen en afrondingen aanneemt, en heeft de schets de volgende keer dat je hem bewerkt de maat die het lichaam heeft.

Ligt het werkvlak op de zijkant van een lichaam, dan teken je zoals je naar die zijkant kijkt: boven in de schets is ook boven op het afgewerkte lichaam. De vage omtrek van het lichaam in de schetsweergave laat zien waar het staat. Snijdt het werkvlak door een lichaam, dan toont de schetsweergave in plaats daarvan de omtrek van die doorsnede, zodat een hol lichaam als een ring verschijnt en je de schets op zijn wanden kunt uitlijnen. Een punt dat je dicht bij een hoek van deze omtrekken zet of sleept, klikt er precies op vast; een kleine blauwe ring laat dat zien. Zo neem je randen van andere lichamen over in de schets, ook als het werkvlak er niet precies op ligt. Om langs bestaand werk te tekenen, zet je {{ui:sketch.showPartEdges}} aan (de knop met de lagen bij de weergaveknoppen links): alle randen van de lichamen worden dan dun en vaag op het schetsvlak getekend, alsof je erdoorheen kijkt, op welke hoogte ze ook liggen. Een rechtopstaand vlak, bijvoorbeeld op een voorvlak gezet, toont zo het vooraanzicht. De keuze wordt in de browser onthouden.

![De omtrek is een lichaam geworden. De hoek is afgerond.](shot:sketch-result)

Met {{ui:inspector.editSketch}} kun je op elk moment terug naar de schets om hem te veranderen. Een dubbelklik op het lichaam doet hetzelfde, zoals in Tinkercad (een vergrendeld lichaam blijft dicht); {{ui:workspace.doubleClickOpensSketch}} in de instellingen zet dat uit. Randbewerkingen die je al op het lichaam hebt gemaakt gaan wel verloren, omdat de randen opnieuw worden gemaakt. Een lichaam dat je in de 3D-editor hebt gedraaid of verschoven, opent waar het op de plaat staat, gedraaid zoals je het daar ziet en op het raster van de plaat; alleen een gekanteld of gespiegeld lichaam opent in zijn eigen stand.

Een schets met meerdere omtrekken geeft één lichaam, en omtrekken die overlappen, versmelten erin. Wil je elke omtrek apart, selecteer dan het lichaam en klik op {{ui:inspector.separateParts}}: elke buitenste omtrek wordt een eigen lichaam met de gaten die erin liggen, en houdt de hoogte, kleur en plaats van het lichaam. Elk deel heeft zijn eigen schets om te bewerken, met de hulplijnen, zodat je de delen een voor een kunt optillen of laten zakken en ze daarna samenvoegen of aftrekken. Randbewerkingen verhinderen dat, net als een lichaam dat achteraf is uitgerekt: dat wordt dan als net gescheiden.

**Een ander soort lichaam uit dezelfde schets:** het label bovenaan de schets zegt wat hij wordt: {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} of {{ui:sketch.modeBadgeSweep}}. Klik erop en kies een ander, ook terwijl je een bestaand lichaam bewerkt: een geïmporteerde SVG, die geëxtrudeerd binnenkomt, wordt een vaas of een knop als je hem op {{ui:sketch.modeBadgeRevolve}} zet. Een omtrek die over de as reikt, schuift naar links tot zijn rechterrand op de as ligt; [[Ctrl]]+[[Z]] draait het verschuiven terug. Bij het afronden neemt het nieuwe lichaam de plaats van het oude in, met zijn naam en kleur en de voet op dezelfde hoogte. Randbewerkingen gaan verloren, zoals bij elke wijziging van een schets.

### Omwentelen

Bij draaien teken je de halve doorsnede **links van de as** die in de schets getoond wordt. Daarnaast zie je een 3D-voorbeeld van het draaien. Dat laat meteen zien hoe het lichaam eruit gaat zien. De omtrek moet gesloten zijn, of je bouwt een open lijn als lijn met dikte, zie hieronder. Klik aan het eind op {{ui:sketch.finishRevolve}}. De andere lichamen van het ontwerp worden van voren getoond, in dezelfde weergave als het profiel, met de as in het midden: teken het profiel naast of boven ze. Het lichaam staat waar je het getekend hebt, en de horizontale lijn door het midden van de schets is de grond: een profiel erboven geeft een lichaam dat hoger staat, en het laagste punt is de voet van het lichaam.

Een gedraaid lichaam is een exact lichaam, net als een geëxtrudeerd: het neemt afschuiningen en afrondingen aan, en je kunt het uithollen, voor een beker of een vaas. Een lichaam dat met een oudere layerling gedraaid is, is een mesh; open {{ui:inspector.editSketch}} en voltooi het opnieuw om het exact te maken. Een profiel dat over de as heen reikt, kan niet exact gebouwd worden en wordt, zoals voorheen, een mesh.

**Eén doorlopende streng: {{ui:prop.pitch}}.** Een rondgedraaide omtrek wordt gesloten ringen. Selecteer het gedraaide lichaam en geef het in het eigenschappenvenster een {{ui:prop.pitch}} boven 0, de hoogte die het per omwenteling stijgt, en de omtrek windt zich op als een schroeflijn: één doorlopende streng, zoals filament op een spoel of een spiraal. {{ui:prop.sweep}} wordt dan {{ui:prop.turns}}, tot 200; een negatief getal windt linksom. Windingen die dichter op elkaar liggen dan de omtrek hoog is, smelten samen tot één lichaam, dus ook een massieve kern met een fijne spoed werkt. Een schroeflijn wordt als mesh gebouwd, dus afronden, afschuinen en uithollen werken er niet op; houd {{ui:prop.sides}} laag bij veel windingen. Een spoed van 0 maakt er weer ringen van.

## Langs een pad trekken

{{ui:sketch.sweep}} trekt een omtrek langs een pad: een kabelgoot die om de hoek gaat, een leiding, een beschermkap om een riem, een ring om een zeshoek. De knop staat naast {{ui:sketch.extrude}} en {{ui:sketch.revolve}} in de groep {{ui:sketch.group.create}}.

Je tekent twee dingen op hetzelfde blad:

- **De dwarsdoorsnede** als gesloten omtrek, zoals gewoonlijk. Teken haar zoals je haar zou zien als je vanaf het begin van het pad langs het pad kijkt: dwars op het pad is links en rechts in de schets, boven is boven op het eindresultaat. Een holle doorsnede, een goot of een buis, is een omtrek met een tweede erin. De doorsnede staat dwars gecentreerd op het pad, en het lichaam staat met het laagste punt van de doorsnede op het schetsvlak.

- **Het pad** als {{ui:sketch.construction}}: zet haar aan en teken lijnen of krommen, één enkele reeks, open of gesloten (een gesloten reeks geeft een ring). Het pad ligt plat in het schetsvlak.

Teken de doorsnede bij het uiteinde van het pad waar ze moet beginnen; het pad begint bij het uiteinde dat er het dichtst bij ligt. Klik dan op {{ui:sketch.finishSweep}}. Een hoek van rechte stukken wordt een verstek, een kromme blijft glad en de doorsnede blijft over de hele lengte rechtop. Het lichaam is exact, net als een omhooggetrokken lichaam: afronden, afschuinen en STEP-export werken erop. Ontbreekt een gesloten omtrek of een pad, of zijn er meerdere losse paden, dan zegt layerling het. Met {{ui:inspector.editSketch}} ga je terug naar de schets en verander je doorsnede of pad.

## Als lijn opbouwen

Normaal wordt het vlak binnen een gesloten omtrek het lichaam. Met {{ui:sketch.stroke}} in het gedeelte {{ui:sketch.group.finish}} bouw je in plaats daarvan de lijn zelf op, met een breedte die je instelt. Vink {{ui:sketch.strokeOn}} aan in het paneel; de schets laat meteen zien wat eruit komt.

- Een **gesloten omtrek** wordt een frame. {{ui:sketch.strokeAlign}} bepaalt waar de wand ligt: {{ui:sketch.strokeAlign.center}} op de getekende lijn, {{ui:sketch.strokeAlign.inside}} erbinnen of {{ui:sketch.strokeAlign.outside}} erbuiten. Buiten is handig voor een tolerantie: teken de omtrek van een gat, bijvoorbeeld een zwaluwstaart, en geef hem een lijn van 0.2 mm buiten om de speling te krijgen die de print nodig heeft.
- Een **open lijn** wordt een strook, gecentreerd op de lijn. {{ui:sketch.strokeCap}} bepaalt hoe de uiteinden eruitzien: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (een halve breedte langer) of {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} geldt voor beide: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} of {{ui:sketch.strokeJoin.bevel}}.

De schets houdt de getekende lijn. Open je hem opnieuw, dan ga je verder met het veranderen van lijn en lijndikte; vink je het vakje uit, dan wordt het vlak weer opgebouwd. Curves worden daarvoor in korte rechte stukjes opgedeeld.

Bij een draaiing is de lijndikte een dunne wand: teken de wand van een vaas of een beker als **één open lijn** links van de as, vink {{ui:sketch.stroke}} aan en stel de breedte in, dan draait de draaiing die band. Wat over de as heen reikt, wordt aan de as afgesneden.

## Vulling en silhouet

Je kunt de lijn ook instellen zonder de schets te openen: kies in de eigenschappen van een schetslichaam onder {{ui:prop.sketchFill}} voor {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} of {{ui:prop.sketchFill.center}}, met {{ui:prop.sketchLineWidth}} en {{ui:sketch.strokeJoin}}. Het lichaam wordt meteen opnieuw opgebouwd, op de plek waar het staat. Deze komen overeen met de vulmodi van de SVG-import van Tinkercad: standaard, buitenlijn en binnenlijn. {{ui:prop.sketchFill.grow}} houdt het vlak gevuld en laat het rondom met de lijnbreedte groeien, met scherpe, ronde of afgeschuinde hoeken: een basislaag onder een logo voor een meerkleurenprint, die de lijn buiten alleen als ring zou geven.

{{ui:prop.sketchSilhouette}} laat elke omtrek weg die binnen een andere ligt: gaten en wat erin ligt. Alleen de buitenste omtrek blijft over. Samen met {{ui:prop.sketchFill.outside}} maakt het een koekjesvorm: importeer een SVG twee keer, een keer met het silhouet als vlak voor de basis en een keer met het silhouet en 1 tot 2 mm lijn buiten als wand. De schakelaar zit ook in het paneel {{ui:sketch.stroke}} in de schetsmodus.

Afrondingen en afschuiningen op de randen verdwijnen wanneer het lichaam opnieuw wordt opgebouwd, net als bij het bewerken van de schets.

## Schuine wanden, voor stempels

Een geëxtrudeerde schets heeft verticale wanden. Een stempel, een preegmal of een pons wil schuine, buiten en binnen, met overal dezelfde wanddikte. Layerling heeft geen lossingshoek voor een extrusie, maar voor eenvoudige omtrekken kom je er met {{ui:inspector.taper}}. Een manier die werkt:

1. Teken de omtrek met het gat dat hij nodig heeft en maak er een lichaam van. Dupliceer het lichaam ([[Ctrl]]+[[D]]).
2. Zet bij het eerste lichaam {{ui:prop.sketchSilhouette}} aan, zodat het gat gevuld wordt, en geef het met {{ui:inspector.taper}} een bredere onderkant dan bovenkant.
3. Open bij de kopie de schets opnieuw en verwijder de buitenste omtrek, zodat alleen de omtrek van het gat overblijft. Voltooi de schets, zet het lichaam op {{ui:inspector.hole}} en geef het met {{ui:inspector.taper}} een smallere onderkant dan bovenkant.
4. Schuif het gat in het eerste lichaam, waar het gat zat, en groepeer de twee.

De wanden lopen nu buiten en binnen schuin. Tapsheid schaalt de hele omtrek, dus dit is exact voor eenvoudige vormen, waar je de maten zo kunt kiezen dat de wanden evenwijdig lopen, en slechts een benadering voor fijne details zoals letters.

## Een afbeelding als sjabloon

Met {{ui:sketch.addImage}} leg je een foto of tekening onder de schets en trek je die over. Je kunt de grootte, de doorzichtigheid en de positie instellen. Zodra de afbeelding goed ligt, vergrendel je hem met [[Ctrl]]+[[L]], zodat je hem niet per ongeluk verschuift tijdens het tekenen. Een vergrendelde afbeelding zit niet in de weg: klikken gaan erdoorheen, zodat je lijnen en punten erop kunt kiezen en er een kader overheen kunt slepen. Een klik op het slotje in zijn hoek ontgrendelt hem; met [[Alt]] ingedrukt klikken selecteert hem zonder hem te ontgrendelen. Bedekken de instellingen aan de rechterrand de afbeelding, sleep ze dan aan hun titelbalk weg; een dubbelklik daarop zet ze weer vast.

Onder {{ui:sketch.imageAlign}} lijn je een foto uit die niet recht genomen is:

- **{{ui:sketch.imageRotation}}:** Draai de afbeelding om haar midden, met de gebogen pijlen bij haar hoeken of als getal in graden. Met [[Shift]] klikken de pijlen vast in stappen van 15°. Binnen de ring die bij het draaien verschijnt klikken ze vast in stappen van 22,5°, erbuiten in hele graden.
- **{{ui:sketch.centreImageX}}** en **{{ui:sketch.centreImageY}}:** zetten het midden van de afbeelding op X = 0 of Y = 0. Bij draaien is X = 0 de as, zodat de afbeelding dan symmetrisch om de as ligt.
- **{{ui:sketch.calibrateImage}}:** De knop staat bovenaan, direct onder het voorbeeld. Klik twee punten in de afbeelding aan waarvan je de afstand kent, de uiteinden van een liniaal of een bekende diameter, en typ de echte afstand in. De afbeelding wordt gelijkmatig geschaald zodat die afstand klopt; het eerste punt blijft waar het was.
- **{{ui:sketch.cropImage}}:** De handgrepen op het kader snijden de afbeelding nu bij in plaats van haar te schalen; wat weggesneden is blijft bewaard en komt terug met {{ui:sketch.uncropImage}} of wanneer een handgreep weer naar buiten wordt getrokken.

Alle vier raken alleen de referentie, nooit de schets.

**{{ui:sketch.traceImage}}** in de instellingen van de afbeelding zet de punten voor je: het trekt de omtrek van de vorm in de afbeelding over – een silhouet, een logo, een woord – en toont die in rood over de afbeelding, vierkante punten voor hoeken, ronde voor vloeiende punten. {{ui:sketch.traceDark}} of {{ui:sketch.traceLight}} kiest welk deel van de afbeelding de vorm is, {{ui:sketch.traceThreshold}} waar donker in licht overgaat, {{ui:sketch.tracePoints}} hoeveel punten de omtrekken samen krijgen (minder geven vloeiendere krommen, meer volgen de afbeelding nauwkeuriger), {{ui:sketch.traceCorners}} vanaf welke knik een punt een hoek is, {{ui:sketch.traceSpeck}} tot welke grootte vlekjes wegvallen, en {{ui:sketch.traceHoles}} houdt het midden van een A of O. {{ui:sketch.traceApply}} zet de omtrekken precies daar in de schets waar de afbeelding ligt, op haar grootte, draaiing en uitsnede, en selecteert ze: het zijn gewone punten om te verplaatsen, te krommen of te verwijderen, en [[Ctrl]]+[[Z]] neemt ze in één stap terug. Het werkt het best met duidelijk contrast; stel een foto met een drukke achtergrond eerst vrij.

## Toetsen in de schetsmodus

| Toets | Werking |
| --- | --- |
| [[Esc]] | notitiegereedschap neerleggen; anders gereedschap neerleggen (terug naar {{ui:sketch.select}}), dan selectie opheffen |
| [[Delete]] | geselecteerd element verwijderen |
| [[Ctrl]]+[[C]] | selectie kopiëren |
| [[Ctrl]]+[[X]] | selectie knippen |
| [[Ctrl]]+[[V]] | plakken |
| [[Ctrl]]+[[D]] | selectie dupliceren |
| [[Ctrl]]+[[Z]] | ongedaan maken |
| [[Ctrl]]+[[A]] | alle punten en lijnen selecteren |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | tijdens tekenen: lijn vastklikken in stappen van 15°; tijdens slepen: beweging op één as houden |
| cijfer, [[<]], [[Tab]], [[Enter]] | tijdens tekenen: lengte en hoek van de volgende lijn intypen en vastleggen |
| [[R]] | gesloten schets 45° draaien |
| [[Ctrl]]+[[L]] | sjabloonafbeelding vergrendelen of ontgrendelen |
| [[N]] | notitie zetten: de volgende klik plaatst haar op de schets |
| [[Shift]]+[[N]] | notities tonen of verbergen |

> **Tip:** Teken zo weinig punten als nodig. Een omtrek met een paar goed geplaatste punten geeft een gladder lichaam dan een kluwen van veel punten.
