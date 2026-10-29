---
title: Körper und Aussparungen
summary: Wie aus einfachen Formen Bohrungen, Nuten und Taschen werden – und wie du eine Gruppe später noch einmal ändern kannst.
---

Das ist die wichtigste Idee in layerling, und sie ist schnell gelernt: **Jede Form ist entweder ein Körper oder eine Aussparung.** Ein Körper bleibt stehen. Eine Aussparung ist ein Werkzeug, das Material wegnimmt.

## Körper oder Aussparung

Wähle eine Form aus und klicke in ihren Einstellungen auf {{ui:inspector.solid}} oder {{ui:inspector.hole}}. Schneller geht es mit der Tastatur: [[H]] macht die Auswahl zur Aussparung, [[S]] wieder zum Körper. Beides steht auch im Menü, das ein Rechtsklick auf den Körper öffnet. Eine Aussparung erscheint durchscheinend, damit du siehst, wo sie sitzt. Einen Körper machst du mit [[T]] durchsichtig, etwa um in ein Gehäuse zu schauen; ein zweiter Druck macht ihn wieder undurchsichtig. [[T]] gilt für die ganze Auswahl: Ist schon einer durchsichtig, werden alle undurchsichtig, sonst alle durchsichtig.

Solange nichts gruppiert ist, passiert mit einer Aussparung nichts. Sie liegt nur da und zeigt, wo später etwas wegfallen soll.

![Der Zylinder ist eine Aussparung. Er ragt oben aus dem Würfel heraus, damit er ihn ganz durchschneidet.](shot:hole-before)

## Gruppieren

Markiere Körper und Aussparung(en) und klicke auf {{ui:editor.tool.group}} ([[Strg]]+[[G]]). Jetzt nehmen die Aussparungen das Material aus den Körpern, die sie berühren. Übrig bleibt eine einzige neue Form.

![Das Ergebnis: ein Würfel mit einer Bohrung.](shot:hole-after)

So entstehen:

- **Bohrungen:** ein Zylinder als Aussparung durch einen Körper.
- **Nuten:** ein länglicher Quader als Aussparung an der Kante.
- **Taschen:** eine Aussparung, die nicht ganz durchgeht.
- **Gewinde in einem Teil:** ein Gewindeloch als Aussparung, siehe [Gewinde und Mechanik](chapter:gewinde-und-mechanik).

Sind mehrere Körper in der Gruppe, werden sie verbunden. Zwei sich berührende Körper werden also ein einziges Teil.

Bei großen Netzen, etwa einem importierten STL mit Hunderttausenden Dreiecken, dauert das Ausschneiden ein paar Sekunden. layerling rechnet dann im Hintergrund und zeigt „{{ui:status.computing}}“; die Ansicht lässt sich währenddessen drehen und die Oberfläche bedienen. Änderst du in der Zeit die Szene, wird das Ergebnis verworfen und layerling sagt es dir. Dasselbe gilt für {{ui:editor.tool.split}}.

Eine Gruppe darfst du weiter behandeln wie eine Form: verschieben, drehen, einfärben, wieder gruppieren. Mit {{ui:editor.tool.ungroup}} ([[Strg]]+[[Umschalt]]+[[G]]) löst du sie auf, und die Einzelteile sind wieder da.

### Eine Gruppe zur Aussparung machen

Auch eine ganze Gruppe kann ein Körper oder eine Aussparung sein. Dabei gilt eine einfache Regel:

- Besteht die Gruppe nur aus Körpern (oder nur aus Aussparungen), schaltest du sie als Ganzes um, und ihre Teile gehen mit.
- Enthält sie beides, etwa einen Würfel mit Bohrung, behält jedes Teil seinen eigenen Zustand. Die ganze Gruppe wird dann zum Werkzeug, aber die Bohrung bleibt eine Bohrung.

## Bündeln

Manchmal sollen Teile nur zusammenbleiben, ohne eins zu werden – etwa ein weißes Logo auf einer schwarzen Platte für den Mehrfarbdruck. Dafür gibt es {{ui:editor.tool.bundle}} ([[Strg]]+[[B]]), wie in Tinkercad. Ein Bündel lässt sich verschieben, drehen und in der Größe ändern wie eine Form, aber nichts wird verrechnet:

- Jedes Teil behält seine Farbe und bleibt Körper oder Aussparung. Die Einstellungen des Bündels haben dieselben Karten wie die einer Gruppe: {{ui:inspector.solid}} und {{ui:inspector.hole}} für das ganze Bündel (die Farben der Teile bleiben dabei), {{ui:inspector.transparent}} ([[T]]) und {{ui:inspector.multicolor}} ([[Umschalt]]+[[M]]); ist „Multicolor“ ausgeschaltet, zeigt und exportiert sich das Bündel in einer Farbe. {{ui:inspector.separateParts}} löst das Bündel auf, wie es [[Strg]]+[[Umschalt]]+[[G]] tut.
- Aussparungen schneiden nicht. Gruppierst du das Bündel mit anderen Teilen, schneiden seine Aussparungen diese Teile, die Körper des Bündels selbst aber weiterhin nicht – wie in Tinkercad. So lässt sich zum Beispiel ein Zapfen mit seiner Bohrung daneben als Bündel immer wieder verwenden.
- Beim Export als STL, 3MF oder OBJ ist jedes Teil ein eigener Körper; im 3MF und OBJ mit seiner Farbe.

{{ui:editor.tool.ungroup}} ([[Strg]]+[[Umschalt]]+[[G]]) löst ein Bündel wieder auf, [[E]] öffnet es zum Bearbeiten wie eine Gruppe. Kanten fasen, verrunden und aushöhlen geht an einem Bündel nicht, weil es kein einzelner Körper ist: Gruppiere es dafür, oder bearbeite seine Teile einzeln. Soll eine Aussparung im Bündel auch dessen eigene Körper schneiden, löse das Bündel auf und gruppiere seine Teile ([[Strg]]+[[G]]).

## Schnittmenge

{{ui:editor.tool.intersect}} behält nur das, was zwei oder mehr Körper gemeinsam haben. Lege zwei überlappende Formen übereinander, markiere beide und klicke darauf. So entsteht zum Beispiel aus einem Zylinder und einem Quader ein Stück mit runder und gerader Seite. Eine Gruppe zählt dabei so, wie sie aussieht, also mit ihren Bohrungen. Ist eine Aussparung mit markiert, bleibt das, was alle Körper mit allen Aussparungen gemeinsam haben. Haben die Formen nichts gemeinsam, bleibt alles, wie es ist, und eine Meldung sagt es. Daneben zeigt {{ui:editor.tool.intersectPreview}} das gemeinsame Stück, bevor du es anwendest: Die markierten Formen werden durchsichtig, und was sie gemeinsam haben, ist grün gezeichnet. Markiere und verschiebe jede Form einzeln, und das grüne Stück folgt; {{ui:editor.tool.intersect}} wendet es an, [[Esc]] schließt die Vorschau.

{{ui:editor.tool.hull}} hüllt die markierten Formen in einen einzigen konvexen Körper, als wären sie in Schrumpffolie gepackt: den kleinsten Körper ohne Dellen, der alle umfasst. Aus einer Halbkugel auf einem Zylinder wird eine Kuppel ohne Absatz, aus vier Zylindern an den Ecken ein Kasten mit runden Ecken, aus zwei Kugeln eine Kapsel. Aussparungen in der Auswahl werden danach aus der Hülle herausgeschnitten. Die Teile bleiben darin: {{ui:group.edit}} öffnet die Hülle wie eine Gruppe, und wer dort ein Teil verschiebt und abschließt, bekommt die Hülle neu berechnet. Die Hülle ist ein Dreiecksnetz, runde Formen zeigen also Facetten, und die Kantenwerkzeuge wirken darauf wie auf jedes Netz.

{{ui:editor.tool.cookieCutter}} macht aus der Auswahl mit einem Klick eine Ausstechform: eine dünne Wand um den Umriss, 15 mm hoch, und ein flacher Rand von 2 mm Höhe um ihren Fuß, damit die Form auf dem Rand steht und der Daumen etwas zum Drücken hat. Wähle eine importierte SVG oder einen Skizzenkörper, dann gilt dessen eigener Umriss, Löcher bleiben offen. Jede andere Form, ob in layerling gebaut, ein importiertes Netz oder mehrere Teile, liefert den Umriss, auf dem sie steht: den Schnitt der Arbeitsfläche durch die Form, stelle sie also vorher auf die Arbeitsfläche. Der Umriss wird seitenverkehrt gebaut: Die Form wird auf ihrem Rand stehend gedruckt und zum Ausstechen umgedreht, so kommen Schrift und Logos richtig herum aus dem Teig. Die Wand läuft oben auf eine 0,4 mm breite Schneidkante zu. Die Ausstechform ersetzt die Auswahl als Bündel aus zwei Skizzenkörpern, {{ui:group.edit}} öffnet es. Wand und Rand sind die Füllarten der Skizze, eine Linie außen an der Silhouette: Dicke, Höhe und Farbe änderst du bei jedem Teil unter Eigenschaften, dort auch die {{ui:prop.sketchCuttingEdge}} der Wand (0 für oben flach). Wo eine enge Biegung keinen Platz für eine Fase auf beiden Seiten lässt, wird die Wand nur außen abgeschrägt, auf dieselbe Kante. Ein Umriss, den die Form aus dem nimmt, worauf ein Körper steht, etwa ein Textkörper, besteht aus kurzen geraden Stücken, die keine Kante tragen: Die Wand bleibt oben flach, und die Meldung sagt das. Für eine scharfe Kante importierst du die Schrift als SVG. Soll der Umriss bleiben, wie er gezeichnet ist, spiegle die Form mit {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}} zurück. Bilder lassen sich nicht nachzeichnen: Mache daraus zuerst eine Vektorzeichnung, zum Beispiel mit Inkscape (Pfad, Bitmap nachzeichnen), und importiere diese SVG.

{{ui:editor.tool.loftSketches}} verbindet zwei Skizzenkörper oder importierte SVGs zu einem Körper: unten liegt der Umriss des unteren, oben der des oberen, dazwischen gerade Wände. So entsteht ein Trichter, ein Übergangsstück von eckig auf rund oder ein Rahmen, der sich nach oben verjüngt. Lege die beiden Körper dafür übereinander, wo sie hin sollen, auch versetzt und gedreht, markiere beide und klicke auf das Werkzeug. Der Übergang reicht von der Unterseite des unteren Körpers bis zur Oberseite des oberen.

Jeder der beiden braucht genau einen Umriss. Hat er ein Loch, etwa ein Ring, braucht der andere ebenso viele, und die Löcher werden mitgezogen: Aus zwei Ringen wird eine hohle Wand. Eine Skizze, die als Linie gebaut ist (unter Eigenschaften „Linie“ außen, innen oder mittig), zählt als solcher Ring. Eine importierte SVG kommt gefüllt herein; soll sie ein Ring sein, wähle bei ihr unter Eigenschaften eine Linie. Die beiden Körper müssen flach liegen, gekippte nimmt das Werkzeug nicht.

Der Übergang ist ein genauer CAD-Körper; das Kantenwerkzeug und der STEP-Export nehmen ihn als solchen. Die beiden Skizzen bleiben darin: {{ui:group.edit}} öffnet sie wie eine Gruppe, und wer dort eine verschiebt, ändert oder ihre Skizze bearbeitet und abschließt, bekommt den Übergang neu gebaut. {{ui:editor.tool.ungroup}} gibt die beiden Skizzen wieder frei. Für zwei Rechtecke, Kreise oder Vielecke gibt es außerdem die Form „Übergang“ unter den Formen, deren Enden du als Zahlen einstellst.

## Körper ausschneiden

Bei Teilen, die zusammenpassen müssen, eine Welle in einer Hülse, eine Schraube in einem Gehäuse, baust du das eine Teil und schneidest es aus dem anderen aus. Wähle die beiden Körper und klicke im Bereich {{ui:editor.group.combine}} auf {{ui:editor.tool.cutOut}}, oder klicke mit rechts und wähle es dort. Das Fenster nennt das Teil, das bleibt, und den Körper, der die Aussparung bekommt; layerling nimmt den kleineren als Teil, und {{ui:cutOut.swap}} dreht es um. Das {{ui:cutOut.clearance}} macht die Aussparung ringsum um so viel größer als das Teil: 0 passt genau, 0,2 mm ist ein üblicher Wert für eine gedruckte Passung. {{ui:cutOut.apply}} schneidet eine Kopie des Teils aus dem anderen Körper und lässt das Teil selbst, wo es ist. Das Ergebnis ist eine Gruppe: {{ui:editor.tool.ungroup}} nimmt den Schnitt wieder auseinander. Ein Spiel verlangt, dass das Teil ein exakter Körper ist, wie beim Werkzeug {{ui:editor.tool.offset}}, das dafür benutzt wird.

## Eine Gruppe bearbeiten

Ist eine Bohrung zu klein geraten, musst du die Gruppe nicht auflösen und neu bauen. Wähle die Gruppe aus und klicke in ihren Einstellungen auf {{ui:group.edit}}, in der Objektliste auf das Ordnersymbol, oder drücke [[E]]. Ein Doppelklick auf die Gruppe tut dasselbe, wie bei Tinkercad, auch bei einem Bündel; wer das nicht mag, schaltet {{ui:workspace.doubleClickOpensGroup}} in den Einstellungen ab. Ein Teil bewegt sich übrigens erst, wenn der Zeiger ein paar Pixel weit gezogen wurde, so verschiebt ein verwackelter Klick oder Doppelklick nichts. Die Teile liegen jetzt einzeln da, und du änderst sie mit allen Werkzeugen: ein Loch größer machen, einen Körper verschieben, eine Aussparung hinzufügen.

![Die Gruppe in Bearbeitung: Unten steht der Balken mit Abbrechen und Fertig, die Objektliste zeigt die Teile.](shot:open-group)

Unten im Bild erscheint ein Balken. {{ui:group.done}} rechnet die Gruppe neu, mit ihrem Namen, ihrer Farbe und ihrem Zustand als Körper oder Aussparung. {{ui:common.cancel}} holt sie unverändert zurück.

Ist eines der Teile selbst eine Gruppe, bearbeitest du sie genauso, und so weiter, so tief dein Entwurf geht. Der Balken zeigt, wo du bist, zum Beispiel „Halter › Schraubdom“. {{ui:group.done}} und {{ui:common.cancel}} schließen immer die innerste Gruppe ab und führen dich eine Ebene zurück. Solange du in einer Gruppe bist, lassen sich nur die Gruppen unter ihren Teilen bearbeiten; für eine andere schließe erst ab.

Anders als {{ui:editor.tool.ungroup}}, das eine Gruppe endgültig auflöst, behält das Bearbeiten die Gruppe: Name und Einstellungen bleiben, und mit {{ui:common.cancel}} kommst du jederzeit zurück.

Ein Hinweis: Fasen und Verrundungen, die du auf die **ganze** Gruppe gelegt hattest, gehen beim Neuberechnen verloren. Darauf weist der Balken hin.

## Teilen

{{ui:editor.tool.split}} im Bereich {{ui:editor.group.modify}} schneidet die Auswahl mit einer Ebene in zwei – etwa ein Teil, das zu groß für das Druckbett ist, oder eins, in das du hineinschauen willst. Markiere einen oder mehrere Körper oder Aussparungen und klicke darauf. Eine durchscheinende Ebene zeigt genau, wo der Schnitt liegt, und eine weiße Linie markiert ihn auf den Körpern selbst, dort wo die Ebene sie trifft; geändert wird erst, wenn du ihn anwendest.

- {{ui:split.orientation}}: **X** schneidet senkrecht zwischen links und rechts, **Y** zwischen vorne und hinten, **Z** waagerecht zwischen oben und unten. Die Achsen heißen wie in der Positionskarte, Z zeigt nach oben. Die Ebene beginnt parallel zur Arbeitsebene, auf der Grundplatte also mit Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} legt die Ebene parallel zur Arbeitsebene, {{ui:split.workplaneAcrossX}} und {{ui:split.workplaneAcrossY}} stellen sie senkrecht dazu, quer zu ihrer X- oder Y-Richtung. Schneidet der Ursprung der Arbeitsebene die Auswahl, geht die Ebene durch ihn, sonst durch die Mitte. So setzt du die Arbeitsebene mit [[W]] auf eine schräge Fläche und schneidest genau dort, ohne an den Drehreglern zu drehen.
- {{ui:split.position}}: wo die Ebene durchgeht, mit dem Schieberegler oder als Zahl. Sie beginnt in der Mitte. Du kannst auch die Pfeilspitze an der Ebene ziehen; die Ebene wandert dann in Schritten von 0,1 mm entlang des Pfeils.
- {{ui:split.pickFace}}, die Schaltfläche neben der Lage, legt die Ebene auf eine Fläche: Klicke darauf und dann auf die Fläche. Richtung, beide Drehungen und Lage werden passend gesetzt. Während du wählst, zeigt eine blaue Ebene unter dem Zeiger, welche Fläche sie übernimmt. Auch die Fläche eines nicht markierten Körpers geht, um den Schnitt daran auszurichten – die Ebene bleibt aber innerhalb der Auswahl. [[Esc]] beendet das Wählen und lässt die Ebene, wo sie war.
- Die beiden Drehregler darunter drehen die Ebene um die anderen beiden Achsen, bis 180° in jede Richtung, für einen schrägen Schnitt. Sie lassen sich kombinieren.

{{ui:split.apply}} oder [[Enter]] schneidet, [[Esc]] bricht ab (beim Wählen einer Fläche beendet das erste [[Esc]] nur das Wählen). Jedes Objekt, durch das die Ebene geht, wird zu zwei geschlossenen Körpern, benannt nach ihrer Seite, zum Beispiel „Quader (Z+)“ und „Quader (Z-)“; Objekte, die sie verfehlt, bleiben, wie sie sind. Aus einer Aussparung werden zwei Aussparungen, und ein ausgehöhlter Körper behält seinen Hohlraum. Beide Hälften bleiben, wo sie waren – zum Drucken legst du jede mit {{ui:editor.tool.layFlat}} auf ihre Schnittfläche.

Die Hälften sind einfache Netze: Einstellungen wie die Seitenzahl eines Zylinders oder die Buchstaben eines Textes gehen verloren, stelle sie also vorher ein. [[Strg]]+[[Z]] holt das Original in einem Schritt zurück. Gesperrte und ausgeblendete Objekte lassen sich nicht teilen.

Ein importiertes Netz braucht eine geschlossene Oberfläche, damit es sich teilen, gruppieren oder ausschneiden lässt. Hat es Öffnungen, etwa offen gelassene Augen einer Figur oder einen Riss in einem Scan, schließt layerling sie zuerst mit einem flachen Deckel und sagt, wie viele es geschlossen hat. Es schließt kleine Öffnungen und ebene jeder Größe; eine große Öffnung mit gebogenem Rand bleibt dir überlassen, und die Meldung sagt es. Schließe sie im Programm, aus dem das Modell stammt, oder mit einem Reparaturwerkzeug für Netze, und importiere es neu.

## Teile trennen

Besteht eine Form aus mehreren voneinander getrennten Stücken, etwa ein Text aus einzelnen Buchstaben, kannst du sie mit {{ui:inspector.separateParts}} in eigenständige Formen zerlegen. Den Eintrag gibt es auch im Menü, das sich mit einem Rechtsklick auf die Form öffnet.

> **Tipp:** Baue Löcher immer etwas länger als das Teil, das sie durchdringen sollen. Schließt die Aussparung genau mit der Fläche ab, bleibt manchmal eine hauchdünne Haut stehen. Ein Millimeter Überstand schafft Sicherheit.
