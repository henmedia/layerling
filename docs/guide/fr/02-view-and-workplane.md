---
title: Vue et plan de travail
summary: Déplacez-vous dans la scène, regardez droit devant et placez de nouvelles formes sur n'importe quelle surface de votre choix.
---

## Se déplacer

Avec la souris :

| Que faites-vous | Que se passe-t-il |
| --- | --- |
| faites glisser avec le bouton droit | faire pivoter la vue |
| cliquez sur le bouton droit | sur un corps, un menu avec les commandes les plus utilisées : dupliquer, percer ou solide, grouper, masquer, verrouiller, supprimer et plus encore ; sur un espace vide Coller et tout sélectionner |
| faites glisser avec le bouton du milieu | déplacer la vue |
| molette de la souris | zoomer et dézoomer |
| maintenez [[Ctrl]] / [[Cmd]] et faites glisser avec le bouton gauche | déplace également la vue |
| double-clic sur un endroit vide du plan de travail ou à côté de la plaque | déplace la vue pour amener cet endroit au milieu ; la vue tourne ensuite autour de lui |

La vitesse de zoom de la molette se règle avec {{ui:workspace.zoomSpeed}} dans les paramètres, sous {{ui:workspace.appearance}} : un curseur de 1 à 14, réglé sur 5 au départ ; au-dessus de 10, seule la molette devient plus rapide.

**Boutons de la souris comme dans votre trancheur.** Si vous êtes habitué à Bambu Studio ou OrcaSlicer, réglez {{ui:workspace.mouseScheme}} dans les réglages, sous {{ui:workspace.appearance}}, sur {{ui:workspace.mouseSchemeSlicer}}. Un glissement gauche dans le vide fait alors tourner la vue, le bouton droit la décale comme le bouton du milieu, et Maj avec un glissement gauche trace le cadre de sélection. Un glissement sur un corps le déplace toujours, et un clic droit bref ouvre toujours le menu. Dans une esquisse, le bouton droit décale aussi la vue.

**Souris 3D.** Une SpaceMouse ou une autre souris 3D tourne, décale et zoome la vue 3D : poussez le capuchon vers l'avant pour zoomer, faites-le glisser pour décaler la vue, inclinez-le pour incliner la vue et tournez-le pour faire pivoter la vue. Dans les réglages, sous {{ui:workspace.appearance}}, cliquez sur {{ui:workspace.spaceMouseConnect}} et choisissez l'appareil dans la fenêtre que le navigateur ouvre ; il retient le choix, il ne faut donc le faire qu'une fois. Cela fonctionne dans Chrome et Edge, qui peuvent accéder à ces appareils ; Firefox et Safari ne le peuvent pas. Si une direction paraît à l'envers, cochez-la sous le bouton : décaler sur le côté, décaler vers le haut ou le bas, zoomer, incliner ou tourner.

Sur une tablette ou un téléphone, deux doigts zooment (écartent et pincent) et déplacent la vue (glissent ensemble). Un doigt travaille sur le design, tout comme le bouton gauche de la souris. Pour faire pivoter avec un doigt, activez {{ui:camera.touchRotate}} dans la barre de vue. Ce commutateur ne s'affiche que sur les appareils dotés d'un écran tactile.

Une tablette graphique avec stylet se comporte comme une souris : la pointe est le bouton gauche, le bouton cylindrique du stylet celui de droite, pour tourner la vue et pour le menu. Les raccourcis clavier de la tablette peuvent être définis dans son pilote sur les [raccourcis clavier] de Layerling (chapter:shortcuts).

### Le cube de visualisation

Le cube en haut à gauche indique où vous regardez. Un clic sur l'un de ses côtés permet d'accéder à la vue droite du haut, du bas, de l'avant, de l'arrière, de la gauche ou de la droite. Un clic sur un coin du cube regarde le modèle en diagonale depuis ce coin, et un clic près d'un bord regarde depuis ce bord, entre deux côtés ; le spot s'allume lorsque le pointeur est dessus. Les touches numériques [[1]] à [[6]] donnent également les vues droites. Maintenez [[Shift]] avec eux et la vue effectue également un zoom sur la sélection, comme le fait [[Shift]]+[[F]].

Faites glisser le cube pour inverser la vue, tout comme en le faisant glisser avec le bouton droit de la souris. Sans rien sélectionné, les touches fléchées font également pivoter la vue : 15° en appuyant, 90° avec [[Shift]]. Ils tournent le modèle dans la direction où ils pointent - [[→]] tourne son avant vers la droite, [[↑]] incline son avant vers le haut. Avec [[Ctrl]] enfoncée, les flèches font plutôt glisser la vue à travers l'écran : un dixième de l'image par appui, la moitié avec [[Shift]] en plus. Le modèle se déplace dans la direction où elles pointent. Si quelque chose est sélectionné, les flèches le déplacent ; cliquez d'abord sur un espace vide pour faire tourner la vue. Sur un écran tactile, cela fonctionne avec un seul doigt, sans activer {{ui:camera.touchRotate}}.

### La barre de vue

Sur le bord gauche se trouve une barre étroite. Du haut :

- {{ui:camera.home}} ramène toute la scène en vue. La touche est [[Home]] ; [[F]] le fait aussi quand rien n'est sélectionné.
- {{ui:camera.focusSelection}} effectue un zoom sur la sélection ([[F]] ou [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} et {{ui:camera.zoomOut}} zooment pas à pas, tout comme les touches [[+]] et [[−]].
- {{ui:camera.orthographic}} passe à une vue plate dans laquelle les bords parallèles restent parallèles. Pour mesurer et aligner les bords, c'est souvent plus confortable que la vue en perspective. [[O]] bascule d'avant en arrière et un deuxième clic revient.
- {{ui:camera.secondView}} ouvre une deuxième vue du design dans une fenêtre à part, décrite plus bas. Un second clic la ferme.
- {{ui:camera.showScrollbars}} affiche une barre de défilement en bas de la vue et une autre le long de son bord droit. Faites glisser une barre pour déplacer la vue en douceur, cliquez sur une flèche à son extrémité pour la déplacer un peu (maintenez pour continuer), ou cliquez à côté de la barre pour avancer de presque toute la vue. Rien ne tourne et, contrairement aux touches fléchées, les barres fonctionnent même quand une pièce est sélectionnée - pratique de près, sur les petits détails. Un second clic les masque ; {{ui:workspace.startWithScrollbars}} dans les réglages décide si un projet s'ouvre avec elles. Ce navigateur retient aussi le choix.
- {{ui:camera.hideWorkplane}} (l'œil au-dessus d'une grille) cache la plaque avec sa grille, vous pouvez donc regarder le dessous d'un dessin par le bas. Seule la vue change : de nouvelles formes atterrissent toujours sur le plan de travail. Un deuxième clic l'affiche à nouveau.
- {{ui:camera.placeWorkplane}}, le mètre ruban et l'équerre d'encadrement sont des outils à part entière, abordés ci-dessous et dans [Mesures et notes] (chapter:measuring-and-notes).

La petite flèche tout en haut de la barre la cache si elle gêne.

Un design s'ouvre comme vous l'avez laissé : l'angle, le zoom et la position de la vue sont conservés avec lui dans ce navigateur, de sorte que vous continuez là où vous vous êtes arrêté, même après être retourné à Home ou avoir fermé la page. Un fichier enregistré (.lyl) emporte la vue, elle s'y ouvre donc également ailleurs. La vue ne fait pas partie de l'historique d'annulation.

Vous pouvez aussi garder quatre vues à vous dans chaque design. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] ou [[Shift]]+[[0]] enregistre la vue exactement telle qu'elle est - angle, position, zoom, et vue plate ou en perspective - sous cette touche, et la touche seule ([[7]], [[8]], [[9]] ou [[0]]) la ramène. Un message en bas confirme l'enregistrement ; enregistrer à nouveau sous la même touche remplace la vue. Comme la vue ci-dessus, les vues enregistrées restent avec le design dans ce navigateur et voyagent dans un fichier enregistré (.lyl) ; elles ne font pas partie de l'historique d'annulation.

### Une deuxième vue dans sa propre fenêtre

{{ui:camera.secondView}} ouvre une fenêtre qui montre le même design à travers sa propre caméra, pour le voir de deux côtés à la fois - de face, par exemple, pendant que vous travaillez par le dessus. Chaque modification faite dans l'éditeur y apparaît aussitôt ; le design ne se modifie que dans la fenêtre principale, et les poignées y restent aussi. Dans la deuxième fenêtre, la souris et le cube de vue tournent sa vue comme ici, de même que les touches : [[1]] à [[6]], [[F]], [[Home]], [[O]], [[+]] et [[−]], les flèches pour tourner et [[Ctrl]] avec les flèches pour faire glisser. [[F]] y cadre ce qui est sélectionné dans l'éditeur. Les quatre vues enregistrées du design y fonctionnent aussi : [[7]], [[8]], [[9]] et [[0]] les ramènent, et [[Shift]] avec l'une de ces touches y enregistre la vue de cette fenêtre - pour les deux fenêtres. Sa propre barre de vue a {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} et {{ui:camera.hideWorkplane}}, qui n'agissent que sur cette fenêtre. La fenêtre s'ouvre là où vous l'avez laissée, à la même taille, et se ferme avec l'éditeur. Sur les téléphones et les tablettes, le bouton n'apparaît pas.

## Regarder à l'intérieur : la vue en coupe

{{ui:camera.sectionView}}, le dernier bouton de la barre (l'outil de coupe), coupe la vue ouverte le long d'un plan afin que vous puissiez vérifier les murs, les cavités et les pièces qui s'emboîtent les unes dans les autres. Rien n'est coupé pour vrai : le design, ses fichiers et chaque export restent entiers. Là où le plan traverse un corps plein, la coupe est remplie de la couleur du corps, un peu plus foncée, et un évidement à l'intérieur reste vide, de sorte qu'on distingue le plein du creux ; la face remplie apparaît un instant après que le plan s'est arrêté. Sous {{ui:camera.sectionCutFace}}, tu choisis l'aspect de la coupe : {{ui:camera.sectionCutFaceHatch}}, le réglage de départ, la hachure comme un plan, et un corps situé dans un autre est hachuré dans l'autre sens, pour que les deux se distinguent ; {{ui:camera.sectionCutFaceFill}} la remplit d'une seule couleur ; {{ui:camera.sectionCutFaceOpen}} la laisse ouverte, et tu vois l'intérieur de la peau du corps. Le choix vaut pour tous les dessins.

- Choisissez l'axe sur lequel se situe le plan : X (largeur), Y (profondeur) ou Z (hauteur), comme dans les champs de position. L'avion commence au milieu de votre dessin.
- {{ui:camera.sectionOrientation}} indique ce que suivent ces axes. {{ui:camera.sectionOrientationWorld}} prend les axes du modèle. {{ui:camera.sectionOrientationWorkplane}} prend ceux du plan de travail : Z coupe alors parallèlement à lui, X et Y perpendiculairement, et la position se compte depuis son origine. Avec le plan de travail sur une face inclinée, tu coupes ainsi parallèlement à cette face, et la coupe suit quand tu déplaces le plan de travail. {{ui:camera.sectionOrientationView}} tourne le plan face à l'écran : il enlève ce qui se trouve devant, et le curseur le pousse plus loin dans le modèle dans le sens du regard, par exemple pour atteindre une pièce cachée et la sélectionner. Après avoir tourné la vue, clique à nouveau dessus et la coupe suit la nouvelle vue.
- {{ui:camera.sectionCoarse}} déplace le plan sur tout le dessin, {{ui:camera.sectionFine}} le déplace un peu de chaque côté de son emplacement, sur des dixièmes de millimètre. Vous pouvez également saisir le poste.
- Le bouton à côté des axes montre l'autre côté de la coupe, {{ui:camera.sectionReset}} remet le plan au milieu, et {{ui:camera.sectionShowPlane}} masque le plan bleu.
- Vous pouvez cliquer et sélectionner ce que la coupe laisse ouverte, parois intérieures incluses.
- {{ui:camera.sectionWorkplane}} met le plan de travail sur la coupe. Il repose sur le plan de la coupe et fait face à l'extérieur du corps qui reste, comme le visage qu'une coupure laisse. Si vous passez ensuite à l'esquisse, elle commence exactement là et le contour pâle montre la coupe, que vous pouvez dessiner et sur laquelle vous pouvez vous accrocher. C'est ainsi que vous dessinez un couvercle qui s'adapte à la cavité que vous avez ouverte avec la section, par exemple. Le bouton à côté des axes choisit quel côté reste, et avec lui, dans quelle direction le plan de travail est orienté. Vous remettez le plan de travail sur la plaque de base comme d'habitude.
- {{ui:camera.sectionSketch}} commence une nouvelle esquisse directement sur la coupe, avec déjà les contours de la coupe comme lignes : un trou arrive comme un vrai cercle, un coin arrondi comme un arc. Modifiez-les, supprimez ce dont vous n'avez pas besoin, dessinez davantage et terminez : le corps sort de la coupe vers le côté retiré, si bien qu'une pièce qui doit s'ajuster à une autre, comme un couvercle, un insert ou un joint, part du contour même de cette pièce. Le bouton à côté des axes choisit ce côté. Comme pour le SVG, seuls les corps visibles comptent et les trous sont déjà soustraits.
- {{ui:camera.sectionMeasure}} mesure directement sur la coupe : le contour apparaît en bleu, et deux clics dessus donnent la distance, plus ses parties selon les deux axes du plan. Les deux points s'accrochent au contour, les coins en premier. Lorsque le deuxième clic atterrit n'importe où sur le mur opposé, il s'aligne sur le premier point - vous pouvez ainsi lire l'épaisseur du mur, les espaces et le dégagement sans viser exactement. Un troisième clic démarre la mesure suivante, [[Esc]] termine la mesure. Le déplacement de l'avion efface la mesure. Sur un contour rond, par exemple la coupe d'un cylindre ou d'un trou, une petite croix marque le centre, et le centre s'accroche aussi. Cliquez un point du cercle, puis approchez-vous du point opposé : le second clic tombe exactement en face, à travers le centre, et le nombre est précédé de Ø, c'est le diamètre. Du centre à un point du cercle, vous lisez R, le rayon.
- {{ui:camera.sectionExportSvg}} enregistre les contours sur le plan de coupe au format SVG au 1:1, pour un laser, un traceur, un gabarit ou un joint. Une coupe en X est vue de droite, une coupe en Y de face, une coupe en Z de dessus. Comme lors de l'exportation, seuls les corps visibles entrent, les trous sont déjà supprimés et les corps de la même couleur sont réunis en un seul contour. Chaque couleur conserve son propre chemin sans remplissage, de sorte que le logiciel laser les sépare sous forme de calques.

Le X et [[Esc]] ferment la fenêtre d'outil ; si une mesure est en cours, [[Esc]] la termine d'abord. La coupe reste jusqu'à ce que vous la désactiviez avec {{ui:camera.sectionActive}}, que vous cliquiez sur son bouton dans la barre pendant que la fenêtre est ouverte, ou que vous reveniez à l'aperçu des conceptions. Tant qu'elle est active, son bouton reste mis en évidence. Ce que vous placez du côté retiré par la coupe n'apparaît qu'une fois la coupe désactivée. Une tablette n'a pas de touche [[Esc]], la fenêtre d'outil y a donc deux boutons de plus : {{ui:camera.sectionBack}} termine la mesure si elle est en cours et ferme sinon la fenêtre d'outil, et {{ui:camera.sectionConfirm}} ferme la fenêtre d'outil en une étape. Un ordinateur ne les affiche pas.

La fenêtre d'outil s'accroche à son bouton. S'il recouvre quelque chose, faites-le glisser par sa barre de titre n'importe où sur le plan de travail ; il y ouvrira la prochaine fois aussi. Double-cliquez sur la barre de titre ou déposez-la sur le bouton pour la remettre en place.

[[Esc]] ferme la fenêtre ; la coupe reste jusqu'à ce que vous l'éteigniez ou reveniez à l'aperçu du design. Lorsqu'il est allumé, son bouton reste en surbrillance. Tout ce que vous placez sur le côté coupé ne s'affiche qu'une fois que vous avez désactivé la coupure.

## Le plan de travail

Les nouvelles formes s'alignent sur le plan de travail. Au début, c'est la plaque de base avec la grille. Mais vous pouvez le poser sur n'importe quelle surface, pour placer quelque chose sur un côté ou une face inclinée.

1. Appuyez sur [[W]] ou cliquez sur {{ui:camera.placeWorkplane}}.
2. Déplacez la souris sur une face d'un corps. Il s'allume.
3. Un clic y place le plan de travail. Tout ce que vous ajoutez repose désormais sur ce visage.

Cliquez plutôt sur la plaque vide et le plan de travail repose à plat à l'endroit sur lequel vous avez cliqué, sur la grille d'accrochage. De nouvelles formes et une esquisse terminée, également tournée, apparaissent alors là plutôt qu'au milieu de la planche. Alors que le plan de travail repose ainsi à plat sur la plaque, la plaque ne montre que son contour : deux grilles dans le même plan formeraient un motif scintillant.

Sur une face, l'origine du plan de travail s'accroche autrement à la grille. Cliquez près d’un coin du visage et il se place exactement sur ce coin. Près d'un bord, il repose sur le bord et la grille s'aligne avec lui ; c’est ainsi que l’on choisit volontairement l’angle de la grille. Sans coin ni bord, la grille sur une face couchée est parallèle au corps, donc sur une boîte tournée, elle est tournée avec lui.

Un clic à côté de la plaque ou [[Esc]] ramène le plan de travail à la plaque de base. {{ui:camera.resetWorkplane}} est encore plus rapide : le bouton avec la flèche vers le bas se trouve dans la barre de vue sous l'œil tandis que le plan de travail se trouve sur un visage. [[Shift]]+[[W]] le place directement sur la face actuellement sélectionnée. [[Alt]]+[[W]] le ramène sur la plaque de base à tout moment, qu'il y ait une sélection ou non. Si vous maintenez [[Shift]] tout en cliquant, le plan pointe dans l'autre sens.

Lorsqu'un plan de travail repose sur une face, un œil apparaît à côté de {{ui:camera.placeWorkplane}}. Il masque le plan de travail sans le faire tomber, pour une vision claire du design : de nouvelles formes se posent toujours sur cette face, et la rotation tourne toujours autour d'elle. Un clic sur l'œil le montre à nouveau, tout comme la définition d'un nouveau plan de travail.

Pour regarder le plan de travail de face, appuie sur [[P]] ou clique sur {{ui:camera.lookOntoWorkplane}} à côté de {{ui:camera.placeWorkplane}} dans la barre de vue. La vue tourne jusqu'à ce que tu voies le plan de face, du côté vers lequel poussent les nouvelles formes, avec son origine au milieu. Sur la plaque de base, c'est la vue de dessus.

## Plateaux d'impression

Quand un design contient plus qu'un plateau ne peut imprimer, une boîte avec son couvercle et ses inserts par exemple, il peut avoir plusieurs plateaux d'impression. Cliquez sur {{ui:editor.tool.buildPlates}} dans le groupe {{ui:editor.group.arrange}}, ou choisissez {{ui:plates.moveTo}} dans le menu du clic droit sur un corps. Une barre apparaît au pied de la vue, avec un bouton par plateau ; le nombre indique combien de corps s'y trouvent.

- Chaque plateau est aussi grand que le plan de travail, et les plateaux sont côte à côte à droite du premier, à 20 mm l'un de l'autre. Un corps appartient au plateau sur lequel se trouve le milieu de son empreinte ; en le faisant glisser de l'autre côté, il passe sur l'autre plateau. Un design compte jusqu'à 12 plateaux.
- Un clic sur un plateau dans la barre l'affiche, et les nouvelles formes s'y posent alors. {{ui:plates.showAll}} les affiche tous. Un double-clic sur un plateau, ou {{ui:plates.rename}}, lui donne un nom comme « Couvercle », écrit sur le plateau.
- {{ui:plates.moveLeft}} et {{ui:plates.moveRight}} changent l'ordre, les corps suivant leur plateau. {{ui:plates.remove}} retire le plateau actif ; ses corps passent sur le premier plateau au même endroit.
- {{ui:plates.arrange}} dispose les corps sélectionnés, ou tous, rangée par rangée sur les plateaux, les plus grands d'abord, à 5 mm l'un de l'autre, et ajoute des plateaux tant qu'il en faut. Un corps plus grand qu'un plateau reste en place.
- Avec une imprimante choisie, chaque corps est contrôlé par rapport à son propre plateau, et la hauteur d'impression compte à partir du corps le plus bas de ce plateau. Un plateau avec un corps qui ne tient pas affiche son nombre en rouge.
- Dans les propriétés, X compte à partir du milieu du plateau du corps.

La fenêtre d'export propose alors {{ui:export.plates}} : tous les plateaux dans un fichier, côte à côte comme dans le design ; un fichier par plateau, réunis dans un ZIP (STL, 3MF et OBJ) ; ou un seul plateau, placé à l'endroit du premier. Un trancheur ouvre chaque fichier comme un seul plateau ; pour imprimer les plateaux l'un après l'autre, prenez donc les fichiers par plateau. Déplacer des corps entre plateaux et les répartir peut être annulé ; ajouter, nommer, ordonner et retirer des plateaux est enregistré avec le design, mais pas annulé.

## Grille et capture

La grille montre la taille de la plaque. En bas à droite se trouve l'**étape d'accrochage** : déplacer et mettre à l'échelle l'accrochage par pas de cette taille, par exemple 1 mm. Réduisez-le pour un travail fin et plus grand pour un arrangement grossier. {{ui:editor.tool.snapToGrid}} dans le ruban déplace ensuite les formes sélectionnées sur le croisement de grille le plus proche. Lors du déplacement, les formes s'alignent également sur d'autres formes, voir [Sélection et organisation] (chapter:select-and-arrange).

> **Conseil :** Arrêtez de faire pivoter la vue lorsque vous assemblez exactement les pièces. Utilisez les touches numériques pour accéder à la vue droite de dessus ou de face et appuyez sur [[O]] pour l'affichage plat. Vous voyez alors immédiatement si les deux bords sont vraiment à égalité.

### La fenêtre des réglages

La roue dentée dans la ligne du titre ({{ui:editor.workspaceSettings}}) ouvre les réglages. À gauche se trouvent cinq zones : {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} et {{ui:workspace.history}}. Une modification compte tout de suite. {{ui:workspace.makeDefault}} en bas enregistre les réglages actuels comme réglages par défaut, afin qu'une nouvelle conception commence avec eux. Un fichier que vous ouvrez apporte ses propres réglages ; {{ui:workspace.useMyDefault}} à côté applique à la conception ouverte vos couleurs, votre grille et le reste enregistrés, en gardant ses unités. Si vos réglages par défaut comportent une imprimante, cette imprimante arrive avec la taille de son plateau ; sans imprimante, la conception garde son plateau et son imprimante. {{ui:workspace.close}} en haut à droite ferme la fenêtre. Cette partie passe les réglages en revue un par un.

### Apparence : thème, barre d'outils et cube de vue

{{ui:workspace.theme}} définit la palette de couleurs de tout le programme : {{ui:workspace.themeSystem}} suit votre ordinateur, les autres sont {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} et {{ui:workspace.themeGraphite}}. Vous pouvez aussi la changer en haut à droite de l'éditeur.

{{ui:workspace.toolbarSize}} sous {{ui:workspace.appearance}} rend les boutons du ruban en haut, son menu de forme, la barre de vue à gauche et le panneau des propriétés à droite plus petits ou plus grands : {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (comme toujours) ou {{ui:workspace.toolbarSizeLarge}}. Small laisse plus de place pour le plan de travail sur un ordinateur portable ; grand est plus facile à frapper sur un grand écran ou avec un doigt. Avec de gros boutons, les groupes du ruban passent sur une deuxième rangée lorsque la fenêtre est trop étroite pour eux. La taille est conservée dans ce navigateur et s'applique à chaque conception.

{{ui:workspace.shapeColors}} met la couleur avec laquelle commence une nouvelle forme sur les images de la bibliothèque de formes (la couleur de son type, ou celle que vous avez enregistrée avec {{ui:inspector.saveDefaults}}). Désactivez-le si vous préférez des images grises ; votre navigateur se souvient du choix.

{{ui:workspace.viewCubePosition}} sous {{ui:workspace.appearance}} place le cube d'orientation dans un autre coin de l'espace de travail : {{ui:workspace.viewCubePositionTopLeft}} (comme toujours), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} ou {{ui:workspace.viewCubePositionBottomRight}}. Dans tout autre coin qu'en haut à gauche, la barre de vue remonte à la place libérée par le cube. En bas à droite, le cube se tient juste au-dessus de la commande {{ui:inspector.snapGrid}}. Tant que les propriétés d'une forme sont ouvertes à droite, un cube placé à droite se décale à leur gauche. Le coin est conservé dans ce navigateur et s'applique à chaque conception. Dans une fenêtre étroite, comme sur un téléphone, le réglage est masqué et le cube reste en haut à gauche.

### Apparence : mode rapide

{{ui:workspace.fastMode}} est fait pour les ordinateurs plus lents. Il désactive les ombres, les lignes de bord sur tous les corps et l'inertie de la caméra, et ne dessine la vue qu'à la résolution de l'écran. Vos propres réglages sont gardés pour plus tard, et les commutateurs qu'il remplace indiquent {{ui:workspace.offInFastMode}} tant qu'il est actif. Ce qui aide d'autre sur un ordinateur lent figure plus bas sous « Quand layerling semble lent ».

### Apparence : couleurs de la zone de travail et de l'esquisse

Les couleurs de la zone de travail se règlent sous {{ui:workspace.appearance}} : {{ui:workspace.backgroundColor}} et {{ui:workspace.surfaceColor}} pour le thème clair (les thèmes sombres gardent les leurs), à côté de la couleur de la grille sous {{ui:workspace.workplane}}. Chaque couleur est un bouton qui montre la couleur. Un clic ouvre une petite fenêtre avec le champ de couleur, une rangée de couleurs toutes prêtes, un champ pour la valeur hexadécimale et une flèche qui remet la couleur de départ de layerling. [[Enter]] prend une valeur hexadécimale saisie, tout comme un clic en dehors de la fenêtre.

La vue d'esquisse a ses propres couleurs : {{ui:workspace.sketchBackground}} pour la fenêtre autour de la feuille, {{ui:workspace.sketchPlateColor}} pour la feuille sous la grille et {{ui:workspace.sketchGridColor}}, le tout pour le thème clair. {{ui:workspace.sketchMatch}} reprend les trois couleurs de la zone de travail en un clic.

{{ui:workspace.classicLook}} règle la zone de travail comme la montre Tinkercad : fond blanc, une grille millimétrique bleu pâle avec une ligne plus foncée tous les centimètres, des lignes de bord noires, une lumière venant d'en haut avec des ombres douces. Chaque valeur peut encore être modifiée seule par la suite. Toutes commencent comme layerling a toujours été, et ce qui vous convient dépend de votre écran.

![Les paramètres sous Apparence : couleurs d'arrière-plan et du plan de travail pour le thème de lumière et le commutateur pour les lignes de bord sur tous les corps.](shot:settings-appearance)

![L'éditeur dans la palette de couleurs sombres. Vous définissez la palette de couleurs en haut à droite : Système, Clair, Foncé ou Graphite.](shot:editor-dark)

### Apparence : flèches d'axes et lignes de bord

{{ui:workspace.showAxes}} (activé par défaut) dessine trois flèches dans le coin arrière gauche de la plaque : **X** en rouge vers la droite, **Y** en vert vers l'arrière et **Z** en bleu vers le haut, comme le comptent les champs de position. C'est la règle de droite que Tinkercad, les programmes de CAO et les slicers utilisent également. Avec le plan de travail sur une face, ils le suivent. Éteignez-les ici s'ils vous gênent.

{{ui:workspace.edgeLines}} dessine un contour sur chaque corps, dans la couleur de {{ui:workspace.edgeColor}} (noir au départ, comme dans Tinkercad) : cela aide lorsque des couleurs sombres se rejoignent. C'est désactivé par défaut, et les très grands maillages importés sont laissés de côté.

![Trois corps sombres avec des lignes de bord activées : les contours les séparent.](shot:edge-lines)

{{ui:workspace.strongHoles}} dessine les trous dans un gris plus sombre, moins transparents et entourés d'une ligne sombre. Cela aide quand un trou est difficile à trouver parmi des corps transparents. Contrairement aux lignes de bord, il reste actif en mode rapide.

### Apparence : lumière et ombres

{{ui:workspace.showShadows}} active ou désactive les ombres portées. Deux curseurs définissent la manière dont les corps sont éclairés. {{ui:workspace.shadowStrength}} indique à quel point les ombres portées sont sombres, et {{ui:workspace.shadeContrast}} déplace la lumière de la lumière ambiante uniforme vers la lumière principale : vers « punchy », les côtés ombrés deviennent plus sombres et les ombres ressortent davantage, vers « doux », tout devient plus plat. Tout en haut, le contraste devient très fort, si bien que les côtés ombrés et les ombres deviennent vraiment sombres. {{ui:workspace.shadowSoftness}} rend les bords des ombres doux au lieu de nets. {{ui:workspace.lightAzimuth}} fait tourner la lumière principale autour du plateau (0° depuis l'avant, 90° depuis la droite), et {{ui:workspace.lightElevation}} la soulève ; à 90°, elle se tient droit au-dessus du plateau comme dans Tinkercad, et les ombres tombent juste sous les corps. {{ui:workspace.softLighting}} fait venir la plus grande partie de la lumière de l'endroit d'où vous regardez, en tournant avec la vue : aucune face ne reste sombre, et une face de couleur sombre tournée vers le haut n'est plus brûlée en blanc. La lumière principale reste un peu pour les ombres, et le curseur de contraste fonctionne toujours. Si un reflet clair se voit encore avec la lumière basse, montez {{ui:workspace.lightElevation}} à 90° : on dirait alors Tinkercad. {{ui:workspace.lightReset}} remet tout en place.

### Apparence : mesures sur le plan de travail

{{ui:workspace.showMoveDimensions}} montre de combien vous déplacez pendant le glissement, {{ui:workspace.showOriginDimensions}} les distances de la sélection à l'origine du plateau, aussi avec plusieurs corps sélectionnés. Avec {{ui:workspace.dimensionsAlwaysVisible}}, ces mesures restent visibles en permanence, et pas seulement pendant le glissement. Tant qu'un corps tourné est sélectionné, ses angles s'affichent sous lui sur le plan de travail ; {{ui:workspace.showRotationAngles}} désactive cela. Plus dans [Mesurer et annoter](chapter:measuring-and-notes).

### Apparence : sélectionner et déplacer

{{ui:workspace.selectBeforeMoving}} : un corps doit alors d'abord être sélectionné, et seul le glissement suivant le déplace. Cela aide quand des enfants ou des mains pressées touchent des corps, et sur un écran tactile.

{{ui:workspace.frameByDirection}} : un cadre tiré vers la droite ne sélectionne que ce qui se trouve entièrement à l'intérieur, un cadre tiré vers la gauche tout ce qu'il touche (dessiné en pointillés), comme dans SketchUp.

{{ui:workspace.doubleClickOpensSketch}} décide si un double-clic sur une esquisse extrudée rouvre l'esquisse, comme dans Tinkercad, et {{ui:workspace.doubleClickOpensGroup}} si un double-clic sur un groupe ou un lot l'ouvre pour l'édition. {{ui:workspace.doubleClickCentersView}} décide si un double-clic sur le plan de travail vide déplace la vue vers cet endroit.

{{ui:workspace.objectSnap}} laisse les bords et le centre d'une forme s'accrocher à d'autres formes pendant que vous la faites glisser ; le menu de la grille en bas à droite a le même commutateur. {{ui:workspace.cruise}} fait pendre une nouvelle forme au pointeur de la souris et la pose sur la face en dessous, comme Cruise dans Tinkercad ; désactivé, une nouvelle forme apparaît au milieu du plateau. Plus dans [Sélectionner et disposer](chapter:select-and-arrange).

### Apparence : la vue

{{ui:workspace.startInPerspective}} : l'éditeur s'ouvre alors dans la vue en perspective, et non dans la vue plate.

{{ui:workspace.startWithScrollbars}} : un projet s'ouvre alors avec les barres de défilement de la vue. Le réglage est enregistré avec le projet et avec {{ui:workspace.makeDefault}}.

{{ui:workspace.startView}} définit l'angle sous lequel s'ouvre une nouvelle conception et auquel revient {{ui:camera.home}}. Tournez et zoomez la vue comme vous l'aimez, puis cliquez sur {{ui:workspace.startViewUseCurrent}} ; {{ui:workspace.startViewStandard}} ramène la vue habituelle de l'avant droit. Cela vaut pour chaque conception de ce navigateur. Une conception que vous rouvrez s'ouvre toujours comme vous l'avez laissée.

{{ui:workspace.zoomSpeed}} est un curseur de lent à rapide : la vitesse de zoom de la molette et du pavé tactile ; les boutons et les touches de zoom gardent leurs petits pas. {{ui:workspace.cameraInertia}} : après avoir lâché la souris, la vue continue de tourner un instant et ralentit doucement. Désactivée, elle s'arrête aussitôt, comme dans Tinkercad et Fusion 360.

{{ui:workspace.overhangAngle}} est l'angle à partir duquel une face compte comme un porte-à-faux quand vous activez Afficher les porte-à-faux dans le menu de visibilité : ces faces sont hachurées de rouge et de blanc. 30° est prudent, 70° compte sur un bon refroidissement de l'impression ; 45° est le départ habituel. Tant qu'ils sont affichés, une ligne sous la vue indique le porte-à-faux le plus raide et combien de cm² ont besoin de supports.

{{ui:workspace.booleanTriangleLimit}} limite le nombre de triangles qu'un maillage importé peut avoir quand vous le coupez, le fusionnez ou l'intersectez, car cela se calcule dans votre navigateur. Un maillage au-dessus de la limite n'est pas traité ; simplifiez d'abord le maillage, ou relevez la limite si votre ordinateur le supporte. Une limite plus haute peut figer l'éditeur quelques secondes.

### Mesure : unités, échelle et pas d'accrochage

Sous {{ui:workspace.measurement}}, vous réglez {{ui:workspace.units}}, l'unité dans laquelle les mesures s'affichent ({{ui:workspace.scale}} : millimètres, centimètres ou mètres en métrique, pouces ou pieds en impérial), le nombre de décimales d'un nombre ({{ui:workspace.accuracy}}), le {{ui:workspace.snapGrid}} auquel s'accrochent le déplacement et le redimensionnement, et vos propres pas d'accrochage sous {{ui:workspace.customSnapGrids}}.

Sous {{ui:workspace.measurement}} dans les paramètres, vous définissez {{ui:workspace.units}}. Avec {{ui:units.imperial}}, layerling affiche chaque mesure en pouces, sur la forme, dans le panneau des propriétés, sur le ruban à mesurer et sur la règle. La grille d'accrochage propose alors des pas de 1/64 à 1 pouce, et la grille sur la plaque est dessinée en pouces (1/8 à 1 pouce, 1/4 de pouce par défaut) avec une ligne plus forte sur chaque pouce entier. Sous {{ui:workspace.inchFormat}}, vous choisissez si les pouces apparaissent sous forme de fractions comme dans Tinkercad (1 5/8, arrondi à 1/64 de pouce) ou sous forme de décimales (1,625) avec autant de décimales que défini sous {{ui:workspace.accuracy}}. Vous pouvez taper l'un ou l'autre, "1 5/8" inclus. Le plus rapide pour passer des millimètres aux pouces est le petit commutateur **mm | in** à côté de {{ui:inspector.snapGrid}}, en bas de la fenêtre des propriétés : il change l'unité, la grille de la plaque et le pas d'accrochage comme les paramètres, pour cette conception.

Sous {{ui:workspace.customSnapGrids}}, au même endroit, vous ajoutez vos propres étapes d'accrochage : un nom et une taille en millimètres, par exemple "Pin pitch 2,54 mm" pour l'espacement des puces DIP, des embases à broches et des trous de carte perforée, ou "MX Key Unit" avec 19,05 mm pour l'espacement des touches du clavier. Le menu Snap Step propose ensuite cette mesure entière, divisée en deux et en quatre (1 ×, ½ × et ¼ ×), de sorte que les formes peuvent être déplacées d'un pas, d'un demi-pas ou d'un quart de pas. Les étapes personnalisées sont conservées avec la conception et accompagnent {{ui:workspace.makeDefault}}. Si vous ne voulez que la mesure elle-même, décochez {{ui:workspace.customSnapGridParts}} à côté ; le menu n'a alors que ce seul pas.

{{ui:workspace.startWithCornerRuler}} : chaque nouveau design de ce navigateur commence alors avec un carré de charpente à l’origine, voir [Mesures et notes](chapter:measuring-and-notes). Les designs existants restent tels quels, et un carré que vous retirez d’un design ne revient pas.

### Plan de travail : plateau et imprimante

{{ui:workspace.printer}} dimensionne le plan de travail au plateau de votre imprimante et signale les corps qui le dépassent, voir [Impression](chapter:printing). {{ui:workspace.showPlateLabels}} écrit le nom de la conception sur le plateau, ainsi que le nom et le volume d'impression de l'imprimante quand une imprimante est choisie.

{{ui:workspace.printerPlay}} est la place par côté dont une goupille imprimée a besoin pour tourner dans un trou imprimé sur votre imprimante. {{ui:workspace.fitTestMake}} pose sur le plateau le test d'ajustement qui le mesure ; les nouveaux couvercles, queues d'aronde, clips, écrous et la vérification du jeu partent alors de cette valeur, voir [Impression](chapter:printing). Il est gardé dans ce navigateur, pas dans le motif.

{{ui:workspace.size}} donne au plateau une taille à vous, avec {{ui:workspace.width}} et {{ui:workspace.length}} en millimètres ou dans l'unité choisie. La grille passe toujours par l'origine, si bien que les lignes plus fortes se trouvent sur les axes, quelle que soit la mesure du plateau.

### Plan de travail : grille

{{ui:workspace.showGrid}} affiche ou masque la grille sur le plateau. {{ui:workspace.gridBlockSize}} règle l'espacement de ses lignes, et {{ui:workspace.gridMajorEvery}} si la ligne plus foncée vient tous les 5 ou tous les 10 pas de grille ; {{ui:workspace.gridMajorColor}} donne à cette ligne une couleur à elle, que prennent aussi la croix centrale et le bord du plateau. {{ui:workspace.gridColor}} est la couleur des lignes ordinaires.

Chaque ligne de la grille s'élargit quand vous zoomez, comme dans Tinkercad, et reste visible quand vous dézoomez. Si c'est trop pour vous, désactivez {{ui:workspace.gridLinesGrow}} et les lignes restent larges d'un pixel à chaque zoom, comme dans l'esquisse.

Si la grille a disparu, par exemple parce qu'une couleur a été réglée sur celle du plateau, {{ui:workspace.resetGrid}} à la fin de la zone {{ui:workspace.workplane}} ramène sa visibilité, ses couleurs, son espacement et l'épaisseur de ses lignes au réglage standard, ici et dans les réglages par défaut enregistrés avec {{ui:workspace.makeDefault}}.

### Valeurs par défaut des formes

Sous {{ui:workspace.shapeDefaults}}, vous choisissez une forme avec {{ui:workspace.shape}} et réglez comment elle commence quand vous l'ajoutez : sa largeur, sa longueur et sa hauteur. {{ui:workspace.useAppDefaults}} ramène la forme à ce avec quoi l'application la fait commencer. Les formes qui ont leurs propres réglages les montrent sous {{ui:workspace.shapeDetails}}. Les valeurs s'appliquent aux nouvelles formes, pas à celles déjà sur le plateau. {{ui:workspace.customLimit}} fixe un plafond à vous pour la taille que les poignées et les propriétés peuvent donner à cette forme ; laissé vide, les limites habituelles restent.

### Historique enregistré

Sous {{ui:workspace.history}}, le curseur {{ui:workspace.savedHistory}} règle combien d'actions terminées restent disponibles pour Annuler après avoir enregistré ou rouvert une conception. Par défaut, c'est 100 actions par conception. Une limite plus basse supprime définitivement les anciennes étapes d'annulation de la conception.

## Quand layerling semble lent

layerling calcule et dessine tout dans votre navigateur. Sur un ordinateur plus ancien, doté d'une carte graphique faible ou sur plusieurs grands écrans, l'affichage peut donc sembler lent. Cela aide :

- **{{ui:workspace.fastMode}}** sous {{ui:workspace.appearance}} désactive d'un coup tout ce qui coûte cher à la vue : les ombres, les lignes de contour sur tous les corps et l'inertie de la caméra. Il dessine également la vue uniquement à la résolution de l'écran, qui, sur les écrans haute résolution, représente jusqu'à quatre fois moins de pixels. Vos propres paramètres sont conservés et s'appliquent à nouveau dès que vous le désactivez.
- **La caméra continue de tourner :** Lorsque vous lâchez la souris après avoir tourné, la vue s'allume un instant et ralentit doucement. C'est exprès, pas de bégaiement. Si vous êtes habitué à Tinkercad ou Fusion 360, désactivez {{ui:workspace.cameraInertia}} sous {{ui:workspace.appearance}} et la vue s'arrête immédiatement.
- **Commutateurs simples :** Sans mode rapide, vous pouvez également désactiver uniquement {{ui:workspace.showShadows}} ou {{ui:workspace.edgeLines}}.
- **Utilisez la carte graphique :** Dans Chrome, ouvrez `chrome://gpu` (dans Edge `edge://gpu`). À côté de « WebGL », il devrait indiquer « Accélération matérielle ». S'il est indiqué « Logiciel uniquement », l'accélération matérielle est désactivée dans les paramètres du navigateur. Sous Windows, vous pouvez également choisir « Hautes performances » pour le navigateur sous Paramètres → Système → Affichage → Graphiques, afin qu'il utilise la vraie carte graphique et non la plus faible du processeur.
- **Simplifiez les grands maillages importés :** Un modèle de plusieurs centaines de milliers de triangles ralentit toute vue. Comment l'affiner se trouve dans le chapitre sur les fichiers, sous "Simplifier un maillage importé".
- **Fermez les autres onglets :** Chaque onglet layerling ouvert et toutes les autres pages 3D partagent la même carte graphique.
