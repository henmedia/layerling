---
title: "Náčrty: od obrysu k tělesu"
summary: Nakreslete rovinný obrys, zaoblete či zkoste jeho rohy a vytvořte těleso vysunutím nebo rotací.
---

Ne každý díl lze pohodlně sestavit ze základních tvarů. Pro držák, profil zubu nebo vázu s vlastním tvarem nejprve nakreslete **obrys** a z něj vytvořte těleso. K tomu slouží režim náčrtu.

## Zahájení náčrtu

Nahoře přepněte z {{ui:editor.modeGeometry}} na {{ui:editor.modeSketch}}. Ve skupině {{ui:sketch.group.create}} na pásu nástrojů jsou vedle sebe tři tlačítka pro výsledné těleso:

- **{{ui:sketch.extrude}}:** vysune obrys vzhůru, například jako vykrajovátko.
- **{{ui:sketch.revolve}}:** otočí profil kolem osy jako na soustruhu. Vznikají tak vázy, nádoby, kužely a další rotační díly.
- **{{ui:sketch.sweep}}:** protáhne obrys podél dráhy: kabelový žlab se zatáčkou, potrubí, prstenec kolem tvaru. Viz níže Protažení podél dráhy.

Zobrazí se kreslicí list s mřížkou.

## Kreslení

Pás nástrojů má tyto části:

- **Kreslení:** {{ui:sketch.line}} vytváří úsečky klikáním na další body. [[Shift]] přichytává směr po 15° včetně vodorovného a svislého. U ukazatele vidíte délku a úhel; lze je také zadat, viz [Číselné zadání úseček](#ciselne-zadani-usecek). {{ui:sketch.bezier}} se tvaruje úchyty: bod položte kliknutím a tažením určete další směr jako perem v Illustratoru či Inkscapu. Delší tažení znamená větší prohnutí, které se průběžně zobrazuje. Chcete-li jen klikat na body jako v Tinkercadu, použijte {{ui:sketch.smooth}} pro plynulou křivku procházející zadanými body. Obrys uzavřete posledním kliknutím na první bod. Řadu bodů ukončíte bez uzavření obrysu pravým kliknutím bez pohybu myši nebo dvojklikem na poslední bod.
- **Tvary:** {{ui:sketch.addShape}} nabízí {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} jako kotouč s otvory, {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, {{ui:sketch.polygon}} a {{ui:sketch.star}}. Kliknutí je vloží do počátku náčrtu, přetažení na zvolené místo. Dole {{ui:sketch.polygonSides}} nastaví počet stran mnohoúhelníku i cípů hvězdy. {{ui:sketch.starInner}} nastaví hloubku mezer hvězdy v rozsahu 10 až 90 % vnějšího poloměru. Obě volby platí pro další vložený tvar. Pak už jde o běžné body, které můžete posouvat, zaoblovat a zkosovat.
- **Překryvy:** dva překrývající se uzavřené obrysy zůstávají dvěma tělesy, která se spojí až ve 3D editoru. Překryv sám nevytváří otvor. Ten vzniká obrysem ležícím celý uvnitř jiného. Posouvání nespojuje křížící se čáry, takže tvary lze znovu oddělit. Při kreslení nové čáry přes existující se však v průsečících vytvoří body.
- **Výběr:** {{ui:sketch.select}} přesouvá body a čáry. Kliknutí dovnitř uzavřeného obrysu vybere celý tvar, uvnitř otvoru vybere otvor. Rámeček má osm úchytů. Rohy mění oba rozměry a se [[Shift]] zachovávají poměr, boční úchyty jen jeden rozměr. {{ui:sketch.lockOutline}} (nebo [[Ctrl]]+[[L]]) zamkne vybraný obrys jako zamčené těleso ve 3D editoru: už ho nelze posunout ani změnit, jeho čáry zblednou, body zešednou a úchyty rámečku zešednou a nereagují. Dokud je vybraný, odemkne ho klik na zámek v jeho rohu. Zahnuté šipky u rohů rámečku otáčejí celý výběr kolem středu, úhel se zobrazuje nad ukazatelem a se [[Shift]] přichytává po 15°. Při otáčení se objeví kruh: s ukazatelem uvnitř se otočení přichytává po 22,5°, venku jde po celých stupních, bez ohledu na mřížku. [[R]] otáčí uzavřený obrys po 45°. Kliknutím na rozměr zadáte číslo, výraz jako „60+12.5“ nebo procenta „150%“. [[Shift]]+klik přidává a odebírá body či čáry. Tažení rámečku na prázdné ploše vybere vše uvnitř. Čáru lze táhnout za oba konce, případně společně s celým výběrem. Šipky posouvají po kroku mřížky, se [[Shift]] po větším kroku. [[Shift]] při tažení omezuje směr na jednu osu. {{ui:sketch.refine}} přidá bod kliknutím na úsek a odstraní kliknutím na bod. Dále jsou dostupné {{ui:sketch.erase}} (klik na bod nebo úsečku ho odstraní, okno přetažené přes více prvků odstraní vše uvnitř a s výběrem tlačítko výběr smaže) a podkladový obrázek {{ui:sketch.addImage}}.
- **Schránka:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} a {{ui:editor.tool.delete}} pracují s vybranými body, čarami a obrázky jako ve 3D. [[Ctrl]]+[[X]] vyjme výběr. Kopie se vloží na volné místo vedle originálu s mezerou 10 mm a bez dotyku s existujícími čarami, aby se automaticky nespojila. Zůstává vybraná pro okamžitý přesun.
- **Historie:** {{ui:sketch.undo}} a {{ui:sketch.redo}}.
- **Správa:** {{ui:editor.tool.note}} (nebo [[N]]) vloží do náčrtu poznámku jako ve 3D editoru: další kliknutí ji umístí, kamkoli, i na čáru. Tažením za špendlík ji přesunete, kliknutím na špendlík kartu sbalíte. Poznámky náčrtu patří k jeho tělesu: ve 3D zobrazení sedí nahoře na tělese vytvořeném přes {{ui:sketch.extrude}} nebo {{ui:sketch.sweep}} a na nakresleném profilu tělesa vytvořeného přes {{ui:sketch.revolve}} a pohybují se s ním. Po novém otevření náčrtu se zobrazí všechny poznámky tělesa, i ty vložené ve 3D. {{ui:sketch.undo}} vezme poznámku zpět stejně jako čáru a {{ui:sketch.cancel}} zahodí změny poznámek. Více v kapitole Měření a poznámky.
- **Pohled:** posun prostředním tlačítkem nebo pravým s [[Shift]] či [[Ctrl]]. Když není nic vybráno, posouvá pohled i [[Ctrl]] se šipkami: o desetinu obrazu na stisknutí, se [[Shift]] navíc o polovinu; náčrt se posouvá ve směru šipky. [[Home]] zobrazí celý náčrt, [[F]] výběr (bez výběru celý náčrt), [[+]] a [[−]] mění přiblížení. Bez výběru posune dvojklik na prázdné místo zobrazení tak, aby se to místo dostalo doprostřed, jako v 3D editoru; {{ui:workspace.doubleClickCentersView}} v nastavení to vypíná. {{ui:camera.tapeTools}} měří mezi dvěma body. Po výběru čáry se zobrazí její délka, u bodu délky navazujících čar. {{ui:sketch.showMeasurements}} v boční liště kóty skryje či zobrazí; samostatné měření zůstává funkční. Délku přímé čáry změníte kliknutím na údaj a zadáním mm. [[Enter]] potvrdí, [[Esc]] zruší. Směr i počátek se zachovají, čáry připojené na druhém konci se přizpůsobí. Je-li vybrán koncový bod, pohybuje se právě on. [[Alt]]+[[Enter]] mění délku souměrně kolem středu. U křivek údaj pouze zobrazuje délku.

Těleso vzniká pouze z **uzavřeného** obrysu.

![Obrys tvaru L. U vybraného levého horního rohu jsou délky obou úseček v mm a jejich úhel ve stupních.](shot:sketch-outline)

Klávesy [[1]] až [[4]] vybírají kreslicí nástroje v pořadí lišty: {{ui:sketch.line}}, {{ui:sketch.bezier}}, {{ui:sketch.smooth}} a {{ui:sketch.refine}}. Fungují, dokud se nekreslí úsečka; během úsečky jsou číslice její délka (viz níže).

## Číselné zadání úseček

Po prvním bodu nástroje {{ui:sketch.line}} nebo {{ui:sketch.smooth}} začněte psát číslo. Otevřou se {{ui:sketch.typedLength}} v mm a {{ui:sketch.typedAngle}} ve stupních. [[<]] nebo [[Tab]] přepne na úhel. Zápis „50<30“ vytvoří úsečku délky 50 mm pod úhlem 30° jako v AutoCADu. [[Enter]] položí bod a můžete zadávat další úsek. [[Esc]] zavře pole, ale neukončí kreslení řetězce.

Úhel se měří proti směru hodinových ručiček od pravé strany: 0° doprava, 90° nahoru, 180° doleva a 270° dolů. Prázdný úhel ponechá směr podle ukazatele, takže určíte jen délku. Obě pole přijímají výrazy jako „40+12.5“. Pokud by bod skončil mimo list, pole upozorní a čeká na jinou hodnotu.

## Prohnutí přímé strany

Vyberte úsečku a v zobrazené liště zvolte {{ui:sketch.curveLine}}. Změní se na křivku se dvěma úchyty. Jejich tažením řídíte prohnutí; vzdálenější úchyt ohýbá více. {{ui:sketch.straightenLine}} obnoví přímku. Vybraný bod lze převést na plynulý pomocí {{ui:sketch.smooth}}; dostane úchyty a okolní úseky se stanou křivkami. Když vyberete tři nebo více bodů, {{ui:sketch.curveThroughPoints}} v liště proloží jednu plynulou křivku od prvního z nich k poslednímu, přes všechny body mezi nimi, stejně jako ji kreslí nástroj {{ui:sketch.smooth}}; úseky za oběma konci zůstanou beze změny. V jiných programech se tato funkce jmenuje „Fit curve“ nebo „Fit point spline“. Rozdíl: {{ui:sketch.curveLine}} ohne každou vybranou úsečku zvlášť a rohy mezi nimi ponechá, hodí se tedy na oblouk na jedné straně; {{ui:sketch.curveThroughPoints}} vede body jednu křivku bez rohů, hodí se tedy k vyhlazení zubatého obkresleného okraje. Klikněte na úchyt a rozsvítí se: šipky ho pak posunou o krok mřížky, se [[Shift]] o větší krok, takže křivku nastavíte přesně.

![Spodní strana obrysu L je prohnutá a má úchyty u obou konců.](shot:sketch-curve)

## Zobrazení a zadávání úhlů

U bodu spojujícího **dvě úsečky** se vedle délek zobrazuje **úhel** s malým obloukem. Na uzavřeném obrysu jde o vnitřní úhel, proto může být v prohlubni větší než 180°. Kliknutím zadáte nový. Jedna úsečka se otočí kolem rohu se zachováním délky, druhá zůstane. Pohyblivá se kreslí čárkovaně; [[Tab]] je prohodí, [[Enter]] potvrdí a [[Esc]] zruší. Geometrie připojená na vzdáleném konci se posune spolu s ním.

Posun bodu mění úhel v něm i ve dvou sousedních rozích. Zobrazují se proto všechny tři a každý lze zadat. Můžete například nastavit levý spodní roh na 75,5°, i když vybíráte levý horní bod, který se tím posune. Fungují i výpočty, například „90-14.5“.

Úhel se nezobrazuje, když do rohu vstupuje křivka nebo více než dvě čáry. {{ui:sketch.showMeasurements}} jej skryje spolu s délkami.

## Zaoblení a zkosení rohů

Vyberte rohový bod a {{ui:sketch.filletCorner}} nebo {{ui:sketch.chamferCorner}}. Zadejte {{ui:sketch.filletRadius}} či {{ui:sketch.chamferDistance}} a potvrďte zaškrtnutím. Funguje pro rohy mezi dvěma úsečkami.

Více rohů vyberte pomocí [[Shift]]+klik nebo rámečkem a zvolte {{ui:sketch.filletCorner}} či {{ui:sketch.chamferCorner}} v liště. Všechny dostanou stejnou hodnotu. Sdílejí-li dva vybrané rohy stranu, každý použije nejvýše 45 % její délky, aby například celý obdélník měl stejná zaoblení. Nevhodné body se vynechají a hlášení uvede jejich počet. Výběr celého tvaru rámečkem nebo kliknutím dovnitř zahrne body i čáry; vedle úprav rohů pak lišta nabízí {{ui:sketch.curveLine}} a {{ui:sketch.straightenLine}} pro všechny vybrané čáry.

![Levý horní roh zaoblený poloměrem 12 mm.](shot:sketch-fillet)

## Zrcadlení

Vyberte body a čáry (kliknutím, [[Shift]] a kliknutím nebo rámečkem kolem nich) a v liště klikněte na {{ui:sketch.mirror}}. Pak zvolte osu: {{ui:sketch.mirrorLeftRight}} zrcadlí podle svislé osy středem desky, {{ui:sketch.mirrorTopBottom}} podle vodorovné a {{ui:sketch.mirrorAcrossLine}} podle přímé čáry skici, na kterou poté kliknete. Kopie se objeví na druhé straně a originál zůstane; nic není propojené, takže každý můžete měnit zvlášť. Body na ose jsou společné, takže poloviční obrys s konci na ose se stane uzavřeným obrysem: nakreslete polovinu držáku, vyberte ji, zrcadlete a vytvořte těleso. Dobrou osou je pomocná čára. [[Esc]] zruší.

## Pomocné konstrukční čáry

Konstrukční čára pomáhá umísťovat body, ale netvoří těleso. Kreslí se čárkovaně a není částí obrysu, takže může přesahovat libovolně daleko.

- {{ui:sketch.construction}} v {{ui:sketch.group.draw}} přepne nové čáry, včetně číselně zadávaných, na konstrukční. Dalším stiskem se vrátíte k běžným.
- Existující čáru převedete přes {{ui:sketch.makeConstruction}}, zpět přes {{ui:sketch.makeSolid}}.
- Nové body se přichytávají ke koncům a průsečíkům konstrukčních čar, označeným modrým kroužkem. Snadno tak umístíte roh do středu, známé vzdálenosti nebo průsečíku bez výpočtu.
- Konstrukční čára nerozdělí obrys v místě křížení. U rotačního profilu smí ležet i napravo od osy.

## Vytvoření tělesa

{{ui:sketch.finishSketch}} vytvoří těleso na pracovní rovině. Výšku, barvu a další parametry upravujete jako u jiného tvaru. Po změně velikosti se těleso znovu sestaví a spolu s ním se zvětší i náčrt. Přesná geometrie tak nadále podporuje úpravy hran a při opětovném otevření odpovídá náčrt tělesu.

Je-li pracovní rovina na boční ploše, kreslíte při pohledu na ni a horní směr náčrtu bude horním směrem hotového dílu. Jemný obrys ukazuje polohu původního tělesa. Prochází-li rovina tělesem, zobrazí se jeho řez; duté těleso tak vypadá jako prstenec a náčrt můžete srovnat se stěnami. Nový nebo přesouvaný bod poblíž rohu obrysu se k němu přichytí, což ukáže modrý kroužek. Do náčrtu tak převezmete polohu hran i mimo přesný povrch původního tělesa. Pro obkreslení existujících dílů zapněte {{ui:sketch.showPartEdges}}, tlačítko s vrstvami mezi ovládacími prvky pohledu vlevo. Všechny hrany těles se pak jemně promítnou do roviny náčrtu bez ohledu na jejich výšku, jako při pohledu skrz tělesa. Na svislé rovině položené na přední stěnu tak uvidíte nárys dílu. Volba se pamatuje v prohlížeči.

![Z obrysu vzniklo těleso se zaobleným rohem.](shot:sketch-result)

{{ui:inspector.editSketch}} vás kdykoliv vrátí k náčrtu. Totéž dělá dvojklik jako v Tinkercadu; zamčené těleso se neotevře. Dvojklik lze vypnout přes {{ui:workspace.doubleClickOpensSketch}}. Úpravy hran hotového tělesa se při změně náčrtu ztratí, protože hrany vznikají znovu. Těleso, které jste v 3D editoru otočili nebo posunuli, se otevře tam, kde stojí na desce, otočené tak, jak ho tam vidíte, a na mřížce desky; jen naklopené nebo zrcadlené těleso se otevře ve své vlastní poloze.

Náčrt s několika obrysy dává jedno těleso a obrysy, které se překrývají, v něm splynou. Chcete-li mít každý obrys zvlášť, vyberte těleso a klikněte na {{ui:inspector.separateParts}}: každý vnější obrys se stane samostatným tělesem s otvory, které v něm leží, a zachová si výšku, barvu a místo tělesa. Každá část má vlastní náčrt k úpravám, i s pomocnými čarami, takže můžete části zvedat nebo snižovat jednotlivě a potom je spojit nebo odečíst. Úpravy hran tomu brání, stejně jako dodatečně roztažené těleso: to se pak rozdělí jako síť.

**Jiný druh tělesa ze stejného náčrtu:** štítek nahoře v náčrtu říká, čím se stane: {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} nebo {{ui:sketch.modeBadgeSweep}}. Klikni na něj a vyber jiný, i když upravuješ existující těleso: importované SVG, které přijde vysunuté, se po přepnutí na {{ui:sketch.modeBadgeRevolve}} stane vázou nebo knoflíkem. Obrys, který přesahuje přes osu, se posune doleva, až jeho pravý okraj leží na ose; [[Ctrl]]+[[Z]] posun vrátí. Po dokončení nastoupí nové těleso na místo starého, se stejným jménem a barvou a patou ve stejné výšce. Úpravy hran se ztratí, jako při každé změně náčrtu.

### Rotace profilu

Nakreslete polovinu průřezu **nalevo od zobrazené osy**. Vedle náčrtu uvidíte průběžný 3D náhled. Obrys musí být uzavřený, nebo můžete použít otevřenou čáru rozšířenou na pás, viz níže. Dokončíte jej přes {{ui:sketch.finishRevolve}}. Ostatní tělesa návrhu jsou zobrazena zepředu, ve stejném pohledu jako profil, s osou uprostřed: kreslete profil vedle nich nebo nad nimi. Těleso stojí tam, kde jste ho nakreslili, a vodorovná čára uprostřed skici je podlaha: profil nad ní dá těleso, které stojí výš, a jeho nejnižší bod je pata tělesa.

Rotační těleso má přesnou geometrii stejně jako vysunuté. Podporuje zaoblení, zkosení a dutiny pro nádoby či vázy. Starší verze vytvářely síť; otevřením {{ui:inspector.editSketch}} a opětovným dokončením získáte přesné těleso. Profil přesahující přes osu zůstává sítí, protože jej nelze přesně sestavit.

**Jedno souvislé vlákno: {{ui:prop.pitch}}.** Rotace udělá z obrysu uzavřené prstence. Vyberte rotační těleso a v panelu vlastností mu nastavte {{ui:prop.pitch}} větší než 0, tedy o kolik stoupne za jednu otáčku, a obrys se navine do šroubovice: jedno souvislé vlákno jako filament na cívce nebo pružina. Z {{ui:prop.sweep}} se pak stane {{ui:prop.turns}}, až 200; záporné číslo navíjí doleva. Závity bližší, než je výška obrysu, splynou v jedno těleso, takže funguje i plné jádro s jemnou roztečí. Šroubovice se staví jako síť, zaoblení, zkosení ani dutina na ni nefungují; při mnoha závitech držte {{ui:prop.sides}} nízko. Rozteč 0 dělá opět prstence.

## Protažení podél dráhy

{{ui:sketch.sweep}} protáhne obrys podél dráhy: kabelový žlab, který zahýbá za roh, potrubí, kryt kolem řemene, prstenec kolem šestiúhelníku. Tlačítko je vedle {{ui:sketch.extrude}} a {{ui:sketch.revolve}} ve skupině {{ui:sketch.group.create}}.

Na stejný list kreslíte dvě věci:

- **Průřez** jako uzavřený obrys, jako obvykle. Kreslete ho tak, jak byste ho viděli při pohledu podél dráhy od jejího začátku: napříč dráhou je v náčrtu vlevo a vpravo, nahoře je nahoře na hotovém tělese. Dutý průřez, žlab nebo trubka, je obrys s dalším uvnitř. Průřez je napříč vystředěný na dráhu a těleso stojí nejnižším bodem průřezu na rovině náčrtu.

- **Dráhu** jako {{ui:sketch.construction}}: zapněte ji a kreslete úsečky nebo křivky, jediný řetězec, otevřený nebo uzavřený (uzavřený řetězec dá prstenec). Dráha leží naplocho v rovině náčrtu.

Nakreslete průřez u toho konce dráhy, kde má začínat; dráha začíná od nejbližšího konce. Pak klikněte na {{ui:sketch.finishSweep}}. Roh z rovných kousků se stane pokosem, křivka zůstane hladká a průřez zůstává po celé délce svislý. Těleso je přesné jako vytažené: zaoblení, zkosení a export STEP fungují. Chybí-li uzavřený obrys nebo dráha, nebo je několik oddělených drah, layerling to řekne. Přes {{ui:inspector.editSketch}} se vrátíte do náčrtu a změníte průřez nebo dráhu.

## Těleso z rozšířené čáry

Běžně se vyplňuje plocha uzavřeného obrysu. {{ui:sketch.stroke}} v {{ui:sketch.group.finish}} místo toho vytvoří samotnou čáru se zadanou šířkou. Zapněte {{ui:sketch.strokeOn}} a náhled se ihned změní.

- **Uzavřený obrys** vytvoří rám. {{ui:sketch.strokeAlign}} umístí stěnu {{ui:sketch.strokeAlign.center}}, {{ui:sketch.strokeAlign.inside}} nebo {{ui:sketch.strokeAlign.outside}}. Vnější rozšíření se hodí pro vůli: obrys otvoru, například rybiny, rozšíříte ven o 0,2 mm.
- **Otevřená čára** vytvoří pás souměrný kolem ní. {{ui:sketch.strokeCap}} určí zakončení {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}}, delší o polovinu šířky, nebo {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} určuje rohy obou typů: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} nebo {{ui:sketch.strokeJoin.bevel}}.

Původní čára zůstává upravitelná. Po otevření měníte čáru i rozšíření; vypnutím volby se opět vyplní plocha. Křivky se pro tuto operaci převádějí na krátké úsečky. Při rotaci vytvoří rozšířená čára tenkou stěnu: nakreslete stěnu vázy či nádoby jako **jednu otevřenou čáru nalevo od osy**, zapněte {{ui:sketch.stroke}} a nastavte šířku. Rotací vzniklého pásu se vytvoří stěna. Část pásu přesahující přes osu se ořízne.

## Výplň a silueta

Rozšíření nastavíte i bez otevření náčrtu: v {{ui:prop.sketchFill}} vyberte {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} nebo {{ui:prop.sketchFill.center}} a nastavte {{ui:prop.sketchLineWidth}} a {{ui:sketch.strokeJoin}}. Těleso se přestaví na současném místě. Volby odpovídají importu SVG v Tinkercadu. {{ui:prop.sketchFill.grow}} zachová plnou plochu a rozšíří ji do všech stran se zvoleným napojením rohů, například jako podklad pod barevné logo. Samotná vnější čára by vytvořila jen prstenec.

{{ui:prop.sketchSilhouette}} vynechá všechny vnitřní obrysy, tedy otvory i prvky uvnitř nich, a zachová jen vnější siluetu. S {{ui:prop.sketchFill.outside}} vytvoří vykrajovátko: importujte SVG dvakrát, jednou jako vyplněnou siluetu pro základnu a podruhé jako siluetu s vnější čárou 1 až 2 mm pro stěnu. Přepínač je i v panelu {{ui:sketch.stroke}} v náčrtu.

Přestavění tělesa zruší předchozí zkosení a zaoblení hran stejně jako úprava samotného náčrtu.

## Šikmé stěny pro razítka

Vysunutý náčrt má svislé stěny. Razítko, raznice či lisovací nástroj někdy potřebuje sklon vnějších i vnitřních stěn se stejnou tloušťkou. Samostatný úkos vysunutí Layerling nemá, ale u jednoduchých obrysů lze použít {{ui:inspector.taper}}:

1. Nakreslete obrys s otvorem, vytvořte těleso a duplikujte je pomocí [[Ctrl]]+[[D]].
2. Na prvním zapněte {{ui:prop.sketchSilhouette}}, aby se otvor vyplnil, a přes {{ui:inspector.taper}} nastavte širší spodek než vršek.
3. U kopie otevřete náčrt a smažte vnější obrys. Zůstane jen obrys otvoru. Dokončete, přepněte na {{ui:inspector.hole}} a přes {{ui:inspector.taper}} nastavte užší spodek než vršek.
4. Vraťte výřez do původní polohy otvoru a slučte oba tvary.

Stěny nyní mají sklon zvenku i zevnitř. Zúžení škáluje celý obrys, proto je řešení přesné pro jednoduché tvary s vhodně zvolenými rozměry, ale u jemných detailů, například písmen, jen přibližné.

## Obrázek jako předloha

{{ui:sketch.addImage}} vloží fotografii či kresbu pod náčrt pro obkreslení. Nastavte rozměry, průhlednost a polohu. Poté ji zamkněte [[Ctrl]]+[[L]], abyste ji nechtěně neposouvali. Kliknutí i rámeček procházejí zamčeným obrázkem a vybírají body a čáry nad ním. Klik na zámek v jeho rohu ho odemkne; [[Alt]]+klik ho vybere bez odemknutí. Překážející pravý panel lze přesunout za záhlaví a dvojklikem znovu ukotvit.

{{ui:sketch.imageAlign}} upravuje nepřesně vyfotografovaný podklad:

- **{{ui:sketch.imageRotation}}:** otáčí kolem středu zahnutými šipkami u rohů nebo číselně; [[Shift]] přichytává po 15°. Uvnitř kruhu, který se při otáčení objeví, se přichytávají po 22,5°, venku po celých stupních.
- **{{ui:sketch.centreImageX}}** a **{{ui:sketch.centreImageY}}:** přesunou střed na X = 0 nebo Y = 0. U rotace je X = 0 osou, takže obrázek bude vůči ní souměrný.
- **{{ui:sketch.calibrateImage}}:** tlačítko je nahoře hned pod náhledem; označte dva body se známou vzdáleností, například konce pravítka nebo průměru, a zadejte skutečný rozměr. Obrázek se rovnoměrně přepočte, první bod zůstane na místě.
- **{{ui:sketch.cropImage}}:** úchyty místo změny velikosti ořezávají. Odříznutá část zůstává uložená a vrátí se přes {{ui:sketch.uncropImage}} nebo vytažením úchytu zpět ven.

Tyto volby mění pouze podklad, nikoli náčrt.

## Klávesy v náčrtu

| Klávesa | Význam |
| --- | --- |
| [[Esc]] | odložení nástroje pro poznámky; jinak odložení nástroje (zpět na {{ui:sketch.select}}), pak zrušení výběru |
| [[Delete]] | odstranění vybraného prvku |
| [[Ctrl]]+[[C]] | kopírování |
| [[Ctrl]]+[[X]] | vyjmutí |
| [[Ctrl]]+[[V]] | vložení |
| [[Ctrl]]+[[D]] | duplikování |
| [[Ctrl]]+[[Z]] | zpět |
| [[Ctrl]]+[[A]] | výběr všech bodů a čar |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | kreslení po 15°, při přesunu omezení na jednu osu |
| číslice, [[<]], [[Tab]], [[Enter]] | zadání a potvrzení délky a úhlu další úsečky |
| [[R]] | otočení uzavřeného náčrtu o 45° |
| [[Ctrl]]+[[L]] | zamknutí nebo odemknutí podkladu |
| [[N]] | vložení poznámky: další kliknutí ji umístí do náčrtu |
| [[Shift]]+[[N]] | zobrazení nebo skrytí poznámek |

> **Tip:** Používejte jen nezbytné body. Několik dobře umístěných bodů vytvoří hladší tvar než spletitý obrys s mnoha body.
