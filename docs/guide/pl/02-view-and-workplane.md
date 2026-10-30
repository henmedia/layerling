---
title: Widok i płaszczyzna robocza
summary: Poruszanie się po scenie, patrzenie na wprost i umieszczanie nowych kształtów na dowolnej powierzchni.
---

## Poruszanie się

Myszą:

| Co robisz | Co się dzieje |
| --- | --- |
| przeciągasz prawym przyciskiem | obracasz widok |
| klikasz prawym przyciskiem | na bryle menu z najczęstszymi poleceniami: duplikuj, otwór lub bryła, grupuj, ukryj, zablokuj, usuń i inne; na pustym miejscu Wklej i Zaznacz wszystko |
| przeciągasz środkowym przyciskiem | przesuwasz widok |
| kręcisz kółkiem myszy | przybliżasz i oddalasz |
| trzymasz [[Ctrl]] / [[Cmd]] i przeciągasz lewym przyciskiem | też przesuwasz widok (na touchpadzie MacBooka: przytrzymaj [[Cmd]], dociśnij i przeciągnij). Na Macu przytrzymanie zamiast tego Control obraca widok, bo Control-klik to na Macu prawy klik |
| klikasz dwukrotnie pustą płaszczyznę roboczą albo obok płyty | przesuwasz widok tak, żeby to miejsce znalazło się na środku, a widok obraca się potem wokół niego |
| klikasz dwukrotnie puste miejsce płaszczyzny roboczej albo obok płyty | przesuwasz widok tak, że to miejsce jest na środku; potem widok obraca się wokół niego |

Szybkość przybliżania kółkiem ustawia {{ui:workspace.zoomSpeed}} w ustawieniach, w sekcji {{ui:workspace.appearance}}: suwak od 1 do 14, na początek 5. Ustawia on tylko kółko i touchpad: przyciski oraz klawisze [[+]] i [[−]] zawsze przybliżają tymi samymi małymi krokami. Jeden ząbek kółka myszy przybliża tak samo w każdej przeglądarce, a touchpad przybliża zależnie od tego, jak daleko przesuniesz palce.

Na tablecie lub telefonie dwa palce przybliżają (rozsuwanie i ściąganie) i przesuwają widok (przesuwanie razem). Jeden palec na pustym miejscu obraca widok, a stuknięcie tam czyści zaznaczenie. Na kształcie lub uchwycie palec działa na projekt, tak jak lewy przycisk myszy. Aby obracać widok palcem, który zaczyna ruch także na kształcie, włącz {{ui:camera.touchRotate}} na pasku kamery. Ten przełącznik pojawia się na urządzeniach z ekranem dotykowym.

Tablet graficzny z piórkiem zachowuje się jak mysz: końcówka to lewy przycisk, a przycisk na obudowie piórka prawy, do obracania widoku i do menu. Klawisze skrótów tabletu można w jego sterowniku przypisać do [skrótów klawiszowych](chapter:shortcuts) layerling.

**Na tablecie pracuj rysikiem, jeśli tylko możesz.** Jego końcówka jest dużo cieńsza od opuszka palca i nie zasłania tego, w co celujesz. Małe punkty, cienkie linie i uchwyty w szkicu, punkty pomiaru i krawędzie trafiasz więc dokładnie, a dłuższa praca mniej męczy. layerling już teraz pozwala palcowi sięgać do punktów, linii, uchwytów i krawędzi nieco dalej niż wskaźnikowi myszy, ale rysik pozostaje dokładniejszy. Dotyczy to piórka, które tablet rozpoznaje jako piórko (S Pen, Apple Pencil i podobne). Zwykły rysik z gumową końcówką ekran traktuje jak palec i nie jest od niego dokładniejszy.

Tablet nie ma prawego przycisku myszy: przytrzymaj nieruchomo palec przez pół sekundy na kształcie albo na pustym miejscu, a otworzy się to samo menu, co po kliknięciu prawym przyciskiem, na pustym miejscu z poleceniem **Zaznacz wszystko**. **Zaznacz kilka** w tym samym menu zastępuje na tablecie klawisz Shift: każde stuknięcie w bryłę dodaje ją do zaznaczenia albo ją z niego usuwa, aż stukniesz w puste miejsce albo naciśniesz [[Esc]]. Palec na pustym miejscu dalej obraca widok. Uchwyty wokół zaznaczonego kształtu da się złapać palcem także trochę obok nich.

### Kostka widoku

Kostka w lewym górnym rogu pokazuje, skąd patrzysz. Kliknięcie jednej z jej ścian przeskakuje do widoku na wprost z góry, z dołu, z przodu, z tyłu, z lewej albo z prawej. Kliknięcie narożnika kostki pokazuje model ukośnie od tego narożnika, a kliknięcie blisko krawędzi pokazuje go od tej krawędzi, między dwiema ścianami. Miejsce pod wskaźnikiem się podświetla. Widoki na wprost dają też klawisze cyfr od [[1]] do [[6]]. Z wciśniętym [[Shift]] widok dodatkowo przybliża się do zaznaczenia, tak jak po [[Shift]]+[[F]].

Przeciągnij kostkę, aby obrócić widok, tak samo jak przeciąganiem prawym przyciskiem myszy. Gdy nic nie jest zaznaczone, widok obracają też klawisze strzałek: 15° na naciśnięcie, 90° z [[Shift]]. Obracają model w stronę, w którą wskazują: [[→]] obraca jego przód w prawo, [[↑]] przechyla jego przód w górę. Z wciśniętym [[Ctrl]] strzałki zamiast tego przesuwają widok po ekranie: o jedną dziesiątą obrazu na naciśnięcie, o połowę z dodatkowym [[Shift]]. Model przesuwa się w stronę, w którą wskazują. Gdy coś jest zaznaczone, strzałki to przesuwają, więc aby obrócić widok, najpierw kliknij puste miejsce. Na ekranie dotykowym działa to jednym palcem, bez włączania {{ui:camera.touchRotate}}.

### Pasek kamery

Przy lewej krawędzi jest wąski pasek. Od góry:

- {{ui:camera.home}} pokazuje z powrotem całą scenę. Klawisz to [[Home]], a gdy nic nie jest zaznaczone, robi to też [[F]].
- {{ui:camera.focusSelection}} przybliża do zaznaczenia ([[F]] albo [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} i {{ui:camera.zoomOut}} przybliżają krok po kroku, podobnie jak klawisze [[+]] i [[−]].
- {{ui:camera.orthographic}} przełącza na płaski widok, w którym równoległe krawędzie zostają równoległe. Do mierzenia i wyrównywania krawędzi bywa wygodniejszy od widoku perspektywicznego. [[O]] przełącza w obie strony, a drugie kliknięcie przywraca poprzedni widok.
- {{ui:camera.secondView}} otwiera drugi widok projektu we własnym oknie, opisanym niżej. Drugie kliknięcie je zamyka.
- {{ui:camera.hideWorkplane}} (oko nad siatką) ukrywa płytę z siatką, żeby obejrzeć projekt od spodu. Zmienia się tylko widok: nowe kształty dalej trafiają na płaszczyznę roboczą. Drugie kliknięcie pokazuje ją z powrotem.
- {{ui:camera.placeWorkplane}}, narzędzie Zmierz i kątownik to osobne narzędzia, opisane niżej i w rozdziale [Pomiary i notatki](chapter:measuring-and-notes).

Mała strzałka na samej górze paska ukrywa go, jeśli przeszkadza.

Projekt otwiera się tak, jak go zostawiłeś: kąt, przybliżenie i położenie widoku zapamiętuje ta przeglądarka, więc kontynuujesz tam, gdzie skończyłeś, także po powrocie do strony startowej albo zamknięciu strony. Zapisany plik (.lyl) zabiera widok ze sobą, więc także gdzie indziej otworzy się w tym widoku. Widok nie należy do historii cofania.

W każdym projekcie możesz też zachować cztery własne widoki. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] lub [[Shift]]+[[0]] zapisuje widok dokładnie taki, jaki jest - kąt, położenie, przybliżenie oraz widok płaski albo perspektywiczny - pod tym klawiszem, a sam klawisz ([[7]], [[8]], [[9]] lub [[0]]) przywraca go. Komunikat na dole potwierdza zapis; ponowny zapis pod tym samym klawiszem zastępuje widok. Tak jak widok opisany wyżej, zapisane widoki zostają z projektem w tej przeglądarce i są zabierane w zapisanym pliku (.lyl). Nie należą do historii cofania.

### Drugi widok we własnym oknie

{{ui:camera.secondView}} otwiera okno, które pokazuje ten sam projekt przez własną kamerę, więc widzisz go z dwóch stron naraz - na przykład z przodu, gdy pracujesz od góry. Każda zmiana w edytorze od razu się tam pojawia; sam projekt zmienia się tylko w głównym oknie i tam też zostają uchwyty. W drugim oknie mysz i kostka widoku obracają jego widok tak jak tutaj, podobnie klawisze: [[1]] do [[6]], [[F]], [[Home]], [[O]], [[+]] i [[−]], strzałki do obracania i [[Ctrl]] ze strzałkami do przesuwania. [[F]] przybliża tam to, co jest zaznaczone w edytorze. Działają tam też cztery zapisane widoki projektu: [[7]], [[8]], [[9]] i [[0]] je przywracają, a [[Shift]] z jednym z tych klawiszy zapisuje pod nim widok tego okna - dla obu okien. Jego własny pasek kamery ma {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} i {{ui:camera.hideWorkplane}}, które działają tylko na to okno. Okno otwiera się tam, gdzie je zostawiłeś, w tym samym rozmiarze, i zamyka się razem z edytorem. Na telefonach i tabletach przycisk się nie pokazuje.

## Zajrzyj do środka: widok przekroju

{{ui:camera.sectionView}}, ostatni przycisk na pasku (narzędzie cięcia), rozcina widok wzdłuż płaszczyzny, żeby sprawdzić ścianki, wnęki i części, które w siebie wchodzą. Nic nie jest naprawdę cięte: projekt, jego pliki i każdy eksport zostają całe. Tam, gdzie płaszczyzna przechodzi przez bryłę, przekrój jest wypełniony nieco ciemniejszym kolorem bryły, a otwór w niej zostaje pusty, dzięki czemu widać, co jest pełne, a co puste; wypełniona powierzchnia pojawia się chwilę po zatrzymaniu płaszczyzny. W sekcji {{ui:camera.sectionCutFace}} wybierasz wygląd przekroju: {{ui:camera.sectionCutFaceHatch}}, ustawienie domyślne, kreskuje go jak rysunek, a bryła leżąca wewnątrz innej jest kreskowana w drugą stronę, więc obie się od siebie odróżniają; {{ui:camera.sectionCutFaceFill}} wypełnia go jednym kolorem; {{ui:camera.sectionCutFaceOpen}} zostawia go otwartym i widzisz wnętrze powłoki bryły. Wybór obowiązuje dla każdego projektu.

- Wybierz oś, w poprzek której stoi płaszczyzna: X (szerokość), Y (głębokość) albo Z (wysokość), tak jak w polach pozycji. Płaszczyzna zaczyna na środku projektu.
- {{ui:camera.sectionOrientation}} określa, czym kierują się te osie. {{ui:camera.sectionOrientationWorld}} bierze osie projektu. {{ui:camera.sectionOrientationWorkplane}} bierze osie płaszczyzny roboczej: Z tnie wtedy równolegle do niej, X i Y prostopadle, a pozycja liczy się od jej początku. Gdy płaszczyzna robocza leży na pochyłej ścianie, tniesz tak równolegle do tej ściany, a przekrój przesuwa się, gdy przestawisz płaszczyznę roboczą. {{ui:camera.sectionOrientationView}} ustawia płaszczyznę przodem do ekranu: usuwa to, co leży przed nią, a suwakiem przesuwasz ją w kierunku patrzenia głębiej w projekt, na przykład aby dotrzeć do zasłoniętej części i ją kliknąć. Po obróceniu widoku kliknij go ponownie, a przekrój dopasuje się do nowego widoku.
- {{ui:camera.sectionCoarse}} przesuwa płaszczyznę przez cały projekt, {{ui:camera.sectionFine}} przesuwa ją odrobinę w jedną lub drugą stronę od miejsca, w którym stoi, o dziesiąte części milimetra. Położenie możesz też wpisać.
- Przycisk obok osi pokazuje drugą stronę cięcia, {{ui:camera.sectionReset}} ustawia płaszczyznę z powrotem na środku, a {{ui:camera.sectionShowPlane}} ukrywa niebieską płaszczyznę.
- To, co odsłania cięcie, łącznie z wewnętrznymi ściankami, możesz klikać i zaznaczać.
- {{ui:camera.sectionWorkplane}} kładzie płaszczyznę roboczą na cięciu. Leży ona w płaszczyźnie przekroju i jest zwrócona na zewnątrz bryły, która zostaje, jak ściana zostawiona przez cięcie. Jeśli potem przełączysz się na szkic, zacznie się dokładnie tam, a blady kontur pokaże przekrój, wzdłuż którego możesz rysować i do którego się przyciągać. Tak na przykład naszkicujesz pokrywkę pasującą do wnęki, którą odsłonił przekrój. Przycisk obok osi wybiera, która strona zostaje, a tym samym, w którą stronę zwrócona jest płaszczyzna robocza. Płaszczyznę roboczą przywracasz na płytę bazową jak zwykle.
- {{ui:camera.sectionSketch}} zaczyna nowy szkic bezpośrednio na przekroju, w którym kontury przekroju już leżą jako linie: otwór przychodzi jako prawdziwy okrąg, zaokrąglony narożnik jako łuk. Zmień je, usuń to, czego nie potrzebujesz, rysuj dalej i zakończ: bryła wyrasta z przekroju w stronę, która jest odcięta, więc część, która ma pasować do innej, na przykład pokrywka, wkładka albo uszczelka, zaczyna się od konturu właśnie tej części. Przycisk obok osi wybiera tę stronę. Tak jak przy SVG liczą się tylko widoczne bryły, a otwory są już odjęte.
- {{ui:camera.sectionMeasure}} mierzy bezpośrednio na przekroju: kontur robi się niebieski, a dwa kliknięcia na nim podają odległość oraz jej składowe wzdłuż obu osi płaszczyzny. Oba punkty przyciągają się do konturu, najpierw do narożników. Gdy drugie kliknięcie trafi w dowolne miejsce przeciwległej ścianki, przyciąga się prostopadle do pierwszego punktu, więc grubość ścianek, szczeliny i luzy odczytasz bez dokładnego celowania. Trzecie kliknięcie zaczyna następny pomiar, [[Esc]] kończy mierzenie. Przesunięcie płaszczyzny czyści pomiar. Na okrągłym konturze, na przykład przekroju walca lub otworu, mały krzyżyk oznacza środek, który też się przyciąga. Kliknij punkt na okręgu, potem zbliż się do punktu naprzeciwko: drugie kliknięcie trafi dokładnie po drugiej stronie środka, a liczba pokaże Ø, czyli średnicę. Od środka do punktu na okręgu dostaniesz R, czyli promień.
- {{ui:camera.sectionExportSvg}} zapisuje kontury na płaszczyźnie cięcia jako SVG w skali 1:1, dla lasera, plotera, szablonu albo uszczelki. Przekrój X jest widziany z prawej, przekrój Y z przodu, a przekrój Z z góry. Tak jak w eksporcie, trafiają tam tylko widoczne bryły, otwory są już odjęte, a bryły w tym samym kolorze łączą się w jeden kontur. Każdy kolor zostaje osobną ścieżką bez wypełnienia, więc oprogramowanie lasera rozdziela je na warstwy.

Panel jest przypięty do swojego przycisku. Jeśli coś zasłania, przeciągnij go za pasek tytułu w dowolne miejsce na płaszczyźnie roboczej, a następnym razem otworzy się tam. Dwukrotne kliknięcie paska tytułu albo upuszczenie panelu przy przycisku odkłada go na miejsce.

X i [[Esc]] zamykają panel, a gdy trwa pomiar, [[Esc]] najpierw go kończy. Przekrój zostaje, dopóki nie wyłączysz go przyciskiem {{ui:camera.sectionActive}} albo nie wrócisz do przeglądu projektów. Dopóki jest włączony, jego przycisk pozostaje podświetlony. Wszystko, co umieścisz po odciętej stronie, pokaże się dopiero po wyłączeniu przekroju. Tablet nie ma klawisza [[Esc]], dlatego panel ma tam dwa dodatkowe przyciski: {{ui:camera.sectionBack}} kończy trwający pomiar, a jeśli żaden nie trwa, zamyka panel, a {{ui:camera.sectionConfirm}} zamyka panel jednym krokiem. Na komputerze ich nie widać.

## Płaszczyzna robocza

Nowe kształty ustawiają się na płaszczyźnie roboczej. Na początku to płyta bazowa z siatką. Możesz ją jednak położyć na dowolnej powierzchni, żeby umieścić coś na boku albo na skośnej ścianie.

1. Naciśnij [[W]] albo kliknij {{ui:camera.placeWorkplane}}.
2. Najedź myszą na ścianę bryły. Podświetli się.
3. Kliknięcie kładzie tam płaszczyznę roboczą. Wszystko, co teraz dodasz, stanie na tej ścianie.

Jeśli zamiast tego klikniesz pustą płytę, płaszczyzna robocza położy się płasko w klikniętym miejscu, na siatce przyciągania. Nowe kształty i zakończony szkic, także obrotowy, pojawią się wtedy tam, a nie na środku płyty. Dopóki płaszczyzna robocza leży tak płasko na płycie, płyta pokazuje tylko swój obrys: dwie siatki w tej samej płaszczyźnie dawałyby migoczący wzór.

Na ścianie początek płaszczyzny roboczej przyciąga się zwykle do siatki. Kliknij blisko narożnika ściany, a usiądzie dokładnie na tym narożniku. Blisko krawędzi położy się na krawędzi, a siatka ustawi się wzdłuż niej. Tak celowo wybierasz kąt siatki. Bez narożnika i krawędzi siatka na leżącej ścianie biegnie równolegle do bryły, więc na obróconym prostopadłościanie jest obrócona razem z nim.

Kliknięcie obok płyty albo [[Esc]] przywraca płaszczyznę roboczą na płytę bazową. Jeszcze szybciej działa {{ui:camera.resetWorkplane}}: przycisk ze strzałką w dół na pasku kamery pod okiem, widoczny, dopóki płaszczyzna robocza leży na ścianie. [[Shift]]+[[W]] kładzie ją od razu na zaznaczonej ścianie. [[Alt]]+[[W]] w każdej chwili przywraca ją na płytę bazową, niezależnie od tego, czy coś jest zaznaczone. Jeśli podczas klikania przytrzymasz [[Shift]], płaszczyzna będzie zwrócona w przeciwną stronę.

Dopóki płaszczyzna robocza leży na ścianie, obok {{ui:camera.placeWorkplane}} pojawia się oko. Ukrywa ono płaszczyznę roboczą, nie zdejmując jej, żeby projekt był lepiej widoczny: nowe kształty dalej trafiają na tę ścianę, a obracanie dalej odbywa się wokół niej. Kliknięcie oka pokazuje ją z powrotem, podobnie jak położenie nowej płaszczyzny roboczej.

## Siatka i przyciąganie

Siatka pokazuje rozmiar płyty. W prawym dolnym rogu jest **krok przyciągania**: przesuwanie i skalowanie przyciągają się co tyle, na przykład co 1 mm. Zmniejsz go do precyzyjnej pracy, zwiększ do zgrubnego rozmieszczania. {{ui:editor.tool.snapToGrid}} na wstążce przesuwa potem zaznaczone kształty na najbliższe przecięcie siatki. Podczas przesuwania kształty przyciągają się też do innych kształtów, zobacz [Zaznaczanie i rozmieszczanie](chapter:select-and-arrange). Bez myszy: [[Alt]]+[[1]] do [[Alt]]+[[0]] wybierają tę pozycję menu ([[Alt]]+[[1]] wyłącza przyciąganie), a [[,]] i [[.]] zmieniają krok o jeden rozmiar na drobniejszy albo grubszy. Działa to też w szkicu.

> **Wskazówka:** Gdy dokładnie dopasowujesz części, przestań obracać widok. Klawiszami cyfr przejdź do widoku na wprost z góry albo z przodu i naciśnij [[O]], aby włączyć płaski widok. Wtedy od razu widać, czy dwie krawędzie naprawdę są na równo.

### Okno ustawień

Koło zębate na wstążce ({{ui:editor.workspaceSettings}}) otwiera ustawienia. Po lewej jest pięć sekcji: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} i {{ui:workspace.history}}. Każda zmiana działa od razu. {{ui:workspace.makeDefault}} na dole zapisuje bieżące ustawienia jako domyślne, żeby nowy projekt z nimi zaczynał. Otwierany plik przynosi własne ustawienia, a {{ui:workspace.useMyDefault}} obok nakłada na otwarty projekt Twoje zapisane kolory, siatkę i resztę, zachowując jego jednostki. Jeśli Twoje ustawienia domyślne mają drukarkę, przychodzi ona razem z rozmiarem swojego stołu, a bez niej projekt zachowuje swoją płytę i drukarkę. {{ui:workspace.close}} w prawym górnym rogu zamyka okno. Ta część omawia ustawienia po kolei.

### Wygląd: motyw, pasek narzędzi i kostka widoku

{{ui:workspace.theme}} ustawia kolory całego programu: {{ui:workspace.themeSystem}} podąża za komputerem, pozostałe to {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} i {{ui:workspace.themeGraphite}}. Możesz go też zmienić w prawym górnym rogu edytora.

{{ui:workspace.toolbarSize}} zmniejsza lub powiększa przyciski wstążki na górze, jej menu kształtów, sterowanie kamerą po lewej i panel właściwości po prawej: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (jak zawsze) albo {{ui:workspace.toolbarSizeLarge}}. Mały zostawia na laptopie więcej miejsca na płaszczyznę roboczą, duży łatwiej trafić na dużym ekranie albo palcem. Przy dużych przyciskach grupy wstążki przechodzą do drugiego rzędu, gdy okno jest dla nich za wąskie. Rozmiar zapamiętuje ta przeglądarka i obowiązuje on w każdym projekcie.

{{ui:workspace.viewCubePosition}} przenosi kostkę widoku w inny róg obszaru roboczego: {{ui:workspace.viewCubePositionTopLeft}} (jak zawsze), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} albo {{ui:workspace.viewCubePositionBottomRight}}. W każdym rogu poza lewym górnym sterowanie kamerą przesuwa się w górę, na miejsce zwolnione przez kostkę. W prawym dolnym rogu kostka stoi tuż nad przełącznikiem {{ui:inspector.snapGrid}}. Dopóki po prawej są otwarte właściwości kształtu, kostka po prawej stronie odsuwa się na lewo od nich. Róg zapamiętuje ta przeglądarka i obowiązuje on w każdym projekcie. W wąskim oknie, na przykład na telefonie, ustawienie jest ukryte, a kostka zostaje w lewym górnym rogu.

{{ui:workspace.shapeColors}} pokazuje na obrazkach biblioteki kształtów kolor, z jakim startuje nowy kształt (kolor jego rodzaju albo ten, który zapisałeś przyciskiem {{ui:inspector.saveDefaults}}). Wyłącz to, jeśli wolisz szare obrazki. Przeglądarka zapamiętuje ten wybór.

### Wygląd: tryb szybki

{{ui:workspace.fastMode}} jest dla wolniejszych komputerów. Wyłącza cienie, linie krawędzi na wszystkich bryłach i bezwładność kamery, a widok rysuje tylko w rozdzielczości ekranu. Twoje własne ustawienia zostają zachowane na później, a przełączniki, które nadpisuje, pokazują {{ui:workspace.offInFastMode}}, dopóki jest włączony. Więcej o tym, co pomaga na wolnym komputerze, jest niżej w części „Gdy layerling działa wolno”.

### Wygląd: kolory obszaru roboczego i szkicu

Kolory obszaru roboczego ustawiasz w sekcji {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} i {{ui:workspace.surfaceColor}} dla motywu jasnego (motywy ciemne mają własne), obok koloru siatki w sekcji {{ui:workspace.workplane}}. Każdy kolor to przycisk, który go pokazuje. Kliknięcie otwiera małe okno z polem koloru, rzędem gotowych kolorów, polem na wartość szesnastkową i strzałką, która przywraca kolor, z jakim layerling zaczynał. [[Enter]] przyjmuje wpisaną wartość szesnastkową, podobnie jak kliknięcie poza oknem.

Widok szkicu ma własne kolory: {{ui:workspace.sketchBackground}} dla okna wokół arkusza, {{ui:workspace.sketchPlateColor}} dla arkusza pod siatką oraz {{ui:workspace.sketchGridColor}}, wszystkie dla motywu jasnego. {{ui:workspace.sketchMatch}} przejmuje jednym kliknięciem trzy kolory obszaru roboczego.

{{ui:workspace.classicLook}} ustawia obszar roboczy tak, jak pokazuje go Tinkercad: białe podłoże, bladoniebieska siatka milimetrowa z ciemniejszą linią co centymetr, czarne linie krawędzi, światło z góry z miękkimi cieniami. Każdą wartość możesz potem dalej zmieniać osobno. Wszystkie zaczynają tak, jak layerling wyglądał zawsze, a to, co Ci odpowiada, zależy od monitora.

![Ustawienia w sekcji Wygląd: kolory tła i płaszczyzny roboczej dla motywu jasnego oraz przełącznik linii krawędzi na wszystkich bryłach.](shot:settings-appearance)

![Edytor w ciemnym motywie kolorów. Motyw ustawiasz w prawym górnym rogu: systemowy, jasny, ciemny albo grafitowy.](shot:editor-dark)

### Wygląd: strzałki osi i linie krawędzi

{{ui:workspace.showAxes}} (domyślnie włączone) rysuje trzy strzałki w lewym tylnym narożniku płyty: **X** na czerwono w prawo, **Y** na zielono do tyłu i **Z** na niebiesko w górę, tak jak liczą pola pozycji. To reguła prawej dłoni, której używają też Tinkercad, programy CAD i slicery. Gdy płaszczyzna robocza leży na ścianie, strzałki podążają za nią. Jeśli przeszkadzają, wyłącz je tutaj.

{{ui:workspace.edgeLines}} rysuje obrys na każdej bryle w kolorze {{ui:workspace.edgeColor}} (na początek czarnym, jak w Tinkercadzie). Pomaga, gdy ciemne kolory zlewają się ze sobą. Domyślnie jest wyłączone, a bardzo duże zaimportowane siatki są pomijane.

![Trzy ciemne bryły z włączonymi liniami krawędzi: obrysy je od siebie oddzielają.](shot:edge-lines)

{{ui:workspace.strongHoles}} rysuje otwory ciemniejszą szarością, mniej przezroczyście i z ciemną linią dookoła. Pomaga, gdy otwór trudno znaleźć wśród przezroczystych brył. W przeciwieństwie do linii krawędzi pozostaje włączone w trybie szybkim.

### Wygląd: światło i cienie

{{ui:workspace.showShadows}} włącza i wyłącza rzucane cienie. Dwa suwaki ustawiają oświetlenie brył. {{ui:workspace.shadowStrength}} określa, jak ciemne są rzucane cienie, a {{ui:workspace.shadeContrast}} przenosi światło z równomiernego światła otoczenia na światło główne: w stronę „wyrazisty” zacienione boki ciemnieją, a cienie są lepiej widoczne, w stronę „łagodny” wszystko robi się bardziej płaskie. Na górnym końcu kontrast jest bardzo mocny, więc zacienione boki i cienie robią się naprawdę ciemne. {{ui:workspace.shadowSoftness}} zmiękcza krawędzie cieni zamiast zostawiać je ostre. {{ui:workspace.lightAzimuth}} obraca światło główne wokół płyty (0° od przodu, 90° z prawej), a {{ui:workspace.lightElevation}} je podnosi. Przy 90° stoi ono prosto nad płytą, jak w Tinkercadzie, a cienie padają dokładnie pod bryłami. {{ui:workspace.softLighting}} sprawia, że większość światła pada stamtąd, skąd patrzysz, i obraca się z widokiem: żadna ściana nie zostaje ciemna, a ciemna ściana zwrócona w górę nie jest już prześwietlona na biało. Światło główne zostaje trochę dla cieni, a suwak kontrastu nadal działa. Jeśli przy nisko ustawionym świetle wciąż widać jasny odblask, podnieś {{ui:workspace.lightElevation}} do 90°: wygląda to wtedy jak w Tinkercadzie. {{ui:workspace.lightReset}} przywraca wszystko.

### Wygląd: wymiary na płaszczyźnie roboczej

{{ui:workspace.showMoveDimensions}} pokazuje podczas przeciągania, o ile przesuwasz, a {{ui:workspace.showOriginDimensions}} odległości zaznaczenia od początku układu płyty, także przy kilku zaznaczonych bryłach. Z {{ui:workspace.dimensionsAlwaysVisible}} te wymiary są widoczne cały czas, a nie tylko podczas przeciągania. Dopóki obrócona bryła jest zaznaczona, jej kąty widać pod nią na płaszczyźnie roboczej. {{ui:workspace.showRotationAngles}} to wyłącza. Więcej w rozdziale [Pomiary i notatki](chapter:measuring-and-notes).

### Wygląd: zaznaczanie i przesuwanie

{{ui:workspace.selectBeforeMoving}}: bryłę trzeba wtedy najpierw zaznaczyć, a dopiero następne przeciągnięcie ją przesuwa. Pomaga to, gdy brył dotykają dzieci albo pośpieszne ręce, a także na ekranie dotykowym.

{{ui:workspace.frameByDirection}}: ramka przeciągnięta w prawo zaznacza tylko to, co leży w niej w całości, a przeciągnięta w lewo wszystko, czego dotyka (rysowana przerywaną linią), jak w SketchUpie.

{{ui:workspace.doubleClickOpensSketch}} decyduje, czy dwukrotne kliknięcie wyciągniętego szkicu otwiera go ponownie, jak w Tinkercadzie, a {{ui:workspace.doubleClickOpensGroup}}, czy dwukrotne kliknięcie grupy albo zestawu otwiera je do edycji. {{ui:workspace.doubleClickCentersView}} decyduje, czy dwukrotne kliknięcie pustego miejsca płaszczyzny roboczej przesuwa tam widok.

{{ui:workspace.objectSnap}} sprawia, że krawędzie i środek kształtu przyciągają się podczas przeciągania do innych kształtów. Menu siatki w prawym dolnym rogu ma ten sam przełącznik. {{ui:workspace.cruise}} sprawia, że nowy kształt wisi na wskaźniku myszy i ląduje na ścianie pod nim, jak Cruise w Tinkercadzie. Po wyłączeniu nowy kształt pojawia się na środku płyty. Więcej w rozdziale [Zaznaczanie i rozmieszczanie](chapter:select-and-arrange).

### Wygląd: widok

{{ui:workspace.startInPerspective}}: edytor otwiera się wtedy w widoku perspektywicznym, a nie płaskim.

{{ui:workspace.startView}} ustawia kąt, pod jakim otwiera się nowy projekt i do którego wraca {{ui:camera.home}}. Obróć i przybliż widok tak, jak lubisz, a potem kliknij {{ui:workspace.startViewUseCurrent}}. {{ui:workspace.startViewStandard}} przywraca zwykły widok z prawego przodu. Obowiązuje dla każdego projektu w tej przeglądarce. Projekt otwierany ponownie nadal otwiera się tak, jak go zostawiłeś.

{{ui:workspace.zoomSpeed}} to suwak od wolno do szybko: jak szybko przybliżają kółko i touchpad. Przyciski i klawisze przybliżania zachowują własne małe kroki. {{ui:workspace.cameraInertia}}: gdy puścisz mysz, widok obraca się jeszcze przez chwilę i łagodnie zwalnia. Po wyłączeniu zatrzymuje się od razu, jak w Tinkercadzie i Fusion 360.

{{ui:workspace.overhangAngle}} to kąt, od którego ściana liczy się jako nawis, gdy włączysz Pokaż nawisy w menu widoczności: takie ściany są kreskowane na czerwono i biało. 30° to ostrożnie, 70° zakłada dobre chłodzenie wydruku, a 45° to zwykły punkt wyjścia.

{{ui:workspace.booleanTriangleLimit}} ogranicza, ile trójkątów może mieć zaimportowana siatka przy cięciu, scalaniu albo części wspólnej, bo jest to liczone w przeglądarce. Siatka powyżej limitu nie jest przetwarzana. Najpierw uprość siatkę albo podnieś limit, jeśli Twój komputer to udźwignie. Wyższy limit może zamrozić edytor na kilka sekund.

### Pomiary: jednostki, skala i kroki przyciągania

W sekcji {{ui:workspace.measurement}} ustawiasz {{ui:workspace.units}}, jednostkę, w której pokazywane są wymiary ({{ui:workspace.scale}}: milimetry, centymetry albo metry w układzie metrycznym, cale albo stopy w calowym), liczbę miejsc po przecinku ({{ui:workspace.accuracy}}), {{ui:workspace.snapGrid}}, do której przyciąga się przesuwanie i zmiana rozmiaru, oraz własne kroki przyciągania w {{ui:workspace.customSnapGrids}}.

W sekcji {{ui:workspace.measurement}} w ustawieniach wybierasz {{ui:workspace.units}}. Przy {{ui:units.imperial}} layerling pokazuje każdy wymiar w calach: na kształcie, w panelu właściwości, w narzędziu Zmierz i na linijce. Siatka przyciągania oferuje wtedy kroki od 1/64 do 1 cala, a siatka na płycie jest rysowana w calach (od 1/8 do 1 cala, domyślnie 1/4 cala) z mocniejszą linią co pełny cal. W {{ui:workspace.inchFormat}} wybierasz, czy cale mają się pokazywać jako ułamki, jak w Tinkercadzie (1 5/8, zaokrąglone do 1/64 cala), czy jako liczby dziesiętne (1.625) z tyloma miejscami po przecinku, ile ustawiono w {{ui:workspace.accuracy}}. Wpisać możesz jedno i drugie, także „1 5/8”. Szybko przełączysz się między milimetrami a calami małym przełącznikiem **mm | in** obok {{ui:inspector.snapGrid}} na dole okna właściwości: dla tego projektu zmienia jednostkę, siatkę płyty i krok przyciągania tak jak ustawienia.

W {{ui:workspace.customSnapGrids}} w tym samym miejscu dodajesz własne kroki przyciągania: nazwę i rozmiar w milimetrach, na przykład „Raster 2,54 mm” dla rozstawu wyprowadzeń układów DIP, listew goldpin i otworów płytek uniwersalnych albo „MX Key Unit” z 19,05 mm dla rozstawu klawiszy klawiatury. Menu kroku przyciągania oferuje wtedy tę miarę w całości, w połowie i w ćwiartce (1 ×, ½ × i ¼ ×), więc kształty da się przesuwać o cały raster, pół albo ćwierć rastra. Jeśli chcesz tylko samą miarę, odznacz obok {{ui:workspace.customSnapGridParts}}, a menu będzie miało tylko ten jeden krok. Własne kroki zapisują się z projektem i przechodzą dalej przez {{ui:workspace.makeDefault}}.

### Płaszczyzna robocza: płyta i drukarka

{{ui:workspace.printer}} dopasowuje płaszczyznę roboczą do stołu Twojej drukarki i oznacza bryły, które poza niego wystają, zobacz [Drukowanie](chapter:printing). {{ui:workspace.showPlateLabels}} wypisuje na płycie nazwę projektu, a gdy wybrana jest drukarka, także jej nazwę i przestrzeń roboczą.

{{ui:workspace.size}} nadaje płycie własny rozmiar, z {{ui:workspace.width}} i {{ui:workspace.length}} w milimetrach albo w wybranej jednostce. Siatka zawsze przechodzi przez początek układu, więc mocniejsze linie leżą na osiach niezależnie od wymiarów płyty.

### Płaszczyzna robocza: siatka

{{ui:workspace.showGrid}} pokazuje albo ukrywa siatkę na płycie. {{ui:workspace.gridBlockSize}} ustawia odstęp jej linii, a {{ui:workspace.gridMajorEvery}}, czy ciemniejsza linia ma wypadać co 5, czy co 10 oczek. {{ui:workspace.gridMajorColor}} nadaje tej linii własny kolor, który przyjmuje też krzyż środka i obrzeże płyty. {{ui:workspace.gridColor}} to kolor zwykłych linii.

Każda linia siatki grubieje przy przybliżaniu, jak w Tinkercadzie, i pozostaje widoczna przy oddalaniu. Jeśli to dla Ciebie za dużo, wyłącz {{ui:workspace.gridLinesGrow}}, a linie zostaną szerokie na jeden piksel przy każdym przybliżeniu, jak w szkicu.

Jeśli siatka zniknęła, na przykład dlatego, że kolor ustawiono na kolor płyty, {{ui:workspace.resetGrid}} na końcu sekcji {{ui:workspace.workplane}} przywraca jej widoczność, kolory, odstęp i grubość linii do standardu, tutaj i w ustawieniach domyślnych zapisanych przyciskiem {{ui:workspace.makeDefault}}.

### Domyślne kształtów

W sekcji {{ui:workspace.shapeDefaults}} wybierasz kształt w polu {{ui:workspace.shape}} i ustawiasz, z czym startuje, gdy go dodajesz: jego szerokość, długość i wysokość. {{ui:workspace.useAppDefaults}} przywraca kształtowi wartości, z jakimi startuje w programie. Kształty z własnymi ustawieniami pokazują je w {{ui:workspace.shapeDetails}}. Wartości dotyczą nowych kształtów, a nie tych, które już stoją na płycie. {{ui:workspace.customLimit}} ustawia własny limit tego, jak duży mogą zrobić ten kształt uchwyty i właściwości. Gdy pole jest puste, zostają zwykłe limity.

### Zapisana historia

W sekcji {{ui:workspace.history}} suwak {{ui:workspace.savedHistory}} ustawia, ile wykonanych czynności pozostaje dostępnych dla Cofnij po zapisaniu albo ponownym otwarciu projektu. Domyślnie jest to 100 czynności w projekcie. Niższy limit trwale usuwa starsze kroki cofania projektu.

## Gdy layerling działa wolno

layerling liczy i rysuje wszystko w przeglądarce. Na starszym komputerze, ze słabą kartą graficzną albo na kilku dużych ekranach widok może więc działać ociężale. Pomaga to:

- **{{ui:workspace.fastMode}}** w sekcji {{ui:workspace.appearance}} wyłącza naraz wszystko, co dużo kosztuje widok: cienie, linie krawędzi na wszystkich bryłach i bezwładność kamery. Rysuje też widok tylko w rozdzielczości samego ekranu, co na ekranach o wysokiej rozdzielczości oznacza nawet czterokrotnie mniej pikseli. Twoje własne ustawienia zostają zachowane i wracają, gdy tylko go wyłączysz.
- **Kamera obraca się dalej:** gdy po obracaniu puścisz mysz, widok obraca się jeszcze przez chwilę i łagodnie zwalnia. To celowe, a nie przycinanie. Jeśli przywykłeś do Tinkercada albo Fusion 360, wyłącz {{ui:workspace.cameraInertia}} w sekcji {{ui:workspace.appearance}}, a widok zatrzyma się od razu.
- **Pojedyncze przełączniki:** bez trybu szybkiego możesz też wyłączyć tylko {{ui:workspace.showShadows}} albo {{ui:workspace.edgeLines}}.
- **Użyj karty graficznej:** w Chrome otwórz `chrome://gpu` (w Edge `edge://gpu`). Obok „WebGL” powinno być napisane „Hardware accelerated”. Jeśli jest tam „Software only”, przyspieszenie sprzętowe jest wyłączone w ustawieniach przeglądarki. W Windows możesz też w Ustawienia → System → Ekran → Grafika wybrać dla przeglądarki „Wysoka wydajność”, żeby używała prawdziwej karty graficznej, a nie słabszej wbudowanej w procesor.
- **Uprość duże zaimportowane siatki:** model z wieloma setkami tysięcy trójkątów spowalnia każdy widok. Jak go odchudzić, opisuje rozdział o plikach, w części „Upraszczanie zaimportowanej siatki”.
- **Zamknij inne karty:** każda otwarta karta layerling i każda inna strona 3D korzysta z tej samej karty graficznej.
