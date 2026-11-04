---
title: Installation en tant qu'application, travail hors ligne et auto-hébergement
summary: Commencez à superposer comme un programme normal, même sans réseau, et comment l'exécuter sur votre propre ordinateur.
---

## Installation en tant qu'application

Sur un ordinateur, un layerling installé dans Chrome ou Edge s'enregistre aussi comme programme pour les fichiers `.lyl` : un double-clic sur une conception dans le gestionnaire de fichiers l'ouvre dans layerling, et [[Ctrl]]+[[S]] enregistre de nouveau dans ce fichier. Sur Android, cela ne fonctionne pas, le navigateur n'y propose pas d'association de fichiers pour les applications web installées ; ouvrez une conception avec {{ui:dashboard.importGeometry}} sur la page d'accueil.

layerling peut être installé comme un programme normal. Il obtient alors une icône et une fenêtre qui lui est propre, sans barre d'adresse. Après la première visite, cela commence même **sans Internet**. Vos créations restent sur votre ordinateur. L'installation vaut la peine : l'application démarre plus vite, car elle n'a pas à être rechargée à chaque fois, elle fonctionne sans internet et décharge le serveur. Vous ne perdez rien, car layerling vous indique toujours quand une nouvelle version est disponible. Cela protège aussi vos conceptions : Safari sur Mac, iPhone et iPad efface les données enregistrées d'un site qui n'a pas été visité depuis sept jours, mais pas celles d'une application installée.

Sur la page de démarrage, un indice {{ui:installHint.install}} apparaît si votre navigateur peut le faire. Sinon:

- **Chrome et Edge :** Cliquez sur l'icône d'installation à droite de la barre d'adresse ou choisissez « Installer en tant qu'application » dans le menu du navigateur.
- **Safari sur Mac :** Menu "Fichier", puis "Ajouter au Dock".
- **Safari sur iPhone et iPad :** Icône Partager, puis « Ajouter à l'écran d'accueil ».
- **Firefox :** ne peut pas installer d'applications. layerling démarre toujours hors ligne dans un onglet.

Vous pouvez fermer l'indice sur la page de démarrage avec {{ui:installHint.dismiss}}. Le fait de démarrer une deuxième fois l'application installée dans Chrome ou Edge amène la fenêtre ouverte au premier plan au lieu d'en ouvrir une autre.

## Mises à jour

Lorsqu'une version plus récente existe, layerling l'affiche sur la page de démarrage. Grâce à {{ui:dashboard.updateBannerLink}}, vous lisez ce qui a changé. Le numéro de version est en bas à droite. Après avoir rechargé la page, vous disposez de la nouvelle version.

Sur layerling.com et sur d'autres serveurs Web, une page ouverte remarque d'elle-même une mise à jour. Il demande sa version au serveur de temps en temps, lorsque vous revenez à l'onglet, et immédiatement si un fichier programme dont il avait besoin a disparu. Lorsqu'une nouveauté a été installée entre-temps, une carte en bas à droite l'indique et répertorie les nouveautés. {{ui:newVersion.reload}} écrit d'abord le design que vous avez ouvert dans le navigateur, puis charge à nouveau la page ; le design revient tel que vous l'avez laissé. {{ui:newVersion.later}} retient la carte pendant 15 minutes. Recharger bientôt : une page qui reste sur l'ancienne version peut charger des parties de la nouvelle qui ne correspondent pas. La même carte apparaît lorsque cela s'est déjà produit : les travailleurs de CAO, qui se chargent uniquement lorsque vous en avez besoin pour la première fois, indiquent de quelle version ils proviennent, et si ce n'est pas la propre de la page - après une mise à jour ou avec une copie stockée d'une ancienne version - la carte demande un rechargement avant que les deux ne se comprennent mal.

Lorsque layerling est ouvert dans plusieurs onglets, ils se surveillent : si un autre onglet exécute déjà une version plus récente, une note en bas de l'ancien onglet vous demande de le recharger. Et si le même dessin est ouvert dans deux onglets, les deux vous avertissent, car ils s'enregistrent automatiquement et s'écraseraient mutuellement. Si vous ouvrez layerling dans un onglet supplémentaire alors qu'un autre est déjà ouvert, le nouvel onglet suggère de continuer dans l'ancien et propose de se fermer. Si vous voulez exprès deux onglets, par exemple pour deux modèles côte à côte, cliquez ici sur {{ui:tabs.keepHere}}. Ce guide s'ouvre également dans un onglet qui lui est propre : alors que layerling est ouvert à côté, son bouton en haut à droite indique "Retour à l'éditeur" et ferme le guide au lieu d'ouvrir l'éditeur une seconde fois.

## Langue et apparence

Vous choisissez la langue en haut à droite, dans la liste des langues. La palette de couleurs à côté propose {{ui:theme.short.system}} (suit le système d'exploitation), {{ui:theme.short.light}}, {{ui:theme.short.dark}} et {{ui:theme.short.graphite}}, un gris foncé neutre.

## Exécutez-le vous-même

layerling est un logiciel libre (AGPL-3.0) et peut être exécuté sur votre propre ordinateur ou serveur, par exemple dans un atelier, un club ou une école. Il existe plusieurs manières, décrites dans le [README sur GitHub](https://github.com/henmedia/layerling/blob/main/README.md#getting-started) :

- **Le démarrage rapide sous Windows :** Une seule ligne dans PowerShell installe tout et met un raccourci sur le bureau. Lorsque layerling est déjà en cours d'exécution, un autre double-clic ne démarre aucun deuxième serveur et ouvre uniquement la page.
- **Docker :** Pour les appareils NAS et les serveurs domestiques, sans qu'il soit nécessaire d'installer Node.js. Chaque version se présente sous la forme d'une image prête à l'emploi `henmedia/layerling` sur Docker Hub (également `ghcr.io/henmedia/layerling`) pour amd64 et arm64 ; `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` le démarre et sur un NAS, vous le recherchez dans le registre du gestionnaire de conteneurs.
- **Exportation statique :** Le résultat est des fichiers simples que n'importe quel serveur Web peut servir. Ils appartiennent à la racine d'une adresse (`https://layerling.example.com/` ou `http://192.168.0.5:8080/`), pas dans un sous-dossier et non ouverts depuis le disque ; le README contient les étapes. Avec un dossier inscriptible `store` à côté de `index.html` et PHP sur le serveur, il devient également le stockage partagé pour les conceptions.

Le pont MCP pour les assistants IA existe uniquement dans le serveur de développement, voir [Construire avec une IA](chapter:ai-with-mcp).

## Aide et commentaires

- Dans l'éditeur, la zone {{ui:editor.group.help}} contient le {{ui:editor.guide}} avec les mouvements les plus importants et l'aperçu des [raccourcis clavier] (chapter:shortcuts). Chaque section du guide rapide comporte un point d'interrogation qui mène au chapitre correspondant ici.

![Le guide rapide dans l'éditeur. Les vidéos réalisées par d'autres sont répertoriées en haut et chaque section comporte un point d'interrogation.](shot:quick-guide)

- Les questions, souhaits et rapports de bogues sont les bienvenus sur le [forum](https://forum.drucktipps3d.de/forum/board/127-layerling/) et sur [GitHub](https://github.com/henmedia/layerling/discussions).
- Ce qui a changé dans quelle version se trouve dans les notes de version, que vous trouvez en bas de la page d'accueil et de l'éditeur.
