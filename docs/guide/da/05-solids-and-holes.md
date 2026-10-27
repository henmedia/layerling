---
title: Solider og huller
summary: Hvordan enkle former bliver til boringer, slidser og lommer, og hvordan man ændrer en gruppe igen senere.
---

Dette er den vigtigste idé i layerling, og den læres hurtigt: **Enhver form er enten en solid eller et hul.** En solid bliver. Et hul er et værktøj der tager materiale væk.

## Solid eller hul

Vælg en form og klik på {{ui:inspector.solid}} eller {{ui:inspector.hole}} i dens indstillinger. Tastaturet er hurtigere: [[H]] gør markeringen til et hul, [[S]] gør den til en solid igen. Begge er også i menuen et højreklik på formen åbner. Et hul vises gennemsigtigt så du kan se hvor det sidder. [[T]] gør en form gennemsigtig, for eksempel for at kigge ind i et hus; endnu et tryk gør den uigennemsigtig igen. Det virker på hele markeringen: hvis nogen form allerede er gennemsigtig, bliver alle uigennemsigtige, ellers bliver alle gennemsigtige.

Så længe intet er grupperet, sker der ikke noget med et hul. Det ligger bare der og viser hvor noget senere forsvinder.

![Cylinderen er et hul. Den stikker ud af toppen af kassen så den skærer hele vejen igennem.](shot:hole-before)

## Gruppering

Vælg solider og hul(ler) og klik på {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Nu fjerner hullerne materialet fra de solider de rører. Det der bliver tilbage er én enkelt ny form.

![Resultatet: en kasse med et borehul.](shot:hole-after)

Sådan får du:

- **Boringer:** en cylinder som et hul gennem en form.
- **Slidser:** en aflang kasse som et hul ved kanten.
- **Lommer:** et hul der ikke går hele vejen igennem.
- **Gevind i en del:** et gevindhul som et hul, se [Gevind og mekanik](chapter:threads-and-mechanics).

Hvis der er flere solider i gruppen, samles de. To solider der rører hinanden bliver til én del.

Med store meshes, som et importeret STL med hundredvis af tusinde trekanter, tager skæringen nogle få sekunder. layerling arbejder så i baggrunden og viser "{{ui:status.computing}}"; imens kan du dreje visningen og bruge grænsefladen. Ændrer du scenen i den tid, kasseres resultatet, og layerling siger det. Det samme gælder {{ui:editor.tool.split}}.

Du kan behandle en gruppe som en form: flytte, rotere, farve, gruppere igen. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) opløser den og de enkelte dele er tilbage.

### Gøre en gruppe til et hul

En hel gruppe kan også være en solid eller et hul. En simpel regel gælder:

- Hvis gruppen kun består af solider (eller kun af huller), skifter du den som helhed og dens dele følger med.
- Hvis den indeholder begge, for eksempel en kasse med en boring, beholder hver del sin egen tilstand. Hele gruppen bliver så et værktøj, men boringen forbliver en boring.

## Bundtning

Nogle gange bør dele kun blive sammen uden at blive til én - et hvidt logo på en sort plade til et flerfarvet print for eksempel. Det er det {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]) er til, som i Tinkercad. Et bundt flytter, drejer og skalerer som en form, men intet flettes:

- Hver del beholder sin farve og forbliver en solid eller et hul. Bundtets indstillinger har de samme kort som en gruppes: {{ui:inspector.solid}} og {{ui:inspector.hole}} for hele bundtet (de bevarer delenes farver), {{ui:inspector.transparent}} ([[T]]) og {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); med Multicolor slået fra vises og eksporteres bundtet i én farve. {{ui:inspector.separateParts}} tager bundtet ad, som [[Ctrl]]+[[Shift]]+[[G]] gør.
- Huller skærer intet. Når du grupperer bundtet med andre dele, skærer dets huller de dele, men stadig ikke bundtets egne solider, som i Tinkercad. Så kan en tap med sit hul ved siden af for eksempel bruges igen og igen som et bundt.
- I en STL-, 3MF- eller OBJ-eksport er hver del sin egen form; i 3MF og OBJ med sin farve.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) skiller et bundt ad igen, [[E]] åbner det for redigering som en gruppe. Fas, rund og udhuling virker ikke på et bundt, fordi det ikke er én form: gruppér det til det, eller arbejd på dets dele én ad gangen. Skal et hul i bundtet alligevel skære bundtets egne solider, så skil bundtet ad og gruppér dets dele ([[Ctrl]]+[[G]]).

## Fælles

{{ui:editor.tool.intersect}} beholder kun hvad to eller flere former har til fælles. Læg to overlappende former oven på hinanden, vælg begge og klik det. Det gør en cylinder og en kasse til et stykke med én rund og én lige side. En gruppe tæller som den ser ud, huller inkluderet. Hvis et hul også er valgt, er det der bliver tilbage hvad alle soliderne deler med alle hullerne. Hvis formerne ikke har noget til fælles, ændres der intet, og en besked siger det.

Ved siden af den viser {{ui:editor.tool.intersectPreview}} den fælles del, før du anvender den: de valgte former bliver gennemsigtige, og det de har til fælles tegnes i grønt. Vælg og flyt hver form for sig, så følger den grønne del med; {{ui:editor.tool.intersect}} anvender den, og [[Esc]] lukker forhåndsvisningen.

{{ui:editor.tool.hull}} pakker de valgte former ind i ét konvekst legeme, som var de krympefolieret: det mindste legeme uden buler, der rummer dem alle. En halvkugle på en cylinder bliver en kuppel uden trin, fire cylindre i hjørnerne bliver en kasse med rundede hjørner, to kugler en kapsel. Huller i markeringen skæres ud af hylsteret bagefter. Delene bliver i hylsteret: {{ui:group.edit}} åbner det som en gruppe, og flytter du en del derhen og lukker, bygges hylsteret igen. Hylsteret er et mesh, så runde former viser facetter, og kantværktøjerne virker på det som på ethvert mesh.

## Skær et legeme ud af et andet

Til dele, der skal passe sammen, en aksel i en muffe eller en bolt i et hus, laver du den ene del og skærer den ud af den anden. Vælg de to legemer og klik på {{ui:editor.tool.cutOut}} i området {{ui:editor.group.combine}}, eller højreklik og vælg det der. Panelet nævner delen, der bliver, og legemet, der får hulrummet; layerling tager det mindste som delen, og {{ui:cutOut.swap}} vender det om. {{ui:cutOut.clearance}} gør hulrummet så meget større end delen hele vejen rundt: 0 passer præcist, 0,2 mm er et almindeligt spillerum til en printet pasning. {{ui:cutOut.apply}} skærer en kopi af delen ud af det andet legeme og lader delen selv blive, hvor den er. Resultatet er en gruppe: {{ui:editor.tool.ungroup}} tager snittet fra hinanden igen. Et spillerum kræver, at delen er et eksakt legeme, som ved værktøjet {{ui:editor.tool.offset}}, der bruges til det.

## Redigering af en gruppe

Hvis en boring blev for lille, behøver du ikke opløse gruppen og bygge igen. Vælg gruppen og klik på {{ui:group.edit}} i dens indstillinger, mappeikonet i objektlisten, eller tryk [[E]]. Et dobbeltklik på gruppen gør det samme, som i Tinkercad, også på et bundt; vil du hellere ikke, så slå {{ui:workspace.doubleClickOpensGroup}} fra i indstillingerne. En del begynder først at flytte sig når markøren er trukket et par pixels, så et ustabilt klik eller dobbeltklik skubber ikke til den. Delene ligger nu hver for sig og du ændrer dem med alle værktøjer: gør et hul større, flyt en form, tilføj et hul.

![Gruppen der redigeres: bjælken i bunden har Annullér og Udført, og objektlisten viser delene.](shot:open-group)

En bjælke dukker op i bunden af billedet. {{ui:group.done}} genopbygger gruppen, med dens navn, dens farve og dens tilstand som solid eller hul. {{ui:common.cancel}} sætter den tilbage urørt.

Hvis en af delene selv er en gruppe, kan du redigere den på samme måde, og så videre så dybt som dit design går. Bjælken viser hvor du er, for eksempel "Beslag › Skruebøsning". {{ui:group.done}} og {{ui:common.cancel}} afslutter altid den inderste gruppe og tager dig et niveau op. Mens du er inden i en gruppe, kan kun grupperne blandt dens dele redigeres; for at redigere en anden, afslut først.

I modsætning til {{ui:editor.tool.ungroup}}, der skiller en gruppe ad for evigt, bevarer redigering gruppen: dens navn og indstillinger bevares, og du kan altid gå tilbage med {{ui:common.cancel}}.

En bemærkning: fas og rund du har lagt på **hele** gruppen mistes ved genopbygning. Bjælken fortæller dig det.

## Deling

{{ui:editor.tool.split}} i {{ui:editor.group.modify}}-området skærer markeringen over i to med et plan - en del der er for stor til printlejet for eksempel, eller en du vil se indersiden af. Vælg en eller flere solider eller huller og klik det. Et gennemsigtigt plan viser præcis hvor snittet vil gå, og en hvid linje markerer det på formerne selv, der hvor planet møder dem; intet ændres før du anvender det.

- {{ui:split.orientation}}: **X** laver et lodret snit mellem venstre og højre, **Y** mellem for og bag, **Z** et vandret snit mellem top og bund. Akserne er navngivet som på Positionskortet, med Z op; Z er der planet starter.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} lægger planet parallelt med arbejdsplanet, {{ui:split.workplaneAcrossX}} og {{ui:split.workplaneAcrossY}} stiller det vinkelret på det, på tværs af dets X- eller Y-retning. Skærer arbejdsplanets origo markeringen, går planet gennem det, ellers gennem midten. Så lægger du arbejdsplanet på en skrå flade med [[W]] og skærer præcis der, uden at dreje på drejeskyderne.
- {{ui:split.position}}: hvor planet skærer, med skyderen eller tastet ind. Det starter i midten. Du kan også trække pilens hoved på planet; planet flytter sig langs pilen i 0,1 mm-trin.
- {{ui:split.pickFace}}, knappen ved siden af positionen, lægger planet på en flade: klik den, klik så fladen. Orientering, begge rotationer og position sættes til at matche. Mens du vælger, viser et blåt plan under markøren den flade det vil tage. En flade på en form der ikke er valgt virker også, for at justere snittet med den, men planet bliver inden for markeringen. [[Esc]] stopper valget og lader planet stå hvor det var.
- De to rotationsskydere nedenunder drejer planet om de to andre akser, op til 180° hver vej, for et skråt snit. De kan kombineres.

{{ui:split.apply}} eller [[Enter]] laver snittet, [[Esc]] annullerer (mens der vælges en flade, stopper den første [[Esc]] kun valget). Hvert objekt planet skærer bliver til to lukkede former, opkaldt efter deres side, for eksempel "Kasse (Z+)" og "Kasse (Z-)"; objekter det rammer ved siden af bliver som de er. Et hul bliver til to huller, og en udhulet form beholder sit hulrum. Begge halvdele bliver hvor de var - til printning, læg hver på sin snitflade med {{ui:editor.tool.layFlat}}.

Halvdelene er almindelige meshes: indstillinger som en cylinders sider eller en teksts bogstaver er væk, så sæt dem først. [[Ctrl]]+[[Z]] bringer originalen tilbage i ét skridt. Låste og skjulte objekter kan ikke deles.

Et importeret mesh skal have en lukket overflade for at blive delt, grupperet eller skåret. Har det åbninger, som øjnene på en figur der er ladt åbne, eller en revne i et scan, lukker layerling dem først med et fladt låg og siger hvor mange den lukkede. Den lukker små åbninger og flade åbninger af enhver størrelse; en stor åbning hvis kant bøjer, overlader den til dig, og beskeden siger det. Luk den i det program modellen kommer fra, eller med et mesh-reparationsværktøj, og importer den igen.

## Adskil dele

Hvis en form består af flere separate stykker, for eksempel tekst lavet af enkelte bogstaver, splitter {{ui:inspector.separateParts}} den i uafhængige former. Posten findes også i den menu du får ved at højreklikke på formen.

> **Tip:** Lav altid huller lidt længere end den del de skal gå igennem. Hvis hullet ender præcis flugtende med fladen, bliver der nogle gange en tynd hinde tilbage. En millimeters overshoot sikrer.
