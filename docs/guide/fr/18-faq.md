---
title: Questions fréquentes
summary: Des réponses courtes aux questions les plus fréquentes, sur l'enregistrement, les grands modèles, les congés, l'IA et l'impression, chacune avec le chemin vers l'explication complète.
contents: questions
---

Chaque réponse est courte et se termine par l'endroit de ce guide qui l'explique en entier. Le champ de recherche en haut trouve une question par n'importe lequel de ses mots.

## Enregistrement et sauvegardes

### Où sont enregistrés mes designs, et y a-t-il un cloud ?

Dans le navigateur de votre propre ordinateur. Il n'y a ni compte ni cloud, et rien n'est envoyé en ligne ; chaque modification s'enregistre toute seule. La personne qui fait tourner layerling sur son propre serveur peut aussi y conserver des designs dans un dossier partagé.

Pour en savoir plus : [Où vivent vos créations](chapter:files-and-saving#ou-vivent-vos-creations)

### Mes designs ont disparu. Que s'est-il passé ?

Les designs se trouvent dans un seul navigateur, sur un seul ordinateur. Ils disparaissent quand les données que le navigateur gardait pour la page ont été effacées, et ils n'apparaissent pas dans un autre navigateur ni sur un autre ordinateur. Safari sur Mac, iPhone et iPad supprime les données d'une page après sept jours sans visite, sauf si layerling est installé comme application. Si vous avez une sauvegarde, {{ui:dashboard.restoreBackup}} sur la page d'accueil ramène les designs, avec leurs dossiers et leurs images.

Pour en savoir plus : [Vos dessins, votre sauvegarde](chapter:files-and-saving#vos-dessins-votre-sauvegarde)

### Comment tout sauvegarder, aussi automatiquement dans un dossier ?

{{ui:dashboard.backupAll}} sur la page d'accueil rassemble tous les designs dans un seul fichier ZIP. En plus, layerling garde de lui-même des versions précédentes de chaque design et, dans Chrome et Edge, il peut écrire chacune d'elles, sous forme de fichier .lyl, dans un dossier que vous choisissez. Les versions gardées dans le navigateur disparaissent avec les données du navigateur ; elles ne remplacent donc ni le ZIP ni le dossier.

Pour en savoir plus : [Versions précédentes](chapter:files-and-saving#versions-precedentes)

### Comment emmener un design sur un autre ordinateur ou dans un autre navigateur ?

Enregistrez-le comme fichier .lyl depuis la fenêtre d'export, puis ouvrez ce fichier sur l'autre ordinateur depuis la page d'accueil. Pour tous les designs à la fois, utilisez {{ui:dashboard.backupAll}} ici et {{ui:dashboard.restoreBackup}} là-bas ; les designs déjà présents ne sont pas ajoutés deux fois.

Pour en savoir plus : [Sauvegarde et transmission](chapter:files-and-saving#sauvegarde-et-transmission)

### Que se passe-t-il si j'efface les données du navigateur ?

Les designs enregistrés dans ce navigateur sont supprimés, tout comme les versions précédentes que layerling y gardait. Un ZIP créé avec {{ui:dashboard.backupAll}}, vos fichiers .lyl et un dossier de sauvegarde sur votre disque ne sont pas touchés. Sauvegardez d'abord, effacez ensuite.

Pour en savoir plus : [Vos dessins, votre sauvegarde](chapter:files-and-saving#vos-dessins-votre-sauvegarde)

### Comment revenir à un état antérieur ?

L'annulation revient en arrière étape par étape. La vue historique montre chaque étape avec un curseur sans modifier le design, et peut créer un nouveau design à partir de n'importe laquelle. Pour un état datant de plus tôt dans la journée ou de la semaine dernière, la liste des versions précédentes ouvre une ancienne version comme nouveau design et laisse le design actuel tel quel.

Pour en savoir plus : [Rétrospective : la vue historique](chapter:select-and-arrange#retrospective-la-vue-historique) et [Versions précédentes](chapter:files-and-saving#versions-precedentes)

### Les fichiers STL et 3MF peuvent-ils aller directement dans le dossier de mon projet ? Et comment retrouver un téléchargement ?

Dans Chrome et Edge, le premier export d'un design demande où enregistrer, et les exports suivants écrivent dans ce même fichier sans rien demander. Firefox et Safari téléchargent toujours. Si vous voulez un téléchargement à chaque fois, activez {{ui:workspace.stlAsDownload}} dans les paramètres.

Pour en savoir plus : [Exportation](chapter:files-and-saving#exportation)

### La fenêtre d'enregistrement s'est fermée et il n'y a pas de fichier. Pourquoi ?

Le navigateur signale une fenêtre qu'il n'a pas pu utiliser de la même façon qu'une fenêtre que vous avez annulée, et un fichier bloqué par un antivirus ne peut pas non plus être écrit. Le message en haut propose alors {{ui:status.saveAsDownload}}, qui place le fichier dans vos téléchargements. Pour ne plus passer du tout par cette fenêtre, activez {{ui:workspace.lylAsDownload}} et {{ui:workspace.stlAsDownload}} dans les paramètres.

Pour en savoir plus : [Sauvegarde et transmission](chapter:files-and-saving#sauvegarde-et-transmission)

## Installation et mises à jour

### Y a-t-il une application à télécharger ?

layerling s'installe depuis le navigateur : il a alors sa propre icône et sa propre fenêtre, et démarre sans réseau. Il n'y a pas de programme d'installation à télécharger, et l'original se trouve uniquement sur layerling.com. **Ne téléchargez et n'exécutez aucun programme d'installation « layerling » provenant d'un autre site :** il ne vient pas de layerling et peut contenir un logiciel malveillant. Pour faire tourner votre propre copie, il existe un démarrage rapide pour Windows et une image Docker.

Pour en savoir plus : [Installation en tant qu'application](chapter:offline-and-install#installation-en-tant-qu-application) et [Exécutez-le vous-même](chapter:offline-and-install#executez-le-vous-meme)

### layerling fonctionne-t-il sans internet ?

Oui, après la première visite il démarre sans réseau, de préférence installé comme application. Une seule chose n'est chargée qu'au moment où elle sert pour la première fois : le noyau CAO pour le premier export STEP, environ 22 Mo.

Pour en savoir plus : [Installation en tant qu'application](chapter:offline-and-install#installation-en-tant-qu-application)

### Comment obtenir une mise à jour ?

Elle arrive toute seule. Une page ouverte remarque une nouvelle version et affiche une carte avec les nouveautés ; {{ui:newVersion.reload}} enregistre d'abord le design ouvert, puis charge la nouvelle version. La page d'accueil signale aussi une version plus récente.

Pour en savoir plus : [Mises à jour](chapter:offline-and-install#mises-a-jour)

### Quels navigateurs et quelles tablettes conviennent ?

Chrome, Edge, Firefox et Safari, sur un ordinateur, une tablette ou un téléphone ; la vue 3D a besoin de WebGL. Seuls Chrome et Edge savent faire certaines choses : écrire dans vos propres fichiers et dossiers, utiliser le dossier de sauvegarde et ouvrir les fichiers .lyl par un double-clic. Sur une tablette, un doigt fait ce que fait le bouton gauche de la souris.

Pour en savoir plus : [Doigts et stylet](chapter:tablet-and-touch#doigts-et-stylet)

## IA

### Quelle est la façon la plus simple de mettre en place une IA ?

Donnez à une IA capable de travailler sur votre ordinateur l'adresse `https://github.com/henmedia/layerling` et demandez-lui d'installer pour vous layerling avec son serveur MCP. Il lui faut un programme tel que l'onglet Code de l'application Claude, Claude Code, Codex, Antigravity ou Gemini CLI. Pour Windows et Mac, le guide donne aussi les étapes une par une.

Pour en savoir plus : [Pas à pas pour débutants](chapter:ai-with-mcp#pas-a-pas-pour-debutants)

### Pourquoi l'IA n'arrive-t-elle pas à joindre layerling.com ?

Le pont entre l'IA et l'éditeur n'existe que dans une copie de layerling qui tourne sur votre propre ordinateur. Sur layerling.com, il est toujours désactivé, et un chat dans le navigateur ne peut rien installer. L'IA a donc besoin d'un layerling lancé en local et d'un programme qui parle MCP.

Pour en savoir plus : [Configuration](chapter:ai-with-mcp#configuration)

### L'application installée est-elle une copie locale ?

Non, si vous l'avez installée depuis layerling.com : c'est toujours layerling.com dans sa propre fenêtre, même si elle démarre aussi sans internet. Avec une copie locale, un petit serveur tourne sur votre ordinateur, et c'est par lui que l'IA parle à l'éditeur en MCP ; l'application web n'a pas ce serveur. Après le démarrage rapide, votre propre copie tourne à l'adresse `http://127.0.0.1:3000/`.

Pour en savoir plus : [Configuration](chapter:ai-with-mcp#configuration)

### Quelle IA convient, et combien cela coûte-t-il ?

N'importe quel programme qui parle MCP ; le guide décrit Claude, Codex, Gemini et Antigravity. layerling lui-même ne coûte rien. Le coût de l'IA dépend de son fournisseur : l'onglet Code de l'application Claude, par exemple, fait partie des abonnements Claude payants.

Pour en savoir plus : [Configuration](chapter:ai-with-mcp#configuration)

### Quelles données sont transmises au fournisseur de l'IA ?

Ce que l'IA lit : les objets du design ouvert et les images de la vue qu'elle prend. Cela parvient au fournisseur de votre programme d'IA comme tout ce que vous y saisissez. Le pont lui-même tourne sur votre ordinateur, et sans IA rien n'en sort.

Pour en savoir plus : [Ce que l'IA peut faire](chapter:ai-with-mcp#ce-que-l-ia-peut-faire)

## Mémoire, vitesse et historique

### Pourquoi layerling devient-il lent avec mon STL ?

Un STL est un maillage de triangles, et un très grand maillage ralentit l'éditeur, occupe beaucoup de mémoire et rend l'enregistrement lent. layerling le signale après l'import à partir de 400 000 triangles dans un maillage, ou d'un million dans l'ensemble du design. Simplifiez d'abord le maillage, importez seulement les parties dont vous avez besoin, ou construisez la pièce avec les formes de layerling.

Pour en savoir plus : [Gros maillages](chapter:files-and-saving#gros-maillages)

### Pourquoi manque-t-il des étapes dans mon historique ?

Deux choses le raccourcissent. Le réglage {{ui:workspace.savedHistory}} garde 100 étapes par design tant que vous ne le modifiez pas, et les plus anciennes sont abandonnées. Et quand un design est trop volumineux pour être enregistré avec tout son historique, layerling l'enregistre avec la moitié des étapes, puis encore la moitié, et vous le dit. Le design lui-même est toujours enregistré en entier.

Pour en savoir plus : [Historique enregistré](chapter:view-and-workplane#historique-enregistre)

### Que faire quand le stockage du navigateur est plein ?

Ne fermez pas et ne rechargez pas l'onglet : vos dernières modifications ne se trouvent que là. Mettez d'abord une copie à l'abri avec l'export au format .lyl. Faites ensuite de la place : supprimez des étapes dans la vue historique, retirez les designs dont vous n'avez plus besoin, ou sauvegardez-les puis supprimez-les.

Pour en savoir plus : [Vos dessins, votre sauvegarde](chapter:files-and-saving#vos-dessins-votre-sauvegarde)

### Mon design est trop volumineux pour être enregistré. Que faire ?

Son historique et ses maillages prennent ensemble trop de place. layerling a déjà essayé avec moins d'étapes d'historique avant de vous le dire. Supprimez l'historique dans la vue historique, simplifiez les maillages importés les plus lourds, ou enregistrez un .lyl avec seulement l'état actuel.

Pour en savoir plus : [Sauvegarde et transmission](chapter:files-and-saving#sauvegarde-et-transmission) et [Simplifier un maillage importé](chapter:files-and-saving#simplifier-un-maillage-importe)

### Le navigateur n'a plus de mémoire. Qu'est-ce qui aide ?

Cela arrive avec des maillages de plusieurs millions de triangles, quand une seule étape demande plus de mémoire que n'en reçoit un onglet du navigateur. Réduisez les triangles des maillages importés avec {{ui:editor.tool.simplify}}, fermez les autres onglets et réessayez. Si cela se produit pendant l'enregistrement, un historique plus court aide aussi.

Pour en savoir plus : [Gros maillages](chapter:files-and-saving#gros-maillages)

### Un design s'ouvre très lentement ou pas du tout. Que puis-je faire ?

Le plus souvent, son historique d'étapes d'annulation est devenu très gros. {{ui:dashboard.openWithoutHistory}}, dans le menu du design sur la page d'accueil, lit uniquement l'état actuel ; les étapes précédentes sont alors supprimées définitivement, sauvegardez donc d'abord le design si vous voulez les garder. Une version précédente issue des sauvegardes s'ouvre comme nouveau design.

Pour en savoir plus : [Sauvegarde et transmission](chapter:files-and-saving#sauvegarde-et-transmission)

### layerling saccade. Quels réglages aident ?

{{ui:workspace.fastMode}}, dans les paramètres, désactive les ombres, les lignes d'arête de tous les corps et l'inertie de la caméra, et dessine la vue à la résolution de l'écran seulement. Vérifiez que le navigateur utilise la carte graphique : `chrome://gpu` ou `edge://gpu` doit afficher « Hardware accelerated » à côté de WebGL. Les gros maillages importés sont l'autre cause fréquente.

Pour en savoir plus : [Quand layerling semble lent](chapter:view-and-workplane#quand-layerling-semble-lent)

### L'éditeur reste figé ou calcule longtemps. Attendre ou recharger ?

Attendez d'abord. Les découpes, les groupes et le travail sur les arêtes sont calculés en arrière-plan, et {{ui:status.computing}} s'affiche pendant ce temps ; les tâches longues comme l'évidement s'arrêtent d'elles-mêmes avec un message et ne changent rien. Si le noyau CAO a dû être redémarré, le message le dit et il n'est pas nécessaire de recharger. Recharger est sans risque, car chaque modification s'enregistre toute seule, avec une exception : tant que l'avis rouge {{ui:notice.designNotSavedTitle}} est affiché, exportez d'abord un .lyl.

Pour en savoir plus : [Quand layerling semble lent](chapter:view-and-workplane#quand-layerling-semble-lent)

### La vue 3D reste vide, ou un message dit qu'elle n'a pas pu démarrer. Que faire ?

Le navigateur n'a pas pu démarrer WebGL, qui dessine la vue 3D. La cause se trouve dans le navigateur ou dans le pilote graphique, pas dans votre design, et vos designs enregistrés ne sont pas supprimés. Fermez les autres onglets avec du contenu 3D et redémarrez le navigateur, activez l'accélération matérielle, autorisez WebGL si un réglage de confidentialité ou une extension le bloque, et mettez à jour le navigateur et le pilote graphique. Essayer un autre navigateur est un test rapide.

Pour en savoir plus : [Quand layerling semble lent](chapter:view-and-workplane#quand-layerling-semble-lent)

## Modèles importés

### « Simplifier le maillage » ou « Rendre exact » : lequel choisir ?

{{ui:editor.tool.simplify}} garde une partie des triangles, si bien qu'un modèle lourd devient plus léger ; il reste un maillage. {{ui:editor.tool.makeExact}} reconstruit un modèle fait de plans, de cylindres, de cônes et de sphères en un vrai corps CAO : les congés et chanfreins suivent alors des arêtes nettes et un export STEP contient de vraies faces. Il accepte jusqu'à 400 000 triangles ; une figurine ou un scan reste un maillage. Pour une grande pièce technique : simplifiez d'abord, avec {{ui:simplify.keepEdges}} activé, puis rendez-la exacte.

Pour en savoir plus : [Simplifier un maillage importé](chapter:files-and-saving#simplifier-un-maillage-importe) et [Rendre exact un maillage importé](chapter:files-and-saving#rendre-exact-un-maillage-importe)

### Pourquoi une découpe échoue-t-elle, ou pourquoi mon maillage n'est-il « pas étanche » ?

Un corps ne peut être découpé que si sa surface est fermée. Si un maillage importé a des trous, layerling nomme la pièce et le nombre d'arêtes ouvertes et la laisse de côté. Il ferme lui-même les petits trous ; les plus grands doivent être réparés dans le programme d'où vient le modèle ou dans un outil de réparation de maillage. La vérification d'impression montre quel corps est ouvert.

Pour en savoir plus : [Vérifier l'impression](chapter:printing#verifier-l-impression)

### Comment bien importer un SVG ?

Un SVG arrive sous forme de corps d'esquisse, haut de 4 mm, et ses points peuvent être modifiés en mode esquisse. Saisissez la largeur en millimètres dans la fenêtre d'import avant d'importer ; sans nombre, il garde sa propre taille. Les contours qui se croisent eux-mêmes ne peuvent pas devenir un solide ; ils sont laissés de côté et comptés : réunissez les morceaux qui se chevauchent et fermez les contours dans le logiciel de dessin, puis importez de nouveau.

Pour en savoir plus : [Importation](chapter:files-and-saving#importation)

## Congés et chanfreins

### Pourquoi un congé ne peut-il pas être appliqué ?

Le plus souvent, il est trop grand pour cet endroit : il déborderait sur les faces voisines, ou l'arête se courbe plus serré que le rayon. Un ou deux millimètres de moins suffisent souvent, et dans les angles aigus un congé a besoin de plus de place que son rayon ne le laisse penser. Si les arêtes ne peuvent pas être arrondies ensemble, prenez-en moins à la fois ; l'arête qui gêne est dessinée en rouge. {{ui:edge.findLargest}} cherche la taille à votre place.

Pour en savoir plus : [Chanfreinage et congés des bords](chapter:edges-and-hollowing#chanfreinage-et-conges-des-bords)

### Pourquoi mes congés ont-ils disparu après la modification de l'esquisse ?

Après {{ui:inspector.editSketch}}, le corps est reconstruit et a de nouvelles arêtes. layerling replace les congés et chanfreins sur les arêtes situées là où se trouvaient les anciennes, tant que le corps a autant d'arêtes qu'avant. Avec un coin de plus ou de moins, ils sont laissés de côté, et le message dit combien. L'annulation ramène tout.

Pour en savoir plus : [En faire un corps](chapter:sketches#en-faire-un-corps)

### Pourquoi ne puis-je pas sélectionner certaines arêtes d'un modèle importé ?

STL, OBJ et 3MF n'apportent que des triangles, et les outils d'arêtes travaillent sur des maillages de 4 000 triangles au maximum. {{ui:editor.tool.makeExact}} transforme une pièce technique en un vrai corps CAO, sur lequel un perçage a un seul bord rond qu'un congé peut suivre. Un fichier STEP apporte une géométrie exacte dès le départ.

Pour en savoir plus : [Rendre exact un maillage importé](chapter:files-and-saving#rendre-exact-un-maillage-importe)

## Groupes, trous et dimensions

### Pourquoi les trous deviennent-ils ovales quand j'étire un groupe ?

Un groupe que l'on redimensionne étire tout ce qu'il contient, comme si c'était dessiné sur du caoutchouc. Dans les réglages du groupe, choisissez {{ui:inspector.groupResizeKeepParts}} sous {{ui:inspector.groupResize}} : les pièces qui traversent le groupe s'étirent, tandis que les trous et les petites pièces gardent leur taille et leur distance au côté le plus proche.

Pour en savoir plus : [Redimensionner un groupe : garder trous et petites pièces](chapter:solids-and-holes#redimensionner-un-groupe-garder-trous-et-petites-pieces)

### Pourquoi le groupement échoue-t-il, ou pourquoi le résultat a-t-il des trous ?

Soit une pièce n'est pas fermée, et le message la nomme, soit deux pièces se rejoignent presque sans vraiment se toucher. Dissociez le groupe, alignez exactement les pièces ou changez un peu une taille ou une position, puis groupez de nouveau. Les maillages très denses qui dépassent la limite de découpe des maillages importés ne sont pas réunis du tout.

Pour en savoir plus : [Regroupement](chapter:solids-and-holes#grouping)

### Comment modifier une pièce à l'intérieur d'un groupe ?

Sélectionnez le groupe et appuyez sur [[E]], ou double-cliquez dessus. Les pièces sont alors séparées et peuvent être modifiées ; quand vous terminez, le groupe est reconstruit. Les congés et chanfreins qui avaient été appliqués au groupe entier sont perdus lors de sa reconstruction.

Pour en savoir plus : [Modifier un groupe](chapter:solids-and-holes#modifier-un-groupe)

### Comment récupérer une pièce d'un état antérieur ?

Ouvrez la vue historique, amenez le curseur sur l'état qui contenait encore la pièce, cliquez sur la pièce et choisissez {{ui:historyView.bringBack}}. Une copie arrive dans le design actuel, telle qu'elle était et là où elle était, avec l'heure dans son nom.

Pour en savoir plus : [Rétrospective : la vue historique](chapter:select-and-arrange#retrospective-la-vue-historique)

## Impression et export

### STL, 3MF, OBJ ou STEP : lequel choisir ?

Pour l'imprimante, 3MF ou STL. 3MF garde chaque corps comme une pièce avec son nom et sa couleur ; STL est un seul maillage d'une seule couleur. OBJ transporte aussi les couleurs. STEP est destiné à d'autres logiciels de CAO : il contient la géométrie exacte avec les congés et les chanfreins.

Pour en savoir plus : [Exportation](chapter:files-and-saving#exportation)

### Comment mes couleurs arrivent-elles dans le slicer ?

Exportez en 3MF. Chaque corps garde sa couleur, et un corps peint en plusieurs couleurs porte la peinture sur ses faces. À l'ouverture, Bambu Studio et OrcaSlicer demandent comment faire correspondre les couleurs à vos filaments.

Pour en savoir plus : [Peindre en plusieurs couleurs](chapter:shapes#peindre-en-plusieurs-couleurs)

### Mes pièces ne s'emboîtent pas. De quel jeu ont-elles besoin ?

En général de 0,2 à 0,4 mm, selon l'imprimante. Le test d'ajustement le mesure : imprimez la petite plaque à sept trous, trouvez le trou le plus serré dans lequel la tige tourne encore, et saisissez cette valeur comme jeu de votre imprimante. Les nouveaux couvercles, queues d'aronde et filetages partent ensuite de cette valeur.

Pour en savoir plus : [Le jeu de votre imprimante : le test d'ajustement](chapter:printing#le-jeu-de-votre-imprimante-le-test-d-ajustement)

### Pourquoi layerling dit-il qu'une pièce ne tient pas dans l'imprimante ?

La pièce dépasse du bord du plateau ou est plus haute que ce que peut construire l'imprimante choisie. Ce n'est qu'une indication, que l'on peut fermer. Choisissez votre imprimante dans les paramètres, ou découpez une pièce trop grande avec {{ui:editor.tool.split}}.

Pour en savoir plus : [Quand quelque chose ne va pas](chapter:printing#quand-quelque-chose-ne-va-pas)

## À propos de layerling

### layerling est-il gratuit, et puis-je vendre ce que je conçois avec ?

layerling est un logiciel libre sous licence AGPL-3.0, sans compte. La licence concerne le programme : qui modifie layerling et le propose à d'autres à travers un réseau doit aussi proposer le code source. Elle ne pose aucune condition sur les modèles que vous créez. Les polices et les modèles que vous importez gardent leurs propres licences.

Si vous souhaitez soutenir le projet, un [petit don](support:) aide à couvrir les frais de serveur et de développement. Il est facultatif, et rien dans layerling n'en dépend.

Pour en savoir plus : [Exécutez-le vous-même](chapter:offline-and-install#executez-le-vous-meme)

### Comment signaler un bug ou demander quelque chose ?

{{ui:editor.bugReport}}, dans le pied de page, enregistre un ZIP contenant le design et un court texte sur la version et le navigateur ; il ne contient rien de personnel. Joignez-le sur le forum ou dans les discussions sur GitHub. Les questions et les souhaits sont les bienvenus aux deux endroits.

Pour en savoir plus : [Signaler un bug](chapter:files-and-saving#signaler-un-bug) et [Aide et commentaires](chapter:offline-and-install#aide-et-commentaires)
