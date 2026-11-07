---
title: Telesa in luknje
summary: Kako iz preprostih oblik nastanejo izvrtine, utori in žepi – in kako skupino pozneje še enkrat spremeniš.
---

To je najpomembnejša zamisel v programu layerling in se je hitro naučiš: **Vsaka oblika je ali telo ali luknja.** Telo ostane. Luknja je orodje, ki odvzema material.

## Telo ali luknja

Izberi obliko in v njenih nastavitvah klikni {{ui:inspector.solid}} ali {{ui:inspector.hole}}. Hitreje gre s tipkovnico: [[H]] naredi izbor za luknjo, [[S]] spet za telo. Oboje je tudi v meniju, ki ga odpre desni klik na telo. Luknja je prosojna, da vidiš, kje sedi. [[T]] naredi telo prosojno, na primer da pogledaš v ohišje; drugi pritisk ga spet naredi neprosojnega. Deluje na celoten izbor: če je katero telo že prosojno, postanejo vsa neprosojna, sicer vsa prosojna.

Dokler ni nič združeno v skupino, se z luknjo ne zgodi nič. Samo leži tam in kaže, kje naj pozneje nekaj odpade.

![Valj je luknja. Gleda iz kocke navzgor, da jo povsem prereže.](shot:hole-before)

## Združevanje v skupino

Označi telo in luknje ter klikni {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Zdaj luknje odvzamejo material telesom, ki se jih dotikajo. Ostane ena sama nova oblika.

![Rezultat: kocka z izvrtino.](shot:hole-after)

Tako nastanejo:

- **Izvrtine:** valj kot luknja skozi telo.
- **Utori:** podolgovat kvader kot luknja ob robu.
- **Žepi:** luknja, ki ne gre čisto skozi.
- **Navoji v delu:** navojna luknja kot luknja, glej [Navoji in mehanika](chapter:navoji-in-mehanika).

Če je v skupini več teles, se povežejo. Dve telesi, ki se dotikata, postaneta torej en sam del.

Pri velikih mrežah, na primer pri uvoženem STL s stotisoči trikotnikov, rez traja nekaj sekund. layerling potem dela v ozadju in kaže »{{ui:status.computing}}«; medtem lahko vrtiš pogled in uporabljaš vmesnik. Če v tem času spremeniš sceno, se rezultat zavrže in layerling ti to pove. Enako velja za {{ui:editor.tool.split}}.

Skupino smeš obravnavati naprej kot obliko: premikati, vrteti, barvati, spet združevati. Z {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) jo razdružiš in posamezni deli so spet tu.

### Skupino spremeniti v luknjo

Tudi cela skupina je lahko telo ali luknja. Pri tem velja preprosto pravilo:

- Če skupina vsebuje samo telesa (ali samo luknje), jo preklopiš kot celoto in njeni deli gredo zraven.
- Če vsebuje oboje, na primer kocko z izvrtino, vsak del obdrži svoje stanje. Cela skupina potem postane orodje, a izvrtina ostane izvrtina.

### Spreminjanje velikosti skupine: luknje in majhni deli ostanejo

Ko skupino podaljšaš, razširiš ali zvišaš, se njeni deli raztegnejo z njo, kot bi bili narisani na gumi: okrogle luknje v plošči postanejo ovalne in se pomaknejo navznoter. Da ostanejo take, kot so, v nastavitvah skupine pri {{ui:inspector.groupResize}} izberi {{ui:inspector.groupResizeKeepParts}}; brez te izbire velja {{ui:inspector.groupResizeStretch}}, kot doslej pri vsaki skupini. Odtlej se skupina ob vsaki spremembi velikosti - z ročaji, v poljih za mere ali s {{ui:scalePercent.title}} - znova sestavi iz svojih delov po enem samem pravilu, za vsako smer posebej:

- Del, ki sega skoraj čez vso skupino, devet desetin ali več, raste ali se krči z njo in ohrani razdaljo do obeh stranic: sama plošča, stena ali notranjost škatle, katere stene ostanejo enako debele.
- Vsak drug del ohrani svojo velikost in razdaljo do bližje stranice. Del na sredini ostane na sredini.

Plošča z luknjo 5 mm od vsakega vogala in utorom na sredini, podaljšana za 40 mm, tako obdrži luknje okrogle in 5 mm od vogalov ter utor na sredini. Za tem ni nobenega reševalnika omejitev in ničesar ti ni treba nastavljati del za delom: za vse dele velja isto pravilo, zato vnaprej veš, kaj se bo zgodilo. Zavrten del šteje s kvadrom, ki ga zavzema v skupini, in ostane zavrten; skupina v skupini šteje kot en del. Medtem ko vlečeš ročaj, se skupina raztegne kot celota; ko spustiš, se znova sestavi, v istem koraku razveljavitve. Če skupino zmanjšaš pod to, kar del s svojo razdaljo potrebuje, se ta del kot doslej skrči z njo in sporočilo te na to opozori. Zrcaljena, zožena ali zasukana skupina in skupina z lastnimi zaokrožitvami, posnetji ali teksturo vedno raztegne vse. Če nastavitev izbereš za skupino, ki je že raztegnjena, se njeni deli takoj znova razporedijo.

![Plošča z luknjo 5 mm od vsakega vogala in utorom na sredini, z izbiro »Ohrani luknje in majhne dele« podaljšana za 40 mm: luknje so še vedno okrogle in 5 mm od vogalov, utor je še vedno na sredini.](shot:group-keep-parts)

## Povezovanje v sveženj

Včasih naj deli samo ostanejo skupaj, ne da bi postali eno – na primer bel logotip na črni plošči za večbarvni tisk. Za to je {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), kot v Tinkercadu. Sveženj lahko premikaš, vrtiš in mu spreminjaš velikost kot obliki, a nič se ne izračuna:

- Vsak del obdrži svojo barvo in ostane telo ali luknja. Nastavitve svežnja imajo iste kartice kot skupina: {{ui:inspector.solid}} in {{ui:inspector.hole}} za cel sveženj (ki obdržita barve delov), {{ui:inspector.transparent}} ([[T]]) in {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); z izklopljeno večbarvnostjo se sveženj prikaže in izvozi v eni barvi. {{ui:inspector.separateParts}} sveženj razdre, kot [[Ctrl]]+[[Shift]]+[[G]].
- Luknje ne režejo.
- Pri izvozu kot STL, 3MF ali OBJ je vsak del svoje telo; v 3MF in OBJ s svojo barvo.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) sveženj spet razdruži, [[E]] ga odpre za urejanje kot skupino. Posnetja, zaokrožitve in izdolbljenje na svežnju ne gredo, ker ni eno samo telo: za to ga združi v skupino ali urejaj njegove dele posamezno. Če naj luknja v svežnju vseeno reže, sveženj združi v skupino (Ctrl+G).

## Presek

{{ui:editor.tool.intersect}} obdrži samo to, kar imata dve ali več teles skupnega. Položi dve prekrivajoči se obliki drugo čez drugo, označi obe in klikni nanj. Tako na primer iz valja in kvadra nastane kos z okroglo in ravno stranjo. Skupina pri tem šteje tako, kot izgleda, torej z izvrtinami. Če je označena tudi luknja, ostane to, kar imajo vsa telesa skupnega z vsemi luknjami.

{{ui:editor.tool.hull}} ovije izbrane oblike v eno konveksno telo, kot bi jih zavil v skrčljivo folijo: najmanjše telo brez vdolbin, ki jih vse zajame. Polkrogla na valju postane kupola brez stopnice, štirje valji v vogalih škatla z zaobljenimi vogali, dve krogli kapsula. Luknje v izboru se iz ovojnice izrežejo potem. Deli ostanejo v njej: {{ui:group.edit}} odpre ovojnico kot skupino, premik dela v njej in zaprtje pa ovojnico zgradi na novo. Ovojnica je mreža, zato so na okroglih oblikah vidne ploskvice, orodja za robove pa z njo delajo kot z vsako mrežo. Če so izbrane samo luknje, je ovojnica sama luknja: dve valjasti luknji izrežeta režo.

{{ui:editor.tool.cookieCutter}} naredi iz izbora modelček za piškote: tanko steno okoli obrisa, visoko 15 mm, in raven rob 2 mm okoli njenega vznožja, tako da modelček stoji na robu in ima palec na kaj pritisniti. Izberi en uvožen SVG ali eno telo iz skice in uporabi se njegov lastni obris. Ležeče besedilo da lastne krivulje svojih črk. Vsaka druga oblika, sestavljena, uvožena mreža ali več delov, da tisto, na čemer stoji: obris, ki ga delovna ravnina prereže skozi njo, zato jo najprej postavi na delovno ravnino. Deli, ki se prekrivajo, dajo en obris okoli vseh, kot bi bili združeni v skupino; ločeni deli dajo vsak svoj modelček v istem svežnju. Obris se zrcali z leve na desno: modelček se natisne stoječ na robu in se za rezanje obrne, tako da besedilo ali logotip pride na testo pravilno obrnjen. Vrh stene se zoži v rezilni rob, širok 0,4 mm. Luknje v obrisu, notranjost črke e ali a, dobijo lastne stene, tako da se tudi izrežejo iz piškota. So lastno telo v svežnju, {{ui:cookieCutter.part.innerWalls}}: če naj se besedilo ali vzorec v testo le vtisne namesto izreže, jih v Lastnostih naredi nižje. S steno 15 mm in testom debeline 5 mm notranje stene 12 mm vtisnejo 2 mm globoko. Notranje stene, nižje od zunanje, imajo namesto rezilnega roba raven vrh: samo pritiskajo, rob pa bi pustil tanke konice, ki se odlomijo, in žlebove, v katerih se ujame testo. Če želiš rob, jim ga daj v Lastnostih. Dva mostička ob robu, na strani, na katero pritiska roka, držita vsako notranjo steno ob steni okoli nje, razporejena naokoli, široka 4 mm in visoka 3 mm. Vsak mostiček stoji s celo širino na stenah, na sredini stranice, ki teče vzdolž obrisa, in nikoli čez drug del. Deli drug ob drugem, na primer črke imena, se povežejo tudi med sabo, najbližji najprej, tako da mostički tečejo kot mreža skozi vse in je držana tudi črka sredi besede. Klik na orodje odpre majhno okno: tam namesto mostičkov izbereš {{ui:cookieCutter.support.plate}}, ki zapolni cel obris na strani, kjer pritiskaš, je stabilnejša in se bolje drži tiskalne plošče, a ne dovoli več iztisniti testa od zadaj. {{ui:cookieCutter.fillet}} doda majhne naklone 45° tam, kjer stene stojijo na robu, mostičkih ali plošči, da se tanki deli, kot pika nad i, ne odlomijo; so lastno telo v svežnju. Tam nastaviš tudi, za koliko so notranje stene nižje in ali se obris zrcali; vrednosti ostanejo za naslednji modelček. Njihovo višino spreminjaj v Lastnostih kot višino roba. Modelček nadomesti izbor s svežnjem teles iz skice, {{ui:group.edit}} ga odpre. Stena, notranje stene in rob so načini polnila skice, črta zunaj silhuete: debelino, višino ali barvo vsakega spreminjaj v Lastnostih, tam tudi {{ui:prop.sketchCuttingEdge}} stene (0 za raven vrh). Kjer ostra krivina ne pusti prostora za posnetje z obeh strani, se stena posname samo zunaj, do istega roba. Kjer obrisa sploh ni mogoče posneti - logotip z ostrimi konicami, obris, izrezan iz trikotnikov telesa -, se rob namesto tega zgradi v drobnih stopnicah po 0,1 mm, ki jih tiskalna plast 0,2 mm ne loči od naklona; taka stena je mreža trikotnikov, ne natančno telo. Če želiš obris ohraniti, kot je narisan, modelček zrcali nazaj z {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Deluje tudi slika PNG ali JPG: ob uvozu se obriše v telo iz skice in modelček sledi temu.

{{ui:editor.tool.loftSketches}} poveže dve telesi iz skice ali uvožena SVG v eno telo: obris spodnjega spodaj, obris zgornjega zgoraj, z ravnimi stenami vmes. Tako nastane lijak, prehodni kos iz kvadrata v krog ali okvir, ki se navzgor oži. Postavi telesi drugo nad drugo, kamor spadata, premaknjeni in zavrteni, kot želiš, izberi obe in klikni orodje. Loft sega od dna spodnjega telesa do vrha zgornjega.

## Izrezovanje enega telesa iz drugega

Pri delih, ki morajo ustrezati drug drugemu, gred v puši ali vijak v ohišju, naredite en del in ga izrežete iz drugega. Izberite obe telesi in kliknite {{ui:editor.tool.cutOut}} v območju {{ui:editor.group.combine}} ali kliknite z desno tipko in ga izberite tam. Okno navede del, ki ostane, in telo, ki dobi votlino; layerling vzame manjše telo za del, {{ui:cutOut.swap}} pa ju zamenja. {{ui:cutOut.clearance}} naredi votlino okoli dela toliko večjo: 0 ustreza natančno, 0,2 mm je običajna zračnost za natisnjeno ujemanje. {{ui:cutOut.apply}} izreže kopijo dela iz drugega telesa in pusti sam del tam, kjer je. Rezultat je skupina: {{ui:editor.tool.ungroup}} rez spet razstavi. Zračnost zahteva, da je del natančno telo, kot pri orodju {{ui:editor.tool.offset}}, ki se uporablja za to.

## Izsekovanje obrisa skozi telo

Če želiš izrezati obris enega telesa naravnost skozi drugo, najprej izberi pečat, nato telo za izsekanje, in klikni {{ui:editor.tool.punch}} v območju {{ui:editor.group.combine}} ali ga izberi z desnim klikom. Telesi se ne rabita dotikati: pečat lahko stoji kjer koli pred telesom, šteje le njegov obris, gledan v smeri ({{ui:punch.axis}}). Čajnik nad ploščo tako v njej pusti odprtino v obliki čajnika. layerling začne z osjo, vzdolž katere pečat stoji najdlje od telesa; X poteka od leve proti desni, Y od spredaj nazaj, Z navzgor. {{ui:punch.swap}} zamenja vlogi, {{ui:punch.clearance}} pa odprtino naokoli poveča, 0,2 mm za natisnjen del, ki mora iti skozi. {{ui:punch.apply}} združi odprtino s telesom kot natančno telo skice, nastavljeno kot luknja, zato jo {{ui:editor.tool.ungroup}} spet odstrani; pečat ostane, kjer je. Premakni ali zavrti ga in izsekaj znova za drugo odprtino.

## Urejanje skupine

Če je izvrtina ratala premajhna, skupine ni treba razdružiti in zgraditi znova. Izberi skupino in v njenih nastavitvah klikni {{ui:group.edit}}, v seznamu objektov ikono mape, ali pritisni [[E]]. Dvoklik na skupino naredi isto, kot v Tinkercadu, tudi pri svežnju; kdor tega ne mara, izklopi {{ui:workspace.doubleClickOpensGroup}} v nastavitvah. Del se sicer premakne šele, ko je kazalec potegnjen nekaj pikslov daleč, tako da nespretni klik ali dvoklik nič ne premakne. Deli zdaj ležijo posamezno in jih spreminjaš z vsemi orodji: luknjo povečaš, telo premakneš, luknjo dodaš.

![Skupina v urejanju: spodaj je vrstica z Prekliči in Končano, seznam objektov kaže dele.](shot:open-group)

Spodaj v sliki se pokaže vrstica. {{ui:group.done}} skupino ponovno izračuna, z njenim imenom, barvo in stanjem kot telo ali luknja. {{ui:common.cancel}} jo vrne nespremenjeno.

Če je eden od delov sam skupina, ga urejaš prav tako, in tako naprej, tako globoko, kot sega tvoj načrt. Vrstica kaže, kje si, na primer »Držalo › Vijačni steber«. {{ui:group.done}} in {{ui:common.cancel}} vedno zaključita najnotranjejšo skupino in te vrneta eno raven nazaj. Dokler si v skupini, lahko urejaš samo skupine pod njenimi deli; za drugo najprej zaključi.

Za razliko od {{ui:editor.tool.ungroup}}, ki skupino dokončno razpusti, urejanje skupino ohrani: ime in nastavitve ostanejo, z {{ui:common.cancel}} pa se lahko kadarkoli vrneš.

Opomba: posnetja in zaokrožitve, ki si jih položil na **celotno** skupino, se pri ponovnem izračunu izgubijo. Na to opozori vrstica.

## Rezanje

{{ui:editor.tool.split}} v področju {{ui:editor.group.modify}} razreže izbor z ravnino na dva dela – na primer del, ki je prevelik za tiskalno posteljo, ali takega, v katerega želiš pogledati. Označi eno ali več teles ali lukenj in klikni nanj. Prosojna ravnina kaže natanko, kje je rez; spremeni se šele, ko ga uporabiš.

- {{ui:split.orientation}}: **X** reže navpično med levo in desno, **Y** med spredaj in zadaj, **Z** vodoravno med zgoraj in spodaj. Osi se imenujejo kot v kartici lege, Z kaže navzgor; ravnina se začne z Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} položi ravnino vzporedno z delovno ravnino, {{ui:split.workplaneAcrossX}} in {{ui:split.workplaneAcrossY}} jo postavita pravokotno nanjo, prečno na njeno smer X ali Y. Če izhodišče delovne ravnine seka izbor, gre ravnina skozenj, sicer skozi sredino. Tako z [[W]] postaviš delovno ravnino na poševno ploskev in režeš natanko tam, brez vrtenja drsnikov.
- {{ui:split.position}}: kje gre ravnina skozi, z drsnikom ali kot številka. Začne se na sredini. Lahko tudi povlečeš puščično konico na ravnini; ravnina se potem premika po korakih po 0,1 mm vzdolž puščice.
- {{ui:split.pickFace}}, gumb ob legi, položi ravnino na ploskev: klikni nanj in nato na ploskev. Smer, oba zasuka in lega se nastavijo ustrezno. Medtem ko izbiraš, modra ravnina pod kazalcem kaže, katero ploskev prevzame. Gre tudi ploskev neoznačenega telesa, da po njej poravnaš rez – ravnina pa ostane znotraj izbora. [[Esc]] konča izbiranje in pusti ravnino, kjer je bila.
- Dva vrtljiva drsnika spodaj vrtita ravnino okoli drugih dveh osi, do 180° v vsako smer, za poševen rez. Lahko ju kombiniraš.

{{ui:split.apply}} ali [[Enter]] razreže, [[Esc]] prekine (pri izbiranju ploskve prvi [[Esc]] konča samo izbiranje). Vsak predmet, skozi katerega gre ravnina, postane dve zaprti telesi, poimenovani po svoji strani, na primer »Kvader (Z+)« in »Kvader (Z-)«; predmeti, ki jih zgreši, ostanejo, kot so. Iz luknje nastaneta dve luknji, izdolbeno telo pa obdrži svojo votlino. Obe polovici ostaneta, kjer sta bili – za tisk vsako z {{ui:editor.tool.layFlat}} položiš na njeno ploskev reza.

{{ui:split.connectors}} spet poravnajo polovici, kot to delajo orodja za rez v PrusaSlicerju, OrcaSlicerju in Bambu Studiu. Z možnostjo {{ui:split.connectors.none}}, ki je privzeta, se razdeli, kot je opisano zgoraj. {{ui:split.connectors.dowels}} naredi luknjo v vsaki polovici in ločene moznike, ki gredo v obe: mozniki pridejo kot tretje telo, ki stoji poleg polovic na njunem dnu, da jih natisneš z njima – stoje so v plasteh okrogli kot njihove luknje, in prav to meri preizkus ujemanja. {{ui:split.connectors.plugs}} postavi okrogle čepe na polovico, katere ime se konča z minusom, luknje zanje pa naredi v drugi polovici. Spojniki gredo noter pravokotno na ravnino, kakorkoli je zasukana, vsak s svojim premerom in 1,2 mm materiala do vsakega roba ploskve reza, dva pa dvakrat toliko narazen. Vsak ločen kos ploskve reza dobi svoje, enakomerno razporejene po njem: {{ui:split.connectorCount}} pove, koliko, 0 pa to prepusti velikosti kosa, vsaj dva. Kos, ki je premajhen za enega, ne dobi nobenega, spojnik pa izpade tam, kjer je polovica tanjša, kot je njegova luknja globoka; plošča to pove, preden razdeliš, beli obročki na ravnini pa kažejo, kam pridejo. Če ne gre noben, se deli razdelijo brez njih, in vrstica stanja to pove.

- {{ui:split.connectorDiameter}} je premer moznikov in čepov, na začetku 5 mm.
- {{ui:split.connectorDepth}} pove, kako globoko gre vsaka luknja v svojo polovico. Moznik je dvakrat toliko dolg manj 0,6 mm, čep pa 0,3 mm krajši od svoje luknje, da nikoli ne stojita na dnu luknje in se polovici povsem zapreta. Mozniki in čepi imajo na koncih majhno posnetje, vsaka luknja pa ga ima ob ustju, da je razlezena prva plast ne zoži.
- {{ui:split.connectorClearance}} je prostor med moznikom ali čepom in njegovo luknjo. Ko izmeriš zračnost svojega tiskalnika s preizkusom ujemanja (v poglavju o tiskanju), se začne z njo, sicer z 0,2 mm.

Oblike, ki so luknje, se razdelijo brez spojnikov.

Polovici sta preprosti mreži: nastavitve, kot je število stranic valja ali črke besedila, se izgubijo, zato jih nastavi prej. [[Ctrl]]+[[Z]] vrne original v enem koraku. Zaklenjenih in skritih predmetov ni mogoče razrezati.

## Ločevanje delov

Če oblika sestoji iz več med seboj ločenih kosov, na primer besedilo iz posameznih črk, jo lahko z {{ui:inspector.separateParts}} razstaviš v samostojne oblike. Ukaz je tudi v meniju, ki se odpre z desnim klikom na obliko.

> **Namig:** Luknje vedno naredi malo daljše od dela, ki naj ga prebodejo. Če luknja zaključi natanko s ploskvijo, včasih ostane čisto tanka kožica. En milimeter preseka da varnost.
