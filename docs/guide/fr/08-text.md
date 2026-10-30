---
title: Texte et lettres courbes
summary: Lettrage en relief ou gravé en sept caractères ou un de votre choix, et si vous le souhaitez en arc de cercle, comme sur une pièce de monnaie, un couvercle ou une bague.
---

## Ajout de texte

Choisissez {{ui:shape.text}} dans la bibliothèque de formes et placez-le. Dans le champ {{ui:prop.text}} à droite, saisissez ce qu'il doit dire. Les paramètres ci-dessous :

- **{{ui:prop.font}} :** Sept polices de caractères sont disponibles : Multilingue, Sans, Serif, Script, Monospace, Rounded et Pochoir (lettres constituées de lignes droites). Le nouveau texte commence en Sans. Des lettres accentuées telles que ä, ö, ü, é et le signe € figurent dans chaque police. Vos propres polices viennent en tête, voir [Vos propres polices](#vos-propres-polices) ci-dessous.
- **{{ui:nameTag.letterSize}} :** Quelle est la taille des lettres, vues d'en haut ; {{ui:prop.height}} définit leur épaisseur.
- **{{ui:prop.height}} :** Dans quelle mesure le lettrage se détache de la surface.
- **{{ui:prop.bevel}} :** Arrondit les bords des lettres pour qu'ils paraissent plus doux. Avec {{ui:prop.segments}}, vous décidez du nombre d'étapes.
- **{{ui:nameTag.letterEdge}} :** arrondit ou chanfreine le bord supérieur des lettres, comme sur un porte-nom : {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} ou {{ui:nameTag.edge.chamfer}}, avec la {{ui:nameTag.letterEdgeSize}} (0,4 mm au départ, au plus aussi haute que le texte). Elle va plus loin que {{ui:prop.bevel}}, mais seulement jusqu'à la largeur des traits : là où un trait est plus fin que le double de la taille, le bord se termine par un sommet plus étroit. Le dessous reste plat, on peut donc coller les lettres une à une ensuite. Tant qu'un bord est choisi, il remplace {{ui:prop.bevel}}.
- **Taille :** Vous définissez la longueur et la largeur de la ligne comme pour n'importe quelle forme. Faites glisser les poignées ou saisissez les dimensions.
- **{{ui:prop.textStretch}} :** Désactivé au départ : les lettres gardent leurs proportions et restent au milieu du cadre, donc un cadre étiré plus large ou plus profond que le mot n'en a besoin reste plus grand que les lettres. Activez-le et les lettres sont étirées dans les deux directions pour remplir tout le cadre : une majuscule peut être rendue plus basse ou plus étroite, comme dans Tinkercad. Il s'applique au texte droit ; le texte courbe a sa propre taille de lettre.

Le texte est d’abord un seul corps. Si vous souhaitez traiter les lettres individuellement, cliquez sur {{ui:inspector.separateParts}}. Chaque lettre est alors une forme qui lui est propre.

Les bords du texte peuvent également être chanfreinés ou arrondis, droits ou incurvés, voir [Casser les bords et creuser les corps] (chapter:edges-and-hollowing). Utilisez des petites tailles telles que 0,2 à 0,5 mm, car les traits des lettres sont étroits.

## Vos propres polices

Outre les sept polices intégrées, vous pouvez utiliser n'importe quelle police de votre choix : un fichier de police de votre ordinateur ou, dans Chrome et Edge, une police installée sur votre ordinateur. Choisissez {{ui:font.manage}} en bas de {{ui:prop.font}}. La fenêtre {{ui:font.title}} s'ouvre.

- **{{ui:font.addFile}}** prend un fichier TrueType (`.ttf`), un fichier OpenType (`.otf`) ou un fichier WOFF (`.woff`). Vous pouvez également simplement faire glisser le fichier dans la fenêtre.
- **Sous Windows**, les polices installées se trouvent dans le dossier Polices (`C:\Windows\Fonts`). La boîte de dialogue de fichier du navigateur le cache. Ouvrez-le plutôt dans l'Explorateur et faites glisser la police dans la fenêtre {{ui:font.title}}. Les polices installées pour vous seul résident dans `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, que la boîte de dialogue de fichier affiche également. Sur un Mac, les polices résident dans `/Library/Fonts` et `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** répertorie les polices installées sur votre ordinateur. La première fois, le navigateur demande si layerling peut les lire. Le champ de recherche trouve rapidement une police, un clic la prend.

Si un texte est sélectionné, il obtient immédiatement la nouvelle police. Sinon la police apparaît sous {{ui:prop.font}} dans le groupe {{ui:font.customGroup}}, et {{ui:font.use}} dans la fenêtre la place sur les textes sélectionnés. Les polices de votre choix fonctionnent comme celles intégrées : le texte sur un arc de cercle, les chanfreins et les congés sur les bords et l'exportation STEP fonctionnent tous de la même manière. Les lettres qui manquent à une police sont tirées de Sans.

### Arabe et hébreu

L'arabe, le persan, l'ourdou et l'hébreu s'écrivent de droite à gauche : la première lettre se trouve à droite, et dans un texte mixte tel que "Nom عربي", seul le mot arabe va à l'envers, les chiffres restent comme d'habitude. Les lettres arabes rejoignent leurs voisines comme le demande l'écriture, et le lam-alef devient une ligature. Cela nécessite une police contenant ces lettres ; ceux intégrés ne le font pas. Ajoutez-en une propre, comme Arial, Tahoma ou Segoe UI sous Windows, ou une version gratuite comme Noto Naskh Arabic, Noto Sans Arabic ou Amiri. Les marques de voyelles figurent sur la lettre à laquelle elles appartiennent. Le texte sur un arc de cercle, le contour, la silhouette, les calques et les balises de nom fonctionnent comme avec tout autre texte.

### Qu'est-ce qui fonctionne dans quel navigateur

| Navigateur | Choisissez un fichier de police | Police de l'ordinateur |
| --- | --- | --- |
| Chrome et Edge sur un ordinateur, l'application layerling installée également | oui | oui, après que le navigateur ait demandé |
| Firefox | oui | non |
| Safari sur Mac | oui | non |
| Tablette et téléphone | oui, à partir des fichiers de l'appareil | non |

Les pages Web ne peuvent pas simplement lire les polices installées. Seuls Chrome et Edge en ont l'autorisation, et uniquement sur les pages sécurisées, sur `https` comme sur layerling.com. Lorsque layerling s'exécute sur `http`, par exemple sur votre propre serveur ou en tant qu'installation Docker sur votre réseau domestique, {{ui:font.fromSystem}} est manquant ; faites ensuite glisser la police depuis l'Explorateur. Dans les autres navigateurs, vous choisissez le fichier de police dans le dossier des polices, avec le même résultat. Si vous avez refusé la question dans Chrome ou Edge, autorisez-la à nouveau dans les paramètres du site, derrière le cadenas à gauche de l'adresse.

layerling ne peut pas lire les fichiers WOFF2 (il existe presque toujours une version TTF ou OTF), les collections de polices (`.ttc`, plusieurs polices dans un seul fichier) ou les polices emoji de couleur. À partir de très grandes polices, comme les polices chinoises, layerling prend les 8 000 premiers caractères. Une police variable est lue avec son réglage par défaut, généralement le poids normal.

Certaines polices, scriptes et variables surtout, dessinent une lettre à partir de traits qui se chevauchent. layerling les fusionne en un seul contour net lors de la lecture de la police, de sorte que le corps reste imprimable. Ces lettres sont alors constituées de pièces droites très courtes au lieu de courbes ; ça ne se voit pas.

### Où les polices sont conservées

Votre propre police reste **dans ce navigateur sur cet ordinateur**. Un autre navigateur ou un autre ordinateur ne le connaît pas jusqu'à ce que vous l'y ajoutiez également. La suppression des données du site du navigateur efface également les polices. Dans la fenêtre {{ui:font.title}}, le bac supprime une police du navigateur. Vos créations n’y perdent rien, comme le montre la section suivante.

### Transmettre des designs avec votre propre police

Une conception ne stocke **pas le fichier de police**, uniquement les contours des lettres utilisées par ses textes, celles des étapes précédentes de l'historique incluses. Si un texte dit "Bonjour", seuls H, e, l et o voyagent avec. Cela vaut pour toutes les manières dont un design est enregistré : dans le navigateur, sur votre propre serveur, sous forme de fichier `.lyl` et dans {{ui:myShapes.title}}.

Donc:

- **Le design s'ouvre correctement n'importe où**, également sur un ordinateur sans la police. Les textes se ressemblent et peuvent être déplacés, tournés, mis à l'échelle et arrondis.
- **Les nouvelles lettres ont besoin de la police.** Si quelqu'un sans la police tape une lettre que le dessin n'a pas apportée, layerling utilise Sans. Sous {{ui:prop.font}}, la police est alors marquée {{ui:font.fromDesign}}. L'ajout du fichier de police ramène chaque lettre.
- **Les exportations contiennent uniquement la géométrie.** STL, 3MF, OBJ, STEP et SVG contiennent des corps et des contours, pas de police.
- **Les anciennes versions de layerling** ne connaissent pas encore leurs propres polices et dessinent de tels textes en multilingue.

**Licences :** Les polices sont protégées par le droit d'auteur et leur licence indique ce que vous pouvez en faire. Les contours des lettres intégrés sont ce que les fichiers PDF retirent d'une police, et la plupart des licences le permettent. Certaines polices commerciales interdisent cependant de transmettre même des lettres simples. Avant de transmettre ou de publier un design avec votre propre police, vérifiez la licence de la police. Les polices gratuites telles que celles de Google Fonts (pour la plupart sous licence SIL Open Font) peuvent être transmises sans souci. Pour une pièce imprimée ou un STL exporté, cela n'a pas d'importance : ils ne contiennent plus de police, seulement de la géométrie.

## En relief ou gravé

- **Relevé :** Placez le texte sur la surface et regroupez-le avec le corps. Cela se développe comme un soulagement.
- **Gravé :** Basculez le texte sur {{ui:inspector.hole}}, laissez-le pénétrer un peu dans la surface et regroupez-le avec le corps. Les lettres sont ensuite gravées.

Pour lettrage sur une face latérale, placez d'abord le plan de travail sur cette face, voir [Vue et plan de travail](chapter:view-and-workplane).

## Contour, silhouette et plus large

Un texte n'a pas besoin d'être construit sous forme de lettres remplies. {{ui:prop.textFill}} dans les propriétés propose le même choix que Tinkercad :

- **{{ui:prop.textFill.filled}} :** les lettres telles quelles.
- **{{ui:prop.textFill.outline}} :** une ligne le long du contour des lettres, moitié à l'intérieur et moitié à l'extérieur.
- **{{ui:prop.textFill.outer}} :** une ligne autour de l'extérieur des lettres.
- **{{ui:prop.textFill.inner}} :** une ligne à l'intérieur des lettres.

Une fois une ligne choisie, deux paramètres apparaissent juste sous la liste : {{ui:prop.sketchLineWidth}} définit l'épaisseur de la ligne, {{ui:sketch.strokeJoin}} la manière dont elle contourne les coins ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} ou {{ui:sketch.strokeJoin.miter}}). Les paramètres les plus rares se trouvent sous {{ui:inspector.more}} : {{ui:prop.sketchSilhouette}} laisse de côté les trous en O, A ou e, et {{ui:prop.textWider}} garde les lettres remplies et les rend plus épaisses de la largeur de la ligne tout autour ; les lettres qui se touchent grandissent en un seul morceau.

Avec une ligne à l'extérieur, une ligne centrée ou "Plus large", la case du texte s'agrandit, tandis que les lettres gardent leur taille. {{ui:prop.bevel}} et {{ui:prop.segments}} existent uniquement pour les lettres remplies.

## Calques et balises de nom

Une balise pour une impression multicolore est un texte en couches : les lettres en haut, en dessous le même texte un peu plus large dans une deuxième couleur, en bas une plaque sans trous dans une troisième. layerling le fait en un clic :

- **Une nouvelle balise de nom :** choisissez {{ui:shape.nameTag}} dans la bibliothèque de formes et placez-la. Il est écrit « Nom » en lettres blanches sur un bord rouge et une plaque sombre.
- **À partir d'un texte :** sélectionnez le texte et cliquez sur {{ui:nameTag.makeLayers}} en haut de ses paramètres.

Tous les paramètres du tag sont dans la fiche {{ui:nameTag.title}}, en haut des paramètres :

- **{{ui:prop.text}}** et **{{ui:prop.font}}**, vos propres polices également. Le tag grandit avec les mots.
- **{{ui:nameTag.letterSize}} :** hauteur des lettres majuscules, en mm. Toutes les couches suivent et restent alignées.
- **{{ui:nameTag.layers}} :** une ligne par couche, de haut en bas. Chaque ligne a la couleur (cliquez sur le carré coloré), la largeur du calque par rapport aux lettres, sa hauteur et {{ui:nameTag.noHoles}}, qui remplit les trous des lettres telles que O et A. {{ui:nameTag.corners}} définit la façon dont un calque plus large contourne les coins des lettres : {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} ou {{ui:nameTag.corner.miter}}. La rangée du haut représente les lettres elles-mêmes. **+** ajoute un calque en bas, **–** supprime le calque inférieur. Une balise comporte de deux à six couches.
- **{{ui:nameTag.keyring}} :** donne à la couche inférieure une languette droite avec une extrémité ronde et un trou pour un porte-clés ; la languette grandit avec le trou. Un trou de 3 mm, par défaut, crée une languette de 6,5 mm de large qui dépasse de 6,75 mm, le bord du trou étant à 2 mm du bord de la couche inférieure. Choisissez le {{ui:nameTag.keyringDiameter}} et le {{ui:nameTag.keyringSide}} : {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} ou {{ui:nameTag.side.top}}. Le trou traverse chaque calque qu'il touche et l'onglet se déplace lorsque vous modifiez les mots, la taille des lettres ou la police. {{ui:nameTag.keyringAlong}} déplace la languette vers le haut ou le bas le long de son côté (en haut : vers la gauche ou la droite), jusqu'à l'endroit où elle quitterait le côté ; 0 est le milieu. C'est utile quand le milieu du côté tombe sur un vide, comme à côté d'un J : place la languette là où la lettre dépasse.
- **{{ui:nameTag.letterEdge}} :** arrondit ou chanfreine le bord supérieur des lettres sur la couche supérieure, de la même manière qu'une étiquette imprimée est terminée : {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} ou {{ui:nameTag.edge.chamfer}}, avec le {{ui:nameTag.letterEdgeSize}} (0,4 mm pour commencer, au plus aussi haut que la couche). Cela fonctionne pour chaque police et chaque mot. Le bord fait partie du maillage des lettres, donc l'outil de bord prend un tel texte comme maillage, ce qui pour un texte aussi fin est lourd ; choisissez plutôt le bord ici.

Chaque changement apparaît en même temps. L'étiquette est un paquet : elle se déplace comme une seule et chaque couche reste un corps qui lui est propre dans sa propre couleur, comme un slicer en a besoin pour une impression multicolore. Pour arrondir ou biseauter les bords d'un calque, cliquez sur {{ui:group.editBundle}} et sélectionnez le calque, voir [Casser les bords et creuser des corps] (chapter:edges-and-hollowing).

### Plusieurs tags de nom à la fois

Tapez les noms dans {{ui:textLayers.names}}, un par ligne, jusqu'à cent. Le bouton ci-dessous indique le nombre de balises à créer, par exemple "Créer 12 balises de nom". Chaque étiquette a les mêmes calques, la même taille de lettre et le même trou pour le porte-clés et est un objet à part entière ; ils sont disposés en rangées inférieures à la première, espacées de 5 mm. Un texte brut contient également la liste de noms, plus bas dans ses paramètres.

## Badges d'icône

Une balise icône est la même balise avec une icône SVG au lieu de lettres : un cœur, un nuage, le logo d'un club. L'icône en haut, en dessous le même contour un peu plus large dans une seconde couleur, en bas une plaque sans trous.

- **Une nouvelle balise icône :** choisissez {{ui:shape.iconTag}} dans la bibliothèque de formes. Une petite fenêtre s'ouvre : cliquez sur {{ui:iconTag.browse}}, choisissez un fichier SVG, vérifiez l'image, tapez le {{ui:iconTag.width}} de l'icône et cliquez sur {{ui:iconTag.ok}}. L'étiquette se trouve au milieu de l'assiette, dans les mêmes couches qu'une nouvelle étiquette nominative.
- **À partir d'un corps d'esquisse :** un SVG importé ou une esquisse que vous avez dessinée a {{ui:nameTag.makeLayers}} en haut de ses paramètres.

La carte {{ui:iconTag.title}} en haut des paramètres contient :

- **{{ui:iconTag.replace}} :** place l'icône d'un autre fichier (SVG, PNG ou JPG) sur la balise ; les couches et la largeur restent telles quelles.
- **{{ui:iconTag.iconWidth}} :** la largeur de l'icône en haut, en mm. Toutes les couches suivent et restent alignées.
- **{{ui:nameTag.layers}} :** les lignes comme sur une étiquette de nom - couleur, de combien plus large, {{ui:nameTag.corners}}, hauteur et {{ui:nameTag.noHoles}}, **+** et **–**, deux à six couches. La rangée du haut est l'icône elle-même.
- **{{ui:nameTag.keyring}} :** comme sur une étiquette de nom : un trou pour porte-clés à travers chaque couche, avec une patte à extrémité arrondie sur la couche inférieure, au-delà de l'icône. {{ui:nameTag.keyringDiameter}} et {{ui:nameTag.keyringSide}} déterminent sa taille et son emplacement. La patte est calculée pour épouser le contour de l'icône ; pour une icône très découpée, vérifiez où elle touche le plateau. {{ui:nameTag.keyringAlong}} déplace la languette le long de son côté, comme sur l'étiquette de nom.
- **{{ui:iconTag.count}} :** combien de balises vous souhaitez, de 1 à 100. {{ui:iconTag.fill}} le calcule à partir du plateau de l'imprimante choisie dans les paramètres, pour une plaque complète de petits logos. Le bouton en dessous les génère, espacés de 5 mm, répartis au milieu du plateau ; la première est la balise d'origine.

Le fichier SVG nécessite des contours fermés ; un dessin composé uniquement de lignes ouvertes ne peut pas former une balise. Un corps d'esquisse dont le remplissage est une ligne le conserve : la surface de cette ligne devient l'icône.

**Une image (PNG ou JPG)** est vectorisée en contour, et l'aperçu affiche ce contour. Sous {{ui:iconTag.part}}, vous choisissez si c'est la partie {{ui:iconTag.part.dark}} ou {{ui:iconTag.part.light}} qui devient l'icône ; au départ, il s'agit de la partie qui n'est pas l'arrière-plan. Les pixels transparents ne font jamais partie de l'icône. Un fichier SVG ne contenant qu'une seule image (comme lorsqu'Inkscape enregistre un bitmap importé) est vectorisé de la même manière. Le contour suit les pixels, de sorte qu'une petite image aura des bords crénelés : les images de quelques centaines de pixels ou plus donnent les meilleurs résultats. {{ui:iconTag.replace}} prend la partie d'une image qui ne constitue pas son arrière-plan.

## Codes QR

Un code QR transforme un texte ou une adresse web en un motif que lit l'appareil photo d'un téléphone : un lien vers votre boutique sur une enseigne, le nom du Wi-Fi sur un sous-verre, un numéro de téléphone sur un porte-clés.

Choisissez {{ui:shape.qrCode}} dans la bibliothèque de formes. Une fenêtre s'ouvre ; le curseur est déjà dans le champ de texte :

- **{{ui:qrCode.text}} :** ce que dit le code. Entrée crée le code, Maj+Entrée commence une nouvelle ligne. Sous le champ, vous voyez la place utilisée ; les lettres accentuées et autres caractères spéciaux prennent deux octets. Quand le texte est trop long, le champ le dit.
- **{{ui:qrCode.errorCorrection}} :** L, M, Q ou H. Un niveau plus élevé reste lisible quand une partie du code est sale ou rayée (L environ 7 %, M 15 %, Q 25 %, H 30 %), mais demande plus de modules pour le même texte, chaque module devient donc plus petit. M est choisi au départ.
- **{{ui:qrCode.style}} :** {{ui:qrCode.style.code}} construit le code seul, haut de 4 mm. {{ui:qrCode.style.raised}} le pose à 1 mm de haut sur une plaque blanche de 3 mm, en lot de deux couleurs, pour qu'une impression multicolore imprime le code foncé et la plaque claire. {{ui:qrCode.style.engraved}} grave le code à 1 mm de profondeur dans la plaque.
- **{{ui:qrCode.sizeBy}} :** saisissez la {{ui:qrCode.sizeBy.width}} du code entier (40 mm au départ) ou la taille d'un module ; l'autre valeur s'affiche dessous. Les modules de moins de 0,8 mm reçoivent un avertissement. C'est une règle empirique pour une buse de 0,4 mm, pas une garantie : imprimante, matériau, couleurs et téléphone jouent tous un rôle.
- **{{ui:qrCode.quietZone}} :** les lecteurs ont besoin d'une marge vide de quatre modules autour du code. Sur une plaque, la marge fait partie de la plaque ; ne la désactivez que si la plaque repose sur une surface claire plus grande. Le code seul n'a pas de marge à lui : laissez la place libre autour.
- **Hauteurs :** la hauteur du code, ou sur une plaque la hauteur du code ou la profondeur de gravure, et l'épaisseur de la plaque.

L'aperçu montre le code tel qu'il sera construit. {{ui:qrCode.ok}} le place au milieu du plateau.

Le code est un corps comme un autre : déplacez-le, tournez-le, redimensionnez-le (gardez la largeur et la profondeur égales, sinon le code est déformé), groupez-le, ou faites-en un trou et groupez-le dans une pièce à vous pour l'y graver. Le redimensionner redimensionne tout le code ; chaque module reste carré.

La carte {{ui:qrCode.title}} en haut de ses réglages contient le texte. Modifiez-le et cliquez sur {{ui:qrCode.regenerate}} : le code est reconstruit là où il est et aussi large qu'il l'est maintenant. Correction d'erreur, zone de silence et construction restent telles qu'elles ont été choisies ; pour d'autres choix, créez un nouveau code depuis la bibliothèque.

Scannez le code avec votre téléphone avant de l'imprimer, puis encore une fois après. Le foncé sur clair se lit le mieux ; un code clair sur une plaque foncée n'est pas lu par tous les téléphones.

## Texte sur un arc de cercle

Le lettrage ne doit-il pas être droit mais suivre le bord d'une pièce de monnaie, d'un couvercle ou d'un anneau ? Pour cela il y a le paramètre {{ui:prop.textCurved}}.

![Le texte suit un cercle. Toutes les lettres se trouvent sur une ligne commune.](shot:curved-text)

Une fois allumé, le texte parcourt le cercle. Toutes les lettres reposent sur la même ligne de base, aussi uniformément qu'avec un texte normal. Il existe quatre paramètres :

- **{{ui:prop.textRadius}}** (5 à 500 mm) : Le rayon du cercle sur lequel s'étend la ligne de base des lettres. Les lettres restent à leur place ; seule leur courbure change.
- **{{ui:nameTag.letterSize}} :** Quelle est la hauteur des lettres. Cela ne dépend plus de la largeur de la forme.
- **{{ui:prop.textInward}} :** Déplace le texte du haut du cercle vers le bas. Les lettres pointent alors la tête vers le centre.
- **{{ui:prop.textFlipped}} :** Retourne uniquement les lettres pour que vous puissiez les lire de l'autre côté. Le texte reste à sa place sur le cercle.

**Le centre du cercle est le centre de la forme.** C'est pourquoi l'alignement fonctionne comme d'habitude : si vous centrez le texte avec un cylindre ou un anneau, il se trouve exactement concentrique par rapport à lui. Lorsque vous tirez sur une poignée, le rayon et la taille des lettres grandissent ensemble, de sorte que le lettrage n'est pas déformé.

> **Conseil :** En haut du cercle, les lettres se trouvent en dehors de la ligne de base ; avec {{ui:prop.textInward}}, ils se tiennent à l'intérieur et se dirigent vers le centre. Pour que le lettrage tienne sur un disque, le rayon plus la taille des lettres doivent être inférieurs au rayon du disque.
