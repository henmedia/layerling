---
title: Pogled in delovna ravnina
summary: Premikanje po prizoru, gledanje naravnost od spredaj in postavljanje novih oblik na poljubno ploskev.
---

## Premikanje

Z miško:

| Kaj narediš | Kaj se zgodi |
| --- | --- |
| vlečenje z desnim gumbom | vrtenje pogleda |
| kratek klik z desnim gumbom | na telesu meni z najpogostejšimi ukazi: podvoji, luknja ali telo, združi v skupino, skrij, zakleni, izbriši in več; na prazni površini Prilepi in Izberi vse |
| vlečenje s srednjim gumbom | premikanje pogleda |
| kolesce miške | približevanje in oddaljevanje |
| drži [[Ctrl]] / [[Cmd]] in vleci z levim gumbom | prav tako premikanje |
| dvojni klik na prazno mesto delovne ravnine ali ob ploščo | premakne pogled, da je to mesto na sredini; pogled se nato vrti okoli njega |

Hitrost zumiranja s kolescem nastaviš z {{ui:workspace.zoomSpeed}} v nastavitvah, pod {{ui:workspace.appearance}}: drsnik od 1 do 14, na začetku 5; nad 10 se pospeši le kolešček. Tik pod njim {{ui:workspace.panSpeed}} nastavi, kako hitro pogled sledi miški, ko ga premikaš: drsnik od 1 do 9; pri 5, kjer začne, ostane točka, ki jo primeš, pod kazalcem.

**Gumbi miške kot v rezalniku.** Če si vajen Bambu Studia ali OrcaSlicerja, v nastavitvah, pod {{ui:workspace.appearance}}, nastavi {{ui:workspace.mouseScheme}} na {{ui:workspace.mouseSchemeSlicer}}. Vlečenje z levim gumbom po praznem mestu potem vrti pogled, desni gumb ga premika kot srednji, Shift z vlečenjem z levim pa riše izbirni okvir. Vlečenje telesa ga še vedno premakne in kratek desni klik še vedno odpre meni. V skici pogled premika tudi desni gumb.

**3D-miška.** SpaceMouse ali druga 3D-miška vrti, premika in približuje 3D-pogled: potisni pokrovček stran za približanje, zdrsni z njim za premik pogleda, nagni ga za nagib pogleda in ga zasukaj za vrtenje pogleda. V nastavitvah, pod {{ui:workspace.controls}}, klikni {{ui:workspace.spaceMouseConnect}} in izberi napravo v oknu, ki ga odpre brskalnik; izbiro si zapomni, zato je to treba narediti le enkrat. Deluje v Chromu in Edgeu, ki do takih naprav lahko dostopata; Firefox in Safari ne. Če je katera smer narobe obrnjena, jo obkljukaj pod gumbom: premik v stran, premik gor in dol, povečava, nagib ali vrtenje. Nekatere 3D-miške brskalnik najde tudi kot igralni krmilnik; layerling jo potem prevzame sam, takoj ko premakneš pokrovček, brez klika na {{ui:workspace.spaceMouseConnect}} po ponovnem zagonu.

Na tablici ali telefonu dva prsta (razmikanje in približevanje) zumirata, skupno premikanje obeh pa premika pogled. En prst dela na načrtu, tako kot levi gumb miške. Kdor bi rad vrtel z enim prstom, v vrstici pogleda vklopi {{ui:camera.touchRotate}}. Stikalo se pokaže samo na napravah z zaslonom na dotik.

Grafična tablica s pisalom se obnaša kot miška: konica je levi gumb, stranska tipka na pisalu pa desni, za vrtenje pogleda in za meni. Hitre tipke tablice v njenem gonilniku povežeš z [bližnjicami na tipkovnici](chapter:bliznjice) programa layerling.

**Na tabličnem računalniku delaj s pisalom, če lahko.** Njegova konica je veliko tanjša od konice prsta in ne zakriva tistega, na kar ciljaš, zato majhne točke, tanke črte in ročaje v skici, merilne točke in robove zadeneš natančno, daljše delo pa je manj utrujajoče. layerling prstu že pusti, da seže malo dlje do točk, črt, ročajev in robov kot kazalec miške, vendar pisalo ostaja natančnejša pot.

### Orientacijska kocka

Kocka zgoraj levo kaže, kam trenutno gledaš. Klik na eno od njenih stranic skoči v ravni pogled od zgoraj, spodaj, spredaj, zadaj, z leve ali z desne. Klik na oglišče kocke pogleda poševno od tega oglišča na model, klik blizu roba od tega roba, torej med dvema stranicama; mesto se obarva, ko kazalec stoji nad njim. Ravni pogledi gredo tudi s številskimi tipkami [[1]] do [[6]]. Če pri tem držiš [[Shift]], se pogled hkrati približa izboru, kot pri [[Shift]]+[[F]].

Če kocko vlečeš, vrtiš pogled, popolnoma enako kot pri vlečenju z desnim gumbom. Če ni nič izbrano, pogled vrtijo tudi smerne tipke: 15° na pritisk, 90° s [[Shift]]. Model zavrtijo v svojo smer – [[→]] zavrti njegovo sprednjo stran v desno, [[↑]] nagne njegovo sprednjo stran navzgor. Ob pridržani tipki [[Ctrl]] puščice namesto tega premikajo pogled po zaslonu: za desetino slike na pritisk, s [[Shift]] povrhu za polovico. Model se premakne v smer puščice. Če je nekaj izbrano, najprej klikni v prazno; sicer puščice premaknejo izbor. Na zaslonu na dotik to gre z enim prstom, tudi brez vklopa {{ui:camera.touchRotate}}.

### Vrstica pogleda

Ob levem robu je ozka vrstica. Od zgoraj navzdol:

- {{ui:camera.home}} spet postavi celoten prizor v sliko. Tipka za to je [[Home]]; [[F]] stori isto, ko ni nič izbrano.
- {{ui:camera.focusSelection}} se približa izboru ([[F]] ali [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} in {{ui:camera.zoomOut}} zumirata po korakih, prav tako tipki [[+]] in [[−]].
- {{ui:camera.orthographic}} preklopi na ploski pogled, v katerem vzporedni robovi ostanejo vzporedni. To je za merjenje in za poravnavanje robov pogosto prijetnejše kot perspektivni pogled. S [[O]] preklapljaš sem in tja, drugi klik gre nazaj.
- {{ui:camera.secondView}} odpre drugi pogled na načrt v lastnem oknu, opisanem spodaj. Drugi klik ga zapre.
- {{ui:camera.showScrollbars}} pokaže drsnik ob spodnjem robu pogleda in drugega ob desnem robu. Povleci drsnik, da pogled gladko premakneš, klikni puščico na njegovem koncu za majhen premik (če jo držiš, se premika naprej) ali klikni ob drsnik za skoraj cel pogled. Nič se ne zavrti, in za razliko od smernih tipk drsnika delujeta tudi, ko je izbran del - priročno od blizu pri drobnih podrobnostih. Drugi klik ju skrije; ali se načrt odpre z njima, določa {{ui:workspace.startWithScrollbars}} v nastavitvah. Ta brskalnik si izbiro tudi zapomni.
- {{ui:camera.hideWorkplane}} (oko nad mrežo) skrije ploščo z mrežo, da lahko spodnjo stran načrta pogledaš od spodaj. Spremeni se samo pogled: nove oblike še naprej pristanejo na delovni ravnini. Drugi klik jo spet prikaže. Z delovno ravnino na ploskvi se imenuje {{ui:camera.hideBuildPlate}} in skrije samo tiskalno ploščo: delovna ravnina na ploskvi ostane, ima svoje oko, {{ui:camera.hideFaceWorkplane}}.
- {{ui:camera.placeWorkplane}}, merilni trak in kotomer so lastna orodja, ki so opisana spodaj in v poglavju [Merjenje in opombe](chapter:merjenje-in-opombe).

Z majhno puščico čisto na vrhu vrstice jo lahko skriješ, če te moti.

Načrt se odpre tako, kot si ga zapustil: zorni kot, povečava in izrez pogleda ostanejo z njim v tem brskalniku, zato nadaljuješ tam, kjer si nehal, tudi po »Domov« ali po zaprtju strani. Shranjena datoteka (.lyl) vzame pogled s seboj, zato se odpre tako tudi drugje. Pogled ne spada v zgodovino razveljavitev.

V vsakem načrtu lahko shraniš tudi štiri lastne poglede. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] ali [[Shift]]+[[0]] shrani pogled natanko takšen, kot je - zorni kot, izrez, povečavo ter raven ali perspektivni pogled - pod to tipko, sama tipka ([[7]], [[8]], [[9]] ali [[0]]) pa ga vrne. Sporočilo spodaj potrdi shranjevanje; ponovno shranjevanje pod isto tipko pogled zamenja. Tako kot zgornji pogled ostanejo shranjeni pogledi z načrtom v tem brskalniku in gredo s seboj v shranjeni datoteki (.lyl); ne spadajo v zgodovino razveljavitev.

### Drugi pogled v lastnem oknu

{{ui:camera.secondView}} odpre okno, ki kaže isti načrt skozi lastno kamero, tako da ga vidite z dveh strani hkrati - na primer od spredaj, medtem ko delate od zgoraj. Vsaka sprememba v urejevalniku se tam takoj pokaže; načrt se spreminja le v glavnem oknu, in tudi ročaji ostanejo tam. V drugem oknu miška in kocka pogleda vrtita njegov pogled kot tukaj, prav tako tipke: [[1]] do [[6]], [[F]], [[Home]], [[O]], [[+]] in [[−]], puščice za vrtenje in [[Ctrl]] s puščicami za premik. [[F]] tam približa tisto, kar je izbrano v urejevalniku. Tam delujejo tudi štirje shranjeni pogledi načrta: [[7]], [[8]], [[9]] in [[0]] jih vrnejo, [[Shift]] z eno od teh tipk pa pod njo shrani pogled tega okna - za obe okni. Njegova lastna vrstica pogleda ima {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} in {{ui:camera.hideWorkplane}}, ki delujejo le na to okno. Okno se odpre tam, kjer ste ga pustili, v enaki velikosti, in se zapre skupaj z urejevalnikom. Na telefonih in tablicah gumb ni prikazan.

## Pogled v notranjost: prerezni pogled

{{ui:camera.sectionView}}, zadnji gumb vrstice (orodje za prerez), prereže pogled vzdolž ravnine. Tako preveriš stene, votline in dele, ki segajo drug v drugega. Prereže se samo pogled: načrt, datoteke in vsak izvoz ostanejo popolni. Kjer ravnina poteka skozi telo, je rez zapolnjen z nekoliko temnejšo barvo telesa, izdolbina v njem pa ostane prazna, tako da ločiš polno od votlega; zapolnjena ploskev se pokaže trenutek, potem ko se ravnina ustavi. Pri {{ui:camera.sectionCutFace}} izbereš, kako je rez videti: {{ui:camera.sectionCutFaceHatch}}, privzeto, ga šrafira kot risbo, telo v drugem telesu pa je šrafirano v drugo smer, da se ločita; {{ui:camera.sectionCutFaceFill}} ga zapolni z eno barvo; {{ui:camera.sectionCutFaceOpen}} ga pusti odprtega in vidiš v notranjost lupine telesa. Izbira velja za vsak načrt.

- Izberi os, pravokotno na katero stoji ravnina: X (širina), Y (globina) ali Z (višina), kot pri poljih za lego. Začne se na sredini tvojega načrta.
- {{ui:camera.sectionOrientation}} določa, čemu sledijo te osi. {{ui:camera.sectionOrientationWorld}} vzame osi načrta. {{ui:camera.sectionOrientationWorkplane}} vzame osi delovne ravnine: Z nato reže vzporedno z njo, X in Y pravokotno nanjo, položaj pa se šteje od njenega izhodišča. Če delovna ravnina leži na poševni ploskvi, tako režeš vzporedno s to ploskvijo, prerez pa se premakne, ko prestaviš delovno ravnino. {{ui:camera.sectionOrientationView}} obrne ravnino proti zaslonu: odstrani, kar leži pred njo, z drsnikom pa jo potiskaš v smeri pogleda globlje v načrt, na primer da dosežeš skrit del in ga klikneš. Ko nato zavrtiš pogled, ga klikni še enkrat in prerez sledi novemu pogledu.
- {{ui:camera.sectionCoarse}} premika ravnino čez celoten načrt, {{ui:camera.sectionFine}} samo za košček okoli njenega trenutnega mesta, za desetinke milimetra. Lego lahko tudi vpišeš.
- Gumb ob oseh pokaže drugo stran prereza, {{ui:camera.sectionReset}} vrne ravnino na sredino, {{ui:camera.sectionShowPlane}} skrije modro ravnino.
- Kar prerez razkrije, lahko kliknaš in izbereš, tudi notranje stene.
- {{ui:camera.sectionWorkplane}} postavi delovno ravnino na prerez. Leži na ravnini prereza in gleda iz telesa, ki ostane, kot ploskev, ki jo pusti rez. Če nato preklopiš na skico, ta začne natanko tam, bleda kontura pa kaže prerez, ob katerega lahko rišeš in se zaskočiš. Tako na primer skiciraš pokrov, ki se prilega votlini, ki si jo odprl s prerezom. Gumb ob oseh izbere, katera stran ostane, in s tem tudi, kam gleda delovna ravnina. Delovno ravnino vrneš na osnovno ploščo kot običajno.
- {{ui:camera.sectionSketch}} začne novo skico neposredno na prerezu, v kateri so obrisi prereza že kot črte: luknja pride kot pravi krog, zaobljen vogal kot lok. Spremeni jih, izbriši, česar ne potrebuješ, riši naprej in končaj: telo zraste iz prereza proti strani, ki je odrezana, tako da del, ki se mora prilegati drugemu, na primer pokrov, vložek ali tesnilo, začne prav z obrisom tega dela. Gumb ob oseh izbere to stran. Kot pri SVG štejejo samo vidna telesa, luknje pa so že odštete.
- {{ui:camera.sectionMeasure}} meri neposredno na prerezu: obris se pokaže modro, dva klika nanj dasta razdaljo, zraven še njene deleže vzdolž obeh osi ravnine. Obe točki se zaskočita na obris, na ogliščih prednostno. Če je drugi klik kjerkoli na nasprotni steni, se zaskoči pravokotno na prvo točko – tako odčitaš debeline sten, reže in zračnosti, ne da bi moral natančno ciljati. Tretji klik začne naslednje merjenje, [[Esc]] merjenje konča. Če ravnino premakneš, merjenje izgine.
- {{ui:camera.sectionExportSvg}} shrani obrise na ravnini prereza kot SVG v merilu 1:1, za laser, plotter, šablone ali tesnila. X-prerez je viden z desne, Y-prerez od spredaj, Z-prerez od zgoraj. Kot pri izvozu vanj pridejo samo vidna telesa, luknje so že odštete, telesa iste barve pa so združena v en obris. Vsaka barva ostane svoja pot brez polnila, tako da jo programska oprema za laser loči kot plasti.

Križec in [[Esc]] zapreta okno orodja; če merjenje teče, ga [[Esc]] najprej konča. Prerez ostane, dokler ga ne izklopiš z {{ui:camera.sectionActive}}, ne klikneš njegovega gumba v vrstici, medtem ko je okno odprto, ali se ne vrneš na pregled načrtov. Dokler je vklopljen, njegov gumb ostane poudarjen. Kar postaviš na odrezano stran, se pokaže šele, ko prerez izklopiš. Tablica nima [[Esc]], zato ima okno orodja tam dva gumba več: {{ui:camera.sectionBack}} konča merjenje, če teče, sicer zapre okno orodja, {{ui:camera.sectionConfirm}} pa zapre okno orodja v enem koraku. Računalnik ju ne pokaže.

Okno visi na svojem gumbu. Če kaj zakriva, ga povlečeš za naslovno vrstico po delovni površini; tam se odpre tudi naslednjič. Dvoklik na naslovno vrstico ali odložitev na gumb ga vrne nazaj.

[[Esc]] zapre okno; prerez ostane, dokler ga ne izklopiš ali se ne vrneš na pregled načrtov. Dokler je vklopljen, je gumb poudarjen. Kar potem odložiš na odrezani strani, vidiš šele, ko prerez izklopiš.

## Delovna ravnina

Nove oblike se ravnajo po delovni ravnini. Na začetku je to osnovna plošča z mrežo. Lahko pa jo položiš na katerokoli ploskev, da nekaj postaviš ob stran ali na poševno ploskev.

1. Pritisni [[W]] ali klikni {{ui:camera.placeWorkplane}}.
2. Z miško zapelji čez ploskev telesa. Poudari se.
3. S klikom položiš delovno ravnino tja. Vse, kar zdaj dodaš, sedi na tej ploskvi.

Če pri tem klikneš na prosto ploščo, delovna ravnina leži ravno na mestu, kamor si kliknil, zaskočena na mrežo. Nove oblike in dokončana skica, tudi vrtenina, tedaj nastanejo tam namesto na sredini plošče. Dokler delovna ravnina tako leži ploščato na plošči, osnovna plošča kaže samo še svoj rob: dve mreži v isti ravnini bi dali utripajoč vzorec.

Na ploskvi se izhodišče delovne ravnine sicer zaskoči na mrežo. Če klikneš blizu oglišča ploskve, sedi natanko na tem ogliščku. Blizu roba leži na robu, mreža pa se uskladi z njim; tako zavestno izbereš kot mreže. Brez oglišča ali roba mreža na ležeči ploskvi teče vzporedno s telesom, pri zavrtenem kvadru torej zavrtena z njim.

Klik ob ploščo ali [[Esc]] vrne delovno ravnino na osnovno ploščo. Hitreje gre z {{ui:camera.resetWorkplane}}: gumb s puščico navzdol je v vrstici pogleda pod očesom, dokler ravnina leži na ploskvi. S [[Shift]]+[[W]] jo položiš neposredno na trenutno izbrano ploskev. [[Alt]]+[[W]] jo kadar koli vrne na osnovno ploščo, ne glede na to, ali je kaj izbrano. Če pri kliku držiš [[Shift]], ravnina kaže v drugo smer.

Dokler delovna ravnina leži na ploskvi, se ob {{ui:camera.placeWorkplane}} pokaže oko. Skrije ravnino, ne da bi jo odstranilo, da imaš prost pogled na načrt: nove oblike še naprej pristanejo na tej ploskvi, vrti pa se še naprej okoli nje. Klik na oko jo spet prikaže, prav tako postavitev nove delovne ravnine.

Če želiš na delovno ravnino pogledati naravnost, pritisni [[P]] ali klikni {{ui:camera.lookOntoWorkplane}} poleg {{ui:camera.placeWorkplane}} v vrstici pogleda. Pogled se zasuka, dokler ravnine ne vidiš naravnost, s strani, proti kateri rastejo nove oblike, z njenim izhodiščem na sredini. Na osnovni plošči je to pogled od zgoraj.

## Tiskalne plošče

Ko načrt vsebuje več, kot se natisne na eno ploščo, na primer škatlo s pokrovom in vložki, ima lahko več tiskalnih plošč. Kliknite {{ui:editor.tool.buildPlates}} v skupini {{ui:editor.group.arrange}} ali izberite {{ui:plates.moveTo}} v meniju desnega klika na telo. Na dnu pogleda se pojavi vrstica z gumbom za vsako ploščo; število na njem pove, koliko teles stoji na plošči.

- Vsaka plošča je velika kot delovna ravnina, plošče pa ležijo druga ob drugi desno od prve, 20 mm narazen. Telo spada k plošči, na kateri stoji sredina njegovega tlorisa, zato ga z vlečenjem na drugo stran postavite na drugo ploščo. Načrt ima do 12 plošč.
- Klik na ploščo v vrstici jo pokaže in nove oblike in uvožene datoteke nato pristanejo na njej. {{ui:plates.showAll}} pokaže vse. Dvojni klik na ploščo ali {{ui:plates.rename}} ji da ime, na primer »Pokrov«, ki je napisano na plošči.
- Tudi nova skica na plošči se začne na aktivni plošči: površina skice pokaže to ploščo s telesi na njej, in končano telo stoji tam.
- {{ui:plates.moveLeft}} in {{ui:plates.moveRight}} spremenita vrstni red, telesa se premikajo s svojo ploščo. {{ui:plates.remove}} odstrani dejavno ploščo; njena telesa gredo na prvo ploščo na isto mesto.
- {{ui:plates.arrange}} razporedi izbrana telesa, ali vsa, vrsto za vrsto po ploščah, največja najprej, 5 mm narazen, in dodaja plošče, dokler so potrebne. Telo, večje od plošče, ostane na mestu.
- Z izbranim tiskalnikom se vsako telo preveri glede na svojo ploščo, višina tiska pa se šteje od najnižjega telesa na tej plošči. Plošča s telesom, ki ne gre nanjo, pokaže svoje število rdeče.
- V lastnostih se X šteje od sredine lastne plošče telesa.

Okno za izvoz nato ponudi {{ui:export.plates}}: vse plošče v eni datoteki, druga ob drugi kot v načrtu; eno datoteko na ploščo, zbrane v ZIP (STL, 3MF in OBJ); ali eno samo ploščo, postavljeno na mesto prve. Rezalnik odpre vsako datoteko kot eno ploščo, zato za tisk plošč eno za drugo vzemite datoteke po ploščah. Premikanje teles med ploščami in razporejanje je mogoče razveljaviti; dodajanje, poimenovanje, razvrščanje in odstranjevanje plošč se shrani z načrtom, a se ne razveljavi.

## Mreža in pripenjanje

Mreža kaže velikost plošče. Spodaj desno je **pripenjanje**: premikanje in spreminjanje velikosti se zaskočita v korakih te velikosti, na primer 1 mm. Za drobno delo ga nastaviš manjšega, za grobo razporejanje večjega. {{ui:editor.tool.snapToGrid}} v orodni vrstici naknadno pomakne izbrane oblike na najbližje presečišče mreže. Pri premikanju se oblike poleg tega zaskočijo na druge oblike, glej [Izbiranje in razporejanje](chapter:izbiranje-in-razporejanje).
Kratek klik s srednjo miškino tipko, brez premikanja miške, odpre meni koraka pripenjanja tik ob kazalcu, tudi v skici; vlečenje s pritisnjeno srednjo tipko še naprej premika pogled.

> **Namig:** Ne vrti več pogleda, ko deleže natančno postavljaš drug ob drugega. S številskimi tipkami preklopi na raven pogled od zgoraj ali od spredaj in s [[O]] preklopi na ploski prikaz. Tako takoj vidiš, ali sta dva roba res poravnana.

### Okno nastavitev

Zobnik v naslovni vrstici ({{ui:editor.workspaceSettings}}) odpre nastavitve. Levo je sedem področij: {{ui:workspace.appearance}}, {{ui:workspace.controls}}, {{ui:workspace.output}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} in {{ui:workspace.history}}. Sprememba velja takoj. {{ui:workspace.makeDefault}} spodaj shrani trenutne nastavitve kot privzete, tako da nov načrt začne z njimi. Odprta datoteka prinese svoje nastavitve; {{ui:workspace.useMyDefault}} poleg tega uporabi tvoje shranjene barve, mrežo in ostalo na odprtem načrtu in pri tem obdrži njegove enote. Če tvoje privzete nastavitve vsebujejo tiskalnik, pride zraven tudi velikost njegove plošče; brez tiskalnika načrt obdrži svojo ploščo in tiskalnik. {{ui:workspace.close}} zgoraj desno okno zapre. Ta del gre skozi nastavitve eno za drugo.

{{ui:workspace.exportSettings}} shrani nastavitve okna v datoteko (layerling-settings-<datum>.json): barve, mrežo, sence, kamero in privzete vrednosti oblik skupaj s temo, velikostjo orodne vrstice, kotom kocke pogleda, barvami oblik in režo vsakega tiskalnika. Na drugem računalniku ali po izgubi podatkov brskalnika {{ui:workspace.importSettings}} datoteko znova prebere: postane tvoja privzeta nastavitev za nove načrte in se uporabi na odprtem načrtu kot {{ui:workspace.useMyDefault}}. Tudi tvoje lastne tipke iz bližnjic gredo zraven.

### Videz: tema, orodna vrstica in kocka

{{ui:workspace.theme}} izbere barvno shemo celotnega programa: {{ui:workspace.themeSystem}} sledi računalniku, poleg tega so {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} in {{ui:workspace.themeGraphite}}. Zamenjaš jo lahko tudi zgoraj desno v urejevalniku.

{{ui:workspace.toolbarSize}} pod {{ui:workspace.appearance}} naredi gumbe vrstice zgoraj, njen meni oblik, vrstico pogleda levo in ploščo lastnosti desno manjše ali večje: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (kot doslej) ali {{ui:workspace.toolbarSizeLarge}}. Majhna pusti na prenosniku več prostora za delovno ravnino, velika je lažje zadeti na velikem zaslonu ali s prstom. Z velikimi gumbi gredo skupine vrstice v drugo vrstico, če je okno zanje preozko. Velikost je na zavihku {{ui:workspace.ribbon}} v nastavitvah; zapomni si jo ta brskalnik in velja za vsak načrt.

{{ui:workspace.shapeColors}} na slikah knjižnice oblik pokaže barvo, s katero začne nova oblika (barvo njene vrste ali tisto, ki si jo shranil z {{ui:inspector.saveDefaults}}). Če imaš raje sive slike, to izklopi; brskalnik si izbiro zapomni.

{{ui:workspace.viewCubePosition}} pod {{ui:workspace.appearance}} postavi kocko za usmerjanje pogleda v drug kot delovne površine: {{ui:workspace.viewCubePositionTopLeft}} (kot doslej), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} ali {{ui:workspace.viewCubePositionBottomRight}}. V vsakem kotu razen zgoraj levo se vrstica pogleda pomakne navzgor na mesto, ki ga je kocka izpraznila. Spodaj desno stoji kocka tik nad gumbom {{ui:inspector.snapGrid}}. Dokler so desno odprte lastnosti oblike, se kocka na desni strani umakne levo od njih. Kot si zapomni ta brskalnik in velja za vsak načrt. V ozkem oknu, na primer na telefonu, je nastavitev skrita in kocka ostane zgoraj levo.

### Videz: gumbi v orodni vrstici

{{ui:workspace.ribbonButtons}} odstrani iz orodne vrstice skupine in gumbe, ki jih nikoli ne uporabljaš. Klikni skupino, da odpreš njen seznam: {{ui:workspace.ribbonGroupShown}} odstrani celo skupino, kljukica ob gumbu samo ta gumb. {{ui:workspace.ribbonShowAll}} vrne vse nazaj. Skupina brez gumbov izgine, druge se pomaknejo naprej, tako da v eno vrsto gre več orodne vrstice.

Kar odstraniš, manjka samo v orodni vrstici: iskanje ukazov ([[Ctrl]]+[[K]]) to še najde in njegova tipka to še zažene. Puščici ob skupini jo premakneta po seznamu navzgor ali navzdol in tako po orodni vrstici; {{ui:workspace.ribbonResetOrder}} povrne prvotni vrstni red. Puščici ob gumbu ga enako premakneta znotraj skupine. Pomoč ostane vedno. Skupino Oblike lahko premikaš in odstraniš kot vsako drugo; njeno ploščo še vedno odpre iskanje ukazov. Izbiro si zapomni ta brskalnik in gre tudi v datoteko iz {{ui:workspace.exportSettings}}. Velja za 3D-urejevalnik; skica ima svojo vrstico.

{{ui:workspace.ribbonFold}} pod {{ui:workspace.ribbonGroupShown}} na seznamu skupine določa, kaj skupina naredi, ko okno nima prostora za vse. {{ui:workspace.ribbonFoldAuto}} je privzeto: najmanj uporabljene skupine se zložijo prve. {{ui:workspace.ribbonFoldAlways}} drži skupino zloženo v en sam gumb tudi v širokem oknu, tako da zavzame malo prostora in je vseeno pri roki. {{ui:workspace.ribbonFoldKeep}} jo zloži šele za vsemi drugimi. {{ui:workspace.ribbonResetOrder}} ponastavi tudi to izbiro. {{ui:editor.section.mirrorPattern}}, {{ui:editor.section.splitShape}}, {{ui:editor.section.edgesWalls}} in {{ui:editor.section.surface}} so štiri samostojne skupine: vsako lahko premikaš, zložiš in odstraniš posebej.

### Videz: hitri način

{{ui:workspace.fastMode}} je za počasnejše računalnike. Izklopi sence, robne črte na vseh telesih in dohitevanje kamere ter pogled riše samo v ločljivosti zaslona. Tvoje lastne nastavitve ostanejo shranjene za pozneje, stikala, ki jih prevzame, pa kažejo {{ui:workspace.offInFastMode}}, dokler je vklopljen. Kaj še pomaga na počasnem računalniku, najdeš spodaj pod »Kadar se layerling zdi počasen«.

### Videz: barve delovnega prostora in skice

Barve delovnega prostora nastaviš pod {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} in {{ui:workspace.surfaceColor}} za svetlo temo (temne teme obdržijo svoje), poleg barve mreže pod {{ui:workspace.workplane}}. Vsaka barva je gumb, ki jo kaže. Klik odpre majhno okno z barvnim poljem, vrsto pripravljenih barv, poljem za šestnajstiško vrednost in puščico, ki barvo vrne na privzeto vrednost layerlinga. [[Enter]] sprejme vpisano šestnajstiško vrednost, prav tako klik zunaj okna.

Skicirni pogled ima lastne barve: {{ui:workspace.sketchBackground}} za okno okoli ploskve, {{ui:workspace.sketchPlateColor}} za ploskev pod mrežo in {{ui:workspace.sketchGridColor}}, vse za svetlo temo. {{ui:workspace.sketchMatch}} z enim klikom prevzame tri barve delovnega prostora.

{{ui:workspace.classicLook}} nastavi delovni prostor tako, kot ga kaže Tinkercad: belo ozadje, svetlomodra mreža v razmiku milimetra z močnejšo črto vsak centimeter, črne robne črte, svetloba od zgoraj z mehkimi sencami. Potem lahko vsako vrednost še posebej spremeniš. Vse se začne tako, kot je layerling vedno izgledal, kaj ustreza, pa je odvisno tudi od tvojega monitorja.

![Nastavitve pod Videz: barva ozadja in delovne ravnine za svetlo temo ter stikalo za robne črte na vseh telesih.](shot:settings-appearance)

![Urejevalnik v temni barvni shemi. Barvno shemo nastaviš zgoraj desno: Sistem, Svetla, Temna ali Grafit.](shot:editor-dark)

### Videz: puščice osi in robne črte

{{ui:workspace.showAxes}} (sprva vklopljeno) nariše v zadnjem levem kotu plošče tri puščice: **X** rdeče v desno, **Y** zeleno nazaj in **Z** modro navzgor, tako kot štejejo polja za lego. To je pravilo desne roke, ki ga uporabljajo tudi Tinkercad, CAD-programi in rezalniki. Če delovna ravnina leži na ploskvi, se puščice premaknejo z njo. Tu jih izklopiš, če te motijo. Dokler so puščice vklopljene, ima tudi sredinski križ mreže njihove barve: črta vzdolž X rdečo, črta vzdolž Y zeleno, tako da tudi pri majhnem delu takoj vidite, kam gre katera os.

{{ui:workspace.edgeLines}} nariše na vsakem telesu obrisno črto v barvi {{ui:workspace.edgeColor}} (sprva črno, kot v Tinkercadu): to pomaga, ko se temne barve zlijejo. Sprva je izklopljeno, zelo veliki uvoženi modeli (mreže) pa so izvzeti.

![Tri temna telesa z vklopljenimi robnimi črtami: obrisi jih ločijo med seboj.](shot:edge-lines)

{{ui:workspace.strongHoles}} nariše luknje v temnejši sivi, manj prosojno in s temno črto okoli. Pomaga, ko je luknjo med prosojnimi telesi težko najti. Za razliko od robnih črt ostane vklopljeno tudi v hitrem načinu.

{{ui:workspace.holeOpacity}} pod njo določa, kako gosto so narisane luknje, od 10 do 90 odstotkov. Manj bolje pokaže, kje se luknja dotika telesa. Na začetku je samodejno: 52 odstotkov ali 72 z nastavitvijo {{ui:workspace.strongHoles}}; dvoklik na drsnik to vrne.

### Videz: svetloba in sence

{{ui:workspace.showShadows}} vklopi in izklopi vržene sence. Dva drsnika določata, kako so telesa osvetljena. {{ui:workspace.shadowStrength}} pove, kako temne so vržene sence, {{ui:workspace.shadeContrast}} pa premakne svetlobo z enakomerne okoliške svetlobe k glavni: proti »močno« postanejo senčne strani temnejše in sence bolje vidne, proti »mehko« postane vse bolj ploskovno. Na zgornjem koncu je kontrast zelo močan, tako da senčne strani in sence postanejo res temne. {{ui:workspace.shadowSoftness}} naredi robove senc mehke namesto ostrih. {{ui:workspace.lightAzimuth}} zavrti glavno svetlobo okoli plošče (0° od spredaj, 90° z desne), {{ui:workspace.lightElevation}} pa jo dvigne; pri 90° stoji kot v Tinkercadu navpično nad ploščo in sence padejo natanko pod telesa. {{ui:workspace.softLighting}} pripelje večino svetlobe od tam, od koder gledaš, in se vrti s pogledom: nobena ploskev ne ostane temna in navzgor obrnjena ploskev temne barve se ne izžge več v belo. Glavna svetloba ostane malo za sence in drsnik kontrasta še vedno deluje. Če je pri nizki svetlobi še viden svetel odsev, dvigni {{ui:workspace.lightElevation}} na 90°: potem je videti kot Tinkercad. {{ui:workspace.lightReset}} vse vrne nazaj.

### Videz: mere na delovni ravnini

{{ui:workspace.showMoveDimensions}} kaže, za koliko premikaš med vlečenjem, {{ui:workspace.showOriginDimensions}} pa razdalje izbire od izhodišča plošče, tudi pri več izbranih telesih. Z {{ui:workspace.dimensionsAlwaysVisible}} te mere ostanejo vidne ves čas, ne le med vlečenjem. Dokler je izbrano zavrteno telo, so njegovi koti prikazani pod njim na delovni ravnini; {{ui:workspace.showRotationAngles}} to izklopi. Več v poglavju [Merjenje in opombe](chapter:merjenje-in-opombe).

### Videz: izbiranje in premikanje

{{ui:workspace.selectBeforeMoving}}: telo moraš potem najprej izbrati in šele naslednje vlečenje ga premakne. To pomaga, ko telesa grabijo otroci ali hitre roke, in na zaslonu na dotik.

{{ui:workspace.frameByDirection}}: okvir, potegnjen v desno, izbere samo tisto, kar leži v celoti v njem, potegnjen v levo pa vse, česar se dotakne (narisan je črtkano), kot v SketchUpu.

{{ui:workspace.doubleClickOpensSketch}} določa, ali dvoklik na izvlečeno skico znova odpre skico kot v Tinkercadu, {{ui:workspace.doubleClickOpensGroup}} pa, ali dvoklik na skupino ali sveženj odpre urejanje. {{ui:workspace.doubleClickCentersView}} določa, ali dvoklik na prazno delovno ravnino premakne pogled na to mesto.

{{ui:workspace.objectSnap}} pusti robove in sredino oblike med vlečenjem pripenjati na druge oblike; meni mreže spodaj desno ima isto stikalo. {{ui:workspace.cruise}} pusti novo obliko viseti na kazalcu miške in jo položi na ploskev pod njim, kot Cruise v Tinkercadu; izklopljeno pomeni, da se nova oblika pojavi na sredini plošče. Več v poglavju [Izbiranje in razporejanje](chapter:izbiranje-in-razporejanje).

### Videz: pogled

{{ui:workspace.startInPerspective}}: urejevalnik se potem odpre v perspektivnem pogledu namesto v ploskem.

{{ui:workspace.startWithScrollbars}}: načrt se potem odpre z drsniki pogleda. Nastavitev se shrani z načrtom in z {{ui:workspace.makeDefault}}.

{{ui:workspace.viewBarOpensOnHover}}: zložena vrstica pogleda se odpre, ko je miška nad njeno puščico, in se kmalu potem, ko jo miška zapusti, spet zloži, razen če je v uporabi eno od njenih orodij. Klik na puščico, ko je tako odprta, jo pusti odprto. Velja samo za miško; na zaslonu na dotik vrstico kot doslej odpre dotik.

{{ui:workspace.showStepNotices}}: po koraku, kot je združitev, kratko sporočilo ob kocki pogleda pove, kaj se je zgodilo, in ponudi {{ui:shortcuts.undo}}. Izklopljeno teh sporočil ni; sporočila, ki od vas nekaj želijo ali sporočajo težavo, se še vedno prikažejo, {{ui:editor.tool.undo}} na traku pa ob premiku miške še vedno navede korak.

{{ui:workspace.startView}} določa kot, pod katerim se odpre nov načrt in na katerega se vrne {{ui:camera.home}}. Zavrti in približaj pogled, kot ti je všeč, nato klikni {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} vrne običajni pogled od spredaj desno. Velja za vsak načrt v tem brskalniku. Načrt, ki ga znova odpreš, se še vedno odpre tako, kot si ga zapustil.

{{ui:workspace.zoomSpeed}} je drsnik od počasi do hitro: kako hitro približujeta kolesce in sledilna ploščica; gumbi in tipke za povečavo obdržijo svoje majhne korake. {{ui:workspace.panSpeed}} je prav tako drsnik od počasi do hitro: kako hitro pogled sledi miški, ko ga premikaš; na sredini ostane točka, ki jo primeš, pod kazalcem. {{ui:workspace.cameraInertia}}: ko spustiš miško, se pogled še malo vrti ali premika in nežno zavira. Izklopljeno pomeni, da se takoj ustavi, kot v Tinkercadu in Fusion 360.

{{ui:workspace.overhangAngle}} je kot, od katerega ploskev velja za previs, ko v meniju vidnosti vklopiš prikaz previsov: take ploskve so šrafirane rdeče in belo. 30° je previdno, 70° računa na dobro hlajenje tiska; 45° je običajen začetek. Dokler so prikazani, vrstica pod pogledom navede najstrmejši previs in koliko cm² potrebuje podporo.

{{ui:workspace.booleanTriangleLimit}} omeji, koliko trikotnikov sme imeti uvožena mreža, ko jo režeš, združuješ ali sekaš, ker se to računa v tvojem brskalniku. Mreža nad mejo se ne obdela; mrežo najprej poenostavi ali mejo dvigni, če računalnik to zmore. Višja meja lahko urejevalnik za nekaj sekund zamrzne.

### Merjenje: enote, merilo in koraki pripenjanja

Pod {{ui:workspace.measurement}} nastaviš {{ui:workspace.units}}, enoto, v kateri so prikazane mere ({{ui:workspace.scale}}: milimetri, centimetri ali metri v metričnem sistemu, palci ali čevlji v imperialnem), koliko decimalk pokaže število ({{ui:workspace.accuracy}}), {{ui:workspace.snapGrid}}, na katerega se pripenjata premikanje in spreminjanje velikosti, ter lastne korake pripenjanja pod {{ui:workspace.customSnapGrids}}.

Pod {{ui:workspace.measurement}} v nastavitvah nastaviš {{ui:workspace.units}}. Z {{ui:units.imperial}} layerling pokaže vse mere v palcih, na obliki, v polju z lastnostmi, pri merilnem traku in ravnilu. Pripenjanje potem ponuja korake od 1/64 do 1 palca, mreža na plošči pa je narisana v palcih (od 1/8 do 1 palca, privzeto 1/4 palca), z močnejšo črto pri vsakem celem palcu. Pri {{ui:workspace.inchFormat}} izbereš, ali se palci prikažejo kot ulomek kot v Tinkercadu (1 5/8, zaokroženo na 1/64 palca) ali kot decimalno število (1.625) s toliko decimalkami, kot je nastavljeno pod {{ui:workspace.accuracy}}. Vpišeš lahko oboje, tudi »1 5/8«. Hitreje med milimetri in palci preklopiš z majhnim stikalom **mm | in** poleg {{ui:inspector.snapGrid}} na dnu okna lastnosti: spremeni enoto, mrežo plošče in korak pripenjanja kot nastavitve, za ta načrt.

Pod {{ui:workspace.customSnapGrids}} na istem mestu ustvariš lastne korake pripenjanja: ime in velikost v milimetrih, na primer »Rastrski korak 2,54 mm« za razmik DIP vezij, pinskih letvic in perforiranih plošč ali »MX Key Unit« z 19,05 mm za razmik tipk na tipkovnici. Meni pripenjanja ta korak potem ponudi celega, razpolovljenega in razčetverjenega (1 ×, ½ × in ¼ ×), tako da lahko oblike premakneš za cel, pol ali četrt koraka. Če želiš samo mero samo, odkljukaj {{ui:workspace.customSnapGridParts}} ob njej; meni ima potem samo ta en korak. Lastni koraki ostanejo pri načrtu in gredo zraven z {{ui:workspace.makeDefault}}.

{{ui:workspace.startWithCornerRuler}}: vsak nov osnutek v tem brskalniku se potem začne s kotnikom v izhodišču, glej [Merjenje in opombe](chapter:merjenje-in-opombe). Obstoječi osnutki ostanejo, kot so, in kotnik, ki ga odstraniš iz osnutka, se ne vrne.

### Delovna ravnina: plošča in tiskalnik

{{ui:workspace.printer}} prilagodi delovno ravnino tiskalni plošči tvojega tiskalnika in označi telesa, ki segajo čeznjo, glej [Tiskanje](chapter:tiskanje). {{ui:workspace.showPlateLabels}} napiše na ploščo ime načrta, pri izbranem tiskalniku pa tudi njegovo ime in tiskalni prostor.

{{ui:workspace.printerPlay}} je prostor na stran, ki ga natisnjen zatič potrebuje, da se vrti v natisnjeni luknji na tvojem tiskalniku. {{ui:workspace.fitTestMake}} položi na ploščo preizkus ujemanja, ki jo izmeri; novi pokrovi, lastovičji repi, zaskočne kljukice, matice in preverjanje zračnosti potem začnejo z njo, glej [Tiskanje](chapter:tiskanje). Hrani se v tem brskalniku, ne v projektu.

{{ui:workspace.size}} da plošči lastno velikost, {{ui:workspace.width}} in {{ui:workspace.length}} v milimetrih ali izbrani enoti. Mreža vedno teče skozi ničlo, tako da močnejše črte ležijo na oseh, ne glede na velikost plošče.

### Delovna ravnina: mreža

{{ui:workspace.showGrid}} pokaže ali skrije mrežo na plošči. {{ui:workspace.gridBlockSize}} nastavi razmik njenih črt, {{ui:workspace.gridMajorEvery}} pa, ali se močnejša črta pojavi na vsakih 5 ali 10 korakov mreže; {{ui:workspace.gridMajorColor}} ji da lastno barvo, ki jo prevzameta tudi središčni križ in rob plošče. {{ui:workspace.gridColor}} je barva običajnih črt.

Vse črte mreže se pri približevanju debelijo, kot v Tinkercadu, in ostanejo vidne pri oddaljevanju. Komur je to preveč, izklopi {{ui:workspace.gridLinesGrow}}, tedaj črte pri vsaki povečavi ostanejo široke en piksel, kot pri skici.

Če je mreža izginila, na primer ker je bila barva nastavljena na barvo plošče, {{ui:workspace.resetGrid}} na koncu področja {{ui:workspace.workplane}} vrne vidnost, barve, razmik in debelino črt na standard, tukaj in v privzetih vrednostih, shranjenih z {{ui:workspace.makeDefault}}.

### Privzete vrednosti oblik

Pod {{ui:workspace.shapeDefaults}} izbereš obliko pri {{ui:workspace.shape}} in nastaviš, s čim začne, ko jo dodaš: njeno širino, dolžino in višino. {{ui:workspace.useAppDefaults}} vrne obliko na vrednosti, s katerimi jo začne aplikacija. Oblike z lastnimi nastavitvami jih kažejo pod {{ui:workspace.shapeDetails}}. Vrednosti veljajo za nove oblike, ne za tiste, ki že stojijo na plošči. {{ui:workspace.customLimit}} nastavi lastno zgornjo mejo, kako veliko lahko to obliko naredijo ročice in lastnosti; prazno pomeni običajne meje.

### Shranjena zgodovina

Pod {{ui:workspace.history}} drsnik {{ui:workspace.savedHistory}} določa, koliko končanih dejanj ostane na voljo za Razveljavi, potem ko načrt shraniš ali znova odpreš. Privzeto je 100 dejanj na načrt. Nižja meja starejše korake razveljavitve načrta trajno zavrže.

## Kadar se layerling zdi počasen

layerling vse izračuna in nariše v tvojem brskalniku. Na starejšem računalniku, s šibko grafično kartico ali na več velikih zaslonih je pogled zato lahko trd. To pomaga:

- **{{ui:workspace.fastMode}}** pod {{ui:workspace.appearance}} naenkrat izklopi vse, kar pogled močno obremeni: sence, robne črte na vseh telesih in dohitevanje kamere. Poleg tega nariše pogled samo v ločljivosti zaslona, na zaslonih z visoko ločljivostjo je to do štirikrat manj točk. Tvoje lastne nastavitve ostanejo in spet veljajo, ko ga izklopiš.
- **Kamera dohiteva:** Če po vrtenju spustiš miško, se pogled še malo vrti in nežno zavira. To je namerno in ni zatikanje. Kdor je vajen drugače iz Tinkercada ali Fusiona 360, izklopi {{ui:workspace.cameraInertia}} pod {{ui:workspace.appearance}}, pa se pogled ustavi takoj.
- **Posamezna stikala:** Brez hitrega načina lahko izklopiš tudi samo {{ui:workspace.showShadows}} ali {{ui:workspace.edgeLines}}.
- **Uporabi grafično kartico:** V Chromu odpri `chrome://gpu` (v Edgeu `edge://gpu`). Pri »WebGL« bi moralo pisati »Hardware accelerated«. Če piše »Software only«, je strojno pospeševanje v nastavitvah brskalnika izklopljeno. V Windowsih lahko v nastavitvah pod Sistem → Zaslon → Grafika za brskalnik izbereš »Visoka zmogljivost«, da uporabi pravo grafično kartico, ne šibkejše v procesorju.
- **Poenostavi velike uvožene mreže:** Model iz več sto tisoč trikotnikov zavira vsak pogled. Kako ga razredčiš, piše v poglavju o datotekah pod »Poenostavitev uvožene mreže«.
- **Zapri druge zavihke:** Vsak odprt zavihek programa layerling in vsaka druga 3D-stran si delita isto grafično kartico.
