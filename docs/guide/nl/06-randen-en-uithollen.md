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

Het gereedschapsvenster staat rechtsboven. Bedekt het randen waarop je wilt klikken, sleep het dan aan de titelbalk weg; de volgende keer opent het daar ook, net als {{ui:editor.tool.hollow}} en {{ui:editor.tool.array}}. Dubbelklik op de titelbalk om het terug te zetten.

Kies je een vorm uit de vormenlijst terwijl het venster open is, dan sluit het zonder iets toe te passen, en de randen waarop je had geklikt worden vergeten. De klik plaatst dan de nieuwe vorm in plaats van randen te kiezen.

In het venster vind je:

- {{ui:edge.allSharpEdges}} selecteert alle randen tegelijk, {{ui:edge.clear}} maakt de selectie leeg.
- **{{ui:edge.radius}}** voor de afronding. Voor de afschuining stel je {{ui:edge.distance}} of {{ui:edge.angle}} in.
- {{ui:edge.variableRadius}} (alleen afronding) laat de straal langs één rand veranderen: klein aan het ene eind, groter aan het andere, gelijkmatig ertussen, zoals waar een rechte wand een schuine ontmoet. Klik één rand aan en stel dan {{ui:edge.radiusStart}} en {{ui:edge.radiusEnd}} in. Welk eind als begin telt, volgt uit hoe de rand gebouwd is; komt de grotere straal aan het verkeerde eind uit, dan draait {{ui:edge.swapEnds}} het om. Het werkt op één rand tegelijk, rond dus meerdere randen na elkaar af. {{ui:edge.editAction}} brengt beide waarden terug.
- {{ui:edge.concave}} (alleen afronding) keert de afronding om: in plaats van de rand af te ronden, snijdt hij er een holle kwartronde uit, zoals de ingekeepte hoeken van een doos. De holte is een cilinder met de gekozen {{ui:edge.radius}} die langs de rand ligt, dus het werkt bij elke hoek tussen de vlakken, maar alleen op rechte randen, en niet samen met {{ui:edge.variableRadius}}. {{ui:edge.editAction}} brengt hem terug.
- {{ui:edge.sharpThreshold}} bepaalt welke randen überhaupt als scherp gelden. Een waarde van 25° behandelt alleen duidelijke knikken als rand en laat vloeiende overgangen met rust.
- {{ui:edge.topEdges}} kiest alleen de randen langs de bovenkant van het lichaam. Dat is de snelle manier voor een koekjesvorm: bouw de omtrek in een schets als lijn, en schuin dan de bovenranden af. {{ui:edge.angle}} bepaalt hoe steil de afschuining is; die kan niet verder reiken dan de wand dik is.
- {{ui:edge.bottomEdges}} kiest alleen de randen helemaal onderaan het lichaam, het tegenstuk van {{ui:edge.topEdges}}. Zo rond je snel alleen de voet van een onderdeel af of geef je die een afschuining.
- {{ui:edge.chamfillet}}, bovenaan het afschuinvenster naast {{ui:editor.tool.chamfer}} gekozen, maakt de printbare voet van een onderdeel: een afschuining bij de plaat die tangentieel overgaat in een afronding naar de wand, zodat de eerste lagen geen steun nodig hebben en de rand toch zacht eindigt. {{ui:edge.distance}} is de hoogte die de voet inneemt, {{ui:edge.angle}} (15° tot 75°) de steilte van de afschuining bij de plaat. De randen kies je met {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} verbergt de randen die vanuit jouw kijkrichting achter het lichaam liggen. Standaard schijnt elke rand door het lichaam heen, wat bij een druk onderdeel verwarrend wordt; met de schakelaar aan zie je, en klik je, alleen de randen die naar je toe wijzen. Draai het beeld om bij de andere te komen. Een rand die rood getekend is (zie hieronder) is altijd zichtbaar.
- {{ui:edge.tangentChains}}: een klik kiest dan ook randen die vloeiend in elkaar overlopen, bijvoorbeeld alle randen rond een vlak met afgeronde hoeken. De schakelaar bepaalt alleen wat een klik kiest: de CAD-kernel zet een afschuining of afronding altijd door langs zulke vloeiend doorlopende randen. Het venster meldt langs hoeveel randen extra dat gebeurt.
- {{ui:edge.keepSize}} houdt de afschuining of afronding even groot, ook als je het lichaam later schaalt.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} of {{ui:edge.fine}}) bepaalt hoe fijn het voorbeeld wordt berekend. Voor lastige onderdelen is {{ui:edge.draft}} sneller.
- Het venster onthoudt zijn instellingen in deze browser, één set elk voor afschuinen, afronden en afschuinen met afronding: maat, hoek, drempel, kwaliteit van het voorbeeld en de schakelaars blijven zoals je ze liet na {{ui:edge.apply}}, na ongedaan maken en de volgende keer dat je het gereedschap opent. Een maat die het lichaam niet aankan, maakt plaats voor de maat die uit het lichaam volgt. Alleen {{ui:edge.tangentChains}} begint opnieuw: aan bij de eerste afschuining of afronding van een lichaam, daarna uit.

Terwijl je de maat aanpast, berekent layerling het voorbeeld opnieuw. Dat kan even duren. Je mag gewoon doorgaan met aanpassen; de laatste waarde die je kiest wordt berekend.

Is de maat te groot voor de rand, dan meldt layerling dat en stelt een kleinere waarde voor. Vaak volstaat een of twee millimeter minder. Bij scherpe hoeken heeft een afronding meer ruimte nodig dan zijn straal doet vermoeden. Op een klein scherm scrollt het venster vanzelf omlaag zodat de melding in beeld komt.

Mislukt een selectie die eerst werkte nadat je op nog een rand hebt geklikt, dan wordt die rand rood en breder getekend: dat is de rand die bij deze maat niet samen met de andere kan worden bewerkt. Klik er nog een keer op om hem eruit te halen, of maak de maat kleiner. Klik je meer randen aan terwijl de melding staat, dan blijft de eerste rood. Is er geen eerdere selectie die werkte, bij de allereerste klik of een maat die je net hebt verhoogd, dan worden de randen rood die ook op zichzelf mislukken, of allemaal als het alleen aan hun combinatie ligt. En waar de gekozen randen samenkomen in een scherpe binnenhoek, zoals twee schijven van een wolk, heeft een afronding bij geen enkele maat ruimte: dan rondt layerling die hoeken eerst af, met dezelfde of een kleinere maat, en de melding zegt hoeveel en met hoeveel (een afschuining schuint ze af).

Voordat het opgeeft, probeert layerling het nog een keer met de korte randen aan de uiteinden van de gekozen randen, hoogstens twee keer zo lang als de maat. Zo'n rand zit waar een eerdere afschuining eindigt op een wand die nog scherp is: een korte schuine rand in de hoek, en zolang die scherp blijft kan de hoek niet bewerkt worden. Helpt dat, dan zijn die randen daarna ook gekozen en zegt een melding hoeveel er zijn meegenomen.

Ook de rand onder de aanwijzer wordt breder getekend, zodat je ziet welke een klik zal kiezen.

Ook een gat neemt {{ui:editor.tool.chamfer}} en {{ui:editor.tool.fillet}} aan, net als {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} en {{ui:editor.tool.deleteFace}}: het blijft een gat en snijdt met zijn nieuwe vorm. Rond je de vier staande randen van een kubusvormig gat af, dan krijg je een kamer met ronde binnenhoeken, en een gat dat met {{ui:editor.tool.offset}} groter is gemaakt, snijdt met zoveel meer ruimte. De rand waar een gat het onderdeel raakt, bewerk je juist op de afgewerkte groep: die rand hoort bij haar.

### Een randbewerking terugdraaien

Een bewerkt lichaam kun je altijd opnieuw bewerken. Selecteer het weer en open het gereedschap; Afronden, Afschuinen en Uithollen tonen allemaal de lijst: onder {{ui:edge.featureHistory}} zie je wat er al op zit. {{ui:edge.revertAction}} draait één bewerking terug. Let op: liggen er nieuwere bewerkingen bovenop, dan gaan die mee, en het venster meldt hoeveel.

Naast een afschuining, een afronding of een uitholling staat ook {{ui:edge.editAction}}. Dat draait de bewerking op dezelfde manier terug, maar opent het gereedschap meteen opnieuw met dezelfde randen en de oude waarde. Je past de waarde aan en past hem opnieuw toe: een afronding van 3 mm wordt er een van 5 mm zonder dat je de randen nog eens hoeft aan te klikken. Liggen er nieuwere bewerkingen bovenop, dan gaan die ook hier mee. Dit geldt voor randbewerkingen die je vanaf nu maakt; oudere bieden alleen terugdraaien aan, net als losse onderdelen van een groep.

Bij een groep, bijvoorbeeld een cilinder met een gat, hoort de bewerkte rand bij het afgewerkte lichaam, niet bij een van zijn onderdelen. De groep wordt dus één lichaam. {{ui:editor.tool.ungroup}} werkt toch: het draait eerst de randbewerkingen terug en heft dan de groep op, in één stap die [[Ctrl]]+[[Z]] ongedaan maakt. Draai de bewerking terug zoals hierboven beschreven en de groep komt terug met al zijn onderdelen. Het makkelijkst is om randen als laatste te bewerken. Dat geldt ook voor schroefdraad: het randgereedschap neemt schroefdraad als exact lichaam, dus bij een blok met een draadgat erin worden de randen afgerond met de schroefdraad erin. De randen van schroefdraad uitrekenen duurt langer dan bij een gewone vorm: een paar seconden voor een M6 en ongeveer een halve minuut voor een G1/2-pijpdraad.

> **Goed om te weten:** layerling werkt voor afrondingen en afschuiningen met echte CAD-geometrie, niet alleen met een driehoeksmesh. Daarom is een afgeronde rand in de STEP-export nog steeds een afgeronde rand.

Een onderdeel dat als STEP is geïmporteerd houdt ook zijn CAD-geometrie: afschuiningen, afrondingen en uithollen werken op het lichaam uit het bestand, hoe fijn het onderdeel op het scherm ook getekend is. STL, OBJ en 3MF brengen alleen driehoeken mee, en een fijn getekend onderdeel kan te dicht zijn voor het randgereedschap. Is een onderdeel ook als STEP beschikbaar, importeer dat dan. {{ui:editor.tool.makeExact}} maakt van zo'n onderdeel eerst een exact lichaam met echte vlakken en cilinders, zie [Bestanden, opslaan en delen](chapter:bestanden-en-opslaan), "Een geïmporteerde mesh exact maken".

## Lichamen uithollen

Dozen, bekers, behuizingen en deksels hebben één ding gemeen: ze zijn vanbinnen leeg, met wanden van gelijke dikte. Precies dat doet {{ui:editor.tool.hollow}}.

1. Selecteer het lichaam en klik op {{ui:editor.tool.hollow}}, of klik met de rechtermuisknop op het lichaam en kies het in het menu.
2. Stel de {{ui:shell.wall}} in.
3. Zet onder {{ui:shell.openings}} de zijden aan die open blijven: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} of {{ui:shell.side.right}}, zoveel als je wilt. {{ui:shell.side.front}} alleen maakt een sleuf voor een lade, {{ui:shell.side.left}} en {{ui:shell.side.right}} een tunnel. Staat er geen zijde aan, dan blijft het lichaam rondom dicht, met een holte in het midden. {{ui:shell.side.closed}} zet alle zijden in één klik uit. {{ui:shell.side.top}} staat al aan als het venster opent; een klik erop sluit de bovenkant weer. Een lichaam dat rondom dicht is, ziet er van buiten onveranderd uit: de doorsnedeweergave toont de holte.
4. Bepaal of de {{ui:shell.edges}} {{ui:shell.edges.round}} of {{ui:shell.edges.sharp}} moeten zijn.
5. Klik op {{ui:shell.apply}}.

![Het uithollingsvenster met wanddikte, een schakelaar voor elke zijde die open blijft, en de binnenranden.](shot:hollow-panel)

De wanden groeien naar binnen. De buitenkant blijft zoals hij is.

De {{ui:shell.edges}} doen er alleen toe waar de binnenwanden uit elkaar gaan: bij een trede in het lichaam of rond een opening. De hoeken van de holte in een gewoon blok zijn altijd scherp, bij beide instellingen. Wil je een afgeronde binnenkant, rond dan eerst de buitenranden van het lichaam af (zie hierboven) en hol het daarna uit: de binnenkant volgt met de straal min de wanddikte. Kan de afgeronde binnenkant niet worden gebouwd, wat kan gebeuren bij een omtrek uit heel veel korte rechte stukjes zoals een overgetrokken tekening, dan bouwt layerling hetzelfde holle lichaam met scherpe binnenhoeken.

![Het resultaat: een schaal met een wand van 3 mm, aan de bovenkant open.](shot:hollow-result)

![Hetzelfde blok met alleen de voorkant open: een sleuf voor een lade.](shot:hollow-sides)

Voor elke open zijde heeft het lichaam aan die kant een plat vlak helemaal aan de rand nodig. Bollen en vrije vormen kun je daarom niet op deze manier uithollen. Is de wand te dik voor het lichaam, dan meldt layerling dat en vraagt om een dunnere. Een afgeronde doos waarvan ook de boven- en onderranden zijn afgerond, is zo'n geval: de wand moet duidelijk dunner zijn dan die afronding, of zet de afronding eerst op 0.

Een lichaam met een kamer, een blok met een gat dat niet helemaal doorloopt, gemaakt door een blok te groeperen met een opgetild gat, kun je ook uithollen, met de bovenkant open: de wanden rond de kamer worden ook uitgehold, zodat er tussen de buitenwand en de kamer een ring van holte blijft, aan de bovenkant open, en onder de bodem van de kamer een dunne holte ligt.

**Lichamen die in een punt eindigen,** zoals een kegel of een omgewentelde driehoek, hebben bovenaan geen plat vlak dat open kan blijven. Een volledig gesloten holte lukt daar ook niet, omdat een punt niet naar binnen verschoven kan worden: zelfs met een wand van 1 mm krijg je de melding dat de wanden niet zo dik kunnen zijn. Teken de wand in plaats daarvan in het profiel voordat je het omwentelt: dupliceer de omtrek, schaal de kopie gelijkmatig kleiner, zet hem midden in de grote omtrek en snijd de grote ermee uit, en wentel daarna het geheel om (hoofdstuk Schetsen, sectie Omwentelen). De afstand tussen de twee omtrekken is de wanddikte.

Verander je later de maat van een uitgehold lichaam, dan holt layerling het meteen opnieuw uit op de nieuwe maat. De wand blijft zo dik als je hebt gekozen, ook bij ronde lichamen. Een cilinder die je de ene kant verder uittrekt dan de andere wordt een ellips. Afrondingen en afschuiningen die je na het uithollen hebt aangebracht, komen daarna weer op dezelfde randen.

> **Tip:** Met een spuitmond van 0,4 mm is 1,2 tot 2 mm wand een goed begin: dun genoeg om materiaal te besparen, dik genoeg voor een stevig onderdeel.

## Een deksel voor een open vorm

{{ui:editor.tool.lid}} maakt het deksel voor een vorm die bovenaan open is: een doos die je met open bovenkant hebt uitgehold, een pot, een bakje. Selecteer de vorm en klik op {{ui:editor.tool.lid}}. In het venster kies je de soort:

- {{ui:lid.type.plug}}: een plaat zo groot als de vorm met eronder een lip die in de opening grijpt.
- {{ui:lid.type.cap}}: een plaat een wand breder dan de vorm met eronder een rand die om de buitenkant grijpt.
- {{ui:lid.type.both}}: een plaat een wand breder dan de vorm met allebei: een lip in de opening en een rand om de buitenkant. De wand van de vorm zit daartussen in een groef, zoals bij een vershouddoos.
- {{ui:lid.type.flat}}: alleen de plaat, om erop te leggen of te lijmen.

Daarna stel je de {{ui:lid.thickness}} in, de {{ui:lid.fit}} (de {{ui:lid.gap}} tussen deksel en vorm: 0,1 mm strak, 0,2 mm normaal, 0,3 mm ruim, of elke waarde tot 1 mm) en hoe diep de lip of rand naar beneden reikt en hoe dik de wand is. Klik op {{ui:lid.apply}}: het deksel ligt naast de vorm, omgedraaid met de plaat naar beneden, zodat het zonder support print. De vorm blijft zoals hij is. Het deksel volgt elke omtrek, rond of hoekig, omdat het vlak onder de rand van de vorm zelf wordt afgenomen. Een vorm zonder opening bovenaan krijgt alleen een plat deksel; hol hem voor de andere eerst uit met de bovenkant open.

> **Tip:** Hoe strak een deksel zit, hangt van de printer af. Print eerst een kleine doos met deksel; zit het te strak, neem dan de volgende ruimere passing.

Vink {{ui:lid.magnets}} aan en vier ronde magneten houden het deksel vast in plaats van een strakke passing. Kies een {{ui:lid.magnetSize}} (6 × 2, 8 × 3 of 10 × 3 mm) of stel zelf de {{ui:lid.magnetDiameter}} en {{ui:lid.magnetHeight}} in, en de {{ui:lid.magnetGap}}: 0,1 mm om de magneten erin te drukken, 0,2 tot 0,3 mm om ze te lijmen. Layerling snijdt een kuiltje in elke hoek van de rand van de vorm en een tegenover in de plaat van het deksel, iets dieper dan de magneet, zodat die nooit uitsteekt. Waar de wand te dun is voor een kuiltje, vult een pijler de hoek van de bodem tot de rand, en de lip van het deksel loopt eromheen. De vorm wordt gegroepeerd met zijn kuiltjes en pijlers: hef de groep op en je hebt hem terug zoals hij was. De plaat moet minstens zo dik zijn als de magneet hoog is plus 0,8 mm; zet je de magneten aan, dan wordt hij zo dik gemaakt.

Vink {{ui:lid.hinge}} aan en het deksel klapt open om een pen langs een rechte kant van het lichaam: de achterkant, of de kant die je kiest bij {{ui:lid.hingeSide}} (zoals in de beginweergave, waar de achterkant van je af wijst). Daar wisselen knokkels elkaar af, de buitenste aan het lichaam en die ertussen aan het deksel, met {{ui:lid.hingeGap}} ertussen, en door allemaal loopt een gat voor de pen: met een {{ui:lid.hingePin}} van 1,75 mm is een stuk filament de pen; vink {{ui:lid.hingePrintPin}} aan voor een dikkere die apart geprint wordt. In het deel van het scharnier aan het lichaam zit de pen klem, zodat een ingedrukt stuk filament blijft zitten; in dat van het deksel draait ze: {{ui:lid.hingePinPlay}} is daar haar ruimte aan elke kant, eerst 0,2 mm; geef meer als het deksel stroef draait. De knokkels van het lichaam staan op een schuinte van 45°, zodat het lichaam staand zonder steun print; die van het deksel liggen gelijk met de bovenkant, zodat het nog steeds omgekeerd print. {{ui:lid.hingeKnuckles}} op 0 geeft ongeveer één knokkel per 10 mm. Een scharnier gaat met een insteekdeksel of een plat deksel; een rand rondom zou bij het openklappen tegen de achterwand stoten. Aan een ronde kant, een pot of een buis, loopt het scharnier waar de wand binnen één knokkelstraal van de scharnierlijn blijft, en de knokkels van het lichaam staan op een klein blok dat tot in de wand reikt. {{ui:lid.hingeTeardrop}} (eerst aan) geeft de pengaten bovenaan een punt zoals elk deel geprint wordt, zodat ze niet doorzakken; een geprinte pen ligt op een klein plat vlak. Onder {{ui:lid.hingeStyle}} zet {{ui:lid.hingeStyle.flush}} de knokkels in de wand in plaats van erachter: de doos houdt zijn maat, elk deel is uitgespaard rond de knokkels van het andere, en het deksel gaat open tot ongeveer 140°. {{ui:lid.hingeStyle.pivot}} maakt een deksel dat op een kleine richel in de opening ligt en op twee pennen door de zijwanden draait, tot ongeveer 95°; ook dan houdt de doos zijn maat. Beide hebben een rechte kant nodig en gaan zonder magneten.

Bij een scharnier {{ui:lid.hingeStyle.flush}} vink je {{ui:lid.hingeEndPlugs}} aan om het pengat aan beide uiteinden af te sluiten: zo blijft de pen verborgen en kan hij er niet uit schuiven. De laatste 4 mm van het gat zijn dan aan elk uiteinde vierkant, op een hoek gezet zodat ze ook bovenaan een punt hebben en bij het printen niet doorzakken, en net groot genoeg om de pen door te laten: schuif eerst de pen erin en druk dan in elk uiteinde een plug. De vierkante pluggen kunnen niet draaien en zitten even vast als de pen in het lichaam; elke plug is gelijk met de buitenkant van de doos afgesneden, ook bij afgeronde hoeken (bij zo'n doos loopt het scharnier dan door tot in de hoeken). Ze liggen naast het deksel, op een platte kant. De pen wordt er korter door, en de statusbalk zegt hoe lang.

> **Tip:** Druk eerst de magneten in de vorm. Zet dan op elk ervan nog een magneet, die daar goed om vastklikt, en druk het deksel erop (met een druppel lijm in de kuiltjes als ze los zitten): zo komt elke magneet tegenover zijn partner in het deksel, en trekken ze elkaar aan.

Vink {{ui:lid.clickBumps}} aan en het deksel klikt vast: kleine ronde nokjes aan de buitenkant van de lip (bij een deksel eroverheen aan de binnenkant van de rand) klikken in kuiltjes die Layerling op dezelfde plekken in de wand van de vorm snijdt, één in het midden van elke rechte kant van 12 mm of meer, twee op een kant van meer dan 80 mm, vier rond een ronde opening en geen aan de kant van het scharnier. {{ui:lid.clickBumpHeight}} is hoe ver elk nokje in de wand grijpt, eerst 0,4 mm: minder voor een kleine doos of een stugge lip, meer voor een stevigere klik. Onder {{ui:lid.handle}} geeft {{ui:lid.handle.tab}} de plaat een lipje zo dik als de plaat dat 6 mm voorbij de voorrand steekt (of de rand tegenover het scharnier), zodat het deksel nog steeds omgedraaid print, en {{ui:lid.handle.notch}} snijdt net onder de rand van het deksel een uitsparing voor een vinger in de voorwand van de vorm, waarbij altijd 0,8 mm wand blijft staan; geen van beide gaat met een draaideksel, en de nokjes ook niet met een plat deksel.

## Een kabelkanaal door een vorm

{{ui:editor.tool.cableChannel}} maakt een ronde gang door een vorm voor een kabel of een LED-draad, van waar hij erin gaat tot waar hij eruit komt, en zoekt de weg zelf. Selecteer de vorm en klik op {{ui:editor.tool.cableChannel}}, klik dan op de vorm waar de kabel erin gaat ({{ui:cable.entry}}) en waar hij eruit komt ({{ui:cable.exit}}). De weg begint en eindigt recht, loodrecht op het oppervlak, loopt recht waar het kan en buigt waar het moet, nooit krapper dan {{ui:cable.minBend}}, en blijft zo ver van de buitenkant als het kan, nooit dichter dan {{ui:cable.minWall}}. Een kabel laat zich door een bocht van ongeveer vijf keer zijn diameter duwen; {{ui:cable.diameter}} is die van het kanaal.

Zolang het paneel open is, kijk je door de vorm heen, met het kanaal erin en een merkteken aan elk eind. Het paneel zegt hoe lang het kanaal is, hoe krap de krapste bocht en hoe dun de dunste wand, in rood als een bocht of de wand kleiner moest dan gevraagd; dan helpt een kleinere waarde bij {{ui:cable.minBend}} of een andere in- of uitgang. {{ui:cable.pickAgain}} verplaatst een eind. {{ui:cable.apply}} snijdt het kanaal in: het wordt een {{ui:shape.bentTube}} als gat, gegroepeerd met de vorm, die dus exact blijft, en na het opheffen van de groep is de buis nog te wijzigen. Een gebogen buis heeft hoogstens elf bochten; een weg die meer nodig heeft, vraagt om een andere in- of uitgang.

## Lichamen verschuiven

Elk vlak van een lichaam kan over dezelfde afstand naar buiten of naar binnen worden verschoven. Dat is wat een pasvorm, een deksel of een klikverbinding nodig heeft: een spleet van 0,1 tot 0,3 mm rondom terwijl de onderdelen op hun plaats blijven, wat schalen niet kan.

1. Selecteer één lichaam en klik op {{ui:editor.tool.offset}}, of klik met de rechtermuisknop op het lichaam en kies het daar.
2. Kies {{ui:offset.grow}} of {{ui:offset.shrink}} en stel de {{ui:offset.distance}} in.
3. De {{ui:offset.edges}} bepalen de buitenhoeken: afgerond houdt het verschoven oppervlak daar rond, scherp laat de vlakken doorlopen tot ze elkaar raken.
4. Vink {{ui:offset.copy}} aan om het onderdeel te houden en het vergrote lichaam als kopie te krijgen die al een gat is. Groepeer dat gat met het tegenstuk en het snijdt precies de speling die je koos.
5. Klik op {{ui:offset.apply}}.

Vink {{ui:offset.sideways}} aan als alleen de omtrek moet groeien of krimpen: de zijkanten schuiven de afstand op, terwijl elke vlakke boven- en onderkant op zijn hoogte blijft. Een bord krijgt rondom een rand, een sokkel wordt breder en het lichaam wordt niet hoger. Bij een getrapt lichaam houdt elke trede zijn eigen hoogte. Een tekst die via zijn omtrekken wordt verschoven, houdt dan ook zijn hoogte.

Zonder vinkje wordt het lichaam zelf verschoven. Het wordt een vast exact lichaam, zoals na een afschuining: de lijst bovenin het venster neemt de offset terug en {{ui:edge.editAction}} opent het gereedschap opnieuw met de oude afstand. Alleen exacte CAD-lichamen kunnen worden verschoven - blokken, cilinders en de andere vormen, groepen daarvan, geïmporteerde STEP-onderdelen. Een lichaam dat alleen een driehoeksnet is, zoals veel STL-imports, lukt vaak niet. Een afstand die te groot is voor het lichaam, bijvoorbeeld verkleinen voorbij de dunste wand, wordt geweigerd.

Een tekst waarvan de kern de letters niet als lichaam kan verschuiven - in sommige lettertypen een A, B, M, N, W of 9 - wordt in plaats daarvan via zijn omtrekken verschoven: hij krijgt de vulling {{ui:prop.textWider}} met de afstand (smaller als hij krimpt) en groeit evenveel aan de boven- en onderkant. Hij blijft een tekst die je verder kunt bewerken. Dit werkt voor een tekst met gevulde letters en zonder afronding; een tekst die al een vulmodus heeft, wordt zoals eerder geweigerd.

## Vlakken verwijderen

Een afronding die in de weg zit, een gat op de verkeerde plek, een nok die je niet meer nodig hebt: {{ui:editor.tool.deleteFace}} haalt ze weer van het lichaam af, zonder dat je het opnieuw hoeft op te bouwen.

1. Selecteer het lichaam en klik op {{ui:editor.tool.deleteFace}}, of klik met de rechtermuisknop op het lichaam en kies het in het menu.
2. Klik op elk vlak van wat weg moet: de vlakken van een afgeronde rand, de wand van een gat, de zijkant en de bovenkant van een nok. Een gekozen vlak licht op; nog een klik haalt het er weer uit. Het venster telt de vlakken.
3. Klik op {{ui:deleteFace.apply}} of druk op [[Delete]]. [[Esc]] sluit het gereedschap zonder iets te veranderen.

De vlakken eromheen groeien tot de opening dicht is. Een blok met afgeronde bovenranden krijgt zijn scherpe randen terug, een gat is dicht, een nok is weg. Het lichaam blijft exact: je kunt het weer afronden en afschuinen, en de STEP-export houdt zijn echte vlakken. [[Ctrl]]+[[Z]] draait het verwijderen in één stap terug. Het staat ook onder {{ui:edge.featureHistory}} bij de afrondingen en afschuiningen, waar {{ui:edge.revertAction}} het terugdraait; {{ui:edge.editAction}} is er niet voor. Bij een groep wordt het resultaat één lichaam, zoals bij een randbewerking.

Kies alle vlakken van wat weg moet, en alleen die. Als de vlakken eromheen de opening niet kunnen sluiten, zegt layerling dat en verandert er niets: een hoofdzijde van een blok heeft bijvoorbeeld geen buurvlak dat zijn plaats kan innemen. Verwijder je alleen de bodem van een kamer, dan wordt het een gat dat er helemaal doorheen gaat, omdat de wanden van de kamer doorlopen tot de andere kant.

{{ui:editor.tool.deleteFace}} heeft exacte vlakken nodig: het werkt op onderdelen die als STEP zijn geïmporteerd en op de vormen van layerling. Wat layerling als mesh bewaart, heeft ze niet: een geïmporteerde STL, OBJ of 3MF, een gesplitst, om een cilinder gewikkeld of vereenvoudigd lichaam, of een heel gedetailleerde vorm zoals een lange tekst. Importeer een onderdeel als STEP als dat kan. Bij een gedetailleerd geïmporteerd onderdeel kunnen enkele vlakken te veel zijn voor de CAD-kernel: na 45 seconden wordt het verwijderen gestopt en verandert er niets. Een lichaam dat na een randbewerking met behouden randgrootte van grootte is veranderd, heeft op de nieuwe grootte geen exacte vlakken tot de grootteverandering is teruggedraaid.

Een geïmporteerde mesh die met {{ui:editor.tool.makeExact}} exact is gemaakt, kan haardunne vlakken houden waar de driehoeken van het bestand slecht waren, tussen vlakken die in één plat vlak liggen, zodat een kant uitkomt als stroken die niet los te verwijderen zijn. Zo'n dun vlak, te smal om aan te klikken, gaat mee met een gekozen vlak als het dat raakt en naar een volgend vlak leidt dat in het platte vlak van het gekozen vlak ligt, samen met de dunne vlakken die eraan vastzitten en die ook een vlak in het platte vlak van het gekozen vlak raken; het venster telt ze als meegenomen.
