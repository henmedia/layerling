---
title: Visning og arbejdsplan
summary: Bevæge dig rundt i scenen, kigge lige på, og placere nye former på enhver overflade du vil.
---

## Bevæge dig rundt

Med musen:

| Hvad du gør | Hvad der sker |
| --- | --- |
| træk med højre knap | drej visningen |
| klik med højre knap | på en form, en menu med de mest brugte kommandoer: duplikér, hul eller solid, gruppér, skjul, lås, slet og mere; på tom plads Indsæt og Vælg alle |
| træk med midterste knap | flyt visningen |
| musehjul | zoom ind og ud |
| hold [[Ctrl]] / [[Cmd]] og træk med venstre knap | flytter også visningen |
| dobbeltklik på et tomt sted på arbejdsplanet eller ved siden af pladen | flytter visningen, så stedet kommer i midten; visningen drejer derefter om det |

På en MacBook-trackpad: hold [[Cmd]] nede, tryk og træk. På en Mac drejer du i stedet visningen ved at holde Control nede, som Control-klik er højreklik på Mac.

Hvor hurtigt musehjulet zoomer sættes med {{ui:workspace.zoomSpeed}} i indstillingerne, under {{ui:workspace.appearance}}: en skyder fra 1 til 14, 5 til at begynde med. Den gælder kun musehjulet og trackpad'en: knapperne og tasterne [[+]] og [[−]] zoomer altid i de samme små trin. Et hak på et musehjul zoomer ens i alle browsere, en trackpad zoomer efter hvor langt du stryger.

På en tablet eller telefon zoomer to fingre (spred og knib) og flytter visningen (glid sammen). Én finger arbejder på designet, ligesom venstre museknap. For at dreje med én finger, slå {{ui:camera.touchRotate}} til i kamerabjælken. Den kontakt vises kun på enheder med en berøringsskærm.

Én finger på tom plads drejer visningen, og et tryk dér rydder markeringen.

En tegneplade med en pen opfører sig som en mus: spidsen er venstre knap, sideknappen på pennen er højre knap, til at dreje visningen og til menuen. Pladens genvejstaster kan sættes i dens driver til layerlings [tastaturgenveje](chapter:shortcuts).

**På en tablet: arbejd med en stylus, hvis du kan.** Spidsen er langt finere end en fingertip og dækker ikke det, du sigter på, så små punkter, tynde linjer og håndtag i en skitse samt målepunkter og kanter rammes præcist, og længere arbejde er mindre trættende. layerling lader allerede en finger nå lidt længere ud til punkter, linjer, håndtag og kanter end en musepeger gør, men en stylus er stadig den mest præcise vej. Det gælder en pen, som tabletten kender som en pen (en S Pen, en Apple Pencil og lignende). En almindelig stylus med gummispids tæller som en finger for skærmen og er ikke finere end en.

Der er ingen højre museknap på en tablet: hold en finger stille på en form eller på tom plads i et halvt sekund, så åbner den menu, som et højreklik åbner, med **Vælg alle** på tom plads. **Vælg flere** i samme menu erstatter Shift på en tablet: hvert tryk på en form lægger den så til markeringen eller tager den ud igen, indtil du trykker på tom plads eller trykker [[Esc]]; en finger på tom plads drejer stadig visningen. Håndtagene rundt om en valgt form kan du gribe med en finger lidt ved siden af dem.

### Visningskuben

Kuben øverst til venstre viser hvor du kigger. Et klik på en af dens sider springer til den lige visning fra top, bund, for, bag, venstre eller højre. Et klik på et hjørne af kuben kigger på modellen diagonalt fra det hjørne, og et klik nær en kant kigger fra den kant, mellem to sider; stedet lyser op mens markøren er på det. Taltasterne [[1]] til [[6]] giver også de lige visninger. Hold [[Shift]] med dem og visningen zoomer også til markeringen, ligesom [[Shift]]+[[F]].

Træk i kuben for at dreje visningen rundt, ligesom at trække med højre museknap. Med intet valgt drejer piletasterne også visningen: 15° pr. tryk, 90° med [[Shift]]. De drejer modellen den vej de peger - [[→]] drejer dens forside til højre, [[↑]] vipper dens forside opad. Med [[Ctrl]] holdt nede flytter pilene i stedet visningen hen over skærmen: en tiendedel af billedet pr. tryk, halvdelen med [[Shift]] oveni. Modellen flytter sig den vej, de peger. Hvis noget er valgt, flytter pilene det; klik på tom plads først for at dreje visningen. På en berøringsskærm virker dette med én finger, uden at slå {{ui:camera.touchRotate}} til.

### Kamerabjælken

Ved venstre kant er en smal bjælke. Fra toppen:

- {{ui:camera.home}} bringer hele scenen tilbage i visningen. Tasten er [[Home]]; [[F]] gør det også, når intet er markeret.
- {{ui:camera.focusSelection}} zoomer til markeringen ([[F]] eller [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} og {{ui:camera.zoomOut}} zoomer skridt for skridt, ligesom tasterne [[+]] og [[−]].
- {{ui:camera.orthographic}} skifter til en flad visning hvor parallelle kanter forbliver parallelle. Til måling og justering af kanter er det ofte mere behageligt end perspektivvisningen. [[O]] skifter frem og tilbage, og endnu et klik vender tilbage.
- {{ui:camera.secondView}} åbner en anden visning af designet i sit eget vindue, beskrevet nedenfor. Et klik mere lukker det.
- {{ui:camera.hideWorkplane}} (øjet over et gitter) skjuler pladen med sit gitter, så du kan se undersiden af et design nedefra. Kun visningen ændres: nye former lander stadig på arbejdsplanet. Endnu et klik viser den igen.
- {{ui:camera.placeWorkplane}}, målebåndet og vinkelmåleren er deres egne værktøjer, dækket nedenfor og i [Måling og noter](chapter:measuring-and-notes).

Den lille pil helt øverst på bjælken skjuler den hvis den er i vejen.

Et design åbner som du forlod det: visningens vinkel, zoom og position gemmes med det i denne browser, så du fortsætter hvor du stoppede, også efter at have trykket Hjem eller lukket siden. En gemt fil (.lyl) tager visningen med sig, så den åbner i den andre steder også. Visningen er ikke del af fortryd-historikken.

Du kan også gemme fire af dine egne visninger i hvert design. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] eller [[Shift]]+[[0]] gemmer visningen præcis som den er - vinkel, position, zoom, og flad eller perspektiv - under den tast, og tasten alene ([[7]], [[8]], [[9]] eller [[0]]) henter den tilbage. En besked forneden bekræfter at den er gemt; gemmer du igen under samme tast, erstattes visningen. Ligesom visningen ovenfor bliver de gemte visninger hos designet i denne browser og følger med i en gemt fil (.lyl); de er ikke del af fortryd-historikken.

### En anden visning i sit eget vindue

{{ui:camera.secondView}} åbner et vindue, der viser det samme design gennem sit eget kamera, så du kan se det fra to sider på én gang - forfra, for eksempel, mens du arbejder ovenfra. Hver ændring, du laver i editoren, vises der med det samme; selve designet ændres kun i hovedvinduet, og håndtagene bliver også der. I det andet vindue drejer musen og visningsterningen dets visning som her, og det gør tasterne også: [[1]] til [[6]], [[F]], [[Home]], [[O]], [[+]] og [[−]], piletasterne til at dreje og [[Ctrl]] med pilene til at skubbe. [[F]] zoomer der ind på det, der er valgt i editoren. Designets fire gemte visninger virker der også: [[7]], [[8]], [[9]] og [[0]] henter dem tilbage, og [[Shift]] med en af disse taster gemmer vinduets visning under den - for begge vinduer. Dets egen kamerabjælke har {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} og {{ui:camera.hideWorkplane}}, og de virker kun på det vindue. Vinduet åbner, hvor du forlod det, i samme størrelse, og lukker sammen med editoren. På telefoner og tablets vises knappen ikke.

## Kigge indeni: snitvisningen

{{ui:camera.sectionView}}, den sidste knap i bjælken (skæreværktøjet), skærer visningen op langs et plan så du kan tjekke vægge, hulrum og dele der passer ind i hinanden. Intet skæres for alvor: designet, dets filer og hver eksport forbliver hele. Hvor planet går gennem et legeme, er snittet fyldt med legemets farve, lidt mørkere, og et hul i det forbliver tomt, så du kan se fast fra hult; den fyldte flade dukker op et øjeblik efter, at planet står stille. Under {{ui:camera.sectionCutFace}} vælger du, hvordan snittet ser ud: {{ui:camera.sectionCutFaceHatch}}, standarden, skraverer det som en tegning, og et legeme inde i et andet er skraveret den anden vej, så de to skiller sig ud; {{ui:camera.sectionCutFaceFill}} udfylder det ensfarvet; {{ui:camera.sectionCutFaceOpen}} lader det være åbent, og du ser ind i legemets skal. Valget gælder for alle designs.

- Vælg den akse planet står på tværs af: X (bredde), Y (dybde) eller Z (højde), som i positionsfelterne. Planet starter i midten af dit design.
- {{ui:camera.sectionOrientation}} bestemmer, hvad disse akser følger. {{ui:camera.sectionOrientationWorld}} bruger designets akser. {{ui:camera.sectionOrientationWorkplane}} bruger arbejdsplanets: Z skærer så parallelt med det, X og Y på tværs, og positionen tælles fra dets origo. Ligger arbejdsplanet på en skrå flade, skærer du altså parallelt med den flade, og snittet følger med, når du flytter arbejdsplanet. {{ui:camera.sectionOrientationView}} vender planet mod skærmen: det fjerner det, der ligger foran, og med skyderen skubber du det dybere ind i designet i blikretningen, for eksempel for at nå en skjult del og klikke på den. Drejer du derefter visningen, klikker du på den igen, og snittet følger det nye blik.
- {{ui:camera.sectionCoarse}} flytter planet hen over hele designet, {{ui:camera.sectionFine}} flytter det lidt til hver side fra hvor det står, for tiendedele millimeter. Du kan også taste positionen.
- Knappen ved siden af akserne viser den anden side af snittet, {{ui:camera.sectionReset}} sætter planet tilbage i midten, og {{ui:camera.sectionShowPlane}} skjuler det blå plan.
- Du kan klikke og vælge hvad snittet lægger åbent, indvendige vægge inkluderet.
- {{ui:camera.sectionWorkplane}} lægger arbejdsplanet på snittet. Det ligger på snitplanet og vender ud af den form der bliver, ligesom den flade et snit efterlader. Hvis du så skifter til skitsen, starter den præcis dér, og det svage omrids viser snittet, som du kan tegne langs og snappe til. Det er sådan du skitserer et låg der passer til det hulrum du åbnede med snittet, for eksempel. Knappen ved siden af akserne vælger hvilken side der bliver, og dermed hvilken vej arbejdsplanet vender. Du lægger arbejdsplanet tilbage på grundpladen som sædvanligt.
- {{ui:camera.sectionSketch}} starter en ny skitse lige på snittet, hvor snittets omrids allerede ligger som linjer: et hul kommer ind som en ægte cirkel, et afrundet hjørne som en bue. Ret dem, slet det, du ikke skal bruge, tegn videre og afslut: formen vokser ud af snittet mod den side, der er skåret væk, så en del, der skal passe til en anden, som et låg, en indsats eller en pakning, starter med netop den dels omrids. Knappen ved siden af akserne vælger den side. Som ved SVG'en tæller kun synlige former, og huller er allerede trukket fra.
- {{ui:camera.sectionMeasure}} måler direkte på snittet: omridset vises i blåt, og to klik på det giver afstanden, plus dens dele langs planets to akser. Begge punkter snapper til omridset, hjørner først. Når det andet klik lander hvor som helst på den modsatte væg, snapper det vinkelret på det første punkt - så du aflæser vægtykkelse, mellemrum og frirum uden at sigte præcist. Et tredje klik starter den næste måling, [[Esc]] afslutter målingen. Flytter du planet ryddes målingen.
- På et rundt omrids, som et snit gennem en cylinder eller et hul, markerer et lille kryds centrumet, og centrumet snapper også. Klik på et punkt på cirklen, og gå så tæt på det modsatte punkt: det andet klik lander lige over for centrumet, og tallet læses Ø, diameteren. Fra centrumet til et punkt på cirklen får du R, radiusen.
- {{ui:camera.sectionExportSvg}} gemmer omridsene på skæreplanet som en SVG i 1:1, til en laser, en plotter, en skabelon eller en pakning. Et X-snit ses fra højre, et Y-snit forfra, et Z-snit oppefra. Som i eksporten kommer kun synlige former med, huller er allerede taget af, og former med samme farve samles til ét omrids. Hver farve forbliver sin egen sti uden fyld, så lasersoftware holder dem adskilt som lag.

Panelet hænger på sin knap. Hvis det dækker noget, så træk det i dets titellinje hvor som helst på arbejdsplanet; det åbner dér næste gang også. Dobbeltklik på titellinjen eller slip det ved knappen for at sætte det tilbage.

X og [[Esc]] lukker panelet; med en måling i gang afslutter [[Esc]] den først. Snittet bliver, indtil du slår det fra med {{ui:camera.sectionActive}} eller går tilbage til designoversigten. En tablet har ingen [[Esc]], så der har panelet to knapper mere: {{ui:camera.sectionBack}} afslutter målingen, hvis en kører, og lukker ellers panelet, og {{ui:camera.sectionConfirm}} lukker panelet i ét skridt. En computer viser dem ikke.

## Arbejdsplanet

Nye former justeres med arbejdsplanet. Til at starte med er det grundpladen med gitteret. Men du kan lægge det på enhver overflade, for at placere noget på en side eller en skrå flade.

1. Tryk [[W]] eller klik på {{ui:camera.placeWorkplane}}.
2. Flyt musen over en flade på en form. Den lyser op.
3. Et klik lægger arbejdsplanet der. Alt hvad du tilføjer nu sidder på den flade.

Klik på den tomme plade i stedet, og arbejdsplanet ligger fladt på det sted du klikkede, på snapgitteret. Nye former og en færdig skitse, også en revolveret, vises så dér i stedet for i midten af pladen. Mens arbejdsplanet ligger fladt på pladen sådan, viser pladen kun sit omrids: to gitre i samme plan ville lave et flimrende mønster.

På en flade snapper arbejdsplanets nulpunkt ellers til gitteret. Klik tæt på et hjørne af fladen og det sidder præcis på det hjørne. Tæt på en kant ligger det på kanten, og gitteret flugter med det; det er sådan du med vilje vælger gitterets vinkel. Uden et hjørne eller en kant løber gitteret på en liggende flade parallelt med formen, så på en vendt kasse er det vendt med den.

Et klik ved siden af pladen eller [[Esc]] returnerer arbejdsplanet til grundpladen. Hurtigere er {{ui:camera.resetWorkplane}}: knappen med pilen nedad sidder i kamerabjælken under øjet mens arbejdsplanet ligger på en flade. [[Shift]]+[[W]] lægger det direkte på den aktuelt valgte flade. [[Alt]]+[[W]] lægger det altid tilbage på grundpladen, uanset om noget er valgt. Holder du [[Shift]] mens du klikker, peger planet den anden vej.

Mens et arbejdsplan ligger på en flade, dukker et øje op ved siden af {{ui:camera.placeWorkplane}}. Det skjuler arbejdsplanet uden at droppe det, for et klart blik på designet: nye former lander stadig på den flade, og rotation drejer stadig omkring det. Et klik på øjet viser det igen, og det samme gør et nyt arbejdsplan.

## Gitter og snap

Gitteret viser pladens størrelse. Nederst til højre er **snap-trinnet**: flytning og skalering snapper i trin af den størrelse, for eksempel 1 mm. Gør det mindre til fint arbejde og større til grov arrangering. {{ui:editor.tool.snapToGrid}} i båndet flytter de valgte former bagefter hen på det nærmeste gitterkryds. Mens der flyttes, snapper former også til andre former, se [Valg og arrangering](chapter:select-and-arrange). Uden musen: [[Alt]]+[[1]] til [[Alt]]+[[0]] vælger den post i menuen med det nummer ([[Alt]]+[[1]] slår snapping fra), og [[,]] og [[.]] gør trinnet ét trin finere eller grovere. Det virker i en skitse også.

> **Tip:** Stop med at dreje visningen når du sætter dele helt præcist sammen. Brug taltasterne til at gå til den lige visning fra top eller for og tryk [[O]] for den flade visning. Så ser du straks om to kanter virkelig flugter.
### Indstillingsvinduet

Tandhjulet i båndet ({{ui:editor.workspaceSettings}}) åbner indstillingerne. Til venstre er fem områder: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} og {{ui:workspace.history}}. En ændring gælder med det samme. {{ui:workspace.makeDefault}} nederst gemmer de aktuelle indstillinger som standard, så et nyt design starter med dem. En fil du åbner bringer sine egne indstillinger med; {{ui:workspace.useMyDefault}} ved siden af den lægger dine gemte farver, dit gitter og resten på det åbne design, mens enhederne bliver som de er. Står der en printer i din standard, kommer den med sin pladestørrelse; ellers beholder designet sin plade og sin printer. {{ui:workspace.close}} øverst til højre lukker vinduet. Det her gennemgår indstillingerne én for én.

### Udseende: tema, værktøjsbjælke og visningskube

{{ui:workspace.theme}} sætter farveskemaet for hele programmet: {{ui:workspace.themeSystem}} følger din computer, de andre er {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} og {{ui:workspace.themeGraphite}}. Du kan også ændre det øverst til højre i editoren.

{{ui:workspace.toolbarSize}} gør knapperne i båndet øverst, dets formmenu, kamerakontrollerne til venstre og egenskabspanelet til højre mindre eller større: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (som det altid var) eller {{ui:workspace.toolbarSizeLarge}}. Små efterlader mere plads til arbejdsplanet på en bærbar; store er lettere at ramme på en stor skærm eller med en finger. Med store knapper går båndets grupper på en anden række når vinduet er for smalt til dem. Størrelsen gemmes i denne browser og holder for hvert design.

{{ui:workspace.shapeColors}} sætter den farve, en ny form starter med, på billederne i formbiblioteket (farven for sin art, eller den du gemte med {{ui:inspector.saveDefaults}}). Slå det fra, hvis du foretrækker grå billeder; din browser husker valget.

{{ui:workspace.viewCubePosition}} sætter visningskuben i et andet hjørne af arbejdsplanet: {{ui:workspace.viewCubePositionTopLeft}} (som det altid var), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} eller {{ui:workspace.viewCubePositionBottomRight}}. I alle hjørner undtagen øverst til venstre rykker kamerakontrollerne op på den plads, kuben forlod. Nederst til højre står kuben lige over {{ui:inspector.snapGrid}}-kontrollen. Mens en forms egenskaber er åbne til højre, viger en kube i højre side til venstre for dem. Hjørnet gemmes i denne browser og holder for hvert design. I et smalt vindue, som på en telefon, er indstillingen skjult, og kuben bliver øverst til venstre.

### Udseende: hurtig tilstand

{{ui:workspace.fastMode}} er til langsommere computere. Den slår skygger, kantlinjer på alle former og kameraets inerti fra og tegner kun visningen i skærmopløsning. Dine egne indstillinger gemmes til senere, og de kontakter den overskriver siger {{ui:workspace.offInFastMode}}, mens den er slået til. Mere om hvad der hjælper på en langsom computer står under "Når layerling føles langsom" nedenfor.

### Udseende: farver i arbejdsområdet og i skitsen

Arbejdsområdets farver sættes under {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} og {{ui:workspace.surfaceColor}} for det lyse tema (de mørke temaer beholder deres egne), ved siden af gitterfarven under {{ui:workspace.workplane}}. Hver farve er en knap, der viser farven. Et klik åbner et lille vindue med farvefeltet, en række færdige farver, et felt til hex-værdien og en pil, der sætter farven tilbage til den, layerling startede med. [[Enter]] tager en tastet hex-værdi, og det gør også et klik uden for vinduet.

Skitsevisningen har sine egne farver: {{ui:workspace.sketchBackground}} for vinduet omkring arket, {{ui:workspace.sketchPlateColor}} for arket under gitteret, og {{ui:workspace.sketchGridColor}}, alle for det lyse tema. {{ui:workspace.sketchMatch}} tager arbejdsområdets tre farver i ét klik.

{{ui:workspace.classicLook}} sætter arbejdsområdet op som Tinkercad viser det: hvid bund, et lyseblåt millimetergitter med en mørkere linje hver centimeter, sorte kantlinjer, lys fra oven med bløde skygger. Hver værdi kan stadig ændres for sig bagefter. Alle starter som layerling altid har set ud, og hvad der passer dig afhænger af din skærm.

![Indstillingerne under Udseende: baggrunds- og arbejdsplanfarver for det lyse tema, og kontakten for kantlinjer på alle former.](shot:settings-appearance)

![Editoren i det mørke farveskema. Du sætter farveskemaet øverst til højre: System, Lys, Mørk eller Grafit.](shot:editor-dark)

### Udseende: aksepile og kantlinjer

{{ui:workspace.showAxes}} (til som standard) tegner tre pile ved pladens bagerste venstre hjørne: **X** i rød til højre, **Y** i grøn bagud og **Z** i blå opad, den måde positionsfelterne tæller på. Det er højrehåndsreglen Tinkercad, CAD-programmer og slicerne også bruger. Med arbejdsplanet på en flade følger de den. Slå dem fra her hvis de er i vejen.

{{ui:workspace.edgeLines}} tegner et omrids på hvert legeme, i farven {{ui:workspace.edgeColor}} (sort til at begynde med, som i Tinkercad): det hjælper når mørke farver løber sammen. Det er fra som standard, og meget store importerede meshes udelades.

![Tre mørke former med kantlinjer slået til: omridsene holder dem adskilt.](shot:edge-lines)

{{ui:workspace.strongHoles}} tegner huller i en mørkere grå, mindre gennemsigtige og med en mørk linje rundt om. Det hjælper, når et hul er svært at finde mellem gennemsigtige former. I modsætning til kantlinjerne forbliver det slået til i hurtig tilstand.

### Udseende: lys og skygger

{{ui:workspace.showShadows}} slår kasteskyggerne til og fra. To skyder sætter hvordan formerne belyses. {{ui:workspace.shadowStrength}} siger hvor mørke kasteskyggerne er, og {{ui:workspace.shadeContrast}} flytter lys fra det jævne omgivende lys til hovedlyset: mod "kraftig" bliver de skyggefulde sider mørkere og skyggerne viser mere, mod "blød" bliver alt fladere. I den øverste ende bliver kontrasten meget stærk, så skyggefulde sider og skygger bliver virkelig mørke. {{ui:workspace.shadowSoftness}} gør skyggernes kanter bløde i stedet for skarpe. {{ui:workspace.lightAzimuth}} drejer hovedlyset rundt om pladen (0° forfra, 90° fra højre), og {{ui:workspace.lightElevation}} løfter det; ved 90° står det lige over pladen som i Tinkercad, og skyggerne falder lige under formerne. {{ui:workspace.softLighting}} henter det meste af lyset fra den retning, du ser i, og det drejer sig med synet: ingen flade bliver mørk, og en mørk flade der vender opad brændes ikke længere ud til hvidt. Hovedlyset bliver lidt tilbage til skyggerne, og kontrastskyderen virker stadig. Hvis der stadig vises en lys refleks med lyset sat lavt, hæver du {{ui:workspace.lightElevation}} til 90°: så ser det ud som i Tinkercad. {{ui:workspace.lightReset}} sætter alt tilbage.

### Udseende: mål på arbejdsplanet

{{ui:workspace.showMoveDimensions}} viser hvor meget du flytter, mens du drager, {{ui:workspace.showOriginDimensions}} afstandene fra markeringen til pladens nulpunkt, også når flere legemer er valgt. Med {{ui:workspace.dimensionsAlwaysVisible}} forbliver målene synlige hele tiden, og ikke kun mens du drager. Mens en vendt legeme er valgt, vises dens vinkler under den på arbejdsplanet; {{ui:workspace.showRotationAngles}} slår det fra. Mere i [Måling og noter](chapter:measuring-and-notes).

### Udseende: markering og flytning

{{ui:workspace.selectBeforeMoving}}: et legeme skal så være markeret først, og først det næste træk flytter det. Det hjælper, når børn eller travle hænder rører ved legemer, og på en berøringsskærm.

{{ui:workspace.frameByDirection}}: en ramme, der trækkes til højre, markerer kun det, der ligger helt inden i den, en ramme, der trækkes til venstre, markerer alt, den rører (tegnet stiplet), som i SketchUp.

{{ui:workspace.doubleClickOpensSketch}} afgør, om et dobbeltklik på en presset skitse åbner skitsen igen, som i Tinkercad, og {{ui:workspace.doubleClickOpensGroup}} om et dobbeltklik på en gruppe eller et bundt åbner det til redigering. {{ui:workspace.doubleClickCentersView}} afgør, om et dobbeltklik på et tomt sted på arbejdsplanet flytter visningen derhen.

{{ui:workspace.objectSnap}} lader kantene og centrum af en form snappe til andre former, mens du trækker den; gittermenuen nederst til højre har den samme kontakt. {{ui:workspace.cruise}} får en ny form til at hænge ved musepegeren og lande på fladen under den, som Cruise i Tinkercad; slået fra dukker en ny form op i midten af pladen. Mere i [Valg og arrangering](chapter:select-and-arrange).

### Udseende: visningen

{{ui:workspace.startInPerspective}}: editoren åbner så i perspektivvisning, ikke i den flade.

{{ui:workspace.startView}} bestemmer den vinkel, et nyt design åbner i, og som {{ui:camera.home}} vender tilbage til. Drej og zoom visningen, som du kan lide den, og klik så {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} giver den sædvanlige visning forfra til højre igen. Det gælder alle designs i denne browser. Et design, du åbner igen, åbner stadig, som du forlod det.

{{ui:workspace.zoomSpeed}} er en skyder fra langsom til hurtig: hvor hurtigt hjulet og trackpad'en zoomer; zoomknapperne og tasterne beholder deres egne små trin. {{ui:workspace.cameraInertia}}: når du slipper musen, drejer visningen videre et øjeblik og falder blødt af. Slået fra stopper den med det samme, som i Tinkercad og Fusion 360.

{{ui:workspace.overhangAngle}} er den vinkel, hvorfra en flade tæller som et overhæng, når du slår **Vis overhæng** til i menuen ved siden af øjet: de flader skraveres rødt og hvidt. 30° er det forsigtige valg, 70° regnes på god køling af printet; 45° er det sædvanlige startpunkt.

{{ui:workspace.booleanTriangleLimit}} sætter en grænse for, hvor mange trekanter et importeret mesh må have, når du skærer det, samler det eller tager et snit i det, fordi det beregnes i din browser. Et mesh over grænsen behandles ikke; forenkler meshet først, eller hæv grænsen, hvis din computer kan klare det. En højere grænse kan få editoren til at hænge i nogle få sekunder.

### Mål: enheder, skala og snap-trin

Under {{ui:workspace.measurement}} sætter du {{ui:workspace.units}}, den enhed mål vises i ({{ui:workspace.scale}}: millimeter, centimeter eller meter i det metriske system, tommer eller fod i det imperative), hvor mange decimaler et tal viser ({{ui:workspace.accuracy}}), det {{ui:workspace.snapGrid}}, som flytning og skalering snapper til, og dine egne snap-trin under {{ui:workspace.customSnapGrids}}.

Under {{ui:workspace.measurement}} i indstillingerne sætter du {{ui:workspace.units}}. Med {{ui:units.imperial}} viser layerling hvert mål i tommer, på formen, i egenskabspanelet, på målebåndet og linealen. Snapgitteret tilbyder så trin fra 1/64 til 1 tomme, og gitteret på pladen tegnes i tommer (1/8 til 1 tomme, 1/4 tomme som standard) med en stærkere linje hver hele tomme. Under {{ui:workspace.inchFormat}} vælger du om tommer vises som brøker som i Tinkercad (1 5/8, afrundet til 1/64 tomme) eller som decimaler (1.625) med så mange decimaler som sat under {{ui:workspace.accuracy}}. Du kan taste begge dele, "1 5/8" inkluderet. Hurtigere skifter du mellem millimeter og tommer med den lille kontakt **mm | in** ved siden af {{ui:inspector.snapGrid}} nederst i egenskabsvinduet: Den ændrer enheden, pladens gitter og fangtrinnet som indstillingerne, for dette design.

Under {{ui:workspace.customSnapGrids}} samme sted tilføjer du dine egne snap-trin: et navn og en størrelse i millimeter, for eksempel "Pin pitch 2,54 mm" for afstanden mellem DIP-chips, pin headers og perfboard-huller, eller "MX Key Unit" med 19,05 mm for afstanden mellem tastaturtaster. Snap-trinsmenuen tilbyder så det mål helt, halvt og kvart (1 ×, ½ × og ¼ ×), så former kan flyttes med en pitch, en halv pitch eller en kvart pitch. Vil du kun have målet selv, fjerner du flueben ved {{ui:workspace.customSnapGridParts}} ved siden af det; menuen har så kun det ene trin. Brugerdefinerede trin gemmes med designet og følger med {{ui:workspace.makeDefault}}.

### Arbejdsplan: plade og printer

{{ui:workspace.printer}} tilpasser arbejdsplanet til din printers byggeplade og markerer legemer der rækker ud over den, se [Printning](chapter:printing). {{ui:workspace.showPlateLabels}} skriver designets navn på pladen, og printerens navn og byggevolumen når der er valgt en printer.

{{ui:workspace.size}} giver pladen en størrelse af din egen, med {{ui:workspace.width}} og {{ui:workspace.length}} i millimeter eller den enhed du valgte. Gitteret løber altid gennem nulpunktet, så de stærkere linjer ligger på akserne uanset pladens mål.

### Arbejdsplan: gitter

{{ui:workspace.showGrid}} viser eller skjuler gitteret på pladen. {{ui:workspace.gridBlockSize}} sætter afstanden mellem dets linjer, og {{ui:workspace.gridMajorEvery}} om den mørkere linje kommer hver 5. eller hver 10. gittertrin; {{ui:workspace.gridMajorColor}} giver den linje sin egen farve, og centerkrydset og pladekanten tager den også. {{ui:workspace.gridColor}} er farven på de almindelige linjer.

Hver linje i gitteret vokser i bredden når du zoomer ind, som i Tinkercad, og forbliver synlig når du zoomer ud. Hvis det er for meget for dig, så slå {{ui:workspace.gridLinesGrow}} fra, og linjerne forbliver en pixel brede ved hvert zoom, som i skitsen.

Er gitteret forsvundet, for eksempel fordi en farve blev sat til pladens farve, bringer {{ui:workspace.resetGrid}} i slutningen af området {{ui:workspace.workplane}} synlighed, farver, afstand og stregtykkelse tilbage til standard, her og i den standard, der er gemt med {{ui:workspace.makeDefault}}.

### Formstandarder

Under {{ui:workspace.shapeDefaults}} vælger du en form med {{ui:workspace.shape}} og sætter, hvordan den starter, når du tilføjer den: dens bredde, længde og højde. {{ui:workspace.useAppDefaults}} fører formen tilbage til den, appen starter den med. Former med egne indstillinger viser dem under {{ui:workspace.shapeDetails}}. Værdierne gælder nye former, ikke dem der allerede er på pladen. {{ui:workspace.customLimit}} sætter en grænse af din egen for, hvor store håndtagene og egenskaberne må gøre den form; står feltet tomt, bliver de sædvanlige grænser ved.

### Gemt historik

Under {{ui:workspace.history}} sætter skyderen {{ui:workspace.savedHistory}}, hvor mange afsluttede handlinger der forbliver tilgængelige for fortryd, efter du har gemt eller genåbnet et design. Standarden er 100 handlinger i et design. En lavere grænse fjerner permanent de ældre fortryd-trin i designet.

## Når layerling føles langsom

layerling beregner og tegner alt i din browser. På en ældre computer, med et svagt grafikkort eller på flere store skærme kan visningen derfor føles sløv. Det her hjælper:

- **{{ui:workspace.fastMode}}** under {{ui:workspace.appearance}} slår med det samme alt fra hvad visningen koster meget: skygger, kantlinjer på alle former og kameraets inerti. Den tegner også kun visningen ved skærmens egen opløsning, hvilket på højopløsningsskærme er op til fire gange færre pixels. Dine egne indstillinger gemmes og gælder igen så snart du slår det fra.
- **Kameraet bliver ved med at dreje:** Når du slipper musen efter at have drejet, fortsætter visningen et øjeblik og stopper blødt. Det er med vilje, ikke hakken. Hvis du er vant til Tinkercad eller Fusion 360, så slå {{ui:workspace.cameraInertia}} fra under {{ui:workspace.appearance}}, og visningen stopper med det samme.
- **Enkelte kontakter:** Uden hurtig tilstand kan du også bare slå {{ui:workspace.showShadows}} eller {{ui:workspace.edgeLines}} fra.
- **Brug grafikkortet:** I Chrome åbn `chrome://gpu` (i Edge `edge://gpu`). Ved siden af "WebGL" skal der stå "Hardware accelerated". Hvis der står "Software only", er hardwareacceleration slået fra i browserens indstillinger. På Windows kan du også vælge "Høj ydeevne" for browseren under Indstillinger → System → Skærm → Grafik, så den bruger det rigtige grafikkort og ikke det svagere i processoren.
- **Forenkl store importerede meshes:** En model med flere hundredtusind trekanter sænker enhver visning. Hvordan du tynder den ud er i kapitlet om filer, under "Forenkling af et importeret mesh".
- **Luk andre faner:** Hver åben layerling-fane og hver anden 3D-side deler det samme grafikkort.
