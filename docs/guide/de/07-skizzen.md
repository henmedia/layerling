---
title: Skizzen: vom Umriss zum Körper
summary: Einen flachen Umriss zeichnen, Ecken runden oder fasen und daraus einen Körper ziehen oder drehen.
---

Nicht alles lässt sich aus Grundformen zusammensetzen. Für Teile mit eigener Kontur, etwa einen Halter, ein Zahnprofil oder eine Vase, zeichnest du zuerst den **Umriss** und machst dann einen Körper daraus. Dafür gibt es den Skizzenmodus.

## Eine Skizze beginnen

Wechsle oben von {{ui:editor.modeGeometry}} auf {{ui:editor.modeSketch}}. Klicke im Menüband auf {{ui:sketch.to3d}} und wähle, was aus dem Umriss werden soll:

- **{{ui:sketch.extrude}}:** Der Umriss wird in die Höhe gezogen, wie eine Ausstechform.
- **{{ui:sketch.revolve}}:** Der Umriss wird um eine Achse gedreht, wie bei einer Drehbank. So entstehen Vasen, Becher, Kegel und alles, was rund ist.

Danach zeigt der Editor ein Blatt mit Gitter. Das ist deine Zeichenfläche.

## Zeichnen

Das Menüband des Skizzenmodus ist in Bereiche geteilt:

- **Zeichnen:** {{ui:sketch.line}} setzt gerade Abschnitte: Punkte nacheinander anklicken; mit gehaltener [[Umschalt]]-Taste rastet die neue Linie in 15°-Schritten ein, waagerecht und senkrecht eingeschlossen. Am Zeiger stehen Länge und Winkel der neuen Linie. Wie lang sie werden soll, kannst du auch eintippen, siehe [Linien nach Maß](#linien-nach-mass). Die {{ui:sketch.bezier}} spannst du an ihren Griffen: Punkt anklicken und ziehen, und zwar in die Richtung, in der die Linie weiterlaufen soll, wie mit dem Zeichenstift in Illustrator oder Inkscape. Je weiter du ziehst, desto stärker biegt sie sich; der Abschnitt zum neuen Punkt biegt sich schon während des Ziehens mit, so dass du siehst, was entsteht. Das Ziehen beim Setzen formt die Kurve; wer aus Tinkercad kommt und nur Punkte anklicken will, nimmt die {{ui:sketch.smooth}}. Die {{ui:sketch.smooth}} legt einen fließenden Verlauf durch die Punkte, die du anklickst. Um den Umriss zu schließen, klickst du am Ende wieder auf den ersten Punkt.
- **Formen:** {{ui:sketch.addShape}} bietet fertige Umrisse: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (eine Scheibe mit Bohrungen), {{ui:sketch.triangle}} und {{ui:sketch.hexagon}}. Wähle eine aus und ziehe einen Rahmen auf.
- **Auswahl:** {{ui:sketch.select}} verschiebt Punkte und Linien. Ein Klick in einen geschlossenen Umriss wählt den ganzen Umriss, so dass du ihn gleich verschieben oder skalieren kannst; in einem Loch wird das Loch gewählt. Der Rahmen um die Auswahl hat acht Griffe: Die an den Ecken ändern Breite und Höhe zugleich, mit gehaltener [[Umschalt]]-Taste im gleichen Verhältnis. Die an den Seiten ändern nur eine Richtung. Die Maßblasen für Breite und Höhe lassen sich anklicken; dort tippst du ein neues Maß ein, gern auch als Rechnung („60+12,5“) oder in Prozent („150%“). Mit [[Umschalt]] nimmst du per Klick weitere Punkte und Linien dazu oder wieder weg, so dass du mehrere auf einmal verschieben kannst. Ein Rahmen über freier Fläche wählt alles darin. Auch eine Linie lässt sich ziehen (sie wandert an ihren beiden Enden, oder die ganze Auswahl, wenn sie zu einer gehört). Die Pfeiltasten verschieben die Auswahl um einen Rasterschritt, mit [[Umschalt]] um einen größeren, und [[Umschalt]] beim Ziehen hält die Bewegung auf einer Achse. {{ui:sketch.refine}}: Ein Klick auf einen Abschnitt setzt einen Punkt, ein Klick auf einen Punkt entfernt ihn. Dazu kommen {{ui:sketch.erase}} und das Einfügen eines Vorlagenbilds ({{ui:sketch.addImage}}).
- **Zwischenablage:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} und {{ui:editor.tool.delete}} wirken auf die gewählten Punkte, Linien und Bilder, wie im 3D-Editor; [[Strg]]+[[X]] schneidet aus. Eingefügtes und Dupliziertes landet mit 10 mm Abstand neben dem Original, an einer freien Stelle, an der es keine vorhandene Linie berührt, so dass es nie mit dem Bestehenden verbunden wird. Es bleibt ausgewählt, so dass du es gleich an seinen Platz ziehen kannst.
- **Verlauf:** {{ui:sketch.undo}} und {{ui:sketch.redo}}.
- **Ansicht:** [[F]] holt die ganze Skizze ins Bild, [[Umschalt]]+[[F]] zoomt auf die Auswahl, wie im 3D-Editor. Das {{ui:camera.tapeTools}} in der Seitenleiste misst den Abstand zwischen zwei Punkten. Außerdem zeigt die Skizze Maße, sobald du etwas anklickst: bei einer Linie ihre Länge, bei einem Punkt die Längen der Linien, die dort zusammentreffen. Die Schaltfläche {{ui:sketch.showMeasurements}} in der Seitenleiste blendet diese Maße aus und wieder ein, wenn sie stören, zum Beispiel beim Formen von Kurven; das Bandmaß funktioniert weiter. Bei einer geraden Linie kannst du die Maßblase anklicken und die Länge in Millimetern eintippen; [[Enter]] übernimmt sie, [[Esc]] bricht ab. Die Linie behält ihre Richtung, ihr Anfangspunkt bleibt stehen, und die Linien am anderen Ende gehen mit. Ist ein Endpunkt markiert, wandert dieser. Mit [[Alt]]+[[Enter]] wächst die Linie zu beiden Seiten und behält ihre Mitte. Bei Kurven zeigt die Blase nur die Länge.

Ein Körper entsteht nur aus einem **geschlossenen** Umriss.

![Ein L-förmiger Umriss. Am gewählten Eckpunkt oben links stehen die Längen der beiden Linien in Millimetern und der Winkel dazwischen in Grad.](shot:sketch-outline)

## Linien nach Maß

Hast du mit {{ui:sketch.line}} oder {{ui:sketch.smooth}} den ersten Punkt gesetzt, tippst du einfach eine Zahl: Neben der Linie öffnen sich zwei Felder, {{ui:sketch.typedLength}} in Millimetern und {{ui:sketch.typedAngle}} in Grad. Mit [[<]] oder [[Tab]] wechselst du zum Winkel, so dass „50<30“ eine 50 mm lange Linie unter 30° ergibt, wie in AutoCAD. [[Enter]] setzt den Punkt, und du tippst gleich die nächste Linie; [[Esc]] schließt die Felder, ohne den Linienzug zu beenden.

Der Winkel zählt von rechts gegen den Uhrzeigersinn: 0° nach rechts, 90° nach oben, 180° nach links, 270° nach unten. Lässt du ihn leer, folgt die Linie dem Zeiger, du gibst also nur die Länge vor und zeigst die Richtung mit der Maus. Rechnungen wie „40+12,5“ gehen in beiden Feldern. Würde der Punkt neben der Platte landen, sagt das Feld es dir und wartet auf ein anderes Maß.

## Eine gerade Seite krümmen

Wähle eine gerade Linie und klicke in der Leiste, die erscheint, auf {{ui:sketch.curveLine}}: Die Seite wölbt sich wie bei Tinkercad zu einer Kurve und zeigt ihre beiden Griffe. Ziehe daran, um die Kurve zu formen; je weiter ein Griff absteht, desto stärker die Biegung. {{ui:sketch.straightenLine}} macht die Seite wieder gerade. Einen gewählten Punkt kannst du mit {{ui:sketch.smooth}} rund machen: Er bekommt eigene Griffe, und die Linien daneben werden zu Kurven.

![Die untere Seite des L-förmigen Umrisses zu einer Kurve gebogen, mit ihren zwei Griffen an den Enden.](shot:sketch-curve)

## Winkel ablesen und eintippen

Klickst du einen Eckpunkt an, an dem **zwei gerade Linien** zusammentreffen, zeigt layerling neben den Längen den **Winkel** dazwischen in Grad, mit einem kleinen Bogen. In einem geschlossenen Umriss ist es der Winkel im Inneren der Form, eine Einbuchtung liest sich also über 180°. Klicke auf den Wert und tippe einen neuen Winkel. Dann dreht sich eine der beiden Linien um die Ecke und behält ihre Länge, die andere bleibt, wo sie ist. Die Linie, die sich dreht, ist gestrichelt; mit [[Tab]] wechselst du zur anderen, [[Enter]] übernimmt und [[Esc]] bricht ab. Was am anderen Ende der gedrehten Linie hängt, geht mit.

Verschiebst du einen Punkt, ändern sich drei Winkel: an ihm selbst und an den beiden Nachbarecken am anderen Ende seiner Linien. Darum zeigt layerling auch diese beiden, und jeder lässt sich anklicken und eintippen. So stellst du etwa eine Ecke unten links auf 75,5°, während oben links der Punkt gewählt ist, der dafür wandert. Auch hier darfst du rechnen, z. B. „90-14,5“.

Wo eine Kurve an die Ecke stößt oder mehr als zwei Linien zusammenlaufen, gibt es keinen Winkel. Der Knopf {{ui:sketch.showMeasurements}} in der Seitenleiste blendet den Winkel zusammen mit den Längen aus.

## Ecken runden oder fasen

Klicke auf einen Eckpunkt und wähle {{ui:sketch.filletCorner}} oder {{ui:sketch.chamferCorner}}. Es erscheint ein kleines Feld für den {{ui:sketch.filletRadius}} beziehungsweise den {{ui:sketch.chamferDistance}}. Trage das Maß ein und bestätige mit dem Haken. Das geht für Ecken zwischen zwei geraden Linien.

![Die Ecke oben links wird mit 12 mm Radius verrundet.](shot:sketch-fillet)

## Ein Körper daraus machen

Klicke auf {{ui:sketch.finishSketch}}. Der Umriss steht als Körper auf der Arbeitsebene und trägt den Namen „Skizzenkörper“. In seinen Einstellungen änderst du die Höhe, die Farbe und alles Weitere wie bei jeder anderen Form. Änderst du seine Größe, baut layerling ihn kurz danach aus der Skizze neu auf, und die Skizze wächst mit. So bleibt er ein exakter Körper, an dem Fase und Rundung gehen, und beim nächsten Bearbeiten hat die Skizze die Größe, die der Körper hat.

Liegt die Arbeitsebene auf einer Seite eines Körpers, zeichnest du so, wie du auf diese Seite schaust: Oben in der Skizze ist auch am fertigen Körper oben. Der blasse Umriss des Körpers in der Skizzenansicht zeigt, wo er steht. Schneidet die Arbeitsebene durch einen Körper, zeigt die Skizzenansicht stattdessen den Umriss dieses Schnitts: Ein ausgehöhlter Körper erscheint als Ring, und du kannst die Skizze an seinen Wänden ausrichten. Ein Punkt, den du nahe an eine Ecke dieser Umrisse setzt oder ziehst, rastet genau dort ein; ein kleiner blauer Ring zeigt das an. So übernimmst du Kanten anderer Körper in die Skizze, auch wenn die Arbeitsebene nicht genau auf ihnen liegt.

![Aus dem Umriss ist ein Körper geworden. Die Ecke ist gerundet.](shot:sketch-result)

Mit {{ui:inspector.editSketch}} kehrst du jederzeit in die Skizze zurück, um sie zu ändern. Ein Doppelklick auf den Körper tut dasselbe, wie bei Tinkercad (ein gesperrter Körper bleibt zu); in den Einstellungen lässt sich das mit {{ui:workspace.doubleClickOpensSketch}} abschalten. Kantenbearbeitungen, die du an dem Körper schon gemacht hast, gehen dabei allerdings verloren, weil die Kanten neu entstehen.

### Rotieren

Beim Rotieren zeichnest du den halben Querschnitt **links von der Achse**, die in der Skizze eingezeichnet ist. Daneben siehst du eine 3D-Vorschau der Drehung. Sie zeigt sofort, wie der Körper aussieht. Der Umriss muss geschlossen sein. Zum Schluss klickst du auf {{ui:sketch.finishRevolve}}.

Ein gedrehter Körper ist ein exakter Körper wie ein ausgezogener: Er nimmt Fasen und Verrundungen an, und du kannst ihn aushöhlen, für einen Becher oder eine Vase. Ein Körper, der mit einer älteren layerling-Fassung gedreht wurde, ist ein Netz; öffne {{ui:inspector.editSketch}} und schließe ihn neu ab, dann ist er exakt. Ein Umriss, der über die Achse hinausreicht, lässt sich nicht exakt bauen und wird wie bisher ein Netz.

## Als Kontur bauen

Normalerweise wird die Fläche innerhalb eines geschlossenen Umrisses zum Körper. Mit {{ui:sketch.stroke}} im Abschnitt {{ui:sketch.group.finish}} baust du stattdessen die Linie selbst, mit einer Breite, die du einstellst. Setze dazu in der Tafel das Häkchen bei {{ui:sketch.strokeOn}}. Die Skizze zeigt dann gleich, was entsteht.

- Ein **geschlossener Umriss** wird zu einem Rahmen. {{ui:sketch.strokeAlign}} sagt, wo die Wand liegt: {{ui:sketch.strokeAlign.center}} auf der gezeichneten Linie, {{ui:sketch.strokeAlign.inside}} innerhalb oder {{ui:sketch.strokeAlign.outside}} außerhalb. Außen ist praktisch für eine Toleranz: Zeichne den Umriss einer Aussparung, etwa eines Schwalbenschwanzes, und gib ihm 0,2 mm Kontur außen. So entsteht der Spalt, den der Druck braucht.
- Eine **offene Linie** wird zu einem Streifen, mittig auf der Linie. Unter {{ui:sketch.strokeCap}} wählst du, wie ihre Enden aussehen: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (um die halbe Breite verlängert) oder {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} gilt für beide: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} oder {{ui:sketch.strokeJoin.bevel}}.

Die Skizze behält die gezeichnete Linie. Öffnest du sie wieder, änderst du Linie und Kontur weiter, und ohne Häkchen wird wieder die Fläche gebaut. Kurven werden dabei in kurze gerade Stücke zerlegt. Beim Rotieren gibt es die Kontur nicht.

## Füllung und Silhouette

Die Kontur stellst du auch ein, ohne die Skizze zu öffnen: In den Eigenschaften eines Skizzenkörpers wählst du unter {{ui:prop.sketchFill}} {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} oder {{ui:prop.sketchFill.center}}, dazu {{ui:prop.sketchLineWidth}} und {{ui:sketch.strokeJoin}}. Der Körper wird gleich neu gebaut, an seinem Platz. Das entspricht den Füllarten beim SVG-Import in Tinkercad: Standard, Außenlinie und Innenlinie. {{ui:prop.sketchFill.grow}} lässt die Fläche gefüllt und vergrößert sie rundum um die Linienbreite, mit spitzen, runden oder abgeschrägten Ecken: eine Grundschicht unter einem Logo für den Mehrfarbdruck, die Kontur außen allein nur als Ring ergäbe.

{{ui:prop.sketchSilhouette}} lässt alle Umrisse weg, die in einem anderen liegen: Löcher und was in ihnen liegt. Übrig bleibt nur der äußere Umriss. Zusammen mit {{ui:prop.sketchFill.outside}} wird daraus ein Ausstecher: Importiere ein SVG zweimal, einmal mit Silhouette als Fläche für den Boden und einmal mit Silhouette und 1 bis 2 mm Kontur außen als Wand. Den Schalter gibt es auch in der Tafel {{ui:sketch.stroke}} im Skizzenmodus.

Verrundungen und Fasen an den Kanten gehen beim Neubau verloren, wie beim Bearbeiten der Skizze.

## Ein Bild als Vorlage

Mit {{ui:sketch.addImage}} legst du ein Foto oder eine Zeichnung unter die Skizze und zeichnest sie nach. Du kannst die Größe, die Deckkraft und die Lage einstellen. Sobald das Bild richtig liegt, sperrst du es mit [[L]], damit du es beim Zeichnen nicht versehentlich verschiebst. Ein gesperrtes Bild ist aus dem Weg: Klicks gehen durch es hindurch, du wählst also Linien und Punkte darauf an und ziehst einen Rahmen darüber. Um es wieder auszuwählen, etwa zum Entsperren, klickst du mit [[Alt]] darauf. Verdecken seine Einstellungen am rechten Rand das Bild, ziehst du sie an ihrer Titelleiste weg; ein Doppelklick darauf dockt sie wieder an.

Unter {{ui:sketch.imageAlign}} richtest du ein Foto aus, das nicht gerade aufgenommen wurde:

- **{{ui:sketch.imageRotation}}:** Drehe das Bild um seine Mitte, mit dem runden Griff über dem Rahmen oder als Zahl in Grad. Mit [[Umschalt]] rastet der Griff in 15°-Schritten ein.
- **{{ui:sketch.centreImageX}}** und **{{ui:sketch.centreImageY}}:** setzen die Bildmitte auf X = 0 beziehungsweise Y = 0. Beim Drehkörper ist X = 0 die Drehachse, das Bild liegt dann symmetrisch darüber.
- **{{ui:sketch.calibrateImage}}:** Klicke zwei Punkte im Bild, deren Abstand du kennst, etwa die Enden eines Lineals oder einen bekannten Durchmesser, und tippe den wirklichen Abstand ein. Das Bild wird gleichmäßig so skaliert, dass die Strecke stimmt; der erste Punkt bleibt, wo er war.
- **{{ui:sketch.cropImage}}:** Die Griffe am Rahmen schneiden das Bild zu statt es zu skalieren; was wegfällt, bleibt gespeichert und kommt mit {{ui:sketch.uncropImage}} oder beim Herausziehen eines Griffs zurück.

Alle vier wirken nur auf die Vorlage, nie auf die Skizze.

## Tasten im Skizzenmodus

| Taste | Wirkung |
| --- | --- |
| [[Esc]] | Linienzug beenden, Auswahl aufheben |
| [[Entf]] | gewähltes Element löschen |
| [[Strg]]+[[C]] | Auswahl kopieren |
| [[Strg]]+[[X]] | Auswahl ausschneiden |
| [[Strg]]+[[V]] | einfügen |
| [[Strg]]+[[D]] | Auswahl duplizieren |
| [[Strg]]+[[Z]] | rückgängig |
| [[Umschalt]] | beim Zeichnen: Linie in 15°-Schritten einrasten; beim Ziehen: Bewegung auf eine Achse beschränken |
| Ziffer, [[<]], [[Tab]], [[Enter]] | beim Zeichnen: Länge und Winkel der nächsten Linie eintippen und setzen |
| [[R]] | geschlossene Skizze um 45° drehen |
| [[L]] | Vorlagenbild sperren oder entsperren |

> **Tipp:** Zeichne so wenig Punkte wie nötig. Ein Umriss mit wenigen, sauber gesetzten Punkten ergibt einen glatteren Körper als ein Gewirr aus vielen.
