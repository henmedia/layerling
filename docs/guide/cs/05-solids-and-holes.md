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

Se sloučeným celkem pracujete jako s běžným tvarem: přesouváte ho, otáčíte, měníte barvu nebo znovu slučujete. Příkaz {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) sloučení rozloží na původní části.

### Změna sloučeného celku na výřez

I celý sloučený tvar může být plným tělesem nebo výřezem. Platí jednoduché pravidlo:

- Obsahuje-li pouze plná tělesa nebo pouze výřezy, změna se provede u celku i všech jeho částí.
- Obsahuje-li obojí, například kvádr s otvorem, každá část si zachová svůj režim. Celek se změní na odečítací nástroj, ale jeho otvor zůstane otvorem.

## Seskupení

Někdy mají díly jen držet pohromadě, aniž by se spojila jejich geometrie. Příkladem je bílé logo na černé destičce pro vícebarevný tisk. K tomu slouží {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), podobně jako v Tinkercadu. Skupina se přesouvá, otáčí a mění velikost jako jeden tvar, ale její části se neslučují:

- Každá část si zachová barvu i režim plného tělesa nebo výřezu.
- Výřezy nic neodebírají.
- V exportu STL, 3MF a OBJ zůstává každá část samostatným tělesem; 3MF a OBJ zachovávají také barvy.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) skupinu znovu rozloží. Klávesa [[E]] ji otevře pro úpravy stejně jako sloučení. Na skupinu nelze použít zkosení, zaoblení ani vytvoření dutiny, protože netvoří jediné těleso. Nejprve ji slučte nebo upravujte její části samostatně. Má-li výřez uvnitř skupiny skutečně odebrat materiál, skupinu slučte pomocí Ctrl+G.

## Průnik

{{ui:editor.tool.intersect}} zachová pouze prostor společný dvěma nebo více tělesům. Umístěte dva tvary tak, aby se překrývaly, vyberte je a spusťte příkaz. Z válce a kvádru tak vznikne například díl s jednou oblou a jednou rovnou stranou. Sloučený tvar se vyhodnocuje podle skutečné geometrie včetně otvorů. Obsahuje-li výběr i výřez, zachová se společná oblast všech plných těles a všech výřezů.

## Vyříznutí jednoho tělesa z druhého

U dílů, které k sobě musí pasovat, hřídele v objímce nebo šroubu ve skříňce, vytvoříš jeden díl a vyřízneš ho z druhého. Vyber obě tělesa a klikni na {{ui:editor.tool.cutOut}} v oblasti {{ui:editor.group.combine}}, nebo klikni pravým tlačítkem a vyber to tam. Okno uvádí díl, který zůstane, a těleso, které dostane dutinu; layerling bere menší těleso jako díl a {{ui:cutOut.swap}} to otočí. {{ui:cutOut.clearance}} udělá dutinu ze všech stran o tolik větší než díl: 0 sedí přesně, 0,2 mm je obvyklá vůle pro tištěné spojení. {{ui:cutOut.apply}} vyřízne kopii dílu z druhého tělesa a samotný díl nechá, kde je. Výsledkem je skupina: {{ui:editor.tool.ungroup}} řez zase rozloží. Vůle vyžaduje, aby díl byl přesné těleso, jako u nástroje {{ui:editor.tool.offset}}, který se k tomu používá.

## Úprava sloučení

Příliš malý otvor nemusíte opravovat rozložením a novým sestavením celého dílu. Vyberte sloučený celek a použijte {{ui:group.edit}} v jeho nastavení, ikonu složky v seznamu objektů nebo klávesu [[E]]. Totéž provede dvojklik na celek, stejně jako v Tinkercadu; funguje i pro skupinu. Pokud dvojklik nechcete používat, vypněte {{ui:workspace.doubleClickOpensGroup}}. Těleso se začne přesouvat až po tažení o několik pixelů, takže nepřesný klik ani dvojklik neposune jeho polohu. Jednotlivé části nyní můžete upravovat všemi nástroji: zvětšit otvor, přesunout těleso nebo přidat výřez.

![Úprava sloučení: spodní lišta obsahuje Zrušit a Hotovo, seznam objektů ukazuje jednotlivé části.](shot:open-group)

Ve spodní části plochy se objeví lišta. {{ui:group.done}} sloučení znovu sestaví a zachová jeho název, barvu i režim plného tělesa nebo výřezu. {{ui:common.cancel}} vrátí původní stav.

Je-li některá část sama sloučeným celkem, můžete ji stejným způsobem otevřít a pokračovat do libovolné hloubky. Lišta ukazuje aktuální cestu, například „Držák › Sloupek pro šroub“. {{ui:group.done}} i {{ui:common.cancel}} vždy ukončí nejvnitřnější úpravu a vrátí vás o úroveň výš. Při úpravě jsou dostupné jen sloučené části právě otevřeného celku. Chcete-li otevřít jiný celek, nejprve aktuální úpravu dokončete.

Na rozdíl od {{ui:editor.tool.ungroup}}, které sloučení trvale rozloží, tato úprava zachovává celek, jeho název i nastavení. Pomocí {{ui:common.cancel}} se můžete vždy vrátit.

Upozornění: zkosení a zaoblení provedená na **celém** sloučeném tělese se při opětovném sestavení ztratí. Lišta na to upozorňuje.

## Rozdělení

{{ui:editor.tool.split}} v části {{ui:editor.group.modify}} rozdělí výběr rovinou na dvě části. Hodí se pro díl přesahující tiskovou podložku nebo pro prohlédnutí jeho vnitřku. Vyberte jedno či více plných těles nebo výřezů a spusťte nástroj. Průsvitná rovina ukazuje místo řezu; do potvrzení se nic nemění.

- {{ui:split.orientation}}: **X** znamená svislý řez mezi levou a pravou stranou, **Y** mezi přední a zadní stranou a **Z** vodorovný řez mezi horní a spodní částí. Osy odpovídají panelu polohy, Z míří vzhůru. Výchozí řez je v ose Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} položí rovinu rovnoběžně s pracovní rovinou, {{ui:split.workplaneAcrossX}} a {{ui:split.workplaneAcrossY}} ji postaví kolmo k ní, napříč jejím směrem X nebo Y. Protíná-li počátek pracovní roviny výběr, vede rovina přes něj, jinak středem. Tak položíš pracovní rovinu pomocí [[W]] na šikmou plochu a řízneš přesně tam, bez otáčení posuvníků.
- {{ui:split.position}} určuje polohu roviny pomocí posuvníku nebo číselného zadání. Začíná uprostřed výběru. Rovinou lze také posouvat za hrot šipky, v krocích 0,1 mm.
- {{ui:split.pickFace}} vedle polohy přiloží rovinu na plochu tělesa. Klikněte na tlačítko a pak na požadovanou plochu. Orientace, obě natočení i poloha se přizpůsobí. Během výběru ukazuje modrá rovina pod kurzorem zaměřenou plochu. Lze použít i plochu nevybraného tělesa, rovina však zůstává v rozsahu výběru. [[Esc]] ukončí výběr plochy a ponechá rovinu na místě.
- Dva posuvníky natočení umožňují otáčet rovinou kolem zbývajících os až o 180° na obě strany. Natočení lze kombinovat.

{{ui:split.apply}} nebo [[Enter]] provede řez, [[Esc]] jej zruší. Při vybírání plochy první [[Esc]] ukončí pouze toto vybírání. Každý protnutý objekt se rozdělí na dvě uzavřená tělesa pojmenovaná podle strany, například „Kvádr (Z+)“ a „Kvádr (Z-)“. Neprotnuté objekty se nezmění. Výřez se rozdělí na dva výřezy a duté těleso si zachová dutinu. Obě poloviny zůstanou na původním místě. Pro tisk je položte řeznou plochou na podložku pomocí {{ui:editor.tool.layFlat}}.

Poloviny jsou běžné polygonové sítě. Parametry původního tvaru, například počet stran válce nebo text nápisu, už nemají; nastavte je před rozdělením. [[Ctrl]]+[[Z]] obnoví originál jediným krokem. Zamčené a skryté objekty nelze rozdělit.

## Oddělení částí

Skládá-li se tvar z více nespojených částí, například text z jednotlivých písmen, {{ui:inspector.separateParts}} je oddělí do samostatných tvarů. Položku najdeš také v nabídce, která se otevře pravým kliknutím na tvar.

> **Tip:** Výřezy dělejte o něco delší než díl, kterým mají projít. Pokud končí přesně na jeho povrchu, může zůstat velmi tenká blána. Přesah o jeden milimetr tomu pomůže předejít.
