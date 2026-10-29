---
title: Umieszczanie i dopasowywanie kształtów
summary: Biblioteka kształtów, wymiary liczbami i uchwytami, kolor, obracanie, zwężanie i skręcanie.
---

Każda część w layerling zaczyna się od kształtu. Z kształtów budujesz wszystko inne: uzupełniają się, wycinają nawzajem albo łączą w nowy kształt.

## Dodawanie kształtu

Kliknij {{ui:editor.addShape}} na wstążce. Otworzy się biblioteka kształtów.

![Biblioteka kształtów. Każdy obrazek jest renderowany z prawdziwej geometrii kształtu.](shot:shape-menu)

Biblioteka zamyka się po każdym wybranym kształcie. Za pasek tytułu można ją przesunąć, żeby nie zasłaniała miejsca, w które celujesz, na przykład nad panel właściwości. Dwukrotne kliknięcie paska tytułu odkłada ją z powrotem pod jej przycisk, a miejsce, w którym ją zostawiłeś, zapamiętuje przeglądarka. Pinezka na pasku tytułu trzyma bibliotekę otwartą, gdy wstawiasz kilka kształtów jeden po drugim. Jej krawędzie i narożniki zmieniają jej rozmiar, tak szeroko i wysoko, jak pozwala ekran. Rozmiar też zapamiętuje przeglądarka, a dwukrotne kliknięcie krawędzi go przywraca. Gdy jest wąska, biblioteka pomija nazwy i pokazuje same obrazki, a nazwa pojawia się po wskazaniu kształtu.

Wybierz kształt. Zawiśnie teraz na wskaźniku myszy i wyląduje tam, gdzie klikniesz. Przesuń go nad bryłę, a położy się na ścianie pod wskaźnikiem, także na skośnej, jak Cruise w Tinkercadzie. Nad pustą płytą ląduje na płaszczyźnie roboczej. [[Esc]] anuluje umieszczanie. Narzędzie, które czeka na kliknięcie, takie jak narzędzie Zmierz, kątownik, notatka, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} albo narzędzia krawędzi, wyłącza się, gdy wybierzesz kształt, więc kliknięcie umieszcza kształt. I odwrotnie: włączenie jednego z tych narzędzi odkłada kształt. Jeśli wolisz, żeby kształt pojawiał się na środku płyty, wyłącz umieszczanie kliknięciem w ustawieniach (sekcja {{ui:workspace.appearance}}, przełącznik {{ui:workspace.cruise}}).

Na ścianie kształt przyciąga się do jej środka, gdy wskaźnik się zbliży, tak jak do narożnika czy krawędzi; przytrzymaj [[Alt]], aby postawić go gdziekolwiek. Przeciągnięty z biblioteki na ścianę zawsze ląduje na jej środku, a z [[Alt]] tam, gdzie go puścisz.

Co oferuje biblioteka:

- **Kształty podstawowe:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (od trzech do dwudziestu czterech boków), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (od trzech do dwudziestu czterech boków, więc także trójboczna), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} i {{ui:shape.torus}}.
- **Rury:** {{ui:shape.tube}} i {{ui:shape.bentTube}} z maksymalnie dwunastu prostych odcinków z łukami pomiędzy nimi, a także {{ui:shape.loft}} z jednego konturu w drugi, na przykład z kwadratu w koło.
- **Kształty ozdobne:** {{ui:shape.star}}, {{ui:shape.heart}} i {{ui:shape.crescent}}.
- **Napisy:** {{ui:shape.text}}, także wzdłuż łuku okręgu. Więcej w rozdziale [Tekst](chapter:text).
- **Mechanika:** {{ui:shape.thread}} (pręt gwintowany, śruba, nakrętka i otwór gwintowany), {{ui:shape.spring}}, pojemniki i podstawy {{ui:shape.gridfinity}}, {{ui:shape.gear}} oraz {{ui:shape.knurl}} na uchwyty. Więcej w rozdziale [Gwinty i mechanika](chapter:threads-and-mechanics).
- **Do konstrukcji:** drukowany w całości {{ui:shape.hinge}}, {{ui:shape.dovetail}}, {{ui:shape.teardrop}} na otwory poziome, {{ui:shape.counterbore}} i {{ui:shape.countersink}} pod łby śrub oraz {{ui:shape.ruler}}, która jest tylko narzędziem pomiarowym i nigdy nie trafia do eksportu.

Trójkąt dostaniesz na dwa sposoby: {{ui:shape.polygon}} z trzema bokami to trójkąt równoramienny, „Dach” z Tinkercada, a {{ui:shape.wedge}} to trójkąt prostokątny. Oba są prawdziwymi graniastosłupami trójkątnymi. Aby zrobić trójkątny otwór, skopiuj kształt, zmniejsz kopię, oznacz ją jako otwór i wyrównaj przyciskiem {{ui:editor.tool.centerOnWorkplane}} albo {{ui:editor.tool.align}}. Oba działają na prostopadłościanie otaczającym kształt, czyli najmniejszym pudełku, które go mieści, więc przepołowiony kwadrat nadal liczy się jak cały kwadrat. Wyszukiwanie poleceń ([[Ctrl]]+[[K]]) znajduje oba kształty także pod hasłem „trójkąt” albo „dach”.

{{ui:shape.slot}} może być na jednym końcu węższa niż na drugim, na przykład na osłonę paska między dwoma kołami pasowymi. W sekcji {{ui:inspector.properties}} ustaw {{ui:prop.slotSmallEnd}}. Duży koniec jest tak szeroki jak kapsuła, a boki biegną prosto od jednego łuku do drugiego. {{ui:prop.slotCentreDistance}} to odległość między środkami obu łuków, czyli rozstaw kół pasowych. Zmień mniejszy koniec, a rozstaw środków zostanie, a kapsuła się wydłuży lub skróci. Zwężona kapsuła też pozostaje dokładną bryłą, do zaokrągleń i STEP.

## Ustawienia kształtu

Gdy tylko kształt jest zaznaczony, po prawej pojawiają się jego ustawienia. Na górze jest nazwa, a ołówek obok niej ({{ui:outliner.rename}}) pozwala wpisać nową. [[Enter]] ją zachowuje, [[Esc]] anuluje, a pusta nazwa przywraca domyślną nazwę kształtu. Dalej po prawej kłódka blokuje kształt przed przypadkowym przesunięciem, a oko go ukrywa. Strzałka po lewej zwija ustawienia do samego paska tytułu. Karty poniżej rozwijają się i zwijają kliknięciem ich tytułu ({{ui:inspector.properties}}, {{ui:inspector.position}}, {{ui:inspector.rotation}}, {{ui:inspector.taper}}, {{ui:inspector.twist}} i karty kształtów specjalnych). layerling pamięta, które zostawiłeś otwarte, dla następnego kształtu i następnej wizyty.

Ustawienia są zadokowane przy prawej krawędzi. Jeśli zasłaniają coś, co chcesz widzieć, przeciągnij je za pasek tytułu, a będą unosić się tam, gdzie je upuścisz, także dla następnego kształtu. Upuść je z powrotem w prawym górnym rogu albo kliknij dwukrotnie pasek tytułu, a znów się zadokują. Gdy unoszą się albo są zwinięte, krok przyciągania przenosi się z dołu ustawień do prawego dolnego rogu płaszczyzny roboczej.

![Ustawienia walca: bryła lub otwór, średnica i wysokość jako liczba i jako suwak.](shot:editor-overview)

- **{{ui:inspector.solid}} albo {{ui:inspector.hole}}:** bryła zostaje, otwór usuwa materiał. Kliknięcie {{ui:inspector.solid}} otwiera kolory. Własne kolory, które tam zmieszasz, czekają potem w {{ui:inspector.recentColors}}, ostatnie osiem. Więcej w rozdziale [Bryły i otwory](chapter:solids-and-holes). Pinezka w rzędzie {{ui:inspector.keptColors}} zachowuje wybrany kolor na stałe: stoi w osobnym rzędzie, nowsze kolory nigdy jej nie wypychają, a tą samą pinezką można ją znów zwolnić; w tej przeglądarce zostaje do 21 kolorów.
- **{{ui:inspector.transparent}}:** pozwala patrzeć przez bryłę, na przykład żeby zobaczyć kształt za nią.
- **{{ui:inspector.multicolor}}:** tylko dla grupy, przełącza go [[Shift]]+[[M]]. Po włączeniu każda część grupy pokazuje się we własnym kolorze, także w grupie, którą otwory wycięły w jedną bryłę (ścianki zostawione przez otwór przyjmują kolor bryły, w której go wycięto). Wybranie koloru dla grupy wyłącza tę opcję i koloruje całą grupę. Zestawy zawsze zachowują kolory swoich części. W eksporcie 3MF każda część zachowuje swój kolor, więc slicer może przypisać części do filamentów. OBJ zapisuje kolory w punktach, więc granica między dwoma kolorami jest tam trochę mniej równa.
- **{{ui:inspector.properties}}:** wymiary i wszystko, co należy do tego kształtu. Dla walca średnica, wysokość i liczba boków. Dla okrągłej rury lub pierścienia {{ui:prop.outerDiameter}}, {{ui:prop.innerDiameter}} (na tulejkę na wał o znanym rozmiarze) i grubość ścianki: dowolne dwie dają trzecią, w dowolnej kolejności wpisywania. Średnica zewnętrzna zachowuje otwór i zmienia ściankę, średnica wewnętrzna zachowuje zewnętrzną i zmienia ściankę, a otwór szerszy niż rura powiększa średnicę zewnętrzną o ściankę. Długość rury to jej wysokość. Rura, która nie jest okrągła, bo pociągnąłeś jeden z jej boków, ma zamiast jednej średnicy zewnętrznej boki Długość i Szerokość, a ścianka zostaje przy zmianie szerokości. Dla koła zębatego zęby, dla sprężyny zwoje. Wartość, którą zmieniłeś względem domyślnej, dostaje obok nazwy małą strzałkę: kliknięcie cofa tylko tę jedną wartość, cokolwiek innego zrobiłeś od tego czasu, inaczej niż Cofnij. Dwukrotne kliknięcie suwaka robi to samo, tutaj i przy suwakach w ustawieniach obszaru roboczego. Przeciągany myszą suwak długości przyciąga się do kroku przyciągania, więc wysokość wychodzi w pełnych milimetrach (nie przy wyłączonej siatce i nie na krótkich suwakach). Wpisana wartość i klawisze strzałek na suwaku pozostają dokładne. {{ui:inspector.saveDefaults}} na dole ustawia bieżące wartości jako początkowe dla tego rodzaju kształtu (tak samo jak {{ui:workspace.shapeDefaults}} w ustawieniach), a {{ui:inspector.resetDefaults}} wraca do wartości programu. Z {{ui:prop.tubeBoreHole}} otwór po zgrupowaniu rury liczy się jako dziura: tnie wtedy także ścianę tego, z czym rura jest zgrupowana, więc dwie rury w złączu T otwierają się na siebie.
- **{{ui:inspector.makeEllipse}}:** tylko na walcu. Walec jest zawsze okrągły: ma jedną średnicę, a każdy uchwyt zmienia oba boki naraz. Aby zrobić owal, kliknij tę opcję, a walec stanie się elipsą ({{ui:shape.ellipse}}), tą samą bryłą, której długość i szerokość ustawiasz potem osobno. Walca z fazką, zaokrągleniem albo ścianką, a także obróconego lub zgrupowanego, nie da się tak zmienić. W takich przypadkach od początku weź {{ui:shape.ellipse}}.
- **{{ui:inspector.taper}}:** różne rozmiary na górze i na dole, na przykład na skos albo lejek.
- **{{ui:inspector.twist}}:** skręca górę względem dołu albo przesuwa ją w bok. Tak powstają skręcone kolumny i pochylone wieże.

![Grupa z pomarańczowego klocka, niebieskiego kołka i otworu, wycięta w jedną bryłę. Przy włączonym Wielokolorowym kołek zostaje niebieski, klocek pomarańczowy, a ścianki otworu przyjmują kolor klocka.](shot:group-multicolor)

Zwężenie i skręt działają prawie na każdym kształcie. Pomijają je tylko koło zębate, gwint, sprężyna, Gridfinity, zawias, piramida, wygięta rura, otwór łezkowy, frezy pod łby śrub i linijka: mają własne stałe wymiary albo, jak piramida, już własny wierzchołek.

![Stożek ze zmienionym promieniem górnym i wysokością: mała strzałka przy każdej wartości ją cofa, a dwa przyciski na dole zapisują lub przywracają domyślne wartości kształtu.](shot:property-reset)

{{ui:inspector.saveDefaults}} zachowuje to, co zmienisz na tym kształcie, jako punkt wyjścia każdego nowego kształtu tego rodzaju: wymiary, ustawienia kształtu i jego kolor. Pokoloruj walec na zielono, naciśnij przycisk, a każdy walec dodany od tej pory będzie zielony; pozostałe rodzaje zachowują własne kolory. {{ui:inspector.resetDefaults}} przywraca rodzaj do tego, z czym uruchamia go aplikacja. Rodzaje, które mają własne wartości domyślne, są oznaczone w ustawieniach w sekcji {{ui:workspace.shapeDefaults}}. Nowy projekt rozpoczęty ze strony startowej też z nich korzysta. Wartości zapamiętuje ta przeglądarka.

Zwężony lub pochylony prostopadłościan, walec, elipsa, wielokąt, rura lub pierścień zachowuje dokładny kształt, podobnie kapsuła, gwiazda, serce, półksiężyc, jaskółczy ogon, zaokrąglony prostopadłościan bez zaokrąglonych górnych i dolnych krawędzi oraz radełko proste albo okrągłe (jego sfazowane końce zwężają się razem z nim). Fazowanie i zaokrąglenie działają na nim jak na zwykłym kształcie, a eksport STEP go zapisuje. To samo dotyczy skręconego kształtu: jego przekrój obraca się dokładnie w miarę wznoszenia, a boki wiją się równo od dołu do góry.

Wpisywanie jest dokładniejsze niż przeciąganie. Wszystkie pola liczbowe przyjmują milimetry, ale też procenty: wpisz „50 %” w szerokość 40 mm, a dostaniesz 20 mm. Pola także liczą: „15*3”, „120-2*4” albo „(40+2)/2” dają 45, 112 i 21, a zamiast * działa też x. Pole pamięta obliczenie, zarówno w panelu właściwości, jak i w polach wymiarów wokół zaznaczonej bryły: gdy później znów w nie klikniesz, zamiast liczby stoi tam wzór, dopóki wartość nadal mu odpowiada, i zmieniasz go na miejscu, np. z „(140+2)/2” na „(40+6)/2”. Jeśli przeciągniesz bryłę za uchwyt albo ją przeskalujesz, wzór przestaje pasować, więc pole znów pokazuje samą liczbę. W kliknięte pole liczbowe kółko myszy i klawisze [[↑]] i [[↓]] zmieniają wartość o jeden krok, z [[Shift]] o większy, a z [[Alt]] o drobniejszy. W polu rozmiaru lub położenia [[Shift]] zmienia wartość zamiast tego o krok siatki, a przy wyłączonej siatce o dziesięć kroków.

### Wybieranie kolorów

Kliknięcie {{ui:inspector.solid}} we właściwościach bryły otwiera kartę kolorów z nagłówkiem {{ui:inspector.shapeColor}}. Na górze pokazuje wartość szesnastkową koloru, który bryła ma teraz. Pod nią są gotowe kolory palety. Kliknięcie jednego z nich koloruje bryłę i zamyka kartę.

{{ui:inspector.custom}} otwiera wybór koloru w przeglądarce, do własnego koloru. To, co oferuje, zależy od przeglądarki: w Chrome i Edge ma pole koloru, suwak odcienia, pipetę, która bierze kolor z dowolnego miejsca na ekranie, oraz wartość jako HEX, RGB albo HSL, przełączaną strzałkami obok. Kolor obowiązuje, gdy zamkniesz wybór albo klikniesz poza nim.

Własny kolor, który tam zmieszasz, czeka potem w {{ui:inspector.recentColors}}, ostatnie osiem. Pinezka w wierszu {{ui:inspector.keptColors}} zachowuje wybrany kolor na stałe: stoi on w osobnym wierszu, nowsze kolory nigdy go nie wypychają, a ta sama pinezka go zwalnia. Ta przeglądarka przechowuje do 21 kolorów. Pinezka jest dla własnych kolorów, bo kolory palety są zawsze dostępne. Przy kilku zaznaczonych kolorach albo przy otworze nie ma jednego koloru do zachowania.

Kolory obszaru roboczego w ustawieniach mają własny, prostszy wybór koloru, z polem koloru, rzędem gotowych kolorów i polem na wartość szesnastkową. Zobacz [Ustawienia](chapter:view-and-workplane).

## Jak okrągłe jest okrągłe? Liczba boków

Okrągłe kształty, takie jak walec, stożek, rura, elipsa albo otwory, mają we właściwościach przełącznik {{ui:prop.sidesFollowSize}} i suwak {{ui:prop.sides}}. {{ui:shape.torus}} ma dwa suwaki: {{ui:prop.torusSides}} wokół pierścienia i {{ui:prop.torusSteps}} wokół rury. Także tam zależą od rozmiaru, dopóki ich nie ustawisz, więc duży torus nie pokazuje płaskich ścianek. Powód: do widoku oraz do STL, 3MF i OBJ layerling rysuje okrąg jako wielokąt z wielu małych boków. Im więcej boków, tym gładszy, ale tym więcej trójkątów potrzebuje.

{{ui:prop.torusTube}} określa, jak gruba jest rura widziana z góry. Wysokość tylko spłaszcza lub rozciąga rurę, więc płaski pierścień zachowuje otwór; przy połowie wymiaru zewnętrznego otwór się zamyka. Przeciąganie uchwytów skaluje rurę razem z kształtem. Dokładną bryłą do fazowania, zaokrąglania i STEP pozostaje tylko torus, którego rura jest tak gruba, jak wysoki jest torus.

**Kiedy liczba boków ma znaczenie**

- **W eksporcie do slicera** (STL, 3MF, OBJ). Walec o małej liczbie boków trafia tam jako wielokąt.
- **Przy łączeniu brył i otworów.** Otwór wycięty otworem o małej liczbie boków jest w gotowej części kanciasty. Dotyczy to też otworów pod śruby.
- **W widoku.** Wiele bardzo gęstych kształtów spowalnia edytor.

**Kiedy nie ma znaczenia**

- **W eksporcie STEP.** Zapisuje on okrągły kształt, a nie wielokąt.
- **Przy fazowaniu i zaokrąglaniu** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}), dopóki kształt pozostaje okrągły. Tak jest, gdy nie ustawiłeś liczby boków, gdy liczba jest co najmniej domyślna dla kształtu albo gdy wielokąt odbiega od okręgu najwyżej o {{value:EXACT_ROUND_TOLERANCE}} mm. Domyślnie to {{value:ROUND_FROM_SIDES}} boków dla walca, elipsy, rury i stożka, {{value:ROUND_FROM_ROOF_SIDES}} dla kształtu {{ui:shape.roundRoof}}, {{value:ROUND_FROM_SPHERE_STEPS}} kroków dla kształtu {{ui:shape.sphere}}, {{value:ROUND_FROM_HALF_SPHERE_STEPS}} dla kształtu {{ui:shape.halfSphere}}, {{value:ROUND_FROM_TORUS_SIDES}} boków i {{value:ROUND_FROM_TORUS_STEPS}} kroków dla kształtu {{ui:shape.torus}} oraz {{ui:prop.quality}} {{value:ROUND_FROM_BENT_TUBE_QUALITY}} dla okrągłej rury typu {{ui:shape.bentTube}}.
- **Przy gwincie, sprężynie albo kole o zębach skośnych.** Narzędzie krawędzi i eksport STEP biorą ich dokładną bryłę, a {{ui:prop.quality}} ustawia tylko, jak dokładnie są rysowane.

**Kiedy znów ma znaczenie**

- **Przy fazowaniu i zaokrąglaniu kształtu o małej liczbie boków.** Jeśli ustawisz liczbę boków poniżej domyślnej, narzędzie krawędzi weźmie kształt tak, jak jest narysowany: walec o 6 bokach zostaje sześciokątnym prętem, a zaokrąglenie biegnie po jego sześciu krawędziach. Tak zbudujesz na przykład gniazdo na nakrętkę z zaokrąglonymi narożnikami. Dla okrągłego kształtu zostaw włączone {{ui:prop.sidesFollowSize}}.

**Jak z tego korzystać**

- **Zostaw włączone {{ui:prop.sidesFollowSize}}.** Wtedy layerling dobiera liczbę boków do średnicy tak, żeby wielokąt odbiegał od prawdziwego okręgu najwyżej o {{value:ROUND_DEVIATION_TOLERANCE}} mm, dużo mniej, niż rozróżni drukarka. Małe kształty dostają co najmniej {{value:MIN_AUTOMATIC_SIDES}} boków, duże więcej.
- **Mniej boków** wybierasz, gdy celowo chcesz wielokąt (ale do tego jest {{ui:shape.polygon}}) albo gdy edytor zwalnia przy bardzo wielu okrągłych kształtach.
- **Więcej boków** prawie nigdy nie jest potrzebne. Tylko przy bardzo dużych okrągłych częściach, gdy widzisz krawędzie w STL.
- **Dla części, które tylko obrabiasz na krawędziach albo przekazujesz jako STEP,** liczba boków nie ma znaczenia.

## Praca z uchwytami

Oprócz ustawień kształt ma uchwyty na sobie:

- **Narożniki i krawędzie** powiększają lub zmniejszają kształt. Przeciągnij jeden z nich poza przeciwległy bok, a kształt rośnie dalej po drugiej stronie tej krawędzi. Strzałka na górze robi to samo poniżej podstawy. Przytrzymaj [[Shift]] podczas przeciągania narożnika, aby skalować szerokość, głębokość i wysokość razem i zachować proporcje. Przytrzymaj [[Alt]], aby skalować od środka zamiast od przeciwległego narożnika. Bez klawiatury albo jeśli nie chcesz trzymać klawisza, włącz {{ui:inspector.keepProportions}} na górze właściwości: wtedy narożniki zawsze zachowują proporcje, a wpisanie szerokości, głębokości albo wysokości skaluje pozostałe dwie o ten sam współczynnik. To ustawienie jest zapamiętywane.
- Czarna **strzałka nad** kształtem podnosi go lub opuszcza; z [[Alt]] wciśniętym od początku w miejscu puszczenia powstaje kopia, co pozwala układać piętrowo. Biały uchwyt **na górnej ścianie** zmienia wysokość.
- **Zakrzywione strzałki** go obracają.
- **Liczby** obok kształtu pokazują wymiary. Kliknięcie jednej z nich otwiera pole, w którym wpisujesz żądaną liczbę. Z [[Enter]] kształt rośnie od krawędzi przeciwległej do liczby, jak przy przeciąganiu. Z [[Alt]]+[[Enter]] rośnie wokół swojego środka, więc kształt wyrównany z innym zostaje wyrównany. Dotyczy to szerokości i długości, a wysokość zawsze rośnie w górę od spodu. Pola we właściwościach po prawej zachowują środek bez żadnego klawisza. [[Tab]] zachowuje liczbę i otwiera następną (szerokość, głębokość, wysokość), a [[Shift]]+[[Tab]] wraca.
- **Kliknięcie narożnika** (bez przeciągania) otwiera szerokość i głębokość razem. Wpisz pierwszą, naciśnij [[Tab]], aby przejść do drugiej, i [[Enter]], aby zastosować obie. [[Esc]] anuluje.

Gdy kształt jest obrócony o kąt prosty, na przykład położony na boku przez {{ui:editor.tool.layFlat}}, pola we właściwościach nazywają się według kierunku, w którym teraz biegnie każdy wymiar: {{ui:prop.height}} to to, co idzie w górę, {{ui:prop.width}} biegnie wzdłuż X, a {{ui:prop.length}} wzdłuż Y. Wpisanie wysokości leżącego kształtu zmienia więc wymiar pionowy, a jego spód zostaje na płycie. Kształt pochylony pod dowolnym innym kątem pokazuje w polach własne wymiary, o czym informuje uwaga pod nimi.

Bez myszy użyj klawiatury: klawisze strzałek przesuwają zaznaczenie o jeden krok przyciągania (0,01 mm przy wyłączonej siatce), z [[Shift]] o pięć, albo o dziesięć, jeśli w ustawieniach w sekcji {{ui:workspace.appearance}} ustawisz {{ui:workspace.gridMajorEvery}} na {{ui:workspace.gridMajorSteps|10}}: aż do następnej ciemniejszej linii, jak w Tinkercadzie. Strzałki podążają za widokiem: [[→]] przesuwa tam, gdzie jest prawa strona ekranu, [[↑]] od Ciebie, także po obróceniu płyty. Wypchnij kształt poza obraz, a widok przesunie się razem z nim. [[Ctrl]]+[[↑]] i [[Ctrl]]+[[↓]] go podnoszą i opuszczają. Seria naciśnięć strzałek to jeden krok w historii: dopóki następne naciśnięcie przychodzi w ciągu półtorej sekundy, Cofnij cofa całą serię, a nie pojedyncze naciśnięcia. [[R]] obraca o 45°, [[Shift]]+[[R]] o 22,5°. [[D]] opuszcza zaznaczenie na płaszczyznę roboczą.

Uchwyty powiększają kształt do rozmiaru Twojej płyty, co najmniej 220 mm szerokości i głębokości. Wpisanie liczby we właściwościach pozwala wyjść poza to, a tak duży kształt nie kurczy się z powrotem, gdy znów go złapiesz. Własny limit dla każdego kształtu ustawisz w ustawieniach w sekcji {{ui:workspace.shapeDefaults}} przez {{ui:workspace.customLimit}}.

Krok przyciągania jest w prawym dolnym rogu edytora i możesz go zmienić w każdej chwili.

## Kopiowanie i duplikowanie

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} i {{ui:editor.tool.duplicate}} są na wstążce ({{ui:editor.group.clipboard}}). [[Ctrl]]+[[D]] duplikuje zaznaczenie. layerling pamięta, jak ostatnio przesunąłeś lub obróciłeś kopię, i przy następnym duplikowaniu robi to samo. Tak w kilku naciśnięciach powstaje rząd otworów albo schodków. Do regularnych układów jest też szyk, opisany w rozdziale [Zaznaczanie i rozmieszczanie](chapter:select-and-arrange).

> **Wskazówka:** Jeśli kształt nie chce przyjąć żądanego rozmiaru, często winne są limity dla nowych kształtów. W sekcji {{ui:workspace.shapeDefaults}} w ustawieniach decydujesz, jak każdy kształt zaczyna i jak duży może być.

## Własne kształty

Uchwyt, rączka albo płyta bazowa, których potrzebujesz raz po raz, trafiają do sekcji {{ui:myShapes.title}}. Znajdziesz ją na górze biblioteki kształtów, nad sekcją {{ui:myShapes.basicShapes}}, a jej strzałka ją zwija.

1. Zaznacz jedną lub więcej brył, także otwory, grupy albo zaimportowany model.
2. Otwórz bibliotekę kształtów i kliknij {{ui:myShapes.saveSelection}}. Wpisz nazwę i potwierdź przyciskiem {{ui:common.save}}.
3. W dowolnym projekcie kliknięcie kafelka wstawia kształt, jak każdy inny kształt. Kafelek możesz też przeciągnąć na płaszczyznę roboczą, a kształt wyląduje tam, gdzie go puścisz. Kształt zawiśnie potem na wskaźniku jak każdy inny: podąża za nim, także nad ścianami innych brył, a kliknięcie go odkłada. [[Esc]] go odrzuca.

Kilka brył wraca razem, ustawionych względem siebie tak jak wcześniej, i każdą da się zaznaczyć osobno. [Notatki](chapter:measuring-and-notes) przypięte do zapisanych brył wędrują razem z nimi i wracają zamknięte, przypięte do wstawionych brył. Wolne notatki i punkty odniesienia zostają w projekcie. Ołówek na kafelku zmienia jego nazwę, a kosz usuwa go po potwierdzeniu. Kształty już wstawione do projektów pozostają bez zmian.

{{ui:myShapes.title}} mieszkają w tej przeglądarce, osobno od projektów, i są dostępne przy następnym uruchomieniu. {{ui:dashboard.backupAll}} na stronie startowej zapisuje je w kopii zapasowej razem z projektami, a otwarcie kopii przywraca jedno i drugie. Aby przenieść do innej przeglądarki tylko kształty, {{ui:myShapes.backup}} (strzałka w dół) zapisuje je jako plik ZIP, a {{ui:myShapes.load}} (strzałka w górę) przywraca je tam. {{ui:myShapes.load}} przyjmuje też pojedyncze projekty `.lyl`, z których każdy staje się kształtem. Kształty, które już są, nie są dodawane drugi raz.

### Foldery

Wiele własnych kształtów łatwiej uporządkować w folderach. {{ui:myShapes.newFolder}} (folder z plusem obok {{ui:myShapes.saveSelection}}) pyta o nazwę i tworzy folder na górze; folder z plusem przy folderze, {{ui:myShapes.newSubfolder}}, tworzy folder w jego wnętrzu. Foldery sięgają trzech poziomów: folder na trzecim poziomie mieści kształty, ale już nie kolejne foldery. Foldery stoją nad kształtami, które nie leżą w żadnym folderze, w kolejności nazw, i rozwijają się i zwijają strzałką; liczba przy folderze liczy kształty w nim i w folderach poniżej. Przy zapisie wybierz folder z listy obok nazwy; z {{ui:myShapes.noFolder}} kształt zostaje na górze.

Folder ze strzałką na kafelku przenosi kształt do innego folderu albo z {{ui:myShapes.noFolder}} z powrotem na zewnątrz. Ołówek przy folderze zmienia jego nazwę, kosz usuwa go po pytaniu razem z folderami i kształtami w środku. Samego folderu nie da się przenieść: utwórz nowy tam, gdzie powinien być, i przenieś do niego kształty. Kopia zapasowa zachowuje foldery, a po jej wczytaniu kształty wracają na to samo miejsce. Na serwerze foldery są folderami wewnątrz `Custom shapes`.

### Własne kształty na serwerze

Gdy jest włączony [wspólny magazyn na serwerze](chapter:files-and-saving), sekcja pokazuje dwie grupy: {{ui:myShapes.onServer}} i {{ui:myShapes.inBrowser}}. Przy zapisie wybierasz, gdzie trafi kształt, domyślnie na serwer. Mieszka tam w folderze `Custom shapes` jako osobny plik `.lyl` z obrazkiem, gotowy na każdym urządzeniu, które ma dostęp do serwera. Jego foldery to foldery wewnątrz `Custom shapes`. Każda strona ma własne foldery, a kształt przenosi się między folderami swojej strony. Chmurka na kafelku w przeglądarce przenosi ten kształt na serwer, a wtedy nie jest on już trzymany podwójnie.

Folder `Custom shapes` widać też na stronie startowej. Otwórz tam kształt jak projekt, zmień go, a zapisze się automatycznie, jak każdy projekt na serwerze. Następne wstawienie weźmie nową wersję. Magazyn na serwerze nie ma logowania, więc każdy, kto ma dostęp do serwera, widzi te same kształty.

## Owijanie wokół walca

Wzór, logo albo napis ma trafić na kubek, puszkę albo rurę? Najpierw połóż go płasko na płycie, na przykład jako zaimportowany SVG albo tekst, tak jak ma wyglądać z góry. Potem owiń go wokół walca w ustawieniach kształtu, w sekcji {{ui:inspector.wrapCylinder}}:

1. Otwórz {{ui:inspector.wrapCylinder}} i wpisz {{ui:inspector.wrapDiameter}} ścianki walca, na przykład zewnętrzną średnicę kubka. Działają też dziesiąte części milimetra, na przykład 63,5.
2. Kliknij {{ui:inspector.wrapApply}}. To, co biegło od lewej do prawej, biegnie teraz wokół walca, tylna krawędź staje się górą, a grubość wystaje ze ścianki.
3. Zaznacz owinięty kształt i walec, a potem wyśrodkuj oba od lewej do prawej i od przodu do tyłu. Środek owiniętego kształtu to oś walca, więc kształt siedzi wtedy dokładnie na jego ściance.

Do grawerowania włącz {{ui:inspector.wrapInward}}: grubość wchodzi wtedy w ściankę. Zmień kształt w otwór, wyśrodkuj go i zgrupuj z walcem.

Kształtu, który jest już owinięty, nie da się owinąć ponownie, bo jest siatką owiniętego obiektu. Cofnij owinięcie albo owiń jeszcze raz płaski oryginał z inną średnicą.

Wynikiem jest siatka, jak zaimportowany model. Cofnij kładzie kształt z powrotem płasko, więc aby zmienić średnicę, najpierw cofnij, a potem owiń ponownie. Owinięcie nie może sięgać dalej niż jedno okrążenie walca, a wtedy layerling podaje najmniejszą średnicę, która się zmieści.
