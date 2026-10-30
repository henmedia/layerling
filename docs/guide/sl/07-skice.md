---
title: Skice: od obrisa do telesa
summary: Nariši raven obris, zaobli ali posnemi vogale in iz njega izvleci ali zavrti telo.
---

Vsega ni mogoče sestaviti iz osnovnih oblik. Za dele z lastnim obrisom, na primer držalo, profil zoba ali vazo, najprej narišeš **obris** in iz njega naredi telo. Za to je način skice.

## Začetek skice

Zgoraj preklopi z {{ui:editor.modeGeometry}} na {{ui:editor.modeSketch}}. V skupini {{ui:sketch.group.create}} traku stojijo drug ob drugem trije gumbi za to, kaj naj postane obris:

- **{{ui:sketch.extrude}}:** Obris se potegne v višino, kot modelček za piškote.
- **{{ui:sketch.revolve}}:** Obris se zavrti okoli osi, kot na stružnici. Tako nastanejo vaze, kozarci, stožci in vse, kar je okroglo.
- **{{ui:sketch.sweep}}:** Obris se povleče vzdolž poti: kabelski kanal z ovinkom, cev, obroč okoli oblike. Glej spodaj Vleka vzdolž poti.

Potem urejevalnik pokaže list z mrežo. To je tvoja risalna površina.

## Risanje

Orodna vrstica skicirnega načina je razdeljena v področja:

- **Risanje:** {{ui:sketch.line}} postavlja ravne odseke: klikaj točke zaporedoma; s pridržano tipko [[Shift]] se nova črta zaskoči v korakih po 15°, vodoravno in navpično vključeno. Ob kazalcu stojita dolžina in kot nove črte. Kako dolga naj bo, lahko tudi vpišeš, glej [Črte po meri](#crte-po-meri). {{ui:sketch.bezier}} napneš na njenih ročicah: klikni točko in vleci, in sicer v smer, v katero naj črta teče naprej, kot s pisalom v Illustratorju ali Inkscapu. Dlje kot vlečeš, bolj se ukrivi; odsek do nove točke se ukrivlja že med vlečenjem, tako da vidiš, kaj nastaja. Vlečenje pri postavljanju oblikuje krivuljo; kdor prihaja iz Tinkercada in želi samo klikati točke, vzame {{ui:sketch.smooth}}. {{ui:sketch.smooth}} položi tekoč potek skozi točke, ki jih klikneš. Za sklenitev obrisa na koncu spet klikneš prvo točko. Verigo črt končaš brez sklenitve obrisa z desnim klikom brez premikanja kazalca ali z dvojnim klikom na zadnjo točko.
- **Oblike:** {{ui:sketch.addShape}} ponuja že pripravljene obrise: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (plošča z izvrtinami), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, {{ui:sketch.polygon}} in {{ui:sketch.star}}. Klikni eno, da jo postaviš v izhodišče skice, ali jo povleci iz menija tja, kamor jo želiš. Spodaj v meniju {{ui:sketch.polygonSides}} nastavi število stranic večkotnika in krakov zvezde, {{ui:sketch.starInner}} pa, kako globoko segajo doline zvezde proti sredini (10 do 90 odstotkov zunanjega polmera); obe vrednosti veljata za naslednjo dodano obliko. Kot vse skicirne oblike so potem navadna oglišča, zato jih lahko eno za drugo premikaš, zaobljuješ ali posnameš.
- **Prekrivanje:** Če dva sklenjena obrisa potisneš čez drugega, ostaneta dve telesi, ki se v 3D-urejevalniku združita; prekrivanje ni luknja. Luknja nastane samo iz obrisa, ki leži povsem znotraj drugega. Premikanje ne poveže črt tam, kjer se križajo, zato lahko oblike spet razmakneš. Če pa črto potegneš čez druge, layerling postavi točko na vsako križišče.
- **Izbor:** {{ui:sketch.select}} premika točke in črte. Klik v sklenjen obris izbere celotni obris, tako da ga lahko takoj premakneš ali mu spremeniš velikost; v luknji se izbere luknja. Okvir okoli izbora ima osem ročic: tiste v vogalih spreminjajo širino in višino hkrati, s pridržano tipko [[Shift]] v enakem razmerju. Tiste ob straneh spreminjajo samo eno smer. {{ui:sketch.lockOutline}} (ali [[Ctrl]]+[[L]]) zaklene izbrani obris kot zaklenjeno telo v 3D-urejevalniku: ni ga več mogoče premakniti ali spremeniti, njegove črte zbledijo, točke posivijo, ročaji okvirja pa posivijo in se ne odzivajo. Dokler je izbran, ga klik na ključavnico v njegovem kotu odklene. Ukrivljene puščice ob vogalih okvirja zavrtijo ves izbor okoli njegove sredine: številka nad kazalcem kaže kot, s pritisnjeno tipko [[Shift]] pa skače po 15°. Med vrtenjem se pokaže obroč: s kazalcem v njem se vrtenje zaskoči po 22,5°, zunaj njega gre po celih stopinjah, ne glede na mrežo. [[R]] zavrti cel sklenjen obris za 45° ob vsakem pritisku. Mehurčke mer za širino in višino lahko klikneš; tam vpišeš novo mero, tudi kot račun (»60+12,5«) ali v odstotkih (»150%«). S [[Shift]] s klikom dodaš še druge točke in črte ali jih odvzameš, tako da jih lahko več naenkrat premakneš. Okvir čez prosto površino izbere vse v njem. Tudi črto lahko vlečeš (premakne se na obeh koncih ali pa celoten izbor, če sodi k njemu). Smerne tipke premaknejo izbor za en korak mreže, s [[Shift]] za večji, [[Shift]] med vlečenjem pa drži gibanje na eni osi. {{ui:sketch.refine}}: klik na odsek postavi točko, klik na točko jo odstrani. Zraven sta še {{ui:sketch.erase}} (klik na točko ali črto jo odstrani, okno, povlečeno čez več, odstrani vse v njem, ob izbiri pa gumb izbrisa izbor) in vstavljanje slike predloge ({{ui:sketch.addImage}}).
- **Odložišče:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} in {{ui:editor.tool.delete}} delujejo na izbrane točke, črte in slike, kot v 3D-urejevalniku; [[Ctrl]]+[[X]] izreže. Prilepljeno in podvojeno pristane z 10 mm razmika ob originalu, na prostem mestu, kjer se ne dotika nobene obstoječe črte, tako da se nikoli ne poveže z obstoječim. Ostane izbrano, tako da ga lahko takoj povlečeš na mesto.
- **Zgodovina:** {{ui:sketch.undo}} in {{ui:sketch.redo}}.
- **Upravljanje:** {{ui:editor.tool.note}} (ali [[N]]) postavi opombo na skico, kot v 3D urejevalniku: naslednji klik jo postavi kamor koli, tudi na črto. Povleci buciko, da jo premakneš; klik na buciko zloži kartico. Opombe skice pripadajo njenemu telesu: v 3D pogledu sedijo na vrhu telesa, narejenega s funkcijo {{ui:sketch.extrude}} ali {{ui:sketch.sweep}}, in na narisanem profilu telesa, narejenega s funkcijo {{ui:sketch.revolve}}, in se premikajo z njim. Ko skico znova odpreš, pokaže vse opombe telesa, tudi tiste, postavljene v 3D. {{ui:sketch.undo}} prekliče opombo tako kot črto, {{ui:sketch.cancel}} pa zavrže spremembe opomb. Več v poglavju Merjenje in opombe.
- **Pogled:** Premikaš ga s srednjim gumbom miške ali s [[Shift]] oziroma [[Ctrl]] in desnim gumbom miške, kot v 3D-urejevalniku. Ko ni nič izbrano, ga premikajo tudi [[Ctrl]] in puščice: za desetino slike na pritisk, s [[Shift]] povrhu za polovico; skica se premakne v smer puščice. [[Home]] spet postavi celotno skico v sliko, [[F]] se približa izboru (brez izbora celotni skici), [[+]] in [[−]] pa približata in oddaljita, kot v 3D-urejevalniku. Ko ni nič izbrano, dvoklik na prazno mesto premakne pogled tako, da pride to mesto na sredino, kot v 3D-urejevalniku; {{ui:workspace.doubleClickCentersView}} v nastavitvah to izklopi. {{ui:camera.tapeTools}} v stranski vrstici meri razdaljo med dvema točkama. Poleg tega skica pokaže mere, takoj ko kaj klikneš: pri črti njeno dolžino, pri točki dolžine črt, ki se tam srečajo. Gumb {{ui:sketch.showMeasurements}} v stranski vrstici te mere skrije in spet pokaže, če motijo, na primer pri oblikovanju krivulj; merilni trak še naprej deluje. Pri ravni črti lahko klikneš mehurček mere in vpišeš dolžino v milimetrih; [[Enter]] jo sprejme, [[Esc]] prekine. Črta obdrži svojo smer, njena začetna točka ostane in črte na drugem koncu gredo zraven. Če je označena končna točka, se premakne ta. Z [[Alt]]+[[Enter]] črta raste na obe strani in obdrži svojo sredino. Pri krivuljah mehurček kaže samo dolžino.

Telo nastane samo iz **sklenjenega** obrisa.

![Obris v obliki črke L. Ob izbranem ogliščku zgoraj levo stojita dolžini obeh črt v milimetrih in kot med njima v stopinjah.](shot:sketch-outline)

Tipke [[1]] do [[4]] izberejo orodja za risanje v vrstnem redu vrstice: {{ui:sketch.line}}, {{ui:sketch.bezier}}, {{ui:sketch.smooth}} in {{ui:sketch.refine}}. Delujejo, dokler se ne riše črta; med risanjem črte so številke njena dolžina (glej spodaj).

## Črte po meri

Ko si z {{ui:sketch.line}} ali {{ui:sketch.smooth}} postavil prvo točko, preprosto vpiši številko: ob črti se odpreta dve polji, {{ui:sketch.typedLength}} v milimetrih in {{ui:sketch.typedAngle}} v stopinjah. S [[<]] ali [[Tab]] preskočiš na kot, tako da »50<30« da 50 mm dolgo črto pod 30°, kot v AutoCADu. [[Enter]] postavi točko in takoj vpišeš naslednjo črto; [[Esc]] zapre polji, ne da bi končal črtni potek.

Kot šteje od desne proti nasprotni smeri urnega kazalca: 0° v desno, 90° navzgor, 180° v levo, 270° navzdol. Če ga pustiš prazno, črta sledi kazalcu, torej podaš samo dolžino in smer pokažeš z miško. Računi, kot je »40+12,5«, gredo v obeh poljih. Če bi točka pristala ob plošči, ti polje to pove in čaka na drugo mero.

## Ukrivljanje ravne stranice

Izberi ravno črto in v vrstici, ki se pokaže, klikni {{ui:sketch.curveLine}}: stranica se zaobli v krivuljo kot v Tinkercadu in pokaže svoji dve ročici. Povleci ju, da oblikuješ krivuljo; dlje kot ročica štrli, močnejši je ovinek. Pod kazalcem se ročica obarva oranžno in ujame tudi klik tik ob njej, tako da se slika predloge pod njo ne premakne po nesreči. {{ui:sketch.straightenLine}} stranico spet naredi ravno. Izbrano točko lahko z {{ui:sketch.smooth}} zaobliš: dobi lastni ročici, črti ob njej pa postaneta krivulji. Ko izbereš tri ali več točk, {{ui:sketch.curveThroughPoints}} v vrstici položi eno gladko krivuljo od prve do zadnje, skozi vsako točko vmes, tako kot jo nariše orodje {{ui:sketch.smooth}}; črte onkraj obeh koncev ostanejo, kot so. V drugih programih se to imenuje »Fit curve« ali »Fit point spline«. Razlika: {{ui:sketch.curveLine}} ukrivi vsako izbrano stranico posebej in ohrani vogale med njimi, za lok na eni stranici; {{ui:sketch.curveThroughPoints}} skozi točke položi eno krivuljo brez vogalov, za glajenje nazobčanega, prerisanega roba. Klikni ročaj in zasveti: puščične tipke ga nato premaknejo za en korak mreže, s [[Shift]] za večji korak, tako da krivuljo nastaviš natančno.

![Spodnja stranica obrisa v obliki L, upognjena v krivuljo, z dvema ročicama na koncih.](shot:sketch-curve)

## Odčitavanje in vpisovanje kotov

Če klikneš oglišče, v katerem se srečata **dve ravni črti**, layerling poleg dolžin pokaže **kot** med njima v stopinjah, z majhnim lokom. V sklenjenem obrisu je to kot v notranjosti oblike, vboklina se torej bere nad 180°. Klikni vrednost in vpiši nov kot. Potem se ena od obeh črt zavrti okoli vogala in obdrži dolžino, druga ostane, kjer je. Črta, ki se vrti, je črtkana; s [[Tab]] preskočiš na drugo, [[Enter]] sprejme in [[Esc]] prekine. Kar visi na drugem koncu zavrtene črte, gre zraven.

Če premakneš točko, se spremenijo trije koti: pri njej sami in pri obeh sosednjih ogliščih na drugem koncu njenih črt. Zato layerling pokaže tudi ta dva in vsakega lahko klikneš in vpišeš. Tako nastaviš na primer vogal spodaj levo na 75,5°, medtem ko je zgoraj levo izbrana točka, ki se zato premakne. Tudi tu smeš računati, npr. »90-14,5«.

Kjer krivulja trči ob vogal ali se steka več kot dve črti, kota ni. Gumb {{ui:sketch.showMeasurements}} v stranski vrstici skrije kot skupaj z dolžinami.

## Zaokroževanje ali posnetje vogalov

Klikni oglišče in izberi {{ui:sketch.filletCorner}} ali {{ui:sketch.chamferCorner}}. Pokaže se majhno polje za {{ui:sketch.filletRadius}} oziroma {{ui:sketch.chamferDistance}}. Vpiši mero in potrdi s kljukico. To gre za vogale med dvema ravnima črtama.

Tudi več oglišč naenkrat deluje: izberi jih s [[Shift]] in klikom na vsako ali jih obkroži z okvirjem ter v vrstici, ki se pokaže, izberi {{ui:sketch.filletCorner}} ali {{ui:sketch.chamferCorner}}. Vsa dobijo isti polmer ali razdaljo. Kjer si dve izbrani oglišči delita stranico, vsako vzame največ 45 % nje, zato pravokotnik, zaokrožen povsod, na vseh ogliščih izpade enako. Točke, ki niso oglišče med dvema ravnima črtama, se izpustijo, sporočilo pa pove, koliko jih je. Okvir okoli cele oblike ali klik vanjo izbere njena oglišča in črte skupaj, vrstica pa poleg orodij za oglišča ponudi še {{ui:sketch.curveLine}} in {{ui:sketch.straightenLine}} za vse izbrane črte.

![Vogal zgoraj levo se zaobli s polmerom 12 mm.](shot:sketch-fillet)

## Zrcaljenje

Izberi točke in črte (s klikom, [[Shift]] in klikom ali z okvirjem okoli njih) in v vrstici klikni {{ui:sketch.mirror}}. Nato izberi os: {{ui:sketch.mirrorLeftRight}} zrcali čez navpično os skozi sredino plošče, {{ui:sketch.mirrorTopBottom}} čez vodoravno, {{ui:sketch.mirrorAcrossLine}} pa čez ravno črto skice, ki jo nato klikneš. Kopija se pojavi na drugi strani, izvirnik ostane; nič ni povezano, zato lahko vsakega spreminjaš posebej. Točke na osi so skupne, tako da polovični obris s konci na osi postane sklenjen obris: nariši polovico nosilca, jo izberi, zrcali in naredi telo. Dobra os je pomožna črta. [[Esc]] prekliče.

## Pomožne črte

Pomožna črta ti pomaga pri postavljanju točk, ne da bi spadala k telesu. Narisana je črtkano in nikoli ne šteje k obrisu: lahko jo povlečeš poljubno daleč čez obliko, ne da bi telo postalo večje.

- Vklopi {{ui:sketch.construction}} v skupini {{ui:sketch.group.draw}}. Nove črte, tudi tiste po meri, so potem pomožne črte. Z gumbom se spet vrneš na običajne črte.
- Že narisano črto spremeniš v pomožno tako, da jo klikneš in izbereš {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} jo spet naredi za običajno črto.
- Nove točke se zaskočijo tam, kjer pomožna črta seka drugo črto, modri obroč to pokaže, in na koncih pomožne črte. Tako vogal položiš na sredino, v stalno razdaljo od roba ali na presečišče, ne da bi računal.
- Pomožna črta obrisa tam, kjer ga seka, ne razreže. Pri vrtenju sme ležati tudi desno od osi.

## Iz tega narediti telo

Klikni {{ui:sketch.finishSketch}}. Obris stoji kot telo na delovni ravnini in nosi ime »Skicirano telo«. V njegovih nastavitvah spreminjaš višino, barvo in vse drugo kot pri vsaki drugi obliki. Če spremeniš njegovo velikost, ga layerling kmalu zatem znova zgradi iz skice, skica pa raste z njim. Tako ostane natančno telo, na katerem gresta posnetje in zaokrožitev, in ob naslednjem urejanju ima skica velikost, ki jo ima telo.

Če delovna ravnina leži na strani telesa, riši tako, kot gledaš na to stran: zgoraj v skici je zgoraj tudi na končnem telesu. Bledi obris telesa v pogledu skice kaže, kje stoji. Če delovna ravnina seka telo, pogled skice namesto tega pokaže obris tega preseka: izdolbeno telo se pokaže kot obroč in skico lahko poravnaš ob njegove stene. Točka, ki jo postaviš ali povlečeš blizu vogala teh obrisov, se tam natanko zaskoči; majhen modri obroč to pokaže. Tako v skico prevzameš robove drugih teles, tudi če delovna ravnina ne leži natanko na njih. Če želiš slediti obstoječemu delu, vklopi {{ui:sketch.showPartEdges}} (gumb s plastmi med gumbi pogleda na levi): vsi robovi teles so potem narisani na ravnini skice, tanki in bledi, kot da bi gledal skozi, ne glede na to, na kateri višini ležijo. Pokončna ravnina, postavljena na primer na sprednjo ploskev, tako pokaže pogled od spredaj. Izbira se shrani v brskalniku.

![Iz obrisa je nastalo telo. Vogal je zaobljen.](shot:sketch-result)

Z {{ui:inspector.editSketch}} se kadarkoli vrneš v skico, da jo spremeniš. Dvoklik na telo naredi isto, kot v Tinkercadu (zaklenjeno telo ostane zaprto); v nastavitvah to izklopiš z {{ui:workspace.doubleClickOpensSketch}}. Obdelave robov, ki si jih na telesu že naredil, se pri tem izgubijo, ker robovi nastanejo znova. Telo, ki si ga v 3D-urejevalniku zavrtel ali premaknil, se odpre tam, kjer stoji na plošči, zavrteno tako, kot ga vidiš tam, in na mreži plošče; le nagnjeno ali zrcaljeno telo se odpre v svoji lastni legi.

Skica z več obrisi da eno telo, obrisi, ki se prekrivajo, pa se v njem zlijejo. Če želiš vsak obris posebej, izberi telo in klikni {{ui:inspector.separateParts}}: vsak zunanji obris postane samostojno telo z luknjami, ki ležijo v njem, in obdrži višino, barvo in mesto telesa. Vsak del ima svojo skico za urejanje, s pomožnimi črtami, tako da lahko dele dvigaš ali spuščaš enega za drugim in jih nato združiš ali odšteješ. Obdelave robov to preprečijo, prav tako telo, ki je bilo pozneje raztegnjeno: to se potem razstavi kot mreža.

**Druga vrsta telesa iz iste skice:** oznaka na vrhu skice pove, kaj bo iz nje: {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} ali {{ui:sketch.modeBadgeSweep}}. Klikni nanjo in izberi drugo, tudi med urejanjem obstoječega telesa: uvoženi SVG, ki pride izvlečen, postane vaza ali gumb, ko ga preklopiš na {{ui:sketch.modeBadgeRevolve}}. Obris, ki sega čez os, se premakne levo, dokler njegov desni rob ne leži na osi; [[Ctrl]]+[[Z]] premik razveljavi. Ob zaključku novo telo stopi na mesto starega, z njegovim imenom in barvo ter vznožjem na isti višini. Obdelave robov se izgubijo, kot pri vsaki spremembi skice.

### Vrtenje

Pri vrtenju narišeš pol preseka **levo od osi**, ki je vrisana v skici. Poleg vidiš 3D-predogled vrtenja. Takoj pokaže, kako telo izgleda. Obris mora biti sklenjen, ali pa odprto črto zgradiš kot potezo, glej spodaj. Na koncu klikneš {{ui:sketch.finishRevolve}}. Druga telesa načrta so prikazana od spredaj, v istem pogledu kot profil, z osjo na sredini: profil nariši ob njih ali nad njimi. Telo stoji tam, kjer si ga narisal, vodoravna črta na sredini skice pa je tla: profil nad njo da telo, ki stoji više, njegova najnižja točka pa je noga telesa.

Zavrteno telo je natančno telo kot izvlečeno: sprejme posnetja in zaokrožitve ter ga lahko izdolbeš, za kozarec ali vazo. Telo, ki je bilo zavrteno s starejšo različico programa layerling, je mreža; odpri {{ui:inspector.editSketch}} in ga znova zaključi, pa bo natančno. Obris, ki sega čez os, ni mogoče zgraditi natančno in postane kot doslej mreža.

**En sam neprekinjen pramen: {{ui:prop.pitch}}.** Vrtenje iz obrisa naredi zaprte obroče. Izberi zavrteno telo in mu v podoknu lastnosti nastavi {{ui:prop.pitch}} večji od 0, višino, za katero se dvigne na en obrat, in obris se navije v vijačnico: en sam neprekinjen pramen kot filament na tuljavi ali vzmet. {{ui:prop.sweep}} takrat postane {{ui:prop.turns}}, do 200; negativno število navija levo. Ovoji, ki so bližje, kot je obris visok, se zlijejo v eno telo, zato deluje tudi polno jedro z drobnim korakom. Vijačnica se zgradi kot mreža, zato zaokrožitev, posnetje in izdolbenje na njej ne delujejo; pri veliko ovojih drži {{ui:prop.sides}} nizko. Korak 0 spet naredi obroče.

## Vleka vzdolž poti

{{ui:sketch.sweep}} povleče obris vzdolž poti: kabelski kanal, ki zavije za vogal, cev, zaščita okoli jermena, obroč okoli šestkotnika. Gumb stoji ob {{ui:sketch.extrude}} in {{ui:sketch.revolve}} v skupini {{ui:sketch.group.create}}.

Na isti list narišeš dve stvari:

- **Prerez** kot sklenjen obris, kot običajno. Nariši ga tako, kot bi ga videl, če gledaš vzdolž poti z njenega začetka: počez čez pot sta v skici levo in desno, zgoraj je zgoraj na končnem telesu. Votel prerez, kanal ali cev, je obris z drugim v njem. Prerez je počez na sredini poti, telo pa stoji z najnižjo točko prereza na ravnini skice.

- **Pot** kot {{ui:sketch.construction}}: vklopi jo in riši črte ali krivulje, eno samo verigo, odprto ali sklenjeno (sklenjena veriga da obroč). Pot leži ravno v ravnini skice.

Prerez nariši ob tisti konec poti, kjer naj se začne; pot se začne na koncu, ki mu je najbližje. Nato klikni {{ui:sketch.finishSweep}}. Vogal iz ravnih kosov postane zareza na gerung, krivulja ostane gladka, prerez pa ostane pokonci po vsej poti. Telo je natančno kot potegnjeno: zaobljenje, posnetje roba in izvoz STEP delujejo. Če manjka sklenjen obris ali pot, ali je več ločenih poti, layerling to pove. Z {{ui:inspector.editSketch}} se vrneš v skico in spremeniš prerez ali pot.

## Gradnja kot kontura

Običajno ploskev znotraj sklenjenega obrisa postane telo. Z {{ui:sketch.stroke}} v razdelku {{ui:sketch.group.finish}} namesto tega zgradiš samo črto, s širino, ki jo nastaviš. V ta namen v plošči označi {{ui:sketch.strokeOn}}. Skica potem takoj pokaže, kaj nastaja.

- **Sklenjen obris** postane okvir. {{ui:sketch.strokeAlign}} pove, kje leži stena: {{ui:sketch.strokeAlign.center}} na narisani črti, {{ui:sketch.strokeAlign.inside}} znotraj ali {{ui:sketch.strokeAlign.outside}} zunaj. Zunaj je praktično za toleranco: nariši obris luknje, na primer lastovičjega repa, in mu daj 0,2 mm konture zunaj. Tako nastane reža, ki jo tisk potrebuje.
- **Odprta črta** postane trak, sredinsko na črti. Pod {{ui:sketch.strokeCap}} izbereš, kako izgledata njena konca: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (podaljšan za pol širine) ali {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} velja za oboje: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} ali {{ui:sketch.strokeJoin.bevel}}.

Skica obdrži narisano črto. Ko jo spet odpreš, črto in konturo spreminjaš naprej, brez kljukice pa se spet zgradi ploskev. Krivulje se pri tem razstavijo na kratke ravne kose.

Pri vrtenju je poteza tanka stena: steno vaze ali skodelice nariši kot **eno odprto črto** levo od osi, obkljukaj {{ui:sketch.stroke}} in nastavi debelino, vrtenje pa zavrti ta trak. Kar sega čez os, se pri njej odreže.

## Polnilo in silhueta

Konturo nastaviš tudi, ne da bi odprl skico: v lastnostih skiciranega telesa pod {{ui:prop.sketchFill}} izbereš {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} ali {{ui:prop.sketchFill.center}}, zraven {{ui:prop.sketchLineWidth}} in {{ui:sketch.strokeJoin}}. Telo se takoj znova zgradi, na svojem mestu. To ustreza vrstam polnila pri uvozu SVG v Tinkercadu: privzeto, zunanja črta in notranja črta. {{ui:prop.sketchFill.grow}} pusti ploskev napolnjeno in jo poveča povsod za širino črte, s koničastimi, zaobljenimi ali posnetimi vogali: osnovna plast pod logotipom za večbarvni tisk, ki bi jo zunanja kontura sama dala samo kot obroč.

{{ui:prop.sketchSilhouette}} izpusti vse obrise, ki ležijo v drugem: luknje in kar je v njih. Ostane samo zunanji obris. Skupaj z {{ui:prop.sketchFill.outside}} iz tega nastane modelček za izrezovanje: uvozi SVG dvakrat, enkrat s silhueto kot ploskev za dno in enkrat s silhueto in 1 do 2 mm konture zunaj kot steno. Stikalo je tudi v plošči {{ui:sketch.stroke}} v skicirnem načinu.

Zaokrožitve in posnetja na robovih se pri ponovni gradnji izgubijo, kot pri urejanju skice.

## Poševne stene, za štampiljke

Izvlečena skica ima navpične stene. Štampiljka, matrica za vtiskovanje ali prebijalo pa zahteva poševne, zunaj in znotraj, z enako debelino stene po vsej višini. Layerling za izvlek nima kota nagiba, pri preprostih obrisih pa pridemo do cilja z {{ui:inspector.taper}}. En način, ki deluje:

1. Nariši obris z luknjo, ki jo potrebuje, in iz njega naredi telo. Telo podvoji ([[Ctrl]]+[[D]]).
2. Pri prvem telesu vklopi {{ui:prop.sketchSilhouette}}, da je luknja zapolnjena, in z {{ui:inspector.taper}} mu daj širše dno kot vrh.
3. Pri kopiji znova odpri njeno skico in izbriši zunanji obris, da ostane samo obris luknje. Zaključi skico, telo preklopi na {{ui:inspector.hole}} in mu z {{ui:inspector.taper}} daj ožje dno kot vrh.
4. Luknjo premakni v prvo telo, na mesto, kjer je bila luknja, in obe telesi združi v skupino.

Stene so zdaj poševne zunaj in znotraj. Zožitev spremeni merilo celotnega obrisa, zato je to pri preprostih oblikah natančno, saj velikosti izbereš tako, da so stene vzporedne, pri drobnih podrobnostih, na primer pri črkah, pa je samo približek.

## Slika kot predloga

Z {{ui:sketch.addImage}} položiš fotografijo ali risbo pod skico in jo obrišeš. Nastaviš lahko velikost, prekrivnost in lego. Ko slika leži prav, jo zakleneš s [[Ctrl]]+[[L]], da je pri risanju nehote ne premakneš. Zaklenjena slika je iz poti: kliki gredo skozi njo, torej na njej izbiraš črte in točke ter čez njo povlečeš okvir. Klik na ključavnico v njenem kotu jo odklene; klik z [[Alt]] jo izbere, ne da bi jo odklenil. Če njene nastavitve ob desnem robu zakrivajo sliko, jih povlečeš stran za naslovno vrstico; dvoklik nanjo jih spet zasidra.

Pod {{ui:sketch.imageAlign}} poravnaš fotografijo, ki ni bila posneta naravnost:

- **{{ui:sketch.imageRotation}}:** Zavrti sliko okoli njene sredine, z ukrivljenimi puščicami ob njenih vogalih ali kot številka v stopinjah. S [[Shift]] se puščice zaskočijo v korakih po 15°. V obroču, ki se pokaže med vrtenjem, se zaskočijo po 22,5°, zunaj njega po celih stopinjah.
- **{{ui:sketch.centreImageX}}** in **{{ui:sketch.centreImageY}}:** postavita središče slike na X = 0 oziroma Y = 0. Pri vrtenini je X = 0 os vrtenja, slika potem leži simetrično nad njo.
- **{{ui:sketch.calibrateImage}}:** Gumb je zgoraj, takoj pod predogledom. Klikni dve točki v sliki, katerih razdaljo poznaš, na primer konca ravnila ali znan premer, in vpiši resnično razdaljo. Slika se enakomerno poveča tako, da razdalja ustreza; prva točka ostane, kjer je bila.
- **{{ui:sketch.cropImage}}:** Ročice na okvirju sliko obrežejo namesto da bi jo povečale; kar odpade, ostane shranjeno in se vrne z {{ui:sketch.uncropImage}} ali ob izvlečenju ročice.

Vsa štiri delujejo samo na predlogo, nikoli na skico.

**{{ui:sketch.traceImage}}** v nastavitvah slike postavi točke namesto tebe: obriše obris oblike na sliki – silhueto, logotip, besedo – in ga pokaže v rdečem čez sliko, oglate točke za oglišča, okrogle za gladke točke. {{ui:sketch.traceDark}} ali {{ui:sketch.traceLight}} izbere, kateri del slike je oblika, {{ui:sketch.traceThreshold}}, kje temno preide v svetlo, {{ui:sketch.tracePoints}}, koliko točk dobijo obrisi skupaj (manj da bolj gladke krivulje, več natančneje sledi sliki), {{ui:sketch.traceCorners}}, od katerega preloma je točka oglišče, {{ui:sketch.traceSpeck}}, do katere velikosti madeži odpadejo, in {{ui:sketch.traceHoles}} ohrani sredino črke A ali O. {{ui:sketch.traceApply}} postavi obrise v skico natanko tja, kjer leži slika, v njeni velikosti, zasuku in obrezu, in jih izbere: to so navadne točke za premikanje, krivljenje ali odstranjevanje, [[Ctrl]]+[[Z]] pa jih v enem koraku vzame nazaj. Najbolje deluje pri jasnem kontrastu; fotografijo z razgibanim ozadjem najprej izreži. Kar odpade – okrog obrisov, v luknjah, kar je odrezano –, predogled prekrije z barvo podlage, tako da je od slike vidno le, kar ostane. Obrisi, ki ležijo tako blizu, da bi se grobe krivulje prekrižale, sami dobijo več točk; kartica to pove.

Za fotografijo – na primer igračo na beli mizi – izberi pod {{ui:sketch.tracePart}} **{{ui:sketch.traceObject}}**: ozadje je barva na robu slike, in vse, kar se od nje loči, postane en sam obris, ne glede na barve; {{ui:sketch.traceThreshold}} nato določa, kako jasno. Barvita slika na enakomernem ozadju se tako začne. {{ui:sketch.tracePickAreas}} obriše več: klikni na ploskev v sliki, na primer okno, in ploskev enake barve okrog mesta se obriše ({{ui:sketch.traceAreaTolerance}} določa, kako enake). Luknje in izbrane ploskve so naštete pod {{ui:sketch.traceList}}; ko pokažeš nanjo, se v predogledu poudari, ✕ jo odstrani, z izključenim {{ui:sketch.traceCut}} pa je namesto luknje narisana kot pomožna črta. Ploskev, ki sega do roba slike, je ozadje in ni vzeta. Kar ne loči noben prag in nobena barva – senco, temno kot kolesa nad njo –, odstrani {{ui:sketch.traceTrim}}: klikni oglišča okrog nje (klik na prvo oglišče, dvoklik ali [[Enter]] jo zapre), in obris teče ob rezu; na seznamu je kot »Rez 1«.

Drevo ob hiši, figura pred nemirnim ozadjem – kjer nobena barva ne loči oblike od ostalega, jo ujame **{{ui:sketch.traceLasso}}**: klikaj približno ob njenem robu, in med dvema klikoma črta sama sledi robu, tudi v lokih; že med premikanjem predogled pokaže, kod bo tekla. Klik na prvo točko, dvoklik ali [[Enter]] jo zapre, [[Esc]] jo zavrže. Na seznamu je kot »Laso 1«, z izbiro {{ui:sketch.traceRegionAdd}} (ploskev se pridruži obliki) ali {{ui:sketch.traceTrim}} (odvzeta je); enako izbiro ima vsak rez. Pod {{ui:sketch.tracePart}} naredi **{{ui:sketch.traceLassoOnly}}** obliko le iz tega, kar tako ujameš – nič drugega s slike.

## Tipke v skicirnem načinu

| Tipka | Učinek |
| --- | --- |
| [[Esc]] | odloži orodje za opombe; sicer odloži orodje (nazaj na {{ui:sketch.select}}), nato prekliči izbor |
| [[Del]] | izbriši izbrani element |
| [[Ctrl]]+[[C]] | kopiraj izbor |
| [[Ctrl]]+[[X]] | izreži izbor |
| [[Ctrl]]+[[V]] | prilepi |
| [[Ctrl]]+[[D]] | podvoji izbor |
| [[Ctrl]]+[[Z]] | razveljavi |
| [[Ctrl]]+[[A]] | izberi vse točke in črte |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | pri risanju: črta se zaskoči v korakih po 15°; pri vlečenju: gibanje omejeno na eno os |
| številka, [[<]], [[Tab]], [[Enter]] | pri risanju: vpiši dolžino in kot naslednje črte in jo postavi |
| [[R]] | zavrti sklenjeno skico za 45° |
| [[Ctrl]]+[[L]] | zakleni ali odkleni sliko predloge |
| [[N]] | postavi opombo: naslednji klik jo postavi na skico |
| [[Shift]]+[[N]] | pokaži ali skrij opombe |

> **Namig:** Nariši čim manj točk. Obris z malo, čisto postavljenimi točkami da bolj gladko telo kot kopica mnogih.
