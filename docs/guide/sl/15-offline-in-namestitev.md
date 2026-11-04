---
title: Namestitev kot aplikacije, delo brez interneta in lastno gostovanje
summary: layerling zaženi kot običajen program, tudi brez omrežja – in kako ga upravljaš na lastnem računalniku.
---

## Namestitev kot aplikacije

layerling je mogoče namestiti kot običajen program. Potem dobi lastno ikono in lastno okno brez naslovne vrstice. Po prvem obisku se zažene tudi **brez interneta**. Tvoji načrti pri tem ostanejo na tvojem računalniku. Namestitev se splača: aplikacija se zažene hitreje, ker je ni treba vsakič znova naložiti, deluje brez interneta in razbremeni strežnik. Nič ne izgubite, saj vam layerling še naprej sporoči, ko izide nova različica. To varuje tudi tvoje načrte: Safari na Macu, iPhonu in iPadu izbriše shranjene podatke spletnega mesta, ki ga sedem dni nisi obiskal, podatkov nameščene aplikacije pa ne.

Na začetni strani se za to pokaže opomba z {{ui:installHint.install}}, če tvoj brskalnik to zna. Sicer:

- **Chrome in Edge:** Klikni ikono za namestitev desno v naslovni vrstici ali v meniju brskalnika izberi »Namesti kot aplikacijo«.
- **Safari na Macu:** Meni »Datoteka«, nato »Dodaj v Dock«.
- **Safari na iPhonu in iPadu:** Ikona za deljenje, nato »Dodaj na domači zaslon«.
- **Firefox:** ne zna nameščati aplikacij. layerling se tam vseeno zažene brez povezave v zavihku.

Opombo na začetni strani lahko zapreš z {{ui:installHint.dismiss}}. Če nameščeno aplikacijo v Chromu ali Edgeu zaženeš drugič, prinese odprto okno naprej, namesto da bi odprla novo.

Na računalniku se nameščen layerling v Chromu ali Edgeu registrira tudi kot program za datoteke `.lyl`: dvoklik na načrt v upravitelju datotek ga odpre v layerlingu, [[Ctrl]]+[[S]] pa shranjuje nazaj v to datoteko. Na Androidu to ne deluje, tam brskalnik za nameščene spletne aplikacije ne ponuja povezave datotek; načrt odpri z {{ui:dashboard.importGeometry}} na začetni strani.

## Posodobitve

Če obstaja novejša različica, layerling to pokaže na začetni strani. Prek {{ui:dashboard.updateBannerLink}} prebereš, kaj se je spremenilo. Številka različice je spodaj desno. Po ponovnem nalaganju strani imaš novo različico.

Na layerling.com in na drugih spletnih strežnikih odprta stran posodobitev opazi sama. Strežnik vpraša za njegovo različico občasno, ko se vrneš na zavihek, in takoj, če datoteka programa, ki jo potrebuje, izgine. Če je medtem nameščeno kaj novega, kartica spodaj desno to pove in našteje novosti. {{ui:newVersion.reload}} najprej zapiše načrt, ki ga imaš odprtega, v brskalnik in nato znova naloži stran; načrt se vrne, kakor si ga pustil. {{ui:newVersion.later}} zadrži kartico za 15 minut. Naloži znova kmalu: stran, ki ostane na stari različici, lahko naloži dele nove, ki ne pašejo skupaj. Ista kartica se pokaže, ko se je to že zgodilo: delavci CAD, ki se naložijo šele, ko jih prvič potrebuješ, povedo, iz katere gradnje so, in če ni gradnja same strani – po posodobitvi ali s shranjeno kopijo starejše različice – kartica zahteva ponovno nalaganje, preden se oba nesporazumeta.

Če je layerling odprt v več zavihkih, zavihki pazijo drug na drugega: če v drugem zavihku že teče novejša različica, opomba spodaj v starem zavihku prosi, naj ga ponovno naložiš. In če je isti načrt odprt v dveh zavihkih, oba na to opozorita, saj se shranjujeta samodejno in bi drug drugega prepisovala. Če layerling odpreš v še enem zavihku, čeprav je en že odprt, ti novi zavihek svetuje, da nadaljuješ v starem, in ponudi, da se sam zapre. Če namerno želiš dva zavihka, na primer za dva načrta drug ob drugem, tam klikni {{ui:tabs.keepHere}}. Tudi ta navodila se odprejo v lastnem zavihku: če je layerling zraven odprt, se njihov gumb zgoraj desno imenuje »Nazaj v urejevalnik« in zapre navodila, namesto da bi urejevalnik odprl drugič.

## Jezik in videz

Jezik izbereš zgoraj desno, na seznamu jezikov. Barvna shema ob njem ponuja {{ui:theme.short.system}} (sledi operacijskemu sistemu), {{ui:theme.short.light}}, {{ui:theme.short.dark}} in {{ui:theme.short.graphite}}, nevtralno temno sivo.

## Lastno upravljanje

layerling je prosta programska oprema (AGPL-3.0) in ga lahko upravljaš na lastnem računalniku ali strežniku, na primer v delavnici, društvu ali šoli. Za to je več poti, opisanih v [README na GitHubu](https://github.com/henmedia/layerling/blob/main/README.de.md#loslegen):

- **Hitri začetek v Windowsih:** Ena sama vrstica v PowerShellu vse namesti in ustvari bližnjico na namizju. Če layerling že teče, nov dvoklik ne zažene drugega strežnika, ampak samo odpre stran.
- **Docker:** Za naprave NAS in domače strežnike, ne da bi moral biti nameščen Node.js. Vsaka izdaja obstaja kot gotova slika `henmedia/layerling` na Docker Hubu (tudi `ghcr.io/henmedia/layerling`) za amd64 in arm64; `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` jo zažene, na NAS jo poiščeš v registru upravljanja vsebnikov.
- **Statični izvoz:** Rezultat sestoji iz samih datotek, ki jih lahko dostavi vsak spletni strežnik. Sodijo na koren naslova (`https://layerling.example.com/` ali `http://192.168.0.5:8080/`), ne v podmapo in ne odprte z diska; koraki so v README. Z zapisljivo mapo `store` ob `index.html` in PHP na strežniku iz tega nastane tudi skupno odlagališče za načrte.

Most MCP za pomočnike z umetno inteligenco obstaja samo pri razvojnem strežniku, glej [Gradnja z umetno inteligenco](chapter:ai-z-mcp).

## Pomoč in povratne informacije

- V urejevalniku je v področju {{ui:editor.group.help}} {{ui:editor.guide}} z najpomembnejšimi prijemi in pregled [bližnjic na tipkovnici](chapter:bliznjice). Kratka navodila pri vsakem razdelku z vprašajem napotijo na ustrezno poglavje tu.

![Kratka navodila v urejevalniku. Zgoraj so videoposnetki drugih, vsak razdelek ima vprašaj.](shot:quick-guide)

- Vprašanja, želje in prijave napak so dobrodošle v [forumu](https://forum.drucktipps3d.de/forum/board/127-layerling/) in na [GitHubu](https://github.com/henmedia/layerling/discussions).
- Kaj se je spremenilo v kateri različici, piše v opombah ob različicah, ki jih najdeš spodaj na začetni strani in v urejevalniku.
