---
title: Przygotowanie do druku 3D
summary: Wybór własnej drukarki, ostrzeżenie, gdy coś się nie mieści, i właściwe ułożenie części.
---

## Wybór drukarki

Otwórz ustawienia (koło zębate na wstążce, {{ui:editor.workspaceSettings}}) i przejdź do sekcji {{ui:workspace.workplane}}. W {{ui:workspace.printer}} wybierasz swoją drukarkę z listy ponad 230 popularnych modeli, między innymi Bambu Lab, Prusa, Creality, Anycubic, Elegoo i wielu innych.

![Ustawienia płaszczyzny roboczej z wybraną drukarką. Stół i maksymalna wysokość wydruku pochodzą z profilu slicera.](shot:settings-workplane)

Dzieją się trzy rzeczy:

- Płaszczyzna robocza przyjmuje rozmiar stołu drukarki.
- W narożniku płaszczyzny roboczej pojawiają się nazwa drukarki i jej przestrzeń robocza. Jeśli napis przeszkadza, wyłącz go przez {{ui:workspace.showPlateLabels}} w sekcji {{ui:workspace.workplane}}. Dotyczy to też nazwy projektu z przodu po lewej.
- layerling **ostrzega**, gdy coś się nie mieści.

Profile drukarek pochodzą z OrcaSlicera, więc są takie same, jakie zna Twój slicer. Jeśli wolisz pracować bez drukarki, wybierz {{ui:workspace.printerNone}}. Rozmiar płaszczyzny roboczej możesz też ustawić ręcznie.

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

## Grubość ścianek, luz i fazki

- Ścianki powinny mieć szerokość co najmniej dwóch ścieżek, czyli 0,8 mm przy dyszy 0,4 mm. Solidne części potrzebują od 1,2 do 2 mm.
- Tam, gdzie dwie części w siebie wchodzą, potrzebny jest luz: zwykle od 0,2 do 0,4 mm, zależnie od drukarki. Zanim wydrukujesz dużą część, zrób małą parę próbną.
- Wiele osób lekko fazuje dolną krawędź, która leży na stole. Dzięki temu pierwsza warstwa się nie rozlewa („stopa słonia”).

## Gdy wszystko gotowe

Wybierz {{ui:editor.export}}, a potem **STL** albo **3MF**. STL to najprostszy format. 3MF zachowuje nazwy i kolory poszczególnych brył, więc przydaje się, gdy drukujesz w kilku kolorach. Okno eksportu pokazuje też, ile gramów i metrów filamentu zużyłaby część wydrukowana jako pełna. Więcej w rozdziale [Pliki i zapis](chapter:files-and-saving).
