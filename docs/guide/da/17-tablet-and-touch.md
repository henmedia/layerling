---
title: Tablet og touch
summary: Arbejde med fingre eller en pen: at vælge flere legemer, at dreje og zoome i visningen, menuen ved et langt tryk, og hvad du skal vide på en iPad.
---

## Fingre og pen

layerling kører i browseren på en tablet, og som en app fra hjemmeskærmen. En finger gør det samme som venstre museknap. De tre ting en tablet ikke har, en højre museknap, en Shift-tast og et mus hjul, har hver sin måde:

| Du vil | På en tablet |
| --- | --- |
| Vælge et legeme | Tryk på det. |
| Vælge flere legemer | Tryk på et legeme: en rund knap dukker op nederst til venstre. Tryk på den, og hvert legeme du trykker på bagefter lægges til markeringen; et tryk på et valgt legeme tager det ud igen. Et tryk på tom plads gør intet; et tryk på knappen igen afslutter og rydder markeringen. Eller hold en finger stille i et halvt sekund, vælg {{ui:contextMenu.selectMultiple}}, og tryk så på ét legeme efter det andet. |
| Vælge alle legemer | Hold en finger stille på tom plads i et halvt sekund, og vælg {{ui:contextMenu.selectAll}}. |
| Åbne menuen fra et højreklik | Hold en finger stille på et legeme eller på tom plads i et halvt sekund. |
| Flytte et legeme | Træk det. |
| Ændre størrelse på, dreje eller løfte et legeme | Træk i dets håndtag, de små kvadrater og pile omkring det. En finger fanger dem lidt ved siden af. |
| Dreje visningen | Én finger på tom plads, eller træk i visningskuben. |
| Zoome i visningen | To fingre: spred for at komme tættere på, knib for at komme længere væk. |
| Flytte visningen | Skrub to fingre sammen. |
| Rydde markeringen | Tryk på tom plads. Ikke mens {{ui:camera.touchRotate}} er slået til, hvor én finger drejer visningen; og i {{ui:contextMenu.selectMultiple}} afslutter det første tryk på tom plads kun tilstanden og lader markeringen være som den er, det næste rydder den. |

## Vælg flere legemer

Uden en Shift-tast gør {{ui:contextMenu.selectMultiple}} i menuen fra et langt tryk det samme som Shift+klik på en computer. Mens det er slået til, siger en besed det, og hvert tryk på et legeme lægger det til markeringen eller tager det ud igen. Et tryk på tom plads, eller [[Esc]] på et tastatur, afslutter det og lader markeringen være som den er. En finger på tom plads drejer stadig visningen imens. Så virker {{ui:editor.tool.group}}, {{ui:editor.tool.align}} eller en flytning på alle de legemer du valgte.

Den samme menu har {{ui:contextMenu.carry}}, tasten [[C]] til en berøringsskærm. Markeringen følger så fingeren over fladerne på andre legemer; et tryk sætter den ned på den flade du trykker på, også en skrå flade, og det første tryk er nok. Menuposten findes også ved at søge efter "Sæt ned" eller "cruise" (kommandosøgningen, [[Ctrl]]+[[K]] på et tastatur).

## Dreje og zoome i visningen

Én finger på tom plads drejer visningen, to fingre zoomer den og flytter den. En finger der begynder på et legeme arbejder på legemet, ikke på visningen. Vil du hellere have den til at dreje visningen, slår du {{ui:camera.touchRotate}} til i kamerabjælken: én finger drejer så visningen i stedet for at vælge, uanset hvor den begynder. Den kontakt vises kun på en enhed med en berøringsskærm.

Visningskuben øverst til venstre drejer visningen når du trækker i den, og et tryk på en af dens sider, hjørner eller kanter springer til den visning. Se [Visning og arbejdsplan](chapter:view-and-workplane).

## Håndtag, små punkter og en pen

En fingertip dækker det, den sigter efter. layerling lader en finger nå lidt længere ud til håndtag, punkter, linjer og kanter end en musemarkør gør, men en pen er finere. Det gælder en pen, som tabletten kender som en pen, for eksempel en Apple Pencil eller en S Pen. En almindelig pen med gummispids tæller for skærmen som en finger og er ikke finere end en, så arbejd med den som med en finger. En Apple Pencil der svæver over skærmen på en iPad viser også navnet på en kontrol efter et øjeblik, i en lille boble, som musemarkøren gør med et værktøjstip.

Skrider legemer, når børn eller travle hænder rører ved dem, slår du {{ui:workspace.selectBeforeMoving}} til i indstillingerne: et legeme skal så vælges først, og først det næste træk flytter det.

## På en iPad eller iPhone

- **Installér den som en app.** I Safari trykker du på Del-ikonet og vælger "Føj til hjemmeskærm". Appen åbner i sit eget vindue uden adresselinje, og den virker uden forbindelse, se [Offline og installation](chapter:offline-and-install).
- **Dine designs lever i browseren.** Der er ingen konto, og intet uploades. Safari har sin egen regel mod sporing: den sletter det, en hjemmeside har gemt, efter syv dage hvor du ikke har besøgt den i Safari. En webapp lagt på hjemmeskærmen er undtaget fra den regel, som WebKit dokumenterer det. Det er endnu en grund til at bruge appen fra hjemmeskærmen, og til at sikkerhedskopiere vigtigt arbejde: {{ui:dashboard.backupAll}} på startsiden pakker alle designs i én fil.
- **Filer.** Safari lader en side skrive ind i en fil kun via en download, så {{ui:editor.export}} lægger filen i Downloads i Filer-appen, og [[Ctrl]]+[[S]] på et tastatur downloader den igen; se [Filer og lagring](chapter:files-and-saving).
- **Ingen tastatur nødvendigt.** Alle værktøjer har en knap i båndet, og et talfelt åbner skærmtastaturet. Med et tastatur på iPad'en får du [tastaturgenveje](chapter:shortcuts). En værdiboks ved siden af et legeme åbner sit talfelt først ved det andet tryk: det første markerer den kun, så en finger, der ved et uheld rammer den, ikke får tastaturet frem.

## Værksteder med børn

Fingre og penne med gummispids virker ens her. To indstillinger gør en klasse lettere: {{ui:workspace.selectBeforeMoving}}, så et tryk ikke flytter et legeme ved et uheld, og {{ui:camera.touchRotate}}, så én finger altid drejer visningen. Spørgsmålstegn-knappen i Hjælp-gruppen i båndet slår {{ui:interactiveHelp.title}} til: et tryk på en vilkårlig knap, et felt eller et håndtag forklarer det så, og den samme knap, eller [[Esc]], slår den fra.

Til en hel klasse slår du {{ui:workspace.simpleMode}} til i indstillingerne. Båndet beholder så kun de værktøjer, et værksted bruger (kopiér, indsæt, duplikér, slet, fortryd, gruppér, spejl, fas, rund, hul, justér, eksportér), formbiblioteket bliver en kort liste, knapperne bliver større, og startsiden viser designs og intet andet: ingen nyheder, ingen velkomsttekst, ingen hjælpeknapper og ingen links ud af layerling. Det er et tryk at slå den til; det er et tryk holdt i to sekunder på den knap, der så tager dens plads, at slå den fra. Et link der ender med `?mode=simple` slår den til for den enhed der åbner det, `?mode=full` slår den fra igen. Den der kører layerling på en server kan starte alle i den med `LAYERLING_SIMPLE_MODE=true`, eller fastsætte den for alle med `always`, så programmet ingen har en kontakt at slå den fra med; se README.
