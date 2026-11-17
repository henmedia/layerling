---
title: "Szkice: od konturu do bryły"
summary: Narysuj płaski kontur, zaokrąglij lub sfazuj jego narożniki i wyciągnij go albo obróć w bryłę.
---

Nie wszystko da się złożyć z kształtów podstawowych. Do części z własnym konturem, takich jak wspornik, profil zęba albo wazon, najpierw rysujesz **kontur**, a potem robisz z niego bryłę. Do tego służy tryb szkicu.

## Rozpoczynanie szkicu

Na górze przełącz z {{ui:editor.modeGeometry}} na {{ui:editor.modeSketch}}. W grupie {{ui:sketch.group.create}} na wstążce stoją obok siebie trzy przyciski określające, czym ma się stać kontur:

- **{{ui:sketch.extrude}}:** kontur zostaje wyciągnięty w górę, jak foremka do ciastek.
- **{{ui:sketch.revolve}}:** kontur zostaje obrócony wokół osi, jak na tokarce. Tak powstają wazony, kubki, stożki i wszystko, co okrągłe.
- **{{ui:sketch.sweep}}:** kontur zostaje poprowadzony wzdłuż ścieżki: kanał kablowy, który skręca za róg, rurka, pierścień wokół kształtu. Zobacz niżej część „Szkic po krzywych”.

Edytor pokazuje wtedy arkusz z siatką. To Twoja powierzchnia do rysowania.

Szkic leży na płaszczyźnie roboczej. Aby rysować na ścianie bryły, na przykład gdy kontur ma zaczynać się wyżej, najpierw połóż płaszczyznę roboczą na tej ścianie klawiszem [[W]] (zobacz [Widok i płaszczyzna robocza](chapter:view-and-workplane)), a potem zacznij szkic.

## Rysowanie

Wstążka w trybie szkicu jest podzielona na sekcje. Niżej każde narzędzie ma własną kartę: co robisz, jeden krok w wierszu, a po strzałce, co się wtedy dzieje. Klawisz po prawej stronie karty wybiera narzędzie.

### Narzędzia rysowania

::: icon=line {{ui:sketch.line}} | [[1]]
Klikaj punkty jeden po drugim.
Przytrzymaj [[Shift]], aby nowa linia przyciągała się co 15°, także poziomo i pionowo.
=> Długość i kąt nowej linii widać przy wskaźniku.
Jak wpisać, jak długa ma być, opisuje część [Linie liczbami](#linie-liczbami).
> Każdy kliknięty punkt trafia na siatkę ustawioną w {{ui:inspector.snapGrid}}. Z przytrzymanym [[Shift]] pierwszeństwo ma krok 15°: długość nadal rośnie krokami siatki, ale koniec może leżeć między liniami siatki.
:::

::: icon=arc {{ui:sketch.arc}}
Kliknij dwa końce łuku.
Kliknij trzeci punkt, przez który ma przechodzić łuk.
=> Do trzeciego kliknięcia za wskaźnikiem podąża podgląd, a komunikat podaje promień.
=> Koniec kliknięty na istniejącym punkcie łączy się z nim, więc łuk może zamknąć kontur.
[[Esc]] porzuca kliknięte dotąd punkty i wraca do {{ui:sketch.select}}.
> Narysowany łuk jest zwykłą geometrią z punktów i krzywych: przesuwasz go, tniesz i wymazujesz jak każdą inną linię.
:::

::: icon=bezier {{ui:sketch.bezier}} | [[2]]
Kliknij punkt i przeciągnij w kierunku, w którym linia ma biec dalej, jak narzędziem pióra w Illustratorze albo Inkscape.
=> Im dalej przeciągniesz, tym mocniej się wygina.
=> Odcinek do nowego punktu wygina się w trakcie przeciągania, więc widzisz, co dostaniesz.
> Przychodzisz z Tinkercada i chcesz tylko klikać punkty? Weź {{ui:sketch.smooth}}.
> Pierwszy odcinek wygina się na początku tylko wtedy, gdy przeciągasz też przy pierwszym punkcie. Tylko kliknięta linia wychodzi z niego prosto; aby wygiąć ją później, zaznacz punkt narzędziem {{ui:sketch.select}} i przeciągnij jego uchwyt.
:::

::: icon=smooth {{ui:sketch.smooth}} | [[3]]
Klikaj punkty jeden po drugim.
=> Przez klikane punkty prowadzi płynną ścieżkę.
> Na obu końcach otwartej linii krzywa biegnie prosto do następnego punktu, więc pierwszy i ostatni odcinek wyginają się mniej niż pozostałe. Aby któryś wygiąć mocniej, zaznacz jego punkt końcowy narzędziem {{ui:sketch.select}} i przeciągnij jego uchwyt. W zamkniętym konturze wszystkie punkty wyginają się jednakowo.
:::

::: Zamykanie albo kończenie linii
Aby zamknąć kontur, na końcu kliknij ponownie pierwszy punkt.
Aby zakończyć ciąg linii bez zamykania konturu, kliknij prawym przyciskiem bez ruszania wskaźnikiem albo kliknij dwukrotnie ostatni punkt.
Jeśli w trakcie rysowania ciągu przełączysz się na {{ui:sketch.line}}, {{ui:sketch.bezier}} albo {{ui:sketch.smooth}}, linia biegnie dalej od ostatniego punktu.
=> Bryła powstaje tylko z **zamkniętego** konturu.
:::

::: icon=freehand {{ui:sketch.freehand}} | [[5]]
Rysuj piórkiem, palcem albo myszą jak na papierze.
=> Gdy je podniesiesz, linia zmieni się w zwykłe punkty: narożnik tam, gdzie ostro skręciła, gładkie punkty pomiędzy, tylko tyle, ile potrzebuje kształt, więc każdy da się potem przeciągnąć.
Przybliż widok dla drobnych szczegółów: im bliżej patrzysz, tym wierniej linia podąża za ręką.
=> Linia, która kończy się tam, gdzie się zaczęła, zamyka się w kontur, z którego może powstać bryła. Otwarta zostaje linią, dla {{ui:sketch.stroke}} albo jako ścieżka do przeciągania profilu.
Zacznij na liniach albo na obrazie wzorcowym, aby odrysować obraz ręcznie.
Zacznij albo zakończ pociągnięcie na otwartym końcu, aby przedłużyć tę linię, więc kształt można narysować kilkoma pociągnięciami.
> Pociągnięcie nie trzyma się siatki, żeby podążało za ręką. Punkt, który przeciągniesz potem, przyciąga się do niej, chyba że {{ui:inspector.snapGrid}} jest wyłączona.
:::

> Cyfry wybierają narzędzie, dopóki nie jest rysowana żadna linia. W trakcie rysowania są jej długością (zobacz niżej). Gdy aktywne jest {{ui:sketch.select}} i zaznaczone są linie lub punkty, te same klawisze je zmieniają: [[1]] prostuje linie i robi z punktów narożniki, [[2]] zamienia linie w krzywe, a [[3]] wygładza punkty. Gdy nic nie jest zaznaczone, wybierają narzędzie jak wcześniej.

### Kształty

::: {{ui:sketch.addShape}}
Wybierz gotowy kontur: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (tarcza z otworami), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, {{ui:sketch.polygon}} albo {{ui:sketch.star}}.
Kliknij go, aby umieścić go w początku układu szkicu, albo przeciągnij go z menu tam, gdzie chcesz.
Na dole menu {{ui:sketch.polygonSides}} ustawia liczbę boków wielokąta i ramion gwiazdy, a {{ui:sketch.starInner}} to, jak głęboko wcięcia gwiazdy sięgają do środka (od 10 do 90 procent promienia zewnętrznego).
=> Oba dotyczą następnego dodanego kształtu.
=> Jak każdy kształt szkicu, potem są to zwykłe punkty narożne, więc możesz je osobno przesuwać, zaokrąglać i fazować.
> Prostokąt zaczyna od szerokości i głębokości ustawionych dla prostopadłościanu w {{ui:workspace.shapeDefaults}} w ustawieniach, a koło i elipsa od szerokości walca. Bez własnej wartości, i przy pozostałych kształtach, mają 20 mm.
:::

::: Nakładające się kontury
Przesuń dwa zamknięte kontury na siebie.
=> Zostają dwiema bryłami, które w edytorze 3D się łączą. Część wspólna nie jest otworem.
=> Przesuwanie nie łączy linii w miejscach przecięcia, więc kształty możesz znów rozsunąć.
Jeśli natomiast narysujesz linię w poprzek innych, layerling postawi punkt na każdym przecięciu.
> Otwór powstaje tylko z konturu leżącego w całości wewnątrz innego.
:::

### Zaznaczanie i zmiany

::: icon=select {{ui:sketch.select}}
Kliknij punkt albo linię i przeciągnij, aby ją przesunąć.
Kliknij wewnątrz zamkniętego konturu, aby zaznaczyć cały kontur. Wewnątrz otworu wybiera otwór.
=> Od razu możesz go przeciągnąć albo zmienić jego rozmiar.
Przytrzymaj [[Shift]] i kliknij, aby dodać punkt albo linię do zaznaczenia albo je z niego usunąć, więc możesz przesuwać kilka naraz.
Przeciągnij ramkę po pustym miejscu, aby zaznaczyć wszystko w niej.
Przeciągnij linię, aby przesunąć ją za oba końce, albo całe zaznaczenie, jeśli do niego należy.
Klawisze strzałek przesuwają zaznaczenie o jeden krok siatki, z [[Shift]] o większy.
Przytrzymaj [[Shift]] podczas przeciągania, aby ruch został na jednej osi.
:::

::: Ramka wokół zaznaczenia
Przeciągnij uchwyt narożny, aby zmienić szerokość i wysokość razem. Przytrzymaj [[Shift]], aby zachować proporcje.
Przeciągnij uchwyt na boku, aby zmienić tylko jeden kierunek.
Kliknij etykietę szerokości albo wysokości, aby wpisać nowy rozmiar, także jako sumę („60+12.5”) albo w procentach („150%”).
Przeciągnij zakrzywione strzałki przy narożnikach, aby obrócić całe zaznaczenie wokół jego środka.
=> Liczba nad wskaźnikiem pokazuje kąt, a z wciśniętym [[Shift]] obrót idzie co 15°.
=> Podczas obracania pojawia się pierścień: ze wskaźnikiem wewnątrz obrót przyciąga się co 22,5°, na zewnątrz idzie o pełne stopnie, niezależnie od siatki.
[[R]] obraca cały zamknięty kontur o 45° przy każdym naciśnięciu.
:::

::: Pasek nad szkicem
{{ui:sketch.keepProportions}} zachowuje proporcje bez [[Shift]]: narożniki i boki rozciągają wtedy w obu kierunkach jednakowo, a wpisana szerokość albo wysokość zmienia też drugą.
=> layerling zapamiętuje ten przełącznik.
Pola X i Y pokazują, gdzie leży środek zaznaczenia, w mm od początku szkicu. Wpisz wartość, a zaznaczenie przesunie się dokładnie tam, na przykład otwór 12 mm od środka. Y rośnie w górę, jak w edytorze 3D.
Gdy zaznaczone są dwa kontury lub więcej, pasek je wyrównuje: do lewej, do środka albo do prawej oraz do góry, do środka albo do dołu, względem ramki wokół nich wszystkich.
=> Każdy kontur przesuwa się w całości i zachowuje kształt. Wyśrodkowane w obu kierunkach dwa okręgi tworzą pierścień.
:::

::: Blokowanie konturu | [[Ctrl]]+[[L]]
Kliknij {{ui:sketch.lockOutline}} na pasku, aby zablokować zaznaczony kontur, jak zablokowaną bryłę w edytorze 3D.
=> Nie da się go już przesunąć, zmienić jego rozmiaru, obrócić ani zmienić. Jego linie bledną, punkty szarzeją, a uchwyty ramki stają się szare i przestają reagować.
=> Linie mogą nadal zaczynać się w jego narożnikach.
=> Przy wyrównywaniu konturów zablokowany zostaje na miejscu, a pozostałe wyrównują się do niego.
Aby go uwolnić, kliknij kłódkę w jego narożniku, gdy jest zaznaczony, albo kliknij {{ui:sketch.unlockOutline}}.
:::

::: icon=refine {{ui:sketch.refine}} | [[4]]
Kliknij odcinek, aby dodać punkt.
Kliknij punkt, aby go usunąć.
=> layerling łączy jego dwóch sąsiadów, więc kontur zostaje zamknięty.
:::

::: icon=erase {{ui:sketch.erase}}
Kliknij punkt albo linię, aby je usunąć.
Przeciągnij okno nad kilkoma, aby usunąć wszystko w jego wnętrzu.
Gdy coś jest zaznaczone, przycisk wymazuje zaznaczenie.
Aby pozbyć się tylko kawałka okręgu, na przykład do zaokrąglonego narożnika, kliknij dokładnie ten kawałek łuku między dwoma punktami.
=> Reszta zostaje.
:::

::: Zamykanie luki
Przeciągnij jeden otwarty koniec na drugi, na przykład po wymazaniu jednego boku sześciokąta.
=> Przyciąga się tam, a oba stają się jednym punktem, więc kontur znów jest zamknięty.
=> Na przecięciu, na przykład tam, gdzie linia przecina okrąg, łączą się boki biegnące prosto dalej: łuk z łukiem, linia z linią, a okrąg zostaje okrągły.
:::

::: icon=image {{ui:sketch.addImage}}
Podłóż pod szkic obraz wzorcowy, aby go obrysować, zobacz [Obraz jako wzorzec](#obraz-jako-wzorzec).
:::

### Schowek i historia

::: Kopiowanie, wklejanie, duplikowanie, usuwanie
{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} i {{ui:editor.tool.delete}} działają na zaznaczone punkty, linie i obrazy, jak w edytorze 3D. [[Ctrl]]+[[X]] wycina.
=> Wklejona i zduplikowana geometria ląduje obok oryginału z odstępem 10 mm, w wolnym miejscu, w którym nie dotyka żadnej istniejącej linii, więc nigdy nie łączy się z tym, co już jest.
=> Zostaje zaznaczona, więc możesz od razu przeciągnąć ją na miejsce.
{{ui:sketch.undo}} i {{ui:sketch.redo}} cofają krok i przywracają go.
:::

### Notatki

::: {{ui:editor.tool.note}} | [[N]]
Kliknij {{ui:editor.tool.note}} w sekcji {{ui:sketch.viewControls}}, a potem miejsce, w którym ma stanąć notatka: dowolne, także na linii.
Przeciągnij pinezkę, aby ją przesunąć. Kliknięcie pinezki zwija kartę.
=> Notatki szkicu należą do jego bryły: w widoku 3D siedzą na wierzchu bryły utworzonej przez {{ui:sketch.extrude}} lub {{ui:sketch.sweep}} i na narysowanym profilu bryły utworzonej przez {{ui:sketch.revolve}}, i przesuwają się razem z nią.
=> Ponowne otwarcie szkicu pokazuje wszystkie notatki bryły, także te umieszczone w 3D.
{{ui:sketch.undo}} cofa notatkę tak jak linię, a {{ui:sketch.cancel}} odrzuca zmiany w notatkach.
> Więcej w rozdziale [Pomiary i notatki](chapter:measuring-and-notes).
:::

### Widok i wymiary

::: Przesuwanie widoku
Przesuwaj widok środkowym przyciskiem myszy albo [[Shift]] lub [[Ctrl]] z prawym przyciskiem myszy, jak w edytorze 3D.
Gdy nic nie jest zaznaczone, przesuwa go też [[Ctrl]] ze strzałkami: o jedną dziesiątą widoku na naciśnięcie, o połowę z dodatkowym [[Shift]]. Szkic przesuwa się w stronę, w którą wskazują.
[[Home]] mieści cały szkic w widoku, [[F]] przybliża do zaznaczenia (gdy nic nie jest zaznaczone, do całego szkicu), a [[+]] i [[−]] przybliżają i oddalają, jak w edytorze 3D.
Gdy nic nie jest zaznaczone, kliknij dwukrotnie puste miejsce, aby przesunąć je na środek widoku.
> {{ui:workspace.doubleClickCentersView}} w ustawieniach wyłącza dwuklik.
:::

::: Wymiary
Kliknij linię albo punkt.
=> Szkic pokazuje długość linii, a dla punktu długości linii, które się w nim spotykają.
{{ui:sketch.showMeasurements}} na pasku narzędzi szkicu ukrywa i pokazuje te wymiary, gdy przeszkadzają, na przykład podczas kształtowania krzywych.
{{ui:camera.tapeTools}} na pasku narzędzi szkicu mierzy odległość między dwoma punktami. Działa dalej, gdy wymiary są ukryte.
:::

![Kontur w kształcie litery L. Przy zaznaczonym punkcie narożnym, w lewym górnym rogu, widać długości obu linii w milimetrach i kąt między nimi w stopniach.](shot:sketch-outline)

::: Wpisywanie długości
Kliknij etykietę wymiaru prostej linii i wpisz długość w milimetrach.
[[Enter]] ją stosuje, [[Esc]] anuluje.
=> Linia zachowuje kierunek, jej punkt początkowy zostaje na miejscu, a linie na drugim końcu podążają za nią. Gdy zaznaczony jest punkt końcowy, przesuwa się ten punkt.
[[Alt]]+[[Enter]] wydłuża zamiast tego linię w obie strony wokół jej środka.
=> Na krzywych etykieta tylko pokazuje długość.
:::

## Linie liczbami

Gdy postawisz pierwszy punkt narzędziem {{ui:sketch.line}} albo {{ui:sketch.smooth}}, po prostu wpisz liczbę: obok linii otworzą się dwa pola, {{ui:sketch.typedLength}} w milimetrach i {{ui:sketch.typedAngle}} w stopniach. [[<]] albo [[Tab]] przechodzi do kąta, więc „50<30” daje linię o długości 50 mm pod kątem 30°, jak w AutoCAD. [[Enter]] stawia punkt i od razu możesz wpisać następną linię. [[Esc]] zamyka pola, nie kończąc łańcucha linii.

Kąt liczy się przeciwnie do ruchu wskazówek zegara od prawej: 0° w prawo, 90° w górę, 180° w lewo, 270° w dół. Zostaw go pustym, a linia podąży za wskaźnikiem, więc podajesz tylko długość, a kierunek pokazujesz myszą. Sumy takie jak „40+12.5” działają w obu polach. Jeśli punkt wypadłby poza płytą, pole o tym informuje i czeka na inną wartość.

## Wyginanie prostego boku

Zaznacz prostą linię i kliknij {{ui:sketch.curveLine}} na pasku, który się pojawi: bok wygina się w krzywą, jak w Tinkercadzie, i pokazuje swoje dwa uchwyty. Przeciągaj je, aby nadać krzywej kształt. Im dalej odsunięty uchwyt, tym mocniejsze wygięcie. Pod wskaźnikiem uchwyt robi się pomarańczowy i łapie też kliknięcie tuż obok, więc obraz wzorca pod nim nie przesunie się przez pomyłkę. {{ui:sketch.straightenLine}} prostuje bok z powrotem. Zaznaczony punkt możesz zaokrąglić przez {{ui:sketch.smooth}}: dostaje własne uchwyty, a sąsiednie linie stają się krzywymi. Gdy zaznaczysz trzy punkty lub więcej, {{ui:sketch.curveThroughPoints}} na pasku prowadzi jedną gładką krzywą od pierwszego z nich do ostatniego, przez każdy punkt pomiędzy, tak jak rysuje ją narzędzie {{ui:sketch.smooth}}; linie za oboma końcami zostają bez zmian. W innych programach nazywa się to „Fit curve” lub „Fit point spline”. Różnica: {{ui:sketch.curveLine}} wygina każdy zaznaczony bok osobno i zostawia narożniki między nimi, na łuk na jednym boku; {{ui:sketch.curveThroughPoints}} prowadzi przez punkty jedną krzywą bez narożników, do wygładzenia poszarpanej, odrysowanej krawędzi. Kliknij uchwyt, a się podświetli: klawisze strzałek przesuwają go wtedy o jeden krok siatki, z [[Shift]] o większy krok, więc krzywą ustawisz precyzyjnie.

Wartości można też wpisać. Zaznaczony punkt pokazuje na pasku {{ui:sketch.selectionX}} i {{ui:sketch.selectionY}}: gdzie leży, w mm od początku szkicu, Y liczone w górę. Kliknij uchwyt, a pasek pokaże zamiast tego {{ui:sketch.handleX}} i {{ui:sketch.handleY}}: gdzie leży uchwyt względem swojego punktu. W gładkim punkcie przeciwny uchwyt obraca się razem z nim. Daj odpowiadającemu uchwytowi po drugiej stronie to samo Y i X z przeciwnym znakiem, a krzywa wyjdzie dokładnie lustrzana; {{ui:sketch.mirror}} odbija całą połowę naraz.

![Dolny bok konturu w kształcie litery L wygięty w krzywą, z dwoma uchwytami na końcach.](shot:sketch-curve)

## Odczytywanie i wpisywanie kątów

Kliknij punkt narożny, w którym spotykają się **dwie proste linie**: obok długości layerling pokazuje **kąt** między nimi w stopniach, z małym łukiem. Na zamkniętym konturze to kąt wewnątrz kształtu, więc wcięcie ma ponad 180°. Kliknij wartość i wpisz nowy kąt. Jedna z dwóch linii obraca się wtedy wokół narożnika i zachowuje długość, a druga zostaje na miejscu. Obracana linia jest rysowana przerywaną kreską. [[Tab]] przełącza na drugą, [[Enter]] stosuje, a [[Esc]] anuluje. To, co wisi na dalszym końcu obracanej linii, obraca się razem z nią.

Zablokowany punkt zostaje na miejscu, a wpisana wartość się do tego dostosowuje: długość przesuwa wolny koniec linii, a kąt obraca linię, której dalszy koniec jest wolny. Można też zablokować pojedynczy punkt: zaznacz go i naciśnij [[Ctrl]]+[[L]]. Tak dokładnie ustawisz kontur narożnik po narożniku: zablokuj narożnik, wpisz długość i kąt następnej linii, zablokuj jej koniec i idź dalej.

Przesunięcie punktu zmienia trzy kąty: przy samym punkcie i przy dwóch sąsiednich narożnikach na dalszych końcach jego linii. Dlatego layerling pokazuje także te dwa, a każdy można kliknąć i wpisać. Tak ustawisz na przykład lewy dolny narożnik na 75,5°, gdy zaznaczony jest lewy górny punkt, który się przy tym przesuwa. Tu też możesz liczyć, np. „90-14.5”.

Narożnik nie pokazuje kąta tam, gdzie dochodzi do niego krzywa albo gdzie spotykają się więcej niż dwie linie. Przycisk {{ui:sketch.showMeasurements}} na pasku narzędzi szkicu ukrywa kąt razem z długościami.

## Zaokrąglanie lub fazowanie narożników

Kliknij punkt narożny i wybierz {{ui:sketch.filletCorner}} albo {{ui:sketch.chamferCorner}}. Pojawi się małe pole na {{ui:sketch.filletRadius}} albo {{ui:sketch.chamferDistance}}. Wpisz rozmiar i potwierdź znaczkiem ptaszka. Działa to dla narożników między dwiema prostymi liniami.

Kilka narożników naraz też działa: zaznacz je przez [[Shift]] i kliknięcie każdego albo obejmij je ramką i wybierz {{ui:sketch.filletCorner}} albo {{ui:sketch.chamferCorner}} z paska, który się pojawi. Wszystkie dostaną ten sam promień albo odległość. Gdy dwa zaznaczone narożniki mają wspólny bok, każdy bierze najwyżej 45 % jego długości, więc prostokąt zaokrąglony dookoła wychodzi jednakowo w każdym narożniku. Punkty, które nie są narożnikiem między dwiema prostymi liniami, są pomijane, a komunikat mówi, ile ich jest. Ramka wokół całego kształtu albo kliknięcie w jego wnętrzu zaznacza jego narożniki i linie razem, a pasek oferuje wtedy obok narzędzi narożników także {{ui:sketch.curveLine}} i {{ui:sketch.straightenLine}} dla wszystkich zaznaczonych linii.

![Narożnik w lewym górnym rogu zaokrąglony promieniem 12 mm.](shot:sketch-fillet)

## Odbicie lustrzane

Zaznacz punkty i linie (kliknięciem, [[Shift]] i kliknięciem albo ramką wokół nich) i kliknij {{ui:sketch.mirror}} na pasku. Potem wybierz oś: {{ui:sketch.mirrorLeftRight}} odbija względem pionowej osi przez środek płyty, {{ui:sketch.mirrorTopBottom}} względem poziomej, a {{ui:sketch.mirrorAcrossLine}} względem prostej linii szkicu, którą potem klikniesz. Kopia ląduje po drugiej stronie, a oryginał zostaje; nic nie jest powiązane, więc możesz zmieniać każdy osobno. Punkty leżące na osi są wspólne, więc połowa konturu, której końce leżą na osi, staje się konturem zamkniętym: narysuj połowę wspornika, zaznacz ją, odbij i zrób bryłę. Dobrą osią jest linia pomocnicza. [[Esc]] anuluje.

## Linie konstrukcyjne

Linia konstrukcyjna pomaga stawiać punkty, nie stając się częścią bryły. Jest rysowana przerywaną kreską i nigdy nie liczy się jako kontur: możesz ją wyciągnąć dowolnie daleko poza kształt, a bryła nie urośnie.

- Włącz {{ui:sketch.construction}} w grupie {{ui:sketch.group.draw}}. Nowe linie, także wpisywane liczbami, są wtedy liniami konstrukcyjnymi. Przycisk przełącza z powrotem na zwykłe linie.
- Już narysowana linia staje się konstrukcyjna, gdy ją klikniesz i wybierzesz {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} zmienia ją z powrotem w zwykłą linię.
- Nowe punkty przyciągają się do miejsc, w których linia konstrukcyjna przecina inną linię (pokazuje to niebieskie kółko), oraz do końców linii konstrukcyjnej. Tak postawisz narożnik na środku, w stałej odległości od krawędzi albo na przecięciu, bez liczenia.
- Nowe punkty przyciągają się też do środka każdej prostej linii szkicu, do środka każdego okręgu i zaokrąglonego narożnika oraz do środków boków bryły pokazanej pod spodem. Przeciągany punkt pomija środek własnych linii.
- Przeciągane zaznaczenie przyciąga się swoim środkiem: środek okręgu albo prostokąta trafia na końce, narożniki i środki innych linii, na środki okręgów, na przecięcia linii konstrukcyjnych i na narożniki bryły pod spodem, a niebieski pierścień pokazuje gdzie. Kształt przeciągnięty z {{ui:sketch.addShape}} też ląduje środkiem na tych punktach. Przytrzymaj [[Alt]], aby trzymać się tylko siatki.
- {{ui:sketch.fromMiddle}} w grupie {{ui:sketch.group.draw}} rysuje linię od jej środka: najpierw kliknij środek, potem koniec, a linia pobiegnie na tę samą długość w drugą stronę. Środek staje się osobnym punktem. Kliknij przycisk ponownie, aby rysować zwykłe linie.
- Linia konstrukcyjna nie rozcina konturu tam, gdzie go przecina. Przy obracaniu może leżeć także na prawo od osi.

## Robienie z tego bryły

Kliknij {{ui:sketch.finishSketch}}. Kontur stanie jako bryła na płaszczyźnie roboczej. W jej ustawieniach zmieniasz wysokość, kolor i wszystko inne, jak przy każdym innym kształcie. Gdy zmieniasz jej rozmiar, layerling po chwili buduje ją ponownie ze szkicu, a szkic rośnie razem z nią. Dzięki temu zostaje dokładną bryłą, która przyjmuje fazki i zaokrąglenia, a przy następnej edycji szkic ma taki rozmiar jak bryła.

Jeśli płaszczyzna robocza leży na boku bryły, rysujesz tak, jak patrzysz na ten bok: góra w szkicu to także góra gotowej bryły. Blady kontur bryły w widoku szkicu pokazuje, gdzie ona stoi. Jeśli płaszczyzna robocza przecina bryłę, widok szkicu pokazuje zamiast tego kontur tego przekroju, więc wydrążona bryła wygląda jak pierścień, a szkic możesz wyrównać do jej ścianek. Punkt, który postawisz albo przeciągniesz blisko narożnika tych konturów, przyciąga się dokładnie do niego, co pokazuje małe niebieskie kółko. Tak przenosisz do szkicu krawędzie innych brył, nawet gdy płaszczyzna robocza nie leży dokładnie na nich. Aby obrysować istniejącą pracę, włącz {{ui:sketch.showPartEdges}} (przycisk warstw wśród przycisków widoku po lewej): wszystkie krawędzie brył są wtedy rysowane na płaszczyźnie szkicu, cienko i blado, jakbyś patrzył przez nie, niezależnie od wysokości, na której leżą. Płaszczyzna stojąca pionowo, na przykład położona na przedniej ścianie, pokazuje w ten sposób widok z przodu. Ten wybór zapamiętuje przeglądarka.

![Kontur stał się bryłą. Narożnik jest zaokrąglony.](shot:sketch-result)

Przez {{ui:inspector.editSketch}} możesz w każdej chwili wrócić do szkicu, żeby go zmienić. Dwukrotne kliknięcie bryły robi to samo, jak w Tinkercadzie (zablokowana bryła zostaje zamknięta). {{ui:workspace.doubleClickOpensSketch}} w ustawieniach to wyłącza. Obróbki krawędzi, które już zrobiłeś na bryle, przepadają jednak, bo krawędzie powstają od nowa. Bryła, którą obróciłeś lub przesunąłeś w edytorze 3D, otwiera się tam, gdzie stoi na płycie, obrócona tak, jak ją tam widzisz, i na siatce płyty; tylko pochylona lub odbita bryła otwiera się we własnym układzie.

Szkic z kilkoma konturami daje jedną bryłę, a nakładające się kontury łączą się w niej. Aby każdy kontur był osobno, zaznacz bryłę i kliknij {{ui:inspector.separateParts}}: każdy zewnętrzny kontur staje się osobną bryłą z otworami, które w nim leżą, i zachowuje wysokość, kolor i miejsce bryły. Każda część ma własny szkic do edycji, razem z liniami pomocniczymi, więc możesz podnosić lub obniżać części pojedynczo, a potem je połączyć lub odjąć. Przeszkadzają w tym obróbki krawędzi, podobnie jak bryła rozciągnięta później: wtedy jest rozdzielana jak siatka.

**Inny rodzaj bryły z tego samego szkicu:** plakietka u góry szkicu mówi, czym on się stanie: {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} lub {{ui:sketch.modeBadgeSweep}}. Kliknij ją i wybierz inny, także podczas edycji istniejącej bryły: zaimportowany SVG, który wchodzi wyciągnięty, po przełączeniu na {{ui:sketch.modeBadgeRevolve}} staje się wazonem lub gałką. Kontur sięgający za oś przesuwa się w lewo, aż jego prawa krawędź leży na osi; [[Ctrl]]+[[Z]] cofa to przesunięcie. Po zakończeniu nowa bryła zajmuje miejsce starej, z jej nazwą i kolorem, ze stopą na tej samej wysokości. Obróbki krawędzi przepadają, jak przy każdej zmianie szkicu.

### Obracanie szkicu

Przy obracaniu rysujesz połowę przekroju **po lewej stronie osi** pokazanej w szkicu. Obok widzisz podgląd 3D obrotu. Od razu pokazuje, jak będzie wyglądać bryła. Możesz go obracać, przesuwać i przybliżać myszą. Mały przycisk w jego prawym górnym rogu albo dwuklik na nim przywraca pierwszy widok. Kontur musi być zamknięty, albo budujesz otwartą linię jako obrys, zobacz niżej. Na koniec kliknij {{ui:sketch.finishRevolve}}. Pozostałe bryły projektu są pokazane od przodu, w tym samym widoku co profil, z osią pośrodku: rysuj profil obok nich lub nad nimi. Bryła stoi tam, gdzie ją narysowałeś, a pozioma linia przez środek szkicu to podłoże: profil nad nią daje bryłę stojącą wyżej, a jego najniższy punkt to stopa bryły. Aby uzyskać większy promień, odsuń profil dalej od osi, w razie potrzeby poza krawędź płyty: płyta rośnie razem ze szkicem, jej siatka dopasowuje się po puszczeniu, a przycisk minus oddala widok, aż całość się zmieści.

Bryła obrotowa jest dokładną bryłą, tak jak wyciągnięta: przyjmuje fazki i zaokrąglenia i można ją wydrążyć, na kubek albo wazon. Bryła obrócona starszą wersją layerling jest siatką. Otwórz {{ui:inspector.editSketch}} i zakończ szkic ponownie, aby stała się dokładna. Profil, który sięga za oś, nie da się zbudować dokładnie i staje się siatką, jak dawniej.

**Gładsze okrągłe ściany: {{ui:prop.revolveSmoothness}}.** Dokładna bryła obrotowa jest dzielona na małe płaskie fasetki do widoku, eksportu i druku, a na dużej donicy mogą być widoczne na wydruku. Zaznacz bryłę i ustaw {{ui:prop.revolveSmoothness}} w panelu właściwości na {{ui:prop.revolveSmoothnessFine}} lub {{ui:prop.revolveSmoothnessExtraFine}}: okrągłe ściany są dzielone drobniej, kosztem większej liczby trójkątów i wolniejszego projektu. Helisa lub obrót z siatki ma do tego {{ui:prop.sides}}.

**Jedno ciągłe pasmo: {{ui:prop.pitch}}.** Obrót zamienia kontur w zamknięte pierścienie. Zaznacz bryłę obrotową i ustaw jej w panelu właściwości {{ui:prop.pitch}} większy od 0, czyli o ile wznosi się na jeden obrót, a kontur nawinie się w linię śrubową: jedno ciągłe pasmo, jak filament na szpuli albo sprężyna. {{ui:prop.sweep}} zmienia się wtedy w {{ui:prop.turns}}, do 200; liczba ujemna nawija w lewo. Zwoje leżące gęściej, niż wynosi wysokość konturu, zlewają się w jedną bryłę, więc pełny rdzeń z drobnym skokiem też działa. Linia śrubowa jest budowana jako siatka, więc zaokrąglenie, fazka i wydrążanie na niej nie działają; przy wielu zwojach trzymaj {{ui:prop.sides}} nisko. Skok 0 daje znowu pierścienie.

## Szkic po krzywych

{{ui:sketch.sweep}} prowadzi kontur wzdłuż ścieżki: kanał kablowy, który skręca za róg, rurka, osłona wokół paska, pierścień wokół sześciokąta. Stoi obok przycisków {{ui:sketch.extrude}} i {{ui:sketch.revolve}} w grupie {{ui:sketch.group.create}}.

Na tym samym arkuszu rysujesz dwie rzeczy:

- **Przekrój** jako zamknięty kontur, jak zwykle. Narysuj go tak, jak widziałbyś go, patrząc wzdłuż ścieżki od jej początku: w poprzek ścieżki to lewo i prawo szkicu, a góra to góra gotowej bryły. Pusty w środku przekrój, kanał albo rura, to kontur z drugim konturem w środku. Domyślnie przekrój jest wyśrodkowany na ścieżce. Menu obok plakietki trybu na górze pozwala zamiast tego położyć na ścieżce jego lewą albo prawą krawędź ({{ui:sketch.sweepAnchorLeft}}, {{ui:sketch.sweepAnchorRight}}, patrząc wzdłuż ścieżki), żeby szyna leżała po jednej stronie linii albo podążała za krawędzią części. Bryła stoi na płaszczyźnie szkicu najniższym punktem przekroju.

- **Ścieżkę** jako {{ui:sketch.construction}}: włącz ją i narysuj linie albo krzywe, jeden łańcuch, otwarty lub zamknięty (zamknięty łańcuch daje pierścień). Ścieżka leży płasko w płaszczyźnie szkicu.

Narysuj przekrój blisko tego końca ścieżki, od którego ma się zaczynać. Ścieżka zaczyna się od końca, który leży najbliżej przekroju. Potem kliknij {{ui:sketch.finishSweep}}. Narożnik z prostych odcinków staje się ścięciem na ukos, krzywa zostaje gładka, a przekrój przez całą drogę stoi pionowo. Bryła jest dokładna, tak jak wyciągnięta: działają na niej zaokrąglenie, fazowanie i eksport STEP. Jeśli brakuje zamkniętego konturu albo ścieżki albo jest kilka oddzielnych ścieżek, layerling o tym informuje. Przez {{ui:inspector.editSketch}} możesz wrócić do szkicu i zmienić przekrój albo ścieżkę.

## Budowanie jako obrys

Zwykle bryłą staje się powierzchnia wewnątrz zamkniętego konturu. Przez {{ui:sketch.stroke}} w sekcji {{ui:sketch.group.finish}} budujesz zamiast tego samą linię, o ustawionej szerokości. Zaznacz {{ui:sketch.strokeOn}} w oknie obrysu, a szkic od razu pokaże, co powstanie.

- **Zamknięty kontur** staje się ramką. {{ui:sketch.strokeAlign}} mówi, gdzie leży ścianka: {{ui:sketch.strokeAlign.center}} na narysowanej linii, {{ui:sketch.strokeAlign.inside}} wewnątrz niej albo {{ui:sketch.strokeAlign.outside}} poza nią. Na zewnątrz przydaje się do tolerancji: narysuj kontur otworu, na przykład jaskółczego ogona, i daj mu obrys 0,2 mm na zewnątrz, aby uzyskać szczelinę potrzebną na wydruku.
- **Otwarta linia** staje się paskiem, wyśrodkowanym na linii. {{ui:sketch.strokeCap}} ustawia wygląd jej końców: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (dłuższe o połowę szerokości) albo {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} dotyczy obu: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} albo {{ui:sketch.strokeJoin.bevel}}.

Szkic zachowuje narysowaną linię. Otwórz go ponownie, a dalej będziesz zmieniać linię i obrys. Odznacz pole, a znów zostanie zbudowana powierzchnia. Krzywe są do tego dzielone na krótkie proste odcinki.

W obrocie obrys to cienka ścianka: narysuj ściankę wazonu albo kubka jako **jedną otwartą linię** po lewej stronie osi, zaznacz {{ui:sketch.stroke}} i ustaw szerokość, a obrót obróci ten pasek. To, co sięga za oś, zostaje na niej obcięte.

## Wypełnienie i sylwetka

Obrys możesz też ustawić bez otwierania szkicu: we właściwościach bryły ze szkicu wybierz w {{ui:prop.sketchFill}} {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} albo {{ui:prop.sketchFill.center}}, razem z {{ui:prop.sketchLineWidth}} i {{ui:sketch.strokeJoin}}. Bryła jest od razu budowana ponownie tam, gdzie stoi. Odpowiada to trybom wypełnienia przy imporcie SVG w Tinkercadzie: domyślnemu, linii zewnętrznej i linii wewnętrznej. {{ui:prop.sketchFill.grow}} zostawia powierzchnię wypełnioną i poszerza ją dookoła o szerokość linii, z ostrymi, zaokrąglonymi albo ściętymi narożnikami: to warstwa bazowa pod logo do druku wielokolorowego, którą sam obrys na zewnątrz dałby tylko jako pierścień. {{ui:prop.sketchFill.shrink}} działa odwrotnie: powierzchnia zostaje wypełniona, a jej krawędź przesuwa się dookoła do środka o szerokość linii, także w otworach (które rosną). Użyj obu na kopiach jednego szkicu do pasowania: otwór w narysowanym rozmiarze, a część, która przez niego przechodzi, {{ui:prop.sketchFill.shrink}} o 0,5 mm, albo ścianka wewnątrz kształtu wycięta z tego samego konturu. Szerokość większa, niż pozwala kontur, nie zostawia nic. W oknie obrysu szkicu te same dwie opcje są w {{ui:sketch.strokeAlign}}. Przy linii na zewnątrz, do wewnątrz albo na środku {{ui:prop.sketchCuttingEdge}} robi ściankę ostrą u góry: jej góra zwęża się do tej szerokości ze skosem 45° po obu stronach, jak w foremce do ciastek. 0 zostawia płaską górę. Ostrze zostaje, gdy zmienisz szerokość linii.

{{ui:prop.sketchSilhouette}} pomija każdy kontur leżący wewnątrz innego: otwory i wszystko, co w nich leży. Zostaje tylko kontur zewnętrzny. Razem z {{ui:prop.sketchFill.outside}} daje to foremkę do ciastek: zaimportuj SVG dwa razy, raz z sylwetką jako powierzchnią na podstawę, a raz z sylwetką i obrysem 1 do 2 mm na zewnątrz jako ściankę. Przełącznik jest też w oknie {{ui:sketch.stroke}} w trybie szkicu.

Zaokrąglenia i fazki na krawędziach znikają, gdy bryła jest budowana ponownie, tak jak przy edycji szkicu. {{ui:inspector.taper}} i {{ui:inspector.twist}} zostają; zwężenie rośnie lub maleje razem z konturem.

## Skośne ścianki do stempli

Wyciągnięty szkic ma pionowe ścianki. Stempel, matryca do tłoczenia albo wykrojnik potrzebuje skośnych, na zewnątrz i wewnątrz, z tą samą grubością ścianki na całej wysokości. layerling nie ma kąta pochylenia dla wyciągnięcia, ale dla prostych konturów da się to osiągnąć przez {{ui:inspector.taper}}. Jeden sposób, który działa:

1. Narysuj kontur z potrzebnym otworem i zrób z niego bryłę. Zduplikuj bryłę ([[Ctrl]]+[[D]]).
2. Na pierwszej bryle włącz {{ui:prop.sketchSilhouette}}, żeby otwór został wypełniony, i nadaj jej przez {{ui:inspector.taper}} szerszy dół niż górę.
3. Na kopii otwórz ponownie jej szkic i usuń kontur zewnętrzny, żeby został tylko kontur otworu. Zakończ szkic, przełącz bryłę na {{ui:inspector.hole}} i nadaj jej przez {{ui:inspector.taper}} węższy dół niż górę.
4. Przesuń otwór do pierwszej bryły, tam, gdzie był otwór, i zgrupuj obie.

Ścianki są teraz skośne na zewnątrz i wewnątrz. Zwężenie skaluje cały kontur, więc dla prostych kształtów, gdzie możesz dobrać rozmiary tak, żeby ścianki biegły równolegle, jest to dokładne, a dla drobnych szczegółów, takich jak napisy, tylko przybliżone.

## Obraz jako wzorzec

Przez {{ui:sketch.addImage}} podkładasz pod szkic zdjęcie albo rysunek i obrysowujesz go, w dowolnej chwili, także przed pierwszą linią. Możesz ustawić jego rozmiar, przezroczystość i położenie. Gdy obraz leży dobrze, zablokuj go skrótem [[Ctrl]]+[[L]], żeby przypadkiem go nie przesunąć podczas rysowania. Zablokowany obraz nie przeszkadza: kliknięcia przechodzą przez niego, więc możesz wybierać linie i punkty na nim i przeciągać nad nimi ramkę. Kliknięcie kłódki w jego narożniku odblokowuje go; kliknięcie z [[Alt]] zaznacza go bez odblokowania. Jeśli jego ustawienia przy prawej krawędzi zasłaniają obraz, odsuń je za pasek tytułu. Dwukrotne kliknięcie paska je dokuje.

W {{ui:sketch.imageAlign}} wyrównujesz zdjęcie, które nie zostało zrobione na wprost:

- **{{ui:sketch.imageRotation}}:** obróć obraz wokół jego środka zakrzywionymi strzałkami przy jego narożnikach albo liczbą w stopniach. Z [[Shift]] strzałki przyciągają się co 15°. Wewnątrz pierścienia, który pojawia się podczas obracania, przyciągają się co 22,5°, na zewnątrz o pełne stopnie.
- **{{ui:sketch.centreImageX}}** i **{{ui:sketch.centreImageY}}:** ustawiają środek obrazu na X = 0 albo Y = 0. Przy obracaniu X = 0 to oś, więc obraz leży wtedy symetrycznie względem niej.
- **{{ui:sketch.calibrateImage}}:** przycisk jest na górze, tuż pod podglądem; kliknij dwa punkty na obrazie, których odległość znasz, końce linijki albo znaną średnicę, i wpisz rzeczywistą odległość. Obraz zostaje równomiernie przeskalowany tak, żeby ta odległość się zgadzała. Pierwszy punkt zostaje na miejscu.
- **{{ui:sketch.cropImage}}:** uchwyty na ramce przycinają teraz obraz zamiast go skalować. To, co odcięte, zostaje zachowane i wraca przez {{ui:sketch.uncropImage}} albo gdy uchwyt zostanie wyciągnięty z powrotem.

Wszystkie cztery dotyczą tylko wzorca, nigdy szkicu.

**{{ui:sketch.traceImage}}** w ustawieniach obrazu stawia punkty za ciebie: obrysowuje kontur kształtu na obrazie (sylwetkę, logo, słowo) i pokazuje go na czerwono na obrazie, kwadratowe punkty dla narożników, okrągłe dla punktów gładkich. {{ui:sketch.traceDark}} lub {{ui:sketch.traceLight}} wybiera, która część obrazu jest kształtem, {{ui:sketch.traceThreshold}}, gdzie ciemne przechodzi w jasne, {{ui:sketch.tracePoints}}, ile punktów dostają razem kontury (mniej daje gładsze krzywe, więcej dokładniej trzyma się obrazu), {{ui:sketch.traceCorners}}, od jakiego zakrętu punkt jest narożnikiem, {{ui:sketch.traceSpeck}}, jak małe drobinki są pomijane, a {{ui:sketch.traceHoles}} zachowuje środek litery A lub O. {{ui:sketch.traceApply}} wstawia kontury do szkicu dokładnie tam, gdzie leży obraz, w jego rozmiarze, obrocie i przycięciu, i je zaznacza: to zwykłe punkty do przesuwania, wyginania lub usuwania, a [[Ctrl]]+[[Z]] cofa je w jednym kroku. Najlepiej działa przy wyraźnym kontraście; zdjęcie z pstrokatym tłem najpierw wytnij. To, co odpada (wokół konturów, w otworach, to, co odcięte), podgląd zakrywa kolorem płyty, więc z obrazu widać tylko to, co zostaje. Kontury leżące tak blisko, że luźne krzywe by się przecięły, same dostają więcej punktów; karta to mówi. Aby uzyskać brzeg na zewnątrz lub wewnątrz konturu, nadaj bryle szkicu obrys na zewnątrz lub wewnątrz jej linii albo odsuń gotową bryłę.

Do zdjęcia, na przykład zabawki na białym stole, wybierz **{{ui:sketch.traceObject}}** w {{ui:sketch.tracePart}}: tło to kolor przy krawędzi obrazu, a wszystko, co się od niego odróżnia, staje się jednym konturem, niezależnie od kolorów; {{ui:sketch.traceThreshold}} ustala wtedy, jak wyraźnie musi się odróżniać. Kolorowy obraz na jednolitym tle zaczyna w ten sposób. {{ui:sketch.tracePickAreas}} obrysowuje więcej: kliknij obszar na obrazie, na przykład okno, a plama podobnego koloru wokół tego miejsca zostanie obrysowana ({{ui:sketch.traceAreaTolerance}} ustala, jak podobnego). Otwory i kliknięte obszary są wymienione w {{ui:sketch.traceList}}; wskazanie jednego pokazuje go w podglądzie, ✕ go usuwa, a przy wyłączonym {{ui:sketch.traceCut}} jest rysowany jako linia konstrukcyjna zamiast otworu. Obszar sięgający krawędzi obrazu to tło i nie jest brany. To, czego żaden próg ani kolor nie odróżni, na przykład cień tak ciemny jak koła nad nim, usuwa {{ui:sketch.traceTrim}}: klikaj narożniki wokół niego (kliknięcie pierwszego narożnika, dwuklik lub [[Enter]] zamyka), a kontur biegnie wzdłuż cięcia; na liście jest jako „Cięcie 1”.

Drzewo obok domu, postać na pstrokatym tle: tam, gdzie żaden kolor nie odróżnia kształtu od reszty, łapie go **{{ui:sketch.traceLasso}}**: klikaj z grubsza wzdłuż jego krawędzi, a między dwoma kliknięciami linia sama podąża za krawędzią, także na zakrętach; gdy ruszasz wskaźnikiem, podgląd już pokazuje, którędy pobiegnie. Kliknięcie pierwszego punktu, dwuklik lub [[Enter]] zamyka, [[Esc]] odrzuca. Na liście jest jako „Lasso 1”, z wyborem {{ui:sketch.traceRegionAdd}} (obszar dołącza do kształtu) lub {{ui:sketch.traceTrim}} (jest usuwany); każde cięcie ma ten sam wybór. W {{ui:sketch.tracePart}} **{{ui:sketch.traceLassoOnly}}** robi kształt tylko z tego, co tak złapiesz, i nic więcej z obrazu.

![Narysowany dom obrysowany jako obiekt, z progiem obniżonym dla jego jasnej ściany: lasso magnetyczne odcięło drzewo, a osiem szyb okiennych jest wybranych jako otwory.](shot:trace-house)

![Dom jako bryła: bez drzewa, z wyciętymi oknami.](shot:trace-house-body)

## Klawisze w trybie szkicu

| Klawisz | Działanie |
| --- | --- |
| [[Esc]] | odkłada narzędzie notatki; w przeciwnym razie odkłada narzędzie (powrót do {{ui:sketch.select}}), potem czyści zaznaczenie |
| [[Delete]] | usuwa zaznaczony element |
| [[Ctrl]]+[[C]] | kopiuje zaznaczenie |
| [[Ctrl]]+[[X]] | wycina zaznaczenie |
| [[Ctrl]]+[[V]] | wkleja |
| [[Ctrl]]+[[D]] | duplikuje zaznaczenie |
| [[Ctrl]]+[[Z]] | cofa |
| [[Ctrl]]+[[A]] | zaznacza wszystkie punkty i linie |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | podczas rysowania: przyciąga linię co 15°, podczas przeciągania: utrzymuje ruch na jednej osi |
| [[Alt]] | przy stawianiu lub przeciąganiu punktu: tylko na siatkę, bez przyciągania do narożników i środków |
| cyfra, [[<]], [[Tab]], [[Enter]] | podczas rysowania: wpisuje i ustawia długość i kąt następnej linii |
| [[R]] | obraca zamknięty szkic o 45° |
| [[Ctrl]]+[[L]] | blokuje lub odblokowuje zaznaczony kontur albo obraz wzorcowy |
| [[N]] | umieszcza notatkę: następne kliknięcie stawia ją na szkicu |
| [[Shift]]+[[N]] | pokazuje albo ukrywa notatki |

> **Wskazówka:** rysuj tylko tyle punktów, ile trzeba. Kontur z kilku dobrze postawionych punktów daje gładszą bryłę niż plątanina wielu.
