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

A panel a jobb felső sarokban van. Ha eltakarja azokat az éleket, amelyekre kattintanál, húzd el a címsoránál fogva; legközelebb is ott nyílik meg, ahogy a {{ui:editor.tool.hollow}} és az {{ui:editor.tool.array}} is. Kattints duplán a címsorra, hogy visszakerüljön.

Ha nyitott panel mellett alakzatot választasz az alakzatlistából, a panel semmit sem alkalmazva bezárul, és a kiválasztott élek elvesznek. A kattintás ekkor az új alakzatot helyezi el, nem éleket választ.

A panelen ezeket találod:

- A {{ui:edge.allSharpEdges}} egyszerre minden élt kijelöl, a {{ui:edge.clear}} kiüríti a kijelölést.
- **{{ui:edge.radius}}** a lekerekítéshez. Az élletöréshez a {{ui:edge.distance}} vagy a {{ui:edge.angle}} értéket állítod be.
- A {{ui:edge.variableRadius}} (csak lekerekítésnél) egy él mentén változtatja a sugarat: az egyik végén kicsi, a másikon nagyobb, közte egyenletes, például ahol egy függőleges fal egy ferdével találkozik. Kattints egyetlen élre, majd állítsd be a {{ui:edge.radiusStart}} és a {{ui:edge.radiusEnd}} értékét. Hogy melyik vég az eleje, az él keletkezéséből adódik; ha a nagyobb sugár a rossz végre kerül, a {{ui:edge.swapEnds}} megfordítja. Egyszerre egy élen működik, több élt egymás után kerekíts le. A {{ui:edge.editAction}} mindkét értéket visszahozza.
- Az {{ui:edge.sharpThreshold}} dönti el, mely élek számítanak egyáltalán élesnek. 25°-os értéknél csak a határozott töréseket veszi élnek, a lapos átmeneteket békén hagyja.
- A {{ui:edge.topEdges}} csak a test legtetején futó éleket választja ki. Ez a gyors út egy sütikiszúróhoz: építsd meg a körvonalat egy vázlatban vonalként, majd törd le a felső éleket. A {{ui:edge.angle}} adja meg, milyen meredek a letörés; nem érhet tovább, mint amilyen vastag a fal.
- Az {{ui:edge.bottomEdges}} csak a test legalján futó éleket választja ki, a {{ui:edge.topEdges}} párja. Így gyorsan lekerekítheted vagy letörheted csak egy alkatrész talpát.
- Az {{ui:edge.chamfillet}}, amelyet a letörés ablakának tetején a {{ui:editor.tool.chamfer}} mellett választasz, a munkadarab nyomtatható talpát készíti el: a lemeznél egy letörés, amely érintőlegesen megy át a fal felé vezető lekerekítésbe, így az első rétegekhez nem kell támasz, az él mégis puhán végződik. A {{ui:edge.distance}} a talp által elfoglalt magasság, az {{ui:edge.angle}} (15°–75°) a letörés meredeksége a lemeznél. Az éleket az {{ui:edge.bottomEdges}} gombbal választod ki.
- A {{ui:edge.onlyVisibleEdges}} elrejti azokat az éleket, amelyek onnan nézve, ahonnan nézel, a test mögött vannak. Alapból minden él átlátszik a testen, ami egy zsúfolt alkatrésznél zavaró lesz; bekapcsolt kapcsolóval csak a feléd néző éleket látod, és csak azokra kattinthatsz. A többi eléréséhez forgasd el a nézetet. Egy pirossal rajzolt él (lásd lent) mindig látszik.
- {{ui:edge.tangentChains}}: egy kattintás ilyenkor azokat az éleket is kiválasztja, amelyek simán egymásba folynak, például egy lekerekített sarkú lap körüli összes élt. A kapcsoló csak azt dönti el, mit választ ki egy kattintás: a CAD-mag az élletörést vagy a lekerekítést mindig továbbviszi az ilyen simán folytatódó éleken. A panel megmondja, hány további élen történik ez meg.
- Az {{ui:edge.keepSize}} megtartja az élletörés vagy a lekerekítés méretét akkor is, ha később átméretezed a testet.
- Az {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} vagy {{ui:edge.fine}}) dönti el, milyen finoman számolódik az előnézet. Nehéz alkatrészeknél a {{ui:edge.draft}} gyorsabb.

Amíg a méretet állítod, a layerling újraszámolja az előnézetet. Ez eltarthat egy pillanatig. Nyugodtan állíts tovább; az utoljára választott érték számolódik ki.

Ha a méret túl nagy az élhez, a layerling ezt jelzi, és kisebb értéket javasol. Gyakran egy-két milliméterrel kevesebb is elég. Éles szögeknél egy lekerekítésnek több hely kell, mint amennyit a sugara sejtet. Kis képernyőn a panel magától legörget, hogy az üzenet látható legyen.

Ha egy addig működő kijelölés egy újabb élre kattintva hibára fut, az az él pirosra vált, és vastagabban rajzolódik: ez az, amelyet ekkora méretben nem lehet a többivel együtt megmunkálni. Kattints rá újra, hogy kivedd, vagy csökkentsd a méretet. Ha az üzenet fennállása alatt további élekre kattintasz, az első piros marad. Ha nincs korábbi működő kijelölés – a legelső kattintásnál, vagy egy épp megemelt méretnél –, azok az élek válnak pirossá, amelyek önmagukban sem működnek, vagy mind, ha csak az együttesük a gond.

A mutató alatti él is vastagabban rajzolódik, így látod, melyiket választja ki egy kattintás.

### Élművelet visszavétele

Egy megmunkált test bármikor újra megmunkálható. Jelöld ki újra, és nyisd meg az eszközt – a Lekerekítés, az Élletörés és a Kiüregelés is mutatja a listát: az {{ui:edge.featureHistory}} alatt látod, mi van már rajta. A {{ui:edge.revertAction}} egyetlen műveletet vesz vissza. Figyelem: ha újabb műveletek vannak fölötte, azok is vele mennek, és a panel megmondja, hány.

Egy élletörés, lekerekítés vagy kiüregelés mellett ott van a {{ui:edge.editAction}} is. Ugyanígy visszaveszi a műveletet, de azonnal újra megnyitja az eszközt ugyanazokkal az élekkel és a régi értékkel. Megváltoztatod az értéket, és újra alkalmazod: egy 3 mm-es lekerekítésből 5 mm-es lesz anélkül, hogy újra rá kellene kattintanod az élekre. Ha újabb műveletek vannak fölötte, itt is vele mennek. Ez a mostantól készülő élműveletekre érvényes; a régebbiek csak visszavételt kínálnak, ahogy egy csoport egyes részei is.

Egy csoportnál, mondjuk egy lyukas hengernél, a megmunkált él a kész testhez tartozik, nem valamelyik részéhez. A csoportból így egyetlen test lesz. A {{ui:editor.tool.ungroup}} mégis működik: előbb visszavonja az élmunkákat, majd feloldja a csoportot, egyetlen lépésben, amelyet a [[Ctrl]]+[[Z]] visszavon. Vedd vissza a műveletet a fent leírt módon, és a csoport minden részével együtt visszatér. A legegyszerűbb, ha az élműveleteket a végére hagyod. Ez a menetekre is érvényes: az élműveleti eszköz a menetet a pontos testeként veszi, így egy menetes furatos hasáb élei a helyén lévő menettel együtt kerekíthetők le. Egy menet éleinek kiszámítása tovább tart, mint egy egyszerű alakzaté, M6-nál néhány másodpercig, egy G1/2-es csőmenetnél nagyjából fél percig.

> **Jó tudni:** a layerling a lekerekítésekhez és élletörésekhez valódi CAD-geometriával dolgozik, nem csak háromszöghálóval. Ezért egy lekerekített él a STEP-exportban is lekerekített él marad.

Egy STEP-ként importált alkatrész is megtartja a CAD-geometriáját: az élletörés, a lekerekítés és a kiüregelés a fájlból származó testen működik, akármilyen finoman rajzolódik is az alkatrész a képernyőn. Az STL, az OBJ és a 3MF csak háromszögeket hoz, és egy finoman rajzolt alkatrész túl sűrű lehet az élműveleti eszközhöz. Ha egy alkatrész STEP-ként is elérhető, azt importáld.

## Testek kiüregelése

A dobozokban, poharakban, házakban és fedelekben közös, hogy belül üresek, egyenletes vastagságú falakkal. Pontosan ezt csinálja a {{ui:editor.tool.hollow}}.

1. Jelöld ki a testet, és kattints a {{ui:editor.tool.hollow}} gombra, vagy kattints jobb gombbal a testre, és válaszd ki a menüből.
2. Állítsd be a {{ui:shell.wall}} értékét.
3. A {{ui:shell.openings}} alatt kapcsold be azokat az oldalakat, amelyek nyitva maradnak: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} vagy {{ui:shell.side.right}}, ahányat csak akarsz – egyedül az {{ui:shell.side.front}} fióknak való nyílást ad, a {{ui:shell.side.left}} és a {{ui:shell.side.right}} alagutat. Ha egyik oldal sincs bekapcsolva, a test minden oldalon zárt marad, középen egy üreggel. A {{ui:shell.side.closed}} egy kattintással minden oldalt kikapcsol. A {{ui:shell.side.top}} a panel megnyitásakor már be van kapcsolva; egy kattintás rá újra lezárja a tetejét. A minden oldalon zárt test kívülről változatlannak látszik: az üreget a metszetnézet mutatja.
4. Döntsd el, hogy a {{ui:shell.edges}} {{ui:shell.edges.round}} vagy {{ui:shell.edges.sharp}} legyenek.
5. Kattints a {{ui:shell.apply}} gombra.

![A kiüregelés panel a falvastagsággal, minden nyitva maradó oldalhoz egy kapcsolóval és a belső élekkel.](shot:hollow-panel)

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
- {{ui:lid.type.flat}}: csak a lap, ráhelyezéshez vagy ragasztáshoz.

Ezután beállítod a vastagságot ({{ui:lid.thickness}}), az illesztést ({{ui:lid.fit}}, a fedél és a test közti hézagot oldalanként: 0,1 mm szoros, 0,2 mm normál, 0,3 mm laza, vagy bármely érték 1 mm-ig), valamint hogy milyen mélyre nyúlik a perem, és milyen vastag a fala. Kattints a(z) {{ui:lid.apply}} gombra: a fedél a test mellett fekszik, megfordítva, lappal lefelé, így támasz nélkül nyomtatható. A test változatlan marad. A fedél bármilyen körvonalat követ, kereket vagy szögleteset, mert közvetlenül a test pereme alatt veszi le a formát. Felül nyílás nélküli test csak lapos fedelet kaphat; a másik kettőhöz előbb üregeld ki nyitott tetővel.

> **Tipp:** Hogy milyen szorosan ül a fedél, az a nyomtatótól függ. Előbb nyomtass egy kis dobozt fedéllel; ha túl szoros, válaszd a következő, lazább illesztést.

## Testek eltolása

A test minden lapja ugyanannyival tolható el kifelé vagy befelé. Erre van szüksége egy illesztésnek, fedélnek vagy pattintós kötésnek: 0,1-0,3 mm rés körben, miközben a részletek a helyükön maradnak, amit a méretezés nem ad.

1. Jelölj ki egy testet, és kattints az {{ui:editor.tool.offset}} gombra, vagy kattints a testre jobb gombbal, és ott válaszd.
2. Válaszd a {{ui:offset.grow}} vagy a {{ui:offset.shrink}} lehetőséget, és állítsd be a {{ui:offset.distance}} értékét.
3. A {{ui:offset.edges}} a külső sarkokat dönti el: a lekerekített kerekre hagyja az eltolt felületet, az éles tovább viszi a lapokat, míg találkoznak.
4. Pipáld be az {{ui:offset.copy}} jelölőt, hogy az alkatrész maradjon, a megnagyobbított test pedig másolatként jöjjön létre, amely már lyuk. Csoportosítsd ezt a lyukat a párjával, és pontosan a választott játékot vágja ki.
5. Kattints az {{ui:offset.apply}} gombra.

Pipa nélkül maga a test tolódik el. Rögzített, pontos test lesz, mint egy letörés után: a panel tetején lévő lista visszavonja az eltolást, az {{ui:edge.editAction}} pedig újra megnyitja az eszközt a régi távolsággal. Csak pontos CAD-testek tolhatók el - dobozok, hengerek és a többi forma, ezek csoportjai, importált STEP-alkatrészek. Az a test, amely csak háromszögháló, mint sok STL-import, gyakran nem. A testhez túl nagy távolságot, például a legvékonyabb falon túli kicsinyítést, elutasítja.
