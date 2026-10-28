---
title: Datoteke, shranjevanje in deljenje
summary: Kje ležijo tvoji načrti, kako jih varnostno shraniš, katere oblike layerling uvozi in izvozi in kaj je mogoče na skupnem strežniku.
---

## Kje ležijo tvoji načrti

layerling vse shranjuje v brskalniku na tvojem računalniku. Računa ni in nič se ne nalaga na splet. Vsaka sprememba se shrani sama. Sličica predogleda na začetni strani kaže pogled, ki si ga imel nazadnje pred seboj, ko si se z {{ui:editor.homeDashboard}} vrnil nazaj. Če layerling po nekaj dneh spet odpreš v istem brskalniku, je vse tam.

Če se iz načrta, v katerem ni nič, vrneš na začetno stran, layerling vpraša, ali naj ostane. {{ui:confirm.yes}} ali [[Enter]] ga obdrži, {{ui:confirm.no}} ga odstrani, da se ne kopičijo prazni načrti. Pri načrtu v skupni mapi na strežniku {{ui:confirm.no}} izbriše datoteko s strežnika, za vse, ki ga uporabljajo.

To ima svojo slabo stran: kdor izbriše pomnilnik brskalnika ali preide na drug računalnik, izgubi načrte. **Zato pomembna dela shrani v datoteko.**

## Mape za tvoje projekte

Pri desetinah projektov en seznam ni dovolj. Na začetni strani {{ui:shared.newFolder}} ustvari mapo za projekte tega brskalnika; klik na mapo jo odpre. Mape lahko vsebujejo mape.

- **V mapo:** povleci projekt na mapo ali v meniju projekta izberi {{ui:shared.moveTo}}, ki ponudi vse mape. Nov projekt in datoteka, ki jo odpreš ali uvoziš, gre v mapo, ki je takrat odprta.
- **Spet ven:** prva ploščica v mapi, `..`, in vrstica pod zavihki vodita nazaj; nanju lahko povlečeš tudi projekt. Mapa, ki jo povlečeš na drugo mapo, gre vanjo.
- **Preimenovanje in brisanje** sta v meniju mape. Brisanje mape ne izbriše nobenega projekta: njena vsebina se pomakne za raven višje.
- **Iskanje** pregleda vse mape; najden projekt pokaže svojo mapo, klik nanjo pa jo odpre.

{{ui:dashboard.backupAll}} ohrani mape: projekti so v datoteki varnostne kopije v svojih mapah, obnovitev pa jih vrne tja. Mape tega brskalnika so ločene od map na strežniku. Predogledne slike kartic gredo tudi v datoteko, zato so po obnovitvi takoj nazaj.

## Varnostno kopiranje in deljenje

Na začetni strani ima vsak načrt meni z možnostmi za preimenovanje, podvajanje in brisanje. Vrstica ob zavihkih ima na vsakem zavihku iste gumbe. Z {{ui:dashboard.backupAll}} vse načrte odprtega zavihka naenkrat spakiraš v eno samo datoteko ZIP. {{ui:dashboard.restoreBackup}} tik ob njem (je tudi na novem računalniku brez načrtov) jih vrne nazaj, tudi v drugem brskalniku ali na drugem računalniku; isto datoteko sprejme tudi {{ui:dashboard.importGeometry}}. {{ui:myShapes.title}} tega brskalnika potujejo v isti datoteki, v mapi `Custom shapes`, glej [Oblike](chapter:oblike). Če obnoviš varnostno kopijo v brskalniku, ki nekatere od teh projektov že ima, se ti ne dodajo drugič; obvestilo pove, koliko jih je že bilo. Nad načrti tega brskalnika te kratka vrstica opomni, da niso shranjeni nikjer drugje.

Posamezen načrt shraniš v urejevalniku: {{ui:editor.export}}, nato izberi obliko **LYL** in klikni {{ui:export.saveProject}}. Datoteka LYL je lasten načrtovalski format programa layerling in vsebuje vse: oblike, skupine, skice, podatke CAD, uvožene vire in zgodovino, torej korake razveljavitve. Pri {{ui:export.historyTitle}} izbereš, koliko zadnjih korakov naj potuje zraven; privzeto je to, kar nastavitve (zobnik v orodni vrstici) pod {{ui:workspace.history}} hranijo. Zadnja postaja, {{ui:export.historyNone}}, shrani načrt samo s trenutnim stanjem – tako ga deliš brez korakov razveljavitve. Izvoz je kopija pod {{ui:export.fileName}}, ki ga vpišeš; načrt v brskalniku obdrži svojo zgodovino. Starejše datoteke `.skf` iz prejšnjih različic je še vedno mogoče odpreti, shrani se potem kot `.lyl`.

**Shranjevanje v lastno mapo (Chrome in Edge).** Tam gumb odpre sistemsko okno za shranjevanje, tako da mapo in ime izbereš sam, obstoječo datoteko pa je mogoče nadomestiti. Potem [[Ctrl]]+[[S]] shrani načrt spet v isto datoteko, brez okna. Načrt, odprt iz datoteke `.lyl` z {{ui:dashboard.importGeometry}} ali z gumbom za odpiranje v oknu za izvoz, se shrani tudi nazaj vanjo. Brskalnik te lahko enkrat vpraša za dovoljenje za spreminjanje datoteke. Po ponovnem nalaganju strani načrt pozabi svojo datoteko in naslednji [[Ctrl]]+[[S]] jo spet vpraša; okno se odpre v mapi, ki si jo uporabil nazadnje. Firefox in Safari strani ne dovolita pisati v datoteke na ta način. Tam se datoteka kot prej prenese v mapo Prenosi, [[Ctrl]]+[[S]] jo prenese znova; v Firefoxu je mogoče pod Nastavitve, Splošno, Prenosi določiti, da vsakič vpraša za mapo.

## Priloge

Navodila, seznam delov, opombe, fotografija ali podatkovni list lahko ostanejo pri projektu kot datoteke. {{ui:editor.attachments}} v vrstici {{ui:editor.group.manage}}, sponka, odpre seznam; majhna pika na sponki pokaže, da jih projekt ima.

- **{{ui:attachments.upload}}:** Izberi eno ali več datotek: `.md` (Markdown) ali `.txt` kot navadno besedilo (UTF-8), slike `.png`, `.jpg`, `.jpeg` ali `.webp` ali dokumente `.pdf`. Datoteka se preveri po vsebini, zato je datoteka, ki ni to, kar pravi njeno ime, zavrnjena, drugih vrst, med njimi `.svg`, pa ni mogoče priložiti. Besedilna datoteka ima lahko največ 2 MB, slika 16 MB in PDF 32 MB; projekt sprejme do 32 datotek in skupaj 64 MB.
- **Seznam:** Puščica prenese datoteko, kakršna je bila naložena. Koš jo odstrani; vrstica prej še enkrat vpraša, odstranjene datoteke pa ni mogoče vrniti z razveljavitvijo, ker priloge niso del zgodovine razveljavitev.
- **Branje datoteke:** Oko v vrstici datoteke `.md` ali `.txt` jo odpre v oknu za branje, ne da bi jo prenesel. Markdown se prikaže oblikovan, z naslovi, seznami, potrditvenimi polji, tabelami in kodo; besedilna datoteka točno tako, kot je napisana. Delujejo le povezave na spletne strani in e-poštne naslove, odprejo pa se v novem zavihku. Slike, ki jih datoteka navaja, se ne naložijo: na njihovem mestu stoji njihov opis. Okno zapre Escape, križec ali klik poleg njega. Branje deluje tudi v pogledu zgodovine.
- **Ogled slike:** Oko v vrstici slike jo odpre v istem oknu, pomanjšano, če je velika. PDF nima očesa: prenesi ga in ga odpri v programu, s katerim bereš datoteke PDF.
- **Ime, ki že obstaja:** layerling vpraša, kaj naj se zgodi. {{ui:attachments.replace}} vstavi novo vsebino v datoteko s tem imenom, ki ohrani svoje mesto na seznamu. {{ui:common.rename}} doda novo datoteko pod drugim imenom in predlaga prvo prosto, na primer `opombe 2.md`. Križec novo datoteko izpusti. Velike in male črke štejejo enako, ponovno nalaganje iste datoteke pa ne spremeni ničesar.

Priloge se shranijo s projektom kot vse drugo: v brskalniku, v datoteki LYL, v varnostni kopiji in v projektu na strežniku, kamor pridejo, takoj ko se katera doda ali odstrani. S {{ui:import.insertProject}} ali z lastno obliko ne gredo zraven, poročilo o napaki pa jih ne vsebuje. Projekt s prilogami se shrani kot novejša vrsta datoteke LYL: starejši layerling pove, da je ne more odpreti, namesto da bi datoteke izgubil. Projekt brez prilog se shrani povsem tako kot prej.

## Izvoz

Klikni {{ui:editor.export}} ali pritisni [[Ctrl]]+[[E]].

![Okno za izvoz z oblikami STL, 3MF, OBJ, STEP, SVG, PNG, LYL in 2D.](shot:export-panel)

Zgoraj je ime datoteke, pod njim izbereš obliko. Če je kaj označeno, se izvozi samo izbor, sicer celoten načrt. Če izbor izpusti vidne dele, to jasno pove opomba v oknu, {{ui:export.selectAll}} pa z enim klikom označi vse vidno. Ko je datoteka zapisana, se okno samo zapre; če izvoz ne uspe, ostane odprto s sporočilom.

| Oblika | Za kaj | Kaj moraš vedeti |
| --- | --- | --- |
| **STL** | Rezalnik in 3D-tisk | Mreža trikotnikov. Najpreprostejša in najbolj razširjena oblika. STL nima delov: telesa, ki se prekrivajo, se spojijo v eno mrežo. Če jih želiš ohraniti kot ločene dele, izvozi 3MF. V Chromu in Edgeu prvi izvoz STL vpraša, kam shraniti, poznejši izvozi STL tega načrta pa pišejo v to datoteko, dokler v polje z imenom datoteke ne vpišeš drugega imena ali ne pritisneš {{ui:export.stlSaveAs}}. |
| **3MF** | Rezalnik z barvami | Vsako telo ostane svoj del z imenom in barvo. Kar se prekriva, se združi samo pri enaki barvi; če oblika tiči v drugobarvni, na primer logotip v plošči, prva zgrajena tam naredi prostor za kasnejšo. Primerno za PrusaSlicer, Bambu Studio, OrcaSlicer in Curo. Bambu Studio in OrcaSlicer ob odpiranju vprašata, kako naj se barve porazdelijo na tvoje filamente, in datoteko imenujeta »ne od Bambu« – to sporočilo je neškodljivo. |
| **OBJ** | Modeliranje in izmenjava | Široko podprta oblika mreže. Barve so kot barve oglišč v isti datoteki, brez dodatne `.mtl`. Bambu Studio in OrcaSlicer jih preberta in kot pri 3MF vprašata po razporeditvi na filamente; drugi programi vidijo samo obliko. Prekrivajoča se telesa se kot pri 3MF združijo samo pri enaki barvi. |
| **STEP** | Polnovreden program CAD | Obdrži kvadre, valje, krogle in stožce kot natančno geometrijo, prav tako oblike iz obrisa (zvezda, srce, elipsa, cev, polkrogla, okrogla streha, zaobljen kvader, lastovičji rep, izvrtine in več), ukrivljeno cev, navoje, vzmeti in zobnike, poleg tega zaokrožitve in posnetja. Prvi izvoz STEP v seji enkrat naloži jedro CAD (približno 22 MB). |
| **SVG** | Laserski rezalniki in ploterji | Čist tloris v milimetrih, z luknjami in ukrivljenimi obrisi. Pod {{ui:export.svg.view}} zapiše {{ui:export.svg.viewFootprint}} samo obrise, s katerimi predmeti stojijo na delovni ravnini. {{ui:export.svg.viewEdges}} zapiše robove, vidne od zgoraj, kot črte, vsako telo v svoji barvi. |
| **DXF** | delavnica za lasersko rezanje | Isti tloris ({{ui:export.svg.viewSilhouette}} ali {{ui:export.svg.viewFootprint}}) kot en obris iz črt, pravih lokov in krogov - brez polilinij, zlepkov in krivulj iz kratkih ravnih kosov - na plasti 0 v beli barvi, DXF 2000 v milimetrih, ne zrcaljeno. Telesa, ki se dotikajo, dajo en obris, zato se nobena črta ne reže dvakrat. Delavnice želijo en del na datoteko: pred izvozom izberite del. Na laserskem rezalniku še ni preizkušeno: povratne informacije so dobrodošle. |
| **PNG** | Prispevki na forumih, tiskarski portali, povpraševanja | Slika pogleda, kakršen je ravno zdaj, v dvojni ločljivosti in brez ročic, okvirja izbora in mer. {{ui:export.png.plate}} in {{ui:export.png.transparent}} izbereš v oknu. Prej zavrti in zumiraj, dokler izrez ne ustreza; izbor tu ne igra vloge. |
| **LYL** | layerling sam | Urejljiv načrt z vsem, kar spada zraven. |
| **2D** | delavnica, stružnica in rezkalnik, dokumentacija | Risba v merilu 1:1 kot PDF ali SVG: pogled od spredaj, od zgoraj in z desne na listu ISO. Glej spodaj. |

**STL v lastno mapo (Chrome in Edge).** Tam prvi izvoz STL načrta odpre sistemsko okno za shranjevanje, tako da mapo in ime izbereš sam in lahko nadomestiš obstoječo datoteko. Potem vsak izvoz STL tega načrta zapiše v isto datoteko brez okna; okno za izvoz pokaže, katera je, **Shrani kot …** ob gumbu za izvoz pa izbere drugo. Okno si zapomni svojo mapo, ločeno od tiste za načrte, zato lahko datoteke za rezalnik ostanejo pri rezalniku. Po ponovnem nalaganju strani načrt pozabi svojo datoteko STL in naslednji izvoz spet vpraša. Firefox in Safari datoteko prenesejo kot prej.

Luknjo, ki je nisi združil v skupino, izvoz odšteje od vsakega telesa, ki se je dotika, tako kot kaže pogled. Pred vsakim izvozom torej ni treba združevati. Pri izboru štejejo samo izbrane luknje. Samo za sebe luknje ni mogoče izvoziti; na to te opozori layerling.

STEP vsebuje samo natančna telesa CAD. Kar ni mogoče natančno prikazati, na primer mreža, uvožena kot STL, ostane zunaj. Sporočilo po izvozu ta telesa imenuje po imenu in pove, zakaj. Za tiskalnik potem vzameš STL ali 3MF, ki prenesta vse.

### Risba za delavnico

Izberi obliko **2D** (ko miško zadržiš nad njo, piše Risba) in pod imenom datoteke PDF ali SVG. Če je kaj izbrano, se nariše samo izbor, sicer pa ves viden načrt; luknje, ki jih nisi združil v skupino, še vedno izrežejo dele, ki jih zadenejo.

layerling nariše pogled od spredaj, od zgoraj in z desne v prvem kotu projekcije (desni pogled levo od sprednjega, zgornji pod njim) na najmanjšem listu ISO, ki zadošča, od A4 do A0, ali na večjem, če ga del potrebuje. Merilo je vedno 1:1. Vsak pogled ima svojo skupno širino in višino, robovi, ki jih ne vidiš, pa so črtkani. Okrogle izvrtine, ki tečejo vzporedno s smerjo pogleda, dobijo središčni križ in oznako (F1, T1, R1), tabela spodaj pa našteje njihov premer in položaj, merjen od spodnjega levega kota pogleda. Naslovni blok v spodnjem desnem kotu vsebuje ime, merilo, enote, datum in številko lista. Besede na listu sledijo jeziku vmesnika.

Natisni pri 100 % ali »dejanski velikosti«, sicer dolžine ne bodo ustrezale. Risba ne naredi tega: navoji, globine, tolerance in poševne izvrtine niso kotirani, mere pa izhajajo iz modela kot mreže, zato so nazivne. Zelo podroben del (nad 100.000 trikotnikov) ali več kot 200 izvrtin se zavrne s sporočilom; takrat izberi manj predmetov.

Projekcija temelji na risarskem delu programa Cadverix-3D avtorja WC3D.

### Koliko filamenta to potrebuje?

Pri STL, 3MF, OBJ in STEP polje {{ui:export.estimateTitle}} pokaže prostornino, težo in dolžino filamenta (1,75 mm) tistega, kar se izvaža. Šteje se kot v datoteki: samo vidna telesa, luknje odštete, prekrivanja samo enkrat. Desno izbereš filament – PLA, PETG, ABS, ASA, TPU ali PA (najlon) –, teža sledi njegovi gostoti. Prostornina je prostornina samega telesa. Teža in filament sta groba ocena za tisk s stenami in polnilom: pod naslovom nastaviš {{ui:export.estimateInfillLabel}} (na začetku 15 %) in {{ui:export.estimateWallsLabel}} (2), polje pa pove, kaj je štelo in koliko bi tehtal isti del kot poln. Pravo številko določajo nastavitve tvojega rezalnika, zato jo vzemi kot vodilo: dobro je za primerjavo načrtov in za to, ali kolut še zadošča. Pri 100 % polnila polje šteje del kot polnega, kar je zgornja meja.

## Uvoz

Prek {{ui:editor.import}} ali [[Ctrl]]+[[I]] v načrt prineseš tuje datoteke.

![Okno za uvoz: odpri ali vstavi načrte in odloži geometrijo.](shot:import-panel)

- **{{ui:import.openProject}}:** Načrt programa layerling (`.lyl` ali starejši `.skf`) pride nazaj kot nov načrt.
- **{{ui:import.insertProject}}:** Telesa načrta programa layerling pridejo zraven v odprtega. Praktično za osnovne oblike, ki jih potrebuješ znova in znova: zgradi jih enkrat, shrani in jih vsakič prinesi noter. Če eno ali več datotek `.lyl` spustiš na polje spodaj, se vstavijo na enak način. Njegove [opombe](chapter:merjenje-in-opombe) pridejo zraven, zložene in oštevilčene naprej za tistimi, ki jih načrt že ima, prav tako njegove referenčne točke.
- **DXF:** DXF, kot ga pošlje delavnica za lasersko rezanje ali dobavitelj z obrisom dela, pride noter kot deli za nadaljnje delo: vsak sklenjen obris kot 4 mm visoko telo in vsaka luknja v njem kot samostojna luknja ob njem (okrogla kot valj), tako da luknjo v 3D-urejevalniku premaknete in ji spremenite velikost kot kateri koli drugi; za premik celega dela izberite vse. V milimetrih (datoteka v palcih se pretvori, datoteka brez enote se prebere v milimetrih), loki in krogi ostanejo pravi loki. Prebrane so črte, loki, krogi, elipse, polilinije, zlepki in bloki; besedilo, kote in šrafure so izpuščene, prav tako obrisi, ki se ne sklenejo - sporočilo pove, koliko. Debelino nastavite v lastnostih.
- **Dodaj geometrijo:** Datoteke STL, OBJ, 3MF, STEP, SVG, PNG ali JPG odloži v oknu ali klikni, da izbereš datoteko. Uvožene mreže lahko vrtiš, premikaš, režeš z luknjami in nato gradiš naprej. SVG pride kot skicirano telo, tudi tak iz sledilnika, kot je picsvg.com, ali Inkscapov »Trace Bitmap«: njegovi obrisi postanejo črte in krivulje skice, visoke 4 mm in od zgoraj berljive tako kot na risbi. V lastnostih nastaviš {{ui:prop.sketchFill}}, kot ploskev ali kot konturo zunaj, znotraj ali sredinsko, in z {{ui:prop.sketchSilhouette}} odpadejo luknje, glej [Skice](chapter:skice), razdelek »Polnilo in silhueta«. Same točke spreminjaš v skicirnem načinu. Samo zelo zapleten SVG z več kot 2500 črtami in krivuljami pride kot trdna mreža. Slika PNG ali JPG se izsledi v obris in pride enako kot skicirano telo, široko 50 mm, ki ga lahko pozneje spremeniš: del slike, ki ni njeno ozadje, pri čemer je ozadje del, ki zavzame več robu slike. SVG, ki vsebuje samo eno sliko, se izsledi enako. Oblika, ki je ni mogoče sestaviti v telo, na primer obris, ki seka sam sebe ali se sam dotika v točki, je izpuščena, po uvozu pa layerling pove, koliko jih je bilo. Takrat pomaga, da v risalnem programu združiš prekrivajoče se dele, zapreš obrise in datoteko znova shraniš. Risbe, narejene na eni strani, na primer plasti enega dokumenta, izvožene kot ločene datoteke, se spet poravnajo, če pred uvozom v oknu za uvoz vklopiš {{ui:import.keepSvgPage}}: vsaka obdrži svoje mesto na strani, sicer pa je vsaka centrirana sama na sebi. Tudi SVG, narisan v več barvah, pride kot eno telo za vsako barvo, vsako v svoji barvi in na svojem mestu; z več kot 12 barvami, kot jih ima obrisana slika, ostane eno telo. Barvni OBJ ali 3MF pride kot eno telo na barvo, vsa na svojem mestu drugo glede na drugo. Pri OBJ so barve ali v sami datoteki, kot pri OBJ iz programa layerling, ali v `.mtl` ob njej. Tega izbereš zraven, ali pa uvoziš kar celoten ZIP, tako kot ga Tinkercad izda za OBJ. 3MF nosi barve sam, pri projektu iz Bambu Studia, OrcaSlicerja ali PrusaSlicerja pa vsak del dobi barvo svojega filamenta. 3MF z več objekti, na primer projekt z enim objektom na tiskalno ploščo, pride kot eno telo na objekt; modifikatorji, negativni volumni in blokatorji podpor iz rezalnika ostanejo zunaj. Kar je bilo v rezalniku naslikano na ploskve, layerling ne bere.
- **Iz Tinkercada:** Izvoz STL ali OBJ iz Tinkercada pride kot geometrija, kot vsaka druga mreža; OBJ ohrani barve. Prave oblike prenese brezplačno orodje skupnosti: [Export to layerling](https://taylormadearmy.github.io/tinkercad-layerling-importer/) avtorja taylormadearmy, zaznamek, ki v brskalniku pretvori načrt iz Tinkercada v datoteko `.lyl`, ki jo tu odprete z {{ui:import.openProject}}. Ni del layerlinga in ga sami še nismo preizkusili; avtor ga je preizkusil v Windows s Chromom.

Načrt, shranjen z **novejšo različico programa layerling**, lahko vsebuje stvari, ki jih tvoja različica še ne pozna, na primer novo obliko, novo nastavitev ali lastne pisave. Če ga layerling zato ne more odpreti, sporočilo navede obe različici. Če se odpre, v opombi piše, da novejše tu lahko izgleda drugače. V obeh primerih pomaga, da stran naložiš znova: layerling.com vedno dostavi najnovejšo različico. Nameščena aplikacija si jo prinese ob naslednjem zagonu, na lastnem strežniku posodobitev namestiš sam.

Slike kot predlogo vstaviš v skicirnem načinu, glej [Skice](chapter:skice).

## Poenostavitev uvožene mreže

Skenirana ali modelirana mreža ima pogosto bistveno več trikotnikov, kot jih njena oblika potrebuje, in vsakega se vleče zraven pri premikanju, rezanju in shranjevanju. {{ui:simplify.title}} v skupini Spreminjanje (ali v meniju z desnim klikom na telo) pokaže mrežo, kakršna je, ob tistem, kar od nje ostane pri izbranem deležu njenih trikotnikov; oba pogleda se vrtita in zumirata skupaj, z miškinimi gumbi delovne ravnine. Določiš, koliko naj ostane, kot odstotek ali kot število trikotnikov, in {{ui:simplify.apply}} prevzame lažjo mrežo. Rezultat je preprosta mreža: pri rezultatu reza ali združitve odpadeta {{ui:group.edit}} in prvotni deli.

Rezanje, združevanje in preseki z uvoženo mrežo se izračunajo v tvojem brskalniku, zato nastavitve delovnega prostora omejujejo, koliko trikotnikov lahko taka mreža ima ({{ui:workspace.booleanTriangleLimit}}). Mreža čez mejo se ne obdela in sporočilo navede število njenih trikotnikov; mrežo najprej poenostavi ali mejo dvigni, če tvoj računalnik to zmore.

## Prijava napake

Če layerling naredi kaj nepričakovanega, shrani {{ui:editor.bugReport}}: povezava je spodaj v nogi ob forumu. To je datoteka ZIP, ker GitHub in mnogi forumi zavračajo goli .lyl: v njej sta tvoj načrt kot .lyl in kratka besedilna datoteka z različico, brskalnikom, velikostjo zaslona, zadnjimi sporočili in nastalimi napakami. Začetna stran odpre ZIP kot varnostno kopijo, ali pa ga razpakiraš in odpreš .lyl. Osebnih podatkov v njej ni. Datoteko priloži svojemu prispevku na forumu ali pri GitHubu, potem je napako mogoče ponoviti natanko s tvojim načrtom.

Če se layerling zaustavi z napako, se namesto prazne strani pokaže okno s sporočilom o napaki. V njem shraniš nazadnje v brskalniku shranjeno stanje načrta kot datoteko .lyl, se vrneš na pregled ali začneš nov načrt. Sporočilo o napaki iz okna in shranjena datoteka pomagata pri prijavi.

## Skupni načrti na strežniku

Če layerling teče na lastnem računalniku ali spletnem strežniku, lahko ponudi skupno mapo, v kateri vsi uporabniki odlagajo načrte. Začetna stran potem pokaže načrte v dveh zavihkih, {{ui:shared.trailRoot}} za skupno mapo in enem za ta brskalnik, vsakem s številom načrtov; tisti z več načrti je prvi in odprt. Tam ustvarjaš mape, načrte premikaš z vlečenjem in iščeš po celotni mapi. Načrt, ki tam leži, se sam shrani nazaj tja. Načrt iz tega brskalnika pride na strežnik tako, da povlečeš njegovo kartico na zavihek {{ui:shared.trailRoot}} ali z {{ui:dashboard.sendToServer}} v meniju kartice. Ko je odprt zavihek {{ui:shared.trailRoot}}, {{ui:dashboard.createDesign}} in {{ui:dashboard.restoreBackup}} postavita načrt v odprto mapo na strežniku, {{ui:dashboard.backupAll}} pa spakira vse načrte strežnika z mapami in njegove lastne oblike v eno datoteko ZIP. Začetna stran prikaže načrt po imenu datoteke, zato preimenovanje načrta, na njegovi kartici ali na vrhu urejevalnika, preimenuje tudi datoteko na strežniku. Brisanje načrta ali mape ju odstrani za vedno, skupaj z delovno kopijo v tem brskalniku. Lastne oblike na strežniku ležijo tam v mapi `Custom shapes`, glej [Oblike](chapter:oblike).

Dve stvari to pospešita: {{ui:dashboard.sendAllToServer}} na začetni strani prestavi vse načrte tega brskalnika na strežnik naenkrat, s kljukico {{ui:dashboard.newOnServer}} pa se vsak nov načrt začne v mapi na strežniku in se tam shranjuje od prve spremembe naprej. Kljukica se ohrani v tem brskalniku. Načrt, ki ne more na strežnik – na primer ker je ime tam že zasedeno –, ostane v brskalniku, sporočilo pa pove, koliko jih je.

To ni hkratno urejanje: kdor odpre datoteko, dela na lastni kopiji. Če je medtem kdo drug datoteko spremenil, layerling prepiše zavrne.

Na layerling.com ta funkcija ni vklopljena. Kako jo nastaviš na lastnem strežniku, piše v [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.de.md#gemeinsame-entwürfe-im-netz).
