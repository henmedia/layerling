---
title: Tablet und Touch
summary: Arbeiten mit Fingern oder Stift: mehrere Körper wählen, die Ansicht drehen und zoomen, das Menü des langen Drucks und was auf dem iPad zu wissen ist.
---

## Finger und Stift

layerling läuft im Browser eines Tablets und als App vom Startbildschirm. Ein Finger tut, was die linke Maustaste tut. Für drei Dinge, die ein Tablet nicht hat, nämlich eine rechte Maustaste, eine Umschalttaste und ein Rad, gibt es eigene Wege:

| Du willst | Auf dem Tablet |
| --- | --- |
| Einen Körper wählen | Auf ihn tippen. |
| Mehrere Körper wählen | Einen Körper antippen: Unten links erscheint ein runder Knopf. Tippe ihn an, dann kommt jeder weitere angetippte Körper zur Auswahl dazu, und ein Tipp auf einen gewählten Körper nimmt ihn wieder heraus. Ein Tipp auf die leere Fläche ändert daran nichts; ein zweiter Tipp auf den Knopf beendet es und hebt die Auswahl auf. Oder einen Finger eine halbe Sekunde ruhig halten, {{ui:contextMenu.selectMultiple}} wählen, dann einen Körper nach dem anderen antippen. |
| Alle Körper wählen | Einen Finger eine halbe Sekunde ruhig auf die leere Fläche halten, {{ui:contextMenu.selectAll}} wählen. |
| Das Menü eines Rechtsklicks öffnen | Einen Finger eine halbe Sekunde ruhig auf einen Körper oder die leere Fläche halten. |
| Einen Körper verschieben | Ihn ziehen. |
| Einen Körper skalieren, drehen oder heben | An seinen Griffen ziehen, den kleinen Quadraten und Pfeilen um ihn. Ein Finger fasst sie auch ein Stück daneben. |
| Die Ansicht drehen | Ein Finger auf der leeren Fläche oder am Ansichtswürfel ziehen. |
| Die Ansicht zoomen | Zwei Finger: auseinanderziehen kommt näher, zusammenziehen geht weg. |
| Die Ansicht verschieben | Zwei Finger gemeinsam schieben. |
| Die Auswahl aufheben | Auf die leere Fläche tippen. Nicht, solange {{ui:camera.touchRotate}} an ist, denn dann dreht ein Finger die Ansicht; und in {{ui:contextMenu.selectMultiple}} beendet der erste Tipp auf die leere Fläche nur den Modus und lässt die Auswahl stehen, erst der nächste hebt sie auf. |

## Mehrere Körper wählen

Ohne Umschalttaste tut {{ui:contextMenu.selectMultiple}} im Menü des langen Drucks, was am Rechner Umschalt+Klick tut. Solange es an ist, sagt eine Meldung es, und jedes Tippen auf einen Körper nimmt ihn zur Auswahl dazu oder wieder heraus. Ein Tipp auf die leere Fläche, an einer Tastatur [[Esc]], beendet es und lässt die Auswahl, wie sie ist. Ein Finger auf der leeren Fläche dreht währenddessen weiter die Ansicht. Dann wirken {{ui:editor.tool.group}}, {{ui:editor.tool.align}} oder ein Verschieben auf alle gewählten Körper.

Im selben Menü steht {{ui:contextMenu.carry}}, die Taste [[C]] für den Touchscreen. Die Auswahl folgt dann dem Finger über die Flächen anderer Körper; ein Tipp setzt sie auf die Fläche ab, die du antippst, auch auf eine schräge, und schon der erste Tipp genügt. Den Eintrag findest du auch in der Befehlssuche mit „absetzen“ oder „cruise“ ([[Strg]]+[[K]] an einer Tastatur).

## Ansicht drehen und zoomen

Ein Finger auf der leeren Fläche dreht die Ansicht, zwei Finger zoomen und verschieben sie. Ein Finger, der auf einem Körper beginnt, arbeitet am Körper, nicht an der Ansicht. Soll er lieber die Ansicht drehen, schalte {{ui:camera.touchRotate}} in der Ansichtsleiste ein: Ein Finger dreht dann die Ansicht statt zu wählen, wo er auch beginnt. Der Schalter erscheint nur auf einem Gerät mit Touchscreen.

Der Ansichtswürfel oben links dreht die Ansicht, wenn du ihn ziehst, und ein Tipp auf eine seiner Seiten, Ecken oder Kanten springt in diese Ansicht. Siehe [Ansicht und Arbeitsebene](chapter:ansicht-und-arbeitsebene).

## Griffe, kleine Punkte und ein Stift

Eine Fingerspitze verdeckt, worauf sie zielt. layerling lässt einen Finger an Griffe, Punkte, Linien und Kanten etwas weiter heranreichen als einen Mauszeiger, aber ein Stift ist feiner. Das gilt für einen Stift, den das Tablet als Stift kennt, etwa einen Apple Pencil oder einen S Pen. Ein einfacher Stift mit Gummispitze gilt für den Bildschirm als Finger und ist nicht feiner als einer, arbeite damit also wie mit dem Finger. Schwebt ein Apple Pencil auf dem iPad über einem Knopf, erscheint nach einem Moment sein Name in einer kleinen Blase, wie bei der Maus der Tooltip.

Wenn Körper verrutschen, weil Kinder oder eilige Hände sie berühren, schalte in den Einstellungen {{ui:workspace.selectBeforeMoving}} ein: Ein Körper muss dann erst gewählt sein, und erst der nächste Zug verschiebt ihn.

## Auf einem iPad oder iPhone

- **Als App installieren.** Tippe in Safari auf das Teilen-Symbol und wähle „Zum Home-Bildschirm“. Die App öffnet sich in einem eigenen Fenster ohne Adressleiste und läuft auch ohne Verbindung, siehe [Offline und installieren](chapter:offline-und-installieren).
- **Deine Entwürfe liegen im Browser** (außer du betreibst layerling selbst und richtest einen Serverordner ein). Es gibt kein Konto, und nichts wird hochgeladen. Safari hat eine eigene Regel gegen Tracking: Es löscht, was eine Website gespeichert hat, wenn du sie sieben Tage lang nicht in Safari besucht hast. Eine Web-App auf dem Home-Bildschirm ist von dieser Regel ausgenommen, so beschreibt es WebKit. Das ist ein Grund mehr, die App vom Home-Bildschirm zu benutzen und wichtige Arbeiten zu sichern: {{ui:dashboard.backupAll}} auf der Startseite packt alle Entwürfe in eine Datei.
- **Dateien.** Safari lässt eine Seite nur über einen Download in eine Datei schreiben, daher legt {{ui:editor.export}} die Datei in die Downloads der Dateien-App, und [[Strg]]+[[S]] an einer Tastatur lädt sie noch einmal herunter; siehe [Dateien und Speichern](chapter:dateien-und-speichern).
- **Keine Tastatur nötig.** Jedes Werkzeug hat einen Knopf im Menüband, und ein Zahlenfeld öffnet die Bildschirmtastatur. Eine Tastatur am iPad bringt die [Tastenkürzel](chapter:tastenkuerzel) dazu. Ein Wertekästchen neben einem Körper öffnet sein Zahlenfeld erst mit dem zweiten Tipp: Der erste markiert es nur, so holt ein Finger, der versehentlich darauf landet, die Tastatur nicht hoch.

## Werkstätten mit Kindern

Finger und Gummistifte funktionieren hier gleich. Zwei Einstellungen machen eine Gruppe leichter: {{ui:workspace.selectBeforeMoving}}, damit eine Berührung keinen Körper aus Versehen verschiebt, und {{ui:camera.touchRotate}}, damit ein Finger immer die Ansicht dreht. Der Fragezeichen-Knopf in der Gruppe Hilfe des Menübands schaltet die {{ui:interactiveHelp.title}} ein: Ein Tipp auf einen beliebigen Knopf, ein Feld oder einen Griff erklärt ihn dann, und derselbe Knopf oder [[Esc]] beendet sie.

Für eine ganze Klasse schaltest Du in den Einstellungen {{ui:workspace.simpleMode}} ein. Die Leiste behält dann nur die Werkzeuge einer Werkstatt (Kopieren, Einfügen, Duplizieren, Löschen, Rückgängig, Gruppieren, Spiegeln, Fase, Verrundung, Aushöhlen, Ausrichten, Exportieren), die Formenliste ist kurz, die Knöpfe sind größer, und die Startseite zeigt nur die Entwürfe: keine Neuigkeiten, kein Willkommenstext, keine Hilfeknöpfe und keine Verweise aus layerling hinaus. Einschalten ist ein Tippen; ausschalten geht nur mit einem Druck von zwei Sekunden auf den Knopf, der dann an seine Stelle tritt. Ein Link mit `?mode=simple` am Ende schaltet den Modus auf dem Gerät ein, das ihn öffnet, `?mode=full` schaltet ihn wieder aus. Wer layerling auf einem Server betreibt, startet alle damit über `LAYERLING_SIMPLE_MODE=true` oder legt ihn mit `always` für alle fest, dann hat das Programm keinen Schalter zum Verlassen; siehe README.
