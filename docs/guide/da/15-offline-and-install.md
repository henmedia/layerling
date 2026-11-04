---
title: Installér som app, arbejd offline og vær selv vært
summary: Start layerling som et almindeligt program, også uden netværk, og hvordan du kører det på din egen computer.
---

## Installér som app

layerling kan installeres som et almindeligt program. Det får så et ikon og sit eget vindue, uden en adresselinje. Efter det første besøg starter det også **uden internet**. Dine designs bliver på din computer. Det er værd at installere: Appen starter hurtigere, fordi den ikke skal hentes igen hver gang, den virker uden internet og aflaster serveren. Du mister ingenting, for layerling fortæller dig stadig, når der kommer en ny version. Det beskytter også dine designs: Safari på Mac, iPhone og iPad sletter de gemte data fra et websted, der ikke har været besøgt i syv dage, men ikke fra en installeret app.

På startsiden vises et tip med {{ui:installHint.install}} hvis din browser kan gøre det. Ellers:

- **Chrome og Edge:** Klik installer-ikonet til højre for adresselinjen, eller vælg "Installér som app" i browsermenuen.
- **Safari på Mac:** Menuen "Fil", så "Føj til Dock".
- **Safari på iPhone og iPad:** Del-ikon, så "Føj til hjemmeskærm".
- **Firefox:** kan ikke installere apps. layerling starter stadig offline i en fane der.

Du kan lukke tippet på startsiden med {{ui:installHint.dismiss}}. At starte den installerede app en anden gang i Chrome eller Edge bringer det åbne vindue foran i stedet for at åbne et nyt.

På en computer registrerer en installeret layerling i Chrome eller Edge også sig som et program for `.lyl`-filer: et dobbeltklik på et design i filhåndteringen åbner det i layerling, og [[Ctrl]]+[[S]] gemmer tilbage i den fil. Det samme gælder `.stl`- og `.3mf`-filer, der åbnes som et nyt design, på samme måde som med {{ui:dashboard.importGeometry}} på startsiden. For at gøre layerling til standard for dem, vælger du det under "Åbn med" og lader systemet altid bruge det. På Android virker det ikke, der tilbyder browseren ingen filtilknytning for installerede webapps; åbn et design med {{ui:dashboard.importGeometry}} på startsiden.

## Opdateringer

Når en nyere version findes, viser layerling det på startsiden. Gennem {{ui:dashboard.updateBannerLink}} læser du hvad der er ændret. Versionsnummeret er nederst til højre. Efter at have genindlæst siden har du den nye version.

På layerling.com og på andre webservere lægger en åben side selv mærke til en opdatering. Den spørger serveren om dens version nu og da, når du kommer tilbage til fanen, og med det samme hvis en programfil den har brug for er forsvundet. Når noget nyt er installeret i mellemtiden, siger et kort i nederste højre hjørne det og lister hvad der er nyt. {{ui:newVersion.reload}} skriver designet du har åbent i browseren først og indlæser så siden igen; designet kommer tilbage som du forlod det. {{ui:newVersion.later}} holder kortet tilbage i 15 minutter. Genindlæs snart: en side der bliver på den gamle version kan indlæse dele af den nye der ikke passer. Det samme kort vises når det allerede er sket: CAD-arbejderne, som kun indlæses når du først har brug for dem, siger hvilken build de er fra, og hvis det ikke er sidens egen - efter en opdatering, eller med en gemt kopi af en ældre version - beder kortet om en genindlæsning før de to misforstår hinanden.

Når layerling er åben i flere faner, holder de øje med hinanden: hvis en anden fane allerede kører en nyere version, beder en note i bunden af den gamle fane dig genindlæse den. Og hvis det samme design er åbent i to faner, advarer begge, fordi de gemmer automatisk og ville overskrive hinanden. Hvis du åbner layerling i endnu en fane mens en allerede er åben, foreslår den nye fane at fortsætte i den gamle og tilbyder at lukke sig selv. Hvis du vil have to faner med vilje, for eksempel til to designs side om side, klik der på {{ui:tabs.keepHere}}. Denne vejledning åbner også i sin egen fane: mens layerling er åben ved siden af, læser dens knap øverst til højre "Tilbage til editoren" og lukker vejledningen i stedet for at åbne editoren en gang til.

## Sprog og udseende

Du sætter sproget øverst til højre, tysk eller engelsk. Farveskemaet ved siden af tilbyder {{ui:theme.short.system}} (følger operativsystemet), {{ui:theme.short.light}}, {{ui:theme.short.dark}} og {{ui:theme.short.graphite}}, en neutral mørkegrå.

## Kør det selv

layerling er fri software (AGPL-3.0) og kan køres på din egen computer eller server, for eksempel i et værksted, en klub eller en skole. Der er flere måder, beskrevet i [README på GitHub](https://github.com/henmedia/layerling/blob/main/README.md#getting-started):

- **Hurtig start på Windows:** En enkelt linje i PowerShell installerer alt og lægger en genvej på skrivebordet. Når layerling allerede kører, starter endnu et dobbeltklik ikke en anden server og åbner kun siden.
- **Docker:** Til NAS-enheder og hjemmeservere, uden at Node.js behøver at være installeret. Hver udgivelse kommer som et færdigt image `henmedia/layerling` på Docker Hub (også `ghcr.io/henmedia/layerling`) til amd64 og arm64; `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` starter den, og på en NAS søger du efter den i container-managerens register. Volumen `layerling-thumbnails` bevarer forhåndsbillederne på startsiden gennem en opdatering; uden den mangler de, hver gang containeren oprettes igen, indtil du åbner designet.
- **Statisk eksport:** Resultatet er almindelige filer som enhver webserver kan servere. De hører hjemme ved roden af en adresse (`https://layerling.eksempel.dk/` eller `http://192.168.0.5:8080/`), ikke i en undermappe og ikke åbnet fra disk; README har trinnene. Med en skrivbar mappe `store` ved siden af `index.html` og PHP på serveren bliver det også den delte lagring for designs.

MCP-broen for AI-assistenter findes kun i udviklingsserveren, se [Byg med en AI](chapter:ai-with-mcp).

## Hjælp og feedback

- I editoren rummer området {{ui:editor.group.help}} {{ui:editor.guide}} med de vigtigste bevægelser og oversigten over [tastaturgenveje](chapter:shortcuts). Hver sektion i den hurtige vejledning har et spørgsmålstegn der fører til det matchende kapitel her.

![Den hurtige vejledning i editoren. Videoer af andre listes øverst, og hver sektion har et spørgsmålstegn.](shot:quick-guide)

- Spørgsmål, ønsker og fejlrapporter er velkomne i [forummet](https://forum.drucktipps3d.de/forum/board/127-layerling/) og på [GitHub](https://github.com/henmedia/layerling/discussions).
- Hvad der er ændret i hvilken version er i udgivelsesnoterne, som du finder i bunden af startsiden og editoren.
