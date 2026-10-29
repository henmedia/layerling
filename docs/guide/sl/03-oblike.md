---
title: Postavljanje in nastavljanje oblik
summary: Knjižnica oblik, mere s številko in z ročico, barva, vrtenje, zožanje in zasukanost.
---

Vsak del v programu layerling se začne z obliko. Iz njih zgradiš vse drugo: oblike se dopolnjujejo, izrezujejo druga drugo ali se povežejo v novo obliko.

## Dodaj obliko

V orodni vrstici klikni {{ui:editor.addShape}}. Odpre se knjižnica oblik.

![Knjižnica oblik. Vsaka sličica je narisana iz prave geometrije oblike.](shot:shape-menu)

Knjižnica se zapre po vsaki izbrani obliki. Z naslovno vrstico jo premakneš tja, kjer ne zakriva mesta, na katero ciljaš, na primer nad ploščo Lastnosti; dvoklik na naslovno vrstico jo vrne pod njen gumb, kje si jo pustil, pa si zapomni brskalnik. Žebljiček v naslovni vrstici drži knjižnico odprto, medtem ko postavljaš več oblik zapored. Z robovi in vogali spreminjaš njeno velikost, tako široko in visoko, kot dovoli tvoj zaslon; tudi to si brskalnik zapomni, dvoklik na rob pa jo povrne. Ko knjižnico zožiš, opusti imena in pokaže samo slike; ime se prikaže, ko pokažeš na obliko.

Izberi obliko. Zdaj visi na kazalcu miške in pristane tja, kamor klikneš. Če pri tem zapelješ čez telo, se položi na ploskev pod kazalcem, tudi na poševno, kot pri Cruiseu v Tinkercadu; nad prazno ploščo pristane na delovni ravnini. Če pritisneš [[Esc]], se odlaganje prekine. Orodje, ki čaka na klik, na primer merilni trak, kotomer, opomba, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} ali robna orodja, se ob izbiri oblike izklopi, da klik odloži obliko. Obratno vklop enega teh orodij obliko spet odloži. Kdor želi obliko raje kar na sredino plošče, lahko odlaganje s klikom izklopi v nastavitvah (področje {{ui:workspace.appearance}}, stikalo {{ui:workspace.cruise}}).

Na ploskvi se oblika pripne na njeno sredino, ko se ji kazalec približa, tako kot na vogal ali rob; držite [[Alt]], da jo odložite kamor koli. Če jo iz knjižnice povlečete na ploskev, vedno pristane na sredini, z [[Alt]] tam, kjer jo spustite.

Kaj ponuja knjižnica:

- **Osnovne oblike:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (od treh do štiriindvajset stranic), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (s tremi do štiriindvajset stranicami, torej tudi tristrana), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} in {{ui:shape.torus}}.
- **Cevi:** {{ui:shape.tube}} in {{ui:shape.bentTube}} iz do dvanajst ravnih kosov z ovinki vmes, poleg tega {{ui:shape.loft}} od enega obrisa do drugega, na primer od oglatega do okroglega.
- **Okrasne oblike:** {{ui:shape.star}}, {{ui:shape.heart}} in {{ui:shape.crescent}}.
- **Napisi:** {{ui:shape.text}}, tudi na krožnem loku. Več v poglavju [Besedilo](chapter:besedilo).
- **Mehanika:** {{ui:shape.thread}} (navojna palica, vijak, matica in navojna luknja), {{ui:shape.spring}}, posode in podstavki {{ui:shape.gridfinity}}, {{ui:shape.gear}} in {{ui:shape.knurl}} za ročaje. Več v poglavju [Navoji in mehanika](chapter:navoji-in-mehanika).
- **Za konstrukcije:** tiskljivi {{ui:shape.hinge}}, {{ui:shape.dovetail}}, {{ui:shape.teardrop}} za vodoravne luknje, {{ui:shape.counterbore}} in {{ui:shape.countersink}} za glave vijakov ter {{ui:shape.ruler}}, ki je samo merilno orodje in se v nobenem izvozu ne pojavi.

Trikotnik dobiš na dva načina: {{ui:shape.polygon}} s tremi stranicami je enakokraki trikotnik, »streha« iz Tinkercada, {{ui:shape.wedge}} pa pravokotni. Oba sta prava trikotna prizma. Za trikotno luknjo oblike kopiraš, kopijo narediš manjšo, jo označiš kot luknjo in jo poravnaš z {{ui:editor.tool.centerOnWorkplane}} ali {{ui:editor.tool.align}}. Oboje dela z obdajajočo škatlo oblike, torej najmanjšim kvadrom, ki jo obdaja; razpolovljen kvadrat zato še vedno velja kot cel kvadrat. Z iskanjem ukazov ([[Ctrl]]+[[K]]) najdeš obe obliki tudi pod »trikotnik« ali »streha«.

{{ui:shape.slot}} je lahko na enem koncu ožja kot na drugem, na primer za pokrov nad jermenom med dvema jermenicama. Pod {{ui:inspector.properties}} za to nastaviš {{ui:prop.slotSmallEnd}}; veliki konec je tako širok kot kapsula, stranice pa tečejo ravno od enega loka do drugega. {{ui:prop.slotCentreDistance}} je razdalja med središčema obeh lokov, torej kako daleč sta jermenici narazen. Če spremeniš mali konec, razdalja med središčema ostane in kapsula postane daljša ali krajša. Tudi zožana kapsula ostane natančno telo za zaokroževanje in za STEP.

## Nastavitve oblike

Ko je oblika izbrana, se desno pokažejo njene nastavitve. Čisto na vrhu je ime; s svinčnikom ob njem ({{ui:outliner.rename}}) vpišeš novo. [[Enter]] ga sprejme, [[Esc]] prekine, prazno ime pa vrne privzeto ime oblike. Bolj desno ključavnica zaklene obliko pred nehotenim premikanjem in oko jo skrije. Puščica čisto levo zloži nastavitve do naslovne vrstice.

Nastavitve so zasidrane ob desnem robu. Če kaj zakrivajo, jih povlečeš stran za naslovno vrstico; potem lebdijo tam, kjer jih spustiš, tudi pri naslednji obliki. Če jih spet odložiš zgoraj desno ali dvokliknes naslovno vrstico, se spet zasidrajo. Dokler lebdijo ali so zložene, se korak mreže spodaj v nastavitvah premakne spodaj desno na delovno površino.

![Nastavitve valja: telo ali luknja, premer in višina kot številka in kot drsnik.](shot:editor-overview)

- **{{ui:inspector.solid}} ali {{ui:inspector.hole}}:** Telo ostane, luknja odvzame material. Klik na {{ui:inspector.solid}} odpre barve; lastne barve, ki jih tam zmešaš, so potem pripravljene pod {{ui:inspector.recentColors}}, zadnjih osem. Več v poglavju [Telesa in luknje](chapter:telesa-in-luknje). Bucika v vrsti {{ui:inspector.keptColors}} obdrži izbrano barvo za vedno: stoji v svoji vrsti, novejše barve je nikoli ne izrinejo, in z isto buciko jo spet izpustite; v tem brskalniku se ohrani do 21 barv.
- **{{ui:inspector.transparent}}:** Tako vidiš skozi telo, na primer da prepoznaš obliko za njim.
- **{{ui:inspector.multicolor}}:** Samo pri skupini; [[Shift]]+[[M]] ga preklopi. Ko je vklopljeno, vsak del skupine pokaže svojo barvo, tudi v skupini, ki je z luknjami izračunana v eno telo (stene, ki jih luknja pusti, prevzamejo barvo telesa, v katero je bila izrezana). Če za skupino izbereš barvo, to izklopi stikalo in pobarva celotno skupino. Sveženj vedno obdrži barve svojih delov. Pri izvozu 3MF vsak del obdrži svojo barvo, tako da rezalnik dele dodeli različnim filamentom; OBJ nosi barve v točkah, na meji dveh barv torej malo manj natančno.
- **{{ui:inspector.properties}}:** Mere in vse, kar spada k tej obliki. Pri valju na primer premer, višina in število stranic. Pri zobniku zobje, pri vzmeti ovoji. Vrednost, ki si jo premaknil stran od privzete, dobi ob imenu majhno puščico: klik vrne natanko to vrednost, ne glede na to, kaj si medtem še naredil, drugače kot Razveljavi. Enako stori dvoklik na drsnik, tu in pri drsnikih v delovnih nastavitvah. Drsnik za dolžino se, ko ga vlečeš z miško, pripne na korak mreže, zato višina izide v celih milimetrih (ne pri izklopljeni mreži in ne pri kratkih drsnikih); vpisana vrednost in smerni tipki na drsniku ostaneta natančni. {{ui:inspector.saveDefaults}} spodaj naredi trenutne vrednosti začetne vrednosti te vrste oblike (isto kot {{ui:workspace.shapeDefaults}} v nastavitvah), {{ui:inspector.resetDefaults}} pa se vrne na vrednosti programa.
- **Lega in vrtenje** nižje v področju.
- **{{ui:inspector.makeEllipse}}:** Samo pri valju. Valj je vedno okrogel: ima en premer in vsak ročaj spremeni obe strani hkrati. Za oval klikni to in postane {{ui:shape.ellipse}} – isto telo, katerega dolžino in širino nato nastaviš vsako posebej. Valja s posnetjem, zaokrožitvijo ali steno ter zavrtenega ali združenega v skupino tako ni mogoče spremeniti; pri teh vzemi {{ui:shape.ellipse}} že na začetku.
- **{{ui:inspector.taper}}:** Zgoraj in spodaj različno velik, na primer za poševnino ali lijak.
- **{{ui:inspector.twist}}:** Zasuka zgornjo stran proti spodnji ali jo premakne vstran. Tako nastanejo zasukani stebri in nagnjeni stolpi.

![Skupina iz oranžnega bloka, modrega čepa in luknje, izračunana v eno telo. Z Večbarvno ostane čep moder, blok oranžen, stene luknje pa prevzamejo barvo bloka.](shot:group-multicolor)

Zožanje in zasuk imajo skoraj vse oblike. Samo zobnik, navoj, vzmet, Gridfinity, narebričenje, tečaj, piramida, ukrivljena cev, kaplja, udirki in ravnilo ju nimajo: te oblike imajo svoje fiksne mere ali, kot piramida, že svojo zgornjo stran.

![Stožec, pri katerem sta bila spremenjena polmer zgoraj in višina: majhna puščica ob vsaki vrednosti jo vrne nazaj, spodnja gumba pa shranita ali ponastavita privzete vrednosti oblike.](shot:property-reset)

{{ui:inspector.saveDefaults}} si zapomni, kar ste spremenili na tej obliki, kot začetek vsake nove oblike te vrste: mere, nastavitve oblike in njeno barvo. Valj pobarvajte zeleno in pritisnite gumb, vsak valj, ki ga dodate potem, bo zelen; druge vrste obdržijo svoje barve. {{ui:inspector.resetDefaults}} vrne vrsto na to, s čimer jo začne program. Katere vrste imajo lastne privzete vrednosti, je označeno v nastavitvah pod {{ui:workspace.shapeDefaults}}. Z njimi se začne tudi nov načrt, ki ga začneš na začetni strani; vrednosti si zapomni ta brskalnik.

Zožan ali nagnjen kvader, valj, elipsa, večkotnik, cev ali obroč obdrži svojo natančno obliko, prav tako kapsula, zvezda, srce, polmesec, lastovičji rep in zaobljen kvader brez zaobljenega zgornjega in spodnjega roba: posnetja in zaokrožitve gredo nanje kot na nespremenjeno obliko, izvoz STEP pa jih zapiše. To velja tudi za zasukano obliko: njen presek se natančno vrti z njo, stranice pa se enakomerno vijejo od spodaj navzgor.

Vpisovanje je natančnejše od vlečenja. Vsa številska polja sprejemajo milimetre, pa tudi odstotke: kdor pri širini 40 mm vpiše »50 %«, dobi 20 mm. Znajo tudi računati: »15*3«, »120-2*4« ali »(40+2)/2« dajo 45, 112 in 21; namesto * gre tudi x. Račun si polje zapomni, v lastnostih kot v poljih za mere okoli označenega telesa: ko pozneje spet klikneš vanj, stoji namesto številke formula, dokler vrednost še ustreza, in jo spremeniš kar na mestu, iz »(140+2)/2« postane »(40+6)/2«. Če telo povlečeš za ročico ali ga spremeniš v velikosti, formula ne ustreza več in polje spet kaže samo številko. V številskem polju, v katerega si kliknil, miškino kolesce in tipki [[↑]] in [[↓]] spremenita vrednost za en korak, s [[Shift]] za večjega in z [[Alt]] za finejšega. V polju za velikost ali položaj [[Shift]] namesto tega skoči za korak mreže, pri izklopljeni mreži pa za deset korakov.

## Kako okroglo je okroglo? Število stranic

Okrogle oblike, kot so valj, stožec, cev, elipsa ali izvrtine, imajo v lastnostih stikalo {{ui:prop.sidesFollowSize}} in drsnik {{ui:prop.sides}}. {{ui:shape.torus}} ima dva drsnika: {{ui:prop.torusSides}} okoli obroča in {{ui:prop.torusSteps}} okoli cevi. Tudi tam sledita velikosti, dokler ju ne primeš, zato velik torus ne kaže robov. Ozadje: za prikaz ter za STL, 3MF in OBJ layerling krog nariše kot večkotnik iz mnogo majhnih stranic. Več stranic, bolj gladko, a več trikotnikov.

{{ui:prop.torusTube}} določa, kako debela je cev, gledano od zgoraj. Višina cev le stisne ali raztegne, zato plosk obroč obdrži luknjo; pri polovici zunanje mere se luknja zapre. Ko vlečeš ročaje, se cev skalira skupaj z obliko. Natančno telo za posnetja, zaokrožitve in STEP ostane le torus, katerega cev je tako debela, kot je torus visok.

**Kje je število stranic pomembno**

- **Pri izvozu za rezalnik** (STL, 3MF, OBJ). Valj z malo stranicami tam pride kot večkotnik.
- **Pri izračunu teles in lukenj.** Izvrtina, ki je izrezana iz luknje z malo stranicami, je v končnem delu oglata. To velja tudi za luknje za vijake.
- **V prikazu.** Veliko zelo finih oblik upočasni urejevalnik.

**Kje ni pomembno**

- **Pri izvozu STEP.** Zapiše okroglo obliko, ne večkotnika.
- **Pri posnetjih in zaokrožitvah** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}), dokler oblika ostane okrogla. To je tako, če nisi nastavil števila stranic, če je število vsaj tako visoko kot privzeta vrednost oblike ali če se večkotnik od kroga razlikuje za največ {{value:EXACT_ROUND_TOLERANCE}} mm. Privzeta vrednost je {{value:ROUND_FROM_SIDES}} stranic pri valju, elipsi, cevi in stožcu, {{value:ROUND_FROM_ROOF_SIDES}} pri {{ui:shape.roundRoof}}, {{value:ROUND_FROM_SPHERE_STEPS}} korakov pri {{ui:shape.sphere}}, {{value:ROUND_FROM_HALF_SPHERE_STEPS}} pri {{ui:shape.halfSphere}}, {{value:ROUND_FROM_TORUS_SIDES}} stranic in {{value:ROUND_FROM_TORUS_STEPS}} korakov pri {{ui:shape.torus}} in {{ui:prop.quality}} {{value:ROUND_FROM_BENT_TUBE_QUALITY}} pri okrogli {{ui:shape.bentTube}}.
- **Pri navoju, vzmeti ali poševnem zobniku.** Robno orodje in izvoz STEP vzameta natančno telo; {{ui:prop.quality}} določa samo, kako fino je oblika narisana.

**Kje spet postane pomembno**

- **Pri posnetjih in zaokrožitvah oblike z malo stranicami.** Če število stranic nastaviš pod privzeto vrednost, robno orodje obravnava obliko tako, kot je narisana: valj s 6 stranicami ostane šestrobna palica, zaokrožitev pa teče okoli njenih šestih robov. Tako lahko zgradiš na primer žep za matico z zaobljenimi vogali. Za okroglo obliko pusti {{ui:prop.sidesFollowSize}} vklopljeno.

**Kako to uporabiš**

- **Pusti {{ui:prop.sidesFollowSize}} vklopljeno.** Potem layerling izbere število stranic glede na premer, tako da se večkotnik od pravega kroga razlikuje za največ {{value:ROUND_DEVIATION_TOLERANCE}} mm, kar je daleč pod tem, kar tiskalnik loči. Majhne oblike dobijo vsaj {{value:MIN_AUTOMATIC_SIDES}} stranic, velike več.
- **Manj stranic** vzameš, kadar namenoma želiš večkotnik (a za to je {{ui:shape.polygon}}) ali kadar urejevalnik postane počasen zaradi zelo veliko okroglih oblik.
- **Več stranic** skoraj nikoli ne potrebuješ. Samo pri zelo velikih okroglih delih, če v STL vidiš robove.
- **Za dele, ki jih obdelaš samo z robovi ali predaš kot STEP,** je število stranic vseeno.

## Delo z ročicami

Poleg nastavitev so na sami obliki ročice:

- **Vogali in robovi** povlečejo obliko večjo ali manjšo. Če pri vlečenju vogala držiš [[Shift]], rasteta širina, globina in višina skupaj in razmerja se ohranijo; z [[Alt]] oblika raste od sredine namesto od nasprotnega vogala. Brez tipkovnice ali če nočeš držati tipke, zgoraj v lastnostih vklopiš {{ui:inspector.keepProportions}}: potem vogali vedno ohranijo razmerja, in če vpišeš širino, globino ali višino, se drugi dve spremenita za isti faktor. Nastavitev se zapomni.
- Črna **puščica nad** obliko jo dvigne ali spusti; če od začetka držiš [[Alt]], nastane kopija tam, kjer spustiš, tako lahko zlagaš. Bela ročica **na zgornji ploskvi** spremeni višino.
- **Zakrivljene puščice** jo vrtijo.
- Na **številkah** ob obliki vidiš mere. Klik nanje odpre polje, v katero vpišeš želeno številko. Z [[Enter]] oblika raste od roba, ki je nasproten številki, kot pri vlečenju; z [[Alt]]+[[Enter]] raste okoli svoje sredine, zato oblika, ki je bila poravnana z drugo, ostane poravnana. To velja za širino in dolžino; višina vedno raste navzgor od spodnje ploskve. Polja v lastnostih na desni ohranijo sredino brez tipke. [[Tab]] obdrži številko in odpre naslednje polje (širina, globina, višina); [[Shift]]+[[Tab]] gre nazaj. V polju lastnosti, na katero si kliknil, vrednost spreminja tudi kolesce miške: eno enoto na stopnjo, desetkrat toliko s [[Shift]], desetino s [[Ctrl]] in stotino s [[Alt]]. Polje, na katero nisi kliknil, prepusti kolesce plošči, ki se pomika.
- **Klik na vogal** (brez vlečenja) odpre širino in globino skupaj. Vpiši prvo številko, s [[Tab]] preskoči na drugo in obe sprejmi z [[Enter]]. [[Esc]] prekine.

Če si obliko zavrtel za prave kote, na primer z {{ui:editor.tool.layFlat}} položil na stran, se polja v lastnostih imenujejo po smeri, v katero mera zdaj teče: {{ui:prop.height}} je tisto, kar gre navzgor, {{ui:prop.width}} teče vzdolž X in {{ui:prop.length}} vzdolž Y. Če pri ležeči obliki vpišeš višino, se torej spremeni navpična mera, spodnja stran pa ostane na plošči. Če oblika stoji poševno pod drugim kotom, polja kažejo njene lastne mere, opomba pod njimi pa to pove.

Brez miške gre s tipkovnico: smerne tipke premaknejo izbor za en korak mreže (0,01 mm, ko je mreža izklopljena), s [[Shift]] za pet, ali za deset, če v nastavitvah pod {{ui:workspace.appearance}} nastaviš {{ui:workspace.gridMajorEvery}} na {{ui:workspace.gridMajorSteps|10}}: tako daleč kot do naslednje temnejše črte, kot v Tinkercadu. Ravnajo se po pogledu: [[→]] premakne tja, kjer je na zaslonu desno, [[↑]] stran od gledalca, tudi če si ploščo zavrtel. Če obliko premakneš iz slike, se pogled premakne z njo. [[Ctrl]]+[[↑]] in [[Ctrl]]+[[↓]] jo dvigneta in spustita. [[R]] zavrti za 45°, [[Shift]]+[[R]] za 22,5°. [[D]] odloži izbor na delovno ravnino.

Ročice povlečejo obliko do velikosti tvoje plošče, najmanj 220 mm v širino in globino. Večje gre s številko v lastnostih; tako povečana oblika se ob naslednjem prijemu ne skrči nazaj. Lastno zgornjo mejo za vsako obliko nastaviš v nastavitvah pod {{ui:workspace.shapeDefaults}} z {{ui:workspace.customLimit}}.

Korak mreže je spodaj desno v urejevalniku in ga lahko kadarkoli spremeniš.

## Kopiranje in podvajanje

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} in {{ui:editor.tool.duplicate}} so v orodni vrstici ({{ui:editor.group.clipboard}}). Z [[Ctrl]]+[[D]] podvojiš izbor. layerling si pri tem zapomni, kako si kopijo nazadnje premaknil ali zavrtel, in isto uporabi ob naslednjem podvajanju. Tako z nekaj pritiski tipk nastane vrsta lukenj ali stopnic. Za pravilne razporeditve je poleg tega polje, ki je opisano v poglavju [Izbiranje in razporejanje](chapter:izbiranje-in-razporejanje).

> **Namig:** Če oblika ne zavzame želene velikosti, je razlog pogosto v mejah za nove oblike. Pod {{ui:workspace.shapeDefaults}} v nastavitvah določiš, kako se vsaka oblika začne in kako velika lahko največ postane.

## Oblike po meri

Držalo, ročaj ali osnovna plošča, ki jo potrebuješ znova in znova, pride med {{ui:myShapes.title}}. Stoje na seznamu oblik čisto na vrhu, nad {{ui:myShapes.basicShapes}}, in jih lahko zložiš s puščico.

1. Označi eno ali več teles, tudi luknje, skupine ali uvožen model.
2. Odpri seznam oblik in klikni {{ui:myShapes.saveSelection}}. Vpiši ime in potrdi z {{ui:common.save}}.
3. V vsakem načrtu klik na ploščico vstavi obliko kot vsako drugo. Ploščico lahko tudi povlečeš na delovno površino, potem pristane tam, kjer jo spustiš. Oblika nato visi na kazalcu kot vsaka druga: sledi mu, tudi čez ploskve drugih teles, klik jo odloži, [[Esc]] jo umakne.

Več teles pride ven skupaj, tako kot so stala drugo glede na drugo, in ostanejo posamezno izbirna. Svinčnik na ploščici jo preimenuje, koš jo odstrani po vprašanju. Kar je že v načrtih, ostane pri tem ohranjeno.

{{ui:myShapes.title}} so v tem brskalniku, ločeno od načrtov, in so ob naslednjem zagonu takoj spet tam. {{ui:dashboard.backupAll}} na začetni strani jih shrani skupaj z načrti, ob odpiranju varnostne kopije se vrnejo oboje. Samo oblike shraniš z {{ui:myShapes.backup}} (puščica navzdol) kot datoteko ZIP in jih z {{ui:myShapes.load}} (puščica navzgor) prineseš v drug brskalnik. {{ui:myShapes.load}} sprejme tudi posamezne načrte `.lyl`, vsak potem postane oblika. Kar je že tam, se ne ustvari dvakrat.

### Mape

Veliko oblik po meri je laže razvrstiti v mape. {{ui:myShapes.newFolder}} (mapa s plusom poleg {{ui:myShapes.saveSelection}}) vpraša za ime in ustvari mapo na vrhu; mapa s plusom pri mapi, {{ui:myShapes.newSubfolder}}, ustvari mapo v njej. Mape segajo tri ravni globoko: mapa na tretji ravni sprejme oblike, ne pa novih map. Mape stojijo nad oblikami, ki niso v nobeni mapi, urejene po imenu, in se odpirajo in zapirajo s puščico; število pri mapi šteje oblike v njej in v mapah pod njo. Pri shranjevanju izberi mapo na seznamu poleg imena; z {{ui:myShapes.noFolder}} oblika ostane na vrhu.

Mapa s puščico na ploščici premakne obliko v drugo mapo ali z {{ui:myShapes.noFolder}} spet ven. Svinčnik pri mapi jo preimenuje, koš jo po vprašanju izbriše skupaj z mapami in oblikami v njej. Same mape ni mogoče premakniti: ustvari novo tam, kamor sodi, in vanjo premakni oblike. Varnostna kopija ohrani mape, in ob nalaganju se oblike vrnejo na isto mesto. Na strežniku so mape mape v `Custom shapes`.

### Oblike po meri na strežniku

Če je [shranjevanje na strežniku](chapter:datoteke-in-shranjevanje) vklopljeno, področje pokaže dve skupini: {{ui:myShapes.onServer}} in {{ui:myShapes.inBrowser}}. Pri shranjevanju izbereš, kam oblika pride; privzeto je strežnik. Tam leži v mapi `Custom shapes`, kot lastna datoteka `.lyl` s sličico predogleda, in je zato na voljo na vsaki napravi, ki doseže strežnik. Obliko iz brskalnika postaviš na strežnik z oblakom na njeni ploščici; v brskalniku je potem ni več dvakrat.

Mapa `Custom shapes` se pokaže tudi na začetni strani. Tam obliko odpreš kot načrt, jo spremeniš in se samodejno shrani kot vsak strežniški načrt. Ob naslednjem vstavljanju je nova. Ker shranjevanje na strežniku nima prijave, vsak, ki doseže strežnik, vidi iste oblike.

## Ovijanje okoli valja

Vzorec, logotip ali napis naj pride na kozarec, škatlo ali cev? Najprej ga položi ravno na ploščo, na primer kot uvožen SVG ali kot besedilo, tako kot naj izgleda od zgoraj. Potem ga v nastavitvah oblike pod {{ui:inspector.wrapCylinder}} oviješ okoli valja:

1. Razpri {{ui:inspector.wrapCylinder}} in vpiši {{ui:inspector.wrapDiameter}} stene valja, na primer zunanji premer tvojega kozarca. Deluje tudi z desetinkami milimetra, na primer 63,5.
2. Klikni {{ui:inspector.wrapApply}}. Kar je ležalo od leve proti desni, zdaj teče okoli valja, zadnji rob postane zgoraj, debelina pa štrli navzven.
3. Označi ovito obliko in valj ter ju poravnaj na sredino, levo-desno in spredaj-zadaj. Sredina ovite oblike je os valja, zato potem sedi natanko na njegovi steni.

Za gravuro vklopi {{ui:inspector.wrapInward}}: potem gre debelina v steno. Obliko nastavi kot luknjo, jo poravnaj na sredino in združi v skupino z valjem.

Oblika, ki je že ovita, je mreža ovitega predmeta in je ni mogoče ovijati znova: razveljavi ovijanje ali pa ponovno ovij ravno izvirnik z drugim premerom.

Rezultat je mreža kot uvožen model. Z Razveljavi je oblika spet ravna; za drug premer najprej nazaj in nato znova ovij. Daljše od enega kroga okoli valja ne gre, tedaj layerling navede najmanjši premer, ki ustreza.

## Površinska tekstura

Utori, narebričenje, satovje ali izbokline na telesu, za boljši oprijem ali za lepši videz: v nastavitvah oblike razprite {{ui:inspector.surfaceTexture}}. Enako naredi gumb {{ui:inspector.surfaceTexture}} zgoraj v skupini {{ui:editor.group.modify}}: kartico za izbrano telo razpre in spet zapre ter sveti, dokler je odprta.

1. Izberite {{ui:inspector.surfacePattern}}, njegov {{ui:inspector.surfaceSpacing}} in {{ui:inspector.surfaceDepth}}. {{ui:inspector.surfaceDirection}} pove, ali gre vzorec v telo ali iz njega izstopa. Pri vzorcu {{ui:surfaceTexture.bumps}} pri {{ui:inspector.surfaceBumpShape}} izberete med {{ui:surfaceTexture.bumpDome}}, {{ui:surfaceTexture.bumpCone}}, {{ui:surfaceTexture.bumpSoft}} in {{ui:surfaceTexture.bumpFlat}}.
2. Pri {{ui:inspector.surfaceProjection}} vzemite {{ui:surfaceTexture.cylinder}} za okrogla telesa, kot so lonček, gumb ali ročaj. Vzorec teče okoli izbrane {{ui:inspector.surfaceAxis}}, razmik pa se nekoliko zaokroži, da gre naokoli celo število utorov ali celic: vzorec se sklene brez šiva. {{ui:surfaceTexture.allRound}} je primeren za telesa, ki niso okrogla, {{ui:surfaceTexture.flatProjection}} za pokrov ali ploščo, gledano od zgoraj. Če pustite {{ui:surfaceTexture.auto}}, Layerling izbere sam: {{ui:surfaceTexture.cylinder}} pri okroglih telesih in pri pokončnih oglatih, kot je škatla – vzorec tedaj sledi obrisu in brez šiva teče okoli robov, dvignjen vzorec se okoli njih zaobli –, {{ui:surfaceTexture.allRound}} pri drugih oglatih.
3. Kliknite {{ui:inspector.surfaceApply}}. Veliko telo potrebuje nekaj sekund; medtem lahko delate naprej.

Če naj vzorec dobi le del ploskev, na primer samo zgornja stran škatle, kliknite {{ui:inspector.surfaceFacesPick}} in nato v pogledu ploskve: zgornjo, spodnjo ali stransko. Ploskev sega do ostrih robov telesa; pri valju je plašč ena ploskev, zgornja in spodnja stran pa sta vsaka ena. Izbrane ploskve zasvetijo, drugi klik eno spet odstrani, {{ui:inspector.surfaceFacesClear}} pa vzorcu spet da celo telo. Vzorec dobijo samo izbrane ploskve; vse druge ostanejo, kot so bile, in obdržijo malo trikotnikov. Na zgornji ali spodnji strani leži vzorec ravno; na okrogli zgornji strani tečejo utori, vrv in pletenina v krogih okoli sredine, kot letnice drevesa. {{ui:inspector.surfaceFaceTurn}} zavrti vzorec na zgornji in spodnji strani: pri 0° tečejo vrste vzdolž sprednjega roba, pri 90° vzdolž stranskega. {{ui:inspector.surfaceCapStyle}} tam preklaplja utore, vrv in pletenino med vrstami in krogi; pri oglatem telesu krogi sledijo obrisu. {{ui:inspector.surfaceCapEdge}} pove, kaj se zgodi na robu med stranico in zgornjo ali spodnjo stranjo z vzorcem: {{ui:surfaceTexture.edgeSharp}} pusti, da se oboje konča pri robu. Pri {{ui:surfaceTexture.edgeOver}} se vzorec stranice zaobljeno prevesi čez rob in zavzame vso zgornjo stran: vrste vrvi, pletenine in vodoravnih utorov se nadaljujejo kot krogi, navpični in poševni utori kot žarki skoraj do sredine. {{ui:surfaceTexture.edgeFold}} naredi isto le kot rob; znotraj leži lastni vzorec zgornje strani po nastavitvi {{ui:inspector.surfaceCapStyle}}. {{ui:surfaceTexture.edgeBead}} pri vsakem vzorcu položi okoli roba obrobo – vrvico, zaključno verižico ali okrogel valj.

Pod {{ui:inspector.more}} izberete, kam pride vzorec: zunanje in notranje stene, kako daleč ostaneta spodnja in zgornja stran gladki (gladka spodnja stran drži telo ravno na podlagi), del višine in ali ostri robovi ostanejo gladki. Ob vsem, kar ostane gladko, se vzorec pojavi mehko; {{ui:inspector.surfaceFade}} določa, na koliko milimetrih. Manjša kot je, bližje robu seže vzorec; dvignjen vzorec izzveni vse do roba. Na ravnih stranicah oglatega telesa, kot je kocka, se namesto tega konča na tej razdalji ob ravnem robu: utori in rombi se končajo s kratko steno, ostanejo pa le cele izbokline. {{ui:inspector.surfaceProfile}} določa prerez utora ali fuge: koničast in ploščat sta natančna, okrogel v toliko korakih, kot jih dovoli {{ui:inspector.surfaceDetail}}.

Poleg vzorcev {{ui:surfaceTexture.grooves}}, {{ui:surfaceTexture.knurl}}, {{ui:surfaceTexture.honeycomb}} in {{ui:surfaceTexture.bumps}} so na voljo še drugi. {{ui:surfaceTexture.cells}} so nepravilne celice kot tlakovci ali posušena glina; njihove fuge se odrežejo čisto kot pri satovju, druga {{ui:inspector.surfaceSeed}} pa jih razporedi na novo. {{ui:surfaceTexture.knit}}, {{ui:surfaceTexture.rope}} in {{ui:surfaceTexture.weave}} posnemajo pletene zanke, navito vrv in košaro iz količkov in protja; začnejo izbočeni in zaobljeni, v velikosti svojih predlog. {{ui:surfaceTexture.grain}} površino fino nahrapavi kot peskanje; zrnatost leži v prostoru, brez šiva in brez raztegovanja. {{ui:surfaceTexture.image}} vzame sivo sliko kot višinsko karto: eno od predlog, kot so les, topografija ali teraco, ali lastno z {{ui:inspector.surfaceImageLoad}}. Svetlo dobi polno globino; {{ui:inspector.surfaceSpacingImage}} določa, kako široka je ploščica, pod {{ui:inspector.surfaceImageTiling}} pa se ploščice ponavljajo, zrcalijo ali zamaknejo.

{{ui:surfaceTexture.carbon}} položi na telo ogljikova vlakna v keper vezavi: pokončne in prečne trakove, enega čez in pod drugega, od traku do traku zamaknjene za enega, tako da nastane znana diagonala. {{ui:inspector.surfaceCarbonWeave}} izbere {{ui:surfaceTexture.carbonTwill22}}, enakomerno tkanino večine karbonskih delov, ali {{ui:surfaceTexture.carbonTwill21}} in {{ui:surfaceTexture.carbonTwill31}}, kjer so pokončni trakovi videti dolgi in prečni kratki. {{ui:inspector.surfaceSpacingCarbon}} določa, kako široki so pokončni trakovi; {{ui:inspector.surfaceCarbonCross}} naredi prečne širše ali ožje za neenakomerno tkanino (0: enako široki). Okrog telesa se širina trakov malo zaokroži, da se tkanina sklene brez šiva. Sama vlakna so za tisk veliko pretanka: vidni so trakovi z njihovimi križišči.

{{ui:surfaceTexture.bricks}} položi na telo opečni zid z vdolbenimi fugami kot malta. {{ui:inspector.surfaceBrickBond}} izbere, kako ležijo opeke: {{ui:surfaceTexture.bondRunning}} kot pri večini zidov, {{ui:surfaceTexture.bondStack}} ali s kratkimi opekami med dolgimi ({{ui:surfaceTexture.bondEnglish}}, {{ui:surfaceTexture.bondEnglishCross}}, {{ui:surfaceTexture.bondFlemish}}). {{ui:inspector.surfaceSpacingBricks}} in {{ui:inspector.surfaceBrickHeight}} štejeta od fuge do fuge in se malo zaokrožita, da se prilegajo cele opeke: okrog skodelice, od roba do roba stranice škatle in od spodaj do vrha; {{ui:inspector.surfaceBrickJoint}} pove, kako široke so fuge. Pod {{ui:inspector.more}} {{ui:inspector.surfaceBrickVary}} vsako opeko spusti malo globlje, kot pri starem zidu.

Vzorec {{ui:surfaceTexture.cracks}} pusti, da po površini rastejo razpoke kot pri kintsugiju, s pregibi, vejami in širino, ki se proti koncu tanjša. {{ui:inspector.surfaceCrackStart}} pove, kje se začnejo: na zgornjem robu vaze ali skodelice, na dnu, od roba proti sredini krožnika ali kjerkoli; pod {{ui:inspector.surfaceCrackStyle}} postanejo strele. Z možnostjo {{ui:inspector.surfaceCrackGold}} se zareza zapolni s samostojnim delom v zlati barvi, za drugi filament; gre zraven, ko površino spremeniš ali odstraniš. Pod {{ui:inspector.more}} nastaviš veje, nazobčanost in okruške na robu, druga {{ui:inspector.surfaceCrackSeed}} pa razpoke na novo izžreba.

{{ui:surfaceTexture.bark}} položi lubje drevesa okrog debla: {{ui:surfaceTexture.barkOak}}, {{ui:surfaceTexture.barkPine}}, {{ui:surfaceTexture.barkSpruce}}, {{ui:surfaceTexture.barkBirch}} ali {{ui:surfaceTexture.barkBeech}}, vsako v svoji velikosti in globini. {{ui:surfaceTexture.wood}} naredi iz telesa kos lesa: pod {{ui:inspector.surfaceWoodType}} izberi hrast, jesen, bukev, bor ali oreh, pod {{ui:inspector.surfaceWoodCut}} deblo brez lubja ali desko, tangencialno žagano z loki ali radialno z ravnimi črtami. {{ui:inspector.surfaceRingWidth}} naredi teksturo fino ali grobo. Z {{ui:inspector.surfaceEndRings}} konca debla pokažeta letnice, ki se ujemajo s teksturo na bokih: letnice tečejo skozi celo telo kot v pravem kosu lesa. Pod {{ui:inspector.more}} dodaš {{ui:inspector.surfaceWoodKnots}}, letnice pa se upognejo okrog njih.

Z vzorcem {{ui:surfaceTexture.text}} nalepiš besedilo na telo kot pritisnjeno nalepko: površina se okoli mesta odvije, zato črke ohranijo velikost na trebuhu vaze, na poševni steni ali čez rob škatle. Kam pride, povesta »Naokoli« (0° je spredaj, 90° desno) in »Višina« v % vzdolž osi; če os leži na X ali Y, je 0° zgoraj – tako pride besedilo na ravno ploščo. Z nastavitvijo {{ui:inspector.surfaceDirection}} ga vgraviraš ali dvigneš. Čez pravi vogal se strga kot nalepka; vrstica stanja ti to pove.

Če naj del telesa ostane gladek ali naj vzorec dobi le del, uporabite pomožno telo: tja postavite kvader, valj ali kroglo, ga izberite in pod {{ui:inspector.surfaceMask}} izberite {{ui:surfaceTexture.maskExclude}} ali {{ui:surfaceTexture.maskOnly}}. Postane prosojno in se upošteva, ko drugo telo dobi teksturo, tudi če je skrito. Pred tiskanjem ga skrijte ali izbrišite.

Rezultat je mreža kot uvožen model in ohrani telo, na katerem je nastal. Če ga pozneje izberete, tudi po shranjevanju, kartica pokaže nastavitve, s katerimi je nastal: spremenite jih in kliknite {{ui:inspector.surfaceChange}}, pa se tekstura znova izračuna na tem telesu, tam in v velikosti, kot zdaj stoji telo s teksturo. {{ui:inspector.surfaceRemove}} vrne gladko telo. Telesa mask se pri spremembi znova upoštevajo: če boste teksturo pozneje morda še spreminjali, jih raje skrijte kot izbrišite. Razveljavi prav tako vrne vsakega od teh korakov.

## Vaza

{{ui:shape.vase}} je samostojno telo za vaze, lonce in senčnike. Njene mere so pod {{ui:inspector.properties}}, oblika in vzorec na kartici {{ui:inspector.vaseForm}}; vse lahko kadar koli spremenite, tudi po shranjevanju:

- {{ui:prop.vaseProfile}}: steklenica, trebušasta, skleda z vratom, sod, valj ali lijak. Višina in največji premer sta meri same oblike: povlecite ročaje ali vpišite {{ui:prop.vaseDiameter}} in {{ui:prop.height}}.
- {{ui:prop.vaseSection}}: krog, mnogokotnik z zaobljenimi vogali ali val (mehak, koničast, loki ali lamele). {{ui:prop.vaseTwist}} ga po višini zasuka, {{ui:prop.vaseSway}} ga zaniha sem in tja.
- {{ui:prop.vaseBody}}: {{ui:vase.bodySolid}} je za način vaze v rezalniku (tudi »spiralizacija«): rezalnik natisne eno steno v spirali, brez pokrova in polnila, zato je telo narisano polno. {{ui:vase.bodyHollow}} da pravo steno in dno za običajen tisk. Z {{ui:prop.vaseBottom}} na 0 mm votla vaza nima dna: cev, odprta na obeh koncih, za lijake, ustnike in cevi.
- {{ui:prop.vaseEffect}}: nova vaza je gladka. Na izbiro so utori, proge, Voronojeve celice ali ploskve (low poly) na zunanji strani, po želji le v delu višine; spadajo k vazi in ostanejo z njo nastavljivi.

{{ui:prop.vaseSection2}} pusti, da prerez po višini mehko preide v drugega, na primer iz kroga spodaj v šestkotnik zgoraj.

Gumb {{ui:inspector.vaseDraw}} na vrhu nastavitev vaze odpre lastno veliko okno nad delovno površino: v njem vazo narišeš sam, v pravih milimetrih. Premakneš ga za naslovno vrstico in ga za vogal povečaš; vaza v pogledu sledi vsaki spremembi. {{ui:vaseDraw.tabProfile}} jo pokaže od strani: vleci točke, najvišja določa višino, najširša premer; {{ui:vaseDraw.handle}} da točki kot, {{ui:vaseDraw.corner}} pregib. {{ui:vaseDraw.tabSection}} pokaže prerez od zgoraj, {{ui:prop.vaseDrawSymmetry}} pa narisano zrcali ali ponavlja. {{ui:vaseDraw.tabTwist}} nariše zasuk kot krivuljo po višini. Datoteka SVG iz risarskega programa postane prerez ali oblika telesa, mreža vzorčne vaze (STL, 3MF, OBJ) oblika telesa. Fotografijo vaze lahko podložiš in obrišeš, ali pa {{ui:vaseDraw.takeOutline}} prevzame njen obris. En poteg z miško je en korak razveljavitve; dokler vlečeš, pogled kaže vazo grobo.

Kartica {{ui:inspector.vaseFloor}} vsebuje, kar telo poleg oblike potrebuje. Pri votli vazi: odtočne luknje z naklonom proti njim, votlo nogo, predrto steno ({{ui:prop.vaseCutout}}: Voronoi, satovje, rombi ali krogi, za svetilke in košare) in {{ui:prop.vaseLamp}}, viseč, stoječ z grlom ali nad LED-ploščkom. Pri polni vazi {{ui:prop.vaseReinforce}} izreže fine reže, skozi katere rezalnik v načinu vaze natisne rebra znotraj ali dvojno steno, v enem potegu. Vdolbine za gumijaste nogice gredo pri obeh. {{ui:prop.vaseWatertight}} dvigne steno in dno votle vaze na vsaj 1,6 mm.

Na kartici {{ui:inspector.vaseParts}} dobi vaza svojo opremo. {{ui:prop.vaseLegs}} so lahko oblikovane skupaj z vazo, potem so del nje, ali vtične, s pušami v dnu; stojalo nosi vazo od spodaj. {{ui:prop.vaseSaucer}} ujame vodo ali je skrit v nogi. Votla vaza lahko sprejme {{ui:prop.vaseInsert}}: vložek za rastlino, vložek z zalogo vode za lonec, ki se zaliva sam, držalo za stebla ali cevke za vodo. {{ui:prop.vaseLid}} se natakne čez rob, zaskoči v utor ali se privije na navoj v steni. {{ui:inspector.vasePartsMake}} postavi dele kot samostojne predmete, pripravljene za tisk, poleg vaze, obrnjene na glavo, kjer se tako bolje natisnejo. Puše, utor ali navoj vaza že ima. Po spremembi jih postavi znova: prejšnji deli se zamenjajo. Če del ne ustreza tej vazi, urejevalnik to pove, na primer ko vložek ne bi šel skozi ozek vrat.

Kartica {{ui:inspector.vasePrint}} pove, kaj vaza potrebuje za tisk: težo v izbranem materialu ({{ui:prop.vaseMaterial}}) in dolžino filamenta – pri polni vazi izračunano za način vaze v rezalniku, z eno linijo vzdolž stene. Pod tem so napotki za tisk: previs nad 45° z višino, kjer je, pretanka stena, kaj potrebujejo pokrov, svetilka ali noge, in nastavitve rezalnika za rebra in dvojno steno.

{{ui:prop.vaseQuality}} določa, kako fino se vaza razdeli na trikotnike: finejše je videti bolj gladko, a pri velikih vazah upočasni urejevalnik.
