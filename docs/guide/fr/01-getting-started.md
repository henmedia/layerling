---
title: Premiers pas
summary: D'une feuille vierge à votre première pièce pour l'imprimante 3D, en cinq minutes, sans compte et sans rien à installer.
---

layerling est un logiciel de modélisation pour l'impression 3D qui fonctionne directement dans votre navigateur. Vous construisez une pièce à partir de formes simples, y découpez des perçages, arrondissez les arêtes et l'envoyez à votre trancheur. Il n'y a rien à installer et aucun compte à créer. Ce que vous concevez reste sur votre ordinateur.

![La page d'accueil de layerling : "Créer un nouveau design 3D" en haut, vos designs et le guide rapide en bas.](shot:start-page)

## Créer un design

Ouvrez [layerling.com](https://layerling.com/). Sur la page d'accueil, cliquez sur {{ui:dashboard.createDesign}}. L'éditeur s'ouvre avec un plan de travail vierge, la grille sur laquelle chaque forme prend vie.

Si vous avez déjà un fichier à poursuivre, utilisez {{ui:dashboard.importGeometry}}. Cela fonctionne aussi bien pour les fichiers de conception layerling (`.lyl`) que pour les fichiers STL, OBJ, 3MF, STEP ou SVG.

Tous vos designs apparaissent ensuite sur la page d'accueil avec une image d'aperçu. Ils sont conservés dans le stockage de votre navigateur et enregistrés automatiquement après chaque modification, il n'y a donc pas de bouton d'enregistrement. **layerling n'assume aucune responsabilité pour les conceptions conservées dans le navigateur.** Un navigateur peut avoir des défaillances, et une mise à jour peut causer des problèmes. Sauvegardez donc vos conceptions de temps en temps avec {{ui:dashboard.backupAll}} sur la page d'accueil, ou enregistrez-les sous forme de fichiers. La façon d'emballer les designs dans un fichier et de les transmettre est expliquée dans [Fichiers et enregistrement](chapter:files-and-saving). Si vous souhaitez un rappel, activez {{ui:workspace.confirmTabClose}} dans les réglages (la roue dentée du ruban) : le navigateur demande alors confirmation avant de fermer ou de recharger un onglet contenant une conception ouverte.

## L'éditeur en un coup d'œil

![L'éditeur avec deux formes sur le plan de travail. Le ruban en haut, les commandes de caméra à gauche, les paramètres de la forme sélectionnée à droite.](shot:editor-overview)

- **En haut** se trouve le ruban. Il est organisé par tâche : {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} et {{ui:editor.group.help}}. Survolez une icône pour afficher son nom. Partout où vous voyez un petit point d'interrogation, par exemple dans les réglages d'une forme, dans la bibliothèque de formes ou dans les panneaux d'outils, il mène directement au chapitre correspondant de ce guide.
- **Au milieu** se trouve le plan de travail. C'est ici que vous placez les formes, les modifiez et visualisez le résultat.
- **À droite** apparaissent les réglages de la forme sélectionnée : couleur, dimensions, position et tout ce qui compose la forme. Saisir des valeurs numériques est plus précis que de glisser à la souris.
- **À gauche** se trouvent les commandes de caméra surmontées du cube de vue. Elles permettent de se déplacer dans la scène, voir plus en détail dans [Vue et plan de travail](chapter:view-and-workplane).
- **Tout en haut**, vous basculez entre {{ui:editor.modeGeometry}} et {{ui:editor.modeSketch}}, renommez le design et choisissez la langue et le thème visuel.

## Les boutons autour de la zone de travail

Passez la souris sur un bouton pour voir son nom. Si vous ne savez pas ce que fait un bouton, cliquez dans la zone {{ui:editor.group.help}} sur {{ui:interactiveHelp.title}} ([[Shift]]+[[F1]]) puis sur le bouton. Voici ceux dont on parle le plus.

### Coller

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) ajoute à la conception ce que vous avez copié avec {{ui:editor.tool.copy}}. {{ui:common.duplicate}} copie et colle en une étape.

### Supprimer

{{ui:common.delete}} ([[Delete]]) retire les formes sélectionnées. {{ui:editor.tool.undo}} les ramène.

### Dissocier

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) défait le groupe sélectionné en les formes dont il était fait.

### Paramètres de l'espace de travail

{{ui:editor.workspaceSettings}} ouvre les réglages de la zone de travail : unité, taille du plateau, imprimante, grille, couleurs, lumière et plus. Plus de détails dans [Vue et plan de travail](chapter:view-and-workplane).

### Thème

{{ui:common.theme}} tout en haut choisit l'apparence de layerling : comme votre système, clair, sombre ou graphite.

### Renommer la conception

{{ui:editor.renameProject}} : le crayon à côté du nom tout en haut. Tapez le nouveau nom et appuyez sur [[Enter]].

### Nom du modèle

Le nom de la conception ({{ui:confirm.projectName}}) se trouve tout en haut. Cliquez dessus, tapez, et [[Enter]] garde le nom.

### Options de visibilité

{{ui:editor.visibilityOptions}}, la flèche à côté de l'œil, contient ce que vous pouvez afficher ou masquer : la liste des objets, tout ce que vous avez masqué, les notes et les surplombs de l'impression. Plus de détails dans [Sélectionner et disposer](chapter:select-and-arrange).

### Masquer la sélection

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) masque les formes sélectionnées. Elles restent dans la conception et dans la liste des objets ; {{ui:editor.visibilityOptions}} les affiche de nouveau.

### Commandes de recherche

{{ui:palette.open}} : tapez ce que vous cherchez, un outil, une forme ou un réglage, et cliquez sur le résultat.

### Masquer les commandes de la caméra

{{ui:camera.hide}} replie les commandes de la caméra à gauche et laisse plus de place à la zone de travail ; {{ui:camera.show}} les ramène.

### Grille d'accrochage

{{ui:inspector.snapGrid}}, en bas des propriétés, est le pas sur lequel le déplacement et le redimensionnement s'accrochent. À côté, le petit commutateur **mm | in** change l'unité. Plus de détails dans [Vue et plan de travail](chapter:view-and-workplane).

### Unité : millimètres ou pouces

Le commutateur **mm | in** à côté de {{ui:inspector.snapGrid}} change l'unité, la grille du plateau et le pas d'accrochage, pour cette conception.

### Le pied de page

En bas de la fenêtre : {{ui:dashboard.sponsor}} mène à la page où vous pouvez soutenir le projet ; {{ui:dashboard.userGuide}} ouvre ce guide ; {{ui:dashboard.forum}} mène à l'endroit des questions, des idées et des rapports de bogue (les discussions sur GitHub, en allemand le forum de drucktipps3d) ; {{ui:editor.bugReport}} crée un ZIP pour un rapport de bogue ; {{ui:dashboard.projectOnGitHub}} mène au projet sur GitHub, et le numéro de version ouvre les notes de version. Les liens vers les mentions légales et la politique de confidentialité appartiennent à celui qui exploite la copie de layerling que vous utilisez.

## Votre première pièce

À titre d'exemple, nous allons créer un cube percé d'un trou.

1. Cliquez sur {{ui:editor.addShape}} dans le ruban et choisissez {{ui:shape.box}}. La forme suit maintenant le pointeur de votre souris. Un clic sur le plan de travail la dépose.
2. À droite, définissez les dimensions, par exemple 40 mm de longueur, 40 mm de largeur et 20 mm de hauteur.
3. Placez de la même manière un {{ui:shape.cylinder}} au milieu, de 14 mm de diamètre et 30 mm de hauteur. Il doit être plus haut que le cube pour le traverser de part en part.
4. Sélectionnez le cylindre et cliquez sur {{ui:inspector.hole}} à droite. Il devient translucide : le solide est devenu un outil de découpe qui enlève de la matière.
5. Sélectionnez les deux formes et cliquez sur {{ui:editor.tool.group}}. Le cube possède maintenant un perçage.

![Le cylindre est un perçage et dépasse du haut du cube.](shot:hole-before)

![Après le groupement, le cube présente un alésage.](shot:hole-after)

C'est ainsi que sont créés les perçages, fentes et poches. Le chapitre [Solides et perçages](chapter:solids-and-holes) l'explique en détail.

## Nouveau depuis votre dernière visite

Lorsque vous ouvrez à nouveau layerling après une mise à jour, une carte sur la page d'accueil liste ce qui a été ajouté depuis votre dernière visite : chaque version depuis lors, la plus récente en premier. Après une longue absence, vous pouvez faire défiler l'intérieur de la carte. En dessous, {{ui:whatsNew.earlier}} affiche également les versions antérieures à votre dernière visite. Fermez-la avec {{ui:whatsNew.dismiss}} et elle restera masquée jusqu'à la prochaine mise à jour. {{ui:whatsNew.footerLink}} dans le pied de page de la page d'accueil affiche à tout moment les derniers ajouts. Le navigateur se souvient de la dernière version consultée, et aucune donnée personnelle ne quitte votre machine.

Sur une copie locale de layerling sur votre ordinateur ou serveur, la notification "Mise à jour disponible" comporte un bouton, {{ui:update.previewShow}}, qui liste ce que la mise à jour apporte avant de l'installer. La liste n'est récupérée sur GitHub que lorsque vous cliquez sur le bouton.

## De la conception à l'impression

Lorsque votre pièce est terminée, cliquez sur {{ui:editor.export}}, choisissez STL ou 3MF et téléchargez le fichier. Ouvrez-le dans votre trancheur préféré (Bambu Studio, PrusaSlicer, OrcaSlicer ou Cura). Si vous configurez votre imprimante dans les paramètres, vous pouvez vérifier en temps réel pendant la modélisation si la pièce tient sur le plateau d'impression. Plus d'informations dans [Impression](chapter:printing).

> **Astuce :** Si vous venez de Tinkercad, vous retrouverez très vite vos repères : le plateau, les formes, les solides et perçages, le groupement, l'alignement et la symétrie fonctionnent presque à l'identique. Les nouveautés majeures concernent les congés et chanfreins, l'évidement, les filetages et les esquisses. Vos propres designs Tinkercad peuvent aussi venir avec vous, voir [Fichiers, sauvegarde et partage](chapter:files-and-saving).
