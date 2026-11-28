---
title: Pogosta vprašanja
summary: Kratki odgovori na najpogostejša vprašanja o shranjevanju, velikih modelih, zaokrožitvah, umetni inteligenci in tiskanju, vsak s potjo do podrobne razlage.
contents: questions
---

Vsak odgovor je kratek in na koncu pove, kje v tem priročniku je vse podrobno razloženo. Iskalno polje zgoraj najde vprašanje po katerikoli besedi v njem.

## Shranjevanje in varnostne kopije

### Kje so shranjeni moji načrti in ali obstaja oblak?

V brskalniku na tvojem računalniku. Ni računa in ni oblaka, nič se ne nalaga na splet, vsaka sprememba pa se shrani sama. Kdor layerling poganja na lastnem strežniku, lahko načrte hrani tudi tam v skupni mapi.

Več: [Kje ležijo tvoji načrti](chapter:datoteke-in-shranjevanje#kje-lezijo-tvoji-nacrti)

### Mojih načrtov ni več. Kaj se je zgodilo?

Načrti so shranjeni v enem brskalniku na enem računalniku. Izginejo, če se podatki brskalnika za to stran izbrišejo, in v drugem brskalniku ali na drugem računalniku jih ne vidiš. Safari na Macu, iPhonu in iPadu izbriše podatke strani po sedmih dneh brez obiska, razen če je layerling nameščen kot aplikacija. Če imaš varnostno kopijo, jih {{ui:dashboard.restoreBackup}} na začetni strani vrne skupaj z mapami in slikami.

Več: [Vaši projekti, vaša varnostna kopija](chapter:datoteke-in-shranjevanje#vasi-projekti-vasa-varnostna-kopija)

### Kako varnostno kopiram vse, tudi samodejno v mapo?

{{ui:dashboard.backupAll}} na začetni strani spakira vse načrte v eno datoteko ZIP. Poleg tega layerling sam hrani prejšnje različice vsakega načrta, v Chromu in Edgeu pa lahko vsako od njih zapiše kot datoteko .lyl v mapo, ki jo izbereš. Različice v brskalniku izginejo skupaj s podatki brskalnika, zato ne nadomestijo ne datoteke ZIP ne mape.

Več: [Prejšnje različice](chapter:datoteke-in-shranjevanje#prejsnje-razlicice)

### Kako prenesem načrt na drug računalnik ali v drug brskalnik?

V oknu za izvoz ga shrani kot datoteko .lyl in to datoteko na drugem računalniku odpri z začetne strani. Za vse načrte naenkrat uporabi tukaj {{ui:dashboard.backupAll}} in tam {{ui:dashboard.restoreBackup}}; načrti, ki so že tam, se ne dodajo še enkrat.

Več: [Varnostno kopiranje in deljenje](chapter:datoteke-in-shranjevanje#varnostno-kopiranje-in-deljenje)

### Kaj se zgodi, če izbrišem podatke brskalnika?

Načrti, shranjeni v tem brskalniku, se izbrišejo, prav tako prejšnje različice, ki jih je layerling tam hranil. Datoteka ZIP iz {{ui:dashboard.backupAll}}, tvoje datoteke .lyl in mapa z varnostnimi kopijami na disku ostanejo nedotaknjene. Najprej naredi kopijo, nato briši.

Več: [Vaši projekti, vaša varnostna kopija](chapter:datoteke-in-shranjevanje#vasi-projekti-vasa-varnostna-kopija)

### Kako se vrnem na prejšnje stanje?

Razveljavitev gre nazaj korak za korakom. Pogled zgodovine z drsnikom pokaže vsak korak, ne da bi spremenil načrt, in iz kateregakoli lahko naredi nov načrt. Za stanje od danes zjutraj ali iz prejšnjega tedna seznam prejšnjih različic odpre staro različico kot nov načrt, trenutni pa ostane, kakršen je.

Več: [Pogled nazaj: pogled zgodovine](chapter:izbiranje-in-razporejanje#pogled-nazaj-pogled-zgodovine) in [Prejšnje različice](chapter:datoteke-in-shranjevanje#prejsnje-razlicice)

### Ali lahko gresta STL in 3MF naravnost v mapo mojega projekta? In kako spet dobim navaden prenos?

V Chromu in Edgeu prvi izvoz načrta vpraša, kam naj shrani, poznejši izvozi pa brez vprašanja pišejo v isto datoteko. Firefox in Safari vedno prenašata. Če želiš vsakič prenos, v nastavitvah vklopi {{ui:workspace.stlAsDownload}}.

Več: [Izvoz](chapter:datoteke-in-shranjevanje#izvoz)

### Okno za shranjevanje se je zaprlo, datoteke pa ni. Zakaj?

Okna, ki ga brskalnik ni mogel uporabiti, ne loči od okna, ki ga prekličeš. Prav tako ni mogoče zapisati datoteke, ki jo blokira protivirusni program. Sporočilo na vrhu takrat ponudi {{ui:status.saveAsDownload}}, kar datoteko shrani med prenose. Če želiš okno povsem preskočiti, v nastavitvah vklopi {{ui:workspace.lylAsDownload}} in {{ui:workspace.stlAsDownload}}.

Več: [Varnostno kopiranje in deljenje](chapter:datoteke-in-shranjevanje#varnostno-kopiranje-in-deljenje)

## Namestitev in posodobitve

### Ali obstaja aplikacija za prenos?

layerling se namesti iz brskalnika: potem ima svojo ikono in svoje okno ter se zažene brez omrežja. Namestitvenega programa za prenos ni, izvirnik pa je samo na layerling.com. **Ne prenašaj in ne zaganjaj namestitvenega programa »layerling« z nobene druge strani:** ne prihaja od layerlinga in lahko vsebuje zlonamerno programsko opremo. Za lastno kopijo sta na voljo hitri začetek za Windows in slika Docker.

Več: [Namestitev kot aplikacije](chapter:offline-in-namestitev#namestitev-kot-aplikacije) in [Lastno upravljanje](chapter:offline-in-namestitev#lastno-upravljanje)

### Ali layerling deluje brez interneta?

Da, po prvem obisku se zažene brez omrežja, najbolje nameščen kot aplikacija. Ena stvar se naloži šele, ko je prvič potrebna: jedro CAD za prvi izvoz STEP, približno 22 MB.

Več: [Namestitev kot aplikacije](chapter:offline-in-namestitev#namestitev-kot-aplikacije)

### Kako dobim posodobitev?

Sama pride. Odprta stran opazi novo različico in pokaže kartico z novostmi; {{ui:newVersion.reload}} najprej shrani odprt načrt in nato naloži novo različico. Novejšo različico pokaže tudi začetna stran.

Več: [Posodobitve](chapter:offline-in-namestitev#posodobitve)

### Kateri brskalniki in tablice delujejo?

Chrome, Edge, Firefox in Safari, na računalniku, tablici ali telefonu; 3D-pogled potrebuje WebGL. Nekaj stvari zmoreta samo Chrome in Edge: pisanje v tvoje datoteke in mape, mapo za varnostne kopije in odpiranje datotek .lyl z dvoklikom. Na tablici prst naredi to, kar sicer leva miškina tipka.

Več: [Prsti in pisalo](chapter:tablica-in-dotik#prsti-in-pisalo)

## Umetna inteligenca

### Kako najlažje nastavim umetno inteligenco?

Umetni inteligenci, ki lahko dela na tvojem računalniku, daj naslov `https://github.com/henmedia/layerling` in jo prosi, naj zate nastavi layerling z njegovim strežnikom MCP. Za to potrebuje program, na primer zavihek Code v aplikaciji Claude, Claude Code, Codex, Antigravity ali Gemini CLI. Za Windows in Mac so v priročniku tudi posamezni koraki.

Več: [Korak za korakom za začetnike](chapter:ai-z-mcp#korak-za-korakom-za-zacetnike)

### Zakaj umetna inteligenca ne pride do layerling.com?

Most med umetno inteligenco in urejevalnikom obstaja samo v kopiji layerlinga, ki teče na tvojem računalniku. Na layerling.com je vedno izklopljen, klepet v brskalniku pa ne more ničesar namestiti. Umetna inteligenca torej potrebuje lokalno zagnan layerling in program, ki zna MCP.

Več: [Nastavitev](chapter:ai-z-mcp#nastavitev)

### Katera umetna inteligenca deluje in koliko stane?

Vsak program, ki zna MCP; priročnik opisuje Claude, Codex, Gemini in Antigravity. Sam layerling ne stane nič. Koliko stane umetna inteligenca, določa njen ponudnik: zavihek Code v aplikaciji Claude je na primer del plačljivih naročnin Claude.

Več: [Nastavitev](chapter:ai-z-mcp#nastavitev)

### Kateri podatki gredo ponudniku umetne inteligence?

To, kar umetna inteligenca bere: predmeti odprtega načrta in slike pogleda, ki jih posname. To gre ponudniku tvojega programa z umetno inteligenco tako kot vse drugo, kar tja vpišeš. Sam most teče na tvojem računalniku in brez umetne inteligence ga nič ne zapusti.

Več: [Kaj zna umetna inteligenca](chapter:ai-z-mcp#kaj-zna-umetna-inteligenca)

## Pomnilnik, hitrost in zgodovina

### Zakaj layerling z mojo datoteko STL postane počasen?

STL je mreža iz trikotnikov in zelo velika mreža upočasni urejevalnik, zasede veliko pomnilnika in upočasni shranjevanje. layerling to po uvozu pove od 400.000 trikotnikov v eni mreži ali od milijona v celotnem načrtu. Najprej poenostavi mrežo, uvozi samo dele, ki jih potrebuješ, ali del zgradi iz layerlingovih lastnih oblik.

Več: [Velike mreže](chapter:datoteke-in-shranjevanje#velike-mreze)

### Zakaj v moji zgodovini manjkajo koraki?

Skrajšata jo dve stvari. Nastavitev {{ui:workspace.savedHistory}} ohrani 100 korakov na načrt, dokler je ne spremeniš, starejši pa se zavržejo. Če je načrt prevelik, da bi se shranil s celotno zgodovino, ga layerling shrani s polovico korakov, nato spet s polovico, in ti to pove. Sam načrt se vedno shrani v celoti.

Več: [Shranjena zgodovina](chapter:pogled-in-delovna-ravnina#shranjena-zgodovina)

### Kaj naredim, ko je shramba brskalnika polna?

Zavihka ne zapiraj in ga ne nalagaj znova: tvoje najnovejše spremembe so samo v njem. Najprej si shrani kopijo z izvozom v .lyl. Nato naredi prostor: izbriši korake v pogledu zgodovine, odstrani načrte, ki jih ne potrebuješ več, ali jih varnostno kopiraj in izbriši.

Več: [Vaši projekti, vaša varnostna kopija](chapter:datoteke-in-shranjevanje#vasi-projekti-vasa-varnostna-kopija)

### Moj načrt je prevelik za shranjevanje. Kaj zdaj?

Njegova zgodovina in mreže skupaj zasedejo preveč prostora. Preden layerling to sporoči, je že poskusil z manj koraki zgodovine. Izbriši zgodovino v pogledu zgodovine, poenostavi najtežje uvožene mreže ali shrani .lyl samo s trenutnim stanjem.

Več: [Varnostno kopiranje in deljenje](chapter:datoteke-in-shranjevanje#varnostno-kopiranje-in-deljenje) in [Poenostavitev uvožene mreže](chapter:datoteke-in-shranjevanje#poenostavitev-uvozene-mreze)

### Brskalniku zmanjkuje pomnilnika. Kaj pomaga?

To se zgodi pri mrežah z milijoni trikotnikov, ko en korak potrebuje več pomnilnika, kot ga dobi zavihek brskalnika. Zmanjšaj število trikotnikov uvoženih mrež z orodjem {{ui:editor.tool.simplify}}, zapri druge zavihke in poskusi znova. Če se to zgodi pri shranjevanju, pomaga tudi krajša zgodovina.

Več: [Velike mreže](chapter:datoteke-in-shranjevanje#velike-mreze)

### Načrt se odpira zelo počasi ali sploh ne. Kaj lahko naredim?

Večinoma je zelo narasla njegova zgodovina korakov za razveljavitev. {{ui:dashboard.openWithoutHistory}} v meniju načrta na začetni strani prebere samo trenutno stanje; prejšnje korake pri tem za vedno izbriše, zato načrt prej varnostno kopiraj, če jih želiš ohraniti. Prejšnja različica iz varnostnih kopij se odpre kot nov načrt.

Več: [Varnostno kopiranje in deljenje](chapter:datoteke-in-shranjevanje#varnostno-kopiranje-in-deljenje)

### layerling se zatika. Katere nastavitve pomagajo?

{{ui:workspace.fastMode}} v nastavitvah izklopi sence, robne črte na vseh telesih in vztrajnost kamere ter pogled riše samo v ločljivosti zaslona. Preveri, ali brskalnik uporablja grafično kartico: na strani `chrome://gpu` ali `edge://gpu` bi moralo pri WebGL pisati »Hardware accelerated«. Drug pogost vzrok so velike uvožene mreže.

Več: [Kadar se layerling zdi počasen](chapter:pogled-in-delovna-ravnina#kadar-se-layerling-zdi-pocasen)

### Urejevalnik stoji ali dolgo računa. Naj počakam ali naložim znova?

Najprej počakaj. Rezi, skupine in delo z robovi se računajo v ozadju, med tem pa je prikazano {{ui:status.computing}}; dolga opravila, kot je izdolbljenje, se sama ustavijo s sporočilom in ničesar ne spremenijo. Če je bilo treba jedro CAD zagnati znova, to pove sporočilo in strani ni treba nalagati znova. Ponovno nalaganje je varno, ker se vsaka sprememba shrani sama, z eno izjemo: dokler je prikazano rdeče opozorilo {{ui:notice.designNotSavedTitle}}, najprej izvozi .lyl.

Več: [Kadar se layerling zdi počasen](chapter:pogled-in-delovna-ravnina#kadar-se-layerling-zdi-pocasen)

### 3D-pogled ostane prazen ali sporočilo pravi, da se ni mogel zagnati. Kaj zdaj?

Brskalnik ni mogel zagnati WebGL, ki riše 3D-pogled. Vzrok je v brskalniku ali gonilniku grafične kartice, ne v tvojem načrtu, in tvoji shranjeni načrti se ne izbrišejo. Zapri druge zavihke s 3D-vsebino in znova zaženi brskalnik, vklopi strojno pospeševanje, dovoli WebGL, če ga blokira nastavitev zasebnosti ali razširitev, ter posodobi brskalnik in gonilnik grafične kartice. Hiter preizkus je drug brskalnik.

Več: [Kadar se layerling zdi počasen](chapter:pogled-in-delovna-ravnina#kadar-se-layerling-zdi-pocasen)

## Uvoženi modeli

### »Poenostavi mrežo« ali »Naredi natančno«: kaj izbrati?

{{ui:editor.tool.simplify}} ohrani le delež trikotnikov, zato težak model postane lažji; ostane mreža. {{ui:editor.tool.makeExact}} model iz ravnin, valjev, stožcev in krogel znova zgradi kot pravo telo CAD, tako da zaokrožitve in posnetja sledijo čistim robovom, izvoz STEP pa vsebuje prave ploskve. Sprejme do 400.000 trikotnikov; figura ali sken ostane mreža. Pri velikem tehničnem delu: najprej poenostavi z vklopljenim {{ui:simplify.keepEdges}}, nato ga naredi natančnega.

Več: [Poenostavitev uvožene mreže](chapter:datoteke-in-shranjevanje#poenostavitev-uvozene-mreze) in [Uvoženo mrežo naredi natančno](chapter:datoteke-in-shranjevanje#uvozeno-mrezo-naredi-natancno)

### Zakaj rez ne uspe ali zakaj moja mreža »ni vodotesna«?

Telo je mogoče rezati le, če je njegova površina zaprta. Če ima uvožena mreža vrzeli, layerling pove ime dela in število odprtih robov ter ga izpusti. Majhne luknje zapre sam; večje je treba popraviti v programu, iz katerega model prihaja, ali v orodju za popravljanje mrež. Preverjanje tiska pokaže, katero telo je odprto.

Več: [Preverjanje tiska](chapter:tiskanje#preverjanje-tiska)

### Kako pravilno uvozim SVG?

SVG pride v načrt kot telo iz skice, visoko 4 mm, njegove točke pa lahko spreminjaš v skicirnem načinu. Pred uvozom v oknu za uvoz vpiši širino v milimetrih; brez številke ohrani svojo velikost. Obrisi, ki se križajo sami s seboj, ne morejo postati telo, zato so izpuščeni in prešteti: v risarskem programu združi prekrivajoče se kose, zapri obrise in uvozi znova.

Več: [Uvoz](chapter:datoteke-in-shranjevanje#uvoz)

## Zaokrožitve in posnetja

### Zakaj zaokrožitve ni mogoče uporabiti?

Večinoma je za to mesto prevelika: segla bi v sosednje ploskve ali pa se rob krivi tesneje, kot je polmer. Pogosto zadošča milimeter ali dva manj, pri ostrih kotih pa zaokrožitev potrebuje več prostora, kot bi sklepal po polmeru. Če robov ni mogoče zaokrožiti skupaj, jih vzemi manj naenkrat; rob, ki je v napoto, je narisan rdeče. {{ui:edge.findLargest}} poišče velikost namesto tebe.

Več: [Posnetje in zaokrožitev robov](chapter:robovi-in-izdolbljenje#posnetje-in-zaokrozitev-robov)

### Zakaj so po spremembi skice moje zaokrožitve izginile?

Po {{ui:inspector.editSketch}} se telo zgradi na novo in ima nove robove. layerling zaokrožitve in posnetja znova nanese na robove, ki ležijo tam, kjer so ležali stari, če ima telo toliko robov kot prej. Z enim vogalom več ali manj se izpustijo, sporočilo pa pove, koliko jih je. Razveljavitev vrne vse.

Več: [Iz tega narediti telo](chapter:skice#iz-tega-narediti-telo)

### Zakaj nekaterih robov uvoženega modela ne morem izbrati?

STL, OBJ in 3MF prinesejo samo trikotnike, orodja za robove pa delujejo na mrežah do 4.000 trikotnikov. {{ui:editor.tool.makeExact}} tehnični del spremeni v pravo telo CAD, na katerem ima izvrtina en okrogel rob, ki mu zaokrožitev lahko sledi. Datoteka STEP prinese natančno geometrijo že od začetka.

Več: [Uvoženo mrežo naredi natančno](chapter:datoteke-in-shranjevanje#uvozeno-mrezo-naredi-natancno)

## Skupine, luknje in mere

### Zakaj luknje postanejo ovalne, ko raztegnem skupino?

Skupina, ki ji spremeniš velikost, raztegne vse v sebi, kot bi bilo narisano na gumi. V nastavitvah skupine pri {{ui:inspector.groupResize}} izberi {{ui:inspector.groupResizeKeepParts}}: deli, ki segajo čez vso skupino, se raztegnejo, luknje in majhni deli pa ohranijo svojo velikost in razdaljo do bližje strani.

Več: [Spreminjanje velikosti skupine: luknje in majhni deli ostanejo](chapter:telesa-in-luknje#spreminjanje-velikosti-skupine-luknje-in-majhni-deli-ostanejo)

### Zakaj združevanje v skupino ne uspe ali zakaj ima rezultat vrzeli?

Bodisi kateri od delov ni zaprt, kar sporočilo imenuje, bodisi se dva dela skoraj srečata, a se v resnici ne dotikata. Razdruži skupino, dele natančno poravnaj ali nekoliko spremeni velikost ali položaj in jih znova združi. Zelo goste mreže nad mejo za rezanje uvoženih mrež se sploh ne spojijo.

Več: [Združevanje v skupino](chapter:telesa-in-luknje#zdruzevanje-v-skupino)

### Kako spremenim en del znotraj skupine?

Izberi skupino in pritisni [[E]] ali jo dvoklikni. Deli takrat ležijo ločeno in jih lahko spreminjaš; ko končaš, se skupina zgradi znova. Zaokrožitve in posnetja, ki so bila na celi skupini, se pri ponovni gradnji izgubijo.

Več: [Urejanje skupine](chapter:telesa-in-luknje#urejanje-skupine)

### Kako dobim nazaj en del iz prejšnjega stanja?

Odpri pogled zgodovine, premakni drsnik na stanje, v katerem je del še bil, klikni del in izberi {{ui:historyView.bringBack}}. V trenutnem načrtu se pojavi kopija, takšna, kot je bila, in tam, kjer je bila, s časom v imenu.

Več: [Pogled nazaj: pogled zgodovine](chapter:izbiranje-in-razporejanje#pogled-nazaj-pogled-zgodovine)

## Tiskanje in izvoz

### STL, 3MF, OBJ ali STEP: kaj izbrati?

Za tiskalnik 3MF ali STL. 3MF ohrani vsako telo kot del z imenom in barvo; STL je ena mreža v eni barvi. Tudi OBJ prenese barve. STEP je za druge programe CAD: vsebuje natančno geometrijo z zaokrožitvami in posnetji.

Več: [Izvoz](chapter:datoteke-in-shranjevanje#izvoz)

### Kako spravim svoje barve v rezalnik?

Izvozi 3MF. Vsako telo ohrani svojo barvo, telo, pobarvano z več barvami, pa ima barve na svojih ploskvah. Bambu Studio in OrcaSlicer ob odpiranju vprašata, kako se barve ujemajo s tvojimi filamenti.

Več: [Barvanje v več barvah](chapter:oblike#barvanje-v-vec-barvah)

### Moji deli se ne prilegajo drug v drugega. Koliko zračnosti potrebujejo?

Običajno od 0,2 do 0,4 mm, odvisno od tiskalnika. Izmeri jo preizkus ujemanja: natisni majhno ploščo s sedmimi luknjami, poišči najtesnejšo luknjo, v kateri se zatič še vrti, in to vrednost vpiši kot zračnost svojega tiskalnika. Novi pokrovi, lastovičji repi in navoji potem izhajajo iz nje.

Več: [Zračnost tvojega tiskalnika: preizkus ujemanja](chapter:tiskanje#zracnost-tvojega-tiskalnika-preizkus-ujemanja)

### Zakaj layerling pravi, da del ne gre v tiskalnik?

Del sega čez rob plošče ali je višji, kot lahko natisne izbrani tiskalnik. To je samo namig in ga lahko zapreš. V nastavitvah izberi svoj tiskalnik ali prevelik del razreži z orodjem {{ui:editor.tool.split}}.

Več: [Kadar kaj ne ustreza](chapter:tiskanje#kadar-kaj-ne-ustreza)

## O programu layerling

### Ali je layerling brezplačen in ali smem prodajati, kar v njem oblikujem?

layerling je prosta programska oprema pod licenco AGPL-3.0, brez računa. Licenca se nanaša na program: kdor layerling spremeni in ga drugim ponuja prek omrežja, mora ponuditi tudi izvorno kodo. Za modele, ki jih narediš, ne postavlja nobenih pogojev. Pisave in modeli, ki jih uvoziš, ohranijo svoje licence. Če želiš podpreti projekt, [majhna donacija](https://layerling.com/support.html?lang=sl) pomaga pri stroških strežnika in razvoja. Je prostovoljna in nič v layerlingu ni odvisno od nje.

Več: [Lastno upravljanje](chapter:offline-in-namestitev#lastno-upravljanje)

### Kako prijavim napako ali kaj predlagam?

{{ui:editor.bugReport}} v nogi strani shrani datoteko ZIP z načrtom in kratkim besedilom o različici in brskalniku; osebnih podatkov v njej ni. Priloži jo na forumu ali v razpravah na GitHubu. Vprašanja in želje so dobrodošli na obeh mestih.

Več: [Prijava napake](chapter:datoteke-in-shranjevanje#prijava-napake) in [Pomoč in povratne informacije](chapter:offline-in-namestitev#pomoc-in-povratne-informacije)
