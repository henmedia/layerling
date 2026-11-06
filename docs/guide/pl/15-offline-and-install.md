---
title: Instalacja jako aplikacja, praca offline i własny serwer
summary: Uruchamiaj layerling jak zwykły program, także bez sieci, i dowiedz się, jak uruchomić go na własnym komputerze.
---

## Instalacja jako aplikacja

layerling można zainstalować jak zwykły program. Dostaje wtedy ikonę i własne okno, bez paska adresu. Po pierwszej wizycie uruchamia się nawet **bez internetu**. Twoje projekty zostają na Twoim komputerze. Instalacja się opłaca: aplikacja uruchamia się szybciej, bo nie musi być za każdym razem wczytywana od nowa, działa bez internetu i odciąża serwer. Nic nie tracisz, bo layerling nadal informuje, gdy wychodzi nowa wersja. To chroni też Twoje projekty: Safari na Macu, iPhonie i iPadzie usuwa zapisane dane strony, której nie odwiedzono przez siedem dni, ale nie dane zainstalowanej aplikacji.

Jeśli Twoja przeglądarka to potrafi, na stronie startowej pojawia się wskazówka z przyciskiem {{ui:installHint.install}}. W przeciwnym razie:

- **Chrome i Edge:** kliknij ikonę instalacji po prawej stronie paska adresu albo wybierz w menu przeglądarki „Zainstaluj jako aplikację”.
- **Safari na Macu:** menu „Plik”, potem „Dodaj do Docka”.
- **Safari na iPhonie i iPadzie:** ikona Udostępnij, potem „Do ekranu początkowego”.
- **Firefox:** nie instaluje aplikacji. layerling i tak uruchamia się tam offline w karcie.

Wskazówkę na stronie startowej zamkniesz przyciskiem {{ui:installHint.dismiss}}. Ponowne uruchomienie zainstalowanej aplikacji w Chrome albo Edge przenosi na wierzch otwarte okno, zamiast otwierać kolejne.

Na komputerze zainstalowany layerling w Chrome albo Edge rejestruje się też jako program do plików `.lyl`: dwuklik na projekcie w menedżerze plików otwiera go w layerling, a [[Ctrl]]+[[S]] zapisuje z powrotem do tego pliku. To samo robi dla plików `.stl` i `.3mf`, które otwierają się jako nowy projekt, tak jak przez {{ui:dashboard.importGeometry}} na stronie startowej. Aby layerling był dla nich domyślny, wybierz go w menu Otwórz za pomocą i pozwól systemowi zawsze go używać. Na Androidzie to nie działa, bo przeglądarka nie oferuje tam powiązania plików dla zainstalowanych aplikacji internetowych. Otwórz projekt przyciskiem {{ui:dashboard.importGeometry}} na stronie startowej.

## Aktualizacje

Gdy jest nowsza wersja, layerling pokazuje to na stronie startowej. Przez {{ui:dashboard.updateBannerLink}} przeczytasz, co się zmieniło. Numer wersji jest w prawym dolnym rogu. Po przeładowaniu strony masz nową wersję.

Na layerling.com i na innych serwerach WWW otwarta strona sama zauważa aktualizację. Co jakiś czas pyta serwer o jego wersję, gdy wracasz do karty, a od razu, gdy zniknie potrzebny jej plik programu. Gdy w międzyczasie zainstalowano coś nowego, informuje o tym karta w prawym dolnym rogu, z listą nowości. {{ui:newVersion.reload}} najpierw zapisuje otwarty projekt w przeglądarce, a potem wczytuje stronę ponownie. Projekt wraca taki, jakim go zostawiłeś. {{ui:newVersion.later}} wstrzymuje kartę na 15 minut. Odśwież wkrótce: strona, która zostaje na starej wersji, może wczytać części nowej, które do niej nie pasują. Ta sama karta pojawia się, gdy to już się stało: procesy CAD, które wczytują się dopiero przy pierwszej potrzebie, mówią, z której kompilacji pochodzą, a jeśli nie jest to kompilacja strony (po aktualizacji albo przy zapisanej kopii starszej wersji), karta prosi o odświeżenie, zanim obie się nie zrozumieją.

Gdy layerling jest otwarty w kilku kartach, pilnują się nawzajem: jeśli inna karta działa już w nowszej wersji, uwaga na dole starej karty prosi o jej odświeżenie. A jeśli ten sam projekt jest otwarty w dwóch kartach, obie ostrzegają, bo zapisują automatycznie i nadpisywałyby się nawzajem. Jeśli otworzysz layerling w kolejnej karcie, gdy jeden jest już otwarty, nowa karta proponuje pracę w starej i oferuje, że sama się zamknie. Jeśli celowo chcesz mieć dwie karty, na przykład dla dwóch projektów obok siebie, kliknij tam {{ui:tabs.keepHere}}. Ta instrukcja też otwiera się w osobnej karcie: dopóki obok niej jest otwarty layerling, jej przycisk w prawym górnym rogu brzmi „Wróć do edytora” i zamyka instrukcję, zamiast otwierać edytor drugi raz.

## Język i wygląd

Język wybierasz w prawym górnym rogu, z listy języków. Motyw kolorów obok niego oferuje {{ui:theme.short.system}} (podąża za systemem operacyjnym), {{ui:theme.short.light}}, {{ui:theme.short.dark}} i {{ui:theme.short.graphite}}, czyli neutralną ciemną szarość.

## Własna instalacja

layerling to wolne oprogramowanie (AGPL-3.0) i można go uruchomić na własnym komputerze albo serwerze, na przykład w warsztacie, klubie albo szkole. Jest kilka sposobów, opisanych w [README na GitHubie](https://github.com/henmedia/layerling/blob/main/README.md#getting-started):

- **Szybki start w Windows:** jeden wiersz w PowerShell instaluje wszystko i kładzie skrót na pulpicie. Gdy layerling już działa, kolejne dwukrotne kliknięcie nie uruchamia drugiego serwera, tylko otwiera stronę.
- **Docker:** dla urządzeń NAS i serwerów domowych, bez potrzeby instalowania Node.js. Każde wydanie jest dostępne jako gotowy obraz `henmedia/layerling` na Docker Hub (także `ghcr.io/henmedia/layerling`) dla amd64 i arm64. `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` go uruchamia, a na NAS-ie szukasz go w rejestrze menedżera kontenerów. Wolumin `layerling-thumbnails` zachowuje obrazki podglądu ze strony startowej przy aktualizacji. Bez niego brakuje ich po każdym ponownym utworzeniu kontenera, dopóki nie otworzysz projektu.
- **Eksport statyczny:** wynikiem są zwykłe pliki, które może serwować każdy serwer WWW. Muszą leżeć w katalogu głównym adresu (`https://layerling.example.com/` albo `http://192.168.0.5:8080/`), a nie w podfolderze ani otwierane z dysku. README podaje kroki. Z zapisywalnym folderem `store` obok `index.html` i PHP na serwerze staje się też wspólnym magazynem projektów.

Most MCP dla asystentów AI istnieje tylko w serwerze deweloperskim, zobacz [Budowanie z AI](chapter:ai-with-mcp).

## Pomoc i opinie

- W edytorze sekcja {{ui:editor.group.help}} zawiera {{ui:editor.guide}} z najważniejszymi ruchami oraz przegląd [skrótów klawiszowych](chapter:shortcuts). Każda część krótkiego przewodnika ma znak zapytania, który prowadzi do pasującego rozdziału tutaj.

![Krótki przewodnik w edytorze. Na górze są wymienione filmy innych osób, a każda część ma znak zapytania.](shot:quick-guide)

- Pytania, życzenia i zgłoszenia błędów są mile widziane na [forum](https://forum.drucktipps3d.de/forum/board/127-layerling/) (po niemiecku) i na [GitHubie](https://github.com/henmedia/layerling/discussions).
- Co zmieniło się w której wersji, jest w liście zmian, którą znajdziesz na dole strony startowej i edytora.
