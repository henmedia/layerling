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

Táblagépen vagy telefonon két ujjal nagyítasz (széthúzás és összecsípés) és mozgatod a nézetet (együtt csúsztatva). Egy ujjal üres helyen a nézetet forgatod, egy koppintás ott pedig megszünteti a kijelölést; egy alakzaton vagy fogantyún a terven dolgozol, pont mint a bal egérgombbal. Ha akkor is forgatnád a nézetet, amikor az ujjad egy alakzaton indul, kapcsold be a kamerasávon az {{ui:camera.touchRotate}} kapcsolót. Ez a kapcsoló érintőképernyős eszközökön jelenik meg.

A tollas digitalizáló tábla egérként viselkedik: a toll hegye a bal gomb, a tollon lévő gomb a jobb, a nézet forgatásához és a menühöz. A tábla gyorsgombjait a meghajtójában a layerling [billentyűparancsaira](chapter:shortcuts) állíthatod.

**Táblagépen lehetőleg érintőtollal dolgozz.** A hegye sokkal finomabb, mint egy ujjbegy, és nem takarja el, amire célzol, így a vázlat apró pontjait, vékony vonalait és fogantyúit, a mérési pontokat és az éleket pontosan eltalálod, és a hosszabb munka is kevésbé fárasztó. A layerling már most is kicsit messzebbről engedi elérni ujjal a pontokat, vonalakat, fogantyúkat és éleket, mint egérmutatóval, de az érintőtoll marad a pontosabb.

### A nézetkocka

A bal felső sarokban lévő kocka mutatja, merre nézel. Az egyik oldalára kattintva egyenes nézetbe ugrasz felülről, alulról, elölről, hátulról, balról vagy jobbról. A kocka egyik sarkára kattintva abból a sarokból, ferdén nézed a modellt, egy él közelébe kattintva pedig arról az élről, két oldal közül; a pont kivilágosodik, amíg a mutató rajta van. Az [[1]]–[[6]] számbillentyűk is az egyenes nézeteket adják. Ha közben a [[Shift]] billentyűt is nyomva tartod, a nézet a kijelölésre is ránagyít, mint a [[Shift]]+[[F]].

A kockát húzva forgathatod a nézetet, pont mint a jobb egérgombos húzással. Ha semmi sincs kijelölve, a nyílbillentyűk is forgatják a nézetet: lenyomásonként 15°-kal, [[Shift]] billentyűvel 90°-kal. Arra forgatják a modellt, amerre mutatnak – a [[→]] jobbra fordítja az elejét, a [[↑]] felfelé billenti az elejét. A [[Ctrl]] lenyomva tartásával a nyilak ehelyett eltolják a nézetet a képernyőn: lenyomásonként a kép tizedével, a [[Shift]] billentyűvel együtt a felével. A modell arra mozdul, amerre mutatnak. Ha valami ki van jelölve, a nyilak azt mozgatják; a nézet forgatásához előbb kattints egy üres helyre. Érintőképernyőn ez egy ujjal is működik, az {{ui:camera.touchRotate}} bekapcsolása nélkül.

### A kamerasáv

A bal szélen egy keskeny sáv van. Felülről lefelé:

- A {{ui:camera.home}} az egész jelenetet visszahozza a képbe. A billentyűje a [[Home]]; az [[F]] is ezt teszi, ha nincs semmi kijelölve.
- A {{ui:camera.focusSelection}} a kijelölésre nagyít ([[F]] vagy [[Shift]]+[[F]]).
- A {{ui:camera.zoomIn}} és a {{ui:camera.zoomOut}} lépésenként nagyít és kicsinyít, ahogy a [[+]] és a [[−]] billentyű is.
- Az {{ui:camera.orthographic}} lapos nézetre vált, amelyben a párhuzamos élek párhuzamosak maradnak. Méréshez és élek egymáshoz igazításához ez gyakran kényelmesebb, mint a perspektivikus nézet. Az [[O]] oda-vissza vált, és egy második kattintás visszavált.
- A {{ui:camera.secondView}} a terv második nézetét nyitja meg egy saját ablakban, lásd lent. Egy második kattintás bezárja.
- A {{ui:camera.hideWorkplane}} (a rács fölötti szem) elrejti a tárgyasztalt a rácsával együtt, így alulról is megnézheted egy terv alját. Csak a nézet változik: az új alakzatok továbbra is a munkasíkra kerülnek. Egy második kattintás újra megmutatja.
- A {{ui:camera.placeWorkplane}}, a mérőszalag és a derékszögvonalzó önálló eszközök, ezekről lentebb és a [Mérés és jegyzetek](chapter:measuring-and-notes) fejezetben olvashatsz.

A sáv legtetején lévő kis nyíl elrejti a sávot, ha útban van.

Egy terv úgy nyílik meg, ahogy hagytad: a nézet szöge, nagyítása és helyzete ebben a böngészőben vele együtt megmarad, így ott folytatod, ahol abbahagytad, akkor is, ha közben a kezdőlapra mentél vagy bezártad az oldalt. Egy mentett fájl (.lyl) is magával viszi a nézetet, így máshol is abban nyílik meg. A nézet nem része a visszavonási előzményeknek.

Minden tervben négy saját nézetet is megőrizhetsz. A [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] vagy [[Shift]]+[[0]] pontosan úgy menti a nézetet, ahogy van - szög, helyzet, nagyítás, valamint sík vagy perspektivikus nézet - az adott billentyűre, a billentyű magában ([[7]], [[8]], [[9]] vagy [[0]]) pedig visszahozza. Egy üzenet alul megerősíti a mentést; ha ugyanarra a billentyűre újra mentesz, az lecseréli a nézetet. A fenti nézethez hasonlóan a mentett nézetek is a tervvel maradnak ebben a böngészőben, és egy mentett fájl (.lyl) is magával viszi őket; nem részei a visszavonási előzményeknek.

### Második nézet saját ablakban

A {{ui:camera.secondView}} egy ablakot nyit, amely ugyanazt a tervet egy saját kamerán át mutatja, így egyszerre két oldalról láthatod - például elölről, miközben felülről dolgozol. Minden változtatás, amit a szerkesztőben végzel, ott azonnal megjelenik; magát a tervet csak a főablakban lehet módosítani, és a fogantyúk is ott maradnak. A második ablakban az egér és a nézetkocka ugyanúgy forgatja a nézetét, mint itt, és a billentyűk is: [[1]]–[[6]], [[F]], [[Home]], [[O]], [[+]] és [[−]], a nyilak a forgatáshoz, a [[Ctrl]] a nyilakkal az eltoláshoz. Az [[F]] ott arra nagyít, ami a szerkesztőben ki van jelölve. A terv négy mentett nézete is működik ott: a [[7]], [[8]], [[9]] és [[0]] visszahozza őket, a [[Shift]] pedig ezek egyikével az ablak nézetét menti el alá - mindkét ablak számára. Saját kamerasávjában ott van a {{ui:camera.home}}, a {{ui:camera.focusSelection}}, a {{ui:camera.zoomIn}}, a {{ui:camera.zoomOut}}, az {{ui:camera.orthographic}} és a {{ui:camera.hideWorkplane}}, és ezek csak arra az ablakra hatnak. Az ablak ott nyílik meg, ahol hagytad, ugyanakkora méretben, és a szerkesztővel együtt bezárul. Telefonon és táblagépen a gomb nem jelenik meg.

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

A panel a gombjához kapcsolódik. Ha eltakar valamit, húzd a címsoránál fogva bárhová a munkasíkon; legközelebb is ott nyílik meg. Kattints duplán a címsorára, vagy ejtsd a gombra, hogy visszakerüljön.

A {{ui:camera.sectionConfirm}} bezárja a panelt, és megtartja a vágást, a {{ui:camera.sectionBack}} pedig előbb a mérést fejezi be, aztán bezárja a panelt – ez olyan táblagéphez való, amelyen nincs [[Enter]] vagy [[Esc]]. Az [[Esc]] is bezárja a panelt; a vágás megmarad, amíg ki nem kapcsolod, vagy vissza nem mész a tervek áttekintéséhez. Amíg be van kapcsolva, a gombja kiemelve marad. Ami a levágott oldalra kerül, csak akkor látszik, ha kikapcsolod a vágást.

## A munkasík

Az új alakzatok a munkasíkhoz igazodnak. Kezdetben ez az alaplap a rácsával. De bármilyen felületre áthelyezheted, hogy valamit egy oldalra vagy egy lejtős lapra tegyél.

1. Nyomd meg a [[W]] billentyűt, vagy kattints a {{ui:camera.placeWorkplane}} gombra.
2. Vidd az egeret egy test egyik lapja fölé. Kivilágosodik.
3. Egy kattintás oda teszi a munkasíkot. Minden, amit most hozzáadsz, ezen a lapon ül.

Ha ehelyett az üres tárgyasztalra kattintasz, a munkasík laposan oda kerül, ahová kattintottál, az illesztőrácsra. Az új alakzatok és egy befejezett vázlat, a forgatott is, ezután ott jelennek meg, nem a tárgyasztal közepén. Amíg a munkasík így laposan a tárgyasztalon fekszik, a tárgyasztal csak a körvonalát mutatja: két rács ugyanabban a síkban vibráló mintát adna.

Egy lapon a munkasík origója egyébként a rácshoz illeszkedik. Ha a lap egyik sarka közelébe kattintasz, pontosan arra a sarokra kerül. Egy él közelében az élre fekszik, és a rács hozzá igazodik; így szándékosan választhatod meg a rács szögét. Sarok vagy él nélkül egy fekvő lapon a rács a testtel párhuzamosan fut, így egy elforgatott dobozon vele együtt el van forgatva.

Egy kattintás a tárgyasztal mellé vagy az [[Esc]] visszateszi a munkasíkot az alaplapra. Még gyorsabb a {{ui:camera.resetWorkplane}}: a lefelé mutató nyilas gomb a kamerasávon a szem alatt van, amíg a munkasík egy lapon fekszik. A [[Shift]]+[[W]] közvetlenül az épp kijelölt lapra teszi. Az [[Alt]]+[[W]] bármikor visszateszi az alaplapra, akár van kijelölés, akár nincs. Ha kattintás közben a [[Shift]] billentyűt nyomva tartod, a sík a másik irányba néz.

Amíg a munkasík egy lapon van, a {{ui:camera.placeWorkplane}} mellett megjelenik egy szem. Elrejti a munkasíkot anélkül, hogy eldobná, hogy tisztán lásd a tervet: az új alakzatok továbbra is arra a lapra kerülnek, és a forgatás is körülötte történik. A szemre kattintva újra megjelenik, és egy új munkasík megadása is megjeleníti.

## Rács és illesztés

A rács a tárgyasztal méretét mutatja. Jobbra lent van az **illesztési lépés**: a mozgatás és a méretezés ekkora lépésekben illeszkedik, például 1 mm-esekben. Finom munkához vedd kisebbre, durva elrendezéshez nagyobbra. A szalagon a {{ui:editor.tool.snapToGrid}} utólag a legközelebbi rácspontra helyezi a kijelölt alakzatokat. Mozgatás közben az alakzatok más alakzatokhoz is illeszkednek, lásd a [Kijelölés és elrendezés](chapter:select-and-arrange) fejezetet.

A beállításokban a {{ui:workspace.measurement}} alatt adod meg a {{ui:workspace.units}} értékét. {{ui:units.imperial}} beállítással a layerling minden méretet colban mutat: az alakzaton, a tulajdonságpanelen, a mérőszalagon és a vonalzón. Az illesztőrács ilyenkor 1/64 és 1 col közötti lépéseket kínál, a tárgyasztal rácsa pedig colban rajzolódik (1/8 és 1 col között, alapból 1/4 col), minden egész colnál erősebb vonallal. A {{ui:workspace.inchFormat}} alatt választod ki, hogy a colok törtként jelenjenek meg, mint a Tinkercadben (1 5/8, 1/64 colra kerekítve), vagy tizedes törtként (1,625), annyi tizedesjeggyel, amennyit a {{ui:workspace.accuracy}} alatt beállítottál. Bármelyiket begépelheted, az „1 5/8” alakot is. Gyorsabban váltasz milliméter és hüvelyk között a Tulajdonságok ablak alján a {{ui:inspector.snapGrid}} melletti kis **mm | in** kapcsolóval: ugyanúgy változtatja a mértékegységet, a lap rácsát és a rögzítési lépést, mint a beállítások, ennél a tervnél.

Ugyanitt a {{ui:workspace.customSnapGrids}} alatt saját illesztési lépéseket adhatsz hozzá: egy nevet és egy méretet milliméterben, például „Tűosztás 2,54 mm” a DIP chipek, tüskesorok és próbapanel-furatok osztásához, vagy „MX Key Unit” 19,05 mm-rel a billentyűzetgombok osztásához. Az illesztési lépés menüje ezután ezt a méretet egészben, felezve és negyedelve kínálja fel (1 ×, ½ × és ¼ ×), így az alakzatokat egy, fél vagy negyed osztással mozgathatod. Ha csak magát a méretet szeretnéd, vedd ki mellette a pipát a {{ui:workspace.customSnapGridParts}} elől; a menüben ekkor csak ez az egy lépés lesz. A saját lépések a tervvel együtt mentődnek, és a {{ui:workspace.makeDefault}} gombbal is továbbvihetők.

A tárgyasztal méretét, rácsosztását és színét a beállításokban (a fogaskerék a szalagon) változtatod meg: a részek {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} és {{ui:workspace.history}}. A {{ui:workspace.appearance}} alatt olyan kapcsolókat találsz, mint az {{ui:workspace.startInPerspective}} és az {{ui:workspace.showShadows}}, a {{ui:workspace.workplane}} alatt pedig a {{ui:workspace.showGrid}} kapcsolót. A munkaterület színeit is a {{ui:workspace.appearance}} alatt állítod: {{ui:workspace.backgroundColor}} és {{ui:workspace.surfaceColor}} a világos témához (a sötét témák megtartják a sajátjukat), a rács színe mellett, amely a {{ui:workspace.workplane}} alatt van. Ott választod ki azt is, hogy a sötétebb rácsvonal minden 5. vagy minden 10. rácslépésnél legyen ({{ui:workspace.gridMajorEvery}}), és a {{ui:workspace.gridMajorColor}} mezővel saját színt adhatsz neki; a középkereszt és a tárgyasztal szegélye is ezt veszi át. A rács minden vonala vastagodik, ahogy ránagyítasz, mint a Tinkercadben, és kicsinyítéskor is látható marad; ha ez neked sok, kapcsold ki az {{ui:workspace.gridLinesGrow}} kapcsolót, és a vonalak minden nagyításnál egy pixel szélesek maradnak, mint a vázlatban. A színmezőben az [[Enter]] átveszi a begépelt hexa értéket. Az {{ui:workspace.edgeLines}} minden testre körvonalat rajzol, az {{ui:workspace.edgeColor}} színével (kezdetben fekete, mint a Tinkercadben): segít, ha a sötét színek egybefolynak. Alapból ki van kapcsolva, és a nagyon nagy importált hálók kimaradnak. A rács mindig átmegy az origón, így az erősebb vonalak a tengelyekre esnek, akármekkora is a tárgyasztal. Ha a rács eltűnt, például mert egy színt a lemez színére állítottak, a {{ui:workspace.resetGrid}} a {{ui:workspace.workplane}} terület végén visszaállítja a láthatóságot, a színeket, a távolságot és a vonalvastagságot az alapértelmezettre, itt és a {{ui:workspace.makeDefault}} gombbal mentett alapértelmezésben is.

A {{ui:workspace.strongHoles}} a lyukakat sötétebb szürkével, kevésbé átlátszóan és sötét körvonallal rajzolja. Segít, ha egy lyukat nehéz megtalálni az átlátszó testek között. Az élvonalakkal ellentétben gyors módban is bekapcsolva marad.

A {{ui:workspace.showAxes}} (alapból bekapcsolva) három nyilat rajzol a tárgyasztal bal hátsó sarkába: az **X** pirosan jobbra, az **Y** zölden hátra, a **Z** kéken felfelé mutat, ahogy a helyzetmezők számolnak. Ez a jobbkéz-szabály, amelyet a Tinkercad, a CAD-programok és a szeletelők is használnak. Ha a munkasík egy lapon van, követik. Itt kapcsolhatod ki őket, ha útban vannak.

A {{ui:workspace.appearance}} alatt két csúszka állítja, hogyan világítódnak meg a testek. Az {{ui:workspace.shadowStrength}} azt adja meg, mennyire sötétek a vetett árnyékok, az {{ui:workspace.shadeContrast}} pedig az egyenletes környezeti fényből a fő fénybe tolja át a fényt: az „erőteljes” felé az árnyékos oldalak sötétebbek lesznek, és az árnyékok jobban látszanak, a „lágy” felé minden laposabb lesz. A felső végén a kontraszt nagyon erős, így az árnyékos oldalak és az árnyékok igazán sötétek. Az {{ui:workspace.shadowSoftness}} élesek helyett lágyakká teszi az árnyékok széleit. A {{ui:workspace.lightAzimuth}} a fő fényt a tárgyasztal körül forgatja (0° elölről, 90° jobbról), a {{ui:workspace.lightElevation}} pedig megemeli; 90°-nál egyenesen a tárgyasztal fölött áll, mint a Tinkercadben, és az árnyékok közvetlenül a testek alá esnek. A {{ui:workspace.lightReset}} mindent visszaállít. A {{ui:workspace.classicLook}} úgy állítja be a munkaterületet, ahogy a Tinkercad mutatja: fehér alap, halványkék milliméterrács centiméterenként sötétebb vonallal, fekete élvonalak, felülről jövő fény lágy árnyékokkal. Utána minden érték külön is módosítható. Mindegyik úgy indul, ahogy a layerling mindig is kinézett, és hogy neked mi tetszik, az a monitorodtól is függ. A vázlatnézetnek saját színei vannak: {{ui:workspace.sketchBackground}} a lap körüli ablakhoz, {{ui:workspace.sketchPlateColor}} a rács alatti laphoz és {{ui:workspace.sketchGridColor}}, mind a világos témához. A {{ui:workspace.sketchMatch}} egy kattintással átveszi a munkaterület három színét.

![A Megjelenés alatti beállítások: háttér- és munkasíkszínek a világos témához, és az élvonalak kapcsolója minden testhez.](shot:settings-appearance)

![Három sötét test bekapcsolt élvonalakkal: a körvonalak elválasztják őket.](shot:edge-lines)

![A szerkesztő sötét színsémában. A színsémát a jobb felső sarokban állítod: Rendszer, Világos, Sötét vagy Grafit.](shot:editor-dark)

Az {{ui:workspace.toolbarSize}} a {{ui:workspace.appearance}} alatt kisebbé vagy nagyobbá teszi a felső szalag gombjait, az alakzatmenüjét, a bal oldali kameravezérlőket és a jobb oldali tulajdonságpanelt: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (ahogy mindig is volt) vagy {{ui:workspace.toolbarSizeLarge}}. A kicsi laptopon több helyet hagy a munkasíknak; a nagyot könnyebb eltalálni nagy képernyőn vagy ujjal. Nagy gombokkal a szalag csoportjai egy második sorba kerülnek, ha az ablak túl keskeny hozzájuk. A méret ebben a böngészőben megmarad, és minden tervre érvényes.

A {{ui:workspace.viewCubePosition}} a {{ui:workspace.appearance}} alatt a nézetkockát a munkaterület egy másik sarkába teszi: {{ui:workspace.viewCubePositionTopLeft}} (ahogy mindig is volt), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} vagy {{ui:workspace.viewCubePositionBottomRight}}. A bal felső sarkon kívül minden sarokban a kameravezérlők feljebb kerülnek, a kocka által szabadon hagyott helyre. Jobb alul a kocka közvetlenül a {{ui:inspector.snapGrid}} vezérlő fölött áll. Amíg jobb oldalon egy alakzat tulajdonságai nyitva vannak, a jobb oldali kocka balra kitér előlük. A sarok ebben a böngészőben megmarad, és minden tervre érvényes. Keskeny ablakban, például telefonon, a beállítás rejtve van, és a kocka a bal felső sarokban marad.

> **Tipp:** Amikor részeket pontosan illesztesz egymáshoz, ne forgasd a nézetet. A számbillentyűkkel válts felül- vagy elölnézetre, és nyomd meg az [[O]] billentyűt a lapos megjelenítéshez. Így azonnal látod, hogy két él tényleg egy síkban van-e.

## Ha a layerling lassúnak tűnik

A layerling mindent a böngésződben számol és rajzol. Régebbi gépen, gyenge videokártyával vagy több nagy képernyőn ezért a nézet nehézkesnek tűnhet. Ami segít:

- **{{ui:workspace.fastMode}}** a {{ui:workspace.appearance}} alatt egyszerre kikapcsol mindent, ami a nézetnek sokba kerül: az árnyékokat, az élvonalakat minden testen és a kamera tehetetlenségét. A nézetet ráadásul csak a képernyő saját felbontásában rajzolja, ami nagy felbontású képernyőn akár négyszer kevesebb pixel. A saját beállításaid megmaradnak, és újra érvényesek, amint kikapcsolod.
- **A kamera tovább forog:** Ha forgatás után elengeded az egeret, a nézet még egy pillanatig forog, és finoman lelassul. Ez szándékos, nem akadozás. Ha a Tinkercadhez vagy a Fusion 360-hoz szoktál, kapcsold ki az {{ui:workspace.cameraInertia}} kapcsolót a {{ui:workspace.appearance}} alatt, és a nézet azonnal megáll.
- **Egyes kapcsolók:** Gyors mód nélkül csak az {{ui:workspace.showShadows}} vagy az {{ui:workspace.edgeLines}} kapcsolót is kikapcsolhatod.
- **Használd a videokártyát:** Chrome-ban nyisd meg a `chrome://gpu` oldalt (Edge-ben az `edge://gpu` oldalt). A „WebGL” mellett „Hardware accelerated” kell, hogy álljon. Ha „Software only” áll ott, a hardveres gyorsítás ki van kapcsolva a böngésző beállításaiban. Windowson a Gépház → Rendszer → Kijelző → Grafika alatt a böngészőhöz a „Nagy teljesítmény” lehetőséget is kiválaszthatod, hogy a valódi videokártyát használja, ne a processzorba épített gyengébbet.
- **Egyszerűsítsd a nagy importált hálókat:** Egy sok százezer háromszögből álló modell bármilyen nézetet lelassít. Hogy hogyan ritkíthatod, az a fájlokról szóló fejezetben van, az „Importált háló egyszerűsítése” résznél.
- **Zárd be a többi lapot:** Minden nyitott layerling-lap és minden más 3D-s oldal ugyanazon a videokártyán osztozik.
