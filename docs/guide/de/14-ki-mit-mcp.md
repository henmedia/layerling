---
title: Mit einer KI bauen (MCP)
summary: Wie ein KI-Assistent wie Gemini, Claude oder Codex in deinem geöffneten Editor Formen anlegt, ändert, gruppiert und Bilder der Ansicht aufnimmt.
---

layerling bringt einen MCP-Server mit. MCP ist ein Standard, über den ein KI-Assistent Werkzeuge in anderen Programmen benutzen kann. Damit sieht ein KI-Client wie Gemini, Claude oder Codex einen offenen Editor-Tab und arbeitet darin: Er legt Formen an, ändert Maße, gruppiert, schneidet, rundet Kanten, liest die Szene aus und nimmt Bilder der Ansicht auf. Du beschreibst das Teil, die KI baut es, du siehst zu und greifst jederzeit ein.

Die Brücke zwischen KI-Client und Editor läuft **lokal auf deinem Rechner**. Bedenke aber: Was die KI liest, also die Szene und die Bilder der Ansicht, geht an den Anbieter deines KI-Clients, so wie jede andere Eingabe dort auch.

> **Wichtig:** Die MCP-Brücke gibt es im Entwicklungsserver, den du selbst auf deinem Rechner startest. Auf layerling.com und in Installationen mit statischem Hosting ist sie abgeschaltet. Eine Kopie, die du selbst betreibst, etwa das Docker-Image auf einer NAS, kann sie mit einem Zugriffsschlüssel einschalten; siehe „Eine Kopie auf NAS oder Server“ unten.

## Einrichten

1. Lade layerling von [GitHub](https://github.com/henmedia/layerling) und starte es im Projektordner mit `npm run dev`. Node.js muss installiert sein. Unter Windows erledigt das die Schnellstart-Zeile in der README.
2. Öffne einen Editor-Tab, zum Beispiel `http://127.0.0.1:3000/?editor=1`. Das kannst du auch der KI überlassen: Ist kein Editor offen, startet das erste Werkzeug, das einen braucht, deinen Browser mit einem Editor und wartet, bis er verbunden ist. Das geht bei einem layerling auf deinem eigenen Rechner; bei einer Kopie auf einem NAS oder Server öffnest du den Editor selbst. Mit `LAYERLING_MCP_OPEN_EDITOR=0` am MCP-Server schaltest du es ab.
3. Verbinde deinen KI-Client mit dem MCP-Server. Er wird vom Client selbst mit `node scripts/layerling-mcp-server.mjs` gestartet.

### Claude Code

Nichts zu installieren: Das Projekt bringt eine `.mcp.json` mit, die den Server einträgt, und den Skill unter `.claude/skills/layerling-mcp-skill`. Öffne den layerling-Ordner in Claude Code und bitte zum Beispiel: „Nutze die layerling-MCP-Werkzeuge, liste meine offenen Editoren auf und sieh dir die Szene an.“

### Claude Desktop

Claude Desktop liest keine Projektdateien. Trage den Server in seiner eigenen Konfiguration ein. Als Vorlage dient `docs/mcp/claude-desktop-config.example.json` im Projekt, in der du den Skriptpfad durch den absoluten Pfad auf deinem Rechner ersetzt. Danach Claude Desktop neu starten.

### Codex

Kopiere den Skill aus `docs/skills/layerling-mcp-skill` in deinen Codex-Skill-Ordner, trage den Server anhand von `docs/mcp/codex-config.example.toml` in deine Codex-Konfiguration ein und starte Codex neu.

### Gemini & Antigravity

Antigravity findet den Skill im Arbeitsordner unter `.agents/skills/layerling-mcp-skill` von selbst. Für die Gemini CLI kopierst du den Skill aus `docs/skills/layerling-mcp-skill` in deinen globalen Skill-Ordner (`~/.gemini/skills/`), trägst den Server anhand von `docs/mcp/gemini-config.example.json` in deine Einstellungen ein und startest den Client neu.

Die ausführliche Anleitung für jeden Client steht in der [README auf GitHub](https://github.com/henmedia/layerling/blob/main/README.de.md#layerling-mcp-skill).

## Eine Kopie auf NAS oder Server

Eine Kopie, die du selbst betreibst, kann einen KI-Client ihre offenen Editoren übers Netz steuern lassen. Das ist standardmäßig aus, denn wer die Brücke steuern kann, kann die offenen Entwürfe lesen und ändern. Setze auf dem Server `LAYERLING_MCP_REMOTE` auf `true` und `LAYERLING_MCP_TOKEN` auf ein Geheimnis von mindestens 16 Zeichen (beim Docker-Image unter `environment:` der Compose-Datei; ein Neubau ist nicht nötig). Öffne einen Editor-Tab dieser Kopie und lass ihn offen, und gib dem MCP-Client die Adresse und denselben Schlüssel: `LAYERLING_URL=http://nas:3000` und `LAYERLING_MCP_TOKEN=<der Schlüssel>`.

Nur ein Client mit dem Schlüssel kann die Editoren auflisten oder steuern. Die Editor-Seiten brauchen keinen, zählen aber nur unter einer Adresse oder einem Namen, den nur dein eigenes Netz benutzen kann (eine IP-Adresse, ein Name ohne Punkt oder einer auf `.local` oder `.lan`); eine echte Domain hinter einem Reverse-Proxy kommt in `LAYERLING_MCP_ALLOWED_HOSTS`. Nutze es in einem Netz, dem du vertraust, und HTTPS darüber hinaus. Die Einzelheiten stehen in der README.

## Was die KI kann

Die KI arbeitet mit denselben Funktionen wie du, sie läuft über denselben Weg wie deine Bedienung im Editor. Neue Funktionen von layerling bekommen ihre MCP-Aktion gleich mit. Die Werkzeuge:

| Werkzeug | Was es tut |
| --- | --- |
| `layerling_list_editors` | listet die offenen Editor-Tabs auf |
| `layerling_open_editor` | öffnet einen neuen Editor-Tab in deinem Standardbrowser und wartet, bis er verbunden ist (nur auf deinem eigenen Rechner) |
| `layerling_read_scene` | liest Szene, Auswahl, Einheiten und die genauen Maße aller Objekte |
| `layerling_list_objects` | listet alle Objekte mit Maßen, Lage, Drehung und Kennung |
| `layerling_select_objects` | wählt Objekte aus |
| `layerling_delete_objects` | löscht Objekte |
| `layerling_create_shape` | legt eine Form an: Quader, Zylinder, Text (auch gebogen), Gewinde, Zahnrad, Skizzenkörper und alle anderen |
| `layerling_import_file` | importiert eine Datei wie das Importfenster, eine farbige OBJ oder 3MF als ein Körper je Farbe, eine 3MF mit mehreren Objekten als ein Körper je Objekt |
| `layerling_add_font` | fügt eine eigene Schrift für Text hinzu, aus einer TrueType-, OpenType- oder WOFF-Datei; sie bleibt im Browser, ein Entwurf behält nur die benutzten Buchstaben |
| `layerling_list_fonts` | listet die mitgelieferten und die eigenen Schriften, mit Id und Name |
| `layerling_import_mesh` | bringt ein Dreiecksnetz in den Entwurf |
| `layerling_update_object` | ändert Maße, Lage, Farbe, Name, Körper oder Aussparung und alles, was die Form sonst ausmacht, bei einem Text auch die Buchstabenkante |
| `layerling_align_objects` | richtet Objekte aneinander aus |
| `layerling_scale_objects` | skaliert Objekte um einen Prozentwert, zusammen oder jedes für sich |
| `layerling_lay_flat` | legt ein Objekt mit einer Fläche auf die Platte |
| `layerling_place_on_face` | setzt Objekte auf eine Fläche eines anderen, auch schräg, wie die Taste C |
| `layerling_perforate_face` | schneidet ein Lochmuster in eine ebene Fläche, die Löcher bleiben als Aussparungen mit dem Körper gruppiert |
| `layerling_sweep_sketch` | zieht einen rechteckigen oder runden Querschnitt entlang eines Pfades aus Punkten als einen exakten Körper; ein geschlossener Pfad ergibt einen Ring |
| `layerling_push_face` | zieht eine ebene Fläche heraus oder schneidet eine Tasche hinein, mit Rand zur Kante und Eckenradius; das neue Teil ist ein Skizzenkörper, mit dem Körper gruppiert, oder mit `separate` ein freier eigener Körper |
| `layerling_mate_faces` | legt eine Fläche eines Objekts an die Fläche eines anderen, gegeneinander oder bündig, oder bringt zwei runde Flächen auf eine Achse |
| `layerling_open_group` | öffnet eine Gruppe, damit ihre Teile einzeln änderbar sind, auch eine Gruppe in einer geöffneten |
| `layerling_close_group` | schließt sie wieder („Fertig“) oder bricht ab |
| `layerling_group_objects` | gruppiert Objekte |
| `layerling_ungroup_objects` | löst Gruppen auf |
| `layerling_boolean_cut` | schneidet Körper mit Aussparungen |
| `layerling_intersect_objects` | behält nur, was die Objekte gemeinsam haben (Schnittmenge) |
| `layerling_hull_objects` | hüllt die Objekte in einen konvexen Körper, wie in Schrumpffolie (Hülle) |
| `layerling_cookie_cutter` | baut aus den Objekten eine Ausstechform: Wand mit Schneidkante und Rand um den gespiegelten Umriss (Ausstechform) |
| `layerling_flexi_joints` | teilt einen flachen Körper in Glieder mit mitgedruckten Gelenken, die zur Seite schwenken (Flexi-Gelenke) |
| `layerling_loft_sketches` | verbindet zwei Skizzenkörper zu einem Übergang von einem Umriss zum anderen (Übergang aus Skizzen) |
| `layerling_separate_parts` | zerlegt eine Form mit losen Teilen, einen Skizzenkörper in einen Körper je Umriss |
| `layerling_split_objects` | teilt Körper oder Aussparungen mit einer Ebene in zwei |
| `layerling_list_edges` | listet die echten CAD-Kanten eines Objekts |
| `layerling_apply_edge_treatment` | fast oder verrundet ausgewählte Kanten |
| `layerling_hollow_object` | höhlt einen Körper mit gleichmäßiger Wand aus |
| `layerling_cut_out` | schneidet einen Körper aus einem anderen aus, damit beide passen: das Teil bleibt, eine um das Spiel vergrößerte Kopie wird vom anderen Körper abgezogen |
| `layerling_offset_object` | versetzt alle Flächen eines Körpers, für das Spiel einer Passung: vergrößert oder verkleinert ihn, oder legt die vergrößerte Kopie als Loch an |
| `layerling_list_faces` | listet die Flächen eines exakten Körpers |
| `layerling_delete_faces` | löscht Flächen und schließt die Lücke |
| `layerling_array_objects` | vervielfältigt in einer Reihe oder auf einem Kreis |
| `layerling_bundle_objects` | bündelt Objekte wie Strg+B: sie bewegen sich zusammen, behalten Farbe und Art und gehen einzeln in den Export |
| `layerling_layer_text` | macht aus einem Text einen Stapel aus Schichten für den Mehrfarbdruck (Buchstaben, breitere Ränder, Platte ohne Löcher) oder baut einen Stapel neu, mit Loch für den Schlüsselring, Ecken je Schicht und gerundeter oder abgeschrägter Buchstabenkante; mit einer Namensliste ein Schild je Name |
| `layerling_layer_icon` | macht aus einem SVG-Symbol (dem Text der Datei oder einem extrudierten Skizzenkörper) ein Symbolschild in Schichten für den Mehrfarbdruck - Symbol, breitere Ränder, Platte ohne Löcher - oder baut eines mit neuer Breite oder neuen Schichten neu; mit einer Anzahl füllt es die Platte mit Kopien |
| `layerling_create_qr_code` | erzeugt aus einem Text oder einer Webadresse einen QR-Code wie {{ui:shape.qrCode}} in der Formenbibliothek - den Code allein, erhaben auf einer Platte oder graviert, mit Fehlerkorrektur, Breite, Höhe, Ruhezone und auf Wunsch als Aussparung; warnt, wenn ein Modul unter 0,8 mm kommt |
| `layerling_reference_image` | legt ein Referenzbild aus einem Bild an wie {{ui:import.referenceImage}} oder verschiebt, dreht, kalibriert (zwei Punkte des Bildes und ihr wirklicher Abstand), blendet oder sperrt eines - eine Hilfe, die nie exportiert oder gedruckt wird |
| `layerling_measure_section` | misst auf einer Schnittebene zwischen zwei Punkten, die am Umriss einrasten – Wandstärken, Spalte, Passungen |
| `layerling_show_overhangs` | schaltet die Überhang-Schraffur ein oder aus, setzt den Winkel und nennt je Körper die Fläche, die Stützen bräuchte |
| `layerling_estimate_print` | schätzt Volumen, Gewicht und Filament für die Auswahl oder den ganzen Entwurf: für einen massiven Körper und als grobe Schätzung mit Wänden und Füllung wie im Exportfenster |
| `layerling_add_reference_points` | setzt Bezugspunkte - auf Mitte, Ecken oder Kantenmitten von Objekten oder an genauen Stellen -, an denen Formen einrasten |
| `layerling_list_reference_points` | listet die Bezugspunkte mit Kennung und Lage auf |
| `layerling_remove_reference_points` | löscht Bezugspunkte nach Kennung oder alle |
| `layerling_inspect_errors` | zeigt die letzte Meldung und den letzten Fehler, dazu die Meldungen und Fehler der Sitzung |
| `layerling_wrap_around_cylinder` | wickelt einen flach liegenden Körper, etwa ein SVG oder Text, um einen Zylinder, nach außen oder als Gravur nach innen |
| `layerling_texture_surface` | bringt eine Oberfläche auf einen Körper: Rillen, Rändel, Waben oder Noppen, für besseren Halt oder fürs Auge, und ändert oder entfernt sie später |
| `layerling_simplify_mesh` | verringert die Dreieckszahl eines importierten Netzes, auf einen Anteil in Prozent oder auf eine Anzahl Dreiecke |
| `layerling_save_custom_shape` | legt Körper als eigene Form ab, auf dem Server oder im Browser, um sie in andere Entwürfe einzusetzen |
| `layerling_list_custom_shapes` | listet die eigenen Formen auf dem Server und im Browser |
| `layerling_insert_custom_shape` | setzt eine eigene Form in den offenen Entwurf, wahlweise an eine Stelle x/z |
| `layerling_delete_custom_shape` | entfernt eine eigene Form; eingesetzte Körper bleiben |
| `layerling_show_workplane` | blendet die Platte mit ihrem Gitter aus und wieder ein, etwa für ein Bild der Unterseite (nur die Ansicht) |
| `layerling_set_section_view` | schneidet die Ansicht entlang einer Ebene auf, um ins Innere zu sehen (nur die Ansicht, nichts wird zerteilt) |
| `layerling_measurements` | blendet die Messungen des Maßbands ein oder aus und listet sie mit ihren Längen auf; dazu die Maße um die Auswahl, wie [[Q]] |
| `layerling_saved_view` | speichert die aktuelle Ansicht unter der Taste 7, 8, 9 oder 0 und holt sie zurück, wie Umschalt+Taste und die Taste (nur die Ansicht); setzt auch die Startansicht neuer Entwürfe |
| `layerling_clear_history` | löscht jeden Rückgängig-Schritt endgültig, wie der Knopf „Verlauf löschen“ im Verlaufsblick; verlangt `confirm: true` |
| `layerling_set_history_view` | schaut auf einen früheren Stand des Projekts zurück, wie die Verlaufsansicht (der echte Entwurf bleibt unberührt; ändernde Werkzeuge warten, bis sie geschlossen ist) |
| `layerling_restore_from_history` | holt Objekte (auch Teile in Gruppen) aus einem früheren Stand als Kopien in den Entwurf zurück, wie „In den Entwurf holen“ in der Verlaufsansicht - ein Schritt, den Rückgängig zurücknimmt |
| `layerling_export_section_svg` | liefert die Umrisse auf einer Schnittebene als SVG im Maßstab 1:1, aus denselben Körpern wie der Export |
| `layerling_export_drawing` | macht die Werkstattzeichnung des Exports „2D“: drei Ansichten im Maßstab 1:1 auf einem ISO-Blatt mit Gesamtmaßen und einer Tabelle der runden Bohrungen, als SVG-Text oder PDF |
| `layerling_export_mesh` | schreibt die Datei des Exportfensters als STL, 3MF, OBJ, SVG (Draufsicht, Aufstandsfläche oder sichtbare Kanten) oder DXF für den Laserschnitt, aus denselben Körpern; an einen Pfad auf diesem Rechner oder als Base64 |
| `layerling_save_project` | speichert den ganzen bearbeitbaren Entwurf als .lyl-Datei an einem Pfad auf dem Rechner, auf dem der MCP-Server läuft, ohne Dialog; eine vorhandene Datei wird nur mit `overwrite` ersetzt, geschrieben wird über eine temporäre Datei, und das Ziel von Strg+S im Editor bleibt, wie es war |
| `layerling_list_attachments` | listet die an den Entwurf angehängten Dateien (Name, Art, Größe), wie das Fenster Anhänge sie zeigt |
| `layerling_get_attachment` | liest eine angehängte Datei, ihre Bytes als base64, wie Herunterladen im Fenster |
| `layerling_add_attachment` | hängt eine als base64 übergebene Datei an, mit den Prüfungen des Fensters; ein schon vorhandener Name wird nur mit `replace` überschrieben |
| `layerling_rename_attachment` | gibt einer angehängten Datei einen anderen Namen; der Inhalt bleibt |
| `layerling_remove_attachment` | entfernt eine angehängte Datei endgültig; braucht `confirm: true` |
| `layerling_set_workplane` | legt die Arbeitsebene auf eine Seite eines Körpers, setzt sie auf die Grundplatte zurück oder blendet sie aus und ein |
| `layerling_capture_image` | nimmt ein Bild der Ansicht auf, von vorn, oben, seitlich, schräg von einer Ecke und mehr |

Die KI kann sich damit selbst kontrollieren: Sie legt etwas an, macht ein Bild, sieht nach und verbessert.

## Ein Beispiel

Du sagst: „Baue mir eine runde Dose mit 60 mm Durchmesser, 40 mm Höhe und 2,5 mm Wand, oben offen, dazu einen flachen Deckel, auf dem ‚Tee‘ im Bogen steht.“ Die KI legt Zylinder an, höhlt einen aus, setzt den gebogenen Text auf den Deckel und nimmt zum Schluss Bilder auf, damit sie sieht, ob es passt.

> **Tipp:** Gib der KI konkrete Maße und sag ihr, wofür das Teil gedacht ist („Halter für eine 12-mm-Stange, passt auf ein Bambu Lab A1“). Dann trifft sie sinnvollere Entscheidungen. Und schau ihr beim Bauen zu: Du kannst jederzeit selbst eingreifen, denn es ist derselbe Editor.
