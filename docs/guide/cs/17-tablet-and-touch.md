---
title: Tablet a dotyk
summary: Práce prsty nebo stylusem: výběr více těles, otáčení a přibližování pohledu, nabídka dlouhého stisku a co je dobré vědět na iPadu.
---

## Prsty a stylus

layerling běží v prohlížeči tabletu i jako aplikace z domovské obrazovky. Prst dělá to, co levé tlačítko myši. Tři věci, které tablet nemá, pravé tlačítko myši, klávesu Shift a kolečko, mají vlastní cestu:

| Chcete | Na tabletu |
| --- | --- |
| Vybrat těleso | Klepnout na něj. |
| Vybrat více těles | Podržte prst půl sekundy nehybně, zvolte {{ui:contextMenu.selectMultiple}} a pak klepejte na jedno těleso po druhém. Klepnutí na vybrané těleso ho z výběru zase vyjme. |
| Vybrat všechna tělesa | Podržte prst půl sekundy nehybně na prázdném místě a zvolte {{ui:contextMenu.selectAll}}. |
| Otevřít nabídku pravého kliknutí | Podržte prst půl sekundy nehybně na tělese nebo na prázdném místě. |
| Přesunout těleso | Přetáhnout ho. |
| Změnit velikost, otočit nebo zvednout těleso | Táhnout za jeho úchyty, malé čtverečky a šipky kolem něj. Prst je zachytí i kousek vedle. |
| Otočit pohled | Jeden prst na prázdném místě, nebo táhnout za krychli pohledu. |
| Přiblížit pohled | Dva prsty: roztažením se přiblížíte, stažením oddálíte. |
| Posunout pohled | Posuňte dva prsty společně. |
| Zrušit výběr | Klepnout na prázdné místo. Ne při zapnutém {{ui:camera.touchRotate}}, kdy jeden prst otáčí pohled; a v {{ui:contextMenu.selectMultiple}} první klepnutí na prázdné místo jen ukončí režim a výběr nechá, jaký je, teprve další ho zruší. |

## Výběr více těles

Bez klávesy Shift dělá {{ui:contextMenu.selectMultiple}} v nabídce dlouhého stisku to, co na počítači Shift+kliknutí. Dokud je zapnuto, hlásí to zpráva a každé klepnutí na těleso ho přidá do výběru nebo z něj vyjme. Klepnutí na prázdné místo, na klávesnici [[Esc]], ho ukončí a výběr nechá, jaký je. Prst na prázdném místě mezitím dál otáčí pohled. Potom působí {{ui:editor.tool.group}}, {{ui:editor.tool.align}} nebo přesun na všechna vybraná tělesa.

## Otáčení a přibližování pohledu

Jeden prst na prázdném místě otáčí pohled, dva prsty ho přibližují a posouvají. Prst, který začne na tělese, pracuje s tělesem, ne s pohledem. Pokud chcete, aby místo toho otáčel pohled, zapněte {{ui:camera.touchRotate}} v liště pohledu: jeden prst pak otáčí pohled místo výběru, ať začne kdekoli. Tento přepínač se zobrazuje jen na zařízení s dotykovou obrazovkou.

Krychle pohledu vlevo nahoře otáčí pohled, když za ni táhnete, a klepnutí na některou její stranu, roh nebo hranu skočí na tento pohled. Viz [Pohled a pracovní rovina](chapter:view-and-workplane).

## Úchyty, malé body a stylus

Špička prstu zakrývá to, na co míří. layerling nechá prst dosáhnout na úchyty, body, čáry a hrany o kousek dál než ukazatel myši, ale stylus je jemnější. To platí pro pero, které tablet zná jako pero, například Apple Pencil nebo S Pen. Obyčejný stylus s gumovým hrotem se pro obrazovku počítá jako prst a není jemnější než on, pracujte s ním tedy jako s prstem. Když se Apple Pencil na iPadu vznáší nad tlačítkem, po chvíli se v malé bublině objeví jeho název, jako nápověda u myši.

Pokud se tělesa posouvají, protože se jich dotknou děti nebo spěchající ruce, zapněte v nastavení {{ui:workspace.selectBeforeMoving}}: těleso pak musí být nejprve vybráno a teprve další tažení ho přesune.

## Na iPadu nebo iPhonu

- **Nainstalujte jako aplikaci.** V Safari klepněte na ikonu sdílení a zvolte „Přidat na plochu“. Aplikace se otevře ve vlastním okně bez adresního řádku a funguje i bez připojení, viz [Offline a instalace](chapter:offline-and-install).
- **Vaše projekty jsou v prohlížeči.** Nemáte účet a nic se nenahrává. Safari má vlastní pravidlo proti sledování: smaže, co si web uložil, pokud jste ho sedm dní nenavštívili v Safari. Webová aplikace na ploše je z tohoto pravidla vyňata, jak ho popisuje WebKit. To je další důvod používat aplikaci z plochy a zálohovat důležitou práci: {{ui:dashboard.backupAll}} na úvodní stránce sbalí všechny projekty do jednoho souboru.
- **Soubory.** Safari nechá stránku zapisovat do souboru jen přes stažení, proto {{ui:editor.export}} uloží soubor do Stažených v aplikaci Soubory a [[Ctrl]]+[[S]] na klávesnici ho stáhne znovu; viz [Soubory a ukládání](chapter:files-and-saving).
- **Klávesnice není potřeba.** Každý nástroj má tlačítko na pásu karet a číselné pole otevře klávesnici na obrazovce. Klávesnice u iPadu přidá [klávesové zkratky](chapter:shortcuts). Políčko s hodnotou vedle tělesa otevře své číselné pole až druhým klepnutím: první ho jen označí, takže prst, který na něj omylem dopadne, nevyvolá klávesnici.

## Dílny s dětmi

Prsty a styly s gumovým hrotem fungují stejně. Dvě nastavení práci třídy usnadní: {{ui:workspace.selectBeforeMoving}}, aby dotyk těleso omylem neposunul, a {{ui:camera.touchRotate}}, aby jeden prst vždy otáčel pohled. Tlačítko s otazníkem ve skupině Nápověda na pásu karet zapne {{ui:interactiveHelp.title}}: klepnutí na libovolné tlačítko, pole nebo úchyt ho pak vysvětlí a stejné tlačítko nebo [[Esc]] nápovědu ukončí.
