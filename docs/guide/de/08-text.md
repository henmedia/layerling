---
title: Text und gebogene Schrift
summary: Beschriftungen erhaben oder vertieft, mit acht Schriftarten oder einer eigenen – und auf Wunsch entlang eines Kreisbogens, etwa auf einer Münze, einem Deckel oder einem Ring.
---

## Text hinzufügen

Wähle in der Formenbibliothek {{ui:shape.text}} und setze ihn ab. Im Feld {{ui:prop.text}} rechts tippst du, was da stehen soll. Die Einstellungen darunter:

- **{{ui:prop.font}}:** Acht Schriftarten stehen bereit: Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil (Buchstaben aus geraden Linien) und Japanese (Zen Maru Gothic). Neuer Text beginnt in Sans. Umlaute, ß und € gibt es in jeder Schrift, ebenso Kana, die gebräuchlichen Kanji und viele seltene aus Namen wie 澤, 槇 und 檜: ein japanischer Name geht in jeder Schrift und auf einem Namensschild. Die japanischen Zeichen werden geholt, sobald ein Text sie zum ersten Mal braucht (die seltenen Kanji in einer zweiten Datei, nur wenn ein Text eines hat), darum zeigt so ein Text einen Moment lang Fragezeichen. Danach bleiben sie auf dem Computer, sodass Japanisch von da an auch ohne Internet geht. Eigene Schriften kommen dazu, siehe [Eigene Schriften](#eigene-schriften) weiter unten.
- **{{ui:nameTag.letterSize}}:** Wie groß die Buchstaben sind, von oben gesehen; {{ui:prop.height}} bestimmt, wie dick sie sind.
- **{{ui:prop.height}}:** Wie hoch die Schrift aus der Fläche ragt.
- **{{ui:prop.bevel}}:** Rundet die Buchstabenkanten ab, damit sie weicher wirken. Mit {{ui:prop.segments}} bestimmst du, in wie vielen Stufen.
- **{{ui:nameTag.letterEdge}}:** rundet die obere Kante der Buchstaben ab oder setzt eine Fase an, wie bei einem Namensschild: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} oder {{ui:nameTag.edge.chamfer}}, mit der {{ui:nameTag.letterEdgeSize}} (zu Beginn 0,4 mm, höchstens so hoch wie der Text). Sie geht weiter als die {{ui:prop.bevel}}, aber nur so weit, wie die Striche breit sind: wo ein Strich dünner ist als die doppelte Größe, endet die Kante in einer schmaleren Oberseite. Die Unterseite bleibt flach, einzelne Buchstaben lassen sich also nachher aufkleben. Solange eine Kante gewählt ist, ersetzt sie die {{ui:prop.bevel}}.
- **Größe:** Länge und Breite der Zeile stellst du wie bei jeder Form ein. Zieh an den Griffen oder tippe die Maße ein.
- **{{ui:prop.textSpacing}}:** Der Abstand zwischen den Buchstaben zusätzlich zu dem, den die Schrift hat, in Prozent der Buchstabengröße: 0 lässt ihn, wie die Schrift ihn gemacht hat, darüber stehen die Buchstaben weiter auseinander, darunter (bis -50) enger, was eine eigene Schrift oft braucht. Die Buchstaben behalten ihre Größe, der Rahmen folgt der Zeile, bei geradem wie bei gebogenem Text. Bei Arabisch und Hebräisch wirkt der Abstand nicht, weil ihre Buchstaben sich verbinden.
- **{{ui:prop.textStretch}}:** Zuerst aus: Die Buchstaben behalten ihre Proportionen und sitzen in der Mitte des Rahmens, ein Rahmen, der breiter oder tiefer gezogen ist, als das Wort braucht, bleibt also größer als die Buchstaben. Schaltest du es ein, werden die Buchstaben in beide Richtungen auf den ganzen Rahmen gestreckt: Ein Großbuchstabe lässt sich niedriger oder schmaler machen, wie in Tinkercad. Es gilt für gerade Schrift; gebogene Schrift hat ihre eigene Buchstabengröße.
- **{{ui:prop.textVertical}}:** Stellt die Buchstaben von oben nach unten untereinander, jeden mittig auf einer senkrechten Linie, etwa für ein Schild am Türrahmen oder einen Namen längs auf einem Stift. Der Rahmen stellt sich hochkant, die Buchstaben behalten ihre Größe; {{ui:prop.textSpacing}} bestimmt den Abstand zwischen ihnen. Bei gebogenem Text laufen die Buchstaben als Spalte am linken Rand des Kreises entlang und bleiben aufrecht; {{ui:prop.textInwardColumn}} legt die Spalte auf die rechte Seite.

Ein Text ist zunächst ein einzelner Körper. Willst du die Buchstaben einzeln behandeln, klicke auf {{ui:inspector.separateParts}}. Dann ist jeder Buchstabe eine eigene Form.

Auch die Kanten einer Schrift lassen sich fasen oder verrunden, gerade oder gebogen, siehe [Kanten brechen und Körper aushöhlen](chapter:kanten-und-aushoehlen). Nimm dafür kleine Maße wie 0,2 bis 0,5 mm, denn die Striche der Buchstaben sind schmal.

## Eigene Schriften

Die Liste unter {{ui:prop.font}} zeigt jede Schrift in ihren eigenen Buchstaben, mit den Wörtern deines Textes, sodass du vor dem Wählen siehst, wie sie aussehen wird. Dasselbe gilt für die Schriften im Fenster darunter; die vom Rechner aufgelisteten Schriften zeigen ihren Namen in ihren eigenen Buchstaben. In der Liste gehen die Pfeiltasten und [[Enter]], und ein Buchstabe springt zur nächsten Schrift, die damit beginnt.

Neben den acht mitgelieferten Schriften kannst du jede eigene Schrift nehmen: eine Schriftdatei von deinem Rechner oder, in Chrome und Edge, eine Schrift, die auf deinem Computer installiert ist. Wähle dazu unter {{ui:prop.font}} ganz unten {{ui:font.manage}}. Es öffnet sich das Fenster {{ui:font.title}}.

- **{{ui:font.addFile}}** nimmt eine TrueType-Datei (`.ttf`), eine OpenType-Datei (`.otf`) oder eine WOFF-Datei (`.woff`). Du kannst die Datei auch einfach in das Fenster ziehen.
- **Unter Windows** liegen die installierten Schriften im Ordner „Schriftarten“ (`C:\Windows\Fonts`). Den blendet der Dateidialog des Browsers aus. Öffne ihn stattdessen im Explorer und zieh die gewünschte Schrift in das Fenster {{ui:font.title}}. Schriften, die nur für dich installiert sind, liegen in `%LOCALAPPDATA%\Microsoft\Windows\Fonts`; diesen Ordner zeigt auch der Dateidialog. Am Mac liegen Schriften in `/Library/Fonts` und `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** listet die Schriften, die auf deinem Computer installiert sind. Beim ersten Mal fragt der Browser, ob layerling sie lesen darf. Über das Suchfeld findest du eine Schrift schnell, ein Klick übernimmt sie.

Ist gerade ein Text ausgewählt, bekommt er die neue Schrift sofort. Sonst steht sie danach unter {{ui:prop.font}} in der Gruppe {{ui:font.customGroup}}, und mit {{ui:font.use}} im Fenster setzt du sie auf die ausgewählten Texte. Eigene Schriften verhalten sich wie die mitgelieferten: Text auf dem Kreisbogen, Fasen und Rundungen an den Kanten und der STEP-Export gehen genauso. Buchstaben, die eine Schrift nicht hat, nimmt layerling aus Sans.

### Arabisch und Hebräisch

Arabisch, Persisch, Urdu und Hebräisch schreibt layerling von rechts nach links: Der erste Buchstabe steht rechts, und in einem gemischten Text wie „Name عربي“ läuft nur das arabische Wort rückwärts, Ziffern bleiben wie gewohnt. Arabische Buchstaben verbinden sich dabei mit ihren Nachbarn, so wie die Schrift es vorsieht, und Lam-Alif wird zur Ligatur. Dafür braucht es eine Schrift, die diese Buchstaben hat; die mitgelieferten haben sie nicht. Füge eine eigene hinzu, etwa Arial, Tahoma oder Segoe UI unter Windows oder eine freie wie Noto Naskh Arabic, Noto Sans Arabic oder Amiri. Vokalzeichen stehen auf dem Buchstaben, zu dem sie gehören. Text auf dem Kreisbogen, Kontur, Silhouette, Schichten und Namensschilder gehen damit wie mit jedem anderen Text.

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
- **{{ui:prop.textVertical}}:** stellt das Schild hochkant, die Buchstaben untereinander, alle Schichten mit.
- **{{ui:nameTag.layers}}:** eine Zeile je Schicht, von oben nach unten. Jede Zeile hat die Farbe (klicke auf das farbige Feld), um wie viel die Schicht breiter ist als die Buchstaben, ihre Höhe und {{ui:nameTag.noHoles}}, das die Löcher in Buchstaben wie O und A füllt. {{ui:nameTag.corners}} bestimmt, wie eine breitere Schicht um die Ecken der Buchstaben läuft: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} oder {{ui:nameTag.corner.miter}}. Die oberste Zeile sind die Buchstaben selbst. **+** fügt unten eine Schicht an, **–** nimmt die unterste weg. Ein Schild hat zwei bis sechs Schichten.
- **{{ui:nameTag.keyring}}:** gibt der untersten Schicht eine gerade Lasche mit rundem Ende und einem Loch für einen Schlüsselring; die Lasche wächst mit dem Loch. Ein Loch von 3 mm, die Vorgabe, ergibt eine 6,5 mm breite Lasche, die 6,75 mm übersteht; der Rand des Lochs liegt 2 mm vom Rand der untersten Schicht entfernt. Wähle den {{ui:nameTag.keyringDiameter}} und die {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} oder {{ui:nameTag.side.top}}. {{ui:nameTag.side.free}} nimmt das Loch vom Schild und legt eine eigene {{ui:nameTag.keyringTab}} daneben, in Farbe und Höhe der untersten Schicht: eine ganz gewöhnliche Form, die du mit ihren Griffen verschiebst und drehst, wohin das Schild sie braucht. Sitzt sie, macht {{ui:nameTag.keyringTabFix}} in ihrem Bereich sie genau dort zum Teil des nächsten Schilds: Das Loch geht durch jede Schicht, die es erreicht, die Lasche gehört zur untersten Schicht, und beide bleiben an dieser Ecke der Buchstaben, wenn sich Wörter oder Größe ändern. {{ui:nameTag.side.free}} holt die Lasche wieder heraus, dort, wo sie war, um sie noch einmal zu verschieben. Das Loch geht durch jede Schicht, die es berührt, und die Lasche wandert mit, wenn du die Wörter, die Buchstabengröße oder die Schrift änderst. {{ui:nameTag.keyringAlong}} schiebt die Lasche an ihrer Seite nach oben oder unten (oben: nach links oder rechts), bis sie die Seite verlassen würde; 0 ist die Mitte. Das hilft, wenn die Mitte der Seite auf eine Lücke trifft, etwa neben einem J: Schiebe die Lasche dorthin, wo der Buchstabe hinausreicht.
- **{{ui:nameTag.letterEdge}}:** rundet oder schrägt die obere Kante der Buchstaben auf der obersten Schicht ab, so wie ein gedrucktes Schild vollendet wird: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} oder {{ui:nameTag.edge.chamfer}}, mit der {{ui:nameTag.letterEdgeSize}} (zuerst 0,4 mm, höchstens so hoch wie die Schicht). Das geht für jede Schrift und jedes Wort. Die Kante gehört zum Netz der Buchstaben; das Kantenwerkzeug nimmt einen solchen Text daher als Netz, was bei so feiner Schrift schwer ist - wähle die Kante lieber hier.

Jede Änderung siehst du sofort. Das Schild ist ein Bündel: Es bewegt sich als Ganzes, und jede Schicht bleibt ein eigener Körper in eigener Farbe, so wie der Slicer sie für den Mehrfarbdruck braucht. Um die Kanten einer Schicht abzurunden oder abzuschrägen, klicke auf {{ui:group.editBundle}} und wähle die Schicht, siehe [Kanten brechen und Körper aushöhlen](chapter:kanten-und-aushoehlen).

### Viele Namensschilder auf einmal

Tippe die Namen in die {{ui:textLayers.names}}, einen je Zeile, bis zu hundert. Der Knopf darunter sagt, wie viele Schilder er macht, etwa „12 Namensschilder machen“. Jedes Schild bekommt dieselben Schichten, dieselbe Buchstabengröße und dasselbe Loch und ist ein eigenes Objekt; sie liegen in Reihen unter dem ersten, 5 mm auseinander. Auch ein einfacher Text hat die Namensliste, weiter unten in seinen Einstellungen.

## Symbolschilder

Ein Symbolschild ist dasselbe Schild mit einem SVG-Symbol statt Buchstaben: ein Herz, eine Wolke, das Logo eines Vereins. Oben das Symbol, darunter derselbe Umriss etwas breiter in einer zweiten Farbe, zuunterst eine Platte ohne Löcher.

- **Ein neues Symbolschild:** Wähle in der Formenbibliothek {{ui:shape.iconTag}}. Ein kleines Fenster öffnet sich: Klicke auf {{ui:iconTag.browse}}, wähle eine SVG-, PNG- oder JPG-Datei, prüfe das Bild, tippe die {{ui:iconTag.width}} des Symbols ein und klicke auf {{ui:iconTag.ok}}. Das Schild steht in der Mitte der Platte, in denselben Schichten wie ein neues Namensschild.
- **Aus einem Skizzenkörper:** Eine importierte SVG oder eine selbst gezeichnete Skizze hat oben in ihren Einstellungen {{ui:nameTag.makeLayers}}.

Die Karte {{ui:iconTag.title}} oben in den Einstellungen enthält:

- **{{ui:iconTag.replace}}:** setzt das Symbol einer anderen Datei (SVG, PNG oder JPG) auf das Schild; Schichten und Breite bleiben, wie sie sind.
- **{{ui:iconTag.iconWidth}}:** wie breit das Symbol oben ist, in mm. Alle Schichten gehen mit und bleiben deckungsgleich.
- **{{ui:nameTag.layers}}:** die Zeilen wie beim Namensschild - Farbe, um wie viel breiter, {{ui:nameTag.corners}}, Höhe und {{ui:nameTag.noHoles}}, **+** und **–**, zwei bis sechs Schichten. Die oberste Zeile ist das Symbol selbst.
- **{{ui:nameTag.keyring}}:** wie beim Namensschild: ein Loch für den Schlüsselring durch jede Schicht, mit einer Lasche mit rundem Ende an der untersten Schicht, außerhalb des Symbols. {{ui:nameTag.keyringDiameter}} und {{ui:nameTag.keyringSide}} bestimmen Größe und Seite; {{ui:nameTag.side.free}} gibt eine eigene Lasche, wie beim Namensschild. Die Lasche richtet sich nach dem Umriss des Symbols; bei einem sehr zerklüfteten Symbol prüfst du, wo sie auf die Platte trifft. {{ui:nameTag.keyringAlong}} schiebt die Lasche an ihrer Seite entlang, wie beim Namensschild.
- **{{ui:iconTag.count}}:** wie viele Schilder du möchtest, 1 bis 100. {{ui:iconTag.fill}} rechnet es aus der Platte des Druckers aus, der in den Einstellungen gewählt ist, für kleine Logos eine volle Platte. Der Knopf darunter erzeugt sie, 5 mm auseinander, in der Mitte der Platte verteilt; das erste ist das Schild selbst.

Die SVG braucht geschlossene Umrisse; eine Zeichnung nur aus offenen Linien wird kein Schild. Ein Skizzenkörper, dessen Füllung eine Linie ist, behält sie: Die Fläche dieser Linie ist das Symbol.

**Ein Bild (PNG oder JPG)** wird zu einem Umriss nachgezeichnet, und die Vorschau zeigt den Umriss. Unter {{ui:iconTag.part}} wählst du, ob der {{ui:iconTag.part.dark}} oder der {{ui:iconTag.part.light}} das Symbol wird; zuerst ist es der Teil, der nicht der Hintergrund ist. Durchsichtige Pixel gehören nie zum Symbol. Eine SVG, die nur ein einziges Bild enthält, wie Inkscape eine importierte Bitmap speichert, wird genauso nachgezeichnet. Der Umriss folgt den Pixeln, ein kleines Bild gibt also einen rauen Rand: Bilder ab einigen hundert Pixeln eignen sich am besten. {{ui:iconTag.replace}} nimmt von einem Bild den Teil, der nicht sein Hintergrund ist.

## QR-Codes

Ein QR-Code macht aus einem Text oder einer Webadresse ein Muster, das eine Handykamera liest: ein Link zu deinem Shop auf einem Schild, der WLAN-Name auf einem Untersetzer, eine Telefonnummer am Schlüsselanhänger.

Wähle in der Formenbibliothek {{ui:shape.qrCode}}. Ein Fenster öffnet sich; der Cursor steht schon im Textfeld:

- **{{ui:qrCode.text}}:** was der Code sagt. Eingabe erzeugt den Code, Umschalt+Eingabe beginnt eine neue Zeile. Unter dem Feld siehst du, wie viel vom Platz belegt ist; Umlaute und andere Sonderzeichen brauchen zwei Byte. Ist der Text zu lang, sagt das Feld es dir.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q oder H. Eine höhere Stufe wird noch gelesen, wenn ein Teil des Codes verschmutzt oder zerkratzt ist (L etwa 7 %, M 15 %, Q 25 %, H 30 %), braucht für denselben Text aber mehr Module, jedes Modul wird also kleiner. Zuerst ist M gewählt.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} baut den Code allein, 4 mm hoch. {{ui:qrCode.style.raised}} setzt ihn 1 mm hoch auf eine weiße Platte von 3 mm, als Bündel aus zwei Farben, sodass ein Mehrfarbdruck den Code dunkel und die Platte hell druckt. {{ui:qrCode.style.engraved}} schneidet den Code 1 mm tief in die Platte.
- **{{ui:qrCode.sizeBy}}:** Tippe die {{ui:qrCode.sizeBy.width}} des ganzen Codes ein (zuerst 40 mm) oder die Größe eines Moduls; die andere Zahl steht darunter. Module unter 0,8 mm bekommen eine Warnung. Das ist eine Faustregel für eine 0,4-mm-Düse, keine Garantie: Drucker, Material, Farben und das Handy spielen alle mit.
- **{{ui:qrCode.quietZone}}:** Scanner brauchen um den Code einen leeren Rand von vier Modulen. Auf einer Platte gehört der Rand zur Platte; schalte ihn nur ab, wenn die Platte auf einer größeren hellen Fläche sitzt. Der Code allein hat keinen eigenen Rand: Lass den Platz rundherum frei.
- **Höhen:** die Höhe des Codes, auf einer Platte die Codehöhe oder Gravurtiefe, und die Plattendicke.

Die Vorschau zeigt den Code, wie er gebaut wird. {{ui:qrCode.ok}} stellt ihn in die Mitte der Platte.

Der Code ist ein Körper wie jeder andere: Verschiebe ihn, drehe ihn, skaliere ihn (Breite und Tiefe gleich lassen, sonst wird der Code verzerrt), gruppiere ihn, oder mach ihn zur Aussparung und gruppiere ihn in ein eigenes Teil, um ihn dort einzugravieren. Skalieren skaliert den ganzen Code; jedes Modul bleibt quadratisch.

Die Karte {{ui:qrCode.title}} oben in seinen Einstellungen enthält den Text. Ändere ihn und klicke auf {{ui:qrCode.regenerate}}: Der Code wird dort neu gebaut, wo er steht, und so breit, wie er gerade ist. Fehlerkorrektur, Ruhezone und Bauart bleiben, wie sie gewählt wurden; für andere Einstellungen erzeuge einen neuen Code aus der Bibliothek.

Scanne den Code vor dem Druck mit deinem Handy, und nach dem Druck noch einmal. Dunkel auf hell liest sich am besten; einen hellen Code auf dunkler Platte liest nicht jedes Handy.

## Text auf dem Kreisbogen

Soll die Beschriftung nicht gerade laufen, sondern dem Rand einer Münze, eines Deckels oder eines Rings folgen? Dafür gibt es die Einstellung {{ui:prop.textCurved}}.

![Ein Text folgt einem Kreis. Die Buchstaben stehen alle auf einer gemeinsamen Linie.](shot:curved-text)

Sobald du sie einschaltest, läuft der Text am Kreis entlang. Alle Buchstaben stehen auf derselben Grundlinie, so gleichmäßig wie bei normalem Text. Dazu gibt es vier Einstellungen:

- **{{ui:prop.textRadius}}** (5 bis 500 mm): Der Radius des Kreises, auf dem die Grundlinie der Buchstaben läuft. Die Buchstaben bleiben dabei an ihrer Stelle, nur ihre Biegung ändert sich.
- **{{ui:nameTag.letterSize}}:** Wie hoch die Buchstaben sind. Sie hängt nicht mehr an der Breite der Form.
- **{{ui:prop.textInward}}:** Schaltet den Text von der Oberseite des Kreises auf die Unterseite. Die Buchstaben zeigen dann mit dem Kopf zur Mitte.
- **{{ui:prop.textFlipped}}:** Dreht nur die Buchstaben um, damit du sie von der anderen Seite lesen kannst. Der Text bleibt dabei an seiner Stelle auf dem Kreis.

**Die Mitte des Kreises ist die Mitte der Form.** Deshalb geht das Ausrichten wie gewohnt: Wenn du den Text mit einem Zylinder oder Ring mittig ausrichtest, sitzt er genau konzentrisch darauf. Ziehst du an einem Griff, wachsen Radius und Schriftgröße gemeinsam mit, sodass die Schrift nicht verzerrt wird.

> **Tipp:** Oben am Kreis stehen die Buchstaben außerhalb der Grundlinie, mit {{ui:prop.textInward}} innerhalb, mit den Köpfen zur Mitte. Damit die Schrift auf eine Scheibe passt, sollte der Radius plus die Schriftgröße kleiner sein als der Radius der Scheibe.
