---
title: Valg og arrangering
summary: Vælge former, finde dem i objektlisten, justere, spejle, rotere, lægge fladt på en flade og formere i mønstre.
---

## Valg

Et klik på en form vælger den. Med [[Shift]] tilføjer du flere eller tager dem væk igen. Så længe [[Shift]] holdes nede, og to eller flere former er valgt, tæller et lille tal under musemarkøren dem. Et klik på tom plads rydder markeringen, og det samme gør [[Esc]]. Træk en ramme på det tomme arbejdsplan for at vælge alt den rører; med [[Shift]] holdt tilføjer rammen hvad der ikke var valgt og tager det valgte væk. Og [[Ctrl]]+[[A]] vælger alle synlige former. Mens du trækker et legeme eller et håndtag på rammen, afbryder [[Esc]], så længe museknappen stadig holdes nede: Alt går tilbage til, som det var, og intet føjes til historikken.
Hvis du hellere vil plukke én del ud af en klynge, slår du {{ui:workspace.frameByDirection}} til i indstillingerne (område {{ui:workspace.appearance}}): en ramme der trækkes til højre tager så kun hvad der ligger helt inde i den, en der trækkes til venstre stadig alt den rører, og dens linje er stiplet. Hold [[Alt]] mens du trækker for at vende rammen om for det ene træk, for eksempel for at tage hele legemer fra den side, hvor retningen ikke ville tillade det.

En form bag en anden, som et hul inde i en krop, kan du nå uden at dreje visningen: højreklik på stedet og vælg {{ui:contextMenu.selectOther}}. Menuen lister så alle former under markøren, fra forsiden til bagsiden. Den form din markør står på, er kontureret i visningen, selv gennem formerne foran den; et klik vælger den, og med [[Shift]] lægges den til markeringen. Posten er der, når mere end én form ligger under markøren; på en tablet åbner et langt tryk den samme menu.

Hvad der er i vejen skjuler du ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Skjulte former bliver i designet, de er bare ikke synlige og er ude af eksporten; eksportvinduet siger på forhånd hvor mange der er. [[Ctrl]]+[[Shift]]+[[H]] bringer dem alle tilbage. Hvad der skal blive låser du med hængelåsen øverst i indstillingerne eller med [[Ctrl]]+[[L]]. En låst form kan ikke flyttes, ændres størrelse på, vendes, omfarves eller slettes: dens håndtag bliver grå, der vises en hængelås ved siden af pilen øverst, og de værktøjer der ville ændre den er grået ud. At holde musen over et håndtag viser stadig dets størrelser, og en tast der ville ændre den siger "Objekt låst". Mens én låst form er i markeringen, ændres intet for de andre heller. Skjul, omdøb, kopier og duplikering virker stadig.

Et tal på knappen for gruppen {{ui:editor.group.visibility}} fortæller, hvor mange former der er skjult, og et klik på det viser dem alle igen. Et design, der åbnes med skjulte former, siger det én gang med en besked og en knap til at vise dem.

## Objektlisten

Med mange dele er det let at miste overblikket i visningen. Objektlisten ({{ui:editor.tool.showOutliner}} eller [[Ctrl]]+[[Shift]]+[[O]]) viser alle former som en liste.
Den bliver åben eller lukket, som du lod den være, for hvert design, indtil du lukker den; valget huskes i browseren.

![Objektlisten: gruppen "Gruppe" med to dele og en kugle ved siden af. Et mappeikon åbner gruppen.](shot:object-list)

- Et klik på en post vælger formen, inklusive dele inde i en gruppe. Med [[Shift]] holdt tilføjer du flere poster eller tager dem væk igen, ligesom i visningen. Pilene folder grupper åbne og i.
- Etiketten viser om en del er {{ui:outliner.solid}} eller {{ui:outliner.hole}}.
- Hængelås og øje låser og skjuler enkelte dele.
- {{ui:outliner.rename}} giver en del sit eget navn; blyanten ved siden af navnet øverst i indstillingerne gør det samme for den valgte form. Fornuftige navne hjælper enormt i større designs.
- Knappen A–Z i titellinjen ({{ui:outliner.sortByName}}) sorterer de former, du har navngivet, alfabetisk, med tal talt som tal (Del 2 før Del 10). Former, der stadig har deres standardnavn, bliver nedenunder i den rækkefølge, du tilføjede dem, den nyeste sidst, og dele inde i grupper sorteres på samme måde. Kun listen ændres, aldrig designet. Et klik mere viser alt i den rækkefølge, det blev tilføjet, og browseren husker valget.
- Søgefeltet finder former på navn og type, så også "cylinder" eller "hul". Det kigger også inden i grupper, uanset hvor dybt: en gruppe der indeholder et match bliver i listen og folder sig åben for at vise de matchende dele og de grupper der fører til dem. En gruppe fundet på sit eget navn viser alle sine dele når du åbner den.
- Pilen yderst til venstre på titellinjen folder listen ned til dens titellinje og tilbage igen.

Listen sidder docket lige til højre for visningskuben. Træk den i dens titellinje for at placere den hvor som helst på arbejdsplanet; den passerer under visningskuben og kamerabjælken. Slip den tilbage ved siden af visningskuben, eller dobbeltklik titellinjen, og den docker igen. Hvor den var og om den var foldet huskes i denne browser.

## Tast en position

Kortet {{ui:inspector.position}} i egenskabspanelet viser hvor den valgte form står, og du kan taste den: {{ui:prop.positionX}} og {{ui:prop.positionY}} er midten af dens boks på pladen, med de samme fortegn som afstandene vist på arbejdsplanet, og {{ui:prop.positionZ}} er højden af dens underside. Med {{ui:inspector.positionFrom}} øverst på kortet skifter du til {{ui:inspector.positionEdge}}: X og Y viser så formens venstre og forreste kant, så du kan lægge en kant præcis på et mål. Indstillingen bliver, indtil du skifter tilbage til {{ui:inspector.positionCentre}}. X tæller til højre, Y mod bag og Z op, efter højrehåndsreglen som i Tinkercad og CAD-programmer; aksepilene på pladen viser retningerne. Værdierne går i den enhed du har sat, og skydere rækker lige så langt som at trække.

## Parkér dele ved siden af pladen

Du kan trække en form forbi kanten af pladen og lade den stå der, omkring én pladebredde ud over hver side, for at gemme den til senere. Piletasterne flytter den så langt du vil. En parkeret del hører stadig til designet og kommer med i eksporten sammen med alt andet. For at udelade den, skjul den eller eksportér kun markeringen. Har du valgt en printer, advarer layerling ved eksport når noget sidder uden for dens plade.

## Snap under flytning

Når du trækker en form hen over arbejdsplanet, snapper den til andre former: dens venstre, højre, for- eller bagkant eller dens midte lander præcis på en kant eller midte af en anden form. En lyserød hjælpelinje viser hvad den holder fast i. Sådan sidder to dele lige ud for hinanden eller centreret den ene bag den anden uden at taste tal. Det virker også med gitteret slået fra.

Hold [[Shift]] mens du trækker for at holde flytningen på én akse: formen følger den retning, X eller Y, du har trukket længst i, og lader den anden være. Bedst at trykke [[Shift]] når du allerede trækker; på en form der ikke er valgt endnu, tilføjer et klik med [[Shift]] den kun til markeringen.

Med [[Alt]] allerede holdt når trækket begynder, trækker du en kopi, som i Tinkercad: formen bliver hvor den er, og kopien lander hvor du slap. At trykke [[Alt]] først på vejen pauserer snap; formen følger så kun gitteret. En kopi snapper også først når du slipper [[Alt]] på vejen. For at slå snap helt fra, brug gittermenuen nederst til højre ({{ui:inspector.objectSnap}}) eller indstillingerne. Indtil videre snapper kun flytning på det almindelige arbejdsplan, ikke løft og ikke ændring af størrelse.

## Justering

To eller flere valgte former justeres med {{ui:editor.tool.align}}: punkter dukker op omkring markeringen for venstre, centrum og højre, for, centrum og bag, og top, centrum og bund. Et klik på et punkt flytter alle former derhen. Klikker du først på en af de valgte former, bliver den hvor den er, og de andre justeres med den. En låst form i markeringen er den faste form for sig selv. Venstre, højre, for, bag, top og bund går efter kassen omkring en form; midten af en trekant, en pentagon eller en stjerne er dens egen midte, så et hul centreret på en sidder i midten af formen og ikke af dens kasse.

En form vendt i en vinkel, for eksempel med 45°, har sin kasse omkring sig at justere med, ikke dens egne kanter. For at justere med kanterne, sæt et arbejdsplan på en flade af den form først ({{ui:camera.placeWorkplane}}, klik så fladen): punkterne står så på det plans akser, og formerne måles og flyttes langs dem, som i Tinkercad. Nulstil arbejdsplanet for at justere langs pladen igen.

![Juster viser de mulige mål som prikker omkring markeringen.](shot:align)

Tasten er [[L]]. [[Esc]] annullerer.

## Spejling

{{ui:editor.tool.mirror}} ([[M]], eller højreklik på markeringen og vælg den) vender markeringen over et plan: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} eller {{ui:mirror.topBottom}}. Klik den tilsvarende akse-pil. Det er handy for symmetriske dele: byg én halvdel, kopier den og spejl kopien.

## Rotation og indstilling af rotationspunkt

Du roterer med de buede pile på formen, med tallene i indstillingerne eller med [[R]] i 45°-trin. Når du trækker på rotationscirklen, snapper drejningen til hvert hak, det er hver 22,5°; hold [[Shift]] for finere trin, og ekstra hak dukker op hver 11,25°. Træk uden for cirklen for at dreje frit i 1°-trin, eller i 45°-trin med [[Shift]]. Normalt drejer markeringen omkring sit centrum. Nogle gange bør den ikke, for eksempel når et skråt rør skal drejes yderligere ved sin ende. Til det er der {{ui:editor.tool.rotationPivot}}: klik bagefter på en flade. En flad flade giver dens centrum, for eksempel aksen på et rørs ende. På en gruppe eller et bundt løber fladen videre på tværs af de dele der mødes, som på én form, og rotationspunktet går til midten af hele fladen når delene er samlet, undtagen på en gruppe eller et bundt med tekst i, eller et bundt med et hul blandt delene. Markeringen drejer nu omkring det punkt. Endnu et klik på værktøjet fjerner det igen.

Vinklerne bliver ved formen. I dens indstillinger viser {{ui:inspector.rotation}} dem som {{ui:prop.rotateX}}, {{ui:prop.rotateY}} og {{ui:prop.rotateZ}}, navngivet som positionen: Y løber hen over pladen, Z er op. Tast en vinkel der og formen drejer til den - omkring sit centrum, eller omkring sit eget rotationspunkt hvis det har et. Mens en vendt form er valgt, vises dens vinkler også under den på arbejdsplanet; {{ui:workspace.showRotationAngles}} i indstillingerne slår det fra.

![En form vendt omkring to akser: dens vinkler står under den, og Rotationskortet i dens indstillinger tager dem som tal.](shot:rotation-card)

Med **én form** valgt hører rotationspunktet til den form: vælg andre dele og kom tilbage, så er det stadig der. Det flytter, drejer og skalerer med formen, gemmes i projektet og kommer tilbage med Fortryd. Under {{ui:inspector.position}} har rotationspunktet sit eget X, Y og Z, som du kan taste eller skubbe, og {{ui:inspector.pivotRemove}} fjerner det. Du kan også trække rotationspunktets røde markør med musen: den glider hen over formernes overflade og snapper til hjørner, kantmidtpunkter og kanter, så en hængseltap lander præcis på et hjørne. Med flere former valgt er rotationspunktet kun for den markering, og en ny markering fjerner det. Grupperer eller bundter du dem, bevares det: gruppen får drejepunktet som sit eget, med X, Y og Z under {{ui:inspector.position}}.

## Læg fladt på en flade

Skal en del ligge på sin bedste side til printning? Vælg den, klik på {{ui:editor.tool.layFlat}} og klik så den flade der skal vende ned. Mens du flytter markøren over delen, lyser fladen under den op, så du ser hvilken du er ved at vælge; drej visningen for at tjekke de andre sider. Delen vender så den flade hviler på arbejdsplanet.

To dele skal mødes flade mod flade, eller flugte? Vælg den del der skal flyttes, klik på {{ui:editor.tool.mateFaces}}, klik så dens flade og derefter den anden dels flade. I panelet lægger {{ui:mate.mode.against}} fladerne mod hinanden (ryg mod ryg, rørende), {{ui:mate.mode.flush}} lægger dem i ét plan side om side; {{ui:mate.gap}} efterlader plads mellem dem, for eksempel for frirum. {{ui:mate.apply}} flytter delen: den drejer den korteste vej indtil fladerne er parallelle - slet ikke hvis de allerede er det - og glider så kun mod den anden flade, så den beholder sin plads sideværts. Den anden del bliver hvor den er, og én Fortryd tager det hele tilbage.

![Juster flader-panelet: den del der flyttes vælges, en flade på den anden del kommer næst, så flade mod flade eller flugtende, og en valgfri afstand.](shot:mate-faces)

**Huller på én akse:** {{ui:mate.mode.concentric}} retter i stedet runde flader ind: et hul over et hul, en tap i et hul, en skrue i sit gennemgangshul. Vælg det, før du klikker på fladerne. Klik så på den runde inderside af et hul (eller ydersiden af en tap) på den del, der skal flyttes, og på en rund flade på den anden del; hele den runde flade lyser op, mens du peger på den. {{ui:mate.apply}} drejer delen den korteste vej, til de to akser er parallelle, og skubber den på tværs over på den anden akse. Langs aksen bliver den, hvor den var, så en tap beholder sin højde; skub den ind bagefter. Det virker også på importerede mesh, så længe hullet består af facetter rundt om én akse.

**En præcis vinkel mellem to flader:** {{ui:editor.tool.mateFaces}} efterlader fladerne parallelle; der er intet værktøj til en vinkel mellem dem, men sådan kommer du derhen. Først bringer du fladerne sammen med {{ui:editor.tool.mateFaces}}, så de er parallelle. Sæt så rotationspunktet på kanten hvor de mødes ({{ui:editor.tool.rotationPivot}}, klik på kanten eller et hjørne), og tast vinklen, 15 eller 30 for eksempel, i kortet {{ui:inspector.rotation}} på delen. Den drejer omkring det rotationspunkt. Kortets akser er pladens akser, så det virker når kanten løber langs X, Y eller Z.

Lige så enkle er {{ui:editor.tool.dropToWorkplane}} ([[D]]), der lægger markeringen ned på arbejdsplanet, og {{ui:editor.tool.centerOnWorkplane}}. Med arbejdsplanet på en flade centrerer det på det punkt du valgte med [[W]] og flytter kun markeringen langs fladen, så det der står på den bliver stående.

[[C]] tager markeringen op, ligesom Cruise i Tinkercad: den følger musemarkøren og lægger sig ned på fladen af en anden form du er over, også skrå. Et klik sætter den ned der, [[Esc]] lader den stå hvor den var. Dens underside hviler så på fladen, justeret med fladens kanter som en ny form ville være; den beholder sin egen drejning omkring sin op-akse. Flere dele rejser sammen og bevarer deres afstand. Over den tomme plade stiller [[C]] en skrå del oprejst på arbejdsplanet igen.
Uden et tastatur har menuen ved et langt tryk {{ui:contextMenu.carry}} til det samme.

## Mønstre: række og cirkel

Til hulgitre, boltecirkler og ringe af tænder er der {{ui:editor.tool.array}}. Vælg de former der skal formeres og klik det i båndet.

![Mønsteret i "Cirkel"-tilstand: kopierne vises først som en forhåndsvisning.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** Markeringen gentages med lige afstande. Rækken skrider frem langs alle tre akser på én gang, med {{ui:array.spacingX}}, {{ui:array.spacingY}} og {{ui:array.spacingZ}}: én af dem giver en lige række, to eller tre en diagonal række eller en trappe. En negativ afstand lægger rækken den anden vej.
- **{{ui:array.fit}}:** Til huller langs en plade, en nøgleholder eller et knagerække. Sæt det første stykke på eller ind i legemet, vælg {{ui:array.fit.x}} eller {{ui:array.fit.y}} og indstil {{ui:array.fitGap}}: originalen rykker så langt ind fra den nærmeste ende (fra kanten til stykkets side), og den sidste kopi holder samme afstand til den anden ende. Afstanden følger så {{ui:array.count}}: fem huller eller ni, de fylder altid pladen jævnt.
- **{{ui:array.mode.circle}}:** Markeringen spredes rundt om et centrum. Hvor mange kopier der er sætter du under {{ui:array.count}}, og {{ui:array.angle}} er 360° for en hel cirkel. Vælg om kopierne drejer med. {{ui:array.rise}} løfter hver kopi lidt mere end den forrige (en skrue eller en stigende spiral), og {{ui:array.radiusChange}} flytter den længere fra centrum eller tættere på det (en flad spiral); sammen giver de en konisk spiral. En spiral får højst én vinding: en vinkel over 360° tæller som en hel cirkel, og der er højst 100 kopier.

Tip: sæt først rotationspunktet på en flade med {{ui:editor.tool.rotationPivot}}, så ligger cirklens centrum præcis der.

![Mønsteret i "Cirkel"-tilstand med stigning og radiusændring pr. kopi: kopierne klatrer op og bliver bredere som en spiral.](shot:pattern-spiral)

Kopierne vises først som en forhåndsvisning. Kun {{ui:array.apply}} opretter dem. Hvis kopierne er huller, gruppér dem bagefter med den form de skal skære ind i.

Med {{ui:array.groupCopies}} sat i kryds grupperer {{ui:array.apply}} originalen og alle kopierne til ét objekt i samme skridt, som {{ui:editor.tool.group}} ville gøre: en ring på 36 stykker er så én del du kan flytte, farve eller skære med. Over 5 stykker sætter kassen sig selv i kryds; når du selv sætter eller fjerner krydset, bliver det som du har sat det. {{ui:editor.tool.ungroup}} bringer stykkerne tilbage. Hvis gruppering ikke går op, kommer mønsteret stadig ind som separate stykker, og beskeden siger hvorfor.

## Hulmønster på en flade

Til udluftninger, højttalergitre, kurve og kabinetter spreder {{ui:holePattern.title}} huller jævnt over en flad flade. Du behøver ikke længere lave ét hul, gentage det og sætte det på væggen. Vælg præcis én form og klik på {{ui:holePattern.title}} i {{ui:editor.group.modify}}-gruppen af værktøjsbjælken, ved siden af mønsteret. Du kan også højreklikke på formen, eller finde den med [[Ctrl]]+[[K]].

1. Klik en flad flade af formen. Hele den flade flade omkring dit klik tæller, ikke kun trekanten under markøren. En krum flade virker ikke: du får et tip og klikker en flad i stedet. På en gruppe eller et bundt løber fladen videre på tværs af de dele der mødes, som på én form; på et bundt kun når der ikke er et hul blandt delene. Delene lægges sammen kort efter at værktøjet er åbnet; indtil da lyser kun én dels flade op under markøren, og et klik venter på at delene er lagt sammen. På en gruppe eller et bundt med tekst i lyser kun én dels flade op, og klikket lægger delene sammen.
2. I vinduet sæt du hvordan hullerne ser ud og ligger:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} eller {{ui:holePattern.form.slot}}.
   - **Størrelse:** {{ui:holePattern.size.diameter}} for et rundt hul, {{ui:holePattern.size.side}} for et firkantet, {{ui:holePattern.size.width}} og {{ui:holePattern.size.height}} for et rektangel og en slids. For hexagon er størrelsen {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** afstanden fra ét huls midte til det næste. Hvis den er mindre end hullerne tillader, hæver layerling den til den mindst mulige værdi så en væg bliver mellem hullerne. For rektangler og slidser tæller den langs rækken, fra venstre mod højre.
   - **{{ui:holePattern.rowSpacing}}:** kun rektangler og slidser: afstanden fra én række til den næste. Så står smalle, høje huller tæt ved siden af hinanden, mens rækkerne holder afstand. Et hul 2 mm bredt og 14 mm højt har brug for 4 mm langs rækken og 16 mm fra række til række med en 2 mm væg.
   - **{{ui:holePattern.wall}}:** den samme afstand sagt på en anden måde: væggen mellem to nabohuller, det er vægtykkelsen i printet. Sæt den og afstanden center-til-center følger (for rektangler og slidser rækkeafstanden også), og omvendt. For hexagons, rektangler og slidser måler layerling den korteste afstand mellem deres kanter.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} lægger hullerne i rækker og kolonner. {{ui:holePattern.arrangement.staggered}} skubber hver anden række en halv afstand og rykker rækkerne tættere, så hvert hul har naboer i samme afstand - med hexagons bliver det en bikube.
   - **{{ui:holePattern.margin}}:** den fri afstand mellem hullerne og kanten af fladen. Kun huller der ligger helt inden for fladen minus denne margin laves; alt der ville nå ud over den udelades. Marginen holder også omkring åbninger i fladen.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (standard) skærer gennem hele væggen. Med {{ui:holePattern.depth.custom}} giver du dybden i millimeter, for forsænkninger for eksempel.
3. Hullerne vises med det samme som forhåndsvisning på fladen og følger hver værdi. Vinduet siger hvor mange huller der er plads til. {{ui:holePattern.repick}} vælger en anden flade, [[Esc]] lukker værktøjet, og ligesom de andre værktøjsvinduer flyttes det i dets titellinje.
4. Kun {{ui:holePattern.apply}} laver hullerne.

Hullerne er almindelige huller grupperet med formen, ligesom efter {{ui:editor.tool.group}}: intet er bagt ind. {{ui:editor.tool.ungroup}} opløser gruppen igen og frigør hvert hul, som du så kan flytte, ændre eller slette ét ad gangen. Hele tingen er ét skridt for {{ui:editor.tool.undo}}. Værktøjet laver højst 400 huller ad gangen; gør hullerne større eller afstanden bredere så.

En AI kan gøre det samme gennem MCP-broen med `layerling_perforate_face` (se kapitlet [AI med MCP](chapter:ai-with-mcp)).

## Skub en flade ud eller ind

Til en tykkere væg, et hævet stykke på en flade eller en lomme skåret ind i den arbejder {{ui:faceTool.title}} på én flad flade. Det virker også på en importeret STL, hvor der ingen skitse er at ændre. Vælg præcis én form og klik på {{ui:faceTool.title}} i {{ui:editor.group.modify}}-gruppen af værktøjsbjælken, ved siden af hulmønsteret. Du kan også højreklikke på formen, eller finde den med [[Ctrl]]+[[K]].

1. Klik en flad flade af formen. Som med hulmønsteret tæller hele fladen omkring dit klik, ikke kun trekanten under markøren; en krum flade virker ikke. På en gruppe eller et bundt løber fladen videre på tværs af de dele der mødes, som med hulmønsteret.
2. I vinduet:
   - **{{ui:faceTool.direction}}:** vælg {{ui:faceTool.direction.out}} for materiale der står på fladen, eller {{ui:faceTool.direction.in}} for en lomme skåret ind i den. En lomme går ikke dybere end legemet bag fladen; på en udhulet form kan den stadig nå hulrummet.
   - **{{ui:faceTool.inset}}:** hvor langt det nye omrids holder sig inde fra fladens kant. Ud ad gør 0 hele fladen, som gør en væg tykkere. Åbninger i fladen vokser med samme mål.
   - **{{ui:faceTool.radius}}:** runder hvert hjørne af omridset, også de indre, så en skarp spids ender i en bue. Et hak der er smallere end det dobbelte af radius lukkes, og en del af fladen der er smallere end det dobbelte af inset og radius tilsammen udelades.
   - **{{ui:faceTool.depth}}:** hvor langt den nye del står ud af fladen, eller hvor dybt lommen går.
   - **{{ui:faceTool.separate}}:** med kontakten til er den nye del (eller hullet i en lomme) et legeme af sit eget ved siden af formen i stedet for en gruppe med den, så du kan ændre dens størrelse, flytte den eller bruge den til at skære med det samme.
3. Resultatet vises med det samme som forhåndsvisning og følger hver værdi. {{ui:faceTool.repick}} vælger en anden flade, [[Esc]] lukker værktøjet.
4. Kun {{ui:faceTool.apply}} laver det.

Det værktøjet tilføjer, er et almindeligt skitselegeme, grupperet med formen med mindre end {{ui:faceTool.separate}} er slået til (så har {{ui:group.edit}} intet at åbne, og delen står frit): intet er bagt ind. {{ui:group.edit}} åbner gruppen, og {{ui:inspector.editSketch}} på den nye del viser det omrids, den følger. På toppen eller bunden af et rent skitselegeme – ét område, ikke grupperet, spejlet, spidst, snoet eller hældende, og uden streg, nøgleringshul, runding eller fas – er det legemets eget omrids, sat ind da det blev bygget, så dets linjer og buer forbliver nøjagtige, hvor CAD-kernen kan sætte dem ind, til kantværktøjerne og STEP-eksporten. Ændres størrelsen senere, beholder delen sit inset. På enhver anden flade, og på alle flader i et importeret mesh, følger omridset fladens trekanter, og en kurve består af korte lige stykker. Hele tingen er ét skridt for {{ui:editor.tool.undo}}. Vil du ændre inset eller radius senere, fortryd og kør værktøjet igen. Vil du runde topkanten bagefter, bruger du {{ui:editor.tool.fillet}} med {{ui:edge.topEdges}} på gruppen som sidste skridt: som enhver kantbehandling på en gruppe fører den gruppen sammen til ét legeme.

En AI kan gøre det samme gennem MCP-broen med `layerling_push_face` (se kapitlet [AI med MCP](chapter:ai-with-mcp)).

## Ændre flere dele på én gang

Med flere dele valgt viser egenskabspanelet til højre hvor mange der er og tilbyder hvad der gælder for dem alle sammen: {{ui:inspector.solid}} eller {{ui:inspector.hole}}, én farve for alle (et klik på {{ui:inspector.solid}} åbner farverne) og låsen. Med en blandet markering gør ét klik dem alle til solider eller alle til huller. Hvis nogen af delene er låst, kan kun låsen bruges. Størrelser ændres med håndtagene, med {{ui:scalePercent.title}} eller ved at taste et tal ind i en størrelsesetiket. Med flere dele er tallet hele markeringens størrelse: hver del vokser med den, mellemrummene mellem dem også, som når du trækker et håndtag. Solid og hul virker også med højreklik eller tasterne [[S]] og [[H]].

## Skalér med procent

For at gøre en eller flere dele større eller mindre med den samme andel, for eksempel alle dele i en printfil med 20 %, brug {{ui:scalePercent.title}}. Vælg delene, højreklik på dem og vælg {{ui:scalePercent.title}}, eller søg efter den med [[Ctrl]]+[[K]].

Under {{ui:scalePercent.percent}} taster du den nye størrelse som en procent af den aktuelle: 120 % er en femtedel større, 50 % halv størrelse. Bredde, dybde og højde ændres ens, så proportionerne bevares. Bunden bliver hvor den er, så intet synker ned i pladen.

Med flere dele vælger du hvordan de vokser:

- **{{ui:scalePercent.mode.together}}:** Delene vokser omkring deres fælles centrum, og mellemrummene vokser med dem. Hele bliver større som om det var én del.
- **{{ui:scalePercent.mode.each}}:** Hver del vokser hvor den står, og mellemrummene mellem dem forbliver de samme.

Kun {{ui:scalePercent.apply}} ændrer designet, og ét skridt tilbage fortryder det. Med en låst del i markeringen åbner det ikke.
Procentfeltet har fokus, når vinduet åbner, så fra tastaturet er det [[Ctrl]]+[[K]], procenten, [[Enter]]; [[Esc]] lukker vinduet.

## Fortryd

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) og {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] eller [[Ctrl]]+[[Y]]) går gennem din historik. Hvor mange skridt der rejser med det gemte design sætter du i indstillingerne under {{ui:workspace.history}}. Peg på en af knapperne, så nævner dens værktøjstip det trin, den fortryder eller gendanner, med målet hvis trinnet har et, fx "Rundede kanterne på Box (5 mm)"; beskeden bagefter siger det samme. Vil du gå flere trin tilbage på én gang, så brug historikvisningen nedenfor.

## Se tilbage: historikvisningen

{{ui:editor.tool.history}}, ved siden af fortryd og gendan, åbner en visning af din historik uden at ændre noget. Arbejdsområdet viser designet som det var, og en skyder i bunden løber gennem hvert fortryd-trin: helt til højre er den aktuelle tilstand, hvert skridt til venstre er et fortryd tidligere, og tilstande du har fortrudt sidder til højre for den aktuelle. Piletasterne går gennem tilstandene, [[Esc]] vender tilbage til den aktuelle tilstand. Musehjulet over skyderen gør det samme, én tilstand pr. hak, op til en tidligere; [[Page Up]] og [[Page Down]] springer ti tilstande, [[Home]] går til den ældste tilstand og [[End]] tilbage til den aktuelle. Du kan dreje og zoome visningen imens og klikke på objekter for at hente dem tilbage (se nedenfor), men intet kan flyttes; designet selv forbliver præcis som det er. Dækker bjælken noget, så træk den væk i dens titellinje; et dobbeltklik på den bringer den tilbage. Listeknappen i titellinjen viser alle trin med navn i en liste, det nyeste øverst: et klik på et trin går til den tilstand, tilstanden designet står i er markeret med {{ui:historyView.listNow}}, og trin du har fortrudt er grå. Lader du listen stå åben, er den åben næste gang.

To ting kan du tage med fra en tidligere tilstand. {{ui:historyView.createProject}} lægger den tilstand i et nyt design i overblikket, opkaldt efter dette med tidspunktet for den tilstand i parenteser - et design gemt før layerling registrerede tider siger "kopi" i stedet - og med historikken op til det punkt, så fortryd bliver ved med at virke der. {{ui:historyView.export}} åbner den sædvanlige eksport med den tilstand som designet, så du kan gemme det som STL, 3MF, STEP, et billede eller en LYL-fil med historikken op til den tilstand.

Du kan også hente enkelte objekter tilbage i designet. Klik på et objekt i den viste tilstand - [[Shift]]+klik tilføjer flere eller fjerner et igen, et klik i det tomme vælger intet - og vælg {{ui:historyView.bringBack}}. Visningen lukker, og en kopi af hvert objekt kommer ind i det nuværende design, præcis som det var i den tilstand og på det sted, det stod der, valgt, ved siden af alt det, designet rummer nu; intet andet ændres. Det er ét trin, så fortryd tager det tilbage. Brug det til en version af en del, du siden har ændret eller slettet. En gruppe kommer tilbage hel; noter og referencepunkter på et objekt bliver tilbage. Navnet bærer tidspunktet for den tilstand, f.eks. „Kasse (12:32)“, så det er let at skelne fra den version, designet har nu. For at hente en del tilbage fra en gruppe vælger du gruppen og vælger {{ui:historyView.openGroup}} eller trykker [[E]], som i designet: delene lægges der, hvor redigering af gruppen ville lægge dem, klar til at vælge, og bjælken viser, hvilken gruppe du er i. {{ui:historyView.backOut}} lukker den igen. Det er kun for at se - gruppen, designet og historikken forbliver, som de er.

{{ui:historyView.delete}} sidder alene nederst til venstre i bjælken. Efter et spørgsmål fjerner den hvert tidligere trin for evigt: designet beholder den tilstand det har nu (ikke den viste), Fortryd har intet at gå tilbage til, og en fil gemt bagefter har ingen historik. Brug den til at dele et design uden dets fortid, eller til at starte fortryd-trinnene forfra. Det kan ikke fortrydes; for at dele en fil uden at røre dit eget design, vælg {{ui:export.historyNone}} når du eksporterer i stedet.
