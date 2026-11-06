---
title: Für den 3D-Druck vorbereiten
summary: Den eigenen Drucker wählen, gewarnt werden, wenn etwas nicht passt, und das Teil richtig hinlegen.
---

## Den Drucker wählen

Öffne die Einstellungen (das Zahnrad in der Titelzeile, {{ui:editor.workspaceSettings}}) und wechsle zum Bereich {{ui:workspace.workplane}}. Bei {{ui:workspace.printer}} suchst du deinen Drucker aus einer Liste von über 230 gängigen Modellen aus, darunter Bambu Lab, Prusa, Creality, Anycubic, Elegoo und viele mehr.

![Die Einstellungen der Arbeitsebene mit gewähltem Drucker. Druckbett und maximale Druckhöhe stammen aus dem Slicer-Profil.](shot:settings-workplane)

Damit passiert dreierlei:

- Die Arbeitsebene bekommt die Größe des Druckbetts.
- In der Ecke der Arbeitsfläche stehen der Name des Druckers und sein Bauraum. Wen die Beschriftung stört, schaltet sie unter {{ui:workspace.workplane}} mit {{ui:workspace.showPlateLabels}} ab; das gilt auch für den Namen des Entwurfs vorne links.
- layerling **warnt**, wenn etwas nicht passt.

Die Druckerprofile stammen aus OrcaSlicer, sie sind also dieselben, die auch dein Slicer kennt. Möchtest du ohne Drucker arbeiten, wählst du {{ui:workspace.printerNone}}. Die Größe der Arbeitsebene kannst du auch von Hand einstellen.

Delta-Drucker wie die von FLSun oder SeeMeCNC oder der Anycubic Predator drucken auf einer runden Platte. Mit einem von ihnen ist auch die Arbeitsfläche rund, so breit wie die Platte, und ein Körper ist zu groß, sobald er über den Rand ragt. Ein runder Körper wird an seinem eigenen Umriss gemessen, nicht an dem Kasten um ihn, so passt auch ein Zylinder, der fast so breit ist wie die Platte.

## Wenn etwas nicht passt

Ein Körper, der über den Rand der Druckplatte hinausragt, wird markiert. Dazu erscheint eine Meldung, welche Seiten wie weit überstehen. Genauso ist es, wenn das Teil **zu hoch** ist: Die Höhe zählt vom untersten Körper aus, so wie der Slicer das Modell absetzt.

![Der Quader ist breiter als das Druckbett des Bambu Lab A1 mini. Die Meldung unten sagt, um wie viel.](shot:printer-overhang)

Die Warnung hindert dich nicht am Weiterarbeiten. Sie ist ein Hinweis, damit du nicht erst im Slicer feststellst, dass das Teil zu groß ist. Ein zu großes Teil lässt sich oft aufteilen: schneide es mit {{ui:editor.tool.split}} in zwei Hälften und drucke beide getrennt.

Legst du Teile absichtlich neben der Platte ab, klick auf das kleine Kreuz in der Meldung. Dann ist die Warnung für genau diese Körper weg. Passt einer davon wieder und du schiebst ihn später erneut hinaus, oder ragt ein anderer Körper über, erscheint die Meldung wieder. Ausgeblendete Körper zählen nie mit, das Ausblenden der abgelegten Teile hilft also auch.

## Das Teil richtig hinlegen

Wie ein Teil auf der Platte liegt, entscheidet über Festigkeit und Aussehen. Dabei helfen zwei Werkzeuge im Bereich {{ui:editor.group.arrange}}:

- {{ui:editor.tool.layFlat}}: eine Fläche anklicken, und das Teil liegt mit dieser Seite unten. Die beste Druckrichtung mit einem Klick.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): setzt das Teil auf die Arbeitsebene, wenn es irgendwo in der Luft hängt.

Ein paar Faustregeln für die Richtung:

- Flache, große Flächen nach unten. Sie haften am besten.
- Lange Teile, die belastet werden, so legen, dass die Schichten nicht senkrecht zur Belastung verlaufen. Schichten sind die schwächste Richtung.
- Überhänge über 45° vermeiden oder mit Stützen im Slicer versehen.

## Überhänge finden

Im Menü neben dem Auge ({{ui:editor.group.visibility}}) schaltet **Überhänge zeigen** die Überhänge ein. Jede Fläche, die steiler als 45° nach unten zeigt, erscheint dann rot-weiß schraffiert – dort bräuchte der Drucker Stützen. Was auf der Platte aufliegt, bleibt frei. So siehst du schon beim Konstruieren, ob eine Kugel, ein Bogen oder eine waagerechte Bohrung ohne Stützen geht; die [Tropfenbohrung](chapter:gewinde-und-mechanik) ist genau dafür da. Drehst du das Teil oder legst es mit {{ui:editor.tool.layFlat}} anders hin, wandert die Schraffur sofort mit.

Wie steil dein Drucker schafft, stellst du in den Einstellungen unter {{ui:workspace.appearance}} ein: von 30° (vorsichtig) bis 70° (für Drucker mit guter Bauteilkühlung). Eine Fläche, die auf einem anderen Körper aufliegt, wird trotzdem markiert – layerling sieht nur die Fläche selbst.

## Wandstärke, Spiel und Fasen

- Wände sollten mindestens zwei Druckbahnen breit sein, bei einer 0,4-mm-Düse also 0,8 mm. Robuste Teile brauchen 1,2 bis 2 mm.
- Wo zwei Teile ineinanderpassen, brauchst du Spiel: meist 0,2 bis 0,4 mm, je nach Drucker. Baue ein kleines Test-Paar, bevor du das große Teil druckst.
- Die untere Kante, die auf der Platte aufliegt, fasen viele Leute leicht. Das verhindert, dass sich die erste Schicht ausbreitet („Elefantenfuß“).

## Druck prüfen

{{ui:editor.tool.printCheck}} neben {{ui:editor.tool.clearance}} unter {{ui:editor.group.combine}} sieht sich die ausgewählten Objekte an oder, wenn nichts ausgewählt ist, alle sichtbaren, und sagt in einem Fenster, was beim Drucken schiefginge. Jede seiner fünf Zeilen ist grün, wenn sie nichts gefunden hat, und orange mit Was und Wo, wenn doch:

- **{{ui:printCheck.thin.title}}**: Stellen, die dünner sind als zwei Linien der Düse - 0,8 mm bei einer 0,4-mm-Düse. Der Slicer lässt so eine Wand weg oder druckt sie als eine schwache Linie. Oben im Fenster wählst du unter {{ui:printCheck.nozzle}} deine Düse (0,2 bis 0,8 mit einem Klick, jede andere im Feld). Die dünnen Stellen werden rot mit einem hellen Gitter auf die Körper gemalt, und die Zeile nennt die dünnste Stelle und wie viel Fläche zu dünn ist. Stellen unter 1 mm² und scharfe Kanten, etwa die eines Keils, bleiben außen vor.
- **{{ui:printCheck.floating.title}}**: ein Körper oder ein getrenntes Teil davon, das weder die Platte noch ein anderes Teil berührt (bis auf 0,05 mm). Es würde in der Luft gedruckt. Ein Teil, das auf einem stehenden Teil liegt, ist in Ordnung.
- **{{ui:printCheck.contact.title}}**: ein Teil auf der Platte, dessen erste Schicht für seine Höhe sehr klein ist, etwa eine Kugel oder ein Kegel auf der Spitze. Es kann sich beim Drucken lösen. Gewarnt wird unter 0,5 mm² Standfläche, 0,1 mm über der Platte gemessen, je Millimeter Höhe: Eine Kugel liegt immer darunter, ein Würfel von 10 mm hat 10.
- **{{ui:printCheck.overhang.title}}**: dieselben Zahlen wie bei **Überhänge zeigen**, mit dem dort eingestellten Winkel.
- **{{ui:printCheck.openMesh.title}}**: ein importiertes Netz mit offenen Kanten oder mit Kanten, an denen drei oder mehr Flächen hängen. Bei so einem Netz muss der Slicer raten, wo innen ist.

![Eine Schale, deren rechte Wand nur 0,6 mm dick ist: Druck prüfen malt sie rot an und nennt sie im Fenster.](shot:print-check)

{{ui:printCheck.show}} an einer Zeile fährt die Kamera hin; es wählt die schwebenden Teile, die mit wenig Halt und die offenen Netze aus, und bei den Überhängen schaltet es **Überhänge zeigen** ein. Körper, die sich überschneiden, werden vereint geprüft, wie der Slicer sie vereint. Änderst du den Entwurf, während das Fenster offen ist, steht dort {{ui:printCheck.stale}}; klicke darauf oder auf {{ui:printCheck.checkAgain}}. [[Esc]] schließt das Fenster. Am Entwurf ändert sich nichts. Eine KI macht dieselbe Prüfung mit `layerling_check_print`.

## Wenn es losgehen soll

Wähle {{ui:editor.export}} und dann **STL** oder **3MF**. STL ist das einfachste Format. 3MF behält Namen und Farben der einzelnen Körper und ist deshalb praktisch, wenn du mehrere Farben druckst. Im Exportfenster siehst du dabei auch, wie viel Gramm und Meter Filament das Teil massiv bräuchte. Mehr im Kapitel [Dateien und Speichern](chapter:dateien-und-speichern).
