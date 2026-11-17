---
title: Przygotowanie do druku 3D
summary: Wybór własnej drukarki, ostrzeżenie, gdy coś się nie mieści, i właściwe ułożenie części.
---

## Wybór drukarki

Otwórz ustawienia (koło zębate w wierszu tytułu, {{ui:editor.workspaceSettings}}) i przejdź do sekcji {{ui:workspace.workplane}}. W {{ui:workspace.printer}} wybierasz swoją drukarkę z listy ponad 230 popularnych modeli, między innymi Bambu Lab, Prusa, Creality, Anycubic, Elegoo i wielu innych.

![Ustawienia płaszczyzny roboczej z wybraną drukarką. Stół i maksymalna wysokość wydruku pochodzą z profilu slicera.](shot:settings-workplane)

Dzieją się trzy rzeczy:

- Płaszczyzna robocza przyjmuje rozmiar stołu drukarki.
- W narożniku płaszczyzny roboczej pojawiają się nazwa drukarki i jej przestrzeń robocza. Jeśli napis przeszkadza, wyłącz go przez {{ui:workspace.showPlateLabels}} w sekcji {{ui:workspace.workplane}}. Dotyczy to też nazwy projektu z przodu po lewej.
- layerling **ostrzega**, gdy coś się nie mieści.

Większość profili drukarek pochodzi z OrcaSlicera. Jeśli wolisz pracować bez drukarki, wybierz {{ui:workspace.printerNone}}. Rozmiar płaszczyzny roboczej możesz też ustawić ręcznie.

Drukarki delta, takie jak FLSun, SeeMeCNC czy Anycubic Predator, drukują na okrągłym stole. Przy jednej z nich płaszczyzna robocza też jest okrągła i tak szeroka jak stół, a bryła jest za duża, gdy tylko wystaje poza krawędź. Okrągłą bryłę mierzy się po jej własnym obrysie, a nie po otaczającym ją prostopadłościanie, więc zmieści się nawet walec prawie tak szeroki jak stół.

## Gdy coś się nie mieści

Bryła, która wystaje poza krawędź stołu, zostaje oznaczona. Komunikat mówi, które strony wystają i o ile. Tak samo jest, gdy część jest **za wysoka**: wysokość liczy się od najniższej bryły, tak jak slicer stawia model na stole.

![Prostopadłościan jest szerszy niż stół Bambu Lab A1 mini. Komunikat na dole mówi, o ile.](shot:printer-overhang)

Ostrzeżenie nie przeszkadza w dalszej pracy. To podpowiedź, żebyś nie dowiedział się dopiero w slicerze, że część jest za duża. Za dużą część często da się podzielić: przetnij ją na dwie przez {{ui:editor.tool.split}} i wydrukuj obie połowy osobno.

Jeśli celowo odkładasz części obok płyty, kliknij mały krzyżyk w komunikacie. Ostrzeżenie zniknie wtedy dla dokładnie tych brył. Gdy któraś z nich znów się zmieści, a potem ją wysuniesz, albo gdy wystanie inna bryła, komunikat wróci. Ukryte bryły nigdy się nie liczą, więc ukrycie odłożonych części też działa.

## Właściwe ułożenie części

To, jak część leży na stole, decyduje o jej wytrzymałości i wyglądzie. Pomagają dwa narzędzia z sekcji {{ui:editor.group.arrange}}:

- {{ui:editor.tool.layFlat}}: kliknij ścianę, a część położy się tą stroną w dół. Najlepszy kierunek druku jednym kliknięciem.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): stawia część na płaszczyźnie roboczej, gdy unosi się gdzieś w powietrzu.

Kilka praktycznych zasad co do kierunku:

- Duże płaskie ściany na dół. Najlepiej się trzymają.
- Długie, obciążone części układaj tak, żeby warstwy nie biegły prostopadle do obciążenia. Warstwy to najsłabszy kierunek.
- Unikaj nawisów bardziej stromych niż 45° albo daj im podpory w slicerze.

## Szukanie nawisów

W menu obok oka ({{ui:editor.group.visibility}}) pozycja **Pokaż nawisy** włącza nawisy. Każda ściana skierowana w dół bardziej stromo niż 45° jest wtedy kreskowana na czerwono i biało: tam drukarka potrzebowałaby podpór. To, co leży na stole, zostaje bez oznaczeń. Już podczas projektowania widzisz więc, czy kula, łuk albo poziomy otwór wydrukuje się bez podpór. Właśnie do tego służy [otwór łezkowy](chapter:threads-and-mechanics). Obróć część albo połóż ją na innej ścianie przez {{ui:editor.tool.layFlat}}, a kreskowanie od razu podąży za zmianą.

Z jak stromymi nawisami radzi sobie Twoja drukarka, ustawiasz w ustawieniach w sekcji {{ui:workspace.appearance}}: od 30° (ostrożnie) do 70° (dla drukarek z dobrym chłodzeniem wydruku). Ściana opierająca się na innej bryle też jest oznaczana, bo layerling patrzy tylko na samą ścianę.

## Żebra podporowe dla pochylonej części

Część drukowana pochylona na krawędzi, na przykład pod kątem 45°, często nie potrzebuje podpór: jej ściany są wystarczająco strome. Stoi jednak na wąskiej krawędzi i może się przewrócić. {{ui:supportRib.title}} ją trzyma: pod jej dolną ścianą w małej odległości stoi cienkie żebro na owalnej stopie, a maleńkie mostki przytrzymują część. Najpierw obróć część na krawędź i postaw ją na stole.

1. Zaznacz część i kliknij {{ui:supportRib.title}} w grupie {{ui:editor.section.splitShape}} na wstążce, kliknij część prawym przyciskiem albo znajdź narzędzie przez [[Ctrl]]+[[K]].
2. Kliknij dolną ścianę tam, gdzie ma stanąć żebro. Ściana musi być skierowana w dół, nachylona od 15° do 75° i sięgać do stołu; żebro biegnie od miejsca kliknięcia prosto w dół ściany. Jeśli dolna krawędź części jest zaokrąglona lub sfazowana, ściana może kończyć się do 3 mm nad stołem: kliknij płaską ścianę nad zaokrągleniem.
3. Ustaw {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} i {{ui:supportRib.firstLayer}} tak jak w slicerze. Żebro ma grubość dwóch ścieżek dyszy, szczelina do części pół ścieżki; każdy mostek ma szerokość jednej ścieżki i wysokość dokładnie jednej warstwy i leży na warstwie wydruku, więc slicer drukuje go jako jedną cienką ścieżkę, która czysto się odłamuje. {{ui:supportRib.height}} określa, jak wysoko żebro sięga po ścianie (na początku do połowy), a {{ui:supportRib.bridgeSpacing}}, jak daleko od siebie są mostki, w całych warstwach.
4. W {{ui:supportRib.more}} grubość, szczelinę, szerokość mostków i grubość stopy można ustawić ręcznie (do tego czasu wynikają z dyszy i warstw), a także szerokość stopy i zaokrąglenia przy stopie i u góry. Gdy {{ui:supportRib.bridgeGap}} jest większa od 0, mostki nie sięgają już w głąb części, lecz kończą się tyle przed nią, mierząc w warstwie: slicer drukuje wtedy każdy jako osobną ścieżkę, która trzyma część dociśniętą linią i odchodzi bez śladu (pół linii, 0,2 mm przy dyszy 0,4 mm, to dobry początek). Zwiększ przy tym {{ui:supportRib.gap}}, aby mostki nadal przechodziły przez jej część.
5. {{ui:supportRib.apply}} dodaje żebro. Z {{ui:supportRib.bundle}} (na początku włączone) żebro i część są zgrupowane: poruszają się razem i trafiają do slicera jako dwie bryły obok siebie, w wydruku połączone mostkami.

Żebro jest bryłą siatkową: żeby je zmienić, usuń je i utwórz ponownie. Każde kliknięcie tworzy jedno żebro; po kolejne kliknij {{ui:supportRib.repick}} albo powtórz je przez {{ui:editor.tool.array}}. Żebro nie może nigdzie wchodzić w część, a część musi stać na stole - inaczej okno powie dlaczego. Ustawienia zostają w tej przeglądarce na następne żebro.

{{ui:clearance.title}} i {{ui:printCheck.title}} znają żebro: to, że jego mostki wchodzą w część, a żebro i mostki są cienkie i leżą na wysokości jednej warstwy nad szczeliną, jest zamierzone i nie jest zgłaszane. Żebro utworzone w layerling 1.148.0 nie ma jeszcze tego oznaczenia; utwórz je ponownie, a sprawdzenia je pominą.

## Grubość ścianek, luz i fazki

- Ścianki powinny mieć szerokość co najmniej dwóch ścieżek, czyli 0,8 mm przy dyszy 0,4 mm. Solidne części potrzebują od 1,2 do 2 mm.
- Tam, gdzie dwie części w siebie wchodzą, potrzebny jest luz: zwykle od 0,2 do 0,4 mm, zależnie od drukarki. Zanim wydrukujesz dużą część, zrób małą parę próbną.
- Wiele osób lekko fazuje dolną krawędź, która leży na stole. Dzięki temu pierwsza warstwa się nie rozlewa („stopa słonia”).

## Luz twojej drukarki: test pasowania

Każda drukarka drukuje otwory trochę mniejsze, a sworznie trochę grubsze, niż są narysowane, każda o własną wartość, więc luz potrzebny dwóm wydrukowanym częściom jest na początku zgadywaniem. Zmierz go raz: w ustawieniach w sekcji {{ui:workspace.workplane}} przycisk {{ui:workspace.fitTestMake}} kładzie na stole test pasowania. To płytka 60 × 20 × 4 mm z siedmioma otworami na jeden sworzeń 5 mm, każdy narysowany jako 5 mm plus dwa razy 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 lub 0,40 mm, z wypukłą wartością obok, oraz sam sworzeń 5 mm, stojący obok płytki z małą fazką u góry. Składa się ze zwykłych kształtów, więc drukuje się razem z resztą stołu, bez podpór.

Na drukarce, której stół jeździ w przód i w tył, wysoki, cienki sworzeń może się chwiać, odkleić albo wyjść falisty u podstawy, z brimem czy bez. Przed utworzeniem testu pasowania zaznacz {{ui:workspace.fitTestBase}}: sworzeń stoi wtedy na małej płytce 10 mm, która trzyma się stołu. Nie dotyka ścianki gniazda, tylko stoi na małym występie w jego dnie; po wydruku zegnij go w tę i z powrotem, a się odłamie.

Wydrukuj go tak, jak leży, a potem wsuwaj sworzeń fazką do przodu w otwory, zaczynając od najciaśniejszego. **Najciaśniejszy otwór, w którym sworzeń jeszcze się obraca,** wyznacza luz twojej drukarki. Wpisz jego liczbę w polu {{ui:workspace.printerPlay}} albo kliknij ją wśród wartości pod polem. Luz podaje się na stronę, w milimetrach, a przeglądarka pamięta go dla wszystkich projektów; puste pole oznacza, że nie zmierzono.
Przy kilku drukarkach wybierz najpierw w {{ui:workspace.printer}} tę, na której drukujesz: każda drukarka ma własny luz, a nowe elementy zaczynają od luzu drukarki ustawionej dla projektu. Drukarka bez własnego luzu używa luzu ustawionego, gdy nie była wybrana żadna drukarka.

Od tej pory nowe użycia zaczynają od luzu zamiast od wbudowanej wartości: {{ui:lid.gap}} i {{ui:lid.hingePinPlay}} w narzędziu {{ui:editor.tool.lid}}, luz nowego kształtu {{ui:shape.dovetail}} i {{ui:shape.snapFit}}, {{ui:prop.clearance}} nowej nakrętki lub otworu gwintowanego (podwójny luz, bo to miejsce na całej średnicy) oraz {{ui:clearance.threshold}} w {{ui:editor.tool.clearance}}. Tak samo {{ui:split.connectorClearance}} kołków, czopów i jaskółczych ogonów w {{ui:editor.tool.split}}. Dopóki takie pole ma tę wartość, napis „{{ui:printerPlay.fromFitTest}}” obok mówi, skąd pochodzi liczba. Zawias drukowany w jednym kawałku i przeguby narzędzia {{ui:editor.tool.flexi}} zachowują swoje 0,4 mm: drukowane w jednym kawałku, ich szczeliny muszą pozostać otwarte także między warstwami, a tego sworzeń wydrukowany osobno nie mierzy. Miejsce na wciśnięcie magnesu lub klucza Gridfinity oraz miejsce na kupione gniazdo lub płytkę także zachowują własne wartości. Bryły, które już są w projekcie, nigdy się nie zmieniają, podobnie jak projekt, który otwierasz.

## Sprawdzanie wydruku

{{ui:editor.tool.printCheck}} obok {{ui:editor.tool.clearance}} w grupie {{ui:editor.group.combine}} przegląda zaznaczone obiekty, a gdy nic nie jest zaznaczone, wszystkie widoczne, i w jednym oknie mówi, co poszłoby źle przy drukowaniu. Każdy z pięciu wierszy jest zielony, gdy nic nie znalazł, i pomarańczowy z informacją co i gdzie, gdy coś znalazł:

- **{{ui:printCheck.thin.title}}**: miejsca cieńsze niż dwie ścieżki dyszy - 0,8 mm przy dyszy 0,4 mm. Slicer pominie taką ściankę albo wydrukuje ją jako jedną słabą ścieżkę. U góry okna w polu {{ui:printCheck.nozzle}} wybierz swoją dyszę (od 0,2 do 0,8 jednym kliknięciem, każdą inną wpisz). Cienkie miejsca są malowane na bryłach na czerwono z jasną siatką, a wiersz podaje najcieńsze miejsce i ile powierzchni jest za cienkie. Miejsca poniżej 1 mm² i ostre krawędzie, jak krawędź klina, są pomijane.
- **{{ui:printCheck.floating.title}}**: bryła albo osobna część bryły, która nie dotyka ani płyty, ani innej części (z dokładnością do 0,05 mm). Drukowałaby się w powietrzu. Część leżąca na stojącej części jest w porządku.
- **{{ui:printCheck.contact.title}}**: część na płycie, której pierwsza warstwa jest bardzo mała jak na jej wysokość, na przykład kula albo stożek na czubku. Może się oderwać podczas drukowania. Ostrzeżenie pojawia się poniżej 0,5 mm² podstawy, mierzonej 0,1 mm nad płytą, na każdy milimetr wysokości: kula zawsze jest poniżej, sześcian 10 mm ma 10.
- **{{ui:printCheck.overhang.title}}**: te same liczby co w **Pokaż nawisy**, z ustawionym tam kątem.
- **{{ui:printCheck.openMesh.title}}**: zaimportowana siatka z otwartymi krawędziami albo z krawędziami, które dzielą trzy lub więcej ścian. Slicer musi wtedy zgadywać, gdzie jest wnętrze.

![Tacka, której prawa ścianka ma tylko 0,6 mm: Sprawdź wydruk maluje ją na czerwono i podaje w oknie.](shot:print-check)

{{ui:printCheck.show}} przy wierszu przenosi tam kamerę; zaznacza części w powietrzu, te z małym stykiem i otwarte siatki, a przy nawisach włącza **Pokaż nawisy**. Bryły, które się nakładają, są sprawdzane połączone, tak jak łączy je slicer. Jeśli zmienisz projekt, gdy okno jest otwarte, pojawi się {{ui:printCheck.stale}}; kliknij to albo {{ui:printCheck.checkAgain}}. [[Esc]] zamyka okno. W projekcie nic się nie zmienia. AI wykonuje to samo sprawdzenie przez `layerling_check_print`. Okno tylko sprawdza, niczego nie drukuje ani nie zapisuje: aby drukować, wyeksportuj projekt do slicera przyciskiem {{ui:editor.export}} w grupie {{ui:editor.group.file}}. {{ui:printCheck.openExport}} w oknie zamyka sprawdzanie i otwiera eksport.

## Gdy wszystko gotowe

Wybierz {{ui:editor.export}}, a potem **STL** albo **3MF**. STL to najprostszy format. 3MF zachowuje nazwy i kolory poszczególnych brył, więc przydaje się, gdy drukujesz w kilku kolorach. Okno eksportu pokazuje też, ile gramów i metrów filamentu zużyłaby część wydrukowana jako pełna. Więcej w rozdziale [Pliki i zapis](chapter:files-and-saving).
