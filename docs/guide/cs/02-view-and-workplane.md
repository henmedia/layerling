---
title: Pohled a pracovní rovina
summary: Pohyb ve scéně, kolmé pohledy a umísťování nových tvarů na libovolnou plochu.
---

## Pohyb ve scéně

Ovládání myší:

| Ovládání | Výsledek |
| --- | --- |
| tažení pravým tlačítkem | otáčení pohledu |
| kliknutí pravým tlačítkem | na tělese nabídka nejčastějších příkazů: duplikování, plné těleso/výřez, sloučení, skrytí, zamknutí, smazání a další; na prázdném místě vložení a výběr všeho |
| tažení prostředním tlačítkem | posun pohledu |
| kolečko | přiblížení a oddálení |
| [[Ctrl]] / [[Cmd]] a tažení levým tlačítkem | také posun pohledu |
| dvojklik na prázdné místo pracovní roviny nebo mimo podložku | posune pohled tak, aby to místo bylo uprostřed; pohled se pak otáčí kolem něj |

Rychlost přiblížení nastavuje {{ui:workspace.zoomSpeed}} v části {{ui:workspace.appearance}}. Posuvník má rozsah 1 až 14, výchozí je 5; nad 10 se zrychluje jen kolečko.

**Tlačítka myši jako ve sliceru.** Pokud jste zvyklí na Bambu Studio nebo OrcaSlicer, nastavte v nastavení, v {{ui:workspace.appearance}}, {{ui:workspace.mouseScheme}} na {{ui:workspace.mouseSchemeSlicer}}. Tažení levým tlačítkem po prázdném místě pak otáčí pohled, pravé tlačítko ho posouvá jako prostřední a Shift s tažením levým kreslí výběrový rámeček. Tažení tělesa ho stále posouvá a krátké kliknutí pravým stále otevře nabídku. V náčrtu posouvá pohled i pravé tlačítko.

**3D myš.** SpaceMouse nebo jiná 3D myš otáčí, posouvá a přibližuje 3D pohled: odtlačte čepičku od sebe pro přiblížení, posuňte ji pro posun pohledu, nakloňte ji pro naklonění pohledu a otočte ji pro otočení pohledu. V nastavení, v {{ui:workspace.appearance}}, klikněte na {{ui:workspace.spaceMouseConnect}} a vyberte zařízení v okně, které prohlížeč otevře; volbu si zapamatuje, takže to stačí udělat jednou. Funguje to v Chrome a Edge, které k takovým zařízením mají přístup; Firefox a Safari ne. Pokud je některý směr obráceně, zaškrtni ho pod tlačítkem: posun do stran, posun nahoru a dolů, přiblížení, náklon nebo otočení.

Na tabletu nebo telefonu dvěma prsty přibližujete a oddalujete a společným posunem prstů posouváte pohled. Jeden prst pracuje s modelem jako levé tlačítko myši. Pro otáčení jedním prstem zapněte {{ui:camera.touchRotate}} v liště pohledu. Volba se zobrazuje jen na dotykových zařízeních.

Grafický tablet s perem se chová jako myš: hrot zastupuje levé tlačítko, boční tlačítko pravé, tedy otáčení a místní nabídku. Tlačítkům tabletu lze v jeho ovladači přiřadit [klávesové zkratky](chapter:shortcuts) Layerlingu.

**Na tabletu používejte pokud možno dotykové pero.** Jeho hrot je přesnější než prst a nezakrývá cíl. Snáze tak zasáhnete malé body, tenké čáry, úchyty náčrtu, měřicí body i hrany a delší práce je méně únavná. Layerling sice pro prst zvětšuje oblast, ve které se tyto prvky dají zachytit, pero však zůstává přesnější.

### Orientační krychle

Krychle vlevo nahoře ukazuje směr pohledu. Kliknutí na její stranu přepne na pohled shora, zdola, zepředu, zezadu, zleva nebo zprava. Kliknutí na roh zobrazí šikmý pohled z tohoto rohu, kliknutí u hrany pohled mezi dvěma stranami. Místo pod ukazatelem se zvýrazňuje. Kolmé pohledy mají také klávesy [[1]] až [[6]]. Se [[Shift]] se navíc přiblíží výběr, stejně jako při [[Shift]]+[[F]].

Tažením krychle otáčíte pohledem jako pravým tlačítkem myši. Není-li nic vybráno, otáčejí pohledem i šipky: o 15° na stisknutí, se [[Shift]] o 90°. Model se otáčí ve směru šipky, tedy [[→]] obrací přední stranu doprava a [[↑]] ji naklání vzhůru. S podrženou klávesou [[Ctrl]] šipky místo toho posouvají pohled po obrazovce: o desetinu obrazu na stisknutí, se [[Shift]] navíc o polovinu. Model se posouvá ve směru šipky. Při aktivním výběru šipky přesouvají objekty; pro otáčení nejprve klikněte na prázdné místo. Dotykem lze krychli otáčet jedním prstem i bez {{ui:camera.touchRotate}}.

### Lišta pohledu

U levého okraje je úzká lišta. Shora obsahuje:

- {{ui:camera.home}} zobrazí celou scénu; klávesa [[Home]]; [[F]] to udělá také, když není nic vybráno.
- {{ui:camera.focusSelection}} přiblíží výběr, [[F]] nebo [[Shift]]+[[F]].
- {{ui:camera.zoomIn}} a {{ui:camera.zoomOut}} mění přiblížení po krocích, stejně jako [[+]] a [[−]].
- {{ui:camera.orthographic}} zapne rovnoběžné promítání bez perspektivy. Rovnoběžné hrany zůstávají rovnoběžné, což usnadňuje měření a zarovnávání. Přepíná je i [[O]]; dalším kliknutím se vrátíte.
- {{ui:camera.secondView}} otevře druhý pohled na projekt ve vlastním okně, popsaném níže. Druhé kliknutí ho zavře.
- {{ui:camera.showScrollbars}} zobrazí posuvník u dolního okraje pohledu a druhý podél pravého okraje. Tažením posuvníku se pohled plynule posouvá, klik na šipku na jeho konci jím posune o kousek (podržením pokračuje) a klik vedle posuvníku o téměř celý pohled. Nic se neotáčí a na rozdíl od šipek na klávesnici posuvníky fungují i s vybraným dílem - šikovné zblízka u drobných detailů. Druhý klik je skryje; zda se návrh otevře s nimi, určuje {{ui:workspace.startWithScrollbars}} v nastavení. Tento prohlížeč si volbu navíc pamatuje.
- {{ui:camera.hideWorkplane}}, oko nad mřížkou, skryje podložku, aby bylo vidět spodní strany modelu. Mění pouze zobrazení; nové tvary stále dopadají na pracovní rovinu. Další kliknutí ji ukáže.
- {{ui:camera.placeWorkplane}}, měření vzdáleností a úhelník jsou samostatné nástroje popsané níže a v kapitole [Měření a poznámky](chapter:measuring-and-notes).

Malá šipka úplně nahoře lištu skryje, pokud překáží.

Projekt se otevírá s naposledy použitým úhlem, přiblížením a polohou pohledu. Pokračujete tak na stejném místě i po návratu na přehled projektů či zavření stránky. Pohled se přenáší také v souboru `.lyl`. Není součástí historie kroků zpět.

V každém projektu si také můžete uložit čtyři vlastní pohledy. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] nebo [[Shift]]+[[0]] uloží pohled přesně tak, jak je - úhel, polohu, přiblížení a kolmé či perspektivní zobrazení - pod tuto klávesu, a samotná klávesa ([[7]], [[8]], [[9]] nebo [[0]]) ho vrátí. Uložení potvrdí zpráva dole; nové uložení pod stejnou klávesu pohled nahradí. Stejně jako pohled výše zůstávají uložené pohledy s projektem v tomto prohlížeči a přenášejí se v uloženém souboru `.lyl`. Nejsou součástí historie kroků zpět.

### Druhý pohled ve vlastním okně

{{ui:camera.secondView}} otevře okno, které ukazuje tentýž projekt vlastní kamerou, takže ho vidíte ze dvou stran naráz - třeba zepředu, zatímco pracujete shora. Každá změna v editoru se tam hned projeví; projekt se mění jen v hlavním okně a úchyty zůstávají také tam. Ve druhém okně myš a pohledová kostka otáčejí jeho pohledem stejně jako zde, a stejně tak klávesy: [[1]] až [[6]], [[F]], [[Home]], [[O]], [[+]] a [[−]], šipky pro otáčení a [[Ctrl]] se šipkami pro posun. [[F]] tam přiblíží to, co je vybrané v editoru. Fungují tam i čtyři uložené pohledy projektu: [[7]], [[8]], [[9]] a [[0]] je vrátí a [[Shift]] s jednou z těchto kláves pod ni uloží pohled tohoto okna - pro obě okna. Jeho vlastní lišta kamery má {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} a {{ui:camera.hideWorkplane}}, které působí jen na toto okno. Okno se otevře tam, kde jste ho nechali, ve stejné velikosti, a zavře se spolu s editorem. Na telefonech a tabletech se tlačítko nezobrazuje.

## Pohled dovnitř: řez

{{ui:camera.sectionView}}, poslední tlačítko lišty, zobrazí model proříznutý rovinou. Můžete kontrolovat stěny, dutiny i vzájemné uložení dílů. Skutečnou geometrii nemění: projekt, soubory i exporty zůstávají celé. Tam, kde rovina prochází tělesem, je řez vyplněn o něco tmavší barvou tělesa a otvor v něm zůstane prázdný, takže poznáš plné od dutého; vyplněná plocha se objeví chvíli poté, co se rovina zastaví. V části {{ui:camera.sectionCutFace}} zvolíš, jak řez vypadá: {{ui:camera.sectionCutFaceHatch}}, výchozí volba, ho šrafuje jako výkres a těleso uvnitř jiného je šrafované opačně, takže se od sebe odliší; {{ui:camera.sectionCutFaceFill}} ho vyplní jednou barvou; {{ui:camera.sectionCutFaceOpen}} ho nechá otevřený a díváš se do skořepiny tělesa. Volba platí pro každý návrh.

- Zvolte osu kolmou k rovině: X pro šířku, Y pro hloubku a Z pro výšku, stejně jako u polohy. Rovina začíná uprostřed modelu.
- {{ui:camera.sectionOrientation}} určuje, čím se tyto osy řídí. {{ui:camera.sectionOrientationWorld}} bere osy návrhu. {{ui:camera.sectionOrientationWorkplane}} bere osy pracovní roviny: Z pak řeže rovnoběžně s ní, X a Y kolmo na ni a poloha se počítá od jejího počátku. Leží-li pracovní rovina na šikmé ploše, řežeš tak rovnoběžně s touto plochou a řez se posune, když pracovní rovinu přemístíš. {{ui:camera.sectionOrientationView}} natočí rovinu k obrazovce: odebere to, co leží před ní, a posuvníkem ji posouváš ve směru pohledu hlouběji do návrhu, třeba abys dosáhl na zakrytý díl a klikl na něj. Po otočení pohledu na něj klikni znovu a řez se řídí novým pohledem.
- {{ui:camera.sectionCoarse}} posouvá rovinu přes celý model, {{ui:camera.sectionFine}} jemně kolem současné polohy po desetinách milimetru. Polohu lze i zadat.
- Tlačítko vedle os obrátí zobrazovanou stranu řezu, {{ui:camera.sectionReset}} vrátí rovinu doprostřed a {{ui:camera.sectionShowPlane}} skryje modrou rovinu.
- Odkryté části včetně vnitřních stěn lze vybírat kliknutím.
- {{ui:camera.sectionWorkplane}} umístí pracovní rovinu na rovinu řezu.
- {{ui:camera.sectionSketch}} začne nový náčrt přímo na řezu, ve kterém už jsou obrysy řezu jako čáry: díra přijde jako skutečná kružnice, zaoblený roh jako oblouk. Upravte je, smažte, co nepotřebujete, kreslete dál a dokončete: těleso vyroste z řezu na stranu, která je odříznutá, takže díl, který musí sedět na jiný, například víko, vložka nebo těsnění, začíná přímo obrysem toho dílu. Tlačítko vedle os volí tuto stranu. Stejně jako u SVG se počítají jen viditelná tělesa a díry jsou už odečtené.
- {{ui:camera.sectionMeasure}} měří v řezu dvěma kliknutími. Body se přichytávají k obrysu, přednostně k rohům. Druhý bod na protější stěně se umístí kolmo proti prvnímu. Bez přesného míření tak změříte tloušťku stěny, mezeru nebo vůli. Třetí kliknutí začne další měření, [[Esc]] měření ukončí. Posun řezné roviny měření vymaže.
- {{ui:camera.sectionExportSvg}} uloží obrysy v řezu jako SVG v měřítku 1:1 pro laser, plotr, šablonu nebo těsnění. Řez X je viděn zprava, Y zepředu a Z shora. Zahrnou se jen viditelná tělesa s již odečtenými výřezy. Tělesa stejné barvy se sjednotí do jednoho obrysu. Každá barva zůstává samostatnou nevyplněnou cestou pro oddělené vrstvy v laserovém programu.

Křížek a [[Esc]] zavřou okno nástroje; probíhá-li měření, [[Esc]] nejdřív ukončí to. Řez zůstane, dokud ho nevypnete přes {{ui:camera.sectionActive}}, nekliknete na jeho tlačítko v liště, zatímco je okno otevřené, nebo se nevrátíte do přehledu projektů. Dokud je zapnutý, jeho tlačítko zůstává zvýrazněné. Co postavíte na odříznuté straně, se ukáže až po vypnutí řezu. Tablet nemá [[Esc]], proto má okno nástroje na něm dvě tlačítka navíc: {{ui:camera.sectionBack}} ukončí měření, pokud probíhá, a jinak zavře okno nástroje, a {{ui:camera.sectionConfirm}} zavře okno nástroje jedním krokem. Počítač je nezobrazuje.

Okno nástroje je u svého tlačítka. Přetažením záhlaví ho přesunete kamkoliv na pracovní plochu a příště se tam otevře znovu. Dvojklik nebo vrácení k tlačítku obnoví jeho ukotvení.

[[Esc]] okno zavře, ale řez zůstane aktivní do vypnutí nebo návratu do přehledu projektů. Tlačítko řezu zůstává zvýrazněné. Objekty vložené do odříznuté části uvidíte až po vypnutí řezu.

## Pracovní rovina

Nové tvary se orientují podle pracovní roviny. Zpočátku jde o základní podložku s mřížkou, ale můžete ji položit na libovolnou plochu a modelovat na boku či šikmé stěně.

1. Stiskněte [[W]] nebo zvolte {{ui:camera.placeWorkplane}}.
2. Najeďte na plochu tělesa; zvýrazní se.
3. Kliknutím na ni položíte pracovní rovinu. Nové tvary budou umístěny na této ploše.

Kliknete-li místo toho na prázdnou podložku, rovina se vodorovně položí do zvoleného místa přichyceného k mřížce. Nové tvary i dokončený náčrt, včetně rotačního, se pak objeví tam místo středu podložky. Při takto vodorovně položené rovině se u původní podložky zobrazí jen obrys, protože dvě překryté mřížky by blikaly.

Na ploše se počátek roviny běžně přichytává k mřížce. Kliknutím poblíž rohu jej umístíte přesně do rohu. U hrany se přichytí na hranu a mřížka se s ní zarovná. Tak můžete záměrně zvolit její natočení. Mimo rohy a hrany je mřížka vodorovné plochy rovnoběžná s tělesem; natočení kvádru tedy přebírá.

Kliknutí mimo podložku nebo [[Esc]] vrátí rovinu na základní podložku. Rychlejší je {{ui:camera.resetWorkplane}}, tlačítko se šipkou dolů pod okem, dostupné při umístění roviny na ploše. [[Shift]]+[[W]] ji položí přímo na právě vybranou plochu. [[Alt]]+[[W]] ji kdykoli vrátí na základní podložku, ať je něco vybráno, nebo ne. Přidržení [[Shift]] při kliknutí obrátí směr roviny.

Při umístění na ploše se vedle {{ui:camera.placeWorkplane}} objeví oko. Skryje rovinu bez zrušení jejího umístění: nové tvary dál dopadají na příslušnou plochu a otáčení používá její orientaci. Znovu ji ukáže oko nebo nastavení nové roviny.

Chceš-li se na pracovní rovinu podívat kolmo, stiskni [[P]] nebo klikni na {{ui:camera.lookOntoWorkplane}} vedle {{ui:camera.placeWorkplane}} v liště pohledu. Pohled se otočí, až rovinu vidíš zpříma, ze strany, kam rostou nové tvary, s jejím počátkem uprostřed. Na základní desce je to pohled shora.

## Tiskové podložky

Když se návrh nevejde na jednu podložku, třeba krabička s víkem a vložkami, může mít více tiskových podložek. Klikněte na {{ui:editor.tool.buildPlates}} ve skupině {{ui:editor.group.arrange}} nebo zvolte {{ui:plates.moveTo}} v nabídce pravého kliknutí na těleso. Dole v pohledu se objeví lišta s tlačítkem pro každou podložku; číslo na něm udává, kolik těles na podložce stojí.

- Každá podložka je velká jako pracovní plocha a podložky leží vedle sebe vpravo od první, 20 mm od sebe. Těleso patří k podložce, na které stojí střed jeho půdorysu, takže přetažením na druhou stranu se dostane na jinou podložku. Návrh má nejvýše 12 podložek.
- Kliknutí na podložku v liště ji ukáže a nové tvary pak přistanou na ní. {{ui:plates.showAll}} ukáže všechny. Dvojklik na podložku nebo {{ui:plates.rename}} jí dá název, třeba „Víko“, který je na podložce napsán.
- {{ui:plates.moveLeft}} a {{ui:plates.moveRight}} mění pořadí, tělesa se posouvají se svou podložkou. {{ui:plates.remove}} odebere aktivní podložku; její tělesa přejdou na první podložku na stejné místo.
- {{ui:plates.arrange}} rozloží vybraná tělesa, nebo všechna, řadu po řadě na podložky, největší první, 5 mm od sebe, a přidává podložky, dokud jsou potřeba. Těleso větší než podložka zůstane na místě.
- Se zvolenou tiskárnou se každé těleso kontroluje proti své podložce a výška tisku se počítá od nejnižšího tělesa na ní. Podložka s tělesem, které se nevejde, ukáže své číslo červeně.
- Ve vlastnostech se X počítá od středu vlastní podložky tělesa.

Okno exportu pak nabízí {{ui:export.plates}}: všechny podložky v jednom souboru, vedle sebe jako v návrhu; jeden soubor na podložku, zabalené v ZIP (STL, 3MF a OBJ); nebo jedinou podložku, umístěnou na místo první. Slicer otevře každý soubor jako jednu podložku, takže pro tisk podložek jedné po druhé použijte soubory po podložkách. Přesun těles mezi podložkami a jejich rozmístění lze vrátit zpět; přidání, pojmenování, řazení a odebrání podložek se ukládá s návrhem, ale nevrací se.

## Mřížka a přichytávání

Mřížka usnadňuje odhad rozměrů podložky. Vpravo dole se nastavuje **krok přichytávání**: posun a změna velikosti se provádějí v násobcích tohoto rozměru, například 1 mm. Pro jemnou práci krok zmenšete, pro hrubé rozmístění zvětšete. {{ui:editor.tool.snapToGrid}} dodatečně přesune vybrané tvary na nejbližší průsečík mřížky. Při přesouvání se přichytávají také k jiným tvarům, viz [Výběr a uspořádání](chapter:select-and-arrange). Bez myši: [[Alt]]+[[1]] až [[Alt]]+[[0]] vyberou položku s tímto číslem v nabídce ([[Alt]]+[[1]] přichytávání vypne) a [[,]] a [[.]] krok o stupeň zjemní nebo zhrubí. Funguje to i v náčrtu.

> **Tip:** Při přesném lícování dílů přestaňte pohledem otáčet. Číselnou klávesou zvolte pohled shora nebo zepředu a [[O]] přepněte na rovnoběžné promítání. Snadněji pak poznáte, zda jsou hrany skutečně v jedné rovině.

### Okno nastavení

Ozubené kolo v titulním řádku ({{ui:editor.workspaceSettings}}) otevře nastavení. Vlevo je pět oblastí: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} a {{ui:workspace.history}}. Změna platí okamžitě. {{ui:workspace.makeDefault}} dole uloží současné nastavení jako výchozí, takže nový projekt začne s ním. Otevřený soubor si přinese vlastní nastavení; {{ui:workspace.useMyDefault}} vedle něj použije na otevřený projekt vaše uložené barvy, mřížku a ostatní, přičemž zachová jeho jednotky. Pokud vaše výchozí nastavení obsahuje tiskárnu, přijde i s velikostí své podložky; bez tiskárny si projekt ponechá svou podložku a tiskárnu. {{ui:workspace.close}} vpravo nahoře okno zavře. Tato část prochází nastavení jedno po druhém.

### Vzhled: motiv, pás nástrojů a krychle

{{ui:workspace.theme}} určuje barevné schéma celého programu: {{ui:workspace.themeSystem}} se řídí počítačem, další jsou {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} a {{ui:workspace.themeGraphite}}. Změnit ho lze i vpravo nahoře v editoru.

{{ui:workspace.toolbarSize}} v {{ui:workspace.appearance}} mění velikost pásu nástrojů, nabídky tvarů, lišty pohledu vlevo a panelu vlastností vpravo: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} nebo {{ui:workspace.toolbarSizeLarge}}. Malé ovládání nechá více místa na notebooku, velké usnadňuje dotyk i použití na velké obrazovce. Nevejdou-li se velká tlačítka, skupiny pásu se zalomí do dalšího řádku. Nastavení se uchovává v tomto prohlížeči pro všechny projekty.

{{ui:workspace.shapeColors}} zobrazí na obrázcích knihovny tvarů barvu, se kterou nový tvar začíná (barvu jeho druhu, nebo tu, kterou jste uložili přes {{ui:inspector.saveDefaults}}). Pokud dáváte přednost šedým obrázkům, vypněte to; prohlížeč si volbu zapamatuje.

{{ui:workspace.viewCubePosition}} v {{ui:workspace.appearance}} přesune orientační krychli do jiného rohu pracovní plochy: {{ui:workspace.viewCubePositionTopLeft}} (jako dosud), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} nebo {{ui:workspace.viewCubePositionBottomRight}}. V každém rohu kromě levého horního se lišta pohledu posune nahoru na místo, které krychle uvolnila. Vpravo dole stojí krychle těsně nad ovládáním {{ui:inspector.snapGrid}}. Dokud jsou vpravo otevřené vlastnosti tvaru, krychle na pravé straně uhne vlevo od nich. Roh se uchovává v tomto prohlížeči pro všechny projekty. V úzkém okně, třeba na telefonu, je nastavení skryté a krychle zůstává vlevo nahoře.

### Vzhled: rychlý režim

{{ui:workspace.fastMode}} je pro pomalejší počítače. Vypne stíny, obrysy na všech tělesech a setrvačnost kamery a vykresluje pohled jen v rozlišení obrazovky. Vaše vlastní nastavení zůstanou uložená na později a přepínače, které přebírá, ukazují {{ui:workspace.offInFastMode}}, dokud je zapnutý. Co dalšího pomáhá na pomalém počítači, najdete níže v části „Když je Layerling pomalý“.

### Vzhled: barvy pracovní plochy a náčrtu

Barvy pracovní plochy se nastavují v {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} a {{ui:workspace.surfaceColor}} pro světlý motiv (tmavé motivy mají vlastní), vedle barvy mřížky v {{ui:workspace.workplane}}. Každá barva je tlačítko, které ji ukazuje. Kliknutí otevře malé okno s barevným polem, řadou hotových barev, polem pro hexadecimální hodnotu a šipkou, která barvu vrátí na výchozí hodnotu Layerlingu. [[Enter]] převezme zadanou hexadecimální hodnotu, stejně jako kliknutí mimo okno.

Pohled náčrtu má vlastní barvy: {{ui:workspace.sketchBackground}} pro okno kolem listu, {{ui:workspace.sketchPlateColor}} pro list pod mřížkou a {{ui:workspace.sketchGridColor}}, vše pro světlý motiv. {{ui:workspace.sketchMatch}} převezme jedním kliknutím tři barvy pracovní plochy.

{{ui:workspace.classicLook}} nastaví pracovní plochu tak, jak ji ukazuje Tinkercad: bílý podklad, světle modrá milimetrová mřížka s tmavší čarou po každém centimetru, černé obrysy, světlo shora s měkkými stíny. Každou hodnotu lze potom ještě změnit zvlášť. Všechny začínají tak, jak Layerling vždy vypadal, a co vám vyhovuje, záleží na vašem monitoru.

![Nastavení vzhledu: barvy pozadí a pracovní roviny pro světlý motiv a zapnutí obrysů těles.](shot:settings-appearance)

![Editor v tmavém motivu. Vpravo nahoře lze vybrat systémový, světlý, tmavý nebo grafitový motiv.](shot:editor-dark)

### Vzhled: šipky os a obrysy

{{ui:workspace.showAxes}}, výchozí zapnuto, kreslí v rohu podložky tři šipky: **X** červeně doprava, **Y** zeleně dozadu a **Z** modře vzhůru, podle údajů polohy. Jde o pravotočivou soustavu jako v Tinkercadu, CAD programech a slicerech. Na pracovní rovině umístěné na ploše se osy přizpůsobí její orientaci. Pokud překážejí, vypněte je.

{{ui:workspace.edgeLines}} kreslí obrys na každém tělese barvou {{ui:workspace.edgeColor}} (nejprve černou, jako v Tinkercadu): pomáhá, když tmavé barvy splývají. Ve výchozím stavu je vypnuto a velmi velké importované sítě se vynechávají.

![Tři tmavá tělesa se zapnutými obrysy, které je navzájem oddělují.](shot:edge-lines)

{{ui:workspace.strongHoles}} vykreslí díry tmavší šedou, méně průhledně a s tmavou čarou kolem. Pomůže, když se díra mezi průhlednými tělesy špatně hledá. Na rozdíl od hran zůstává zapnuté i v rychlém režimu.

### Vzhled: světlo a stíny

{{ui:workspace.showShadows}} zapíná a vypíná vržené stíny. Dva posuvníky určují, jak jsou tělesa osvětlena. {{ui:workspace.shadowStrength}} říká, jak tmavé jsou vržené stíny, a {{ui:workspace.shadeContrast}} přesouvá světlo z rovnoměrného okolního světla na hlavní světlo: směrem k „výraznému“ jsou stinné strany tmavší a stíny výraznější, směrem k „jemnému“ je vše plošší. Úplně nahoře je kontrast velmi silný, takže stinné strany i stíny jsou opravdu tmavé. {{ui:workspace.shadowSoftness}} změkčí okraje stínů místo ostrých. {{ui:workspace.lightAzimuth}} otáčí hlavní světlo kolem podložky (0° zepředu, 90° zprava) a {{ui:workspace.lightElevation}} ho zvedá; při 90° stojí přímo nad podložkou jako v Tinkercadu a stíny padají přímo pod tělesa. {{ui:workspace.softLighting}} přivádí většinu světla odtud, odkud se díváte, a otáčí se s pohledem: žádná plocha nezůstane tmavá a plocha tmavé barvy obrácená vzhůru už se nepřepálí do bílé. Hlavní světlo zůstává trochu pro stíny a posuvník kontrastu stále funguje. Pokud je při nízkém světle ještě vidět jasný odlesk, zvedněte {{ui:workspace.lightElevation}} na 90°: pak to vypadá jako Tinkercad. {{ui:workspace.lightReset}} vše vrátí zpět.

### Vzhled: rozměry na pracovní rovině

{{ui:workspace.showMoveDimensions}} ukazuje, o kolik posouváte při tažení, {{ui:workspace.showOriginDimensions}} vzdálenosti výběru od počátku podložky, i při více vybraných tělesech. S {{ui:workspace.dimensionsAlwaysVisible}} zůstávají tyto rozměry vidět trvale, ne jen při tažení. Dokud je vybráno natočené těleso, jeho úhly se zobrazují pod ním na pracovní rovině; {{ui:workspace.showRotationAngles}} to vypne. Více v kapitole [Měření a poznámky](chapter:measuring-and-notes).

### Vzhled: výběr a přesouvání

{{ui:workspace.selectBeforeMoving}}: těleso je pak nutné nejprve vybrat a teprve další tažení ho posune. Pomáhá to, když na tělesa sahají děti nebo spěchající ruce, a na dotykové obrazovce.

{{ui:workspace.frameByDirection}}: rámeček tažený doprava vybere jen to, co leží celé uvnitř, tažený doleva vše, čeho se dotkne (kreslí se čárkovaně), jako ve SketchUpu.

{{ui:workspace.doubleClickOpensSketch}} určuje, zda dvojklik na vysunutý náčrt znovu otevře náčrt jako v Tinkercadu, a {{ui:workspace.doubleClickOpensGroup}}, zda dvojklik na skupinu nebo svazek otevře úpravy. {{ui:workspace.doubleClickCentersView}} určuje, zda dvojklik na prázdnou pracovní rovinu posune pohled na toto místo.

{{ui:workspace.objectSnap}} nechá okraje a střed tvaru při tažení přichytávat k jiným tvarům; nabídka mřížky vpravo dole má stejný přepínač. {{ui:workspace.cruise}} nechá nový tvar viset na ukazateli myši a položí ho na plochu pod ním, jako Cruise v Tinkercadu; vypnuté znamená, že se nový tvar objeví uprostřed podložky. Více v kapitole [Výběr a uspořádání](chapter:select-and-arrange).

### Vzhled: pohled

{{ui:workspace.startInPerspective}}: editor se pak otevře v perspektivním pohledu, ne v plochém.

{{ui:workspace.startWithScrollbars}}: návrh se pak otevře se zobrazenými posuvníky pohledu. Nastavení se ukládá s návrhem i pomocí {{ui:workspace.makeDefault}}.

{{ui:workspace.startView}} určuje úhel, ve kterém se otevře nový projekt a ke kterému se vrací {{ui:camera.home}}. Otočte a přibližte pohled, jak se vám líbí, a pak klikněte na {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} vrátí obvyklý pohled zepředu zprava. Platí pro každý projekt v tomto prohlížeči. Projekt, který znovu otevřete, se stále otevře tak, jak jste ho opustili.

{{ui:workspace.zoomSpeed}} je posuvník od pomalého po rychlé: jak rychle přibližuje kolečko a touchpad; tlačítka a klávesy přiblížení si ponechávají vlastní malé kroky. {{ui:workspace.cameraInertia}}: po puštění myši se pohled ještě chvíli otáčí a jemně zpomalí. Vypnuté znamená, že se zastaví hned, jako v Tinkercadu a Fusion 360.

{{ui:workspace.overhangAngle}} je úhel, od kterého plocha platí za převis, když v nabídce viditelnosti zapnete zobrazení převisů: takové plochy jsou šrafované červeně a bíle. 30° je opatrné, 70° počítá s dobrým chlazením tisku; 45° je obvyklý začátek. Dokud se zobrazují, řádek pod pohledem uvádí nejstrmější převis a kolik cm² potřebuje podpěry.

{{ui:workspace.booleanTriangleLimit}} omezuje, kolik trojúhelníků smí mít importovaná síť, když ji řežete, sjednocujete nebo protínáte, protože se to počítá ve vašem prohlížeči. Síť nad limitem se nezpracuje; nejdřív síť zjednodušte, nebo limit zvyšte, pokud to počítač zvládne. Vyšší limit může editor na pár sekund zmrazit.

### Měření: jednotky, měřítko a kroky přichytávání

V {{ui:workspace.measurement}} nastavíte {{ui:workspace.units}}, jednotku, ve které se rozměry zobrazují ({{ui:workspace.scale}}: milimetry, centimetry nebo metry v metrické soustavě, palce nebo stopy v imperiální), kolik desetinných míst číslo ukazuje ({{ui:workspace.accuracy}}), {{ui:workspace.snapGrid}}, ke kterému se přichytává přesouvání a změna velikosti, a vlastní kroky přichytávání v {{ui:workspace.customSnapGrids}}.

V části {{ui:workspace.measurement}} nastavíte {{ui:workspace.units}}. Při {{ui:units.imperial}} se rozměry na tělese, v nastavení, měření i pravítku zobrazují v palcích. Přichytávání nabízí kroky od 1/64 do 1 palce a mřížka rozteče od 1/8 do 1 palce, výchozí 1/4 palce, se silnější čárou po celém palci. {{ui:workspace.inchFormat}} přepíná zlomky jako v Tinkercadu, například 1 5/8 se zaokrouhlením na 1/64, nebo desetinný zápis 1.625 s přesností {{ui:workspace.accuracy}}. Zadávat lze oba formáty včetně „1 5/8“. Rychleji se mezi milimetry a palci přepíná malým přepínačem **mm | in** vedle {{ui:inspector.snapGrid}} dole v okně vlastností: změní jednotku, mřížku desky a krok přichytávání stejně jako nastavení, pro tento projekt.

V {{ui:workspace.customSnapGrids}} přidáte vlastní pojmenovanou rozteč v milimetrech, například „Rozteč vývodů 2,54 mm“ pro pouzdra DIP, kolíkové lišty a univerzální desky nebo „Jednotka klávesy MX“ s 19,05 mm. Nabídka přichytávání pak obsahuje celý krok, polovinu a čtvrtinu, tedy 1 ×, ½ × a ¼ ×. Chcete-li nabízet pouze celý krok, vypněte u příslušné rozteče {{ui:workspace.customSnapGridParts}}. U již uložených roztečí zůstává volba zapnutá. Vlastní kroky se ukládají s projektem i přes {{ui:workspace.makeDefault}}.

{{ui:workspace.startWithCornerRuler}}: každý nový návrh v tomto prohlížeči pak začne s úhelníkem v počátku souřadnic, viz [Měření a poznámky](chapter:measuring-and-notes). Stávající návrhy zůstanou, jak jsou, a úhelník, který z návrhu odstraníte, se už nevrátí.

### Pracovní rovina: podložka a tiskárna

{{ui:workspace.printer}} přizpůsobí pracovní rovinu tiskové podložce vaší tiskárny a označí tělesa, která přes ni přesahují, viz [Tisk](chapter:printing). {{ui:workspace.showPlateLabels}} napíše na podložku název projektu, a při zvolené tiskárně i její název a tiskový prostor.

{{ui:workspace.printerPlay}} je místo na stranu, které vytištěný čep potřebuje, aby se otáčel ve vytištěném otvoru na vaší tiskárně. {{ui:workspace.fitTestMake}} položí na podložku test vůle, který ji změří; nová víka, rybinové spoje, zaklapávací háčky, matice a kontrola vůle pak začínají s ní, viz [Tisk](chapter:printing). Ukládá se v tomto prohlížeči, ne v projektu.

{{ui:workspace.size}} dá podložce vlastní velikost, {{ui:workspace.width}} a {{ui:workspace.length}} v milimetrech nebo zvolené jednotce. Mřížka vždy prochází počátkem, takže silnější čáry leží na osách bez ohledu na rozměr podložky.

### Pracovní rovina: mřížka

{{ui:workspace.showGrid}} zobrazí nebo skryje mřížku na podložce. {{ui:workspace.gridBlockSize}} nastavuje rozestup jejích čar a {{ui:workspace.gridMajorEvery}}, zda tmavší čára přijde po každých 5, nebo 10 krocích mřížky; {{ui:workspace.gridMajorColor}} dá této čáře vlastní barvu, kterou převezme i středový kříž a okraj podložky. {{ui:workspace.gridColor}} je barva běžných čar.

Každá čára mřížky se při přiblížení rozšiřuje jako v Tinkercadu a při oddálení zůstává viditelná. Je-li to na vás moc, vypněte {{ui:workspace.gridLinesGrow}} a čáry zůstanou při každém přiblížení široké jeden pixel, jako v náčrtu.

Pokud mřížka zmizela, třeba proto, že byla barva nastavena na barvu podložky, {{ui:workspace.resetGrid}} na konci oblasti {{ui:workspace.workplane}} vrátí její viditelnost, barvy, rozestup a tloušťku čar na standard, zde i ve výchozím nastavení uloženém přes {{ui:workspace.makeDefault}}.

### Výchozí hodnoty tvarů

V {{ui:workspace.shapeDefaults}} vyberete tvar v {{ui:workspace.shape}} a nastavíte, s čím začne, když ho přidáte: jeho šířku, délku a výšku. {{ui:workspace.useAppDefaults}} vrátí tvar na hodnoty, se kterými ho začíná aplikace. Tvary s vlastním nastavením ho ukazují v {{ui:workspace.shapeDetails}}. Hodnoty platí pro nové tvary, ne pro ty, které už na podložce stojí. {{ui:workspace.customLimit}} nastaví vlastní horní mez toho, jak velký mohou tento tvar udělat úchyty a vlastnosti; ponecháte-li prázdné, platí obvyklé meze.

### Uložená historie

V {{ui:workspace.history}} posuvník {{ui:workspace.savedHistory}} určuje, kolik dokončených akcí zůstane k dispozici pro Zpět po uložení nebo znovuotevření projektu. Výchozí hodnota je 100 akcí na projekt. Nižší limit starší kroky Zpět projektu natrvalo zahodí.

## Když je Layerling pomalý

Vše se počítá a vykresluje v prohlížeči. Starší počítač, slabší grafika nebo více velkých monitorů mohou pohled zpomalit. Pomůže:

- **{{ui:workspace.fastMode}}** v {{ui:workspace.appearance}} vypne stíny, obrysy všech těles a setrvačnost kamery. Navíc používá jen základní rozlišení displeje, což může na jemných obrazovkách znamenat až čtyřikrát méně pixelů. Vaše původní nastavení se zachová a po vypnutí rychlého režimu obnoví.
- **Pohled se dál otáčí:** krátké plynulé dobíhání po puštění myši je záměrné. Vypněte {{ui:workspace.cameraInertia}} v {{ui:workspace.appearance}}, chcete-li okamžité zastavení jako v Tinkercadu nebo Fusion 360.
- **Jednotlivé volby:** bez rychlého režimu můžete vypnout pouze {{ui:workspace.showShadows}} nebo {{ui:workspace.edgeLines}}.
- **Grafická karta:** v Chrome otevřete `chrome://gpu`, v Edge `edge://gpu`. U WebGL má být „Hardware accelerated“. „Software only“ znamená vypnutou hardwarovou akceleraci. Ve Windows lze také v Nastavení → Systém → Obrazovka → Grafika nastavit pro prohlížeč vysoký výkon, aby používal samostatnou grafiku místo slabší integrované.
- **Zjednodušení importované sítě:** stovky tisíc trojúhelníků zpomalí každý pohled. Postup je v kapitole o souborech v části o zjednodušení sítě.
- **Zavření ostatních karet:** všechny otevřené karty Layerlingu i jiné 3D stránky sdílejí stejnou grafickou kartu.
