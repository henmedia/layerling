---
title: Besedilo in ukrivljen napis
summary: Napisi dvignjeni ali vdolbeni, s sedmimi pisavami ali z lastno – in po želji vzdolž krožnega loka, na primer na kovancu, pokrovu ali obroču.
---

## Dodajanje besedila

V knjižnici oblik izberi {{ui:shape.text}} in ga odloži. V polje {{ui:prop.text}} desno vpišeš, kaj naj tam piše. Nastavitve pod njim:

- **{{ui:prop.font}}:** Na voljo je sedem pisav: Multilanguage, Sans, Serif, Script, Monospace, Rounded in Stencil (črke iz ravnih črt). Novo besedilo se začne v Sans. Šumniki in znaki € so v vsaki pisavi. Lastne pisave se dodajo, glej [Lastne pisave](#lastne-pisave) spodaj.
- **{{ui:nameTag.letterSize}}:** Kako velike so črke, gledano od zgoraj; {{ui:prop.height}} določa, kako debele so.
- **{{ui:prop.height}}:** Kako visoko pisava štrli iz ploskve.
- **{{ui:prop.bevel}}:** Zaobli robove črk, da delujejo mehkeje. Z {{ui:prop.segments}} določiš, v koliko stopnjah.
- **{{ui:nameTag.letterEdge}}:** zaobli ali posname zgornji rob črk, kakor pri imenski tablici: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} ali {{ui:nameTag.edge.chamfer}}, z velikostjo {{ui:nameTag.letterEdgeSize}} (na začetku 0,4 mm, največ tako visoka kot besedilo). Gre dlje kot {{ui:prop.bevel}}, a le toliko, kolikor so črte široke: kjer je črta tanjša od dvakratne velikosti, se rob konča z ožjo zgornjo ploskvijo. Spodnja stran ostane ravna, zato lahko posamezne črke pozneje prilepiš. Dokler je rob izbran, nadomesti {{ui:prop.bevel}}.
- **{{ui:prop.textSpacing}}:** Prostor med črkami poleg tistega, ki ga ima pisava, v odstotkih velikosti črk: 0 ga pusti, kot ga je naredila pisava, nad tem stojijo črke bolj narazen, pod tem (do -50) tesneje, kar lastna pisava pogosto potrebuje. Črke obdržijo velikost in okvir sledi vrstici, pri ravnem in ukrivljenem besedilu. Razmik se ne uporabi za arabščino in hebrejščino, katerih črke se povezujejo.
- **Velikost:** Dolžino in širino vrstice nastaviš kot pri vsaki obliki. Povleci ročice ali vpiši mere.
- **{{ui:prop.textStretch}}:** Na začetku izklopljeno: črke obdržijo razmerja in stojijo na sredini okvirja, zato okvir, ki je razvlečen širše ali globlje, kot besedilo potrebuje, ostane večji od črk. Če vklopiš, se črke raztegnejo v obe smeri čez ves okvir: veliko črko lahko narediš nižjo ali ožjo, kot v Tinkercadu. Velja za ravno besedilo; ukrivljeno besedilo ima svojo velikost črk.
- **{{ui:prop.textKerning}}:** Približa pare črk, med katerimi ostane preveč prostora, na primer AY, AV, LT ali To, izmerjeno po oblikah samih črk, v vsaki pisavi, tudi v lastnih. Nova besedila ga imajo vklopljenega; besedila, narejena prej, izklopljenega, da se v shranjenem načrtu nič ne premakne. Črke ohranijo velikost, okvir se prilagodi. Deluje pri ravnem in ukrivljenem besedilu, ne pri navpičnem besedilu, arabščini, hebrejščini ali japonščini.
- **{{ui:prop.textVertical}}:** Zloži črke od zgoraj navzdol, vsako na sredino ene pokončne vrstice, za napis na podboju vrat ali ime vzdolž pisala. Okvir se postavi pokonci in črke obdržijo velikost; {{ui:prop.textSpacing}} nastavi razmik med njimi. Pri ukrivljenem besedilu črke tvorijo stolpec ob levi strani kroga, vsaka stoji pokonci; {{ui:prop.textInwardColumn}} postavi stolpec na desno stran.

Besedilo je sprva eno samo telo. Če želiš črke obravnavati posamezno, klikni {{ui:inspector.separateParts}}. Potem je vsaka črka lastna oblika.

**Več vrstic:** Besedilo ima eno vrstico. Za tablo ali ploščo z več vrsticami pod nastavitvami odpri kartico {{ui:textBlock.title}}: vnesi vrstice v {{ui:textBlock.lines}}, izberi {{ui:textBlock.align}} ({{ui:textBlock.align.left}}, {{ui:textBlock.align.center}} ali {{ui:textBlock.align.right}}), {{ui:textBlock.gap}} in {{ui:textBlock.step}} - pri 80 % je vsaka vrstica za petino manjša od zgornje. Gumb naredi iz vsake vrstice samostojno besedilo pod zgornjo, v pisavi, višini in polnilu tega besedila; prva zasede mesto tega besedila. Nato lahko vsaka vrstica dobi svojo velikost, pisavo ali barvo.

Tudi robove pisave lahko posnameš ali zaobliš, ravno ali ukrivljeno, glej [Posnetje robov in izdolbljenje teles](chapter:robovi-in-izdolbljenje). Vzemi majhne mere, kot 0,2 do 0,5 mm, saj so poteze črk ozke.

## Lastne pisave

Poleg sedmih priloženih pisav lahko vzameš katerokoli lastno pisavo: datoteko pisave z računalnika ali, v Chromu in Edgeu, pisavo, ki je nameščena na tvojem računalniku. Za to pod {{ui:prop.font}} čisto spodaj izberi {{ui:font.manage}}. Odpre se okno {{ui:font.title}}.

- **{{ui:font.addFile}}** sprejme datoteko TrueType (`.ttf`), datoteko OpenType (`.otf`) ali datoteko WOFF (`.woff`). Datoteko lahko tudi preprosto povlečeš v okno.
- **V Windowsih** so nameščene pisave v mapi »Pisave« (`C:\Windows\Fonts`). Pogovorno okno za datoteke v brskalniku jo skrije. Namesto tega jo odpri v Raziskovalcu in povleci želeno pisavo v okno {{ui:font.title}}. Pisave, ki so nameščene samo zate, ležijo v `%LOCALAPPDATA%\Microsoft\Windows\Fonts`; to mapo pokaže tudi pogovorno okno za datoteke. Na Macu so pisave v `/Library/Fonts` in `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** našteje pisave, nameščene na tvojem računalniku. Prvič brskalnik vpraša, ali jih sme layerling brati. Prek iskalnega polja hitro najdeš pisavo, klik jo prevzame.

Če je ravno izbrano besedilo, takoj dobi novo pisavo. Sicer je potem pod {{ui:prop.font}} v skupini {{ui:font.customGroup}}, z {{ui:font.use}} v oknu pa jo nastaviš na izbrana besedila. Lastne pisave se obnašajo kot priložene: besedilo na krožnem loku, posnetja in zaokrožitve na robovih ter izvoz STEP delujejo enako. Črke, ki jih pisava nima, layerling vzame iz Sans.

### Arabščina in hebrejščina

Arabščina, perzijščina, urdujščina in hebrejščina se pišejo od desne proti levi: prva črka stoji na desni, pri mešanem besedilu, kot je »Name عربي«, pa teče nazaj samo arabska beseda, števke ostanejo kot običajno. Arabske črke se povezujejo s sosednjimi, kot zahteva pisava, lam-alef pa postane ligatura. Za to je potrebna pisava, ki te črke ima; vgrajene je nimajo. Dodaj svojo, na primer Arial, Tahoma ali Segoe UI v Windowsih, ali prosto pisavo, kot so Noto Naskh Arabic, Noto Sans Arabic ali Amiri. Samoglasniški znaki sedijo na črki, ki jim pripada. Besedilo na krožnem loku, kontura, silhueta, plasti in napisi z imenom delujejo z njo kot z vsakim drugim besedilom.

### Kaj gre v katerem brskalniku

| Brskalnik | Izbira datoteke pisave | Pisava z računalnika |
| --- | --- | --- |
| Chrome in Edge na računalniku, tudi nameščena aplikacija layerling | da | da, po vprašanju brskalnika |
| Firefox | da | ne |
| Safari na Macu | da | ne |
| Tablica in telefon | da, iz datotek naprave | ne |

Spletne strani ne smejo kar brati nameščenih pisav. Samo Chrome in Edge imata za to lastno dovoljenje, in še to samo na varnih straneh, torej prek `https`, kot pri layerling.com. Če layerling teče prek `http`, na primer na lastnem strežniku ali kot namestitev Docker v domačem omrežju, {{ui:font.fromSystem}} manjka; potem pisavo povlečeš iz Raziskovalca. V drugih brskalnikih izbereš datoteko pisave iz mape s pisavami, rezultat je enak. Če si vprašanje v Chromu ali Edgeu zavrnil, dostop spet omogočiš v nastavitvah spletnega mesta, prek ključavnice levo od naslova.

Česar layerling ne zna brati, so datoteke WOFF2 (za to skoraj vedno obstaja različica TTF ali OTF), zbirke pisav (`.ttc`, vsebujejo več pisav v eni datoteki) in barvne pisave emojijev. Pri zelo velikih pisavah, na primer za kitajščino, layerling vzame prvih 8000 znakov. Pri spremenljivih pisavah velja osnovna nastavitev pisave, običajno normalna različica.

Nekatere pisave, predvsem pisane in spremenljive, črko narišejo iz potez, ki se prekrivajo. layerling jih ob branju združi v čist obris, da telo ostane tiskljivo. Take črke potem sestojijo iz zelo kratkih ravnih kosov namesto iz krivulj; vidi se ne.

### Kje ostanejo pisave

Lastna pisava ostane **v tem brskalniku na tem računalniku**. Drug brskalnik ali drug računalnik je ne pozna, dokler je tam prav tako ne dodaš. Kdor izbriše podatke spletnih mest v brskalniku, izbriše tudi pisave. V oknu {{ui:font.title}} pisavo odstraniš iz brskalnika s košem. Tvoji načrti pri tem nič ne izgubijo, kot pokaže naslednji razdelek.

### Posredovanje načrtov z lastno pisavo

Načrt **ne shrani datoteke pisave**, ampak samo obrise črk, ki jih njegova besedila uporabljajo, tudi tiste iz prejšnjih korakov v zgodovini. Če v besedilu piše »Hallo«, potujejo zraven samo H, a, l in o. To velja za vsak način, kako je načrt shranjen: v brskalniku, na lastnem strežniku, kot datoteka `.lyl` in v {{ui:myShapes.title}}.

Iz tega sledi:

- **Načrt se povsod odpre pravilno**, tudi na računalniku brez pisave. Besedila izgledajo enako in jih lahko premikaš, vrtiš, povečuješ in zaokrožaš.
- **Nove črke potrebujejo pisavo.** Če kdo brez pisave vtipka črko, ki je načrt ni prinesel, jo layerling nariše iz Sans. Pod {{ui:prop.font}} potem piše pisava z dodatkom {{ui:font.fromDesign}}. Kdor doda datoteko pisave, spet dobi vse črke.
- **Izvozi vsebujejo samo geometrijo.** STL, 3MF, OBJ, STEP in SVG vsebujejo telesa in obrise, ne pisave.
- **Starejše različice programa layerling** lastnih pisav še ne poznajo in taka besedila narišejo v Multilanguage.

**Licence:** Pisave so zaščitene z avtorskimi pravicami in njihova licenca ureja, kaj smeš z njimi početi. Vdelani obrisi črk so isto, kar datoteke PDF vzamejo od pisave, in to večina licenc dovoljuje. Nekatere pisave, ki jih lahko kupiš, pa prepovedujejo vsako posredovanje, tudi posameznih črk. Preden načrt z lastno pisavo posreduješ ali objaviš, zato preveri licenco pisave. Proste pisave, kot so tiste iz Google Fonts (običajno pod licenco SIL Open Font License), smeš brez pomislekov posredovati. Za natisnjen del ali izvožen STL to ni pomembno: v njem ni več pisave, samo še geometrija.

## Dvignjeno ali vdolbeno

- **Dvignjeno:** Besedilo postavi na ploskev in ga združi v skupino s telesom. Zraste kot reliefen napis.
- **Vdolbeno:** Besedilo preklopi na {{ui:inspector.hole}}, pusti, da malo sega v ploskev, in ga združi v skupino s telesom. Črke so potem vgravirane.

Za napise na stranski ploskvi najprej položi delovno ravnino na to ploskev, glej [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina).

## Šablone: mostički za sredino črk

Ko besedilo izrežeš skozi ploščo, črke, kot so O, A in B, izgubijo sredino: ohlapno leži v črki in izpade. {{ui:stencilBridges.title}} jo z majhnimi mostički drži na plošči, kot pri šabloni.

1. Besedilo preklopi na {{ui:inspector.hole}}, naj gre skozi ploščo, in izberi oboje, združeno ali ne.
2. Klikni {{ui:stencilBridges.title}} v skupini {{ui:editor.group.modify}} na traku, desno klikni izbor ali ga poišči z [[Ctrl]]+[[K]]. Mostički se oranžno pokažejo tam, kamor pridejo.
3. Nastavi {{ui:stencilBridges.width}} in {{ui:stencilBridges.count}}. {{ui:stencilBridges.height}} se začne pri debelini plošče; nižji mostički so poravnani s spodnjo stranjo, na sredini ali poravnani z zgornjo stranjo plošče, kot pove {{ui:stencilBridges.position}}. Pri šabloni za razpršilno barvo mostički zgoraj pod seboj pustijo prostor za barvo.
4. {{ui:stencilBridges.apply}} združi mostičke s ploščo.

Vsak mostiček je navaden kvader: odpri skupino, da enega premakneš, izbrišeš ali dodaš svojega. Če besedilo pozneje spremeniš, izberi skupino in znova klikni {{ui:stencilBridges.title}}; novi mostički nadomestijo stare. Besedilo, ki je le vgravirano in ne gre skozi, ne dobi mostičkov, saj tam nič ne izpade. Za laser ali risalnik izvoz DXF in SVG doda enake mostičke, glej [Datoteke, shranjevanje in deljenje](chapter:datoteke-in-shranjevanje).

## Kontura, silhueta in širše

Besedila ni treba zgraditi kot napolnjene črke. {{ui:prop.textFill}} v lastnostih ponuja isto izbiro kot Tinkercad:

- **{{ui:prop.textFill.filled}}:** črke, kot so.
- **{{ui:prop.textFill.outline}}:** črta vzdolž obrisa črk, pol znotraj in pol zunaj.
- **{{ui:prop.textFill.outer}}:** črta zunaj okoli črk.
- **{{ui:prop.textFill.inner}}:** črta znotraj v črkah.

Če je izbrana črta, se tik pod seznamom pokažeta dve nastavitvi: {{ui:prop.sketchLineWidth}} določa, kako debela je črta, {{ui:sketch.strokeJoin}}, kako teče okoli vogalov ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} ali {{ui:sketch.strokeJoin.miter}}). Redkejše nastavitve so pod {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} izpusti luknje v O, A ali e, {{ui:prop.textWider}} pa pusti črke napolnjene in jih naredi povsod debelejše za širino črte; črke, ki se pri tem dotaknejo, zrastejo v en kos.

S črto zunaj, sredinsko črto ali »Širše« raste tudi okvir besedila, črke pa obdržijo svojo velikost. {{ui:prop.bevel}} in {{ui:prop.segments}} sta samo za napolnjene črke.

## Plasti in napisi z imenom

Napis z imenom za večbarvni tisk je besedilo v plasteh: zgoraj črke, pod njimi isto besedilo malo širše v drugi barvi, čisto spodaj plošča brez lukenj v tretji. layerling to naredi z enim klikom:

- **Nov napis z imenom:** V knjižnici oblik izberi {{ui:shape.nameTag}} in ga odloži. Na njem piše »Ime« z belimi črkami na rdečem robu in temni plošči.
- **Iz besedila:** Izberi besedilo in zgoraj v njegovih nastavitvah klikni {{ui:nameTag.makeLayers}}.

Vse nastavitve napisa so v kartici {{ui:nameTag.title}}, čisto na vrhu nastavitev:

- **{{ui:prop.text}}** in **{{ui:prop.font}}**, tudi lastne pisave. Napis raste z besedami.
- **{{ui:nameTag.letterSize}}:** kako visoke so velike črke, v mm. Vse plasti gredo zraven in ostanejo prekrite.
- **{{ui:prop.textVertical}}:** postavi ploščico pokonci s črkami druga pod drugo, z vsemi plastmi.
- **{{ui:nameTag.layers}}:** ena vrstica na plast, od zgoraj navzdol. Vsaka vrstica ima barvo (klikni na barvno polje), za koliko je plast širša od črk, svojo višino in {{ui:nameTag.noHoles}}, ki zapolni luknje v črkah, kot sta O in A. {{ui:nameTag.corners}} določa, kako širša plast teče okoli vogalov črk: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} ali {{ui:nameTag.corner.miter}}. Zgornja vrstica so same črke. **+** doda plast spodaj, **–** odvzame zadnjo. Napis ima od dveh do šest plasti.
- **{{ui:nameTag.keyring}}:** da najnižji plasti raven jeziček z okroglim koncem in luknjo za obesek za ključe; jeziček raste z luknjo. Luknja 3 mm, privzeta vrednost, da 6,5 mm širok jeziček, ki sega 6,75 mm čez; rob luknje leži 2 mm od roba najnižje plasti. Izberi {{ui:nameTag.keyringDiameter}} in {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} ali {{ui:nameTag.side.top}}. {{ui:nameTag.side.free}} sname luknjo z napisne ploščice in ob njej postavi lasten {{ui:nameTag.keyringTab}} v barvi in višini najnižje plasti: navadno obliko, ki jo z njenimi ročicami premakneš in zavrtiš, kamor jo ploščica potrebuje. Ko je na mestu, ga {{ui:nameTag.keyringTabFix}} v njegovih lastnostih naredi del najbližje ploščice, natanko tam, kjer stoji: luknja gre skozi vsako plast, ki jo doseže, uho se poveže z najnižjo plastjo, oboje pa ostane ob tem vogalu črk, ko se spremenijo besede ali velikost. {{ui:nameTag.side.free}} jeziček znova postavi ven, kjer je bil, da ga lahko še enkrat premakneš. Luknja gre skozi vsako plast, ki se je dotika, jeziček pa se premika zraven, če spremeniš besede, velikost črk ali pisavo. {{ui:nameTag.keyringAlong}} premakne jeziček ob njegovi strani navzgor ali navzdol (zgoraj: levo ali desno), do mesta, kjer bi zapustil stran; 0 je sredina. Pomaga, ko sredina strani naleti na vrzel, na primer ob črki J: premakni jeziček tja, kjer črka sega ven.
- **{{ui:nameTag.letterEdge}}:** zaobli ali poševno odreže zgornji rob črk na vrhnji plasti, tako kot se natisnjen napis dokonča: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} ali {{ui:nameTag.edge.chamfer}}, z {{ui:nameTag.letterEdgeSize}} (sprva 0,4 mm, največ tako visoko kot plast). To gre za vsako pisavo in vsako besedo. Rob spada k mreži črk; robno orodje zato tako besedilo vzame kot mrežo, kar je pri tako fini pisavi težko - rob raje izberi tu.

Vsako spremembo vidiš takoj. Napis je sveženj: premika se kot celota, vsaka plast pa ostane svoje telo v svoji barvi, tako kot jo rezalnik potrebuje za večbarvni tisk. Da robove plasti zaobliš ali poševno odrežeš, klikni {{ui:group.editBundle}} in izberi plast, glej [Posnetje robov in izdolbljenje teles](chapter:robovi-in-izdolbljenje).

### Veliko napisov z imenom naenkrat

Imena vpiši v {{ui:textLayers.names}}, eno na vrstico, do sto. Gumb pod njim pove, koliko napisov naredi, na primer »Naredi 12 napisov z imenom«. Vsak napis dobi iste plasti, isto velikost črk in isto luknjo in je lasten objekt; ležijo v vrstah pod prvim, 5 mm narazen. Tudi preprosto besedilo ima seznam imen, nižje v svojih nastavitvah.

## Simbolne oznake

Simbolna oznaka je ista oznaka s simbolom SVG namesto črk: srček, oblak, logotip društva. Zgoraj simbol, pod njim isti obris malo širši v drugi barvi, čisto spodaj plošča brez lukenj.

- **Nova simbolna oznaka:** v knjižnici oblik izberi {{ui:shape.iconTag}}. Odpre se majhno okno: klikni {{ui:iconTag.browse}}, izberi datoteko SVG, PNG ali JPG, preveri sliko, vpiši {{ui:iconTag.width}} simbola in klikni {{ui:iconTag.ok}}. Oznaka stoji na sredini plošče, v enakih plasteh kot nov napis z imenom.
- **Iz telesa skice:** uvožena datoteka SVG ali skica, ki si jo narisal, ima na vrhu nastavitev {{ui:nameTag.makeLayers}}.

Kartica {{ui:iconTag.title}} na vrhu nastavitev vsebuje:

- **{{ui:iconTag.replace}}:** na oznako postavi simbol druge datoteke (SVG, PNG ali JPG); plasti in širina ostanejo, kot so.
- **{{ui:iconTag.iconWidth}}:** kako širok je simbol zgoraj, v mm. Vse plasti sledijo in ostanejo poravnane.
- **{{ui:nameTag.layers}}:** vrstice kot pri napisu z imenom – barva, za koliko širše, {{ui:nameTag.corners}}, višina in {{ui:nameTag.noHoles}}, **+** in **–**, od dve do šest plasti. Zgornja vrstica je simbol sam.
- **{{ui:nameTag.keyring}}:** kot pri napisni ploščici: luknja za obesek za ključe skozi vsako plast, z jezičkom z okroglim koncem na najnižji plasti, zunaj ikone. {{ui:nameTag.keyringDiameter}} in {{ui:nameTag.keyringSide}} izbereta njegovo velikost in mesto; {{ui:nameTag.side.free}} da lasten jeziček, kot pri napisni ploščici. Jeziček je narejen za obris ikone, zato pri zelo razčlenjeni ikoni preveri, kje se je dotika. {{ui:nameTag.keyringAlong}} premakne jeziček vzdolž njegove strani, kot pri napisni ploščici.
- **{{ui:iconTag.count}}:** koliko oznak želiš, od 1 do 100. {{ui:iconTag.fill}} izračuna število iz plošče tiskalnika, izbranega v nastavitvah; pri majhnih logotipih polna plošča. Gumb spodaj jih naredi, 5 mm narazen, razporejene na sredini plošče; prva je oznaka sama.

SVG potrebuje sklenjene obrise; risba samo iz odprtih črt ne more postati oznaka. Telo skice, katerega polnilo je črta, jo obdrži: ploščina te črte je simbol.

**Slika (PNG ali JPG)** se izsledi v obris in predogled pokaže obris. Pod {{ui:iconTag.part}} izbereš, ali simbol postane {{ui:iconTag.part.dark}} ali {{ui:iconTag.part.light}}; na začetku je to del, ki ni ozadje. Prozorne točke nikoli ne spadajo k simbolu. SVG, ki vsebuje samo eno sliko, kot ga shrani Inkscape po uvozu bitne slike, se izsledi enako. Obris sledi točkam, zato majhna slika da hrapav rob: najbolje delujejo slike z nekaj sto točkami ali več. {{ui:iconTag.replace}} vzame del slike, ki ni njeno ozadje.

## Kode QR

Koda QR iz besedila ali spletnega naslova naredi vzorec, ki ga prebere kamera telefona: povezava do tvoje trgovine na tablici, ime omrežja Wi-Fi na podstavku, telefonska številka na obesku za ključe.

V knjižnici oblik izberi {{ui:shape.qrCode}}. Odpre se okno; kazalec je že v polju za besedilo:

- **{{ui:qrCode.text}}:** kaj koda pove. Enter ustvari kodo, Shift+Enter začne novo vrstico. Pod poljem vidiš, koliko prostora je porabljenega; črke s strešicami in drugi posebni znaki zasedejo dva bajta. Če je besedilo predolgo, ti polje to pove.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q ali H. Višjo stopnjo je še mogoče prebrati, ko je del kode umazan ali opraskan (L približno 7 %, M 15 %, Q 25 %, H 30 %), vendar za isto besedilo potrebuje več modulov, zato je vsak modul manjši. Najprej je izbrana M.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} zgradi samo kodo, visoko 4 mm. {{ui:qrCode.style.raised}} jo postavi 1 mm visoko na belo ploščo debeline 3 mm, kot sveženj dveh barv, tako da večbarvni tisk natisne kodo temno in ploščo svetlo. {{ui:qrCode.style.engraved}} kodo vreže 1 mm globoko v ploščo.
- **{{ui:qrCode.sizeBy}}:** vnesi {{ui:qrCode.sizeBy.width}} cele kode (najprej 40 mm) ali velikost enega modula; drugo število je zapisano spodaj. Moduli, manjši od 0,8 mm, dobijo opozorilo. To je okvirno pravilo za šobo 0,4 mm, ne zagotovilo: vlogo igrajo tiskalnik, material, barve in telefon.
- **{{ui:qrCode.quietZone}}:** čitalniki potrebujejo okoli kode prazen rob širine štirih modulov. Na plošči je rob del plošče; izklopi ga le, če plošča leži na večji svetli površini. Koda sama nima svojega roba: prostor okoli nje pusti prazen.
- **Višine:** višina kode, na plošči višina kode ali globina gravure, in debelina plošče.

Predogled pokaže kodo, kot bo zgrajena. {{ui:qrCode.ok}} jo postavi na sredino plošče.

Koda je telo kot vsako drugo: premakni jo, zavrti, povečaj (širino in globino ohrani enaki, sicer se koda popači), združi jo, ali jo spremeni v luknjo in jo združi v svoj del, da jo tam vgraviraš. Povečava poveča celo kodo; vsak modul ostane kvadraten.

Kartica {{ui:qrCode.title}} na vrhu njenih nastavitev vsebuje besedilo. Spremeni ga in klikni {{ui:qrCode.regenerate}}: koda se zgradi znova tam, kjer stoji, in tako široka, kot je zdaj. Popravek napak, tiho območje in izvedba ostanejo, kot so bili izbrani; za druge izbire ustvari novo kodo iz knjižnice.

Kodo pred tiskom skeniraj s telefonom, in po tisku še enkrat. Temno na svetlem se bere najbolje; svetle kode na temni plošči ne prebere vsak telefon.

## Besedilo na krožnem loku

Naj napis ne teče naravnost, ampak sledi robu kovanca, pokrova ali obroča? Za to je nastavitev {{ui:prop.textCurved}}.

![Besedilo sledi krogu. Vse črke stojijo na skupni črti.](shot:curved-text)

Takoj ko jo vklopiš, besedilo teče vzdolž kroga. Vse črke stojijo na isti osnovni črti, tako enakomerno kot pri običajnem besedilu. Poleg je pet nastavitev:

- **{{ui:prop.textRadius}}** (5 do 500 mm): Polmer kroga, na katerem teče osnovna črta črk. Črke ostanejo na svojem mestu, spremeni se le njihova ukrivljenost.
- **{{ui:prop.textLetterWidth}}** (25 do 400 %): Kako široko je narisana vsaka črka, v odstotkih njene lastne širine. Pod 100 so črke ožje, nad 100 širše; njihova višina ostane, lok, ki ga zasedajo, pa se z njimi podaljša ali skrajša. Na primer za visok, ozek napis na kovancu. Pri ravnem besedilu to naredi {{ui:prop.textStretch}} z okvirjem.
- **{{ui:nameTag.letterSize}}:** Kako visoke so črke. Ne visi več na širini oblike.
- **{{ui:prop.textInward}}:** Preklopi besedilo z zgornje strani kroga na spodnjo. Črke potem kažejo z glavo proti središču.
- **{{ui:prop.textFlipped}}:** Obrne samo črke, da jih lahko bereš z druge strani. Besedilo pri tem ostane na svojem mestu na krogu.

**Središče kroga je središče oblike.** Zato poravnava deluje kot običajno: če besedilo sredinsko poravnaš z valjem ali obročem, sedi natanko koncentrično na njem. Če povlečeš za ročico, polmer in velikost pisave rasteta skupaj, tako da se pisava ne popači.

> **Namig:** Zgoraj na krogu stojijo črke zunaj osnovne črte, z {{ui:prop.textInward}} znotraj, z glavami proti središču. Da pisava ustreza plošči, naj bo polmer plus velikost pisave manjši od polmera plošče.
