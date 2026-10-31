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

Skupino smeš obravnavati naprej kot obliko: premikati, vrteti, barvati, spet združevati. Z {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) jo razdružiš in posamezni deli so spet tu.

### Skupino spremeniti v luknjo

Tudi cela skupina je lahko telo ali luknja. Pri tem velja preprosto pravilo:

- Če skupina vsebuje samo telesa (ali samo luknje), jo preklopiš kot celoto in njeni deli gredo zraven.
- Če vsebuje oboje, na primer kocko z izvrtino, vsak del obdrži svoje stanje. Cela skupina potem postane orodje, a izvrtina ostane izvrtina.

## Povezovanje v sveženj

Včasih naj deli samo ostanejo skupaj, ne da bi postali eno – na primer bel logotip na črni plošči za večbarvni tisk. Za to je {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), kot v Tinkercadu. Sveženj lahko premikaš, vrtiš in mu spreminjaš velikost kot obliki, a nič se ne izračuna:

- Vsak del obdrži svojo barvo in ostane telo ali luknja.
- Luknje ne režejo.
- Pri izvozu kot STL, 3MF ali OBJ je vsak del svoje telo; v 3MF in OBJ s svojo barvo.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) sveženj spet razdruži, [[E]] ga odpre za urejanje kot skupino. Posnetja, zaokrožitve in izdolbljenje na svežnju ne gredo, ker ni eno samo telo: za to ga združi v skupino ali urejaj njegove dele posamezno. Če naj luknja v svežnju vseeno reže, sveženj združi v skupino (Ctrl+G).

## Presek

{{ui:editor.tool.intersect}} obdrži samo to, kar imata dve ali več teles skupnega. Položi dve prekrivajoči se obliki drugo čez drugo, označi obe in klikni nanj. Tako na primer iz valja in kvadra nastane kos z okroglo in ravno stranjo. Skupina pri tem šteje tako, kot izgleda, torej z izvrtinami. Če je označena tudi luknja, ostane to, kar imajo vsa telesa skupnega z vsemi luknjami.

## Izrezovanje enega telesa iz drugega

Pri delih, ki morajo ustrezati drug drugemu, gred v puši ali vijak v ohišju, naredite en del in ga izrežete iz drugega. Izberite obe telesi in kliknite {{ui:editor.tool.cutOut}} v območju {{ui:editor.group.combine}} ali kliknite z desno tipko in ga izberite tam. Okno navede del, ki ostane, in telo, ki dobi votlino; layerling vzame manjše telo za del, {{ui:cutOut.swap}} pa ju zamenja. {{ui:cutOut.clearance}} naredi votlino okoli dela toliko večjo: 0 ustreza natančno, 0,2 mm je običajna zračnost za natisnjeno ujemanje. {{ui:cutOut.apply}} izreže kopijo dela iz drugega telesa in pusti sam del tam, kjer je. Rezultat je skupina: {{ui:editor.tool.ungroup}} rez spet razstavi. Zračnost zahteva, da je del natančno telo, kot pri orodju {{ui:editor.tool.offset}}, ki se uporablja za to.

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

Polovici sta preprosti mreži: nastavitve, kot je število stranic valja ali črke besedila, se izgubijo, zato jih nastavi prej. [[Ctrl]]+[[Z]] vrne original v enem koraku. Zaklenjenih in skritih predmetov ni mogoče razrezati.

## Ločevanje delov

Če oblika sestoji iz več med seboj ločenih kosov, na primer besedilo iz posameznih črk, jo lahko z {{ui:inspector.separateParts}} razstaviš v samostojne oblike. Ukaz je tudi v meniju, ki se odpre z desnim klikom na obliko.

> **Namig:** Luknje vedno naredi malo daljše od dela, ki naj ga prebodejo. Če luknja zaključi natanko s ploskvijo, včasih ostane čisto tanka kožica. En milimeter preseka da varnost.
