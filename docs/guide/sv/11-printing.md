---
title: Förbereda för 3D-utskrift
summary: Välja skrivare, bli varnad när något inte får plats och lägga delen på bästa sätt.
---

## Välja skrivare

Öppna inställningarna (kugghjulet i rubrikraden, {{ui:editor.workspaceSettings}}) och gå till avdelningen {{ui:workspace.workplane}}. Under {{ui:workspace.printer}} väljer du din skrivare ur en lista med över 230 vanliga modeller, bland annat Bambu Lab, Prusa, Creality, Anycubic, Elegoo och många fler.

![Inställningarna för arbetsytan med en vald skrivare. Byggplatta och maximal utskriftshöjd kommer från slicerprofilen.](shot:settings-workplane)

Tre saker händer:

- Arbetsytan får samma storlek som byggplattan.
- I hörnet av arbetsytan visas skrivarens namn och dess byggvolym. Om texten skymmer vyn kan du stänga av den med {{ui:workspace.showPlateLabels}} under {{ui:workspace.workplane}}; det gäller även designens namn längst fram till vänster.
- layerling **varnar** när något inte får plats.

De flesta skrivarprofilerna kommer från OrcaSlicer. Om du hellre vill arbeta utan skrivare väljer du {{ui:workspace.printerNone}}. Du kan också ange måtten på arbetsytan för hand.

Deltaskrivare som FLSun, SeeMeCNC eller Anycubic Predator skriver ut på en rund platta. För en sådan skrivare blir även arbetsytan rund med samma diameter som plattan, och en kropp blir för stor så snart den når utanför kanten. En rund kropp mäts efter sin verkliga kontur och inte efter den omskrivande lådan, så en cylinder som nästan fyller plattan får fortfarande plats.

## När något inte får plats

En kropp som sticker utanför kanten på byggplattan markeras. Ett meddelande anger vilka sidor som sticker ut och med hur mycket. Detsamma gäller om delen är **för hög**: höjden räknas från den lägsta kroppen, precis som slicern ställer ned modellen på plattan.

![Lådan är bredare än byggplattan på Bambu Lab A1 mini. Meddelandet längst ned visar med hur mycket.](shot:printer-overhang)

Varningen hindrar dig inte från att arbeta vidare. Den är en påminnelse så att du inte först i slicern upptäcker att delen är för stor. En del som är för stor går ofta att dela: kapa den i två delar med {{ui:editor.tool.split}} och skriv ut halvorna var för sig.

Om du medvetet parkerar delar vid sidan av plattan klickar du på det lilla krysset i meddelandet. Varningen tystnar då för just de kropparna. Så snart någon av dem får plats igen och du senare flyttar ut den, eller om en annan kropp sticker ut, kommer meddelandet tillbaka. Dolda kroppar räknas aldrig, så att dölja de parkerade delarna fungerar lika bra.

## Lägga delen rätt

Hur en del ligger på plattan avgör både hållfasthet och utseende. Två verktyg i området {{ui:editor.group.arrange}} hjälper till:

- {{ui:editor.tool.layFlat}}: klicka på en yta så lägger sig delen ned med just den sidan mot plattan. Bästa utskriftsriktningen med ett klick.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): sätter ned delen på arbetsytan när den svävar i luften.

Några tumregler för orientering:

- Stora plana ytor nedåt. De fäster bäst.
- Lägg långa, belastade delar så att lagren inte löper vinkelrätt mot belastningen. Skarven mellan lager är den svagaste riktningen.
- Undvik överhäng brantare än 45°, eller förse dem med stöd i slicern.

## Hitta överhäng

I menyn bredvid ögat ({{ui:editor.group.visibility}}) slår **Visa överhäng** på visningen av överhäng. Varje yta som lutar nedåt brantare än 45° skraffas då i rött och vitt – där skulle skrivaren behöva stödstrukturer. Det som vilar direkt på plattan lämnas omarkerat. På så sätt ser du redan medan du ritar om en sfär, ett valv eller ett horisontellt hål kan skrivas ut utan stöd; [dropphålet](chapter:threads-and-mechanics) är gjort just för det. Vrid delen eller lägg den på en annan yta med {{ui:editor.tool.layFlat}} så uppdateras skrafferingen direkt.

Hur branta överhäng just din skrivare klarar ställs in i inställningarna under {{ui:workspace.appearance}}: från 30° (försiktigt) till 70° (för skrivare med kraftig kylning). En yta som vilar mot en annan kropp markeras ändå – layerling bedömer bara själva ytans lutning.

## Stödribbor för en lutad del

En del som skrivs ut lutad på en kant, exempelvis i 45°, behöver ofta inget stöd: dess ytor är tillräckligt branta. Däremot balanserar den på en smal kant och kan välta. {{ui:supportRib.title}} stöttar upp den: en tunn ribba ställer sig ett litet mellanrum under den nedre ytan på en oval fot, med pyttesmå bryggor som håller fast delen. Vrid delen på kant först så att den står på plattan.

1. Markera delen och klicka på {{ui:supportRib.title}} i gruppen {{ui:editor.section.splitShape}} i verktygsfältet, högerklicka på delen eller sök upp den med [[Ctrl]]+[[K]].
2. Klicka på den nedre ytan där ribban ska stötta. Ytan måste peka nedåt, luta mellan 15° och 75° och nå ända ned till plattan; ribban placerar sig rakt nedför ytan från stället där du klickade. Om delens nederkant är avrundad eller fasad får ytan sluta upp till 3 mm ovanför plattan: klicka då på den plana ytan ovanför avrundningen.
3. Ställ in {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} och {{ui:supportRib.firstLayer}} som i din slicer. Ribban blir två munstycksbredder tjock med ett halvlinjers mellanrum till delen; varje brygga blir en sträng bred och exakt ett lager hög på ett riktigt utskriftslager, så att slicern skriver ut den som en enda tunn linje som lätt knäcks loss. {{ui:supportRib.height}} styr hur högt upp längs ytan ribban når (halva vägen som startvärde), och {{ui:supportRib.bridgeSpacing}} anger avståndet mellan bryggorna i hela lager.
4. Under {{ui:supportRib.more}} kan ribbans tjocklek, mellanrummet, bryggornas bredd och fotens tjocklek ställas in för hand (annars följer de munstycket och lagren), liksom fotens bredd och avrundningarna där ribban möter foten samt upptill. Med {{ui:supportRib.bridgeGap}} över 0 når bryggorna inte längre ända in i delen utan slutar så långt framför den i planet: slicern skriver då ut varje brygga som en egen bana som bara håller delen med lätt kontakt från strängens bredd och lossnar utan märke (en halv linjebredd, 0,2 mm för ett 0,4 mm munstycke, är ett bra startvärde). Öka då {{ui:supportRib.gap}} så att bryggorna fortfarande spänner över delar av gapet.
5. {{ui:supportRib.apply}} skapar ribban. Med {{ui:supportRib.bundle}} (påslaget från början) buntas ribban ihop med delen: de flyttas tillsammans och exporteras till slicern som två separata kroppar bredvid varandra, förenade i utskriften av bryggorna.

Ribban är en nätkropp: vill du ändra den tar du bort den och skapar en ny. Varje klick lägger till en ribba; för fler klickar du på {{ui:supportRib.repick}} eller upprepar den med {{ui:editor.tool.array}}. Ribban får inte skära in i delen någonstans, och delen måste stå på plattan – annars förklarar fönstret varför det inte går. Dina inställningar sparas i den här webbläsaren till nästa ribba.

{{ui:clearance.title}} och {{ui:printCheck.title}} känner igen ribban: att bryggorna når intill delen samt att ribban och bryggorna är tunna och ligger ett lager högt tvärs över mellanrummet är meningen och rapporteras inte som fel. En ribba skapad i layerling 1.148.0 saknar ännu denna märkning; skapa om den så hoppas den över i kontrollerna.

## Väggtjocklek, spelrum och fasning

- Väggar bör vara minst två strängar breda, alltså 0,8 mm med ett 0,4 mm munstycke. Stadiga delar kräver 1,2 till 2 mm.
- Där två delar ska passas i varandra behövs spelrum: oftast 0,2 till 0,4 mm beroende på skrivare. Gör gärna ett litet provpar innan du skriver ut den stora delen.
- Många lägger en svag fas på den underkant som vilar mot plattan. Det förhindrar att första lagret kläms ut i kanterna (”elefantfot”).

## Skrivarens spel: passningstestet

Varje skrivare skriver ut hål en aning mindre och tappar en aning tjockare än de är ritade, olika mycket från maskin till maskin, så rätt spelrum mellan två utskrivna delar är i början en gissning. Mät upp det en gång i stället. Under {{ui:workspace.workplane}} i inställningarna lägger {{ui:workspace.fitTestMake}} ett passningstest på plattan: en bricka på 60 × 20 × 4 mm med sju hål för en 5 mm tapp, ritade som 5 mm plus två gånger 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 eller 0,40 mm med siffran upphöjd bredvid, samt själva 5 mm-tappen stående bredvid brickan med en liten fas i toppen. Det består av vanliga former och kan skrivas ut ihop med annat på plattan utan stöd.

På skrivare där byggbädden åker fram och tillbaka kan den smala, höga tappen börja vibrera loss eller bli vågig nedtill, även med brim. Bocka för {{ui:workspace.fitTestBase}} innan du skapar testet: då står tappen på en liten 10 mm basplatta som fäster stadigt i bädden. Den sitter inte fast i plattans hylsa utan vilar på en liten tapp i botten; efter utskrift vickar du bara tappen fram och tillbaka så snäpper den loss.

Skriv ut testet som det ligger och tryck sedan in tappen, med den fasade änden först, i hålen med början från det trängsta. **Det trängsta hål där tappen fortfarande kan vridas runt** ger din skrivares spel. Skriv in det värdet under {{ui:workspace.printerPlay}}, eller klicka på rätt siffra i listan under fältet. Spelet anges per sida i millimeter och sparas i webbläsaren för alla designer; ett tomt fält betyder att inget värde är uppmätt.
Har du flera skrivare väljer du först den skrivare du ska skriva ut på under {{ui:workspace.printer}}: varje skrivare håller reda på sitt eget spel, och nya delar utgår från spelet för den skrivare som designen är inställd på. En skrivare utan eget uppmätt värde använder det spel som angavs utan vald skrivare.

Från och med då utgår nya verktyg från ditt uppmätta spel i stället för standardvärdet: {{ui:lid.gap}} och {{ui:lid.hingePinPlay}} i verktyget {{ui:editor.tool.lid}}, spelet hos nya {{ui:shape.dovetail}} och {{ui:shape.snapFit}}, {{ui:prop.clearance}} för nya muttrar och gängade hål – dubbla spelet eftersom utrymmet gäller runt hela diametern – samt {{ui:clearance.threshold}} i {{ui:editor.tool.clearance}}. Detsamma gäller {{ui:split.connectorClearance}} för styrstift, pluggar och laxstjärtar i {{ui:editor.tool.split}}. Så länge ett sådant fält behåller det värdet visar ”{{ui:printerPlay.fromFitTest}}” bredvid var siffran kommer ifrån. Ett färdigmonterat gångjärn som skrivs ut i ett stycke och lederna i {{ui:editor.tool.flexi}} behåller sina 0,4 mm: utskrivna i ett stycke måste mellanrummen också hållas öppna mellan utskriftslagren i höjdled, vilket en fristående tapp inte mäter. Utrymme för att trycka in magneter eller en Gridfinity-nyckel samt mått för köpta kontakter och kort behåller också sina egna värden. Kroppar som redan finns i en design ändras aldrig, och inte heller designer du öppnar.

## Kontrollera utskriften

{{ui:editor.tool.printCheck}}, bredvid {{ui:editor.tool.clearance}} under {{ui:editor.group.combine}}, granskar de markerade objekten, eller alla synliga objekt när inget är markerat, och samlar i ett enda fönster vad som skulle kunna krångla vid utskrift. Var och en av de fem raderna lyser grönt om inget hittades, och orange med vad och var om något upptäcktes:

- **{{ui:printCheck.thin.title}}**: partier som är tunnare än två munstycksbredder – 0,8 mm med ett 0,4 mm munstycke. Slicern hoppar över en så tunn vägg eller skriver bara en enda svag sträng. Välj ditt munstycke under {{ui:printCheck.nozzle}} överst i fönstret (0,2 till 0,8 med ett klick, eller skriv annat värde i fältet). Tunna partier målas röda med ett ljust rutnät på kropparna, och raden anger det tunnaste stället samt hur stor yta som är för tunn. Partier mindre än 1 mm² och skarpa kanter, exempelvis spetsen på en kil, räknas bort.
- **{{ui:printCheck.floating.title}}**: en kropp, eller en lös del av en kropp, som varken nuddar plattan eller en annan del (inom 0,05 mm). Den skulle skrivas ut rakt i luften. En del som vilar på en annan stående del är helt i sin ordning.
- **{{ui:printCheck.contact.title}}**: en del på plattan vars första lager är mycket litet i förhållande till sin höjd, till exempel en sfär eller en kon på spetsen. Den riskerar att lossna under utskrift. Kontrollen varnar under 0,5 mm² kontaktyta mätt 0,1 mm över plattan per millimeter höjd: en sfär hamnar alltid under gränsen, medan en 10 mm kub har 10.
- **{{ui:printCheck.overhang.title}}**: samma siffror som vid **Visa överhäng**, med den vinkel som är inställd där.
- **{{ui:printCheck.openMesh.title}}**: ett importerat nät med öppna kanter, eller kanter som delas av tre eller fler trianglar. Slicern tvingas gissa vad som är insida i ett sådant nät.

![En bricka vars högra vägg bara är 0,6 mm tjock: Utskriftskontroll färgar den röd och nämner det i fönstret.](shot:print-check)

{{ui:printCheck.show}} på en rad flyttar kameran dit; den markerar svävande delar, delar med för liten bas och öppna nät, och för överhäng slår den på **Visa överhäng**. Kroppar som överlappar varandra kontrolleras sammanslagna, så som slicern tolkar dem. Om du ändrar designen medan fönstret är öppet visas {{ui:printCheck.stale}}; klicka på det eller på {{ui:printCheck.checkAgain}}. [[Esc]] stänger fönstret. Ingenting i designen ändras. En AI kan köra samma kontroll med `layerling_check_print`. Fönstret kontrollerar bara, det skriver inte ut eller sparar något: för att skriva ut exporterar du designen till din slicer med {{ui:editor.export}} i gruppen {{ui:editor.group.file}}. {{ui:printCheck.openExport}} i fönstret stänger kontrollen och öppnar exporten.

## När du är klar

Välj {{ui:editor.export}} och sedan **STL** eller **3MF**. STL är det enklaste formatet. 3MF behåller namn och färger på enskilda kroppar och är därför praktiskt vid flerfärgsutskrift. Exportfönstret visar också hur många gram och meter filament delen ungefär kräver om den skrivs ut massivt. Mer i [Filer och lagring](chapter:files-and-saving).
