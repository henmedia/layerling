---
title: Casser les bords et creuser les corps
summary: Chanfrein et congé sur bords choisis, parois d'égale épaisseur pour boîtes, coupelles et étuis.
---

## Chanfreinage et congés des bords

Les arêtes vives sont rarement belles sur une pièce imprimée, et elles ne sont pas non plus particulièrement résistantes. Un **chanfrein** coupe le bord en biais, un **congé** l'arrondit. Les deux agissent sur les bords sur lesquels vous cliquez.

1. Sélectionnez le corps (ou le groupe).
2. Cliquez sur {{ui:editor.tool.fillet}} ou {{ui:editor.tool.chamfer}} dans le ruban, appuyez sur [[B]] pour le congé ou sur [[Shift+B]] pour le chanfrein, ou cliquez avec le bouton droit sur le corps et sélectionnez-le dans le menu.
3. Les bords du corps s'illuminent. Cliquez sur ceux qui devraient être concernés. Un autre clic retire à nouveau un avantage. Avec [[Shift]], vous ajoutez ou supprimez une seule arête.
4. Définissez la taille et confirmez avec {{ui:edge.apply}} ou [[Enter]]. Ensuite la fenêtre reste ouverte sur le nouveau corps avec la même taille, de sorte que l'arrondi ou le chanfrein suivant peut suivre aussitôt ; {{ui:edge.done}}, [[Échap]] ou la croix la ferme. Avec [[Maj]] ou [[Ctrl]], un clic sur {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} ou {{ui:edge.horizontalEdges}} ajoute ces arêtes à celles choisies au lieu de les remplacer.

![L'outil "Congé arêtes" : toutes les arêtes vives sont sélectionnées, l'image montre l'aperçu avec un rayon de 4 mm.](shot:fillet-preview)

Le panneau se trouve en haut à droite. S'il recouvre les bords sur lesquels vous souhaitez cliquer, faites-le glisser par sa barre de titre ; il s'y ouvrira également la prochaine fois, tout comme {{ui:editor.tool.hollow}} et {{ui:editor.tool.array}}. Double-cliquez sur la barre de titre pour la remettre.

Choisir une forme dans la liste des formes alors que le panneau est ouvert le ferme sans rien appliquer et les bords sur lesquels vous avez cliqué sont oubliés. Le clic place ensuite la nouvelle forme au lieu de sélectionner les bords.

Dans le panneau vous trouvez :

- {{ui:edge.allSharpEdges}} sélectionne chaque arête à la fois, {{ui:edge.clear}} vide la sélection.
- **{{ui:edge.radius}}** pour le congé. Pour le chanfrein, vous définissez {{ui:edge.distance}} ou {{ui:edge.angle}}.
- {{ui:edge.sharpThreshold}} décide quels bords sont considérés comme nets. Une valeur de 25° traite uniquement les plis nets comme des bords et laisse les transitions plates seules.
- {{ui:edge.topEdges}} sélectionne uniquement les bords tout en haut du corps. C'est la méthode rapide pour un emporte-pièce : tracez le contour d'une esquisse sous forme d'un trait, puis chanfreinez les bords supérieurs. {{ui:edge.angle}} définit la pente du chanfrein ; il ne peut pas aller plus loin que l'épaisseur du mur.
- {{ui:edge.bottomEdges}} ne sélectionne que les bords tout en bas du corps, le pendant de {{ui:edge.topEdges}}. C'est le moyen rapide d'arrondir ou de chanfreiner seulement le pied d'une pièce.
- {{ui:edge.chamfillet}}, choisi en haut de la fenêtre du chanfrein à côté de {{ui:editor.tool.chamfer}}, crée le pied imprimable d'une pièce : un chanfrein sur le plateau qui se fond tangentiellement dans un congé vers la paroi, de sorte que les premières couches n'ont pas besoin de support et que le bord finit tout de même en douceur. {{ui:edge.distance}} est la hauteur que prend le pied, {{ui:edge.angle}} (15° à 75°) la pente du chanfrein au plateau. Choisissez les bords avec {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} masque les bords qui se trouvent derrière le corps d'où vous regardez. Par défaut, chaque bord apparaît à travers le corps, ce qui prête à confusion sur une partie occupée ; avec l'interrupteur allumé, vous voyez et pouvez cliquer uniquement les bords face à vous. Tournez la vue pour atteindre les autres. Un bord dessiné en rouge (voir ci-dessous) apparaît toujours.
- {{ui:edge.tangentChains}} : un clic sélectionne alors également les arêtes qui s'enchaînent doucement les unes dans les autres, par exemple toutes les arêtes autour d'une face aux coins arrondis. Le commutateur décide uniquement ce qu'un clic sélectionne : le noyau de CAO comporte toujours un chanfrein ou un congé le long de ces bords continus et fluides. Le panneau vous indique le nombre d'arêtes supplémentaires qui se produisent.
- {{ui:edge.keepSize}} conserve le chanfrein ou le congé aussi grand qu'il est, même si vous mettez le corps à l'échelle ultérieurement.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} ou {{ui:edge.fine}}) décide de la précision avec laquelle l'aperçu est calculé. Pour les pièces difficiles, {{ui:edge.draft}} est plus rapide.

Pendant que vous ajustez la taille, layerling recalcule l'aperçu. Cela peut prendre un moment. Vous pouvez continuer à vous adapter ; la dernière valeur que vous avez choisie est celle qui est calculée.

Si la taille est trop grande pour le bord, layerling l'indique et suggère une valeur plus petite. Souvent, un ou deux millimètres de moins suffisent. Aux angles vifs, un congé a besoin de plus d’espace que son rayon ne le suggère. Sur un petit écran, le panneau défile tout seul pour que le message soit visible.

Lorsqu'une sélection qui a fonctionné échoue après avoir cliqué sur un bord supplémentaire, ce bord devient rouge et s'élargit : c'est celui qui ne peut pas être traité avec les autres à cette taille. Cliquez à nouveau dessus pour le retirer ou réduisez la taille. Si vous cliquez sur plusieurs bords pendant que le message est affiché, le premier reste rouge. Lorsqu'aucune sélection antérieure n'a fonctionné - au tout premier clic ou à une taille que vous venez d'augmenter - les bords qui échouent même d'eux-mêmes deviennent rouges, ou tous s'il ne s'agit que de leur combinaison.

Le bord sous le pointeur est également plus large, afin que vous puissiez voir lequel un clic sélectionnera.

Un perçage accepte aussi {{ui:editor.tool.chamfer}} et {{ui:editor.tool.fillet}}, de même que {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} et {{ui:editor.tool.deleteFace}} : il reste un perçage et découpe avec sa nouvelle forme. Arrondir les quatre arêtes verticales d'un perçage en boîte donne une poche aux coins intérieurs arrondis, et un perçage agrandi avec {{ui:editor.tool.offset}} découpe avec autant de jeu en plus. Pour casser l'arête là où un perçage rencontre la pièce, traitez plutôt le groupe terminé : cette arête lui appartient.

### Reprendre un traitement de pointe

Un corps traité peut toujours être traité à nouveau. Sélectionnez-le à nouveau et ouvrez l'outil - Congé, Chanfrein ou Creux, chacun affiche la liste : sous {{ui:edge.featureHistory}} vous voyez ce qu'il y a déjà dessus. {{ui:edge.revertAction}} reprend un seul traitement. Remarque : si des traitements plus récents se trouvent au-dessus, ils vont avec et le panneau vous indique combien.

A côté d'un chanfrein, d'un congé ou d'un évidement, il y a aussi {{ui:edge.editAction}}. Il reprend le traitement de la même manière, mais ouvre à nouveau l'outil immédiatement avec les mêmes bords et l'ancienne valeur. Vous modifiez la valeur et l'appliquez à nouveau : un congé de 3 mm devient un congé de 5 mm sans cliquer à nouveau sur les bords. Si des traitements plus récents se trouvent au-dessus, ils l’accompagnent également ici. Cela vaut pour les traitements de bords que vous effectuerez désormais ; les plus âgés proposent uniquement la reprise, tout comme les parties individuelles d'un groupe.

Sur un groupe, par exemple un cylindre percé d'un trou, le bord traité appartient au corps fini et non à l'une de ses parties. Le groupe devient donc un seul corps. {{ui:editor.tool.ungroup}} fonctionne quand même : il reprend d'abord les traitements des arêtes, puis dissocie le groupe, en une seule étape que [[Ctrl]]+[[Z]] annule. Reprenez le traitement comme décrit ci-dessus et le groupe revient avec toutes ses parties. Le moyen le plus simple consiste à traiter les bords en dernier. Cela vaut également pour les filetages : l'outil de bord prend un filetage comme corps exact, de sorte qu'un bloc avec un trou taraudé obtient ses bords arrondis avec le filetage en place. L'élaboration des bords d'un filetage prend plus de temps que pour une forme simple, quelques secondes pour un filetage M6 et environ une demi-minute pour un filetage de tuyau G1/2.

> **Bon à savoir :** layerling fonctionne avec une véritable géométrie CAO pour les congés et les chanfreins, et pas seulement avec un maillage triangulaire. C'est pourquoi un bord arrondi reste un bord arrondi dans l'exportation STEP.

Une pièce importée en STEP conserve également sa géométrie CAO : chanfreins, congés et travaux d'évidement sur le corps à partir du fichier, quelle que soit la finesse avec laquelle la pièce est dessinée à l'écran. STL, OBJ et 3MF n'apportent que des triangles, et une pièce finement dessinée peut être trop dense pour l'outil de bord. Si une pièce est également disponible en STEP, importez-la.

## Corps creux

Boîtes, tasses, étuis et couvercles ont un point commun : ils sont vides à l'intérieur, avec des parois d'égale épaisseur. C'est exactement ce que fait {{ui:editor.tool.hollow}}.

1. Sélectionnez le corps et cliquez sur {{ui:editor.tool.hollow}}, ou cliquez avec le bouton droit sur le corps et sélectionnez-le dans le menu.
2. Définissez {{ui:shell.wall}}.
3. Sous {{ui:shell.openings}}, activez les côtés qui restent ouverts : {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} ou {{ui:shell.side.right}}, autant que vous le souhaitez - {{ui:shell.side.front}} fait à lui seul un emplacement pour un tiroir, {{ui:shell.side.left}} et {{ui:shell.side.right}} un tunnel. Sans aucun côté allumé, le corps reste fermé sur tout son pourtour, avec une cavité au milieu. {{ui:shell.side.closed}} désactive tous les côtés en un clic. {{ui:shell.side.top}} est déjà activé à l'ouverture du panneau ; un clic dessus referme le dessus. Un corps fermé de tous côtés semble inchangé de l'extérieur : la vue en coupe montre la cavité.
4. Décidez si {{ui:shell.edges}} doit être {{ui:shell.edges.round}} ou {{ui:shell.edges.sharp}}.
5. Cliquez sur {{ui:shell.apply}}.

![Le panneau creux avec l'épaisseur de la paroi, un interrupteur pour chaque côté qui reste ouvert et les bords intérieurs.](shot:hollow-panel)

Les murs grandissent vers l’intérieur. L’extérieur reste tel quel.

Le {{ui:shell.edges}} n'a d'importance que là où les parois intérieures s'écartent - à un niveau du corps ou autour d'une ouverture. Les coins de la cavité d'une boîte ordinaire sont toujours pointus, avec les deux réglages. Pour un intérieur arrondi, arrondissez d'abord les bords extérieurs du corps (voir ci-dessus), puis creusez-le : l'intérieur suit avec le rayon moins l'épaisseur de paroi. Si l'intérieur arrondi ne peut pas être construit, ce qui peut arriver avec un contour composé de très nombreuses pièces droites courtes telles qu'un dessin tracé, layerling construit à la place le même corps creux avec des coins intérieurs pointus.

![Le résultat : une coque avec une paroi de 3 mm, ouverte en haut.](shot:hollow-result)

![La même boîte avec seulement la face avant ouverte : un emplacement pour un tiroir.](shot:hollow-sides)

Pour chaque côté ouvert, le corps a besoin d’une face plate tout au bord de ce côté. Les sphères et les formes libres ne peuvent donc pas être creusées de cette façon. Si le mur est trop épais pour le corps, layerling vous le signale et en demande un plus fin. Une boîte arrondie dont les bords supérieur et inférieur sont aussi arrondis en est un exemple : son mur doit être nettement plus fin que cet arrondi, ou mettez d'abord l'arrondi à 0.

Un corps avec une poche - un bloc avec un trou qui ne traverse pas complètement, réalisé en regroupant une boîte avec un trou surélevé - peut également être creusé, avec le dessus ouvert : les parois autour de la poche sont également creusées, de sorte qu'un anneau de cavité reste entre la paroi extérieure et la poche, ouvert en haut, et une fine cavité se trouve sous le fond de la poche.

**Les corps qui se terminent par un point**, comme un cône ou un triangle de révolution, n'ont pas de face plate sur le dessus qui pourrait rester ouverte. Là non plus, une cavité entièrement fermée ne fonctionne pas, car un point ne peut pas être décalé vers l'intérieur : même avec un mur de 1 mm, vous obtenez le message que les murs ne peuvent pas être aussi épais. Dessinez plutôt le mur dans le profil avant de procéder à la révolution : dupliquez le contour, réduisez la copie de manière uniforme, placez-la au milieu du grand contour et coupez le grand avec, puis faites pivoter le tout (chapitre Esquisses, section Révolution). La distance entre les deux contours correspond à l’épaisseur de la paroi.

Si vous redimensionnez un corps évidé ultérieurement, layerling le creuse immédiatement à nouveau à la nouvelle taille. Le mur reste aussi épais que vous l'avez choisi, corps ronds inclus. Un cylindre que vous tirez plus loin dans un sens que dans l’autre devient une ellipse.

> **Astuce :** Avec une buse de 0,4 mm, 1,2 à 2 mm de paroi est un bon début : suffisamment fin pour économiser de la matière, suffisamment épais pour une pièce solide.

## Un couvercle pour un corps ouvert

{{ui:editor.tool.lid}} crée le couvercle d'un corps ouvert en haut : une boîte évidée avec le dessus ouvert, un pot, un plateau. Sélectionne le corps et clique sur {{ui:editor.tool.lid}}. Dans la fenêtre, tu choisis le type :

- {{ui:lid.type.plug}} : une plaque aussi grande que le corps avec en dessous une lèvre qui entre dans l'ouverture.
- {{ui:lid.type.cap}} : une plaque plus large que le corps d'une paroi avec en dessous un rebord qui passe par-dessus l'extérieur.
- {{ui:lid.type.both}} : une plaque plus large que le corps d'une paroi avec les deux : une lèvre dans l'ouverture et un rebord par-dessus l'extérieur. La paroi du corps se loge entre les deux dans une rainure, comme sur une boîte alimentaire.
- {{ui:lid.type.flat}} : seulement la plaque, à poser ou à coller.

Ensuite tu règles l'{{ui:lid.thickness}}, l'{{ui:lid.fit}} (le {{ui:lid.gap}} entre couvercle et corps : 0,1 mm serré, 0,2 mm normal, 0,3 mm lâche, ou toute valeur jusqu'à 1 mm) et jusqu'où descend la lèvre ou le rebord et l'épaisseur de sa paroi. Clique sur {{ui:lid.apply}} : le couvercle est posé à côté du corps, retourné, plaque en bas, et s'imprime ainsi sans supports. Le corps reste tel quel. Le couvercle suit n'importe quel contour, rond ou anguleux, car il est pris sur le corps lui-même juste sous son bord. Un corps sans ouverture en haut n'obtient qu'un couvercle plat ; pour les autres, évide-le d'abord avec le dessus ouvert.

> **Astuce :** Le serrage d'un couvercle dépend de l'imprimante. Imprime d'abord une petite boîte avec son couvercle ; s'il est trop serré, prends l'ajustement suivant, plus lâche.

## Décaler des corps

Chaque face d'un corps peut être déplacée de la même distance, vers l'extérieur ou l'intérieur. C'est ce qu'il faut pour un ajustement, un couvercle ou un assemblage à clip : un jeu de 0,1 à 0,3 mm tout autour, les éléments restant à leur place, ce que la mise à l'échelle ne donne pas.

1. Sélectionne un corps et clique sur {{ui:editor.tool.offset}}, ou fais un clic droit sur le corps et choisis-le là.
2. Choisis {{ui:offset.grow}} ou {{ui:offset.shrink}} et règle la {{ui:offset.distance}}.
3. Les {{ui:offset.edges}} décident des coins extérieurs : arrondi garde la surface décalée ronde, vif laisse les faces se prolonger jusqu'à ce qu'elles se rencontrent.
4. Coche {{ui:offset.copy}} pour garder la pièce telle quelle et obtenir le corps agrandi comme copie qui est déjà un trou. Groupe ce trou avec la pièce complémentaire, il coupe exactement le jeu choisi.
5. Clique sur {{ui:offset.apply}}.

Coche {{ui:offset.sideways}} quand seul le contour doit grandir ou rétrécir : les côtés se déplacent de la distance, et chaque face plane du dessus et du dessous garde sa hauteur. Un panneau reçoit une bordure tout autour, un socle s'élargit, et le corps ne devient pas plus haut. Sur un corps en gradins, chaque marche garde sa propre hauteur. Un texte décalé par ses contours garde alors lui aussi sa hauteur.

Sans la coche, le corps lui-même est décalé. Il devient un corps exact fixe, comme après un chanfrein : la liste en haut du panneau annule le décalage, et {{ui:edge.editAction}} rouvre l'outil avec l'ancienne distance. Seuls les corps CAD exacts peuvent être décalés - boîtes, cylindres et les autres formes, leurs groupes, pièces STEP importées. Un corps qui n'est qu'un maillage de triangles, comme beaucoup d'imports STL, ne le peut souvent pas. Une distance trop grande pour le corps, par exemple une réduction au-delà de sa paroi la plus fine, est refusée.

## Supprimer des faces

Un congé qui gêne, un trou au mauvais endroit, un bossage dont vous n'avez plus besoin : {{ui:editor.tool.deleteFace}} les retire du corps, sans avoir à le reconstruire.

1. Sélectionnez le corps et cliquez sur {{ui:editor.tool.deleteFace}}, ou cliquez avec le bouton droit sur le corps et sélectionnez-le dans le menu.
2. Cliquez sur chaque face de ce qui doit disparaître : les faces d'un bord arrondi, la paroi d'un trou, le côté et le dessus d'un bossage. Une face choisie s'allume ; un nouveau clic la retire. Le panneau compte les faces.
3. Cliquez sur {{ui:deleteFace.apply}} ou appuyez sur [[Delete]]. [[Esc]] ferme l'outil sans rien changer.

Les faces autour s'étendent jusqu'à refermer le vide. Un bloc aux bords supérieurs arrondis retrouve ses arêtes vives, un trou est comblé, un bossage disparaît. Le corps reste exact : il peut à nouveau recevoir des congés et des chanfreins, et l'export STEP garde ses vraies faces. [[Ctrl]]+[[Z]] annule la suppression en une étape. Elle figure aussi sous {{ui:edge.featureHistory}}, au même titre que les congés et les chanfreins, où {{ui:edge.revertAction}} l'annule ; il n'y a pas de {{ui:edge.editAction}} pour elle. Sur un groupe, le résultat est un seul corps, comme pour un traitement de bord.

Choisissez toutes les faces de ce qui doit disparaître, et seulement celles-là. Si les faces autour ne peuvent pas refermer le vide, layerling le signale et rien ne change : une face principale d'un bloc, par exemple, n'a pas de voisine qui puisse prendre sa place. Supprimer seulement le fond d'une poche en fait un trou traversant, car les parois de la poche se prolongent jusqu'à l'autre côté.

{{ui:editor.tool.deleteFace}} a besoin de faces exactes : il fonctionne sur les pièces importées en STEP et sur les formes de layerling. Ce que layerling garde comme maillage n'en a pas : un fichier STL, OBJ ou 3MF importé, un corps divisé, enroulé autour d'un cylindre ou simplifié, ou une forme très détaillée comme un long texte. Importez une pièce en STEP si possible. Sur une pièce importée détaillée, quelques faces peuvent être trop lourdes pour le noyau CAO : au bout de 45 secondes, la suppression est arrêtée et rien ne change. Un corps redimensionné après un traitement de bord en gardant la taille des bords n'a pas de faces exactes à sa nouvelle taille tant que le redimensionnement n'est pas annulé.
