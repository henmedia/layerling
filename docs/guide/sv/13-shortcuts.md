---
title: Kortkommandon
summary: Alla tangenter i korthet, hämtade direkt från programmet så att listan alltid stämmer.
---

Kortkommandona fungerar så länge arbetsytan har fokus. Medan du skriver i ett textfält håller de sig ur vägen. På Mac gäller [[Cmd]] överallt där [[Ctrl]] står angivet här.

I redigeraren öppnar {{ui:editor.keyboardShortcuts}} under {{ui:editor.group.help}} samma lista i ett fönster. Skrivarknappen i fönstret ({{ui:shortcuts.print}}) skriver ut själva listan, svart på vitt, hela översikten på ena sidan av ett A4- eller Letter-ark i tre spalter, perfekt att ha nära till hands; webbläsarens utskriftsdialog låter dig även spara den som PDF.

Sökrutan längst upp i fönstret filtrerar listan: den behåller bara de kortkommandon vars beskrivning, grupp eller tangenter innehåller varje ord du skriver, så ”avrunda” eller ”ctrl+z” visar bara de raderna. Versaler och accenttecken spelar ingen roll, och en enstaka bokstav eller siffra hittar både den tangenten och ord som börjar med den. Krysset i slutet av fältet tömmer rutan så att hela listan kommer tillbaka. Skrivarknappen skriver ut det som fönstret visar, så efter en sökning skrivs bara de hittade kortkommandona ut.

![Fönstret med kortkommandon i redigeraren.](shot:shortcuts)

## Kommandosökning

Hittar du inte ett verktyg? Tryck [[Ctrl]]+[[K]] eller klicka på förstoringsglaset i området {{ui:editor.group.help}} och skriv vad du letar efter: ett verktyg (”avrundning”, ”spegla”), en form (”cylinder”) eller ett kommando (”exportera”, ”ångra”). Flytta markeringen med piltangenterna och tryck [[Enter]], eller klicka på posten.

- Sökningen förstår både svenska, engelska och tyska ord och bryr sig inte om versaler eller prickar: ”aushoehlen” hittar {{ui:editor.tool.hollow}}.
- Varje rad visar vilka tangenter som gör samma sak och vilken grupp i verktygsfältet verktyget bor i, så att du lär dig var det finns.
- Poster som är nedtonade kan inte köras just nu, oftast för att inget är markerat. De ligger ändå kvar i listan så att sökningen alltid visar var verktyget finns.

Handboken du läser har också en sökruta högst upp på varje sida: skriv ett ord eller två så listar den avsnitten där alla orden förekommer, med träffarna markerade. Klicka på en träff, eller tryck [[Enter]] för den första, för att hoppa direkt dit. Sidan som öppnas markerar varje ställe där dina ord står och rullar ned till första träffen i avsnittet; [[Esc]] eller ett klick på en markering rensar markeringarna.

- Namnet på en form lägger till formen på arbetsytan, precis som ett klick i formmenyn.
- När fältet är tomt listar sökningen de kommandon du använde senast överst.
- Namnet på en kropp i din design hittar kroppen och markerar den, vilket är praktiskt i designer med många delar. Kroppar dyker upp först när du börjar skriva.
- En egen form som du har sparat hittas också på sitt namn när du skriver, och ett klick sätter in den i designen precis som via formpanelen.
- Det fungerar i skissläget också, med skissverktygen.

## Egna tangenter

Vilket kommando som helst i kommandosökningen kan läggas på en egen tangent: ett verktyg du använder jämt, en form, {{ui:editor.tool.centerOnWorkplane}} eller {{ui:palette.openShapes}}.

1. Öppna {{ui:editor.keyboardShortcuts}} och klicka på {{ui:customKeys.add}} under {{ui:customKeys.title}} överst i fönstret.
2. Skriv några bokstäver ur kommandot och klicka på det, eller tryck [[Enter]] för det översta.
3. Tryck ned tangenten du vill använda, ensam eller ihop med [[Ctrl]], [[Alt]] eller [[Shift]]. Bokstäver, siffror och F1 till F12 kan ta ett kommando.

En tangent som redigeraren redan använder, som webbläsaren reserverar för sig själv (som [[Ctrl]]+[[W]]) eller som redan har ett av dina egna kommandon nekas, och fönstret berättar vad den gör. Klicka på en tangent i listan för att byta den, krysset bredvid för att ta bort den, eller {{ui:customKeys.removeAll}} för att börja om.

- Tangenten kör kommandot på samma sätt som kommandosökningen. Om det inte går just nu, oftast för att inget är markerat, talar statusraden om det.
- Dina tangenter visas bredvid sina kommandon i kommandosökningen och på den utskrivna listan.
- De sparas i den här webbläsaren, precis som färgtemat. En tangent för ett skissverktyg gäller i skissläget, en för 3D-redigeraren utanför det.
- Medan du skriver i ett textfält håller sig dina egna tangenter ur vägen precis som alla andra.

## Interaktiv hjälp

Hittar du inte var det står om en knapp eller ett fält? Låt programmet visa vägen. Klicka på frågetecknet i området {{ui:editor.group.help}}, eller tryck [[Shift]]+[[F1]]. Muspekaren blir ett frågetecken, och det som ligger under den ramas in.

- Klicka på en knapp, ett fält, en omkopplare, ett handtag, en grupp i verktygsfältet eller rubrikraden i ett fönster. Då händer **inte** det som knappen brukar göra. I stället öppnas ett litet fönster med elementets namn, en kort sammanfattning ur rätt avsnitt i den här handboken, upp till två fler ställen där det nämns och knappen {{ui:interactiveHelp.open}}.
- Hjälpen gäller det element du pekade på, inte hela fönstret runt omkring. Ett element utan eget namn använder närmaste namngivna del omkring sig; inuti ett verktygsfönster faller den tillbaka på fönstrets eget frågetecken.
- {{ui:interactiveHelp.open}} öppnar handboken på det avsnittet i en ny flik. Där ramas avsnittet in i färg, från rubriken till slutet, så att du ser precis var det börjar och slutar.
- Om handboken ännu inte säger något om elementet talar fönstret om det och erbjuder {{ui:interactiveHelp.search}}.
- [[Esc]], eller frågetecknet igen, avslutar läget. På en pekskärm finns ingen hovring: ett tryck på ett element öppnar hjälpfönstret direkt.

Fönstret kan flyttas i rubrikraden som de andra fönstren. Programmet hittar rätt avsnitt via elementets namn – etiketten på en knapp eller namnet på ett fält – eftersom den här handboken alltid skriver knappar precis som de heter i programmet. Den använder samma sökindex som sökrutan överst på varje handbokssida, på det språk du har valt, och körs helt i din webbläsare.

{{shortcuts}}
