---
title: Alakzatok elhelyezése és beállítása
summary: Az alakzattár, méretek számmal és fogantyúval, szín, forgatás, kúposítás és csavarás.
---

A layerlingben minden alkatrész egy alakzattal kezdődik. Ezekből építesz fel minden mást: az alakzatok kiegészítik egymást, kivágják egymást, vagy egy új alakzattá egyesülnek.

## Alakzat hozzáadása

Kattints a szalagon az {{ui:editor.addShape}} gombra. Megnyílik az alakzattár.

![Az alakzattár. Minden kis kép az alakzat valódi geometriájából készül.](shot:shape-menu)

A könyvtár minden kiválasztott alakzat után bezárul. A címsorral áthelyezheted oda, ahol nem takarja el a célzott helyet, például a Tulajdonságok panel fölé; a címsor dupla kattintása visszateszi a gombja alá, és a böngésző megjegyzi, hol hagytad. A címsorban lévő tű nyitva tartja a könyvtárat, amíg több alakzatot teszel egymás után. A szélein és a sarkain húzva állíthatod a méretét, olyan szélesre és magasra, ahogy a képernyőd engedi; ezt is megjegyzi a böngésző, a szélére kattintva duplán pedig visszaáll. Ha keskenyre húzod, a könyvtár elhagyja a neveket, és csak a képeket mutatja; a név akkor jelenik meg, ha egy alakzatra mutatsz.

Válassz egy alakzatot. Most az egérmutatón lóg, és oda kerül, ahová kattintasz. Ha egy test fölé viszed, a mutató alatti lapra fekszik, a ferdékre is, mint a Cruise a Tinkercadben; az üres tárgyasztal fölött a munkasíkra kerül. Az [[Esc]] megszakítja az elhelyezést. Egy kattintásra váró eszköz, például a mérőszalag, a derékszögvonalzó, egy jegyzet, a {{ui:camera.placeWorkplane}}, a {{ui:editor.tool.layFlat}} vagy az élműveleti eszközök kikapcsolnak, amikor alakzatot választasz, így a kattintás az alakzatot helyezi el. Fordítva is igaz: ha bekapcsolod valamelyik ilyen eszközt, az alakzat újra lekerül. Ha inkább azt szeretnéd, hogy az alakzat a tárgyasztal közepén jelenjen meg, a kattintással történő elhelyezést kikapcsolhatod a beállításokban ({{ui:workspace.appearance}} rész, {{ui:workspace.cruise}} kapcsoló).

Egy lapon az alakzat a lap közepére ugrik, amint a mutató a közelébe ér, ahogy egy sarokra vagy élre is; tartsd lenyomva az [[Alt]] billentyűt, hogy bárhová letedd. Ha a könyvtárból húzod egy lapra, mindig a közepére kerül, [[Alt]] mellett oda, ahol elengeded.

Amit a tár kínál:

- **Alapalakzatok:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (három-huszonnégy oldallal), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (három-huszonnégy oldallal, így háromoldalú is), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} és {{ui:shape.torus}}.
- **Csövek:** {{ui:shape.tube}} és {{ui:shape.bentTube}}, ez utóbbi legfeljebb tizenkét egyenes darabból áll, köztük hajlításokkal, valamint az {{ui:shape.loft}}, amely egyik körvonalból a másikba vezet át, mondjuk négyzetből körbe.
- **Díszítő alakzatok:** {{ui:shape.star}}, {{ui:shape.heart}} és {{ui:shape.crescent}}.
- **Feliratok:** {{ui:shape.text}}, körív mentén is. Bővebben a [Szöveg](chapter:text) fejezetben.
- **Mechanika:** {{ui:shape.thread}} (menetes szár, csavar, anya és menetes furat), {{ui:shape.spring}}, {{ui:shape.gridfinity}}-rekeszek és -alapkeretek, {{ui:shape.gear}} és a fogantyúkhoz való {{ui:shape.knurl}}. Bővebben a [Menetek és mechanika](chapter:threads-and-mechanics) fejezetben.
- **Szerkezetekhez:** az egyben nyomtatható {{ui:shape.hinge}}, a {{ui:shape.dovetail}}, a vízszintes lyukakhoz való {{ui:shape.teardrop}}, a csavarfejekhez való {{ui:shape.counterbore}} és {{ui:shape.countersink}}, valamint a {{ui:shape.ruler}}, amely csak mérőeszköz, és sosem kerül bele egy exportba.

Háromszöget kétféleképpen kapsz: a háromoldalú {{ui:shape.polygon}} egyenlő szárú háromszög, a Tinkercad „Roof” (tető) alakzata, az {{ui:shape.wedge}} pedig derékszögű háromszög. Mindkettő valódi háromszög alapú hasáb. Háromszög alakú lyukhoz másold le az alakzatot, kisebbítsd a másolatot, jelöld lyuknak, és igazítsd a {{ui:editor.tool.centerOnWorkplane}} vagy az {{ui:editor.tool.align}} paranccsal. Mindkettő az alakzat befoglaló dobozával dolgozik, a legkisebb dobozzal, amely körülveszi, így egy félbevágott négyzet is egész négyzetnek számít. A parancskereső ([[Ctrl]]+[[K]]) mindkét alakzatot megtalálja a „háromszög” vagy a „tető” szóra is.

A {{ui:shape.slot}} egyik vége keskenyebb is lehet, mint a másik, mondjuk egy két szíjtárcsa közötti szíjat takaró burkolathoz. A {{ui:inspector.properties}} alatt állítsd be a {{ui:prop.slotSmallEnd}} értékét; a nagy vég olyan széles, mint a kapszula, és az oldalak egyenesen futnak egyik ívtől a másikig. A {{ui:prop.slotCentreDistance}} a két ív középpontja közötti távolság, vagyis hogy milyen messze vannak egymástól a szíjtárcsák. Ha a kis véget változtatod, a középponttávolság marad, a kapszula pedig hosszabb vagy rövidebb lesz. A kúpos kapszula is pontos test marad, lekerekítésekhez és STEP-hez.

## Az alakzat beállításai

Amint egy alakzat ki van jelölve, jobbra megjelennek a beállításai. Legfelül van a neve; a mellette lévő ceruzával ({{ui:outliner.rename}}) újat gépelhetsz. Az [[Enter]] megtartja, az [[Esc]] elveti, egy üres név pedig visszahozza az alakzat alapértelmezett nevét. Jobbrább a lakat zárolja az alakzatot a véletlen elmozdítás ellen, a szem pedig elrejti. A bal szélső nyíl a címsorukig összecsukja a beállításokat.

A beállítások a jobb szélhez rögzítve vannak. Ha eltakarnak valamit, amit látni szeretnél, húzd őket a címsoruknál fogva, és ott lebegnek, ahová ejted őket; a következő alakzatnál is ott maradnak. Ejtsd vissza őket a jobb felső sarokba, vagy kattints duplán a címsorra, és újra rögzülnek. Amíg lebegnek vagy össze vannak csukva, az illesztési lépés a beállítások aljáról a munkasík jobb alsó sarkába kerül.

![Egy henger beállításai: tömör vagy lyuk, átmérő és magasság számként és csúszkaként.](shot:editor-overview)

- **{{ui:inspector.solid}} vagy {{ui:inspector.hole}}:** A tömör test megmarad, a lyuk anyagot vesz el. A {{ui:inspector.solid}} gombra kattintva megnyílnak a színek; az ott kevert saját színeid utána a {{ui:inspector.recentColors}} alatt várnak, az utolsó nyolc. Bővebben a [Tömör testek és lyukak](chapter:solids-and-holes) fejezetben. A {{ui:inspector.keptColors}} sorban lévő kitűző a kiválasztott színt örökre megőrzi: külön sorban áll, az újabb színek soha nem szorítják ki, és ugyanazzal a kitűzővel el is engedhető; ebben a böngészőben legfeljebb 21 szín marad meg.
- **{{ui:inspector.transparent}}:** Átlátsz a testen, például hogy észrevegy egy mögötte lévő alakzatot.
- **{{ui:inspector.multicolor}}:** Csak csoportnál; a [[Shift]]+[[M]] kapcsolja. Bekapcsolva a csoport minden része a saját színében látszik, akkor is, ha a csoportot lyukakkal egyetlen testté vágták (a lyuk által hagyott falak annak a testnek a színét kapják, amelybe vágták őket). Ha a csoportnak színt választasz, kikapcsol, és az egész csoportot átszínezi. A kötegek mindig megtartják a részeik színét. Egy csak testekből álló, újonnan készített csoportnál kezdetben ki van kapcsolva, és egyetlen testként jelenik meg; a korábban készült csoportok továbbra is részeik színét mutatják. 3MF-exportban minden rész megtartja a színét, így a szeletelő a részeket filamentekhez rendelheti; az OBJ a pontjain viszi a színeket, ezért ott két szín határa kicsit durvább.
- **{{ui:inspector.properties}}:** A méretek és minden, ami ehhez az alakzathoz tartozik. Egy hengernél az átmérő, a magasság és az oldalak száma. Egy fogaskeréknél a fogak, egy rugónál a menetszám. Egy alapértékétől eltérített érték neve mellett kis nyíl jelenik meg: egy kattintás csak ezt az értéket veszi vissza, bármit csináltál is azóta, ellentétben a Visszavonással. Egy csúszkán a dupla kattintás ugyanezt teszi, itt és a munkaterület beállításainak csúszkáin is. Egérrel húzva egy hossz csúszkája az illesztési lépéshez illeszkedik, így a magasság egész milliméterekben jön ki (kikapcsolt rácsnál és rövid csúszkákon nem); a begépelt érték és a csúszkán használt nyílbillentyűk pontosak maradnak. Alul a {{ui:inspector.saveDefaults}} a jelenlegi értékeket teszi meg ennek az alakzatfajtának a kezdőértékeivé (ugyanaz, mint a beállításokban az {{ui:workspace.shapeDefaults}}), az {{ui:inspector.resetDefaults}} pedig visszatér a program sajátjaihoz.
- **{{ui:inspector.makeEllipse}}:** Csak hengernél. A henger mindig kerek: egy átmérője van, és minden fogantyú mindkét oldalát együtt változtatja. Oválishoz kattints erre, és {{ui:shape.ellipse}} lesz belőle – ugyanaz a test, amelynek a hosszát és a szélességét ezután külön-külön állíthatod. Egy élletöréssel, lekerekítéssel vagy fallal ellátott, illetve egy elforgatott vagy csoportosított henger így nem alakítható át; ezekhez eleve az {{ui:shape.ellipse}} alakzatot vedd.
- **{{ui:inspector.taper}}:** Eltérő méret felül és alul, például lejtőhöz vagy tölcsérhez.
- **{{ui:inspector.twist}}:** A tetejét elcsavarja az aljához képest, vagy oldalra tolja. Így lesznek csavart oszlopok és dőlt tornyok.
- **{{ui:inspector.slope}}:** A tetejét az egyik vég felé lejteti. Beállítások: {{ui:prop.slopeSide}} (melyik vég), {{ui:prop.slopeEnd}} vagy {{ui:prop.slopeAngle}} (milyen mélyre megy), {{ui:prop.slopeCurve}} (egyenes 0, felfelé domború 0 fölött, belógó 0 alatt). A másik vég megtartja a test magasságát; az alacsonyabb végen lévő narancssárga pont a magasságát húzza. Hosszában lejtő tetőhöz, rámpához vagy ferdén vágott csővéghez. Ezeknél a formáknál érhető el: {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}}, {{ui:shape.tube}}, gyűrű, {{ui:shape.wedge}}, {{ui:shape.roundRoof}}. A test pontos marad letöréshez, lekerekítéshez és STEP-exporthoz.
- **{{ui:inspector.narrow}}:** Felülről nézve a két hosszú oldalt egyenletesen az egyik vég felé szűkíti. Beállítások: {{ui:prop.narrowSide}} (melyik vég), {{ui:prop.narrowEnd}} (a vég szélessége, 0 csúcsot ad), {{ui:prop.narrowStart}} (hol kezdődik a szűkülés: 0 % a széles végnél, 50 % középen), {{ui:prop.slopeCurve}} (egyenes 0, kifelé domború, mint egy hajóorr, 0 fölött, behúzott 0 alatt). A keskeny végen lévő narancssárga pont a szélességét húzza. Ugyanazoknál a formáknál érhető el, kivéve a csövet és a gyűrűt. Pontos marad: {{ui:shape.box}}, {{ui:shape.wedge}}, {{ui:shape.roundRoof}}; a többi hálóként jelenik meg.

![Egy narancssárga hasábból, egy kék csapból és egy lyukból álló csoport, egyetlen testté vágva. Bekapcsolt Többszínűvel a csap kék marad, a hasáb narancssárga, a lyuk falai pedig a hasáb színét kapják.](shot:group-multicolor)

A kúposítás és a csavarás szinte minden alakzaton működik. Csak a fogaskerék, a menet, a rugó, a Gridfinity, a recézés, a zsanér, a gúla, a hajlított cső, a csepp alakú lyuk, a csavarfej-süllyesztők és a vonalzó maradnak ki: ezeknek saját, rögzített méreteik vannak, vagy – mint a gúlának – már saját tetejük.

![Egy kúp, amelynek a felső sugarát és a magasságát megváltoztatták: mindkettő mellett egy kis nyíl visszaveszi az értéket, az alul lévő két gomb pedig menti vagy visszaállítja az alakzat alapértékeit.](shot:property-reset)

{{ui:inspector.saveDefaults}} megjegyzi, amit ezen az alakzaton megváltoztattál, az ilyen fajta új alakzatok kiindulásaként: a méreteket, az alakzat beállításait és a színét. Színezz egy hengert zöldre, nyomd meg a gombot, és minden ezután hozzáadott henger zöld lesz; a többi fajta megtartja a saját színét. {{ui:inspector.resetDefaults}} visszaállítja a fajtát arra, amivel a program indítja. Hogy mely fajtáknak vannak saját alapértékeik, a beállításokban az {{ui:workspace.shapeDefaults}} alatt van megjelölve. A kezdőoldalról indított új terv is ezekkel indul; az értékeket ez a böngésző jegyzi meg.

Egy kúposított vagy döntött doboz, henger, ellipszis, sokszög, cső vagy gyűrű megtartja a pontos alakját, ahogy a kapszula, a csillag, a szív, a félhold, a fecskefark és a felül-alul lekerekítetlen élű lekerekített doboz is: az élletörés és a lekerekítés úgy működik rajta, mint az egyszerű alakzaton, és a STEP-export is kiírja. Ugyanez igaz a csavart alakzatra: a keresztmetszete pontosan fordul, ahogy emelkedik, az oldalai pedig egyenletesen csavarodnak alulról felfelé.

A begépelés pontosabb, mint a húzás. Minden számmező milliméterben vár értéket, de százalékot is elfogad: egy 40 mm-es szélességbe „50 %”-ot írva 20 mm-t kapsz. Számolnak is: a „15*3”, a „120-2*4” vagy a „(40+2)/2” 45-öt, 112-t és 21-et ad; a * helyett x is használható. A mező megjegyzi a számítást, a Tulajdonságok panelen és a kijelölt test körüli méretdobozokban is: ha később újra belekattintasz, a szám helyett a képlet áll benne, amíg az érték még egyezik vele, és helyben módosíthatod, a „(140+2)/2”-ből „(40+6)/2” lesz. Ha a testet egy fogantyúnál fogva húzod vagy átméretezed, a képlet már nem illik rá, így a mező újra csak a számot mutatja. Egy megkattintott számmezőben az egérgörgő és a [[↑]] és [[↓]] billentyűk egy lépéssel változtatják az értéket, a [[Shift]] nagyobb, az [[Alt]] finomabb lépéssel. Méret- vagy pozíciómezőben a [[Shift]] ehelyett a rácslépéssel lép, kikapcsolt rácsnál tíz lépéssel.

## Mennyire kerek a kerek? Az oldalszám

A kerek alakzatok, mint a henger, a kúp, a cső, az ellipszis vagy a furatok, a tulajdonságaik között az {{ui:prop.sidesFollowSize}} kapcsolót és az {{ui:prop.sides}} csúszkát kínálják. A {{ui:shape.torus}} alakzatnak két csúszkája van: {{ui:prop.torusSides}} a gyűrű körül és {{ui:prop.torusSteps}} a cső körül. Ott is a mérettel változnak, amíg nem rögzíted őket, így egy nagy tórusz sem lesz szögletes. Az ok: a nézethez és az STL-hez, 3MF-hez és OBJ-hez a layerling a kört sok kis oldalú sokszögként rajzolja. Minél több az oldal, annál simább, és annál több háromszög kell hozzá.

A {{ui:prop.torusTube}} adja meg, milyen vastag a cső felülről nézve. A magasság csak összenyomja vagy megnyújtja a csövet, így a lapos gyűrű megtartja a lyukát; a külső méret felénél a lyuk bezárul. A fogantyúk húzásakor a cső is vele méreteződik. Csak az a tórusz marad pontos test élletöréshez, lekerekítéshez és STEP-hez, amelynek csöve olyan vastag, amilyen magas a tórusz.

**Ahol az oldalszám számít**

- **A szeletelőnek szánt exportban** (STL, 3MF, OBJ). Egy kevés oldalú henger ott sokszögként érkezik.
- **Amikor testek és lyukak egyesülnek.** Egy kevés oldalú lyukkal vágott furat a kész alkatrészben szögletes. Ide tartoznak a csavarlyukak is.
- **A nézetben.** Sok nagyon finom alakzat lelassítja a szerkesztőt.

**Ahol nem számít**

- **A STEP-exportnál.** Az a kerek alakot írja ki, nem a sokszöget.
- **Élletörésnél és lekerekítésnél** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}), amíg az alakzat kerek marad. Ez akkor áll fenn, ha nem állítottál be oldalszámot, ha az oldalszám legalább az alakzat alapértéke, vagy ha a sokszög legfeljebb {{value:EXACT_ROUND_TOLERANCE}} mm-rel tér el a körtől. Az alapérték hengernél, ellipszisnél, csőnél és kúpnál {{value:ROUND_FROM_SIDES}} oldal, az {{ui:shape.roundRoof}} alakzatnál {{value:ROUND_FROM_ROOF_SIDES}}, a {{ui:shape.sphere}} alakzatnál {{value:ROUND_FROM_SPHERE_STEPS}} lépés, a {{ui:shape.halfSphere}} és a {{ui:shape.paraboloid}} alakzatnál {{value:ROUND_FROM_HALF_SPHERE_STEPS}}, a {{ui:shape.torus}} alakzatnál {{value:ROUND_FROM_TORUS_SIDES}} oldal és {{value:ROUND_FROM_TORUS_STEPS}} lépés, egy kerek {{ui:shape.bentTube}} alakzatnál pedig {{value:ROUND_FROM_BENT_TUBE_QUALITY}} a {{ui:prop.quality}}.
- **Menetnél, rugónál vagy ferde fogazású fogaskeréknél.** Az élműveleti eszköz és a STEP-export a pontos testét veszi; a {{ui:prop.quality}} csak azt adja meg, milyen finoman rajzolódik.

**Ahol mégis számít**

- **Élletörésnél és lekerekítésnél egy kevés oldalú alakzaton.** Ha az oldalszámot az alapérték alá állítod, az élműveleti eszköz az alakzatot úgy veszi, ahogy rajzolódik: egy 6 oldalú henger hatszögletű rúd marad, és a lekerekítés a hat éle körül fut. Így építhetsz például lekerekített sarkú anyafészket. Kerek alakzatnál hagyd bekapcsolva az {{ui:prop.sidesFollowSize}} kapcsolót.

**Hogyan használd**

- **Hagyd bekapcsolva az {{ui:prop.sidesFollowSize}} kapcsolót.** Ilyenkor a layerling az átmérőből úgy választja ki az oldalszámot, hogy a sokszög legfeljebb {{value:ROUND_DEVIATION_TOLERANCE}} mm-rel térjen el a valódi körtől, ami jóval kevesebb annál, amit egy nyomtató fel tud bontani. A kis alakzatok legalább {{value:MIN_AUTOMATIC_SIDES}} oldalt kapnak, a nagyok többet.
- **Kevesebb oldalt** akkor válassz, ha szándékosan sokszöget szeretnél (de arra ott a {{ui:shape.polygon}}), vagy ha a szerkesztő nagyon sok kerek alakzattal lelassul.
- **Több oldalra** szinte sosem lesz szükséged. Csak nagyon nagy kerek alkatrészeknél, ha éleket látsz az STL-ben.
- **Azoknál az alkatrészeknél, amelyeket csak élműveletekkel kezelsz, vagy STEP-ként adsz tovább,** az oldalszám nem számít.

## Munka a fogantyúkkal

A beállítások mellett magán az alakzaton is vannak fogantyúk:

- A **sarkok és élek** nagyobbá vagy kisebbé teszik az alakzatot. Ha egyet a szemközti oldalon túlra húzol, az alakzat ott, annak az élnek a túloldalán tovább nő. A felső nyíl ugyanezt teszi az alap alatt. Egy sarok húzása közben tartsd nyomva a [[Shift]] billentyűt, hogy a szélesség, a mélység és a magasság együtt változzon, és megmaradjanak az arányok; az [[Alt]] nyomva tartásával a középpontból méretez a szemközti sarok helyett. Billentyűzet nélkül, vagy ha nem akarsz billentyűt nyomva tartani, kapcsold be a tulajdonságok tetején az {{ui:inspector.keepProportions}} kapcsolót: ilyenkor a sarkok mindig megtartják az arányokat, és ha a szélesség, a mélység vagy a magasság közül egyet begépelsz, a másik kettő ugyanazzal a szorzóval változik. A beállítás megmarad.
- Az alakzat **feletti fekete nyíl** emeli vagy süllyeszti; ha az [[Alt]] gombot az elejétől tartod, ott keletkezik másolat, ahol elengeded, így lehet egymásra rakni. A **felső lapon** lévő fehér fogantyú a magasságot változtatja.
- Az **íves nyilak** forgatják.
- Az alakzat melletti **számok** a méreteket mutatják. Ha egyre rákattintasz, megnyílik egy mező, amelybe begépeled a kívánt számot. Az [[Enter]] billentyűvel az alakzat a számmal szemközti éltől nő, mint húzáskor; az [[Alt]]+[[Enter]] billentyűvel a közepe körül nő, így egy másik alakzathoz igazított alakzat igazítva marad. Ez a szélességre és a hosszra vonatkozik; a magasság mindig az aljától felfelé nő. A jobb oldali tulajdonságmezők billentyű nélkül is megtartják a közepet. A [[Tab]] megtartja a számot, és megnyitja a következő mezőt (szélesség, mélység, magasság); a [[Shift]]+[[Tab]] visszalép. Egy rákattintott tulajdonságmezőben az egérgörgő is változtatja az értéket: görgetésenként egy egységet, a [[Shift]] tízszeresét, a [[Ctrl]] tizedét, az [[Alt]] századát. Egy mező, amelyre nem kattintottál, a görgőt a panelnek hagyja, amely görget.
- Egy **kattintás egy sarokra** (húzás nélkül) a szélességet és a mélységet együtt nyitja meg. Gépeld be az elsőt, nyomj [[Tab]] billentyűt a másodikhoz, és [[Enter]] billentyűt, hogy mindkettőt alkalmazd. Az [[Esc]] elveti.

Ha egy alakzatot derékszögben elforgattál, például a {{ui:editor.tool.layFlat}} paranccsal az oldalára fektetted, a tulajdonságmezők arról az irányról kapják a nevüket, amerre az adott méret most fut: a {{ui:prop.height}} az, ami felfelé megy, a {{ui:prop.width}} X mentén, a {{ui:prop.length}} pedig Y mentén fut. Egy fekvő alakzat magasságát begépelve tehát a függőleges méretet változtatod, és az alja a tárgyasztalon marad. Egy bármilyen más szögben döntött alakzat a mezőkben a saját méreteit mutatja, és egy megjegyzés alatta ezt jelzi is.

Egér nélkül a billentyűzetet használd: a nyílbillentyűk egy illesztési lépéssel mozgatják a kijelölést (kikapcsolt rácsnál 0,01 mm-rel), [[Shift]] billentyűvel öttel, vagy tízzel, ha a beállításokban a {{ui:workspace.appearance}} alatt a {{ui:workspace.gridMajorEvery}} értékét {{ui:workspace.gridMajorSteps|10}} értékre állítod: a következő sötétebb vonalig, mint a Tinkercadben. A nézetet követik: a [[→]] a képernyő jobb oldala felé mozgat, a [[↑]] tőled el, a tárgyasztal elforgatása után is. Ha egy alakzatot kitolsz a képből, a nézet vele megy. A [[Ctrl]]+[[↑]] és a [[Ctrl]]+[[↓]] emeli és süllyeszti. Egymás utáni nyílbillentyű-lenyomások sora egyetlen lépés az előzményekben: amíg a következő lenyomás másfél másodpercen belül jön, a Visszavonás az egész sort veszi vissza, nem lenyomásonként. Az [[R]] 45°-kal forgat, a [[Shift]]+[[R]] 22,5°-kal. A [[D]] a munkasíkra ejti a kijelölést.

A fogantyúkkal akkorára húzhatsz egy alakzatot, mint a tárgyasztalod, de legalább 220 mm szélesre és mélyre. A tulajdonságoknál begépelt szám ezen túl is mehet, és egy ekkorára növelt alakzat nem zsugorodik vissza, ha újra megfogod. Saját felső határt alakzatonként a beállításokban az {{ui:workspace.shapeDefaults}} alatt, az {{ui:workspace.customLimit}} mezőben adhatsz meg.

Az illesztési lépés a szerkesztő jobb alsó sarkában van, és bármikor módosítható.

## Másolás és másolatkészítés

A {{ui:editor.tool.copy}}, a {{ui:editor.tool.paste}} és a {{ui:editor.tool.duplicate}} a szalagon van ({{ui:editor.group.clipboard}}). A [[Ctrl]]+[[D]] másolatot készít a kijelölésről. A layerling megjegyzi, hogyan mozgattad vagy forgattad legutóbb a másolatot, és a következő másolatnál ugyanezt alkalmazza újra. Így néhány billentyűleütéssel lyuksort vagy lépcsőt kapsz. Szabályos elrendezésekhez ott van még az ismétlés is, amelyről a [Kijelölés és elrendezés](chapter:select-and-arrange) fejezet szól.

> **Tipp:** Ha egy alakzat nem hajlandó felvenni a kívánt méretet, gyakran az új alakzatok határai az okai. A beállításokban az {{ui:workspace.shapeDefaults}} alatt döntöd el, hogyan induljon az egyes alakzat, és mekkora lehet.

## Saját alakzatok

Egy újra és újra szükséges tartó, fogantyú vagy alaplap a {{ui:myShapes.title}} közé kerül. Ezek az alakzattár tetején vannak, az {{ui:myShapes.basicShapes}} fölött, és a nyilukkal összecsukhatók.

1. Jelölj ki egy vagy több testet, akár lyukakat, csoportokat vagy importált modellt is.
2. Nyisd meg az alakzattárat, és kattints a {{ui:myShapes.saveSelection}} gombra. Adj meg egy nevet, és erősítsd meg a {{ui:common.save}} gombbal.
3. Bármelyik tervben egy kattintás a csempére beilleszti az alakzatot, mint bármelyik másikat. A csempét a munkasíkra is húzhatod; ilyenkor oda kerül, ahol elengeded. Az alakzat ezután a mutatóra lóg, mint bármelyik másik: követi azt, más testek lapjain is, egy kattintás leteszi, az [[Esc]] félreteszi.

Több test együtt tér vissza, úgy elhelyezve, ahogy egymáshoz képest álltak, és egyenként is kijelölhetők maradnak. Egy csempén a ceruza átnevezi, a kuka rákérdezés után eltávolítja. A tervekbe már beillesztett alakzatok változatlanok maradnak.

A {{ui:myShapes.title}} ebben a böngészőben élnek, a tervektől külön, és a következő indításkor is megvannak. A kezdőlapon a {{ui:dashboard.backupAll}} a tervekkel együtt menti őket, a mentés megnyitása pedig mindkettőt visszahozza. Ha csak az alakzatokat vinnéd át egy másik böngészőbe, a {{ui:myShapes.backup}} (a lefelé mutató nyíl) ZIP-fájlba menti őket, az {{ui:myShapes.load}} (a felfelé mutató nyíl) pedig ott visszahozza őket. Az {{ui:myShapes.load}} egyes `.lyl` terveket is elfogad; mindegyikből egy alakzat lesz. A már meglévő alakzatok nem kerülnek be kétszer.

### Mappák

Sok saját alakzatot könnyebb mappákba rendezni. Az {{ui:myShapes.newFolder}} (a pluszos mappa a {{ui:myShapes.saveSelection}} mellett) nevet kér, és mappát hoz létre legfelül; egy mappa pluszos mappa gombja, az {{ui:myShapes.newSubfolder}}, abban hoz létre egyet. A mappák három szint mélyek lehetnek: a harmadik szinten lévő mappa alakzatokat tárol, de további mappákat nem. A mappák azok fölött az alakzatok fölött állnak, amelyek egyik mappában sincsenek, név szerint rendezve, és a nyilukkal nyithatók és csukhatók; a mappa melletti szám a benne és az alatta lévő mappákban lévő alakzatokat számolja. Mentéskor a név melletti listában választod ki a mappát; a {{ui:myShapes.noFolder}} lehetőséggel az alakzat legfelül marad.

A csempén lévő nyilas mappa másik mappába helyezi át az alakzatot, vagy a {{ui:myShapes.noFolder}} lehetőséggel ki a mappából. A mappa ceruzája átnevezi, a kuka rákérdezés után törli a benne lévő mappákkal és alakzatokkal együtt. Magát a mappát nem lehet áthelyezni: hozd létre az újat ott, ahová tartozik, és helyezd át bele az alakzatokat. A biztonsági mentés megtartja a mappákat, betöltéskor pedig az alakzatok ugyanoda kerülnek vissza. A szerveren a mappák a `Custom shapes` mappán belüli mappák.

### Saját alakzatok a szerveren

Bekapcsolt [közös szerveres tárolónál](chapter:files-and-saving) a rész két csoportot mutat: {{ui:myShapes.onServer}} és {{ui:myShapes.inBrowser}}. Mentéskor kiválasztod, hová kerüljön az alakzat; kezdetben a szerver van kiválasztva. Ott a `Custom shapes` mappában él, saját `.lyl` fájlként, képpel, minden olyan eszközön elérhetően, amely eléri a szervert. Egy böngészős csempén a felhő a szerverre teszi az alakzatot; ezután már nem tárolódik kétszer.

A `Custom shapes` mappa a kezdőlapon is megjelenik. Nyiss meg ott egy alakzatot, mint egy tervet, módosítsd, és automatikusan mentődik, mint bármelyik terv a szerveren; a következő beillesztés már az új változatot veszi. Mivel a szerveres tárolóhoz nincs bejelentkezés, mindenki ugyanazokat az alakzatokat látja, aki eléri a szervert.

## Hengerre tekerés

Egy mintának, logónak vagy feliratnak egy bögrére, dobozra vagy csőre kellene kerülnie? Először fektesd laposan a tárgyasztalra, például importált SVG-ként vagy szövegként, úgy, ahogy felülről kell kinéznie. Aztán az alakzat beállításaiban a {{ui:inspector.wrapCylinder}} alatt tekerd rá egy hengerre:

1. Nyisd meg a {{ui:inspector.wrapCylinder}} részt, és add meg a hengerfal {{ui:inspector.wrapDiameter}} értékét, például a bögréd külső átmérőjét. Tizedmilliméterek is megadhatók, például 63,5.
2. Kattints a {{ui:inspector.wrapApply}} gombra. Ami balról jobbra futott, az most a henger körül fut, a hátsó él lesz a teteje, a vastagság pedig kiáll a falból.
3. Jelöld ki a rátekert alakzatot és a hengert, és igazítsd mindkettőt középre, balról jobbra és elölről hátra. A rátekert alakzat közepe a henger tengelye, így ezután pontosan a falán ül.

Gravíráshoz kapcsold be a {{ui:inspector.wrapInward}} kapcsolót: ilyenkor a vastagság a falba megy. Tedd lyukká az alakzatot, igazítsd középre, és csoportosítsd a hengerrel.

Egy már rátekert alakzat a rátekert dolog hálója, és nem tekerhető rá újra: vond vissza a tekerést, vagy tekerd újra a lapos eredetit egy másik átmérővel.

Az eredmény háló, mint egy importált modell. A Visszavonás újra laposra fekteti az alakzatot; másik átmérőhöz előbb vond vissza, majd tekerd újra. Egy körnél többször nem tekerhető a henger köré; ilyenkor a layerling megadja a legkisebb átmérőt, amelyre ráfér.
