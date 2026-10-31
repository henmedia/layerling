---
title: Construire avec une IA (MCP)
summary: Comment un assistant IA tel que Claude ou Codex crée et modifie des formes, les regroupe et prend des photos de la vue dans votre éditeur ouvert.
---

layerling est livré avec un serveur MCP. MCP est une norme grâce à laquelle un assistant IA peut utiliser des outils dans d'autres programmes. Avec lui, un client IA tel que Claude ou Codex voit un onglet d'éditeur ouvert et y travaille : il crée des formes, modifie les dimensions, regroupe, coupe, arrondit les bords, lit la scène et prend des photos de la vue. Vous décrivez la pièce, l'IA la construit, vous regardez et pouvez intervenir à tout moment.

Le pont entre le client AI et l'éditeur s'exécute **localement sur votre ordinateur**. Gardez cependant à l’esprit : ce que l’IA lit, c’est-à-dire la scène et les images de la vue, va au fournisseur de votre client IA, comme toute autre entrée.

> **Important :** Le pont MCP existe dans le serveur de développement que vous démarrez vous-même sur votre ordinateur. Sur layerling.com et dans les installations avec hébergement statique, il est désactivé. Une copie que vous hébergez vous-même, comme l'image Docker sur un NAS, peut l'activer avec un jeton d'accès ; voir « Une copie sur un NAS ou un serveur » ci-dessous.

## Configuration

1. Obtenez layerling depuis [GitHub](https://github.com/henmedia/layerling) et démarrez-le dans le dossier du projet avec `npm run dev`. Node.js doit être installé. Sous Windows, la ligne de démarrage rapide du README s'en charge.
2. Ouvrez un onglet d'éditeur, par exemple `http://127.0.0.1:3000/?editor=1`. Vous pouvez laisser cela à l'IA : lorsqu'aucun éditeur n'est ouvert, le premier outil qui en a besoin démarre votre navigateur avec un éditeur et attend qu'il se connecte. Cela fonctionne pour une instance de layerling sur votre propre ordinateur ; une copie sur un NAS ou un serveur nécessite que vous ouvriez l'éditeur. Définissez `LAYERLING_MCP_OPEN_EDITOR=0` pour que le serveur MCP le désactive.
3. Connectez votre client AI au serveur MCP. Le client le démarre lui-même avec `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Rien à installer : le projet apporte un `.mcp.json` qui enregistre le serveur, et la compétence sous `.claude/skills/layerling-mcp-skill`. Ouvrez le dossier layerling dans Claude Code et demandez, par exemple : "Utilisez les outils layerling MCP pour lister mes éditeurs ouverts et inspecter la scène."

### Claude Desktop

Claude Desktop ne lit pas les fichiers de projet. Entrez le serveur dans sa propre configuration. Comme modèle, utilisez `docs/mcp/claude-desktop-config.example.json` dans le projet, en remplaçant le chemin du script par le chemin absolu sur votre ordinateur. Redémarrez ensuite Claude Desktop.

### Codex

Copiez la compétence de `docs/skills/layerling-mcp-skill` dans votre dossier de compétences Codex, entrez le serveur dans votre configuration Codex à l'aide de `docs/mcp/codex-config.example.toml` et redémarrez le Codex.

Les instructions détaillées pour les trois se trouvent dans le [README sur GitHub](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## Une copie sur un NAS ou un serveur

Une copie que vous hébergez vous-même peut permettre à un client IA de piloter ses éditeurs ouverts sur le réseau. Il est désactivé par défaut, car quiconque peut conduire le pont peut lire et modifier les conceptions ouvertes. Sur le serveur, définissez `LAYERLING_MCP_REMOTE` sur `true` et `LAYERLING_MCP_TOKEN` sur un secret d'au moins 16 caractères (pour l'image Docker dans `environment:` du fichier de composition ; aucune reconstruction n'est nécessaire). Ouvrez un onglet d'éditeur de cette copie et laissez-le ouvert, et donnez au client MCP l'adresse et le même jeton : `LAYERLING_URL=http://nas:3000` et `LAYERLING_MCP_TOKEN=<the token>`.

Seul un client disposant du jeton peut lister ou piloter les éditeurs. Les pages de l'éditeur n'en ont pas besoin, mais elles ne comptent que sous une adresse ou un nom que seul votre propre réseau peut utiliser (une adresse IP, un nom sans point ou se terminant par `.local` ou `.lan`) ; un domaine réel derrière un proxy inverse va dans `LAYERLING_MCP_ALLOWED_HOSTS`. Utilisez-le sur un réseau de confiance, et HTTPS au-delà. Le README contient les détails.

## Ce que l'IA peut faire

L'IA fonctionne avec les mêmes fonctions que vous, via le même chemin que votre opération dans l'éditeur. Les nouvelles fonctions de layerling obtiennent immédiatement leur action MCP. Les outils :

| Outil | Ce qu'il fait |
| --- | --- |
| `layerling_list_editors` | répertorie les onglets ouverts de l'éditeur |
| `layerling_open_editor` | ouvre un nouvel onglet d'éditeur dans votre navigateur par défaut et attend qu'il soit connecté (sur votre propre ordinateur uniquement) |
| `layerling_read_scene` | lit la scène, la sélection, les unités et les dimensions exactes de tous les objets |
| `layerling_list_objects` | répertorie tous les objets avec les dimensions, la position, la rotation et l'identifiant |
| `layerling_select_objects` | sélectionne des objets |
| `layerling_delete_objects` | supprime des objets |
| `layerling_create_shape` | crée une forme : boîte, cylindre, texte (également courbé), fil, engrenage, corps d'esquisse et tous les autres |
| `layerling_import_file` | importe un fichier comme le fait la fenêtre d'import, un OBJ ou 3MF coloré comme un corps par couleur, un 3MF avec plusieurs objets comme un corps par objet |
| `layerling_add_font` | ajoute sa propre police pour le texte d'un fichier TrueType, OpenType ou WOFF ; il reste dans le navigateur, un design ne conserve que les lettres qu'il utilise |
| `layerling_list_fonts` | répertorie les polices intégrées et les polices personnelles, avec leur identifiant et leur nom |
| `layerling_import_mesh` | apporte un maillage triangulaire dans la conception |
| `layerling_update_object` | change les dimensions, la position, la couleur, le nom, le solide ou le trou et tout ce qui constitue la forme, le bord d'une lettre de texte inclus |
| `layerling_align_objects` | aligne les objets les uns avec les autres |
| `layerling_scale_objects` | met à l'échelle les objets selon un pourcentage, ensemble ou chacun en place |
| `layerling_lay_flat` | pose un objet avec une face sur la plaque |
| `layerling_place_on_face` | pose des objets sur une face d'une autre, également inclinée, comme la touche C |
| `layerling_perforate_face` | découpe un motif de trous dans une face plate ; les trous restent groupés avec le corps |
| `layerling_sweep_sketch` | tire une section rectangulaire ou ronde le long d'un chemin de points, comme un seul corps exact ; un chemin fermé donne un anneau |
| `layerling_push_face` | tire une face plane vers l'extérieur ou y creuse une poche, avec un retrait depuis le bord et un rayon des coins ; la nouvelle pièce est un corps d'esquisse regroupé avec le corps |
| `layerling_mate_faces` | amène la face d'un objet contre la face d'un autre, face à face ou à fleur |
| `layerling_open_group` | ouvre un groupe pour que ses parties puissent être modifiées une par une, également un groupe à l'intérieur d'un groupe ouvert |
| `layerling_close_group` | le referme ("Terminé") ou annule |
| `layerling_group_objects` | groupes d'objets |
| `layerling_ungroup_objects` | dissout les groupes |
| `layerling_boolean_cut` | coupe les solides avec des trous |
| `layerling_intersect_objects` | ne garde que ce que les objets ont en commun (Intersection) |
| `layerling_hull_objects` | enveloppe les objets dans un seul corps convexe, comme sous film rétractable (Enveloppe) |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_make_lid` | makes a lid for a body open at the top: pushed in, over the top or flat, with the fit you choose (Lid) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | sépare une forme en ses parties détachées, un corps d'esquisse en un corps par contour |
| `layerling_split_objects` | coupe des solides ou des trous en deux avec un rabot |
| `layerling_list_edges` | répertorie les véritables bords CAO d'un objet |
| `layerling_apply_edge_treatment` | chanfreins ou congés arêtes choisies |
| `layerling_hollow_object` | creuse un corps avec une paroi plane |
| `layerling_cut_out` | découpe un solide dans un autre pour qu'ils s'ajustent : la pièce reste, une copie agrandie du jeu est soustraite de l'autre corps |
| `layerling_offset_object` | décale toutes les faces d'un corps pour le jeu d'un ajustement : l'agrandit ou le réduit, ou ajoute la copie agrandie comme trou, ou ne déplace que les côtés |
| `layerling_list_faces` | répertorie les faces d'un corps exact |
| `layerling_delete_faces` | supprime des faces et referme le vide |
| `layerling_array_objects` | se multiplie en ligne ou sur un cercle |
| `layerling_bundle_objects` | regroupe les objets comme Ctrl+B : ils se déplacent ensemble, gardent leur couleur et leur nature et sortent séparément lors d'un export |
| `layerling_layer_text` | transforme un texte en une pile de calques pour une impression multicolore (lettres, bords plus larges, plaque sans trous) ou reconstitue une pile, avec un trou en porte-clés, les coins par calque et un bord de lettre arrondi ou chanfreiné ; avec une liste de noms, une balise par nom |
| `layerling_layer_icon` | transforme une icône SVG (le texte du fichier ou un corps d'esquisse extrudé) en une balise d'icône en couches pour une impression multicolore - l'icône, des bords plus larges, une plaque sans trous - ou en construit une à nouveau avec une nouvelle largeur ou des nouveaux calques ; avec un compte il remplit l'assiette de copies |
| `layerling_create_qr_code` | crée un code QR à partir d'un texte ou d'une adresse web, comme {{ui:shape.qrCode}} dans la bibliothèque de formes - le code seul, en relief sur une plaque ou gravé, avec correction d'erreur, largeur, hauteur, zone de silence et en trou si demandé ; avertit quand un module passe sous 0,8 mm |
| `layerling_reference_image` | ajoute une image de référence à partir d'une image, comme {{ui:import.referenceImage}}, ou en déplace, tourne, calibre (deux points de l'image et leur distance réelle), estompe ou verrouille une - un repère jamais exporté ni imprimé; `trace` transforme sa partie sombre ou claire en un corps d'esquisse posé dessus |
| `layerling_measure_section` | mesure sur un plan de coupe entre deux points qui s'accrochent au contour - épaisseur de paroi, espaces, ajustements |
| `layerling_show_overhangs` | active ou désactive les hachures en surplomb, définit l'angle et indique pour chaque corps la zone qui aurait besoin de supports |
| `layerling_estimate_print` | estime le volume, le poids et le filament pour la sélection ou l'ensemble du dessin, élaboré aussi solidement que la fenêtre d'export |
| `layerling_add_reference_points` | marque des points de référence - au centre, dans les coins ou au milieu des bords des objets, ou à des positions exactes - sur lesquels les formes s'accrochent |
| `layerling_list_reference_points` | répertorie les points de référence avec leurs identifiants et positions |
| `layerling_remove_reference_points` | supprime les points de référence par identifiant, ou tous |
| `layerling_inspect_errors` | affiche le dernier message et la dernière erreur, ainsi que les messages et erreurs de la session |
| `layerling_wrap_around_cylinder` | enroule un corps posé à plat, un SVG ou un texte par exemple, autour d'un cylindre, vers l'extérieur ou vers l'intérieur comme une gravure |
| `layerling_texture_surface` | applique une texture de surface sur un corps : rainures, moletage, nid d'abeille ou picots, pour la prise en main ou pour l'aspect, et la change ou la retire plus tard |
| `layerling_simplify_mesh` | réduit le nombre de triangles d'un maillage importé, à une part en pourcentage ou à un nombre de triangles |
| `layerling_save_custom_shape` | conserve les corps sous forme de forme personnalisée, sur le serveur ou dans le navigateur, pour les insérer dans d'autres conceptions |
| `layerling_list_custom_shapes` | répertorie les formes personnalisées sur le serveur et dans le navigateur |
| `layerling_insert_custom_shape` | insère une forme personnalisée dans le design ouvert, à un endroit x/z si vous le souhaitez |
| `layerling_delete_custom_shape` | supprime une forme personnalisée ; les corps insérés restent |
| `layerling_show_workplane` | cache et affiche la plaque avec sa grille, pour une photo du dessous par exemple (uniquement la vue) |
| `layerling_set_section_view` | coupe la vue ouverte le long d'un plan pour regarder à l'intérieur (seulement la vue, rien n'est coupé) |
| `layerling_measurements` | affiche ou masque les mesures du ruban à mesurer et les liste avec leurs longueurs, et masque ou affiche les cotes autour de la sélection comme [[Q]] |
| `layerling_saved_view` | enregistre la vue actuelle sous la touche 7, 8, 9 ou 0 et y revient, comme Maj+touche et la touche (seulement la vue); règle aussi la vue de départ des nouveaux designs |
| `layerling_clear_history` | supprime définitivement chaque étape d'annulation, comme le fait le bouton "Supprimer l'historique" de la vue Historique ; besoins `confirm: true` |
| `layerling_set_history_view` | revient sur un état antérieur du projet, comme la vue Historique (la conception réelle reste intacte ; les outils de changement attendent qu'il soit fermé) |
| `layerling_restore_from_history` | ramène des objets (aussi des pièces dans des groupes) d'un état antérieur dans la conception, sous forme de copies, comme « Ramener dans la conception » de la vue Historique - une étape que l'annulation reprend |
| `layerling_export_section_svg` | renvoie les contours sur un plan de coupe au format SVG à 1:1, à partir des mêmes corps que l'export |
| `layerling_sketch_from_section` | crée une esquisse à partir des contours sur un plan de coupe, posée sur la coupe : ouverte dans l'éditeur pour la modifier, ou construite aussitôt en un corps d'une hauteur donnée |
| `layerling_export_drawing` | réalise le dessin d'atelier de l'export "2D": trois vues au 1:1 sur une feuille ISO avec les dimensions hors tout et un tableau des alésages ronds, en texte SVG ou PDF |
| `layerling_export_mesh` | écrit le fichier de la fenêtre d'export en STL, 3MF, OBJ, SVG (vue de dessus, empreinte ou arêtes visibles) ou DXF pour la découpe laser, à partir des mêmes corps ; vers un chemin de cet ordinateur ou en base64 |
| `layerling_save_project` | enregistre toute la conception modifiable comme fichier .lyl à un chemin de l'ordinateur où tourne le serveur MCP, sans boîte de dialogue ; un fichier existant n'est remplacé qu'avec `overwrite`, l'écriture passe par un fichier temporaire, et la cible de Ctrl+S dans l'éditeur reste inchangée |
| `layerling_list_attachments` | liste les fichiers joints au modèle (nom, type, taille), comme le panneau Pièces jointes les montre |
| `layerling_get_attachment` | lit un fichier joint, ses octets en base64, comme Télécharger dans le panneau |
| `layerling_add_attachment` | joint un fichier donné en base64, avec les contrôles du panneau ; un nom déjà joint n'est remplacé qu'avec `replace` |
| `layerling_rename_attachment` | renomme un fichier joint ; son contenu reste |
| `layerling_remove_attachment` | retire un fichier joint définitivement ; demande `confirm: true` |
| `layerling_set_workplane` | place le plan de travail sur un côté d'un corps ou à l'arrière de la plaque de base, et le cache ou l'affiche |
| `layerling_capture_image` | prend une photo de la vue : de face, de dessus, de côté, en diagonale depuis un coin et plus encore |

Cela permet à l’IA de s’auto-vérifier : elle crée quelque chose, prend une photo, regarde et améliore.

## Un exemple

Vous dites : « Construisez-moi une boîte ronde de 60 mm de diamètre, 40 mm de haut avec une paroi de 2,5 mm, ouverte en haut, plus un couvercle plat avec « Thé » écrit en arc de cercle. L'IA crée les cylindres, en creuse un, place le texte incurvé sur le couvercle et prend des photos à la fin pour voir s'il rentre.

> **Astuce :** Donnez à l'IA des dimensions concrètes et indiquez-lui à quoi sert la pièce ("support pour tige de 12 mm, s'adapte à un Bambu Lab A1"). Il prend alors des décisions plus judicieuses. Et regardez-le se développer : vous pouvez intervenir vous-même à tout moment, car c'est le même éditeur.
