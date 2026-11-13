---
title: Výběr a uspořádání
summary: Výběr objektů, seznam objektů, zarovnání, zrcadlení, otáčení, položení na plochu a pravidelné opakování.
---

## Výběr

Kliknutí vybere tvar, [[Shift]] přidává nebo odebírá další. Dokud držíte [[Shift]] a jsou vybrány dva nebo více tvarů, počítá je malé číslo pod ukazatelem myši. Kliknutí na prázdné místo a [[Esc]] výběr zruší. Tažením rámečku na prázdné pracovní ploše vyberete všechny dotčené tvary. Se [[Shift]] se dosud nevybrané přidají a vybrané odeberou. Chcete-li raději vybrat jeden díl ze shluku, zapněte v nastavení (oblast {{ui:workspace.appearance}}) {{ui:workspace.frameByDirection}}: rámeček tažený doprava pak vezme jen to, co leží celé uvnitř, tažený doleva stále vše, čeho se dotkne, a jeho čára je čárkovaná. Podržením [[Alt]] při tažení rámeček pro toto jedno tažení obrátíte, například abyste vzali celá tělesa ze strany, kde by to směr nedovolil. [[Ctrl]]+[[A]] vybere všechna viditelná tělesa. Když táhneš těleso nebo úchyt rámečku, [[Esc]] akci zruší, dokud je tlačítko myši ještě stisknuté: vše se vrátí do původního stavu a do historie se nic nepřidá.

Tvar za jiným tvarem, například výřez uvnitř tělesa, vyberete bez otáčení pohledu: klikněte na to místo pravým tlačítkem a zvolte {{ui:contextMenu.selectOther}}. Nabídka pak vypíše všechny tvary pod ukazatelem, zepředu dozadu. Ten, na kterém je ukazatel, se v pohledu obtáhne, i skrz tvary před ním; kliknutí ho vybere a se [[Shift]] ho přidá k výběru. Položka je tam vždy, když pod ukazatelem leží více než jeden tvar; na tabletu otevře stejnou nabídku dlouhé podržení.

Překážející objekt skryjte pomocí {{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]. V projektu zůstane, ale nebude viditelný ani zahrnutý v exportu. Exportní okno předem uvede počet skrytých dílů. [[Ctrl]]+[[Shift]]+[[H]] všechny zobrazí. Proti nechtěným změnám chrání zámek nahoře v nastavení nebo [[Ctrl]]+[[L]]. Zamčený tvar nelze přesouvat, měnit jeho rozměry, otáčet, přebarvovat ani mazat. Úchyty zešednou, u horní šipky se objeví zámek a editační nástroje se vypnou. Rozměry lze stále zjistit najetím na úchyt. Klávesa pro změnu ohlásí zamčený objekt. Obsahuje-li výběr zamčený tvar, nemění se ani ostatní části. Skrytí, přejmenování, kopírování a duplikování zůstávají dostupné. Chceš-li díl nechat, jak je, a přesto s ním stavět, zamkni jen jeho tvar: štítem vedle zámku, položkou {{ui:contextMenu.lockShape}} v nabídce pravého tlačítka nebo [[Ctrl]]+[[Shift]]+[[L]]. Dál se dá posouvat, otáčet, zvedat, zarovnávat, kopírovat a seskupovat s ostatními, ale velikost, nastavení a název zůstávají beze změny: úchyty velikosti zmizí, jejich pole zešednou a změna velikosti, zrcadlení, zrušení skupiny, nástroje hran a mazání se odmítnou. Kopie zámek zachová, stejně jako díl ve skupině: skupinu lze posouvat a znovu rozdělit, ale ne měnit její velikost. Štít tvar zase odemkne.

Chcete-li pracovat na několika dílech hluboko uvnitř návrhu, vyberte je a zvolte {{ui:contextMenu.hideOthers}} v nabídce pravého tlačítka nebo pod {{ui:editor.visibilityOptions}}: vše ostatní se skryje jedním krokem, takže [[Ctrl]]+[[Z]] nebo [[Ctrl]]+[[Shift]]+[[H]] to vrátí. {{ui:contextMenu.invertSelection}} v nabídce pravého tlačítka vybere každý viditelný tvar, který vybraný nebyl, a vybrané pustí. Obojí najdete také ve vyhledávání příkazů ([[Ctrl]]+[[K]]), kde jim můžete přiřadit i vlastní klávesu.

Číslo na tlačítku skupiny {{ui:editor.group.visibility}} říká, kolik tvarů je skrytých, a kliknutím na něj se všechny znovu zobrazí. Projekt otevřený se skrytými tvary to jednou oznámí zprávou s tlačítkem pro jejich zobrazení. Díl, který skryjete v otevřené skupině, zůstane skrytý i po jejím zavření tlačítkem {{ui:group.done}}: skupina si ponechá svou velikost a ostatní díly zůstanou, jak jsou, při zarovnání se skrytý díl dál počítá a zobrazení všech skrytých tvarů se ho netýká. Pro zobrazení skupinu znovu otevřete.

## Seznam objektů

U složitého modelu pomůže seznam všech tvarů: {{ui:editor.tool.showOutliner}} nebo [[Ctrl]]+[[Shift]]+[[O]]. V tomto prohlížeči si pamatuje, zda jste jej nechali otevřený nebo zavřený, a toto nastavení platí pro všechny projekty.

![Seznam objektů: sloučený celek se dvěma částmi a vedle něj koule. Ikona složky otevře úpravu celku.](shot:object-list)

- Kliknutí vybere tvar, i uvnitř sloučení. Jako ve správci souborů [[Ctrl]] ([[Cmd]] na Macu) přidá nebo odebere jednu položku a [[Shift]] vybere všechny položky od naposledy kliknuté až po tuto, v pořadí seznamu; [[Ctrl]]+[[Shift]] je přidá k výběru. V pohledu naopak přidává a odebírá [[Shift]]. Šipky rozbalují a sbalují vnořené části.
- Písmeno za názvem ukazuje, zda je díl {{ui:outliner.solid}}, nebo {{ui:outliner.hole}}: je to první písmeno slova a po najetí myší se zobrazí celé slovo.
- Pod názvem stojí, o jaký tvar jde. Těleso, které už není jednoduchým tvarem (zaoblené, vydutěné nebo importované), ukazuje {{ui:shape.exactBody}}, když ho export STEP zapíše přesně, a {{ui:shape.mesh}}, když je jen z trojúhelníků a jde ven jako STL. Zúžení, náklon nebo zkroucení přidané až po zaoblení nebo vydutění ohne jen jeho síť, takže pak ukazuje {{ui:shape.mesh}}.
- Zámek a oko ovládají zamknutí a skrytí jednotlivých částí.
- {{ui:outliner.rename}} přiřadí vlastní název. Stejně funguje tužka nahoře v nastavení vybraného tvaru. Smysluplné názvy usnadňují práci ve velkém projektu.
- Tlačítko A–Z v záhlaví ({{ui:outliner.sortByName}}) seřadí pojmenované tvary abecedně, čísla počítá jako čísla (Díl 2 před Dílem 10). Tvary s výchozím názvem zůstanou pod nimi v pořadí přidání, nejnovější na konci, a díly ve skupinách se řadí stejně. Mění se jen seznam, nikdy projekt. Druhé kliknutí ukáže vše znovu v pořadí přidání a prohlížeč si volbu zapamatuje.
- Úchyt na levé straně řádku (šest teček) přesune tvar v seznamu: přetáhněte jej nahoru nebo dolů, nebo na něj přejděte a stiskněte [[↑]] nebo [[↓]]. Tím se mění vlastní pořadí návrhu, ke kterému se seznam vrací bez řazení A–Z, a Zpět to vrátí. Při řazení A–Z nebo vyhledávání jsou úchyty skryté.
- Chcete-li tvar vložit do skupiny, rozbalte skupinu šipkou a přetáhněte tvar za úchyt na díly skupiny; skupina dostane oranžový rámeček. Tvar zůstane, kde je, a ponechá si název, stejně jako skupina: skupina se s ním znovu sloučí, svazek ho jen přijme. Díly rozbalené skupiny mají vlastní úchyt: vytažený ze skupiny leží díl opět samostatně, na místě seznamu, kde ho pustíte, nebo ho pusťte na jinou rozbalenou skupinu a přesune se do ní. Skupina, které zůstane jediný díl, zanikne a zůstane po ní ten díl. Zpět vrátí každý z těchto kroků najednou. Během úprav skupiny to nejde.
- Vyhledávání používá názvy i typy, například válec nebo výřez, a prochází libovolně vnořená sloučení. Nadřazené celky zůstanou v seznamu a rozbalí cestu k nalezeným částem. Celek nalezený vlastním názvem po rozbalení ukazuje všechny části.
- Šipka vlevo v záhlaví sbalí seznam na záhlaví a znovu jej rozbalí.

Seznam je ukotvený vpravo od orientační krychle. Přetáhněte jej za záhlaví kamkoliv na plochu; může se zasunout pod krychli a lištu pohledu. Vrácení vedle krychle nebo dvojklik jej znovu ukotví. Poloha i sbalení se pamatují v tomto prohlížeči. Širší nebo užší seznam uděláte tažením za jeho pravý dolní roh, od 240 do 600 pixelů; i šířku si prohlížeč zapamatuje.

## Zadání polohy

Karta {{ui:inspector.position}} v panelu vlastností ukazuje, kde vybrané těleso stojí, a můžete ji zadat: {{ui:prop.positionX}} a {{ui:prop.positionY}} jsou střed jeho ohraničení na podložce, se stejnými znaménky jako kóty v pohledu, a {{ui:prop.positionZ}} je výška jeho spodní strany. Přes {{ui:inspector.positionFrom}} nahoře na kartě přepnete na {{ui:inspector.positionEdge}}: X a Y pak ukazují levý a přední okraj tělesa, takže okraj položíte přesně na rozměr. Nastavení zůstane, dokud nepřepnete zpět na {{ui:inspector.positionCentre}}. X míří doprava, Y dozadu a Z vzhůru, podle pravidla pravé ruky jako v Tinkercadu a CAD programech; směry ukazují šipky os na podložce. Hodnoty jsou v nastavených jednotkách a posuvníky sahají tak daleko jako tažení.

## Odložení dílů vedle podložky

Tvar lze odtáhnout za okraj, přibližně o jednu šířku podložky na každou stranu, a ponechat pro pozdější použití. Klávesové šipky jej přesunou i dále. Odložený díl stále patří do projektu a exportuje se. Pro vynechání jej skryjte nebo exportujte pouze výběr. S vybranou tiskárnou export upozorní na díly mimo podložku.

## Přichytávání při přesouvání

Při tažení po pracovní rovině se levý, pravý, přední a zadní okraj i střed přichytávají na odpovídající okraje či středy jiných tvarů. Růžová vodicí čára ukazuje místo přichycení. Bez zadávání čísel tak díly položíte těsně vedle sebe nebo je vystředíte. Funguje to i při vypnuté mřížce. Počítá se i střed pracovní roviny: růžové čáry ukážou, kdy tvar sedí uprostřed desky ve směru X, Y nebo v obou.

Přichytávání funguje i při změně velikosti: když táhneš za boční úchyt, ta strana se zastaví u hran a středů jiných tvarů a u stěny, na kterou narazí, také u vnitřní stěny krabice, vydutého tělesa nebo importovaného pouzdra, a růžová čára ukáže kde. Tento rozměr zůstane přesně takový, mimo mřížku. Tak díl vyplní pouzdro od stěny ke stěně: přilož ho k jedné stěně a jeho druhou stranu přetáhni k protější. S [[Alt]] tvar roste od středu a tažená strana se přichytí stejně; s [[Shift]] si zachová proporce a nepřichytává se. Platí to na rovné pracovní rovině pro tvary, které stojí rovně a mají strany podél X a Y, a {{ui:workspace.objectSnap}} to vypne spolu s přichytáváním při posunu.

[[Shift]] během tažení omezí posun na osu X nebo Y podle toho, v kterém směru jste táhli více. Druhá souřadnice se zachová. Klávesu stiskněte nejlépe až po zahájení pohybu, protože Shift+klik na nevybraný tvar jej pouze přidá do výběru.

Nebo táhněte za červenou či zelenou šipku nahoře na výběru: posouvá jen ve směru X nebo jen ve směru Y a tvar sleduje myš po této přímce i v pohledu z nízkého úhlu, kde volné tažení uteče daleko. Šipky se přichytávají jako při tažení, [[Alt]] přichytávání vypne a ujetou vzdálenost pak můžete kliknout a zadat přesně.

Přidržíte-li [[Alt]] už před zahájením tažení, přesouváte kopii jako v Tinkercadu. Originál zůstane a kopie dopadne na místo uvolnění. Stisknutí [[Alt]] až během tažení pozastaví přichytávání k objektům, zůstane jen krok mřížky. I kopie se začne přichytávat po uvolnění [[Alt]] během pohybu. Trvale přichytávání vypnete přes {{ui:inspector.objectSnap}} v nabídce mřížky vpravo dole nebo v nastavení. Zatím se týká jen posouvání po běžné pracovní rovině, nikoli zvedání a změny rozměrů.

## Zarovnání

Vyberte nejméně dva tvary a zapněte {{ui:editor.tool.align}} ([[L]] nebo příkaz v místní nabídce). Kolem výběru se objeví body pro levý okraj, střed, pravý okraj, předek, střed, zadek a horní, střední či spodní výšku. Kliknutí přesune tvary na zvolenou úroveň. Pokud nejprve kliknete na jedno vybrané těleso, zůstane pevné a ostatní se zarovnají podle něj. Zamčené těleso se stane pevným základem automaticky. Krajní zarovnání používá ohraničující kvádr, ale střed trojúhelníku, pětiúhelníku nebo hvězdy je vlastním středem tvaru. Otvor tak bude uprostřed tvaru, nikoli jeho obálky.

U šikmo natočeného tvaru, například o 45°, se jinak zarovnává podle obálky, nikoli jeho vlastních hran. Chcete-li použít jeho osy, položte nejprve na jeho plochu pracovní rovinu přes {{ui:camera.placeWorkplane}}. Zarovnávací body pak používají osy této roviny jako v Tinkercadu. Pro návrat k osám podložky pracovní rovinu obnovte.

![Zarovnání zobrazuje cílové polohy jako body kolem výběru.](shot:align)

Zkratka je [[L]], [[Esc]] nástroj ukončí.

### Stejné mezery

Vedle prostředního bodu každé čáry stojí širší bod s čárkou na každé straně. Rozmístí tři nebo více tvarů v tomto směru tak, aby mezera mezi sousedními hranami byla všude stejná, ať je každý tvar jakkoli velký. První a poslední tvar zůstanou na místě, ty mezi nimi se posunou. Řada různě velkých otvorů tak dostane mezi sebou všude stejnou stěnu. Najeďte na bod a předem uvidíte, kam se tvary posunou; stavový řádek pak uvede mezeru.

Je-li mezi vybranými tvary deska, která je v tomto směru delší než všechny ostatní, tvary se rozmístí na ní: mezera k jejím okrajům je stejná jako mezi tvary a jediný tvar přijde doprostřed. Tvary v několika řadách, jako zvířátka vkládací skládačky, se rozmístí řadu po řadě; tvary, jejichž kvádry se překrývají napříč směrem, tvoří jednu řadu. Kde tvary nestojí v čistých sloupcích, jako zvířátka zepředu dozadu, posouvají se tvary stojící vedle sebe místo toho jako celá řada.

Bez desky nejdřív se stisknutým [[Shift]] klikněte na volné místo podložky: podložka je pak pevný tvar, stejné mezery rozmístí tvary po celé podložce se stejnou mezerou k jejím okrajům a ostatní body je zarovnají k jejím okrajům nebo středu. Další klik se [[Shift]] na volnou podložku ji uvolní. Klik do prázdna bez [[Shift]] zarovnání ukončí, stejně jako [[L]] a [[Esc]].

Podržte [[Alt]] a klikněte na bod, chcete-li mezeru zadat sami, třeba 5 mm: tvary se seřadí v této vzdálenosti, od prvního tvaru nebo od toho, na který jste klikli jako první; na desce přijde řada doprostřed. Zamčený tvar zůstane na místě, takže jeden mezi krajními tvary stejným mezerám zabrání. Na tabletu, který nemá klávesu Alt, dělá totéž přepínač {{ui:align.sizeSwitch}} vedle teček: když ho zapnete, tečky zůstanou čtverečky a tečka rozestupu otevře své pole, dokud přepínač nevypnete.

## Zrcadlení

{{ui:editor.tool.mirror}}, [[M]] nebo příkaz v místní nabídce, převrátí výběr podle roviny: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} nebo {{ui:mirror.topBottom}}. Klikněte na odpovídající šipku osy. Pro souměrný díl stačí vytvořit polovinu, zkopírovat ji a kopii zrcadlit.

## Otáčení a střed otáčení

Otáčejte obloukovými šipkami, čísly v nastavení nebo [[R]] po 45°. Tažení po kružnici přichytává po ryskách 22,5°, se [[Shift]] přidá jemnější rysky po 11,25°. Tažení mimo kružnici umožní kroky 1°, se [[Shift]] 45°. Výběr se běžně otáčí kolem svého středu. Pro jiný bod, například konec nakloněné trubky, použijte {{ui:editor.tool.rotationPivot}} a klikněte na plochu. Rovinná plocha poskytne svůj střed, například osu konce trubky. U sloučeného celku nebo skupiny se plocha táhne přes díly, které se stýkají, jako u jednoho tělesa, a střed otáčení se po jejich spojení posune doprostřed celé plochy, kromě sloučeného celku nebo skupiny s textem a skupiny s výřezem. Další použití nástroje vlastní střed zruší.

Úhly se uchovávají s tělesem. {{ui:inspector.rotation}} uvádí {{ui:prop.rotateX}}, {{ui:prop.rotateY}} a {{ui:prop.rotateZ}} podle stejné soustavy jako poloha, s Y po podložce a Z vzhůru. Zadání úhlu otočí těleso kolem středu či vlastního uloženého bodu. Úhly vybraného tělesa jsou vidět i pod ním; vypnete je přes {{ui:workspace.showRotationAngles}}.

![Těleso otočené kolem dvou os. Úhly se zobrazují pod ním a lze je zadat v pravém panelu.](shot:rotation-card)

Při výběru **jednoho tělesa** patří střed otáčení jemu. Zachová se po výběru jiného objektu, pohybuje se, otáčí a škáluje s tělesem, ukládá se a obnovuje přes Zpět. V {{ui:inspector.position}} má vlastní X, Y, Z, které lze zadávat nebo krokovat. {{ui:inspector.pivotRemove}} jej odstraní. Červenou značku lze táhnout po povrchu a přichytávat k rohům, středům hran i hranám, například pro umístění čepu přesně v rohu. U více těles platí bod jen pro aktuální výběr a nový výběr jej zruší. Seskupíš-li je nebo svážeš, zůstane zachován: skupina ho převezme jako vlastní střed otáčení, s X, Y a Z v {{ui:inspector.position}}. Se stisknutým Shiftem se při tažení přichytí ke středu plochy pod ukazatelem - k ose kulaté plochy, středu rovné plochy nebo špičce kužele - a vidí přitom skrz průhledná tělesa.

## Položení na plochu

Vyberte díl, zapněte {{ui:editor.tool.layFlat}} a klikněte na plochu, která má směřovat dolů. Plocha pod ukazatelem se zvýrazňuje; pro kontrolu ostatních stran otočte pohled. Díl se natočí a položí touto plochou na pracovní rovinu.

Pro přiložení dvou dílů vyberte pohyblivý díl, spusťte {{ui:editor.tool.mateFaces}}, klikněte na jeho plochu a pak na plochu druhého. {{ui:mate.mode.against}} přiloží plochy proti sobě, {{ui:mate.mode.flush}} je srovná do jedné roviny. {{ui:mate.gap}} ponechá mezeru, například pro vůli. {{ui:mate.apply}} otočí první díl nejkratší cestou do rovnoběžné orientace a přesune jej pouze kolmo k druhé ploše. Boční poloha se zachová. Pokud jsou plochy rovnoběžné, neotáčí se. Druhý díl zůstane na místě a jediný krok Zpět operaci vrátí.

![Okno zarovnání ploch: volba pohyblivého dílu, plochy druhého, režimu proti sobě nebo do roviny a případné mezery.](shot:mate-faces)

**Díry na jedné ose:** {{ui:mate.mode.concentric}} místo toho zarovná kulaté plochy: díru nad díru, čep do díry, šroub do jeho průchozí díry. Vyberte to dřív, než kliknete na plochy. Pak klikněte na kulatý vnitřek díry (nebo vnější stranu čepu) na dílu, který se pohne, a na kulatou plochu druhého dílu; celá kulatá plocha se pod ukazatelem rozsvítí. {{ui:mate.apply}} otočí díl nejkratší cestou, až jsou obě osy rovnoběžné, a posune ho napříč na druhou osu. Podél osy zůstane, kde byl, takže čep si drží výšku; zasuňte ho potom. Funguje to i u importovaných sítí, pokud je díra tvořena ploškami kolem jedné osy.

**Bod na bod:** {{ui:mate.mode.point}} posune díl rovně, bez otočení, aby jeden z jeho bodů dosedl na bod jiného dílu. Na dílu, který se posouvá, klikněte na roh, místo na hraně, střed kulaté hrany nebo referenční bod, potom na bod, kam se má dostat; tečka ukazuje, který bod ukazatel právě zachytí. V části {{ui:mate.axes}} vypněte osy, podél kterých se posouvat nemá: jen s X a Y skončí bod přesně nad nebo pod druhým, jen se Z ve stejné výšce. Jedno Zpět to vrátí.

**Otočení druhým a třetím párem:** po {{ui:mate.apply}} zůstane panel otevřený pro druhý pár bodů. První bod zůstane, kde dosedl, označený modře, a {{ui:mate.turn}} otočí díl kolem něj, dokud přímka skrz jeho druhý bod neprochází bodem, který jste vybrali na druhém dílu - dvě hrany tak leží na jedné přímce, i když díly nejsou stejně dlouhé. Třetí pár otočí díl kolem přímky skrz oba modré body, dokud jeho třetí bod nesměřuje k vybranému třetímu bodu, takže sedí i plochy - jako zarovnání podle tří bodů v jiných CAD programech. {{ui:mate.done}} to ukončí v kterémkoli kroku; každý krok je jedno Zpět.

**Přesný úhel mezi dvěma plochami:** {{ui:editor.tool.mateFaces}} plochy zarovná rovnoběžně. Samostatný nástroj pro úhel mezi nimi není, ale můžete postupovat takto: nejprve plochy spojte přes {{ui:editor.tool.mateFaces}}, pak nastavte střed otáčení na společnou hranu pomocí {{ui:editor.tool.rotationPivot}} a kliknutí na hranu nebo roh. V kartě {{ui:inspector.rotation}} zadejte požadovaný úhel, například 15° či 30°. Díl se otočí kolem tohoto středu. Osy karty odpovídají osám podložky, takže postup funguje pro hranu ve směru X, Y nebo Z.

{{ui:editor.tool.dropToWorkplane}} ([[D]]) jednoduše položí výběr na pracovní rovinu, {{ui:editor.tool.centerOnWorkplane}} jej vystředí.

[[Alt]]+[[D]] položí více dílů jako jeden celek: všechny klesnou o stejnou vzdálenost, takže si zachovají výšky vůči sobě, kdežto [[D]] položí každý díl zvlášť.

[[C]] výběr zvedne, jako Cruise v Tinkercadu: sleduje ukazatel myši a lehne si na plochu jiného tělesa, nad kterou jste, i na šikmou. Kliknutí ho tam položí, [[Esc]] ho nechá, kde byl. Jeho spodek pak leží na ploše, zarovnaný s okraji plochy jako nový tvar; vlastní natočení kolem svislé osy si ponechá. Více dílů putuje spolu a zachová si rozestupy. Nad prázdnou podložkou [[C]] postaví nakloněný díl zpět svisle na pracovní rovinu. Podržíte-li při přenášení [[Shift]], díl se místo toho zanoří do plochy: zůstane svislý, jeho vršek zarovnaný s plochou a těleso pod ní, takto se do tělesa dostane kuželové nebo válcové zahloubení; nový tvar z knihovny se se [[Shift]] umístí stejně. [[Shift]]+[[D]] položí výběr na pracovní rovinu vrškem místo spodkem. Bez klávesnice má nabídka dlouhého podržení pro totéž {{ui:contextMenu.carry}}.

[[C]] zvedne výběr k ukazateli podobně jako Cruise v Tinkercadu. Kopíruje orientaci plochy pod ním, i šikmé. Kliknutí potvrdí umístění, [[Esc]] obnoví původní. Spodek dosedne na plochu, osy se srovnají s jejími hranami a vlastní natočení kolem svislé osy se zachová. Více dílů cestuje společně bez změny rozestupů. Nad prázdnou podložkou se nakloněný díl opět postaví kolmo na pracovní rovinu.

## Opakování v řadě a po kružnici

{{ui:editor.tool.array}} vytváří řady otvorů, roztečné kružnice šroubů a věnce zubů. Vyberte opakované tvary a spusťte nástroj.

![Opakování po kružnici nejprve zobrazuje náhled kopií.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** stejné rozestupy podél X, Y a Z přes {{ui:array.spacingX}}, {{ui:array.spacingY}} a {{ui:array.spacingZ}}. Jedna nenulová osa tvoří přímou řadu, více os šikmou řadu nebo schodiště. Záporný rozestup obrátí směr.
- **{{ui:array.fit}}:** Pro díry podél desky, věšák na klíče nebo na oblečení. Polož první kus na těleso nebo do něj, zvol {{ui:array.fit.x}} nebo {{ui:array.fit.y}} a nastav {{ui:array.fitGap}}: originál se posune o tolik dovnitř od bližšího konce (od okraje k boku kusu) a poslední kopie si drží stejnou mezeru ke vzdálenému konci. Rozestup se pak řídí hodnotou {{ui:array.count}}: pět děr nebo devět, vždy desku vyplní rovnoměrně.
- **{{ui:array.mode.grid}}:** pro otvory děrované desky nebo pole stejných dílů. {{ui:array.columns}} a {{ui:array.spacingX}} kladou sloupce vedle sebe, {{ui:array.rows}} a {{ui:array.spacingY}} řady zepředu dozadu. Jeden sloupec nebo jedna řada dá jedinou linii. Mřížka má nejvýše 100 dílů; nad tím se řady zkrátí a okno to oznámí.
- **{{ui:array.mode.circle}}:** rozmístění kolem středu s počtem {{ui:array.count}} a úhlem {{ui:array.angle}}, pro celý obvod 360°. Můžete zapnout společné natáčení kopií. {{ui:array.rise}} zvedá každou další kopii pro šroubovici, {{ui:array.radiusChange}} mění poloměr pro rovinnou spirálu. Kombinací vznikne kuželová spirála. Spirála udělá nejvýš jeden závit: úhel nad 360° se počítá jako celý kruh a kopií je nejvýš 100.

Tip: nastavte nejprve {{ui:editor.tool.rotationPivot}} na plochu. Střed kružnice pak bude přesně tam.

Díly si pak ponechají střed kruhu jako svůj otočný bod, i po sloučení. Tam patří jiný díl, například koule uprostřed tří nohou: střed ohraničení dílů není střed kruhu, protože tři nohy vyplní ohraničení, které je jedním směrem širší než druhým. Klikněte na díly pravým tlačítkem a zvolte {{ui:contextMenu.markPivot}} a střed dílu, který táhnete, se k němu přichytí.

![Kruhové opakování se stoupáním a změnou poloměru vytváří rozšiřující se prostorovou spirálu.](shot:pattern-spiral)

Kopie jsou nejprve pouze náhled. Vytvoří je až {{ui:array.apply}}. Výřezy poté slučte s tělesem, do kterého mají řezat.

Se zaškrtnutým {{ui:array.groupCopies}} sloučí {{ui:array.apply}} originál a všechny kopie ve stejném kroku do jednoho objektu, jako by to udělalo {{ui:editor.tool.group}}: kruh z 36 dílů je pak jeden díl, který můžete posunout, obarvit nebo jím řezat. Nad 5 dílů se políčko zaškrtne samo; jakmile ho sami zaškrtnete nebo zrušíte, zůstane, jak jste ho nastavili. {{ui:editor.tool.ungroup}} díly vrátí. Pokud sloučení nevyjde, vzor přesto vznikne jako samostatné díly a zpráva řekne proč.

## Rastr otvorů na ploše

{{ui:holePattern.title}} rozmístí otvory po rovinné ploše krytu, mřížky reproduktoru, košíku nebo ventilace. Nemusíte vytvářet a opakovat jednotlivý výřez. Vyberte právě jedno těleso a spusťte {{ui:holePattern.title}} v {{ui:editor.section.mirrorPattern}} vedle opakování, pravým tlačítkem nebo vyhledáváním [[Ctrl]]+[[K]].

1. Klikněte na rovinnou plochu. Použije se celá souvislá rovinná oblast, nikoli jen trojúhelník pod ukazatelem. Funguje i kulatá stěna válce, trubky nebo díry, viz níže; jiná oblá plocha podporovaná není a nástroj vás vyzve k jinému výběru. U sloučeného celku nebo skupiny se plocha táhne přes díly, které se stýkají, jako u jednoho tělesa, u skupiny ale jen tehdy, když mezi díly není výřez. Díly se spojí krátce po otevření nástroje; do té doby se pod ukazatelem rozsvítí jen plocha jednoho dílu a kliknutí počká, až se díly spojí. U sloučeného celku nebo skupiny s textem se rozsvítí jen plocha jednoho dílu a díly spojí až kliknutí.
2. V okně nastavte, jak otvory vypadají a jak leží:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} nebo {{ui:holePattern.form.slot}}.
   - **Rozměry:** {{ui:holePattern.size.diameter}} kruhu, {{ui:holePattern.size.side}} čtverce, {{ui:holePattern.size.width}} a {{ui:holePattern.size.height}} obdélníku či podlouhlého otvoru. Šestiúhelník používá {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.holeAngle}}:** jen pro obdélníkové a podlouhlé otvory: otočí každý otvor v ploše o tolik stupňů, proti směru hodinových ručiček při pohledu na plochu, od -90 do 90. Řady zůstávají rovné; pokud by se otočené otvory přiblížily příliš, i šikmo, layerling zvětší rozteč i rozteč řad, aby mezi nimi zůstala stěna.
   - **{{ui:holePattern.holeTilt}}:** jen na rovných plochách, ne se zahloubením, kuželovým zahloubením ani vlastním tvarem: nakloní každý otvor skrz stěnu, od -60 do 60 stupňů. Na stojící stěně je při kladném sklonu vnitřní konec výš, takže déšť vyteče zpět ven. Velikost zůstává velikostí samotného otvoru, na ploše proto vypadá o něco delší; oba konce každého otvoru dodrží okraj. Výhled dovnitř sklon zakryje, jen když tloušťka stěny krát sin(úhel) je aspoň výška otvoru, na to tedy použijte nízké podlouhlé otvory nebo silnější stěnu.
   - **{{ui:holePattern.form.custom}}:** místo otvoru opakuje tvar ze scény: nýt, výstupek nebo žebro slzičkového plechu. Vyberete ho v {{ui:holePattern.customShape}}. Jeho šířka a hloubka určují místo, které zabere; stojí na ploše svisle, jak byl vytvořen, bez vlastního natočení. Těleso se postaví na plochu a spojí se s ní, díra se vyřízne tak hluboko, jak je vysoká. Samotný tvar zůstane na svém místě.
   - **{{ui:holePattern.holeType}}:** jen u kulatých otvorů. {{ui:holePattern.holeType.plain}} je rovný otvor, {{ui:shape.counterbore}} přidá zahloubení pro hlavu šroubu s válcovou hlavou, {{ui:shape.countersink}} kužel 90° pro zápustný šroub. Velikost je pak {{ui:prop.screwHoleShaft}}; {{ui:prop.screwHoleHead}} a u válcového zahloubení {{ui:prop.screwHoleHeadDepth}} nastaví hlavu. {{ui:prop.screwHoleSize}} vše vyplní pro metrický šroub. U zahloubení nabízí také palcové velikosti #2 až #14, jejichž kužel má 82°.
   - **{{ui:holePattern.spacing}}:** vzdálenost středů sousedních otvorů. Je-li menší, než otvory dovolí, zvýší ji layerling na nejmenší možnou hodnotu, aby mezi otvory zůstala stěna. U obdélníků a podlouhlých otvorů se počítá podél řady, zleva doprava.
   - **{{ui:holePattern.rowSpacing}}:** jen u obdélníků a podlouhlých otvorů: vzdálenost od jedné řady k další. Úzké vysoké otvory tak stojí těsně vedle sebe, zatímco řady zůstanou od sebe. Otvor široký 2 mm a vysoký 14 mm potřebuje se stěnou 2 mm 4 mm podél řady a 16 mm od řady k řadě.
   - **{{ui:holePattern.wall}}:** stejný odstup vyjádřený jinak: stěna, která zůstane mezi dvěma sousedními otvory, tedy tloušťka stěny v tisku. Nastavíte-li ji, rozteč středů se přizpůsobí (u obdélníků a podlouhlých otvorů i rozteč řad), a naopak. U šestiúhelníků, obdélníků a podlouhlých otvorů měří layerling nejmenší vzdálenost mezi jejich hranami.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} tvoří řádky a sloupce, {{ui:holePattern.arrangement.staggered}} posune každý druhý řádek o polovinu rozteče a přiblíží řádky tak, aby měly otvory stejně vzdálené sousedy. U šestiúhelníků vznikne voština.
   - **{{ui:holePattern.arrangement.perimeter}}:** místo toho věnec otvorů podél vnějšího okraje plochy, o {{ui:holePattern.margin}} dovnitř od něj - otvory pro šrouby kolem víka nebo desky. {{ui:holePattern.perimeterBy}} {{ui:holePattern.perimeterBy.spacing}} drží přibližně rozestup, {{ui:holePattern.perimeterBy.count}} určí {{ui:holePattern.perimeterCount}}; v obou případech se rozestup vyrovná, aby se věnec uzavřel bez mezery. {{ui:holePattern.perimeterCorners}} (zpočátku zapnuto) dá otvor do každého rohu a každou stranu mezi nimi rozdělí rovnoměrně. Na kulaté ploše nebo bez zaškrtnutí jdou otvory rovnoměrně dokola od vrchu a {{ui:holePattern.perimeterStart}} posune celý věnec podél okraje.
   - **{{ui:holePattern.margin}}:** volná vzdálenost mezi otvory a okrajem plochy. Vzniknou jen otvory, které leží celé uvnitř plochy zmenšené o tento okraj; co by sahalo dál, se vynechá. Okraj platí i kolem otvorů v ploše.
   - **{{ui:holePattern.depth}}:** výchozí {{ui:holePattern.depth.through}} protne celou stěnu. S {{ui:holePattern.depth.custom}} zadáte hloubku v milimetrech, třeba pro zahloubení.
3. Náhled se průběžně mění a okno uvádí počet otvorů. {{ui:holePattern.repick}} zvolí jinou plochu a [[Esc]] nástroj zavře. Okno lze přesouvat za záhlaví.
4. Skutečné otvory vytvoří až {{ui:holePattern.apply}}.

Výřezy zůstávají běžnými tvary sloučenými s tělesem jako po {{ui:editor.tool.group}}. {{ui:editor.tool.ungroup}} je uvolní pro samostatný posun, změnu nebo smazání. Vše je jediný krok {{ui:editor.tool.undo}}. Najednou lze vytvořit nejvýše 400 otvorů; při překročení zvětšete otvory nebo rozteč.

Otvory přijme i kulatá stěna válce, trubky nebo díry: stojánek na tužky, stínidlo lampy, trubka s větráním. Klikněte místo rovné plochy na stěnu; pod ukazatelem se rozsvítí celá stěna. Každý otvor pak míří přímo k ose a řady obíhají stěnu. Na stěně, která jde dokola, má každá řada celý počet otvorů, vyrovnaný tak, aby se kruh uzavřel bez mezery a otvory nebyly blíž než rozteč; okno ukáže, kolik jich obíhá a jak daleko od sebe. Okraj platí k hornímu a dolnímu lemu a k otvorům ve stěně, na části stěny (třeba zaoblení) i k jejím bokům. {{ui:holePattern.depth.throughWall}} prořízne jen stěnu, na kterou jste klikli, a druhou stranu trubky nechá celou; u plného válce jdou otvory až do jeho středu. Kliknete-li dovnitř díry, otvory vedou ven skrz její stěnu. {{ui:holePattern.arrangement.perimeter}} je pro rovné plochy a na stěně se nenabízí.

AI může provést totéž přes `layerling_perforate_face`, viz [Modelování s AI](chapter:ai-with-mcp).

## Vysunutí plochy ven nebo dovnitř

Pro zesílení stěny, vyvýšenou plošku nebo vyříznutou kapsu pracuje nástroj {{ui:faceTool.title}} s jednou rovinnou plochou. Funguje i u importovaného STL, které nemá náčrt ke změně. Vyberte právě jedno těleso a spusťte {{ui:faceTool.title}} v {{ui:editor.section.mirrorPattern}} vedle rastru otvorů, pravým tlačítkem nebo vyhledáváním [[Ctrl]]+[[K]].

1. Klikněte na rovinnou plochu tělesa. Stejně jako u rastru otvorů se použije celá souvislá rovinná oblast; oblá plocha tu podporovaná není, ani kulatá stěna. U sloučeného celku nebo skupiny se plocha jako u rastru otvorů táhne přes díly, které se stýkají.
2. V okně:
   - **{{ui:faceTool.direction}}:** {{ui:faceTool.direction.out}} pro materiál na ploše, nebo {{ui:faceTool.direction.in}} pro kapsu vyříznutou do ní. Kapsa nejde hlouběji než těleso za plochou; u dutého tělesa může přesto dosáhnout do dutiny.
   - **{{ui:faceTool.inset}}:** jak daleko zůstane nový obrys uvnitř okraje plochy. Směrem ven se při 0 vezme celá plocha, tak se stěna zesílí. Otvory v ploše se zvětší o stejnou hodnotu.
   - **{{ui:faceTool.radius}}:** zaoblí každý roh obrysu, i vnitřní, takže ostrý hrot skončí obloukem. Zářez užší než dvojnásobek poloměru se uzavře a část plochy užší než dvojnásobek odsazení a poloměru dohromady odpadne.
   - **{{ui:faceTool.depth}}:** jak daleko nový díl vystoupí z plochy, nebo jak hluboká bude kapsa.
   - **{{ui:faceTool.separate}}:** se zapnutým přepínačem je nový díl (nebo výřez kapsy) samostatným tělesem vedle tělesa místo sloučení s ním, takže ho můžete hned zvětšit, posunout nebo jím řezat.
3. Výsledek se hned zobrazí jako náhled a sleduje každou hodnotu. {{ui:faceTool.repick}} vybere jinou plochu, [[Esc]] nástroj zavře.
4. Teprve {{ui:faceTool.apply}} díl vytvoří.

Nástroj přidá běžné těleso z náčrtu, sloučené s tělesem, pokud není zapnuto {{ui:faceTool.separate}} (pak {{ui:group.edit}} nemá co otevřít a díl je volný); nic se nezapéká. {{ui:group.edit}} otevře sloučení a {{ui:inspector.editSketch}} u nového dílu ukáže obrys, ze kterého vychází. Na horní nebo spodní ploše jednoduchého tělesa z náčrtu - jedna oblast, nesloučené, nezrcadlené, bez zúžení, zkroucení a naklonění, bez obrysového pásu, kroužku na klíče, zkosení či zaoblení - je to vlastní obrys tělesa, při stavbě odsazený dovnitř, takže jeho čáry a oblouky zůstanou přesné všude, kde je CAD jádro dokáže odsadit, pro nástroje hran a export STEP. Při pozdější změně velikosti si díl odsazení ponechá. Na každé jiné ploše, i u importované sítě, sleduje obrys trojúhelníky plochy a křivka se skládá z krátkých rovných úseků. Vše je jediný krok {{ui:editor.tool.undo}}. Odsazení nebo poloměr později změníte tak, že krok vrátíte zpět a nástroj použijete znovu. Horní hranu potom zaoblíte nástrojem {{ui:editor.tool.fillet}} s volbou {{ui:edge.topEdges}} na sloučení jako posledním krokem: jako každá úprava hran sloučení z něj udělá jedno těleso.

AI může provést totéž přes `layerling_push_face`, viz [Modelování s AI](chapter:ai-with-mcp).

## Současná změna více dílů

Při více vybraných dílech ukazuje pravý panel jejich počet a společné vlastnosti: {{ui:inspector.solid}}, {{ui:inspector.hole}}, barvu po kliknutí na {{ui:inspector.solid}} a zámek. Smíšený výběr lze jedním kliknutím převést na všechna plná tělesa či výřezy. Obsahuje-li zamčený díl, dostupný zůstane jen zámek. Rozměry měníte úchyty, přes {{ui:scalePercent.title}} nebo číslem u kóty. Kóta označuje celý výběr a mění všechny části i mezery jako tažení úchytu. Plné těleso a výřez přepíná i pravá nabídka nebo [[S]] a [[H]].

## Změna velikosti o procenta

Pro stejné zvětšení či zmenšení jednoho nebo více dílů použijte {{ui:scalePercent.title}} v pravé nabídce nebo přes [[Ctrl]]+[[K]].

{{ui:scalePercent.percent}} zadává novou velikost v procentech původní. 120 % znamená zvětšení o pětinu, 50 % poloviční velikost. Všechny tři rozměry se mění stejně a zachovají proporce. Spodek zůstává na místě, takže se díl nezanoří do podložky.

Pro modelářství zvolte nahoře {{ui:scalePercent.by.scale}} místo {{ui:scalePercent.by.percent}}. {{ui:scalePercent.scalePresets}} nabízí obvyklé velikosti od Z (1:220) po G (1:22,5) a do {{ui:scalePercent.ratio}} zadáte jakékoli jiné měřítko, třeba 35 pro 1:35. Je-li model postavený ve skutečné velikosti předlohy, nechte {{ui:scalePercent.original.fullSize}}: 1:87 ho zmenší 87krát. Pokud jste ho postavili v libovolné velikosti, zvolte {{ui:scalePercent.original.realSize}}, pak {{ui:scalePercent.axis.height}} nebo {{ui:scalePercent.axis.length}} (nejdelší strana na desce) a do {{ui:scalePercent.realSize}} zadejte, jak velká je předloha doopravdy, v metrech (při palcových jednotkách ve stopách). Strom, který je ve skutečnosti 16 m vysoký, bude v H0 vysoký 16 000 mm / 87 = 184 mm, ať byl předtím jakkoli velký. Nová velikost se ukáže pod poli dřív, než stisknete {{ui:scalePercent.apply}}. Měřítko zůstane nastavené, dokud je editor otevřený.

Pro více dílů zvolte:

- **{{ui:scalePercent.mode.together}}:** růst kolem společného středu včetně mezer, jako jeden celek.
- **{{ui:scalePercent.mode.each}}:** každý díl roste na svém místě a rozestupy mezi středy zůstávají stejné.

Změnu provede až {{ui:scalePercent.apply}} a jediný krok Zpět ji vrátí. Se zamčeným dílem ve výběru nástroj nelze otevřít.

## Zpět a znovu

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) a {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] nebo [[Ctrl]]+[[Y]]) procházejí historii. Počet kroků ukládaných s projektem určuje {{ui:workspace.history}}. Když najedete na jedno z obou tlačítek, jeho popisek pojmenuje krok, který vrátí nebo zopakuje, a u kroku s rozměrem i ten rozměr, například „Zaobleny hrany: Box (5 mm)“; hlášení po kroku říká totéž. Chcete-li se vrátit o více kroků najednou, použijte zobrazení historie níže. Zpráva, která hlásí právě provedený krok, třeba „Smazány 3 tvary“, má tlačítko Zpět, které vrátí právě tento krok.

## Prohlížení historie

{{ui:editor.tool.history}} vedle Zpět a Znovu umožní prohlížet starší stavy bez změny projektu. Pracovní plocha ukazuje minulou podobu a spodní posuvník prochází kroky. Současný stav je vpravo, předchozí vlevo; již vrácené kroky leží napravo od současného. Šipky procházejí stavy a [[Esc]] vrátí současnost. Kolečko myši nad posuvníkem dělá totéž, jeden stav na zoubek, nahoru ke staršímu; [[Page Up]] a [[Page Down]] skáčou o deset stavů, [[Home]] jde na nejstarší stav a [[End]] zpět na aktuální. Pohled můžete otáčet a přibližovat a klepnutím vybírat objekty k vrácení (viz níže), ale nic nelze měnit. Lištu lze přetáhnout za záhlaví a dvojklikem vrátit. Tlačítko se seznamem v záhlaví ukáže všechny kroky podle názvu v seznamu, nejnovější nahoře: kliknutí na krok přejde do tohoto stavu, stav, ve kterém návrh je, je označen {{ui:historyView.listNow}}, a vrácené kroky jsou šedé. Necháte-li seznam otevřený, bude otevřený i příště. Dvě tlačítka přehrávání pod posuvníkem přehrají historii jako film: to, které míří doprava, hraje dopředu od zobrazeného stavu, to, které míří doleva, dozadu, každý stav na okamžik, až do konce; nové stisknutí téhož tlačítka pozastaví a posuvník, kolečko, klávesy nebo seznam převezmou řízení. Spuštěné na konci své cesty začne znovu z druhého konce. {{ui:historyView.speed}} určuje, jak dlouho každý stav zůstane (pomalu, normálně nebo rychle), a pamatuje si to na příště. Nahrajte při přehrávání obrazovku a ukážete, jak díl vznikal.

Ze staršího stavu můžete vytvořit {{ui:historyView.createProject}}. Nový projekt má původní název doplněný časem stavu; u starých dat bez času označení kopie. Obsahuje historii až do daného okamžiku, takže Zpět nadále funguje. {{ui:historyView.export}} otevře běžný export tohoto stavu jako STL, 3MF, STEP, obrázek nebo LYL včetně příslušné historie.

Do návrhu můžete vrátit i jednotlivé objekty. Klikněte na objekt v zobrazeném stavu - [[Shift]]+klik přidá další nebo jeden odebere, klik do prázdna nevybere nic - a zvolte {{ui:historyView.bringBack}}. Pohled se zavře a kopie každého objektu přibude do současného návrhu přesně tak, jak byl v tomto stavu, a na místě, kde tehdy stál, vybraná, vedle všeho, co návrh obsahuje teď; nic jiného se nemění. Je to jeden krok, Zpět ho vrátí. Hodí se pro starší verzi dílu, který jste mezitím změnili nebo smazali. Skupina se vrátí celá; poznámky a referenční body objektu zůstanou. Jeho název nese čas daného stavu, například „Kvádr (12:32)“, aby se snadno odlišil od současné verze. Chcete-li vrátit díl ze skupiny, vyberte skupinu a zvolte {{ui:historyView.openGroup}} nebo stiskněte [[E]], stejně jako v návrhu: její díly se rozloží tam, kam by je dala úprava skupiny, připravené k výběru, a lišta ukáže, ve které skupině jste. {{ui:historyView.backOut}} ji znovu zavře. Slouží jen k prohlížení - skupina, návrh i historie zůstanou beze změny.

{{ui:historyView.delete}} vlevo dole po potvrzení trvale vymaže všechny minulé kroky. Zachová skutečný současný stav, nikoli právě prohlížený. Zpět už nemá kam přejít a později uložený soubor neobsahuje historii. Použijte pro nový začátek historie nebo sdílení bez minulosti. Nelze vrátit. Chcete-li sdílet soubor bez zásahu do vlastního projektu, zvolte při exportu {{ui:export.historyNone}}.
