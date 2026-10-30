---
title: "Skitser: fra omrids til form"
summary: Tegn et fladt omrids, rund eller fas dets hjørner, og træk eller spin det til en form.
---

Ikke alt kan sættes sammen af basiske former. For dele med deres eget omrids, såsom et beslag, en tandprofil eller en vase, tegner du først **omridset** og laver så en form af det. Det er det skitsetilstand er til.

## Start en skitse

Øverst skifter du fra {{ui:editor.modeGeometry}} til {{ui:editor.modeSketch}}. Klik på {{ui:sketch.to3d}} i båndet og vælg hvad omridset skal blive: De tre knapper står side om side i {{ui:sketch.group.create}}-gruppen.

- **{{ui:sketch.extrude}}:** Omridset trækkes opad, som en småkageudstikker.
- **{{ui:sketch.revolve}}:** Omridset spindes omkring en akse, som på en drejebænk. Det giver vaser, krus, kegler og alt andet rundt.
- **{{ui:sketch.sweep}}:** Omridset trækkes langs en sti: en kabelkanal der går i et hjørne, et rør, en afskærmning omkring en rem, en ring omkring en sekskant. Se Træk omridset langs en sti nedenfor.

Editoren viser så et ark med et gitter. Det er din tegneflade.

## Tegning

Båndet i skitsetilstand er delt i områder:

- **Tegn:** {{ui:sketch.line}} laver lige sektioner: klik punkter ét efter ét; at holde [[Shift]] snapper den nye linje i 15°-trin, vandret og lodret inkluderet. Den nye linjes længde og vinkel vises ved markøren. Du kan også taste hvor lang den skal være, se [Linjer med tal](#linjer-med-tal). {{ui:sketch.arc}} tegner en ægte cirkelbue gennem tre punkter: klik dens to ender først, så et tredje punkt buen løber gennem; indtil det tredje klik følger en forhåndsvisning markøren, og beskeden nævner radius. En ende der klikkes på et eksisterende punkt følger med, så en bue kan lukke et omrids. [[Esc]] kaster de klikkede punkter væk og går tilbage til {{ui:sketch.select}}. Bagefter er buen almindelig geometri lavet af punkter og kurver: flyt, skær eller slet den som enhver anden linje. {{ui:sketch.bezier}} formes med sine håndtag: klik et punkt og træk i den retning linjen skal fortsætte, som med pen-værktøjet i Illustrator eller Inkscape. Jo længere du trækker, jo mere bøjer den; strækket til det nye punkt bøjer med mens du trækker, så du ser hvad du får. At trække mens du placerer et punkt bøjer kurven; kommer du fra Tinkercad og bare vil klikke punkter, så tag {{ui:sketch.smooth}}. {{ui:sketch.smooth}} lægger en flydende sti gennem de punkter du klikker. For at lukke omridset, klik det første punkt igen til sidst.
- **Former:** {{ui:sketch.addShape}} tilbyder færdige omrids: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (en skive med huller), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, en {{ui:sketch.polygon}} og en {{ui:sketch.star}}. Klik én for at lægge den ved skitsens nulpunkt, eller træk den fra menuen hen hvor du vil have den. Nederst i menuen sætter {{ui:sketch.polygonSides}} antallet af sider på polygonen og antal spidser på stjernen, og {{ui:sketch.starInner}} hvor dybt stjernens dale når ind mod midten (10 til 90 procent af den ydre radius); begge gælder for den næste form du tilføjer. Ligesom enhver skitseform er de almindelige hjørnepunkter bagefter, så du kan flytte, runde eller fase dem én ad gangen. Du afslutter rækken af punkter uden at lukke omridset med et højreklik uden at flytte musen eller med et dobbeltklik på det sidste punkt.
- **Overlap:** Skub to lukkede omrids over hinanden og de bliver to former, som flettes i 3D-editoren; overlap er ikke et hul. Et hul kommer kun fra et omrids der ligger helt inden i et andet. At flytte samler ikke linjerne hvor de krydser, så du kan trække formerne fra hinanden igen. Tegner du en linje hen over andre, lægger layerling et punkt ved hvert kryds.
- **Valg:** {{ui:sketch.select}} flytter punkter og linjer. Et klik inden i et lukket omrids vælger hele omridset, så du kan trække eller ændre størrelse på det med det samme; inden i et hul vælger det hullet. Rammen omkring markeringen har otte håndtag: hjørnerne ændrer bredde og højde sammen, mens du holder [[Shift]] bevares proportionerne. Dem på siderne ændrer kun én retning. {{ui:sketch.keepProportions}} i den bjælke der dukker op holder proportionerne uden [[Shift]]: hjørnerne og siderne strækker så begge veje, og en indtastet bredde eller højde ændrer den anden også. layerling husker indstillingen. {{ui:sketch.lockOutline}} ved siden af den låser det valgte omrids, som en låst form i 3D-editoren ([[Ctrl]]+[[L]] gør det samme): det kan ikke længere flyttes, ændres i størrelse, drejes eller ændres, dets linjer bliver blegere og dets punkter grå, og rammens håndtag bliver grå og reagerer ikke længere. Mens det er valgt, låser et klik på hængelåsen i dets hjørne det op. Linjer må stadig starte ved dets hjørner. {{ui:sketch.unlockOutline}} eller [[Ctrl]]+[[L]] igen frigiver det. De buede pile ved rammens hjørner drejer hele markeringen omkring dens midte: tallet over markøren viser vinklen, og med [[Shift]] holdt drejer den i 15°-trin. Mens du drejer, vises en ring: med markøren inden for den snapper drejningen i trin på 22,5°, uden for går den i hele grader, uanset gitteret. [[R]] drejer et helt lukket omrids 45° pr. tryk. Klik på bredde- eller højde-pillen for at taste en ny størrelse, også som en sum ("60+12,5") eller i procent ("150%"). Med [[Shift]] holdt tilføjer et klik på et punkt eller en linje det til markeringen eller tager det væk igen, så du kan vælge flere og flytte dem sammen. Træk en boks over tom plads for at vælge alt i den. En linje kan også trækkes (den flytter med dens to ender, eller hele markeringen hvis den er del af en). Piletasterne flytter markeringen med ét gittertrin, [[Shift]] med dem med et større, og [[Shift]] holdt mens du trækker holder flytningen på én akse. {{ui:sketch.refine}}: et klik på en sektion tilføjer et punkt, et klik på et punkt fjerner det. Der er også {{ui:sketch.erase}} (et klik på et punkt eller en linje fjerner det, et vindue trukket over flere fjerner alt i det, og med en markering sletter knappen markeringen) og indsættelse af et skabelonbillede ({{ui:sketch.addImage}}). Når du fjerner et punkt, samler layerling dets to naboer, så omridset forbliver lukket. For at lukke en åben flade, for eksempel efter at du har slettet en side af en sekskant, trækker du den ene åbne ende hen på den anden: den snapper derhen, og de to bliver til ét punkt, så omridset er lukket igen. Ved et kryds, som der hvor en linje skærer en cirkel, samles de sider der løber lige videre: bue med bue, linje med linje, og cirklen bliver rund. Vil du kun af med en del af en cirkel, et rundet hjørne for eksempel, klikker du lige på den del af buen mellem to punkter med radieren; resten bliver.
- **Udklipsholder:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} og {{ui:editor.tool.delete}} virker på de valgte punkter, linjer og billeder, som i 3D-editoren; [[Ctrl]]+[[X]] klipper. Indsat og duplikeret geometri lander ved siden af originalen med 10 mm mellemrum, på en fri plads hvor den ikke rører nogen eksisterende linje, så den aldrig bliver samlet med det der allerede er der. Den forbliver valgt, så du kan trække den direkte på plads.
- **Historik:** {{ui:sketch.undo}} og {{ui:sketch.redo}}.
- **Administrér:** {{ui:editor.tool.note}} (eller [[N]]) sætter en note på skitsen, som i 3D-editoren: det næste klik placerer den, hvor som helst, også på en linje. Træk i nålen for at flytte den; et klik på nålen folder kortet sammen. En skitses noter hører til dens form: i 3D-visningen sidder de oven på en form lavet med {{ui:sketch.extrude}} eller {{ui:sketch.sweep}} og på den tegnede profil af en form lavet med {{ui:sketch.revolve}}, og de flytter sig med den. Åbner du skitsen igen, viser den alle formens noter, også dem der er sat i 3D. {{ui:sketch.undo}} tager en note tilbage ligesom en linje, og {{ui:sketch.cancel}} kasserer det, der er ændret i noterne. Mere i kapitlet Måling og noter.
- **Visning:** Panorér med midterste museknap eller med [[Shift]] eller [[Ctrl]] plus højre museknap, som i 3D-editoren. Når intet er markeret, flytter [[Ctrl]] og piletasterne den også: en tiendedel af billedet pr. tryk, halvdelen med [[Shift]] oveni; skitsen flytter sig den vej, pilene peger. [[Home]] tilpasser hele skitsen til visningen, [[F]] zoomer til markeringen (uden markering til hele skitsen), og [[+]] og [[−]] zoomer ind og ud, som i 3D-editoren. Uden markering skubber et dobbeltklik på et tomt sted visningen, så stedet kommer i midten, som i 3D-editoren; {{ui:workspace.doubleClickCentersView}} i indstillingerne slår det fra. {{ui:camera.tapeTools}} på sidebjælken måler afstanden mellem to punkter. Skitsen viser også dimensioner så snart du klikker noget: længden af en linje, eller for et punkt længden af de linjer der mødes der. {{ui:sketch.showMeasurements}} på sidebjælken skjuler og viser disse dimensioner når de er i vejen, for eksempel mens man former kurver; målebåndet bliver ved med at virke. På en lige linje kan du klikke dimensionspilen og taste længden i millimeter; [[Enter]] anvender, [[Esc]] annullerer. Linjen beholder sin retning, dens startpunkt bliver hvor det er, og linjerne i den anden ende følger med. Med et slutpunkt valgt, flytter det. [[Alt]]+[[Enter]] vokser linjen til begge sider omkring sin midte. På kurver viser pillen kun længden.

En form kommer kun fra et **lukket** omrids.

![Et L-formet omrids. Ved det valgte hjørnepunkt, øverst til venstre, vises længderne af de to linjer i millimeter, og vinklen mellem dem i grader.](shot:sketch-outline)

Tasterne [[1]] til [[4]] vælger tegneværktøjerne, i båndets rækkefølge: {{ui:sketch.line}}, {{ui:sketch.bezier}}, {{ui:sketch.smooth}} og {{ui:sketch.refine}}. De virker så længe ingen linje tegnes; mens der tegnes en linje, er cifrene dens længde (se nedenfor). Med {{ui:sketch.select}}-værktøjet og linjer eller punkter valgt ændrer de samme taster dem i stedet: [[1]] gør linjer lige og punkter til hjørner, [[2]] gør linjer til kurver og [[3]] gør punkter glatte. Med intet valgt vælger de værktøjet som før.

## Linjer med tal

Når du har sat det første punkt med {{ui:sketch.line}} eller {{ui:sketch.smooth}}, tast bare et tal: to felter åbner ved siden af linjen, {{ui:sketch.typedLength}} i millimeter og {{ui:sketch.typedAngle}} i grader. [[<]] eller [[Tab]] flytter til vinklen, så "50<30" giver en linje på 50 mm ved 30°, som i AutoCAD. [[Enter]] sætter punktet, og du kan taste den næste linje med det samme; [[Esc]] lukker felterne uden at afslutte linjekæden.

Vinklen tæller mod uret fra højre: 0° til højre, 90° op, 180° til venstre, 270° ned. Lad den stå tom og linjen følger markøren, så du kun angiver længden og viser retningen med musen. Summer som "40+12,5" virker i begge felter. Hvis punktet ville lande uden for pladen, siger feltet det og venter på en anden værdi.

## Krum en lige side

Vælg en lige linje og klik på {{ui:sketch.curveLine}} i den bjælke der dukker op: siden buer ud til en kurve, som i Tinkercad, og viser sine to håndtag. Træk dem for at forme kurven; jo længere ud et håndtag står, jo stærkere bøjningen. Under markøren bliver et håndtag orange, og det fanger også et klik lige ved siden af, så et skabelonbillede nedenunder ikke flyttes ved et uheld. {{ui:sketch.straightenLine}} gør siden lige igen. Et punkt du vælger kan gøres rundt med {{ui:sketch.smooth}}: det får sine egne håndtag og linjerne ved siden af bliver kurver. Med tre eller flere punkter valgt lægger {{ui:sketch.curveThroughPoints}} i bjælken én glat kurve fra det første af dem til det sidste, gennem hvert punkt imellem, sådan som værktøjet {{ui:sketch.smooth}} tegner en; linjerne uden for de to ender bliver som de er. I andre programmer hedder det "Fit curve" eller "Fit point spline". Forskellen: {{ui:sketch.curveLine}} bøjer hver valgt side for sig og beholder hjørnerne imellem dem, til en bue på én side; {{ui:sketch.curveThroughPoints}} lægger én kurve gennem punkterne uden hjørner, til at glatte en takket, aftegnet kant. Klik på et håndtag og det lyser op: piletasterne flytter det så ét gittertrin, med [[Shift]] et større trin, så du kan sætte en kurve præcist.

![L-sidens nederste side bøjet til en kurve, med sine to håndtag i enderne.](shot:sketch-curve)

## Læse og taste vinkler

Klik et hjørnepunkt hvor to **lige linjer** mødes: ved siden af længderne viser layerling **vinklen** mellem dem i grader, med en lille bue. På et lukket omrids er det vinklen inden i formen, så en bule læses over 180°. Klik værdien og tast en ny vinkel. En af de to linjer drejer så om hjørnet og bevarer sin længde, og den anden bliver hvor den er. Linjen der drejer er tegnet stiplet; [[Tab]] skifter til den anden, [[Enter]] anvender og [[Esc]] annullerer. Hvad der hænger i den yderste ende af den drejede linje følger med.

At flytte et punkt ændrer tre vinkler: ved punktet selv og ved de to nabohjørner i enderne af dets linjer. Så layerling viser også dem, og hver kan klikkes og tastes. Sådan sætter du for eksempel det nederste venstre hjørne til 75,5° mens det øverste venstre punkt, som flytter for det, er valgt. Du kan beregne her også, f.eks. "90-14,5".

Et hjørne viser ingen vinkel hvor en kurve møder det, eller hvor mere end to linjer mødes. {{ui:sketch.showMeasurements}} på sidebjælken skjuler vinklen sammen med længderne.

## Runding eller fasing af hjørner

Klik et hjørnepunkt og vælg {{ui:sketch.filletCorner}} eller {{ui:sketch.chamferCorner}}. Et lille felt dukker op for {{ui:sketch.filletRadius}} eller {{ui:sketch.chamferDistance}}. Indtast størrelsen og bekræft med fluebenet. Det virker for hjørner mellem to lige linjer.

Flere hjørner på én gang virker også: vælg dem med [[Shift]] og et klik hver, eller træk en ramme omkring dem, og vælg {{ui:sketch.filletCorner}} eller {{ui:sketch.chamferCorner}} fra den bjælke der dukker op. Alle får den samme radius eller afstand. Hvor to valgte hjørner deler en side, tager hver højst 45 % af den, så et rektangel rundet hele vejen rundt bliver ens ved hvert hjørne. Punkter der ikke er et hjørne mellem to lige linjer udelades, og beskeden siger hvor mange. En ramme omkring en hel form, eller et klik inden i den, vælger dens hjørner og dens linjer sammen, og bjælken tilbyder så {{ui:sketch.curveLine}} og {{ui:sketch.straightenLine}} for alle de valgte linjer ved siden af hjørneværktøjerne.

![Hjørnet øverst til venstre er rundet med 12 mm radius.](shot:sketch-fillet)

## Spejling

Markér punkter og linjer (klik, [[Shift]] og klik, eller træk en ramme om dem), og klik på {{ui:sketch.mirror}} i bjælken. Vælg så aksen: {{ui:sketch.mirrorLeftRight}} spejler om den lodrette akse gennem midten af pladen, {{ui:sketch.mirrorTopBottom}} om den vandrette, og {{ui:sketch.mirrorAcrossLine}} om en ret linje i skitsen, som du klikker på bagefter. Kopien lander på den anden side, og originalen bliver; intet er knyttet sammen, så du kan ændre hver for sig. Punkter på aksen deles, så et halvt omrids, hvis ender ligger på aksen, bliver til ét lukket omrids: tegn halvdelen af en vinkelbeslag, markér den, spejl den og lav legemet. En hjælpelinje er en god akse. [[Esc]] annullerer.

## Konstruktionslinjer

En konstruktionslinje hjælper dig med at placere punkter uden at blive del af formen. Den tegnes stiplet og tæller aldrig med i omridset: du kan trække den så langt ud over formen du vil, og formen vokser ikke.

- Slå {{ui:sketch.construction}} til i {{ui:sketch.group.draw}}-gruppen. Nye linjer, også dem tastet efter mål, er så konstruktionslinjer. Knap skifter tilbage til normale linjer.
- En linje du allerede har tegnet bliver til en konstruktionslinje når du klikker den og vælger {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} gør den til en normal linje igen.
- Nye punkter snapper til hvor en konstruktionslinje krydser en anden linje, en blå ring viser det, og til enderne af konstruktionslinjen. Sådan sætter du et hjørne på en midte, i en bestemt afstand fra en kant eller på et kryds, uden at beregne.
- Nye punkter snapper også til midten af enhver lige linje i skitsen, til centrum af enhver cirkel og afrundet hjørne, og til midterne af siderne på en form der vises underved (#624). Et punkt der trækkes, ignorerer midten af sine egne linjer.
- {{ui:sketch.fromMiddle}} i {{ui:sketch.group.draw}}-gruppen tegner en linje fra dens midte: klik først på midten, så på enden, og linjen løber lige langt til den anden side. Midten bliver et punkt for sig selv. Klik på knappen igen for at tegne normale linjer.
- En konstruktionslinje skærer ikke omridset over hvor den krydser det. Ved revolvering kan den ligge til højre for aksen også.

## Lav en form af det

Klik på {{ui:sketch.finishSketch}}. Omridset står som en form på arbejdsplanet. I dens indstillinger ændrer du højden, farven og alt andet som med enhver anden form. Når du ændrer størrelse, bygger layerling den igen fra skitsen et øjeblik senere, og skitsen vokser med den. Så forbliver den en eksakt form der tager fas og rund, og næste gang du redigerer den har skitsen den størrelse formen har.

Ligger arbejdsplanet på siden af en form, tegner du den måde du ser på den side: op i skitsen er også op på den færdige form. Det svage omrids af formen i skitsevisningen viser hvor den står. Hvis arbejdsplanet skærer gennem en form, viser skitsevisningen omridset af det snit i stedet, så en hul form vises som en ring og du kan justere skitsen med dens vægge. Et punkt du sætter eller trækker tæt på et hjørne af disse omrids snapper præcis på det; en lille blå ring viser det. Sådan tager du kanter af andre former med i skitsen, selv når arbejdsplanet ikke ligger præcis på dem. For at spore rundt om eksisterende arbejde slår du {{ui:sketch.showPartEdges}} til (lagknappen i visningsknapperne til venstre): alle kanter på formerne tegnes så på skitseplanet, tynde og svage, som om du kiggede gennem dem, uanset hvilken højde de ligger på. Et plan der står lodret, sat på en frontflade for eksempel, viser forsiden på denne måde. Valget gemmes i browseren.

![Omridset er blevet til en form. Hjørnet er rundet.](shot:sketch-result)

Med {{ui:inspector.editSketch}} kan du vende tilbage til skitsen når som helst for at ændre den. Et dobbeltklik på formen gør det samme, som i Tinkercad (en låst form forbliver lukket); {{ui:workspace.doubleClickOpensSketch}} i indstillingerne slår det fra. Kantbehandlinger du allerede har lavet på formen går dog tabt, fordi kanterne skabes på ny. Et legeme, du har drejet eller flyttet i 3D-editoren, åbner der, hvor det står på pladen, drejet som du ser det der og på pladens gitter; kun et vippet eller spejlet legeme åbner i sin egen ramme.

En skitse med flere omrids giver ét legeme, og omrids, der overlapper, smelter sammen i det. Skal hvert omrids stå for sig, så vælg legemet og klik på {{ui:inspector.separateParts}}: hvert ydre omrids bliver et legeme for sig med de huller, der ligger i det, og beholder legemets højde, farve og plads. Hver del har sin egen skitse at redigere, med hjælpelinjerne, så du kan hæve eller sænke delene én ad gangen og bagefter samle eller trække dem fra hinanden. Kantbehandlinger forhindrer det, ligesom et legeme, der er strakt bagefter: det deles så som et mesh.

**En anden slags legeme fra samme skitse:** mærket øverst i skitsen siger, hvad den bliver til: {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} eller {{ui:sketch.modeBadgeSweep}}. Klik på det og vælg en anden, også mens du redigerer et eksisterende legeme: en importeret SVG, der kommer ind ekstruderet, bliver til en vase eller en knop, når du skifter den til {{ui:sketch.modeBadgeRevolve}}. En kontur, der går over aksen, flyttes til venstre, til dens højre kant ligger på aksen; [[Ctrl]]+[[Z]] fortryder flytningen. Når du afslutter, træder det nye legeme i det gamles sted med samme navn og farve og foden i samme højde. Kantbehandlinger forsvinder, som ved enhver ændring af en skitse.

### Revolvering

Ved revolvering tegner du den halve tværsnit **til venstre for aksen** der vises i skitsen. Ved siden af ser du en 3D-forhåndsvisning af revolveringen. Den viser straks hvordan formen vil se ud. Du kan dreje, flytte og zoome den med musen; den lille knap i dens øverste højre hjørne, eller et dobbeltklik på den, bringer den første visning tilbage. Omridset skal være lukket. Du kan også bygge en åben linje som en streg, se nedenfor. Til sidst klik på {{ui:sketch.finishRevolve}}. De andre legemer i designet vises forfra, i samme visning som profilen, med aksen i midten: tegn profilen ved siden af dem eller over dem. Legemet står, hvor du har tegnet det, og den vandrette linje gennem midten af skitsen er jorden: en profil over den giver et legeme, der står højere, og dens laveste punkt er legemets fod.

En revolvet form er en eksakt form, ligesom en ekstruderet: den tager fas og rund, og du kan hule den ud, til et krus eller en vase. En form revolveret med en ældre layerling er et mesh; åbn {{ui:inspector.editSketch}} og afslut den igen for at gøre den eksakt. En profil der når hen over aksen kan ikke bygges eksakt og bliver til et mesh, som før.

**Én sammenhængende streng: {{ui:prop.pitch}}.** En revolve gør omridset til lukkede ringe. Vælg den revolverede form og giv den i egenskabspanelet en {{ui:prop.pitch}} over 0, den højde den stiger pr. omgang, så vikler omridset sig op som en skruelinje: én sammenhængende streng som filament på en spole eller en fjeder. {{ui:prop.sweep}} bliver så til {{ui:prop.turns}}, op til 200; et negativt tal vikler venstre om. Omgange, der ligger tættere end omridset er højt, smelter sammen til én form, så en massiv kerne med fin stigning virker også. En skruelinje bygges som et mesh, så rund, fas og udhuling virker ikke på den; hold {{ui:prop.sides}} lavt ved mange omgange. En stigning på 0 giver ringe igen.

## Træk omridset langs en sti

{{ui:sketch.sweep}} trækker et omrids langs en sti: en kabelkanal der går i et hjørne, et rør, en afskærmning omkring en rem, en ring omkring en sekskant. Den sidder sammen med {{ui:sketch.extrude}} og {{ui:sketch.revolve}} i {{ui:sketch.group.create}}-gruppen.

Du tegner to ting på det samme ark:

- **Tværsnittet** som et lukket omrids, som sædvanlig. Tegn det som du ville se det, når du ser langs stien fra dens start: på tværs af stien er skitsens venstre og højre, op er op på den færdige form. Et hult tværsnit, en kanal eller et rør, er et omrids med et andet indeni. Som udgangspunkt ligger tværsnittet centreret på stien. Menuen ved siden af mærket øverst lader dig lægge dets venstre eller højre kant på stien i stedet ({{ui:sketch.sweepAnchorLeft}}, {{ui:sketch.sweepAnchorRight}}, set når man ser langs stien), så et skinne kan sidde på den ene side af linjen eller følge kanten af en del. Formen står på skitseplanet med tværsnittets laveste punkt.
- **Stien** som en {{ui:sketch.construction}}: slå den til og tegn linjer eller kurver, én kæde, åben eller lukket (en lukket kæde giver en ring). Stien ligger fladt i skitseplanet.

Tegn tværsnittet tæt på den ende af stien hvor den skal begynde; stien starter ved den ende der ligger tættest på. Klik så på {{ui:sketch.finishSweep}}. Et hjørne af lige stykker bliver en skråsting, en kurve bliver jævn, og tværsnittet står lodret hele vejen. Formen er eksakt, ligesom en ekstruderet: rund, fas og STEP-eksporten virker på den. Mangler et lukket omrids eller en sti, eller er der flere adskilte stier, siger layerling det. Med {{ui:inspector.editSketch}} kan du vende tilbage til skitsen og ændre tværsnittet eller stien.

## Byg som en streg

Normalt bliver arealet inden for et lukket omrids til formen. Med {{ui:sketch.stroke}} i {{ui:sketch.group.finish}}-sektionen bygger du selve linjen i stedet, med en bredde du sætter. Kryds {{ui:sketch.strokeOn}} af i panelet; skitsen viser straks hvad der kommer ud.

- Et **lukket omrids** bliver til en ramme. {{ui:sketch.strokeAlign}} siger hvor væggen ligger: {{ui:sketch.strokeAlign.center}} på den tegnede linje, {{ui:sketch.strokeAlign.inside}} inden i den eller {{ui:sketch.strokeAlign.outside}} uden på den. Udvendig er handy til en tolerance: tegn omridset af et hul, en svalehale for eksempel, og giv det 0,2 mm streg udenpå for at få det mellemrum printet har brug for.
- En **åben linje** bliver til en stribe, centreret på linjen. {{ui:sketch.strokeCap}} sætter hvordan dens ender ser ud: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (længere med halv bredde) eller {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} gælder for begge: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} eller {{ui:sketch.strokeJoin.bevel}}.

Skitsen beholder den tegnede linje. Åbn den igen og du fortsætter med at ændre linje og streg; fjern krydset og arealet bygges igen. Kurver brydes i korte lige stykker til det. En revolvering har ingen streg.

I en revolvering er stregen en tynd væg: tegn væggen af en vase eller et krus som **én åben linje** til venstre for aksen, kryds {{ui:sketch.stroke}} og sæt bredden, så drejer revolveringen båndet. Det der når hen over aksen, skæres af ved den.

## Fyld og silhuet

Du kan sætte stregen uden at åbne skitsen også: i egenskaberne for en skitseform, vælg {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} eller {{ui:prop.sketchFill.center}} under {{ui:prop.sketchFill}}, med {{ui:prop.sketchLineWidth}} og {{ui:sketch.strokeJoin}}. Formen bygges igen med det samme, hvor den står. Disse matcher Tinkercads fyld-tilstande for SVG-import: standard, ydre linje og indre linje. {{ui:prop.sketchFill.grow}} bevarer arealet fyldt og vokser det med linjebredden hele vejen rundt, med skarpe, rundede eller fasede hjørner: et basislag under en logo til flerfarvet print, som stregen udvendigt alene kun ville give som en ring. {{ui:prop.sketchFill.shrink}} gør det modsatte: arealet forbliver fyldt, og dets kant trækkes ind med stregtykkelsen hele vejen rundt, huller indbefaltet (de vokser). Brug begge på kopier af én skitse til en pasning: hullet i sin tegnede størrelse, delen der går igennem det {{ui:prop.sketchFill.shrink}} med 0,5 mm, eller en væg inde i en form der er skåret ud af samme omrids. En bredde større end omridset tillader efterlader intet. I skitsens streg-panel står de samme to valg under {{ui:sketch.strokeAlign}}.

{{ui:prop.sketchSilhouette}} udelader hvert omrids der ligger inden i et andet: huller og hvad der ligger i dem. Kun det ydre omrids bevares. Sammen med {{ui:prop.sketchFill.outside}} laver det en småkageudstikker: importér en SVG to gange, én med silhuetten som areal til basen og én med silhuetten og 1 til 2 mm streg udenpå som væggen. Kontakten er også i {{ui:sketch.stroke}}-panelet i skitsetilstand.

Fas og rund på kanterne forsvinder når formen bygges igen, som når skitsen redigeres.

## Skrå vægge, til stempler

En ekstruderet skitse har lodrette vægge. Et stempel, en prægeform eller en dor ønsker skrå, udvendig og indvendig, med samme vægtykkelse hele vejen. Layerling har ingen draft-vinkel til en ekstrudering, men for almindelige omrids får {{ui:inspector.taper}} dig derhen. En måde der virker:

1. Tegn omridset med det hul det har brug for og lav en form af det. Duplikér formen ([[Ctrl]]+[[D]]).
2. På den første form, slå {{ui:prop.sketchSilhouette}} til, så hullet fyldes, og giv den en bredere bund end top med {{ui:inspector.taper}}.
3. På kopien, åbn dens skitse igen og slet det ydre omrids, så kun omridset af hullet er tilbage. Afslut skitsen, skift formen til {{ui:inspector.hole}} og giv den en smallere bund end top med {{ui:inspector.taper}}.
4. Flyt hullet ind i den første form, hvor hullet var, og gruppér de to.

Væggene hælder nu udvendig og indvendig. {{ui:inspector.taper}} skalerer hele omridset, så det er eksakt for almindelige former, hvor du kan vælge størrelserne så væggene løber parallelt, og kun en tilnærmelse for fine detaljer som bogstaver.

## Et billede som skabelon

Med {{ui:sketch.addImage}} lægger du et foto eller en tegning under skitsen og spor den. Du kan sætte dens størrelse, gennemsigtighed og position. Når billedet sidder rigtigt, lås det med [[Ctrl]]+[[L]] så du ikke flytter det ved et uheld mens du tegner. Et låst billede er ude af vejen: klik går igennem det, så du kan vælge linjer og punkter oven på det og trække en ramme over dem. Et klik på hængelåsen i dets hjørne låser det op; [[Alt]]+klik vælger det uden at låse det op. Dækker dets indstillinger i højre kant billedet, så træk dem væk i deres titellinje; et dobbeltklik på den docker dem igen.

Under {{ui:sketch.imageAlign}} justerer du et foto der ikke blev taget lige:

- **{{ui:sketch.imageRotation}}:** Drej billedet omkring dets midte, med de buede pile ved dets hjørner eller som et tal i grader. Med [[Shift]] snapper pilene i 15°-trin. Inden for ringen, der vises under drejningen, snapper de i trin på 22,5°, uden for i hele grader.
- **{{ui:sketch.centreImageX}}** og **{{ui:sketch.centreImageY}}:** lægger billedets midte på X = 0 eller Y = 0. For en revolvering er X = 0 aksen, så billedet ligger så symmetrisk omkring den.
- **{{ui:sketch.calibrateImage}}:** Knappen sidder øverst, lige under forhåndsvisningen. Klik to punkter i billedet hvis afstand du kender, enderne af en lineal eller en kendt diameter, og tast den virkelige afstand. Billedet skaleres jævnt så den afstand er rigtig; det første punkt bliver hvor det var.
- **{{ui:sketch.cropImage}}:** Håndtagene på rammen beskærer nu billedet i stedet for at skalere det; hvad der klippes væk forbliver gemt og kommer tilbage med {{ui:sketch.uncropImage}} eller når et håndtag trækkes ud igen.

Alle fire rører kun referencen, aldrig skitsen.

**{{ui:sketch.traceImage}}** i billedets indstillinger sætter punkterne for dig: det optegner omridset af formen på billedet – en silhuet, et logo, et ord – og viser det i rødt over billedet, firkantede punkter for hjørner, runde for glatte punkter. {{ui:sketch.traceDark}} eller {{ui:sketch.traceLight}} vælger, hvilken del af billedet der er formen, {{ui:sketch.traceThreshold}}, hvor mørkt går over i lyst, {{ui:sketch.tracePoints}}, hvor mange punkter omridsene får tilsammen (færre giver blødere kurver, flere følger billedet nøjere), {{ui:sketch.traceCorners}}, fra hvilket knæk et punkt er et hjørne, {{ui:sketch.traceSpeck}}, op til hvilken størrelse pletter udelades, og {{ui:sketch.traceHoles}} beholder midten af et A eller O. {{ui:sketch.traceApply}} lægger omridsene ind i skitsen præcis der, hvor billedet ligger, i dets størrelse, drejning og beskæring, og markerer dem: det er almindelige punkter, der kan flyttes, bøjes eller fjernes, og [[Ctrl]]+[[Z]] fjerner dem i ét trin. Det virker bedst med tydelig kontrast; frilæg først et foto med en urolig baggrund.

Til et foto – fx et legetøjstog på et hvidt bord – vælger du under {{ui:sketch.tracePart}} **{{ui:sketch.traceObject}}**: baggrunden er farven ved billedets kant, og alt, der skiller sig ud fra den, bliver ét omrids, uanset farver; {{ui:sketch.traceThreshold}} bestemmer så, hvor tydeligt. Et farverigt billede på en jævn baggrund starter sådan. {{ui:sketch.tracePickAreas}} giver flere omrids: klik på en flade i billedet, fx et vindue, så får fladen med samme farve omkring stedet et omrids ({{ui:sketch.traceAreaTolerance}} bestemmer, hvor ens). Huller og valgte flader står under {{ui:sketch.traceList}}; peger du på en, fremhæves den i forhåndsvisningen, ✕ fjerner den, og med {{ui:sketch.traceCut}} slået fra tegnes den som hjælpelinje i stedet for et hul. En flade, der når ud til billedets kant, er baggrunden og tages ikke med.

## Taster i skitsetilstand

| Taste | Virkning |
| --- | --- |
| [[Esc]] | læg noteværktøjet fra dig; ellers læg værktøjet fra dig (tilbage til {{ui:sketch.select}}), ryd derefter markeringen |
| [[Delete]] | slet det valgte element |
| [[Ctrl]]+[[C]] | kopier markeringen |
| [[Ctrl]]+[[X]] | klip markeringen |
| [[Ctrl]]+[[V]] | indsæt |
| [[Ctrl]]+[[D]] | duplikér markeringen |
| [[Ctrl]]+[[Z]] | fortryd |
| [[Ctrl]]+[[A]] | vælg alle punkter og linjer |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | mens du tegner: snap linjen i 15°-trin; mens du trækker: hold flytningen på én akse |
| ciffer, [[<]], [[Tab]], [[Enter]] | mens du tegner: tast og sæt længden og vinklen på den næste linje |
| [[R]] | drej den lukkede skitse 45° |
| [[Ctrl]]+[[L]] | lås eller lås op for skabelonbilledet, eller det valgte omrids |
| [[N]] | sæt en note: det næste klik placerer den på skitsen |
| [[Shift]]+[[N]] | vis eller skjul noterne |

> **Tip:** Tegn så få punkter som muligt. Et omrids med få velplacerede punkter giver en glattere form end en virvar af mange.
