---
title: Kom godt i gang
summary: Fra en tom plade til din første del til 3D-printeren, på fem minutter, uden konto og uden at installere noget.
---

layerling er et designprogram til 3D-print der kører direkte i din browser. Du bygger en del af enkle former, skærer huller i den, runder kanterne og sender den til din slicer. Der er intet at installere og intet at oprette konto til. Det du bygger bliver på din computer.

![layerlings startside: "Opret nyt 3D-design" øverst, dine designs og den hurtige vejledning nedenunder.](shot:start-page)

## Opret et design

Åbn [layerling.com](https://layerling.com/). Klik på {{ui:dashboard.createDesign}} på startsiden. Editoren åbner med et tomt arbejdsplan, det gitter som alt tager form på.

Har du allerede en fil du vil fortsætte med, så brug {{ui:dashboard.importGeometry}}. Det virker for layerling-designs (`.lyl`) samt STL-, OBJ-, 3MF-, STEP- eller SVG-filer.

Alle dine designs vises senere på startsiden med et forhåndsbillede. De gemmes i din browsers lager og gemmes automatisk efter hver ændring, så der er ingen gem-knap. Hvordan du pakker designs i en fil og giver dem videre er dækket i [Filer og lagring](chapter:files-and-saving). Hvis du ønsker en påmindelse, så slå {{ui:workspace.confirmTabClose}} til i indstillingerne (tandhjulet i båndet): Browseren spørger så, før en fane med et åbent design lukkes eller genindlæses.
Men sikkerhedskopiér dine designs ind imellem: en browser kan fejle, og en browseropdatering kan give problemer, og **layerling påtager sig intet ansvar for designs, der opbevares i browseren.** Det gør du fra startsiden med {{ui:dashboard.backupAll}}, eller du gemmer designs som filer. En sikkerhedskopi hentes tilbage med {{ui:dashboard.restoreBackup}}.

## Editoren overblik

![Editoren med to former på arbejdsplanet. Båndet øverst, kamerakontrollerne til venstre, indstillingerne for den valgte form til højre.](shot:editor-overview)

- **Øverst** er båndet. Det er sorteret efter opgave: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} og {{ui:editor.group.help}}. Hold musen over et ikon for at se dets navn. Hvor du ser et lille spørgsmålstegn, for eksempel i en forms indstillinger, i formbiblioteket eller i værktøjspanelerne, fører det direkte til det tilsvarende kapitel i denne vejledning.
- **I midten** ligger arbejdsplanet. Det er her du placerer former, trækker dem i form og ser resultatet.
- **Til højre** vises indstillingerne for den valgte form: farve, dimensioner, position og hvad ellers der udgør formen. At taste tal er mere nøjagtigt end at trække.
- **Til venstre** er kamerakontrollerne med visningskuben over dem. De flytter dig rundt i scenen, mere i [Visning og arbejdsplan](chapter:view-and-workplane).
- **Øverst oppe** skifter du mellem {{ui:editor.modeGeometry}} og {{ui:editor.modeSketch}}, omdøber designet og vælger sprog og farveskema.

## Knapperne rundt om arbejdsområdet

Hold musen over en knap for at se dens navn. Er du i tvivl om, hvad en knap gør, så klik i området {{ui:editor.group.help}} på {{ui:interactiveHelp.title}} ([[Shift]]+[[F1]]) og derefter på knappen. Her står dem, der spørges mest om.

### Indsæt

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) sætter det ind i designet, du kopierede med {{ui:editor.tool.copy}}. {{ui:common.duplicate}} kopierer og sætter ind i ét trin. Når du indsætter, lægger hver del sig lidt ved siden af, hvor den var. Dele der kommer fra et andet program kan lande langt fra pladen, og til dem er der {{ui:workspace.pasteCentered}} i indstillingerne, under {{ui:workspace.appearance}}: så indsættes delene sammen midt på arbejdsplanet og lægges ned på det.

### Slet

{{ui:common.delete}} ([[Delete]]) fjerner de valgte former. {{ui:editor.tool.undo}} henter dem tilbage.

### Opdel gruppe

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) skiller den valgte gruppe igen ad i de former, den blev lavet af.

### Arbejdsområdeindstillinger

{{ui:editor.workspaceSettings}} åbner indstillingerne for arbejdsområdet: enhed, pladens størrelse, printer, gitter, farver, lys og mere. Mere i [Visning og arbejdsplan](chapter:view-and-workplane).

### Farveskema

{{ui:common.theme}} helt øverst bestemmer, hvordan layerling ser ud: som dit system, lyst, mørkt eller grafit.

### Omdøb design

{{ui:editor.renameProject}}: blyanten ved siden af navnet helt øverst. Skriv det nye navn og tryk [[Enter]].

### Designnavn

Designets navn ({{ui:confirm.projectName}}) står helt øverst. Klik på det, skriv, og [[Enter]] beholder navnet.

### Visningsmuligheder

{{ui:editor.visibilityOptions}}, pilen ved siden af øjet, rummer det, du kan vise eller skjule: listen over objekter, alt du har skjult, noterne og udhænget i printet. Mere i [Vælg og arranger](chapter:select-and-arrange).

### Skjul valgte

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) skjuler de valgte former. De bliver i designet og i objektlisten; {{ui:editor.visibilityOptions}} viser dem igen.

### Søg efter kommandoer

{{ui:palette.open}}: skriv, hvad du leder efter, et værktøj, en form eller en indstilling, og klik på resultatet.

### Skjul kamerakontroller

{{ui:camera.hide}} folder kamerastyringen til venstre væk og giver arbejdsområdet mere plads; {{ui:camera.show}} henter den tilbage.

### Snap til gitter

{{ui:inspector.snapGrid}} nederst i egenskaberne er det trin, flytning og størrelsesændring fanger på. Ved siden af ændrer den lille kontakt **mm | in** enheden. Mere i [Visning og arbejdsplan](chapter:view-and-workplane).

### Enhed: millimeter eller tommer

Kontakten **mm | in** ved siden af {{ui:inspector.snapGrid}} ændrer enheden, pladens gitter og fangtrinnet for dette design.

### Sidefoden

Nederst i vinduet: {{ui:dashboard.sponsor}} fører til siden, hvor du kan støtte projektet; {{ui:dashboard.userGuide}} åbner denne vejledning; {{ui:dashboard.forum}} fører til stedet for spørgsmål, idéer og fejlrapporter (diskussionerne på GitHub, på tysk forummet hos drucktipps3d); {{ui:editor.bugReport}} laver en ZIP til en fejlrapport; {{ui:dashboard.projectOnGitHub}} fører til projektet på GitHub, og versionsnummeret åbner udgivelsesnoterne. Linkene til impressum og privatlivspolitik hører til den, der driver den kopi af layerling, du bruger.

## Din første del

Som eksempel bygger vi en kasse med et hul.

1. Klik på {{ui:editor.addShape}} i båndet og vælg {{ui:shape.box}}. Formen hænger nu på din musemarkør. Et klik på arbejdsplanet sætter den ned.
2. Indstil dimensionerne til højre, for eksempel 40 mm lang, 40 mm bred og 20 mm høj.
3. Placer en {{ui:shape.cylinder}} i midten på samme måde, 14 mm tværs over og 30 mm høj. Den skal være højere end kassen så den når hele vejen igennem.
4. Vælg cylinderen og klik på {{ui:inspector.hole}} til højre. Den bliver gennemsigtig: den faste form er blevet et værktøj der fjerner materiale.
5. Vælg begge former og klik på {{ui:editor.tool.group}}. Kassen har nu et hul.

![Cylinderen er et hul og stikker ud af toppen af kassen.](shot:hole-before)

![Efter gruppering har kassen et borehul.](shot:hole-after)

Sådan laves borehuller, slidser og lommer. Kapitlet [Solider og huller](chapter:solids-and-holes) forklarer det i detaljer.

## Nyt siden dit seneste besøg

Når du åbner layerling igen efter en opdatering, viser et kort på startsiden hvad der er tilføjet siden du var her sidst: hver version siden da, den nyeste først. Efter et langt fravær scroller du ned i kortet. Nedenunder tilføjer {{ui:whatsNew.earlier}} også versionerne fra før dit seneste besøg. Luk det med {{ui:whatsNew.dismiss}} og det forbliver væk indtil næste opdatering. {{ui:whatsNew.footerLink}} i sidefoden på startsiden viser de seneste tilføjelser igen til enhver tid. Browseren husker den seneste version du så, og intet om dig forlader den.

På en kopi af layerling på din egen computer eller server har meddelelsen "Opdatering tilgængelig" en knap, {{ui:update.previewShow}}, der viser hvad opdateringen bringer før du installerer den. Listen hentes fra GitHub først når du trykker på knappen.

## Fra design til print

Når din del er færdig, klik på {{ui:editor.export}}, vælg STL eller 3MF og download filen. Åbn den i din slicer, for eksempel Bambu Studio, PrusaSlicer, OrcaSlicer eller Cura. Hvis du vælger din printer i indstillingerne, kan du mens du bygger se om delen passer på printlejet. Mere i [Printning](chapter:printing).

> **Tip:** Hvis du kommer fra Tinkercad finder du hurtigt rundt: plade, former, solid og hul, gruppér, justér og spejl virker næsten ens. Det nye er mest fas og rund, udhuling, gevind og skitser. Dine egne Tinkercad-designs kan også komme med, se [Filer, lagring og deling](chapter:files-and-saving).
