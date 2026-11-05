---
title: Izbiranje in razporejanje
summary: Izbiranje oblik, iskanje v seznamu objektov, poravnava, zrcaljenje, vrtenje, polaganje na ploskev in množenje v poljih.
---

## Izbiranje

Klik na obliko jo izbere. S [[Shift]] dodaš še druge ali jih spet odvzameš. Dokler držiš [[Shift]] in sta izbrani dve obliki ali več, ju šteje majhna številka pod kazalcem miške. Klik v prazno izbor prekliče, prav tako [[Esc]]. Če na prazni delovni ravnini povlečeš okvir, izbereš vse, česar se dotakne; s pridržanim [[Shift]] okvir doda, česar ni bilo izbranega, in odvzame, kar je bilo. Če bi raje izbral en del iz gruče, v nastavitvah (področje {{ui:workspace.appearance}}) vklopi {{ui:workspace.frameByDirection}}: okvir, potegnjen v desno, potem vzame samo tisto, kar leži v celoti v njem, potegnjen v levo pa še vedno vse, česar se dotakne, in njegova črta je črtkana. Med vlečenjem drži [[Alt]], da okvir za to eno vlečenje obrneš, na primer da vzameš cela telesa s strani, kjer smer tega ne bi dovolila. [[Ctrl]]+[[A]] pa izbere vsa vidna telesa. Medtem ko vlečeš telo ali ročaj okvirja, [[Esc]] prekliče dejanje, dokler je tipka miške še pritisnjena: vse se vrne, kot je bilo, in v zgodovino se ne doda nič.

Obliko za drugo obliko, na primer luknjo v telesu, dosežeš, ne da bi obračal pogled: desno klikni to mesto in izberi {{ui:contextMenu.selectOther}}. Meni potem našteje vse oblike pod kazalcem, od spredaj nazaj. Tista, na kateri je kazalec, je v pogledu obrobljena, tudi skozi oblike pred njo; klik jo izbere, s [[Shift]] pa jo doda izboru. Vnos je tam vedno, ko pod kazalcem leži več kot ena oblika; na tablici isti meni odpre dolg pritisk.

Kar ti je v napoto, skriješ ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Skrite oblike ostanejo v načrtu, samo niso vidne in ne pridejo v izvoz; okno izvoza vnaprej pove, koliko jih je. S [[Ctrl]]+[[Shift]]+[[H]] vrneš vse nazaj. Kar naj ostane na mestu, zakleneš s ključavnico zgoraj v nastavitvah ali s [[Ctrl]]+[[L]]. Zaklenjene oblike ni mogoče premikati, spreminjati velikosti, vrteti, barvati ali izbrisati: njene ročice posivijo, ob puščici zgoraj se pokaže ključavnica, orodja, ki bi jo spremenila, pa so zatemnjena. Ko miško pelješ čez ročico, se mere še vedno pokažejo, tipka, ki bi jo spremenila, pa pove »Objekt zaklenjen«. Dokler je v izboru ena zaklenjena oblika, se tudi pri drugih nič ne spremeni. Skrivanje, preimenovanje, kopiranje in podvajanje še delujejo. Če želiš del pustiti, kakršen je, in z njim še naprej graditi, zakleni samo njegovo obliko: s ščitom poleg ključavnice, z {{ui:contextMenu.lockShape}} v meniju desnega klika ali z [[Ctrl]]+[[Shift]]+[[L]]. Še vedno ga lahko premikaš, vrtiš, dvigaš, poravnavaš, kopiraš in združuješ z drugimi, velikost, nastavitve in ime pa ostanejo, kot so: ročaji za velikost izginejo, njihova polja posivijo, spreminjanje velikosti, zrcaljenje, razdruževanje, orodja za robove in brisanje pa so zavrnjeni. Kopija obdrži zaklep, prav tako del v skupini: skupino lahko premikaš in spet razdružiš, ne moreš pa ji spremeniti velikosti. Ščit obliko spet odklene.

Število na gumbu skupine {{ui:editor.group.visibility}} pove, koliko oblik je skritih, klik nanj pa jih spet prikaže vse. Projekt, odprt s skritimi oblikami, to enkrat sporoči z obvestilom z gumbom za prikaz. Del, ki ga skriješ pri odprti skupini, ostane skrit, ko jo zapreš z {{ui:group.done}}: skupina obdrži svojo velikost in ostali deli ostanejo, kot so, pri poravnavi skriti del še vedno šteje, prikaz vseh skritih oblik pa se ga ne dotakne. Za prikaz skupino znova odpri.

## Seznam objektov

Pri mnogih delih v pogledu zlahka izgubiš pregled. Seznam objektov ({{ui:editor.tool.showOutliner}} ali [[Ctrl]]+[[Shift]]+[[O]]) pokaže vse oblike kot seznam. Ostane odprt ali zaprt, kakor si ga pustil, za vse načrte, dokler ga ne zapreš; izbira se shrani v brskalniku.

![Seznam objektov: skupina »Skupina« z dvema delama in ob njej krogla. Ikona mape odpre skupino.](shot:object-list)

- Klik na vnos izbere obliko, tudi dele znotraj skupine. S [[Shift]] dodaš še druge vnose ali jih spet odvzameš, popolnoma enako kot v pogledu. Puščice zložijo in razpro skupine.
- Oznaka kaže, ali je del {{ui:outliner.solid}} ali {{ui:outliner.hole}}.
- Pod imenom piše, kakšna oblika je. Telo, ki ni več preprosta oblika (zaobljeno, izdolbeno ali uvoženo), kaže {{ui:shape.exactBody}}, ko ga izvoz STEP zapiše natančno, in {{ui:shape.mesh}}, ko je sestavljeno le iz trikotnikov in gre ven kot STL. Zoženje, nagib ali zasuk, dodan šele po zaobljanju ali dolbenju telesa, upogne samo njegovo mrežo, zato takrat piše {{ui:shape.mesh}}.
- Ključavnica in oko zaklenita in skrijeta posamezne dele.
- Z {{ui:outliner.rename}} daš delu lastno ime; svinčnik ob imenu zgoraj v nastavitvah naredi isto za izbrano obliko. Smiselna imena pri večjih načrtih zelo pomagajo.
- Gumb A–Ž v naslovni vrstici ({{ui:outliner.sortByName}}) razvrsti oblike, ki si jim dal ime, po abecedi, številke pa šteje kot številke (Del 2 pred Delom 10). Oblike s privzetim imenom ostanejo spodaj v vrstnem redu dodajanja, najnovejša zadnja, deli v skupinah pa se razvrstijo enako. Spremeni se le seznam, nikoli načrt. Drugi klik spet pokaže vse v vrstnem redu dodajanja, brskalnik pa si izbiro zapomni.
- Ročaj levo v vrstici (šest pik) premakne obliko na seznamu: povleci jo navzgor ali navzdol ali nanjo postavi fokus in pritisni [[↑]] ali [[↓]]. S tem se spremeni lastni vrstni red načrta, h kateremu se seznam vrne brez razvrščanja A–Z, Razveljavi pa ga povrne. Pri razvrščanju A–Z ali iskanju so ročaji skriti.
- Če želite obliko dodati v skupino, skupino razprite z njeno puščico in obliko za ročico povlecite na dele skupine; skupina dobi oranžen okvir. Oblika ostane, kjer je, in obdrži svoje ime, prav tako skupina: skupina se z njo znova združi, sveženj jo preprosto sprejme. Deli razprte skupine imajo svojo ročico: povlečen iz skupine je del spet samostojen, na mestu seznama, kjer ga spustite, ali pa ga spustite na drugo razprto skupino, da ga premaknete vanjo. Skupina, v kateri ostane en sam del, izgine in pusti ta del. Razveljavi vrne vsak od teh korakov naenkrat. Med urejanjem skupine to ne deluje.
- Iskalno polje najde oblike po imenu in po vrsti, torej tudi »valj« ali »luknja«. Išče tudi v skupinah, ne glede na to, kako globoko so ugnezdene: skupina z zadetkom ostane na seznamu in se razpre, tako da so vidni ustrezni deli in skupine na poti do njih. Če ime same skupine ustreza, pokaže razpro vse svoje dele.
- Puščica čisto levo v naslovni vrstici zloži seznam do naslovne vrstice in ga spet razpre.

Seznam je zasidran desno ob orientacijski kocki. Za naslovno vrstico ga povlečeš na katerokoli mesto delovne površine; pri tem drsi pod orientacijsko kocko in vrstico pogleda. Če ga odložiš ob orientacijski kocki ali dvokliknes naslovno vrstico, se spet zasidra. Kje je stal in ali je bil zložen, si brskalnik zapomni.

## Vpiši lego

Kartica {{ui:inspector.position}} v oknu z lastnostmi pokaže, kje stoji izbrano telo, in jo lahko vpišeš: {{ui:prop.positionX}} in {{ui:prop.positionY}} sta sredina njegovega okvirja na plošči, z enakimi predznaki kot razdalje na delovni površini, {{ui:prop.positionZ}} je višina njegovega spodnjega roba. Z {{ui:inspector.positionFrom}} na vrhu kartice preklopiš na {{ui:inspector.positionEdge}}: X in Y potem kažeta levi in sprednji rob telesa, tako da rob postaviš natanko na mero. Nastavitev ostane, dokler ne preklopiš nazaj na {{ui:inspector.positionCentre}}. X šteje v desno, Y nazaj in Z navzgor, po pravilu desne roke kot v Tinkercadu in CAD-programih; puščice osi na plošči kažejo smeri. Vrednosti veljajo v nastavljeni enoti, drsniki pa segajo tako daleč kot vlečenje.

## Parkiranje delov ob plošči

Obliko lahko povlečeš čez rob plošče in jo pustiš tam, približno za širino plošče na vsaki strani, da jo shraniš za pozneje. S smernimi tipkami gre poljubno daleč. Parkiran del še naprej spada k načrtu in pride v izvoz. Če naj ostane zunaj, ga skrij ali izvozi samo izbor. Če si izbral tiskalnik, te layerling ob izvozu opozori, če kaj leži zunaj njegove plošče.

## Zaskakovanje med premikanjem

Če oblika vlečeš čez delovno ravnino, se zaskoči na druge oblike: njen levi, desni, sprednji ali zadnji rob ali njena sredina se položi natanko na rob ali sredino druge oblike. Roza pomožna črta kaže, na kaj je ravno pripeta. Tako postaviš dva dela poravnana drug ob drugega ali sredinsko drug za drugim, ne da bi vpisoval številke. To velja tudi, če je mreža izklopljena. Šteje tudi sredina delovne ravnine: rožnate črte pokažejo, kdaj oblika stoji na sredini plošče vzdolž X, Y ali obeh.

Če pri vlečenju držiš [[Shift]], ostane gibanje na eni osi: oblika sledi smeri, X ali Y, v katero si vlekel dalje, drugo pa pusti nedotaknjeno. Najbolje je, da [[Shift]] pritisneš šele, ko že vlečeš; na obliki, ki še ni izbrana, klik s [[Shift]] samo doda k izboru.

Če je [[Alt]] že pritisnjen, ko se vlečenje začne, vlečeš kopijo, kot v Tinkercadu: oblika ostane, kjer je, kopija pa pristane tam, kjer spustiš. Če [[Alt]] pritisneš šele med potjo, se zaskakovanje prekine in oblika sledi samo mreži. Tudi pri vlečenju kopije se zaskoči šele, ko [[Alt]] med potjo spustiš. Zaskakovanje lahko povsem izklopiš v meniju pripenjanja spodaj desno ({{ui:inspector.objectSnap}}) ali v nastavitvah. Zaenkrat se zaskoči samo premikanje na običajni delovni ravnini, ne dviganje in ne sprememba velikosti.

## Poravnava

Dve ali več izbranih oblik poravnaš med seboj z {{ui:editor.tool.align}} ([[L]] ali desni klik na izbor in izbira ukaza): na robu izbora se pokažejo točke za levo, sredino in desno, spredaj, sredino in zadaj ter zgoraj, sredino in spodaj. Klik na točko premakne vse oblike tja. Če najprej klikneš eno od izbranih oblik, ta ostane na mestu in se druge ravnajo po njej. Zaklenjena oblika v izboru je sama ta nepremična oblika. Levo, desno, spredaj, zadaj, zgoraj in spodaj gredo po okvirju okoli oblike; sredina trikotnika, petkotnika ali zvezde je njena lastna sredina, zato luknja, centrirana na tako obliko, leži na sredini oblike in ne njenega okvirja.

Poševno zavrtena oblika, na primer za 45°, ima za izhodišče okvir okoli sebe, ne svojih lastnih robov. Za poravnavo po robovih najprej postaviš delovno ravnino na ploskev te oblike ({{ui:camera.placeWorkplane}}, nato klik na ploskev): točke potem stojijo na oseh te ravnine, oblike pa se merijo in premikajo vzdolž njih, kot v Tinkercadu. Če delovno ravnino ponastaviš, spet poravnavaš po plošči.

![Poravnava na robovih izbora kaže možne cilje kot točke.](shot:align)

Tipka za to je [[L]]. [[Esc]] prekine.

### Enaki razmiki

Ob srednji točki vsake črte stoji širša točka s črtico na vsaki strani. Razporedi tri ali več oblik v tej smeri tako, da je prostor med sosednjimi robovi povsod enak, ne glede na velikost oblik. Prva in zadnja oblika ostaneta na mestu, tiste vmes se premaknejo. Vrsta lukenj različnih velikosti tako dobi povsod enako steno vmes. Pojdi z miško čez točko in vnaprej vidiš, kam gredo oblike; vrstica stanja nato pove razmik.

Če je med izbranimi oblikami plošča, ki je v tej smeri daljša od vseh drugih, se oblike razporedijo po njej: razmik do njenih robov je enak razmiku med oblikami, ena sama oblika pa pride na sredino. Oblike v več vrstah, kot živali sestavljanke z gumbki, se razporedijo vrsto za vrsto; oblike, katerih škatle se prekrivajo prečno na smer, tvorijo eno vrsto. Kjer oblike ne stojijo v čistih stolpcih, kot živali od spredaj nazaj, se oblike, ki stojijo druga ob drugi, premaknejo kot cela vrsta.

Brez plošče najprej drži [[Shift]] in klikni prazno mesto podlage: podlaga je nato fiksna oblika, enaki razmiki razporedijo oblike po vsej podlagi z enakim razmikom do robov, druge točke pa jih poravnajo na njene robove ali sredino. Ponoven klik s [[Shift]] na prazno podlago jo izpusti. Klik na prazno mesto brez [[Shift]] konča poravnavo, tako kot [[L]] in [[Esc]].

Drži [[Alt]] in klikni točko, da sam vpišeš razmik, na primer 5 mm: oblike se postavijo tako daleč narazen, od prve oblike ali od tiste, ki si jo kliknil najprej; na plošči pride vrsta na sredino. Zaklenjena oblika ostane na mestu, zato ena med zunanjima oblikama prepreči enake razmike.

## Zrcaljenje

{{ui:editor.tool.mirror}} ([[M]] ali desni klik na izbor in izbira ukaza) prevrne izbor ob ravnini: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} ali {{ui:mirror.topBottom}}. Za to klikni na ustrezno puščico osi. To je praktično za simetrične dele: zgradi eno polovico, jo kopiraj in kopijo zrcali.

## Vrtenje in postavitev vrtišča

Vrti se z zakrivljenimi puščicami na obliki, s številkami v nastavitvah ali s [[R]] v korakih po 45°. Ko vlečeš po krogu za vrtenje, se zasuk zaskoči na vsako črtico, to je na vsakih 22,5°; s pridržano tipko [[Shift]] so koraki finejši, dodatne črtice se pokažejo na vsakih 11,25°. Vleci zunaj kroga, da se vrtiš prosto v korakih po 1°, ali v korakih po 45° s tipko [[Shift]]. Običajno se izbor vrti okoli svoje sredine. Včasih to ni zaželeno, na primer če se nagnjena cev vrti naprej okoli svojega konca. Za to je {{ui:editor.tool.rotationPivot}}: potem klikni na ploskev. Ravna ploskev poda svoje središče, na primer os konca cevi. Pri skupini ali svežnju se ploskev razteza čez dele, ki se stikajo, kot pri enem telesu, vrtišče pa gre na sredino cele ploskve, ko so deli spojeni, razen pri skupini ali svežnju z besedilom ali svežnju z luknjo. Izbor se zdaj vrti okoli te točke. Drugi klik na orodje jo spet odpravi.

Koti ostanejo na telesu. V njegovih nastavitvah jih {{ui:inspector.rotation}} kaže kot {{ui:prop.rotateX}}, {{ui:prop.rotateY}} in {{ui:prop.rotateZ}}, poimenovane kot lega: Y teče prečno čez ploščo, Z navzgor. Če tam vpišeš kot, se telo zavrti na ta kot – okoli svoje sredine ali okoli svojega lastnega vrtišča, če ga ima. Dokler je zavrteno telo izbrano, so njegovi koti prikazani tudi pod njim na delovni površini; {{ui:workspace.showRotationAngles}} v nastavitvah to izklopi.

![Telo, zavrteno okoli dveh osi: njegovi koti so pod njim, kartica »Vrtenje« v njegovih nastavitvah pa jih sprejme kot številke.](shot:rotation-card)

Če je izbrano **eno telo**, vrtišče spada k temu telesu: izberi druge dele in se vrni in še vedno je tam. Premika se, vrti in spreminja velikost s telesom, shrani se v projekt in se vrne z »Razveljavi«. Pod {{ui:inspector.position}} ima vrtišče lastne vrednosti za X, Y in Z, ki jih lahko vpišeš ali premakneš, {{ui:inspector.pivotRemove}} pa ga odstrani. Rdečo oznako vrtišča lahko tudi povlečeš z miško: drsi po površini teles in se zaskoči na oglišča, sredine robov in robove, tako da zatič tečaja pride natanko na oglišče. Če je izbranih več teles, vrtišče velja samo za ta izbor, nov izbor pa ga odpravi. Če jih združiš ali povežeš, ostane: skupina ga prevzame kot svoje vrtišče, z X, Y in Z pod {{ui:inspector.position}}. Če med vlečenjem držiš Shift, se namesto tega pripne na sredino ploskve pod kazalcem - os okrogle ploskve, sredino ravne ali konico stožca - in pri tem gleda skozi prozorna telesa.

## Polaganje na ploskev

Del naj za tisk leži na svoji najboljši strani? Izberi ga, klikni {{ui:editor.tool.layFlat}} in nato ploskev, ki naj gre navzdol. Ko s kazalcem zapelješ čez del, se ploskev pod njim posveti, torej vnaprej vidiš, katero boš vzel; zavrti pogled in preveri druge strani. Del se zavrti tako, da ta ploskev leži na delovni ravnini.

Dva dela naj ležita ploskev ob ploskvi ali naj se končata poravnano? Izberi del, ki naj se premakne, klikni {{ui:editor.tool.mateFaces}}, nato njegovo ploskev in zatem ploskev drugega dela. V oknu {{ui:mate.mode.against}} položi ploskvi druga ob drugo (hrbet ob hrbet, dotikanje), {{ui:mate.mode.flush}} ju položi poleg druga druge v isto ravnino; {{ui:mate.gap}} pusti prostor vmes, na primer kot zračnost. {{ui:mate.apply}} del premakne: zavrti se po najkrajši poti, dokler nista ploskvi vzporedni – sploh ne, če že sta – in se potem samo pomakne proti drugi ploskvi, zato obdrži svojo stransko lego. Drugi del ostane, kjer je, »Razveljavi« pa vse vrne.

![Okno »Poravnaj ploskve«: del, ki se premakne, je izbran, naslednja je ploskev drugega dela, nato »Drugo proti drugemu« ali »Poravnano« in razmik, če želiš.](shot:mate-faces)

**Luknje na eni osi:** {{ui:mate.mode.concentric}} namesto tega poravna okrogle ploskve: luknjo nad luknjo, čep v luknjo, vijak v njegovo prehodno luknjo. Izberi to, preden klikneš ploskve. Nato klikni okroglo notranjost luknje (ali zunanjost čepa) na delu, ki se premakne, in okroglo ploskev drugega dela; cela okrogla ploskev zasveti, ko kažeš nanjo. {{ui:mate.apply}} zavrti del po najkrajši poti, dokler osi nista vzporedni, in ga potisne počez na drugo os. Vzdolž osi ostane, kjer je bil, zato čep obdrži višino; potisni ga noter pozneje. Deluje tudi pri uvoženih mrežah, dokler je luknja iz ploskvic okoli ene osi.

**Natančen kot med dvema ploskvama:** {{ui:editor.tool.mateFaces}} pusti ploskvi vzporedni; za kot med njima ni posebnega orodja, a do njega prideš tako. Najprej ploskvi združi z {{ui:editor.tool.mateFaces}}, da sta vzporedni. Nato nastavi središče vrtenja na rob, kjer se stikata ({{ui:editor.tool.rotationPivot}}, klikni rob ali oglišče) in v kartici {{ui:inspector.rotation}} dela vpiši kot, na primer 15 ali 30. Del se zavrti okoli tega središča. Osi kartice so osi plošče, zato to deluje, kadar rob poteka vzdolž X, Y ali Z.

Podobno preprosta sta {{ui:editor.tool.dropToWorkplane}} ([[D]]), ki izbor odloži na delovno ravnino, in {{ui:editor.tool.centerOnWorkplane}}.

[[C]] dvigne izbor, kot Cruise v Tinkercadu: sledi kazalcu miške in se uleže na ploskev drugega telesa, nad katero si, tudi na poševno. Klik ga tam odloži, [[Esc]] ga pusti, kjer je bil. Njegova spodnja stran potem leži na ploskvi, poravnana z robovi ploskve, kot bi bila nova oblika; svoj zasuk okoli navpične osi obdrži. Več delov potuje skupaj in ohrani razmike. Nad prazno ploščo [[C]] nagnjen del znova postavi pokonci na delovno ravnino. Če med prenašanjem držiš [[Shift]], se del namesto tega pogrezne v ploskev: ostane pokonci, z vrhom poravnanim s ploskvijo in telesom pod njo, tako pride v telo stožčasto ali valjasto ugrezanje; nova oblika iz knjižnice se s [[Shift]] postavi enako. [[Shift]]+[[D]] spusti izbor na delovno ravnino z vrhom namesto z dnom. Brez tipkovnice ima meni dolgega pritiska za isto {{ui:contextMenu.carry}}.

S [[C]] poberi izbor, kot z Cruisom v Tinkercadu: visi na kazalcu in se položi na ploskev drugega telesa, nad katero si ravno, tudi na poševno. Klik ga tam odloži, [[Esc]] ga pusti, kjer je bil. Njegova spodnja stran potem leži na ploskvi in se ravna po njenih robovih kot nova oblika; lastni zasuk okoli navpične osi obdrži. Več delov se premika skupaj in ohrani razmik. Nad prazno ploščo [[C]] nagnjen del spet postavi pokonci na delovno ravnino.

## Polja: vrsta in krog

Za luknjaste mreže, krožne razporeditve lukenj in zobate vence je {{ui:editor.tool.array}}. Izberi oblike, ki naj se pomnožijo, in klikni nanj v orodni vrstici.

![Polje v načinu »Krog«: kopije se najprej pokažejo kot predogled.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** Izbor se ponavlja z enakim razmikom. Vrsta teče v vseh treh oseh hkrati, z {{ui:array.spacingX}}, {{ui:array.spacingY}} in {{ui:array.spacingZ}}: ena sama da ravno vrsto, dve ali tri poševno vrsto ali stopnice. Negativen razmik položi vrsto v drugo smer.
- **{{ui:array.fit}}:** Za luknje vzdolž plošče, obešalnik za ključe ali za oblačila. Postavi prvi kos na telo ali vanj, izberi {{ui:array.fit.x}} ali {{ui:array.fit.y}} in nastavi {{ui:array.fitGap}}: original se pomakne toliko navznoter od bližjega konca (od roba do stranice kosa), zadnja kopija pa ohrani enak razmik do drugega konca. Razmik nato sledi vrednosti {{ui:array.count}}: pet lukenj ali devet, ploščo vedno zapolnijo enakomerno.
- **{{ui:array.mode.grid}}:** Za luknje perforirane plošče ali polje enakih delov. {{ui:array.columns}} in {{ui:array.spacingX}} postavita stolpce drug ob drugega, {{ui:array.rows}} in {{ui:array.spacingY}} vrste od spredaj nazaj. En stolpec ali ena vrsta da eno samo črto. Mreža ima največ 100 kosov; nad tem se vrste skrajšajo in okno to pove.
- **{{ui:array.mode.circle}}:** Izbor se razporedi okoli središča. Koliko kopij je, nastaviš pri {{ui:array.count}}, {{ui:array.angle}} je za poln krog 360°. Nastaviš, ali naj se kopije vrtijo zraven. {{ui:array.rise}} dvigne vsako kopijo malo više od prejšnje (vijak ali naraščajoča spirala), {{ui:array.radiusChange}} pa jo oddalji od središča ali približa (ploska spirala); skupaj dasta stožčasto spiralo. Spirala naredi največ en ovoj: kot nad 360° šteje za poln krog, kopij pa je največ 100.

Namig: prej z {{ui:editor.tool.rotationPivot}} postavi vrtišče na ploskev, potem je središče kroga natanko tam.

Deli potem obdržijo središče kroga kot svojo vrtišče, tudi ko so združeni v skupino. Tja spada drug del, na primer krogla sredi treh nog: sredina okvirja delov ni središče, ker tri noge zapolnijo okvir, ki je v eno smer širši kot v drugo. Desno klikni dele in izberi {{ui:contextMenu.markPivot}}, in sredina dela, ki ga vlečeš, se pripne nanj.

![Polje v načinu »Krog« s porastom in spremembo polmera na kopijo: kopije se dvigajo in širijo kot spirala.](shot:pattern-spiral)

Kopije se najprej pokažejo kot predogled. Šele {{ui:array.apply}} jih ustvari. Če so kopije luknje, jih potem združiš v skupino s telesom, v katero naj režejo.

Z odkljukanim {{ui:array.groupCopies}} {{ui:array.apply}} v istem koraku združi izvirnik in vse kopije v en predmet, kot bi to naredilo {{ui:editor.tool.group}}: obroč iz 36 kosov je potem en del, ki ga lahko premikaš, barvaš ali z njim režeš. Nad 5 kosi se polje odkljuka samo; ko ga sam odkljukaš ali počistiš, ostane, kot si ga nastavil. {{ui:editor.tool.ungroup}} vrne kose. Če združevanje ne uspe, vzorec vseeno pride kot ločeni kosi in sporočilo pove zakaj.

## Vzorec lukenj na ploskvi

Za prezračevalne reže, zvočniške mreže, košare in ohišja {{ui:holePattern.title}} enakomerno razporedi luknje po ravni ploskvi. Zato ti ni treba vsake luknje posebej ustvariti, pomnožiti in prestaviti na steno. Izberi natanko eno telo in v skupini {{ui:editor.group.modify}} orodne vrstice klikni {{ui:holePattern.title}}, tik ob polju. Lahko tudi z desnim gumbom klikneš na telo ali ga poiščeš s [[Ctrl]]+[[K]].

1. Klikni ravno ploskev telesa. Šteje cela ravna ploskev okoli tvojega klika, ne samo trikotnik pod kazalcem. Ukrivljena ploskev ne gre: dobiš opombo in klikneš ravno. Pri skupini ali svežnju se ploskev razteza čez dele, ki se stikajo, kot pri enem telesu, pri svežnju pa le, če med deli ni luknje. Deli se spojijo kmalu po tem, ko se orodje odpre; do takrat se pod kazalcem osvetli le ploskev enega dela, klik pa počaka, da se spojijo. Pri skupini ali svežnju z besedilom se osvetli le ploskev enega dela, dele pa spoji šele klik.
2. V oknu nastavi, kako luknje izgledajo in ležijo:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} ali {{ui:holePattern.form.slot}}.
   - **Velikost:** {{ui:holePattern.size.diameter}} okrogle luknje, {{ui:holePattern.size.side}} kvadratne, {{ui:holePattern.size.width}} in {{ui:holePattern.size.height}} pri pravokotniku in podolgovati luknji. Pri šestkotniku velja mera {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.form.custom}}:** namesto luknje ponavlja obliko iz scene: kovico, izboklino ali rebro rebraste pločevine. Izberete jo pod {{ui:holePattern.customShape}}. Njena širina in globina sta prostor, ki ga zavzame; na ploskvi stoji pokonci, kakor je bila narejena, brez lastnega zasuka. Telo se postavi na ploskev in se z njo združi, luknja se izreže tako globoko, kot je visoka. Sama oblika ostane, kjer je.
   - **{{ui:holePattern.holeType}}:** samo pri okroglih luknjah. {{ui:holePattern.holeType.plain}} je ravna luknja, {{ui:shape.counterbore}} doda ležišče za glavo vijaka s cilindrično glavo, {{ui:shape.countersink}} stožec 90° za vijak z ugreznjeno glavo. Velikost je tedaj {{ui:prop.screwHoleShaft}}; {{ui:prop.screwHoleHead}} in pri stopničasti izvrtini {{ui:prop.screwHoleHeadDepth}} nastavita glavo. {{ui:prop.screwHoleSize}} izpolni vse za metrični vijak.
   - **{{ui:holePattern.spacing}}:** razdalja od središča ene luknje do naslednje. Če je manjša, kot dovoljujejo luknje, jo layerling nastavi na najmanjšo možno mero, da med luknjami ostane še pregrada. Pri pravokotnikih in režah se šteje vzdolž vrste, od leve proti desni.
   - **{{ui:holePattern.rowSpacing}}:** samo pri pravokotnikih in režah: razdalja od ene vrste do naslednje. Tako ozke, visoke luknje stojijo tesno druga ob drugi, vrste pa ostanejo narazen. Luknja, široka 2 mm in visoka 14 mm, pri steni 2 mm potrebuje 4 mm vzdolž vrste in 16 mm od vrste do vrste.
   - **{{ui:holePattern.wall}}:** ista razdalja, povedana drugače: stena, ki ostane med dvema sosednjima luknjama, to je debelina stene v tisku. Nastaviš jo in razmik od središča do središča ji sledi (pri pravokotnikih in režah tudi razmik vrst), in obratno. Pri šestkotnikih, pravokotnikih in režah layerling meri najmanjšo razdaljo med njihovimi robovi.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} položi luknje v vrstice in stolpce. {{ui:holePattern.arrangement.staggered}} premakne vsako drugo vrstico za pol razmika in vrstice bliže skupaj, tako da ima vsaka luknja sosede v enaki razdalji – s šestkotniki dobiš satovje.
   - **{{ui:holePattern.arrangement.perimeter}}:** namesto tega venec lukenj vzdolž zunanjega roba ploskve, za {{ui:holePattern.margin}} navznoter - luknje za vijake okoli pokrova ali plošče. {{ui:holePattern.perimeterBy}} {{ui:holePattern.perimeterBy.spacing}} približno ohrani razmik, {{ui:holePattern.perimeterBy.count}} določi {{ui:holePattern.perimeterCount}}; v obeh primerih se razmik izenači, da se venec sklene brez vrzeli. {{ui:holePattern.perimeterCorners}} (na začetku vklopljeno) postavi luknjo v vsak kot in vsako stranico med njimi enakomerno razdeli. Na okrogli ploskvi ali brez kljukice gredo luknje enakomerno naokrog od vrha, {{ui:holePattern.perimeterStart}} pa premakne ves venec vzdolž roba.
   - **{{ui:holePattern.margin}}:** prosta razdalja med luknjami in robom ploskve. Ustvarijo se samo luknje, ki ležijo povsem znotraj ploskve minus rob; kar bi segalo čez, odpade. Ta rob ostane tudi okoli odprtin v ploskvi.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (privzeto) reže skozi celotno steno. Z {{ui:holePattern.depth.custom}} podaš globino v milimetrih, na primer za vdolbine.
3. Luknje se takoj pokažejo kot predogled na ploskvi in se spreminjajo z vsako vrednostjo. Okno pove, koliko lukenj gre noter. Z {{ui:holePattern.repick}} izbereš drugo ploskev, [[Esc]] zapre orodje, in kot druga okna z orodji ga lahko premakneš za naslovno vrstico.
4. Šele {{ui:holePattern.apply}} ustvari luknje.

Luknje so čisto navadne luknje in združene v skupino s telesom, popolnoma tako kot po {{ui:editor.tool.group}}: nič ni vpečeno. {{ui:editor.tool.ungroup}} skupino spet razpusti in sprosti vsako luknjo, ki jo potem lahko posebej premakneš, spremeniš ali izbrišeš. Celota je en korak za {{ui:editor.tool.undo}}. Več kot 400 lukenj naenkrat orodje ne ustvari; potem naredi luknje večje ali razmik širši.

Umetna inteligenca lahko isto naredi prek vmesnika MCP, z `layerling_perforate_face` (glej poglavje [Umetna inteligenca z MCP](chapter:ai-z-mcp)).

## Vlečenje ploskve navzven ali navznoter

Za debelejšo steno, dvignjeno ploščico na ploskvi ali vanjo izrezan žep orodje {{ui:faceTool.title}} dela na eni ravni ploskvi. Deluje tudi na uvoženem STL, ki nima skice za spreminjanje. Izberi natanko eno telo in v skupini {{ui:editor.group.modify}} orodne vrstice klikni {{ui:faceTool.title}}, tik ob vzorcu lukenj. Lahko tudi z desnim gumbom klikneš na telo ali ga poiščeš s [[Ctrl]]+[[K]].

1. Klikni ravno ploskev telesa. Tako kot pri vzorcu lukenj šteje cela ravna ploskev okoli tvojega klika; ukrivljena ploskev ne gre. Pri skupini ali svežnju se ploskev kot pri vzorcu lukenj razteza čez dele, ki se stikajo.
2. V oknu:
   - **{{ui:faceTool.direction}}:** {{ui:faceTool.direction.out}} za material na ploskvi ali {{ui:faceTool.direction.in}} za žep, izrezan vanjo. Žep ne gre globlje od telesa za ploskvijo; pri izdolbenem telesu lahko vseeno seže do votline.
   - **{{ui:faceTool.inset}}:** kako daleč nov obris ostane znotraj roba ploskve. Navzven pri 0 šteje cela ploskev, tako se stena odebeli. Odprtine v ploskvi se povečajo za isto mero.
   - **{{ui:faceTool.radius}}:** zaokroži vsak vogal obrisa, tudi notranje, zato se oster vrh konča z lokom. Zareza, ožja od dvakratnega polmera, se zapre, del ploskve, ožji od dvakratnega odmika in polmera skupaj, pa odpade.
   - **{{ui:faceTool.depth}}:** kako daleč nov del sega iz ploskve ali kako globok je žep.
   - **{{ui:faceTool.separate}}:** z vklopljenim stikalom je nov del (ali luknja žepa) lastno telo ob telesu namesto skupine z njim, tako da ga lahko takoj povečaš, premakneš ali z njim režeš.
3. Rezultat se takoj pokaže kot predogled in sledi vsaki vrednosti. {{ui:faceTool.repick}} izbere drugo ploskev, [[Esc]] zapre orodje.
4. Šele {{ui:faceTool.apply}} ga ustvari.

Kar orodje doda, je čisto navadno telo iz skice, združeno v skupino s telesom, razen če je vklopljeno {{ui:faceTool.separate}} (potem {{ui:group.edit}} nima česa odpreti in del je prost): nič ni vpečeno. {{ui:group.edit}} odpre skupino, {{ui:inspector.editSketch}} na novem delu pa pokaže obris, ki mu sledi. Na zgornji ali spodnji ploskvi preprostega telesa iz skice - eno območje, ne združeno, ne zrcaljeno, brez zožitve, zasuka in nagiba, brez poteze, obeska, posnetja ali zaokrožitve - je to lastni obris telesa, ob gradnji zamaknjen navznoter, zato njegove črte in loki ostanejo natančni povsod, kjer jih CAD-jedro lahko zamakne, za orodja za robove in izvoz STEP. Ob poznejši spremembi velikosti del obdrži svoj odmik. Na vsaki drugi ploskvi, tudi na uvoženi mreži, obris sledi trikotnikom ploskve, krivulja pa je iz kratkih ravnih kosov. Celota je en korak za {{ui:editor.tool.undo}}. Če želiš odmik ali polmer pozneje spremeniti, korak razveljavi in orodje uporabi znova. Zgornji rob potem zaokroži z {{ui:editor.tool.fillet}} in {{ui:edge.topEdges}} na skupini kot zadnji korak: kot vsaka obdelava robov skupine iz nje naredi eno telo.

Umetna inteligenca lahko isto naredi prek vmesnika MCP, z `layerling_push_face` (glej poglavje [Umetna inteligenca z MCP](chapter:ai-z-mcp)).

## Sprememba več delov naenkrat

Če je izbranih več delov, polje z lastnostmi desno pokaže, koliko jih je, in ponudi, kar velja za vse hkrati: {{ui:inspector.solid}} ali {{ui:inspector.hole}}, barvo za vse (klik na {{ui:inspector.solid}} odpre barve) in ključavnico za zaklep. Če je izbor mešan, klik vse spremeni v telesa ali vse v luknje. Če je kateri od delov zaklenjen, je mogoče uporabiti samo ključavnico. Mere spreminjaš z ročicami, z {{ui:scalePercent.title}} ali tako, da v oznako mere vpišeš število. Pri več delih je število mera celotnega izbora: vsak del zrase z njim, tudi razmiki med deli, kot ko povlečeš ročico. Telo in luknja gresta tudi z desnim klikom ali s [[S]] in [[H]].

## Povečava v odstotkih

Če naj se en del ali več delov poveča ali zmanjša za isti delež, na primer vsi deli neke tiskalne datoteke za 20 %, uporabi {{ui:scalePercent.title}}. Izberi dele, klikni nanje z desnim gumbom in izberi {{ui:scalePercent.title}}, ali ga poišči s [[Ctrl]]+[[K]].

Pri {{ui:scalePercent.percent}} vpišeš novo velikost v odstotkih sedanje: 120 % je petino večje, 50 % pol manjše. Širina, globina in višina se pri tem spremenijo enako, razmerja torej ostanejo. Spodnja stran ostane, kjer je, tako da nič ne zdrsne v ploščo.

Pri več delih izbereš, kako rastejo:

- **{{ui:scalePercent.mode.together}}:** Deli rastejo okoli skupne sredine, razdalje rastejo z njimi. Celota postane večja, kot da bi bila en del.
- **{{ui:scalePercent.mode.each}}:** Vsak del raste na svojem mestu, razdalje vmes ostanejo enake.

Šele {{ui:scalePercent.apply}} spremeni načrt, korak nazaj pa ga spet razveljavi. Če je v izboru zaklenjen del, se ne odpre.

## Razveljavitev

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) in {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] ali [[Ctrl]]+[[Y]]) greta po korakih skozi tvojo zgodovino. Koliko korakov potuje s shranjenim načrtom, nastaviš v nastavitvah pod {{ui:workspace.history}}. Ko pokažeš na enega od gumbov, njegov namig poimenuje korak, ki ga razveljavi ali uveljavi, z mero, kjer jo korak ima, na primer »Zaobljeni robovi: Box (5 mm)«; sporočilo po koraku pove isto. Za več korakov nazaj naenkrat uporabi pogled zgodovine spodaj. Sporočilo o pravkar narejenem koraku, na primer »Izbrisane 3 oblike«, ima gumb Razveljavi, ki razveljavi prav ta korak.

## Pogled nazaj: pogled zgodovine

{{ui:editor.tool.history}}, ob Razveljavi in Ponovi, odpre pogled v tvojo zgodovino, ne da bi karkoli spremenil. Delovna površina pokaže načrt, kakršen je bil, drsnik spodaj pa gre skozi vse korake razveljavitve: čisto desno je trenutno stanje, vsak korak v levo je ena razveljavitev prej, stanja, ki si jih razveljavil, pa ležijo desno od trenutnega. Smerne tipke gredo skozi stanja, [[Esc]] se vrne na trenutno stanje. Kolesce miške nad drsnikom naredi isto, eno stanje na zarezo, navzgor k starejšemu; [[Page Up]] in [[Page Down]] skočita za deset stanj, [[Home]] gre na najstarejše stanje, [[End]] pa nazaj na trenutno. Medtem lahko pogled vrtiš in zumiraš ter klikaš objekte, da jih vrneš (glej spodaj), ne moreš pa nič premakniti; načrt sam ostane natančno tak, kot je. Če vrstica kaj zakriva, jo povlečeš stran za naslovno vrstico; dvoklik nanjo jo vrne nazaj. Gumb s seznamom v naslovni vrstici pokaže vse korake z imeni na seznamu, najnovejšega na vrhu: klik na korak gre v to stanje, stanje, v katerem je načrt, je označeno z {{ui:historyView.listNow}}, razveljavljeni koraki pa so sivi. Če seznam pustiš odprt, bo odprt tudi naslednjič. Gumba za predvajanje pod drsnikom predvajata zgodovino kot film: tisti, ki kaže v desno, predvaja naprej od prikazanega stanja, tisti, ki kaže v levo, nazaj, vsako stanje za trenutek, do konca; ponoven pritisk istega gumba ustavi, drsnik, kolesce, tipke ali seznam pa prevzamejo. Zagnan na koncu svoje poti začne znova z drugega konca. {{ui:historyView.speed}} določa, kako dolgo ostane vsako stanje (počasi, običajno ali hitro), in si to zapomni za naslednjič. Med predvajanjem posnemi zaslon, da pokažeš, kako je del nastal.

Dve stvari lahko vzameš s seboj iz prejšnjega stanja. {{ui:historyView.createProject}} ustvari to stanje kot nov načrt v pregledu, poimenovan po tem z uro stanja v oklepaju - pri načrtu, ki je bil shranjen, preden je layerling beležil čase, namesto tega piše »Kopija« - in z zgodovino do tja, tako da Razveljavi tam gre naprej. {{ui:historyView.export}} odpre običajni izvoz s tem stanjem kot načrtom, tako da ga lahko shraniš kot STL, 3MF, STEP, sliko ali datoteko LYL z zgodovino do tega stanja.

V načrt lahko vrneš tudi posamezne objekte. Klikni objekt v prikazanem stanju - [[Shift]]+klik doda več ali enega odstrani, klik v prazno ne izbere ničesar - in izberi {{ui:historyView.bringBack}}. Pogled se zapre in kopija vsakega objekta pride v trenutni načrt natanko takšna, kot je bila v tem stanju, in na mesto, kjer je bila, izbrana, poleg vsega, kar načrt vsebuje zdaj; nič drugega se ne spremeni. To je en korak, razveljavitev ga vzame nazaj. Uporabi ga za različico dela, ki si ga medtem spremenil ali izbrisal. Skupina se vrne cela; opombe in referenčne točke na objektu ostanejo. Njegovo ime nosi čas tega stanja, na primer »Kvader (12:32)«, da ga zlahka ločiš od trenutne različice. Če želiš vrniti del iz skupine, izberi skupino in izberi {{ui:historyView.openGroup}} ali pritisni [[E]], kot v načrtu: njeni deli se razporedijo tja, kamor bi jih postavilo urejanje skupine, pripravljeni za izbiro, vrstica pa pove, v kateri skupini si. {{ui:historyView.backOut}} jo spet zapre. To je samo za ogled - skupina, načrt in zgodovina ostanejo, kot so.

{{ui:historyView.delete}} stoji sam levo spodaj v vrstici. Po vprašanju za vedno odstrani vse prejšnje korake: načrt ohrani stanje, ki ga ima zdaj (ne tistega, ki je prikazano), Razveljavi nima več kam nazaj, datoteka, shranjena pozneje, pa ne nosi zgodovine. Uporabi ga, če želiš deliti načrt brez njegove preteklosti ali začeti korake razveljavitve znova. Razveljaviti ga ni mogoče; če želiš deliti datoteko, ne da bi se dotaknil svojega načrta, raje pri izvozu izberi {{ui:export.historyNone}}.
