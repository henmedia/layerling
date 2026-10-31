---
title: Préparation à l'impression 3D
summary: Choisir sa propre imprimante, être averti lorsque quelque chose ne rentre pas et poser la pièce correctement.
---

## Choisir votre imprimante

Ouvrez les paramètres (la roue dentée dans la ligne de titre, {{ui:editor.workspaceSettings}}) et passez à la zone {{ui:workspace.workplane}}. Sous {{ui:workspace.printer}}, vous choisissez votre imprimante parmi une liste de plus de 230 modèles courants, dont Bambu Lab, Prusa, Creality, Anycubic, Elegoo et bien d'autres.

![Les paramètres du plan de travail avec une imprimante choisie. Le lit d'impression et la hauteur d'impression maximale proviennent du profil de trancheuse.](shot:settings-workplane)

Trois choses se produisent :

- Le plan de travail prend la taille du lit d'impression.
- Dans le coin du plan de travail apparaissent le nom de l'imprimante et son volume de fabrication. Si l'écriture gêne, désactivez-la avec {{ui:workspace.showPlateLabels}} sous {{ui:workspace.workplane}} ; cela vaut également pour le nom du design à l’avant gauche.
- layerling **avertit** quand quelque chose ne rentre pas.

Les profils d'imprimante proviennent d'OrcaSlicer, ce sont donc les mêmes que ceux que votre slicer connaît. Si vous préférez travailler sans imprimante, choisissez {{ui:workspace.printerNone}}. Vous pouvez également définir manuellement la taille du plan de travail.

Les imprimantes delta, comme celles de FLSun ou de SeeMeCNC ou l'Anycubic Predator, impriment sur un plateau rond. Avec l'une d'elles, le plan de travail est rond lui aussi, aussi large que le plateau, et un corps est trop grand dès qu'il dépasse le bord. Un corps rond est mesuré sur son propre contour, pas sur la boîte qui l'entoure : un cylindre presque aussi large que le plateau y tient encore.

## Quand quelque chose ne va pas

Un corps qui dépasse du bord de la plaque d'impression est marqué. Un message vous indique quels côtés dépassent et de combien. Il en est de même si la pièce est **trop haute** : la hauteur compte à partir du corps le plus bas, au moment même où le slicer dépose le modèle.

![La boîte est plus large que le lit d'impression du Bambu Lab A1 mini. Le message en bas indique de combien.](shot:printer-overhang)

L'avertissement ne vous empêche pas de travailler. C'est un indice pour que vous ne découvriez pas seulement dans la trancheuse que la pièce est trop grosse. Une pièce trop grande peut souvent être divisée : coupez-la en deux avec {{ui:editor.tool.split}} et imprimez les deux moitiés séparément.

## Poser correctement la pièce

La façon dont une pièce repose sur la plaque détermine sa résistance et son apparence. Deux outils dans la zone {{ui:editor.group.arrange}} aident :

- {{ui:editor.tool.layFlat}} : cliquez sur une face et la pièce repose avec ce côté vers le bas. La meilleure direction d'impression en un clic.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]) : place la pièce sur le plan de travail lorsqu'elle flotte quelque part dans les airs.

Quelques règles empiriques pour la direction :

- Grand plat face vers le bas. Ce sont eux qui collent le mieux.
- Poser les pièces longues et chargées de manière à ce que les couches ne soient pas perpendiculaires à la charge. Les couches sont la direction la plus faible.
- Eviter les surplombs supérieurs à 45°, ou leur donner des appuis dans la trancheuse.

## Trouver les surplombs

Dans le menu à côté de l'œil ({{ui:editor.group.visibility}}), **Afficher les surplombs** active les surplombs. Chaque face qui pointe vers le bas à plus de 45° est alors hachurée en rouge et blanc - c'est là que l'imprimante aurait besoin de supports. Ce qui reste sur l'assiette reste clair. Ainsi, vous voyez en concevant si une sphère, un arc ou un trou horizontal s'imprime sans supports ; le [trou en forme de larme](chapter:threads-and-mechanics) est fait exactement pour cela. Tournez la pièce ou posez-la sur une autre face avec {{ui:editor.tool.layFlat}}, et les hachures suivent immédiatement.

La pente que gère votre imprimante est définie dans les paramètres sous {{ui:workspace.appearance}} : de 30° (attention) à 70° (pour les imprimantes avec un bon refroidissement des pièces). Une face posée sur un autre corps est encore marquée – layerling ne regarde que la face elle-même.

## Épaisseur de paroi, jeu et chanfreins

- Les parois doivent avoir une largeur d'au moins deux lignes d'extrusion, soit 0,8 mm avec une buse de 0,4 mm. Les pièces robustes ont besoin de 1,2 à 2 mm.
- Lorsque deux pièces s'emboîtent, vous avez besoin d'un jeu : généralement 0,2 à 0,4 mm, selon l'imprimante. Faites une petite paire de tests avant d'imprimer la grande partie.
- De nombreuses personnes chanfreinent légèrement le bord inférieur qui repose sur la plaque. Cela empêche la première couche de s'étendre (« pied d'éléphant »).

## Quand tu es prêt

Choisissez {{ui:editor.export}} puis **STL** ou **3MF**. STL est le format le plus simple. 3MF conserve les noms et les couleurs des corps individuels et est donc pratique lorsque vous imprimez en plusieurs couleurs. La fenêtre d'exportation indique également combien de grammes et de mètres de filament la pièce nécessiterait pour être imprimée. Plus d'informations dans [Fichiers et sauvegarde](chapter:files-and-saving).
