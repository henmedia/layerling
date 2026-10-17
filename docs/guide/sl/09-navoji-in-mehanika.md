---
title: Navoji, zobniki in drugi sestavni deli
summary: Vijaki, matice in navojne luknje, ki se ujemajo, poleg tega zobnik, vzmet, ukrivljena cev, lastovičji rep, kapljična izvrtina ter stopničasta in udirna izvrtina.
---

Knjižnica oblik poleg osnovnih oblik vsebuje nekaj sestavnih delov, ki bi jih sicer morali mukoma sestavljati. Vse lahko pozneje spremeniš v njihovih nastavitvah.

## Navoj

V knjižnici oblik izberi {{ui:shape.thread}}. Pod {{ui:inspector.threadRole}} se odločiš, kaj naj bo:

- **{{ui:thread.rod}}:** valj z navojem, na primer vijak brez glave.
- **{{ui:thread.screw}}:** z glavo. {{ui:inspector.threadHead}} izbereš: {{ui:thread.headCylinder}}, {{ui:thread.headCountersunk}} ali {{ui:thread.headHex}}.
- **{{ui:thread.nut}}:** ustrezna matica.
- **{{ui:thread.bore}}:** navojna luknja. To je luknja. Povleci jo v del, oboje združi v skupino in del ima notranji navoj.

![Vijak z valjasto glavo. Desno sta vrsta in oblika glave, nižje velikost, korak in profil.](shot:thread-screw)

Velikost izbereš pri {{ui:prop.threadSize}} s seznama: metrični od M2 do M12, palčni UNC in UNF od št. 4 do 1 palca in cevni navoji G1/16 do G4. Če izbereš {{ui:thread.customSize}}, {{ui:prop.diameter}} in {{ui:prop.pitch}} določiš sam. Pri palčni velikosti ali velikosti G polje namesto koraka v milimetrih vpraša po {{ui:prop.threadsPerInch}}.

Seznam razvršča velikosti po vrstah, vrstica pod poljem pa navede vrsto izbrane velikosti, s primeri iz vsakdana:

- **M, običajni navoj:** metrični ISO običajni navoj po ISO 261, kot pri standardnih vijakih in maticah.
- **UNC, ameriški palčni grobi:** Vijak za kamero in stativ je 1/4"-20 UNC (ISO 1222), večje glave stativov vzamejo 3/8"-16 UNC.
- **UNF, ameriški palčni fini:** isti premeri kot UNC z finejšim korakom (ASME B1.1).
- **G, cevni navoj:** Cev za tuš se priključi z G1/2, dovodna cev pralnega stroja z G3/4. Vrtna pipa se konča z G3/4, manjše pipe z G1/2; tja se privije priključek pipe sistema vrtnih cevi.

Velikosti G so cilindrični Whitworthovi cevni navoji po ISO 228-1, kot sedijo na fitingih za vodo, plin, hidravliko in pnevmatiko. Velikost poimenuje cev, ne navoj: G1 meri čez navoj 33,249 mm. Če izbereš velikost G, se profil preklopi na {{ui:thread.profileWhitworth}}, metrična ali palčna velikost ga spet nastavi na {{ui:thread.profileV}}. {{ui:thread.profileTrapezoidal}} ali {{ui:thread.profileRound}}, ki si ju sam izbral, ostaneta. Standard določa samo navoj; glava vijaka in matica dobita pri velikosti G enaka razmerja kot pri samostojno izbranem premeru. Stožčasti cevni navoji R, Rc in Rp niso zraven.

Dodatne nastavitve:

- **{{ui:prop.threadHand}}:** {{ui:thread.right}} ali {{ui:thread.left}}.
- **{{ui:prop.threadProfile}}:** {{ui:thread.profileV}} je standardni profil metričnih in palčnih navojev, {{ui:thread.profileWhitworth}} profil cevnih navojev G: 55° z zaobljenimi vrhovi in dolinami. {{ui:thread.profileTrapezoidal}} in {{ui:thread.profileRound}} imata ploske vrhove in doline. To se običajno natisne zanesljiveje, ker ne nastanejo tanki vrhovi.
- **{{ui:thread.profileCustom}}:** Trapez, ki ga oblikuješ sam, z ravnim vrhom in ravnim dnom enake širine. {{ui:prop.threadFlankAngle}} je kot med bočnicama zoba: 60° je ostri V-navoj, 30° trapezni navoj, pri 90° ali manj pa nobena bočnica ni položnejša od 45°, zato se navoj natisne brez podpor. {{ui:prop.threadDepth}} in {{ui:prop.threadCoreDiameter}} sta ena mera, povedana na dva načina: premer jedra je premer minus dvakratna globina, in sprememba enega spremeni drugo. Nov lasten profil se začne z globino V-navoja pri 60°. Globina ima meje, ki so odvisne od kota in koraka: ne plitveje od desetine koraka, ne globlje od 40 % premera in ne tako globoko, da bi bočnici zavzeli več kot devet desetin koraka. Če spremeniš korak, globina sledi sorazmerno; če navoj povečaš ali pomanjšaš, tudi globina. Zračnost in posnetja delujejo kot pri drugih profilih. Prek mostu MCP je profil `custom` s `threadFlankAngle` in `threadDepth`.
- **{{ui:prop.clearance}}:** Pri matici in navojni luknji zračnost, ki poskrbi, da se natisnjen par res vrti. Bolj grobo kot dela tvoj tiskalnik, več zračnosti par potrebuje. To je dodaten prostor čez ves premer, razmak med bočnicama navoja V pa je le približno polovica tega, zato natisnjen par potrebuje več, kot bi pričakoval: nove matice se začnejo pri 0,4 mm, 0,3 je tesno, 0,5 ohlapno. Najprej natisni preizkusni par. Pri navojni palici in vijaku je tu lastna zračnost, ki čep v premeru zmanjša za to vrednost. Nastavljena je na 0. Katera stran dobi prostor, je odvisno od tega, kaj paraš:
  - **Natisnjen vijak in natisnjena matica:** vijak pusti na 0, matici daj prostor (0,4 mm, s katerimi se začne).
  - **Pravi vijak v natisnjeni matici ali navojni luknji:** natisnjena stran vzame vse, zato matica obdrži svojih 0,4 mm. Če se vijak maje, je vredno preizkusiti tesnejših 0,3 mm.
  - **Natisnjen vijak v pravi matici:** prava matica nima zračnosti, zato mora biti vijak tanjši: tu 0,3 do 0,4 mm, toliko kot bi je imela natisnjena matica.
- **{{ui:prop.axialClearance}}:** Pri matici in navojni luknji zračnost vzdolž osi, povrh {{ui:prop.clearance}}. Vsak zob matice je za toliko tanjši, premer ostane. Razlog: {{ui:prop.clearance}} deluje samo na premer in bočnice navoja V odpre le za okoli 0,58 svoje vrednosti. Kdor želi zraka med bočnicama, mora premer odpreti na široko in zanj dobi bočni zdrs. Zračnost v osi loči eno od drugega. Nastavljena je na 0, zato se shranjen navoj ne spremeni, in sega največ do petine koraka, ker nad tem od zob matice ne bi ostalo nič. Polje obstaja samo za matico in navojno luknjo; palica in vijak obdržita svojo zračnost. Več spodaj v razdelku »Navoji za 3D-tisk«.
- **{{ui:prop.threadChamferTop}}, {{ui:prop.threadChamferBottom}}, {{ui:prop.headChamfer}} in {{ui:prop.rimChamfer}}:** Posnetja na koncih, da navoj čisto zaide in glava nima ostrega roba. Vsak konec palice, matice ali navojne luknje ima svoje posnetje, zato je zgornje lahko dolgo, spodnje pa kratko ali ga sploh ni. Vijak ima samo eno, na konici, z oznako {{ui:prop.chamfer}}. Pri matici ali navojni luknji je posnetje prostor, za katerega se ustje odpre čez zunanji premer; stožec poteka pod 45 stopinj naprej do jedra navoja, zato na zunanjem premeru ne ostane stopnice.

Preklop navoja med {{ui:thread.rod}} in {{ui:thread.bore}} ohrani njegovo dolžino. Matica in vijak se začneta pri svojih standardnih merah.
- **{{ui:prop.quality}}:** Kako fino se navoj izračuna. Višje je natančneje, a počasneje.

Natisnjeni navoji so poglavje zase. Pare vijaka in matice najprej naredi kot preizkus, preden natisneš velik del, in zračnost prilagodi svojemu tiskalniku.

## Navoji za 3D-tisk

Natisnjen navoj potrebuje zrak na dveh mestih, ki delujeta različno:

- **Zračnost v premeru ({{ui:prop.clearance}}):** matico naredi širšo. Vijak ima potem na vsaki strani polovico vrednosti zraka, pri 0,4 mm torej 0,2 mm. Navoj se vrti zlahka, vijak pa se lahko maje vstran.
- **Zračnost v osi ({{ui:prop.axialClearance}}):** zobe matice naredi tanjše. Vijak se potem lahko, ko ni zategnjen, za to vrednost premika naprej in nazaj vzdolž osi. Za to ne dobi dodatnega zraka vstran.

Skupaj tvorita razmak med bočnicama: približno 0,58-kratnik zračnosti v premeru plus zračnost v osi. Primer za razmak 0,3 mm: prej je bilo treba 0,5 mm v premeru, to je 0,25 mm zraka na vsaki strani. Zdaj zadostita 0,2 mm v premeru (0,1 mm na vsaki strani) in 0,2 mm v osi, razmak pa je 0,32 mm.

**Posledice, ki jih je dobro poznati**

- **Vijak ima zračnost v osi.** Brez obremenitve se lahko za to vrednost premika naprej in nazaj. Pri pritrditvah, pokrovih in ohišjih to ni pomembno; pri vodilnem vijaku, ki mora natančno pozicionirati, pa je, zato ga tam drži majhnega ali pri 0.
- **Zobje matice so tanjši.** Pri 0,3 mm in koraku 1,75 mm je vsak zob na sredini skoraj za tretjino tanjši in zato očitno manj trden. Pri močno obremenjenih delih raje vzemi grobši navoj.
- **Več računanja.** Oblika zoba dobi dodatne točke, zato ima navoj več trikotnikov in se računa malo dlje.
- **Brez pravega loka v izvozu STEP za profil Whitworth.** Navoj {{ui:thread.profileWhitworth}} z zračnostjo v osi pride v robno orodje in izvoz STEP kot oblika zoba iz ravnih kosov, ne s pravimi krožnimi loki. Pri 0 ostane vse, kot je bilo.

**Nasveti**

1. **Najprej preizkusni par.** Vijak in matica, vsak visok samo 4 do 6 mm, vzameta nekaj minut. Natisni tri pare z različno zračnostjo hkrati in vzemi tistega, ki se vrti zlahka in se ne maje.
2. **Začni z vrednostmi, ki pogosto ustrezajo.** Zračnost v premeru 0,2 do 0,3 mm in zračnost v osi 0,2 mm. Če se vijak maje vstran, zmanjšaj zračnost v premeru; če se zatika, povečaj zračnost v osi. Če se želiš zračnosti v osi izogniti, vzemi 0,4 mm v premeru kot prej.
3. **Zračnost v osi naj bo vsaj ena višina plasti.** Tistega, kar je pod eno plastjo, tiskalnik ne razloči. Pri višini plasti 0,2 mm je 0,2 mm dobro izhodišče; pri 0,1 mm zadostuje manj.
4. **Vijak in matico tiskaj pokonci.** Os kaže navzgor, zato vsak zavoj leži v celih plasteh in bočnice pridejo čiste. Ležeče se bočnice povesijo.
5. **Fini koraki so težki.** Pod okoli 1 mm koraka se zavoji pogosto zlijejo. Grobši navoj ali profil {{ui:thread.profileTrapezoidal}} z ravnimi vrhovi se natisne zanesljiveje kot fin navoj V.
6. **Izogibaj se tankim konicam.** Navoj V ima ozko konico, ki jo tiskalnik s širino šobe komaj zadene. Profila {{ui:thread.profileTrapezoidal}} in {{ui:thread.profileRound}} imata ploščate zobe.
7. **Odstrani ostanke in ga razdelaj.** Prvi zavoji so pogosto trdi, ker na bočnicah ostanejo majhni ostanki tiska. Nekajkrat ga zavrti naprej in nazaj in teče lažje. Posnetje na začetku pomaga pri vrtenju noter.
8. **Drug tiskalnik ali filament.** Zračnost je odvisna od tiskalnika, materiala in šobe. Preizkusni par natisni znova, ko spremeniš katerega od njih.

Robno orodje vzame navoj kot natančno telo. Del, v katerem sedi, lahko posnameš ali zaobliš z navojem v njem, prav tako robove glave vijaka, glej [Posnetje robov in izdolbljenje teles](chapter:robovi-in-izdolbljenje). Ugotavljanje robov navoja traja nekaj časa: nekaj sekund pri M6, približno pol minute pri cevnem navoju G1/2. Najhitreje pa rob glave vijaka še vedno posnameš s posnetjem glave v lastnostih.

## Zobniki

{{ui:shape.gear}} je na voljo kot {{ui:gear.spur}}, {{ui:gear.helical}}, {{ui:gear.herringbone}} in {{ui:gear.bevel}}, poleg tega kot {{ui:gear.internal}} in {{ui:gear.rack}} (spodaj). Novi zobniki imajo pod {{ui:prop.gearProfile}} {{ui:gear.profileInvolute}}: zobje z evolventnimi bokovi, kot jih uporabljajo generatorji zobnikov in strojništvo. Taki zobje se čisto kotalijo drug po drugem. Nastaviš število {{ui:prop.teeth}} in {{ui:prop.gearModule}}, iz tega sledi velikost: zunanji premer je modul × (zobje + 2), delilni krog modul × zobje. Novi zobniki se začnejo z modulom 2. Dva zobnika se zazobita, če imata isti modul in isti {{ui:prop.gearPressureAngle}} (običajno 20°) in sta njuni središči (zobje + zobje) × modul / 2 narazen. Če izbereš oba zobnika, polje z lastnostmi navede ta medosni razmik in kako daleč sta središči ravno narazen. Če tam stoji zob na zob namesto zob v vrzel, enega od zobnikov zavrtiš za pol zoba, torej za 180° deljeno z njegovim številom zob. {{ui:prop.gearBacklash}} vzame zobem nekaj debeline, da se natisnjen par ne zatika. Vrednost velja za par, vsak zobnik vzame polovico; 0,2 mm je dobro izhodišče, 0 da natančen zobnik. Pod osnovnim krogom bok teče naravnost navzdol do vznožja in ni podrezan kot pri frezanju. Za tiskanje to ustreza, zelo majhen pogonski zobnik pod približno 17 zobmi pa se lahko na vznožju rahlo drgne.

Pri poševnem zobniku pride zraven {{ui:prop.helixAngle}}. Pri evolventnih zobeh je to pravi poševni kot na delilnem krogu: dva poševna zobnika se zazobita, če imata isti modul in isti kot, eden pozitiven in drugi negativen. {{ui:gear.herringbone}} sta dve poševni polovici, ki se vrtita v nasprotni smeri: zobje potekajo v eno smer do polovice višine in nazaj po njej, kot puščica. To ima za 3D-tisk dve prednosti: zobnik se sam središči na gredi in nima osnega potiska, ker se sili obeh polovic izravnata. Poševni zobnik pa nasprotno potiska vstran vzdolž osi. {{ui:prop.helixAngle}} in {{ui:prop.helixQuality}} nastaviš kot pri poševnem zobniku; kot velja za vsako polovico. Dva puščična zobnika se zazobita, če imata isti modul in isti kot z nasprotnima predznakoma, eden pozitiven in drugi negativen. Na sredini ni utora, kot pri frezanih puščičnih zobnikih: polovici se stakneta brez stopnice. Robno orodje in izvoz STEP vzameta puščični zobnik kot mrežo trikotnikov, ne kot natančno telo.

Stožčasti zobnik vzame evolventne zobe in jih proti zgornji strani zmanjšuje. To je približek, ne natančno izračunan par stožčastih zobnikov.

{{ui:gear.profileRound}} so okrogli zobje iz krožnih lokov, kot pri »Useful gear« v Tinkercadu: glava zoba in vrzel zoba prehajata drug v drugega brez vogala. Majhni zobniki se tako lažje natisnejo in tečejo laže, na vrtljivem gumbu pa oblika zob da prijeten prijem. Tudi okrogle zobe nastaviš prek {{ui:prop.teeth}}, {{ui:prop.gearModule}} in {{ui:prop.gearBacklash}}; zahvatnega kota nimajo. Stojijo nižje kot evolventni zobje, zato je zunanji premer modul × (zobje + 1,2). Okrogli zobniki z istim modulom se zazobijo, pri enakem medosnem razmiku kot evolventni zobniki; z evolventnim zobnikom se ne ujemajo.

{{ui:gear.profileSimple}} so ravni zobje, ki so jih imeli vsi zobniki doslej. Tam {{ui:prop.toothSize}} in {{ui:prop.toothWidth}} nastaviš ročno. Starejši načrti ju obdržijo, dokler ne preklopiš oblike zob. {{ui:prop.centerHole}} je pri vseh treh oblikah zob.

{{ui:gear.internal}} ima zobe znotraj: obroč, v katerem teče manjši zobnik, kot zunanji venec planetnega gonila. Nastaviš ga kot evolventni ali okrogli zobnik prek {{ui:prop.teeth}}, {{ui:prop.gearModule}} in {{ui:prop.gearBacklash}}; zraven pride {{ui:prop.gearRim}}, obroč zunaj okoli zob. Zunanji premer je modul × (zobje + 2,5) plus dvakrat venec, pri okroglih zobeh modul × (zobje + 1,7). Zobnik z istim modulom teče v njem, če njegovo središče stoji (zobje notranjega zobnika − njegovi zobje) × modul / 2 ob središču notranjega zobnika; če izbereš oba, polje z lastnostmi navede to razdaljo. Za planetni komplet velja: zobje notranjega zobnika = zobje sončnega zobnika + 2 × zobje planeta, na primer 30 = 12 + 2 × 9. Sredinske izvrtine notranji zobnik nima, saj je sam obroč. Med 26 in 33 zobmi so njegovi vrhovi zob do četrtine modula krajši, ker bi sicer na osnovnem krogu nastal drobcen rob; na zobatenje to ne vpliva.

{{ui:gear.rack}} je zobnik z neskončnim polmerom: letev z zobmi na eni strani, katere boki so pri evolventnih zobeh ravne črte v zahvatnem kotu. Njena širina (vzdolž X) je zobje × delitev, delitev je π × modul; zato je več zobatih letev z istim modulom mogoče brez šiva položiti druge ob drugo, konci ležijo vsakič v vrzeli med zobmi. Dolžina (vzdolž Y) je debelina letve in je prosta, dokler zobje in pol milimetra letve gredo noter. Zobje kažejo naprej, proti gledalcu začetnega pogleda; zobato letev zavrti, kot jo potrebuješ. Zobnik z istim modulom se kotali po njej, če njegovo središče stoji njegovi zobje × modul / 2 pred delilno črto; delilna črta leži en modul za vrhovi zob, pri okroglih zobeh 0,6 modula. Notranji zobnik in zobata letev obstajata z evolventnimi in z okroglimi zobmi, ne s preprostimi; pri menjavi vrste zobnika modul ostane.

Robno orodje in izvoz STEP vzameta vsak zobnik kot natančno telo, evolventne bokove kot gladke krivulje. Poševni zobnik na ovalni osnovni ploskvi ostane mreža trikotnikov, prav tako poševni zobnik z evolventnimi zobmi od približno 31 zob naprej. Majhni zobje omejujejo, kako močno se lahko robovi zaoblijo: pri zobniku s preprostimi zobmi, premerom 30 mm in 12 zobmi je ploskev med dvema zoboma na vznožju široka samo približno 0,65 mm, zaokrožitev vseh robov zato gre do približno 0,5 mm, pri stožčastem zobniku z manjšo zgornjo stranjo do približno 0,4 mm. Zobje poševnega zobnika stojijo poševno, zato je ta ploskev pravokotno na njihove poševne robove še ožja: večji kot je poševni kot glede na višino zobnika, manjša je zaokrožitev, ki ustreza. Pri poševnem zobniku lahko zaobliš robove obeh ravnih koncev, posneti samo te robove pa v jedru CAD ne uspe; zaobli jih ali posnemi vse robove skupaj z manjšo mero, približno 0,2 mm.

## Vzmeti

{{ui:shape.spring}} ima {{ui:prop.turns}} in {{ui:prop.wire}}. Skupaj z višino določajo, kako mehka postane vzmet. Pod {{ui:prop.springHand}} izbereš, v katero smer teče žica: {{ui:spring.right}} kot pri običajni tlačni vzmeti ali {{ui:spring.left}}.

Robno orodje in izvoz STEP vzameta vzmet kot natančno telo: okrogla žica vzdolž vijačnice, na obeh koncih ravno odrezana. Ta dva konca žice lahko na primer zaobliš ali posnameš.

## Ukrivljene cevi

{{ui:shape.bentTube}} sestoji iz do dvanajst odsekov: raven kos, ki mu sledi ovinek. Za vsakega nastaviš {{ui:prop.bentTubeSegmentLength}}, {{ui:prop.bentTubeBendAngle}}, {{ui:prop.bentTubeBendRadius}} in {{ui:prop.bentTubeRoll}}. Odsek, ki ga ravno urejaš, se na cevi oranžno posveti, tako imaš zaporedje pod nadzorom. Kot kotaljenja 0° ukrivi v ravnini delovne površine, pri 90° se cev ukrivi navzgor. Profil je lahko okrogel, kvadraten, šest- ali osemkoten, notranji prav tako, ali povsem poln. Če cev teče sama vase, te layerling opozori.

## Prehod

{{ui:shape.loft}} poveže obris spodaj z drugim zgoraj, kot loft v Fusionu: adapter za cev z enega premera na drugega, kvadraten ventilator na okroglo cev, podstavek, ki zgoraj postane okrogel. Za oba konca izbereš {{ui:prop.loftBottomOutline}} in {{ui:prop.loftTopOutline}}: {{ui:loft.round}}, {{ui:loft.rectangle}} z {{ui:prop.loftBottomCorner}} ali {{ui:loft.polygon}} z njegovim številom oglišč, poleg tega širino in dolžino vsakega konca ter višino. Z {{ui:prop.loftOffsetX}} in {{ui:prop.loftOffsetZ}} zgornji konec sedi stransko premaknjen, za poševen prehod; spodnji konec pri tem ostane.

{{ui:prop.loftWall}} naredi iz polnega telesa cev, ki je zgoraj in spodaj odprta. Odprtina je na obeh koncih manjša za debelino stene, merjeno vodoravno; kjer stena stoji poševno, je torej malo tanjša. Če okvir povečaš, rasteta oba konca, polmer vogala in stena ostaneta enaka.

{{ui:prop.loftSmooth}} naredi prehod mehak. Pri 0 stranice tečejo naravnost od dna do vrha, kot pri stožcu. Pri 100 zapustijo oba konca naravnost navzgor, vmes pa spreminjajo velikost po krivulji S: adapter za cev, ki se mehko razširi iz ozke v široko cev, namesto da bi tekel kot lijak. Vmes drsnik oba mešata. Mehak prehod deluje skupaj z {{ui:prop.loftWall}}, zasukom, nagibom in bočnim zamikom; cev s steno ostane odprta na obeh koncih. Je natančno telo kot raven, zato lahko robove posnameš in zaokrožiš, a je zgrajen prek več prerezov in se računa malo dlje.

{{ui:prop.loftTwist}} enakomerno zavrti presek na poti navzgor okoli navpične osi, do 360° v obe smeri; stranice se potem vijejo. {{ui:prop.loftTiltX}} in {{ui:prop.loftTiltZ}} nagneta zgornji konec, do 45°: pozitivna vrednost dvigne njegov sprednji rob oziroma njegovo desno stran. Preseki vmes se nagnejo sorazmerno, tako da stena mehko teče v poševnino. Najvišja točka ostane na nastavljeni višini. Če višina pozneje postane tako majhna, da bi poševni konec segal pod ploščo, se nagib toliko umakne, da ustreza. Loka vzdolž poti, na primer cevnega kolena, prehod ne naredi.

Prehod je natančno telo, tudi zasukan in nagnjen: njegove robove lahko posnameš in zaobliš, izvoz STEP ga ohrani. Prirobnico z luknjami za vijake dodaš kot običajno in združiš v skupino.

## Gridfinity

Oblika {{ui:shape.gridfinity}} izdela dele za odprti sistem za shranjevanje Zacka Freedmana: posode na mreži po 42 mm, ki stojijo v podstavku in se zlagajo druga na drugo. Mere sledijo objavljeni specifikaciji Gridfinity, zato posoda iz layerlinga ustreza podstavku iz drugega generatorja in obratno. Pod {{ui:prop.gridfinityType}} izbereš:

- **{{ui:gridfinity.bin}}:** posodo z nogo pod vsako enoto mreže. {{ui:prop.gridfinityUnitsX}} in {{ui:prop.gridfinityUnitsZ}} štejeta enote mreže po 42 mm (posoda je za 0,5 mm manjša, 41,5 mm za eno enoto); vsaka višinska enota ({{ui:prop.gridfinityUnitsY}}) meri 7 mm, največ 20. {{ui:prop.gridfinityLip}} na vrhu stene sprejme noge naslednje posode in posodo zviša za 4,4 mm: posoda s 3 enotami in obrobo je visoka 25,4 mm. Če vklopiš {{ui:prop.gridfinityMagnets}}, dobi vsaka noga v vsakem kotu luknjo za magnet 6 × 2 mm.
- **{{ui:gridfinity.baseplate}}:** podstavek, v katerem stojijo posode, visok 5 mm, z ležiščem za vsako enoto mreže. Je odprt okvir brez dna in brez lukenj za magnete.

Velikost je vedno celo število enot mreže, do 6 × 6 (252 mm, kar gre na tiskalno ploščo 256 mm); ko vlečeš ročico, se velikost zaskoči na najbližjo enoto. Stena (0,95 mm), dno (1,2 mm) in globina lukenj za magnete (2,4 mm) niso v specifikaciji in so stalni; luknje za vijake M3 iz specifikacije niso narejene. Vrh obrobe je oster, kot ga riše specifikacija; če ga tvoj tiskalnik razcefra, ga zaokroži ali posnemi z robnim orodjem. Posoda in podstavek sta natančni telesi, zato zaokrožitev, posnetje in izvoz STEP delujejo na njiju. Posodo razdeliš tako, da vanjo združiš tanke kvadre kot stene: postavi jih na dno, na višino 5,95 mm, pri posodi z obrobo pa naj njihov vrh ostane vsaj 0,5 mm pod 7 mm na višinsko enoto, merjeno od spodnje strani posode (20,5 mm pri 3 enotah), ker noge naslednje posode segajo 0,35 mm v posodo. Posode in podstavke tiskaj brez podpor, postavljene tako, kot stojijo na tiskalni plošči.

Posoda, visoka 3 višinske enote ali več, ima lahko ob notranjih stenah poličke za nalepke: vklopi {{ui:prop.gridfinityLabelBack}}, {{ui:prop.gridfinityLabelFront}}, {{ui:prop.gridfinityLabelLeft}} ali {{ui:prop.gridfinityLabelRight}}, v poljubni kombinaciji. Vsaka vklopljena polička ima svoje vrednosti {{ui:prop.gridfinityLabelWidth}}, {{ui:prop.gridfinityLabelLength}} in pri krajši polički {{ui:prop.gridfinityLabelOffset}}; nastavitve vogalov pod njimi veljajo za vse. Polička je zgoraj ravna za nalepko, spredaj ima raven pas 1,2 mm, njen spodnji del pa se dviga pod kotom 36 stopinj. Njen vrh je 0,85 mm pod višino 7 mm na višinsko enoto, merjeno od dna posode (20,15 mm pri 3 enotah), zato ostanejo nogice posode, postavljene na obrobo, 0,5 mm nad njo. Posoda, nižja od 3 enot, poličk ne kaže; od 3 enot naprej so spet tu. Poličke za nalepke niso del specifikacije.

{{ui:prop.gridfinityLabelWidth}} pove, kako daleč polička seže v posodo: 14 mm, v posodi s 3 enotami največ 17,2 mm in 16,8 mm za polički druga nasproti druge v posodi, globoki 1 enoto, z vogali po 2 mm. Ko je {{ui:prop.gridfinityLabelLength}} 0, polička teče od stene do stene. Pri krajši, vsaj 10 mm, se pokaže {{ui:prop.gridfinityLabelOffset}}, s katerim jo premakneš od sredine stene: na zadnji in sprednji steni v desno, kot jih kaže pogled od spredaj, na stranskih stenah naprej. Konec, ki se steni približa na manj kot 1 mm (z obrobo 1,8 mm, ker njena opora tam sega navznoter) ali se konča na polički te stene, seže do nje, polički, ki se srečata v vogalu, pa se združita v eno. Kjer polička naleti na steno ali drugo poličko in je prostor, se vogal zaokroži ali posname: v polju {{ui:prop.gridfinityLabelCorner}} izberi {{ui:gridfinity.labelRound}} ali {{ui:gridfinity.labelChamfer}}, velikost pa nastaviš v polju {{ui:prop.gridfinityLabelCornerSize}} (2 mm; 0 ga pusti ostrega). Če je izbrano {{ui:gridfinity.labelRound}}, ima krajša polička zaobljena tudi sprednja vogala prostih koncev, za enako velikost, a največ za polovico svoje širine.

## Tečaj

{{ui:shape.hinge}} se natisne v enem kosu in se potem premika (print-in-place): dva lista, ki odprta ležita ravno na plošči, vmes izmenični členi na osi. Zatič spada k zadnjemu listu in teče z zračnostjo skozi člene sprednjega. Nastaviš {{ui:prop.hingeLength}}, {{ui:prop.hingeOpenWidth}} in {{ui:prop.hingeKnuckleDiameter}}, poleg tega število {{ui:prop.hingeKnuckles}} (liho, da zatič drži na obeh koncih), {{ui:prop.hingePinDiameter}} in {{ui:prop.hingeLeafThickness}}.

{{ui:prop.hingeClearance}} je razmik med premičnimi deli: okoli zatiča, med členi in pred listi. Z 0,4 mm se dobro nastavljen tiskalnik običajno sprosti z majhnim vrtljajem; če deli zrastejo skupaj, vzemi več, če se preveč maje, manj. Tečaj natisni ležeče, tako kot se pokaže na plošči, brez podpor. Liste lahko opremiš z izvrtinami ali združiš v večji del, na primer pokrov.

## Narebričenje

{{ui:shape.knurl}} je okrogel ročaj z žlebiči naokrog, za vrtljive gumbe, nastavitvena kolesca in ročaje orodja. Pod {{ui:prop.knurlPattern}} izbereš {{ui:knurl.straight}}, torej žlebiče vzdolž osi kot na vrtljivem gumbu, {{ui:knurl.diamond}}: dve poševni vrsti žlebičev se križata v majhne rombe, ali {{ui:knurl.round}}: žlebiči in rebra vzdolž osi kot mehek valovit rob iz krožnih lokov, prijeten prijem brez ostrih grebenov. Okrogli žlebiči ostanejo plitvejši od polovice delitve, sicer bi rebra pri vznožju postala trebušasta; prevelika globina zato popusti. Nastaviš {{ui:prop.diameter}} in {{ui:prop.height}}, število {{ui:prop.knurlCount}} in {{ui:prop.knurlDepth}}; pri križnem narebričenju poleg tega {{ui:prop.knurlAngle}} glede na os. {{ui:prop.knurlChamfer}} posname oba konca pod 45°, kot pri stružnem gumbu; 0 jih pusti ostre.

Ravno in okroglo narebričenje sta natančni telesi, njuni robovi se lahko posnamejo in zaobljijo. Križno ostane mreža, saj bi ga kot natančno telo pri 30 žlebičih izračunavala skoraj minuto. Za gumb na osi narebričenje združiš v skupino z izvrtino, na primer z {{ui:shape.thread}} kot navojno luknjo. Žlebičev pod 0,4 mm globine skoraj noben tiskalnik ne natisne čisto, ožje od 0,8 mm na obodu pa layerling žlebičev sploh ne pusti: tanek ročaj dobi ustrezno manj.

## Lastovičji rep

{{ui:shape.dovetail}} je zveza, pri kateri se dva dela zaskočita drug v drugega in ju je mogoče zložiti samo od strani. Nastaviš širino na širokem koncu, {{ui:prop.dovetailNeckWidth}} in dolžino čepa. Čep kopiraj za nasprotno stran in kopijo naredi za luknjo: {{ui:prop.dovetailClearance}} potem poskrbi za malo zračnosti, da se zveza po tisku ne zatika.

> **Namig:** Navojna luknja se ob združitvi v skupino vreže v del, s katerim se prekriva. Postavi jo torej kos v material in je ne pusti samo ob ploskvi.

## Kapljična izvrtina

Luknja, ki leži vodoravno v delu, dobi pri tiskanju zgoraj most, ta pa se povesi. {{ui:shape.teardrop}} ima zato zgoraj konico: vsaka plast leži na spodnji in luknja je brez podpor dovolj okrogla. Nastavi {{ui:prop.teardropDiameter}} na mero luknje, na primer 3,4 mm za vijak M3, in {{ui:prop.teardropLength}} tako dolgo, da gre skozi del. {{ui:prop.teardropTipAngle}} je nastavljen na 90°, boki torej tečejo skupaj pod 45°. To se na večini tiskalnikov natisne čisto; ploščatejše konice potrebujejo več višine, strmejše jo prihranijo.

Kapljično izvrtino naredi za luknjo in jo združi v skupino z delom. Z dolžino leži v smeri globine, konica kaže navzgor. Za luknjo v drugi smeri jo zavrtiš za 90° okoli navpične osi.

**Navojna luknja** na boku se zgoraj povesi na enak način. Daj ji lastno kapljico: dodaj luknjo {{ui:shape.teardrop}}, katere {{ui:prop.teardropDiameter}} je jedro navoja, premer, ki ga zobci pustijo prostega (za M10 približno 8,4 mm), z enako dolžino kot navojna luknja, in izberi obe. Klikni {{ui:editor.tool.align}} in ju poravnaj po sredini – sredina kapljice je sredina njenega okroglega dela, ne njenega okvirja s konico, zato se krožnici prekrivata – ter obe skupaj z delom združi v skupino. Navoj se izreže kot običajno, konica pa odpre vrh luknje, zato se natisne brez podpor.

## Stopničasta in udirna izvrtina

Glava vijaka pogosto ne sme štrleti. {{ui:shape.counterbore}} za to izreže okroglo žep za valjasto glavo (DIN 912), {{ui:shape.countersink}} stožec za vijak z udirno glavo (DIN 7991). Obe stojita z glavo navzgor: {{ui:prop.screwHoleHead}} je premer žepa ali stožca, {{ui:prop.screwHoleShaft}} izvrtina pod njim, {{ui:prop.screwHoleLength}} celotna dolžina. Pri stopničasti izvrtini nastaviš {{ui:prop.screwHoleHeadDepth}}, pri udirni {{ui:prop.screwHoleAngle}} (90° ustreza vijakom z udirno glavo). Privzete vrednosti ustrezajo vijaku M3.

{{ui:shape.doubleCountersink}} je luknja s posnetim robom na obeh straneh, za ploščo, ki mora biti spredaj in zadaj lepa: na vsakem koncu se stožec odpre na {{ui:prop.screwHoleHead}}, vmes pa je {{ui:prop.screwHoleShaft}}. {{ui:prop.screwHoleAngle}} in {{ui:prop.screwHoleLength}} nastaviš kot doslej. Če je luknja prekratka za dva cela stožca, se srečata na sredini pri tem kotu in telo ostane širše, kot si nastavil: glava 10 mm, telo 6 mm, 90° in dolžina 2 mm dajo dva stožca od 10 do 8 mm. Kot izrez jo porineš skozi del kot druge.

Obliko naredi za luknjo in jo združi v skupino z delom. Njeno zgornjo stran pusti končati malo nad ploskvijo, na kateri naj sedi glava, da je žep čisto odprt. Za žep šestrobne matice vzameš {{ui:shape.polygon}} s šestimi stranicami kot luknjo.
