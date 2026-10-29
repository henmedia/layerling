---
title: Placering og justering af former
summary: Formbiblioteket, dimensioner med tal og håndtag, farve, rotation, spids og snoing.
---

Enhver del i layerling starter med en form. Af dem bygger du alt andet: former supplerer hinanden, skærer hinanden ud eller samles til en ny form.

## Tilføj en form

Klik på {{ui:editor.addShape}} i båndet. Formbiblioteket åbnes.

![Formbiblioteket. Hvert lille billede er gengivet fra formens virkelige geometri.](shot:shape-menu)

Biblioteket lukker efter hver form, du vælger. Med titellinjen flytter du det derhen, hvor det ikke dækker det sted, du sigter mod, for eksempel over panelet Egenskaber; et dobbeltklik på titellinjen sætter det tilbage under sin knap, og hvor du lod det stå, husker browseren. Nålen i titellinjen holder biblioteket åbent, mens du sætter flere former efter hinanden. Med kanter og hjørner trækker du dens størrelse op, så bred og høj, som din skærm tillader; den husker browseren også, og et dobbeltklik på en kant sætter den tilbage. Trækker du biblioteket smalt, udelader det navnene og viser kun billederne; navnet vises, når du peger på en form.

Vælg en form. Den hænger nu på din musemarkør og lander hvor du klikker. Flyt den over en form og den lægger sig ned på fladen under markøren, også skrå, ligesom Cruise i Tinkercad; over den tomme plade lander den på arbejdsplanet. [[Esc]] annullerer placering. Et værktøj der venter på et klik, såsom målebåndet, vinkelmåleren, en note, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} eller kantværktøjerne, slås fra når du vælger en form, så klikket placerer formen. Den anden vej, hvis du slår et af disse værktøjer til, lægger formen sig ned igen. Hvis du hellere vil have formen til at dukke op i midten af pladen, kan du slå placering ved klik fra i indstillingerne (område {{ui:workspace.appearance}}, kontakt {{ui:workspace.cruise}}).

På en flade fanges formen i fladens midte, når markøren kommer tæt på, ligesom ved et hjørne eller en kant; hold [[Alt]] nede for at sætte den hvor som helst. Trækker du den fra biblioteket over på en flade, lander den altid i midten, med [[Alt]] der, hvor du slipper.

Hvad biblioteket tilbyder:

- **Basiske former:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (tre til fireogtyve sider), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (med tre til fireogtyve sider, så også tresidet), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}}, {{ui:shape.paraboloid}} (en kuppel, der bliver smallere op til en rund spids, og hvis højde falder med kvadratet på afstanden fra aksen) og {{ui:shape.torus}}.
- **Rør:** {{ui:shape.tube}} og {{ui:shape.bentTube}}, lavet af op til tolv lige stykker med bøjninger ind imellem, og {{ui:shape.loft}} fra ét omrids til et andet, for eksempel fra firkant til rundt.
- **Dekorative former:** {{ui:shape.star}}, {{ui:shape.heart}} og {{ui:shape.crescent}}.
- **Bogstaver:** {{ui:shape.text}}, også langs en cirkelbue. Mere i [Tekst](chapter:text).
- **Mekanik:** {{ui:shape.thread}} (gevindstang, skrue, møtrik og gevindhul), {{ui:shape.spring}}, {{ui:shape.gear}} og {{ui:shape.knurl}} til greb. Mere i [Gevind og mekanik](chapter:threads-and-mechanics).
  Gridfinity-bakke og -grundplader vælger du med {{ui:shape.gridfinity}}.
- **Til konstruktioner:** det print-in-place {{ui:shape.hinge}}, {{ui:shape.dovetail}}, {{ui:shape.teardrop}} til vandrette huller, {{ui:shape.counterbore}} og {{ui:shape.countersink}} til skruehoveder og {{ui:shape.ruler}}, som kun er et måleværktøj og aldrig vises i en eksport.

Du får en trekant på to måder: {{ui:shape.polygon}} med tre sider er en ligebenet trekant, Tinkercads "Roof", og {{ui:shape.wedge}} er en retvinklet trekant. Begge er ægte trekantede prismer. For et trekantet hul, kopier formen, gør kopien mindre, markér den som et hul og justér den med {{ui:editor.tool.centerOnWorkplane}} eller {{ui:editor.tool.align}}. Begge arbejder med formens begrænsningsboks, den mindste kasse der omslutter den, så en halveret firkant stadig tæller som en hel firkant. Kommandosøgningen ([[Ctrl]]+[[K]]) finder også begge former under "triangle" eller "roof".

{{ui:shape.slot}} kan være smallere i den ene ende end den anden, for eksempel til en afskærmning over en rem mellem to remskiver. Under {{ui:inspector.properties}} sæt {{ui:prop.slotSmallEnd}}; den store ende er lige så bred som kapslen, og siderne løber lige fra den ene bue til den anden. {{ui:prop.slotCentreDistance}} er afstanden mellem de to buers centre, det er hvor langt fra hinanden remskiverne er. Skift den lille ende og centerafstanden bevares, kapslen bliver længere eller kortere. Den spidse kapsel forbliver også en eksakt form, til runder og STEP.

## Formens indstillinger

Så snart en form er valgt, vises dens indstillinger til højre. Øverst er navnet; blyanten ved siden af ({{ui:outliner.rename}}) lader dig taste et nyt. [[Enter]] beholder det, [[Esc]] annullerer, og et tomt navn bringer formens standardnavn tilbage. Længere til højre, hængelåsen låser formen mod utilsigtet flytning og øjet skjuler den. Pilen yderst til venstre folder indstillingerne ned til deres titellinje.
Kortene nedenfor folder ud og ind ved et klik på deres titel ({{ui:inspector.properties}}, {{ui:inspector.position}}, {{ui:inspector.rotation}}, {{ui:inspector.taper}}, {{ui:inspector.twist}} og kortene til de særlige former); layerling husker hvilke du lod åbne, til næste form og næste besøg.

Indstillingerne sidder docket ved højre kant. Hvis de dækker noget du vil se, så træk dem i deres titellinje og de flyder hvor du slipper dem; de bliver der for den næste form også. Slip dem tilbage øverst til højre, eller dobbeltklik titellinjen, og de docker igen. Mens de flyder eller er foldet ned, flytter snap-trinnet sig fra bunden af indstillingerne til nederst til højre på arbejdsplanet.

![Indstillingerne for en cylinder: solid eller hul, diameter og højde som tal og som skyder.](shot:editor-overview)

- **{{ui:inspector.solid}} eller {{ui:inspector.hole}}:** En solid bliver, et hul tager materiale væk. Et klik på {{ui:inspector.solid}} åbner farverne; dine egne farver du blander der venter under {{ui:inspector.recentColors}} bagefter, de seneste otte. Mere i [Solider og huller](chapter:solids-and-holes). Knappenålen i rækken {{ui:inspector.keptColors}} gemmer den valgte farve for altid: Den står i en række for sig, nyere farver skubber den aldrig ud, og den samme nål slipper den igen; op til 21 farver gemmes i denne browser.
- **{{ui:inspector.transparent}}:** Lader dig se igennem formen, for eksempel for at finde en form bag den.
- **{{ui:inspector.multicolor}}:** For en gruppe eller et bundt; [[Shift]]+[[M]] slår den til. Slået til vises hver del af gruppen i sin egen farve, også i en gruppe der er skåret med huller til én form (væggene et hul efterlader tager farven på den form de er skåret ind i). At vælge en farve for gruppen slår det fra og farver hele gruppen; delene beholder underneden deres egne farver, så de kommer tilbage når den slås til igen. Et bundt har den slået til fra starten, og når den er slået fra vises og eksporteres bundtet i én farve. I en 3MF-eksport beholder hver del sin farve, så sliceren kan mappe delene til filamenter; OBJ bærer farverne på sine punkter, så kanten mellem to farver er lidt grovere der.
- **{{ui:inspector.properties}}:** Dimensionerne og alt hvad der hører til denne form. For en cylinder diameter, højde og antal sider. For et tandhjul tænderne, for en fjeder vindingerne. En værdi du har flyttet væk fra dens standard får en lille pil ved siden af sit navn: et klik tager kun den værdi tilbage, uanset hvad du ellers har gjort siden, i modsætning til Fortryd. Trukket med musen snapper en længdes skyder til snap-trinnet, så en højde bliver i hele millimeter (ikke med gitteret fra, og ikke på korte skydere); en tastet værdi og piletasterne på skyderen forbliver nøjagtige. {{ui:inspector.saveDefaults}} nederst gør de aktuelle værdier til startværdier for denne formtype (det samme som {{ui:workspace.shapeDefaults}} i indstillingerne), og {{ui:inspector.resetDefaults}} går tilbage til appens egne.
  For et rundt rør eller en ring er det {{ui:prop.outerDiameter}}, {{ui:prop.innerDiameter}} (til en bøsning på en aksel med kendt størrelse) og vægtykkelsen: to af dem giver den tredje, i den rækkefølge du taster dem. Den ydre diameter bevarer boringen og ændrer væggen, den indre diameter bevarer den ydre og ændrer væggen, og en boring bredere end røret får den ydre diameter til at vokse med væggen. Rørets længde er dets højde. Et rør der ikke er rundt, efter at du har trukket en af dets sider, har siderne Længde og Bredde i stedet for den ene ydre diameter; der forbliver væggen, når du ændrer bredden. Med {{ui:prop.tubeBoreHole}} tæller boringen som et hul, når røret grupperes: den skærer så også væggen i det, røret grupperes med, så to rør i en T-samling åbner ind i hinanden. Et bøjet rør med en åbning har den samme indstilling.
- **{{ui:inspector.makeEllipse}}:** Kun på en cylinder. En cylinder er altid rund: den har én diameter, og hvert håndtag ændrer begge sider sammen. For en oval, klik her og den bliver til en {{ui:shape.ellipse}} - den samme form, hvis længde og bredde du så sætter én ad gangen. En cylinder med fas, rund eller væg, eller en vendt eller grupperet, kan ikke ændres på denne måde; tag {{ui:shape.ellipse}} fra starten til dem.
- **{{ui:inspector.taper}}:** Forskellige størrelser foroven og forneden, for eksempel til en hældning eller en tragt.
- **{{ui:inspector.twist}}:** Snoer toppen mod bunden eller flytter den sideværts. Det giver snoede søjler og hældende tårne.

![En gruppe af en orange blok, en blå pind og et hul, skåret til én form. Med Multicolor slået til, forbliver pinden blå, blokken orange, og hullets vægge tager blokkens farve.](shot:group-multicolor)

Spids og snoing virker på næsten alle former. Kun tandhjulet, gevindet, fjederen, riflingen, hængslet, pyramiden, bøjede rør, dråbehullet, skruehovedskærerne og linealen udelader dem: de har faste mål af deres egne eller, som pyramiden, en top af sin egen i forvejen.

![En kegle hvis topradius og højde blev ændret: en lille pil ved hver tager værdien tilbage, og de to knapper nederst gemmer eller nulstiller formens standarder.](shot:property-reset)

{{ui:inspector.saveDefaults}} husker det, du har ændret på denne form, som start for hver ny form af samme slags: målene, formens indstillinger og dens farve. Farv en cylinder grøn og tryk på knappen, så er hver cylinder, du tilføjer bagefter, grøn; de andre slags beholder deres egne farver. {{ui:inspector.resetDefaults}} stiller slagsen tilbage til det, programmet starter den med. Hvilke slags der har egne standarder, er markeret i indstillingerne under {{ui:workspace.shapeDefaults}}. Et nyt design, du starter fra startsiden, begynder også med dem; værdierne huskes i denne browser.

En spids eller hældende kasse, cylinder, ellipse, polygon, rør eller ring bevarer sin eksakte form, og det samme gør kapslen, stjernen, hjertet, halvmånen, svalehalen, en rundet kasse uden rundede top- og bundkanter og en lige eller rund rifling (dens fasede ender smalles med den): fas og rund virker på den som på den almindelige form, og STEP-eksporten skriver den. Det samme gælder for en snoet form: dens tværsnit drejer nøjagtigt når det stiger, og siderne snor sig jævnt fra bund til top.

At taste er mere nøjagtigt end at trække. Alle talfelter tager millimeter, men også procenter: tast "50 %" ind i en bredde på 40 mm og du får 20 mm. De beregner også: "15*3", "120-2*4" eller "(40+2)/2" giver 45, 112 og 21; x virker i stedet for *. Feltet husker beregningen, i egenskabspanelet såvel som i dimensionsboksene omkring den valgte form: klik ind i det igen senere og formlen står der i stedet for tallet, så længe værdien stadig passer til den, og du ændrer den på stedet, "(140+2)/2" bliver til "(40+6)/2". Træk formen i et håndtag eller skalér den og formlen passer ikke mere, så feltet viser kun tallet igen. I et talfelt, du har klikket på, ændrer musehjulet og tasterne [[↑]] og [[↓]] værdien et trin, med [[Shift]] et større trin og med [[Alt]] et finere. I et felt for størrelse eller position går [[Shift]] i stedet et gittertrin, og ti trin når gitteret er slået fra.

### Vælg farver

Et klik på {{ui:inspector.solid}} i egenskaberne for en form åbner farvekortet, med overskriften {{ui:inspector.shapeColor}}. Øverst viser det hexværdien af den farve, formen har nu. Under det ligger palettens færdige farver; et klik på en farver formen og lukker kortet.

{{ui:inspector.custom}} åbner browserens farvevælger, til en farve af dine egne. Hvad den tilbyder afhænger af browseren: i Chrome og Edge har den et farvefelt, en skyder for nuancen, en pipette der tager en farve fra hvor som helst på skærmen, og værdien som HEX, RGB eller HSL, som du skifter mellem med pilene ved siden af den. Farven tæller, når du lukker vælgeren eller klikker uden for den.

En farve af dine egne, du blander der, venter bagefter under {{ui:inspector.recentColors}}, de seneste otte. Knappenålen i rækken {{ui:inspector.keptColors}} gemmer den valgte farve for altid: den står i en række for sig, nyere farver skubber den aldrig ud, og den samme nål slipper den igen; op til 21 farver gemmes i denne browser. Nålen er til farver af dine egne, palettens farver er altid der. Med flere farver valgt, eller med et hul, er der ingen enkelt farve at gemme.

Farverne i arbejdsområdet i indstillingerne har deres egen enklere vælger, med et farvefelt, en række færdige farver og et felt til hexværdien; se [Indstillingerne](chapter:view-and-workplane).

## Hvor rund er rund? Antal sider

Runde former som cylinder, kegle, rør, ellipse eller boringer har kontakten {{ui:prop.sidesFollowSize}} og skyderen {{ui:prop.sides}} i deres egenskaber. {{ui:shape.torus}} har to skydere: {{ui:prop.torusSides}} rundt om ringen og {{ui:prop.torusSteps}} rundt om røret. De følger størrelsen der også indtil du holder dem, så en stor torus viser ingen flader. Årsagen: til visning og til STL, 3MF og OBJ tegner layerling en cirkel som en polygon af mange små sider. Jo flere sider, jo glattere er den, og jo flere trekanter bruger den.

{{ui:prop.torusTube}} bestemmer, hvor tykt røret er set ovenfra. Højden trykker eller strækker kun røret, så en flad ring beholder sit hul; ved halvdelen af det ydre mål lukker hullet. Trækker du i håndtagene, skalerer røret med. Kun en torus, hvis rør er lige så tykt, som torussen er høj, forbliver et eksakt legeme til fas, rund og STEP.

**Hvor antallet af sider betyder noget**

- **I eksporten til sliceren** (STL, 3MF, OBJ). En cylinder med få sider ankommer der som en polygon.
- **Når former og huller kombineres.** En boring skåret af et hul med få sider er kantet i den færdige del. Det inkluderer skruehuller.
- **I visningen.** Mange meget fine former sænker editoren.

**Hvor det ikke betyder noget**

- **Til STEP-eksporten.** Den skriver den runde form, ikke polygonen.
- **Til fas og rund** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}) så længe formen forbliver rund. Det er tilfældet når du ikke har sat et antal sider, når antallet er mindst formens standard, eller når polygonen afviger højst {{value:EXACT_ROUND_TOLERANCE}} mm fra cirklen. Standarden er {{value:ROUND_FROM_SIDES}} sider for cylinder, ellipse, rør og kegle, {{value:ROUND_FROM_ROOF_SIDES}} for {{ui:shape.roundRoof}}, {{value:ROUND_FROM_SPHERE_STEPS}} trin for {{ui:shape.sphere}}, {{value:ROUND_FROM_HALF_SPHERE_STEPS}} for {{ui:shape.halfSphere}}, {{value:ROUND_FROM_TORUS_SIDES}} sider og {{value:ROUND_FROM_TORUS_STEPS}} trin for {{ui:shape.torus}}, og en {{ui:prop.quality}} på {{value:ROUND_FROM_BENT_TUBE_QUALITY}} for et rundt {{ui:shape.bentTube}}.
- **For et gevind, en fjeder eller et helisk tandhjul.** Kantværktøjet og STEP-eksporten tager dens eksakte form; dens {{ui:prop.quality}} sætter kun hvor fint den tegnes.

**Hvor det betyder noget igen**

- **Til fas og rund på en form med få sider.** Hvis du sætter antallet af sider under standarden, tager kantværktøjet formen som den er tegnet: en cylinder med 6 sider forbliver en sekskantet stang, og runding løber rundt om dens seks kanter. Sådan kan du for eksempel bygge en møtriklomme med rundede hjørner. For en rund form, lad {{ui:prop.sidesFollowSize}} stå til.

**Sådan bruger du det**

- **Lad {{ui:prop.sidesFollowSize}} stå til.** Så vælger layerling antallet af sider ud fra diameteren så polygonen afviger højst {{value:ROUND_DEVIATION_TOLERANCE}} mm fra den sande cirkel, langt under hvad en printer opløser. Små former får mindst {{value:MIN_AUTOMATIC_SIDES}} sider, store flere.
- **Færre sider** tager du når du vil have en polygon med vilje (men der er {{ui:shape.polygon}} til det) eller når editoren bliver langsom med meget mange runde former.
- **Flere sider** har du næsten aldrig brug for. Kun på meget store runde dele, når du ser kanter i STL'en.
- **For dele du kun behandler med kanter eller giver videre som STEP,** betyder antallet af sider ikke noget.

## Arbejde med håndtagene

Ved siden af indstillingerne er der håndtag på selve formen:

- **Hjørnerne og kanterne** gør formen større eller mindre. Hold [[Shift]] mens du trækker et hjørne for at skalere bredde, dybde og højde sammen og bevare proportionerne; hold [[Alt]] for at skalere fra midten i stedet for det modsatte hjørne. Uden et tastatur, eller hvis du ikke vil holde en tast nede, så slå {{ui:inspector.keepProportions}} til øverst i egenskaberne: så bevarer hjørnerne altid proportionerne, og at taste én af bredde, dybde eller højde skalerer de to andre med den samme faktor. Indstillingen huskes.
  Trækker du en kant forbi den modsatte side, vokser formen stadig der, på den anden side af den kant. Pilen øverst gør det samme under bunden.
- Den sorte **pil over** formen løfter eller sænker den; med [[Alt]] holdt nede fra start opstår en kopi, hvor du slipper, så du kan stable. Det hvide håndtag **på overfladen** ændrer højden.
- **De buede pile** roterer den.
- **Tallene** ved siden af formen viser dimensionerne. Et klik på én åbner et felt hvor du taster det tal du vil have. Med [[Enter]] vokser formen fra den kant der er modsat tallet, som når du trækker; med [[Alt]]+[[Enter]] vokser den omkring sin midte, så en form der var justeret med en anden forbliver justeret. Er {{ui:inspector.keepProportions}} slået til i egenskaberne, eller holder du [[Shift]]+[[Enter]], følger de to andre mål den samme faktor. Det gælder for bredde og længde; højden vokser altid opad fra undersiden. Felterne i egenskaberne til højre bevarer midten uden en tast. [[Tab]] beholder tallet og åbner det næste (bredde, dybde, højde); [[Shift]]+[[Tab]] går tilbage. I et felt i egenskaberne, du har klikket på, ændrer musehjulet også værdien: en enhed pr. tak, ti gange så meget med [[Shift]], en tiendedel med [[Ctrl]] og en hundrededel med [[Alt]]. Et felt, du ikke har klikket på, overlader hjulet til panelet, som ruller.
- Et **klik på et hjørne** (uden at trække) åbner bredde og dybde sammen. Tast den første, tryk [[Tab]] for den anden og [[Enter]] for at anvende begge. [[Esc]] annullerer.

Når en form først er vendt med rette vinkler, for eksempel lagt på siden med {{ui:editor.tool.layFlat}}, navngives felterne i egenskaberne efter den retning hvert mål nu løber i: {{ui:prop.height}} er hvad der går op, {{ui:prop.width}} løber langs X og {{ui:prop.length}} langs Y. At taste højden af en form der ligger ned ændrer derfor det lodrette mål, og dens underside bliver på pladen. En form der hælder i en hvilken som helst anden vinkel viser sine egne mål i felterne, og en bemærkning nedenunder siger det.

Uden musen, brug tastaturet: piletasterne flytter markeringen med ét snap-trin (0,01 mm når gitteret er fra), med [[Shift]] med fem, eller med ti hvis du sætter {{ui:workspace.gridMajorEvery}} til {{ui:workspace.gridMajorSteps|10}} i indstillingerne under {{ui:workspace.appearance}}: så langt som den næste mørkere linje, som i Tinkercad. De følger visningen: [[→]] flytter til hvor skærmens højre er, [[↑]] væk fra dig, også efter at have vendt pladen. Skub en form ud af billedet og visningen følger med. [[Ctrl]]+[[↑]] og [[Ctrl]]+[[↓]] hæver og sænker den. [[R]] roterer 45°, [[Shift]]+[[R]] 22,5°. [[D]] lægger markeringen ned på arbejdsplanet.

Håndtagene trækker en form så stor som din plade, mindst 220 mm bred og dyb. At taste et tal i egenskaberne går ud over det, og en form der er lavet så stor krymper ikke tilbage når du griber den igen. Et loft af dit eget per form sættes i indstillingerne under {{ui:workspace.shapeDefaults}} med {{ui:workspace.customLimit}}.

Snap-trinnet er nederst til højre i editoren og kan ændres når som helst.

## Kopiering og duplikering

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} og {{ui:editor.tool.duplicate}} er i båndet ({{ui:editor.group.clipboard}}). [[Ctrl]]+[[D]] duplikerer en markering. layerling husker hvordan du sidst flyttede eller roterede kopien og anvender det samme igen ved næste duplikering. Det giver en række huller eller trin i få tastetryk. For regelmæssige arrangementer er der også mønsteret, beskrevet i [Valg og arrangering](chapter:select-and-arrange).

> **Tip:** Hvis en form nægter at tage den størrelse du vil have, er det ofte grænserne for nye former. Under {{ui:workspace.shapeDefaults}} i indstillingerne bestemmer du hvordan hver form starter og hvor stor den må blive.

## Egne former

En holder, et greb eller en grundplade du har brug for igen og igen kommer i {{ui:myShapes.title}}. De sidder øverst i formbiblioteket, over {{ui:myShapes.basicShapes}}, og folder sig væk med deres pil.

1. Vælg en eller flere former, huller, grupper eller en importeret model inkluderet.
2. Åbn formbiblioteket og klik på {{ui:myShapes.saveSelection}}. Indtast et navn og bekræft med {{ui:common.save}}.
3. I et hvilket som helst design indsætter et klik på flisen formen, som enhver anden form. Du kan også trække flisen ind på arbejdsplanet; den lander så dér hvor du slap. Formen hænger derefter på markøren som enhver anden: Den følger den, også over andre legemers flader, et klik sætter den ned, [[Esc]] lægger den væk.

Flere former kommer tilbage sammen, placeret som de stod i forhold til hinanden, og forbliver valgbare én ad gangen. [Noter](chapter:measuring-and-notes) der er sat fast på de gemte former kommer med og kommer tilbage lukket, sat fast på de indsatte; frie noter og referencepunkter bliver i designet. Blyanten på en flis omdøber den, skraldespanden fjerner den efter at have spurgt. Former der allerede er indsat i designs forbliver som de er.

{{ui:myShapes.title}} lever i denne browser, adskilt fra designsene, og er der igen næste gang du starter. {{ui:dashboard.backupAll}} på startsiden sikkerhedskopierer dem med designsene, og åbning af sikkerhedskopien bringer begge tilbage. For kun at tage formerne til en anden browser, {{ui:myShapes.backup}} (pil ned) gemmer dem som en ZIP-fil og {{ui:myShapes.load}} (pil op) bringer dem tilbage der. {{ui:myShapes.load}} tager også enkelte `.lyl`-designs; hver bliver til en form. Former der allerede er der, tilføjes ikke to gange.

### Mapper

Mange egne former sorteres bedre i mapper. {{ui:myShapes.newFolder}} (mappen med plus ved siden af {{ui:myShapes.saveSelection}}) beder om et navn og laver en mappe øverst; mappen med plus på en mappe, {{ui:myShapes.newSubfolder}}, laver en mappe inden i den. Mapper går tre niveauer ned: En mappe på tredje niveau rummer former, men ikke flere mapper. Mapper står over de former, der ikke ligger i nogen mappe, sorteret efter navn, og foldes ud og sammen med deres pil; tallet ved en mappe tæller formerne i den og i mapperne under den. Når du gemmer, vælger du mappen i listen ved siden af navnet; med {{ui:myShapes.noFolder}} bliver formen øverst.

Mappen med pilen på en flise flytter formen til en anden mappe, eller ud igen med {{ui:myShapes.noFolder}}. Blyanten ved en mappe omdøber den, skraldespanden sletter den efter at have spurgt, sammen med mapperne og formerne i den. En mappe kan ikke selv flyttes: Lav den nye, hvor den hører hjemme, og flyt formerne derhen. En sikkerhedskopi beholder mapperne, og når den indlæses, kommer formerne tilbage på samme sted. På serveren er mapperne mapper i `Custom shapes`.

### Egne former på serveren

Med [delt serverlager](chapter:files-and-saving) slået til viser sektionen to grupper: {{ui:myShapes.onServer}} og {{ui:myShapes.inBrowser}}. Når du gemmer vælger du hvor formen skal hen; serveren er valgt til at starte med. Der ligger den i mappen `Custom shapes`, som en `.lyl`-fil for sig selv med et billede, klar på hver enhed der når serveren. Skyen på en browser-flis lægger den form på serveren; den gemmes så ikke to gange.
 Dens mapper er mapper inde i `Custom shapes`. Hver side har mapper af sine egne, og en form flytter mellem mapperne på sin side.

Mappen `Custom shapes` vises også på startsiden. Åbn en form der som et design, redigér den, og den gemmes automatisk som ethvert design på serveren; næste indsættelse tager den nye version. Da serverlageret ikke har login, ser alle der når serveren de samme former.

## Vikle rundt om en cylinder

Skal et mønster, en logo eller bogstaver på en kop, en dåse eller et rør? Læg det først fladt på pladen, som en importeret SVG eller som tekst for eksempel, som det skal se ud oppefra. Vikl det så rundt om en cylinder i formens indstillinger under {{ui:inspector.wrapCylinder}}:

1. Åbn {{ui:inspector.wrapCylinder}} og indtast {{ui:inspector.wrapDiameter}} på cylindervæggen, såsom yderdiameteren på din kop. Tiendedele millimeter virker også, såsom 63,5.
2. Klik på {{ui:inspector.wrapApply}}. Hvad der løb fra venstre til højre løber nu rundt om cylinderen, bagkanten bliver toppen, og tykkelsen står ud af væggen.
3. Vælg den viklede form og cylinderen og centrér begge, venstre mod højre og for mod bag. Midten af den viklede form er cylinderens akse, så det sidder så præcis på væggen.

Til en gravering, slå {{ui:inspector.wrapInward}} til: tykkelsen går så ind i væggen. Gør formen til et hul, centrér den og gruppér den med cylinderen.

En form der allerede er viklet, er et mesh af det viklede og kan ikke vikles igen: fortryd viklingen, eller vikl den flade original igen med en anden diameter.

Resultatet er et mesh som en importeret model. Fortryd lægger formen fladt ud igen; for en anden diameter, fortryd først og vikl igen. Det kan ikke gå længere end én gang rundt om cylinderen; så navngiver layerling den mindste diameter der passer.

## Overfladestruktur

Riller, riflinger, bikager eller knopper på et legeme, for bedre greb eller for udseendet: åbn {{ui:inspector.surfaceTexture}} i legemets indstillinger. Knappen {{ui:inspector.surfaceTexture}} i gruppen {{ui:editor.group.modify}} foroven gør det samme: den åbner og lukker kortet for det valgte legeme og forbliver tændt, mens kortet er åbent.

1. Vælg {{ui:inspector.surfacePattern}}, dets {{ui:inspector.surfaceSpacing}} og dets {{ui:inspector.surfaceDepth}}. {{ui:inspector.surfaceDirection}} siger, om mønsteret går ind i legemet eller ud af det. For {{ui:surfaceTexture.bumps}} vælger {{ui:inspector.surfaceBumpShape}} mellem {{ui:surfaceTexture.bumpDome}}, {{ui:surfaceTexture.bumpCone}}, {{ui:surfaceTexture.bumpSoft}} og {{ui:surfaceTexture.bumpFlat}}.
2. Under {{ui:inspector.surfaceProjection}} vælger du {{ui:surfaceTexture.cylinder}} til runde legemer som en kop, en knob eller et håndtag. Mønsteret løber omkring {{ui:inspector.surfaceAxis}}, og afstanden rundes en smule, så et helt antal riller eller celler går rundt: mønsteret lukkes uden en søm. {{ui:surfaceTexture.allRound}} passer til legemer, der ikke er runde, {{ui:surfaceTexture.flatProjection}} til et låg eller en plade set fra oven. Lad den stå på {{ui:surfaceTexture.auto}}, så vælger layerling for dig: {{ui:surfaceTexture.cylinder}} på runde legemer og på oprejste kantede som en kasse – så følger mønsteret omridset og løber uden søm rundt om kanterne, og et hævet mønster lægger sig rundet om dem –, {{ui:surfaceTexture.allRound}} på andre kantede.
3. Klik på {{ui:inspector.surfaceApply}}. Et stort legeme tager nogle få sekunder; du kan fortsætte med at arbejde imens.

Skal kun nogle af fladerne have mønsteret, for eksempel kun toppen af en kasse, så klik på {{ui:inspector.surfaceFacesPick}} og derefter på fladerne i visningen: toppen, bunden eller en side. En flade går op til legemets skarpe kanter; på en cylinder er kappen én flade, og toppen og bunden er hver én. Valgte flader lyser op, et klik mere tager en ud igen, og {{ui:inspector.surfaceFacesClear}} giver mønsteret hele legemet igen. Kun de valgte flader får mønsteret; alle andre forbliver som de var og beholder få trekanter. På en top eller en bund ligger mønsteret fladt; på en rund top løber riller, reb og strik i ringe om midten, som et træs årringe. {{ui:inspector.surfaceFaceTurn}} drejer mønsteret på toppen og bunden: ved 0° løber rækkerne langs forkanten, ved 90° langs sidekanten. {{ui:inspector.surfaceCapStyle}} skifter riller, reb og strik der mellem rækker og ringe; på et kantet legeme følger ringene omridset. {{ui:inspector.surfaceCapEdge}} afgør, hvad der sker ved kanten mellem siden og en top eller bund med mønster: {{ui:surfaceTexture.edgeSharp}} lader begge slutte ved kanten. Med {{ui:surfaceTexture.edgeOver}} bøjer sidens mønster rundt over kanten og fylder hele toppen: rækker af reb, strik og vandrette riller fortsætter som ringe, lodrette og skrå riller som stråler næsten ind til midten. {{ui:surfaceTexture.edgeFold}} gør det samme kun som en kant; indeni ligger toppens eget mønster, som {{ui:inspector.surfaceCapStyle}} indstiller det. {{ui:surfaceTexture.edgeBead}} lægger ved alle mønstre en indfatning rundt om kanten – en snor, en aflukningskæde eller en rund vulst.

Under {{ui:inspector.more}} vælger du, hvor mønsteret sidder: ydre og indre vægge, hvor langt bunden og toppen forbliver glat (en glat bund holder legemet fladt på pladen), et bånd af højden, og om skarpe kanter skal forblive glatte. Lige uden for alt det, der forbliver glat, toner mønsteret ind; {{ui:inspector.surfaceFade}} sætter over hvor mange millimeter. Jo mindre, desto tættere kommer mønsteret på en kant; et hævet mønster løber ud helt ind til den. På de flade sider af et kantet legeme som en terning ender mønsteret i stedet ved en lige kant derude: riller og diamanter stopper med en kort væg, og kun hele knopper bliver tilbage. {{ui:inspector.surfaceProfile}} former tværsnittet af en rille eller en fuge: spids og flad kommer ud præcis, mens rund får så mange trin som {{ui:inspector.surfaceDetail}} giver den.

Ud over {{ui:surfaceTexture.grooves}}, {{ui:surfaceTexture.knurl}}, {{ui:surfaceTexture.honeycomb}} og {{ui:surfaceTexture.bumps}} er der flere mønstre. {{ui:surfaceTexture.cells}} er uregelmæssige celler som gulvsten eller tørret ler; deres fuger skæres rent, som i bikager, og en anden {{ui:inspector.surfaceSeed}} lægger dem ud på ny. {{ui:surfaceTexture.knit}}, {{ui:surfaceTexture.rope}} og {{ui:surfaceTexture.weave}} kopierer strikkede masker, et vundet reb og en kurv flettet af stave og vævere; de begynder ophøjede og runde, i størrelsen af deres forbilleder. {{ui:surfaceTexture.grain}} gør overfladen fint ru, som om den var sandblæstret; kornet ligger i rummet, uden søm og uden strækning. {{ui:surfaceTexture.image}} tager et gråt billede som højdekort: et af de færdige, som træ, topografi eller terrazzo, eller dit eget med {{ui:inspector.surfaceImageLoad}}. Lyst bliver til fuld dybde; {{ui:inspector.surfaceSpacingImage}} sætter, hvor bred en flis er, og under {{ui:inspector.surfaceImageTiling}} gentages fliserne, spejles eller forskydes.

{{ui:surfaceTexture.carbon}} lægger kulfiber vævet i kiper på legemet: stående bånd og tværbånd, over og under hinanden, forskudt ét bånd fra bånd til bånd, så den kendte diagonal kommer frem. {{ui:inspector.surfaceCarbonWeave}} vælger {{ui:surfaceTexture.carbonTwill22}}, det jævne væv på de fleste kulfiberdele, eller {{ui:surfaceTexture.carbonTwill21}} og {{ui:surfaceTexture.carbonTwill31}}, hvor de stående bånd ses lange og tværbåndene korte. {{ui:inspector.surfaceSpacingCarbon}} bestemmer, hvor brede de stående bånd er; {{ui:inspector.surfaceCarbonCross}} gør tværbåndene bredere eller smallere for et ujævnt væv (0: lige så brede). Rundt om et legeme rundes båndbredden lidt af, så vævet lukker sig uden søm. Selve fibrene er alt for fine til et print: det, man ser, er båndene med deres krydsninger.

{{ui:surfaceTexture.bricks}} lægger en murstensmur på legemet med forsænkede fuger som mørtel. {{ui:inspector.surfaceBrickBond}} vælger, hvordan stenene ligger: {{ui:surfaceTexture.bondRunning}} som de fleste mure, {{ui:surfaceTexture.bondStack}} eller med korte sten mellem de lange ({{ui:surfaceTexture.bondEnglish}}, {{ui:surfaceTexture.bondEnglishCross}}, {{ui:surfaceTexture.bondFlemish}}). {{ui:inspector.surfaceSpacingBricks}} og {{ui:inspector.surfaceBrickHeight}} tælles fra fuge til fuge og rundes lidt af, så hele sten passer: rundt om et krus, fra kant til kant på en side af en æske og fra bunden til toppen; {{ui:inspector.surfaceBrickJoint}} siger, hvor brede fugerne er. Under {{ui:inspector.more}} lader {{ui:inspector.surfaceBrickVary}} hver sten ligge lidt dybere, som i en gammel mur.

Mønsteret {{ui:surfaceTexture.cracks}} lader sprækker vokse hen over overfladen som i kintsugi, med knæk, forgreninger og en bredde, der løber ind mod enden. {{ui:inspector.surfaceCrackStart}} siger, hvor de begynder: ved topkanten af en vase eller en kop, i bunden, fra kanten til midten af en plade, eller overalt; under {{ui:inspector.surfaceCrackStyle}} bliver de til lyn. Med {{ui:inspector.surfaceCrackGold}} fyldes hakket af en selvstændig del i guld, til et andet filament; den følger med, når du ændrer eller fjerner strukturen. Under {{ui:inspector.more}} sætter du forgreninger, zigzag og skårede kanter, og en anden {{ui:inspector.surfaceCrackSeed}} kaster sprækkerne på ny.

{{ui:surfaceTexture.bark}} lægger et træs bark rundt om en stamme: {{ui:surfaceTexture.barkOak}}, {{ui:surfaceTexture.barkPine}}, {{ui:surfaceTexture.barkSpruce}}, {{ui:surfaceTexture.barkBirch}} eller {{ui:surfaceTexture.barkBeech}}, hver i sin egen størrelse og dybde. {{ui:surfaceTexture.wood}} gør legemet til et stykke træ: under {{ui:inspector.surfaceWoodType}} vælger du eg, ask, bøg, fyr eller valnød, under {{ui:inspector.surfaceWoodCut}} en stamme uden bark eller en planke, fladskåret med sine buer eller kvartskåret med lige linjer. {{ui:inspector.surfaceRingWidth}} gør årerne fine eller grove. Med {{ui:inspector.surfaceEndRings}} viser enderne af en stamme årringene, og de passer til årerne på siderne: ringene løber gennem hele legemet som i et ægte stykke træ. Under {{ui:inspector.more}} tilføjer du {{ui:inspector.surfaceWoodKnots}}, og ringene bøjer sig om dem.

Med mønsteret {{ui:surfaceTexture.text}} klæber du en tekst på legemet som et påtrykt mærkat: overfladen rulles ud omkring stedet, så bogstaverne beholder deres størrelse på en vases bug, på en skrå væg eller over kanten af en kasse. „Rundt om“ (0° er forsiden, 90° er højre side) og „Højde“ i % langs aksen siger, hvor den sidder; med aksen på X eller Y er 0° toppen – det lægger teksten på en flad plade. {{ui:inspector.surfaceDirection}} graverer den ind eller rejser den op. Over en rigtig kant river den i sig som et klistermærke; statuslinjen siger det så. Her stabler {{ui:prop.textVertical}} også bogstaverne under hinanden.

For at holde en del af legemet glat, eller for kun at give en del struktur, bruger du et hjælpelegeme: læg en kasse, en cylinder eller en kugle der, hvor den skal være, vælg den, og vælg under {{ui:inspector.surfaceMask}} enten {{ui:surfaceTexture.maskExclude}} eller {{ui:surfaceTexture.maskOnly}}. Den bliver gennemsigtig, og den tæller med, når det andet legeme får sin struktur, også mens den er skjult. Skjul eller slet den inden printning.

Resultatet er et mesh som en importeret model, og det bevarer det legeme, det blev lavet på. Vælg det senere, også efter at have gemt, og kortet viser de indstillinger, det blev lavet med: ændr dem, og klik på {{ui:inspector.surfaceChange}}, så laves strukturen igen på det legeme, samme sted og i den størrelse som det har nu. {{ui:inspector.surfaceRemove}} giver det glatte legeme tilbage. Maskelegemer tæller med igen, når strukturen ændres: skjul dem frem for at slette dem, hvis du må ændre den igen senere. Fortryd tager hvert af disse skridt tilbage.

## En vase

{{ui:shape.vase}} er et legeme for sig til vaser, potter og lampeskærme. Dine mål står under {{ui:inspector.properties}}, formen og mønsteret på kortet {{ui:inspector.vaseForm}}; alt sammen kan ændres når som helst, også efter at have gemt:

- {{ui:prop.vaseProfile}}: flaske, buget, skål med hals, tønde, cylinder eller tragt. Højden og den bredeste diameter er formens egne mål: træk i håndtagene, eller tast {{ui:prop.vaseDiameter}} og {{ui:prop.height}}.
- {{ui:prop.vaseSection}}: en cirkel, et polygon med rundede hjørner eller en bølge (blød, spids, buer eller finner). {{ui:prop.vaseTwist}} drejer tværsnittet op ad højden, {{ui:prop.vaseSway}} får det til at svinge frem og tilbage.
- {{ui:prop.vaseBody}}: {{ui:vase.bodySolid}} er til slicerens vasemodus (også kaldet spiralize): sliceren printer én væg i en spiral og lader top og fyldning være, så kroppen tegnes massiv. {{ui:vase.bodyHollow}} giver en rigtig væg og bund til et normalt print. Med {{ui:prop.vaseBottom}} på 0 mm har den hule vase ingen bund: et rør, åbent i begge ender, til lydtragte, mundstykker og rør.
- {{ui:prop.vaseEffect}}: en ny vase er glat. Der er riller, striber, Voronoi-celler eller facetter (low poly) at vælge imellem på ydersiden, i et bånd af højden hvis du vil; de hører til vasen og bliver redigerbare sammen med den.

{{ui:prop.vaseSection2}} blander tværsnittet ind i et andet op ad højden, for eksempel fra en cirkel i bunden til en sekskant i toppen.

{{ui:inspector.vaseDraw}}, højt oppe i vasens indstillinger, åbner et stort vindue af sit eget over arbejdsplanet: i det tegner du vasen selv, i rigtige millimetre. Du flytter det ved sin titelbjælke og gør det større fra sit hjørne; vasen i visningen følger hver ændring. {{ui:vaseDraw.tabProfile}} viser den fra siden: træk i punkterne, det øverste sætter højden, det bredeste diameteren; {{ui:vaseDraw.handle}} giver et punkt en vinkel, {{ui:vaseDraw.corner}} et knæk. {{ui:vaseDraw.tabSection}} viser tværsnittet fra oven, og {{ui:prop.vaseDrawSymmetry}} spejler eller gentager det, du tegner. {{ui:vaseDraw.tabTwist}} tegner snoen som en kurve op ad højden. En SVG-fil fra et tegneprogram bliver tværsnittet eller kropsformen, meshet af en modelvase (STL, 3MF, OBJ) kropsformen. Et foto af en vase kan lægges bag tegningen for at aftegne, eller {{ui:vaseDraw.takeOutline}} tager dens omrids. Ét træk med musen er ét trin i Fortryd; mens du trækker, viser visningen vasen nogenlunde.

Kortet {{ui:inspector.vaseFloor}} rummer det, kroppen uden form har brug for. På en hul vase: drænhuller med en hældning mod dem, en hul fod, en åben væg ({{ui:prop.vaseCutout}}: Voronoi, bikube, diamanter eller cirkler, til lanterner og kurve) og en {{ui:prop.vaseLamp}}, hængende, stående på en fatning eller over en LED-puck. På en massiv vase skærer {{ui:prop.vaseReinforce}} fine slids, hvorigennem sliceren printer ribber indeni eller en dobbelt væg i sin vasemodus, i én kørsel. Fordybninger til gummifødder kan bruges til begge. {{ui:prop.vaseWatertight}} hæver væggen og bunden på en hul vase til mindst 1,6 mm.

På kortet {{ui:inspector.vaseParts}} får vasen sit tilbehør. {{ui:prop.vaseLegs}} kan være formet på, så de er en del af vasen, eller laves til at stikke i, med bøsninger i bunden; et stativ holder vasen fra neden. En {{ui:prop.vaseSaucer}} opsamler vandet, eller gemmer sig i foden. En hul vase kan få en {{ui:prop.vaseInsert}}: en plantindsats, en med vandbeholder til en potte der vander sig selv, en holder til stangler eller vandrør. Et {{ui:prop.vaseLid}} glider over kanten, låser i en rille eller skrues på et gevind i væggen. {{ui:inspector.vasePartsMake}} lægger delene ud ved siden af vasen som selvstændige objekter, klar til print, omvendt hvor det printer bedre. Vasen har allerede bøsningerne, rillen eller gevindet. Efter at have ændret en indstilling lægger du dem ud igen: delene fra før bliver erstattet. Passer en del ikke til denne vase, siger programmet det, for eksempel når en indsats ikke ville komme igennem en smal hals.

Kortet {{ui:inspector.vasePrint}} fortæller hvad vasen kræver at printe: sin vægt i det valgte {{ui:prop.vaseMaterial}} og længden af filament – for en massiv vase udregnet til slicerens vasemodus, én linje langs væggen. Under det er der noter om at printe den: et overhæng på mere end 45° og hvor det sidder, en væg der er for tynd, hvad et låg, en lampe eller ben kræver, og slicerens indstillinger for ribber og en dobbelt væg.

{{ui:prop.vaseQuality}} sætter, hvor fint vasen deles i trekanter: finere ser glattere ud, men gør programmet langsommere ved store vaser.
