---
title: Text a nápisy po oblouku
summary: Vystouplé a zahloubené nápisy ve vestavěném či vlastním písmu, případně po kružnici na minci, víčku nebo prstenci.
---

## Vložení textu

V knihovně vyberte {{ui:shape.text}} a položte jej na plochu. Do pole {{ui:prop.text}} vpravo zadejte nápis. Níže jsou nastavení:

- **{{ui:prop.font}}:** sedm vestavěných písem Multilanguage, Sans, Serif, Script, Monospace, Rounded a Stencil, které používá přímé tahy. Nový text začíná písmem Sans. Všechna obsahují akcentované znaky jako ä, ö, ü, é a znak €. Další můžete přidat, viz [Vlastní písma](#vlastni-pisma).
- **{{ui:nameTag.letterSize}}:** velikost písmen při pohledu shora; jejich tloušťku určuje {{ui:prop.height}}.
- **{{ui:prop.height}}:** vzdálenost, o kterou nápis vystupuje z povrchu.
- **{{ui:prop.bevel}}:** změkčí hrany písmen. Počet kroků určuje {{ui:prop.segments}}.
- **{{ui:nameTag.letterEdge}}:** zaoblí nebo zkosí horní hranu písmen, jako u jmenovky: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} nebo {{ui:nameTag.edge.chamfer}}, s hodnotou {{ui:nameTag.letterEdgeSize}} (nejdřív 0,4 mm, nejvýš tak vysoká jako text). Jde dál než {{ui:prop.bevel}}, ale jen tak daleko, jak jsou tahy široké: kde je tah tenčí než dvojnásobek velikosti, hrana skončí užší horní plochou. Spodek zůstává rovný, takže jednotlivá písmena lze pak nalepit. Dokud je hrana zvolená, nahrazuje {{ui:prop.bevel}}.
- **Rozměry:** délku a šířku nápisu upravíte úchyty nebo číselně stejně jako u jiných tvarů.
- **{{ui:prop.textStretch}}:** Zpočátku vypnuto: písmena si drží proporce a stojí uprostřed rámečku, takže rámeček natažený víc do šířky nebo do hloubky, než slovo potřebuje, zůstane větší než písmena. Po zapnutí se písmena natáhnou v obou směrech na celý rámeček: velké písmeno lze udělat nižší nebo užší jako v Tinkercadu. Platí pro rovný text; zakřivený text má vlastní velikost písmen.
- **{{ui:prop.textVertical}}:** Skládá písmena shora dolů pod sebe, každé uprostřed jedné svislé čáry, třeba pro cedulku na zárubni nebo jméno podél pera. Rámeček se postaví na výšku a písmena si zachovají velikost; {{ui:prop.textSpacing}} určuje mezeru mezi nimi. U textu v oblouku tvoří písmena sloupec podél levé strany kružnice a zůstávají vzpřímená; {{ui:prop.textInwardColumn}} ho přesune na pravou stranu.

Text začíná jako jediné těleso. Pro samostatnou práci s písmeny použijte {{ui:inspector.separateParts}}. Každé písmeno pak bude vlastním tvarem.

Hrany přímého i obloukového textu lze zkosit a zaoblit, viz [Úpravy hran a vytváření dutin](chapter:edges-and-hollowing). Kvůli úzkým tahům používejte malé hodnoty, například 0,2 až 0,5 mm.

## Vlastní písma

K vestavěným písmům můžete přidat soubor z počítače, v Chrome a Edge i přímo nainstalované písmo. Dole v {{ui:prop.font}} zvolte {{ui:font.manage}}. Otevře se {{ui:font.title}}.

- **{{ui:font.addFile}}** načte TrueType `.ttf`, OpenType `.otf` nebo WOFF `.woff`. Soubor můžete do okna také přetáhnout.
- **Ve Windows** jsou systémová písma v `C:\Windows\Fonts`, kterou výběrové okno prohlížeče skrývá. Otevřete ji v Průzkumníku a písmo přetáhněte do {{ui:font.title}}. Uživatelská písma jsou v `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, dostupné i z dialogu. Na Macu jsou v `/Library/Fonts` a `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** vypíše nainstalovaná písma. Poprvé se prohlížeč zeptá na přístup. Písmo vyhledejte a zvolte kliknutím.

Vybraný text dostane nové písmo ihned. Jinak se objeví v {{ui:prop.font}} ve skupině {{ui:font.customGroup}}. Tlačítko {{ui:font.use}} je použije na vybrané texty. Fungují stejně jako vestavěná: text po oblouku, úpravy hran i STEP. Znaky, které písmo nemá, se doplní ze Sans.

### Arabština a hebrejština

Arabština, perština, urdština a hebrejština se píší zprava doleva. První písmeno stojí vpravo. Ve smíšeném textu, například „Name عربي“, se obrací jen příslušné slovo, číslice se zachovávají. Arabská písmena se podle pravidel spojují se sousedy a lám-alif tvoří ligaturu. Je potřeba písmo obsahující dané znaky; vestavěná je nemají. Přidejte například Arial, Tahoma nebo Segoe UI z Windows či volné Noto Naskh Arabic, Noto Sans Arabic nebo Amiri. Vokalizační znaménka se umísťují k odpovídajícím písmenům. Oblouk, obrysy, siluety, vrstvy i jmenovky fungují stejně jako u ostatních textů.

### Podpora v prohlížečích

| Prohlížeč | Soubor písma | Nainstalované písmo |
| --- | --- | --- |
| Chrome a Edge na počítači včetně nainstalovaného Layerlingu | ano | ano, po udělení přístupu |
| Firefox | ano | ne |
| Safari na Macu | ano | ne |
| Tablet a telefon | ano, ze souborů zařízení | ne |

Web nemůže libovolně číst nainstalovaná písma. Odpovídající oprávnění mají jen Chrome a Edge na bezpečné stránce přes `https`, jako na layerling.com. Při provozu přes `http`, například na vlastním serveru nebo domácím Dockeru, {{ui:font.fromSystem}} chybí. Písmo pak přetáhněte z Průzkumníku. V ostatních prohlížečích vyberte jeho soubor ze složky písem. Pokud jste přístup v Chrome či Edge odmítli, můžete jej znovu povolit v nastavení webu u adresního řádku.

Layerling neumí WOFF2, kolekce `.ttc` ani barevná emoji písma. Pro WOFF2 bývá dostupná varianta TTF nebo OTF. Z velmi velkých písem, například čínských, načítá prvních 8000 znaků. Proměnné písmo používá výchozí řez, obvykle běžnou tloušťku.

Některá písma, zejména psací a proměnná, skládají znaky z překrývajících se tahů. Při načtení je Layerling sjednotí do čistého obrysu, aby bylo těleso tisknutelné. Obrys se pak skládá z krátkých úseček místo křivek, což není běžně vidět.

### Uložení písem

Vlastní písmo zůstává **v tomto prohlížeči na tomto počítači**. Jinde je musíte přidat znovu. Vymazání dat webu odstraní i písma. Koš v {{ui:font.title}} odstraní písmo z prohlížeče; existující projekty tím nepřijdou o uložené tvary písmen.

### Předávání projektů s vlastními písmy

Projekt **neukládá soubor písma**, jen obrysy použitých znaků včetně těch v historii. Pro „Hello“ se přenesou H, e, l a o. Platí to pro úložiště prohlížeče, server, `.lyl` i {{ui:myShapes.title}}.

- **Projekt se všude zobrazí správně**, i bez nainstalovaného písma. Texty lze přesouvat, otáčet, měnit velikost i zaoblovat.
- **Nové znaky potřebují písmo.** Pokud někdo zadá znak, jehož obrys projekt neobsahuje, použije se Sans. V {{ui:prop.font}} je písmo označené {{ui:font.fromDesign}}. Přidání původního souboru obnoví všechny znaky.
- **Exporty přenášejí geometrii.** STL, 3MF, OBJ, STEP a SVG obsahují tělesa či obrysy, nikoli písmo.
- **Starší verze Layerlingu** vlastní písma neznají a takový text zobrazují v Multilanguage.

**Licence:** Písmo je autorské dílo a jeho licence určuje povolené použití. Vložené obrysy jednotlivých znaků se přenášejí podobně jako v PDF a většina licencí to umožňuje. Některá komerční písma ale zakazují i sdílení jednotlivých znaků. Před zveřejněním projektu licenci ověřte. Volná písma, například z Google Fonts převážně pod SIL Open Font License, takové předávání běžně umožňují. Samotný výtisk či STL už obsahuje pouze geometrii, nikoli soubor písma.

## Vystouplý nebo zahloubený nápis

- **Vystouplý:** položte text na povrch a slučte s tělesem. Vznikne reliéf.
- **Zahloubený:** změňte text na {{ui:inspector.hole}}, mírně jej zasuňte do povrchu a slučte s tělesem. Písmena se vyryjí do materiálu.

Pro nápis na boční stěně nejprve položte pracovní rovinu na tuto plochu, viz [Pohled a pracovní rovina](chapter:view-and-workplane).

## Obrys, silueta a rozšíření

Text nemusí tvořit plná písmena. {{ui:prop.textFill}} nabízí stejné možnosti jako Tinkercad:

- **{{ui:prop.textFill.filled}}:** běžná plná písmena.
- **{{ui:prop.textFill.outline}}:** čára podél obrysu, z poloviny uvnitř a z poloviny vně.
- **{{ui:prop.textFill.outer}}:** čára vně původního obrysu.
- **{{ui:prop.textFill.inner}}:** čára uvnitř obrysu.

Po volbě čáry se zobrazí {{ui:prop.sketchLineWidth}} a {{ui:sketch.strokeJoin}}, tedy napojení rohů {{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} nebo {{ui:sketch.strokeJoin.miter}}. Méně časté volby jsou pod {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} vyplní otvory v O, A či e a {{ui:prop.textWider}} rozšíří plná písmena o šířku čáry do všech stran. Dotýkající se písmena se spojí.

Vnější nebo souměrná čára a rozšíření zvětší ohraničení textu, ale zachovají velikost původních písmen. {{ui:prop.bevel}} a {{ui:prop.segments}} se používají pouze u plných písmen.

## Vrstvy a jmenovky

Vícebarevná jmenovka má nahoře písmena, pod nimi rozšířený text druhé barvy a dole souvislou podložku třetí barvy. Layerling ji vytvoří jedním příkazem:

- **Nová jmenovka:** vložte {{ui:shape.nameTag}} z knihovny. Výchozí je „Name“ bílými písmeny na červeném okraji a tmavé podložce.
- **Z existujícího textu:** vyberte jej a zvolte {{ui:nameTag.makeLayers}} nahoře v nastavení.

Karta {{ui:nameTag.title}} obsahuje:

- **{{ui:prop.text}}** a **{{ui:prop.font}}**, včetně vlastních písem. Jmenovka mění velikost podle nápisu.
- **{{ui:nameTag.letterSize}}:** výšku velkých písmen v mm. Všechny vrstvy se přizpůsobují a zůstávají zarovnané.
- **{{ui:prop.textVertical}}:** postaví jmenovku na výšku, písmena pod sebou, i se všemi vrstvami.
- **{{ui:nameTag.layers}}:** řádky vrstev shora dolů. Každý má barvu, rozšíření oproti písmenům, výšku a {{ui:nameTag.noHoles}} pro vyplnění otvorů v O a A. {{ui:nameTag.corners}} určuje rohy rozšířených vrstev: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} nebo {{ui:nameTag.corner.miter}}. Horní řádek představuje písmena. **+** přidá spodní vrstvu a **–** ji odebere. Jmenovka má dvě až šest vrstev.
- **{{ui:nameTag.keyring}}:** přidá ke spodní vrstvě ouško s oblým koncem a otvorem na kroužek. Rozměry ouška rostou s otvorem. Výchozí otvor 3 mm má ouško široké 6,5 mm s přesahem 6,75 mm; okraj otvoru je 2 mm od okraje podložky. Nastavte {{ui:nameTag.keyringDiameter}} a {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} nebo {{ui:nameTag.side.top}}. Otvor prochází všemi zasaženými vrstvami a ouško se přizpůsobuje textu, velikosti i písmu. {{ui:nameTag.keyringAlong}} posouvá poutko podél jeho strany nahoru nebo dolů (nahoře doleva nebo doprava), až tam, kde by stranu opustilo; 0 je střed. Hodí se, když střed strany narazí na mezeru, třeba vedle písmene J: posuň poutko tam, kde písmeno sahá ven.
- **{{ui:nameTag.letterEdge}}:** upraví horní hranu písmen: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} nebo {{ui:nameTag.edge.chamfer}}. {{ui:nameTag.letterEdgeSize}} začíná na 0,4 mm a nepřekročí výšku vrstvy. Funguje pro libovolné písmo i nápis. Úprava je součástí sítě písmen. Obecný nástroj hran by takový jemný text zpracovával jako náročnou síť, proto použijte tuto volbu.

Změny se projeví ihned. Jmenovka je skupinou: pohybuje se společně, ale vrstvy zůstávají samostatnými barevnými tělesy pro vícebarevný slicer. Pro úpravu hran konkrétní vrstvy použijte {{ui:group.editBundle}}, vyberte vrstvu a pokračujte podle [Úprav hran](chapter:edges-and-hollowing).

### Více jmenovek najednou

Do {{ui:textLayers.names}} zadejte nejvýše sto jmen, každé na samostatný řádek. Tlačítko uvede počet vznikajících jmenovek. Všechny mají stejné vrstvy, velikost písmen i otvor na kroužek, ale jsou samostatnými objekty. Rozmístí se do řad pod první s mezerou 5 mm. Seznam jmen má i běžný text níže ve svém nastavení.

## Štítky se symbolem

Štítek používá místo textu SVG symbol, například srdce, mrak nebo logo kroužku. Nahoře je symbol, pod ním širší obrys druhé barvy a dole souvislá podložka.

- **Nový štítek:** vyberte {{ui:shape.iconTag}}. V okně zvolte {{ui:iconTag.browse}}, soubor SVG, PNG nebo JPG, zkontrolujte obrázek, nastavte {{ui:iconTag.width}} a potvrďte {{ui:iconTag.ok}}. Štítek vznikne uprostřed podložky se stejnými vrstvami jako nová jmenovka.
- **Z tělesa náčrtu:** importované SVG i vlastní náčrt nabízí nahoře {{ui:nameTag.makeLayers}}.

Karta {{ui:iconTag.title}} obsahuje:

- **{{ui:iconTag.replace}}:** nahradí symbol jiným souborem SVG, PNG nebo JPG při zachování vrstev a šířky.
- **{{ui:iconTag.iconWidth}}:** šířku horního symbolu v mm; ostatní vrstvy zůstávají zarovnané.
- **{{ui:nameTag.layers}}:** stejné řádky jako jmenovka: barva, rozšíření, {{ui:nameTag.corners}}, výška, {{ui:nameTag.noHoles}}, **+** a **–**, dvě až šest vrstev. Horní řádek je samotný symbol.
- **{{ui:iconTag.count}}:** počet 1 až 100. {{ui:iconTag.fill}} jej vypočte podle podložky vybrané tiskárny. Tlačítko vytvoří kopie s mezerou 5 mm uprostřed podložky; původní štítek tvoří první kopii.

SVG musí obsahovat uzavřené obrysy. Pouhé otevřené čáry nelze převést na štítek. Náčrt s výplní typu čára ji zachová a symbol tvoří plocha rozšířené čáry.

**Obrázek PNG nebo JPG** se převede na obrys, který se zobrazí v náhledu. V {{ui:iconTag.part}} vyberte, zda se symbolem stane {{ui:iconTag.part.dark}}, nebo {{ui:iconTag.part.light}}; výchozí je část, která netvoří pozadí. Průhledné pixely do symbolu nikdy nepatří. Stejně se zpracuje SVG obsahující pouze jeden rastrový obrázek, jaké vznikne například při uložení vložené bitmapy v Inkscapu. Obrys sleduje pixely, takže malý obrázek vytvoří hrubé okraje. Nejlépe fungují obrázky o velikosti alespoň několika set pixelů. Při {{ui:iconTag.replace}} se použije část mimo pozadí.

## QR kódy

QR kód udělá z textu nebo webové adresy vzor, který přečte fotoaparát telefonu: odkaz na váš obchod na cedulce, název Wi-Fi na podtácku, telefonní číslo na přívěsku na klíče.

V knihovně tvarů zvolte {{ui:shape.qrCode}}. Otevře se okno; kurzor už stojí v textovém poli:

- **{{ui:qrCode.text}}:** co kód říká. Enter vytvoří kód, Shift+Enter začne nový řádek. Pod polem vidíte, kolik místa je obsazeno; písmena s diakritikou a jiné zvláštní znaky zabírají dva bajty. Je-li text příliš dlouhý, pole to řekne.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q nebo H. Vyšší úroveň se přečte, i když je část kódu špinavá nebo poškrábaná (L asi 7 %, M 15 %, Q 25 %, H 30 %), pro stejný text ale potřebuje více modulů, takže každý modul bude menší. Nejprve je zvoleno M.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} vytvoří samotný kód, vysoký 4 mm. {{ui:qrCode.style.raised}} ho postaví 1 mm vysoko na bílou destičku tlustou 3 mm, jako seskupení dvou barev, takže vícebarevný tisk vytiskne kód tmavě a destičku světle. {{ui:qrCode.style.engraved}} vyřízne kód 1 mm hluboko do destičky.
- **{{ui:qrCode.sizeBy}}:** zadejte {{ui:qrCode.sizeBy.width}} celého kódu (nejprve 40 mm) nebo velikost jednoho modulu; druhé číslo je uvedeno pod ním. Moduly menší než 0,8 mm dostanou varování. Je to orientační pravidlo pro trysku 0,4 mm, ne záruka: roli hraje tiskárna, materiál, barvy i telefon.
- **{{ui:qrCode.quietZone}}:** skenery potřebují kolem kódu prázdný okraj široký čtyři moduly. Na destičce je okraj součástí destičky; vypněte ho jen tehdy, když destička leží na větší světlé ploše. Samotný kód nemá vlastní okraj: nechte místo kolem něj volné.
- **Výšky:** výška kódu, na destičce výška kódu nebo hloubka rytí, a tloušťka destičky.

Náhled ukazuje kód tak, jak bude vytvořen. {{ui:qrCode.ok}} ho postaví doprostřed podložky.

Kód je těleso jako každé jiné: posuňte ho, otočte, změňte velikost (šířku a hloubku nechte stejné, jinak se kód zdeformuje), slučte ho, nebo z něj udělejte otvor a slučte ho s vlastním dílem, abyste ho do něj vyryli. Změna velikosti mění celý kód; každý modul zůstane čtvercový.

Karta {{ui:qrCode.title}} nahoře v jeho nastavení obsahuje text. Změňte ho a klikněte na {{ui:qrCode.regenerate}}: kód se vytvoří znovu tam, kde stojí, a tak široký, jaký je teď. Oprava chyb, klidová zóna a provedení zůstanou, jak byly zvoleny; pro jiné volby vytvořte nový kód z knihovny.

Před tiskem kód naskenujte telefonem a po tisku ještě jednou. Nejlépe se čte tmavé na světlém; světlý kód na tmavé destičce nepřečte každý telefon.

## Text po kruhovém oblouku

Pro nápis podél okraje mince, víčka nebo prstence zapněte {{ui:prop.textCurved}}.

![Text po kružnici. Všechna písmena mají společné účaří.](shot:curved-text)

Písmena se rozmístí po kružnici se společným účařím stejně rovnoměrně jako v přímém textu. K dispozici jsou čtyři volby:

- **{{ui:prop.textRadius}}**, 5 až 500 mm: poloměr kružnice, po níž vede účaří. Písmena přitom zůstávají na svém místě, mění se jen jejich zakřivení.
- **{{ui:nameTag.letterSize}}:** velikost písmen nezávislá na šířce tvaru.
- **{{ui:prop.textInward}}:** přesune text z horního na spodní oblouk; vršky písmen míří do středu.
- **{{ui:prop.textFlipped}}:** převrátí pouze písmena pro čtení z druhé strany. Poloha textu na kružnici zůstane zachovaná.

**Střed kružnice je středem tvaru.** Zarovnání textu s válcem či prstencem jej proto umístí soustředně. Při změně velikosti úchytem rostou poloměr a velikost písmen společně, aby se text nedeformoval.

> **Tip:** Nahoře stojí písmena vně účaří. S {{ui:prop.textInward}} jsou uvnitř a míří hlavami ke středu. Aby se nápis vešel na kotouč, součet poloměru textu a velikosti písmen má být menší než poloměr kotouče.
