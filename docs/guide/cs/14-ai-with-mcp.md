---
title: Modelování s AI pomocí MCP
summary: Jak AI asistent, například Claude nebo Codex, vytváří a upravuje tvary, slučuje je a pořizuje snímky v otevřeném editoru.
---

Layerling obsahuje MCP server. MCP je standard, který umožňuje AI asistentovi používat nástroje jiných programů. Claude, Codex a další klienti tak mohou pracovat v otevřeném editoru: vytvářet tvary, měnit rozměry, slučovat, odečítat, zaoblovat hrany, číst scénu a pořizovat snímky. Vy popíšete díl, AI jej sestavuje a vy můžete postup sledovat a kdykoliv zasáhnout.

Most mezi AI klientem a editorem běží **lokálně na vašem počítači**. Co však AI přečte, tedy scénu a snímky, se odesílá poskytovateli AI stejně jako ostatní vstupy v daném klientovi.

> **Důležité:** MCP je dostupné ve vývojovém serveru, který si spustíte sami. Na layerling.com a statickém hostingu je vypnuté. Vlastní server, například Docker na NASu, jej může zpřístupnit s přístupovým tokenem; viz část o instalaci na NASu níže.

## Nastavení

1. Stáhněte Layerling z [GitHubu](https://github.com/henmedia/layerling) a ve složce projektu spusťte `npm run dev`. Je potřeba Node.js. Ve Windows jeho instalaci zajistí příkaz pro rychlé spuštění z README.
2. Otevřete editor, například `http://127.0.0.1:3000/?editor=1`. Může to udělat i AI: první nástroj vyžadující editor otevře prohlížeč a počká na připojení. Funguje to pro místní instalaci; na NASu či serveru musíte editor otevřít sami. Automatické otevření vypnete nastavením `LAYERLING_MCP_OPEN_EDITOR=0` pro MCP server.
3. Připojte AI klienta k MCP serveru. Klient jej spouští příkazem `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Projekt obsahuje registraci serveru v `.mcp.json` i dovednost v `.claude/skills/layerling-mcp-skill`. Stačí otevřít jeho složku v Claude Code a požádat například: „Pomocí nástrojů Layerling MCP vypiš otevřené editory a prohlédni scénu.“

### Claude Desktop

Claude Desktop nečte konfiguraci projektu. Zapište server do jeho vlastní konfigurace podle `docs/mcp/claude-desktop-config.example.json`. Cestu ke skriptu nahraďte absolutní cestou na svém počítači. Potom Claude Desktop restartujte.

### Codex

Zkopírujte dovednost z `docs/skills/layerling-mcp-skill` do složky dovedností Codexu, zaregistrujte server podle `docs/mcp/codex-config.example.toml` a Codex restartujte.

Podrobné návody pro všechny tři klienty jsou v [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## Instalace na NASu nebo serveru

Vlastní instalace může dovolit AI klientovi ovládat otevřené editory přes síť. Výchozí stav je vypnuto, protože přístup k mostu umožňuje číst a měnit otevřené projekty. Na serveru nastavte `LAYERLING_MCP_REMOTE` na `true` a `LAYERLING_MCP_TOKEN` na tajný řetězec alespoň 16 znaků. V Dockeru patří do `environment:` souboru Compose a není nutné znovu sestavovat obraz. Otevřete editor této instalace a ponechte kartu otevřenou. Klientovi nastavte adresu a stejný token: `LAYERLING_URL=http://nas:3000` a `LAYERLING_MCP_TOKEN=<token>`.

Editory může vypisovat a ovládat jen klient se správným tokenem. Samotné stránky editoru jej nepotřebují, ale automaticky se přijímají jen místní adresy: IP adresa, název bez tečky nebo s koncovkou `.local` či `.lan`. Skutečnou doménu za reverzním proxy je nutné přidat do `LAYERLING_MCP_ALLOWED_HOSTS`. Používejte důvěryhodnou síť, mimo ni HTTPS. Podrobnosti jsou v README.

## Co AI dokáže

AI používá stejné funkce a stejné zpracování příkazů jako ruční ovládání editoru. Nové funkce Layerlingu dostávají odpovídající akce MCP. Dostupné nástroje:

| Nástroj | Funkce |
| --- | --- |
| `layerling_list_editors` | vypíše otevřené editory |
| `layerling_open_editor` | otevře editor ve výchozím prohlížeči a počká na připojení, pouze na místním počítači |
| `layerling_read_scene` | přečte scénu, výběr, jednotky a přesné rozměry objektů |
| `layerling_list_objects` | vypíše objekty s rozměry, polohou, natočením a identifikátorem |
| `layerling_select_objects` | vybere objekty |
| `layerling_delete_objects` | odstraní objekty |
| `layerling_create_shape` | vytvoří kvádr, válec, text i po oblouku, závit, ozubené kolo, těleso z náčrtu a další tvary |
| `layerling_import_file` | importuje soubor stejně jako okno importu; barevné OBJ či 3MF po barvách, víceobjektové 3MF po objektech |
| `layerling_add_font` | přidá vlastní písmo TrueType, OpenType nebo WOFF; zůstane v prohlížeči, projekt uchová jen použité znaky |
| `layerling_list_fonts` | vypíše vestavěná i vlastní písma s názvy a identifikátory |
| `layerling_import_mesh` | vloží trojúhelníkovou síť |
| `layerling_update_object` | změní rozměry, polohu, barvu, název, režim tělesa/výřezu a další vlastnosti včetně hran písmen |
| `layerling_align_objects` | vzájemně zarovná objekty |
| `layerling_scale_objects` | změní velikost o procenta společně nebo samostatně na místě |
| `layerling_lay_flat` | položí objekt vybranou plochou na podložku |
| `layerling_place_on_face` | umístí objekty na plochu jiného tělesa, i šikmou, jako klávesa C |
| `layerling_perforate_face` | vytvoří rastr otvorů na rovinné ploše; výřezy zůstanou sloučené s tělesem |
| `layerling_sweep_sketch` | protáhne obdélníkový nebo kruhový průřez podél dráhy z bodů jako jedno přesné těleso; uzavřená dráha dá prstenec |
| `layerling_push_face` | vysune rovinnou plochu ven nebo do ní vyřízne kapsu, s odsazením od okraje a poloměrem rohů; nový díl je těleso z náčrtu sloučené s tělesem |
| `layerling_mate_faces` | přiloží plochy dvou objektů proti sobě nebo do společné roviny |
| `layerling_open_group` | otevře sloučený celek k úpravě částí, i uvnitř jiného otevřeného celku |
| `layerling_close_group` | potvrdí úpravu celku nebo ji zruší |
| `layerling_group_objects` | sloučí objekty |
| `layerling_ungroup_objects` | rozloží sloučení |
| `layerling_boolean_cut` | odečte výřezy od plných těles |
| `layerling_intersect_objects` | zachová pouze společný průnik objektů |
| `layerling_hull_objects` | obalí objekty jedním vypouklým tělesem, jako by byly zataveny ve fólii (obal) |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | rozdělí tvar na jeho nespojené části, těleso z náčrtu na jedno těleso za každý obrys |
| `layerling_split_objects` | rozdělí tělesa nebo výřezy rovinou na dvě části |
| `layerling_list_edges` | vypíše skutečné CAD hrany objektu |
| `layerling_apply_edge_treatment` | zkosí nebo zaoblí vybrané hrany |
| `layerling_hollow_object` | vytvoří dutinu s rovnoměrnou stěnou |
| `layerling_cut_out` | vyřízne jedno těleso z druhého, aby k sobě pasovala: díl zůstane, kopie zvětšená o vůli se odečte od druhého tělesa |
| `layerling_offset_object` | odsadí všechny plochy tělesa pro vůli lícovaného spoje: zvětší nebo zmenší těleso, nebo přidá zvětšenou kopii jako díru |
| `layerling_list_faces` | vypíše plochy přesného tělesa |
| `layerling_delete_faces` | smaže plochy a uzavře mezeru |
| `layerling_array_objects` | opakuje objekty v řadě nebo po kružnici |
| `layerling_bundle_objects` | seskupí objekty jako Ctrl+B: společný pohyb, zachované barvy a typy, samostatná tělesa při exportu |
| `layerling_layer_text` | vytvoří vrstvenou jmenovku: písmena, širší okraje a souvislou podložku; podporuje otvor na kroužek, rohy po vrstvách, úpravu hran písmen a seznam jmen |
| `layerling_layer_icon` | vytvoří vrstvený štítek ze SVG nebo vysunutého náčrtu, s rozšířenými okraji a souvislou podložkou; umožní změnit šířku a vrstvy i rozmístit více kopií na podložku |
| `layerling_create_qr_code` | vytvoří z textu nebo webové adresy QR kód jako {{ui:shape.qrCode}} v knihovně tvarů – samotný kód, vystouplý na destičce nebo vyrytý, s opravou chyb, šířkou, výškou, klidovou zónou a na přání jako otvor; varuje, když modul klesne pod 0,8 mm |
| `layerling_reference_image` | přidá referenční obrázek z obrázku jako {{ui:import.referenceImage}}, nebo jeden posune, otočí, kalibruje (dva body obrázku a jejich skutečná vzdálenost), zprůhlední nebo zamkne - pomůcka, která se nikdy neexportuje ani netiskne |
| `layerling_measure_section` | změří tloušťku stěny, mezeru či vůli v řezu mezi body přichycenými k obrysu |
| `layerling_show_overhangs` | zapne šrafování převisů, nastaví úhel a oznámí plochu vyžadující podpěry pro každé těleso |
| `layerling_estimate_print` | odhadne objem, hmotnost a délku filamentu výběru nebo projektu, pro plný tisk i přibližně se stěnami a výplní |
| `layerling_add_reference_points` | vytvoří referenční body na středech, rozích, středech hran nebo zadaných souřadnicích |
| `layerling_list_reference_points` | vypíše referenční body s identifikátory a polohami |
| `layerling_remove_reference_points` | odstraní vybrané nebo všechny referenční body |
| `layerling_inspect_errors` | přečte poslední hlášení a chybu i zprávy z celé relace |
| `layerling_wrap_around_cylinder` | obtočí rovinné těleso, SVG nebo text kolem válce jako reliéf či rytinu |
| `layerling_texture_surface` | nanese na těleso povrchovou texturu: drážky, vroubkování, plástev nebo výstupky; později ji také změní nebo odebere |
| `layerling_simplify_mesh` | sníží počet trojúhelníků sítě na zadané procento nebo počet |
| `layerling_save_custom_shape` | uloží tělesa jako vlastní tvar na serveru nebo v prohlížeči pro další projekty |
| `layerling_list_custom_shapes` | vypíše vlastní tvary na serveru i v prohlížeči |
| `layerling_insert_custom_shape` | vloží vlastní tvar do otevřeného projektu, případně na zadanou polohu x/z |
| `layerling_delete_custom_shape` | odstraní uložený vlastní tvar; vložená tělesa zůstanou |
| `layerling_show_workplane` | skryje nebo zobrazí podložku s mřížkou, pouze změna pohledu |
| `layerling_set_section_view` | zapne pohled v řezu, aniž by skutečně rozdělil tělesa |
| `layerling_measurements` | zobrazí nebo skryje měření měřicího nástroje a vypíše je s jejich délkami, a skryje nebo zobrazí rozměry kolem výběru jako [[Q]] |
| `layerling_saved_view` | uloží aktuální pohled pod klávesu 7, 8, 9 nebo 0 a vrátí se k němu, jako Shift+klávesa a klávesa (jen pohled); nastaví také úvodní pohled nových návrhů |
| `layerling_clear_history` | trvale vymaže historii kroků zpět, vyžaduje `confirm: true` |
| `layerling_set_history_view` | zobrazí starší stav projektu bez změny současného; editační nástroje počkají na zavření historie |
| `layerling_restore_from_history` | vrátí objekty (i díly ve skupinách) ze staršího stavu do návrhu jako kopie, jako tlačítko „Vrátit do návrhu“ v historii - jeden krok, který Zpět vrátí |
| `layerling_export_section_svg` | vrátí obrysy řezu jako SVG v měřítku 1:1 ze stejných těles jako běžný export |
| `layerling_export_drawing` | vytvoří technický výkres tří pohledů v měřítku 1:1 na listu ISO s celkovými rozměry a tabulkou kruhových otvorů, jako SVG nebo PDF |
| `layerling_export_mesh` | zapíše soubor exportního okna jako STL, 3MF, OBJ, SVG (pohled shora, půdorys nebo viditelné hrany) nebo DXF pro laserové řezání ze stejných těles; na cestu v tomto počítači nebo jako base64 |
| `layerling_save_project` | uloží celý upravitelný návrh jako soubor .lyl na cestu v počítači, kde běží server MCP, bez dialogu; existující soubor se nahradí jen s `overwrite`, zapisuje se přes dočasný soubor a cíl Ctrl+S v editoru zůstává, jaký byl |
| `layerling_list_attachments` | vypíše soubory připojené k návrhu (název, typ, velikost), jak je ukazuje panel Přílohy |
| `layerling_get_attachment` | přečte jeden připojený soubor, jeho bajty jako base64, jako Stáhnout v panelu |
| `layerling_add_attachment` | připojí soubor zadaný jako base64, s kontrolami panelu; už připojený název přepíše jen s `replace` |
| `layerling_rename_attachment` | dá připojenému souboru jiný název; obsah zůstane |
| `layerling_remove_attachment` | natrvalo odebere připojený soubor; vyžaduje `confirm: true` |
| `layerling_set_workplane` | položí pracovní rovinu na plochu tělesa nebo zpět na podložku a přepíná její viditelnost |
| `layerling_capture_image` | pořídí snímek zepředu, shora, z boku, šikmo z rohu a z dalších pohledů |

AI tak může kontrolovat vlastní práci: něco vytvoří, pořídí snímek, vyhodnotí ho a návrh upraví.

## Příklad

Můžete zadat: „Vytvoř kulatou krabičku o průměru 60 mm a výšce 40 mm, se stěnou 2,5 mm a otevřeným vrškem. Přidej ploché víčko s nápisem Čaj po oblouku.“ AI vytvoří válce, v jednom udělá dutinu, na víčko umístí obloukový text a snímky zkontroluje výsledek.

> **Tip:** Zadávejte konkrétní rozměry a účel dílu, například „držák na tyč 12 mm, musí se vejít na Bambu Lab A1“. AI tak může lépe rozhodovat. Sledujte postup: kdykoliv můžete zasáhnout, protože pracujete ve stejném editoru.
