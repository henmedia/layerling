---
title: Veelgestelde vragen
summary: Korte antwoorden op wat het vaakst wordt gevraagd, over opslaan, grote modellen, afrondingen, AI en printen, telkens met de weg naar de volledige uitleg.
contents: questions
---

Elk antwoord is kort en eindigt met de plek in deze handleiding die het volledig uitlegt. Het zoekveld bovenaan vindt een vraag op elk woord erin.

## Opslaan en back-ups

### Waar worden mijn ontwerpen bewaard, en is er een cloud?

In de browser op je eigen computer. Er is geen account en geen cloud, en er wordt niets geüpload; elke wijziging slaat zichzelf op. Wie layerling op een eigen server draait, kan ontwerpen daar ook in een gedeelde map bewaren.

Meer: [Waar je ontwerpen staan](chapter:bestanden-en-opslaan#waar-je-ontwerpen-staan)

### Mijn ontwerpen zijn weg. Wat is er gebeurd?

Ontwerpen staan in één browser op één computer. Ze zijn weg als de browsergegevens van de pagina zijn gewist, en ze verschijnen niet in een andere browser of op een andere computer. Safari op Mac, iPhone en iPad wist de gegevens van een pagina na zeven dagen zonder bezoek, tenzij layerling als app is geïnstalleerd. Heb je een back-up, dan haalt {{ui:dashboard.restoreBackup}} op de startpagina de ontwerpen terug, met hun mappen en afbeeldingen.

Meer: [Jouw ontwerpen, jouw back-up](chapter:bestanden-en-opslaan#jouw-ontwerpen-jouw-back-up)

### Hoe maak ik een back-up van alles, ook vanzelf in een map?

{{ui:dashboard.backupAll}} op de startpagina pakt alle ontwerpen in één ZIP-bestand. Daarnaast bewaart layerling vanzelf eerdere versies van elk ontwerp, en in Chrome en Edge kan het elke versie als .lyl-bestand in een map schrijven die je zelf kiest. De versies in de browser verdwijnen met de browsergegevens, dus ze vervangen het ZIP-bestand of de map niet.

Meer: [Eerdere versies](chapter:bestanden-en-opslaan#eerdere-versies)

### Hoe neem ik een ontwerp mee naar een andere computer of browser?

Sla het vanuit het exportvenster op als .lyl-bestand en open dat bestand op de andere computer vanaf de startpagina. Voor alle ontwerpen tegelijk gebruik je hier {{ui:dashboard.backupAll}} en daar {{ui:dashboard.restoreBackup}}; ontwerpen die er al zijn, worden niet twee keer toegevoegd.

Meer: [Back-up maken en doorgeven](chapter:bestanden-en-opslaan#back-up-maken-en-doorgeven)

### Wat gebeurt er als ik de browsergegevens wis?

De ontwerpen die in die browser zijn opgeslagen, worden verwijderd, net als de eerdere versies die layerling daar bewaarde. Een ZIP-bestand van {{ui:dashboard.backupAll}}, je .lyl-bestanden en een back-upmap op je schijf blijven onaangeroerd. Maak dus eerst een back-up en wis daarna.

Meer: [Jouw ontwerpen, jouw back-up](chapter:bestanden-en-opslaan#jouw-ontwerpen-jouw-back-up)

### Hoe kom ik terug bij een eerdere stand?

Ongedaan maken gaat stap voor stap terug. De geschiedenisweergave toont met een schuifregelaar elke stap zonder het ontwerp te veranderen, en kan van elke stap een nieuw ontwerp maken. Voor een stand van eerder vandaag of van vorige week opent de lijst met eerdere versies een oude versie als nieuw ontwerp; het huidige blijft zoals het is.

Meer: [Terugkijken: de geschiedenisweergave](chapter:selecteren-en-schikken#terugkijken-de-geschiedenisweergave) en [Eerdere versies](chapter:bestanden-en-opslaan#eerdere-versies)

### Kunnen STL en 3MF rechtstreeks in mijn projectmap? En hoe krijg ik weer een download?

In Chrome en Edge vraagt de eerste export van een ontwerp waar je wilt opslaan, en latere exports schrijven zonder te vragen naar datzelfde bestand. Firefox en Safari downloaden altijd. Wil je elke keer een download, zet dan {{ui:workspace.stlAsDownload}} aan in de instellingen.

Meer: [Exporteren](chapter:bestanden-en-opslaan#exporteren)

### Het opslagvenster ging dicht en er is geen bestand. Waarom?

De browser meldt een venster dat hij niet kon gebruiken op dezelfde manier als een venster dat je hebt geannuleerd, en een bestand dat een virusscanner blokkeert, kan ook niet worden geschreven. De melding bovenaan biedt dan {{ui:status.saveAsDownload}} aan, en dat zet het bestand in je downloads. Wil je het venster voorgoed overslaan, zet dan {{ui:workspace.lylAsDownload}} en {{ui:workspace.stlAsDownload}} aan in de instellingen.

Meer: [Back-up maken en doorgeven](chapter:bestanden-en-opslaan#back-up-maken-en-doorgeven)

## Installeren en updates

### Is er een app om te downloaden?

layerling installeer je vanuit de browser: het krijgt dan een eigen pictogram en venster en start zonder netwerk. Er is geen installatieprogramma om te downloaden, en het origineel staat alleen op layerling.com. **Download of start geen "layerling"-installatieprogramma van een andere website:** het komt niet van layerling en kan malware bevatten. Wil je een eigen kopie draaien, dan is er een snelstart voor Windows en een Docker-image.

Meer: [Installeren als app](chapter:offline-en-installeren#installeren-als-app) en [Zelf draaien](chapter:offline-en-installeren#zelf-draaien)

### Werkt layerling zonder internet?

Ja, na het eerste bezoek start het zonder netwerk, het best als geïnstalleerde app. Eén ding wordt pas geladen als het voor het eerst nodig is: de CAD-kernel voor de eerste STEP-export, ongeveer 22 MB.

Meer: [Installeren als app](chapter:offline-en-installeren#installeren-als-app)

### Hoe krijg ik een update?

Vanzelf. Een open pagina merkt een nieuwe versie op en toont een kaart met wat er nieuw is; {{ui:newVersion.reload}} slaat eerst het open ontwerp op en laadt dan de nieuwe versie. Ook de startpagina toont een nieuwere versie.

Meer: [Updates](chapter:offline-en-installeren#updates)

### Welke browsers en tablets werken?

Chrome, Edge, Firefox en Safari, op een computer, tablet of telefoon; de 3D-weergave heeft WebGL nodig. Een paar dingen kunnen alleen Chrome en Edge: in je eigen bestanden en mappen schrijven, de back-upmap en .lyl-bestanden openen met een dubbelklik. Op een tablet doet een vinger wat de linkermuisknop doet.

Meer: [Vingers en een stylus](chapter:tablet-en-touch#vingers-en-een-stylus)

## AI

### Wat is de makkelijkste manier om een AI in te stellen?

Geef een AI die op je computer kan werken het adres `https://github.com/henmedia/layerling` en vraag haar om layerling met de MCP-server voor je in te stellen. Daarvoor is een programma nodig zoals het tabblad Code van de Claude-app, Claude Code, Codex, Antigravity of Gemini CLI. Voor Windows en Mac staan in de handleiding ook de stappen een voor een.

Meer: [Stap voor stap voor beginners](chapter:ai-met-mcp#stap-voor-stap-voor-beginners)

### Waarom kan de AI layerling.com niet bereiken?

De brug tussen de AI en de editor bestaat alleen in een kopie van layerling die op je eigen computer draait. Op layerling.com staat die altijd uit, en een chat in de browser kan niets installeren. De AI heeft dus een lokaal gestarte layerling nodig en een programma dat MCP spreekt.

Meer: [Instellen](chapter:ai-met-mcp#instellen)

### Welke AI werkt, en wat kost het?

Elk programma dat MCP spreekt; de handleiding beschrijft Claude, Codex, Gemini en Antigravity. layerling zelf kost niets. Wat de AI kost, bepaalt de aanbieder: het tabblad Code van de Claude-app hoort bijvoorbeeld bij de betaalde Claude-abonnementen.

Meer: [Instellen](chapter:ai-met-mcp#instellen)

### Welke gegevens gaan naar de aanbieder van de AI?

Wat de AI leest: de objecten van het open ontwerp en de afbeeldingen die ze van de weergave maakt. Dat gaat naar de aanbieder van je AI-programma, net als alles wat je daar verder typt. De brug zelf draait op je computer, en zonder AI verlaat niets je computer.

Meer: [Wat de AI kan](chapter:ai-met-mcp#wat-de-ai-kan)

## Geheugen, snelheid en geschiedenis

### Waarom wordt layerling traag met mijn STL?

Een STL is een mesh van driehoeken, en een heel grote maakt de editor trager, kost veel geheugen en maakt het opslaan traag. layerling meldt dat na het importeren vanaf 400.000 driehoeken in één mesh, of een miljoen in het hele ontwerp. Vereenvoudig eerst de mesh, importeer alleen de onderdelen die je nodig hebt, of bouw het onderdeel uit de eigen vormen van layerling.

Meer: [Grote meshes](chapter:bestanden-en-opslaan#grote-meshes)

### Waarom ontbreken er stappen in mijn geschiedenis?

Twee dingen maken haar korter. De instelling {{ui:workspace.savedHistory}} bewaart 100 stappen per ontwerp tenzij je dat verandert, en oudere vallen weg. En als een ontwerp te groot is om met de hele geschiedenis te worden opgeslagen, slaat layerling het op met de helft van de stappen, daarna weer met de helft, en meldt dat. Het ontwerp zelf wordt altijd compleet opgeslagen.

Meer: [Bewaarde geschiedenis](chapter:weergave-en-werkvlak#bewaarde-geschiedenis)

### Wat doe ik als de opslag van de browser vol is?

Sluit het tabblad niet en herlaad het niet: je nieuwste wijzigingen staan alleen daar. Bewaar eerst een kopie door het als .lyl te exporteren. Maak daarna ruimte: verwijder stappen in de geschiedenisweergave, haal ontwerpen weg die je niet meer nodig hebt, of maak er een back-up van en verwijder ze.

Meer: [Jouw ontwerpen, jouw back-up](chapter:bestanden-en-opslaan#jouw-ontwerpen-jouw-back-up)

### Mijn ontwerp is te groot om op te slaan. Wat nu?

De geschiedenis en de meshes nemen samen te veel ruimte in. layerling heeft het al met minder geschiedenisstappen geprobeerd voordat het dit meldt. Verwijder de geschiedenis in de geschiedenisweergave, vereenvoudig de zwaarste geïmporteerde meshes, of sla een .lyl op met alleen de huidige stand.

Meer: [Back-up maken en doorgeven](chapter:bestanden-en-opslaan#back-up-maken-en-doorgeven) en [Een geïmporteerde mesh vereenvoudigen](chapter:bestanden-en-opslaan#een-geimporteerde-mesh-vereenvoudigen)

### De browser heeft geen geheugen meer. Wat helpt?

Dit gebeurt bij meshes met miljoenen driehoeken, waarbij één stap meer geheugen nodig heeft dan een browsertabblad krijgt. Verminder de driehoeken van geïmporteerde meshes met {{ui:editor.tool.simplify}}, sluit andere tabbladen en probeer het opnieuw. Gebeurt het tijdens het opslaan, dan helpt ook een kortere geschiedenis.

Meer: [Grote meshes](chapter:bestanden-en-opslaan#grote-meshes)

### Een ontwerp opent heel traag of helemaal niet. Wat kan ik doen?

Meestal is de geschiedenis met stappen voor Ongedaan maken erg groot geworden. {{ui:dashboard.openWithoutHistory}} in het menu van het ontwerp op de startpagina leest alleen de huidige stand; de eerdere stappen worden daarbij definitief verwijderd, dus maak eerst een back-up van het ontwerp als je ze wilt houden. Een eerdere versie uit de back-ups opent als nieuw ontwerp.

Meer: [Back-up maken en doorgeven](chapter:bestanden-en-opslaan#back-up-maken-en-doorgeven)

### layerling hapert. Welke instellingen helpen?

{{ui:workspace.fastMode}} in de instellingen zet de schaduwen, de randlijnen op alle lichamen en het naglijden van de camera uit, en tekent de weergave alleen op schermresolutie. Controleer of de browser de grafische kaart gebruikt: op `chrome://gpu` of `edge://gpu` moet bij WebGL "Hardware accelerated" staan. Grote geïmporteerde meshes zijn de andere veelvoorkomende oorzaak.

Meer: [Als layerling traag aanvoelt](chapter:weergave-en-werkvlak#als-layerling-traag-aanvoelt)

### De editor staat stil of rekent heel lang. Wachten of herladen?

Wacht eerst. Sneden, groepen en randbewerkingen worden op de achtergrond berekend, en {{ui:status.computing}} staat er zolang ze lopen; lange taken zoals uithollen stoppen vanzelf met een melding en veranderen niets. Moest de CAD-kernel opnieuw worden gestart, dan zegt de melding dat en hoef je niet te herladen. Herladen is veilig, omdat elke wijziging zichzelf opslaat, met één uitzondering: zolang de rode melding {{ui:notice.designNotSavedTitle}} er staat, exporteer je eerst een .lyl.

Meer: [Als layerling traag aanvoelt](chapter:weergave-en-werkvlak#als-layerling-traag-aanvoelt)

### De 3D-weergave blijft leeg, of een melding zegt dat ze niet kon starten. Wat nu?

De browser kon WebGL niet starten, dat de 3D-weergave tekent. De oorzaak ligt bij de browser of het grafische stuurprogramma, niet bij je ontwerp, en je opgeslagen ontwerpen worden niet verwijderd. Sluit andere tabbladen met 3D-inhoud en start de browser opnieuw, zet hardwareversnelling aan, sta WebGL toe als een privacy-instelling of een extensie het blokkeert, en werk de browser en het grafische stuurprogramma bij. Een andere browser is een snelle test.

Meer: [Als layerling traag aanvoelt](chapter:weergave-en-werkvlak#als-layerling-traag-aanvoelt)

## Geïmporteerde modellen

### "Mesh vereenvoudigen" of "Exact maken": welke van de twee?

{{ui:editor.tool.simplify}} behoudt een deel van de driehoeken, zodat een zwaar model lichter wordt; het blijft een mesh. {{ui:editor.tool.makeExact}} bouwt een model dat uit platte vlakken, cilinders, kegels en bollen bestaat opnieuw op als een echt CAD-lichaam, zodat afrondingen en afschuiningen nette randen volgen en een STEP-export echte vlakken bevat. Het neemt tot 400.000 driehoeken aan; een figuur of een scan blijft een mesh. Bij een groot technisch onderdeel: vereenvoudig eerst, met {{ui:simplify.keepEdges}} aan, en maak het daarna exact.

Meer: [Een geïmporteerde mesh vereenvoudigen](chapter:bestanden-en-opslaan#een-geimporteerde-mesh-vereenvoudigen) en [Een geïmporteerde mesh exact maken](chapter:bestanden-en-opslaan#een-geimporteerde-mesh-exact-maken)

### Waarom mislukt een snede, of waarom is mijn mesh "niet waterdicht"?

Een lichaam kan alleen worden gesneden als zijn oppervlak gesloten is. Heeft een geïmporteerde mesh gaten in het oppervlak, dan noemt layerling het onderdeel en het aantal open randen en laat het weg. Kleine gaten sluit het zelf; grotere moeten worden gerepareerd in het programma waar het model vandaan komt, of in een hulpmiddel voor meshreparatie. De printcontrole toont welk lichaam open is.

Meer: [De print controleren](chapter:printen#de-print-controleren)

### Hoe importeer ik een SVG op de juiste manier?

Een SVG komt binnen als schetslichaam van 4 mm hoog, en de punten ervan kun je in de schetsmodus wijzigen. Typ vóór het importeren de breedte in millimeters in het importvenster; zonder getal houdt het zijn eigen grootte. Omtrekken die zichzelf kruisen, kunnen geen massief lichaam worden; ze worden weggelaten en geteld: voeg overlappende stukken in het tekenprogramma samen, sluit de omtrekken en importeer opnieuw.

Meer: [Importeren](chapter:bestanden-en-opslaan#importeren)

## Afrondingen en afschuiningen

### Waarom kan een afronding niet worden toegepast?

Meestal is ze te groot voor die plek: ze zou in de aangrenzende vlakken lopen, of de rand buigt scherper dan de straal. Eén of twee millimeter minder is vaak genoeg, en bij scherpe hoeken heeft een afronding meer ruimte nodig dan haar straal doet vermoeden. Kunnen de randen niet samen worden afgerond, neem er dan minder tegelijk; de rand die in de weg zit, wordt rood getekend. {{ui:edge.findLargest}} zoekt de maat voor je.

Meer: [Randen afschuinen en afronden](chapter:randen-en-uithollen#randen-afschuinen-en-afronden)

### Waarom zijn mijn afrondingen weg nadat ik de schets heb gewijzigd?

Na {{ui:inspector.editSketch}} wordt het lichaam opnieuw opgebouwd en heeft het nieuwe randen. layerling brengt afrondingen en afschuiningen opnieuw aan op de randen die liggen waar de oude lagen, zolang het lichaam evenveel randen heeft als daarvoor. Met een hoek meer of minder worden ze weggelaten, en de melding zegt hoeveel. Ongedaan maken brengt alles terug.

Meer: [Er een lichaam van maken](chapter:schetsen#er-een-lichaam-van-maken)

### Waarom kan ik sommige randen van een geïmporteerd model niet kiezen?

STL, OBJ en 3MF bevatten alleen driehoeken, en de randgereedschappen werken op meshes tot 4.000 driehoeken. {{ui:editor.tool.makeExact}} maakt van een technisch onderdeel een echt CAD-lichaam, waarop een boring één ronde rand heeft die een afronding kan volgen. Een STEP-bestand brengt vanaf het begin exacte geometrie mee.

Meer: [Een geïmporteerde mesh exact maken](chapter:bestanden-en-opslaan#een-geimporteerde-mesh-exact-maken)

## Groepen, gaten en maten

### Waarom worden gaten ovaal als ik een groep uitrek?

Een groep die van formaat verandert, rekt alles erin uit, alsof het op rubber getekend is. Kies in de instellingen van de groep onder {{ui:inspector.groupResize}} de optie {{ui:inspector.groupResizeKeepParts}}: onderdelen die over de hele groep reiken, rekken mee, en gaten en kleine onderdelen houden hun grootte en hun afstand tot de dichtstbijzijnde zijde.

Meer: [Een groep van formaat veranderen: gaten en kleine onderdelen behouden](chapter:lichamen-en-gaten#een-groep-van-formaat-veranderen-gaten-en-kleine-onderdelen-behouden)

### Waarom mislukt het groeperen, of waarom heeft het resultaat openingen?

Óf een onderdeel is niet gesloten, en dan noemt de melding het, óf twee onderdelen raken elkaar bijna zonder elkaar echt te raken. Hef de groep op, lijn de onderdelen precies uit of verander een maat of positie een klein beetje, en groepeer opnieuw. Heel dichte meshes boven de limiet voor het snijden van geïmporteerde meshes worden helemaal niet samengevoegd.

Meer: [Groeperen](chapter:lichamen-en-gaten#groeperen)

### Hoe wijzig ik één onderdeel binnen een groep?

Selecteer de groep en druk op [[E]], of dubbelklik erop. De onderdelen liggen dan los en kun je wijzigen; als je klaar bent, wordt de groep opnieuw opgebouwd. Afrondingen en afschuiningen die op de hele groep waren aangebracht, gaan verloren bij het opnieuw opbouwen.

Meer: [Een groep bewerken](chapter:lichamen-en-gaten#een-groep-bewerken)

### Hoe haal ik één onderdeel terug uit een eerdere stand?

Open de geschiedenisweergave, schuif de regelaar naar de stand die het onderdeel nog had, klik op het onderdeel en kies {{ui:historyView.bringBack}}. Er komt een kopie in het huidige ontwerp, zoals het onderdeel was en waar het stond, met de tijd in de naam.

Meer: [Terugkijken: de geschiedenisweergave](chapter:selecteren-en-schikken#terugkijken-de-geschiedenisweergave)

## Printen en exporteren

### STL, 3MF, OBJ of STEP: welke kies ik?

Voor de printer 3MF of STL. 3MF bewaart elk lichaam als onderdeel met naam en kleur; STL is één mesh in één kleur. OBJ bevat ook kleuren. STEP is voor andere CAD-programma's: het bevat de exacte geometrie met afrondingen en afschuiningen.

Meer: [Exporteren](chapter:bestanden-en-opslaan#exporteren)

### Hoe komen mijn kleuren in de slicer?

Exporteer 3MF. Elk lichaam houdt zijn kleur, en een lichaam dat in meerdere kleuren is beschilderd, heeft de verf op zijn vlakken. Bambu Studio en OrcaSlicer vragen bij het openen hoe de kleuren aan je filamenten moeten worden gekoppeld.

Meer: [In meerdere kleuren beschilderen](chapter:vormen#in-meerdere-kleuren-beschilderen)

### Mijn onderdelen passen niet in elkaar. Hoeveel speling hebben ze nodig?

Meestal 0,2 tot 0,4 mm, afhankelijk van de printer. De pastest meet het: print de kleine plaat met zeven gaten, zoek het krapste gat waarin de pen nog draait, en vul die waarde in als de speling van je printer. Nieuwe deksels, zwaluwstaarten en schroefdraden gaan daar dan van uit.

Meer: [De speling van je printer: de pastest](chapter:printen#de-speling-van-je-printer-de-pastest)

### Waarom zegt layerling dat een onderdeel niet in de printer past?

Het onderdeel steekt over de rand van de plaat uit of is hoger dan de gekozen printer kan bouwen. Het is alleen een hint en je kunt hem sluiten. Kies je printer in de instellingen, of verdeel een te groot onderdeel met {{ui:editor.tool.split}}.

Meer: [Als iets niet past](chapter:printen#als-iets-niet-past)

## Over layerling

### Is layerling gratis, en mag ik verkopen wat ik ermee ontwerp?

layerling is vrije software onder de AGPL-3.0-licentie, zonder account. De licentie gaat over het programma: wie layerling wijzigt en via een netwerk aan anderen aanbiedt, moet ook de broncode aanbieden. Ze stelt geen voorwaarden aan de modellen die je maakt. Lettertypen en modellen die je importeert, houden hun eigen licenties. Wil je het project steunen, dan helpt een [kleine donatie](https://layerling.com/support.html?lang=nl) bij de server- en ontwikkelkosten. Ze is vrijwillig, en niets in layerling hangt ervan af.

Meer: [Zelf draaien](chapter:offline-en-installeren#zelf-draaien)

### Hoe meld ik een fout of vraag ik om iets?

{{ui:editor.bugReport}} in de voettekst slaat een ZIP-bestand op met het ontwerp en een korte tekst over de versie en de browser; er staat niets persoonlijks in. Voeg het toe op het forum of in de discussies op GitHub. Vragen en wensen zijn op beide plekken welkom.

Meer: [Een fout melden](chapter:bestanden-en-opslaan#een-fout-melden) en [Hulp en feedback](chapter:offline-en-installeren#hulp-en-feedback)
