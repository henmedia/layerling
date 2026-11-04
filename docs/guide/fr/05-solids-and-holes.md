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

Avec de grands maillages, comme un STL importé de plusieurs centaines de milliers de triangles, la coupe prend quelques secondes. layerling travaille alors en arrière-plan et affiche « {{ui:status.computing}} » ; pendant ce temps, vous pouvez tourner la vue et utiliser l'interface. Si vous modifiez la scène entre-temps, le résultat est abandonné et layerling vous le dit. Il en va de même pour {{ui:editor.tool.split}}.

Vous pouvez traiter un groupe comme une forme : déplacer, faire pivoter, colorer, regrouper à nouveau. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) le dissout et les parties individuelles sont de retour.

### Faire d'un groupe un trou

Un groupe entier peut aussi être un solide ou un trou. Une règle simple s'applique :

- Si le groupe est constitué uniquement de solides (ou uniquement de trous), vous le permutez dans son ensemble et ses parties suivent.
- S'il contient les deux, disons un cube avec un alésage, chaque partie garde son propre état. Le groupe tout entier devient alors un outil, mais l'ennui reste un ennui.

## Regroupement

Parfois, les pièces doivent simplement rester ensemble sans ne former qu'une seule pièce – un logo blanc sur une plaque noire pour une impression multicolore, par exemple. C'est à cela que sert {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), comme dans Tinkercad. Un bundle bouge, tourne et se redimensionne comme une forme, mais rien n'est fusionné :

- Chaque pièce garde sa couleur et reste un solide ou un trou. Les réglages du lot ont les mêmes cartes que ceux d'un groupe : {{ui:inspector.solid}} et {{ui:inspector.hole}} pour tout le lot (qui gardent les couleurs des pièces), {{ui:inspector.transparent}} ([[T]]) et {{ui:inspector.multicolor}} ([[Shift]]+[[M]]) ; avec Multicolore désactivé, le lot s'affiche et s'exporte en une seule couleur. {{ui:inspector.separateParts}} défait le lot, comme [[Ctrl]]+[[Shift]]+[[G]].
- Les trous n'ont rien coupé.
- Dans un export STL, 3MF ou OBJ, chaque pièce est un corps à part entière ; en 3MF et OBJ avec sa couleur.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) démonte à nouveau un paquet, [[E]] l'ouvre pour l'éditer comme un groupe. Chanfrein, congé et évidement ne fonctionnent pas sur un paquet, car ce n'est pas un seul corps : regroupez-le pour cela, ou travaillez ses pièces une à une. Si un trou dans le paquet doit finalement être coupé, regroupez le paquet (Ctrl+G).

## Intersection

{{ui:editor.tool.intersect}} conserve uniquement ce que deux ou plusieurs corps ont en commun. Superposez deux formes superposées, sélectionnez les deux et cliquez dessus. Cela transforme un cylindre et une boîte en une pièce avec un côté rond et un côté droit. Un groupe compte son apparence, trous compris. Si un trou est également sélectionné, ce qui reste est ce que tous les solides partagent avec tous les trous. Si les formes n'ont rien en commun, rien n'est modifié et un message l'indique. Le premier clic montre la partie commune avant de l'appliquer : les formes sélectionnées deviennent transparentes et ce qu'elles partagent est dessiné en vert. Sélectionnez et déplacez chaque forme séparément, la partie verte suit ; un second clic sur {{ui:editor.tool.intersect}} l'applique, [[Échap]] ferme l'aperçu. Les formes qui ont trop de triangles pour l'aperçu, comme de gros maillages importés, sont intersectées dès le premier clic.

{{ui:editor.tool.hull}} enveloppe les formes sélectionnées dans un seul corps convexe, comme sous film rétractable : le plus petit corps sans creux qui les contient toutes. Une demi-sphère sur un cylindre devient un dôme sans marche, quatre cylindres aux coins deviennent une boîte aux coins arrondis, deux sphères une capsule. Les trous de la sélection sont ensuite découpés dans l'enveloppe. Les pièces y restent : {{ui:group.edit}} ouvre l'enveloppe comme un groupe, et déplacer une pièce dedans puis la refermer reconstruit l'enveloppe. L'enveloppe est un maillage, les formes rondes montrent donc des facettes, et les outils d'arête s'y appliquent comme à tout maillage. Quand seuls des trous sont sélectionnés, l'enveloppe est elle-même un trou : deux trous cylindriques découpent une fente.

{{ui:editor.tool.cookieCutter}} fait un emporte-pièce à partir de la sélection : une paroi fine autour du contour, haute de 15 mm, et un rebord plat de 2 mm autour de son pied, pour que l'emporte-pièce tienne sur le rebord et que le pouce ait de quoi appuyer. Sélectionnez un SVG importé ou un corps d'esquisse, et son propre contour est utilisé. Un texte couché donne les courbes mêmes de ses lettres. Toute autre forme, construite, un maillage importé ou plusieurs pièces, donne ce sur quoi elle repose : le contour que le plan de travail découpe à travers elle, posez-la donc d'abord sur le plan de travail. Des pièces qui se chevauchent donnent un seul contour autour de toutes, comme si elles étaient groupées ; des pièces séparées donnent chacune un emporte-pièce, dans le même lot. Le contour est inversé de gauche à droite : l'emporte-pièce s'imprime debout sur son rebord et se retourne pour couper, si bien qu'un texte ou un logo sort de la pâte dans le bon sens. Le haut de la paroi se rétrécit en un tranchant de 0,4 mm. Les trous du contour, l'intérieur d'un e ou d'un a, reçoivent leurs propres parois, ils sont donc aussi découpés dans le biscuit. Ils forment un corps à part dans le lot, {{ui:cookieCutter.part.innerWalls}} : pour qu'un texte ou un motif soit seulement imprimé dans la pâte au lieu d'être découpé, rendez-les plus bas sous Propriétés. Avec une paroi de 15 mm et une pâte de 5 mm d'épaisseur, des parois intérieures de 12 mm enfoncent de 2 mm. Les parois intérieures plus basses que la paroi extérieure ont un dessus plat au lieu du tranchant : elles ne font qu'appuyer, et un tranchant laisserait de fines pointes qui cassent et des rainures qui retiennent la pâte. Donnez-leur un tranchant sous Propriétés si vous en voulez un. Deux ponts au niveau du rebord, du côté où appuie la main, tiennent chaque paroi intérieure à la paroi qui l'entoure, répartis autour, larges de 4 mm et hauts de 3 mm. Chaque pont repose de toute sa largeur sur les parois, au milieu d'un côté qui longe le contour, et jamais en travers d'un autre élément. Les éléments côte à côte, comme les lettres d'un nom, sont aussi reliés entre eux, les plus proches d'abord, si bien que les ponts forment un réseau à travers tous et qu'une lettre au milieu d'un mot est tenue elle aussi. Un clic sur l'outil ouvre une petite fenêtre : vous y choisissez une {{ui:cookieCutter.support.plate}} au lieu des ponts, qui remplit tout le contour du côté où vous appuyez, est plus stable et adhère mieux au plateau, mais ne permet plus de pousser la pâte par l'arrière. {{ui:cookieCutter.fillet}} met de petites pentes à 45° là où les parois reposent sur le rebord, les ponts ou la plaque, pour que les parties fines comme le point d'un i ne cassent pas ; elles forment un corps à part dans le lot. Vous y réglez aussi de combien les parois intérieures sont plus basses et si le contour est inversé ; les valeurs restent pour l'emporte-pièce suivant. Changez leur hauteur sous Propriétés comme celle du rebord. L'emporte-pièce remplace la sélection par un lot de corps d'esquisse, {{ui:group.edit}} l'ouvre. Paroi, parois intérieures et rebord sont les modes de remplissage de l'esquisse, une ligne à l'extérieur de la silhouette : changez l'épaisseur, la hauteur ou la couleur de chacun sous Propriétés, et le {{ui:prop.sketchCuttingEdge}} de la paroi aussi (0 pour un dessus plat). Là où une courbe serrée ne laisse pas de place pour un chanfrein des deux côtés, la paroi n'est chanfreinée qu'à l'extérieur, jusqu'au même tranchant. Là où un contour ne peut pas du tout être chanfreiné - un logo aux pointes aiguës, un contour découpé dans les triangles d'un corps - le tranchant est construit à la place en fines marches de 0,1 mm, qu'une couche d'impression de 0,2 mm ne distingue pas de la pente ; une telle paroi est un maillage de triangles plutôt qu'un corps exact. Pour garder le contour tel que dessiné, inversez de nouveau l'emporte-pièce avec {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Une image PNG ou JPG fonctionne aussi : importée, elle est tracée en corps d'esquisse, et l'emporte-pièce suit celui-ci.

{{ui:editor.tool.loftSketches}} joint deux corps d'esquisse ou SVG importés en un seul corps : le contour du plus bas en bas, le contour du plus haut en haut, avec des parois droites entre eux. Cela fait un entonnoir, une pièce de transition du carré au rond ou un cadre qui se rétrécit vers le haut. Placez les deux corps l'un au-dessus de l'autre là où ils doivent être, décalés et tournés si vous voulez, sélectionnez les deux et cliquez sur l'outil. Le lissage va du bas du corps inférieur au haut du corps supérieur.

## Découper un corps dans un autre

Pour des pièces qui doivent s'emboîter, un arbre dans un manchon ou une vis dans un boîtier, tu fais une pièce et tu la découpes dans l'autre. Sélectionne les deux corps et clique sur {{ui:editor.tool.cutOut}} dans la zone {{ui:editor.group.combine}}, ou fais un clic droit et choisis-le là. La fenêtre d'outil nomme la pièce qui reste et le corps qui reçoit la cavité ; layerling prend le plus petit comme pièce, et {{ui:cutOut.swap}} l'inverse. {{ui:cutOut.clearance}} rend la cavité plus grande que la pièce d'autant tout autour : 0 s'ajuste exactement, 0,2 mm est un jeu courant pour un ajustement imprimé. {{ui:cutOut.apply}} découpe une copie de la pièce dans l'autre corps et laisse la pièce elle-même où elle est. Le résultat est un groupe : {{ui:editor.tool.ungroup}} sépare de nouveau la découpe. Un jeu demande que la pièce soit un corps exact, comme pour l'outil {{ui:editor.tool.offset}}, qui est utilisé pour cela.

## Poinçonner un contour à travers un corps

Pour découper le contour d'un corps tout droit à travers un autre, sélectionnez d'abord le poinçon puis le corps à poinçonner, et cliquez sur {{ui:editor.tool.punch}} dans la zone {{ui:editor.group.combine}}, ou choisissez-le après un clic droit. Les deux n'ont pas besoin de se toucher : le poinçon peut se trouver n'importe où devant le corps, seul compte son contour vu selon la {{ui:punch.axis}}. Une théière tenue au-dessus d'une plaque y laisse ainsi une ouverture en forme de théière. layerling commence par l'axe le long duquel le poinçon est le plus éloigné du corps ; X va de gauche à droite, Y de l'avant vers l'arrière, Z vers le haut. {{ui:punch.swap}} inverse les rôles, et le {{ui:punch.clearance}} agrandit l'ouverture tout autour, 0,2 mm pour une pièce imprimée qui doit passer. {{ui:punch.apply}} groupe l'ouverture avec le corps sous forme d'esquisse exacte en mode trou, si bien que {{ui:editor.tool.ungroup}} la retire à nouveau ; le poinçon reste où il est. Déplacez-le ou tournez-le et poinçonnez à nouveau pour une autre ouverture.

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
