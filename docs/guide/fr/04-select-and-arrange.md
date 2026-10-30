---
title: Choisir et organiser
summary: Sélectionner des formes, les trouver dans la liste d'objets, les aligner, les refléter, les faire pivoter, les poser à plat sur un visage et les multiplier en motifs.
---

## Sélection

Un clic sur une forme la sélectionne. Avec [[Shift]], vous en ajoutez ou en supprimez. Tant que [[Shift]] est maintenu et que deux formes ou plus sont sélectionnées, un petit nombre sous le pointeur de la souris les compte. Un clic sur un espace vide efface la sélection, tout comme [[Esc]]. Faites glisser un cadre sur le plan de travail vide pour sélectionner tout ce qu'il touche ; avec [[Shift]] maintenu, le cadre ajoute ce qui n'a pas été sélectionné et supprime ce qui l'était. Et [[Ctrl]]+[[A]] sélectionne tous les corps visibles. Pendant que tu fais glisser un corps ou une poignée du cadre, [[Esc]] annule tant que le bouton de la souris est encore enfoncé : tout revient comme avant, et rien n'est ajouté à l'historique.

Qu'est-ce qui vous gêne ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Les formes cachées restent dans la conception, elles ne sont tout simplement pas visibles et ne sont pas exportées ; la fenêtre d'export indique à l'avance combien il y en a. [[Ctrl]]+[[Shift]]+[[H]] les ramène tous. Ce qui doit rester, vous le verrouillez avec le cadenas en haut des paramètres ou avec [[Ctrl]]+[[L]]. Une forme verrouillée ne peut pas être déplacée, redimensionnée, tournée, recolorée ou supprimée : ses poignées deviennent grises, un cadenas apparaît à côté de la flèche en haut et les outils qui permettraient de la modifier sont grisés. Le survol d'une poignée affiche toujours ses tailles, et une clé qui la modifierait indique "Objet verrouillé". Tant qu'une forme verrouillée est dans la sélection, rien ne change non plus pour les autres. Masquer, renommer, copier et dupliquer fonctionne toujours.

Un nombre sur le bouton du groupe {{ui:editor.group.visibility}} indique combien de formes sont masquées, et un clic dessus les affiche toutes de nouveau. Un dessin ouvert avec des formes masquées le signale une fois, avec un bouton pour les afficher.

## La liste des objets

Avec de nombreuses pièces, il est facile de perdre le fil de la vue. La liste d'objets ({{ui:editor.tool.showOutliner}} ou [[Ctrl]]+[[Shift]]+[[O]]) affiche toutes les formes sous forme de liste.

![La liste d'objets : le groupe "Groupe" avec deux parties et une sphère à côté. Une icône de dossier ouvre le groupe.](shot:object-list)

- Un clic sur une entrée sélectionne la forme, y compris les pièces à l'intérieur d'un groupe. Avec [[Shift]] maintenu, vous ajoutez ou supprimez d'autres entrées, comme dans la vue. Les flèches plient les groupes pour s'ouvrir et se fermer.
- L'étiquette indique si une pièce est {{ui:outliner.solid}} ou {{ui:outliner.hole}}.
- Cadenas et œillet de verrouillage et cache pièces détachées.
- {{ui:outliner.rename}} donne à une pièce un nom qui lui est propre ; le crayon à côté du nom en haut des paramètres fait de même pour la forme sélectionnée. Les noms sensés aident énormément dans les conceptions plus grandes.
- Le champ de recherche trouve les formes par nom et par genre, donc aussi "cylindre" ou "trou". Il examine également l'intérieur des groupes, aussi profondément imbriqués soient-ils : un groupe détenant une allumette reste dans la liste et s'ouvre pour montrer les parties correspondantes et les groupes qui y mènent. Un groupe trouvé par son propre nom affiche toutes ses parties lorsque vous l'ouvrez.
- La flèche à l'extrême gauche de la barre de titre replie la liste jusqu'à sa barre de titre et inversement.

La liste est ancrée juste à droite du cube de visualisation. Faites-le glisser par sa barre de titre pour le placer n'importe où sur le plan de travail ; il passe sous le cube de visualisation et la barre de caméra. Déposez-le à côté du cube de visualisation ou double-cliquez sur la barre de titre et il s'ancre à nouveau. L'endroit où il se trouvait et s'il a été plié sont mémorisés dans ce navigateur.

## Saisir une position

La carte {{ui:inspector.position}} dans le panneau des propriétés montre où se trouve le corps sélectionné, et vous pouvez le saisir : {{ui:prop.positionX}} et {{ui:prop.positionY}} sont le milieu de sa boîte sur la plaque, avec les mêmes signes que les distances indiquées sur le plan de travail, et {{ui:prop.positionZ}} est la hauteur de sa face inférieure. X compte vers la droite, Y vers l'arrière et Z vers le haut, selon la règle de droite comme dans les programmes Tinkercad et CAO ; les flèches d'axe sur la plaque indiquent les directions. Les valeurs vont dans l'unité que vous avez définie et les curseurs vont aussi loin que le glisser.

## Pièces de stationnement à côté de la plaque

Vous pouvez faire glisser une forme au-delà du bord de la plaque et la laisser là, environ une largeur de plaque au-delà de chaque côté, pour la conserver pour plus tard. Les touches fléchées le déplacent aussi loin que vous le souhaitez. Une pièce garée fait toujours partie de la conception et est exportée avec tout le reste. Pour le laisser de côté, masquez-le ou exportez uniquement la sélection. Si vous avez choisi une imprimante, layerling vous avertit lors de l'exportation lorsque quelque chose se trouve en dehors de sa plaque.

## Capturer en bougeant

Lorsque vous faites glisser une forme sur le plan de travail, elle s'aligne sur d'autres formes : son bord gauche, droit, avant ou arrière ou son centre atterrit exactement sur un bord ou le centre d'une autre forme. Une ligne de guidage rose montre à quoi il s'accroche. De cette façon, deux pièces sont alignées côte à côte ou centrées l’une derrière l’autre sans taper de chiffres. Cela fonctionne également avec le réseau éteint.

Maintenez [[Shift]] tout en faisant glisser pour conserver le déplacement sur un axe : la forme suit la direction, X ou Y, dans laquelle vous avez tiré plus loin et laisse l'autre seule. Il est préférable d'appuyer sur [[Shift]] une fois que vous faites déjà glisser ; sur une forme qui n'est pas encore sélectionnée, un clic avec [[Shift]] ne fait que l'ajouter à la sélection.

Avec [[Alt]] déjà maintenu lorsque le glisser commence, vous faites glisser une copie, comme dans Tinkercad : la forme reste là où elle est et la copie atterrit là où vous la lâchez. Appuyer sur [[Alt]] uniquement en cours de route interrompt la capture ; la forme suit alors uniquement la grille. Une copie également ne se prend qu'une fois que vous lâchez [[Alt]] en cours de route. Pour désactiver définitivement l'accrochage, utilisez le menu grille en bas à droite ({{ui:inspector.objectSnap}}) ou les paramètres. Pour l'instant, déplacez-vous uniquement sur les accrochages normaux du plan de travail, sans soulever ni redimensionner.

## Alignement

Deux formes sélectionnées ou plus sont alignées avec {{ui:editor.tool.align}} : des points apparaissent autour de la sélection pour la gauche, le centre et la droite, l'avant, le centre et l'arrière, et le haut, le centre et le bas. Un clic sur un point y déplace toutes les formes. Si vous cliquez d'abord sur l'une des formes sélectionnées, elle reste en place et les autres s'alignent avec elle. Une forme verrouillée dans la sélection est cette forme fixe en elle-même.

Une forme tournée selon un angle, disons de 45°, a sa boîte autour d'elle pour s'aligner, et non ses propres bords. Pour aligner les bords, définissez d'abord un plan de travail sur une face de cette forme ({{ui:camera.placeWorkplane}}, puis cliquez sur la face) : les points se trouvent ensuite sur les axes de ce plan, et les formes sont mesurées et déplacées le long d'eux, comme dans Tinkercad. Réinitialisez le plan de travail pour l'aligner à nouveau le long de la plaque.

![Align affiche les cibles possibles sous forme de points autour de la sélection.](shot:align)

La clé est [[L]]. [[Esc]] annule.

## Mise en miroir

{{ui:editor.tool.mirror}} ([[M]], ou cliquez avec le bouton droit sur la sélection et choisissez-la) retourne la sélection sur un plan : {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} ou {{ui:mirror.topBottom}}. Cliquez sur la flèche de l'axe correspondant. C'est pratique pour les pièces symétriques : construisez une moitié, copiez-la et mettez la copie en miroir.

## Rotation et réglage du pivot

Vous faites pivoter avec les flèches courbes sur la forme, avec les chiffres dans les paramètres ou avec [[R]] par pas de 45°. Lorsque vous faites glisser le cercle de rotation, le virage s'accroche à chaque tick, c'est-à-dire tous les 22,5° ; maintenez [[Shift]] pour des pas plus fins, et des graduations supplémentaires apparaissent tous les 11,25°. Faites glisser en dehors du cercle pour tourner librement par pas de 1°, ou par pas de 45° avec [[Shift]]. Normalement, la sélection tourne autour de son centre. Parfois, cela ne devrait pas être le cas, par exemple lorsqu'un tube incliné doit être tourné davantage à son extrémité. Pour cela il y a {{ui:editor.tool.rotationPivot}} : cliquez ensuite sur une face. Une face plane fournit son centre, par exemple l'axe d'une extrémité de tube. Sur un groupe ou un bundle, la face se prolonge sur les pièces qui se touchent, comme sur un seul corps, et le pivot va au milieu de toute la face une fois les pièces réunies, sauf sur un groupe ou un bundle contenant du texte, ou un bundle contenant un trou. La sélection tourne désormais autour de ce point. Un deuxième clic sur l'outil le supprime à nouveau.

Les angles restent avec le corps. Dans ses paramètres, {{ui:inspector.rotation}} les affiche comme {{ui:prop.rotateX}}, {{ui:prop.rotateY}} et {{ui:prop.rotateZ}}, nommés comme la position : Y traverse la plaque, Z est en haut. Tapez ici un angle et le corps se tourne vers lui - autour de son centre, ou autour de son propre pivot s'il en a un. Lorsqu'un corps tourné est sélectionné, ses angles s'affichent également en dessous sur le plan de travail ; {{ui:workspace.showRotationAngles}} dans les paramètres désactive cela.

![Un corps tourné autour de deux axes : ses angles se trouvent en dessous, et la carte Rotation dans ses paramètres les prend comme des nombres.](shot:rotation-card)

Avec **un corps** sélectionné, le pivot appartient à ce corps : sélectionnez d'autres parties et revenez, et il est toujours là. Il bouge, tourne et évolue avec le corps, est enregistré dans le projet et revient avec Annuler. Sous {{ui:inspector.position}}, le pivot a ses propres X, Y et Z, que vous pouvez saisir ou déplacer, et {{ui:inspector.pivotRemove}} le supprime. Vous pouvez également faire glisser le marqueur rouge du pivot avec la souris : il glisse sur la surface des corps et s'accroche aux coins, aux milieux et aux bords des bords, de sorte qu'un axe de charnière atterrit exactement sur un coin. Avec plusieurs corps sélectionnés, le pivot concerne uniquement cette sélection et une nouvelle sélection le supprime. Les grouper ou les lier le conserve : le groupe reprend le pivot comme le sien, avec X, Y et Z sous {{ui:inspector.position}}.

## Posé à plat sur un visage

Une pièce doit-elle se trouver sur son meilleur côté pour l’impression ? Sélectionnez-le, cliquez sur {{ui:editor.tool.layFlat}} puis sur le visage qui doit descendre. Pendant que vous déplacez le pointeur sur la pièce, la face située en dessous s'illumine, vous permettant ainsi de voir laquelle vous êtes sur le point de choisir ; tournez la vue pour vérifier les autres côtés. La pièce tourne pour que cette face repose sur le plan de travail.

Deux parties doivent-elles se rencontrer face à face ou s'aligner à égalité ? Sélectionnez la pièce qui doit bouger, cliquez sur {{ui:editor.tool.mateFaces}}, puis cliquez sur sa face et ensuite sur la face de l'autre pièce. Dans le panneau, {{ui:mate.mode.against}} place les faces les unes contre les autres (dos à dos, en contact), {{ui:mate.mode.flush}} les dispose dans un plan côte à côte ; {{ui:mate.gap}} laisse de la place entre eux, par exemple pour le dégagement. {{ui:mate.apply}} déplace la pièce : elle tourne du plus court chemin jusqu'à ce que les faces soient parallèles - pas du tout si elles le sont déjà - puis glisse uniquement vers l'autre face, elle garde donc sa place latéralement. L'autre partie reste là où elle est et une annulation reprend tout cela.

![Le panneau Aligner les faces : la pièce qui bouge est sélectionnée, une face de l'autre pièce vient ensuite, puis face à face ou à fleur, et un espace optionnel.](shot:mate-faces)

**Des trous sur un même axe :** {{ui:mate.mode.concentric}} aligne plutôt des faces rondes : un trou sur un trou, un tenon dans un trou, une vis dans son trou de passage. Choisissez-le avant de cliquer sur les faces. Cliquez ensuite l'intérieur rond d'un trou (ou l'extérieur d'un tenon) sur la pièce qui bouge, puis une face ronde de l'autre pièce ; toute la face ronde s'allume sous le pointeur. {{ui:mate.apply}} tourne la pièce au plus court jusqu'à ce que les deux axes soient parallèles, puis la glisse en travers sur l'autre axe. Le long de l'axe, elle reste où elle était : un tenon garde sa hauteur, enfoncez-le ensuite. Cela marche aussi sur les maillages importés, tant que le trou est fait de facettes autour d'un axe.

**Un angle exact entre deux faces :** {{ui:editor.tool.mateFaces}} laisse les faces parallèles ; il n'y a pas d'outil dédié pour définir un angle entre elles, mais cette méthode y parvient. Amenez d'abord les faces ensemble avec {{ui:editor.tool.mateFaces}} afin qu'elles soient parallèles. Placez ensuite le pivot sur l'arête où elles se rencontrent ({{ui:editor.tool.rotationPivot}}, cliquez sur l'arête ou un coin) et saisissez l'angle souhaité (par exemple 15 ou 30) dans la carte {{ui:inspector.rotation}} de la pièce. Elle tourne autour de ce pivot. Les axes de la carte correspondent à ceux du plateau, cela fonctionne donc lorsque l'arête suit l'axe X, Y ou Z.

{{ui:editor.tool.dropToWorkplane}} ([[D]]), qui dépose la sélection sur le plan de travail, et {{ui:editor.tool.centerOnWorkplane}} sont tout aussi simples.

[[C]] reprend la sélection, comme Cruise dans Tinkercad : il suit le pointeur de la souris et se couche sur le visage d'un autre corps sur lequel vous vous trouvez, incliné également. Un clic le dépose là, [[Esc]] le laisse là où il était. Son dessous repose alors sur le visage, aligné avec les bords du visage comme le serait une nouvelle forme ; il garde son propre tour autour de son axe ascendant. Plusieurs pièces voyagent ensemble et gardent leur espacement. Au-dessus de la plaque vide, [[C]] place à nouveau une pièce inclinée à la verticale sur le plan de travail.

## Modèles : rangée et cercle

Pour les grilles de trous, les cercles de boulons et les anneaux de dents, il existe le {{ui:editor.tool.array}}. Sélectionnez les formes à multiplier et cliquez dessus dans le ruban.

![Le motif en mode "Cercle" : les copies apparaissent d'abord en aperçu.](shot:pattern-tool)

- **{{ui:array.mode.row}} :** La sélection est répétée à distances égales. La rangée suit les trois axes à la fois, avec {{ui:array.spacingX}}, {{ui:array.spacingY}} et {{ui:array.spacingZ}} : l'un d'eux donne une rangée droite, deux ou trois une rangée diagonale ou un escalier. Un espacement négatif place la rangée dans l’autre sens.
- **{{ui:array.fit}} :** Pour des trous le long d'une plaque, un porte-clés ou un portemanteau. Pose la première pièce sur ou dans le corps, choisis {{ui:array.fit.x}} ou {{ui:array.fit.y}} et règle l'{{ui:array.fitGap}} : l'original se décale d'autant depuis le bout le plus proche (du bord au côté de la pièce), et la dernière copie garde le même écart jusqu'à l'autre bout. L'espacement suit alors le {{ui:array.count}} : cinq trous ou neuf, ils remplissent toujours la plaque régulièrement.
- **{{ui:array.mode.circle}} :** La sélection est répartie autour d'un centre. Combien de copies avez-vous défini sous {{ui:array.count}}, et {{ui:array.angle}} fait 360° pour un cercle complet. Choisissez si les copies tournent. {{ui:array.rise}} soulève chaque copie un peu plus que la précédente (une vis ou une spirale ascendante), et {{ui:array.radiusChange}} l'éloigne du centre ou la rapproche de celui-ci (une spirale plate) ; ensemble, ils donnent une spirale conique. Une spirale ne fait qu'un tour au plus : un angle supérieur à 360° compte comme un cercle complet, et il y a au plus 100 copies.

Astuce : placez d'abord le pivot sur une face avec {{ui:editor.tool.rotationPivot}}, puis le centre du cercle se trouve exactement là.

![Le motif en mode "Cercle" avec une montée et un changement de rayon par exemplaire : les exemplaires grimpent et s'élargissent comme une spirale.](shot:pattern-spiral)

Les copies apparaissent d'abord sous forme d'aperçu. Seul {{ui:array.apply}} les crée. Si les copies sont trouées, regroupez-les ensuite avec le corps dans lequel elles doivent être découpées.

## Motif de trous sur un visage

Pour les évents, les grilles d'enceintes, les paniers et les enceintes, le {{ui:holePattern.title}} répartit les trous uniformément sur une face plane. Vous n'avez plus besoin de faire un trou, de le répéter et de le fixer au mur. Sélectionnez exactement un corps et cliquez sur {{ui:holePattern.title}} dans le groupe {{ui:editor.group.modify}} de la barre d'outils, à côté du motif. Vous pouvez également cliquer avec le bouton droit sur le corps ou le trouver avec [[Ctrl]]+[[K]].

1. Cliquez sur une face plate du corps. Toute la face plate autour de votre clic compte, pas seulement le triangle sous le pointeur. Une face incurvée ne fonctionne pas : vous obtenez un indice et cliquez sur une face plate à la place. Sur un groupe ou un bundle, une face se prolonge sur les pièces qui se touchent, comme sur un seul corps ; sur un bundle seulement si aucun trou n'en fait partie. Les pièces sont réunies peu après l'ouverture de l'outil ; jusque-là, seule la face d'une pièce s'allume sous le pointeur, et un clic attend qu'elles soient réunies. Sur un groupe ou un bundle contenant du texte, seule la face d'une pièce s'allume, et c'est le clic qui réunit les pièces.
2. Dans la fenêtre, définissez l'apparence et la position des trous :
   - **{{ui:holePattern.form}} :** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} ou {{ui:holePattern.form.slot}}.
   - **Taille :** le {{ui:holePattern.size.diameter}} d'un trou rond, le {{ui:holePattern.size.side}} d'un carré, {{ui:holePattern.size.width}} et {{ui:holePattern.size.height}} pour un rectangle et une fente. Pour l'hexagone, la taille est {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}} :** la distance entre le milieu d'un trou et le suivant. S'il est plus petit que ce que permettent les trous, layerling l'élève à la valeur la plus petite possible afin qu'un mur reste entre les trous.
   - **{{ui:holePattern.wall}} :** la même distance exprimée autrement : le mur laissé entre deux trous voisins, qui est l'épaisseur de la paroi dans l'impression. Réglez-le et l'espacement centre à centre suit, et inversement. Pour les hexagones, les rectangles et les fentes, layerling mesure la plus petite distance entre leurs bords.
   - **{{ui:holePattern.arrangement}} :** {{ui:holePattern.arrangement.grid}} place les trous en lignes et en colonnes. {{ui:holePattern.arrangement.staggered}} décale une rangée sur deux d'un demi-espacement et rapproche les rangées, de sorte que chaque trou ait des voisins à la même distance - avec des hexagones qui forment un nid d'abeilles.
   - **{{ui:holePattern.margin}} :** la distance libre entre les trous et le bord de la face. Seuls les trous qui se trouvent entièrement à l’intérieur du visage moins cette marge sont pratiqués ; tout ce qui pourrait aller au-delà est laissé de côté. La marge tient également autour des ouvertures du visage.
   - **{{ui:holePattern.depth}} :** {{ui:holePattern.depth.through}} (par défaut) coupe tout le mur. Avec {{ui:holePattern.depth.custom}}, vous donnez la profondeur en millimètres, par exemple pour les retraits.
3. Les trous s'affichent immédiatement sous forme d'aperçu sur le visage et suivent chaque valeur. La fenêtre indique combien de trous correspondent. {{ui:holePattern.repick}} choisit une autre face, [[Esc]] ferme l'outil et, comme les autres fenêtres d'outils, il se déplace par sa barre de titre.
4. Seul {{ui:holePattern.apply}} réalise les trous.

Les trous sont des trous ordinaires regroupés avec le corps, tout comme après {{ui:editor.tool.group}} : rien n'est cuit. {{ui:editor.tool.ungroup}} dissout à nouveau le groupe et libère chaque trou, que vous pouvez ensuite déplacer, modifier ou supprimer un par un. Le tout est une étape pour {{ui:editor.tool.undo}}. L'outil ne fait pas plus de 400 trous à la fois ; agrandissez ensuite les trous ou élargissez l'espacement.

Une IA peut faire la même chose via le pont MCP avec `layerling_perforate_face` (voir le chapitre [AI avec MCP](chapter:ai-with-mcp)).

## Tirer une face vers l'extérieur ou l'intérieur

Pour une paroi plus épaisse, un bossage sur une face ou une poche creusée dedans, l'outil {{ui:faceTool.title}} travaille sur une face plane. Il fonctionne aussi sur un STL importé, qui n'a pas d'esquisse à modifier. Sélectionnez exactement un corps et cliquez sur {{ui:faceTool.title}} dans le groupe {{ui:editor.group.modify}} de la barre d'outils, à côté du motif de trous. Vous pouvez également cliquer avec le bouton droit sur le corps ou le trouver avec [[Ctrl]]+[[K]].

1. Cliquez sur une face plane du corps. Comme pour le motif de trous, toute la face plane autour de votre clic compte ; une face courbe ne fonctionne pas. Sur un groupe ou un bundle, la face se prolonge sur les pièces qui se touchent, comme pour le motif de trous.
2. Dans la fenêtre :
   - **{{ui:faceTool.direction}} :** {{ui:faceTool.direction.out}} pour de la matière sur la face, ou {{ui:faceTool.direction.in}} pour une poche creusée dedans. Une poche ne va pas plus loin que le corps derrière la face ; dans un corps évidé, elle peut quand même atteindre la cavité.
   - **{{ui:faceTool.inset}} :** la distance entre le nouveau contour et le bord de la face. Vers l'extérieur, 0 prend toute la face, ce qui épaissit une paroi. Les ouvertures de la face s'agrandissent d'autant.
   - **{{ui:faceTool.radius}} :** arrondit chaque coin du contour, les coins intérieurs aussi, si bien qu'une pointe se termine par un arc. Une encoche plus étroite que deux fois le rayon se referme, et une partie de la face plus étroite que deux fois le retrait et le rayon réunis disparaît.
   - **{{ui:faceTool.depth}} :** la hauteur de la nouvelle pièce au-dessus de la face, ou la profondeur de la poche.
3. Le résultat s'affiche aussitôt en aperçu et suit chaque valeur. {{ui:faceTool.repick}} choisit une autre face, [[Esc]] ferme l'outil.
4. Seul {{ui:faceTool.apply}} le crée.

Ce que l'outil ajoute est un corps d'esquisse ordinaire, regroupé avec le corps : rien n'est figé. {{ui:group.edit}} ouvre le groupe, et {{ui:inspector.editSketch}} sur la nouvelle pièce montre le contour qu'elle suit. Sur le dessus ou le dessous d'un corps d'esquisse simple - une seule zone, ni regroupé, ni en miroir, ni effilé, ni vrillé, ni incliné, sans trait, anneau porte-clés, chanfrein ni congé - c'est le contour du corps lui-même, décalé vers l'intérieur à la construction, si bien que ses lignes et ses arcs restent exacts là où le noyau CAO peut les décaler, pour les outils d'arête et l'export STEP. Redimensionnée plus tard, la pièce garde son retrait. Sur toute autre face, un maillage importé compris, le contour suit les triangles de la face, et une courbe est faite de petits segments droits. Le tout est une étape pour {{ui:editor.tool.undo}}. Pour changer le retrait ou le rayon plus tard, annulez et relancez l'outil. Pour arrondir ensuite l'arête supérieure, utilisez {{ui:editor.tool.fillet}} avec {{ui:edge.topEdges}} sur le groupe en dernier : comme tout traitement d'arête sur un groupe, il fait du groupe un seul corps.

Une IA peut faire la même chose via le pont MCP avec `layerling_push_face` (voir le chapitre [AI avec MCP](chapter:ai-with-mcp)).

## Changer plusieurs pièces à la fois

Avec plusieurs pièces sélectionnées, le panneau des propriétés de droite montre combien il y en a et propose ce qui s'applique à toutes ensemble : {{ui:inspector.solid}} ou {{ui:inspector.hole}}, une couleur pour tous (un clic sur {{ui:inspector.solid}} ouvre les couleurs) et le verrou. Avec une sélection mixte, un clic les rend tous solides ou tous les trous. Si l'une des pièces est verrouillée, seul le verrou peut être utilisé. Les tailles sont modifiées avec les poignées, avec {{ui:scalePercent.title}} ou en tapant un nombre dans une étiquette de taille. Avec plusieurs parties, le nombre est la taille de la sélection entière : chaque partie grandit avec elle, les espaces entre elles aussi, comme lorsque vous faites glisser une poignée. Les solides et les trous fonctionnent également avec un clic droit ou avec les touches [[S]] et [[H]].

## Mise à l'échelle en pourcentage

Pour agrandir ou réduire une ou plusieurs parties d'un même partage, disons toutes les parties d'un fichier d'impression de 20 %, utilisez {{ui:scalePercent.title}}. Sélectionnez les pièces, cliquez dessus avec le bouton droit et choisissez {{ui:scalePercent.title}}, ou recherchez-la avec [[Ctrl]]+[[K]].

Sous {{ui:scalePercent.percent}}, vous saisissez la nouvelle taille en pourcentage de la taille actuelle : 120 % correspond à un cinquième de plus, 50 % à la moitié de la taille. La largeur, la profondeur et la hauteur changent de la même manière, donc les proportions restent. Le fond reste là où il est, donc rien ne coule dans l'assiette.

Avec plusieurs parties, vous choisissez comment elles poussent :

- **{{ui:scalePercent.mode.together}} :** Les parties grandissent autour de leur centre commun, et les écarts grandissent avec elles. Le tout s’agrandit comme s’il s’agissait d’une seule partie.
- **{{ui:scalePercent.mode.each}} :** Chaque pièce grandit là où elle se trouve, et les écarts entre elles restent les mêmes.

Seul {{ui:scalePercent.apply}} modifie la conception et un pas en arrière l'annule. Avec une pièce verrouillée dans la sélection elle ne s'ouvre pas.

## Annulation

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) et {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] ou [[Ctrl]]+[[Y]]) parcourent votre historique. Combien de pas parcourent le design enregistré que vous avez défini dans les paramètres sous {{ui:workspace.history}}. Pointez l'un des deux boutons : son info-bulle nomme l'étape qu'il annulerait ou rétablirait, avec la mesure lorsque l'étape en a une, par exemple « Arêtes de Box arrondies (5 mm) » ; le message qui suit dit la même chose. Pour revenir plusieurs étapes en arrière d'un coup, utilisez la vue de l'historique ci-dessous.

## Rétrospective : la vue historique

{{ui:editor.tool.history}}, à côté d'annuler et de refaire, ouvre une vue de votre historique sans rien changer. La zone de travail affiche le design tel qu'il était, et un curseur en bas parcourt chaque étape d'annulation : tout à droite se trouve l'état actuel, chaque étape à gauche est une annulation plus tôt et les états que vous avez annulés se trouvent à droite de l'étape actuelle. Les touches fléchées parcourent les états, [[Esc]] revient à l'état actuel. La molette au-dessus du curseur fait de même, un état par cran, vers le haut pour un état plus ancien ; [[Page Up]] et [[Page Down]] sautent dix états, [[Home]] va à l'état le plus ancien et [[End]] revient à l'état actuel. Pendant ce temps, vous pouvez tourner et zoomer sur la vue et cliquer sur des objets pour les ramener (voir plus bas), mais rien ne peut être déplacé ; le design lui-même reste exactement tel qu'il est. Si la barre recouvre quelque chose, faites-la glisser par sa barre de titre ; un double-clic dessus le ramène. Le bouton liste de la barre de titre affiche toutes les étapes par leur nom dans une liste, la plus récente en haut : un clic sur une étape va à cet état, l'état où se trouve le design est marqué {{ui:historyView.listNow}}, et les étapes annulées sont grisées. Si vous laissez la liste ouverte, elle le sera aussi la prochaine fois.

Deux choses que vous pouvez retenir d’un état antérieur. {{ui:historyView.createProject}} place cet état dans une nouvelle conception dans l'aperçu, nommée d'après celle-ci avec l'heure de cet état entre parenthèses - une conception enregistrée avant que layerling n'enregistre les dates indique "copier" à la place - et avec l'historique jusqu'à ce point, donc l'annulation continue de fonctionner là-bas. {{ui:historyView.export}} ouvre l'exportation habituelle avec cet état comme conception, vous pouvez donc l'enregistrer au format STL, 3MF, STEP, une image ou un fichier LYL avec l'historique jusqu'à cet état.

Vous pouvez aussi ramener des objets un par un dans la conception. Cliquez sur un objet de l'état affiché - [[Shift]]+clic en ajoute d'autres ou en retire un, un clic dans le vide ne choisit rien - puis choisissez {{ui:historyView.bringBack}}. La vue se ferme et une copie de chaque objet arrive dans la conception actuelle, exactement tel qu'il était dans cet état et à l'endroit où il se trouvait, sélectionnée, à côté de tout ce que la conception contient maintenant ; rien d'autre ne change. C'est une seule étape : l'annulation la reprend. Servez-vous-en pour la version d'une pièce modifiée depuis, ou d'une pièce supprimée. Un groupe revient en entier ; les notes et les points de référence d'un objet restent en arrière. Son nom porte l'heure de cet état, par exemple « Boîte (12:32) », pour le distinguer facilement de la version actuelle. Pour ramener une pièce qui se trouve dans un groupe, sélectionnez le groupe et choisissez {{ui:historyView.openGroup}} ou appuyez sur [[E]], comme dans la conception : ses pièces sont disposées là où la modification du groupe les placerait, prêtes à être choisies, et la barre indique dans quel groupe vous êtes. {{ui:historyView.backOut}} le referme. C'est seulement pour regarder - le groupe, la conception et l'historique restent tels quels.

{{ui:historyView.delete}} se trouve seul en bas à gauche de la barre. Après une question, il supprime définitivement toutes les étapes précédentes : la conception conserve l'état actuel (pas celui affiché), l'annulation n'a rien à quoi revenir et un fichier enregistré par la suite ne contient aucun historique. Utilisez-le pour partager un design sans son passé ou pour recommencer les étapes d'annulation. Cela ne peut pas être annulé ; pour partager un fichier sans toucher à votre propre design, choisissez plutôt {{ui:export.historyNone}} lors de l'exportation.
