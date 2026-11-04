---
title: Als App installieren, ohne Internet arbeiten und selbst hosten
summary: layerling wie ein normales Programm starten, auch ohne Netz – und wie du es auf einem eigenen Rechner betreibst.
---

## Als App installieren

layerling lässt sich wie ein normales Programm installieren. Es bekommt dann ein eigenes Symbol und ein eigenes Fenster ohne Adressleiste. Nach dem ersten Besuch startet es auch **ohne Internet**. Deine Entwürfe bleiben dabei auf deinem Rechner. Das Installieren lohnt sich: Die App startet schneller, weil sie nicht jedes Mal neu geladen werden muss, sie läuft ohne Internet und entlastet den Server. Du verlierst nichts, denn layerling zeigt dir weiter an, wenn es eine neue Version gibt. Das schützt auch deine Entwürfe: Safari auf dem Mac und auf iPhone und iPad löscht die gespeicherten Daten einer Website, die sieben Tage nicht besucht wurde, nicht aber die einer installierten App.

Auf der Startseite erscheint dafür ein Hinweis mit {{ui:installHint.install}}, wenn dein Browser es kann. Sonst:

- **Chrome und Edge:** Klicke auf das Installieren-Symbol rechts in der Adressleiste, oder wähle im Browsermenü „Als App installieren“.
- **Safari am Mac:** Menü „Ablage“, dann „Zum Dock hinzufügen“.
- **Safari auf dem iPhone und iPad:** Teilen-Symbol, dann „Zum Home-Bildschirm“.
- **Firefox:** kann keine Apps installieren. layerling startet dort aber trotzdem offline im Tab.

Den Hinweis auf der Startseite kannst du mit {{ui:installHint.dismiss}} schließen. Startest du die installierte App in Chrome oder Edge ein zweites Mal, holt sie das offene Fenster nach vorn, statt ein weiteres zu öffnen.

Auf einem Computer meldet sich eine installierte App in Chrome oder Edge außerdem als Programm für `.lyl`-Dateien an: Ein Doppelklick auf einen Entwurf im Dateimanager öffnet ihn in layerling, und [[Strg]]+[[S]] speichert wieder in diese Datei. Dasselbe gilt für `.stl`- und `.3mf`-Dateien: Sie öffnen sich als neuer Entwurf, wie mit {{ui:dashboard.importGeometry}} auf der Startseite. Damit layerling sie immer öffnet, wähle es unter „Öffnen mit“ und lass das System es immer verwenden. Auf Android geht das nicht, dort bietet der Browser für installierte Web-Apps keine Dateizuordnung; öffne einen Entwurf dort auf der Startseite mit {{ui:dashboard.importGeometry}}.

## Aktualisierungen

Wenn es eine neuere Fassung gibt, zeigt layerling das auf der Startseite an. Über {{ui:dashboard.updateBannerLink}} liest du nach, was sich geändert hat. Die Versionsnummer steht unten rechts. Nach einem Neuladen der Seite hast du die neue Fassung.

Auf layerling.com und auf anderen Webservern merkt eine offene Seite ein Update selbst. Sie fragt den Server hin und wieder nach seiner Version, wenn du zum Tab zurückkommst und sofort, wenn eine Programmdatei, die sie braucht, verschwunden ist. Ist inzwischen etwas Neues eingespielt worden, sagt dir das eine Karte unten rechts und führt auf, was neu ist. {{ui:newVersion.reload}} schreibt den offenen Entwurf zuerst in den Browser und lädt die Seite dann neu; der Entwurf ist danach so da, wie du ihn verlassen hast. {{ui:newVersion.later}} hält die Karte 15 Minuten zurück. Lade bald neu: Eine Seite, die auf der alten Fassung bleibt, kann Teile der neuen nachladen, die nicht dazu passen. Dieselbe Karte erscheint, wenn das schon passiert ist: Die CAD-Werker, die erst bei Bedarf laden, melden, aus welchem Bau sie stammen, und ist es nicht der der Seite - nach einem Update oder bei einer gespeicherten Kopie einer älteren Fassung -, bittet die Karte um ein Neuladen, bevor beide aneinander vorbeireden.

Ist layerling in mehreren Tabs offen, achten die Tabs aufeinander: Läuft in einem anderen Tab schon eine neuere Version, bittet ein Hinweis unten im alten Tab, ihn neu zu laden. Und ist derselbe Entwurf in zwei Tabs offen, warnen beide davor, denn sie speichern automatisch und würden sich gegenseitig überschreiben. Öffnest du layerling in einem weiteren Tab, obwohl schon einer offen ist, rät dir der neue Tab, im alten weiterzuarbeiten, und bietet an, sich selbst zu schließen. Willst du bewusst zwei Tabs, etwa für zwei Entwürfe nebeneinander, klickst du dort auf {{ui:tabs.keepHere}}. Auch diese Anleitung öffnet sich in einem eigenen Tab: Ist layerling daneben offen, heißt ihr Knopf oben rechts „Zurück zum Editor“ und schließt die Anleitung, statt den Editor ein zweites Mal zu öffnen.

## Sprache und Aussehen

Die Sprache wählst du oben rechts in der Sprachliste. Das Farbschema daneben bietet {{ui:theme.short.system}} (folgt dem Betriebssystem), {{ui:theme.short.light}}, {{ui:theme.short.dark}} und {{ui:theme.short.graphite}}, ein neutrales Dunkelgrau.

## Selbst betreiben

layerling ist freie Software (AGPL-3.0) und lässt sich auf einem eigenen Rechner oder Server betreiben, etwa in der Werkstatt, im Verein oder in der Schule. Dafür gibt es mehrere Wege, die in der [README auf GitHub](https://github.com/henmedia/layerling/blob/main/README.de.md#loslegen) beschrieben sind:

- **Der Schnellstart unter Windows:** Eine einzige Zeile in PowerShell installiert alles und legt eine Verknüpfung auf dem Desktop an. Läuft layerling schon, startet ein weiterer Doppelklick keinen zweiten Server, sondern öffnet nur die Seite.
- **Docker:** Für NAS-Geräte und Heimserver, ohne dass Node.js installiert sein muss. Jedes Release gibt es als fertiges Image `henmedia/layerling` auf Docker Hub (auch `ghcr.io/henmedia/layerling`) für amd64 und arm64; `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` startet es, auf einem NAS suchst du es in der Registrierung der Container-Verwaltung. Das Volume `layerling-thumbnails` hält die Vorschaubilder der Startseite über ein Update hinweg; ohne es fehlen sie nach jedem Neuanlegen des Containers, bis du den Entwurf wieder öffnest.
- **Statischer Export:** Das Ergebnis besteht aus reinen Dateien, die jeder Webserver ausliefern kann. Sie gehören an die Wurzel einer Adresse (`https://layerling.example.com/` oder `http://192.168.0.5:8080/`), nicht in einen Unterordner und nicht von der Festplatte geöffnet; die Schritte stehen in der README. Mit einem beschreibbaren Ordner `store` neben der `index.html` und PHP auf dem Server wird daraus auch die gemeinsame Ablage für Entwürfe.

Die MCP-Brücke für KI-Assistenten gibt es nur beim Entwicklungsserver, siehe [Mit einer KI bauen](chapter:ki-mit-mcp).

## Hilfe und Rückmeldung

- Im Editor liegt im Bereich {{ui:editor.group.help}} die {{ui:editor.guide}} mit den wichtigsten Handgriffen und die Übersicht der [Tastenkürzel](chapter:tastenkuerzel). Die Kurzanleitung verweist bei jedem Abschnitt mit einem Fragezeichen auf das passende Kapitel hier.

![Die Kurzanleitung im Editor. Oben stehen Videos von anderen, jeder Abschnitt hat ein Fragezeichen.](shot:quick-guide)

- Fragen, Wünsche und Fehlermeldungen sind im [Forum](https://forum.drucktipps3d.de/forum/board/127-layerling/) und auf [GitHub](https://github.com/henmedia/layerling/discussions) willkommen.
- Was sich in welcher Version geändert hat, steht in den Versionshinweisen, die du unten auf der Startseite und im Editor findest.
