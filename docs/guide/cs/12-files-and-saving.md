---
title: Soubory, ukládání a sdílení
summary: Kde jsou projekty uložené, jak je zálohovat, podporované formáty a možnosti společného serveru.
---

## Kde jsou projekty uložené

Layerling ukládá vše do prohlížeče na vašem počítači. Nemáte účet a nic se neodesílá na server. Každá změna se ukládá automaticky. Náhled na úvodní stránce zachycuje poslední pohled před návratem přes {{ui:editor.homeDashboard}}. Ve stejném prohlížeči najdete projekty i po několika dnech.

Při návratu z prázdného projektu se program zeptá, zda jej ponechat. {{ui:confirm.yes}} nebo [[Enter]] jej zachová, {{ui:confirm.no}} odstraní, aby se nehromadily prázdné projekty. U projektu ve sdílené serverové složce {{ui:confirm.no}} smaže soubor ze serveru, a to pro všechny, kdo server používají.

Nevýhodou je ztráta projektů při vymazání úložiště prohlížeče nebo přechodu na jiný počítač. **Důležitou práci proto zálohujte do souboru.**

## Složky pro projekty

Při desítkách projektů jeden seznam nestačí. Na úvodní stránce vytvoří {{ui:shared.newFolder}} složku pro projekty tohoto prohlížeče; kliknutím na složku ji otevřete. Složky mohou obsahovat další složky.

- **Do složky:** přetáhněte projekt na složku nebo v nabídce projektu zvolte {{ui:shared.moveTo}}, kde jsou všechny složky. Nový projekt i soubor, který otevřete nebo importujete, se uloží do právě otevřené složky.
- **Zase ven:** první dlaždice ve složce, `..`, a řádek pod záložkami vedou zpět; i na ně lze projekt přetáhnout. Složka přetažená na jinou složku se do ní vloží.
- **Přejmenovat a smazat** najdete v nabídce složky. Smazáním složky se nesmaže žádný projekt: její obsah se posune o úroveň výš.
- **Vyhledávání** prochází všechny složky; nalezený projekt ukazuje svou složku a kliknutím na ni ji otevřete.

{{ui:dashboard.backupAll}} zachová složky: projekty jsou v záložním souboru ve svých složkách a obnovení je vrátí na místo. Složky tohoto prohlížeče jsou oddělené od složek na serveru. Náhledové obrázky karet jsou v souboru také, takže po obnovení jsou hned zpět.

## Zálohování a předávání

Každý projekt na úvodní stránce má nabídku přejmenování, duplikování a smazání. Řada tlačítek vedle záložek je na každé záložce stejná. {{ui:dashboard.backupAll}} zabalí všechny projekty otevřené záložky do jediného souboru ZIP. {{ui:dashboard.restoreBackup}} hned vedle (je tam i na novém počítači bez projektů) je obnoví i v jiném prohlížeči nebo počítači; stejný soubor přijme i {{ui:dashboard.importGeometry}}. Součástí zálohy jsou také {{ui:myShapes.title}} z tohoto prohlížeče ve složce `Custom shapes`, viz [Tvary](chapter:shapes). Pokud obnovíte zálohu v prohlížeči, který některé z těchto projektů už má, nepřidají se znovu; zpráva uvede, kolik jich tu už bylo. Nad projekty tohoto prohlížeče krátký řádek připomíná, že nejsou uložené nikde jinde.

Jen některé návrhy: po {{ui:dashboard.select}} zabalí {{ui:dashboard.backupSelected}} jen vybrané návrhy v jejich složkách do jednoho souboru ZIP a {{ui:dashboard.backupSelected}} v nabídce složky zabalí tuto složku se všemi návrhy a složkami v ní. Vlastní tvary nejdou ani v jednom případě s sebou a {{ui:dashboard.restoreBackup}} vrátí obojí jako plnou zálohu. Platí to pro návrhy tohoto prohlížeče.

Jeden projekt uložíte v editoru přes {{ui:editor.export}}, formát **LYL** a {{ui:export.saveProject}}. LYL je vlastní formát Layerlingu a obsahuje tvary, sloučení, náčrty, CAD data, importované podklady i historii kroků zpět. V {{ui:export.historyTitle}} určíte počet přenášených posledních kroků. Výchozí odpovídá nastavení {{ui:workspace.history}}. Krajní volba {{ui:export.historyNone}} uloží jen současný stav, například pro sdílení bez historie. Export vytvoří kopii pod názvem {{ui:export.fileName}}; historie v prohlížeči zůstává zachovaná. Starší `.skf` lze stále otevřít, ale další uložení používá `.lyl`.

**Ukládání do vlastní složky v Chrome a Edge.** Tlačítko otevře systémový dialog pro výběr složky a názvu, včetně přepsání souboru. Následné [[Ctrl]]+[[S]] ukládá do stejného souboru bez dialogu. Také projekt otevřený z `.lyl` přes {{ui:dashboard.importGeometry}} nebo tlačítko otevření v exportním okně se ukládá zpět do původního souboru. Prohlížeč může požádat o povolení zápisu. Po obnovení stránky se vazba na soubor zapomene a další [[Ctrl]]+[[S]] se zeptá znovu; dialog začíná v naposledy použité složce. Firefox a Safari takový zápis nepovolují. Soubor stáhnou do Stažených souborů a [[Ctrl]]+[[S]] jej stáhne znovu. Firefox lze v Nastavení → Obecné → Stahování nastavit, aby se na složku vždy zeptal. Pokud tam souboru dáte jiný název, projekt si ponechá svůj, protože verze nebo datum v názvu souboru bývá míněno právě tak; zpráva po uložení pak nabídne {{ui:status.renameDraftToFile}}.

## Přílohy

Návod, seznam dílů, poznámky, fotka nebo katalogový list mohou zůstat u projektu jako soubory. {{ui:editor.attachments}} v liště {{ui:editor.group.manage}}, sponka, otevře seznam; malá tečka na sponce ukazuje, že projekt nějaké má.

- **{{ui:attachments.upload}}:** Vyberte jeden nebo více souborů: `.md` (Markdown) nebo `.txt` jako prostý text (UTF-8), obrázky `.png`, `.jpg`, `.jpeg` nebo `.webp`, nebo dokumenty `.pdf`. Soubor se kontroluje podle obsahu, takže soubor, který není tím, co říká jeho název, se odmítne, a jiné typy, mezi nimi `.svg`, připojit nelze. Textový soubor smí mít nejvýše 2 MB, obrázek 16 MB a PDF 32 MB; projekt pojme až 32 souborů a dohromady 64 MB.
- **Seznam:** Šipka stáhne soubor tak, jak byl nahrán. Koš ho odebere; řádek se předtím ještě jednou zeptá a odebraný soubor se zpět nevrátí, protože přílohy nejsou součástí historie kroků zpět.
- **Čtení souboru:** Oko v řádku souboru `.md` nebo `.txt` ho otevře ke čtení v okně, aniž by se stahoval. Markdown se zobrazí naformátovaný, s nadpisy, seznamy, zaškrtávacími políčky, tabulkami a kódem; textový soubor přesně tak, jak je napsaný. Fungují jen odkazy na webové stránky a e-mailové adresy a otevírají se na nové kartě. Obrázky, které soubor uvádí, se nenačítají: na jejich místě stojí jejich popis. Okno zavře Escape, křížek nebo kliknutí vedle něj. Číst lze i v zobrazení historie.
- **Prohlížení obrázku:** Oko v řádku obrázku ho otevře ve stejném okně, zmenšený, pokud je velký. PDF oko nemá: stáhněte ho a otevřete v programu, kterým čtete soubory PDF.
- **Název, který už existuje:** layerling se zeptá, co udělat. {{ui:attachments.replace}} vloží nový obsah do souboru s tímto názvem, který zůstane na svém místě v seznamu. {{ui:common.rename}} přidá nový soubor pod jiným názvem a navrhne první volný, například `poznamky 2.md`. Křížek nový soubor vynechá. Velká a malá písmena se berou stejně a nahrání téhož souboru znovu nic nezmění.

Přílohy se ukládají s projektem jako všechno ostatní: v prohlížeči, do souboru LYL, do zálohy i v projektu na serveru, kam se dostanou, jakmile se nějaká přidá nebo odebere. S {{ui:import.insertProject}} ani s vlastním tvarem se nepřenášejí a hlášení chyby je neobsahuje. Projekt s přílohami se ukládá jako novější druh souboru LYL: starší layerling řekne, že ho neotevře, místo aby soubory ztratil. Projekt bez příloh se ukládá úplně stejně jako dřív.

## Export

Použijte {{ui:editor.export}} nebo [[Ctrl]]+[[E]].

![Exportní okno s formáty STL, 3MF, OBJ, STEP, SVG, PNG, LYL a 2D.](shot:export-panel)

Nahoře je název souboru, pod ním formát. Je-li něco vybráno, exportuje se jen výběr, jinak celý projekt. Pokud výběr vynechává viditelné části, okno na to upozorní. {{ui:export.selectAll}} vybere vše viditelné. Úspěšný export okno zavře; při chybě zůstane otevřené s hlášením.

| Formát | Použití | Vlastnosti |
| --- | --- | --- |
| **STL** | slicer a 3D tisk | Trojúhelníková síť, nejjednodušší a nejrozšířenější formát. STL nerozlišuje jednotlivé díly: překrývající se tělesa se spojí do jedné sítě. Pro zachování samostatných dílů použijte 3MF. V Chrome a Edge první export otevře výběr souboru; další zapisují do stejného souboru, dokud nezměníte název nebo nezvolíte {{ui:export.stlSaveAs}}. |
| **3MF** | slicer s barvami | Každé těleso zůstává samostatným dílem s názvem a barvou. Překrývající se tělesa se spojují pouze při stejné barvě. Je-li jinak barevný objekt vložen do druhého, například logo do destičky, dříve vytvořený uvolní místo pozdějšímu. Vhodné pro PrusaSlicer, Bambu Studio, OrcaSlicer a Cura. Bambu Studio a OrcaSlicer se zeptají na přiřazení barev filamentům; upozornění, že soubor nepochází od Bambu, neznamená závadu. |
| **OBJ** | modelování a výměna dat | Rozšířený síťový formát. Barvy jsou přímo ve vrcholech souboru, bez samostatného `.mtl`. Bambu Studio a OrcaSlicer je čtou a nabídnou přiřazení filamentů, jiné programy mohou načíst jen tvar. Stejně jako u 3MF se spojují pouze překryvy stejné barvy. |
| **STEP** | plnohodnotný CAD | Zachovává přesnou geometrii kvádrů, válců, koulí, kuželů, tvarů z obrysu, hvězd, srdcí, elips, trubek, polokoulí, oblých střech, zaoblených kvádrů, rybin, otvorů i dalších tvarů. Podporuje ohnuté trubky, klíny, jehlany, paraboloidy, závity, pružiny, ozubená kola, zkosení a zaoblení. První export v relaci jednorázově načte CAD jádro, přibližně 22 MB. |
| **SVG** | laser a plotr | Čistý pohled shora v milimetrech včetně otvorů a zakřivených obrysů. V poli {{ui:export.svg.view}} zapíše {{ui:export.svg.viewFootprint}} jen obrysy, kterými objekty stojí na pracovní rovině. {{ui:export.svg.viewEdges}} zapíše hrany viditelné shora jako čáry, každé těleso ve své barvě. |
| **DXF** | firma s laserovým řezáním | Stejný pohled shora ({{ui:export.svg.viewSilhouette}} nebo {{ui:export.svg.viewFootprint}}) jako jeden obrys z úseček, skutečných oblouků a kružnic - bez křivek, splajnů a oblouků složených z krátkých úseček - ve vrstvě 0 bílou barvou, DXF 2000 v milimetrech, nezrcadlený. Tělesa, která se dotýkají, tvoří jeden obrys, takže žádná čára se neřeže dvakrát. Firmy chtějí jeden díl na soubor: před exportem díl vyberte. Na laserové řezačce zatím nevyzkoušeno: zpětná vazba je vítána. |
| **PNG** | fórum, katalog výtisků, dotazy | Snímek aktuálního pohledu ve dvojnásobném rozlišení bez úchytů, výběru a kót. V okně nastavíte {{ui:export.png.plate}} a {{ui:export.png.transparent}}. Pohled nejprve natočte a přibližte. Výběr zde nehraje roli. |
| **LYL** | další práce v Layerlingu | Upravovatelný projekt se všemi jeho daty. |
| **2D** | dílna, soustruh, frézka, dokumentace | Výkres PDF nebo SVG v měřítku 1:1: nárys, půdorys a pravý bokorys na formátu ISO, viz níže. |

**STL do vlastní složky v Chrome a Edge.** První export projektu otevře systémový dialog pro výběr souboru a případné přepsání. Další exporty stejného projektu zapisují do něj bez dialogu, dokud nezadáte jiný název souboru nebo nestisknete {{ui:export.stlSaveAs}}. Po změně názvu se znovu otevře výběr souboru. Okno uvádí název a volba **Uložit jako…** vedle exportu umožňuje vybrat jiný soubor. Složku pro STL si dialog pamatuje odděleně od projektů. Po obnovení stránky se vazba zapomene a příští export se zeptá znovu. Firefox a Safari používají běžné stažení.

Nesloučený výřez se při exportu odečte od všech těles, která protíná, tak jako v zobrazení. Před každým exportem tedy nemusíte slučovat. U exportu výběru se zohlední jen vybrané výřezy. Samotný výřez exportovat nelze a program na to upozorní.

STEP přenáší pouze přesná CAD tělesa. Tvary bez přesné geometrie, například síť importovanou z STL, vynechá. Závěrečné hlášení uvede jejich názvy a důvody. Pro tisk použijte STL nebo 3MF, které zahrnou všechny díly.

### Výkres pro dílnu

Vyberte **2D**, jehož popis po najetí označuje výkres, a pod názvem souboru zvolte PDF nebo SVG. Kreslí se výběr, případně celý viditelný projekt. Nesloučené výřezy se také odečítají.

Nárys, půdorys a pravý bokorys používají promítání v prvním kvadrantu: pravý bokorys je vlevo od nárysu a půdorys pod ním. Výkres se vejde na nejmenší vhodný list ISO od A4 po A0, případně na větší vlastní formát. Měřítko je vždy 1:1. Každý pohled má celkovou šířku a výšku, neviditelné hrany jsou čárkované. Kruhové otvory rovnoběžné se směrem pohledu mají středový kříž a označení F1, T1 nebo R1. Tabulka dole uvádí průměry a polohy od levého dolního rohu příslušného pohledu. Popisové pole vpravo dole obsahuje název, měřítko, jednotky, datum a číslo listu. Popisky používají jazyk rozhraní.

Tiskněte na 100 % nebo ve skutečné velikosti, jinak rozměry nebudou odpovídat. Automaticky se nekótují závity, hloubky, tolerance ani šikmé otvory. Rozměry pocházejí z polygonové sítě modelu a jsou jmenovité. Nad 100 000 trojúhelníků nebo 200 otvorů program výkres odmítne s vysvětlením; vyberte méně objektů.

Promítání vychází z práce WC3D na výkresech projektu Cadverix-3D.

### Kolik filamentu bude potřeba?

U STL, 3MF, OBJ a STEP ukazuje {{ui:export.estimateTitle}} objem, hmotnost a délku filamentu o průměru 1,75 mm. Počítají se viditelná tělesa, výřezy jsou odečtené a překryvy jen jednou. Vpravo vyberete PLA, PETG, ABS, ASA, TPU nebo PA, tedy nylon; hmotnost odpovídá hustotě materiálu. Objem je skutečný geometrický objem tělesa. Hmotnost a filament jsou hrubým odhadem se stěnami a výplní. Nastavte {{ui:export.estimateInfillLabel}}, výchozí 15 %, a {{ui:export.estimateWallsLabel}}, výchozí 2. Panel uvede použité hodnoty i hmotnost při plném tisku. Skutečnost určuje nastavení sliceru. Odhad slouží k porovnání návrhů a posouzení, zda vystačí cívka. Při 100% výplni se počítá plné těleso, tedy horní mez spotřeby.

## Import

Cizí soubory vložíte přes {{ui:editor.import}} nebo [[Ctrl]]+[[I]].

![Importní okno pro otevření či vložení projektu a přetažení geometrie.](shot:import-panel)

- **{{ui:import.openProject}}:** otevře `.lyl` nebo starší `.skf` jako nový projekt.
- **{{ui:import.insertProject}}:** přidá tělesa uloženého projektu do otevřeného. Hodí se pro opakovaně používané základy: jednou je vytvoříte a uložíte, později vkládáte. Když přetáhneš jeden nebo více souborů `.lyl` do oblasti níže, vloží se stejným způsobem. Jeho [poznámky](chapter:measuring-and-notes) přijdou s ním, sbalené a očíslované za těmi, které už projekt má, stejně jako jeho referenční body.
- **DXF:** DXF, jak obrys dílu posílá firma s laserovým řezáním nebo dodavatel, se načte jako díly k další práci: každý uzavřený obrys jako 4 mm vysoké těleso a každý otvor v něm jako samostatný otvor vedle něj (kruhový jako válec), takže otvor ve 3D editoru posunete a změníte jeho velikost jako kterýkoli jiný; pro posun celého dílu vyberte všechny. V milimetrech (soubor v palcích se převede, soubor bez jednotky se čte v milimetrech), oblouky a kružnice zůstanou skutečnými oblouky. Načítají se úsečky, oblouky, kružnice, elipsy, křivky, splajny a bloky; text, kóty a šrafy se vynechají, stejně jako obrysy, které se neuzavírají - zpráva uvede kolik. Tloušťku nastavíte ve vlastnostech.
- **Přidání geometrie:** přetáhněte STL, OBJ, 3MF, STEP, SVG, PNG nebo JPG do okna nebo soubor vyberte kliknutím. Importované sítě můžete otáčet, přesouvat, prořezávat a doplňovat. SVG, včetně trasovaných obrázků z picsvg.com nebo Inkscapu, se vloží jako těleso z náčrtu s původními úsečkami a křivkami, výškou 4 mm a orientací pro čtení shora. V nastavení {{ui:prop.sketchFill}} zvolíte plochu či rozšířenou čáru směrem ven, dovnitř nebo souměrně. {{ui:prop.sketchSilhouette}} odstraní vnitřní otvory, viz [Náčrty](chapter:sketches), část o výplni a siluetě. Body upravíte v náčrtu. Pouze SVG s více než 2500 úsečkami a křivkami se vloží jako pevná síť. Obrázek PNG nebo JPG se převede na obrys a vloží stejným způsobem jako těleso náčrtu široké 50 mm, jehož velikost můžete následně změnit. Obrys tvoří část mimo pozadí; za pozadí se považuje část převažující na okraji obrázku. Stejně se převede SVG obsahující pouze jeden rastrový obrázek. Obrys, který se protíná nebo dotýká sám sebe a nelze z něj vytvořit těleso, se vynechá; hlášení uvede počet takových tvarů. V kreslicím programu pak sjednoťte překryvy, uzavřete obrysy a soubor uložte znovu. Soubory z jedné stránky, například samostatně exportované vrstvy, zůstanou navzájem zarovnané, pokud před importem zapnete {{ui:import.keepSvgPage}}. Jinak se každý vycentruje samostatně. SVG nakreslené v několika barvách přijde také jako jedno těleso pro každou barvu, každé ve své barvě a na svém místě; s více než 12 barvami, jaké má obkreslený obrázek, zůstane jedním tělesem. Barevné OBJ a 3MF se importují po barvách na původní místa. OBJ může obsahovat barvy přímo nebo v doprovodném `.mtl`, který vyberte také; lze importovat i celý ZIP z Tinkercadu. 3MF uchovává barvy uvnitř. Projekty Bambu Studio, OrcaSliceru a PrusaSliceru přidělují dílům barvu jejich filamentu. Obsahuje-li 3MF více objektů, například objekt pro každou podložku, vloží se samostatně. Modifikátory, záporné objemy a blokátory podpěr sliceru se vynechají. Malování barev na jednotlivé plochy se nečte.
- **Z Tinkercadu:** Export STL nebo OBJ z Tinkercadu se načte jako geometrie jako každá jiná síť; OBJ zachová barvy. Skutečné tvary přenese bezplatný nástroj od komunity: [Export to layerling](https://taylormadearmy.github.io/tinkercad-layerling-importer/) od taylormadearmy, záložka, která v prohlížeči převede návrh z Tinkercadu na soubor `.lyl`, který tady otevřete přes {{ui:import.openProject}}. Není součástí layerlingu a sami jsme ho ještě nezkoušeli; autor ho vyzkoušel na Windows s Chromem.

Projekt z **novějšího Layerlingu** může obsahovat neznámé tvary, parametry nebo vlastní písma. Pokud jej kvůli tomu nelze otevřít, hlášení uvede obě verze. Otevře-li se, upozorní na možný odlišný vzhled novějších prvků. Pomáhá aktualizace: layerling.com po obnovení poskytuje aktuální verzi, nainstalovaná aplikace ji načte při dalším spuštění a vlastní server musíte aktualizovat sami.

Obrázkové podklady se přidávají v režimu náčrtu, viz [Náčrty](chapter:sketches).

## Zjednodušení importované sítě

Skenovaná či sochařsky vytvořená síť mívá zbytečně mnoho trojúhelníků, které se zpracovávají při přesunu, řezání i ukládání. {{ui:simplify.title}} v části Úpravy nebo nabídce pravého tlačítka zobrazí vedle sebe originál a zjednodušený náhled. Oba se současně otáčejí a přibližují stejnými tlačítky jako pracovní plocha. Zadejte zachované procento nebo počet trojúhelníků a potvrďte {{ui:simplify.apply}}. Výsledkem je obyčejná síť. U výsledku řezu či sloučení tím přijdete o původní části a {{ui:group.edit}}.

Řezání, slučování a průnik importovaných sítí se počítají v prohlížeči. Nastavení {{ui:workspace.booleanTriangleLimit}} omezuje povolený počet trojúhelníků. Nad limitem se operace neprovede a hlášení uvede velikost sítě. Nejprve ji zjednodušte nebo limit přiměřeně výkonu počítače zvyšte.

## Hlášení chyby

Při nečekaném chování použijte {{ui:editor.bugReport}} v zápatí vedle odkazu na fórum. Vznikne ZIP, protože GitHub a některá fóra nepřijímají samotný `.lyl`. Obsahuje projekt a krátký text s verzí, prohlížečem, rozlišením a posledními hlášeními a chybami. Úvodní stránka ZIP otevře jako zálohu nebo jej rozbalte a otevřete `.lyl`. Diagnostika neobsahuje osobní údaje. Přiložením k hlášení na fóru či GitHubu umožníte problém zopakovat na stejném modelu.

Při chybě, která aplikaci zastaví, se místo prázdné stránky objeví chybové okno. Nabízí stažení posledního stavu projektu uloženého v prohlížeči do `.lyl`, návrat na přehled nebo nový projekt. Hlášení a uložený soubor pomáhají při hledání příčiny.

## Sdílené projekty na serveru

Vlastní instalace může nabídnout společnou složku pro všechny uživatele. Úvodní stránka pak ukazuje projekty na dvou záložkách, {{ui:shared.trailRoot}} pro společnou složku a jedné pro tento prohlížeč, každou s počtem projektů; záložka s více projekty je první a otevřená. Lze vytvářet podsložky, přesouvat projekty přetažením a prohledávat celou složku. Projekt se průběžně ukládá zpět na server. Místní projekt přesunete přetažením jeho karty na záložku {{ui:shared.trailRoot}} nebo přes {{ui:dashboard.sendToServer}}. Když je otevřená záložka {{ui:shared.trailRoot}}, {{ui:dashboard.createDesign}} a {{ui:dashboard.restoreBackup}} ukládají projekt do otevřené složky na serveru a {{ui:dashboard.backupAll}} zabalí všechny projekty serveru i s jejich složkami a vlastními tvary do jednoho souboru ZIP. Název projektu odpovídá názvu souboru, takže přejmenování karty či názvu v editoru přejmenuje i serverový soubor. Smazání projektu nebo složky je trvalé a odstraní i pracovní kopii v prohlížeči. Serverové vlastní tvary jsou ve složce `Custom shapes`, viz [Tvary](chapter:shapes).

{{ui:dashboard.sendAllToServer}} přesune všechny místní projekty najednou. Zapnutí {{ui:dashboard.newOnServer}} vytváří nové projekty rovnou na serveru a ukládá je tam od první změny. Volbu si pamatuje tento prohlížeč. Projekt, který nelze přesunout, například kvůli shodnému názvu, zůstane v prohlížeči a hlášení uvede počet neúspěchů.

Nejde o současnou editaci: každý pracuje s vlastní kopií souboru. Změnil-li jej mezitím někdo jiný, Layerling odmítne přepsání.

Na layerling.com je tato funkce vypnutá. Nastavení vlastního serveru popisuje [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.md).
