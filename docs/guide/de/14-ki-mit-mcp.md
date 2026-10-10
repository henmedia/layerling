---
title: Mit einer KI bauen (MCP)
summary: Wie ein KI-Assistent wie Claude oder Codex in deinem geöffneten Editor Formen anlegt, ändert, gruppiert und Bilder der Ansicht aufnimmt.
---

layerling bringt einen MCP-Server mit. MCP ist ein Standard, über den ein KI-Assistent Werkzeuge in anderen Programmen benutzen kann. Damit sieht ein KI-Client wie Claude oder Codex einen offenen Editor-Tab und arbeitet darin: Er legt Formen an, ändert Maße, gruppiert, schneidet, rundet Kanten, liest die Szene aus und nimmt Bilder der Ansicht auf. Du beschreibst das Teil, die KI baut es, du siehst zu und greifst jederzeit ein.

Die Brücke zwischen KI-Client und Editor läuft **lokal auf deinem Rechner**. Bedenke aber: Was die KI liest, also die Szene und die Bilder der Ansicht, geht an den Anbieter deines KI-Clients, so wie jede andere Eingabe dort auch.

> **Wichtig:** Die MCP-Brücke gibt es im Entwicklungsserver, den du selbst auf deinem Rechner startest. Auf layerling.com und in Installationen mit statischem Hosting ist sie abgeschaltet. Eine Kopie, die du selbst betreibst, etwa das Docker-Image auf einer NAS, kann sie mit einem Zugriffsschlüssel einschalten; siehe „Eine Kopie auf NAS oder Server“ unten.

## Einrichten

1. Lade layerling von [GitHub](https://github.com/henmedia/layerling) und starte es im Projektordner mit `npm run dev`. Node.js muss installiert sein. Unter Windows erledigt das die Schnellstart-Zeile in der README.
2. Öffne einen Editor-Tab, zum Beispiel `http://127.0.0.1:3000/?editor=1`.
3. Verbinde deinen KI-Client mit dem MCP-Server. Er wird vom Client selbst mit `node scripts/layerling-mcp-server.mjs` gestartet.

### Claude Code

Nichts zu installieren: Das Projekt bringt eine `.mcp.json` mit, die den Server einträgt, und den Skill unter `.claude/skills/layerling-mcp-skill`. Öffne den layerling-Ordner in Claude Code und bitte zum Beispiel: „Nutze die layerling-MCP-Werkzeuge, liste meine offenen Editoren auf und sieh dir die Szene an.“

### Claude Desktop

Claude Desktop liest keine Projektdateien. Trage den Server in seiner eigenen Konfiguration ein. Als Vorlage dient `docs/mcp/claude-desktop-config.example.json` im Projekt, in der du den Skriptpfad durch den absoluten Pfad auf deinem Rechner ersetzt. Danach Claude Desktop neu starten.

### Codex

Kopiere den Skill aus `docs/skills/layerling-mcp-skill` in deinen Codex-Skill-Ordner, trage den Server anhand von `docs/mcp/codex-config.example.toml` in deine Codex-Konfiguration ein und starte Codex neu.

Die ausführliche Anleitung für alle drei steht in der [README auf GitHub](https://github.com/henmedia/layerling/blob/main/README.de.md#layerling-mcp-skill).

## Eine Kopie auf NAS oder Server

Eine Kopie, die du selbst betreibst, kann einen KI-Client ihre offenen Editoren übers Netz steuern lassen. Das ist standardmäßig aus, denn wer die Brücke steuern kann, kann die offenen Entwürfe lesen und ändern. Setze auf dem Server `LAYERLING_MCP_REMOTE` auf `true` und `LAYERLING_MCP_TOKEN` auf ein Geheimnis von mindestens 16 Zeichen (beim Docker-Image unter `environment:` der Compose-Datei; ein Neubau ist nicht nötig). Öffne einen Editor-Tab dieser Kopie und lass ihn offen, und gib dem MCP-Client die Adresse und denselben Schlüssel: `LAYERLING_URL=http://nas:3000` und `LAYERLING_MCP_TOKEN=<der Schlüssel>`.

Nur ein Client mit dem Schlüssel kann die Editoren auflisten oder steuern. Die Editor-Seiten brauchen keinen, zählen aber nur unter einer Adresse oder einem Namen, den nur dein eigenes Netz benutzen kann (eine IP-Adresse, ein Name ohne Punkt oder einer auf `.local` oder `.lan`); eine echte Domain hinter einem Reverse-Proxy kommt in `LAYERLING_MCP_ALLOWED_HOSTS`. Nutze es in einem Netz, dem du vertraust, und HTTPS darüber hinaus. Die Einzelheiten stehen in der README.

## Was die KI kann

Die KI arbeitet mit denselben Funktionen wie du, sie läuft über denselben Weg wie deine Bedienung im Editor. Neue Funktionen von layerling bekommen ihre MCP-Aktion gleich mit. Die Werkzeuge:

| Werkzeug | Was es tut |
| --- | --- |
| `layerling_list_editors` | listet die offenen Editor-Tabs auf |
| `layerling_read_scene` | liest Szene, Auswahl, Einheiten und die genauen Maße aller Objekte |
| `layerling_list_objects` | listet alle Objekte mit Maßen, Lage, Drehung und Kennung |
| `layerling_select_objects` | wählt Objekte aus |
| `layerling_delete_objects` | löscht Objekte |
| `layerling_create_shape` | legt eine Form an: Quader, Zylinder, Text (auch gebogen), Gewinde, Zahnrad, Skizzenkörper und alle anderen |
| `layerling_import_file` | importiert eine Datei wie das Importfenster, eine farbige OBJ oder 3MF als ein Körper je Farbe, eine 3MF mit mehreren Objekten als ein Körper je Objekt |
| `layerling_add_font` | fügt eine eigene Schrift für Text hinzu, aus einer TrueType-, OpenType- oder WOFF-Datei; sie bleibt im Browser, ein Entwurf behält nur die benutzten Buchstaben |
| `layerling_list_fonts` | listet die mitgelieferten und die eigenen Schriften, mit Id und Name |
| `layerling_import_mesh` | bringt ein Dreiecksnetz in den Entwurf |
| `layerling_update_object` | ändert Maße, Lage, Farbe, Name, Körper oder Aussparung und alles, was die Form sonst ausmacht |
| `layerling_align_objects` | richtet Objekte aneinander aus |
| `layerling_scale_objects` | skaliert Objekte um einen Prozentwert, zusammen oder jedes für sich |
| `layerling_lay_flat` | legt ein Objekt mit einer Fläche auf die Platte |
| `layerling_place_on_face` | setzt Objekte auf eine Fläche eines anderen, auch schräg, wie die Taste C |
| `layerling_mate_faces` | legt eine Fläche eines Objekts an die Fläche eines anderen, gegeneinander oder bündig |
| `layerling_open_group` | öffnet eine Gruppe, damit ihre Teile einzeln änderbar sind, auch eine Gruppe in einer geöffneten |
| `layerling_close_group` | schließt sie wieder („Fertig“) oder bricht ab |
| `layerling_group_objects` | gruppiert Objekte |
| `layerling_ungroup_objects` | löst Gruppen auf |
| `layerling_boolean_cut` | schneidet Körper mit Aussparungen |
| `layerling_intersect_objects` | behält nur, was die Objekte gemeinsam haben (Schnittmenge) |
| `layerling_separate_parts` | zerlegt eine Form mit losen Teilen |
| `layerling_split_objects` | teilt Körper oder Aussparungen mit einer Ebene in zwei |
| `layerling_list_edges` | listet die echten CAD-Kanten eines Objekts |
| `layerling_apply_edge_treatment` | fast oder verrundet ausgewählte Kanten |
| `layerling_hollow_object` | höhlt einen Körper mit gleichmäßiger Wand aus |
| `layerling_array_objects` | vervielfältigt in einer Reihe oder auf einem Kreis |
| `layerling_bundle_objects` | bündelt Objekte wie Strg+B: sie bewegen sich zusammen, behalten Farbe und Art und gehen einzeln in den Export |
| `layerling_layer_text` | macht aus einem Text einen Stapel aus Schichten für den Mehrfarbdruck (Buchstaben, breitere Ränder, Platte ohne Löcher) oder baut einen Stapel neu, mit Loch für den Schlüsselring; mit einer Namensliste ein Schild je Name |
| `layerling_measure_section` | misst auf einer Schnittebene zwischen zwei Punkten, die am Umriss einrasten – Wandstärken, Spalte, Passungen |
| `layerling_show_overhangs` | schaltet die Überhang-Schraffur ein oder aus, setzt den Winkel und nennt je Körper die Fläche, die Stützen bräuchte |
| `layerling_estimate_print` | schätzt Volumen, Gewicht und Filament für die Auswahl oder den ganzen Entwurf, massiv gerechnet wie im Exportfenster |
| `layerling_add_reference_points` | setzt Bezugspunkte - auf Mitte, Ecken oder Kantenmitten von Objekten oder an genauen Stellen -, an denen Formen einrasten |
| `layerling_list_reference_points` | listet die Bezugspunkte mit Kennung und Lage auf |
| `layerling_remove_reference_points` | löscht Bezugspunkte nach Kennung oder alle |
| `layerling_inspect_errors` | zeigt die letzte Meldung und den letzten Fehler, dazu die Meldungen und Fehler der Sitzung |
| `layerling_wrap_around_cylinder` | wickelt einen flach liegenden Körper, etwa ein SVG oder Text, um einen Zylinder, nach außen oder als Gravur nach innen |
| `layerling_simplify_mesh` | verringert die Dreieckszahl eines importierten Netzes, auf einen Anteil in Prozent oder auf eine Anzahl Dreiecke |
| `layerling_save_custom_shape` | legt Körper als eigene Form ab, auf dem Server oder im Browser, um sie in andere Entwürfe einzusetzen |
| `layerling_list_custom_shapes` | listet die eigenen Formen auf dem Server und im Browser |
| `layerling_insert_custom_shape` | setzt eine eigene Form in den offenen Entwurf, wahlweise an eine Stelle x/z |
| `layerling_delete_custom_shape` | entfernt eine eigene Form; eingesetzte Körper bleiben |
| `layerling_show_workplane` | blendet die Platte mit ihrem Gitter aus und wieder ein, etwa für ein Bild der Unterseite (nur die Ansicht) |
| `layerling_set_section_view` | schneidet die Ansicht entlang einer Ebene auf, um ins Innere zu sehen (nur die Ansicht, nichts wird zerteilt) |
| `layerling_set_history_view` | schaut auf einen früheren Stand des Projekts zurück, wie die Verlaufsansicht (der echte Entwurf bleibt unberührt; ändernde Werkzeuge warten, bis sie geschlossen ist) |
| `layerling_export_section_svg` | liefert die Umrisse auf einer Schnittebene als SVG im Maßstab 1:1, aus denselben Körpern wie der Export |
| `layerling_set_workplane` | legt die Arbeitsebene auf eine Seite eines Körpers, setzt sie auf die Grundplatte zurück oder blendet sie aus und ein |
| `layerling_capture_image` | nimmt ein Bild der Ansicht auf, von vorn, oben, seitlich, schräg von einer Ecke und mehr |

Die KI kann sich damit selbst kontrollieren: Sie legt etwas an, macht ein Bild, sieht nach und verbessert.

## Ein Beispiel

Du sagst: „Baue mir eine runde Dose mit 60 mm Durchmesser, 40 mm Höhe und 2,5 mm Wand, oben offen, dazu einen flachen Deckel, auf dem ‚Tee‘ im Bogen steht.“ Die KI legt Zylinder an, höhlt einen aus, setzt den gebogenen Text auf den Deckel und nimmt zum Schluss Bilder auf, damit sie sieht, ob es passt.

> **Tipp:** Gib der KI konkrete Maße und sag ihr, wofür das Teil gedacht ist („Halter für eine 12-mm-Stange, passt auf ein Bambu Lab A1“). Dann trifft sie sinnvollere Entscheidungen. Und schau ihr beim Bauen zu: Du kannst jederzeit selbst eingreifen, denn es ist derselbe Editor.
