---
title: Začínáme
summary: Od prázdné plochy k prvnímu dílu pro 3D tiskárnu za pět minut, bez účtu a instalace.
---

Layerling je modelovací program pro 3D tisk, který běží přímo v prohlížeči. Díly sestavujete z jednoduchých tvarů, vytváříte v nich otvory, zaoblujete hrany a výsledek předáte sliceru. Není potřeba nic instalovat ani se registrovat. Vaše modely zůstávají na vašem počítači.

![Úvodní stránka Layerlingu: nahoře vytvoření nového projektu, pod ním uložené projekty a stručný průvodce.](shot:start-page)

## Vytvoření projektu

Otevřete [layerling.com](https://layerling.com/) a na úvodní stránce klikněte na {{ui:dashboard.createDesign}}. Editor otevře prázdnou pracovní rovinu, tedy podložku s mřížkou, na které budete modelovat.

Máte-li soubor, ve kterém chcete pokračovat, zvolte {{ui:dashboard.importGeometry}}. Otevřít lze projekty Layerlingu (`.lyl`) i soubory STL, OBJ, 3MF, STEP a SVG.

Všechny projekty se později zobrazují na úvodní stránce s náhledem. Uchovávají se v úložišti prohlížeče a ukládají automaticky po každé změně, proto zde není tlačítko pro ukládání. Jak projekty zabalit do souboru a předat dál, vysvětluje kapitola [Soubory a ukládání](chapter:files-and-saving). Pokud chceš připomínku, zapni v nastavení (ozubené kolo na pásu) {{ui:workspace.confirmTabClose}}: prohlížeč se pak zeptá, než se karta s otevřeným návrhem zavře nebo obnoví.

## Přehled editoru

![Editor se dvěma tvary na pracovní rovině. Nahoře pás nástrojů, vlevo ovládání pohledu a vpravo nastavení vybraného tvaru.](shot:editor-overview)

- **Nahoře** je pás nástrojů rozdělený podle činností: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} a {{ui:editor.group.help}}. Najetím na ikonu zobrazíte její název. Malý otazník v nastavení tvaru, knihovně nebo panelu nástroje vede přímo do příslušné části této příručky.
- **Uprostřed** leží pracovní rovina. Sem pokládáte tvary, upravujete je a sledujete výsledek.
- **Vpravo** se zobrazuje nastavení vybraného tvaru: barva, rozměry, poloha a další vlastnosti. Zadání čísla je přesnější než tažení myší.
- **Vlevo** najdete ovládání pohledu a nad ním orientační krychli. Jejich použití popisuje kapitola [Pohled a pracovní rovina](chapter:view-and-workplane).
- **Úplně nahoře** přepínáte mezi {{ui:editor.modeGeometry}} a {{ui:editor.modeSketch}}, přejmenováváte projekt a volíte jazyk a barevný motiv.

## Tlačítka kolem pracovní plochy

Najeďte myší na tlačítko a uvidíte jeho název. Pokud si nejste jistí, co tlačítko dělá, klikněte v oblasti {{ui:editor.group.help}} na {{ui:interactiveHelp.title}} ([[Shift]]+[[F1]]) a pak na tlačítko. Tady jsou ta, na která se ptá nejvíc lidí.

### Vložit

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) přidá do projektu to, co jste zkopírovali pomocí {{ui:editor.tool.copy}}. {{ui:common.duplicate}} kopíruje a vkládá v jednom kroku.

### Smazat

{{ui:common.delete}} ([[Delete]]) odstraní vybrané tvary. {{ui:editor.tool.undo}} je vrátí.

### Rozdělit sloučení

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) rozloží vybranou skupinu zpět na tvary, z nichž vznikla.

### Nastavení pracovní plochy

{{ui:editor.workspaceSettings}} otevře nastavení pracovní plochy: jednotky, velikost desky, tiskárnu, mřížku, barvy, světlo a další. Víc v kapitole [Pohled a pracovní rovina](chapter:view-and-workplane).

### Barevný motiv

{{ui:common.theme}} úplně nahoře určuje vzhled layerlingu: podle systému, světlý, tmavý nebo grafitový.

### Přejmenovat projekt

{{ui:editor.renameProject}}: tužka vedle názvu úplně nahoře. Napište nový název a stiskněte [[Enter]].

### Název projektu

Název projektu ({{ui:confirm.projectName}}) je úplně nahoře. Klikněte na něj, pište a [[Enter]] název potvrdí.

### Možnosti viditelnosti

{{ui:editor.visibilityOptions}}, šipka vedle ikony oka, obsahuje, co můžete zobrazit nebo skrýt: seznam objektů, vše skryté, poznámky a převisy tisku. Víc v kapitole [Výběr a uspořádání](chapter:select-and-arrange).

### Skrýt vybrané

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) skryje vybrané tvary. Zůstanou v projektu i v seznamu objektů; {{ui:editor.visibilityOptions}} je znovu zobrazí.

### Hledat příkazy

{{ui:palette.open}}: napište, co hledáte, nástroj, tvar nebo nastavení, a klikněte na výsledek.

### Skrýt ovládání pohledu

{{ui:camera.hide}} sbalí ovládání kamery vlevo a dá pracovní ploše víc místa; {{ui:camera.show}} ho vrátí.

### Krok přichytávání

{{ui:inspector.snapGrid}} dole ve vlastnostech je krok, ke kterému se přichytává přesouvání a změna velikosti. Vedle něj malý přepínač **mm | in** mění jednotku. Víc v kapitole [Pohled a pracovní rovina](chapter:view-and-workplane).

### Jednotka: milimetry nebo palce

Přepínač **mm | in** vedle {{ui:inspector.snapGrid}} mění jednotku, mřížku desky a krok přichytávání pro tento projekt.

### Zápatí

Dole v okně: {{ui:dashboard.sponsor}} vede na stránku, kde můžete projekt podpořit; {{ui:dashboard.userGuide}} otevře tuto příručku; {{ui:dashboard.forum}} vede na místo pro otázky, nápady a hlášení chyb (diskuse na GitHubu, v němčině fórum drucktipps3d); {{ui:editor.bugReport}} vytvoří ZIP pro hlášení chyby; {{ui:dashboard.projectOnGitHub}} vede na projekt na GitHubu a číslo verze otevře poznámky k vydání. Odkazy na provozovatele a ochranu osobních údajů patří tomu, kdo provozuje kopii layerlingu, kterou používáte.

## První díl

Jako příklad vytvoříme kvádr s otvorem.

1. V pásu nástrojů klikněte na {{ui:editor.addShape}} a vyberte {{ui:shape.box}}. Tvar bude sledovat ukazatel myši. Kliknutím ho položte na pracovní rovinu.
2. Vpravo nastavte rozměry, například délku 40 mm, šířku 40 mm a výšku 20 mm.
3. Stejným způsobem umístěte doprostřed {{ui:shape.cylinder}} o průměru 14 mm a výšce 30 mm. Musí být vyšší než kvádr, aby jím prošel skrz.
4. Vyberte válec a vpravo zvolte {{ui:inspector.hole}}. Zprůhlední: plné těleso se změnilo na nástroj pro odebírání materiálu.
5. Vyberte oba tvary a klikněte na {{ui:editor.tool.group}}. V kvádru vznikne otvor.

![Válec je nastavený jako výřez a vyčnívá nad kvádr.](shot:hole-before)

![Po sloučení vznikne kvádr s otvorem.](shot:hole-after)

Takto se vytvářejí otvory, drážky i kapsy. Podrobnosti najdete v kapitole [Tělesa a výřezy](chapter:solids-and-holes).

## Novinky od poslední návštěvy

Po aktualizaci se na úvodní stránce zobrazí karta s novinkami od vaší poslední návštěvy. Obsahuje jednotlivá vydání od nejnovějšího. Po delší nepřítomnosti můžete uvnitř karty posouvat seznam. Volba {{ui:whatsNew.earlier}} přidá i starší vydání. Kartu zavřete přes {{ui:whatsNew.dismiss}}; znovu se objeví až po další aktualizaci. Poslední novinky lze kdykoliv otevřít pomocí {{ui:whatsNew.footerLink}} v zápatí úvodní stránky. Poslední zobrazenou verzi si pamatuje prohlížeč a žádné vaše údaje se přitom neodesílají.

Ve vlastní instalaci na počítači nebo serveru obsahuje oznámení o dostupné aktualizaci tlačítko {{ui:update.previewShow}}. Zobrazí změny ještě před instalací. Seznam se načte z GitHubu teprve po stisknutí tlačítka.

## Od modelu k tisku

Hotový díl stáhněte přes {{ui:editor.export}} ve formátu STL nebo 3MF. Otevřete ho ve sliceru, například Bambu Studio, PrusaSlicer, OrcaSlicer nebo Cura. Pokud v nastavení vyberete svou tiskárnu, už během modelování uvidíte, zda se díl vejde na podložku. Více v kapitole [Příprava pro tisk](chapter:printing).

> **Tip:** Pokud znáte Tinkercad, rychle se zorientujete. Podložka, tvary, plná tělesa a výřezy, slučování, zarovnávání i zrcadlení fungují velmi podobně. Navíc máte zejména zkosení a zaoblení hran, vytváření dutin, závity a náčrty. Můžete si přenést i vlastní návrhy z Tinkercadu, viz [Soubory, ukládání a sdílení](chapter:files-and-saving).
