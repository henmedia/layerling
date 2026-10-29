---
title: Építés MI-vel (MCP)
summary: Hogyan hoz létre és módosít alakzatokat egy MI-asszisztens, például a Claude vagy a Codex, hogyan csoportosítja őket, és hogyan készít képeket a nézetről a nyitott szerkesztődben.
---

A layerling egy MCP-szerverrel érkezik. Az MCP egy szabvány, amelyen keresztül egy MI-asszisztens más programok eszközeit használhatja. Ennek segítségével egy MI-kliens, például a Claude vagy a Codex, látja a nyitott szerkesztőlapot, és dolgozik benne: alakzatokat hoz létre, méreteket változtat, csoportosít, vág, éleket kerekít, kiolvassa a jelenetet, és képeket készít a nézetről. Te leírod az alkatrészt, az MI megépíti, te nézed, és bármikor közbeléphetsz.

Az MI-kliens és a szerkesztő közötti híd **helyben, a számítógépeden** fut. Ne feledd azonban: amit az MI beolvas, vagyis a jelenet és a nézetről készült képek, az az MI-kliensed szolgáltatójához kerül, mint ott bármely más bemenet.

> **Fontos:** Az MCP-híd abban a fejlesztői szerverben létezik, amelyet magad indítasz el a számítógépeden. A layerling.com-on és a statikus tárhelyű telepítésekben ki van kapcsolva. Egy magad üzemeltetett példány, például a NAS-on futó Docker-image, hozzáférési tokennel bekapcsolhatja; lásd lent az „Egy példány NAS-on vagy szerveren” részt.

## Beállítás

1. Töltsd le a layerlinget a [GitHubról](https://github.com/henmedia/layerling), és indítsd el a projekt mappájában az `npm run dev` paranccsal. Ehhez telepítve kell lennie a Node.js-nek. Windowson a README gyorsindító sora ezt elintézi.
2. Nyiss meg egy szerkesztőlapot, például a `http://127.0.0.1:3000/?editor=1` címet. Ezt az MI-re is bízhatod: ha nincs nyitott szerkesztő, az első eszköz, amelynek kell egy, elindítja a böngésződet egy szerkesztővel, és megvárja, amíg csatlakozik. Ez a saját számítógépeden futó layerlingnél működik; egy NAS-on vagy szerveren lévő példánynál a szerkesztőt neked kell megnyitnod. Az MCP-szervernél a `LAYERLING_MCP_OPEN_EDITOR=0` beállítással kikapcsolhatod.
3. Csatlakoztasd az MI-kliensedet az MCP-szerverhez. A kliens maga indítja el a `node scripts/layerling-mcp-server.mjs` paranccsal.

### Claude Code

Semmit sem kell telepíteni: a projekt hoz egy `.mcp.json` fájlt, amely regisztrálja a szervert, és a skillt a `.claude/skills/layerling-mcp-skill` alatt. Nyisd meg a layerling mappáját a Claude Code-ban, és kérd például ezt: „Use the layerling MCP tools to list my open editors and inspect the scene.”

### Claude Desktop

A Claude Desktop nem olvassa a projektfájlokat. Add meg a szervert a saját konfigurációjában. Sablonként használd a projektben lévő `docs/mcp/claude-desktop-config.example.json` fájlt, a szkript elérési útját a számítógépeden lévő abszolút útvonalra cserélve. Ezután indítsd újra a Claude Desktopot.

### Codex

Másold a skillt a `docs/skills/layerling-mcp-skill` mappából a Codex skills mappájába, add meg a szervert a Codex konfigurációjában a `docs/mcp/codex-config.example.toml` alapján, és indítsd újra a Codexet.

Mindhárom részletes leírása a [GitHubon lévő README-ben](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill) található.

## Egy példány NAS-on vagy szerveren

Egy magad üzemeltetett példány megengedheti, hogy egy MI-kliens a hálózaton keresztül vezérelje a nyitott szerkesztőit. Ez alapból ki van kapcsolva, mert aki vezérelheti a hidat, az olvashatja és módosíthatja a nyitott terveket. A szerveren állítsd a `LAYERLING_MCP_REMOTE` értékét `true`-ra, a `LAYERLING_MCP_TOKEN` értékét pedig egy legalább 16 karakteres titokra (a Docker-image-nél a compose fájl `environment:` részében; nem kell újraépíteni). Nyiss meg egy szerkesztőlapot ezen a példányon, és tartsd nyitva, az MCP-kliensnek pedig add meg a címet és ugyanazt a tokent: `LAYERLING_URL=http://nas:3000` és `LAYERLING_MCP_TOKEN=<a token>`.

Csak egy tokennel rendelkező kliens sorolhatja fel vagy vezérelheti a szerkesztőket. A szerkesztőoldalaknak nem kell token, de csak olyan címen vagy néven számítanak, amelyet kizárólag a saját hálózatod használhat (IP-cím, pont nélküli név, vagy `.local` vagy `.lan` végződésű név); egy fordított proxy mögötti valódi domain a `LAYERLING_MCP_ALLOWED_HOSTS` értékébe kerül. Megbízható hálózaton használd, azon túl pedig HTTPS-sel. A részletek a README-ben vannak.

## Mit tud az MI

Az MI ugyanazokkal a funkciókkal dolgozik, mint te, ugyanazon az úton, mint a szerkesztőben végzett műveleteid. Az új layerling-funkciók azonnal megkapják az MCP-műveletüket. Az eszközök:

| Eszköz | Mit csinál |
| --- | --- |
| `layerling_list_editors` | felsorolja a nyitott szerkesztőlapokat |
| `layerling_open_editor` | új szerkesztőlapot nyit az alapértelmezett böngésződben, és megvárja, amíg csatlakozik (csak a saját számítógépeden) |
| `layerling_read_scene` | beolvassa a jelenetet, a kijelölést, a mértékegységeket és az összes objektum pontos méreteit |
| `layerling_list_objects` | felsorolja az összes objektumot méretekkel, helyzettel, elforgatással és azonosítóval |
| `layerling_select_objects` | objektumokat jelöl ki |
| `layerling_delete_objects` | objektumokat töröl |
| `layerling_create_shape` | alakzatot hoz létre: dobozt, hengert, szöveget (íveset is), menetet, fogaskereket, vázlattestet és az összes többit |
| `layerling_import_file` | fájlt importál, ahogy az importálási ablak: egy színes OBJ-t vagy 3MF-et színenként egy testként, egy több objektumot tartalmazó 3MF-et objektumonként egy testként |
| `layerling_add_font` | saját betűtípust ad hozzá szöveghez egy TrueType, OpenType vagy WOFF fájlból; a böngészőben marad, egy terv csak az általa használt betűket tartja meg |
| `layerling_list_fonts` | felsorolja a beépített és a saját betűtípusokat azonosítóval és névvel |
| `layerling_import_mesh` | háromszöghálót hoz be a tervbe |
| `layerling_update_object` | méreteket, helyzetet, színt, nevet, tömör vagy lyuk állapotot és minden mást módosít, ami az alakzathoz tartozik, egy szöveg betűélét is |
| `layerling_align_objects` | objektumokat igazít egymáshoz |
| `layerling_scale_objects` | objektumokat méretez százalékban, együtt vagy mindegyiket a helyén |
| `layerling_lay_flat` | egy objektumot az egyik lapjával a tárgyasztalra fektet |
| `layerling_place_on_face` | objektumokat tesz le egy másik objektum lapjára, a ferdékre is, mint a C billentyű |
| `layerling_perforate_face` | lyukmintát vág egy sík lapba; a lyukak a testtel csoportosított lyukak maradnak |
| `layerling_sweep_sketch` | téglalap vagy kör keresztmetszetet húz végig egy pontokból álló pályán egyetlen pontos testként; zárt pálya gyűrűt ad |
| `layerling_push_face` | kihúz egy sík lapot, vagy zsebet vág bele, a lap szélétől mért távolsággal és sarokrádiusszal; az új rész a testtel csoportosított vázlattest |
| `layerling_mate_faces` | egy objektum lapját egy másik lapjához illeszti, laptól lapig vagy egy síkba |
| `layerling_open_group` | megnyit egy csoportot, hogy a részei egyenként módosíthatók legyenek, egy nyitott csoporton belüli csoportot is |
| `layerling_close_group` | újra bezárja („Kész”) vagy megszakítja |
| `layerling_group_objects` | objektumokat csoportosít |
| `layerling_ungroup_objects` | csoportokat bont fel |
| `layerling_boolean_cut` | tömör testeket vág lyukakkal |
| `layerling_intersect_objects` | csak azt tartja meg, ami az objektumokban közös (Metszet) |
| `layerling_hull_objects` | egyetlen domború testbe burkolja az objektumokat, mintha zsugorfóliába csomagolnák (Burok) |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | egy alakzatot a különálló részeire bont, a vázlattestet körvonalanként egy testre |
| `layerling_split_objects` | tömör testeket vagy lyukakat vág ketté egy síkkal |
| `layerling_list_edges` | felsorolja egy objektum valódi CAD-éleit |
| `layerling_apply_edge_treatment` | kiválasztott éleket tör le vagy kerekít le |
| `layerling_hollow_object` | egyenletes fallal üregel ki egy testet |
| `layerling_cut_out` | kivág egy testet egy másikból, hogy illeszkedjenek: az alkatrész marad, a hézaggal megnövelt másolatot kivonja a másik testből |
| `layerling_offset_object` | eltolja a test minden lapját az illesztés játékához: nagyítja vagy kicsinyíti, vagy lyukként adja hozzá a megnagyobbított másolatot |
| `layerling_list_faces` | felsorolja egy pontos test lapjait |
| `layerling_delete_faces` | lapokat töröl, és bezárja a rést |
| `layerling_array_objects` | sorban vagy körön sokszoroz |
| `layerling_bundle_objects` | objektumokat fog kötegbe, mint a Ctrl+B: együtt mozognak, megtartják a színüket és a fajtájukat, és exportáláskor külön kerülnek ki |
| `layerling_layer_text` | egy szöveget rétegekből álló kötegbe alakít többszínű nyomtatáshoz (betűk, szélesebb szegélyek, egy lyukak nélküli lap), vagy újraépít egy köteget, kulcstartólyukkal, rétegenkénti sarkokkal és lekerekített vagy letört betűéllel; névlistával nevenként egy címkét készít |
| `layerling_layer_icon` | egy SVG-ikont (a fájl szövegét vagy egy kihúzott vázlattestet) rétegekből álló ikoncímkévé alakít többszínű nyomtatáshoz – az ikon, szélesebb szegélyek, egy lyukak nélküli lap –, vagy új szélességgel vagy rétegekkel újraépít egyet; darabszámmal másolatokkal tölti meg a tárgyasztalt |
| `layerling_create_qr_code` | szövegből vagy webcímből QR-kódot készít, mint az alakzatkönyvtár {{ui:shape.qrCode}} eleme – csak a kódot, lapon kiemelve vagy gravírozva, hibajavítással, szélességgel, magassággal, csendes zónával és kérésre üregként; figyelmeztet, ha egy modul 0,8 mm alá kerül |
| `layerling_reference_image` | képből mintaképet ad hozzá, mint a {{ui:import.referenceImage}}, vagy egyet mozgat, forgat, kalibrál (a kép két pontja és valódi távolságuk), halványít vagy zárol - segédlet, amely sosem exportálódik és sosem nyomtatódik |
| `layerling_measure_section` | egy vágósíkon két, a körvonalhoz illeszkedő pont között mér – falvastagság, rések, illesztések |
| `layerling_show_overhangs` | be- vagy kikapcsolja a túlnyúlások sraffozását, beállítja a szöget, és minden testnél megadja azt a területet, amelyhez támasz kellene |
| `layerling_estimate_print` | megbecsüli a térfogatot, a tömeget és a filamentet a kijelöléshez vagy a teljes tervhez: tömör testre, és durva becslésként falakkal és kitöltéssel, mint az exportálási ablak |
| `layerling_add_reference_points` | referenciapontokat jelöl meg – objektumok középpontján, sarkain vagy élfelezőin, vagy pontos helyeken –, amelyekhez az alakzatok illeszkednek |
| `layerling_list_reference_points` | felsorolja a referenciapontokat az azonosítójukkal és a helyzetükkel |
| `layerling_remove_reference_points` | azonosító alapján vagy mindet törli a referenciapontokat |
| `layerling_inspect_errors` | megmutatja az utolsó üzenetet és az utolsó hibát, valamint a munkamenet üzeneteit és hibáit |
| `layerling_wrap_around_cylinder` | egy laposan fekvő testet, például egy SVG-t vagy szöveget egy henger köré teker, kifelé vagy befelé gravírozásként |
| `layerling_texture_surface` | felületi mintázatot visz fel egy testre: hornyokat, recézést, méhsejtet vagy bütyköket, a jobb fogásért vagy a látványért, és később módosítja vagy eltávolítja |
| `layerling_simplify_mesh` | csökkenti egy importált háló háromszögeinek számát, százalékos arányra vagy egy háromszögszámra |
| `layerling_save_custom_shape` | testeket őriz meg saját alakzatként, a szerveren vagy a böngészőben, hogy más tervekbe beilleszthetők legyenek |
| `layerling_list_custom_shapes` | felsorolja a szerveren és a böngészőben lévő saját alakzatokat |
| `layerling_insert_custom_shape` | beilleszt egy saját alakzatot a nyitott tervbe, ha kell, egy x/z helyre |
| `layerling_delete_custom_shape` | eltávolít egy saját alakzatot; a beillesztett testek megmaradnak |
| `layerling_show_workplane` | elrejti és megmutatja a tárgyasztalt a rácsával, például az alsó oldalról készülő képhez (csak a nézet) |
| `layerling_set_section_view` | egy sík mentén felnyitja a nézetet, hogy belenézz (csak a nézet, semmi sem vágódik szét) |
| `layerling_measurements` | megjeleníti vagy elrejti a mérőszalag méréseit, és felsorolja őket a hosszukkal, és elrejti vagy megjeleníti a kijelölés körüli méreteket, mint a [[Q]] |
| `layerling_saved_view` | elmenti az aktuális nézetet a 7, 8, 9 vagy 0 billentyű alá, és visszaállítja, mint a Shift+billentyű és a billentyű (csak a nézet); az új tervek indulási nézetét is beállítja |
| `layerling_clear_history` | véglegesen töröl minden visszavonási lépést, ahogy az előzménynézet „Előzmények törlése” gombja; `confirm: true` kell hozzá |
| `layerling_set_history_view` | visszatekint a projekt egy korábbi állapotára, mint az előzménynézet (a valódi terv érintetlen marad; a módosító eszközök várnak, amíg bezárul) |
| `layerling_restore_from_history` | objektumokat (csoportokon belüli alkatrészeket is) hoz vissza másolatként egy korábbi állapotból a tervbe, mint az előzménynézet visszahozó gombja - egy lépés, amelyet a visszavonás visszavesz |
| `layerling_export_section_svg` | 1:1 méretarányú SVG-ként adja vissza egy vágósík körvonalait, ugyanazokból a testekből, mint az export |
| `layerling_export_drawing` | elkészíti a „2D” export műhelyrajzát: három nézet 1:1 méretarányban ISO lapon, befoglaló méretekkel és a kerek furatok táblázatával, SVG-szövegként vagy PDF-ként |
| `layerling_export_mesh` | az exportablak fájlját STL, 3MF, OBJ, SVG (felülnézet, felfekvési felület vagy látható élek) vagy lézervágáshoz DXF formában írja ki ugyanazokból a testekből; ezen a számítógépen megadott helyre vagy base64-ként |
| `layerling_save_project` | elmenti a teljes szerkeszthető tervet .lyl fájlként egy útvonalra azon a gépen, amelyen az MCP-kiszolgáló fut, párbeszédablak nélkül; meglévő fájlt csak az `overwrite` cserél le, ideiglenes fájlon át íródik, és a Ctrl+S célja a szerkesztőben változatlan marad |
| `layerling_list_attachments` | felsorolja a tervhez csatolt fájlokat (név, típus, méret), ahogy az Attachments panel mutatja őket |
| `layerling_get_attachment` | beolvas egy csatolt fájlt, a bájtjait base64-ként, mint a panel Download gombja |
| `layerling_add_attachment` | csatol egy base64-ként megadott fájlt a panel ellenőrzéseivel; a már csatolt nevet csak `replace` mellett írja felül |
| `layerling_rename_attachment` | más nevet ad egy csatolt fájlnak; a tartalma marad |
| `layerling_remove_attachment` | véglegesen eltávolít egy csatolt fájlt; `confirm: true` kell hozzá |
| `layerling_set_workplane` | egy test oldalára vagy vissza az alaplapra teszi a munkasíkot, és elrejti vagy megmutatja |
| `layerling_capture_image` | képet készít a nézetről: elölről, felülről, oldalról, ferdén egy sarokból és még sok másból |

Így az MI ellenőrizni tudja magát: létrehoz valamit, képet készít, megnézi, és javít.

## Egy példa

Ezt mondod: „Építs nekem egy 60 mm átmérőjű, 40 mm magas kerek dobozt 2,5 mm-es fallal, felül nyitva, és egy lapos fedelet, rajta ívben a »Tea« felirattal.” Az MI létrehozza a hengereket, kiüregeli az egyiket, a fedélre teszi az íves szöveget, a végén pedig képeket készít, hogy lássa, illeszkedik-e.

> **Tipp:** Adj az MI-nek konkrét méreteket, és mondd meg, mire való az alkatrész („tartó egy 12 mm-es rúdhoz, férjen el egy Bambu Lab A1-en”). Így értelmesebb döntéseket hoz. És figyeld, ahogy épít: bármikor magad is közbeléphetsz, mert ugyanaz a szerkesztő.
