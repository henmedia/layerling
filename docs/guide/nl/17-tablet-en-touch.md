---
title: Tablet en touch
summary: Werken met vingers of een stylus: meerdere lichamen selecteren, het beeld draaien en zoomen, het menu van een lange druk en wat je op een iPad moet weten.
---

## Vingers en een stylus

layerling draait in de browser van een tablet en als app vanaf het beginscherm. Een vinger doet wat de linkermuisknop doet. Voor drie dingen die een tablet niet heeft, een rechtermuisknop, een Shift-toets en een wiel, zijn er eigen wegen:

| Je wilt | Op een tablet |
| --- | --- |
| Een lichaam selecteren | Erop tikken. |
| Meerdere lichamen selecteren | Houd een vinger een halve seconde stil, kies {{ui:contextMenu.selectMultiple}} en tik dan het ene lichaam na het andere aan. Een tik op een geselecteerd lichaam haalt het er weer uit. |
| Alle lichamen selecteren | Houd een vinger een halve seconde stil op de lege ruimte en kies {{ui:contextMenu.selectAll}}. |
| Het menu van een rechtsklik openen | Houd een vinger een halve seconde stil op een lichaam of op de lege ruimte. |
| Een lichaam verplaatsen | Het slepen. |
| Een lichaam schalen, draaien of optillen | Sleep aan de hendels, de kleine vierkantjes en pijlen eromheen. Een vinger pakt ze ook een stukje ernaast. |
| Het beeld draaien | Eén vinger op de lege ruimte, of sleep aan de beeldkubus. |
| Het beeld zoomen | Twee vingers: uit elkaar voor dichterbij, naar elkaar toe voor verder weg. |
| Het beeld verschuiven | Schuif twee vingers samen. |
| De selectie opheffen | Tik op de lege ruimte. Niet zolang {{ui:camera.touchRotate}} aan staat, want dan draait één vinger het beeld; en in {{ui:contextMenu.selectMultiple}} beëindigt de eerste tik op lege ruimte alleen de modus en laat de selectie staan, pas de volgende heft haar op. |

## Meerdere lichamen selecteren

Zonder Shift-toets doet {{ui:contextMenu.selectMultiple}} in het menu van een lange druk wat Shift+klik op een computer doet. Zolang het aan staat, zegt een melding dat, en elke tik op een lichaam voegt het toe aan de selectie of haalt het er weer uit. Een tik op de lege ruimte, of [[Esc]] op een toetsenbord, beëindigt het en laat de selectie zoals ze is. Een vinger op de lege ruimte draait intussen nog steeds het beeld. Daarna werken {{ui:editor.tool.group}}, {{ui:editor.tool.align}} of een verplaatsing op alle gekozen lichamen.

## Het beeld draaien en zoomen

Eén vinger op de lege ruimte draait het beeld, twee vingers zoomen en verschuiven het. Een vinger die op een lichaam begint, werkt aan het lichaam, niet aan het beeld. Wil je dat hij liever het beeld draait, zet dan {{ui:camera.touchRotate}} aan in de weergavebalk: één vinger draait dan het beeld in plaats van te selecteren, waar hij ook begint. Die schakelaar verschijnt alleen op een apparaat met een aanraakscherm.

De beeldkubus linksboven draait het beeld als je eraan sleept, en een tik op een van zijn zijden, hoeken of randen springt naar dat beeld. Zie [Weergave en werkvlak](chapter:weergave-en-werkvlak).

## Hendels, kleine punten en een stylus

Een vingertop bedekt waar hij op mikt. layerling laat een vinger iets verder naar hendels, punten, lijnen en randen reiken dan een muisaanwijzer, maar een stylus is fijner. Dat geldt voor een pen die de tablet als pen kent, zoals een Apple Pencil of een S Pen. Een gewone stylus met rubberen punt geldt voor het scherm als vinger en is niet fijner dan een vinger; werk er dus mee als met een vinger. Zweeft een Apple Pencil op de iPad boven een knop, dan verschijnt na een moment de naam in een klein tekstballonnetje, zoals bij de muis de tooltip.

Verschuiven lichamen doordat kinderen of haastige handen ze aanraken, zet dan in de instellingen {{ui:workspace.selectBeforeMoving}} aan: een lichaam moet dan eerst geselecteerd zijn, en pas de volgende sleep verplaatst het.

## Op een iPad of iPhone

- **Als app installeren.** Tik in Safari op het deelpictogram en kies "Zet op beginscherm". De app opent in een eigen venster zonder adresbalk en werkt ook zonder verbinding, zie [Offline en installeren](chapter:offline-en-installeren).
- **Je ontwerpen staan in de browser.** Er is geen account en er wordt niets geüpload. Safari heeft een eigen regel tegen tracking: het wist wat een website heeft opgeslagen als je haar zeven dagen niet in Safari hebt bezocht. Een web-app op het beginscherm is van die regel uitgezonderd, zoals WebKit het beschrijft. Dat is een reden te meer om de app vanaf het beginscherm te gebruiken en belangrijk werk te back-uppen: {{ui:dashboard.backupAll}} op de startpagina pakt alle ontwerpen in één bestand.
- **Bestanden.** Safari laat een pagina alleen via een download in een bestand schrijven, dus {{ui:editor.export}} zet het bestand in de Downloads van de Bestanden-app, en [[Ctrl]]+[[S]] op een toetsenbord downloadt het opnieuw; zie [Bestanden en opslaan](chapter:bestanden-en-opslaan).
- **Geen toetsenbord nodig.** Elk gereedschap heeft een knop in het lint, en een getalveld opent het schermtoetsenbord. Een toetsenbord aan de iPad voegt de [sneltoetsen](chapter:sneltoetsen) toe. Een waardevak naast een lichaam opent zijn getalveld pas bij de tweede tik: de eerste markeert het alleen, zodat een vinger die er per ongeluk op landt het toetsenbord niet omhoog haalt.

## Werkplaatsen met kinderen

Vingers en rubberen stylussen werken hier hetzelfde. Twee instellingen maken een groep makkelijker: {{ui:workspace.selectBeforeMoving}}, zodat een aanraking geen lichaam per ongeluk verschuift, en {{ui:camera.touchRotate}}, zodat één vinger altijd het beeld draait. De vraagtekenknop in de groep Help van het lint zet de {{ui:interactiveHelp.title}} aan: een tik op een willekeurige knop, een veld of een hendel legt hem dan uit, en dezelfde knop of [[Esc]] beëindigt haar.
