---
title: Komma igång
summary: Från en tom yta till din första del för 3D-skrivaren, på fem minuter, utan konto och utan att installera något.
---

layerling är ett designprogram för 3D-utskrift som körs direkt i webbläsaren. Du bygger en del av enkla former, skär ut hål i den, rundar kanterna och skickar den till din slicer. Det finns inget att installera och inget konto att registrera. Det du bygger stannar kvar på din dator.

![Startsidan i layerling: ”Skapa ny 3D-design” överst, dina designer och snabbguiden nedanför.](shot:start-page)

## Skapa en design

Öppna [layerling.com](https://layerling.com/). Klicka på {{ui:dashboard.createDesign}} på startsidan. Redigeraren öppnas med en tom arbetsyta, rutnätet där allting tar form.

Om du redan har en fil att fortsätta arbeta med väljer du {{ui:dashboard.importGeometry}}. Det fungerar för layerling-designer (`.lyl`) liksom för STL-, OBJ-, 3MF-, STEP- och SVG-filer.

Alla dina designer visas senare på startsidan med en förhandsgranskningsbild. De lagras i webbläsarens lokala utrymme och sparas automatiskt efter varje ändring, så det finns ingen spara-knapp. **layerling tar inget ansvar för designer som lagras i webbläsaren.** En webbläsare kan krascha eller få problem efter en uppdatering, så säkerhetskopiera dina designer då och då med {{ui:dashboard.backupAll}} på startsidan eller spara dem som filer. En säkerhetskopia läses tillbaka med {{ui:dashboard.restoreBackup}}. Hur du packar designer i en fil och delar dem vidare beskrivs i [Filer och lagring](chapter:files-and-saving). Om du vill ha en påminnelse slår du på {{ui:workspace.confirmTabClose}} i inställningarna (kugghjulet i verktygsfältet): då frågar webbläsaren innan en flik med en öppen design stängs eller laddas om.

## Redigeraren i korthet

![Redigeraren med namngivna områden: verktygsfältet överst, vykuben till vänster med vyfältet under, statusmeddelandet och objektlistan bredvid, och egenskaperna för den markerade formen till höger.](shot:editor-areas)

- **Överst** ligger **verktygsfältet**. Det är indelat efter uppgift: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.section.mirrorPattern}}, {{ui:editor.section.splitShape}}, {{ui:editor.section.edgesWalls}}, {{ui:editor.section.surface}}, {{ui:editor.group.arrange}} och {{ui:editor.group.file}}; {{ui:editor.group.help}} sitter ovanför i rubrikraden, och huset bredvid flikarna tar dig tillbaka till startsidan. När fönstret är för smalt för alla grupper fälls de minst använda ihop till en knapp under sitt namn, med en liten pil i gruppens färg under: peka eller tryck på den för att öppna gruppens verktyg. Ihopfälld {{ui:editor.group.history}} är undantaget: dess knapp är {{ui:editor.tool.undo}} själv, och bara pilen under den öppnar {{ui:editor.tool.redo}} och resten. Knappen för {{ui:editor.group.shapes}} har samma pil: låt musen vila på den så öppnas formbiblioteket, och det stängs igen strax efter att musen har lämnat det, om du inte klickar på knappen, arbetar i biblioteket eller fäster det. Nålen uppe till höger, till vänster om förstoringsglaset, håller i stället alla grupper öppna. Håll muspekaren över en ikon för att se dess namn, även när den är nedtonad; {{ui:interactiveHelp.title}} (frågetecknet under {{ui:editor.group.help}}, eller [[Shift]]+[[F1]]) förklarar varje del med ett klick och leder vidare till rätt avsnitt i den här handboken. Överallt där du ser ett litet frågetecken – till exempel i en forms egenskaper, i formbiblioteket eller i verktygsfönstren – leder det direkt till motsvarande kapitel här. En nedtonad ikon berättar också vad den väntar på, exempelvis {{ui:editor.needs.oneBody}} eller {{ui:editor.needs.locked}}. Hittar du inte ett verktyg? Tryck [[Ctrl]]+[[K]] och skriv dess namn; en tom design påminner dig om det längst ned i vyn.
- **I mitten** finns arbetsytan. Här placerar du former, drar dem till rätt mått och ser resultatet.
- **Till höger** visas **egenskapspanelen** för den markerade formen: färg, mått, position och allt annat som hör till formen. Att skriva in siffror är mer exakt än att dra.
- **Till vänster** finns **vyfältet** med **vykuben** ovanför. De flyttar dig runt i scenen, läs mer i [Vy och arbetsyta](chapter:view-and-workplane).
- **Bredvid vyfältet** öppnas **objektlistan** ([[Ctrl]]+[[U]]) med alla former i designen. Mer om det i [Markera och ordna](chapter:select-and-arrange).
- **Till höger om vykuben** visas **statusmeddelandet** när layerling har något att tala om, till exempel vad ett verktyg väntar på härnäst. När inget finns att meddela syns rutan inte. Efter ett steg som en förening säger det kort vad som gjordes och erbjuder {{ui:shortcuts.undo}}; {{ui:workspace.showStepNotices}} i inställningarna stänger av dessa meddelanden.
- **Verktygsfönster** öppnas över arbetsytan när du startar ett verktyg som avrunda, mönster eller gröpa ur. Dra dem åt sidan i rubrikraden om de skymmer något.
- **Längst upp** växlar du mellan {{ui:editor.modeGeometry}} och {{ui:editor.modeSketch}}, byter namn på designen och väljer språk och färgtema.

## Knapparna runt arbetsområdet

Håll muspekaren över en knapp för att se dess namn. Om du är osäker på vad en knapp gör klickar du på {{ui:interactiveHelp.title}} i området {{ui:editor.group.help}} ([[Shift]]+[[F1]]) och sedan på knappen. Här är de som efterfrågas mest.

### Klistra in

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) lägger till det du kopierade med {{ui:editor.tool.copy}} i designen. {{ui:common.duplicate}} kopierar och klistrar in i ett enda steg. När du klistrar in hamnar varje del en aning vid sidan av originalet. Delar från ett annat program kan hamna långt utanför plattan, och för dem finns {{ui:workspace.pasteCentered}} i inställningarna under {{ui:workspace.appearance}}: då läggs delarna samlat mitt på arbetsytan.

### Ta bort

{{ui:common.delete}} ([[Delete]]) tar bort de markerade formerna. {{ui:editor.tool.undo}} tar tillbaka dem.

### Dela upp grupp

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) delar upp den markerade gruppen i de former den skapades av.

### Inställningar för arbetsyta

{{ui:editor.workspaceSettings}} öppnar inställningarna för arbetsområdet: enhet, plattans storlek, skrivare, rutnät, färger, ljus med mera. Läs mer i [Vy och arbetsyta](chapter:view-and-workplane).

### Tema

{{ui:common.theme}} längst upp väljer hur layerling ser ut: som systemet, ljust, mörkt eller grafit.

### Byt namn på design

{{ui:editor.renameProject}}: pennan bredvid namnet längst upp. Skriv det nya namnet och tryck [[Enter]].

### Designnamn

Designens namn ({{ui:confirm.projectName}}) står längst upp. Klicka på det, skriv, och [[Enter]] sparar namnet.

### Visningsalternativ

{{ui:editor.visibilityOptions}}, pilen bredvid ögat, samlar vad du kan visa eller dölja: objektlistan, allt som du har dolt, anteckningar och överhäng vid utskrift. Mer i [Markera och ordna](chapter:select-and-arrange).

### Dölj markerade

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) döljer de markerade formerna. De finns kvar i designen och i objektlistan; {{ui:editor.visibilityOptions}} visar dem igen.

### Sök kommandon

{{ui:palette.open}}: skriv det du söker – ett verktyg, en form eller en inställning – och klicka på träffen.

### Dölj vyfältet

{{ui:camera.hide}} fäller undan vyfältet till vänster och ger arbetsområdet större plats; {{ui:camera.show}} tar fram det igen.

### Fäst mot rutnät

{{ui:inspector.snapGrid}} längst ned i egenskaperna anger det steg som flytt och storleksändring fäster mot. Bredvid växlar den lilla omkopplaren **mm | in** enhet. Mer i [Vy och arbetsyta](chapter:view-and-workplane).

### Enhet: millimeter eller tum

Omkopplaren **mm | in** bredvid {{ui:inspector.snapGrid}} byter enhet, plattans rutnät och fäststeget för den aktuella designen.

### Sidfoten

Längst ned i fönstret: {{ui:dashboard.sponsor}} leder till sidan där du kan stödja projektet; {{ui:dashboard.userGuide}} öppnar den här handboken; {{ui:dashboard.forum}} leder till platsen för frågor, idéer och felrapporter (diskussionerna på GitHub, på tyska forumet hos drucktipps3d); {{ui:editor.bugReport}} skapar en ZIP-fil för en felrapport; {{ui:dashboard.projectOnGitHub}} leder till projektet på GitHub, och versionsnumret öppnar versionsfakta. Länkarna till kolofon och integritetspolicy tillhör den som driver den kopia av layerling du använder.

### Fokusläge

På en liten skärm ger {{ui:focusMode.enter}} rubrikraden och sidfoten till arbetsytan: knappen med de två pilarna som pekar utåt uppe till höger, [[Ctrl]]+[[Shift]]+[[F]] eller kommandosökningen slår på läget. Verktygsfältet flyttar upp och vyn når ända ned till fönsterkanten. En liten list under verktygsfältet behåller huset till startsidan, flikarna {{ui:editor.modeGeometry}} och {{ui:editor.modeSketch}}, förstoringsglaset, inställningarna och knappen med de två inåtvända pilarna som avslutar fokusläget; dra listen i dess handtag till en annan plats, eller dubbelklicka på handtaget för att sätta tillbaka den. layerling kommer ihåg valet i den aktuella webbläsaren, och när webbläsaren körs i helskärm (F11) växlar den automatiskt till fokusläge.
Listen visar också designens namn; klicka på det för att byta namn utan att lämna fokusläget.

## Din första del

Som exempel bygger vi en kub med ett hål.

1. Klicka på {{ui:editor.addShape}} i verktygsfältet och välj {{ui:shape.box}}. Formen följer nu muspekaren. Ett klick på arbetsytan sätter ned den.
2. Ställ in måtten till höger, till exempel 40 mm lång, 40 mm bred och 20 mm hög.
3. Placera en {{ui:shape.cylinder}} i mitten på samma sätt, 14 mm i diameter och 30 mm hög. Den bör vara högre än kuben så att den går rakt igenom.
4. Markera cylindern och klicka på {{ui:inspector.hole}} till höger. Den blir halvgenomskinlig: soliden har blivit ett verktyg som tar bort material.
5. Markera båda formerna och klicka på {{ui:editor.tool.group}}. Kuben har nu ett hål.

![Cylindern är ett hål och sticker upp ovanför kuben.](shot:hole-before)

![Efter gruppering har kuben ett genomgående hål.](shot:hole-after)

Så här görs borrhål, spår och fickor. Kapitlet [Solider och hål](chapter:solids-and-holes) förklarar det i detalj.

## Nytt sedan ditt senaste besök

När du öppnar layerling igen efter en uppdatering visar ett kort på startsidan vad som har tillkommit sedan ditt senaste besök: varje version sedan dess, med den nyaste först. Efter en längre tids uppehåll rullar du ned i kortet. Nedtill lägger {{ui:whatsNew.earlier}} även till versionerna från före ditt senaste besök. Stäng kortet med {{ui:whatsNew.dismiss}} så håller det sig borta tills nästa uppdatering kommer. {{ui:whatsNew.footerLink}} i sidfoten på startsidan visar de senaste nyheterna igen när som helst. I redigeraren öppnar knappen {{ui:whatsNew.footerLink}} bredvid {{ui:editor.guide}} uppe till höger, eller kommandosökningen, samma lista; den ligger kvar bredvid designen medan du provar nyheterna. Webbläsaren kommer ihåg vilken version du såg senast, och ingen information om dig lämnar datorn.

Ibland står ett andra kort ovanför: ett meddelande från layerlings upphovsman, till exempel om ett uppehåll då svar dröjer längre. Det visas bara under de dagar det är tänkt för, och {{ui:whatsNew.dismiss}} tar bort det.

På en kopia av layerling på din egen dator eller server har meddelandet om tillgänglig uppdatering en knapp, {{ui:update.previewShow}}, som visar vad uppdateringen innehåller innan du installerar den. Listan hämtas från GitHub först när du trycker på knappen.

## Från design till utskrift

När din del är klar klickar du på {{ui:editor.export}}, väljer STL eller 3MF och laddar ned filen. Öppna den i din slicer, till exempel Bambu Studio, PrusaSlicer, OrcaSlicer eller Cura. Om du väljer din skrivare i inställningarna ser du redan medan du ritar om delen får plats på byggplattan. Läs mer i [Utskrift](chapter:printing).

> **Tips:** Om du kommer från Tinkercad känner du igen dig direkt: platta, former, solid och hål, gruppera, justera och spegla fungerar nästan likadant. Det nya är framför allt att fasa och avrunda kanter, gröpa ur kroppar, gängor och skisser. Dina egna Tinkercad-designer kan följa med också, se [Filer, lagring och delning](chapter:files-and-saving).
