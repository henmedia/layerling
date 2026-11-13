---
title: Vy och arbetsyta
summary: Förflytta sig i scenen, se rakt på och placera nya former på vilken yta du vill.
---

## Förflytta sig i vyn

Med musen:

| Det du gör | Det som händer |
| --- | --- |
| dra med höger musknapp | vrider vyn |
| klicka med höger musknapp | på en kropp: en meny med de vanligaste kommandona (duplicera, hål eller solid, gruppera, dölj, lås, ta bort med mera); på tom yta Klistra in och Markera alla |
| dra med mittenknappen | flyttar vyn i sid- och höjdled |
| rulla mushjulet | zoomar in och ut |
| håll ned [[Ctrl]] / [[Cmd]] och dra med vänster musknapp | flyttar också vyn (på en MacBook-styrplatta: håll [[Cmd]], tryck och dra); på Mac vrider Control i stället vyn, eftersom Control-klick motsvarar högerklick |
| dubbelklicka på tom arbetsyta eller bredvid plattan | flyttar vyn så att den punkten hamnar i mitten; vyn roterar sedan kring den |

Hur snabbt mushjulet zoomar ställs in med {{ui:workspace.zoomSpeed}} i inställningarna under {{ui:workspace.appearance}}: ett skjutreglage från 1 till 14, med 5 som startvärde. Det påverkar bara hjulet och styrplattan: knapparna och tangenterna [[+]] och [[−]] zoomar alltid i samma små steg. Ett snäpp på ett mushjul zoomar lika mycket i alla webbläsare, medan en styrplatta zoomar efter hur långt du drar. {{ui:workspace.panSpeed}} nedanför styr hur snabbt vyn följer musen när du panorerar, från 1 till 9: vid 5 i mitten stannar punkten du tar tag i under muspekaren.

**Musknappar som i din slicer.** Om du är van vid Bambu Studio eller OrcaSlicer ställer du in {{ui:workspace.mouseScheme}} i inställningarna under {{ui:workspace.appearance}} till {{ui:workspace.mouseSchemeSlicer}}. Då vrider vänsterdrag på tom yta vyn, höger musknapp flyttar vyn på samma sätt som mittenknappen, och Skift + vänsterdrag drar markeringsramen. Att dra i en kropp flyttar fortfarande kroppen, och ett kort högerklick öppnar fortfarande menyn. I en skiss flyttar högerknappen också vyn.

**3D-mus.** En SpaceMouse eller annan 3D-mus vrider, flyttar och zoomar 3D-vyn: skjut reglaget framåt för att zooma in, skjut det åt sidorna för att panorera, luta för att luta vyn och vrid för att rotera runt modellen. I inställningarna under {{ui:workspace.appearance}} klickar du på {{ui:workspace.spaceMouseConnect}} och väljer enheten i webbläsarens fönster; den kommer ihåg valet så det behövs bara en gång. Detta fungerar i Chrome och Edge som når sådana enheter; Firefox och Safari kan inte. Om en riktning känns omvänd bockar du för den under knappen: sidled, höjdled, zoom, lutning eller vridning.

På surfplatta eller telefon zoomar två fingrar (för isär och nyp ihop) och flyttar vyn (dra tillsammans). Ett finger på tom yta vrider vyn, och ett tryck där rensar markeringen; på en form eller ett handtag arbetar det i designen precis som vänster musknapp. Vill du kunna vrida vyn med ett finger även när du börjar på en form slår du på {{ui:camera.touchRotate}} i vyfältet. Den knappen visas bara på enheter med pekskärm.

Ett ritbord med penna fungerar som en mus: spetsen är vänster musknapp och sidoknappen på pennan är högerknapp för att vrida vyn och öppna menyn. Ritbordets snabbknappar kan ställas in i drivrutinen till layerlings [kortkommandon](chapter:shortcuts).

**Använd helst pekpenna på surfplatta om du kan.** Spetsen är mycket finare än en fingertopp och skymmer inte det du siktar på, så små punkter, tunna linjer och handtag i en skiss, mätpunkter och kanter träffas exakt och längre pass blir mindre tröttande. Redan nu låter layerling ett finger nå lite längre till punkter, linjer, handtag och kanter än en muspekare, men pekpennan är ändå tydligare och mer exakt. Det gäller aktiva pennor som surfplattan känner igen som penna (S Pen, Apple Pencil och liknande). En enkel penna med gummispets räknas av skärmen som ett finger och ger inte högre precision.

Det finns ingen höger musknapp på en surfplatta: håll ett finger stilla på en form eller på tom yta i en halv sekund så öppnas högerklicksmenyn, med **Markera alla** på tom yta. **Markera flera** i samma meny ersätter Skift på surfplatta: varje tryck på en kropp lägger då till eller tar bort den ur markeringen tills du trycker på tom yta eller [[Esc]]; ett finger på tom yta vrider fortfarande vyn. Handtagen runt en markerad form går att ta tag i lite vid sidan av.

### Vykuben

Kuben uppe till vänster visar varifrån du tittar. Ett klick på någon av dess sidor hoppar rakt till vyn ovanifrån, underifrån, framifrån, bakifrån, från vänster eller från höger. Ett klick på ett hörn av kuben tittar snett mot modellen från det hörnet, och ett klick nära en kant tittar från den kanten mellan två sidor; stället lyses upp när muspekaren är över det. Siffertangenterna [[1]] till [[6]] ger också de raka vyerna. Håller du [[Shift]] nere samtidigt zoomar vyn även in på markeringen, precis som [[Shift]]+[[F]].

Dra i kuben för att vrida vyn runt modellen, på samma sätt som med höger musknapp. När inget är markerat vrider också piltangenterna vyn: 15° per tryck, 90° med [[Shift]]. De vrider modellen åt det håll pilen pekar – [[→]] vrider framsidan åt höger, [[↑]] lutar framsidan uppåt. Håller du [[Ctrl]] nere glider vyn över skärmen i stället: en tiondel av bilden per tryck, halva bilden med [[Shift]]. Modellen rör sig åt det håll pilen pekar. Är något markerat flyttar pilarna i stället det markerade; klicka på tom yta först om du vill vrida vyn. På pekskärm fungerar allt detta med ett finger utan att du behöver slå på {{ui:camera.touchRotate}}.

### Vyfältet

Längs vänsterkanten sitter en smal list. Uppifrån och ned:

- {{ui:camera.home}} tar tillbaka hela scenen i bild. Tangenten är [[Home]]; [[F]] gör samma sak när inget är markerat.
- {{ui:camera.focusSelection}} zoomar till markeringen ([[F]] eller [[Shift]]+[[F]]); när inget är markerat visas hela scenen, precis som [[F]].
- {{ui:camera.zoomIn}} och {{ui:camera.zoomOut}} zoomar stegvis in och ut, liksom tangenterna [[+]] och [[−]].
- {{ui:camera.orthographic}} växlar till en ortografisk (rak) vy där parallella kanter förblir parallella. För mätning och kantpassning är det ofta bekvämare än perspektivvy. [[O]] växlar fram och tillbaka, och ett andra klick återgår.
- {{ui:camera.secondView}} öppnar en andra vy av designen i ett eget fönster, se nedan. Ett andra klick stänger den.
- {{ui:camera.showScrollbars}} lägger en rullningslist längst ned och längs högra kanten av vyn. Dra i en list för att skjuta vyn mjukt i sidled eller höjdled, klicka på en pil i änden för att flytta lite (håll inne för att fortsätta) eller klicka bredvid markören för att flytta nästan en hel vy. Inget roteras, och till skillnad från piltangenterna fungerar listerna även när en del är markerad – praktiskt när du är nära små detaljer. Ett andra klick döljer dem; {{ui:workspace.startWithScrollbars}} i inställningarna bestämmer om en design öppnas med dem synliga. Webbläsaren kommer också ihåg knappen.
- {{ui:camera.hideWorkplane}} (ögat över ett rutnät) döljer plattan och rutnätet så att du kan se undersidan av designen nedifrån. Bara vyn ändras: nya former landar fortfarande på arbetsytan. Ett andra klick visar den igen. Med ett arbetsplan på en yta heter den {{ui:camera.hideBuildPlate}} och döljer bara byggplattan: arbetsplanet på ytan blir kvar, det har ett eget öga, {{ui:camera.hideFaceWorkplane}}.
- {{ui:camera.placeWorkplane}}, måttbandet och vinkelhaken är egna verktyg som beskrivs nedan och i [Mäta och anteckningar](chapter:measuring-and-notes).

Den lilla pilen högst upp på fältet fäller in det om det är i vägen. Samma knapp går att dra för att flytta vyfältet var som helst i redigeraren, även i skissläget; ett dubbelklick sätter tillbaka det. 3D-förhandsgranskningen i en rotationsskiss flyttas på samma sätt i sin rubrik.

En design öppnas precis som du lämnade den: vinkel, zoom och position sparas med den i webbläsaren så att du fortsätter där du slutade, även efter att ha gått hem eller stängt sidan. En sparad `.lyl`-fil tar med sig vyn så att den öppnas likadant på andra håll. Vyn ingår inte i ångra-historiken.

Du kan dessutom spara fyra egna vyer i varje design. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] eller [[Shift]]+[[0]] sparar vyn precis som den är – vinkel, position, zoom samt ortografisk eller perspektiv – på den tangenten, och själva siffertangenten ([[7]], [[8]], [[9]] eller [[0]]) tar fram den igen. Ett meddelande längst ned bekräftar att vyn sparats; att spara på samma tangent igen skriver över den gamla. Precis som den senast visade vyn stannar de sparade vyerna kvar med designen i webbläsaren, följer med i `.lyl`-filen och ingår inte i ångra-historiken.

### En andra vy i ett eget fönster

{{ui:camera.secondView}} öppnar ett fönster som visar samma design genom en egen kamera, så att du ser modellen från två håll samtidigt – till exempel framifrån medan du arbetar uppifrån. Varje ändring du gör i redigeraren syns genast där; designen ändras bara i huvudfönstret, och handtagen stannar där. I det andra fönstret vrider musen och vykuben vyn precis som här, och tangenterna fungerar också: [[1]] till [[6]], [[F]], [[Home]], [[O]], [[+]] och [[−]], piltangenterna för att vrida och [[Ctrl]] + piltangenterna för att flytta. [[F]] där zoomar in på det som är markerat i redigeraren. Designens fyra sparade vyer fungerar där med: [[7]], [[8]], [[9]] och [[0]] tar fram dem, och [[Shift]] ihop med siffertangenten sparar fönstrets vy där – gemensamt för båda fönstren. Dess eget vyfält har {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} och {{ui:camera.hideWorkplane}}, som bara påverkar det fönstret. Fönstret öppnas där du senast lämnade det i samma storlek och stängs när redigeraren stängs. På telefoner och surfplattor visas inte knappen.

## Titta inuti: snittvyn

{{ui:camera.sectionView}}, den nedersta knappen i fältet (skärningsverktyget), skär upp vyn längs ett plan så att du kan granska väggar, hålrum och delar som passar in i varandra. Ingenting skärs av på riktigt: designen, filerna och varje export förblir hela. Där planet skär genom en solid fylls snittet i en något mörkare nyans av kroppens färg, medan ett hål inuti förblir tomt så att du ser skillnad på solitt gods och hålrum; den fyllda ytan syns ett ögonblick efter att planet stannat. Under {{ui:camera.sectionCutFace}} väljer du hur snittytan visas: {{ui:camera.sectionCutFaceHatch}} (förvalt) skraffering som på en ritning, där en kropp inuti en annan skraffas åt motsatt håll så att delarna skiljs åt; {{ui:camera.sectionCutFaceFill}} fyller enfärgat; {{ui:camera.sectionCutFaceOpen}} lämnar snittet öppet så att du ser rakt in i kroppens skal. Valet gäller alla designer.

- Välj den axel planet skär tvärs över: X (bredd), Y (djup) eller Z (höjd), på samma sätt som i positionsfälten. Planet börjar mitt i din design.
- {{ui:camera.sectionOrientation}} styr vad axlarna följer. {{ui:camera.sectionOrientationWorld}} använder designens egna axlar. {{ui:camera.sectionOrientationWorkplane}} följer arbetsytans: Z skär då parallellt med arbetsytan, X och Y vinkelrätt mot den, och positionen räknas från dess origo. Med arbetsytan på en lutande yta skär du parallellt med den ytan, och snittet följer med när du flyttar arbetsytan. {{ui:camera.sectionOrientationView}} vrider planet så att det möter skärmen: det tar bort det som ligger närmast dig och reglaget skjuter planet djupare in längs blickriktningen, till exempel för att komma åt och klicka på en dold del inuti. När du har vridit vyn klickar du igen så följer snittet den nya blickriktningen.
- {{ui:camera.sectionCoarse}} flyttar planet genom hela designen, medan {{ui:camera.sectionFine}} flyttar det lite åt vardera hållet där det står, för tiondels millimeter. Du kan också skriva in positionen.
- Knappen bredvid axlarna visar den motsatta sidan av snittet, {{ui:camera.sectionReset}} sätter tillbaka planet i mitten och {{ui:camera.sectionShowPlane}} döljer det blå planet.
- Du kan klicka och markera det som snittet lägger fritt, även innerväggar.
- {{ui:camera.sectionWorkplane}} lägger arbetsytan direkt på snittet. Den hamnar i skärplanet riktad utåt från den del av kroppen som blir kvar, precis som den yta ett snitt skapar. Om du sedan byter till skissläget börjar skissen exakt där, med den svaga konturen av snittet att rita längs och fästa mot. Så kan du till exempel rita ett lock som passar det hålrum du just skar fram. Knappen bredvid axlarna väljer vilken sida som blir kvar och därmed åt vilket håll arbetsytan pekar. Du lägger tillbaka arbetsytan på grundplattan som vanligt.
- {{ui:camera.sectionSketch}} startar en ny skiss direkt på snittet med snittets konturer redan inlagda som linjer: ett hål blir en riktig cirkel, ett rundat hörn en cirkelbåge. Ändra dem, ta bort det du inte behöver, rita mer och avsluta: kroppen växer ut ur snittet mot den sida som var bortskuren, så en del som ska passa i en annan – ett lock, en insats eller en packning – utgår direkt från den delens egen kontur. Knappen bredvid axlarna bestämmer vilken sida det gäller. Precis som vid SVG-export räknas bara synliga kroppar, och hålen är redan avdragna.
- {{ui:camera.sectionMeasure}} mäter direkt på snittet: konturen visas i blått och två klick på den ger avståndet samt delarna längs planets två axlar. Båda punkterna fäster mot konturen, med hörn i första hand. När det andra klicket landar någonstans på motsatta väggen fäster det vinkelrätt mot den första punkten – så att du läser av väggtjocklek, spalter och spelrum utan att behöva sikta på håret. Ett tredje klick påbörjar nästa mätning, [[Esc]] avslutar mätningen. Flyttar du planet rensas mätningen. På en rund kontur, som snittet genom en cylinder eller ett hål, markerar ett litet kryss centrum som det också går att fästa mot. Klickar du på en punkt på cirkeln och för pekaren nära den motsatta sidan landar andra klicket rakt tvärs över centrum och måttet visar Ø, diametern. Från centrum till en punkt på cirkeln får du R, radien.
- {{ui:camera.sectionExportSvg}} sparar konturerna i skärplanet som SVG i skala 1:1 för laser, skärplotter, mall eller packning. Ett X-snitt ses från höger, ett Y-snitt framifrån och ett Z-snitt ovanifrån. Liksom vid vanlig export kommer bara synliga kroppar med, hål är redan utskurna och kroppar i samma färg slås ihop till en kontur. Varje färg får sin egen bana utan fyllning så att laserprogram håller isär dem som lager.

Verktygsfönstret sitter fäst vid sin knapp. Om det skymmer något drar du det i rubrikraden var som helst på arbetsytan; nästa gång öppnas det där igen. Dubbelklicka på rubrikraden eller släpp det på knappen för att sätta tillbaka det.

Krysset och [[Esc]] stänger fönstret; pågår en mätning avslutar [[Esc]] den först. Snittet ligger kvar tills du stänger av det med {{ui:camera.sectionActive}}, klickar på knappen i vyfältet medan fönstret är öppet eller går tillbaka till startsidan. Så länge det är på är knappen markerad. Allt du placerar på den bortskurna sidan syns först när du slår av snittet. Eftersom en surfplatta saknar [[Esc]] finns där två extra knappar i verktygsfönstret: {{ui:camera.sectionBack}} avslutar pågående mätning eller stänger annars fönstret, och {{ui:camera.sectionConfirm}} stänger fönstret direkt. På dator visas de inte.

## Arbetsytan

Nya former rättar sig efter arbetsytan. Från start är det grundplattan med rutnätet. Men du kan lägga den på vilken yta som helst för att bygga på en sida eller en sluttande yta.

1. Tryck [[W]] eller klicka på {{ui:camera.placeWorkplane}}.
2. För musen över en yta på en kropp. Den tänds.
3. Ett klick lägger arbetsytan där. Allt du lägger till nu hamnar på den ytan.

Klickar du i stället på den tomma plattan lägger sig arbetsytan plant på stället du klickade på, fäst mot rutnätet. Nya former och en avslutad skiss – även en roterad – hamnar då där i stället för mitt på plattan. När arbetsytan ligger plant på plattan på det här viset visar plattan bara sin ytterkant: två rutnät i samma plan skulle flimra.

På en kroppsyta fäster annars arbetsytans origo mot rutnätet. Klicka nära ett hörn på ytan så hamnar det exakt i hörnet. Nära en kant lägger det sig på kanten med rutnätet riktat längs kanten; så styr du rutnätets vinkel medvetet. Utan hörn eller kant nära löper rutnätet på en liggande yta parallellt med kroppen, så på en vriden låda följer rutnätet med i vridningen.

Ett klick vid sidan av plattan eller [[Esc]] flyttar tillbaka arbetsytan till grundplattan. Ännu snabbare går {{ui:camera.resetWorkplane}}: knappen med pilen nedåt syns i vyfältet under ögat så länge arbetsytan ligger på en yta. [[Shift]]+[[W]] lägger den direkt på den för närvarande markerade ytan. [[Alt]]+[[W]] flyttar alltid tillbaka den till grundplattan, oavsett om något är markerat eller inte. Håller du ned [[Shift]] när du klickar pekar planet åt motsatt håll.

När en arbetsyta ligger på en kroppsyta visas ett öga bredvid {{ui:camera.placeWorkplane}}. Det döljer arbetsytan utan att släppa den, för fri sikt över designen: nya former landar fortfarande på den ytan och vridning utgår fortfarande från den. Ett klick på ögat visar den igen, liksom att lägga en ny arbetsyta. Storlekshandtagen på en kub följer också en arbetsyta som står på en av dess sidor: hörn- och kanthandtagen ligger på den ytan och varje handtag ändrar kubens egen bredd, längd eller höjd längs just den ytan. Handtaget mitt på ytan ändrar måttet tvärs ut från den.

För att titta rakt mot arbetsytan trycker du [[P]] eller klickar på {{ui:camera.lookOntoWorkplane}} bredvid {{ui:camera.placeWorkplane}} i vyfältet. Vyn vrids tills du ser arbetsytan rakt uppifrån den sida nya former växer mot, med origo i mitten. På grundplattan motsvarar det vyn ovanifrån.

## Byggplattor

När en design innehåller mer än en enda byggplatta rymmer – till exempel en låda med lock och insatser – kan den ha flera byggplattor. Klicka på {{ui:editor.tool.buildPlates}} i gruppen {{ui:editor.group.arrange}} eller välj {{ui:plates.moveTo}} i högerklicksmenyn på en kropp. En list dyker upp längst ned i vyn med en knapp för varje platta; siffran anger hur många kroppar som står på den.

- Varje platta är lika stor som arbetsytan, och plattorna ligger bredvid varandra till höger om den första med 20 mm mellanrum. En kropp hör till den platta där mitten av dess fotavtryck står, så att dra över den flyttar den till den andra plattan. En design rymmer upp till 12 plattor.
- Ett klick på en platta i listen centrerar vyn på den, och nya former och importerade filer landar då på den. {{ui:plates.showAll}} visar alla på en gång. Ett dubbelklick på en platta, eller {{ui:plates.rename}}, ger den ett namn som ”Lock”, vilket skrivs ut på plattan.
- En ny skiss på plattan börjar också på den aktiva plattan: skissytan visar den plattan med kropparna på den, och den färdiga kroppen hamnar där.
- {{ui:plates.moveLeft}} och {{ui:plates.moveRight}} ändrar ordningen så att kropparna följer med sin platta. {{ui:plates.remove}} tar bort den aktiva plattan; dess kroppar flyttas till första plattan på motsvarande ställe.
- {{ui:plates.arrange}} lägger ut de markerade kropparna, eller alla kroppar, rad för rad på plattorna med de största först och 5 mm mellanrum, och skapar fler plattor vid behov. En kropp som är större än en platta står kvar där den är.
- Med en skrivare vald kontrolleras varje kropp mot sin egen platta, och utskriftshöjden räknas från den lägsta kroppen på den plattan. En platta med en kropp som inte får plats får sin siffra i rött.
- I egenskaperna räknas X från mitten av kroppens egen platta.

Exportfönstret erbjuder sedan {{ui:export.plates}}: alla plattor i en fil, sida vid sida som i designen; en fil per platta, packat i en ZIP-fil (STL, 3MF och OBJ); eller en enskild platta placerad där den första står. En slicer öppnar varje fil som en platta, så välj en fil per platta om du vill skriva ut dem i tur och ordning. Att flytta kroppar mellan plattor och ordna dem går att ångra; att lägga till, namnge, sortera och ta bort plattor sparas i designen men ingår inte i ångra.

## Rutnät och fästning

Rutnätet visar storleken på plattan. Längst ned till höger finns **fäststeget**: flytt och skalning fäster i steg om det måttet, till exempel 1 mm. Gör steget mindre för detaljarbete och större för grov placering. {{ui:editor.tool.snapToGrid}} i verktygsfältet flyttar markerade former i efterhand till närmaste rutnätskorsning. Under flytt fäster former även mot andra former, se [Markera och ordna](chapter:select-and-arrange). Utan musen väljer [[Alt]]+[[1]] till [[Alt]]+[[0]] motsvarande post i menyn ([[Alt]]+[[1]] stänger av fästningen), medan [[,]] och [[.]] gör steget ett snäpp finare eller grövre. Detta fungerar i skissläget också.
Ett kort klick med musens mittenknapp, utan att röra musen, öppnar fäst menyn direkt vid muspekaren, även i skissläget; att hålla in mittenknappen och dra flyttar fortfarande vyn.

> **Tips:** Sluta vrida vyn när du ska passa ihop delar exakt. Använd siffertangenterna för att hoppa till den raka vyn ovanifrån eller framifrån och tryck [[O]] för ortografisk visning. Då ser du genast om två kanter verkligen ligger i linje.

### Inställningsfönstret

Kugghjulet i rubrikraden ({{ui:editor.workspaceSettings}}) öppnar inställningarna. Till vänster finns fem områden: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} och {{ui:workspace.history}}. Ändringar börjar gälla direkt. {{ui:workspace.makeDefault}} längst ned sparar nuvarande inställningar som standard så att nya designer startar med dem. En fil du öppnar bär med sig sina egna inställningar; {{ui:workspace.useMyDefault}} bredvid lägger dina sparade färger, rutnät och övriga val på den öppna designen med dess enheter intakta. Om din standard har en vald skrivare följer den skrivaren med inklusive plattstorleken; utan skrivare behåller designen sin egen platta och skrivare. {{ui:workspace.close}} uppe till höger stänger fönstret. Här följer alla inställningar i ordning.

{{ui:workspace.exportSettings}} bredvid sparar fönstrets inställningar i en fil (layerling-settings-<datum>.json): färger, rutnät, skuggor, kamera och formstandarder tillsammans med tema, knappstorlek i verktygsfältet, hörn för vykuben, formfärger och varje skrivares spelrum. På en annan dator, eller om webbläsaren har rensat sin data, läser {{ui:workspace.importSettings}} in filen igen: den blir då din standard för nya designer och läggs på den öppna designen på samma sätt som {{ui:workspace.useMyDefault}}. Dina egna kortkommandon följer också med.

### Utseende: tema, verktygsfält och vykub

{{ui:workspace.theme}} bestämmer färgtemat för hela programmet: {{ui:workspace.themeSystem}} följer datorn, och de övriga är {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} och {{ui:workspace.themeGraphite}}. Du kan även byta tema uppe till höger i redigeraren.

{{ui:workspace.toolbarSize}} gör knapparna i verktygsfältet överst, formmenyn, vyfältet till vänster och egenskapspanelen till höger mindre eller större: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (som det alltid varit) eller {{ui:workspace.toolbarSizeLarge}}. Litet ger mer plats för arbetsytan på en bärbar dator; stort är lättare att träffa på stor skärm eller med fingret. Med stora knappar lägger sig grupperna i verktygsfältet på två rader om fönstret blir för smalt. Storleken ligger under fliken {{ui:workspace.ribbon}}, lagras i den aktuella webbläsaren och gäller för alla designer.

{{ui:workspace.shapeColors}} ger varje ikon i formbiblioteket den färg som en ny form startar med (sin egen typfärg eller den färg du sparat med {{ui:inspector.saveDefaults}}). Slå av om du föredrar grå bilder; webbläsaren kommer ihåg valet.

{{ui:workspace.viewCubePosition}} flyttar vykuben till ett annat hörn på arbetsytan: {{ui:workspace.viewCubePositionTopLeft}} (som alltid), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} eller {{ui:workspace.viewCubePositionBottomRight}}. I alla hörn utom uppe till vänster flyttar vyfältet upp till kubens gamla plats. Nere till höger står kuben strax ovanför reglaget {{ui:inspector.snapGrid}}. När egenskapspanelen är öppen till höger kliver en högerställd kub åt vänster om panelen. Hörnet sparas i den aktuella webbläsaren och gäller för alla designer. På ett smalt fönster, som på en telefon, döljs inställningen och kuben stannar uppe till vänster.

### Utseende: knappar i verktygsfältet

{{ui:workspace.ribbonButtons}} tar bort grupper och knappar som du aldrig använder från verktygsfältet. Klicka på en grupp för att öppna dess lista: {{ui:workspace.ribbonGroupShown}} tar bort hela gruppen, kryssrutan vid en knapp tar bara bort den knappen. {{ui:workspace.ribbonShowAll}} tar tillbaka allt. En grupp utan kvarvarande knappar försvinner och övriga flyttar ihop, så att mer får plats på en rad.

Det du döljer försvinner bara från verktygsfältet: kommandosökningen ([[Ctrl]]+[[K]]) hittar det fortfarande och dess tangent fungerar lika bra som förr. Pilarna vid en grupp flyttar den upp eller ned i listan, och därmed längs verktygsfältet; {{ui:workspace.ribbonResetOrder}} återställer standardordningen. Pilarna vid en knapp flyttar den på samma sätt inom sin grupp. Hjälp stannar alltid kvar. Gruppen Former kan flyttas och döljas som övriga grupper; dess panel går ändå att öppna via kommandosökningen. Valet lagras i den här webbläsaren och följer med i filen från {{ui:workspace.exportSettings}}. Det gäller 3D-redigeraren; skissläget har ett eget verktygsfält.

{{ui:workspace.ribbonFold}}, under {{ui:workspace.ribbonGroupShown}} i en grupps lista, styr hur gruppen beter sig när fönstret inte rymmer alla. {{ui:workspace.ribbonFoldAuto}} är standard: de minst använda grupperna fälls ihop först. {{ui:workspace.ribbonFoldAlways}} håller gruppen hopfälld till sin knapp även i breda fönster så att den tar liten plats men ändå är nära. {{ui:workspace.ribbonFoldKeep}} gör att den fälls ihop först sist av alla. {{ui:workspace.ribbonResetOrder}} återställer det valet också. {{ui:editor.section.mirrorPattern}}, {{ui:editor.section.splitShape}}, {{ui:editor.section.edgesWalls}} och {{ui:editor.section.surface}} är fyra egna grupper som var för sig kan flyttas, fällas ihop och döljas.

### Utseende: snabbläge

{{ui:workspace.fastMode}} är till för långsammare datorer. Det stänger av skuggor, kantlinjer på alla kroppar och kamerans tröghet, och ritar vyn enbart i skärmens upplösning. Dina egna val sparas till senare, och de omkopplare som åsidosätts visar {{ui:workspace.offInFastMode}} medan läget är aktivt. Mer om vad som hjälper på en långsam dator finns under ”När layerling känns långsamt” nedan.

### Utseende: färger för arbetsområde och skiss

Färgerna i arbetsområdet ställs in under {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} och {{ui:workspace.surfaceColor}} för det ljusa temat (de mörka temana behåller sina egna), bredvid rutnätsfärgen under {{ui:workspace.workplane}}. Varje färg är en knapp som visar nuvarande nyans. Ett klick öppnar en liten ruta med färgfält, snabbval, fält för hex-kod och en pil som återställer ursprungsfärgen. [[Enter]] bekräftar en inskriven hex-kod, liksom ett klick utanför rutan.

Skissläget har sina egna färger: {{ui:workspace.sketchBackground}} för området runt arket, {{ui:workspace.sketchPlateColor}} för själva arket under rutnätet och {{ui:workspace.sketchGridColor}}, allt för det ljusa temat. {{ui:workspace.sketchMatch}} tar över arbetsområdets tre färger med ett klick.

{{ui:workspace.classicLook}} ställer in arbetsområdet som i Tinkercad: vit bakgrund, ett ljusblått millimeterrutnät med mörkare linje varje centimeter, svarta kantlinjer, ljus uppifrån med mjuka skuggor. Varje värde kan ändras separat efteråt. Allt börjar så som layerling alltid har sett ut, och vad som passar bäst beror på din skärm.

![Inställningarna under Utseende: färger för bakgrund och arbetsyta i det ljusa temat samt reglaget för kantlinjer på alla kroppar.](shot:settings-appearance)

![Redigeraren i det mörka färgtemat. Du väljer tema uppe till höger: System, Ljust, Mörkt eller Grafit.](shot:editor-dark)

### Utseende: axelpilar och kantlinjer

{{ui:workspace.showAxes}} (påslaget som standard) ritar tre pilar i bakre vänstra hörnet på plattan: **X** i rött åt höger, **Y** i grönt bakåt och **Z** i blått uppåt, åt samma håll som positionsfälten räknar. Det är samma högerhandsregel som Tinkercad, CAD-program och slicers använder. Med arbetsytan lagd på en yta följer pilarna med den. Slå av dem här om de stör. Så länge pilarna är på får även rutnätets mittkors deras färger: linjen längs X röd, den längs Y grön, så att du även på en liten del direkt ser åt vilket håll varje axel går.

{{ui:workspace.edgeLines}} ritar konturlinjer på varje kropp i färgen från {{ui:workspace.edgeColor}} (svart som standard, som i Tinkercad): det hjälper när mörka färger annars flyter ihop. Det är avslaget från start, och mycket stora importerade nät hoppas över.

![Tre mörka kroppar med kantlinjer påslagna: konturerna skiljer dem åt.](shot:edge-lines)

{{ui:workspace.strongHoles}} ritar hål i ett mörkare grått, mindre genomskinligt och med en mörk ram runtom. Det underlättar när ett hål är svårt att se bland halvgenomskinliga kroppar. Till skillnad från kantlinjerna förblir det påslaget i snabbläge.

{{ui:workspace.holeOpacity}} nedanför styr hur täta hålen ritas, från 10 till 90 procent. Lägre värde låter dig se bättre var ett hål möter en kropp. Från början är det automatiskt: 52 procent, eller 72 med {{ui:workspace.strongHoles}}; ett dubbelklick på skjutreglaget återgår till automatiskt värde.

### Utseende: ljus och skuggor

{{ui:workspace.showShadows}} slår på och av slagskuggorna. Två skjutreglage styr ljussättningen. {{ui:workspace.shadowStrength}} bestämmer hur mörka slagskuggorna är, och {{ui:workspace.shadeContrast}} flyttar ljus mellan det jämna omgivningsljuset och huvudljuset: mot ”tydlig” blir skuggsidor mörkare och skuggorna skarpare, mot ”mjuk” blir allting jämnare. Längst ut till höger blir kontrasten mycket stark så skuggade sidor och slagskuggor blir riktigt mörka. {{ui:workspace.shadowSoftness}} mjukar upp skuggkanterna i stället för att hålla dem skarpa. {{ui:workspace.lightAzimuth}} vrider huvudljuset runt plattan (0° framifrån, 90° från höger), och {{ui:workspace.lightElevation}} höjer det; vid 90° står ljuset rakt ovanför plattan som i Tinkercad och skuggorna faller rakt under kropparna. {{ui:workspace.softLighting}} lägger det mesta av ljuset bakom betraktaren så att ljuset följer med när du vrider vyn: ingen sida hamnar i kompakt mörker, och en uppåtvänd yta i mörk färg bränns inte längre ur till vitt. Huvudljuset finns kvar lite lätt för skuggorna, och kontrastreglaget fungerar fortfarande. Om en ljus reflex ändå syns när ljuset står lågt höjer du {{ui:workspace.lightElevation}} till 90°: då ser det ut som i Tinkercad. {{ui:workspace.lightReset}} återställer allt ljus.

### Utseende: mått på arbetsytan

{{ui:workspace.showMoveDimensions}} visar hur långt du flyttar medan du drar eller använder piltangenterna, och {{ui:workspace.showOriginDimensions}} visar avstånden från markeringen till plattans origo, även med flera kroppar markerade. Med {{ui:workspace.dimensionsAlwaysVisible}} syns de här måtten hela tiden, inte bara medan du drar. När en vriden kropp är markerad visas dess vinklar under den på arbetsytan; {{ui:workspace.showRotationAngles}} slår av det. Mer i [Mäta och anteckningar](chapter:measuring-and-notes).

### Utseende: markera och flytta

{{ui:workspace.selectBeforeMoving}}: då måste en kropp markeras först innan nästa dragning flyttar den. Det hjälper när barn eller hastiga händer nuddar kroppar, samt på pekskärmar.

{{ui:workspace.frameByDirection}}: en markeringsram dragen åt höger tar bara med det som ligger helt inuti, medan en dragen åt vänster tar med allt den nuddar (ritad streckad), precis som i SketchUp.

{{ui:workspace.doubleClickOpensSketch}} styr om ett dubbelklick på en extruderad skiss öppnar skissen igen som i Tinkercad, och {{ui:workspace.doubleClickOpensGroup}} styr om ett dubbelklick på en grupp eller bunt öppnar den för redigering. {{ui:workspace.doubleClickCentersView}} bestämmer om ett dubbelklick på tom arbetsyta flyttar vyn dit.

{{ui:workspace.objectSnap}} låter kanter och centrum på en form fästa mot andra former medan du drar den; rutnätsmenyn nere till höger har samma brytare. {{ui:workspace.cruise}} gör att en ny form följer muspekaren och landar på den yta den pekar på, som Cruise i Tinkercad; avslaget hamnar en ny form mitt på plattan. Mer i [Markera och ordna](chapter:select-and-arrange).

### Utseende: vyn

{{ui:workspace.startInPerspective}}: redigeraren öppnas då i perspektivvy i stället för ortografisk vy.

{{ui:workspace.startWithScrollbars}}: en design öppnas då med vyns rullningslister synliga. Det sparas med designen och med {{ui:workspace.makeDefault}}.

{{ui:workspace.viewBarOpensOnHover}}: ett ihopfällt vyfält öppnas när musen hålls över pilen och fälls ihop strax efter att musen lämnar den, om inte ett av verktygen är aktivt. Ett klick på pilen medan det är öppet så här låter det stanna öppet. Det gäller bara med mus; på pekskärm öppnar ett tryck fältet som vanligt.

{{ui:workspace.showStepNotices}}: efter ett steg som en förening säger ett kort meddelande bredvid vykuben vad som gjordes och erbjuder {{ui:shortcuts.undo}}. Avstängt visas inte dessa meddelanden; meddelanden som vill något av dig eller rapporterar ett problem visas fortfarande, och {{ui:editor.tool.undo}} i menyfliksområdet nämner fortfarande steget när du pekar på det.

{{ui:workspace.startView}} ställer in vinkeln som en ny design öppnas i och som {{ui:camera.home}} går tillbaka till. Vrid och zooma vyn som du vill ha den och klicka på {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} återställer den vanliga vyn snett framifrån höger. Det gäller för varje design i den här webbläsaren. En design som du öppnar igen öppnas ändå som du lämnade den.

{{ui:workspace.zoomSpeed}} är ett reglage från långsam till snabb: hur fort mushjulet och styrplattan zoomar; zoomknapparna och tangenterna behåller sina egna små steg. {{ui:workspace.panSpeed}} är också ett reglage från långsam till snabb: hur fort vyn följer musen vid panorering; i mitten stannar punkten du griper tag i under pekaren. {{ui:workspace.cameraInertia}}: när du släpper musen fortsätter vyn att rotera eller glida ett ögonblick och stannar mjukt. Avslaget stannar vyn omedelbart, som i Tinkercad och Fusion 360.

{{ui:workspace.overhangAngle}} anger från vilken vinkel en yta räknas som överhäng när du slår på Visa överhäng i visningsmenyn: dessa ytor skraffas i rött och vitt. 30° är försiktigt, 70° räknar med stark utskriftskylning; 45° är vanligt startvärde. Medan de visas berättar en rad under vyn vad som är det brantaste överhänget och hur många cm² som behöver stöd.

{{ui:workspace.booleanTriangleLimit}} begränsar hur många trianglar ett importerat nät får ha när du skär, slår ihop eller tar snitt med det, eftersom allt beräknas i webbläsaren. Ett nät över gränsen bearbetas inte; förenkla nätet först eller höj gränsen om datorn orkar. En högre gräns kan frysa redigeraren i några sekunder.

### Mått: enheter, skala och fäststeg

Under {{ui:workspace.measurement}} ställer du in {{ui:workspace.units}}, i vilken enhet måtten visas ({{ui:workspace.scale}}: millimeter, centimeter eller meter i metriskt, tum eller fot i brittiskt måttsystem), hur många decimaler som visas ({{ui:workspace.accuracy}}), det {{ui:workspace.snapGrid}} som flytt och storleksändring fäster mot och dina egna fäststeg under {{ui:workspace.customSnapGrids}}.

Under {{ui:workspace.measurement}} i inställningarna ställer du in {{ui:workspace.units}}. Med {{ui:units.imperial}} visar layerling alla mått i tum, på formen, i egenskapspanelen, på måttbandet och linjalen. Fäststeget erbjuder då steg från 1/64 till 1 tum och plattans rutnät ritas i tum (1/8 till 1 tum, 1/4 tum från start) med grövre linje vid varje hel tum. Under {{ui:workspace.inchFormat}} väljer du om tum visas som bråk som i Tinkercad (1 5/8, avrundat till 1/64 tum) eller som decimaltal (1.625) med så många decimaler som ställts in under {{ui:workspace.accuracy}}. Du kan skriva in vilket som, inklusive ”1 5/8”. Ett snabbt sätt att växla mellan millimeter och tum är den lilla omkopplaren **mm | in** bredvid {{ui:inspector.snapGrid}} längst ned i egenskapspanelen: den ändrar enhet, plattans rutnät och fäststeg för den aktuella designen precis som inställningarna.

Under {{ui:workspace.customSnapGrids}} på samma ställe lägger du till egna fäststeg: ett namn och ett mått i millimeter, till exempel ”Pin-delning 2.54 mm” för hålavstånd på kretskort, stiftlister och experimentkort, eller ”MX Key Unit” med 19.05 mm för tangentbordstangenter. Menyn för fäststeg erbjuder då måttet helt, halverat och i fjärdedelar (1 ×, ½ × och ¼ ×), så att former kan flyttas ett steg, ett halvt steg eller ett kvarts steg. Vill du bara ha själva måttet bockar du ur {{ui:workspace.customSnapGridParts}} bredvid; då visas bara det ena steget i menyn. Egna steg sparas med designen och följer med i {{ui:workspace.makeDefault}}.

{{ui:workspace.startWithCornerRuler}}: varje ny design i den här webbläsaren startar då med en vinkelhake i origo, se [Mäta och anteckningar](chapter:measuring-and-notes). Designer du redan har ändras inte, och en vinkelhake du tar bort från en design förblir borta.

### Arbetsyta: platta och skrivare

{{ui:workspace.printer}} ger arbetsytan måtten från din skrivares byggplatta och varnar för kroppar som sticker ut utanför, se [Utskrift](chapter:printing). {{ui:workspace.showPlateLabels}} skriver designens namn på plattan samt skrivarens namn och byggvolym när en skrivare är vald.

{{ui:workspace.printerPlay}} är utrymmet per sida som en utskriven tapp behöver för att snurra i ett utskrivet hål på din skrivare. {{ui:workspace.fitTestMake}} sätter ut passningstestet som mäter det på plattan, och nya lock, laxstjärtar, snäpphakar, muttrar och frigångskontrollen utgår sedan från det, se [Utskrift](chapter:printing). Värdet sparas i webbläsaren, inte i designen.

{{ui:workspace.size}} ger plattan egna mått med {{ui:workspace.width}} och {{ui:workspace.length}} i millimeter eller din valda enhet. Rutnätet går alltid genom origo så de grövre linjerna ligger alltid på axlarna oavsett plattans storlek.

### Arbetsyta: rutnät

{{ui:workspace.showGrid}} visar eller döljer rutnätet på plattan. {{ui:workspace.gridBlockSize}} ställer in avståndet mellan linjerna, och {{ui:workspace.gridMajorEvery}} avgör om den mörkare linjen kommer var 5:e eller var 10:e ruta; {{ui:workspace.gridMajorColor}} ger den linjen en egen färg som mittkorset och plattans kantlinje också får. {{ui:workspace.gridColor}} är färgen på de vanliga linjerna.

Varje linje i rutnätet växer sig bredare när du zoomar in, som i Tinkercad, och förblir synlig när du zoomar ut. Om du föredrar tunna linjer slår du av {{ui:workspace.gridLinesGrow}}, så håller sig linjerna en pixel tunna i varje zoomnivå precis som i skissläget.

Om rutnätet har försvunnit, till exempel för att det fick samma färg som plattan, återställer {{ui:workspace.resetGrid}} längst ned i området {{ui:workspace.workplane}} dess synlighet, färger, linjeavstånd och linjebredd till standard, både här och i det som sparats med {{ui:workspace.makeDefault}}.

### Formstandarder

Under {{ui:workspace.shapeDefaults}} väljer du en form med {{ui:workspace.shape}} och anger vilka startmått den ska ha när du lägger till den: bredd, längd och höjd. {{ui:workspace.useAppDefaults}} återställer formen till appens ursprungliga mått. Former med egna specialinställningar visar dem under {{ui:workspace.shapeDetails}}. Värdena gäller för nya former, inte för de som redan ligger på plattan. {{ui:workspace.customLimit}} sätter en egen maxgräns för hur stor handtagen och egenskaperna kan göra formen; lämnas det tomt gäller de vanliga gränserna.

### Sparad historik

Under {{ui:workspace.history}} anger reglaget {{ui:workspace.savedHistory}} hur många slutförda åtgärder som hålls kvar för Ångra efter att du sparat eller öppnat en design på nytt. Standarden är 100 åtgärder i en design. En lägre gräns kastar äldre ångra-steg i designen permanent.

## När layerling känns långsamt

layerling beräknar och ritar allt direkt i din webbläsare. På en äldre dator, med ett svagare grafikkort eller över flera stora skärmar kan vyn därför kännas seg. Det här hjälper:

- **{{ui:workspace.fastMode}}** under {{ui:workspace.appearance}} stänger med ens av allt som kostar mest i visningen: skuggor, kantlinjer på alla kroppar och kamerans tröghet. Dessutom ritas vyn bara i skärmens egen upplösning, vilket på högupplösta skärmar blir upp till fyra gånger färre pixlar. Dina vanliga inställningar ligger kvar och gäller igen så snart du slår av läget.
- **Kameran fortsätter snurra:** När du släpper musen efter att ha vridit fortsätter vyn en kort stund och saktar mjukt in. Det är avsiktligt, inte hack. Om du är van vid Tinkercad eller Fusion 360 stänger du av {{ui:workspace.cameraInertia}} under {{ui:workspace.appearance}}, så stannar vyn omedelbart.
- **Enskilda reglage:** Utan snabbläget kan du också bara stänga av {{ui:workspace.showShadows}} eller {{ui:workspace.edgeLines}}.
- **Använd grafikkortet:** Öppna `chrome://gpu` i Chrome (i Edge `edge://gpu`). Vid ”WebGL” bör det stå ”Hardware accelerated”. Står det ”Software only” är hårdvaruacceleration avslagen i webbläsarens inställningar. I Windows kan du även välja ”Höga prestanda” för webbläsaren under Inställningar → System → Bildskärm → Grafik, så att den använder det riktiga grafikkortet och inte det svagare i processorn.
- **Förenkla stora importerade nät:** En modell med flera hundra tusen trianglar saktar ned alla vyer. Hur du tunnar ut den står i kapitlet om filer under ”Förenkla ett importerat nät”.
- **Stäng andra flikar:** Varje öppen layerling-flik och varje annan 3D-sida delar på samma grafikkort.
