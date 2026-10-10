---
title: Ansicht und Arbeitsebene
summary: Sich in der Szene bewegen, gerade von vorn schauen und neue Formen auf jede beliebige Fläche setzen.
---

## Sich bewegen

Mit der Maus:

| Was du tust | Was passiert |
| --- | --- |
| rechte Maustaste ziehen | die Ansicht drehen |
| rechte Maustaste kurz klicken | auf einem Körper ein Menü mit den häufigsten Befehlen: duplizieren, Aussparung oder Körper, gruppieren, ausblenden, sperren, löschen und mehr; auf leerer Fläche Einfügen und Alle auswählen |
| mittlere Maustaste ziehen | die Ansicht verschieben |
| Mausrad | hinein- und herauszoomen |
| [[Strg]] halten und mit links ziehen | ebenfalls verschieben |

Auf einem Tablet oder Handy zoomen zwei Finger (spreizen und zusammenziehen) und verschieben die Ansicht (gemeinsam schieben). Ein Finger arbeitet am Entwurf, so wie die linke Maustaste. Wer mit einem Finger drehen möchte, schaltet in der Kameraleiste {{ui:camera.touchRotate}} ein. Der Schalter erscheint nur auf Geräten mit Touchscreen.

Ein Grafiktablett mit Stift verhält sich wie eine Maus: Die Spitze ist die linke Taste, die Seitentaste am Stift die rechte, zum Drehen der Ansicht und für das Menü. Die Schnelltasten des Tabletts belegst du in dessen Treiber mit layerlings [Tastenkürzeln](chapter:tastenkuerzel).

### Der Ansichtswürfel

Der Würfel links oben zeigt, wohin du gerade schaust. Ein Klick auf eine seiner Seiten springt in die gerade Ansicht von oben, unten, vorn, hinten, links oder rechts. Ein Klick auf eine Ecke des Würfels schaut schräg von dieser Ecke auf das Modell, ein Klick nahe einer Kante von dieser Kante, also zwischen zwei Seiten hindurch; die Stelle färbt sich, sobald der Zeiger darüber steht. Die geraden Ansichten gehen auch mit den Zifferntasten [[1]] bis [[6]]. Hältst du dabei [[Umschalt]] gedrückt, zoomt die Ansicht zugleich auf die Auswahl, wie mit [[Umschalt]]+[[F]].

Ziehst du am Würfel, drehst du die Ansicht, genau wie beim Ziehen mit der rechten Maustaste. Ist nichts ausgewählt, drehen auch die Pfeiltasten die Ansicht: 15° pro Druck, 90° mit [[Umschalt]]. Sie drehen das Modell in ihre Richtung – [[→]] dreht seine Vorderseite nach rechts, [[↑]] kippt seine Vorderseite nach oben. Ist etwas ausgewählt, klicke zuerst ins Leere; sonst verschieben die Pfeile die Auswahl. Auf einem Touchscreen geht das mit einem Finger, auch ohne {{ui:camera.touchRotate}} einzuschalten.

### Die Kameraleiste

Am linken Rand liegt eine schmale Leiste. Von oben nach unten:

- {{ui:camera.home}} holt die ganze Szene wieder ins Bild. Die Taste dazu ist [[F]] oder [[Pos1]].
- {{ui:camera.focusSelection}} zoomt auf die Auswahl ([[Umschalt]]+[[F]]).
- {{ui:camera.zoomIn}} und {{ui:camera.zoomOut}} zoomen schrittweise.
- {{ui:camera.orthographic}} schaltet auf eine flache Ansicht um, in der parallele Kanten parallel bleiben. Das ist zum Messen und zum Ausrichten von Kanten oft angenehmer als die perspektivische Ansicht. Mit [[O]] wechselst du hin und her, ein zweiter Klick geht zurück.
- {{ui:camera.hideWorkplane}} (das Auge über dem Gitter) blendet die Platte mit ihrem Gitter aus, damit du die Unterseite eines Entwurfs von unten ansehen kannst. Es ändert sich nur die Ansicht: Neue Formen landen weiter auf der Arbeitsebene. Ein zweiter Klick blendet sie wieder ein.
- {{ui:camera.placeWorkplane}}, das Massband und das Winkellineal sind eigene Werkzeuge, sie kommen weiter unten und im Kapitel [Messen und Notizen](chapter:messen-und-notizen) vor.

Über den kleinen Pfeil ganz oben in der Leiste kannst du sie ausblenden, wenn sie stört.

## Ins Innere schauen: die Schnittansicht

{{ui:camera.sectionView}}, der letzte Knopf der Leiste (das Schnittwerkzeug), schneidet die Ansicht entlang einer Ebene auf. So prüfst du Wände, Hohlräume und Teile, die ineinandergreifen. Geschnitten wird nur die Ansicht: Entwurf, Dateien und jeder Export bleiben vollständig.

- Wähle die Achse, quer zu der die Ebene steht: X (Breite), Y (Tiefe) oder Z (Höhe), wie bei den Positionsfeldern. Sie beginnt in der Mitte deines Entwurfs.
- {{ui:camera.sectionCoarse}} schiebt die Ebene über den ganzen Entwurf, {{ui:camera.sectionFine}} nur ein Stück um ihre aktuelle Stelle, für Zehntelmillimeter. Die Position kannst du auch eintippen.
- Der Knopf neben den Achsen zeigt die andere Seite des Schnitts, {{ui:camera.sectionReset}} setzt die Ebene zurück in die Mitte, {{ui:camera.sectionShowPlane}} blendet die blaue Ebene aus.
- Was der Schnitt freilegt, kannst du anklicken und auswählen, auch innere Wände.
- {{ui:camera.sectionMeasure}} misst direkt auf dem Schnitt: Der Umriss erscheint blau, und zwei Klicks darauf ergeben den Abstand, dazu seine Anteile entlang der beiden Achsen der Ebene. Beide Punkte rasten am Umriss ein, an Ecken bevorzugt. Liegt der zweite Klick irgendwo an der gegenüberliegenden Wand, rastet er im rechten Winkel zum ersten Punkt ein – so liest du Wandstärken, Spalte und Spiel ab, ohne genau zielen zu müssen. Ein dritter Klick beginnt die nächste Messung, [[Esc]] beendet das Messen. Verschiebst du die Ebene, verschwindet die Messung.
- {{ui:camera.sectionExportSvg}} speichert die Umrisse auf der Schnittebene als SVG im Maßstab 1:1, für Laser, Plotter, Schablonen oder Dichtungen. Ein X-Schnitt ist von rechts gesehen, ein Y-Schnitt von vorn, ein Z-Schnitt von oben. Wie beim Export kommen nur sichtbare Körper hinein, Aussparungen sind schon abgezogen, und Körper gleicher Farbe sind zu einem Umriss vereinigt. Jede Farbe bleibt ein eigener Pfad ohne Füllung, so dass eine Lasersoftware sie als Ebenen trennt.

Das Fenster hängt an seinem Knopf. Verdeckt es etwas, ziehst du es an seiner Titelleiste frei über die Arbeitsfläche; dort öffnet es sich auch beim nächsten Mal. Ein Doppelklick auf die Titelleiste oder das Ablegen am Knopf bringt es zurück.

[[Esc]] schließt das Fenster; der Schnitt bleibt, bis du ihn ausschaltest oder zur Entwurfsübersicht zurückgehst. Solange er an ist, ist der Knopf hervorgehoben. Was du dann auf der weggeschnittenen Seite ablegst, siehst du erst, wenn du den Schnitt ausschaltest.

## Die Arbeitsebene

Neue Formen richten sich nach der Arbeitsebene. Anfangs ist das die Grundplatte mit dem Gitter. Du kannst sie aber auf jede Fläche legen, um etwas seitlich oder auf eine schräge Fläche zu setzen.

1. Drücke [[W]] oder klicke auf {{ui:camera.placeWorkplane}}.
2. Fahre mit der Maus über eine Fläche eines Körpers. Sie wird hervorgehoben.
3. Ein Klick legt die Arbeitsebene dorthin. Alles, was du jetzt hinzufügst, sitzt auf dieser Fläche.

Klickst du dabei auf die freie Platte, liegt die Arbeitsebene flach an der Stelle, auf die du geklickt hast, am Raster eingerastet. Neue Formen und eine fertige Skizze, auch ein Drehkörper, entstehen dann dort statt in der Mitte der Platte. Solange die Arbeitsebene so flach auf der Platte liegt, zeigt die Grundplatte nur noch ihren Rand: Zwei Gitter in derselben Ebene würden ein flimmerndes Muster ergeben.

Auf einer Fläche rastet der Ursprung der Arbeitsebene sonst am Raster ein. Klickst du nahe an eine Ecke der Fläche, sitzt er genau auf dieser Ecke. Nahe an einer Kante liegt er auf der Kante, und das Raster richtet sich nach ihr aus; so wählst du den Winkel des Rasters bewusst. Ohne Ecke oder Kante läuft das Raster auf einer liegenden Fläche parallel zum Körper, bei einem gedrehten Quader also mit ihm gedreht.

Ein Klick neben die Platte oder [[Esc]] holt die Arbeitsebene zurück auf die Grundplatte. Schneller geht es mit {{ui:camera.resetWorkplane}}: Der Knopf mit dem Pfeil nach unten steht in der Kameraleiste unter dem Auge, solange die Ebene auf einer Fläche liegt. Mit [[Umschalt]]+[[W]] legst du sie direkt auf die gerade ausgewählte Fläche. Hältst du beim Klicken [[Umschalt]] gedrückt, zeigt die Ebene in die andere Richtung.

Solange die Arbeitsebene auf einer Fläche liegt, erscheint neben {{ui:camera.placeWorkplane}} ein Auge. Es blendet die Ebene aus, ohne sie aufzuheben, damit du freie Sicht auf den Entwurf hast: Neue Formen landen weiter auf dieser Fläche, und gedreht wird weiter um sie. Ein Klick auf das Auge blendet sie wieder ein, ebenso das Setzen einer neuen Arbeitsebene.

## Gitter und Raster

Das Gitter zeigt die Größe der Platte. Unten rechts steht das **Raster**: Verschieben und Skalieren rasten in Schritten dieser Größe ein, zum Beispiel 1 mm. Für Feinarbeit stellst du es kleiner, für grobes Anordnen größer. {{ui:editor.tool.snapToGrid}} im Menüband rückt die ausgewählten Formen nachträglich auf das nächste Rasterkreuz. Beim Verschieben rasten Formen außerdem an anderen Formen ein, siehe [Auswählen und Anordnen](chapter:auswaehlen-und-anordnen).

Unter {{ui:workspace.measurement}} in den Einstellungen stellst du die {{ui:workspace.units}} ein. Mit {{ui:units.imperial}} zeigt layerling alle Maße in Zoll, an der Form, im Eigenschaftenfeld, bei Maßband und Lineal. Das Raster bietet dann Schritte von 1/64 bis 1 Zoll, und das Gitter auf der Platte wird in Zoll gezeichnet (1/8 bis 1 Zoll, Vorgabe 1/4 Zoll), mit einer kräftigeren Linie bei jedem vollen Zoll. Bei {{ui:workspace.inchFormat}} wählst du, ob Zoll als Bruch wie in Tinkercad erscheinen (1 5/8, auf 1/64 Zoll gerundet) oder als Dezimalzahl (1.625) mit so vielen Nachkommastellen, wie unter {{ui:workspace.accuracy}} eingestellt ist. Eintippen kannst du beides, auch „1 5/8“.

Unter {{ui:workspace.customSnapGrids}} an derselben Stelle legst du eigene Rasterschritte an: einen Namen und eine Größe in Millimetern, zum Beispiel „Rastermaß 2,54 mm" für den Abstand von DIP-Chips, Stiftleisten und Lochrasterplatinen oder „MX Key Unit" mit 19,05 mm für den Abstand von Tastaturtasten. Das Rastermenü bietet dieses Maß dann ganz, halbiert und geviertelt an (1 ×, ½ × und ¼ ×), sodass sich Formen um ein ganzes, ein halbes oder ein viertel Rastermaß verschieben lassen. Eigene Schritte bleiben beim Entwurf und gehen mit {{ui:workspace.makeDefault}} mit.

Größe, Gitterweite und Farbe der Platte änderst du in den Einstellungen (das Zahnrad im Menüband): Dort liegen die Bereiche {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} und {{ui:workspace.history}}. Unter {{ui:workspace.appearance}} gibt es zum Beispiel die Schalter {{ui:workspace.startInPerspective}} und {{ui:workspace.showShadows}}, unter {{ui:workspace.workplane}} {{ui:workspace.showGrid}}. Die Farben des Arbeitsbereichs stellst du ebenfalls unter {{ui:workspace.appearance}} ein: {{ui:workspace.backgroundColor}} und {{ui:workspace.surfaceColor}} für das helle Thema (die dunklen Themen behalten ihre eigenen), die Rasterfarbe liegt unter {{ui:workspace.workplane}}. Dort wählst du auch, ob die kräftige Rasterlinie alle 5 oder alle 10 Rasterschritte kommt ({{ui:workspace.gridMajorEvery}}), und gibst ihr mit {{ui:workspace.gridMajorColor}} eine eigene Farbe; Mittelkreuz und Plattenrand nehmen sie dann mit. Alle Linien des Rasters werden beim Hineinzoomen breiter, wie in Tinkercad, und bleiben beim Herauszoomen sichtbar. Im Farbfeld übernimmt [[Enter]] einen eingetippten Hex-Wert. {{ui:workspace.edgeLines}} zeichnet an jedem Körper eine Umrisslinie in der Farbe von {{ui:workspace.edgeColor}} (zunächst Schwarz, wie bei Tinkercad): Das hilft, wenn dunkle Farben ineinander verschwimmen. Es ist zunächst aus, und sehr große importierte Netze bleiben ausgenommen. Das Gitter läuft immer durch den Nullpunkt, sodass die kräftigen Linien auf den Achsen liegen, wie groß die Platte auch ist.

{{ui:workspace.showAxes}} (zunächst an) zeichnet am hinteren linken Eck der Platte drei Pfeile: **X** in Rot nach rechts, **Y** in Grün nach hinten und **Z** in Blau nach oben, so wie die Positionsfelder zählen. Das ist die Rechte-Hand-Regel, die auch Tinkercad, CAD-Programme und die Slicer nutzen. Liegt die Arbeitsebene auf einer Fläche, wandern sie mit. Hier schaltest du sie aus, wenn sie stören.

Zwei Regler unter {{ui:workspace.appearance}} bestimmen, wie die Körper beleuchtet sind. {{ui:workspace.shadowStrength}} sagt, wie dunkel die Schlagschatten sind, und {{ui:workspace.shadeContrast}} schiebt Licht vom gleichmäßigen Umgebungslicht zum Hauptlicht: Richtung „kräftig“ werden die Schattenseiten dunkler und die Schatten besser sichtbar, Richtung „weich“ wird alles flacher. Am oberen Ende wird der Kontrast sehr kräftig, so dass Schattenseiten und Schatten richtig dunkel werden. {{ui:workspace.shadowSoftness}} macht die Ränder der Schatten weich statt scharf. {{ui:workspace.lightAzimuth}} dreht das Hauptlicht um die Platte (0° von vorn, 90° von rechts), und {{ui:workspace.lightElevation}} hebt es an, bei 90° steht es wie bei Tinkercad senkrecht über der Platte, und die Schatten fallen genau unter die Körper. {{ui:workspace.lightReset}} stellt alles zurück. {{ui:workspace.tinkercadLook}} stellt den Arbeitsbereich so ein, wie Tinkercad ihn zeigt: weißer Hintergrund, hellblaues Raster im Millimeterabstand mit einer kräftigen Linie jeden Zentimeter, schwarze Kantenlinien, Licht von oben mit weichen Schatten. Danach lässt sich jeder Wert weiter einzeln ändern. Alle starten so, wie layerling immer aussah, und was passt, hängt auch von deinem Monitor ab. Die Skizzenansicht hat eigene Farben: {{ui:workspace.sketchBackground}} für das Fenster rund um die Fläche, {{ui:workspace.sketchPlateColor}} für die Fläche unter dem Raster und {{ui:workspace.sketchGridColor}}, alle für das helle Thema. {{ui:workspace.sketchMatch}} übernimmt die drei Farben des Arbeitsbereichs mit einem Klick.

![Die Einstellungen unter Darstellung: Hintergrund- und Arbeitsebenenfarbe für das helle Thema und der Schalter für Kantenlinien an allen Körpern.](shot:settings-appearance)

![Drei dunkle Körper mit eingeschalteten Kantenlinien: Die Umrisse halten sie auseinander.](shot:edge-lines)

![Der Editor im dunklen Farbschema. Das Farbschema stellst du oben rechts ein: System, Hell, Dunkel oder Graphit.](shot:editor-dark)

> **Tipp:** Dreh die Ansicht nicht mehr, wenn du Teile genau aneinander setzt. Wechsle mit den Zifferntasten in die gerade Ansicht von oben oder von vorn und schalte mit [[O]] auf die flache Darstellung um. So erkennst du sofort, ob zwei Kanten wirklich bündig sind.

## Wenn sich layerling langsam anfühlt

layerling rechnet und zeichnet alles in deinem Browser. Auf einem älteren Rechner, mit einer schwachen Grafikkarte oder auf mehreren großen Bildschirmen kann die Ansicht deshalb zäh wirken. Das hilft:

- **{{ui:workspace.fastMode}}** unter {{ui:workspace.appearance}} schaltet auf einen Schlag alles ab, was die Ansicht viel Kraft kostet: Schatten, Kantenlinien an allen Körpern und das Nachlaufen der Kamera. Außerdem zeichnet er die Ansicht nur in der Auflösung des Bildschirms, auf hochauflösenden Bildschirmen sind das bis zu viermal weniger Bildpunkte. Deine eigenen Einstellungen bleiben dabei erhalten und gelten wieder, sobald du ihn ausschaltest.
- **Die Kamera läuft nach:** Lässt du die Maus nach dem Drehen los, dreht die Ansicht kurz weiter und bremst sanft ab. Das ist Absicht und kein Ruckeln. Wer es von Tinkercad oder Fusion 360 anders kennt, schaltet {{ui:workspace.cameraInertia}} unter {{ui:workspace.appearance}} aus, dann steht die Ansicht sofort.
- **Einzelne Schalter:** Ohne Schnellmodus kannst du auch nur {{ui:workspace.showShadows}} oder {{ui:workspace.edgeLines}} ausschalten.
- **Die Grafikkarte nutzen:** Öffne in Chrome `chrome://gpu` (in Edge `edge://gpu`). Bei „WebGL" sollte „Hardware accelerated" stehen. Steht dort „Software only", ist die Hardwarebeschleunigung in den Browsereinstellungen aus. Unter Windows kannst du außerdem in den Einstellungen unter System → Bildschirm → Grafik für den Browser „Hohe Leistung" wählen, damit er die eigentliche Grafikkarte nimmt und nicht die schwächere im Prozessor.
- **Große importierte Netze vereinfachen:** Ein Modell aus vielen Hunderttausend Dreiecken bremst jede Ansicht. Wie du es ausdünnst, steht im Kapitel über Dateien unter „Ein importiertes Netz vereinfachen".
- **Andere Tabs schließen:** Jeder offene layerling-Tab und jede andere 3D-Seite teilt sich dieselbe Grafikkarte.
