---
title: Måling og noter
summary: Målebånd, lineal og vinkelmåler, afstande til nulpunktet, noter der følger med en del, og referencepunkter som ting snapper til.
---

For at bygge en del præcist skal man måle. layerling har flere værktøjer til det. Ingen af dem ender i en eksport. Vægtykkelse og mellemrum inden i en del måles bedst i [snitvisningen](chapter:view-and-workplane) med {{ui:camera.sectionMeasure}}.

## Målebåndet

Målebåndet sidder for neden i kamerabjælken ved venstre kant ({{ui:camera.tapeTools}}). Det måler afstande mellem hjørner, kanter og flader. Et klik på den åbner fem knapper. Dækker de det du vil måle, så træk dem i grebet til venstre, et hvilket som helst sted på arbejdsplanet; et dobbeltklik på grebet sætter dem tilbage:

![Målebåndet med dets knapper: tilføj mål, flyt målepunkter, fjern mål, hele kanter, slet alle mål.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klik et punkt, træk til det næste og klik det. Afstanden er mærket, med de akser den løber langs foran: X, Y eller Z for en lige, XY, XZ eller YZ på tværs af et plan, 3D for alle tre. Hold markøren over etiketten for at se, hvor langt målet rækker langs hver akse, og over et punkt for at se dets koordinater. Mens du sætter det andet punkt, vises akserne, afstanden og rækkevidden langs hver akse ved siden af markøren. Et mål, der for det meste ligger bag et andet legeme, bliver blegt; holder du markøren over dets linje eller etiket, vises det fuldt igen.
   På en modsat kant eller flade snapper det andet punkt ind i en ret vinkel til det første, når markøren kommer nær – eller hvor som helst på den kant eller flade, mens du holder [[Shift]]. Langs den samme flade eller på arbejdsplanet holder [[Shift]] målet lige langs hovedaksen.
2. **{{ui:camera.moveMeasurement}}:** Tag fat i punkterne og flyt dem, tallet følger med.
3. **{{ui:camera.deleteMeasurement}}:** Klik bagefter et mål for at fjerne det.
   Mens **{{ui:camera.addMeasurement}}** er aktiv, sletter et klik på et målepunkt eller en mållinje, mens du holder [[Shift]] eller [[Ctrl]] ([[Cmd]] på en Mac), straks målet uden at skifte tilstand.
4. **{{ui:camera.tapeWholeEdges}}:** Et klik på en kant måler hele den, længden af en cirkel for eksempel. Med denne slået fra sætter et klik et punkt på kanten i stedet, og det andet punkt kan være hvor som helst, så du kan måle diameteren eller enhver anden afstand. [[Alt]] bytter om for ét klik. På en cirkel snapper punktet overfor til når markøren kommer nær, og punkterne sidder på den sande cirkel, så diameteren kommer nøjagtig ud.
5. **{{ui:camera.deleteAllMeasurements}}:** Fjerner hvert mål på én gang. Da det ikke kan fortrydes, spørger layerling først; uden mål er der intet at gøre.
6. **{{ui:camera.tapeMarkMiddle}}:** Midt på hvert mål sidder et lille rundt mærke med den nederste halvdel udfyldt. Den sætter et [referencepunkt](#referencepunkter) midt i målet: efter et klik på en rund kant, såsom kanten af et hul, i midten af den cirkel - også på et importeret mesh, hvor intet andet markerer midten af et hul - og for en diameter eller et hvilket som helst lige mål halvvejs langs det. En form du trækker snapper så til punktet med sit centrum. Et punkt der allerede er der laves ikke to gange.
7. **{{ui:camera.tapeTypeLength}}:** Når mindst én ende af en lige måling sidder på et legeme, kan tallet klikkes. Skriv en ny længde og tryk [[Enter]]: legemet ved det andet punkt flyttes langs den målte linje, til afstanden er præcis den, som med linealen i Tinkercad. Er kun legemet ved det første punkt valgt, flyttes det i stedet. Målepunkterne bliver på legemet, så målingen følger med. Mål fra et hjørne, en kant eller et [referencepunkt](#referencepunkter), fx midten af en cirkel, for at placere dele i en præcis afstand.
   Målebåndet snapper til et referencepunkt som til et hjørne, så du kan måle fra centrum af en cirkel eller fra midten af en linje: markér punktet, og klik så på det.

[[Esc]] forlader måletilstand.

## Linealen

Du henter {{ui:shape.ruler}} fra formbiblioteket. Den er rent et måleværktøj: den optræder i ingen eksport og kan hverken grupperes eller skæres. For hver form der rører eller overlapper linealen viser den udstrækningen som et flydende tal lige i visningen. Du kan ændre det tal der, og formen følger med. Rejs linealen op eller vip den, så måler den i sin egen retning: står den oprejst ved siden af en form, viser den formens højde. Det flydende plus-symbol laver en kopi af den målte form; det er der, mens linealen ligger ned. Dens påtrykte skala er i millimeter langs den ene lange kant, med tierne nummereret, og i tommer langs den anden, med en streg for hver sekstendedel tomme og de hele tommer nummereret. Skalaen for den enhed, du arbejder i (kontakten nederst til højre), løber langs den øverste kant; en lineal smallere end 15 mm har kun den ene.

## Vinkelmåleren

Nogle gange måler man bedre i en ret vinkel. Klik på {{ui:camera.cornerRulerTool}} i kamerabjælken og derefter på arbejdsplanet. En vinkelmåler med to arme i en ret vinkel, med takker som en vinkelhage, placeres der. Den har heller ingen egen form. Klik tæt på et hjørne af en form, og dens hjørne snapper præcis der. Designet beholder vinkelmåleren, hvor du satte den, også i en gemt LYL-fil: når du åbner designet igen, er den det samme sted, drejet den samme vej og måler fra de samme punkter, indtil du fjerner den.

Vinkelmåleren ligger på arbejdsplanet. Ligger det på siden af en form, ligger vinkelmåleren også på den side, se [Visning og arbejdsplan](chapter:view-and-workplane). Sådan målsætter du på en lodret væg: læg arbejdsplanet på væggen, placér måleren i dens øverste venstre hjørne og klik håndtaget indtil armene peger til højre og ned.

- **At trække håndtaget** flytter den.
- **Et kort klik på håndtaget** drejer den 90°.
- **×** ved siden af fjerner den.
- **Den lille knap til venstre for håndtaget** skifter hvad der måles fra: ydersiden af en form (endepunkt, et ikon med streger) eller dens midte (midtpunkt, et sigtekorn).
  En lille kontakt af samme slags sidder ved siden af hvert grønt tal og sætter kun det tal: for en stående cylinder er det midten i de to arme og bunden i højden, for en liggende midten på tværs og en ende i længden. Når alle tre igen er enige, viser knappen ved håndtaget den fælles tilstand.

Står der former ved en af armene, viser vinkelmåleren automatisk deres dimensioner, valgt eller ikke: former inden i vinkelmåleren, ved siden af en arm eller på tværs af den. En form uden for den, bag hjørnet eller ved siden af en arm udefra, får ingen. Det virker kun på grundpladen, ikke på siden af en form. Knappen med pilen under vinkelmålerens håndtag slår det fra, så kun de valgte former viser deres mål; den gemmes med designet.

Når du vælger en form, viser vinkelmåleren med grønt hvor langt den er fra hjørnet, langs begge arme og i højden. Klik et grønt tal for at taste en afstand, og formen flytter sig præcis derhen. Med flere former valgt tæller de som én: måleren måler deres fælles omrids, og en tastet værdi flytter dem alle sammen uden at ændre deres position i forhold til hinanden.

De grønne tals hjælpelinjer løber langs det plan, vinkelmåleren ligger i, frem til punktet under eller ved siden af formen; højden har sin egen pil. Hvert tals kontakt sidder i tallets ramme. Armene og takkerne er linjer i rummet: en form foran dem skjuler dem, som en rigtig vinkelhage ville blive skjult. Det lille øje under håndtaget skifter det: med øjet gennemstreget skjuler former måleren (det er udgangspunktet); med øjet åbent bliver måleren liggende over alt. Tallene på armene falmer, hvor en form står foran dem.

Med midtpunktet tæller de grønne tal til formens midte, også i højden. Sådan placerer du en kugle med dens centrum præcis 15 mm fra en kant, uden at trække radius fra. På en væg placerer du et hul 40 mm fra venstre og 190 mm fra toppen sådan: vælg hullet, skift til midtpunkt, tast 40 og 190. Højden der tæller udad fra væggen.

Både målebåndet og vinkelmåleren bliver hvor de er mens du skitser og kommer tilbage til 3D-visningen. Ingen af dem er i historikken. Vinkelmåleren gemmes med designet, og det samme gør målebåndets målinger, i browseren og i .lyl-filen: de er der igen, når du åbner designet. Øjeknappen blandt målebåndets knapper skjuler alle målinger og viser dem igen; om de er skjult, gemmes også, og hvis du sætter, flytter eller sletter en måling, vises de først.

## Afstande til nulpunktet og under flytning

Under {{ui:workspace.appearance}} i indstillingerne er der to kontakter for levende dimensioner:

- {{ui:workspace.showMoveDimensions}} viser hvor meget du flytter mens du trækker.
- {{ui:workspace.showOriginDimensions}} viser afstandene fra markeringen til pladens nulpunkt, også med flere valgte former.

Med {{ui:workspace.dimensionsAlwaysVisible}} bliver dimensionerne permanent synlige.

## Noter

En note registrerer hvad geometrien ikke siger: "Denne skrue er 0,3 mm for stram", "print låget endnu", "mål fra Peter". Placér en med {{ui:editor.tool.note}} eller [[N]]-tasten.

- Hvis du placerer noten **på en form**, følger den med den.
- Hvis du placerer den **ved siden af**, bliver den på arbejdsplanet ({{ui:note.free}}).
- {{ui:note.detach}} frigør en vedhæftet note fra formen.
- {{ui:editor.tool.group}} tager en vedhæftet note med ind i gruppen; {{ui:editor.tool.ungroup}} giver den videre til den synlige del under den, også en gruppe indeni. Mens en gruppe er åben med {{ui:group.edit}}, følger dens noter med den del, de sidder på, og går tilbage til gruppen med {{ui:group.done}}; annullering sætter dem tilbage, som de var.
- Hvis dens form slettes, eller der ikke længere er en synlig form under den, bliver noten stående, hvor den var, på arbejdsplanet.
- Træk i nålen flytter noten. Et klik på nålen folder kortet sammen, så kun det lille tal bliver stående, og et klik mere åbner det igen. Et klik i teksten redigerer den.
- Mens du skriver, bevarer [[Enter]] teksten og [[Esc]] sætter den tilbage til hvordan den var før du begyndte; [[Shift]]+[[Enter]] starter en ny linje.
- **I en skitse** sætter {{ui:editor.tool.note}} (under {{ui:editor.group.manage}}) eller [[N]] også en note, hvor som helst på skitsen. Alle en skitses noter hører til dens form: i 3D-visningen sidder de på den, oven på en form lavet med {{ui:sketch.extrude}} eller {{ui:sketch.sweep}} og på den tegnede profil af en form lavet med {{ui:sketch.revolve}}, og de flytter sig med den. Når du åbner skitsen igen, viser den formens noter, også dem der er sat i 3D. I skitsen tager {{ui:sketch.undo}} en note tilbage ligesom en linje, og {{ui:sketch.cancel}} kasserer det, du har ændret i noterne. [[Shift]]+[[N]] viser eller skjuler noterne også her.

Noter gemmes i designet, optræder i ingen eksport og kan vises eller skjules med {{ui:visibility.notes}} (under {{ui:editor.visibilityOptions}}, pilen ved siden af øje-ikonet) eller med [[Shift]]+[[N]].

## Referencepunkter

Et referencepunkt er et bart mærke i rummet, som en blyantsmarkering eller et layout-punkt i et værksted: det hører til ingen form, printes aldrig, og andre ting snapper til det. Højreklik en form og vælg {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} eller {{ui:contextMenu.markMidpoints}}: punkterne dukker op på formens øverste flade (af hele markeringen, hvis du valgte flere). {{ui:contextMenu.markFaceCenter}} sætter i stedet ét i midten af den flade du højreklikkede på, for eksempel på en side eller en ende.

- Træk et punkt for at flytte det, eller klik det for at se dets koordinater og taste nye; de bruger den enhed du har sat. Kortet kan trækkes væk i dets titellinje hvis det dækker noget, og et dobbeltklik på titellinjen sætter det tilbage. {{ui:common.delete}} fjerner det.
  Hvert kort kan trækkes væk alene, så de andre kort bliver hvor de er. Det kort du rørte sidst ligger foran de andre. **Slet alle** i et kort, eller **Slet alle referencepunkter** i højreklikmenuen (på en form eller på et tomt sted i 3D-visningen), sletter alle punkter på én gang.
- Målebåndet kan også markere et punkt: {{ui:camera.tapeMarkMiddle}}, det halvt udfyldte mærke midt på et mål, sætter et i dets midte, for eksempel i midten af et rundt hul.
  Og det måler fra et punkt: båndet snapper til referencepunkter som til hjørner.
- Når du trækker en form, snapper dens kanter og dens centrum til et punkt, ligesom de snapper til andre former ({{ui:workspace.objectSnap}}). Vinkelmåleren snapper også til punkter.
- Punkter gemmes i designet, optræder i ingen eksport og vises eller skjules sammen med noterne af {{ui:visibility.notes}} ([[Shift]]+[[N]]).
- En AI kan markere, liste og fjerne dem med `layerling_add_reference_points`, `layerling_list_reference_points` og `layerling_remove_reference_points`.

## Referencebilleder

Et referencebillede er et billede at rette dele ind efter: læg et foto af et printkort i bunden af dets kasse, og placer afstandsstykker, huller og udskæringer til stik lige oven på det. Det er en hjælpelinje, ikke en form: det bliver aldrig printet eller eksporteret (STL, 3MF, OBJ, STEP, SVG), aldrig en del af en gruppe, en samling eller et snit, og printestimatet tæller det ikke med.

- Åbn {{ui:editor.import}} og vælg {{ui:import.referenceImage}}, derefter et PNG-, JPG-, WebP-, GIF- eller BMP-billede. Det lægges på arbejdsplanet - på pladen eller på den flade, du satte arbejdsplanet på - med den længste side 100 mm, halvt gennemsigtigt.
- Flyt, drej og skaler det med håndtagene som enhver form. En form foran det vælges først, så arbejde oven på det griber ikke billedet.
- {{ui:referenceImage.seeThrough}} i dets indstillinger falmer det fra helt dækkende til næsten usynligt.
- {{ui:referenceImage.calibrate}} giver det dets rigtige størrelse, som i skitsen: klik på to punkter på billedet, hvis virkelige afstand du kender - f.eks. to monteringshuller på printkortet - og skriv afstanden i {{ui:referenceImage.distance}}. Billedet beholder sine proportioner og sin midte.
- Lås det med låsen i overskriften af dets indstillinger, så bliver det liggende: klik går så igennem det til pladen. Vælg det i objektlisten for at låse det op.
- Billedet gemmes kun én gang i designfilen, uanset hvor ofte det kopieres eller fortrydes. Et stort billede gør filen tilsvarende større; beskeden, når du tilføjer det, siger hvor stort det er.
- En AI tilføjer, flytter, kalibrerer, falmer og låser et med `layerling_reference_image`.
