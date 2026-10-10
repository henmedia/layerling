---
title: Text und gebogene Schrift
summary: Beschriftungen erhaben oder vertieft, mit sieben Schriftarten oder einer eigenen – und auf Wunsch entlang eines Kreisbogens, etwa auf einer Münze, einem Deckel oder einem Ring.
---

## Text hinzufügen

Wähle in der Formenbibliothek {{ui:shape.text}} und setze ihn ab. Im Feld {{ui:prop.text}} rechts tippst du, was da stehen soll. Die Einstellungen darunter:

- **{{ui:prop.font}}:** Sieben Schriftarten stehen bereit: Multilanguage, Sans, Serif, Script, Monospace, Rounded und Stencil (Buchstaben aus geraden Linien). Neuer Text beginnt in Sans. Umlaute, ß und € gibt es in jeder Schrift. Eigene Schriften kommen dazu, siehe [Eigene Schriften](#eigene-schriften) weiter unten.
- **{{ui:nameTag.letterSize}}:** Wie groß die Buchstaben sind, von oben gesehen; {{ui:prop.height}} bestimmt, wie dick sie sind.
- **{{ui:prop.height}}:** Wie hoch die Schrift aus der Fläche ragt.
- **{{ui:prop.bevel}}:** Rundet die Buchstabenkanten ab, damit sie weicher wirken. Mit {{ui:prop.segments}} bestimmst du, in wie vielen Stufen.
- **Größe:** Länge und Breite der Zeile stellst du wie bei jeder Form ein. Zieh an den Griffen oder tippe die Maße ein.

Ein Text ist zunächst ein einzelner Körper. Willst du die Buchstaben einzeln behandeln, klicke auf {{ui:inspector.separateParts}}. Dann ist jeder Buchstabe eine eigene Form.

Auch die Kanten einer Schrift lassen sich fasen oder verrunden, gerade oder gebogen, siehe [Kanten brechen und Körper aushöhlen](chapter:kanten-und-aushoehlen). Nimm dafür kleine Maße wie 0,2 bis 0,5 mm, denn die Striche der Buchstaben sind schmal.

## Eigene Schriften

Neben den sieben mitgelieferten Schriften kannst du jede eigene Schrift nehmen: eine Schriftdatei von deinem Rechner oder, in Chrome und Edge, eine Schrift, die auf deinem Computer installiert ist. Wähle dazu unter {{ui:prop.font}} ganz unten {{ui:font.manage}}. Es öffnet sich das Fenster {{ui:font.title}}.

- **{{ui:font.addFile}}** nimmt eine TrueType-Datei (`.ttf`), eine OpenType-Datei (`.otf`) oder eine WOFF-Datei (`.woff`). Du kannst die Datei auch einfach in das Fenster ziehen.
- **Unter Windows** liegen die installierten Schriften im Ordner „Schriftarten“ (`C:\Windows\Fonts`). Den blendet der Dateidialog des Browsers aus. Öffne ihn stattdessen im Explorer und zieh die gewünschte Schrift in das Fenster {{ui:font.title}}. Schriften, die nur für dich installiert sind, liegen in `%LOCALAPPDATA%\Microsoft\Windows\Fonts`; diesen Ordner zeigt auch der Dateidialog. Am Mac liegen Schriften in `/Library/Fonts` und `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** listet die Schriften, die auf deinem Computer installiert sind. Beim ersten Mal fragt der Browser, ob layerling sie lesen darf. Über das Suchfeld findest du eine Schrift schnell, ein Klick übernimmt sie.

Ist gerade ein Text ausgewählt, bekommt er die neue Schrift sofort. Sonst steht sie danach unter {{ui:prop.font}} in der Gruppe {{ui:font.customGroup}}, und mit {{ui:font.use}} im Fenster setzt du sie auf die ausgewählten Texte. Eigene Schriften verhalten sich wie die mitgelieferten: Text auf dem Kreisbogen, Fasen und Rundungen an den Kanten und der STEP-Export gehen genauso. Buchstaben, die eine Schrift nicht hat, nimmt layerling aus Sans.

### Was in welchem Browser geht

| Browser | Schriftdatei wählen | Schrift vom Computer |
| --- | --- | --- |
| Chrome und Edge am Computer, auch die installierte layerling-App | ja | ja, nach einer Rückfrage des Browsers |
| Firefox | ja | nein |
| Safari am Mac | ja | nein |
| Tablet und Handy | ja, aus den Dateien des Geräts | nein |

Webseiten dürfen die installierten Schriften nicht einfach lesen. Nur Chrome und Edge haben dafür eine eigene Erlaubnis, und auch die nur auf sicheren Seiten, also über `https` wie bei layerling.com. Läuft layerling über `http`, etwa auf einem eigenen Server oder als Docker-Installation im Heimnetz, fehlt {{ui:font.fromSystem}}; dann ziehst du die Schrift aus dem Explorer herüber. In den anderen Browsern wählst du die Schriftdatei aus dem Schriftenordner, das Ergebnis ist dasselbe. Hast du die Rückfrage in Chrome oder Edge abgelehnt, gibst du den Zugriff in den Einstellungen der Website wieder frei, über das Schloss links neben der Adresse.

Nicht lesen kann layerling WOFF2-Dateien (dafür gibt es fast immer eine TTF- oder OTF-Fassung), Schriftsammlungen (`.ttc`, sie enthalten mehrere Schriften in einer Datei) und farbige Emoji-Schriften. Bei sehr großen Schriften, etwa für Chinesisch, nimmt layerling die ersten 8000 Zeichen. Bei variablen Schriften gilt die Grundeinstellung der Schrift, meist der normale Schnitt.

Manche Schriften, vor allem Schreibschriften und variable Schriften, zeichnen einen Buchstaben aus Strichen, die sich überlappen. layerling vereinigt sie beim Einlesen zu einem sauberen Umriss, damit der Körper druckbar bleibt. Solche Buchstaben bestehen dann aus sehr kurzen geraden Stücken statt aus Kurven; zu sehen ist das nicht.

### Wo die Schriften bleiben

Eine eigene Schrift bleibt **in diesem Browser auf diesem Computer**. Ein anderer Browser oder ein anderer Rechner kennt sie nicht, bis du sie dort ebenfalls hinzufügst. Wer die Website-Daten des Browsers löscht, löscht auch die Schriften. Im Fenster {{ui:font.title}} entfernst du eine Schrift mit dem Papierkorb aus dem Browser. Deine Entwürfe verlieren dadurch nichts, wie der nächste Abschnitt zeigt.

### Entwürfe mit eigener Schrift weitergeben

Ein Entwurf speichert **nicht die Schriftdatei**, sondern nur die Umrisse der Buchstaben, die seine Texte benutzen, auch die aus früheren Schritten im Verlauf. Steht in einem Text „Hallo“, reisen nur H, a, l und o mit. Das gilt für jede Art, wie ein Entwurf gespeichert wird: im Browser, auf dem eigenen Server, als `.lyl`-Datei und in {{ui:myShapes.title}}.

Daraus folgt:

- **Der Entwurf öffnet sich überall richtig**, auch auf einem Rechner ohne die Schrift. Die Texte sehen genauso aus und lassen sich verschieben, drehen, skalieren und verrunden.
- **Neue Buchstaben brauchen die Schrift.** Tippt jemand ohne die Schrift einen Buchstaben, den der Entwurf nicht mitgebracht hat, zeichnet layerling ihn aus Sans. Unter {{ui:prop.font}} steht die Schrift dann mit dem Zusatz {{ui:font.fromDesign}}. Wer die Schriftdatei hinzufügt, bekommt wieder alle Buchstaben.
- **Exporte enthalten nur Geometrie.** STL, 3MF, OBJ, STEP und SVG enthalten Körper und Umrisse, keine Schrift.
- **Ältere layerling-Versionen** kennen eigene Schriften noch nicht und zeichnen solche Texte in Multilanguage.

**Lizenzen:** Schriften sind urheberrechtlich geschützt, und ihre Lizenz regelt, was du damit tun darfst. Die eingebetteten Buchstabenumrisse sind dasselbe, was PDF-Dateien von einer Schrift mitnehmen, und das erlauben die meisten Lizenzen. Manche kaufbaren Schriften verbieten aber jede Weitergabe, auch einzelner Buchstaben. Bevor du einen Entwurf mit eigener Schrift weitergibst oder veröffentlichst, prüfe deshalb die Lizenz der Schrift. Freie Schriften wie die von Google Fonts (meist unter der SIL Open Font License) darfst du ohne Bedenken weitergeben. Für ein gedrucktes Teil oder eine exportierte STL spielt das keine Rolle: Die enthalten keine Schrift mehr, nur noch Geometrie.

## Erhaben oder vertieft

- **Erhaben:** Setze den Text auf die Fläche und gruppiere ihn mit dem Körper. Er wächst als Relief heraus.
- **Vertieft:** Schalte den Text auf {{ui:inspector.hole}}, lasse ihn ein Stück in die Fläche ragen und gruppiere ihn mit dem Körper. Die Buchstaben sind dann eingraviert.

Für Beschriftungen auf einer Seitenfläche legst du vorher die Arbeitsebene auf diese Fläche, siehe [Ansicht und Arbeitsebene](chapter:ansicht-und-arbeitsebene).

## Kontur, Silhouette und breiter

Ein Text muss nicht als gefüllte Buchstaben gebaut werden. {{ui:prop.textFill}} in den Eigenschaften bietet dieselbe Auswahl wie Tinkercad:

- **{{ui:prop.textFill.filled}}:** die Buchstaben, wie sie sind.
- **{{ui:prop.textFill.outline}}:** eine Linie entlang des Umrisses der Buchstaben, halb innen und halb außen.
- **{{ui:prop.textFill.outer}}:** eine Linie außen um die Buchstaben.
- **{{ui:prop.textFill.inner}}:** eine Linie innen in den Buchstaben.

Ist eine Linie gewählt, erscheinen direkt unter der Liste zwei Einstellungen: {{ui:prop.sketchLineWidth}} bestimmt, wie dick die Linie ist, {{ui:sketch.strokeJoin}}, wie sie um die Ecken läuft ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} oder {{ui:sketch.strokeJoin.miter}}). Die selteneren Einstellungen stehen unter {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} lässt die Löcher in O, A oder e weg, und {{ui:prop.textWider}} lässt die Buchstaben gefüllt und macht sie rundum um die Linienbreite dicker; Buchstaben, die sich dabei berühren, wachsen zu einem Stück zusammen.

Mit einer Linie außen, einer mittigen Linie oder „Breiter“ wächst der Kasten des Texts mit, die Buchstaben behalten ihre Größe. {{ui:prop.bevel}} und {{ui:prop.segments}} gibt es nur für gefüllte Buchstaben.

## Schichten und Namensschilder

Ein Namensschild für den Mehrfarbdruck ist ein Text in Schichten: oben die Buchstaben, darunter derselbe Text etwas breiter in einer zweiten Farbe, zuunterst eine Platte ohne Löcher in einer dritten. layerling macht es mit einem Klick:

- **Ein neues Namensschild:** Wähle in der Formenbibliothek {{ui:shape.nameTag}} und setze es ab. Darauf steht „Name“ in weißen Buchstaben auf einem roten Rand und einer dunklen Platte.
- **Aus einem Text:** Wähle den Text aus und klicke oben in seinen Einstellungen auf {{ui:nameTag.makeLayers}}.

Alle Einstellungen des Schilds stehen in der Karte {{ui:nameTag.title}}, ganz oben in den Einstellungen:

- **{{ui:prop.text}}** und **{{ui:prop.font}}**, auch eigene Schriften. Das Schild wächst mit den Wörtern.
- **{{ui:nameTag.letterSize}}:** wie hoch die Großbuchstaben sind, in mm. Alle Schichten gehen mit und bleiben deckungsgleich.
- **{{ui:nameTag.layers}}:** eine Zeile je Schicht, von oben nach unten. Jede Zeile hat die Farbe (klicke auf das farbige Feld), um wie viel die Schicht breiter ist als die Buchstaben, ihre Höhe und {{ui:nameTag.noHoles}}, das die Löcher in Buchstaben wie O und A füllt. {{ui:nameTag.corners}} bestimmt, wie eine breitere Schicht um die Ecken der Buchstaben läuft: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} oder {{ui:nameTag.corner.miter}}. Die oberste Zeile sind die Buchstaben selbst. **+** fügt unten eine Schicht an, **–** nimmt die unterste weg. Ein Schild hat zwei bis sechs Schichten.
- **{{ui:nameTag.keyring}}:** gibt der untersten Schicht eine runde Öse mit einem Loch für einen Schlüsselring. Wähle den {{ui:nameTag.keyringDiameter}} und die {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} oder {{ui:nameTag.side.top}}. Das Loch geht durch jede Schicht, die es berührt, und die Öse wandert mit, wenn du die Wörter, die Buchstabengröße oder die Schrift änderst.

Jede Änderung siehst du sofort. Das Schild ist ein Bündel: Es bewegt sich als Ganzes, und jede Schicht bleibt ein eigener Körper in eigener Farbe, so wie der Slicer sie für den Mehrfarbdruck braucht. Um die Kanten einer Schicht abzurunden oder abzuschrägen, klicke auf {{ui:group.editBundle}} und wähle die Schicht, siehe [Kanten brechen und Körper aushöhlen](chapter:kanten-und-aushoehlen).

### Viele Namensschilder auf einmal

Tippe die Namen in die {{ui:textLayers.names}}, einen je Zeile, bis zu hundert. Der Knopf darunter sagt, wie viele Schilder er macht, etwa „12 Namensschilder machen“. Jedes Schild bekommt dieselben Schichten, dieselbe Buchstabengröße und dasselbe Loch und ist ein eigenes Objekt; sie liegen in Reihen unter dem ersten, 5 mm auseinander. Auch ein einfacher Text hat die Namensliste, weiter unten in seinen Einstellungen.

## Text auf dem Kreisbogen

Soll die Beschriftung nicht gerade laufen, sondern dem Rand einer Münze, eines Deckels oder eines Rings folgen? Dafür gibt es die Einstellung {{ui:prop.textCurved}}.

![Ein Text folgt einem Kreis. Die Buchstaben stehen alle auf einer gemeinsamen Linie.](shot:curved-text)

Sobald du sie einschaltest, läuft der Text am Kreis entlang. Alle Buchstaben stehen auf derselben Grundlinie, so gleichmäßig wie bei normalem Text. Dazu gibt es vier Einstellungen:

- **{{ui:prop.textRadius}}** (5 bis 500 mm): Der Radius des Kreises, auf dem die Grundlinie der Buchstaben läuft.
- **{{ui:nameTag.letterSize}}:** Wie hoch die Buchstaben sind. Sie hängt nicht mehr an der Breite der Form.
- **{{ui:prop.textInward}}:** Schaltet den Text von der Oberseite des Kreises auf die Unterseite. Die Buchstaben zeigen dann mit dem Kopf zur Mitte.
- **{{ui:prop.textFlipped}}:** Dreht nur die Buchstaben um, damit du sie von der anderen Seite lesen kannst. Der Text bleibt dabei an seiner Stelle auf dem Kreis.

**Die Mitte des Kreises ist die Mitte der Form.** Deshalb geht das Ausrichten wie gewohnt: Wenn du den Text mit einem Zylinder oder Ring mittig ausrichtest, sitzt er genau konzentrisch darauf. Ziehst du an einem Griff, wachsen Radius und Schriftgröße gemeinsam mit, sodass die Schrift nicht verzerrt wird.

> **Tipp:** Oben am Kreis stehen die Buchstaben außerhalb der Grundlinie, mit {{ui:prop.textInward}} innerhalb, mit den Köpfen zur Mitte. Damit die Schrift auf eine Scheibe passt, sollte der Radius plus die Schriftgröße kleiner sein als der Radius der Scheibe.
