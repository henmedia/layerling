---
title: Vanliga frågor
summary: Korta svar på det som folk oftast frågar, om att spara, stora modeller, avrundningar, AI och utskrift, alltid med vägen till den fullständiga förklaringen.
contents: questions
---

Varje svar är kort och slutar med stället i den här handboken som förklarar det i sin helhet. Sökrutan längst upp hittar en fråga via vilket ord som helst i den.

## Spara och säkerhetskopiera

### Var sparas mina designer, och finns det ett moln?

I webbläsaren på din egen dator. Det finns inget konto och inget moln, och ingenting laddas upp; varje ändring sparas automatiskt. Den som kör layerling på en egen server kan också ha designer i en delad mapp där.

Mer: [Var dina designer bor](chapter:files-and-saving#var-dina-designer-bor)

### Mina designer är borta. Vad har hänt?

Designer finns i en webbläsare på en dator. De är borta om webbläsarens data för sidan har rensats, och de syns inte i en annan webbläsare eller på en annan dator. Safari på Mac, iPhone och iPad raderar en sidas data efter sju dagar utan besök, om inte layerling är installerat som app. Har du en säkerhetskopia hämtar {{ui:dashboard.restoreBackup}} på startsidan tillbaka designerna, med deras mappar och bilder.

Mer: [Dina designer, din säkerhetskopia](chapter:files-and-saving#dina-designer-din-saekerhetskopia)

### Hur säkerhetskopierar jag allt, även automatiskt till en mapp?

{{ui:dashboard.backupAll}} på startsidan packar alla designer i en enda ZIP-fil. Dessutom sparar layerling självt tidigare versioner av varje design, och i Chrome och Edge kan det skriva var och en av dem som en .lyl-fil i en mapp som du väljer. Versionerna i webbläsaren försvinner när webbläsarens data försvinner, så de ersätter varken ZIP-filen eller mappen.

Mer: [Tidigare versioner](chapter:files-and-saving#tidigare-versioner)

### Hur tar jag med en design till en annan dator eller webbläsare?

Spara den som en .lyl-fil från exportfönstret och öppna filen på den andra datorn från startsidan. För alla designer på en gång använder du {{ui:dashboard.backupAll}} här och {{ui:dashboard.restoreBackup}} där; designer som redan finns läggs inte till två gånger.

Mer: [Säkerhetskopiera och dela](chapter:files-and-saving#saekerhetskopiera-och-dela)

### Vad händer när jag rensar webbläsarens data?

Designerna som finns i den webbläsaren tas bort, och även de tidigare versioner som layerling sparade där. En ZIP-fil från {{ui:dashboard.backupAll}}, dina .lyl-filer och en säkerhetskopieringsmapp på din hårddisk påverkas inte. Säkerhetskopiera först och rensa sedan.

Mer: [Dina designer, din säkerhetskopia](chapter:files-and-saving#dina-designer-din-saekerhetskopia)

### Hur kommer jag tillbaka till ett tidigare läge?

Ångra går bakåt steg för steg. Historikvyn visar varje steg med ett skjutreglage utan att ändra designen, och kan göra en ny design av vilket som helst av dem. För ett läge från tidigare i dag eller förra veckan öppnar listan över tidigare versioner en gammal version som en ny design och lämnar den nuvarande som den är.

Mer: [Se bakåt: historikvyn](chapter:select-and-arrange#se-bakat-historikvyn) och [Tidigare versioner](chapter:files-and-saving#tidigare-versioner)

### Kan STL och 3MF hamna direkt i min projektmapp? Och hur får jag en nedladdning igen?

I Chrome och Edge frågar den första exporten av en design var den ska sparas, och senare exporter skrivs till samma fil utan att fråga. Firefox och Safari laddar alltid ner. Vill du ha en nedladdning varje gång slår du på {{ui:workspace.stlAsDownload}} i inställningarna.

Mer: [Exportera](chapter:files-and-saving#exportera)

### Spardialogen stängdes och det finns ingen fil. Varför?

Webbläsaren rapporterar en dialog som den inte kunde använda på samma sätt som en som du har avbrutit, och en fil som ett antivirusprogram blockerar kan inte heller skrivas. Meddelandet längst upp erbjuder då {{ui:status.saveAsDownload}}, som lägger filen bland dina nedladdningar. Vill du slippa dialogen för gott slår du på {{ui:workspace.lylAsDownload}} och {{ui:workspace.stlAsDownload}} i inställningarna.

Mer: [Säkerhetskopiera och dela](chapter:files-and-saving#saekerhetskopiera-och-dela)

## Installation och uppdateringar

### Finns det en app att ladda ner?

layerling installeras från webbläsaren: då får det en egen ikon och ett eget fönster och startar utan nätverk. Det finns inget installationsprogram att ladda ner, och originalet finns bara på layerling.com. **Ladda inte ner och kör inte ett installationsprogram för ”layerling” från någon annan webbplats:** det kommer inte från layerling och kan innehålla skadlig kod. Vill du köra en egen kopia finns det en snabbstart för Windows och en Docker-avbildning.

Mer: [Installera som app](chapter:offline-and-install#installera-som-app) och [Köra själv](chapter:offline-and-install#koera-sjaelv)

### Fungerar layerling utan internet?

Ja, efter det första besöket startar det utan nätverk, helst installerat som app. En sak laddas först när den behövs för första gången: CAD-kärnan för den första STEP-exporten, cirka 22 MB.

Mer: [Installera som app](chapter:offline-and-install#installera-som-app)

### Hur får jag en uppdatering?

Av sig själv. En öppen sida märker att det finns en ny version och visar ett kort med vad som är nytt; {{ui:newVersion.reload}} sparar först den öppna designen och laddar sedan den nya versionen. Startsidan visar också en nyare version.

Mer: [Uppdateringar](chapter:offline-and-install#uppdateringar)

### Vilka webbläsare och surfplattor fungerar?

Chrome, Edge, Firefox och Safari, på en dator, en surfplatta eller en telefon; 3D-vyn kräver WebGL. Några saker kan bara Chrome och Edge: skriva i dina egna filer och mappar, säkerhetskopieringsmappen och att öppna .lyl-filer med ett dubbelklick. På en surfplatta gör ett finger det som vänster musknapp gör.

Mer: [Fingrar och pekpenna](chapter:tablet-and-touch#fingrar-och-pekpenna)

## AI

### Vad är det enklaste sättet att ställa in en AI?

Ge en AI som kan arbeta på din dator adressen `https://github.com/henmedia/layerling` och be den att ställa in layerling med dess MCP-server åt dig. Den behöver ett program som fliken Code i Claude-appen, Claude Code, Codex, Antigravity, Gemini CLI eller Grok Build. För Windows och Mac har handboken också stegen ett i taget.

Mer: [Steg för steg för nybörjare](chapter:ai-with-mcp#steg-foer-steg-foer-nyboerjare)

### Varför når AI:n inte layerling.com?

Bryggan mellan AI:n och editorn finns bara i en kopia av layerling som körs på din egen dator. På layerling.com är den alltid avstängd, och en chatt i webbläsaren kan inte installera något. AI:n behöver alltså ett layerling som startats lokalt och ett program som talar MCP.

Mer: [Ställa in](chapter:ai-with-mcp#staella-in)

### Är den installerade appen en lokal kopia?

Nej, inte om du har installerat den från layerling.com: det är fortfarande layerling.com i ett eget fönster, även om den också startar utan internet. Med en lokal kopia körs en liten server på din dator, och genom den pratar AI:n med editorn via MCP; webbappen har ingen sådan server. Efter snabbstarten körs din egen kopia på `http://127.0.0.1:3000/`.

Mer: [Ställa in](chapter:ai-with-mcp#staella-in)

### Vilken AI fungerar, och vad kostar det?

Alla program som talar MCP; handboken beskriver Claude, Codex, Gemini, Antigravity och Grok Build. En chatt på en webbplats eller i en mobilapp når inte layerling, eftersom den inte kan starta något på din dator. layerling självt kostar ingenting. Vad AI:n kostar bestämmer dess leverantör: fliken Code i Claude-appen ingår till exempel i de betalda Claude-abonnemangen.

Mer: [Ställa in](chapter:ai-with-mcp#staella-in)

### Vilka data går till AI-leverantören?

Det som AI:n läser: objekten i den öppna designen och de bilder av vyn som den tar. Det går till leverantören av ditt AI-program, precis som allt annat du skriver där. Själva bryggan körs på din dator, och utan en AI lämnar ingenting den.

Mer: [Vad AI:n kan göra](chapter:ai-with-mcp#vad-ai-n-kan-goera)

## Minne, hastighet och historik

### Varför blir layerling långsamt med min STL?

En STL är en mesh av trianglar, och en mycket stor sådan gör editorn långsammare, tar mycket minne och gör sparandet långsamt. layerling säger det efter importen från 400 000 trianglar i en mesh, eller en miljon i hela designen. Förenkla meshen först, importera bara de delar du behöver, eller bygg delen av layerlings egna former.

Mer: [Stora mesh](chapter:files-and-saving#stora-mesh)

### Varför saknas det steg i min historik?

Två saker kortar den. Inställningen {{ui:workspace.savedHistory}} behåller 100 steg per design om du inte ändrar den, och äldre tas bort. Och när en design är för stor för att sparas med hela sin historik sparar layerling den med hälften av stegen, sedan hälften igen, och talar om det för dig. Själva designen sparas alltid hel.

Mer: [Sparad historik](chapter:view-and-workplane#sparad-historik)

### Vad gör jag när webbläsarens lagring är full?

Stäng inte fliken och ladda inte om den: dina senaste ändringar finns bara där. Spara först en kopia genom att exportera som .lyl. Skaffa sedan plats: ta bort steg i historikvyn, ta bort designer som du inte längre behöver, eller säkerhetskopiera dem och ta bort dem.

Mer: [Dina designer, din säkerhetskopia](chapter:files-and-saving#dina-designer-din-saekerhetskopia)

### Min design är för stor för att sparas. Vad gör jag nu?

Dess historik och mesh tar tillsammans för mycket plats. layerling har redan försökt med färre historiksteg innan det säger det. Ta bort historiken i historikvyn, förenkla de tyngsta importerade mesharna, eller spara en .lyl med bara det aktuella läget.

Mer: [Säkerhetskopiera och dela](chapter:files-and-saving#saekerhetskopiera-och-dela) och [Förenkla en importerad mesh](chapter:files-and-saving#foerenkla-en-importerad-mesh)

### Webbläsaren har slut på minne. Vad hjälper?

Det händer med mesh på miljontals trianglar, där ett enda steg behöver mer minne än en webbläsarflik får. Minska antalet trianglar i importerade mesh med {{ui:editor.tool.simplify}}, stäng andra flikar och försök igen. En kortare historik hjälper också om det händer när du sparar.

Mer: [Stora mesh](chapter:files-and-saving#stora-mesh)

### En design öppnas mycket långsamt eller inte alls. Vad kan jag göra?

Oftast har dess historik av ångrasteg blivit väldigt stor. {{ui:dashboard.openWithoutHistory}} i designens meny på startsidan läser bara det aktuella läget; de tidigare stegen tas bort för gott, så säkerhetskopiera designen först om du vill behålla dem. En tidigare version från säkerhetskopiorna öppnas som en ny design.

Mer: [Säkerhetskopiera och dela](chapter:files-and-saving#saekerhetskopiera-och-dela)

### layerling hackar. Vilka inställningar hjälper?

{{ui:workspace.fastMode}} i inställningarna stänger av skuggorna, kantlinjerna på alla kroppar och kamerans tröghet, och ritar vyn bara i skärmens upplösning. Kontrollera att webbläsaren använder grafikkortet: på `chrome://gpu` eller `edge://gpu` ska det stå ”Hardware accelerated” bredvid WebGL. Stora importerade mesh är den andra vanliga orsaken.

Mer: [När layerling känns långsamt](chapter:view-and-workplane#naer-layerling-kaenns-langsamt)

### Editorn står still eller räknar länge. Vänta eller ladda om?

Vänta först. Skärningar, grupper och kantbearbetningar beräknas i bakgrunden, och {{ui:status.computing}} visas medan de pågår; långa jobb som urgröpning avbryts av sig själva med ett meddelande och ändrar ingenting. Om CAD-kärnan måste startas om säger meddelandet det, och du behöver inte ladda om. Det är säkert att ladda om, eftersom varje ändring sparas automatiskt, med ett undantag: så länge den röda notisen {{ui:notice.designNotSavedTitle}} visas ska du först exportera en .lyl.

Mer: [När layerling känns långsamt](chapter:view-and-workplane#naer-layerling-kaenns-langsamt)

### 3D-vyn förblir tom, eller ett meddelande säger att den inte kunde starta. Vad gör jag nu?

Webbläsaren kunde inte starta WebGL, som ritar 3D-vyn. Orsaken ligger i webbläsaren eller grafikdrivrutinen, inte i din design, och dina sparade designer tas inte bort. Stäng andra flikar med 3D-innehåll och starta om webbläsaren, slå på maskinvaruacceleration, tillåt WebGL om en sekretessinställning eller ett tillägg blockerar det, och uppdatera webbläsaren och grafikdrivrutinen. En annan webbläsare är ett snabbt test.

Mer: [När layerling känns långsamt](chapter:view-and-workplane#naer-layerling-kaenns-langsamt)

## Importerade modeller

### ”Förenkla nät” eller ”Gör exakt”: vilken ska jag välja?

{{ui:editor.tool.simplify}} behåller en andel av trianglarna, så att en tung modell blir lättare; den förblir en mesh. {{ui:editor.tool.makeExact}} bygger om en modell som består av plan, cylindrar, koner och sfärer till en riktig CAD-kropp, så att avrundningar och fasningar följer rena kanter och en STEP-export får med sig riktiga ytor. Den tar upp till 400 000 trianglar; en figur eller en skanning förblir en mesh. För en stor teknisk del: förenkla först, med {{ui:simplify.keepEdges}} påslagen, och gör den sedan exakt.

Mer: [Förenkla en importerad mesh](chapter:files-and-saving#foerenkla-en-importerad-mesh) och [Göra en importerad mesh exakt](chapter:files-and-saving#goera-en-importerad-mesh-exakt)

### Varför misslyckas en skärning, eller varför är mitt nät ”inte vattentätt”?

En kropp kan bara skäras när dess yta är sluten. Om en importerad mesh har glipor anger layerling vilken del det är och antalet öppna kanter, och utelämnar den. Små hål stänger det självt; större måste repareras i programmet som modellen kommer från eller i ett verktyg för reparation av mesh. Utskriftskontrollen visar vilken kropp som är öppen.

Mer: [Kontrollera utskriften](chapter:printing#kontrollera-utskriften)

### Hur importerar jag en SVG på rätt sätt?

En SVG kommer in som en skisskropp, 4 mm hög, och dess punkter kan ändras i skissläget. Skriv in bredden i millimeter i importfönstret före importen; utan ett tal behåller den sin egen storlek. Konturer som korsar sig själva kan inte bli en solid; de utelämnas och räknas: slå ihop överlappande delar och slut konturerna i ritprogrammet, och importera sedan igen.

Mer: [Importera](chapter:files-and-saving#importera)

## Avrundningar och fasningar

### Varför går en avrundning inte att använda?

Oftast är den för stor för platsen: den skulle gå in i de angränsande ytorna, eller så böjer kanten snävare än radien. En eller två millimeter mindre räcker ofta, och vid spetsiga vinklar behöver en avrundning mer plats än radien antyder. Om kanterna inte kan avrundas tillsammans tar du färre åt gången; kanten som är i vägen ritas röd. {{ui:edge.findLargest}} söker fram storleken åt dig.

Mer: [Fasa och avrunda kanter](chapter:edges-and-hollowing#fasa-och-avrunda-kanter)

### Varför är mina avrundningar borta efter att jag ändrade skissen?

Efter {{ui:inspector.editSketch}} byggs kroppen på nytt och får nya kanter. layerling lägger avrundningar och fasningar på nytt på de kanter som ligger där de gamla låg, så länge kroppen har lika många kanter som förut. Med ett hörn mer eller mindre utelämnas de, och meddelandet säger hur många. Ångra hämtar tillbaka allt.

Mer: [Göra en kropp av skissen](chapter:sketches#goera-en-kropp-av-skissen)

### Varför kan jag inte välja vissa kanter på en importerad modell?

STL, OBJ och 3MF innehåller bara trianglar, och kantverktygen fungerar på mesh med upp till 4 000 trianglar. {{ui:editor.tool.makeExact}} gör en teknisk del till en riktig CAD-kropp, där ett borrhål har en enda rund kant som en avrundning kan följa. En STEP-fil har exakt geometri från början.

Mer: [Göra en importerad mesh exakt](chapter:files-and-saving#goera-en-importerad-mesh-exakt)

## Grupper, hål och storlekar

### Varför blir hål ovala när jag sträcker ut en grupp?

En grupp som får ny storlek sträcker ut allt i den, som om det vore ritat på gummi. Välj {{ui:inspector.groupResizeKeepParts}} under {{ui:inspector.groupResize}} i gruppens inställningar: delar som sträcker sig tvärs över gruppen sträcks ut, och hål och små delar behåller sin storlek och sitt avstånd till den närmaste sidan.

Mer: [Ändra storlek på en grupp: behålla hål och små delar](chapter:solids-and-holes#aendra-storlek-pa-en-grupp-behalla-hal-och-sma-delar)

### Varför misslyckas grupperingen, eller varför har resultatet glipor?

Antingen är en del inte sluten, och då anger meddelandet vilken, eller så möts två delar nästan utan att röra vid varandra på riktigt. Dela upp gruppen, rikta in delarna exakt eller ändra en storlek eller en position lite, och gruppera igen. Mycket täta mesh över gränsen för att skära i importerade mesh slås inte ihop alls.

Mer: [Gruppera](chapter:solids-and-holes#gruppera)

### Hur ändrar jag en del inuti en grupp?

Markera gruppen och tryck [[E]], eller dubbelklicka på den. Delarna ligger då var för sig och kan ändras; när du avslutar byggs gruppen upp igen. Avrundningar och fasningar som lagts på hela gruppen går förlorade när den byggs om.

Mer: [Redigera en grupp](chapter:solids-and-holes#redigera-en-grupp)

### Hur får jag tillbaka en enda del från ett tidigare läge?

Öppna historikvyn, dra reglaget till det läge som fortfarande hade delen, klicka på delen och välj {{ui:historyView.bringBack}}. En kopia hamnar i den aktuella designen, som delen var och där den var, med tidpunkten i namnet.

Mer: [Se bakåt: historikvyn](chapter:select-and-arrange#se-bakat-historikvyn)

## Utskrift och export

### STL, 3MF, OBJ eller STEP: vilken ska jag välja?

Till skrivaren 3MF eller STL. 3MF behåller varje kropp som en del med namn och färg; STL är en enda mesh i en färg. OBJ har också med färger. STEP är för andra CAD-program: den innehåller den exakta geometrin med avrundningar och fasningar.

Mer: [Exportera](chapter:files-and-saving#exportera)

### Hur får jag in mina färger i slicern?

Exportera 3MF. Varje kropp behåller sin färg, och en kropp som är målad i flera färger har målningen på sina ytor. Bambu Studio och OrcaSlicer frågar vid öppning hur färgerna ska fördelas på dina filament.

Mer: [Måla i flera färger](chapter:shapes#mala-i-flera-faerger)

### Mina delar passar inte i varandra. Hur mycket spelrum behöver de?

Oftast 0,2 till 0,4 mm, beroende på skrivaren. Passningstestet mäter det: skriv ut den lilla plattan med sju hål, hitta det trängsta hålet där stiftet fortfarande går att vrida, och ange det värdet som din skrivares spel. Nya lock, laxstjärtar och gängor utgår sedan från det.

Mer: [Skrivarens spel: passningstestet](chapter:printing#skrivarens-spel-passningstestet)

### Varför säger layerling att en del inte får plats i skrivaren?

Delen sticker ut över plattans kant eller är högre än vad skrivaren du har valt kan bygga. Det är bara ett tips och kan stängas. Välj din skrivare i inställningarna, eller dela en för stor del med {{ui:editor.tool.split}}.

Mer: [När något inte får plats](chapter:printing#naer-nagot-inte-far-plats)

## Om layerling

### Är layerling gratis, och får jag sälja det jag designar med det?

layerling är fri programvara under licensen AGPL-3.0, utan konto. Licensen gäller programmet: den som ändrar layerling och erbjuder det till andra via ett nätverk måste också erbjuda källkoden. Den ställer inga villkor för modellerna du gör. Typsnitt och modeller som du importerar behåller sina egna licenser.

Om du vill stötta projektet hjälper en [liten donation](support:) till med kostnaderna för server och utveckling. Den är frivillig, och ingenting i layerling är beroende av den.

Mer: [Köra själv](chapter:offline-and-install#koera-sjaelv)

### Hur rapporterar jag ett fel eller önskar något?

{{ui:editor.bugReport}} i sidfoten sparar en ZIP-fil med designen och en kort text om version och webbläsare; ingenting personligt finns i den. Bifoga den i forumet eller i diskussionerna på GitHub. Frågor och önskemål är välkomna på båda ställena.

Mer: [Rapportera ett fel](chapter:files-and-saving#rapportera-ett-fel) och [Hjälp och återkoppling](chapter:offline-and-install#hjaelp-och-aterkoppling)
