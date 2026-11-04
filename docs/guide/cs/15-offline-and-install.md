---
title: Instalace, práce bez internetu a vlastní hosting
summary: Spouštění Layerlingu jako běžné aplikace, práce bez připojení a provoz na vlastním počítači či serveru.
---

## Instalace jako aplikace

Layerling lze nainstalovat jako běžný program. Získá vlastní ikonu a okno bez adresního řádku. Po první návštěvě se spustí i **bez internetu**. Projekty zůstávají na vašem počítači. Instalace se vyplatí: aplikace se spouští rychleji, protože se nemusí pokaždé znovu stahovat, funguje bez internetu a odlehčuje serveru. Nic neztratíte, protože layerling vám dál oznámí, když vyjde nová verze. To chrání i tvé návrhy: Safari na Macu, iPhonu a iPadu maže uložená data webu, který se sedm dní nenavštívil, ale ne data nainstalované aplikace.

Podporuje-li to prohlížeč, zobrazí se na úvodní stránce nabídka {{ui:installHint.install}}. Jinak postupujte takto:

- **Chrome a Edge:** klikněte na instalační ikonu vpravo v adresním řádku nebo zvolte instalaci aplikace v nabídce prohlížeče.
- **Safari na Macu:** nabídka Soubor, potom Přidat do Docku.
- **Safari na iPhonu a iPadu:** ikona sdílení, potom Přidat na plochu.
- **Firefox:** instalaci aplikací nepodporuje, Layerling v něm ale funguje bez připojení v běžné kartě.

Nabídku instalace zavřete pomocí {{ui:installHint.dismiss}}. Opětovné spuštění nainstalované aplikace v Chrome nebo Edge přenese dopředu její otevřené okno místo vytváření dalšího.

Na počítači se nainstalovaný layerling v Chrome nebo Edge také zaregistruje jako program pro soubory `.lyl`: dvojklik na projekt ve správci souborů ho otevře v layerlingu a [[Ctrl]]+[[S]] ukládá zpět do tohoto souboru. Na Androidu to nefunguje, tam prohlížeč pro nainstalované webové aplikace přiřazení souborů nenabízí; projekt otevřete přes {{ui:dashboard.importGeometry}} na úvodní stránce.

## Aktualizace

Novou verzi Layerling oznámí na úvodní stránce. Přes {{ui:dashboard.updateBannerLink}} si přečtete změny. Číslo verze je vpravo dole. Nová verze se načte obnovením stránky.

Na layerling.com i jiných webových serverech otevřená stránka rozpoznává aktualizace sama. Verzi ověřuje průběžně, při návratu do karty i tehdy, když zmizí potřebný programový soubor. Pokud se mezitím instalovala nová verze, karta vpravo dole ukáže její novinky. {{ui:newVersion.reload}} nejprve uloží otevřený projekt do prohlížeče a potom stránku obnoví. Projekt se vrátí do původního stavu. {{ui:newVersion.later}} oznámení odloží o 15 minut. Obnovení příliš neodkládejte: stará stránka by mohla načíst nekompatibilní součást nové verze. Stejné oznámení se objeví i při takovém nesouladu. CAD workery načítané až při prvním použití sdělují své sestavení; liší-li se od stránky, vyžádá si aplikace obnovení dříve, než spolu začnou chybně komunikovat.

Více otevřených karet se navzájem kontroluje. Pokud jiná karta běží na novější verzi, starší vyzve k obnovení. Při současném otevření stejného projektu varují obě, protože automatickým ukládáním by přepisovaly změny té druhé. Nová karta nabídne pokračování v již otevřené a vlastní zavření. Chcete-li dvě karty záměrně, například pro dva projekty vedle sebe, zvolte {{ui:tabs.keepHere}}. Příručka se otevírá v samostatné kartě. Běží-li editor vedle ní, tlačítko vpravo nahoře nabízí návrat do editoru a zavře příručku místo opětovného otevření editoru.

## Jazyk a vzhled

Jazyk se volí vpravo nahoře. Vedle něj je barevný motiv: {{ui:theme.short.system}} podle operačního systému, {{ui:theme.short.light}}, {{ui:theme.short.dark}} a neutrálně tmavošedý {{ui:theme.short.graphite}}.

## Vlastní provoz

Layerling je svobodný software pod licencí AGPL-3.0. Můžete jej provozovat na vlastním počítači nebo serveru, například v dílně, kroužku či škole. Možnosti podrobně popisuje [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.md#getting-started):

- **Rychlé spuštění ve Windows:** jediný příkaz PowerShellu nainstaluje potřebné součásti a vytvoří zástupce na ploše. Pokud už server běží, další dvojklik otevře pouze stránku, nikoli druhý server.
- **Docker:** pro NAS a domácí servery bez samostatné instalace Node.js. Každé vydání má připravený obraz `henmedia/layerling` na Docker Hubu i `ghcr.io/henmedia/layerling`, pro amd64 a arm64. Spustíte jej příkazem `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest`; na NASu jej vyhledejte v registru správce kontejnerů.
- **Statický export:** výsledkem jsou běžné soubory pro webový server. Patří do kořene adresy, například `https://layerling.example.com/` nebo `http://192.168.0.5:8080/`, nikoli do podsložky a nikoli k přímému otevření z disku. Postup je v README. Se zapisovatelnou složkou `store` vedle `index.html` a podporou PHP lze používat i sdílené ukládání projektů.

Most MCP pro AI asistenty je dostupný pouze ve vývojovém serveru, viz [Modelování s AI](chapter:ai-with-mcp).

## Pomoc a zpětná vazba

- V části {{ui:editor.group.help}} najdete {{ui:editor.guide}} s nejdůležitějšími postupy a přehled [klávesových zkratek](chapter:shortcuts). Otazník u každé části stručného průvodce vede do příslušné kapitoly této příručky.

![Stručný průvodce v editoru. Nahoře jsou videa dalších autorů a u každé části otazník.](shot:quick-guide)

- Dotazy, přání a hlášení chyb jsou vítány na [fóru](https://forum.drucktipps3d.de/forum/board/127-layerling/) a na [GitHubu](https://github.com/henmedia/layerling/discussions).
- Změny jednotlivých verzí najdete v poznámkách k vydání dole na úvodní stránce i v editoru.
