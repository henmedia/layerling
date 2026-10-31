---
title: Gradnja z umetno inteligenco (MCP)
summary: Kako pomočnik z umetno inteligenco, kot je Claude ali Codex, v tvojem odprtem urejevalniku ustvarja, spreminja in združuje oblike ter posname slike pogleda.
---

layerling prinaša strežnik MCP. MCP je standard, prek katerega lahko pomočnik z umetno inteligenco uporablja orodja v drugih programih. S tem odjemalec z umetno inteligenco, kot je Claude ali Codex, vidi odprt zavihek urejevalnika in v njem dela: ustvarja oblike, spreminja mere, združuje v skupine, reže, zaokroža robove, bere prizor in snema slike pogleda. Ti opišeš del, umetna inteligenca ga zgradi, ti gledaš in kadarkoli posežeš vmes.

Most med odjemalcem z umetno inteligenco in urejevalnikom teče **lokalno na tvojem računalniku**. Vseeno upoštevaj: kar umetna inteligenca prebere, torej prizor in slike pogleda, gre ponudniku tvojega odjemalca z umetno inteligenco, tako kot vsak drug vnos tam.

> **Pomembno:** Most MCP je v razvojnem strežniku, ki ga sam zaženeš na svojem računalniku. Na layerling.com in v namestitvah s statičnim gostovanjem je izklopljen. Kopija, ki jo upravljaš sam, na primer slika Docker na NAS, ga lahko vklopi z dostopnim ključem; glej »Kopija na NAS ali strežniku« spodaj.

## Nastavitev

1. Prenesi layerling z [GitHuba](https://github.com/henmedia/layerling) in ga v mapi projekta zaženi z `npm run dev`. Nameščen mora biti Node.js. V Windowsih to opravi hitra vrstica za začetek v README.
2. Odpri zavihek urejevalnika, na primer `http://127.0.0.1:3000/?editor=1`. To lahko prepustiš umetni inteligenci: ko urejevalnik ni odprt, prvo orodje, ki ga potrebuje, zažene brskalnik z urejevalnikom in počaka, da se poveže. To velja za layerling na tvojem računalniku; kopija na NAS-u ali strežniku zahteva, da urejevalnik odpreš sam. Z `LAYERLING_MCP_OPEN_EDITOR=0` za strežnik MCP to izklopiš.
3. Poveži svojega odjemalca z umetno inteligenco s strežnikom MCP. Odjemalec ga zažene sam z `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Nič ni treba nameščati: projekt prinaša `.mcp.json`, ki vpiše strežnik, in veščino v `.claude/skills/layerling-mcp-skill`. Odpri mapo layerling v Claude Code in na primer prosi: »Uporabi orodja layerling MCP, naštej moje odprte urejevalnike in poglej prizor.«

### Claude Desktop

Claude Desktop ne bere datotek projekta. Strežnik vpiši v njegovo lastno konfiguracijo. Za predlogo služi `docs/mcp/claude-desktop-config.example.json` v projektu, v kateri pot do skripte zamenjaš z absolutno potjo na svojem računalniku. Potem Claude Desktop znova zaženi.

### Codex

Veščino iz `docs/skills/layerling-mcp-skill` kopiraj v svojo mapo veščin Codex, strežnik vpiši v svojo konfiguracijo Codex po `docs/mcp/codex-config.example.toml` in Codex znova zaženi.

Podrobna navodila za vse tri so v [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.de.md#layerling-mcp-skill).

## Kopija na NAS ali strežniku

Kopija, ki jo upravljaš sam, lahko dovoli odjemalcu z umetno inteligenco, da njene odprte urejevalnike upravlja prek omrežja. To je privzeto izklopljeno, saj lahko kdor upravlja most, bere in spreminja odprte načrte. Na strežniku nastavi `LAYERLING_MCP_REMOTE` na `true` in `LAYERLING_MCP_TOKEN` na skrivnost z vsaj 16 znaki (pri sliki Docker pod `environment:` v datoteki Compose; nova gradnja ni potrebna). Odpri zavihek urejevalnika te kopije in ga pusti odprtega, odjemalcu MCP pa daj naslov in isti ključ: `LAYERLING_URL=http://nas:3000` in `LAYERLING_MCP_TOKEN=<ključ>`.

Samo odjemalec s ključem lahko našteje ali upravlja urejevalnike. Strani urejevalnika ga ne potrebujejo, štejejo pa samo pod naslovom ali imenom, ki ga lahko uporablja samo tvoje lastno omrežje (naslov IP, ime brez pike ali tako na `.local` ali `.lan`); prava domena za povratnim posrednikom pride v `LAYERLING_MCP_ALLOWED_HOSTS`. Uporabljaj ga v omrežju, ki mu zaupaš, in HTTPS čez to. Podrobnosti so v README.

## Kaj zna umetna inteligenca

Umetna inteligenca dela z istimi funkcijami kot ti, teče po isti poti kot tvoje upravljanje v urejevalniku. Nove funkcije programa layerling dobijo svoje dejanje MCP kar zraven. Orodja:

| Orodje | Kaj naredi |
| --- | --- |
| `layerling_open_editor` | odpre nov zavihek urejevalnika v privzetem brskalniku in počaka, da se poveže (samo na tvojem računalniku) |
| `layerling_list_editors` | našteje odprte zavihke urejevalnika |
| `layerling_read_scene` | prebere prizor, izbor, enote in natančne mere vseh objektov |
| `layerling_list_objects` | našteje vse objekte z merami, lego, zasukom in oznako |
| `layerling_select_objects` | izbere objekte |
| `layerling_delete_objects` | izbriše objekte |
| `layerling_create_shape` | ustvari obliko: kvader, valj, besedilo (tudi ukrivljeno), navoj, zobnik, skicirano telo in vse druge |
| `layerling_import_file` | uvozi datoteko kot okno za uvoz, barvni OBJ ali 3MF kot eno telo na barvo, 3MF z več objekti kot eno telo na objekt |
| `layerling_add_font` | doda lastno pisavo za besedilo, iz datoteke TrueType, OpenType ali WOFF; ostane v brskalniku, načrt obdrži samo uporabljene črke |
| `layerling_list_fonts` | našteje priložene in lastne pisave, z oznako in imenom |
| `layerling_import_mesh` | prinese mrežo trikotnikov v načrt |
| `layerling_update_object` | spremeni mere, lego, barvo, ime, telo ali luknjo in vse, kar oblika še ima, pri besedilu tudi rob črk |
| `layerling_align_objects` | poravna objekte drug z drugim |
| `layerling_scale_objects` | poveča objekte za odstotno vrednost, skupaj ali vsak zase |
| `layerling_lay_flat` | položi objekt s ploskvijo na ploščo |
| `layerling_place_on_face` | postavi objekte na ploskev drugega, tudi poševno, kot tipka C |
| `layerling_perforate_face` | vreže vzorec lukenj v ravno ploskev, luknje ostanejo kot luknje, združene v skupino s telesom |
| `layerling_sweep_sketch` | povleče pravokoten ali okrogel prerez vzdolž poti iz točk kot eno natančno telo; sklenjena pot da obroč |
| `layerling_push_face` | ravno ploskev potegne navzven ali vanjo izreže žep, z odmikom od roba in polmerom vogalov; nov del je telo iz skice, združeno v skupino s telesom |
| `layerling_mate_faces` | položi ploskev enega objekta na ploskev drugega, drugo proti drugemu ali poravnano |
| `layerling_open_group` | odpre skupino, da so njeni deli posamezno spremenljivi, tudi skupino v odprti |
| `layerling_close_group` | jo spet zapre (»Končano«) ali prekine |
| `layerling_group_objects` | združi objekte v skupino |
| `layerling_ungroup_objects` | razpusti skupine |
| `layerling_boolean_cut` | reže telesa z luknjami |
| `layerling_intersect_objects` | obdrži samo to, kar imajo objekti skupnega (presek) |
| `layerling_hull_objects` | ovije objekte v eno izbočeno telo, kot bi jih skrčili v folijo (ovojnica) |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_make_lid` | makes a lid for a body open at the top: pushed in, over the top or flat, with the fit you choose (Lid) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | razstavi obliko z ločenimi deli, telo iz skice na eno telo za vsak obris |
| `layerling_split_objects` | razdeli telesa ali luknje z ravnino na dva dela |
| `layerling_list_edges` | našteje prave robove CAD objekta |
| `layerling_apply_edge_treatment` | posname ali zaobli izbrane robove |
| `layerling_hollow_object` | izdolbe telo z enakomerno steno |
| `layerling_cut_out` | izreže eno telo iz drugega, da si ustrezata: del ostane, kopija, povečana za zračnost, se odšteje od drugega telesa |
| `layerling_offset_object` | odmakne vse ploskve telesa za zračnost nasedanja: telo poveča ali zmanjša ali doda povečano kopijo kot luknjo ali premakne le stranice |
| `layerling_list_faces` | našteje ploskve natančnega telesa |
| `layerling_delete_faces` | izbriše ploskve in zapre vrzel |
| `layerling_array_objects` | pomnoži v vrsti ali na krogu |
| `layerling_bundle_objects` | poveže objekte v sveženj kot Ctrl+B: premikajo se skupaj, obdržijo barvo in vrsto ter gredo posamezno v izvoz |
| `layerling_layer_text` | iz besedila naredi sklad plasti za večbarvni tisk (črke, širši robovi, plošča brez lukenj) ali sklad zgradi znova, z luknjo za obesek za ključe, vogali za vsako plast in zaobljenim ali poševno odrezanim robom črk; s seznamom imen en napis na ime |
| `layerling_layer_icon` | iz simbola SVG (besedilo datoteke ali iztisnjeno telo skice) naredi simbolno oznako v plasteh za večbarvni tisk – simbol, širši robovi, plošča brez lukenj – ali jo zgradi znova z novo širino ali plastmi; s številom napolni ploščo s kopijami |
| `layerling_create_qr_code` | iz besedila ali spletnega naslova naredi kodo QR kot {{ui:shape.qrCode}} v knjižnici oblik – samo kodo, dvignjeno na plošči ali vgravirano, s popravkom napak, širino, višino, tihim območjem in po želji kot luknjo; opozori, ko je modul manjši od 0,8 mm |
| `layerling_reference_image` | doda referenčno sliko iz slike kot {{ui:import.referenceImage}} ali eno premakne, zavrti, umeri (dve točki slike in njuna prava razdalja), zbledi ali zaklene - pomoč, ki se nikoli ne izvozi ali natisne; `trace` iz temnega ali svetlega dela naredi telo skice, ki stoji na njej |
| `layerling_measure_section` | meri na ravnini prereza med dvema točkama, ki se zaskočita na obris – debeline sten, reže, prileganja |
| `layerling_show_overhangs` | vklopi ali izklopi šrafuro previsov, nastavi kot in za vsako telo navede ploskev, ki bi potrebovala podpore |
| `layerling_estimate_print` | oceni prostornino, težo in filament za izbor ali celoten načrt: za polno telo in kot grobo oceno s stenami in polnilom kot v oknu za izvoz |
| `layerling_add_reference_points` | postavi referenčne točke - na sredine, vogale ali sredine robov objektov ali na natančna mesta -, na katere se oblike zaskočijo |
| `layerling_list_reference_points` | našteje referenčne točke z oznako in lego |
| `layerling_remove_reference_points` | izbriše referenčne točke po oznaki ali vse |
| `layerling_inspect_errors` | pokaže zadnje sporočilo in zadnjo napako, poleg tega sporočila in napake seje |
| `layerling_wrap_around_cylinder` | ovije ležeče telo, na primer SVG ali besedilo, okoli valja, navzven ali kot gravuro navznotraj |
| `layerling_texture_surface` | nanese na telo površinsko teksturo: utore, narebričenje, satovje ali izbokline, za boljši oprijem ali za videz, pozneje pa jo tudi spremeni ali odstrani |
| `layerling_simplify_mesh` | zmanjša število trikotnikov uvožene mreže, na delež v odstotkih ali na število trikotnikov |
| `layerling_save_custom_shape` | shrani telesa kot lastno obliko, na strežniku ali v brskalniku, da jih vstavi v druge načrte |
| `layerling_list_custom_shapes` | našteje lastne oblike na strežniku in v brskalniku |
| `layerling_insert_custom_shape` | vstavi lastno obliko v odprti načrt, po želji na mesto x/z |
| `layerling_delete_custom_shape` | odstrani lastno obliko; vstavljena telesa ostanejo |
| `layerling_show_workplane` | skrije ploščo z njeno mrežo in jo spet prikaže, na primer za sliko spodnje strani (samo pogled) |
| `layerling_set_section_view` | prereže pogled vzdolž ravnine, da se vidi notranjost (samo pogled, nič se ne razreže) |
| `layerling_measurements` | prikaže ali skrije meritve merilnega traku in jih našteje z njihovimi dolžinami, ter skrije ali prikaže mere okoli izbora kot [[Q]] |
| `layerling_saved_view` | shrani trenutni pogled pod tipko 7, 8, 9 ali 0 in se vrne nanj, kot Shift+tipka in tipka (samo pogled); nastavi tudi začetni pogled novih osnutkov |
| `layerling_clear_history` | za vedno izbriše vse korake razveljavitve, kot gumb »Izbriši zgodovino« v pogledu zgodovine; potrebuje `confirm: true` |
| `layerling_set_history_view` | pogleda nazaj na prejšnje stanje projekta, kot pogled zgodovine (pravi načrt ostane nedotaknjen; orodja, ki spreminjajo, počakajo, da se zapre) |
| `layerling_restore_from_history` | vrne objekte (tudi dele v skupinah) iz prejšnjega stanja v načrt kot kopije, kot »Vrni v načrt« v pogledu zgodovine - en korak, ki ga razveljavitev vzame nazaj |
| `layerling_export_drawing` | naredi delavniško risbo izvoza »2D«: trije pogledi v merilu 1:1 na listu ISO s skupnimi merami in tabelo okroglih izvrtin, kot besedilo SVG ali PDF |
| `layerling_export_mesh` | zapiše datoteko izvoznega okna kot STL, 3MF, OBJ, SVG (tloris, odtis ali vidni robovi) ali DXF za lasersko rezanje iz istih teles; na pot v tem računalniku ali kot base64 |
| `layerling_save_project` | shrani celoten urejevalni načrt kot datoteko .lyl na pot v računalniku, na katerem teče strežnik MCP, brez pogovornega okna; obstoječa datoteka se zamenja le z `overwrite`, piše se prek začasne datoteke, cilj Ctrl+S v urejevalniku pa ostane, kakršen je bil |
| `layerling_list_attachments` | našteje datoteke, priložene načrtu (ime, vrsta, velikost), kot jih kaže plošča Priloge |
| `layerling_get_attachment` | prebere eno priloženo datoteko, njene bajte kot base64, kot Prenesi na plošči |
| `layerling_add_attachment` | priloži datoteko, podano kot base64, s preverjanji plošče; že priloženo ime prepiše le z `replace` |
| `layerling_rename_attachment` | priloženi datoteki da drugo ime; vsebina ostane |
| `layerling_remove_attachment` | priloženo datoteko trajno odstrani; zahteva `confirm: true` |
| `layerling_export_section_svg` | izda obrise na ravnini prereza kot SVG v merilu 1:1, iz istih teles kot izvoz |
| `layerling_sketch_from_section` | naredi skico iz obrisov na ravnini prereza, ki leži na prerezu: odprto v urejevalniku za spreminjanje ali takoj zgrajeno v telo podane višine |
| `layerling_set_workplane` | položi delovno ravnino na stran telesa, jo ponastavi na osnovno ploščo ali jo skrije in prikaže |
| `layerling_capture_image` | posname sliko pogleda, od spredaj, zgoraj, s strani, poševno z vogala in več |

Umetna inteligenca se tako lahko sama preverja: nekaj ustvari, posname sliko, pogleda in izboljša.

## Primer

Rečeš: »Zgradi mi okroglo škatlo s premerom 60 mm, višino 40 mm in steno 2,5 mm, zgoraj odprto, poleg tega ploski pokrov, na katerem je v loku napisano ›Čaj‹.« Umetna inteligenca ustvari valje, enega izdolbe, ukrivljeno besedilo postavi na pokrov in na koncu posname slike, da vidi, ali ustreza.

> **Namig:** Umetni inteligenci daj konkretne mere in ji povej, čemu je del namenjen (»držalo za palico 12 mm, ustreza Bambu Lab A1«). Potem sprejema smiselnejše odločitve. In ji pri gradnji gledaj: kadarkoli lahko posežeš sam, saj je to isti urejevalnik.
