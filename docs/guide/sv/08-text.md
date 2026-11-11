---
title: Text och text längs en båge
summary: Upphöjd eller graverad text i åtta typsnitt eller ditt eget, och om du vill längs en cirkelbåge – som på ett mynt, ett lock eller en ring.
---

## Lägga till text

Välj {{ui:shape.text}} i formbiblioteket och placera den. I fältet {{ui:prop.text}} till höger skriver du vad det ska stå. Inställningarna nedanför:

- **{{ui:prop.font}}:** Åtta typsnitt finns med från start: Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil (bokstäver byggda av raka streck) och Japanese (Zen Maru Gothic). Ny text börjar i Sans. Tecken som å, ä, ö, ü, é och €-tecknet finns i varje typsnitt, liksom kana, de vanliga kanjitecknen och många av de ovanliga i namn som 澤, 槇 och 檜: ett japanskt namn fungerar i varje typsnitt och på en namnskylt. De japanska tecknen hämtas första gången en text behöver dem (de sällsynta kanjitecknen i en andra fil bara när texten innehåller något), så en sådan text visar frågetecken en kort stund. Därefter lagras de på datorn så att japanska även fungerar offline. Egna typsnitt läggs ovanpå, se [Egna typsnitt](#egna-typsnitt) nedan.
- **{{ui:nameTag.letterSize}}:** Hur stora bokstäverna är sedda uppifrån; {{ui:prop.height}} anger hur tjocka de är.
- **{{ui:prop.height}}:** Hur långt texten sticker upp från ytan.
- **{{ui:prop.bevel}}:** Rundar eller fasar bokstävernas kanter så att de ser mjukare ut. Med {{ui:prop.segments}} bestämmer du i hur många steg.
- **{{ui:nameTag.letterEdge}}:** rundar eller fasar ovankanten på bokstäverna, som på en namnskylt: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} eller {{ui:nameTag.edge.chamfer}}, med {{ui:nameTag.letterEdgeSize}} (0,4 mm från start, högst lika högt som texten). Det når längre än {{ui:prop.bevel}}, men bara så långt som staplarna är breda: där ett streck är smalare än dubbla storleken slutar kanten i en smalare ovansida. Undersidan förblir plan så att lösa bokstäver går att limma fast. När en kant är vald ersätter den {{ui:prop.bevel}}.
- **Längd:** En text rymmer upp till 250 tecken. Bokstäverna behåller sin storlek och raden blir så lång som behövs; vill du göra den kortare minskar du bokstavsstorleken. {{ui:nameTag.letterEdge}} fungerar för texter upp till 40 tecken, eftersom längre texter skulle ta minuter att bygga.
- **Storlek:** Radens längd och bredd ställer du in som på vilken form som helst. Dra i handtagen eller skriv in måtten.
- **{{ui:prop.textSpacing}}:** Mellanrummet mellan bokstäverna utöver det som typsnittet har, i procent av bokstavsstorleken: 0 behåller typsnittets eget, över 0 glesar ut bokstäverna och under 0 (ned till -50) drar ihop dem, vilket egna typsnitt ofta behöver. Bokstäverna behåller sin storlek och ramen följer raden, både för rak och bågformad text. Avståndet läggs inte på arabiska och hebreiska där bokstäverna binder ihop.
- **{{ui:prop.textStretch}}:** Avslagen från start: bokstäverna behåller sina proportioner och sitter mitt i ramen, så en ram som dragits bredare eller djupare än ordet kräver förblir större än bokstäverna. Slå på den så tänjs bokstäverna ut för att fylla hela ramen i båda riktningarna: en versal kan göras lägre eller smalare, som i Tinkercad. Gäller rak text; bågformad text har sin egen bokstavsstorlek.
- **{{ui:prop.textKerning}}:** Flyttar bokstavspar som lämnar för mycket luft mellan sig, som AY, AV, LT eller To, närmare varandra utifrån bokstävernas verkliga former, i alla typsnitt inklusive egna. Nya texter startar med funktionen påslagen; texter skapade innan den fanns behåller den avstängd så att inget flyttar sig i en sparad design. Bokstäverna behåller sin storlek och ramen följer med. Det fungerar på rak och bågformad text, inte på lodrät text, arabiska, hebreiska eller japanska.
- **{{ui:prop.textVertical}}:** Staplar bokstäverna uppifrån och ned, varje bokstav centrerad i en stående kolumn – för en dörrskylt eller ett namn längs en penna. Ramen ställer sig lodrätt och bokstäverna behåller sin storlek; {{ui:prop.textSpacing}} anger mellanrummet mellan dem. På bågformad text bildar bokstäverna en kolumn längs cirkelns vänstra sida, var och en stående rättvänd; {{ui:prop.textInwardColumn}} flyttar kolumnen till höger sida.

Text är från början en enda kropp. Vill du hantera bokstäverna var för sig klickar du på {{ui:inspector.separateParts}}. Då blir varje bokstav en egen form.

**Flera rader:** En text innehåller en rad. För en skylt eller bricka med flera rader öppnar du kortet {{ui:textBlock.title}} längre ned i egenskaperna: skriv raderna under {{ui:textBlock.lines}}, välj {{ui:textBlock.align}} ({{ui:textBlock.align.left}}, {{ui:textBlock.align.center}} eller {{ui:textBlock.align.right}}), {{ui:textBlock.gap}} och {{ui:textBlock.step}} – vid 80 % blir varje rad en femtedel mindre än den ovanför. Knappen gör varje rad till en egen text under den ovanför, med den här textens typsnitt, höjd och fyllning; den första tar den här textens plats. Efteråt kan varje rad få egen storlek, typsnitt eller färg.

Bokstävernas kanter kan också fasas eller avrundas, både raka och bågformade, se [Bryta kanter och gröpa ur kroppar](chapter:edges-and-hollowing). Använd små mått som 0,2 till 0,5 mm eftersom bokstavsstrecken är smala.

## Egna typsnitt

Listan under {{ui:prop.font}} ritar varje typsnitt med dess egna bokstäver och med orden ur din text, så att du ser hur det kommer att se ut innan du väljer. Detsamma gäller typsnitten i fönstret nedan; typsnitten från din dator visar sina namn i sitt eget utseende. Piltangenter och [[Enter]] fungerar i listan, och en bokstavstangent hoppar till nästa typsnitt som börjar på den bokstaven.

Utöver de åtta inbyggda typsnitten kan du använda vilket eget typsnitt som helst: en teckensnittsfil från datorn eller, i Chrome och Edge, ett typsnitt installerat på datorn. Välj {{ui:font.manage}} längst ned i {{ui:prop.font}}. Fönstret {{ui:font.title}} öppnas.

- **{{ui:font.addFile}}** tar emot en TrueType-fil (`.ttf`), en OpenType-fil (`.otf`) eller en WOFF-fil (`.woff`). Du kan också helt enkelt dra filen in i fönstret.
- **I Windows** ligger installerade typsnitt i mappen Fonts (`C:\Windows\Fonts`). Webbläsarens fildialog döljer den. Öppna den i Utforskaren i stället och dra typsnittet in i fönstret {{ui:font.title}}. Typsnitt installerade bara för dig ligger i `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, som fildialogen också visar. På Mac ligger typsnitten i `/Library/Fonts` och `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** listar typsnitten installerade på din dator. Första gången frågar webbläsaren om layerling får läsa dem. Sökfältet hittar snabbt ett typsnitt, och ett klick väljer det.

Om en text är markerad får den det nya typsnittet direkt. Annars dyker typsnittet upp under {{ui:prop.font}} i gruppen {{ui:font.customGroup}}, och {{ui:font.use}} i fönstret lägger det på markerade texter. Egna typsnitt fungerar likadant som inbyggda: text längs en cirkelbåge, fasningar och avrundningar på kanterna samt STEP-export fungerar alla på samma sätt. Tecken som saknas i typsnittet lånas från Sans.

### Arabiska och hebreiska

Arabiska, persiska, urdu och hebreiska skrivs från höger till vänster: första bokstaven står längst till höger, och i en blandad text som ”Name عربي” löper bara det arabiska ordet baklänges medan siffror står kvar som vanligt. Arabiska bokstäver binds samman med sina grannar enligt skriftens regler, och lam-alef blir en ligatur. Detta kräver ett typsnitt som har de tecknen; de inbyggda har dem inte. Lägg till ett eget, som Arial, Tahoma eller Segoe UI i Windows, eller ett fritt typsnitt som Noto Naskh Arabic, Noto Sans Arabic eller Amiri. Vokaltecken hamnar på den bokstav de hör till. Text längs cirkelbåge, kontur, siluett, lager och namnskyltar fungerar likadant med dem som med all annan text.

### Vad fungerar i vilken webbläsare

| Webbläsare | Välja teckensnittsfil | Typsnitt från datorn |
| --- | --- | --- |
| Chrome och Edge på dator, även installerad layerling-app | ja | ja, efter att webbläsaren frågat |
| Firefox | ja | nej |
| Safari på Mac | ja | nej |
| Surfplatta och telefon | ja, från enhetens filer | nej |

Webbsidor får inte bara läsa installerade typsnitt hur som helst. Bara Chrome och Edge har en behörighet för det, och bara på säkra sidor över `https` som på layerling.com. När layerling körs över `http`, till exempel på en egen server eller via Docker i hemnätverket, saknas {{ui:font.fromSystem}}; dra då in teckensnittsfilen från Utforskaren i stället. I andra webbläsare väljer du filen från typsnittsmappen med samma resultat. Om du nekade frågan i Chrome eller Edge tillåter du den igen i webbplatsinställningarna bakom hänglåset till vänster om adressen.

layerling kan inte läsa WOFF2-filer (det finns nästan alltid en TTF- eller OTF-version), typsnittssamlingar (`.ttc`, flera typsnitt i samma fil) eller färgemoji-typsnitt. Ur mycket stora typsnitt, som kinesiska, hämtar layerling de första 8000 tecknen. Ett variabelt typsnitt läses i sitt normalläge, oftast normal vikt.

Vissa typsnitt, framför allt skrivstilar och variabla typsnitt, ritar en bokstav med streck som överlappar varandra. layerling slår ihop dem till en ren kontur när typsnittet läses in så att kroppen förblir utskrivbar. Sådana bokstäver byggs då av mycket korta raka bitar i stället för kurvor; det märks inte.

### Var typsnitten sparas

Ett eget typsnitt stannar **i den här webbläsaren på den här datorn**. En annan webbläsare eller annan dator känner inte till det förrän du lägger till det där också. Rensar du webbläsarens webbplatsdata försvinner även typsnitten. I fönstret {{ui:font.title}} tar papperskorgen bort ett typsnitt ur webbläsaren. Dina designer förlorar inget på det, vilket nästa avsnitt visar.

### Skicka vidare designer med egna typsnitt

En design **sparar inte själva teckensnittsfilen**, bara konturerna av de bokstäver som dess texter använder, inklusive de som finns i tidigare steg i historiken. Om en text säger ”Hej” följer bara H, e och j med. Det gäller varje sätt att spara: i webbläsaren, på egen server, som `.lyl`-fil och i {{ui:myShapes.title}}.

Alltså:

- **Designen öppnas korrekt överallt**, även på en dator utan typsnittet. Texterna ser likadana ut och går att flytta, vrida, skala och avrunda.
- **Nya bokstäver kräver typsnittet.** Om någon utan typsnittet skriver in en bokstav som designen inte hade med sig ritar layerling den från Sans. Under {{ui:prop.font}} är typsnittet då märkt {{ui:font.fromDesign}}. Läggs teckensnittsfilen till kommer alla bokstäver tillbaka.
- **Exporter innehåller bara geometri.** STL, 3MF, OBJ, STEP och SVG rymmer kroppar och konturer, inga typsnitt.
- **Äldre versioner av layerling** känner ännu inte till egna typsnitt och ritar sådana texter med Multilanguage.

**Licenser:** Typsnitt är skyddade av upphovsrätt, och deras licens avgör vad du får göra med dem. De inbäddade bokstavskonturerna motsvarar det som PDF-filer tar med sig från ett typsnitt, vilket de flesta licenser tillåter. Vissa kommersiella typsnitt förbjuder dock att ens enstaka bokstäver skickas vidare. Kontrollera typsnittets licens innan du delar eller publicerar en design med eget typsnitt. Fria typsnitt som de från Google Fonts (oftast under SIL Open Font License) kan delas vidare utan bekymmer. För en utskriven del eller exporterad STL spelar det ingen roll: de innehåller inget typsnitt längre, bara geometri.

## Upphöjd eller graverad

- **Upphöjd:** Lägg texten på ytan och gruppera den med kroppen. Den växer ut som en relief.
- **Graverad:** Ställ om texten till {{ui:inspector.hole}}, låt den sticka ned en bit i ytan och gruppera den med kroppen. Då graveras bokstäverna in.

För text på en sidoyta lägger du först arbetsytan på den ytan, se [Vy och arbetsyta](chapter:view-and-workplane).

## Schabloner: bryggor för bokstävers mittdelar

Skär du rakt igenom en platta tappar bokstäver som O, A och B sina mittdelar: de ligger löst inuti bokstaven och faller ut. {{ui:stencilBridges.title}} håller fast dem vid plattan med små bryggor, som på en schablon.

1. Byt texten till {{ui:inspector.hole}}, låt den gå rakt igenom plattan och markera båda, grupperade eller inte.
2. Klicka på {{ui:stencilBridges.title}} i gruppen {{ui:editor.section.splitShape}} i verktygsfältet, högerklicka på markeringen eller sök upp det med [[Ctrl]]+[[K]]. Bryggorna syns i orange där de kommer att hamna.
3. Ställ in {{ui:stencilBridges.width}} och {{ui:stencilBridges.count}}. {{ui:stencilBridges.height}} börjar vid plattans tjocklek; lägre bryggor ligger jämns med botten, i mitten eller jämns med ovansidan av plattan enligt {{ui:stencilBridges.position}}. På en spraymall lämnar bryggor i ovankant fritt utrymme under för färgen.
4. {{ui:stencilBridges.apply}} grupperar bryggorna med plattan.

Varje brygga är en vanlig låda: öppna gruppen för att flytta, ta bort eller lägga till en egen. Ändrar du texten senare markerar du gruppen och klickar på {{ui:stencilBridges.title}} igen; nya bryggor ersätter de gamla. En text som bara är graverad och inte går rakt igenom får inga bryggor eftersom inget kan falla ut där. För laser eller skärplotter lägger DXF- och SVG-exporten till samma bryggor, se [Filer, lagring och delning](chapter:files-and-saving).

## Kontur, siluett och bredare

En text behöver inte byggas som ifyllda bokstäver. {{ui:prop.textFill}} i egenskaperna ger samma valmöjligheter som Tinkercad:

- **{{ui:prop.textFill.filled}}:** bokstäverna som de är.
- **{{ui:prop.textFill.outline}}:** en linje längs bokstävernas kontur, hälften innanför och hälften utanför den.
- **{{ui:prop.textFill.outer}}:** en linje runt utsidan av bokstäverna.
- **{{ui:prop.textFill.inner}}:** en linje på insidan av bokstäverna.

När en linje är vald visas två inställningar direkt under listan: {{ui:prop.sketchLineWidth}} anger hur tjock linjen är, och {{ui:sketch.strokeJoin}} hur den går runt hörn ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} eller {{ui:sketch.strokeJoin.miter}}). De mer sällsynta valen ligger under {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} tar bort hålen i O, A eller e, och {{ui:prop.textWider}} behåller bokstäverna ifyllda men gör dem tjockare med linjebredden runtom; bokstäver som nuddar varandra växer ihop till ett stycke.

Med en linje på utsidan, en centrerad linje eller ”Bredare” växer textens ytterram medan bokstäverna behåller sin storlek. {{ui:prop.bevel}} och {{ui:prop.segments}} finns bara för ifyllda bokstäver.

## Lager och namnskyltar

En namnskylt för flerfärgsutskrift är en text i lager: bokstäverna överst, under dem samma text något bredare i en andra färg, och längst ned en platta utan hål i en tredje färg. layerling gör den med ett klick:

- **En ny namnskylt:** välj {{ui:shape.nameTag}} i formbiblioteket och placera den. Där står ”Name” i vita bokstäver på en röd kant och en mörk platta.
- **Från en text:** markera texten och klicka på {{ui:nameTag.makeLayers}} överst i dess egenskaper.

Alla inställningar för skylten finns i kortet {{ui:nameTag.title}} överst i egenskaperna:

- **{{ui:prop.text}}** och **{{ui:prop.font}}**, även egna typsnitt. Skylten växer med orden.
- **{{ui:nameTag.letterSize}}:** hur höga de stora bokstäverna är i mm. Alla lager följer med och förblir inriktade.
- **{{ui:prop.textVertical}}:** ställer skylten upprätt med bokstäverna under varandra, alla lager likadant.
- **{{ui:nameTag.layers}}:** en rad per lager, uppifrån och ned. Varje rad har färg (klicka på den färgade rutan), hur mycket bredare lagret är än bokstäverna, höjden samt {{ui:nameTag.noHoles}} som fyller hålen i bokstäver som O och A. {{ui:nameTag.corners}} styr hur ett bredare lager rundar bokstävernas hörn: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} eller {{ui:nameTag.corner.miter}}. Översta raden är själva bokstäverna. **+** lägger till ett lager i botten, **–** tar bort det understa lagret. En skylt har två till sex lager.
- **{{ui:nameTag.keyring}}:** ger det understa lagret en rak öra med rundad ände och hål för en nyckelring; örat växer med hålet. Ett 3 mm hål (standard) ger ett 6,5 mm brett öra som sticker ut 6,75 mm, med hålkanten 2 mm från kanten av bottenlagret. Välj {{ui:nameTag.keyringDiameter}} och {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} eller {{ui:nameTag.side.top}}. {{ui:nameTag.side.free}} tar bort hålet från skylten och sätter ett eget {{ui:nameTag.keyringTab}} bredvid den i bottenlagrets färg och höjd: en vanlig form du flyttar och vrider med handtagen precis dit skylten behöver den. När den sitter på plats gör {{ui:nameTag.keyringTabFix}} i dess egenskaper den till en del av närmaste skylt där den står: hålet går igenom varje lager det når, örat förenas med bottenlagret, och båda håller sig vid det hörnet av bokstäverna när ord eller storlek ändras. {{ui:nameTag.side.free}} plockar ut örat igen där det satt för att kunna flyttas på nytt. Hålet går igenom alla lager det nuddar, och örat följer med när du ändrar text, bokstavsstorlek eller typsnitt. {{ui:nameTag.keyringAlong}} flyttar örat uppåt eller nedåt längs sin sida (längs överkanten: åt vänster eller höger) ända tills det skulle lämna sidan; 0 är i mitten. Använd det när mitten av sidan träffar en lucka, som bredvid ett J, och flytta örat mot den del av bokstaven som sticker ut.
- **{{ui:nameTag.letterEdge}}:** rundar eller fasar ovankanten på bokstäverna i översta lagret så som en utskriven skylt känns bäst: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} eller {{ui:nameTag.edge.chamfer}}, med {{ui:nameTag.letterEdgeSize}} (0,4 mm från start, högst lika högt som lagret). Det fungerar för alla typsnitt och ord. Kanten är en del av bokstävernas nät, så det vanliga kantverktyget tar en sådan text som nät vilket blir tungt för så fin text; välj kanten här i stället.

Varje ändring syns direkt. Skylten är en bunt: den flyttas som en helhet, och varje lager förblir en egen kropp i sin egen färg precis som slicern behöver för flerfärgsutskrift. Vill du avrunda eller fasa kanterna på ett enskilt lager klickar du på {{ui:group.editBundle}} och väljer lagret, se [Bryta kanter och gröpa ur kroppar](chapter:edges-and-hollowing).

### Flera namnskyltar på en gång

Skriv namnen i {{ui:textLayers.names}}, ett per rad, upp till hundra stycken. Knappen nedanför visar hur många skyltar som skapas, till exempel ”Skapa 12 namnskyltar”. Varje skylt får samma lager, bokstavsstorlek och nyckelringshål och blir ett eget objekt; de läggs ut i rader nedanför den första med 5 mm mellanrum. Även en vanlig text har namnlistan längre ned i sina egenskaper.

## Ikonskyltar

En ikonskylt är samma typ av skylt fast med en SVG-ikon i stället för bokstäver: ett hjärta, ett moln eller ett föreningsmärke. Ikonen överst, under den samma kontur en aning bredare i en andra färg, och längst ned en platta utan hål.

- **En ny ikonskylt:** välj {{ui:shape.iconTag}} i formbiblioteket. Ett litet fönster öppnas: klicka på {{ui:iconTag.browse}}, välj en SVG-, PNG- eller JPG-fil, kontrollera bilden, ange {{ui:iconTag.width}} på ikonen och klicka på {{ui:iconTag.ok}}. Skylten hamnar mitt på plattan med samma lager som en ny namnskylt.
- **Från en skisskropp:** en importerad SVG, eller en skiss du själv ritat, har {{ui:nameTag.makeLayers}} överst i sina egenskaper.

Kortet {{ui:iconTag.title}} överst i egenskaperna innehåller:

- **{{ui:iconTag.replace}}:** sätter ikonen från en annan fil (SVG, PNG eller JPG) på skylten; lagren och bredden behålls som de är.
- **{{ui:iconTag.iconWidth}}:** hur bred ikonen överst är i mm. Alla lager följer med och ligger kvar i linje.
- **{{ui:nameTag.layers}}:** samma rader som på en namnskylt – färg, hur mycket bredare, {{ui:nameTag.corners}}, höjd samt {{ui:nameTag.noHoles}}, **+** och **–**, två till sex lager. Översta raden är själva ikonen.
- **{{ui:nameTag.keyring}}:** precis som på namnskylten: ett nyckelringshål genom alla lager med ett rundat öra på bottenlagret utanför ikonen. {{ui:nameTag.keyringDiameter}} och {{ui:nameTag.keyringSide}} bestämmer storlek och placering; {{ui:nameTag.side.free}} ger ett eget öra precis som på namnskylten. Örat görs efter ikonens kontur, så på en mycket ojämn ikon bör du kontrollera var det möter plattan. {{ui:nameTag.keyringAlong}} flyttar örat längs sin sida som på namnskylten.
- **{{ui:iconTag.count}}:** hur många skyltar du vill ha, 1 till 100. {{ui:iconTag.fill}} räknar ut hur många som ryms på plattan för den skrivare du valt i inställningarna – för små märken en hel full platta. Knappen nedanför skapar dem med 5 mm mellanrum mitt på plattan; den första är själva originalskylten.

SVG-filen måste ha slutna konturer; en ritning med enbart öppna streck kan inte bli en skylt. En skisskropp vars fyllning är en linje behåller den: den linjens yta blir ikonen.

**En bild (PNG eller JPG)** spåras till en kontur, och förhandsvisningen visar konturen. Under {{ui:iconTag.part}} väljer du om {{ui:iconTag.part.dark}} eller {{ui:iconTag.part.light}} ska bli ikonen; från start tas det som inte är bakgrunden. Genomskinliga pixlar hör aldrig till ikonen. En SVG som bara innehåller en inbäddad rasterbild (som när Inkscape sparar en importerad bild) spåras på samma sätt. Konturen följer pixlarna, så en liten bild ger taggig kant: bilder på några hundra pixlar eller mer fungerar bäst. {{ui:iconTag.replace}} tar också den del av bilden som inte är bakgrunden.

## QR-koder

En QR-kod förvandlar en text eller webbadress till ett mönster som en mobilkamera läser: en länk till din butik på en skylt, wifi-namnet på ett glasunderlägg eller ett telefonnummer på en nyckelbricka.

Välj {{ui:shape.qrCode}} i formbiblioteket. Ett fönster öppnas med markören redan i textfältet:

- **{{ui:qrCode.text}}:** vad koden innehåller. Enter skapar koden, Skift+Enter börjar på en ny rad. Under fältet ser du hur mycket av utrymmet som används; å, ä, ö och andra specialtecken tar två byte. När texten är för lång säger fältet till.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q eller H. En högre nivå kan fortfarande läsas av när en del av koden blivit smutsig eller repad (L cirka 7 %, M 15 %, Q 25 %, H 30 %), men kräver fler moduler för samma text så att varje modul blir mindre. M är valt från start.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} skapar enbart koden, 4 mm hög. {{ui:qrCode.style.raised}} sätter den 1 mm högt på en vit 3 mm tjock platta som en bunt i två färger, så att en flerfärgsutskrift skriver koden mörk och plattan ljus. {{ui:qrCode.style.engraved}} skär ned koden 1 mm djupt i plattan.
- **{{ui:qrCode.sizeBy}}:** ange {{ui:qrCode.sizeBy.width}} för hela koden (40 mm från start) eller storleken på en modul; det andra måttet visas under. Moduler under 0,8 mm ger en varning. Det är en tumregel för ett 0,4 mm munstycke, ingen garanti: skrivare, material, färger och mobil spelar alla roll.
- **{{ui:qrCode.quietZone}}:** skannrar behöver en tom marginal på fyra moduler runt koden. På en platta ingår marginalen i plattan; stäng bara av den om plattan ska stå på en större ljus yta. Själva koden ensam har ingen egen marginal: lämna då utrymmet fritt runtomkring.
- **Höjder:** höjden på koden, eller på en platta kodens höjd respektive gravyrdjup och plattans tjocklek.

Förhandsvisningen visar koden precis som den byggs. {{ui:qrCode.ok}} placerar den mitt på plattan.

Koden är en kropp som vilken annan: flytta, vrid, skala (behåll samma bredd och djup så koden inte tänjs), gruppera, eller gör den till ett hål och gruppera den i en egen del för att gravera in den där. Skalar du den skalas hela koden så att varje modul förblir kvadratisk.

Kortet {{ui:qrCode.title}} överst i egenskaperna lagrar texten. Ändra den och klicka på {{ui:qrCode.regenerate}}: koden byggs om där den står i nuvarande bredd. Felrättning, tyst zon och utförande behålls som valts; för andra val gör du en ny kod från biblioteket.

Skanna koden med telefonen innan du skriver ut den, och en gång till efter utskrift. Mörkt på ljust läses säkrast; en ljus kod på en mörk platta läses inte av alla telefoner.

## Text längs en cirkelbåge

Ska texten inte löpa rakt utan följa kanten på ett mynt, ett lock eller en ring? För det finns inställningen {{ui:prop.textCurved}}.

![Text följer en cirkel. Alla bokstäver står på en gemensam baslinje.](shot:curved-text)

När du slår på den följer texten cirkeln. Alla bokstäver står på samma baslinje, lika jämnt som vid rak text. Det finns fem inställningar:

- **{{ui:prop.textRadius}}** (5 till 500 mm): Radien för cirkeln som bokstävernas baslinje följer. Bokstäverna behåller sin storlek; bara böjningen ändras.
- **{{ui:prop.textLetterWidth}}** (25 till 400 %): Hur bred varje bokstav ritas, i procent av sin egen bredd. Under 100 blir bokstäverna smalare, över 100 bredare; höjden består och båglängden växer eller krymper med dem. Praktiskt till exempel för hög, smal text på ett mynt. På rak text gör {{ui:prop.textStretch}} samma sak med ramen.
- **{{ui:nameTag.letterSize}}:** Hur höga bokstäverna är. Det styrs inte längre av formens bredd.
- **{{ui:prop.textInward}}:** Flyttar texten från cirkelns ovankant till dess nederkant. Bokstäverna pekar då med toppen inåt mot centrum.
- **{{ui:prop.textFlipped}}:** Vänder enbart på bokstäverna så att de går att läsa från andra hållet. Texten stannar kvar på sin plats längs cirkeln.

**Cirkelns centrum är formens centrum.** Därför fungerar inriktning precis som vanligt: centrerar du texten med en cylinder eller ring hamnar den exakt koncentriskt på den. Drar du i ett storlekshandtag växer radie och bokstavsstorlek tillsammans så att texten inte förvrängs.

> **Tips:** Längs cirkelns överkant står bokstäverna utanför baslinjen; med {{ui:prop.textInward}} står de innanför med toppen inåt mot centrum. För att texten ska rymmas på en bricka bör radien plus bokstavsstorleken vara mindre än brickans radie.
