---
title: Časté otázky
summary: Krátké odpovědi na nejčastější otázky o ukládání, velkých modelech, zaobleních, AI a tisku, vždy s cestou k podrobnému vysvětlení.
contents: questions
---

Každá odpověď je krátká a na konci uvádí místo v této příručce, kde je vše vysvětleno podrobně. Vyhledávací pole nahoře najde otázku podle kteréhokoli slova v ní.

## Ukládání a zálohy

### Kde jsou moje návrhy uložené a existuje cloud?

V prohlížeči na vašem vlastním počítači. Neexistuje účet ani cloud, nic se nikam nenahrává a každá změna se ukládá sama. Kdo provozuje layerling na vlastním serveru, může návrhy ukládat také tam do sdílené složky.

Více: [Kde jsou projekty uložené](chapter:files-and-saving#kde-jsou-projekty-ulozene)

### Moje návrhy zmizely. Co se stalo?

Návrhy jsou uložené v jednom prohlížeči na jednom počítači. Zmizí, když se smažou data prohlížeče pro tuto stránku, a v jiném prohlížeči ani na jiném počítači se neobjeví. Safari na Macu, iPhonu a iPadu maže data stránky po sedmi dnech bez návštěvy, pokud layerling není nainstalovaný jako aplikace. Máte-li zálohu, {{ui:dashboard.restoreBackup}} na úvodní stránce vrátí návrhy zpět i se složkami a obrázky.

Více: [Vaše návrhy, vaše záloha](chapter:files-and-saving#vase-navrhy-vase-zaloha)

### Jak zálohuji všechno, i automaticky do složky?

{{ui:dashboard.backupAll}} na úvodní stránce zabalí všechny návrhy do jednoho souboru ZIP. Kromě toho layerling sám uchovává dřívější verze každého návrhu a v Chrome a Edge dokáže každou z nich zapsat jako soubor .lyl do složky, kterou si zvolíte. Verze uložené v prohlížeči zmizí spolu s daty prohlížeče, takže nenahrazují ZIP ani složku.

Více: [Dřívější verze](chapter:files-and-saving#drivejsi-verze)

### Jak přenesu návrh na jiný počítač nebo do jiného prohlížeče?

V exportním okně ho uložte jako soubor .lyl a tento soubor otevřete na druhém počítači z úvodní stránky. Pro všechny návrhy najednou použijte zde {{ui:dashboard.backupAll}} a tam {{ui:dashboard.restoreBackup}}; návrhy, které už tam jsou, se nepřidají podruhé.

Více: [Zálohování a předávání](chapter:files-and-saving#zalohovani-a-predavani)

### Co se stane, když smažu data prohlížeče?

Smažou se návrhy uložené v tomto prohlížeči a také dřívější verze, které tam layerling uchovával. Souboru ZIP z {{ui:dashboard.backupAll}}, vašich souborů .lyl ani složky se zálohami na disku se to nedotkne. Nejdřív zálohujte, potom mažte.

Více: [Vaše návrhy, vaše záloha](chapter:files-and-saving#vase-navrhy-vase-zaloha)

### Jak se vrátím k dřívějšímu stavu?

Funkce Zpět se vrací krok za krokem. Prohlížení historie ukazuje pomocí posuvníku každý krok, aniž by návrh měnilo, a z kteréhokoli z nich umí vytvořit nový návrh. Pro stav z dnešního rána nebo z minulého týdne slouží seznam dřívějších verzí: otevře starou verzi jako nový návrh a ten současný nechá tak, jak je.

Více: [Prohlížení historie](chapter:select-and-arrange#prohlizeni-historie) a [Dřívější verze](chapter:files-and-saving#drivejsi-verze)

### Mohou STL a 3MF jít přímo do složky mého projektu? A jak dostanu zase obyčejné stažení?

V Chrome a Edge se první export návrhu zeptá, kam uložit, a další exporty zapisují bez ptaní do stejného souboru. Firefox a Safari vždy stahují. Chcete-li pokaždé stažení, zapněte v nastavení {{ui:workspace.stlAsDownload}}.

Více: [Export](chapter:files-and-saving#export)

### Dialog pro uložení se zavřel a žádný soubor nevznikl. Proč?

Dialog, který prohlížeč nemohl použít, hlásí stejně jako dialog, který jste zrušili. Zapsat nelze ani soubor, který zablokuje antivirus. Hlášení nahoře pak nabídne {{ui:status.saveAsDownload}}, čímž se soubor uloží mezi stažené soubory. Chcete-li dialog vynechat úplně, zapněte v nastavení {{ui:workspace.lylAsDownload}} a {{ui:workspace.stlAsDownload}}.

Více: [Zálohování a předávání](chapter:files-and-saving#zalohovani-a-predavani)

## Instalace a aktualizace

### Existuje aplikace ke stažení?

layerling se instaluje z prohlížeče: potom má vlastní ikonu a vlastní okno a spustí se i bez sítě. Žádný instalační program ke stažení neexistuje a originál najdete jen na layerling.com. **Nestahujte ani nespouštějte instalační program „layerling“ z žádného jiného webu:** nepochází od layerlingu a může obsahovat škodlivý software. Pro provoz vlastní kopie je k dispozici rychlé spuštění pro Windows a obraz Docker.

Více: [Instalace jako aplikace](chapter:offline-and-install#instalace-jako-aplikace) a [Vlastní provoz](chapter:offline-and-install#vlastni-provoz)

### Funguje layerling bez internetu?

Ano, po první návštěvě se spustí i bez sítě, nejlépe nainstalovaný jako aplikace. Jedna věc se načte, až když je poprvé potřeba: jádro CAD pro první export STEP, asi 22 MB.

Více: [Instalace jako aplikace](chapter:offline-and-install#instalace-jako-aplikace)

### Jak získám aktualizaci?

Sama. Otevřená stránka si všimne nové verze a ukáže kartu s novinkami; {{ui:newVersion.reload}} nejprve uloží otevřený návrh a potom načte novou verzi. Novější verzi ukáže i úvodní stránka.

Více: [Aktualizace](chapter:offline-and-install#aktualizace)

### Které prohlížeče a tablety fungují?

Chrome, Edge, Firefox a Safari, na počítači, tabletu nebo telefonu; 3D zobrazení potřebuje WebGL. Několik věcí umějí jen Chrome a Edge: zapisovat do vašich souborů a složek, složku pro zálohy a otevírání souborů .lyl dvojklikem. Na tabletu dělá prst to, co levé tlačítko myši.

Více: [Prsty a stylus](chapter:tablet-and-touch#prsty-a-stylus)

## AI

### Jak AI nastavím nejsnáze?

Dejte AI, která umí pracovat na vašem počítači, adresu `https://github.com/henmedia/layerling` a požádejte ji, aby vám nastavila layerling s jeho MCP serverem. Potřebuje k tomu program, například záložku Code v aplikaci Claude, Claude Code, Codex, Antigravity, Gemini CLI nebo Grok Build. Pro Windows a Mac najdete v příručce také jednotlivé kroky.

Více: [Krok za krokem pro začátečníky](chapter:ai-with-mcp#krok-za-krokem-pro-zacatecniky)

### Proč se AI nedostane na layerling.com?

Most mezi AI a editorem existuje jen v kopii layerlingu, která běží na vašem vlastním počítači. Na layerling.com je vždy vypnutý a chat v prohlížeči nic nainstalovat nemůže. AI tedy potřebuje lokálně spuštěný layerling a program, který umí MCP.

Více: [Nastavení](chapter:ai-with-mcp#nastaveni)

### Je nainstalovaná aplikace lokální kopie?

Ne, pokud jste ji nainstalovali z layerling.com: pořád je to layerling.com ve vlastním okně, i když se spustí i bez internetu. U lokální kopie běží na vašem počítači malý server a přes něj AI komunikuje s editorem pomocí MCP; webová aplikace takový server nemá. Po rychlém startu běží vaše vlastní kopie na `http://127.0.0.1:3000/`.

Více: [Nastavení](chapter:ai-with-mcp#nastaveni)

### Která AI funguje a kolik to stojí?

Jakýkoli program, který umí MCP; příručka popisuje Claude, Codex, Gemini, Antigravity a Grok Build. Chat na webu nebo v mobilní aplikaci se k layerlingu nedostane, protože na vašem počítači nemůže nic spustit. Samotný layerling nic nestojí. Cenu AI určuje její poskytovatel: například záložka Code v aplikaci Claude je součástí placených tarifů Claude.

Více: [Nastavení](chapter:ai-with-mcp#nastaveni)

### Jaká data jdou k poskytovateli AI?

To, co AI čte: objekty otevřeného návrhu a snímky zobrazení, které pořídí. Jdou k poskytovateli vašeho AI programu stejně jako cokoli jiného, co tam napíšete. Samotný most běží na vašem počítači a bez AI z něj nic neodchází.

Více: [Co AI dokáže](chapter:ai-with-mcp#co-ai-dokaze)

## Paměť, rychlost a historie

### Proč se layerling s mým STL zpomaluje?

STL je síť z trojúhelníků a velmi velká síť editor zpomaluje, zabírá hodně paměti a zpomaluje ukládání. layerling to po importu oznámí od 400 000 trojúhelníků v jedné síti nebo od milionu v celém návrhu. Nejprve síť zjednodušte, importujte jen díly, které potřebujete, nebo díl postavte z vlastních tvarů layerlingu.

Více: [Velké sítě](chapter:files-and-saving#velke-site)

### Proč v mé historii chybí kroky?

Zkracují ji dvě věci. Nastavení {{ui:workspace.savedHistory}} uchovává 100 kroků na návrh, pokud ho nezměníte, a starší se zahazují. A když je návrh příliš velký na to, aby se uložil s celou historií, layerling ho uloží s polovinou kroků, potom znovu s polovinou, a řekne vám to. Samotný návrh se vždy uloží celý.

Více: [Uložená historie](chapter:view-and-workplane#ulozena-historie)

### Co dělat, když je úložiště prohlížeče plné?

Nezavírejte kartu ani ji nenačítejte znovu: vaše nejnovější změny jsou jen v ní. Nejprve si uschovejte kopii exportem do .lyl. Potom uvolněte místo: smažte kroky v prohlížení historie, odstraňte návrhy, které už nepotřebujete, nebo je zálohujte a smažte.

Více: [Vaše návrhy, vaše záloha](chapter:files-and-saving#vase-navrhy-vase-zaloha)

### Můj návrh je příliš velký na uložení. Co teď?

Jeho historie a sítě dohromady zabírají příliš mnoho místa. Než to layerling oznámí, už to zkusil s menším počtem kroků historie. Smažte historii v prohlížení historie, zjednodušte největší importované sítě nebo uložte .lyl jen s aktuálním stavem.

Více: [Zálohování a předávání](chapter:files-and-saving#zalohovani-a-predavani) a [Zjednodušení importované sítě](chapter:files-and-saving#zjednoduseni-importovane-site)

### Prohlížeči došla paměť. Co pomůže?

To se stává u sítí s miliony trojúhelníků, kdy jeden krok potřebuje víc paměti, než karta prohlížeče dostane. Snižte počet trojúhelníků importovaných sítí pomocí {{ui:editor.tool.simplify}}, zavřete ostatní karty a zkuste to znovu. Stane-li se to při ukládání, pomůže také kratší historie.

Více: [Velké sítě](chapter:files-and-saving#velke-site)

### Návrh se otevírá velmi pomalu nebo vůbec. Co mohu dělat?

Většinou velmi narostla jeho historie kroků zpět. {{ui:dashboard.openWithoutHistory}} v nabídce návrhu na úvodní stránce načte jen aktuální stav; dřívější kroky přitom natrvalo smaže, takže pokud si je chcete ponechat, návrh nejdřív zálohujte. Dřívější verze ze záloh se otevře jako nový návrh.

Více: [Zálohování a předávání](chapter:files-and-saving#zalohovani-a-predavani)

### layerling se seká. Která nastavení pomohou?

{{ui:workspace.fastMode}} v nastavení vypne stíny, linie hran na všech tělesech a setrvačnost kamery a kreslí zobrazení jen v rozlišení obrazovky. Zkontrolujte, zda prohlížeč používá grafickou kartu: na stránce `chrome://gpu` nebo `edge://gpu` má být u WebGL „Hardware accelerated“. Druhou častou příčinou jsou velké importované sítě.

Více: [Když je Layerling pomalý](chapter:view-and-workplane#kdyz-je-layerling-pomaly)

### Editor stojí nebo dlouho počítá. Čekat, nebo načíst znovu?

Nejdřív počkejte. Řezy, sloučení a práce s hranami se počítají na pozadí a po tu dobu se zobrazuje {{ui:status.computing}}; dlouhé úlohy, například vydlabání, se samy ukončí s hlášením a nic nezmění. Pokud se muselo restartovat jádro CAD, hlášení to uvede a stránku není třeba načítat znovu. Opětovné načtení je bezpečné, protože každá změna se ukládá sama, s jednou výjimkou: dokud je zobrazené červené upozornění {{ui:notice.designNotSavedTitle}}, nejdřív exportujte .lyl.

Více: [Když je Layerling pomalý](chapter:view-and-workplane#kdyz-je-layerling-pomaly)

### 3D zobrazení zůstává prázdné, nebo hlášení říká, že se nepodařilo spustit. Co teď?

Prohlížeč nedokázal spustit WebGL, které vykresluje 3D zobrazení. Příčina je v prohlížeči nebo ovladači grafické karty, ne ve vašem návrhu, a vaše uložené návrhy se nesmažou. Zavřete ostatní karty s 3D obsahem a restartujte prohlížeč, zapněte hardwarovou akceleraci, povolte WebGL, pokud ho blokuje nastavení soukromí nebo rozšíření, a aktualizujte prohlížeč i ovladač grafické karty. Rychlou zkouškou je jiný prohlížeč.

Více: [Když je Layerling pomalý](chapter:view-and-workplane#kdyz-je-layerling-pomaly)

## Importované modely

### „Zjednodušit polygonovou síť“, nebo „Udělat přesným“: co zvolit?

{{ui:editor.tool.simplify}} ponechá jen část trojúhelníků, takže se těžký model odlehčí; zůstane sítí. {{ui:editor.tool.makeExact}} znovu postaví model složený z rovin, válců, kuželů a koulí jako skutečné těleso CAD, takže zaoblení a zkosení sledují čisté hrany a export STEP obsahuje skutečné plochy. Přijme až 400 000 trojúhelníků; figurka nebo sken zůstane sítí. U velkého technického dílu: nejprve zjednodušte se zapnutým {{ui:simplify.keepEdges}}, potom ho udělejte přesným.

Více: [Zjednodušení importované sítě](chapter:files-and-saving#zjednoduseni-importovane-site) a [Převod importované sítě na přesné těleso](chapter:files-and-saving#prevod-importovane-site-na-presne-teleso)

### Proč se řez nezdaří, nebo proč moje síť „není uzavřená“?

Těleso lze řezat jen tehdy, když je jeho povrch uzavřený. Má-li importovaná síť mezery, layerling uvede název dílu a počet otevřených hran a díl vynechá. Malé díry uzavře sám; větší je třeba opravit v programu, ze kterého model pochází, nebo v nástroji na opravu sítí. Kontrola tisku ukáže, které těleso je otevřené.

Více: [Kontrola tisku](chapter:printing#kontrola-tisku)

### Jak správně importuji SVG?

SVG se vloží jako těleso z náčrtu o výšce 4 mm a jeho body lze upravovat v režimu náčrtu. Před importem zadejte v importním okně šířku v milimetrech; bez čísla si ponechá vlastní velikost. Obrysy, které kříží samy sebe, se nemohou stát tělesem, proto se vynechají a spočítají: v kreslicím programu spojte překrývající se části, uzavřete obrysy a importujte znovu.

Více: [Import](chapter:files-and-saving#import)

## Zaoblení a zkosení

### Proč nelze použít zaoblení?

Většinou je pro dané místo příliš velké: zasáhlo by do sousedních ploch, nebo se hrana ohýbá těsněji, než je poloměr. Často stačí o jeden nebo dva milimetry méně a v ostrých úhlech potřebuje zaoblení víc místa, než by poloměr napovídal. Pokud hrany nelze zaoblit společně, vezměte jich najednou méně; hrana, která překáží, se vykreslí červeně. {{ui:edge.findLargest}} najde velikost za vás.

Více: [Zkosení a zaoblení hran](chapter:edges-and-hollowing#zkoseni-a-zaobleni-hran)

### Proč po změně náčrtu zmizela moje zaoblení?

Po {{ui:inspector.editSketch}} se těleso postaví znovu a má nové hrany. layerling znovu použije zaoblení a zkosení na hrany, které leží tam, kde ležely ty staré, pokud má těleso stejný počet hran jako předtím. Je-li v něm o roh víc nebo méně, vynechají se a hlášení uvede, kolik jich je. Funkce Zpět všechno vrátí.

Více: [Vytvoření tělesa](chapter:sketches#vytvoreni-telesa)

### Proč nemohu vybrat některé hrany importovaného modelu?

STL, OBJ a 3MF přinášejí jen trojúhelníky a nástroje pro hrany pracují se sítěmi do 4 000 trojúhelníků. {{ui:editor.tool.makeExact}} udělá z technického dílu skutečné těleso CAD, na kterém má otvor jeden kulatý okraj, který může zaoblení sledovat. Soubor STEP přináší přesnou geometrii od začátku.

Více: [Převod importované sítě na přesné těleso](chapter:files-and-saving#prevod-importovane-site-na-presne-teleso)

## Sloučení, otvory a rozměry

### Proč se z otvorů stanou ovály, když natáhnu sloučení?

Sloučení, jehož velikost měníte, natáhne všechno uvnitř, jako by bylo nakreslené na gumě. V nastavení sloučení zvolte u položky {{ui:inspector.groupResize}} možnost {{ui:inspector.groupResizeKeepParts}}: díly, které sahají přes celé sloučení, se natáhnou, a otvory a malé díly si ponechají velikost i vzdálenost od bližší strany.

Více: [Změna velikosti sloučení: výřezy a malé díly zůstanou](chapter:solids-and-holes#zmena-velikosti-slouceni-vyrezy-a-male-dily-zustanou)

### Proč se sloučení nezdaří, nebo proč má výsledek mezery?

Buď některý díl není uzavřený, a hlášení ho jmenuje, nebo se dva díly téměř setkávají, ale ve skutečnosti se nedotýkají. Sloučení zrušte, díly přesně zarovnejte nebo trochu změňte některý rozměr či polohu a slučte znovu. Velmi husté sítě nad limitem pro řezání importovaných sítí se nespojí vůbec.

Více: [Sloučení](chapter:solids-and-holes#slouceni)

### Jak změním jeden díl uvnitř sloučení?

Vyberte sloučení a stiskněte [[E]], nebo na něj dvakrát klikněte. Díly pak leží samostatně a lze je upravovat; po dokončení se sloučení postaví znovu. Zaoblení a zkosení použitá na celé sloučení se při novém sestavení ztratí.

Více: [Úprava sloučení](chapter:solids-and-holes#uprava-slouceni)

### Jak získám zpět jeden díl z dřívějšího stavu?

Otevřete prohlížení historie, posuňte posuvník na stav, který díl ještě obsahoval, klikněte na díl a zvolte {{ui:historyView.bringBack}}. Do aktuálního návrhu se vloží kopie taková, jaká byla, a tam, kde byla, s časem v názvu.

Více: [Prohlížení historie](chapter:select-and-arrange#prohlizeni-historie)

## Tisk a export

### STL, 3MF, OBJ, nebo STEP: co zvolit?

Pro tiskárnu 3MF nebo STL. 3MF zachová každé těleso jako díl s názvem a barvou; STL je jedna síť v jedné barvě. Barvy přenáší také OBJ. STEP je pro jiné programy CAD: obsahuje přesnou geometrii se zaobleními a zkoseními.

Více: [Export](chapter:files-and-saving#export)

### Jak dostanu své barvy do sliceru?

Exportujte 3MF. Každé těleso si ponechá barvu a těleso pomalované více barvami nese malbu na svých plochách. Bambu Studio a OrcaSlicer se při otevření zeptají, jak barvy přiřadit k vašim filamentům.

Více: [Malování více barvami](chapter:shapes#malovani-vice-barvami)

### Moje díly do sebe nepasují. Jak velkou vůli potřebují?

Obvykle 0,2 až 0,4 mm, podle tiskárny. Změří ji test vůle: vytiskněte malou destičku se sedmi otvory, najděte nejtěsnější otvor, ve kterém se kolík ještě otáčí, a tuto hodnotu zadejte jako vůli své tiskárny. Nová víčka, rybinové spoje a závity z ní pak vycházejí.

Více: [Vůle vaší tiskárny: test vůle](chapter:printing#vule-vasi-tiskarny-test-vule)

### Proč layerling hlásí, že se díl nevejde do tiskárny?

Díl přesahuje okraj podložky nebo je vyšší, než dokáže zvolená tiskárna vytisknout. Je to jen upozornění a lze ho zavřít. Vyberte v nastavení svou tiskárnu, nebo příliš velký díl rozřízněte pomocí {{ui:editor.tool.split}}.

Více: [Když se díl nevejde](chapter:printing#kdyz-se-dil-nevejde)

## O programu layerling

### Je layerling zdarma a smím prodávat to, co v něm navrhnu?

layerling je svobodný software pod licencí AGPL-3.0, bez účtu. Licence se týká programu: kdo layerling upraví a nabízí ho ostatním přes síť, musí nabídnout i zdrojový kód. Pro modely, které vytvoříte, nestanoví žádné podmínky. Písma a modely, které importujete, si ponechávají vlastní licence.

Chcete-li projekt podpořit, [malý příspěvek](support:) pomůže s náklady na server a vývoj. Je dobrovolný a nic v layerlingu na něm nezávisí.

Více: [Vlastní provoz](chapter:offline-and-install#vlastni-provoz)

### Jak nahlásím chybu nebo o něco požádám?

{{ui:editor.bugReport}} v zápatí uloží ZIP s návrhem a krátkým textem o verzi a prohlížeči; nic osobního v něm není. Přiložte ho na fóru nebo v diskusích na GitHubu. Dotazy i přání jsou vítány na obou místech.

Více: [Hlášení chyby](chapter:files-and-saving#hlaseni-chyby) a [Pomoc a zpětná vazba](chapter:offline-and-install#pomoc-a-zpetna-vazba)
