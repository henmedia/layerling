---
title: Tekst i napisy na łuku
summary: Wypukłe albo grawerowane napisy w ośmiu krojach pisma lub we własnej czcionce, a jeśli chcesz, także wzdłuż łuku okręgu, na przykład na monecie, pokrywce albo pierścieniu.
---

## Dodawanie tekstu

Wybierz {{ui:shape.text}} w bibliotece kształtów i umieść go. W polu {{ui:prop.text}} po prawej wpisz, co ma tam być napisane. Ustawienia poniżej:

- **{{ui:prop.font}}:** dostępnych jest osiem krojów: Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil (litery z prostych linii) i Japanese (Zen Maru Gothic). Nowy tekst zaczyna w kroju Sans. Polskie litery, takie jak ą, ę, ł, ż, a także litery z akcentami i znak € są w każdym kroju, podobnie jak kana, popularne kanji i wiele rzadkich z nazwisk, takich jak 澤, 槇 i 檜: japońskie imię działa w każdym kroju i na plakietce z imieniem. Japońskie litery są pobierane, gdy tekst potrzebuje ich po raz pierwszy (rzadkie kanji w drugim pliku, tylko gdy tekst któreś zawiera), więc taki tekst przez chwilę pokazuje znaki zapytania. Potem zostają na komputerze, więc od tej chwili japoński działa także offline. Do tego dochodzą Twoje własne czcionki, zobacz niżej [Twoje czcionki](#twoje-czcionki).
- **{{ui:nameTag.letterSize}}:** jak duże są litery, patrząc z góry. {{ui:prop.height}} ustawia, jak są grube.
- **{{ui:prop.height}}:** jak daleko napis wystaje z powierzchni.
- **{{ui:prop.bevel}}:** zaokrągla krawędzie liter, żeby wyglądały łagodniej. {{ui:prop.segments}} decydują, w ilu krokach.
- **{{ui:nameTag.letterEdge}}:** zaokrągla albo fazuje górną krawędź liter, jak na plakietce z imieniem: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} albo {{ui:nameTag.edge.chamfer}}, z {{ui:nameTag.letterEdgeSize}} (na początek 0,4 mm, najwyżej tyle, ile wysokość tekstu). Sięga dalej niż {{ui:prop.bevel}}, ale tylko na szerokość kresek: tam, gdzie kreska jest cieńsza niż dwa razy rozmiar, krawędź kończy się węższą górą. Spód zostaje płaski, więc pojedyncze litery można potem przykleić. Gdy krawędź jest wybrana, zastępuje {{ui:prop.bevel}}.
- **Rozmiar:** długość i szerokość wiersza ustawiasz jak przy każdym kształcie. Przeciągnij uchwyty albo wpisz wymiary.
- **{{ui:prop.textSpacing}}:** odstęp między literami ponad ten, który ma czcionka, w procentach wielkości liter: 0 zostawia go tak, jak zrobiła go czcionka, powyżej litery stoją dalej od siebie, poniżej (do -50) ciaśniej, czego często potrzebuje własna czcionka. Litery zachowują rozmiar, a ramka podąża za wierszem, w tekście prostym i na łuku. Odstęp nie jest stosowany do arabskiego i hebrajskiego, których litery się łączą.
- **{{ui:prop.textVertical}}:** układa litery od góry do dołu, każdą na środku jednej pionowej linii, na tabliczkę na framudze drzwi albo imię wzdłuż długopisu. Ramka staje pionowo, a litery zachowują rozmiar. {{ui:prop.textSpacing}} ustawia odstęp między nimi. W tekście na łuku litery tworzą kolumnę wzdłuż lewej strony okręgu, każda stoi prosto. {{ui:prop.textInwardColumn}} przenosi kolumnę na prawą stronę.
- **{{ui:prop.textStretch}}:** na początku wyłączone: litery zachowują proporcje i stoją na środku ramki, więc ramka rozciągnięta szerzej lub głębiej, niż potrzebuje słowo, zostaje większa od liter. Włącz to, a litery zostaną rozciągnięte na całą ramkę w obu kierunkach: wielką literę można obniżyć albo zwęzić, jak w Tinkercadzie. Dotyczy to prostego tekstu. Tekst na łuku ma własną wielkość liter.

Tekst jest na początku jedną bryłą. Jeśli chcesz obrabiać litery osobno, kliknij {{ui:inspector.separateParts}}. Wtedy każda litera jest osobnym kształtem.

Krawędzie tekstu też można fazować albo zaokrąglać, prostego i na łuku, zobacz [Łamanie krawędzi i drążenie brył](chapter:edges-and-hollowing). Używaj małych rozmiarów, takich jak od 0,2 do 0,5 mm, bo kreski liter są wąskie.

## Twoje czcionki

Lista {{ui:prop.font}} rysuje każdą czcionkę jej własnymi literami, słowami twojego tekstu, więc widzisz, jak będzie wyglądać, zanim ją wybierzesz. Tak samo jest z czcionkami w oknie opisanym niżej. Czcionki z twojego komputera pokazują tam swoje nazwy własnymi literami. Na liście działają strzałki i [[Enter]], a litera przeskakuje do następnej czcionki, która się od niej zaczyna.

Oprócz ośmiu wbudowanych krojów możesz użyć dowolnej własnej czcionki: pliku czcionki z komputera albo, w Chrome i Edge, czcionki zainstalowanej na komputerze. Wybierz {{ui:font.manage}} na dole listy {{ui:prop.font}}. Otworzy się okno {{ui:font.title}}.

- **{{ui:font.addFile}}** przyjmuje plik TrueType (`.ttf`), OpenType (`.otf`) albo WOFF (`.woff`). Plik możesz też po prostu przeciągnąć do okna.
- **W Windows** zainstalowane czcionki są w folderze Czcionki (`C:\Windows\Fonts`). Okno wyboru plików w przeglądarce go ukrywa. Otwórz go zamiast tego w Eksploratorze i przeciągnij czcionkę do okna {{ui:font.title}}. Czcionki zainstalowane tylko dla Ciebie są w `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, który okno wyboru plików pokazuje. Na Macu czcionki są w `/Library/Fonts` i `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** pokazuje listę czcionek zainstalowanych na komputerze. Za pierwszym razem przeglądarka zapyta, czy layerling może je odczytać. Pole wyszukiwania szybko znajduje czcionkę, a kliknięcie ją bierze.

Jeśli zaznaczony jest tekst, od razu dostaje nową czcionkę. W przeciwnym razie czcionka pojawia się na liście {{ui:prop.font}} w grupie {{ui:font.customGroup}}, a {{ui:font.use}} w oknie nakłada ją na zaznaczone teksty. Własne czcionki działają jak wbudowane: tekst na łuku okręgu, fazki i zaokrąglenia krawędzi oraz eksport STEP działają tak samo. Litery, których czcionce brakuje, są brane z kroju Sans.

### Arabski i hebrajski

Arabski, perski, urdu i hebrajski pisze się od prawej do lewej: pierwsza litera stoi po prawej, a w tekście mieszanym, takim jak „Name عربي”, wstecz biegnie tylko arabskie słowo, cyfry zostają jak zwykle. Litery arabskie łączą się z sąsiednimi tak, jak wymaga tego pismo, a lam-alef staje się ligaturą. Potrzebna jest do tego czcionka, która ma te litery. Wbudowane ich nie mają. Dodaj własną, taką jak Arial, Tahoma albo Segoe UI w Windows, albo darmową, taką jak Noto Naskh Arabic, Noto Sans Arabic albo Amiri. Znaki samogłosek siedzą na literze, do której należą. Tekst na łuku okręgu, kontur, sylwetka, warstwy i plakietki z imieniem działają z nią jak z każdym innym tekstem.

### Co działa w której przeglądarce

| Przeglądarka | Wybór pliku czcionki | Czcionka z komputera |
| --- | --- | --- |
| Chrome i Edge na komputerze, także zainstalowana aplikacja layerling | tak | tak, po pytaniu przeglądarki |
| Firefox | tak | nie |
| Safari na Macu | tak | nie |
| Tablet i telefon | tak, z plików urządzenia | nie |

Strony internetowe nie mogą tak po prostu odczytywać zainstalowanych czcionek. Tylko Chrome i Edge mają na to zgodę, i to tylko na bezpiecznych stronach, przez `https`, jak na layerling.com. Gdy layerling działa przez `http`, na przykład na Twoim własnym serwerze albo jako instalacja Docker w sieci domowej, {{ui:font.fromSystem}} nie ma. Wtedy przeciągnij czcionkę z Eksploratora. W innych przeglądarkach wybierasz plik czcionki z folderu czcionek, z tym samym wynikiem. Jeśli w Chrome albo Edge odmówiłeś na pytanie, zezwól ponownie w ustawieniach witryny, za kłódką na lewo od adresu.

layerling nie odczytuje plików WOFF2 (prawie zawsze jest wersja TTF albo OTF), kolekcji czcionek (`.ttc`, kilka czcionek w jednym pliku) ani kolorowych czcionek emoji. Z bardzo dużych czcionek, na przykład chińskich, layerling bierze pierwsze 8000 znaków. Czcionka zmienna jest odczytywana w ustawieniu domyślnym, zwykle w zwykłej grubości.

Niektóre czcionki, przede wszystkim pisane i zmienne, rysują literę z nakładających się kresek. layerling łączy je przy odczycie czcionki w jeden czysty kontur, więc bryła nadaje się do druku. Takie litery składają się wtedy z bardzo krótkich prostych odcinków zamiast krzywych, czego nie widać.

### Gdzie przechowywane są czcionki

Własna czcionka zostaje **w tej przeglądarce na tym komputerze**. Inna przeglądarka ani inny komputer jej nie znają, dopóki nie dodasz jej także tam. Wyczyszczenie danych witryny w przeglądarce usuwa też czcionki. W oknie {{ui:font.title}} kosz usuwa czcionkę z przeglądarki. Twoje projekty nic na tym nie tracą, jak pokazuje następna część.

### Przekazywanie projektów z własną czcionką

Projekt **nie przechowuje pliku czcionki**, tylko kontury liter, których używają jego teksty, także we wcześniejszych krokach historii. Jeśli tekst brzmi „Hej”, razem z nim wędrują tylko H, e i j. Dotyczy to każdego sposobu zapisu projektu: w przeglądarce, na Twoim własnym serwerze, jako plik `.lyl` i w sekcji {{ui:myShapes.title}}.

Zatem:

- **Projekt otwiera się poprawnie wszędzie**, także na komputerze bez tej czcionki. Teksty wyglądają tak samo i da się je przesuwać, obracać, skalować i zaokrąglać.
- **Nowe litery wymagają czcionki.** Jeśli ktoś bez czcionki wpisze literę, której projekt nie przyniósł ze sobą, layerling narysuje ją krojem Sans. Na liście {{ui:prop.font}} czcionka jest wtedy oznaczona jako {{ui:font.fromDesign}}. Dodanie pliku czcionki przywraca wszystkie litery.
- **Eksporty zawierają tylko geometrię.** STL, 3MF, OBJ, STEP i SVG zawierają bryły i kontury, bez czcionki.
- **Starsze wersje layerling** nie znają jeszcze własnych czcionek i rysują takie teksty krojem Multilanguage.

**Licencje:** czcionki są chronione prawem autorskim, a ich licencja mówi, co wolno z nimi robić. Osadzone kontury liter to to, co z czcionki zabierają pliki PDF, a większość licencji na to pozwala. Niektóre czcionki komercyjne zabraniają jednak przekazywania nawet pojedynczych liter. Zanim przekażesz albo opublikujesz projekt z własną czcionką, sprawdź licencję czcionki. Darmowe czcionki, takie jak te z Google Fonts (przeważnie na licencji SIL Open Font License), możesz przekazywać bez obaw. Dla wydrukowanej części albo wyeksportowanego STL nie ma to znaczenia: nie zawierają już czcionki, tylko geometrię.

## Wypukły czy grawerowany

- **Wypukły:** postaw tekst na powierzchni i zgrupuj go z bryłą. Wyrośnie z niej jako relief.
- **Grawerowany:** przełącz tekst na {{ui:inspector.hole}}, wsuń go trochę w powierzchnię i zgrupuj z bryłą. Litery zostaną wtedy wygrawerowane.

Aby umieścić napis na bocznej ścianie, najpierw połóż na niej płaszczyznę roboczą, zobacz [Widok i płaszczyzna robocza](chapter:view-and-workplane).

## Kontur, sylwetka i poszerzenie

Tekst nie musi być budowany jako wypełnione litery. {{ui:prop.textFill}} we właściwościach oferuje ten sam wybór co Tinkercad:

- **{{ui:prop.textFill.filled}}:** litery takie, jakie są.
- **{{ui:prop.textFill.outline}}:** linia wzdłuż konturu liter, w połowie wewnątrz, w połowie na zewnątrz.
- **{{ui:prop.textFill.outer}}:** linia wokół liter od zewnątrz.
- **{{ui:prop.textFill.inner}}:** linia po wewnętrznej stronie liter.

Po wybraniu linii tuż pod listą pojawiają się dwa ustawienia: {{ui:prop.sketchLineWidth}} ustawia grubość linii, a {{ui:sketch.strokeJoin}} to, jak obchodzi narożniki ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} albo {{ui:sketch.strokeJoin.miter}}). Rzadsze ustawienia są w {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} pomija otwory w literach O, A albo e, a {{ui:prop.textWider}} zostawia litery wypełnione i pogrubia je dookoła o szerokość linii. Stykające się litery zrastają się w jeden kawałek.

Przy linii zewnętrznej, linii na środku albo poszerzeniu prostokąt otaczający tekstu rośnie, a litery zachowują rozmiar. {{ui:prop.bevel}} i {{ui:prop.segments}} istnieją tylko dla wypełnionych liter.

## Warstwy i plakietki z imieniem

Plakietka z imieniem do druku wielokolorowego to tekst w warstwach: litery na górze, pod nimi ten sam tekst trochę szerszy w drugim kolorze, a na dole płytka bez otworów w trzecim. layerling robi ją jednym kliknięciem:

- **Nowa plakietka:** wybierz {{ui:shape.nameTag}} w bibliotece kształtów i umieść ją. Ma napis „Imię” białymi literami na czerwonym obrzeżu i ciemnej płytce.
- **Z tekstu:** zaznacz tekst i kliknij {{ui:nameTag.makeLayers}} na górze jego ustawień.

Wszystkie ustawienia plakietki są na karcie {{ui:nameTag.title}}, na górze ustawień:

- **{{ui:prop.text}}** i **{{ui:prop.font}}**, także własne czcionki. Plakietka rośnie razem z napisem.
- **{{ui:nameTag.letterSize}}:** jak wysokie są wielkie litery, w mm. Wszystkie warstwy podążają za tym i zostają wyrównane.
- **{{ui:prop.textVertical}}:** stawia plakietkę pionowo, z literami jedna pod drugą, razem ze wszystkimi warstwami.
- **{{ui:nameTag.layers}}:** jeden wiersz na warstwę, od góry w dół. Każdy wiersz ma kolor (kliknij kolorowy kwadrat), to, o ile warstwa jest szersza od liter, jej wysokość oraz {{ui:nameTag.noHoles}}, co wypełnia otwory w literach takich jak O i A. {{ui:nameTag.corners}} ustawia, jak szersza warstwa obchodzi narożniki liter: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} albo {{ui:nameTag.corner.miter}}. Najwyższy wiersz to same litery. **+** dodaje warstwę na dole, **–** usuwa dolną warstwę. Plakietka ma od dwóch do sześciu warstw.
- **{{ui:nameTag.keyring}}:** daje dolnej warstwie prosty występ z zaokrąglonym końcem i otworem na kółko do kluczy. Występ rośnie razem z otworem. Otwór 3 mm, domyślny, daje występ szeroki na 6,5 mm, wystający na 6,75 mm, z brzegiem otworu 2 mm od krawędzi dolnej warstwy. Wybierz {{ui:nameTag.keyringDiameter}} i {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} albo {{ui:nameTag.side.top}}. {{ui:nameTag.side.free}} zdejmuje otwór z plakietki i stawia obok niej osobny {{ui:nameTag.keyringTab}} w kolorze i wysokości dolnej warstwy: zwykły kształt, który przesuwasz i obracasz uchwytami tam, gdzie plakietka go potrzebuje. Gdy stoi na miejscu, {{ui:nameTag.keyringTabFix}} w jego panelu robi z niego część najbliższej plakietki, dokładnie tam, gdzie jest: otwór przechodzi przez każdą warstwę, do której sięga, uszko dołącza do dolnej warstwy, a oba trzymają się tego miejsca przy literach, gdy zmieniasz napis albo rozmiar. {{ui:nameTag.side.free}} wyodrębnia uszko z powrotem tam, gdzie było, żeby znów je przesunąć. Otwór przechodzi przez każdą warstwę, której dotyka, a występ przesuwa się, gdy zmieniasz napis, wielkość liter albo czcionkę. {{ui:nameTag.keyringAlong}} przesuwa uszko w górę lub w dół wzdłuż jego boku (u góry: w lewo lub w prawo), aż do miejsca, w którym opuściłoby bok; 0 to środek. Przydaje się, gdy środek boku trafia na lukę, na przykład obok litery J: przesuń uszko tam, gdzie litera wystaje.
- **{{ui:nameTag.letterEdge}}:** zaokrągla albo fazuje górną krawędź liter na najwyższej warstwie, tak jak wykańcza się wydrukowaną plakietkę: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} albo {{ui:nameTag.edge.chamfer}}, z {{ui:nameTag.letterEdgeSize}} (na początek 0,4 mm, najwyżej tyle, ile wysokość warstwy). Działa dla każdej czcionki i słowa. Krawędź jest częścią siatki liter, więc narzędzie krawędzi bierze taki tekst jako siatkę, co przy tak drobnym tekście jest ciężkie. Wybierz krawędź tutaj.

Każdą zmianę widać od razu. Plakietka jest zestawem: porusza się jako całość, a każda warstwa zostaje osobną bryłą we własnym kolorze, tak jak slicer potrzebuje ich do druku wielokolorowego. Aby zaokrąglić albo ściąć krawędzie jednej warstwy, kliknij {{ui:group.editBundle}} i wybierz warstwę, zobacz [Łamanie krawędzi i drążenie brył](chapter:edges-and-hollowing).

### Wiele plakietek naraz

Wpisz imiona w {{ui:textLayers.names}}, jedno w wierszu, do stu. Przycisk poniżej mówi, ile plakietek zrobi, na przykład „Utwórz plakietki: 12”. Każda plakietka dostaje te same warstwy, wielkość liter i otwór na kółko do kluczy i jest osobnym obiektem. Są układane w rzędach pod pierwszą, co 5 mm. Zwykły tekst też ma listę imion, niżej w swoich ustawieniach.

## Plakietki z ikoną

Plakietka z ikoną to ta sama plakietka, ale z ikoną SVG zamiast liter: serce, chmurka, logo klubu. Ikona na górze, pod nią ten sam kontur trochę szerszy w drugim kolorze, na dole płytka bez otworów.

- **Nowa plakietka z ikoną:** wybierz {{ui:shape.iconTag}} w bibliotece kształtów. Otworzy się małe okno: kliknij {{ui:iconTag.browse}}, wybierz plik SVG, PNG albo JPG, sprawdź obraz, wpisz {{ui:iconTag.width}} ikony i kliknij {{ui:iconTag.ok}}. Plakietka stanie na środku płyty, w tych samych warstwach co nowa plakietka z imieniem.
- **Z bryły ze szkicu:** zaimportowany SVG albo narysowany szkic ma {{ui:nameTag.makeLayers}} na górze swoich ustawień.

Karta {{ui:iconTag.title}} na górze ustawień zawiera:

- **{{ui:iconTag.replace}}:** kładzie na plakietkę ikonę z innego pliku (SVG, PNG albo JPG). Warstwy i szerokość zostają bez zmian.
- **{{ui:iconTag.iconWidth}}:** jak szeroka jest ikona na górze, w mm. Wszystkie warstwy podążają za tym i zostają wyrównane.
- **{{ui:nameTag.layers}}:** wiersze jak przy plakietce z imieniem: kolor, o ile szersza, {{ui:nameTag.corners}}, wysokość i {{ui:nameTag.noHoles}}, **+** i **–**, od dwóch do sześciu warstw. Najwyższy wiersz to sama ikona.
- **{{ui:nameTag.keyring}}:** jak przy plakietce z imieniem: otwór na kółko do kluczy przez każdą warstwę, z występem z zaokrąglonym końcem na dolnej warstwie, poza ikoną. {{ui:nameTag.keyringDiameter}} i {{ui:nameTag.keyringSide}} wybierają jego rozmiar i miejsce, a {{ui:nameTag.side.free}} daje osobne uszko, jak przy plakietce z imieniem. Występ jest robiony pod kontur ikony, więc przy bardzo poszarpanej ikonie sprawdź, gdzie styka się z płytką. {{ui:nameTag.keyringAlong}} przesuwa uszko wzdłuż jego boku, tak jak na plakietce z imieniem.
- **{{ui:iconTag.count}}:** ile plakietek chcesz, od 1 do 100. {{ui:iconTag.fill}} wylicza to z płyty drukarki wybranej w ustawieniach, dla małych logo cała płyta. Przycisk poniżej je tworzy, co 5 mm, ułożone na środku płyty. Pierwsza to sama plakietka.

SVG potrzebuje zamkniętych konturów. Rysunek z samych otwartych linii nie może stać się plakietką. Bryła ze szkicu, której wypełnieniem jest linia, zachowuje to: ikoną jest powierzchnia tej linii.

**Obraz (PNG albo JPG)** zostaje obrysowany konturem, a podgląd pokazuje kontur. W {{ui:iconTag.part}} wybierasz, czy ikoną ma być {{ui:iconTag.part.dark}}, czy {{ui:iconTag.part.light}}. Na początku jest to część, która nie jest tłem. Przezroczyste piksele nigdy nie należą do ikony. SVG, który zawiera tylko jeden obraz, tak jak Inkscape zapisuje zaimportowaną bitmapę, jest obrysowywany tak samo. Kontur podąża za pikselami, więc mały obraz daje poszarpaną krawędź. Najlepiej działają obrazy od kilkuset pikseli w górę. {{ui:iconTag.replace}} bierze tę część obrazu, która nie jest jego tłem.

## Kody QR

Kod QR zamienia tekst lub adres strony we wzór, który odczytuje aparat telefonu: link do twojego sklepu na tabliczce, nazwa Wi-Fi na podkładce, numer telefonu na breloku.

Wybierz {{ui:shape.qrCode}} w bibliotece kształtów. Otworzy się okno; kursor stoi już w polu tekstowym:

- **{{ui:qrCode.text}}:** co mówi kod. Enter tworzy kod, Shift+Enter zaczyna nowy wiersz. Pod polem widać, ile miejsca jest zajęte; polskie litery i inne znaki specjalne zajmują dwa bajty. Gdy tekst jest za długi, pole o tym powie.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q lub H. Wyższy poziom da się odczytać, nawet gdy część kodu jest brudna lub porysowana (L około 7 %, M 15 %, Q 25 %, H 30 %), ale dla tego samego tekstu potrzebuje więcej modułów, więc każdy moduł jest mniejszy. Na początku wybrane jest M.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} buduje sam kod, wysoki na 4 mm. {{ui:qrCode.style.raised}} stawia go na wysokość 1 mm na białej płytce grubości 3 mm, jako pakiet dwóch kolorów, żeby druk wielokolorowy wydrukował kod ciemno, a płytkę jasno. {{ui:qrCode.style.engraved}} wycina kod na 1 mm w płytce.
- **{{ui:qrCode.sizeBy}}:** wpisz {{ui:qrCode.sizeBy.width}} całego kodu (na początku 40 mm) albo rozmiar jednego modułu; druga liczba jest podana poniżej. Moduły mniejsze niż 0,8 mm dostają ostrzeżenie. To reguła orientacyjna dla dyszy 0,4 mm, nie gwarancja: znaczenie mają drukarka, materiał, kolory i telefon.
- **{{ui:qrCode.quietZone}}:** skanery potrzebują wokół kodu pustego marginesu o szerokości czterech modułów. Na płytce margines jest częścią płytki; wyłącz go tylko wtedy, gdy płytka leży na większej jasnej powierzchni. Sam kod nie ma własnego marginesu: zostaw wokół niego wolne miejsce.
- **Wysokości:** wysokość kodu, na płytce wysokość kodu lub głębokość grawerunku, oraz grubość płytki.

Podgląd pokazuje kod tak, jak zostanie zbudowany. {{ui:qrCode.ok}} stawia go na środku stołu.

Kod jest bryłą jak każda inna: przesuwaj go, obracaj, skaluj (szerokość i głębokość zostaw równe, inaczej kod się zniekształci), grupuj, albo zamień go w otwór i zgrupuj z własną częścią, żeby go w niej wygrawerować. Skalowanie skaluje cały kod; każdy moduł pozostaje kwadratowy.

Karta {{ui:qrCode.title}} na górze jego ustawień zawiera tekst. Zmień go i kliknij {{ui:qrCode.regenerate}}: kod zostanie zbudowany od nowa tam, gdzie stoi, i tak szeroki, jak jest teraz. Korekcja błędów, strefa ciszy i wykonanie zostają takie, jak je wybrano; dla innych ustawień utwórz nowy kod z biblioteki.

Zeskanuj kod telefonem przed drukiem i jeszcze raz po nim. Najlepiej czyta się ciemne na jasnym; jasnego kodu na ciemnej płytce nie odczyta każdy telefon.

## Tekst na łuku okręgu

Napis ma biec nie prosto, tylko wzdłuż krawędzi monety, pokrywki albo pierścienia? Do tego służy ustawienie {{ui:prop.textCurved}}.

![Tekst podąża za okręgiem. Wszystkie litery stoją na jednej wspólnej linii.](shot:curved-text)

Gdy je włączysz, tekst biegnie wzdłuż okręgu. Wszystkie litery stoją na tej samej linii bazowej, tak równo jak w zwykłym tekście. Są cztery ustawienia:

- **{{ui:prop.textRadius}}** (od 5 do 500 mm): promień okręgu, po którym biegnie linia bazowa liter. Litery zostają na swoim miejscu, zmienia się tylko ich wygięcie.
- **{{ui:nameTag.letterSize}}:** jak wysokie są litery. Nie zależy już od szerokości kształtu.
- **{{ui:prop.textInward}}:** przenosi tekst z góry okręgu na jego dół. Litery są wtedy zwrócone głowami do środka.
- **{{ui:prop.textFlipped}}:** odwraca tylko litery, żeby dało się je czytać z drugiej strony. Tekst zostaje na swoim miejscu na okręgu.

**Środek okręgu to środek kształtu.** Dlatego wyrównywanie działa jak zwykle: jeśli wyśrodkujesz tekst z walcem albo pierścieniem, siedzi na nim dokładnie współśrodkowo. Gdy pociągniesz uchwyt, promień i wielkość liter rosną razem, więc napis się nie zniekształca.

> **Wskazówka:** na górze okręgu litery stoją na zewnątrz linii bazowej, a z {{ui:prop.textInward}} stoją wewnątrz, głowami do środka. Aby napis zmieścił się na krążku, promień plus wielkość liter powinny być mniejsze niż promień krążka.
