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

Egy csoportot úgy kezelhetsz, mint egy alakzatot: mozgathatod, forgathatod, színezheted, újra csoportosíthatod. A {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) feloldja, és visszakapod az egyes részeket.

### Csoport lyukká tétele

Egy egész csoport is lehet tömör vagy lyuk. Egy egyszerű szabály érvényes:

- Ha a csoport csak tömör testekből (vagy csak lyukakból) áll, egészként váltod át, és a részei vele mennek.
- Ha mindkettőt tartalmazza, mondjuk egy furatos kockát, minden rész megtartja a saját állapotát. Az egész csoport ilyenkor szerszám lesz, de a furat furat marad.

## Kötegbe fogás

Néha a részeknek csak együtt kell maradniuk anélkül, hogy eggyé válnának – mondjuk egy fehér logónak egy fekete lapon, többszínű nyomtatáshoz. Erre való a {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), mint a Tinkercadben. Egy köteg úgy mozog, fordul és méreteződik, mint egy alakzat, de semmi sem egyesül:

- Minden rész megtartja a színét, és tömör test vagy lyuk marad.
- A lyukak nem vágnak semmit.
- STL-, 3MF- vagy OBJ-exportban minden rész önálló test; 3MF-ben és OBJ-ben a színével együtt.

A {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) újra szétszedi a köteget, az [[E]] pedig szerkesztésre nyitja meg, mint egy csoportot. Az élletörés, a lekerekítés és a kiüregelés nem működik kötegen, mert az nem egyetlen test: ehhez csoportosítsd, vagy dolgozz a részein egyenként. Ha a kötegben lévő lyuknak mégis vágnia kellene, csoportosítsd a köteget (Ctrl+G).

## Metszet

A {{ui:editor.tool.intersect}} csak azt tartja meg, ami két vagy több testben közös. Tegyél egymásra két átfedő alakzatot, jelöld ki mindkettőt, és kattints rá. Így egy hengerből és egy dobozból olyan darab lesz, amelynek egyik oldala kerek, a másik egyenes. Egy csoport úgy számít, ahogy kinéz, a lyukakkal együtt. Ha egy lyuk is ki van jelölve, az marad meg, ami minden tömör testben és minden lyukban közös. Ha az alakzatoknak nincs közös részük, semmi sem változik, és egy üzenet ezt jelzi. Mellette a {{ui:editor.tool.intersectPreview}} alkalmazás előtt megmutatja a közös részt: a kijelölt alakzatok áttetszővé válnak, a közös részük pedig zölden rajzolódik. Jelöld ki és mozgasd az alakzatokat egyenként, és a zöld rész követi őket; a {{ui:editor.tool.intersect}} alkalmazza, az [[Esc]] bezárja az előnézetet.

## Egy test kivágása egy másikból

Az egymásba illeszkedő alkatrészeknél, például tengely egy hüvelyben vagy csavar egy házban, megcsinálod az egyik alkatrészt, és kivágod a másikból. Jelöld ki a két testet, és kattints a {{ui:editor.tool.cutOut}} gombra a {{ui:editor.group.combine}} területen, vagy kattints jobb gombbal, és válaszd ott. Az ablak megnevezi az alkatrészt, amely marad, és a testet, amely az üreget kapja; a layerling a kisebbet veszi alkatrésznek, a {{ui:cutOut.swap}} megfordítja. A {{ui:cutOut.clearance}} az üreget minden oldalon ennyivel teszi nagyobbá az alkatrésznél: a 0 pontosan illeszkedik, a 0,2 mm szokásos hézag nyomtatott illesztéshez. Az {{ui:cutOut.apply}} kivágja az alkatrész másolatát a másik testből, magát az alkatrészt pedig ott hagyja, ahol van. Az eredmény egy csoport: az {{ui:editor.tool.ungroup}} újra szétszedi a vágást. A hézaghoz az alkatrésznek pontos testnek kell lennie, mint az {{ui:editor.tool.offset}} eszköznél, amelyet ehhez használ.

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

A felek egyszerű hálók: az olyan beállítások, mint egy henger oldalszáma vagy egy szöveg betűi, elvesznek, ezért ezeket előbb állítsd be. A [[Ctrl]]+[[Z]] egy lépésben visszahozza az eredetit. Zárolt és elrejtett objektumok nem vághatók ketté.

## Részek szétválasztása

Ha egy alakzat több különálló darabból áll, például egyes betűkből álló szöveg, a {{ui:inspector.separateParts}} önálló alakzatokra bontja. A tétel a formán jobb gombbal megnyitott menüben is megtalálható.

> **Tipp:** A lyukakat mindig építsd kicsit hosszabbra, mint az alkatrész, amelyen át kell menniük. Ha a lyuk pontosan a lappal egy síkban végződik, néha egy leheletvékony hártya marad. Egy milliméter túlnyúlás biztosra megy.
