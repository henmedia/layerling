---
title: Tablette et tactile
summary: Travailler avec les doigts ou un stylet : sélectionner plusieurs corps, tourner et zoomer la vue, le menu de l'appui long et ce qu'il faut savoir sur un iPad.
---

## Doigts et stylet

layerling fonctionne dans le navigateur d'une tablette, et comme application depuis son écran d'accueil. Un doigt fait ce que fait le bouton gauche de la souris. Trois choses qu'une tablette n'a pas, un bouton droit, une touche Maj et une molette, ont leur propre chemin :

| Vous voulez | Sur une tablette |
| --- | --- |
| Sélectionner un corps | Le toucher. |
| Sélectionner plusieurs corps | Maintenez un doigt immobile une demi-seconde, choisissez {{ui:contextMenu.selectMultiple}}, puis touchez un corps après l'autre. Toucher un corps sélectionné le retire de la sélection. |
| Sélectionner tous les corps | Maintenez un doigt immobile une demi-seconde sur l'espace vide, choisissez {{ui:contextMenu.selectAll}}. |
| Ouvrir le menu d'un clic droit | Maintenez un doigt immobile une demi-seconde sur un corps ou sur l'espace vide. |
| Déplacer un corps | Le faire glisser. |
| Redimensionner, tourner ou soulever un corps | Faire glisser ses poignées, les petits carrés et flèches autour de lui. Un doigt les attrape aussi un peu à côté. |
| Tourner la vue | Un doigt sur l'espace vide, ou faire glisser le cube de la vue. |
| Zoomer la vue | Deux doigts : écartez pour se rapprocher, pincez pour s'éloigner. |
| Déplacer la vue | Faites glisser deux doigts ensemble. |
| Effacer la sélection | Toucher l'espace vide. Pas tant que {{ui:camera.touchRotate}} est activé, car un doigt tourne alors la vue ; et dans {{ui:contextMenu.selectMultiple}}, le premier toucher sur l'espace vide met seulement fin au mode et laisse la sélection telle quelle, le suivant l'efface. |

## Sélectionner plusieurs corps

Sans touche Maj, {{ui:contextMenu.selectMultiple}} dans le menu de l'appui long fait ce que fait Maj+clic sur un ordinateur. Tant qu'il est actif, un message le dit, et chaque toucher sur un corps l'ajoute à la sélection ou le retire. Toucher l'espace vide, ou [[Esc]] sur un clavier, y met fin et laisse la sélection telle qu'elle est. Un doigt sur l'espace vide continue de tourner la vue entre-temps. Ensuite {{ui:editor.tool.group}}, {{ui:editor.tool.align}} ou un déplacement agissent sur tous les corps choisis.

## Tourner et zoomer la vue

Un doigt sur l'espace vide tourne la vue, deux doigts la zooment et la déplacent. Un doigt qui commence sur un corps travaille sur le corps, pas sur la vue. Si vous préférez qu'il tourne la vue, activez {{ui:camera.touchRotate}} dans la barre de vue : un doigt tourne alors la vue au lieu de sélectionner, où qu'il commence. Ce commutateur n'apparaît que sur un appareil à écran tactile.

Le cube de la vue en haut à gauche tourne la vue quand vous le faites glisser, et un toucher sur l'une de ses faces, de ses coins ou de ses arêtes saute vers cette vue. Voir [Vue et plan de travail](chapter:view-and-workplane).

## Poignées, petits points et stylet

Le bout d'un doigt cache ce qu'il vise. layerling laisse un doigt atteindre un peu plus loin qu'un pointeur de souris les poignées, les points, les lignes et les arêtes, mais un stylet est plus fin. Cela vaut pour un stylet que la tablette connaît comme stylet, par exemple un Apple Pencil ou un S Pen. Un simple stylet à pointe en caoutchouc compte pour l'écran comme un doigt et n'est pas plus fin : travaillez avec comme avec un doigt. Lorsqu'un Apple Pencil survole un bouton sur l'iPad, son nom apparaît après un instant dans une petite bulle, comme l'info-bulle avec la souris.

Si des corps glissent parce que des enfants ou des mains pressées les touchent, activez {{ui:workspace.selectBeforeMoving}} dans les réglages : un corps doit alors d'abord être sélectionné, et seul le glissement suivant le déplace.

## Sur un iPad ou un iPhone

- **L'installer comme application.** Dans Safari, touchez l'icône de partage et choisissez « Sur l'écran d'accueil ». L'application s'ouvre dans une fenêtre à elle, sans barre d'adresse, et fonctionne sans connexion, voir [Hors ligne et installation](chapter:offline-and-install).
- **Vos conceptions sont dans le navigateur.** Il n'y a pas de compte et rien n'est envoyé. Safari a sa propre règle contre le pistage : il efface ce qu'un site web a enregistré si vous ne l'avez pas visité dans Safari pendant sept jours. Une application web sur l'écran d'accueil est exemptée de cette règle, comme WebKit la décrit. C'est une raison de plus d'utiliser l'application depuis l'écran d'accueil et de sauvegarder le travail important : {{ui:dashboard.backupAll}} sur la page de démarrage réunit toutes les conceptions dans un seul fichier.
- **Fichiers.** Safari ne laisse une page écrire dans un fichier que par un téléchargement ; {{ui:editor.export}} dépose donc le fichier dans les Téléchargements de l'app Fichiers, et [[Ctrl]]+[[S]] sur un clavier le télécharge de nouveau ; voir [Fichiers et enregistrement](chapter:files-and-saving).
- **Pas besoin de clavier.** Chaque outil a un bouton dans le ruban, et un champ numérique ouvre le clavier à l'écran. Un clavier sur l'iPad ajoute les [raccourcis clavier](chapter:shortcuts). Une case de valeur à côté d'un corps n'ouvre son champ numérique qu'au deuxième toucher : le premier ne fait que la marquer, si bien qu'un doigt qui y tombe par erreur ne fait pas apparaître le clavier.

## Ateliers avec des enfants

Les doigts et les stylets à pointe en caoutchouc fonctionnent ici de la même façon. Deux réglages facilitent une classe : {{ui:workspace.selectBeforeMoving}}, pour qu'un toucher ne déplace pas un corps par erreur, et {{ui:camera.touchRotate}}, pour qu'un doigt tourne toujours la vue. Le bouton point d'interrogation du groupe Aide du ruban active l'{{ui:interactiveHelp.title}} : un toucher sur n'importe quel bouton, champ ou poignée l'explique alors, et le même bouton, ou [[Esc]], la quitte.
