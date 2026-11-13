<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="logo layerling">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">Prosty CAD 3D do druku 3D</h3>
        <p align="right">
          Postaw kształt, wytnij otwór, zaokrąglij krawędź, wydrukuj. W przeglądarce, bez konta i bez znajomości CAD.
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="Licencja GNU AGPLv3" src="https://img.shields.io/badge/license-AGPLv3-663399"></a>
    <img alt="Bez konta" src="https://img.shields.io/badge/no%20account-nothing%20to%20sign%20up%20for-dd7906">
    <img alt="Stworzony do druku 3D" src="https://img.shields.io/badge/made%20for-3D%20printing-ff9e2c">
    <a href="#skill-mcp-layerling"><img alt="Może nim sterować AI" src="https://img.shields.io/badge/AI--drivable-MCP%20server-16c0d4"></a>
  </p>

  <p><a href="README.md">English</a> · <a href="README.de.md">Deutsch</a> · <a href="README.es.md">Español</a> · <a href="README.nl.md">Nederlands</a> · <strong>Polski</strong> · <a href="README.sv.md">Svenska</a> · <a href="README.ar.md">العربية</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-cn.md">简体中文</a> · <a href="README.zh-tw.md">繁體中文</a></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-en.png" width="763" alt="layerling w przeglądarce">
</p>

<p align="center"><em>layerling w przeglądarce</em></p>

<p align="center"><a href="https://layerling.com/instrukcja/index.html"><strong>Instrukcja</strong></a>, krok po kroku i z obrazkami</p>

## Dla kogo

Masz drukarkę 3D. Potrzebujesz części, która do czegoś pasuje, a nie kariery w CAD.

layerling działa tak, jak już myślisz: postaw kształt na płycie, przeciągnij go do właściwego rozmiaru, zamień drugi kształt w otwór, zgrupuj oba, wyeksportuj, wydrukuj. Przed startem nie trzeba się niczego uczyć i **nie trzeba się nigdzie rejestrować**: otwórz stronę i buduj. Twoje projekty domyślnie zostają w Twojej przeglądarce: bez konta, bez chmury, nic nie jest nigdzie wysyłane. Jeśli uruchomisz własną kopię, mogą zamiast tego leżeć w folderze na Twoim serwerze, więc każde urządzenie w domu widzi te same.

### Znasz Tinkercada?

layerling stoi krok dalej niż Tinkercad, w stronę Fusion 360: obsługuje się go tak samo, więc wszystko rozpoznasz (płytę, kształty, bryły i otwory, grupowanie i rozgrupowywanie, zestawy, kopię przez przeciągnięcie z Alt), ale nie kończy się tam, gdzie Tinkercad. Czeka na Ciebie to, czego Ci brakowało:

- **Fazowanie i zaokrąglanie.** Wybierz krawędź i ją sfazuj albo zaokrąglij. O to ludzie proszą najczęściej, gdy wydrukowana część ma wyglądać na wykończoną albo w coś wchodzić. Nałożone obróbki dalej można zmieniać: zdejmij obróbkę albo naciśnij Edytuj, aby zmienić jej wartość na tych samych krawędziach.
- **Drążenie, dzielenie, szkic, gwint.** Wydrąż bryłę do równej ścianki, podziel ją płaszczyzną albo rozciągnij w tym miejscu, rysuj szkice z dokładnymi długościami i kątami i wyciągaj albo obracaj je w bryły, dodawaj śruby, nakrętki i otwory gwintowane.
- **Szyki i owijanie.** Powtórz kształt w rzędzie, w siatce kolumn i rzędów, na okręgu albo spirali, albo owiń wzór lub tekst wokół walca.
- **Wzory otworów.** Kliknij płaską ścianę albo okrągłą ściankę walca lub rury i rozłóż na niej otwory okrągłe, kwadratowe, prostokątne, sześciokątne albo podłużne, w siatce albo naprzemiennie, z rozstawem, marginesem i głębokością: kratki wentylacyjne, maskownice głośników i koszyki w jednym kroku. Albo ustaw pierścień otworów na śruby wzdłuż jej krawędzi, jeśli chcesz z pogłębieniami walcowymi albo stożkowymi, albo powtórz na niej własny kształt, nity albo blachę ryflowaną.
- **Skalowanie procentowe.** Powiększ albo pomniejsz jedną lub wiele części o podaną liczbę procent: razem, tak że układ rośnie razem z nimi, albo każdą na miejscu.
- **Dopasowywanie rozmiarów.** Przytrzymaj Alt na kropce wyrównania, a części rozciągną się zamiast się przesunąć: do boku innej części albo do jej szerokości, długości lub wysokości, na przykład żeby zamienić prostopadłościan na walec tej samej wielkości.
- **Równe odstępy.** Rozłóż części różnej wielkości tak, żeby odstęp między nimi był wszędzie taki sam: między dwiema skrajnymi, na płytce z takim samym odstępem przy krawędziach albo rząd po rzędzie, jak w łamigłówce z kołkami. Odstęp możesz też wpisać.
- **Pomiary i zaglądanie do środka.** Narzędzie Zmierz, linijki, widok przekroju, który rozcina model, i suwak historii, żeby spojrzeć na wcześniejsze stany.
- **Prawdziwa geometria pod spodem.** layerling przechowuje dokładne kształty CAD, a nie tylko siatkę, więc zaokrąglona krawędź zostaje zaokrągloną krawędzią, aż do pliku STEP dla pełnego programu CAD.

To nie jest pełny pakiet CAD: nie ma parametrycznej osi czasu ani złożeń. Możesz za to **uruchomić go sam**: zainstalować jako aplikację (startuje wtedy bez internetu) albo hostować własną kopię w Windows, na NAS-ie albo na serwerze domowym, zobacz [Pierwsze kroki](#pierwsze-kroki).

> **AI może budować razem z Tobą.** layerling ma serwer MCP. Klient AI, taki jak Gemini, Claude albo Codex, widzi otwartą
> kartę edytora i w niej pracuje: dodaje kształty, zmienia wymiary, grupuje, tnie, zaokrągla krawędzie, odczytuje scenę,
> robi zdjęcia widoku. Ty opisujesz część, AI ją buduje, a Ty patrzysz i wkraczasz, kiedy chcesz. Działa to lokalnie
> i nic nie opuszcza przeglądarki. Jak to skonfigurować, opisuje [Skill MCP layerling](#skill-mcp-layerling).

## Co potrafi

### Budowanie

- **Prawdziwy stół roboczy**: siatka, przyciąganie, uchwyty do przesuwania, zmiany rozmiaru i obracania oraz panel z dokładnymi liczbami, gdy ich potrzebujesz.
- **Wpisywanie położenia**: karta Położenie stawia bryłę w dokładnym X, Y i Z, mierzonym od jej środka albo od jej lewej i przedniej krawędzi, a części można odstawić obok płyty, jak w Tinkercadzie.
- **Strzałki osi**: czerwona, zielona i niebieska strzałka w lewym przednim narożniku płyty pokazują X, Y i Z tak, jak liczą liczby, jak w Bambu Studio i OrcaSlicer. W ustawieniach można je wyłączyć.
- **Punkt obrotu, który zostaje**: ustaw punkt obrotu dla jednej bryły, a zostanie przy niej: przesuwa się, obraca i skaluje razem z nią, zapisuje się, można go wpisać jako X, Y i Z albo przeciągnąć myszą, z przyciąganiem do narożników i środków krawędzi, a z Shift do środka ściany (osi sworznia, wierzchołka stożka, nawet przez przezroczyste bryły). Przydaje się do zawiasów i przegubów.
- **Światło i cienie do woli**: kontrast cieniowania, siła i miękkość cieni oraz kierunek i wysokość światła, aż do światła prosto z góry jak w Tinkercadzie, wszystko w ustawieniach. Przycisk „Klasyczny wygląd” ustawia jednym kliknięciem kolory, siatkę i światło jak tam, a ciemniejsze linie siatki mogą wypadać co centymetr we własnym kolorze.
- **Tryb szybki**: dla wolniejszych komputerów. Jeden przełącznik w ustawieniach wyłącza cienie, linie krawędzi i bezwładność kamery i rysuje widok w rozdzielczości ekranu. Samą bezwładność kamery też można wyłączyć, żeby widok zatrzymywał się w chwili puszczenia.
- **Wyrównywanie ścian i odczyt kątów**: narzędzie Wyrównaj ściany przykłada ścianę jednej części do ściany drugiej, stykając je albo na równo, z opcjonalną szczeliną, stawia otwór albo sworzeń na osi innego otworu albo przesuwa część prosto, tak żeby narożnik albo punkt odniesienia trafił w punkt innej części, wzdłuż X, Y i Z albo tylko niektórych z nich. Z drugą i trzecią parą punktów obraca ją na miejsce, jak przy wyrównywaniu po trzech punktach. Obrócona bryła pokazuje pod zaznaczeniem swoje kąty wokół X, Y i Z, a karta Obrót w jej ustawieniach przyjmuje je jako liczby.
- **Przyciąganie do innych kształtów**: podczas przesuwania kształt dociąga swoje krawędzie albo środek do krawędzi i środków kształtów wokół, z linią pomocniczą, więc części stykają się równo bez wpisywania liczb. Liczy się też środek płaszczyzny roboczej, żeby postawić część na środku płyty. Alt podczas przeciągania wstrzymuje przyciąganie, Shift trzyma ruch na jednej osi, a Alt przytrzymany od początku przeciąga kopię, jak w Tinkercadzie. Zmiana rozmiaru też się przyciąga: uchwyt boczny zatrzymuje się na krawędziach innych kształtów i na ściance, na którą trafia, także na wewnętrznej ściance pudełka, więc część wypełnia obudowę od ścianki do ścianki.
- **Kładzenie na ścianach**: jak Cruise w Tinkercadzie. Nowy kształt kładzie się na ścianie pod wskaźnikiem, także na skośnej, a C podnosi zaznaczenie i tak samo kładzie je na innej ścianie. Przytrzymaj Shift przy stawianiu albo przenoszeniu, a zamiast tego zatopi się w ścianie, pionowo, z górą równo ze ścianą: na pogłębienie stożkowe albo walcowe.
- **Punkty odniesienia**: kliknij bryłę prawym przyciskiem, aby oznaczyć jej środek, narożniki albo środki krawędzi punktami, których nic nie drukuje, a do których przyciągają się przeciągane kształty. Punkt można przeciągnąć albo wpisać jego współrzędne, a znaczniki zapisują się z projektem. Narzędzie Zmierz potrafi oznaczyć środek pomiaru, na przykład środek okrągłego otworu.
- **Kątomierz**: kątomierz na pasku widoku mierzy kąt w narożniku z trzech kliknięć albo między dwiema płaskimi ścianami (fazka 45° pokazuje 45° · 135°). Przyciąga się do narożników i krawędzi jak narzędzie Zmierz i podąża za bryłami.
- **Notatki, które czyta AI**: zaznacz *Dla AI* na notatce, a agent AI na mostku MCP przyjmie ją jako prośbę: przeczyta notatkę, wykona pracę i odpowie pod Twoim tekstem. Może też stawiać na modelu własne notatki, żeby o coś zapytać albo coś zgłosić w konkretnym miejscu. Poproś go, żeby pilnował Twoich notatek, a będzie na nie czekał (`layerling_wait_for_notes`): każdą prośbę odbiera, gdy tylko zaznaczysz pole, bez wracania do okna agenta.
- **Pomoc interaktywna**: naciśnij Shift+F1 albo znak zapytania w grupie Pomoc, potem kliknij dowolny przycisk, pole albo okno. Małe okno pokaże część instrukcji na jego temat i na życzenie ją otworzy.
- **Wyszukiwanie poleceń**: naciśnij Ctrl+K i wpisz narzędzie, kształt albo polecenie („fillet”, „mirror”, „cylinder”), aby od razu do niego przejść. Rozumie słowa angielskie i niemieckie i pokazuje obok każdej pozycji skrót klawiszowy.
- **Własne klawisze**: dowolne polecenie z wyszukiwania poleceń możesz w oknie skrótów klawiszowych przypisać do wybranego klawisza. Wyśrodkuj na płaszczyźnie roboczej, panel kształtów albo ulubiony kształt są wtedy pod jednym klawiszem.
- **Własna wstążka**: grupy i przyciski, których nigdy nie używasz, usuniesz ze wstążki w ustawieniach (Wygląd). Wyszukiwanie poleceń i klawisze nadal je uruchamiają, a kolejność wstążki się nie zmienia.
- **Tryb skupienia**: na małym ekranie laptopa ukryj wiersz tytułu i stopkę edytora jednym przyciskiem albo Ctrl+Shift+F. Mały pasek nad widokiem zachowuje karty, Start, nazwę projektu, wyszukiwanie poleceń i ustawienia. Włącza się też sam, gdy przeglądarka jest na pełnym ekranie (F11).
- **Widok historii**: suwakiem wróć do dowolnego wcześniejszego stanu projektu, niczego nie zmieniając. Ten stan możesz wyeksportować albo zacząć od niego nowy projekt. Autor: @rmpel. Cofnij i Ponów podają w podpowiedzi krok, który wycofują, razem z jego wartością („Zaokrąglono krawędzie: Box (5 mm)”), a lista w widoku historii wymienia wszystkie kroki, żeby do każdego przeskoczyć jednym kliknięciem.
- **Milimetry albo cale**: w jednostkach imperialnych każdy wymiar jest pokazywany w calach, jako ułamki jak w Tinkercadzie (1 5/8) albo jako liczby dziesiętne. Siatka przyciągania ma kroki od 1/64 do 1 cala, a siatka płyty jest rysowana w calach.
- **Stół Twojej drukarki**: wybierz jedną z ponad 230 popularnych drukarek, a płyta przyjmie jej rozmiar, okrągły dla drukarki delta, takiej jak FLSun. Jej nazwa i przestrzeń robocza są widoczne w rogu płaszczyzny roboczej (przełącznik w ustawieniach ukrywa je razem z nazwą projektu), a gdy bryła wystaje poza krawędź, pojawia się ostrzeżenie.
- **Kilka stołów**: projekt, który nie mieści się na jednym stole, dostaje stoły obok siebie, tak duże jak płaszczyzna robocza. Bryła należy do stołu, na którym stoi, „Rozłóż na stołach” układa części rząd po rzędzie i dokłada stoły w razie potrzeby, każdy stół jest sprawdzany względem drukarki osobno, a eksport zapisuje jeden stół, wszystkie albo osobny plik na każdy stół w pliku ZIP, żeby drukować je po kolei.
- **Nawisy i filament**: „Pokaż nawisy” kreskuje każdą ścianę bardziej stromą niż 45° (albo niż kąt Twojej drukarki), która potrzebowałaby podpór, a okno eksportu pokazuje objętość, masę i metry filamentu, zanim pokroisz model w slicerze.
- **Żebro podporowe**: wydrukuj część przechyloną na jednej krawędzi bez podpór ze slicera. Kliknij jej dolną ścianę, a pod nią w niewielkiej odległości stanie cienkie żebro na owalnej stopie, z mostkami dokładnie na jedną warstwę wysokimi i na jedną ścieżkę szerokimi, które trzymają część i potem się je odłamuje. Dysza i warstwy jak w Twoim slicerze.
- **Mostki szablonu**: wydrukuj szablon z wyciętym na wylot napisem. Środek liter takich jak o, a i b dostaje małe mostki do płytki, tak szerokie i wysokie, jak ustawisz (równo z dołem, na środku albo u góry), zgrupowane z płytką jako zwykłe prostopadłościany, które możesz przesunąć albo usunąć. Po zmianie tekstu uruchom narzędzie ponownie, a mostki powstaną od nowa.
- **Biblioteka kształtów**: prostopadłościany, walce, kapsuły (w razie potrzeby z jednym końcem węższym, np. na osłonę paska), kule, stożki, stożki wygięte (rozszerzone jak trąbka albo wybrzuszone jak kopuła), piramidy, kliny, tekst, dachy, półkule, paraboloidy, torusy, rury, przejścia profili z jednego konturu w drugi (np. z kwadratu w koło, pełne albo ze ścianką, proste albo płynnie rozszerzające się, skręcone albo z pochyloną górą, albo przez nawet dwanaście przekrojów pośrednich), graniastosłupy od trzech do dwudziestu czterech boków, sprężyny śrubowe i płaskie (fale okrągłe, zygzakowate albo prostokątne, z oczkiem albo języczkiem na każdym końcu), zawias drukowany w całości (z otworami na śruby albo jako zawias z palcami), tulejki na wkładki wtapiane albo wkręty samogwintujące (od M2 do M5, od #2-56 do 1/4-20), haczyki zatrzaskowe z zaczepem, żebra i wzmocnienia, pojemniki i podstawki Gridfinity, radełkowane uchwyty (proste, krzyżowe albo okrągłe), otwory na złącza USB-C, Micro-USB, USB-A, HDMI (także Mini i Micro), DisplayPort i RJ45, wtyki XT30, XT60, MT60 i MPX akumulatorów modelarskich, bloki Anderson Powerpole od 1 do 4 biegunów oraz port szeregowy D-Sub 9 z otworami na śruby, w razie potrzeby z dodatkowym luzem, w ściance pudełka, płytki SBC w prawdziwym rozmiarze, wokół których budujesz obudowę (Raspberry Pi 5, 4, 3 B+ i Zero 2 W, BIGTREETECH Pi; zgrupowane jako otwór wycinają otwory na swoje złącza) i więcej.
- **Wazony, doniczki i abażury**: własny kształt Wazon z formą bryły, przekrojem (także rysowanym) i drugim przekrojem, w który przechodzi, skrętem, wzorami, otworami odpływowymi, stopką, podstawką i pokrywką, pełny do trybu wazy w slicerze albo pusty. Pokrywka jak w czajniku bierze własną górę wazonu, więc rowki i skręt biegną dalej przez połączenie. Autor: @marcus040473.
- **Gwinty, które pasują**: pręty gwintowane, śruby z łbem walcowym, stożkowym, sześciokątnym, kwadratowym albo z kołnierzem, łbem motylkowym albo gałką gwiazdową i z gniazdem imbusowym, Torx, Phillips, płaskim albo Robertson (kwadratowym) (średnica łba, rozmiar i głębokość gniazda według Twoich wymiarów, a jeśli chcesz, z kołnierzem między łbem a gwintem albo na nakrętce), nakrętki sześciokątne, kwadratowe, z kołnierzem i motylkowe oraz nakrętki z gałką gwiazdową, podkładki według ISO 7089, rozety pod śruby z łbem stożkowym i otwory gwintowane. Pogłębienia walcowe i stożkowe biorą trzpień i łeb z rozmiaru śruby (ISO 273, DIN 974-1, ISO 15065), otwór nieprzelotowy może kończyć się stożkiem od wiertła (118° albo własny kąt, głębokość mierzona do odsadzenia jak na rysunku), a sześciokąt staje się gniazdem na nakrętkę ISO 4032. Od M2 do M12, UNC/UNF od #4 do jednego cala i gwinty rurowe Whitwortha od G1/16 do G4 (ISO 228-1) są o jedno kliknięcie, tak samo jak stożkowe gwinty rurowe NPT od 1/16" do 4" (ASME B1.20.1). Możesz też ustawić własną średnicę i skok, także lewoskrętny, i do ośmiu zwojów na śrubę pociągową taką jak T8x8. Rozmiar calowy albo G pyta o liczbę zwojów na cal zamiast milimetrów. Końce przyjmują fazkę, a otwór gwintowany jest narzędziem tnącym: wsuń go w część, zgrupuj, a otwór wyjdzie z gwintem.
- **Koła zębate, które się zazębiają**: koła walcowe o zębach prostych, skośnych i daszkowych oraz stożkowe (także z zębami spiralnymi), koła o uzębieniu wewnętrznym i zębatki z zębami ewolwentowymi, ustawiane modułem i liczbą zębów jak w generatorze kół, z kątem przyporu i luzem do druku, albo z zębami okrągłymi, wyrozumiałymi przy małych drukowanych kołach i przyjemnymi w dotyku na pokrętłach. Zaznacz dwa koła, a panel poda rozstaw osi, przy którym się zazębiają.
- **Sprzęgła Hirtha**: tarcza z zębami w kształcie litery V biegnącymi od środka. Odwrócona kopia zazębia się z nią w dowolnej wielokrotności jednego zęba i sama się centruje, do regulowanych zawiasów, głowic statywu i pokręteł z zapadką. Ustaw liczbę zębów, ich wysokość (jeśli chcesz, aż do spodu) i otwór, i wybierz zęby symetryczne albo piłowe jak w zapadce, ze stromym bokiem do 90° po dowolnej stronie. To dokładna bryła dla narzędzi krawędzi i STEP.
- **Koła pasowe GT2**: koło do paska zębatego GT2 o podziałce 2 mm, z prawdziwym wrębem GT2 z łuków. Ustaw liczbę zębów (dowolną od 10 do 200, nie tylko rozmiary, które można kupić), szerokość paska, kołnierze, piastę i otwór. Średnica wynika z liczby zębów. To dokładna bryła dla narzędzi krawędzi i STEP.
- **Bryły i otwory**: zamieniaj kształty w narzędzia tnące i grupuj je w docelową geometrię. Edytuj grupę (**E**) rozkłada części grupy luzem, żeby je zmienić, a Gotowe odbudowuje ją z powrotem, także grupę w grupie, tak głęboko, jak sięga projekt.
- **Grupy wielokolorowe**: grupa może pokazywać każdą część we własnym kolorze, także po wycięciu w niej otworów, a eksport 3MF albo OBJ zachowuje te kolory, więc slicer może przypisać części do filamentów.
- **Zestaw**: Ctrl+B trzyma części razem jak zestaw w Tinkercadzie. Przesuwają się, obracają i skalują jak jedna, ale zachowują swoje kolory i w eksporcie zostają osobnymi bryłami, co przydaje się przy druku wielokolorowym.
- **Część wspólna**: zostaw tylko to, co mają wspólnego dwie zaznaczone bryły lub więcej, albo to, gdzie bryły i otwory się nakładają.
- **Otoczka**: owiń zaznaczone kształty ich otoczką wypukłą, najmniejszą bryłą bez wgłębień wokół wszystkich: półkula na walcu staje się kopułą, cztery słupki prostopadłościanem z okrągłymi narożnikami. Otwory w zaznaczeniu są potem wycinane.
- **Foremka do ciastek**: ścianka i płaski kołnierz wokół konturu szkicu albo SVG, albo tego, na czym stoi kształt, z jednego małego okna. Wnętrze litery e albo a dostaje własną ściankę, trzymaną mostkami przy kołnierzu albo płytką nad całym konturem, z małymi zaokrągleniami, żeby cienkie części się nie odłamywały. Gdy jest niższa, tylko odciska tekst w cieście, zamiast go wycinać. Kontur jest odbity, więc tekst i logo wychodzą z ciasta we właściwą stronę, a ścianka zwęża się do cienkiego ostrza. Grubość ścianki, ostrze, wysokość i kołnierz to tryby wypełnienia szkicu, więc każdy z nich można potem zmienić.
- **Przeguby flexi**: potnij płaską bryłę, którą sam narysowałeś (rybę, węża albo smoka), na ogniwa z przegubem drukowanym w miejscu przy każdym cięciu: pionową tuleję ze stożkami 45° trzymaną w gnieździe następnego ogniwa, więc figurka po wydrukowaniu się porusza, bez podpór i składania. Ustawisz liczbę przegubów, luz, wychylenie i rozmiar przegubu. Albo ogniwa składają się w górę i w dół, jak breloczek flexi: każde cięcie staje się płaskim zawiasem z tulei ze stożkami, w poprzek bryły na połowie jej wysokości.
- **Przejście między szkicami**: dwa szkice albo zaimportowane SVG stają się jedną dokładną bryłą, z konturem dolnego na dole i górnego na górze i prostymi ściankami pomiędzy: lejek, przejście z kwadratu w koło albo, z dwóch pierścieni, zwężająca się ramka. Edytuj grupę otwiera oba szkice ponownie.
- **Dzielenie**: przetnij bryły albo otwory na dwoje płaszczyzną. Wydrążona bryła zachowuje wnękę. Obróć płaszczyznę do cięcia pod kątem, przeciągnij jej strzałkę albo połóż ją na dowolnej ścianie przyciskiem „Wybierz ścianę”. **Rozciągnij** wydłuża albo skraca bryłę w miejscu płaszczyzny: część za nią się przesuwa, a przekrój bryły wypełnia lukę, więc pobrana obudowa rośnie przez swoje proste ścianki, a jej przegródki i zaokrąglone narożniki zachowują rozmiar.

### Dopracowywanie

- **Fazowanie i zaokrąglanie**: sfazuj albo zaokrąglij dowolną krawędź bryły albo wytnij prostą krawędź jako wklęsłe zaokrąglenie, jak wycięte narożniki pudełka, a potem usuń albo zmień obróbkę. Gdy rozmiar jest za duży dla krawędzi, jedno kliknięcie znajduje największy, który się mieści.
- **Szkice**: rysuj kontury liniami, krzywymi i gotowymi kształtami, rysuj odręcznie piórkiem, palcem albo myszą (linia staje się kilkoma punktami, które możesz edytować), ustawiaj linie długością i kątem w trakcie rysowania („50<30”, Shift przyciąga co 15°), wpisuj długości, kąty, rozmiary i położenie zaznaczonego konturu, punktu albo uchwytu krzywej (sumy takie jak „60+12.5” działają w każdym polu liczbowym), zaokrąglaj albo fazuj narożniki, przyciągaj do konturów innych brył, rysuj linie konstrukcyjne do przyciągania i wyciągaj, obracaj albo przeciągaj je po ścieżce w dokładne bryły. Obrót ze skokiem nawija kontur w jeden ciągły śrubowy pasek zamiast pierścieni, jak filament na szpuli. Szkic można też zbudować jako obrys: zamknięty kontur staje się ramką, do wewnątrz, na zewnątrz albo na środku linii, a otwarta linia paskiem z płaskimi, prostokątnymi albo okrągłymi końcami. Rysunek albo zdjęcie podłożone pod szkic obrysowujesz w linie szkicu jednym kliknięciem, jego ciemną albo jasną część, przy ustawionym progu.
- **Drążenie**: zamień bryłę w ścianki o jednej grubości, otwarte z wybranych stron (góra, dół, przód, tył, lewo, prawo, w dowolnym połączeniu) albo zamknięte, na pudełka, kubki i obudowy.
- **Nachylenie i zwężenie wzdłuż**: obniż górę prostopadłościanu, walca, wielokąta, rury, klina albo okrągłego dachu w stronę jednego końca albo zbież boki wszystkich oprócz rury do jednego końca, prosto albo po łuku, liczbą albo kropką na końcu: dach opadający wzdłuż, rampa, ukośnie ścięty koniec rury, dziób łodzi. Nachylenie zostaje dokładne dla fazek, zaokrągleń i STEP, tak samo jak zwężony prostopadłościan, klin albo okrągły dach. Autor: @plazmabokor.
- **Pokrywki**: pokrywka do pudełka, doniczki albo tacki otwartej u góry, z jej własnego konturu, okrągłego albo kanciastego: wciskana w otwór, nakładana z zewnątrz, obejmująca ściankę z obu stron jak pojemnik na żywność albo położona na niej płasko, z pasowaniem ciasnym, normalnym albo luźnym (0,1, 0,2 albo 0,3 mm na stronę) albo własną szczeliną, z grubością pokrywki oraz głębokością i ścianką kołnierza. Pojawia się obok bryły, odwrócona płytą w dół, gotowa do druku bez podpór.
- **Odsunięcie i wycięcie**: powiększ albo pomniejsz dokładną bryłę wzdłuż wszystkich jej ścian o 0,01 do 10 mm albo tylko na boki, żeby zachowała wysokość, na luz pasowania wciskanego albo zatrzasku, albo wytnij jedną część z drugiej z luzem dookoła w jednym kroku, a część zostaje na miejscu.
- **Wykrój**: przetnij kontur jednej bryły prosto przez drugą, wzdłuż X, Y albo Z, wszędzie tam, gdzie wykrojnik stoi przed nią: sylwetkę czajnika przez tabliczkę, logo przez pokrywkę. Wykrojnik zostaje, żeby go przesunąć i użyć ponownie, luz pozwala przejść drukowanej części, a otwór jest dokładną bryłą ze szkicu.
- **Sprawdzanie luzów**: przed drukiem części, które mają się ruszać (zawiasu drukowanego w całości, zabawki flexi, pokrywki w pudełku), sprawdź zaznaczenie albo każdą widoczną parę obiektów: nachodzą na siebie, stykają się, są za ciasno albo w porządku względem ustawionej minimalnej szczeliny, między warstwami albo obok siebie. Kliknięcie pary pokazuje to miejsce. Autor: @marcus040473.
- **Tekstura powierzchni**: nałóż relief na dowolną bryłę, dla chwytu albo wyglądu: rowki, radełko, plaster miodu, wypustki, komórki Woronoja, cegły, dzianinę, linę, wiklinę, włókno węglowe, korę drzewa, słoje drewna, spękania, obraz jako mapę wysokości, powtarzany albo odciśnięty raz, albo tekst, wokół brył okrągłych albo płasko wzdłuż osi. Na jednej bryle mieści się do sześciu wzorów, każdy na własnych ścianach: cegły na ściankach i radełko na górze. Do druku w dwóch kolorach wzór może też stać się osobną częścią we własnym kolorze. Autor: @marcus040473.
- **Usuwanie ścian**: kliknij ściany zaokrąglenia, otworu albo występu i je usuń: ściany wokół rosną i zamykają lukę, a bryła zostaje dokładna dla kolejnych zaokrągleń i eksportu STEP.
- **Własne kształty**: bryły, których potrzebujesz raz za razem, trzymasz na górze biblioteki kształtów i wstawiasz do dowolnego projektu kliknięciem albo przeciągnięciem, w przeglądarce albo we wspólnym magazynie na serwerze dla każdego urządzenia. „Kopia zapasowa wszystkiego” zabiera je ze sobą.
- **Wzór otworów**: podziurkuj płaską ścianę bryły albo okrągłą ściankę walca, rury albo otworu (każdy otwór skierowany do osi, rzędy dookoła): wybierz ścianę, wybierz otwory okrągłe, kwadratowe, prostokątne, sześciokątne albo podłużne, ustaw rozmiar, rozstaw, siatkę, układ naprzemienny albo pierścień wzdłuż krawędzi (według rozstawu albo liczby, z otworem w każdym narożniku), zwykłe otwory, pogłębienia walcowe albo stożkowe (z metrycznymi rozmiarami śrub) albo własny kształt ze sceny (nity, blachę ryflowaną, wypukłe albo wycięte), margines od krawędzi i głębokość (przez całą część albo na ustawioną głębokość) i zobacz otwory w podglądzie, zanim je utworzysz. Zostają zwykłymi otworami zgrupowanymi z bryłą, więc rozgrupowanie znów je uwalnia.
- **Ściana**: wypchnij płaską ścianę bryły na zewnątrz albo wytnij w niej kieszeń: wybierz ścianę, wybierz Na zewnątrz albo Do środka, ustaw odsunięcie od krawędzi, promień narożników i głębokość i zobacz wynik w podglądzie. Działa też na zaimportowanych plikach STL, a to, co dodaje, zostaje zwykłą bryłą ze szkicu zgrupowaną z bryłą.
- **Owijanie wokół walca**: połóż wzór SVG, logo albo napis na ściance kubka albo rury, wypukły albo grawerowany, i wyśrodkuj go na walcu.

### Pliki

- **Własne czcionki**: użyj do tekstu dowolnej czcionki TrueType, OpenType albo WOFF, a w Chrome i Edge czcionki zainstalowanej na komputerze. Projekt zachowuje tylko kontury liter, których używa, więc otwiera się wszędzie. Arabski i hebrajski biegną od prawej do lewej, a arabskie litery się łączą.
- **Własne modele**: zaimportuj STL, OBJ, 3MF, STEP, SVG albo DXF i buduj wokół. Obrys części w DXF, taki, jaki przysyła firma tnąca laserem albo dostawca, wczytuje się jako bryła z otworami jako osobnymi otworami, a łuki i okręgi zostają prawdziwe. SVG wczytuje się jako bryła ze szkicu: powierzchnia, obrys na zewnątrz albo do wewnątrz jego linii, sylwetka bez otworów albo rysunek poszerzony dookoła. Razem dają foremkę do ciastek z jednego pliku albo warstwy wielokolorowego logo. Kształt Tekst ma te same tryby wypełnienia, potrafi ułożyć litery z góry na dół, na łuku rysuje je węższe albo szersze i zamienia się w blok tekstu z kilku wierszy, wyrównanych do lewej, do środka albo do prawej. Biblioteka kształtów ma plakietkę z imieniem (tekst w kolorowych warstwach do druku wielokolorowego, z opcjonalnym otworem na kółko do kluczy i zaokrągloną albo sfazowaną krawędzią liter) oraz plakietkę z ikoną (ikonę SVG w takich samych kolorowych warstwach, z liczbą sztuk i opcją „ile się zmieści”, żeby wypełnić stół). Kolorowy OBJ (z layerling albo z Tinkercada jako ZIP z plikiem `.mtl`) albo kolorowy 3MF, także projekty ze slicerów, wczytuje się jako jedna bryła na kolor, a 3MF z kilkoma obiektami jako jedna bryła na obiekt. Plik STEP z kilkoma bryłami wczytuje się jako osobna bryła dla każdej, pod jej nazwą i w jej kolorze.
- **Siatki zamienione w dokładne bryły**: STL, OBJ albo 3MF z Printables albo Thingiverse to same trójkąty. „Uczyń dokładnym” znajduje w nim płaszczyzny, walce, stożki, kule i torusy i odbudowuje go jako dokładną bryłę CAD, więc otwór jest jednym prawdziwym walcem: zaokrąglenia i fazki idą po czystych krawędziach, ściany można usuwać, a STEP niesie prawdziwe ściany. „Uprość siatkę” zachowuje dokładnie ostre krawędzie i brzegi otworów, a przerzedza płaskie ściany.
- **Eksport w tym, czego chce Twój slicer**: STL, 3MF z nazwami i kolorami albo OBJ z kolorami, dla zaznaczenia albo całej sceny (ukryte części zostają poza nim), do tego STEP, jeśli projekt ma powędrować do pełnego programu CAD, oraz widok z góry jako SVG albo jako DXF z prawdziwymi łukami i okręgami do lasera, z opcjonalnymi mostkami szablonu, które trzymają na miejscu środek liter o albo b. PNG zapisuje czysty obraz widoku w podwójnej rozdzielczości, jeśli chcesz z przezroczystym tłem.
- **Eksport rysunku**: zaznacz część albo wyczyść zaznaczenie dla całego widocznego projektu, potem wybierz **Eksportuj → Rysunek → PDF albo SVG**. Powstają widoki z przodu, z góry i z prawej w układzie metody europejskiej na arkuszu technicznym z ramką, numerami stref i tabliczką rysunkową w prawym dolnym rogu, z wymiarami gabarytowymi, krawędziami niewidocznymi oraz tabelami średnic i położeń dla okrągłych otworów równoległych do osi. Widoki są w skali 1:1 w milimetrach, a arkusz ma najmniejszy pasujący format ISO w poziomie (albo większy, własny). Drukuj w skali **100% / rzeczywisty rozmiar**. Położenia są mierzone od lewego dolnego narożnika gabarytu każdego widoku. Tabele otworów korzystają z nominalnej geometrii siatki i nie wymiarują automatycznie otworów pochyłych ani nieokrągłych, gwintów, głębokości ani tolerancji. Moduł rzutowania jest zaadaptowany z prac nad rysunkami w [Cadverix-3D](https://github.com/WC3D/Cadverix-3D).
- **Powiadomienie o aktualizacji**: w opublikowanym programie otwarta strona sama zauważa nową wersję i proponuje zapisanie i przeładowanie, z listą nowości.
- **Usuwanie kilku projektów naraz**: **Zaznacz** na stronie startowej wybiera projekty kliknięciem ich kart (albo wszystkie), a jedno pytanie usuwa cały wybór. Działa też w folderze na serwerze.
- **Foldery na projekty**: posortuj projekty na stronie startowej w foldery (i foldery w foldery), przeciągając je albo przez „Przenieś do …”. Wyszukiwanie przegląda wszystkie, a „Kopia zapasowa wszystkiego” je zachowuje.
- **Projekty jako pliki**: zapisz cały projekt, razem z historią, szkicami i grupami, jako plik `.lyl` i pracuj dalej gdzie indziej. W Chrome i Edge sam wybierasz folder, a Ctrl+S zapisuje znowu do tego samego pliku. Inne przeglądarki go pobierają. Starsze pliki `.skf` z wcześniejszych wersji nadal się otwierają, a zapis tworzy obok nich plik `.lyl`.
- **Wcześniejsze wersje**: zanim Zapisz nadpisze plik `.lyl`, layerling zachowuje plik w poprzedniej postaci, a podczas pracy co kilka minut stan projektu. Każdy z nich otwiera się ponownie jako nowy projekt. Ile ich zostaje, ustawiasz w Ustawienia → Kopie zapasowe, a w Chrome i Edge mogą też trafiać do własnego folderu. Komunikat na stronie startowej i w edytorze przypomina, żeby zrobić kopię zapasową wszystkich projektów do pliku i trzymać ją w drugim miejscu: Twoje projekty, Twoja kopia.
- **Zgłoszenie błędu**: jeden odnośnik w stopce zapisuje plik ZIP z projektem jako `.lyl` i tekstem z wersją, przeglądarką i ostatnimi komunikatami, gotowy do dołączenia na forum albo na GitHubie, które nie przyjmują samego pliku `.lyl`.
- **Projekty, które rozpoznajesz**: każdy projekt z miniaturą, w Twojej przeglądarce albo w folderze na serwerze.
- **Załączniki**: trzymaj w projekcie notatki, zdjęcie wydrukowanej części albo kartę katalogową. Pliki `.md` i `.txt`, obrazy `.png`, `.jpg` i `.webp` oraz pliki PDF wędrują razem z plikiem `.lyl`. Oko otwiera tekst albo obraz w oknie, a PDF jest pobierany. SVG nie jest przyjmowany, bo może zawierać skrypty.

### Widok

- **Perspektywa albo widok na wprost**: przełączaj między zwykłym widokiem a płaskim, ortogonalnym przyciskiem z sześcianem obok przycisków przybliżania albo klawiszem **O**. Kierunek patrzenia i kadr zostają.
- **Obracanie widoku kostką**: przeciąganie kostki widoku obraca widok jak prawy przycisk myszy, a na tablecie jednym palcem. Kliknięcie nadal przeskakuje na tę stronę, a kliknięcie narożnika albo krawędzi patrzy stamtąd. Klawisze **1**–**6** też przeskakują, a **Shift+1**–**6** dodatkowo przybliżają do zaznaczenia.
- **Cztery zapisane widoki na projekt**: **Shift+7**, **8**, **9** albo **0** zapisuje widok dokładnie taki, jaki jest (kąt, przesunięcie, przybliżenie), a sam klawisz go przywraca. Każdy projekt ma własne, a zapisany plik `.lyl` zabiera je ze sobą.
- **Patrzenie prosto na płaszczyznę roboczą**: **P** albo przycisk obok „Umieść płaszczyznę roboczą” na pasku widoku obraca widok prosto na płaszczyznę roboczą, także na skośnej ścianie, z jej początkiem na środku.
- **Kostka widoku w dowolnym rogu**: Ustawienia > Wygląd > **Położenie kostki orientacji** stawia kostkę w lewym górnym, prawym górnym, lewym dolnym albo prawym dolnym rogu. W każdym rogu poza lewym górnym pasek widoku przesuwa się w górę na jej miejsce.
- **W Twoim języku**: program i jego instrukcja są po angielsku, niemiecku i w 18 innych językach. Lista języków jest w prawym górnym rogu.
- **Patrzenie od spodu**: oko nad siatką na pasku widoku ukrywa płytę, więc spód projektu widać bez przeszkód.
- **Drugi widok we własnym oknie**: przycisk na pasku widoku otwiera drugie okno, które pokazuje ten sam projekt przez własną kamerę, z własną kostką widoku i paskiem widoku, i podąża za każdą zmianą. Otwiera się tam, gdzie je ostatnio zostawiłeś.
- **Panele tam, gdzie chcesz**: lista obiektów, ustawienia, widok przekroju, narzędzie Zmierz i okna narzędzi krawędzi, drążenia i szyków przesuwają się za pasek tytułu i tam też otwierają się następnym razem. Dwuklik je dokuje.
- **Menu prawego przycisku**: krótkie kliknięcie bryły prawym przyciskiem pokazuje najczęściej używane polecenia: duplikowanie, otwór albo bryła, grupowanie, fazowanie, zaokrąglanie i drążenie dla jednej bryły, odbicie lustrzane i skalowanie procentowe, ukrywanie, blokowanie, blokowanie kształtu (dalej się przesuwa, obraca i grupuje, ale zachowuje rozmiar i ustawienia), opuszczenie na płaszczyznę roboczą, usuwanie. Przeciąganie prawym przyciskiem nadal obraca widok.
- **Ukryj pozostałe i odwróć zaznaczenie**: żeby pracować nad kilkoma częściami głęboko w projekcie, zaznacz je i ukryj całą resztę jednym krokiem (menu prawego przycisku albo menu widoczności; Ctrl+Z albo Ctrl+Shift+H ją przywraca) albo odwróć zaznaczenie, tak żeby zaznaczona była każda inna widoczna część.
- **Widok przekroju**: rozetnij widok wzdłuż płaszczyzny w poprzek X, Y albo Z, żeby obejrzeć ścianki, wnęki i części, które w siebie wchodzą, z suwakiem zgrubnym i dokładnym. Cięty jest tylko widok: projekt i każdy eksport zostają całe. Przekrój jest kreskowany jak na rysunku, a bryła wewnątrz innej w drugą stronę. Można go też wypełnić jednym kolorem albo zostawić otwarty. „Przekrój jako SVG” zapisuje sam przekrój w skali 1:1, do lasera albo jako szablon, „Mierz” odczytuje grubość ścianek i szczeliny wprost na przekroju, z przyciąganiem prostopadle do ścianki, a „Szkic z przekroju” zaczyna szkic bezpośrednio na przekroju, z jego konturami w środku (otwory jako prawdziwe okręgi), do pasującej pokrywki, wkładki albo uszczelki.
- **Płaszczyzna robocza na dowolnej ścianie**: naciśnij W i kliknij ścianę, żeby na niej budować. Kliknięcie blisko narożnika kładzie ją dokładnie w narożniku, blisko krawędzi na krawędzi z siatką biegnącą wzdłuż niej, a na pustej płycie tam, gdzie klikniesz. Oko ukrywa płaszczyznę, żeby było lepiej widać, a ona nadal działa. AI też może ją położyć na ścianie.
- **Przyciski myszy jak w slicerze i mysz 3D**: w ustawieniach przyciski myszy mogą działać jak w Bambu Studio i OrcaSlicer: przeciągnięcie lewym po pustym miejscu obraca widok, prawy przycisk go przesuwa, a Shift z przeciągnięciem lewym rysuje ramkę zaznaczenia. SpaceMouse albo inna mysz 3D obraca, przesuwa i przybliża widok w Chrome i Edge, gdy jest tam podłączona.
- **Na tablecie**: jeden palec pracuje nad projektem dokładnie tak, jak lewy przycisk myszy: stuknij, żeby zaznaczyć, przeciągnij, żeby przesunąć, przeciągnij po pustym miejscu, żeby zrobić ramkę zaznaczenia. **Dwa palce należą do widoku**: rozsuń albo ściągnij je, żeby przybliżyć, przesuń je razem, żeby przesunąć płaszczyznę roboczą. Położenie drugiego palca cofa to, co zaczął pierwszy, więc uszczypnięcie nigdy nie przesunie części. Obracanie widoku nie ma własnego gestu: pasek widoku ma do tego przełącznik, widoczny tylko na ekranie dotykowym, a gdy jest włączony, jeden palec obraca widok zamiast zaznaczać. Pola liczbowe po stuknięciu oddają całą swoją wartość, gotową do nadpisania, bo klawiatura numeryczna nie ma strzałek do przesuwania kursora. Palec sięga do punktów szkicu, linii, uchwytów, punktów pomiarowych i krawędzi trochę dalej niż mysz, ale **na tablecie lepszy jest rysik**: jest dokładniejszy i nie zasłania tego, w co celujesz.

### Filmy

Zrobione przez innych, nie przez ten projekt:

<!-- videos:start -->
- [Layerling Tutorials](https://www.youtube.com/playlist?list=PLZ-ZWS0D1JIk) - HL ModTech (po angielsku). Playlista użytkownika Tinkercada, na razie z około 23-minutowym spojrzeniem na layerling (darmowy CAD w przeglądarce, który rozszerza Tinkercada), głębszym omówieniem jego funkcji i krótką aktualizacją o drukowanych gwintach.
- [Layerling - Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) - Making Layers (po angielsku). Seria o layerling, na razie z odcinkami „Tinkercad alternative / upgrade? Introducing Layerling!”, czyli przeglądem dla osób przechodzących z Tinkercada, oraz „Layerling Sketch Tools!” o narzędziach szkicu.
- [Layerling](https://www.youtube.com/playlist?list=PLYqVFeqYBrPE) - TECHNOBENTO (po angielsku). Playlista o layerling, na razie z filmem „A new way to sketch in Layerling”.
- [Layerling CAD Videos](https://www.youtube.com/playlist?list=PLc09BHr_6nn8) - Printology (po angielsku). Playlista o layerling, na razie z filmami „I'm 100% In on Layerling - The Next Big Free CAD” i „Layerling Features That Blow Tinkercad Out Of The Water”.
- [I Tried Layerling After Tinkercad… Is It REALLY Better?](https://youtu.be/5DpOxdoNwqs) - Maker Mates Studio 3D Printing (po angielsku). Ktoś, kto przychodzi z Tinkercada, wypróbowuje layerling i porównuje oba programy.
- [Print by Layer](https://www.youtube.com/playlist?list=PLejZBz4L7CGQ) - Print N Repeat (po angielsku). Playlista o layerling, na razie z filmami „The EASIEST Way to Design Hinges in Layerling” i „The EASIEST Way to 3D Model Threads!”.
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) - 3D Jesus | 3D Printing & Design (po angielsku). Pierwszy test layerling bez żadnej instrukcji: zaokrąglenia i fazki, drążenie, gwinty, szkice, bryły obrotowe, szyki, import i profile drukarek.
- [Layerling en español | Del primer contacto al proyecto completo](https://www.youtube.com/playlist?list=PLVWA8wsStnyw) - Random Maker (po hiszpańsku). Playlista po hiszpańsku, od pierwszego spojrzenia na layerling po kompletne projekty: czym różni się od Tinkercada, porównanie punkt po punkcie i przenoszenie projektów z jednego do drugiego.
- [Proyectos en Layerling](https://www.youtube.com/playlist?list=PLTEdmvVC2bxs) - Fulcro 1900 (po hiszpańsku). Playlista z projektami w layerling, na razie z prezentacją layerling jako darmowego narzędzia pełniejszego niż Tinkercad, akcesoriami na biurko (trzy modele), etui na telefon oraz prętem gwintowanym, nakrętką i śrubą.
- [Layerling](https://www.youtube.com/playlist?list=PLQuXPoMXTnRQ) - Werkplaats Marc (po niderlandzku). Playlista o layerling, na razie z pierwszym spojrzeniem dla użytkowników Tinkercada („Layerling - De Gratis Tussenstap van Tinkercad naar Fusion 360”) i poradnikiem o szkicach: odrysowanie zdjęcia, obrót i przeciąganie po ścieżce („Schetsen Uitgelegd”).
<!-- videos:end -->

## Pierwsze kroki

Najkrótsza droga to wersja hostowana. Nic do instalowania, nic do rejestrowania: otwórz i buduj:

**https://layerling.com/**

Reszta tej części dotyczy uruchamiania własnej kopii: na Twoim komputerze albo na maszynie w warsztacie, którą wszyscy otwierają w przeglądarce. Bez względu na to, skąd aplikacja jest serwowana, nic nie jest wysyłane nikomu innemu: projekty zostają w przeglądarce, w której powstały (albo w folderze na serwerze, który sam skonfigurujesz), a eksporty są pobierane prosto na komputer danej osoby.

### Szybki start w Windows

Nigdy nie używałeś terminala? Na komputerze z Windows 11 (albo aktualnym Windows 10), na którym nic jeszcze nie jest zainstalowane, otwórz
**PowerShell** (wyszukaj go w menu Start, uprawnienia administratora nie są potrzebne) i wklej ten jeden wiersz:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

Instaluje Git i Node.js, jeśli ich brakuje, pobiera layerling do `%USERPROFILE%\layerling` i otwiera go w
przeglądarce pod adresem `http://127.0.0.1:3000/`. Zostaw okno PowerShell otwarte, dopóki używasz layerling. `Ctrl+C` w tym
oknie go zatrzymuje.

Uruchom ten sam wiersz ponownie, gdy tylko chcesz **zaktualizować** layerling: zauważy istniejący folder i pobierze
najnowszą wersję, zamiast ściągać wszystko drugi raz. Sam skrypt leży w
[`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1), więc możesz przeczytać, co dokładnie robi, zanim
go uruchomisz, albo pobrać go i uruchomić lokalnie, zamiast przekazywać go do PowerShell.

#### Ponowne otwieranie

Powyższy wiersz zostawia też na pulpicie skrót o nazwie **„Start layerling”**. Kliknij go dwukrotnie, gdy tylko
chcesz znowu otworzyć layerling: bez PowerShell, bez ponownej instalacji, bez ponownego pobierania, po prostu serwer się
uruchamia, a przeglądarka otwiera się sama. Skrót **najpierw aktualizuje layerling** (gdy w folderze nie ma Twoich własnych zmian) i otwiera
przeglądarkę dopiero wtedy, gdy serwer naprawdę jest gotowy. Jeśli layerling już działa, nie uruchamia drugiego serwera i nie
aktualizuje działającego, tylko otwiera stronę. Chcesz mieć layerling gdzie indziej, na przykład na innym dysku? Uruchom skrypt z
wybranym folderem:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

Jeśli Twój skrót utworzyła starsza wersja skryptu, uruchom wiersz jeszcze raz. Zastąpi skrót nowym.

Wolisz zrobić to ręcznie? Otwórz PowerShell i uruchom:

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

potem sam otwórz `http://127.0.0.1:3000/`. `Ctrl+C` w tym oknie zatrzymuje go w obu przypadkach.

### Szybki start w macOS

Na Macu otwórz aplikację **Terminal** (naciśnij Cmd+Spacja, wpisz `Terminal`, naciśnij Enter) i wklej ten jeden wiersz:

```bash
curl -fsSL https://raw.githubusercontent.com/henmedia/layerling/main/scripts/mac-quickstart.sh | sh
```

Potrzebuje Git i Node.js w wersji 22.18 lub nowszej. Jeśli czegoś brakuje, skrypt mówi, co zainstalować (macOS proponuje narzędzia deweloperskie z Git w okienku, Node.js jest dostępny jako instalator na [nodejs.org](https://nodejs.org), a z Homebrew skrypt instaluje je sam), i kończy pracę, więc możesz uruchomić ten sam wiersz ponownie. Potem pobiera layerling do `~/layerling`, kładzie na pulpicie **„Start layerling”** i otwiera layerling w przeglądarce pod adresem `http://127.0.0.1:3000/`. Zostaw okno Terminala otwarte, dopóki używasz layerling. `Ctrl+C` w tym oknie go zatrzymuje.

Uruchom ten sam wiersz ponownie, gdy chcesz **zaktualizować**: istniejący folder zostaje, a uruchomienie layerling najpierw pobiera najnowszą wersję. Skrypt leży w [`scripts/mac-quickstart.sh`](scripts/mac-quickstart.sh), więc możesz przeczytać, co robi, zanim go uruchomisz. Dla innego folderu: `LAYERLING_DIR=~/3D/layerling sh mac-quickstart.sh` (po pobraniu skryptu). Nie był jeszcze wypróbowany na prawdziwym Macu. Jeśli coś pójdzie nie tak, daj nam znać w dyskusjach.

### Docker

Aby uruchomić layerling na komputerze, NAS-ie (Synology, Unraid itd.) albo serwerze domowym bez instalowania Node.js, użyj gotowego obrazu **`henmedia/layerling`** z Docker Hub (także **`ghcr.io/henmedia/layerling`**, ten sam obraz). Każde wydanie publikuje go dla amd64 i arm64 (Raspberry Pi, NAS z ARM) pod numerem wersji i jako `latest`. Aplikacja nasłuchuje na porcie **3000**.

Pierwszy raz z Dockerem? [layerling w Dockerze krok po kroku (po angielsku)](docs/docker/en/docker-step-by-step.md) zaczyna od zera w Windows, macOS albo Linuksie: instaluje Dockera, uruchamia layerling i zapisuje Twoje projekty jako pliki w folderze na Twoim komputerze.

Najszybciej jednym poleceniem:

```bash
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

Opcja `-v` trzyma obrazki podglądu ze strony startowej w woluminie Dockera o nazwie `layerling-thumbnails`, więc przetrwają aktualizację. Bez niej są wewnątrz kontenera i znikają przy każdym jego ponownym utworzeniu (samych projektów to nie dotyczy: leżą w przeglądarce albo w folderze na serwerze). Na NAS-ie z menedżerem kontenerów (Synology Container Manager, Unraid, Portainer) wyszukaj `henmedia/layerling` w jego rejestrze (Docker Hub) albo wpisz `henmedia/layerling:latest`, zmapuj port 3000 i dodaj wolumin dla `/app/.codex/project-thumbnails`. Aby zaktualizować, pobierz obraz ponownie i utwórz kontener od nowa (albo zostaw to Watchtowerowi). Na **Unraid** layerling jest też w sklepie Community Applications: wyszukaj „Layerling” i zainstaluj go kilkoma kliknięciami. Szablon, utrzymywany przez [jbat66](https://github.com/jbat66/unraid-templates), od razu konfiguruje magazyn na serwerze w udziale Unraid.

Tagi obrazu to same numery wersji **bez „v”**: `ghcr.io/henmedia/layerling:1.42.0`, podczas gdy wydanie na GitHubie nazywa się `v1.42.0`. Polecenie pull pobiera tylko nowy obraz. Kontener, który już istnieje, dalej działa na starym, dopóki nie zostanie usunięty i utworzony ponownie:

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`docker inspect layerling | grep image.version` pokazuje, którą wersję naprawdę uruchamia kontener. Jeśli zamontowałeś folder dla magazynu na serwerze, dodaj ponownie tę samą opcję `-v`.

Aby zamiast tego samemu zbudować obraz, użyj dołączonych plików [`Dockerfile`](docker/Dockerfile) i [`compose.yml`](docker/compose.yml):

1. **Zainstaluj Dockera.** W Windows albo macOS zainstaluj i uruchom [Docker Desktop](https://www.docker.com/products/docker-desktop/). W Linuksie albo na NAS-ie potrzebujesz Dockera z Compose (`docker compose` albo samodzielnego `docker-compose`).
2. **Pobierz pliki.** Pobierz repozytorium jako ZIP ([Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)) i je rozpakuj albo je sklonuj:
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **Uruchom.** W folderze projektu otwórz terminal (np. PowerShell w Windows) i uruchom:
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   Ze starszym, samodzielnym programem pisz `docker-compose` zamiast `docker compose`. Docker buduje obraz i uruchamia kontener w tle (`-d`). Pierwsze budowanie trwa około 2-3 minut. Bez `--build` to samo polecenie pobiera zamiast tego gotowy obraz.
4. **Otwórz.** Na tym samym komputerze pod adresem **`http://localhost:3000/`**, z innych urządzeń w Twojej sieci pod adresem **`http://<IP-TWOJEGO-SERWERA>:3000/`**.

Codzienne polecenia:

- **Zatrzymanie:** `docker compose -f docker/compose.yml down`
- **Ponowne uruchomienie:** `docker compose -f docker/compose.yml up -d`
- **Aktualizacja** (po pobraniu nowego kodu albo rozpakowaniu nowego ZIP): `docker compose -f docker/compose.yml up -d --build`, a z gotowym obrazem `docker compose -f docker/compose.yml pull` i potem `up -d`

**Instalacja jako aplikacja i praca offline wymagają https oraz eksportu statycznego.** Przeglądarka instaluje aplikację i zachowuje ją do pracy offline tylko pod adresem `https://` albo na `localhost`. Pod zwykłym adresem `http://192.168.x.x:3000` nie oferuje ani jednego, ani drugiego (layerling ukrywa tam swoją wskazówkę o instalacji). Nawet z https pliki offline (`sw.js`) są zapisywane tylko w eksporcie statycznym (zobacz [Hosting statyczny](#hosting-statyczny-zwykłe-pliki-na-serwerze-www)), a nie w tym obrazie, który uruchamia wersję serwerową. Do instalacji i pracy offline w sieci serwuj eksport statyczny przez https. Aby mieć adres https przed kontenerem, użyj odwrotnego proxy, takiego jak Caddy albo nginx, z certyfikatem (na przykład z mkcert).

Obraz uruchamia `node apps/web/server.js` w trybie produkcyjnym, więc mostek MCP jest tam wyłączony, dopóki go nie włączysz (zobacz [Dostęp klienta AI do kopii na NAS-ie lub serwerze](#dostęp-klienta-ai-do-kopii-na-nas-ie-lub-serwerze)). Aby udostępnić wspólny folder projektów, podepnij katalog z prawem zapisu i ustaw w `compose.yml` zmienną `LAYERLING_SHARED_PROJECTS_DIR` na ścieżkę wewnątrz kontenera, pod którą jest zamontowany, na przykład `./shared-projects:/shared-projects` z `LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"` (zobacz [Wspólne projekty w sieci](#wspólne-projekty-w-sieci)). Kontener działa jako użytkownik o numerze 999, więc ten użytkownik musi mieć prawo zapisu do folderu: `sudo chown 999:999 ./shared-projects` albo dodaj do usługi `user: "1000:1000"` (numery Twojego użytkownika i grupy, pokazują je `id -u` i `id -g`), żeby kontener działał jako Ty. Bez tego folder pokazuje się na stronie startowej, ale nic nie da się w nim zapisać. Po zmianie uruchom `docker compose up -d`: `docker compose restart` zachowuje stare ustawienie. `docker exec <kontener> printenv LAYERLING_SHARED_PROJECTS_DIR` pokazuje to, które obowiązuje.

Aby trzymać każdy projekt w tym folderze, a żadnego w przeglądarce, jest pełny poradnik po angielsku i niemiecku z własnym plikiem compose i skryptem aktualizacji, który sprawdza konfigurację, robi kopię zapasową folderu i cofa nieudaną aktualizację: [docs/docker](docs/docker/README.md), autorstwa Jürgena Kellera. Z `LAYERLING_NEW_DESIGNS_ON_SERVER: "always"` wszystko, co tworzy projekt, trafia do folderu na serwerze: kafelek, otwarcie albo import pliku, przywrócenie kopii zapasowej (z jej folderami), duplikowanie i stan wzięty z historii, a Nowy folder na stronie startowej tworzy folder na serwerze.

Aby wybrać motyw kolorów, który ludzie dostają przy pierwszej wizycie, ustaw `LAYERLING_DEFAULT_THEME` na `system`, `light`, `dark` albo `graphite` (w ten sam sposób, w `compose.yml` albo w środowisku `npm run start`). Kto już kiedyś otworzył layerling, zachowuje motyw, który ma jego przeglądarka, a każdy może go nadal zmienić przełącznikiem motywu. Bez tego ustawienia motyw podąża za systemem. Kopia serwowana jako zwykłe pliki nie ma serwera, który by to odczytał, więc tam to nie działa.

Na zajęcia albo warsztaty z dziećmi `LAYERLING_SIMPLE_MODE` uruchamia layerling w trybie prostym: wstążka zachowuje narzędzia, których używa warsztat, biblioteka kształtów krótką listę, przyciski są większe, a strona startowa pokazuje projekty bez aktualności, bez tekstu powitalnego i bez odnośników poza layerling. `true` to punkt wyjścia dla osób, które nie wybrały same (w ustawieniach jest przełącznik, a wyjście z trybu wymaga przytrzymania przez dwie sekundy), a `always` obowiązuje wszystkich i zabiera przełącznik. Odnośnik zakończony `?mode=simple` włącza go na urządzeniu, które go otworzy, a `?mode=full` wyłącza. Ustawia się go tak samo jak pozostałe, a kopia serwowana jako zwykłe pliki nie ma serwera, który by go odczytał (odnośnik i ustawienie działają tam nadal).

Przy włączonym wspólnym folderze `LAYERLING_NEW_DESIGNS_ON_SERVER` sprawia, że nowe projekty zaczynają się na serwerze: `true` to punkt wyjścia dla osób, które nie wybrały same (mogą odznaczyć **Nowe projekty na serwerze** na stronie startowej), a `always` obowiązuje wszystkich i blokuje zaznaczenie. Ustawia się je tak samo, a kopia serwowana jako zwykłe pliki nie ma serwera, który by je odczytał.

Za odwrotnym proxy z domeną proxy musi przekazywać oryginalne nagłówki `Host` i `X-Forwarded-Proto` (nginx: `proxy_set_header Host $host;` i `proxy_set_header X-Forwarded-Proto $scheme;`), w przeciwnym razie zapis na serwerze jest odrzucany z komunikatem „Shared projects only accept requests from this site.”. Jeśli proxy przepisuje host i nie możesz tego zmienić, wpisz adres, którego ludzie używają, w `LAYERLING_ALLOWED_ORIGINS` (rozdzielone przecinkami, na przykład `https://layerling.example.com`).

### Hosting statyczny: zwykłe pliki na serwerze WWW

Każdy serwer WWW może serwować layerling jako zwykłe pliki. Nie działa na nim żaden Node.js. Zbuduj pliki raz na komputerze, który ma Node.js (zobacz [Czego potrzebujesz](#czego-potrzebujesz)):

```bash
npm install
npm run export
```

Gotowa strona jest w **`apps/web/.next-export/`**. Skopiuj **zawartość** tego folderu (a nie sam folder) do katalogu głównego dokumentów serwera WWW, tak żeby `index.html` leżał bezpośrednio w nim.

Cztery rzeczy, które warto wiedzieć:

- **layerling potrzebuje własnego adresu.** Pliki odwołują się do siebie ścieżkami zaczynającymi się od katalogu głównego (`/_next/...`), więc layerling musi być serwowany w katalogu głównym adresu, takiego jak `https://layerling.example.com/` albo `http://192.168.0.5:8080/`. Nie działa w podfolderze (`https://example.com/layerling/`) i nie da się go otworzyć z dysku (`file://`). Jeśli widzisz tylko blok zwykłego tekstu bez żadnego stylu, pliki skryptów i stylów się nie wczytały: otwórz narzędzia deweloperskie przeglądarki (F12), na karcie Sieć poszukaj czerwonych wpisów `/_next/...` i porównaj ich adres z miejscem, w którym leżą pliki.
- **Foldery zaczynające się od podkreślnika muszą być serwowane.** Niektóre serwery je ukrywają (na przykład GitHub Pages bez pliku `.nojekyll`), a `_next` zawiera cały program.
- **Szybki test na własnym komputerze:** `npx serve apps/web/.next-export` i otwórz adres, który wypisze.
- **Instalacja jako aplikacja i praca offline wymagają https.** Eksport zawiera pliki offline (`sw.js`), ale przeglądarka używa ich tylko pod adresem `https://` albo na `localhost`, a nie pod zwykłym adresem `http://` w Twojej sieci.

### Profile edytora

Opcjonalny profil edytora zmienia wstążkę 3D i wybrane opcje narzędzi dla tej strony. Aby wypróbować [przykładowy profil](docs/examples/editor-profile.json) w lokalnej kopii repozytorium:

```sh
LAYERLING_EDITOR_PROFILE="$(cat docs/examples/editor-profile.json)" npm run dev
```

Otwórz edytor, dodaj prostopadłościan i go zaznacz. Prosta wstążka używa zwykłego rozmiaru ikon. **Sprawdź wydruk** jest widoczne, a **Pokrywka** i **Przeguby flexi** są ukryte. Otwórz **Zaokrąglenie**, aby zobaczyć promień początkowy 2 mm na prostopadłościanie wystarczająco dużym na niego. Opcja **Tylko widoczne krawędzie** jest ukryta i włączona.

- `version` musi wynosić `1`. Opcjonalne `base` o wartości `simple` albo `full` wybiera ten układ dla tej strony, przed wyborem w przeglądarce i domyślną wartością serwera Node. Pomiń je, aby zachować zwykły przełącznik trybu.
- Ustaw `enlargeInSimpleMode: false`, aby używać tego samego paska narzędzi, menu kształtów i rozmiarów elementów sterujących co w trybie pełnym. Wybór rozmiaru paska narzędzi w przeglądarce nadal obowiązuje.
- W `tools` wartość `visible: true` albo `false` nadpisuje układ dla narzędzi w sekcjach schowka, historii, łączenia, modyfikacji i rozmieszczania wstążki 3D, a także dla `import`. Użyj identyfikatora narzędzia (atrybut `data-layerling-tool` na zwykłych przyciskach wstążki). Ustawienia wstążki nadal mogą ukrywać albo zmieniać kolejność narzędzi dostępnych w aktywnym profilu. Widoczne narzędzie nadal wymaga zwykłego zaznaczenia. Nieznane wpisy nie mają żadnego skutku.
- W `tools.fillet.options` wartość `amount.default` to promień w milimetrach. Pierwszeństwo ma prawidłowy zapamiętany promień, a gdy żaden nie pasuje do bryły, używana jest wartość początkowa samego narzędzia. `onlyVisibleEdges` przyjmuje `visible`, logiczne `default` i `locked`. Blokada wymaga wartości domyślnej i ma pierwszeństwo przed zapamiętaną wartością.
- Profile wpływają na wstążkę i powiązane opcje okien. Menu kontekstowe, skróty klawiszowe, kształty i kamera działają normalnie. Do kontroli dostępu do projektów używaj autoryzacji hosta.

`LAYERLING_EDITOR_PROFILE` jest odczytywany przez układ podczas generowania HTML. Ustaw go przed uruchomieniem serwera deweloperskiego albo zbudowaniem produkcyjnego HTML, także eksportu statycznego. Hosty, które same generują HTML, mogą zamiast tego dostarczyć jeden element `<script type="application/json" id="layerling-editor-profile">…</script>` w nagłówku dokumentu przed skryptami Layerling. W serializowanym JSON zamieniaj dosłowne `<` na `\u003c`. Profile są niezależne od plików projektów i ustawień przeglądarki i są odczytywane raz przy wczytaniu strony. Dla profili per konto serwuj spersonalizowany HTML z prywatnej, niebuforowanej strony poza pamięcią offline statycznego service workera, na przykład z punktu wejścia w PHP.

### Wspólne projekty w sieci

Sam layerling to tylko pliki, więc wspólny folder wymaga na serwerze czegoś, co potrafi zapisywać. Są dwie drogi i potrzebujesz tylko jednej z nich: **Node albo Docker** (ta część, z `LAYERLING_SHARED_PROJECTS_DIR`) albo **zwykły serwer WWW z PHP** (folder `store`, niżej). Serwer WWW, który serwuje pliki bez żadnego z nich (`npx serve`, nginx albo Apache bez PHP), dobrze pokazuje layerling, ale nie ma folderu na serwerze.

Jeśli uruchamiasz layerling przez `npm run dev` albo `npm run start` na maszynie, którą inni otwierają w przeglądarce, może on oferować
wspólny folder na projekty `.lyl`. `npm run start` serwuje to, co zbudowało `npm run build`, więc najpierw raz to uruchom. Ustaw `LAYERLING_SHARED_PROJECTS_DIR` na katalog, do którego może zapisywać użytkownik uruchamiający layerling (folder w `/srv` często należy do roota, zrób własny albo zmień jego właściciela), i uruchom:

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projects npm run start
```

Strona startowa pokazuje wtedy projekty na dwóch kartach: **Serwer** dla wspólnego folderu i **Przeglądarka** dla projektów
tej przeglądarki. Przy otwartej karcie Serwer **Utwórz nowy projekt 3D** zaczyna projekt w folderze na serwerze, w którym jesteś, **Nowy
folder** tworzy podfolder, a ścieżka pod kartami mówi, gdzie jesteś, i prowadzi z powrotem. Projekty przenosisz, przeciągając
je na folder albo na krok ścieżki, albo przez **Przenieś do …** w ich menu. Projekt z Twojej przeglądarki trafia
na serwer przez przeciągnięcie jego karty na kartę Serwer albo przez **Wyślij na serwer** w jego menu. Folder wędruje tak
samo, ze wszystkim, co w nim jest, i zostaje folderem na serwerze. Droga powrotna to
**Przenieś do tej przeglądarki** w menu projektu na serwerze albo przeciągnięcie jego karty na kartę Przeglądarka: projekt żyje wtedy
tylko w tej przeglądarce i opuszcza folder na serwerze, także dla innych.

Dwa przyciski na stronie startowej oszczędzają przenoszenia projektów po jednym: **Przenieś wszystkie na serwer** przenosi naraz każdy projekt tej przeglądarki do folderu na serwerze, w tych samych folderach, a zaznaczenie **Nowe projekty na serwerze** sprawia, że każdy nowy projekt zaczyna się w folderze na serwerze, więc zapisuje się tam od pierwszej zmiany. Projekt, którego nazwa jest już zajęta na serwerze, zostaje w przeglądarce.

Pole wyszukiwania na górze przeszukuje cały folder na serwerze, a nie tylko ten, w którym stoisz. Każdy wynik mówi,
który folder go zawiera, a ten folder jest przyciskiem: jedno kliknięcie i jesteś tam, z wyczyszczonym wyszukiwaniem. Foldery też
są znajdowane po nazwie. Podczas wyszukiwania kafelek serwera na stronie startowej mówi, ile wyników na Ciebie tam
czeka.

**Duplikuj** w menu projektu tworzy jego kopię. Na serwerze kopiowany jest sam plik, obok oryginału i
pod wolną nazwą, razem z obrazkiem. Nic nie jest pakowane od nowa, więc kopia niesie dokładnie geometrię oryginału. W
Twojej przeglądarce kopia staje się osobnym projektem, z tymi samymi kształtami, tą samą historią i własnym obrazkiem podglądu,
i nie należy do nikogo na serwerze.

Projekt, który żyje na serwerze, zapisuje się tam z powrotem sam, pięć sekund po ostatniej zmianie i gdy wychodzisz z
edytora. Miniatury trafiają obok plików do `.thumbnails`. Projekty, które są tylko w Twojej przeglądarce, zostają tam nietknięte.

Własne kształty zapisane na serwerze trafiają do folderu o nazwie `Custom shapes` na górze magazynu, każdy jako jeden `.lyl` ze swoim
obrazkiem. layerling tworzy go przy pierwszym takim kształcie. To zwykły folder, więc pokazuje się na stronie startowej, a
kształt w nim otwiera się i zapisuje jak każdy projekt. Ani droga przez Node, ani `store.php` nie potrzebują do tego niczego dodatkowego.

Ustawienia zapisane przyciskiem „Ustaw jako domyślne” w ustawieniach obszaru roboczego też są przechowywane w magazynie, jako `.settings/default.json`
(ukryty folder, którego strona startowa nie pokazuje). Przeglądarka, która straciła własne, bo jej dane zostały wyczyszczone albo jest to
inna przeglądarka, pobiera je przy wczytaniu strony startowej, więc nowy projekt znów od nich zaczyna. Jest jedno ustawienie domyślne dla
całego magazynu, a wygrywa ostatnie zapisane w dowolnej przeglądarce. Usuń plik, aby wrócić do własnych ustawień każdej przeglądarki.

Otwarcie projektu z serwera daje Ci prywatną lokalną kopię roboczą. Zapis z powrotem najpierw sprawdza wersję na serwerze.
Jeśli w międzyczasie ktoś inny zmienił plik, layerling odmawia nadpisania go i prosi o przeładowanie albo zapis
pod inną nazwą. To wspólny magazyn plików, a nie jednoczesna edycja.

Za odwrotnym proxy z uwierzytelnianiem (takim jak Authelia, oauth2-proxy, Cloudflare Access albo HTTP Basic Auth) ustaw `LAYERLING_USER_HEADER` na nagłówek, który ustawia Twoje proxy (np. `LAYERLING_USER_HEADER=X-Forwarded-Email` albo w Apache `SetEnv LAYERLING_USER_HEADER Remote-User`), aby oddzielić projekty każdego użytkownika w `.users/<user>/`. Jest to bezpieczne tylko wtedy, gdy layerling jest osiągalny wyłącznie przez proxy, tak żeby nikt nie mógł wysyłać dowolnych nagłówków bezpośrednio do serwera.

#### Bez Node: folder `store`

Instalacja serwowana jako eksport statyczny, czyli zwykłe pliki na serwerze WWW, sama niczego nie może zapisać. Na ten przypadek
z eksportem dostarczany jest `store.php`. Utwórz obok `index.html` folder o nazwie `store`, do którego serwer WWW może zapisywać,
a layerling zaoferuje ten sam wspólny magazyn co wyżej, razem z folderami. Bez tego folderu funkcja pozostaje niewidoczna,
a krótki poradnik w edytorze wyjaśnia, jak ją włączyć. Serwer WWW potrzebuje PHP.

PHP domyślnie ogranicza wysyłane pliki (`upload_max_filesize` i `post_max_size`, kilka megabajtów), a duży projekt albo kopia zapasowa
wielu projektów może być większa. `store.php` mówi wtedy, na który limit trafił i ile on wynosi. Podnieś oba w `php.ini` albo w
obrazie Dockera plikiem takim jak `uploads.ini` w `/usr/local/etc/php/conf.d/` (`upload_max_filesize = 512M`, `post_max_size = 512M`).

Folder **nie ma logowania**: kto może otworzyć stronę, może czytać, zapisywać i usuwać to, co w nim jest. W sieci domowej albo
w warsztacie o to właśnie chodzi. Na stronie dostępnej publicznie zabezpiecz go albo go pomiń.

Niczego w folderze nie należy otwierać po adresie: layerling czyta go i zapisuje tylko przez `store.php`.
W Apache `store.php` zapisuje w folderze plik `.htaccess`, który odrzuca każde bezpośrednie żądanie. Apache czyta go tylko tam, gdzie
pozwala na to `AllowOverride` (domyślna wartość Debiana dla `/var/www` to `None`, która go ignoruje), a nginx i inne serwery nigdy,
więc zablokuj tam dostęp do `store/` sam (w Apache: `<Directory /var/www/html/store> Require all denied </Directory>`,
w nginx: `location /store/ { deny all; }`). `store.php` sprawdza też każdy zapisywany eksport, więc plik, który mógłby się uruchomić w
przeglądarce, jest odrzucany w każdym przypadku.

Folder może też leżeć poza katalogiem głównym serwera WWW, gdzie nie sięga do niego żaden adres, z `.htaccess` czy bez: ustaw
`LAYERLING_SHARED_PROJECTS_DIR`, to samo ustawienie, które czyta serwer Node, na jego ścieżkę: w Apache przez
`SetEnv LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects`, w nginx przez
`fastcgi_param LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects;`, w Dockerze jako zmienną środowiskową
kontenera. Ten folder zajmuje wtedy miejsce `store`. On też musi istnieć i mieć prawo zapisu dla serwera WWW.

Jedna rzecz do zapamiętania przy wdrażaniu: jeśli kopiujesz eksport opcją, która usuwa wszystko, co nadmiarowe (`rsync
--delete`, `robocopy /MIR`, WinSCP `-delete`), wyklucz wprost `store`, inaczej każda aktualizacja wymaże projekty.

## Praca nad layerling

Ta droga jest dla Ciebie, jeśli chcesz zmieniać kod.

### Czego potrzebujesz

- Node.js w wersji 22.18 lub nowszej (skrypty instrukcji i czcionek wczytują pliki TypeScript bezpośrednio, czego starsze wersje nie potrafią). Wersja 24 też działa, używa jej obraz Dockera
- npm, dołączony do Node.js

Sprawdź wersje poleceniami `node -v` i `npm -v`. Jeśli te polecenia nie działają, zainstaluj Node.js z oficjalnej
strony Node.js i otwórz terminal ponownie.

### Instalacja i uruchomienie

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

Nie masz Gita? Naciśnij zielony przycisk **Code** na stronie GitHuba, wybierz **Download ZIP**, rozpakuj, otwórz terminal w
rozpakowanym folderze i zacznij od `npm install`.

Potem otwórz `http://127.0.0.1:3000/`. Zostaw terminal otwarty, dopóki używasz aplikacji. `Ctrl+C` zatrzymuje serwer deweloperski.

Aby otworzyć serwer deweloperski z innego komputera po nazwie, na przykład `http://myhost.local:3000/`, wpisz tę nazwę w zmiennej środowiskowej `LAYERLING_ALLOWED_DEV_ORIGINS` przed uruchomieniem (kilka nazw rozdzielonych przecinkami, `*.local` dla każdej nazwy kończącej się na `.local`). Bez niej serwer deweloperski odpowiada tylko na `localhost` i `127.0.0.1`. Eksport statyczny i `npm run start` jej nie potrzebują.

W Linuksie i macOS `scripts/start-layerling.sh` robi za Ciebie codzienne uruchamianie: najpierw aktualizuje kopię repozytorium (pomija to, jeśli zmieniłeś w niej pliki), uruchamia serwer, czeka, aż odpowie, i potem otwiera przeglądarkę. Uruchom go z dowolnego miejsca, na przykład `~/layerling/scripts/start-layerling.sh`. Potrzebuje Git i Node.js, jak wyżej. Jeśli layerling już działa na tym porcie, tylko otwiera przeglądarkę, zamiast uruchamiać drugi serwer. Port 3000 zajęty przez coś innego? Uruchom go przez `PORT=3100 scripts/start-layerling.sh`. Był wypróbowany w Debianie (bez pulpitu, więc krok z przeglądarką tylko wypisuje adres) i w powłoce Windows. W macOS nie był testowany. Jeśli w Twoim systemie działa źle, daj nam znać w dyskusjach.

### Praca w kontenerze

Wolisz nie instalować Node.js? Pracuj zamiast tego w kontenerze. Potrzebujesz silnika kontenerów z Compose,
czyli `docker compose` albo `podman compose` (bezrootowy Podman z SELinuksem też działa, a flaga `:z` w pliku compose obsługuje
etykiety plików):

```bash
docker compose -f docker/compose.dev.yml up
```

Otwórz `http://127.0.0.1:3000/`. Pierwsze uruchomienie instaluje zależności, a kolejne od razu startują serwer deweloperski z
przeładowaniem na gorąco. Zatrzymaj go przez `Ctrl+C`. Jeśli aktualizujesz zależności i coś wygląda na nieaktualne, usuń `node_modules/` w
folderze projektu i uruchom ponownie.

Uruchamiasz jednocześnie kontener produkcyjny z `docker/compose.yml`? On też używa portu 3000, więc zmień
port po stronie hosta w jednym z nich (np. `"3100:3000"`).

### Przydatne polecenia

| Polecenie | Co robi |
| --- | --- |
| `npm run typecheck` | Sprawdzanie TypeScript |
| `npm run test` | Testy jednostkowe |
| `npm run test:e2e` | Testy end-to-end |
| `npm run build` | Build produkcyjny (`npm run start` go serwuje) |
| `npm run export` | Eksport statyczny do zwykłego hostingu |
| `npm run guide` | Buduje strony instrukcji z `docs/guide` (robią to też eksport i `npm run dev`) |
| `npm run guide:images` | Robi ponownie obrazki instrukcji z działającego programu (wymaga `npm run dev -- -p 3010`; zobacz `docs/guide/README.md`) |
| `npm run printers:update` | Odświeża profile drukarek z profili OrcaSlicer |
| `npm run mcp:layerling` | Uruchamia serwer MCP dla klientów AI (zobacz niżej) |

## Skill MCP layerling

layerling zawiera lokalny serwer MCP dla klientów AI, które obsługują narzędzia MCP. Pozwala agentowi oglądać i sterować działającą
kartą edytora: wypisywać otwarte edytory, odczytywać scenę, tworzyć, zmieniać i zaznaczać obiekty, grupować, ciąć i rozdzielać części, wypisywać
identyfikatory krawędzi CAD, nakładać fazki albo zaokrąglenia, drążyć bryłę, sprawdzać błędy i robić zdjęcia widoku.

Działa z lokalnym serwerem deweloperskim. W buildach produkcyjnych i hostingu statycznym trasa MCP jest wyłączona, chyba że
serwer włączy ją tokenem dostępu ([zobacz niżej](#dostęp-klienta-ai-do-kopii-na-nas-ie-lub-serwerze)). Na layerling.com jest zawsze wyłączona.

1. Uruchom layerling z folderu projektu przez `npm run dev` (zobacz [Instalacja i uruchomienie](#instalacja-i-uruchomienie)).
2. Otwórz kartę edytora, np. `http://127.0.0.1:3000/?editor=1`, albo pomiń ten krok: gdy żaden edytor nie jest otwarty, pierwsze narzędzie, które go potrzebuje, uruchamia przeglądarkę z edytorem (nie dla kopii na NAS-ie albo serwerze; `LAYERLING_MCP_OPEN_EDITOR=0` to wyłącza).
3. Podłącz klienta AI tak, jak opisano niżej. Sam uruchamia serwer MCP przez
   `node scripts/layerling-mcp-server.mjs`.

Najważniejsze narzędzia to `layerling_list_editors`, `layerling_read_scene`, `layerling_list_objects`,
`layerling_create_shape`, `layerling_update_object`, `layerling_list_edges`, `layerling_apply_edge_treatment`,
`layerling_hollow_object`, `layerling_make_lid`, `layerling_offset_object`, `layerling_cut_out`, `layerling_punch`, `layerling_array_objects`, `layerling_set_section_view` i `layerling_capture_image`.

### Claude Code

Nic do instalowania: repozytorium zawiera już `.mcp.json`, który rejestruje serwer MCP dla tego projektu, oraz kopię
skilla w `.claude/skills/layerling-mcp-skill`, gdzie Claude Code go szuka. Otwórz folder layerling w
Claude Code i poproś:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Claude Desktop

Claude Desktop nie czyta pliku `.mcp.json` ani plików skilli projektu, ale może używać tego samego serwera MCP przez własną
konfigurację. Dodaj tam serwer, biorąc za wzór [`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json)
i zastępując ścieżkę skryptu ścieżką bezwzględną na Twoim komputerze. Po ponownym uruchomieniu Claude Desktop poproś:

```text
Use the layerling MCP tools to list open editors, inspect the scene, and modify the selected object.
```

### Codex

Skopiuj skill z `docs/skills/layerling-mcp-skill` do folderu skilli Codex.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.codex\skills\layerling-mcp-skill"
```

macOS albo Linux:

```bash
mkdir -p ~/.codex/skills
cp -R docs/skills/layerling-mcp-skill ~/.codex/skills/
```

Potem dodaj wpis serwera MCP do konfiguracji Codex, biorąc za wzór [`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml)
i zastępując ścieżkę skryptu ścieżką bezwzględną na Twoim komputerze. Uruchom Codex ponownie i poproś:

```text
Use $layerling-mcp-skill to list my open layerling editors and inspect the current scene.
```

### Gemini i Antigravity

Dla Antigravity repozytorium zawiera kopię skilla w `.agents/skills/layerling-mcp-skill`, którą Antigravity znajduje samo. Dla Gemini CLI skopiuj skill z `docs/skills/layerling-mcp-skill` do swojego globalnego folderu skilli.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.gemini\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.gemini\skills\layerling-mcp-skill"
```

macOS albo Linux:

```bash
mkdir -p ~/.gemini/skills
cp -R docs/skills/layerling-mcp-skill ~/.gemini/skills/
```

Potem dodaj serwer do `settings.json` Gemini CLI albo `mcp_config.json` Antigravity, biorąc za wzór [`docs/mcp/gemini-config.example.json`](docs/mcp/gemini-config.example.json) i zastępując ścieżkę skryptu ścieżką bezwzględną na Twoim komputerze. Uruchom klienta ponownie i poproś:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Dostęp klienta AI do kopii na NAS-ie lub serwerze

Kopia, którą hostujesz sam (obraz Dockera na NAS-ie, serwer domowy), może pozwolić klientowi AI sterować jej otwartymi edytorami przez
sieć. Jest to **domyślnie wyłączone**, bo kto może sterować mostkiem, może czytać i zmieniać otwarte projekty. Włącz to
dwoma ustawieniami na serwerze, odczytywanymi przy jego starcie. Gotowy obraz nie wymaga ponownego budowania:

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "a-long-random-secret-of-at-least-16-characters"
```

Bez tokenu o długości co najmniej 16 znaków mostek pozostaje zamknięty. Potem:

1. Otwórz kartę edytora tej kopii w przeglądarce, np. `http://nas:3000/?editor=1`, i zostaw ją otwartą.
2. Podaj klientowi MCP adres i ten sam token: ustaw w jego konfiguracji `LAYERLING_URL=http://nas:3000` i
   `LAYERLING_MCP_TOKEN=<token>` (zobacz przykłady w `docs/mcp`).

Token chroni polecenia: tylko klient, który go wysyła, może wypisywać edytory albo nimi sterować. Strony edytora go nie potrzebują,
ale liczą się tylko wtedy, gdy są stronami tej kopii, otwartymi pod adresem albo nazwą, której może użyć tylko ktoś w Twojej własnej
sieci (adres IP, nazwa bez kropki albo kończąca się na `.local` lub `.lan`). Dzięki temu strona w
internecie nie sięgnie przez Twoją przeglądarkę do Twojego NAS-a. Jeśli otwierasz kopię pod prawdziwą domeną, na przykład za
odwrotnym proxy, wpisz ją w `LAYERLING_MCP_ALLOWED_HOSTS` (rozdzielone przecinkami). Używaj tego w sieci, której ufasz, a poza nią używaj HTTPS:
token jest przesyłany w nagłówku.

## Współpraca

Wkład jest mile widziany i nie musisz zajmować się drukiem 3D, żeby pomóc: liczy się też jaśniejsze zdanie w tym README.
Dobre miejsca na początek:

- poprawki błędów edytora
- przypadki testowe geometrii i operacji logicznych
- przypadki brzegowe importu i eksportu (STL, OBJ, 3MF, STEP, SVG, DXF)
- dopracowanie interfejsu
- zrzuty ekranu i filmy do dokumentacji
- poprawa dostępności i wydajności

Przed otwarciem pull requesta przeczytaj [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md). Co zmieniło się w każdej wersji, opisuje
[lista zmian](docs/CHANGELOG.md).

## Bezpieczeństwo

Nie zgłaszaj problemów związanych z bezpieczeństwem w publicznych zgłoszeniach. Sposób zgłaszania opisuje [.github/SECURITY.md](.github/SECURITY.md).

## Skąd to się wzięło

layerling to fork projektu [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D) autorstwa Formsmith746 i współtwórców SketchForge.
Fork powstał 16 września 2026 z SketchForge 1.0.9. SketchForge pozostaje świetnym projektem i
powodem, dla którego ten istnieje.

## Znaki towarowe

Tinkercad jest znakiem towarowym firmy Autodesk, Inc. layerling jest niezależnym projektem i nie jest powiązany z Autodesk, popierany ani sponsorowany przez tę firmę.

## Licencja

Copyright (C) 2026 layerling contributors.
Copyright (C) 2026 SketchForge contributors.

layerling jest zmodyfikowaną wersją SketchForge-3D i jest udostępniany na licencji **GNU Affero General Public License v3.0 only**
(`AGPL-3.0-only`), tej samej co oryginał. Zobacz [LICENSE](LICENSE).

Jeśli modyfikujesz layerling i pozwalasz ludziom korzystać ze zmodyfikowanej wersji przez sieć, sekcja 13 licencji wymaga, abyś
zaoferował im odpowiadający jej kod źródłowy. Panel ma do tego odnośnik **Source**: ustaw
`NEXT_PUBLIC_SOURCE_CODE_URL` podczas budowania na publiczny adres źródeł, z których powstał Twój build.
