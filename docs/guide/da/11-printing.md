---
title: Forberedelse til 3D-print
summary: Vælg din egen printer, bliv advaret når noget ikke passer, og læg delen rigtigt.
---

## Vælg din printer

Åbn indstillingerne (tandhjulet i titellinjen, {{ui:editor.workspaceSettings}}) og skift til området {{ui:workspace.workplane}}. Under {{ui:workspace.printer}} vælger du din printer fra en liste på over 230 almindelige modeller, herunder Bambu Lab, Prusa, Creality, Anycubic, Elegoo og mange flere.

![Arbejdsplan-indstillingerne med en printer valgt. Printleje og maksimale printhøjde kommer fra slicer-profilen.](shot:settings-workplane)

Tre ting sker:

- Arbejdsplanet får størrelsen af printlejet.
- I arbejdsplanets hjørne vises printerens navn og dens byggevolumen. Hvis teksten er i vejen, så slå den fra med {{ui:workspace.showPlateLabels}} under {{ui:workspace.workplane}}; det gælder også designets navn forrest til venstre.
- layerling **advarer** når noget ikke passer.

Printerprofilerne kommer fra OrcaSlicer, så de er de samme som din slicer kender. Hvis du hellere vil arbejde uden en printer, vælg {{ui:workspace.printerNone}}. Du kan også sætte arbejdsplanets størrelse i hånden.

Deltaprintere som dem fra FLSun eller SeeMeCNC eller Anycubic Predator printer på en rund plade. Med en af dem er arbejdsfladen også rund, lige så bred som pladen, og et legeme er for stort, så snart det rækker ud over kanten. Et rundt legeme måles efter sit eget omrids, ikke efter kassen omkring det, så en cylinder næsten lige så bred som pladen passer stadig.

## Når noget ikke passer

En form der stikker ud over kanten af printpladen markeres. En besked fortæller dig hvilke sider der stikker ud og med hvor meget. Det samme gælder hvis delen er **for høj**: højden tæller fra den laveste form, ligesom sliceren sætter modellen ned.

![Kassen er bredere end Bambu Lab A1 minis printleje. Beskeden for neden siger med hvor meget.](shot:printer-overhang)

Advarslen stopper dig ikke fra at arbejde videre. Det er et tip så du ikke først opdager i sliceren at delen er for stor. En del der er for stor kan ofte deles: skær den over med {{ui:editor.tool.split}} og print begge halvdele hver for sig.

Har du med vilje parkeret dele ved siden af pladen, så klik på det lille kryds i beskeden. Advarslen forsvinder så for netop de former. Når en af dem igen passerer, og du flytter den ud senere, eller en anden form stikker ud, kommer beskeden tilbage. Skjulte former tæller aldrig med, så det virker også at skjule de parkerede dele.

## Læg delen rigtigt

Hvordan en del ligger på pladen bestemmer dens styrke og udseende. To værktøjer i området {{ui:editor.group.arrange}} hjælper:

- {{ui:editor.tool.layFlat}}: klik en flade og delen ligger med den side nedad. Den bedste printretning i ét klik.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): sætter delen på arbejdsplanet når den svæver et sted i luften.

Et par tommelfingerregler for retning:

- Store flade sider nedad. De hæfter bedst.
- Læg lange, belastede dele så lagene ikke løber vinkelret på belastningen. Lag er den svageste retning.
- Undgå overhæng stejlere end 45°, eller giv dem støtte i sliceren.

## Find overhæng

I menuen ved siden af øjet ({{ui:editor.group.visibility}}) slår **Vis overhæng** overhængene til. Hver flade der peger nedad stejlere end 45° skraveres så rød og hvid - det er der printeren ville have brug for støtte. Hvad der hviler på pladen forbliver klart. Så ser du mens du designer om en kugle, en bue eller et vandret hul printer uden støtte; [dråbehullet](chapter:threads-and-mechanics) er lavet netop til det. Vend delen eller læg den på en anden flade med {{ui:editor.tool.layFlat}}, og skraveringen følger med det samme.

Hvor stejlt din printer klarer sættes i indstillingerne under {{ui:workspace.appearance}}: fra 30° (forsigtig) til 70° (for printere med god delkøling). En flade der hviler på en anden form markeres stadig - layerling kigger kun på selve fladen.

## Støtteribber til en skrå del

En del, der printes skråt på en kant, for eksempel ved 45°, behøver ofte ingen støtter: dens flader er stejle nok. Men den står på en smal kant og kan vælte. {{ui:supportRib.title}} holder den: under dens nederste flade står en tynd ribbe med lidt afstand på en oval fod, og bittesmå broer holder delen fast. Vend først delen om på kanten, og lad den stå på pladen.

1. Vælg delen og klik {{ui:supportRib.title}} i gruppen {{ui:editor.group.modify}} i båndet, højreklik på delen, eller find den med [[Ctrl]]+[[K]].
2. Klik den nederste flade, hvor ribben skal stå. Fladen skal vende nedad, hælde mellem 15° og 75° og nå ned til pladen; ribben står fra dit klik lige ned ad fladen.
3. Indstil {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} og {{ui:supportRib.firstLayer}} som i din slicer. Ribben er to dysebaner tyk, afstanden til delen en halv bane; hver bro er én bane bred og præcis ét lag høj og ligger på et lag i printet, så sliceren printer den som én tynd bane, der knækker rent af. {{ui:supportRib.height}} er, hvor højt ribben når op ad fladen (først halvvejs), {{ui:supportRib.bridgeSpacing}}, hvor langt broerne ligger fra hinanden, i hele lag.
4. Under {{ui:supportRib.more}} kan tykkelsen, afstanden, broernes bredde og fodens tykkelse sættes i hånden (indtil da følger de dysen og lagene), og også fodens bredde og afrundingerne ved foden og foroven.
5. {{ui:supportRib.apply}} tilføjer ribben. Med {{ui:supportRib.bundle}} (først slået til) er ribbe og del bundtet: de flytter sig sammen og kommer som to former side om side i sliceren, forbundet af broerne i printet.

Ribben er en mesh-form: for at ændre den sletter du den og laver den igen. Hvert klik laver én ribbe; for flere klik {{ui:supportRib.repick}} eller gentag den med {{ui:editor.tool.array}}. Ribben må ingen steder gå ind i delen, og delen skal stå på pladen - ellers siger vinduet hvorfor. Dine indstillinger gemmes i denne browser til den næste ribbe.

## Vægtykkelse, frirum og faser

- Vægge bør være mindst to ekstruderingslinjer brede, så 0,8 mm med en 0,4 mm dyse. Robuste dele har brug for 1,2 til 2 mm.
- Hvor to dele passer ind i hinanden har du brug for frirum: normalt 0,2 til 0,4 mm, afhængigt af printeren. Lav et lille testpar før du printer den store del.
- Mange mennesker faser let den nederste kant der sidder på pladen. Det forhindrer det første lag i at flyde ud ("elefantfod").

## Din printers spillerum: pasprøven

Hver printer printer huller lidt mindre og stifter lidt tykkere, end de er tegnet, hver med sit eget mål. Det spillerum, to printede dele har brug for, er derfor først et gæt. Mål det hellere én gang: i indstillingerne under {{ui:workspace.workplane}} lægger {{ui:workspace.fitTestMake}} en pasprøve på pladen. Det er en plade på 60 × 20 × 4 mm med syv huller til én stift på 5 mm, hvert tegnet som 5 mm plus to gange 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 eller 0,40 mm, med værdien hævet ved siden af, og selve stiften på 5 mm, der står ved siden af pladen med en lille fas foroven. Den består af almindelige former, så den printes sammen med resten af pladen, uden support.

Print den, som den ligger, og stik så stiften med fasen forrest ind i hullerne, det snævreste først. **Det snævreste hul, som stiften stadig kan dreje i,** giver din printers spillerum. Skriv tallet under {{ui:workspace.printerPlay}}, eller klik på det blandt værdierne under feltet. Spillerummet gælder pr. side, i millimeter, og browseren gemmer det for alle designs; et tomt felt betyder ikke målt.
Med flere printere vælger du først den, du printer på, under {{ui:workspace.printer}}: hver printer har sit eget spillerum, og nye brug starter fra spillerummet for den printer, designet er sat til. En printer uden sit eget bruger spillerummet, der blev sat, mens ingen printer var valgt.

Fra da af starter nye anvendelser med spillerummet i stedet for den indbyggede værdi: {{ui:lid.gap}} og {{ui:lid.hingePinPlay}} i værktøjet {{ui:editor.tool.lid}}, spillerummet for en ny {{ui:shape.dovetail}} og {{ui:shape.snapFit}}, {{ui:prop.clearance}} for en ny møtrik eller et nyt gevindhul – det dobbelte spillerum, da det er pladsen over hele diameteren – og {{ui:clearance.threshold}} i {{ui:editor.tool.clearance}}. Det samme gælder {{ui:split.connectorClearance}} for dyvler, tappe og svalehaler i {{ui:editor.tool.split}}. Så længe et sådant felt stadig har den værdi, siger "{{ui:printerPlay.fromFitTest}}" ved siden af, hvor tallet kommer fra. Et hængsel, der printes i ét stykke, og leddene fra værktøjet {{ui:editor.tool.flexi}} beholder deres 0,4 mm: printet i ét stykke skal deres spalter også holdes åbne mellem lagene, og det måler en stift, der er printet for sig, ikke. Plads til at presse en magnet eller en Gridfinity-nøgle i og plads til et købt stik eller print beholder også deres egne værdier. Legemer, der allerede er i et design, ændrer sig aldrig, og det gør et design, du åbner, heller ikke.

## Tjek printet

{{ui:editor.tool.printCheck}} ved siden af {{ui:editor.tool.clearance}} under {{ui:editor.group.combine}} ser på de valgte objekter, eller på alle synlige, når intet er valgt, og fortæller i ét vindue, hvad der ville gå galt ved print. Hver af dets fem linjer er grøn, når den intet fandt, og orange med hvad og hvor, når den fandt noget:

- **{{ui:printCheck.thin.title}}**: steder tyndere end to linjer fra dysen - 0,8 mm med en 0,4 mm dyse. Sliceren udelader sådan en væg eller printer den som én svag linje. Vælg din dyse under {{ui:printCheck.nozzle}} øverst i vinduet (0,2 til 0,8 med ét klik, enhver anden i feltet). De tynde steder males røde med et lyst gitter på legemerne, og linjen nævner det tyndeste sted og hvor meget overflade der er for tyndt. Steder under 1 mm² og skarpe kanter, som kanten på en kile, tælles ikke med.
- **{{ui:printCheck.floating.title}}**: et legeme, eller en adskilt del af et, der hverken rører pladen eller en anden del (inden for 0,05 mm). Det ville blive printet i luften. En del, der hviler på en stående del, er i orden.
- **{{ui:printCheck.contact.title}}**: en del på pladen, hvis første lag er meget lille i forhold til dens højde, som en kugle eller en kegle på spidsen. Den kan løsne sig under printet. Tjekket advarer under 0,5 mm² standflade, målt 0,1 mm over pladen, pr. millimeter højde: en kugle ligger altid under, en terning på 10 mm har 10.
- **{{ui:printCheck.overhang.title}}**: de samme tal som **Vis overhæng**, med den vinkel der er sat der.
- **{{ui:printCheck.openMesh.title}}**: et importeret mesh med åbne kanter, eller kanter som tre eller flere flader deler. Sliceren må så gætte, hvor indersiden er.

![En bakke, hvis højre væg kun er 0,6 mm tyk: Tjek print maler den rød og nævner den i vinduet.](shot:print-check)

{{ui:printCheck.show}} ved en linje fører kameraet derhen; den vælger de svævende dele, dem med lille kontakt og de åbne mesh, og ved overhængene slår den **Vis overhæng** til. Legemer, der overlapper, tjekkes samlet, som sliceren samler dem. Ændrer du modellen, mens vinduet er åbent, står der {{ui:printCheck.stale}}; klik på det eller på {{ui:printCheck.checkAgain}}. [[Esc]] lukker vinduet. Intet i modellen ændres. En AI laver samme tjek med `layerling_check_print`.

## Når du er klar

Vælg {{ui:editor.export}} og så **STL** eller **3MF**. STL er det simpleste format. 3MF bevarer navne og farver på de enkelte former og er derfor praktisk når du printer i flere farver. Eksportvinduet viser også hvor mange gram og meter filament delen ville bruge printet som solid. Mere i [Filer og lagring](chapter:files-and-saving).
