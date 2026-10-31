---
title: Forberedelse til 3D-print
summary: Vælg din egen printer, bliv advaret når noget ikke passer, og læg delen rigtigt.
---

## Vælg din printer

Åbn indstillingerne (tandhjulet i båndet, {{ui:editor.workspaceSettings}}) og skift til området {{ui:workspace.workplane}}. Under {{ui:workspace.printer}} vælger du din printer fra en liste på over 230 almindelige modeller, herunder Bambu Lab, Prusa, Creality, Anycubic, Elegoo og mange flere.

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

## Vægtykkelse, frirum og faser

- Vægge bør være mindst to ekstruderingslinjer brede, så 0,8 mm med en 0,4 mm dyse. Robuste dele har brug for 1,2 til 2 mm.
- Hvor to dele passer ind i hinanden har du brug for frirum: normalt 0,2 til 0,4 mm, afhængigt af printeren. Lav et lille testpar før du printer den store del.
- Mange mennesker faser let den nederste kant der sidder på pladen. Det forhindrer det første lag i at flyde ud ("elefantfod").

## Når du er klar

Vælg {{ui:editor.export}} og så **STL** eller **3MF**. STL er det simpleste format. 3MF bevarer navne og farver på de enkelte former og er derfor praktisk når du printer i flere farver. Eksportvinduet viser også hvor mange gram og meter filament delen ville bruge printet som solid. Mere i [Filer og lagring](chapter:files-and-saving).
