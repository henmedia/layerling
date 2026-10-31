---
title: Prvi koraki
summary: Od praznega lista do prvega dela za 3D-tiskalnik – v petih minutah, brez računa in brez namestitve.
---

layerling je program za konstruiranje za 3D-tisk, ki teče kar v brskalniku. Del zgradiš iz preprostih oblik, vanj izrežeš luknje, zaobliš robove in ga pošlješ v rezalnik. Ničesar ni treba nameščati in se nikjer prijavljati. Kar zgradiš, ostane na tvojem računalniku.

![Začetna stran programa layerling: zgoraj »Ustvari nov 3D-načrt«, pod njim lastni načrti in kratka navodila.](shot:start-page)

## Ustvari načrt

Odpri [layerling.com](https://layerling.com/). Na začetni strani klikni {{ui:dashboard.createDesign}}. Odpre se urejevalnik s prazno delovno ravnino, mrežo, na kateri nastane vse.

Če že imaš datoteko, ki jo želiš urejati naprej, izberi {{ui:dashboard.importGeometry}}. To deluje z načrti programa layerling (`.lyl`) prav tako kot z datotekami STL, OBJ, 3MF, STEP ali SVG.

Vsi tvoji načrti se pozneje pojavijo na začetni strani s sličico predogleda. Shranjeni so v pomnilniku brskalnika in se ob vsaki spremembi samodejno shranijo. Zato gumba za shranjevanje ni. Kako načrte spraviš v datoteko in jih deliš z drugimi, piše v poglavju [Datoteke in shranjevanje](chapter:datoteke-in-shranjevanje). Če želiš opomnik, v nastavitvah (zobnik v traku) vklopi {{ui:workspace.confirmTabClose}}: brskalnik potem vpraša, preden se zavihek z odprtim načrtom zapre ali osveži.

## Urejevalnik na kratko

![Urejevalnik z dvema oblikama na delovni ravnini. Zgoraj orodna vrstica, levo upravljanje kamere, desno nastavitve izbrane oblike.](shot:editor-overview)

- **Zgoraj** je orodna vrstica. Razvrščena je po opravilih: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} in {{ui:editor.group.help}}. Ko z miško zapelješ čez ikono, se pokaže njeno ime. Kjer vidiš majhen vprašaj, na primer pri nastavitvah oblike, v knjižnici oblik ali v oknih z orodji, te pelje naravnost v ustrezno poglavje teh navodil.
- **V sredini** je delovna ravnina. Tu postavljaš oblike, jih naravnaš in vidiš rezultat.
- **Desno** se pokažejo nastavitve izbrane oblike: barva, mere, lega in vse drugo, kar oblika še ima. Vpisovanje številk je natančnejše od vlečenja.
- **Levo** je upravljanje kamere z orientacijsko kocko nad njim. S tem se premikaš po prizoru, več o tem v poglavju [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina).
- **Čisto zgoraj** preklapljaš med {{ui:editor.modeGeometry}} in {{ui:editor.modeSketch}}, preimenuješ načrt ter nastaviš jezik in barvno shemo.

## Gumbi okoli delovne površine

Z miško se ustavite nad gumbom in videli boste njegovo ime. Če niste prepričani, kaj gumb naredi, kliknite v območju {{ui:editor.group.help}} na {{ui:interactiveHelp.title}} ([[Shift]]+[[F1]]) in nato na gumb. Tu so tisti, o katerih se najpogosteje sprašuje.

### Prilepi

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) doda v projekt to, kar ste kopirali z {{ui:editor.tool.copy}}. {{ui:common.duplicate}} kopira in prilepi v enem koraku.

### Izbriši

{{ui:common.delete}} ([[Delete]]) odstrani izbrane oblike. {{ui:editor.tool.undo}} jih vrne.

### Razdruži

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) izbrano skupino spet razstavi na oblike, iz katerih je nastala.

### Nastavitve delovnega prostora

{{ui:editor.workspaceSettings}} odpre nastavitve delovne površine: enota, velikost plošče, tiskalnik, mreža, barve, svetloba in drugo. Več v poglavju [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina).

### Tema

{{ui:common.theme}} čisto na vrhu določa videz layerlinga: kot sistem, svetel, temen ali grafiten.

### Preimenuj projekt

{{ui:editor.renameProject}}: svinčnik ob imenu čisto na vrhu. Vpišite novo ime in pritisnite [[Enter]].

### Ime projekta

Ime projekta ({{ui:confirm.projectName}}) je čisto na vrhu. Kliknite nanj, vpišite in [[Enter]] ime obdrži.

### Možnosti vidnosti

{{ui:editor.visibilityOptions}}, puščica ob ikoni očesa, vsebuje, kar lahko prikažete ali skrijete: seznam objektov, vse skrito, opombe in previse tiska. Več v poglavju [Izbiranje in razporejanje](chapter:izbiranje-in-razporejanje).

### Skrij izbrano

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) skrije izbrane oblike. Ostanejo v projektu in na seznamu objektov; {{ui:editor.visibilityOptions}} jih spet pokaže.

### Išči ukaze

{{ui:palette.open}}: vpišite, kar iščete, orodje, obliko ali nastavitev, in kliknite rezultat.

### Skrij upravljanje kamere

{{ui:camera.hide}} zloži upravljanje kamere na levi in da delovni površini več prostora; {{ui:camera.show}} ga vrne.

### Mreža pripenjanja

{{ui:inspector.snapGrid}} spodaj v lastnostih je korak, na katerega se pripenjata premikanje in spreminjanje velikosti. Ob njem majhno stikalo **mm | in** spremeni enoto. Več v poglavju [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina).

### Enota: milimetri ali palci

Stikalo **mm | in** ob {{ui:inspector.snapGrid}} spremeni enoto, mrežo plošče in korak pripenjanja za ta projekt.

### Noga okna

Na dnu okna: {{ui:dashboard.sponsor}} vodi na stran, kjer lahko podprete projekt; {{ui:dashboard.userGuide}} odpre ta priročnik; {{ui:dashboard.forum}} vodi na mesto za vprašanja, zamisli in poročila o napakah (razprave na GitHubu, v nemščini forum drucktipps3d); {{ui:editor.bugReport}} naredi ZIP za poročilo o napaki; {{ui:dashboard.projectOnGitHub}} vodi do projekta na GitHubu, številka različice pa odpre opombe ob izdaji. Povezavi na podatke o ponudniku in na varstvo zasebnosti pripadata tistemu, ki upravlja kopijo layerlinga, ki jo uporabljate.

## Tvoj prvi del

Za primer zgradimo kocko z izvrtino.

1. V orodni vrstici klikni {{ui:editor.addShape}} in izberi {{ui:shape.box}}. Oblika zdaj visi na kazalcu miške. S klikom na delovno ravnino jo odložiš.
2. Desno nastaviš mere, na primer 40 mm dolžine, 40 mm širine in 20 mm višine.
3. Na enak način postavi {{ui:shape.cylinder}} v sredino, s premerom 14 mm in višino 30 mm. Višji mora biti od kocke, da gre čisto skozi.
4. Izberi valj in desno klikni {{ui:inspector.hole}}. Postane prosojen: iz telesa je nastalo orodje, ki odvzema material.
5. Označi obe obliki in klikni {{ui:editor.tool.group}}. Kocka ima zdaj luknjo.

![Valj je luknja in gleda iz kocke navzgor.](shot:hole-before)

![Po združitvi v skupino ima kocka izvrtino.](shot:hole-after)

Natanko tako nastanejo izvrtine, utori in žepi. Poglavje [Telesa in luknje](chapter:telesa-in-luknje) to razloži podrobno.

## Novo od tvojega zadnjega obiska

Ko po posodobitvi spet odpreš layerling, ti kartica na začetni strani pokaže, kaj je prišlo zraven od tvojega zadnjega obiska: vsako različico od takrat, najnovejšo na vrhu. Če te dolgo ni bilo, se v kartici pomakni navzdol. Pod njo {{ui:whatsNew.earlier}} doda tudi različice izpred tvojega zadnjega obiska. Z {{ui:whatsNew.dismiss}} jo zapreš in ostane skrita do naslednje posodobitve. {{ui:whatsNew.footerLink}} v nogi začetne strani vedno znova pokaže zadnje novosti. Brskalnik si zapomni nazadnje videno različico in nič o tebi ne zapusti brskalnika.

Pri kopiji programa layerling na tvojem računalniku ali strežniku ima obvestilo »Na voljo je posodobitev« gumb {{ui:update.previewShow}}, ki našteje, kaj posodobitev prinaša, preden jo namestiš. Seznam se z GitHuba prenese šele, ko pritisneš gumb.

## Od načrta do tiska

Ko je tvoj del končan, klikni {{ui:editor.export}}, izberi STL ali 3MF in prenesi datoteko. Odpreš jo v svojem rezalniku, na primer v Bambu Studiu, PrusaSliceru, OrcaSliceru ali Curi. Kdor v nastavitvah izbere svoj tiskalnik, že med gradnjo vidi, ali del gre na tiskalno ploščo. Več o tem v poglavju [Tiskanje](chapter:tiskanje).

> **Namig:** Če prihajaš iz Tinkercada, se boš hitro znašel: plošča, oblike, telesa in luknje, združevanje v skupine, poravnava in zrcaljenje delujejo skoraj enako. Novo so predvsem posnetje in zaokrožitev, izdolbljenje, navoji in skice. Prenesete lahko tudi svoje načrte iz Tinkercada, glejte [Datoteke, shranjevanje in deljenje](chapter:datoteke-in-shranjevanje).
