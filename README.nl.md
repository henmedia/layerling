<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="layerling-logo">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">Eenvoudige 3D-CAD voor 3D-printen</h3>
        <p align="right">
          Zet een vorm neer, snijd er een gat in, rond een rand af, print het. In je browser, zonder account en zonder CAD-ervaring.
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="GNU AGPLv3-licentie" src="https://img.shields.io/badge/license-AGPLv3-663399"></a>
    <img alt="Geen account nodig" src="https://img.shields.io/badge/no%20account-nothing%20to%20sign%20up%20for-dd7906">
    <img alt="Gemaakt voor 3D-printen" src="https://img.shields.io/badge/made%20for-3D%20printing-ff9e2c">
    <a href="#layerling-mcp-skill"><img alt="Door AI te besturen" src="https://img.shields.io/badge/AI--drivable-MCP%20server-16c0d4"></a>
  </p>

  <p><a href="README.md">English</a> · <a href="README.de.md">Deutsch</a> · <strong>Nederlands</strong> · <a href="README.ar.md">العربية</a> · <a href="README.zh-cn.md">简体中文</a> · <a href="README.zh-tw.md">繁體中文</a></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-en.png" width="763" alt="layerling in de browser">
</p>

<p align="center"><em>layerling in de browser</em></p>

<p align="center"><a href="https://layerling.com/handleiding/index.html"><strong>Handleiding</strong></a>, stap voor stap en met afbeeldingen</p>

## Voor wie is het

Je hebt een 3D-printer. Je wilt een onderdeel dat ergens op past, geen carrière in CAD.

layerling werkt zoals je al denkt: zet een vorm op het printbed, trek hem op maat, maak van een tweede vorm een gat, groepeer de twee, exporteer, print. Er valt niets te leren voordat je begint en **je hoeft je nergens aan te melden** – open de pagina en ga bouwen. Je ontwerpen blijven in je eigen browser: geen account, geen cloud, er wordt niets geüpload.

### Kom je van Tinkercad?

layerling zit een stap verder dan Tinkercad, richting Fusion 360: het werkt op dezelfde manier, dus je herkent alles – het printbed, de vormen, solids en gaten, groeperen en degroeperen, bundelen, met Alt slepen voor een kopie – maar het houdt niet op waar Tinkercad ophoudt. Wat je daar miste, ligt hier voor je klaar:

- **Afschuining en afronding.** Kies een rand en schuin hem af of rond hem af – het ding waar mensen het vaakst om vragen zodra een geprint onderdeel er af moet uitzien of ergens in moet passen. Bewerkte randen blijven aanpasbaar: haal een bewerking weer weg of klik op Bewerken om de waarde op dezelfde randen te veranderen.
- **Uithollen, splitsen, schetsen, schroefdraad.** Hol een lichaam uit tot een gelijkmatige wand, splits het met een vlak, teken schetsen met exacte lengtes en hoeken en extrudeer of draai ze rond (revolve), en voeg schroeven, moeren en getapte gaten toe.
- **Patronen en omwikkelen.** Herhaal een vorm in een rij, cirkel of spiraal, of wikkel een patroon of tekst om een cilinder.
- **Gatenpatronen.** Klik op een vlak oppervlak en verdeel er ronde, vierkante, rechthoekige, zeshoekige of slobgaten over, in een raster of verspringend, met tussenafstand, marge en diepte - ventilatieroosters, luidsprekerroosters en mandjes in één stap.
- **Schalen in procenten.** Maak een of meer onderdelen een percentage groter of kleiner - samen, zodat de opstelling meegroeit, of elk op zijn eigen plek.
- **Meten en naar binnen kijken.** Meetlint, linialen, een doorsnede die het model openknipt, en een geschiedenisschuif om terug te kijken naar eerdere toestanden.
- **Echte geometrie eronder.** layerling bewaart exacte CAD-vormen, niet alleen een mesh, dus een afgeronde rand blijft een afgeronde rand – helemaal tot in een STEP-bestand voor een volwaardig CAD-programma.

Het is geen volledig CAD-pakket: er is geen parametrische tijdlijn en er zijn geen assemblies. En je kunt het **zelf draaien**: installeer het als app (dan start het ook zonder internet), of host je eigen kopie op Windows, een NAS of een thuisserver – zie [Aan de slag](#aan-de-slag).

> **Een AI kan met je meebouwen.** layerling heeft een MCP-server aan boord. Een AI-client zoals Codex of Claude ziet een
> open editortabblad en werkt daarin: vormen toevoegen, maten aanpassen, groeperen, snijden, randen afronden, de scène
> uitlezen, afbeeldingen van de weergave maken. Jij beschrijft het onderdeel, de AI bouwt het, jij kijkt mee en grijpt in
> wanneer je wilt. Dit draait lokaal, er verlaat niets de browser – zie [layerling MCP Skill](#layerling-mcp-skill) voor
> de installatie.

## Wat het kan

### Bouwen

- **Een echt printbed** – raster, snappen, handgrepen om te verplaatsen, van formaat te veranderen en te draaien, en een paneel met de exacte getallen als je die nodig hebt.
- **Positie intypen** – de kaart Positie zet een lichaam op een exacte X, Y en Z, en onderdelen kun je naast het printbed parkeren, zoals in Tinkercad.
- **Aspijlen** – rode, groene en blauwe pijlen op de linkervoorhoek van het printbed tonen X, Y en Z zoals de getallen tellen, net als in Bambu Studio en OrcaSlicer; ze zijn uit te zetten in de instellingen.
- **Een draaipunt dat blijft** – stel een draaipunt in voor een lichaam en het blijft bij dat lichaam: het beweegt, draait en schaalt mee, wordt opgeslagen en kan als X, Y en Z worden ingetypt of met de muis worden versleept, waarbij het snapt op hoeken en randmiddens - voor scharnieren en verbindingen.
- **Licht en schaduw naar smaak** – contrast van de schaduwwerking, sterkte en zachtheid van de schaduwen, en richting en hoogte van het licht, tot recht van boven zoals in Tinkercad, allemaal in de instellingen. Een knop "Tinkercad-look" zet kleuren, raster en licht in één keer zoals daar, en de donkere rasterlijnen kunnen elke centimeter komen, in een eigen kleur.
- **Snelle modus** – voor langzamere computers: één schakelaar in de instellingen zet schaduwen, randlijnen en het nadraaien van de camera uit en tekent de weergave op schermresolutie; het nadraaien van de camera kun je ook los uitzetten, zodat de weergave stopt zodra je loslaat.
- **Vlakken uitlijnen en de hoeken zien** – het gereedschap Vlakken uitlijnen brengt een vlak van het ene onderdeel tegen een vlak van een ander, rakend of gelijk, eventueel met een tussenruimte; een gedraaid lichaam toont zijn hoeken om X, Y en Z onder de selectie, en de kaart Rotatie in zijn instellingen neemt ze als getallen.
- **Snappen op andere vormen** – tijdens het verplaatsen klikt een vorm met zijn randen of midden vast op de randen en middens van de vormen eromheen, met een hulplijn, zodat onderdelen precies aansluiten zonder getallen te typen. Alt tijdens het slepen zet dat even uit; Shift houdt de beweging op één as, en Alt vanaf het begin ingedrukt sleept een kopie, zoals in Tinkercad.
- **Neerzetten op vlakken** – zoals Cruise in Tinkercad: een nieuwe vorm gaat liggen op het vlak onder de aanwijzer, ook op schuine vlakken, en C pakt de selectie op en zet die op dezelfde manier op een ander vlak neer.
- **Referentiepunten** – klik met rechts op een lichaam om het midden, de hoeken of de randmiddens te markeren met punten die niet geprint worden en waarop gesleepte vormen snappen; sleep een punt of typ de coördinaten in, en de markeringen worden met het ontwerp opgeslagen. Het meetlint kan het midden van een meting markeren, bijvoorbeeld het middelpunt van een rond gat.
- **Commando's zoeken** – druk op Ctrl+K en typ een gereedschap, een vorm of een commando ("fillet", "mirror", "cylinder") om er direct naartoe te springen; het begrijpt Engelse en Duitse woorden en toont de sneltoetsen naast elk item.
- **Geschiedenisweergave** – kijk met een schuif terug naar elke eerdere toestand van het project, zonder iets te veranderen; exporteer die toestand of begin er een nieuw project mee. Door @rmpel.
- **Millimeters of inches** – met Imperial-eenheden wordt elke maat in inches getoond, als breuken zoals in Tinkercad (1 5/8) of als decimalen, het snapraster gaat in stappen van 1/64 tot 1 inch, en het raster van het printbed wordt in inches getekend.
- **Het printbed van jouw printer** – kies een van meer dan 220 gangbare printers en het printbed krijgt het bijbehorende formaat. De naam en het bouwvolume staan in de hoek van het werkvlak (een schakelaar in de instellingen verbergt dit en de naam van het ontwerp), en er verschijnt een waarschuwing als een lichaam over de rand uitsteekt.
- **Overhangen en filament** – "Overhangen tonen" arceert elk vlak dat steiler is dan 45° (of de eigen hoek van je printer) en dus support nodig zou hebben, en het exportvenster toont volume, gewicht en meters filament voordat je gaat slicen.
- **Vormenbibliotheek** – blokken, cilinders, capsules (eventueel met één kleiner uiteinde, bijvoorbeeld voor een riembeschermer), bollen, kegels, piramides, wiggen, tekst, daken, halve bollen, torussen, buizen, lofts van de ene omtrek naar de andere (bijvoorbeeld van vierkant naar rond, massief of met een wand, recht of vloeiend uitlopend, gedraaid of met een schuine bovenkant), veelhoekige prisma's van drie tot vierentwintig zijden, spiraalveren, een print-in-place-scharnier, Gridfinity-bakken en -draagplaten, gekartelde grepen (recht, gekruist of rond) en meer.
- **Schroefdraad die past** – draadstangen, schroeven met inbus-, verzonken of zeskantkop, zeskantmoeren en getapte gaten. M2 tot M12, UNC/UNF van #4 tot één inch en de Whitworth-pijpdraden G1/16 tot G4 (ISO 228-1) zijn één klik verwijderd, of stel zelf diameter en spoed in, ook linksdraaiend; bij een inch- of G-maat vraagt het veld om gangen per inch in plaats van millimeters. De uiteinden kunnen een afschuining krijgen, en een getapt gat is een snijvorm: zet het in een onderdeel, groepeer, en het gat komt er met schroefdraad uit.
- **Tandwielen die in elkaar grijpen** – rechte, schuine, visgraat- en kegeltandwielen, binnentandwielen en tandheugels met evolvente tanden, ingesteld met module en aantal tanden zoals in een tandwielgenerator, met drukhoek en speling voor het printen - of met ronde tanden, vergevingsgezind bij kleine geprinte tandwielen en een prettige grip op knoppen. Selecteer twee tandwielen en het paneel geeft de hartafstand waarop ze in elkaar grijpen.
- **Solids en gaten** – maak van vormen snijvormen en groepeer ze tot de uiteindelijke geometrie. Groep bewerken (**E**) legt de onderdelen van een groep los om ze aan te passen en bouwt hem opnieuw op met Klaar – ook een groep binnen een groep, zo diep als het ontwerp gaat.
- **Meerkleurige groepen** – een groep kan elk onderdeel in zijn eigen kleur tonen, ook nadat er gaten in zijn gesneden, en een 3MF- of OBJ-export behoudt die kleuren, zodat de slicer de onderdelen aan filamenten kan koppelen.
- **Bundelen** – Ctrl+B houdt onderdelen bij elkaar zoals de bundel in Tinkercad: ze bewegen, draaien en schalen als één geheel, maar houden hun kleuren en blijven in de export aparte lichamen – handig voor meerkleurige prints.
- **Doorsnijding** – houd alleen over wat twee of meer geselecteerde solids gemeen hebben, of waar solids en gaten elkaar overlappen.
- **Splitsen** – snijd solids of gaten in tweeën met een vlak; een uitgehold lichaam behoudt zijn holte. Draai het vlak voor een schuine snede, sleep aan de pijl, of leg het met "Vlak kiezen" op een willekeurig vlak.

### Verfijnen

- **Afschuining en afronding** – schuin elke rand van een solid af of rond hem af, en haal de bewerking later weer weg of pas hem aan.
- **Schetsen** – teken omtrekken met lijnen, curves en kant-en-klare vormen, zet lijnen al tijdens het tekenen op lengte en hoek ("50<30", Shift snapt in stappen van 15°), typ lengtes, hoeken en maten in (sommen zoals "60+12.5" werken in elk getalveld), rond hoeken af of schuin ze af, snap op de omtrekken van andere lichamen, teken hulplijnen om op te snappen, en extrudeer of draai ze rond tot exacte lichamen. Rondgedraaid met een spoed windt de omtrek zich op als één doorlopende schroefvormige streng in plaats van ringen, zoals filament op een spoel. Een schets kan ook als lijn worden opgebouwd: een gesloten omtrek wordt een kader, binnen, buiten of gecentreerd op de lijn, en een open lijn een strook met platte, vierkante of ronde uiteinden.
- **Uithollen** – maak van een lichaam wanden van één dikte, open aan de zijden die je kiest (boven, onder, voor, achter, links, rechts, in elke combinatie) of gesloten – voor doosjes, bekers en behuizingen.
- **Vlak verwijderen** – klik op de vlakken van een afronding, een gat of een nok en verwijder ze: de vlakken eromheen groeien en sluiten de opening, en het lichaam blijft exact voor meer afrondingen en de STEP-export.
- **Eigen vormen** – zet lichamen die je steeds weer nodig hebt bovenaan in de vormenbibliotheek en voeg ze met een klik of door te slepen in elk ontwerp in; in de browser, of met de gedeelde opslag op de server voor elk apparaat. "Alles back-uppen" neemt ze mee.
- **Gatenpatroon** – perforeer een vlak oppervlak van een lichaam: kies het vlak, kies ronde, vierkante, rechthoekige, zeshoekige of slobgaten, stel maat, tussenafstand, raster of verspringend, de marge tot de rand en de diepte (door het hele onderdeel of tot een vaste diepte) in, en zie de gaten als voorbeeld voordat je ze maakt. Het blijven gewone gaten, gegroepeerd met het lichaam, dus degroeperen maakt ze weer los.
- **Om een cilinder wikkelen** – leg een SVG-patroon, een logo of belettering op de wand van een beker of buis, verhoogd of gegraveerd, en centreer het op de cilinder.

### Bestanden

- **Je eigen lettertypen** – gebruik elk TrueType-, OpenType- of WOFF-lettertype voor tekst, of in Chrome en Edge een lettertype dat op de computer is geïnstalleerd. Een ontwerp bewaart alleen de omtrekken van de letters die het gebruikt, dus het opent overal. Arabisch en Hebreeuws lopen van rechts naar links, Arabische letters worden aan elkaar geschreven.
- **Je eigen modellen meebrengen** – importeer STL, OBJ, 3MF, STEP, SVG of DXF en bouw eromheen. Een DXF-onderdeelcontour, zoals een lasersnijbedrijf of leverancier die stuurt, komt binnen als lichaam met de gaten als eigen gaten, bogen en cirkels blijven echt. Een SVG komt binnen als schetslichaam: een vlak, een lijn aan de buiten- of binnenkant van de lijnen, een silhouet zonder gaten, of de tekening rondom verbreed - samen een koekjesvorm uit één bestand, of de lagen van een meerkleurig logo. De vorm Tekst heeft dezelfde vulmodi, en de vormenbibliotheek heeft een naamplaatje: een tekst in gekleurde lagen voor een meerkleurige print, eventueel met een gat voor een sleutelring en een afgeronde of afgeschuinde rand op de letters, en een icoonplaatje: een SVG-icoon in dezelfde gekleurde lagen, met een aantal en "zoveel als er passen" om een printbed te vullen. Een gekleurde OBJ – uit layerling, of uit Tinkercad als ZIP met de bijbehorende `.mtl` – of een gekleurde 3MF, slicerprojecten inbegrepen, komt binnen als één lichaam per kleur, en een 3MF met meerdere objecten als één lichaam per object.
- **Exporteren wat je slicer wil** – STL, 3MF met namen en kleuren, of OBJ met kleuren, voor de selectie of de hele scène (verborgen onderdelen blijven buiten), plus STEP als het ontwerp verder moet naar een volwaardig CAD-programma, en het bovenaanzicht als SVG of als DXF met echte bogen en cirkels voor een lasersnijder. PNG slaat een strakke afbeelding van de weergave op, op dubbele resolutie en desgewenst met een transparante achtergrond.
- **Tekening exporteren** – selecteer een onderdeel, of hef de selectie op voor het hele zichtbare ontwerp, en kies **Exporteren → Tekening → PDF of SVG**. Maakt een voor-, boven- en rechterzijaanzicht in Europese projectie op een technisch tekenblad met rand, zonenummers en een titelblok rechtsonder, met buitenmaten, verborgen randen en tabellen met diameter en positie van ronde boringen evenwijdig aan de assen. De aanzichten zijn 1:1 in millimeters; het blad is het kleinste ISO-formaat liggend waar het op past (of een groter afwijkend formaat). Print op **100% / werkelijke grootte**. Posities worden gemeten vanaf de linkeronderhoek van elk aanzicht. De gatentabellen gebruiken de nominale maten van de mesh en bematen schuine of niet-ronde gaten, schroefdraad, diepten en toleranties niet automatisch. De projectie is overgenomen uit het tekenwerk van [Cadverix-3D](https://github.com/WC3D/Cadverix-3D).
- **Updatemelding** – in het gepubliceerde programma merkt een open pagina zelf een nieuwe versie op en biedt aan om op te slaan en te herladen, met een lijst van wat er nieuw is.
- **Projecten als bestanden** – sla een heel project op, inclusief geschiedenis, schetsen en groepen, als `.lyl`-bestand en werk ergens anders verder. In Chrome en Edge kies je zelf de map en slaat Ctrl+S weer op in datzelfde bestand; andere browsers downloaden het. Oudere `.skf`-bestanden uit eerdere versies openen nog steeds; bij opslaan wordt er dan een `.lyl` naast gezet.
- **Bugrapport** – één link in de voettekst slaat een ZIP op met het ontwerp als `.lyl` en een tekst met de versie, browser en laatste meldingen, klaar om bij te voegen op het forum of op GitHub, die een losse `.lyl` weigeren.
- **Ontwerpen die je herkent** – alles staat in je eigen browser, elk ontwerp met een miniatuur.

### Weergave

- **Perspectief of recht van voren** – wissel tussen de normale weergave en een vlakke, orthografische weergave met de kubusknop naast de zoomknoppen, of door op **O** te drukken. Je kijkrichting en uitsnede blijven behouden.
- **De weergave draaien aan de kubus** – slepen aan de weergavekubus draait de weergave zoals de rechtermuisknop, op een tablet met één vinger; een klik springt nog steeds naar die zijde, en een klik op een hoek of rand kijkt vanaf daar. Toetsen **1**–**6** springen ook, en **Shift+1**–**6** zoomen daarbij in op de selectie.
- **Vier opgeslagen weergaven per ontwerp** – **Shift+7**, **8**, **9** of **0** slaat de weergave precies op zoals ze is (hoek, positie, zoom), en de toets alleen brengt haar terug. Elk ontwerp heeft zijn eigen, en een opgeslagen `.lyl`-bestand neemt ze mee.
- **De richtingskubus in elke hoek** – Instellingen > Weergave > **Positie van de richtingskubus** zet de kubus linksboven, rechtsboven, linksonder of rechtsonder; in elke hoek behalve linksboven schuift de camerabediening omhoog naar zijn plek.
- **Van onderen kijken** – het oog boven een raster in de camerabalk verbergt het printbed, zodat je de onderkant van een ontwerp kunt zien zonder dat het in de weg zit.
- **Een tweede weergave in een eigen venster** – een knop in de camerabalk opent een tweede venster dat hetzelfde ontwerp door een eigen camera toont, met een eigen weergavekubus en camerabalk, en volgt elke wijziging. Het opent waar je het het laatst liet.
- **Panelen waar jij ze wilt** – de objectenlijst, de instellingen, de doorsnede, het meetlint en de gereedschapspanelen voor randen, uithollen en patronen verplaats je aan hun titelbalk en openen daar weer; dubbelklikken dockt ze.
- **Rechtsklikmenu** – een korte rechtsklik op een lichaam toont de meestgebruikte commando's: dupliceren, gat of solid, groeperen, afschuining, afronding en uithollen voor één lichaam, spiegelen en schalen in procenten, verbergen, vergrendelen, op het werkvlak laten vallen, verwijderen. Slepen met de rechtermuisknop draait nog steeds de weergave.
- **Doorsnede** – knip de weergave open langs een vlak dwars op X, Y of Z om wanden, holtes en in elkaar passende onderdelen te bekijken, met een grove en een fijne schuif. Alleen de weergave wordt doorgesneden: het ontwerp en elke export blijven heel. "Doorsnede als SVG" slaat de snede zelf op schaal 1:1 op, voor een laser of een mal, en "Meten" leest wanddikte en spleten direct op de snede af, haaks op de wand gesnapt.
- **Werkvlak op elk vlak** – druk op W en klik op een vlak om erop te bouwen; een klik bij een hoek zet het precies op de hoek, bij een rand op de rand met het raster erlangs, en op het lege printbed waar je klikt. Een oog verbergt het vlak voor vrij zicht, terwijl het wel van kracht blijft. Ook een AI kan het op een vlak zetten.
- **Op een tablet** – één vinger bewerkt het ontwerp, precies zoals de linkermuisknop: tik om te selecteren, sleep om te verplaatsen, sleep op een lege plek voor een selectiekader. **Twee vingers zijn voor de weergave**: spreid of knijp ze om te zoomen, beweeg ze samen om het werkvlak te verschuiven. Zet je een tweede vinger neer, dan wordt teruggedraaid wat de eerste was begonnen, dus een knijpgebaar verschuift nooit per ongeluk een onderdeel. Draaien van de weergave heeft geen eigen gebaar; de camerabalk heeft daarvoor een schakelaar, die alleen op een touchscreen verschijnt, en zolang die aan staat draait één vinger de weergave in plaats van te selecteren. Getalvelden geven bij een tik hun hele waarde vrij, klaar om te overschrijven – een numeriek toetsenbord heeft geen pijltjestoetsen om de cursor mee te verplaatsen. Een vinger reikt iets verder naar schetspunten, lijnen, grepen, meetpunten en randen dan een muis, maar **op een tablet is een stylus het betere gereedschap**: fijner, en hij bedekt niet wat je wilt raken.

### Video's

Gemaakt door anderen, niet door dit project:

<!-- videos:start -->
- [Layerling Tutorials](https://www.youtube.com/playlist?list=PLZ-ZWS0D1JIk) – HL ModTech (Engels). Een afspeellijst van een Tinkercad-gebruiker, tot nu toe met een kijkje in layerling van zo'n 23 minuten (gratis CAD in de browser dat Tinkercad uitbreidt), een diepere duik in de functies en een korte update over geprinte schroefdraad.
- [Layerling – Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) – Making Layers (Engels). Een reeks over layerling, tot nu toe met "Tinkercad alternative / upgrade? Introducing Layerling!", een overzicht voor wie van Tinkercad komt, en "Layerling Sketch Tools!" over de schetsgereedschappen.
- [Layerling](https://www.youtube.com/playlist?list=PLYqVFeqYBrPE) – TECHNOBENTO (Engels). Een afspeellijst over layerling, tot nu toe met ‘A new way to sketch in Layerling’.
- [Layerling CAD Videos](https://www.youtube.com/playlist?list=PLc09BHr_6nn8) – Printology (Engels). Een afspeellijst over layerling, tot nu toe met ‘I'm 100% In on Layerling - The Next Big Free CAD’ en ‘Layerling Features That Blow Tinkercad Out Of The Water’.
- [I Tried Layerling After Tinkercad… Is It REALLY Better?](https://youtu.be/5DpOxdoNwqs) – Maker Mates Studio 3D Printing (Engels). Iemand die van Tinkercad komt, probeert layerling uit en vergelijkt de twee.
- [Print by Layer](https://www.youtube.com/playlist?list=PLejZBz4L7CGQ) – Print N Repeat (Engels). Een afspeellijst over layerling, tot nu toe met ‘The EASIEST Way to Design Hinges in Layerling’ en ‘The EASIEST Way to 3D Model Threads!’.
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) – 3D Jesus | 3D Printing & Design (Engels). Een eerste test van layerling zonder enige handleiding: afrondingen en afschuiningen, uithollen, schroefdraad, schetsen, omwentelingslichamen, patronen, importeren en printerprofielen.
- [Layerling la nueva herramienta gratuita de modelado 3D, más completo que Tinkercad](https://youtu.be/-EEt0RSINoY) – Fulcro 1900 (Spaans). Een video over layerling als nieuw, gratis 3D-modelleerprogramma dat completer is dan Tinkercad.
- [Layerling](https://www.youtube.com/playlist?list=PLQuXPoMXTnRQ) – Werkplaats Marc (Nederlands). Een afspeellijst over layerling, tot nu toe met een eerste kennismaking voor Tinkercad-gebruikers (‘Layerling - De Gratis Tussenstap van Tinkercad naar Fusion 360’) en een tutorial over schetsen: een foto natekenen, omwentelen en langs een pad (‘Schetsen Uitgelegd’).
<!-- videos:end -->

## Aan de slag

De kortste weg is de gehoste versie. Niets te installeren, nergens voor aan te melden – openen en bouwen:

**https://layerling.com/**

De rest van dit hoofdstuk gaat over het draaien van je eigen kopie: op je computer, of op een machine in de werkplaats die iedereen in zijn browser opent. Waar de app ook vandaan komt, de ontwerpen verlaten nooit de browser waarin ze gemaakt zijn, en exports worden direct gedownload naar de eigen computer van de gebruiker.

### Snelstart op Windows

Nog nooit een terminal gebruikt? Open op een Windows 11-computer (of een actuele Windows 10) waar nog niets op staat
**PowerShell** (zoek ernaar in het Startmenu, beheerdersrechten zijn niet nodig) en plak deze ene regel:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

Dit installeert Git en Node.js als die ontbreken, downloadt layerling naar `%USERPROFILE%\layerling` en opent het in
je browser op `http://127.0.0.1:3000/`. Laat het PowerShell-venster open zolang je layerling gebruikt; `Ctrl+C` in dat
venster stopt het.

Voer precies dezelfde regel opnieuw uit wanneer je layerling wilt **bijwerken** – het script ziet de bestaande map en haalt
de nieuwste versie op in plaats van alles opnieuw te downloaden. Het script zelf staat in
[`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1), dus je kunt precies nalezen wat het doet voordat je
het uitvoert, of het downloaden en lokaal uitvoeren in plaats van het naar PowerShell te pipen.

#### Later opnieuw openen

De regel hierboven zet ook een snelkoppeling met de naam **“Start layerling”** op je bureaublad. Dubbelklik erop wanneer
je layerling weer wilt openen – geen PowerShell, niet opnieuw installeren, niet opnieuw downloaden, alleen de server die
start en je browser die vanzelf opent. Hij **werkt layerling ook eerst bij** (als de map geen eigen wijzigingen bevat) en opent de
browser pas als de server echt klaar is. Draait layerling al, dan start hij geen tweede server en werkt hij niet bij onder
de draaiende server - hij opent alleen de pagina. Wil je layerling ergens anders hebben, bijvoorbeeld op een andere schijf? Voer het script dan uit met
de map die je wilt:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

Is je snelkoppeling gemaakt door een oudere versie van het script, voer de regel dan nog één keer uit; die vervangt de snelkoppeling door de nieuwe.

Doe je het liever met de hand? Open PowerShell en voer uit:

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

en open daarna zelf `http://127.0.0.1:3000/`. `Ctrl+C` in dat venster stopt het in beide gevallen.

### Docker

Om layerling op een computer, NAS (Synology, Unraid, enz.) of thuisserver te draaien zonder Node.js te installeren, gebruik je de kant-en-klare image **`henmedia/layerling`** op Docker Hub (ook te vinden als **`ghcr.io/henmedia/layerling`**, dezelfde image). Elke release publiceert die voor amd64 en arm64 (Raspberry Pi, ARM-NAS) onder het versienummer en als `latest`. De app luistert op poort **3000**.

De snelste manier is één enkel commando:

```bash
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

Op een NAS met een containerbeheerder (Synology Container Manager, Unraid, Portainer) zoek je `henmedia/layerling` op in het register (Docker Hub) of vul je `henmedia/layerling:latest` in, en koppel je poort 3000. Om bij te werken haal je de image opnieuw op en maak je de container opnieuw aan (of laat je Watchtower dat doen).

De image-tags zijn kale versienummers **zonder "v"**: `ghcr.io/henmedia/layerling:1.42.0`, terwijl de GitHub-release `v1.42.0` heet. Een pull haalt alleen de nieuwe image op; een container die al bestaat blijft de oude draaien tot hij verwijderd en opnieuw aangemaakt wordt:

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`docker inspect layerling | grep image.version` laat zien welke versie de container echt draait. Heb je een map gekoppeld voor de serveropslag, geef dan dezelfde `-v`-optie opnieuw mee.

Wil je de image liever zelf bouwen, gebruik dan het meegeleverde [`Dockerfile`](docker/Dockerfile) en [`compose.yml`](docker/compose.yml):

1. **Installeer Docker.** Installeer en start op Windows of macOS [Docker Desktop](https://www.docker.com/products/docker-desktop/). Op Linux of een NAS heb je Docker met Compose nodig (`docker compose` of de losse `docker-compose`).
2. **Haal de bestanden op.** Download de repository als ZIP ([Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)) en pak hem uit, of clone hem:
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **Start het.** Open in de projectmap een terminal (bijv. PowerShell op Windows) en voer uit:
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   Met de oudere losse binary schrijf je `docker-compose` in plaats van `docker compose`. Docker bouwt de image en draait de container op de achtergrond (`-d`); de eerste build duurt ongeveer 2–3 minuten. Zonder `--build` haalt hetzelfde commando in plaats daarvan de kant-en-klare image op.
4. **Open het.** Op dezelfde computer via **`http://localhost:3000/`**, vanaf andere apparaten in je netwerk via **`http://<IP-VAN-JE-SERVER>:3000/`**.

Dagelijkse commando's:

- **Stoppen:** `docker compose -f docker/compose.yml down`
- **Herstarten:** `docker compose -f docker/compose.yml up -d`
- **Bijwerken** (na het ophalen van nieuwe code of het uitpakken van een nieuwe ZIP): `docker compose -f docker/compose.yml up -d --build`; met de kant-en-klare image `docker compose -f docker/compose.yml pull` en daarna `up -d`

De image draait `next start` in productiemodus, dus de MCP-brug staat daar uit tenzij je hem aanzet (zie [Een AI-client toegang geven tot een kopie op een NAS of server](#een-ai-client-toegang-geven-tot-een-kopie-op-een-nas-of-server)). Om een gedeelde projectmap aan te bieden, koppel je een beschrijfbare map en zet je `LAYERLING_SHARED_PROJECTS_DIR` in `compose.yml` op het pad binnen de container waar die gekoppeld is, bijvoorbeeld `./shared-projects:/shared-projects` met `LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"` (zie [Gedeelde ontwerpen in een netwerk](#gedeelde-ontwerpen-in-een-netwerk)). De container draait als de gebruiker met nummer 999, en die moet in de map mogen schrijven: `sudo chown 999:999 ./shared-projects`, of voeg `user: "1000:1000"` aan de service toe (je eigen gebruikers- en groepsnummers, `id -u` en `id -g` tonen ze), dan draait de container als jij. Zonder dit verschijnt de map op de startpagina, maar kan er niets in worden opgeslagen. Voer na een wijziging `docker compose up -d` uit: `docker compose restart` houdt de oude instelling aan. `docker exec <container> printenv LAYERLING_SHARED_PROJECTS_DIR` toont de instelling die in gebruik is.

Om het kleurenthema te kiezen dat mensen bij hun eerste bezoek krijgen, zet je `LAYERLING_DEFAULT_THEME` op `system`, `light`, `dark` of `graphite` (op dezelfde manier, in `compose.yml` of in de omgeving van `npm run start`). Wie layerling al eerder heeft geopend, houdt het thema dat zijn browser al heeft, en iedereen kan het nog steeds wijzigen met de themaschakelaar. Zonder de instelling volgt het thema het systeem. Een kopie die als gewone bestanden wordt aangeboden heeft geen server om het te lezen, dus daar geldt het niet.

Als de gedeelde map aan staat, laat `LAYERLING_NEW_DESIGNS_ON_SERVER` nieuwe ontwerpen op de server beginnen: `true` is de beginwaarde voor wie nog niet heeft gekozen (zij kunnen **Nieuwe ontwerpen op de server** op de startpagina uitzetten), `always` geldt voor iedereen en zet het vinkje vast. Het wordt op dezelfde manier ingesteld, en een kopie die als losse bestanden wordt geserveerd heeft geen server die het kan lezen.

Achter een reverse proxy met een domein moet de proxy de oorspronkelijke `Host` en `X-Forwarded-Proto` doorgeven (nginx: `proxy_set_header Host $host;` en `proxy_set_header X-Forwarded-Proto $scheme;`), anders weigert de server het opslaan met "Gedeelde projecten accepteren alleen verzoeken van deze site.". Herschrijft de proxy de host en kun je dat niet veranderen, zet dan het adres waarmee mensen layerling openen in `LAYERLING_ALLOWED_ORIGINS` (kommagescheiden, bijvoorbeeld `https://layerling.example.com`).

### Statische hosting: gewone bestanden op een webserver

Elke webserver kan layerling als gewone bestanden aanbieden; er draait geen Node.js op. Bouw de bestanden één keer op een computer met Node.js (zie [Wat je nodig hebt](#wat-je-nodig-hebt)):

```bash
npm install
npm run export
```

De kant-en-klare site staat in **`apps/web/.next-export/`**. Kopieer de **inhoud** van die map (niet de map zelf) naar de document root van de webserver, zodat `index.html` er direct in staat.

Drie dingen om te weten:

- **layerling heeft een eigen adres nodig.** De bestanden verwijzen naar elkaar met paden die bij de root beginnen (`/_next/...`), dus layerling moet in de root van een adres worden aangeboden, zoals `https://layerling.example.com/` of `http://192.168.0.5:8080/`. Het werkt niet in een submap (`https://example.com/layerling/`) en kan niet vanaf schijf worden geopend (`file://`). Zie je alleen een blok platte tekst zonder enige opmaak, dan zijn de script- en stijlbestanden niet geladen: open de ontwikkelaarstools van de browser (F12), kijk op het tabblad Netwerk naar rode `/_next/...`-regels en vergelijk hun adres met de plek waar je de bestanden hebt neergezet.
- **Mappen die met een underscore beginnen moeten worden aangeboden.** Sommige servers verbergen ze (GitHub Pages bijvoorbeeld, zonder een `.nojekyll`-bestand), en `_next` bevat het hele programma.
- **Een snelle test op je eigen computer:** `npx serve apps/web/.next-export` en open het adres dat het toont.

### Gedeelde ontwerpen in een netwerk

layerling zelf bestaat alleen uit bestanden, dus de gedeelde map heeft iets op de server nodig dat kan schrijven. Daar zijn twee manieren voor, en je hebt er maar één nodig: **Node of Docker** (deze sectie, met `LAYERLING_SHARED_PROJECTS_DIR`), of **een gewone webserver met PHP** (de map `store`, verderop). Een webserver die de bestanden zonder een van beide serveert – `npx serve`, nginx of Apache zonder PHP – toont layerling prima, maar heeft geen servermap.

Draai je layerling met `npm run dev` of `npm run start` op een machine die andere mensen in hun browser openen, dan kan het een
gedeelde map voor `.lyl`-ontwerpen aanbieden. `npm run start` serveert wat `npm run build` heeft gemaakt, voer dat dus eerst één keer uit. Laat `LAYERLING_SHARED_PROJECTS_DIR` vóór het starten wijzen naar een map waarin de gebruiker die layerling start mag schrijven (een map onder `/srv` is vaak van root; maak er een eigen of verander de eigenaar):

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projects npm run start
```

De startpagina toont dan een map met de naam **Op de server** naast je browserontwerpen. Open hem en je bent in die
map: **Nieuw ontwerp** begint er direct een, **Nieuwe map** maakt een submap, en een kruimelpad onder de kop laat zien
waar je bent. Een `..`-tegel leidt weer naar buiten, en **Terug naar de ontwerpen in deze browser** links van de knoppen brengt je terug naar de ontwerpen van deze browser. Ontwerpen verplaats je door ze naar een map te slepen, naar die tegel
of naar een stap in het kruimelpad – of via **Verplaatsen naar …** in hun menu. Een ontwerp uit je browser gaat op dezelfde
manier naar de server: sleep de kaart naar de servermap.

Het zoekvak bovenaan doorzoekt de hele servermap, niet alleen de map waarin je staat. Elke treffer zegt in welke map
hij staat, en die map is een knop: één klik en je bent er, met de zoekopdracht gewist. Mappen worden ook op naam
gevonden. Zolang je zoekt, laat de servertegel op de startpagina zien hoeveel treffers daar op je wachten.

**Dupliceren** in het menu van een ontwerp maakt er een kopie van. Op de server wordt het bestand zelf gekopieerd, naast het
origineel en onder een vrije naam, inclusief afbeelding – er wordt niets opnieuw ingepakt, dus de kopie heeft precies de
geometrie van het origineel. In je browser wordt de kopie een eigen ontwerp, met dezelfde vormen, dezelfde geschiedenis en
een eigen voorbeeldafbeelding, en het hoort bij niemand op de server.

Een ontwerp dat op de server staat, slaat zichzelf daar weer op, vijf seconden na de laatste wijziging en wanneer je de
editor verlaat. Miniaturen komen naast de bestanden in `.thumbnails`. Ontwerpen die alleen in je browser staan, blijven
daar, onaangeroerd.

Eigen vormen die op de server worden opgeslagen, komen in een map met de naam `Custom shapes` bovenaan de opslag, elk als
een `.lyl` met een eigen afbeelding. layerling maakt die map aan bij de eerste zo'n vorm; het is een gewone map, dus hij
verschijnt op de startpagina en een vorm erin opent en slaat op zoals elk ontwerp. Noch de Node-route noch `store.php`
heeft daar iets extra's voor nodig.

Een ontwerp van de server openen geeft je een eigen lokale werkkopie. Bij het terug opslaan wordt eerst de revisie op de
server gecontroleerd; heeft iemand anders het bestand intussen gewijzigd, dan weigert layerling het te overschrijven en
vraagt je om te herladen of onder een andere naam op te slaan. Dit is gedeelde bestandsopslag, geen gelijktijdig bewerken.

#### Zonder Node: de map `store`

Een installatie die als statische export wordt aangeboden – gewone bestanden op een webserver – kan zelf niets wegschrijven.
Voor dat geval reist `store.php` mee met de export. Maak naast `index.html` een map met de naam `store` aan waarin de
webserver mag schrijven, en layerling biedt dezelfde gedeelde opslag als hierboven, inclusief mappen. Zonder de map blijft
de functie onzichtbaar, en de korte uitleg in de editor vertelt hoe je hem aanzet. De webserver heeft PHP nodig.

De map heeft **geen login**: wie de pagina kan bereiken, kan lezen, schrijven en verwijderen wat erin staat. Op een
thuisnetwerk of in een werkplaats is dat juist de bedoeling; op een publiek bereikbare site moet je hem beveiligen of
weglaten.

Niets in de map is bedoeld om via zijn adres te openen: layerling leest en schrijft hem alleen via `store.php`. Onder
Apache zet `store.php` er een `.htaccess` in die elke directe aanvraag weigert. Apache leest die alleen waar
`AllowOverride` het toestaat (Debian zet `/var/www` op `None` en slaat hem over), nginx en andere servers nooit; blokkeer
`store/` daar zelf (in Apache: `<Directory /var/www/html/store> Require all denied </Directory>`, in nginx:
`location /store/ { deny all; }`). `store.php` controleert bovendien elke export die het opslaat en weigert een bestand
dat in een browser iets zou kunnen uitvoeren.

Eén ding om te onthouden bij het uitrollen: spiegel je de export met een optie die alles wat extra is verwijdert – `rsync
--delete`, `robocopy /MIR`, WinSCP `-delete` – sluit `store` dan expliciet uit, anders wist elke update de projecten.

## Werken aan layerling

Kies deze route als je de code wilt aanpassen.

### Wat je nodig hebt

- Node.js 22.18 of nieuwer (de scripts voor de handleiding en de lettertypen laden TypeScript-bestanden rechtstreeks, en dat kunnen oudere versies niet); 24 werkt ook, de Docker-image gebruikt die
- npm, meegeleverd met Node.js

Controleer je versies met `node -v` en `npm -v`. Werken die commando's niet, installeer dan Node.js vanaf de officiële
Node.js-website en open je terminal opnieuw.

### Installeren en starten

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

Geen Git? Klik op de groene knop **Code** op de GitHub-pagina, kies **Download ZIP**, pak het uit, open een terminal in de
uitgepakte map en begin met `npm install`.

Open daarna `http://127.0.0.1:3000/`. Laat de terminal open zolang je de app gebruikt; `Ctrl+C` stopt de ontwikkelserver.

Op Linux en macOS regelt `scripts/start-layerling.sh` het dagelijkse starten voor je: het werkt eerst de checkout bij (overgeslagen als je er bestanden in hebt gewijzigd), start de server, wacht tot die antwoordt en opent dan de browser. Je kunt het overal vandaan uitvoeren, bijvoorbeeld `~/layerling/scripts/start-layerling.sh`. Het heeft Git en Node.js nodig, zoals hierboven. Draait layerling al op die poort, dan opent het alleen de browser in plaats van een tweede server te starten. Is poort 3000 bezet door iets anders? Start het dan met `PORT=3100 scripts/start-layerling.sh`. Het is getest op Debian Linux (zonder desktop, dus de browserstap toont alleen het adres) en in een Windows-shell; macOS is niet getest – als het op jouw systeem niet goed werkt, laat het ons dan weten in de discussies.

### Ontwikkelen in een container

Liever geen Node.js installeren? Ontwikkel dan in een container. Je hebt een container-engine met Compose nodig –
`docker compose` of `podman compose` (rootless Podman op SELinux werkt ook; de `:z`-vlag in het compose-bestand regelt
de bestandslabels):

```bash
docker compose -f docker/compose.dev.yml up
```

Open `http://127.0.0.1:3000/`. De eerste start installeert de dependencies; latere starts gaan direct naar de dev-server
met hot reload. Stop hem met `Ctrl+C`. Werk je dependencies bij en lijkt iets verouderd, verwijder dan `node_modules/` in
de projectmap en start opnieuw.

Draai je tegelijk de productiecontainer uit `docker/compose.yml`? Die gebruikt ook poort 3000 – verander bij een van de twee
de poort aan de hostkant (bijv. `"3100:3000"`).

### Handige commando's

| Commando | Wat het doet |
| --- | --- |
| `npm run typecheck` | TypeScript-controles |
| `npm run test` | Unittests |
| `npm run test:e2e` | End-to-endtests |
| `npm run build` | Productiebuild (`npm run start` biedt hem aan) |
| `npm run export` | Statische export voor gewone webhosting |
| `npm run guide` | De pagina's van de handleiding bouwen uit `docs/guide` (de export en `npm run dev` doen dit ook) |
| `npm run guide:images` | De afbeeldingen van de handleiding opnieuw maken vanuit het draaiende programma (vereist `npm run dev -- -p 3010`; zie `docs/guide/README.md`) |
| `npm run printers:update` | De printerpresets verversen vanuit de profielen van OrcaSlicer |
| `npm run mcp:layerling` | De MCP-server voor AI-clients starten (zie hieronder) |

## layerling MCP Skill

layerling bevat een lokale MCP-server voor AI-clients die MCP-tools ondersteunen. Daarmee kan een agent een actief
editortabblad inspecteren en besturen: open editors opsommen, de scène lezen, objecten maken, aanpassen en selecteren,
onderdelen groeperen, snijden en scheiden, CAD-rand-id's opsommen, afschuining of afronding toepassen, een lichaam uithollen,
fouten inspecteren en afbeeldingen van de weergave maken.

Het werkt met een lokale ontwikkelserver. In productiebuilds en bij statische hosting staat de MCP-route uit, tenzij de
server hem aanzet met een toegangstoken ([zie hieronder](#een-ai-client-toegang-geven-tot-een-kopie-op-een-nas-of-server)); op layerling.com staat hij altijd uit.

1. Start layerling vanuit de projectmap met `npm run dev` (zie [Installeren en starten](#installeren-en-starten)).
2. Open een editortabblad, bijv. `http://127.0.0.1:3000/?editor=1` - of laat dat achterwege: als er geen editor open is, start de eerste tool die er een nodig heeft je browser met een editor (niet bij een kopie op een NAS of server; `LAYERLING_MCP_OPEN_EDITOR=0` zet het uit).
3. Koppel je AI-client zoals hieronder beschreven. Die start de MCP-server zelf met
   `node scripts/layerling-mcp-server.mjs`.

De belangrijkste toolnamen zijn `layerling_list_editors`, `layerling_read_scene`, `layerling_list_objects`,
`layerling_create_shape`, `layerling_update_object`, `layerling_list_edges`, `layerling_apply_edge_treatment`,
`layerling_hollow_object`, `layerling_array_objects`, `layerling_set_section_view` en `layerling_capture_image`.

### Claude Code

Niets te installeren: de repo bevat al `.mcp.json`, dat de MCP-server voor dit project registreert, en een kopie van de
skill in `.claude/skills/layerling-mcp-skill`, waar Claude Code ernaar zoekt. Open de layerling-map in
Claude Code en vraag:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Claude Desktop

Claude Desktop leest de `.mcp.json` of skill-bestanden van een project niet, maar kan dezelfde MCP-server gebruiken via
zijn eigen configuratie. Voeg de server daar toe, met [`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json)
als sjabloon, en vervang het scriptpad door het absolute pad op je computer. Vraag na het herstarten van Claude Desktop:

```text
Use the layerling MCP tools to list open editors, inspect the scene, and modify the selected object.
```

### Codex

Kopieer de skill uit `docs/skills/layerling-mcp-skill` naar je Codex-skillsmap.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.codex\skills\layerling-mcp-skill"
```

macOS of Linux:

```bash
mkdir -p ~/.codex/skills
cp -R docs/skills/layerling-mcp-skill ~/.codex/skills/
```

Voeg daarna een MCP-server toe aan je Codex-configuratie, met [`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml)
als sjabloon, en vervang het scriptpad door het absolute pad op je computer. Herstart Codex en vraag:

```text
Use $layerling-mcp-skill to list my open layerling editors and inspect the current scene.
```

### Gemini & Antigravity

Voor Antigravity bevat de repo een kopie van de skill in `.agents/skills/layerling-mcp-skill`, die Antigravity zelf
vindt. Kopieer voor Gemini CLI de skill uit `docs/skills/layerling-mcp-skill` naar je globale skillsmap.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.gemini\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.gemini\skills\layerling-mcp-skill"
```

macOS of Linux:

```bash
mkdir -p ~/.gemini/skills
cp -R docs/skills/layerling-mcp-skill ~/.gemini/skills/
```

Voeg daarna de server toe aan de `settings.json` van Gemini CLI of de `mcp_config.json` van Antigravity, met
[`docs/mcp/gemini-config.example.json`](docs/mcp/gemini-config.example.json) als sjabloon, en vervang het scriptpad door
het absolute pad op je computer. Herstart de client en vraag:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Een AI-client toegang geven tot een kopie op een NAS of server

Een kopie die je zelf host (de Docker-image op een NAS, een thuisserver) kan een AI-client de open editors via het netwerk
laten besturen. Dit staat **standaard uit**, want wie de brug kan besturen, kan de open ontwerpen lezen en wijzigen. Zet het
aan met twee instellingen op de server, die bij het starten worden gelezen - de kant-en-klare image hoeft niet opnieuw gebouwd te worden:

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "a-long-random-secret-of-at-least-16-characters"
```

Zonder een token van minstens 16 tekens blijft de brug dicht. Daarna:

1. Open een editortabblad van die kopie in een browser, bijv. `http://nas:3000/?editor=1`, en houd het open.
2. Geef de MCP-client het adres en hetzelfde token: zet `LAYERLING_URL=http://nas:3000` en
   `LAYERLING_MCP_TOKEN=<het token>` in de configuratie (zie de voorbeelden in `docs/mcp`).

Het token beschermt de commando's: alleen een client die het meestuurt, kan de editors opsommen of besturen. De
editorpagina's hebben er geen nodig, maar ze tellen alleen mee als het pagina's van die kopie zijn, geopend via een adres of
een naam die alleen iemand in je eigen netwerk kan gebruiken (een IP-adres, een naam zonder punt, of een die eindigt op
`.local` of `.lan`). Zo kan een webpagina op internet je NAS niet via je browser bereiken. Open je de kopie onder een echt
domein, bijvoorbeeld achter een reverse proxy, zet dat dan in `LAYERLING_MCP_ALLOWED_HOSTS` (kommagescheiden). Gebruik dit
op een netwerk dat je vertrouwt, en gebruik HTTPS voor alles daarbuiten: het token gaat mee in een header.

## Bijdragen

Bijdragen zijn welkom, en je hoeft geen 3D-printmens te zijn om te helpen – een duidelijkere zin in deze README telt
ook. Goede plekken om te beginnen:

- bugfixes in de editor
- testgevallen voor geometrie en booleaanse bewerkingen
- randgevallen bij import en export (STL, OBJ, 3MF, STEP, SVG, DXF)
- verfijning van de gebruikersinterface
- screenshots en video's voor de documentatie
- verbeteringen in toegankelijkheid en prestaties

Lees [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) voordat je een pull request opent. Wat er in elke versie is
veranderd, staat in de [changelog](docs/CHANGELOG.md).

## Beveiliging

Open alsjeblieft geen openbare issues voor beveiligingsgevoelige meldingen. Lees [.github/SECURITY.md](.github/SECURITY.md)
voor de manier van melden.

## Waar het vandaan komt

layerling is een fork van [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D) door Formsmith746 en de
SketchForge-bijdragers. De fork begon op 16 september 2026 vanaf SketchForge 1.0.9. SketchForge blijft een uitstekend
project en de reden dat dit project bestaat.

## Handelsmerken

Tinkercad is een handelsmerk van Autodesk, Inc. layerling is een onafhankelijk project en is niet verbonden aan, goedgekeurd door of gesponsord door Autodesk.

## Licentie

Copyright (C) 2026 layerling contributors.
Copyright (C) 2026 SketchForge contributors.

layerling is een aangepaste versie van SketchForge-3D en valt onder de **GNU Affero General Public License v3.0 only**
(`AGPL-3.0-only`) – dezelfde licentie als het origineel. Zie [LICENSE](LICENSE).

Pas je layerling aan en laat je mensen de aangepaste versie via een netwerk gebruiken, dan verplicht artikel 13 van de
licentie je om hun de bijbehorende broncode aan te bieden. Het dashboard heeft precies daarvoor een **Source**-link: zet
`NEXT_PUBLIC_SOURCE_CODE_URL` bij het bouwen op de openbare URL van de broncode waaruit je build is gemaakt.
