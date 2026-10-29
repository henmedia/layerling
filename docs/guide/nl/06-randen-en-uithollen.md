---
title: Randen breken en lichamen uithollen
summary: Afschuining en afronding op gekozen randen, wanden van gelijke dikte voor dozen, bekers en behuizingen.
---

## Randen afschuinen en afronden

Scherpe randen zien er op een geprint onderdeel zelden goed uit, en sterk zijn ze ook niet bepaald. Een **afschuining** snijdt de rand schuin af, een **afronding** maakt hem rond. Beide werken op de randen waarop je klikt.

1. Selecteer het lichaam (of de groep).
2. Klik in het lint op {{ui:editor.tool.fillet}} of {{ui:editor.tool.chamfer}}, druk op [[B]] voor de afronding of [[Shift+B]] voor de afschuining, of klik met de rechtermuisknop op het lichaam en kies het in het menu.
3. De randen van het lichaam lichten op. Klik op de randen die bewerkt moeten worden. Nog een klik haalt een rand er weer uit. Met [[Shift]] voeg je één rand toe of haal je hem weg.
4. Stel de maat in en bevestig met {{ui:edge.apply}} of [[Enter]]. Daarna blijft het venster met dezelfde maat open op het nieuwe lichaam, zodat meteen de volgende afronding of afschuining kan volgen; {{ui:edge.done}}, [[Esc]] of het kruisje sluit het. Met [[Shift]] of [[Ctrl]] voegt een klik op {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} of {{ui:edge.horizontalEdges}} die randen toe aan de gekozen randen in plaats van ze te vervangen.

![Het gereedschap "Randen afronden": alle scherpe randen zijn geselecteerd, het beeld toont het voorbeeld met een straal van 4 mm.](shot:fillet-preview)

Het paneel staat rechtsboven. Bedekt het randen waarop je wilt klikken, sleep het dan aan de titelbalk weg; de volgende keer opent het daar ook, net als {{ui:editor.tool.hollow}} en {{ui:editor.tool.array}}. Dubbelklik op de titelbalk om het terug te zetten.

Kies je een vorm uit de vormenlijst terwijl het paneel open is, dan sluit het zonder iets toe te passen, en de randen waarop je had geklikt worden vergeten. De klik plaatst dan de nieuwe vorm in plaats van randen te kiezen.

In het paneel vind je:

- {{ui:edge.allSharpEdges}} selecteert alle randen tegelijk, {{ui:edge.clear}} maakt de selectie leeg.
- **{{ui:edge.radius}}** voor de afronding. Voor de afschuining stel je {{ui:edge.distance}} of {{ui:edge.angle}} in.
- {{ui:edge.sharpThreshold}} bepaalt welke randen überhaupt als scherp gelden. Een waarde van 25° behandelt alleen duidelijke knikken als rand en laat vloeiende overgangen met rust.
- {{ui:edge.topEdges}} kiest alleen de randen langs de bovenkant van het lichaam. Dat is de snelle manier voor een koekjesvorm: bouw de omtrek in een schets als lijn, en schuin dan de bovenranden af. {{ui:edge.angle}} bepaalt hoe steil de afschuining is; die kan niet verder reiken dan de wand dik is.
- {{ui:edge.bottomEdges}} kiest alleen de randen helemaal onderaan het lichaam, het tegenstuk van {{ui:edge.topEdges}}. Zo rond je snel alleen de voet van een onderdeel af of geef je die een afschuining.
- {{ui:edge.chamfillet}}, bovenaan het afschuinvenster naast {{ui:editor.tool.chamfer}} gekozen, maakt de printbare voet van een onderdeel: een afschuining bij de plaat die tangentieel overgaat in een afronding naar de wand, zodat de eerste lagen geen steun nodig hebben en de rand toch zacht eindigt. {{ui:edge.distance}} is de hoogte die de voet inneemt, {{ui:edge.angle}} (15° tot 75°) de steilte van de afschuining bij de plaat. De randen kies je met {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} verbergt de randen die vanuit jouw kijkrichting achter het lichaam liggen. Standaard schijnt elke rand door het lichaam heen, wat bij een druk onderdeel verwarrend wordt; met de schakelaar aan zie je, en klik je, alleen de randen die naar je toe wijzen. Draai het beeld om bij de andere te komen. Een rand die rood getekend is (zie hieronder) is altijd zichtbaar.
- {{ui:edge.tangentChains}}: een klik kiest dan ook randen die vloeiend in elkaar overlopen, bijvoorbeeld alle randen rond een vlak met afgeronde hoeken. De schakelaar bepaalt alleen wat een klik kiest: de CAD-kernel zet een afschuining of afronding altijd door langs zulke vloeiend doorlopende randen. Het paneel meldt langs hoeveel randen extra dat gebeurt.
- {{ui:edge.keepSize}} houdt de afschuining of afronding even groot, ook als je het lichaam later schaalt.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} of {{ui:edge.fine}}) bepaalt hoe fijn het voorbeeld wordt berekend. Voor lastige onderdelen is {{ui:edge.draft}} sneller.

Terwijl je de maat aanpast, berekent layerling het voorbeeld opnieuw. Dat kan even duren. Je mag gewoon doorgaan met aanpassen; de laatste waarde die je kiest wordt berekend.

Is de maat te groot voor de rand, dan meldt layerling dat en stelt een kleinere waarde voor. Vaak volstaat een of twee millimeter minder. Bij scherpe hoeken heeft een afronding meer ruimte nodig dan zijn straal doet vermoeden. Op een klein scherm scrollt het paneel vanzelf omlaag zodat de melding in beeld komt.

Mislukt een selectie die eerst werkte nadat je op nog een rand hebt geklikt, dan wordt die rand rood en breder getekend: dat is de rand die bij deze maat niet samen met de andere kan worden bewerkt. Klik er nog een keer op om hem eruit te halen, of maak de maat kleiner. Klik je meer randen aan terwijl de melding staat, dan blijft de eerste rood. Is er geen eerdere selectie die werkte, bij de allereerste klik of een maat die je net hebt verhoogd, dan worden de randen rood die ook op zichzelf mislukken, of allemaal als het alleen aan hun combinatie ligt.

Ook de rand onder de aanwijzer wordt breder getekend, zodat je ziet welke een klik zal kiezen.

### Een randbewerking terugdraaien

Een bewerkt lichaam kun je altijd opnieuw bewerken. Selecteer het weer en open het gereedschap; Afronden, Afschuinen en Uithollen tonen allemaal de lijst: onder {{ui:edge.featureHistory}} zie je wat er al op zit. {{ui:edge.revertAction}} draait één bewerking terug. Let op: liggen er nieuwere bewerkingen bovenop, dan gaan die mee, en het paneel meldt hoeveel.

Naast een afschuining, een afronding of een uitholling staat ook {{ui:edge.editAction}}. Dat draait de bewerking op dezelfde manier terug, maar opent het gereedschap meteen opnieuw met dezelfde randen en de oude waarde. Je past de waarde aan en past hem opnieuw toe: een afronding van 3 mm wordt er een van 5 mm zonder dat je de randen nog eens hoeft aan te klikken. Liggen er nieuwere bewerkingen bovenop, dan gaan die ook hier mee. Dit geldt voor randbewerkingen die je vanaf nu maakt; oudere bieden alleen terugdraaien aan, net als losse onderdelen van een groep.

Bij een groep, bijvoorbeeld een cilinder met een gat, hoort de bewerkte rand bij het afgewerkte lichaam, niet bij een van zijn onderdelen. De groep wordt dus één lichaam. {{ui:editor.tool.ungroup}} werkt toch: het draait eerst de randbewerkingen terug en heft dan de groep op, in één stap die [[Ctrl]]+[[Z]] ongedaan maakt. Draai de bewerking terug zoals hierboven beschreven en de groep komt terug met al zijn onderdelen. Het makkelijkst is om randen als laatste te bewerken. Dat geldt ook voor schroefdraad: het randgereedschap neemt schroefdraad als exact lichaam, dus bij een blok met een draadgat erin worden de randen afgerond met de schroefdraad erin. De randen van schroefdraad uitrekenen duurt langer dan bij een gewone vorm: een paar seconden voor een M6 en ongeveer een halve minuut voor een G1/2-pijpdraad.

> **Goed om te weten:** layerling werkt voor afrondingen en afschuiningen met echte CAD-geometrie, niet alleen met een driehoeksmesh. Daarom is een afgeronde rand in de STEP-export nog steeds een afgeronde rand.

Een onderdeel dat als STEP is geïmporteerd houdt ook zijn CAD-geometrie: afschuiningen, afrondingen en uithollen werken op het lichaam uit het bestand, hoe fijn het onderdeel op het scherm ook getekend is. STL, OBJ en 3MF brengen alleen driehoeken mee, en een fijn getekend onderdeel kan te dicht zijn voor het randgereedschap. Is een onderdeel ook als STEP beschikbaar, importeer dat dan.

## Lichamen uithollen

Dozen, bekers, behuizingen en deksels hebben één ding gemeen: ze zijn vanbinnen leeg, met wanden van gelijke dikte. Precies dat doet {{ui:editor.tool.hollow}}.

1. Selecteer het lichaam en klik op {{ui:editor.tool.hollow}}, of klik met de rechtermuisknop op het lichaam en kies het in het menu.
2. Stel de {{ui:shell.wall}} in.
3. Zet onder {{ui:shell.openings}} de zijden aan die open blijven: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} of {{ui:shell.side.right}}, zoveel als je wilt. {{ui:shell.side.front}} alleen maakt een sleuf voor een lade, {{ui:shell.side.left}} en {{ui:shell.side.right}} een tunnel. Staat er geen zijde aan, dan blijft het lichaam rondom dicht, met een holte in het midden. {{ui:shell.side.closed}} zet alle zijden in één klik uit. {{ui:shell.side.top}} staat al aan als het paneel opent; een klik erop sluit de bovenkant weer. Een lichaam dat rondom dicht is, ziet er van buiten onveranderd uit: de doorsnedeweergave toont de holte.
4. Bepaal of de {{ui:shell.edges}} {{ui:shell.edges.round}} of {{ui:shell.edges.sharp}} moeten zijn.
5. Klik op {{ui:shell.apply}}.

![Het uithollingspaneel met wanddikte, een schakelaar voor elke zijde die open blijft, en de binnenranden.](shot:hollow-panel)

De wanden groeien naar binnen. De buitenkant blijft zoals hij is.

De {{ui:shell.edges}} doen er alleen toe waar de binnenwanden uit elkaar gaan: bij een trede in het lichaam of rond een opening. De hoeken van de holte in een gewoon blok zijn altijd scherp, bij beide instellingen. Wil je een afgeronde binnenkant, rond dan eerst de buitenranden van het lichaam af (zie hierboven) en hol het daarna uit: de binnenkant volgt met de straal min de wanddikte. Kan de afgeronde binnenkant niet worden gebouwd, wat kan gebeuren bij een omtrek uit heel veel korte rechte stukjes zoals een overgetrokken tekening, dan bouwt layerling hetzelfde holle lichaam met scherpe binnenhoeken.

![Het resultaat: een schaal met een wand van 3 mm, aan de bovenkant open.](shot:hollow-result)

![Hetzelfde blok met alleen de voorkant open: een sleuf voor een lade.](shot:hollow-sides)

Voor elke open zijde heeft het lichaam aan die kant een plat vlak helemaal aan de rand nodig. Bollen en vrije vormen kun je daarom niet op deze manier uithollen. Is de wand te dik voor het lichaam, dan meldt layerling dat en vraagt om een dunnere. Een afgeronde doos waarvan ook de boven- en onderranden zijn afgerond, is zo'n geval: de wand moet duidelijk dunner zijn dan die afronding, of zet de afronding eerst op 0.

Een lichaam met een kamer, een blok met een gat dat niet helemaal doorloopt, gemaakt door een blok te groeperen met een opgetild gat, kun je ook uithollen, met de bovenkant open: de wanden rond de kamer worden ook uitgehold, zodat er tussen de buitenwand en de kamer een ring van holte blijft, aan de bovenkant open, en onder de bodem van de kamer een dunne holte ligt.

**Lichamen die in een punt eindigen,** zoals een kegel of een omgewentelde driehoek, hebben bovenaan geen plat vlak dat open kan blijven. Een volledig gesloten holte lukt daar ook niet, omdat een punt niet naar binnen verschoven kan worden: zelfs met een wand van 1 mm krijg je de melding dat de wanden niet zo dik kunnen zijn. Teken de wand in plaats daarvan in het profiel voordat je het omwentelt: dupliceer de omtrek, schaal de kopie gelijkmatig kleiner, zet hem midden in de grote omtrek en snijd de grote ermee uit, en wentel daarna het geheel om (hoofdstuk Schetsen, sectie Omwentelen). De afstand tussen de twee omtrekken is de wanddikte.

Verander je later de maat van een uitgehold lichaam, dan holt layerling het meteen opnieuw uit op de nieuwe maat. De wand blijft zo dik als je hebt gekozen, ook bij ronde lichamen. Een cilinder die je de ene kant verder uittrekt dan de andere wordt een ellips. Afrondingen en afschuiningen die je na het uithollen hebt aangebracht, komen daarna weer op dezelfde randen.

> **Tip:** Met een spuitmond van 0,4 mm is 1,2 tot 2 mm wand een goed begin: dun genoeg om materiaal te besparen, dik genoeg voor een stevig onderdeel.

## Lichamen verschuiven

Elk vlak van een lichaam kan over dezelfde afstand naar buiten of naar binnen worden verschoven. Dat is wat een pasvorm, een deksel of een klikverbinding nodig heeft: een spleet van 0,1 tot 0,3 mm rondom terwijl de onderdelen op hun plaats blijven, wat schalen niet kan.

1. Selecteer één lichaam en klik op {{ui:editor.tool.offset}}, of klik met de rechtermuisknop op het lichaam en kies het daar.
2. Kies {{ui:offset.grow}} of {{ui:offset.shrink}} en stel de {{ui:offset.distance}} in.
3. De {{ui:offset.edges}} bepalen de buitenhoeken: afgerond houdt het verschoven oppervlak daar rond, scherp laat de vlakken doorlopen tot ze elkaar raken.
4. Vink {{ui:offset.copy}} aan om het onderdeel te houden en het vergrote lichaam als kopie te krijgen die al een gat is. Groepeer dat gat met het tegenstuk en het snijdt precies de speling die je koos.
5. Klik op {{ui:offset.apply}}.

Zonder vinkje wordt het lichaam zelf verschoven. Het wordt een vast exact lichaam, zoals na een afschuining: de lijst bovenin het paneel neemt de offset terug en {{ui:edge.editAction}} opent het gereedschap opnieuw met de oude afstand. Alleen exacte CAD-lichamen kunnen worden verschoven - blokken, cilinders en de andere vormen, groepen daarvan, geïmporteerde STEP-onderdelen. Een lichaam dat alleen een driehoeksnet is, zoals veel STL-imports, lukt vaak niet. Een afstand die te groot is voor het lichaam, bijvoorbeeld verkleinen voorbij de dunste wand, wordt geweigerd.

## Vlakken verwijderen

Een afronding die in de weg zit, een gat op de verkeerde plek, een nok die je niet meer nodig hebt: {{ui:editor.tool.deleteFace}} haalt ze weer van het lichaam af, zonder dat je het opnieuw hoeft op te bouwen.

1. Selecteer het lichaam en klik op {{ui:editor.tool.deleteFace}}, of klik met de rechtermuisknop op het lichaam en kies het in het menu.
2. Klik op elk vlak van wat weg moet: de vlakken van een afgeronde rand, de wand van een gat, de zijkant en de bovenkant van een nok. Een gekozen vlak licht op; nog een klik haalt het er weer uit. Het venster telt de vlakken.
3. Klik op {{ui:deleteFace.apply}} of druk op [[Delete]]. [[Esc]] sluit het gereedschap zonder iets te veranderen.

De vlakken eromheen groeien tot de opening dicht is. Een blok met afgeronde bovenranden krijgt zijn scherpe randen terug, een gat is dicht, een nok is weg. Het lichaam blijft exact: je kunt het weer afronden en afschuinen, en de STEP-export houdt zijn echte vlakken. [[Ctrl]]+[[Z]] draait het verwijderen in één stap terug. Het staat ook onder {{ui:edge.featureHistory}} bij de afrondingen en afschuiningen, waar {{ui:edge.revertAction}} het terugdraait; {{ui:edge.editAction}} is er niet voor. Bij een groep wordt het resultaat één lichaam, zoals bij een randbewerking.

Kies alle vlakken van wat weg moet, en alleen die. Als de vlakken eromheen de opening niet kunnen sluiten, zegt layerling dat en verandert er niets: een hoofdzijde van een blok heeft bijvoorbeeld geen buurvlak dat zijn plaats kan innemen. Verwijder je alleen de bodem van een kamer, dan wordt het een gat dat er helemaal doorheen gaat, omdat de wanden van de kamer doorlopen tot de andere kant.

{{ui:editor.tool.deleteFace}} heeft exacte vlakken nodig: het werkt op onderdelen die als STEP zijn geïmporteerd en op de vormen van layerling. Wat layerling als mesh bewaart, heeft ze niet: een geïmporteerde STL, OBJ of 3MF, een gesplitst, om een cilinder gewikkeld of vereenvoudigd lichaam, of een heel gedetailleerde vorm zoals een lange tekst. Importeer een onderdeel als STEP als dat kan. Bij een gedetailleerd geïmporteerd onderdeel kunnen enkele vlakken te veel zijn voor de CAD-kernel: na 45 seconden wordt het verwijderen gestopt en verandert er niets. Een lichaam dat na een randbewerking met behouden randgrootte van grootte is veranderd, heeft op de nieuwe grootte geen exacte vlakken tot de grootteverandering is teruggedraaid.
