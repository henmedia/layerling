---
title: Raccourcis clavier
summary: Toutes les clés en un coup d'œil, extraites directement du programme afin que la liste soit toujours exacte.
---

Les raccourcis fonctionnent tant que le plan de travail a le focus. Pendant que vous tapez dans un champ, ils restent à l'écart. Sur Mac, [[Cmd]] s'applique partout où [[Ctrl]] est répertorié ici.

Sous l'éditeur, {{ui:editor.keyboardShortcuts}} dans la zone {{ui:editor.group.help}} ouvre la même liste sous forme de fenêtre. Le bouton d'imprimante de la fenêtre ({{ui:shortcuts.print}}) imprime la liste seule, en noir sur blanc et en gros caractères ; la boîte de dialogue d'impression du navigateur propose aussi de l'enregistrer en PDF.

Le champ en haut de la fenêtre cherche dans la liste : il ne garde que les raccourcis dont la phrase, le groupe ou les touches contiennent chaque mot tapé, ainsi « ctrl+z » ne laisse que ces lignes. Les majuscules et les accents ne comptent pas, et une seule lettre ou un seul chiffre trouve cette touche et les mots qui commencent par elle. Le X au bout du champ le vide ; champ vide, toute la liste revient. Le bouton d'imprimante imprime ce que montre la fenêtre : après une recherche, il n'imprime que les raccourcis trouvés.

![La fenêtre des raccourcis clavier dans l'éditeur.](shot:shortcuts)

## Recherche de commandes

Vous ne trouvez pas d'outil ? Appuyez sur [[Ctrl]]+[[K]] ou cliquez sur la loupe dans la zone {{ui:editor.group.help}}, puis tapez ce que vous recherchez : un outil ("congé", "miroir"), une forme ("cylindre") ou une commande ("exporter", "annuler"). Déplacez-vous avec les touches fléchées et appuyez sur [[Enter]], ou cliquez sur l'entrée.

- La recherche comprend aussi bien le mot anglais que le mot allemand et ignore les majuscules et les trémas : "aushoehlen" trouve {{ui:editor.tool.hollow}}.
- Chaque entrée affiche les touches qui font la même chose et la zone de la barre d'outils dans laquelle elle se trouve, afin que vous sachiez où elle se trouve.
- Les entrées grisées ne peuvent pas être exécutées pour le moment, principalement parce que rien n'est sélectionné. Ils restent dans la liste afin que la recherche vous indique toujours où se trouve l'outil.

Le guide que vous lisez dispose également d'un champ de recherche, en haut de chaque page : tapez un mot ou deux et il répertorie les sections qui les contiennent tous, avec les mots correspondants marqués. Cliquez sur un ou appuyez sur [[Enter]] pour le premier, pour y accéder directement. La page qui s'ouvre marque chaque endroit où apparaissent vos mots et défile jusqu'au premier dans cette section ; [[Esc]] ou un clic sur une marque les efface.
- Le nom d'une forme ajoute cette forme au plan de travail, tout comme si vous cliquez dessus dans le menu des formes.
- Avec un champ vide, la recherche répertorie les commandes que vous avez utilisées en dernier en haut.
- Le nom d'un corps dans votre conception trouve ce corps et le sélectionne, ce qui facilite une conception comportant de nombreuses pièces. Les corps n'apparaissent qu'une fois que vous tapez.
- Cela fonctionne également en mode esquisse, avec les outils d'esquisse.

## Aide interactive

Vous ne trouvez pas où lire quelque chose sur un bouton ou un champ ? Laissez le programme vous y conduire. Cliquez sur le point d'interrogation dans la zone {{ui:editor.group.help}} ou appuyez sur [[Shift]]+[[F1]]. Le pointeur devient un point d'interrogation, et ce qui se trouve dessous est entouré.

- Cliquez sur un bouton, un champ, un interrupteur, une poignée, un groupe du ruban ou la barre de titre d'une fenêtre. Il ne fait **pas** ce qu'il fait d'habitude. À la place, une petite fenêtre s'ouvre avec le nom de l'élément, un court résumé de la partie de ce guide qui en parle, jusqu'à deux autres endroits qui le mentionnent, et {{ui:interactiveHelp.open}}.
- L'aide concerne l'élément que vous avez désigné, pas toute la fenêtre autour. Un élément sans nom propre prend le plus proche autour de lui ; dans une fenêtre, il se rabat sur le point d'interrogation de cette fenêtre.
- {{ui:interactiveHelp.open}} ouvre le guide à cet endroit dans un nouvel onglet. La section y est entourée d'une couleur, de son titre jusqu'à sa fin, pour que vous voyiez où elle commence et s'arrête.
- Si le guide ne dit rien de l'élément, la fenêtre le dit et propose {{ui:interactiveHelp.search}}.
- [[Esc]], ou de nouveau le point d'interrogation, quitte le mode. Sur un écran tactile, il n'y a pas de survol : un appui sur un élément ouvre directement la fenêtre.

La fenêtre se déplace par sa barre de titre comme les autres. Le programme trouve la section grâce au nom de l'élément - l'intitulé d'un bouton, le nom d'un champ - parce que ce guide écrit chaque bouton comme il s'appelle dans le programme. Il le cherche avec la même recherche que la zone en haut de chaque page du guide, dans la langue que vous utilisez, et tout se passe dans votre navigateur.

{{shortcuts}}
