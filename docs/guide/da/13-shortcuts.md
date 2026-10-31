---
title: Tastaturgenveje
summary: Alle taster på ét sted, taget direkte fra programmet så listen altid er rigtig.
---

Genvejene virker så længe arbejdsplanet har fokus. Mens du skriver i et felt holder de sig væk. På en Mac, brug [[Cmd]] hvor [[Ctrl]] er angivet her.

I editoren åbner {{ui:editor.keyboardShortcuts}} i området {{ui:editor.group.help}} den samme liste som et vindue. Printerknappen i vinduet ({{ui:shortcuts.print}}) udskriver selve listen, sort på hvidt og med stor skrift; browserens udskrivningsdialog tilbyder også at gemme den som PDF.

Feltet øverst i vinduet søger i listen: det beholder kun de genveje, hvis sætning, gruppe eller taster indeholder hvert ord, du skriver, så "ctrl+z" kun efterlader de rækker. Store og små bogstaver og accenter er ligegyldige, og et enkelt bogstav eller ciffer finder den tast og de ord, der begynder med det. X'et for enden af feltet tømmer det; med tomt felt er hele listen tilbage. Printerknappen udskriver det, vinduet viser, så efter en søgning udskriver den kun de fundne genveje.

![Tastaturgenvejsvinduet i editoren.](shot:shortcuts)

## Kommandosøgning

Kan du ikke finde et værktøj? Tryk [[Ctrl]]+[[K]] eller klik forstørrelsesglasset i området {{ui:editor.group.help}}, og tast hvad du leder efter: et værktøj ("rund", "spejl"), en form ("cylinder") eller en kommando ("eksportér", "fortryd"). Flyt med piletasterne og tryk [[Enter]], eller klik posten.

- Søgningen forstår både det engelske og det tyske ord og ignorerer store bogstaver og omlyd: "aushoehlen" finder {{ui:editor.tool.hollow}}.
- Hver post viser de taster der gør det samme og det værktøjsbjælke-område den bor i, så du lærer hvor den er.
- Poster der er grået ud kan ikke køres lige nu, for det meste fordi intet er valgt. De bliver i listen så søgningen stadig fortæller dig hvor værktøjet er.

Vejledningen du læser har også en søgeboks, øverst på hver side: tast et ord eller to, og den lister de sektioner der indeholder dem alle, med de matchende ord markeret. Klik én, eller tryk [[Enter]] for den første, for at springe direkte derhen. Siden der åbner, markerer hvert sted dine ord står, og ruller til det første i den valgte sektion; [[Esc]] eller et klik på en markering fjerner dem igen.
- En forms navn tilføjer den form til arbejdsplanet, ligesom at klikke den i formmenuen.
- Med et tomt felt lister søgningen de kommandoer du brugte sidst øverst.
- Navnet på en form i dit design finder den form og vælger den, hvilket hjælper i et design med mange dele. Former vises først når du taster.
- Det virker også i skitsetilstand, med skitseværktøjerne.

## Interaktiv hjælp

Kan du ikke finde hvor du skal læse om en knap eller et felt? Lad programmet tage dig derhen. Klik på spørgsmålstegnet i området {{ui:editor.group.help}}, eller tryk [[Shift]]+[[F1]]. Markøren bliver til et spørgsmålstegn, og alt der ligger under det bliver markeret med en ramme.

- Klik på en knap, et felt, en kontakt, et håndtag, en gruppe i båndet eller et vindues titellinje. Den gør **ikke** det den normalt gør. I stedet åbnes et lille vindue, med elementets navn, et kort resumé af den del af denne vejledning der handler om det, op til to andre steder der nævner det, og {{ui:interactiveHelp.open}}.
- Hjælpen handler om elementet du pegede på, ikke om hele vinduet omkring det. Et element uden eget navn bruger det nærmeste omkring sig; inde i et vindue falder den tilbage på vindues spørgsmålstegn.
- {{ui:interactiveHelp.open}} åbner vejledningen ved det afsnit i en ny fane. Der er afsnittet markeret med farve, fra sin overskrift til sin slut, så du ser hvor det begynder og slutter.
- Siger vejledningen intet om elementet, siger vinduet det og tilbyder {{ui:interactiveHelp.search}}.
- [[Esc]], eller spørgsmålstegnet igen, forlader tilstanden. På en touchskærm er der intet hover: et tryk på et element åbner vinduet med det samme.

Vinduet flyttes på sin titellinje som de andre vinduer. Programmet finder afsnittet ud fra elementets navn – teksten på en knap, navnet på et felt – fordi denne vejledning skriver hver knap som den hedder i programmet. Det slår det op i den samme søgning som feltet øverst på hver side i vejledningen, på det sprog du bruger, og kører helt i din browser.

{{shortcuts}}
