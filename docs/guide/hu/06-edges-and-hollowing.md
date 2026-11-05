---
title: Élek letörése és testek kiüregelése
summary: Élletörés és lekerekítés a kiválasztott éleken, egyenletes vastagságú falak dobozokhoz, poharakhoz és házakhoz.
---

## Élek letörése és lekerekítése

Az éles élek ritkán mutatnak jól egy nyomtatott alkatrészen, és különösebben erősek sem. Az **élletörés** ferdén levágja az élt, a **lekerekítés** lekerekíti. Mindkettő azokra az élekre hat, amelyekre kattintasz.

1. Jelöld ki a testet (vagy a csoportot).
2. Kattints a szalagon a {{ui:editor.tool.fillet}} vagy az {{ui:editor.tool.chamfer}} gombra, nyomd meg a [[B]] billentyűt a lekerekítéshez vagy a [[Shift+B]] billentyűt az élletöréshez, vagy kattints jobb gombbal a testre, és válaszd ki a menüből.
3. A test élei kivilágosodnak. Kattints azokra, amelyeket érinteni kell. Egy újabb kattintás kiveszi az élt. A [[Shift]] billentyűvel egyetlen élt adsz hozzá vagy veszel el.
4. Állítsd be a méretet, és erősítsd meg az {{ui:edge.apply}} gombbal vagy az [[Enter]] billentyűvel. Ezután az ablak ugyanazzal a mérettel nyitva marad az új testen, így rögtön jöhet a következő lekerekítés vagy letörés; a {{ui:edge.done}}, az [[Esc]] vagy a keresztecske zárja be. A [[Shift]] vagy a [[Ctrl]] mellett a {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} vagy {{ui:edge.horizontalEdges}} gombra kattintva ezek az élek hozzáadódnak a kijelöltekhez, nem váltják le őket.

![Az „Élek lekerekítése” eszköz: minden éles él ki van jelölve, a kép a 4 mm sugarú előnézetet mutatja.](shot:fillet-preview)

Az eszközablak a jobb felső sarokban van. Ha eltakarja azokat az éleket, amelyekre kattintanál, húzd el a címsoránál fogva; legközelebb is ott nyílik meg, ahogy a {{ui:editor.tool.hollow}} és az {{ui:editor.tool.array}} is. Kattints duplán a címsorra, hogy visszakerüljön.

Ha nyitott ablak mellett alakzatot választasz az alakzatlistából, az ablak semmit sem alkalmazva bezárul, és a kiválasztott élek elvesznek. A kattintás ekkor az új alakzatot helyezi el, nem éleket választ.

Az ablakban ezeket találod:

- A {{ui:edge.allSharpEdges}} egyszerre minden élt kijelöl, a {{ui:edge.clear}} kiüríti a kijelölést.
- **{{ui:edge.radius}}** a lekerekítéshez. Az élletöréshez a {{ui:edge.distance}} vagy a {{ui:edge.angle}} értéket állítod be.
- A {{ui:edge.variableRadius}} (csak lekerekítésnél) egy él mentén változtatja a sugarat: az egyik végén kicsi, a másikon nagyobb, közte egyenletes, például ahol egy függőleges fal egy ferdével találkozik. Kattints egyetlen élre, majd állítsd be a {{ui:edge.radiusStart}} és a {{ui:edge.radiusEnd}} értékét. Hogy melyik vég az eleje, az él keletkezéséből adódik; ha a nagyobb sugár a rossz végre kerül, a {{ui:edge.swapEnds}} megfordítja. Egyszerre egy élen működik, több élt egymás után kerekíts le. A {{ui:edge.editAction}} mindkét értéket visszahozza.
- A {{ui:edge.concave}} (csak lekerekítésnél) megfordítja a lekerekítést: az él lekerekítése helyett negyedkör alakú mélyedést vág ki belőle, mint egy doboz kivájt sarkai. A mélyedés az él mentén fekvő, a megadott {{ui:edge.radius}} sugarú henger, ezért bármilyen szögnél működik, de csak egyenes éleknél, és nem együtt a {{ui:edge.variableRadius}} beállítással. A {{ui:edge.editAction}} visszahozza.
- Az {{ui:edge.sharpThreshold}} dönti el, mely élek számítanak egyáltalán élesnek. 25°-os értéknél csak a határozott töréseket veszi élnek, a lapos átmeneteket békén hagyja.
- A {{ui:edge.topEdges}} csak a test legtetején futó éleket választja ki. Ez a gyors út egy sütikiszúróhoz: építsd meg a körvonalat egy vázlatban vonalként, majd törd le a felső éleket. A {{ui:edge.angle}} adja meg, milyen meredek a letörés; nem érhet tovább, mint amilyen vastag a fal.
- Az {{ui:edge.bottomEdges}} csak a test legalján futó éleket választja ki, a {{ui:edge.topEdges}} párja. Így gyorsan lekerekítheted vagy letörheted csak egy alkatrész talpát.
- Az {{ui:edge.chamfillet}}, amelyet a letörés ablakának tetején a {{ui:editor.tool.chamfer}} mellett választasz, a munkadarab nyomtatható talpát készíti el: a lemeznél egy letörés, amely érintőlegesen megy át a fal felé vezető lekerekítésbe, így az első rétegekhez nem kell támasz, az él mégis puhán végződik. A {{ui:edge.distance}} a talp által elfoglalt magasság, az {{ui:edge.angle}} (15°–75°) a letörés meredeksége a lemeznél. Az éleket az {{ui:edge.bottomEdges}} gombbal választod ki.
- A {{ui:edge.onlyVisibleEdges}} elrejti azokat az éleket, amelyek onnan nézve, ahonnan nézel, a test mögött vannak. Alapból minden él átlátszik a testen, ami egy zsúfolt alkatrésznél zavaró lesz; bekapcsolt kapcsolóval csak a feléd néző éleket látod, és csak azokra kattinthatsz. A többi eléréséhez forgasd el a nézetet. Egy pirossal rajzolt él (lásd lent) mindig látszik.
- {{ui:edge.tangentChains}}: egy kattintás ilyenkor azokat az éleket is kiválasztja, amelyek simán egymásba folynak, például egy lekerekített sarkú lap körüli összes élt. A kapcsoló csak azt dönti el, mit választ ki egy kattintás: a CAD-mag az élletörést vagy a lekerekítést mindig továbbviszi az ilyen simán folytatódó éleken. Az ablak megmondja, hány további élen történik ez meg.
- Az {{ui:edge.keepSize}} megtartja az élletörés vagy a lekerekítés méretét akkor is, ha később átméretezed a testet.
- Az {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} vagy {{ui:edge.fine}}) dönti el, milyen finoman számolódik az előnézet. Nehéz alkatrészeknél a {{ui:edge.draft}} gyorsabb.
- Az ablak ebben a böngészőben megjegyzi a beállításait, külön a letöréshez, a lekerekítéshez és a letörés lekerekítéssel változathoz: a méret, a szög, a küszöb, az előnézet minősége és a kapcsolók úgy maradnak, ahogy hagytad őket, a(z) {{ui:edge.apply}} után, visszavonás után és az eszköz következő megnyitásakor is. Ha a test nem bírja el a méretet, a testből számolt méret lép a helyébe. Csak a(z) {{ui:edge.tangentChains}} indul újra: egy test első letörésénél vagy lekerekítésénél be, utána ki.

Amíg a méretet állítod, a layerling újraszámolja az előnézetet. Ez eltarthat egy pillanatig. Nyugodtan állíts tovább; az utoljára választott érték számolódik ki.

Ha a méret túl nagy az élhez, a layerling ezt jelzi, és kisebb értéket javasol. Gyakran egy-két milliméterrel kevesebb is elég. Éles szögeknél egy lekerekítésnek több hely kell, mint amennyit a sugara sejtet. Kis képernyőn az ablak magától legörget, hogy az üzenet látható legyen.

Ha egy addig működő kijelölés egy újabb élre kattintva hibára fut, az az él pirosra vált, és vastagabban rajzolódik: ez az, amelyet ekkora méretben nem lehet a többivel együtt megmunkálni. Kattints rá újra, hogy kivedd, vagy csökkentsd a méretet. Ha az üzenet fennállása alatt további élekre kattintasz, az első piros marad. Ha nincs korábbi működő kijelölés – a legelső kattintásnál, vagy egy épp megemelt méretnél –, azok az élek válnak pirossá, amelyek önmagukban sem működnek, vagy mind, ha csak az együttesük a gond. Ahol pedig a kiválasztott élek éles belső sarokban találkoznak, mint egy felhő két korongja, ott a lekerekítésnek semmilyen méretnél nincs helye: ilyenkor a layerling előbb ezeket a sarkokat kerekíti le ugyanakkora vagy kisebb mérettel, és az üzenet megmondja, hányat és mennyivel (letörésnél letöri őket).

Mielőtt feladná, a layerling még egyszer megpróbálja a kiválasztott élek végén lévő rövid élekkel, amelyek legfeljebb kétszer olyan hosszúak, mint a méret. Ilyen él ott van, ahol egy korábbi élletörés egy még éles falon ér véget: egy rövid, ferde él a sarokban, és amíg éles marad, a sarok nem dolgozható meg. Ha ez segít, ezek az élek is kiválasztva maradnak, és egy üzenet megmondja, hányat vett fel.

A mutató alatti él is vastagabban rajzolódik, így látod, melyiket választja ki egy kattintás.

Egy furat is elfogadja a {{ui:editor.tool.chamfer}} és a {{ui:editor.tool.fillet}} műveletet, akárcsak a {{ui:editor.tool.hollow}}, a {{ui:editor.tool.offset}} és a {{ui:editor.tool.deleteFace}} eszközt: furat marad, és az új alakjával vág. Ha egy hasáb alakú furat négy függőleges élét lekerekíted, lekerekített belső sarkú zsebet vág, a {{ui:editor.tool.offset}} eszközzel megnövelt furat pedig ennyivel több hézaggal vág. Azt az élt, ahol a furat a darabhoz ér, inkább a kész csoporton munkáld meg: az az él hozzá tartozik.

### Élművelet visszavétele

Egy megmunkált test bármikor újra megmunkálható. Jelöld ki újra, és nyisd meg az eszközt – a Lekerekítés, az Élletörés és a Kiüregelés is mutatja a listát: az {{ui:edge.featureHistory}} alatt látod, mi van már rajta. A {{ui:edge.revertAction}} egyetlen műveletet vesz vissza. Figyelem: ha újabb műveletek vannak fölötte, azok is vele mennek, és az ablak megmondja, hány.

Egy élletörés, lekerekítés vagy kiüregelés mellett ott van a {{ui:edge.editAction}} is. Ugyanígy visszaveszi a műveletet, de azonnal újra megnyitja az eszközt ugyanazokkal az élekkel és a régi értékkel. Megváltoztatod az értéket, és újra alkalmazod: egy 3 mm-es lekerekítésből 5 mm-es lesz anélkül, hogy újra rá kellene kattintanod az élekre. Ha újabb műveletek vannak fölötte, itt is vele mennek. Ez a mostantól készülő élműveletekre érvényes; a régebbiek csak visszavételt kínálnak, ahogy egy csoport egyes részei is.

Egy csoportnál, mondjuk egy lyukas hengernél, a megmunkált él a kész testhez tartozik, nem valamelyik részéhez. A csoportból így egyetlen test lesz. A {{ui:editor.tool.ungroup}} mégis működik: előbb visszavonja az élmunkákat, majd feloldja a csoportot, egyetlen lépésben, amelyet a [[Ctrl]]+[[Z]] visszavon. Vedd vissza a műveletet a fent leírt módon, és a csoport minden részével együtt visszatér. A legegyszerűbb, ha az élműveleteket a végére hagyod. Ez a menetekre is érvényes: az élműveleti eszköz a menetet a pontos testeként veszi, így egy menetes furatos hasáb élei a helyén lévő menettel együtt kerekíthetők le. Egy menet éleinek kiszámítása tovább tart, mint egy egyszerű alakzaté, M6-nál néhány másodpercig, egy G1/2-es csőmenetnél nagyjából fél percig.

> **Jó tudni:** a layerling a lekerekítésekhez és élletörésekhez valódi CAD-geometriával dolgozik, nem csak háromszöghálóval. Ezért egy lekerekített él a STEP-exportban is lekerekített él marad.

Egy STEP-ként importált alkatrész is megtartja a CAD-geometriáját: az élletörés, a lekerekítés és a kiüregelés a fájlból származó testen működik, akármilyen finoman rajzolódik is az alkatrész a képernyőn. Az STL, az OBJ és a 3MF csak háromszögeket hoz, és egy finoman rajzolt alkatrész túl sűrű lehet az élműveleti eszközhöz. Ha egy alkatrész STEP-ként is elérhető, azt importáld.

## Testek kiüregelése

A dobozokban, poharakban, házakban és fedelekben közös, hogy belül üresek, egyenletes vastagságú falakkal. Pontosan ezt csinálja a {{ui:editor.tool.hollow}}.

1. Jelöld ki a testet, és kattints a {{ui:editor.tool.hollow}} gombra, vagy kattints jobb gombbal a testre, és válaszd ki a menüből.
2. Állítsd be a {{ui:shell.wall}} értékét.
3. A {{ui:shell.openings}} alatt kapcsold be azokat az oldalakat, amelyek nyitva maradnak: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} vagy {{ui:shell.side.right}}, ahányat csak akarsz – egyedül az {{ui:shell.side.front}} fióknak való nyílást ad, a {{ui:shell.side.left}} és a {{ui:shell.side.right}} alagutat. Ha egyik oldal sincs bekapcsolva, a test minden oldalon zárt marad, középen egy üreggel. A {{ui:shell.side.closed}} egy kattintással minden oldalt kikapcsol. A {{ui:shell.side.top}} az ablak megnyitásakor már be van kapcsolva; egy kattintás rá újra lezárja a tetejét. A minden oldalon zárt test kívülről változatlannak látszik: az üreget a metszetnézet mutatja.
4. Döntsd el, hogy a {{ui:shell.edges}} {{ui:shell.edges.round}} vagy {{ui:shell.edges.sharp}} legyenek.
5. Kattints a {{ui:shell.apply}} gombra.

![A kiüregelés ablak a falvastagsággal, minden nyitva maradó oldalhoz egy kapcsolóval és a belső élekkel.](shot:hollow-panel)

A falak befelé nőnek. A külső oldal változatlan marad.

A {{ui:shell.edges}} csak ott számítanak, ahol a belső falak eltávolodnak egymástól – a test egy lépcsőjénél vagy egy nyílás körül. Egy egyszerű doboz üregének sarkai mindkét beállításnál élesek. Lekerekített belsőhöz előbb kerekítsd le a test külső éleit (lásd fent), aztán üregeld ki: a belső a sugár mínusz a falvastagság értékével követi. Ha a lekerekített belső nem építhető fel – ez nagyon sok rövid egyenes darabból álló körvonalnál, például egy körvonallá alakított rajznál előfordulhat –, a layerling ugyanazt az üreges testet éles belső sarkokkal építi meg.

![Az eredmény: 3 mm falú héj, felül nyitva.](shot:hollow-result)

![Ugyanaz a doboz csak az elülső oldalán nyitva: egy fióknak való nyílás.](shot:hollow-sides)

Minden nyitott oldalhoz a testnek azon az oldalon, a legszélén egy sík lapra van szüksége. A gömbök és a szabad formájú alakzatok ezért így nem üregelhetők ki. Ha a fal túl vastag a testhez, a layerling jelzi, és vékonyabbat kér.

Egy zsebes test – egy olyan hasáb, amelyben egy nem teljesen átmenő lyuk van, és egy dobozt egy megemelt lyukkal csoportosítva készült – szintén kiüregelhető, felül nyitva: a zseb körüli falak is kiüregelődnek, így a külső fal és a zseb között egy felül nyitott üreggyűrű marad, a zseb alja alatt pedig egy vékony üreg fekszik.

**A csúcsban végződő testeknek,** mint egy kúpnak vagy egy körbeforgatott háromszögnek, nincs felül sík lapjuk, amely nyitva maradhatna. Egy teljesen zárt üreg sem működik ott, mert egy csúcs nem tolható el befelé: még 1 mm-es falnál is azt az üzenetet kapod, hogy a falak nem lehetnek ilyen vastagok. Ehelyett a forgatás előtt rajzold bele a falat a profilba: készíts másolatot a körvonalról, kicsinyítsd a másolatot egyenletesen, tedd a nagy körvonal közepére, vágd ki vele a nagyot, majd forgasd körbe az egészet (Vázlatok fejezet, Forgatás rész). A két körvonal közötti távolság a falvastagság.

Ha egy kiüregelt testet később átméretezel, a layerling azonnal újra kiüregeli az új méretben. A fal olyan vastag marad, amilyennek választottad, a kerek testeknél is. Egy hengerből, amelyet az egyik irányba jobban húzol, mint a másikba, ellipszis lesz.

> **Tipp:** 0,4 mm-es fúvókával 1,2–2 mm-es fal jó kiindulás: elég vékony, hogy anyagot spórolj, és elég vastag egy erős alkatrészhez.

## Fedél nyitott testhez

A(z) {{ui:editor.tool.lid}} fedelet készít egy felül nyitott testhez: egy nyitott tetővel kiüregelt dobozhoz, cseréphez, tálcához. Jelöld ki a testet, és kattints a(z) {{ui:editor.tool.lid}} gombra. Az ablakban kiválasztod a fajtát:

- {{ui:lid.type.plug}}: a testtel azonos méretű lap, alatta perem, amely a nyílásba illeszkedik.
- {{ui:lid.type.cap}}: a testnél egy falvastagsággal szélesebb lap, alatta perem, amely kívülről öleli körbe.
- {{ui:lid.type.both}}: a testnél egy falvastagsággal szélesebb lap, alatta mindkettő: perem a nyílásba és perem kívül körbe. A test fala a kettő közötti horonyban ül, mint egy ételtároló dobozon.
- {{ui:lid.type.flat}}: csak a lap, ráhelyezéshez vagy ragasztáshoz.

Ezután beállítod a(z) {{ui:lid.thickness}} és a(z) {{ui:lid.fit}} értékét (a fedél és a test közti {{ui:lid.gap}}: 0,1 mm szoros, 0,2 mm normál, 0,3 mm laza, vagy bármely érték 1 mm-ig), valamint hogy milyen mélyre nyúlik a perem, és milyen vastag a fala. Kattints a(z) {{ui:lid.apply}} gombra: a fedél a test mellett fekszik, megfordítva, lappal lefelé, így támasz nélkül nyomtatható. A test változatlan marad. A fedél bármilyen körvonalat követ, kereket vagy szögleteset, mert közvetlenül a test pereme alatt veszi le a formát. Felül nyílás nélküli test csak lapos fedelet kaphat; a többihez előbb üregeld ki nyitott tetővel. Ha a test pontos CAD-test, például egy Üregelés eszközzel kiüregelt lekerekített doboz, a fedél is az lesz, és kerek sarkai kerekek maradnak: éleit a többi testhez hasonlóan lekerekítheted vagy letörheted az él-eszközzel. A többi test, és a mágnesekhez oszlopokat kapó fedelek, háromszögekből álló fedelet kapnak.

> **Tipp:** Hogy milyen szorosan ül a fedél, az a nyomtatótól függ. Előbb nyomtass egy kis dobozt fedéllel; ha túl szoros, válaszd a következő, lazább illesztést.

Jelöld be a {{ui:lid.magnets}} lehetőséget, és a fedelet szoros illesztés helyett négy kerek mágnes tartja. Válassz {{ui:lid.magnetSize}} értéket (6 × 2, 8 × 3 vagy 10 × 3 mm), vagy állítsd be a {{ui:lid.magnetDiameter}} és a {{ui:lid.magnetHeight}} értékét, valamint a {{ui:lid.magnetGap}} értéket: 0,1 mm a mágnesek bepréseléséhez, 0,2-0,3 mm a beragasztásukhoz. A layerling a test peremének minden sarkába egy fészket vág, és vele szemben egyet a fedél lapjába, kicsit mélyebbet a mágnesnél, így az sosem áll ki. Ahol a fal túl vékony egy fészekhez, egy oszlop tölti ki a sarkot az aljától a peremig, és a fedél pereme megkerüli. A test a fészkeivel és oszlopaival együtt csoportba kerül: bontsd fel a csoportot, és visszakapod az eredeti állapotot. A lapnak legalább a mágnes magassága plusz 0,8 mm vastagnak kell lennie; a mágnesek bekapcsolása ezt be is állítja.

Jelöld be a {{ui:lid.hinge}} lehetőséget, és a fedél egy csap körül nyílik a test egyik egyenes oldala mentén: a hátsón, vagy azon, amelyet a {{ui:lid.hingeSide}} alatt választasz (ahogy a kezdő nézetben, ahol a hátoldal tőled elfelé néz). Mentén csuklók váltják egymást, a külsők a testen, a köztük lévők a fedélen, {{ui:lid.hingeGap}} távolságra, és mindegyiken átmegy a csap furata: 1,75 mm-es {{ui:lid.hingePin}} esetén egy darab filament a csap; jelöld be a {{ui:lid.hingePrintPin}} lehetőséget egy vastagabb, külön nyomtatott csaphoz. A {{ui:lid.hingePinPlay}} a csap helye a furatában oldalanként, kezdetben 0,2 mm; adj neki többet, ha a csap nehezen megy be. A test csuklói 45°-os lejtőn állnak, így a test támasz nélkül, állva nyomtatható; a fedél csuklói egy síkban vannak a tetejével, így az továbbra is megfordítva nyomtatható. A {{ui:lid.hingeKnuckles}} 0 értéke nagyjából 10 mm-enként ad egy csuklót. A zsanér benyomós vagy lapos fedélhez illik; a külső perem nyitáskor nekiütközne a hátsó falnak. Kerek oldalon, egy edényen vagy csövön, a zsanér ott fut, ahol a fal a zsanér vonalától egy csukló sugarán belül marad, és a test csuklói egy kis tömbön állnak, amely a falig ér. A {{ui:lid.hingeTeardrop}} (kezdetben bekapcsolva) a csap furatainak felül hegyet ad az egyes részek nyomtatási irányában, így nem lógnak be; a nyomtatott csap egy kis lapon fekszik.

> **Tipp:** Előbb préseld a mágneseket a testbe. Aztán tegyél mindegyikre még egy mágnest, ott, ahol a helyes oldalával tapad, és nyomd rájuk a fedelet (a fészkekbe egy csepp ragasztóval, ha lazák): így minden mágnes a párjával szemben kerül a fedélbe, és vonzzák egymást.

Jelöld be a(z) {{ui:lid.clickBumps}} lehetőséget, és a fedél bepattan: a nyílásba nyúló perem külső oldalán (a kívülről ölelő fedélnél a perem belső oldalán) kis kerek dudorok pattannak mélyedésekbe, amelyeket a Layerling ugyanott vág a test falába, egyet minden legalább 12 mm-es egyenes oldal közepére, kettőt a 80 mm-nél hosszabb oldalakra, négyet egy kerek nyílás köré, a zsanér oldalára pedig egyet sem. A(z) {{ui:lid.handle}} alatt a(z) {{ui:lid.handle.tab}} egy fület ad a lapnak, amely olyan vastag, mint a lap, és 6 mm-rel túlnyúlik az elülső élén (vagy a zsanérral szemközti élen), így a fedél továbbra is megfordítva nyomtatható, a(z) {{ui:lid.handle.notch}} pedig közvetlenül a fedél éle alatt mélyedést vág az ujjnak a test elülső falába, és mindig meghagy 0,8 mm-t a falból; egyik sem használható forgócsapos fedéllel, a dudorok lapos fedéllel sem.

## Kábelcsatorna egy testen át

A(z) {{ui:editor.tool.cableChannel}} kerek járatot vezet egy testen át egy kábelnek vagy LED-vezetéknek, onnan, ahol bemegy, odáig, ahol kijön, és maga keresi meg az utat. Jelöld ki a testet, kattints a(z) {{ui:editor.tool.cableChannel}} gombra, majd a testre ott, ahol a kábel bemegy ({{ui:cable.entry}}), és ott, ahol kijön ({{ui:cable.exit}}). Az út egyenesen, a felület mentén kezdődik és végződik, egyenesen halad, ahol lehet, és ív, ahol kell, sosem szűkebben, mint {{ui:cable.minBend}}, és amennyire lehet, távol marad a külső felülettől, sosem közelebb, mint {{ui:cable.minWall}}. Egy kábel nagyjából az átmérője ötszörösének megfelelő íven tolható át; a(z) {{ui:cable.diameter}} a csatorna sajátja.

Amíg a panel nyitva van, a test átlátszó, benne a csatornával és mindkét végén egy jellel. A panel megmutatja a csatorna hosszát, a legszűkebb ívet és a legvékonyabb falat, pirossal, ha egy ívnek vagy a falnak kisebbnek kellett lennie a kértnél; ilyenkor egy kisebb {{ui:cable.minBend}} érték vagy egy másik be- vagy kimenet segít. A(z) {{ui:cable.pickAgain}} áthelyez egy véget. A(z) {{ui:cable.apply}} bevágja a csatornát: {{ui:shape.bentTube}} lesz belőle lyukként, a testtel csoportosítva, így a test pontos marad, és a csoport bontása után a cső még módosítható. Egy hajlított csőnek legfeljebb tizenegy íve van; egy ennél többet igénylő út másik be- vagy kimenetet kér.

## Testek eltolása

A test minden lapja ugyanannyival tolható el kifelé vagy befelé. Erre van szüksége egy illesztésnek, fedélnek vagy pattintós kötésnek: 0,1-0,3 mm rés körben, miközben a részletek a helyükön maradnak, amit a méretezés nem ad.

1. Jelölj ki egy testet, és kattints az {{ui:editor.tool.offset}} gombra, vagy kattints a testre jobb gombbal, és ott válaszd.
2. Válaszd a {{ui:offset.grow}} vagy a {{ui:offset.shrink}} lehetőséget, és állítsd be a {{ui:offset.distance}} értékét.
3. A {{ui:offset.edges}} a külső sarkokat dönti el: a lekerekített kerekre hagyja az eltolt felületet, az éles tovább viszi a lapokat, míg találkoznak.
4. Pipáld be az {{ui:offset.copy}} jelölőt, hogy az alkatrész maradjon, a megnagyobbított test pedig másolatként jöjjön létre, amely már lyuk. Csoportosítsd ezt a lyukat a párjával, és pontosan a választott játékot vágja ki.
5. Kattints az {{ui:offset.apply}} gombra.

Pipáld be a(z) {{ui:offset.sideways}} lehetőséget, ha csak a körvonalnak kell nőnie vagy zsugorodnia: az oldalak a távolsággal elmozdulnak, minden sík felső és alsó lap a magasságán marad. Egy tábla körben szegélyt kap, egy talp szélesebb lesz, és a test nem lesz magasabb. Lépcsős testnél minden lépcső megtartja a saját magasságát. A körvonalain át eltolt szöveg ilyenkor szintén megtartja a magasságát.

Pipa nélkül maga a test tolódik el. Rögzített, pontos test lesz, mint egy letörés után: az ablak tetején lévő lista visszavonja az eltolást, az {{ui:edge.editAction}} pedig újra megnyitja az eszközt a régi távolsággal. Csak pontos CAD-testek tolhatók el - dobozok, hengerek és a többi forma, ezek csoportjai, importált STEP-alkatrészek. Az a test, amely csak háromszögháló, mint sok STL-import, gyakran nem. A testhez túl nagy távolságot, például a legvékonyabb falon túli kicsinyítést, elutasítja.

Egy szöveg, amelynek betűit a mag nem tudja testként eltolni - egyes betűtípusokban az A, B, M, N, W vagy 9 -, ehelyett a körvonalain keresztül tolódik el: ekkora távolsággal megkapja a(z) {{ui:prop.textWider}} kitöltést (keskenyebbet, ha zsugorodik), és ugyanennyivel nő felül és alul. Szöveg marad, amelyet tovább szerkeszthetsz. Ez tömör betűs, lekerekítés nélküli szövegnél működik; egy már kitöltési móddal rendelkező szöveget a program a korábbiakhoz hasonlóan elutasít.

## Lapok törlése

Egy útban lévő lekerekítés, egy rossz helyen lévő lyuk, egy már nem kellő csap: a {{ui:editor.tool.deleteFace}} újra leveszi a testről, anélkül hogy újra kellene építeni.

1. Jelöld ki a testet, és kattints a {{ui:editor.tool.deleteFace}} gombra, vagy kattints jobb gombbal a testre, és válaszd a menüből.
2. Kattints mindarra a lapra, aminek el kell tűnnie: egy lekerekített él lapjaira, egy lyuk falára, egy csap oldalára és tetejére. A kiválasztott lap kivilágosodik; egy újabb kattintás kiveszi. Az ablak számolja a lapokat.
3. Kattints a {{ui:deleteFace.apply}} gombra, vagy nyomd meg a [[Delete]] billentyűt. Az [[Esc]] bezárja az eszközt, változtatás nélkül.

A törölt lapok körüli lapok addig nőnek, amíg a rés be nem zárul. Egy lekerekített felső élű doboz visszakapja éles éleit, egy lyuk betöltődik, egy csap eltűnik. A test pontos marad, így újra lekerekíthető és letörhető, és a STEP-export megőrzi valódi lapjait. A [[Ctrl]]+[[Z]] egy lépésben visszavonja a törlést. Az {{ui:edge.featureHistory}} alatt is szerepel a lekerekítésekkel és letörésekkel együtt, ahol az {{ui:edge.revertAction}} visszavonja; {{ui:edge.editAction}} nincs hozzá. Csoporton az eredmény egyetlen test, mint egy élkezelésnél.

Mindannak a lapjait válaszd ki, aminek el kell tűnnie, és csak azokat. Ha a körülöttük lévő lapok nem tudják bezárni a rést, a layerling jelzi, és semmi sem változik: egy doboz fő oldalának például nincs olyan szomszédja, amely átvehetné a helyét. Ha egy zsebnek csak az alját törlöd, átmenő lyuk lesz belőle, mert a zseb falai a túloldalig futnak tovább.

A {{ui:editor.tool.makeExact}} eszközzel pontossá tett importált háló ott, ahol a fájl háromszögei hibásak voltak, hajszálvékony lapokat tarthat meg az egy síkban lévő lapok között, így az egyik oldal csíkokra bomlik, amelyek külön nem törölhetők. Az ilyen vékony lap, amely túl keskeny ahhoz, hogy rákattints, a kiválasztott lappal együtt törlődik, ha érinti azt, és továbbvezet egy másik lapra a kiválasztott lap síkjában, azokkal a hozzá kapcsolódó vékony lapokkal együtt, amelyek szintén érintenek egy lapot a kiválasztott lap síkjában; az ablak ezeket a vele együtt törölt lapok közé számolja.
