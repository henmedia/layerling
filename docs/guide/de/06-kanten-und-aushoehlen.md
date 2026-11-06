---
title: Kanten brechen und Körper aushöhlen
summary: Fase und Verrundung an ausgewählten Kanten, Wände gleicher Stärke für Dosen, Becher und Gehäuse.
---

## Kanten fasen und verrunden

Scharfe Kanten sehen an einem gedruckten Teil selten gut aus, und sie sind auch nicht besonders stabil. Mit einer **Fase** schneidest du die Kante schräg ab, mit einer **Verrundung** rundest du sie ab. Beides wirkt auf die Kanten, die du anklickst.

1. Wähle den Körper aus (oder die Gruppe).
2. Klicke im Menüband auf {{ui:editor.tool.fillet}} oder {{ui:editor.tool.chamfer}}, drücke [[B]] für die Verrundung oder [[Shift+B]] für die Fase, oder klicke mit der rechten Maustaste auf den Körper und wähle es im Menü.
3. Die Kanten des Körpers werden hervorgehoben. Klicke die an, die betroffen sein sollen. Ein weiterer Klick nimmt sie wieder heraus. Mit [[Umschalt]] fügst du eine einzelne Kante hinzu oder nimmst sie weg.
4. Stelle das Maß ein und bestätige mit {{ui:edge.apply}} oder [[Enter]]. Danach bleibt das Fenster mit derselben Größe auf dem neuen Körper offen, damit gleich die nächste Verrundung oder Fase folgen kann; {{ui:edge.done}}, [[Esc]] oder das Kreuz schließt es. Mit [[Umschalt]] oder [[Strg]] fügt ein Klick auf {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} oder {{ui:edge.horizontalEdges}} diese Kanten zu den gewählten hinzu, statt sie zu ersetzen.

![Das Werkzeug „Kanten verrunden“: alle scharfen Kanten sind ausgewählt, im Bild siehst du die Vorschau mit 4 mm Radius.](shot:fillet-preview)

Das Fenster steht oben rechts. Verdeckt es Kanten, die du anklicken willst, ziehst du es an seiner Titelleiste weg; dort öffnet es sich auch beim nächsten Mal, und das gilt ebenso für {{ui:editor.tool.hollow}} und {{ui:editor.tool.array}}. Ein Doppelklick auf die Titelleiste bringt es zurück.

Wählst du bei offenem Fenster eine Form aus der Formenliste, schließt es sich, ohne etwas anzuwenden, und die angeklickten Kanten sind vergessen. Der Klick setzt dann die neue Form ab, statt Kanten zu wählen.

Im Fenster findest du:

- {{ui:edge.allSharpEdges}} wählt sämtliche Kanten auf einmal, {{ui:edge.clear}} leert die Auswahl.
- **{{ui:edge.radius}}** bei der Verrundung. Bei der Fase stellst du {{ui:edge.distance}} oder {{ui:edge.angle}} ein.
- {{ui:edge.variableRadius}} (nur bei der Verrundung) lässt den Radius entlang einer Kante wachsen: an einem Ende klein, am anderen größer, dazwischen gleichmäßig, etwa wo eine senkrechte Wand auf eine schräge trifft. Klicke eine einzelne Kante an und stelle {{ui:edge.radiusStart}} und {{ui:edge.radiusEnd}} ein. Welches Ende der Anfang ist, ergibt sich daraus, wie die Kante entstanden ist; liegt der größere Radius am falschen Ende, dreht {{ui:edge.swapEnds}} ihn um. Es geht für eine Kante auf einmal, mehrere Kanten verrundest du nacheinander. {{ui:edge.editAction}} bringt beide Werte zurück.
- {{ui:edge.concave}} (nur bei der Verrundung) dreht die Verrundung um: Statt die Kante abzurunden, schneidet es eine Viertelkreis-Mulde aus ihr heraus, wie die ausgehöhlten Ecken einer Box. Die Mulde ist ein Zylinder mit dem eingestellten {{ui:edge.radius}} entlang der Kante; das geht bei jedem Winkel zwischen den Flächen, aber nur bei geraden Kanten und nicht zusammen mit {{ui:edge.variableRadius}}. {{ui:edge.editAction}} bringt sie zurück.
- {{ui:edge.sharpThreshold}} legt fest, welche Kanten überhaupt als scharf gelten. Ein Wert von 25° behandelt nur deutliche Knicke als Kante und lässt flache Übergänge in Ruhe.
- {{ui:edge.verticalEdges}} wählt die Kanten, die senkrecht stehen, etwa die Ecken eines Quaders: Eine Verrundung rundet dann alle senkrechten Ecken auf einmal.
- {{ui:edge.topEdges}} wählt nur die Kanten ganz oben am Körper. Das ist der schnelle Weg für eine Ausstechform: Umriss in der Skizze als Kontur bauen, dann die oberen Kanten fasen. Wie steil die Fase wird, stellst du mit {{ui:edge.angle}} ein; länger als die Wand dick ist, kann sie nicht werden.
- {{ui:edge.bottomEdges}} wählt nur die Kanten ganz unten am Körper, das Gegenstück zu {{ui:edge.topEdges}}. So rundest oder fasst du schnell nur den Fuß eines Teils.
- {{ui:edge.chamfillet}}, oben im Fasen-Fenster neben {{ui:editor.tool.chamfer}} gewählt, macht den druckbaren Fuß eines Teils: eine Fase an der Platte, die tangential in eine Rundung zur Wand übergeht, sodass die ersten Schichten keine Stützen brauchen und die Kante trotzdem weich endet. {{ui:edge.distance}} ist die Höhe, die der Fuß einnimmt, {{ui:edge.angle}} (15° bis 75°) die Steilheit der Fase an der Platte. Die Kanten wählst du mit {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} blendet die Kanten aus, die von deinem Blickwinkel aus hinter dem Körper liegen. Ohne den Schalter scheinen alle Kanten durch den Körper hindurch, was bei einem vielteiligen Körper verwirrt; mit ihm siehst du nur die dir zugewandten Kanten und kannst nur diese anklicken. Für die anderen drehst du die Ansicht. Eine rot gezeichnete Kante (siehe unten) bleibt immer sichtbar.
- {{ui:edge.tangentChains}}: Ein Klick wählt dann auch die Kanten, die sanft ineinander übergehen, zum Beispiel alle Kanten rund um eine Fläche mit gerundeten Ecken. Der Schalter bestimmt nur, was ein Klick auswählt: Der CAD-Kern führt eine Fase oder Rundung immer an solchen glatt anschließenden Kanten weiter. Das Werkzeugfenster sagt dir dann, an wie vielen weiteren Kanten das geschieht.
- {{ui:edge.keepSize}} hält Fase oder Rundung so groß, wie sie sind, auch wenn du den Körper später skalierst.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} oder {{ui:edge.fine}}) bestimmt, wie fein die Vorschau gerechnet wird. Bei schwierigen Teilen ist {{ui:edge.draft}} schneller.
- Das Fenster merkt sich seine Einstellungen in diesem Browser, je eine für Fase, Verrundung und Fase mit Verrundung: Größe, Winkel, Schwelle, Vorschauqualität und die Schalter bleiben nach {{ui:edge.apply}}, nach einem Rückgängig und beim nächsten Öffnen so, wie du sie verlassen hast. Eine Größe, die der Körper nicht hergibt, weicht der aus dem Körper berechneten. Nur {{ui:edge.tangentChains}} beginnt neu: an bei der ersten Fase oder Verrundung eines Körpers, danach aus.

Während du am Maß drehst, rechnet layerling die Vorschau nach. Sie kann einen Moment brauchen. Du darfst weiter einstellen, gerechnet wird immer der zuletzt gewählte Wert.

Wenn das Maß zu groß für die Kante ist, sagt layerling das und schlägt einen kleineren Wert vor. Meist genügt es, ein bis zwei Millimeter weniger zu nehmen. An spitzen Winkeln braucht eine Verrundung mehr Platz, als der Radius vermuten lässt. Auf einem kleinen Bildschirm rollt das Werkzeugfenster von selbst nach unten, damit die Meldung zu sehen ist.

Scheitert eine Auswahl, die eben noch ging, nachdem du eine weitere Kante angeklickt hast, wird diese Kante rot und breiter gezeichnet: Sie ist die, die sich bei diesem Maß nicht zusammen mit den anderen bearbeiten lässt. Klicke sie noch einmal an, um sie herauszunehmen, oder nimm ein kleineres Maß. Klickst du weitere Kanten an, solange die Meldung steht, bleibt die erste rot. Gibt es keine frühere Auswahl, die ging - beim allerersten Klick oder nach einem größeren Maß -, werden die Kanten rot, die schon allein scheitern, oder alle, wenn nur ihr Zusammenspiel scheitert.

Bevor es aufgibt, versucht layerling es noch einmal mit den kurzen Kanten an den Enden der gewählten, höchstens doppelt so lang wie die Größe. So eine sitzt dort, wo eine frühere Fase an einer noch scharfen Wand endet: eine kurze, schräge Kante in der Ecke, und solange sie scharf bleibt, lässt sich die Ecke nicht bearbeiten. Hilft das, sind diese Kanten danach mit gewählt, und eine Meldung sagt, wie viele mitgenommen wurden. Und wo die gewählten Kanten sich in einer spitzen Innenecke treffen, wie zwei Scheiben einer Wolke, hat eine Rundung bei keiner Größe Platz: Dann rundet layerling diese Ecken zuerst, mit derselben oder einer kleineren Größe, und die Meldung sagt, wie viele und mit wie viel (bei einer Fase werden sie angefast).

Auch die Kante unter dem Mauszeiger wird breiter gezeichnet, damit du siehst, welche ein Klick wählt.

Auch eine Aussparung nimmt {{ui:editor.tool.chamfer}} und {{ui:editor.tool.fillet}} an, ebenso {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} und {{ui:editor.tool.deleteFace}}: Sie bleibt eine Aussparung und schneidet mit ihrer neuen Form. Werden die vier senkrechten Kanten einer Quader-Aussparung verrundet, entsteht eine Tasche mit runden Innenecken, und eine mit {{ui:editor.tool.offset}} vergrößerte Aussparung schneidet mit entsprechend mehr Luft. Die Kante, an der eine Aussparung auf das Teil trifft, brichst du dagegen an der fertigen Gruppe: Diese Kante gehört ihr.

### Eine Kantenbearbeitung zurücknehmen

Ein behandelter Körper lässt sich jederzeit noch einmal behandeln. Wähle ihn wieder aus und öffne das Werkzeug - Verrundung, Fase oder Aushöhlen zeigen alle die Liste: Unter {{ui:edge.featureHistory}} steht, was schon darauf liegt. {{ui:edge.revertAction}} nimmt eine einzelne Bearbeitung zurück. Achtung: Liegen neuere Bearbeitungen darüber, gehen sie mit weg, und das Fenster sagt dir, wie viele.

Neben einer Fase, einer Verrundung oder einer Aushöhlung steht außerdem {{ui:edge.editAction}}. Es nimmt die Bearbeitung genauso zurück, öffnet das Werkzeug aber gleich wieder mit denselben Kanten und dem alten Wert. Du änderst den Wert und wendest ihn neu an: So wird aus einer Verrundung von 3 mm eine von 5 mm, ohne dass du die Kanten noch einmal anklicken musst. Liegen neuere Bearbeitungen darüber, gehen sie auch hier mit. Das gilt für Kantenbearbeitungen, die du ab jetzt machst; bei älteren steht nur das Zurücknehmen da, und bei einzelnen Teilen einer Gruppe ebenfalls.

Bei einer Gruppe, etwa einem Zylinder mit einer Bohrung, gehört die bearbeitete Kante zum fertigen Körper, nicht zu einem einzelnen Teil. Deshalb wird aus der Gruppe dabei ein einziger Körper. {{ui:editor.tool.ungroup}} geht trotzdem: Es nimmt zuerst die Kantenmerkmale zurück und löst dann die Gruppe auf, in einem Schritt, den [[Strg]]+[[Z]] rückgängig macht. Nimmst du die Bearbeitung wie oben beschrieben zurück, ist die Gruppe mit allen Teilen wieder da. Am einfachsten ist es, Kanten erst ganz am Schluss zu bearbeiten. Das gilt auch für Gewinde: Das Kantenwerkzeug nimmt ein Gewinde als exakten Körper, ein Block mit einer Gewindebohrung bekommt seine Rundungen also mit dem Gewinde darin. Die Kanten eines Gewindes zu ermitteln dauert länger als bei einer einfachen Form, ein paar Sekunden bei M6 und etwa eine halbe Minute bei einem G1/2-Rohrgewinde.

> **Gut zu wissen:** layerling rechnet bei Rundungen und Fasen mit echter CAD-Geometrie, nicht nur mit einem Dreiecksnetz. Deshalb bleibt eine verrundete Kante auch im STEP-Export eine verrundete Kante.

Ein als STEP importiertes Teil behält seine CAD-Geometrie ebenfalls: Fasen, Rundungen und das Aushöhlen arbeiten am Körper aus der Datei, egal wie fein das Teil auf dem Bildschirm gezeichnet ist. STL, OBJ und 3MF bringen nur Dreiecke mit, und ein fein gezeichnetes Teil kann für die Kantenbearbeitung zu dicht sein. Gibt es ein Teil auch als STEP, importiere lieber das. {{ui:editor.tool.makeExact}} macht aus so einem Teil zuerst einen exakten Körper mit echten Ebenen und Zylindern, siehe [Dateien, Speichern und Weitergeben](chapter:dateien-und-speichern), „Ein importiertes Netz exakt machen“.

## Körper aushöhlen

Dosen, Becher, Gehäuse und Abdeckungen haben eines gemeinsam: Sie sind innen leer, mit Wänden gleicher Stärke. Genau das macht {{ui:editor.tool.hollow}}.

1. Wähle den Körper aus und klicke auf {{ui:editor.tool.hollow}}, oder klicke mit der rechten Maustaste auf den Körper und wähle es im Menü.
2. Stelle die {{ui:shell.wall}} ein.
3. Schalte unter {{ui:shell.openings}} die Seiten ein, die offen bleiben: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} oder {{ui:shell.side.right}}, beliebig viele – {{ui:shell.side.front}} allein ergibt einen Schacht für eine Schublade, {{ui:shell.side.left}} und {{ui:shell.side.right}} einen Tunnel. Ist keine Seite eingeschaltet, bleibt der Körper rundum geschlossen, mit einem Hohlraum in der Mitte. {{ui:shell.side.closed}} schaltet alle Seiten mit einem Klick aus. {{ui:shell.side.top}} ist beim Öffnen schon eingeschaltet; ein Klick darauf schließt die Oberseite wieder. Ein rundum geschlossener Körper sieht von außen unverändert aus: Den Hohlraum zeigt die Schnittansicht.
4. Entscheide, ob die {{ui:shell.edges}} {{ui:shell.edges.round}} oder {{ui:shell.edges.sharp}} sein sollen.
5. Klicke auf {{ui:shell.apply}}.

![Das Aushöhlen-Fenster mit Wandstärke, einem Schalter für jede Seite, die offen bleibt, und den inneren Kanten.](shot:hollow-panel)

Die Wände wachsen nach innen. Außen bleibt alles, wie es ist.

Die {{ui:shell.edges}} wirken nur dort, wo die Innenwände auseinanderlaufen - an einer Stufe im Körper oder rund um eine Öffnung. Die Ecken des Hohlraums eines einfachen Quaders sind mit beiden Einstellungen immer scharf. Für ein rundes Innere rundest du zuerst die Außenkanten des Körpers (siehe oben) und höhlst ihn dann aus: Das Innere folgt mit dem Radius minus der Wandstärke. Lässt sich das runde Innere nicht bauen, was bei einem Umriss aus sehr vielen kurzen geraden Stücken wie einer nachgezeichneten Zeichnung vorkommen kann, baut layerling denselben Hohlkörper stattdessen mit scharfen Innenecken.

![Das Ergebnis: eine Schale mit 3 mm Wand, oben offen.](shot:hollow-result)

![Derselbe Quader, nur an der Vorderseite offen: ein Schlitz für eine Schublade.](shot:hollow-sides)

Für jede offene Seite braucht der Körper ganz außen auf dieser Seite eine ebene Fläche. Kugeln und freie Formen lassen sich deshalb so nicht aushöhlen. Wenn die Wand zu dick für den Körper ist, meldet layerling das und bittet um eine dünnere. Eine abgerundete Box, deren Ober- und Unterkanten ebenfalls gerundet sind, ist so ein Fall: Ihre Wand muss deutlich dünner sein als diese Rundung, oder setze die Rundung vorher auf 0.

Auch ein Körper mit einer Tasche lässt sich aushöhlen, etwa ein Block mit einem Loch, das nicht ganz hindurchgeht (eine Gruppe aus einem Quader und einem hochgesetzten Loch), und zwar mit offener Oberseite: Auch die Wände um die Tasche werden ausgehöhlt, so dass zwischen der Außenwand und der Tasche ein Ring aus Hohlraum bleibt, oben offen, und unter dem Boden der Tasche ein dünner Hohlraum liegt.

**Körper, die in einer Spitze enden,** etwa ein Kegel oder ein gedrehtes Dreieck, haben oben keine ebene Fläche, die offen bleiben könnte. Auch ein ganz geschlossener Hohlraum gelingt dort nicht, denn eine Spitze lässt sich nicht nach innen versetzen: Selbst mit 1 mm Wand kommt die Meldung, dass die Wände nicht so dick sein können. Zeichne die Wand dann vor dem Drehen ins Profil: Dupliziere den Umriss, verkleinere die Kopie gleichmäßig, setze sie in die Mitte des großen Umrisses und schneide mit ihr den großen aus, dann dreh das Ganze (Kapitel Skizzen, Abschnitt Rotieren). Der Abstand der beiden Umrisse ist die Wandstärke.

Änderst du später die Größe des ausgehöhlten Körpers, höhlt layerling ihn in der neuen Größe gleich noch einmal aus. Die Wand bleibt so dick, wie du sie gewählt hast, auch bei runden Körpern. Ein Zylinder, den du dabei in eine Richtung mehr ziehst als in die andere, wird zur Ellipse. Verrundungen und Fasen, die du nach dem Aushöhlen angebracht hast, kommen danach wieder an dieselben Kanten.

> **Tipp:** Bei einer 0,4-mm-Düse sind 1,2 bis 2 mm Wandstärke ein guter Anfang: dünn genug, um Material zu sparen, dick genug für ein stabiles Teil.

## Ein Deckel für einen offenen Körper

{{ui:editor.tool.lid}} macht den Deckel für einen Körper, der oben offen ist: eine Kiste, die du mit offener Oberseite ausgehöhlt hast, einen Topf, eine Schale. Wähle den Körper und klicke auf {{ui:editor.tool.lid}}. Im Fenster wählst du die Art:

- {{ui:lid.type.plug}}: eine Platte so groß wie der Körper, darunter eine Lippe, die in die Öffnung greift.
- {{ui:lid.type.cap}}: eine Platte eine Wand breiter als der Körper, darunter ein Rand, der außen herum greift.
- {{ui:lid.type.both}}: eine Platte eine Wand breiter als der Körper mit beidem: einer Lippe in die Öffnung und einem Rand außen herum. Die Wand des Körpers sitzt dazwischen in einer Nut, wie bei einer Frischhaltedose.
- {{ui:lid.type.flat}}: nur die Platte, zum Auflegen oder Ankleben.

Dann stellst du die {{ui:lid.thickness}} ein, die {{ui:lid.fit}} (den {{ui:lid.gap}} zwischen Deckel und Körper: 0,1 mm stramm, 0,2 mm normal, 0,3 mm locker, oder jeden Wert bis 1 mm) und wie tief Lippe oder Rand nach unten reichen und wie dick ihre Wand ist. Klicke auf {{ui:lid.apply}}: Der Deckel liegt neben dem Körper, umgedreht mit der Platte nach unten, so druckt er ohne Stützen. Der Körper bleibt, wie er ist. Der Deckel folgt jedem Umriss, rund oder eckig, weil er dem Körper selbst knapp unter seinem Rand abgenommen wird. Ein Körper ohne Öffnung oben bekommt nur einen flachen Deckel; für die anderen höhle ihn zuerst mit offener Oberseite aus. Ist der Körper ein exakter CAD-Körper, etwa ein mit Aushöhlen ausgehöhlter abgerundeter Quader, wird es auch der Deckel, mit Rundungen, die rund bleiben: Seine Kanten verrundest oder fast du mit dem Kantenwerkzeug wie jede andere. Andere Körper und Deckel mit Pfosten für die Magnete bekommen einen Deckel aus Dreiecken.

> **Tipp:** Wie stramm ein Deckel sitzt, hängt vom Drucker ab. Drucke zuerst eine kleine Kiste mit Deckel; sitzt er zu fest, nimm die nächst lockerere Passung.

Schaltest du {{ui:lid.magnets}} ein, halten vier runde Magnete den Deckel statt einer strammen Passung. Wähle einen {{ui:lid.magnetSize}} (6 × 2, 8 × 3 oder 10 × 3 mm) oder stelle {{ui:lid.magnetDiameter}} und {{ui:lid.magnetHeight}} selbst ein, dazu das {{ui:lid.magnetGap}}: 0,1 mm zum Einpressen, 0,2 bis 0,3 mm zum Einkleben. Layerling schneidet in jede Ecke des Körperrands eine Tasche und gegenüber eine in die Deckelplatte, etwas tiefer als der Magnet, damit er nie übersteht. Wo die Wand für eine Tasche zu dünn ist, füllt ein Pfeiler die Ecke vom Boden bis zum Rand, und die Lippe des Deckels geht um ihn herum. Der Körper wird mit seinen Taschen und Pfeilern gruppiert: Löst du die Gruppe auf, hast du ihn wieder wie vorher. Die Platte muss mindestens so dick sein wie der Magnet hoch ist plus 0,8 mm; beim Einschalten der Magnete wird sie so dick gemacht.

Schaltest du {{ui:lid.hinge}} ein, klappt der Deckel um einen Stift entlang einer geraden Seite des Körpers auf: hinten oder an der Seite, die du unter {{ui:lid.hingeSide}} wählst (wie in der Startansicht, in der die Rückseite von dir weg zeigt). Dort wechseln sich Knöchel ab, die äußeren am Körper, die dazwischen am Deckel, mit {{ui:lid.hingeGap}} dazwischen, und durch alle geht ein Loch für den Stift: Bei einem {{ui:lid.hingePin}} von 1,75 mm ist ein Stück Filament der Stift; mit {{ui:lid.hingePrintPin}} entsteht ein dickerer als eigenes Teil. Im Scharnierteil des Körpers sitzt der Stift fest, so bleibt ein eingepresstes Stück Filament, wo es ist; in dem des Deckels dreht er sich: {{ui:lid.hingePinPlay}} ist sein Platz dort auf jeder Seite, anfangs 0,2 mm; gib ihm mehr, wenn sich der Deckel schwer dreht. Die Knöchel des Körpers stehen auf einer 45°-Schräge, so druckt der Körper stehend ohne Stützen; die des Deckels schließen bündig mit seiner Oberseite ab, so druckt er weiter umgedreht. {{ui:lid.hingeKnuckles}} auf 0 gibt etwa einen Knöchel je 10 mm. Ein Scharnier geht mit eingestecktem oder flachem Deckel; ein Rand außen herum würde beim Aufklappen an die Rückwand stoßen. An einer runden Seite, etwa bei einer Dose oder einem Rohr, läuft das Scharnier dort, wo die Wand höchstens einen Knöchel-Radius hinter der Scharnierlinie zurückbleibt, und die Knöchel des Körpers stehen auf einem kleinen Block, der bis in die Wand reicht. {{ui:lid.hingeTeardrop}} (anfangs an) gibt den Löchern für den Stift oben eine Spitze, so wie jedes Teil gedruckt wird, damit sie nicht durchhängen; ein mitgedruckter Stift liegt auf einer kleinen flachen Seite. Unter {{ui:lid.hingeStyle}} setzt {{ui:lid.hingeStyle.flush}} die Knöchel in die Wand statt dahinter: Die Kiste behält ihr Maß, jedes Teil ist um die Knöchel des anderen ausgespart, und der Deckel öffnet bis etwa 140°. {{ui:lid.hingeStyle.pivot}} macht einen Deckel, der auf einer kleinen Auflage in der Öffnung liegt und sich auf zwei Stiften durch die Seitenwände dreht, bis etwa 95°; auch dabei behält die Kiste ihr Maß. Beides braucht eine gerade Seite und geht ohne Magnete.

Beim Scharnier {{ui:lid.hingeStyle.flush}} schaltest du {{ui:lid.hingeEndPlugs}} ein, um das Stiftloch an beiden Enden zu verschließen: So bleibt der Stift verborgen und kann nicht herausrutschen. Die letzten 4 mm des Lochs sind dann an jedem Ende quadratisch, auf eine Ecke gestellt, damit sie ebenfalls oben eine Spitze haben und beim Drucken nicht durchhängen, und gerade so groß, dass der Stift durchgeht: Erst den Stift einschieben, dann in jedes Ende einen Stopfen drücken. Die quadratischen Stopfen können sich nicht drehen und sitzen so fest wie der Stift im Körper; jeder ist bündig mit der Außenseite der Kiste abgeschnitten, auch an abgerundeten Ecken (bei solch einer Kiste läuft das Scharnier dann bis in die Ecken). Sie liegen neben dem Deckel, auf einer flachen Seite. Der Stift wird dadurch kürzer, und die Statusleiste sagt, wie lang.

> **Tipp:** Presse zuerst die Magnete in den Körper. Setze dann auf jeden noch einen Magneten, der dort richtig herum einrastet, und drücke den Deckel darauf (mit einem Tropfen Kleber in den Taschen, falls sie locker sitzen): So kommt jeder Magnet passend zu seinem Partner in den Deckel, und sie ziehen sich an.

Schaltest du {{ui:lid.clickBumps}} ein, rastet der Deckel ein: Kleine runde Noppen außen an seiner Lippe (bei einem übergestülpten Deckel innen an seinem Rand) schnappen in Mulden, die Layerling an denselben Stellen in die Wand des Körpers schneidet, eine in der Mitte jeder geraden Seite ab 12 mm, zwei an einer Seite über 80 mm, vier rund um eine runde Öffnung und keine an der Seite des Scharniers. {{ui:lid.clickBumpHeight}} sagt, wie weit jede Noppe in die Wand greift, anfangs 0,4 mm: weniger bei einer kleinen Kiste oder einer steifen Lippe, mehr für ein festeres Einrasten. Unter {{ui:lid.handle}} gibt {{ui:lid.handle.tab}} der Platte eine Lasche, die 6 mm über ihre Vorderkante (oder die Kante gegenüber dem Scharnier) hinausragt und so dick ist wie die Platte, sodass der Deckel weiter umgedreht druckt, und {{ui:lid.handle.notch}} schneidet knapp unter der Deckelkante eine Mulde für einen Finger in die Vorderwand des Körpers und lässt dabei immer 0,8 mm der Wand stehen; beides geht nicht mit einem Deckel auf Drehzapfen, die Noppen auch nicht mit einem flachen.

## Ein Kabelkanal durch einen Körper

{{ui:editor.tool.cableChannel}} legt einen runden Gang durch einen Körper, für ein Kabel oder eine LED-Leitung, von dort, wo es hineingeht, bis dort, wo es herauskommt, und sucht den Weg selbst. Wähle den Körper aus und klicke auf {{ui:editor.tool.cableChannel}}, dann auf den Körper, wo das Kabel hineingeht ({{ui:cable.entry}}), und wo es herauskommt ({{ui:cable.exit}}). Der Weg beginnt und endet gerade, senkrecht zur Oberfläche, läuft gerade, wo es geht, und biegt, wo er muss, nie enger als {{ui:cable.minBend}}, und bleibt so weit von der Außenhaut weg, wie es geht, nie näher als {{ui:cable.minWall}}. Ein Kabel lässt sich durch einen Bogen von etwa dem Fünffachen seines Durchmessers schieben; {{ui:cable.diameter}} ist der des Kanals.

Solange das Fenster offen ist, siehst du durch den Körper hindurch, mit dem Kanal darin und einer Marke an jedem Ende. Das Fenster sagt, wie lang der Kanal ist, wie eng sein engster Bogen und wie dünn seine dünnste Wand, und das in Rot, wenn ein Bogen oder die Wand kleiner sein musste als gewünscht; dann hilft ein kleinerer Wert bei {{ui:cable.minBend}} oder ein anderer Eingang oder Ausgang. {{ui:cable.pickAgain}} versetzt ein Ende. {{ui:cable.apply}} schneidet den Kanal ein: Er wird ein {{ui:shape.bentTube}} als Aussparung, mit dem Körper gruppiert, der Körper bleibt also exakt, und nach dem Aufheben der Gruppe lässt sich das Rohr noch ändern. Ein gebogenes Rohr hat höchstens elf Bögen; ein Weg, der mehr braucht, verlangt einen anderen Eingang oder Ausgang.

## Körper versetzen

Jede Fläche eines Körpers lässt sich um dieselbe Strecke nach außen oder innen verschieben. Das braucht eine Passung, ein Deckel oder eine Schnappverbindung: ein Spalt von 0,1 bis 0,3 mm ringsum, während die Merkmale an ihrem Platz bleiben, was Skalieren nicht kann.

1. Wähle einen Körper und klicke auf {{ui:editor.tool.offset}}, oder klicke den Körper mit der rechten Maustaste an und wähle es dort.
2. Wähle {{ui:offset.grow}} oder {{ui:offset.shrink}} und stelle den {{ui:offset.distance}} ein.
3. Die {{ui:offset.edges}} bestimmen die Außenecken: Gerundet hält die versetzte Fläche dort rund, scharf lässt die Flächen weiterlaufen, bis sie sich treffen.
4. Setze den Haken bei {{ui:offset.copy}}, um das Teil zu behalten und den vergrößerten Körper als Kopie zu bekommen, die schon ein Loch ist. Gruppiere dieses Loch mit dem Gegenstück, und es schneidet genau das Spiel, das du gewählt hast.
5. Klicke auf {{ui:offset.apply}}.

Setze den Haken bei {{ui:offset.sideways}}, wenn nur der Umriss wachsen oder schrumpfen soll: Die Seiten wandern um den Abstand, jede flache Ober- und Unterseite bleibt auf ihrer Höhe. Ein Schild bekommt ringsum einen Rand, ein Sockel wird breiter, und der Körper wird nicht höher. Bei einem abgestuften Körper behält jede Stufe ihre eigene Höhe. Ein Text, der über seine Umrisse versetzt wird, behält dann ebenfalls seine Höhe.

Ohne den Haken wird der Körper selbst versetzt. Er wird zu einem festen exakten Körper, wie nach einer Fase: Die Liste oben im Werkzeugfenster nimmt den Versatz zurück, und {{ui:edge.editAction}} öffnet das Werkzeug wieder mit dem alten Abstand. Versetzen lassen sich nur exakte CAD-Körper - Quader, Zylinder und die anderen Formen, Gruppen davon, importierte STEP-Teile. Ein Körper, der nur ein Dreiecksnetz ist, wie viele STL-Importe, lässt sich oft nicht versetzen. Ein Abstand, der für den Körper zu groß ist, etwa ein Verkleinern über die dünnste Wand hinaus, wird abgelehnt.

Ein Text, dessen Buchstaben der Kern nicht als Körper versetzen kann - in manchen Schriften ein A, B, M, N, W oder 9 -, wird stattdessen über seine Umrisse versetzt: Er bekommt die Füllung {{ui:prop.textWider}} um den Abstand (beim Verkleinern schmaler) und wird oben und unten um ebenso viel höher. Er bleibt ein Text, den du weiter bearbeiten kannst. Das gilt für einen Text mit gefüllten Buchstaben ohne Rundung; einer, der schon eine Füllart hat, wird wie bisher abgelehnt.

## Flächen löschen

Eine Verrundung, die stört, ein Loch an der falschen Stelle, ein Zapfen, der nicht mehr gebraucht wird: {{ui:editor.tool.deleteFace}} nimmt sie wieder vom Körper, ohne dass du ihn neu bauen musst.

1. Wähle den Körper aus und klicke auf {{ui:editor.tool.deleteFace}}, oder klicke mit der rechten Maustaste auf den Körper und wähle es im Menü.
2. Klicke alle Flächen des Teils an, das weg soll: die Flächen einer gerundeten Kante, die Wand eines Lochs, Seite und Deckel eines Zapfens. Eine gewählte Fläche leuchtet auf; ein zweiter Klick nimmt sie wieder heraus. Das Fenster zählt die Flächen.
3. Klicke auf {{ui:deleteFace.apply}} oder drücke [[Entf]]. [[Esc]] schließt das Werkzeug, ohne etwas zu ändern.

Die Flächen ringsum wachsen, bis die Lücke geschlossen ist. Ein Quader mit gerundeten Oberkanten bekommt seine scharfen Kanten zurück, ein Loch ist geschlossen, ein Zapfen ist weg. Der Körper bleibt exakt: Er lässt sich wieder verrunden und fasen, und der STEP-Export behält seine echten Flächen. [[Strg]]+[[Z]] nimmt das Löschen in einem Schritt zurück. Es steht außerdem unter {{ui:edge.featureHistory}} bei den Verrundungen und Fasen, wo {{ui:edge.revertAction}} es zurücknimmt; {{ui:edge.editAction}} gibt es dafür nicht. Bei einer Gruppe wird daraus ein einziger Körper, wie bei einer Kantenbearbeitung.

Wähle alle Flächen des Teils, das weg soll, und nur diese. Können die Flächen ringsum die Lücke nicht schließen, sagt layerling das, und nichts ändert sich: Eine Hauptseite eines Quaders etwa hat keine Nachbarfläche, die an ihre Stelle treten könnte. Löschst du nur den Boden einer Tasche, wird daraus ein durchgehendes Loch, weil die Wände der Tasche bis zur anderen Seite weiterlaufen.

{{ui:editor.tool.deleteFace}} braucht exakte Flächen: Es geht bei Teilen, die als STEP importiert wurden, und bei layerlings Formen. Was layerling als Netz führt, hat keine: eine importierte STL-, OBJ- oder 3MF-Datei, ein geteilter, um einen Zylinder gewickelter oder vereinfachter Körper oder eine sehr detailreiche Form wie ein langer Text. Importiere ein Teil als STEP, wenn es das gibt. Bei einem detailreichen importierten Teil können einzelne Flächen den CAD-Rechenkern überfordern: Nach 45 Sekunden wird das Löschen abgebrochen, und nichts ändert sich. Ein Körper, der nach einer Kantenbearbeitung mit beibehaltener Kantengröße in der Größe geändert wurde, hat in der neuen Größe keine exakten Flächen, bis die Größenänderung zurückgenommen ist.

Ein importiertes Netz, das mit {{ui:editor.tool.makeExact}} exakt gemacht wurde, kann haarfeine Flächen behalten, wo die Dreiecke der Datei fehlerhaft waren. Sie liegen zwischen Flächen in einer Ebene, sodass eine Seite in Streifen zerfällt, die sich allein nicht löschen lassen. Eine solche Fläche, zu schmal zum Anklicken, wird mit einer gewählten Fläche gelöscht, wenn sie an diese grenzt und zu einer weiteren Fläche in der Ebene der gewählten Fläche führt, zusammen mit den haarfeinen Flächen an ihr, die ebenfalls eine Fläche in dieser Ebene berühren; das Fenster zählt sie als mitgenommen.
