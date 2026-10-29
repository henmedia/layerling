---
title: Auswählen und Anordnen
summary: Formen auswählen, in der Objektliste finden, ausrichten, spiegeln, drehen, auf eine Fläche legen und in Mustern vervielfachen.
---

## Auswählen

Ein Klick auf eine Form wählt sie aus. Mit [[Umschalt]] nimmst du weitere dazu oder wieder weg. Solange [[Umschalt]] gehalten wird und zwei oder mehr Formen ausgewählt sind, zählt eine kleine Zahl unter dem Mauszeiger mit. Ein Klick ins Leere hebt die Auswahl auf, ebenso [[Esc]]. Ziehst du auf der leeren Arbeitsebene einen Rahmen auf, wählst du alles aus, was er berührt; mit gehaltenem [[Umschalt]] nimmt der Rahmen dazu, was nicht ausgewählt war, und weg, was es war. Willst du lieber ein Teil aus einem Haufen herauspicken, schalte in den Einstellungen {{ui:workspace.frameByDirection}} ein (Bereich {{ui:workspace.appearance}}): Ein nach rechts gezogener Rahmen nimmt dann nur, was ganz in ihm liegt, ein nach links gezogener weiterhin alles, was er berührt, und seine Linie ist gestrichelt. Hältst du beim Ziehen [[Alt]], dreht sich der Rahmen für dieses eine Ziehen um, etwa um ganze Körper von der Seite zu nehmen, auf der die Richtung es sonst nicht erlaubt. Und [[Strg]]+[[A]] wählt alle sichtbaren Körper. Ziehst du gerade einen Körper oder einen Anfasser des Rahmens, bricht [[Esc]] ab, solange die Maustaste noch gedrückt ist: Alles geht zurück auf den Stand davor, und im Verlauf kommt nichts dazu.

Eine Form hinter einer anderen, etwa eine Aussparung in einem Körper, erreichst du, ohne die Ansicht zu drehen: Klicke mit der rechten Maustaste auf die Stelle und wähle {{ui:contextMenu.selectOther}}. Das Menü zeigt dann alle Formen unter dem Zeiger, von vorn nach hinten. Die Form, auf der dein Zeiger steht, wird in der Ansicht umrandet, auch durch die Formen davor hindurch; ein Klick wählt sie aus, mit [[Umschalt]] kommt sie zur Auswahl dazu. Den Eintrag gibt es, sobald mehr als eine Form unter dem Zeiger liegt; auf dem Tablet öffnet langes Drücken dasselbe Menü.

Was du im Weg hast, blendest du aus ({{ui:editor.tool.hideSelected}}, [[Strg]]+[[H]]). Ausgeblendete Formen bleiben im Entwurf, sie sind nur nicht zu sehen und kommen nicht mit in den Export; das Exportfenster sagt vorher, wie viele es sind. Mit [[Strg]]+[[Umschalt]]+[[H]] holst du alle zurück. Was liegen bleiben soll, sperrst du mit dem Schloss oben in den Einstellungen oder mit [[Strg]]+[[L]]. Eine gesperrte Form lässt sich weder verschieben noch in Größe, Drehung oder Farbe ändern oder löschen: Ihre Griffe werden grau, neben dem Pfeil oben zeigt sich ein Schloss, und die Werkzeuge, die sie ändern würden, sind ausgegraut. Fährst du über einen Griff, siehst du trotzdem ihre Maße, und eine Taste, die sie ändern würde, meldet „Objekt gesperrt“. Solange eine gesperrte Form in der Auswahl ist, ändert sich auch an den anderen nichts. Ausblenden, Umbenennen, Kopieren und Duplizieren gehen weiterhin.

Eine Zahl am Knopf der Gruppe {{ui:editor.group.visibility}} sagt, wie viele Formen ausgeblendet sind, und ein Klick darauf blendet sie alle wieder ein. Wird ein Entwurf mit ausgeblendeten Formen geöffnet, sagt das einmal eine Meldung, mit einem Knopf zum Einblenden.

## Die Objektliste

Bei vielen Teilen verliert man in der Ansicht leicht den Überblick. Die Objektliste ({{ui:editor.tool.showOutliner}} oder [[Strg]]+[[Umschalt]]+[[O]]) zeigt alle Formen als Liste. Sie bleibt offen oder geschlossen, wie du sie verlassen hast, für jeden Entwurf, bis du sie schließt; die Wahl wird im Browser gemerkt.

![Die Objektliste: die Gruppe „Gruppe“ mit zwei Teilen und daneben eine Kugel. Ein Ordnersymbol öffnet die Gruppe.](shot:object-list)

- Ein Klick auf einen Eintrag wählt die Form aus, auch die Teile innerhalb einer Gruppe. Mit [[Umschalt]] nimmst du weitere Einträge dazu oder wieder weg, genau wie in der Ansicht. Die Pfeile klappen Gruppen auf und zu.
- Das Etikett zeigt, ob ein Teil {{ui:outliner.solid}} oder {{ui:outliner.hole}} ist.
- Schloss und Auge sperren und verstecken einzelne Teile.
- Über {{ui:outliner.rename}} gibst du einem Teil einen eigenen Namen; der Stift neben dem Namen oben in den Einstellungen macht dasselbe für die ausgewählte Form. Vernünftige Namen helfen bei größeren Entwürfen enorm.
- Das Suchfeld findet Formen nach Namen und nach Art, also auch „Zylinder“ oder „Aussparung“. Es sucht auch in Gruppen, egal wie tief verschachtelt: Eine Gruppe mit einem Treffer bleibt in der Liste und klappt auf, sodass die passenden Teile und die Gruppen auf dem Weg dorthin zu sehen sind. Passt der Name der Gruppe selbst, zeigt sie aufgeklappt alle ihre Teile.
- Der Pfeil ganz links in der Titelleiste klappt die Liste bis auf ihre Titelleiste ein und wieder auf.

Die Liste ist rechts neben dem Ansichtswürfel angedockt. An ihrer Titelleiste ziehst du sie an jede Stelle der Arbeitsfläche; dabei gleitet sie unter dem Ansichtswürfel und der Kameraleiste hindurch. Legst du sie neben dem Ansichtswürfel wieder ab oder doppelklickst auf die Titelleiste, dockt sie wieder an. Wo sie stand und ob sie eingeklappt war, merkt sich der Browser.

## Position eintippen

Die Karte {{ui:inspector.position}} im Eigenschaftenfenster zeigt, wo der ausgewählte Körper steht, und du kannst es eintippen: {{ui:prop.positionX}} und {{ui:prop.positionY}} sind die Mitte seines Rahmens auf der Platte, mit denselben Vorzeichen wie die Abstände auf der Arbeitsfläche, {{ui:prop.positionZ}} ist die Höhe seiner Unterkante. Mit {{ui:inspector.positionFrom}} oben in der Karte schaltest du auf {{ui:inspector.positionEdge}}: Dann zeigen X und Y die linke und die vordere Kante des Körpers, so legst du eine Kante genau auf ein Maß. Die Einstellung bleibt, bis du sie zurück auf {{ui:inspector.positionCentre}} stellst. X zählt nach rechts, Y nach hinten und Z nach oben, nach der Rechte-Hand-Regel wie in Tinkercad und CAD-Programmen; die Achsenpfeile an der Platte zeigen die Richtungen. Die Werte gelten in der eingestellten Einheit, und die Regler reichen so weit wie das Ziehen.

## Teile neben der Platte parken

Du kannst eine Form über den Rand der Platte hinausziehen und dort liegen lassen, etwa eine Plattenbreite weit auf jeder Seite, um sie für später aufzuheben. Mit den Pfeiltasten geht es beliebig weit. Ein geparktes Teil gehört weiter zum Entwurf und landet mit im Export. Soll es draußen bleiben, blende es aus oder exportiere nur die Auswahl. Hast du einen Drucker gewählt, warnt layerling beim Export, wenn etwas außerhalb seiner Platte liegt.

## Fangen beim Verschieben

Ziehst du eine Form über die Arbeitsebene, rastet sie an anderen Formen ein: Ihre linke, rechte, vordere oder hintere Kante oder ihre Mitte legt sich genau auf eine Kante oder Mitte einer anderen Form. Eine rosa Hilfslinie zeigt, woran sie gerade hängt. So stellst du zwei Teile bündig nebeneinander oder mittig hintereinander, ohne Zahlen einzutippen. Das gilt auch, wenn das Raster ausgeschaltet ist.

Hältst du beim Ziehen [[Umschalt]] gedrückt, bleibt die Bewegung auf einer Achse: Die Form folgt der Richtung, X oder Y, in die du weiter gezogen hast, und lässt die andere unberührt. Drück [[Umschalt]] am besten erst, wenn du schon ziehst; auf einer Form, die noch nicht ausgewählt ist, nimmt ein Klick mit [[Umschalt]] sie nur zur Auswahl dazu.

Ist [[Alt]] schon gedrückt, wenn das Ziehen beginnt, ziehst du eine Kopie, wie in Tinkercad: Die Form bleibt, wo sie ist, und die Kopie landet dort, wo du loslässt. Drückst du [[Alt]] erst unterwegs, setzt das Fangen aus und die Form folgt nur dem Raster. Auch beim Ziehen einer Kopie fängt sie erst, wenn du [[Alt]] unterwegs loslässt. Ganz abschalten lässt sich das Fangen im Rastermenü unten rechts ({{ui:inspector.objectSnap}}) oder in den Einstellungen. Bisher fängt nur das Verschieben auf der normalen Arbeitsebene, nicht das Anheben und nicht die Größenänderung.

## Ausrichten

Zwei oder mehr ausgewählte Formen richtest du mit {{ui:editor.tool.align}} aneinander aus: Am Rand der Auswahl erscheinen Punkte für links, mittig und rechts, vorn, mittig und hinten sowie oben, mittig und unten. Ein Klick auf einen Punkt schiebt alle Formen dorthin. Klickst du zuerst eine der ausgewählten Formen an, bleibt sie an ihrem Platz und die anderen richten sich nach ihr. Eine gesperrte Form in der Auswahl ist von selbst diese feste Form. Links, rechts, vorn, hinten, oben und unten richten sich nach dem Kasten um eine Form; die Mitte eines Dreiecks, Fünfecks oder Sterns ist ihre eigene Mitte, eine darauf zentrierte Aussparung sitzt also in der Mitte der Form und nicht ihres Kastens.

Eine schräg gedrehte Form, etwa um 45°, hat als Bezug den Kasten um sich herum, nicht ihre eigenen Kanten. Um an den Kanten auszurichten, setzt du zuerst eine Arbeitsebene auf eine Fläche dieser Form ({{ui:camera.placeWorkplane}}, dann die Fläche anklicken): Die Punkte stehen dann auf den Achsen dieser Ebene, und die Formen werden entlang davon gemessen und verschoben, wie in Tinkercad. Setzt du die Arbeitsebene zurück, richtest du wieder an der Platte aus.

![Das Ausrichten zeigt an den Rändern der Auswahl die möglichen Ziele als Punkte.](shot:align)

Die Taste dafür ist [[L]]. [[Esc]] bricht ab.

### Größe angleichen

Hältst du beim Ausrichten [[Alt]] gedrückt, werden die Punkte zu Quadraten, und ein Klick verschiebt die Formen nicht, sondern ändert ihre Größe. Ein Punkt an der Seite streckt jede Form bis an diese Seite, ihre andere Seite bleibt stehen, als hättest du ihren Griff dorthin gezogen. Der Punkt in der Mitte lässt jede Form an ihrem Platz und gibt ihr die Breite, Länge oder Höhe in dieser Richtung. So tauschst du etwa einen Quader gegen einen gleich großen Zylinder oder ersetzt ein verunglücktes Stück eines Netzes durch eine saubere Form. Fährst du mit gedrückter [[Alt]]-Taste über einen Punkt, siehst du vorher, wie groß die Formen werden.

Bezug ist die Form, die du zuerst angeklickt hast; nur die anderen ändern sich. Ohne sie strecken die Seitenpunkte alle Formen bis an die äußerste Seite, und der Mittelpunkt gibt allen die Größe der größten. Ein Zylinder bleibt dabei rund, er wird also auch in der anderen Richtung breiter. Eine Form, die schräg gedreht ist, bleibt, wie sie ist; um 90° gedrehte Formen gehen.

## Spiegeln

{{ui:editor.tool.mirror}} ([[M]], oder per Rechtsklick auf die Auswahl) kippt die Auswahl an einer Ebene: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} oder {{ui:mirror.topBottom}}. Klicke dazu auf den passenden Achsenpfeil. Das ist praktisch für symmetrische Teile: Baue eine Hälfte, kopiere sie und spiegele die Kopie.

## Drehen und den Drehpunkt setzen

Gedreht wird mit den gebogenen Pfeilen an der Form, mit den Zahlen in den Einstellungen oder mit [[R]] in 45°-Schritten. Ziehst du am Drehkreis, rastet die Drehung auf jedem Strich ein, also alle 22,5°; mit der Umschalttaste ([[Shift]]) wird es feiner, dann gibt es zusätzliche Striche alle 11,25°. Ziehst du außerhalb des Kreises, drehst du frei in 1°-Schritten, mit [[Shift]] in 45°-Schritten. Normalerweise dreht sich die Auswahl um ihre Mitte. Manchmal soll sie das nicht, etwa wenn ein gekipptes Rohr an seinem Ende weitergedreht werden soll. Dafür gibt es {{ui:editor.tool.rotationPivot}}: Klicke danach auf eine Fläche. Eine ebene Fläche gibt ihren Mittelpunkt vor, zum Beispiel die Achse eines Rohrendes. Bei einer Gruppe oder einem Bündel geht die Fläche über Teile hinweg, die sich berühren, wie bei einem einzigen Körper, und der Drehpunkt kommt in die Mitte der ganzen Fläche, sobald die Teile zusammengefügt sind, außer bei einer Gruppe oder einem Bündel mit Text oder einem Bündel mit einer Aussparung darin. Die Auswahl dreht sich jetzt um diesen Punkt. Ein zweiter Klick auf das Werkzeug hebt ihn wieder auf.

Die Winkel bleiben am Körper. In seinen Einstellungen zeigt {{ui:inspector.rotation}} sie als {{ui:prop.rotateX}}, {{ui:prop.rotateY}} und {{ui:prop.rotateZ}}, benannt wie die Position: Y läuft quer über die Platte, Z nach oben. Tippst du dort einen Winkel ein, dreht sich der Körper darauf – um seine Mitte oder um seinen eigenen Drehpunkt, falls er einen hat. Solange ein gedrehter Körper ausgewählt ist, stehen seine Winkel auch unter ihm auf der Arbeitsfläche; {{ui:workspace.showRotationAngles}} in den Einstellungen schaltet das ab.

![Ein um zwei Achsen gedrehter Körper: Seine Winkel stehen unter ihm, und die Karte „Drehung“ in seinen Einstellungen nimmt sie als Zahlen.](shot:rotation-card)

Ist **ein Körper** gewählt, gehört der Drehpunkt zu diesem Körper: Wähle andere Teile und komm zurück, und er ist noch da. Er wandert, dreht sich und skaliert mit dem Körper, wird im Projekt gespeichert und kommt mit „Rückgängig“ zurück. Unter {{ui:inspector.position}} hat der Drehpunkt eigene Werte für X, Y und Z, die du eintippen oder verschieben kannst, und {{ui:inspector.pivotRemove}} nimmt ihn weg. Die rote Markierung des Drehpunkts kannst du auch mit der Maus ziehen: Sie gleitet über die Oberfläche der Körper und rastet an Ecken, Kantenmitten und Kanten ein, so dass ein Scharnierstift genau auf eine Ecke kommt. Sind mehrere Körper gewählt, gilt der Drehpunkt nur für diese Auswahl, und eine neue Auswahl hebt ihn auf. Gruppierst oder bündelst du sie, bleibt er erhalten: Die Gruppe übernimmt ihn als eigenen Drehpunkt, mit X, Y und Z unter {{ui:inspector.position}}.

## Auf eine Fläche legen

Ein Teil soll für den Druck auf seiner besten Seite liegen? Wähle es aus, klicke auf {{ui:editor.tool.layFlat}} und dann auf die Fläche, die nach unten soll. Wenn du mit dem Zeiger über das Teil fährst, leuchtet die Fläche darunter auf, du siehst also vorher, welche du gleich nimmst; drehe die Ansicht, um die anderen Seiten zu prüfen. Das Teil dreht sich so, dass diese Fläche auf der Arbeitsebene liegt.

Zwei Teile sollen Fläche an Fläche liegen oder bündig abschließen? Wähle das Teil aus, das sich bewegen soll, klicke auf {{ui:editor.tool.mateFaces}}, dann auf seine Fläche und danach auf die Fläche des anderen Teils. Im Panel legt {{ui:mate.mode.against}} die Flächen aneinander (Rücken an Rücken, berührend), {{ui:mate.mode.flush}} legt sie nebeneinander in eine Ebene; {{ui:mate.gap}} lässt Platz dazwischen, etwa als Spiel. {{ui:mate.apply}} bewegt das Teil: Es dreht sich auf kürzestem Weg, bis die Flächen parallel sind – gar nicht, wenn sie es schon sind –, und rückt dann nur auf die andere Fläche zu, behält seine seitliche Lage also. Das andere Teil bleibt, wo es ist, und ein Rückgängig nimmt alles zurück.

![Das Fenster „Flächen ausrichten“: Das Teil, das sich bewegt, ist gewählt, als Nächstes kommt eine Fläche des anderen Teils, dann „Gegeneinander“ oder „Bündig“ und ein Abstand, wenn du willst.](shot:mate-faces)

**Löcher auf eine Achse:** {{ui:mate.mode.concentric}} richtet stattdessen runde Flächen aus: ein Loch über ein Loch, einen Zapfen in ein Loch, eine Schraube in ihre Durchgangsbohrung. Wähle die Art, bevor du die Flächen anklickst. Klicke dann die runde Innenseite eines Lochs (oder die Außenseite eines Zapfens) am Teil, das sich bewegen soll, und danach eine runde Fläche des anderen Teils; beim Zeigen leuchtet die ganze runde Fläche auf. {{ui:mate.apply}} dreht das Teil auf kürzestem Weg, bis beide Achsen parallel sind, und schiebt es quer auf die andere Achse. Entlang der Achse bleibt es, wo es war, ein Zapfen behält also seine Höhe; schieb ihn danach hinein. Das klappt auch bei importierten Netzen, solange das Loch aus Facetten rund um eine Achse besteht.

**Ein genauer Winkel zwischen zwei Flächen:** {{ui:editor.tool.mateFaces}} lässt die Flächen parallel; für einen Winkel dazwischen gibt es kein eigenes Werkzeug, aber so kommst du hin. Bring zuerst die Flächen mit {{ui:editor.tool.mateFaces}} zusammen, so dass sie parallel liegen. Setze dann den Drehpunkt auf die Kante, an der sie sich treffen ({{ui:editor.tool.rotationPivot}}, Kante oder Ecke anklicken) und tippe den Winkel, etwa 15 oder 30, in der Karte {{ui:inspector.rotation}} des Teils. Es dreht sich um diesen Drehpunkt. Die Achsen der Karte sind die Achsen der Platte, deshalb klappt das, wenn die Kante entlang X, Y oder Z läuft.

Ähnlich einfach sind {{ui:editor.tool.dropToWorkplane}} ([[D]]), das die Auswahl auf die Arbeitsebene absetzt, und {{ui:editor.tool.centerOnWorkplane}}. Liegt die Arbeitsebene auf einer Fläche, zentriert es auf den Punkt, den du mit [[W]] angeklickt hast, und schiebt die Auswahl nur entlang der Fläche: Was darauf steht, bleibt darauf stehen.

Mit [[C]] nimmst du die Auswahl auf, wie mit Cruise in Tinkercad: Sie hängt am Mauszeiger und legt sich auf die Fläche eines anderen Körpers, über der du gerade bist, auch auf eine schräge. Ein Klick setzt sie dort ab, [[Esc]] lässt sie, wo sie war. Ihre Unterseite liegt dann auf der Fläche, und sie richtet sich nach deren Kanten aus wie eine neue Form; eine eigene Drehung um ihre Hochachse behält sie. Mehrere Teile wandern zusammen und behalten ihren Abstand. Über der leeren Platte stellt [[C]] ein gekipptes Teil wieder aufrecht auf die Arbeitsebene. Ohne Tastatur steht dafür {{ui:contextMenu.carry}} im Menü des langen Drucks.

## Muster: Reihe und Kreis

Für Lochraster, Lochkreise und Zahnkränze gibt es das {{ui:editor.tool.array}}. Wähle die Formen aus, die vervielfältigt werden sollen, und klicke im Menüband darauf.

![Das Muster im Modus „Kreis“: Die Kopien erscheinen zuerst als Vorschau.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** Die Auswahl wird mit gleichem Abstand wiederholt. Die Reihe läuft in allen drei Achsen zugleich, mit {{ui:array.spacingX}}, {{ui:array.spacingY}} und {{ui:array.spacingZ}}: Einer allein gibt eine gerade Reihe, zwei oder drei eine schräge Reihe oder eine Treppe. Ein negativer Abstand legt die Reihe in die andere Richtung.
- **{{ui:array.mode.circle}}:** Die Auswahl wird um einen Mittelpunkt verteilt. Wie viele Kopien es gibt, stellst du bei {{ui:array.count}} ein, der {{ui:array.angle}} ist für einen vollen Kreis 360°. Stelle ein, ob sich die Kopien mitdrehen sollen. {{ui:array.rise}} hebt jede Kopie ein Stück höher als die vorige (eine Schraube oder aufsteigende Spirale), und {{ui:array.radiusChange}} rückt sie weiter vom Mittelpunkt weg oder näher heran (eine flache Spirale); zusammen ergeben sie eine kegelige Spirale. Eine Spirale macht höchstens eine Windung: Ein Winkel über 360° zählt als voller Kreis, und es gibt höchstens 100 Kopien.

Tipp: Setze vorher mit {{ui:editor.tool.rotationPivot}} den Drehpunkt auf eine Fläche, dann liegt der Mittelpunkt des Kreises genau dort.

Danach behalten die Teile den Mittelpunkt des Kreises als Drehpunkt, auch gruppiert. Dorthin gehört ein weiteres Teil, etwa eine Kugel zwischen drei Beinen: Die Mitte des Rahmens um die Teile ist nicht der Mittelpunkt, weil drei Beine einen Rahmen füllen, der in eine Richtung breiter ist. Klicke die Teile mit der rechten Maustaste an und wähle {{ui:contextMenu.markPivot}}, dann rastet die Mitte des Teils, das du ziehst, dort ein.

![Das Muster im Modus „Kreis" mit Anstieg und Radiusänderung pro Kopie: Die Kopien steigen und weiten sich wie eine Spirale.](shot:pattern-spiral)

Die Kopien erscheinen zuerst als Vorschau. Erst {{ui:array.apply}} legt sie an. Sind die Kopien Aussparungen, gruppierst du sie danach mit dem Körper, in den sie schneiden sollen.

Ist {{ui:array.groupCopies}} angehakt, gruppiert {{ui:array.apply}} das Original und alle Kopien im selben Schritt zu einem Objekt, wie es {{ui:editor.tool.group}} täte: Ein Kranz aus 36 Stücken ist dann ein Teil, das du verschieben, einfärben oder zum Schneiden nehmen kannst. Ab 6 Stücken hakt sich das Kästchen selbst an; hakst du es selbst an oder ab, bleibt es so. {{ui:editor.tool.ungroup}} holt die Stücke zurück. Klappt das Gruppieren nicht, kommt das Muster trotzdem als einzelne Stücke an, und die Meldung sagt, warum.

## Lochmuster auf einer Fläche

Für Lüftungsschlitze, Lautsprechergitter, Körbe und Gehäuse verteilt das {{ui:holePattern.title}} Löcher gleichmäßig auf einer ebenen Fläche. Du musst dafür kein Loch einzeln anlegen, vervielfältigen und an die Wand setzen. Wähle genau einen Körper aus und klicke in der Gruppe {{ui:editor.group.modify}} der Werkzeugleiste auf {{ui:holePattern.title}}, gleich neben dem Muster. Du kannst auch mit der rechten Maustaste auf den Körper klicken oder es mit [[Strg]]+[[K]] suchen.

1. Klicke eine ebene Fläche des Körpers an. Die ganze ebene Fläche um deinen Klick zählt, nicht nur das Dreieck unter dem Mauszeiger. Eine gewölbte Fläche geht nicht: Du bekommst einen Hinweis und klickst eine ebene an. Bei einer Gruppe oder einem Bündel geht eine Fläche über Teile hinweg, die sich berühren, wie bei einem einzigen Körper, bei einem Bündel aber nur, wenn keine Aussparung darin steckt. Die Teile werden zusammengefügt, kurz nachdem du das Werkzeug öffnest; bis dahin leuchtet unter dem Mauszeiger nur die Fläche eines Teils auf, und ein Klick wartet, bis sie zusammengefügt sind. Bei einer Gruppe oder einem Bündel mit Text leuchtet nur die Fläche eines Teils auf, und erst der Klick fügt die Teile zusammen.
2. Stelle im Fenster ein, wie die Löcher aussehen und liegen:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} oder {{ui:holePattern.form.slot}}.
   - **Größe:** der {{ui:holePattern.size.diameter}} eines runden Lochs, die {{ui:holePattern.size.side}} eines quadratischen, {{ui:holePattern.size.width}} und {{ui:holePattern.size.height}} bei Rechteck und Langloch. Beim Sechseck gilt das Maß {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** der Abstand von einer Lochmitte zur nächsten. Ist er kleiner, als die Löcher zulassen, setzt layerling ihn auf das kleinste mögliche Maß, damit zwischen den Löchern noch ein Steg bleibt. Bei Rechtecken und Langlöchern gilt er in der Reihe, also von links nach rechts.
   - **{{ui:holePattern.rowSpacing}}:** nur bei Rechtecken und Langlöchern: der Abstand von einer Reihe zur nächsten. So stehen schmale, hohe Löcher dicht nebeneinander, und die Reihen halten trotzdem Abstand. Ein 2 mm breites und 14 mm hohes Loch braucht mit 2 mm Steg in der Reihe 4 mm und von Reihe zu Reihe 16 mm.
   - **{{ui:holePattern.wall}}:** derselbe Abstand, nur anders gesagt: der Steg, der zwischen zwei Nachbarlöchern stehen bleibt, also die Wandstärke im Druck. Stellst du ihn ein, folgt der Abstand von Mitte zu Mitte (bei Rechtecken und Langlöchern auch der Reihenabstand), und umgekehrt. Bei Sechsecken, Rechtecken und Langlöchern misst layerling den kleinsten Abstand zwischen den Rändern.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} legt die Löcher in Zeilen und Spalten. {{ui:holePattern.arrangement.staggered}} rückt jede zweite Zeile um einen halben Abstand und die Zeilen näher zusammen, so dass jedes Loch Nachbarn im gleichen Abstand hat - mit Sechsecken ergibt das eine Wabe.
   - **{{ui:holePattern.margin}}:** der freie Abstand zwischen den Löchern und der Kante der Fläche. Nur Löcher, die ganz innerhalb von Fläche minus Rand liegen, werden angelegt; was darüber hinausragen würde, fällt weg. Auch um Öffnungen in der Fläche bleibt dieser Rand.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (die Vorgabe) schneidet durch die ganze Wand. Mit {{ui:holePattern.depth.custom}} gibst du die Tiefe in Millimetern an, etwa für Vertiefungen.
3. Die Löcher erscheinen sofort als Vorschau auf der Fläche und ändern sich mit jedem Wert. Das Fenster sagt, wie viele Löcher passen. Mit {{ui:holePattern.repick}} wählst du eine andere Fläche, [[Esc]] schließt das Werkzeug, und wie die anderen Werkzeugfenster lässt es sich an der Titelleiste verschieben.
4. Erst {{ui:holePattern.apply}} legt die Löcher an.

Die Löcher sind ganz gewöhnliche Aussparungen und mit dem Körper gruppiert, genau wie nach {{ui:editor.tool.group}}: Nichts ist eingebacken. {{ui:editor.tool.ungroup}} löst die Gruppe wieder auf und gibt jedes Loch frei, das du dann einzeln verschieben, ändern oder löschen kannst. Das Ganze ist ein Schritt für {{ui:editor.tool.undo}}. Mehr als 400 Löcher auf einmal legt das Werkzeug nicht an; dann machst du die Löcher größer oder den Abstand weiter.

Eine KI kann dasselbe über die MCP-Schnittstelle tun, mit `layerling_perforate_face` (siehe das Kapitel [KI mit MCP](chapter:ki-mit-mcp)).

## Eine Fläche heraus- oder hineinziehen

Für eine dickere Wand, eine Erhebung auf einer Fläche oder eine hineingeschnittene Tasche arbeitet das Werkzeug {{ui:faceTool.title}} an einer ebenen Fläche. Es geht auch bei einem importierten STL, an dem es keine Skizze zu ändern gibt. Wähle genau einen Körper aus und klicke in der Gruppe {{ui:editor.group.modify}} der Werkzeugleiste auf {{ui:faceTool.title}}, gleich neben dem Lochmuster. Du kannst auch mit der rechten Maustaste auf den Körper klicken oder es mit [[Strg]]+[[K]] suchen.

1. Klicke eine ebene Fläche des Körpers an. Wie beim Lochmuster zählt die ganze ebene Fläche um deinen Klick; eine gewölbte Fläche geht nicht. Bei einer Gruppe oder einem Bündel geht die Fläche wie beim Lochmuster über Teile hinweg, die sich berühren.
2. Im Fenster:
   - **{{ui:faceTool.direction}}:** {{ui:faceTool.direction.out}} für Material auf der Fläche oder {{ui:faceTool.direction.in}} für eine hineingeschnittene Tasche. Eine Tasche geht nicht tiefer als der Körper hinter der Fläche; bei einem ausgehöhlten Körper kann sie trotzdem bis in den Hohlraum reichen.
   - **{{ui:faceTool.inset}}:** wie weit der neue Umriss innerhalb der Flächenkante bleibt. Nach außen nimmt 0 die ganze Fläche, so wird eine Wand dicker. Öffnungen in der Fläche werden um denselben Betrag größer.
   - **{{ui:faceTool.radius}}:** rundet jede Ecke des Umrisses, auch die inneren, so endet eine spitze Ecke in einem Bogen. Eine Kerbe, die schmaler als der doppelte Radius ist, schließt sich, und ein Teil der Fläche, der schmaler ist als das Doppelte von Rand und Radius zusammen, fällt weg.
   - **{{ui:faceTool.depth}}:** wie weit das neue Teil aus der Fläche ragt oder wie tief die Tasche wird.
   - **{{ui:faceTool.separate}}:** Ist der Schalter an, steht das neue Teil (oder das Loch einer Tasche) als eigener Körper neben dem Körper statt in einer Gruppe mit ihm; du kannst es gleich in der Größe ändern, verschieben oder damit schneiden.
3. Das Ergebnis erscheint sofort als Vorschau und ändert sich mit jedem Wert. Mit {{ui:faceTool.repick}} wählst du eine andere Fläche, [[Esc]] schließt das Werkzeug.
4. Erst {{ui:faceTool.apply}} legt es an.

Was das Werkzeug anlegt, ist ein ganz gewöhnlicher Skizzenkörper, mit dem Körper gruppiert, es sei denn {{ui:faceTool.separate}} ist an (dann ist das Teil frei und es gibt keine Gruppe zu öffnen): Nichts ist eingebacken. {{ui:group.edit}} öffnet die Gruppe, und {{ui:inspector.editSketch}} am neuen Teil zeigt den Umriss, dem es folgt. Auf der Ober- oder Unterseite eines schlichten Skizzenkörpers - ein einziger Bereich, nicht gruppiert, gespiegelt, verjüngt, verdreht oder geneigt, ohne Kontur, Schlüsselringloch, Fase oder Verrundung - ist das der eigene Umriss des Körpers, beim Bauen nach innen versetzt, so bleiben seine Linien und Bögen exakt, wo der CAD-Kern sie versetzen kann, für die Kantenwerkzeuge und den STEP-Export. Später in der Größe geändert, behält das Teil seinen Rand. Auf jeder anderen Fläche, auch auf einem importierten Netz, folgt der Umriss den Dreiecken der Fläche, und eine Kurve besteht aus kurzen geraden Stücken. Das Ganze ist ein Schritt für {{ui:editor.tool.undo}}. Um Rand oder Radius später zu ändern, mach den Schritt rückgängig und nimm das Werkzeug noch einmal. Um die obere Kante danach zu runden, nimm {{ui:editor.tool.fillet}} mit {{ui:edge.topEdges}} an der Gruppe als letzten Schritt: Wie jede Kantenbehandlung an einer Gruppe macht sie die Gruppe zu einem Körper.

Eine KI kann dasselbe über die MCP-Schnittstelle tun, mit `layerling_push_face` (siehe das Kapitel [KI mit MCP](chapter:ki-mit-mcp)).

## Mehrere Teile auf einmal ändern

Sind mehrere Teile ausgewählt, zeigt das Eigenschaften-Feld rechts, wie viele es sind, und bietet an, was für alle zugleich gilt: {{ui:inspector.solid}} oder {{ui:inspector.hole}}, eine Farbe für alle (ein Klick auf {{ui:inspector.solid}} öffnet die Farben) und das Schloss zum Sperren. Ist die Auswahl gemischt, macht ein Klick alle zu Körpern oder alle zu Aussparungen. Ist eines der Teile gesperrt, lässt sich nur das Schloss bedienen. Maße änderst du mit den Griffen, mit {{ui:scalePercent.title}} oder indem du eine Zahl in ein Maßschild tippst. Bei mehreren Teilen ist die Zahl das Maß der ganzen Auswahl: Alle Teile wachsen mit, samt den Abständen dazwischen, wie beim Ziehen am Griff. Körper und Aussparung gehen auch per Rechtsklick oder mit [[S]] und [[H]].

## Um Prozent skalieren

Sollen ein oder mehrere Teile um denselben Anteil größer oder kleiner werden, etwa alle Teile einer Druckdatei um 20 %, nimmst du {{ui:scalePercent.title}}. Wähle die Teile aus, klicke mit der rechten Maustaste darauf und wähle {{ui:scalePercent.title}}, oder suche es mit [[Strg]]+[[K]].

Bei {{ui:scalePercent.percent}} gibst du die neue Größe in Prozent der jetzigen ein: 120 % ist ein Fünftel größer, 50 % halb so groß. Breite, Tiefe und Höhe ändern sich dabei gleich, die Proportionen bleiben also erhalten. Die Unterseite bleibt, wo sie ist, so dass nichts in die Platte rutscht.

Bei mehreren Teilen wählst du, wie sie wachsen:

- **{{ui:scalePercent.mode.together}}:** Die Teile wachsen um ihre gemeinsame Mitte, die Abstände wachsen mit. Das Ganze wird größer, als wäre es ein Teil.
- **{{ui:scalePercent.mode.each}}:** Jedes Teil wächst an seinem Platz, die Abstände dazwischen bleiben gleich.

Das Prozentfeld hat beim Öffnen den Fokus, mit der Tastatur geht es also so: [[Strg]]+[[K]], Prozentwert, [[Enter]]; mit [[Esc]] schließt du das Fenster. Erst {{ui:scalePercent.apply}} (oder [[Enter]] im Feld) ändert den Entwurf, und ein Schritt zurück macht es wieder rückgängig. Ist ein gesperrtes Teil in der Auswahl, öffnet es sich nicht.

## Rückgängig machen

{{ui:editor.tool.undo}} ([[Strg]]+[[Z]]) und {{ui:editor.tool.redo}} ([[Strg]]+[[Umschalt]]+[[Z]] oder [[Strg]]+[[Y]]) gehen Schritt für Schritt durch deinen Verlauf. Wie viele Schritte mit dem gespeicherten Entwurf mitreisen, stellst du in den Einstellungen unter {{ui:workspace.history}} ein.

## Zurückschauen: die Verlaufsansicht

{{ui:editor.tool.history}}, neben Rückgängig und Wiederherstellen, öffnet einen Blick in deinen Verlauf, ohne etwas zu ändern. Die Arbeitsfläche zeigt den Entwurf, wie er war, und ein Schieber unten geht durch alle Rückgängig-Schritte: ganz rechts der aktuelle Stand, jeder Schritt nach links ein Rückgängig früher, und Stände, die du rückgängig gemacht hast, liegen rechts vom aktuellen. Die Pfeiltasten gehen durch die Stände, [[Esc]] kehrt zum aktuellen Stand zurück. Das Mausrad über dem Schieber tut dasselbe, ein Stand je Raste, nach oben zu einem früheren; [[Bild↑]] und [[Bild↓]] springen zehn Stände, [[Pos1]] geht zum ältesten Stand und [[Ende]] zurück zum aktuellen. Du kannst die Ansicht derweil drehen und zoomen und Objekte anklicken, um sie zurückzuholen (siehe unten), aber nichts verschieben; der Entwurf selbst bleibt genau, wie er ist. Verdeckt die Leiste etwas, ziehst du sie an ihrer Titelleiste weg; ein Doppelklick darauf holt sie zurück.

Zwei Dinge kannst du aus einem früheren Stand mitnehmen. {{ui:historyView.createProject}} legt diesen Stand als neuen Entwurf in der Übersicht an, benannt nach diesem hier mit der Zeit des Standes in Klammern - bei einem Entwurf, der gespeichert wurde, bevor layerling Zeiten festhielt, steht stattdessen „Kopie“ - und mit dem Verlauf bis dorthin, sodass Rückgängig dort weitergeht. {{ui:historyView.export}} öffnet den gewohnten Export mit diesem Stand als Entwurf, sodass du ihn als STL, 3MF, STEP, Bild oder LYL-Datei mit dem Verlauf bis zu diesem Stand sichern kannst.

Du kannst auch einzelne Objekte in den Entwurf zurückholen. Klicke im gezeigten Stand auf ein Objekt - [[Shift]]+Klick nimmt weitere dazu oder eines wieder heraus, ein Klick ins Leere wählt nichts - und wähle {{ui:historyView.bringBack}}. Die Ansicht schließt sich, und eine Kopie jedes Objekts kommt in den aktuellen Entwurf, genau so, wie es in diesem Stand war, und an der Stelle, an der es dort stand, ausgewählt, neben allem, was der Entwurf jetzt enthält; sonst ändert sich nichts. Das ist ein Schritt, Rückgängig nimmt ihn zurück. So holst du die Fassung eines Teils zurück, das du seitdem geändert oder gelöscht hast. Eine Gruppe kommt als Ganzes; Notizen und Bezugspunkte an einem Objekt bleiben zurück. Sein Name trägt die Zeit dieses Stands, etwa „Würfel (12:32)“, damit er sich leicht von der Fassung unterscheiden lässt, die der Entwurf jetzt hat. Um ein Teil aus einer Gruppe zurückzuholen, wähle die Gruppe aus und wähle {{ui:historyView.openGroup}} oder drücke [[E]], wie im Entwurf: Ihre Teile liegen dann dort, wo das Bearbeiten der Gruppe sie hinlegen würde, bereit zum Auswählen, und die Leiste zeigt, in welcher Gruppe du bist. {{ui:historyView.backOut}} schließt sie wieder. Das ist nur zum Ansehen - Gruppe, Entwurf und Verlauf bleiben, wie sie sind.

{{ui:historyView.delete}} sitzt allein unten links in der Leiste. Nach einer Rückfrage entfernt es jeden früheren Schritt endgültig: Der Entwurf behält den Stand, den er jetzt hat (nicht den gezeigten), Rückgängig hat nichts mehr, wohin es zurückkann, und eine danach gespeicherte Datei enthält keinen Verlauf. Es dient dazu, einen Entwurf ohne seine Vergangenheit weiterzugeben oder die Rückgängig-Schritte neu zu beginnen. Es lässt sich nicht zurücknehmen; um nur eine Datei ohne Verlauf weiterzugeben, wähle beim Export stattdessen {{ui:export.historyNone}}.
