---
title: Zaznaczanie i rozmieszczanie
summary: Zaznaczanie kształtów, szukanie ich na liście obiektów, wyrównywanie, odbijanie, obracanie, kładzenie płasko na ścianie i powielanie w szykach.
---

## Zaznaczanie

Kliknięcie kształtu go zaznacza. Z [[Shift]] dodajesz kolejne albo je odznaczasz. Gdy trzymasz [[Shift]], a zaznaczone są dwa kształty lub więcej, mała liczba pod wskaźnikiem myszy pokazuje, ile ich jest. Kliknięcie pustego miejsca czyści zaznaczenie, podobnie jak [[Esc]]. Przeciągnij ramkę na pustej płaszczyźnie roboczej, aby zaznaczyć wszystko, czego dotyka. Z wciśniętym [[Shift]] ramka dodaje to, co nie było zaznaczone, i odznacza to, co było. Jeśli wolisz wyłowić jedną część z gąszczu, włącz w ustawieniach {{ui:workspace.frameByDirection}} (sekcja {{ui:workspace.appearance}}): ramka przeciągnięta w prawo bierze wtedy tylko to, co leży w niej w całości, przeciągnięta w lewo nadal wszystko, czego dotyka, a jej linia jest przerywana. Przytrzymaj [[Alt]] podczas przeciągania, aby na to jedno przeciągnięcie odwrócić działanie ramki, na przykład żeby zabrać całe bryły od strony, z której kierunek by na to nie pozwalał. [[Ctrl]]+[[A]] zaznacza wszystkie widoczne bryły. Gdy przeciągasz bryłę albo uchwyt ramki, [[Esc]] anuluje ruch, dopóki trzymasz przycisk myszy: wszystko wraca na miejsce, a do historii nic nie trafia.

To, co przeszkadza, ukrywasz ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Ukryte kształty zostają w projekcie, po prostu ich nie widać i nie trafiają do eksportu. Okno eksportu mówi wcześniej, ile ich jest. [[Ctrl]]+[[Shift]]+[[H]] przywraca je wszystkie. To, co ma zostać na miejscu, blokujesz kłódką na górze ustawień albo przez [[Ctrl]]+[[L]]. Zablokowanego kształtu nie da się przesunąć, zmienić jego rozmiaru, obrócić, przemalować ani usunąć: jego uchwyty robią się szare, obok strzałki na górze pojawia się kłódka, a narzędzia, które by go zmieniły, są wyszarzone. Najechanie na uchwyt nadal pokazuje wymiary, a klawisz, który by go zmienił, wyświetla „Obiekt zablokowany”. Dopóki w zaznaczeniu jest jeden zablokowany kształt, nic się nie zmienia także dla pozostałych. Ukrywanie, zmiana nazwy, kopiowanie i duplikowanie nadal działają.

Liczba na przycisku grupy {{ui:editor.group.visibility}} mówi, ile kształtów jest ukrytych, a kliknięcie jej pokazuje je wszystkie z powrotem. Projekt otwarty z ukrytymi kształtami mówi o tym raz, z przyciskiem, który je pokazuje.

## Lista obiektów

Przy wielu częściach łatwo zgubić się w widoku. Lista obiektów ({{ui:editor.tool.showOutliner}} albo [[Ctrl]]+[[Shift]]+[[O]]) pokazuje wszystkie kształty jako listę. Zostaje otwarta lub zamknięta tak, jak ją zostawiłeś, w każdym projekcie, dopóki jej nie zamkniesz. Ten wybór zapamiętuje przeglądarka.

![Lista obiektów: grupa „Group” z dwiema częściami i kula obok niej. Ikona folderu otwiera grupę.](shot:object-list)

- Kliknięcie wpisu zaznacza kształt, także części wewnątrz grupy. Z wciśniętym [[Shift]] dodajesz kolejne wpisy albo je odznaczasz, tak jak w widoku. Strzałki rozwijają i zwijają grupy.
- Etykieta pokazuje, czy część jest {{ui:outliner.solid}}, czy {{ui:outliner.hole}}.
- Kłódka i oko blokują i ukrywają pojedyncze części.
- {{ui:outliner.rename}} nadaje części własną nazwę. Ołówek obok nazwy na górze ustawień robi to samo dla zaznaczonego kształtu. Sensowne nazwy bardzo pomagają w większych projektach.
- Pole wyszukiwania znajduje kształty po nazwie i po rodzaju, więc także „walec” albo „otwór”. Zagląda też do wnętrza grup, niezależnie od głębokości zagnieżdżenia: grupa zawierająca trafienie zostaje na liście i rozwija się, pokazując pasujące części i grupy, które do nich prowadzą. Grupa znaleziona po własnej nazwie po otwarciu pokazuje wszystkie swoje części.
- Strzałka po lewej stronie paska tytułu zwija listę do samego paska i z powrotem.

Lista jest zadokowana tuż na prawo od kostki widoku. Przeciągnij ją za pasek tytułu, aby położyć ją w dowolnym miejscu na płaszczyźnie roboczej. Przechodzi pod kostką widoku i paskiem kamery. Upuść ją z powrotem obok kostki widoku albo kliknij dwukrotnie pasek tytułu, a znów się zadokuje. Przeglądarka zapamiętuje, gdzie była i czy była zwinięta.

## Wpisywanie pozycji

Karta {{ui:inspector.position}} w panelu właściwości pokazuje, gdzie stoi zaznaczona bryła, i można tam wpisywać wartości: {{ui:prop.positionX}} i {{ui:prop.positionY}} to środek jej prostopadłościanu otaczającego na płycie, z tymi samymi znakami co odległości pokazywane na płaszczyźnie roboczej, a {{ui:prop.positionZ}} to wysokość jej spodu. X rośnie w prawo, Y do tyłu, a Z w górę, według reguły prawej dłoni, jak w Tinkercadzie i programach CAD. Kierunki pokazują strzałki osi na płycie. Wartości są w ustawionej jednostce, a suwaki sięgają tak daleko jak przeciąganie.

## Odkładanie części obok płyty

Kształt możesz przeciągnąć poza krawędź płyty i tam zostawić, mniej więcej na szerokość płyty za każdym bokiem, żeby go przechować na później. Klawisze strzałek przesuwają go dowolnie daleko. Odłożona część nadal należy do projektu i trafia do eksportu razem z resztą. Aby ją pominąć, ukryj ją albo eksportuj tylko zaznaczenie. Jeśli wybrałeś drukarkę, layerling przy eksporcie ostrzeże, gdy coś leży poza jej stołem.

## Przyciąganie podczas przesuwania

Gdy przeciągasz kształt po płaszczyźnie roboczej, przyciąga się on do innych kształtów: jego lewa, prawa, przednia lub tylna krawędź albo środek ląduje dokładnie na krawędzi albo środku innego kształtu. Różowa linia pomocnicza pokazuje, czego się trzyma. Dzięki temu dwie części stają na równo obok siebie albo wyśrodkowane jedna za drugą bez wpisywania liczb. Działa to także przy wyłączonej siatce.

Przytrzymaj [[Shift]] podczas przeciągania, aby ruch został na jednej osi: kształt podąża w tym kierunku, X albo Y, w którym przeciągnąłeś dalej, a drugiego nie rusza. Najlepiej naciśnij [[Shift]] dopiero w trakcie przeciągania, bo na kształcie, który nie jest jeszcze zaznaczony, kliknięcie z [[Shift]] tylko dodaje go do zaznaczenia.

Jeśli [[Alt]] jest wciśnięty już na początku przeciągania, przeciągasz kopię, jak w Tinkercadzie: kształt zostaje na miejscu, a kopia ląduje tam, gdzie ją puścisz. Naciśnięcie [[Alt]] dopiero w trakcie wstrzymuje przyciąganie i kształt podąża wtedy tylko za siatką. Także kopia przyciąga się dopiero wtedy, gdy w trakcie puścisz [[Alt]]. Aby wyłączyć przyciąganie na stałe, użyj menu siatki w prawym dolnym rogu ({{ui:inspector.objectSnap}}) albo ustawień. Na razie przyciąga tylko przesuwanie na zwykłej płaszczyźnie roboczej, a nie podnoszenie i nie zmiana rozmiaru.

## Wyrównywanie

Dwa lub więcej zaznaczonych kształtów ustawiasz w linii przyciskiem {{ui:editor.tool.align}}: wokół zaznaczenia pojawiają się punkty dla lewej strony, środka i prawej strony, przodu, środka i tyłu oraz góry, środka i dołu. Kliknięcie punktu przesuwa tam wszystkie kształty. Jeśli najpierw klikniesz jeden z zaznaczonych kształtów, zostanie on na miejscu, a pozostałe wyrównają się do niego. Zablokowany kształt w zaznaczeniu sam staje się takim nieruchomym kształtem. Lewa, prawa, przód, tył, góra i dół liczą się według prostopadłościanu otaczającego kształt. Środek trójkąta, pięciokąta albo gwiazdy to ich własny środek, więc wyśrodkowany na nim otwór siedzi na środku kształtu, a nie jego prostopadłościanu otaczającego.

Kształt obrócony pod kątem, na przykład o 45°, wyrównuje się według otaczającego go prostopadłościanu, a nie według własnych krawędzi. Aby wyrównać według krawędzi, najpierw połóż płaszczyznę roboczą na ścianie tego kształtu ({{ui:camera.placeWorkplane}}, potem kliknij ścianę): punkty staną wtedy na osiach tej płaszczyzny, a kształty będą mierzone i przesuwane wzdłuż nich, jak w Tinkercadzie. Przywróć płaszczyznę roboczą, aby znów wyrównywać wzdłuż płyty.

![Wyrównaj pokazuje możliwe cele jako kropki wokół zaznaczenia.](shot:align)

Klawisz to [[L]]. [[Esc]] anuluje.

## Odbicie lustrzane

{{ui:editor.tool.mirror}} ([[M]] albo prawy klik na zaznaczeniu i wybór tej opcji) odbija zaznaczenie względem płaszczyzny: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} albo {{ui:mirror.topBottom}}. Kliknij odpowiednią strzałkę osi. Przydaje się przy częściach symetrycznych: zbuduj jedną połowę, skopiuj ją i odbij kopię.

## Obracanie i ustawianie punktu obrotu

Obracasz zakrzywionymi strzałkami na kształcie, liczbami w ustawieniach albo klawiszem [[R]] co 45°. Gdy przeciągasz po okręgu obrotu, obrót przyciąga się do każdej kreski, czyli co 22,5°. Przytrzymaj [[Shift]], aby uzyskać drobniejsze kroki, a pojawią się dodatkowe kreski co 11,25°. Przeciągaj poza okręgiem, aby obracać swobodnie co 1°, albo co 45° z [[Shift]]. Zwykle zaznaczenie obraca się wokół swojego środka. Czasem nie powinno, na przykład gdy pochyloną rurę trzeba obrócić dalej przy jej końcu. Do tego służy {{ui:editor.tool.rotationPivot}}: potem kliknij ścianę. Płaska ściana daje swój środek, na przykład oś końca rury. Zaznaczenie obraca się teraz wokół tego punktu. Drugie kliknięcie narzędzia go usuwa.

Kąty zostają przy bryle. W jej ustawieniach karta {{ui:inspector.rotation}} pokazuje je jako {{ui:prop.rotateX}}, {{ui:prop.rotateY}} i {{ui:prop.rotateZ}}, nazwane tak jak pozycja: Y biegnie w poprzek płyty, Z w górę. Wpisz tam kąt, a bryła obróci się do niego, wokół swojego środka albo wokół własnego punktu obrotu, jeśli go ma. Dopóki obrócona bryła jest zaznaczona, jej kąty widać też pod nią na płaszczyźnie roboczej. {{ui:workspace.showRotationAngles}} w ustawieniach to wyłącza.

![Bryła obrócona wokół dwóch osi: jej kąty stoją pod nią, a karta Obrót w jej ustawieniach przyjmuje je jako liczby.](shot:rotation-card)

Gdy zaznaczona jest **jedna bryła**, punkt obrotu należy do tej bryły: zaznacz inne części i wróć, a nadal tam będzie. Przesuwa się, obraca i skaluje razem z bryłą, zapisuje się w projekcie i wraca po Cofnij. W karcie {{ui:inspector.position}} punkt obrotu ma własne X, Y i Z, które możesz wpisać albo dostroić, a {{ui:inspector.pivotRemove}} go usuwa. Czerwony znacznik punktu obrotu możesz też przeciągać myszą: ślizga się po powierzchni brył i przyciąga się do narożników, środków krawędzi i krawędzi, więc oś zawiasu ląduje dokładnie na narożniku. Gdy zaznaczonych jest kilka brył, punkt obrotu obowiązuje tylko dla tego zaznaczenia, a nowe zaznaczenie go usuwa. Po zgrupowaniu lub połączeniu w pakiet zostaje: grupa przejmuje go jako własny punkt obrotu, z X, Y i Z w {{ui:inspector.position}}.

## Kładzenie płasko na ścianie

Część ma leżeć do druku na swojej najlepszej stronie? Zaznacz ją, kliknij {{ui:editor.tool.layFlat}}, a potem ścianę, która ma trafić na dół. Gdy przesuwasz wskaźnik nad częścią, ściana pod nim się podświetla, więc widzisz, którą zaraz wybierzesz. Obróć widok, żeby sprawdzić pozostałe strony. Część obraca się tak, że ta ściana opiera się na płaszczyźnie roboczej.

Dwie części mają się zetknąć ścianami albo stanąć na równo? Zaznacz część, która ma się przesunąć, kliknij {{ui:editor.tool.mateFaces}}, potem kliknij jej ścianę, a następnie ścianę drugiej części. W panelu {{ui:mate.mode.against}} przykłada ściany do siebie (plecami, stykając się), a {{ui:mate.mode.flush}} kładzie je w jednej płaszczyźnie obok siebie. {{ui:mate.gap}} zostawia między nimi miejsce, na przykład na luz. {{ui:mate.apply}} przesuwa część: obraca ją najkrótszą drogą, aż ściany będą równoległe (wcale, jeśli już są), a potem przesuwa ją tylko w stronę drugiej ściany, więc w bok zostaje na miejscu. Druga część zostaje tam, gdzie była, a jedno Cofnij cofa wszystko.

![Panel Wyrównaj ściany: część, która się przesuwa, jest wybrana, następna jest ściana drugiej części, potem ściana do ściany albo na równo i opcjonalna szczelina.](shot:mate-faces)

**Otwory na jednej osi:** {{ui:mate.mode.concentric}} wyrównuje zamiast tego okrągłe ściany: otwór nad otworem, kołek w otworze, śrubę w jej otworze przelotowym. Wybierz tę opcję, zanim klikniesz ściany. Potem kliknij okrągłe wnętrze otworu (lub zewnętrzną stronę kołka) na części, która się przesuwa, i okrągłą ścianę drugiej części; cała okrągła ściana podświetla się pod wskaźnikiem. {{ui:mate.apply}} obraca część najkrótszą drogą, aż obie osie będą równoległe, i przesuwa ją w poprzek na drugą oś. Wzdłuż osi zostaje tam, gdzie była, więc kołek zachowuje wysokość; wsuń go potem. Działa to też na zaimportowanych siatkach, o ile otwór składa się ze ścianek wokół jednej osi.

**Dokładny kąt między dwiema ścianami:** {{ui:editor.tool.mateFaces}} zostawia ściany równoległe. Nie ma osobnego narzędzia do kąta między nimi, ale da się to zrobić tak. Najpierw zetknij ściany przez {{ui:editor.tool.mateFaces}}, żeby były równoległe. Potem ustaw punkt obrotu na krawędzi, w której się stykają ({{ui:editor.tool.rotationPivot}}, kliknij krawędź albo narożnik), i wpisz kąt, na przykład 15 albo 30, w karcie {{ui:inspector.rotation}} części. Obróci się wokół tego punktu. Osie tej karty to osie płyty, więc działa to, gdy krawędź biegnie wzdłuż X, Y albo Z.

Równie proste są {{ui:editor.tool.dropToWorkplane}} ([[D]]), który opuszcza zaznaczenie na płaszczyznę roboczą, i {{ui:editor.tool.centerOnWorkplane}}.

[[C]] podnosi zaznaczenie, jak Cruise w Tinkercadzie: podąża ono za wskaźnikiem myszy i kładzie się na ścianie innej bryły, nad którą jesteś, także na skośnej. Kliknięcie je tam odkłada, a [[Esc]] zostawia je tam, gdzie było. Jego spód opiera się wtedy na ścianie, ustawiony wzdłuż krawędzi ściany, tak jak nowy kształt. Własny obrót wokół osi pionowej zachowuje. Kilka części wędruje razem i zachowuje odstępy. Nad pustą płytą [[C]] stawia pochyloną część z powrotem pionowo na płaszczyźnie roboczej. Bez klawiatury to samo oferuje {{ui:contextMenu.carry}} w menu długiego przytrzymania.

## Szyki: rząd i okrąg

Do siatek otworów, okręgów otworów pod śruby i wieńców zębów służy {{ui:editor.tool.array}}. Zaznacz kształty do powielenia i kliknij go na wstążce.

![Szyk w trybie „Okrąg”: kopie pojawiają się najpierw jako podgląd.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** zaznaczenie powtarza się w równych odstępach. Rząd postępuje wzdłuż wszystkich trzech osi naraz, z wartościami {{ui:array.spacingX}}, {{ui:array.spacingY}} i {{ui:array.spacingZ}}: jedna z nich daje prosty rząd, dwie lub trzy rząd po skosie albo schody. Ujemny odstęp układa rząd w przeciwną stronę.
- **{{ui:array.mode.circle}}:** zaznaczenie rozkłada się wokół środka. Ile jest kopii, ustawiasz w polu {{ui:array.count}}, a {{ui:array.angle}} to 360° dla pełnego okręgu. Wybierz, czy kopie mają się obracać razem z okręgiem. {{ui:array.rise}} podnosi każdą kopię trochę wyżej niż poprzednią (śruba albo wznosząca się spirala), a {{ui:array.radiusChange}} odsuwa ją dalej od środka albo przybliża do niego (płaska spirala). Razem dają spiralę stożkową. Spirala zatacza najwyżej jedno okrążenie: kąt powyżej 360° liczy się jako pełny okrąg, a kopii jest najwyżej 100.

Wskazówka: najpierw ustaw punkt obrotu na ścianie przez {{ui:editor.tool.rotationPivot}}, a środek okręgu wypadnie dokładnie tam.

![Szyk w trybie „Okrąg” ze wzniesieniem i zmianą promienia na kopię: kopie wspinają się i rozszerzają jak spirala.](shot:pattern-spiral)

Kopie pojawiają się najpierw jako podgląd. Dopiero {{ui:array.apply}} je tworzy. Jeśli kopie są otworami, zgrupuj je potem z bryłą, w której mają wyciąć materiał.

## Wzór otworów na ścianie

Do kratek wentylacyjnych, maskownic głośników, koszyków i obudów {{ui:holePattern.title}} rozkłada otwory równomiernie na płaskiej ścianie. Nie musisz już robić jednego otworu, powielać go i ustawiać na ściance. Zaznacz dokładnie jedną bryłę i kliknij {{ui:holePattern.title}} w grupie {{ui:editor.group.modify}} paska narzędzi, obok szyku. Możesz też kliknąć bryłę prawym przyciskiem albo znaleźć narzędzie przez [[Ctrl]]+[[K]].

1. Kliknij płaską ścianę bryły. Liczy się cała płaska ściana wokół kliknięcia, a nie tylko trójkąt pod wskaźnikiem. Zakrzywiona ściana nie działa: dostaniesz podpowiedź i klikniesz płaską.
2. W oknie ustaw, jak otwory wyglądają i jak leżą:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} albo {{ui:holePattern.form.slot}}.
   - **Rozmiar:** {{ui:holePattern.size.diameter}} okrągłego otworu, {{ui:holePattern.size.side}} kwadratowego, {{ui:holePattern.size.width}} i {{ui:holePattern.size.height}} dla prostokąta i otworu podłużnego. Dla sześciokąta rozmiar to {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** odległość od środka jednego otworu do środka następnego. Jeśli jest mniejsza, niż pozwalają otwory, layerling podnosi ją do najmniejszej możliwej wartości, żeby między otworami została ścianka.
   - **{{ui:holePattern.wall}}:** ta sama odległość wyrażona inaczej: ścianka zostająca między dwoma sąsiednimi otworami, czyli grubość ścianki na wydruku. Ustaw ją, a rozstaw od środka do środka pójdzie za nią, i odwrotnie. Dla sześciokątów, prostokątów i otworów podłużnych layerling mierzy najmniejszą odległość między ich krawędziami.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} ustawia otwory w rzędach i kolumnach. {{ui:holePattern.arrangement.staggered}} przesuwa co drugi rząd o pół rozstawu i zbliża rzędy, więc każdy otwór ma sąsiadów w tej samej odległości. Z sześciokątami daje to plaster miodu.
   - **{{ui:holePattern.margin}}:** wolna odległość między otworami a krawędzią ściany. Powstają tylko otwory, które leżą w całości wewnątrz ściany pomniejszonej o ten margines. Wszystko, co by poza nią wystawało, jest pomijane. Margines obowiązuje też wokół otworów w ścianie.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (domyślnie) przecina całą ściankę. Z {{ui:holePattern.depth.custom}} podajesz głębokość w milimetrach, na przykład do wgłębień.
3. Otwory od razu pokazują się jako podgląd na ścianie i podążają za każdą wartością. Okno mówi, ile otworów się zmieści. {{ui:holePattern.repick}} wybiera inną ścianę, [[Esc]] zamyka narzędzie, a okno, jak inne okna narzędzi, przesuwa się za pasek tytułu.
4. Dopiero {{ui:holePattern.apply}} tworzy otwory.

Otwory to zwykłe otwory zgrupowane z bryłą, tak jak po {{ui:editor.tool.group}}: nic nie jest wtopione na stałe. {{ui:editor.tool.ungroup}} rozwiązuje grupę i uwalnia każdy otwór, który możesz potem osobno przesunąć, zmienić albo usunąć. Całość to jeden krok dla {{ui:editor.tool.undo}}. Narzędzie nie tworzy naraz więcej niż 400 otworów. W takim przypadku zwiększ otwory albo rozstaw.

AI może zrobić to samo przez most MCP poleceniem `layerling_perforate_face` (zobacz rozdział [AI przez MCP](chapter:ai-with-mcp)).

## Wypychanie ściany na zewnątrz lub do środka

Do grubszej ścianki, wypukłej podkładki na ścianie albo wyciętej w niej kieszeni służy narzędzie {{ui:faceTool.title}}, które działa na jednej płaskiej ścianie. Działa też na zaimportowanym STL, gdzie nie ma szkicu do zmiany. Zaznacz dokładnie jedną bryłę i kliknij {{ui:faceTool.title}} w grupie {{ui:editor.group.modify}} paska narzędzi, obok wzoru otworów. Możesz też kliknąć bryłę prawym przyciskiem albo znaleźć narzędzie przez [[Ctrl]]+[[K]].

1. Kliknij płaską ścianę bryły. Jak przy wzorze otworów liczy się cała płaska ściana wokół kliknięcia, a zakrzywiona ściana nie działa.
2. W oknie:
   - **{{ui:faceTool.direction}}:** wybierz {{ui:faceTool.direction.out}}, aby materiał stał na ścianie, albo {{ui:faceTool.direction.in}}, aby wyciąć w niej kieszeń. Kieszeń nie sięga głębiej niż bryła za ścianą, ale w bryle wydrążonej może dojść do wnęki.
   - **{{ui:faceTool.inset}}:** jak daleko nowy kontur trzyma się wewnątrz krawędzi ściany. Na zewnątrz 0 bierze całą ścianę, co pogrubia ściankę. Otwory w ścianie rosną o tyle samo.
   - **{{ui:faceTool.radius}}:** zaokrągla każdy narożnik konturu, także wewnętrzne, więc ostry czubek kończy się łukiem. Wcięcie węższe niż dwa promienie się zamyka, a fragment ściany węższy niż dwa razy odsunięcie i promień razem jest pomijany.
   - **{{ui:faceTool.depth}}:** jak daleko nowa część wystaje ze ściany albo jak głęboka jest kieszeń.
3. Wynik od razu pokazuje się jako podgląd i podąża za każdą wartością. {{ui:faceTool.repick}} wybiera inną ścianę, [[Esc]] zamyka narzędzie.
4. Dopiero {{ui:faceTool.apply}} to tworzy.

To, co dodaje narzędzie, to zwykła bryła ze szkicu zgrupowana z bryłą: nic nie jest wtopione na stałe. {{ui:group.edit}} otwiera grupę, a {{ui:inspector.editSketch}} na nowej części pokazuje kontur, za którym podąża. Na górze lub spodzie zwykłej bryły ze szkicu (jedna powierzchnia, nie zgrupowana, nie odbita, nie zwężona, nie skręcona ani nie pochylona, bez obrysu, otworu na kółko do kluczy, zaokrąglenia ani fazki) jest to własny kontur bryły, wstawiany przy jej budowie, więc jej linie i łuki pozostają dokładne wszędzie tam, gdzie jądro CAD może je wstawić, dla narzędzi krawędzi i eksportu STEP. Po późniejszej zmianie rozmiaru część zachowuje odsunięcie. Na każdej innej ścianie i na każdej ścianie zaimportowanej siatki kontur podąża za trójkątami ściany, a krzywa składa się z krótkich prostych odcinków. Całość to jeden krok dla {{ui:editor.tool.undo}}. Aby później zmienić odsunięcie albo promień, cofnij i uruchom narzędzie ponownie. Aby potem zaokrąglić górną krawędź, użyj na grupie jako ostatniego kroku {{ui:editor.tool.fillet}} z opcją {{ui:edge.topEdges}}: jak każda obróbka krawędzi na grupie łączy ona grupę w jedną bryłę.

AI może zrobić to samo przez most MCP poleceniem `layerling_push_face` (zobacz rozdział [AI przez MCP](chapter:ai-with-mcp)).

## Zmiana kilku części naraz

Gdy zaznaczonych jest kilka części, panel właściwości po prawej pokazuje, ile ich jest, i oferuje to, co dotyczy ich wszystkich razem: {{ui:inspector.solid}} albo {{ui:inspector.hole}}, jeden kolor dla wszystkich (kliknięcie {{ui:inspector.solid}} otwiera kolory) i blokadę. Przy mieszanym zaznaczeniu jedno kliknięcie zmienia wszystkie w bryły albo wszystkie w otwory. Jeśli któraś z części jest zablokowana, można użyć tylko blokady. Rozmiary zmieniasz uchwytami, przez {{ui:scalePercent.title}} albo wpisując liczbę w etykietę wymiaru. Przy kilku częściach liczba to rozmiar całego zaznaczenia: każda część rośnie razem z nim, odstępy między nimi także, jak przy przeciąganiu uchwytu. Bryła i otwór działają też z prawego kliknięcia albo klawiszami [[S]] i [[H]].

## Skalowanie o procent

Aby powiększyć lub zmniejszyć jedną lub kilka części o ten sam odsetek, na przykład wszystkie części pliku do druku o 20 %, użyj {{ui:scalePercent.title}}. Zaznacz części, kliknij je prawym przyciskiem i wybierz {{ui:scalePercent.title}} albo znajdź to przez [[Ctrl]]+[[K]].

W polu {{ui:scalePercent.percent}} wpisujesz nowy rozmiar jako procent obecnego: 120 % to o jedną piątą więcej, 50 % to połowa rozmiaru. Szerokość, głębokość i wysokość zmieniają się jednakowo, więc proporcje zostają. Spód zostaje na miejscu, więc nic nie zapada się w płytę.

Przy kilku częściach wybierasz, jak mają rosnąć:

- **{{ui:scalePercent.mode.together}}:** części rosną wokół wspólnego środka, a odstępy rosną razem z nimi. Całość staje się większa, jakby była jedną częścią.
- **{{ui:scalePercent.mode.each}}:** każda część rośnie tam, gdzie stoi, a odstępy między nimi zostają takie same.

Dopiero {{ui:scalePercent.apply}} zmienia projekt, a jeden krok wstecz to cofa. Gdy w zaznaczeniu jest zablokowana część, okno się nie otwiera.

## Cofanie

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) i {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] albo [[Ctrl]]+[[Y]]) przechodzą przez Twoją historię. Ile kroków zapisuje się razem z projektem, ustawiasz w ustawieniach w sekcji {{ui:workspace.history}}.

## Spojrzenie wstecz: widok historii

{{ui:editor.tool.history}}, obok Cofnij i Ponów, otwiera widok Twojej historii bez zmieniania czegokolwiek. Obszar roboczy pokazuje projekt takim, jaki był, a suwak na dole przechodzi przez każdy krok cofania: całkiem po prawej jest stan bieżący, każdy krok w lewo to jedno cofnięcie wcześniej, a stany, które cofnąłeś, leżą na prawo od bieżącego. Klawisze strzałek przechodzą przez stany, [[Esc]] wraca do stanu bieżącego. Kółko myszy nad suwakiem robi to samo, jeden stan na ząbek, w górę do wcześniejszego; [[Page Up]] i [[Page Down]] przeskakują o dziesięć stanów, [[Home]] przechodzi do najstarszego stanu, a [[End]] z powrotem do bieżącego. W tym czasie możesz obracać i przybliżać widok oraz klikać obiekty, aby je przywrócić (zobacz niżej), ale niczego nie da się przesunąć. Sam projekt zostaje dokładnie taki, jaki jest. Jeśli pasek coś zasłania, odsuń go za pasek tytułu, a dwukrotne kliknięcie go przywraca.

Z wcześniejszego stanu możesz zabrać dwie rzeczy. {{ui:historyView.createProject}} wstawia ten stan do nowego projektu w przeglądzie, nazwanego tak jak ten, z godziną tamtego stanu w nawiasie (projekt zapisany, zanim layerling zaczął zapisywać godziny, ma zamiast niej „kopia”), i z historią do tego momentu, więc cofanie dalej tam działa. {{ui:historyView.export}} otwiera zwykły eksport z tym stanem jako projektem, więc możesz zapisać go jako STL, 3MF, STEP, obraz albo plik LYL z historią do tego stanu.

Możesz też przywrócić do projektu pojedyncze obiekty. Kliknij obiekt w pokazanym stanie ([[Shift]]+klik dodaje kolejne albo jeden odznacza, kliknięcie pustego miejsca nic nie wybiera) i wybierz {{ui:historyView.bringBack}}. Widok się zamyka, a kopia każdego obiektu ląduje w bieżącym projekcie dokładnie taka, jaka była w tamtym stanie, i w tym samym miejscu, zaznaczona, obok tego, co projekt ma teraz. Nic innego się nie zmienia. To jeden krok, więc Cofnij go wycofuje. Przydaje się dla wersji części, którą od tego czasu zmieniłeś, albo dla części, którą usunąłeś. Grupa wraca w całości, a notatki i punkty odniesienia na obiekcie zostają. Jego nazwa niesie godzinę tamtego stanu, na przykład „Prostopadłościan (12:32)”, więc łatwo go odróżnić od wersji, którą projekt ma teraz. Aby przywrócić część z wnętrza grupy, zaznacz grupę i wybierz {{ui:historyView.openGroup}} albo naciśnij [[E]], tak jak w projekcie: jej części zostają rozłożone tam, gdzie umieściłaby je edycja grupy, gotowe do wybrania, a pasek pokazuje, w której grupie jesteś. {{ui:historyView.backOut}} zamyka ją z powrotem. To służy tylko do oglądania - grupa, projekt i historia pozostają bez zmian.

{{ui:historyView.delete}} stoi osobno w lewym dolnym rogu paska. Po pytaniu usuwa na dobre wszystkie wcześniejsze kroki: projekt zachowuje stan, który ma teraz (a nie ten pokazany), Cofnij nie ma już do czego wracać, a plik zapisany później nie zawiera historii. Użyj tego, aby udostępnić projekt bez jego przeszłości albo zacząć kroki cofania od nowa. Tego nie da się cofnąć. Aby udostępnić plik, nie ruszając własnego projektu, wybierz zamiast tego przy eksporcie {{ui:export.historyNone}}.
