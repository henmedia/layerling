---
title: Solider och hål
summary: Hur enkla former blir borrhål, spår och fickor, och hur du ändrar en grupp senare.
---

Det här är den viktigaste idén i layerling, och den är lätt att lära sig: **Varje form är antingen en solid eller ett hål.** En solid blir kvar. Ett hål är ett verktyg som tar bort material.

## Solid eller hål

Markera en form och klicka på {{ui:inspector.solid}} eller {{ui:inspector.hole}} i dess egenskaper. Med tangentbordet går det snabbare: [[H]] gör markeringen till ett hål och [[S]] gör den till en solid igen. Båda finns även i menyn när du högerklickar på kroppen. Ett hål visas halvgenomskinligt så att du ser var det sitter. [[T]] gör en kropp halvgenomskinlig, till exempel för att se in i ett hölje; ett andra tryck gör den täckande igen. Det gäller hela markeringen: om någon kropp redan är halvgenomskinlig blir alla täckande, annars blir alla halvgenomskinliga.

Så länge inget är grupperat händer ingenting med ett hål. Det bara ligger där och visar var material kommer att försvinna senare.

![Cylindern är ett hål. Den sticker ut ur kubens ovansida så att den går rakt igenom.](shot:hole-before)

## Gruppera

Markera solider och hål och klicka på {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Nu tar hålen bort material från de solider de nuddar. Resultatet blir en enda ny form.

![Resultatet: en kub med ett borrhål.](shot:hole-after)

Så skapar du:

- **Borrhål:** en cylinder som hål rakt genom en kropp.
- **Spår:** en avlång låda som hål vid kanten.
- **Fickor:** ett hål som inte går ända igenom.
- **Gängor i en del:** ett gängat hål inställt som hål, se [Gängor och mekanik](chapter:threads-and-mechanics).

Ingår flera solider i gruppen slås de ihop. Två solider som nuddar varandra blir ett enda stycke.

Vid stora nät, exempelvis en importerad STL med hundratusentals trianglar, tar utskärningen några sekunder. layerling arbetar då i bakgrunden och visar ”{{ui:status.computing}}”; under tiden kan du vrida vyn och använda gränssnittet. Om du ändrar scenen under beräkningen kastas resultatet och layerling säger till. Detsamma gäller {{ui:editor.tool.split}}.

Du kan hantera en grupp precis som vilken form som helst: flytta, rotera, färglägga och gruppera vidare. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) löser upp gruppen så att de enskilda delarna kommer tillbaka.

### Göra en grupp till ett hål

En hel grupp kan också vara en solid eller ett hål. En enkel regel gäller:

- Om gruppen bara består av solider (eller bara av hål) växlar du hela gruppen och alla delar följer med.
- Om den innehåller båda delarna – exempelvis en kub med ett borrhål – behåller varje del sitt eget tillstånd. Hela gruppen blir då ett verktyg, men borrhålet förblir ett hål inuti den.

### Ändra storlek på en grupp: behålla hål och små delar

När en grupp dras ut längre, bredare eller högre töjs delarna med den som om de vore ritade på gummi: runda hål i en platta blir ovala och flyttas inåt. För att de ska behålla sin form väljer du {{ui:inspector.groupResizeKeepParts}} under {{ui:inspector.groupResize}} i gruppens egenskaper; {{ui:inspector.groupResizeStretch}} är vad varje grupp gör tills du ändrar det. Därefter byggs gruppen om från sina delar enligt en regel längs varje axel var för sig varje gång du ändrar storlek med handtagen, måttfälten eller {{ui:scalePercent.title}}:

- En del som sträcker sig över nästan hela gruppen – nio tiondelar eller mer – växer eller krymper med gruppen och behåller sitt avstånd till båda sidor: själva plattan, en vägg eller insidan av en låda, vars väggar alltså behåller sin tjocklek.
- Varje annan del behåller sin egen storlek och sitt avstånd till den närmare sidan. En del i mitten stannar i mitten.

En platta med ett hål 5 mm innanför varje hörn och ett spår i mitten som görs 40 mm längre behåller alltså sina hål runda och 5 mm från hörnen, och spåret kvar i mitten. Det finns ingen dold lösare och inget som behöver ställas in del för del: samma regel gäller alla delar så att du vet i förväg vad som händer. En vriden del räknas efter lådan den tar upp i gruppen och förblir vriden; en grupp inuti gruppen räknas som en del. Medan du drar i ett handtag töjs hela gruppen som vanligt; när du släpper byggs den om i samma ångra-steg. Görs gruppen mindre än en del plus sitt avstånd kräver krymper den delen med gruppen som förr, och ett meddelande talar om det. En speglad, avsmalnande eller vriden grupp, samt en med fasningar, avrundningar eller egen ytstruktur, töjer alltid allt. Slår du på valet på en grupp som redan har töjts ut ordnar den om sina delar direkt.

![En platta med ett hål 5 mm innanför varje hörn och ett spår i mitten, förlängd med 40 mm med Behåll hål och små delar: hålen är fortfarande runda och 5 mm från hörnen, spåret är fortfarande i mitten.](shot:group-keep-parts)

## Bunta

Ibland vill du bara hålla ihop delar utan att smälta samman dem – exempelvis en vit logga på en svart platta för flerfärgsutskrift. Till det finns {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), precis som i Tinkercad. En bunt flyttas, vrids och skalas som en enda form, men inget slås ihop:

- Varje del behåller sin färg och förblir solid eller hål. Buntens egenskaper har samma kort som en grupp: {{ui:inspector.solid}} och {{ui:inspector.hole}} för hela bunten (vilket behåller delarnas färger), {{ui:inspector.transparent}} ([[T]]) och {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); med flerfärg avstängt visas och exporteras bunten i en färg. {{ui:inspector.separateParts}} tar isär bunten, precis som [[Ctrl]]+[[Shift]]+[[G]].
- Hål skär inte ut något inuti bunten. Grupperar du bunten med andra delar skär dess hål i de andra delarna men fortfarande inte i buntens egna solider, som i Tinkercad. En tapp med sitt passande hål bredvid kan alltså återanvändas hur många gånger som helst som en bunt.
- Vid export till STL, 3MF eller OBJ förblir varje del en egen kropp; i 3MF och OBJ dessutom med sin färg.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) delar upp en bunt igen, och [[E]] öppnar den för redigering som en grupp. Fasa, avrunda och gröp ur fungerar inte på en bunt eftersom den inte är en enda kropp: gruppera den för det, eller bearbeta delarna var för sig. Ska ett hål i bunten även skära i buntens egna solider löser du upp bunten och grupperar delarna ([[Ctrl]]+[[G]]).

## Snitt

{{ui:editor.tool.intersect}} behåller bara det som två eller flera kroppar har gemensamt. Lägg två överlappande former ovanpå varandra, markera båda och klicka på verktyget. Så blir en cylinder och en låda till en del med en rund och en rak sida. En grupp räknas som den ser ut, inklusive hål. Är även ett hål markerat återstår det som alla solider delar med alla hål. Har formerna inget gemensamt ändras inget och ett meddelande säger så. Första klicket visar den gemensamma delen i förväg: de markerade formerna blir genomskinliga och det de delar ritas i grönt. Markera och flytta varje form för sig så följer den gröna delen efter; ett andra klick på {{ui:editor.tool.intersect}} verkställer, och [[Esc]] stänger förhandsvisningen. Former med för många trianglar för förhandsvisning, som stora importerade nät, skärs redan på första klicket.

{{ui:editor.tool.hull}} sveper in de markerade formerna i en enda konvex kropp, som med krympplast: den minsta kropp utan inbuktningar som omsluter alla delar. En halvsfär på en cylinder blir en kupol utan skarv, fyra cylindrar i hörnen blir en låda med rundade hörn, två sfärer en kapsel. Hål i markeringen skärs ut ur höljet efteråt. Delarna finns kvar inuti: {{ui:group.edit}} öppnar höljet som en grupp, och flyttar du en del där och stänger byggs höljet om på nytt. Höljet är ett nät så runda former får fasetter, och kantverktygen fungerar på det som på andra nät. När bara hål är markerade blir höljet själv ett hål: två cylinderhål skär ett avlångt spår. Ett hölje fyller igen allt som är ihåligt i delarna: ett rör, en cylinder urgröpt med {{ui:editor.tool.hollow}} eller en del grupperad med hål. Slå på {{ui:inspector.hullKeepHoles}} under Egenskaper för att hålla dem öppna: då fyller höljet bara utrymmet mellan delarna, och en urtagning i sidan av en del finns också kvar.

{{ui:editor.tool.cookieCutter}} gör en pepparkaksform av markeringen: en tunn vägg längs konturen, 15 mm hög, och en platt kant på 2 mm runt foten så att formen står på sin kant och tummen har något att trycka på. Markera en importerad SVG eller en skisskropp så används dess egen kontur. En text som ligger plant ger bokstävernas egna kurvor. Varje annan form – en byggd form, ett importerat nät eller flera delar – ger det den står på: den kontur arbetsytan skär genom den, så ställ den på arbetsytan först. Delar som överlappar ger en gemensam kontur runt alla, som om de vore grupperade; delar isär ger varsin pepparkaksform i samma bunt. Konturen spegelvänds i sidled: formen skrivs ut stående på kanten och vänds upp och ned vid bakning så att text och logotyp kommer rättvända i degen. Väggens topp smalnar av till en 0,4 mm bred skäregg. Hål inuti konturen, som insidan av ett e eller ett a, får egna väggar så att de också stansas ut. De är en egen kropp i bunten, {{ui:cookieCutter.part.innerWalls}}: vill du bara prägla in text eller mönster i degen i stället för att skära igenom gör du dem lägre under Egenskaper. Med 15 mm vägg och 5 mm tjock deg trycker 12 mm innerväggar ned 2 mm i degen. Innerväggar lägre än ytterväggen har plan ovankant i stället för skäregg: de ska bara trycka, och en egg skulle lämna vassa spetsar som bryts av och spår där deg fastnar. Ge dem en egg under Egenskaper om du ändå vill ha det. Två bryggor vid kanten på sidan du trycker mot håller varje innervägg fäst vid ytterväggen runtom, 4 mm breda och 3 mm höga. Varje brygga står med hela sin bredd mot väggarna mitt på en sida längs konturen och aldrig tvärs över en annan del. Delar bredvid varandra, som bokstäverna i ett namn, kopplas också ihop med närmaste granne först så att bryggorna löper som ett nät och även en bokstav mitt i ordet hålls kvar. Ett klick på verktyget öppnar ett litet fönster: där väljer du en {{ui:cookieCutter.support.plate}} i stället för bryggorna, vilket fyller hela konturen på trycksidan och ger större stadga och fäste på byggplattan, men hindrar dig från att trycka ut degen bakifrån. {{ui:cookieCutter.fillet}} sätter små 45°-lutningar där väggarna står på kanten, bryggorna eller plattan så att tunna detaljer som pricken över ett i inte bryts loss; de blir en egen kropp i bunten. Där ställer du också in hur mycket lägre innerväggarna är och om konturen speglas; värdena sparas till nästa form. Höjden ändrar du annars under Egenskaper som för kanten. Formen ersätter markeringen som en bunt av skisskroppar, och {{ui:group.edit}} öppnar den. Vägg, innerväggar och kant använder skissens fyllnadslägen som linje utanför siluetten: ändra tjocklek, höjd eller färg för varje del under Egenskaper, liksom väggens {{ui:prop.sketchCuttingEdge}} (0 för plan topp). Där en snäv böj inte rymmer en fas på båda sidor fasas väggen bara på utsidan fram till samma egg. Där en kontur inte går att fasa alls – en logotyp med vassa spetsar eller en kontur hämtad ur en kropps trianglar – byggs eggen i fina steg om 0,1 mm som ett 0,2 mm utskriftslager inte skiljer från en lutning; en sådan vägg blir ett triangelnät i stället för en exakt kropp. Vill du behålla konturen rättvänd som den ritades speglar du tillbaka formen med {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. En PNG- eller JPG-bild fungerar också: vid import spåras den till en skisskropp som pepparkaksformen sedan följer.

{{ui:editor.tool.loftSketches}} förenar två skisskroppar eller importerade SVG:er till en enda kropp: konturen hos den undre längst ned, konturen hos den övre längst upp, med raka väggar däremellan. Det ger en tratt, ett övergångsstycke från kvadratiskt till runt eller en ram som smalnar av uppåt. Lägg de två kropparna ovanför varandra där de ska sitta, förskjutna eller vridna om du vill, markera båda och klicka på verktyget. Övergången sträcker sig från undersidan av den undre kroppen till ovansidan av den övre.

Var och en av de två behöver exakt en kontur. Har den ena ett hål – en ring – behöver den andra lika många hål, och då övergår hålen också: två ringar ger en ihålig vägg. En skiss byggd som linje (utsida, insida eller centrerad under Egenskaper) räknas som en sådan ring. En importerad SVG kommer in fylld; för att göra den till en ring väljer du en linjebredd under Egenskaper. Båda kropparna måste ligga plant; verktyget nekar lutande kroppar.

Övergången är en exakt CAD-kropp; kantverktygen och STEP-exporten hanterar den som sådan. De två skisserna finns kvar inuti: {{ui:group.edit}} öppnar dem som en grupp, och flyttar eller ändrar du en del där – eller redigerar dess skiss – och stänger gruppen byggs övergången om på nytt. {{ui:editor.tool.ungroup}} frigör de två skisserna igen. För två rektanglar, cirklar eller polygoner finns dessutom formen Loft i formbiblioteket, där du ställer in ändarna med siffror.

## Skära ut en kropp ur en annan

För delar som ska passa ihop – en axel i en hylsa eller en bult i ett hus – gör du den ena delen och skär ut den ur den andra. Markera de två kropparna och klicka på {{ui:editor.tool.cutOut}} i området {{ui:editor.group.combine}}, eller högerklicka och välj det där. Verktygsfönstret anger delen som stannar kvar och kroppen som får håligheten; layerling tar den mindre som del, och ett klick på {{ui:cutOut.swap}} vänder på rollerna. {{ui:cutOut.clearance}} gör håligheten så mycket större än delen åt alla håll: 0 passar exakt, 0,2 mm är ett vanligt spelrum för utskrift. {{ui:cutOut.apply}} skär ut en kopia av delen ur den andra kroppen och lämnar själva delen orörd där den står. Resultatet är en grupp: {{ui:editor.tool.ungroup}} delar upp utskärningen igen. Spelrum kräver att delen är en exakt kropp, precis som verktyget {{ui:editor.tool.offset}} som används under huven.

## Stansa en kontur genom en kropp

För att skära konturen av en kropp rakt genom en annan markerar du först stansen och sedan kroppen som ska stansas, och klickar på {{ui:editor.tool.punch}} i området {{ui:editor.group.combine}} eller väljer det i högerklicksmenyn. De två behöver inte röra vid varandra: stansen kan stå var som helst framför kroppen och bara dess kontur sedd längs {{ui:punch.axis}} räknas, så en tekanna hållen över en bricka lämnar en tekannformad öppning. layerling börjar med den axel längs vilken stansen står längst från kroppen; X går vänster–höger, Y fram–bak, Z uppåt. {{ui:punch.swap}} byter roller, och {{ui:punch.clearance}} vidgar öppningen åt alla håll – 0,2 mm för en utskriven del som ska kunna skjutas igenom. {{ui:punch.apply}} grupperar öppningen med kroppen som en exakt skisskropp satt till hål, så {{ui:editor.tool.ungroup}} frigör den igen; stansen ligger kvar där den står. Flytta eller vrid den och stansa igen för fler öppningar.

## Redigera en grupp

Om ett borrhål blev för litet behöver du inte lösa upp gruppen och bygga om. Markera gruppen och klicka på {{ui:group.edit}} i egenskaperna, mappikonen i objektlistan eller tryck [[E]]. I objektlistan kan du också fälla ut gruppen med pilen och klicka direkt på en del: då öppnas gruppen med just den delen markerad. Ett dubbelklick på gruppen gör samma sak, liksom i Tinkercad, även på en bunt; vill du inte det kan du stänga av {{ui:workspace.doubleClickOpensGroup}} i inställningarna. En del börjar inte flyttas förrän pekaren dragits några pixlar, så ett darrigt klick eller dubbelklick rubbar den inte. Delarna ligger nu löst så att du kan ändra dem med alla verktyg: göra ett hål större, flytta en kropp eller lägga till ett hål.

![Gruppen under redigering: listen längst ned har Avbryt och Klar, och objektlistan visar delarna.](shot:open-group)

En list syns längst ned i bild. {{ui:group.done}} bygger om gruppen med dess namn, färg och status som solid eller hål. {{ui:common.cancel}} ställer tillbaka den orörd.

Om en av delarna i sin tur själv är en grupp kan du redigera den på samma sätt, och så vidare så djupt din design går. Listen visar var du befinner dig, till exempel ”Fäste › Skruvpelare”. {{ui:group.done}} och {{ui:common.cancel}} avslutar alltid den innersta gruppen och tar dig ett steg tillbaka ut. Medan du är inne i en grupp kan bara grupperna bland dess delar öppnas; för att redigera en annan avslutar du först.

Till skillnad från {{ui:editor.tool.ungroup}}, som tar isär gruppen helt, behåller redigeringen gruppen: dess namn och inställningar består, och du kan alltid gå tillbaka med {{ui:common.cancel}}.

Obs: avrundningar och fasningar som du hade lagt på **hela** gruppen går förlorade vid ombyggnad. Listen varnar om det.

## Dela

{{ui:editor.tool.split}} i området {{ui:editor.section.splitShape}} skär markeringen i två delar med ett plan – exempelvis en del som är för stor för byggplattan eller där du vill se insidan. Markera en eller flera solider eller hål och klicka på verktyget. Ett halvgenomskinligt plan visar exakt var snittet hamnar, och en vit linje markerar det direkt på kropparna där planet skär dem; inget ändras förrän du verkställer.

- {{ui:split.orientation}}: **X** lägger ett lodrätt snitt mellan vänster och höger, **Y** mellan fram och bak, **Z** ett vågrätt snitt mellan topp och botten. Axlarna benämns som på Positionskortet, med Z uppåt. Planet startar parallellt med arbetsytan, alltså med Z på grundplattan.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} lägger planet parallellt med arbetsytan, {{ui:split.workplaneAcrossX}} och {{ui:split.workplaneAcrossY}} ställer det vinkelrätt mot den, tvärs över X eller Y. Där arbetsytans origo korsar markeringen går planet igenom det, annars genom mitten. På grundplattan går {{ui:split.workplaneAcrossX}} och {{ui:split.workplaneAcrossY}} alltid genom markeringens mitt, eftersom plattans mitt inte hör ihop med delarna. På så sätt kan du lägga arbetsytan på en lutande yta med [[W]] och skära rakt där utan att vrida några vinkelreglage.
- {{ui:split.position}}: var planet korsar, via skjutreglaget eller inskrivet mått. Det börjar i mitten. Du kan också dra i pilspetsen på planet; då flyttas planet längs pilen i steg om 0,1 mm.
- {{ui:split.pickFace}}, knappen bredvid positionen, lägger planet på en kroppsyta: klicka på knappen och klicka sedan på ytan. Riktning, båda rotationerna och position ställs in automatiskt. Medan du pekar visar ett blått plan under muspekaren vilken yta som väljs. Även en yta på en kropp som inte är markerad fungerar för att linjera snittet med den, medan planet stannar inom markeringen. [[Esc]] avslutar ytvalet och lämnar planet där det står.
- De två vridreglagen nedanför vrider planet kring de andra två axlarna, upp till 180° åt varje håll, för sneda snitt. De kan kombineras.

{{ui:split.apply}} eller [[Enter]] gör snittet, [[Esc]] avbryter (under ytvalet avslutar första [[Esc]] bara ytvalet). Varje objekt som planet korsar blir två slutna kroppar namngivna efter sin sida, till exempel ”Box (Z+)” och ”Box (Z-)”; objekt som planet missar stannar som de var. Ett hål blir två hål, och en urgröpt kropp behåller sitt hålrum. Båda halvorna ligger kvar där de stod – för utskrift lägger du varje halva på sin snittyta med {{ui:editor.tool.layFlat}}.

{{ui:split.connectors}} linjerar upp halvorna mot varandra igen, precis som skärverktygen i PrusaSlicer, OrcaSlicer och Bambu Studio. Med {{ui:split.connectors.none}} (standard) sker delningen som ovan. {{ui:split.connectors.dowels}} gör ett hål i vardera halvan samt lösa styrstift som passar i båda: stiften läggs ut som en tredje kropp stående bredvid halvorna på golvet så att de skrivs ut tillsammans – stående blir stiften runda i utskriftslagren precis som sina hål, vilket är det passningstestet mäter. {{ui:split.connectors.plugs}} sätter fasta tappar på den halva vars namn slutar med minus, med motsvarande hål i den andra halvan. Kopplingarna sitter vinkelrätt mot planet oavsett hur det är vridet, med sin diameter plus 1,2 mm gods till varje kant av snittytan och det dubbla mellan två kopplingar. Varje separat yta av snittet får sina egna kopplingar jämnt fördelade: {{ui:split.connectorCount}} anger hur många, och 0 anpassar antalet efter ytans storlek med minst två. En yta som är för liten för en koppling får ingen, och en koppling hoppas över där en halva är tunnare än hålet är djupt; panelen talar om det innan du delar, och vita ringar på planet visar var de hamnar. Får ingen plats alls delas delarna utan kopplingar, och statusraden meddelar det.

- {{ui:split.connectorDiameter}} är diametern för styrstift och tappar, 5 mm från början.
- {{ui:split.connectorDepth}} är hur långt varje hål går in i halvan. Ett löst stift blir dubbelt så långt minus 0,6 mm och en fast tapp 0,3 mm kortare än sitt hål, så de bottnar aldrig och halvorna stänger helt dikt an. Stift och tappar har en liten fas i ändarna, och varje hål en fas i mynningen så att inte ett brett första lager stryper hålet.
- {{ui:split.dowelBase}}, ihop med {{ui:split.connectors.dowels}}, ställer de lösa stiften på en gemensam platta som fäster mot byggbädden, för skrivare där bädden rör sig och får stående stift att vicka loss. Varje stift vilar på en liten knopp i ett fäste på plattan; efter utskrift vickar du varje stift fram och tillbaka så snäpper det loss, på samma sätt som tappen i passningstestet.
- {{ui:split.connectorClearance}} är spelrummet mellan ett stift eller tapp och dess hål. Har du mätt upp din skrivares spel med passningstestet (i kapitlet om utskrift) utgår verktyget från det, annars från 0,2 mm.

{{ui:split.connectors.dovetail}} håller ihop halvorna utan lim, som laxstjärtssnittet i OrcaSlicer: en kilformad tunga som breddar sig ut från snittytan sitter på den halva vars namn slutar med minus och löper rakt tvärs över ytan från kant till kant, medan den andra halvan får det matchande spåret öppet i båda ändar. Skjut ihop halvorna från sidan längs tungan; väl på plats går de inte att dra isär tvärs över snittet. Tungorna löper i snittytans längdriktning, och där en kropp möter planet i flera delar löper de likadant på alla så att en halva glider på i ett drag. {{ui:split.connectorCount}} anger antalet tungor bredvid varandra på varje del; 0 väljer efter delens bredd, en per sex tungbredder, minst en. Bredvid sin breda ovankant lämnar en tunga halva sin egen bredd plus ytterligare 1,2 mm gods till snittytans kant, och dubbla avståndet mellan två tungor. En del som är för smal för en tunga eller för kort längs den får ingen, och en tunga hoppas över där den andra halvan är tunnare än spåret är djupt. Vita konturer på planet visar var de hamnar: det fyllda bandet är tungans fot, linjen utanför är dess breda topp.

- {{ui:split.dovetailWidth}} är tungans bredd där den lämnar snittytan, 6 mm från början.
- {{ui:split.dovetailDepth}} är hur långt den sticker ut ur snittytan in i den andra halvan, 4 mm från början. Spåret görs 0,3 mm djupare så att halvorna sluter tätt.
- {{ui:split.dovetailAngle}} är hur mycket varje sida lutar utåt från vinkelrätt mot snittytan, från 5° till 30°, 15° från start. Ju större vinkel, desto bredare blir tungans topp och desto stadigare håller den.
- {{ui:split.dovetailTurn}}: 0 lägger tungorna längs med ytan, 90 tvärs över snittytan, och vinklar däremellan vrider dem så mycket.
- {{ui:split.connectorClearance}} är utrymmet på vardera sidan mellan tunga och spår, hämtat från ditt passningstest på samma sätt som för styrstiften. Tungans ändar fasas runtom så att den lätt hittar in i spåret, och spåret får en fas vid mynningen.

För utskrift lägger du halvan med spåret på sin snittyta, och skriver ut halvan med tungan upp och ned med snittytan uppåt: då lutar tungans sidor bara med sin egen vinkel och kan skrivas ut utan stöd.

Hål delas utan kopplingar.

{{ui:split.modeStretch}} överst i panelen, bredvid {{ui:split.modeSplit}}, förlänger markeringen vid planet i stället för att dela den i två – till exempel en nedladdad låda utan CAD-fil vars fack behöver bli längre. Placera planet som vid delning, rakt genom den del som får växa, och skriv in {{ui:split.stretchLength}}: delen på sidan som pilen pekar åt flyttar så långt bort, och snittet genom kroppen vid planet dras ut över den sträckan och fyller glappet. Raka väggar och bottnar blir längre; fack, rundade hörn och hål på båda sidor behåller sin storlek. Ett minustal gör kroppen kortare: en skiva med den tjockleken tas bort på pilens sida och resten flyttar ihop. {{ui:split.stretchApply}} verkställer; varje objekt som planet korsar förblir en enda sluten kropp under sitt eget namn, som ett nät likt halvorna vid en delning. Där planet går genom ett lutande eller runt parti dras snittet ut rakt, så placera planet där kroppen är rak.

En grupp förblir en grupp: delarna som planet skär blir längre, delarna bortom planet flyttas med och de före det stannar som de är. Hålen förblir hål, delar som planet inte träffar behåller sina inställningar, och {{ui:editor.tool.ungroup}} delar fortfarande upp gruppen efteråt. En speglad, avsmalnad, rundad eller texturerad grupp sträcks fortfarande som en enda kropp. Ett objekt som är markerat tillsammans med de andra och ligger helt bortom planet flyttas också med, så ett hål i änden av en låda stannar i änden.

Halvorna blir vanliga nät: formegenskaper som sidantalet på en cylinder eller redigerbar text går förlorade, så ställ in sådant först. [[Ctrl]]+[[Z]] tar tillbaka originalet i ett steg. Låsta och dolda objekt kan inte delas.

Ett importerat nät behöver en sluten yta för att kunna delas, grupperas eller skäras. Har det öppningar – som ögonen på en figur som lämnats öppna eller en spricka i en skanning – sluter layerling dem först med ett plant lock och berättar hur många som slöts. Små öppningar och plana öppningar av valfri storlek sluts automatiskt; en stor öppning vars kant kröker sig lämnas till dig, och meddelandet säger så. Stäng den i programmet modellen kommer ifrån, eller med ett nätreparationsverktyg, och importera sedan igen.

## Dela upp delar

Om en form består av flera åtskilda bitar, som text gjord av enskilda bokstäver, delar {{ui:inspector.separateParts}} upp den i självständiga former. Posten finns även i menyn som öppnas när du högerklickar på formen.

> **Tips:** Gör alltid hål en aning längre än delen de ska gå igenom. Slutar hålet exakt kant i kant med ytan blir ibland en lövtunn hinna kvar. En millimeter extra säkrar resultatet.
