---
title: Bryd kanter og hul former
summary: Fas og rund på valgte kanter, vægge med jævn tykkelse til kasser, krus og kabinetter.
---

## Fasning og runding af kanter

Skarpe kanter ser sjældent godt ud på en printet del, og de er heller ikke specielt stærke. En **fas** skærer kanten af i en vinkel, en **rund** afrunder den. Begge virker på de kanter du klikker.

1. Vælg formen (eller gruppen).
2. Klik på {{ui:editor.tool.fillet}} eller {{ui:editor.tool.chamfer}} i båndet, tryk [[B]] for rund eller [[Shift+B]] for fas, eller højreklik formen og vælg det fra menuen.
3. Formens kanter lyser op. Klik dem der skal berøres. Endnu et klik tager en kant ud igen. Med [[Shift]] tilføjer eller fjerner du en enkelt kant.
4. Sæt størrelsen og bekræft med {{ui:edge.apply}} eller [[Enter]]. Bagefter forbliver vinduet åbent på det nye legeme med samme størrelse, så den næste afrunding eller affasning kan følge med det samme; {{ui:edge.done}}, [[Esc]] eller krydset lukker det. Med [[Shift]] eller [[Ctrl]] føjer et klik på {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} eller {{ui:edge.horizontalEdges}} disse kanter til de valgte i stedet for at erstatte dem.

!["Rund kanter"-værktøjet: alle skarpe kanter er valgt, billedet viser forhåndsvisningen med 4 mm radius.](shot:fillet-preview)

Panelet sidder øverst til højre. Hvis det dækker kanter du vil klikke, træk det væk i dets titellinje; det åbner dér næste gang også, og det samme gør {{ui:editor.tool.hollow}} og {{ui:editor.tool.array}}. Dobbeltklik titellinjen for at sætte det tilbage.

At vælge en form fra formlisten mens panelet er åbent lukker det uden at anvende noget, og de kanter du klikkede glemmes. Klikket placerer så den nye form i stedet for at vælge kanter.

I panelet finder du:

- {{ui:edge.allSharpEdges}} vælger alle kanter på én gang, {{ui:edge.clear}} tømmer markeringen.
- **{{ui:edge.radius}}** for runding. For fas sætter du {{ui:edge.distance}} eller {{ui:edge.angle}}.
- {{ui:edge.variableRadius}} (kun for runding) lader radius ændre sig langs én kant: lille i den ene ende, større i den anden, jævnt imellem, som hvor en lige væg møder en skrå. Klik en enkelt kant, og sæt så {{ui:edge.radiusStart}} og {{ui:edge.radiusEnd}}. Hvilken ende der tæller som starten, følger af hvordan kanten blev bygget; kommer den større radius ud i den forkerte ende, vender {{ui:edge.swapEnds}} den om. Det virker på én kant ad gangen, så rund flere kanter efter hinanden. {{ui:edge.editAction}} tager begge værdier tilbage.
- {{ui:edge.sharpThreshold}} bestemmer hvilke kanter der overhovedet tæller som skarpe. En værdi på 25° behandler kun klare knæk som kanter og lader flade overgange være.
- {{ui:edge.verticalEdges}} vælger de kanter der står lige op, som hjørnerne af en kasse: én runding runder så alle de lodrette hjørner på én gang.
- {{ui:edge.topEdges}} vælger kun kanterne langs den allerøverste top af formen. Det er den hurtige vej til en småkageudstikker: byg omridset i en skitse som en streg, fas så topkanterne. {{ui:edge.angle}} sætter hvor stejl faser er; den kan ikke nå længere end væggen er tyk.
- {{ui:edge.bottomEdges}} vælger kun kanterne langs den allernederste bund af formen, modstykket til {{ui:edge.topEdges}}. Det er den hurtige vej til kun at afrunde eller affase foden på en del.
- {{ui:edge.chamfillet}}, valgt øverst i affasningsvinduet ved siden af {{ui:editor.tool.chamfer}}, laver den printbare fod på en del: en affasning ved pladen, der går tangentielt over i en afrunding mod væggen, så de første lag ikke behøver støtte, og kanten alligevel ender blødt. {{ui:edge.distance}} er den højde, foden fylder, {{ui:edge.angle}} (15° til 75°) hvor stejl affasningen er ved pladen. Kanterne vælger du med {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} skjuler kanterne der ligger bag formen fra hvor du kigger. Som standard vises hver kant igennem formen, hvilket bliver forvirrende på en travl del; med kontakten til ser du, og kan klikke, kun de kanter der vender mod dig. Drej visningen for at nå de andre. En kant tegnet i rødt (se nedenfor) vises altid.
- {{ui:edge.tangentChains}}: et klik vælger så også kanter der glat flyder ind i hinanden, for eksempel alle kanter rundt om en flade med rundede hjørner. Kontakten bestemmer kun hvad et klik vælger: CAD-kernen fører altid en fas eller rund med videre langs sådanne glat fortsættende kanter. Panelet fortæller dig langs hvor mange flere kanter det sker.
- {{ui:edge.keepSize}} bevarer fasen eller runding som den er, selvom du skalerer formen senere.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} eller {{ui:edge.fine}}) bestemmer hvor fint forhåndsvisningen beregnes. For vanskelige dele er {{ui:edge.draft}} hurtigere.

Mens du justerer størrelsen, genberegner layerling forhåndsvisningen. Det kan tage et øjeblik. Du må blive ved med at justere; den sidste værdi du valgte er det der beregnes.

Hvis størrelsen er for stor til kanten, siger layerling det og foreslår en mindre værdi. Ofte gør et eller to millimeter mindre det. Ved skarpe vinkler har en rund brug for mere plads end dens radius antyder. På en lille skærm ruller panelet selv ned så beskeden er i syne.

Når en markering der virkede fejler efter du klikker én kant mere, bliver den kant rød og tegnes bredere: det er den der ikke kan behandles sammen med de andre ved denne størrelse. Klik den igen for at tage den ud, eller gør størrelsen mindre. Klikker du flere kanter mens beskeden står, bliver den første ved med at være rød. Når der ikke er en tidligere markering der virkede - det allerførste klik, eller en størrelse du lige hævede - bliver kanterne der fejler selv alene røde, eller alle sammen hvis det kun er deres kombination.

Kanten under markøren tegnes også bredere, så du kan se hvilken et klik vil vælge.

### Tage en kantbehandling tilbage

En behandlet form kan altid behandles igen. Vælg den igen og åbn værktøjet - Rund, Fas eller Hul, hver viser listen: under {{ui:edge.featureHistory}} ser du hvad der allerede er på den. {{ui:edge.revertAction}} tager en enkelt behandling tilbage. Bemærk: hvis nyere behandlinger ligger ovenpå, følger de med, og panelet fortæller dig hvor mange.

Ved siden af en fas, en rund eller en udhuling er der også {{ui:edge.editAction}}. Den tager behandlingen tilbage på samme måde, men åbner værktøjet igen med det samme med de samme kanter og den gamle værdi. Du ændrer værdien og anvender igen: en 3 mm rund bliver til 5 mm uden at klikke kanterne igen. Hvis nyere behandlinger ligger ovenpå, følger de med her også. Det gælder for kantbehandlinger du laver fra nu af; ældre tilbyder kun at tage tilbage, og det samme gør enkelte dele af en gruppe.

På en gruppe, for eksempel en cylinder med et hul, hører den behandlede kant til den færdige form, ikke til en af dens dele. Så bliver gruppen til én form. {{ui:editor.tool.ungroup}} virker alligevel: Det tager først kantbehandlingerne tilbage og opløser derefter gruppen, i ét trin som [[Ctrl]]+[[Z]] fortryder. Tag behandlingen tilbage som beskrevet ovenfor og gruppen vender tilbage med alle sine dele. Den nemmeste måde er at behandle kanter til sidst. Det gælder også gevind: kantværktøjet tager et gevind som dets eksakte form, så en blok med et gevindhul får sine kanter rundet med gevindet på plads. At beregne et gevinds kanter tager længere end for en almindelig form, et par sekunder for en M6 og omkring et halvt minut for et G1/2-rørgevind.

> **Godt at vide:** layerling arbejder med rigtig CAD-geometri til runding og fas, ikke kun et mesh af trekanter. Det er derfor en rundet kant stadig er en rundet kant i STEP-eksporten.

En del importeret som STEP beholder også sin CAD-geometri: fas, rund og udhuling virker på formen fra filen, uanset hvor fint delen er tegnet på skærmen. STL, OBJ og 3MF bringer kun trekanter, og en fint tegnet del kan være for tæt for kantværktøjet. Hvis en del også er tilgængelig som STEP, importér den.

## Udhuling af former

Kasser, krus, kabinetter og låg har én ting til fælles: de er tomme indeni, med vægge af jævn tykkelse. Det er præcis det {{ui:editor.tool.hollow}} gør.

1. Vælg formen og klik på {{ui:editor.tool.hollow}}, eller højreklik formen og vælg det fra menuen.
2. Sæt {{ui:shell.wall}}.
3. Under {{ui:shell.openings}} slår du de sider til der forbliver åbne: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} eller {{ui:shell.side.right}}, så mange du vil - kun {{ui:shell.side.front}} laver en slids til en skuffe, {{ui:shell.side.left}} og {{ui:shell.side.right}} en tunnel. Med ingen side slået til forbliver formen lukket hele vejen rundt, med et hulrum i midten. {{ui:shell.side.closed}} slår alle sider fra med ét klik. {{ui:shell.side.top}} er allerede slået til, når panelet åbner; et klik på den lukker toppen igen. Et legeme, der er lukket hele vejen rundt, ser uændret ud udefra: snitvisningen viser hulrummet.
4. Bestem om {{ui:shell.edges}} skal være {{ui:shell.edges.round}} eller {{ui:shell.edges.sharp}}.
5. Klik på {{ui:shell.apply}}.

![Udhulingspanelet med vægtykkelse, en kontakt for hver side der forbliver åben, og de indvendige kanter.](shot:hollow-panel)

Væggene vokser indad. Ydersiden forbliver som den er.

{{ui:shell.edges}} betyder kun noget hvor de indvendige vægge går fra hinanden - ved et trin i formen eller omkring en åbning. Hjørnerne på hulrummet i en almindelig kasse er altid skarpe, med begge indstillinger. For en rundet inderside, rund formens ydre kanter først (se ovenfor), så hul den ud: indersiden følger med radius minus vægtykkelsen. Hvis den rundede inderside ikke kan bygges, hvilket kan ske med et omrids lavet af meget mange korte lige stykker såsom en tegnet skitse, bygger layerling den samme udhulede form med skarpe indvendige hjørner i stedet.

![Resultatet: en skal med 3 mm væg, åben foroven.](shot:hollow-result)

![Den samme kasse med kun forsiden åben: en slids til en skuffe.](shot:hollow-sides)

For hver åben side har formen brug for en flad flade helt ude ved kanten på den side. Kugler og frie former kan derfor ikke udhules på denne måde. Hvis væggen er for tyk til formen, siger layerling det og beder om en tyndere.
 En rundet kasse, hvis top- og bundkanter også er rundet, er et sådant tilfælde: væggen skal være tydeligt tyndere end den runding, eller sæt rundingen til 0 først.

En form med en lomme - en blok med et hul der ikke går hele vejen igennem, lavet ved at gruppere en kasse med et hævet hul - kan også udhules, med toppen åben: væggene rundt om lommen udhules også, så en ring af hulrum bliver mellem ydervæggen og lommen, åben foroven, og et tyndt hulrum ligger under lommens bund.

**Former der ender i en spids,** såsom en kegle eller en revolvet trekant, har ingen flad flade på toppen der kan forblive åben. Et helt lukket hulrum virker der heller ikke, fordi en spids ikke kan forskydes indad: selv med 1 mm væg får du beskeden om at væggene ikke kan være så tykke. Tegn væggen ind i profilen før du revolverer i stedet: duplikér omridset, skalér kopien ensartet ned, læg den i midten af det store omrids og skær det store med det, så revolver det hele (kapitel Skitser, afsnit Revolver). Afstanden mellem de to omrids er vægtykkelsen.

Hvis du ændrer størrelse på en udhulet form senere, udhuler layerling den igen med det samme ved den nye størrelse. Væggen forbliver så tyk som du valgte, runde former inkluderet. En cylinder du trækker længere den ene vej end den anden bliver til en ellipse. Afrundinginger og affasninger du lagde på den efter udhulingen lægges igen på de samme kanter.

> **Tip:** Med en 0,4 mm dyse er 1,2 til 2 mm væg et godt udgangspunkt: tyndt nok til at spare materiale, tykt nok til en solid del.

## Et låg til et åbent legeme

{{ui:editor.tool.lid}} laver låget til et legeme, der er åbent foroven: en kasse, du har udhulet med åben top, en potte, en bakke. Vælg legemet og klik på {{ui:editor.tool.lid}}. I vinduet vælger du typen:

- {{ui:lid.type.plug}}: en plade så stor som legemet med en læbe nedenunder, der går ind i åbningen.
- {{ui:lid.type.cap}}: en plade en væg bredere end legemet med en kant nedenunder, der går uden om.
- {{ui:lid.type.flat}}: kun pladen, til at lægge ovenpå eller lime på.

Derefter indstiller du tykkelsen ({{ui:lid.thickness}}), pasningen ({{ui:lid.fit}}, spalten pr. side mellem låg og legeme: 0,1 mm stramt, 0,2 mm normalt, 0,3 mm løst eller enhver værdi op til 1 mm) og hvor dybt læben eller kanten når ned, og hvor tyk dens væg er. Klik på {{ui:lid.apply}}: låget ligger ved siden af legemet, vendt med pladen nedad, så det printes uden støtte. Legemet forbliver, som det er. Låget følger enhver omrids, rundt eller kantet, fordi det tages fra selve legemet lige under dets kant. Et legeme uden åbning foroven får kun et fladt låg; til de to andre skal du først udhule det med åben top.

> **Tip:** Hvor stramt et låg sidder, afhænger af printeren. Print først en lille kasse med låg; sidder det for stramt, så vælg den næste, løsere pasning.

## Forskyd legemer

Hver flade på et legeme kan flyttes den samme afstand, udad eller indad. Det er, hvad en pasning, et låg eller en snapsamling har brug for: et spillerum på 0,1 til 0,3 mm hele vejen rundt, mens detaljerne bliver, hvor de er, hvad skalering ikke kan give.

1. Vælg ét legeme og klik på {{ui:editor.tool.offset}}, eller højreklik på legemet og vælg det der.
2. Vælg {{ui:offset.grow}} eller {{ui:offset.shrink}} og indstil {{ui:offset.distance}}.
3. {{ui:offset.edges}} bestemmer de ydre hjørner: afrundet holder den forskudte flade rund, skarp lader fladerne løbe videre, til de mødes.
4. Sæt hak ved {{ui:offset.copy}} for at beholde delen, som den er, og få det forstørrede legeme som en kopi, der allerede er et hul. Grupper hullet med modstykket, så skærer det præcis det spillerum, du valgte.
5. Klik på {{ui:offset.apply}}.

Uden hak forskydes selve legemet. Det bliver et fast, nøjagtigt legeme, som efter en affasning: listen øverst i panelet tager forskydningen tilbage, og {{ui:edge.editAction}} åbner værktøjet igen med den gamle afstand. Kun nøjagtige CAD-legemer kan forskydes - kasser, cylindre og de andre former, grupper af dem, importerede STEP-dele. Et legeme, der kun er et mesh af trekanter, som mange STL-importer, kan ofte ikke. En afstand, der er for stor til legemet, for eksempel en formindskelse ud over den tyndeste væg, afvises.

## Slet flader

En runding i vejen, et hul på det forkerte sted, et buldug du ikke har brug for mere: {{ui:editor.tool.deleteFace}} tager det af formen igen, uden at formen bygges på ny.

1. Vælg formen og klik på {{ui:editor.tool.deleteFace}}, eller højreklik formen og vælg det fra menuen.
2. Klik hver flade af det der skal væk: fladerne af en runding, væggen i et hul, siden og toppen af et buldug. En valgt flade lyser op; endnu et klik tager den ud igen. Panelet tæller fladerne.
3. Klik på {{ui:deleteFace.apply}} eller tryk [[Delete]]. [[Esc]] lukker værktøjet uden at ændre noget.

Fladerne omkring de slettede vokser, indtil hullet er lukket. En kasse med rundede topkanter får sine skarpe kanter tilbage, et hul bliver fyldt, et buldug er væk. Formen bevarer sin eksakte form, så den kan faseres og rundes igen, og STEP-eksporten beholder dens sande flader. [[Ctrl]]+[[Z]] tager sletningen tilbage i ét skridt. Den står også under {{ui:edge.featureHistory}} sammen med runder og faser, hvor {{ui:edge.revertAction}} tager den tilbage; der er ingen {{ui:edge.editAction}} til den. På en gruppe er resultatet ét legeme, som ved en kantbehandling.

Vælg alle fladerne af det der skal væk, og kun dem. Kan fladerne omkring dem ikke lukke hullet, siger layerling det, og intet ændres: en hovedside af en kasse har for eksempel ingen nabo, der kan tage dens plads. Sletter du kun bunden af en lomme, bliver den til et hul lige igennem, fordi lommens vægge løber videre på den anden side.

{{ui:editor.tool.deleteFace}} kræver eksakte flader: det virker på dele importeret som STEP og på layerlings egne former. Det layerling gemmer som mesh har ingen: en importeret STL, OBJ eller 3MF, en delt, viklet eller forenklet form, eller en meget detaljeret form som et langt stykke tekst. Importer en del som STEP, hvis du kan. På en detaljeret importeret del kan nogle få flader være for meget for CAD-kernen: efter 45 sekunder stoppes sletningen, og intet ændres. En form der ændres i størrelse efter en kantbehandling, mens kantstørrelsen bevares, har ingen eksakte flader i den nye størrelse, indtil ændringen af størrelsen tages tilbage.
