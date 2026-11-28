---
title: Häufige Fragen
summary: Kurze Antworten auf das, was am häufigsten gefragt wird, zu Speichern, großen Modellen, Verrundungen, KI und Druck, jeweils mit dem Weg zur ausführlichen Erklärung.
contents: questions
---

Jede Antwort ist kurz und nennt am Ende die Stelle in dieser Anleitung, die es ausführlich erklärt. Das Suchfeld oben findet eine Frage über jedes Wort darin.

## Speichern und Sicherungen

### Wo liegen meine Entwürfe, und gibt es eine Cloud?

Im Browser auf deinem eigenen Rechner. Es gibt kein Konto und keine Cloud, nichts wird hochgeladen, und jede Änderung speichert sich von selbst. Wer layerling auf einem eigenen Server betreibt, kann Entwürfe zusätzlich dort in einem gemeinsamen Ordner ablegen.

Mehr dazu: [Wo deine Entwürfe liegen](chapter:dateien-und-speichern#wo-deine-entwuerfe-liegen)

### Meine Entwürfe sind weg. Was ist passiert?

Entwürfe liegen in einem Browser auf einem Rechner. Sie sind weg, wenn die Daten des Browsers für die Seite gelöscht wurden, und in einem anderen Browser oder auf einem anderen Rechner erscheinen sie nicht. Safari auf Mac, iPhone und iPad löscht die Daten einer Seite nach sieben Tagen ohne Besuch, außer layerling ist als App installiert. Hast du eine Sicherung, holt {{ui:dashboard.restoreBackup}} auf der Startseite die Entwürfe zurück, mit Ordnern und Bildern.

Mehr dazu: [Deine Daten, deine Sicherung](chapter:dateien-und-speichern#deine-daten-deine-sicherung)

### Wie sichere ich alles, auch von selbst in einen Ordner?

{{ui:dashboard.backupAll}} auf der Startseite packt alle Entwürfe in eine ZIP-Datei. Daneben hebt layerling von jedem Entwurf selbst frühere Fassungen auf, und in Chrome und Edge kann es jede davon als .lyl-Datei in einen Ordner deiner Wahl schreiben. Die Fassungen im Browser gehen mit den Daten des Browsers verloren, sie ersetzen also weder die ZIP-Datei noch den Ordner.

Mehr dazu: [Frühere Fassungen](chapter:dateien-und-speichern#fruehere-fassungen)

### Wie bekomme ich einen Entwurf auf einen anderen Rechner oder in einen anderen Browser?

Speichere ihn im Exportfenster als .lyl-Datei und öffne diese Datei auf dem anderen Rechner von der Startseite aus. Für alle Entwürfe auf einmal: hier {{ui:dashboard.backupAll}}, dort {{ui:dashboard.restoreBackup}}; Entwürfe, die schon da sind, kommen nicht doppelt.

Mehr dazu: [Sichern und Weitergeben](chapter:dateien-und-speichern#sichern-und-weitergeben)

### Was passiert, wenn ich die Browserdaten lösche?

Die Entwürfe in diesem Browser werden gelöscht, ebenso die früheren Fassungen, die layerling dort aufgehoben hat. Eine ZIP-Datei aus {{ui:dashboard.backupAll}}, deine .lyl-Dateien und ein Sicherungsordner auf deiner Festplatte bleiben unberührt. Also erst sichern, dann löschen.

Mehr dazu: [Deine Daten, deine Sicherung](chapter:dateien-und-speichern#deine-daten-deine-sicherung)

### Wie komme ich zu einem früheren Stand zurück?

Rückgängig geht Schritt für Schritt zurück. Die Verlaufsansicht zeigt jeden Schritt mit einem Schieberegler, ohne den Entwurf zu ändern, und macht aus jedem Stand einen neuen Entwurf. Für einen Stand von heute früh oder letzter Woche öffnet die Liste der früheren Fassungen eine alte Fassung als neuen Entwurf; der aktuelle bleibt, wie er ist.

Mehr dazu: [Zurückschauen: die Verlaufsansicht](chapter:auswaehlen-und-anordnen#zurueckschauen-die-verlaufsansicht) und [Frühere Fassungen](chapter:dateien-und-speichern#fruehere-fassungen)

### Können STL und 3MF direkt in meinen Projektordner? Und wie bekomme ich wieder einen Download?

In Chrome und Edge fragt der erste Export eines Entwurfs, wohin er speichern soll, und spätere Exporte schreiben ohne Nachfrage in dieselbe Datei. Firefox und Safari laden immer herunter. Willst du jedes Mal einen Download, schalte in den Einstellungen {{ui:workspace.stlAsDownload}} ein.

Mehr dazu: [Exportieren](chapter:dateien-und-speichern#exportieren)

### Der Speichern-Dialog ging zu, und es gibt keine Datei. Warum?

Der Browser meldet einen Dialog, den er nicht nutzen konnte, genauso wie einen abgebrochenen, und eine Datei, die ein Virenscanner sperrt, lässt sich auch nicht schreiben. Die Meldung oben bietet dann {{ui:status.saveAsDownload}} an, das legt die Datei in deine Downloads. Um den Dialog ganz zu umgehen, schalte in den Einstellungen {{ui:workspace.lylAsDownload}} und {{ui:workspace.stlAsDownload}} ein.

Mehr dazu: [Sichern und Weitergeben](chapter:dateien-und-speichern#sichern-und-weitergeben)

## Installieren und Aktualisieren

### Gibt es eine App zum Herunterladen?

layerling wird aus dem Browser heraus installiert: Es hat dann ein eigenes Symbol und ein eigenes Fenster und startet ohne Netz. Ein Installationsprogramm zum Herunterladen gibt es nicht, und das Original gibt es nur auf layerling.com. **Lade kein „layerling“-Installationsprogramm von einer anderen Seite herunter und führe keines aus:** Es stammt nicht von layerling und kann Schadsoftware enthalten. Für eine eigene Kopie gibt es einen Schnellstart für Windows und ein Docker-Image.

Mehr dazu: [Als App installieren](chapter:offline-und-installieren#als-app-installieren) und [Selbst betreiben](chapter:offline-und-installieren#selbst-betreiben)

### Läuft layerling ohne Internet?

Ja, nach dem ersten Besuch startet es ohne Netz, am besten als App installiert. Eines wird erst geladen, wenn es zum ersten Mal gebraucht wird: der CAD-Kern für den ersten STEP-Export, rund 22 MB.

Mehr dazu: [Als App installieren](chapter:offline-und-installieren#als-app-installieren)

### Wie bekomme ich ein Update?

Von selbst. Eine offene Seite bemerkt eine neue Version und zeigt eine Karte mit dem, was neu ist; {{ui:newVersion.reload}} speichert erst den offenen Entwurf und lädt dann die neue Version. Auch die Startseite zeigt eine neuere Version an.

Mehr dazu: [Aktualisierungen](chapter:offline-und-installieren#aktualisierungen)

### Welche Browser und Tablets gehen?

Chrome, Edge, Firefox und Safari, am Rechner, auf dem Tablet oder dem Telefon; die 3D-Ansicht braucht WebGL. Ein paar Dinge können nur Chrome und Edge: in eigene Dateien und Ordner schreiben, der Sicherungsordner und das Öffnen von .lyl-Dateien per Doppelklick. Auf dem Tablet tut ein Finger, was sonst die linke Maustaste tut.

Mehr dazu: [Finger und Stift](chapter:tablet-und-touch#finger-und-stift)

## KI

### Wie richte ich eine KI am einfachsten ein?

Gib einer KI, die auf deinem Rechner arbeiten kann, die Adresse `https://github.com/henmedia/layerling` und bitte sie, layerling mit seinem MCP-Server für dich einzurichten. Dafür braucht es ein Programm wie den Code-Tab der Claude-App, Claude Code, Codex, Antigravity oder Gemini CLI. Für Windows und Mac stehen die Schritte auch einzeln in der Anleitung.

Mehr dazu: [Schritt für Schritt für Einsteiger](chapter:ki-mit-mcp#schritt-fuer-schritt-fuer-einsteiger)

### Warum erreicht die KI layerling.com nicht?

Die Brücke zwischen KI und Editor gibt es nur in einer Kopie von layerling, die auf deinem eigenen Rechner läuft. Auf layerling.com ist sie immer ausgeschaltet, und ein Chat im Browser kann nichts installieren. Die KI braucht also ein lokal gestartetes layerling und ein Programm, das MCP spricht.

Mehr dazu: [Einrichten](chapter:ki-mit-mcp#einrichten)

### Ist die installierte App eine lokale Kopie?

Nein, wenn du sie von layerling.com installiert hast: Sie ist weiterhin layerling.com in einem eigenen Fenster, auch wenn sie ohne Internet startet. Bei einer lokalen Kopie läuft auf deinem Rechner ein kleiner Server, über den die KI per MCP mit dem Editor spricht; die Web-App hat keinen solchen Server. Nach dem Schnellstart läuft deine eigene Kopie unter `http://127.0.0.1:3000/`.

Mehr dazu: [Einrichten](chapter:ki-mit-mcp#einrichten)

### Welche KI geht, und was kostet das?

Jedes Programm, das MCP spricht; die Anleitung beschreibt Claude, Codex, Gemini und Antigravity. layerling selbst kostet nichts. Was die KI kostet, bestimmt ihr Anbieter: Der Code-Tab der Claude-App zum Beispiel gehört zu den bezahlten Claude-Tarifen.

Mehr dazu: [Einrichten](chapter:ki-mit-mcp#einrichten)

### Welche Daten gehen an den Anbieter der KI?

Was die KI liest: die Objekte des offenen Entwurfs und die Bilder der Ansicht, die sie aufnimmt. Das geht an den Anbieter deines KI-Programms wie alles andere, was du dort eingibst. Die Brücke selbst läuft auf deinem Rechner, und ohne KI verlässt nichts den Rechner.

Mehr dazu: [Was die KI kann](chapter:ki-mit-mcp#was-die-ki-kann)

## Speicher, Tempo und Verlauf

### Warum wird layerling mit meiner STL langsam?

Eine STL ist ein Netz aus Dreiecken, und ein sehr großes macht den Editor langsamer, braucht viel Arbeitsspeicher und macht das Speichern langsam. layerling sagt das nach dem Import, ab 400.000 Dreiecken in einem Netz oder einer Million im ganzen Entwurf. Vereinfache das Netz zuerst, importiere nur die Teile, die du brauchst, oder baue das Teil aus layerlings eigenen Formen.

Mehr dazu: [Große Netze](chapter:dateien-und-speichern#grosse-netze)

### Warum fehlen Schritte in meinem Verlauf?

Zwei Dinge kürzen ihn. Die Einstellung {{ui:workspace.savedHistory}} behält 100 Schritte je Entwurf, solange du sie nicht änderst, ältere fallen weg. Und wenn ein Entwurf zu groß ist, um mit dem ganzen Verlauf gespeichert zu werden, speichert layerling ihn mit der Hälfte der Schritte, dann wieder der Hälfte, und sagt es dir. Der Entwurf selbst wird immer vollständig gespeichert.

Mehr dazu: [Gespeicherter Verlauf](chapter:ansicht-und-arbeitsebene#gespeicherter-verlauf)

### Was tue ich, wenn der Speicher des Browsers voll ist?

Den Tab nicht schließen und nicht neu laden: Deine neuesten Änderungen liegen nur dort. Sichere zuerst eine Kopie über den Export als .lyl. Dann schaffe Platz: Schritte in der Verlaufsansicht löschen, Entwürfe entfernen, die du nicht mehr brauchst, oder sie sichern und dann löschen.

Mehr dazu: [Deine Daten, deine Sicherung](chapter:dateien-und-speichern#deine-daten-deine-sicherung)

### Mein Entwurf ist zu groß zum Speichern. Was nun?

Sein Verlauf und seine Netze brauchen zusammen zu viel Platz. layerling hat es schon mit weniger Verlaufsschritten versucht, bevor es das meldet. Lösche den Verlauf in der Verlaufsansicht, vereinfache die schwersten importierten Netze, oder speichere eine .lyl nur mit dem aktuellen Stand.

Mehr dazu: [Sichern und Weitergeben](chapter:dateien-und-speichern#sichern-und-weitergeben) und [Ein importiertes Netz vereinfachen](chapter:dateien-und-speichern#ein-importiertes-netz-vereinfachen)

### Dem Browser geht der Arbeitsspeicher aus. Was hilft?

Das passiert bei Netzen mit Millionen von Dreiecken, bei denen ein Schritt mehr Speicher braucht, als ein Browser-Tab bekommt. Verringere die Dreiecke importierter Netze mit {{ui:editor.tool.simplify}}, schließe andere Tabs und versuche es noch einmal. Passiert es beim Speichern, hilft auch ein kürzerer Verlauf.

Mehr dazu: [Große Netze](chapter:dateien-und-speichern#grosse-netze)

### Ein Entwurf öffnet sehr langsam oder gar nicht. Was kann ich tun?

Meist ist sein Verlauf aus Rückgängig-Schritten sehr groß geworden. {{ui:dashboard.openWithoutHistory}} im Menü des Entwurfs auf der Startseite liest nur den aktuellen Stand; die früheren Schritte werden dabei endgültig gelöscht, sichere den Entwurf also vorher, wenn du sie behalten willst. Eine frühere Fassung aus den Sicherungen öffnet sich als neuer Entwurf.

Mehr dazu: [Sichern und Weitergeben](chapter:dateien-und-speichern#sichern-und-weitergeben)

### layerling ruckelt. Welche Einstellungen helfen?

Der {{ui:workspace.fastMode}} in den Einstellungen schaltet Schatten, die Kantenlinien an allen Körpern und das Nachlaufen der Kamera ab und zeichnet die Ansicht nur in Bildschirmauflösung. Prüfe, ob der Browser die Grafikkarte nutzt: Unter `chrome://gpu` oder `edge://gpu` sollte neben WebGL „Hardware accelerated“ stehen. Große importierte Netze sind die andere häufige Ursache.

Mehr dazu: [Wenn sich layerling langsam anfühlt](chapter:ansicht-und-arbeitsebene#wenn-sich-layerling-langsam-anfuehlt)

### Der Editor bleibt stehen oder rechnet lange. Warten oder neu laden?

Erst warten. Schnitte, Gruppen und Kantenarbeit werden im Hintergrund gerechnet, solange steht dort {{ui:status.computing}}; lange Aufgaben wie das Aushöhlen brechen von selbst mit einer Meldung ab und ändern nichts. Musste der CAD-Kern neu gestartet werden, sagt die Meldung das, und ein Neuladen ist nicht nötig. Neu laden ist sicher, weil sich jede Änderung von selbst speichert, mit einer Ausnahme: Solange der rote Hinweis {{ui:notice.designNotSavedTitle}} steht, exportiere erst eine .lyl.

Mehr dazu: [Wenn sich layerling langsam anfühlt](chapter:ansicht-und-arbeitsebene#wenn-sich-layerling-langsam-anfuehlt)

### Die 3D-Ansicht bleibt leer, oder eine Meldung sagt, sie konnte nicht starten. Was nun?

Der Browser konnte WebGL nicht starten, das die 3D-Ansicht zeichnet. Die Ursache liegt im Browser oder im Grafiktreiber, nicht in deinem Entwurf, und deine gespeicherten Entwürfe werden nicht gelöscht. Schließe andere Tabs mit 3D-Inhalten und starte den Browser neu, schalte die Hardwarebeschleunigung ein, erlaube WebGL, falls eine Datenschutz-Einstellung oder eine Erweiterung es sperrt, und aktualisiere Browser und Grafiktreiber. Ein anderer Browser ist ein schneller Test.

Mehr dazu: [Wenn sich layerling langsam anfühlt](chapter:ansicht-und-arbeitsebene#wenn-sich-layerling-langsam-anfuehlt)

## Importierte Modelle

### „Netz vereinfachen“ oder „Exakt machen“: Was nehme ich?

{{ui:editor.tool.simplify}} behält einen Teil der Dreiecke, ein schweres Modell wird also leichter; es bleibt ein Netz. {{ui:editor.tool.makeExact}} baut ein Modell aus Ebenen, Zylindern, Kegeln und Kugeln als echten CAD-Körper nach, sodass Verrundungen und Fasen sauberen Kanten folgen und ein STEP-Export echte Flächen enthält. Es nimmt bis zu 400.000 Dreiecke; eine Figur oder ein Scan bleibt ein Netz. Bei einem großen technischen Teil: erst vereinfachen, mit {{ui:simplify.keepEdges}} eingeschaltet, dann exakt machen.

Mehr dazu: [Ein importiertes Netz vereinfachen](chapter:dateien-und-speichern#ein-importiertes-netz-vereinfachen) und [Ein importiertes Netz exakt machen](chapter:dateien-und-speichern#ein-importiertes-netz-exakt-machen)

### Warum klappt ein Schnitt nicht, oder warum ist mein Netz „nicht dicht“?

Ein Körper lässt sich nur schneiden, wenn seine Oberfläche geschlossen ist. Hat ein importiertes Netz Lücken, nennt layerling das Teil und die Zahl der offenen Kanten und lässt es aus. Kleine Löcher schließt es selbst; größere müssen in dem Programm repariert werden, aus dem das Modell stammt, oder in einem Werkzeug zur Netzreparatur. Die Druckprüfung zeigt, welcher Körper offen ist.

Mehr dazu: [Druck prüfen](chapter:drucken#druck-pruefen)

### Wie importiere ich eine SVG richtig?

Eine SVG kommt als Skizzenkörper herein, 4 mm hoch, und ihre Punkte lassen sich im Skizzenmodus ändern. Trage vor dem Import im Importfenster die Breite in Millimetern ein; ohne Zahl behält sie ihre eigene Größe. Umrisse, die sich selbst kreuzen, können kein Körper werden und werden ausgelassen und gezählt: Füge überlappende Stücke im Zeichenprogramm zusammen, schließe die Umrisse und importiere erneut.

Mehr dazu: [Importieren](chapter:dateien-und-speichern#importieren)

## Verrunden und Fasen

### Warum lässt sich eine Verrundung nicht anwenden?

Meist ist sie für die Stelle zu groß: Sie würde in die Nachbarflächen laufen, oder die Kante biegt enger, als der Radius ist. Oft reichen ein oder zwei Millimeter weniger, und an spitzen Winkeln braucht eine Verrundung mehr Platz, als ihr Radius vermuten lässt. Lassen sich die Kanten nicht zusammen verrunden, nimm weniger auf einmal; die Kante, die im Weg ist, wird rot gezeichnet. {{ui:edge.findLargest}} sucht die Größe für dich.

Mehr dazu: [Kanten fasen und verrunden](chapter:kanten-und-aushoehlen#kanten-fasen-und-verrunden)

### Warum sind meine Verrundungen weg, nachdem ich die Skizze geändert habe?

Nach {{ui:inspector.editSketch}} wird der Körper neu gebaut und hat neue Kanten. layerling legt Verrundungen und Fasen wieder auf die Kanten, die dort liegen, wo die alten lagen, solange der Körper so viele Kanten hat wie vorher. Mit einer Ecke mehr oder weniger bleiben sie weg, und die Meldung sagt, wie viele. Rückgängig holt alles zurück.

Mehr dazu: [Ein Körper daraus machen](chapter:skizzen#ein-koerper-daraus-machen)

### Warum kann ich manche Kanten eines importierten Modells nicht wählen?

STL, OBJ und 3MF bringen nur Dreiecke mit, und die Kantenwerkzeuge arbeiten an Netzen bis 4.000 Dreiecke. {{ui:editor.tool.makeExact}} macht aus einem technischen Teil einen echten CAD-Körper, an dem eine Bohrung einen runden Rand hat, dem eine Verrundung folgen kann. Eine STEP-Datei bringt die exakte Geometrie von Anfang an mit.

Mehr dazu: [Ein importiertes Netz exakt machen](chapter:dateien-und-speichern#ein-importiertes-netz-exakt-machen)

## Gruppen, Löcher und Maße

### Warum werden Löcher oval, wenn ich eine Gruppe in die Länge ziehe?

Eine Gruppe, deren Größe geändert wird, streckt alles in ihr, als wäre es auf Gummi gezeichnet. Wähle in den Einstellungen der Gruppe unter {{ui:inspector.groupResize}} den Punkt {{ui:inspector.groupResizeKeepParts}}: Teile, die über die ganze Gruppe reichen, werden gestreckt, Löcher und kleine Teile behalten ihre Größe und ihren Abstand zur näheren Seite.

Mehr dazu: [Größe ändern: Aussparungen und kleine Teile behalten](chapter:koerper-und-aussparungen#groesse-aendern-aussparungen-und-kleine-teile-behalten)

### Warum klappt das Gruppieren nicht, oder warum hat das Ergebnis Lücken?

Entweder ist ein Teil nicht geschlossen, das nennt die Meldung, oder zwei Teile treffen sich fast, ohne sich wirklich zu berühren. Löse die Gruppe auf, richte die Teile genau aus oder ändere eine Größe oder Position ein wenig, und gruppiere erneut. Sehr dichte Netze über der Grenze für das Schneiden importierter Netze werden gar nicht vereint.

Mehr dazu: [Gruppieren](chapter:koerper-und-aussparungen#gruppieren)

### Wie ändere ich ein einzelnes Teil in einer Gruppe?

Wähle die Gruppe und drücke [[E]], oder klicke sie doppelt an. Die Teile liegen dann einzeln da und lassen sich ändern; beim Beenden wird die Gruppe neu gebaut. Verrundungen und Fasen, die auf der ganzen Gruppe lagen, gehen beim Neubau verloren.

Mehr dazu: [Eine Gruppe bearbeiten](chapter:koerper-und-aussparungen#eine-gruppe-bearbeiten)

### Wie hole ich ein einzelnes Teil aus einem früheren Stand zurück?

Öffne die Verlaufsansicht, schiebe den Regler auf den Stand, der das Teil noch hatte, klicke das Teil an und wähle {{ui:historyView.bringBack}}. Eine Kopie landet im aktuellen Entwurf, so wie sie war und wo sie war, mit der Uhrzeit im Namen.

Mehr dazu: [Zurückschauen: die Verlaufsansicht](chapter:auswaehlen-und-anordnen#zurueckschauen-die-verlaufsansicht)

## Drucken und Export

### STL, 3MF, OBJ oder STEP: Was nehme ich?

Für den Drucker 3MF oder STL. 3MF behält jeden Körper als Teil mit Namen und Farbe; STL ist ein einziges Netz in einer Farbe. OBJ trägt ebenfalls Farben. STEP ist für andere CAD-Programme: Es enthält die exakte Geometrie mit Verrundungen und Fasen.

Mehr dazu: [Exportieren](chapter:dateien-und-speichern#exportieren)

### Wie kommen meine Farben in den Slicer?

Exportiere 3MF. Jeder Körper behält seine Farbe, und ein Körper, der in mehreren Farben bemalt ist, trägt die Bemalung auf seinen Flächen. Bambu Studio und OrcaSlicer fragen beim Öffnen, wie die Farben deinen Filamenten zugeordnet werden.

Mehr dazu: [In mehreren Farben bemalen](chapter:formen#in-mehreren-farben-bemalen)

### Meine Teile passen nicht ineinander. Wie viel Spiel brauchen sie?

Meist 0,2 bis 0,4 mm, je nach Drucker. Die Passprobe misst es: Drucke die kleine Platte mit sieben Löchern, suche das engste Loch, in dem sich der Stift noch dreht, und trage diesen Wert als Spiel deines Druckers ein. Neue Deckel, Schwalbenschwänze und Gewinde gehen dann von ihm aus.

Mehr dazu: [Spiel deines Druckers: die Passprobe](chapter:drucken#spiel-deines-druckers-die-passprobe)

### Warum sagt layerling, ein Teil passe nicht in den Drucker?

Das Teil ragt über den Rand der Platte oder ist höher, als der gewählte Drucker bauen kann. Es ist nur ein Hinweis und lässt sich schließen. Wähle deinen Drucker in den Einstellungen, oder zerlege ein zu großes Teil mit {{ui:editor.tool.split}}.

Mehr dazu: [Wenn etwas nicht passt](chapter:drucken#wenn-etwas-nicht-passt)

## Rund um layerling

### Ist layerling kostenlos, und darf ich verkaufen, was ich damit entwerfe?

layerling ist freie Software unter der Lizenz AGPL-3.0, ohne Konto. Die Lizenz betrifft das Programm: Wer layerling ändert und anderen über ein Netz anbietet, muss auch den Quelltext anbieten. Für die Modelle, die du baust, stellt sie keine Bedingungen. Schriften und Modelle, die du importierst, behalten ihre eigenen Lizenzen.

Wenn du das Projekt unterstützen möchtest: Eine [kleine Spende](support:) hilft bei den Server- und Entwicklungskosten. Sie ist freiwillig, und nichts in layerling hängt davon ab.

Mehr dazu: [Selbst betreiben](chapter:offline-und-installieren#selbst-betreiben)

### Wie melde ich einen Fehler oder wünsche mir etwas?

{{ui:editor.bugReport}} in der Fußzeile speichert eine ZIP-Datei mit dem Entwurf und einem kurzen Text zu Version und Browser; Persönliches steht nicht darin. Hänge sie im Forum oder in den Diskussionen auf GitHub an. Fragen und Wünsche sind an beiden Orten willkommen.

Mehr dazu: [Einen Fehler melden](chapter:dateien-und-speichern#einen-fehler-melden) und [Hilfe und Rückmeldung](chapter:offline-und-installieren#hilfe-und-rueckmeldung)
