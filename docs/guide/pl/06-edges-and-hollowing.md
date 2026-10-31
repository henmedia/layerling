---
title: Łamanie krawędzi i drążenie brył
summary: Fazowanie i zaokrąglanie wybranych krawędzi, ścianki o równej grubości do pudełek, kubków i obudów.
---

## Fazowanie i zaokrąglanie krawędzi

Ostre krawędzie rzadko dobrze wyglądają na wydrukowanej części i nie są szczególnie wytrzymałe. **Fazka** ścina krawędź pod kątem, **zaokrąglenie** ją zaokrągla. Oba działają na krawędzie, które klikniesz.

1. Zaznacz bryłę (albo grupę).
2. Kliknij na wstążce {{ui:editor.tool.fillet}} albo {{ui:editor.tool.chamfer}}, naciśnij [[B]] dla zaokrąglenia albo [[Shift+B]] dla fazowania, albo kliknij bryłę prawym przyciskiem i wybierz polecenie z menu.
3. Krawędzie bryły się podświetlą. Kliknij te, które mają być obrobione. Kolejne kliknięcie usuwa krawędź z wyboru. Z [[Shift]] dodajesz albo usuwasz pojedynczą krawędź.
4. Ustaw rozmiar i potwierdź przyciskiem {{ui:edge.apply}} albo [[Enter]]. Potem okno zostaje otwarte na nowej bryle z tym samym rozmiarem, więc od razu może nastąpić kolejne zaokrąglenie lub ścięcie; zamyka je {{ui:edge.done}}, [[Esc]] albo krzyżyk. Z [[Shift]] lub [[Ctrl]] kliknięcie {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} lub {{ui:edge.horizontalEdges}} dodaje te krawędzie do wybranych zamiast je zastępować.

![Narzędzie „Zaokrąglenie krawędzi”: wybrane są wszystkie ostre krawędzie, a obraz pokazuje podgląd z promieniem 4 mm.](shot:fillet-preview)

Panel jest w prawym górnym rogu. Jeśli zasłania krawędzie, które chcesz kliknąć, odsuń go za pasek tytułu. Następnym razem otworzy się tam, podobnie jak {{ui:editor.tool.hollow}} i {{ui:editor.tool.array}}. Dwukrotne kliknięcie paska tytułu odkłada go na miejsce.

Wybranie kształtu z biblioteki kształtów, gdy panel jest otwarty, zamyka go bez stosowania czegokolwiek, a kliknięte krawędzie przepadają. Kliknięcie umieszcza wtedy nowy kształt zamiast wybierać krawędzie.

W panelu znajdziesz:

- {{ui:edge.allSharpEdges}} wybiera naraz wszystkie krawędzie, {{ui:edge.clear}} czyści wybór.
- **{{ui:edge.radius}}** dla zaokrąglenia. Dla fazki ustawiasz {{ui:edge.distance}} albo {{ui:edge.angle}}.
- {{ui:edge.variableRadius}} (tylko zaokrąglenie) pozwala promieniowi zmieniać się wzdłuż jednej krawędzi: mały na jednym końcu, większy na drugim, równomiernie pomiędzy, jak tam, gdzie prosta ścianka spotyka skośną. Kliknij jedną krawędź, potem ustaw {{ui:edge.radiusStart}} i {{ui:edge.radiusEnd}}. To, który koniec liczy się jako początek, wynika ze sposobu, w jaki krawędź powstała. Jeśli większy promień wyjdzie na złym końcu, {{ui:edge.swapEnds}} go odwraca. Działa na jednej krawędzi naraz, więc kilka krawędzi zaokrąglaj po kolei. {{ui:edge.editAction}} przywraca obie wartości.
- {{ui:edge.sharpThreshold}} decyduje, które krawędzie w ogóle liczą się jako ostre. Wartość 25° traktuje jako krawędzie tylko wyraźne załamania i pomija łagodne przejścia.
- {{ui:edge.verticalEdges}} wybiera krawędzie stojące pionowo, takie jak narożniki prostopadłościanu: jedno zaokrąglenie zaokrągla wtedy naraz wszystkie pionowe narożniki.
- {{ui:edge.topEdges}} wybiera tylko krawędzie wzdłuż samej góry bryły. To szybka droga do foremki do ciastek: zbuduj kontur w szkicu jako obrys, potem sfazuj górne krawędzie. {{ui:edge.angle}} ustawia, jak stroma jest fazka. Nie może sięgać dalej, niż ścianka jest gruba.
- {{ui:edge.bottomEdges}} wybiera tylko krawędzie wzdłuż samego dołu bryły, lustrzane do {{ui:edge.topEdges}}. To szybka droga, żeby zaokrąglić lub sfazować tylko stopę elementu.
- {{ui:edge.chamfillet}}, wybrane u góry okna fazowania obok {{ui:editor.tool.chamfer}}, tworzy drukowalną stopę elementu: fazę przy płycie, która stycznie przechodzi w zaokrąglenie ku ścianie, dzięki czemu pierwsze warstwy nie potrzebują podpór, a krawędź i tak kończy się miękko. {{ui:edge.distance}} to wysokość, jaką zajmuje stopa, {{ui:edge.angle}} (od 15° do 75°) to stromość fazy przy płycie. Krawędzie wybierasz przyciskiem {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} ukrywa krawędzie, które z Twojego punktu widzenia leżą za bryłą. Domyślnie każda krawędź prześwituje przez bryłę, co na skomplikowanej części robi się nieczytelne. Po włączeniu widzisz i możesz kliknąć tylko krawędzie zwrócone do Ciebie. Obróć widok, żeby dosięgnąć pozostałych. Krawędź narysowana na czerwono (zobacz niżej) jest widoczna zawsze.
- {{ui:edge.tangentChains}}: kliknięcie wybiera wtedy także krawędzie, które płynnie w siebie przechodzą, na przykład wszystkie krawędzie wokół ściany z zaokrąglonymi narożnikami. Ten przełącznik decyduje tylko o tym, co wybiera kliknięcie: jądro CAD i tak zawsze przeciąga fazkę albo zaokrąglenie wzdłuż takich płynnie przedłużających się krawędzi. Panel mówi, na ile kolejnych krawędzi tak się dzieje.
- {{ui:edge.keepSize}} zachowuje fazkę albo zaokrąglenie w obecnym rozmiarze, nawet jeśli później przeskalujesz bryłę.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} albo {{ui:edge.fine}}) decyduje, jak dokładnie liczony jest podgląd. Przy trudnych częściach {{ui:edge.draft}} jest szybsza.

Gdy zmieniasz rozmiar, layerling przelicza podgląd. Może to chwilę potrwać. Możesz dalej zmieniać wartość, a liczona będzie ostatnia wybrana.

Jeśli rozmiar jest za duży dla krawędzi, layerling o tym informuje i proponuje mniejszą wartość. Często wystarczy milimetr albo dwa mniej. Przy ostrych kątach zaokrąglenie potrzebuje więcej miejsca, niż sugeruje jego promień. Na małym ekranie panel sam przewija się w dół, żeby komunikat był widoczny.

Gdy wybór, który działał, przestaje działać po kliknięciu jeszcze jednej krawędzi, ta krawędź robi się czerwona i grubsza: to ona nie daje się obrobić razem z pozostałymi w tym rozmiarze. Kliknij ją ponownie, aby ją wyłączyć, albo zmniejsz rozmiar. Jeśli klikasz kolejne krawędzie, gdy komunikat jest widoczny, pierwsza zostaje czerwona. Gdy nie ma wcześniejszego wyboru, który działał (pierwsze kliknięcie albo rozmiar, który właśnie zwiększyłeś), na czerwono robią się krawędzie, które nie działają nawet same, albo wszystkie, jeśli problemem jest tylko ich połączenie.

Krawędź pod wskaźnikiem też jest rysowana grubiej, więc widać, którą wybierze kliknięcie.

Otwór także przyjmuje {{ui:editor.tool.chamfer}} i {{ui:editor.tool.fillet}}, podobnie jak {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} i {{ui:editor.tool.deleteFace}}: pozostaje otworem i wycina swoim nowym kształtem. Zaokrąglenie czterech pionowych krawędzi otworu w kształcie prostopadłościanu daje kieszeń z zaokrąglonymi narożnikami wewnętrznymi, a otwór powiększony przez {{ui:editor.tool.offset}} wycina z odpowiednio większym luzem. Krawędź, w której otwór styka się z częścią, obrabiaj na gotowej grupie: ta krawędź należy do niej.

### Cofanie obróbki krawędzi

Obrobioną bryłę zawsze można obrobić ponownie. Zaznacz ją znowu i otwórz narzędzie. Zaokrąglenie, Fazowanie i Wydrąż pokazują listę: w {{ui:edge.featureHistory}} widzisz, co już na niej jest. {{ui:edge.revertAction}} cofa pojedynczą obróbkę. Uwaga: jeśli leżą na niej nowsze obróbki, znikają razem z nią, a panel mówi, ile ich jest.

Obok fazki, zaokrąglenia albo wydrążenia jest też {{ui:edge.editAction}}. Cofa obróbkę w ten sam sposób, ale od razu otwiera narzędzie ponownie z tymi samymi krawędziami i starą wartością. Zmieniasz wartość i stosujesz ją znowu: zaokrąglenie 3 mm staje się zaokrągleniem 5 mm bez ponownego klikania krawędzi. Jeśli leżą na niej nowsze obróbki, także tu znikają razem z nią. Dotyczy to obróbek krawędzi wykonanych od teraz. Starsze oferują tylko cofnięcie, podobnie jak pojedyncze części grupy.

Na grupie, na przykład walcu z otworem, obrobiona krawędź należy do gotowej bryły, a nie do jednej z jej części. Grupa staje się więc jedną bryłą. {{ui:editor.tool.ungroup}} nadal na niej działa: najpierw cofa obróbki krawędzi, a potem rozwiązuje grupę, w jednym kroku, który cofa [[Ctrl]]+[[Z]]. Cofnij obróbkę, jak opisano wyżej, a grupa wróci ze wszystkimi częściami. Najprościej obrabiać krawędzie na końcu. Dotyczy to też gwintów: narzędzie krawędzi bierze gwint jako jego dokładną bryłę, więc klocek z otworem gwintowanym dostaje zaokrąglone krawędzie z gwintem na miejscu. Wyliczenie krawędzi gwintu trwa dłużej niż zwykłego kształtu, kilka sekund dla M6 i około pół minuty dla gwintu rurowego G1/2.

> **Warto wiedzieć:** layerling używa do zaokrągleń i fazek prawdziwej geometrii CAD, a nie tylko siatki trójkątów. Dlatego zaokrąglona krawędź pozostaje zaokrągloną krawędzią w eksporcie STEP.

Część zaimportowana jako STEP też zachowuje geometrię CAD: fazowanie, zaokrąglanie i drążenie działają na bryle z pliku, niezależnie od tego, jak dokładnie część jest rysowana na ekranie. STL, OBJ i 3MF niosą tylko trójkąty, a dokładnie narysowana część może być dla narzędzia krawędzi zbyt gęsta. Jeśli część jest dostępna także jako STEP, zaimportuj STEP.

## Drążenie brył

Pudełka, kubki, obudowy i pokrywy mają jedną cechę wspólną: w środku są puste, ze ściankami o równej grubości. Dokładnie to robi {{ui:editor.tool.hollow}}.

1. Zaznacz bryłę i kliknij {{ui:editor.tool.hollow}} albo kliknij bryłę prawym przyciskiem i wybierz polecenie z menu.
2. Ustaw {{ui:shell.wall}}.
3. W {{ui:shell.openings}} włącz strony, które zostają otwarte: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} albo {{ui:shell.side.right}}, ile tylko chcesz. Sam {{ui:shell.side.front}} daje wnękę na szufladę, a {{ui:shell.side.left}} i {{ui:shell.side.right}} tunel. Gdy żadna strona nie jest włączona, bryła zostaje zamknięta ze wszystkich stron, z wnęką w środku. {{ui:shell.side.closed}} wyłącza wszystkie strony jednym kliknięciem. {{ui:shell.side.top}} jest już włączone po otwarciu panelu; kliknięcie go znów zamyka górę. Bryła zamknięta ze wszystkich stron wygląda z zewnątrz bez zmian: wnękę pokazuje widok przekroju.
4. Zdecyduj, czy {{ui:shell.edges}} mają być {{ui:shell.edges.round}}, czy {{ui:shell.edges.sharp}}.
5. Kliknij {{ui:shell.apply}}.

![Panel drążenia z grubością ścianki, przełącznikiem dla każdej strony, która zostaje otwarta, i krawędziami wewnętrznymi.](shot:hollow-panel)

Ścianki rosną do środka. Zewnętrzna strona zostaje bez zmian.

{{ui:shell.edges}} mają znaczenie tylko tam, gdzie wewnętrzne ścianki się rozchodzą, czyli na stopniu bryły albo wokół otworu. Narożniki wnęki zwykłego prostopadłościanu są zawsze ostre, przy obu ustawieniach. Aby uzyskać zaokrąglone wnętrze, najpierw zaokrąglij zewnętrzne krawędzie bryły (zobacz wyżej), a potem ją wydrąż: wnętrze podąży za nimi z promieniem pomniejszonym o grubość ścianki. Jeśli zaokrąglonego wnętrza nie da się zbudować, co może się zdarzyć przy konturze z bardzo wielu krótkich prostych odcinków, na przykład obrysowanym rysunku, layerling buduje zamiast tego tę samą wydrążoną bryłę z ostrymi narożnikami wewnątrz.

![Wynik: skorupa ze ścianką 3 mm, otwarta u góry.](shot:hollow-result)

![To samo pudełko z otwartym tylko przodem: wnęka na szufladę.](shot:hollow-sides)

Dla każdej otwartej strony bryła potrzebuje płaskiej ściany na samym brzegu po tej stronie. Kul i kształtów swobodnych nie da się więc w ten sposób wydrążyć. Jeśli ścianka jest za gruba dla bryły, layerling o tym informuje i prosi o cieńszą. Taki przypadek to zaokrąglony prostopadłościan, którego górne i dolne krawędzie też są zaokrąglone: jego ścianka musi być wyraźnie cieńsza niż to zaokrąglenie, albo najpierw ustaw zaokrąglenie na 0.

Bryłę z kieszenią (klocek z otworem, który nie przechodzi na wylot, zrobiony przez zgrupowanie prostopadłościanu z uniesionym otworem) też da się wydrążyć z otwartą górą: ścianki wokół kieszeni też zostają wydrążone, więc między zewnętrzną ścianką a kieszenią zostaje pierścień wnęki otwarty u góry, a pod dnem kieszeni leży cienka wnęka.

**Bryły zakończone szpicem,** takie jak stożek albo obrócony trójkąt, nie mają na górze płaskiej ściany, która mogłaby zostać otwarta. Całkowicie zamknięta wnęka też tam nie zadziała, bo szpica nie da się odsunąć do środka: nawet przy ściance 1 mm dostaniesz komunikat, że ścianki nie mogą być tak grube. Zamiast tego wrysuj ściankę w profil przed obrotem: zduplikuj kontur, zmniejsz kopię równomiernie, ustaw ją na środku dużego konturu i wytnij nią duży, a potem obróć całość (rozdział Szkice, część o obracaniu szkicu). Odległość między oboma konturami to grubość ścianki.

Jeśli później zmienisz rozmiar wydrążonej bryły, layerling od razu wydrąży ją ponownie w nowym rozmiarze. Ścianka zostaje tak gruba, jak wybrałeś, także w bryłach okrągłych. Walec rozciągnięty w jedną stronę bardziej niż w drugą staje się elipsą. Zaokrąglenia i fazki nałożone po drążeniu wracają na te same krawędzie.

> **Wskazówka:** przy dyszy 0,4 mm dobrym początkiem jest ścianka od 1,2 do 2 mm: wystarczająco cienka, żeby oszczędzić materiał, i wystarczająco gruba na solidną część.

## Pokrywka do otwartej bryły

{{ui:editor.tool.lid}} tworzy pokrywkę do bryły otwartej u góry: pudełka wydrążonego z otwartą górą, doniczki, tacki. Zaznacz bryłę i kliknij {{ui:editor.tool.lid}}. W oknie wybierasz rodzaj:

- {{ui:lid.type.plug}}: płyta tak duża jak bryła, a pod nią kołnierz, który wchodzi w otwór.
- {{ui:lid.type.cap}}: płyta szersza od bryły o grubość ścianki, a pod nią obrzeże, które obejmuje ją z zewnątrz.
- {{ui:lid.type.flat}}: tylko płyta, do położenia lub przyklejenia.

Następnie ustawiasz grubość ({{ui:lid.thickness}}), pasowanie ({{ui:lid.fit}}, czyli {{ui:lid.gap}} między pokrywką a bryłą: 0,1 mm ciasno, 0,2 mm normalnie, 0,3 mm luźno lub dowolna wartość do 1 mm) oraz jak głęboko sięga kołnierz lub obrzeże i jak gruba jest jego ścianka. Kliknij {{ui:lid.apply}}: pokrywka leży obok bryły, odwrócona płytą w dół, więc drukuje się bez podpór. Bryła zostaje bez zmian. Pokrywka podąża za każdym obrysem, okrągłym lub kanciastym, bo jest zdejmowana z samej bryły tuż pod jej krawędzią. Bryła bez otworu u góry dostaje tylko płaską pokrywkę; dla dwóch pozostałych najpierw wydrąż ją z otwartą górą.

> **Wskazówka:** To, jak ciasno siedzi pokrywka, zależy od drukarki. Najpierw wydrukuj małe pudełko z pokrywką; jeśli jest za ciasna, wybierz następne, luźniejsze pasowanie.

## Odsuwanie brył

Każdą ścianę bryły można przesunąć o tę samą odległość na zewnątrz lub do środka. Tego potrzebuje pasowanie, pokrywka lub połączenie zatrzaskowe: luz 0,1-0,3 mm dookoła, podczas gdy detale zostają na miejscu, czego skalowanie nie daje.

1. Zaznacz jedną bryłę i kliknij {{ui:editor.tool.offset}} albo kliknij bryłę prawym przyciskiem i wybierz to tam.
2. Wybierz {{ui:offset.grow}} lub {{ui:offset.shrink}} i ustaw {{ui:offset.distance}}.
3. {{ui:offset.edges}} decydują o zewnętrznych narożach: zaokrąglone utrzymuje odsuniętą powierzchnię okrągłą, ostre pozwala ścianom biec dalej, aż się spotkają.
4. Zaznacz {{ui:offset.copy}}, aby zachować część bez zmian, a powiększoną bryłę dostać jako kopię, która już jest otworem. Zgrupuj ten otwór z częścią współpracującą, a wytnie dokładnie wybrany luz.
5. Kliknij {{ui:offset.apply}}.

Zaznacz {{ui:offset.sideways}}, gdy ma rosnąć lub maleć tylko obrys: boki przesuwają się o odległość, a każda płaska górna i dolna ściana zostaje na swojej wysokości. Tabliczka dostaje obramowanie dookoła, podstawa robi się szersza, a bryła nie staje się wyższa. W bryle schodkowej każdy stopień zachowuje swoją wysokość. Tekst odsuwany przez swoje obrysy też zachowuje wtedy swoją wysokość.

Bez zaznaczenia odsunięta zostaje sama bryła. Staje się stałą, dokładną bryłą, jak po fazie: lista u góry panelu cofa odsunięcie, a {{ui:edge.editAction}} otwiera narzędzie ponownie ze starą odległością. Odsunąć można tylko dokładne bryły CAD - prostopadłościany, walce i inne kształty, ich grupy, importowane części STEP. Bryła będąca tylko siatką trójkątów, jak wiele importów STL, często nie daje się odsunąć. Odległość zbyt duża dla bryły, na przykład zmniejszenie poza najcieńszą ścianę, zostaje odrzucona.

## Usuwanie ścian

Zaokrąglenie, które przeszkadza, otwór w złym miejscu, występ, którego już nie potrzebujesz: {{ui:editor.tool.deleteFace}} usuwa to z bryły, bez budowania bryły od nowa.

1. Zaznacz bryłę i kliknij {{ui:editor.tool.deleteFace}} albo kliknij bryłę prawym przyciskiem i wybierz polecenie z menu.
2. Kliknij każdą ścianę tego, co ma zniknąć: ściany zaokrąglonej krawędzi, ściankę otworu, bok i górę występu. Wybrana ściana się podświetla, a kolejne kliknięcie ją wyłącza. Panel liczy ściany.
3. Kliknij {{ui:deleteFace.apply}} albo naciśnij [[Delete]]. [[Esc]] zamyka narzędzie bez zmian.

Ściany wokół usuniętych rosną, aż luka się zamknie. Prostopadłościan z zaokrąglonymi górnymi krawędziami odzyskuje ostre krawędzie, otwór zostaje wypełniony, występ znika. Bryła pozostaje dokładna, więc da się ją znowu zaokrąglać i fazować, a eksport STEP zachowuje jej prawdziwe ściany. [[Ctrl]]+[[Z]] cofa usunięcie jednym krokiem. Jest ono też wymienione w {{ui:edge.featureHistory}} razem z zaokrągleniami i fazkami, gdzie {{ui:edge.revertAction}} je cofa. {{ui:edge.editAction}} dla niego nie ma. Na grupie wynikiem jest jedna bryła, tak jak przy obróbce krawędzi.

Wybierz wszystkie ściany tego, co ma zniknąć, i tylko te. Jeśli ściany wokół nich nie mogą zamknąć luki, layerling o tym informuje i nic się nie zmienia. Na przykład główny bok prostopadłościanu nie ma sąsiada, który mógłby zająć jego miejsce. Usunięcie samego dna kieszeni zmienia ją w otwór na wylot, bo ścianki kieszeni biegną dalej na drugą stronę.

{{ui:editor.tool.deleteFace}} potrzebuje dokładnych ścian: działa na częściach zaimportowanych jako STEP i na kształtach layerling. To, co layerling trzyma jako siatkę, ich nie ma: zaimportowany STL, OBJ albo 3MF, bryła podzielona, owinięta lub uproszczona albo bardzo szczegółowy kształt, taki jak długi tekst. Jeśli możesz, importuj część jako STEP. Przy szczegółowej zaimportowanej części kilka ścian może być dla jądra CAD za dużo: po 45 sekundach usuwanie zostaje przerwane i nic się nie zmienia. Bryła, której rozmiar zmieniono po obróbce krawędzi z zachowaniem rozmiaru krawędzi, nie ma w nowym rozmiarze dokładnych ścian, dopóki zmiana rozmiaru nie zostanie cofnięta.
