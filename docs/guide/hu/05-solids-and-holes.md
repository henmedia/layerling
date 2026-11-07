---
title: Tömör testek és lyukak
summary: Hogyan lesznek egyszerű alakzatokból furatok, hornyok és zsebek, és hogyan módosíthatsz később egy csoportot.
---

Ez a layerling legfontosabb gondolata, és gyorsan megtanulható: **Minden alakzat vagy tömör test, vagy lyuk.** A tömör test megmarad. A lyuk szerszám, amely anyagot vesz el.

## Tömör vagy lyuk

Jelölj ki egy alakzatot, és kattints a beállításaiban a {{ui:inspector.solid}} vagy a {{ui:inspector.hole}} gombra. A billentyűzet gyorsabb: a [[H]] lyukká teszi a kijelölést, az [[S]] újra tömörré. Mindkettő ott van abban a menüben is, amely egy testen jobb gombbal kattintva nyílik meg. A lyuk áttetszőként jelenik meg, hogy lásd, hol ül. A [[T]] átlátszóvá tesz egy testet, mondjuk hogy belenézz egy házba; egy második lenyomás újra átlátszatlanná teszi. Az egész kijelölésen működik: ha bármelyik test már átlátszó, mind átlátszatlan lesz, különben mind átlátszó.

Amíg semmi sincs csoportosítva, egy lyukkal nem történik semmi. Csak ott fekszik, és mutatja, hol fog később eltűnni valami.

![A henger lyuk. Kilóg a kocka tetejéből, hogy teljesen átvágja.](shot:hole-before)

## Csoportosítás

Jelölj ki tömör testeket és lyuk(ak)at, és kattints a {{ui:editor.tool.group}} gombra ([[Ctrl]]+[[G]]). Most a lyukak eltávolítják az anyagot azokból a tömör testekből, amelyekhez hozzáérnek. Ami marad, az egyetlen új alakzat.

![Az eredmény: egy kocka furattal.](shot:hole-after)

Így kapsz:

- **Furatokat:** egy henger lyukként egy testen át.
- **Hornyokat:** egy hosszúkás doboz lyukként a szélénél.
- **Zsebeket:** egy lyuk, amely nem megy át teljesen.
- **Meneteket egy alkatrészben:** egy menetes furat lyukként, lásd a [Menetek és mechanika](chapter:threads-and-mechanics) fejezetet.

Ha több tömör test van a csoportban, egyesülnek. Két egymáshoz érő tömör testből egyetlen alkatrész lesz.

Nagy hálóknál, például egy több százezer háromszögből álló importált STL-nél a vágás néhány másodpercig tart. A layerling ilyenkor a háttérben dolgozik, és a(z) „{{ui:status.computing}}” feliratot mutatja; közben forgathatod a nézetet és használhatod a felületet. Ha közben megváltoztatod a jelenetet, az eredmény elvész, és a layerling ezt jelzi. Ugyanez érvényes a(z) {{ui:editor.tool.split}} eszközre.

Egy csoportot úgy kezelhetsz, mint egy alakzatot: mozgathatod, forgathatod, színezheted, újra csoportosíthatod. A {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) feloldja, és visszakapod az egyes részeket.

### Csoport lyukká tétele

Egy egész csoport is lehet tömör vagy lyuk. Egy egyszerű szabály érvényes:

- Ha a csoport csak tömör testekből (vagy csak lyukakból) áll, egészként váltod át, és a részei vele mennek.
- Ha mindkettőt tartalmazza, mondjuk egy furatos kockát, minden rész megtartja a saját állapotát. Az egész csoport ilyenkor szerszám lesz, de a furat furat marad.

### Csoport átméretezése: a lyukak és kis részek megmaradnak

Ha egy csoportot hosszabbra, szélesebbre vagy magasabbra veszel, a részei vele együtt nyúlnak, mintha gumira rajzolták volna őket: egy lap kerek lyukai oválisak lesznek és befelé csúsznak. Hogy olyanok maradjanak, amilyenek, a csoport beállításaiban a {{ui:inspector.groupResize}} alatt válaszd a {{ui:inspector.groupResizeKeepParts}} lehetőséget; e választás nélkül a {{ui:inspector.groupResizeStretch}} érvényes, mint eddig minden csoportnál. Ettől kezdve a csoport minden átméretezéskor - a fogantyúkkal, a méretmezőkben vagy a {{ui:scalePercent.title}} eszközzel - egyetlen szabály szerint épül újra a részeiből, minden irányban külön:

- Az a rész, amely majdnem az egész csoporton végignyúlik, kilenctizedén vagy annál többön, vele együtt nő vagy zsugorodik, és megtartja a távolságát mindkét oldaltól: maga a lap, egy fal vagy egy doboz belseje, amelynek falai ugyanolyan vastagok maradnak.
- Minden más rész megtartja a saját méretét és a távolságát a közelebbi oldaltól. A középen álló rész középen marad.

Egy lap, amelyben minden saroktól 5 mm-re van egy lyuk és középen egy horony, 40 mm-rel meghosszabbítva tehát kerek lyukakat tart meg a sarkoktól 5 mm-re, és a horony középen marad. Nincs mögötte kényszermegoldó, és semmit sem kell részenként beállítani: minden részre ugyanaz a szabály érvényes, így előre tudod, mi fog történni. Egy elforgatott rész azzal a dobozzal számít, amelyet a csoportban elfoglal, és elforgatva marad; a csoporton belüli csoport egy résznek számít. Amíg egy fogantyút húzol, a csoport egészében nyúlik; amikor elengeded, újraépül, ugyanabban a visszavonási lépésben. Ha a csoport kisebb lesz annál, amire egy résznek a távolságával együtt szüksége van, az a rész a korábbiakhoz hasonlóan vele együtt zsugorodik, és egy üzenet szól róla. A tükrözött, elvékonyított vagy csavart csoport, valamint a saját lekerekítéssel, élletöréssel vagy textúrával rendelkező csoport mindig mindent megnyújt. Ha egy már megnyújtott csoporthoz választod ezt a beállítást, a részei azonnal újra elrendeződnek.

![Egy lap, amelyben minden saroktól 5 mm-re van egy lyuk és középen egy horony, a „Lyukak és kis részek megtartása” beállítással 40 mm-rel meghosszabbítva: a lyukak még mindig kerekek és 5 mm-re vannak a sarkoktól, a horony még mindig középen van.](shot:group-keep-parts)

## Kötegbe fogás

Néha a részeknek csak együtt kell maradniuk anélkül, hogy eggyé válnának – mondjuk egy fehér logónak egy fekete lapon, többszínű nyomtatáshoz. Erre való a {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), mint a Tinkercadben. Egy köteg úgy mozog, fordul és méreteződik, mint egy alakzat, de semmi sem egyesül:

- Minden rész megtartja a színét, és tömör test vagy lyuk marad. A köteg beállításaiban ugyanazok a kártyák vannak, mint egy csoportnál: {{ui:inspector.solid}} és {{ui:inspector.hole}} az egész kötegre (a részek színe megmarad), {{ui:inspector.transparent}} ([[T]]) és {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); kikapcsolt többszínűséggel a köteg egy színben jelenik meg és exportálódik. A(z) {{ui:inspector.separateParts}} szétszedi a köteget, ahogy a [[Ctrl]]+[[Shift]]+[[G]] is.
- A lyukak nem vágnak semmit.
- STL-, 3MF- vagy OBJ-exportban minden rész önálló test; 3MF-ben és OBJ-ben a színével együtt.

A {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) újra szétszedi a köteget, az [[E]] pedig szerkesztésre nyitja meg, mint egy csoportot. Az élletörés, a lekerekítés és a kiüregelés nem működik kötegen, mert az nem egyetlen test: ehhez csoportosítsd, vagy dolgozz a részein egyenként. Ha a kötegben lévő lyuknak mégis vágnia kellene, csoportosítsd a köteget (Ctrl+G).

## Metszet

A {{ui:editor.tool.intersect}} csak azt tartja meg, ami két vagy több testben közös. Tegyél egymásra két átfedő alakzatot, jelöld ki mindkettőt, és kattints rá. Így egy hengerből és egy dobozból olyan darab lesz, amelynek egyik oldala kerek, a másik egyenes. Egy csoport úgy számít, ahogy kinéz, a lyukakkal együtt. Ha egy lyuk is ki van jelölve, az marad meg, ami minden tömör testben és minden lyukban közös. Ha az alakzatoknak nincs közös részük, semmi sem változik, és egy üzenet ezt jelzi. Az első kattintás alkalmazás előtt megmutatja a közös részt: a kijelölt alakzatok áttetszővé válnak, a közös részük pedig zölden rajzolódik. Jelöld ki és mozgasd az alakzatokat egyenként, és a zöld rész követi őket; a {{ui:editor.tool.intersect}} második kattintásra alkalmazza, az [[Esc]] bezárja az előnézetet. Az előnézethez túl sok háromszögből álló alakzatok, például nagy importált hálók, már az első kattintásra elkészülnek.

A(z) {{ui:editor.tool.hull}} a kijelölt alakzatokat egyetlen konvex testbe burkolja, mintha zsugorfóliába csomagolnád őket: a legkisebb horpadás nélküli testbe, amely mindet magában foglalja. Egy hengeren ülő félgömbből lépcső nélküli kupola lesz, négy sarokhengerből lekerekített sarkú doboz, két gömbből kapszula. A kijelölésben lévő lyukak utána vágódnak ki a burokból. A részek benne maradnak: a(z) {{ui:group.edit}} csoportként nyitja meg a burkot, egy rész ottani mozgatása és a bezárás pedig újraépíti. A burok háló, ezért a kerek alakzatokon lapok látszanak, és az él-eszközök úgy dolgoznak rajta, mint bármely hálón. Ha csak lyukak vannak kijelölve, a burok maga is lyuk: két hengeres lyuk hosszlyukat vág. A burok kitölt mindent, ami a részeiben üreges: egy csövet, egy {{ui:editor.tool.hollow}} eszközzel kiüregelt hengert, egy lyukaival csoportosított részt. Kapcsold be a Tulajdonságoknál a {{ui:inspector.hullKeepHoles}} lehetőséget, hogy nyitva maradjanak: ekkor a burok csak a részek közötti teret tölti ki, és egy rész oldalán lévő bemélyedés is megmarad.

A(z) {{ui:editor.tool.cookieCutter}} sütiszaggatót készít a kijelölésből: vékony falat a körvonal körül, 15 mm magasan, és egy 2 mm-es lapos peremet a tövénél, így a szaggató a peremen áll, és a hüvelykujjnak van mit nyomnia. Jelölj ki egy importált SVG-t vagy egy vázlattestet, és a saját körvonala lesz felhasználva. Egy fekvő szöveg a betűi saját görbéit adja. Bármely más alakzat, egy épített, egy importált háló vagy több rész azt adja, amin áll: a körvonalat, amelyet a munkasík átvág rajta, ezért előbb tedd a munkasíkra. Az egymásba lógó részek egy közös körvonalat adnak, mintha csoportosítva lennének; az egymástól különálló részek mind saját szaggatót kapnak ugyanabban a kötegben. A körvonal balról jobbra tükröződik: a szaggató a peremén állva nyomtatódik, és vágáshoz megfordítod, így egy szöveg vagy logó helyes irányban kerül a tésztára. A fal teteje 0,4 mm széles vágóélbe fut. A körvonalban lévő lyukak, egy e vagy egy a belseje, saját falakat kapnak, így ezek is kivágódnak a sütiből. Ezek a köteg önálló testei, {{ui:cookieCutter.part.innerWalls}}: ha egy szöveget vagy mintát csak benyomnál a tésztába kivágás helyett, tedd őket alacsonyabbá a Tulajdonságok alatt. 15 mm-es fallal és 5 mm vastag tésztával a 12 mm-es belső falak 2 mm mélyen nyomnak. A külső falnál alacsonyabb belső falak teteje vágóél helyett lapos: csak nyomnak, egy él pedig vékony hegyeket hagyna, amelyek letörnek, és barázdákat, amelyekben megreked a tészta. Ha élt szeretnél, add meg nekik a Tulajdonságok alatt. Két híd a peremnél, azon az oldalon, amelyet a kezed nyom, minden belső falat a körülötte lévő falhoz köt, körben elosztva, 4 mm szélesen és 3 mm magasan. Minden híd teljes szélességével a falakon áll, egy körvonal mentén futó oldal közepén, és sosem keresztben egy másik darabon. Az egymás melletti darabok, például egy név betűi, egymáshoz is kapcsolódnak, a legközelebbiek először, így a hidak hálóként futnak végig rajtuk, és egy szó közepén lévő betű is meg van tartva. Az eszközre kattintva kis ablak nyílik: ott a hidak helyett a(z) {{ui:cookieCutter.support.plate}} lehetőséget választhatod, amely a nyomott oldalon kitölti az egész körvonalat, stabilabb és jobban tapad a tárgyasztalhoz, de már nem engedi hátulról kinyomni a tésztát. A(z) {{ui:cookieCutter.fillet}} kis 45°-os lejtőket tesz oda, ahol a falak a peremen, a hidakon vagy a lapon állnak, hogy a vékony részek, például az i pontja, ne törjenek le; ezek a köteg önálló testei. Ott állítod azt is, mennyivel alacsonyabbak a belső falak, és tükröződjön-e a körvonal; az értékek megmaradnak a következő szaggatóhoz. A magasságukat a Tulajdonságok alatt változtasd, mint a peremét. A szaggató a kijelölést vázlattestek kötegével váltja fel, a(z) {{ui:group.edit}} megnyitja. A fal, a belső falak és a perem a vázlat kitöltési módjai, egy vonal a sziluetten kívül: mindegyik vastagságát, magasságát vagy színét a Tulajdonságok alatt változtasd, és ott a fal {{ui:prop.sketchCuttingEdge}} értékét is (0 a lapos tetőhöz). Ahol egy szűk ív nem hagy helyet a két oldali letörésnek, a fal csak kívül lesz letörve, ugyanarra az élre. Ahol egy körvonal egyáltalán nem törhető le - éles csúcsú logó, egy test háromszögeiből kivágott körvonal -, az él helyette 0,1 mm-es finom lépcsőkből épül, amelyeket egy 0,2 mm-es nyomtatási réteg nem különböztet meg a lejtőtől; az ilyen fal háromszögháló, nem pontos test. Ha a körvonalat úgy tartanád meg, ahogy rajzoltad, tükrözd vissza a szaggatót a(z) {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}} eszközzel. Egy PNG- vagy JPG-kép is működik: importáláskor vázlattestté rajzolódik át, és a szaggató azt követi.

A(z) {{ui:editor.tool.loftSketches}} két vázlattestet vagy importált SVG-t egy testté köt össze: az alsó körvonala lent, a felsőé fent, köztük egyenes falakkal. Így lesz belőle tölcsér, négyzetből körbe vezető átmeneti darab vagy felfelé keskenyedő keret. Tedd a két testet egymás fölé oda, ahová valók, tetszés szerint eltolva és elforgatva, jelöld ki mindkettőt, és kattints az eszközre. A loft az alsó test aljától a felső tetejéig ér.

## Egy test kivágása egy másikból

Az egymásba illeszkedő alkatrészeknél, például tengely egy hüvelyben vagy csavar egy házban, megcsinálod az egyik alkatrészt, és kivágod a másikból. Jelöld ki a két testet, és kattints a {{ui:editor.tool.cutOut}} gombra a {{ui:editor.group.combine}} területen, vagy kattints jobb gombbal, és válaszd ott. Az ablak megnevezi az alkatrészt, amely marad, és a testet, amely az üreget kapja; a layerling a kisebbet veszi alkatrésznek, a {{ui:cutOut.swap}} megfordítja. A {{ui:cutOut.clearance}} az üreget minden oldalon ennyivel teszi nagyobbá az alkatrésznél: a 0 pontosan illeszkedik, a 0,2 mm szokásos hézag nyomtatott illesztéshez. Az {{ui:cutOut.apply}} kivágja az alkatrész másolatát a másik testből, magát az alkatrészt pedig ott hagyja, ahol van. Az eredmény egy csoport: az {{ui:editor.tool.ungroup}} újra szétszedi a vágást. A hézaghoz az alkatrésznek pontos testnek kell lennie, mint az {{ui:editor.tool.offset}} eszköznél, amelyet ehhez használ.

## Körvonal átütése egy testen

Ha egy test körvonalát egyenesen át akarod vágni egy másikon, először a lyukasztót jelöld ki, aztán a lyukasztandó testet, és kattints a(z) {{ui:editor.tool.punch}} gombra a(z) {{ui:editor.group.combine}} területen, vagy válaszd jobb kattintással. A kettőnek nem kell érintkeznie: a lyukasztó bárhol állhat a test előtt, csak a körvonala számít a választott irányból ({{ui:punch.axis}}) nézve. Egy lemez fölé tartott teáskanna így teáskanna alakú nyílást hagy. A layerling azzal a tengellyel kezd, amely mentén a lyukasztó a legtávolabb áll a testtől; X balról jobbra, Y elölről hátra, Z felfelé mutat. A(z) {{ui:punch.swap}} felcseréli a szerepeket, a(z) {{ui:punch.clearance}} pedig minden oldalon nagyobbá teszi a nyílást, 0,2 mm egy nyomtatott alkatrésznek, amelynek át kell férnie. A(z) {{ui:punch.apply}} a nyílást pontos, lyukra állított vázlattestként csoportosítja a testtel, így a(z) {{ui:editor.tool.ungroup}} ismét kiveszi; a lyukasztó a helyén marad. Mozgasd vagy forgasd el, és üss át újra egy másik nyíláshoz.

## Csoport szerkesztése

Ha egy furat túl kicsire sikerült, nem kell feloldanod a csoportot és újraépítened. Jelöld ki a csoportot, és kattints a beállításaiban a {{ui:group.edit}} gombra, az objektumlistában a mappa ikonra, vagy nyomd meg az [[E]] billentyűt. A csoportra dupla kattintás ugyanezt teszi, mint a Tinkercadben, kötegen is; ha ezt nem szeretnéd, kapcsold ki a beállításokban a {{ui:workspace.doubleClickOpensGroup}} kapcsolót. Egy rész csak akkor kezd mozogni, ha a mutatót néhány pixellel elhúztad, így egy remegős kattintás vagy dupla kattintás nem mozdítja el. A részek most külön fekszenek, és bármelyik eszközzel módosíthatod őket: nagyobbíthatsz egy lyukat, elmozdíthatsz egy testet, hozzáadhatsz egy lyukat.

![A szerkesztés alatt álló csoport: alul a sávon a Mégse és a Kész, az objektumlista pedig a részeket mutatja.](shot:open-group)

A kép alján egy sáv jelenik meg. A {{ui:group.done}} újraépíti a csoportot a nevével, a színével és a tömör vagy lyuk állapotával együtt. A {{ui:common.cancel}} érintetlenül visszaállítja.

Ha az egyik rész maga is csoport, ugyanígy szerkesztheted, és így tovább, olyan mélyen, amilyen mély a terved. A sáv mutatja, hol vagy, például „Konzol › Csavarcsonk”. A {{ui:group.done}} és a {{ui:common.cancel}} mindig a legbelső csoportot fejezi be, és egy szinttel kijjebb visz. Amíg egy csoporton belül vagy, csak a részei közötti csoportok szerkeszthetők; egy másik szerkesztéséhez előbb fejezd be.

A {{ui:editor.tool.ungroup}} paranccsal ellentétben, amely végleg szétszedi a csoportot, a szerkesztés megtartja a csoportot: a neve és a beállításai megmaradnak, és a {{ui:common.cancel}} gombbal mindig visszaléphetsz.

Egy megjegyzés: az **egész** csoportra tett lekerekítések és élletörések az újraépítéskor elvesznek. A sáv ezt jelzi is.

## Kettévágás

A {{ui:editor.group.modify}} területen lévő {{ui:editor.tool.split}} egy síkkal kettévágja a kijelölést – mondjuk egy alkatrészt, amely túl nagy a tárgyasztalhoz, vagy amelynek a belsejét látni szeretnéd. Jelölj ki egy vagy több tömör testet vagy lyukat, és kattints rá. Egy áttetsző sík pontosan mutatja, hová kerül a vágás; semmi sem változik, amíg nem alkalmazod.

- {{ui:split.orientation}}: az **X** függőleges vágást ad bal és jobb között, az **Y** elöl és hátul között, a **Z** vízszintes vágást felül és alul között. A tengelyek ugyanúgy vannak elnevezve, mint a Helyzet kártyán, a Z felfelé mutat; a sík a Z-n indul.
- {{ui:split.workplane}}: a {{ui:split.workplaneParallel}} a munkasíkkal párhuzamosan fekteti a síkot, a {{ui:split.workplaneAcrossX}} és a {{ui:split.workplaneAcrossY}} merőlegesen állítja rá, keresztben az X vagy Y irányára. Ha a munkasík origója átmegy a kijelölésen, a sík rajta halad át, különben a közepén. Így a [[W]] billentyűvel egy ferde lapra teszed a munkasíkot, és pontosan ott vágsz, a forgatócsúszkák állítása nélkül.
- {{ui:split.position}}: ahol a sík átmegy, csúszkával vagy begépelve. Középen indul. A síkon lévő nyílhegyet is húzhatod; a sík a nyíl mentén 0,1 mm-es lépésekben mozog.
- A helyzet melletti {{ui:split.pickFace}} gomb egy lapra fekteti a síkot: kattints rá, majd kattints a lapra. Az irány, mindkét elforgatás és a helyzet ehhez igazodik. Kiválasztás közben a mutató alatt egy kék sík mutatja, melyik lapot fogja venni. Egy ki nem jelölt test lapja is működik, hogy a vágást hozzá igazítsd, de a sík a kijelölésen belül marad. Az [[Esc]] leállítja a kiválasztást, és a síkot ott hagyja, ahol volt.
- Az alatta lévő két forgatócsúszka a másik két tengely körül forgatja a síkot, mindkét irányban legfeljebb 180°-kal, ferde vágáshoz. Kombinálhatók.

A {{ui:split.apply}} vagy az [[Enter]] elvégzi a vágást, az [[Esc]] megszakítja (lapválasztás közben az első [[Esc]] csak a kiválasztást állítja le). Minden objektumból, amelyen a sík átmegy, két zárt test lesz, az oldaluk szerint elnevezve, például „Doboz (Z+)” és „Doboz (Z-)”; azok az objektumok, amelyeket nem metsz, változatlanok maradnak. Egy lyukból két lyuk lesz, a kiüregelt test pedig megtartja az üregét. Mindkét fél a helyén marad – nyomtatáshoz fektesd mindegyiket a vágott lapjára a {{ui:editor.tool.layFlat}} paranccsal.

A(z) {{ui:split.connectors}} újra egymáshoz igazítják a feleket, ahogy a PrusaSlicer, az OrcaSlicer és a Bambu Studio vágóeszközei teszik. A(z) {{ui:split.connectors.none}} beállítással, ez az alapértelmezés, a vágás a fent leírtak szerint történik. A(z) {{ui:split.connectors.dowels}} mindkét félbe furatot készít, és külön csapokat, amelyek mindkettőbe beleillenek: a csapok harmadik testként jelennek meg, a felek mellett állva azok alján, hogy velük együtt nyomtasd őket – állva a rétegekben kerekre jönnek ki, mint a furataik, és éppen ezt méri az illesztési próba. A(z) {{ui:split.connectors.plugs}} kerek csapokat állít arra a félre, amelynek a neve mínuszra végződik, a hozzájuk való furatokat pedig a másik félbe készíti. Az összekötők merőlegesen mennek be a síkra, akárhogyan is van elforgatva, mindegyik a saját átmérőjével és 1,2 mm anyaggal a vágott lap minden széléig, kettő közülük pedig ennek kétszeresére egymástól. A vágott lap minden különálló darabja saját összekötőket kap, egyenletesen elosztva rajta: a(z) {{ui:split.connectorCount}} megadja, hányat, a 0 pedig a darab méretére bízza, legalább kettőt. Az a darab, amely egyhez is túl kicsi, egyet sem kap, és ahol egy fél vékonyabb, mint amilyen mély a furata, ott az összekötő elmarad; a panel ezt még a vágás előtt jelzi, a síkon fehér gyűrűk mutatják, hová kerülnek. Ha egy sem fér el, az alkatrészek nélkülük válnak ketté, és az állapotsor ezt jelzi.

- A(z) {{ui:split.connectorDiameter}} a csapok átmérője, kezdetben 5 mm.
- A(z) {{ui:split.connectorDepth}} megadja, milyen mélyen megy be minden furat a saját felébe. Egy laza csap ennek kétszerese mínusz 0,6 mm hosszú, egy álló csap pedig 0,3 mm-rel rövidebb a furatánál, így sosem ülnek a furat alján, és a felek teljesen összezárnak. A csapok végein kis letörés van, minden furat szájánál is, hogy egy szétlapult első réteg ne szűkítse.
- A(z) {{ui:split.connectorClearance}} a csap és a furata közötti hely. Ha a nyomtatód hézagát megmérted az illesztési próbával (a nyomtatásról szóló fejezetben), ebből indul, különben 0,2 mm-ről.

A(z) {{ui:split.connectors.dovetail}} ragasztó nélkül tartja össze a feleket, mint az OrcaSlicer fecskefarkas vágása: egy léc, amely a vágott laptól távolodva szélesedik, azon a félen áll, amelynek a neve mínuszra végződik, és egyenesen fut át a vágott lapon, széltől szélig; a másik fél megkapja a hozzá illő hornyot, mindkét végén nyitva. A feleket oldalról, a léc mentén told egymásba; ezután a vágásra merőlegesen már nem húzhatók szét. A lécek a vágott lap hosszában futnak, és ha egy test több darabban metszi a síkot, mindegyiken egy irányba futnak, hogy egy fél egyetlen mozdulattal rácsúsztatható legyen. A(z) {{ui:split.connectorCount}} a lécek száma egymás mellett minden darabon; a 0 a darab szélességére bízza, hat lécszélességenként egyet, legalább egyet. Széles teteje mellett a léc megtartja saját szélességének felét és még 1,2 mm anyagot a vágott lap széléig, két léc pedig ennek kétszeresét egymástól. Az a darab, amely egy léchez túl keskeny vagy a léc irányában túl rövid, nem kap egyet sem, és a léc elmarad ott, ahol a másik fél vékonyabb, mint amilyen mély a horonya. A síkon fehér körvonalak mutatják, hová kerülnek: a kitöltött sáv a léc talpa, a körülötte futó vonal a széles teteje.

- A(z) {{ui:split.dovetailWidth}} a léc szélessége ott, ahol kilép a vágott lapból, kezdetben 6 mm.
- A(z) {{ui:split.dovetailDepth}} megadja, milyen messze áll ki a vágott lapból a másik félbe, kezdetben 4 mm. A horony 0,3 mm-rel mélyebb, hogy a felek teljesen összezárjanak.
- A(z) {{ui:split.dovetailAngle}} megadja, mennyire dől kifelé minden oldal a vágott lapra merőlegeshez képest, 5° és 30° között, kezdetben 15°. Minél nagyobb, annál szélesebb a léc teteje, és annál erősebben tart.
- A(z) {{ui:split.dovetailTurn}}: a 0 hosszában fekteti a léceket, a 90 keresztben a vágott lapon, a köztes szög pedig ennyivel elfordítja őket.
- A(z) {{ui:split.connectorClearance}} a hely mindkét oldalon a léc és a horonya között, az illesztési próbából, mint a csapoknál. A léc végei körben le vannak törve, hogy megtalálja a hornyot, és a horony szájánál is van letörés.

Nyomtatáshoz a horonyos felet fektesd a vágott lapjára, a lécest pedig fordítva nyomtasd, a vágott lappal felfelé: így a léc oldalai csak a szögükkel dőlnek kifelé, ami támasz nélkül nyomtatható.

A lyukak összekötők nélkül válnak ketté.

A felek egyszerű hálók: az olyan beállítások, mint egy henger oldalszáma vagy egy szöveg betűi, elvesznek, ezért ezeket előbb állítsd be. A [[Ctrl]]+[[Z]] egy lépésben visszahozza az eredetit. Zárolt és elrejtett objektumok nem vághatók ketté.

## Részek szétválasztása

Ha egy alakzat több különálló darabból áll, például egyes betűkből álló szöveg, a {{ui:inspector.separateParts}} önálló alakzatokra bontja. A tétel a formán jobb gombbal megnyitott menüben is megtalálható.

> **Tipp:** A lyukakat mindig építsd kicsit hosszabbra, mint az alkatrész, amelyen át kell menniük. Ha a lyuk pontosan a lappal egy síkban végződik, néha egy leheletvékony hártya marad. Egy milliméter túlnyúlás biztosra megy.
