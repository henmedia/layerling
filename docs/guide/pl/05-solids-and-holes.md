---
title: Bryły i otwory
summary: Jak z prostych kształtów powstają otwory, rowki i kieszenie i jak później zmienić grupę.
---

To najważniejsza idea w layerling i szybko ją opanujesz: **każdy kształt jest albo bryłą, albo otworem.** Bryła zostaje. Otwór to narzędzie, które usuwa materiał.

## Bryła czy otwór

Zaznacz kształt i kliknij w jego ustawieniach {{ui:inspector.solid}} albo {{ui:inspector.hole}}. Klawiaturą jest szybciej: [[H]] zmienia zaznaczenie w otwór, [[S]] z powrotem w bryłę. Oba polecenia są też w menu otwieranym prawym kliknięciem na bryle. Otwór jest pokazywany jako przezroczysty, żebyś widział, gdzie leży. [[T]] robi bryłę przezroczystą, na przykład żeby zajrzeć do obudowy, a drugie naciśnięcie przywraca ją do nieprzezroczystej. Działa na całe zaznaczenie: jeśli któraś bryła jest już przezroczysta, wszystkie stają się nieprzezroczyste, w przeciwnym razie wszystkie stają się przezroczyste.

Dopóki nic nie jest zgrupowane, z otworem nic się nie dzieje. Po prostu leży i pokazuje, gdzie coś później zniknie.

![Walec jest otworem. Wystaje nad górną ścianę sześcianu, żeby przeciąć go na wylot.](shot:hole-before)

## Grupowanie

Zaznacz bryły i otwory, a potem kliknij {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Teraz otwory usuwają materiał z brył, których dotykają. Zostaje jeden nowy kształt.

![Wynik: sześcian z otworem na wylot.](shot:hole-after)

Tak powstają:

- **Otwory na wylot:** walec jako otwór przechodzący przez bryłę.
- **Rowki:** wydłużony prostopadłościan jako otwór przy krawędzi.
- **Kieszenie:** otwór, który nie przechodzi na wylot.
- **Gwinty w części:** otwór gwintowany jako otwór, zobacz [Gwinty i mechanika](chapter:threads-and-mechanics).

Jeśli w grupie jest kilka brył, łączą się. Dwie bryły, które się stykają, stają się jedną częścią.

Przy dużych siatkach, takich jak zaimportowany STL z setkami tysięcy trójkątów, cięcie trwa kilka sekund. layerling pracuje wtedy w tle i pokazuje „{{ui:status.computing}}”. W tym czasie możesz obracać widok i korzystać z interfejsu. Jeśli w tym czasie zmienisz scenę, wynik zostaje odrzucony, a layerling o tym informuje. To samo dotyczy {{ui:editor.tool.split}}.

Z grupą możesz postępować jak z kształtem: przesuwać, obracać, kolorować, grupować dalej. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) ją rozwiązuje i pojedyncze części wracają.

### Grupa jako otwór

Cała grupa też może być bryłą albo otworem. Obowiązuje prosta zasada:

- Jeśli grupa składa się tylko z brył (albo tylko z otworów), przełączasz ją w całości, a jej części idą za nią.
- Jeśli zawiera jedno i drugie, na przykład sześcian z otworem, każda część zachowuje własny stan. Cała grupa staje się wtedy narzędziem, ale otwór zostaje otworem.

### Zmiana rozmiaru grupy: otwory i małe części zostają

Gdy grupa staje się dłuższa, szersza albo wyższa, jej części rozciągają się razem z nią, jakby były narysowane na gumie: okrągłe otwory w płycie stają się owalne i przesuwają się do środka. Aby zostały takie, jakie są, wybierz w ustawieniach grupy w polu {{ui:inspector.groupResize}} opcję {{ui:inspector.groupResizeKeepParts}}; bez tego wyboru obowiązuje {{ui:inspector.groupResizeStretch}}, jak dotąd w każdej grupie. Od tej chwili przy każdej zmianie rozmiaru - uchwytami, w polach wymiarów albo przez {{ui:scalePercent.title}} - grupa jest budowana od nowa ze swoich części według jednej reguły, osobno dla każdego kierunku:

- Część, która sięga prawie przez całą grupę, na dziewięć dziesiątych lub więcej, rośnie albo maleje razem z nią i zachowuje odległość od obu boków: sama płyta, ścianka albo wnętrze pudełka, którego ścianki zostają tak samo grube.
- Każda inna część zachowuje swój rozmiar i odległość od bliższego boku. Część pośrodku zostaje pośrodku.

Płyta z otworem 5 mm od każdego narożnika i rowkiem pośrodku, wydłużona o 40 mm, zachowuje więc okrągłe otwory 5 mm od narożników i rowek pośrodku. Nie stoi za tym żaden solver więzów i niczego nie ustawiasz część po części: ta sama reguła obowiązuje wszystkie części, więc z góry wiesz, co się stanie. Obrócona część liczy się z prostopadłościanem, który zajmuje w grupie, i pozostaje obrócona; grupa wewnątrz grupy liczy się jako jedna część. Gdy ciągniesz uchwyt, grupa rozciąga się w całości; gdy go puścisz, jest budowana od nowa, w tym samym kroku cofania. Jeśli grupa stanie się mniejsza, niż część potrzebuje razem ze swoją odległością, ta część jak dotąd zmniejsza się razem z nią, a komunikat o tym informuje. Grupa odbita lustrzanie, zwężana lub skręcona oraz grupa z własnymi zaokrągleniami, fazowaniami lub teksturą zawsze rozciąga wszystko. Wybrane dla grupy, która jest już rozciągnięta, ustawienie od razu rozmieszcza jej części na nowo.

![Płyta z otworem 5 mm od każdego narożnika i rowkiem pośrodku, wydłużona o 40 mm z opcją „Zachowaj otwory i małe części”: otwory są nadal okrągłe i 5 mm od narożników, rowek nadal pośrodku.](shot:group-keep-parts)

## Zestaw

Czasem części mają tylko trzymać się razem, nie stając się jednym, na przykład białe logo na czarnej płytce do druku wielokolorowego. Do tego służy {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), jak w Tinkercadzie. Zestaw przesuwa się, obraca i zmienia rozmiar jak kształt, ale nic się nie scala:

- Każda część zachowuje swój kolor i zostaje bryłą albo otworem. Ustawienia zestawu mają te same karty co grupa: {{ui:inspector.solid}} i {{ui:inspector.hole}} dla całego zestawu (które zachowują kolory części), {{ui:inspector.transparent}} ([[T]]) i {{ui:inspector.multicolor}} ([[Shift]]+[[M]]). Po wyłączeniu Wielokolorowego zestaw pokazuje się i eksportuje w jednym kolorze. {{ui:inspector.separateParts}} rozkłada zestaw, tak jak [[Ctrl]]+[[Shift]]+[[G]].
- Otwory niczego nie wycinają. Gdy zgrupujesz zestaw z innymi częściami, jego otwory wycinają te części, ale nadal nie własne bryły zestawu, jak w Tinkercadzie. Dlatego na przykład kołek z otworem obok niego można jako zestaw używać raz po raz.
- W eksporcie STL, 3MF lub OBJ każda część jest osobną bryłą, a w 3MF i OBJ ze swoim kolorem.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) rozkłada zestaw z powrotem, a [[E]] otwiera go do edycji jak grupę. Fazowanie, zaokrąglenie i drążenie nie działają na zestawie, bo nie jest on jedną bryłą: w tym celu go zgrupuj albo pracuj na jego częściach po kolei. Jeśli otwór w zestawie ma wycinać także własne bryły zestawu, rozłóż zestaw i zgrupuj jego części ([[Ctrl]]+[[G]]).

## Część wspólna

{{ui:editor.tool.intersect}} zostawia tylko to, co dwie lub więcej brył mają wspólnego. Połóż na sobie dwa nachodzące na siebie kształty, zaznacz oba i kliknij ten przycisk. Tak z walca i prostopadłościanu powstaje element z jednym bokiem okrągłym, a drugim prostym. Grupa liczy się tak, jak wygląda, razem z otworami. Jeśli zaznaczony jest też otwór, zostaje to, co wszystkie bryły mają wspólnego ze wszystkimi otworami. Jeśli kształty nie mają nic wspólnego, nic się nie zmienia, a komunikat o tym informuje. Pierwsze kliknięcie pokazuje część wspólną, zanim zostanie zastosowana: zaznaczone kształty stają się przezroczyste, a to, co mają wspólnego, jest rysowane na zielono. Zaznaczaj i przesuwaj każdy kształt osobno, a zielona część za nim podąża. Drugie kliknięcie {{ui:editor.tool.intersect}} ją stosuje, [[Esc]] zamyka podgląd. Kształty ze zbyt wieloma trójkątami do podglądu, na przykład duże zaimportowane siatki, są przecinane już przy pierwszym kliknięciu.

{{ui:editor.tool.hull}} otacza zaznaczone kształty jedną wypukłą bryłą, jakby owinięto je folią termokurczliwą: najmniejszą bryłą bez wgłębień, która mieści je wszystkie. Półkula na walcu staje się kopułą bez stopnia, cztery walce w narożnikach prostopadłościanem z zaokrąglonymi narożnikami, a dwie kule kapsułą. Otwory w zaznaczeniu są potem wycinane z otoczki. Części zostają w niej: {{ui:group.edit}} otwiera otoczkę jak grupę, a przesunięcie tam części i zamknięcie buduje otoczkę od nowa. Otoczka jest siatką, więc okrągłe kształty pokazują płaskie ścianki, a narzędzia krawędzi działają na niej jak na każdej siatce. Gdy zaznaczone są tylko otwory, otoczka sama jest otworem: dwa otwory walcowe wycinają podłużny otwór.

{{ui:editor.tool.cookieCutter}} robi z zaznaczenia foremkę do ciastek: cienką ściankę wokół konturu, wysoką na 15 mm, i płaski kołnierz szeroki na 2 mm wokół jej podstawy, więc foremka stoi na kołnierzu, a kciuk ma na czym naciskać. Zaznacz jeden zaimportowany SVG albo jedną bryłę ze szkicu, a użyty zostanie jej własny kontur. Tekst leżący płasko daje własne krzywe liter. Każdy inny kształt, zbudowany, zaimportowana siatka albo kilka części, daje to, na czym stoi: kontur, który przecina w nim płaszczyzna robocza, więc najpierw postaw go na płaszczyźnie roboczej. Części, które się nakładają, dają jeden kontur wokół wszystkich, jakby były zgrupowane, a części od siebie oddalone dają każda własną foremkę, w tym samym zestawie. Kontur jest odbity z lewa na prawo: foremka jest drukowana stojąc na kołnierzu i odwracana do wycinania, więc tekst albo logo wychodzi na cieście we właściwą stronę. Góra ścianki zwęża się do ostrza szerokiego na 0,4 mm. Otwory w konturze, wnętrze litery e albo a, dostają własne ścianki, więc też są wycinane z ciastka. Są osobną bryłą w zestawie, {{ui:cookieCutter.part.innerWalls}}: aby tekst albo wzór był tylko odciskany w cieście, a nie wycinany, obniż je we Właściwościach. Przy ściance 15 mm i cieście grubości 5 mm ścianki wewnętrzne o wysokości 12 mm odciskają na 2 mm głębokości. Ścianki wewnętrzne niższe od ścianki zewnętrznej mają płaski wierzch zamiast krawędzi tnącej: tylko odciskają, a krawędź zostawiłaby cienkie końce, które się łamią, i rowki, w których zostaje ciasto. Jeśli chcesz ją mieć, ustaw ją we Właściwościach. Dwa mostki przy kołnierzu, po stronie, którą naciska dłoń, łączą każdą ściankę wewnętrzną z otaczającą ją ścianką, rozstawione dookoła, szerokie na 4 mm i wysokie na 3 mm. Każdy mostek stoi całą szerokością na ściankach, na środku boku biegnącego wzdłuż konturu, i nigdy nie przechodzi przez inny element. Elementy obok siebie, takie jak litery imienia, też są łączone ze sobą, najpierw najbliższe, więc mostki biegną siatką przez wszystkie, a litera w środku słowa też jest trzymana. Kliknięcie narzędzia otwiera małe okno: wybierasz tam {{ui:cookieCutter.support.plate}} zamiast mostków, która wypełnia cały kontur po stronie, którą naciskasz, jest stabilniejsza i lepiej trzyma się stołu, ale nie pozwala już wypchnąć ciasta od tyłu. {{ui:cookieCutter.fillet}} dodaje małe skosy 45° tam, gdzie ścianki stoją na kołnierzu, mostkach albo płytce, żeby cienkie części, takie jak kropka nad i, się nie odłamywały. Są osobną bryłą w zestawie. Tam też ustawiasz, o ile niższe są ścianki wewnętrzne i czy kontur jest odbity. Wartości zostają dla następnej foremki. Ich wysokość zmieniasz we Właściwościach, tak jak wysokość kołnierza. Foremka zastępuje zaznaczenie jako zestaw brył ze szkicu, a {{ui:group.edit}} go otwiera. Ścianka, ścianki wewnętrzne i kołnierz to tryby wypełnienia szkicu, linia na zewnątrz sylwetki: grubość, wysokość albo kolor każdej zmieniasz we Właściwościach, tam też {{ui:prop.sketchCuttingEdge}} ścianki (0 dla płaskiej góry). Tam, gdzie ciasny łuk nie zostawia miejsca na fazkę z obu stron, ścianka jest ścinana tylko od zewnątrz, do tego samego ostrza. Tam, gdzie konturu w ogóle nie da się sfazować (logo z ostrymi szpicami, kontur wycięty z trójkątów bryły), ostrze jest zamiast tego budowane drobnymi stopniami po 0,1 mm, których warstwa wydruku 0,2 mm nie odróżni od skosu. Taka ścianka jest siatką trójkątów, a nie dokładną bryłą. Aby zachować kontur tak, jak narysowany, odbij foremkę z powrotem przez {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Obraz PNG lub JPG też się nada: przy imporcie zostaje obrysowany w bryłę ze szkicu, a foremka podąża za jej konturem.

{{ui:editor.tool.loftSketches}} łączy dwie bryły ze szkicu albo zaimportowane SVG w jedną bryłę: kontur dolnej na dole, kontur górnej na górze, z prostymi ściankami pomiędzy. Tak powstaje lejek, przejściówka z kwadratu na okrąg albo ramka zwężająca się ku górze. Ustaw obie bryły jedną nad drugą tam, gdzie mają być, jeśli chcesz, przesunięte i obrócone, zaznacz obie i kliknij narzędzie. Przejście sięga od spodu dolnej bryły do góry górnej.

Każda z nich potrzebuje dokładnie jednego konturu. Jeśli ma otwór, na przykład pierścień, druga potrzebuje tylu samo, a otwory też są łączone: dwa pierścienie dają pustą ściankę. Szkic zbudowany jako linia (linia na zewnątrz, do wewnątrz albo na środku we Właściwościach) liczy się jako taki pierścień. Zaimportowany SVG trafia wypełniony, więc aby zrobić z niego pierścień, nadaj mu linię we Właściwościach. Obie bryły muszą leżeć płasko, a pochylonych narzędzie nie przyjmuje.

Przejście jest dokładną bryłą CAD, a narzędzia krawędzi i eksport STEP biorą je jako jedną. Oba szkice zostają w nim: {{ui:group.edit}} otwiera je jak grupę, a przesunięcie albo zmiana jednego z nich, albo edycja jego szkicu i zamknięcie buduje przejście od nowa. {{ui:editor.tool.ungroup}} znów uwalnia oba szkice. Dla dwóch prostokątów, okręgów albo wielokątów jest też wśród kształtów Przejście profili, którego końce ustawiasz liczbami.

## Wycinanie jednej bryły z drugiej

Przy częściach, które mają do siebie pasować, wał w tulei albo śruba w obudowie, robisz jedną część i wycinasz ją z drugiej. Zaznacz obie bryły i kliknij {{ui:editor.tool.cutOut}} w obszarze {{ui:editor.group.combine}} albo kliknij prawym przyciskiem i wybierz to tam. Okno podaje część, która zostaje, i bryłę, która dostaje wnękę; layerling bierze mniejszą za część, a {{ui:cutOut.swap}} to odwraca. {{ui:cutOut.clearance}} powiększa wnękę wokół części o tyle: 0 pasuje dokładnie, 0,2 mm to zwykły luz dla wydrukowanego pasowania. {{ui:cutOut.apply}} wycina kopię części z drugiej bryły i zostawia samą część tam, gdzie jest. Wynikiem jest grupa: {{ui:editor.tool.ungroup}} znów rozdziela wycięcie. Luz wymaga, żeby część była dokładną bryłą, jak przy narzędziu {{ui:editor.tool.offset}}, którego to używa.

## Wykrawanie zarysu przez bryłę

Aby wyciąć zarys jednej bryły na wylot przez drugą, zaznacz najpierw stempel, a potem bryłę do wykrojenia, i kliknij {{ui:editor.tool.punch}} w obszarze {{ui:editor.group.combine}} albo wybierz to po kliknięciu prawym przyciskiem. Bryły nie muszą się stykać: stempel może stać w dowolnym miejscu przed bryłą, liczy się tylko jego zarys widziany wzdłuż osi ({{ui:punch.axis}}). Czajnik trzymany nad płytą zostawia więc w niej otwór w kształcie czajnika. layerling zaczyna od osi, wzdłuż której stempel stoi najdalej od bryły; X biegnie od lewej do prawej, Y od przodu do tyłu, Z w górę. {{ui:punch.swap}} zamienia role, a {{ui:punch.clearance}} powiększa otwór z każdej strony, 0,2 mm dla wydrukowanej części, która ma przez niego przejść. {{ui:punch.apply}} grupuje otwór z bryłą jako dokładną bryłę szkicu ustawioną jako otwór, więc {{ui:editor.tool.ungroup}} znów go usuwa; stempel zostaje na miejscu. Przesuń go lub obróć i wykrój ponownie, aby uzyskać inny otwór.

## Edycja grupy

Jeśli otwór wyszedł za mały, nie musisz rozwiązywać grupy i budować jej od nowa. Zaznacz grupę i kliknij {{ui:group.edit}} w jej ustawieniach, ikonę folderu na liście obiektów albo naciśnij [[E]]. Na liście obiektów możesz też rozwinąć grupę jej strzałką i kliknąć jedną z jej części: grupa otwiera się z tą częścią zaznaczoną. Dwukrotne kliknięcie grupy robi to samo, jak w Tinkercadzie, także na zestawie. Jeśli wolisz tego uniknąć, wyłącz w ustawieniach {{ui:workspace.doubleClickOpensGroup}}. Część zaczyna się przesuwać dopiero wtedy, gdy wskaźnik przesunie się o kilka pikseli, więc drżące kliknięcie albo dwuklik jej nie poruszy. Części leżą teraz osobno i zmieniasz je każdym narzędziem: powiększasz otwór, przesuwasz bryłę, dodajesz otwór.

![Grupa w trakcie edycji: pasek na dole zawiera Anuluj i Gotowe, a lista obiektów pokazuje części.](shot:open-group)

Na dole obrazu pojawia się pasek. {{ui:group.done}} odbudowuje grupę z jej nazwą, kolorem i stanem bryły albo otworu. {{ui:common.cancel}} przywraca ją bez zmian.

Jeśli jedna z części sama jest grupą, możesz ją edytować w ten sam sposób, i tak dalej, tak głęboko, jak sięga Twój projekt. Pasek pokazuje, gdzie jesteś, na przykład „Wspornik › Tuleja śruby”. {{ui:group.done}} i {{ui:common.cancel}} zawsze kończą najgłębiej położoną grupę i wracają o jeden poziom wyżej. Dopóki jesteś wewnątrz grupy, możesz edytować tylko grupy spośród jej części. Aby edytować inną, najpierw zakończ bieżącą.

W przeciwieństwie do {{ui:editor.tool.ungroup}}, który rozkłada grupę na dobre, edycja zachowuje grupę: jej nazwa i ustawienia zostają, a przyciskiem {{ui:common.cancel}} zawsze możesz wrócić.

Uwaga: zaokrąglenia i fazki nałożone na **całą** grupę przepadają przy odbudowie. Pasek o tym informuje.

## Dzielenie

{{ui:editor.tool.split}} w sekcji {{ui:editor.group.modify}} przecina zaznaczenie na dwie części płaszczyzną, na przykład część za dużą na stół drukarki albo taką, do której wnętrza chcesz zajrzeć. Zaznacz jedną lub więcej brył albo otworów i kliknij ten przycisk. Półprzezroczysta płaszczyzna pokazuje dokładnie, gdzie pójdzie cięcie, a biała linia zaznacza je na samych bryłach, tam, gdzie spotyka je płaszczyzna. Nic się nie zmienia, dopóki go nie zastosujesz.

- {{ui:split.orientation}}: **X** robi pionowe cięcie między lewą a prawą stroną, **Y** między przodem a tyłem, **Z** poziome cięcie między górą a dołem. Osie są nazwane tak jak na karcie Pozycja, z Z w górę. Płaszczyzna zaczyna równolegle do płaszczyzny roboczej, więc na płycie bazowej od Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} kładzie płaszczyznę równolegle do płaszczyzny roboczej, {{ui:split.workplaneAcrossX}} i {{ui:split.workplaneAcrossY}} ustawiają ją prostopadle, w poprzek jej kierunku X lub Y. Jeśli początek płaszczyzny roboczej przecina zaznaczenie, płaszczyzna przechodzi przez niego, w przeciwnym razie przez środek. Tak kładziesz płaszczyznę roboczą klawiszem [[W]] na pochyłej ścianie i tniesz dokładnie tam, bez kręcenia suwakami obrotu.
- {{ui:split.position}}: miejsce, w którym przecina płaszczyzna, ustawiane suwakiem albo wpisywane. Zaczyna na środku. Możesz też przeciągnąć grot strzałki na płaszczyźnie, a płaszczyzna przesuwa się wzdłuż strzałki co 0,1 mm.
- {{ui:split.pickFace}}, przycisk obok położenia, kładzie płaszczyznę na ścianie: kliknij go, potem kliknij ścianę. Orientacja, oba obroty i położenie ustawiają się odpowiednio. Podczas wybierania niebieska płaszczyzna pod wskaźnikiem pokazuje, którą ścianę weźmie. Działa też ściana bryły, która nie jest zaznaczona, żeby wyrównać do niej cięcie, ale płaszczyzna zostaje w obrębie zaznaczenia. [[Esc]] przerywa wybieranie i zostawia płaszczyznę tam, gdzie była.
- Dwa suwaki obrotu poniżej obracają płaszczyznę wokół pozostałych dwóch osi, do 180° w każdą stronę, do cięcia pod kątem. Można je łączyć.

{{ui:split.apply}} albo [[Enter]] wykonuje cięcie, [[Esc]] anuluje (podczas wybierania ściany pierwsze [[Esc]] tylko przerywa wybieranie). Każdy obiekt, który przecina płaszczyzna, staje się dwiema zamkniętymi bryłami, nazwanymi według swojej strony, na przykład „Prostopadłościan (Z+)” i „Prostopadłościan (Z-)”. Obiekty, których nie przecina, zostają bez zmian. Otwór staje się dwoma otworami, a wydrążona bryła zachowuje swoją wnękę. Obie połowy zostają tam, gdzie były. Do druku połóż każdą na ścianie cięcia przez {{ui:editor.tool.layFlat}}.

{{ui:split.connectors}} znów ustawiają połówki, tak jak robią to narzędzia cięcia w PrusaSlicerze, OrcaSlicerze i Bambu Studio. Przy {{ui:split.connectors.none}}, ustawieniu domyślnym, podział przebiega jak opisano wyżej. {{ui:split.connectors.dowels}} robią otwór w każdej połówce i luźne kołki, które wchodzą w obie: kołki pojawiają się jako trzecia bryła, stojąca obok połówek na ich podstawie, do druku razem z nimi: na stojąco wychodzą w warstwach okrągłe jak ich otwory, a właśnie to mierzy test pasowania. {{ui:split.connectors.plugs}} stawiają okrągłe czopy na połówce, której nazwa kończy się minusem, a otwory na nie robią w drugiej połówce. Łączniki wchodzą prostopadle do płaszczyzny, jakkolwiek jest obrócona, każdy ze swoją średnicą i 1,2 mm materiału do każdej krawędzi powierzchni cięcia, a dwa z nich dwa razy dalej od siebie. Każdy osobny kawałek powierzchni cięcia dostaje własne, równo rozłożone: {{ui:split.connectorCount}} mówi ile, a 0 zostawia to wielkości kawałka, co najmniej dwa. Kawałek za mały nawet na jeden nie dostaje żadnego, a łącznik jest pomijany tam, gdzie połówka jest cieńsza, niż głęboki jest jego otwór; panel mówi o tym przed podziałem, a białe pierścienie na płaszczyźnie pokazują, gdzie trafią. Jeśli nie mieści się żaden, części są dzielone bez nich, a pasek stanu o tym informuje.

- {{ui:split.connectorDiameter}} to średnica kołków i czopów, na początek 5 mm.
- {{ui:split.connectorDepth}} to, jak głęboko każdy otwór wchodzi w swoją połówkę. Kołek ma dwa razy tyle minus 0,6 mm długości, a czop jest o 0,3 mm krótszy od swojego otworu, żeby nigdy nie stały na dnie otworu i połówki domykały się całkiem. Kołki i czopy mają na końcach małą fazkę, a każdy otwór jedną u wlotu, żeby rozlana pierwsza warstwa go nie zwężała.
- {{ui:split.connectorClearance}} to miejsce między kołkiem lub czopem a jego otworem. Gdy zmierzysz luz swojej drukarki testem pasowania (w rozdziale o drukowaniu), zaczyna się od niego, w przeciwnym razie od 0,2 mm.

{{ui:split.connectors.dovetail}} trzyma połówki razem bez kleju, jak cięcie na jaskółczy ogon w OrcaSlicerze: listwa, która rozszerza się w miarę oddalania od powierzchni cięcia, stoi na połówce, której nazwa kończy się minusem, i biegnie prosto przez powierzchnię cięcia od krawędzi do krawędzi; druga połówka dostaje pasujący rowek, otwarty na obu końcach. Wsuń połówki jedna w drugą z boku, wzdłuż listwy; potem nie da się ich już rozdzielić w poprzek cięcia. Listwy biegną wzdłuż dłuższego boku powierzchni cięcia, a gdy bryła przecina płaszczyznę w kilku kawałkach, na wszystkich biegną w tę samą stronę, żeby połówkę nasunąć jednym ruchem. {{ui:split.connectorCount}} to liczba listew obok siebie na każdym kawałku; 0 zostawia to szerokości kawałka, jedna na każde sześć szerokości listwy, co najmniej jedna. Obok swojej szerokiej góry listwa zachowuje połowę własnej szerokości i jeszcze 1,2 mm materiału do krawędzi powierzchni cięcia, a dwie listwy dwa razy tyle od siebie. Kawałek za wąski na listwę albo za krótki wzdłuż niej nie dostaje żadnej, a listwa odpada tam, gdzie druga połówka jest cieńsza, niż głęboki jest jej rowek. Białe obrysy na płaszczyźnie pokazują, gdzie się znajdą: wypełniony pas to stopa listwy, linia wokół niego to jej szeroka góra.

- {{ui:split.dovetailWidth}} to szerokość listwy tam, gdzie wychodzi z powierzchni cięcia, na początek 6 mm.
- {{ui:split.dovetailDepth}} mówi, jak daleko wystaje z powierzchni cięcia w drugą połówkę, na początek 4 mm. Rowek jest o 0,3 mm głębszy, żeby połówki całkiem się zamknęły.
- {{ui:split.dovetailAngle}} mówi, jak bardzo każdy bok odchyla się na zewnątrz od prostopadłej do powierzchni cięcia, od 5° do 30°, na początek 15°. Im większy, tym szersza góra listwy i tym mocniej trzyma.
- {{ui:split.dovetailTurn}}: 0 kładzie listwy wzdłuż, 90 w poprzek powierzchni cięcia, a kąt pośredni obraca je o tyle.
- {{ui:split.connectorClearance}} to miejsce z każdej strony między listwą a jej rowkiem, z twojego testu pasowania jak przy kołkach. Końce listwy są sfazowane dookoła, żeby trafiła w rowek, a rowek ma fazę przy wejściu.

Do druku połóż połówkę z rowkiem na jej powierzchni cięcia, a połówkę z listwą drukuj odwrotnie, powierzchnią cięcia do góry: boki listwy odchylają się wtedy na zewnątrz tylko o swój kąt, co drukuje się bez podpór.

Obiekty-otwory dzieli się bez łączników.

Połowy są zwykłymi siatkami: ustawienia takie jak liczba boków walca albo napis tekstu znikają, więc ustaw je wcześniej. [[Ctrl]]+[[Z]] przywraca oryginał jednym krokiem. Zablokowanych i ukrytych obiektów nie da się podzielić.

Zaimportowana siatka potrzebuje zamkniętej powierzchni, żeby dało się ją podzielić, zgrupować albo przyciąć. Jeśli ma otwory, na przykład niezamknięte oczy figurki albo pęknięcie w skanie, layerling najpierw zamyka je płaską zaślepką i mówi, ile ich zamknął. Zamyka małe otwory i płaskie otwory dowolnej wielkości. Duży otwór o wygiętym brzegu zostawia Tobie i informuje o tym komunikat. Zamknij go w programie, z którego pochodzi model, albo narzędziem do naprawy siatek i zaimportuj ponownie.

## Rozdzielanie części

Jeśli kształt składa się z kilku oddzielnych kawałków, na przykład tekst z pojedynczych liter, {{ui:inspector.separateParts}} dzieli go na niezależne kształty. Ta pozycja jest też w menu otwieranym prawym kliknięciem na kształcie.

> **Wskazówka:** Zawsze rób otwory trochę dłuższe niż część, przez którą mają przejść. Jeśli otwór kończy się dokładnie na równo ze ścianą, czasem zostaje cieniutka błonka. Milimetr zapasu załatwia sprawę.
