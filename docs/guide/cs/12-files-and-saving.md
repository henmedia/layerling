---
title: Soubory, ukládání a sdílení
summary: Kde jsou projekty uložené, jak je zálohovat, podporované formáty a možnosti společného serveru.
---

## Kde jsou projekty uložené

Layerling ukládá vše do prohlížeče na vašem počítači. Nemáte účet a nic se neodesílá na server. Každá změna se ukládá automaticky. Náhled na úvodní stránce zachycuje poslední pohled před návratem přes {{ui:editor.homeDashboard}}. Ve stejném prohlížeči najdete projekty i po několika dnech.

Při návratu z prázdného projektu se program zeptá, zda jej ponechat. {{ui:confirm.yes}} nebo [[Enter]] jej zachová, {{ui:confirm.no}} odstraní, aby se nehromadily prázdné projekty. U projektu ve sdílené serverové složce {{ui:confirm.no}} smaže soubor ze serveru, a to pro všechny, kdo server používají.

Nevýhodou je ztráta projektů při vymazání úložiště prohlížeče nebo přechodu na jiný počítač. **Důležitou práci proto zálohujte do souboru.**

## Vaše návrhy, vaše záloha

Vaše návrhy jsou v tomto prohlížeči ve vašem počítači. Jako u všech dat platí: v bezpečí je jen to, co existuje podruhé na jiném místě. Vadný disk, nový počítač, smazaná data prohlížeče nebo chyba programu a bez zálohy je práce pryč. O tuto zálohu se staráte sami; žádný program to za vás neudělá. layerling to usnadňuje: {{ui:dashboard.backupAll}} na úvodní stránce jedním kliknutím uloží všechny návrhy do jednoho souboru (viz níže). Ten soubor uchovávejte na flash disku, ve složce v cloudu nebo na NAS, po každé větší práci.

layerling vám to připomene. Řádek nad návrhy tohoto prohlížeče je tím výraznější, čím déle je poslední {{ui:dashboard.backupAll}}: s tlačítkem {{ui:backups.backUpNow}}, jakmile je starší než dny nastavené v {{ui:backups.reminderDays}} (zpočátku 7) a návrhy se od té doby změnily, a červeně, když jsou víc než tři návrhy bez jakékoli zálohy nebo 30 dní žádná. Editor připomíná jednou denně ve stavovém řádku se stejným tlačítkem. Automatické zálohy níže se tu nepočítají: jsou na stejném počítači.

## Dřívější verze

layerling navíc sám vytváří dva druhy záloh:

- **Před přepsáním souboru.** Když [[Ctrl]]+[[S]] nebo {{ui:export.saveProject}} zapisuje do souboru `.lyl`, který už existuje (Chrome a Edge, viz níže), nejprve se ponechá soubor, jak byl. Soubor, který se od poslední zálohy nezměnil, se neponechává dvakrát.
- **Průběžné stavy při práci.** Při práci na návrhu se každých 10 minut ponechá jeho stav, ale jen když se něco změnilo; u každého návrhu zůstane posledních šest.

{{ui:backups.title}} je vypíše: v editoru v okně exportu pod **LYL** a ve vyhledávání příkazů, na úvodní stránce vedle {{ui:dashboard.restoreBackup}} pro všechny návrhy a v nabídce návrhu pro ten jeden. Každá ukazuje obrázek, čas, druh, název a velikost. {{ui:backups.open}} otevře verzi jako nový návrh: otevřený návrh zůstane, jak je, a nový není svázaný s původním souborem, takže jeho uložení ten soubor nikdy nepřepíše. Tlačítko stažení uloží verzi jako soubor `.lyl`, koš ji smaže.

V nastavení (ozubené kolo na pásu karet) stránka {{ui:backups.settingsTitle}} určuje, kolik dřívějších verzí souboru zůstane (žádná až 20, zpočátku 5), jak často se ponechá stav (nikdy, každých 10 nebo 30 minut) a odkdy připomínat. Tato nastavení patří tomuto prohlížeči, ne návrhu. Všechny zálohy dohromady zaberou nejvýš 500 MB; nad tím odpadají nejdřív nejstarší stavy.

**Složka záloh (Chrome a Edge).** V {{ui:backups.folder}} můžete zvolit složku ve svém počítači. Každá záloha pak jde také tam jako soubor `.lyl` s názvem návrhu a časem, například `Držák 2026-11-11 20-31-05.lyl`, stav s ` auto` před příponou. Staré tam odpadají jako v prohlížeči; ničeho jiného ve složce se to nedotkne. Po znovunačtení se prohlížeč při prvním uložení znovu zeptá na povolení; stav ponechaný předtím zůstane v prohlížeči a zpráva nabídne {{ui:backups.allowFolder}}. Složka synchronizovaná s cloudem nebo na jiném disku je také druhé místo.

Zálohy v prohlížeči zmizí s daty prohlížeče. Proto nenahrazují {{ui:dashboard.backupAll}}.

## Složky pro projekty

Při desítkách projektů jeden seznam nestačí. Na úvodní stránce vytvoří {{ui:shared.newFolder}} složku pro projekty tohoto prohlížeče; kliknutím na složku ji otevřete. Složky mohou obsahovat další složky.

- **Do složky:** přetáhněte projekt na složku nebo v nabídce projektu zvolte {{ui:shared.moveTo}}, kde jsou všechny složky. Nový projekt i soubor, který otevřete nebo importujete, se uloží do právě otevřené složky.
- **Zase ven:** první dlaždice ve složce, `..`, a řádek pod záložkami vedou zpět; i na ně lze projekt přetáhnout. Složka přetažená na jinou složku se do ní vloží.
- **Přejmenovat a smazat** najdete v nabídce složky. Smazáním složky se nesmaže žádný projekt: její obsah se posune o úroveň výš.
- **Vyhledávání** prochází všechny složky; nalezený projekt ukazuje svou složku a kliknutím na ni ji otevřete.

{{ui:dashboard.backupAll}} zachová složky: projekty jsou v záložním souboru ve svých složkách a obnovení je vrátí na místo. Složky tohoto prohlížeče jsou oddělené od složek na serveru. Náhledové obrázky karet jsou v souboru také, takže po obnovení jsou hned zpět.

## Zálohování a předávání

Každý projekt na úvodní stránce má nabídku přejmenování, duplikování a smazání. Řada tlačítek vedle záložek je na každé záložce stejná. Chcete-li smazat více projektů naráz, klikněte na {{ui:dashboard.select}}: kliknutí na kartu ji zvolí (zvolené ukazuje fajfka), {{ui:dashboard.selectAll}} zvolí všechny projekty v seznamu a {{ui:common.delete}} se zeptá jednou na všechny. {{ui:dashboard.selectDone}} nebo [[Esc]] výběr opustí. {{ui:dashboard.backupAll}} zabalí všechny projekty otevřené záložky do jediného souboru ZIP. {{ui:dashboard.restoreBackup}} hned vedle (je tam i na novém počítači bez projektů) je obnoví i v jiném prohlížeči nebo počítači; stejný soubor přijme i {{ui:dashboard.importGeometry}}. Součástí zálohy jsou také {{ui:myShapes.title}} ve složce `Custom shapes`, viz [Tvary](chapter:shapes). Pokud obnovíte zálohu v prohlížeči, který některé z těchto projektů už má, nepřidají se znovu; zpráva uvede, kolik jich tu už bylo. Projekt, který nejde přečíst, se vynechá a zpráva ho jmenuje. Pokud se stránka uprostřed zálohy znovu načte, obvykle proto, že velmi velký projekt zabral všechnu paměť, kterou prohlížeč dovolí, úvodní stránka potom uvede, u kterého projektu se zastavila: uložte ho samostatně jako soubor (viz níže) nebo zjednodušte jeho největší sítě a zálohujte znovu. Nad projekty tohoto prohlížeče krátký řádek říká, jak na tom jsou: oranžově, dokud nejsou v žádné záloze nebo když od posledního {{ui:dashboard.backupAll}} nějaké přibyly či se změnily (uvede, kdy to bylo a kolik jich je), a šedě, jakmile jsou v záloze všechny. Počítá se jen záloha všech projektů, ne záloha složky nebo vybraných projektů.

Jen některé návrhy: po {{ui:dashboard.select}} zabalí {{ui:dashboard.backupSelected}} jen vybrané návrhy v jejich složkách do jednoho souboru ZIP a {{ui:dashboard.backupSelected}} v nabídce složky zabalí tuto složku se všemi návrhy a složkami v ní. Vlastní tvary nejdou ani v jednom případě s sebou a {{ui:dashboard.restoreBackup}} vrátí obojí jako plnou zálohu. Platí to pro návrhy tohoto prohlížeče.

Kam se záloha uloží: v Chrome a Edge se dialog pro uložení zeptá na složku a název a složku si zapamatuje pro další zálohu. Zálohy tak jdou rovnou do vaší vlastní složky, třeba na cloudový disk. Totéž platí pro {{ui:myShapes.backup}}. Ostatní prohlížeče ukládají soubor do své složky stažených souborů; o kterou složku jde, se nastavuje v nastavení prohlížeče.

Pokud se projekt otevírá velmi pomalu nebo vůbec, obvykle proto, že jeho historie kroků Zpět příliš narostla, zvol v jeho nabídce na úvodní stránce {{ui:dashboard.openWithoutHistory}}. layerling pak načte jen aktuální stav, trvale smaže všechny předchozí kroky a projekt otevře; nejdřív se zeptá, protože to nejde vrátit. Chceš-li kroky zachovat, nejdřív projekt zálohuj pomocí {{ui:dashboard.backupSelected}}.

Jeden projekt uložíte v editoru přes {{ui:editor.export}}, formát **LYL** a {{ui:export.saveProject}}. LYL je vlastní formát Layerlingu a obsahuje tvary, sloučení, náčrty, CAD data, importované podklady i historii kroků zpět. V {{ui:export.historyTitle}} určíte počet přenášených posledních kroků. Výchozí odpovídá nastavení {{ui:workspace.history}}. Krajní volba {{ui:export.historyNone}} uloží jen současný stav, například pro sdílení bez historie. Export vytvoří kopii pod názvem {{ui:export.fileName}}; historie v prohlížeči zůstává zachovaná. Starší `.skf` lze stále otevřít, ale další uložení používá `.lyl`.

**Ukládání do vlastní složky v Chrome a Edge.** Tlačítko otevře systémový dialog pro výběr složky a názvu, včetně přepsání souboru. Následné [[Ctrl]]+[[S]] ukládá do stejného souboru bez dialogu. Také projekt otevřený z `.lyl` přes {{ui:dashboard.importGeometry}} nebo tlačítko otevření v exportním okně se ukládá zpět do původního souboru. Prohlížeč může požádat o povolení zápisu. Po obnovení stránky se vazba na soubor zapomene a další [[Ctrl]]+[[S]] se zeptá znovu; dialog začíná v naposledy použité složce. Firefox a Safari takový zápis nepovolují. Soubor stáhnou do Stažených souborů a [[Ctrl]]+[[S]] jej stáhne znovu. Firefox lze v Nastavení → Obecné → Stahování nastavit, aby se na složku vždy zeptal. Pokud tam souboru dáte jiný název, projekt si ponechá svůj, protože verze nebo datum v názvu souboru bývá míněno právě tak; zpráva po uložení pak nabídne {{ui:status.renameDraftToFile}}.

**Když okno pro uložení nic neuloží.** Zavře-li se okno bez souboru, hlášení nahoře to řekne a nabídne {{ui:status.saveAsDownload}}: návrh pak půjde do složky Stažené soubory jako ve Firefoxu. Prohlížeč hlásí okno zavřené tlačítkem Zrušit stejně jako okno, které nemohl použít, takže na počítači, kde okno pro uložení selže v každé složce, takto ukládáte dál.

Export STL, jehož okno nevrátí žádný soubor, dostane stejné hlášení i tlačítko. Chcete-li okno pro uložení vynechat úplně, zapněte v nastavení pod {{ui:workspace.appearance}} volbu {{ui:workspace.lylAsDownload}}: {{ui:export.saveProject}} a [[Ctrl]]+[[S]] pak návrh vždy uloží jako stažení a {{ui:workspace.stlAsDownload}} dělá totéž pro STL.

## Přílohy

Návod, seznam dílů, poznámky, fotka nebo katalogový list mohou zůstat u projektu jako soubory. {{ui:editor.attachments}} v liště {{ui:editor.group.file}}, sponka, otevře seznam; malá tečka na sponce ukazuje, že projekt nějaké má.

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
| **3MF** | slicer s barvami | Každé těleso zůstává samostatným dílem s názvem a barvou. Překrývající se tělesa se spojují pouze při stejné barvě. Je-li jinak barevný objekt vložen do druhého, například logo do destičky, dříve vytvořený uvolní místo pozdějšímu. Vhodné pro PrusaSlicer, Bambu Studio, OrcaSlicer a Cura. Bambu Studio a OrcaSlicer se zeptají na přiřazení barev filamentům; upozornění, že soubor nepochází od Bambu, neznamená závadu. OrcaSlicer a slicery na něm postavené ovšem nečtou barvu pro každou plochu. Soubor s tělesem o více barvách, například krabičkou Gridfinity s písmeny vlastní barvy nebo skupinou se zapnutou volbou {{ui:inspector.multicolor}}, má proto navíc každou plochu pomalovanou filamentem její barvy, jako by to udělalo malování ve sliceru: OrcaSlicer a PrusaSlicer 2.9 pak tisknou každou barvu jejím filamentem, PrusaSlicer až 15 barev, a Bambu Studio 2.9 převezme filamenty z malování, místo aby se ptalo. |
| **OBJ** | modelování a výměna dat | Rozšířený síťový formát. Barvy jsou přímo ve vrcholech souboru, bez samostatného `.mtl`. Bambu Studio a OrcaSlicer je čtou a nabídnou přiřazení filamentů, jiné programy mohou načíst jen tvar. Stejně jako u 3MF se spojují pouze překryvy stejné barvy. |
| **STEP** | plnohodnotný CAD | Zachovává přesnou geometrii kvádrů, válců, koulí, kuželů, tvarů z obrysu, hvězd, srdcí, elips, trubek, polokoulí, oblých střech, zaoblených kvádrů, rybin, otvorů i dalších tvarů. Podporuje ohnuté trubky, klíny, jehlany, paraboloidy, zakřivené kužely, závity, pružiny, ozubená kola, zkosení a zaoblení. První export v relaci jednorázově načte CAD jádro, přibližně 22 MB. |
| **SVG** | laser a plotr | Čistý pohled shora v milimetrech včetně otvorů a zakřivených obrysů. V poli {{ui:export.svg.view}} zapíše {{ui:export.svg.viewFootprint}} jen obrysy, kterými objekty stojí na pracovní rovině. {{ui:export.svg.viewEdges}} zapíše hrany viditelné shora jako čáry, každé těleso ve své barvě. |
| **DXF** | firma s laserovým řezáním | Stejný pohled shora ({{ui:export.svg.viewSilhouette}} nebo {{ui:export.svg.viewFootprint}}) jako jeden obrys z úseček, skutečných oblouků a kružnic - bez křivek, splajnů a oblouků složených z krátkých úseček - ve vrstvě 0 bílou barvou, DXF 2000 v milimetrech, nezrcadlený. Tělesa, která se dotýkají, tvoří jeden obrys, takže žádná čára se neřeže dvakrát. Firmy chtějí jeden díl na soubor: před exportem díl vyberte. Na laserové řezačce zatím nevyzkoušeno: zpětná vazba je vítána. |
| **PNG** | fórum, katalog výtisků, dotazy | Snímek aktuálního pohledu ve dvojnásobném rozlišení bez úchytů, výběru a kót. V okně nastavíte {{ui:export.png.plate}} a {{ui:export.png.transparent}}. Pohled nejprve natočte a přibližte. Výběr zde nehraje roli. |
| **LYL** | další práce v Layerlingu | Upravovatelný projekt se všemi jeho daty. |
| **2D** | dílna, soustruh, frézka, dokumentace | Výkres PDF nebo SVG v měřítku 1:1: nárys, půdorys a pravý bokorys na formátu ISO, viz níže. |

**Můstky pro díly, které by vypadly (DXF a SVG).** Když laser nebo plotr řeže desku s textem, vypadne vnitřek písmen jako o, a a b. Zaškrtněte {{ui:export.bridges}} v exportním okně DXF, nebo SVG s pohledem shora, a malé můstky takové díly udrží u materiálu kolem nich, jako u šablony: {{ui:export.bridgeWidth}} (0,5 až 3 mm) a {{ui:export.bridgeCount}} (1 až 4) se nastavují vedle. Můstek se nikdy nedotkne jiného obrysu ani jiného můstku a nikdy nenechá mezeru příliš úzkou na řez; díly, které by se držely jen navzájem, se také přivážou k desce. Pokud díl při zvolené šířce můstek nedostane, zpráva po exportu uvede kolik. Bez zaškrtnutí se nic nezmění.

**STL do vlastní složky (Chrome a Edge).** Tam první export STL projektu otevře dialog uložení vašeho systému, takže složku i název zvolíte sami a můžete nahradit existující soubor. Potom každý export STL projektu zapíše do téhož souboru bez dialogu; exportní okno ukazuje, do kterého, a **Uložit jako…** vedle tlačítka exportu zvolí jiný. Dialog si pamatuje vlastní složku, oddělenou od složky projektů, takže soubory pro slicer mohou zůstat u sliceru. Po znovunačtení stránky projekt svůj soubor STL zapomene a další export se zeptá znovu. Firefox a Safari soubor stáhnou jako dosud. Chcete-li každý STL jako obyčejné stažení, aby prohlížeč již použitý název očísloval (`name (1).stl`, `name (2).stl`) jako Tinkercad, zapněte v nastavení v {{ui:workspace.appearance}} {{ui:workspace.stlAsDownload}}.

**STL do vlastní složky v Chrome a Edge.** První export projektu otevře systémový dialog pro výběr souboru a případné přepsání. Další exporty stejného projektu zapisují do něj bez dialogu, dokud nezadáte jiný název souboru nebo nestisknete {{ui:export.stlSaveAs}}. Po změně názvu se znovu otevře výběr souboru. Okno uvádí název a volba **Uložit jako…** vedle exportu umožňuje vybrat jiný soubor. Složku pro STL si dialog pamatuje odděleně od projektů. Po obnovení stránky se vazba zapomene a příští export se zeptá znovu. Firefox a Safari používají běžné stažení.

Nesloučený výřez se při exportu odečte od všech těles, která protíná, tak jako v zobrazení. Před každým exportem tedy nemusíte slučovat. U exportu výběru se zohlední jen vybrané výřezy. Samotný výřez exportovat nelze a program na to upozorní.

STEP přenáší pouze přesná CAD tělesa. Importovaná síť se pro soubor převede na přesné těleso, jako to dělá {{ui:editor.tool.makeExact}} (viz „Převod importované sítě na přesné těleso“ níže), takže export může trvat až minutu; síť převážně volného tvaru, třeba figurku, vynechá, stejně jako vše ostatní bez přesné geometrie. Závěrečné hlášení uvede jejich názvy a důvody. Pro tisk použijte STL nebo 3MF, které zahrnou všechny díly.

### Výkres pro dílnu

Vyberte **2D**, jehož popis po najetí označuje výkres, a pod názvem souboru zvolte PDF nebo SVG. Kreslí se výběr, případně celý viditelný projekt. Nesloučené výřezy se také odečítají.

Nárys, půdorys a pravý bokorys používají promítání v prvním kvadrantu: pravý bokorys je vlevo od nárysu a půdorys pod ním. Výkres se vejde na nejmenší vhodný list ISO od A4 po A0, případně na větší vlastní formát. Měřítko je vždy 1:1. Každý pohled má celkovou šířku a výšku, neviditelné hrany jsou čárkované. Kruhové otvory rovnoběžné se směrem pohledu mají středový kříž a označení F1, T1 nebo R1. Tabulka dole uvádí průměry a polohy od levého dolního rohu příslušného pohledu. Popisové pole vpravo dole obsahuje název, měřítko, jednotky, datum a číslo listu. Popisky používají jazyk rozhraní.

Tiskněte na 100 % nebo ve skutečné velikosti, jinak rozměry nebudou odpovídat. Automaticky se nekótují závity, hloubky, tolerance ani šikmé otvory. Rozměry pocházejí z polygonové sítě modelu a jsou jmenovité. Nad 100 000 trojúhelníků nebo 200 otvorů program výkres odmítne s vysvětlením; vyberte méně objektů.

Promítání vychází z práce WC3D na výkresech projektu Cadverix-3D.

### Kolik filamentu bude potřeba?

U STL, 3MF, OBJ a STEP ukazuje {{ui:export.estimateTitle}} objem, hmotnost a délku filamentu o průměru 1,75 mm toho, co se exportuje. Počítá se jako soubor: jen viditelná tělesa, výřezy odečtené, překryvy jen jednou. Vpravo vyberete filament - PLA, PETG, ABS, ASA, TPU nebo PA (nylon) - a hmotnost odpovídá jeho hustotě. Objem je skutečný objem tělesa. Hmotnost a filament jsou hrubým odhadem pro tisk se stěnami a výplní: pod nadpisem nastavíte {{ui:export.estimateInfillLabel}} (zpočátku 15 %) a {{ui:export.estimateWallsLabel}} (2) a okno uvede, co započítalo a kolik by stejný díl vážil plný. Skutečné číslo určí nastavení vašeho sliceru, berte ho tedy jako vodítko: dobré k porovnání návrhů a k posouzení, zda cívka vystačí. Při 100% výplni se díl počítá jako plný, tedy horní mez. Okno svá čísla spočítá, až stisknete {{ui:export.estimateCalculate}}, takže se exportní okno otevře hned i u jemně obtaženého modelu.

## Import

Cizí soubory vložíte přes {{ui:editor.import}} nebo [[Ctrl]]+[[I]].

![Importní okno pro otevření či vložení projektu a přetažení geometrie.](shot:import-panel)

- **{{ui:import.openProject}}:** otevře `.lyl` nebo starší `.skf` jako nový projekt.
- **{{ui:import.insertProject}}:** přidá tělesa uloženého projektu do otevřeného. Hodí se pro opakovaně používané základy: jednou je vytvoříte a uložíte, později vkládáte. Když přetáhneš jeden nebo více souborů `.lyl` do oblasti níže, vloží se stejným způsobem. Jeho [poznámky](chapter:measuring-and-notes) přijdou s ním, sbalené a očíslované za těmi, které už projekt má, stejně jako jeho referenční body.
- **{{ui:import.insertFromServer}}:** Totéž pro projekt uložený na serveru (zobrazí se, když existuje úložiště na serveru). Vyberte složku a klikněte na projekt; jeho tělesa se přidají k otevřenému.
- **DXF:** DXF, jak obrys dílu posílá firma s laserovým řezáním nebo dodavatel, se načte jako díly k další práci: každý uzavřený obrys jako 4 mm vysoké těleso a každý otvor v něm jako samostatný otvor vedle něj (kruhový jako válec), takže otvor ve 3D editoru posunete a změníte jeho velikost jako kterýkoli jiný; pro posun celého dílu vyberte všechny. V milimetrech (soubor v palcích se převede, soubor bez jednotky se čte v milimetrech), oblouky a kružnice zůstanou skutečnými oblouky. Načítají se úsečky, oblouky, kružnice, elipsy, křivky, splajny a bloky; text, kóty a šrafy se vynechají, stejně jako obrysy, které se neuzavírají - zpráva uvede kolik. Tloušťku nastavíte ve vlastnostech.
- **Přidání geometrie:** přetáhněte STL, OBJ, 3MF, STEP, SVG, PNG nebo JPG do okna nebo soubor vyberte kliknutím. Importované sítě můžete otáčet, přesouvat, prořezávat a doplňovat. SVG, včetně trasovaných obrázků z picsvg.com nebo Inkscapu, se vloží jako těleso z náčrtu s původními úsečkami a křivkami, výškou 4 mm a orientací pro čtení shora. V nastavení {{ui:prop.sketchFill}} zvolíte plochu či rozšířenou čáru směrem ven, dovnitř nebo souměrně. {{ui:prop.sketchSilhouette}} odstraní vnitřní otvory, viz [Náčrty](chapter:sketches), část o výplni a siluetě. Body upravíte v náčrtu. Pouze SVG s více než 2500 úsečkami a křivkami se vloží jako pevná síť. Obrázek PNG nebo JPG se převede na obrys a vloží stejným způsobem jako těleso náčrtu široké 50 mm, jehož velikost můžete následně změnit. Obrys tvoří část mimo pozadí; za pozadí se považuje část převažující na okraji obrázku. Stejně se převede SVG obsahující pouze jeden rastrový obrázek. Obrys, který se protíná nebo dotýká sám sebe a nelze z něj vytvořit těleso, se vynechá; hlášení uvede počet takových tvarů. V kreslicím programu pak sjednoťte překryvy, uzavřete obrysy a soubor uložte znovu. Soubory z jedné stránky, například samostatně exportované vrstvy, zůstanou navzájem zarovnané, pokud před importem zapnete {{ui:import.keepSvgPage}}. Jinak se každý vycentruje samostatně. SVG nakreslené v několika barvách přijde také jako jedno těleso pro každou barvu, každé ve své barvě a na svém místě; s více než 12 barvami, jaké má obkreslený obrázek, zůstane jedním tělesem. Barevné OBJ a 3MF se importují po barvách na původní místa. OBJ může obsahovat barvy přímo nebo v doprovodném `.mtl`, který vyberte také; lze importovat i celý ZIP z Tinkercadu. 3MF uchovává barvy uvnitř. Projekty Bambu Studio, OrcaSliceru a PrusaSliceru přidělují dílům barvu jejich filamentu. Obsahuje-li 3MF více objektů, například objekt pro každou podložku, vloží se samostatně. Modifikátory, záporné objemy a blokátory podpěr sliceru se vynechají. Malování barev na jednotlivé plochy se nečte.
- **Z Tinkercadu:** Export STL nebo OBJ z Tinkercadu se načte jako geometrie jako každá jiná síť; OBJ zachová barvy. Skutečné tvary přenese bezplatný nástroj od komunity: [Export to layerling](https://taylormadearmy.github.io/tinkercad-layerling-importer/) od taylormadearmy, záložka, která v prohlížeči převede návrh z Tinkercadu na soubor `.lyl`, který tady otevřete přes {{ui:import.openProject}}. Není součástí layerlingu a sami jsme ho ještě nezkoušeli; autor ho vyzkoušel na Windows s Chromem.

Projekt z **novějšího Layerlingu** může obsahovat neznámé tvary, parametry nebo vlastní písma. Pokud jej kvůli tomu nelze otevřít, hlášení uvede obě verze. Otevře-li se, upozorní na možný odlišný vzhled novějších prvků. Pomáhá aktualizace: layerling.com po obnovení poskytuje aktuální verzi, nainstalovaná aplikace ji načte při dalším spuštění a vlastní server musíte aktualizovat sami.

Obrázkové podklady se přidávají v režimu náčrtu, viz [Náčrty](chapter:sketches).

## Zjednodušení importované sítě

Skenovaná či sochařsky vytvořená síť mívá zbytečně mnoho trojúhelníků, které se zpracovávají při přesunu, řezání i ukládání. {{ui:simplify.title}} v části Úpravy nebo nabídce pravého tlačítka zobrazí vedle sebe originál a zjednodušený náhled. Oba se současně otáčejí a přibližují stejnými tlačítky jako pracovní plocha. Zadejte zachované procento nebo počet trojúhelníků a potvrďte {{ui:simplify.apply}}. Výsledkem je obyčejná síť. U výsledku řezu či sloučení tím přijdete o původní části a {{ui:group.edit}}. Se zapnutým {{ui:simplify.keepEdges}}, jak je nastaveno na začátku, zůstanou ostré hrany a okraje otvorů přesně na místě, zatímco rovné plochy i tak přijdou o většinu trojúhelníků; vypnuté je zjednodušení smí zaoblit kvůli menšímu počtu.
Když se zjednodušení zastaví nad požadovaným počtem, okno to řekne i proč: se zapnutým {{ui:simplify.keepEdges}} těleso z rovných ploch a ostrých hran, třeba z kvádrů a klínů, často nemůže ztratit víc.

Řezání, slučování a průnik importovaných sítí se počítají v prohlížeči. Nastavení {{ui:workspace.booleanTriangleLimit}} omezuje povolený počet trojúhelníků. Nad limitem se operace neprovede a hlášení uvede velikost sítě. Nejprve ji zjednodušte nebo limit přiměřeně výkonu počítače zvyšte.

## Převod importované sítě na přesné těleso

Soubor STL, OBJ nebo 3MF obsahuje jen trojúhelníky, i když byl díl nakreslen v CAD s rovnými plochami a kulatými otvory. {{ui:editor.tool.makeExact}} v části {{ui:editor.section.surface}} (nebo v nabídce pravého tlačítka na tělese) v těchto trojúhelnících najde roviny, válce, kužele, koule a toroidy, ze kterých vznikly, a postaví z nich těleso znovu jako přesné CAD těleso: z otvoru se stane jeden skutečný válec s kulatým okrajem místo stovky úzkých pruhů. Potom {{ui:editor.tool.fillet}} a {{ui:editor.tool.chamfer}} sledují jednu čistou hranu, {{ui:editor.tool.deleteFace}} odebere celé zaoblení nebo stěnu otvoru a export STEP ponese skutečné plochy. Stavový řádek řekne, co se našlo, například „rovin: 9, válců: 4“.

Co nesedí na žádnou z těchto ploch, zůstane jako malé rovinné plošky a hlášení řekne, jakou část povrchu tvoří. Těleso převážně volného tvaru, jako figurka nebo modelovaný tvar, zůstane sítí, stejně jako síť s dírami nebo protínajícími se stěnami, která se nemůže uzavřít v těleso. Přijme se až 400 000 trojúhelníků a velká síť může trvat několik minut. Větší síť pod tuto hranici dostanete pomocí {{ui:simplify.title}} se zapnutým {{ui:simplify.keepEdges}}; jinak použijte síť tak, jak přišla, vyjde nejčistěji. Jeden krok zpět vrátí síť.

U malé sítě s kulatými plochami, do 4 000 trojúhelníků, to nástroje hran udělají samy: zaoblení hrany takového STL ho nejdřív stejným způsobem přestaví.

## Hlášení chyby

Při nečekaném chování použijte {{ui:editor.bugReport}} v zápatí vedle odkazu na fórum. Vznikne ZIP, protože GitHub a některá fóra nepřijímají samotný `.lyl`. Obsahuje projekt a krátký text s verzí, prohlížečem, rozlišením a posledními hlášeními a chybami. Úvodní stránka ZIP otevře jako zálohu nebo jej rozbalte a otevřete `.lyl`. Diagnostika neobsahuje osobní údaje. Přiložením k hlášení na fóru či GitHubu umožníte problém zopakovat na stejném modelu.

Při chybě, která aplikaci zastaví, se místo prázdné stránky objeví chybové okno. Nabízí stažení posledního stavu projektu uloženého v prohlížeči do `.lyl`, návrat na přehled nebo nový projekt. Hlášení a uložený soubor pomáhají při hledání příčiny.

## Sdílené projekty na serveru

Vlastní instalace může nabídnout společnou složku pro všechny uživatele. Úvodní stránka pak ukazuje projekty na dvou záložkách, {{ui:shared.trailRoot}} pro společnou složku a jedné pro tento prohlížeč, každou s počtem projektů; záložka s více projekty je první a otevřená. Lze vytvářet podsložky, přesouvat projekty přetažením a prohledávat celou složku. Projekt se průběžně ukládá zpět na server. Místní projekt přesunete přetažením jeho karty na záložku {{ui:shared.trailRoot}} nebo přes {{ui:dashboard.sendToServer}}. Stejně se na server dostane i složka z tohoto prohlížeče, se vším obsahem, a projekty, které jdou na server, si tam ponechají své složky, i při {{ui:dashboard.sendAllToServer}}. Zpět to jde přes {{ui:dashboard.takeIntoBrowser}} v nabídce návrhu na serveru, nebo přetažením jeho karty na kartu tohoto prohlížeče: návrh pak zůstane jen v tomto prohlížeči a zmizí ze složky serveru, i pro ostatní. Když je otevřená záložka {{ui:shared.trailRoot}}, {{ui:dashboard.createDesign}} a {{ui:dashboard.restoreBackup}} ukládají projekt do otevřené složky na serveru a {{ui:dashboard.backupAll}} zabalí všechny projekty serveru i s jejich složkami a vlastními tvary do jednoho souboru ZIP. Název projektu odpovídá názvu souboru, takže přejmenování karty či názvu v editoru přejmenuje i serverový soubor. Smazání projektu nebo složky je trvalé a odstraní i pracovní kopii v prohlížeči. Serverové vlastní tvary jsou ve složce `Custom shapes`, viz [Tvary](chapter:shapes).

{{ui:dashboard.sendAllToServer}} přesune všechny místní projekty najednou. Zapnutí {{ui:dashboard.newOnServer}} vytváří nové projekty rovnou na serveru a ukládá je tam od první změny. Volbu si pamatuje tento prohlížeč. Projekt, který nelze přesunout, například kvůli shodnému názvu, zůstane v prohlížeči a hlášení uvede počet neúspěchů.

Ostatní exportní formáty (STL, 3MF, OBJ, STEP, SVG, PNG a výkres) mohou jít do stejné složky: v exportním okně {{ui:export.saveToShared}} zapíše soubor vedle vašeho projektu, nebo do složky, kterou máte otevřenou na úvodní stránce, u projektu, který na serveru není. Program, který složku sdílí, třeba slicer v Dockeru, ho tam může otevřít. Soubor se v seznamu projektů neobjeví. Je-li tam už soubor stejného názvu, zpráva to řekne a nové stisknutí tlačítka ho nahradí.

Nejde o současnou editaci: každý pracuje s vlastní kopií souboru. Změnil-li jej mezitím někdo jiný, Layerling odmítne přepsání.

Na layerling.com je tato funkce vypnutá. Nastavení vlastního serveru popisuje [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.md).
