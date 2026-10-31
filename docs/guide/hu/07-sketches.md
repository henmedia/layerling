---
title: "Vázlatok: a körvonaltól a testig"
summary: Rajzolj egy lapos körvonalat, kerekítsd le vagy törd le a sarkait, és húzd ki vagy forgasd körbe testté.
---

Nem minden rakható össze alapalakzatokból. A saját kontúrral rendelkező alkatrészeknél, például egy konzolnál, egy fogprofilnál vagy egy vázánál előbb megrajzolod a **körvonalat**, aztán testet készítesz belőle. Erre való a vázlatmód.

## Vázlat indítása

Felül válts a {{ui:editor.modeGeometry}} nézetről a {{ui:editor.modeSketch}} nézetre. A szalag {{ui:sketch.group.create}} csoportjában két gomb áll egymás mellett aszerint, hogy mi legyen a körvonalból:

- **{{ui:sketch.extrude}}:** A körvonal felfelé húzódik ki, mint egy sütikiszúró.
- **{{ui:sketch.revolve}}:** A körvonal egy tengely körül fordul körbe, mint az esztergán. Így lesznek vázák, poharak, kúpok és minden, ami kerek.

A szerkesztő ezután egy rácsos lapot mutat. Ez a rajzfelületed.

## Rajzolás

A szalag vázlatmódban területekre oszlik:

- **Rajzolás:** a {{ui:sketch.line}} egyenes szakaszokat rajzol: kattints egymás után pontokra; nyomva tartott [[Shift]] billentyűvel az új vonal 15°-os lépésekben illeszkedik, a vízszintest és a függőlegest is beleértve. Az új vonal hossza és szöge a mutatónál látszik. Azt is begépelheted, milyen hosszú legyen, lásd [Vonalak számokkal](#vonalak-szamokkal). A {{ui:sketch.bezier}} a fogantyúival alakítható: kattints egy pontra, és húzd abba az irányba, amerre a vonalnak folytatódnia kell, mint az Illustrator vagy az Inkscape tolleszközével. Minél messzebbre húzod, annál jobban hajlik; az új pontig tartó szakasz húzás közben vele hajlik, így látod, mit kapsz. Pont elhelyezése közbeni húzás meghajlítja a görbét; ha a Tinkercadből jössz, és csak pontokra kattintanál, használd a {{ui:sketch.smooth}} eszközt. A {{ui:sketch.smooth}} folyamatos útvonalat fektet a kattintott pontokon át. A körvonal lezárásához a végén kattints újra az első pontra.
- **Alakzatok:** a {{ui:sketch.addShape}} kész körvonalakat kínál: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (lyukakkal ellátott tárcsa), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, egy {{ui:sketch.polygon}} és egy {{ui:sketch.star}}. Kattints egyre, hogy a vázlat origójába kerüljön, vagy húzd a menüből oda, ahová szeretnéd. A menü alján az {{ui:sketch.polygonSides}} a sokszög oldalainak és a csillag ágainak számát adja meg, a {{ui:sketch.starInner}} pedig azt, hogy a csillag völgyei milyen mélyen nyúljanak be a közepe felé (a külső sugár 10–90 százaléka); mindkettő a következőként hozzáadott alakzatra vonatkozik. Mint minden vázlatalakzat, utána közönséges sarokpontok, így egyenként mozgathatod, kerekítheted vagy törheted le őket. A vonalsort a körvonal lezárása nélkül egy mozdulatlan jobb kattintással vagy az utolsó pont dupla kattintásával fejezheted be. A téglalap a beállítások {{ui:workspace.shapeDefaults}} részében a dobozhoz megadott szélességgel és mélységgel indul, a kör és az ellipszis az ottani henger szélességével; saját érték nélkül, és a többi alakzatnál, 20 mm-esek.
- **Átfedés:** Ha két zárt körvonalat egymásra tolsz, két test marad, amelyek a 3D szerkesztőben egyesülnek; az átfedés nem lyuk. Lyuk csak olyan körvonalból lesz, amely teljesen egy másikon belül fekszik. A mozgatás nem köti össze a vonalakat ott, ahol keresztezik egymást, így az alakzatokat újra széthúzhatod. Ha viszont egy vonalat másokon keresztül rajzolsz, a layerling minden kereszteződésbe pontot tesz.
- **Kijelölés:** a {{ui:sketch.select}} pontokat és vonalakat mozgat. Egy zárt körvonalon belül kattintva az egész körvonalat kijelölöd, így azonnal húzhatod vagy átméretezheted; egy lyukon belül a lyukat választja ki. A kijelölés körüli keretnek nyolc fogantyúja van: a sarkok a szélességet és a magasságot együtt változtatják, nyomva tartott [[Shift]] billentyűvel megtartva az arányokat. Az oldalsók csak egy irányt változtatnak. A {{ui:sketch.lockOutline}} (vagy a [[Ctrl]]+[[L]]) zárolja a kijelölt körvonalat, mint egy zárolt testet a 3D szerkesztőben: nem mozgatható és nem módosítható többé, a vonalai halványabbak, a pontjai szürkék, a keret fogantyúi pedig szürkék lesznek és nem reagálnak. Amíg ki van jelölve, a sarkában lévő lakatra kattintva feloldod. A keret sarkainál lévő ívelt nyilak a közepe körül forgatják az egész kijelölést: a mutató fölötti szám a szöget mutatja, és nyomva tartott [[Shift]] billentyűvel 15°-os lépésekben mozog. Forgatás közben megjelenik egy gyűrű: ha a mutató benne van, a forgatás 22,5°-os lépésekben illeszkedik, kívüle egész fokokban halad, a rácstól függetlenül. Az [[R]] minden lenyomásra 45°-kal forgat el egy egész zárt körvonalat. A szélesség vagy a magasság címkéjére kattintva új méretet gépelhetsz, összegként („60+12,5”) vagy százalékban („150%”) is. A vázlat feletti sáv X és Y mezője mutatja, hol van a kijelölés közepe, mm-ben a vázlat origójától; írj be egy értéket, és pontosan oda kerül, például egy furat 12 mm-re a középtől. Az Y felfelé nő, mint a 3D szerkesztőben. Nyomva tartott [[Shift]] billentyűvel egy pontra vagy vonalra kattintva hozzáadod a kijelöléshez, vagy kiveszed belőle, így többet is kiválaszthatsz, és együtt mozgathatod őket. Üres terület fölött keretet húzva mindent kijelölsz, ami benne van. Egy vonal is húzható (a két végénél fogva mozog, vagy az egész kijelöléssel együtt, ha annak része). A nyílbillentyűk egy rácslépéssel mozgatják a kijelölést, [[Shift]] billentyűvel együtt nagyobbal, húzás közben nyomva tartott [[Shift]] billentyűvel pedig a mozgás egy tengelyen marad. {{ui:sketch.refine}}: egy szakaszra kattintva pontot ad hozzá, egy pontra kattintva eltávolítja. Itt van még a {{ui:sketch.erase}} (egy pontra vagy vonalra kattintva eltávolítja, a több fölé húzott ablak mindent eltávolít benne, kijelölés esetén pedig a gomb törli a kijelölést) és egy mintakép beszúrása ({{ui:sketch.addImage}}).
- **Vágólap:** a {{ui:editor.tool.copy}}, a {{ui:editor.tool.paste}}, a {{ui:editor.tool.duplicate}} és a {{ui:editor.tool.delete}} a kijelölt pontokon, vonalakon és képeken működik, mint a 3D szerkesztőben; a [[Ctrl]]+[[X]] kivág. A beillesztett és a másolatként készült geometria 10 mm-es hézaggal az eredeti mellé kerül, egy szabad helyre, ahol nem ér hozzá meglévő vonalhoz, így sosem kapcsolódik ahhoz, ami már ott van. Kijelölve marad, így azonnal a helyére húzhatod.
- **Előzmények:** {{ui:sketch.undo}} és {{ui:sketch.redo}}.
- **{{ui:sketch.viewControls}}:** a {{ui:editor.tool.note}} (vagy az [[N]]) jegyzetet tesz a vázlatra, mint a 3D-szerkesztőben: a következő kattintás elhelyezi, bárhová, akár egy vonalra is. A tűt húzva elmozdíthatod; egy kattintás a tűre összecsukja a kártyát. A vázlat jegyzetei a vázlat testéhez tartoznak: a 3D nézetben a {{ui:sketch.extrude}} vagy {{ui:sketch.sweep}} művelettel készült test tetején és a {{ui:sketch.revolve}} művelettel készült test megrajzolt profilján ülnek, és vele együtt mozognak. A vázlat újbóli megnyitása a test összes jegyzetét mutatja, a 3D-ben elhelyezetteket is. A {{ui:sketch.undo}} egy jegyzetet ugyanúgy visszavon, mint egy vonalat, a {{ui:sketch.cancel}} pedig elveti a jegyzetek változásait. Bővebben a Mérés és jegyzetek fejezetben.
- **Nézet:** A középső egérgombbal vagy a [[Shift]] vagy a [[Ctrl]] és a jobb egérgomb együttes használatával mozgatod, mint a 3D szerkesztőben. Ha semmi sincs kijelölve, a [[Ctrl]] és a nyilak is eltolják: lenyomásonként a kép tizedével, a [[Shift]] billentyűvel együtt a felével; a vázlat arra mozdul, amerre mutatnak. A [[Home]] az egész vázlatot beilleszti a nézetbe, az [[F]] a kijelölésre nagyít (kijelölés nélkül az egész vázlatot illeszti be), a [[+]] és a [[−]] pedig nagyít és kicsinyít, mint a 3D szerkesztőben. Ha semmi sincs kijelölve, egy üres helyre duplán kattintva a nézet úgy csúszik el, hogy az a hely középre kerüljön, mint a 3D szerkesztőben; a beállításokban a {{ui:workspace.doubleClickCentersView}} kapcsolja ki. Az oldalsávon lévő {{ui:camera.tapeTools}} két pont közötti távolságot mér. A vázlat azonnal méreteket is mutat, amint valamire rákattintasz: egy vonal hosszát, egy pontnál pedig az ott találkozó vonalak hosszát. Az oldalsávon lévő {{ui:sketch.showMeasurements}} gomb elrejti és megmutatja ezeket a méreteket, ha útban vannak, például görbék alakítása közben; a mérőszalag tovább működik. Egy egyenes vonalon a méretcímkére kattintva milliméterben begépelheted a hosszt; az [[Enter]] alkalmazza, az [[Esc]] elveti. A vonal megtartja az irányát, a kezdőpontja a helyén marad, a másik végén lévő vonalak pedig követik. Ha egy végpont van kijelölve, az mozdul el. Az [[Alt]]+[[Enter]] a közepe körül mindkét irányba megnöveli a vonalat. Görbéken a címke csak a hosszt mutatja.

Test csak **zárt** körvonalból lesz.

![Egy L alakú körvonal. A kijelölt sarokpontnál, bal felül, a két vonal hossza milliméterben, a köztük lévő szög pedig fokban látszik.](shot:sketch-outline)

## Vonalak számokkal

Ha a {{ui:sketch.line}} vagy a {{ui:sketch.smooth}} eszközzel letetted az első pontot, egyszerűen gépelj be egy számot: a vonal mellett két mező nyílik meg, a {{ui:sketch.typedLength}} milliméterben és a {{ui:sketch.typedAngle}} fokban. A [[<]] vagy a [[Tab]] a szögre lép, így az „50<30” egy 50 mm hosszú, 30°-os vonalat ad, mint az AutoCAD-ben. Az [[Enter]] leteszi a pontot, és azonnal begépelheted a következő vonalat; az [[Esc]] bezárja a mezőket anélkül, hogy a vonalláncot befejezné.

A szöget jobbról, az óramutató járásával ellentétesen számolja: 0° jobbra, 90° felfelé, 180° balra, 270° lefelé. Ha üresen hagyod, a vonal a mutatót követi, így csak a hosszt adod meg, az irányt pedig egérrel mutatod. Az olyan összegek, mint a „40+12,5”, mindkét mezőben működnek. Ha a pont a tárgyasztalon kívülre esne, a mező ezt jelzi, és másik értékre vár.

## Egyenes oldal görbítése

Jelölj ki egy egyenes vonalat, és kattints a megjelenő sávon a {{ui:sketch.curveLine}} gombra: az oldal görbévé hajlik, mint a Tinkercadben, és megmutatja a két fogantyúját. Húzd őket a görbe alakításához; minél kijjebb áll egy fogantyú, annál erősebb a hajlás. A mutató alatt a fogantyú narancssárga lesz, és a közvetlenül mellé eső kattintást is elkapja, így az alatta lévő mintakép nem mozdul el véletlenül. Az {{ui:sketch.straightenLine}} újra egyenessé teszi az oldalt. Egy kijelölt pontot a {{ui:sketch.smooth}} gombbal tehetsz kereknek: saját fogantyúkat kap, a mellette lévő vonalak pedig görbék lesznek. Ha három vagy több pont van kijelölve, a sávon a {{ui:sketch.curveThroughPoints}} egyetlen sima görbét fektet az elsőtől az utolsóig, minden közbülső ponton át, ahogy a {{ui:sketch.smooth}} eszköz rajzolja; a két végen túli vonalak változatlanok maradnak. Más programokban ennek „Fit curve” vagy „Fit point spline” a neve. A különbség: a {{ui:sketch.curveLine}} minden kijelölt oldalt külön hajlít, és megtartja a köztük lévő sarkokat, így egy oldalon lévő ívhez való; a {{ui:sketch.curveThroughPoints}} egyetlen görbét vezet át a pontokon sarkok nélkül, így egy átrajzolt, recés szél simításához való.

![Az L alakú körvonal alsó oldala görbévé hajlítva, a két végén a fogantyúival.](shot:sketch-curve)

## Szögek leolvasása és begépelése

Kattints egy olyan sarokpontra, ahol **két egyenes vonal** találkozik: a hosszak mellett a layerling fokban mutatja a köztük lévő **szöget** is, egy kis ívvel. Zárt körvonalon ez az alakzaton belüli szög, így egy behorpadás 180° fölötti értéket mutat. Kattints az értékre, és gépelj be új szöget. A két vonal közül az egyik ilyenkor a sarok körül fordul, és megtartja a hosszát, a másik a helyén marad. A forduló vonal szaggatottan rajzolódik; a [[Tab]] a másikra vált, az [[Enter]] alkalmazza, az [[Esc]] elveti. Ami a forduló vonal túlsó végén lóg, az vele megy.

Egy pont mozgatása három szöget változtat meg: magánál a pontnál és a vonalai túlsó végén lévő két szomszédos saroknál. Ezért a layerling ezt a kettőt is mutatja, és mindkettő kattintható és begépelhető. Így állíthatod be például a bal alsó sarkot 75,5°-ra, miközben a bal felső pont, amely ehhez elmozdul, ki van jelölve. Itt is számolhatsz, pl. „90-14,5”.

Egy sarok nem mutat szöget, ha egy görbe találkozik vele, vagy ha kettőnél több vonal találkozik ott. Az oldalsávon lévő {{ui:sketch.showMeasurements}} gomb a hosszakkal együtt a szöget is elrejti.

## Sarkok lekerekítése vagy letörése

Kattints egy sarokpontra, és válaszd a {{ui:sketch.filletCorner}} vagy a {{ui:sketch.chamferCorner}} lehetőséget. Egy kis mező jelenik meg a {{ui:sketch.filletRadius}} vagy a {{ui:sketch.chamferDistance}} számára. Add meg a méretet, és erősítsd meg a pipával. Ez két egyenes vonal közötti sarkoknál működik.

Egyszerre több sarok is megy: jelöld ki őket [[Shift]] billentyűvel és egy-egy kattintással, vagy húzz köréjük keretet, és válaszd a megjelenő sávon a {{ui:sketch.filletCorner}} vagy a {{ui:sketch.chamferCorner}} lehetőséget. Mindegyik ugyanazt a sugarat vagy távolságot kapja. Ahol két kijelölt saroknak közös oldala van, mindegyik legfeljebb 45%-ot vehet el belőle, így egy körben lekerekített téglalap minden sarkán egyforma lesz. Azok a pontok, amelyek nem két egyenes vonal közötti sarkok, kimaradnak, és az üzenet megmondja, hány. Egy egész alakzat köré húzott keret vagy egy kattintás a belsejébe a sarkait és a vonalait együtt jelöli ki, és a sáv ilyenkor a saroklehetőségek mellett az összes kijelölt vonalhoz kínálja a {{ui:sketch.curveLine}} és az {{ui:sketch.straightenLine}} parancsot.

![A bal felső sarok 12 mm-es sugárral lekerekítve.](shot:sketch-fillet)

## Tükrözés

Jelölj ki pontokat és vonalakat (kattintással, [[Shift]]+kattintással vagy keret húzásával), és kattints a sávban a {{ui:sketch.mirror}} gombra. Ezután válassz tengelyt: a {{ui:sketch.mirrorLeftRight}} a lap közepén átmenő függőleges tengelyre tükröz, a {{ui:sketch.mirrorTopBottom}} a vízszintesre, a {{ui:sketch.mirrorAcrossLine}} pedig a vázlat egy egyenes vonalára, amelyre utána kattintasz. A másolat a másik oldalra kerül, az eredeti marad; semmi sincs összekötve, így mindkettőt külön módosíthatod. A tengelyen lévő pontok közösek, ezért a félkörvonal, amelynek végei a tengelyen vannak, zárt körvonallá válik: rajzold meg egy konzol felét, jelöld ki, tükrözd, és készítsd el a testet. Jó tengely a segédvonal. Az [[Esc]] megszakítja.

## Segédvonalak

A segédvonal segít a pontok elhelyezésében anélkül, hogy a test része lenne. Szaggatottan rajzolódik, és sosem számít körvonalnak: akármilyen messzire túlhúzhatod az alakzaton, a test nem nő.

- Kapcsold be a {{ui:sketch.group.draw}} csoportban a {{ui:sketch.construction}} gombot. Az új vonalak, a méret szerint begépeltek is, ezután segédvonalak lesznek. A gomb visszavált a normál vonalakra.
- Egy már megrajzolt vonal akkor lesz segédvonal, ha rákattintasz, és a {{ui:sketch.makeConstruction}} lehetőséget választod. A {{ui:sketch.makeSolid}} újra normál vonallá teszi.
- Az új pontok oda illeszkednek, ahol egy segédvonal keresztez egy másik vonalat – ezt egy kék gyűrű jelzi –, valamint a segédvonal végeihez. Így tehetsz egy sarkot egy felezőpontra, egy éltől adott távolságra vagy egy kereszteződésre, számolás nélkül.
- A segédvonal nem vágja szét a körvonalat ott, ahol keresztezi. Forgatásnál a tengelytől jobbra is lehet.

## Test készítése belőle

Kattints a {{ui:sketch.finishSketch}} gombra. A körvonal testként áll a munkasíkon. A beállításaiban úgy változtatod a magasságát, a színét és minden mást, mint bármely más alakzatnál. Ha átméretezed, a layerling egy pillanattal később újra felépíti a vázlatból, és a vázlat vele nő. Így pontos test marad, amely élletörést és lekerekítést is fogad, és amikor legközelebb szerkeszted, a vázlat olyan méretű, mint a test.

Ha a munkasík egy test oldalán fekszik, úgy rajzolsz, ahogy arra az oldalra nézel: ami a vázlatban fent van, az a kész testen is fent lesz. A test halvány körvonala a vázlatnézetben mutatja, hol áll. Ha a munkasík átvág egy testen, a vázlatnézet helyette ennek a vágásnak a körvonalát mutatja, így egy üreges test gyűrűként jelenik meg, és a vázlatot a falaihoz igazíthatod. Egy pont, amelyet ezeknek a körvonalaknak egy sarka közelébe teszel vagy húzol, pontosan ráilleszkedik; egy kis kék gyűrű jelzi. Így vehetsz át más testek éleit a vázlatba, akkor is, ha a munkasík nem pontosan rajtuk fekszik. Ha meglévő munka mentén rajzolnál, kapcsold be az {{ui:sketch.showPartEdges}} gombot (a rétegek gomb a bal oldali nézetgombok között): ilyenkor a testek összes éle vékonyan és halványan a vázlatsíkra rajzolódik, mintha átnéznél rajtuk, akármilyen magasan fekszenek. Egy függőlegesen álló, például egy elülső lapra helyezett sík így az elölnézetet mutatja. A választás a böngészőben megmarad.

![A körvonalból test lett. A sarok le van kerekítve.](shot:sketch-result)

A {{ui:inspector.editSketch}} gombbal bármikor visszatérhetsz a vázlathoz, hogy módosítsd. A testre dupla kattintás ugyanezt teszi, mint a Tinkercadben (egy zárolt test zárva marad); a beállításokban a {{ui:workspace.doubleClickOpensSketch}} ezt kikapcsolja. A testen már elvégzett élműveletek viszont elvesznek, mert az élek újonnan jönnek létre. Egy test, amelyet a 3D-szerkesztőben elforgattál vagy elmozdítottál, ott nyílik meg, ahol a lapon áll, úgy elforgatva, ahogy ott látod, és a lap rácsán; csak a megdöntött vagy tükrözött test nyílik meg a saját helyzetében.

A több körvonalas vázlatból egy test lesz, és az egymást átfedő körvonalak összeolvadnak benne. Ha minden körvonalat külön szeretnél, jelöld ki a testet, és kattints a(z) {{ui:inspector.separateParts}} gombra: minden külső körvonal önálló test lesz a benne fekvő lyukakkal, és megtartja a test magasságát, színét és helyét. Minden résznek saját szerkeszthető vázlata van a segédvonalakkal együtt, így a részeket egyenként emelheted vagy süllyesztheted, majd egyesítheted vagy kivonhatod. Az élkezelések ezt megakadályozzák, ahogy az utólag nyújtott test is: azt hálóként bontja szét.

**Másfajta test ugyanabból a vázlatból:** a vázlat tetején lévő címke mutatja, mi lesz belőle: {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} vagy {{ui:sketch.modeBadgeSweep}}. Kattints rá és válassz másikat, akkor is, ha egy meglévő testet szerkesztesz: egy importált SVG, amely kihúzva érkezik, vázává vagy gombbá válik, ha {{ui:sketch.modeBadgeRevolve}} lesz belőle. A tengelyen átnyúló körvonal balra csúszik, amíg a jobb széle a tengelyre nem kerül; a [[Ctrl]]+[[Z]] visszavonja az eltolást. Befejezéskor az új test a régi helyére kerül, annak nevével és színével, a talpa ugyanazon a magasságon. Az élkezelések elvesznek, mint a vázlat minden módosításánál.

### Forgatás

Forgatásnál a keresztmetszet felét **a vázlatban látható tengelytől balra** rajzolod. Mellette a forgatás 3D előnézetét látod. Azonnal mutatja, hogyan fog kinézni a test. A körvonalnak zártnak kell lennie, vagy egy nyitott vonalat vonalként építesz meg, lásd lent. A végén kattints a {{ui:sketch.finishRevolve}} gombra. A terv többi teste elölnézetben látszik, ugyanabban a nézetben, mint a profil, a tengellyel középen: rajzold a profilt melléjük vagy föléjük. A test ott áll, ahová rajzoltad, és a vázlat közepén átmenő vízszintes vonal a talaj: a fölötte rajzolt profil magasabban álló testet ad, a legalsó pontja pedig a test talpa.

A forgatott test pontos test, mint a kihúzott: fogadja az élletörést és a lekerekítést, és kiüregelheted, egy pohárhoz vagy vázához. Egy régebbi layerlinggel forgatott test háló; nyisd meg a {{ui:inspector.editSketch}} gombbal, és fejezd be újra, hogy pontos legyen. Egy tengelyen átnyúló profil nem építhető fel pontosan, és háló lesz belőle, mint korábban.

**Egyetlen folytonos szál: {{ui:prop.pitch}}.** A forgatás a körvonalból zárt gyűrűket készít. Jelöld ki a forgatott testet, és a Tulajdonságok panelen adj neki 0-nál nagyobb {{ui:prop.pitch}} értéket, vagyis hogy fordulatonként mennyit emelkedik, és a körvonal csavarvonalba tekeredik: egyetlen folytonos szál, mint a filament az orsón vagy egy rugó. A {{ui:prop.sweep}} helyén ekkor {{ui:prop.turns}} áll, legfeljebb 200; a negatív szám balos tekercselést ad. A körvonal magasságánál sűrűbb menetek egyetlen testté olvadnak össze, így egy tömör mag finom menetemelkedéssel is működik. A csavarvonal hálóként épül, így lekerekítés, élletörés és kiüregelés nem működik rajta; sok menetnél tartsd alacsonyan a {{ui:prop.sides}} értékét. A 0 menetemelkedés ismét gyűrűket ad.

## Végighúzás egy pályán

A {{ui:sketch.sweep}} egy körvonalat húz végig egy pályán: egy sarkon befordulő kábelcsatornát, egy védőcsövet, egy szíjvédőt, egy gyűrűt egy hatszög körül. A {{ui:sketch.group.create}} csoportban a {{ui:sketch.extrude}} és a {{ui:sketch.revolve}} mellett található.

Ugyanarra a lapra két dolgot rajzolsz:

- **A keresztmetszetet** zárt körvonalként, a szokásos módon. Úgy rajzold, ahogy a pálya mentén a kezdetétől nézve látnád: a pályán keresztül a vázlat bal és jobb oldala, a fent a kész testen is fent van. Egy üreges keresztmetszet, egy csatorna vagy cső, egy körvonal egy másikkal a belsejében. Alapból a keresztmetszet a pályára van középre igazítva. A fenti módjelvény melletti menüben inkább a bal vagy a jobb szélét teheted a pályára ({{ui:sketch.sweepAnchorLeft}}, {{ui:sketch.sweepAnchorRight}}, a pálya mentén nézve), így egy sín a vonal egyik oldalán ülhet, vagy egy alkatrész szélét követheti. A test a keresztmetszet legalsó pontjával áll a vázlatsíkon.

- **A pályát** {{ui:sketch.construction}} segítségével: kapcsold be, és rajzolj vonalakat vagy görbéket, egyetlen láncot, nyitottat vagy zártat (a zárt lánc gyűrűt ad). A pálya laposan fekszik a vázlatsíkban.

A keresztmetszetet a pályának annál a végénél rajzold, ahol kezdődnie kell; a pálya a hozzá legközelebbi végén kezdődik. Ezután kattints a {{ui:sketch.finishSweep}} gombra. Az egyenes darabokból álló sarok gérbe vágódik, egy görbe sima marad, és a keresztmetszet végig függőleges marad. A test pontos, mint egy kihúzott test: a lekerekítés, a letörés és a STEP-export működik rajta. Ha hiányzik egy zárt körvonal vagy egy pálya, vagy több különálló pálya van, a layerling jelzi. Az {{ui:inspector.editSketch}} gombbal visszatérhetsz a vázlathoz, és módosíthatod a keresztmetszetet vagy a pályát.

## Vonalként építés

Általában a zárt körvonal belseje lesz a test. A {{ui:sketch.group.finish}} rész {{ui:sketch.stroke}} gombjával ehelyett magát a vonalat építed meg, általad megadott vastagsággal. Pipáld be a panelen a {{ui:sketch.strokeOn}} lehetőséget; a vázlat azonnal mutatja, mi lesz belőle.

- Egy **zárt körvonalból** keret lesz. A {{ui:sketch.strokeAlign}} adja meg, hol fekszik a fal: {{ui:sketch.strokeAlign.center}} a megrajzolt vonalon, {{ui:sketch.strokeAlign.inside}} azon belül, vagy {{ui:sketch.strokeAlign.outside}} azon kívül. A kívül tűréshez hasznos: rajzold meg egy lyuk, például egy fecskefark körvonalát, és adj neki 0,2 mm-es külső vonalat, hogy meglegyen a nyomtatáshoz szükséges hézag.
- Egy **nyitott vonalból** csík lesz, a vonalra középre igazítva. A {{ui:sketch.strokeCap}} adja meg, hogyan néznek ki a végei: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (fél vastagsággal hosszabb) vagy {{ui:sketch.strokeCap.round}}.
- A {{ui:sketch.strokeJoin}} mindkettőre vonatkozik: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} vagy {{ui:sketch.strokeJoin.bevel}}.

A vázlat megtartja a megrajzolt vonalat. Nyisd meg újra, és tovább módosíthatod a vonalat és a vastagságot; vedd ki a pipát, és újra a felület épül meg. A görbék ehhez rövid egyenes darabokra bomlanak.

Forgatásnál a vonal vékony fal: rajzold meg egy váza vagy egy pohár falát **egyetlen nyitott vonalként** a tengelytől balra, kapcsold be a {{ui:sketch.stroke}} gombot, és állítsd be a vastagságot, a forgatás pedig ezt a sávot forgatja körbe. Ami a tengelyen átnyúlik, azt ott levágja.

## Kitöltés és sziluett

A vonalat a vázlat megnyitása nélkül is beállíthatod: egy vázlattest tulajdonságai között a {{ui:prop.sketchFill}} alatt válaszd a {{ui:prop.sketchFill.area}}, a {{ui:prop.sketchFill.outside}}, a {{ui:prop.sketchFill.inside}} vagy a {{ui:prop.sketchFill.center}} lehetőséget, a {{ui:prop.sketchLineWidth}} és a {{ui:sketch.strokeJoin}} értékkel együtt. A test azonnal újraépül, ott, ahol áll. Ezek a Tinkercad SVG-importjának kitöltési módjainak felelnek meg: alapértelmezett, külső vonal és belső vonal. A {{ui:prop.sketchFill.grow}} kitöltve hagyja a felületet, és körben a vonalvastagsággal megnöveli, éles, kerek vagy letört sarkokkal: alapréteg egy logó alá többszínű nyomtatáshoz, amelyet a külső vonal egymagában csak gyűrűként adna.

A {{ui:prop.sketchSilhouette}} kihagy minden olyan körvonalat, amely egy másikon belül fekszik: a lyukakat és mindent, ami bennük van. Csak a külső körvonal marad. A {{ui:prop.sketchFill.outside}} beállítással együtt sütikiszúrót ad: importálj egy SVG-t kétszer, egyszer a sziluettel felületként az alaphoz, egyszer pedig a sziluettel és 1–2 mm-es külső vonallal a falhoz. A kapcsoló vázlatmódban a {{ui:sketch.stroke}} panelen is megtalálható.

Az éleken lévő lekerekítések és élletörések elvesznek, amikor a test újraépül, mint a vázlat szerkesztésekor.

## Ferde falak, bélyegzőkhöz

Egy kihúzott vázlatnak függőleges falai vannak. Egy bélyegzőnek, dombornyomó szerszámnak vagy lyukasztónak viszont ferdék kellenek, kívül és belül, végig ugyanazzal a falvastagsággal. A layerlingben nincs kihúzási szög, de egyszerű körvonalaknál a {{ui:inspector.taper}} segítségével célba érsz. Egy működő módszer:

1. Rajzold meg a körvonalat a szükséges lyukkal, és készíts belőle testet. Készíts másolatot a testről ([[Ctrl]]+[[D]]).
2. Az első testen kapcsold be a {{ui:prop.sketchSilhouette}} kapcsolót, hogy a lyuk kitöltődjön, és a {{ui:inspector.taper}} segítségével adj neki szélesebb aljat, mint a teteje.
3. A másolaton nyisd meg újra a vázlatát, és töröld a külső körvonalat, hogy csak a lyuk körvonala maradjon. Fejezd be a vázlatot, állítsd a testet {{ui:inspector.hole}} típusúra, és a {{ui:inspector.taper}} segítségével adj neki keskenyebb aljat, mint a teteje.
4. Mozgasd a lyukat az első testbe, oda, ahol a lyuk volt, és csoportosítsd a kettőt.

A falak most kívül és belül is lejtenek. A kúposítás az egész körvonalat méretezi, így ez egyszerű alakzatoknál pontos, ahol a méreteket úgy választhatod meg, hogy a falak párhuzamosan fussanak, finom részleteknél, például feliratoknál viszont csak közelítés.

## Kép mint minta

A {{ui:sketch.addImage}} segítségével egy fényképet vagy rajzot teszel a vázlat alá, és körberajzolod. Beállíthatod a méretét, az átlátszatlanságát és a helyzetét. Ha a kép a helyén van, zárold a [[Ctrl]]+[[L]] billentyűkkel, hogy rajzolás közben véletlenül se mozdítsd el. A zárolt kép nincs útban: a kattintások átmennek rajta, így a rajta lévő vonalakat és pontokat kiválaszthatod, és keretet húzhatsz föléjük. A sarkában lévő lakatra kattintva feloldod; az [[Alt]] nyomva tartásával kattintva feloldás nélkül jelölöd ki. Ha a jobb szélen lévő beállításai eltakarják a képet, húzd el őket a címsoruknál fogva; egy dupla kattintás rajta újra rögzíti őket.

Az {{ui:sketch.imageAlign}} alatt egy nem egyenesen készült fényképet igazítasz be:

- **{{ui:sketch.imageRotation}}:** A kép elforgatása a közepe körül, a sarkainál lévő ívelt nyilakkal vagy fokban megadott számként. [[Shift]] billentyűvel a nyilak 15°-os lépésekben illeszkednek. A forgatáskor megjelenő gyűrűn belül 22,5°-os lépésekben illeszkednek, kívüle egész fokokban.
- **{{ui:sketch.centreImageX}}** és **{{ui:sketch.centreImageY}}:** a kép közepét X = 0-ra vagy Y = 0-ra teszi. Forgatásnál az X = 0 a tengely, így a kép ezután szimmetrikusan fekszik körülötte.
- **{{ui:sketch.calibrateImage}}:** A gombja felül van, közvetlenül az előnézet alatt. Kattints a képen két olyan pontra, amelyek távolságát ismered, egy vonalzó két végére vagy egy ismert átmérőre, és gépeld be a valódi távolságot. A kép egyenletesen úgy méreteződik, hogy ez a távolság stimmeljen; az első pont a helyén marad.
- **{{ui:sketch.cropImage}}:** A keret fogantyúi ilyenkor méretezés helyett körbevágják a képet; ami levágódik, tárolva marad, és az {{ui:sketch.uncropImage}} gombbal vagy egy fogantyú újbóli kihúzásával visszajön.

Mind a négy csak a mintaképet érinti, a vázlatot soha.

**{{ui:sketch.traceImage}}** megspórolja a kézi körberajzolást: válaszd a {{ui:iconTag.part.dark}} vagy a {{ui:iconTag.part.light}} lehetőséget, állítsd be a {{ui:sketch.traceThreshold}} értéket, ahol a sötét világosba vált, és kattints a {{ui:sketch.traceApply}} gombra. A kép ezen része zárt vázlatvonalakká válik pontosan ott, ahol a kép fekszik, vele együtt elforgatva és körbevágva, és utána úgy szerkeszted, mint bármely más vonalat. Kijelölve jelennek meg, így a [[Delete]] újra eltávolítja őket, ha más küszöböt próbálnál. Ha a körvonalon kívül vagy belül peremet szeretnél, adj a vázlattestnek kontúrt a vonalain kívül vagy belül, vagy told el a kész testet.

## Billentyűk vázlatmódban

| Billentyű | Hatás |
| --- | --- |
| [[Esc]] | a jegyzeteszköz letétele; különben az eszköz letétele (vissza: {{ui:sketch.select}}), majd a kijelölés megszüntetése |
| [[Delete]] | a kijelölt elem törlése |
| [[Ctrl]]+[[C]] | a kijelölés másolása |
| [[Ctrl]]+[[X]] | a kijelölés kivágása |
| [[Ctrl]]+[[V]] | beillesztés |
| [[Ctrl]]+[[D]] | másolat a kijelölésről |
| [[Ctrl]]+[[Z]] | visszavonás |
| [[Ctrl]]+[[A]] | minden pont és vonal kijelölése |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | rajzolás közben: a vonal 15°-os lépésekben illeszkedik; húzás közben: a mozgás egy tengelyen marad |
| számjegy, [[<]], [[Tab]], [[Enter]] | rajzolás közben: a következő vonal hosszának és szögének begépelése és letétele |
| [[R]] | a zárt vázlat elforgatása 45°-kal |
| [[Ctrl]]+[[L]] | a mintakép zárolása vagy feloldása |
| [[N]] | jegyzet elhelyezése: a következő kattintás a vázlatra teszi |
| [[Shift]]+[[N]] | a jegyzetek megjelenítése vagy elrejtése |

> **Tipp:** Annyi pontot rajzolj, amennyi feltétlenül kell. Néhány jól elhelyezett pontból álló körvonal simább testet ad, mint sok pont gubanca.
