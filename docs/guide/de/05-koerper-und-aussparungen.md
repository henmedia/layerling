---
title: Körper und Aussparungen
summary: Wie aus einfachen Formen Bohrungen, Nuten und Taschen werden – und wie du eine Gruppe später noch einmal ändern kannst.
---

Das ist die wichtigste Idee in layerling, und sie ist schnell gelernt: **Jede Form ist entweder ein Körper oder eine Aussparung.** Ein Körper bleibt stehen. Eine Aussparung ist ein Werkzeug, das Material wegnimmt.

## Körper oder Aussparung

Wähle eine Form aus und klicke in ihren Einstellungen auf {{ui:inspector.solid}} oder {{ui:inspector.hole}}. Schneller geht es mit der Tastatur: [[H]] macht die Auswahl zur Aussparung, [[S]] wieder zum Körper. Beides steht auch im Menü, das ein Rechtsklick auf den Körper öffnet. Eine Aussparung erscheint durchscheinend, damit du siehst, wo sie sitzt.

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

Eine Gruppe darfst du weiter behandeln wie eine Form: verschieben, drehen, einfärben, wieder gruppieren. Mit {{ui:editor.tool.ungroup}} ([[Strg]]+[[Umschalt]]+[[G]]) löst du sie auf, und die Einzelteile sind wieder da.

### Eine Gruppe zur Aussparung machen

Auch eine ganze Gruppe kann ein Körper oder eine Aussparung sein. Dabei gilt eine einfache Regel:

- Besteht die Gruppe nur aus Körpern (oder nur aus Aussparungen), schaltest du sie als Ganzes um, und ihre Teile gehen mit.
- Enthält sie beides, etwa einen Würfel mit Bohrung, behält jedes Teil seinen eigenen Zustand. Die ganze Gruppe wird dann zum Werkzeug, aber die Bohrung bleibt eine Bohrung.

## Bündeln

Manchmal sollen Teile nur zusammenbleiben, ohne eins zu werden – etwa ein weißes Logo auf einer schwarzen Platte für den Mehrfarbdruck. Dafür gibt es {{ui:editor.tool.bundle}} ([[Strg]]+[[B]]), wie in Tinkercad. Ein Bündel lässt sich verschieben, drehen und in der Größe ändern wie eine Form, aber nichts wird verrechnet:

- Jedes Teil behält seine Farbe und bleibt Körper oder Aussparung.
- Aussparungen schneiden nicht.
- Beim Export als STL, 3MF oder OBJ ist jedes Teil ein eigener Körper; im 3MF und OBJ mit seiner Farbe.

{{ui:editor.tool.ungroup}} ([[Strg]]+[[Umschalt]]+[[G]]) löst ein Bündel wieder auf, [[E]] öffnet es zum Bearbeiten wie eine Gruppe. Kanten fasen, verrunden und aushöhlen geht an einem Bündel nicht, weil es kein einzelner Körper ist: Gruppiere es dafür, oder bearbeite seine Teile einzeln. Soll eine Aussparung im Bündel doch schneiden, gruppiere das Bündel (Strg+G).

## Schnittmenge

{{ui:editor.tool.intersect}} behält nur das, was zwei oder mehr Körper gemeinsam haben. Lege zwei überlappende Formen übereinander, markiere beide und klicke darauf. So entsteht zum Beispiel aus einem Zylinder und einem Quader ein Stück mit runder und gerader Seite. Eine Gruppe zählt dabei so, wie sie aussieht, also mit ihren Bohrungen. Ist eine Aussparung mit markiert, bleibt das, was alle Körper mit allen Aussparungen gemeinsam haben.

## Eine Gruppe bearbeiten

Ist eine Bohrung zu klein geraten, musst du die Gruppe nicht auflösen und neu bauen. Wähle die Gruppe aus und klicke in ihren Einstellungen auf {{ui:group.edit}}, in der Objektliste auf das Ordnersymbol, oder drücke [[E]]. Die Teile liegen jetzt einzeln da, und du änderst sie mit allen Werkzeugen: ein Loch größer machen, einen Körper verschieben, eine Aussparung hinzufügen.

![Die Gruppe in Bearbeitung: Unten steht der Balken mit Abbrechen und Fertig, die Objektliste zeigt die Teile.](shot:open-group)

Unten im Bild erscheint ein Balken. {{ui:group.done}} rechnet die Gruppe neu, mit ihrem Namen, ihrer Farbe und ihrem Zustand als Körper oder Aussparung. {{ui:common.cancel}} holt sie unverändert zurück.

Ist eines der Teile selbst eine Gruppe, bearbeitest du sie genauso, und so weiter, so tief dein Entwurf geht. Der Balken zeigt, wo du bist, zum Beispiel „Halter › Schraubdom“. {{ui:group.done}} und {{ui:common.cancel}} schließen immer die innerste Gruppe ab und führen dich eine Ebene zurück. Solange du in einer Gruppe bist, lassen sich nur die Gruppen unter ihren Teilen bearbeiten; für eine andere schließe erst ab.

Anders als {{ui:editor.tool.ungroup}}, das eine Gruppe endgültig auflöst, behält das Bearbeiten die Gruppe: Name und Einstellungen bleiben, und mit {{ui:common.cancel}} kommst du jederzeit zurück.

Ein Hinweis: Fasen und Verrundungen, die du auf die **ganze** Gruppe gelegt hattest, gehen beim Neuberechnen verloren. Darauf weist der Balken hin.

## Teilen

{{ui:editor.tool.split}} im Bereich {{ui:editor.group.modify}} schneidet die Auswahl mit einer Ebene in zwei – etwa ein Teil, das zu groß für das Druckbett ist, oder eins, in das du hineinschauen willst. Markiere einen oder mehrere Körper oder Aussparungen und klicke darauf. Eine durchscheinende Ebene zeigt genau, wo der Schnitt liegt; geändert wird erst, wenn du ihn anwendest.

- {{ui:split.orientation}}: **X** schneidet senkrecht zwischen links und rechts, **Y** zwischen vorne und hinten, **Z** waagerecht zwischen oben und unten. Die Achsen heißen wie in der Positionskarte, Z zeigt nach oben; die Ebene beginnt mit Z.
- {{ui:split.position}}: wo die Ebene durchgeht, mit dem Schieberegler oder als Zahl. Sie beginnt in der Mitte. Du kannst auch die Pfeilspitze an der Ebene ziehen, dann wandert sie entlang des Pfeils.
- Die beiden Drehregler darunter drehen die Ebene um die anderen beiden Achsen, bis 180° in jede Richtung, für einen schrägen Schnitt. Sie lassen sich kombinieren.

{{ui:split.apply}} oder [[Enter]] schneidet, [[Esc]] bricht ab. Jedes Objekt, durch das die Ebene geht, wird zu zwei geschlossenen Körpern, benannt nach ihrer Seite, zum Beispiel „Quader (Z+)“ und „Quader (Z-)“; Objekte, die sie verfehlt, bleiben, wie sie sind. Aus einer Aussparung werden zwei Aussparungen, und ein ausgehöhlter Körper behält seinen Hohlraum. Beide Hälften bleiben, wo sie waren – zum Drucken legst du jede mit {{ui:editor.tool.layFlat}} auf ihre Schnittfläche.

Die Hälften sind einfache Netze: Einstellungen wie die Seitenzahl eines Zylinders oder die Buchstaben eines Textes gehen verloren, stelle sie also vorher ein. [[Strg]]+[[Z]] holt das Original in einem Schritt zurück. Gesperrte und ausgeblendete Objekte lassen sich nicht teilen.

## Teile trennen

Besteht eine Form aus mehreren voneinander getrennten Stücken, etwa ein Text aus einzelnen Buchstaben, kannst du sie mit {{ui:inspector.separateParts}} in eigenständige Formen zerlegen.

> **Tipp:** Baue Löcher immer etwas länger als das Teil, das sie durchdringen sollen. Schließt die Aussparung genau mit der Fläche ab, bleibt manchmal eine hauchdünne Haut stehen. Ein Millimeter Überstand schafft Sicherheit.
