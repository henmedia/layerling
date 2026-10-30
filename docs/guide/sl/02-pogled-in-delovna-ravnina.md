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

Hitrost zumiranja s kolescem nastaviš z {{ui:workspace.zoomSpeed}} v nastavitvah, pod {{ui:workspace.appearance}}: drsnik od 1 do 14, na začetku 5; nad 10 se pospeši le kolešček.

Na tablici ali telefonu dva prsta (razmikanje in približevanje) zumirata, skupno premikanje obeh pa premika pogled. En prst dela na načrtu, tako kot levi gumb miške. Kdor bi rad vrtel z enim prstom, v vrstici kamere vklopi {{ui:camera.touchRotate}}. Stikalo se pokaže samo na napravah z zaslonom na dotik.

Grafična tablica s pisalom se obnaša kot miška: konica je levi gumb, stranska tipka na pisalu pa desni, za vrtenje pogleda in za meni. Hitre tipke tablice v njenem gonilniku povežeš z [bližnjicami na tipkovnici](chapter:bliznjice) programa layerling.

**Na tabličnem računalniku delaj s pisalom, če lahko.** Njegova konica je veliko tanjša od konice prsta in ne zakriva tistega, na kar ciljaš, zato majhne točke, tanke črte in ročaje v skici, merilne točke in robove zadeneš natančno, daljše delo pa je manj utrujajoče. layerling prstu že pusti, da seže malo dlje do točk, črt, ročajev in robov kot kazalec miške, vendar pisalo ostaja natančnejša pot.

### Orientacijska kocka

Kocka zgoraj levo kaže, kam trenutno gledaš. Klik na eno od njenih stranic skoči v ravni pogled od zgoraj, spodaj, spredaj, zadaj, z leve ali z desne. Klik na oglišče kocke pogleda poševno od tega oglišča na model, klik blizu roba od tega roba, torej med dvema stranicama; mesto se obarva, ko kazalec stoji nad njim. Ravni pogledi gredo tudi s številskimi tipkami [[1]] do [[6]]. Če pri tem držiš [[Shift]], se pogled hkrati približa izboru, kot pri [[Shift]]+[[F]].

Če kocko vlečeš, vrtiš pogled, popolnoma enako kot pri vlečenju z desnim gumbom. Če ni nič izbrano, pogled vrtijo tudi smerne tipke: 15° na pritisk, 90° s [[Shift]]. Model zavrtijo v svojo smer – [[→]] zavrti njegovo sprednjo stran v desno, [[↑]] nagne njegovo sprednjo stran navzgor. Ob pridržani tipki [[Ctrl]] puščice namesto tega premikajo pogled po zaslonu: za desetino slike na pritisk, s [[Shift]] povrhu za polovico. Model se premakne v smer puščice. Če je nekaj izbrano, najprej klikni v prazno; sicer puščice premaknejo izbor. Na zaslonu na dotik to gre z enim prstom, tudi brez vklopa {{ui:camera.touchRotate}}.

### Vrstica kamere

Ob levem robu je ozka vrstica. Od zgoraj navzdol:

- {{ui:camera.home}} spet postavi celoten prizor v sliko. Tipka za to je [[Home]]; [[F]] stori isto, ko ni nič izbrano.
- {{ui:camera.focusSelection}} se približa izboru ([[F]] ali [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} in {{ui:camera.zoomOut}} zumirata po korakih, prav tako tipki [[+]] in [[−]].
- {{ui:camera.orthographic}} preklopi na ploski pogled, v katerem vzporedni robovi ostanejo vzporedni. To je za merjenje in za poravnavanje robov pogosto prijetnejše kot perspektivni pogled. S [[O]] preklapljaš sem in tja, drugi klik gre nazaj.
- {{ui:camera.secondView}} odpre drugi pogled na načrt v lastnem oknu, opisanem spodaj. Drugi klik ga zapre.
- {{ui:camera.hideWorkplane}} (oko nad mrežo) skrije ploščo z mrežo, da lahko spodnjo stran načrta pogledaš od spodaj. Spremeni se samo pogled: nove oblike še naprej pristanejo na delovni ravnini. Drugi klik jo spet prikaže.
- {{ui:camera.placeWorkplane}}, merilni trak in kotomer so lastna orodja, ki so opisana spodaj in v poglavju [Merjenje in opombe](chapter:merjenje-in-opombe).

Z majhno puščico čisto na vrhu vrstice jo lahko skriješ, če te moti.

Načrt se odpre tako, kot si ga zapustil: zorni kot, povečava in izrez pogleda ostanejo z njim v tem brskalniku, zato nadaljuješ tam, kjer si nehal, tudi po »Domov« ali po zaprtju strani. Shranjena datoteka (.lyl) vzame pogled s seboj, zato se odpre tako tudi drugje. Pogled ne spada v zgodovino razveljavitev.

V vsakem načrtu lahko shraniš tudi štiri lastne poglede. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] ali [[Shift]]+[[0]] shrani pogled natanko takšen, kot je - zorni kot, izrez, povečavo ter raven ali perspektivni pogled - pod to tipko, sama tipka ([[7]], [[8]], [[9]] ali [[0]]) pa ga vrne. Sporočilo spodaj potrdi shranjevanje; ponovno shranjevanje pod isto tipko pogled zamenja. Tako kot zgornji pogled ostanejo shranjeni pogledi z načrtom v tem brskalniku in gredo s seboj v shranjeni datoteki (.lyl); ne spadajo v zgodovino razveljavitev.

### Drugi pogled v lastnem oknu

{{ui:camera.secondView}} odpre okno, ki kaže isti načrt skozi lastno kamero, tako da ga vidite z dveh strani hkrati - na primer od spredaj, medtem ko delate od zgoraj. Vsaka sprememba v urejevalniku se tam takoj pokaže; načrt se spreminja le v glavnem oknu, in tudi ročaji ostanejo tam. V drugem oknu miška in kocka pogleda vrtita njegov pogled kot tukaj, prav tako tipke: [[1]] do [[6]], [[F]], [[Home]], [[O]], [[+]] in [[−]], puščice za vrtenje in [[Ctrl]] s puščicami za premik. [[F]] tam približa tisto, kar je izbrano v urejevalniku. Tam delujejo tudi štirje shranjeni pogledi načrta: [[7]], [[8]], [[9]] in [[0]] jih vrnejo, [[Shift]] z eno od teh tipk pa pod njo shrani pogled tega okna - za obe okni. Njegova lastna vrstica kamere ima {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} in {{ui:camera.hideWorkplane}}, ki delujejo le na to okno. Okno se odpre tam, kjer ste ga pustili, v enaki velikosti, in se zapre skupaj z urejevalnikom. Na telefonih in tablicah gumb ni prikazan.

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

Okno visi na svojem gumbu. Če kaj zakriva, ga povlečeš za naslovno vrstico po delovni površini; tam se odpre tudi naslednjič. Dvoklik na naslovno vrstico ali odložitev na gumb ga vrne nazaj.

[[Esc]] zapre okno; prerez ostane, dokler ga ne izklopiš ali se ne vrneš na pregled načrtov. Dokler je vklopljen, je gumb poudarjen. Kar potem odložiš na odrezani strani, vidiš šele, ko prerez izklopiš.

## Delovna ravnina

Nove oblike se ravnajo po delovni ravnini. Na začetku je to osnovna plošča z mrežo. Lahko pa jo položiš na katerokoli ploskev, da nekaj postaviš ob stran ali na poševno ploskev.

1. Pritisni [[W]] ali klikni {{ui:camera.placeWorkplane}}.
2. Z miško zapelji čez ploskev telesa. Poudari se.
3. S klikom položiš delovno ravnino tja. Vse, kar zdaj dodaš, sedi na tej ploskvi.

Če pri tem klikneš na prosto ploščo, delovna ravnina leži ravno na mestu, kamor si kliknil, zaskočena na mrežo. Nove oblike in dokončana skica, tudi vrtenina, tedaj nastanejo tam namesto na sredini plošče. Dokler delovna ravnina tako leži ploščato na plošči, osnovna plošča kaže samo še svoj rob: dve mreži v isti ravnini bi dali utripajoč vzorec.

Na ploskvi se izhodišče delovne ravnine sicer zaskoči na mrežo. Če klikneš blizu oglišča ploskve, sedi natanko na tem ogliščku. Blizu roba leži na robu, mreža pa se uskladi z njim; tako zavestno izbereš kot mreže. Brez oglišča ali roba mreža na ležeči ploskvi teče vzporedno s telesom, pri zavrtenem kvadru torej zavrtena z njim.

Klik ob ploščo ali [[Esc]] vrne delovno ravnino na osnovno ploščo. Hitreje gre z {{ui:camera.resetWorkplane}}: gumb s puščico navzdol je v vrstici kamere pod očesom, dokler ravnina leži na ploskvi. S [[Shift]]+[[W]] jo položiš neposredno na trenutno izbrano ploskev. [[Alt]]+[[W]] jo kadar koli vrne na osnovno ploščo, ne glede na to, ali je kaj izbrano. Če pri kliku držiš [[Shift]], ravnina kaže v drugo smer.

Dokler delovna ravnina leži na ploskvi, se ob {{ui:camera.placeWorkplane}} pokaže oko. Skrije ravnino, ne da bi jo odstranilo, da imaš prost pogled na načrt: nove oblike še naprej pristanejo na tej ploskvi, vrti pa se še naprej okoli nje. Klik na oko jo spet prikaže, prav tako postavitev nove delovne ravnine.

## Mreža in pripenjanje

Mreža kaže velikost plošče. Spodaj desno je **pripenjanje**: premikanje in spreminjanje velikosti se zaskočita v korakih te velikosti, na primer 1 mm. Za drobno delo ga nastaviš manjšega, za grobo razporejanje večjega. {{ui:editor.tool.snapToGrid}} v orodni vrstici naknadno pomakne izbrane oblike na najbližje presečišče mreže. Pri premikanju se oblike poleg tega zaskočijo na druge oblike, glej [Izbiranje in razporejanje](chapter:izbiranje-in-razporejanje).

Pod {{ui:workspace.measurement}} v nastavitvah nastaviš {{ui:workspace.units}}. Z {{ui:units.imperial}} layerling pokaže vse mere v palcih, na obliki, v polju z lastnostmi, pri merilnem traku in ravnilu. Pripenjanje potem ponuja korake od 1/64 do 1 palca, mreža na plošči pa je narisana v palcih (od 1/8 do 1 palca, privzeto 1/4 palca), z močnejšo črto pri vsakem celem palcu. Pri {{ui:workspace.inchFormat}} izbereš, ali se palci prikažejo kot ulomek kot v Tinkercadu (1 5/8, zaokroženo na 1/64 palca) ali kot decimalno število (1.625) s toliko decimalkami, kot je nastavljeno pod {{ui:workspace.accuracy}}. Vpišeš lahko oboje, tudi »1 5/8«. Hitreje med milimetri in palci preklopiš z majhnim stikalom **mm | in** poleg {{ui:inspector.snapGrid}} na dnu okna lastnosti: spremeni enoto, mrežo plošče in korak pripenjanja kot nastavitve, za ta načrt.

Pod {{ui:workspace.customSnapGrids}} na istem mestu ustvariš lastne korake pripenjanja: ime in velikost v milimetrih, na primer »Rastrski korak 2,54 mm« za razmik DIP vezij, pinskih letvic in perforiranih plošč ali »MX Key Unit« z 19,05 mm za razmik tipk na tipkovnici. Meni pripenjanja ta korak potem ponudi celega, razpolovljenega in razčetverjenega (1 ×, ½ × in ¼ ×), tako da lahko oblike premakneš za cel, pol ali četrt koraka. Če želiš samo mero samo, odkljukaj {{ui:workspace.customSnapGridParts}} ob njej; meni ima potem samo ta en korak. Lastni koraki ostanejo pri načrtu in gredo zraven z {{ui:workspace.makeDefault}}.

Velikost, razmik mreže in barvo plošče spreminjaš v nastavitvah (zobnik v orodni vrstici): tam so področja {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} in {{ui:workspace.history}}. Pod {{ui:workspace.appearance}} sta na primer stikali {{ui:workspace.startInPerspective}} in {{ui:workspace.showShadows}}, pod {{ui:workspace.workplane}} {{ui:workspace.showGrid}}. Barve delovnega prostora nastaviš prav tako pod {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} in {{ui:workspace.surfaceColor}} za svetlo temo (temne teme obdržijo svoje), barva mreže je pod {{ui:workspace.workplane}}. Tam izbereš tudi, ali se močnejša črta mreže pojavi na vsakih 5 ali 10 korakov ({{ui:workspace.gridMajorEvery}}), in ji z {{ui:workspace.gridMajorColor}} daš svojo barvo; središčni križ in rob plošče jo prevzameta. Vse črte mreže se pri približevanju debelijo, kot v Tinkercadu, in ostanejo vidne pri oddaljevanju; komur je to preveč, izklopi {{ui:workspace.gridLinesGrow}}, tedaj črte pri vsaki povečavi ostanejo široke en piksel, kot pri skici. V barvnem polju [[Enter]] sprejme vpisano šestnajstiško vrednost. {{ui:workspace.edgeLines}} nariše na vsakem telesu obrisno črto v barvi {{ui:workspace.edgeColor}} (sprva črno, kot v Tinkercadu): to pomaga, ko se temne barve zlijejo. Sprva je izklopljeno, zelo veliki uvoženi modeli (mreže) pa so izvzeti. Mreža vedno teče skozi ničlo, tako da močnejše črte ležijo na oseh, ne glede na velikost plošče. Če je mreža izginila, na primer ker je bila barva nastavljena na barvo plošče, {{ui:workspace.resetGrid}} na koncu področja {{ui:workspace.workplane}} vrne vidnost, barve, razmik in debelino črt na standard, tukaj in v privzetih vrednostih, shranjenih z {{ui:workspace.makeDefault}}.

{{ui:workspace.strongHoles}} nariše luknje v temnejši sivi, manj prosojno in s temno črto okoli. Pomaga, ko je luknjo med prosojnimi telesi težko najti. Za razliko od robnih črt ostane vklopljeno tudi v hitrem načinu.

{{ui:workspace.showAxes}} (sprva vklopljeno) nariše v zadnjem levem kotu plošče tri puščice: **X** rdeče v desno, **Y** zeleno nazaj in **Z** modro navzgor, tako kot štejejo polja za lego. To je pravilo desne roke, ki ga uporabljajo tudi Tinkercad, CAD-programi in rezalniki. Če delovna ravnina leži na ploskvi, se puščice premaknejo z njo. Tu jih izklopiš, če te motijo.

Dva drsnika pod {{ui:workspace.appearance}} določata, kako so telesa osvetljena. {{ui:workspace.shadowStrength}} pove, kako temne so vržene sence, {{ui:workspace.shadeContrast}} pa premakne svetlobo z enakomerne okoliške svetlobe k glavni: proti »močno« postanejo senčne strani temnejše in sence bolje vidne, proti »mehko« postane vse bolj ploskovno. Na zgornjem koncu je kontrast zelo močan, tako da senčne strani in sence postanejo res temne. {{ui:workspace.shadowSoftness}} naredi robove senc mehke namesto ostrih. {{ui:workspace.lightAzimuth}} zavrti glavno svetlobo okoli plošče (0° od spredaj, 90° z desne), {{ui:workspace.lightElevation}} pa jo dvigne; pri 90° stoji kot v Tinkercadu navpično nad ploščo in sence padejo natanko pod telesa. {{ui:workspace.lightReset}} vse vrne nazaj. {{ui:workspace.classicLook}} nastavi delovni prostor tako, kot ga kaže Tinkercad: bel ozadje, svetlomodra mreža v razmiku milimetra z močnejšo črto vsak centimeter, črne robne črte, svetloba od zgoraj z mehkimi senca­mi. Potem lahko vsako vrednost še posebej spremeniš. Vse se začne tako, kot je layerling vedno izgledal, kaj ustreza, pa je odvisno tudi od tvojega monitorja. Skicirni pogled ima lastne barve: {{ui:workspace.sketchBackground}} za okno okoli ploskve, {{ui:workspace.sketchPlateColor}} za ploskev pod mrežo in {{ui:workspace.sketchGridColor}}, vse za svetlo temo. {{ui:workspace.sketchMatch}} z enim klikom prevzame tri barve delovnega prostora.

![Nastavitve pod Videz: barva ozadja in delovne ravnine za svetlo temo ter stikalo za robne črte na vseh telesih.](shot:settings-appearance)

![Tri temna telesa z vklopljenimi robnimi črtami: obrisi jih ločijo med seboj.](shot:edge-lines)

![Urejevalnik v temni barvni shemi. Barvno shemo nastaviš zgoraj desno: Sistem, Svetla, Temna ali Grafit.](shot:editor-dark)

{{ui:workspace.toolbarSize}} pod {{ui:workspace.appearance}} naredi gumbe vrstice zgoraj, njen meni oblik, upravljanje kamere levo in ploščo lastnosti desno manjše ali večje: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (kot doslej) ali {{ui:workspace.toolbarSizeLarge}}. Majhna pusti na prenosniku več prostora za delovno ravnino, velika je lažje zadeti na velikem zaslonu ali s prstom. Z velikimi gumbi gredo skupine vrstice v drugo vrstico, če je okno zanje preozko. Velikost si zapomni ta brskalnik in velja za vsak načrt.

{{ui:workspace.viewCubePosition}} pod {{ui:workspace.appearance}} postavi kocko za usmerjanje pogleda v drug kot delovne površine: {{ui:workspace.viewCubePositionTopLeft}} (kot doslej), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} ali {{ui:workspace.viewCubePositionBottomRight}}. V vsakem kotu razen zgoraj levo se upravljanje kamere pomakne navzgor na mesto, ki ga je kocka izpraznila. Spodaj desno stoji kocka tik nad gumbom {{ui:inspector.snapGrid}}. Dokler so desno odprte lastnosti oblike, se kocka na desni strani umakne levo od njih. Kot si zapomni ta brskalnik in velja za vsak načrt. V ozkem oknu, na primer na telefonu, je nastavitev skrita in kocka ostane zgoraj levo.

> **Namig:** Ne vrti več pogleda, ko deleže natančno postavljaš drug ob drugega. S številskimi tipkami preklopi na raven pogled od zgoraj ali od spredaj in s [[O]] preklopi na ploski prikaz. Tako takoj vidiš, ali sta dva roba res poravnana.

## Kadar se layerling zdi počasen

layerling vse izračuna in nariše v tvojem brskalniku. Na starejšem računalniku, s šibko grafično kartico ali na več velikih zaslonih je pogled zato lahko trd. To pomaga:

- **{{ui:workspace.fastMode}}** pod {{ui:workspace.appearance}} naenkrat izklopi vse, kar pogled močno obremeni: sence, robne črte na vseh telesih in dohitevanje kamere. Poleg tega nariše pogled samo v ločljivosti zaslona, na zaslonih z visoko ločljivostjo je to do štirikrat manj točk. Tvoje lastne nastavitve ostanejo in spet veljajo, ko ga izklopiš.
- **Kamera dohiteva:** Če po vrtenju spustiš miško, se pogled še malo vrti in nežno zavira. To je namerno in ni zatikanje. Kdor je vajen drugače iz Tinkercada ali Fusiona 360, izklopi {{ui:workspace.cameraInertia}} pod {{ui:workspace.appearance}}, pa se pogled ustavi takoj.
- **Posamezna stikala:** Brez hitrega načina lahko izklopiš tudi samo {{ui:workspace.showShadows}} ali {{ui:workspace.edgeLines}}.
- **Uporabi grafično kartico:** V Chromu odpri `chrome://gpu` (v Edgeu `edge://gpu`). Pri »WebGL« bi moralo pisati »Hardware accelerated«. Če piše »Software only«, je strojno pospeševanje v nastavitvah brskalnika izklopljeno. V Windowsih lahko v nastavitvah pod Sistem → Zaslon → Grafika za brskalnik izbereš »Visoka zmogljivost«, da uporabi pravo grafično kartico, ne šibkejše v procesorju.
- **Poenostavi velike uvožene mreže:** Model iz več sto tisoč trikotnikov zavira vsak pogled. Kako ga razredčiš, piše v poglavju o datotekah pod »Poenostavitev uvožene mreže«.
- **Zapri druge zavihke:** Vsak odprt zavihek programa layerling in vsaka druga 3D-stran si delita isto grafično kartico.
