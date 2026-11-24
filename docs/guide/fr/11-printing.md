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

La plupart des profils d’imprimante proviennent d’OrcaSlicer. Si vous préférez travailler sans imprimante, choisissez {{ui:workspace.printerNone}}. Vous pouvez également définir manuellement la taille du plan de travail.

Les imprimantes delta, comme celles de FLSun ou de SeeMeCNC ou l'Anycubic Predator, impriment sur un plateau rond. Avec l'une d'elles, le plan de travail est rond lui aussi, aussi large que le plateau, et un corps est trop grand dès qu'il dépasse le bord. Un corps rond est mesuré sur son propre contour, pas sur la boîte qui l'entoure : un cylindre presque aussi large que le plateau y tient encore.

## Quand quelque chose ne va pas

Un corps qui dépasse du bord de la plaque d'impression est marqué. Un message vous indique quels côtés dépassent et de combien. Il en est de même si la pièce est **trop haute** : la hauteur compte à partir du corps le plus bas, au moment même où le slicer dépose le modèle.

![La boîte est plus large que le lit d'impression du Bambu Lab A1 mini. Le message en bas indique de combien.](shot:printer-overhang)

L'avertissement ne vous empêche pas de travailler. C'est un indice pour que vous ne découvriez pas seulement dans la trancheuse que la pièce est trop grosse. Une pièce trop grande peut souvent être divisée : coupez-la en deux avec {{ui:editor.tool.split}} et imprimez les deux moitiés séparément.

Si vous rangez exprès des pièces à côté du plateau, cliquez sur la petite croix du message. L'avertissement disparaît alors pour exactement ces corps. Dès que l'un d'eux tient de nouveau et que vous le sortez plus tard, ou qu'un autre corps dépasse, le message revient. Les corps masqués ne comptent jamais, donc masquer les pièces rangées fonctionne aussi.

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

## Nervures de support pour une pièce inclinée

Une pièce imprimée inclinée sur une arête, à 45° par exemple, n'a souvent besoin d'aucun support : ses faces sont assez raides. Mais elle repose sur une arête fine et peut basculer. La {{ui:supportRib.title}} la tient : une fine nervure se place sous sa face inférieure à petite distance, sur un pied ovale, et de minuscules ponts la retiennent. Posez d'abord la pièce sur son arête, sur le plateau.

1. Sélectionnez la pièce et cliquez sur {{ui:supportRib.title}} dans le groupe {{ui:editor.section.splitShape}} du ruban, faites un clic droit sur la pièce ou trouvez-la avec [[Ctrl]]+[[K]].
2. Cliquez sur la face inférieure là où la nervure doit se trouver. La face doit regarder vers le bas, être inclinée entre 15° et 75° et descendre jusqu'au plateau ; la nervure descend tout droit le long de la face depuis votre clic. Si l'arête inférieure de la pièce est arrondie ou chanfreinée, la face peut s'arrêter jusqu'à 3 mm au-dessus du plateau : cliquez sur la face plane au-dessus de l'arrondi.
3. Réglez {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} et {{ui:supportRib.firstLayer}} comme dans votre slicer. La nervure fait deux lignes de buse d'épaisseur, l'écart avec la pièce une demi-ligne ; chaque pont fait une ligne de large et exactement une couche de haut, posé sur une couche de l'impression, pour que le slicer l'imprime comme une seule ligne fine qui se casse proprement. {{ui:supportRib.height}} indique jusqu'où la nervure monte le long de la face (à mi-hauteur au départ), {{ui:supportRib.bridgeSpacing}} l'écart entre les ponts, en couches entières.
4. Sous {{ui:supportRib.more}}, l'épaisseur, l'écart, la largeur des ponts et l'épaisseur du pied se règlent à la main (jusque-là ils suivent la buse et les couches), ainsi que la largeur du pied et les arrondis au pied et en haut. Avec {{ui:supportRib.bridgeGap}} au-dessus de 0, les ponts n’entrent plus dans la pièce mais s’arrêtent à cette distance avant elle, mesurée dans la couche : le trancheur imprime alors chacun comme un trajet à part, qui tient la pièce par l’écrasement de sa ligne et se détache sans trace (une demi-ligne, 0,2 mm pour une buse de 0,4 mm, est un bon début). Augmentez aussi {{ui:supportRib.gap}}, pour que les ponts en franchissent encore une partie.
5. {{ui:supportRib.apply}} ajoute la nervure. Avec {{ui:supportRib.bundle}} (activé au départ), nervure et pièce sont regroupées : elles bougent ensemble et arrivent dans le slicer comme deux corps côte à côte, reliés par les ponts à l'impression.

La nervure est un corps maillé : pour la modifier, supprimez-la et refaites-la. Chaque clic crée une nervure ; pour d'autres, cliquez sur {{ui:supportRib.repick}} ou répétez-la avec {{ui:editor.tool.array}}. La nervure ne doit entrer nulle part dans la pièce, et la pièce doit reposer sur le plateau - sinon la fenêtre dit pourquoi. Vos réglages sont gardés dans ce navigateur pour la prochaine nervure.

{{ui:clearance.title}} et {{ui:printCheck.title}} connaissent la nervure : que ses ponts entrent dans la pièce, et que la nervure et ses ponts soient fins et posés à une couche de hauteur au-dessus de l'écart, c'est voulu et ce n'est pas signalé. Une nervure faite avec layerling 1.148.0 ne porte pas encore cette marque ; refaites-la, et les vérifications la laissent de côté.

## Épaisseur de paroi, jeu et chanfreins

- Les parois doivent avoir une largeur d'au moins deux lignes d'extrusion, soit 0,8 mm avec une buse de 0,4 mm. Les pièces robustes ont besoin de 1,2 à 2 mm.
- Lorsque deux pièces s'emboîtent, vous avez besoin d'un jeu : généralement 0,2 à 0,4 mm, selon l'imprimante. Faites une petite paire de tests avant d'imprimer la grande partie.
- De nombreuses personnes chanfreinent légèrement le bord inférieur qui repose sur la plaque. Cela empêche la première couche de s'étendre (« pied d'éléphant »).

## Le jeu de votre imprimante : le test d'ajustement

Chaque imprimante imprime les trous un peu plus petits et les goupilles un peu plus épaisses que dessinés, chacune selon sa propre mesure ; le jeu dont deux pièces imprimées ont besoin n'est donc au départ qu'une estimation. Mesurez-le plutôt une fois : dans les réglages, sous {{ui:workspace.workplane}}, {{ui:workspace.fitTestMake}} pose un test d'ajustement sur le plateau. C'est une plaque de 60 × 20 × 4 mm avec sept trous pour une goupille de 5 mm, chacun dessiné à 5 mm plus deux fois 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 ou 0,40 mm, la valeur en relief à côté, et la goupille de 5 mm elle-même, debout à côté de la plaque, avec un petit chanfrein en haut. Il est fait de formes ordinaires, il s'imprime donc avec le reste du plateau, sans supports.

Sur une imprimante dont le plateau va et vient, la goupille haute et fine peut vaciller, se décoller ou sortir ondulée à sa base, avec ou sans bordure. Cochez {{ui:workspace.fitTestBase}} avant de créer le test d'ajustement : la goupille repose alors sur une petite plaque de 10 mm qui tient au plateau. Elle ne touche pas la paroi de son logement mais repose sur un petit ergot au fond ; après l'impression, faites-la basculer d'avant en arrière et elle se détache.

Imprimez-le tel qu'il est posé, puis enfoncez la goupille, côté chanfreiné en premier, dans les trous en commençant par le plus serré. **Le trou le plus serré dans lequel la goupille tourne encore** donne le jeu de votre imprimante. Saisissez sa valeur sous {{ui:workspace.printerPlay}} ou cliquez-la parmi les valeurs sous le champ. Le jeu s'entend par côté, en millimètres, et le navigateur le garde pour tous les motifs ; un champ vide signifie non mesuré.
Avec plusieurs imprimantes, choisissez d'abord sous {{ui:workspace.printer}} celle sur laquelle vous imprimez : chaque imprimante garde son propre jeu, et les nouveaux usages partent du jeu de l'imprimante choisie pour le modèle. Une imprimante sans jeu propre prend le jeu réglé quand aucune imprimante n'était choisie.

Dès lors, les nouvelles utilisations partent du jeu au lieu de la valeur intégrée : {{ui:lid.gap}} et {{ui:lid.hingePinPlay}} dans l'outil {{ui:editor.tool.lid}}, le jeu d'une nouvelle forme {{ui:shape.dovetail}} ou {{ui:shape.snapFit}}, {{ui:prop.clearance}} d'un nouvel écrou ou trou taraudé – deux fois le jeu, puisque c'est la place sur tout le diamètre – et {{ui:clearance.threshold}} dans {{ui:editor.tool.clearance}}. De même pour le {{ui:split.connectorClearance}} des goujons, des tenons et des queues d'aronde dans {{ui:editor.tool.split}}. Tant qu'un tel champ garde cette valeur, « {{ui:printerPlay.fromFitTest}} » à côté indique d'où vient le nombre. Une charnière imprimée en place et les articulations de l'outil {{ui:editor.tool.flexi}} gardent leurs 0,4 mm : imprimées d'une seule pièce, leurs interstices doivent aussi rester ouverts entre les couches, ce qu'une goupille imprimée à part ne mesure pas. La place pour enfoncer un aimant ou une clé Gridfinity et celle pour une prise ou une carte achetée gardent aussi leurs propres valeurs. Les corps déjà présents dans un motif ne changent jamais, pas plus qu'un motif que vous ouvrez.

## Contrôler les dimensions sur papier

Une pièce qui doit s'adapter à quelque chose - un ventilateur, une carte, un schéma de trous - se contrôle vite sur papier avant l'impression 3D. Une feuille prend quelques secondes ; une impression d'essai coûte du temps et du filament, et si une cote est fausse, il faut recommencer.

1. Sélectionnez la pièce, cliquez sur {{ui:editor.export}} et choisissez le format **2D**, puis PDF.
2. Sous {{ui:export.drawing.paper}}, choisissez le papier de votre imprimante, A4, A3, US Letter ou US Tabloid. Un dessin plus grand est réparti sur plusieurs pages.
3. Imprimez à 100 % ou en « taille réelle », jamais « ajuster à la page ».
4. Mesurez une cote globale sur la feuille avec une règle. Si elle correspond au nombre indiqué, l'impression est à l'échelle : posez la vraie pièce dessus.

Le papier ne montre pas les écarts de votre imprimante 3D : le plastique rétrécit un peu et les trous sont plus serrés. Le test d'ajustement plus haut le montre. Plus sur le dessin dans [Fichiers, sauvegarde et partage](chapter:files-and-saving).

## Vérifier l'impression

{{ui:editor.tool.printCheck}}, à côté de {{ui:editor.tool.clearance}} dans {{ui:editor.group.combine}}, examine les objets sélectionnés, ou tous les objets visibles si rien n'est sélectionné, et dit dans une fenêtre ce qui raterait à l'impression. Chacune de ses cinq lignes est verte quand elle n'a rien trouvé, et orange avec quoi et où dans le cas contraire :

- **{{ui:printCheck.thin.title}}** : les endroits plus fins que deux lignes de la buse - 0,8 mm avec une buse de 0,4 mm. Le trancheur omet une telle paroi ou l'imprime en une seule ligne fragile. Choisissez votre buse sous {{ui:printCheck.nozzle}} en haut de la fenêtre (de 0,2 à 0,8 en un clic, toute autre dans le champ). Les endroits fins sont peints en rouge avec une grille claire sur les corps, et la ligne indique l'endroit le plus fin et la surface trop fine. Les endroits de moins de 1 mm² et les arêtes vives, comme celle d'un coin, sont ignorés.
- **{{ui:printCheck.floating.title}}** : un corps, ou une pièce séparée d'un corps, qui ne touche ni le plateau ni une autre pièce (à 0,05 mm près). Il serait imprimé dans le vide. Une pièce posée sur une pièce qui tient debout ne pose pas de problème.
- **{{ui:printCheck.contact.title}}** : une pièce sur le plateau dont la première couche est très petite pour sa hauteur, comme une sphère ou un cône sur sa pointe. Elle peut se décoller pendant l'impression. L'avertissement vient sous 0,5 mm² d'appui, mesuré à 0,1 mm au-dessus du plateau, par millimètre de hauteur : une sphère est toujours en dessous, un cube de 10 mm a 10.
- **{{ui:printCheck.overhang.title}}** : les mêmes chiffres que **Afficher les surplombs**, avec l'angle réglé là.
- **{{ui:printCheck.openMesh.title}}** : un maillage importé avec des arêtes ouvertes, ou des arêtes partagées par trois faces ou plus. Le trancheur doit alors deviner où est l'intérieur.

![Un bac dont la paroi droite ne fait que 0,6 mm : Vérifier l'impression la peint en rouge et la signale dans la fenêtre.](shot:print-check)

{{ui:printCheck.show}} sur une ligne y amène la caméra ; il sélectionne les pièces en l'air, celles qui reposent sur trop peu et les maillages ouverts, et pour les surplombs il active **Afficher les surplombs**. Les corps qui se chevauchent sont vérifiés réunis, comme le trancheur les réunit. Si vous modifiez le modèle pendant que la fenêtre est ouverte, elle affiche {{ui:printCheck.stale}} ; cliquez dessus ou sur {{ui:printCheck.checkAgain}}. [[Esc]] ferme la fenêtre. Rien ne change dans le modèle. Une IA fait la même vérification avec `layerling_check_print`. La fenêtre ne fait que vérifier, elle n'imprime ni n'enregistre rien : pour imprimer, exportez le modèle pour votre trancheur avec {{ui:editor.export}} dans le groupe {{ui:editor.group.file}}. {{ui:printCheck.openExport}} dans la fenêtre ferme la vérification et ouvre l'export.

### Analyse d'impression et vue des couches

{{ui:editor.tool.layerCheck}}, à côté de {{ui:editor.tool.printCheck}}, va un pas plus loin : il découpe les objets sélectionnés (ou tous les objets visibles) en couches telles que votre imprimante les dépose et compare chaque couche à celle du dessous, en une seule fois. Vous n'avez pas à feuilleter les couches pour trouver un problème : la fenêtre énumère ses **constats**, d'abord les problèmes (rouge), puis les remarques (jaune), de bas en haut. Chaque ligne dit où et à quel point, par exemple « Couches 83–97 (16,6–19,4 mm) : Surplomb 62°, 1,4 cm² », et ce qui aide. Des couches successives avec le même problème au même endroit forment un seul constat.

Avant de regarder les couches, il vérifie l'ensemble : une pièce qui entre dans le plateau ({{ui:finding.kind.inBed}} ; les couches sous le plan de travail ne sont pas comptées), une pièce qui flotte au-dessus, un maillage qui n'est pas fermé, une pièce plus grande que l'imprimante choisie dans les réglages. Puis, couche par couche : {{ui:finding.kind.unsupported}} (un endroit qui commence sans rien en dessous, comme les bras d'un T), {{ui:finding.kind.overhang}} (remarque à partir de 45°, problème à partir de 60° par rapport à la verticale), {{ui:finding.kind.bridge}} (remarque à partir d'une portée de 10 mm), {{ui:finding.kind.thinWall}} (moins de deux lignes de la buse), {{ui:finding.kind.smallIsland}} (un endroit séparé de moins de 2 mm² qui se poursuit sur 2 mm ou plus) et {{ui:finding.kind.adhesion}}. Choisissez {{ui:layerCheck.layerHeight}} et {{ui:layerCheck.nozzle}} en haut ; les seuils sont sous {{ui:layerCheck.advanced}}. Les endroits de moins de 0,05 mm², comme une pointe ou la dernière couche, ne sont pas évalués. La vérification tourne en arrière-plan avec une barre ; {{ui:layerCheck.stop}} l'arrête aussitôt.

Cliquez sur un constat : la **vue des couches** s'ouvre à la première couche concernée, la caméra va à l'endroit, l'endroit est peint en rouge ou en jaune sur la couche, et les couches du dessous restent visibles. Le curseur se tient debout à côté d'un profil de la section sur toute la hauteur ; des repères sur son côté montrent où se trouvent les constats, un clic sur l'un d'eux y saute. Sur le curseur, [[↑]] et [[↓]] avancent d'une couche, [[Page Up]] et [[Page Down]] de dix, [[Home]] et [[End]] vont aux extrémités, [[Espace]] lance la lecture, [[N]] passe au constat suivant et [[Shift]]+[[N]] au précédent. {{ui:layerCheck.view.mode}} montre {{ui:layerCheck.view.mode.upTo}}, {{ui:layerCheck.view.mode.only}} ou {{ui:layerCheck.view.mode.range}} ; les couches encore à venir peuvent apparaître comme une ombre légère. Là où Layerling a un outil pour le constat, un bouton l'ouvre : {{ui:finding.action.dropToPlate}}, {{ui:finding.action.layFlat}} ou {{ui:finding.action.supportRib}}. Après une modification, la liste est marquée comme périmée jusqu'à ce que vous cliquiez sur {{ui:layerCheck.checkAgain}}. Fermer la fenêtre remet la caméra où elle était. Ce n'est pas un aperçu du trancheur : les supports, le remplissage et la durée d'impression viennent de votre trancheur.

## Quand tu es prêt

Choisissez {{ui:editor.export}} puis **STL** ou **3MF**. STL est le format le plus simple. 3MF conserve les noms et les couleurs des corps individuels et est donc pratique lorsque vous imprimez en plusieurs couleurs. La fenêtre d'exportation indique également combien de grammes et de mètres de filament la pièce nécessiterait pour être imprimée. Plus d'informations dans [Fichiers et sauvegarde](chapter:files-and-saving).
