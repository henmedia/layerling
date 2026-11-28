---
title: Częste pytania
summary: Krótkie odpowiedzi na najczęstsze pytania o zapisywanie, duże modele, zaokrąglenia, AI i druk, każda z drogą do pełnego wyjaśnienia.
contents: questions
---

Każda odpowiedź jest krótka i kończy się wskazaniem miejsca w tym przewodniku, które wyjaśnia wszystko w całości. Pole wyszukiwania na górze znajdzie pytanie po dowolnym słowie, które w nim jest.

## Zapisywanie i kopie zapasowe

### Gdzie są zapisane moje projekty i czy jest chmura?

W przeglądarce na Twoim własnym komputerze. Nie ma konta ani chmury, nic nie jest wysyłane, a każda zmiana zapisuje się sama. Kto uruchamia layerling na własnym serwerze, może też trzymać tam projekty we wspólnym folderze.

Więcej: [Gdzie mieszkają Twoje projekty](chapter:files-and-saving#gdzie-mieszkaja-twoje-projekty)

### Moje projekty zniknęły. Co się stało?

Projekty są w jednej przeglądarce na jednym komputerze. Znikają, gdy wyczyszczono dane przeglądarki dla tej strony, i nie pojawiają się w innej przeglądarce ani na innym komputerze. Safari na Macu, iPhonie i iPadzie usuwa dane strony po siedmiu dniach bez odwiedzin, chyba że layerling jest zainstalowany jako aplikacja. Jeśli masz kopię zapasową, {{ui:dashboard.restoreBackup}} na stronie startowej przywraca projekty razem z folderami i obrazami.

Więcej: [Twoje projekty, twoja kopia](chapter:files-and-saving#twoje-projekty-twoja-kopia)

### Jak zrobić kopię wszystkiego, także automatycznie do folderu?

{{ui:dashboard.backupAll}} na stronie startowej pakuje wszystkie projekty do jednego pliku ZIP. Poza tym layerling sam przechowuje wcześniejsze wersje każdego projektu, a w Chrome i Edge może zapisywać każdą z nich jako plik .lyl w wybranym przez Ciebie folderze. Wersje przechowywane w przeglądarce znikają razem z danymi przeglądarki, więc nie zastępują pliku ZIP ani folderu.

Więcej: [Wcześniejsze wersje](chapter:files-and-saving#wczesniejsze-wersje)

### Jak przenieść projekt na inny komputer lub do innej przeglądarki?

Zapisz go w oknie eksportu jako plik .lyl i otwórz ten plik na drugim komputerze ze strony startowej. Aby przenieść wszystkie projekty naraz, użyj tutaj {{ui:dashboard.backupAll}}, a tam {{ui:dashboard.restoreBackup}}; projekty, które już tam są, nie zostaną dodane drugi raz.

Więcej: [Kopie zapasowe i przekazywanie](chapter:files-and-saving#kopie-zapasowe-i-przekazywanie)

### Co się stanie, gdy wyczyszczę dane przeglądarki?

Projekty zapisane w tej przeglądarce zostaną usunięte, a także wcześniejsze wersje, które layerling tam przechowywał. Plik ZIP z {{ui:dashboard.backupAll}}, Twoje pliki .lyl i folder kopii na dysku pozostają nietknięte. Najpierw zrób kopię, potem czyść.

Więcej: [Twoje projekty, twoja kopia](chapter:files-and-saving#twoje-projekty-twoja-kopia)

### Jak wrócić do wcześniejszego stanu?

Cofanie idzie krok po kroku. Widok historii pokazuje suwakiem każdy krok bez zmieniania projektu i z każdego z nich potrafi zrobić nowy projekt. Gdy potrzebujesz stanu z dzisiejszego poranka albo z zeszłego tygodnia, lista wcześniejszych wersji otwiera starą wersję jako nowy projekt, a obecny zostawia bez zmian.

Więcej: [Spojrzenie wstecz: widok historii](chapter:select-and-arrange#spojrzenie-wstecz-widok-historii) i [Wcześniejsze wersje](chapter:files-and-saving#wczesniejsze-wersje)

### Czy STL i 3MF mogą trafiać prosto do folderu mojego projektu? I jak znów dostać zwykłe pobieranie?

W Chrome i Edge pierwszy eksport projektu pyta, gdzie zapisać, a kolejne eksporty bez pytania zapisują do tego samego pliku. Firefox i Safari zawsze pobierają. Jeśli chcesz za każdym razem pobierać plik, włącz w ustawieniach {{ui:workspace.stlAsDownload}}.

Więcej: [Eksport](chapter:files-and-saving#eksport)

### Okno zapisu się zamknęło, a pliku nie ma. Dlaczego?

Okno, którego przeglądarka nie mogła użyć, zgłasza ona tak samo jak okno, które anulujesz. Nie da się też zapisać pliku, który blokuje program antywirusowy. Komunikat u góry proponuje wtedy {{ui:status.saveAsDownload}}, co umieszcza plik w pobranych. Aby całkiem pominąć to okno, włącz w ustawieniach {{ui:workspace.lylAsDownload}} i {{ui:workspace.stlAsDownload}}.

Więcej: [Kopie zapasowe i przekazywanie](chapter:files-and-saving#kopie-zapasowe-i-przekazywanie)

## Instalacja i aktualizacje

### Czy jest aplikacja do pobrania?

layerling instaluje się z przeglądarki: ma wtedy własną ikonę i własne okno i uruchamia się bez sieci. Nie ma instalatora do pobrania, a oryginał jest tylko na layerling.com. **Nie pobieraj ani nie uruchamiaj instalatora „layerling” z żadnej innej strony:** nie pochodzi od layerlinga i może zawierać złośliwe oprogramowanie. Do uruchomienia własnej kopii służy szybki start dla Windows i obraz Docker.

Więcej: [Instalacja jako aplikacja](chapter:offline-and-install#instalacja-jako-aplikacja) i [Własna instalacja](chapter:offline-and-install#wlasna-instalacja)

### Czy layerling działa bez internetu?

Tak, po pierwszej wizycie uruchamia się bez sieci, najlepiej zainstalowany jako aplikacja. Jedna rzecz jest wczytywana dopiero wtedy, gdy jest po raz pierwszy potrzebna: jądro CAD do pierwszego eksportu STEP, około 22 MB.

Więcej: [Instalacja jako aplikacja](chapter:offline-and-install#instalacja-jako-aplikacja)

### Jak dostać aktualizację?

Sama przychodzi. Otwarta strona zauważa nową wersję i pokazuje kartę z nowościami; {{ui:newVersion.reload}} najpierw zapisuje otwarty projekt, a potem wczytuje nową wersję. Nowszą wersję pokazuje też strona startowa.

Więcej: [Aktualizacje](chapter:offline-and-install#aktualizacje)

### Jakie przeglądarki i tablety działają?

Chrome, Edge, Firefox i Safari, na komputerze, tablecie lub telefonie; widok 3D wymaga WebGL. Kilka rzeczy potrafią tylko Chrome i Edge: zapisywanie do Twoich własnych plików i folderów, folder kopii oraz otwieranie plików .lyl dwukrotnym kliknięciem. Na tablecie palec robi to, co lewy przycisk myszy.

Więcej: [Palce i rysik](chapter:tablet-and-touch#palce-i-rysik)

## AI

### Jak najprościej skonfigurować AI?

Podaj AI, która potrafi pracować na Twoim komputerze, adres `https://github.com/henmedia/layerling` i poproś, żeby skonfigurowała dla Ciebie layerling z jego serwerem MCP. Potrzebuje do tego programu, na przykład karty Code w aplikacji Claude, Claude Code, Codex, Antigravity, Gemini CLI albo Grok Build. Dla Windows i Maca przewodnik zawiera też poszczególne kroki.

Więcej: [Krok po kroku dla początkujących](chapter:ai-with-mcp#krok-po-kroku-dla-poczatkujacych)

### Dlaczego AI nie może się połączyć z layerling.com?

Most między AI a edytorem istnieje tylko w kopii layerlinga, która działa na Twoim własnym komputerze. Na layerling.com jest zawsze wyłączony, a czat w przeglądarce niczego nie zainstaluje. AI potrzebuje więc layerlinga uruchomionego lokalnie i programu, który obsługuje MCP.

Więcej: [Konfiguracja](chapter:ai-with-mcp#konfiguracja)

### Czy zainstalowana aplikacja to kopia lokalna?

Nie, jeśli zainstalowano ją z layerling.com: to nadal layerling.com we własnym oknie, nawet jeśli uruchamia się też bez internetu. Przy kopii lokalnej na Twoim komputerze działa mały serwer i to przez niego AI rozmawia z edytorem po MCP; aplikacja webowa takiego serwera nie ma. Po szybkim starcie Twoja własna kopia działa pod adresem `http://127.0.0.1:3000/`.

Więcej: [Konfiguracja](chapter:ai-with-mcp#konfiguracja)

### Która AI działa i ile to kosztuje?

Każdy program, który obsługuje MCP; przewodnik opisuje Claude, Codex, Gemini, Antigravity i Grok Build. Czat na stronie internetowej lub w aplikacji na telefon nie dotrze do layerlinga, bo nie może niczego uruchomić na Twoim komputerze. Sam layerling nic nie kosztuje. O cenie AI decyduje jej dostawca: na przykład karta Code w aplikacji Claude należy do płatnych planów Claude.

Więcej: [Konfiguracja](chapter:ai-with-mcp#konfiguracja)

### Jakie dane trafiają do dostawcy AI?

To, co AI czyta: obiekty otwartego projektu i zdjęcia widoku, które robi. Trafiają one do dostawcy Twojego programu AI tak samo jak wszystko inne, co tam wpisujesz. Sam most działa na Twoim komputerze, a bez AI nic go nie opuszcza.

Więcej: [Co potrafi AI](chapter:ai-with-mcp#co-potrafi-ai)

## Pamięć, szybkość i historia

### Dlaczego layerling zwalnia przy moim STL?

STL to siatka z trójkątów, a bardzo duża siatka spowalnia edytor, zajmuje dużo pamięci i spowalnia zapisywanie. layerling mówi o tym po imporcie, od 400 000 trójkątów w jednej siatce lub od miliona w całym projekcie. Najpierw uprość siatkę, importuj tylko potrzebne części albo zbuduj część z własnych kształtów layerlinga.

Więcej: [Duże siatki](chapter:files-and-saving#duze-siatki)

### Dlaczego w mojej historii brakuje kroków?

Skracają ją dwie rzeczy. Ustawienie {{ui:workspace.savedHistory}} zachowuje 100 kroków na projekt, dopóki go nie zmienisz, a starsze są odrzucane. A gdy projekt jest za duży, żeby zapisać go z całą historią, layerling zapisuje go z połową kroków, potem znów z połową, i informuje Cię o tym. Sam projekt zawsze zapisuje się w całości.

Więcej: [Zapisana historia](chapter:view-and-workplane#zapisana-historia)

### Co zrobić, gdy pamięć przeglądarki jest pełna?

Nie zamykaj ani nie odświeżaj karty: Twoje najnowsze zmiany są tylko w niej. Najpierw zachowaj kopię, eksportując jako .lyl. Potem zrób miejsce: usuń kroki w widoku historii, usuń projekty, których już nie potrzebujesz, albo zrób ich kopię i usuń je.

Więcej: [Twoje projekty, twoja kopia](chapter:files-and-saving#twoje-projekty-twoja-kopia)

### Mój projekt jest za duży, żeby go zapisać. Co teraz?

Jego historia i siatki razem zajmują za dużo miejsca. Zanim layerling o tym powie, próbował już z mniejszą liczbą kroków historii. Usuń historię w widoku historii, uprość najcięższe zaimportowane siatki albo zapisz .lyl tylko z obecnym stanem.

Więcej: [Kopie zapasowe i przekazywanie](chapter:files-and-saving#kopie-zapasowe-i-przekazywanie) i [Upraszczanie zaimportowanej siatki](chapter:files-and-saving#upraszczanie-zaimportowanej-siatki)

### Przeglądarce zabrakło pamięci. Co pomaga?

Dzieje się tak przy siatkach z milionami trójkątów, gdy jeden krok potrzebuje więcej pamięci, niż dostaje karta przeglądarki. Zmniejsz liczbę trójkątów w zaimportowanych siatkach za pomocą {{ui:editor.tool.simplify}}, zamknij inne karty i spróbuj ponownie. Jeśli dzieje się to przy zapisywaniu, pomaga też krótsza historia.

Więcej: [Duże siatki](chapter:files-and-saving#duze-siatki)

### Projekt otwiera się bardzo wolno albo wcale. Co mogę zrobić?

Najczęściej jego historia kroków cofania bardzo się rozrosła. {{ui:dashboard.openWithoutHistory}} w menu projektu na stronie startowej wczytuje tylko obecny stan; wcześniejsze kroki usuwa na stałe, więc jeśli chcesz je zachować, najpierw zrób kopię projektu. Wcześniejsza wersja z kopii zapasowych otwiera się jako nowy projekt.

Więcej: [Kopie zapasowe i przekazywanie](chapter:files-and-saving#kopie-zapasowe-i-przekazywanie)

### layerling się przycina. Które ustawienia pomagają?

{{ui:workspace.fastMode}} w ustawieniach wyłącza cienie, linie krawędzi na wszystkich bryłach i bezwładność kamery oraz rysuje widok tylko w rozdzielczości ekranu. Sprawdź, czy przeglądarka używa karty graficznej: na stronie `chrome://gpu` lub `edge://gpu` obok WebGL powinno być „Hardware accelerated”. Drugą częstą przyczyną są duże zaimportowane siatki.

Więcej: [Gdy layerling działa wolno](chapter:view-and-workplane#gdy-layerling-dziala-wolno)

### Edytor stoi w miejscu albo długo liczy. Czekać czy odświeżyć?

Najpierw poczekaj. Cięcia, grupowanie i obróbka krawędzi są liczone w tle, a w tym czasie widać {{ui:status.computing}}; długie zadania, takie jak drążenie, same się przerywają z komunikatem i niczego nie zmieniają. Jeśli jądro CAD trzeba było uruchomić ponownie, komunikat o tym mówi i nie trzeba odświeżać strony. Odświeżenie jest bezpieczne, bo każda zmiana zapisuje się sama, z jednym wyjątkiem: dopóki widać czerwone ostrzeżenie {{ui:notice.designNotSavedTitle}}, najpierw wyeksportuj .lyl.

Więcej: [Gdy layerling działa wolno](chapter:view-and-workplane#gdy-layerling-dziala-wolno)

### Widok 3D pozostaje pusty albo komunikat mówi, że nie udało się go uruchomić. Co teraz?

Przeglądarka nie mogła uruchomić WebGL, które rysuje widok 3D. Przyczyna leży w przeglądarce albo w sterowniku karty graficznej, a nie w Twoim projekcie, i Twoje zapisane projekty nie są usuwane. Zamknij inne karty z treścią 3D i uruchom przeglądarkę ponownie, włącz przyspieszenie sprzętowe, zezwól na WebGL, jeśli blokuje je ustawienie prywatności lub rozszerzenie, oraz zaktualizuj przeglądarkę i sterownik karty graficznej. Szybkim testem jest inna przeglądarka.

Więcej: [Gdy layerling działa wolno](chapter:view-and-workplane#gdy-layerling-dziala-wolno)

## Zaimportowane modele

### „Uprość siatkę” czy „Uczyń dokładnym”: co wybrać?

{{ui:editor.tool.simplify}} zachowuje część trójkątów, więc ciężki model staje się lżejszy; nadal jest siatką. {{ui:editor.tool.makeExact}} odbudowuje model złożony z płaszczyzn, walców, stożków i kul jako prawdziwą bryłę CAD, dzięki czemu zaokrąglenia i fazki idą po czystych krawędziach, a eksport STEP zawiera prawdziwe powierzchnie. Przyjmuje do 400 000 trójkątów; figurka albo skan zostaje siatką. Przy dużej części technicznej: najpierw uprość z włączoną opcją {{ui:simplify.keepEdges}}, a potem uczyń ją dokładną.

Więcej: [Upraszczanie zaimportowanej siatki](chapter:files-and-saving#upraszczanie-zaimportowanej-siatki) i [Zamiana zaimportowanej siatki na dokładną bryłę](chapter:files-and-saving#zamiana-zaimportowanej-siatki-na-dokladna-bryle)

### Dlaczego cięcie się nie udaje albo dlaczego moja siatka „nie jest szczelna”?

Bryłę można ciąć tylko wtedy, gdy jej powierzchnia jest zamknięta. Jeśli zaimportowana siatka ma luki, layerling podaje nazwę części i liczbę otwartych krawędzi i ją pomija. Małe dziury zamyka sam; większe trzeba naprawić w programie, z którego pochodzi model, albo w narzędziu do naprawy siatek. Sprawdzanie wydruku pokazuje, która bryła jest otwarta.

Więcej: [Sprawdzanie wydruku](chapter:printing#sprawdzanie-wydruku)

### Jak poprawnie zaimportować SVG?

SVG trafia do projektu jako bryła ze szkicu o wysokości 4 mm, a jej punkty można zmieniać w trybie szkicu. Przed importem wpisz w oknie importu szerokość w milimetrach; bez liczby zachowa własny rozmiar. Kontury, które przecinają same siebie, nie mogą stać się bryłą, więc są pomijane i liczone: połącz nakładające się kawałki i zamknij kontury w programie graficznym, a potem zaimportuj ponownie.

Więcej: [Import](chapter:files-and-saving#import)

## Zaokrąglenia i fazki

### Dlaczego nie można zastosować zaokrąglenia?

Najczęściej jest za duże dla tego miejsca: weszłoby w sąsiednie powierzchnie albo krawędź zakręca ciaśniej niż promień. Często wystarcza o jeden lub dwa milimetry mniej, a przy ostrych kątach zaokrąglenie potrzebuje więcej miejsca, niż sugeruje jego promień. Jeśli krawędzi nie da się zaokrąglić razem, bierz ich mniej naraz; krawędź, która przeszkadza, jest rysowana na czerwono. {{ui:edge.findLargest}} szuka rozmiaru za Ciebie.

Więcej: [Fazowanie i zaokrąglanie krawędzi](chapter:edges-and-hollowing#fazowanie-i-zaokraglanie-krawedzi)

### Dlaczego po zmianie szkicu zniknęły moje zaokrąglenia?

Po {{ui:inspector.editSketch}} bryła jest budowana od nowa i ma nowe krawędzie. layerling nakłada zaokrąglenia i fazki ponownie na krawędzie leżące tam, gdzie leżały stare, o ile bryła ma tyle samo krawędzi co wcześniej. Gdy ma o jeden narożnik więcej lub mniej, są pomijane, a komunikat mówi, ile ich jest. Cofnięcie przywraca wszystko.

Więcej: [Robienie z tego bryły](chapter:sketches#robienie-z-tego-bryly)

### Dlaczego nie mogę wybrać niektórych krawędzi zaimportowanego modelu?

STL, OBJ i 3MF zawierają tylko trójkąty, a narzędzia krawędzi działają na siatkach do 4 000 trójkątów. {{ui:editor.tool.makeExact}} zamienia część techniczną w prawdziwą bryłę CAD, na której otwór ma jedną okrągłą krawędź, za którą może pójść zaokrąglenie. Plik STEP od początku zawiera dokładną geometrię.

Więcej: [Zamiana zaimportowanej siatki na dokładną bryłę](chapter:files-and-saving#zamiana-zaimportowanej-siatki-na-dokladna-bryle)

## Grupy, otwory i wymiary

### Dlaczego otwory robią się owalne, gdy rozciągam grupę?

Grupa, której zmieniasz rozmiar, rozciąga wszystko, co w niej jest, jakby było narysowane na gumie. W ustawieniach grupy, w polu {{ui:inspector.groupResize}}, wybierz {{ui:inspector.groupResizeKeepParts}}: części sięgające przez całą grupę się rozciągają, a otwory i małe części zachowują rozmiar i odległość od bliższego boku.

Więcej: [Zmiana rozmiaru grupy: otwory i małe części zostają](chapter:solids-and-holes#zmiana-rozmiaru-grupy-otwory-i-male-czesci-zostaja)

### Dlaczego grupowanie się nie udaje albo dlaczego wynik ma luki?

Albo któraś część nie jest zamknięta, o czym mówi komunikat, podając jej nazwę, albo dwie części prawie się spotykają, ale tak naprawdę się nie stykają. Rozgrupuj, wyrównaj części dokładnie albo trochę zmień rozmiar lub położenie i zgrupuj ponownie. Bardzo gęste siatki powyżej limitu cięcia zaimportowanych siatek w ogóle nie są łączone.

Więcej: [Grupowanie](chapter:solids-and-holes#grupowanie)

### Jak zmienić jedną część wewnątrz grupy?

Zaznacz grupę i naciśnij [[E]] albo kliknij ją dwukrotnie. Części leżą wtedy osobno i można je zmieniać; po zakończeniu grupa jest budowana od nowa. Zaokrąglenia i fazki nałożone na całą grupę przepadają przy jej ponownym budowaniu.

Więcej: [Edycja grupy](chapter:solids-and-holes#edycja-grupy)

### Jak odzyskać jedną część z wcześniejszego stanu?

Otwórz widok historii, przesuń suwak na stan, w którym ta część jeszcze była, kliknij ją i wybierz {{ui:historyView.bringBack}}. W obecnym projekcie pojawia się jej kopia, taka jaka była i tam, gdzie była, z godziną w nazwie.

Więcej: [Spojrzenie wstecz: widok historii](chapter:select-and-arrange#spojrzenie-wstecz-widok-historii)

## Druk i eksport

### STL, 3MF, OBJ czy STEP: co wybrać?

Dla drukarki 3MF albo STL. 3MF zachowuje każdą bryłę jako część z nazwą i kolorem; STL to jedna siatka w jednym kolorze. OBJ też przenosi kolory. STEP jest dla innych programów CAD: zawiera dokładną geometrię z zaokrągleniami i fazkami.

Więcej: [Eksport](chapter:files-and-saving#eksport)

### Jak przenieść moje kolory do slicera?

Wyeksportuj 3MF. Każda bryła zachowuje swój kolor, a bryła pomalowana w kilku kolorach ma te kolory na swoich powierzchniach. Bambu Studio i OrcaSlicer pytają przy otwieraniu, jak przypisać kolory do Twoich filamentów.

Więcej: [Malowanie w wielu kolorach](chapter:shapes#malowanie-w-wielu-kolorach)

### Moje części nie pasują do siebie. Ile luzu potrzebują?

Zwykle od 0,2 do 0,4 mm, zależnie od drukarki. Mierzy to test pasowania: wydrukuj małą płytkę z siedmioma otworami, znajdź najciaśniejszy otwór, w którym trzpień jeszcze się obraca, i wpisz tę wartość jako luz swojej drukarki. Nowe pokrywki, jaskółcze ogony i gwinty zaczynają wtedy od niej.

Więcej: [Luz twojej drukarki: test pasowania](chapter:printing#luz-twojej-drukarki-test-pasowania)

### Dlaczego layerling mówi, że część nie mieści się w drukarce?

Część wystaje poza krawędź płyty albo jest wyższa, niż potrafi wydrukować wybrana drukarka. To tylko wskazówka i można ją zamknąć. Wybierz swoją drukarkę w ustawieniach albo przetnij zbyt dużą część za pomocą {{ui:editor.tool.split}}.

Więcej: [Gdy coś się nie mieści](chapter:printing#gdy-cos-sie-nie-miesci)

## O layerlingu

### Czy layerling jest darmowy i czy mogę sprzedawać to, co w nim zaprojektuję?

layerling to wolne oprogramowanie na licencji AGPL-3.0, bez konta. Licencja dotyczy programu: kto zmienia layerling i udostępnia go innym przez sieć, musi udostępnić też kod źródłowy. Dla modeli, które tworzysz, nie stawia żadnych warunków. Czcionki i modele, które importujesz, zachowują własne licencje.

Jeśli chcesz wesprzeć projekt, [drobna wpłata](support:) pomaga pokryć koszty serwera i rozwoju. Jest dobrowolna i nic w layerlingu od niej nie zależy.

Więcej: [Własna instalacja](chapter:offline-and-install#wlasna-instalacja)

### Jak zgłosić błąd albo o coś poprosić?

{{ui:editor.bugReport}} w stopce zapisuje plik ZIP z projektem i krótkim tekstem o wersji i przeglądarce; nie ma w nim nic osobistego. Dołącz go na forum albo w dyskusjach na GitHubie. Pytania i życzenia są mile widziane w obu miejscach.

Więcej: [Zgłaszanie błędu](chapter:files-and-saving#zglaszanie-bledu) i [Pomoc i opinie](chapter:offline-and-install#pomoc-i-opinie)
