---
title: Skróty klawiszowe
summary: Wszystkie klawisze w jednym miejscu, pobrane prosto z programu, więc lista zawsze się zgadza.
---

Skróty działają, dopóki płaszczyzna robocza jest aktywna. Gdy piszesz w polu, nie przeszkadzają. Na Macu [[Cmd]] działa wszędzie tam, gdzie wymieniony jest [[Ctrl]].

W edytorze {{ui:editor.keyboardShortcuts}} w sekcji {{ui:editor.group.help}} otwiera tę samą listę jako okno. Przycisk drukarki w oknie ({{ui:shortcuts.print}}) drukuje samą listę, czarno na białym, całą na jednej stronie arkusza A4 albo Letter w trzech kolumnach, żeby mieć ją pod ręką jako ściągę. Okno drukowania przeglądarki pozwala też zapisać ją jako PDF.

Pole u góry okna przeszukuje listę: zostawia tylko skróty, których zdanie, grupa lub klawisze zawierają każde wpisane słowo, więc "ctrl+z" zostawia tylko te wiersze. Wielkość liter i znaki diakrytyczne nie mają znaczenia, a pojedyncza litera lub cyfra znajduje ten klawisz i słowa, które się od niej zaczynają. X na końcu pola je czyści; przy pustym polu wraca cała lista. Przycisk drukarki drukuje to, co pokazuje okno, więc po wyszukiwaniu drukuje tylko znalezione skróty.

![Okno skrótów klawiszowych w edytorze.](shot:shortcuts)

## Wyszukiwanie poleceń

Nie możesz znaleźć narzędzia? Naciśnij [[Ctrl]]+[[K]] albo kliknij lupę w sekcji {{ui:editor.group.help}}, a potem wpisz, czego szukasz: narzędzie („zaokrąglenie”, „odbicie”), kształt („walec”) albo polecenie („eksport”, „cofnij”). Poruszaj się strzałkami i naciśnij [[Enter]] albo kliknij wpis.

- Wyszukiwanie rozumie nazwy w języku interfejsu oraz słowa angielskie i niemieckie, a wielkość liter i znaki diakrytyczne pomija: „wydraz” znajdzie {{ui:editor.tool.hollow}}.
- Każdy wpis pokazuje klawisze, które robią to samo, i sekcję paska narzędzi, w której się znajduje, więc uczysz się, gdzie to jest.
- Wpisy wyszarzone nie mogą się teraz wykonać, najczęściej dlatego, że nic nie jest zaznaczone. Zostają na liście, żeby wyszukiwanie i tak mówiło, gdzie jest narzędzie.

Instrukcja, którą czytasz, też ma pole wyszukiwania, na górze każdej strony: wpisz słowo albo dwa, a pokaże części, które zawierają je wszystkie, z zaznaczonymi pasującymi słowami. Kliknij jedną albo naciśnij [[Enter]] dla pierwszej, aby od razu tam przejść. Otwarta strona zaznacza każde miejsce, w którym występują twoje słowa, i przewija do pierwszego w wybranej części; [[Esc]] albo kliknięcie zaznaczenia je usuwa.
- Nazwa kształtu dodaje ten kształt na płaszczyznę roboczą, tak jak kliknięcie go w menu kształtów.
- Przy pustym polu wyszukiwanie pokazuje na górze ostatnio używane polecenia.
- Nazwa bryły w Twoim projekcie znajduje tę bryłę i ją zaznacza, co pomaga w projekcie z wieloma częściami. Bryły pojawiają się dopiero, gdy zaczniesz pisać.
- Działa też w trybie szkicu, z narzędziami szkicu.

## Pomoc interaktywna

Nie wiesz, gdzie przeczytać o przycisku albo polu? Niech program sam Cię tam zaprowadzi. Kliknij znak zapytania w sekcji {{ui:editor.group.help}} albo naciśnij [[Shift]]+[[F1]]. Wskaźnik zmienia się w znak zapytania, a to, co leży pod nim, dostaje obramowanie.

- Kliknij przycisk, pole, przełącznik, uchwyt, grupę wstążki albo pasek tytułu okna. **Nie** robi on wtedy tego, co zwykle. Zamiast tego otwiera się małe okno z nazwą elementu, krótkim streszczeniem części tej instrukcji, która go dotyczy, maksymalnie dwoma kolejnymi miejscami, które o nim wspominają, oraz przyciskiem {{ui:interactiveHelp.open}}.
- Pomoc dotyczy elementu, który wskazałeś, a nie całego okna wokół niego. Element bez własnej nazwy korzysta z najbliższej nazwy wokół niego, a wewnątrz okna z jego znaku zapytania.
- {{ui:interactiveHelp.open}} otwiera instrukcję w tej części w nowej karcie. Ta część jest tam obramowana kolorem, od nagłówka do końca, więc widzisz, gdzie się zaczyna i kończy.
- Jeśli instrukcja nic nie mówi o elemencie, okno o tym informuje i oferuje {{ui:interactiveHelp.search}}.
- [[Esc]] albo ponowne kliknięcie znaku zapytania wychodzi z trybu. Na ekranie dotykowym nie ma najeżdżania: stuknięcie elementu od razu otwiera okno.

Okno przesuwa się za pasek tytułu jak inne okna. Program znajduje część instrukcji po nazwie elementu, czyli napisie na przycisku albo nazwie pola, bo ta instrukcja zapisuje każdy przycisk tak, jak nazywa się w programie. Szuka w tym samym wyszukiwaniu co pole na górze każdej strony instrukcji, w języku, którego używasz, i działa w całości w Twojej przeglądarce.

{{shortcuts}}
