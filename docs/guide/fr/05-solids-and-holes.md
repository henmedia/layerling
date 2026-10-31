---
title: Solides et trous
summary: Comment des formes simples deviennent des alésages, des fentes et des poches, et comment changer de groupe plus tard.
---

C'est l'idée la plus importante dans layerling, et elle s'apprend rapidement : **Chaque forme est soit un solide, soit un trou.** Un solide reste. Un trou est un outil qui enlève de la matière.

## Solide ou troué

Sélectionnez une forme et cliquez sur {{ui:inspector.solid}} ou {{ui:inspector.hole}} dans ses paramètres. Le clavier est plus rapide : [[H]] fait de la sélection un trou, [[S]] en fait à nouveau un solide. Les deux sont également dans le menu, un clic droit sur le corps s'ouvre. Un trou est visible pour que vous puissiez voir où il se trouve. [[T]] rend un corps transparent, par exemple pour regarder dans un boîtier ; une seconde pression le rend à nouveau opaque. Cela fonctionne sur toute la sélection : si un corps est déjà transparent, tous deviennent opaques, sinon tous deviennent transparents.

Tant que rien n'est groupé, il ne se passe rien avec un trou. Il reste là et montre où quelque chose disparaîtra plus tard.

![Le cylindre est un trou. Il dépasse du haut du cube et coupe complètement.](shot:hole-before)

## Regroupement

Sélectionnez des solides et des trous et cliquez sur {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Maintenant, les trous retirent la matière des solides qu'ils touchent. Ce qui reste est une seule nouvelle forme.

![Le résultat : un cube avec un alésage.](shot:hole-after)

Voici comment vous obtenez :

- **Alésages :** un cylindre comme trou traversant un corps.
- **Slots :** une boîte allongée comme un trou sur le bord.
- **Poches :** un trou qui ne traverse pas complètement.
- **Filetages dans une pièce :** un trou taraudé comme trou, voir [Filetages et mécanique](chapter:threads-and-mechanics).

Si plusieurs solides sont dans le groupe, ils sont joints. Deux solides qui se touchent deviennent une seule pièce.

Vous pouvez traiter un groupe comme une forme : déplacer, faire pivoter, colorer, regrouper à nouveau. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) le dissout et les parties individuelles sont de retour.

### Faire d'un groupe un trou

Un groupe entier peut aussi être un solide ou un trou. Une règle simple s'applique :

- Si le groupe est constitué uniquement de solides (ou uniquement de trous), vous le permutez dans son ensemble et ses parties suivent.
- S'il contient les deux, disons un cube avec un alésage, chaque partie garde son propre état. Le groupe tout entier devient alors un outil, mais l'ennui reste un ennui.

## Regroupement

Parfois, les pièces doivent simplement rester ensemble sans ne former qu'une seule pièce – un logo blanc sur une plaque noire pour une impression multicolore, par exemple. C'est à cela que sert {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), comme dans Tinkercad. Un bundle bouge, tourne et se redimensionne comme une forme, mais rien n'est fusionné :

- Chaque pièce garde sa couleur et reste solide ou trouée.
- Les trous n'ont rien coupé.
- Dans un export STL, 3MF ou OBJ, chaque pièce est un corps à part entière ; en 3MF et OBJ avec sa couleur.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) démonte à nouveau un paquet, [[E]] l'ouvre pour l'éditer comme un groupe. Chanfrein, congé et évidement ne fonctionnent pas sur un paquet, car ce n'est pas un seul corps : regroupez-le pour cela, ou travaillez ses pièces une à une. Si un trou dans le paquet doit finalement être coupé, regroupez le paquet (Ctrl+G).

## Intersection

{{ui:editor.tool.intersect}} conserve uniquement ce que deux ou plusieurs corps ont en commun. Superposez deux formes superposées, sélectionnez les deux et cliquez dessus. Cela transforme un cylindre et une boîte en une pièce avec un côté rond et un côté droit. Un groupe compte son apparence, trous compris. Si un trou est également sélectionné, ce qui reste est ce que tous les solides partagent avec tous les trous. Si les formes n'ont rien en commun, rien n'est modifié et un message l'indique. À côté, {{ui:editor.tool.intersectPreview}} montre la partie commune avant de l'appliquer : les formes sélectionnées deviennent transparentes et ce qu'elles partagent est dessiné en vert. Sélectionnez et déplacez chaque forme séparément, la partie verte suit ; {{ui:editor.tool.intersect}} l'applique, [[Échap]] ferme l'aperçu.

## Découper un corps dans un autre

Pour des pièces qui doivent s'emboîter, un arbre dans un manchon ou une vis dans un boîtier, tu fais une pièce et tu la découpes dans l'autre. Sélectionne les deux corps et clique sur {{ui:editor.tool.cutOut}} dans la zone {{ui:editor.group.combine}}, ou fais un clic droit et choisis-le là. La fenêtre d'outil nomme la pièce qui reste et le corps qui reçoit la cavité ; layerling prend le plus petit comme pièce, et {{ui:cutOut.swap}} l'inverse. {{ui:cutOut.clearance}} rend la cavité plus grande que la pièce d'autant tout autour : 0 s'ajuste exactement, 0,2 mm est un jeu courant pour un ajustement imprimé. {{ui:cutOut.apply}} découpe une copie de la pièce dans l'autre corps et laisse la pièce elle-même où elle est. Le résultat est un groupe : {{ui:editor.tool.ungroup}} sépare de nouveau la découpe. Un jeu demande que la pièce soit un corps exact, comme pour l'outil {{ui:editor.tool.offset}}, qui est utilisé pour cela.

## Modifier un groupe

Si l'alésage s'avère trop petit, vous n'êtes pas obligé de dissoudre le groupe et de le reconstruire. Sélectionnez le groupe et cliquez sur {{ui:group.edit}} dans ses paramètres, sur l'icône du dossier dans la liste des objets, ou appuyez sur [[E]]. Un double clic sur le groupe fait la même chose, comme dans Tinkercad, sur un bundle également ; si vous préférez ne pas le faire, désactivez {{ui:workspace.doubleClickOpensGroup}} dans les paramètres. Une pièce ne commence à bouger qu'une fois que le pointeur a été déplacé de quelques pixels, donc un clic tremblant ou un double-clic ne la déplace pas. Les pièces sont désormais séparées et vous les modifiez avec chaque outil : agrandissez un trou, déplacez un corps, ajoutez un trou.

![Le groupe en cours d'édition : la barre en bas contient Annuler et Terminé, et la liste d'objets affiche les pièces.](shot:open-group)

Une barre apparaît en bas de l'image. {{ui:group.done}} reconstruit le groupe, avec son nom, sa couleur et son état de solide ou de trou. {{ui:common.cancel}} le remet intact.

Si l'une des parties est elle-même un groupe, vous pouvez la modifier de la même manière, et ainsi de suite, au fur et à mesure de votre conception. La barre indique où vous vous trouvez, par exemple « Support › Bossage de vis ». {{ui:group.done}} et {{ui:common.cancel}} terminent toujours le groupe le plus interne et vous font reculer d'un niveau. Lorsque vous êtes à l'intérieur d'un groupe, seuls les groupes parmi ses parties peuvent être modifiés ; pour en éditer un autre, terminez d'abord.

Contrairement à {{ui:editor.tool.ungroup}}, qui sépare définitivement un groupe, l'édition conserve le groupe : son nom et ses paramètres restent, et vous pouvez toujours revenir en arrière avec {{ui:common.cancel}}.

A noter : les congés et chanfreins que vous aviez mis sur l'ensemble **tout** sont perdus à la reconstruction. Le bar vous le dit.

## Fractionnement

{{ui:editor.tool.split}} dans la zone {{ui:editor.group.modify}} coupe la sélection en deux avec un plan - une partie trop grande pour le lit d'impression, par exemple, ou une partie dont vous voulez voir l'intérieur. Sélectionnez un ou plusieurs solides ou trous et cliquez dessus. Un plan translucide montre exactement où ira la coupe ; rien ne change jusqu'à ce que vous l'appliquiez.

- {{ui:split.orientation}} : **X** fait une coupe verticale entre gauche et droite, **Y** entre l'avant et l'arrière, **Z** une coupe horizontale entre le haut et le bas. Les axes sont nommés comme sur la carte Position, avec Z en haut ; Z est l'endroit où commence l'avion.
- {{ui:split.workplane}} : {{ui:split.workplaneParallel}} pose le plan parallèlement au plan de travail, {{ui:split.workplaneAcrossX}} et {{ui:split.workplaneAcrossY}} le placent perpendiculairement, en travers de sa direction X ou Y. Si l'origine du plan de travail traverse la sélection, le plan passe par elle, sinon par le milieu. Tu poses ainsi le plan de travail sur une face inclinée avec [[W]] et tu coupes exactement là, sans toucher aux curseurs de rotation.
- {{ui:split.position}} : là où le plan passe, avec le curseur ou tapé. Il commence au milieu. Vous pouvez également faire glisser la pointe de la flèche sur le plan ; l'avion se déplace le long de la flèche par pas de 0,1 mm.
- {{ui:split.pickFace}}, le bouton à côté de la position, pose le plan sur une face : cliquez dessus, puis cliquez sur la face. L'orientation, les rotations et la position sont définies pour correspondre. Pendant que vous choisissez, un plan bleu sous le pointeur indique la face qu'il prendra. Une face d'un corps qui n'est pas sélectionnée fonctionne également pour aligner la coupe avec elle, mais le plan reste dans la sélection. [[Esc]] arrête de choisir et quitte l'avion là où il se trouvait.
- Les deux curseurs de rotation ci-dessous font tourner le rabot autour des deux autres axes, jusqu'à 180° dans les deux sens, pour une coupe en angle. Ils peuvent être combinés.

{{ui:split.apply}} ou [[Enter]] fait la coupe, [[Esc]] annule (lors du picking d'une face, le premier [[Esc]] arrête seulement le picking). Chaque objet traversé par l'avion devient deux corps fermés, nommés d'après leur côté, par exemple « Boîte (Z+) » et « Boîte (Z-) » ; les objets qui lui manquent restent tels quels. Un trou devient deux trous, et un corps évidé garde sa cavité. Les deux moitiés restent là où elles étaient - pour l'impression, posez chacune sur sa face coupée avec {{ui:editor.tool.layFlat}}.

Les moitiés sont des maillages simples : les paramètres tels que les côtés d'un cylindre ou le lettrage d'un texte ont disparu, alors définissez-les en premier. [[Ctrl]]+[[Z]] ramène l'original en une seule étape. Les objets verrouillés et masqués ne peuvent pas être divisés.

## Séparation des pièces

Si une forme est constituée de plusieurs éléments distincts, comme un texte composé de lettres simples, {{ui:inspector.separateParts}} la divise en formes indépendantes. L'entrée se trouve aussi dans le menu du clic droit sur la forme.

> **Conseil :** Construisez toujours des trous un peu plus longs que la partie à travers laquelle ils doivent passer. Si le trou se termine exactement au ras du visage, il reste parfois une peau très fine. Un millimètre de dépassement garantit.
