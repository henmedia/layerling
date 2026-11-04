---
title: Installeren als app, offline werken en zelf hosten
summary: Start layerling als een gewoon programma, ook zonder netwerk, en lees hoe je het op je eigen computer draait.
---

## Installeren als app

layerling kun je installeren als een gewoon programma. Het krijgt dan een eigen pictogram en een eigen venster, zonder adresbalk. Na het eerste bezoek start het zelfs **zonder internet**. Je ontwerpen blijven op je computer. Installeren loont: de app start sneller, omdat ze niet elke keer opnieuw geladen hoeft te worden, werkt zonder internet en ontlast de server. Je verliest niets, want layerling meldt je nog steeds wanneer er een nieuwe versie is. Dat beschermt ook je ontwerpen: Safari op de Mac, iPhone en iPad wist de opgeslagen gegevens van een website die zeven dagen niet is bezocht, maar niet die van een geïnstalleerde app.

Op de startpagina verschijnt een hint met {{ui:installHint.install}} als je browser dat kan. Anders:

- **Chrome en Edge:** Klik op het installatiepictogram rechts in de adresbalk, of kies "Installeren als app" in het browsermenu.
- **Safari op de Mac:** Menu "Archief", dan "Voeg toe aan Dock".
- **Safari op iPhone en iPad:** Deelpictogram, dan "Zet op beginscherm".
- **Firefox:** kan geen apps installeren. layerling start daar wel offline in een tabblad.

De hint op de startpagina kun je sluiten met {{ui:installHint.dismiss}}. Start je de geïnstalleerde app in Chrome of Edge een tweede keer, dan komt het geopende venster naar voren in plaats van dat er een nieuw opent.

Op een computer meldt een in Chrome of Edge geïnstalleerd layerling zich ook aan als programma voor `.lyl`-bestanden: een dubbelklik op een ontwerp in de bestandsbeheerder opent het in layerling, en [[Ctrl]]+[[S]] slaat weer op in dat bestand. Op Android werkt dit niet, daar biedt de browser geen bestandskoppeling voor geïnstalleerde webapps; open een ontwerp met {{ui:dashboard.importGeometry}} op de startpagina.

## Updates

Als er een nieuwere versie is, toont layerling dat op de startpagina. Via {{ui:dashboard.updateBannerLink}} lees je wat er veranderd is. Het versienummer staat rechtsonder. Na het herladen van de pagina heb je de nieuwe versie.

Op layerling.com en op andere webservers merkt een geopende pagina een update zelf op. Ze vraagt de server af en toe naar zijn versie, wanneer je terugkomt naar het tabblad, en meteen als een programmabestand dat ze nodig heeft verdwenen is. Is er intussen iets nieuws geïnstalleerd, dan meldt een kaart rechtsonder dat en somt op wat er nieuw is. {{ui:newVersion.reload}} schrijft het ontwerp dat je open hebt eerst naar de browser en laadt dan de pagina opnieuw; het ontwerp komt terug zoals je het achterliet. {{ui:newVersion.later}} houdt de kaart 15 minuten tegen. Herlaad snel: een pagina die op de oude versie blijft, kan onderdelen van de nieuwe laden die er niet bij passen. Dezelfde kaart verschijnt als dat al gebeurd is: de CAD-workers, die pas laden wanneer je ze voor het eerst nodig hebt, zeggen uit welke build ze komen, en als dat niet die van de pagina zelf is - na een update, of bij een opgeslagen kopie van een oudere versie - vraagt de kaart om te herladen voordat de twee elkaar verkeerd begrijpen.

Is layerling in meerdere tabbladen open, dan letten ze op elkaar: draait een ander tabblad al een nieuwere versie, dan vraagt een melding onderaan het oude tabblad je om het te herladen. En is hetzelfde ontwerp in twee tabbladen open, dan waarschuwen beide je, omdat ze automatisch opslaan en elkaar zouden overschrijven. Open je layerling in nog een tabblad terwijl er al een open is, dan stelt het nieuwe tabblad voor om in het oude verder te gaan en biedt het aan zichzelf te sluiten. Wil je bewust twee tabbladen, bijvoorbeeld voor twee ontwerpen naast elkaar, klik daar dan op {{ui:tabs.keepHere}}. Ook deze handleiding opent in een eigen tabblad: zolang layerling ernaast open is, heet haar knop rechtsboven "Terug naar de editor" en sluit die de handleiding in plaats van de editor een tweede keer te openen.

## Taal en weergave

De taal kies je rechtsboven in de taallijst. Het kleurenschema ernaast biedt {{ui:theme.short.system}} (volgt het besturingssysteem), {{ui:theme.short.light}}, {{ui:theme.short.dark}} en {{ui:theme.short.graphite}}, een neutraal donkergrijs.

## Zelf draaien

layerling is vrije software (AGPL-3.0) en kan op je eigen computer of server draaien, bijvoorbeeld in een werkplaats, een vereniging of een school. Daarvoor zijn er meerdere manieren, beschreven in de [README op GitHub](https://github.com/henmedia/layerling/blob/main/README.nl.md#aan-de-slag):

- **De snelstart op Windows:** Eén regel in PowerShell installeert alles en zet een snelkoppeling op het bureaublad. Draait layerling al, dan start een volgende dubbelklik geen tweede server, maar opent alleen de pagina.
- **Docker:** Voor NAS-apparaten en thuisservers, zonder dat Node.js geïnstalleerd hoeft te zijn. Elke release komt als kant-en-klare image `henmedia/layerling` op Docker Hub (ook `ghcr.io/henmedia/layerling`) voor amd64 en arm64; `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` start hem, en op een NAS zoek je hem op in het register van de containerbeheerder.
- **Statische export:** Het resultaat bestaat uit gewone bestanden die elke webserver kan uitleveren. Ze horen in de root van een adres (`https://layerling.example.com/` of `http://192.168.0.5:8080/`), niet in een submap en niet vanaf de schijf geopend; de README beschrijft de stappen. Met een beschrijfbare map `store` naast `index.html` en PHP op de server wordt het ook de gedeelde opslag voor ontwerpen.

De MCP-brug voor AI-assistenten bestaat alleen in de ontwikkelserver, zie [Bouwen met een AI](chapter:ai-met-mcp).

## Hulp en feedback

- In de editor bevat het gebied {{ui:editor.group.help}} de {{ui:editor.guide}} met de belangrijkste handelingen en het overzicht van [sneltoetsen](chapter:sneltoetsen). Elk onderdeel van de beknopte handleiding heeft een vraagteken dat naar het bijbehorende hoofdstuk hier leidt.

![De beknopte handleiding in de editor. Video's van anderen staan bovenaan, en elk onderdeel heeft een vraagteken.](shot:quick-guide)

- Vragen, wensen en foutmeldingen zijn welkom op het [forum](https://forum.drucktipps3d.de/forum/board/127-layerling/) en op [GitHub](https://github.com/henmedia/layerling/discussions).
- Wat er in welke versie veranderd is, staat in de release notes, die je onderaan de startpagina en de editor vindt.
