---
title: Tělesa a výřezy
summary: Jak z jednoduchých tvarů vznikají otvory, drážky a kapsy a jak později upravit sloučený celek.
---

Nejdůležitější princip Layerlingu je jednoduchý: **Každý tvar je buď plné těleso, nebo výřez.** Plné těleso zůstává. Výřez slouží jako nástroj pro odebrání materiálu.

## Plné těleso nebo výřez

Vyberte tvar a v jeho nastavení klikněte na {{ui:inspector.solid}} nebo {{ui:inspector.hole}}. Rychlejší jsou klávesy: [[H]] změní výběr na výřez a [[S]] zpět na plné těleso. Obě volby najdete také v nabídce po kliknutí pravým tlačítkem na těleso. Výřez se zobrazuje průhledně, abyste viděli jeho polohu. Klávesa [[T]] zprůhlední běžné těleso, například pro nahlédnutí do krytu; dalším stisknutím průhlednost vypnete. Platí pro celý výběr: pokud je alespoň jedno těleso průhledné, všechna se stanou neprůhlednými, jinak se zprůhlední všechna.

Dokud tvary nesloučíte, výřez nic neodebírá. Jen ukazuje, kde později zmizí materiál.

![Válec je výřez a vyčnívá nad kvádr, aby jej prořízl v celé výšce.](shot:hole-before)

## Sloučení

Vyberte plná tělesa i výřezy a zvolte {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Výřezy odeberou materiál z těles, která protínají. Výsledek tvoří jeden nový tvar.

![Výsledek: kvádr s otvorem.](shot:hole-after)

Tímto způsobem vznikají:

- **Otvory:** válec nastavený jako výřez prochází skrz těleso.
- **Drážky:** podlouhlý kvádr jako výřez u okraje.
- **Kapsy:** výřez, který neprochází celým tělesem.
- **Závity v dílu:** závitový otvor jako výřez, viz [Závity a mechanické díly](chapter:threads-and-mechanics).

Pokud sloučení obsahuje více plných těles, spojí se. Dvě dotýkající se tělesa vytvoří jediný díl.

U velkých sítí, například u importovaného STL se stovkami tisíc trojúhelníků, trvá řez několik sekund. layerling pak pracuje na pozadí a ukazuje „{{ui:status.computing}}“; mezitím můžete otáčet pohledem a používat rozhraní. Změníte-li v té době scénu, výsledek se zahodí a layerling vám to oznámí. Totéž platí pro {{ui:editor.tool.split}}.

Se sloučeným celkem pracujete jako s běžným tvarem: přesouváte ho, otáčíte, měníte barvu nebo znovu slučujete. Příkaz {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) sloučení rozloží na původní části.

### Změna sloučeného celku na výřez

I celý sloučený tvar může být plným tělesem nebo výřezem. Platí jednoduché pravidlo:

- Obsahuje-li pouze plná tělesa nebo pouze výřezy, změna se provede u celku i všech jeho částí.
- Obsahuje-li obojí, například kvádr s otvorem, každá část si zachová svůj režim. Celek se změní na odečítací nástroj, ale jeho otvor zůstane otvorem.

### Změna velikosti sloučení: výřezy a malé díly zůstanou

Když sloučení prodloužíte, rozšíříte nebo zvýšíte, jeho díly se roztáhnou s ním, jako by byly nakreslené na gumě: kulaté otvory v desce se změní v ovály a posunou se dovnitř. Aby zůstaly takové, jaké jsou, zvolte v nastavení sloučení u {{ui:inspector.groupResize}} možnost {{ui:inspector.groupResizeKeepParts}}; bez této volby platí {{ui:inspector.groupResizeStretch}}, jako dosud u každého sloučení. Od té chvíle se sloučení při každé změně velikosti - úchyty, v polích rozměrů nebo pomocí {{ui:scalePercent.title}} - znovu sestaví ze svých dílů podle jediného pravidla, pro každý směr zvlášť:

- Díl, který sahá téměř přes celé sloučení, z devíti desetin nebo víc, roste nebo se zmenšuje s ním a drží si vzdálenost k oběma stranám: samotná deska, stěna nebo vnitřek krabičky, jejíž stěny zůstanou stejně silné.
- Každý jiný díl si zachová vlastní velikost i vzdálenost k bližší straně. Díl uprostřed zůstane uprostřed.

Deska s otvorem 5 mm od každého rohu a drážkou uprostřed, prodloužená o 40 mm, si tedy zachová kulaté otvory 5 mm od rohů a drážku uprostřed. Nestojí za tím žádný řešič vazeb a nic nenastavujete díl po dílu: pro všechny díly platí stejné pravidlo, takže předem víte, co se stane. Otočený díl se počítá podle kvádru, který ve sloučení zabírá, a zůstane otočený; sloučení uvnitř sloučení se počítá jako jeden díl. Zatímco táhnete úchytem, sloučení se roztahuje jako celek; jakmile pustíte, sestaví se znovu, v tomtéž kroku zpět. Zmenšíte-li sloučení pod to, co díl se svou vzdáleností potřebuje, zmenší se tento díl s ním jako dřív a zpráva vás na to upozorní. Zrcadlené, zúžené nebo zkroucené sloučení a sloučení s vlastním zaoblením, zkosením nebo texturou roztáhne vždy vše. Zvolíte-li toto nastavení u sloučení, které už je roztažené, jeho díly se hned rozmístí znovu.

![Deska s otvorem 5 mm od každého rohu a drážkou uprostřed, prodloužená o 40 mm s volbou „Zachovat výřezy a malé díly“: otvory jsou stále kulaté a 5 mm od rohů, drážka je stále uprostřed.](shot:group-keep-parts)

## Seskupení

Někdy mají díly jen držet pohromadě, aniž by se spojila jejich geometrie. Příkladem je bílé logo na černé destičce pro vícebarevný tisk. K tomu slouží {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), podobně jako v Tinkercadu. Skupina se přesouvá, otáčí a mění velikost jako jeden tvar, ale její části se neslučují:

- Každá část si zachová barvu i režim plného tělesa nebo výřezu. Nastavení seskupení má stejné karty jako sloučení: {{ui:inspector.solid}} a {{ui:inspector.hole}} pro celé seskupení (barvy částí zůstanou), {{ui:inspector.transparent}} ([[T]]) a {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); s vypnutou vícebarevností se seskupení zobrazuje i exportuje jednou barvou. {{ui:inspector.separateParts}} seskupení rozloží, stejně jako [[Ctrl]]+[[Shift]]+[[G]].
- Výřezy nic neodebírají.
- V exportu STL, 3MF a OBJ zůstává každá část samostatným tělesem; 3MF a OBJ zachovávají také barvy.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) skupinu znovu rozloží. Klávesa [[E]] ji otevře pro úpravy stejně jako sloučení. Na skupinu nelze použít zkosení, zaoblení ani vytvoření dutiny, protože netvoří jediné těleso. Nejprve ji slučte nebo upravujte její části samostatně. Má-li výřez uvnitř skupiny skutečně odebrat materiál, skupinu slučte pomocí Ctrl+G.

## Průnik

{{ui:editor.tool.intersect}} zachová pouze prostor společný dvěma nebo více tělesům. Umístěte dva tvary tak, aby se překrývaly, vyberte je a spusťte příkaz. Z válce a kvádru tak vznikne například díl s jednou oblou a jednou rovnou stranou. Sloučený tvar se vyhodnocuje podle skutečné geometrie včetně otvorů. Obsahuje-li výběr i výřez, zachová se společná oblast všech plných těles a všech výřezů.

{{ui:editor.tool.hull}} obalí vybrané tvary jedním konvexním tělesem, jako by byly zataveny do smršťovací fólie: nejmenším tělesem bez promáčklin, které je všechny pojme. Polokoule na válci se stane kopulí bez schodu, čtyři válce v rozích kvádrem se zaoblenými rohy, dvě koule kapslí. Výřezy ve výběru se z obalu potom vyříznou. Díly v něm zůstanou: {{ui:group.edit}} otevře obal jako sloučení a posunutí dílu v něm a zavření obal postaví znovu. Obal je síť, proto jsou na oblých tvarech vidět plošky a nástroje hran s ním pracují jako s každou sítí. Jsou-li vybrány jen výřezy, je obal sám výřezem: dva válcové výřezy vyříznou drážku. Obal vyplní vše, co je v jeho dílech duté: trubku, válec vydutý nástrojem {{ui:editor.tool.hollow}}, díl seskupený se svými otvory. Zapněte ve Vlastnostech {{ui:inspector.hullKeepHoles}}, aby zůstaly otevřené: obal pak vyplní jen prostor mezi díly a vybrání na boku dílu zůstane také.

{{ui:editor.tool.cookieCutter}} udělá z výběru vykrajovátko: tenkou stěnu kolem obrysu vysokou 15 mm a plochý lem 2 mm kolem její paty, takže vykrajovátko stojí na lemu a palec má na co tlačit. Vyberte jeden importovaný SVG nebo jedno těleso z náčrtu a použije se jeho vlastní obrys. Ležící text dá vlastní křivky svých písmen. Každý jiný tvar, sestavený, importovaná síť nebo více dílů, dá to, na čem stojí: obrys, který jím prořízne pracovní rovina, takže ho nejdřív postavte na pracovní rovinu. Díly, které se překrývají, dají jeden obrys kolem všech, jako by byly sloučené; díly od sebe oddělené dají každý vlastní vykrajovátko ve stejném seskupení. Obrys se zrcadlí zleva doprava: vykrajovátko se tiskne stojící na lemu a k vykrajování se obrátí, takže text nebo logo vyjde na těstě správně. Vršek stěny se sbíhá do řezné hrany široké 0,4 mm. Otvory v obrysu, vnitřek písmene e nebo a, dostanou vlastní stěny, takže se z sušenky také vykrojí. Jsou samostatným tělesem v seskupení, {{ui:cookieCutter.part.innerWalls}}: chcete-li text nebo vzor do těsta jen vtisknout místo vykrojení, snižte je ve Vlastnostech. Se stěnou 15 mm a těstem tlustým 5 mm vtisknou vnitřní stěny 12 mm do hloubky 2 mm. Vnitřní stěny nižší než vnější stěna mají místo řezné hrany plochý vršek: jen tlačí, a hrana by nechala tenké špičky, které se ulomí, a rýhy, ve kterých uvízne těsto. Pokud hranu chcete, dejte jim ji ve Vlastnostech. Dva můstky u lemu, na straně, na kterou tlačí ruka, drží každou vnitřní stěnu u stěny kolem ní, rozmístěné dokola, široké 4 mm a vysoké 3 mm. Každý můstek stojí celou šířkou na stěnách, uprostřed strany, která vede podél obrysu, a nikdy přes jiný díl. Díly vedle sebe, třeba písmena jména, se také spojí navzájem, nejbližší nejdřív, takže můstky vedou sítí přes všechny a drží i písmeno uprostřed slova. Kliknutí na nástroj otevře malé okno: tam místo můstků zvolíte {{ui:cookieCutter.support.plate}}, která vyplní celý obrys na straně, kam tlačíte, je stabilnější a lépe drží na tiskové podložce, ale už nedovolí vytlačit těsto zezadu. {{ui:cookieCutter.fillet}} přidá malé svahy 45° tam, kde stěny stojí na lemu, můstcích nebo desce, aby se tenké díly jako tečka nad i neulomily; jsou samostatným tělesem v seskupení. Tam také nastavíte, o kolik jsou vnitřní stěny nižší a zda se obrys zrcadlí; hodnoty zůstanou pro další vykrajovátko. Jejich výšku měňte ve Vlastnostech jako výšku lemu. Vykrajovátko nahradí výběr seskupením těles z náčrtu, {{ui:group.edit}} ho otevře. Stěna, vnitřní stěny a lem jsou režimy výplně náčrtu, čára vně siluety: tloušťku, výšku nebo barvu každého měňte ve Vlastnostech, a tam i {{ui:prop.sketchCuttingEdge}} stěny (0 pro plochý vršek). Kde ostrý ohyb nenechá místo na zkosení z obou stran, zkosí se stěna jen zvenku, na stejnou hranu. Kde obrys zkosit vůbec nejde - logo s ostrými hroty, obrys vyříznutý z trojúhelníků tělesa -, postaví se hrana místo toho z jemných schodů po 0,1 mm, které tisková vrstva 0,2 mm od svahu nerozliší; taková stěna je síť trojúhelníků, ne přesné těleso. Chcete-li obrys zachovat tak, jak je nakreslený, zrcadlete vykrajovátko zpět nástrojem {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Funguje i obrázek PNG nebo JPG: při importu se obtáhne na těleso z náčrtu a vykrajovátko sleduje to.

{{ui:editor.tool.loftSketches}} spojí dvě tělesa z náčrtu nebo importované SVG do jednoho tělesa: obrys spodního dole, obrys horního nahoře, s rovnými stěnami mezi nimi. Tak vznikne trychtýř, přechodový kus ze čtverce na kruh nebo rámeček, který se nahoru zužuje. Postavte obě tělesa nad sebe tam, kam patří, posunutá a pootočená, jak chcete, vyberte obě a klikněte na nástroj. Loft sahá od spodku spodního tělesa po vršek horního.

## Vyříznutí jednoho tělesa z druhého

U dílů, které k sobě musí pasovat, hřídele v objímce nebo šroubu ve skříňce, vytvoříš jeden díl a vyřízneš ho z druhého. Vyber obě tělesa a klikni na {{ui:editor.tool.cutOut}} v oblasti {{ui:editor.group.combine}}, nebo klikni pravým tlačítkem a vyber to tam. Okno uvádí díl, který zůstane, a těleso, které dostane dutinu; layerling bere menší těleso jako díl a {{ui:cutOut.swap}} to otočí. {{ui:cutOut.clearance}} udělá dutinu ze všech stran o tolik větší než díl: 0 sedí přesně, 0,2 mm je obvyklá vůle pro tištěné spojení. {{ui:cutOut.apply}} vyřízne kopii dílu z druhého tělesa a samotný díl nechá, kde je. Výsledkem je skupina: {{ui:editor.tool.ungroup}} řez zase rozloží. Vůle vyžaduje, aby díl byl přesné těleso, jako u nástroje {{ui:editor.tool.offset}}, který se k tomu používá.

## Proražení obrysu tělesem

Chcete-li vyříznout obrys jednoho tělesa rovně skrz druhé, vyberte nejprve razník a potom těleso k proražení a klikněte na {{ui:editor.tool.punch}} v oblasti {{ui:editor.group.combine}}, nebo to zvolte po kliknutí pravým tlačítkem. Tělesa se nemusí dotýkat: razník může stát kdekoli před tělesem a počítá se jen jeho obrys při pohledu ve směru ({{ui:punch.axis}}). Konvice držená nad deskou v ní tak zanechá otvor ve tvaru konvice. layerling začne osou, podél které stojí razník od tělesa nejdál; X vede zleva doprava, Y zepředu dozadu, Z nahoru. {{ui:punch.swap}} prohodí role a {{ui:punch.clearance}} zvětší otvor po celém obvodu, 0,2 mm pro tištěný díl, který má projít. {{ui:punch.apply}} seskupí otvor s tělesem jako přesné těleso skici nastavené jako díra, takže {{ui:editor.tool.ungroup}} ho zase odebere; razník zůstane, kde je. Posuňte ho nebo otočte a prorazte znovu pro jiný otvor.

## Úprava sloučení

Příliš malý otvor nemusíte opravovat rozložením a novým sestavením celého dílu. Vyberte sloučený celek a použijte {{ui:group.edit}} v jeho nastavení, ikonu složky v seznamu objektů nebo klávesu [[E]]. Totéž provede dvojklik na celek, stejně jako v Tinkercadu; funguje i pro skupinu. Pokud dvojklik nechcete používat, vypněte {{ui:workspace.doubleClickOpensGroup}}. Těleso se začne přesouvat až po tažení o několik pixelů, takže nepřesný klik ani dvojklik neposune jeho polohu. Jednotlivé části nyní můžete upravovat všemi nástroji: zvětšit otvor, přesunout těleso nebo přidat výřez.

![Úprava sloučení: spodní lišta obsahuje Zrušit a Hotovo, seznam objektů ukazuje jednotlivé části.](shot:open-group)

Ve spodní části plochy se objeví lišta. {{ui:group.done}} sloučení znovu sestaví a zachová jeho název, barvu i režim plného tělesa nebo výřezu. {{ui:common.cancel}} vrátí původní stav.

Je-li některá část sama sloučeným celkem, můžete ji stejným způsobem otevřít a pokračovat do libovolné hloubky. Lišta ukazuje aktuální cestu, například „Držák › Sloupek pro šroub“. {{ui:group.done}} i {{ui:common.cancel}} vždy ukončí nejvnitřnější úpravu a vrátí vás o úroveň výš. Při úpravě jsou dostupné jen sloučené části právě otevřeného celku. Chcete-li otevřít jiný celek, nejprve aktuální úpravu dokončete.

Na rozdíl od {{ui:editor.tool.ungroup}}, které sloučení trvale rozloží, tato úprava zachovává celek, jeho název i nastavení. Pomocí {{ui:common.cancel}} se můžete vždy vrátit.

Upozornění: zkosení a zaoblení provedená na **celém** sloučeném tělese se při opětovném sestavení ztratí. Lišta na to upozorňuje.

## Rozdělení

{{ui:editor.tool.split}} v části {{ui:editor.section.splitShape}} rozdělí výběr rovinou na dvě části. Hodí se pro díl přesahující tiskovou podložku nebo pro prohlédnutí jeho vnitřku. Vyberte jedno či více plných těles nebo výřezů a spusťte nástroj. Průsvitná rovina ukazuje místo řezu; do potvrzení se nic nemění.

- {{ui:split.orientation}}: **X** znamená svislý řez mezi levou a pravou stranou, **Y** mezi přední a zadní stranou a **Z** vodorovný řez mezi horní a spodní částí. Osy odpovídají panelu polohy, Z míří vzhůru. Výchozí řez je v ose Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} položí rovinu rovnoběžně s pracovní rovinou, {{ui:split.workplaneAcrossX}} a {{ui:split.workplaneAcrossY}} ji postaví kolmo k ní, napříč jejím směrem X nebo Y. Protíná-li počátek pracovní roviny výběr, vede rovina přes něj, jinak středem. Na základní podložce vedou {{ui:split.workplaneAcrossX}} a {{ui:split.workplaneAcrossY}} vždy středem výběru, protože střed podložky s díly nesouvisí. Tak položíš pracovní rovinu pomocí [[W]] na šikmou plochu a řízneš přesně tam, bez otáčení posuvníků.
- {{ui:split.position}} určuje polohu roviny pomocí posuvníku nebo číselného zadání. Začíná uprostřed výběru. Rovinou lze také posouvat za hrot šipky, v krocích 0,1 mm.
- {{ui:split.pickFace}} vedle polohy přiloží rovinu na plochu tělesa. Klikněte na tlačítko a pak na požadovanou plochu. Orientace, obě natočení i poloha se přizpůsobí. Během výběru ukazuje modrá rovina pod kurzorem zaměřenou plochu. Lze použít i plochu nevybraného tělesa, rovina však zůstává v rozsahu výběru. [[Esc]] ukončí výběr plochy a ponechá rovinu na místě.
- Dva posuvníky natočení umožňují otáčet rovinou kolem zbývajících os až o 180° na obě strany. Natočení lze kombinovat.

{{ui:split.apply}} nebo [[Enter]] provede řez, [[Esc]] jej zruší. Při vybírání plochy první [[Esc]] ukončí pouze toto vybírání. Každý protnutý objekt se rozdělí na dvě uzavřená tělesa pojmenovaná podle strany, například „Kvádr (Z+)“ a „Kvádr (Z-)“. Neprotnuté objekty se nezmění. Výřez se rozdělí na dva výřezy a duté těleso si zachová dutinu. Obě poloviny zůstanou na původním místě. Pro tisk je položte řeznou plochou na podložku pomocí {{ui:editor.tool.layFlat}}.

{{ui:split.connectors}} znovu vyrovnají poloviny, jak to dělají nástroje pro řez v PrusaSliceru, OrcaSliceru a Bambu Studiu. S volbou {{ui:split.connectors.none}}, výchozí, se dělí, jak je popsáno výše. {{ui:split.connectors.dowels}} udělají otvor v každé polovině a volné kolíky, které zapadnou do obou: kolíky přibudou jako třetí těleso, stojící vedle polovin na jejich spodku, a tisknou se s nimi – ve stoje vycházejí ve vrstvách kulaté jako jejich otvory, a právě to měří test vůle. {{ui:split.connectors.plugs}} postaví kulaté čepy na polovinu, jejíž název končí mínusem, a otvory pro ně udělají v druhé polovině. Spojovací prvky vedou kolmo k rovině, ať je natočená jakkoli, každý se svým průměrem a 1,2 mm materiálu ke každému okraji plochy řezu a dva od sebe dvakrát tak daleko. Každý samostatný kus plochy řezu dostane vlastní, rovnoměrně po něm rozložené: {{ui:split.connectorCount}} udává kolik a 0 to nechá na velikosti kusu, nejméně dva. Kus, který je i pro jeden příliš malý, nedostane žádný, a spojovací prvek se vynechá tam, kde je polovina tenčí, než je jeho otvor hluboký; panel to řekne ještě před rozdělením a bílé kroužky na rovině ukazují, kam přijdou. Pokud se nevejde žádný, díly se rozdělí bez nich a stavový řádek to oznámí.

- {{ui:split.connectorDiameter}} je průměr kolíků a čepů, zpočátku 5 mm.
- {{ui:split.connectorDepth}} je, jak hluboko jde každý otvor do své poloviny. Kolík je dvakrát tak dlouhý bez 0,6 mm a čep o 0,3 mm kratší než jeho otvor, aby nikdy nestály na dně otvoru a poloviny se úplně dovřely. Kolíky a čepy mají na koncích malé sražení a každý otvor jedno u svého ústí, aby ho rozteklá první vrstva nezúžila.
- {{ui:split.dowelBase}} postaví u {{ui:split.connectors.dowels}} volné kolíky na společnou destičku, která drží na podložce, pro tiskárny, jejichž pohyblivá podložka stojícími kolíky kývá. Každý kolík stojí na malém výstupku v lůžku destičky; po tisku každým zakývejte, až se odlomí, stejně jako zkušební čep.
- {{ui:split.connectorClearance}} je místo mezi kolíkem nebo čepem a jeho otvorem. Jakmile změříte vůli své tiskárny testem vůle (v kapitole o tisku), začíná od ní, jinak od 0,2 mm.

{{ui:split.connectors.dovetail}} drží poloviny pohromadě bez lepidla, jako rybinový řez v OrcaSliceru: lišta, která se směrem od plochy řezu rozšiřuje, stojí na polovině, jejíž název končí mínusem, a vede rovně přes plochu řezu od okraje k okraji; druhá polovina dostane odpovídající drážku, otevřenou na obou koncích. Zasuňte poloviny do sebe ze strany, podél lišty; pak už je nelze odtáhnout napříč řezem. Lišty vedou podél delší strany plochy řezu, a když těleso protíná rovinu v několika kusech, vedou na všech stejným směrem, aby se polovina nasunula jedním pohybem. {{ui:split.connectorCount}} je počet lišt vedle sebe na každém kusu; 0 to nechá na šířce kusu, jedna na každých šest šířek lišty, nejméně jedna. Vedle své široké horní strany si lišta nechá polovinu své šířky a dalších 1,2 mm materiálu k okraji plochy řezu a dvě lišty od sebe dvakrát tolik. Kus, který je na lištu příliš úzký nebo v jejím směru příliš krátký, nedostane žádnou, a lišta odpadne tam, kde je druhá polovina tenčí, než je hluboká její drážka. Bílé obrysy na rovině ukazují, kam přijdou: vyplněný pruh je pata lišty, čára kolem ní její široká horní strana.

- {{ui:split.dovetailWidth}} je šířka lišty tam, kde vychází z plochy řezu, zpočátku 6 mm.
- {{ui:split.dovetailDepth}} je, jak daleko vyčnívá z plochy řezu do druhé poloviny, zpočátku 4 mm. Drážka je o 0,3 mm hlubší, aby se poloviny úplně dovřely.
- {{ui:split.dovetailAngle}} je, jak moc se každý bok odklání ven od kolmice k ploše řezu, od 5° do 30°, zpočátku 15°. Čím větší, tím širší je horní strana lišty a tím pevněji drží.
- {{ui:split.dovetailTurn}}: 0 vede lišty podélně, 90 napříč plochou řezu a úhel mezi tím je natočí o tolik.
- {{ui:split.connectorClearance}} je místo na každé straně mezi lištou a její drážkou, z vašeho testu vůle jako u kolíků. Konce lišty jsou dokola sražené, aby našla drážku, a drážka má sražení u svého ústí.

Pro tisk položte polovinu s drážkou na její plochu řezu a polovinu s lištou tiskněte obráceně, plochou řezu nahoru: boky lišty se pak odklánějí ven jen o svůj úhel, a to se vytiskne bez podpor.

Výřezy se rozdělují bez spojovacích prvků.

{{ui:split.modeStretch}} nahoře v panelu vedle {{ui:split.modeSplit}} výběr v rovině prodlouží, místo aby ho rozřízl na dvě části - třeba staženou krabičku bez souboru CAD, jejíž přihrádka má být delší. Umístěte rovinu jako při dělení, přes část, která smí narůst, a zadejte {{ui:split.stretchLength}}: část na straně, kam ukazuje šipka, se posune o tuto délku a řez tělesem v rovině, protažený o tuto délku, vyplní mezeru. Rovné stěny a dna se prodlouží; přihrádky, zaoblení a otvory na obou stranách si zachovají velikost. Záporná hodnota ho zkrátí: na straně šipky se odebere plátek této tloušťky a zbytek se přisune. {{ui:split.stretchApply}} změnu použije; každý objekt, který rovina protne, zůstane jedním uzavřeným tělesem se svým názvem, polygonovou sítí jako poloviny při dělení. Vede-li rovina šikmou nebo zaoblenou částí, její řez se protáhne rovně; umístěte ji proto tam, kde je těleso rovné.

Poloviny jsou běžné polygonové sítě. Parametry původního tvaru, například počet stran válce nebo text nápisu, už nemají; nastavte je před rozdělením. [[Ctrl]]+[[Z]] obnoví originál jediným krokem. Zamčené a skryté objekty nelze rozdělit.

## Oddělení částí

Skládá-li se tvar z více nespojených částí, například text z jednotlivých písmen, {{ui:inspector.separateParts}} je oddělí do samostatných tvarů. Položku najdeš také v nabídce, která se otevře pravým kliknutím na tvar.

> **Tip:** Výřezy dělejte o něco delší než díl, kterým mají projít. Pokud končí přesně na jeho povrchu, může zůstat velmi tenká blána. Přesah o jeden milimetr tomu pomůže předejít.
