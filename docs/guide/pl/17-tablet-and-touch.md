---
title: Tablet i dotyk
summary: Praca palcami albo rysikiem: zaznaczanie kilku brył, obracanie i przybliżanie widoku, menu długiego przytrzymania i co warto wiedzieć na iPadzie.
---

## Palce i rysik

layerling działa w przeglądarce tabletu oraz jako aplikacja z jego ekranu początkowego. Palec robi to, co lewy przycisk myszy. Trzy rzeczy, których tablet nie ma, czyli prawy przycisk myszy, klawisz Shift i kółko, mają własne zastępstwa:

| Chcesz | Na tablecie |
| --- | --- |
| Zaznaczyć bryłę | Stuknij ją. |
| Zaznaczyć kilka brył | Stuknij bryłę: w lewym dolnym rogu pojawi się okrągły przycisk. Stuknij go, a każda kolejna stuknięta bryła dołącza do zaznaczenia. Stuknięcie zaznaczonej bryły ją odznacza. Stuknięcie pustego miejsca niczego nie zmienia, a drugie stuknięcie przycisku kończy wybieranie i czyści zaznaczenie. Albo przytrzymaj nieruchomo palec przez pół sekundy, wybierz {{ui:contextMenu.selectMultiple}}, potem stukaj kolejne bryły. |
| Zaznaczyć wszystkie bryły | Przytrzymaj nieruchomo palec na pustym miejscu przez pół sekundy, wybierz {{ui:contextMenu.selectAll}}. |
| Otworzyć menu prawego przycisku | Przytrzymaj nieruchomo palec na bryle albo na pustym miejscu przez pół sekundy. |
| Przesunąć bryłę | Przeciągnij ją. |
| Zmienić rozmiar bryły, obrócić ją albo podnieść | Przeciągnij jej uchwyty, małe kwadraty i strzałki wokół niej. Palec łapie je także trochę obok. |
| Obrócić widok | Jeden palec na pustym miejscu albo przeciągnięcie kostki widoku. |
| Przybliżyć widok | Dwa palce: rozsuń, aby się zbliżyć, ściągnij, aby się oddalić. |
| Przesunąć widok | Przesuń dwa palce razem. |
| Wyczyścić zaznaczenie | Stuknij puste miejsce. Nie, gdy włączone jest {{ui:camera.touchRotate}}, bo wtedy jeden palec obraca widok; a w trybie {{ui:contextMenu.selectMultiple}} pierwsze stuknięcie w puste miejsce tylko kończy tryb i zostawia zaznaczenie, dopiero następne je czyści. |

## Zaznaczanie kilku brył

Bez klawisza Shift {{ui:contextMenu.selectMultiple}} w menu długiego przytrzymania robi to, co na komputerze Shift+klik. Dopóki jest włączone, informuje o tym komunikat, a każde stuknięcie bryły dodaje ją do zaznaczenia albo ją z niego usuwa. Stuknięcie pustego miejsca albo [[Esc]] na klawiaturze kończy ten tryb i zostawia zaznaczenie bez zmian. Palec na pustym miejscu w tym czasie nadal obraca widok. Potem {{ui:editor.tool.group}}, {{ui:editor.tool.align}} albo przesunięcie działają na wszystkie wybrane bryły.

To samo menu ma {{ui:contextMenu.carry}}, czyli klawisz [[C]] dla ekranu dotykowego. Zaznaczenie podąża wtedy za palcem po ścianach innych brył, a stuknięcie odkłada je na ścianę, którą stukniesz, także skośną. Wystarczy pierwsze stuknięcie. Tę pozycję menu znajdziesz też, szukając „odłóż” albo „cruise” (wyszukiwanie poleceń, [[Ctrl]]+[[K]] na klawiaturze).

## Obracanie i przybliżanie widoku

Jeden palec na pustym miejscu obraca widok, dwa palce go przybliżają i przesuwają. Palec, który zaczyna ruch na bryle, działa na bryłę, a nie na widok. Jeśli wolisz, żeby obracał widok, włącz {{ui:camera.touchRotate}} na pasku kamery: jeden palec obraca wtedy widok zamiast zaznaczać, niezależnie od tego, gdzie zaczyna. Ten przełącznik pojawia się tylko na urządzeniu z ekranem dotykowym.

Kostka widoku w lewym górnym rogu obraca widok, gdy ją przeciągasz, a stuknięcie jednej z jej ścian, narożników albo krawędzi przeskakuje do tego widoku. Zobacz [Widok i płaszczyzna robocza](chapter:view-and-workplane).

## Uchwyty, małe punkty i rysik

Opuszek palca zasłania to, w co celuje. layerling pozwala palcowi sięgać do uchwytów, punktów, linii i krawędzi nieco dalej niż wskaźnikowi myszy, ale rysik jest dokładniejszy. Dotyczy to piórka, które tablet rozpoznaje jako piórko, takiego jak Apple Pencil albo S Pen. Zwykły rysik z gumową końcówką ekran traktuje jak palec i nie jest od niego dokładniejszy, więc pracuj nim jak palcem. Gdy Apple Pencil zawisa nad przyciskiem na iPadzie, po chwili jego nazwa pojawia się w małej chmurce, tak jak podpowiedź przy myszy.

Jeśli bryły się przesuwają, gdy dotykają ich dzieci albo pośpieszne ręce, włącz w ustawieniach {{ui:workspace.selectBeforeMoving}}: bryłę trzeba wtedy najpierw zaznaczyć, a dopiero następne przeciągnięcie ją przesuwa.

## Na iPadzie albo iPhonie

- **Zainstaluj go jako aplikację.** W Safari stuknij ikonę Udostępnij i wybierz „Do ekranu początkowego”. Aplikacja otwiera się we własnym oknie bez paska adresu i działa bez połączenia, zobacz [Offline i instalacja](chapter:offline-and-install).
- **Twoje projekty mieszkają w przeglądarce** (chyba że sam hostujesz layerling i skonfigurujesz folder na serwerze). Nie ma konta i nic nie jest wysyłane. Safari ma własną zasadę przeciw śledzeniu: usuwa to, co strona zapisała, po siedmiu dniach, w których jej nie odwiedzałeś w Safari. Aplikacja internetowa dodana do ekranu początkowego jest z tej zasady wyłączona, jak opisuje to WebKit. To jeszcze jeden powód, żeby używać aplikacji z ekranu początkowego i robić kopie zapasowe ważnej pracy: {{ui:dashboard.backupAll}} na stronie startowej pakuje wszystkie projekty do jednego pliku.
- **Pliki.** Safari pozwala stronie zapisywać do pliku tylko przez pobieranie, więc {{ui:editor.export}} kładzie plik do folderu Pobrane w aplikacji Pliki, a [[Ctrl]]+[[S]] na klawiaturze pobiera go ponownie. Zobacz [Pliki i zapis](chapter:files-and-saving).
- **Klawiatura nie jest potrzebna.** Każde narzędzie ma przycisk na wstążce, a pole liczbowe otwiera klawiaturę ekranową. Klawiatura podłączona do iPada dodaje [skróty klawiszowe](chapter:shortcuts). Pole wartości obok bryły otwiera swoje pole liczbowe dopiero drugim stuknięciem: pierwsze tylko je zaznacza, więc palec, który tam przypadkiem trafi, nie wywoła klawiatury.

## Warsztaty z dziećmi

Palce i rysiki z gumową końcówką działają tu tak samo. Dwa ustawienia ułatwiają pracę z klasą: {{ui:workspace.selectBeforeMoving}}, żeby dotyk przypadkiem nie przesuwał bryły, i {{ui:camera.touchRotate}}, żeby jeden palec zawsze obracał widok. Przycisk ze znakiem zapytania w grupie Pomoc na wstążce włącza {{ui:interactiveHelp.title}}: stuknięcie dowolnego przycisku, pola albo uchwytu je wtedy objaśnia, a ten sam przycisk albo [[Esc]] wychodzi z tego trybu.

Dla całej klasy włącz w ustawieniach {{ui:workspace.simpleMode}}. Wstążka zachowuje wtedy tylko narzędzia używane na warsztatach (kopiuj, wklej, duplikuj, usuń, cofnij, grupuj, odbicie lustrzane, fazowanie, zaokrąglenie, wydrąż, wyrównaj, eksport), biblioteka kształtów ma krótką listę, przyciski są większe, a strona startowa pokazuje projekty i nic więcej: bez nowości, tekstu powitalnego, przycisków pomocy i odnośników poza layerling. Włączenie to jedno stuknięcie, a wyłączenie to przytrzymanie przez dwie sekundy przycisku, który pojawia się w jego miejscu. Odnośnik kończący się na `?mode=simple` włącza go na urządzeniu, które go otworzy, a `?mode=full` znów go wyłącza. Kto prowadzi layerling na serwerze, może uruchamiać w nim wszystkich przez `LAYERLING_SIMPLE_MODE=true` albo ustawić go na stałe dla wszystkich przez `always`, tak że program nie ma przełącznika do wyjścia. Zobacz README.
