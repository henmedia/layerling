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
| [[Strg]] / [[Cmd]] halten und mit links ziehen | ebenfalls verschieben (auf dem Trackpad eines MacBooks: [[Cmd]] halten, drücken und ziehen); auf dem Mac dreht Control statt Cmd die Ansicht, denn Control-Klick ist dort der Rechtsklick |
| Doppelklick auf eine leere Stelle der Arbeitsebene oder neben die Platte | verschiebt die Ansicht, bis diese Stelle in der Mitte liegt; die Ansicht dreht sich dann um sie |

Wie schnell das Mausrad zoomt, stellst du in den Einstellungen unter {{ui:workspace.appearance}} mit {{ui:workspace.zoomSpeed}} ein: ein Regler von 1 bis 14, zu Beginn 5. Er gilt nur für Mausrad und Trackpad: die Knöpfe und die Tasten [[+]] und [[−]] zoomen immer in denselben kleinen Schritten. Eine Raste des Mausrads zoomt in jedem Browser gleich stark, ein Trackpad zoomt danach, wie weit du streichst.

Auf einem Tablet oder Handy zoomen zwei Finger (spreizen und zusammenziehen) und verschieben die Ansicht (gemeinsam schieben). Ein Finger auf leerer Fläche dreht die Ansicht, und ein Antippen dort hebt die Auswahl auf; auf einer Form oder einem Griff arbeitet er am Entwurf, so wie die linke Maustaste. Wer auch mit einem Finger drehen möchte, der auf einer Form beginnt, schaltet in der Kameraleiste {{ui:camera.touchRotate}} ein. Der Schalter erscheint auf Geräten mit Touchscreen.

Ein Grafiktablett mit Stift verhält sich wie eine Maus: Die Spitze ist die linke Taste, die Seitentaste am Stift die rechte, zum Drehen der Ansicht und für das Menü. Die Schnelltasten des Tabletts belegst du in dessen Treiber mit layerlings [Tastenkürzeln](chapter:tastenkuerzel).

**Arbeite auf einem Tablet möglichst mit einem Stift.** Seine Spitze ist viel feiner als eine Fingerkuppe und verdeckt nicht, was du treffen willst: kleine Punkte, dünne Linien und Griffe in einer Skizze, Messpunkte und Kanten sitzen genau, und längeres Arbeiten ermüdet weniger. layerling lässt einen Finger zu Punkten, Linien, Griffen und Kanten schon etwas weiter greifen als einen Mauszeiger, aber mit einem Stift bleibt es genauer. Das gilt für einen Stift, den das Tablet als Stift kennt (S Pen, Apple Pencil und ähnliche). Ein einfacher Stift mit Gummispitze zählt für den Bildschirm wie ein Finger und ist nicht feiner als einer.

Eine rechte Maustaste gibt es auf einem Tablet nicht: Halte einen Finger eine halbe Sekunde ruhig auf eine Form oder auf die leere Fläche, dann öffnet sich das Menü, das ein Rechtsklick öffnet, auf der leeren Fläche mit **Alles auswählen**. **Mehrere auswählen** im selben Menü ersetzt auf dem Tablet die Umschalttaste: Jedes Tippen auf einen Körper nimmt ihn dann zur Auswahl dazu oder wieder heraus, bis du auf die leere Fläche tippst oder [[Esc]] drückst; ein Finger auf der leeren Fläche dreht weiterhin die Ansicht. Die Griffe um eine gewählte Form lassen sich mit dem Finger auch ein Stück neben ihnen fassen.

### Der Ansichtswürfel

Der Würfel links oben zeigt, wohin du gerade schaust. Ein Klick auf eine seiner Seiten springt in die gerade Ansicht von oben, unten, vorn, hinten, links oder rechts. Ein Klick auf eine Ecke des Würfels schaut schräg von dieser Ecke auf das Modell, ein Klick nahe einer Kante von dieser Kante, also zwischen zwei Seiten hindurch; die Stelle färbt sich, sobald der Zeiger darüber steht. Die geraden Ansichten gehen auch mit den Zifferntasten [[1]] bis [[6]]. Hältst du dabei [[Umschalt]] gedrückt, zoomt die Ansicht zugleich auf die Auswahl, wie mit [[Umschalt]]+[[F]].

Ziehst du am Würfel, drehst du die Ansicht, genau wie beim Ziehen mit der rechten Maustaste. Ist nichts ausgewählt, drehen auch die Pfeiltasten die Ansicht: 15° pro Druck, 90° mit [[Umschalt]]. Sie drehen das Modell in ihre Richtung – [[→]] dreht seine Vorderseite nach rechts, [[↑]] kippt seine Vorderseite nach oben. Mit gehaltener [[Strg]]-Taste verschieben die Pfeile die Ansicht stattdessen über den Bildschirm: ein Zehntel des Bildes pro Druck, mit [[Umschalt]] dazu die Hälfte. Das Modell wandert in ihre Richtung. Ist etwas ausgewählt, klicke zuerst ins Leere; sonst verschieben die Pfeile die Auswahl. Auf einem Touchscreen geht das mit einem Finger, auch ohne {{ui:camera.touchRotate}} einzuschalten.

### Die Kameraleiste

Am linken Rand liegt eine schmale Leiste. Von oben nach unten:

- {{ui:camera.home}} holt die ganze Szene wieder ins Bild. Die Taste dazu ist [[Pos1]]; [[F]] tut es auch, wenn nichts ausgewählt ist.
- {{ui:camera.focusSelection}} zoomt auf die Auswahl ([[F]] oder [[Umschalt]]+[[F]]).
- {{ui:camera.zoomIn}} und {{ui:camera.zoomOut}} zoomen schrittweise, ebenso die Tasten [[+]] und [[−]].
- {{ui:camera.orthographic}} schaltet auf eine flache Ansicht um, in der parallele Kanten parallel bleiben. Das ist zum Messen und zum Ausrichten von Kanten oft angenehmer als die perspektivische Ansicht. Mit [[O]] wechselst du hin und her, ein zweiter Klick geht zurück.
- {{ui:camera.secondView}} öffnet eine zweite Ansicht des Entwurfs in einem eigenen Fenster, siehe unten. Ein zweiter Klick schließt es.
- {{ui:camera.hideWorkplane}} (das Auge über dem Gitter) blendet die Platte mit ihrem Gitter aus, damit du die Unterseite eines Entwurfs von unten ansehen kannst. Es ändert sich nur die Ansicht: Neue Formen landen weiter auf der Arbeitsebene. Ein zweiter Klick blendet sie wieder ein.
- {{ui:camera.placeWorkplane}}, das Maßband und das Winkellineal sind eigene Werkzeuge, sie kommen weiter unten und im Kapitel [Messen und Notizen](chapter:messen-und-notizen) vor.

Über den kleinen Pfeil ganz oben in der Leiste kannst du sie ausblenden, wenn sie stört.

Ein Entwurf öffnet sich so, wie du ihn verlassen hast: Blickwinkel, Zoom und Ausschnitt der Ansicht bleiben mit ihm in diesem Browser erhalten, du machst also dort weiter, wo du aufgehört hast, auch nach „Home“ oder dem Schließen der Seite. Eine gespeicherte Datei (.lyl) nimmt die Ansicht mit, sie öffnet sich also auch anderswo darin. Die Ansicht gehört nicht zum Rückgängig-Verlauf.

Du kannst in jedem Entwurf außerdem vier eigene Ansichten festhalten. [[Umschalt]]+[[7]], [[Umschalt]]+[[8]], [[Umschalt]]+[[9]] oder [[Umschalt]]+[[0]] speichert die Ansicht genau so, wie sie ist - Blickwinkel, Ausschnitt, Zoom und flach oder perspektivisch - unter dieser Taste, und die Taste allein ([[7]], [[8]], [[9]] oder [[0]]) holt sie zurück. Eine Meldung unten bestätigt das Speichern; speicherst du erneut unter derselben Taste, ersetzt das die Ansicht. Wie die Ansicht oben bleiben die gespeicherten Ansichten mit dem Entwurf in diesem Browser und reisen in einer gespeicherten Datei (.lyl) mit; zum Rückgängig-Verlauf gehören sie nicht.

### Eine zweite Ansicht im eigenen Fenster

{{ui:camera.secondView}} öffnet ein Fenster, das denselben Entwurf durch eine eigene Kamera zeigt. So siehst du ihn von zwei Seiten zugleich - etwa von vorn, während du von oben arbeitest. Jede Änderung im Editor erscheint dort sofort; geändert wird der Entwurf nur im Hauptfenster, und auch die Griffe bleiben dort. Im zweiten Fenster drehen die Maus und der Ansichtswürfel dessen Ansicht wie hier, ebenso die Tasten: [[1]] bis [[6]], [[F]], [[Pos1]], [[O]], [[+]] und [[−]], die Pfeiltasten zum Drehen und [[Strg]] mit den Pfeilen zum Verschieben. [[F]] zoomt dort auf das, was im Editor ausgewählt ist. Auch die vier gespeicherten Ansichten des Entwurfs gelten dort: [[7]], [[8]], [[9]] und [[0]] holen sie zurück, und [[Umschalt]] mit einer dieser Tasten speichert die Ansicht dieses Fensters darunter - für beide Fenster. Seine eigene Kameraleiste hat {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} und {{ui:camera.hideWorkplane}}, und sie wirken nur auf dieses Fenster. Das Fenster öffnet sich dort, wo du es verlassen hast, in derselben Größe, und schließt sich mit dem Editor. Auf Handys und Tablets wird der Knopf nicht angezeigt.

## Ins Innere schauen: die Schnittansicht

{{ui:camera.sectionView}}, der letzte Knopf der Leiste (das Schnittwerkzeug), schneidet die Ansicht entlang einer Ebene auf. So prüfst du Wände, Hohlräume und Teile, die ineinandergreifen. Geschnitten wird nur die Ansicht: Entwurf, Dateien und jeder Export bleiben vollständig. Wo die Ebene durch einen Körper geht, ist der Schnitt in der etwas dunkleren Farbe des Körpers gefüllt, und eine Aussparung darin bleibt leer, so erkennst du Massives und Hohles; die gefüllte Fläche erscheint einen Moment, nachdem die Ebene stillsteht.

- Wähle die Achse, quer zu der die Ebene steht: X (Breite), Y (Tiefe) oder Z (Höhe), wie bei den Positionsfeldern. Sie beginnt in der Mitte deines Entwurfs.
- {{ui:camera.sectionOrientation}} legt fest, wonach sich diese Achsen richten. {{ui:camera.sectionOrientationWorld}} nimmt die Achsen des Entwurfs. {{ui:camera.sectionOrientationWorkplane}} nimmt die der Arbeitsebene: Z schneidet dann parallel zu ihr, X und Y quer dazu, und die Lage zählt ab ihrem Ursprung. Liegt die Arbeitsebene auf einer schrägen Fläche, schneidest du so parallel zu dieser Fläche, und der Schnitt wandert mit, wenn du die Arbeitsebene umsetzt. {{ui:camera.sectionOrientationView}} stellt die Ebene zum Bildschirm: Sie nimmt weg, was vor ihr liegt, und mit dem Regler schiebst du sie in Blickrichtung tiefer in den Entwurf, etwa um an ein verdecktes Teil zu kommen und es anzuklicken. Drehst du danach die Ansicht, klickst du noch einmal darauf, und der Schnitt richtet sich nach dem neuen Blick.
- {{ui:camera.sectionCoarse}} schiebt die Ebene über den ganzen Entwurf, {{ui:camera.sectionFine}} nur ein Stück um ihre aktuelle Stelle, für Zehntelmillimeter. Die Position kannst du auch eintippen.
- Der Knopf neben den Achsen zeigt die andere Seite des Schnitts, {{ui:camera.sectionReset}} setzt die Ebene zurück in die Mitte, {{ui:camera.sectionShowPlane}} blendet die blaue Ebene aus.
- Was der Schnitt freilegt, kannst du anklicken und auswählen, auch innere Wände.
- {{ui:camera.sectionWorkplane}} legt die Arbeitsebene auf den Schnitt. Sie liegt auf der Schnittebene und zeigt aus dem Körper heraus, der stehen bleibt, so wie bei der Fläche, die ein Schnitt hinterlässt. Wechselst du dann in die Skizze, beginnt sie genau dort, und der blasse Umriss zeigt die Kontur des Schnitts, an der du zeichnen und einrasten kannst. So skizzierst du etwa einen Deckel passend zum Innenraum, den du mit dem Schnitt freigelegt hast. Mit dem Knopf neben den Achsen wählst du, welche Seite stehen bleibt, und damit, in welche Richtung die Arbeitsebene zeigt. Die Arbeitsebene setzt du wie sonst auf die Grundplatte zurück.
- {{ui:camera.sectionMeasure}} misst direkt auf dem Schnitt: Der Umriss erscheint blau, und zwei Klicks darauf ergeben den Abstand, dazu seine Anteile entlang der beiden Achsen der Ebene. Beide Punkte rasten am Umriss ein, an Ecken bevorzugt. Liegt der zweite Klick irgendwo an der gegenüberliegenden Wand, rastet er im rechten Winkel zum ersten Punkt ein – so liest du Wandstärken, Spalte und Spiel ab, ohne genau zielen zu müssen. Ein dritter Klick beginnt die nächste Messung, [[Esc]] beendet das Messen. Verschiebst du die Ebene, verschwindet die Messung. Auf einem runden Umriss, etwa dem Schnitt durch einen Zylinder oder ein Loch, markiert ein kleines Kreuz die Mitte, und die Mitte rastet ebenfalls ein. Klicke einen Punkt auf dem Kreis an und gehe dann in die Nähe des gegenüberliegenden Punkts: Der zweite Klick landet genau gegenüber der Mitte, und die Zahl trägt ein Ø, es ist der Durchmesser. Von der Mitte zu einem Punkt auf dem Kreis erhältst du R, den Radius.
- {{ui:camera.sectionExportSvg}} speichert die Umrisse auf der Schnittebene als SVG im Maßstab 1:1, für Laser, Plotter, Schablonen oder Dichtungen. Ein X-Schnitt ist von rechts gesehen, ein Y-Schnitt von vorn, ein Z-Schnitt von oben. Wie beim Export kommen nur sichtbare Körper hinein, Aussparungen sind schon abgezogen, und Körper gleicher Farbe sind zu einem Umriss vereinigt. Jede Farbe bleibt ein eigener Pfad ohne Füllung, so dass eine Lasersoftware sie als Ebenen trennt.

Das Fenster hängt an seinem Knopf. Verdeckt es etwas, ziehst du es an seiner Titelleiste frei über die Arbeitsfläche; dort öffnet es sich auch beim nächsten Mal. Ein Doppelklick auf die Titelleiste oder das Ablegen am Knopf bringt es zurück.

Das X und [[Esc]] schließen das Fenster; läuft gerade eine Messung, beendet [[Esc]] zuerst sie. Der Schnitt bleibt, bis du ihn mit {{ui:camera.sectionActive}} ausschaltest oder zur Entwurfsübersicht zurückgehst. Solange er an ist, ist der Knopf hervorgehoben. Was du dann auf der weggeschnittenen Seite ablegst, siehst du erst, wenn du den Schnitt ausschaltest. Ein Tablet hat kein [[Esc]], deshalb hat das Fenster dort zwei Knöpfe mehr: {{ui:camera.sectionBack}} beendet die Messung, falls eine läuft, und schließt sonst das Fenster, {{ui:camera.sectionConfirm}} schließt das Fenster in einem Schritt. Ein Computer zeigt sie nicht.

## Die Arbeitsebene

Neue Formen richten sich nach der Arbeitsebene. Anfangs ist das die Grundplatte mit dem Gitter. Du kannst sie aber auf jede Fläche legen, um etwas seitlich oder auf eine schräge Fläche zu setzen.

1. Drücke [[W]] oder klicke auf {{ui:camera.placeWorkplane}}.
2. Fahre mit der Maus über eine Fläche eines Körpers. Sie wird hervorgehoben.
3. Ein Klick legt die Arbeitsebene dorthin. Alles, was du jetzt hinzufügst, sitzt auf dieser Fläche.

Klickst du dabei auf die freie Platte, liegt die Arbeitsebene flach an der Stelle, auf die du geklickt hast, am Raster eingerastet. Neue Formen und eine fertige Skizze, auch ein Drehkörper, entstehen dann dort statt in der Mitte der Platte. Solange die Arbeitsebene so flach auf der Platte liegt, zeigt die Grundplatte nur noch ihren Rand: Zwei Gitter in derselben Ebene würden ein flimmerndes Muster ergeben.

Auf einer Fläche rastet der Ursprung der Arbeitsebene sonst am Raster ein. Klickst du nahe an eine Ecke der Fläche, sitzt er genau auf dieser Ecke. Nahe an einer Kante liegt er auf der Kante, und das Raster richtet sich nach ihr aus; so wählst du den Winkel des Rasters bewusst. Ohne Ecke oder Kante läuft das Raster auf einer liegenden Fläche parallel zum Körper, bei einem gedrehten Quader also mit ihm gedreht.

Ein Klick neben die Platte oder [[Esc]] holt die Arbeitsebene zurück auf die Grundplatte. Schneller geht es mit {{ui:camera.resetWorkplane}}: Der Knopf mit dem Pfeil nach unten steht in der Kameraleiste unter dem Auge, solange die Ebene auf einer Fläche liegt. Mit [[Umschalt]]+[[W]] legst du sie direkt auf die gerade ausgewählte Fläche. [[Alt]]+[[W]] legt sie jederzeit zurück auf die Grundplatte, ob etwas ausgewählt ist oder nicht. Hältst du beim Klicken [[Umschalt]] gedrückt, zeigt die Ebene in die andere Richtung.

Solange die Arbeitsebene auf einer Fläche liegt, erscheint neben {{ui:camera.placeWorkplane}} ein Auge. Es blendet die Ebene aus, ohne sie aufzuheben, damit du freie Sicht auf den Entwurf hast: Neue Formen landen weiter auf dieser Fläche, und gedreht wird weiter um sie. Ein Klick auf das Auge blendet sie wieder ein, ebenso das Setzen einer neuen Arbeitsebene.

## Gitter und Raster

Das Gitter zeigt die Größe der Platte. Unten rechts steht das **Raster**: Verschieben und Skalieren rasten in Schritten dieser Größe ein, zum Beispiel 1 mm. Für Feinarbeit stellst du es kleiner, für grobes Anordnen größer. {{ui:editor.tool.snapToGrid}} im Menüband rückt die ausgewählten Formen nachträglich auf das nächste Rasterkreuz. Beim Verschieben rasten Formen außerdem an anderen Formen ein, siehe [Auswählen und Anordnen](chapter:auswaehlen-und-anordnen). Ohne Maus: [[Alt]]+[[1]] bis [[Alt]]+[[0]] wählen den Eintrag mit dieser Nummer im Menü ([[Alt]]+[[1]] schaltet das Einrasten aus), [[,]] und [[.]] machen den Schritt eine Stufe feiner oder gröber. Das geht auch in einer Skizze.

> **Tipp:** Dreh die Ansicht nicht mehr, wenn du Teile genau aneinander setzt. Wechsle mit den Zifferntasten in die gerade Ansicht von oben oder von vorn und schalte mit [[O]] auf die flache Darstellung um. So erkennst du sofort, ob zwei Kanten wirklich bündig sind.

### Das Einstellungsfenster

Das Zahnrad im Menüband ({{ui:editor.workspaceSettings}}) öffnet die Einstellungen. Links liegen fünf Bereiche: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} und {{ui:workspace.history}}. Eine Änderung gilt sofort. {{ui:workspace.makeDefault}} unten sichert die aktuellen Einstellungen als Vorgabe, sodass ein neues Design mit ihnen beginnt. Eine geöffnete Datei bringt ihre eigenen Einstellungen mit; {{ui:workspace.useMyDefault}} daneben legt deine gesicherten Farben, das Raster und das Übrige auf den offenen Entwurf und lässt die Einheiten unberührt. Steht in deiner Vorgabe ein Drucker, kommt er mit seiner Plattengröße mit; sonst behält der Entwurf seine Platte und seinen Drucker. {{ui:workspace.close}} oben rechts schließt das Fenster. Dieser Teil geht die Einstellungen eine nach der anderen durch.

### Darstellung: Thema, Leiste und Ansichtswürfel

{{ui:workspace.theme}} legt das Farbschema des ganzen Programms fest: {{ui:workspace.themeSystem}} folgt deinem Rechner, dazu kommen {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} und {{ui:workspace.themeGraphite}}. Du kannst es auch oben rechts im Editor ändern.

{{ui:workspace.toolbarSize}} macht die Knöpfe der Leiste oben, ihr Formenmenü, die Kamerasteuerung links und die Eigenschaftentafel rechts kleiner oder größer: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (wie bisher) oder {{ui:workspace.toolbarSizeLarge}}. Klein lässt auf einem Laptop mehr Platz für die Arbeitsebene, groß trifft sich leichter auf einem großen Bildschirm oder mit dem Finger. Mit großen Knöpfen gehen die Gruppen der Leiste in eine zweite Zeile, wenn das Fenster für sie zu schmal ist. Die Größe merkt sich dieser Browser, sie gilt für jedes Design.

{{ui:workspace.shapeColors}} zeigt auf den Bildern der Formenbibliothek die Farbe, in der eine neue Form beginnt (die Farbe ihrer Art oder die, die du mit {{ui:inspector.saveDefaults}} gespeichert hast). Schalte es aus, wenn dir graue Bilder lieber sind; dein Browser merkt sich die Wahl.

{{ui:workspace.viewCubePosition}} stellt den Ansichtswürfel in eine andere Ecke der Arbeitsfläche: {{ui:workspace.viewCubePositionTopLeft}} (wie bisher), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} oder {{ui:workspace.viewCubePositionBottomRight}}. In jeder Ecke außer oben links rückt die Kamerasteuerung nach oben an den Platz, den der Würfel frei gemacht hat. Unten rechts steht der Würfel knapp über der Auswahl {{ui:inspector.snapGrid}}. Solange rechts die Eigenschaften einer Form offen sind, weicht ein Würfel auf der rechten Seite links daneben aus. Die Ecke merkt sich dieser Browser, sie gilt für jedes Design. In einem schmalen Fenster, etwa auf dem Handy, ist die Einstellung ausgeblendet und der Würfel bleibt oben links.

### Darstellung: Schnellmodus

{{ui:workspace.fastMode}} ist für langsamere Rechner. Er schaltet Schatten, Kantenlinien an allen Körpern und das Nachlaufen der Kamera aus und zeichnet die Ansicht nur in Bildschirmauflösung. Deine eigenen Einstellungen bleiben für später erhalten, und die Schalter, die er überstimmt, zeigen {{ui:workspace.offInFastMode}}, solange er an ist. Was sonst auf einem langsamen Rechner hilft, steht unten unter „Wenn sich layerling langsam anfühlt“.

### Darstellung: Farben des Arbeitsbereichs und der Skizze

Die Farben des Arbeitsbereichs stellst du unter {{ui:workspace.appearance}} ein: {{ui:workspace.backgroundColor}} und {{ui:workspace.surfaceColor}} für das helle Thema (die dunklen Themen behalten ihre eigenen), die Rasterfarbe liegt unter {{ui:workspace.workplane}}. Jede Farbe ist ein Knopf, der die Farbe zeigt. Ein Klick öffnet ein kleines Fenster mit dem Farbfeld, einer Reihe fertiger Farben, einem Feld für den Hex-Wert und einem Pfeil, der die Farbe auf den Start von layerling zurückstellt. [[Enter]] übernimmt einen eingetippten Hex-Wert, ein Klick außerhalb des Fensters ebenso.

Die Skizzenansicht hat eigene Farben: {{ui:workspace.sketchBackground}} für das Fenster rund um die Fläche, {{ui:workspace.sketchPlateColor}} für die Fläche unter dem Raster und {{ui:workspace.sketchGridColor}}, alle für das helle Thema. {{ui:workspace.sketchMatch}} übernimmt die drei Farben des Arbeitsbereichs mit einem Klick.

{{ui:workspace.classicLook}} stellt den Arbeitsbereich so ein, wie Tinkercad ihn zeigt: weißer Hintergrund, hellblaues Raster im Millimeterabstand mit einer kräftigen Linie jeden Zentimeter, schwarze Kantenlinien, Licht von oben mit weichen Schatten. Danach lässt sich jeder Wert weiter einzeln ändern. Alle starten so, wie layerling immer aussah, und was passt, hängt auch von deinem Monitor ab.

![Die Einstellungen unter Darstellung: Hintergrund- und Arbeitsebenenfarbe für das helle Thema und der Schalter für Kantenlinien an allen Körpern.](shot:settings-appearance)

![Der Editor im dunklen Farbschema. Das Farbschema stellst du oben rechts ein: System, Hell, Dunkel oder Graphit.](shot:editor-dark)

### Darstellung: Achsenpfeile und Kantenlinien

{{ui:workspace.showAxes}} (zunächst an) zeichnet am hinteren linken Eck der Platte drei Pfeile: **X** in Rot nach rechts, **Y** in Grün nach hinten und **Z** in Blau nach oben, so wie die Positionsfelder zählen. Das ist die Rechte-Hand-Regel, die auch Tinkercad, CAD-Programme und die Slicer nutzen. Liegt die Arbeitsebene auf einer Fläche, wandern sie mit. Hier schaltest du sie aus, wenn sie stören.

{{ui:workspace.edgeLines}} zeichnet an jedem Körper eine Umrisslinie in der Farbe von {{ui:workspace.edgeColor}} (zunächst Schwarz, wie bei Tinkercad): Das hilft, wenn dunkle Farben ineinander verschwimmen. Es ist zunächst aus, und sehr große importierte Netze bleiben ausgenommen.

![Drei dunkle Körper mit eingeschalteten Kantenlinien: Die Umrisse halten sie auseinander.](shot:edge-lines)

{{ui:workspace.strongHoles}} zeichnet Löcher in dunklerem Grau, weniger durchsichtig und mit einer dunklen Linie drumherum. Das hilft, wenn ein Loch zwischen durchsichtigen Körpern schwer zu finden ist. Anders als die Kantenlinien bleibt es auch im Schnellmodus an.

### Darstellung: Licht und Schatten

{{ui:workspace.showShadows}} schaltet die Schlagschatten ein und aus. Zwei Regler bestimmen, wie die Körper beleuchtet sind. {{ui:workspace.shadowStrength}} sagt, wie dunkel die Schlagschatten sind, und {{ui:workspace.shadeContrast}} schiebt Licht vom gleichmäßigen Umgebungslicht zum Hauptlicht: Richtung „kräftig“ werden die Schattenseiten dunkler und die Schatten besser sichtbar, Richtung „weich“ wird alles flacher. Am oberen Ende wird der Kontrast sehr kräftig, sodass Schattenseiten und Schatten richtig dunkel werden. {{ui:workspace.shadowSoftness}} macht die Ränder der Schatten weich statt scharf. {{ui:workspace.lightAzimuth}} dreht das Hauptlicht um die Platte (0° von vorn, 90° von rechts), und {{ui:workspace.lightElevation}} hebt es an, bei 90° steht es wie bei Tinkercad senkrecht über der Platte, und die Schatten fallen genau unter die Körper. {{ui:workspace.softLighting}} holt das meiste Licht aus deiner Blickrichtung, es dreht mit der Ansicht: Keine Fläche bleibt dunkel, und eine nach oben gerichtete Fläche einer dunklen Farbe wird nicht mehr weiß überstrahlt. Das Hauptlicht bleibt schwach für die Schatten, und der Kontrastregler wirkt weiter. Zeigt sich bei tief stehendem Licht doch noch ein heller Fleck, hebe {{ui:workspace.lightElevation}} auf 90°: Dann sieht es aus wie bei Tinkercad. {{ui:workspace.lightReset}} stellt alles zurück.

### Darstellung: Maße auf der Arbeitsebene

{{ui:workspace.showMoveDimensions}} zeigt beim Verschieben, um wie viel du dich bewegst, {{ui:workspace.showOriginDimensions}} die Abstände der Auswahl zum Nullpunkt der Platte, auch bei mehreren markierten Körpern. Mit {{ui:workspace.dimensionsAlwaysVisible}} bleiben diese Maße dauerhaft sichtbar und nicht nur, solange du ziehst. Ist ein gedrehter Körper ausgewählt, stehen seine Winkel unter ihm auf der Arbeitsebene; {{ui:workspace.showRotationAngles}} schaltet das aus. Mehr unter [Messen und Notizen](chapter:messen-und-notizen).

### Darstellung: Auswählen und Verschieben

{{ui:workspace.selectBeforeMoving}}: Ein Körper muss dann zuerst ausgewählt werden, und erst das nächste Ziehen verschiebt ihn. Das hilft, wenn Kinder oder hastige Hände Körper anfassen, und auf einem Touchscreen.

{{ui:workspace.frameByDirection}}: Ein nach rechts gezogener Rahmen nimmt nur, was ganz in ihm liegt, ein nach links gezogener alles, was er berührt (gestrichelt gezeichnet), wie in SketchUp.

{{ui:workspace.doubleClickOpensSketch}} bestimmt, ob ein Doppelklick auf eine extrudierte Skizze die Skizze wieder öffnet, wie in Tinkercad, und {{ui:workspace.doubleClickOpensGroup}}, ob ein Doppelklick auf eine Gruppe oder ein Bündel sie zum Bearbeiten öffnet. {{ui:workspace.doubleClickCentersView}} bestimmt, ob ein Doppelklick auf eine leere Stelle der Arbeitsebene die Ansicht dorthin verschiebt.

{{ui:workspace.objectSnap}} lässt die Kanten und die Mitte einer Form beim Ziehen an anderen Formen einrasten; das Rastermenü unten rechts hat denselben Schalter. {{ui:workspace.cruise}} lässt eine neue Form am Mauszeiger hängen und auf der Fläche darunter landen, wie Cruise in Tinkercad; ausgeschaltet erscheint eine neue Form in der Mitte der Platte. Mehr unter [Auswählen und Anordnen](chapter:auswaehlen-und-anordnen).

### Darstellung: die Ansicht

{{ui:workspace.startInPerspective}}: Der Editor öffnet dann in der perspektivischen Ansicht, nicht in der flachen.

{{ui:workspace.startView}} legt den Blickwinkel fest, in dem ein neuer Entwurf öffnet und zu dem {{ui:camera.home}} zurückkehrt. Dreh und zoome die Ansicht, wie du sie magst, und klicke dann {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} bringt den gewohnten Blick von vorne rechts zurück. Das gilt für alle Entwürfe in diesem Browser. Ein Entwurf, den du wieder öffnest, öffnet weiter so, wie du ihn verlassen hast.

{{ui:workspace.zoomSpeed}} ist ein Regler von langsam bis schnell: wie schnell Rad und Trackpad zoomen; die Zoomknöpfe und -tasten behalten ihre eigenen kleinen Schritte. {{ui:workspace.cameraInertia}}: Lässt du die Maus nach dem Drehen los, dreht die Ansicht noch kurz weiter und bremst sanft ab. Ausgeschaltet bleibt sie sofort stehen, wie in Tinkercad und Fusion 360.

{{ui:workspace.overhangAngle}} ist der Winkel, ab dem eine Fläche als Überhang gilt, wenn du im Sichtbarkeitsmenü Überhänge zeigen einschaltest: Diese Flächen sind rot und weiß schraffiert. 30° ist vorsichtig, 70° rechnet mit guter Kühlung des Drucks; 45° ist der übliche Start.

{{ui:workspace.booleanTriangleLimit}} begrenzt, wie viele Dreiecke ein importiertes Netz haben darf, wenn du es schneidest, verschmilzt oder zu einer Schnittmenge machst, denn das wird in deinem Browser gerechnet. Ein Netz über dem Limit wird nicht verarbeitet; vereinfache es zuerst oder hebe das Limit an, wenn dein Rechner es verträgt. Ein höheres Limit kann den Editor für einige Sekunden einfrieren.

### Maße: Einheiten, Maßstab und Rasterschritte

Unter {{ui:workspace.measurement}} stellst du die {{ui:workspace.units}} ein, die Einheit, in der Maße erscheinen ({{ui:workspace.scale}}: Millimeter, Zentimeter oder Meter im metrischen System, Zoll oder Fuß im imperialen), wie viele Nachkommastellen eine Zahl zeigt ({{ui:workspace.accuracy}}), das {{ui:workspace.snapGrid}}, in dem Verschieben und Skalieren einrasten, und eigene Rasterschritte unter {{ui:workspace.customSnapGrids}}.

Unter {{ui:workspace.measurement}} in den Einstellungen stellst du die {{ui:workspace.units}} ein. Mit {{ui:units.imperial}} zeigt layerling alle Maße in Zoll, an der Form, im Eigenschaftenfeld, bei Maßband und Lineal. Das Raster bietet dann Schritte von 1/64 bis 1 Zoll, und das Gitter auf der Platte wird in Zoll gezeichnet (1/8 bis 1 Zoll, Vorgabe 1/4 Zoll), mit einer kräftigeren Linie bei jedem vollen Zoll. Bei {{ui:workspace.inchFormat}} wählst du, ob Zoll als Bruch wie in Tinkercad erscheinen (1 5/8, auf 1/64 Zoll gerundet) oder als Dezimalzahl (1.625) mit so vielen Nachkommastellen, wie unter {{ui:workspace.accuracy}} eingestellt ist. Eintippen kannst du beides, auch „1 5/8“. Schneller geht der Wechsel zwischen Millimeter und Zoll mit dem kleinen Schalter **mm | in** neben dem {{ui:inspector.snapGrid}} unten im Eigenschaftenfenster: Er ändert die Einheit, das Raster der Platte und die Fangstufe wie die Einstellungen, für diesen Entwurf.

Unter {{ui:workspace.customSnapGrids}} an derselben Stelle legst du eigene Rasterschritte an: einen Namen und eine Größe in Millimetern, zum Beispiel „Rastermaß 2,54 mm" für den Abstand von DIP-Chips, Stiftleisten und Lochrasterplatinen oder „MX Key Unit" mit 19,05 mm für den Abstand von Tastaturtasten. Das Rastermenü bietet dieses Maß dann ganz, halbiert und geviertelt an (1 ×, ½ × und ¼ ×), sodass sich Formen um ein ganzes, ein halbes oder ein viertel Rastermaß verschieben lassen. Willst du nur das Maß selbst, nimm den Haken bei {{ui:workspace.customSnapGridParts}} daneben weg; das Menü hat dann nur diesen einen Schritt. Eigene Schritte bleiben beim Entwurf und gehen mit {{ui:workspace.makeDefault}} mit.

### Arbeitsebene: Platte und Drucker

{{ui:workspace.printer}} stellt die Arbeitsebene auf die Druckplatte deines Druckers ein und markiert Körper, die darüber hinausragen, siehe [Drucken](chapter:drucken). {{ui:workspace.showPlateLabels}} schreibt den Namen des Designs auf die Platte und, wenn ein Drucker gewählt ist, seinen Namen und sein Bauvolumen.

{{ui:workspace.size}} gibt der Platte eine eigene Größe, mit {{ui:workspace.width}} und {{ui:workspace.length}} in Millimetern oder der gewählten Einheit. Das Gitter läuft immer durch den Nullpunkt, sodass die kräftigen Linien auf den Achsen liegen, wie groß die Platte auch ist.

### Arbeitsebene: Gitter

{{ui:workspace.showGrid}} zeigt oder verbirgt das Gitter auf der Platte. {{ui:workspace.gridBlockSize}} legt den Abstand seiner Linien fest, {{ui:workspace.gridMajorEvery}}, ob die kräftige Linie alle 5 oder alle 10 Rasterschritte kommt; {{ui:workspace.gridMajorColor}} gibt ihr eine eigene Farbe, und Mittelkreuz und Plattenrand nehmen sie dann mit. {{ui:workspace.gridColor}} ist die Farbe der gewöhnlichen Linien.

Alle Linien des Rasters werden beim Hineinzoomen breiter, wie in Tinkercad, und bleiben beim Herauszoomen sichtbar. Wem das zu viel ist, schaltet {{ui:workspace.gridLinesGrow}} aus, dann bleiben die Linien bei jedem Zoom einen Pixel breit, wie in der Skizze.

Ist das Raster verschwunden, etwa weil eine Farbe auf die der Platte gestellt wurde, bringt {{ui:workspace.resetGrid}} am Ende des Bereichs {{ui:workspace.workplane}} Sichtbarkeit, Farben, Abstand und Linienstärke auf den Standard zurück, hier und in der mit {{ui:workspace.makeDefault}} gesicherten Vorgabe.

### Formvorgaben

Unter {{ui:workspace.shapeDefaults}} wählst du mit {{ui:workspace.shape}} eine Form und legst fest, wie sie beim Hinzufügen beginnt: ihre Breite, Länge und Höhe. {{ui:workspace.useAppDefaults}} stellt die Form auf das zurück, womit die App sie startet. Formen mit eigenen Einstellungen zeigen sie unter {{ui:workspace.shapeDetails}}. Die Werte gelten für neue Formen, nicht für die schon auf der Platte. {{ui:workspace.customLimit}} setzt eine eigene Obergrenze dafür, wie groß die Anfasser und die Eigenschaften diese Form machen dürfen; leer gelassen bleiben die üblichen Grenzen.

### Gespeicherter Verlauf

Unter {{ui:workspace.history}} legt der Regler {{ui:workspace.savedHistory}} fest, wie viele abgeschlossene Aktionen nach dem Speichern oder Wiederöffnen eines Designs für Rückgängig erhalten bleiben. Standard sind 100 Aktionen im Design. Ein niedrigeres Limit verwirft die älteren Rückgängig-Schritte des Designs dauerhaft.

## Wenn sich layerling langsam anfühlt

layerling rechnet und zeichnet alles in deinem Browser. Auf einem älteren Rechner, mit einer schwachen Grafikkarte oder auf mehreren großen Bildschirmen kann die Ansicht deshalb zäh wirken. Das hilft:

- **{{ui:workspace.fastMode}}** unter {{ui:workspace.appearance}} schaltet auf einen Schlag alles ab, was die Ansicht viel Kraft kostet: Schatten, Kantenlinien an allen Körpern und das Nachlaufen der Kamera. Außerdem zeichnet er die Ansicht nur in der Auflösung des Bildschirms, auf hochauflösenden Bildschirmen sind das bis zu viermal weniger Bildpunkte. Deine eigenen Einstellungen bleiben dabei erhalten und gelten wieder, sobald du ihn ausschaltest.
- **Die Kamera läuft nach:** Lässt du die Maus nach dem Drehen los, dreht die Ansicht kurz weiter und bremst sanft ab. Das ist Absicht und kein Ruckeln. Wer es von Tinkercad oder Fusion 360 anders kennt, schaltet {{ui:workspace.cameraInertia}} unter {{ui:workspace.appearance}} aus, dann steht die Ansicht sofort.
- **Einzelne Schalter:** Ohne Schnellmodus kannst du auch nur {{ui:workspace.showShadows}} oder {{ui:workspace.edgeLines}} ausschalten.
- **Die Grafikkarte nutzen:** Öffne in Chrome `chrome://gpu` (in Edge `edge://gpu`). Bei „WebGL" sollte „Hardware accelerated" stehen. Steht dort „Software only", ist die Hardwarebeschleunigung in den Browsereinstellungen aus. Unter Windows kannst du außerdem in den Einstellungen unter System → Bildschirm → Grafik für den Browser „Hohe Leistung" wählen, damit er die eigentliche Grafikkarte nimmt und nicht die schwächere im Prozessor.
- **Große importierte Netze vereinfachen:** Ein Modell aus vielen Hunderttausend Dreiecken bremst jede Ansicht. Wie du es ausdünnst, steht im Kapitel über Dateien unter „Ein importiertes Netz vereinfachen".
- **Andere Tabs schließen:** Jeder offene layerling-Tab und jede andere 3D-Seite teilt sich dieselbe Grafikkarte.
