# Mitmachen

*[English](CONTRIBUTING.md) · **Deutsch***

Danke, dass du layerling besser machen willst.

## Lokal einrichten

```bash
npm install
npm run dev
```

Die App läuft standardmäßig unter `http://127.0.0.1:3000/`.

## Bevor du einen Pull Request öffnest

- Halte Änderungen auf ein Thema begrenzt.
- Vermeide Umbauten, die nichts damit zu tun haben.
- Führe `npm run typecheck` und `npm test` (die Unit-Tests) aus. Die CI prüft beides, danach `npm run test:e2e`, den
  Produktions-Build und den statischen Export, und schlägt fehl, wenn ein Build-Schritt eine eingecheckte Datei geändert hat.
- Texte der Oberfläche oder der Anleitung geändert: Führe `npm run guide` und `npm run i18n:status` aus. Eine Farbe in
  `globals.css` geändert: Führe `npm run theme:graphite` aus (ein Test schlägt fehl, solange das Graphit-Design veraltet ist).
- Teste den Editor-Ablauf, den du geändert hast, von Hand.
- Füge bei Änderungen an der Oberfläche nach Möglichkeit Bildschirmfotos oder kurze Aufnahmen bei.
- Weise auf Änderungen an Speicherung, Import, Export, Gruppierung oder Rückgängig/Wiederholen ausdrücklich hin.

## Editor-Profile für Werkzeuge

Jedes neue Werkzeug und jede neue Werkzeugoption muss sich einzeln über das versionierte
[Editor-Profil](../README.md#editor-profiles) konfigurieren lassen. Bestehende Werkzeuge können
diese Regeln nach und nach übernehmen.

- Gib jedem Werkzeug eine stabile ID. Seine Bedienelemente sollen sich per Profil einzeln ein-
  und ausblenden lassen. Für sichtbare Werkzeuge gelten weiterhin die üblichen Voraussetzungen,
  etwa eine passende Auswahl.
- Gib jeder Option im Werkzeugdialog eine stabile ID unter ihrem Werkzeug. Die Option soll sich
  ausblenden lassen. Hat sie einen Wert, soll sich ein typgeprüfter Startwert vorgeben lassen.
  Prüfe Profilwerte nach denselben Regeln wie Eingaben im Werkzeug.
- Dokumentiere, wie Profilvorgaben mit gemerkten Einstellungen zusammenspielen. Lässt sich
  eine Option sperren, braucht die Sperre einen ausdrücklich gesetzten gültigen Wert und hat
  Vorrang vor der gemerkten Einstellung.
- Wenn das Profil ein Werkzeug oder eine Option auslässt, bleibt das bisherige Verhalten erhalten.
  Teste den normalen Ablauf ohne Profil, die Profilvorgabe und gegebenenfalls das Zusammenspiel
  mit gemerkten Einstellungen.

Als Vorlage dienen [Abrunden im Beispielprofil](../docs/examples/editor-profile.json) und die
[Profil-Tests](../tests/unit/editorProfile.test.ts).

## Bereiche, die Sorgfalt verlangen

- STL-Import und -Export
- Transformationen importierter Netze
- Gruppieren, Abziehen von Löchern und Auflösen
- Rückgängig-Verlauf
- Projektspeicherung und Vorschaubilder im Dashboard
- Anfasser an Formen, Einrasten und Maße gedrehter Objekte

## Stil

- Nutze vorhandene Muster des Projekts, bevor du neue Abstraktionen einführst.
- Halte Verhalten der Oberfläche in der zuständigen Komponente, solange es nicht geteilt wird.
- Verwende TypeScript-Typen statt lose geformter Objekte, wo es sinnvoll ist.
- Halte Kommentare kurz und nützlich.

## Lizenz für Beiträge

Sofern nicht ausdrücklich schriftlich anders vereinbart, lizenzierst du deinen Beitrag mit dem Einreichen unter der GNU Affero General Public License v3.0 only (`AGPL-3.0-only`). Siehe [LICENSE](../LICENSE).
