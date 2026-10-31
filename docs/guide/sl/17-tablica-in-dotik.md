---
title: Tablica in dotik
summary: Delo s prsti ali pisalom: izbira več teles, vrtenje in približevanje pogleda, meni dolgega pritiska in kaj je dobro vedeti na iPadu.
---

## Prsti in pisalo

layerling teče v brskalniku tablice in kot aplikacija z domačega zaslona. Prst naredi to, kar leva tipka miške. Za tri stvari, ki jih tablica nima, desno tipko miške, tipko Shift in kolesce, obstajajo lastne poti:

| Želite | Na tablici |
| --- | --- |
| Izbrati telo | Tapniti nanj. |
| Izbrati več teles | Pol sekunde držite prst pri miru, izberite {{ui:contextMenu.selectMultiple}}, nato tapnite telo za telesom. Tap na izbrano telo ga spet odstrani iz izbora. |
| Izbrati vsa telesa | Pol sekunde držite prst pri miru na praznem mestu, izberite {{ui:contextMenu.selectAll}}. |
| Odpreti meni desnega klika | Pol sekunde držite prst pri miru na telesu ali na praznem mestu. |
| Premakniti telo | Ga povleči. |
| Spremeniti velikost, zavrteti ali dvigniti telo | Povleči za njegove ročice, majhne kvadratke in puščice okoli njega. Prst jih ujame tudi malo ob strani. |
| Zavrteti pogled | En prst na praznem mestu ali povleči kocko pogleda. |
| Približati pogled | Dva prsta: razmakni za približanje, skupaj za oddaljitev. |
| Premakniti pogled | Dva prsta skupaj podrsaj. |
| Odstraniti izbor | Tapniti na prazno mesto. Ne, dokler je vklopljeno {{ui:camera.touchRotate}}, ko en prst vrti pogled; in v {{ui:contextMenu.selectMultiple}} prvi tap na prazno mesto samo konča način in pusti izbor, kakršen je, šele naslednji ga odstrani. |

## Izbira več teles

Brez tipke Shift naredi {{ui:contextMenu.selectMultiple}} v meniju dolgega pritiska to, kar na računalniku Shift+klik. Dokler je vklopljeno, to pove sporočilo, vsak tap na telo pa ga doda izboru ali ga spet odstrani. Tap na prazno mesto ali [[Esc]] na tipkovnici ga konča in pusti izbor, kakršen je. Prst na praznem mestu medtem še naprej vrti pogled. Nato {{ui:editor.tool.group}}, {{ui:editor.tool.align}} ali premik delujejo na vsa izbrana telesa.

## Vrtenje in približevanje pogleda

En prst na praznem mestu vrti pogled, dva prsta ga približujeta in premikata. Prst, ki se začne na telesu, dela s telesom, ne s pogledom. Če želite, da namesto tega vrti pogled, vklopite {{ui:camera.touchRotate}} v vrstici pogleda: en prst potem vrti pogled namesto izbiranja, kjerkoli se začne. To stikalo se pokaže samo na napravi z zaslonom na dotik.

Kocka pogleda zgoraj levo vrti pogled, če jo vlečete, tap na eno od njenih stranic, vogalov ali robov pa skoči na ta pogled. Glejte [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina).

## Ročice, majhne točke in pisalo

Konica prsta zakriva, na kar cilja. layerling pusti prstu seči do ročic, točk, črt in robov malo dlje kot kazalcu miške, vendar je pisalo natančnejše. To velja za pisalo, ki ga tablica pozna kot pisalo, na primer Apple Pencil ali S Pen. Preprosto pisalo z gumijasto konico šteje za zaslon kot prst in ni natančnejše od njega, zato z njim delajte kot s prstom. Če Apple Pencil na iPadu lebdi nad gumbom, se čez trenutek v majhnem oblačku pokaže njegovo ime, kakor namig pri miški.

Če se telesa premikajo, ker se jih dotaknejo otroci ali hitre roke, vklopite v nastavitvah {{ui:workspace.selectBeforeMoving}}: telo mora biti potem najprej izbrano in šele naslednji poteg ga premakne.

## Na iPadu ali iPhonu

- **Namestite jo kot aplikacijo.** V Safariju tapnite ikono za deljenje in izberite „Dodaj na začetni zaslon“. Aplikacija se odpre v lastnem oknu brez naslovne vrstice in deluje tudi brez povezave, glejte [Brez povezave in namestitev](chapter:offline-in-namestitev).
- **Vaši načrti so v brskalniku.** Računa ni in nič se ne nalaga. Safari ima lastno pravilo proti sledenju: izbriše, kar je spletno mesto shranilo, če ga sedem dni niste obiskali v Safariju. Spletna aplikacija na začetnem zaslonu je iz tega pravila izvzeta, kot ga opisuje WebKit. To je še en razlog, da uporabljate aplikacijo z začetnega zaslona in varnostno shranite pomembno delo: {{ui:dashboard.backupAll}} na začetni strani zapakira vse načrte v eno datoteko.
- **Datoteke.** Safari pusti strani pisati v datoteko samo prek prenosa, zato {{ui:editor.export}} da datoteko med prenose aplikacije Datoteke, [[Ctrl]]+[[S]] na tipkovnici pa jo prenese še enkrat; glejte [Datoteke in shranjevanje](chapter:datoteke-in-shranjevanje).
- **Tipkovnica ni potrebna.** Vsako orodje ima gumb na traku, številsko polje pa odpre zaslonsko tipkovnico. Tipkovnica ob iPadu doda [bližnjice](chapter:bliznjice). Polje z vrednostjo ob telesu odpre svoje številsko polje šele z drugim dotikom: prvi ga samo označi, tako da prst, ki nanj pomotoma pade, ne prikliče tipkovnice.

## Delavnice z otroki

Prsti in pisala z gumijasto konico delujejo tu enako. Dve nastavitvi olajšata razred: {{ui:workspace.selectBeforeMoving}}, da dotik telesa ne premakne po pomoti, in {{ui:camera.touchRotate}}, da en prst vedno vrti pogled. Gumb z vprašajem v skupini Pomoč na traku vklopi {{ui:interactiveHelp.title}}: tap na poljuben gumb, polje ali ročico ga potem razloži, isti gumb ali [[Esc]] pa pomoč konča.
