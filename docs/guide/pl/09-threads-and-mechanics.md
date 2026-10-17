---
title: Gwinty, koła zębate i inne części
summary: Śruby, nakrętki i otwory gwintowane, które do siebie pasują, a także koło zębate, sprężyna, wygięta rura, jaskółczy ogon, otwór łezkowy, pogłębienie walcowe i stożkowe.
---

Oprócz kształtów podstawowych biblioteka zawiera części, których samodzielne składanie byłoby żmudne. Wszystkie można potem zmieniać w ich ustawieniach.

## Gwinty

Wybierz {{ui:shape.thread}} w bibliotece kształtów. W {{ui:inspector.threadRole}} decydujesz, czym ma być:

- **{{ui:thread.rod}}:** walec z gwintem, na przykład śruba bez łba.
- **{{ui:thread.screw}}:** z łbem. Wybierasz {{ui:inspector.threadHead}}: {{ui:thread.headCylinder}}, {{ui:thread.headCountersunk}} albo {{ui:thread.headHex}}.
- **{{ui:thread.nut}}:** pasująca nakrętka.
- **{{ui:thread.bore}}:** otwór z gwintem wewnętrznym. Jest otworem. Wsuń go w część, zgrupuj oba, a część będzie miała gwint wewnętrzny.

![Śruba z łbem walcowym. Po prawej: rodzaj i kształt łba, niżej rozmiar, skok i zarys.](shot:thread-screw)

Rozmiar wybierasz w {{ui:prop.threadSize}} z listy: metryczne od M2 do M12, calowe UNC i UNF od No. 4 do 1 cala oraz gwinty rurowe od G1/16 do G4. Jeśli wybierzesz {{ui:thread.customSize}}, sam ustawiasz {{ui:prop.diameter}} i {{ui:prop.pitch}}. Dla rozmiaru calowego albo G pole pyta o {{ui:prop.threadsPerInch}} zamiast skoku w milimetrach.

Lista grupuje rozmiary według serii, a wiersz pod polem nazywa serię wybranego rozmiaru, z przykładami znanymi z codziennego życia:

- **M, metryczny zwykły:** gwint metryczny zwykły ISO według ISO 261, jak w standardowych śrubach i nakrętkach.
- **UNC, calowy USA zwykły:** śruba aparatu i statywu to 1/4"-20 UNC (ISO 1222), większe głowice statywów mają 3/8"-16 UNC.
- **UNF, calowy USA drobnozwojny:** te same średnice co UNC z drobniejszym skokiem (ASME B1.1).
- **G, gwint rurowy:** wąż prysznicowy łączy się na G1/2, wąż doprowadzający wodę do pralki na G3/4. Kran ogrodowy kończy się na G3/4, mniejsze krany na G1/2. Tam wkręca się przyłącze szybkozłączki węża ogrodowego.

Rozmiary G to walcowe gwinty rurowe Whitwortha według ISO 228-1, spotykane w złączkach do wody, gazu, hydrauliki i pneumatyki. Rozmiar określa rurę, a nie gwint: G1 ma na gwincie 33,249 mm średnicy. Wybór rozmiaru G ustawia zarys {{ui:thread.profileWhitworth}}, a wybór rozmiaru metrycznego albo calowego przywraca {{ui:thread.profileV}}. Zarys {{ui:thread.profileTrapezoidal}} albo {{ui:thread.profileRound}}, który wybrałeś sam, zostaje. Norma określa tylko gwint, więc łeb śruby i nakrętka na rozmiarze G dostają te same proporcje co na średnicy ustawionej samodzielnie. Stożkowych gwintów rurowych R, Rc i Rp nie ma.

Więcej ustawień:

- **{{ui:prop.threadHand}}:** {{ui:thread.right}} albo {{ui:thread.left}}.
- **{{ui:prop.threadProfile}}:** {{ui:thread.profileV}} to standardowy zarys gwintów metrycznych i calowych, {{ui:thread.profileWhitworth}} to zarys gwintów rurowych G: 55° z zaokrąglonymi wierzchołkami i dnami. {{ui:thread.profileTrapezoidal}} i {{ui:thread.profileRound}} mają płaskie wierzchołki i dna. Zwykle drukuje się to pewniej, bo nie powstają cienkie ostrza.
- **{{ui:thread.profileCustom}}:** trapez kształtowany samodzielnie, z płaskim wierzchołkiem i płaskim dnem tej samej szerokości. {{ui:prop.threadFlankAngle}} to kąt między dwoma bokami zwoju: 60° to ostry gwint trójkątny, 30° gwint trapezowy, a przy 90° lub mniej żaden bok nie jest bardziej płaski niż 45°, więc gwint drukuje się bez podpór. {{ui:prop.threadDepth}} i {{ui:prop.threadCoreDiameter}} to jeden wymiar wyrażony na dwa sposoby: średnica rdzenia to średnica minus dwie głębokości, a zmiana jednego zmienia drugie. Nowy własny zarys zaczyna z głębokością gwintu trójkątnego przy 60°. Głębokość ma granice zależne od kąta i skoku: nie płycej niż jedna dziesiąta skoku, nie głębiej niż 40 % średnicy i nie tak głęboko, żeby oba boki zajęły więcej niż dziewięć dziesiątych skoku. Jeśli zmienisz skok, głębokość zmienia się proporcjonalnie, a jeśli przeskalujesz gwint, także. Luz i fazki działają jak przy innych zarysach. Przez most MCP zarys to `custom` z `threadFlankAngle` i `threadDepth`.
- **{{ui:prop.clearance}}:** dla nakrętki i otworu gwintowanego, miejsce, które sprawia, że wydrukowana para naprawdę się obraca. Im mniej dokładnie pracuje drukarka, tym więcej luzu potrzebuje para. To dodatkowe miejsce na całej średnicy, a szczelina między bokami gwintu trójkątnego to tylko około połowy tej wartości, więc wydrukowana para potrzebuje więcej, niż można by się spodziewać: nowe nakrętki zaczynają od 0,4 mm, 0,3 to ciasno, a 0,5 luźno. Najpierw wydrukuj parę próbną. Pręty i śruby mają tu własny luz, który pocienia trzpień o tyle na średnicy. Jest ustawiony na 0. To, która strona dostaje miejsce, zależy od tego, co łączysz:
  - **Wydrukowana śruba i wydrukowana nakrętka:** zostaw śrubę na 0 i daj miejsce nakrętce (0,4 mm, od których zaczyna).
  - **Prawdziwa śruba w wydrukowanej nakrętce albo otworze gwintowanym:** wydrukowana strona bierze całość, więc nakrętka zachowuje swoje 0,4 mm. Jeśli śruba się chwieje, warto wypróbować ciaśniejsze 0,3 mm.
  - **Wydrukowana śruba w prawdziwej nakrętce:** prawdziwa nakrętka nie ma luzu, więc śruba musi być cieńsza: tu od 0,3 do 0,4 mm, tyle, ile miałaby wydrukowana nakrętka.
- **{{ui:prop.axialClearance}}:** dla nakrętki i otworu gwintowanego, luz wzdłuż osi, ponad {{ui:prop.clearance}}. Każdy zwój nakrętki staje się o tyle cieńszy, a średnica zostaje bez zmian. Powód: {{ui:prop.clearance}} działa tylko na średnicę i otwiera boki gwintu trójkątnego mniej więcej do 0,58 swojej wartości. Kto chce mieć powietrze między bokami, musi szeroko otworzyć średnicę i dostaje za to luz na boki. Luz wzdłuż osi rozdziela te dwie rzeczy. Jest ustawiony na 0, więc zapisany gwint się nie zmienia, i sięga najwyżej jednej piątej skoku, bo powyżej nic nie zostałoby ze zwojów nakrętki. Pole istnieje tylko dla nakrętki i otworu gwintowanego, a pręt i śruba mają własny luz. Więcej niżej w części „Gwinty do druku 3D”.
- **{{ui:prop.threadChamferTop}}, {{ui:prop.threadChamferBottom}}, {{ui:prop.headChamfer}} i {{ui:prop.rimChamfer}}:** fazki na końcach, żeby gwint czysto się zaczynał, a łeb nie miał ostrej krawędzi. Każdy koniec pręta, nakrętki albo otworu gwintowanego ma własną fazkę, więc górna może być długa, a dolna krótka albo żadna. Śruba ma tylko jedną, na końcu, opisaną jako {{ui:prop.chamfer}}. Na nakrętce albo otworze gwintowanym fazka to miejsce, o które wlot otwiera się ponad średnicę zewnętrzną. Stożek biegnie pod kątem 45 stopni aż do rdzenia gwintu, więc na średnicy zewnętrznej nie zostaje żaden stopień.

Przełączenie gwintu między {{ui:thread.rod}} a {{ui:thread.bore}} zachowuje jego długość. Nakrętka i śruba zaczynają od swoich wymiarów standardowych.
- **{{ui:prop.quality}}:** jak dokładnie liczony jest gwint. Wyżej to dokładniej, ale wolniej.

Drukowane gwinty to osobny temat. Zanim wydrukujesz dużą część, zrób najpierw próbną parę śruby i nakrętki i dopasuj luz do swojej drukarki.

## Gwinty do druku 3D

Wydrukowany gwint potrzebuje powietrza w dwóch miejscach, a działają one różnie:

- **Luz na średnicy ({{ui:prop.clearance}}):** poszerza nakrętkę. Śruba ma wtedy połowę wartości jako powietrze po każdej stronie, 0,2 mm przy 0,4 mm. Gwint obraca się lekko, ale śruba może chwiać się na boki.
- **Luz wzdłuż osi ({{ui:prop.axialClearance}}):** pocienia zwoje nakrętki. Śruba może wtedy przesuwać się wzdłuż osi tam i z powrotem o tę wartość, gdy nie jest dokręcona. Nie ma za to dodatkowego powietrza na boki.

Razem dają szczelinę między bokami: około 0,58 luzu na średnicy plus luz wzdłuż osi. Przykład dla szczeliny 0,3 mm: dawniej trzeba było 0,5 mm na średnicy, czyli 0,25 mm powietrza po każdej stronie. Teraz wystarczy 0,2 mm na średnicy (0,1 mm po każdej stronie) i 0,2 mm wzdłuż osi, a szczelina wynosi 0,32 mm.

**Skutki, o których warto wiedzieć**

- **Śruba ma luz wzdłuż osi.** Bez obciążenia może przesuwać się tam i z powrotem o tę wartość. Przy mocowaniach, pokrywkach i obudowach to nie ma znaczenia. Przy śrubie pociągowej, która musi dokładnie pozycjonować, ma, więc tam zostaw go małym albo na 0.
- **Zwoje nakrętki są cieńsze.** Przy 0,3 mm i skoku 1,75 mm każdy zwój jest w połowie wysokości prawie o jedną trzecią cieńszy, a więc wyraźnie słabszy. Do mocno obciążonych części weź zamiast tego grubszy gwint.
- **Więcej liczenia.** Kształt zwoju dostaje dodatkowe punkty, więc gwint ma więcej trójkątów i liczy się trochę dłużej.
- **Brak prawdziwego łuku w eksporcie STEP dla zarysu Whitwortha.** Gwint {{ui:thread.profileWhitworth}} z luzem wzdłuż osi trafia do narzędzia krawędzi i eksportu STEP jako kształt zwoju z prostych odcinków, a nie z prawdziwymi łukami. Przy 0 wszystko zostaje jak wcześniej.

**Wskazówki**

1. **Najpierw para próbna.** Śruba i nakrętka, każda tylko na 4 do 6 mm wysokości, zajmują kilka minut. Wydrukuj obok siebie trzy pary z różnym luzem i weź tę, która obraca się lekko i się nie chwieje.
2. **Zacznij od wartości, które często pasują.** Luz na średnicy od 0,2 do 0,3 mm i luz wzdłuż osi 0,2 mm. Jeśli śruba chwieje się na boki, zmniejsz luz na średnicy. Jeśli się zacina, zwiększ luz wzdłuż osi. Jeśli wolisz obejść się bez luzu wzdłuż osi, użyj jak dawniej 0,4 mm na średnicy.
3. **Luz wzdłuż osi powinien wynosić co najmniej jedną wysokość warstwy.** Czegoś poniżej jednej warstwy drukarka nie rozróżni. Przy wysokości warstwy 0,2 mm dobrym początkiem jest 0,2 mm, a przy 0,1 mm wystarczy mniej.
4. **Drukuj śrubę i nakrętkę pionowo.** Oś wskazuje w górę, więc każdy zwój leży w całych warstwach, a boki wychodzą czyste. Na leżąco boki opadają.
5. **Drobne skoki są trudne.** Poniżej około 1 mm skoku zwoje często się zlewają. Grubszy gwint albo zarys {{ui:thread.profileTrapezoidal}} z płaskimi wierzchołkami drukuje się pewniej niż drobny gwint trójkątny.
6. **Unikaj cienkich ostrzy.** Gwint trójkątny ma wąski wierzchołek, który drukarka ledwie trafia szerokością dyszy. Zarysy {{ui:thread.profileTrapezoidal}} i {{ui:thread.profileRound}} mają bardziej płaskie zwoje.
7. **Oczyść i dotrzyj.** Pierwsze zwoje często idą ciężko, bo na bokach stoją drobne pozostałości wydruku. Pokręć kilka razy tam i z powrotem, a pójdzie lżej. Fazka na początku pomaga w nakręcaniu.
8. **Inna drukarka albo filament.** Luz zależy od drukarki, materiału i dyszy. Gdy zmienisz któreś z nich, wydrukuj parę próbną ponownie.

Narzędzie krawędzi bierze gwint jako jego dokładną bryłę. Możesz sfazować albo zaokrąglić część, która go niesie, z gwintem już na miejscu, albo obrzeża łba śruby, zobacz [Łamanie krawędzi i drążenie brył](chapter:edges-and-hollowing). Wyliczenie krawędzi gwintu trwa chwilę: kilka sekund dla M6, około pół minuty dla gwintu rurowego G1/2. Najszybszy sposób na złamanie krawędzi łba śruby to nadal fazka łba we właściwościach.

## Koła zębate

{{ui:shape.gear}} występuje jako {{ui:gear.spur}}, {{ui:gear.helical}}, {{ui:gear.herringbone}} i {{ui:gear.bevel}}, a także jako {{ui:gear.internal}} i {{ui:gear.rack}} (niżej). Nowe koła mają w {{ui:prop.gearProfile}} ustawiony zarys {{ui:gear.profileInvolute}}: zęby z bokami ewolwentowymi, jakich używają generatory kół i technika. Takie zęby czysto toczą się po sobie. Ustawiasz liczbę {{ui:prop.teeth}} i {{ui:prop.gearModule}}, a rozmiar wynika z tego: średnica zewnętrzna to moduł × (zęby + 2), a średnica podziałowa moduł × zęby. Nowe koła zaczynają od modułu 2. Dwa koła zazębiają się, gdy mają ten sam moduł i ten sam {{ui:prop.gearPressureAngle}} (zwykle 20°), a ich środki stoją w odległości (zęby + zęby) × moduł / 2. Zaznacz oba koła, a panel właściwości poda tę odległość osi i to, jak daleko od siebie są teraz środki. Jeśli ząb trafia wtedy na ząb zamiast na wrąb, obróć jedno z kół o pół zęba, czyli o 180° podzielone przez liczbę jego zębów. {{ui:prop.gearBacklash}} zabiera trochę z zębów, żeby wydrukowana para się nie zakleszczała. Wartość dotyczy pary, a każde koło bierze połowę. Dobrym początkiem jest 0,2 mm, a 0 daje dokładne koło. Poniżej koła zasadniczego bok biegnie prosto w dół do dna i nie jest podcięty, jak zrobiłoby to narzędzie. To pasuje do druku, ale bardzo mały zębnik poniżej około 17 zębów może lekko trzeć u podstawy.

Koło o zębach skośnych dodaje {{ui:prop.helixAngle}}. Przy zębach ewolwentowych to prawdziwy kąt pochylenia linii zęba na kole podziałowym: dwa koła o zębach skośnych zazębiają się, gdy mają ten sam moduł i ten sam kąt, jedno dodatni, a drugie ujemny. {{ui:gear.herringbone}} to dwie skośne połówki skręcające w przeciwne strony: zęby biegną w jedną stronę do połowy wysokości, a potem z powrotem, jak strzałka. Przy druku 3D ma to dwie zalety: koło samo centruje się na wale i nie ma siły osiowej, bo siły obu połówek się znoszą. Koło o zębach skośnych pcha natomiast w bok, wzdłuż swojej osi. {{ui:prop.helixAngle}} i {{ui:prop.helixQuality}} ustawiasz jak dla koła o zębach skośnych, a kąt dotyczy każdej połówki. Dwa koła daszkowe zazębiają się, gdy mają ten sam moduł i ten sam kąt z przeciwnym znakiem, jedno dodatni, a drugie ujemny. Na środku nie ma rowka, jak na frezowanych kołach daszkowych: obie połówki przechodzą w siebie bez stopnia. Narzędzie krawędzi i eksport STEP biorą koło daszkowe jako siatkę trójkątów, a nie jako dokładną bryłę.

Koło stożkowe bierze zęby ewolwentowe i zmniejsza je ku górze. To przybliżenie, a nie dokładnie wyliczona para stożkowa.

{{ui:gear.profileRound}} to okrągłe zęby z łuków, jak w kole Useful gear z Tinkercada: wierzchołek i wrąb przechodzą w siebie bez narożnika. Małe koła drukują się w ten sposób wyrozumialej i obracają lżej, a na pokrętle zęby dają przyjemny chwyt. Zęby okrągłe ustawiają też {{ui:prop.teeth}}, {{ui:prop.gearModule}} i {{ui:prop.gearBacklash}}. Nie mają kąta przyporu. Są niższe od ewolwentowych, więc średnica zewnętrzna to moduł × (zęby + 1,2). Okrągłe koła o tym samym module zazębiają się, przy tej samej odległości osi co ewolwentowe. Z kołem ewolwentowym nie pasują.

{{ui:gear.profileSimple}} to proste zęby, jakie miało dotąd każde koło. Tam ustawiasz {{ui:prop.toothSize}} i {{ui:prop.toothWidth}} ręcznie. Starsze projekty zachowują je, dopóki nie zmienisz kształtu zęba. Wszystkie trzy kształty zębów mają {{ui:prop.centerHole}}.

{{ui:gear.internal}} ma zęby skierowane do środka: pierścień, w którym pracuje mniejsze koło, jak zewnętrzne koło przekładni planetarnej. Ustawiasz go jak koło ewolwentowe albo okrągłe przez {{ui:prop.teeth}}, {{ui:prop.gearModule}} i {{ui:prop.gearBacklash}}, a do tego {{ui:prop.gearRim}}, czyli pierścień poza zębami. Jego średnica zewnętrzna to moduł × (zęby + 2,5) plus dwa razy wieniec, przy zębach okrągłych moduł × (zęby + 1,7). Koło o tym samym module pracuje w nim, gdy jego środek stoi w odległości (zęby wieńca − jego zęby) × moduł / 2 od środka wieńca. Zaznacz oba, a panel właściwości poda tę odległość. W przekładni planetarnej zęby wieńca = zęby koła słonecznego + 2 × zęby satelity, na przykład 30 = 12 + 2 × 9. Wieniec zębaty nie ma otworu środkowego, bo sam jest pierścieniem. Między 26 a 33 zębami jego wierzchołki są nawet o ćwierć modułu krótsze, bo inaczej na kole zasadniczym powstałaby drobna krawędź. Na zazębienie nie ma to wpływu.

{{ui:gear.rack}} to koło o nieskończonym promieniu: listwa z zębami wzdłuż jednego boku, której boki przy zębach ewolwentowych są prostymi pod kątem przyporu. Jej szerokość (wzdłuż X) to zęby × podziałka, gdzie podziałka to π × moduł, więc zębatki o jednym module łączą się końcami, a każdy koniec wypada we wrębie. Jej długość (wzdłuż Y) to grubość listwy i jest dowolna, o ile zmieszczą się zęby i pół milimetra listwy. Zęby wskazują do przodu, w stronę patrzącego z widoku początkowego. Obróć zębatkę tak, jak potrzebujesz. Koło o tym samym module toczy się po niej, gdy jego środek stoi w odległości jego zęby × moduł / 2 przed linią podziałową. Linia podziałowa leży jeden moduł za wierzchołkami zębów, przy zębach okrągłych 0,6 modułu. Wieniec zębaty i zębatka występują z zębami ewolwentowymi i okrągłymi, a nie z prostymi. Zmiana rodzaju koła zachowuje moduł.

Narzędzie krawędzi i eksport STEP biorą każde koło jako jego dokładną bryłę, a boki ewolwentowe jako gładkie krzywe. Koło o zębach skośnych na owalnej podstawie zostaje siatką trójkątów, podobnie koło o zębach skośnych z zębami ewolwentowymi od około 31 zębów. Małe zęby ograniczają, jak mocno można zaokrąglić krawędzie: na kole o prostych zębach, o średnicy 30 mm i 12 zębach, płaski odcinek między dwoma zębami u podstawy ma tylko około 0,65 mm szerokości, więc zaokrąglenie wszystkich krawędzi działa do około 0,5 mm, a na kole stożkowym, którego góra jest mniejsza, do około 0,4 mm. Zęby koła o zębach skośnych są pochylone, co zwęża ten płaski odcinek na skośnych krawędziach: im większy kąt pochylenia w stosunku do wysokości koła, tym mniejsze zaokrąglenie się mieści. Krawędzie obu płaskich końców można zaokrąglić, ale samo fazowanie tych krawędzi nie udaje się w jądrze CAD. Zaokrąglij je albo sfazuj wszystkie krawędzie razem w mniejszym rozmiarze, na przykład 0,2 mm.

## Sprężyny

{{ui:shape.spring}} ma {{ui:prop.turns}} i {{ui:prop.wire}}. Razem z wysokością decydują, jak miękka jest sprężyna. {{ui:prop.springHand}} ustawia, w którą stronę biegnie drut: {{ui:spring.right}}, jak zwykła sprężyna naciskowa, albo {{ui:spring.left}}.

Narzędzie krawędzi i eksport STEP biorą sprężynę jako jej dokładną bryłę: okrągły drut wzdłuż linii śrubowej, ucięty prostopadle na obu końcach. Możesz na przykład zaokrąglić albo sfazować te dwa końce drutu.

## Wygięte rury

{{ui:shape.bentTube}} składa się z maksymalnie dwunastu odcinków: prostego kawałka, po którym następuje łuk. Dla każdego ustawiasz {{ui:prop.bentTubeSegmentLength}}, {{ui:prop.bentTubeBendAngle}}, {{ui:prop.bentTubeBendRadius}} i {{ui:prop.bentTubeRoll}}. Edytowany odcinek jest podświetlony na rurze na pomarańczowo, więc łatwo śledzić kolejność. Kąt obrotu 0° gnie w płaszczyźnie roboczej, przy 90° rura gnie się w górę. Profil może być okrągły, kwadratowy, sześciokątny albo ośmiokątny, wnętrze tak samo, albo całkiem pełny. Jeśli rura wchodzi sama w siebie, layerling ostrzega.

## Przejście profili

{{ui:shape.loft}} łączy jeden kontur na dole z innym na górze, jak loft w Fusion: redukcja węża z jednej średnicy na drugą, kwadratowy wentylator na okrągły kanał, podstawka, która ku górze robi się okrągła. Dla każdego końca wybierasz {{ui:prop.loftBottomOutline}} i {{ui:prop.loftTopOutline}}: {{ui:loft.round}}, {{ui:loft.rectangle}} z {{ui:prop.loftBottomCorner}} albo {{ui:loft.polygon}} z liczbą narożników, a do tego szerokość i długość każdego końca oraz wysokość. {{ui:prop.loftOffsetX}} i {{ui:prop.loftOffsetZ}} przesuwają górny koniec w bok, dla skośnego przejścia. Dolny koniec zostaje na miejscu.

{{ui:prop.loftWall}} zmienia pełną bryłę w rurę otwartą u góry i na dole. Otwór jest na obu końcach mniejszy o ściankę, mierzoną w poprzek. Tam, gdzie ścianka jest skośna, jest trochę cieńsza. Przeciągnij ramkę, żeby była większa, a oba końce urosną, podczas gdy promień narożników i ścianka zachowają rozmiar.

{{ui:prop.loftSmooth}} sprawia, że przejście jest płynne. Przy 0 boki biegną prosto od dołu do góry, jak w stożku. Przy 100 wychodzą z obu końców pionowo i zmieniają rozmiar pomiędzy nimi po krzywej w kształcie S: redukcja węża, która płynnie przechodzi z wąskiej rury w szeroką, zamiast biec jak lejek. Pomiędzy suwak miesza oba warianty. Płynne przejście działa razem z {{ui:prop.loftWall}}, skrętem, pochyleniem i przesunięciem w bok. Rura ze ścianką zostaje otwarta na obu końcach. To dokładna bryła, jak prosta wersja, więc jej krawędzie można fazować i zaokrąglać, ale jest budowana z kilku przekrojów i liczy się trochę dłużej.

{{ui:prop.loftTwist}} obraca przekrój równomiernie wokół pionu w drodze do góry, do 360° w każdą stronę. Boki wiją się wtedy dookoła. {{ui:prop.loftTiltX}} i {{ui:prop.loftTiltZ}} pochylają górny koniec, do 45°: wartość dodatnia podnosi jego przednią krawędź albo prawy bok. Przekroje pośrednie pochylają się proporcjonalnie, więc ścianka płynnie przechodzi w skos. Najwyższy punkt zostaje na ustawionej wysokości. Jeśli wysokość stanie się później tak mała, że skośny koniec sięgnąłby pod płytę, pochylenie ustępuje, aż wszystko się zmieści. Wygięcie wzdłuż ścieżki, jak kolano rury, to nie zadanie dla przejścia profili.

Przejście profili jest dokładną bryłą, także skręcone i pochylone: jego krawędzie można fazować i zaokrąglać, a eksport STEP je zachowuje. Dodaj jak zwykle kołnierz z otworami na śruby i zgrupuj.

## Gridfinity

Kształt {{ui:shape.gridfinity}} tworzy części do otwartego systemu przechowywania Zacka Freedmana: pojemniki na siatce 42 mm, które stoją w podstawce i układają się jeden na drugim. Wymiary są zgodne z opublikowaną specyfikacją Gridfinity, więc pojemnik z layerling pasuje do podstawki zrobionej innym generatorem, i odwrotnie. W {{ui:prop.gridfinityType}} wybierasz:

- **{{ui:gridfinity.bin}}:** pojemnik ze stopką pod każdą jednostką siatki. {{ui:prop.gridfinityUnitsX}} i {{ui:prop.gridfinityUnitsZ}} liczą jednostki siatki po 42 mm (pojemnik jest o 0,5 mm mniejszy, 41,5 mm na jedną jednostkę), a {{ui:prop.gridfinityUnitsY}} liczą jednostki wysokości po 7 mm, do 20. {{ui:prop.gridfinityLip}} na górze ścianki trzyma stopki następnego pojemnika i podwyższa pojemnik o 4,4 mm: pojemnik na 3 jednostki z kołnierzem ma 25,4 mm wysokości. Z {{ui:prop.gridfinityMagnets}} każda stopka dostaje w każdym narożniku otwór na magnes 6 × 2 mm.
- **{{ui:gridfinity.baseplate}}:** płytka, w której stoją pojemniki, o wysokości 5 mm, z gniazdem na każdą jednostkę siatki. To otwarta rama bez dna i bez otworów na magnesy.

Rozmiar to zawsze całe jednostki siatki, do 6 × 6 (252 mm, co mieści się na stole 256 mm). Przeciągnięcie uchwytu przyciąga się do najbliższej jednostki. Ścianka (0,95 mm), dno (1,2 mm) i głębokość otworów na magnesy (2,4 mm) nie są w specyfikacji i są stałe. Otworów na śruby M3 ze specyfikacji program nie robi. Góra kołnierza jest ostra, tak jak rysuje ją specyfikacja. Jeśli drukarka zostawia ją postrzępioną, zaokrąglij albo sfazuj ją narzędziem krawędzi. Pojemnik i podstawka są dokładnymi bryłami, więc działają na nich zaokrąglenie, fazowanie i eksport STEP. Aby podzielić pojemnik, zgrupuj w nim cienkie prostopadłościany jako przegródki: postaw je na dnie, 5,95 mm wyżej, a w pojemniku z kołnierzem trzymaj ich górę co najmniej 0,5 mm poniżej 7 mm na jednostkę wysokości, mierząc od spodu pojemnika (20,5 mm dla 3 jednostek), bo stopki następnego pojemnika sięgają 0,35 mm w głąb pojemnika. Drukuj pojemniki i podstawki bez podpór, stojące tak, jak są na stole drukarki.

Pojemnik o wysokości co najmniej 3 jednostek może mieć półki na etykiety wzdłuż ścian wewnętrznych: włącz {{ui:prop.gridfinityLabelBack}}, {{ui:prop.gridfinityLabelFront}}, {{ui:prop.gridfinityLabelLeft}} lub {{ui:prop.gridfinityLabelRight}}, w dowolnym połączeniu. Każda włączona półka ma własne {{ui:prop.gridfinityLabelWidth}}, {{ui:prop.gridfinityLabelLength}} oraz, gdy jest krótsza, {{ui:prop.gridfinityLabelOffset}}; ustawienia narożników pod nimi dotyczą wszystkich. Półka jest płaska u góry, na etykietę, z przodu ma prosty pas 1,2 mm, a jej spód wznosi się pod kątem 36 stopni. Jej góra leży 0,85 mm poniżej 7 mm na jednostkę wysokości, mierząc od spodu pojemnika (20,15 mm dla 3 jednostek), więc stopki pojemnika postawionego na kołnierzu mają nad nią 0,5 mm luzu. Pojemnik niższy niż 3 jednostki nie pokazuje półek; od 3 jednostek wracają. Półek na etykiety nie ma w specyfikacji.

{{ui:prop.gridfinityLabelWidth}} mówi, jak daleko półka sięga w głąb pojemnika: 14 mm, najwyżej 17,2 mm w pojemniku na 3 jednostki i 16,8 mm dla dwóch półek naprzeciw siebie w pojemniku głębokim na 1 jednostkę, z narożnikami 2 mm. Przy {{ui:prop.gridfinityLabelLength}} równej 0 półka biegnie od ściany do ściany. Przy krótszej, co najmniej 10 mm, pojawia się {{ui:prop.gridfinityLabelOffset}}, którym przesuwasz ją od środka ściany: na tylnej i przedniej ścianie w prawo, tak jak pokazuje je widok z przodu, a na bocznych do przodu. Koniec, który zbliży się do ściany na mniej niż 1 mm (1,8 mm z kołnierzem, bo jego podpora wchodzi tam do środka) albo kończy się na półce tej ściany, biegnie aż do niej, a dwie półki, które spotykają się w narożniku, łączą się w jedną. Tam, gdzie półka styka się ze ścianą lub inną półką i jest miejsce, narożnik jest zaokrąglony albo sfazowany: wybierz {{ui:gridfinity.labelRound}} lub {{ui:gridfinity.labelChamfer}} w {{ui:prop.gridfinityLabelCorner}}, a rozmiar w {{ui:prop.gridfinityLabelCornerSize}} (2 mm; 0 zostawia go ostrym). Przy {{ui:gridfinity.labelRound}} krótsza półka ma zaokrąglone także przednie narożniki wolnych końców, o ten sam rozmiar, ale najwyżej o połowę swojej szerokości.

## Zawias

{{ui:shape.hinge}} drukuje się w jednym kawałku i potem się porusza (print-in-place): dwa skrzydełka leżące płasko na płycie, otwarte, z naprzemiennymi tulejami na jednej osi między nimi. Sworzeń należy do tylnego skrzydełka i przechodzi z luzem przez tuleje przedniego. Ustawiasz {{ui:prop.hingeLength}}, {{ui:prop.hingeOpenWidth}} i {{ui:prop.hingeKnuckleDiameter}}, a do tego liczbę: {{ui:prop.hingeKnuckles}} (nieparzystą, żeby sworzeń był trzymany na obu końcach), {{ui:prop.hingePinDiameter}} i {{ui:prop.hingeLeafThickness}}.

{{ui:prop.hingeClearance}} to szczelina między ruchomymi częściami: wokół sworznia, między tulejami i przed skrzydełkami. Przy 0,4 mm dobrze ustawiona drukarka zwykle uwalnia się lekkim przekręceniem. Jeśli części się zlewają, zwiększ luz, a jeśli zawias za bardzo się chwieje, zmniejsz go. Drukuj zawias na leżąco, tak jak pojawia się na płycie, bez podpór. Jeśli wolisz użyć własnego sworznia, na przykład kawałka filamentu albo drutu, który w małym zawiasie chodzi gładziej niż wydrukowany, włącz {{ui:prop.hingePinless}}: wydrukowany sworzeń zostaje pominięty, a otwór o średnicy sworznia plus luz przechodzi przez każdą tuleję, także skrajne. Do skrzydełek możesz dodać otwory albo zgrupować je w większą część, na przykład pokrywkę.

## Radełkowanie

{{ui:shape.knurl}} to okrągły uchwyt z rowkami dookoła, na pokrętła, kółka do kręcenia kciukiem i rękojeści narzędzi. W {{ui:prop.knurlPattern}} wybierasz {{ui:knurl.straight}}, czyli rowki wzdłuż osi jak na pokrętle regulacyjnym, {{ui:knurl.diamond}}: dwa skośne rzędy rowków krzyżują się w małe romby, albo {{ui:knurl.round}}: rowki i grzbiety wzdłuż osi jako łagodna fala z łuków, przyjemny chwyt bez ostrych grzbietów. Okrągłe rowki zostają płytsze niż pół podziałki, bo inaczej grzbiety wybrzuszałyby się u podstawy. Zbyt duża głębokość ustępuje. Ustawiasz {{ui:prop.diameter}} i {{ui:prop.height}}, liczbę: {{ui:prop.knurlCount}} i {{ui:prop.knurlDepth}}, a dla radełka krzyżowego także {{ui:prop.knurlAngle}} względem osi. {{ui:prop.knurlChamfer}} łamie oba końce pod kątem 45 stopni, jak na toczonym pokrętle. 0 zostawia je ostre.

Radełko proste i okrągłe to dokładne bryły, więc ich krawędzie można łamać i zaokrąglać. Radełko krzyżowe zostaje siatką, bo jako dokładna bryła z 30 rowkami liczyłoby się prawie minutę. Do pokrętła na wał zgrupuj radełko z otworem, na przykład z kształtem {{ui:shape.thread}} ustawionym jako otwór gwintowany. Rowków płytszych niż 0,4 mm prawie żadna drukarka nie wydrukuje czysto, a layerling nie ustawia ich gęściej niż co 0,8 mm na obwodzie uchwytu: cienki uchwyt dostaje ich mniej.

## Jaskółczy ogon

{{ui:shape.dovetail}} to połączenie, w którym dwie części zazębiają się ze sobą i dają się złożyć tylko przez wsunięcie z boku. Ustawiasz szerokość na szerokim końcu, {{ui:prop.dovetailNeckWidth}} i długość ogona. Skopiuj ogon dla drugiej strony i zmień kopię w otwór: {{ui:prop.dovetailClearance}} daje wtedy trochę luzu, żeby połączenie nie zacinało się po wydruku.

> **Wskazówka:** otwór gwintowany wycina materiał z części, na którą nachodzi przy grupowaniu. Wsuń go więc trochę w materiał, zamiast tylko dotykać powierzchni.

## Otwór łezkowy

Otwór leżący na boku dostaje przy druku most nad górą, a most opada. Dlatego {{ui:shape.teardrop}} ma na górze szpic: każda warstwa opiera się na poprzedniej, a otwór wychodzi wystarczająco okrągły bez podpór. Ustaw {{ui:prop.teardropDiameter}} na rozmiar otworu, około 3,4 mm dla śruby M3, a {{ui:prop.teardropLength}} tak długą, żeby przechodziła przez część. {{ui:prop.teardropTipAngle}} wynosi 90°, więc boki spotykają się pod kątem 45°. Większość drukarek radzi sobie z tym czysto. Bardziej płaski szpic potrzebuje więcej wysokości, bardziej stromy ją oszczędza.

Zmień otwór łezkowy w otwór i zgrupuj go z częścią. Jego długość biegnie wzdłuż głębokości, a szpic wskazuje w górę. Do otworu w drugim kierunku obróć go o 90° wokół osi pionowej.

**Otwór gwintowany** na boku opada u góry w ten sam sposób. Daj mu własną łezkę: dodaj otwór {{ui:shape.teardrop}}, którego {{ui:prop.teardropDiameter}} to rdzeń gwintu, czyli średnica, którą zostawiają wolną jego zwoje (około 8,4 mm dla M10), o tej samej długości co otwór gwintowany, i zaznacz oba. Kliknij {{ui:editor.tool.align}} i ustaw je w jednej linii na środku. Środek otworu łezkowego to środek jego okrągłej części, a nie prostopadłościanu otaczającego razem ze szpicem, więc oba okręgi leżą na sobie. Zgrupuj oba z częścią. Gwint zostaje wycięty jak zwykle, a szpic otwiera górę otworu, więc drukuje się on bez podpór.

## Pogłębienie walcowe i stożkowe

Łeb śruby często nie powinien wystawać. {{ui:shape.counterbore}} wycina okrągłą kieszeń pod śrubę z łbem walcowym z gniazdem (DIN 912), a {{ui:shape.countersink}} stożek pod śrubę z łbem stożkowym (DIN 7991). Oba stoją końcem na łeb do góry: {{ui:prop.screwHoleHead}} to średnica kieszeni albo stożka, {{ui:prop.screwHoleShaft}} to otwór poniżej, a {{ui:prop.screwHoleLength}} to cała długość. Na pogłębieniu walcowym ustawiasz {{ui:prop.screwHoleHeadDepth}}, a na stożkowym {{ui:prop.screwHoleAngle}} (90° pasuje do śrub z łbem stożkowym). Wartości domyślne pasują do śruby M3.

{{ui:shape.doubleCountersink}} to otwór sfazowany z obu stron, do płytki, która ma ładnie wyglądać z przodu i z tyłu: stożek na każdym końcu otwiera się do średnicy {{ui:prop.screwHoleHead}}, z {{ui:prop.screwHoleShaft}} pomiędzy nimi. {{ui:prop.screwHoleAngle}} i {{ui:prop.screwHoleLength}} ustawiasz jak wcześniej. Jeśli otwór jest za krótki na dwa pełne stożki, spotykają się one na środku pod tym kątem, a trzpień zostaje szerszy, niż ustawiłeś: łeb 10 mm, trzpień 6 mm, 90° i długość 2 mm dają dwa stożki od 10 do 8 mm. Jako otwór przebija się go przez część jak inne.

Zmień kształt w otwór i zgrupuj go z częścią. Niech jego górny koniec wystaje trochę ponad powierzchnię, na której ma siedzieć łeb, żeby kieszeń otwierała się czysto. Do gniazda na nakrętkę sześciokątną użyj otworu z kształtu {{ui:shape.polygon}} o sześciu bokach.
