---
title: Klávesové zkratky
summary: Přehled kláves přímo z programu, aby vždy odpovídal skutečnému ovládání.
---

Zkratky fungují, když je aktivní pracovní plocha. Při psaní do textového pole nepřekážejí. Na Macu používejte [[Cmd]] tam, kde je zde uvedeno [[Ctrl]].

Stejný seznam otevřete v editoru pomocí {{ui:editor.keyboardShortcuts}} v části {{ui:editor.group.help}}. Tlačítko tiskárny v okně ({{ui:shortcuts.print}}) vytiskne samotný seznam černě na bílém a velkým písmem; dialog tisku v prohlížeči nabízí i uložení do PDF.

Pole nahoře v okně prohledává seznam: ponechá jen zkratky, v jejichž větě, skupině nebo klávesách se vyskytuje každé napsané slovo, takže "ctrl+z" ponechá jen tyto řádky. Na velikosti písmen a diakritice nezáleží a jediné písmeno nebo číslice najde tuto klávesu a slova, která jím začínají. Křížek X na konci pole ho vymaže; s prázdným polem je zpět celý seznam. Tlačítko tiskárny tiskne to, co okno ukazuje, takže po hledání vytiskne jen nalezené zkratky.

![Okno klávesových zkratek v editoru.](shot:shortcuts)

## Vyhledávání příkazů

Nemůžete najít nástroj? Stiskněte [[Ctrl]]+[[K]] nebo klikněte na lupu v části {{ui:editor.group.help}}. Zadejte nástroj, například „zaoblení“ nebo „zrcadlit“, tvar, například „válec“, nebo příkaz, například „export“ či „zpět“. Šipkami vyberte výsledek a potvrďte [[Enter]], případně na něj klikněte.

- Vyhledávání rozumí anglickým i německým názvům, nerozlišuje velikost písmen a německé přehlásky: například „aushoehlen“ vyhledá {{ui:editor.tool.hollow}}. Vyhledávání funguje v každém písmu: název se najde tak, jak je napsán v jazyce rozhraní („円柱“ v japonštině). Znaky plné a poloviční šířky, katakana a hiragana i diakritika se berou jako totožné.
- Každá položka uvádí odpovídající klávesovou zkratku i část pásu nástrojů, ve které ji najdete.
- Neaktivní položku nyní nelze spustit, zpravidla proto, že není nic vybráno. V seznamu zůstává, abyste věděli, kde nástroj hledat.

Vyhledávací pole má i tato příručka, nahoře na každé stránce. Zadejte jedno či více slov. Zobrazí se části obsahující všechna zadaná slova se zvýrazněnými shodami. Kliknutím nebo klávesou [[Enter]] přejdete na první výsledek. Otevřená stránka zvýrazní každé místo, kde se hledaná slova vyskytují, a posune se na první z nich ve zvolené části; [[Esc]] nebo kliknutí na zvýraznění ho zase odstraní.
- Zadání názvu tvaru jej přidá na pracovní rovinu stejně jako výběr v nabídce tvarů.
- Prázdné pole nabízí nahoře naposledy použité příkazy.
- Názvem tělesa vyhledáte a vyberete příslušný objekt v projektu. Pomůže to ve složitém modelu. Objekty se nabízejí až po zadání textu.
- Vlastní tvar, který jste uložili, se najde také podle názvu, jakmile začnete psát, a kliknutí ho vloží do návrhu jako v panelu tvarů.
- Vyhledávání funguje i v režimu náčrtu a nabízí jeho nástroje.

## Vlastní klávesy

Každý příkaz z vyhledávání příkazů můžete dát na vlastní klávesu: nástroj, který používáte pořád, tvar, {{ui:editor.tool.centerOnWorkplane}} nebo {{ui:palette.openShapes}}.

1. Otevřete {{ui:editor.keyboardShortcuts}} a nahoře v okně pod {{ui:customKeys.title}} klikněte na {{ui:customKeys.add}}.
2. Napište pár písmen příkazu a klikněte na něj, nebo stiskněte [[Enter]] pro první.
3. Stiskněte požadovanou klávesu, samotnou nebo s [[Ctrl]], [[Alt]] či [[Shift]]. Příkaz mohou nést písmena, číslice a F1 až F12.

Klávesa, kterou už používá editor, kterou si nechává prohlížeč (třeba [[Ctrl]]+[[W]]), nebo některá z vašich vlastních kláves se odmítne a okno řekne, k čemu slouží. Kliknutím na klávesu v seznamu ji změníte, křížkem vedle ní ji odeberete, {{ui:customKeys.removeAll}} začne znovu.

- Klávesa spustí příkaz stejně jako vyhledávání příkazů. Když teď nejde, většinou proto, že nic není vybráno, řekne to stavový řádek.
- Vaše klávesy jsou vidět vedle svých příkazů ve vyhledávání příkazů a na vytištěném seznamu.
- Zůstávají v tomto prohlížeči, stejně jako motiv. Klávesa pro nástroj náčrtu funguje v náčrtu, klávesa pro 3D editor mimo něj.
- Když píšete do pole, vaše klávesy se drží stranou jako všechny ostatní.

## Interaktivní nápověda

Nevíte, kde si o tlačítku nebo políčku přečíst? Nechte se k tomu zavést programem. Klikněte na otazník v oblasti {{ui:editor.group.help}} nebo stiskněte [[Shift]]+[[F1]]. Ukazatel se změní na otazník a to, co je pod ním, dostane rámeček.

- Klikněte na tlačítko, políčko, přepínač, úchyt, skupinu pásu karet nebo na záhlaví okna. Nestane se to, co obvykle. Místo toho se otevře malé okno s názvem prvku, krátkým shrnutím části tohoto návodu, která o něm pojednává, až dvěma dalšími místy, kde se zmiňuje, a tlačítkem {{ui:interactiveHelp.open}}.
- Nápověda se týká prvku, na který jste ukázali, ne celého okna kolem něj. Prvek bez vlastního názvu použije nejbližší název kolem sebe; uvnitř okna se vrátí k otazníku tohoto okna.
- {{ui:interactiveHelp.open}} otevře návod na této části v novém panelu. Část je tam barevně orámovaná od nadpisu až po konec, takže vidíte, kde začíná a končí.
- Pokud o prvku návod nic neříká, okno to sdělí a nabídne {{ui:interactiveHelp.search}}.
- [[Esc]] nebo další klepnutí na otazník režim ukončí. Na dotykové obrazovce nic nenajíždí: klepnutí na prvek okno otevře rovnou.

Okno se přesouvá za záhlaví jako ostatní. Program najde část podle názvu prvku - popisku tlačítka, názvu políčka - protože tento návod píše každé tlačítko tak, jak se jmenuje v programu. Hledá ho stejným vyhledáváním jako pole nahoře na každé stránce návodu, v jazyce, který používáte, a vše běží ve vašem prohlížeči.

{{shortcuts}}
