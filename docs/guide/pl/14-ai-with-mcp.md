---
title: Budowanie z AI (MCP)
summary: Jak asystent AI, taki jak Gemini, Claude albo Codex, tworzy i zmienia kształty, grupuje je i robi zdjęcia widoku w Twoim otwartym edytorze.
---

layerling ma wbudowany serwer MCP. MCP to standard, przez który asystent AI może używać narzędzi w innych programach. Dzięki niemu klient AI, taki jak Gemini, Claude albo Codex, widzi otwartą kartę edytora i w niej pracuje: tworzy kształty, zmienia wymiary, grupuje, tnie, zaokrągla krawędzie, odczytuje scenę i robi zdjęcia widoku. Ty opisujesz część, AI ją buduje, a Ty patrzysz i w każdej chwili możesz się wtrącić.

Most między klientem AI a edytorem działa **lokalnie na Twoim komputerze**. Pamiętaj jednak: to, co odczytuje AI, czyli scena i zdjęcia widoku, trafia do dostawcy Twojego klienta AI, jak każde inne dane, które tam wpisujesz.

> **Ważne:** most MCP istnieje w serwerze deweloperskim, który uruchamiasz sam na swoim komputerze. Na layerling.com i w instalacjach ze statycznym hostingiem jest wyłączony. Kopia, którą hostujesz sam, na przykład obraz Docker na NAS-ie, może go włączyć z tokenem dostępu. Zobacz niżej „Kopia na NAS-ie albo serwerze”.

## Konfiguracja

1. Pobierz layerling z [GitHuba](https://github.com/henmedia/layerling) i uruchom go w folderze projektu poleceniem `npm run dev`. Musi być zainstalowany Node.js. W Windows zajmuje się tym wiersz szybkiego startu z README.
2. Otwórz kartę edytora, na przykład `http://127.0.0.1:3000/?editor=1`. Możesz to zostawić AI: gdy żaden edytor nie jest otwarty, pierwsze narzędzie, które go potrzebuje, uruchamia przeglądarkę z edytorem i czeka, aż się połączy. Działa to dla layerling na Twoim własnym komputerze. Na kopii na NAS-ie albo serwerze edytor otwierasz sam. Ustaw `LAYERLING_MCP_OPEN_EDITOR=0` dla serwera MCP, aby to wyłączyć.
3. Połącz swojego klienta AI z serwerem MCP. Klient uruchamia go sam poleceniem `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Nic do instalowania: projekt zawiera plik `.mcp.json`, który rejestruje serwer, oraz umiejętność w `.claude/skills/layerling-mcp-skill`. Otwórz folder layerling w Claude Code i poproś na przykład: „Use the layerling MCP tools to list my open editors and inspect the scene.”

### Claude Desktop

Claude Desktop nie czyta plików projektu. Wpisz serwer w jego własnej konfiguracji. Jako wzoru użyj `docs/mcp/claude-desktop-config.example.json` z projektu, zastępując ścieżkę do skryptu pełną ścieżką na Twoim komputerze. Potem uruchom Claude Desktop ponownie.

### Codex

Skopiuj umiejętność z `docs/skills/layerling-mcp-skill` do folderu umiejętności Codexa, wpisz serwer w konfiguracji Codexa na podstawie `docs/mcp/codex-config.example.toml` i uruchom Codexa ponownie.

### Gemini i Antigravity

Antigravity sam wykrywa umiejętność obszaru roboczego w `.agents/skills/layerling-mcp-skill`. W Gemini CLI skopiuj umiejętność z `docs/skills/layerling-mcp-skill` do globalnego folderu umiejętności (`~/.gemini/skills/`), dodaj serwer do ustawień na podstawie `docs/mcp/gemini-config.example.json` i uruchom klienta ponownie.

Szczegółowe instrukcje dla każdego klienta są w [README na GitHubie](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## Kopia na NAS-ie albo serwerze

Kopia, którą hostujesz sam, może pozwolić klientowi AI sterować przez sieć jej otwartymi edytorami. Domyślnie jest to wyłączone, bo kto może sterować mostem, może czytać i zmieniać otwarte projekty. Na serwerze ustaw `LAYERLING_MCP_REMOTE` na `true` i `LAYERLING_MCP_TOKEN` na sekret o długości co najmniej 16 znaków (dla obrazu Docker w `environment:` pliku compose, bez przebudowy). Otwórz kartę edytora tej kopii i zostaw ją otwartą, a klientowi MCP podaj adres i ten sam token: `LAYERLING_URL=http://nas:3000` i `LAYERLING_MCP_TOKEN=<token>`.

Tylko klient z tokenem może wypisywać edytory i nimi sterować. Strony edytora nie potrzebują tokena, ale liczą się tylko pod adresem albo nazwą, której może używać wyłącznie Twoja sieć (adres IP, nazwa bez kropki albo kończąca się na `.local` lub `.lan`). Prawdziwa domena za odwrotnym proxy trafia do `LAYERLING_MCP_ALLOWED_HOSTS`. Używaj tego w sieci, której ufasz, a poza nią przez HTTPS. Szczegóły są w README.

## Co potrafi AI

AI pracuje tymi samymi funkcjami co Ty, tą samą drogą co Twoja praca w edytorze. Nowe funkcje layerling od razu dostają swoje polecenie MCP. Narzędzia:

| Narzędzie | Co robi |
| --- | --- |
| `layerling_list_editors` | wypisuje otwarte karty edytora |
| `layerling_open_editor` | otwiera nową kartę edytora w domyślnej przeglądarce i czeka, aż się połączy (tylko na Twoim własnym komputerze) |
| `layerling_read_scene` | odczytuje scenę, zaznaczenie, jednostki i dokładne wymiary wszystkich obiektów |
| `layerling_list_objects` | wypisuje wszystkie obiekty z wymiarami, pozycją, obrotem i identyfikatorem |
| `layerling_select_objects` | zaznacza obiekty |
| `layerling_delete_objects` | usuwa obiekty |
| `layerling_create_shape` | tworzy kształt: prostopadłościan, walec, tekst (także na łuku), gwint, koło zębate, bryłę ze szkicu i wszystkie pozostałe |
| `layerling_import_file` | importuje plik tak jak okno importu, kolorowy OBJ albo 3MF jako jedną bryłę na kolor, 3MF z kilkoma obiektami jako jedną bryłę na obiekt |
| `layerling_add_font` | dodaje własną czcionkę do tekstu z pliku TrueType, OpenType albo WOFF. Zostaje w przeglądarce, a projekt zachowuje tylko litery, których używa |
| `layerling_list_fonts` | wypisuje wbudowane i własne czcionki z identyfikatorem i nazwą |
| `layerling_import_mesh` | wprowadza siatkę trójkątów do projektu |
| `layerling_update_object` | zmienia wymiary, pozycję, kolor, nazwę, bryłę albo otwór i wszystko inne, co tworzy kształt, także krawędź liter tekstu |
| `layerling_align_objects` | wyrównuje obiekty względem siebie |
| `layerling_scale_objects` | skaluje obiekty o procent, razem albo każdy w miejscu |
| `layerling_lay_flat` | kładzie obiekt jedną ścianą na płycie |
| `layerling_place_on_face` | odkłada obiekty na ścianę innego, także skośną, jak klawisz C |
| `layerling_perforate_face` | wycina wzór otworów w płaskiej ścianie. Otwory zostają otworami zgrupowanymi z bryłą |
| `layerling_sweep_sketch` | prowadzi prostokątny albo okrągły przekrój wzdłuż ścieżki z punktów jako jedną dokładną bryłę. Zamknięta ścieżka daje pierścień |
| `layerling_push_face` | wypycha płaską ścianę na zewnątrz albo wycina w niej kieszeń, z odsunięciem od krawędzi i promieniem narożników. Nowa część to bryła ze szkicu zgrupowana z bryłą albo, z `separate`, osobna wolna bryła |
| `layerling_mate_faces` | przykłada ścianę jednego obiektu do ściany drugiego, ściana do ściany, na równo albo dwie okrągłe ściany na jednej osi |
| `layerling_open_group` | otwiera grupę, żeby zmieniać jej części po kolei, także grupę wewnątrz otwartej |
| `layerling_close_group` | zamyka ją z powrotem („Gotowe”) albo anuluje |
| `layerling_group_objects` | grupuje obiekty |
| `layerling_ungroup_objects` | rozwiązuje grupy |
| `layerling_boolean_cut` | wycina otworami materiał z brył |
| `layerling_intersect_objects` | zostawia tylko to, co obiekty mają wspólnego (część wspólna) |
| `layerling_hull_objects` | owija obiekty jedną wypukłą bryłą, jak folią termokurczliwą (otoczka) |
| `layerling_cookie_cutter` | robi z obiektów foremkę do ciastek: ściankę z ostrzem i kołnierz wokół odbitego konturu (Foremka do ciastek) |
| `layerling_flexi_joints` | tnie płaską bryłę na ogniwa z przegubami drukowanymi w miejscu, które wychylają się na boki (Przeguby flexi) |
| `layerling_make_lid` | robi pokrywkę do bryły otwartej u góry: wciskaną, nakładaną albo płaską, z wybranym pasowaniem (Pokrywka) |
| `layerling_loft_sketches` | łączy dwie bryły ze szkicu w przejście od jednego konturu do drugiego (Przejście między szkicami) |
| `layerling_separate_parts` | rozdziela kształt na jego luźne części, bryłę ze szkicu na jedną bryłę na kontur |
| `layerling_split_objects` | przecina bryły albo otwory na dwie części płaszczyzną |
| `layerling_list_edges` | wypisuje prawdziwe krawędzie CAD obiektu |
| `layerling_apply_edge_treatment` | fazuje albo zaokrągla wybrane krawędzie |
| `layerling_hollow_object` | drąży bryłę z równą ścianką |
| `layerling_cut_out` | wycina jedną bryłę z drugiej, aby do siebie pasowały: część zostaje, kopia powiększona o luz jest odejmowana od drugiej bryły |
| `layerling_offset_object` | odsuwa wszystkie ściany bryły na luz pasowania: powiększa lub zmniejsza ją albo dodaje powiększoną kopię jako otwór |
| `layerling_list_faces` | wypisuje ściany dokładnej bryły |
| `layerling_delete_faces` | usuwa ściany i zamyka lukę |
| `layerling_array_objects` | powiela w rzędzie albo na okręgu |
| `layerling_bundle_objects` | łączy obiekty w zestaw jak Ctrl+B: poruszają się razem, zachowują kolor i rodzaj, a w eksporcie wychodzą osobno |
| `layerling_layer_text` | zmienia tekst w stos warstw do druku wielokolorowego (litery, szersze obrzeża, płytka bez otworów) albo buduje stos ponownie, z otworem na kółko do kluczy, narożnikami dla każdej warstwy i zaokrągloną lub sfazowaną krawędzią liter. Z listą imion jedna plakietka na imię |
| `layerling_layer_icon` | zmienia ikonę SVG (tekst pliku albo wyciągniętą bryłę ze szkicu) w warstwową plakietkę z ikoną do druku wielokolorowego (ikona, szersze obrzeża, płytka bez otworów) albo buduje ją ponownie z nową szerokością lub warstwami. Z liczbą wypełnia płytę kopiami |
| `layerling_create_qr_code` | tworzy kod QR z tekstu lub adresu strony, jak {{ui:shape.qrCode}} w bibliotece kształtów – sam kod, wypukły na płytce albo grawerowany, z korekcją błędów, szerokością, wysokością, strefą ciszy i na życzenie jako otwór; ostrzega, gdy moduł jest mniejszy niż 0,8 mm |
| `layerling_reference_image` | dodaje obraz referencyjny ze zdjęcia, jak {{ui:import.referenceImage}}, albo przesuwa, obraca, kalibruje (dwa punkty obrazu i ich rzeczywista odległość), rozjaśnia lub blokuje go - pomoc, która nigdy nie jest eksportowana ani drukowana |
| `layerling_measure_section` | mierzy na płaszczyźnie cięcia między dwoma punktami przyciąganymi do konturu: grubość ścianek, szczeliny, pasowania |
| `layerling_show_overhangs` | włącza albo wyłącza kreskowanie nawisów, ustawia kąt i podaje dla każdej bryły powierzchnię, która wymagałaby podpór |
| `layerling_estimate_print` | szacuje objętość, masę i filament dla zaznaczenia albo całego projektu: dla pełnej bryły oraz zgrubnie ze ściankami i wypełnieniem, jak okno eksportu |
| `layerling_add_reference_points` | stawia punkty odniesienia (na środku, narożnikach albo środkach krawędzi obiektów albo w dokładnych pozycjach), do których przyciągają się kształty |
| `layerling_list_reference_points` | wypisuje punkty odniesienia z identyfikatorami i pozycjami |
| `layerling_remove_reference_points` | usuwa punkty odniesienia według identyfikatora albo wszystkie |
| `layerling_inspect_errors` | pokazuje ostatni komunikat i ostatni błąd oraz komunikaty i błędy sesji |
| `layerling_wrap_around_cylinder` | owija leżącą płasko bryłę, na przykład SVG albo tekst, wokół walca, na zewnątrz albo do wewnątrz jako grawer |
| `layerling_texture_surface` | nakłada na bryłę teksturę powierzchni: rowki, radełkowanie, plaster miodu albo wypustki, dla lepszego chwytu albo wyglądu, a później ją zmienia albo usuwa |
| `layerling_simplify_mesh` | zmniejsza liczbę trójkątów zaimportowanej siatki, do odsetka w procentach albo do liczby trójkątów |
| `layerling_save_custom_shape` | zachowuje bryły jako własny kształt, na serwerze albo w przeglądarce, żeby wstawiać je do innych projektów |
| `layerling_list_custom_shapes` | wypisuje własne kształty na serwerze i w przeglądarce |
| `layerling_insert_custom_shape` | wstawia własny kształt do otwartego projektu, jeśli chcesz, w miejscu x/z |
| `layerling_delete_custom_shape` | usuwa własny kształt. Wstawione bryły zostają |
| `layerling_show_workplane` | ukrywa i pokazuje płytę z siatką, na przykład do zdjęcia spodu (tylko widok) |
| `layerling_set_section_view` | rozcina widok wzdłuż płaszczyzny, żeby zajrzeć do środka (tylko widok, nic nie jest cięte) |
| `layerling_measurements` | pokazuje lub ukrywa pomiary narzędzia Zmierz i wypisuje je z ich długościami, oraz ukrywa lub pokazuje wymiary wokół zaznaczenia jak [[Q]] |
| `layerling_saved_view` | zapisuje bieżący widok pod klawiszem 7, 8, 9 lub 0 i do niego wraca, jak Shift+klawisz i sam klawisz (tylko widok); ustawia też widok startowy nowych projektów |
| `layerling_clear_history` | usuwa na dobre wszystkie kroki cofania, tak jak przycisk „Usuń historię” w widoku historii. Wymaga `confirm: true` |
| `layerling_set_history_view` | pokazuje wcześniejszy stan projektu, jak widok historii (prawdziwy projekt zostaje nietknięty, a narzędzia zmieniające czekają, aż widok zostanie zamknięty) |
| `layerling_restore_from_history` | przywraca obiekty (także części wewnątrz grup) z wcześniejszego stanu do projektu jako kopie, jak przycisk Przywróć do projektu w widoku historii. To jeden krok, który cofanie wycofuje |
| `layerling_export_section_svg` | zwraca kontury na płaszczyźnie cięcia jako SVG w skali 1:1, z tych samych brył co eksport |
| `layerling_sketch_from_section` | tworzy szkic z konturów na płaszczyźnie cięcia, leżący na przekroju: otwarty w edytorze do zmiany albo od razu zbudowany jako bryła o podanej wysokości |
| `layerling_export_drawing` | tworzy rysunek warsztatowy eksportu „2D”: trzy widoki w skali 1:1 na arkuszu ISO z wymiarami gabarytowymi i tabelą okrągłych otworów, jako tekst SVG albo PDF |
| `layerling_export_mesh` | zapisuje plik okna eksportu jako STL, 3MF, OBJ, SVG (widok z góry, ślad albo widoczne krawędzie) albo DXF do cięcia laserem, z tych samych brył, do ścieżki na tym komputerze albo jako base64 |
| `layerling_save_project` | zapisuje cały edytowalny projekt jako plik .lyl pod ścieżką na komputerze, na którym działa serwer MCP, bez okna dialogowego; istniejący plik jest zastępowany tylko z `overwrite`, zapis idzie przez plik tymczasowy, a cel Ctrl+S w edytorze pozostaje bez zmian |
| `layerling_list_attachments` | wypisuje pliki dołączone do projektu (nazwa, typ, rozmiar), tak jak pokazuje je panel Załączniki |
| `layerling_get_attachment` | odczytuje jeden załącznik, jego bajty jako base64, jak pobieranie w panelu |
| `layerling_add_attachment` | dołącza plik podany jako base64, z kontrolami panelu; nazwa już dołączona jest nadpisywana tylko z `replace` |
| `layerling_rename_attachment` | nadaje załącznikowi inną nazwę; zawartość zostaje |
| `layerling_remove_attachment` | usuwa załącznik na zawsze; wymaga `confirm: true` |
| `layerling_set_workplane` | kładzie płaszczyznę roboczą na boku bryły albo z powrotem na płycie bazowej oraz ją ukrywa lub pokazuje |
| `layerling_capture_image` | robi zdjęcie widoku: z przodu, z góry, z boku, ukośnie od narożnika i inne |

Dzięki temu AI może sprawdzać samo siebie: tworzy coś, robi zdjęcie, patrzy i poprawia.

## Przykład

Mówisz: „Zbuduj mi okrągłe pudełko o średnicy 60 mm i wysokości 40 mm ze ścianką 2,5 mm, otwarte u góry, oraz płaską pokrywkę z napisem »Herbata« na łuku”. AI tworzy walce, drąży jeden z nich, kładzie napis na łuku na pokrywce, a na końcu robi zdjęcia, żeby sprawdzić, czy pasuje.

> **Wskazówka:** podawaj AI konkretne wymiary i mów, do czego służy część („uchwyt na pręt 12 mm, pasuje do Bambu Lab A1”). Wtedy podejmuje rozsądniejsze decyzje. I patrz, jak buduje: w każdej chwili możesz wtrącić się sam, bo to ten sam edytor.
