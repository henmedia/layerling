---
title: Měření a poznámky
summary: Měření vzdáleností, pravítko a úhelník, vzdálenosti od počátku, poznámky připojené k dílu a referenční body pro přichytávání.
---

Přesné modelování vyžaduje měření. Layerling nabízí několik nástrojů, které se do exportu nezahrnují. Tloušťku stěn a mezery uvnitř dílu nejsnáze změříte v [pohledu v řezu](chapter:view-and-workplane) pomocí {{ui:camera.sectionMeasure}}.

## Měření vzdáleností

Nástroj je ve spodní části levé lišty pohledu, {{ui:camera.tapeTools}}. Měří vzdálenosti mezi rohy, hranami a plochami. Kliknutím otevřete nabídku pěti tlačítek. Překáží-li, přetáhněte ji za úchyt vlevo na jiné místo. Dvojklik na úchyt ji vrátí.

![Nabídka měření: přidání, přesunutí bodů, odebrání, celé hrany a odstranění všech měření.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klikněte na první bod, přesuňte ukazatel k druhému a znovu klikněte. Zobrazí se vzdálenost a před ní osy, podél kterých měření vede: X, Y nebo Z u přímého, XY, XZ nebo YZ napříč rovinou, 3D pro všechny tři. Najeďte na popisek a uvidíte, jak daleko měření sahá podél každé osy; na bodu uvidíte jeho souřadnice. Při umisťování druhého bodu se osy, vzdálenost a rozsah podél každé osy zobrazují vedle ukazatele. Měření, které leží většinou za jiným tělesem, zbledne; po najetí na jeho čáru nebo popisek se znovu zobrazí naplno.
2. **{{ui:camera.moveMeasurement}}:** Přetáhněte měřicí body; hodnota se průběžně mění.
3. **{{ui:camera.deleteMeasurement}}:** Po zapnutí klikněte na měření, které chcete odstranit.
4. **{{ui:camera.tapeWholeEdges}}:** Kliknutí na hranu změří celou její délku, například obvod kružnice. Při vypnutí se na hranu umístí bod a druhý můžete zvolit kdekoliv. Změříte tak průměr i jiné vzdálenosti. [[Alt]] režim pro jedno kliknutí obrátí. Na kružnici se při přiblížení ukazatele přichytí bod protilehlý prvnímu. Body leží na skutečné kružnici, takže průměr vyjde přesně.
5. **{{ui:camera.deleteAllMeasurements}}:** Odstraní všechna měření. Protože operaci nelze vrátit, program si vyžádá potvrzení. Bez měření nemá příkaz co odstranit.
6. **{{ui:camera.tapeMarkMiddle}}:** Uprostřed každého měření je malá kulatá značka se spodní polovinou vyplněnou. Vytvoří [referenční bod](#referencni-body) ve středu měření. U kruhové hrany, například okraje otvoru, je to střed kružnice, a to i u importované sítě. U průměru nebo přímého měření vznikne bod v polovině úsečky. Přetahovaný tvar se na něj přichytí svým středem. Již existující bod se nevytváří znovu. Měřicí pásmo se k referenčním bodům přichytává stejně jako k rohům. Chcete-li měřit od středu kružnice nebo úsečky, nejprve jej označte a potom na bod klikněte.
7. **{{ui:camera.tapeTypeLength}}:** Leží-li aspoň jeden konec přímého měření na tělese, lze na jeho číslo kliknout. Zadejte novou délku a stiskněte [[Enter]]: těleso u druhého bodu se posune podél změřené čáry, až je vzdálenost přesně taková, jako u pravítka v Tinkercadu. Je-li vybráno jen těleso u prvního bodu, posune se to. Měřicí body zůstávají na tělese, takže měření jde s ním. Měřte od rohu, hrany nebo [referenčního bodu](#referencni-body), například středu kružnice, a díly tak umístíte na přesnou vzdálenost. Záporná délka ho posune o tolik za první bod, třeba 5 mm dovnitř za hranu kvádru.

[[Esc]] ukončí režim měření.

## Pravítko

{{ui:shape.ruler}} vložíte z knihovny tvarů. Je to pouze měřicí pomůcka: neexportuje se a nelze ji slučovat ani odečítat. U těles dotýkajících se pravítka nebo zasahujících přes něj zobrazí rozměr přímo v pohledu. Číselný údaj lze upravit a těleso se podle něj změní. Plovoucí tlačítko plus vytvoří kopii měřeného tvaru. Natištěná stupnice je v milimetrech; po přepnutí jednotky na palce (přepínač vpravo dole) je v palcích, s čárkou na každou šestnáctinu palce a očíslovanými celými palci.

## Úhelník

Pro měření v pravém úhlu použijte {{ui:camera.cornerRulerTool}} v liště pohledu a klikněte na pracovní rovinu. Vloží se dvě kolmá ramena s ryskami. Ani úhelník není tělesem. Kliknete-li blízko rohu objektu, jeho počátek se přesně přichytí k tomuto rohu.

Úhelník leží na pracovní rovině. Je-li rovina umístěna na boku tělesa, leží tam i úhelník, viz [Pohled a pracovní rovina](chapter:view-and-workplane). Pro kótování na svislé stěně na ni nejprve položte pracovní rovinu, úhelník přiložte k levému hornímu rohu a klikáním na úchyt natočte ramena doprava a dolů.

- **Tažením úchytu** měníte polohu.
- **Krátkým kliknutím na úchyt** otočíte úhelník o 90°.
- **×** vedle úhelníku jej odstraní.
- **Malé tlačítko vlevo od úchytu** přepíná měření od vnějšího okraje tělesa, se symbolem čar, nebo od jeho středu, se zaměřovacím křížem. Stejný malý přepínač je i u každého zeleného čísla a nastavuje pouze danou kótu. U stojícího válce tak můžete měřit v obou ramenech ke středu a ve výšce ke spodní straně, u ležícího napříč ke středu a podélně ke konci. Pokud se všechna tři nastavení shodují, tlačítko u úchytu ukáže společný režim.

U těles umístěných u ramen úhelník automaticky ukazuje rozměry. To funguje pouze na základní podložce, nikoli na boční stěně. Tlačítko se šipkou pod úchytem úhelníku to vypne, takže míry ukazují jen vybraná tělesa; ukládá se s projektem.

Po výběru tělesa se zeleně zobrazí vzdálenosti od rohu podél obou ramen i výškově. Kliknutím na zelené číslo zadáte požadovanou vzdálenost a těleso se přesune. Více vybraných těles se posuzuje jako celek: měří se společný obrys a zadaná hodnota přesune celý výběr bez změny vzájemných poloh.

V režimu středu vedou zelené rozměry do středu tělesa, včetně výšky. Střed koule tak umístíte přesně 15 mm od okraje bez odečítání poloměru. Otvor na stěně umístíte například 40 mm zleva a 190 mm shora tak, že jej vyberete, zapnete měření od středu a zadáte 40 a 190. Výška v tomto případě směřuje ven ze stěny.

Měřicí nástroj i úhelník zůstávají na místě při přechodu do náčrtu a zpět do 3D. Ani jeden se neukládá do historie. Úhelník se s projektem ukládá, stejně jako měření měřicího nástroje, v prohlížeči i v souboru .lyl: po otevření projektu jsou zase tam. Tlačítko s okem mezi tlačítky měřicího nástroje všechna měření skryje a znovu zobrazí; uloží se i to, zda jsou skrytá, a kdo měření přidá, posune nebo smaže, uvidí je předtím znovu.

## Vzdálenosti od počátku a při přesouvání

V nastavení {{ui:workspace.appearance}} jsou dva přepínače průběžného kótování:

- {{ui:workspace.showMoveDimensions}} zobrazuje posunutí během tažení. Patří sem i zvedání černou šipkou nad tělesem, měřené podél jeho přední hrany. Po puštění klikni na takové číslo a napiš přesnou vzdálenost; záporná hodnota jde dolů.
- {{ui:workspace.showOriginDimensions}} zobrazuje vzdálenosti výběru od počátku podložky, i při výběru více těles.

{{ui:workspace.dimensionsAlwaysVisible}} ponechá rozměry zobrazené trvale.

Když na chvíli překážejí, stiskněte [[Q]]: rozměry a vzdálenosti kolem výběru zmizí a díl, který posouváte, je dobře vidět. Další [[Q]] je vrátí. Úchyt, na který ukážete, svůj rozměr ukáže i tak.

## Poznámky

Poznámka zachytí informace, které geometrie nevyjadřuje: „Šroub je o 0,3 mm těsný“, „Ještě vytisknout víko“ nebo „Rozměr od Petra“. Vložíte ji pomocí {{ui:editor.tool.note}} nebo klávesy [[N]].

- Poznámka umístěná **na těleso** se pohybuje spolu s ním.
- Poznámka **vedle tělesa** zůstává na pracovní rovině, {{ui:note.free}}.
- {{ui:note.detach}} odpojí poznámku od tělesa.
- {{ui:editor.tool.group}} vezme připojenou poznámku do skupiny; {{ui:editor.tool.ungroup}} ji předá viditelné části pod ní, i vnořené skupině. Dokud je skupina otevřená přes {{ui:group.edit}}, její poznámky se pohybují s částí pod nimi a tlačítkem {{ui:group.done}} se vrátí ke skupině; zrušení je vrátí do původního stavu.
- Když je její těleso smazáno nebo pod ní už není žádné viditelné těleso, poznámka zůstane, kde byla, na pracovní rovině.
- Tažením za špendlík poznámku přesunete. Kliknutím na špendlík kartu sbalíte, zůstane jen malé číslo; dalším kliknutím ji zase otevřete. Kliknutím do textu ho upravíte.
- [[Enter]] potvrdí text, [[Esc]] vrátí podobu před zahájením úpravy. [[Shift]]+[[Enter]] vloží nový řádek.
- **V náčrtu** vložíte poznámku také pomocí {{ui:editor.tool.note}} (v sekci {{ui:editor.group.manage}}) nebo klávesy [[N]], kamkoli do náčrtu. Všechny poznámky náčrtu patří k jeho tělesu: ve 3D zobrazení na něm sedí, nahoře na tělese vytvořeném přes {{ui:sketch.extrude}} nebo {{ui:sketch.sweep}} a na nakresleném profilu tělesa vytvořeného přes {{ui:sketch.revolve}}, a pohybují se s ním. Když náčrt znovu otevřete, ukáže poznámky tělesa, i ty vložené ve 3D. V náčrtu vezme {{ui:sketch.undo}} poznámku zpět stejně jako čáru a {{ui:sketch.cancel}} zahodí, co jste na poznámkách změnili. [[Shift]]+[[N]] poznámky i zde zobrazí nebo skryje.

Poznámky se ukládají v projektu, do exportu se nezahrnují a jejich viditelnost přepíná {{ui:visibility.notes}} (v {{ui:editor.visibilityOptions}}, šipce vedle ikony oka) nebo zkratka [[Shift]]+[[N]].

## Referenční body

Referenční bod je samostatná značka v prostoru, podobná rysce při práci v dílně. Nepatří žádnému tělesu, netiskne se a ostatní objekty se na něj přichytávají. Klikněte pravým tlačítkem na těleso a vyberte {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} nebo {{ui:contextMenu.markMidpoints}}. Body vzniknou na horní ploše tělesa, případně celého výběru. {{ui:contextMenu.markFaceCenter}} místo toho umístí bod doprostřed rovné stěny, na kterou jste klikli pravým tlačítkem, třeba na boku nebo na konci. Je-li nastaven střed otáčení, {{ui:contextMenu.markPivot}} umístí bod přesně na něj, takže se střed jiného dílu zachytí v bodě, kolem kterého se výběr otáčí.

- Bod přesunete tažením nebo kliknutím otevřete souřadnice v nastavených jednotkách. Každou kartu lze přetáhnout za záhlaví samostatně; ostatní zůstanou na místě. Dvojklik ji vrátí a naposledy použitá karta se zobrazí vpředu. **Odstranit všechny** na kartě nebo v nabídce pravého tlačítka odstraní všechny body najednou. {{ui:common.delete}} odstraní jednotlivý bod.
- Bod vytvoří i měřicí nástroj: {{ui:camera.tapeMarkMiddle}}, napůl vyplněná značka uprostřed měření, označí jeho střed, například střed kruhového otvoru. Měřit lze také od takového bodu: pásmo se k referenčním bodům přichytává stejně jako k rohům.
- Při tažení se na body přichytávají hrany i středy tvarů, stejně jako na jiná tělesa při {{ui:workspace.objectSnap}}. Přichytává se i úhelník.
- Body se ukládají do projektu, neexportují se a zobrazují či skrývají se společně s poznámkami přes {{ui:visibility.notes}} ([[Shift]]+[[N]]).
- AI je může vytvářet, vypisovat a odstraňovat pomocí `layerling_add_reference_points`, `layerling_list_reference_points` a `layerling_remove_reference_points`.

## Referenční obrázky

Referenční obrázek je obrázek, podle kterého zarovnáte díly: položte fotku desky plošných spojů na dno její krabičky a usaďte distanční sloupky, otvory a výřezy pro konektory přesně na ni. Je to pomůcka, ne těleso: nikdy se netiskne, nikdy neexportuje (STL, 3MF, OBJ, STEP, SVG), nikdy není součástí skupiny, svazku ani řezu a odhad tisku ho vynechává.

- Otevřete {{ui:editor.import}} a zvolte {{ui:import.referenceImage}}, pak obrázek PNG, JPG, WebP, GIF nebo BMP. Položí se na pracovní rovinu - na podložku, nebo na plochu, na kterou jste pracovní rovinu položili -, delší stranou 100 mm a napůl průhledný.
- Posouvejte, otáčejte a měňte ho úchyty jako každý tvar. Těleso před ním se vybere jako první, takže při práci na něm obrázek omylem nechytnete.
- {{ui:referenceImage.seeThrough}} v jeho nastavení ho zeslabí od plně viditelného po sotva patrný.
- {{ui:referenceImage.calibrate}} mu dá skutečnou velikost jako ve skice: klikněte na dva body obrázku, jejichž skutečnou vzdálenost znáte - třeba dva montážní otvory desky - a zadejte tuto vzdálenost do pole {{ui:referenceImage.distance}}. Obrázek si zachová proporce i střed.
- Zamkněte ho zámkem v záhlaví jeho nastavení a zůstane na místě: kliknutí pak jím procházejí na podložku. K odemčení ho vyberte v seznamu objektů.
- Obrázek je v souboru návrhu uložen jednou, ať se kopíruje nebo vrací kolikrát chce. Velký obrázek zvětší soubor o tolik; hlášení při přidání uvede jeho velikost.
- AI ho přidá, posune, kalibruje, zeslabí a zamkne pomocí `layerling_reference_image`.
