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
- {{ui:camera.hideWorkplane}}, oko nad mřížkou, skryje podložku, aby bylo vidět spodní strany modelu. Mění pouze zobrazení; nové tvary stále dopadají na pracovní rovinu. Další kliknutí ji ukáže.
- {{ui:camera.placeWorkplane}}, měření vzdáleností a úhelník jsou samostatné nástroje popsané níže a v kapitole [Měření a poznámky](chapter:measuring-and-notes).

Malá šipka úplně nahoře lištu skryje, pokud překáží.

Projekt se otevírá s naposledy použitým úhlem, přiblížením a polohou pohledu. Pokračujete tak na stejném místě i po návratu na přehled projektů či zavření stránky. Pohled se přenáší také v souboru `.lyl`. Není součástí historie kroků zpět.

V každém projektu si také můžete uložit čtyři vlastní pohledy. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] nebo [[Shift]]+[[0]] uloží pohled přesně tak, jak je - úhel, polohu, přiblížení a kolmé či perspektivní zobrazení - pod tuto klávesu, a samotná klávesa ([[7]], [[8]], [[9]] nebo [[0]]) ho vrátí. Uložení potvrdí zpráva dole; nové uložení pod stejnou klávesu pohled nahradí. Stejně jako pohled výše zůstávají uložené pohledy s projektem v tomto prohlížeči a přenášejí se v uloženém souboru `.lyl`. Nejsou součástí historie kroků zpět.

### Druhý pohled ve vlastním okně

{{ui:camera.secondView}} otevře okno, které ukazuje tentýž projekt vlastní kamerou, takže ho vidíte ze dvou stran naráz - třeba zepředu, zatímco pracujete shora. Každá změna v editoru se tam hned projeví; projekt se mění jen v hlavním okně a úchyty zůstávají také tam. Ve druhém okně myš a pohledová kostka otáčejí jeho pohledem stejně jako zde, a stejně tak klávesy: [[1]] až [[6]], [[F]], [[Home]], [[O]], [[+]] a [[−]], šipky pro otáčení a [[Ctrl]] se šipkami pro posun. [[F]] tam přiblíží to, co je vybrané v editoru. Fungují tam i čtyři uložené pohledy projektu: [[7]], [[8]], [[9]] a [[0]] je vrátí a [[Shift]] s jednou z těchto kláves pod ni uloží pohled tohoto okna - pro obě okna. Jeho vlastní lišta kamery má {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} a {{ui:camera.hideWorkplane}}, které působí jen na toto okno. Okno se otevře tam, kde jste ho nechali, ve stejné velikosti, a zavře se spolu s editorem. Na telefonech a tabletech se tlačítko nezobrazuje.

## Pohled dovnitř: řez

{{ui:camera.sectionView}}, poslední tlačítko lišty, zobrazí model proříznutý rovinou. Můžete kontrolovat stěny, dutiny i vzájemné uložení dílů. Skutečnou geometrii nemění: projekt, soubory i exporty zůstávají celé. Tam, kde rovina prochází tělesem, je řez vyplněn o něco tmavší barvou tělesa a otvor v něm zůstane prázdný, takže poznáš plné od dutého; vyplněná plocha se objeví chvíli poté, co se rovina zastaví.

- Zvolte osu kolmou k rovině: X pro šířku, Y pro hloubku a Z pro výšku, stejně jako u polohy. Rovina začíná uprostřed modelu.
- {{ui:camera.sectionOrientation}} určuje, čím se tyto osy řídí. {{ui:camera.sectionOrientationWorld}} bere osy návrhu. {{ui:camera.sectionOrientationWorkplane}} bere osy pracovní roviny: Z pak řeže rovnoběžně s ní, X a Y kolmo na ni a poloha se počítá od jejího počátku. Leží-li pracovní rovina na šikmé ploše, řežeš tak rovnoběžně s touto plochou a řez se posune, když pracovní rovinu přemístíš. {{ui:camera.sectionOrientationView}} natočí rovinu k obrazovce: odebere to, co leží před ní, a posuvníkem ji posouváš ve směru pohledu hlouběji do návrhu, třeba abys dosáhl na zakrytý díl a klikl na něj. Po otočení pohledu na něj klikni znovu a řez se řídí novým pohledem.
- {{ui:camera.sectionCoarse}} posouvá rovinu přes celý model, {{ui:camera.sectionFine}} jemně kolem současné polohy po desetinách milimetru. Polohu lze i zadat.
- Tlačítko vedle os obrátí zobrazovanou stranu řezu, {{ui:camera.sectionReset}} vrátí rovinu doprostřed a {{ui:camera.sectionShowPlane}} skryje modrou rovinu.
- Odkryté části včetně vnitřních stěn lze vybírat kliknutím.
- {{ui:camera.sectionWorkplane}} umístí pracovní rovinu na rovinu řezu.
- {{ui:camera.sectionMeasure}} měří v řezu dvěma kliknutími. Body se přichytávají k obrysu, přednostně k rohům. Druhý bod na protější stěně se umístí kolmo proti prvnímu. Bez přesného míření tak změříte tloušťku stěny, mezeru nebo vůli. Třetí kliknutí začne další měření, [[Esc]] měření ukončí. Posun řezné roviny měření vymaže.
- {{ui:camera.sectionExportSvg}} uloží obrysy v řezu jako SVG v měřítku 1:1 pro laser, plotr, šablonu nebo těsnění. Řez X je viděn zprava, Y zepředu a Z shora. Zahrnou se jen viditelná tělesa s již odečtenými výřezy. Tělesa stejné barvy se sjednotí do jednoho obrysu. Každá barva zůstává samostatnou nevyplněnou cestou pro oddělené vrstvy v laserovém programu.

Panel je u svého tlačítka. Přetažením záhlaví ho přesunete kamkoliv na pracovní plochu a příště se tam otevře znovu. Dvojklik nebo vrácení k tlačítku obnoví jeho ukotvení.

[[Esc]] panel zavře, ale řez zůstane aktivní do vypnutí nebo návratu do přehledu projektů. Tlačítko řezu zůstává zvýrazněné. Objekty vložené do odříznuté části uvidíte až po vypnutí řezu.

## Pracovní rovina

Nové tvary se orientují podle pracovní roviny. Zpočátku jde o základní podložku s mřížkou, ale můžete ji položit na libovolnou plochu a modelovat na boku či šikmé stěně.

1. Stiskněte [[W]] nebo zvolte {{ui:camera.placeWorkplane}}.
2. Najeďte na plochu tělesa; zvýrazní se.
3. Kliknutím na ni položíte pracovní rovinu. Nové tvary budou umístěny na této ploše.

Kliknete-li místo toho na prázdnou podložku, rovina se vodorovně položí do zvoleného místa přichyceného k mřížce. Nové tvary i dokončený náčrt, včetně rotačního, se pak objeví tam místo středu podložky. Při takto vodorovně položené rovině se u původní podložky zobrazí jen obrys, protože dvě překryté mřížky by blikaly.

Na ploše se počátek roviny běžně přichytává k mřížce. Kliknutím poblíž rohu jej umístíte přesně do rohu. U hrany se přichytí na hranu a mřížka se s ní zarovná. Tak můžete záměrně zvolit její natočení. Mimo rohy a hrany je mřížka vodorovné plochy rovnoběžná s tělesem; natočení kvádru tedy přebírá.

Kliknutí mimo podložku nebo [[Esc]] vrátí rovinu na základní podložku. Rychlejší je {{ui:camera.resetWorkplane}}, tlačítko se šipkou dolů pod okem, dostupné při umístění roviny na ploše. [[Shift]]+[[W]] ji položí přímo na právě vybranou plochu. [[Alt]]+[[W]] ji kdykoli vrátí na základní podložku, ať je něco vybráno, nebo ne. Přidržení [[Shift]] při kliknutí obrátí směr roviny.

Při umístění na ploše se vedle {{ui:camera.placeWorkplane}} objeví oko. Skryje rovinu bez zrušení jejího umístění: nové tvary dál dopadají na příslušnou plochu a otáčení používá její orientaci. Znovu ji ukáže oko nebo nastavení nové roviny.

## Mřížka a přichytávání

Mřížka usnadňuje odhad rozměrů podložky. Vpravo dole se nastavuje **krok přichytávání**: posun a změna velikosti se provádějí v násobcích tohoto rozměru, například 1 mm. Pro jemnou práci krok zmenšete, pro hrubé rozmístění zvětšete. {{ui:editor.tool.snapToGrid}} dodatečně přesune vybrané tvary na nejbližší průsečík mřížky. Při přesouvání se přichytávají také k jiným tvarům, viz [Výběr a uspořádání](chapter:select-and-arrange). Bez myši: [[Alt]]+[[1]] až [[Alt]]+[[0]] vyberou položku s tímto číslem v nabídce ([[Alt]]+[[1]] přichytávání vypne) a [[,]] a [[.]] krok o stupeň zjemní nebo zhrubí. Funguje to i v náčrtu.

V části {{ui:workspace.measurement}} nastavíte {{ui:workspace.units}}. Při {{ui:units.imperial}} se rozměry na tělese, v nastavení, měření i pravítku zobrazují v palcích. Přichytávání nabízí kroky od 1/64 do 1 palce a mřížka rozteče od 1/8 do 1 palce, výchozí 1/4 palce, se silnější čárou po celém palci. {{ui:workspace.inchFormat}} přepíná zlomky jako v Tinkercadu, například 1 5/8 se zaokrouhlením na 1/64, nebo desetinný zápis 1.625 s přesností {{ui:workspace.accuracy}}. Zadávat lze oba formáty včetně „1 5/8“. Rychleji se mezi milimetry a palci přepíná malým přepínačem **mm | in** vedle {{ui:inspector.snapGrid}} dole v okně vlastností: změní jednotku, mřížku desky a krok přichytávání stejně jako nastavení, pro tento projekt.

V {{ui:workspace.customSnapGrids}} přidáte vlastní pojmenovanou rozteč v milimetrech, například „Rozteč vývodů 2,54 mm“ pro pouzdra DIP, kolíkové lišty a univerzální desky nebo „Jednotka klávesy MX“ s 19,05 mm. Nabídka přichytávání pak obsahuje celý krok, polovinu a čtvrtinu, tedy 1 ×, ½ × a ¼ ×. Chcete-li nabízet pouze celý krok, vypněte u příslušné rozteče {{ui:workspace.customSnapGridParts}}. U již uložených roztečí zůstává volba zapnutá. Vlastní kroky se ukládají s projektem i přes {{ui:workspace.makeDefault}}.

Rozměry, rozteč a barvu podložky měníte ozubeným kolem v pásu nástrojů. Nastavení obsahuje {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} a {{ui:workspace.history}}. V {{ui:workspace.appearance}} jsou například {{ui:workspace.startInPerspective}} a {{ui:workspace.showShadows}}, v {{ui:workspace.workplane}} volba {{ui:workspace.showGrid}}. Barvy {{ui:workspace.backgroundColor}} a {{ui:workspace.surfaceColor}} se uplatňují ve světlém motivu; tmavé motivy mají vlastní. Barva mřížky je v části {{ui:workspace.workplane}}. {{ui:workspace.gridMajorEvery}} určuje silnější čáru po pěti či deseti krocích, {{ui:workspace.gridMajorColor}} její barvu, kterou používá i středový kříž a okraj podložky. Čáry při přibližování zesilují jako v Tinkercadu a zůstávají viditelné při oddálení. Vypnutím {{ui:workspace.gridLinesGrow}} zachováte tloušťku jeden pixel jako v náčrtu. Hexadecimální barvu potvrdíte [[Enter]]. {{ui:workspace.edgeLines}} zvýrazní obrysy těles barvou {{ui:workspace.edgeColor}}, zpočátku černou. Pomáhá oddělit tmavá tělesa. Výchozí stav je vypnuto a velmi husté importované sítě se vynechávají. Mřížka vždy prochází počátkem, takže hlavní čáry leží na osách bez ohledu na rozměry podložky. Pokud mřížka zmizela, například proto, že barva byla nastavena na barvu desky, {{ui:workspace.resetGrid}} na konci oblasti {{ui:workspace.workplane}} vrátí viditelnost, barvy, rozestup a tloušťku čar na standard, zde i ve výchozím nastavení uloženém tlačítkem {{ui:workspace.makeDefault}}.

{{ui:workspace.strongHoles}} vykreslí díry tmavší šedou, méně průhledně a s tmavou čarou kolem. Pomůže, když se díra mezi průhlednými tělesy špatně hledá. Na rozdíl od hran zůstává zapnuté i v rychlém režimu.

{{ui:workspace.showAxes}}, výchozí zapnuto, kreslí v rohu podložky tři šipky: **X** červeně doprava, **Y** zeleně dozadu a **Z** modře vzhůru, podle údajů polohy. Jde o pravotočivou soustavu jako v Tinkercadu, CAD programech a slicerech. Na pracovní rovině umístěné na ploše se osy přizpůsobí její orientaci. Pokud překážejí, vypněte je.

V {{ui:workspace.appearance}} upravujete i osvětlení. {{ui:workspace.shadowStrength}} určuje tmavost vržených stínů. {{ui:workspace.shadeContrast}} mění poměr rovnoměrného okolního a hlavního světla: výraznější nastavení ztmaví odvrácené strany a zvýrazní stíny, měkčí je zploští. Na horním konci je kontrast velmi silný. {{ui:workspace.shadowSoftness}} změkčí okraje stínů. {{ui:workspace.lightAzimuth}} otáčí hlavním světlem kolem podložky, 0° zepředu a 90° zprava. {{ui:workspace.lightElevation}} mění jeho výšku; při 90° svítí shora jako v Tinkercadu a stíny leží přímo pod tělesy. {{ui:workspace.lightReset}} vše obnoví. {{ui:workspace.classicLook}} nastaví bílou podložku, světle modrou milimetrovou mřížku s tmavší centimetrovou čárou, černé obrysy a horní světlo s měkkými stíny. Každou hodnotu můžete následně změnit samostatně. Výchozí hodnoty odpovídají původnímu vzhledu Layerlingu; vhodné nastavení záleží i na monitoru. Náčrt má vlastní barvy světlého motivu: {{ui:workspace.sketchBackground}} pro okolí listu, {{ui:workspace.sketchPlateColor}} pro list a {{ui:workspace.sketchGridColor}} pro mřížku. {{ui:workspace.sketchMatch}} převezme všechny tři barvy z 3D plochy jedním kliknutím.

![Nastavení vzhledu: barvy pozadí a pracovní roviny pro světlý motiv a zapnutí obrysů těles.](shot:settings-appearance)

![Tři tmavá tělesa se zapnutými obrysy, které je navzájem oddělují.](shot:edge-lines)

![Editor v tmavém motivu. Vpravo nahoře lze vybrat systémový, světlý, tmavý nebo grafitový motiv.](shot:editor-dark)

{{ui:workspace.toolbarSize}} v {{ui:workspace.appearance}} mění velikost pásu nástrojů, nabídky tvarů, levého ovládání pohledu a panelu vlastností vpravo: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} nebo {{ui:workspace.toolbarSizeLarge}}. Malé ovládání nechá více místa na notebooku, velké usnadňuje dotyk i použití na velké obrazovce. Nevejdou-li se velká tlačítka, skupiny pásu se zalomí do dalšího řádku. Nastavení se uchovává v tomto prohlížeči pro všechny projekty.

{{ui:workspace.viewCubePosition}} v {{ui:workspace.appearance}} přesune orientační krychli do jiného rohu pracovní plochy: {{ui:workspace.viewCubePositionTopLeft}} (jako dosud), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} nebo {{ui:workspace.viewCubePositionBottomRight}}. V každém rohu kromě levého horního se ovládání pohledu posune nahoru na místo, které krychle uvolnila. Vpravo dole stojí krychle těsně nad ovládáním {{ui:inspector.snapGrid}}. Dokud jsou vpravo otevřené vlastnosti tvaru, krychle na pravé straně uhne vlevo od nich. Roh se uchovává v tomto prohlížeči pro všechny projekty. V úzkém okně, třeba na telefonu, je nastavení skryté a krychle zůstává vlevo nahoře.

> **Tip:** Při přesném lícování dílů přestaňte pohledem otáčet. Číselnou klávesou zvolte pohled shora nebo zepředu a [[O]] přepněte na rovnoběžné promítání. Snadněji pak poznáte, zda jsou hrany skutečně v jedné rovině.

## Když je Layerling pomalý

Vše se počítá a vykresluje v prohlížeči. Starší počítač, slabší grafika nebo více velkých monitorů mohou pohled zpomalit. Pomůže:

- **{{ui:workspace.fastMode}}** v {{ui:workspace.appearance}} vypne stíny, obrysy všech těles a setrvačnost kamery. Navíc používá jen základní rozlišení displeje, což může na jemných obrazovkách znamenat až čtyřikrát méně pixelů. Vaše původní nastavení se zachová a po vypnutí rychlého režimu obnoví.
- **Pohled se dál otáčí:** krátké plynulé dobíhání po puštění myši je záměrné. Vypněte {{ui:workspace.cameraInertia}} v {{ui:workspace.appearance}}, chcete-li okamžité zastavení jako v Tinkercadu nebo Fusion 360.
- **Jednotlivé volby:** bez rychlého režimu můžete vypnout pouze {{ui:workspace.showShadows}} nebo {{ui:workspace.edgeLines}}.
- **Grafická karta:** v Chrome otevřete `chrome://gpu`, v Edge `edge://gpu`. U WebGL má být „Hardware accelerated“. „Software only“ znamená vypnutou hardwarovou akceleraci. Ve Windows lze také v Nastavení → Systém → Obrazovka → Grafika nastavit pro prohlížeč vysoký výkon, aby používal samostatnou grafiku místo slabší integrované.
- **Zjednodušení importované sítě:** stovky tisíc trojúhelníků zpomalí každý pohled. Postup je v kapitole o souborech v části o zjednodušení sítě.
- **Zavření ostatních karet:** všechny otevřené karty Layerlingu i jiné 3D stránky sdílejí stejnou grafickou kartu.
