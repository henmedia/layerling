---
title: Úpravy hran a vytváření dutin
summary: Zkosení a zaoblení vybraných hran a rovnoměrné stěny krabiček, nádob a krytů.
---

## Zkosení a zaoblení hran

Ostré hrany na výtisku často nevypadají dobře a nejsou ani příliš odolné. **Zkosení** hranu seřízne pod úhlem, **zaoblení** ji nahradí oblou plochou. Oba nástroje upravují hrany, které vyberete kliknutím.

1. Vyberte těleso nebo sloučený celek.
2. Zvolte {{ui:editor.tool.fillet}} nebo {{ui:editor.tool.chamfer}} v pásu nástrojů. Zaoblení otevřete také klávesou [[B]], zkosení pomocí [[Shift+B]]. Obě volby jsou i v nabídce pravého tlačítka na tělese.
3. Hrany se zvýrazní. Kliknutím je přidáváte do výběru nebo z něj odebíráte. Se [[Shift]] změníte výběr jediné hrany.
4. Nastavte velikost a potvrďte pomocí {{ui:edge.apply}} nebo [[Enter]]. Potom zůstane okno otevřené na novém tělese se stejnou velikostí, takže může hned následovat další zaoblení nebo zkosení; zavře ho {{ui:edge.done}}, [[Esc]] nebo křížek. S [[Shift]] nebo [[Ctrl]] kliknutí na {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} nebo {{ui:edge.horizontalEdges}} tyto hrany přidá k vybraným místo jejich nahrazení.

![Nástroj pro zaoblení hran: vybrané všechny ostré hrany a náhled poloměru 4 mm.](shot:fillet-preview)

Okno nástroje se otevře vpravo nahoře. Překáží-li při výběru hran, přetáhněte jej za záhlaví. Příště se otevře na stejném místě; platí to i pro {{ui:editor.tool.hollow}} a {{ui:editor.tool.array}}. Dvojklik na záhlaví vrátí původní polohu.

Vyberete-li při otevřeném okně jiný tvar z knihovny, nástroj se zavře bez použití úpravy a zapomene vybrané hrany. Následující kliknutí pak umístí nový tvar.

Okno nabízí:

- {{ui:edge.allSharpEdges}} vybere všechny hrany, {{ui:edge.clear}} výběr vyprázdní.
- **{{ui:edge.radius}}** určuje poloměr zaoblení. U zkosení zadáváte {{ui:edge.distance}} nebo {{ui:edge.angle}}.
- {{ui:edge.variableRadius}} (jen zaoblení) nechá poloměr měnit se podél jedné hrany: malý na jednom konci, větší na druhém, rovnoměrně mezi nimi, jako tam, kde rovná stěna potkává šikmou. Klikněte na jednu hranu a nastavte {{ui:edge.radiusStart}} a {{ui:edge.radiusEnd}}. Který konec je začátek, vyplývá z toho, jak byla hrana postavena; vyjde-li větší poloměr na špatném konci, {{ui:edge.swapEnds}} ho obrátí. Funguje to vždy na jedné hraně, proto zaoblujte více hran jednu po druhé. {{ui:edge.editAction}} vrátí obě hodnoty.
- {{ui:edge.concave}} (jen zaoblení) zaoblení obrátí: místo zakulacení hrany z ní vyřízne žlábek ve tvaru čtvrtkruhu, jako vyřezané rohy krabičky. Žlábek je válec zvoleného {{ui:edge.radius}} ležící podél hrany, takže funguje při jakémkoli úhlu mezi plochami, ale jen na rovných hranách a ne spolu s {{ui:edge.variableRadius}}. {{ui:edge.editAction}} ho vrátí.
- {{ui:edge.sharpThreshold}} rozhoduje, které hrany se považují za ostré. Hodnota 25° zachytí zřetelné zlomy a vynechá téměř rovinné přechody.
- {{ui:edge.topEdges}} vybere pouze hrany na horním obvodu tělesa. Hodí se pro vykrajovátko: vytvořte obrys náčrtem jako rozšířenou čáru a pak zkoste jeho horní hrany. {{ui:edge.angle}} určuje sklon zkosení; to nesmí zasahovat dále než do tloušťky stěny.
- {{ui:edge.bottomEdges}} vybere pouze hrany úplně dole na tělese, protějšek tlačítka {{ui:edge.topEdges}}. Je to rychlý způsob, jak zaoblit nebo zkosit jen patu součásti.
- {{ui:edge.chamfillet}}, zvolené nahoře v okně zkosení vedle {{ui:editor.tool.chamfer}}, vytvoří tisknutelnou patu dílu: zkosení u podložky, které tečně přechází v zaoblení ke stěně, takže první vrstvy nepotřebují podpěry a hrana přesto končí měkce. {{ui:edge.distance}} je výška, kterou pata zabírá, {{ui:edge.angle}} (15° až 75°) strmost zkosení u podložky. Hrany vyberete tlačítkem {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} skryje hrany za tělesem. Ve výchozím stavu prosvítají všechny, což může být u složitého dílu nepřehledné. Po zapnutí vybíráte pouze hrany obrácené k vám; pro ostatní otočte pohled. Chybová červená hrana se zobrazuje vždy.
- {{ui:edge.tangentChains}} přidává po kliknutí i plynule navazující hrany, například celý obvod plochy se zaoblenými rohy. Volba ovlivňuje jen výběr kliknutím. CAD jádro vždy pokračuje v úpravě podél tečně navazujících hran. Okno uvádí, kolik dalších hran se tím upraví.
- {{ui:edge.keepSize}} zachová velikost zkosení či zaoblení i při pozdější změně velikosti tělesa.
- {{ui:edge.previewQuality}} nabízí {{ui:edge.draft}}, {{ui:edge.standard}} nebo {{ui:edge.fine}}. U složitých dílů poskytuje {{ui:edge.draft}} rychlejší výpočet.
- Okno si pamatuje svá nastavení v tomto prohlížeči, zvlášť pro sražení, zaoblení a sražení se zaoblením: velikost, úhel, práh, kvalita náhledu a přepínače zůstanou po {{ui:edge.apply}}, po vrácení zpět i při dalším otevření nástroje tak, jak jste je nechali. Velikost, kterou těleso nepojme, ustoupí velikosti spočtené z tělesa. Znovu začíná jen {{ui:edge.tangentChains}}: zapnuto při prvním sražení nebo zaoblení tělesa, potom vypnuto.

Při změně velikosti se náhled přepočítává. Výpočet může chvíli trvat. Hodnotu můžete dál upravovat; použije se poslední zadaná.

Pokud je úprava pro danou hranu příliš velká, Layerling navrhne menší hodnotu. Často stačí ubrat jeden nebo dva milimetry. V ostrých úhlech potřebuje zaoblení více prostoru, než by naznačoval samotný poloměr. Na malém displeji okno samo posune obsah tak, aby bylo hlášení vidět.

Jestliže dříve funkční výběr přestane fungovat po přidání další hrany, tato hrana zčervená a zesílí. Při dané velikosti ji nelze upravit společně s ostatními. Odeberte ji dalším kliknutím nebo zmenšete velikost. Přidáváte-li při zobrazené chybě další hrany, červeně zůstává první problémová. Neexistuje-li předchozí funkční výběr, například při prvním kliknutí nebo po zvětšení poloměru, zčervenají hrany selhávající samostatně, případně celý výběr, pokud vadí až jejich kombinace. A tam, kde se vybrané hrany stýkají v ostrém vnitřním rohu, jako dva kotouče „mráčku“, nemá zaoblení místo při žádné velikosti: layerling pak tyto rohy nejdřív zaoblí stejnou nebo menší velikostí a hlášení řekne kolik a o kolik (u zkosení je zkosí).

Než to vzdá, zkusí to layerling ještě jednou s krátkými hranami na koncích vybraných, dlouhými nejvýš dvojnásobek velikosti. Taková hrana je tam, kde dřívější sražení končí na stěně, která je ještě ostrá: krátká šikmá hrana v rohu, a dokud zůstane ostrá, roh nejde upravit. Pokud to pomůže, jsou tyto hrany potom vybrané také a zpráva řekne, kolik jich bylo přibráno.

Hrana pod ukazatelem se také kreslí silněji, abyste věděli, kterou kliknutí vybere.

Také díra přijme {{ui:editor.tool.chamfer}} a {{ui:editor.tool.fillet}}, stejně jako {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} a {{ui:editor.tool.deleteFace}}: zůstane dírou a řeže svým novým tvarem. Zaoblením čtyř svislých hran díry ve tvaru kvádru vznikne kapsa se zaoblenými vnitřními rohy a díra zvětšená pomocí {{ui:editor.tool.offset}} řeže s o tolik větší vůlí. Hranu, kde se díra setkává s dílem, upravte raději na hotové skupině: tato hrana patří jí.

### Vrácení úpravy hran

Upravené těleso lze upravovat znovu. Vyberte je a otevřete zaoblení, zkosení nebo vytvoření dutiny. Všechna tato okna zobrazují {{ui:edge.featureHistory}}. Příkaz {{ui:edge.revertAction}} vrátí konkrétní úpravu. Pokud na ni navazují novější úpravy, odstraní se také; okno předem uvede jejich počet.

Vedle úpravy je i {{ui:edge.editAction}}. Původní úpravu vrátí stejným způsobem, ale rovnou otevře její nástroj s původním výběrem hran a hodnotou. Zaoblení 3 mm tak změníte na 5 mm bez opakovaného výběru. I zde se zruší navazující úpravy. Možnost platí pro nově vytvořené úpravy; u starších a u jednotlivých částí sloučeného celku lze úpravu pouze vrátit.

Na sloučeném celku, například válci s otvorem, patří upravovaná hrana výslednému tělesu, nikoli některé jeho části. Celek se proto změní na jediné těleso. {{ui:editor.tool.ungroup}} přesto funguje: nejdřív vrátí úpravy hran a pak skupinu rozpustí, jedním krokem, který [[Ctrl]]+[[Z]] vrátí zpět. Vrácením úpravy se obnoví i původní části. Nejjednodušší je upravovat hrany až nakonec. Platí to i pro závity: nástroj pracuje s jejich přesnou geometrií, takže lze zaoblit kvádr se závitovým otvorem a závit zachovat. Příprava hran závitu trvá déle než u jednoduchého tvaru, u M6 několik sekund, u trubkového G1/2 přibližně půl minuty.

> **Dobré vědět:** Layerling při zkosení a zaoblení používá skutečnou CAD geometrii. Zaoblená hrana proto zůstává oblou plochou i při exportu STEP.

Přesnou geometrii si zachová i import STEP. Úpravy hran a dutiny pracují s tělesem ze souboru bez ohledu na jemnost zobrazení. STL, OBJ a 3MF obsahují pouze trojúhelníky a příliš hustá síť může překročit možnosti nástroje. Je-li díl dostupný i jako STEP, použijte jej. {{ui:editor.tool.makeExact}} z takového dílu nejdřív udělá přesné těleso se skutečnými rovinami a válci, viz [Soubory, ukládání a sdílení](chapter:files-and-saving), „Převod importované sítě na přesné těleso“.

## Vytváření dutin

Krabičky, nádoby a kryty mají uvnitř prázdný prostor a rovnoměrně silné stěny. Právě k tomu slouží {{ui:editor.tool.hollow}}.

1. Vyberte těleso a zvolte {{ui:editor.tool.hollow}} v pásu nástrojů nebo nabídce pravého tlačítka.
2. Nastavte {{ui:shell.wall}}.
3. V části {{ui:shell.openings}} zapněte otevřené strany: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} a {{ui:shell.side.right}}. Lze kombinovat libovolný počet. Samotná {{ui:shell.side.front}} vytvoří otvor pro zásuvku, {{ui:shell.side.left}} a {{ui:shell.side.right}} průchozí tunel. Bez otevřené strany vznikne uzavřené těleso s vnitřní dutinou. {{ui:shell.side.closed}} vypne všechny strany jedním kliknutím. {{ui:shell.side.top}} je při otevření okna už zapnuté; kliknutím na něj se horní strana zase zavře. Těleso uzavřené ze všech stran vypadá zvenku beze změny: dutinu ukáže řez.
4. Zvolte, zda mají být {{ui:shell.edges}} nastavené na {{ui:shell.edges.round}} nebo {{ui:shell.edges.sharp}}.
5. Potvrďte {{ui:shell.apply}}.

![Okno pro vytvoření dutiny: tloušťka stěny, otevřené strany a nastavení vnitřních hran.](shot:hollow-panel)

Stěny vznikají směrem dovnitř. Vnější povrch zůstává zachovaný.

Volba {{ui:shell.edges}} se projeví pouze tam, kde se vnitřní stěny rozestupují, například u stupně nebo kolem otvoru. Rohy dutiny jednoduchého kvádru zůstávají v obou režimech ostré. Pro zaoblený vnitřek nejprve zaoblete vnější hrany a poté vytvořte dutinu. Vnitřní poloměr odpovídá vnějšímu poloměru zmenšenému o tloušťku stěny. Pokud takový vnitřek nelze sestavit, například u obrysu z mnoha krátkých úseček, vytvoří Layerling stejnou dutinu s ostrými rohy.

![Výsledný kryt se stěnou 3 mm a otevřenou horní stranou.](shot:hollow-result)

![Stejná krabička s otevřenou přední stranou jako prostor pro zásuvku.](shot:hollow-sides)

Na každé otevřené straně potřebuje těleso rovinnou plochu na svém krajním povrchu. Koule a volně tvarovaná tělesa proto nelze tímto způsobem otevřít. Je-li stěna pro těleso příliš silná, program požádá o menší tloušťku. Takovým případem je zaoblená krabice, jejíž horní a dolní hrany jsou také zaoblené: její stěna musí být zřetelně tenčí než toto zaoblení, nebo nejdřív nastavte zaoblení na 0.

Vytvořit dutinu lze i v tělese s kapsou, tedy kvádru se slepým otvorem vzniklým sloučením s nadzvednutým výřezem. Při otevřené horní straně se vytvoří stěny i kolem kapsy. Mezi kapsou a vnějším pláštěm zůstane prstencová dutina otevřená nahoře a pod dnem kapsy tenká dutina.

**Tělesa zakončená špičkou**, například kužel nebo rotační těleso z trojúhelníku, nemají nahoře rovinnou plochu, kterou by šlo otevřít. Nefunguje ani zcela uzavřená dutina, protože špičku nelze rovnoměrně odsadit dovnitř. I při stěně 1 mm se proto může zobrazit hlášení o příliš silné stěně. V takovém případě vytvořte stěnu už v profilu před rotací: obrys zkopírujte, kopii rovnoměrně zmenšete a vystřeďte v původním obrysu, odečtěte ji a výsledek otočte kolem osy. Viz kapitola Náčrty, část o rotaci. Odstup mezi obrysy určuje tloušťku stěny.

Při pozdější změně velikosti se dutina ihned přepočítá. Zadaná tloušťka stěn zůstává zachovaná i u oblých těles. Válec protažený v jednom směru více než v druhém se změní na elipsu. Zaoblení a sražení, která jste přidali po vytvoření dutiny, se pak znovu použijí na stejné hrany.

> **Tip:** Pro trysku 0,4 mm je vhodným výchozím rozsahem stěna 1,2 až 2 mm: šetří materiál a přitom poskytuje dostatečně pevný díl.

## Víko pro otevřené těleso

{{ui:editor.tool.lid}} vytvoří víko pro těleso otevřené nahoře: krabičku vydlabanou s otevřenou horní stranou, nádobu, misku. Vyber těleso a klikni na {{ui:editor.tool.lid}}. V okně zvolíš druh:

- {{ui:lid.type.plug}}: deska velká jako těleso a pod ní límec, který zapadne do otvoru.
- {{ui:lid.type.cap}}: deska o stěnu širší než těleso a pod ní okraj, který obejme vnějšek.
- {{ui:lid.type.both}}: deska o stěnu širší než těleso a pod ní obojí: límec do otvoru a okraj kolem vnějšku. Stěna tělesa sedí mezi nimi v drážce, jako u dózy na potraviny.
- {{ui:lid.type.flat}}: jen deska, k položení nebo přilepení.
- {{ui:lid.type.screw}}: víko, které se našroubuje jako u sklenice, pro kulaté těleso; víc níže.

Pak nastavíš {{ui:lid.thickness}}, {{ui:lid.fit}} ({{ui:lid.gap}} mezi víkem a tělesem: 0,1 mm těsné, 0,2 mm běžné, 0,3 mm volné, nebo jakákoli hodnota do 1 mm) a jak hluboko límec nebo okraj sahá a jak silná je jeho stěna. Klikni na {{ui:lid.apply}}: víko leží vedle tělesa, otočené deskou dolů, takže se tiskne bez podpěr. Těleso zůstane, jak je. Víko sleduje jakýkoli obrys, kulatý i hranatý, protože se odebírá ze samotného tělesa těsně pod jeho okrajem. Těleso bez otvoru nahoře dostane jen ploché víko; pro ostatní druhy ho nejdřív vydlab s otevřenou horní stranou.

> **Tip:** Jak těsně víko sedí, záleží na tiskárně. Nejdřív vytiskni malou krabičku s víkem; je-li víko příliš těsné, zvol další volnější uložení.

Když zapneš {{ui:lid.magnets}}, drží víko čtyři kulaté magnety místo těsného uložení. Vyber {{ui:lid.magnetSize}} (6 × 2, 8 × 3 nebo 10 × 3 mm) nebo nastav {{ui:lid.magnetDiameter}} a {{ui:lid.magnetHeight}} sám, k tomu {{ui:lid.magnetGap}}: 0,1 mm k zalisování magnetů, 0,2 až 0,3 mm k vlepení. Layerling vyřízne do každého rohu okraje tělesa kapsu a naproti ní další do desky víka, o něco hlubší než magnet, aby nikdy nevyčníval. Kde je stěna na kapsu příliš tenká, vyplní roh od dna po okraj sloupek a lem víka ho obejde. Těleso se seskupí se svými kapsami a sloupky: když skupinu zrušíš, máš ho zpátky, jak bylo. Deska musí být silná alespoň jako výška magnetu plus 0,8 mm; zapnutím magnetů se na tuto sílu nastaví.

Když zapneš {{ui:lid.hinge}}, víko se otevírá kolem čepu podél rovné strany těla: zadní, nebo té, kterou zvolíš v {{ui:lid.hingeSide}} (jako ve výchozím pohledu, kde zadní strana směřuje od tebe). Tam se střídají kloubky, krajní na těle a ty mezi nimi na víku, s mezerou {{ui:lid.hingeGap}}, a všemi prochází otvor pro čep: při {{ui:lid.hingePin}} 1,75 mm poslouží jako čep kousek filamentu; zapni {{ui:lid.hingePrintPin}}, chceš-li silnější čep tištěný zvlášť. V části pantu na těle sedí čep pevně, takže zatlačený kousek filamentu zůstane na místě, a v části víka se otáčí: {{ui:lid.hingePinPlay}} je jeho místo tam na každé straně, zpočátku 0,2 mm; přidej, když se víko otáčí ztuha. Kloubky těla stojí na šikmině 45°, takže tělo se tiskne nastojato bez podpor; kloubky víka lícují s jeho horní plochou, takže se dál tiskne obrácené. {{ui:lid.hingeKnuckles}} na 0 dá zhruba jeden kloubek na 10 mm. Pant jde s vkládacím nebo plochým víkem; okraj kolem dokola by při otevírání narazil do zadní stěny. Na kulaté straně, u dózy nebo trubky, vede pant tam, kde stěna ustupuje od jeho osy nejvýš o poloměr kloubku, a kloubky těla stojí na malém bloku, který sahá až do stěny. {{ui:lid.hingeTeardrop}} (zpočátku zapnuto) dá otvorům pro čep nahoře špičku podle toho, jak se každý díl tiskne, aby neprověsily; tištěný čep leží na malé ploše. V {{ui:lid.hingeStyle}} dá {{ui:lid.hingeStyle.flush}} kloubky do stěny místo za ni: krabička si zachová rozměry, každý díl má výřezy kolem kloubků toho druhého a víko se otevře asi na 140°. {{ui:lid.hingeStyle.pivot}} udělá víko, které leží na malém osazení v otvoru a otáčí se na dvou čepech skrz boční stěny, asi do 95°; i tak si krabička zachová rozměry. Obojí potřebuje rovnou stranu a jde bez magnetů.

U pantu {{ui:lid.hingeStyle.flush}} zapni {{ui:lid.hingeEndPlugs}} a otvor pro čep se na obou koncích uzavře: čep zůstane skrytý a nemůže vyklouznout. Posledních 4 mm otvoru je pak na každém konci čtvercových, postavených na roh, aby i ony měly nahoře špičku a při tisku neprověsily, a právě tak velkých, aby čep prošel: nejdřív zasuň čep, pak do každého konce zatlač zátku. Čtvercové zátky se nemohou otočit a sedí stejně pevně jako čep v těle; každá je seříznutá v rovině s vnější stranou krabičky, i na zaoblených rozích (u takové krabičky pak pant vede až do rohů). Leží vedle víka, na rovné straně. Čep je kvůli nim kratší a stavový řádek řekne, jak dlouhý.

> **Tip:** Nejdřív zalisuj magnety do tělesa. Pak na každý polož ještě jeden magnet, který se na něm sám otočí správně, a přitlač na ně víko (s kapkou lepidla v kapsách, pokud sedí volně): každý magnet tak skončí ve víku naproti svému protějšku a budou se přitahovat.

Když zapneš {{ui:lid.clickBumps}}, víko zacvakne: malé kulaté výstupky na vnější straně jeho límce (u nasazeného víka na vnitřní straně okraje) zapadnou do důlků, které Layerling na stejných místech vyřízne do stěny tělesa, jeden uprostřed každé rovné strany od 12 mm, dva na straně delší než 80 mm, čtyři kolem kulatého otvoru a žádný na straně pantu. {{ui:lid.clickBumpHeight}} určuje, jak hluboko každý výstupek zasahuje do stěny, zpočátku 0,4 mm: méně pro malou krabičku nebo tuhý límec, více pro pevnější zacvaknutí. V části {{ui:lid.handle}} dá {{ui:lid.handle.tab}} desce jazýček silný jako deska, který přesahuje 6 mm za její přední hranu (nebo hranu naproti pantu), takže se víko dál tiskne otočené, a {{ui:lid.handle.notch}} vyřízne těsně pod hranou víka prohlubeň pro prst do přední stěny tělesa a vždy nechá 0,8 mm stěny; ani jedno nejde s otočným víkem a výstupky ani s plochým.

Když zvolíš {{ui:lid.type.screw}}, víko se našroubuje jako u sklenice: těleso dostane závit zvenku na svém horním okraji a víko stejný závit uvnitř svého okraje. K tomu je potřeba kulaté těleso, třeba válec, trubka nebo kulatá nádoba vydlabaná s otevřenou horní stranou, se stěnou aspoň 0,8 mm silnou; krabička nebo ovál se odmítne. Závit se přidá na stěnu zvenku, místo aby se do ní vyřízl, takže i tenká stěna si zachová pevnost, a seskupí se s tělesem: když skupinu zrušíš, máš těleso zase jako dřív. {{ui:lid.threadPitch}} říká, o kolik závit stoupne za jednu otáčku, na začátku 3 mm jako u sklenice; závit je hluboký tři desetiny této hodnoty (nejvýš 1,5 mm) a jeho boky jsou skloněné o 45°, takže se těleso tiskne nastojato a víko na své desce, obojí bez podpěr. {{ui:lid.threadTurns}} říkají, kolikrát závit obejde dokola, a spolu se stoupáním, jak daleko dolů sahá okraj víka. {{ui:lid.gap}} je místo v závitu na každé straně, měřené v poloměru jako u matice; když se víko točí ztuha, vezmi volnější uložení. Víko zavřeš otáčením po směru hodinových ručiček. Víko i závit jsou z trojúhelníků a magnety, pant, zacvakávací výstupky ani úchyt k šroubovacímu víku nepatří.

## Kabelový kanál tělesem

{{ui:editor.tool.cableChannel}} vede tělesem kulatý průchod pro kabel nebo vodič LED, od místa, kde vstupuje, k místu, kde vychází, a cestu najde sám. Vyberte těleso a klikněte na {{ui:editor.tool.cableChannel}}, pak klikněte na těleso tam, kde kabel vstupuje ({{ui:cable.entry}}), a kde vychází ({{ui:cable.exit}}). Cesta začíná a končí rovně, kolmo k povrchu, vede rovně, kde to jde, a ohýbá se, kde musí, nikdy ostřeji než {{ui:cable.minBend}}, a drží se co nejdál od vnějšího povrchu, nikdy blíž než {{ui:cable.minWall}}. Kabel se dá protlačit obloukem o poloměru asi pětinásobku jeho průměru; {{ui:cable.diameter}} je průměr kanálu.

Dokud je panel otevřený, těleso je průhledné, s kanálem uvnitř a značkou na každém konci. Panel ukáže délku kanálu, nejostřejší oblouk a nejtenčí stěnu, červeně, když musel být oblouk nebo stěna menší, než bylo žádáno; pak pomůže menší hodnota u {{ui:cable.minBend}} nebo jiný vstup či výstup. {{ui:cable.pickAgain}} přesune konec. {{ui:cable.apply}} kanál vyřízne: stane se z něj {{ui:shape.bentTube}} jako výřez, seskupená s tělesem, takže těleso zůstane přesné, a po zrušení skupiny se trubka dá ještě změnit. Ohnutá trubka má nejvýš jedenáct oblouků; cesta, která jich potřebuje víc, chce jiný vstup nebo výstup.

## Odsazení těles

Každou plochu tělesa lze posunout o stejnou vzdálenost ven nebo dovnitř. To potřebuje lícovaný spoj, víko nebo zacvakávací spoj: mezera 0,1 až 0,3 mm dokola, zatímco prvky zůstanou na místě, což změna měřítka nedá.

1. Vyber jedno těleso a klikni na {{ui:editor.tool.offset}}, nebo na těleso klikni pravým tlačítkem a vyber to tam.
2. Zvol {{ui:offset.grow}} nebo {{ui:offset.shrink}} a nastav {{ui:offset.distance}}.
3. {{ui:offset.edges}} rozhodují o vnějších rozích: zaoblené drží odsazený povrch kulatý, ostré nechá plochy pokračovat, dokud se nepotkají.
4. Zaškrtni {{ui:offset.copy}}, aby díl zůstal, jak je, a zvětšené těleso vzniklo jako kopie, která už je dírou. Seskup tuto díru s protikusem a vyřízne přesně vůli, kterou jsi zvolil.
5. Klikni na {{ui:offset.apply}}.

Zaškrtni {{ui:offset.sideways}}, když se má zvětšit nebo zmenšit jen obrys: boky se posunou o vzdálenost, každá rovná horní a spodní plocha zůstane ve své výšce. Cedule dostane okraj dokola, podstavec se rozšíří a těleso nebude vyšší. U stupňovitého tělesa si každý stupeň ponechá svou výšku. Text, který se odsazuje přes své obrysy, si pak také ponechá svou výšku.

Bez zaškrtnutí se odsadí samotné těleso. Stane se pevným přesným tělesem, jako po zkosení: seznam nahoře v okně odsazení vezme zpět a {{ui:edge.editAction}} znovu otevře nástroj se starou vzdáleností. Odsadit lze jen přesná CAD tělesa - kvádry, válce a další tvary, jejich skupiny, importované díly STEP. Těleso, které je jen trojúhelníková síť, jako mnoho importů STL, často nejde. Vzdálenost příliš velká pro těleso, například zmenšení za nejtenčí stěnu, se odmítne.

Text, jehož písmena jádro nedokáže odsadit jako těleso - v některých písmech A, B, M, N, W nebo 9 -, se místo toho odsadí přes své obrysy: dostane výplň {{ui:prop.textWider}} o danou vzdálenost (užší, když se zmenšuje) a o stejně tolik naroste nahoře i dole. Zůstane textem, který můžete dál upravovat. Funguje to pro text s plnými písmeny bez zaoblení; text, který už režim výplně má, se odmítne jako dosud.

## Mazání ploch

Zaoblení, které překáží, otvor na špatném místě, výstupek, který už nepotřebujete: {{ui:editor.tool.deleteFace}} je z tělesa zase odstraní, aniž byste ho museli stavět znovu.

1. Vyberte těleso a zvolte {{ui:editor.tool.deleteFace}} v pásu nástrojů nebo nabídce pravého tlačítka.
2. Klikněte na každou plochu toho, co má zmizet: plochy zaoblené hrany, stěnu otvoru, bok a vršek výstupku. Vybraná plocha se zvýrazní; dalším kliknutím ji z výběru odeberete. Okno plochy počítá.
3. Klikněte na {{ui:deleteFace.apply}} nebo stiskněte [[Delete]]. [[Esc]] nástroj zavře, aniž by se cokoli změnilo.

Okolní plochy se rozšíří, až se mezera uzavře. Kvádr se zaoblenými horními hranami dostane zpět ostré hrany, otvor se zaplní, výstupek zmizí. Těleso zůstane přesné: lze ho znovu zaoblit a zkosit a export do STEP zachová jeho skutečné plochy. [[Ctrl]]+[[Z]] smazání vrátí jedním krokem. Smazání je také v části {{ui:edge.featureHistory}} stejně jako zaoblení a zkosení, kde ho {{ui:edge.revertAction}} vrátí; {{ui:edge.editAction}} pro něj není. Sloučený celek se přitom změní na jediné těleso, stejně jako při úpravě hran.

Vyberte všechny plochy toho, co má zmizet, a jen ty. Pokud okolní plochy mezeru uzavřít nedokážou, layerling to oznámí a nic se nezmění: například hlavní strana kvádru nemá sousední plochu, která by zaujala její místo. Smažete-li jen dno kapsy, vznikne průchozí otvor, protože stěny kapsy pokračují až na druhou stranu.

{{ui:editor.tool.deleteFace}} potřebuje přesné plochy: funguje u dílů importovaných jako STEP a u tvarů layerlingu. Co layerling vede jako síť, je nemá: importovaný STL, OBJ nebo 3MF, rozdělené, kolem válce obtočené nebo zjednodušené těleso či velmi podrobný tvar, například dlouhý text. Pokud můžete, importujte díl jako STEP. U podrobného importovaného dílu mohou být některé plochy pro CAD jádro příliš náročné: po 45 sekundách se mazání zastaví a nic se nezmění. Těleso, jehož velikost se změnila po úpravě hran se zachovanou velikostí hran, nemá v nové velikosti přesné plochy, dokud se změna velikosti nevrátí.

Importovaná síť převedená na přesné těleso nástrojem {{ui:editor.tool.makeExact}} si může tam, kde byly trojúhelníky souboru vadné, ponechat vlasově tenké plochy mezi plochami ležícími v jedné rovině, takže jedna strana vyjde jako pruhy, které nejde smazat samostatně. Taková tenká plocha, příliš úzká na kliknutí, zmizí s vybranou plochou, když se jí dotýká a vede dál k další ploše v rovině vybrané plochy, spolu s tenkými plochami, které na ni navazují a které se také dotýkají plochy v rovině vybrané plochy; okno je započítá jako přibrané.
