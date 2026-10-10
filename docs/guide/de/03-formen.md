---
title: Formen setzen und einstellen
summary: Die Formenbibliothek, Maße per Zahl und per Griff, Farbe, Drehen, Verjüngen und Verdrehen.
---

Jedes Teil in layerling beginnt mit einer Form. Aus ihnen baust du alles Weitere: Formen ergänzen einander, schneiden einander aus oder werden zu einer neuen Form verbunden.

## Eine Form hinzufügen

Klicke im Menüband auf {{ui:editor.addShape}}. Es öffnet sich die Formenbibliothek.

![Die Formenbibliothek. Jedes Bildchen ist aus der echten Geometrie der Form gerendert.](shot:shape-menu)

Wähle eine Form aus. Sie hängt jetzt am Mauszeiger und landet dort, wo du klickst. Fährst du dabei über einen Körper, legt sie sich auf die Fläche unter dem Zeiger, auch auf eine schräge, wie beim Cruise in Tinkercad; über der leeren Platte landet sie auf der Arbeitsebene. Drückst du [[Esc]], wird das Absetzen abgebrochen. Ein Werkzeug, das auf einen Klick wartet, etwa das Maßband, das Winkellineal, eine Notiz, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} oder die Kantenwerkzeuge, wird beim Wählen einer Form abgeschaltet, damit der Klick die Form absetzt. Umgekehrt legt das Einschalten eines dieser Werkzeuge die Form wieder weg. Wer die Form lieber direkt in der Mitte der Platte haben möchte, kann das Absetzen per Klick in den Einstellungen abschalten (Bereich {{ui:workspace.appearance}}, Schalter {{ui:workspace.cruise}}).

Was die Bibliothek bietet:

- **Grundformen:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (drei bis vierundzwanzig Seiten), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (mit drei bis vierundzwanzig Seiten, also auch dreiseitig), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} und {{ui:shape.torus}}.
- **Rohre:** {{ui:shape.tube}} und {{ui:shape.bentTube}} aus bis zu zwölf geraden Stücken mit Biegungen dazwischen, dazu der {{ui:shape.loft}} von einem Umriss zu einem anderen, etwa von eckig auf rund.
- **Zierformen:** {{ui:shape.star}}, {{ui:shape.heart}} und {{ui:shape.crescent}}.
- **Beschriftung:** {{ui:shape.text}}, auch auf einem Kreisbogen. Mehr im Kapitel [Text](chapter:text).
- **Mechanik:** {{ui:shape.thread}} (Gewindestange, Schraube, Mutter und Gewindeloch), {{ui:shape.spring}}, {{ui:shape.gear}} und die {{ui:shape.knurl}} für Griffe. Mehr im Kapitel [Gewinde und Mechanik](chapter:gewinde-und-mechanik).
- **Für Konstruktionen:** {{ui:shape.honeycomb}}, das druckbare {{ui:shape.hinge}}, {{ui:shape.dovetail}}, die {{ui:shape.teardrop}} für waagerechte Löcher, die {{ui:shape.counterbore}} und {{ui:shape.countersink}} für Schraubenköpfe und das {{ui:shape.ruler}}, das nur ein Messwerkzeug ist und in keinem Export auftaucht.

Ein Dreieck bekommst du auf zwei Wegen: Der {{ui:shape.polygon}} mit drei Seiten ist ein gleichschenkliges Dreieck, das „Dach“ aus Tinkercad, der {{ui:shape.wedge}} ein rechtwinkliges. Beide sind echte Dreiecksprismen. Für ein dreieckiges Loch kopierst du die Form, machst die Kopie kleiner, markierst sie als Aussparung und richtest sie mit {{ui:editor.tool.centerOnWorkplane}} oder {{ui:editor.tool.align}} aus. Beides arbeitet mit dem Umgrenzungskasten der Form, also dem kleinsten Quader, der sie umschließt; ein halbiertes Quadrat gilt deshalb weiter als ganzes Quadrat. Mit der Befehlssuche ([[Strg]]+[[K]]) findest du beide Formen auch unter „Dreieck“ oder „Dach“.

Die {{ui:shape.slot}} kann an einem Ende schmaler sein als am anderen, etwa für eine Abdeckung über einem Riemen zwischen zwei Riemenscheiben. Unter {{ui:inspector.properties}} stellst du dafür {{ui:prop.slotSmallEnd}} ein; das große Ende ist so breit wie die Kapsel, und die Seiten laufen gerade von einem Bogen zum anderen. {{ui:prop.slotCentreDistance}} ist der Abstand der beiden Bogenmitten, also wie weit die Riemenscheiben auseinanderliegen. Änderst du das kleine Ende, bleibt der Mittenabstand stehen und die Kapsel wird länger oder kürzer. Auch die verjüngte Kapsel bleibt ein exakter Körper zum Verrunden und für STEP.

## Die Einstellungen der Form

Sobald eine Form ausgewählt ist, erscheinen rechts ihre Einstellungen. Ganz oben steht der Name; über den Stift daneben ({{ui:outliner.rename}}) tippst du einen neuen ein. [[Enter]] übernimmt ihn, [[Esc]] bricht ab, und ein leerer Name bringt den Standardnamen der Form zurück. Weiter rechts schließt das Schloss die Form gegen versehentliches Verschieben ab, und das Auge blendet sie aus. Der Pfeil ganz links klappt die Einstellungen bis auf ihre Titelleiste ein.

Die Einstellungen sind am rechten Rand angedockt. Verdecken sie etwas, ziehst du sie an ihrer Titelleiste weg; sie schweben dann dort, wo du sie loslässt, auch bei der nächsten Form. Legst du sie oben rechts wieder ab oder doppelklickst auf die Titelleiste, docken sie wieder an. Solange sie schweben oder eingeklappt sind, wandert der Rasterschritt vom unteren Ende der Einstellungen nach unten rechts auf die Arbeitsfläche.

![Die Einstellungen eines Zylinders: Körper oder Aussparung, Durchmesser und Höhe als Zahl und als Schieber.](shot:editor-overview)

- **{{ui:inspector.solid}} oder {{ui:inspector.hole}}:** Ein Körper bleibt stehen, eine Aussparung nimmt Material weg. Ein Klick auf {{ui:inspector.solid}} öffnet die Farben; eigene Farben, die du dort mischst, stehen danach unter {{ui:inspector.recentColors}} bereit, die letzten acht. Mehr im Kapitel [Körper und Aussparungen](chapter:koerper-und-aussparungen).
- **{{ui:inspector.transparent}}:** Damit siehst du durch den Körper hindurch, zum Beispiel um eine Form dahinter zu erkennen.
- **{{ui:inspector.multicolor}}:** Nur bei einer Gruppe. Eingeschaltet zeigt jedes Teil der Gruppe seine eigene Farbe, auch in einer Gruppe, die mit Aussparungen zu einem Körper verrechnet wurde (die Wände, die eine Aussparung hinterlässt, nehmen die Farbe des Körpers an, in den sie geschnitten wurde). Wählst du eine Farbe für die Gruppe, schaltet das den Schalter aus und färbt die ganze Gruppe. Ein Bündel behält immer die Farben seiner Teile. Im 3MF-Export behält jedes Teil seine Farbe, so dass der Slicer die Teile verschiedenen Filamenten zuordnen kann; das OBJ trägt die Farben an den Punkten, an der Grenze zweier Farben also etwas ungenauer.
- **{{ui:inspector.properties}}:** Die Maße und alles, was zu dieser Form gehört. Beim Zylinder etwa der Durchmesser, die Höhe und die Zahl der Seiten. Bei einem Zahnrad die Zähne, bei einer Feder die Windungen. Ein Wert, den du von seiner Vorgabe wegbewegt hast, bekommt neben seinem Namen einen kleinen Pfeil: Ein Klick holt genau diesen Wert zurück, egal was du seitdem sonst getan hast, anders als Rückgängig. {{ui:inspector.saveDefaults}} unten macht die aktuellen Werte zu den Startwerten dieser Art von Form (dasselbe wie {{ui:workspace.shapeDefaults}} in den Einstellungen), und {{ui:inspector.resetDefaults}} geht auf die der App zurück.
- **Lage und Drehung** weiter unten im Bereich.
- **{{ui:inspector.taper}}:** Oben und unten unterschiedlich groß, zum Beispiel für eine Schräge oder einen Trichter.
- **{{ui:inspector.twist}}:** Verdreht die Oberseite gegen die Unterseite oder schiebt sie zur Seite. So entstehen gedrehte Säulen und geneigte Türme.

![Eine Gruppe aus einem orangen Block, einem blauen Zapfen und einer Aussparung, zu einem Körper verrechnet. Mit Mehrfarbig bleibt der Zapfen blau, der Block orange, und die Wände der Aussparung nehmen die Farbe des Blocks an.](shot:group-multicolor)

Verjüngen und Verdrehen gibt es bei fast allen Formen. Nur Zahnrad, Gewinde, Feder, Rändel, Scharnier, Pyramide, gebogenes Rohr, Tropfen, Senkungen und Lineal haben sie nicht: Diese Formen haben ihre eigenen festen Maße oder, wie die Pyramide, schon eine eigene Oberseite.

![Ein Kegel, bei dem Radius oben und Höhe geändert wurden: Ein kleiner Pfeil neben jedem Wert holt ihn zurück, und die beiden Knöpfe unten speichern oder setzen die Vorgaben der Form zurück.](shot:property-reset)

Ein verjüngter oder geneigter Quader, Zylinder, eine Ellipse, ein Vieleck, Rohr oder Ring behält seine exakte Form, ebenso Kapsel, Stern, Herz, Halbmond, Wabe, Schwalbenschwanz und ein abgerundeter Quader ohne gerundete Ober- und Unterkante: Fasen und Rundungen gehen daran wie an der unveränderten Form, und der STEP-Export schreibt sie. Das gilt auch für eine verdrehte Form: Ihr Querschnitt dreht sich exakt mit, und die Seiten winden sich gleichmäßig von unten nach oben.

Tippen ist genauer als Ziehen. Alle Zahlenfelder nehmen Millimeter, aber auch Prozent: Wer bei einer Breite von 40 mm „50 %“ eintippt, bekommt 20 mm. Sie rechnen auch: „15*3“, „120-2*4“ oder „(40+2)/2“ ergeben 45, 112 und 21; statt * geht auch x. Die Rechnung merkt sich das Feld: Klickst du später wieder hinein, steht statt der Zahl die Formel da, solange der Wert noch zu ihr passt, und du änderst sie an Ort und Stelle, aus „(140+2)/2“ wird „(40+6)/2“. Ziehst du den Körper am Griff oder skalierst ihn, passt die Formel nicht mehr und das Feld zeigt wieder nur die Zahl.

## Wie rund ist rund? Die Seitenzahl

Runde Formen wie Zylinder, Kegel, Rohr, Ellipse oder die Bohrungen haben in den Eigenschaften den Schalter {{ui:prop.sidesFollowSize}} und den Regler {{ui:prop.sides}}. Der Hintergrund: Für die Anzeige und für STL, 3MF und OBJ zeichnet layerling einen Kreis als Vieleck aus vielen kleinen Seiten. Je mehr Seiten, desto glatter, aber desto mehr Dreiecke.

**Wo die Seitenzahl wichtig ist**

- **Beim Export für den Slicer** (STL, 3MF, OBJ). Ein Zylinder mit wenigen Seiten kommt dort als Vieleck an.
- **Beim Zusammenrechnen von Körpern und Aussparungen.** Eine Bohrung, die aus einer Aussparung mit wenigen Seiten geschnitten wird, ist im fertigen Teil eckig. Das gilt auch für Schraubenlöcher.
- **In der Anzeige.** Viele sehr feine Formen machen den Editor langsamer.

**Wo sie keine Rolle spielt**

- **Beim STEP-Export.** Er schreibt die runde Form, nicht das Vieleck.
- **Bei Fasen und Verrundungen** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}), solange die Form rund bleibt. Das ist der Fall, wenn du keine Seitenzahl eingestellt hast, wenn die Zahl mindestens so hoch ist wie der Vorgabewert der Form oder wenn das Vieleck höchstens {{value:EXACT_ROUND_TOLERANCE}} mm vom Kreis abweicht. Der Vorgabewert ist {{value:ROUND_FROM_SIDES}} Seiten bei Zylinder, Ellipse, Rohr und Kegel, {{value:ROUND_FROM_ROOF_SIDES}} beim {{ui:shape.roundRoof}}, {{value:ROUND_FROM_SPHERE_STEPS}} Schritte bei der {{ui:shape.sphere}}, {{value:ROUND_FROM_HALF_SPHERE_STEPS}} bei der {{ui:shape.halfSphere}} und eine {{ui:prop.quality}} von {{value:ROUND_FROM_BENT_TUBE_QUALITY}} bei einem runden {{ui:shape.bentTube}}.
- **Bei einem Gewinde, einer Feder oder einem Schrägrad.** Das Kantenwerkzeug und der STEP-Export nehmen den exakten Körper; die {{ui:prop.quality}} bestimmt nur, wie fein die Form gezeichnet wird.

**Wo sie wieder wichtig wird**

- **Bei Fasen und Verrundungen einer Form mit wenigen Seiten.** Stellst du die Seitenzahl unter den Vorgabewert, behandelt das Kantenwerkzeug die Form so, wie sie gezeichnet ist: Ein Zylinder mit 6 Seiten bleibt ein Sechskant-Stab, und die Verrundung läuft um seine sechs Kanten. So lässt sich zum Beispiel eine Mutterntasche mit abgerundeten Ecken bauen. Für eine runde Form lass {{ui:prop.sidesFollowSize}} eingeschaltet.

**Wie du es einsetzt**

- **Lass {{ui:prop.sidesFollowSize}} eingeschaltet.** Dann wählt layerling die Seitenzahl nach dem Durchmesser, so dass das Vieleck höchstens {{value:ROUND_DEVIATION_TOLERANCE}} mm vom echten Kreis abweicht, weit unter dem, was ein Drucker auflöst. Kleine Formen bekommen mindestens {{value:MIN_AUTOMATIC_SIDES}} Seiten, große mehr.
- **Weniger Seiten** nimmst du, wenn du absichtlich ein Vieleck willst (aber dafür gibt es den {{ui:shape.polygon}}) oder wenn der Editor mit sehr vielen runden Formen träge wird.
- **Mehr Seiten** brauchst du fast nie. Nur bei sehr großen runden Teilen, wenn du im STL Kanten siehst.
- **Für Teile, die du nur mit Kanten bearbeitest oder als STEP weitergibst,** ist die Seitenzahl egal.

## Mit den Griffen arbeiten

Neben den Einstellungen gibt es Griffe an der Form selbst:

- Die **Ecken und Kanten** ziehen die Form größer oder kleiner. Hältst du beim Ziehen an einer Ecke [[Umschalt]], wachsen Breite, Tiefe und Höhe gemeinsam und die Proportionen bleiben erhalten; mit [[Alt]] wächst die Form von der Mitte aus statt von der gegenüberliegenden Ecke. Ohne Tastatur oder wenn du keine Taste halten willst, schaltest du oben in den Eigenschaften {{ui:inspector.keepProportions}} ein: Dann behalten die Ecken immer die Proportionen, und gibst du Breite, Tiefe oder Höhe ein, ziehen die beiden anderen um denselben Faktor mit. Die Einstellung wird gemerkt.
- Der **Pfeil oben** ändert die Höhe, der Griff **in der Mitte** hebt die Form an oder senkt sie.
- Die **gebogenen Pfeile** drehen sie.
- An den **Zahlen** neben der Form siehst du die Maße. Ein Klick darauf öffnet ein Feld, in das du die gewünschte Zahl tippst.
- Ein **Klick auf eine Ecke** (ohne zu ziehen) öffnet Breite und Tiefe gemeinsam. Gib die erste Zahl ein, wechsle mit [[Tab]] zur zweiten und übernimm beide mit [[Enter]]. [[Esc]] bricht ab.

Ohne Maus geht es mit der Tastatur: Die Pfeiltasten schieben die Auswahl um einen Rasterschritt, mit [[Umschalt]] um fünf. Sie richten sich nach der Ansicht: [[→]] schiebt dahin, wo auf dem Bildschirm rechts ist, [[↑]] vom Betrachter weg, auch wenn du die Platte gedreht hast. Schiebst du eine Form aus dem Bild, rückt die Ansicht mit. [[Strg]]+[[↑]] und [[Strg]]+[[↓]] heben und senken sie. [[R]] dreht um 45°, [[Umschalt]]+[[R]] um 22,5°. [[D]] setzt die Auswahl auf die Arbeitsebene ab.

Die Griffe ziehen eine Form so groß wie deine Platte, mindestens 220 mm breit und tief. Größer geht es per Zahl in den Eigenschaften; eine so vergrößerte Form schrumpft beim nächsten Anfassen nicht zurück. Eine eigene Obergrenze je Form setzt du in den Einstellungen unter {{ui:workspace.shapeDefaults}} mit {{ui:workspace.customLimit}}.

Der Rasterschritt steht unten rechts im Editor und lässt sich jederzeit ändern.

## Kopieren und duplizieren

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} und {{ui:editor.tool.duplicate}} liegen im Menüband ({{ui:editor.group.clipboard}}). Mit [[Strg]]+[[D]] duplizierst du eine Auswahl. layerling merkt sich dabei, wie du die Kopie zuletzt verschoben oder gedreht hast, und wendet dasselbe beim nächsten Duplizieren wieder an. So entsteht eine Reihe von Löchern oder Stufen mit ein paar Tastendrücken. Für regelmäßige Anordnungen gibt es außerdem das Muster, das im Kapitel [Auswählen und Anordnen](chapter:auswaehlen-und-anordnen) beschrieben ist.

> **Tipp:** Wenn eine Form nicht die gewünschte Größe annimmt, liegt das oft an den Grenzen für neue Formen. Unter {{ui:workspace.shapeDefaults}} in den Einstellungen legst du fest, wie jede Form beginnt und wie groß sie höchstens werden darf.

## Eigene Formen

Ein Halter, ein Griff oder eine Grundplatte, die du immer wieder brauchst, kommt zu den {{ui:myShapes.title}}. Sie stehen in der Formenliste ganz oben, über den {{ui:myShapes.basicShapes}}, und lassen sich mit dem Pfeil zuklappen.

1. Markiere einen oder mehrere Körper, auch Aussparungen, Gruppen oder ein importiertes Modell.
2. Öffne die Formenliste und klicke auf {{ui:myShapes.saveSelection}}. Gib einen Namen ein und bestätige mit {{ui:common.save}}.
3. In jedem Entwurf setzt ein Klick auf die Kachel die Form ein, wie jede andere Form. Du kannst die Kachel auch auf die Arbeitsfläche ziehen, dann landet sie dort, wo du loslässt.

Mehrere Körper kommen zusammen wieder heraus, so wie sie zueinander standen, und bleiben einzeln auswählbar. Der Stift auf einer Kachel benennt sie um, der Papierkorb entfernt sie nach einer Rückfrage. Was schon in Entwürfen steckt, bleibt dabei erhalten.

Die {{ui:myShapes.title}} liegen in diesem Browser, getrennt von den Entwürfen, und sind beim nächsten Start sofort wieder da. {{ui:dashboard.backupAll}} auf der Startseite sichert sie mit den Entwürfen, und beim Öffnen der Sicherung kommen beide zurück. Nur die Formen sicherst du mit {{ui:myShapes.backup}} (der Pfeil nach unten) als ZIP-Datei und holst sie mit {{ui:myShapes.load}} (der Pfeil nach oben) in einen anderen Browser. {{ui:myShapes.load}} nimmt auch einzelne `.lyl`-Entwürfe, jeder wird dann zu einer Form. Was schon da ist, wird nicht doppelt angelegt.

### Eigene Formen auf dem Server

Ist der [Serverspeicher](chapter:dateien-und-speichern) eingeschaltet, zeigt der Bereich zwei Gruppen: {{ui:myShapes.onServer}} und {{ui:myShapes.inBrowser}}. Beim Speichern wählst du, wohin die Form kommt; vorgewählt ist der Server. Dort liegt sie im Ordner `Custom shapes`, als eigene `.lyl`-Datei mit Vorschaubild, und steht damit auf jedem Gerät bereit, das den Server erreicht. Eine Form aus dem Browser legst du mit der Wolke auf ihrer Kachel auf den Server; im Browser ist sie danach nicht mehr doppelt.

Der Ordner `Custom shapes` erscheint auch auf der Startseite. Dort öffnest du eine Form wie einen Entwurf, änderst sie, und sie wird wie jeder Serverentwurf automatisch gespeichert. Beim nächsten Einsetzen ist sie neu. Weil der Serverspeicher keine Anmeldung hat, sieht jeder, der den Server erreicht, dieselben Formen.

## Um einen Zylinder wickeln

Ein Muster, ein Logo oder ein Schriftzug soll auf einen Becher, eine Dose oder ein Rohr? Lege es zuerst flach auf die Platte, etwa als importiertes SVG oder als Text, so wie es von oben gesehen aussehen soll. Dann wickelst du es in den Einstellungen der Form unter {{ui:inspector.wrapCylinder}} um einen Zylinder:

1. Klappe {{ui:inspector.wrapCylinder}} auf und gib den {{ui:inspector.wrapDiameter}} der Zylinderwand ein, etwa den Außendurchmesser deines Bechers.
2. Klicke auf {{ui:inspector.wrapApply}}. Was von links nach rechts lag, läuft jetzt um den Zylinder herum, der hintere Rand wird oben, und die Dicke steht nach außen ab.
3. Markiere die gewickelte Form und den Zylinder und richte sie beide mittig aus, links-rechts und vorne-hinten. Die Mitte der gewickelten Form ist die Achse des Zylinders, also sitzt sie dann genau auf seiner Wand.

Für eine Gravur schaltest du {{ui:inspector.wrapInward}} ein: Dann geht die Dicke in die Wand hinein. Setze die Form als Aussparung, richte sie mittig aus und gruppiere sie mit dem Zylinder.

Das Ergebnis ist ein Netz wie ein importiertes Modell. Mit Rückgängig liegt die Form wieder flach da; für einen anderen Durchmesser erst zurück und dann neu wickeln. Länger als einmal um den Zylinder geht nicht, dann nennt layerling den kleinsten Durchmesser, der passt.

