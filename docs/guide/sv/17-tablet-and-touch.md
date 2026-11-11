---
title: Surfplatta och pekskärm
summary: Arbeta med fingrar eller pekpenna: markera flera kroppar, vrida och zooma vyn, långtrycksmenyn och vad som gäller på iPad.
---

## Fingrar och pekpenna

layerling fungerar i webbläsaren på en surfplatta och som app från hemskärmen. Ett finger gör samma sak som vänster musknapp. Tre saker som saknas på en surfplatta – höger musknapp, Skift-tangent och mushjul – har fått egna lösningar:

| Du vill | På surfplatta |
| --- | --- |
| Markera en kropp | Tryck på den. |
| Markera flera kroppar | Tryck på en kropp: en rund knapp dyker upp nere till vänster. Tryck på den så läggs varje kropp du trycker på därefter till i markeringen; ett nytt tryck på en markerad kropp tar bort den igen. Ett tryck på tom yta ändrar inget; ett andra tryck på knappen avslutar läget och rensar markeringen. Eller håll ett finger stilla i en halv sekund, välj {{ui:contextMenu.selectMultiple}} och tryck på kropparna en efter en. |
| Markera alla kroppar | Håll ett finger stilla på tom yta i en halv sekund och välj {{ui:contextMenu.selectAll}}. |
| Öppna högerklicksmenyn | Håll ett finger stilla på en kropp eller på tom yta i en halv sekund. |
| Flytta en kropp | Dra i den. |
| Ändra storlek, vrida eller lyfta en kropp | Dra i handtagen, de små kvadraterna och pilarna runt kroppen. Ett finger fångar dem även lite vid sidan av. |
| Vrida vyn | Ett finger på tom yta, eller dra i vykuben. |
| Zooma vyn | Två fingrar: för isär för att komma närmare, nyp ihop för att gå längre ifrån. |
| Flytta vyn | Dra två fingrar tillsammans över skärmen. |
| Rensa markeringen | Tryck på tom yta. Dock inte medan {{ui:camera.touchRotate}} är påslaget, då ett finger vrider vyn; och i {{ui:contextMenu.selectMultiple}} avslutar det första trycket på tom yta bara läget utan att släppa markeringen, först nästa rensar den. |

## Markera flera kroppar

Utan en Skift-tangent gör {{ui:contextMenu.selectMultiple}} i långtrycksmenyn samma sak som Skift+klick på en dator. Medan läget är aktivt visas ett meddelande, och varje tryck på en kropp lägger till den eller tar bort den ur markeringen. Ett tryck på tom yta, eller [[Esc]] på ett tangentbord, avslutar läget och behåller markeringen. Ett finger på tom yta vrider fortfarande vyn under tiden. Därefter kan {{ui:editor.tool.group}}, {{ui:editor.tool.align}} eller en flytt användas på alla kroppar du valt.

Samma meny har {{ui:contextMenu.carry}}, motsvarigheten till [[C]] för pekskärm. Markeringen följer då fingret över ytorna på andra kroppar; ett tryck sätter ned den på ytan du pekar på, även en lutande yta, och det första trycket räcker. Menyposten hittas också genom att söka på ”sätt ned” eller ”cruise” (kommandosökningen, [[Ctrl]]+[[K]] på ett tangentbord).

## Vrida och zooma vyn

Ett finger på tom yta vrider vyn, två fingrar zoomar och flyttar den. Ett finger som börjar på en kropp arbetar på kroppen, inte på vyn. Vill du hellre att det ska vrida vyn slår du på {{ui:camera.touchRotate}} i vyfältet: då vrider ett finger alltid vyn i stället för att markera, var det än startar. Den knappen visas bara på enheter med pekskärm.

Vykuben uppe till vänster vrider vyn när du drar i den, och ett tryck på någon av dess sidor, hörn eller kanter hoppar dit. Se [Vy och arbetsyta](chapter:view-and-workplane).

## Handtag, små punkter och pekpenna

En fingertopp skymmer det man siktar på. layerling låter ett finger fånga handtag, punkter, linjer och kanter på något längre håll än en muspekare, men en pekpenna är ändå mer exakt. Det gäller en aktiv penna som surfplattan känner igen som penna, till exempel Apple Pencil eller S Pen. En vanlig penna med gummispets räknas av skärmen som ett finger och blir inte mer finmaskig än ett sådant, så arbeta med den som med ett finger. En Apple Pencil som svävar strax ovanför skärmen på en iPad visar också namnet på en knapp efter ett ögonblick i en liten bubbla, precis som en muspekare med verktygstips.

I skissläget ritar {{ui:sketch.freehand}} med pennan eller ett finger som på papper; när du lyfter spetsen omvandlas strecket till redigerbara skiss-punkter, se [Skisser](chapter:sketches).

Om kroppar glider iväg när barn eller hastiga händer råkar nudda dem slår du på {{ui:workspace.selectBeforeMoving}} i inställningarna: då måste en kropp markeras först innan nästa dragning flyttar den.

## På iPad eller iPhone

- **Installera som app.** Tryck på Dela-ikonen i Safari och välj ”Lägg till på hemskärmen”. Appen öppnas i ett eget fönster utan adressfält och fungerar utan uppkoppling, se [Offline och installera](chapter:offline-and-install).
- **Dina designer bor i webbläsaren** (om du inte driver layerling själv med en servermapp). Det finns inget konto och inget laddas upp. Safari har en egen regel mot spårning: allt som en webbplats sparat raderas efter sju dagar utan att du besökt den i Safari. En webbapp som lagts till på hemskärmen är undantagen från den regeln, enligt WebKits dokumentation. Det är ännu ett skäl att använda appen från hemskärmen och att säkerhetskopiera viktiga arbeten: {{ui:dashboard.backupAll}} på startsidan packar alla designer i en enda fil.
- **Filer.** Safari låter bara en webbsida skriva filer via nedladdning, så {{ui:editor.export}} sparar filen i Hämtade filer i appen Filer, och [[Ctrl]]+[[S]] på ett tangentbord laddar ned den på nytt; se [Filer och lagring](chapter:files-and-saving).
- **Inget tangentbord behövs.** Varje verktyg har en knapp i verktygsfältet, och ett sifferfält öppnar skärmtangentbordet. Med ett tangentbord på iPad fungerar även [kortkommandona](chapter:shortcuts). En måttruta bredvid en kropp öppnar sitt sifferfält vid andra trycket: första trycket markerar bara rutan så att ett råkat tryck inte fäller upp tangentbordet i onödan.

## Workshoppar med barn

Fingrar och pennor med gummispets fungerar likadant här. Två inställningar underlättar ett lektionspass: {{ui:workspace.selectBeforeMoving}} så att en beröring inte flyttar en kropp av misstag, och {{ui:camera.touchRotate}} så att ett finger alltid vrider vyn. Frågetecknet i gruppen Hjälp i verktygsfältet slår på {{ui:interactiveHelp.title}}: ett tryck på vilken knapp, fält eller handtag som helst förklarar den, och samma knapp eller [[Esc]] stänger hjälpen igen.

För en hel klass kan du slå på {{ui:workspace.simpleMode}} i inställningarna. Verktygsfältet behåller då bara de verktyg som en workshop använder (kopiera, klistra in, duplicera, ta bort, ångra, gruppera, spegla, fasa, avrunda, gröp ur, justera, exportera), formbiblioteket blir en kort lista, knapparna blir större och startsidan visar bara designerna och inget annat: inga nyheter, ingen välkomsttext, inga hjälprutor och inga länkar ut från layerling. Du slår på läget med ett tryck och stänger av det genom att hålla ned ersättningsknappen i två sekunder. En länk som slutar på `?mode=simple` slår på det för enheten som öppnar länken, och `?mode=full` stänger av det igen. Den som driver layerling på en server kan starta alla i läget med `LAYERLING_SIMPLE_MODE=true`, eller låsa det för alla med `always`, så att programmet saknar knapp för att lämna det; se README.
