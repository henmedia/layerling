---
title: Pomiary i notatki
summary: Narzędzie Zmierz, linijka i kątownik, odległości od początku układu, notatki przypięte do części i punkty odniesienia, do których wszystko się przyciąga.
---

Aby zbudować część dokładnie, trzeba mierzyć. layerling ma do tego kilka narzędzi. Żadne z nich nie trafia do eksportu. Grubość ścianek i szczeliny wewnątrz części najlepiej mierzyć w [widoku przekroju](chapter:view-and-workplane) przyciskiem {{ui:camera.sectionMeasure}}.

## Narzędzie Zmierz

Narzędzie Zmierz jest na dolnym końcu paska kamery przy lewej krawędzi ({{ui:camera.tapeTools}}). Mierzy odległości między narożnikami, krawędziami i ścianami. Kliknięcie go otwiera pięć przycisków. Jeśli zasłaniają to, co chcesz zmierzyć, przeciągnij je za uchwyt po lewej w dowolne miejsce na płaszczyźnie roboczej. Dwukrotne kliknięcie uchwytu odkłada je na miejsce:

![Narzędzie Zmierz z przyciskami: dodaj pomiar, przesuń punkty pomiaru, usuń pomiar, całe krawędzie, usuń wszystkie pomiary.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** kliknij jeden punkt, przeciągnij do następnego i kliknij go. Odległość zostanie opisana, a przed nią osie, wzdłuż których biegnie: X, Y albo Z dla prostego pomiaru, XY, XZ albo YZ w poprzek płaszczyzny, 3D dla wszystkich trzech. Najedź na opis, by zobaczyć, ile pomiar sięga wzdłuż każdej osi, a na punkt, by zobaczyć jego współrzędne. Gdy stawiasz drugi punkt, osie, odległość i zasięg wzdłuż każdej osi widać obok wskaźnika. Pomiar, który leży w większości za innym ciałem, blednie; po najechaniu na jego linię albo opis znów widać go w pełni. Na przeciwległej krawędzi albo ścianie drugi punkt przyciąga się pod kątem prostym do pierwszego, gdy wskaźnik się zbliży, albo w dowolnym miejscu tej krawędzi lub ściany, gdy trzymasz [[Shift]]. Wzdłuż tej samej ściany albo na płaszczyźnie roboczej [[Shift]] utrzymuje pomiar prosto wzdłuż głównej osi.
2. **{{ui:camera.moveMeasurement}}:** chwyć punkty i przesuń je, a liczba podąży za nimi.
3. **{{ui:camera.deleteMeasurement}}:** potem kliknij pomiar, aby go usunąć. Gdy aktywne jest **{{ui:camera.addMeasurement}}**, kliknięcie punktu albo linii pomiaru z wciśniętym [[Shift]] albo [[Ctrl]] ([[Cmd]] na Macu) od razu je usuwa, bez przełączania trybu.
4. **{{ui:camera.tapeWholeEdges}}:** kliknięcie krawędzi mierzy ją w całości, na przykład obwód okręgu. Gdy to jest wyłączone, kliknięcie stawia zamiast tego punkt na krawędzi, a drugi punkt idzie w dowolne miejsce, więc możesz zmierzyć średnicę albo dowolną inną odległość. [[Alt]] odwraca ten przełącznik na jedno kliknięcie. Na okręgu punkt naprzeciwko pierwszego przyciąga się, gdy wskaźnik się do niego zbliży, a punkty leżą na prawdziwym okręgu, więc średnica wychodzi dokładnie.
5. **{{ui:camera.deleteAllMeasurements}}:** usuwa naraz wszystkie pomiary. Ponieważ tego nie da się cofnąć, layerling najpierw pyta. Gdy nie ma pomiarów, nie ma czego robić.
6. **{{ui:camera.tapeMarkMiddle}}:** w środku każdego pomiaru jest mały okrągły znacznik z wypełnioną dolną połową. Stawia on [punkt odniesienia](#punkty-odniesienia) w środku pomiaru: po kliknięciu okrągłej krawędzi, takiej jak brzeg otworu, w środku tego okręgu (także na zaimportowanej siatce, gdzie nic innego nie oznacza środka otworu), a dla średnicy albo dowolnego prostego pomiaru w połowie jego długości. Przeciągany kształt przyciąga się wtedy do punktu swoim środkiem. Punkt, który już istnieje, nie powstaje drugi raz. Narzędzie Zmierz przyciąga się do punktu odniesienia jak do narożnika, więc możesz mierzyć od środka okręgu albo od środka linii: zaznacz go, a potem kliknij punkt.
7. **{{ui:camera.tapeTypeLength}}:** Gdy co najmniej jeden koniec prostego pomiaru leży na bryle, jego liczbę można kliknąć. Wpisz nową długość i naciśnij [[Enter]]: bryła przy drugim punkcie przesuwa się wzdłuż zmierzonej linii, aż odległość będzie dokładnie taka, jak przy linijce w Tinkercad. Jeśli zaznaczona jest tylko bryła przy pierwszym punkcie, przesuwa się ona. Punkty pomiaru zostają na bryle, więc pomiar podąża za nią. Mierz od narożnika, krawędzi lub [punktu odniesienia](#punkty-odniesienia), np. środka okręgu, aby ustawić części w dokładnej odległości.

[[Esc]] wychodzi z trybu mierzenia.

## Linijka

{{ui:shape.ruler}} bierzesz z biblioteki kształtów. To wyłącznie narzędzie pomiarowe: nie pojawia się w żadnym eksporcie i nie można jej ani grupować, ani ciąć. Dla każdej bryły, która dotyka linijki albo na nią nachodzi, pokazuje wymiar jako unoszącą się liczbę wprost w widoku. Tę liczbę możesz zmienić na miejscu, a bryła za nią podąży. Unoszący się znak plus tworzy kopię mierzonego kształtu. Jej podziałka jest w milimetrach. Po przełączeniu jednostki na cale (przełącznik w prawym dolnym rogu) jest w calach, z kreską co jedną szesnastą cala i ponumerowanymi pełnymi calami.

## Kątownik

Czasem lepiej mierzyć pod kątem prostym. Kliknij {{ui:camera.cornerRulerTool}} na pasku kamery, a potem płaszczyznę roboczą. Zostanie tam położony kątownik z dwoma ramionami pod kątem prostym, z podziałką jak na kątowniku stolarskim. On też nie ma własnej bryły. Kliknij blisko narożnika bryły, a jego narożnik przyciągnie się dokładnie tam.

Kątownik leży na płaszczyźnie roboczej. Jeśli ta leży na boku bryły, kątownik też leży na tym boku, zobacz [Widok i płaszczyzna robocza](chapter:view-and-workplane). Tak wymiarujesz na pionowej ściance: połóż płaszczyznę roboczą na ściance, postaw kątownik w jej lewym górnym narożniku i klikaj uchwyt, aż ramiona wskażą w prawo i w dół.

- **Przeciąganie uchwytu** przesuwa kątownik.
- **Krótkie kliknięcie uchwytu** obraca go o 90°.
- **×** obok go usuwa.
- **Mały przycisk na lewo od uchwytu** przełącza, od czego się mierzy: od zewnętrznej strony bryły (punkt końcowy, ikona z liniami) albo od jej środka (punkt środkowy, celownik). Mały przełącznik tego samego rodzaju stoi przy każdej zielonej liczbie i ustawia tylko tę jedną liczbę: dla stojącego walca środek w obu ramionach i spód w wysokości, dla leżącego środek w poprzek i koniec wzdłuż. Gdy wszystkie trzy znów się zgadzają, przycisk przy uchwycie pokazuje wspólny tryb.

Jeśli przy jednym z ramion stoją bryły, kątownik automatycznie pokazuje ich wymiary. Działa to tylko na płycie bazowej, a nie na boku bryły. Przycisk ze strzałką pod uchwytem kątownika to wyłącza, więc wymiary pokazują tylko zaznaczone bryły; zapisuje się razem z projektem.

Gdy zaznaczysz bryłę, kątownik pokazuje na zielono, jak daleko jest ona od narożnika, wzdłuż obu ramion i w wysokości. Kliknij zieloną liczbę, aby wpisać odległość, a bryła przesunie się dokładnie tam. Gdy zaznaczonych jest kilka brył, liczą się jako jedna: kątownik mierzy ich wspólny obrys, a wpisana wartość przesuwa je wszystkie razem, nie zmieniając ich położenia względem siebie.

Linie pomocnicze zielonych liczb biegną po podłodze, czyli w płaszczyźnie, w której leży kątownik, do punktu pod bryłą albo obok niej. Wysokość ma własną strzałkę. Przełącznik każdej liczby siedzi w jej ramce. Ramiona i podziałka to linie w przestrzeni: bryła przed nimi je zasłania, tak jak zasłoniłaby prawdziwy kątownik. Małe oko pod uchwytem to przełącza: z przekreślonym okiem bryły zasłaniają kątownik (tak jest na początku), z otwartym okiem kątownik zostaje widoczny ponad wszystkim. Liczby na ramionach bledną tam, gdzie przed nimi stoi bryła.

Przy punkcie środkowym zielone liczby liczą do środka bryły, także w wysokości. Tak ustawisz kulę środkiem dokładnie 15 mm od krawędzi, bez odejmowania promienia. Na ściance otwór 40 mm od lewej i 190 mm od góry ustawisz tak: zaznacz otwór, przełącz na punkt środkowy, wpisz 40 i 190. Wysokość liczy się tam od ścianki na zewnątrz.

Zarówno narzędzie Zmierz, jak i kątownik zostają tam, gdzie są, gdy szkicujesz i wracasz do widoku 3D. Żadne z nich nie trafia do historii. Kątownik jest zapisywany z projektem, tak samo jak pomiary narzędzia Zmierz, w przeglądarce i w pliku .lyl: po otwarciu projektu znowu tam są. Przycisk z okiem wśród przycisków narzędzia Zmierz ukrywa wszystkie pomiary i znowu je pokazuje; zapisywane jest też to, czy są ukryte, a dodanie, przesunięcie lub usunięcie pomiaru najpierw je pokazuje.

## Odległości od początku układu i podczas przesuwania

W ustawieniach w sekcji {{ui:workspace.appearance}} są dwa przełączniki wymiarów na żywo:

- {{ui:workspace.showMoveDimensions}} pokazuje podczas przeciągania, o ile przesuwasz.
- {{ui:workspace.showOriginDimensions}} pokazuje odległości zaznaczenia od początku układu płyty, także przy kilku zaznaczonych bryłach.

Z {{ui:workspace.dimensionsAlwaysVisible}} wymiary są widoczne cały czas.

## Notatki

Notatka zapisuje to, czego geometria nie mówi: „Ta śruba jest o 0,3 mm za ciasna”, „jeszcze wydrukować pokrywkę”, „wymiar od Piotra”. Umieść ją przez {{ui:editor.tool.note}} albo klawiszem [[N]].

- Jeśli umieścisz notatkę **na bryle**, porusza się razem z nią.
- Jeśli umieścisz ją **obok**, zostaje na płaszczyźnie roboczej ({{ui:note.free}}).
- {{ui:note.detach}} odpina przypiętą notatkę od bryły.
- {{ui:editor.tool.group}} zabiera przypiętą notatkę do grupy; {{ui:editor.tool.ungroup}} przekazuje ją widocznej części pod nią, także grupie w środku. Dopóki grupa jest otwarta przez {{ui:group.edit}}, jej notatki poruszają się z częścią pod nimi i wracają do grupy po {{ui:group.done}}; anulowanie przywraca je do stanu sprzed edycji.
- Gdy jej bryła zostanie usunięta albo pod nią nie ma już widocznej bryły, notatka zostaje tam, gdzie stała, na płaszczyźnie roboczej.
- Przeciągnięcie pinezki przesuwa notatkę. Kliknięcie pinezki zwija kartę, zostaje tylko mały numer; kolejne kliknięcie znów ją rozwija. Kliknięcie w tekst pozwala go edytować.
- Podczas pisania [[Enter]] zachowuje tekst, a [[Esc]] przywraca go do stanu sprzed rozpoczęcia. [[Shift]]+[[Enter]] zaczyna nowy wiersz.
- **W szkicu** notatkę umieszcza też {{ui:editor.tool.note}} (w sekcji {{ui:editor.group.manage}}) lub klawisz [[N]], w dowolnym miejscu szkicu. Wszystkie notatki szkicu należą do jego bryły: w widoku 3D siedzą na niej, na wierzchu bryły utworzonej przez {{ui:sketch.extrude}} lub {{ui:sketch.sweep}} i na narysowanym profilu bryły utworzonej przez {{ui:sketch.revolve}}, i przesuwają się razem z nią. Po ponownym otwarciu szkic pokazuje notatki bryły, także te umieszczone w 3D. W szkicu {{ui:sketch.undo}} cofa notatkę tak jak linię, a {{ui:sketch.cancel}} odrzuca zmiany w notatkach. [[Shift]]+[[N]] także tu pokazuje albo ukrywa notatki.

Notatki zapisują się w projekcie, nie pojawiają się w żadnym eksporcie i można je pokazać albo ukryć przez {{ui:visibility.notes}} (w {{ui:editor.visibilityOptions}}, strzałce obok ikony oka) albo skrótem [[Shift]]+[[N]].

## Punkty odniesienia

Punkt odniesienia to sam znak w przestrzeni, jak kreska ołówkiem albo punkt trasowania w warsztacie: nie należy do żadnej bryły, nigdy nie jest drukowany, a inne rzeczy się do niego przyciągają. Kliknij bryłę prawym przyciskiem i wybierz {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} albo {{ui:contextMenu.markMidpoints}}: punkty pojawią się na górnej ścianie bryły (całego zaznaczenia, jeśli zaznaczyłeś kilka). {{ui:contextMenu.markFaceCenter}} ustawia natomiast punkt na środku płaskiej ściany, na którą kliknięto prawym przyciskiem, na przykład z boku lub na końcu.

- Przeciągnij punkt, aby go przesunąć, albo kliknij go, aby zobaczyć jego współrzędne i wpisać nowe. Są w ustawionej jednostce. Każdą kartę można odsunąć za tytuł, jeśli coś zasłania, osobno: pozostałe zostają na miejscu, a dwukrotne kliknięcie tytułu odkłada ją z powrotem. Karta dotknięta ostatnio stoi przed pozostałymi. **Usuń wszystkie** w karcie albo **Usuń wszystkie punkty odniesienia** w menu prawego przycisku (na bryle albo na pustym miejscu widoku 3D) usuwa naraz wszystkie punkty. {{ui:common.delete}} usuwa punkt.
- Narzędzie Zmierz też potrafi postawić punkt: {{ui:camera.tapeMarkMiddle}}, do połowy wypełniony znacznik w środku pomiaru, stawia go w jego środku, na przykład w środku okrągłego otworu. Mierzy też od punktu: przyciąga się do punktów odniesienia jak do narożników.
- Gdy przeciągasz kształt, jego krawędzie i środek przyciągają się do punktu, tak jak do innych kształtów ({{ui:workspace.objectSnap}}). Kątownik też przyciąga się do punktów.
- Punkty zapisują się w projekcie, nie pojawiają się w żadnym eksporcie i są pokazywane albo ukrywane razem z notatkami przez {{ui:visibility.notes}} ([[Shift]]+[[N]]).
- AI może je stawiać, wypisywać i usuwać poleceniami `layerling_add_reference_points`, `layerling_list_reference_points` i `layerling_remove_reference_points`.

## Obrazy referencyjne

Obraz referencyjny to obraz, do którego wyrównujesz części: połóż zdjęcie płytki drukowanej na dnie jej obudowy i ustaw na nim dystanse, otwory i wycięcia na złącza. To pomoc, a nie bryła: nigdy nie jest drukowany ani eksportowany (STL, 3MF, OBJ, STEP, SVG), nigdy nie wchodzi do grupy, pakietu ani cięcia, a szacunek wydruku go pomija.

- Otwórz {{ui:editor.import}} i wybierz {{ui:import.referenceImage}}, a potem obraz PNG, JPG, WebP, GIF lub BMP. Trafia na płaszczyznę roboczą - na płytę albo na ścianę, na której ustawiono płaszczyznę roboczą - z dłuższym bokiem 100 mm, półprzezroczysty.
- Przesuwaj go, obracaj i zmieniaj jego rozmiar uchwytami jak każdy kształt. Bryła przed nim jest wybierana pierwsza, więc praca na nim nie chwyta obrazu.
- {{ui:referenceImage.seeThrough}} w jego ustawieniach rozjaśnia go od pełnego do ledwo widocznego.
- {{ui:referenceImage.calibrate}} nadaje mu prawdziwy rozmiar, jak w szkicu: kliknij dwa punkty na obrazie, których rzeczywistą odległość znasz - na przykład dwa otwory montażowe płytki - i wpisz tę odległość w {{ui:referenceImage.distance}}. Obraz zachowuje proporcje i środek.
- Zablokuj go kłódką w nagłówku jego ustawień, a zostanie na miejscu: kliknięcia przechodzą przez niego na płytę. Wybierz go na liście obiektów, aby go odblokować.
- Obraz jest zapisany w pliku projektu tylko raz, niezależnie od tego, ile razy go skopiujesz lub cofniesz. Duży obraz powiększa plik o tyle samo; komunikat przy dodawaniu podaje jego rozmiar.
- AI dodaje, przesuwa, kalibruje, rozjaśnia i blokuje go za pomocą `layerling_reference_image`.
