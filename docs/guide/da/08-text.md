---
title: Tekst og buede bogstaver
summary: Ophøjede eller graverede bogstaver i otte skrifter eller en af dine egne, og hvis du vil langs en cirkelbue, som på en mønt, et låg eller en ring.
---

## Tilføj tekst

Vælg {{ui:shape.text}} i formbiblioteket og placér den. I feltet {{ui:prop.text}} til højre skriver du hvad den skal sige. Indstillingerne nedenunder:

- **{{ui:prop.font}}:** Otte skrifter er tilgængelige: Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil (bogstaver lavet af lige linjer) og Japanese (Zen Maru Gothic). Ny tekst starter i Sans. Accenterede bogstaver som ä, ö, ü, é og €-tegnet er i hver skrift, og det samme gælder kana, de almindelige kanji og mange af de sjældnere i navne som 澤, 槇 og 檜: et japansk navn virker i hver skrift og på et navneskilt. De japanske bogstaver hentes, første gang en tekst skal bruge dem (de sjældne kanji i en anden fil, kun når en tekst har sådan et), så en sådan tekst viser spørgsmålstegn et øjeblik. De bliver gemt på computeren bagefter, så japansk også virker offline derfra. Dine egne fonte kommer øverst, se [Dine egne fonte](#dine-egne-fonte) nedenunder.
- **{{ui:nameTag.letterSize}}:** Hvor store bogstaverne er, set fra oven; {{ui:prop.height}} sætter hvor tykke de er.
- **{{ui:prop.height}}:** Hvor langt bogstaverne stikker ud fra overfladen.
- **{{ui:prop.bevel}}:** Rund bogstavkanterne så de ser blødere ud. Med {{ui:prop.segments}} bestemmer du i hvor mange trin.
- **{{ui:nameTag.letterEdge}}:** runder eller affaser bogstavernes overkant, som på et navneskilt: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} eller {{ui:nameTag.edge.chamfer}}, med {{ui:nameTag.letterEdgeSize}} (først 0,4 mm, højst lige så høj som teksten). Den går længere end {{ui:prop.bevel}}, men kun så langt, som stregerne er brede: hvor en streg er tyndere end to gange størrelsen, ender kanten i en smallere top. Undersiden forbliver flad, så enkelte bogstaver kan limes på bagefter. Så længe en kant er valgt, træder den i stedet for {{ui:prop.bevel}}.
- **Størrelse:** Du sætter længden og bredden som med enhver form. Træk håndtagene eller tast dimensionerne.
- **{{ui:prop.textSpacing}}:** Mellemrummet mellem bogstaverne ud over det, skriften selv giver, i procent af bogstavstørrelsen: 0 lader det være som skriften gjorde det, over står bogstaverne længere fra hinanden, under (ned til -50) tættere, hvilket ofte er nødvendigt for en font du selv har. Bogstaverne beholder deres størrelse, og boksen følger linjen, både på lige og på buet tekst. Mellemrummet anvendes ikke på arabisk og hebraisk, hvor bogstaverne binder sammen.
- **{{ui:prop.textStretch}}:** Fra starten er den slået fra: bogstaverne beholder deres proportioner og sidder midt i rammen, så en ramme der trækkes bredere eller dybere end ordet kræver, bliver større end bogstaverne. Slår du den til, strækkes bogstaverne, så de fylder hele rammen i begge retninger: et stort bogstav kan gøres lavere eller smallere, som i Tinkercad. Den er til lige tekst; buet tekst har sin egen bogstavstørrelse.
- **{{ui:prop.textVertical}}:** Stabler bogstaverne under hinanden, hver i midten af én lodret linje, til et skilt på en dørkarm eller et navn ned ad en kuglepen. Boksen bliver lodret, og bogstaverne beholder deres størrelse; {{ui:prop.textSpacing}} sætter mellemrummet mellem dem. Buet tekst har ikke en sådan indstilling.

Tekst er i starten én krop. Hvis du vil behandle bogstaverne enkeltvis, klik på {{ui:inspector.separateParts}}. Så er hvert bogstav sin egen form.

Bogstavers kanter kan også fases eller rundes, lige eller kurvede, se [Bryd kanter og hul former](chapter:edges-and-hollowing). Brug små størrelser som 0,2 til 0,5 mm, fordi bogstavernes streger er smalle.

## Dine egne fonte

Listen under {{ui:prop.font}} tegner hver font i sine egne bogstaver, med ordene i din tekst, så du ser, hvordan de kommer til at se ud, før du vælger. Det samme gælder fonte i vinduet nedenunder; de fonte, der er listet fra din computer, viser deres navne i deres egne bogstaver. Piletasterne og [[Enter]] virker i listen, og et bogstav hopper til den næste font, der begynder med det.

Ud over de otte indbyggede fonte kan du bruge enhver font du selv har: en fontfil fra din computer eller, i Chrome og Edge, en font der er installeret på din computer. Vælg {{ui:font.manage}} nederst under {{ui:prop.font}}. Vinduet {{ui:font.title}} åbnes.

- **{{ui:font.addFile}}** tager en TrueType-fil (`.ttf`), en OpenType-fil (`.otf`) eller en WOFF-fil (`.woff`). Du kan også bare trække filen ind i vinduet.
- **På Windows** ligger de installerede fonte i Fonts-mappen (`C:\Windows\Fonts`). Browserens fildialog skjuler den. Åbn den i Stifinder i stedet og træk fonten ind i vinduet {{ui:font.title}}. Fonte der kun er installeret for dig ligger i `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, som fildialogen også viser. På en Mac ligger fonte i `/Library/Fonts` og `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** viser de fonte der er installeret på din computer. Første gang spørger browseren om layerling må læse dem. Søgefeltet finder hurtigt en font, et klik tager den.

Hvis en tekst er valgt, får den den nye font med det samme. Ellers dukker fonten op under {{ui:prop.font}} i gruppen {{ui:font.customGroup}}, og {{ui:font.use}} i vinduet lægger den på de valgte tekster. Dine egne fonte virker som de indbyggede: tekst på en cirkelbue, faser og rundinger på kanterne og STEP-eksporten virker alle ens. Bogstaver en font mangler tages fra Sans.

### Arabisk og hebraisk

Arabisk, persisk, urdu og hebraisk skrives højre mod venstre: det første bogstav står til højre, og i en blandet tekst som "Navn عربي" kører kun det arabiske ord baglæns, cifre forbliver som de er. Arabiske bogstaver binder til deres naboer som skriften kræver, og lam-alef bliver en ligatur. Det kræver en font der har disse bogstaver; de indbyggede har ikke. Tilføj en af dine egne, såsom Arial, Tahoma eller Segoe UI på Windows, eller en gratis som Noto Naskh Arabic, Noto Sans Arabic eller Amiri. Vokaltegn sidder på det bogstav de hører til. Tekst på en cirkelbue, omrids, silhuet, lag og navneskilte virker med det som med enhver anden tekst.

### Hvad der virker i hvilken browser

| Browser | Vælg en fontfil | Font fra computeren |
| --- | --- | --- |
| Chrome og Edge på en computer, også den installerede layerling-app | ja | ja, efter at browseren spørger |
| Firefox | ja | nej |
| Safari på en Mac | ja | nej |
| Tablet og telefon | ja, fra enhedens filer | nej |

Websider kan ikke bare læse de installerede fonte. Kun Chrome og Edge har en tilladelse til det, og kun på sikre sider, over `https` som på layerling.com. Når layerling kører over `http`, for eksempel på din egen server eller som en Docker-installation i dit hjemmenetværk, mangler {{ui:font.fromSystem}}; træk fonten over fra Stifinder i stedet. I de andre browsere vælger du fontfilen fra Fonts-mappen, med samme resultat. Hvis du afviste spørgsmålet i Chrome eller Edge, så tillad det igen i site-indstillingerne, bag hængelåsen til venstre for adressen.

layerling kan ikke læse WOFF2-filer (der er næsten altid en TTF- eller OTF-version), font-samlinger (`.ttc`, flere fonte i én fil) eller farve-emoji-fonte. Fra meget store fonte, såsom kinesiske, tager layerling de første 8000 tegn. En variabel font læses i dens standardindstilling, normalt regular.

Nogle fonte, især script- og variable fonte, tegner et bogstav fra streger der overlapper. layerling fletter dem til et rent omrids når den læser fonten, så formen forbliver printbar. Sådanne bogstaver består så af meget korte lige stykker i stedet for kurver; det ses ikke.

### Hvor fontene opbevares

En font du selv har bliver **i denne browser på denne computer**. En anden browser eller computer kender den ikke før du tilføjer den der også. Rydder du browserens site-data, ryddes fontene også. I vinduet {{ui:font.title}} fjerner skraldespanden en font fra browseren. Dine designs mister intet ved det, som næste afsnit viser.

### Giv designs videre med en font du selv har

Et design gemmer **ikke fontfilen**, kun omridset af de bogstaver dets tekster bruger, også dem i tidligere trin i historikken. Hvis en tekst siger "Hej", rejser kun H, e, j med den. Det gælder for enhver måde et design gemmes på: i browseren, på din egen server, som en `.lyl`-fil og i {{ui:myShapes.title}}.

Så:

- **Designet åbner korrekt alle steder**, også på en computer uden fonten. Teksterne ser ens ud og kan flyttes, vendes, skaleres og rundes.
- **Nye bogstaver kræver fonten.** Hvis en person uden fonten taster et bogstav designet ikke tog med, tegner layerling det fra Sans. Under {{ui:prop.font}} er fonten så markeret {{ui:font.fromDesign}}. Tilføj fontfilen og alle bogstaver kommer tilbage.
- **Eksporter holder kun geometri.** STL, 3MF, OBJ, STEP og SVG indeholder former og omrids, ingen font.
- **Ældre layerling-versioner** kender ikke egne fonte endnu og tegner sådanne tekster i Multilanguage.

**Licenser:** Fonte er beskyttet af ophavsret, og deres licens siger hvad du må gøre med dem. De indlejrede bogstavomrids er hvad PDF-filer tager med fra en font, og de fleste licenser tillader det. Nogle kommercielle fonte forbyder dog at give selv enkelte bogstaver videre. Før du giver et design med en font du selv har videre, tjek fontens licens. Gratis fonte som dem fra Google Fonts (for det meste under SIL Open Font License) kan gives videre uden problemer. For en printet del eller en eksporteret STL er det ligegyldigt: de indeholder ingen font længere, kun geometri.

## Ophøjet eller graveret

- **Ophøjet:** Placér teksten på overfladen og gruppér den med formen. Den vokser ud som relief.
- **Graveret:** Skift teksten til {{ui:inspector.hole}}, lad den nå lidt ind i overfladen og gruppér den med formen. Bogstaverne bliver så graveret.

Til bogstaver på en sidevæg, læg først arbejdsplanet på den væg, se [Visning og arbejdsplan](chapter:view-and-workplane).

## Omrids, silhuet og bredere

En tekst behøver ikke bygges som fyldte bogstaver. {{ui:prop.textFill}} i egenskaberne tilbyder det samme valg som Tinkercad:

- **{{ui:prop.textFill.filled}}:** bogstaverne som de er.
- **{{ui:prop.textFill.outline}}:** en linje langs bogstavernes omrids, halvt indenfor og halvt udenfor.
- **{{ui:prop.textFill.outer}}:** en linje rundt om ydersiden af bogstaverne.
- **{{ui:prop.textFill.inner}}:** en linje på indersiden af bogstaverne.

Med en linje valgt vises to indstillinger lige under listen: {{ui:prop.sketchLineWidth}} sætter hvor tyk linjen er, {{ui:sketch.strokeJoin}} hvordan den går rundt om hjørnerne ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} eller {{ui:sketch.strokeJoin.miter}}). De sjældnere indstillinger er under {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} udelader hullerne i O, A eller e, og {{ui:prop.textWider}} bevarer bogstaverne fyldte og gør dem tykkere med linjebredden hele vejen rundt; bogstaver der rører vokser sammen til ét stykke.

Med en linje udenpå, en centreret linje eller "Bredere" vokser tekstens boks, mens bogstaverne beholder deres størrelse. {{ui:prop.bevel}} og {{ui:prop.segments}} findes kun for fyldte bogstaver.

## Lag og navneskilte

Et navneskilt til et flerfarvet print er en tekst i lag: bogstaverne øverst, under dem den samme tekst lidt bredere i en anden farve, nederst en plade uden huller i en tredje. layerling laver det i ét klik:

- **Et nyt navneskilt:** vælg {{ui:shape.nameTag}} i formbiblioteket og placér det. Det står "Navn" i hvide bogstaver på en rød kant og en mørk plade.
- **Fra en tekst:** vælg teksten og klik på {{ui:nameTag.makeLayers}} øverst i dens indstillinger.

Alle skiltets indstillinger er i kortet {{ui:nameTag.title}}, øverst i indstillingerne:

- **{{ui:prop.text}}** og **{{ui:prop.font}}**, dine egne fonte også. Skiltet vokser med ordene.
- **{{ui:nameTag.letterSize}}:** hvor høje store bogstaver er, i mm. Alle lag følger med og holder sig på linje.
- **{{ui:prop.textVertical}}:** stiller skiltet lodret med bogstaverne under hinanden, og alle lag følger med.
- **{{ui:nameTag.layers}}:** én række per lag, fra toppen ned. Hver række har farven (klik den farvede firkant), hvor meget bredere laget er end bogstaverne, dets højde og {{ui:nameTag.noHoles}}, som fylder hullerne i bogstaver som O og A. {{ui:nameTag.corners}} sætter hvordan et bredere lag går rundt om bogstavernes hjørner: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} eller {{ui:nameTag.corner.miter}}. Den øverste række er bogstaverne selv. **+** tilføjer et lag forneden, **–** tager det nederste lag væk. Et skilt har to til seks lag.
- **{{ui:nameTag.keyring}}:** giver det nederste lag en lige tap med rund ende og et hul til en nøglering; tappen vokser med hullet. Et 3 mm hul, som standard, laver en tap 6,5 mm bred der stikker 6,75 mm ud, hullets kant 2 mm fra det nederste lags kant. Vælg {{ui:nameTag.keyringDiameter}} og {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} eller {{ui:nameTag.side.top}}. Hullet går gennem hvert lag det rører, og tappen flytter sig med når du ændrer ordene, bogstavstørrelsen eller fonten. {{ui:nameTag.keyringAlong}} flytter fligen op eller ned langs sin side (foroven: til venstre eller højre), indtil den ville forlade siden; 0 er midten. Det hjælper, når midten af siden rammer et hul, som ved siden af et J: flyt fligen hen, hvor bogstavet rækker ud.
  {{ui:nameTag.side.free}} tager hullet af skiltet og lægger en {{ui:nameTag.keyringTab}} af sin egen ved siden af det, i det nederste lags farve og højde: en almindelig form du flytter og drejer med sine håndtag, hvor som helst skiltet har brug for den. Når den er på plads, klikker du på {{ui:nameTag.keyringTabFix}} i dens panel, og så bliver den en del af det nærmeste skilt, lige hvor den er: hullet går gennem alle lag den rammer, fligen følger det nederste lag, og begge holder sig til den kant af bogstaverne, når ordene eller størrelsen ændres. {{ui:nameTag.side.free}} tager fligen ud igen, hvor den var, så du kan flytte den en gang til.
- **{{ui:nameTag.letterEdge}}:** rund eller fase bogstavernes topkant på det øverste lag, sådan som et printet skilt færdiggøres: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} eller {{ui:nameTag.edge.chamfer}}, med {{ui:nameTag.letterEdgeSize}} (0,4 mm at starte med, højst så høj som laget). Det virker for hver font og hvert ord. Kanten er del af bogstavernes mesh, så kantværktøjet tager en sådan tekst som et mesh, hvilket for en så fin tekst er tungt; vælg kanten her i stedet.

Hver ændring vises med det samme. Skiltet er et bundt: det flytter som ét, og hvert lag forbliver en form i sin egen farve, som en slicer har brug for til flerfarvet print. For at runde eller fase kanterne på et lag, klik på {{ui:group.editBundle}} og vælg laget, se [Bryd kanter og hul former](chapter:edges-and-hollowing).

### Mange navneskilte på én gang

Tast navnene ind i {{ui:textLayers.names}}, ét pr. linje, op til hundrede. Knappen nedenunder siger hvor mange skilte den laver, for eksempel "Lav 12 navneskilte". Hvert skilt får de samme lag, bogstavstørrelse og nøgleringshul og er sit eget objekt; de lægges ud i rækker under det første, 5 mm fra hinanden. En almindelig tekst har navnelisten også, længere nede i dens indstillinger.

## Ikon-tags

Et ikon-tag er det samme tag med et SVG-ikon i stedet for bogstaver: et hjerte, en sky, en klubs logo. Ikonet øverst, under det det samme omrids lidt bredere i en anden farve, nederst en plade uden huller.

- **Et nyt ikon-tag:** vælg {{ui:shape.iconTag}} i formbiblioteket. Et lille vindue åbnes: klik på {{ui:iconTag.browse}}, vælg en SVG-fil, tjek billedet, tast {{ui:iconTag.width}} for ikonet og klik på {{ui:iconTag.ok}}. Tagget står i midten af pladen, i de samme lag som et nyt navneskilt.
- **Fra en skitseform:** en importeret SVG, eller en skitse du tegnede, har {{ui:nameTag.makeLayers}} øverst i dens indstillinger.

Kortet {{ui:iconTag.title}} øverst i indstillingerne rummer:

- **{{ui:iconTag.replace}}:** sætter en anden SVGs ikon på tagget; lagene og bredden bevares.
- **{{ui:iconTag.iconWidth}}:** hvor bredt ikonet øverst er, i mm. Alle lag følger med og holder sig på linje.
- **{{ui:nameTag.layers}}:** rækkerne som på et navneskilt - farve, hvor meget bredere, {{ui:nameTag.corners}}, højde og {{ui:nameTag.noHoles}}, **+** og **–**, to til seks lag. Den øverste række er ikonet selv.
- **{{ui:nameTag.keyring}}:** som på et navneskilt: et hul til en nøglering gennem alle lag, med en flig med rund ende på det nederste lag, ud over ikonet. {{ui:nameTag.keyringDiameter}} og {{ui:nameTag.keyringSide}} vælger størrelse og placering; {{ui:nameTag.side.free}} giver en flig af sin egen, som på et navneskilt. Fligen er lavet efter ikonet omrids, så på et meget ujævnt ikon skal du se, hvor den møder pladen. {{ui:nameTag.keyringAlong}} flytter fligen langs dens side, som på et navneskilt.
- **{{ui:iconTag.count}}:** hvor mange tags du vil have, 1 til 100. {{ui:iconTag.fill}} regner det ud fra printerens plade valgt i indstillingerne, til små logoer en hel plade. Knappen nedenunder laver dem, 5 mm fra hinanden, lagt ud på midten af pladen; den første er tagget selv.

SVG'en skal have lukkede omrids; en tegning med kun åbne linjer kan ikke blive et tag. En skitseform hvis fyld er en linje beholder den: arealet af den linje er ikonet.

**Et billede (PNG eller JPG)** spores ind i et omrids, og forhåndsvisningen viser omridset. Under {{ui:iconTag.part}} vælger du, om {{ui:iconTag.part.dark}} eller {{ui:iconTag.part.light}} bliver ikonet; først er det den del, der ikke er baggrunden. Gennemsigtige pixels hører aldrig til ikonet. En SVG der kun rummer ét billede, som Inkscape gemmer en importeret bitmap i, spores på samme måde. Omridset følger pixels, så et lille billede giver en ru kant: billeder på et par hundrede pixels eller flere virker bedst. {{ui:iconTag.replace}} tager den del af et billede, der ikke er dets baggrund.

## QR-koder

En QR-kode gør en tekst eller en webadresse til et mønster, som et telefonkamera læser: et link til din butik på et skilt, Wi-Fi-navnet på en bordskåner, et telefonnummer på en nøglering.

Vælg {{ui:shape.qrCode}} i formbiblioteket. Et vindue åbner sig; markøren står allerede i tekstfeltet:

- **{{ui:qrCode.text}}:** hvad koden siger. Enter laver koden, Shift+Enter starter en ny linje. Under feltet ser du, hvor meget af pladsen der er brugt; æ, ø, å og andre specialtegn fylder to byte. Er teksten for lang, siger feltet det.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q eller H. Et højere niveau kan stadig læses, når en del af koden er snavset eller ridset (L ca. 7 %, M 15 %, Q 25 %, H 30 %), men kræver flere moduler til den samme tekst, så hvert modul bliver mindre. Først er M valgt.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} bygger koden alene, 4 mm høj. {{ui:qrCode.style.raised}} sætter den 1 mm høj på en hvid plade på 3 mm, som et bundt af to farver, så et flerfarvet print printer koden mørk og pladen lys. {{ui:qrCode.style.engraved}} skærer koden 1 mm ned i pladen.
- **{{ui:qrCode.sizeBy}}:** skriv kodens samlede {{ui:qrCode.sizeBy.width}} (først 40 mm) eller størrelsen på ét modul; det andet tal står nedenunder. Moduler under 0,8 mm får en advarsel. Det er en tommelfingerregel for en 0,4 mm dyse, ingen garanti: printer, materiale, farver og telefon spiller alle ind.
- **{{ui:qrCode.quietZone}}:** scannere har brug for en tom kant på fire moduler rundt om koden. På en plade hører kanten til pladen; slå den kun fra, hvis pladen sidder på en større lys flade. Koden alene har ingen egen kant: lad pladsen rundt om den være fri.
- **Højder:** kodens højde, på en plade kodehøjden eller graveringsdybden, og pladetykkelsen.

Forhåndsvisningen viser koden, som den bliver bygget. {{ui:qrCode.ok}} sætter den midt på pladen.

Koden er et legeme som alle andre: flyt den, drej den, skalér den (hold bredde og dybde ens, ellers bliver koden forvrænget), gruppér den, eller gør den til et hul og gruppér den ind i en egen del for at gravere den dér. Skalering skalerer hele koden; hvert modul forbliver kvadratisk.

Kortet {{ui:qrCode.title}} øverst i dens indstillinger rummer teksten. Ret den og klik på {{ui:qrCode.regenerate}}: koden bygges igen, hvor den står, og så bred, som den er nu. Fejlkorrektion, stillezone og byggemåde forbliver, som de blev valgt; til andre valg laver du en ny kode fra biblioteket.

Scan koden med din telefon, før du printer den, og en gang til efter printet. Mørkt på lyst læses bedst; en lys kode på en mørk plade læses ikke af alle telefoner.

## Tekst på en cirkelbue

Skal bogstaverne ikke løbe lige, men følge kanten af en mønt, et låg eller en ring? Til det er der indstillingen {{ui:prop.textCurved}}.

![Tekst følger en cirkel. Alle bogstaver står på en fælles linje.](shot:curved-text)

Når du slår den til, løber teksten langs cirklen. Alle bogstaver står på den samme grundlinje, lige jævnt som med normal tekst. Der er fire indstillinger:

- **{{ui:prop.textRadius}}** (5 til 500 mm): Radius af den cirkel bogstavernes grundlinje løber på.
- **{{ui:nameTag.letterSize}}:** Hvor høje bogstaverne er. Den afhænger ikke længere af formens bredde.
- **{{ui:prop.textInward}}:** Flytter teksten fra toppen af cirklen til dens bund. Bogstaverne peger så med toppene mod midten.
- **{{ui:prop.textFlipped}}:** Vender kun bogstaverne om, så du kan læse dem fra den anden side. Teksten bliver på sin plads på cirklen.

**Cirkens centrum er formens centrum.** Derfor virker justering som sædvanligt: centrér teksten med en cylinder eller en ring og den sidder præcis koncentrisk på den. Når du trækker et håndtag, vokser radius og bogstavstørrelse sammen, så bogstaverne ikke forvrænges.

> **Tip:** Øverst på cirklen står bogstaverne uden for grundlinjen; med {{ui:prop.textInward}} står de indenfor, toppe mod midten. For at bogstaverne kan være på en skive, bør radius plus bogstavstørrelse være mindre end skivens radius.
