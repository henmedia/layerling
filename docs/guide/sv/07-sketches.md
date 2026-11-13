---
title: "Skisser: från kontur till kropp"
summary: Rita en plan kontur, runda av eller fasa hörnen och dra ut eller rotera den till en kropp.
---

Allt går inte att sätta samman av grundformer. För delar med en egen kontur – som ett fäste, en kuggprofil eller en vas – ritar du först **konturen** och gör sedan en kropp av den. Det är det skissläget är till för.

## Starta en skiss

Växla längst upp från {{ui:editor.modeGeometry}} till {{ui:editor.modeSketch}}. I gruppen {{ui:sketch.group.create}} i verktygsfältet sitter tre knappar bredvid varandra för vad konturen ska bli:

- **{{ui:sketch.extrude}}:** Konturen dras uppåt, som en pepparkaksform.
- **{{ui:sketch.revolve}}:** Konturen roteras runt en axel, som i en svarv. Det ger vaser, koppar, koner och allt som är runt.
- **{{ui:sketch.sweep}}:** Konturen dras längs en bana: en kabelkanal som svänger runt ett hörn, ett rör eller en ring runt en form. Se Svepa längs en bana nedan.

Redigeraren visar då ett ark med rutnät. Det är din rityta.

Skissen ligger på arbetsytan. För att rita på en yta på en kropp – exempelvis för en kontur som ska börja högre upp – lägger du först arbetsytan på den ytan med [[W]] (se [Vy och arbetsyta](chapter:view-and-workplane)) och startar sedan skissen.

## Rita

Verktygsfältet i skissläget är indelat i områden. Nedan har varje verktyg ett eget kort: vad du gör, ett steg per rad, och efter en pil vad som händer då. Tangenten till höger på ett kort väljer verktyget.

### Ritverktyg

::: icon=line {{ui:sketch.line}} | [[1]]
Klicka ut punkter en efter en.
Håll ned [[Shift]] för att fästa den nya linjen i steg om 15°, inklusive vågrätt och lodrätt.
=> Längden och vinkeln för den nya linjen visas vid pekaren.
För att skriva in hur lång den ska vara, se [Linjer med siffror](#linjer-med-siffror).
> Varje punkt du klickar hamnar på det fästrutnät som är inställt under {{ui:inspector.snapGrid}}. Med [[Shift]] nedtryckt går steget om 15° före: längden följer fortfarande rutnätsstegen, men ändpunkten kan hamna mellan rutnätslinjerna.
:::

::: icon=arc {{ui:sketch.arc}}
Klicka ut bågens två ändpunkter.
Klicka ut en tredje punkt som bågen går igenom.
=> Fram till det tredje klicket följer en förhandsgranskning med pekaren, och statusmeddelandet anger radien.
=> En ändpunkt som klickas på en befintlig punkt kopplas ihop med den, så en båge kan stänga en kontur.
[[Esc]] släpper de punkter som klickats hittills och går tillbaka till {{ui:sketch.select}}.
> När bågen väl är ritad är den vanlig geometri av punkter och kurvor: flytta, dela eller radera den som vilken annan linje som helst.
:::

::: icon=bezier {{ui:sketch.bezier}} | [[2]]
Klicka på en punkt och dra i den riktning linjen ska fortsätta, som med pennverktyget i Illustrator eller Inkscape.
=> Ju längre du drar, desto mer böjs kurvan.
=> Sträckan till den nya punkten böjer sig samtidigt som du drar, så du ser direkt vad du får.
> Kommer du från Tinkercad och vill bara klicka ut punkter? Välj {{ui:sketch.smooth}}.
> Den första sträckan böjs bara i sin startpunkt om du drar även i den första punkten. Med bara ett klick lämnar linjen den punkten rakt; för att böja den senare markerar du punkten med {{ui:sketch.select}} och drar i dess handtag.
:::

::: icon=smooth {{ui:sketch.smooth}} | [[3]]
Klicka ut punkter en efter en.
=> Den lägger en följsam bana genom punkterna du klickar ut.
> Vid de två ändarna av en öppen linje siktar kurvan rakt mot nästa punkt, så den första och den sista sträckan böjs mindre än övriga. För att böja en av dem mer markerar du ändpunkten med {{ui:sketch.select}} och drar i dess handtag. I en sluten kontur böjer sig varje punkt på samma sätt.
:::

::: Stänga eller avsluta en linje
För att stänga konturen klickar du på den första punkten igen på slutet.
För att avsluta linjekedjan utan att stänga konturen högerklickar du utan att flytta pekaren, eller dubbelklickar på den sista punkten.
Byter du till {{ui:sketch.line}}, {{ui:sketch.bezier}} eller {{ui:sketch.smooth}} mitt i en kedja fortsätter linjen från den sista punkten.
=> En kropp skapas bara av en **sluten** kontur.
:::

::: icon=freehand {{ui:sketch.freehand}} | [[5]]
Rita med pennan, ett finger eller musen, som på papper.
=> När du lyfter blir linjen vanliga punkter: ett hörn där den svängde skarpt och mjuka punkter däremellan, bara så många som formen kräver, så varje punkt kan dras i efteråt.
Zooma in för fina detaljer: ju närmare du tittar, desto noggrannare följer linjen din hand.
=> En linje som slutar där den började stängs till en kontur som kan bli en kropp; en öppen linje förblir en linje, för {{ui:sketch.stroke}} eller som bana att svepa längs.
Börja på linjer eller på en mallbild för att rita av en bild för hand.
Börja eller sluta ett drag vid en öppen ände för att fortsätta den linjen, så att en form kan ritas i flera drag.
> Draget håller sig inte till fästrutnätet, så att det följer din hand fritt. En punkt som du drar i efteråt fäster däremot mot rutnätet, om inte {{ui:inspector.snapGrid}} är avstängt.
:::

> Siffertangenterna väljer ett verktyg så länge ingen linje ritas; medan en linje ritas anger de i stället dess längd (se nedan). När {{ui:sketch.select}} är aktivt och linjer eller punkter är markerade ändrar samma tangenter dem i stället: [[1]] gör linjer raka och punkter till hörn, [[2]] gör linjer till kurvor och [[3]] gör punkter mjuka. När inget är markerat väljer de verktyg precis som förut.

### Former

::: {{ui:sketch.addShape}}
Välj en färdig kontur: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (en skiva med hål), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, en {{ui:sketch.polygon}} eller en {{ui:sketch.star}}.
Klicka på den för att lägga den i skissens origo, eller dra den från menyn dit du vill ha den.
Längst ned i menyn ställer {{ui:sketch.polygonSides}} in antalet sidor på polygonen och antalet spetsar på stjärnan, och {{ui:sketch.starInner}} hur djupt stjärnans dalar går in mot mitten (10 till 90 procent av ytterradien).
=> Båda gäller för nästa form du lägger till.
=> Liksom alla skissformer består de sedan av vanliga hörnpunkter, så du kan flytta, runda av eller fasa dem ett i taget.
> Rektangeln startar med den bredd och det djup som ställts in för lådan under {{ui:workspace.shapeDefaults}} i inställningarna, cirkeln och ovalen med cylinderns bredd där; utan egna standardvärden, och för övriga former, är de 20 mm breda.
:::

::: Överlappande konturer
Skjut två slutna konturer över varandra.
=> De förblir två kroppar, som smälts samman i 3D-redigeraren; överlappningen blir inget hål.
=> Att flytta förenar inte linjerna där de korsas, så du kan dra isär formerna igen.
Ritar du i stället en linje tvärs över andra lägger layerling en punkt vid varje korsning.
> Ett hål uppstår bara av en kontur som ligger helt inuti en annan.
:::

### Markera och ändra

::: icon=select {{ui:sketch.select}}
Klicka på en punkt eller en linje och dra den för att flytta den.
Klicka inuti en sluten kontur för att markera hela konturen; inuti ett hål markerar det hålet.
=> Du kan dra den eller ändra storlek på den direkt.
Håll ned [[Shift]] och klicka för att lägga till en punkt eller linje i markeringen eller ta bort den igen, så att du kan flytta flera tillsammans.
Dra en ram över en tom yta för att markera allt inuti den.
Dra i en linje för att flytta den med båda dess ändpunkter, eller hela markeringen om den ingår i en.
Piltangenterna flyttar markeringen ett rutnätssteg i taget, tillsammans med [[Shift]] ett större steg.
Håll ned [[Shift]] medan du drar för att hålla flytten längs en axel.
:::

::: Ramen runt markeringen
Dra i ett hörnhandtag för att ändra bredd och höjd samtidigt; håll ned [[Shift]] för att behålla proportionerna.
Dra i ett sidohandtag för att ändra bara ena riktningen.
Klicka på måttfältet för bredd eller höjd för att skriva in en ny storlek, även som en summa (”60+12,5”) eller i procent (”150%”).
Dra i de böjda pilarna utanför hörnen för att vrida hela markeringen runt sin mitt.
=> Siffran ovanför pekaren visar vinkeln; med [[Shift]] nedtryckt flyttas den i steg om 15°.
=> Medan du vrider visas en ring: med pekaren innanför den fäster vridningen i steg om 22,5°, utanför går den i hela grader oavsett rutnätet.
[[R]] vrider en hel sluten kontur 45° vid varje tryck.
:::

::: Listen ovanför skissen
{{ui:sketch.keepProportions}} behåller proportionerna utan [[Shift]]: hörnen och sidorna sträcker då båda hållen lika mycket, och en inskriven bredd eller höjd ändrar även den andra.
=> layerling kommer ihåg omkopplaren.
Fälten X och Y visar var markeringens mitt ligger, i mm från skissens origo. Skriv in ett värde för att flytta den dit, exempelvis ett hål exakt 12 mm från mitten. Y räknas uppåt, som i 3D-redigeraren.
När två eller flera konturer är markerade riktar listen upp dem: vänster, centrerad eller höger samt topp, centrerad eller botten, mot ramen runt alla tillsammans.
=> Varje kontur flyttas som en helhet och behåller sin form; centrerade åt båda hållen blir två cirklar till en ring.
:::

::: Låsa en kontur | [[Ctrl]]+[[L]]
Klicka på {{ui:sketch.lockOutline}} i listen för att låsa den markerade konturen, som en låst kropp i 3D-redigeraren.
=> Den kan inte längre flyttas, ändras i storlek, vridas eller ändras. Dess linjer blir blekare, dess punkter grå och ramens handtag blir grå och svarar inte längre.
=> Linjer kan fortfarande börja i dess hörn.
=> När konturer riktas in stannar en låst kontur där den är och de andra rättar sig efter den.
För att frigöra den klickar du på hänglåset i dess hörn medan den är markerad, eller klickar på {{ui:sketch.unlockOutline}}.
:::

::: icon=refine {{ui:sketch.refine}} | [[4]]
Klicka på en sträcka för att lägga till en punkt.
Klicka på en punkt för att ta bort den.
=> layerling binder samman dess två grannar, så att konturen förblir sluten.
:::

::: icon=erase {{ui:sketch.erase}}
Klicka på en punkt eller en linje för att ta bort den.
Dra en ram över flera för att ta bort allt inuti den.
När något är markerat raderar knappen markeringen.
För att bara ta bort en del av en cirkel, exempelvis för ett rundat hörn, klickar du exakt på den biten av bågen mellan två punkter.
=> Resten blir kvar.
:::

::: Sluta ett mellanrum
Dra den ena öppna änden till den andra, till exempel efter att ha raderat ena sidan av en sexhörning.
=> Den fäster där och de två blir till en enda punkt, så att konturen är sluten igen.
=> Vid en korsning, som där en linje skär en cirkel, förenas de sidor som fortsätter rakt fram: båge med båge, linje med linje, och cirkeln förblir rund.
:::

::: icon=image {{ui:sketch.addImage}}
Lägg en mallbild under skissen för att rita av den, se [En bild som mall](#en-bild-som-mall).
:::

### Urklipp och historik

::: Kopiera, klistra in, duplicera, ta bort
{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} och {{ui:editor.tool.delete}} fungerar på markerade punkter, linjer och bilder, precis som i 3D-redigeraren; [[Ctrl]]+[[X]] klipper ut.
=> Inklistrad och duplicerad geometri hamnar bredvid originalet med 10 mm mellanrum, på en fri plats där den inte nuddar någon befintlig linje, så att den aldrig kopplas ihop med det som redan finns där.
=> Den förblir markerad, så att du kan dra den direkt på plats.
{{ui:sketch.undo}} och {{ui:sketch.redo}} tar ett steg bakåt respektive framåt igen.
:::

### Anteckningar

::: {{ui:editor.tool.note}} | [[N]]
Klicka på {{ui:editor.tool.note}} under {{ui:sketch.viewControls}} och klicka sedan där anteckningen ska sitta: var som helst, även på en linje.
Dra i nålen för att flytta den; ett klick på nålen fäller ihop kortet.
=> Anteckningarna i en skiss hör till dess kropp: i 3D-vyn sitter de ovanpå en extruderad eller svept kropp och på den ritade profilen av en roterad kropp, och de följer med den.
=> Öppnar du skissen igen visas alla kroppens anteckningar, även de som placerats i 3D.
{{ui:sketch.undo}} tar tillbaka en anteckning precis som en linje, och {{ui:sketch.cancel}} kasserar det som ändrats i anteckningarna.
> Mer i kapitlet [Mäta och anteckningar](chapter:measuring-and-notes).
:::

### Vy och mått

::: Flytta vyn
Panorera med mittenknappen på musen, eller med [[Shift]] eller [[Ctrl]] plus höger musknapp, precis som i 3D-redigeraren.
När inget är markerat flyttar även [[Ctrl]] tillsammans med piltangenterna vyn: en tiondel av vyn per tryck, hälften med [[Shift]] också; skissen flyttar sig åt det håll pilarna pekar.
[[Home]] anpassar hela skissen till vyn, [[F]] zoomar till markeringen (när inget är markerat, till hela skissen), och [[+]] och [[−]] zoomar in och ut, som i 3D-redigeraren.
När inget är markerat dubbelklickar du på en tom plats för att skjuta den till mitten av vyn.
> {{ui:workspace.doubleClickCentersView}} i inställningarna stänger av dubbelklicket.
:::

::: Mått
Klicka på en linje eller en punkt.
=> Skissen visar linjens längd, eller för en punkt längderna på de linjer som möts där.
{{ui:sketch.showMeasurements}} i skissverktygsfältet döljer och visar de här måtten när de är i vägen, till exempel medan du formar kurvor.
{{ui:camera.tapeTools}} i skissverktygsfältet mäter avståndet mellan två punkter; det fortsätter fungera även när måtten är dolda.
:::

![En L-formad kontur. Vid det markerade hörnet uppe till vänster visas längderna på de två linjerna i millimeter och vinkeln mellan dem i grader.](shot:sketch-outline)

::: Skriva in en längd
Klicka på måttfältet på en rak linje och skriv in längden i millimeter.
[[Enter]] verkställer, [[Esc]] avbryter.
=> Linjen behåller sin riktning, dess startpunkt ligger kvar där den är och linjerna i den andra änden följer med. Om en ändpunkt är markerad flyttas den punkten.
[[Alt]]+[[Enter]] förlänger i stället linjen åt båda hållen runt sin mitt.
=> På kurvor visar måttfältet bara längden.
:::

## Linjer med siffror

När du har satt ut den första punkten med {{ui:sketch.line}} eller {{ui:sketch.smooth}} skriver du bara en siffra: då öppnas två fält bredvid linjen, {{ui:sketch.typedLength}} i millimeter och {{ui:sketch.typedAngle}} i grader. [[<]] eller [[Tab]] hoppar till vinkeln, så ”50<30” ger en linje som är 50 mm lång i 30°, precis som i AutoCAD. [[Enter]] sätter punkten och du kan direkt skriva in nästa linje; [[Esc]] stänger fälten utan att avsluta linjekedjan.

Vinkeln räknas moturs från höger: 0° åt höger, 90° uppåt, 180° åt vänster, 270° nedåt. Lämnar du den tom följer linjen pekaren, så du anger bara längden och visar riktningen med musen. Summor som ”40+12,5” fungerar i båda fälten. Om punkten skulle hamna utanför plattan säger fältet till och väntar på ett nytt värde.

## Böja en rak sida

Markera en rak linje och klicka på {{ui:sketch.curveLine}} i listen som dyker upp: sidan böjer sig ut till en kurva, som i Tinkercad, och visar sina två handtag. Dra i dem för att forma kurvan; ju längre ut ett handtag står, desto starkare blir böjningen. Under pekaren blir ett handtag orange, och det fångar också ett klick strax bredvid så att en mallbild under inte flyttas av misstag. {{ui:sketch.straightenLine}} gör sidan rak igen. En punkt som du markerar kan göras rund med {{ui:sketch.smooth}}: den får egna handtag och linjerna intill blir kurvor. Med tre eller fler punkter markerade lägger {{ui:sketch.curveThroughPoints}} i listen en jämn kurva från den första punkten till den sista, genom varje punkt däremellan, på samma sätt som verktyget {{ui:sketch.smooth}} ritar en; linjerna utanför de två ändarna förblir som de är. I andra program kallas detta ”Fit curve” eller ”Fit point spline”. De två skiljer sig åt: {{ui:sketch.curveLine}} böjer varje markerad sida för sig och behåller hörnen mellan dem, för en båge på en sida; {{ui:sketch.curveThroughPoints}} drar en enda kurva genom punkterna utan några hörn kvar, för att jämna ut en taggig avritad kant. Klicka på ett handtag så tänds det: piltangenterna flyttar det sedan ett rutnätssteg i taget, med [[Shift]] ett större steg, så att du kan ställa in en kurva exakt.

Värden kan skrivas in också. En markerad punkt visar {{ui:sketch.selectionX}} och {{ui:sketch.selectionY}} i listen: var den ligger, i mm från skissens origo, med Y räknat uppåt. Klicka på ett handtag så visar listen i stället {{ui:sketch.handleX}} och {{ui:sketch.handleY}}: var handtaget ligger i förhållande till sin egen punkt. På en mjuk punkt vrider det motsatta handtaget med. Ge motsvarande handtag på andra sidan samma Y och X med omvänt tecken så blir kurvan exakt speglad; {{ui:sketch.mirror}} speglar en hel halva på en gång.

![Undersidan av den L-formade konturen böjd till en kurva, med sina två handtag i ändarna.](shot:sketch-curve)

## Läsa av och ange vinklar

Klicka på en hörnpunkt där **två raka linjer** möts: bredvid längderna visar layerling **vinkeln** mellan dem i grader, med en liten båge. På en sluten kontur är det vinkeln inne i formen, så en inbuktning ger ett värde över 180°. Klicka på värdet och skriv in en ny vinkel. En av de två linjerna vrids då runt hörnet och behåller sin längd, medan den andra ligger kvar där den är. Linjen som vrids ritas streckad; [[Tab]] växlar till den andra, [[Enter]] verkställer och [[Esc]] avbryter. Det som hänger i den bortre änden av den vridna linjen följer med.

En låst punkt ligger kvar där den är, och ett inskrivet värde rättar sig efter den: en längd flyttar linjens fria ände, och en vinkel vrider den linje vars bortre ände är fri. Även en enskild punkt kan låsas: markera den och tryck [[Ctrl]]+[[L]]. På så sätt kan du bygga en exakt kontur hörn för hörn: lås ett hörn, skriv in längden och vinkeln på nästa linje, lås dess ände och fortsätt.

Att flytta en punkt ändrar tre vinklar: vid själva punkten och vid de två grannhörnen i de bortre ändarna av dess linjer. Därför visar layerling även de två, och var och en går att klicka på och skriva in. Så kan du exempelvis ställa in det nedre vänstra hörnet till 75,5° medan den övre vänstra punkten, som flyttas för att uppnå det, är markerad. Du kan räkna här också, till exempel ”90-14,5”.

Ett hörn visar ingen vinkel där en kurva möter det, eller där fler än två linjer möts. Knappen {{ui:sketch.showMeasurements}} i skissverktygsfältet döljer vinkeln tillsammans med längderna.

## Avrunda eller fasa hörn

Klicka på en hörnpunkt och välj {{ui:sketch.filletCorner}} eller {{ui:sketch.chamferCorner}}. Ett litet fält dyker upp för {{ui:sketch.filletRadius}} eller {{ui:sketch.chamferDistance}}. Skriv in storleken och bekräfta med bocken. Det här fungerar för hörn mellan två raka linjer.

Flera hörn på en gång fungerar också: markera dem med [[Shift]] och ett klick på varje, eller dra en ram runt dem, och välj {{ui:sketch.filletCorner}} eller {{ui:sketch.chamferCorner}} i listen som visas. Alla får samma radie eller avstånd. Där två markerade hörn delar en sida tar vardera högst 45 % av den, så en rektangel som rundas av runt om blir likadan i alla hörn. Punkter som inte är ett hörn mellan två raka linjer hoppas över, och meddelandet anger hur många. En ram runt en hel form, eller ett klick inuti den, markerar både dess hörn och dess linjer, och listen erbjuder då {{ui:sketch.curveLine}} och {{ui:sketch.straightenLine}} för alla markerade linjer bredvid hörnverktygen.

![Hörnet uppe till vänster är avrundat med 12 mm radie.](shot:sketch-fillet)

## Spegla

Markera punkter och linjer (klicka, [[Shift]] och klicka, eller dra en ram runt dem) och klicka på {{ui:sketch.mirror}} i listen. Välj sedan axel: {{ui:sketch.mirrorLeftRight}} speglar över den lodräta axeln genom plattans mitt, {{ui:sketch.mirrorTopBottom}} över den vågräta och {{ui:sketch.mirrorAcrossLine}} över en rak linje i skissen som du klickar på härnäst. Kopian läggs till på andra sidan och originalet ligger kvar; inget är länkat, så du kan ändra vardera för sig. Punkter som ligger på axeln delas, så en halv kontur vars ändar sitter på axeln blir en enda sluten kontur: rita halvan av ett fäste, markera den, spegla den och gör kroppen. En konstruktionslinje är en bra axel. [[Esc]] avbryter.

## Konstruktionslinjer

En konstruktionslinje hjälper dig att placera punkter utan att bli en del av kroppen. Den ritas streckad och räknas aldrig som kontur: du kan dra ut den så långt utanför formen du vill utan att kroppen växer.

- Slå på {{ui:sketch.construction}} i gruppen {{ui:sketch.group.draw}}. Nya linjer, även de som skrivs in med mått, blir då konstruktionslinjer. Knappen växlar tillbaka till vanliga linjer.
- En linje du redan ritat blir en konstruktionslinje när du klickar på den och väljer {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} gör den till en vanlig linje igen.
- Nya punkter fäster där en konstruktionslinje korsar en annan linje – en blå ring visar det – och mot konstruktionslinjens ändpunkter. Så sätter du ett hörn på en mittpunkt, på ett bestämt avstånd från en kant eller i en korsning, utan att räkna.
- Nya punkter fäster även mot mitten av varje rak linje i skissen, mot centrum av varje cirkel och avrundat hörn samt mot sidornas mittpunkter på en kropp som skymtar under (#624). En punkt som dras bortser från mitten av sina egna linjer.
- En markering som du drar fäster med sin mitt (#1236): centrum på en cirkel eller mitten på en rektangel hamnar på ändpunkter, hörn och mittpunkter hos övriga linjer, på cirklars centrum, där konstruktionslinjer korsas och på hörnen hos en kropp undertill; en blå ring visar var. En form som dras in från {{ui:sketch.addShape}} hamnar också med sin mitt på dessa punkter. Håll ned [[Alt]] för att bara följa rutnätet.
- {{ui:sketch.fromMiddle}} i gruppen {{ui:sketch.group.draw}} ritar en linje från dess mitt: klicka i mitten först och sedan i ändpunkten, så löper linjen lika långt åt andra hållet. Mitten blir en egen punkt. Klicka på knappen igen för att rita vanliga linjer.
- En konstruktionslinje skär inte sönder konturen där den korsar den. Vid rotation får den även ligga till höger om axeln.

## Göra en kropp av skissen

Klicka på {{ui:sketch.finishSketch}}. Konturen står nu som en kropp på arbetsytan. I dess inställningar ändrar du höjd, färg och allt annat precis som på vilken annan form som helst. När du ändrar storlek på den bygger layerling upp den på nytt från skissen ett ögonblick senare, och skissen ändras med den. Den förblir alltså en exakt kropp som tar fasning och avrundning, och nästa gång du redigerar den har skissen samma storlek som kroppen har.

Ligger arbetsytan på sidan av en kropp ritar du så som du tittar mot den sidan: uppåt i skissen är uppåt på den färdiga kroppen också. Den svaga konturen av kroppen i skissvyn visar var den står. Skär arbetsytan genom en kropp visar skissvyn i stället konturen av det snittet, så en ihålig kropp syns som en ring och du kan passa in skissen mot dess väggar. En punkt som du sätter eller drar nära ett hörn på dessa konturer fäster exakt på det; en liten blå ring visar det. På så vis hämtar du kanter från andra kroppar in i skissen, även när arbetsytan inte ligger exakt på dem. För att rita längs befintliga delar slår du på {{ui:sketch.showPartEdges}} (lagerknappen bland vyknapparna till vänster): alla kanter på kropparna ritas då på skissplanet, tunna och svaga, som om du tittade rakt igenom dem oavsett vilken höjd de ligger på. Ett plan som står upprätt, exempelvis lagt på en framsida, visar framsidan på det här sättet. Valet sparas i webbläsaren.

![Konturen har blivit en kropp. Hörnet är avrundat.](shot:sketch-result)

Med {{ui:inspector.editSketch}} kan du när som helst gå tillbaka till skissen och ändra den. Ett dubbelklick på kroppen gör samma sak, precis som i Tinkercad (en låst kropp förblir stängd); {{ui:workspace.doubleClickOpensSketch}} i inställningarna stänger av detta. Kantbearbetningar som du redan gjort på kroppen går dock förlorade, eftersom kanterna skapas på nytt. En kropp som du vridit eller flyttat i 3D-redigeraren öppnas där den står på plattan, vriden som du ser den där och på plattans rutnät; bara en lutad eller speglad kropp öppnas i sin egen ram.

En skiss med flera konturer blir en enda kropp, och konturer som överlappar smälter samman i den. Vill du ha varje kontur för sig markerar du kroppen och klickar på {{ui:inspector.separateParts}}: varje yttre kontur blir då en egen kropp med de hål som ligger i den, och behåller kroppens höjd, färg och plats. Varje del får sin egen skiss att redigera, inklusive konstruktionslinjerna, så att du kan höja eller sänka delarna en i taget och sedan sätta ihop eller skära dem. Kantbearbetningar hindrar detta, liksom en kropp som sträckts ut efteråt: då delas den i stället upp som ett nät.

**En annan sorts kropp från samma skiss:** märket överst i skissen visar vad den blir, {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} eller {{ui:sketch.modeBadgeSweep}}. Klicka på det och välj ett annat, även medan du redigerar en befintlig kropp: en importerad SVG som kommer in extruderad blir till en vas eller en knopp när du byter den till {{ui:sketch.modeBadgeRevolve}}. En kontur som når över axeln flyttas åt vänster tills dess högra kant ligger på axeln, så att den halva tvärsnittsprofilen från en SVG roterar runt sin raka sida; [[Ctrl]]+[[Z]] tar tillbaka flytten. När du slutför tar den nya kroppen den gamlas plats, namn och färg, med foten på samma höjd. Kantbearbetningar försvinner, som vid varje redigering av en skiss.

### Rotera

När du roterar ritar du halva tvärsnittet **till vänster om axeln** som visas i skissen. Bredvid ser du en 3D-förhandsgranskning av rotationen. Den visar direkt hur kroppen kommer att se ut. Du kan vrida, flytta och zooma den med musen; den lilla knappen i övre högra hörnet, eller ett dubbelklick på den, återställer startvyn. Konturen måste vara sluten, eller så bygger du en öppen linje som en linje (se Bygga som en linje nedan). Klicka till sist på {{ui:sketch.finishRevolve}}. Designens övriga kroppar visas framifrån, i samma vy som profilen, med axeln i mitten: rita profilen bredvid dem eller ovanför dem. Kroppen står där du ritade den, och den vågräta linjen genom skissens mitt är golvet: en profil ritad ovanför den ger en kropp som står högre, och dess lägsta punkt är kroppens fot. För större radie flyttar du profilen längre bort från axeln, även förbi kanten på plattan om det behövs: plattan växer med skissen, dess rutnät följer med när du släpper och minusknappen zoomar ut tills allt får plats.

En roterad kropp är en exakt kropp, precis som en extruderad: den tar fasning och avrundning, och du kan gröpa ur den för en kopp eller en vas. En kropp som roterats i en äldre version av layerling är ett nät; öppna {{ui:inspector.editSketch}} och slutför den igen för att göra den exakt. En profil som når över axeln kan inte byggas exakt och blir ett nät, som tidigare.

**Jämnare runda ytor: {{ui:prop.revolveSmoothness}}.** En exakt roterad kropp delas upp i små plana fasetter för visning, export och utskrift, och på en stor kruka kan de synas på utskriften. Markera kroppen och ställ in {{ui:prop.revolveSmoothness}} i egenskapspanelen på {{ui:prop.revolveSmoothnessFine}} eller {{ui:prop.revolveSmoothnessExtraFine}}: de runda ytorna delas finare, på bekostnad av fler trianglar och en långsammare design. En spiral eller en nätrotation har {{ui:prop.sides}} för detta i stället.

**En enda sammanhängande sträng: {{ui:prop.pitch}}.** En rotation gör konturen till slutna ringar. Markera den roterade kroppen och ge den ett {{ui:prop.pitch}} över 0 i egenskapspanelen – sträckan den stiger per varv – så lindas konturen upp som en spiral i stället: en enda sammanhängande sträng, som filament på en spole eller en fjäder. {{ui:prop.sweep}} blir då {{ui:prop.turns}}, upp till 200; ett negativt tal ger en vänsterlindad spiral. Varv som ligger tätare än konturens höjd smälter samman till en enda kropp, så en massiv kärna med fin stigning fungerar också. En spiral byggs som ett nät, så avrundning, fasning och urgröpning fungerar inte på den; håll {{ui:prop.sides}} lågt vid många varv. En stigning på 0 ger ringar igen.

## Svepa längs en bana

{{ui:sketch.sweep}} drar en kontur längs en bana: en kabelkanal som svänger runt ett hörn, ett rör, ett skydd runt en rem eller en ring runt en sexhörning. Den sitter bredvid {{ui:sketch.extrude}} och {{ui:sketch.revolve}} i gruppen {{ui:sketch.group.create}}.

Du ritar två saker på samma ark:

- **Tvärsnittet** som en sluten kontur, som vanligt. Rita det så som du skulle se det om du tittade längs banan från dess start: tvärs över banan är skissens vänster och höger, uppåt är uppåt på den färdiga kroppen. Ett ihåligt tvärsnitt – en kanal eller ett rör – är en kontur med en annan inuti. Som standard centreras tvärsnittet på banan. Menyn bredvid lägesmärket längst upp låter dig i stället lägga dess vänstra eller högra kant på banan ({{ui:sketch.sweepAnchorLeft}}, {{ui:sketch.sweepAnchorRight}}, sett när du tittar längs banan), så att en skena kan sitta på ena sidan av linjen eller följa kanten på en del. Kroppen står på skissplanet med tvärsnittets lägsta punkt.

- **Banan** som en {{ui:sketch.construction}}: slå på den och rita linjer eller kurvor i en enda kedja, öppen eller sluten (en sluten kedja ger en ring). Banan ligger plant i skissplanet.

Rita tvärsnittet nära den ände av banan där det ska börja; banan startar i den ände som ligger närmast det. Klicka sedan på {{ui:sketch.finishSweep}}. Ett hörn av raka stycken blir geringsskarvat, en kurva förblir jämn och tvärsnittet håller sig upprätt hela vägen. Kroppen är exakt, precis som en extruderad: avrundning, fasning och STEP-export fungerar på den. Saknas en sluten kontur eller en bana, eller finns det flera åtskilda banor, säger layerling ifrån. Med {{ui:inspector.editSketch}} kan du gå tillbaka till skissen och ändra tvärsnittet eller banan.

## Bygga som en linje

Normalt blir ytan inuti en sluten kontur själva kroppen. Med {{ui:sketch.stroke}} i delen {{ui:sketch.group.finish}} bygger du i stället själva linjen, med en bredd som du anger. Bocka för {{ui:sketch.strokeOn}} i linjefönstret; skissen visar direkt hur det blir.

- En **sluten kontur** blir en ram. {{ui:sketch.strokeAlign}} styr var väggen hamnar: {{ui:sketch.strokeAlign.center}} på den ritade linjen, {{ui:sketch.strokeAlign.inside}} innanför den eller {{ui:sketch.strokeAlign.outside}} utanför den. Utanför är praktiskt för ett spelrum: rita konturen av ett hål, till exempel en laxstjärt, och ge den 0,2 mm linjebredd utanför för att få mellanrummet som utskriften kräver.
- En **öppen linje** blir en remsa, centrerad på linjen. {{ui:sketch.strokeCap}} anger hur dess ändar ser ut: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (längre med halva bredden) eller {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} gäller för båda: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} eller {{ui:sketch.strokeJoin.bevel}}.

Skissen behåller den ritade linjen. Öppna den igen så fortsätter du ändra både linje och linjebredd; avmarkera rutan så byggs ytan igen. Kurvor delas upp i korta raka stycken för det.

I en rotationsskiss blir linjen en tunn vägg: rita väggen till en vas eller en kopp som **en öppen linje** till vänster om axeln, bocka för {{ui:sketch.stroke}} och ställ in bredden, så roterar verktyget det bandet. Det som når förbi axeln skärs av vid den.

## Fyllning och silhuett

Du kan ställa in linjen även utan att öppna skissen: i egenskaperna för en skisskropp väljer du {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} eller {{ui:prop.sketchFill.center}} under {{ui:prop.sketchFill}}, tillsammans med {{ui:prop.sketchLineWidth}} och {{ui:sketch.strokeJoin}}. Kroppen byggs om på nytt direkt där den står. Det här motsvarar fyllningslägena i Tinkercads SVG-import: standard, yttre linje och inre linje. {{ui:prop.sketchFill.grow}} behåller ytan fylld och låter den växa med linjebredden runt om, med skarpa, runda eller avfasade hörn: ett baslager under en logotyp för en flerfärgsutskrift, där en linje utanför ensam bara skulle ge en ring. {{ui:prop.sketchFill.shrink}} gör tvärtom: ytan förblir fylld och dess kant flyttas inåt med linjebredden runt om, inklusive hål (som växer). Använd båda på kopior av samma skiss för en passning: hålet i sin ritade storlek, delen som går igenom det med {{ui:prop.sketchFill.shrink}} på 0,5 mm, eller en vägg inuti en form skuren från samma kontur. En bredd större än konturen tillåter lämnar ingenting kvar. I skissens linjefönster finns samma två val under {{ui:sketch.strokeAlign}}. Med en linje utanför, innanför eller centrerad gör {{ui:prop.sketchCuttingEdge}} väggen vass upptill: ovansidan smalnar av till den bredden med 45° fasning på båda sidor, som på en pepparkaksform. 0 lämnar toppen platt; eggen bevaras när du ändrar linjebredden.

{{ui:prop.sketchSilhouette}} utelämnar varje kontur som ligger inuti en annan: hål och allt som ligger i dem. Bara den yttersta konturen blir kvar. Tillsammans med {{ui:prop.sketchFill.outside}} ger det en pepparkaksform: importera en SVG två gånger, en gång med silhuetten som yta för bottenplattan och en gång med silhuetten och 1 till 2 mm linje utanför som vägg. Omkopplaren finns även i fönstret för {{ui:sketch.stroke}} i skissläget.

Avrundningar och fasningar på kanterna försvinner när kroppen byggs om, precis som när skissen redigeras. {{ui:inspector.taper}} och {{ui:inspector.twist}} behålls; en avsmalning växer eller krymper med konturen.

## Lutande väggar, för stämplar

En extruderad skiss har lodräta väggar. En stämpel, en präglingsdyna eller en stans behöver lutande väggar, utvändigt och invändigt, med samma väggtjocklek hela vägen. layerling har ingen släppningsvinkel för extrudering, men för enkla konturer tar {{ui:inspector.taper}} dig dit. Ett sätt som fungerar:

1. Rita konturen med det hål som behövs och gör en kropp av den. Duplicera kroppen ([[Ctrl]]+[[D]]).
2. På den första kroppen slår du på {{ui:prop.sketchSilhouette}} så att hålet fylls igen, och ger den bredare botten än topp med {{ui:inspector.taper}}.
3. På kopian öppnar du skissen igen och tar bort den yttre konturen så att bara hålets kontur blir kvar. Slutför skissen, växla kroppen till {{ui:inspector.hole}} och ge den smalare botten än topp med {{ui:inspector.taper}}.
4. Flytta in hålet i den första kroppen, där hålet låg, och gruppera de två.

Väggarna lutar nu både på utsidan och insidan. Avsmalning skalar hela konturen, så detta är exakt för enkla former där du kan välja måtten så att väggarna löper parallellt, och bara en uppskattning för fina detaljer som bokstäver.

## En bild som mall

Med {{ui:sketch.addImage}} lägger du ett foto eller en ritning under skissen och ritar av den, när som helst, även före den första linjen. Du kan ställa in storlek, opacitet och position. När bilden sitter rätt låser du den med [[Ctrl]]+[[L]] så att du inte flyttar den av misstag medan du ritar. En låst bild är ur vägen: klick går rakt igenom den, så du kan markera linjer och punkter ovanpå den och dra en ram över dem. Hänglåset i dess hörn låser upp den med ett klick; [[Alt]]+klick markerar den utan att låsa upp den. Om bildinställningarna vid högra kanten skymmer bilden drar du bort dem i rubrikraden; ett dubbelklick på den dockar dem igen.

Under {{ui:sketch.imageAlign}} riktar du upp ett foto som inte tagits rakt:

- **{{ui:sketch.imageRotation}}:** Vrid bilden runt sin mitt, med de böjda pilarna utanför hörnen eller som ett tal i grader. Med [[Shift]] fäster pilarna i steg om 15°. Innanför ringen som visas när du vrider fäster de i steg om 22,5°, utanför i hela grader.
- **{{ui:sketch.centreImageX}}** och **{{ui:sketch.centreImageY}}:** lägger bildens mitt på X = 0 eller Y = 0. Vid rotation är X = 0 axeln, så då ligger bilden symmetriskt runt den.
- **{{ui:sketch.calibrateImage}}:** Knappen sitter överst, strax under förhandsgranskningen. Klicka på två punkter i bilden vars avstånd du känner till – ändarna på en linjal eller en känd diameter – och skriv in det verkliga avståndet. Bilden skalas likformigt så att det avståndet stämmer; den första punkten ligger kvar där den var.
- **{{ui:sketch.cropImage}}:** Handtagen på ramen beskär nu bilden i stället för att skala den; det som skärs bort ligger kvar sparat och kommer tillbaka med {{ui:sketch.uncropImage}} eller när ett handtag dras ut igen.

Alla fyra påverkar bara mallen, aldrig skissen.

**{{ui:sketch.traceImage}}**, i bildens inställningar, sätter ut punkterna åt dig: det spårar konturen av formen i bilden – en silhuett, en logotyp, ett ord – och visar den i rött ovanpå bilden, med fyrkantiga punkter för hörn och runda för mjuka punkter. {{ui:sketch.traceDark}} eller {{ui:sketch.traceLight}} väljer vilken del av bilden som är formen, {{ui:sketch.traceThreshold}} var mörkt övergår i ljust, {{ui:sketch.tracePoints}} hur många punkter konturerna får tillsammans (färre ger mjukare kurvor, fler följer bilden noggrannare), {{ui:sketch.traceCorners}} från vilken sväng en punkt blir ett hörn, {{ui:sketch.traceSpeck}} hur liten en prick måste vara för att hoppas över, och {{ui:sketch.traceHoles}} behåller mitten av ett A eller ett O. {{ui:sketch.traceApply}} lägger in konturerna i skissen exakt där bilden ligger, i dess storlek, vridning och beskärning, och markerar dem: de är vanliga punkter att flytta, böja eller ta bort, och [[Ctrl]]+[[Z]] tar tillbaka allt i ett steg. Det fungerar bäst med tydlig kontrast; frilägg först ett foto med en rörig bakgrund. Det som faller bort – runt konturerna, i hålen och det som skärs bort – täcks i förhandsgranskningen med plattans färg, så bara det som blir kvar av bilden syns. Konturer som ligger så tätt att glesa kurvor skulle korsa varandra får automatiskt fler punkter; kortet säger till om det. För en kant utanför eller innanför konturen ger du skisskroppen en linjebredd utanför eller innanför dess linjer, eller förskjuter den färdiga kroppen.

För ett foto – exempelvis en leksak på ett vitt bord – väljer du **{{ui:sketch.traceObject}}** under {{ui:sketch.tracePart}}: bakgrunden är färgen vid bildens kant, och allt som skiljer sig från den blir en kontur, oavsett dess färger; {{ui:sketch.traceThreshold}} styr då hur tydligt det måste skilja sig. En färgglad bild mot en jämn bakgrund börjar på det sättet. {{ui:sketch.tracePickAreas}} spårar fler konturer: klicka på ett område i bilden, ett fönster till exempel, så spåras det jämnfärgade fältet runt stället ({{ui:sketch.traceAreaTolerance}} styr hur likfärgat det måste vara). Hål och klickade områden listas under {{ui:sketch.traceList}}; pekar du på en rad visas den i förhandsgranskningen, ✕ tar bort den, och med {{ui:sketch.traceCut}} avslaget ritas den som en konstruktionslinje i stället för ett hål. Ett område som når bildens kant är bakgrunden och tas inte med. Det som inget tröskelvärde och ingen färg kan skilja åt – en skugga lika mörk som hjulen ovanför den – tar {{ui:sketch.traceTrim}} bort: klicka ut hörn runt det (ett klick på det första hörnet, ett dubbelklick eller [[Enter]] stänger det), så följer konturen snittet; i listan står det som ”Snitt 1”.

Trädet bredvid ett hus, en figur framför en rörig bakgrund – där ingen färg skiljer formen från resten fångar **{{ui:sketch.traceLasso}}** den: klicka ungefär längs dess kant, och mellan två klick följer linjen kanten av sig själv, även runt svängar; medan du rör pekaren visar förhandsgranskningen redan var den kommer att gå. Ett klick på den första punkten, ett dubbelklick eller [[Enter]] stänger den, [[Esc]] kastar bort den. Den listas som ”Lasso 1”, med valet {{ui:sketch.traceRegionAdd}} (området tas med i formen) eller {{ui:sketch.traceTrim}} (det skärs bort); varje snitt har samma val. Under {{ui:sketch.tracePart}} skapar **{{ui:sketch.traceLassoOnly}}** formen enbart av det du fångar på det här sättet – inget annat ur bilden.

![Ett ritat hus spårat som objekt, med sänkt tröskelvärde för dess ljusa vägg: det magnetiska lassot har skurit bort trädet, och de åtta fönsterrutorna har valts som hål.](shot:trace-house)

![Huset som kropp: utan trädet och med fönstren utskurna rakt igenom.](shot:trace-house-body)

## Tangenter i skissläget

| Tangent | Verkan |
| --- | --- |
| [[Esc]] | lägg ifrån dig anteckningsverktyget; annars lägg ifrån dig verktyget (tillbaka till {{ui:sketch.select}}), rensa sedan markeringen |
| [[Delete]] | ta bort det markerade elementet |
| [[Ctrl]]+[[C]] | kopiera markeringen |
| [[Ctrl]]+[[X]] | klipp ut markeringen |
| [[Ctrl]]+[[V]] | klistra in |
| [[Ctrl]]+[[D]] | duplicera markeringen |
| [[Ctrl]]+[[Z]] | ångra |
| [[Ctrl]]+[[A]] | markera alla punkter och linjer |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | medan du ritar: fäst linjen i steg om 15°; medan du drar: håll flytten längs en axel |
| [[Alt]] | när du sätter eller drar en punkt: bara på rutnätet, utan att fästa mot hörn och mittpunkter |
| siffra, [[<]], [[Tab]], [[Enter]] | medan du ritar: skriv in och ange längd och vinkel för nästa linje |
| [[R]] | vrid den slutna skissen 45° |
| [[Ctrl]]+[[L]] | lås eller lås upp den markerade konturen eller mallbilden |
| [[N]] | placera en anteckning: nästa klick sätter den i skissen |
| [[Shift]]+[[N]] | visa eller dölj anteckningarna |

> **Tips:** Rita så få punkter som möjligt. En kontur med några välplacerade punkter ger en jämnare kropp än ett gytter av många.
