---
title: Byg med en AI (MCP)
summary: Hvordan en AI-assistent som Claude eller Codex skaber og ændrer former, grupperer dem og tager billeder af visningen i din åbne editor.
---

layerling leveres med en MCP-server. MCP er en standard hvorigennem en AI-assistent kan bruge værktøjer i andre programmer. Med den ser en AI-klient som Claude eller Codex en åben editor-fane og arbejder i den: den skaber former, ændrer dimensioner, grupperer, skærer, runder kanter, læser scenen op og tager billeder af visningen. Du beskriver delen, AI'en bygger den, du ser med og kan gribe ind når som helst.

Broen mellem AI-klient og editor kører **lokalt på din computer**. Husk dog: hvad AI'en læser, altså scenen og billederne af visningen, går til udbyderen af din AI-klient, som enhver anden input der.

> **Vigtigt:** MCP-broen findes i udviklingsserveren som du selv starter på din computer. På layerling.com og i installationer med statisk hosting er den slået fra. En kopi du selv hoster, såsom Docker-imaget på en NAS, kan slå den til med et adgangstoken; se "En kopi på en NAS eller server" nedenunder.

## Opsætning

1. Hent layerling fra [GitHub](https://github.com/henmedia/layerling) og start det i projektmappen med `npm run dev`. Node.js skal være installeret. På Windows tager hurtigstart-linjen i README sig af det.
2. Åbn en editor-fane, for eksempel `http://127.0.0.1:3000/?editor=1`. Du kan lade AI'en gøre det: når ingen editor er åben, starter det første værktøj der har brug for en din browser med en editor og venter indtil den har forbundet. Det virker for en layerling på din egen computer; en kopi på en NAS eller server kræver at du åbner editoren. Sæt `LAYERLING_MCP_OPEN_EDITOR=0` for at slå det fra i MCP-serveren.
3. Forbind din AI-klient til MCP-serveren. Klienten starter den selv med `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Intet at installere: projektet bringer en `.mcp.json` der registrerer serveren, og skillen under `.claude/skills/layerling-mcp-skill`. Åbn layerling-mappen i Claude Code og spørg for eksempel: "Brug layerling MCP-værktøjerne til at liste mine åbne editorer og inspicere scenen."

### Claude Desktop

Claude Desktop læser ikke projektfiler. Indtast serveren i dens egen konfiguration. Som skabelon brug `docs/mcp/claude-desktop-config.example.json` i projektet, og erstat scriptstien med den absolutte sti på din computer. Genstart så Claude Desktop.

### Codex

Kopiér skillen fra `docs/skills/layerling-mcp-skill` ind i din Codex skills-mappe, indtast serveren i din Codex-konfiguration ved hjælp af `docs/mcp/codex-config.example.toml`, og genstart Codex.

### Gemini & Antigravity

Antigravity finder automatisk skillen i arbejdsområdet, som ligger i `.agents/skills/layerling-mcp-skill`. Til Gemini CLI kopierer du skillen fra `docs/skills/layerling-mcp-skill` ind i din globale skills-mappe (`~/.gemini/skills/`), tilføjer serveren til dine indstillinger med `docs/mcp/gemini-config.example.json`, og genstarter klienten.

De detaljerede instruktioner for alle tre er i [README på GitHub](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## En kopi på en NAS eller server

En kopi du selv hoster kan lade en AI-klient drive dens åbne editorer over netværket. Det er slået fra som standard, fordi den der kan drive broen også kan læse og ændre de åbne designs. På serveren, sæt `LAYERLING_MCP_REMOTE` til `true` og `LAYERLING_MCP_TOKEN` til en hemmelighed på mindst 16 tegn (for Docker-imaget i `environment:` af compose-filen; intet rebuild nødvendigt). Åbn en editor-fane af den kopi og hold den åben, og giv MCP-klienten adressen og den samme token: `LAYERLING_URL=http://nas:3000` og `LAYERLING_MCP_TOKEN=<tokenen>`.

Kun en klient med tokenen kan liste eller drive editorerne. Editor-siderne har ikke brug for nogen, men de tæller kun under en adresse eller et navn som kun dit eget netværk kan bruge (en IP-adresse, et navn uden et punktum, eller et der ender på `.local` eller `.lan`); et rigtigt domæne bag en reverse proxy kommer i `LAYERLING_MCP_ALLOWED_HOSTS`. Brug det på et netværk du stoler på, og HTTPS ud over det. README har detaljerne.

## Hvad AI'en kan gøre

AI'en arbejder med de samme funktioner som dig, gennem den samme vej som din handling i editoren. Nye layerling-funktioner får deres MCP-handling med det samme. Værktøjerne:

| Værktøj | Hvad det gør |
| --- | --- |
| `layerling_list_editors` | lister de åbne editor-faner |
| `layerling_open_editor` | åbner en ny editor-fane i din standardbrowser og venter indtil den har forbundet (kun på din egen computer) |
| `layerling_read_scene` | læser scene, markering, enheder og de nøjagtige dimensioner af alle objekter |
| `layerling_list_objects` | lister alle objekter med dimensioner, position, rotation og id |
| `layerling_select_objects` | vælger objekter |
| `layerling_delete_objects` | sletter objekter |
| `layerling_create_shape` | skaber en form: kasse, cylinder, tekst (også buet), gevind, tandhjul, skitseform og alle de andre |
| `layerling_import_file` | importerer en fil som importvinduet gør, en farvet OBJ eller 3MF som én form pr. farve, en 3MF med flere objekter som én form pr. objekt |
| `layerling_add_font` | tilføjer en font du selv har til tekst fra en TrueType-, OpenType- eller WOFF-fil; den bliver i browseren, et design beholder kun de bogstaver det bruger |
| `layerling_list_fonts` | lister de indbyggede fonte og dine egne fonte, med id og navn |
| `layerling_import_mesh` | bringer et trekantsmesh ind i designet |
| `layerling_update_object` | ændrer dimensioner, position, farve, navn, solid eller hul og alt andet der udgør formen, en teksts bogstavkant inkluderet |
| `layerling_align_objects` | justerer objekter med hinanden |
| `layerling_scale_objects` | skalerer objekter med en procent, sammen eller hver på stedet |
| `layerling_lay_flat` | lægger et objekt med én flade på pladen |
| `layerling_place_on_face` | sætter objekter ned på en flade af en anden, også skrå, som C-tasten |
| `layerling_perforate_face` | skærer et hulmønster ind i en flad flade; hullerne bliver som huller grupperet med formen |
| `layerling_sweep_sketch` | trækker et rektangulært eller rundt tværsnit langs en sti af punkter som ét eksakt legeme; en lukket sti giver en ring |
| `layerling_push_face` | skubber en flad flade ud eller skærer en lomme ind i den, med en indrykning fra kanten og en hjørneradius; den nye del er en skitseform grupperet med formen, eller et frit legeme for sig med `separate` |
| `layerling_mate_faces` | bringer en flade på et objekt mod en flade på et andet, flade mod flade eller flugtende, eller lægger to runde flader på én akse |
| `layerling_open_group` | åbner en gruppe så dens dele kan ændres én ad gangen, også en gruppe inden i en åben |
| `layerling_close_group` | lukker den igen ("Udført") eller annullerer |
| `layerling_group_objects` | grupperer objekter |
| `layerling_ungroup_objects` | opløser grupper |
| `layerling_boolean_cut` | skærer solider med huller |
| `layerling_intersect_objects` | beholder kun hvad objekterne har til fælles (Fælles) |
| `layerling_hull_objects` | pakker objekterne ind i ét konvekst legeme, som var de krympefolieret (Hylster) |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_make_lid` | makes a lid for a body open at the top: pushed in, over the top or flat, with the fit you choose (Lid) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | adskiller en form i dens løse dele, et skitselegeme i ét legeme pr. omrids |
| `layerling_split_objects` | skærer solider eller huller over med et plan |
| `layerling_list_edges` | lister objektets rigtige CAD-kanter |
| `layerling_apply_edge_treatment` | faser eller runder valgte kanter |
| `layerling_hollow_object` | udhuler en form med jævn væg |
| `layerling_cut_out` | skærer ét massivt legeme ud af et andet, så de passer sammen: delen bliver, en kopi forstørret med spillerummet trækkes fra det andet legeme |
| `layerling_offset_object` | forskyder alle flader på et legeme til spillerummet i en pasning: forstørrer eller formindsker det, eller tilføjer den forstørrede kopi som hul, eller flytter kun siderne |
| `layerling_list_faces` | lister fladerne på en eksakt form |
| `layerling_delete_faces` | sletter flader og lukker åbningen |
| `layerling_array_objects` | mangfoldiggør i en række eller på en cirkel |
| `layerling_bundle_objects` | bundter objekter som Ctrl+B: de flytter sammen, beholder deres farve og slags og går ud hver for sig i en eksport |
| `layerling_layer_text` | laver en tekst om til en stak lag til et flerfarvet print (bogstaver, bredere kanter, en plade uden huller) eller bygger en stak igen, med et nøgleringshul, hjørnerne pr. lag og en rundet eller faset bogstavkant; med en navneliste, ét tag pr. navn |
| `layerling_layer_icon` | laver et SVG-ikon (filens tekst, eller en udtrukket skitseform) til et lagdelt ikon-tag til et flerfarvet print - ikonet, bredere kanter, en plade uden huller - eller bygger et igen med en ny bredde eller lag; med et antal fylder den pladen med kopier |
| `layerling_create_qr_code` | laver en QR-kode af en tekst eller webadresse som {{ui:shape.qrCode}} i formbiblioteket - koden alene, hævet på en plade eller graveret, med fejlkorrektion, bredde, højde, stillezone og som hul, hvis du vil; advarer, når et modul kommer under 0,8 mm |
| `layerling_reference_image` | tilføjer et referencebillede fra et billede som {{ui:import.referenceImage}}, eller flytter, drejer, kalibrerer (to punkter på billedet og deres virkelige afstand), toner eller låser et - en hjælp, der aldrig eksporteres eller printes; `trace` gør den mørke eller lyse del til et skitselegeme, der står på det |
| `layerling_measure_section` | måler på et skæreplan mellem to punkter der snapper til omridset - vægtykkelse, mellemrum, pasninger |
| `layerling_show_overhangs` | slår overhængsskraveringen til eller fra, sætter vinklen og rapporterer for hver form det areal der ville have brug for støtte |
| `layerling_estimate_print` | estimerer volumen, vægt og filament for markeringen eller hele designet: for en solid form, og som et groft gæt med vægge og fyldning som eksportvinduet |
| `layerling_add_reference_points` | markerer referencepunkter - på formens centrum, hjørner eller kantmidtpunkter, eller ved præcise positioner - som former snapper til |
| `layerling_list_reference_points` | lister referencepunkterne med deres id'er og positioner |
| `layerling_remove_reference_points` | sletter referencepunkter efter id, eller alle sammen |
| `layerling_inspect_errors` | viser den seneste besked og den seneste fejl, plus sessionens beskeder og fejl |
| `layerling_wrap_around_cylinder` | vikler en form der ligger fladt, for eksempel en SVG eller tekst, rundt om en cylinder, udad eller indad som gravering |
| `layerling_texture_surface` | lægger en overfladestruktur på en form: riller, riflinger, bikager eller knopper, for bedre greb eller for udseendet, og ændrer eller fjerner den senere |
| `layerling_simplify_mesh` | reducerer trekantsantallet i et importeret mesh, til en andel i procent eller til et antal trekanter |
| `layerling_save_custom_shape` | beholder former som en egen form, på serveren eller i browseren, for at indsætte dem i andre designs |
| `layerling_list_custom_shapes` | lister de egne former på serveren og i browseren |
| `layerling_insert_custom_shape` | indsætter en egen form i det åbne design, evt. på en position x/z |
| `layerling_delete_custom_shape` | fjerner en egen form; indsatte former bevares |
| `layerling_show_workplane` | skjuler og viser pladen med sit gitter, for et billede af undersiden for eksempel (kun visningen) |
| `layerling_set_section_view` | skærer visningen op langs et plan for at kigge indeni (kun visningen, intet skæres fra hinanden) |
| `layerling_measurements` | viser eller skjuler målebåndets målinger og viser dem med deres længder, og skjuler eller viser målene omkring markeringen som [[Q]] |
| `layerling_saved_view` | gemmer den aktuelle visning under tasten 7, 8, 9 eller 0 og går tilbage til den, som Shift+tast og tasten (kun visningen); sætter også startvisningen for nye designs |
| `layerling_clear_history` | sletter hvert fortryd-trin for evigt, som historikvisningens "Slet historik"-knap; kræver `confirm: true` |
| `layerling_set_history_view` | ser tilbage på en tidligere tilstand af projektet, som historikvisningen (det rigtige design forbliver urørt; ændringsværktøjer venter indtil den er lukket) |
| `layerling_restore_from_history` | henter objekter (også dele i grupper) fra en tidligere tilstand tilbage i designet som kopier, som historikvisningens knap til at hente ind i designet - ét trin, som fortryd tager tilbage |
| `layerling_export_section_svg` | returnerer omridsene på et skæreplan som en SVG i 1:1, fra de samme former som eksporten |
| `layerling_sketch_from_section` | laver en skitse ud fra omridsene på et skæreplan, liggende på snittet: åbnet i editoren til at rette, eller bygget med det samme som en form med en given højde |
| `layerling_export_drawing` | laver værkstedstegningen fra "2D"-eksporten: tre visninger i 1:1 på et ISO-ark med samlede størrelser og en tabel over de runde boringer, som SVG-tekst eller PDF |
| `layerling_export_mesh` | skriver eksportvinduets fil som STL, 3MF, OBJ, SVG (topvisning, fodaftryk eller synlige kanter) eller DXF til laserskæring af de samme legemer; til en sti på denne computer eller som base64 |
| `layerling_save_project` | gemmer hele det redigerbare design som en .lyl-fil på en sti på den computer, hvor MCP-serveren kører, uden dialog; en eksisterende fil erstattes kun med `overwrite`, der skrives via en midlertidig fil, og målet for Ctrl+S i editoren bliver, som det var |
| `layerling_list_attachments` | viser filerne, der er vedhæftet designet (navn, type, størrelse), som panelet {{ui:panel.attachments}} viser dem |
| `layerling_get_attachment` | læser én vedhæftet fil, dens bytes som base64, som Download i panelet |
| `layerling_add_attachment` | vedhæfter en fil givet som base64, med panelets kontroller; et navn, der allerede er vedhæftet, overskrives kun med `replace` |
| `layerling_rename_attachment` | giver en vedhæftet fil et andet navn; indholdet bliver |
| `layerling_remove_attachment` | fjerner en vedhæftet fil for altid; kræver `confirm: true` |
| `layerling_set_workplane` | lægger arbejdsplanet på en side af en form eller tilbage på grundpladen, og skjuler eller viser det |
| `layerling_capture_image` | tager et billede af visningen: forfra, oppefra, fra siden, diagonalt fra et hjørne og mere |

Det lader AI'en tjekke sig selv: den skaber noget, tager et billede, kigger og forbedrer.

## Et eksempel

Du siger: "Byg en rund kasse 60 mm tværs over, 40 mm høj med 2,5 mm væg, åben foroven, plus et fladt låg med 'Te' skrevet i en bue." AI'en skaber cylindre, udhuler den ene, lægger den buede tekst på låget og tager billeder til sidst for at se om det passer.

> **Tip:** Giv AI'en konkrete dimensioner og fortæl hvad delen er til ("holder til en 12 mm stang, passer til en Bambu Lab A1"). Så træffer den bedre beslutninger. Og se den bygge: du kan selv gribe ind når som helst, fordi det er den samme editor.
