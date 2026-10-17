---
title: Závity, ozubení a další mechanické díly
summary: Vzájemně pasující šrouby, matice a závitové otvory, ozubená kola, pružiny, trubky, rybiny a zahloubení.
---

Knihovna obsahuje i parametrické díly, jejichž ruční sestavení by bylo pracné. Všechny lze později měnit v nastavení.

## Závity

Vložte {{ui:shape.thread}} a v {{ui:inspector.threadRole}} zvolte:

- **{{ui:thread.rod}}:** válec se závitem, například šroub bez hlavy.
- **{{ui:thread.screw}}:** šroub s hlavou {{ui:inspector.threadHead}} typu {{ui:thread.headCylinder}}, {{ui:thread.headCountersunk}} nebo {{ui:thread.headHex}}.
- **{{ui:thread.nut}}:** odpovídající matice.
- **{{ui:thread.bore}}:** závitový výřez. Zasuňte jej do dílu a slučte, aby vznikl vnitřní závit.

![Šroub s válcovou hlavou. Vpravo jsou typ dílu, hlava, velikost, stoupání a profil.](shot:thread-screw)

{{ui:prop.threadSize}} nabízí metrické M2 až M12, palcové UNC a UNF od No. 4 po 1 palec a trubkové G1/16 až G4. Při {{ui:thread.customSize}} zadáváte {{ui:prop.diameter}} a {{ui:prop.pitch}}. U palcových a G rozměrů se místo stoupání v mm zadává {{ui:prop.threadsPerInch}}.

Seznam je rozdělen podle řad a pod ním je vysvětlení vybrané řady:

- **M, metrický hrubý:** běžný závit šroubů a matic podle ISO 261.
- **UNC, americký palcový hrubý:** fotografický závit 1/4"-20 UNC podle ISO 1222, větší stativové hlavy 3/8"-16 UNC.
- **UNF, americký palcový jemný:** stejné průměry jako UNC s jemnějším stoupáním podle ASME B1.1.
- **G, trubkový:** sprchová hadice G1/2, přívod pračky G3/4, zahradní kohout běžně G3/4 nebo menší G1/2 pro našroubování hadicové rychlospojky.

G je válcový Whitworthův trubkový závit podle ISO 228-1 pro vodu, plyn, hydrauliku a pneumatiku. Označení odpovídá trubce, nikoli vnějšímu průměru závitu: G1 má 33,249 mm. Volba G nastaví {{ui:thread.profileWhitworth}}, metrická či palcová velikost vrátí {{ui:thread.profileV}}. Ručně zvolený {{ui:thread.profileTrapezoidal}} nebo {{ui:thread.profileRound}} zůstává. Norma zde určuje jen závit; hlava šroubu a matice G mají obecné proporce jako vlastní průměr. Varianty R, Rc a Rp nejsou zahrnuty.

Další nastavení:

- **{{ui:prop.threadHand}}:** {{ui:thread.right}} nebo {{ui:thread.left}}.
- **{{ui:prop.threadProfile}}:** {{ui:thread.profileV}} je běžný metrický a palcový profil. {{ui:thread.profileWhitworth}} má úhel 55° a zaoblené vrcholy i dna. {{ui:thread.profileTrapezoidal}} a {{ui:thread.profileRound}} používají plošší vrcholy a dna, což obvykle zlepšuje tisk bez jemných špiček.
- **{{ui:thread.profileCustom}}:** vlastní lichoběžník se stejně širokou rovinkou na vrcholu i dně. {{ui:prop.threadFlankAngle}} je úhel mezi boky zubu: 60° odpovídá ostrému V profilu, 30° lichoběžníkovému. Při nejvýše 90° není bok mírnější než 45°, takže jej lze tisknout bez podpěr. {{ui:prop.threadDepth}} a {{ui:prop.threadCoreDiameter}} vyjadřují stejnou veličinu: průměr jádra je vnější průměr minus dvojnásobek hloubky a obě pole se přepočítávají. Nový profil začíná hloubkou V závitu při 60°. Hloubka musí být alespoň desetinou stoupání, nejvýše 40 % průměru a oba boky dohromady nesmějí zabrat více než devět desetin stoupání. Při změně stoupání i škálování se hloubka mění úměrně. Vůle a zkosení fungují jako u ostatních profilů. MCP používá `custom`, `threadFlankAngle` a `threadDepth`.
- **{{ui:prop.clearance}}:** vůle umožňující sestavení vytištěné dvojice. U matice a závitového otvoru zvětšuje celý průměr, takže mezera na bocích V profilu je přibližně poloviční. Nová matice začíná na 0,4 mm; 0,3 mm je těsnější, 0,5 mm volnější. Nejprve vytiskněte zkušební pár. U tyče a šroubu vlastní vůle zmenšuje průměr šroubu, výchozí je 0.
  - **Tištěný šroub a matice:** šroub ponechte na 0 a vůli nastavte v matici, zpočátku 0,4 mm.
  - **Kovový šroub a tištěná matice či otvor:** veškerou vůli poskytuje tištěná strana, obvykle 0,4 mm. Při viklání zkuste 0,3 mm.
  - **Tištěný šroub a kovová matice:** kovová matice se neupraví, proto zmenšete šroub vůlí 0,3 až 0,4 mm.
- **{{ui:prop.axialClearance}}:** u matice a závitového otvoru přidá axiální vůli nad {{ui:prop.clearance}}. Ztenčí závitové zuby matice bez změny průměru. Samotná průměrová vůle otevírá boky V závitu přibližně na 0,58 své hodnoty a při velké hodnotě způsobuje boční viklání. Axiální nastavení obě vlastnosti odděluje. Výchozí 0 nemění uložené závity. Maximum je pětina stoupání, aby zuby nezanikly. Pole není pro tyč a šroub. Podrobnosti níže.
- **{{ui:prop.threadChamferTop}}, {{ui:prop.threadChamferBottom}}, {{ui:prop.headChamfer}} a {{ui:prop.rimChamfer}}:** zkosení usnadní nasazení a odstraní ostrou hranu hlavy. Oba konce tyče, matice a otvoru mají vlastní velikost, například dlouhé horní a krátké či žádné spodní zkosení. Šroub má jen zkosení špičky {{ui:prop.chamfer}}. U matice a otvoru hodnota vyjadřuje rozšíření ústí za vnější průměr. Kužel pokračuje pod 45° až k jádru, bez schodu na vnějším průměru.

Přepnutí {{ui:thread.rod}} a {{ui:thread.bore}} zachovává délku. Matice a šroub začínají standardními rozměry.
- **{{ui:prop.quality}}:** jemnost výpočtu. Vyšší kvalita je přesnější, ale pomalejší.

Před velkým dílem nejprve vytiskněte šroub a matici na zkoušku a přizpůsobte vůle tiskárně.

## Závity pro 3D tisk

Tištěný závit potřebuje prostor ve dvou směrech:

- **Průměrová vůle, {{ui:prop.clearance}}:** zvětší otvor matice. Na každé straně vznikne polovina zadané hodnoty, tedy při 0,4 mm mezera 0,2 mm. Otáčení je snazší, ale šroub se může viklat do stran.
- **Axiální vůle, {{ui:prop.axialClearance}}:** ztenčí zuby matice. Neutažený šroub se o tuto hodnotu pohybuje podél osy, bez dalšího bočního prostoru.

Mezera mezi boky odpovídá přibližně 0,58násobku průměrové vůle plus axiální vůli. Pro mezeru 0,3 mm dříve bylo třeba asi 0,5 mm v průměru, tedy 0,25 mm na každé straně. Kombinace 0,2 mm v průměru a 0,2 mm axiálně dává přibližně 0,32 mm a jen 0,1 mm na stranu.

**Důsledky**

- **Šroub má axiální chod.** Bez zatížení se může o zadanou hodnotu pohybovat tam a zpět. U víček a spojů to obvykle nevadí, u přesného polohovacího šroubu ponechte vůli malou nebo nulovou.
- **Zuby matice zeslábnou.** Při axiální vůli 0,3 mm a stoupání 1,75 mm jsou uprostřed téměř o třetinu tenčí. Pro velké namáhání zvolte hrubší závit.
- **Výpočet je náročnější.** Další body profilu zvyšují počet trojúhelníků.
- **Whitworth bez přesných oblouků:** s nenulovou axiální vůlí se {{ui:thread.profileWhitworth}} předává úpravám hran a STEP jako profil z úseček místo přesných kruhových oblouků. Při nule se chování nemění.

**Praktické tipy**

1. **Nejprve zkušební pár.** Šroub a matice vysoké 4 až 6 mm se vytisknou rychle. Zkuste tři různé vůle a vyberte snadno otočnou dvojici bez velkého viklání.
2. **Výchozí pokus:** průměrová vůle 0,2 až 0,3 mm a axiální 0,2 mm. Při viklání snižte průměrovou, při drhnutí zvyšte axiální. Bez axiální vůle začněte jako dříve na 0,4 mm v průměru.
3. **Axiální vůle alespoň jako výška vrstvy.** Menší rozdíl tiskárna nemusí rozlišit. Pro vrstvy 0,2 mm začněte na 0,2 mm, pro 0,1 mm může stačit méně.
4. **Tiskněte svisle.** Osa vzhůru dává čistší boky; při tisku naležato se prohýbají.
5. **Jemné stoupání je náročné.** Pod přibližně 1 mm se závity snadno slepí. Hrubší závit nebo {{ui:thread.profileTrapezoidal}} s plochými vrcholy je spolehlivější.
6. **Vyhněte se tenkým špičkám.** Úzký vrchol V profilu se nemusí vejít do šířky extruze. {{ui:thread.profileTrapezoidal}} a {{ui:thread.profileRound}} mají plošší zuby.
7. **Odstraňte otřepy a zaběhněte spoj.** První otáčení může drhnout kvůli zbytkům tisku. Několikrát otočte oběma směry. Nasazení usnadní náběhové zkosení.
8. **Po změně tiskárny nebo materiálu test opakujte.** Vůle závisí i na trysce.

Nástroj hran pracuje s přesným závitovým tělesem. Můžete upravit hrany nosného dílu i hlavy šroubu se závitem zachovaným, viz [Úpravy hran](chapter:edges-and-hollowing). Příprava M6 trvá několik sekund, trubkového G1/2 přibližně půl minuty. Nejrychlejší úpravu hrany hlavy nabízí přímo její parametr zkosení.

## Ozubená kola

{{ui:shape.gear}} nabízí {{ui:gear.spur}}, {{ui:gear.helical}}, {{ui:gear.herringbone}}, {{ui:gear.bevel}}, {{ui:gear.internal}} a {{ui:gear.rack}}. Výchozí {{ui:prop.gearProfile}} je {{ui:gear.profileInvolute}}: evolventní boky pro plynulý záběr jako ve strojírenství. Nastavte {{ui:prop.teeth}} a {{ui:prop.gearModule}}. Vnější průměr je modul × (počet zubů + 2), roztečný průměr modul × počet zubů. Výchozí modul je 2. Dvě kola spolu zabírají při stejném modulu a {{ui:prop.gearPressureAngle}}, obvykle 20°, a osové vzdálenosti (součet počtů zubů) × modul / 2. Po výběru obou kol panel ukáže požadovanou i současnou vzdálenost. Stojí-li zub proti zubu, otočte jedno o polovinu rozteče zubu, tedy 180° děleno jeho počtem zubů. {{ui:prop.gearBacklash}} ztenčí zuby pro tištěný pár. Je zadána pro celou dvojici, každé kolo odebere polovinu; začněte na 0,2 mm, nula znamená přesný profil. Pod základní kružnicí pokračuje bok rovně k patě bez nástrojového podříznutí. To vyhovuje tisku, ale malé pastorky pod asi 17 zubů mohou u paty lehce drhnout.

Šikmé ozubení přidává {{ui:prop.helixAngle}}, u evolventy skutečný úhel šroubovice na roztečné kružnici. Dvojice potřebuje stejný modul a opačná znaménka stejného úhlu. {{ui:gear.herringbone}} má dvě poloviny opačného sklonu, které se uprostřed setkají do šipky. Má samostředicí účinek a ruší axiální síly, které běžné šikmé ozubení vytváří. {{ui:prop.helixAngle}} a {{ui:prop.helixQuality}} fungují jako u šikmého kola, úhel platí pro každou polovinu. Párová kola opět potřebují opačná znaménka. Uprostřed není drážka, obě poloviny navazují bez schodu. Šípové kolo se do nástroje hran i STEP předává jako síť, nikoli přesné těleso.

Kuželové kolo zmenšuje evolventní profil směrem nahoru. Jde o přiblížení, nikoli přesně vypočtený kuželový převod.

{{ui:gear.profileRound}} používá obloukové zuby jako Useful gear v Tinkercadu. Vrcholy a mezery přecházejí bez zlomu, malé díly se snáze tisknou a na ovládacím kolečku poskytují příjemný úchop. Nastavují se {{ui:prop.teeth}}, {{ui:prop.gearModule}} a {{ui:prop.gearBacklash}}, bez úhlu záběru. Zuby jsou nižší a vnější průměr je modul × (počet zubů + 1,2). Navzájem zabírají při stejném modulu a stejné osové vzdálenosti jako evolventní kola, ale s evolventním profilem se nepárují.

{{ui:gear.profileSimple}} zachovává původní přímé zuby s ručním {{ui:prop.toothSize}} a {{ui:prop.toothWidth}}. Starší projekty je ponechávají do změny profilu. Všechny tři profily podporují {{ui:prop.centerHole}}.

{{ui:gear.internal}} má zuby dovnitř a menší kolo běží uvnitř věnce, například v planetovém převodu. Kromě {{ui:prop.teeth}}, {{ui:prop.gearModule}} a {{ui:prop.gearBacklash}} nastavujete {{ui:prop.gearRim}}, tloušťku vnějšího věnce. Vnější průměr je modul × (počet zubů + 2,5) plus dvojnásobná tloušťka věnce; pro oblé zuby modul × (počet zubů + 1,7) plus věnec. Osová vzdálenost menšího kola je (zuby věnce − zuby kola) × modul / 2; panel ji při výběru obou uvede. Planetový převod splňuje zuby věnce = zuby slunce + 2 × zuby satelitu, například 30 = 12 + 2 × 9. Středový otvor se nenastavuje, věnec je sám otevřený. Mezi 26 a 33 zuby se špičky zkracují až o čtvrtinu modulu, aby nevznikala drobná hrana na základní kružnici; záběr zůstává zachovaný.

{{ui:gear.rack}} představuje ozubení nekonečného poloměru: tyč se zuby podél jedné strany. U evolventního profilu jsou boky přímé v úhlu záběru. Šířka podél X je počet zubů × rozteč, kde rozteč = π × modul. Hřebeny stejného modulu navazují konci v mezeře. Délka podél Y určuje tloušťku tyče a může se měnit, pokud se vejdou zuby a nejméně půl milimetru nosné části. Zuby míří dopředu a hřeben můžete natočit. Kolo stejného modulu zabírá, když je jeho střed před roztečnou přímkou ve vzdálenosti počet zubů kola × modul / 2. Přímka leží jeden modul za špičkami, u oblých zubů 0,6 modulu. Věnec a hřeben podporují evolventní a oblý profil, nikoli jednoduchý. Přepnutí typu zachovává modul.

Úpravy hran a STEP běžně používají přesná tělesa a hladké evolventy. Výjimkou je šikmé kolo s oválnou základnou a šikmá evolventa přibližně od 31 zubů, které zůstávají sítí. Malé zuby omezují poloměr úprav. U jednoduchého kola průměru 30 mm s 12 zuby má ploška u paty asi 0,65 mm a všechny hrany lze zaoblit zhruba do 0,5 mm. Kuželové kolo s menším vrškem přibližně do 0,4 mm. Šikmé boky prostor dále zužují podle úhlu a výšky. Koncové hrany šikmého kola lze zaoblovat, ale jejich samostatné zkosení v CAD jádře selhává. Použijte zaoblení nebo malé zkosení všech hran současně, například 0,2 mm.

## Pružiny

{{ui:shape.spring}} má {{ui:prop.turns}} a {{ui:prop.wire}}. Spolu s výškou určují tuhost. {{ui:prop.springHand}} volí {{ui:spring.right}} jako u běžné tlačné pružiny nebo {{ui:spring.left}}.

Úpravy hran a STEP používají přesné těleso kruhového drátu vedeného po šroubovici, na koncích kolmo seříznutého. Oba konce lze zkosit nebo zaoblit.

## Ohnuté trubky

{{ui:shape.bentTube}} se skládá až z dvanácti přímých úseků následovaných ohybem. U každého nastavíte {{ui:prop.bentTubeSegmentLength}}, {{ui:prop.bentTubeBendAngle}}, {{ui:prop.bentTubeBendRadius}} a {{ui:prop.bentTubeRoll}}. Právě upravovaný úsek je oranžový. Natočení 0° ohýbá v rovině podložky, 90° vzhůru. Vnější i vnitřní profil může být kruhový, čtvercový, šestihranný nebo osmihranný; díl může být i plný. Na vlastní kolizi trubky program upozorní.

## Propojení profilů

{{ui:shape.loft}} propojí dolní a horní obrys podobně jako loft ve Fusion: redukci hadice, čtvercový ventilátor s kruhovým potrubím nebo stojánek měnící průřez. Pro {{ui:prop.loftBottomOutline}} a {{ui:prop.loftTopOutline}} vybíráte {{ui:loft.round}}, {{ui:loft.rectangle}} s {{ui:prop.loftBottomCorner}} nebo {{ui:loft.polygon}} s počtem rohů. Nastavíte rozměry obou konců a výšku. {{ui:prop.loftOffsetX}} a {{ui:prop.loftOffsetZ}} posunou horní konec do strany, spodní zůstává.

{{ui:prop.loftWall}} vytvoří místo plného tělesa otevřenou trubku. Na obou koncích je otvor zmenšen o tloušťku stěny měřenou napříč; na šikmé stěně je skutečná kolmá tloušťka menší. Změna rozměrů rámečkem zvětšuje oba konce, ale poloměr rohů a tloušťka stěny zůstávají.

{{ui:prop.loftSmooth}} mění průběh propojení. Při 0 vedou boky rovně jako kužel. Při 100 vycházejí oba konce svisle a rozměr se mění mezi nimi po křivce S pro plynulý adaptér místo trychtýře. Mezilehlé hodnoty oba průběhy kombinují. Funguje současně s {{ui:prop.loftWall}}, zkroucením, nakloněním a odsazením. Dutý díl zůstává otevřený na obou koncích. Zachovává přesné těleso pro úpravy hran, ale sestavení přes více průřezů trvá déle.

{{ui:prop.loftTwist}} rovnoměrně natáčí průřez po výšce až o 360° oběma směry. {{ui:prop.loftTiltX}} a {{ui:prop.loftTiltZ}} naklánějí horní konec až o 45°; kladná hodnota zvedá přední nebo pravý okraj. Mezilehlé průřezy se naklánějí postupně. Nejvyšší bod zachová zadanou výšku. Příliš malá výška, při níž by nakloněný konec zasáhl pod podložku, automaticky omezí náklon. Propojení nenahrazuje ohyb trubky po křivce.

Přesná geometrie platí i při zkroucení a náklonu, takže lze zaoblovat, zkosovat a exportovat do STEP. Přírubu s otvory přidejte a slučte běžným postupem.

## Gridfinity

Tvar {{ui:shape.gridfinity}} vytváří díly pro otevřený úložný systém Zacka Freedmana: krabičky v mřížce po 42 mm, které stojí v nosné desce a dají se stohovat na sebe. Rozměry odpovídají zveřejněné specifikaci Gridfinity, takže krabička z layerlingu sedí v nosné desce z jiného generátoru a naopak. V poli {{ui:prop.gridfinityType}} vyberete:

- **{{ui:gridfinity.bin}}:** krabičku s nožkou pod každou jednotkou mřížky. {{ui:prop.gridfinityUnitsX}} a {{ui:prop.gridfinityUnitsZ}} počítají jednotky mřížky po 42 mm (krabička je o 0,5 mm menší, 41,5 mm na jednu jednotku); každá výšková jednotka ({{ui:prop.gridfinityUnitsY}}) měří 7 mm, nejvýš 20. {{ui:prop.gridfinityLip}} nahoře na stěně drží nožky další krabičky a krabičku zvýší o 4,4 mm: krabička o 3 jednotkách s okrajem je vysoká 25,4 mm. Když zapnete {{ui:prop.gridfinityMagnets}}, dostane každá nožka v každém rohu otvor pro magnet 6 × 2 mm.
- **{{ui:gridfinity.baseplate}}:** desku, ve které krabičky stojí, vysokou 5 mm, s lůžkem pro každou jednotku mřížky. Je to otevřený rám bez dna a bez otvorů pro magnety.

Velikost je vždy celý počet jednotek mřížky, až 6 × 6 (252 mm, vejde se na podložku 256 mm); při tažení za úchyt velikost přiskočí k nejbližší jednotce. Stěna (0,95 mm), dno (1,2 mm) a hloubka otvorů pro magnety (2,4 mm) ve specifikaci nejsou a jsou pevné; otvory pro šrouby M3 ze specifikace se nevytvářejí. Horní hrana okraje je ostrá, jak ji specifikace kreslí; pokud ji vaše tiskárna roztřepí, zaoblete ji nebo zkoste nástrojem hran. Krabička i deska jsou přesná tělesa, takže zaoblení, zkosení i export do STEP na nich fungují. Krabičku rozdělíte tak, že do ní seskupíte tenké kvádry jako přepážky: postavte je na dno, do výšky 5,95 mm, a u krabičky s okrajem nechte jejich horní hranu aspoň 0,5 mm pod 7 mm na výškovou jednotku, měřeno od spodku krabičky (20,5 mm u 3 jednotek), protože nožky další krabičky zasahují do krabičky 0,35 mm. Krabičky i desky tiskněte bez podpor, postavené tak, jak stojí na podložce.

Krabička vysoká 3 výškové jednotky a víc může mít podél vnitřních stěn poličky na štítek: zapněte {{ui:prop.gridfinityLabelBack}}, {{ui:prop.gridfinityLabelFront}}, {{ui:prop.gridfinityLabelLeft}} nebo {{ui:prop.gridfinityLabelRight}}, v libovolné kombinaci. Každá zapnutá polička má vlastní hodnoty {{ui:prop.gridfinityLabelWidth}}, {{ui:prop.gridfinityLabelLength}} a u kratší poličky {{ui:prop.gridfinityLabelOffset}}; nastavení rohů pod nimi platí pro všechny. Polička je nahoře rovná pro štítek, vpředu má rovný pás 1,2 mm a její spodek stoupá pod úhlem 36 stupňů. Její horní plocha leží 0,85 mm pod výškou 7 mm na výškovou jednotku, měřeno od spodku krabičky (20,15 mm u 3 jednotek), takže nožky krabičky postavené na stohovací okraj zůstanou 0,5 mm nad ní. Krabička nižší než 3 jednotky poličky neukazuje; od 3 jednotek jsou zase zpátky. Poličky na štítek nejsou součástí specifikace.

{{ui:prop.gridfinityLabelWidth}} udává, jak daleko polička sahá do krabičky: 14 mm, u krabičky se 3 jednotkami nejvýš 17,2 mm a 16,8 mm u dvou poliček proti sobě v krabičce hluboké 1 jednotku s rohy 2 mm. Když je {{ui:prop.gridfinityLabelLength}} na 0, vede polička od stěny ke stěně. U kratší, aspoň 10 mm, se objeví {{ui:prop.gridfinityLabelOffset}}, kterým ji posunete od středu stěny: na zadní a přední stěně doprava, jak je ukazuje pohled zepředu, na bočních stěnách dopředu. Konec, který se ke stěně přiblíží na méně než 1 mm (se stohovacím okrajem 1,8 mm, protože jeho podpěra tam vystupuje dovnitř) nebo skončí na poličce té stěny, vede až do ní, a dvě poličky, které se potkají v rohu, se spojí v jednu. Kde polička naráží na stěnu nebo jinou poličku a je tam místo, roh se zaoblí nebo zkosí: v poli {{ui:prop.gridfinityLabelCorner}} zvolte {{ui:gridfinity.labelRound}} nebo {{ui:gridfinity.labelChamfer}}, velikost nastavíte v poli {{ui:prop.gridfinityLabelCornerSize}} (2 mm; 0 ho nechá ostrý). Je-li zvoleno {{ui:gridfinity.labelRound}}, má kratší polička zaoblené i přední rohy volných konců, o stejnou velikost, ale nejvýš o polovinu své šířky.

## Pant

{{ui:shape.hinge}} se tiskne vcelku a po vytištění rozhýbe: dvě otevřená křídla na podložce, mezi nimi střídavé klouby kolem společné osy. Čep patří zadnímu křídlu a s vůlí prochází klouby předního. Nastavte {{ui:prop.hingeLength}}, {{ui:prop.hingeOpenWidth}}, {{ui:prop.hingeKnuckleDiameter}}, lichý počet {{ui:prop.hingeKnuckles}} pro uchycení čepu na obou koncích, {{ui:prop.hingePinDiameter}} a {{ui:prop.hingeLeafThickness}}.

{{ui:prop.hingeClearance}} je mezera kolem čepu, mezi klouby a před křídly. Při 0,4 mm dobře seřízená tiskárna obvykle vytvoří pant uvolnitelný lehkým pootočením. Při slepení vůli zvětšete, při viklání zmenšete. Tiskněte naležato jako v náhledu a bez podpěr. Do křídel lze přidat otvory nebo je začlenit do většího dílu, například víka.

## Rýhované úchopy

{{ui:shape.knurl}} je kulatý úchop pro ovladače, ruční kolečka a rukojeti. {{ui:prop.knurlPattern}} nabízí {{ui:knurl.straight}} podél osy, {{ui:knurl.diamond}} se dvěma křížícími se šikmými soustavami a {{ui:knurl.round}} s oblými podélnými vlnami pro měkký úchop. Oblé drážky musí být mělčí než polovina rozteče, jinak se vyboulují u paty; příliš velká hloubka se omezí. Zadejte {{ui:prop.diameter}}, {{ui:prop.height}}, {{ui:prop.knurlCount}}, {{ui:prop.knurlDepth}} a u křížení {{ui:prop.knurlAngle}} vůči ose. {{ui:prop.knurlChamfer}} zkosí oba konce pod 45°, nula zachová ostré hrany.

Přímé a oblé rýhování mají přesnou geometrii pro úpravy hran. Křížové zůstává sítí, protože přesný výpočet 30 drážek by trval téměř minutu. Pro nasazení na hřídel odečtěte otvor, například {{ui:shape.thread}} v režimu závitového otvoru. Drážky mělčí než 0,4 mm se špatně tisknou. Rozteč po obvodu neklesá pod 0,8 mm, takže tenčí úchop má méně drážek.

## Rybinový spoj

{{ui:shape.dovetail}} spojuje dva díly proti vytažení; zasouvají se do sebe ze strany. Zadejte šířku širšího konce, {{ui:prop.dovetailNeckWidth}} a délku. Pro druhou stranu vytvořte kopii jako výřez. {{ui:prop.dovetailClearance}} přidá vůli, aby se vytištěný spoj nezasekával.

> **Tip:** Závitový výřez odebere materiál až tam, kde těleso skutečně protíná. Zasuňte jej do materiálu, nepřikládejte jen k povrchu.

## Kapkovitý otvor

Vodorovný kruhový otvor vytváří nahoře most, který může prověsit. {{ui:shape.teardrop}} má proto špičku: každá vrstva se opírá o předchozí a kruhová část se vytiskne bez podpěr. {{ui:prop.teardropDiameter}} nastavte podle otvoru, například asi 3,4 mm pro M3, a {{ui:prop.teardropLength}} dostatečně pro průchod dílem. {{ui:prop.teardropTipAngle}} začíná na 90°, tedy boky po 45°, běžně dobře tisknutelné. Změna úhlu mění potřebnou výšku hrotu.

Tvar přepněte na výřez a slučte s dílem. Délka směřuje podél hloubky a špička vzhůru. Pro kolmý směr otočte o 90° kolem svislé osy.

Stejně se prověšuje vodorovný **závitový otvor**. Přidejte {{ui:shape.teardrop}} s {{ui:prop.teardropDiameter}} podle průměru jádra závitu, tedy volného prostoru mezi zuby, například asi 8,4 mm pro M10. Délka odpovídá závitovému otvoru. Vyberte oba a přes {{ui:editor.tool.align}} zarovnejte středy. Střed kapkovitého otvoru odpovídá středu kruhové části, nikoli obálce se špičkou. Pak oba slučte s tělesem. Závit se vyřízne běžně a hrot otevře horní část pro tisk bez podpěr.

## Válcové a kuželové zahloubení

Pro zapuštěnou hlavu šroubu slouží {{ui:shape.counterbore}} jako válcová kapsa pro válcovou hlavu DIN 912 a {{ui:shape.countersink}} jako kužel pro zápustnou hlavu DIN 7991. Oba tvary míří hlavou vzhůru. {{ui:prop.screwHoleHead}} je průměr kapsy či kužele, {{ui:prop.screwHoleShaft}} průměr průchozího otvoru a {{ui:prop.screwHoleLength}} celková délka. U válcového nastavujete {{ui:prop.screwHoleHeadDepth}}, u kuželového {{ui:prop.screwHoleAngle}}, obvykle 90°. Výchozí hodnoty odpovídají M3.

{{ui:shape.doubleCountersink}} je otvor se zkosením na obou stranách pro desku, která má vepředu i vzadu vypadat čistě: na každém konci se kužel otevírá na {{ui:prop.screwHoleHead}} a mezi nimi je {{ui:prop.screwHoleShaft}}. {{ui:prop.screwHoleAngle}} a {{ui:prop.screwHoleLength}} nastavíte jako dosud. Je-li otvor příliš krátký na dva celé kužely, setkají se uprostřed s tímto úhlem a dřík zůstane širší, než jste nastavili: hlava 10 mm, dřík 6 mm, 90° a délka 2 mm dají dva kužely z 10 na 8 mm. Jako výřez ji protáhnete dílem jako ostatní.

Přepněte tvar na výřez a slučte s dílem. Horní konec nechte trochu vyčnívat nad povrch, aby se kapsa čistě otevřela. Pro šestihrannou matici použijte {{ui:shape.polygon}} se šesti stranami jako výřez.
