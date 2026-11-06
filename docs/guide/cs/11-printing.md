---
title: Příprava pro 3D tisk
summary: Výběr tiskárny, upozornění na příliš velký díl a správná orientace na podložce.
---

## Výběr tiskárny

Otevřete nastavení ozubeným kolem v titulním řádku, {{ui:editor.workspaceSettings}}, a přejděte do části {{ui:workspace.workplane}}. V nabídce {{ui:workspace.printer}} vyberte tiskárnu ze seznamu více než 230 běžných modelů značek Bambu Lab, Prusa, Creality, Anycubic, Elegoo a dalších.

![Nastavení pracovní roviny s vybranou tiskárnou. Rozměry podložky a maximální výška tisku vycházejí z profilu sliceru.](shot:settings-workplane)

Projeví se tři změny:

- Pracovní rovina získá rozměry tiskové podložky.
- V jejím rohu se zobrazí název tiskárny a tiskový prostor. Pokud popisky překážejí, vypněte {{ui:workspace.showPlateLabels}} v části {{ui:workspace.workplane}}. Platí to i pro název projektu vlevo vpředu.
- Layerling **upozorní**, když se díl nevejde.

Profily tiskáren pocházejí z OrcaSliceru, takže odpovídají profilům známým ze sliceru. Pro práci bez konkrétní tiskárny zvolte {{ui:workspace.printerNone}}. Velikost pracovní roviny lze zadat i ručně.

Delta tiskárny, například od FLSun nebo SeeMeCNC či Anycubic Predator, tisknou na kulatou podložku. S některou z nich je kulatá i pracovní plocha, stejně široká jako podložka, a těleso je příliš velké, jakmile přesahuje okraj. Kulaté těleso se měří podle vlastního obrysu, ne podle kvádru kolem něj, takže se vejde i válec skoro tak široký jako podložka.

## Když se díl nevejde

Těleso přesahující podložku se označí. Zpráva uvede, přes které strany přesahuje a o kolik. Stejně se kontroluje **příliš vysoký** díl. Výška se počítá od nejnižší části modelu, stejně jako při položení do sliceru.

![Kvádr je širší než podložka Bambu Lab A1 mini. Zpráva dole uvádí velikost přesahu.](shot:printer-overhang)

Upozornění nebrání další práci. Pomáhá zjistit problém ještě před otevřením sliceru. Příliš velký díl lze často rozdělit pomocí {{ui:editor.tool.split}} a poloviny vytisknout samostatně.

## Správná orientace dílu

Poloha na podložce ovlivňuje pevnost i vzhled výtisku. V části {{ui:editor.group.arrange}} pomohou dva nástroje:

- {{ui:editor.tool.layFlat}}: klikněte na plochu a díl se touto stranou položí dolů. Orientaci pro tisk tak zvolíte jediným kliknutím.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): položí na pracovní rovinu díl, který se vznáší nad ní.

Několik praktických pravidel:

- Velké rovné plochy pokládejte dolů. Nejlépe přilnou.
- Dlouhé namáhané díly orientujte tak, aby vrstvy nebyly kolmé ke směru zatížení. Spojení mezi vrstvami bývá nejslabším místem.
- Vyhněte se převisům přes 45°, případně ve sliceru zapněte podpěry.

## Zobrazení převisů

V nabídce vedle oka v části {{ui:editor.group.visibility}} zapněte **zobrazení převisů**. Plochy mířící dolů pod úhlem větším než 45° se červenobíle vyšrafují. Zde by tiskárna potřebovala podpěry. Plochy ležící na podložce se neoznačují. Už při návrhu tak vidíte, zda se koule, oblouk nebo vodorovný otvor vytiskne bez podpěr. Právě k tomu slouží [kapkovitý otvor](chapter:threads-and-mechanics). Po otočení dílu nebo položení na jinou plochu pomocí {{ui:editor.tool.layFlat}} se šrafování okamžitě přepočítá.

Mezní úhel nastavíte v části {{ui:workspace.appearance}}, od 30° pro opatrnější tisk po 70° pro tiskárny s dobrým chlazením výtisku. Plocha podepřená jiným tělesem se stále označuje, protože Layerling posuzuje pouze samotnou plochu.

## Tloušťka stěn, vůle a zkosení

- Stěna by měla mít nejméně dvě šířky extruzní čáry, tedy přibližně 0,8 mm při trysce 0,4 mm. Pevnější díly potřebují 1,2 až 2 mm.
- Mezi vzájemně zasouvanými díly je potřeba vůle, obvykle 0,2 až 0,4 mm podle tiskárny. Před velkým výtiskem zkuste malý zkušební pár.
- Spodní hranu položenou na podložce lze lehce zkosit, aby první vrstva nepřesahovala do stran, tedy nevznikala „sloní noha“.

## Vůle vaší tiskárny: test vůle

Každá tiskárna tiskne otvory o něco menší a čepy o něco silnější, než jsou nakreslené, každá o jinou hodnotu. Vůle, kterou dva vytištěné díly potřebují, je proto zpočátku odhad. Změřte ji raději jednou: v nastavení v části {{ui:workspace.workplane}} položí {{ui:workspace.fitTestMake}} na podložku test vůle. Je to destička 60 × 20 × 4 mm se sedmi otvory pro jeden čep 5 mm, každý nakreslený jako 5 mm plus dvakrát 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 nebo 0,40 mm, s vystouplou hodnotou vedle, a k tomu samotný čep 5 mm, který stojí vedle destičky a nahoře má malé sražení. Skládá se z běžných tvarů, takže se tiskne se zbytkem podložky, bez podpěr.

Vytiskněte ho tak, jak leží, a pak zasouvejte čep sraženým koncem napřed do otvorů, od nejužšího. **Nejužší otvor, ve kterém se čep ještě otáčí,** udává vůli vaší tiskárny. Zadejte jeho číslo do pole {{ui:workspace.printerPlay}} nebo ho klikněte mezi hodnotami pod polem. Vůle platí na stranu, v milimetrech, a prohlížeč si ji pamatuje pro všechny projekty; prázdné pole znamená neměřeno.

Od té chvíle začínají nová použití s vůlí místo vestavěné hodnoty: {{ui:lid.gap}} a {{ui:lid.hingePinPlay}} v nástroji {{ui:editor.tool.lid}}, vůle nových tvarů {{ui:shape.dovetail}} a {{ui:shape.snapFit}}, {{ui:prop.clearance}} nové matice nebo závitového otvoru – dvojnásobek vůle, protože jde o místo přes celý průměr – a {{ui:clearance.threshold}} v nástroji {{ui:editor.tool.clearance}}. Dokud takové pole tuto hodnotu drží, říká „{{ui:printerPlay.fromFitTest}}“ vedle něj, odkud číslo pochází. Pant tištěný vcelku a klouby nástroje {{ui:editor.tool.flexi}} si nechávají svých 0,4 mm: při tisku v jednom kuse musí jejich mezery zůstat otevřené i mezi vrstvami, a to čep vytištěný zvlášť neměří. Místo pro zalisování magnetu nebo klíče Gridfinity a místo pro koupenou zásuvku či desku si také nechávají své vlastní hodnoty. Tělesa, která už v projektu jsou, se nikdy nezmění, a stejně tak projekt, který otevřete.

## Dokončení

Zvolte {{ui:editor.export}} a formát **STL** nebo **3MF**. STL je nejjednodušší. 3MF uchovává názvy a barvy jednotlivých těles, a hodí se proto pro vícebarevný tisk. Exportní okno ukazuje také odhad hmotnosti a délky filamentu při plném tisku. Podrobnosti najdete v kapitole [Soubory a ukládání](chapter:files-and-saving).
