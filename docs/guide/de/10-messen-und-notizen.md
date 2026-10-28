---
title: Messen und Notizen
summary: Maßband, Lineal und Winkellineal, Abstände zum Nullpunkt – und Notizen, die an einem Teil hängen.
---

Wer ein Teil genau bauen will, muss messen können. layerling hat dafür mehrere Werkzeuge. Keines davon landet in einem Export. Wandstärken und Spalte im Inneren misst du am besten in der [Schnittansicht](chapter:ansicht-und-arbeitsebene) mit {{ui:camera.sectionMeasure}}.

## Das Maßband

Das Maßband liegt am unteren Ende der Kameraleiste am linken Rand ({{ui:camera.tapeTools}}). Es misst Abstände zwischen Ecken, Kanten und Flächen. Ein Klick darauf öffnet fünf Schaltflächen. Verdecken sie, was du messen willst, ziehst du sie am Griff links frei über die Arbeitsfläche; ein Doppelklick auf den Griff bringt sie zurück:

![Das Maßband mit seinen Schaltflächen: Maß hinzufügen, Messpunkte verschieben, Maß entfernen, ganze Kanten messen, alle Maße entfernen.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klicke einen Punkt an, ziehe zum nächsten und klicke ihn an. Die Strecke wird beschriftet, davor die Achsen, entlang derer sie läuft: X, Y oder Z für eine gerade, XY, XZ oder YZ quer über eine Ebene, 3D für alle drei. Fährst du über die Beschriftung, zeigt sie, wie weit die Strecke entlang jeder Achse reicht; über einem Punkt stehen seine Koordinaten. Während du den zweiten Punkt setzt, stehen Achsen, Strecke und die Reichweite entlang jeder Achse neben dem Zeiger. Eine Messung, die größtenteils hinter einem anderen Körper liegt, wird blass; fährst du über ihre Linie oder Beschriftung, erscheint sie wieder voll. Auf einer gegenüberliegenden Kante oder Fläche rastet der zweite Punkt im rechten Winkel zum ersten ein, wenn der Zeiger in die Nähe kommt – oder überall auf dieser Kante oder Fläche, solange du [[Umschalt]] hältst. Auf derselben Fläche oder auf der Arbeitsfläche hält [[Umschalt]] die Messung entlang der Hauptachse gerade.
2. **{{ui:camera.moveMeasurement}}:** Fasse die Punkte an und schiebe sie, die Zahl folgt.
3. **{{ui:camera.deleteMeasurement}}:** Danach klickst du ein Maß an, um es zu entfernen. Noch schneller geht es direkt unter **{{ui:camera.addMeasurement}}**: Halte [[Umschalt]] oder [[Strg]] (auf dem Mac [[Cmd]]) gedrückt und klicke einen Messpunkt oder eine Messlinie an, um sie sofort zu löschen.
4. **{{ui:camera.tapeWholeEdges}}:** Ein Klick auf eine Kante misst sie ganz, bei einem Kreis zum Beispiel den Umfang. Ist das ausgeschaltet, setzt der Klick stattdessen einen Punkt auf die Kante, und der zweite Punkt kann überall liegen, so dass du den Durchmesser oder jede andere Strecke messen kannst. Mit [[Alt]] gilt der Schalter für einen Klick umgekehrt. Auf einem Kreis rastet der Punkt gegenüber vom ersten ein, wenn der Zeiger in die Nähe kommt, und die Punkte liegen auf dem wirklichen Kreis, so dass der Durchmesser genau herauskommt.
5. **{{ui:camera.deleteAllMeasurements}}:** Entfernt alle Maße auf einmal. Weil sich das nicht rückgängig machen lässt, fragt layerling vorher nach; gibt es keine Maße, passiert nichts.
6. **{{ui:camera.tapeMarkMiddle}}:** In der Mitte jeder Messung sitzt eine kleine runde Marke, unten halb gefüllt. Er setzt einen [Bezugspunkt](#bezugspunkte) in die Mitte der Messung: nach einem Klick auf eine runde Kante, etwa den Rand einer Bohrung, in den Mittelpunkt dieses Kreises - auch bei einem importierten Netz, wo sonst nichts die Mitte einer Bohrung markiert -, bei einem Durchmesser oder jeder geraden Messung auf halber Strecke. Eine Form, die du ziehst, rastet dann mit ihrer Mitte an dem Punkt ein. Einen Punkt, der schon da ist, legt layerling nicht doppelt an. Das Maßband rastet an einem Bezugspunkt ein wie an einer Ecke: So misst du vom Mittelpunkt eines Kreises oder von der Mitte einer Linie aus - Punkt setzen, dann anklicken.
7. **{{ui:camera.tapeTypeLength}}:** Liegt mindestens ein Ende einer geraden Messung auf einem Körper, lässt sich ihre Zahl anklicken. Tippe eine neue Länge ein und drücke [[Enter]]: Der Körper am zweiten Punkt rückt entlang der gemessenen Linie, bis der Abstand genau so groß ist, wie beim Lineal in Tinkercad. Ist nur der Körper am ersten Punkt ausgewählt, rückt stattdessen dieser. Die Messpunkte bleiben am Körper, die Messung geht also mit. Miss von einer Ecke, einer Kante oder einem [Bezugspunkt](#bezugspunkte) aus, etwa der Mitte eines Kreises, um Teile auf einen genauen Abstand zu setzen.

Mit [[Esc]] verlässt du den Messmodus.

## Das Lineal

Aus der Formenbibliothek holst du das {{ui:shape.ruler}}. Es ist ein reines Messwerkzeug: Es erscheint in keinem Export und lässt sich weder gruppieren noch verschneiden. Für jeden Körper, der das Lineal berührt oder überlappt, zeigt es die Ausdehnung als schwebende Zahl direkt in der Ansicht. Diese Zahl kannst du direkt dort ändern, und der Körper passt sich an. Stellst du das Lineal auf oder kippst es, misst es entlang seiner eigenen Richtung: Senkrecht neben einem Körper zeigt es dessen Höhe. Über das schwebende Plus-Symbol legst du eine Kopie der gemessenen Form an; das geht nur, solange das Lineal flach liegt. Seine aufgedruckte Skala läuft in Millimetern an der einen Längskante, mit nummerierten Zehnern, und in Zoll an der anderen, mit einem Strich je Sechzehntelzoll und nummerierten ganzen Zoll. Die Skala der Einheit, in der du arbeitest (der Schalter unten rechts), liegt an der oberen Kante; ein Lineal schmaler als 15 mm trägt nur diese eine.

## Das Winkellineal

Manchmal misst du besser an einem rechten Winkel. Klicke in der Kameraleiste auf {{ui:camera.cornerRulerTool}} und dann auf die Arbeitsfläche. Dort legt sich ein Winkellineal mit zwei Armen im rechten Winkel ab, mit Teilstrichen, wie ein Anschlagwinkel. Auch das hat keinen eigenen Körper. Klickst du nahe an die Ecke eines Körpers, rastet seine Ecke genau dort ein. Der Entwurf behält das Winkellineal dort, wo du es gesetzt hast, auch in einer gespeicherten .lyl-Datei: Öffnest du den Entwurf wieder, liegt es an derselben Stelle, gleich gedreht und mit denselben Messpunkten, bis du es entfernst.

Das Winkellineal legt sich auf die Arbeitsebene. Liegt sie auf der Seite eines Körpers, liegt es also auch auf dieser Seite, siehe [Ansicht und Arbeitsebene](chapter:ansicht-und-arbeitsebene). So bemaßt du auf einer senkrechten Wand: Arbeitsebene auf die Wand legen, Winkellineal an ihre obere linke Ecke setzen und so oft auf den Griff klicken, bis die Arme nach rechts und nach unten zeigen.

- **Am Griff ziehen** verschiebt es.
- **Ein kurzer Klick auf den Griff** dreht es um 90°.
- **Das ×** daneben entfernt es.
- **Der kleine Knopf links am Griff** schaltet um, wovon aus gemessen wird: von der Außenkante eines Körpers (Eckpunkt, Symbol mit Linien) oder von seiner Mitte (Mittelpunkt, Fadenkreuz). Neben jeder grünen Zahl sitzt ein ebensolcher kleiner Schalter, der nur diese Zahl umstellt: bei einem stehenden Zylinder die Mitte in den beiden Armen und die Unterseite in der Höhe, bei einem liegenden die Mitte quer und ein Ende längs. Stimmen alle drei wieder überein, zeigt der Knopf am Griff den gemeinsamen Modus.

Stehen Körper an einem der Arme, zeigt das Winkellineal automatisch deren Maße an, ausgewählt oder nicht: Körper innerhalb des Winkels, neben einem Arm oder quer darüber. Ein Körper außerhalb, hinter der Ecke oder von außen neben einem Arm, bekommt keine. Das geht nur auf der Grundplatte, nicht auf der Seite eines Körpers. Der Knopf mit dem Pfeil unter dem Griff des Lineals schaltet das ab, sodass nur die ausgewählten Körper ihre Maße zeigen; er wird mit dem Entwurf gespeichert.

Markierst du einen Körper, zeigt das Winkellineal in Grün, wie weit er von der Ecke entfernt ist, entlang beider Arme und in der Höhe. Ein Klick auf eine grüne Zahl öffnet ein Eingabefeld: Tippe den gewünschten Abstand ein, und der Körper rückt genau dorthin. Sind mehrere Körper markiert, zählen sie zusammen wie einer. Gemessen wird ihr gemeinsamer Umriss, und ein eingetippter Wert verschiebt alle gemeinsam, ohne dass sich ihre Lage zueinander ändert.

Die Hilfslinien der grünen Zahlen laufen am Boden entlang, in der Ebene, in der das Winkellineal liegt, bis zu dem Punkt unter oder neben dem Körper; die Höhe hat ihren eigenen Pfeil. Der Schalter jeder Zahl sitzt im Rahmen der Zahl. Die Arme und die Teilstriche sind Linien im Raum: Ein Körper davor verdeckt sie, wie er ein echtes Lineal verdecken würde. Das kleine Auge unter dem Griff schaltet das um: Mit durchgestrichenem Auge verdecken Körper das Lineal (so beginnt es), mit offenem Auge bleibt es über allem sichtbar. Die Zahlen an den Armen verblassen, wo ein Körper davor steht.

Mit dem Mittelpunkt zählen die grünen Zahlen bis zur Mitte des Körpers, auch in der Höhe. So setzt du etwa eine Kugel mit ihrer Mitte genau 15 mm neben eine Kante, ohne den Radius abzuziehen. Auf einer Wand setzt du so ein Loch 40 mm von links und 190 mm von oben: Loch markieren, Mittelpunkt einschalten, 40 und 190 eintippen. Die Höhe zählt dort von der Wand aus nach außen.

Das Maßband und das Winkellineal bleiben stehen, wenn du eine Skizze machst und in die 3D-Ansicht zurückkehrst. Beide stehen nicht im Verlauf. Das Winkellineal wird mit dem Entwurf gespeichert, ebenso die Messungen des Maßbands, im Browser und in der .lyl-Datei: Beim Öffnen des Entwurfs sind sie wieder da. Der Augenknopf unter den Maßband-Knöpfen blendet alle Messungen aus und wieder ein; ob sie ausgeblendet sind, wird mitgespeichert, und wer eine Messung setzt, verschiebt oder löscht, sieht sie vorher wieder.

## Abstände zum Nullpunkt und beim Verschieben

In den Einstellungen unter {{ui:workspace.appearance}} gibt es zwei Schalter für laufende Maße:

- {{ui:workspace.showMoveDimensions}} zeigt beim Verschieben, um wie viel du dich bewegst.
- {{ui:workspace.showOriginDimensions}} zeigt die Abstände der Auswahl zum Nullpunkt der Platte, auch bei mehreren markierten Körpern.

Mit {{ui:workspace.dimensionsAlwaysVisible}} bleiben die Maße dauerhaft sichtbar.

## Notizen

Eine Notiz hält fest, was die Geometrie nicht sagt: „Hier ist eine Schraube 0,3 mm zu eng“, „Deckel noch drucken“, „Maß von Peter“. Setze sie mit {{ui:editor.tool.note}} oder der Taste [[N]].

- Setzt du die Notiz **auf einen Körper**, wandert sie mit ihm.
- Setzt du sie **daneben**, bleibt sie auf der Arbeitsebene ({{ui:note.free}}).
- {{ui:note.detach}} löst eine angeheftete Notiz vom Körper.
- {{ui:editor.tool.group}} nimmt eine angeheftete Notiz mit in die Gruppe; {{ui:editor.tool.ungroup}} gibt sie an das sichtbare Teil darunter weiter, auch an eine Gruppe darin. Solange eine Gruppe mit {{ui:group.edit}} offen ist, wandern ihre Notizen mit dem Teil darunter und kehren mit {{ui:group.done}} zur Gruppe zurück; Abbrechen stellt sie wieder her, wie sie waren.
- Wird ihr Körper gelöscht oder liegt kein sichtbarer Körper mehr darunter, bleibt die Notiz stehen, wo sie war, auf der Arbeitsebene.
- Ziehen an der Nadel verschiebt die Notiz. Ein Klick auf die Nadel klappt die Karte zu, nur die kleine Nummer bleibt; ein weiterer Klick klappt sie wieder auf. Ein Klick in den Text bearbeitet ihn.
- Beim Schreiben übernimmt [[Enter]] den Text, und [[Esc]] stellt ihn wieder her, wie er vorher war; [[Umschalt]]+[[Enter]] beginnt eine neue Zeile.
- **In einer Skizze** setzt {{ui:editor.tool.note}} (unter {{ui:editor.group.manage}}) oder [[N]] ebenso eine Notiz, irgendwo auf die Skizze. Alle Notizen einer Skizze gehören zu ihrem Körper: In der 3D-Ansicht sitzen sie darauf, oben auf einem extrudierten oder gezogenen Körper und auf dem gezeichneten Profil eines gedrehten, und wandern mit ihm. Öffnest du die Skizze wieder, zeigt sie die Notizen des Körpers, auch die in 3D gesetzten. In der Skizze nimmt Rückgängig eine Notiz zurück wie eine Linie, und {{ui:sketch.cancel}} verwirft, was du an den Notizen geändert hast. [[Umschalt]]+[[N]] blendet die Notizen auch hier ein und aus.

Notizen werden im Entwurf gespeichert, tauchen in keinem Export auf und lassen sich über {{ui:visibility.notes}} (unter {{ui:editor.visibilityOptions}}, dem Pfeil neben dem Augen-Symbol) oder mit [[Umschalt]]+[[N]] ein- und ausblenden.

## Bezugspunkte

Ein Bezugspunkt ist eine bloße Markierung im Raum, wie ein Bleistiftstrich oder ein Anreißpunkt in der Werkstatt: Er gehört zu keinem Körper, wird nie gedruckt, und andere Dinge rasten an ihm ein. Klicke einen Körper mit der rechten Maustaste an und wähle {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} oder {{ui:contextMenu.markMidpoints}}: Die Punkte erscheinen auf der Oberseite des Körpers (der ganzen Auswahl, wenn du mehrere gewählt hast). {{ui:contextMenu.markFaceCenter}} setzt stattdessen einen in die Mitte der ebenen Fläche, auf die du geklickt hast, etwa an einer Seite oder einem Ende.

- Ziehe einen Punkt, um ihn zu verschieben: Er rastet dabei an Ecken, Kanten- und Flächenmitten der Körper, an echten Eckpunkten und an anderen Punkten ein; mit gedrückter [[Alt]]-Taste bleibt er frei. Oder klicke ihn an, um seine Koordinaten zu sehen und neue einzutippen; sie gelten in der eingestellten Einheit. Jede Karte lässt sich am Titel wegziehen, wenn sie etwas verdeckt, und zwar einzeln: Die anderen bleiben, wo sie sind, und ein Doppelklick auf den Titel holt sie zurück. Die Karte, die du zuletzt angefasst hast, liegt vor den anderen. **Alle löschen** in einer Karte oder **Alle Bezugspunkte löschen** im Rechtsklickmenü (eines Körpers oder einer leeren Stelle der 3D-Ansicht) löscht alle Punkte auf einmal. {{ui:common.delete}} entfernt ihn.
- Das Maßband kann auch einen Punkt setzen: {{ui:camera.tapeMarkMiddle}}, die halb gefüllte Marke in der Mitte einer Messung, legt einen in ihre Mitte, etwa in den Mittelpunkt einer runden Bohrung. Und es misst von einem Punkt aus: Das Maßband rastet an Bezugspunkten ein wie an Ecken.
- Ziehst du eine Form, rasten ihre Kanten und ihre Mitte an einem Punkt ein, wie sie an anderen Formen einrasten ({{ui:workspace.objectSnap}}). Auch das Winkellineal rastet an Punkten ein.
- Punkte werden im Entwurf gespeichert, tauchen in keinem Export auf und werden zusammen mit den Notizen über {{ui:visibility.notes}} ([[Umschalt]]+[[N]]) ein- und ausgeblendet.
- Eine KI kann sie mit `layerling_add_reference_points`, `layerling_list_reference_points` und `layerling_remove_reference_points` setzen, auflisten und entfernen.

## Referenzbilder

Ein Referenzbild ist ein Bild, an dem du Teile ausrichtest: Leg das Foto einer Platine auf den Boden ihres Gehäuses und setz die Abstandshalter, Löcher und Ausschnitte für die Anschlüsse genau darauf. Es ist eine Hilfe, kein Körper: Es wird nie gedruckt, nie exportiert (STL, 3MF, OBJ, STEP, SVG), gehört nie zu einer Gruppe, einem Bündel oder einem Schnitt, und die Druckschätzung lässt es weg.

- Öffne {{ui:editor.import}} und wähle {{ui:import.referenceImage}}, dann ein PNG-, JPG-, WebP-, GIF- oder BMP-Bild. Es landet auf der Arbeitsebene - auf der Platte oder auf der Fläche, auf die du die Arbeitsebene gelegt hast -, mit der längeren Seite 100 mm und halb durchsichtig.
- Verschieb, dreh und skalier es mit seinen Griffen wie jede Form. Ein Körper davor wird zuerst gewählt, du greifst also beim Arbeiten darauf nicht versehentlich das Bild.
- {{ui:referenceImage.seeThrough}} in seinen Einstellungen blendet es von ganz sichtbar bis kaum noch da.
- {{ui:referenceImage.calibrate}} gibt ihm seine wirkliche Größe wie in der Skizze: Klicke zwei Punkte auf dem Bild an, deren wirklichen Abstand du kennst - zwei Befestigungslöcher der Platine etwa - und gib diesen Abstand unter {{ui:referenceImage.distance}} ein. Das Bild behält seine Proportionen und seine Mitte.
- Sperre es mit dem Schloss im Kopf seiner Einstellungen, dann bleibt es liegen: Klicks gehen durch es hindurch auf die Platte. In der Objektliste wählst du es wieder aus, um es zu entsperren.
- Das Bild liegt einmal in der Entwurfsdatei, egal wie oft es kopiert oder rückgängig gemacht wird. Ein großes Bild macht die Datei um so viel größer; die Meldung beim Hinzufügen nennt seine Größe.
- Eine KI legt eines mit `layerling_reference_image` an, verschiebt, kalibriert, blendet und sperrt es.
