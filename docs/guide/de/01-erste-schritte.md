---
title: Erste Schritte
summary: Vom leeren Blatt zum ersten Teil für den 3D-Drucker – in fünf Minuten, ohne Konto und ohne Installation.
---

layerling ist ein Konstruktionsprogramm für den 3D-Druck, das direkt im Browser läuft. Du baust ein Teil aus einfachen Formen, schneidest Löcher hinein, rundest die Kanten und schickst es an den Slicer. Es gibt nichts zu installieren und nichts anzumelden. Was du baust, bleibt auf deinem Rechner.

![Die Startseite von layerling: oben „Neuen 3D-Entwurf anlegen“, darunter die eigenen Entwürfe und die Kurzanleitung.](shot:start-page)

## Einen Entwurf anlegen

Öffne [layerling.com](https://layerling.com/). Auf der Startseite klickst du auf {{ui:dashboard.createDesign}}. Damit öffnet sich der Editor mit einer leeren Arbeitsebene, dem Gitter, auf dem alles entsteht.

Hast du schon eine Datei, die du weiterbearbeiten willst, nimmst du {{ui:dashboard.importGeometry}}. Das geht mit layerling-Entwürfen (`.lyl`) genauso wie mit STL-, OBJ-, 3MF-, STEP- oder SVG-Dateien.

Alle deine Entwürfe erscheinen später auf der Startseite mit einem Vorschaubild. Sie liegen im Speicher deines Browsers und werden bei jeder Änderung automatisch gesichert. Ein Knopf zum Speichern gibt es deshalb nicht. **layerling übernimmt keine Verantwortung für Entwürfe, die im Browser gespeichert sind.** Ein Browser kann Fehler machen, und ein Update kann Probleme bereiten. Sichere deine Entwürfe deshalb von Zeit zu Zeit mit {{ui:dashboard.backupAll}} auf der Startseite oder speichere sie als Dateien. Eine Sicherung holst du mit {{ui:dashboard.restoreBackup}} zurück. Wie du Entwürfe in eine Datei packst und weitergibst, steht im Kapitel [Dateien und Speichern](chapter:dateien-und-speichern). Wenn du eine Gedächtnisstütze möchtest, schalte in den Einstellungen (Zahnrad im Band) {{ui:workspace.confirmTabClose}} ein: Der Browser fragt dann, bevor ein Tab mit offenem Entwurf geschlossen oder neu geladen wird.

## Der Editor im Überblick

![Der Editor mit zwei Formen auf der Arbeitsebene. Oben das Menüband, links die Kamerasteuerung, rechts die Einstellungen der ausgewählten Form.](shot:editor-overview)

- **Oben** steht das Menüband. Es ist nach Aufgaben sortiert: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.manage}} und {{ui:editor.group.help}}. Wenn du mit der Maus über ein Symbol fährst, steht sein Name da, auch bei einem ausgegrauten; die {{ui:interactiveHelp.title}} (das Fragezeichen unter {{ui:editor.group.help}}, oder Shift+F1) erklärt jedes mit einem Klick und führt zu seinem Abschnitt in dieser Anleitung. Wo du ein kleines Fragezeichen siehst, etwa an den Einstellungen einer Form, in der Formenbibliothek oder in den Werkzeugfenstern, führt es direkt zum passenden Kapitel dieser Anleitung.
- **In der Mitte** liegt die Arbeitsebene. Hier stellst du Formen hin, ziehst sie zurecht und siehst das Ergebnis.
- **Rechts** erscheinen die Einstellungen der ausgewählten Form: Farbe, Maße, Lage und alles, was die Form sonst noch ausmacht. Zahlen tippen ist genauer als ziehen.
- **Links** liegt die Kamerasteuerung mit dem Ansichtswürfel darüber. Mit ihr bewegst du dich durch die Szene, mehr dazu im Kapitel [Ansicht und Arbeitsebene](chapter:ansicht-und-arbeitsebene).
- **Ganz oben** wechselst du zwischen {{ui:editor.modeGeometry}} und {{ui:editor.modeSketch}}, benennst den Entwurf um und stellst Sprache und Farbschema ein.

## Die Knöpfe rund um die Arbeitsfläche

Fahre mit der Maus über einen Knopf, dann siehst du seinen Namen. Wenn du nicht sicher bist, was ein Knopf tut, klicke im Bereich {{ui:editor.group.help}} auf {{ui:interactiveHelp.title}} ([[Umschalt]]+[[F1]]) und dann auf den Knopf. Hier stehen die, nach denen am häufigsten gefragt wird.

### Einfügen

{{ui:editor.tool.paste}} ([[Strg]]+[[V]]) fügt in den Entwurf ein, was du mit {{ui:editor.tool.copy}} kopiert hast. {{ui:common.duplicate}} kopiert und fügt in einem Schritt ein. Beim Einfügen liegt jedes Teil ein Stück neben seiner alten Stelle. Teile aus einem anderen Programm können weit weg von der Platte landen, dafür gibt es in den Einstellungen unter {{ui:workspace.appearance}} {{ui:workspace.pasteCentered}}: Beim Einfügen kommen die Teile dann zusammen in die Mitte der Arbeitsebene und werden darauf abgesetzt.

### Löschen

{{ui:common.delete}} ([[Entf]]) entfernt die gewählten Formen. {{ui:editor.tool.undo}} holt sie zurück.

### Gruppierung aufheben

{{ui:editor.tool.ungroup}} ([[Strg]]+[[Umschalt]]+[[G]]) zerlegt die gewählte Gruppe wieder in die Formen, aus denen sie gemacht wurde.

### Arbeitsbereich-Einstellungen

{{ui:editor.workspaceSettings}} öffnet die Einstellungen der Arbeitsfläche: Einheit, Größe der Platte, Drucker, Raster, Farben, Licht und mehr. Mehr dazu in [Ansicht und Arbeitsebene](chapter:ansicht-und-arbeitsebene).

### Farbschema

{{ui:common.theme}} ganz oben bestimmt, wie layerling aussieht: wie dein System, hell, dunkel oder Graphit.

### Entwurf umbenennen

{{ui:editor.renameProject}}: der Stift neben dem Namen ganz oben. Tippe den neuen Namen und drücke [[Enter]].

### Entwurfsname

Der Name des Entwurfs ({{ui:confirm.projectName}}) steht ganz oben. Klicke ihn an, tippe, und [[Enter]] behält den Namen.

### Sichtbarkeitsoptionen

{{ui:editor.visibilityOptions}}, der Pfeil neben dem Augensymbol, enthält, was du ein- oder ausblenden kannst: die Objektliste, alles, was du ausgeblendet hast, die Notizen und die Überhänge des Drucks. Mehr dazu in [Auswählen und anordnen](chapter:auswaehlen-und-anordnen).

### Auswahl ausblenden

{{ui:editor.tool.hideSelected}} ([[Strg]]+[[H]]) blendet die gewählten Formen aus. Sie bleiben im Entwurf und in der Objektliste; {{ui:editor.visibilityOptions}} zeigt sie wieder.

### Befehle suchen

{{ui:palette.open}}: Tippe, was du suchst, ein Werkzeug, eine Form oder eine Einstellung, und klicke auf das Ergebnis.

### Kamerasteuerung ausblenden

{{ui:camera.hide}} klappt die Kamerasteuerung links weg und gibt der Arbeitsfläche mehr Platz; {{ui:camera.show}} holt sie zurück.

### Raster

{{ui:inspector.snapGrid}}, unten in den Eigenschaften, ist die Stufe, auf die Verschieben und Größenändern einrasten. Daneben ändert der kleine Schalter **mm | in** die Einheit. Mehr dazu in [Ansicht und Arbeitsebene](chapter:ansicht-und-arbeitsebene).

### Einheit: Millimeter oder Zoll

Der Schalter **mm | in** neben {{ui:inspector.snapGrid}} ändert die Einheit, das Raster der Platte und die Fangstufe, für diesen Entwurf.

### Die Fußzeile

Am Fuß des Fensters: {{ui:dashboard.sponsor}} führt zur Seite, auf der du das Projekt unterstützen kannst; {{ui:dashboard.userGuide}} öffnet diese Anleitung; {{ui:dashboard.forum}} führt zum Ort für Fragen, Ideen und Fehlermeldungen (die Diskussionen auf GitHub, auf Deutsch das Forum von drucktipps3d); {{ui:editor.bugReport}} macht ein ZIP für eine Fehlermeldung; {{ui:dashboard.projectOnGitHub}} führt zum Projekt auf GitHub, und die Versionsnummer öffnet die Versionshinweise. Die Links zu Impressum und Datenschutz gehören dem, der die Kopie von layerling betreibt, die du benutzt.

## Dein erstes Teil

Als Beispiel bauen wir einen Würfel mit einer Bohrung.

1. Klicke im Menüband auf {{ui:editor.addShape}} und wähle {{ui:shape.box}}. Die Form hängt jetzt am Mauszeiger. Ein Klick auf die Arbeitsebene setzt sie ab.
2. Rechts stellst du die Maße ein, etwa 40 mm Länge, 40 mm Breite und 20 mm Höhe.
3. Setze auf gleiche Weise einen {{ui:shape.cylinder}} in die Mitte, mit 14 mm Durchmesser und 30 mm Höhe. Er soll höher sein als der Würfel, damit er ganz hindurchreicht.
4. Wähle den Zylinder aus und klicke rechts auf {{ui:inspector.hole}}. Er wird durchscheinend: Aus dem Körper ist ein Werkzeug geworden, das Material wegnimmt.
5. Markiere beide Formen und klicke auf {{ui:editor.tool.group}}. Der Würfel hat jetzt ein Loch.

![Der Zylinder ist eine Aussparung und ragt oben aus dem Würfel heraus.](shot:hole-before)

![Nach dem Gruppieren hat der Würfel eine Bohrung.](shot:hole-after)

Genau so entstehen Bohrungen, Nuten und Taschen. Das Kapitel [Körper und Aussparungen](chapter:koerper-und-aussparungen) erklärt das ausführlich.

## Neu seit deinem letzten Besuch

Wenn du layerling nach einer Aktualisierung wieder öffnest, zeigt dir eine Karte auf der Startseite, was seit deinem letzten Besuch dazugekommen ist: jede Version seitdem, die neueste zuerst. Warst du lange weg, rollst du in der Karte nach unten. Darunter holt {{ui:whatsNew.earlier}} auch die Versionen von vor deinem letzten Besuch dazu. Mit {{ui:whatsNew.dismiss}} schließt du sie, und sie bleibt bis zur nächsten Aktualisierung weg. {{ui:whatsNew.footerLink}} in der Fußzeile der Startseite zeigt die letzten Neuerungen jederzeit wieder. Der Browser merkt sich die zuletzt gesehene Version, und nichts über dich verlässt ihn.

Bei einer Kopie von layerling auf deinem eigenen Rechner oder Server hat der Hinweis „Update verfügbar“ einen Knopf, {{ui:update.previewShow}}, der auflistet, was das Update bringt, bevor du es einspielst. Die Liste wird nur beim Drücken des Knopfs von GitHub geholt.

## Vom Entwurf zum Druck

Wenn dein Teil fertig ist, klickst du auf {{ui:editor.export}}, wählst STL oder 3MF und lädst die Datei herunter. Die öffnest du in deinem Slicer, zum Beispiel in Bambu Studio, PrusaSlicer, OrcaSlicer oder Cura. Wer seinen Drucker in den Einstellungen wählt, sieht schon beim Bauen, ob das Teil auf die Druckplatte passt. Mehr dazu im Kapitel [Drucken](chapter:drucken).

> **Tipp:** Wenn du von Tinkercad kommst, wirst du dich schnell zurechtfinden: Platte, Formen, Körper und Aussparung, Gruppieren, Ausrichten und Spiegeln funktionieren fast genauso. Neu sind vor allem Fase und Verrundung, Aushöhlen, Gewinde und Skizzen. Auch deine eigenen Tinkercad-Designs kannst du mitnehmen, siehe [Dateien, Speichern und Weitergeben](chapter:dateien-und-speichern).
