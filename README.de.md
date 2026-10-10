<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="layerling-Logo">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">Einfaches 3D-CAD für den 3D-Druck</h3>
        <p align="right">
          Form hinstellen, Aussparung hineinschneiden, Kante brechen, drucken. Im Browser, ohne Konto und ohne CAD-Vorkenntnisse.
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="GNU-AGPLv3-Lizenz" src="https://img.shields.io/badge/Lizenz-AGPLv3-663399"></a>
    <img alt="Kein Konto nötig" src="https://img.shields.io/badge/ohne%20Konto-nichts%20anzumelden-dd7906">
    <img alt="Für den 3D-Druck gemacht" src="https://img.shields.io/badge/gemacht%20für-3D--Druck-ff9e2c">
    <a href="#layerling-mcp-skill"><img alt="Von einer KI steuerbar" src="https://img.shields.io/badge/KI--steuerbar-MCP--Server-16c0d4"></a>
  </p>

  <p><a href="README.md">English</a> · <strong>Deutsch</strong></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-de.png" width="770" alt="layerling im Browser">
</p>

<p align="center"><em>layerling im Browser</em></p>

<p align="center"><a href="https://layerling.com/anleitung/index.html"><strong>Anleitung</strong></a>, Schritt für Schritt und mit Bildern</p>

## Für wen das gedacht ist

Du hast einen 3D-Drucker. Du willst ein Teil, das passt – keine Laufbahn als CAD-Konstrukteur.

layerling arbeitet so, wie du ohnehin denkst: Form auf die Platte stellen, auf Maß ziehen, eine zweite Form zur Aussparung erklären, beides gruppieren, exportieren, drucken. Es gibt nichts zu lernen, bevor du anfängst, und **nichts anzumelden** – Seite öffnen und bauen. Deine Entwürfe bleiben in deinem eigenen Browser: kein Konto, keine Cloud, nichts wird irgendwohin hochgeladen.

### Von Tinkercad umgestiegen?

layerling ist ein Stück weiter als Tinkercad in Richtung Fusion 360 und wird genauso bedient: Du wirst alles wiedererkennen – die Platte, die Formen, Körper und Aussparung (dort Solid und Hole), Gruppieren und Auflösen, Bündeln, mit Alt eine Kopie ziehen –, aber es hört nicht dort auf, wo Tinkercad aufhört. Das wartet hier auf dich, was du dort vermisst hast:

- **Kanten fasen und verrunden.** Kante auswählen und brechen oder abrunden – das, wonach am häufigsten gefragt wird, sobald ein gedrucktes Teil fertig aussehen oder irgendwo hineinpassen soll. Bearbeitete Kanten bleiben umkehrbar: Du nimmst Fase oder Rundung jederzeit wieder weg.
- **Aushöhlen, Teilen, Skizzen, Gewinde.** Körper mit gleichmäßiger Wand aushöhlen, mit einer Ebene teilen, Skizzen mit genauen Längen und Winkeln ziehen oder drehen, dazu Schrauben, Muttern und Gewindelöcher.
- **Muster und Wickeln.** Eine Form in Reihe, Kreis oder Spirale wiederholen, oder ein Muster und Schrift um einen Zylinder wickeln.
- **Um Prozent skalieren.** Ein oder viele Teile um einen Prozentwert größer oder kleiner machen - zusammen, so dass die Anordnung mitwächst, oder jedes an seinem Platz.
- **Messen und hineinschauen.** Maßband, Lineale, eine Schnittansicht, die das Modell aufschneidet, und ein Verlauf-Schieber zum Zurückschauen.
- **Echte Geometrie darunter.** layerling führt exakte CAD-Körper mit, nicht nur ein Dreiecksnetz. Eine verrundete Kante bleibt deshalb eine verrundete Kante – bis in eine STEP-Datei für ein vollwertiges CAD.

Ein vollständiges CAD-Paket ist es nicht: Es gibt keine parametrische Zeitleiste und keine Baugruppen. Dafür kannst du es **selbst betreiben**: als App installieren (dann startet es auch ohne Internet) oder eine eigene Kopie unter Windows, auf einer NAS oder einem Heimserver laufen lassen – siehe [Loslegen](#loslegen).

> **Eine KI kann mitbauen.** layerling bringt einen MCP-Server mit. Ein KI-Client wie Codex oder Claude sieht damit einen
> offenen Editor-Tab und arbeitet darin: Formen anlegen, Maße ändern, gruppieren, schneiden, Kanten verrunden, die Szene
> auslesen, Bilder der Ansicht aufnehmen. Du beschreibst das Teil, die KI baut es, du siehst zu und greifst jederzeit ein.
> Das läuft lokal, ohne dass etwas den Browser verlässt – wie das eingerichtet wird, steht unter
> [layerling-MCP-Skill](#layerling-mcp-skill).

## Was es kann

### Bauen

- **Eine echte Bauplatte** – Raster, Einrasten, Griffe zum Verschieben, Skalieren und Drehen, und ein Feld mit den genauen Zahlen, wenn du sie brauchst.
- **Position eintippen** – die Karte Position setzt einen Körper auf genaue X-, Y- und Z-Werte, und Teile lassen sich wie bei Tinkercad neben der Platte parken.
- **Achsenpfeile** – rote, grüne und blaue Pfeile am vorderen linken Eck der Platte zeigen X, Y und Z so, wie die Zahlen zählen, wie bei Bambu Studio und OrcaSlicer; in den Einstellungen abschaltbar.
- **Drehpunkt, der bleibt** – ein Drehpunkt für einen Körper bleibt bei diesem Körper: Er wandert, dreht und skaliert mit, wird gespeichert und lässt sich als X, Y und Z eintippen oder mit der Maus ziehen, wobei er an Ecken und Kantenmitten einrastet – für Scharniere und Gelenke.
- **Licht und Schatten nach Geschmack** – Kontrast der Schattierung, Stärke und Weichheit der Schatten sowie Richtung und Höhe des Lichts, bis senkrecht von oben wie bei Tinkercad, alles in den Einstellungen. Ein Knopf „Wie Tinkercad“ stellt Farben, Raster und Licht auf einmal so ein wie dort, und die kräftigen Rasterlinien kommen auf Wunsch jeden Zentimeter in eigener Farbe.
- **Schnellmodus** – für langsamere Rechner: ein Schalter in den Einstellungen schaltet Schatten, Kantenlinien und das Nachlaufen der Kamera ab und zeichnet die Ansicht in Bildschirmauflösung; das Nachlaufen lässt sich auch einzeln abschalten, dann steht die Ansicht sofort.
- **Flächen aneinanderlegen und Winkel sehen** – das Werkzeug legt eine Fläche eines Teils an eine Fläche eines anderen, berührend oder bündig, auf Wunsch mit Abstand; ein gedrehter Körper zeigt seine Winkel um X, Y und Z unter der Auswahl, und die Karte „Drehung“ in seinen Einstellungen nimmt sie als Zahlen.
- **Fangen an anderen Formen** – beim Verschieben rastet eine Form mit Kante oder Mitte an Kanten und Mitten der Formen ringsum ein, eine Hilfslinie zeigt woran. So sitzen Teile bündig, ohne Zahlen zu tippen. Alt während des Ziehens hält das kurz an; Umschalt hält die Bewegung auf einer Achse, und mit Alt zu Beginn ziehst du wie in Tinkercad eine Kopie.
- **Auf Flächen absetzen** – wie Cruise in Tinkercad: Eine neue Form legt sich auf die Fläche unter dem Zeiger, auch auf eine schräge, und C nimmt die Auswahl auf und setzt sie so auf eine andere Fläche.
- **Bezugspunkte** – Körper mit der rechten Maustaste anklicken und Mitte, Ecken oder Kantenmitten mit Punkten markieren, die nichts druckt und an denen gezogene Formen einrasten; Punkte lassen sich ziehen oder per Koordinate eintippen und werden mit dem Entwurf gespeichert.
- **Befehlssuche** – mit Strg+K ein Werkzeug, eine Form oder einen Befehl eintippen („Verrunden“, „Spiegeln“, „Zylinder“) und direkt dorthin springen; sie versteht deutsche und englische Wörter und zeigt die Tastenkürzel dazu.
- **Verlaufsansicht** – mit einem Schieber auf jeden früheren Stand des Projekts zurückschauen, ohne etwas zu ändern; diesen Stand exportieren oder als neues Projekt anlegen. Von @rmpel.
- **Millimeter oder Zoll** – mit Imperial erscheinen alle Maße in Zoll, als Bruch wie in Tinkercad (1 5/8) oder als Dezimalzahl, das Raster rastet von 1/64 bis 1 Zoll, und das Gitter der Platte ist in Zoll gezeichnet.
- **Die Platte deines Druckers** – wähl einen von 190 gängigen Druckern, dann bekommt die Platte seine Größe. Name und Bauraum stehen in der Ecke der Arbeitsfläche (ein Schalter in den Einstellungen blendet das und den Namen des Entwurfs aus), und eine Warnung erscheint, wenn ein Körper über den Rand ragt.
- **Überhänge und Filament** – „Überhänge zeigen“ schraffiert jede Fläche, die steiler als 45° (oder der Winkel deines Druckers) überhängt und Stützen bräuchte, und das Exportfenster nennt Volumen, Gewicht und Meter Filament, bevor du slicst.
- **Formen-Bibliothek** – Quader, Zylinder, Kapseln (auf Wunsch mit einem kleineren Ende, etwa für eine Riemenabdeckung), Kugeln, Kegel, Pyramiden, Keile, Text, Dächer, Halbkugeln, Tori, Rohre, Übergänge (Loft) von einem Umriss zum anderen, etwa eckig auf rund, auch verdreht oder mit geneigtem oberen Ende, mit oder ohne Wand, Mehrkante von drei bis vierundzwanzig Seiten, Federn, ein druckbares Scharnier, Rändelungen für Griffe (gerade, gekreuzt oder rund) und mehr.
- **Gewinde, die passen** – Gewindestangen, Schrauben mit Zylinder-, Senk- oder Sechskantkopf, Sechskantmuttern und Gewindelöcher. M2 bis M12 liegen bereit, dazu UNC und UNF von #4 bis ein Zoll und die Whitworth-Rohrgewinde G1/16 bis G4 (ISO 228-1); Durchmesser und Steigung lassen sich auch frei wählen, Linksgewinde ebenso. Bei einer Zoll- oder G-Größe fragt das Feld nach Gängen je Zoll statt nach Millimetern. Die Enden bekommen auf Wunsch eine Fase, und das Gewindeloch ist eine Aussparung: in ein Teil ziehen, gruppieren, fertig.
- **Zahnräder, die ineinandergreifen** – Stirn-, Schräg- und Kegelräder, Hohlräder und Zahnstangen mit Evolventenzähnen, eingestellt über Modul und Zähnezahl wie in einem Zahnradgenerator, mit Eingriffswinkel und Spiel für den Druck - oder mit runden Zähnen, gutmütig bei kleinen gedruckten Rädern und als Griff an Drehknöpfen. Zwei Räder auswählen, und das Eigenschaftenfeld nennt den Achsabstand, bei dem sie ineinandergreifen.
- **Körper und Aussparungen** – Formen zu Schneidwerkzeugen erklären und zur fertigen Geometrie gruppieren. „Gruppe bearbeiten“ (**E**) legt die Teile einer Gruppe einzeln hin und rechnet sie mit „Fertig“ neu – auch eine Gruppe in einer Gruppe, so tief der Entwurf geht.
- **Mehrfarbige Gruppen** – eine Gruppe kann jedes Teil in seiner eigenen Farbe zeigen, auch nachdem Aussparungen hineingeschnitten wurden, und der 3MF- oder OBJ-Export behält diese Farben, so dass der Slicer die Teile Filamenten zuordnen kann.
- **Bündeln** – Strg+B hält Teile zusammen wie das Bündel in Tinkercad: Sie bewegen, drehen und skalieren sich gemeinsam, behalten aber ihre Farben und bleiben im Export getrennte Körper – praktisch für den Mehrfarbdruck.
- **Schnittmenge** – nur das behalten, wo sich die ausgewählten Körper und Aussparungen überlappen.
- **Teilen** – Körper oder Aussparungen mit einer Ebene in zwei schneiden; ein ausgehöhlter Körper behält seinen Hohlraum. Gedreht schneidet die Ebene schräg; am Pfeil ziehen verschiebt sie, und mit „Fläche wählen“ legst du sie auf eine beliebige Fläche.

### Bearbeiten

- **Kanten fasen und verrunden** – jede Kante eines Körpers brechen oder abrunden und später wieder zurücknehmen.
- **Skizzen** – Umrisse aus Linien, Kurven und fertigen Formen zeichnen, Linien schon beim Zeichnen nach Länge und Winkel setzen („50<30“, Umschalt rastet in 15°-Schritten ein), Längen, Winkel und Größen eintippen (Rechnungen wie „60+12,5“ gehen in jedem Zahlenfeld), Ecken runden oder fasen, an den Umrissen anderer Körper einrasten und daraus exakte Körper ziehen oder drehen. Eine Skizze lässt sich auch als Kontur bauen: Ein geschlossener Umriss wird ein Rahmen, innen, außen oder mittig auf der Linie, eine offene Linie ein Streifen mit flachen, eckigen oder runden Enden.
- **Aushöhlen** – aus einem Körper Wände gleicher Stärke machen, auf jeder gewünschten Seite offen (oben, unten, vorne, hinten, links, rechts, beliebig kombiniert) oder ganz geschlossen – für Dosen, Becher und Gehäuse.
- **Eigene Formen** – Körper, die du immer wieder brauchst, oben in der Formenliste ablegen und per Klick oder Ziehen in jeden Entwurf setzen; im Browser oder, mit dem Serverspeicher, auf dem Server für jedes Gerät. „Alle sichern“ nimmt sie mit.
- **Um einen Zylinder wickeln** – ein SVG-Muster, ein Logo oder einen Schriftzug auf die Wand eines Bechers oder Rohrs legen, erhaben oder als Gravur, und mittig am Zylinder ausrichten.

### Dateien

- **Eigene Schriften** – jede TrueType-, OpenType- oder WOFF-Schrift für Text, in Chrome und Edge auch eine auf dem Computer installierte. Ein Entwurf behält nur die Umrisse der benutzten Buchstaben und öffnet sich deshalb überall.
- **Eigene Modelle mitbringen** – STL, OBJ, 3MF, STEP oder SVG importieren und darum herum konstruieren. Ein SVG kommt als Skizzenkörper: als Fläche, als Kontur außen oder innen an seinen Linien, als Silhouette ohne Löcher oder rundum verbreitert - zusammen ein Ausstecher aus einer Datei oder die Schichten eines mehrfarbigen Logos. Die Textform hat dieselben Füllmodi. Eine farbige OBJ – aus layerling oder aus Tinkercad als ZIP mit ihrer `.mtl` – oder eine farbige 3MF, auch ein Slicer-Projekt, kommt als ein Körper je Farbe, eine 3MF mit mehreren Objekten als ein Körper je Objekt.
- **Exportieren, was dein Slicer will** – STL, 3MF mit Namen und Farben oder OBJ mit Farben, für die Auswahl oder die ganze Szene (Ausgeblendetes bleibt draußen), dazu STEP, wenn der Entwurf in ein vollwertiges CAD weiterreisen soll. PNG speichert ein sauberes Bild der Ansicht, in doppelter Auflösung und auf Wunsch mit durchsichtigem Hintergrund.
- **Projekte als Datei** – ein ganzes Projekt samt Verlauf, Skizzen und Gruppen als `.lyl` sichern und anderswo weiterbauen. Ältere `.skf`-Dateien aus früheren Fassungen öffnen sich weiterhin; gespeichert wird dann als `.lyl` daneben.
- **Fehlerbericht** – ein Link in der Fußzeile speichert den Entwurf als `.lyl` samt Version, Browser und den letzten Meldungen, fertig zum Anhängen im Forum oder bei GitHub.
- **Entwürfe, die du wiedererkennst** – alles liegt in deinem eigenen Browser, jeder Entwurf mit Vorschaubild.

### Ansicht

- **Perspektivisch oder gerade von vorn** – zwischen normaler und orthografischer Ansicht wechseln, über den Würfelknopf neben den Zoomtasten oder mit **O**. Blickrichtung und Ausschnitt bleiben erhalten.
- **Ansicht am Würfel drehen** – Ziehen am Ansichtswürfel dreht die Ansicht wie die rechte Maustaste, auf dem Tablet mit einem Finger; ein Klick springt weiter auf die gerade Seite, ein Klick auf eine Ecke oder Kante schaut von dort. Die Tasten **1**–**6** springen ebenfalls, **Umschalt+1**–**6** zoomen dabei auf die Auswahl.
- **Von unten schauen** – das Auge über dem Gitter in der Kameraleiste blendet die Platte aus, damit die Unterseite eines Entwurfs frei zu sehen ist.
- **Fenster nach Wunsch** – Objektliste, Einstellungen, Schnittansicht, Maßband und die Werkzeugfenster für Kanten, Aushöhlen und Muster lassen sich an ihrer Titelleiste frei verschieben und öffnen sich dort wieder; ein Doppelklick dockt sie an.
- **Rechtsklick-Menü** – ein kurzer Rechtsklick auf einen Körper bringt die häufigsten Befehle: duplizieren, Aussparung oder Körper, gruppieren, Fase, Rundung und Aushöhlen für einen Körper, ausblenden, sperren, auf die Arbeitsebene setzen, löschen. Ziehen mit der rechten Taste dreht weiter die Ansicht.
- **Schnittansicht** – die Ansicht entlang einer Ebene quer zu X, Y oder Z aufschneiden, um Wände, Hohlräume und ineinandergreifende Teile zu sehen, mit grobem und feinem Regler. Geschnitten wird nur die Ansicht: Entwurf und jeder Export bleiben ganz. Den Schnitt selbst speichert „Schnitt als SVG“ im Maßstab 1:1, etwa für einen Laser oder eine Schablone, und „Messen“ liest Wandstärken und Spalte direkt auf dem Schnitt ab, im rechten Winkel zur Wand eingerastet.
- **Arbeitsebene auf jeder Fläche** – W drücken und eine Fläche anklicken, um darauf zu bauen; ein Klick nahe einer Ecke setzt sie genau auf die Ecke, nahe einer Kante auf die Kante mit dem Raster an ihr entlang, und auf der freien Platte dorthin, wo du klickst. Ein Auge blendet die Ebene für freie Sicht aus, sie gilt trotzdem weiter. Auch eine KI kann sie auf eine Fläche legen.
- **Auf einem Tablet** – ein Finger arbeitet am Entwurf, genau wie die linke Maustaste: Antippen wählt aus, Ziehen verschiebt, Ziehen auf leerer Fläche spannt den Auswahlrahmen. **Zwei Finger gehören der Ansicht**: Spreizen und Zusammenziehen zoomt, gemeinsames Schieben verschiebt die Arbeitsfläche. Setzt der zweite Finger auf, wird zurückgenommen, was der erste angefangen hatte; ein Zoom verschiebt also nie versehentlich ein Teil. Fürs Drehen gibt es keine eigene Geste, dafür einen Umschalter in der Kameraleiste, der nur auf einem Berührungsbildschirm erscheint: Solange er an ist, dreht ein Finger die Ansicht, statt auszuwählen. Zahlenfelder geben beim Antippen ihren ganzen Wert zum Überschreiben frei – eine Dezimaltastatur hat keine Pfeiltasten, mit denen sich der Schreibzeiger setzen ließe.

### Videos

Von anderen gemacht, nicht von diesem Projekt:

- [Layerling – Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) – Making Layers (Englisch). Eine Reihe zu layerling: eine Einführung für Tinkercad-Umsteiger und die Skizzenwerkzeuge.
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) – 3D Jesus | 3D Printing & Design (Englisch). Ein erster Test von layerling ganz ohne Anleitung.

## Loslegen

Am schnellsten geht es mit der gehosteten Fassung. Nichts zu installieren, nichts anzumelden – öffnen und bauen:

**https://layerling.com/**

Der Rest dieses Abschnitts handelt davon, eine eigene Instanz zu betreiben: auf deinem Rechner oder auf einem Rechner in
der Werkstatt, den alle im Browser öffnen. Woher die App auch ausgeliefert wird: Die Entwürfe verlassen den Browser nicht,
in dem sie entstanden sind, und Exporte landen direkt auf dem Rechner der jeweiligen Person.

### Schnellstart unter Windows

Noch nie ein Terminal benutzt? Auf einem Windows-11-Rechner (oder aktuellem Windows 10) ohne Vorinstallationen
**PowerShell** öffnen (im Startmenü danach suchen, keine Administratorrechte nötig) und diese eine Zeile einfügen:

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

Das installiert Git und Node.js, falls sie fehlen, lädt layerling nach `%USERPROFILE%\layerling` herunter und öffnet es
im Browser unter `http://127.0.0.1:3000/`. Lass das PowerShell-Fenster offen, solange du layerling benutzt; `Strg+C` in
diesem Fenster beendet es wieder.

Dieselbe Zeile später noch einmal ausführen **aktualisiert** layerling – das Skript erkennt den vorhandenen Ordner und
holt die neueste Fassung, statt sie erneut komplett herunterzuladen. Das Skript selbst liegt unter
[`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1); du kannst also genau nachlesen, was es tut, bevor
du es ausführst, oder es herunterladen und lokal starten, statt es in PowerShell hineinzuleiten.

#### Später wieder öffnen

Die Zeile von oben legt außerdem eine Verknüpfung namens **„Start layerling“** auf deinem Desktop an. Einfach
doppelklicken, um layerling erneut zu öffnen – kein PowerShell, keine Neuinstallation, kein erneuter Download: Der
Server startet von selbst, und der Browser öffnet sich gleich mit. Außerdem **aktualisiert** die Verknüpfung layerling zuerst (sofern der Ordner keine eigenen
Änderungen enthält) und öffnet den Browser erst, wenn der Server wirklich bereit ist. Läuft layerling schon, startet sie keinen zweiten Server
und aktualisiert nicht unter dem laufenden, sondern öffnet nur die Seite. Soll layerling woanders liegen, etwa auf
einem anderen Laufwerk? Dann das Skript mit dem gewünschten Ordner starten:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

Stammt deine Verknüpfung aus einer älteren Fassung des Skripts, die Zeile einmal erneut ausführen; sie ersetzt die Verknüpfung durch die neue.

Lieber von Hand? PowerShell öffnen und Folgendes eingeben:

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

Dann selbst `http://127.0.0.1:3000/` öffnen. `Strg+C` in diesem Fenster beendet layerling so oder so wieder.

### Docker

Um layerling auf einem Rechner, NAS (Synology, Unraid usw.) oder Heimserver ohne Node.js zu betreiben, nimmst du das fertige Image **`ghcr.io/henmedia/layerling`**. Jedes Release veröffentlicht es für amd64 und arm64 (Raspberry Pi, ARM-NAS), unter seiner Versionsnummer und als `latest`. Die App lauscht auf Port **3000**.

Am schnellsten geht es mit einem einzigen Befehl:

```bash
docker run -d --name layerling -p 3000:3000 --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

Auf einem NAS mit Container-Verwaltung (Synology Container Manager, Unraid, Portainer) trägst du das Image `ghcr.io/henmedia/layerling:latest` ein und gibst Port 3000 frei. Zum Aktualisieren das Image neu holen und den Container neu anlegen (oder Watchtower das erledigen lassen).

Die Image-Tags sind reine Versionsnummern **ohne „v“**: `ghcr.io/henmedia/layerling:1.42.0`, das GitHub-Release heißt dagegen `v1.42.0`. Ein Pull holt nur das neue Image; ein vorhandener Container läuft mit dem alten weiter, bis er entfernt und neu angelegt wird:

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

Mit `docker inspect layerling | grep image.version` siehst du, welche Version der Container wirklich ausführt. Hast du für den Serverspeicher einen Ordner eingebunden, gib dieselbe `-v`-Option wieder mit an.

Willst du das Image lieber selbst bauen, nimm das mitgelieferte [`Dockerfile`](docker/Dockerfile) und [`compose.yml`](docker/compose.yml):

1. **Docker installieren.** Unter Windows oder macOS [Docker Desktop](https://www.docker.com/products/docker-desktop/) installieren und starten. Unter Linux oder auf einem NAS brauchst du Docker mit Compose (`docker compose` oder das eigenständige `docker-compose`).
2. **Dateien holen.** Entweder das Repository als ZIP herunterladen ([Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)) und entpacken oder per Git klonen:
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **Starten.** Im Projektordner ein Terminal öffnen (z. B. PowerShell unter Windows) und ausführen:
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   Mit dem älteren eigenständigen Programm heißt es `docker-compose` statt `docker compose`. Docker baut das Image und startet den Container im Hintergrund (`-d`); beim ersten Mal dauert der Build etwa 2–3 Minuten. Ohne `--build` holt derselbe Befehl stattdessen das fertige Image.
4. **Öffnen.** Auf demselben Rechner unter **`http://localhost:3000/`**, von anderen Geräten im Netz unter **`http://<IP-DEINES-SERVERS>:3000/`**.

Befehle im Alltag:

- **Stoppen:** `docker compose -f docker/compose.yml down`
- **Wieder starten:** `docker compose -f docker/compose.yml up -d`
- **Aktualisieren** (nach `git pull` oder neuem ZIP): `docker compose -f docker/compose.yml up -d --build`; mit dem fertigen Image `docker compose -f docker/compose.yml pull` und danach `up -d`

Das Image führt `next start` im Produktionsmodus aus, die MCP-Brücke ist dort also aus, solange du sie nicht einschaltest (siehe [Eine KI an eine Kopie auf NAS oder Server lassen](#eine-ki-an-eine-kopie-auf-nas-oder-server-lassen)). Für einen
gemeinsamen Projektordner ein beschreibbares Verzeichnis einbinden und in `compose.yml` `LAYERLING_SHARED_PROJECTS_DIR`
auf den Pfad im Container setzen, an dem es eingebunden ist, etwa `./shared-projects:/shared-projects` mit
`LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"` (siehe [Gemeinsame Entwürfe im Netz](#gemeinsame-entwürfe-im-netz)).
Nach einer Änderung `docker compose up -d` ausführen: `docker compose restart` behält die alte Einstellung.
`docker exec <Container> printenv LAYERLING_SHARED_PROJECTS_DIR` zeigt die tatsächlich verwendete.

### Statisches Hosting: reine Dateien auf einem Webserver

Jeder Webserver kann layerling als reine Dateien ausliefern; auf ihm läuft kein Node.js. Du baust die Dateien einmal auf einem Rechner mit Node.js (siehe [Was du brauchst](#was-du-brauchst)):

```bash
npm install
npm run export
```

Die fertige Seite liegt in **`apps/web/.next-export/`**. Kopiere den **Inhalt** dieses Ordners (nicht den Ordner selbst) in das Dokumentenverzeichnis des Webservers, sodass `index.html` direkt darin liegt.

Drei Dinge zu wissen:

- **layerling braucht eine eigene Adresse.** Die Dateien verweisen mit Pfaden aufeinander, die an der Wurzel beginnen (`/_next/...`). layerling muss deshalb an der Wurzel einer Adresse ausgeliefert werden, etwa `https://layerling.example.com/` oder `http://192.168.0.5:8080/`. In einem Unterordner (`https://example.com/layerling/`) läuft es nicht, und von der Festplatte (`file://`) lässt es sich nicht öffnen. Siehst du nur einen Block Text ohne jede Gestaltung, wurden die Skript- und Stildateien nicht geladen: Öffne die Entwicklerwerkzeuge des Browsers (F12), sieh im Reiter „Netzwerk“ nach roten Einträgen `/_next/...` und vergleiche deren Adresse mit dem Ort, an den du die Dateien gelegt hast.
- **Ordner, die mit einem Unterstrich beginnen, müssen ausgeliefert werden.** Manche Server verstecken sie (GitHub Pages zum Beispiel ohne eine Datei `.nojekyll`), und in `_next` steckt das ganze Programm.
- **Ein schneller Test auf dem eigenen Rechner:** `npx serve apps/web/.next-export` und die angezeigte Adresse öffnen.

### Gemeinsame Entwürfe im Netz

Betreibst du layerling mit `npm run dev` oder `npm run start` auf einem Rechner, den andere im Browser öffnen, kann es
einen gemeinsamen Ordner für `.lyl`-Projekte anbieten. Setze dazu vor dem Start `LAYERLING_SHARED_PROJECTS_DIR` auf ein
Verzeichnis:

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projekte npm run start
```

Auf der Startseite steht dann neben deinen Browser-Entwürfen der Ordner **Auf dem Server**. Öffnest du ihn, bist du in
diesem Ordner: **Neuer Entwurf** legt einen darin an, **Neuer Ordner** einen Unterordner, und die Pfadzeile unter der
Überschrift sagt, wo du bist. Eine `..`-Kachel führt wieder hinaus. Entwürfe wandern per Ziehen auf einen Ordner, auf
diese Kachel oder auf einen Schritt der Pfadzeile – oder über **Verschieben nach …** in ihrem Menü. Ein Entwurf aus dem
Browser kommt genauso auf den Server: seine Kachel auf den Serverordner ziehen.

Das Suchfeld oben durchsucht den **ganzen** Serverordner, nicht nur den, in dem du gerade stehst. Jeder Treffer sagt,
in welchem Ordner er liegt, und dieser Ordner ist ein Knopf: ein Klick, und du bist dort, die Suche ist beendet.
Ordner werden ebenfalls über ihren Namen gefunden. Solange du suchst, sagt die Serverkachel auf der Startseite, wie
viele Treffer dort drüben liegen.

**Duplizieren** im Menü eines Entwurfs legt eine Kopie an. Auf dem Server wird die Datei selbst kopiert, neben dem
Original und unter einem freien Namen, das Vorschaubild inbegriffen – es wird nichts neu gepackt, die Kopie trägt also
genau die Geometrie des Originals. Im Browser entsteht ein eigener Entwurf mit denselben Formen, demselben Verlauf und
einem eigenen Vorschaubild, und er gehört niemandem auf dem Server.

Ein Entwurf, der auf dem Server liegt, sichert sich von selbst dorthin zurück – fünf Sekunden nach der letzten Änderung
und beim Verlassen des Editors. Vorschaubilder landen daneben in `.thumbnails`. Was nur im Browser liegt, bleibt dort
unberührt.

Eigene Formen, die auf dem Server abgelegt werden, kommen in einen Ordner `Custom shapes` oben im Speicher, je eine
`.lyl` mit Vorschaubild. layerling legt ihn mit der ersten solchen Form an. Er ist ein ganz normaler Ordner, erscheint also
auf der Startseite, und eine Form darin lässt sich wie ein Entwurf öffnen und speichern. Weder die Node-Route noch
`store.php` brauchen dafür etwas Zusätzliches.

Wer eine gemeinsame Datei öffnet, erhält eine private lokale Arbeitskopie. Beim Zurückspeichern wird zuerst der Stand auf
dem Server geprüft; hat jemand anderes die Datei inzwischen geändert, verweigert layerling das Überschreiben und bittet
darum, neu zu laden oder unter anderem Namen zu speichern. Das ist gemeinsame Dateiablage, kein gleichzeitiges Bearbeiten.

#### Ohne Node: der Ordner `store`

Wird layerling als statischer Export ausgeliefert – also als reine Dateien auf einem Webserver –, kann es von sich aus
nichts schreiben. Für diesen Fall reist `store.php` mit dem Export. Lege neben `index.html` einen Ordner `store` an, den
der Webserver beschreiben darf, und layerling bietet dieselbe gemeinsame Ablage an wie oben, samt Ordnern. Fehlt der
Ordner, bleibt die Funktion unsichtbar, und die Kurzanleitung im Editor sagt, wie man sie einschaltet. Der Webserver muss
PHP können.

Der Ordner hat **keine Anmeldung**: Wer die Seite erreicht, kann darin lesen, schreiben und löschen. Im Heimnetz oder in
der Werkstatt ist genau das der Zweck; auf einer öffentlich erreichbaren Seite schütze ihn oder lege ihn nicht an.

Beim Ausliefern daran denken: Wer den Export mit einer Option spiegelt, die Überzähliges löscht – `rsync --delete`,
`robocopy /MIR`, WinSCP `-delete` –, muss `store` ausdrücklich ausnehmen. Sonst räumt jedes Update die Projekte weg.

## An layerling arbeiten

Diesen Weg nimmst du, wenn du den Quelltext ändern willst.

### Was du brauchst

- Node.js 20 oder neuer
- npm, in Node.js enthalten

Die Versionen prüfst du mit `node -v` und `npm -v`. Funktionieren die Befehle nicht, installiere Node.js von der
offiziellen Node.js-Seite und öffne das Terminal neu.

### Installieren und starten

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

Kein Git? Auf der GitHub-Seite den grünen Knopf **Code** drücken, **Download ZIP** wählen, entpacken, im entpackten
Ordner ein Terminal öffnen und mit `npm install` beginnen.

Dann `http://127.0.0.1:3000/` öffnen. Lass das Terminal offen, solange du die App benutzt; `Strg+C` beendet den
Entwicklungsserver.

Unter Linux und macOS erledigt `scripts/start-layerling.sh` den täglichen Start: Es aktualisiert zuerst den Ordner (übersprungen, wenn du darin Dateien geändert hast), startet den Server, wartet, bis er antwortet, und öffnet dann den Browser. Aufrufen kannst du es von überall, etwa `~/layerling/scripts/start-layerling.sh`. Es braucht Git und Node.js wie oben. Läuft layerling auf dem Port schon, öffnet es nur den Browser, statt einen zweiten Server zu starten. Hält ein anderes Programm Port 3000, starte es mit `PORT=3100 scripts/start-layerling.sh`. Ausprobiert ist es unter Debian Linux (ohne Desktop, der Browserschritt gibt dort nur die Adresse aus) und in einer Windows-Shell; macOS ist ungetestet – wenn es bei dir hakt, sag es bitte in den Diskussionen.

### Entwickeln in einem Container

Du möchtest Node.js lieber nicht installieren? Entwickle stattdessen in einem Container. Du brauchst eine
Container-Engine mit Compose – `docker compose` oder `podman compose` (auch rootless Podman unter SELinux funktioniert;
das `:z` in der Compose-Datei übernimmt die Dateimarkierungen):

```bash
docker compose -f docker/compose.dev.yml up
```

Öffne `http://127.0.0.1:3000/`. Der erste Start installiert die Abhängigkeiten; bei späteren Starts geht es direkt in
den Entwicklungsserver mit Hot Reload. Zum Beenden `Strg+C` drücken. Wenn du Abhängigkeiten aktualisierst und etwas
veraltet wirkt, lösche `node_modules/` im Projektordner und starte neu.

Betreibst du gleichzeitig den Produktionscontainer aus `docker/compose.yml`? Der benutzt ebenfalls Port 3000 – ändere
den Host-Port bei einem der beiden (z. B. `"3100:3000"`).

### Nützliche Befehle

| Befehl | Was er tut |
| --- | --- |
| `npm run typecheck` | TypeScript prüfen |
| `npm run test` | Unit-Tests |
| `npm run test:e2e` | End-to-End-Tests |
| `npm run guide` | Die Seiten der Anleitung aus `docs/guide` bauen (Export und `npm run dev` tun das auch) |
| `npm run guide:images` | Die Bilder der Anleitung neu aus dem laufenden Programm aufnehmen (braucht `npm run dev -- -p 3010`; siehe `docs/guide/README.md`) |
| `npm run build` | Produktions-Build (`npm run start` liefert ihn aus) |
| `npm run export` | Statischer Export für einfaches Webhosting |
| `npm run printers:update` | Druckervorlagen aus den OrcaSlicer-Profilen auffrischen |
| `npm run mcp:layerling` | MCP-Server für KI-Clients starten (siehe unten) |

## layerling-MCP-Skill

layerling bringt einen lokalen MCP-Server für KI-Clients mit, die MCP-Werkzeuge unterstützen. Ein Agent kann damit einen
laufenden Editor-Tab untersuchen und steuern: offene Editoren auflisten, die Szene lesen, Objekte anlegen, ändern und
auswählen, Teile gruppieren, schneiden und trennen, CAD-Kanten-IDs auflisten, Kanten fasen oder verrunden, Körper
aushöhlen, Fehler einsehen und Bilder der Ansicht aufnehmen.

Das funktioniert mit einem lokalen Entwicklungsserver. In Produktions-Builds und beim statischen Hosting ist die
MCP-Route abgeschaltet, es sei denn, der Server schaltet sie mit einem Zugriffsschlüssel ein
([siehe unten](#eine-ki-an-eine-kopie-auf-nas-oder-server-lassen)); auf layerling.com ist sie immer aus.

1. layerling im Projektordner mit `npm run dev` starten (siehe [Installieren und starten](#installieren-und-starten)).
2. Einen Editor-Tab öffnen, z. B. `http://127.0.0.1:3000/?editor=1`.
3. Den KI-Client wie unten beschrieben anbinden. Er startet den MCP-Server selbst mit
   `node scripts/layerling-mcp-server.mjs`.

Die wichtigsten Werkzeugnamen sind `layerling_list_editors`, `layerling_read_scene`, `layerling_list_objects`,
`layerling_create_shape`, `layerling_update_object`, `layerling_list_edges`, `layerling_apply_edge_treatment`,
`layerling_hollow_object`, `layerling_array_objects`, `layerling_set_section_view` und `layerling_capture_image`.

### Claude Code

Nichts zu installieren: Das Repo bringt bereits `.mcp.json` mit, das den MCP-Server für dieses Projekt einträgt, sowie eine
Kopie des Skills unter `.claude/skills/layerling-mcp-skill` – genau dort sucht Claude Code danach. Öffne den
layerling-Ordner in Claude Code und bitte:

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Claude Desktop

Claude Desktop liest weder die `.mcp.json` eines Projekts noch Skill-Dateien, kann aber denselben MCP-Server über seine
eigene Konfiguration nutzen. Trage den Server dort ein; als Vorlage dient
[`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json), wobei du den Skriptpfad durch
den absoluten Pfad auf deinem Rechner ersetzt. Nach einem Neustart von Claude Desktop:

```text
Use the layerling MCP tools to list open editors, inspect the scene, and modify the selected object.
```

### Codex

Kopiere den Skill aus `docs/skills/layerling-mcp-skill` in deinen Codex-Skill-Ordner.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.codex\skills\layerling-mcp-skill"
```

macOS oder Linux:

```bash
mkdir -p ~/.codex/skills
cp -R docs/skills/layerling-mcp-skill ~/.codex/skills/
```

Trage danach einen MCP-Server-Eintrag in deine Codex-Konfiguration ein; als Vorlage dient
[`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml), wobei du den Skriptpfad durch den absoluten
Pfad auf deinem Rechner ersetzt. Codex neu starten und bitten:

```text
Use $layerling-mcp-skill to list my open layerling editors and inspect the current scene.
```

### Eine KI an eine Kopie auf NAS oder Server lassen

Eine Kopie, die du selbst betreibst (das Docker-Image auf einer NAS, ein Heimserver), kann einen KI-Client ihre offenen
Editoren übers Netz steuern lassen. Das ist **standardmäßig aus**, denn wer die Brücke steuern kann, kann die offenen
Entwürfe lesen und ändern. Mit zwei Einstellungen auf dem Server schaltest du es ein, sie werden beim Start gelesen - das
fertige Image braucht keinen Neubau:

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "ein-langes-zufaelliges-geheimnis-mit-mindestens-16-zeichen"
```

Ohne Schlüssel von mindestens 16 Zeichen bleibt die Brücke zu. Dann:

1. Einen Editor-Tab dieser Kopie im Browser öffnen, z. B. `http://nas:3000/?editor=1`, und offen lassen.
2. Dem MCP-Client Adresse und denselben Schlüssel geben: `LAYERLING_URL=http://nas:3000` und
   `LAYERLING_MCP_TOKEN=<der Schlüssel>` in seiner Konfiguration (Beispiele in `docs/mcp`).

Der Schlüssel schützt die Befehle: Nur ein Client, der ihn mitschickt, kann die Editoren auflisten oder steuern. Die
Editor-Seiten brauchen keinen, zählen aber nur, wenn sie Seiten dieser Kopie sind und unter einer Adresse oder einem Namen
geöffnet wurden, den nur jemand in deinem eigenen Netz benutzen kann (eine IP-Adresse, ein Name ohne Punkt oder einer
auf `.local` oder `.lan`). So kann keine Webseite im Internet über deinen Browser an die NAS gelangen. Öffnest du die
Kopie unter einer echten Domain, etwa hinter einem Reverse-Proxy, trägst du sie in `LAYERLING_MCP_ALLOWED_HOSTS` ein
(durch Kommas getrennt). Nutze das in einem Netz, dem du vertraust, und HTTPS für alles darüber hinaus: Der Schlüssel
wandert in einem Kopfzeilenfeld mit.

## Mitmachen

Beiträge sind willkommen, und du musst kein 3D-Druck-Mensch sein, um zu helfen – ein klarerer Satz in dieser Datei zählt
auch. Gute Anlaufstellen:

- Fehlerbehebungen im Editor
- Testfälle für Geometrie und boolesche Operationen
- Grenzfälle bei Import und Export (STL, OBJ, 3MF, STEP, SVG)
- Feinschliff an der Oberfläche
- Bildschirmfotos und Videos für die Dokumentation
- Barrierefreiheit und Geschwindigkeit

Lies [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md), bevor du einen Pull Request öffnest. Was sich in welcher Version
geändert hat, steht im [Changelog](docs/CHANGELOG.md).

## Sicherheit

Bitte eröffne für sicherheitsrelevante Meldungen keine öffentlichen Issues. Der Meldeweg steht in
[.github/SECURITY.md](.github/SECURITY.md).

## Woher das kommt

layerling ist ein Fork von [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D) von Formsmith746 und den
SketchForge-Beitragenden. Der Fork begann am 16. September 2026 auf Basis von SketchForge 1.0.9. SketchForge bleibt ein
hervorragendes Projekt und der Grund, warum es dieses hier gibt.

## Lizenz

Copyright (C) 2026 layerling contributors.
Copyright (C) 2026 SketchForge contributors.

layerling ist eine abgewandelte Fassung von SketchForge-3D und steht unter der **GNU Affero General Public License v3.0
only** (`AGPL-3.0-only`) – derselben Lizenz wie das Original. Siehe [LICENSE](LICENSE).

Wenn du layerling änderst und die geänderte Fassung über ein Netz zugänglich machst, verpflichtet dich Abschnitt 13 der
Lizenz, den entsprechenden Quelltext anzubieten. Genau dafür trägt das Dashboard einen **Source**-Verweis: Setze beim
Bauen `NEXT_PUBLIC_SOURCE_CODE_URL` auf die öffentliche Adresse des Quelltextes, aus dem dein Build entstanden ist.
