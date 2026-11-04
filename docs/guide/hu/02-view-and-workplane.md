---
title: Nézet és munkasík
summary: Mozgás a jelenetben, egyenes nézetek, és új alakzatok elhelyezése bármilyen felületen.
---

## Mozgás a jelenetben

Egérrel:

| Mit csinálsz | Mi történik |
| --- | --- |
| húzás jobb gombbal | a nézet forgatása |
| kattintás jobb gombbal | egy testen menü a leggyakoribb parancsokkal: másolat készítése, lyuk vagy tömör, csoportosítás, elrejtés, zárolás, törlés és még több; üres helyen Beillesztés és Az összes kijelölése |
| húzás középső gombbal | a nézet mozgatása |
| egérgörgő | nagyítás és kicsinyítés |
| [[Ctrl]] / [[Cmd]] nyomva tartása és húzás bal gombbal | szintén a nézetet mozgatja |
| dupla kattintás a munkasík egy üres pontjára vagy a tárgyasztal mellé | úgy mozgatja a nézetet, hogy az a pont középre kerüljön; a nézet ezután körülötte forog |

Hogy a görgő milyen gyorsan nagyít, azt a beállításokban a {{ui:workspace.appearance}} alatt a {{ui:workspace.zoomSpeed}} adja meg: egy csúszka 1-től 14-ig, kezdetben 5-ön; 10 fölött csak a görgő gyorsul.

**Egérgombok, mint a szeletelőben.** Ha a Bambu Studióhoz vagy az OrcaSlicerhez szoktál, a beállításokban, a(z) {{ui:workspace.appearance}} alatt állítsd a(z) {{ui:workspace.mouseScheme}} értékét erre: {{ui:workspace.mouseSchemeSlicer}}. A bal gombbal üres helyen húzva ilyenkor a nézet forog, a jobb gomb a középsőhöz hasonlóan eltolja, a Shift és a bal gombos húzás pedig kijelölőkeretet rajzol. Egy test húzása továbbra is mozgatja, és egy rövid jobb kattintás továbbra is megnyitja a menüt. Vázlatban a jobb gomb is eltolja a nézetet.

**3D egér.** Egy SpaceMouse vagy más 3D egér forgatja, eltolja és nagyítja a 3D nézetet: told el magadtól a sapkáját a nagyításhoz, csúsztasd a nézet eltolásához, billentsd a nézet döntéséhez, és csavard el a nézet elforgatásához. A beállításokban, a(z) {{ui:workspace.appearance}} alatt kattints a(z) {{ui:workspace.spaceMouseConnect}} gombra, és válaszd ki az eszközt a böngésző által megnyitott ablakban; a választást megjegyzi, így ezt csak egyszer kell megtenned. Chrome-ban és Edge-ben működik, amelyek elérik az ilyen eszközöket; Firefoxban és Safariban nem. Ha valamelyik irány fordítva működik, jelöld be a gomb alatt: oldalra tolás, fel-le tolás, nagyítás, döntés vagy forgatás.

Táblagépen vagy telefonon két ujjal nagyítasz (széthúzás és összecsípés) és mozgatod a nézetet (együtt csúsztatva). Egy ujjal üres helyen a nézetet forgatod, egy koppintás ott pedig megszünteti a kijelölést; egy alakzaton vagy fogantyún a terven dolgozol, pont mint a bal egérgombbal. Ha akkor is forgatnád a nézetet, amikor az ujjad egy alakzaton indul, kapcsold be a nézetsávon az {{ui:camera.touchRotate}} kapcsolót. Ez a kapcsoló érintőképernyős eszközökön jelenik meg.

A tollas digitalizáló tábla egérként viselkedik: a toll hegye a bal gomb, a tollon lévő gomb a jobb, a nézet forgatásához és a menühöz. A tábla gyorsgombjait a meghajtójában a layerling [billentyűparancsaira](chapter:shortcuts) állíthatod.

**Táblagépen lehetőleg érintőtollal dolgozz.** A hegye sokkal finomabb, mint egy ujjbegy, és nem takarja el, amire célzol, így a vázlat apró pontjait, vékony vonalait és fogantyúit, a mérési pontokat és az éleket pontosan eltalálod, és a hosszabb munka is kevésbé fárasztó. A layerling már most is kicsit messzebbről engedi elérni ujjal a pontokat, vonalakat, fogantyúkat és éleket, mint egérmutatóval, de az érintőtoll marad a pontosabb.

### A nézetkocka

A bal felső sarokban lévő kocka mutatja, merre nézel. Az egyik oldalára kattintva egyenes nézetbe ugrasz felülről, alulról, elölről, hátulról, balról vagy jobbról. A kocka egyik sarkára kattintva abból a sarokból, ferdén nézed a modellt, egy él közelébe kattintva pedig arról az élről, két oldal közül; a pont kivilágosodik, amíg a mutató rajta van. Az [[1]]–[[6]] számbillentyűk is az egyenes nézeteket adják. Ha közben a [[Shift]] billentyűt is nyomva tartod, a nézet a kijelölésre is ránagyít, mint a [[Shift]]+[[F]].

A kockát húzva forgathatod a nézetet, pont mint a jobb egérgombos húzással. Ha semmi sincs kijelölve, a nyílbillentyűk is forgatják a nézetet: lenyomásonként 15°-kal, [[Shift]] billentyűvel 90°-kal. Arra forgatják a modellt, amerre mutatnak – a [[→]] jobbra fordítja az elejét, a [[↑]] felfelé billenti az elejét. A [[Ctrl]] lenyomva tartásával a nyilak ehelyett eltolják a nézetet a képernyőn: lenyomásonként a kép tizedével, a [[Shift]] billentyűvel együtt a felével. A modell arra mozdul, amerre mutatnak. Ha valami ki van jelölve, a nyilak azt mozgatják; a nézet forgatásához előbb kattints egy üres helyre. Érintőképernyőn ez egy ujjal is működik, az {{ui:camera.touchRotate}} bekapcsolása nélkül.

### A nézetsáv

A bal szélen egy keskeny sáv van. Felülről lefelé:

- A {{ui:camera.home}} az egész jelenetet visszahozza a képbe. A billentyűje a [[Home]]; az [[F]] is ezt teszi, ha nincs semmi kijelölve.
- A {{ui:camera.focusSelection}} a kijelölésre nagyít ([[F]] vagy [[Shift]]+[[F]]).
- A {{ui:camera.zoomIn}} és a {{ui:camera.zoomOut}} lépésenként nagyít és kicsinyít, ahogy a [[+]] és a [[−]] billentyű is.
- Az {{ui:camera.orthographic}} lapos nézetre vált, amelyben a párhuzamos élek párhuzamosak maradnak. Méréshez és élek egymáshoz igazításához ez gyakran kényelmesebb, mint a perspektivikus nézet. Az [[O]] oda-vissza vált, és egy második kattintás visszavált.
- A {{ui:camera.secondView}} a terv második nézetét nyitja meg egy saját ablakban, lásd lent. Egy második kattintás bezárja.
- A {{ui:camera.showScrollbars}} egy görgetősávot tesz a nézet aljára és egyet a jobb szélére. Húzd a sávot, és a nézet egyenletesen csúszik; a végén lévő nyílra kattintva egy kicsit mozdul (nyomva tartva tovább megy), a sáv mellé kattintva pedig majdnem egy egész nézetnyit. Semmi sem fordul el, és a nyílbillentyűkkel ellentétben a sávok akkor is működnek, ha egy alkatrész ki van jelölve - közelről, apró részleteknél hasznos. Egy második kattintás elrejti őket; ez a böngésző megjegyzi a választást.
- A {{ui:camera.hideWorkplane}} (a rács fölötti szem) elrejti a tárgyasztalt a rácsával együtt, így alulról is megnézheted egy terv alját. Csak a nézet változik: az új alakzatok továbbra is a munkasíkra kerülnek. Egy második kattintás újra megmutatja.
- A {{ui:camera.placeWorkplane}}, a mérőszalag és a derékszögvonalzó önálló eszközök, ezekről lentebb és a [Mérés és jegyzetek](chapter:measuring-and-notes) fejezetben olvashatsz.

A sáv legtetején lévő kis nyíl elrejti a sávot, ha útban van.

Egy terv úgy nyílik meg, ahogy hagytad: a nézet szöge, nagyítása és helyzete ebben a böngészőben vele együtt megmarad, így ott folytatod, ahol abbahagytad, akkor is, ha közben a kezdőlapra mentél vagy bezártad az oldalt. Egy mentett fájl (.lyl) is magával viszi a nézetet, így máshol is abban nyílik meg. A nézet nem része a visszavonási előzményeknek.

Minden tervben négy saját nézetet is megőrizhetsz. A [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] vagy [[Shift]]+[[0]] pontosan úgy menti a nézetet, ahogy van - szög, helyzet, nagyítás, valamint sík vagy perspektivikus nézet - az adott billentyűre, a billentyű magában ([[7]], [[8]], [[9]] vagy [[0]]) pedig visszahozza. Egy üzenet alul megerősíti a mentést; ha ugyanarra a billentyűre újra mentesz, az lecseréli a nézetet. A fenti nézethez hasonlóan a mentett nézetek is a tervvel maradnak ebben a böngészőben, és egy mentett fájl (.lyl) is magával viszi őket; nem részei a visszavonási előzményeknek.

### Második nézet saját ablakban

A {{ui:camera.secondView}} egy ablakot nyit, amely ugyanazt a tervet egy saját kamerán át mutatja, így egyszerre két oldalról láthatod - például elölről, miközben felülről dolgozol. Minden változtatás, amit a szerkesztőben végzel, ott azonnal megjelenik; magát a tervet csak a főablakban lehet módosítani, és a fogantyúk is ott maradnak. A második ablakban az egér és a nézetkocka ugyanúgy forgatja a nézetét, mint itt, és a billentyűk is: [[1]]–[[6]], [[F]], [[Home]], [[O]], [[+]] és [[−]], a nyilak a forgatáshoz, a [[Ctrl]] a nyilakkal az eltoláshoz. Az [[F]] ott arra nagyít, ami a szerkesztőben ki van jelölve. A terv négy mentett nézete is működik ott: a [[7]], [[8]], [[9]] és [[0]] visszahozza őket, a [[Shift]] pedig ezek egyikével az ablak nézetét menti el alá - mindkét ablak számára. Saját nézetsávjában ott van a {{ui:camera.home}}, a {{ui:camera.focusSelection}}, a {{ui:camera.zoomIn}}, a {{ui:camera.zoomOut}}, az {{ui:camera.orthographic}} és a {{ui:camera.hideWorkplane}}, és ezek csak arra az ablakra hatnak. Az ablak ott nyílik meg, ahol hagytad, ugyanakkora méretben, és a szerkesztővel együtt bezárul. Telefonon és táblagépen a gomb nem jelenik meg.

## Belelátni: a metszeti nézet

A {{ui:camera.sectionView}}, a sáv utolsó gombja (a vágás eszköz), egy sík mentén felnyitja a nézetet, hogy ellenőrizhesd a falakat, az üregeket és az egymásba illeszkedő részeket. Valójában semmi sem vágódik el: a terv, a fájljai és minden export egészben marad. Ahol a sík egy testen megy át, a metszet a test kissé sötétebb színével van kitöltve, a benne lévő kivágás pedig üres marad, így megkülönböztethető a tömör a üregestől; a kitöltött felület egy pillanattal azután jelenik meg, hogy a sík megáll. A(z) {{ui:camera.sectionCutFace}} résznél választod ki, hogyan nézzen ki a metszet: a(z) {{ui:camera.sectionCutFaceHatch}}, az alapbeállítás, rajzszerűen vonalkázza, és a másik testen belül fekvő test fordítva van vonalkázva, így a kettő elválik egymástól; a(z) {{ui:camera.sectionCutFaceFill}} egyszínűen tölti ki; a(z) {{ui:camera.sectionCutFaceOpen}} nyitva hagyja, és a test héjába látsz bele. A választás minden tervre érvényes.

- Válaszd ki, melyik tengelyre merőlegesen álljon a sík: X (szélesség), Y (mélység) vagy Z (magasság), mint a helyzetmezőkben. A sík a terved közepén indul.
- A {{ui:camera.sectionOrientation}} adja meg, mihez igazodnak ezek a tengelyek. A {{ui:camera.sectionOrientationWorld}} a terv tengelyeit veszi. A {{ui:camera.sectionOrientationWorkplane}} a munkasíkéit: a Z ekkor vele párhuzamosan vág, az X és Y merőlegesen rá, a pozíció pedig az origójától számít. Ha a munkasík egy ferde lapon fekszik, így azzal a lappal párhuzamosan vágsz, és a metszet vele mozog, ha áthelyezed a munkasíkot. A {{ui:camera.sectionOrientationView}} a képernyő felé fordítja a síkot: elveszi, ami előtte van, és a csúszkával a nézés irányában mélyebbre tolod a tervben, például hogy elérj és kijelölj egy takart alkatrészt. Ha utána elforgatod a nézetet, kattints rá újra, és a metszet az új nézethez igazodik.
- A {{ui:camera.sectionCoarse}} az egész terven át mozgatja a síkot, a {{ui:camera.sectionFine}} kicsit előre-hátra a mostani helyzetéhez képest, tized milliméterekhez. A helyzetet be is gépelheted.
- A tengelyek melletti gomb a vágás másik oldalát mutatja, a {{ui:camera.sectionReset}} visszateszi a síkot középre, a {{ui:camera.sectionShowPlane}} pedig elrejti a kék síkot.
- Amit a vágás feltár, arra kattinthatsz és kijelölheted, a belső falakat is.
- A {{ui:camera.sectionWorkplane}} a munkasíkot a vágásra teszi. A metszet síkjában fekszik, és a megmaradó testből kifelé néz, mint egy vágás után maradó lap. Ha ezután a vázlatra váltasz, pontosan ott indul, és a halvány körvonal mutatja a vágást, amely mentén rajzolhatsz, és amelyhez illeszthetsz. Így rajzolhatsz például egy fedelet, amely pontosan illik a metszettel feltárt üregbe. A tengelyek melletti gomb választja ki, melyik oldal marad meg, és ezzel azt is, merre néz a munkasík. A munkasíkot a szokásos módon teszed vissza az alaplapra.
- A {{ui:camera.sectionSketch}} új vázlatot indít közvetlenül a metszeten, amelyben a metszet körvonalai már vonalként benne vannak: egy furat valódi körként, egy lekerekített sarok ívként érkezik. Módosítsd őket, töröld, amire nincs szükséged, rajzolj tovább, és fejezd be: a test a metszetből a levágott oldal felé nő, így egy másikhoz illeszkedő alkatrész, például fedél, betét vagy tömítés, épp annak az alkatrésznek a körvonalából indul. A tengelyek melletti gomb választja ki ezt az oldalt. Ahogy az SVG-nél, itt is csak a látható testek számítanak, és a furatok már le vannak vonva.
- A {{ui:camera.sectionMeasure}} közvetlenül a vágáson mér: a körvonal kéken látszik, és két kattintás rajta megadja a távolságot, valamint annak összetevőit a sík két tengelye mentén. Mindkét pont a körvonalhoz illeszkedik, elsősorban a sarkokhoz. Ha a második kattintás bárhol a szemközti falra esik, merőlegesen illeszkedik az első ponthoz – így pontos célzás nélkül leolvasod a falvastagságot, a réseket és a hézagot. Egy harmadik kattintás a következő mérést kezdi, az [[Esc]] befejezi a mérést. A sík mozgatása törli a mérést. Kerek körvonalon, például egy henger vagy egy lyuk metszetén, egy kis kereszt jelöli a középpontot, és a középpont is illeszkedik. Kattints egy pontra a körön, majd menj a vele szemközti pont közelébe: a második kattintás pontosan a középponttal szemben ér célba, és a szám Ø-t, az átmérőt mutatja. A középponttól a kör egy pontjáig R-t, a sugarat kapod.
- A {{ui:camera.sectionExportSvg}} a vágósíkon lévő körvonalakat 1:1 méretarányú SVG-ként menti, lézerhez, plotterhez, sablonhoz vagy tömítéshez. Az X vágást jobbról, az Y vágást elölről, a Z vágást felülről nézve látod. Mint az exportnál, csak a látható testek kerülnek bele, a lyukak már le vannak vonva, az azonos színű testek pedig egy körvonallá egyesülnek. Minden szín külön útvonal marad, kitöltés nélkül, így a lézerszoftver rétegekként tartja őket külön.

Az eszközablak a gombjához kapcsolódik. Ha eltakar valamit, húzd a címsoránál fogva bárhová a munkasíkon; legközelebb is ott nyílik meg. Kattints duplán a címsorára, vagy ejtsd a gombra, hogy visszakerüljön.

A kereszt és az [[Esc]] bezárja az eszközablakot; ha mérés fut, az [[Esc]] előbb azt fejezi be. A vágás megmarad, amíg ki nem kapcsolod a(z) {{ui:camera.sectionActive}} kapcsolóval, rá nem kattintasz a gombjára a sávban, amíg az ablak nyitva van, vagy vissza nem mész a tervek áttekintéséhez. Amíg be van kapcsolva, a gombja kiemelve marad. Ami a levágott oldalra kerül, csak akkor látszik, ha kikapcsolod a vágást. Táblagépen nincs [[Esc]], ezért ott az eszközablaknak két további gombja van: a(z) {{ui:camera.sectionBack}} befejezi a mérést, ha fut, egyébként bezárja az eszközablakot, a(z) {{ui:camera.sectionConfirm}} pedig egy lépésben bezárja az eszközablakot. Számítógépen ezek nem látszanak.

## A munkasík

Az új alakzatok a munkasíkhoz igazodnak. Kezdetben ez az alaplap a rácsával. De bármilyen felületre áthelyezheted, hogy valamit egy oldalra vagy egy lejtős lapra tegyél.

1. Nyomd meg a [[W]] billentyűt, vagy kattints a {{ui:camera.placeWorkplane}} gombra.
2. Vidd az egeret egy test egyik lapja fölé. Kivilágosodik.
3. Egy kattintás oda teszi a munkasíkot. Minden, amit most hozzáadsz, ezen a lapon ül.

Ha ehelyett az üres tárgyasztalra kattintasz, a munkasík laposan oda kerül, ahová kattintottál, az illesztőrácsra. Az új alakzatok és egy befejezett vázlat, a forgatott is, ezután ott jelennek meg, nem a tárgyasztal közepén. Amíg a munkasík így laposan a tárgyasztalon fekszik, a tárgyasztal csak a körvonalát mutatja: két rács ugyanabban a síkban vibráló mintát adna.

Egy lapon a munkasík origója egyébként a rácshoz illeszkedik. Ha a lap egyik sarka közelébe kattintasz, pontosan arra a sarokra kerül. Egy él közelében az élre fekszik, és a rács hozzá igazodik; így szándékosan választhatod meg a rács szögét. Sarok vagy él nélkül egy fekvő lapon a rács a testtel párhuzamosan fut, így egy elforgatott dobozon vele együtt el van forgatva.

Egy kattintás a tárgyasztal mellé vagy az [[Esc]] visszateszi a munkasíkot az alaplapra. Még gyorsabb a {{ui:camera.resetWorkplane}}: a lefelé mutató nyilas gomb a nézetsávon a szem alatt van, amíg a munkasík egy lapon fekszik. A [[Shift]]+[[W]] közvetlenül az épp kijelölt lapra teszi. Az [[Alt]]+[[W]] bármikor visszateszi az alaplapra, akár van kijelölés, akár nincs. Ha kattintás közben a [[Shift]] billentyűt nyomva tartod, a sík a másik irányba néz.

Amíg a munkasík egy lapon van, a {{ui:camera.placeWorkplane}} mellett megjelenik egy szem. Elrejti a munkasíkot anélkül, hogy eldobná, hogy tisztán lásd a tervet: az új alakzatok továbbra is arra a lapra kerülnek, és a forgatás is körülötte történik. A szemre kattintva újra megjelenik, és egy új munkasík megadása is megjeleníti.

Ha merőlegesen akarsz a munkasíkra nézni, nyomd meg a [[P]] billentyűt, vagy kattints a nézetsávban a {{ui:camera.placeWorkplane}} melletti {{ui:camera.lookOntoWorkplane}} gombra. A nézet addig fordul, amíg szemből látod a síkot, arról az oldalról, amerre az új alakzatok nőnek, a kezdőpontjával középen. Az alaplapon ez a felülnézet.

## Rács és illesztés

A rács a tárgyasztal méretét mutatja. Jobbra lent van az **illesztési lépés**: a mozgatás és a méretezés ekkora lépésekben illeszkedik, például 1 mm-esekben. Finom munkához vedd kisebbre, durva elrendezéshez nagyobbra. A szalagon a {{ui:editor.tool.snapToGrid}} utólag a legközelebbi rácspontra helyezi a kijelölt alakzatokat. Mozgatás közben az alakzatok más alakzatokhoz is illeszkednek, lásd a [Kijelölés és elrendezés](chapter:select-and-arrange) fejezetet.

> **Tipp:** Amikor részeket pontosan illesztesz egymáshoz, ne forgasd a nézetet. A számbillentyűkkel válts felül- vagy elölnézetre, és nyomd meg az [[O]] billentyűt a lapos megjelenítéshez. Így azonnal látod, hogy két él tényleg egy síkban van-e.

### A beállítások ablaka

A címsorban lévő fogaskerék ({{ui:editor.workspaceSettings}}) megnyitja a beállításokat. Balra öt terület van: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} és {{ui:workspace.history}}. Egy változtatás azonnal érvényes. Alul a(z) {{ui:workspace.makeDefault}} a jelenlegi beállításokat menti alapértelmezésként, így egy új terv ezekkel indul. Egy megnyitott fájl a saját beállításait hozza magával; a mellette lévő {{ui:workspace.useMyDefault}} a mentett színeidet, rácsodat és a többit alkalmazza a nyitott tervre, a mértékegységeit pedig megtartja. Ha az alapértelmezéseid nyomtatót is tartalmaznak, annak tárgyasztal-mérete is jön vele; nyomtató nélkül a terv megtartja a saját tárgyasztalát és nyomtatóját. A jobb felső sarokban a(z) {{ui:workspace.close}} bezárja az ablakot. Ez a rész sorban végigmegy a beállításokon.

### Megjelenés: téma, szalag és nézetkocka

A(z) {{ui:workspace.theme}} az egész program színsémáját választja ki: a(z) {{ui:workspace.themeSystem}} a számítógépet követi, ezenkívül van {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} és {{ui:workspace.themeGraphite}}. A szerkesztő jobb felső sarkában is átállíthatod.

Az {{ui:workspace.toolbarSize}} a {{ui:workspace.appearance}} alatt kisebbé vagy nagyobbá teszi a felső szalag gombjait, az alakzatmenüjét, a bal oldali nézetsávot és a jobb oldali tulajdonságpanelt: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (ahogy mindig is volt) vagy {{ui:workspace.toolbarSizeLarge}}. A kicsi laptopon több helyet hagy a munkasíknak; a nagyot könnyebb eltalálni nagy képernyőn vagy ujjal. Nagy gombokkal a szalag csoportjai egy második sorba kerülnek, ha az ablak túl keskeny hozzájuk. A méret ebben a böngészőben megmarad, és minden tervre érvényes.

A(z) {{ui:workspace.shapeColors}} az alakzattár képein azt a színt mutatja, amellyel egy új alakzat indul (a fajtája színét, vagy azt, amelyet a(z) {{ui:inspector.saveDefaults}} gombbal mentettél). Ha inkább szürke képeket szeretnél, kapcsold ki; a böngésző megjegyzi a választásodat.

A {{ui:workspace.viewCubePosition}} a {{ui:workspace.appearance}} alatt a nézetkockát a munkaterület egy másik sarkába teszi: {{ui:workspace.viewCubePositionTopLeft}} (ahogy mindig is volt), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} vagy {{ui:workspace.viewCubePositionBottomRight}}. A bal felső sarkon kívül minden sarokban a nézetsáv feljebb kerül, a kocka által szabadon hagyott helyre. Jobb alul a kocka közvetlenül a {{ui:inspector.snapGrid}} vezérlő fölött áll. Amíg jobb oldalon egy alakzat tulajdonságai nyitva vannak, a jobb oldali kocka balra kitér előlük. A sarok ebben a böngészőben megmarad, és minden tervre érvényes. Keskeny ablakban, például telefonon, a beállítás rejtve van, és a kocka a bal felső sarokban marad.

### Megjelenés: gyors mód

A(z) {{ui:workspace.fastMode}} lassabb számítógépekhez való. Kikapcsolja az árnyékokat, az élvonalakat minden testen és a kamera tehetetlenségét, és a nézetet csak a képernyő felbontásában rajzolja. A saját beállításaid későbbre elmentve maradnak, az általa átvett kapcsolók pedig a(z) {{ui:workspace.offInFastMode}} feliratot mutatják, amíg be van kapcsolva. Hogy mi segít még egy lassú gépen, azt lent, „Ha a layerling lassúnak tűnik” alatt találod.

### Megjelenés: a munkaterület és a vázlat színei

A munkaterület színeit a(z) {{ui:workspace.appearance}} alatt állítod: {{ui:workspace.backgroundColor}} és {{ui:workspace.surfaceColor}} a világos témához (a sötét témák megtartják a sajátjukat), a rács színe mellett a(z) {{ui:workspace.workplane}} alatt. Minden szín egy gomb, amely mutatja. Egy kattintás kis ablakot nyit színmezővel, kész színek sorával, egy hexadecimális értéknek való mezővel és egy nyíllal, amely a színt a layerling alapértékére állítja vissza. Az [[Enter]] átveszi a begépelt hexadecimális értéket, ahogy az ablakon kívüli kattintás is.

A vázlatnézetnek saját színei vannak: {{ui:workspace.sketchBackground}} a lap körüli ablakhoz, {{ui:workspace.sketchPlateColor}} a rács alatti laphoz és {{ui:workspace.sketchGridColor}}, mind a világos témához. A(z) {{ui:workspace.sketchMatch}} egy kattintással átveszi a munkaterület három színét.

A(z) {{ui:workspace.classicLook}} úgy állítja be a munkaterületet, ahogy a Tinkercad mutatja: fehér háttér, világoskék milliméterrács minden centiméternél erősebb vonallal, fekete élvonalak, felülről jövő fény lágy árnyékokkal. Utána minden értéket külön is módosíthatsz. Mind úgy indul, ahogy a layerling mindig is kinézett, és hogy mi a jó, az a monitorodon is múlik.

![A Megjelenés alatti beállítások: háttér- és munkasíkszínek a világos témához, és az élvonalak kapcsolója minden testhez.](shot:settings-appearance)

![A szerkesztő sötét színsémában. A színsémát a jobb felső sarokban állítod: Rendszer, Világos, Sötét vagy Grafit.](shot:editor-dark)

### Megjelenés: tengelynyilak és élvonalak

A {{ui:workspace.showAxes}} (alapból bekapcsolva) három nyilat rajzol a tárgyasztal bal hátsó sarkába: az **X** pirosan jobbra, az **Y** zölden hátra, a **Z** kéken felfelé mutat, ahogy a helyzetmezők számolnak. Ez a jobbkéz-szabály, amelyet a Tinkercad, a CAD-programok és a szeletelők is használnak. Ha a munkasík egy lapon van, követik. Itt kapcsolhatod ki őket, ha útban vannak.

A(z) {{ui:workspace.edgeLines}} minden testre körvonalat rajzol {{ui:workspace.edgeColor}} színnel (először feketével, mint a Tinkercad): segít, ha a sötét színek összefolynak. Alapból ki van kapcsolva, a nagyon nagy importált hálók pedig kimaradnak.

![Három sötét test bekapcsolt élvonalakkal: a körvonalak elválasztják őket.](shot:edge-lines)

A {{ui:workspace.strongHoles}} a lyukakat sötétebb szürkével, kevésbé átlátszóan és sötét körvonallal rajzolja. Segít, ha egy lyukat nehéz megtalálni az átlátszó testek között. Az élvonalakkal ellentétben gyors módban is bekapcsolva marad.

### Megjelenés: fény és árnyékok

A(z) {{ui:workspace.showShadows}} be- és kikapcsolja a vetett árnyékokat. Két csúszka állítja, hogyan világítódnak meg a testek. A(z) {{ui:workspace.shadowStrength}} azt adja meg, mennyire sötétek a vetett árnyékok, a(z) {{ui:workspace.shadeContrast}} pedig a fényt az egyenletes környezeti fénytől a fő fény felé tolja: az „erős” felé az árnyékos oldalak sötétebbek és az árnyékok jobban látszanak, a „lágy” felé minden laposabb. A legfelső végén a kontraszt nagyon erős, így az árnyékos oldalak és az árnyékok tényleg sötétek. A(z) {{ui:workspace.shadowSoftness}} élesek helyett lágyakká teszi az árnyékok széleit. A(z) {{ui:workspace.lightAzimuth}} a tárgyasztal körül forgatja a fő fényt (0° elölről, 90° jobbról), a(z) {{ui:workspace.lightElevation}} pedig megemeli; 90°-nál a Tinkercadhez hasonlóan függőlegesen a tárgyasztal fölött áll, és az árnyékok pontosan a testek alá esnek. A(z) {{ui:workspace.softLighting}} a fény nagy részét onnan hozza, ahonnan nézel, és a nézettel együtt forog: egyetlen lap sem marad sötét, és egy sötét színű, felfelé néző lap sem ég ki fehérré. A fő fény az árnyékokhoz kicsit megmarad, és a kontrasztcsúszka továbbra is működik. Ha alacsony fénynél még látszik egy világos csillogás, emeld a(z) {{ui:workspace.lightElevation}} értékét 90°-ra: akkor olyan, mint a Tinkercad. A(z) {{ui:workspace.lightReset}} mindent visszaállít.

### Megjelenés: méretek a munkasíkon

A(z) {{ui:workspace.showMoveDimensions}} húzás közben mutatja, mennyit mozgatsz, a(z) {{ui:workspace.showOriginDimensions}} pedig a kijelölés távolságait a tárgyasztal origójától, több kijelölt testnél is. A(z) {{ui:workspace.dimensionsAlwaysVisible}} beállítással ezek a méretek folyamatosan látszanak, nem csak húzás közben. Amíg egy elforgatott test ki van jelölve, a szögei alatta, a munkasíkon látszanak; a(z) {{ui:workspace.showRotationAngles}} ezt kikapcsolja. Bővebben a [Mérés és jegyzetek](chapter:measuring-and-notes) fejezetben.

### Megjelenés: kijelölés és mozgatás

{{ui:workspace.selectBeforeMoving}}: egy testet ilyenkor előbb ki kell jelölni, és csak a következő húzás mozgatja. Segít, ha gyerekek vagy sietős kezek nyúlnak a testekhez, és érintőképernyőn.

{{ui:workspace.frameByDirection}}: a jobbra húzott keret csak azt jelöli ki, ami teljesen benne van, a balra húzott mindent, amihez hozzáér (szaggatott vonallal rajzolódik), mint a SketchUpban.

A(z) {{ui:workspace.doubleClickOpensSketch}} azt állítja, hogy egy kihúzott vázlatra duplán kattintva újra megnyílik-e a vázlat, mint a Tinkercadben, a(z) {{ui:workspace.doubleClickOpensGroup}} pedig azt, hogy egy csoportra vagy kötegre duplán kattintva megnyílik-e a szerkesztése. A(z) {{ui:workspace.doubleClickCentersView}} azt állítja, hogy az üres munkasíkra duplán kattintva a nézet arra a helyre ugrik-e.

A(z) {{ui:workspace.objectSnap}} húzás közben más alakzatokhoz illeszti egy alakzat széleit és közepét; a jobb alsó rácsmenüben ugyanez a kapcsoló van. A(z) {{ui:workspace.cruise}} az új alakzatot az egérmutatón lógatja, és a mutató alatti lapra fekteti, mint a Cruise a Tinkercadben; kikapcsolva az új alakzat a tárgyasztal közepén jelenik meg. Bővebben a [Kijelölés és elrendezés](chapter:select-and-arrange) fejezetben.

### Megjelenés: a nézet

{{ui:workspace.startInPerspective}}: a szerkesztő ilyenkor perspektivikus nézetben nyílik meg a lapos helyett.

A(z) {{ui:workspace.startView}} azt a szöget adja meg, amelyben egy új terv megnyílik, és amelyhez a(z) {{ui:camera.home}} visszatér. Forgasd és nagyítsd a nézetet, ahogy tetszik, majd kattints a(z) {{ui:workspace.startViewUseCurrent}} gombra; a(z) {{ui:workspace.startViewStandard}} visszahozza a szokásos elölről-jobbról nézetet. Ebben a böngészőben minden tervre érvényes. Egy újra megnyitott terv továbbra is úgy nyílik meg, ahogy otthagytad.

A(z) {{ui:workspace.zoomSpeed}} egy csúszka lassútól gyorsig: milyen gyorsan nagyít a görgő és az érintőpad; a nagyítás gombjai és billentyűi megtartják a saját kis lépéseiket. {{ui:workspace.cameraInertia}}: ha elengeded az egeret, a nézet még egy pillanatig forog, és finoman lelassul. Kikapcsolva azonnal megáll, mint a Tinkercadben és a Fusion 360-ban.

A(z) {{ui:workspace.overhangAngle}} az a szög, amelytől egy lap túlnyúlásnak számít, ha a láthatósági menüben bekapcsolod a túlnyúlások megjelenítését: az ilyen lapok piros-fehér sraffozást kapnak. A 30° óvatos, a 70° jó nyomtatási hűtéssel számol; a 45° a szokásos kiindulás. Amíg látszanak, a nézet alatti sor megadja a legmeredekebb túlnyúlást, és hogy hány cm² igényel támaszt.

A(z) {{ui:workspace.booleanTriangleLimit}} korlátozza, hány háromszöge lehet egy importált hálónak, amikor vágod, egyesíted vagy metszed, mert ez a böngésződben számolódik. A korlát fölötti háló nem kerül feldolgozásra; előbb egyszerűsítsd a hálót, vagy emeld a korlátot, ha a számítógéped bírja. Egy magasabb korlát néhány másodpercre lefagyaszthatja a szerkesztőt.

### Mérés: mértékegységek, lépték és illesztési lépések

A(z) {{ui:workspace.measurement}} alatt állítod be a(z) {{ui:workspace.units}} értékét, azt a mértékegységet, amelyben a méretek látszanak ({{ui:workspace.scale}}: milliméter, centiméter vagy méter a metrikus, col vagy láb az angolszász rendszerben), hogy egy szám hány tizedesjegyet mutat ({{ui:workspace.accuracy}}), a(z) {{ui:workspace.snapGrid}} értékét, amelyhez a mozgatás és a méretezés illeszkedik, és saját illesztési lépéseket a(z) {{ui:workspace.customSnapGrids}} alatt.

A beállításokban a {{ui:workspace.measurement}} alatt adod meg a {{ui:workspace.units}} értékét. {{ui:units.imperial}} beállítással a layerling minden méretet colban mutat: az alakzaton, a tulajdonságpanelen, a mérőszalagon és a vonalzón. Az illesztőrács ilyenkor 1/64 és 1 col közötti lépéseket kínál, a tárgyasztal rácsa pedig colban rajzolódik (1/8 és 1 col között, alapból 1/4 col), minden egész colnál erősebb vonallal. A {{ui:workspace.inchFormat}} alatt választod ki, hogy a colok törtként jelenjenek meg, mint a Tinkercadben (1 5/8, 1/64 colra kerekítve), vagy tizedes törtként (1,625), annyi tizedesjeggyel, amennyit a {{ui:workspace.accuracy}} alatt beállítottál. Bármelyiket begépelheted, az „1 5/8” alakot is. Gyorsabban váltasz milliméter és hüvelyk között a Tulajdonságok ablak alján a {{ui:inspector.snapGrid}} melletti kis **mm | in** kapcsolóval: ugyanúgy változtatja a mértékegységet, a lap rácsát és a rögzítési lépést, mint a beállítások, ennél a tervnél.

Ugyanitt a {{ui:workspace.customSnapGrids}} alatt saját illesztési lépéseket adhatsz hozzá: egy nevet és egy méretet milliméterben, például „Tűosztás 2,54 mm” a DIP chipek, tüskesorok és próbapanel-furatok osztásához, vagy „MX Key Unit” 19,05 mm-rel a billentyűzetgombok osztásához. Az illesztési lépés menüje ezután ezt a méretet egészben, felezve és negyedelve kínálja fel (1 ×, ½ × és ¼ ×), így az alakzatokat egy, fél vagy negyed osztással mozgathatod. Ha csak magát a méretet szeretnéd, vedd ki mellette a pipát a {{ui:workspace.customSnapGridParts}} elől; a menüben ekkor csak ez az egy lépés lesz. A saját lépések a tervvel együtt mentődnek, és a {{ui:workspace.makeDefault}} gombbal is továbbvihetők.

### Munkasík: tárgyasztal és nyomtató

A(z) {{ui:workspace.printer}} a munkasíkot a nyomtatód tárgyasztalához igazítja, és megjelöli azokat a testeket, amelyek túlnyúlnak rajta, lásd [Nyomtatás](chapter:printing). A(z) {{ui:workspace.showPlateLabels}} ráírja a tárgyasztalra a terv nevét, kiválasztott nyomtatónál pedig annak nevét és nyomtatási terét is.

A(z) {{ui:workspace.size}} saját méretet ad a tárgyasztalnak, {{ui:workspace.width}} és {{ui:workspace.length}} milliméterben vagy a választott mértékegységben. A rács mindig átmegy az origón, így az erősebb vonalak a tengelyeken vannak, bármekkora is a tárgyasztal.

### Munkasík: rács

A(z) {{ui:workspace.showGrid}} megjeleníti vagy elrejti a rácsot a tárgyasztalon. A(z) {{ui:workspace.gridBlockSize}} a vonalai távolságát állítja, a(z) {{ui:workspace.gridMajorEvery}} pedig azt, hogy minden 5. vagy 10. rácslépésnél jön-e egy erősebb vonal; a(z) {{ui:workspace.gridMajorColor}} saját színt ad ennek a vonalnak, amelyet a középső kereszt és a tárgyasztal széle is átvesz. A(z) {{ui:workspace.gridColor}} a szokásos vonalak színe.

Minden rácsvonal vastagodik nagyításkor, mint a Tinkercadben, és látható marad kicsinyítéskor. Ha ez sok neked, kapcsold ki a(z) {{ui:workspace.gridLinesGrow}} kapcsolót, és a vonalak minden nagyításnál egy pixel szélesek maradnak, mint a vázlatban.

Ha a rács eltűnt, például mert a színe a tárgyasztal színére lett állítva, a(z) {{ui:workspace.workplane}} terület végén lévő {{ui:workspace.resetGrid}} visszaállítja a láthatóságát, színeit, osztását és vonalvastagságát a szabványra, itt és a(z) {{ui:workspace.makeDefault}} gombbal mentett alapértelmezésben is.

### Alakzatok alapértékei

A(z) {{ui:workspace.shapeDefaults}} alatt kiválasztasz egy alakzatot a(z) {{ui:workspace.shape}} mezőben, és beállítod, mivel indul, amikor hozzáadod: a szélességét, hosszát és magasságát. A(z) {{ui:workspace.useAppDefaults}} visszaállítja az alakzatot azokra az értékekre, amelyekkel az alkalmazás indítja. A saját beállításokkal rendelkező alakzatok ezeket a(z) {{ui:workspace.shapeDetails}} alatt mutatják. Az értékek az új alakzatokra érvényesek, nem a tárgyasztalon már állókra. A(z) {{ui:workspace.customLimit}} saját felső határt szab annak, mekkorára tehetik ezt az alakzatot a fogantyúk és a tulajdonságok; üresen a szokásos határok érvényesek.

### Mentett előzmények

A(z) {{ui:workspace.history}} alatt a(z) {{ui:workspace.savedHistory}} csúszka azt adja meg, hány befejezett művelet marad visszavonható, miután mentetted vagy újra megnyitottad a tervet. Az alapérték tervenként 100 művelet. Egy alacsonyabb korlát a terv régebbi visszavonási lépéseit végleg elveti.

## Ha a layerling lassúnak tűnik

A layerling mindent a böngésződben számol és rajzol. Régebbi gépen, gyenge videokártyával vagy több nagy képernyőn ezért a nézet nehézkesnek tűnhet. Ami segít:

- **{{ui:workspace.fastMode}}** a {{ui:workspace.appearance}} alatt egyszerre kikapcsol mindent, ami a nézetnek sokba kerül: az árnyékokat, az élvonalakat minden testen és a kamera tehetetlenségét. A nézetet ráadásul csak a képernyő saját felbontásában rajzolja, ami nagy felbontású képernyőn akár négyszer kevesebb pixel. A saját beállításaid megmaradnak, és újra érvényesek, amint kikapcsolod.
- **A kamera tovább forog:** Ha forgatás után elengeded az egeret, a nézet még egy pillanatig forog, és finoman lelassul. Ez szándékos, nem akadozás. Ha a Tinkercadhez vagy a Fusion 360-hoz szoktál, kapcsold ki az {{ui:workspace.cameraInertia}} kapcsolót a {{ui:workspace.appearance}} alatt, és a nézet azonnal megáll.
- **Egyes kapcsolók:** Gyors mód nélkül csak az {{ui:workspace.showShadows}} vagy az {{ui:workspace.edgeLines}} kapcsolót is kikapcsolhatod.
- **Használd a videokártyát:** Chrome-ban nyisd meg a `chrome://gpu` oldalt (Edge-ben az `edge://gpu` oldalt). A „WebGL” mellett „Hardware accelerated” kell, hogy álljon. Ha „Software only” áll ott, a hardveres gyorsítás ki van kapcsolva a böngésző beállításaiban. Windowson a Gépház → Rendszer → Kijelző → Grafika alatt a böngészőhöz a „Nagy teljesítmény” lehetőséget is kiválaszthatod, hogy a valódi videokártyát használja, ne a processzorba épített gyengébbet.
- **Egyszerűsítsd a nagy importált hálókat:** Egy sok százezer háromszögből álló modell bármilyen nézetet lelassít. Hogy hogyan ritkíthatod, az a fájlokról szóló fejezetben van, az „Importált háló egyszerűsítése” résznél.
- **Zárd be a többi lapot:** Minden nyitott layerling-lap és minden más 3D-s oldal ugyanazon a videokártyán osztozik.
