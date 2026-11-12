---
title: Bygga med en AI (MCP)
summary: Hur en AI-assistent som Gemini, Claude eller Codex skapar och ändrar former, grupperar dem och tar bilder av vyn i din öppna redigerare.
---

layerling skickar med en MCP-server. MCP är en standard som låter en AI-assistent använda verktyg i andra program. Med den ser en AI-klient som Gemini, Claude eller Codex en öppen redigerarflik och arbetar i den: den skapar former, ändrar mått, grupperar, skär ut, rundar av kanter, läser av scenen och tar bilder av vyn. Du beskriver delen, AI:n bygger den, du ser på och kan kliva in när som helst.

Bryggan mellan AI-klient och redigerare körs **lokalt på din dator**. Tänk dock på att det AI:n läser – alltså scenen och bilderna av vyn – skickas till leverantören av din AI-klient, precis som all annan indata där.

> **Viktigt:** MCP-bryggan finns i utvecklingsservern som du själv startar på din dator. På layerling.com och i installationer med statisk hosting är den avstängd. En kopia som du driftar själv, till exempel Docker-avbildningen på en NAS, kan slå på den med en åtkomsttoken; se ”En kopia på en NAS eller server” nedan.

## Steg för steg för nybörjare

Du behöver inte kunna någonting om programmering för att göra det här.

**Den kortaste vägen:** ge din favorit-AI projektets adress, `https://github.com/henmedia/layerling`, och be den: ”Installera layerling på min dator så att jag kan bygga 3D-modeller med dig via dess MCP-server.” Den laddar ner och installerar allt själv och säger till när den är klar. Det fungerar med en AI som kan arbeta på din dator, som fliken Code i Claude-appen, Codex, Antigravity eller Gemini CLI. En chatt i webbläsaren kan inte göra det, eftersom den inte kan installera något på din dator.

**Eller gör det själv, på Windows med Claude-appen, i fem steg:**

**1. Installera layerling.** Öppna Start-menyn, skriv `PowerShell` och öppna Windows PowerShell. Kopiera den här raden, klistra in den i fönstret med ett högerklick och tryck Enter:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

Den installerar det som layerling behöver, laddar ner layerling till mappen `layerling` i din användarmapp (`C:\Users\<ditt namn>\layerling`) och öppnar det i din webbläsare. Första gången tar detta några minuter.

![Windows PowerShell med raden inklistrad. Tryck Enter så startar det.](still:ai-quickstart-powershell)

**2. Låt layerling fortsätta köra.** layerling körs så länge PowerShell-fönstret är öppet, och AI:n kan bara bygga medan det körs. Nästa gång dubbelklickar du i stället på ”Start layerling” på skrivbordet.

**3. Installera Claude-appen.** Installera Claude-appen för Windows och logga in. Fliken Code som används i nästa steg ingår i de betalda Claude-abonnemangen.

**4. Öppna mappen layerling i fliken Code.** I Claude-appen byter du till Code längst upp och väljer mappen `layerling` i din användarmapp som arbetsmapp. layerling har redan med sig allt som Claude behöver för att hitta sina verktyg. Om Claude frågar om den får använda MCP-servern ”layerling” i den här mappen tillåter du det.

**5. Berätta för Claude vad den ska bygga.** Till exempel: ”Använd layerling-verktygen och bygg en rund dosa, 60 mm i diameter och 40 mm hög, med 2,5 mm vägg.” Om ingen redigerare är öppen öppnar Claude en i din webbläsare, bygger dosan där steg för steg och tar bilder för att kontrollera sitt arbete. Du ser på och kan ändra vad som helst själv när som helst.

**På en Mac** går det till på samma sätt, med de här ändringarna. I steg 1 öppnar du appen Terminal (tryck Cmd+Mellanslag, skriv `Terminal` och tryck Enter), klistrar in den här raden och trycker Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/henmedia/layerling/main/scripts/mac-quickstart.sh | sh
```

Om Git eller Node.js saknas talar den om vad du ska installera (macOS erbjuder Git i ett fönster, Node.js finns som installationsprogram på nodejs.org); kör därefter samma rad igen. I steg 2 heter genvägen på skrivbordet också ”Start layerling”. I steg 3 installerar du Claude-appen för Mac.

> **Tips:** Om något inte fungerar berättar du för Claude vad du ser. Den kan läsa felet och rättar oftast till det själv. Om ingenting händer i redigeraren kontrollerar du först att layerling fortfarande körs (steg 2).

## Ställa in

1. Hämta layerling från [GitHub](https://github.com/henmedia/layerling) och starta det i projektmappen med `npm run dev`. Node.js måste vara installerat. På Windows sköter snabbstartsraden i README det.
2. Öppna en redigerarflik, till exempel `http://127.0.0.1:3000/?editor=1`. Du kan lämna det åt AI:n: när ingen redigerare är öppen startar det första verktyget som behöver en din webbläsare med en redigerare och väntar tills den har anslutit. Det fungerar för layerling på din egen dator; en kopia på en NAS eller server kräver att du själv öppnar redigeraren. Sätt `LAYERLING_MCP_OPEN_EDITOR=0` för MCP-servern för att stänga av det.
3. Anslut din AI-klient till MCP-servern. Klienten startar den själv med `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Inget att installera: projektet har redan en `.mcp.json` som registrerar servern, och skillen under `.claude/skills/layerling-mcp-skill`. Öppna mappen layerling i Claude Code och fråga till exempel: ”Använd layerlings MCP-verktyg för att lista mina öppna redigerare och inspektera scenen.”

### Claude Desktop

Claude Desktop läser inte projektfiler. Lägg in servern i dess egen konfiguration. Använd `docs/mcp/claude-desktop-config.example.json` i projektet som mall och ersätt skriptsökvägen med den absoluta sökvägen på din dator. Starta sedan om Claude Desktop.

### Codex

Kopiera skillen från `docs/skills/layerling-mcp-skill` till din Codex-mapp för skills, lägg in servern i din Codex-konfiguration med hjälp av `docs/mcp/codex-config.example.toml` och starta om Codex.

### Gemini & Antigravity

Antigravity hittar automatiskt arbetsytans skill i `.agents/skills/layerling-mcp-skill`. För Gemini CLI kopierar du skillen från `docs/skills/layerling-mcp-skill` till din globala mapp för skills (`~/.gemini/skills/`), lägger till servern i dina inställningar med `docs/mcp/gemini-config.example.json` och startar om klienten.

De utförliga instruktionerna för varje klient finns i [README på GitHub](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## En kopia på en NAS eller server

En kopia som du driftar själv kan låta en AI-klient styra sina öppna redigerare över nätverket. Det är avstängt som standard, eftersom den som kan styra bryggan kan läsa och ändra de öppna designerna. På servern sätter du `LAYERLING_MCP_REMOTE` till `true` och `LAYERLING_MCP_TOKEN` till en hemlighet på minst 16 tecken (för Docker-avbildningen under `environment:` i compose-filen; inget nybygge behövs). Öppna en redigerarflik av den kopian och låt den vara öppen, och ge MCP-klienten adressen och samma token: `LAYERLING_URL=http://nas:3000` och `LAYERLING_MCP_TOKEN=<ditt token>`.

Bara en klient med detta token kan lista eller styra redigerarna. Redigerarsidorna behöver inget, men de räknas bara under en adress eller ett namn som enbart ditt eget nätverk kan använda (en IP-adress, ett namn utan punkt, eller ett som slutar på `.local` eller `.lan`); en riktig domän bakom en omvänd proxy läggs i `LAYERLING_MCP_ALLOWED_HOSTS`. Använd det i ett nätverk du litar på, och HTTPS utanför det. README har detaljerna.

## Vad AI:n kan göra

AI:n arbetar med samma funktioner som du, via samma väg som din användning i redigeraren. Nya funktioner i layerling får sin MCP-åtgärd direkt. Verktygen:

| Verktyg | Vad det gör |
| --- | --- |
| `layerling_list_editors` | listar de öppna redigerarflikarna |
| `layerling_rename_project` | ger projektet ett namn, precis som pennan bredvid projektnamnet |
| `layerling_open_editor` | öppnar en ny redigerarflik i din standardwebbläsare och väntar tills den har anslutit (endast på din egen dator) |
| `layerling_read_scene` | läser av scen, markering, enheter och de exakta måtten för alla objekt |
| `layerling_list_objects` | listar alla objekt med mått, position, rotation och id |
| `layerling_select_objects` | markerar objekt |
| `layerling_hide_others` | döljer allt utom markeringen eller de angivna objekten, i ett enda ångra-steg |
| `layerling_delete_objects` | tar bort objekt |
| `layerling_move_object` | flyttar ett objekt till en annan plats i objektlistan |
| `layerling_create_shape` | skapar en form: låda, cylinder, text (även längs båge), gänga, kugghjul, skisskropp och alla de andra |
| `layerling_import_file` | importerar en fil som importfönstret gör: en färgad OBJ eller 3MF som en kropp per färg, en 3MF med flera objekt som en kropp per objekt |
| `layerling_add_font` | lägger till ett eget typsnitt för text från en TrueType-, OpenType- eller WOFF-fil; det stannar i webbläsaren och en design behåller bara de bokstäver den använder |
| `layerling_list_fonts` | listar de inbyggda typsnitten och dina egna typsnitt, med id och namn |
| `layerling_import_mesh` | tar in ett triangelnät i designen |
| `layerling_update_object` | ändrar mått, position, färg, namn, solid eller hål och allt annat som utgör formen, inklusive en texts bokstavskant |
| `layerling_align_objects` | riktar in objekt mot varandra |
| `layerling_scale_objects` | skalar objekt med en procentsats, tillsammans eller vart och ett på sin plats |
| `layerling_lay_flat` | lägger ett objekt med en yta mot plattan |
| `layerling_place_on_face` | sätter ner objekt på en yta av ett annat objekt, även lutande ytor, som C-tangenten |
| `layerling_perforate_face` | skär ut ett hålmönster i en plan yta eller runt väggen på en cylinder, ett rör eller ett borrhål; hålen stannar kvar som hål grupperade med kroppen |
| `layerling_sweep_sketch` | drar ett rektangulärt eller runt tvärsnitt längs en bana av punkter som en enda exakt kropp; en sluten bana ger en ring |
| `layerling_push_face` | skjuter ut en plan yta eller skär in en ficka i den, med indrag från kanten och hörnradie; den nya delen blir en skisskropp grupperad med kroppen, eller en egen fri kropp med `separate` |
| `layerling_paint` | målar delar av en kropp i egna färger för flerfärgsutskrift (Måla): fyll en yta ända ut till dess skarpa kanter, en rund fläck eller en lasso ritad i en platt vy; sudda, rensa allt; sparas med kroppen och skrivs till en 3MF som målade ytor |
| `layerling_support_rib` | ställer en tunn stödribba under den undre ytan på en del som skrivs ut lutad på en kant, med bryggor som är ett lager höga (Stödribba) |
| `layerling_stencil_bridges` | håller fast delarna i en platta med genomskuren text som annars skulle falla ut, med bryggor grupperade med plattan, så breda och höga som ställts in (Schablonbryggor) |
| `layerling_mate_faces` | för en yta på ett objekt mot en yta på ett annat, yta mot yta eller i jämnhöjd, eller lägger två runda ytor på samma axel |
| `layerling_open_group` | öppnar en grupp så att dess delar kan ändras var för sig, även en grupp inuti en öppen grupp |
| `layerling_close_group` | stänger den igen (”Klar”) eller avbryter |
| `layerling_add_to_group` | lägger lösa objekt i en grupp utan att öppna den |
| `layerling_take_out_of_group` | tar ut en del ur en grupp utan att öppna den |
| `layerling_group_objects` | grupperar objekt |
| `layerling_ungroup_objects` | delar upp grupper |
| `layerling_boolean_cut` | skär solider med hål |
| `layerling_intersect_objects` | behåller bara det som objekten har gemensamt (Booleskt snitt) |
| `layerling_hull_objects` | sveper in objekten i en enda konvex kropp, som med krympplast (Hölje) |
| `layerling_cookie_cutter` | gör en pepparkaksform av objekten: en vägg med en skäregg och en kant runt den spegelvända konturen (Pepparkaksform) |
| `layerling_flexi_joints` | skär upp en platt kropp i länkar med leder som skrivs ut på plats och svänger åt sidorna (Flexileder) |
| `layerling_make_lid` | gör ett lock till en kropp som är öppen upptill: intryckt, utanpå eller platt, med den passning du väljer och magneter om du vill (Lock) |
| `layerling_make_cable_channel` | drar en rund kanal för en kabel genom en kropp från en ingång till en utgång och letar själv upp vägen med mjuka böjar (Kabelkanal) |
| `layerling_loft_sketches` | förenar två skisskroppar till en övergång från ena konturen till den andra (Lofta skisser) |
| `layerling_separate_parts` | delar upp en form i dess lösa delar, en skisskropp i en kropp per kontur |
| `layerling_split_objects` | skär solider eller hål i två delar med ett plan |
| `layerling_list_edges` | listar de riktiga CAD-kanterna på ett objekt |
| `layerling_apply_edge_treatment` | fasar eller rundar av valda kanter |
| `layerling_hollow_object` | gröper ur en kropp med jämntjock vägg |
| `layerling_cut_out` | skär ut en solid ur en annan så att de passar: delen blir kvar, en kopia utökad med spelrummet dras ifrån den andra kroppen |
| `layerling_punch` | stansar konturen av en solid, sedd längs x, y eller z, rakt igenom en annan; stansen ligger kvar och behöver inte röra vid den |
| `layerling_offset_object` | bygger spelrummet för en presspassning: förstorar eller krymper en solid, lägger till den förstorade kopian som ett hål, eller flyttar bara sidorna |
| `layerling_list_faces` | listar ytorna på en exakt kropp |
| `layerling_delete_faces` | tar bort ytor och sluter luckan |
| `layerling_array_objects` | mångfaldigar i en rad, ett rutnät eller på en cirkel |
| `layerling_bundle_objects` | buntar ihop objekt som Ctrl+B: de flyttas tillsammans, behåller sin färg och typ och går ut var för sig vid export |
| `layerling_layer_text` | gör om en text till en stapel av lager för flerfärgsutskrift (bokstäver, bredare kanter, en platta utan hål) eller bygger om en stapel, med nyckelringshål, hörn per lager och rundad eller fasad bokstavskant; med en namnlista, en namnskylt per namn |
| `layerling_text_block` | gör ett textblock: en text blir den första av flera rader, var och en egen text under den ovanför, vänster-, mitt- eller högerjusterad, varje rad lika stor eller mindre |
| `layerling_layer_icon` | gör om en SVG-ikon (filens text, eller en extruderad skisskropp) till en ikonskylt i lager för flerfärgsutskrift – ikonen, bredare kanter, en platta utan hål – eller bygger om en med ny bredd eller nya lager; med ett antal fylls plattan med kopior |
| `layerling_create_qr_code` | gör en QR-kod av en text eller webbadress, som {{ui:shape.qrCode}} i formbiblioteket – enbart koden, upphöjd på en platta eller graverad, med felkorrigering, bredd, höjd, fri zon och som hål vid behov; varnar när en modul hamnar under 0,8 mm |
| `layerling_create_sbc_board` | placerar ett SBC-kort i verklig storlek, som {{ui:shape.sbcBoard}} i formbiblioteket – Raspberry Pi 5, 4, 3 B+, Zero 2 W eller BIGTREETECH Pi, med sina hål och kontakter, spelrummet runt kantkontakterna, positionen och som hål för att skära ut ett chassi |
| `layerling_reference_image` | lägger till en referensbild från en bild, som {{ui:import.referenceImage}} gör, eller flyttar, vrider, kalibrerar (två punkter i bilden och deras verkliga avstånd), tonar ned eller låser en – ett hjälpmedel som aldrig exporteras eller skrivs ut; `trace` gör dess mörka eller ljusa del till en skisskropp som står på den |
| `layerling_measure_section` | mäter på ett snittplan mellan två punkter som fäster mot konturen – väggtjocklek, mellanrum, passningar |
| `layerling_show_overhangs` | slår på eller av överhängsskrafferingen, ställer in vinkeln och anger för varje kropp den yta som skulle behöva stöd |
| `layerling_estimate_print` | beräknar volym, vikt och filament för markeringen eller hela designen: för en massiv kropp, och som en grov uppskattning med väggar och fyllning som exportfönstret |
| `layerling_check_clearance` | kontrollerar före utskrift vilka delar som överlappar, nuddar varandra eller kommer närmare än ett minsta mellanrum (Kontrollera spelrum), även de lösa delarna i ett och samma objekt |
| `layerling_printer_play` | läser av, ställer in eller rensar skrivarens spel ({{ui:workspace.printerPlay}} i inställningarna) och placerar passningstestet som mäter upp det |
| `layerling_check_print` | kontrollerar före utskrift vad som skulle gå fel: väggar som är för tunna för munstycket, svävande delar, för liten kontaktyta mot plattan, överhäng och öppna nät (Utskriftskontroll) |
| `layerling_add_reference_points` | markerar referenspunkter – på objekts mittpunkt, hörn eller kanters mittpunkter, eller vid exakta koordinater – som former fäster mot |
| `layerling_list_reference_points` | listar referenspunkterna med sina id:n och positioner |
| `layerling_remove_reference_points` | tar bort referenspunkter efter id, eller alla tillsammans |
| `layerling_list_notes` | läser användarens anteckningar med deras text, kroppen var och en är fäst vid och om den är en förfrågan till AI:n |
| `layerling_wait_for_notes` | väntar tills du kryssar i {{ui:note.forAi}} på en anteckning, och lämnar över förfrågan direkt |
| `layerling_add_note` | sätter en anteckning på modellen, fäst vid ett objekt eller fritt på plattan |
| `layerling_update_note` | ändrar en anteckning eller svarar på den; ett svar stänger förfrågan |
| `layerling_remove_notes` | tar bort anteckningar efter id |
| `layerling_inspect_errors` | visar det senaste meddelandet och det senaste felet, plus sessionens meddelanden och fel |
| `layerling_wrap_around_cylinder` | sveper en kropp som ligger plant, till exempel en SVG eller text, runt en cylinder, utåt eller inåt som en gravyr |
| `layerling_texture_surface` | lägger en ytstruktur på en kropp: spår, lättring, bikaka eller knoppar, för grepp eller för utseendet, och ändrar eller tar bort den senare |
| `layerling_simplify_mesh` | minskar antalet trianglar i ett importerat nät, till en andel i procent eller till ett antal trianglar |
| `layerling_make_exact` | gör om ett importerat nät till en exakt CAD-kropp: plan, cylindrar, koner, sfärer och torusar blir riktiga ytor, så att kanter rundas av rent och STEP bär dem vidare |
| `layerling_save_custom_shape` | sparar kroppar som en egen form, på servern eller i webbläsaren, för att kunna infoga dem i andra designer |
| `layerling_list_custom_shapes` | listar de egna formerna på servern och i webbläsaren |
| `layerling_insert_custom_shape` | infogar en egen form i den öppna designen, på en plats x/z om du vill |
| `layerling_delete_custom_shape` | tar bort en egen form; redan infogade kroppar stannar kvar |
| `layerling_show_workplane` | döljer och visar plattan med dess rutnät, till exempel för en bild av undersidan (endast vyn) |
| `layerling_focus_mode` | slår på och av fokusläge: döljer rubrikraden och sidfoten för mer plats (endast redigerarens ram) |
| `layerling_set_section_view` | skär upp vyn längs ett plan för att titta inuti (endast vyn, ingenting skärs isär) |
| `layerling_measurements` | visar eller döljer måttbandets mätningar och listar dem med sina längder, döljer eller visar måtten runt markeringen som [[Q]], och skriver in en längd för en av dem, vilket flyttar kroppen i dess ände precis som ett klick på dess siffra |
| `layerling_measure_angle` | mäter en vinkel som gradskivan: vid hörnet mellan tre punkter eller mellan två plana ytor, och visar den i vyn |
| `layerling_saved_view` | sparar den aktuella vyn under tangenten 7, 8, 9 eller 0 och går tillbaka till den, som Skift+tangent och själva tangenten (endast vyn); anger också startvyn för nya designer |
| `layerling_build_plates` | listar, lägger till, namnger, ordnar och tar bort byggplattorna, flyttar objekt till en platta och ordnar dem på plattorna, som plattraden |
| `layerling_clear_history` | raderar alla ångra-steg för gott, precis som historikvyns knapp ”Ta bort historik”; kräver `confirm: true` |
| `layerling_list_backups` | listar de automatiska säkerhetskopiorna (Tidigare versioner) av den öppna designen, eller med `all: true` av alla designer i den här webbläsaren |
| `layerling_open_backup` | öppnar en säkerhetskopia via dess `id` som en ny design, aldrig kopplad till den ursprungliga filen |
| `layerling_set_history_view` | blickar tillbaka på ett tidigare tillstånd i projektet, som historikvyn (den riktiga designen förblir orörd; verktyg som ändrar modellen väntar tills den stängs) |
| `layerling_restore_from_history` | hämtar tillbaka objekt (även delar inuti grupper) från ett tidigare tillstånd in i designen som kopierade objekt, som historikvyns ”Hämta till designen” – ett enda steg som Ångra tar tillbaka |
| `layerling_export_section_svg` | returnerar konturerna på ett snittplan som en SVG i skala 1:1, från samma kroppar som vid export |
| `layerling_sketch_from_section` | gör en skiss av konturerna på ett snittplan, liggande på snittet: öppnad i redigeraren för att ändra, eller direkt byggd till en kropp med en angiven höjd |
| `layerling_export_drawing` | gör verkstadsritningen från exporten ”2D”: tre vyer i skala 1:1 på ett ISO-blad med yttermått och en tabell över de runda hålen, som SVG-text eller PDF |
| `layerling_export_mesh` | skriver exportfönstrets fil som STL, 3MF, OBJ, SVG (vy ovanifrån, fotavtryck eller synliga kanter) eller DXF för laserskärning, från samma kroppar; till en sökväg på den här datorn, eller som base64 |
| `layerling_save_project` | sparar hela den redigerbara designen som en .lyl-fil på en sökväg på den dator där MCP-servern körs, utan dialog; en befintlig fil ersätts bara med `overwrite`, den skrivs via en temporär fil, och målet för Ctrl+S i redigeraren förblir som det är |
| `layerling_list_attachments` | listar filerna som är bifogade till designen (namn, typ, storlek), som panelen Bilagor visar dem |
| `layerling_get_attachment` | läser en bifogad fil, dess byte som base64, som Ladda ner i panelen gör |
| `layerling_add_attachment` | bifogar en fil angiven som base64, med panelens kontroller; ett namn som redan är bifogat skrivs bara över med `replace` |
| `layerling_rename_attachment` | ger en bifogad fil ett annat namn; dess innehåll förblir oförändrat |
| `layerling_remove_attachment` | tar bort en bifogad fil för gott; kräver `confirm: true` |
| `layerling_set_workplane` | lägger arbetsytan på en sida av en kropp eller tillbaka på grundplattan, och döljer eller visar den |
| `layerling_capture_image` | tar en bild av vyn: framifrån, ovanifrån, från sidan, snett från ett hörn med mera |

Det låter AI:n kontrollera sig själv: den skapar något, tar en bild, tittar och förbättrar.

## Ett exempel

Du säger: ”Bygg en rund dosa 60 mm i diameter, 40 mm hög med 2,5 mm vägg, öppen upptill, samt ett platt lock med 'Te' skrivet i en båge.” AI:n skapar cylindrarna, gröper ur den ena, sätter den bågformade texten på locket och tar bilder på slutet för att se om det passar.

> **Tips:** Ge AI:n konkreta mått och berätta vad delen är till för (”hållare för en 12 mm stång, passar på en Bambu Lab A1”). Då fattar den klokare beslut. Och se på när den bygger: du kan kliva in själv när som helst, eftersom det är samma redigerare.
