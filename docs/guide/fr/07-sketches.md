---
title: Esquisses : du contour au corps
summary: Dessinez un contour plat, arrondissez ou chanfreinez ses coins et tirez-le ou faites-le tourner pour former un corps.
---

Tout ne peut pas être assemblé à partir de formes de base. Pour les pièces avec un contour propre, comme un support, un profil de dent ou un vase, vous dessinez d'abord le **contour**, puis vous en faites un corps. C'est à cela que sert le mode esquisse.

## Démarrer une esquisse

En haut, passez de {{ui:editor.modeGeometry}} à {{ui:editor.modeSketch}}. Cliquez sur {{ui:sketch.to3d}} dans le ruban et choisissez ce que doit devenir le contour :

- **{{ui:sketch.extrude}} :** Le contour est tiré vers le haut, comme un emporte-pièce.
- **{{ui:sketch.revolve}} :** Le contour tourne autour d'un axe, comme sur un tour. Cela donne des vases, des coupes, des cônes et tout ce qui est rond.
- **{{ui:sketch.sweep}} :** Le contour est tiré le long d'un chemin : un chemin de câbles avec un coude, une conduite, un anneau autour d'une forme. Voir plus bas Balayer le long d'un chemin.

L'éditeur affiche alors une feuille avec une grille. C'est votre surface de dessin.

## Dessin

Le ruban en mode esquisse est divisé en zones :

- **Dessin :** {{ui:sketch.line}} crée des sections droites : cliquez sur les points les uns après les autres ; maintenir [[Shift]] enclenche la nouvelle ligne par pas de 15°, horizontal et vertical inclus. La longueur et l'angle de la nouvelle ligne s'affichent sur le pointeur. Vous pouvez également saisir la longueur, voir [Lignes par numéros](#lignes-par-numeros). Le {{ui:sketch.bezier}} est façonné avec ses poignées : cliquez sur un point et faites glisser dans la direction où la ligne doit continuer, comme avec l'outil plume dans Illustrator ou Inkscape. Plus vous tirez loin, plus il se plie ; l'étirement jusqu'au nouveau point se courbe pendant que vous faites glisser, vous voyez donc ce que vous obtenez. Faire glisser pendant que vous placez un point plie la courbe ; si vous venez de Tinkercad et que vous souhaitez simplement cliquer sur des points, prenez le {{ui:sketch.smooth}}. Le {{ui:sketch.smooth}} trace un chemin fluide à travers les points sur lesquels vous cliquez. Pour fermer le contour, cliquez à nouveau sur le premier point à la fin. Pour terminer la suite de lignes sans fermer le contour, faites un clic droit sans bouger le pointeur, ou double-cliquez sur le dernier point.
- **Formes :** {{ui:sketch.addShape}} propose des contours prêts à l'emploi : {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (un disque avec des trous), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, un {{ui:sketch.polygon}} et un {{ui:sketch.star}}. Cliquez sur l'un d'entre eux pour le placer à l'origine de l'esquisse ou faites-le glisser du menu jusqu'à l'endroit souhaité. Au bas du menu, {{ui:sketch.polygonSides}} définit le nombre de côtés du polygone et de points de l'étoile, et {{ui:sketch.starInner}} la profondeur des vallées de l'étoile vers le milieu (10 à 90 pour cent du rayon extérieur) ; les deux s’appliquent à la forme suivante que vous ajoutez. Comme toute forme d'esquisse, ce sont ensuite des points d'angle ordinaires, vous pouvez donc les déplacer, les arrondir ou les chanfreiner un par un.
- **Chevauchement :** Poussez deux contours fermés l'un sur l'autre et ils restent deux corps, qui fusionnent dans l'éditeur 3D ; le chevauchement n'est pas un trou. Un trou ne vient que d’un contour entièrement inséré dans un autre. Le déplacement ne rejoint pas les lignes là où elles se croisent, vous pouvez donc séparer à nouveau les formes. Cependant, si vous tracez une ligne entre les autres, layerling place un point à chaque croisement.
- **Sélection :** {{ui:sketch.select}} déplace les points et les lignes. Un clic à l'intérieur d'un contour fermé sélectionne tout le contour, vous pouvez donc le faire glisser ou le redimensionner immédiatement ; à l'intérieur d'un trou, il choisit le trou. Le cadre autour de la sélection comporte huit poignées : les coins changent de largeur et de hauteur ensemble, conservant les proportions lorsque vous maintenez [[Shift]]. Ceux sur les côtés ne changent que dans une seule direction. {{ui:sketch.lockOutline}} (ou [[Ctrl]]+[[L]]) verrouille le contour sélectionné, comme un corps verrouillé dans l'éditeur 3D : il ne peut plus être déplacé ni modifié, ses lignes pâlissent, ses points deviennent gris et les poignées du cadre deviennent grises et ne réagissent plus. Tant qu'il est sélectionné, un clic sur le cadenas dans son coin le déverrouille. Les flèches courbes aux coins du cadre font pivoter l'ensemble de la sélection autour de son milieu : le chiffre au-dessus du pointeur indique l'angle, et en maintenant [[Shift]], la rotation se fait par pas de 15°. Pendant la rotation, un anneau apparaît : avec le pointeur à l'intérieur, la rotation s'enclenche par pas de 22,5°, à l'extérieur elle avance par degrés entiers, quelle que soit la grille. [[R]] fait toujours pivoter un contour fermé entier de 45° à chaque pression. Cliquez sur la pilule de largeur ou de hauteur pour saisir une nouvelle taille, également sous forme de somme ("60+12,5") ou en pourcentage ("150 %"). Avec [[Shift]] maintenu, un clic sur un point ou une ligne l'ajoute à la sélection ou l'enlève à nouveau, vous pouvez donc en choisir plusieurs et les déplacer ensemble. Faites glisser une case sur un espace vide pour tout sélectionner. Une ligne peut également être glissée (elle se déplace par ses deux extrémités, ou par toute la sélection si elle en fait partie). Les touches fléchées déplacent la sélection d'un pas de grille, [[Shift]] avec elles d'un pas plus grand, et [[Shift]] maintenu pendant que vous faites glisser maintient le déplacement sur un axe. {{ui:sketch.refine}} : un clic sur une section ajoute un point, un clic sur un point le supprime. Il existe également {{ui:sketch.erase}} (un clic sur un point ou une ligne l'enlève, une fenêtre tirée sur plusieurs enlève tout ce qu'elle contient, et avec une sélection le bouton efface la sélection) et l'insertion d'une image modèle ({{ui:sketch.addImage}}).
- **Presse-papiers :** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} et {{ui:editor.tool.delete}} travaillent sur les points, lignes et images sélectionnés, comme dans l'éditeur 3D ; Coupes [[Ctrl]]+[[X]]. La géométrie collée et dupliquée se pose à côté de l'original avec un espace de 10 mm, sur un endroit libre où elle ne touche aucune ligne existante, de sorte qu'elle ne soit jamais jointe à ce qui est déjà là. Il reste sélectionné, vous pouvez donc le faire glisser directement en place.
- **Historique :** {{ui:sketch.undo}} et {{ui:sketch.redo}}.
- **Gérer :** {{ui:editor.tool.note}} (ou [[N]]) pose une note sur l'esquisse, comme dans l'éditeur 3D : le clic suivant la place, n'importe où, même sur une ligne. Faites glisser l'épingle pour la déplacer ; un clic sur l'épingle replie la carte. Les notes d'une esquisse appartiennent à son corps : dans la vue 3D, elles se posent sur le dessus d'un corps créé avec {{ui:sketch.extrude}} ou {{ui:sketch.sweep}} et sur le profil dessiné d'un corps créé avec {{ui:sketch.revolve}}, et elles se déplacent avec lui. Rouvrir l'esquisse affiche toutes les notes du corps, y compris celles placées en 3D. {{ui:sketch.undo}} annule une note comme une ligne, et {{ui:sketch.cancel}} abandonne ce qui a changé dans les notes. Plus de détails dans le chapitre Mesures et notes.
- **Affichage :** Effectuez un panoramique avec le bouton central de la souris ou avec [[Shift]] ou [[Ctrl]] plus le bouton droit de la souris, comme dans l'éditeur 3D. Quand rien n'est sélectionné, [[Ctrl]] et les flèches la font aussi glisser : un dixième de l'image par appui, la moitié avec [[Shift]] en plus ; l'esquisse se déplace dans la direction où elles pointent. [[Home]] ajuste l'intégralité de l'esquisse dans la vue, [[F]] effectue un zoom sur la sélection (sans sélection, sur toute l'esquisse), et [[+]] et [[−]] effectuent un zoom avant et arrière, comme dans l'éditeur 3D. Sans sélection, un double-clic sur un endroit vide fait glisser la vue pour amener cet endroit au milieu, comme dans l'éditeur 3D ; {{ui:workspace.doubleClickCentersView}} dans les réglages le désactive. Le {{ui:camera.tapeTools}} sur la barre latérale mesure la distance entre deux points. L'esquisse affiche également les dimensions dès que vous cliquez sur quelque chose : la longueur d'une ligne, ou pour un point, la longueur des lignes qui s'y rejoignent. Le bouton {{ui:sketch.showMeasurements}} sur la barre latérale masque et affiche ces dimensions lorsqu'elles gênent, par exemple lors du façonnage de courbes ; le ruban à mesurer continue de fonctionner. Sur une ligne droite, vous pouvez cliquer sur la pilule de dimension et saisir la longueur en millimètres ; [[Enter]] l'applique, [[Esc]] l'annule. La ligne garde sa direction, son point de départ reste là où il se trouve et les lignes à l'autre extrémité suivent. Avec un point final sélectionné, celui-là se déplace. [[Alt]]+[[Enter]] agrandit la ligne des deux côtés autour de son milieu. Dans les courbes, la pilule n'affiche que la longueur.

Un corps vient uniquement d'un contour **fermé**.

![Un contour en forme de L. Au point d'angle sélectionné, en haut à gauche, les longueurs des deux lignes sont affichées en millimètres et l'angle entre elles en degrés.](shot:sketch-outline)

Les touches [[1]] à [[4]] choisissent les outils de dessin, dans l'ordre de la barre : {{ui:sketch.line}}, {{ui:sketch.bezier}}, {{ui:sketch.smooth}} et {{ui:sketch.refine}}. Elles agissent tant qu'aucune ligne n'est en cours ; pendant une ligne, les chiffres sont sa longueur (voir ci-dessous).

## Lignes par numéros

Une fois que vous avez défini le premier point avec {{ui:sketch.line}} ou {{ui:sketch.smooth}}, tapez simplement un nombre : deux champs s'ouvrent à côté de la ligne, {{ui:sketch.typedLength}} en millimètres et {{ui:sketch.typedAngle}} en degrés. [[<]] ou [[Tab]] se déplace vers l'angle, donc "50<30" donne une ligne de 50 mm de long à 30°, comme dans AutoCAD. [[Enter]] définit le point et vous pouvez taper la ligne suivante immédiatement ; [[Esc]] ferme les champs sans terminer la chaîne de lignes.

L'angle compte dans le sens inverse des aiguilles d'une montre à partir de la droite : 0° vers la droite, 90° vers le haut, 180° vers la gauche, 270° vers le bas. Laissez-le vide et la ligne suit le pointeur, vous donnez donc uniquement la longueur et montrez la direction avec la souris. Des sommes comme « 40+12,5 » fonctionnent dans les deux domaines. Si le point devait sortir de la plaque, le champ l'indique et attend une autre valeur.

## Courber un côté droit

Sélectionnez une ligne droite et cliquez sur {{ui:sketch.curveLine}} dans la barre qui apparaît : le côté s'incline en courbe, comme dans Tinkercad, et montre ses deux poignées. Faites-les glisser pour façonner la courbe ; plus une poignée est éloignée, plus la courbure est forte. Sous le pointeur, une poignée devient orange et attrape aussi un clic juste à côté, pour qu'une image modèle en dessous ne bouge pas par erreur. {{ui:sketch.straightenLine}} rend le côté droit. Un point que vous sélectionnez peut être arrondi avec {{ui:sketch.smooth}} : il obtient ses propres poignées et les lignes à côté deviennent des courbes. Avec trois points ou plus sélectionnés, {{ui:sketch.curveThroughPoints}} dans la barre trace une seule courbe douce du premier au dernier, en passant par chaque point entre eux, comme le fait l'outil {{ui:sketch.smooth}} ; les lignes au-delà des deux extrémités restent telles quelles. D'autres logiciels l'appellent « Fit curve » ou « Fit point spline ». La différence : {{ui:sketch.curveLine}} courbe chaque côté sélectionné séparément et garde les angles entre eux, pour un arc sur un côté ; {{ui:sketch.curveThroughPoints}} fait passer une seule courbe par les points sans laisser d'angles, pour lisser un bord dentelé décalqué. Cliquez sur une poignée et elle s'allume : les touches fléchées la déplacent alors d'un pas de grille, avec [[Shift]] d'un pas plus grand, pour régler une courbe avec précision.

![Le côté inférieur du contour en forme de L est plié en courbe, avec ses deux poignées aux extrémités.](shot:sketch-curve)

## Angles de lecture et de frappe

Cliquez sur un coin où **deux lignes droites** se rencontrent : à côté des longueurs, layerling affiche l'**angle** entre elles en degrés, avec un petit arc. Sur un contour fermé, c'est l'angle à l'intérieur de la forme, donc une bosse se lit au-dessus de 180°. Cliquez sur la valeur et saisissez un nouvel angle. L'une des deux lignes tourne alors autour du coin et garde sa longueur, et l'autre reste là où elle est. La ligne qui tourne est tracée en pointillés ; [[Tab]] passe à l'autre, [[Enter]] s'applique et [[Esc]] s'annule. Ce qui pend à l’extrémité de la ligne tournée va avec.

Déplacer un point change trois angles : au point lui-même et aux deux coins voisins aux extrémités de ses lignes. Ainsi, layerling montre également ces deux éléments, et chacun peut être cliqué et saisi. De cette façon, vous réglez, par exemple, le coin inférieur gauche à 75,5° tandis que le point supérieur gauche, qui se déplace pour lui, est sélectionné. Ici aussi, vous pouvez calculer, par ex. "90-14,5".

Un coin ne montre aucun angle à l'endroit où une courbe le rencontre, ni à l'endroit où plus de deux lignes se rencontrent. Le bouton {{ui:sketch.showMeasurements}} sur la barre latérale masque l'angle ainsi que les longueurs.

## Arrondir ou chanfreiner les coins

Cliquez sur un point d'angle et choisissez {{ui:sketch.filletCorner}} ou {{ui:sketch.chamferCorner}}. Un petit champ apparaît pour le {{ui:sketch.filletRadius}} ou le {{ui:sketch.chamferDistance}}. Saisissez la taille et confirmez avec la coche. Cela fonctionne pour les coins entre deux lignes droites.

Plusieurs coins fonctionnent également : sélectionnez-les avec [[Shift]] et cliquez sur chacun, ou tracez un cadre autour d'eux et choisissez {{ui:sketch.filletCorner}} ou {{ui:sketch.chamferCorner}} dans la barre qui apparaît. Tous ont le même rayon ou distance. Lorsque deux coins sélectionnés partagent un côté, chacun en occupe au maximum 45 %, de sorte qu'un rectangle arrondi sur tout son pourtour ressort pareil à chaque coin. Les points qui ne constituent pas un coin entre deux lignes droites sont laissés de côté et le message indique leur nombre. Un cadre autour d'une forme entière, ou un clic à l'intérieur de celle-ci, sélectionne ses coins et ses lignes ensemble, et la barre propose alors {{ui:sketch.curveLine}} et {{ui:sketch.straightenLine}} pour toutes les lignes sélectionnées à côté des outils de coin.

![Le coin en haut à gauche est arrondi avec un rayon de 12 mm.](shot:sketch-fillet)

## Symétrie

Sélectionnez des points et des lignes (clic, [[Maj]] et clic, ou un cadre tiré autour) et cliquez sur {{ui:sketch.mirror}} dans la barre. Choisissez ensuite l'axe : {{ui:sketch.mirrorLeftRight}} fait la symétrie par rapport à l'axe vertical passant par le milieu de la plaque, {{ui:sketch.mirrorTopBottom}} par rapport à l'horizontal, et {{ui:sketch.mirrorAcrossLine}} par rapport à une ligne droite de l'esquisse sur laquelle vous cliquez ensuite. La copie se place de l'autre côté et l'original reste ; rien n'est lié, vous pouvez modifier chacun séparément. Les points sur l'axe sont partagés : un demi-contour dont les extrémités sont sur l'axe devient un contour fermé. Dessinez la moitié d'une équerre, sélectionnez-la, faites la symétrie et créez le corps. Une ligne de construction fait un bon axe. [[Échap]] annule.

## Lignes de construction

Une ligne de construction vous aide à placer des points sans faire partie du corps. Il est dessiné en pointillés et ne compte jamais comme contour : vous pouvez le tirer aussi loin que vous le souhaitez au-delà de la forme et le corps ne grandit pas.

- Allumez {{ui:sketch.construction}} dans le groupe {{ui:sketch.group.draw}}. Les nouvelles lignes, celles tapées par mesure également, sont alors des lignes de construction. Le bouton revient aux lignes normales.
- Une ligne que vous avez tracée devient déjà une ligne de construction lorsque vous cliquez dessus et choisissez {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} en fait à nouveau une ligne normale.
- Les nouveaux points s'accrochent à l'endroit où une ligne de construction croise une autre ligne, un anneau bleu l'indique, ainsi qu'aux extrémités de la ligne de construction. C'est ainsi qu'on pose un coin sur un milieu, à distance fixe d'un bord ou sur un croisement, sans calculer.
- Une ligne de construction ne coupe pas le contour là où elle le traverse. Lorsqu'il tourne, il peut également se trouver à droite de l'axe.

## En faire un corps

Cliquez sur {{ui:sketch.finishSketch}}. Le contour constitue un corps sur le plan de travail. Dans ses paramètres, vous modifiez la hauteur, la couleur et tout le reste comme pour toute autre forme. Lorsque vous le redimensionnez, layerling le reconstruit à partir de l'esquisse un instant plus tard, et l'esquisse grandit avec elle. Il reste donc un corps exact qui prend des chanfreins et des congés, et la prochaine fois que vous le modifierez, l'esquisse aura la taille du corps.

Si le plan de travail se trouve sur le côté d'un corps, vous dessinez la façon dont vous regardez ce côté : le haut dans l'esquisse se trouve également sur le corps fini. Le léger contour du corps dans la vue d’esquisse montre où il se trouve. Si le plan de travail traverse un corps, la vue d'esquisse affiche à la place le contour de cette coupe, de sorte qu'un corps creux apparaît comme un anneau et que vous pouvez aligner l'esquisse avec ses parois. Un point que vous définissez ou faites glisser près d'un coin de ces contours s'aligne exactement dessus ; un petit anneau bleu le montre. De cette façon, vous incorporez les bords d'autres corps dans l'esquisse, même lorsque le plan de travail ne repose pas exactement sur eux.

![Le contour est devenu un corps. Le coin est arrondi.](shot:sketch-result)

Avec {{ui:inspector.editSketch}} vous pouvez revenir à l'esquisse à tout moment pour la modifier. Un double clic sur le corps fait la même chose, comme dans Tinkercad (un corps verrouillé reste fermé) ; {{ui:workspace.doubleClickOpensSketch}} dans les paramètres désactive cela. Les traitements de bord que vous avez déjà effectués sur le corps sont perdus, car les bords sont créés à nouveau. Un corps que vous avez tourné ou déplacé dans l'éditeur 3D s'ouvre là où il se trouve sur le plateau, tourné comme vous le voyez et sur la grille du plateau ; seul un corps incliné ou mis en miroir s'ouvre dans son propre repère.

Une esquisse à plusieurs contours donne un seul corps, et les contours qui se chevauchent y fusionnent. Pour garder chaque contour à part, sélectionnez le corps et cliquez sur {{ui:inspector.separateParts}} : chaque contour extérieur devient un corps à lui, avec les trous qui s'y trouvent, et garde la hauteur, la couleur et la place du corps. Chaque partie a sa propre esquisse à modifier, avec les lignes de construction, de sorte que vous pouvez monter ou descendre les parties une à une, puis les unir ou les soustraire. Les traitements d'arêtes l'empêchent, tout comme un corps étiré après coup : il est alors séparé comme un maillage.

**Un autre type de corps à partir de la même esquisse :** le badge en haut de l'esquisse indique ce qu'elle devient : {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} ou {{ui:sketch.modeBadgeSweep}}. Cliquez dessus et choisissez-en un autre, aussi pendant que vous modifiez un corps existant : un SVG importé, qui arrive extrudé, devient un vase ou un bouton quand vous le passez en {{ui:sketch.modeBadgeRevolve}}. Un contour qui dépasse l'axe glisse vers la gauche jusqu'à ce que son bord droit soit sur l'axe ; [[Ctrl]]+[[Z]] annule ce déplacement. À la fin, le nouveau corps prend la place de l'ancien, avec son nom et sa couleur, le pied à la même hauteur. Les traitements d'arêtes sont perdus, comme à chaque modification d'une esquisse.

### Tournant

Lors d'une révolution, vous dessinez la moitié de la section **à gauche de l'axe** indiqué dans l'esquisse. À côté, vous voyez un aperçu 3D de la révolution. Cela montre immédiatement à quoi ressemblera le corps. Le contour doit être fermé. À la fin, cliquez sur {{ui:sketch.finishRevolve}}. Les autres corps du dessin sont montrés de face, dans la même vue que le profil, avec l'axe au milieu : dessinez le profil à côté ou au-dessus d'eux. Le corps se tient là où vous l'avez dessiné, et la ligne horizontale au milieu de l'esquisse est le sol : un profil au-dessus donne un corps plus haut, et son point le plus bas est le pied du corps.

Un corps de révolution est un corps exact, comme un corps extrudé : il prend des chanfreins et des congés, et on peut le creuser, pour une tasse ou un vase. Un corps tourné avec une version plus ancienne de layerling est un maillage ; ouvrez {{ui:inspector.editSketch}} et terminez-le à nouveau pour le rendre exact. Un profil qui traverse l'axe ne peut pas être construit exactement et devient un maillage, comme auparavant.

**Un seul brin continu : {{ui:prop.pitch}}.** Une révolution fait du contour des anneaux fermés. Sélectionnez le corps de révolution et donnez-lui dans le panneau des propriétés un {{ui:prop.pitch}} supérieur à 0, la hauteur dont il monte à chaque tour : le contour s'enroule alors en hélice, un seul brin continu comme le filament sur une bobine ou un ressort. {{ui:prop.sweep}} devient alors {{ui:prop.turns}}, jusqu'à 200 ; un nombre négatif enroule à gauche. Des tours plus rapprochés que la hauteur du contour fusionnent en un seul corps : un noyau plein avec un pas fin fonctionne aussi. Une hélice est construite en maillage : congé, chanfrein et creusage ne s'y appliquent pas ; gardez {{ui:prop.sides}} bas pour beaucoup de tours. Un pas de 0 refait des anneaux.

## Balayer le long d'un chemin

{{ui:sketch.sweep}} tire un contour le long d'un chemin : un chemin de câbles qui tourne à l'angle, une conduite, une protection autour d'une courroie, un anneau autour d'un hexagone. Le bouton se trouve à côté de {{ui:sketch.extrude}} et {{ui:sketch.revolve}} dans le groupe {{ui:sketch.group.create}}.

Vous dessinez deux choses sur la même feuille :

- **La section** comme contour fermé, comme d'habitude. Dessinez-la telle que vous la verriez en regardant le long du chemin depuis son début : en travers du chemin, c'est la gauche et la droite de l'esquisse, le haut est le haut du corps terminé. Une section creuse, un profilé en U ou un tube, est un contour avec un second à l'intérieur. La section est centrée en travers sur le chemin, et le corps repose sur le plan de l'esquisse par le point le plus bas de la section.

- **Le chemin** comme {{ui:sketch.construction}} : activez-la et dessinez des lignes ou des courbes, une seule chaîne, ouverte ou fermée (une chaîne fermée donne un anneau). Le chemin est à plat dans le plan de l'esquisse.

Dessinez la section près de l'extrémité du chemin où elle doit commencer ; le chemin commence par l'extrémité la plus proche. Cliquez ensuite sur {{ui:sketch.finishSweep}}. Un angle de segments droits devient une coupe d'onglet, une courbe reste lisse, et la section reste droite tout du long. Le corps est exact, comme un corps extrudé : congé, chanfrein et export STEP fonctionnent. S'il manque un contour fermé ou un chemin, ou s'il y a plusieurs chemins séparés, layerling le dit. Avec {{ui:inspector.editSketch}}, vous revenez à l'esquisse pour changer la section ou le chemin.

## Construire comme un trait

Normalement, la zone située à l’intérieur d’un contour fermé devient le corps. Avec {{ui:sketch.stroke}} dans la section {{ui:sketch.group.finish}}, vous construisez la ligne elle-même, avec une largeur que vous définissez. Cochez {{ui:sketch.strokeOn}} dans le panneau ; le croquis montre d'emblée ce qui en ressort.

- Un **contour fermé** devient un cadre. {{ui:sketch.strokeAlign}} indique où se trouve le mur : {{ui:sketch.strokeAlign.center}} sur la ligne tracée, {{ui:sketch.strokeAlign.inside}} à l'intérieur ou {{ui:sketch.strokeAlign.outside}} à l'extérieur. L'extérieur est pratique pour une tolérance : dessinez le contour d'un trou, une queue d'aronde par exemple, et donnez-lui un trait de 0,2 mm à l'extérieur pour obtenir l'espace dont l'impression a besoin.
- Une **ligne ouverte** devient une bande, centrée sur la ligne. {{ui:sketch.strokeCap}} définit l'apparence de ses extrémités : {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (plus longue de la moitié de la largeur) ou {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} s'applique aux deux : {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} ou {{ui:sketch.strokeJoin.bevel}}.

L'esquisse conserve la ligne tracée. Ouvrez-le à nouveau et vous continuez à changer de ligne et de trait ; décochez la case et la zone est à nouveau construite. Les courbes sont divisées en petits morceaux droits. Une révolution n'a pas de trait.

## Remplissage et silhouette

Vous pouvez également définir le trait sans ouvrir l'esquisse : dans les propriétés d'un corps d'esquisse, choisissez {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} ou {{ui:prop.sketchFill.center}} sous {{ui:prop.sketchFill}}, avec {{ui:prop.sketchLineWidth}} et {{ui:sketch.strokeJoin}}. Le corps est immédiatement reconstruit, là où il se trouve. Ceux-ci correspondent aux modes de remplissage de l'importation SVG de Tinkercad : par défaut, ligne extérieure et ligne intérieure. {{ui:prop.sketchFill.grow}} maintient la zone remplie et l'agrandit de la largeur du trait tout autour, avec des coins pointus, ronds ou biseautés : une couche de base sous un logo pour une impression multicolore, que le trait extérieur seul ne donnerait que comme un anneau.

{{ui:prop.sketchSilhouette}} laisse de côté tous les contours qui se trouvent à l'intérieur d'un autre : les trous et tout ce qui s'y trouve. Seul le contour extérieur reste. Avec {{ui:prop.sketchFill.outside}}, cela crée un emporte-pièce : importez un SVG deux fois, une fois avec la silhouette comme zone pour la base et une fois avec la silhouette et 1 à 2 mm de trait à l'extérieur comme mur. Le commutateur se trouve également dans le panneau {{ui:sketch.stroke}} en mode esquisse.

Les congés et les chanfreins sur les arêtes disparaissent lorsque le corps est reconstruit, comme lorsque l'esquisse est modifiée.

## Murs inclinés, pour les tampons

Une esquisse extrudée comporte des parois verticales. Un tampon, une matrice de gaufrage ou un poinçon doivent être inclinés, à l'extérieur comme à l'intérieur, avec la même épaisseur de paroi sur toute la longueur. Layerling n'a pas d'angle de dépouille pour une extrusion, mais pour des contours simples, {{ui:inspector.taper}} vous y amène. Une méthode qui fonctionne :

1. Dessinez le contour avec le trou dont il a besoin et faites-en un corps. Dupliquez le corps ([[Ctrl]]+[[D]]).
2. Sur le premier corps, activez {{ui:prop.sketchSilhouette}} pour que le trou soit rempli et donnez-lui un fond plus large que le haut avec {{ui:inspector.taper}}.
3. Sur la copie, ouvrez à nouveau son esquisse et supprimez le contour extérieur, de sorte qu'il ne reste que le contour du trou. Terminez l'esquisse, changez le corps en {{ui:inspector.hole}} et donnez-lui un bas plus étroit que le haut avec {{ui:inspector.taper}}.
4. Déplacez le trou dans le premier corps, là où se trouvait le trou, et regroupez les deux.

Les murs sont désormais inclinés vers l'extérieur et l'intérieur. Taper met à l'échelle tout le contour, ce qui est donc exact pour les formes simples, où vous pouvez choisir les tailles pour que les murs soient parallèles, et seulement une approximation pour les détails fins tels que le lettrage.

## Une image comme modèle

Avec {{ui:sketch.addImage}} vous mettez une photo ou un dessin sous le croquis et vous le tracez. Vous pouvez définir sa taille, son opacité et sa position. Une fois l'image bien placée, verrouillez-la avec [[Ctrl]]+[[L]] afin de ne pas la déplacer accidentellement pendant le dessin. Une image verrouillée n'est pas gênante : les clics la traversent, vous pouvez donc sélectionner des lignes et des points dessus et faire glisser un cadre dessus. Un clic sur le cadenas dans son coin le déverrouille ; [[Alt]]+clic le sélectionne sans le déverrouiller. Si ses paramètres sur le bord droit couvrent l'image, faites-les glisser par leur barre de titre ; un double-clic dessus les ancre à nouveau.

Sous {{ui:sketch.imageAlign}} vous alignez une photo qui n'a pas été prise directement :

- **{{ui:sketch.imageRotation}} :** Tournez l'image autour de son centre, avec les flèches courbes à ses coins ou sous forme de nombre en degrés. Avec [[Shift]], les flèches s'enclenchent par pas de 15°. Dans l'anneau qui apparaît pendant la rotation, elles s'enclenchent par pas de 22,5°, à l'extérieur par degrés entiers.
- **{{ui:sketch.centreImageX}}** et **{{ui:sketch.centreImageY}} :** placent le centre de l'image sur X = 0 ou Y = 0. Pour une révolution, X = 0 est l'axe, donc l'image est alors symétrique par rapport à lui.
- **{{ui:sketch.calibrateImage}} :** Son bouton se trouve en haut, juste sous l'aperçu. Cliquez sur deux points de l'image dont vous connaissez la distance, les extrémités d'une règle ou un diamètre connu, et saisissez la distance réelle. L'image est mise à l'échelle uniformément afin que la distance soit correcte ; le premier point reste là où il était.
- **{{ui:sketch.cropImage}} :** Les poignées du cadre recadrent désormais l'image au lieu de la redimensionner ; ce qui est coupé reste stocké et revient avec {{ui:sketch.uncropImage}} ou lorsqu'une poignée est à nouveau retirée.

Tous les quatre touchent uniquement à la référence, jamais au croquis.

## Touches en mode esquisse

| Clé | Effet |
| --- | --- |
| [[Esc]] | reposer l'outil de note ; sinon reposer l'outil (retour à {{ui:sketch.select}}), puis effacer la sélection |
| [[Delete]] | supprimer l'élément sélectionné |
| [[Ctrl]]+[[C]] | copier la sélection |
| [[Ctrl]]+[[X]] | couper la sélection |
| [[Ctrl]]+[[V]] | coller |
| [[Ctrl]]+[[D]] | dupliquer la sélection |
| [[Ctrl]]+[[Z]] | annuler |
| [[Ctrl]]+[[A]] | sélectionner tous les points et toutes les lignes |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | pendant le dessin : tracez la ligne par pas de 15° ; tout en faisant glisser : conserver le mouvement sur un axe |
| chiffre, [[<]], [[Tab]], [[Enter]] | pendant le dessin : tapez et définissez la longueur et l'angle de la ligne suivante |
| [[R]] | faire pivoter l'esquisse fermée de 45° |
| [[Ctrl]]+[[L]] | verrouiller ou déverrouiller l'image du modèle |
| [[N]] | poser une note : le clic suivant la place sur l'esquisse |
| [[Shift]]+[[N]] | afficher ou masquer les notes |

> **Conseil :** Dessinez autant de points que nécessaire. Un contour avec quelques points bien placés donne un corps plus lisse qu’un enchevêtrement de plusieurs.
