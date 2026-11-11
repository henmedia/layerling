---
title: Installera som app, arbeta offline och driva själv
summary: Starta layerling som ett vanligt program, även utan internet, och hur du kör det på din egen dator.
---

## Installera som app

layerling kan installeras som ett vanligt program. Det får då en egen ikon och ett eget fönster utan adressfält. Efter det första besöket startar det även **utan internet**. Dina designer stannar kvar på din dator. Det lönar sig att installera: appen startar snabbare eftersom den inte behöver laddas om varje gång, fungerar offline och sparar på servern. Du förlorar inget, för layerling säger ändå till när en ny version finns ute. Dessutom skyddar det dina designer: Safari på Mac samt på iPhone och iPad rensar bort data som en webbplats sparat om du inte besökt sidan på sju dagar, men inte för en installerad webbapp.

På startsidan visas en avisering med {{ui:installHint.install}} om webbläsaren stöder det. Annars gör du så här:

- **Chrome och Edge:** Klicka på installationsikonen till höger i adressfältet, eller välj ”Installera som app” i webbläsarens meny.
- **Safari på Mac:** Menyn ”Arkiv”, sedan ”Lägg till i Dock”.
- **Safari på iPhone och iPad:** Dela-ikonen, sedan ”Lägg till på hemskärmen”.
- **Firefox:** kan inte installera appar. layerling startar ändå offline i en flik där.

Du kan stänga tipset på startsidan med {{ui:installHint.dismiss}}. Startar du den installerade appen en andra gång i Chrome eller Edge lyfts det öppna fönstret fram i stället för att öppna ett nytt.

På en dator registreras en installerad layerling i Chrome eller Edge även som program för `.lyl`-filer: ett dubbelklick på en design i filhanteraren öppnar den i layerling, och [[Ctrl]]+[[S]] sparar tillbaka till samma fil. Detsamma gäller `.stl`- och `.3mf`-filer, som öppnas som en ny design precis som via {{ui:dashboard.importGeometry}} på startsidan. För att göra layerling till standardprogram väljer du det under Öppna med och låter systemet alltid använda det. På Android fungerar detta inte, där saknar webbläsaren filkoppling för installerade webbappar; öppna en design med {{ui:dashboard.importGeometry}} på startsidan i stället.

## Uppdateringar

När det finns en nyare version visar layerling det på startsidan. Via {{ui:dashboard.updateBannerLink}} läser du vad som har ändrats. Versionsnumret står längst ned till höger. När sidan har laddats om har du den nya versionen.

På layerling.com och andra webbservrar märker en öppen sida själv att en uppdatering finns. Den frågar servern efter dess version med jämna mellanrum, när du kommer tillbaka till fliken och omedelbart om en programfil den behöver har försvunnit. När något nytt har installerats under tiden visas ett kort längst ned till höger som berättar vad som är nytt. {{ui:newVersion.reload}} sparar först designen du har öppen i webbläsaren och laddar sedan om sidan; designen kommer tillbaka precis som du lämnade den. {{ui:newVersion.later}} gömmer kortet i 15 minuter. Ladda om snart: en sida som stannar på den gamla versionen kan råka hämta delar av den nya som inte passar ihop. Samma kort visas när det redan har hänt: CAD-modulerna, som laddas först när du behöver dem, talar om vilket bygge de kommer från, och om det inte matchar sidans eget – efter en uppdatering eller via en sparad kopia av en äldre version – ber kortet om omladdning innan de missförstår varandra.

När layerling är öppet i flera flikar håller de utkik efter varandra: om en annan flik redan kör en nyare version ber ett meddelande längst ned i den gamla fliken dig att ladda om den. Och om samma design är öppen i två flikar varnar båda, eftersom de sparar automatiskt och skulle skriva över varandra. Om du öppnar layerling i ännu en flik medan en redan är öppen föreslår den nya fliken att fortsätta i den gamla och erbjuder sig att stänga sig själv. Vill du medvetet ha två flikar – till exempel för två designer bredvid varandra – klickar du på {{ui:tabs.keepHere}}. Den här handboken öppnas också i en egen flik: medan layerling är öppet bredvid står knappen uppe till höger på ”Tillbaka till redigeraren” och stänger handboken i stället för att öppna redigeraren en gång till.

## Språk och utseende

Du väljer språk längst upp till höger i språklistan. Färgtemat bredvid erbjuder {{ui:theme.short.system}} (följer operativsystemet), {{ui:theme.short.light}}, {{ui:theme.short.dark}} och {{ui:theme.short.graphite}}, en neutral mörkgrå nyans.

## Köra själv

layerling är fri programvara (AGPL-3.0) och kan köras på din egen dator eller server, exempelvis i en verkstad, en förening eller en skola. Det finns flera sätt, beskrivna i [README på GitHub](https://github.com/henmedia/layerling/blob/main/README.sv.md#komma-igang):

- **Snabbstart i Windows:** En enda rad i PowerShell installerar allting och lägger en genväg på skrivbordet. Om layerling redan körs startar ett nytt dubbelklick ingen extra server utan öppnar bara sidan.
- **Docker:** För NAS-enheter och hemmaservrar, utan att Node.js behöver installeras. Varje version släpps som en färdig avbildning `henmedia/layerling` på Docker Hub (och `ghcr.io/henmedia/layerling`) för amd64 och arm64; `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` startar den, och på en NAS söker du efter den i containerhanterarens register. Volymen `layerling-thumbnails` bevarar startsidans förhandsgranskningsbilder över uppdateringar; utan den försvinner de varje gång containern skapas om, tills du öppnar designen igen.
- **Statisk export:** Resultatet blir vanliga filer som vilken webbserver som helst kan leverera. De ska ligga i roten på en adress (`https://layerling.example.com/` eller `http://192.168.0.5:8080/`), inte i en undermapp och inte öppnas direkt från hårddisken; README-filen har stegen. Med en skrivbar mapp `store` bredvid `index.html` och PHP på servern blir det också gemensam lagring för designer.

MCP-bryggan för AI-assistenter finns bara i utvecklingsservern, se [Bygga med AI](chapter:ai-with-mcp).

## Hjälp och återkoppling

- I redigeraren har området {{ui:editor.group.help}} knappen {{ui:editor.guide}} med de viktigaste greppen och översikten över [kortkommandon](chapter:shortcuts). Varje avsnitt i snabbguiden har ett frågetecken som leder till rätt kapitel här.

![Snabbguiden i redigeraren. Videor av andra listas överst, och varje avsnitt har ett frågetecken.](shot:quick-guide)

- Frågor, önskemål och felrapporter är välkomna i [forumet](https://forum.drucktipps3d.de/forum/board/127-layerling/) och på [GitHub](https://github.com/henmedia/layerling/discussions).
- Vad som ändrats i respektive version står i versionsfakta, som du hittar längst ned på startsidan och i redigeraren.
