---
title: Merjenje in opombe
summary: Merilni trak, ravnilo in kotno ravnilo, razdalje do ničle – in opombe, ki visijo na delu.
---

Kdor želi del zgraditi natančno, mora znati meriti. layerling ima za to več orodij. Nobeno ne pride v izvoz. Debeline sten in reže v notranjosti najbolje izmeriš v [prereznem pogledu](chapter:pogled-in-delovna-ravnina) z {{ui:camera.sectionMeasure}}.

## Merilni trak

Merilni trak je na spodnjem koncu vrstice kamere ob levem robu ({{ui:camera.tapeTools}}). Meri razdalje med vogali, robovi in ploskvami. Klik nanj odpre pet gumbov. Če zakrivajo tisto, kar želiš izmeriti, jih za ročaj levo prosto povlečeš po delovni površini; dvoklik na ročaj jih vrne nazaj:

![Merilni trak z gumbi: Dodaj mero, Premakni merilne točke, Odstrani mero, Cele robove, Odstrani vse mere.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klikni točko, povleci do naslednje in jo klikni. Razdalja se označi, pred njo pa osi, vzdolž katerih poteka: X, Y ali Z za ravno, XY, XZ ali YZ prek ravnine, 3D za vse tri. S kazalcem nad oznako vidiš, kako daleč meritev seže vzdolž vsake osi, nad točko pa njene koordinate. Medtem ko postavljaš drugo točko, so osi, razdalja in doseg vzdolž vsake osi prikazani ob kazalcu. Meritev, ki leži večinoma za drugim telesom, zbledi; ko s kazalcem greš nad njeno črto ali oznako, je spet v celoti vidna.
2. **{{ui:camera.moveMeasurement}}:** Primi točke in jih premakni, številka sledi.
3. **{{ui:camera.deleteMeasurement}}:** Potem klikneš mero, da jo odstraniš.
4. **{{ui:camera.tapeWholeEdges}}:** Klik na rob izmeri ves rob, na primer obseg kroga. Ko je to stikalo izklopljeno, klik namesto tega postavi točko na rob, druga točka pa je lahko kjer koli, tako da lahko izmeriš premer ali katero koli drugo razdaljo. [[Alt]] stikalo obrne za en klik. Pri krogu se točka čez, nasproti prve, pripne, ko se kazalec približa, točki pa ležita na pravem krogu, zato je premer natančen.
5. **{{ui:camera.deleteAllMeasurements}}:** Odstrani vse mere naenkrat. Ker se tega ne da razveljaviti, layerling prej vpraša; če mer ni, se nič ne zgodi.
6. **{{ui:camera.tapeMarkMiddle}}:** Na sredini vsake meritve je majhna okrogla oznaka s polno spodnjo polovico. Na sredino meritve postavi [referenčno točko](#referencne-tocke): po kliku na okrogli rob, na primer rob luknje, v središče tega kroga – tudi pri uvoženi mreži, kjer sicer nič ne označuje sredine luknje –, pri premeru ali kateri koli ravni meritvi pa na sredino poti. Oblika, ki jo potem vlečeš, se s sredino zaskoči na točko. Točke, ki že obstaja, ne naredi dvakrat. Merilni trak se zaskoči na referenčno točko kakor na oglišče, zato lahko meriš od središča kroga ali od sredine črte: označi jo, nato klikni točko.
7. **{{ui:camera.tapeTypeLength}}:** Ko vsaj en konec ravne meritve leži na telesu, lahko kliknete njeno število. Vnesite novo dolžino in pritisnite [[Enter]]: telo pri drugi točki se premakne vzdolž izmerjene črte, dokler razdalja ni točno taka, kot pri ravnilu v Tinkercadu. Če je izbrano le telo pri prvi točki, se premakne to. Merilne točke ostanejo na telesu, zato meritev sledi. Merite od vogala, roba ali [referenčne točke](#referencne-tocke), na primer središča kroga, da dele postavite na točno razdaljo. Negativna dolžina ga premakne toliko čez prvo točko, na primer 5 mm navznoter od roba škatle.

S [[Esc]] zapustiš način merjenja.

## Ravnilo

Iz knjižnice oblik vzameš {{ui:shape.ruler}}. To je čisto merilno orodje: ne pojavi se v nobenem izvozu in ga ni mogoče združiti v skupino ali presekati. Za vsako telo, ki se ravnila dotika ali se z njim prekriva, pokaže razsežnost kot lebdečo številko neposredno v pogledu. To številko lahko spremeniš kar tam in telo se prilagodi. Prek lebdečega simbola plus ustvariš kopijo izmerjene oblike. Natisnjena lestvica je v milimetrih; ko enoto preklopiš na palce (stikalo spodaj desno), je v palcih, s črtico na vsak šestnajstinski palec in oštevilčenimi celimi palci.

## Kotno ravnilo

Včasih je bolje meriti ob pravem kotu. V vrstici kamere klikni {{ui:camera.cornerRulerTool}} in nato na delovno površino. Tam se odloži kotno ravnilo z dvema krakoma v pravem kotu, s črticami, kot kotnik. Tudi to nima lastnega telesa. Če klikneš blizu vogala telesa, se njegov vogal tam natanko zaskoči.

Kotno ravnilo se položi na delovno ravnino. Če leži na strani telesa, torej leži tudi ono na tej strani, glej [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina). Tako izmeriš na navpični steni: položi delovno ravnino na steno, kotno ravnilo postavi v njen zgornji levi vogal in toliko krat klikni na ročaj, da kraka kažeta v desno in navzdol.

- **Vlečenje za ročaj** ga premakne.
- **Kratek klik na ročaj** ga zavrti za 90°.
- **×** ob njem ga odstrani.
- **Majhen gumb levo od ročaja** preklopi, od kod se meri: od zunanjega roba telesa (oglišče, simbol s črtami) ali od njegove sredine (središče, nitni križ). Majhno stikalo iste vrste je ob vsaki zeleni številki in nastavi samo to številko: pri stoječem valju sredino v obeh krakih in dno po višini, pri ležečem sredino počez in konec po dolžini. Ko se vse tri spet ujemajo, gumb pri ročaju pokaže skupni način.

Če ob enem od krakov stojijo telesa, kotno ravnilo samodejno pokaže njihove mere. To gre samo na osnovni plošči, ne na strani telesa. Gumb s puščico pod ročico kotnega ravnila to izklopi, tako da mere kažejo samo izbrana telesa; shrani se z načrtom.

Če označiš telo, kotno ravnilo zeleno pokaže, kako daleč je od vogala, vzdolž obeh krakov in v višino. Klik na zeleno številko odpre vnosno polje: vpiši želeno razdaljo in telo se premakne natanko tja. Če je označenih več teles, štejejo skupaj kot eno. Meri se njihov skupni obris in vpisana vrednost premakne vse skupaj, ne da bi se njihova lega drugo glede na drugo spremenila.

S središčem zelene številke štejejo do sredine telesa, tudi v višini. Tako na primer postaviš kroglo s sredino natanko 15 mm ob rob, ne da bi odštel polmer. Na steni tako postaviš luknjo 40 mm z leve in 190 mm od zgoraj: označi luknjo, vklopi središče, vpiši 40 in 190. Višina tam šteje od stene navzven.

Merilni trak in kotno ravnilo ostaneta tam, kjer sta, ko skiciraš in se vrneš v 3D pogled. Nobenega ni v zgodovini. Kotno ravnilo se shrani z načrtom, prav tako meritve merilnega traku, v brskalniku in v datoteki .lyl: ko načrt odpreš, so spet tam. Gumb z očesom med gumbi merilnega traku skrije vse meritve in jih spet pokaže; shrani se tudi, ali so skrite, in kdor meritev doda, premakne ali izbriše, jih najprej spet vidi.

## Razdalje do ničle in pri premikanju

V nastavitvah pod {{ui:workspace.appearance}} sta dve stikali za tekoče mere:

- {{ui:workspace.showMoveDimensions}} pri premikanju pokaže, za koliko se premikaš. To velja tudi pri dvigovanju s črno puščico nad telesom; pot se pokaže ob njegovem sprednjem vogalu. Ko spustiš, klikni takšno število in vpiši natančno razdaljo; minus gre navzdol.
- {{ui:workspace.showOriginDimensions}} pokaže razdalje izbora do ničle plošče, tudi pri več označenih telesih.

Z {{ui:workspace.dimensionsAlwaysVisible}} mere ostanejo trajno vidne. Če telo ne stoji na delovni ravnini, je prikazana tudi njegova višina nad njo; klikni številko, da vneseš novo.

Če vas za trenutek motijo, pritisnite [[Q]]: mere in razdalje okoli izbora izginejo, zato je del, ki ga premikate, dobro viden. Ponovni [[Q]] jih vrne. Ročica, na katero pokažete, svojo mero vseeno pokaže.

## Opombe

Opomba zabeleži, česar geometrija ne pove: »Tu je vijak 0,3 mm preozek«, »Pokrov še natisniti«, »Mera od Petra«. Postaviš jo z {{ui:editor.tool.note}} ali s tipko [[N]].

- Če opombo postaviš **na telo**, potuje z njim.
- Če jo postaviš **zraven**, ostane na delovni ravnini ({{ui:note.free}}).
- {{ui:note.detach}} prikovano opombo loči od telesa.
- {{ui:editor.tool.group}} prikovano opombo vzame v skupino; {{ui:editor.tool.ungroup}} jo preda vidnemu delu pod njo, tudi skupini v njej. Dokler je skupina odprta z {{ui:group.edit}}, se njene opombe premikajo z delom pod njimi in se z {{ui:group.done}} vrnejo k skupini; preklic jih vrne, kakršne so bile.
- Če je njeno telo izbrisano ali pod njo ni več vidnega telesa, opomba ostane, kjer je stala, na delovni ravnini.
- Vlečenje bucike premakne opombo. Klik na buciko kartico zloži, ostane le majhna številka; še en klik jo spet odpre. Klik v besedilo ga uredi.
- Med pisanjem [[Enter]] obdrži besedilo, [[Esc]] ga vrne, kot je bilo pred začetkom, [[Shift]]+[[Enter]] pa začne novo vrstico.
- **V skici** opombo postavi tudi {{ui:editor.tool.note}} ali tipka [[N]], kamor koli na skico. Vse opombe skice pripadajo njenemu telesu: v 3D pogledu sedijo na njem, na vrhu telesa, narejenega s funkcijo {{ui:sketch.extrude}} ali {{ui:sketch.sweep}}, in na narisanem profilu telesa, narejenega s funkcijo {{ui:sketch.revolve}}, in se premikajo z njim. Ko skico znova odpreš, pokaže opombe telesa, tudi tiste, postavljene v 3D. V skici {{ui:sketch.undo}} prekliče opombo tako kot črto, {{ui:sketch.cancel}} pa zavrže, kar si spremenil pri opombah. [[Shift]]+[[N]] tudi tukaj prikaže ali skrije opombe.

Opombe se shranijo v načrtu, ne pojavijo se v nobenem izvozu in jih lahko prikažeš ali skriješ prek {{ui:visibility.notes}} (v {{ui:editor.visibilityOptions}}, puščici poleg ikone očesa) ali s [[Shift]]+[[N]].

## Referenčne točke

Referenčna točka je zgolj oznaka v prostoru, kot svinčnikova črta ali točka za zarisovanje v delavnici: ne spada k nobenemu telesu, nikoli se ne natisne in druge stvari se nanjo zaskočijo. Z desnim gumbom klikni na telo in izberi {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} ali {{ui:contextMenu.markMidpoints}}: točke se pokažejo na zgornji strani telesa (celotnega izbora, če si jih izbral več). {{ui:contextMenu.markFaceCenter}} namesto tega postavi točko na sredino ravne ploskve, na katero si kliknil z desno tipko, na primer na stranski ali čelni. Če je vrtišče nastavljeno, {{ui:contextMenu.markPivot}} postavi točko natanko nanj, da se sredina drugega dela zaskoči v točko, okoli katere se vrti izbor.

- Povleci točko, da jo premakneš, ali jo klikni, da vidiš njene koordinate in vpišeš nove; veljajo v nastavljeni enoti. Vsako kartico lahko za naslov povlečeš stran, če kaj zakriva, samo zase: druge ostanejo, kjer so, dvoklik na naslov pa jo vrne nazaj. Kartica, katere si se nazadnje dotaknil, stoji pred drugimi. **Izbriši vse** v kartici ali v meniju z desnim klikom izbriše vse točke naenkrat. {{ui:common.delete}} jo odstrani.
- Ko vlečeš obliko, se njeni robovi in sredina zaskočijo na točko, kot se zaskočijo na druge oblike ({{ui:workspace.objectSnap}}). Tudi kotno ravnilo se zaskoči na točke.
- Tudi merilni trak lahko označi točko: {{ui:camera.tapeMarkMiddle}}, napol polna oznaka na sredini meritve, jo postavi na njeno sredino, na primer v središče okrogle luknje. Od točke tudi meri: trak se zaskoči na referenčne točke kakor na oglišča.
- Točke se shranijo v načrtu, ne pojavijo se v nobenem izvozu in se skupaj z opombami prikažejo ali skrijejo prek {{ui:visibility.notes}} ([[Shift]]+[[N]]).
- Umetna inteligenca jih lahko postavi, našteje in odstrani z `layerling_add_reference_points`, `layerling_list_reference_points` in `layerling_remove_reference_points`.

## Referenčne slike

Referenčna slika je slika, po kateri poravnaš dele: položi fotografijo tiskanega vezja na dno njegovega ohišja in postavi distančnike, luknje in izreze za priključke natanko nanjo. Je pomoč, ne telo: nikoli se ne natisne, nikoli ne izvozi (STL, 3MF, OBJ, STEP, SVG), nikoli ni del skupine, svežnja ali reza, in ocena tiskanja jo izpusti.

- Odpri {{ui:editor.import}} in izberi {{ui:import.referenceImage}}, nato sliko PNG, JPG, WebP, GIF ali BMP. Pristane na delovni ravnini - na plošči ali na ploskvi, na katero si položil delovno ravnino -, z daljšo stranico 100 mm in na pol prosojna.
- Premikaj, vrti in spreminjaj jo z ročaji kot vsako obliko. Telo pred njo je izbrano prvo, zato pri delu na njej ne zgrabiš slike po nesreči.
- {{ui:referenceImage.seeThrough}} v njenih nastavitvah jo zbledi od povsem vidne do komaj vidne.
- {{ui:referenceImage.calibrate}} ji da pravo velikost kot v skici: klikni dve točki na sliki, katerih pravo razdaljo poznaš - na primer dve pritrdilni luknji vezja - in vpiši to razdaljo v {{ui:referenceImage.distance}}. Slika ohrani razmerja in sredino.
- Zakleni jo s ključavnico v glavi njenih nastavitev in ostane na mestu: kliki gredo tedaj skozi njo na ploščo. Za odklepanje jo izberi v seznamu objektov.
- Slika je v datoteki načrta shranjena enkrat, kolikorkrat jo kopiraš ali razveljaviš. Velika slika poveča datoteko za toliko; sporočilo ob dodajanju pove njeno velikost.
- UI jo doda, premakne, umeri, zbledi in zaklene z `layerling_reference_image`. S `trace` sliko obriše v telo skice, ki stoji na njej, kot {{ui:sketch.traceImage}} v skici.
