---
title: Pierwsze kroki
summary: Od pustej kartki do pierwszej części na drukarkę 3D w pięć minut, bez konta i bez instalowania czegokolwiek.
---

layerling to program do projektowania na potrzeby druku 3D, który działa wprost w przeglądarce. Część budujesz z prostych kształtów, wycinasz w niej otwory, zaokrąglasz krawędzie i wysyłasz ją do slicera. Niczego nie trzeba instalować ani zakładać konta. To, co zbudujesz, zostaje na Twoim komputerze.

![Strona startowa layerling: na górze przycisk nowego projektu 3D, poniżej Twoje projekty i krótki przewodnik.](shot:start-page)

## Tworzenie projektu

Otwórz [layerling.com](https://layerling.com/). Na stronie startowej kliknij {{ui:dashboard.createDesign}}. Otworzy się edytor z pustą płaszczyzną roboczą, czyli siatką, na której wszystko nabiera kształtu.

Jeśli masz już plik, nad którym chcesz pracować dalej, użyj {{ui:dashboard.importGeometry}}. Działa to z projektami layerling (`.lyl`), a także z plikami STL, OBJ, 3MF, STEP i SVG.

Wszystkie Twoje projekty pojawiają się potem na stronie startowej z obrazkiem podglądu. Są przechowywane w pamięci przeglądarki i zapisywane automatycznie po każdej zmianie, dlatego nie ma przycisku zapisu. **layerling nie ponosi odpowiedzialności za projekty przechowywane w przeglądarce.** Przeglądarka może zawieść, a jej aktualizacja może narobić kłopotów, więc co jakiś czas rób kopię zapasową projektów przyciskiem {{ui:dashboard.backupAll}} na stronie startowej albo zapisuj je jako pliki. Kopię przywraca {{ui:dashboard.restoreBackup}}. Jak spakować projekty do pliku i komuś je przekazać, opisuje rozdział [Pliki i zapis](chapter:files-and-saving). Jeśli chcesz mieć przypomnienie, włącz {{ui:workspace.confirmTabClose}} w ustawieniach (koło zębate na wstążce): przeglądarka zapyta wtedy przed zamknięciem lub odświeżeniem karty z otwartym projektem.

## Edytor w skrócie

![Edytor z dwoma kształtami na płaszczyźnie roboczej. Na górze wstążka, po lewej sterowanie kamerą, po prawej ustawienia zaznaczonego kształtu.](shot:editor-overview)

- **Na górze** jest wstążka. Jest podzielona według zadań: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}} i {{ui:editor.group.file}}. {{ui:editor.group.help}} jest nad nią w wierszu tytułu, a domek obok kart prowadzi z powrotem na stronę startową. Gdy okno jest za wąskie na wszystkie grupy, najrzadziej używane zwijają się do jednego przycisku pod swoją nazwą: wskaż go albo stuknij, a jego narzędzia otworzą się pod nim. Pinezka w prawym górnym rogu, na lewo od lupy, trzyma zamiast tego wszystkie grupy otwarte. Najedź na ikonę, aby zobaczyć jej nazwę, także na wyszarzoną. {{ui:interactiveHelp.title}} (znak zapytania pod {{ui:editor.group.help}} albo Shift+F1) objaśnia każdą z nich jednym kliknięciem i prowadzi do jej części tej instrukcji. Gdziekolwiek widzisz mały znak zapytania, na przykład w ustawieniach kształtu, w bibliotece kształtów albo w panelach narzędzi, prowadzi on prosto do pasującego rozdziału tej instrukcji.
- **Na środku** leży płaszczyzna robocza. Tu umieszczasz kształty, nadajesz im formę i oglądasz wynik.
- **Po prawej** pojawiają się ustawienia zaznaczonego kształtu: kolor, wymiary, pozycja i wszystko inne, co go tworzy. Wpisywanie liczb jest dokładniejsze niż przeciąganie.
- **Po lewej** jest sterowanie kamerą, a nad nim kostka widoku. Służą do poruszania się po scenie, więcej w rozdziale [Widok i płaszczyzna robocza](chapter:view-and-workplane).
- **Na samej górze** przełączasz między {{ui:editor.modeGeometry}} a {{ui:editor.modeSketch}}, zmieniasz nazwę projektu oraz wybierasz język i motyw kolorów.

## Przyciski wokół obszaru roboczego

Najedź na przycisk, aby zobaczyć jego nazwę. Jeśli nie wiesz, co robi dany przycisk, kliknij {{ui:interactiveHelp.title}} w sekcji {{ui:editor.group.help}} ([[Shift]]+[[F1]]), a potem ten przycisk. Oto te, o które ludzie pytają najczęściej.

### Wklej

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) dodaje do projektu to, co skopiowałeś przyciskiem {{ui:editor.tool.copy}}. {{ui:common.duplicate}} kopiuje i wkleja w jednym kroku. Wklejenie stawia każdą część trochę obok miejsca, w którym była. Części pochodzące z innego programu mogą wylądować daleko od płyty i dla nich jest w ustawieniach, w sekcji {{ui:workspace.appearance}}, opcja {{ui:workspace.pasteCentered}}: wklejenie stawia wtedy części razem na środku płaszczyzny roboczej i opuszcza je na nią.

### Usuń

{{ui:common.delete}} ([[Delete]]) usuwa zaznaczone kształty. {{ui:editor.tool.undo}} je przywraca.

### Rozgrupuj

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) rozkłada zaznaczoną grupę z powrotem na kształty, z których powstała.

### Ustawienia obszaru roboczego

{{ui:editor.workspaceSettings}} otwiera ustawienia obszaru roboczego: jednostkę, rozmiar płyty, drukarkę, siatkę, kolory, światło i więcej. Więcej w rozdziale [Widok i płaszczyzna robocza](chapter:view-and-workplane).

### Motyw

{{ui:common.theme}} na samej górze wybiera wygląd layerling: jak w systemie, jasny, ciemny albo grafitowy.

### Zmiana nazwy projektu

{{ui:editor.renameProject}}: ołówek obok nazwy na samej górze. Wpisz nową nazwę i naciśnij [[Enter]].

### Nazwa projektu

Nazwa projektu ({{ui:confirm.projectName}}) stoi na samej górze. Kliknij ją, wpisz nową, a [[Enter]] ją zachowa.

### Opcje widoczności

{{ui:editor.visibilityOptions}}, czyli strzałka obok ikony oka, zawiera to, co możesz pokazać lub ukryć: listę obiektów, wszystko, co ukryłeś, notatki i nawisy wydruku. Więcej w rozdziale [Zaznaczanie i rozmieszczanie](chapter:select-and-arrange).

### Ukryj zaznaczone

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) ukrywa zaznaczone kształty. Zostają w projekcie i na liście obiektów, a {{ui:editor.visibilityOptions}} pokazuje je z powrotem.

### Szukaj poleceń

{{ui:palette.open}}: wpisz, czego szukasz, narzędzie, kształt albo ustawienie, i kliknij wynik.

### Ukryj sterowanie kamerą

{{ui:camera.hide}} chowa sterowanie kamerą po lewej i daje obszarowi roboczemu więcej miejsca. {{ui:camera.show}} przywraca je z powrotem.

### Siatka przyciągania

{{ui:inspector.snapGrid}} na dole właściwości to krok, do którego przyciąga się przesuwanie i zmiana rozmiaru. Obok niej mały przełącznik **mm | in** zmienia jednostkę. Więcej w rozdziale [Widok i płaszczyzna robocza](chapter:view-and-workplane).

### Jednostka: milimetry albo cale

Przełącznik **mm | in** obok {{ui:inspector.snapGrid}} zmienia dla tego projektu jednostkę, siatkę płyty i krok przyciągania.

### Stopka

Na dole okna: {{ui:dashboard.sponsor}} prowadzi do strony, na której możesz wesprzeć projekt; {{ui:dashboard.userGuide}} otwiera tę instrukcję; {{ui:dashboard.forum}} prowadzi do miejsca na pytania, pomysły i zgłoszenia błędów (dyskusje na GitHubie, a po niemiecku forum drucktipps3d); {{ui:editor.bugReport}} tworzy plik ZIP do zgłoszenia błędu; {{ui:dashboard.projectOnGitHub}} prowadzi do projektu na GitHubie, a numer wersji otwiera listę zmian. Odnośniki do noty prawnej i polityki prywatności należą do tego, kto prowadzi używaną przez Ciebie kopię layerling.

## Twoja pierwsza część

Jako przykład zbudujemy sześcian z otworem.

1. Kliknij {{ui:editor.addShape}} na wstążce i wybierz {{ui:shape.box}}. Kształt zawiśnie teraz na wskaźniku myszy. Kliknięcie na płaszczyźnie roboczej go odkłada.
2. Po prawej ustaw wymiary, na przykład 40 mm długości, 40 mm szerokości i 20 mm wysokości.
3. W ten sam sposób umieść na środku {{ui:shape.cylinder}} o średnicy 14 mm i wysokości 30 mm. Powinien być wyższy od sześcianu, żeby przechodził przez niego na wylot.
4. Zaznacz walec i kliknij po prawej {{ui:inspector.hole}}. Stanie się przezroczysty: bryła zamieniła się w narzędzie, które usuwa materiał.
5. Zaznacz oba kształty i kliknij {{ui:editor.tool.group}}. Sześcian ma teraz otwór.

![Walec jest otworem i wystaje nad górną ścianę sześcianu.](shot:hole-before)

![Po zgrupowaniu sześcian ma otwór na wylot.](shot:hole-after)

Tak powstają otwory, rowki i kieszenie. Szczegółowo wyjaśnia to rozdział [Bryły i otwory](chapter:solids-and-holes).

## Nowości od ostatniej wizyty

Gdy po aktualizacji znów otworzysz layerling, karta na stronie startowej pokaże, co dodano od Twojej ostatniej wizyty: każdą wersję od tamtego czasu, od najnowszej. Po długiej przerwie przewiniesz listę wewnątrz karty. Pod nimi {{ui:whatsNew.earlier}} dokłada też wersje sprzed Twojej ostatniej wizyty. Zamknij kartę przyciskiem {{ui:whatsNew.dismiss}}, a nie pojawi się do następnej aktualizacji. {{ui:whatsNew.footerLink}} w stopce strony startowej w każdej chwili znów pokaże najnowsze zmiany. Przeglądarka zapamiętuje ostatnią wersję, którą widziałeś, i nic o Tobie jej nie opuszcza.

W kopii layerling na Twoim własnym komputerze lub serwerze komunikat „Dostępna aktualizacja” ma przycisk {{ui:update.previewShow}}, który przed instalacją pokazuje, co aktualizacja przynosi. Lista jest pobierana z GitHuba dopiero po naciśnięciu przycisku.

## Od projektu do wydruku

Gdy część jest gotowa, kliknij {{ui:editor.export}}, wybierz STL lub 3MF i pobierz plik. Otwórz go w slicerze, na przykład w Bambu Studio, PrusaSlicer, OrcaSlicer albo Cura. Jeśli wybierzesz swoją drukarkę w ustawieniach, już podczas budowania zobaczysz, czy część mieści się na stole drukarki. Więcej w rozdziale [Drukowanie](chapter:printing).

> **Wskazówka:** Jeśli przychodzisz z Tinkercada, szybko się odnajdziesz: płyta, kształty, bryła i otwór, grupowanie, wyrównywanie i odbicie lustrzane działają prawie tak samo. Nowe są głównie fazowanie i zaokrąglanie, drążenie, gwinty i szkice. Własne projekty z Tinkercada też możesz przenieść, zobacz [Pliki, zapis i udostępnianie](chapter:files-and-saving).
