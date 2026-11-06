---
title: Priprava za 3D-tisk
summary: Izberi svoj tiskalnik, bodi opozorjen, če kaj ne ustreza, in del pravilno položi.
---

## Izbira tiskalnika

Odpri nastavitve (zobnik v naslovni vrstici, {{ui:editor.workspaceSettings}}) in preklopi na področje {{ui:workspace.workplane}}. Pri {{ui:workspace.printer}} svoj tiskalnik izbereš s seznama več kot 230 običajnih modelov, med njimi Bambu Lab, Prusa, Creality, Anycubic, Elegoo in mnogi drugi.

![Nastavitve delovne ravnine z izbranim tiskalnikom. Tiskalna postelja in največja višina tiska prihajata iz profila rezalnika.](shot:settings-workplane)

S tem se zgodijo tri stvari:

- Delovna ravnina dobi velikost tiskalne postelje.
- V kotu delovne površine stojita ime tiskalnika in njegov delovni prostor. Komur napis moti, ga izklopi pod {{ui:workspace.workplane}} z {{ui:workspace.showPlateLabels}}; to velja tudi za ime načrta spredaj levo.
- layerling **opozori**, če kaj ne ustreza.

Profili tiskalnikov izvirajo iz OrcaSlicerja, torej so enaki, kot jih pozna tudi tvoj rezalnik. Če želiš delati brez tiskalnika, izberi {{ui:workspace.printerNone}}. Velikost delovne ravnine lahko nastaviš tudi ročno.

Delta tiskalniki, na primer FLSun ali SeeMeCNC ali Anycubic Predator, tiskajo na okroglo ploščo. Z enim od njih je tudi delovna ploskev okrogla in široka kot plošča, telo pa je preveliko, takoj ko sega čez rob. Okroglo telo se meri po lastnem obrisu, ne po škatli okoli njega, zato se prilega tudi valj, ki je skoraj tako širok kot plošča.

## Kadar kaj ne ustreza

Telo, ki sega čez rob tiskalne plošče, se označi. Zraven se pojavi sporočilo, katere strani koliko segajo čez. Enako je, če je del **previsok**: višina šteje od najnižjega telesa, tako kot rezalnik postavi model.

![Kvader je širši od tiskalne postelje Bambu Lab A1 mini. Sporočilo spodaj pove, za koliko.](shot:printer-overhang)

Opozorilo ti ne preprečuje nadaljnjega dela. Je namig, da šele v rezalniku ne ugotoviš, da je del prevelik. Prevelik del je pogosto mogoče razdeliti: z {{ui:editor.tool.split}} ga razreži na dve polovici in ju natisni ločeno.

## Pravilno položiti del

Kako del leži na plošči, odloča o trdnosti in videzu. Pri tem pomagata dve orodji v področju {{ui:editor.group.arrange}}:

- {{ui:editor.tool.layFlat}}: klikni ploskev in del leži s to stranjo spodaj. Najboljša smer tiska z enim klikom.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): del postavi na delovno ravnino, če nekje visi v zraku.

Nekaj ravnil za smer:

- Ploske, velike ploskve navzdol. Najbolje se oprimejo.
- Dolge dele, ki so obremenjeni, položi tako, da plasti ne potekajo pravokotno na obremenitev. Plasti so najšibkejša smer.
- Previse čez 45° se izogibaj ali jim v rezalniku dodaj podpore.

## Iskanje previsov

V meniju ob očesu ({{ui:editor.group.visibility}}) **Pokaži previse** vklopi previse. Vsaka ploskev, ki kaže strmeje kot 45° navzdol, se potem pokaže rdeče-belo šrafirana – tam bi tiskalnik potreboval podpore. Kar leži na plošči, ostane prosto. Tako že med konstruiranjem vidiš, ali krogla, lok ali vodoravna izvrtina gre brez podpor; [kapljična izvrtina](chapter:navoji-in-mehanika) je natanko za to. Če del zavrtiš ali ga z {{ui:editor.tool.layFlat}} položiš drugače, šrafura takoj potuje zraven.

Kako strmo zmore tvoj tiskalnik, nastaviš v nastavitvah pod {{ui:workspace.appearance}}: od 30° (previdno) do 70° (za tiskalnike z dobrim hlajenjem dela). Ploskev, ki leži na drugem telesu, se vseeno označi – layerling vidi samo ploskev samo.

## Debelina stene, zračnost in posnetja

- Stene naj bodo široke vsaj dve tiskalni poti, pri šobi 0,4 mm torej 0,8 mm. Trdni deli potrebujejo 1,2 do 2 mm.
- Kjer se dva dela prilegata, potrebuješ zračnost: običajno 0,2 do 0,4 mm, odvisno od tiskalnika. Zgradi majhen preizkusni par, preden natisneš velik del.
- Spodnji rob, ki leži na plošči, mnogi rahlo posnamejo. To prepreči, da bi se prva plast razlezla (»slonja noga«).

## Zračnost tvojega tiskalnika: preizkus ujemanja

Vsak tiskalnik natisne luknje malo manjše in zatiče malo debelejše, kot so narisani, vsak za svojo mero. Zračnost, ki jo potrebujeta dva natisnjena dela, je zato sprva ugibanje. Raje jo enkrat izmeri: v nastavitvah pod {{ui:workspace.workplane}} gumb {{ui:workspace.fitTestMake}} položi preizkus ujemanja na ploščo. To je ploščica 60 × 20 × 4 mm s sedmimi luknjami za en zatič 5 mm, vsaka narisana kot 5 mm in dvakrat 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 ali 0,40 mm, ob njej pa je izbočena vrednost, in še sam zatič 5 mm, ki stoji ob ploščici in ima zgoraj majhno posnetje. Sestavljen je iz navadnih oblik, zato se natisne skupaj z ostalim na plošči, brez podpor.

Natisni ga, kot leži, nato potiskaj zatič s posnetim koncem naprej v luknje, od najožje naprej. **Najožja luknja, v kateri se zatič še vrti,** pove zračnost tvojega tiskalnika. Vpiši njeno številko pod {{ui:workspace.printerPlay}} ali jo klikni med vrednostmi pod poljem. Zračnost velja na stran, v milimetrih, in brskalnik jo hrani za vse projekte; prazno polje pomeni, da ni izmerjena.

Od takrat nove uporabe začnejo z zračnostjo namesto z vgrajeno vrednostjo: {{ui:lid.gap}} in {{ui:lid.hingePinPlay}} v orodju {{ui:editor.tool.lid}}, zračnost novih oblik {{ui:shape.dovetail}} in {{ui:shape.snapFit}}, {{ui:prop.clearance}} nove matice ali navojne luknje – dvojna zračnost, saj je to prostor čez ves premer – in {{ui:clearance.threshold}} pri {{ui:editor.tool.clearance}}. Dokler tako polje še ima to vrednost, »{{ui:printerPlay.fromFitTest}}« ob njem pove, od kod je številka. Tečaj, natisnjen v enem kosu, in zgibi orodja {{ui:editor.tool.flexi}} obdržijo svojih 0,4 mm: ko so natisnjeni v enem kosu, morajo njihove reže ostati odprte tudi med plastmi, tega pa zatič, natisnjen posebej, ne izmeri. Prostor za vtis magneta ali ključa Gridfinity in prostor za kupljeno vtičnico ali ploščo prav tako obdržita svoje vrednosti. Telesa, ki so že v projektu, se nikoli ne spremenijo, in tudi projekt, ki ga odpreš, ne.

## Preverjanje tiska

{{ui:editor.tool.printCheck}} ob {{ui:editor.tool.clearance}} v skupini {{ui:editor.group.combine}} pregleda izbrane predmete ali vse vidne, če ni nič izbrano, in v enem oknu pove, kaj bi šlo pri tiskanju narobe. Vsaka od petih vrstic je zelena, če ni našla ničesar, in oranžna s tem, kaj in kje, če je:

- **{{ui:printCheck.thin.title}}**: mesta, tanjša od dveh linij šobe - 0,8 mm pri šobi 0,4 mm. Slicer tako steno izpusti ali jo natisne kot eno šibko linijo. Na vrhu okna pri {{ui:printCheck.nozzle}} izberite svojo šobo (0,2 do 0,8 z enim klikom, katero koli drugo v polju). Tanka mesta se na telesih pobarvajo rdeče s svetlo mrežo, vrstica pa navede najtanjše mesto in koliko površine je pretanke. Mesta pod 1 mm² in ostri robovi, na primer rob klina, se ne štejejo.
- **{{ui:printCheck.floating.title}}**: telo ali ločen del telesa, ki se ne dotika ne plošče ne drugega dela (do 0,05 mm natančno). Tiskal bi se v zraku. Del, ki leži na stoječem delu, je v redu.
- **{{ui:printCheck.contact.title}}**: del na plošči, katerega prva plast je za njegovo višino zelo majhna, na primer krogla ali stožec na konici. Med tiskanjem se lahko odlepi. Opozorilo se pokaže pod 0,5 mm² naležne površine, izmerjene 0,1 mm nad ploščo, na vsak milimeter višine: krogla je vedno pod tem, kocka z 10 mm ima 10.
- **{{ui:printCheck.overhang.title}}**: iste številke kot pri **Pokaži previse**, s kotom, ki je nastavljen tam.
- **{{ui:printCheck.openMesh.title}}**: uvožena mreža z odprtimi robovi ali z robovi, ki si jih delijo tri ali več ploskev. Slicer mora pri taki mreži ugibati, kje je notranjost.

![Pladenj, katerega desna stena je debela le 0,6 mm: Preveri tisk jo pobarva rdeče in jo navede v oknu.](shot:print-check)

{{ui:printCheck.show}} v vrstici pripelje kamero tja; izbere lebdeče dele, dele z majhnim stikom in odprte mreže, pri previsih pa vklopi **Pokaži previse**. Telesa, ki se prekrivajo, se preverijo združena, kot jih združi slicer. Če model spremenite, medtem ko je okno odprto, se pokaže {{ui:printCheck.stale}}; kliknite to ali {{ui:printCheck.checkAgain}}. [[Esc]] zapre okno. Na modelu se nič ne spremeni. UI naredi isto preverjanje z `layerling_check_print`.

## Ko gre zares

Izberi {{ui:editor.export}} in potem **STL** ali **3MF**. STL je najpreprostejša oblika. 3MF obdrži imena in barve posameznih teles, zato je praktičen, če tiskaš z več barvami. V oknu za izvoz vidiš tudi, koliko gramov in metrov filamenta bi del potreboval, če bi bil poln. Več v poglavju [Datoteke in shranjevanje](chapter:datoteke-in-shranjevanje).
