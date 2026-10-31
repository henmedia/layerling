---
title: Výběr a uspořádání
summary: Výběr objektů, seznam objektů, zarovnání, zrcadlení, otáčení, položení na plochu a pravidelné opakování.
---

## Výběr

Kliknutí vybere tvar, [[Shift]] přidává nebo odebírá další. Dokud držíte [[Shift]] a jsou vybrány dva nebo více tvarů, počítá je malé číslo pod ukazatelem myši. Kliknutí na prázdné místo a [[Esc]] výběr zruší. Tažením rámečku na prázdné pracovní ploše vyberete všechny dotčené tvary. Se [[Shift]] se dosud nevybrané přidají a vybrané odeberou. [[Ctrl]]+[[A]] vybere všechna viditelná tělesa. Když táhneš těleso nebo úchyt rámečku, [[Esc]] akci zruší, dokud je tlačítko myši ještě stisknuté: vše se vrátí do původního stavu a do historie se nic nepřidá.

Překážející objekt skryjte pomocí {{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]. V projektu zůstane, ale nebude viditelný ani zahrnutý v exportu. Exportní okno předem uvede počet skrytých dílů. [[Ctrl]]+[[Shift]]+[[H]] všechny zobrazí. Proti nechtěným změnám chrání zámek nahoře v nastavení nebo [[Ctrl]]+[[L]]. Zamčený tvar nelze přesouvat, měnit jeho rozměry, otáčet, přebarvovat ani mazat. Úchyty zešednou, u horní šipky se objeví zámek a editační nástroje se vypnou. Rozměry lze stále zjistit najetím na úchyt. Klávesa pro změnu ohlásí zamčený objekt. Obsahuje-li výběr zamčený tvar, nemění se ani ostatní části. Skrytí, přejmenování, kopírování a duplikování zůstávají dostupné.

Číslo na tlačítku skupiny {{ui:editor.group.visibility}} říká, kolik tvarů je skrytých, a kliknutím na něj se všechny znovu zobrazí. Projekt otevřený se skrytými tvary to jednou oznámí zprávou s tlačítkem pro jejich zobrazení.

## Seznam objektů

U složitého modelu pomůže seznam všech tvarů: {{ui:editor.tool.showOutliner}} nebo [[Ctrl]]+[[Shift]]+[[O]]. V tomto prohlížeči si pamatuje, zda jste jej nechali otevřený nebo zavřený, a toto nastavení platí pro všechny projekty.

![Seznam objektů: sloučený celek se dvěma částmi a vedle něj koule. Ikona složky otevře úpravu celku.](shot:object-list)

- Kliknutí vybere tvar, i uvnitř sloučení. [[Shift]] přidává a odebírá položky jako v pohledu. Šipky rozbalují a sbalují vnořené části.
- Popisek rozlišuje {{ui:outliner.solid}} a {{ui:outliner.hole}}.
- Zámek a oko ovládají zamknutí a skrytí jednotlivých částí.
- {{ui:outliner.rename}} přiřadí vlastní název. Stejně funguje tužka nahoře v nastavení vybraného tvaru. Smysluplné názvy usnadňují práci ve velkém projektu.
- Tlačítko A–Z v záhlaví ({{ui:outliner.sortByName}}) seřadí pojmenované tvary abecedně, čísla počítá jako čísla (Díl 2 před Dílem 10). Tvary s výchozím názvem zůstanou pod nimi v pořadí přidání, nejnovější na konci, a díly ve skupinách se řadí stejně. Mění se jen seznam, nikdy projekt. Druhé kliknutí ukáže vše znovu v pořadí přidání a prohlížeč si volbu zapamatuje.
- Vyhledávání používá názvy i typy, například válec nebo výřez, a prochází libovolně vnořená sloučení. Nadřazené celky zůstanou v seznamu a rozbalí cestu k nalezeným částem. Celek nalezený vlastním názvem po rozbalení ukazuje všechny části.
- Šipka vlevo v záhlaví sbalí seznam na záhlaví a znovu jej rozbalí.

Seznam je ukotvený vpravo od orientační krychle. Přetáhněte jej za záhlaví kamkoliv na plochu; může se zasunout pod krychli a lištu pohledu. Vrácení vedle krychle nebo dvojklik jej znovu ukotví. Poloha i sbalení se pamatují v tomto prohlížeči.

## Zadání polohy

Karta {{ui:inspector.position}} umožňuje číst i zadat polohu. {{ui:prop.positionX}} a {{ui:prop.positionY}} označují střed ohraničení tělesa na podložce se stejnými znaménky jako kóty v pohledu. {{ui:prop.positionZ}} je výška spodní strany. X míří doprava, Y dozadu a Z vzhůru, podle pravotočivé soustavy CAD programů a šipek na podložce. Používají se nastavené jednotky. Rozsah posuvníků odpovídá tažení myší.

## Odložení dílů vedle podložky

Tvar lze odtáhnout za okraj, přibližně o jednu šířku podložky na každou stranu, a ponechat pro pozdější použití. Klávesové šipky jej přesunou i dále. Odložený díl stále patří do projektu a exportuje se. Pro vynechání jej skryjte nebo exportujte pouze výběr. S vybranou tiskárnou export upozorní na díly mimo podložku.

## Přichytávání při přesouvání

Při tažení po pracovní rovině se levý, pravý, přední a zadní okraj i střed přichytávají na odpovídající okraje či středy jiných tvarů. Růžová vodicí čára ukazuje místo přichycení. Bez zadávání čísel tak díly položíte těsně vedle sebe nebo je vystředíte. Funguje to i při vypnuté mřížce.

[[Shift]] během tažení omezí posun na osu X nebo Y podle toho, v kterém směru jste táhli více. Druhá souřadnice se zachová. Klávesu stiskněte nejlépe až po zahájení pohybu, protože Shift+klik na nevybraný tvar jej pouze přidá do výběru.

Přidržíte-li [[Alt]] už před zahájením tažení, přesouváte kopii jako v Tinkercadu. Originál zůstane a kopie dopadne na místo uvolnění. Stisknutí [[Alt]] až během tažení pozastaví přichytávání k objektům, zůstane jen krok mřížky. I kopie se začne přichytávat po uvolnění [[Alt]] během pohybu. Trvale přichytávání vypnete přes {{ui:inspector.objectSnap}} v nabídce mřížky vpravo dole nebo v nastavení. Zatím se týká jen posouvání po běžné pracovní rovině, nikoli zvedání a změny rozměrů.

## Zarovnání

Vyberte nejméně dva tvary a zapněte {{ui:editor.tool.align}}. Kolem výběru se objeví body pro levý okraj, střed, pravý okraj, předek, střed, zadek a horní, střední či spodní výšku. Kliknutí přesune tvary na zvolenou úroveň. Pokud nejprve kliknete na jedno vybrané těleso, zůstane pevné a ostatní se zarovnají podle něj. Zamčené těleso se stane pevným základem automaticky. Krajní zarovnání používá ohraničující kvádr, ale střed trojúhelníku, pětiúhelníku nebo hvězdy je vlastním středem tvaru. Otvor tak bude uprostřed tvaru, nikoli jeho obálky.

U šikmo natočeného tvaru, například o 45°, se jinak zarovnává podle obálky, nikoli jeho vlastních hran. Chcete-li použít jeho osy, položte nejprve na jeho plochu pracovní rovinu přes {{ui:camera.placeWorkplane}}. Zarovnávací body pak používají osy této roviny jako v Tinkercadu. Pro návrat k osám podložky pracovní rovinu obnovte.

![Zarovnání zobrazuje cílové polohy jako body kolem výběru.](shot:align)

Zkratka je [[L]], [[Esc]] nástroj ukončí.

## Zrcadlení

{{ui:editor.tool.mirror}}, [[M]] nebo příkaz v místní nabídce, převrátí výběr podle roviny: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} nebo {{ui:mirror.topBottom}}. Klikněte na odpovídající šipku osy. Pro souměrný díl stačí vytvořit polovinu, zkopírovat ji a kopii zrcadlit.

## Otáčení a střed otáčení

Otáčejte obloukovými šipkami, čísly v nastavení nebo [[R]] po 45°. Tažení po kružnici přichytává po ryskách 22,5°, se [[Shift]] přidá jemnější rysky po 11,25°. Tažení mimo kružnici umožní kroky 1°, se [[Shift]] 45°. Výběr se běžně otáčí kolem svého středu. Pro jiný bod, například konec nakloněné trubky, použijte {{ui:editor.tool.rotationPivot}} a klikněte na plochu. Rovinná plocha poskytne svůj střed, například osu konce trubky. U sloučeného celku nebo skupiny se plocha táhne přes díly, které se stýkají, jako u jednoho tělesa, a střed otáčení se po jejich spojení posune doprostřed celé plochy, kromě sloučeného celku nebo skupiny s textem a skupiny s výřezem. Další použití nástroje vlastní střed zruší.

Úhly se uchovávají s tělesem. {{ui:inspector.rotation}} uvádí {{ui:prop.rotateX}}, {{ui:prop.rotateY}} a {{ui:prop.rotateZ}} podle stejné soustavy jako poloha, s Y po podložce a Z vzhůru. Zadání úhlu otočí těleso kolem středu či vlastního uloženého bodu. Úhly vybraného tělesa jsou vidět i pod ním; vypnete je přes {{ui:workspace.showRotationAngles}}.

![Těleso otočené kolem dvou os. Úhly se zobrazují pod ním a lze je zadat v pravém panelu.](shot:rotation-card)

Při výběru **jednoho tělesa** patří střed otáčení jemu. Zachová se po výběru jiného objektu, pohybuje se, otáčí a škáluje s tělesem, ukládá se a obnovuje přes Zpět. V {{ui:inspector.position}} má vlastní X, Y, Z, které lze zadávat nebo krokovat. {{ui:inspector.pivotRemove}} jej odstraní. Červenou značku lze táhnout po povrchu a přichytávat k rohům, středům hran i hranám, například pro umístění čepu přesně v rohu. U více těles platí bod jen pro aktuální výběr a nový výběr jej zruší. Seskupíš-li je nebo svážeš, zůstane zachován: skupina ho převezme jako vlastní střed otáčení, s X, Y a Z v {{ui:inspector.position}}.

## Položení na plochu

Vyberte díl, zapněte {{ui:editor.tool.layFlat}} a klikněte na plochu, která má směřovat dolů. Plocha pod ukazatelem se zvýrazňuje; pro kontrolu ostatních stran otočte pohled. Díl se natočí a položí touto plochou na pracovní rovinu.

Pro přiložení dvou dílů vyberte pohyblivý díl, spusťte {{ui:editor.tool.mateFaces}}, klikněte na jeho plochu a pak na plochu druhého. {{ui:mate.mode.against}} přiloží plochy proti sobě, {{ui:mate.mode.flush}} je srovná do jedné roviny. {{ui:mate.gap}} ponechá mezeru, například pro vůli. {{ui:mate.apply}} otočí první díl nejkratší cestou do rovnoběžné orientace a přesune jej pouze kolmo k druhé ploše. Boční poloha se zachová. Pokud jsou plochy rovnoběžné, neotáčí se. Druhý díl zůstane na místě a jediný krok Zpět operaci vrátí.

![Panel zarovnání ploch: volba pohyblivého dílu, plochy druhého, režimu proti sobě nebo do roviny a případné mezery.](shot:mate-faces)

**Díry na jedné ose:** {{ui:mate.mode.concentric}} místo toho zarovná kulaté plochy: díru nad díru, čep do díry, šroub do jeho průchozí díry. Vyberte to dřív, než kliknete na plochy. Pak klikněte na kulatý vnitřek díry (nebo vnější stranu čepu) na dílu, který se pohne, a na kulatou plochu druhého dílu; celá kulatá plocha se pod ukazatelem rozsvítí. {{ui:mate.apply}} otočí díl nejkratší cestou, až jsou obě osy rovnoběžné, a posune ho napříč na druhou osu. Podél osy zůstane, kde byl, takže čep si drží výšku; zasuňte ho potom. Funguje to i u importovaných sítí, pokud je díra tvořena ploškami kolem jedné osy.

**Přesný úhel mezi dvěma plochami:** {{ui:editor.tool.mateFaces}} plochy zarovná rovnoběžně. Samostatný nástroj pro úhel mezi nimi není, ale můžete postupovat takto: nejprve plochy spojte přes {{ui:editor.tool.mateFaces}}, pak nastavte střed otáčení na společnou hranu pomocí {{ui:editor.tool.rotationPivot}} a kliknutí na hranu nebo roh. V kartě {{ui:inspector.rotation}} zadejte požadovaný úhel, například 15° či 30°. Díl se otočí kolem tohoto středu. Osy karty odpovídají osám podložky, takže postup funguje pro hranu ve směru X, Y nebo Z.

{{ui:editor.tool.dropToWorkplane}} ([[D]]) jednoduše položí výběr na pracovní rovinu, {{ui:editor.tool.centerOnWorkplane}} jej vystředí.

[[C]] zvedne výběr k ukazateli podobně jako Cruise v Tinkercadu. Kopíruje orientaci plochy pod ním, i šikmé. Kliknutí potvrdí umístění, [[Esc]] obnoví původní. Spodek dosedne na plochu, osy se srovnají s jejími hranami a vlastní natočení kolem svislé osy se zachová. Více dílů cestuje společně bez změny rozestupů. Nad prázdnou podložkou se nakloněný díl opět postaví kolmo na pracovní rovinu.

## Opakování v řadě a po kružnici

{{ui:editor.tool.array}} vytváří řady otvorů, roztečné kružnice šroubů a věnce zubů. Vyberte opakované tvary a spusťte nástroj.

![Opakování po kružnici nejprve zobrazuje náhled kopií.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** stejné rozestupy podél X, Y a Z přes {{ui:array.spacingX}}, {{ui:array.spacingY}} a {{ui:array.spacingZ}}. Jedna nenulová osa tvoří přímou řadu, více os šikmou řadu nebo schodiště. Záporný rozestup obrátí směr.
- **{{ui:array.fit}}:** Pro díry podél desky, věšák na klíče nebo na oblečení. Polož první kus na těleso nebo do něj, zvol {{ui:array.fit.x}} nebo {{ui:array.fit.y}} a nastav {{ui:array.fitGap}}: originál se posune o tolik dovnitř od bližšího konce (od okraje k boku kusu) a poslední kopie si drží stejnou mezeru ke vzdálenému konci. Rozestup se pak řídí hodnotou {{ui:array.count}}: pět děr nebo devět, vždy desku vyplní rovnoměrně.
- **{{ui:array.mode.circle}}:** rozmístění kolem středu s počtem {{ui:array.count}} a úhlem {{ui:array.angle}}, pro celý obvod 360°. Můžete zapnout společné natáčení kopií. {{ui:array.rise}} zvedá každou další kopii pro šroubovici, {{ui:array.radiusChange}} mění poloměr pro rovinnou spirálu. Kombinací vznikne kuželová spirála. Spirála udělá nejvýš jeden závit: úhel nad 360° se počítá jako celý kruh a kopií je nejvýš 100.

Tip: nastavte nejprve {{ui:editor.tool.rotationPivot}} na plochu. Střed kružnice pak bude přesně tam.

![Kruhové opakování se stoupáním a změnou poloměru vytváří rozšiřující se prostorovou spirálu.](shot:pattern-spiral)

Kopie jsou nejprve pouze náhled. Vytvoří je až {{ui:array.apply}}. Výřezy poté slučte s tělesem, do kterého mají řezat.

## Rastr otvorů na ploše

{{ui:holePattern.title}} rozmístí otvory po rovinné ploše krytu, mřížky reproduktoru, košíku nebo ventilace. Nemusíte vytvářet a opakovat jednotlivý výřez. Vyberte právě jedno těleso a spusťte {{ui:holePattern.title}} v {{ui:editor.group.modify}} vedle opakování, pravým tlačítkem nebo vyhledáváním [[Ctrl]]+[[K]].

1. Klikněte na rovinnou plochu. Použije se celá souvislá rovinná oblast, nikoli jen trojúhelník pod ukazatelem. Oblá plocha není podporovaná a nástroj vás vyzve k jinému výběru. U sloučeného celku nebo skupiny se plocha táhne přes díly, které se stýkají, jako u jednoho tělesa, u skupiny ale jen tehdy, když mezi díly není výřez. Díly se spojí krátce po otevření nástroje; do té doby se pod ukazatelem rozsvítí jen plocha jednoho dílu a kliknutí počká, až se díly spojí. U sloučeného celku nebo skupiny s textem se rozsvítí jen plocha jednoho dílu a díly spojí až kliknutí.
2. Nastavte otvory:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} nebo {{ui:holePattern.form.slot}}.
   - **Rozměry:** {{ui:holePattern.size.diameter}} kruhu, {{ui:holePattern.size.side}} čtverce, {{ui:holePattern.size.width}} a {{ui:holePattern.size.height}} obdélníku či podlouhlého otvoru. Šestiúhelník používá {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** vzdálenost středů sousedních otvorů. Příliš malou hodnotu program zvýší na minimum, aby zůstala stěna.
   - **{{ui:holePattern.wall}}:** stejný odstup vyjádřený tloušťkou stěny mezi otvory. Změna automaticky přepočte rozteč a naopak. U šestiúhelníků, obdélníků a podlouhlých otvorů se používá nejmenší vzdálenost mezi hranami.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} tvoří řádky a sloupce, {{ui:holePattern.arrangement.staggered}} posune každý druhý řádek o polovinu rozteče a přiblíží řádky tak, aby měly otvory stejně vzdálené sousedy. U šestiúhelníků vznikne voština.
   - **{{ui:holePattern.margin}}:** volný okraj kolem plochy i existujících otvorů. Vytvářejí se pouze celé otvory, které se do zbývající plochy vejdou.
   - **{{ui:holePattern.depth}}:** výchozí {{ui:holePattern.depth.through}} protne celou stěnu. {{ui:holePattern.depth.custom}} umožní zadat hloubku v mm pro zahloubení.
3. Náhled se průběžně mění a panel uvádí počet otvorů. {{ui:holePattern.repick}} zvolí jinou plochu a [[Esc]] nástroj zavře. Panel lze přesouvat za záhlaví.
4. Skutečné otvory vytvoří až {{ui:holePattern.apply}}.

Výřezy zůstávají běžnými tvary sloučenými s tělesem jako po {{ui:editor.tool.group}}. {{ui:editor.tool.ungroup}} je uvolní pro samostatný posun, změnu nebo smazání. Vše je jediný krok {{ui:editor.tool.undo}}. Najednou lze vytvořit nejvýše 400 otvorů; při překročení zvětšete otvory nebo rozteč.

AI může provést totéž přes `layerling_perforate_face`, viz [Modelování s AI](chapter:ai-with-mcp).

## Vysunutí plochy ven nebo dovnitř

Pro zesílení stěny, vyvýšenou plošku nebo vyříznutou kapsu pracuje nástroj {{ui:faceTool.title}} s jednou rovinnou plochou. Funguje i u importovaného STL, které nemá náčrt ke změně. Vyberte právě jedno těleso a spusťte {{ui:faceTool.title}} v {{ui:editor.group.modify}} vedle rastru otvorů, pravým tlačítkem nebo vyhledáváním [[Ctrl]]+[[K]].

1. Klikněte na rovinnou plochu tělesa. Stejně jako u rastru otvorů se použije celá souvislá rovinná oblast; oblá plocha není podporovaná. U sloučeného celku nebo skupiny se plocha jako u rastru otvorů táhne přes díly, které se stýkají.
2. V okně nastavte:
   - **{{ui:faceTool.direction}}:** {{ui:faceTool.direction.out}} pro materiál na ploše, nebo {{ui:faceTool.direction.in}} pro kapsu vyříznutou do ní. Kapsa nejde hlouběji než těleso za plochou; u dutého tělesa může přesto dosáhnout do dutiny.
   - **{{ui:faceTool.inset}}:** jak daleko zůstane nový obrys uvnitř okraje plochy. Směrem ven se při 0 vezme celá plocha, tak se stěna zesílí. Otvory v ploše se zvětší o stejnou hodnotu.
   - **{{ui:faceTool.radius}}:** zaoblí každý roh obrysu, i vnitřní, takže ostrý hrot skončí obloukem. Zářez užší než dvojnásobek poloměru se uzavře a část plochy užší než dvojnásobek odsazení a poloměru dohromady odpadne.
   - **{{ui:faceTool.depth}}:** jak daleko nový díl vystoupí z plochy, nebo jak hluboká bude kapsa.
3. Výsledek se hned zobrazí jako náhled a sleduje každou hodnotu. {{ui:faceTool.repick}} vybere jinou plochu, [[Esc]] nástroj zavře.
4. Teprve {{ui:faceTool.apply}} díl vytvoří.

Nástroj přidá běžné těleso z náčrtu sloučené s tělesem; nic se nezapéká. {{ui:group.edit}} otevře sloučení a {{ui:inspector.editSketch}} u nového dílu ukáže obrys, ze kterého vychází. Na horní nebo spodní ploše jednoduchého tělesa z náčrtu - jedna oblast, nesloučené, nezrcadlené, bez zúžení, zkroucení a naklonění, bez obrysového pásu, kroužku na klíče, zkosení či zaoblení - je to vlastní obrys tělesa, při stavbě odsazený dovnitř, takže jeho čáry a oblouky zůstanou přesné všude, kde je CAD jádro dokáže odsadit, pro nástroje hran a export STEP. Při pozdější změně velikosti si díl odsazení ponechá. Na každé jiné ploše, i u importované sítě, sleduje obrys trojúhelníky plochy a křivka se skládá z krátkých rovných úseků. Vše je jediný krok {{ui:editor.tool.undo}}. Odsazení nebo poloměr později změníte tak, že krok vrátíte zpět a nástroj použijete znovu. Horní hranu potom zaoblíte nástrojem {{ui:editor.tool.fillet}} s volbou {{ui:edge.topEdges}} na sloučení jako posledním krokem: jako každá úprava hran sloučení z něj udělá jedno těleso.

AI může provést totéž přes `layerling_push_face`, viz [Modelování s AI](chapter:ai-with-mcp).

## Současná změna více dílů

Při více vybraných dílech ukazuje pravý panel jejich počet a společné vlastnosti: {{ui:inspector.solid}}, {{ui:inspector.hole}}, barvu po kliknutí na {{ui:inspector.solid}} a zámek. Smíšený výběr lze jedním kliknutím převést na všechna plná tělesa či výřezy. Obsahuje-li zamčený díl, dostupný zůstane jen zámek. Rozměry měníte úchyty, přes {{ui:scalePercent.title}} nebo číslem u kóty. Kóta označuje celý výběr a mění všechny části i mezery jako tažení úchytu. Plné těleso a výřez přepíná i pravá nabídka nebo [[S]] a [[H]].

## Změna velikosti o procenta

Pro stejné zvětšení či zmenšení jednoho nebo více dílů použijte {{ui:scalePercent.title}} v pravé nabídce nebo přes [[Ctrl]]+[[K]].

{{ui:scalePercent.percent}} zadává novou velikost v procentech původní. 120 % znamená zvětšení o pětinu, 50 % poloviční velikost. Všechny tři rozměry se mění stejně a zachovají proporce. Spodek zůstává na místě, takže se díl nezanoří do podložky.

Pro více dílů zvolte:

- **{{ui:scalePercent.mode.together}}:** růst kolem společného středu včetně mezer, jako jeden celek.
- **{{ui:scalePercent.mode.each}}:** každý díl roste na svém místě a rozestupy mezi středy zůstávají stejné.

Změnu provede až {{ui:scalePercent.apply}} a jediný krok Zpět ji vrátí. Se zamčeným dílem ve výběru nástroj nelze otevřít.

## Zpět a znovu

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) a {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] nebo [[Ctrl]]+[[Y]]) procházejí historii. Počet kroků ukládaných s projektem určuje {{ui:workspace.history}}. Když najedete na jedno z obou tlačítek, jeho popisek pojmenuje krok, který vrátí nebo zopakuje, a u kroku s rozměrem i ten rozměr, například „Zaobleny hrany: Box (5 mm)“; hlášení po kroku říká totéž. Chcete-li se vrátit o více kroků najednou, použijte zobrazení historie níže.

## Prohlížení historie

{{ui:editor.tool.history}} vedle Zpět a Znovu umožní prohlížet starší stavy bez změny projektu. Pracovní plocha ukazuje minulou podobu a spodní posuvník prochází kroky. Současný stav je vpravo, předchozí vlevo; již vrácené kroky leží napravo od současného. Šipky procházejí stavy a [[Esc]] vrátí současnost. Kolečko myši nad posuvníkem dělá totéž, jeden stav na zoubek, nahoru ke staršímu; [[Page Up]] a [[Page Down]] skáčou o deset stavů, [[Home]] jde na nejstarší stav a [[End]] zpět na aktuální. Pohled můžete otáčet a přibližovat a klepnutím vybírat objekty k vrácení (viz níže), ale nic nelze měnit. Lištu lze přetáhnout za záhlaví a dvojklikem vrátit. Tlačítko se seznamem v záhlaví ukáže všechny kroky podle názvu v seznamu, nejnovější nahoře: kliknutí na krok přejde do tohoto stavu, stav, ve kterém návrh je, je označen {{ui:historyView.listNow}}, a vrácené kroky jsou šedé. Necháš-li seznam otevřený, bude otevřený i příště.

Ze staršího stavu můžete vytvořit {{ui:historyView.createProject}}. Nový projekt má původní název doplněný časem stavu; u starých dat bez času označení kopie. Obsahuje historii až do daného okamžiku, takže Zpět nadále funguje. {{ui:historyView.export}} otevře běžný export tohoto stavu jako STL, 3MF, STEP, obrázek nebo LYL včetně příslušné historie.

Do návrhu můžete vrátit i jednotlivé objekty. Klikněte na objekt v zobrazeném stavu - [[Shift]]+klik přidá další nebo jeden odebere, klik do prázdna nevybere nic - a zvolte {{ui:historyView.bringBack}}. Pohled se zavře a kopie každého objektu přibude do současného návrhu přesně tak, jak byl v tomto stavu, a na místě, kde tehdy stál, vybraná, vedle všeho, co návrh obsahuje teď; nic jiného se nemění. Je to jeden krok, Zpět ho vrátí. Hodí se pro starší verzi dílu, který jste mezitím změnili nebo smazali. Skupina se vrátí celá; poznámky a referenční body objektu zůstanou. Jeho název nese čas daného stavu, například „Kvádr (12:32)“, aby se snadno odlišil od současné verze. Chcete-li vrátit díl ze skupiny, vyberte skupinu a zvolte {{ui:historyView.openGroup}} nebo stiskněte [[E]], stejně jako v návrhu: její díly se rozloží tam, kam by je dala úprava skupiny, připravené k výběru, a lišta ukáže, ve které skupině jste. {{ui:historyView.backOut}} ji znovu zavře. Slouží jen k prohlížení - skupina, návrh i historie zůstanou beze změny.

{{ui:historyView.delete}} vlevo dole po potvrzení trvale vymaže všechny minulé kroky. Zachová skutečný současný stav, nikoli právě prohlížený. Zpět už nemá kam přejít a později uložený soubor neobsahuje historii. Použijte pro nový začátek historie nebo sdílení bez minulosti. Nelze vrátit. Chcete-li sdílet soubor bez zásahu do vlastního projektu, zvolte při exportu {{ui:export.historyNone}}.
