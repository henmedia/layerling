---
title: Mäta och anteckningar
summary: Måttband, linjal och vinkelhake, avstånd till origo, anteckningar som följer med en del och referenspunkter att fästa mot.
---

För att bygga en del exakt behöver du kunna mäta. layerling har flera verktyg för det. Inget av dem hamnar i någon export. Väggtjocklek och springor inuti en del mäter du bäst i [snittvyn](chapter:view-and-workplane) med {{ui:camera.sectionMeasure}}.

## Måttbandet

Måttbandet sitter längst ned i vyfältet längs vänsterkanten ({{ui:camera.tapeTools}}). Det mäter avstånd mellan hörn, kanter och ytor. Ett klick öppnar fem knappar. Om de täcker det du ska mäta kan du dra dem i greppet till vänster var som helst på arbetsytan; ett dubbelklick på greppet sätter tillbaka dem:

![Måttbandet med sina knappar: lägg till mätning, flytta mätpunkter, ta bort mätning, hela kanter, radera alla mätningar.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klicka på en punkt, dra till nästa och klicka på den. Avståndet märks ut, med de axlar det löper längs framför: X, Y eller Z för en rät linje, XY, XZ eller YZ i ett plan, eller 3D för alla tre. Peka på måttetiketten för att se hur långt sträckan går längs varje axel, eller på en punkt för att se dess koordinater. Medan du sätter ut den andra punkten visas axlar, avstånd och räckvidd längs varje axel bredvid pekaren. En mätning som till stor del ligger bakom en annan kropp tonas ned; håller du musen över dess linje eller etikett lyser den fram igen. På en motstående kant eller yta fäster den andra punkten i rät vinkel mot den första när pekaren kommer nära – eller var som helst på kanten eller ytan medan du håller ned [[Shift]]. Längs samma yta eller på arbetsytan håller [[Shift]] mätningen rak längs huvudaxeln. Förutom hörn och kanter fäster en punkt även mot mitten av den plana ytan under pekaren samt mot centrum av en rund kant, som kanten på ett hål eller en cylinder: ett litet kryss i en cirkel markerar det erbjudna centrumet, och när pekaren närmar sig knäpper punkten fast och en text anger vad den är centrum för ({{ui:camera.tapeCentreFace}}, {{ui:camera.tapeCentreHole}} eller {{ui:camera.tapeCentreCircle}}).
2. **{{ui:camera.moveMeasurement}}:** Ta tag i punkterna och flytta dem; siffran följer med.
3. **{{ui:camera.deleteMeasurement}}:** Klicka därefter på en mätning för att ta bort den. Medan **{{ui:camera.addMeasurement}}** är aktivt raderar ett klick på en mätpunkt eller mätlinje medan du håller [[Shift]] eller [[Ctrl]] ([[Cmd]] på Mac) den direkt utan att byta läge.
4. **{{ui:camera.tapeWholeEdges}}:** Ett klick på en kant mäter hela kanten. En rund kant anger sin diameter (Ø), till exempel kanten på ett hål eller en cylinder, och en cirkelbåge sin radie (R); peka på siffran för att se längden längs kanten. Med läget avslaget sätter ett klick i stället en punkt på kanten och den andra punkten kan placeras var som helst, så att du mäter diametern eller ett annat avstånd. [[Alt]] vänder läget för ett enda klick. På en cirkel knäpper punkten mittemot den första fast när pekaren närmar sig, och punkterna hamnar på den äkta cirkeln så att diametern blir exakt.
5. **{{ui:camera.deleteAllMeasurements}}:** Tar bort alla mätningar på en gång. Eftersom detta inte kan ångras frågar layerling först; finns inga mätningar gör knappen inget.
6. **{{ui:camera.tapeMarkMiddle}}:** Mitt på varje mätning sitter ett litet runt märke med undre halvan ifylld. Det sätter en [referenspunkt](#referenspunkter) mitt på mätningen: efter ett klick på en rund kant – som öppningen av ett hål – hamnar punkten i cirkelns centrum (även på ett importerat nät där inget annat märker ut hålets mitt), och vid en diameter eller annan rak mätning mitt på sträckan. En form som du drar fäster sedan med sitt centrum mot punkten. En punkt som redan finns där skapas inte dubbelt. Måttbandet fäster mot en referenspunkt på samma sätt som mot ett hörn, så att du kan mäta från centrum av en cirkel eller mitt på en linje: märk ut punkten och klicka sedan på den.
7. **{{ui:camera.tapeTypeLength}}:** När minst ena änden av en rak mätning sitter på en kropp går det att klicka på siffran. Skriv in en ny längd och tryck [[Enter]]: kroppen vid den andra punkten flyttas längs mätlinjen tills avståndet blir exakt det angivna, precis som med linjalen i Tinkercad. Om bara kroppen vid den första punkten är markerad flyttas den i stället. Mätpunkterna sitter kvar på kroppen så att mätningen följer med. Mät från ett hörn, en kant eller mitten av en yta eller ett hål för att placera delar med exakt avstånd: från mitten av ett hål till toppen på en cylinder flyttas cylindern centrum till centrum. En negativ längd flyttar den lika långt förbi den första punkten, till exempel 5 mm innanför kanten på en låda. En [referenspunkt](#referenspunkter) hör inte till någon kropp, så mellan två sådana flyttas ingenting. När mätningen löper längs två eller tre axlar har rutan också ett fält under längden för varje axel (ΔX, ΔY, ΔZ – räckvidden som syns när du pekar på siffran): skriv där i stället så flyttas kroppen enbart längs den axeln. [[Tab]] flyttar mellan rutorna och [[Esc]] stänger fältet utan att flytta något. Pekar du på siffran står det vilken kropp som kommer att flyttas, eller varför ingen kan flyttas: att den är låst, att båda punkterna ligger på samma kropp eller att ingen ligger på en kropp. Meddelandet efteråt anger vad som flyttades och hur långt; ett ångra-steg tar tillbaka det.

[[Esc]] avslutar mätläget.

## Linjalen

{{ui:shape.ruler}} hämtar du från formbiblioteket. Den är ett rent mätverktyg: den kommer aldrig med i någon export och kan varken grupperas eller skäras. För varje kropp som nuddar eller överlappar linjalen visar den måtten som flytande siffror direkt i vyn. Du kan ändra siffran på plats så följer kroppen efter. Ställ upp linjalen eller luta den så mäter den längs sin egen riktning: stående bredvid en kropp visar den kroppens höjd. Det flytande plustecknet skapar en kopia av den uppmätta formen; det visas när linjalen ligger plant. Den tryckta skalan visar millimeter längs ena långsidan med tiotal numrerade, och tum längs den andra med streck för varje sextondels tum och hela tum numrerade. Skalan för den enhet du arbetar i (omkopplaren längst ned till höger) löper längs överkanten; en linjal smalare än 15 mm visar bara den skalan.

## Vinkelhaken

Ibland mäter man bäst i rät vinkel. Klicka på {{ui:camera.cornerRulerTool}} i vyfältet och sedan på arbetsytan. En vinkelhake med två skänklar i rät vinkel och gradering som en snickarvinkel placeras där. Inte heller den har någon egen kropp. Klickar du nära ett hörn på en kropp knäpper dess hörn fast exakt där. Designen kommer ihåg var du ställde haken, även i en sparad `.lyl`-fil: när du öppnar designen igen ligger den på samma ställe, vriden åt samma håll och mäter från samma punkter tills du tar bort den. Om du använder den i nästan varje design kan du slå på {{ui:workspace.startWithCornerRuler}} under {{ui:workspace.measurement}} i inställningarna: då startar varje ny design med en vinkelhake i origo.

Vinkelhaken ligger på arbetsytan. Sitter arbetsytan på sidan av en kropp ligger vinkelhaken på den sidan också, se [Vy och arbetsyta](chapter:view-and-workplane). Så måttsätter du på en lodrät vägg: lägg arbetsytan på väggen, sätt vinkelhaken i övre vänstra hörnet och klicka på handtaget tills skänklarna pekar åt höger och nedåt.

- **Dra i handtaget** flyttar den.
- **Ett kort klick på handtaget** vrider den 90°.
- **×** bredvid tar bort den.
- **Dra i den lilla cirkeln i änden av en skänkel** gör den skänkeln längre eller kortare i hela millimeter. Den nedersta knappen under handtaget, {{ui:ruler.armsToPlate}}, gör båda skänklarna lika långa som byggplattan är bred och djup för skrivaren i inställningarna. Vinkelhaken sparar skänklarnas längd med designen, och en ny vinkelhake tar över samma längder.
- **{{ui:ruler.arms}}** (knappen med tre axlar strax ovanför) öppnar en omkopplare för varje skänkel, uppkallad efter den axel den löper längs. Utöver de två skänklarna i planet finns en tredje som står upp från hörnet, vinkelrätt mot arbetsytan: på plattan pekar den uppåt längs Z med egen gradering, för en cylinder eller annat du bygger på höjden. Den är avstängd från start: klicka på dess bokstav för att visa den och dra i den lilla cirkeln i toppen för att göra den längre eller kortare. Skänklarna i planet kan stängas av på samma sätt om de är i vägen; minst en skänkel förblir alltid synlig. De gröna siffrorna på en markerad kropp syns oavsett vilka skänklar som visas, och designen kommer ihåg vilka som är tända.
- **Den lilla knappen till vänster om handtaget** väljer vad som mäts från: kroppens utsida (ändpunkt, ikon med linjer) eller dess mitt (mittpunkt, hårkors). En likadan liten knapp sitter bredvid varje grön siffra och ställer in bara det måttet: för en stående cylinder mitten längs de två skänklarna och botten i höjdled, för en liggande mitten på tvären och ena änden på längden. När alla tre stämmer överens igen visar knappen vid handtaget det gemensamma läget.

Om kroppar står intill någon av skänklarna visar vinkelhaken deras mått automatiskt, markerade eller ej: kroppar inne i vinkelhaken, bredvid en skänkel eller tvärs över den. En kropp utanför, bakom hörnet eller på utsidan av en skänkel får inga mått. Detta gäller bara på grundplattan, inte på sidan av en kropp. Knappen med pilen under hakens handtag stänger av detta så att bara markerade kroppar visar mått; valet sparas med designen.

När du markerar en kropp visar vinkelhaken i grönt hur långt den står från hörnet längs båda skänklarna och på höjden. Klicka på en grön siffra för att skriva in ett avstånd, så flyttas kroppen exakt dit. När flera kroppar är markerade räknas de som en helhet: vinkelhaken mäter deras gemensamma ytterram, och ett inskrivet värde flyttar alla tillsammans utan att ändra deras inbördes läge.

Stödlinjerna för de gröna siffrorna löper längs golvet – planet där vinkelhaken ligger – fram till punkten under eller bredvid kroppen; höjden har en egen pil. Omkopplaren för varje siffra sitter i siffrans ram. Skänklarna och graderingen är linjer i rummet: en kropp framför dem döljer dem, precis som en riktig vinkelhake skulle skymmas. Det lilla ögat under handtaget styr detta: med ögat överstruket döljer kroppar vinkelhaken (förvalt); med ögat öppet syns haken alltid ovanpå allt. Siffrorna på skänklarna tonas ned där en kropp står framför dem.

Med mittpunktsläget räknas de gröna siffrorna till kroppens centrum, även i höjdled. På så sätt placerar du en sfär med centrum exakt 15 mm från en kant utan att räkna bort radien. På en vägg placerar du ett hål 40 mm från vänster och 190 mm från överkanten så här: markera hålet, byt till mittpunkt och skriv 40 och 190. Höjden räknas där utåt från väggen.

Både måttbandet och vinkelhaken ligger kvar på sina platser medan du skissar och återvänder till 3D-vyn. Ingen av dem sparas i historiken. Vinkelhaken sparas med designen, liksom måttbandets mätningar, både i webbläsaren och i `.lyl`-filen: de finns kvar när du öppnar designen på nytt. Ögonknappen bland måttbandets knappar döljer alla mätningar och visar dem igen; även det läget sparas, och lägger du till, flyttar eller raderar en mätning tänds de först igen.

## Gradskivan

Klicka på {{ui:camera.protractor}} i vyfältet för att mäta en vinkel. En rad knappar öppnas bredvid, och tills du klickar på knappen igen eller trycker [[Esc]] mäter varje klick i vyn med gradskivan. Precis som måttbandet fäster den mot hörn och kanter på kroppar; utanför kropparna sätter den en punkt på plattan.

- {{ui:camera.protractorPoints}}: klicka först på vinkelns hörn, sedan en punkt på vardera skänkeln. Redan medan du sätter ut den sista punkten visas vinkeln; efter tredje klicket stannar den kvar med en cirkelbåge mellan benen. Den visar vinkeln i hörnet från 0° till 180°. Sedd rakt ovanifrån, rakt framifrån eller rakt från sidan mäter den vinkeln så som den ser ut i den vyn: ett övre hörn och det nedre hörnet rakt under ligger på samma punkt. I en lutad vy mäts vinkeln i 3D-rymden.
- {{ui:camera.protractorFaces}}: klicka på två plana ytor. En kort blå linje på vardera visar åt vilket håll ytan vetter, och etiketten ger båda vinklarna mellan ytorna med den minsta först: en 45° fas mot ovansidan ger 45° · 135°, två sidor av en kub bara 90°. En krökt yta saknar entydig riktning, så gradskivan ber om en plan yta.

Nästa klick efter en färdig vinkel startar en ny, och {{ui:camera.protractorClear}} tar bort den. Vinkeln följer med kropparna när de flyttas eller vrids. Inget av detta sparas eller hamnar i historiken: mätningen försvinner när du lägger undan gradskivan.

## Avstånd till origo och vid flytt

Under {{ui:workspace.appearance}} i inställningarna finns två reglage för direkta mått:

- {{ui:workspace.showMoveDimensions}} visar hur långt du flyttar medan du drar. Det gäller även lyft med den blå pilen ovanför en kropp; vägen upp eller ned visas vid främre hörnet. Piltangenterna visar sin flyttsträcka också: tryckningarna läggs ihop tills du markerar något annat eller drar, och [[Ctrl]]+[[↑]] och [[Ctrl]]+[[↓]] visar höjdförflyttningen. När du har släppt kan du klicka på en sådan siffra och skriva in det exakta avståndet; minustecken går nedåt.
- {{ui:workspace.showOriginDimensions}} visar markeringens avstånd till plattans origo, även när flera kroppar är markerade.

Med {{ui:workspace.dimensionsAlwaysVisible}} förblir måtten synliga hela tiden. En kropp som inte står på arbetsytan visar också sin höjd ovanför den; klicka på siffran för att skriva in ett nytt mått.
Med {{ui:workspace.dimensionAxisColors}} tar varje måttruta sin axels färg precis som handtagen: rött för X, grönt för Y och blått för Z. På en liten del ser du då direkt vilket mått som är vilket.

För en stund utan dem trycker du [[Q]]: måtten och avstånden kring markeringen försvinner så att delen du flyttar syns tydligt. Tryck [[Q]] igen för att få tillbaka dem. Handtag du pekar på visar fortfarande sina mått.

## Kontrollera spelrum

Delar som ska kunna röra sig efter utskrift – en ledad flexi-drake, ett färdigmonterat gångjärn, en låda med lock eller en axel i ett hål – behöver ett mellanrum mellan sig. För lite, så smälter de ihop; överlappar de, skrivs allt ut i ett stycke. {{ui:editor.tool.clearance}}, bredvid {{ui:editor.tool.loftSketches}}, kontrollerar det innan du skriver ut. Verktyget granskar de markerade objekten, eller alla synliga objekt om inget är markerat (samma som vid export), och testar varje par:

- **{{ui:clearance.kind.overlap}}** (röd): delarna delar volym. Det lyser rött inne i kropparna som blir genomskinliga, och listan visar hur stor överlappningen är.
- **{{ui:clearance.kind.touching}}** (röd): de nuddar varandra och smälter samman vid utskrift.
- **{{ui:clearance.kind.tight}}** (orange): det smalaste spelrummet är mindre än {{ui:clearance.threshold}}.
- **{{ui:clearance.kind.fine}}** (grön): det smalaste spelrummet är minst så brett.

Varje rad anger de två delarna och för ett mellanrum dess bredd samt var det sitter: {{ui:clearance.direction.side}} (inom samma utskriftslager) eller {{ui:clearance.direction.layer}} (över eller under: där kan slicern bara lämna hela lager tomma, så ett mellanrum tunnare än ett lager växer igen). Klicka på en rad: kameran åker dit, båda delarna ramas in och en linje med måttet pekar ut det trängsta stället. Par som ligger mer än 5 mm isär listas inte. Inget i designen ändras: kontrollen sparar ingenting och lämnar inget att ångra.

{{ui:clearance.threshold}} börjar på 0,3 mm; 0,3 är snävt, 0,4 är vanligt för utskrift på plats. Ändrar du värdet sorteras listan om genast utan ny beräkning, och webbläsaren minns värdet. {{ui:clearance.splitParts}} (påslagen från början) kontrollerar också lösa delar inuti ett och samma objekt mot varandra: en flexi-drake eller ett gångjärn som importerats som en enda STL är ett objekt, men länkarna är separata delar. De listas som ”Namn · Del 2”. En del inuti ett hålrum hos en annan, som en kula i en bur, räknas som egen del.

Om du ändrar designen medan panelen är öppen visas {{ui:clearance.stale}}; klicka på den eller på {{ui:clearance.checkAgain}}. [[Esc]] eller {{ui:clearance.close}} stänger panelen. Skalning ändrar även mellanrummen: en flexi-modell som skalas ned till 70 % behåller bara 70 % av sitt spelrum, så kontrollera igen efter skalning.

Kontrollen mäter det triangelnät som slicern får. En rund axel och dess hål är månghörningar med hörnen på cirkeln, så ett spelrum kan bli några hundradelar mindre än de runda siffrorna. Ett par med för många trianglar listas som {{ui:clearance.kind.unchecked}}. En AI kör samma kontroll med `layerling_check_clearance`.

## Anteckningar

En anteckning dokumenterar det som geometrin inte säger själv: ”Den här skruven är 0,3 mm för trång”, ”skriv ut locket senare”, ”mått från Peter”. Placera en med {{ui:editor.tool.note}} eller tangenten [[N]].

- Placerar du anteckningen **på en kropp** följer den med kroppen.
- Placerar du den **bredvid** stannar den på arbetsytan ({{ui:note.free}}).
- {{ui:note.detach}} kopplar loss en fäst anteckning från kroppen.
- {{ui:note.forAi}} gör anteckningen till en uppgift för en AI-agent över MCP-bryggan (se ”AI med MCP”): agenten läser den med `layerling_list_notes`, utför arbetet och svarar direkt i samma anteckning under din text. Den kan också lägga egna anteckningar på modellen för att fråga eller rapportera något vid en viss punkt. Be agenten bevaka dina anteckningar så väntar den på dem med `layerling_wait_for_notes`: då arbetar du bara i modellen, och varje ny förfrågan hämtas upp så fort du bockar i rutan utan att byta tillbaka till agentens fönster.
- {{ui:editor.tool.group}} tar med en fäst anteckning in i gruppen; {{ui:editor.tool.ungroup}} lämnar över den till den synliga del som ligger under den, även grupper inuti. Medan en grupp är öppen med {{ui:group.edit}} flyttas dess anteckningar med delen under dem och återvänder till gruppen med {{ui:group.done}}; att avbryta ställer tillbaka allt som det var.
- Om kroppen raderas, eller om ingen synlig kropp längre finns under, blir anteckningen kvar där den stod på arbetsytan.
- Dra i nålen för att flytta anteckningen. Ett klick på nålen fäller ihop kortet så att bara den lilla siffran syns; ett nytt klick öppnar det igen. Klicka i texten för att redigera den.
- Medan du skriver behåller [[Enter]] texten och [[Esc]] återställer den som den var innan du började; [[Shift]]+[[Enter]] gör ny rad.
- **I en skiss** sätter {{ui:editor.tool.note}} eller [[N]] också en anteckning var som helst på skissen. Alla anteckningar i en skiss hör till dess kropp: i 3D-vyn sitter de på den – på ovansidan av en extruderad eller svept kropp och på den ritade profilen av en roterad – och följer med när kroppen flyttas. När du öppnar skissen igen visar den kroppens anteckningar, även de som satts i 3D. I skissen tar Ångra tillbaka en anteckning precis som en linje, och {{ui:sketch.cancel}} kastar ändringar i anteckningarna. [[Shift]]+[[N]] visar och döljer anteckningarna där med.

Anteckningar sparas i designen, kommer inte med i någon export och visas eller döljs med {{ui:visibility.notes}} (i {{ui:editor.visibilityOptions}}, pilen bredvid ögat) eller med [[Shift]]+[[N]].

## Referenspunkter

En referenspunkt är en fri markering i rummet, som ett blyertsmärke eller en rits i verkstaden: den tillhör ingen kropp, skrivs aldrig ut och andra saker fäster mot den. Högerklicka på en kropp och välj {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} eller {{ui:contextMenu.markMidpoints}}: punkterna dyker upp på kroppens översida (eller hela markeringens om du markerat flera). {{ui:contextMenu.markFaceCenter}} sätter i stället en punkt mitt på den plana yta du högerklickade på, exempelvis på en sida eller en gavel. Har du ställt in en rotationspunkt lägger {{ui:contextMenu.markPivot}} en punkt precis på den så att centrum på en annan del kan fästa vid vridcentrumet.

- Dra en punkt för att flytta den: den fäster mot kroppars hörn, kantmitter och ytmitter, mot deras verkliga hörn och mot andra punkter; håll ned [[Alt]] för att släppa den fritt. Eller klicka på den för att se koordinaterna och skriva in nya i din valda enhet. Varje kort går att dra åt sidan i rubriken om det skymmer något, var för sig: de andra ligger kvar där de är, och ett dubbelklick på rubriken sätter tillbaka kortet. Kortet du rörde sist ligger överst. **Ta bort alla** i ett kort, eller **Ta bort alla referenspunkter** i högerklicksmenyn (på en kropp eller på tom arbetsyta), raderar alla punkter samtidigt. {{ui:common.delete}} tar bort den valda punkten.
- Måttbandet kan också sätta en punkt: {{ui:camera.tapeMarkMiddle}}, det halvfyllda märket mitt på en mätning, lägger en punkt i mitten, till exempel i centrum av ett runt hål. Och det mäter från en punkt: måttbandet fäster mot referenspunkter precis som mot hörn.
- När du drar en form fäster dess kanter och centrum mot en punkt på samma sätt som mot andra former ({{ui:workspace.objectSnap}}). Vinkelhaken fäster mot punkter den med.
- Punkterna sparas i designen, kommer aldrig med i någon export och visas eller döljs tillsammans med anteckningarna via {{ui:visibility.notes}} ([[Shift]]+[[N]]).
- En AI kan markera, lista och ta bort dem med `layerling_add_reference_points`, `layerling_list_reference_points` och `layerling_remove_reference_points`.

## Referensbilder

En referensbild är en bild att rikta in delar efter: lägg ett foto av ett kretskort på botten av dess låda och placera distanser, skruvhål och kontaktöppningar rakt ovanpå. Den är ett hjälpmedel, inte en kropp: den skrivs aldrig ut, exporteras aldrig (STL, 3MF, OBJ, STEP, SVG), ingår aldrig i en grupp, bunt eller snitt, och materialberäkningen räknar inte med den.

- Öppna {{ui:editor.import}} och välj {{ui:import.referenceImage}}, därefter en PNG-, JPG-, WebP-, GIF- eller BMP-bild. Den landar på arbetsytan – på plattan eller på den yta du lagt arbetsytan på – med sin längsta sida på 100 mm och halvgenomskinlig.
- Flytta, vrid och ändra storlek på den med handtagen som med vilken form som helst. En kropp framför bilden väljs i första hand så att du inte råkar ta tag i bilden när du bygger ovanpå den.
- {{ui:referenceImage.seeThrough}} i inställningarna tonar den från helt täckande till knappt skönjbar.
- {{ui:referenceImage.calibrate}} ger bilden dess verkliga storlek, precis som i skissläget: klicka på två punkter i bilden vars verkliga avstånd du känner till – till exempel två monteringshål på kortet – och skriv in det avståndet i {{ui:referenceImage.distance}}. Bilden behåller sina proportioner och sin mittpunkt.
- Lås den med hänglåset i rubriken till dess inställningar så ligger den still: klick går då rakt igenom den ned till plattan. Välj den i objektlistan för att låsa upp den igen.
- Bilden sparas en enda gång i designfilen oavsett hur många gånger den kopieras eller ångras. En stor bild ökar filstorleken med motsvarande; meddelandet när du lägger till den anger hur stor den är.
- En AI lägger till, flyttar, kalibrerar, tonar och låser en bild med `layerling_reference_image`. Med `trace` spårar den bilden till en skisskropp som står på den, precis som skissens {{ui:sketch.traceImage}}.
