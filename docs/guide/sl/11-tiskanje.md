---
title: Priprava za 3D-tisk
summary: Izberi svoj tiskalnik, bodi opozorjen, če kaj ne ustreza, in del pravilno položi.
---

## Izbira tiskalnika

Odpri nastavitve (zobnik v orodni vrstici, {{ui:editor.workspaceSettings}}) in preklopi na področje {{ui:workspace.workplane}}. Pri {{ui:workspace.printer}} svoj tiskalnik izbereš s seznama več kot 230 običajnih modelov, med njimi Bambu Lab, Prusa, Creality, Anycubic, Elegoo in mnogi drugi.

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

## Ko gre zares

Izberi {{ui:editor.export}} in potem **STL** ali **3MF**. STL je najpreprostejša oblika. 3MF obdrži imena in barve posameznih teles, zato je praktičen, če tiskaš z več barvami. V oknu za izvoz vidiš tudi, koliko gramov in metrov filamenta bi del potreboval, če bi bil poln. Več v poglavju [Datoteke in shranjevanje](chapter:datoteke-in-shranjevanje).
