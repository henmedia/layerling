import { LANGUAGE_INFO, type Language } from "@/lib/i18n";
import type { ShapeKind } from "@/types/layerling";

/**
 * The chapters of the user guide (docs/guide) by what they are about, with the
 * file name each language gave them. The pages are static files next to the
 * program, so a link is a plain path. A test compares this table with the
 * chapters on disk - a chapter renamed there without a change here would leave
 * every question mark pointing nowhere.
 */
export const GUIDE_CHAPTERS = {
  start: { de: "erste-schritte", en: "getting-started", nl: "aan-de-slag", ru: "getting-started", cs: "getting-started", sl: "prvi-koraki", hu: "getting-started", es: "getting-started" },
  view: { de: "ansicht-und-arbeitsebene", en: "view-and-workplane", nl: "weergave-en-werkvlak", ru: "view-and-workplane", cs: "view-and-workplane", sl: "pogled-in-delovna-ravnina", hu: "view-and-workplane", es: "view-and-workplane" },
  shapes: { de: "formen", en: "shapes", nl: "vormen", ru: "shapes", cs: "shapes", sl: "oblike", hu: "shapes", es: "shapes" },
  select: { de: "auswaehlen-und-anordnen", en: "select-and-arrange", nl: "selecteren-en-schikken", ru: "select-and-arrange", cs: "select-and-arrange", sl: "izbiranje-in-razporejanje", hu: "select-and-arrange", es: "select-and-arrange" },
  solids: { de: "koerper-und-aussparungen", en: "solids-and-holes", nl: "lichamen-en-gaten", ru: "solids-and-holes", cs: "solids-and-holes", sl: "telesa-in-luknje", hu: "solids-and-holes", es: "solids-and-holes" },
  edges: { de: "kanten-und-aushoehlen", en: "edges-and-hollowing", nl: "randen-en-uithollen", ru: "edges-and-hollowing", cs: "edges-and-hollowing", sl: "robovi-in-izdolbljenje", hu: "edges-and-hollowing", es: "edges-and-hollowing" },
  sketches: { de: "skizzen", en: "sketches", nl: "schetsen", ru: "sketches", cs: "sketches", sl: "skice", hu: "sketches", es: "sketches" },
  text: { de: "text", en: "text", nl: "tekst", ru: "text", cs: "text", sl: "besedilo", hu: "text", es: "text" },
  threads: { de: "gewinde-und-mechanik", en: "threads-and-mechanics", nl: "schroefdraad-en-mechanica", ru: "threads-and-mechanics", cs: "threads-and-mechanics", sl: "navoj", hu: "threads-and-mechanics", es: "threads-and-mechanics" },
  measuring: { de: "messen-und-notizen", en: "measuring-and-notes", nl: "meten-en-notities", ru: "measuring-and-notes", cs: "measuring-and-notes", sl: "merjenje-in-opombe", hu: "measuring-and-notes", es: "measuring-and-notes" },
  printing: { de: "drucken", en: "printing", nl: "printen", ru: "printing", cs: "printing", sl: "tiskanje", hu: "printing", es: "printing" },
  files: { de: "dateien-und-speichern", en: "files-and-saving", nl: "bestanden-en-opslaan", ru: "files-and-saving", cs: "files-and-saving", sl: "datoteke-in-shranjevanje", hu: "files-and-saving", es: "files-and-saving" },
  shortcuts: { de: "tastenkuerzel", en: "shortcuts", nl: "sneltoetsen", ru: "shortcuts", cs: "shortcuts", sl: "bliznjice", hu: "shortcuts", es: "shortcuts" },
  ai: { de: "ki-mit-mcp", en: "ai-with-mcp", nl: "ai-met-mcp", ru: "ai-with-mcp", cs: "ai-with-mcp", sl: "ai-z-mcp", hu: "ai-with-mcp", es: "ai-with-mcp" },
  tablet: { de: "tablet-und-touch", en: "tablet-and-touch", nl: "tablet-en-touch", ru: "tablet-and-touch", cs: "tablet-and-touch", sl: "tablica-in-dotik", hu: "tablet-and-touch", es: "tablet-and-touch" },
  offline: { de: "offline-und-installieren", en: "offline-and-install", nl: "offline-en-installeren", ru: "offline-and-install", cs: "offline-and-install", sl: "offline-in-namestitev", hu: "offline-and-install", es: "offline-and-install" },
} as const satisfies Record<string, { en: string } & Partial<Record<Language, string>>>;

export type GuideChapter = keyof typeof GUIDE_CHAPTERS;

/**
 * Sections inside a chapter that a question mark jumps to directly: the chapter
 * and the id each language's heading gets (slugify in build-guide.mjs). The
 * same test checks every id against the headings on disk.
 */
export const GUIDE_SECTIONS = {
  sectionView: { chapter: "view", de: "ins-innere-schauen-die-schnittansicht", en: "looking-inside-the-section-view", nl: "naar-binnen-kijken-de-doorsnede", ru: "zaglyanut-vnutr-vid-v-razreze", cs: "pohled-dovnitr-rez", sl: "pogled-v-notranjost-prerezni-pogled", hu: "belelatni-a-metszeti-nezet", es: "mirar-por-dentro-la-vista-de-seccion" },
  viewCube: { chapter: "view", de: "der-ansichtswuerfel", en: "the-view-cube", nl: "de-weergavekubus", ru: "kub-orientatsii", cs: "orientacni-krychle", sl: "orientacijska-kocka", hu: "a-nezetkocka", es: "el-cubo-de-vista" },
  cameraBar: { chapter: "view", de: "die-kameraleiste", en: "the-camera-bar", nl: "de-camerabalk", ru: "panel-kamery", cs: "lista-pohledu", sl: "vrstica-kamere", hu: "a-kamerasav", es: "la-barra-de-camara" },
  gridAndSnapping: { chapter: "view", de: "gitter-und-raster", en: "grid-and-snapping", nl: "raster-en-vastklikken", ru: "setka-i-privyazka", cs: "mrizka-a-prichytavani", sl: "mreza-in-pripenjanje", hu: "racs-es-illesztes", es: "cuadricula-y-ajuste" },
  colorCard: { chapter: "shapes", de: "farben-waehlen", en: "choosing-colours", nl: "kleuren-kiezen", ru: "vybor-tsveta", cs: "vyber-barev", es: "elegir-colores" },
  shapeSettings: { chapter: "shapes", de: "die-einstellungen-der-form", en: "the-shape-s-settings", nl: "de-instellingen-van-de-vorm", ru: "nastroyki-figury", cs: "nastaveni-tvaru", sl: "nastavitve-oblike", hu: "az-alakzat-beallitasai", es: "los-ajustes-de-la-forma" },
  wrapCylinder: { chapter: "shapes", de: "um-einen-zylinder-wickeln", en: "wrapping-around-a-cylinder", nl: "om-een-cilinder-wikkelen", ru: "oborachivanie-vokrug-tsilindra", cs: "obtoceni-kolem-valce", sl: "ovijanje-okoli-valja", hu: "hengerre-tekeres", es: "envolver-alrededor-de-un-cilindro" },
  surfaceTexture: { chapter: "shapes", de: "eine-oberflaeche-aufbringen", en: "a-surface-texture", nl: "een-oppervlaktestructuur-aanbrengen", fr: "une-texture-de-surface", ru: "tekstura-poverkhnosti", cs: "povrchova-textura", sl: "povrsinska-tekstura" },
  textFill: { chapter: "text", de: "kontur-silhouette-und-breiter", en: "outline-silhouette-and-wider", nl: "contour-silhouet-en-breder", ru: "kontur-siluet-i-shire", cs: "obrys-silueta-a-rozsireni", sl: "kontura-silhueta-in-sirse", hu: "koervonal-sziluett-es-szelesebb", es: "contorno-silueta-y-mas-ancho" },
  textLayers: { chapter: "text", de: "schichten-und-namensschilder", en: "layers-and-name-tags", nl: "lagen-en-naambordjes", ru: "sloi-i-birki-s-imenem", cs: "vrstvy-a-jmenovky", sl: "plasti-in-napisi-z-imenom", hu: "retegek-es-nevcimkek", es: "capas-y-placas-con-nombre" },
  iconTag: { chapter: "text", de: "symbolschilder", en: "icon-tags", nl: "icoonbordjes", ru: "birki-so-znachkom", cs: "stitky-se-symbolem", sl: "simbolne-oznake", hu: "ikoncimkek", es: "placas-con-icono" },
  qrCode: { chapter: "text", de: "qr-codes", en: "qr-codes", nl: "qr-codes", fr: "codes-qr", ru: "qr-kody", cs: "qr-kody", sl: "kode-qr", hu: "qr-kodok", es: "codigos-qr" },
  myShapes: { chapter: "shapes", de: "eigene-formen", en: "custom-shapes", nl: "eigen-vormen", ru: "sobstvennye-figury", cs: "vlastni-tvary", sl: "oblike-po-meri", hu: "sajat-alakzatok", es: "formas-personalizadas" },
  objectList: { chapter: "select", de: "die-objektliste", en: "the-object-list", nl: "de-objectlijst", ru: "spisok-obektov", cs: "seznam-objektu", sl: "seznam-objektov", hu: "az-objektumlista", es: "la-lista-de-objetos" },
  pattern: { chapter: "select", de: "muster-reihe-und-kreis", en: "patterns-row-and-circle", nl: "patronen-rij-en-cirkel", ru: "massivy-ryad-i-krug", cs: "opakovani-v-rade-a-po-kruznici", sl: "polja-vrsta-in-krog", hu: "ismetles-sor-es-koer", es: "patrones-fila-y-circulo" },
  holePattern: { chapter: "select", de: "lochmuster-auf-einer-flaeche", en: "hole-pattern-on-a-face", nl: "gatenpatroon-op-een-vlak", ru: "massiv-otverstiy-na-grani", cs: "rastr-otvoru-na-plose", sl: "vzorec-lukenj-na-ploskvi", hu: "lyukminta-egy-lapon", es: "patron-de-orificios-en-una-cara" },
  faceTool: { chapter: "select", de: "eine-flaeche-heraus-oder-hineinziehen", en: "pushing-a-face-out-or-in", nl: "een-vlak-naar-buiten-of-naar-binnen-trekken", fr: "tirer-une-face-vers-l-exterieur-ou-l-interieur", ru: "vytyagivanie-grani-naruzhu-ili-vnutr", cs: "vysunuti-plochy-ven-nebo-dovnitr", sl: "vlecenje-ploskve-navzven-ali-navznoter", es: "empujar-una-cara-hacia-fuera-o-hacia-dentro" },
  scaleByPercent: { chapter: "select", de: "um-prozent-skalieren", en: "scaling-by-percent", nl: "schalen-in-procenten", ru: "masshtabirovanie-v-protsentakh", cs: "zmena-velikosti-o-procenta", sl: "povecava-v-odstotkih", hu: "meretezes-szazalekban", es: "escalar-en-porcentaje" },
  selectionProperties: { chapter: "select", de: "mehrere-teile-auf-einmal-aendern", en: "changing-several-parts-at-once", nl: "meerdere-onderdelen-tegelijk-veranderen", ru: "izmenenie-neskolkikh-detaley-srazu", cs: "soucasna-zmena-vice-dilu", sl: "sprememba-vec-delov-naenkrat", hu: "toebb-resz-modositasa-egyszerre", es: "cambiar-varias-piezas-a-la-vez" },
  historyView: { chapter: "select", de: "zurueckschauen-die-verlaufsansicht", en: "looking-back-the-history-view", nl: "terugkijken-de-geschiedenisweergave", ru: "vzglyad-nazad-prosmotr-istorii", cs: "prohlizeni-historie", sl: "pogled-nazaj-pogled-zgodovine", hu: "visszatekintes-az-elozmenynezet", es: "mirar-atras-la-vista-del-historial" },
  grouping: { chapter: "solids", de: "gruppieren", en: "grouping", nl: "groeperen", "pt-br": "agrupando", ru: "gruppirovka", cs: "slouceni", sl: "zdruzevanje-v-skupino", hu: "csoportositas", es: "agrupar" },
  bundling: { chapter: "solids", de: "buendeln", en: "bundling", nl: "bundelen", "pt-br": "criando-conjuntos", ru: "svyazka", cs: "seskupeni", sl: "povezovanje-v-svezenj", hu: "koetegbe-fogas", es: "crear-conjuntos" },
  intersection: { chapter: "solids", de: "schnittmenge", en: "intersection", nl: "doorsnijding", "pt-br": "intersecao", ru: "peresechenie", cs: "prunik", sl: "presek", hu: "metszet", es: "interseccion" },
  splitting: { chapter: "solids", de: "teilen", en: "splitting", nl: "splitsen", "pt-br": "dividindo", ru: "razdelenie", cs: "rozdeleni", sl: "rezanje", hu: "kettevagas", es: "dividir" },
  edgeTreatment: { chapter: "edges", de: "kanten-fasen-und-verrunden", en: "chamfering-and-filleting-edges", nl: "randen-afschuinen-en-afronden", ru: "faska-i-skruglenie-kromok", cs: "zkoseni-a-zaobleni-hran", sl: "posnetje-in-zaokrozitev-robov", hu: "elek-letoerese-es-lekerekitese", es: "achaflanar-y-redondear-aristas" },
  hollowing: { chapter: "edges", de: "koerper-aushoehlen", en: "hollowing-bodies", nl: "lichamen-uithollen", ru: "sozdanie-obolochki", cs: "vytvareni-dutin", sl: "izdolbljenje-teles", hu: "testek-kiueregelese", es: "vaciar-cuerpos" },
  cutOut: { chapter: "solids", de: "koerper-ausschneiden", en: "cutting-one-body-out-of-another", nl: "het-ene-lichaam-uit-het-andere-snijden", "pt-br": "recortando-um-solido-de-outro", ru: "vyrezanie-odnogo-tela-iz-drugogo", cs: "vyriznuti-jednoho-telesa-z-druheho", sl: "izrezovanje-enega-telesa-iz-drugega", hu: "egy-test-kivagasa-egy-masikbol", es: "recortar-un-cuerpo-de-otro", fr: "decouper-un-corps-dans-un-autre" },
  offset: { chapter: "edges", de: "koerper-versetzen", en: "offsetting-bodies", nl: "lichamen-verschuiven", fr: "decaler-des-corps", ru: "smeshchenie-tela", cs: "odsazeni-teles", sl: "odmik-teles", es: "desfasar-cuerpos" },
  deleteFace: { chapter: "edges", de: "flaechen-loeschen", en: "deleting-faces", nl: "vlakken-verwijderen", fr: "supprimer-des-faces", ru: "udalenie-graney", cs: "mazani-ploch", sl: "brisanje-ploskev", es: "eliminar-caras" },
  threads: { chapter: "threads", de: "gewinde", en: "threads", nl: "schroefdraad", ru: "rezba", cs: "zavity", sl: "navoj", hu: "menetek", es: "roscas" },
  gears: { chapter: "threads", de: "zahnraeder", en: "gears", nl: "tandwielen", ru: "shesterni", cs: "ozubena-kola", sl: "zobniki", hu: "fogaskerekek", es: "engranajes" },
  springs: { chapter: "threads", de: "federn", en: "springs", nl: "veren", ru: "pruzhiny", cs: "pruziny", sl: "vzmeti", hu: "rugok", es: "muelles" },
  bentTubes: { chapter: "threads", de: "gebogene-rohre", en: "bent-tubes", nl: "gebogen-buizen", ru: "izognutye-truby", cs: "ohnute-trubky", sl: "ukrivljene-cevi", hu: "hajlitott-csoevek", es: "tubos-curvados" },
  loft: { chapter: "threads", de: "uebergang", en: "loft", nl: "loft", ru: "perekhod", cs: "propojeni-profilu", sl: "prehod", hu: "atmenet", es: "recubrimiento" },
  vase: { chapter: "shapes", de: "eine-vase", en: "a-vase", nl: "een-vaas", fr: "un-vase", ru: "vaza", cs: "vaza", sl: "vaza" },
  gridfinity: { chapter: "threads", de: "gridfinity", en: "gridfinity", nl: "gridfinity", ru: "gridfinity", cs: "gridfinity", sl: "gridfinity", hu: "gridfinity", es: "gridfinity" },
  hinge: { chapter: "threads", de: "scharnier", en: "hinge", nl: "scharnier", ru: "petlya", cs: "pant", sl: "tecaj", hu: "zsaner", es: "bisagra" },
  knurl: { chapter: "threads", de: "raendelung", en: "knurling", nl: "kartel", ru: "nakatka", cs: "ryhovane-uchopy", sl: "narebricenje", hu: "recezes", es: "moleteado" },
  dovetail: { chapter: "threads", de: "schwalbenschwanz", en: "dovetail", nl: "zwaluwstaart", ru: "lastochkin-khvost", cs: "rybinovy-spoj", sl: "lastovicji-rep", hu: "fecskefark", es: "cola-de-milano" },
  teardrop: { chapter: "threads", de: "tropfenbohrung", en: "teardrop-hole", nl: "druppelgat", ru: "kaplevidnoe-otverstie", cs: "kapkovity-otvor", sl: "kapljicna-izvrtina", hu: "csepp-alaku-lyuk", es: "orificio-en-lagrima" },
  screwHoles: { chapter: "threads", de: "stufen-und-senkbohrung", en: "counterbore-and-countersink", nl: "verzinkboring-en-verzinking", ru: "tsekovka-i-zenkovka", cs: "valcove-a-kuzelove-zahloubeni", sl: "stopnicasta-in-udirna-izvrtina", hu: "hengeres-es-kupos-suellyesztes", es: "escariado-y-avellanado" },
  ruler: { chapter: "measuring", de: "das-lineal", en: "the-ruler", nl: "de-liniaal", ru: "lineyka", cs: "pravitko", sl: "ravnilo", hu: "a-vonalzo", es: "la-regla" },
  printer: { chapter: "printing", de: "den-drucker-waehlen", en: "choosing-your-printer", nl: "je-printer-kiezen", "pt-br": "escolhendo-a-sua-impressora", ru: "vybor-printera", cs: "vyber-tiskarny", sl: "izbira-tiskalnika", hu: "a-nyomtatod-kivalasztasa", es: "elegir-tu-impresora" },
  designFolders: { chapter: "files", de: "ordner-fuer-deine-entwuerfe", en: "folders-for-your-designs", nl: "mappen-voor-je-ontwerpen", fr: "des-dossiers-pour-vos-dessins", ru: "papki-dlya-proektov", cs: "slozky-pro-projekty", sl: "mape-za-tvoje-projekte", es: "carpetas-para-tus-disenos" },
  backingUp: { chapter: "files", de: "sichern-und-weitergeben", en: "backing-up-and-passing-on", nl: "back-up-maken-en-doorgeven", ru: "rezervnye-kopii-i-peredacha", cs: "zalohovani-a-predavani", sl: "varnostno-kopiranje-in-deljenje", hu: "biztonsagi-mentes-es-tovabbadas", es: "hacer-copias-de-seguridad-y-compartir" },
  exporting: { chapter: "files", de: "exportieren", en: "exporting", nl: "exporteren", ru: "eksport", cs: "export", sl: "izvoz", hu: "exportalas", es: "exportar" },
  importing: { chapter: "files", de: "importieren", en: "importing", nl: "importeren", ru: "import", cs: "import", sl: "uvoz", hu: "importalas", es: "importar" },
  simplifyMesh: { chapter: "files", de: "ein-importiertes-netz-vereinfachen", en: "simplifying-an-imported-mesh", nl: "een-geimporteerde-mesh-vereenvoudigen", ru: "uproshchenie-importirovannoy-setki", cs: "zjednoduseni-importovane-site", sl: "poenostavitev-uvozene-mreze", hu: "importalt-halo-egyszerusitese", es: "simplificar-una-malla-importada" },
  tapeMeasure: { chapter: "measuring", de: "das-massband", en: "the-tape-measure", nl: "het-meetlint", ru: "ruletka", cs: "mereni-vzdalenosti", sl: "merilni-trak", hu: "a-meroszalag", es: "la-cinta-metrica" },
  notes: { chapter: "measuring", de: "notizen", en: "notes", nl: "notities", ru: "zametki", cs: "poznamky", sl: "opombe", hu: "jegyzetek", es: "notas" },
  sketchCorners: { chapter: "sketches", de: "ecken-runden-oder-fasen", en: "rounding-or-chamfering-corners", nl: "hoeken-afronden-of-afschuinen", ru: "skruglenie-i-faska-na-uglakh", cs: "zaobleni-a-zkoseni-rohu", sl: "zaokrozevanje-ali-posnetje-vogalov", hu: "sarkok-lekerekitese-vagy-letoerese", es: "redondear-o-achaflanar-esquinas" },
  sketchImage: { chapter: "sketches", de: "ein-bild-als-vorlage", en: "a-picture-as-template", nl: "een-afbeelding-als-sjabloon", ru: "kartinka-kak-podlozhka", cs: "obrazek-jako-predloha", sl: "slika-kot-predloga", hu: "kep-mint-minta", es: "una-imagen-como-plantilla" },
  sketchStroke: { chapter: "sketches", de: "als-kontur-bauen", en: "building-as-a-stroke", nl: "als-lijn-opbouwen", ru: "postroenie-obvodkoy", cs: "teleso-z-rozsirene-cary", sl: "gradnja-kot-kontura", hu: "vonalkent-epites", es: "construir-como-trazo" },
  customFonts: { chapter: "text", de: "eigene-schriften", en: "your-own-fonts", nl: "je-eigen-lettertypen", ru: "svoi-shrifty", cs: "vlastni-pisma", sl: "lastne-pisave", hu: "sajat-betutipusok", es: "tus-fuentes" },
  sketchFill: { chapter: "sketches", de: "fuellung-und-silhouette", en: "fill-and-silhouette", nl: "vulling-en-silhouet", ru: "zalivka-i-siluet", cs: "vypln-a-silueta", sl: "polnilo-in-silhueta", hu: "kitoeltes-es-sziluett", es: "relleno-y-silueta" },
  sketchDrawing: { chapter: "sketches", de: "zeichnen", en: "drawing", nl: "tekenen", ru: "risovanie", cs: "kresleni", sl: "risanje", hu: "rajzolas", es: "dibujar" },
  sketchSweep: { chapter: "sketches", de: "entlang-eines-pfades-ziehen", en: "sweeping-along-a-path", nl: "langs-een-pad-trekken", fr: "balayer-le-long-d-un-chemin", ru: "protyagivanie-vdol-traektorii", cs: "protazeni-podel-drahy", sl: "vleka-vzdolz-poti", es: "barrer-a-lo-largo-de-una-trayectoria" },
  sketchToBody: { chapter: "sketches", de: "ein-koerper-daraus-machen", en: "making-a-body-from-it", nl: "er-een-lichaam-van-maken", ru: "kak-sdelat-iz-nego-telo", cs: "vytvoreni-telesa", sl: "iz-tega-narediti-telo", hu: "test-keszitese-belole", es: "convertirlo-en-un-cuerpo" },
  addShape: { chapter: "shapes", de: "eine-form-hinzufuegen", en: "adding-a-shape", nl: "een-vorm-toevoegen", ru: "dobavlenie-figury", cs: "pridani-tvaru", sl: "dodaj-obliko", hu: "alakzat-hozzaadasa", es: "anadir-una-forma" },
  rotating: { chapter: "select", cs: "otaceni-a-stred-otaceni", da: "rotation-og-indstilling-af-rotationspunkt", de: "drehen-und-den-drehpunkt-setzen", en: "rotating-and-setting-the-pivot", es: "girar-y-fijar-el-punto-de-giro", fr: "rotation-et-reglage-du-pivot", hu: "forgatas-es-a-forgatasi-pont-megadasa", nl: "draaien-en-het-draaipunt-instellen", pl: "obracanie-i-ustawianie-punktu-obrotu", ru: "vrashchenie-i-tsentr-vrashcheniya", sl: "vrtenje-in-postavitev-vrtisca" },
  selecting: { chapter: "select", de: "auswaehlen", en: "selecting", nl: "selecteren", ru: "vydelenie", cs: "vyber", sl: "izbiranje", hu: "kijeloeles", es: "seleccionar" },
  layFlat: { chapter: "select", de: "auf-eine-flaeche-legen", en: "laying-flat-on-a-face", nl: "plat-op-een-vlak-leggen", ru: "ukladka-na-gran", cs: "polozeni-na-plochu", sl: "polaganje-na-ploskev", hu: "lapra-fektetes", es: "apoyar-sobre-una-cara" },
  referencePoints: { chapter: "measuring", de: "bezugspunkte", en: "reference-points", nl: "referentiepunten", ru: "opornye-tochki", cs: "referencni-body", sl: "referencne-tocke", hu: "referenciapontok", es: "puntos-de-referencia" },
  referenceImage: { chapter: "measuring", de: "referenzbilder", en: "reference-images", nl: "referentieafbeeldingen", fr: "images-de-reference", ru: "etalonnye-izobrazheniya", cs: "referencni-obrazky", sl: "referencne-slike", hu: "mintakepek", es: "imagenes-de-referencia" },
  addingText: { chapter: "text", de: "text-hinzufuegen", en: "adding-text", nl: "tekst-toevoegen", ru: "dobavlenie-teksta", cs: "vlozeni-textu", sl: "dodajanje-besedila", hu: "szoeveg-hozzaadasa", es: "anadir-texto" },
  sketchMirror: { chapter: "sketches", de: "spiegeln", en: "mirroring", nl: "spiegelen", fr: "symetrie", ru: "zerkalnoe-otrazhenie", cs: "zrcadleni", sl: "zrcaljenje", hu: "tuekroezes", pl: "odbicie-lustrzane", da: "spejling", es: "reflejar" },
  sketchCurve: { chapter: "sketches", de: "eine-gerade-seite-kruemmen", en: "curving-a-straight-side", nl: "een-rechte-zijde-buigen", ru: "izgib-pryamoy-storony", cs: "prohnuti-prime-strany", sl: "ukrivljanje-ravne-stranice", hu: "egyenes-oldal-goerbitese", es: "curvar-un-lado-recto" },
  commandSearch: { chapter: "shortcuts", de: "befehlssuche", en: "command-search", nl: "opdrachten-zoeken", "pt-br": "pesquisa-de-comandos", ru: "poisk-komand", cs: "vyhledavani-prikazu", sl: "iskanje-ukazov", hu: "parancskereso", es: "busqueda-de-comandos" },
  interactiveHelp: { chapter: "shortcuts", de: "interaktive-hilfe", en: "interactive-help", nl: "interactieve-hulp", "pt-br": "ajuda-interativa", fr: "aide-interactive", ru: "interaktivnaya-spravka", cs: "interaktivni-napoveda", sl: "interaktivna-pomoc", es: "ayuda-interactiva" },
  whatsNew: { chapter: "start", "pt-pt": "novidades-desde-a-tua-ultima-visita", de: "neu-seit-deinem-letzten-besuch", en: "new-since-your-last-visit", nl: "nieuw-sinds-je-laatste-bezoek", "pt-br": "novidades-desde-a-sua-ultima-visita", ru: "novoe-s-vashego-poslednego-vizita", cs: "novinky-od-posledni-navstevy", sl: "novo-od-tvojega-zadnjega-obiska", hu: "ujdonsagok-a-legutobbi-latogatasod-ota", es: "novedades-desde-tu-ultima-visita" },
} as const satisfies Record<string, { chapter: GuideChapter; en: string } & Partial<Record<Language, string>>>;

export type GuideSection = keyof typeof GUIDE_SECTIONS;

/** The address of a chapter or one of its sections, or of the guide's overview when neither is named. */
export function guideHref(language: Language, chapter?: GuideChapter, section?: GuideSection): string {
  const directory = LANGUAGE_INFO[language].guideDir;
  const target = section ? GUIDE_SECTIONS[section] : null;
  const page = target?.chapter ?? chapter;
  if (!page) return `/${directory}/index.html`;
  // A language without names of its own in the tables above names its chapters like the English
  // ones, and a chapter it has not translated shows the English text under that same name.
  const chapterSlug = (GUIDE_CHAPTERS[page] as { en: string } & Partial<Record<Language, string>>)[language] ?? GUIDE_CHAPTERS[page].en;
  const anchor = target ? (target as { en: string } & Partial<Record<Language, string>>)[language] ?? target.en : null;
  return `/${directory}/${chapterSlug}.html${anchor ? `#${anchor}` : ""}`;
}

/**
 * Where in its chapter a shape is explained - the heading its question mark
 * jumps to. Text and sketches have a chapter of their own and open its top.
 */
type GuideShape = {
  kind: ShapeKind;
  groupedShapes?: readonly unknown[];
  groupOperation?: string;
  sketchProfile?: unknown;
  sketchOperation?: string;
  importedMesh?: { sourceFormat?: string };
  layeredText?: boolean;
  layeredIcon?: boolean;
  qrCode?: unknown;
  imagePlate?: unknown;
};

export function guideSectionForShape(shape: GuideShape): GuideSection | undefined {
  // A name tag (#215) is a bundle, but its panel is explained with the text.
  if (shape.layeredText && shape.groupedShapes?.length) return "textLayers";
  // An icon tag is a bundle too; its card is explained next to the name tag.
  if (shape.layeredIcon && shape.groupedShapes?.length) return "iconTag";
  // A QR code (#553), alone or on its plate, is explained with the texts and tags.
  if (shape.qrCode) return "qrCode";
  // A reference image (#680) is explained with the other measuring aids.
  if (shape.imagePlate) return "referenceImage";
  if (shape.groupedShapes?.length) {
    if (shape.groupOperation === "bundle") return "bundling";
    if (shape.groupOperation === "intersection" || shape.groupOperation === "hull") return "intersection";
    return "grouping";
  }
  // A body made from a sketch, or a file brought in, is explained where it was made.
  // An extruded one shows its fill in the properties (#197); a revolved one, how it was made.
  if (shape.sketchProfile) return shape.sketchOperation === "revolve" ? "sketchToBody" : shape.sketchOperation === "sweep" ? "sketchSweep" : "sketchFill";
  if (shape.kind === "mesh" && shape.importedMesh && shape.importedMesh.sourceFormat !== "json") return "importing";
  switch (shape.kind) {
    case "text":
      return "addingText";
    case "sketch":
    case "scribble":
      return "sketchToBody";
    case "thread":
      return "threads";
    case "gear":
      return "gears";
    case "spring":
      return "springs";
    case "bentTube":
      return "bentTubes";
    case "loft":
      return "loft";
    case "vase":
      return "vase";
    case "honeycomb":
      // No longer a shape of its own: the hole pattern tool took its place (#223).
      return "holePattern";
    case "gridfinity":
      return "gridfinity";
    case "hinge":
      return "hinge";
    case "knurl":
      return "knurl";
    case "dovetail":
      return "dovetail";
    case "teardrop":
      return "teardrop";
    case "counterbore":
    case "countersink":
    case "doubleCountersink":
      return "screwHoles";
    case "ruler":
      return "ruler";
    default:
      return "shapeSettings";
  }
}

/** Which chapter explains a shape - the one its question mark opens. */
export function guideChapterForShape(shape: GuideShape): GuideChapter {
  // The chapter always matches the section the question mark jumps to.
  const section = guideSectionForShape(shape);
  if (section) return GUIDE_SECTIONS[section].chapter;
  if (shape.groupedShapes?.length) return "solids";
  switch (shape.kind) {
    case "text":
      return "text";
    case "thread":
    case "spring":
    case "gear":
    case "bentTube":
    case "loft":
    case "gridfinity":
    case "hinge":
    case "knurl":
    case "dovetail":
    case "teardrop":
    case "counterbore":
    case "countersink":
    case "doubleCountersink":
      return "threads";
    case "ruler":
      return "measuring";
    case "sketch":
    case "scribble":
      return "sketches";
    default:
      return "shapes";
  }
}
