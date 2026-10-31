---
title: Billentyűparancsok
summary: Minden billentyű egy pillantással, közvetlenül a programból véve, így a lista mindig pontos.
---

A billentyűparancsok addig működnek, amíg a munkasík van fókuszban. Amíg egy mezőbe gépelsz, nem lépnek közbe. Macen ahol itt [[Ctrl]] szerepel, ott a [[Cmd]] érvényes.

A szerkesztőben a {{ui:editor.group.help}} területen lévő {{ui:editor.keyboardShortcuts}} ugyanezt a listát nyitja meg ablakként. Az ablak nyomtató gombja ({{ui:shortcuts.print}}) csak a listát nyomtatja ki, fehér alapon feketével és nagy betűkkel; a böngésző nyomtatási párbeszédablaka PDF-ként is felkínálja a mentést.

Az ablak tetején lévő mező a listában keres: csak azokat a billentyűparancsokat hagyja meg, amelyek mondatában, csoportjában vagy billentyűiben minden beírt szó szerepel, így a "ctrl+z" csak ezeket a sorokat hagyja meg. A kis- és nagybetű és az ékezetek nem számítanak, egyetlen betű vagy számjegy pedig azt a billentyűt és az azzal kezdődő szavakat találja meg. A mező végén lévő X kiüríti; üres mezővel ismét a teljes lista látszik. A nyomtató gomb azt nyomtatja, amit az ablak mutat, így keresés után csak a talált billentyűparancsokat.

![A billentyűparancsok ablak a szerkesztőben.](shot:shortcuts)

## Parancskereső

Nem találsz egy eszközt? Nyomd meg a [[Ctrl]]+[[K]] billentyűt, vagy kattints a {{ui:editor.group.help}} területen lévő nagyítóra, majd gépeld be, amit keresel: egy eszközt („lekerekítés”, „tükrözés”), egy alakzatot („henger”) vagy egy parancsot („exportálás”, „visszavonás”). A nyílbillentyűkkel mozogj, és nyomj [[Enter]] billentyűt, vagy kattints a bejegyzésre.

- A kereső a magyar, az angol és a német szót is érti, és figyelmen kívül hagyja a kis- és nagybetűket és az ékezeteket: a „kiuregeles” megtalálja a {{ui:editor.tool.hollow}} parancsot.
- Minden bejegyzés mutatja az ugyanezt végző billentyűket és az eszköztárnak azt a területét, ahol található, így megtanulod, hol van.
- A szürkén megjelenő bejegyzések éppen nem futtathatók, többnyire azért, mert semmi sincs kijelölve. A listában maradnak, így a kereső akkor is megmondja, hol van az eszköz.

Az útmutatónak, amelyet olvasol, szintén van keresőmezője, minden oldal tetején: gépelj be egy-két szót, és felsorolja azokat a részeket, amelyek mindegyiket tartalmazzák, kiemelve az egyező szavakat. Kattints egyre, vagy nyomj [[Enter]] billentyűt az elsőhöz, és egyenesen oda ugrasz. A megnyíló oldal kiemeli a szavaid minden előfordulását, és a kiválasztott rész első találatához görget; az [[Esc]] vagy egy kattintás a kiemelésre eltünteti őket.
- Egy alakzat nevével hozzáadod azt az alakzatot a munkasíkhoz, pont mintha az alakzatmenüben kattintanál rá.
- Üres mezőnél a kereső felül az utoljára használt parancsokat sorolja fel.
- A tervedben lévő test neve megtalálja és kijelöli azt a testet, ami sok részből álló tervben segít. A testek csak akkor jelennek meg, amikor gépelsz.
- Vázlatmódban is működik, a vázlateszközökkel.

## Interaktív súgó

Nem találod, hol olvashatsz egy gombról vagy mezőről? Hadd vigyen oda a program. Kattints a kérdőjelre a {{ui:editor.group.help}} területen, vagy nyomd meg a [[Shift]]+[[F1]] billentyűket. A mutató kérdőjellé változik, és ami alatta van, körvonalat kap.

- Kattints egy gombra, mezőre, kapcsolóra, fogantyúra, a szalag egy csoportjára vagy egy ablak címsorára. Ilyenkor **nem** azt teszi, amit egyébként. Helyette egy kis ablak nyílik meg az elem nevével, az útmutató róla szóló részének rövid összefoglalójával, legfeljebb két további hellyel, ahol szó esik róla, és a {{ui:interactiveHelp.open}} gombbal.
- A súgó arról az elemről szól, amelyre mutattál, nem az egész körülötte lévő ablakról. Egy saját név nélküli elem a legközelebbi körülötte lévőt használja; egy ablakon belül annak az ablaknak a kérdőjelére esik vissza.
- A {{ui:interactiveHelp.open}} új lapon nyitja meg az útmutatót annál a résznél. Ott a rész színes körvonalat kap a címétől a végéig, így látod, hol kezdődik és hol ér véget.
- Ha az útmutató semmit sem mond az elemről, az ablak jelzi, és felajánlja a {{ui:interactiveHelp.search}} lehetőséget.
- Az [[Esc]] vagy ismét a kérdőjel kilép a módból. Érintőképernyőn nincs rámutatás: egy elemre koppintva azonnal megnyílik az ablak.

Az ablak a címsoránál fogva mozgatható, mint a többi ablak. A program az elem neve alapján találja meg a részt – egy gomb felirata, egy mező neve alapján –, mert ez az útmutató minden gombot úgy ír, ahogy a programban hívják. Ugyanabban a keresőben keresi, mint az útmutató minden oldalának tetején lévő mező, az általad használt nyelven, és teljesen a böngésződben fut.

{{shortcuts}}
