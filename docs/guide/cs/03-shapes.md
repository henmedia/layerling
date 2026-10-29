---
title: Vkládání a úpravy tvarů
summary: Knihovna tvarů, rozměry zadávané číselně i úchyty, barvy, otáčení, zúžení a zkroucení.
---

Každý díl začíná jednoduchým tvarem. Další tvary jej doplňují, odečítají z něj materiál nebo se s ním spojují do nového celku.

## Přidání tvaru

Kliknutím na {{ui:editor.addShape}} otevřete knihovnu.

![Knihovna tvarů. Náhledy jsou vykreslené ze skutečné geometrie jednotlivých tvarů.](shot:shape-menu)

Knihovna se zavře po každém vybraném tvaru. Záhlavím ji přesunete tam, kde nezakrývá místo, na které míříte, třeba nad panel Vlastnosti; dvojklik na záhlaví ji vrátí pod její tlačítko a kde jste ji nechali, si pamatuje prohlížeč. Připínáček v záhlaví drží knihovnu otevřenou, dokud umisťujete několik tvarů za sebou. Okraji a rohy měníte její velikost, tak široce a vysoko, jak vaše obrazovka dovolí; i tu si prohlížeč pamatuje a dvojklik na okraj ji vrátí zpět. Když knihovnu zúžíte, vynechá názvy a ukáže jen obrázky; název se objeví, když na tvar ukážete.

Vybraný tvar sleduje myš a položí se kliknutím. Nad tělesem se orientuje podle plochy pod ukazatelem, i šikmé, podobně jako Cruise v Tinkercadu. Nad prázdnou podložkou dopadne na pracovní rovinu. [[Esc]] umísťování zruší. Nástroje čekající na kliknutí, například měření, úhelník, poznámka, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} nebo úpravy hran, se při výběru tvaru vypnou. Kliknutí pak skutečně umístí tvar. Obráceně zapnutí takového nástroje ukončí umísťování tvaru. Chcete-li nové tvary rovnou uprostřed podložky, vypněte {{ui:workspace.cruise}} v části {{ui:workspace.appearance}}.

Na ploše se tvar přichytí k jejímu středu, jakmile se ukazatel přiblíží, stejně jako k rohu nebo hraně; podržte [[Alt]] a položíte ho kamkoli. Přetažený z knihovny na plochu přistane vždy v jejím středu, s [[Alt]] tam, kde ho pustíte.

Knihovna nabízí:

- **Základní tvary:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} se třemi až 24 stranami, {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} se třemi až 24 stranami, {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} a {{ui:shape.torus}}.
- **Trubky:** {{ui:shape.tube}}, {{ui:shape.bentTube}} až z dvanácti přímých úseků spojených ohyby a {{ui:shape.loft}} mezi různými obrysy, například čtvercem a kruhem.
- **Dekorace:** {{ui:shape.star}}, {{ui:shape.heart}} a {{ui:shape.crescent}}.
- **Nápisy:** {{ui:shape.text}}, i po oblouku, viz [Text](chapter:text).
- **Mechanické díly:** {{ui:shape.thread}} jako závitová tyč, šroub, matice a závitový otvor, dále {{ui:shape.spring}}, krabičky a nosné desky {{ui:shape.gridfinity}}, {{ui:shape.gear}} a {{ui:shape.knurl}} pro úchopy. Viz [Závity a mechanické díly](chapter:threads-and-mechanics).
- **Konstrukční prvky:** {{ui:shape.hinge}} tisknutelný vcelku, {{ui:shape.dovetail}}, {{ui:shape.teardrop}} pro vodorovné otvory, {{ui:shape.counterbore}}, {{ui:shape.countersink}} pro hlavy šroubů a {{ui:shape.ruler}}, které pouze měří a neexportuje se.

Trojúhelník získáte dvěma způsoby. {{ui:shape.polygon}} se třemi stranami tvoří rovnoramenný trojúhelník, obdobu střechy v Tinkercadu. {{ui:shape.wedge}} má pravoúhlý trojúhelník. Oba jsou skutečné trojboké hranoly. Pro trojúhelníkový otvor tvar zkopírujte, zmenšete, přepněte na výřez a zarovnejte přes {{ui:editor.tool.centerOnWorkplane}} nebo {{ui:editor.tool.align}}. Při práci s ohraničením pamatujte, že jde o nejmenší kvádr obklopující tvar: i polovina čtverce má stejné krajní rozměry jako celý čtverec. Vyhledávání [[Ctrl]]+[[K]] najde oba tvary i pod názvy „triangle“ nebo „roof“.

{{ui:shape.slot}} může mít jeden konec užší, například jako kryt řemenu mezi dvěma různými řemenicemi. V {{ui:inspector.properties}} nastavte {{ui:prop.slotSmallEnd}}. Větší konec má šířku celého tvaru a boky vedou rovně mezi oblouky. {{ui:prop.slotCentreDistance}} určuje osovou vzdálenost oblouků, tedy řemenic. Při změně menšího konce se tato vzdálenost zachová a celková délka se přizpůsobí. I takový tvar zachovává přesnou geometrii pro zaoblení a STEP.

## Nastavení tvaru

Vybranému tvaru se vpravo zobrazí nastavení. Nahoře je název a tužka {{ui:outliner.rename}} pro přejmenování. [[Enter]] změnu potvrdí, [[Esc]] zruší. Prázdný název obnoví výchozí. Zámek chrání před nechtěným přesunem a oko objekt skryje. Šipka vlevo sbalí panel do záhlaví.

Panel je ukotvený u pravého okraje. Tažením záhlaví jej můžete nechat plovoucí na jiném místě, kde zůstane i pro další tvar. Přetažení zpět doprava nahoru nebo dvojklik obnoví ukotvení. U plovoucího či sbaleného panelu se krok přichytávání přesune do pravého dolního rohu pracovní plochy.

![Nastavení válce: plné těleso nebo výřez, číselný průměr a výška i posuvníky.](shot:editor-overview)

- **{{ui:inspector.solid}} / {{ui:inspector.hole}}:** plné těleso zůstává, výřez odebírá materiál. Kliknutí na {{ui:inspector.solid}} otevře barvy. Posledních osm vlastních barev zůstává v {{ui:inspector.recentColors}}. Více v [Tělesech a výřezech](chapter:solids-and-holes). Špendlík v řadě {{ui:inspector.keptColors}} ponechá zvolenou barvu navždy: stojí ve vlastní řadě, novější barvy ji nikdy nevytlačí a týmž špendlíkem ji zase pustíte; v tomto prohlížeči se uchová až 21 barev.
- **{{ui:inspector.transparent}}:** umožňuje vidět skrz těleso, například na objekt za ním.
- **{{ui:inspector.multicolor}}:** pro sloučené celky; přepíná se i pomocí [[Shift]]+[[M]]. Zachová barvy částí i po odečtení výřezů; stěna otvoru má barvu tělesa, do kterého je vyříznuta. Volba společné barvy tento režim vypne. Pouhé skupiny zachovávají barvy vždy. Ve 3MF má každá část svou barvu pro přiřazení filamentu, OBJ ji ukládá do vrcholů a přechod mezi barvami je proto hrubší.
- **{{ui:inspector.properties}}:** rozměry a parametry konkrétního tvaru. U válce průměr, výška a počet stran, u kola zuby, u pružiny závity. U hodnoty odlišné od výchozí se objeví šipka pro obnovení pouze tohoto parametru, bez vracení ostatních změn jako u Zpět. Dvojklik na posuvník obnoví výchozí hodnotu stejně jako tato šipka, a to i u posuvníků v nastavení pracovní plochy. Tažený posuvník délky se přichytává podle kroku, s výjimkou vypnutého přichytávání a krátkých posuvníků. Číselné zadání i klávesové šipky zůstávají přesné. {{ui:inspector.saveDefaults}} uloží aktuální parametry jako výchozí pro daný tvar, stejně jako {{ui:workspace.shapeDefaults}}. {{ui:inspector.resetDefaults}} obnoví výchozí parametry aplikace.
- **{{ui:inspector.makeEllipse}}:** pouze u válce. Válec má jediný průměr a úchyty mění oba vodorovné rozměry společně. Touto volbou jej změníte na {{ui:shape.ellipse}} se samostatnou délkou a šířkou, bez změny tělesa. Není dostupná po zkosení, zaoblení, vytvoření dutiny, natočení či sloučení. V takových případech použijte elipsu od začátku.
- **{{ui:inspector.taper}}:** rozdílná velikost horního a spodního konce pro sklon či trychtýř.
- **{{ui:inspector.twist}}:** vzájemné natočení nebo boční posunutí horní a spodní části pro zkroucené sloupy a nakloněná tělesa.

![Sloučení oranžového kvádru, modrého kolíku a výřezu. Vícebarevný režim zachová barvy a stěny otvoru převezmou oranžovou.](shot:group-multicolor)

Zúžení a zkroucení podporuje většina tvarů. Výjimkami jsou ozubené kolo, závit, pružina, Gridfinity, rýhovaný úchop, pant, jehlan, ohnutá trubka, kapkovitý otvor, zahloubení pro šrouby a pravítko. Mají vlastní pevné rozměry nebo již vlastní podobu vrcholu.

![Změněný poloměr vrcholu a výška kuželu. Šipka obnoví jednotlivou hodnotu; spodní tlačítka ukládají a obnovují výchozí nastavení.](shot:property-reset)

{{ui:inspector.saveDefaults}} si zapamatuje, co jste na tomto tvaru změnili, jako začátek každého nového tvaru tohoto druhu: rozměry, nastavení tvaru a jeho barvu. Obarvěte válec zeleně a stiskněte tlačítko, každý válec, který potom přidáte, bude zelený; ostatní druhy si ponechají své barvy. {{ui:inspector.resetDefaults}} vrátí druh k tomu, s čím ho program začíná. Které druhy mají vlastní výchozí hodnoty, je označeno v nastavení pod {{ui:workspace.shapeDefaults}}. Také nový návrh, který založíte z úvodní stránky, jimi začíná; hodnoty si pamatuje tento prohlížeč.

Zúžený či nakloněný kvádr, válec, elipsa, mnohoúhelník, trubka a prstenec zachovávají přesné těleso. Platí to i pro kapsli, hvězdu, srdce, srpek, rybinu a zaoblený kvádr bez zaoblení horní a spodní hrany. Lze upravovat jejich hrany a exportovat je do STEP. Stejně funguje zkroucení: průřez se po výšce přesně natáčí a boky přecházejí rovnoměrně odspodu nahoru.

Číselné zadání je přesnější než tažení. Pole kromě milimetrů přijímají procenta: „50 %“ ze šířky 40 mm vytvoří 20 mm. Umějí i výpočty: „15*3“, „120-2*4“ a „(40+2)/2“ dávají 45, 112 a 21. Místo * lze psát x. Pole si výpočet pamatují v nastavení i v kótách u tělesa. Při dalším kliknutí uvidíte původní výraz a můžete jej upravit, dokud odpovídá současné hodnotě. Změna úchytem či škálováním vazbu přeruší a pole opět ukáže jen číslo. V číselném poli, na které jsi klikl, mění kolečko myši a klávesy [[↑]] a [[↓]] hodnotu o jeden krok, s [[Shift]] o větší a s [[Alt]] o jemnější. V poli velikosti nebo polohy krokuje [[Shift]] místo toho o krok mřížky, a když je mřížka vypnutá, o deset kroků.

### Výběr barev

Kliknutí na {{ui:inspector.solid}} ve vlastnostech tělesa otevře kartu barev s nadpisem {{ui:inspector.shapeColor}}. Nahoře ukazuje hexadecimální hodnotu barvy, kterou těleso právě má. Pod ní jsou hotové barvy palety; kliknutí na jednu z nich těleso obarví a kartu zavře.

{{ui:inspector.custom}} otevře výběr barev vašeho prohlížeče pro vlastní barvu. Co nabízí, závisí na prohlížeči: v Chrome a Edge má barevné pole, posuvník odstínu, pipetu, která převezme barvu odkudkoli na obrazovce, a hodnotu jako HEX, RGB nebo HSL, mezi nimiž přepínáte šipkami vedle. Barva platí, jakmile výběr zavřete nebo kliknete mimo něj.

Vlastní barva, kterou tam namícháte, pak čeká pod {{ui:inspector.recentColors}}, posledních osm. Špendlík v řádku {{ui:inspector.keptColors}} nechá zvolenou barvu navždy: stojí ve vlastním řádku, novější barvy ji nikdy nevytlačí a týmž špendlíkem ji zase pustíte; v tomto prohlížeči se uchová až 21 barev. Špendlík je pro vlastní barvy, barvy palety tu jsou vždy. Při více barvách ve výběru nebo u otvoru není žádná jedna barva k uchování.

Barvy pracovní plochy v nastavení mají vlastní, jednodušší výběr barev s barevným polem, řadou hotových barev a polem pro hexadecimální hodnotu.

## Jemnost oblých tvarů: počet stran

Válec, kužel, trubka, elipsa a otvory mají {{ui:prop.sidesFollowSize}} a {{ui:prop.sides}}. {{ui:shape.torus}} má {{ui:prop.torusSides}} kolem prstence a {{ui:prop.torusSteps}} kolem průřezu trubice. Obě hodnoty automaticky sledují velikost, dokud je nenastavíte ručně. Pro zobrazení a STL, 3MF a OBJ se totiž kružnice nahrazuje mnoha úsečkami. Vyšší počet znamená hladší tvar i více trojúhelníků.

{{ui:prop.torusTube}} určuje, jak silný je prstenec při pohledu shora. Výška prstenec jen stlačí nebo natáhne, takže plochý kroužek si otvor ponechá; při polovině vnějšího rozměru se otvor uzavře. Tažením úchytů se prstenec zvětšuje spolu s tvarem. Přesným tělesem pro zkosení, zaoblení a STEP zůstává jen torus, jehož prstenec je stejně silný, jako je torus vysoký.

**Kde počet stran rozhoduje**

- **Export pro slicer:** málo stran znamená mnohoúhelník i ve výtisku.
- **Slučování těles a výřezů:** málo stran výřezu vytvoří hranatý otvor, včetně otvorů pro šrouby.
- **Rychlost zobrazení:** velké množství velmi jemných tvarů zpomaluje editor.

**Kde nerozhoduje**

- **STEP:** ukládá oblý tvar, nikoli jeho mnohoúhelníkové zobrazení.
- **{{ui:editor.tool.chamfer}} a {{ui:editor.tool.fillet}}**, pokud se tvar stále vyhodnocuje jako oblý: počet stran nebyl ručně změněn, je alespoň výchozí nebo odchylka od kružnice nepřesáhne {{value:EXACT_ROUND_TOLERANCE}} mm. Výchozí prahy jsou {{value:ROUND_FROM_SIDES}} stran pro válec, elipsu, trubku a kužel, {{value:ROUND_FROM_ROOF_SIDES}} pro {{ui:shape.roundRoof}}, {{value:ROUND_FROM_SPHERE_STEPS}} kroků pro {{ui:shape.sphere}}, {{value:ROUND_FROM_HALF_SPHERE_STEPS}} pro {{ui:shape.halfSphere}}, {{value:ROUND_FROM_TORUS_SIDES}} stran a {{value:ROUND_FROM_TORUS_STEPS}} kroků pro {{ui:shape.torus}} a {{ui:prop.quality}} alespoň {{value:ROUND_FROM_BENT_TUBE_QUALITY}} pro oblou {{ui:shape.bentTube}}.
- **Závit, pružina a šikmé ozubení:** úpravy hran a STEP pracují s přesným tělesem. {{ui:prop.quality}} určuje jen jemnost zobrazení.

**Kdy opět rozhoduje**

- **Úprava hran tvaru s malým počtem stran:** pod výchozím prahem se používá zobrazený mnohoúhelník. Šestistranný válec zůstává šestihrannou tyčí a zaoblují se jeho skutečné hrany. Tak lze vytvořit například šestihrannou kapsu pro matici s oblými rohy. Pro kruhový tvar ponechte {{ui:prop.sidesFollowSize}} zapnuté.

**Doporučené použití**

- **Ponechte {{ui:prop.sidesFollowSize}} zapnuté.** Počet se zvolí podle průměru tak, aby odchylka nepřesáhla {{value:ROUND_DEVIATION_TOLERANCE}} mm, což je pod běžnou přesností tisku. Malé tvary mají nejméně {{value:MIN_AUTOMATIC_SIDES}} stran, větší více.
- **Méně stran** použijte pro záměrný mnohoúhelník, k němuž ale slouží i {{ui:shape.polygon}}, nebo při zpomalení velkého množství oblých dílů.
- **Více stran** bývá potřeba jen u velmi velkých oblých dílů s viditelnými ploškami v STL.
- **Pro úpravy hran a předání přes STEP** počet stran obvykle nemusíte řešit.

## Ovládání úchyty

Vedle číselných polí jsou úchyty přímo na tvaru:

- **Rohy a hrany** mění velikost. [[Shift]] při tažení rohu zachovává poměr šířky, hloubky a výšky, [[Alt]] mění velikost vůči středu místo protějšího rohu. Bez držení klávesy zapněte {{ui:inspector.keepProportions}}. Rohy pak zachovávají poměry vždy a zadání jednoho rozměru přepočítá zbývající. Volba se pamatuje.
- Černá **šipka nad** tvarem ho zvedá nebo spouští; s [[Alt]] drženým od začátku vznikne tam, kde pustíte, kopie, takže můžete skládat nad sebe. Bílý úchyt **na horní stěně** mění výšku.
- **Obloukové šipky** otáčejí.
- **Čísla** vedle tělesa umožňují přímé zadání. [[Enter]] mění rozměr od protějšího okraje jako tažení; [[Alt]]+[[Enter]] souměrně vůči středu, aby se zachovalo zarovnání. Platí pro délku a šířku. Výška roste vždy od spodní strany vzhůru. Pravý panel zachovává střed i bez klávesy. [[Tab]] převezme číslo a otevře další pole (šířka, hloubka, výška); [[Shift]]+[[Tab]] jde zpět. V poli vlastností, na které jste klikli, mění hodnotu i kolečko myši: jednotku na zub, desetinásobek s [[Shift]], desetinu s [[Ctrl]] a setinu s [[Alt]]. Pole, na které jste neklikli, nechává kolečko panelu, který se posouvá.
- **Kliknutí na roh bez tažení** otevře šířku a hloubku společně. Zadejte první, [[Tab]] přejděte na druhou a [[Enter]] potvrďte obě. [[Esc]] zruší změnu.

Po natočení o pravý úhel, například položením přes {{ui:editor.tool.layFlat}}, odpovídají názvy rozměrů jejich současným směrům: {{ui:prop.height}} jde vzhůru, {{ui:prop.width}} podél X a {{ui:prop.length}} podél Y. Změna výšky ležícího dílu proto upraví svislý rozměr a spodek zůstane na podložce. U jiných úhlů panel ukazuje vlastní rozměry tělesa a doplní vysvětlení.

Šipky přesouvají výběr po kroku přichytávání, při vypnutí po 0,01 mm. Se [[Shift]] po pěti krocích, případně deseti, pokud v {{ui:workspace.appearance}} nastavíte {{ui:workspace.gridMajorEvery}} na {{ui:workspace.gridMajorSteps|10}}. Posun tak odpovídá vzdálenosti hlavních čar jako v Tinkercadu. Směr se řídí pohledem: [[→]] doprava na obrazovce, [[↑]] od vás, i po otočení podložky. Pohled následuje objekt přesunutý mimo obraz. [[Ctrl]]+[[↑]] a [[Ctrl]]+[[↓]] zvedají a spouštějí. [[R]] otáčí po 45°, [[Shift]]+[[R]] po 22,5° a [[D]] položí výběr na pracovní rovinu.

Úchyty dovolují velikost až podle rozměrů podložky, nejméně 220 mm v obou vodorovných směrech. Číselné zadání dovolí i větší těleso a další uchopení jej nezmenší. Vlastní maximální rozměry pro jednotlivé tvary nastavíte v {{ui:workspace.shapeDefaults}} přes {{ui:workspace.customLimit}}.

Krok přichytávání vpravo dole můžete měnit kdykoliv.

## Kopírování a duplikování

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} a {{ui:editor.tool.duplicate}} jsou v {{ui:editor.group.clipboard}}. [[Ctrl]]+[[D]] duplikuje výběr. Další duplikování zopakuje poslední posun nebo natočení kopie, takže několika stisky vytvoříte řadu otvorů či schodů. Pro pravidelné sestavy je také opakování, viz [Výběr a uspořádání](chapter:select-and-arrange).

> **Tip:** Pokud tvar odmítá požadovaný rozměr, zkontrolujte limity nových tvarů v {{ui:workspace.shapeDefaults}}. Určují jejich výchozí i maximální rozměry.

## Vlastní tvary

Opakovaně používaný držák, úchop nebo desku uložte do {{ui:myShapes.title}}. Jsou nahoře v knihovně nad {{ui:myShapes.basicShapes}} a dají se sbalit šipkou.

1. Vyberte jedno či více těles, výřezů, sloučených celků nebo importovaných modelů.
2. Otevřete knihovnu, zvolte {{ui:myShapes.saveSelection}}, pojmenujte tvar a potvrďte {{ui:common.save}}.
3. V libovolném projektu jej vložte kliknutím na dlaždici nebo přetažením na pracovní rovinu, kde dopadne na místo uvolnění. Tvar pak visí na ukazateli jako každý jiný: následuje ho, i po plochách jiných těles, kliknutí ho položí, [[Esc]] ho odloží.

Více těles zachová vzájemné rozmístění a každé lze vybírat samostatně. Tužka přejmenuje tvar, koš jej po potvrzení odstraní. Již vložená tělesa se nezmění.

Vlastní tvary jsou v tomto prohlížeči odděleně od projektů a zůstanou i po dalším spuštění. {{ui:dashboard.backupAll}} zálohuje obojí a otevření zálohy obnoví obojí. Pro přenos samotných tvarů použijte {{ui:myShapes.backup}}, šipku dolů, která vytvoří ZIP, a {{ui:myShapes.load}}, šipku nahoru. Načíst lze i jednotlivé `.lyl`; každý se stane vlastním tvarem. Shodné existující tvary se nepřidávají znovu.

### Složky

Mnoho vlastních tvarů se lépe třídí do složek. {{ui:myShapes.newFolder}} (složka s plusem vedle {{ui:myShapes.saveSelection}}) se zeptá na název a vytvoří složku nahoře; složka s plusem u složky, {{ui:myShapes.newSubfolder}}, vytvoří složku uvnitř ní. Složky mají nejvýše tři úrovně: složka na třetí úrovni pojme tvary, ale už žádné další složky. Složky stojí nad tvary, které nejsou v žádné, seřazené podle názvu, a otevírají a zavírají se šipkou; číslo u složky počítá tvary v ní i ve složkách pod ní. Při ukládání zvolte složku v seznamu vedle názvu; s {{ui:myShapes.noFolder}} zůstane tvar nahoře.

Složka se šipkou na dlaždici přesune tvar do jiné složky, nebo s {{ui:myShapes.noFolder}} zase ven. Tužka u složky ji přejmenuje, koš ji po dotazu smaže i se složkami a tvary v ní. Samotnou složku přesunout nelze: vytvořte novou tam, kam patří, a tvary do ní přesuňte. Záloha složky zachová a při načtení se tvary vrátí na stejné místo. Na serveru jsou složky složkami uvnitř `Custom shapes`.

### Vlastní tvary na serveru

Při zapnutém [sdíleném serverovém úložišti](chapter:files-and-saving) se zobrazí {{ui:myShapes.onServer}} a {{ui:myShapes.inBrowser}}. Při ukládání zvolíte umístění, výchozí je server. Tvar je tam ve složce `Custom shapes` jako samostatný `.lyl` s náhledem a je dostupný všem zařízením s přístupem. Obláček na místní dlaždici jej přesune na server, bez ponechání druhé kopie.

Složka `Custom shapes` se objeví i na úvodní stránce. Otevřete tvar jako projekt, upravte jej a změny se automaticky uloží. Příští vložení použije novou podobu. Úložiště nemá přihlašování; všichni s přístupem k serveru vidí stejné tvary.

## Obtočení kolem válce

Pro vzor, logo či nápis na hrnku, plechovce nebo trubce nejprve vytvořte rovinný tvar na podložce, například importované SVG nebo text, čitelný shora. Pak použijte {{ui:inspector.wrapCylinder}}:

1. Zadejte {{ui:inspector.wrapDiameter}} odpovídající válcové stěně, například vnějšímu průměru hrnku. Lze zadat i desetinné hodnoty, třeba 63,5.
2. {{ui:inspector.wrapApply}} obtočí levopravý rozměr kolem válce. Zadní hrana se stane horní a tloušťka vystoupí ven ze stěny.
3. Vyberte obtočený tvar i válec a vystřeďte je v obou vodorovných směrech. Střed obtočeného tvaru odpovídá ose válce, takže pak přesně dosedne na stěnu.

Pro rytinu zapněte {{ui:inspector.wrapInward}}. Tloušťka se zanoří do stěny. Tvar změňte na výřez, vystřeďte a slučte s válcem.

Již obtočený tvar je polygonová síť a nelze jej obtočit podruhé. Pro jiný průměr vraťte obtočení přes Zpět a znovu použijte rovinný originál.

Výsledek je síť jako importovaný model. Zpět obnoví rovinnou podobu. Tvar nesmí přesáhnout celý obvod válce; v takovém případě program uvede nejmenší vhodný průměr.

## Povrchová textura

Drážky, vroubkování, plástev nebo výstupky na tělese, pro lepší úchop nebo pro vzhled: v nastavení tvaru rozbalte {{ui:inspector.surfaceTexture}}. Totéž umí tlačítko {{ui:inspector.surfaceTexture}} nahoře ve skupině {{ui:editor.group.modify}}: kartu pro vybrané těleso rozbalí i sbalí a svítí, dokud je otevřená.

1. Zvolte {{ui:inspector.surfacePattern}}, jeho {{ui:inspector.surfaceSpacing}} a {{ui:inspector.surfaceDepth}}. {{ui:inspector.surfaceDirection}} určuje, zda vzor jde do tělesa, nebo z něj vystupuje. U vzoru {{ui:surfaceTexture.bumps}} zvolíte v položce {{ui:inspector.surfaceBumpShape}} mezi {{ui:surfaceTexture.bumpDome}}, {{ui:surfaceTexture.bumpCone}}, {{ui:surfaceTexture.bumpSoft}} a {{ui:surfaceTexture.bumpFlat}}.
2. V položce {{ui:inspector.surfaceProjection}} zvolte {{ui:surfaceTexture.cylinder}} pro kulatá tělesa, jako je hrnek, knoflík nebo rukojeť. Vzor obíhá kolem zvolené {{ui:inspector.surfaceAxis}} a rozteč se mírně zaokrouhlí, aby se po obvodu vešel celý počet drážek nebo buněk: vzor se uzavře bez švu. {{ui:surfaceTexture.allRound}} se hodí pro tělesa, která nejsou kulatá, {{ui:surfaceTexture.flatProjection}} pro víčko nebo desku při pohledu shora. Když ponecháte {{ui:surfaceTexture.auto}}, Layerling zvolí sám: {{ui:surfaceTexture.cylinder}} u kulatých těles a u stojících hranatých, jako je krabice – vzor pak sleduje obrys a bez švu obíhá hrany, vystouplý vzor se kolem nich zaoblí –, {{ui:surfaceTexture.allRound}} u ostatních hranatých.
3. Klikněte na {{ui:inspector.surfaceApply}}. Velké těleso potřebuje několik sekund; mezitím můžete pracovat dál.

Má-li vzor dostat jen část ploch, třeba jen horní strana krabice, klikněte na {{ui:inspector.surfaceFacesPick}} a pak v pohledu na plochy: horní, spodní nebo boční. Plocha sahá až k ostrým hranám tělesa; u válce je plášť jedna plocha, horní a spodní strana jsou každá jedna. Vybrané plochy se rozsvítí, druhé kliknutí jednu opět odebere a {{ui:inspector.surfaceFacesClear}} dá vzoru opět celé těleso. Vzor dostanou jen vybrané plochy; všechny ostatní zůstanou, jak byly, a ponechají si málo trojúhelníků. Na horní nebo spodní straně leží vzor naplocho; na kulaté horní straně vedou drážky, lano a pletení v kruzích kolem středu jako letokruhy stromu. {{ui:inspector.surfaceFaceTurn}} otočí vzor na horní a spodní straně: při 0° vedou řady podél přední hrany, při 90° podél boční. {{ui:inspector.surfaceCapStyle}} tam přepíná drážky, lano a pletení mezi řadami a kruhy; u hranatého tělesa kruhy sledují jeho obrys. {{ui:inspector.surfaceCapEdge}} určuje, co se děje na hraně mezi bokem a horní nebo spodní stranou se vzorem: {{ui:surfaceTexture.edgeSharp}} nechá obojí skončit u hrany. Při {{ui:surfaceTexture.edgeOver}} se vzor boku oblým ohybem přelije přes hranu a zabere celou horní stranu: řady lana, pletení a vodorovných drážek pokračují jako kruhy, svislé a šikmé drážky jako paprsky skoro do středu. {{ui:surfaceTexture.edgeFold}} dělá totéž jen jako okraj; uvnitř leží vlastní vzor horní strany podle {{ui:inspector.surfaceCapStyle}}. {{ui:surfaceTexture.edgeBead}} položí u každého vzoru kolem hrany lem – šňůru, uzavírací řetízek nebo kulatý val.

V části {{ui:inspector.more}} určíte, kam vzor přijde: vnější a vnitřní stěny, jak daleko zůstanou spodek a vršek hladké (hladký spodek drží těleso rovně na podložce), část výšky a zda ostré hrany zůstanou hladké. Vedle všeho, co zůstává hladké, vzor plynule nabíhá; {{ui:inspector.surfaceFade}} určuje, na kolika milimetrech. Čím menší, tím blíž se vzor dostane k hraně; vystouplý vzor dobíhá až k ní. Na rovných stěnách hranatého tělesa, třeba krychle, místo toho končí v této vzdálenosti u rovného okraje: drážky a kosočtverce končí krátkou stěnou a zůstanou jen celé výstupky. {{ui:inspector.surfaceProfile}} určuje průřez drážky nebo spáry: špičatý a plochý vycházejí přesně, oblý v tolika krocích, kolik dovolí {{ui:inspector.surfaceDetail}}.

Kromě vzorů {{ui:surfaceTexture.grooves}}, {{ui:surfaceTexture.knurl}}, {{ui:surfaceTexture.honeycomb}} a {{ui:surfaceTexture.bumps}} jsou k dispozici další. {{ui:surfaceTexture.cells}} jsou nepravidelné buňky jako dlažební kostky nebo vyschlá hlína; jejich spáry se řežou čistě jako u plástve a jiné {{ui:inspector.surfaceSeed}} je rozmístí znovu. {{ui:surfaceTexture.knit}}, {{ui:surfaceTexture.rope}} a {{ui:surfaceTexture.weave}} napodobují pletená oka, navinuté lano a koš z kolíků a proutí; začínají vystouplé a oblé, ve velikosti svých předloh. {{ui:surfaceTexture.grain}} povrch jemně zdrsní jako po pískování; zrnitost leží v prostoru, bez švu a bez zkreslení. {{ui:surfaceTexture.image}} použije šedý obrázek jako výškovou mapu: jednu z předloh, jako dřevo, topografii nebo teraco, nebo vlastní pomocí {{ui:inspector.surfaceImageLoad}}. Světlá místa dostanou plnou hloubku; {{ui:inspector.surfaceSpacingImage}} určuje, jak široká je dlaždice, a v části {{ui:inspector.surfaceImageTiling}} se dlaždice opakují, zrcadlí nebo posouvají.

{{ui:surfaceTexture.carbon}} položí na těleso uhlíkové vlákno v keprové vazbě: svislé a příčné pásky, nad sebou a pod sebou, od pásku k pásku posunuté o jeden, takže vznikne známá úhlopříčka. {{ui:inspector.surfaceCarbonWeave}} volí {{ui:surfaceTexture.carbonTwill22}}, pravidelnou tkaninu většiny karbonových dílů, nebo {{ui:surfaceTexture.carbonTwill21}} a {{ui:surfaceTexture.carbonTwill31}}, kde svislé pásky vypadají dlouhé a příčné krátké. {{ui:inspector.surfaceSpacingCarbon}} určuje, jak široké jsou svislé pásky; {{ui:inspector.surfaceCarbonCross}} udělá příčné širší nebo užší pro nestejnoměrnou tkaninu (0: stejně široké). Kolem tělesa se šířka pásků trochu zaokrouhlí, aby se tkanina uzavřela bez švu. Samotná vlákna jsou pro tisk příliš jemná: vidět jsou pásky s jejich kříženími.

{{ui:surfaceTexture.bricks}} položí na těleso cihlovou zeď se zapuštěnými spárami jako maltou. {{ui:inspector.surfaceBrickBond}} určuje, jak cihly leží: {{ui:surfaceTexture.bondRunning}} jako u většiny zdí, {{ui:surfaceTexture.bondStack}}, nebo s krátkými cihlami mezi dlouhými ({{ui:surfaceTexture.bondEnglish}}, {{ui:surfaceTexture.bondEnglishCross}}, {{ui:surfaceTexture.bondFlemish}}). {{ui:inspector.surfaceSpacingBricks}} a {{ui:inspector.surfaceBrickHeight}} se počítají od spáry ke spáře a trochu se zaokrouhlí, aby se vešly celé cihly: kolem hrnku, od hrany ke hraně strany krabičky a odspodu nahoru; {{ui:inspector.surfaceBrickJoint}} udává, jak široké jsou spáry. V části {{ui:inspector.more}} nechá {{ui:inspector.surfaceBrickVary}} každou cihlu ležet o něco hlouběji, jako ve staré zdi.

Vzor {{ui:surfaceTexture.cracks}} nechá po povrchu růst praskliny jako u kintsugi, se zlomy, větvemi a šířkou, která se ke konci zužuje. {{ui:inspector.surfaceCrackStart}} říká, kde začínají: u horního okraje vázy nebo hrnku, u dna, od okraje ke středu talíře nebo kdekoli; v nabídce {{ui:inspector.surfaceCrackStyle}} se z nich stanou blesky. Volba {{ui:inspector.surfaceCrackGold}} vyplní zářez samostatným dílem ve zlaté, pro druhý filament; jde s ním, když povrch změníte nebo odstraníte. Pod {{ui:inspector.more}} nastavíte větvení, klikatost a vyštípnutí na okraji a jiná {{ui:inspector.surfaceCrackSeed}} vylosuje praskliny znovu.

{{ui:surfaceTexture.bark}} položí kolem kmene kůru stromu: {{ui:surfaceTexture.barkOak}}, {{ui:surfaceTexture.barkPine}}, {{ui:surfaceTexture.barkSpruce}}, {{ui:surfaceTexture.barkBirch}} nebo {{ui:surfaceTexture.barkBeech}}, každou ve vlastní velikosti a hloubce. {{ui:surfaceTexture.wood}} udělá z tělesa kus dřeva: v {{ui:inspector.surfaceWoodType}} zvolíte dub, jasan, buk, borovici nebo ořech, v {{ui:inspector.surfaceWoodCut}} kmen bez kůry nebo prkno, v tangenciálním řezu s oblouky nebo v radiálním s rovnými čarami. {{ui:inspector.surfaceRingWidth}} dělá kresbu jemnou nebo hrubou. S volbou {{ui:inspector.surfaceEndRings}} ukazují konce kmene letokruhy, které odpovídají kresbě na bocích: letokruhy procházejí celým tělesem jako ve skutečném kusu dřeva. V části {{ui:inspector.more}} přidáte {{ui:inspector.surfaceWoodKnots}} a letokruhy se kolem nich ohýbají.

Vzorem {{ui:surfaceTexture.text}} nalepíte na těleso text jako přitlačený štítek: povrch se kolem místa rozvine, takže písmena si zachovají velikost na břiše vázy, na šikmé stěně i přes hranu krabičky. Kam přijde, určuje „Dokola“ (0° je vpředu, 90° vpravo) a „Výška“ v % podél osy; leží-li osa na X nebo Y, je 0° nahoře – tak se text dostane na plochou desku. Volbou {{ui:inspector.surfaceDirection}} se vyryje, nebo vystoupí. Přes skutečný roh se trhá jako samolepka; stavový řádek to pak oznámí. {{ui:prop.textVertical}} i zde skládá písmena pod sebe.

Má-li část tělesa zůstat hladká nebo dostat vzor jen část, použijte pomocné těleso: umístěte tam kvádr, válec nebo kouli, vyberte je a v položce {{ui:inspector.surfaceMask}} zvolte {{ui:surfaceTexture.maskExclude}} nebo {{ui:surfaceTexture.maskOnly}}. Stane se průhledným a uplatní se, když druhé těleso dostane texturu, i když je skryté. Před tiskem je skryjte nebo smažte.

Výsledek je síť jako importovaný model a ponechává si těleso, na kterém vznikl. Když ho později vyberete, i po uložení, karta ukáže nastavení, se kterým vznikl: změňte je a klikněte na {{ui:inspector.surfaceChange}}; textura se znovu spočítá na tomto tělese, tam a v takové velikosti, jak teď stojí těleso s texturou. {{ui:inspector.surfaceRemove}} vrátí hladké těleso. Maskovací tělesa se při změně uplatní znovu: pokud chcete texturu později ještě měnit, raději je skryjte, než abyste je smazali. Zpět vrátí každý z těchto kroků také.

## Váza

{{ui:shape.vase}} je samostatné těleso pro vázy, květináče a stínidla. Její rozměry najdete v {{ui:inspector.properties}}, tvar a vzor na kartě {{ui:inspector.vaseForm}}; vše lze kdykoli změnit, i po uložení:

- {{ui:prop.vaseProfile}}: láhev, baňatá, mísa s hrdlem, sud, válec nebo trychtýř. Výška a největší průměr jsou rozměry samotného tvaru: táhněte za úchyty nebo zadejte {{ui:prop.vaseDiameter}} a {{ui:prop.height}}.
- {{ui:prop.vaseSection}}: kruh, mnohoúhelník se zaoblenými rohy nebo vlna (měkká, špičatá, oblouky nebo lamely). {{ui:prop.vaseTwist}} ho po výšce stáčí, {{ui:prop.vaseSway}} ho nechá kývat sem a tam.
- {{ui:prop.vaseBody}}: {{ui:vase.bodySolid}} je pro režim vázy ve sliceru (také „spiralizace“): slicer tiskne jednu stěnu ve spirále a vynechá víko i výplň, proto je těleso kreslené plné. {{ui:vase.bodyHollow}} dává skutečnou stěnu a dno pro běžný tisk. S {{ui:prop.vaseBottom}} na 0 mm nemá dutá váza dno: trubka otevřená na obou koncích, pro roztruby, náustky a trubky.
- {{ui:prop.vaseEffect}}: nová váza je hladká. Na výběr jsou drážky, pruhy, Voronoiovy buňky nebo fazety (low poly) zvenku, podle přání jen v části výšky; patří k váze a zůstávají s ní upravitelné.

{{ui:prop.vaseSection2}} nechá průřez po výšce plynule přejít ve druhý, například z kruhu dole do šestiúhelníku nahoře.

Tlačítko {{ui:inspector.vaseDraw}} nahoře v nastavení vázy otevře vlastní velké okno nad pracovní plochou: v něm si vázu nakreslíte sami, ve skutečných milimetrech. Posunete ho za titulní lištu a za roh ho zvětšíte; váza v zobrazení sleduje každou změnu. {{ui:vaseDraw.tabProfile}} ji ukazuje ze strany: táhněte body, nejvyšší určuje výšku, nejširší průměr; {{ui:vaseDraw.handle}} dává bodu úhel, {{ui:vaseDraw.corner}} zlom. {{ui:vaseDraw.tabSection}} ukazuje průřez shora a {{ui:prop.vaseDrawSymmetry}} nakreslené zrcadlí nebo opakuje. {{ui:vaseDraw.tabTwist}} kreslí zkroucení jako křivku po výšce. Soubor SVG z kreslicího programu se stane průřezem nebo tvarem těla, síť vzorové vázy (STL, 3MF, OBJ) tvarem těla. Fotografii vázy lze podložit a obkreslit, nebo {{ui:vaseDraw.takeOutline}} převezme její obrys. Jedno tažení myší je jeden krok zpět; dokud táhnete, zobrazení ukazuje vázu zhruba.

Karta {{ui:inspector.vaseFloor}} obsahuje, co těleso potřebuje kromě tvaru. U duté vázy: odtokové otvory se spádem k nim, dutou nožku, prolamovanou stěnu ({{ui:prop.vaseCutout}}: Voronoi, plástev, kosočtverce nebo kruhy, pro lucerny a košíky) a {{ui:prop.vaseLamp}}, závěsné, stojací s objímkou nebo nad LED pukem. U plné vázy vyřízne {{ui:prop.vaseReinforce}} jemné štěrbiny, kterými slicer v režimu vázy přitiskne žebra uvnitř nebo dvojitou stěnu, v jednom tahu. Prohlubně pro gumové nožky jdou u obou. {{ui:prop.vaseWatertight}} zvýší stěnu a dno duté vázy alespoň na 1,6 mm.

Na kartě {{ui:inspector.vaseParts}} dostane váza své příslušenství. {{ui:prop.vaseLegs}} mohou být přitvarované, pak patří k váze, nebo zasouvací, s pouzdry ve dně; stojan nese vázu zespodu. {{ui:prop.vaseSaucer}} zachytí vodu nebo je schovaná v patce. Dutá váza může mít i vložku ({{ui:prop.vaseInsert}}): vložku na rostlinu, vložku se zásobníkem vody pro samozavlažovací květináč, držák na stonky nebo trubičky na vodu. {{ui:prop.vaseLid}} se nasadí přes okraj, zacvakne do drážky nebo se našroubuje na závit ve stěně. {{ui:inspector.vasePartsMake}} rozloží díly vedle vázy jako samostatné objekty připravené k tisku, otočené vzhůru nohama tam, kde se tak tisknou lépe. Pouzdra, drážku nebo závit už váza má. Po změně je rozložte znovu: předchozí díly se nahradí. Když díl k této váze nepasuje, editor to řekne, například když by vložka neprošla úzkým hrdlem.

Karta {{ui:inspector.vasePrint}} říká, co váza potřebuje k tisku: hmotnost ve zvoleném materiálu ({{ui:prop.vaseMaterial}}) a délku filamentu – u plné vázy spočtenou pro režim vázy ve sliceru, s jednou linkou podél stěny. Pod tím jsou poznámky k tisku: převis přes 45° i s výškou, příliš tenká stěna, co potřebuje víko, lampa nebo nohy, a nastavení sliceru pro žebra a dvojitou stěnu.

{{ui:prop.vaseQuality}} určuje, jak jemně se váza rozdělí na trojúhelníky: jemnější vypadá hladší, ale u velkých váz zpomaluje editor.
