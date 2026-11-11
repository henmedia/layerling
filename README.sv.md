<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="layerling-logotyp">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">Enkel 3D-CAD för 3D-utskrift</h3>
        <p align="right">
          Lägg ut en form, skär ett hål, runda en kant, skriv ut. Direkt i webbläsaren, utan konto och utan CAD-förkunskaper.
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="GNU AGPLv3-licens" src="https://img.shields.io/badge/licens-AGPLv3-663399"></a>
    <img alt="Inget konto behövs" src="https://img.shields.io/badge/inget%20konto-inget%20att%20registrera-dd7906">
    <img alt="Gjord för 3D-utskrift" src="https://img.shields.io/badge/gjord%20f%C3%B6r-3D--utskrift-ff9e2c">
    <a href="#layerling-mcp-skill"><img alt="Kan styras av AI" src="https://img.shields.io/badge/AI--styrd-MCP--server-16c0d4"></a>
  </p>

  <p><a href="README.md">English</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.nl.md">Nederlands</a> · <strong>Svenska</strong> · <a href="README.ar.md">العربية</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-cn.md">简体中文</a> · <a href="README.zh-tw.md">繁體中文</a></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-en.png" width="763" alt="layerling i webbläsaren">
</p>

<p align="center"><em>layerling i webbläsaren</em></p>

<p align="center"><a href="https://layerling.com/handbok/index.html"><strong>Användarhandbok</strong></a>, steg för steg och med bilder</p>

## Vem det är till för

Du har en 3D-skrivare. Du vill ha en del som passar till något, inte en karriär inom CAD.

layerling fungerar precis som du redan tänker: lägg en form på plattan, dra den till rätt storlek, gör en andra form till ett hål, gruppera de två, exportera, skriv ut. Det finns ingenting du behöver lära dig innan du börjar och **inget konto att registrera** – öppna sidan och börja bygga. Som standard stannar dina designer i din egen webbläsare: inget konto, inget moln, ingenting laddas upp någonstans. Om du kör en egen kopia kan de i stället ligga i en mapp på din server, så att alla enheter i huset ser samma filer.

### Kommer du från Tinkercad?

layerling tar ett steg förbi Tinkercad mot Fusion 360: det används på samma sätt så att du känner igen allting – plattan, formerna, solider och hål, gruppera och dela upp grupp, bunta ihop, Alt-dra för att kopiera – men det tar inte slut där Tinkercad gör det. Det du har saknat väntar på dig här:

- **Fasa och avrunda.** Välj en kant och fasa eller runda av den – det som flest frågar efter så fort en utskriven del ska se färdig ut eller passa in i något annat. Bearbetade kanter kan alltid ändras i efterhand: ta bort en bearbetning igen eller klicka på Redigera för att ändra värdet på samma kanter.
- **Gröpa ur, dela, skissa, gänga.** Gröp ur en kropp till en jämn väggtjocklek, dela den med ett plan eller sträck ut den där, rita skisser med exakta längder och vinklar och extrudera eller rotera dem, samt lägg till skruvar, muttrar och gängade hål.
- **Mönster och svep runt cylinder.** Upprepa en form i en rad, ett rutnät av kolumner och rader, en cirkel eller en spiral, eller svep ett mönster eller en text runt en cylinder.
- **Hålmönster.** Klicka på en plan yta, eller på den runda väggen av en cylinder eller ett rör, och sprid ut runda, kvadratiska, rektangulära, sexkantiga eller avlånga spårhål över den, i rutnät eller förskjutna, med avstånd, marginal och djup – ventilationsgaller, högtalargaller och korgar i ett enda steg. Eller lägg en krans av skruvhål längs kanten, med planförsänkning eller konisk försänkning om du vill, eller upprepa en egen form över ytan – nitar eller durkplåt.
- **Skala i procent.** Gör en eller flera delar större eller mindre med en procentsats – tillsammans så att hela layouten växer med dem, eller var och en på sin plats.
- **Matcha storlekar.** Håll ned Alt på en inriktningspunkt så sträcks delarna ut i stället för att flyttas: fram till sidan av en annan del, eller till dess bredd, längd eller höjd – exempelvis för att byta ut en låda mot en lika stor cylinder.
- **Jämna mellanrum.** Fördela delar av olika storlek så att avståndet mellan dem är likadant överallt – mellan de två yttersta, på en skiva med samma avstånd till kanterna, eller rad för rad som för ett plockpussel; eller skriv in mellanrummet direkt.
- **Mäta och titta inuti.** Måttband, linjaler, en snittvy som skär upp modellen samt ett historikreglage för att titta tillbaka på tidigare tillstånd.
- **Äkta geometri under ytan.** layerling bevarar exakta CAD-former och inte bara ett triangelnät, så en avrundad kant förblir en avrundad kant – hela vägen in i en STEP-fil för ett fullfjädrat CAD-program.

Det är inte ett komplett CAD-paket: det finns ingen parametrisk tidslinje och inga sammanställningar (assemblies). Och du kan **köra det själv**: installera det som en app (då startar det utan internet), eller kör din egen kopia på Windows, en NAS eller en hemmaserver – se [Komma igång](#komma-igång).

> **En AI kan bygga tillsammans med dig.** layerling skickar med en MCP-server. En AI-klient som Gemini, Claude eller Codex ser en
> öppen redigerarflik och arbetar i den: lägger till former, ändrar mått, grupperar, skär, rundar kanter, läser av scenen
> och tar bilder av vyn. Du beskriver delen, AI:n bygger den, du ser det hända och kliver in när du vill. Det här körs
> lokalt, utan att någonting lämnar webbläsaren – se [layerling MCP Skill](#layerling-mcp-skill) för inställningarna.

## Vad det kan göra

### Bygga

- **En riktig byggplatta** – rutnät, fästning, handtag för att flytta, ändra storlek och rotera, samt en panel med de exakta siffrorna när du behöver dem.
- **Skriv in en position** – kortet Position sätter en kropp på exakta X-, Y- och Z-värden, mätta från dess centrum eller från dess vänstra och främre kant, och delar kan parkeras bredvid plattan precis som i Tinkercad.
- **Axelpilar** – röda, gröna och blå pilar i plattans främre vänstra hörn visar X, Y och Z åt det håll siffrorna räknas, precis som i Bambu Studio och OrcaSlicer; de kan stängas av i inställningarna.
- **Rotationspunkt som stannar kvar** – ange en rotationspunkt för en kropp så stannar den hos den kroppen: den flyttas, vrids och skalas med den, sparas, och kan skrivas in som X, Y och Z eller dras med musen och fäster då vid hörn och kanters mittpunkter, eller med Skift mot mitten av en yta (axeln i en tapp, spetsen på en kon, även genom genomskinliga kroppar) – för gångjärn och leder.
- **Ljus och skuggor efter smak** – skuggningskontrast, skuggstyrka och mjukhet samt ljusets riktning och höjd, ända upp till rakt uppifrån som i Tinkercad, allt i inställningarna. En knapp för ”Tinkercad-utseende” ställer in färger, rutnät och ljus som där i ett enda klick, och de mörkare rutnätslinjerna kan komma varje centimeter i en egen färg.
- **Snabbläge** – för långsammare datorer: en omkopplare i inställningarna stänger av skuggor, kantlinjer och kamerans tröghet och ritar vyn i skärmupplösning; kamerans tröghet kan även stängas av separat, så att vyn stannar i samma ögonblick som du släpper taget.
- **Rikta in ytor och se vinklarna** – verktyget Rikta in ytor lägger en yta på en del mot en yta på en annan, dikt an eller i jämnhöjd, med ett valfritt mellanrum, sätter ett hål eller en tapp på samma axel som ett annat hål, eller flyttar en del rakt så att ett hörn eller en referenspunkt hamnar på en punkt på en annan del längs X, Y och Z eller bara några av axlarna, och med ett andra och tredje par punkter vrids delen på plats som vid trepunktsinriktning; en vriden kropp visar sina vinklar runt X, Y och Z under markeringen, och kortet Rotation i dess inställningar tar emot dem som siffror.
- **Fäst mot andra former** – när du flyttar en form låser sig dess kanter eller mittpunkt mot kanterna och mittpunkterna på formerna runt omkring, med en hjälplinje, så att delar hamnar kant i kant utan att du behöver skriva siffror. Även arbetsytans mitt räknas, för att sätta en del mitt på plattan. Alt medan du drar pausar fästningen; Skift håller förflyttningen längs en axel, och Alt intryckt från början drar ut en kopia precis som i Tinkercad. Även storleksändring fäster: ett sidohandtag stannar vid andra formers kanter och vid väggen det stöter emot, inklusive insidan av en låda, så att en del fyller ett chassi från vägg till vägg.
- **Sätt ner på ytor** – som Cruise i Tinkercad: en ny form lägger sig på ytan under pekaren, även lutande ytor, och C tar upp markeringen och sätter ner den på en annan yta på samma sätt. Håll ned Skift medan du placerar eller bär den så sjunker den i stället in, upprätt och med ovansidan i jämnhöjd med ytan – för en konisk försänkning eller planförsänkning.
- **Referenspunkter** – högerklicka på en kropp för att markera dess centrum, hörn eller kantmittpunkter med punkter som inte skrivs ut och som dragna former fäster mot; dra en punkt eller skriv in dess koordinater, och markeringarna sparas med designen. Måttbandet kan markera mitten av en mätning – till exempel mittpunkten i ett runt hål.
- **Gradskiva** – gradskivan i vyfältet mäter vinkeln vid ett hörn med tre klick, eller mellan två plana ytor (en 45°-fasning visar 45° · 135°); den fäster vid hörn och kanter precis som måttbandet och följer med kropparna.
- **Anteckningar som AI:n kan läsa** – kryssa i *Till AI:n* på en anteckning så plockar en AI-agent på MCP-bryggan upp den som en förfrågan: den läser anteckningen, utför arbetet och svarar under din text. Den kan också lägga ut egna anteckningar på modellen för att fråga eller rapportera något vid en viss punkt. Be den bevaka dina anteckningar så väntar den på dem (`layerling_wait_for_notes`): varje förfrågan plockas upp så fort du bockar i rutan, utan att du behöver gå tillbaka till agentens fönster.
- **Interaktiv hjälp** – tryck på Skift+F1 eller frågetecknet i gruppen Hjälp och klicka sedan på valfri knapp, fält eller fönster: ett litet fönster visar den del av användarhandboken som handlar om den och öppnar handboken vid behov.
- **Kommandosökning** – tryck på Ctrl+K och skriv ett verktyg, en form eller ett kommando (”Avrunda”, ”Spegla”, ”Cylinder”) för att hoppa direkt dit; den förstår engelska och tyska ord också och visar kortkommandona bredvid varje post.
- **Dina egna tangenter** – lägg valfritt kommando från kommandosökningen på en tangent du själv väljer i fönstret för kortkommandon: Centrera på arbetsytan, formpanelen eller din favoritform ligger sedan en knapptryckning bort.
- **Ditt eget verktygsfält** – ta bort de grupper och knappar du aldrig använder ur verktygsfältet i inställningarna (Utseende); kommandosökningen och dina tangenter kör dem fortfarande, och ordningen i verktygsfältet förblir densamma.
- **Fokusläge** – på en liten bärbar skärm kan du dölja redigerarens rubrikrad och sidfot med en enda knapp eller Ctrl+Skift+F; en liten list över vyn behåller flikarna, Hem, kommandosökningen och inställningarna. Läget slås även på automatiskt när webbläsaren är i helskärm (F11).
- **Historikvy** – titta tillbaka på valfritt tidigare tillstånd i projektet med ett skjutreglage, utan att ändra något; exportera det tillståndet eller starta ett nytt projekt från det. Av @rmpel. Ångra och Gör om nämner steget de tar tillbaka i sin verktygstext med dess mått (”Avrundade kanterna på Box (5 mm)”), och en lista i Historikvyn namnger varje steg så att du kan hoppa till valfritt steg med ett klick.
- **Millimeter eller tum** – med Tum som enhet visas varje mått i tum, som bråk likt Tinkercad (1 5/8) eller som decimaltal, fästrutnätet stegas från 1/64 till 1 tum och plattans rutnät ritas i tum.
- **Din skrivares platta** – välj en av över 230 vanliga skrivare så tar plattan dess storlek – rund för en deltaskrivare som en FLSun. Skrivarens namn och byggvolym visas i hörnet av arbetsytan (en omkopplare i inställningarna döljer detta och designens namn), och en varning visas när en kropp når utanför kanten.
- **Flera byggplattor** – en design som rymmer mer än vad en enda platta kan skriva ut får plattor sida vid sida, lika stora som arbetsytan: en kropp hör till den platta den står på, ”Ordna på plattor” lägger ut delarna rad för rad och lägger till plattor vid behov, varje platta kontrolleras separat mot skrivaren och exporten sparar en platta, alla plattor, eller en fil per platta i en ZIP så att de kan skrivas ut en efter en.
- **Överhäng och filament** – ”Visa överhäng” skrafferar varje yta brantare än 45° (eller din skrivares egen vinkel) som skulle behöva stöd, och exportfönstret visar volym, vikt och meter filament innan du slicar.
- **Stödribba** – skriv ut en del lutad på en kant utan slicerns stöd: klicka på den undre ytan så ställs en tunn ribba under den på ett litet avstånd, på en oval fot, med bryggor som är exakt ett lager höga och en bana breda som håller delen och bryts loss efteråt; munstycke och lagerhöjd ställs in som i din slicer.
- **Schablonbryggor** – skriv ut en schablon med genomskuren text: mitten i bokstäver som o, a och b får små bryggor till plattan, så breda och höga som du anger (i jämnhöjd med botten, i mitten eller upptill), grupperade med plattan som vanliga lådor du kan flytta eller ta bort. Om du ändrar texten kör du verktyget igen så skapas bryggorna på nytt.
- **Formbibliotek** – lådor, cylindrar, kapslar (med en mindre ände vid behov, till exempel för ett remskydd), sfärer, koner, svängda koner (utsvängda som en trumpet eller välvda som en kupol), pyramider, kilar, text, tak, halvklot, paraboloider, torusar, rör, lofter från en kontur till en annan (till exempel fyrkant till rund, solid eller med vägg, rak eller mjukt vidgande, vriden eller med lutad topp, eller genom upp till tolv tvärsnitt däremellan), mångkantiga prismor med tre till tjugofyra sidor, spiralfjädrar och bladfjädrar (runda, sicksack- eller fyrkantsvågor, med en ögla eller flik i varje ände), ett gångjärn som skrivs ut direkt på plats (med skruvhål eller som tappgångjärn), skruvfästen för smältinsatser eller självgängande skruvar (M2 till M5, #2-56 till 1/4-20), snäpphakar med sitt fäste, ribbor och förstärkningskilar, Gridfinity-lådor och -bottenplattor, lettrade grepp (raka, kryss eller runda), portöppningar för USB-C-, Micro-USB-, USB-A-, HDMI- (även Mini och Micro), DisplayPort- och RJ45-kontakter, XT30-, XT60-, MT60- och MPX-kontakterna från modellbatterier, Anderson Powerpole-block med 1 till 4 poler och den seriella D-Sub 9-porten med sitt skruvhål i en lådvägg, med extra spelrum vid behov, SBC-kort i verklig storlek att bygga ett chassi runt (Raspberry Pi 5, 4, 3 B+ och Zero 2 W, BIGTREETECH Pi; grupperade som hål skär de ut öppningarna för sina kontakter) med mera.
- **Vaser, krukor och lampskärmar** – en egen Vas-form: kroppsform, tvärsnitt (även egenritat) med ett andra tvärsnitt att tona över till, vridning, mönster, dräneringshål, fot, fat och lock, solid för slicerns vasläge eller ihålig. Ett tekannelock övertar vasens egen överkant, så spår och vridning fortsätter obrutet över skarven. Av @marcus040473.
- **Gängor som passar** – gängstänger, skruvar med cylindriskt huvud, försänkt huvud, sexkant-, fyrkant-, fläns- eller vinghuvud eller stjärnvred, med insex-, Torx-, Phillips-, spår- eller Robertson-fattning (fyrkant) (huvuddiameter, fattningsstorlek och djup efter dina mått, samt en krage mellan huvud och gänga eller ovanpå en mutter om du vill), sexkant-, fyrkant-, fläns-, ving- och stjärnvredsmuttrar, brickor enligt ISO 7089, täckbrickor (rosetter) för försänkta skruvar samt gängade hål. Planförsänkningar och koniska försänkningar hämtar skaft och huvud från en skruvstorlek (ISO 273, DIN 974-1, ISO 15065), ett bottenhål kan avslutas med en borrspets (118° eller en egen vinkel, där djupet mäts till skuldran som på en ritning), och en sexkant blir till en ficka för en mutter enligt ISO 4032. M2 till M12, UNC/UNF från #4 till en tum och Whitworth-rörgängorna G1/16 till G4 (ISO 228-1) väljs direkt i listan, liksom de koniska NPT-rörgängorna 1/16" till 4" (ASME B1.20.1), eller ställ in egen diameter och stigning, även vänstergänga och upp till åtta ingångar för en trapetsgängstång som T8x8; en tum- eller G-storlek frågar efter gängor per tum i stället för millimeter. Ändarna kan fasas, och ett gängat hål fungerar som ett skärverktyg: lägg det i en del, gruppera, så kommer hålet ut gängat.
- **Kugghjul som griper i varandra** – cylindriska kugghjul med raka, snedskurna och pilformade (herringbone-) tänder samt koniska kugghjul (även med spiraltänder), kuggkransar och kuggstänger med evolventkuggar, inställda efter modul och kuggantal som i en kugghjulsgenerator, med ingreppsvinkel och kuggspel för utskrift – eller med runda tänder, förlåtande på små utskrivna kugghjul och behagligt grepp på vred. Markera två kugghjul så visar panelen centrumavståndet där de griper in i varandra.
- **Hirth-kopplingar** – en skiva med V-formade tänder som strålar ut från mitten: en upp-och-ner-vänd kopia låser fast i den vid valfri multipel av en kugg och centrerar sig själv, för justerbara leder, stativhuvuden och indexeringsvred. Ställ in antal tänder, höjd (ända ner till botten om du vill) och centrumhål, och välj symmetriska tänder eller sågtänder som en spärrhake, med den branta flanken upp till 90° åt endera sidan; den är en exakt kropp för kantverktygen och STEP.
- **GT2-kuggremskivor** – en kuggremskiva för en 2 mm GT2-rem, med den äkta GT2-profilen uppbyggd av cirkelbågar. Ställ in antal tänder (valfritt antal från 10 till 200, inte bara de storlekar som finns att köpa), rembredd, flänsar, nav och centrumhål; diametern följer av tandantalet. Den är en exakt kropp för kantverktygen och STEP.
- **Solider och hål** – förvandla former till utskärningsverktyg och gruppera dem till den färdiga geometrin. Redigera grupp (**E**) lägger ut en grupps delar löst för att ändra dem och bygger om gruppen med Klar – även en grupp inuti en grupp, hur djupt designen än går.
- **Flerfärgade grupper** – en grupp kan visa varje del i sin egen färg, även efter att hål skurits ut i den, och en 3MF- eller OBJ-export behåller de färgerna så att slicern kan tilldela delarna olika filament.
- **Bunta ihop** – Ctrl+B håller ihop delar som Tinkercads bundle: de flyttas, vrids och skalas som en enhet, men behåller sina färger och förblir separata kroppar vid export – smidigt för flerfärgsutskrifter.
- **Booleskt snitt** – behåll bara det som två eller flera markerade solider har gemensamt, eller där solider och hål överlappar.
- **Hölje** – omslut de markerade formerna med deras konvexa hölje, den minsta kroppen utan gropar runt allihop: ett halvklot på en cylinder blir en kupol, fyra stolpar blir en låda med runda hörn. Hål i markeringen skärs ut efteråt.
- **Pepparkaksform** – en vägg och en platt kant runt konturen av en skiss eller SVG, eller runt det som en form står på, från ett enda litet fönster; insidan av ett e eller ett a får en egen vägg som hålls fast av bryggor vid kanten eller av en platta över hela konturen, med små avrundningar så att tunna delar inte bryts av, och gjord lägre trycker den bara in texten i degen i stället för att skära ut den. Konturen speglas så att text och logotyper blir rättvända i degen, och väggen smalnar av uppåt till en tunn skäregg. Väggtjocklek, skäregg, höjd och kant är skissens fyllningslägen, så vart och ett kan ändras i efterhand.
- **Flexileder** – skär upp en platt kropp du ritat själv, en fisk, en orm eller en drake, i länkar med en led som skrivs ut direkt på plats vid varje snitt: en stående tapp med 45°-koner i en hylsa i nästa länk, så att figuren rör sig direkt efter utskrift utan stöd eller montering. Antal leder, spelrum, svängvinkel och ledstorlek kan ställas in. Eller så viks länkarna upp och ner i stället, som en flexibel nyckelring: varje snitt blir ett platt gångjärn av tappar med koner tvärs över kroppen på halva dess höjd.
- **Lofta skisser** – två skisser eller importerade SVG-filer blir en enda exakt kropp, med den nedres kontur i botten och den övres kontur i toppen och raka väggar emellan: en tratt, en övergång från fyrkant till runt, eller av två ringar en avsmalnande ram. Redigera grupp öppnar de två skisserna igen.
- **Dela** – skär solider eller hål i två delar med ett plan; en urgröpt kropp behåller sitt hålrum. Vrid planet för ett snett snitt, dra i pilen, eller lägg det på valfri yta med ”Välj yta”. **Sträck ut** gör i stället en kropp längre eller kortare vid planet: delen bortom planet flyttas och snittet genom kroppen fyller mellanrummet, så att en nedladdad låda växer genom sina raka väggar medan fack och rundade hörn behåller sin storlek.

### Bearbeta

- **Fasa och avrunda** – bryt eller runda valfri kant på en solid, eller gröp ur en rak kant som en konkav avrundning, likt de urtagna hörnen på en låda, och ta bort eller ändra bearbetningen senare; när ett mått är för stort för kanten hittar ett klick det största som får plats.
- **Skisser** – rita konturer med linjer, kurvor och färdiga former, rita på frihand med penna, finger eller mus (linjen blir några få redigerbara punkter), ange längd och vinkel för linjer medan du ritar (”50<30”, Skift fäster i steg om 15°), skriv in längder, vinklar, storlekar och positionen för en markerad kontur, punkt eller kurvhandtag (uträkningar som ”60+12,5” fungerar i varje sifferfält), runda eller fasa hörn, fäst mot andra kroppars konturer, rita hjälplinjer att fästa mot, och extrudera, rotera eller svep dem längs en bana till exakta kroppar. En rotation med stigning lindar upp konturen som en sammanhängande spiral i stället för ringar, som filament på en spole. En skiss kan också byggas som ett streck: en sluten kontur blir en ram, innanför, utanpå eller centrerad på linjen, och en öppen linje blir en remsa med flata, fyrkantiga eller runda ändar. En ritning eller ett foto under skissen spåras till skisslinjer med ett klick – dess mörka eller ljusa del vid ett tröskelvärde som du väljer.
- **Urgröpning** – gör om en kropp till väggar med jämn tjocklek, öppen på valfria sidor (ovansida, undersida, framsida, baksida, vänster, höger, i valfri kombination) eller helt sluten – för lådor, koppar och chassin.
- **Luta och smalna av längs längden** – låt ovansidan på en låda, cylinder, månghörning, rör, kil eller ett runt tak slutta ner mot ena änden, eller låt sidorna på alla utom röret smalna av mot ena änden, rakt eller svängt, med siffra eller en punkt i änden: ett tak som sluttar längs sin längd, en ramp, en snett avskuren rörände, en båtstäv. En lutning förblir exakt för fasningar, avrundningar och STEP, liksom en avsmalnande låda, kil eller ett runt tak. Av @plazmabokor.
- **Lock** – locket till en låda, kruka eller bricka som är öppen upptill, utifrån dess egen kontur, rund eller kantig: intryckt i öppningen, trätt utanpå, som griper om väggen från båda sidor som på en matlåda eller lagt plant ovanpå, med tajt, normal eller lös passform (0,1, 0,2 eller 0,3 mm per sida) eller ett eget spelrum, locktjocklek samt läppens djup och väggtjocklek. Det hamnar bredvid kroppen, vänt upp och ner med ovansidan nedåt, klart att skriva ut utan stöd.
- **Förskjut och skär ut** – förstora eller krymp en exakt kropp längs alla dess ytor med 0,01 till 10 mm, eller bara i sidled så att den behåller sin höjd, för spelrummet i en presspassning eller ett snäppfäste, eller skär ut en del ur en annan med spelrum runtom i ett enda steg medan delen står kvar där den är.
- **Stansa** – skär ut konturen av en kropp rakt igenom en annan, längs X, Y eller Z, var stansen än står framför den: silhuetten av en tekanna genom en skylt, en logotyp genom ett lock. Stansen stannar kvar för att kunna flyttas och användas igen, ett spelrum låter en utskriven del gå igenom och öppningen är en exakt skisskropp.
- **Kontrollera spelrum** – innan du skriver ut delar som ska röra sig, ett gångjärn som skrivs ut på plats, en flexileksak eller ett lock i sin låda, kontrollera markeringen eller alla synliga objekt par för par: överlappande, vidrörande, för trångt eller bra mot ett minsta spelrum du ställer in, mellan lager eller i sidled; ett klick på ett par visar stället. Av @marcus040473.
- **Ytstruktur** – lägg en relief på valfri kropp, för grepp eller utseende: spår, lettring, bikaka, knoppar, Voronoi-celler, tegel, stickning, rep, korgflätning, kolfiber, trädbark, träådring, sprickor, en bild som höjdkarta, upprepad som plattor eller tryckt en gång, eller text, runt runda kroppar eller plant längs en axel. Upp till sex mönster ryms på en kropp, vart och ett på sina egna ytor: tegel runt väggarna och lettring ovanpå. För utskrift i två färger kan mönstret också bli en egen del i en egen färg. Av @marcus040473.
- **Ta bort yta** – klicka på ytorna för en avrundning, ett hål eller en klack och ta bort dem: ytorna runtom växer för att stänga luckan, och kroppen förblir exakt för fler avrundningar och STEP-exporten.
- **Egna former** – spara kroppar du behöver om och om igen överst i formbiblioteket och lägg in dem i valfri design med ett klick eller genom att dra; i webbläsaren, eller med den delade lagringen på servern för alla enheter. ”Säkerhetskopiera alla” tar dem med sig.
- **Hålmönster** – perforera en plan yta på en kropp eller den runda väggen på en cylinder, ett rör eller ett borrhål (varje hål riktat mot axeln, med raderna hela varvet runt): välj ytan, välj runda, kvadratiska, rektangulära, sexkantiga eller avlånga spårhål, ställ in storlek, avstånd, rutnät, förskjutet eller som en krans längs kanten (efter avstånd eller antal, ett hål i varje hörn), släta hål, planförsänkningar eller koniska försänkningar (med metriska skruvstorlekar) eller en egen form från scenen (nitar, durkplåt, upphöjd eller nedsänkt), marginal till kanten och djup (genom hela delen eller ett angivet djup), och se hålen som förhandsvisning innan de skapas. De förblir vanliga hål grupperade med kroppen, så att dela upp gruppen frigör dem igen.
- **Yta** – skjut ut en plan yta på en kropp eller skär ut en ficka i den: välj ytan, välj Utåt eller Inåt, ange indrag från kanten, hörnradie och djup, och se resultatet som förhandsvisning. Det fungerar även på importerade STL-filer, och det som läggs till förblir en vanlig skisskropp grupperad med kroppen.
- **Svep runt en cylinder** – lägg ett SVG-mönster, en logotyp eller en text på väggen av en kopp eller ett rör, upphöjd eller graverad, och centrera den på cylindern.

### Filer

- **Dina egna typsnitt** – använd valfritt TrueType-, OpenType- eller WOFF-typsnitt för text, eller i Chrome och Edge ett typsnitt installerat på datorn. En design behåller bara konturerna av de bokstäver den använder, så den öppnas överallt. Arabiska och hebreiska löper från höger till vänster, och arabiska bokstäver binds samman.
- **Ta med dina egna modeller** – importera STL, OBJ, 3MF, STEP, SVG eller DXF och bygg vidare runt dem. En DXF-delkontur, som en laserskärare eller leverantör skickar den, kommer in som en kropp med sina hål som egna hål, med bågar och cirklar bevarade. En SVG kommer in som en skisskropp: en yta, ett streck utanför eller innanför linjerna, en silhuett utan hål, eller ritningen breddad runtom – tillsammans en pepparkaksform från en fil, eller lagren i en flerfärgad logotyp. Textformen har samma fyllningslägen, kan stapla bokstäverna uppifrån och ner, ritar dem smalare eller bredare längs en båge och blir ett textblock med flera rader, vänster-, mitt- eller högerjusterat; formbiblioteket har en namnbricka: en text i färgade lager för flerfärgsutskrift, med valfritt nyckelringshål och rundad eller fasad kant på bokstäverna, samt en ikonbricka: en SVG-ikon i samma färgade lager, med antal och ”så många som får plats” för att fylla en platta. En färgad OBJ – från layerling, eller från Tinkercad som en ZIP med sin `.mtl` – eller en färgad 3MF, inklusive slicerprojekt, kommer in som en kropp per färg, och en 3MF med flera objekt som en kropp per objekt. En STEP-fil med flera solider kommer in som en kropp var, med sitt namn och sin färg.
- **Gör meshar exakta** – en STL, OBJ eller 3MF från Printables eller Thingiverse består bara av trianglar; Gör exakt hittar dess plan, cylindrar, koner, sfärer och torusar och bygger om den som en exakt CAD-kropp, så att ett borrhål blir en riktig cylinder: avrundningar och fasningar följer rena kanter, ytor kan tas bort och STEP bär med sig de verkliga ytorna. Förenkla nät behåller skarpa kanter och hålkanter exakt medan plana ytor tunnas ut.
- **Exportera det din slicer vill ha** – STL, 3MF med namn och färger, eller OBJ med färger, för markeringen eller hela scenen (dolda delar utelämnas), plus STEP om designen ska resa vidare in i ett fullfjädrat CAD-program, samt toppvyn som SVG eller som DXF med äkta cirkelbågar och cirklar för en laserskärare, med valfria schablonbryggor som håller kvar mitten i ett o eller ett b. PNG sparar en ren bild av vyn, i dubbel upplösning och med transparent bakgrund om du vill.
- **Ritningsexport** – markera en del, eller rensa markeringen för hela den synliga designen, och välj sedan **Exportera → Ritning → PDF eller SVG**. Skapar fram-, uppifrån- och högervy i förstavinkelprojektion på ett inramat ritblad med zonnummer och ett ritningshuvud nere till höger, med yttermått, dolda kanter samt diameter- och positionstabeller för axelparallella runda hål. Vyerna är i skala 1:1 i millimeter; bladet använder det minsta passande ISO-liggande formatet (eller en större egen storlek). Skriv ut i **100 % / verklig storlek**. Positioner mäts från varje vys nedre vänstra ytterhörn. Håltabeller använder nominell nätgeometri och måttsätter inte automatiskt vinklade eller orunda hål, gängor, djup eller toleranser. Projektionsmotorn är anpassad från ritningsarbetet i [Cadverix-3D](https://github.com/WC3D/Cadverix-3D).
- **Uppdateringsavisering** – i det publicerade programmet upptäcker en öppen sida själv en ny version och erbjuder att spara och ladda om, med en lista över vad som är nytt.
- **Ta bort flera designer på en gång** – **Välj** på startsidan markerar designer med ett klick på deras kort (eller allihop), och en enda bekräftelse tar bort hela urvalet; det fungerar i servermappen också.
- **Mappar för dina designer** – sortera designerna på startsidan i mappar (och mappar i mappar) genom att dra dem eller med ”Flytta till …”; sökningen letar igenom alla mappar, och ”Säkerhetskopiera alla” tar dem med sig.
- **Projekt som filer** – spara ett helt projekt, med historik, skisser och grupper inkluderade, som en `.lyl`-fil och fortsätt någon annanstans. I Chrome och Edge väljer du mapp själv och Ctrl+S sparar tillbaka till samma fil; andra webbläsare laddar ner den. Äldre `.skf`-filer från tidigare versioner går fortfarande att öppna; när du sparar skrivs sedan en `.lyl` bredvid dem.
- **Tidigare versioner** – innan Spara skriver över en `.lyl`-fil behåller layerling filen som den var, och medan du arbetar ett läge av designen med några minuters mellanrum; varje version öppnas igen som en ny design. Hur många som sparas ställer du in under Inställningar → Säkerhetskopior, och i Chrome och Edge kan de också hamna i en egen mapp. En notis på startsidan och i redigeraren påminner dig om att säkerhetskopiera alla designer till en fil och förvara den på en andra plats: dina designer, din säkerhetskopia.
- **Felrapport** – en länk i sidfoten sparar en ZIP-fil med designen som `.lyl` och en textfil med version, webbläsare och de senaste meddelandena, klar att bifogas i forumet eller på GitHub som nekar en ren `.lyl`-fil.
- **Designer du känner igen** – varje design får en miniatyrbild, i din egen webbläsare eller i servermappen.
- **Bilagor** – förvara anteckningar, ett foto på den utskrivna delen eller ett datablad inne i designen: `.md`- och `.txt`-filer, `.png`-, `.jpg`- och `.webp`-bilder samt PDF-filer följer med `.lyl`-filen. Ögat öppnar en text eller en bild i ett fönster; en PDF laddas ner. SVG tas inte emot, eftersom det kan innehålla skript.

### Vy

- **Perspektiv eller rakt framifrån** – växla mellan normal vy och en platt, ortografisk vy med kubknappen bredvid zoomkontrollerna, eller genom att trycka på **O**. Betraktningsriktning och utsnitt bevaras.
- **Vrid vyn med kuben** – att dra i vykuben vrider vyn precis som höger musknapp, med ett finger på en surfplatta; ett klick hoppar fortfarande till den sidan, och ett klick på ett hörn eller en kant ser modellen därifrån. Tangenterna **1**–**6** hoppar också, och **Skift+1**–**6** zoomar dessutom in till markeringen.
- **Fyra sparade vyer per design** – **Skift+7**, **8**, **9** eller **0** sparar vyn exakt som den är (vinkel, panorering, zoom), och själva siffertangenten hämtar tillbaka den. Varje design har sina egna, och en sparad `.lyl`-fil tar dem med sig.
- **Se rakt mot arbetsytan** – **P**, eller knappen bredvid Placera arbetsyta i vyfältet, vrider vyn vinkelrätt mot arbetsytan, även på en lutande yta, med origo i mitten.
- **Vykuben i valfritt hörn** – Inställningar > Utseende > **Vykubens placering** sätter kuben uppe till vänster, uppe till höger, nere till vänster eller nere till höger; i alla hörn utom uppe till vänster flyttar vyfältet upp till dess plats.
- **På ditt språk** – programmet och dess användarhandbok finns på engelska, tyska och 18 andra språk; språklistan ligger längst upp till höger.
- **Titta underifrån** – ögat ovanför ett rutnät i vyfältet döljer plattan, så att undersidan av en design syns utan att plattan är i vägen.
- **En andra vy i ett eget fönster** – en knapp i vyfältet öppnar ett andra fönster som visar samma design genom en egen kamera, med egen vykub och eget vyfält, och följer varje ändring. Det öppnas där du senast lämnade det.
- **Paneler där du vill ha dem** – objektlistan, inställningarna, snittvyn, måttbandet och verktygspanelerna för kanter, urgröpning och mönster flyttas i sin namnlist och öppnas på samma plats nästa gång; ett dubbelklick dockar dem.
- **Högerklicksmeny** – ett kort högerklick på en kropp tar fram de vanligaste kommandona: duplicera, hål eller solid, gruppera, fasa, avrunda och gröp ur för en kropp, spegla och skala i procent, dölj, lås, lås form (den flyttas, vrids och grupperas fortfarande, men behåller sin storlek och sina inställningar), släpp ner på arbetsytan, ta bort. Att dra med högerknappen vrider fortfarande vyn.
- **Dölj övriga och invertera markering** – för att arbeta med några få delar djupt inne i en design markerar du dem och döljer allt annat i ett steg (högerklicksmenyn eller menyn Synlighet; Ctrl+Z eller Ctrl+Skift+H tar tillbaka allt), eller vänder markeringen så att alla andra synliga delar markeras.
- **Snittvy** – skär upp vyn längs ett plan tvärs över X, Y eller Z för att se väggar, hålrum och delar som passar i varandra, med ett grov- och ett finreglage. Det är bara vyn som skärs upp: designen och varje export förblir hela. Snittet skrafferas som på en ritning, och en kropp inuti en annan skrafferas åt andra hållet; det kan också fyllas slätt eller lämnas öppet. ”Snitt som SVG” sparar själva snittet i 1:1, för en laser eller en mall, ”Mät” läser av väggtjocklek och mellanrum direkt på snittet, vinkelrätt mot väggen, och ”Skiss från snitt” startar en skiss direkt på snittet med dess konturer i (hål som äkta cirklar), för ett lock, en insats eller en packning som passar.
- **Arbetsyta på valfri yta** – tryck på W och klicka på en yta för att bygga på den; ett klick nära ett hörn sätter den exakt på hörnet, nära en kant på kanten med rutnätet löpande längs den, och på den tomma plattan där du klickar. Ett öga döljer ytan för fri sikt medan den fortsätter gälla. En AI kan sätta den på en yta också.
- **Musknappar som i din slicer, och en 3D-mus** – i inställningarna kan musknapparna ställas in som i Bambu Studio och OrcaSlicer: vänsterdrag på tom yta vrider vyn, högerknappen flyttar den och Skift med vänsterdrag drar markeringsramen. En SpaceMouse eller en annan 3D-mus vrider, flyttar och zoomar vyn i Chrome och Edge så fort den är ansluten där.
- **På en surfplatta** – ett finger arbetar med designen, exakt som vänster musknapp: tryck för att markera, dra för att flytta, dra på tom yta för en markeringsram. **Två fingrar styr vyn**: sära eller nyp ihop dem för att zooma, flytta dem tillsammans för att förskjuta arbetsytan. När ett andra finger sätts ner ångras det som det första hade påbörjat, så en nypning knuffar aldrig en del ur läge. Att vrida vyn har ingen egen gest; vyfältet har en knapp för det som bara visas på pekskärmar, och medan den är på roterar ett finger vyn i stället för att markera. Sifferfält ger dig hela sitt värde när du trycker på dem, redo att skrivas över – ett numeriskt tangentbord har inga piltangenter att flytta markören med. Ett finger når lite längre till skissens punkter, linjer, handtag, mätpunkter och kanter än en mus, men **en penna (stylus) är det bättre verktyget på en surfplatta**: finare spets, och den skymmer inte det du siktar på.

### Videor

Skapade av andra, inte av det här projektet:

<!-- videos:start -->
- [Layerling Tutorials](https://www.youtube.com/playlist?list=PLZ-ZWS0D1JIk) – HL ModTech (engelska). En spellista av en Tinkercad-användare, hittills med en rundtur i layerling på cirka 23 minuter (gratis, webbläsarbaserat CAD som tar vid där Tinkercad slutar), en fördjupning i funktionerna och en kort uppdatering om utskrivna gängor.
- [Layerling – Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) – Making Layers (engelska). En serie om layerling, hittills med ”Tinkercad alternative / upgrade? Introducing Layerling!”, en översikt för dig som kommer från Tinkercad, samt ”Layerling Sketch Tools!” om skissverktygen.
- [Layerling](https://www.youtube.com/playlist?list=PLYqVFeqYBrPE) – TECHNOBENTO (engelska). En spellista om layerling, hittills med ”A new way to sketch in Layerling”.
- [Layerling CAD Videos](https://www.youtube.com/playlist?list=PLc09BHr_6nn8) – Printology (engelska). En spellista om layerling, hittills med ”I'm 100% In on Layerling - The Next Big Free CAD” och ”Layerling Features That Blow Tinkercad Out Of The Water”.
- [I Tried Layerling After Tinkercad… Is It REALLY Better?](https://youtu.be/5DpOxdoNwqs) – Maker Mates Studio 3D Printing (engelska). Någon som kommer från Tinkercad provar layerling och jämför de båda.
- [Print by Layer](https://www.youtube.com/playlist?list=PLejZBz4L7CGQ) – Print N Repeat (engelska). En spellista om layerling, hittills med ”The EASIEST Way to Design Hinges in Layerling” och ”The EASIEST Way to 3D Model Threads!”.
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) – 3D Jesus | 3D Printing & Design (engelska). Ett första test av layerling helt utan manual: fasningar och avrundningar, urgröpning, gängor, skisser, roterade kroppar, mönster, import och skrivarprofiler.
- [Layerling en español | Del primer contacto al proyecto completo](https://www.youtube.com/playlist?list=PLVWA8wsStnyw) – Random Maker (spanska). En spellista på spanska, från första kontakten med layerling till färdiga projekt: hur det skiljer sig från Tinkercad, en punkt-för-punkt-jämförelse och hur man flyttar över projekt.
- [Proyectos en Layerling](https://www.youtube.com/playlist?list=PLTEdmvVC2bxs) – Fulcro 1900 (spanska). En spellista med projekt i layerling, hittills med en introduktion till layerling som ett gratis verktyg som räcker längre än Tinkercad, skrivbordstillbehör (tre modeller), ett mobilskal samt en gängstång, mutter och skruv.
- [Layerling](https://www.youtube.com/playlist?list=PLQuXPoMXTnRQ) – Werkplaats Marc (nederländska). En spellista om layerling, hittills med en första titt för Tinkercad-användare (”Layerling - De Gratis Tussenstap van Tinkercad naar Fusion 360”) och en genomgång av skisser: rita av efter ett foto, rotera och svepa längs en bana (”Schetsen Uitgelegd”).
<!-- videos:end -->

## Komma igång

Den kortaste vägen är den driftade versionen. Ingenting att installera, ingenting att registrera – öppna den och börja bygga:

**https://layerling.com/**

Resten av det här avsnittet handlar om att köra din egen kopia: på din dator eller på en maskin i verkstaden som alla öppnar i sin webbläsare. Var appen än serveras ifrån skickas ingenting till någon annan: designerna stannar i webbläsaren där de skapades (eller i den servermapp du själv sätter upp), och exporter laddas ner direkt till personens egen dator.

### Snabbstart i Windows

Har du aldrig använt en terminal förut? På en dator med Windows 11 (eller aktuellt Windows 10) utan någonting installerat ännu öppnar du **PowerShell** (sök efter det i Start-menyn, inga administratörsrättigheter behövs) och klistrar in den här enda raden:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

Det installerar Git och Node.js om de saknas, laddar ner layerling till `%USERPROFILE%\layerling` och öppnar det i din webbläsare på `http://127.0.0.1:3000/`. Låt PowerShell-fönstret vara öppet medan du använder layerling; `Ctrl+C` i det fönstret stoppar servern.

Kör exakt samma rad igen när du vill **uppdatera** layerling – den märker den befintliga mappen och hämtar den senaste versionen i stället för att ladda ner allt en andra gång. Själva skriptet ligger i [`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1), så du kan läsa exakt vad det gör innan du kör det, eller ladda ner det och köra det lokalt i stället för att skicka det direkt in i PowerShell.

#### Öppna det igen senare

Enradskommando ovan lägger också en genväg med namnet **”Start layerling”** på ditt skrivbord. Dubbelklicka på den när du vill öppna layerling igen – inget PowerShell, ingen ominstallation, ingen ny nedladdning, utan bara servern som startar och webbläsaren som öppnas av sig själv. Den **uppdaterar också layerling först** (när mappen inte har några egna ändringar) och öppnar webbläsaren först när servern verkligen är redo. Om layerling redan körs startar den ingen andra server och uppdaterar inte under den pågående – den öppnar bara sidan. Vill du ha layerling någon annanstans, till exempel på en annan enhet? Kör skriptet med den mapp du vill ha:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

Om din genväg skapades av en äldre version av skriptet kör du enradskommandot en gång till; det ersätter genvägen med den nya.

Föredrar du att göra det för hand? Öppna PowerShell och kör:

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

och öppna sedan `http://127.0.0.1:3000/` själv. `Ctrl+C` i det fönstret stoppar servern i båda fallen.

### Snabbstart på macOS

På en Mac öppnar du appen **Terminal** (tryck Cmd+Mellanslag, skriv `Terminal`, tryck Enter) och klistrar in den här enda raden:

```bash
curl -fsSL https://raw.githubusercontent.com/henmedia/layerling/main/scripts/mac-quickstart.sh | sh
```

Det kräver Git och Node.js 22.18 eller nyare. Om något av dem saknas berättar skriptet vad du ska installera (macOS erbjuder utvecklarverktygen med Git i ett fönster, Node.js finns som installationspaket på [nodejs.org](https://nodejs.org); med Homebrew installerar skriptet dem självt) och stannar, så att du kan köra samma rad igen. Sedan laddar det ner layerling till `~/layerling`, lägger **”Start layerling”** på ditt skrivbord och öppnar layerling i webbläsaren på `http://127.0.0.1:3000/`. Låt Terminal-fönstret vara öppet medan du använder layerling; `Ctrl+C` i det fönstret stoppar servern.

Kör samma rad igen när du vill **uppdatera**: den befintliga mappen behålls och när layerling startar hämtas den senaste versionen först. Skriptet ligger i [`scripts/mac-quickstart.sh`](scripts/mac-quickstart.sh), så du kan läsa vad det gör innan du kör det. För en annan mapp: `LAYERLING_DIR=~/3D/layerling sh mac-quickstart.sh` (efter att du laddat ner skriptet). Det har inte testats på en riktig Mac ännu; om något går fel får du gärna berätta det i diskussionerna.

### Docker

För att köra layerling på en dator, NAS (Synology, Unraid med flera) eller hemmaserver utan att installera Node.js använder du den färdiga avbildningen **`henmedia/layerling`** på Docker Hub (finns även på **`ghcr.io/henmedia/layerling`**, samma avbildning). Varje utgåva publicerar den för amd64 och arm64 (Raspberry Pi, ARM-NAS) under sitt versionsnummer och som `latest`. Appen lyssnar på port **3000**.

Ny på Docker? [Köra layerling i Docker, steg för steg (på engelska)](docs/docker/en/docker-step-by-step.md) börjar från noll på Windows, macOS eller Linux: den installerar Docker, startar layerling och sparar dina designer som filer i en mapp på din dator.

Det snabbaste sättet är ett enda kommando:

```bash
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

Flaggan `-v` sparar startsidans förhandsgranskningsbilder i en Docker-volym vid namn `layerling-thumbnails` så att de överlever en uppdatering; utan den ligger de inne i containern och försvinner varje gång den skapas om (själva designerna påverkas inte: de ligger i webbläsaren eller i servermappen). På en NAS med containerhanterare (Synology Container Manager, Unraid, Portainer) söker du efter `henmedia/layerling` i registret (Docker Hub) eller anger `henmedia/layerling:latest`, mappar port 3000 och lägger till en volym för `/app/.codex/project-thumbnails`. För att uppdatera hämtar du avbildningen igen och skapar om containern (eller låter Watchtower sköta det). På **Unraid** finns layerling även i Community Applications-butiken: sök efter ”Layerling” och installera med några klick; mallen, som underhålls av [jbat66](https://github.com/jbat66/unraid-templates), ställer redan in serverlagring på en Unraid-resurs.

Avbildningstaggarna är rena versionsnummer **utan ”v”**: `ghcr.io/henmedia/layerling:1.42.0`, medan GitHub-utgåvan heter `v1.42.0`. En `pull` hämtar bara den nya avbildningen; en container som redan finns fortsätter köra den gamla tills den tas bort och skapas om:

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`docker inspect layerling | grep image.version` visar vilken version containern faktiskt kör. Om du monterade en mapp för serverlagring lägger du till samma `-v`-flagga igen.

Om du vill bygga avbildningen själv i stället använder du de medföljande filerna [`Dockerfile`](docker/Dockerfile) och [`compose.yml`](docker/compose.yml):

1. **Installera Docker.** På Windows eller macOS installerar och startar du [Docker Desktop](https://www.docker.com/products/docker-desktop/). På Linux eller en NAS behöver du Docker med Compose (`docker compose` eller det fristående `docker-compose`).
2. **Hämta filerna.** Antingen laddar du ner arkivet som en ZIP-fil ([Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)) och packar upp det, eller så klonar du det:
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **Starta det.** Öppna en terminal i projektmappen (t.ex. PowerShell i Windows) och kör:
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   Med den äldre fristående binären skriver du `docker-compose` i stället för `docker compose`. Docker bygger avbildningen och kör containern i bakgrunden (`-d`); det första bygget tar cirka 2–3 minuter. Utan `--build` hämtar samma kommando den färdiga avbildningen i stället.
4. **Öppna det.** På samma dator på **`http://localhost:3000/`**, från andra enheter i ditt nätverk på **`http://<DIN-SERVERS-IP>:3000/`**.

Vardagskommandon:

- **Stoppa:** `docker compose -f docker/compose.yml down`
- **Starta om:** `docker compose -f docker/compose.yml up -d`
- **Uppdatera** (efter att du hämtat ny kod eller packat upp en ny ZIP): `docker compose -f docker/compose.yml up -d --build`; med den färdiga avbildningen `docker compose -f docker/compose.yml pull` och sedan `up -d`

**Appinstallation och offlineanvändning kräver https och den statiska exporten.** En webbläsare installerar en app och behåller den för offlineanvändning enbart på `https://` eller på `localhost`; på en vanlig `http://192.168.x.x:3000`-adress erbjuder den ingetdera (layerling döljer sitt installationstips där). Även med https skrivs offlinefilerna (`sw.js`) bara ut i den statiska exporten (se [Statisk hosting: vanliga filer på en webbserver](#statisk-hosting-vanliga-filer-på-en-webbserver)), inte i den här avbildningen som kör serverversionen. För installation och offlineanvändning i ett nätverk levererar du den statiska exporten över https; för en https-adress framför containern använder du en omvänd proxy som Caddy eller nginx med ett certifikat (till exempel från mkcert).

Avbildningen kör `node apps/web/server.js` i produktionsläge, så MCP-bryggan är avstängd där om du inte slår på den (se [Låta en AI-klient nå en kopia på en NAS eller server](#låta-en-ai-klient-nå-en-kopia-på-en-nas-eller-server)). För att erbjuda en delad projektmapp monterar du en skrivbar katalog och sätter `LAYERLING_SHARED_PROJECTS_DIR` i `compose.yml` till sökvägen inne i containern där den är monterad, till exempel `./shared-projects:/shared-projects` med `LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"` (se [Delade designer i ett nätverk](#delade-designer-i-ett-nätverk)). Containern körs som användaren med nummer 999, så den användaren måste ha rätt att skriva i mappen: `sudo chown 999:999 ./shared-projects`, eller lägg till `user: "1000:1000"` på tjänsten (dina egna användar- och gruppnummer; `id -u` och `id -g` visar dem) så att containern körs som du. Utan det visas mappen på startsidan men ingenting kan sparas där. Efter en ändring kör du `docker compose up -d`: `docker compose restart` behåller den gamla inställningen. `docker exec <container> printenv LAYERLING_SHARED_PROJECTS_DIR` visar vilken som används.

För att lägga varje design i den mappen och ingen i webbläsaren finns en komplett guide på engelska och tyska med en egen compose-fil och ett uppdateringsskript som kontrollerar konfigurationen, säkerhetskopierar mappen och rullar tillbaka en misslyckad uppdatering: [docs/docker](docs/docker/README.md), skriven av Jürgen Keller. Med `LAYERLING_NEW_DESIGNS_ON_SERVER: "always"` hamnar allt som skapar en design i servermappen: rutan, att öppna eller importera en fil, att återställa en säkerhetskopia (med dess mappar), att duplicera och ett tillstånd hämtat från historiken, och Ny mapp på startsidan skapar en servermapp.

För att välja vilket färgtema besökarna får vid sitt första besök ställer du in `LAYERLING_DEFAULT_THEME` till `system`, `light`, `dark` eller `graphite` (på samma sätt, i `compose.yml` eller i miljön för `npm run start`). Alla som redan har öppnat layerling tidigare behåller det tema webbläsaren redan har, och vem som helst kan fortfarande ändra det med temaomkopplaren. Utan inställningen följer temat systemet. En kopia som levereras som vanliga filer har ingen server som läser variabeln, så där gäller den inte.

För en skolklass eller en workshop med barn startar `LAYERLING_SIMPLE_MODE` layerling i dess enkla läge: verktygsfältet behåller de verktyg en workshop använder, formbiblioteket en kort lista, knapparna är större och startsidan visar designerna utan nyheter, välkomsttext och länkar ut ur layerling. `true` är startläget för personer som ännu inte valt (inställningarna har en omkopplare, och att lämna läget där kräver att man håller knappen intryckt i två sekunder), `always` gäller för alla och tar bort omkopplaren. En länk som slutar på `?mode=simple` slår på det för enheten som öppnar den, och `?mode=full` slår av det igen. Det ställs in på samma sätt som de övriga, och en kopia levererad som vanliga filer har ingen server som läser det (länken och inställningen fungerar ändå där).

Med den delade mappen påslagen gör `LAYERLING_NEW_DESIGNS_ON_SERVER` att nya designer börjar på servern: `true` är startläget för den som inte valt ännu (de kan bocka av **Nya designer på servern** på startsidan), `always` gäller för alla och låser bocken. Det ställs in på samma sätt, och en kopia levererad som vanliga filer har ingen server som läser det.

Bakom en omvänd proxy med en domän måste proxyn skicka vidare ursprungliga `Host` och `X-Forwarded-Proto` (nginx: `proxy_set_header Host $host;` och `proxy_set_header X-Forwarded-Proto $scheme;`), annars nekas sparande till servern med ”Delade projekt tar bara emot begäranden från den här webbplatsen.”. Om proxyn skriver om värdnamnet och du inte kan ändra det listar du den adress folk använder i `LAYERLING_ALLOWED_ORIGINS` (kommaseparerad, till exempel `https://layerling.example.com`).

### Statisk hosting: vanliga filer på en webbserver

Vilken webbserver som helst kan servera layerling som vanliga filer; ingen Node.js körs på den. Bygg filerna en gång på en dator som har Node.js (se [Vad du behöver](#vad-du-behöver)):

```bash
npm install
npm run export
```

Den färdiga webbplatsen hamnar i **`apps/web/.next-export/`**. Kopiera **innehållet** i den mappen (inte själva mappen) till webbserverns dokumentrot, så att `index.html` ligger direkt i den.

Fyra saker att veta:

- **layerling behöver en egen adress.** Filerna refererar till varandra med sökvägar som börjar vid roten (`/_next/...`), så layerling måste levereras från roten på en adress, som `https://layerling.example.com/` eller `http://192.168.0.5:8080/`. Det fungerar inte i en undermapp (`https://example.com/layerling/`) och kan inte öppnas direkt från hårddisken (`file://`). Om du bara ser ett stycke vanlig text utan någon formgivning laddades inte skript- och stilfilerna: öppna webbläsarens utvecklarverktyg (F12), titta i fliken Nätverk efter röda `/_next/...`-poster och jämför deras adress med var du lade filerna.
- **Mappar som börjar med understreck måste levereras.** Vissa servrar döljer dem (GitHub Pages gör det till exempel utan en `.nojekyll`-fil), och `_next` innehåller hela programmet.
- **Ett snabbt test på din egen dator:** `npx serve apps/web/.next-export` och öppna adressen som skrivs ut.
- **Appinstallation och offlineanvändning kräver https.** Exporten innehåller offlinefilerna (`sw.js`), men en webbläsare använder dem bara på en `https://`-adress eller på `localhost`, inte på en vanlig `http://`-adress i ditt nätverk.

### Redigerarprofiler

En valfri redigerarprofil ändrar 3D-verktygsfältet och utvalda verktygsalternativ för den här sidan. Så här provar du [exempelprofilen](docs/examples/editor-profile.json) i en lokal utcheckning:

```sh
LAYERLING_EDITOR_PROFILE="$(cat docs/examples/editor-profile.json)" npm run dev
```

Öppna redigeraren, lägg till en låda och markera den. Det enkla verktygsfältet använder den vanliga ikonstorleken. **Utskriftskontroll** är synligt medan **Lock** och **Flexileder** är dolda. Öppna **Avrunda** för att se en startradie på 2 mm på en låda som är stor nog för det. Alternativet **Endast synliga kanter** är dolt och påslaget.

- `version` måste vara `1`. Ett valfritt `base` med `simple` eller `full` väljer den layouten för den här sidan, före webbläsarens val och Node-serverns standardvärde. Utelämna det för att behålla den vanliga lägesväxlaren.
- Sätt `enlargeInSimpleMode: false` för att använda samma storlek på verktygsfält, formmeny och kontroller som i fullständigt läge. Webbläsarens val av storlek på verktygsfältet gäller fortfarande.
- Under `tools` skriver `visible: true` eller `false` över layouten för verktyg i delarna urklipp, historik, kombinera, ändra och ordna i 3D-verktygsfältet, liksom `import`. Använd verktygets ID (`data-layerling-tool`-attributet på vanliga knappar i verktygsfältet). Inställningarna för verktygsfältet kan fortfarande dölja eller ändra ordningen på verktygen som finns i den aktiva profilen. Ett synligt verktyg behöver fortfarande sin vanliga markering. Okända poster har ingen verkan.
- Under `tools.fillet.options` är `amount.default` en radie i millimeter. En giltig ihågkommen radie har företräde, och verktygets eget startvärde används när ingetdera får plats på kroppen. `onlyVisibleEdges` tar emot `visible`, en boolesk `default` och `locked`. En låsning kräver en `default` och har företräde framför det ihågkomna värdet.
- Profiler påverkar verktygsfältet och de anslutna dialogalternativen. Snabbmenyer, kortkommandon, former och kameran behåller sitt vanliga beteende. Använd värdens behörighetskontroll för åtkomst till projekt.

`LAYERLING_EDITOR_PROFILE` läses av layouten när HTML-koden genereras. Sätt den innan du startar utvecklingsservern eller bygger produktions-HTML, inklusive vid statisk export. Värdar som själva genererar HTML kan i stället lägga in en enskild `<script type="application/json" id="layerling-editor-profile">…</script>` i dokumentets head före layerlings skript. Escapa bokstavligt `<` i den serialiserade JSON-datan som `\u003c`. Profiler är oberoende av projektfiler och webbläsarinställningar och läses en gång per sidladdning. För profiler per konto serverar du den anpassade HTML-sidan från en privat, ocachad sida utanför den statiska service worker-filens offlinecache, till exempel en PHP-ingångspunkt.

### Delade designer i ett nätverk

layerling självt är bara filer, så den delade mappen behöver något på servern som kan skriva. Det finns två sätt, och du behöver bara ett av dem: **Node eller Docker** (det här avsnittet, med `LAYERLING_SHARED_PROJECTS_DIR`), eller **en vanlig webbserver med PHP** (mappen `store`, längre ner). En webbserver som levererar filerna utan någotdera – `npx serve`, nginx eller Apache utan PHP – visar layerling utan problem, men har ingen servermapp.

Om du kör layerling med `npm run dev` eller `npm run start` på en dator som andra öppnar i sin webbläsare kan den erbjuda en delad mapp för `.lyl`-designer. `npm run start` levererar det som `npm run build` skapade, så kör det en gång först. Peka `LAYERLING_SHARED_PROJECTS_DIR` mot en katalog som användaren som startar layerling får skriva till (en mapp under `/srv` tillhör ofta root – skapa en egen eller byt ägare på den) och starta:

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projects npm run start
```

Startsidan visar då designerna i två flikar, **Server** för den delade mappen och **Webbläsare** för den här webbläsarens designer. Med fliken Server öppen startar **Skapa ny 3D-design** en design i den servermapp du befinner dig i, **Ny mapp** skapar en undermapp, och en sökvägsrad under flikarna visar var du är och leder tillbaka ut. Designer flyttas genom att dras till en mapp eller till ett steg i sökvägsraden – eller via **Flytta till …** i sin meny. En design från webbläsaren hamnar på servern genom att dra dess kort till fliken Server, eller med **Lägg på servern** i dess meny; en mapp flyttas på samma sätt, med allt innehåll i sig, och förblir en mapp på servern. Vägen tillbaka är **Lägg i den här webbläsaren** i menyn för en serverdesign, eller genom att dra dess kort till fliken Webbläsare: designen finns då bara i den här webbläsaren och lämnar servermappen, även för alla andra.

Två knappar på startsidan sparar besväret att flytta designer en i taget: **Lägg alla på servern** flyttar alla designer från den här webbläsaren till servermappen på en gång, i samma mappar, och bocken **Nya designer på servern** gör att varje ny design börjar i servermappen så att den sparas där från första ändringen. En design vars namn redan är upptaget på servern stannar i webbläsaren.

Sökrutan längst upp söker i hela servermappen, inte bara i den du står i. Varje träff visar vilken mapp den ligger i, och den mappen är en knapp: ett klick och du är där, med sökningen rensad. Mappar hittas på namn också. Medan du söker visar serverrutan på startsidan hur många träffar som väntar där borta.

**Duplicera** i en designs meny skapar en kopia av den. På servern kopieras själva filen, bredvid originalet och under ett ledigt namn, med bild och allt – ingenting packas om, så kopian bär med sig exakt originalets geometri. I din webbläsare blir kopian en egen design, med samma former, samma historik och en egen förhandsgranskningsbild, och den tillhör ingen på servern.

En design som ligger på servern sparar sig själv tillbaka dit, fem sekunder efter den senaste ändringen och när du lämnar redigeraren. Miniatyrbilder hamnar bredvid filerna i `.thumbnails`. Designer som bara finns i din webbläsare stannar där, orörda.

Egna former som sparas på servern hamnar i en mapp vid namn `Custom shapes` överst i lagringen, en `.lyl` med sin bild var. layerling skapar den med den första sådana formen; den är en vanlig mapp, så den syns på startsidan och en form i den öppnas och sparas som vilken design som helst. Varken Node-rutten eller `store.php` behöver något extra för den.

Inställningarna som sparas med ”Gör till standard” i arbetsyteinställningarna sparas i lagringen också, som `.settings/default.json` (en dold mapp som startsidan inte listar). En webbläsare som tappat sina egna, eftersom dess data rensats eller det är en annan webbläsare, hämtar dem när startsidan laddas så att en ny design börjar med dem igen. Det finns en standard för hela lagringen; den senast sparade i valfri webbläsare vinner. Ta bort filen för att gå tillbaka till varje webbläsares egen.

Att öppna en design från servern ger dig en privat lokal arbetskopia. När du sparar tillbaka kontrolleras först versionen på servern; om någon annan har ändrat filen under tiden vägrar layerling skriva över den och ber dig ladda om eller spara under ett annat namn. Det här är delad fillagring, inte samtidig redigering.

Bakom en autentiserande omvänd proxy (som Authelia, oauth2-proxy, Cloudflare Access eller HTTP Basic Auth) sätter du `LAYERLING_USER_HEADER` till den header din proxy skickar (t.ex. `LAYERLING_USER_HEADER=X-Forwarded-Email` eller i Apache `SetEnv LAYERLING_USER_HEADER Remote-User`) för att isolera varje användares designer i `.users/<användare>/`. Detta är bara säkert när layerling enbart går att nå genom proxyn, så att ingen kan skicka godtyckliga headers direkt till servern.

#### Utan Node: mappen `store`

En installation som levereras som statisk export – vanliga filer på en webbserver – kan inte skriva någonting på egen hand. För det fallet följer `store.php` med exporten. Skapa en mapp med namnet `store` bredvid `index.html` som webbservern får skriva till, så erbjuder layerling samma delade lagring som ovan, med mappar och allt. Utan mappen förblir funktionen osynlig, och snabbguiden i redigeraren förklarar hur du slår på den. Webbservern behöver PHP.

PHP begränsar uppladdningar som standard (`upload_max_filesize` och `post_max_size`, några få megabyte), och en stor design eller en säkerhetskopia med många designer kan vara större. `store.php` talar då om vilken gräns som nåtts och vad den står på; höj båda i `php.ini`, eller i Docker-avbildningen med en fil som `uploads.ini` i `/usr/local/etc/php/conf.d/` (`upload_max_filesize = 512M`, `post_max_size = 512M`).

Mappen har **ingen inloggning**: vem som helst som når sidan kan läsa, skriva och ta bort det som ligger i den. På ett hemnätverk eller i en verkstad är det själva poängen; på en publikt nåbar webbplats bör du skydda den eller lämna bort den.

Ingenting i mappen är avsett att öppnas via sin adress: layerling läser och skriver den bara genom `store.php`. På Apache skriver `store.php` en `.htaccess` i mappen som nekar varje direkt begäran. Apache läser den bara där `AllowOverride` tillåter det (Debians standard för `/var/www` är `None`, vilket ignorerar den), och nginx och andra servrar gör det aldrig, så neka åtkomst till `store/` där själv (i Apache: `<Directory /var/www/html/store> Require all denied </Directory>`, i nginx: `location /store/ { deny all; }`). `store.php` kontrollerar dessutom varje export som sparas, så en fil som skulle kunna köras i en webbläsare avvisas oavsett.

Mappen kan även ligga utanför webbroten, där ingen adress når den över huvud taget, med `.htaccess` eller utan: peka `LAYERLING_SHARED_PROJECTS_DIR`, samma inställning som Node-servern läser, till dess sökväg – i Apache med `SetEnv LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects`, i nginx med `fastcgi_param LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects;`, i Docker som en miljövariabel i containern. Den mappen tar då platsen för `store`; även den måste finnas och vara skrivbar för webbservern.

En sak att komma ihåg vid driftsättning: om du speglar exporten med en flagga som tar bort allt övertaligt – `rsync --delete`, `robocopy /MIR`, WinSCP `-delete` – undanta `store` uttryckligen, annars raderar varje uppdatering alla projekt.

## Arbeta vidare med layerling

Ta den här vägen om du vill ändra i koden.

### Vad du behöver

- Node.js 22.18 eller nyare (skripten för handbok och typsnitt laddar TypeScript-filer direkt, vilket äldre versioner inte klarar); 24 fungerar också, Docker-avbildningen använder den
- npm, följer med Node.js

Kontrollera dina versioner med `node -v` och `npm -v`. Om de kommandona inte fungerar installerar du Node.js från den officiella Node.js-webbplatsen och öppnar terminalen på nytt.

### Installera och kör

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

Inget Git? Tryck på den gröna knappen **Code** på GitHub-sidan, välj **Download ZIP**, packa upp filen, öppna en terminal i den uppackade mappen och börja med `npm install`.

Öppna sedan `http://127.0.0.1:3000/`. Låt terminalen vara öppen medan du använder appen; `Ctrl+C` stoppar utvecklingsservern.

För att öppna utvecklingsservern från en annan dator via ett namn, som `http://myhost.local:3000/`, listar du det namnet i miljövariabeln `LAYERLING_ALLOWED_DEV_ORIGINS` innan du startar (flera namn separerade med kommatecken, `*.local` för varje namn som slutar på `.local`). Utan den svarar utvecklingsservern bara på `localhost` och `127.0.0.1`. Den statiska exporten och `npm run start` behöver den inte.

På Linux och macOS sköter `scripts/start-layerling.sh` den dagliga starten åt dig: det uppdaterar arbetskopian först (hoppas över om du ändrat filer i den), startar servern, väntar tills den svarar och öppnar sedan webbläsaren. Kör det varifrån som helst, till exempel `~/layerling/scripts/start-layerling.sh`. Det kräver Git och Node.js enligt ovan. Om layerling redan körs på den porten öppnar det bara webbläsaren i stället för att starta en andra server. Är port 3000 upptagen av något annat? Starta det med `PORT=3100 scripts/start-layerling.sh`. Det har testats på Debian Linux (utan skrivbordsmiljö, så webbläsarsteget skriver bara ut adressen) och i ett Windows-skal; macOS är otestat – om det krånglar på ditt system får du gärna berätta det i diskussionerna.

### Utveckla i en container

Vill du helst slippa installera Node.js? Utveckla i en container i stället. Du behöver en containermotor med Compose – `docker compose` eller `podman compose` (rootless Podman med SELinux fungerar också; `:z`-flaggan i compose-filen hanterar filernas etiketter):

```bash
docker compose -f docker/compose.dev.yml up
```

Öppna `http://127.0.0.1:3000/`. Första starten installerar beroenden; senare starter går rakt in i utvecklingsservern med hot reload. Stoppa med `Ctrl+C`. Om du uppdaterar beroenden och något verkar inaktuellt tar du bort `node_modules/` i projektmappen och startar om.

Kör du produktionscontainern från `docker/compose.yml` samtidigt? Den använder också port 3000 – ändra värdporten på en av dem (t.ex. `"3100:3000"`).

### Användbara kommandon

| Kommando | Vad det gör |
| --- | --- |
| `npm run typecheck` | TypeScript-kontroller |
| `npm run test` | Enhetstester |
| `npm run test:e2e` | End-to-end-tester |
| `npm run build` | Produktionsbygge (`npm run start` levererar det) |
| `npm run export` | Statisk export för vanligt webbhotell |
| `npm run guide` | Bygg handbokens sidor från `docs/guide` (exporten och `npm run dev` gör detta också) |
| `npm run guide:images` | Ta om handbokens bilder från det körande programmet (kräver `npm run dev -- -p 3010`; se `docs/guide/README.md`) |
| `npm run printers:update` | Uppdatera skrivarförinställningarna från OrcaSlicers profiler |
| `npm run mcp:layerling` | Starta MCP-servern för AI-klienter (se nedan) |

## layerling MCP Skill

layerling innehåller en lokal MCP-server för AI-klienter som stöder MCP-verktyg. Den låter en agent granska och styra en aktiv redigerarflik: lista öppna redigerare, läsa av scenen, skapa, uppdatera och markera objekt, gruppera, skära och separera delar, lista CAD-kant-ID:n, tillämpa fasning eller avrundning, gröpa ur en kropp, granska fel samt ta bilder av vyn.

Den fungerar mot en lokal utvecklingsserver. I produktionsbyggen och vid statisk hosting är MCP-rutten avstängd, om inte servern slår på den med en åtkomsttoken ([se nedan](#låta-en-ai-klient-nå-en-kopia-på-en-nas-eller-server)); på layerling.com är den alltid avstängd.

1. Starta layerling från projektmappen med `npm run dev` (se [Installera och kör](#installera-och-kör)).
2. Öppna en redigerarflik, t.ex. `http://127.0.0.1:3000/?editor=1` – eller låt bli: när ingen redigerare är öppen startar det första verktyget som behöver en webbläsaren med en redigerare (gäller inte en kopia på en NAS eller server; `LAYERLING_MCP_OPEN_EDITOR=0` stänger av det).
3. Anslut din AI-klient enligt beskrivningen nedan. Den startar själv MCP-servern med `node scripts/layerling-mcp-server.mjs`.

De huvudsakliga verktygsnamnen är `layerling_list_editors`, `layerling_read_scene`, `layerling_list_objects`, `layerling_create_shape`, `layerling_update_object`, `layerling_list_edges`, `layerling_apply_edge_treatment`, `layerling_hollow_object`, `layerling_make_lid`, `layerling_offset_object`, `layerling_cut_out`, `layerling_punch`, `layerling_array_objects`, `layerling_set_section_view` och `layerling_capture_image`.

### Claude Code

Ingenting att installera: arkivet innehåller redan `.mcp.json`, som registrerar MCP-servern för det här projektet, samt en kopia av skillen under `.claude/skills/layerling-mcp-skill`, vilket är där Claude Code letar efter en. Öppna mappen för layerling i Claude Code och fråga:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Claude Desktop

Claude Desktop läser inte ett projekts `.mcp.json` eller skill-filer, men kan använda samma MCP-server via sin egen konfiguration. Lägg till servern där, med [`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json) som mall, och ersätt skriptsökvägen med den absoluta sökvägen på din dator. Efter omstart av Claude Desktop, fråga:

```text
Use the layerling MCP tools to list open editors, inspect the scene, and modify the selected object.
```

### Codex

Kopiera skillen från `docs/skills/layerling-mcp-skill` till din Codex-mapp för skills.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.codex\skills\layerling-mcp-skill"
```

macOS eller Linux:

```bash
mkdir -p ~/.codex/skills
cp -R docs/skills/layerling-mcp-skill ~/.codex/skills/
```

Lägg sedan till en MCP-serverpost i din Codex-konfiguration, med [`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml) som mall, och ersätt skriptsökvägen med den absoluta sökvägen på din dator. Starta om Codex och fråga:

```text
Use $layerling-mcp-skill to list my open layerling editors and inspect the current scene.
```

### Gemini & Antigravity

För Antigravity följer en kopia av skillen med i arkivet under `.agents/skills/layerling-mcp-skill`, som Antigravity hittar automatiskt. För Gemini CLI kopierar du skillen från `docs/skills/layerling-mcp-skill` till din globala skills-mapp.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.gemini\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.gemini\skills\layerling-mcp-skill"
```

macOS eller Linux:

```bash
mkdir -p ~/.gemini/skills
cp -R docs/skills/layerling-mcp-skill ~/.gemini/skills/
```

Lägg sedan till servern i Gemini CLI:s `settings.json` eller Antigravitys `mcp_config.json`, med [`docs/mcp/gemini-config.example.json`](docs/mcp/gemini-config.example.json) som mall, och ersätt skriptsökvägen med den absoluta sökvägen på din dator. Starta om klienten och fråga:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Låta en AI-klient nå en kopia på en NAS eller server

En kopia som du driftar själv (Docker-avbildningen på en NAS, en hemmaserver) kan låta en AI-klient styra sina öppna redigerare över nätverket. Det är **avstängt som standard**, eftersom den som kan styra bryggan kan läsa och ändra de öppna designerna. Slå på det med två inställningar på servern som läses när den startar – den färdiga avbildningen behöver inget nybygge:

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "a-long-random-secret-of-at-least-16-characters"
```

Utan en token på minst 16 tecken förblir bryggan stängd. Sedan:

1. Öppna en redigerarflik av den kopian i en webbläsare, t.ex. `http://nas:3000/?editor=1`, och låt den vara öppen.
2. Ge MCP-klienten adressen och samma token: ange `LAYERLING_URL=http://nas:3000` och `LAYERLING_MCP_TOKEN=<ditt token>` i dess konfiguration (se exemplen i `docs/mcp`).

Token skyddar kommandona: bara en klient som skickar med det kan lista eller styra redigerarna. Redigerarsidorna behöver inget, men de räknas bara när de är sidor från just den kopian och har öppnats med en adress eller ett namn som bara någon i ditt eget nätverk kan använda (en IP-adress, ett namn utan punkt, eller ett som slutar på `.local` eller `.lan`). Detta hindrar att en webbsida på internet når din NAS genom din webbläsare. Om du öppnar kopian under en riktig domän, exempelvis bakom en omvänd proxy, listar du den i `LAYERLING_MCP_ALLOWED_HOSTS` (kommaseparerad). Använd detta i ett nätverk som du litar på, och använd HTTPS för allt utanför det: ditt token färdas i en HTTP-header.

## Bidra

Bidrag är välkomna, och du behöver inte vara någon 3D-utskriftsexpert för att hjälpa till – en tydligare mening i den här README-filen räknas också. Bra ställen att börja på:

- buggfixar i redigeraren
- testfall för geometri och booleska operationer
- kantfall vid import och export (STL, OBJ, 3MF, STEP, SVG, DXF)
- finslipning av gränssnittet
- skärmdumpar och videor för dokumentationen
- förbättringar av tillgänglighet och prestanda

Läs [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) innan du öppnar en pull request. Vad som ändrats i varje version står i [ändringsloggen](docs/CHANGELOG.md).

## Säkerhet

Öppna inga publika ärenden (issues) för säkerhetskänsliga rapporter. Läs [.github/SECURITY.md](.github/SECURITY.md) för rapporteringsprocessen.

## Var det kommer ifrån

layerling är en fork av [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D) av Formsmith746 och SketchForge-bidragsgivarna. Forken startade den 16 september 2026 utifrån SketchForge 1.0.9. SketchForge är fortfarande ett utmärkt projekt och anledningen till att det här finns.

## Varumärken

Tinkercad är ett varumärke som tillhör Autodesk, Inc. layerling är ett fristående projekt och har ingen koppling till, rekommenderas inte av och sponsras inte av Autodesk.

## Licens

Copyright (C) 2026 layerling contributors.
Copyright (C) 2026 SketchForge contributors.

layerling är en modifierad version av SketchForge-3D och är licensierat under **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`) – samma licens som originalet. Se [LICENSE](LICENSE).

Om du modifierar layerling och låter människor använda den modifierade versionen över ett nätverk kräver avsnitt 13 i licensen att du erbjuder dem motsvarande källkod. Startsidan har en **Source**-länk för just detta: sätt `NEXT_PUBLIC_SOURCE_CODE_URL` vid byggtillfället till den publika URL:en för källkoden som ditt bygge kom ifrån.
