---
title: Telepítés alkalmazásként, offline munka és saját üzemeltetés
summary: Indítsd a layerlinget úgy, mint egy normál programot, akár hálózat nélkül is, és így futtathatod a saját számítógépeden.
---

## Telepítés alkalmazásként

A layerling úgy telepíthető, mint egy normál program. Ilyenkor saját ikont és saját ablakot kap, címsor nélkül. Az első látogatás után **internet nélkül** is elindul. A terveid a számítógépeden maradnak. Érdemes telepíteni: az alkalmazás gyorsabban indul, mert nem kell minden alkalommal újra letölteni, internet nélkül is működik, és tehermentesíti a szervert. Semmit nem veszítesz, mert a layerling továbbra is jelzi, ha új verzió jelent meg. Ez a terveidet is védi: a Safari Macen, iPhone-on és iPaden törli annak a weboldalnak a mentett adatait, amelyet hét napig nem látogattak, a telepített alkalmazásét viszont nem.

A kezdőlapon megjelenik egy {{ui:installHint.install}} feliratú jelzés, ha a böngésződ képes rá. Különben:

- **Chrome és Edge:** Kattints a címsor jobb oldalán lévő telepítés ikonra, vagy válaszd a böngésző menüjében az alkalmazásként való telepítést.
- **Safari Macen:** a Fájl menü, majd a Dockhoz adás.
- **Safari iPhone-on és iPaden:** a Megosztás ikon, majd a Főképernyőhöz adás.
- **Firefox:** nem tud alkalmazásokat telepíteni. A layerling ott is elindul offline egy lapon.

A kezdőlapon lévő jelzést az {{ui:installHint.dismiss}} gombbal zárhatod be. Ha Chrome-ban vagy Edge-ben másodszor is elindítod a telepített alkalmazást, egy újabb ablak megnyitása helyett a nyitott ablakot hozza előre.

Számítógépen egy Chrome-ban vagy Edge-ben telepített layerling a `.lyl` fájlok programjaként is regisztrál: egy tervre a fájlkezelőben duplán kattintva a layerlingben nyílik meg, a [[Ctrl]]+[[S]] pedig visszament ebbe a fájlba. Androidon ez nem működik, ott a böngésző nem kínál fájltársítást a telepített webalkalmazásokhoz; egy tervet a kezdőlapon a(z) {{ui:dashboard.importGeometry}} gombbal nyiss meg.

## Frissítések

Ha van újabb verzió, a layerling a kezdőlapon jelzi. A {{ui:dashboard.updateBannerLink}} linken elolvashatod, mi változott. A verziószám jobbra lent található. Az oldal újratöltése után az új verzió van előtted.

A layerling.com-on és más webszervereken egy nyitott oldal magától észreveszi a frissítést. Időnként megkérdezi a szervert a verziójáról, amikor visszatérsz a lapra, és azonnal, ha egy szükséges programfájlja eltűnt. Ha közben valami új települt, jobbra lent egy kártya jelzi ezt, és felsorolja, mi az új. A {{ui:newVersion.reload}} előbb a böngészőbe írja a nyitott tervedet, majd újratölti az oldalt; a terv úgy jön vissza, ahogy hagytad. A {{ui:newVersion.later}} 15 percre visszatartja a kártyát. Töltsd újra hamar: egy a régi verzión maradó oldal betöltheti az új verzió olyan részeit, amelyek nem illenek hozzá. Ugyanez a kártya akkor is megjelenik, ha ez már megtörtént: a CAD-feldolgozók, amelyek csak akkor töltődnek be, amikor először szükség van rájuk, megmondják, melyik buildből származnak, és ha az nem az oldal sajátja – egy frissítés után, vagy egy régebbi verzió tárolt másolatánál –, a kártya újratöltést kér, mielőtt a kettő félreértené egymást.

Ha a layerling több lapon is nyitva van, figyelnek egymásra: ha egy másik lapon már újabb verzió fut, a régi lap alján egy megjegyzés kéri, hogy töltsd újra. Ha pedig ugyanaz a terv két lapon van nyitva, mindkettő figyelmeztet, mert automatikusan mentenek, és felülírnák egymást. Ha a layerlinget egy újabb lapon is megnyitod, miközben az egyik már nyitva van, az új lap azt javasolja, hogy a régiben folytasd, és felajánlja, hogy bezárja magát. Ha szándékosan szeretnél két lapot, mondjuk két tervhez egymás mellett, kattints ott az {{ui:tabs.keepHere}} gombra. Ez az útmutató is saját lapon nyílik meg: amíg mellette nyitva van a layerling, a jobb felső gombja „Vissza a szerkesztőhöz” feliratú, és a szerkesztő ismételt megnyitása helyett bezárja az útmutatót.

## Nyelv és megjelenés

A nyelvet a jobb felső sarokban lévő nyelvlistában választod ki. A mellette lévő színséma a {{ui:theme.short.system}} (az operációs rendszert követi), a {{ui:theme.short.light}}, a {{ui:theme.short.dark}} és a {{ui:theme.short.graphite}}, egy semleges sötétszürke lehetőséget kínálja.

## Saját üzemeltetés

A layerling szabad szoftver (AGPL-3.0), és futtatható a saját számítógépeden vagy szervereden, például egy műhelyben, egy klubban vagy egy iskolában. Erre több mód van, ezeket a [GitHubon lévő README](https://github.com/henmedia/layerling/blob/main/README.md#getting-started) írja le:

- **Gyorsindítás Windowson:** Egyetlen PowerShell-sor mindent telepít, és parancsikont tesz az asztalra. Ha a layerling már fut, egy újabb dupla kattintás nem indít második szervert, csak megnyitja az oldalt.
- **Docker:** NAS-eszközökhöz és otthoni szerverekhez, anélkül, hogy telepíteni kellene a Node.js-t. Minden kiadás kész image-ként érkezik `henmedia/layerling` néven a Docker Hubon (és `ghcr.io/henmedia/layerling` néven is) amd64-hez és arm64-hez; a `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` elindítja, NAS-on pedig a konténerkezelő regisztrijében keresed meg.
- **Statikus export:** Az eredmény egyszerű fájlok, amelyeket bármely webszerver kiszolgálhat. Egy cím gyökerébe valók (`https://layerling.example.com/` vagy `http://192.168.0.5:8080/`), nem egy almappába, és nem lemezről megnyitva; a lépések a README-ben vannak. Egy írható `store` mappával az `index.html` mellett és PHP-val a szerveren a tervek közös tárolója is lesz belőle.

Az MI-asszisztenseknek szóló MCP-híd csak a fejlesztői szerverben létezik, lásd az [Építés MI-vel](chapter:ai-with-mcp) fejezetet.

## Segítség és visszajelzés

- A szerkesztőben a {{ui:editor.group.help}} területen található a {{ui:editor.guide}} a legfontosabb mozdulatokkal és a [billentyűparancsok](chapter:shortcuts) áttekintése. A rövid útmutató minden részében van egy kérdőjel, amely az itteni megfelelő fejezethez visz.

![A rövid útmutató a szerkesztőben. Felül mások videói vannak felsorolva, és minden résznek van egy kérdőjele.](shot:quick-guide)

- A kérdéseket, kívánságokat és hibajelentéseket szívesen fogadják a [fórumban](https://forum.drucktipps3d.de/forum/board/127-layerling/) (német nyelvű) és a [GitHubon](https://github.com/henmedia/layerling/discussions).
- Hogy melyik verzióban mi változott, az a kiadási megjegyzésekben olvasható, ezeket a kezdőlap és a szerkesztő alján találod.
