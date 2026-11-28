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
  threads: { de: "gewinde-und-mechanik", en: "threads-and-mechanics", nl: "schroefdraad-en-mechanica", ru: "threads-and-mechanics", cs: "threads-and-mechanics", sl: "navoji-in-mehanika", hu: "threads-and-mechanics", es: "threads-and-mechanics" },
  measuring: { de: "messen-und-notizen", en: "measuring-and-notes", nl: "meten-en-notities", ru: "measuring-and-notes", cs: "measuring-and-notes", sl: "merjenje-in-opombe", hu: "measuring-and-notes", es: "measuring-and-notes" },
  printing: { de: "drucken", en: "printing", nl: "printen", ru: "printing", cs: "printing", sl: "tiskanje", hu: "printing", es: "printing" },
  files: { de: "dateien-und-speichern", en: "files-and-saving", nl: "bestanden-en-opslaan", ru: "files-and-saving", cs: "files-and-saving", sl: "datoteke-in-shranjevanje", hu: "files-and-saving", es: "files-and-saving" },
  shortcuts: { de: "tastenkuerzel", en: "shortcuts", nl: "sneltoetsen", ru: "shortcuts", cs: "shortcuts", sl: "bliznjice", hu: "shortcuts", es: "shortcuts" },
  ai: { de: "ki-mit-mcp", en: "ai-with-mcp", nl: "ai-met-mcp", ru: "ai-with-mcp", cs: "ai-with-mcp", sl: "ai-z-mcp", hu: "ai-with-mcp", es: "ai-with-mcp" },
  tablet: { de: "tablet-und-touch", en: "tablet-and-touch", nl: "tablet-en-touch", ru: "tablet-and-touch", cs: "tablet-and-touch", sl: "tablica-in-dotik", hu: "tablet-and-touch", es: "tablet-and-touch" },
  offline: { de: "offline-und-installieren", en: "offline-and-install", nl: "offline-en-installeren", ru: "offline-and-install", cs: "offline-and-install", sl: "offline-in-namestitev", hu: "offline-and-install", es: "offline-and-install" },
  // Frequent questions, each answered in a few sentences with the way into the chapters.
  faq: { de: "haeufige-fragen", en: "faq", cs: "faq", es: "faq", hu: "faq", nl: "veelgestelde-vragen", ru: "faq", sl: "pogosta-vprasanja" },
} as const satisfies Record<string, { en: string } & Partial<Record<Language, string>>>;

export type GuideChapter = keyof typeof GUIDE_CHAPTERS;

/**
 * Sections inside a chapter that a question mark jumps to directly: the chapter
 * and the id each language's heading gets (slugify in build-guide.mjs). The
 * same test checks every id against the headings on disk.
 */
export const GUIDE_SECTIONS = {
  sectionView: { chapter: "view", "pt-pt": "observar-o-interior-a-vista-em-corte", de: "ins-innere-schauen-die-schnittansicht", en: "looking-inside-the-section-view", nl: "naar-binnen-kijken-de-doorsnede", ru: "zaglyanut-vnutr-vid-v-razreze", cs: "pohled-dovnitr-rez", sl: "pogled-v-notranjost-prerezni-pogled", hu: "belelatni-a-metszeti-nezet", es: "mirar-por-dentro-la-vista-de-seccion", sv: "titta-inuti-snittvyn" },
  viewCube: { chapter: "view", "pt-pt": "o-cubo-de-vistas", de: "der-ansichtswuerfel", en: "the-view-cube", nl: "de-weergavekubus", ru: "kub-orientatsii", cs: "orientacni-krychle", sl: "orientacijska-kocka", hu: "a-nezetkocka", es: "el-cubo-de-vista", sv: "vykuben" },
  cameraBar: { chapter: "view", "pt-pt": "a-barra-de-vistas", de: "die-ansichtsleiste", en: "the-view-bar", nl: "de-weergavebalk", ru: "panel-vida", cs: "lista-pohledu", sl: "vrstica-pogleda", hu: "a-nezetsav", es: "la-barra-de-vista", sv: "vyfaeltet" },
  detailLevel: { chapter: "view", en: "detail-level", de: "detailgrad", ar: "detail-level", cs: "uroven-detailu", da: "detaljeniveau", es: "nivel-de-detalle", fr: "niveau-de-detail", hu: "reszletesseg", it: "livello-di-dettaglio", nl: "detailniveau", pl: "poziom-szczegolow", "pt-pt": "nivel-de-detalhe", ru: "uroven-detalizatsii", sl: "raven-podrobnosti", sv: "detaljniva" },
  buildPlates: { chapter: "view", "pt-pt": "bases-de-impressao", de: "druckplatten", en: "build-plates", nl: "bouwplaten", ru: "stoly-pechati", cs: "tiskove-podlozky", sl: "tiskalne-plosce", hu: "nyomtatotalcak", es: "placas-de-impresion", fr: "plateaux-d-impression", it: "piatti-di-stampa", pl: "stoly-robocze", da: "byggeplader", ar: "build-plates", sv: "byggplattor" },
  gridAndSnapping: { chapter: "view", "pt-pt": "grelha-e-ajuste", de: "gitter-und-raster", en: "grid-and-snapping", nl: "raster-en-vastklikken", ru: "setka-i-privyazka", cs: "mrizka-a-prichytavani", sl: "mreza-in-pripenjanje", hu: "racs-es-illesztes", es: "cuadricula-y-ajuste", sv: "rutnaet-och-faestning" },
  // The tabs of the settings window. Languages whose chapter explains the window in one go, under
  // "Grid and snapping", land there.
  settingsSearch: { chapter: "view", ar: "the-settings-window", cs: "okno-nastaveni", da: "indstillingsvinduet", de: "das-einstellungsfenster", en: "the-settings-window", es: "la-ventana-de-ajustes", fr: "la-fenetre-des-reglages", hu: "a-beallitasok-ablaka", it: "la-finestra-delle-impostazioni", nl: "het-instellingenvenster", pl: "okno-ustawien", "pt-pt": "a-janela-de-definicoes", ru: "okno-nastroek", sl: "okno-nastavitev", sv: "instaellningsfoenstret" },
  settingsAppearance: { chapter: "view", ar: "appearance-theme-and-view-cube", cs: "vzhled-motiv-a-krychle", da: "udseende-tema-og-visningskube", de: "darstellung-thema-und-ansichtswuerfel", en: "appearance-theme-and-view-cube", es: "aspecto-tema-y-cubo-de-vista", fr: "apparence-theme-et-cube-de-vue", hu: "megjelenes-tema-es-nezetkocka", it: "aspetto-tema-e-cubo-di-visualizzazione", nl: "weergave-thema-en-kubus", pl: "wyglad-motyw-i-kostka-widoku", "pt-pt": "aspeto-tema-e-cubo-de-vistas", ru: "vneshniy-vid-tema-i-kub", sl: "videz-tema-in-kocka", sv: "utseende-tema-och-vykub" },
  // Controls: the mouse and the camera.
  settingsControls: { chapter: "view", ar: "controls-mouse-and-camera", cs: "ovladani-mys-a-kamera", da: "betjening-mus-og-kamera", de: "bedienung-maus-und-kamera", en: "controls-mouse-and-camera", es: "controles-raton-y-camara", fr: "commandes-souris-et-camera", hu: "kezeles-eger-es-kamera", it: "comandi-mouse-e-telecamera", nl: "bediening-muis-en-camera", pl: "sterowanie-mysz-i-kamera", "pt-pt": "controlos-rato-e-camara", ru: "upravlenie-mysh-i-kamera", sl: "upravljanje-miska-in-kamera", sv: "styrning-mus-och-kamera" },
  // Appearance: the view - start view, scrollbars, view bar, the message after each step (#1708).
  settingsView: { chapter: "view", "pt-pt": "aspeto-a-vista", de: "darstellung-die-ansicht", en: "appearance-the-view", nl: "weergave-het-beeld", ru: "vneshniy-vid-vid", cs: "vzhled-pohled", sl: "videz-pogled", hu: "megjelenes-a-nezet", es: "aspecto-la-vista", fr: "apparence-la-vue", it: "aspetto-vista", pl: "wyglad-widok", da: "udseende-visningen", ar: "appearance-the-view", sv: "utseende-vyn" },
  ribbonButtons: { chapter: "view", ar: "ribbon-size-and-buttons", cs: "pas-nastroju-velikost-a-tlacitka", da: "band-st-rrelse-og-knapper", de: "menueband-groesse-und-knoepfe", en: "ribbon-size-and-buttons", es: "cinta-tamano-y-botones", fr: "ruban-taille-et-boutons", hu: "szalag-meret-es-gombok", it: "barra-dimensione-e-pulsanti", nl: "lint-grootte-en-knoppen", pl: "wstazka-rozmiar-i-przyciski", "pt-pt": "faixa-de-ferramentas-tamanho-e-botoes", ru: "lenta-razmer-i-knopki", sl: "orodna-vrstica-velikost-in-gumbi", sv: "verktygsfaelt-storlek-och-knappar" },
  settingsMeasurement: { chapter: "view", ar: "measurement-units-scale-and-snap-steps", cs: "mereni-jednotky-meritko-a-kroky-prichytavani", da: "mal-enheder-skala-og-snap-trin", de: "masse-einheiten-massstab-und-rasterschritte", en: "measurement-units-scale-and-snap-steps", es: "medidas-unidades-escala-y-pasos-de-ajuste", fr: "mesure-unites-echelle-et-pas-d-accrochage", hu: "meres-mertekegysegek-leptek-es-illesztesi-lepesek", it: "misurazione-unita-scala-e-passi-di-aggancio", nl: "maten-eenheden-schaal-en-snapstappen", pl: "pomiary-jednostki-skala-i-kroki-przyciagania", "pt-pt": "medicao-unidades-escala-e-passos-de-ajuste", ru: "izmereniya-edinitsy-masshtab-i-shagi-privyazki", sl: "merjenje-enote-merilo-in-koraki-pripenjanja", sv: "matt-enheter-skala-och-faeststeg" },
  settingsWorkplane: { chapter: "view", ar: "workplane-plate-and-printer", cs: "pracovni-rovina-podlozka-a-tiskarna", da: "arbejdsplan-plade-og-printer", de: "arbeitsebene-platte-und-drucker", en: "workplane-plate-and-printer", es: "plano-de-trabajo-placa-e-impresora", fr: "plan-de-travail-plateau-et-imprimante", hu: "munkasik-targyasztal-es-nyomtato", it: "piano-di-lavoro-piastra-e-stampante", nl: "werkvlak-plaat-en-printer", pl: "plaszczyzna-robocza-plyta-i-drukarka", "pt-pt": "plano-de-trabalho-base-e-impressora", ru: "rabochaya-ploskost-stol-i-printer", sl: "delovna-ravnina-plosca-in-tiskalnik", sv: "arbetsyta-platta-och-skrivare" },
  colorCard: { chapter: "shapes", de: "farben-waehlen", en: "choosing-colours", nl: "kleuren-kiezen", ru: "vybor-tsveta", cs: "vyber-barev", es: "elegir-colores", sv: "vaelja-faerger" },
  shapeSettings: { chapter: "shapes", de: "die-einstellungen-der-form", en: "the-shape-s-settings", nl: "de-instellingen-van-de-vorm", ru: "nastroyki-figury", cs: "nastaveni-tvaru", sl: "nastavitve-oblike", hu: "az-alakzat-beallitasai", es: "los-ajustes-de-la-forma", sv: "formens-instaellningar" },
  wrapCylinder: { chapter: "shapes", de: "um-einen-zylinder-wickeln", en: "wrapping-around-a-cylinder", nl: "om-een-cilinder-wikkelen", ru: "oborachivanie-vokrug-tsilindra", cs: "obtoceni-kolem-valce", sl: "ovijanje-okoli-valja", hu: "hengerre-tekeres", es: "envolver-alrededor-de-un-cilindro", sv: "svepa-runt-en-cylinder" },
  paint: { chapter: "shapes", en: "painting-in-several-colours", de: "in-mehreren-farben-bemalen", fr: "peindre-en-plusieurs-couleurs", nl: "in-meerdere-kleuren-beschilderen", ru: "raskraska-v-neskolko-tsvetov", cs: "malovani-vice-barvami", sl: "barvanje-v-vec-barvah", da: "mal-i-flere-farver", es: "pintar-en-varios-colores", it: "dipingere-in-piu-colori", pl: "malowanie-w-wielu-kolorach", ar: "painting-in-several-colours", hu: "festes-toebb-szinben", sv: "mala-i-flera-faerger" },
  surfaceTexture: { chapter: "shapes", de: "eine-oberflaeche-aufbringen", en: "a-surface-texture", nl: "een-oppervlaktestructuur-aanbrengen", fr: "une-texture-de-surface", ru: "tekstura-poverkhnosti", cs: "povrchova-textura", sl: "povrsinska-tekstura", es: "una-textura-de-superficie", sv: "en-ytstruktur" },
  stencilBridges: { chapter: "text", de: "schablonen-stege-fuer-die-mitte-von-buchstaben", en: "stencils-bridges-for-the-middle-of-letters", ar: "stencils-bridges-for-the-middle-of-letters", fr: "pochoirs-des-ponts-pour-le-centre-des-lettres", es: "plantillas-puentes-para-el-centro-de-las-letras", it: "stencil-ponticelli-per-il-centro-delle-lettere", nl: "stencils-bruggen-voor-het-midden-van-letters", pl: "szablony-mostki-dla-srodka-liter", cs: "sablony-mustky-pro-stred-pismen", da: "stenciler-broer-til-midten-af-bogstaver", hu: "sablonok-hidak-a-betuk-koezepehez", ru: "trafarety-peremychki-dlya-serediny-bukv", sl: "sablone-mosticki-za-sredino-crk", sv: "schabloner-bryggor-foer-bokstaevers-mittdelar" },
  textFill: { chapter: "text", de: "kontur-silhouette-und-breiter", en: "outline-silhouette-and-wider", nl: "contour-silhouet-en-breder", ru: "kontur-siluet-i-shire", cs: "obrys-silueta-a-rozsireni", sl: "kontura-silhueta-in-sirse", hu: "koervonal-sziluett-es-szelesebb", es: "contorno-silueta-y-mas-ancho", sv: "kontur-siluett-och-bredare" },
  textLayers: { chapter: "text", de: "schichten-und-namensschilder", en: "layers-and-name-tags", nl: "lagen-en-naambordjes", ru: "sloi-i-birki-s-imenem", cs: "vrstvy-a-jmenovky", sl: "plasti-in-napisi-z-imenom", hu: "retegek-es-nevcimkek", es: "capas-y-placas-con-nombre", sv: "lager-och-namnskyltar" },
  iconTag: { chapter: "text", de: "symbolschilder", en: "icon-tags", nl: "icoonbordjes", ru: "birki-so-znachkom", cs: "stitky-se-symbolem", sl: "simbolne-oznake", hu: "ikoncimkek", es: "placas-con-icono", sv: "ikonskyltar" },
  qrCode: { chapter: "text", de: "qr-codes", en: "qr-codes", nl: "qr-codes", fr: "codes-qr", ru: "qr-kody", cs: "qr-kody", sl: "kode-qr", hu: "qr-kodok", es: "codigos-qr", sv: "qr-koder" },
  myShapes: { chapter: "shapes", de: "eigene-formen", en: "custom-shapes", nl: "eigen-vormen", ru: "sobstvennye-figury", cs: "vlastni-tvary", sl: "oblike-po-meri", hu: "sajat-alakzatok", es: "formas-personalizadas", sv: "egna-former" },
  objectList: { chapter: "select", de: "die-objektliste", en: "the-object-list", nl: "de-objectlijst", ru: "spisok-obektov", cs: "seznam-objektu", sl: "seznam-objektov", hu: "az-objektumlista", es: "la-lista-de-objetos", sv: "objektlistan" },
  pattern: { chapter: "select", de: "muster-reihe-und-kreis", en: "patterns-row-and-circle", nl: "patronen-rij-en-cirkel", ru: "massivy-ryad-i-krug", cs: "opakovani-v-rade-a-po-kruznici", sl: "polja-vrsta-in-krog", hu: "ismetles-sor-es-koer", es: "patrones-fila-y-circulo", sv: "moenster-rad-och-cirkel" },
  holePattern: { chapter: "select", de: "lochmuster-auf-einer-flaeche", en: "hole-pattern-on-a-face", nl: "gatenpatroon-op-een-vlak", ru: "massiv-otverstiy-na-grani", cs: "rastr-otvoru-na-plose", sl: "vzorec-lukenj-na-ploskvi", hu: "lyukminta-egy-lapon", es: "patron-de-orificios-en-una-cara", sv: "halmoenster-pa-en-yta" },
  threadInsert: { chapter: "select", de: "loch-fuer-einen-gewindeeinsatz", en: "hole-for-a-thread-insert", nl: "gat-voor-een-draadinzet", ru: "otverstie-pod-rezbovuyu-vstavku", cs: "otvor-pro-zavitovou-vlozku", sl: "luknja-za-navojno-vlozko", es: "orificio-para-un-inserto-roscado", sv: "hal-foer-en-gaenginsats", fr: "trou-pour-un-insert-filete", it: "foro-per-un-inserto-filettato", da: "hul-til-en-gevindindsats", pl: "otwor-pod-wkladke-gwintowa", hu: "lyuk-menetes-betethez" },
  magnetPocket: { chapter: "select", de: "magnet-tasche", en: "magnet-pocket", nl: "magneetkamer", ru: "gnezdo-pod-magnit", cs: "kapsa-na-magnet", sl: "lezisce-za-magnet", es: "alojamiento-para-iman", sv: "magnetficka", fr: "logement-d-aimant", it: "sede-per-magnete", da: "magnetlomme", pl: "gniazdo-na-magnes", hu: "magnesfeszek" },
  faceTool: { chapter: "select", de: "eine-flaeche-heraus-oder-hineinziehen", en: "pushing-a-face-out-or-in", nl: "een-vlak-naar-buiten-of-naar-binnen-trekken", fr: "tirer-une-face-vers-l-exterieur-ou-l-interieur", ru: "vytyagivanie-grani-naruzhu-ili-vnutr", cs: "vysunuti-plochy-ven-nebo-dovnitr", sl: "vlecenje-ploskve-navzven-ali-navznoter", es: "empujar-una-cara-hacia-fuera-o-hacia-dentro", sv: "dra-ut-eller-trycka-in-en-yta" },
  alignSpread: { chapter: "select", de: "gleiche-abstaende", en: "equal-gaps", fr: "espacement-egal", es: "espaciado-igual", it: "spaziatura-uguale", nl: "gelijke-tussenruimte", da: "lige-store-mellemrum", pl: "rowne-odstepy", cs: "stejne-mezery", sl: "enaki-razmiki", hu: "egyenlo-koezoek", ru: "ravnye-promezhutki", sv: "lika-mellanrum" },
  scaleByPercent: { chapter: "select", de: "um-prozent-skalieren", en: "scaling-by-percent", nl: "schalen-in-procenten", ru: "masshtabirovanie-v-protsentakh", cs: "zmena-velikosti-o-procenta", sl: "povecava-v-odstotkih", hu: "meretezes-szazalekban", es: "escalar-en-porcentaje", sv: "skala-i-procent" },
  selectionProperties: { chapter: "select", de: "mehrere-teile-auf-einmal-aendern", en: "changing-several-parts-at-once", nl: "meerdere-onderdelen-tegelijk-veranderen", ru: "izmenenie-neskolkikh-detaley-srazu", cs: "soucasna-zmena-vice-dilu", sl: "sprememba-vec-delov-naenkrat", hu: "toebb-resz-modositasa-egyszerre", es: "cambiar-varias-piezas-a-la-vez", sv: "aendra-flera-delar-pa-en-gang" },
  historyView: { chapter: "select", de: "zurueckschauen-die-verlaufsansicht", en: "looking-back-the-history-view", nl: "terugkijken-de-geschiedenisweergave", ru: "vzglyad-nazad-prosmotr-istorii", cs: "prohlizeni-historie", sl: "pogled-nazaj-pogled-zgodovine", hu: "visszatekintes-az-elozmenynezet", es: "mirar-atras-la-vista-del-historial", sv: "se-bakat-historikvyn" },
  grouping: { chapter: "solids", de: "gruppieren", en: "grouping", nl: "groeperen", "pt-br": "agrupando", ru: "gruppirovka", cs: "slouceni", sl: "zdruzevanje-v-skupino", hu: "csoportositas", es: "agrupar", sv: "gruppera" },
  groupResize: { chapter: "solids", "pt-br": "agrupando", de: "groesse-aendern-aussparungen-und-kleine-teile-behalten", en: "resizing-a-group-keeping-holes-and-small-parts", nl: "een-groep-van-formaat-veranderen-gaten-en-kleine-onderdelen-behouden", fr: "redimensionner-un-groupe-garder-trous-et-petites-pieces", ru: "izmenenie-razmera-gruppy-otverstiya-i-melkie-detali-sokhranyayutsya", cs: "zmena-velikosti-slouceni-vyrezy-a-male-dily-zustanou", sl: "spreminjanje-velikosti-skupine-luknje-in-majhni-deli-ostanejo", da: "ndre-st-rrelse-pa-en-gruppe-huller-og-sma-dele-bevares", hu: "csoport-atmeretezese-a-lyukak-es-kis-reszek-megmaradnak", es: "cambiar-el-tamano-de-un-grupo-mantener-orificios-y-piezas-pequenas", it: "ridimensionare-un-gruppo-mantenere-fori-e-parti-piccole", pl: "zmiana-rozmiaru-grupy-otwory-i-male-czesci-zostaja", sv: "aendra-storlek-pa-en-grupp-behalla-hal-och-sma-delar" },
  bundling: { chapter: "solids", de: "buendeln", en: "bundling", nl: "bundelen", "pt-br": "criando-conjuntos", ru: "svyazka", cs: "seskupeni", sl: "povezovanje-v-svezenj", hu: "koetegbe-fogas", es: "crear-conjuntos", sv: "bunta" },
  intersection: { chapter: "solids", de: "schnittmenge", en: "intersection", nl: "doorsnijding", "pt-br": "intersecao", ru: "peresechenie", cs: "prunik", sl: "presek", hu: "metszet", es: "interseccion", sv: "snitt" },
  splitting: { chapter: "solids", de: "teilen", en: "splitting", nl: "splitsen", "pt-br": "dividindo", ru: "razdelenie", cs: "rozdeleni", sl: "rezanje", hu: "kettevagas", es: "dividir", sv: "dela" },
  edgeTreatment: { chapter: "edges", de: "kanten-fasen-und-verrunden", en: "chamfering-and-filleting-edges", nl: "randen-afschuinen-en-afronden", ru: "faska-i-skruglenie-kromok", cs: "zkoseni-a-zaobleni-hran", sl: "posnetje-in-zaokrozitev-robov", hu: "elek-letoerese-es-lekerekitese", es: "achaflanar-y-redondear-aristas", sv: "fasa-och-avrunda-kanter" },
  hollowing: { chapter: "edges", de: "koerper-aushoehlen", en: "hollowing-bodies", nl: "lichamen-uithollen", ru: "sozdanie-obolochki", cs: "vytvareni-dutin", sl: "izdolbljenje-teles", hu: "testek-kiueregelese", es: "vaciar-cuerpos", sv: "groepa-ur-kroppar" },
  lid: { chapter: "edges", de: "ein-deckel-fuer-einen-offenen-koerper", en: "a-lid-for-an-open-body", nl: "een-deksel-voor-een-open-vorm", fr: "un-couvercle-pour-un-corps-ouvert", ru: "kryshka-dlya-otkrytogo-tela", cs: "viko-pro-otevrene-teleso", sl: "pokrov-za-odprto-telo", hu: "fedel-nyitott-testhez", es: "una-tapa-para-un-cuerpo-abierto", sv: "ett-lock-till-en-oeppen-kropp" },
  cableChannel: { chapter: "edges", de: "ein-kabelkanal-durch-einen-koerper", en: "a-cable-channel-through-a-body", nl: "een-kabelkanaal-door-een-vorm", fr: "un-passage-de-cable-a-travers-un-corps", ru: "kabelnyy-kanal-skvoz-telo", cs: "kabelovy-kanal-telesem", sl: "kabelski-kanal-skozi-telo", da: "en-kabelkanal-gennem-et-legeme", es: "un-canal-para-cable-a-traves-de-un-cuerpo", sv: "en-kabelkanal-genom-en-kropp" },
  mold: { chapter: "edges", de: "gussformen-und-stanzwerkzeuge", en: "molds-and-dies", nl: "gietmallen-en-stansen", fr: "moules-et-matrices", ru: "liteynye-formy-i-shtampy", cs: "formy-a-raznice", sl: "kalupi-in-matrice", hu: "oentoformak-es-matricak", es: "moldes-y-troqueles", sv: "gjutformar-och-stansar" },
  cutOut: { chapter: "solids", de: "koerper-ausschneiden", en: "cutting-one-body-out-of-another", nl: "het-ene-lichaam-uit-het-andere-snijden", "pt-br": "recortando-um-solido-de-outro", ru: "vyrezanie-odnogo-tela-iz-drugogo", cs: "vyriznuti-jednoho-telesa-z-druheho", sl: "izrezovanje-enega-telesa-iz-drugega", hu: "egy-test-kivagasa-egy-masikbol", es: "recortar-un-cuerpo-de-otro", fr: "decouper-un-corps-dans-un-autre", sv: "skaera-ut-en-kropp-ur-en-annan" },
  punch: { chapter: "solids", de: "einen-umriss-durch-einen-koerper-stanzen", en: "punching-an-outline-through-a-body", nl: "een-omtrek-door-een-lichaam-ponsen", "pt-br": "puncionando-um-contorno-atraves-de-um-solido", ru: "probivka-kontura-skvoz-telo", cs: "prorazeni-obrysu-telesem", sl: "izsekovanje-obrisa-skozi-telo", hu: "koervonal-atuetese-egy-testen", es: "troquelar-un-contorno-a-traves-de-un-cuerpo", fr: "poinconner-un-contour-a-travers-un-corps", sv: "stansa-en-kontur-genom-en-kropp" },
  offset: { chapter: "edges", de: "koerper-versetzen", en: "offsetting-bodies", nl: "lichamen-verschuiven", fr: "decaler-des-corps", ru: "smeshchenie-tela", cs: "odsazeni-teles", sl: "odmik-teles", es: "desfasar-cuerpos", sv: "foerskjuta-kroppar" },
  deleteFace: { chapter: "edges", de: "flaechen-loeschen", en: "deleting-faces", nl: "vlakken-verwijderen", fr: "supprimer-des-faces", ru: "udalenie-graney", cs: "mazani-ploch", sl: "brisanje-ploskev", es: "eliminar-caras", sv: "ta-bort-ytor" },
  threads: { chapter: "threads", de: "gewinde", en: "threads", nl: "schroefdraad", ru: "rezba", cs: "zavity", sl: "navoj", hu: "menetek", es: "roscas", sv: "gaengor" },
  gears: { chapter: "threads", de: "zahnraeder", en: "gears", nl: "tandwielen", ru: "shesterni", cs: "ozubena-kola", sl: "zobniki", hu: "fogaskerekek", es: "engranajes", sv: "kugghjul" },
  springs: { chapter: "threads", de: "federn", en: "springs", nl: "veren", ru: "pruzhiny", cs: "pruziny", sl: "vzmeti", hu: "rugok", es: "muelles", sv: "fjaedrar" },
  bentTubes: { chapter: "threads", de: "gebogene-rohre", en: "bent-tubes", nl: "gebogen-buizen", ru: "izognutye-truby", cs: "ohnute-trubky", sl: "ukrivljene-cevi", hu: "hajlitott-csoevek", es: "tubos-curvados", sv: "boejda-roer" },
  loft: { chapter: "threads", de: "uebergang", en: "loft", nl: "loft", ru: "perekhod", cs: "propojeni-profilu", sl: "prehod", hu: "atmenet", es: "recubrimiento", sv: "loft" },
  vase: { chapter: "shapes", de: "eine-vase", en: "a-vase", nl: "een-vaas", fr: "un-vase", ru: "vaza", cs: "vaza", sl: "vaza", es: "un-jarron", sv: "en-vas" },
  patties: { chapter: "shapes", de: "patties-eine-musterplatte", en: "patties-a-pattern-plate", nl: "patties-een-patroonplaat", fr: "patties-une-plaque-a-motif", ru: "patties-plastina-s-uzorom", cs: "patties-deska-se-vzorem", sl: "patties-plosca-z-vzorcem", es: "patties-una-placa-con-patron", sv: "patties-en-moensterplatta" },
  gridfinity: { chapter: "threads", de: "gridfinity", en: "gridfinity", nl: "gridfinity", ru: "gridfinity", cs: "gridfinity", sl: "gridfinity", hu: "gridfinity", es: "gridfinity", sv: "gridfinity" },
  hinge: { chapter: "threads", de: "scharnier", en: "hinge", nl: "scharnier", ru: "petlya", cs: "pant", sl: "tecaj", hu: "zsaner", es: "bisagra", sv: "gangjaern" },
  flexi: { chapter: "threads", de: "flexi-gelenke", en: "flexi-joints", nl: "flexi-scharnieren", ru: "fleksi-sharniry", cs: "flexi-klouby", sl: "flexi-zgibi", hu: "flexi-csuklok", es: "articulaciones-flexi", fr: "articulations-flexi", sv: "flexileder" },
  knurl: { chapter: "threads", de: "raendelung", en: "knurling", nl: "kartel", ru: "nakatka", cs: "ryhovane-uchopy", sl: "narebricenje", hu: "recezes", es: "moleteado", sv: "laettring" },
  dovetail: { chapter: "threads", de: "schwalbenschwanz", en: "dovetail", nl: "zwaluwstaart", ru: "lastochkin-khvost", cs: "rybinovy-spoj", sl: "lastovicji-rep", hu: "fecskefark", es: "cola-de-milano", sv: "laxstjaert" },
  screwBoss: { chapter: "threads", de: "schraubdom", en: "screw-boss", nl: "schroefpaal", fr: "bossage-a-vis", ru: "bobyshka-pod-vint", cs: "sroubovy-sloupek", sl: "vijacni-steber", da: "skruetap", hu: "csavaroszlop", es: "torreta-para-tornillo", it: "torretta-per-viti", pl: "tulejka-na-wkret", ar: "screw-boss", sv: "skruvfaeste" },
  snapFit: { chapter: "threads", de: "schnapphaken", en: "snap-fit", nl: "klikhaak", fr: "clip-a-encliqueter", ru: "zashchelka", cs: "zaklapavaci-hacek", sl: "zaskocna-kljukica", da: "snaplas", hu: "pattintos-kampo", es: "clip-de-encaje", it: "gancio-a-scatto", pl: "zatrzask", ar: "snap-fit", sv: "snaepplas" },
  latch: { chapter: "threads", de: "riegel", en: "latch", nl: "sluiting", fr: "loquet", ru: "zastezhka", cs: "prezka", sl: "zaponka", da: "lukke", hu: "csat", es: "cierre", it: "chiusura", pl: "zapiecie", ar: "latch", sv: "spaenne" },
  ribs: { chapter: "threads", de: "rippen", en: "ribs", nl: "ribben", fr: "nervures", ru: "rebra", cs: "zebra", sl: "rebra", da: "ribber", hu: "bordak", es: "nervios", it: "nervature", pl: "zebra", ar: "ribs", sv: "ribbor" },
  teardrop: { chapter: "threads", de: "tropfenbohrung", en: "teardrop-hole", nl: "druppelgat", ru: "kaplevidnoe-otverstie", cs: "kapkovity-otvor", sl: "kapljicna-izvrtina", hu: "csepp-alaku-lyuk", es: "orificio-en-lagrima", sv: "dropphal" },
  ports: { chapter: "threads", de: "anschlussoeffnungen", en: "port-openings", nl: "aansluitopeningen", ru: "otverstiya-pod-razemy", cs: "otvory-pro-konektory", sl: "odprtine-za-prikljucke", hu: "csatlakozonyilasok", es: "aberturas-para-conectores", fr: "ouvertures-de-connecteur", it: "aperture-per-connettori", pl: "otwory-na-zlacza", da: "stikabninger", ar: "port-openings", sv: "portoeppningar" },
  sbcBoard: { chapter: "threads", de: "sbc-platinen", en: "sbc-boards", nl: "sbc-borden", ru: "platy-sbc", cs: "desky-sbc", hu: "sbc-lapok", es: "placas-sbc", sv: "sbc-kort" },
  screwHoles: { chapter: "threads", de: "stufen-und-senkbohrung", en: "counterbore-and-countersink", nl: "verzinkboring-en-verzinking", ru: "tsekovka-i-zenkovka", cs: "valcove-a-kuzelove-zahloubeni", sl: "stopnicasta-in-udirna-izvrtina", hu: "hengeres-es-kupos-suellyesztes", es: "escariado-y-avellanado", sv: "planfoersaenkning-och-foersaenkning" },
  ruler: { chapter: "measuring", de: "das-lineal", en: "the-ruler", nl: "de-liniaal", ru: "lineyka", cs: "pravitko", sl: "ravnilo", hu: "a-vonalzo", es: "la-regla", sv: "linjalen" },
  printer: { chapter: "printing", de: "den-drucker-waehlen", en: "choosing-your-printer", nl: "je-printer-kiezen", "pt-br": "escolhendo-a-sua-impressora", ru: "vybor-printera", cs: "vyber-tiskarny", sl: "izbira-tiskalnika", hu: "a-nyomtatod-kivalasztasa", es: "elegir-tu-impresora", sv: "vaelja-skrivare" },
  designFolders: { chapter: "files", de: "ordner-fuer-deine-entwuerfe", en: "folders-for-your-designs", nl: "mappen-voor-je-ontwerpen", fr: "des-dossiers-pour-vos-dessins", ru: "papki-dlya-proektov", cs: "slozky-pro-projekty", sl: "mape-za-tvoje-projekte", es: "carpetas-para-tus-disenos", sv: "mappar-foer-dina-designer" },
  backingUp: { chapter: "files", de: "sichern-und-weitergeben", en: "backing-up-and-passing-on", nl: "back-up-maken-en-doorgeven", ru: "rezervnye-kopii-i-peredacha", cs: "zalohovani-a-predavani", sl: "varnostno-kopiranje-in-deljenje", hu: "biztonsagi-mentes-es-tovabbadas", es: "hacer-copias-de-seguridad-y-compartir", sv: "saekerhetskopiera-och-dela" },
  yourBackup: { chapter: "files", de: "deine-daten-deine-sicherung", en: "your-designs-your-backup", nl: "jouw-ontwerpen-jouw-back-up", fr: "vos-dessins-votre-sauvegarde", ru: "vashi-proekty-vasha-rezervnaya-kopiya", cs: "vase-navrhy-vase-zaloha", sl: "vasi-projekti-vasa-varnostna-kopija", hu: "a-terveid-a-te-biztonsagi-mentesed", es: "tus-disenos-tu-copia-de-seguridad", it: "i-tuoi-progetti-il-tuo-backup", pl: "twoje-projekty-twoja-kopia", da: "dine-designs-din-sikkerhedskopi", sv: "dina-designer-din-saekerhetskopia" },
  fileBackups: { chapter: "files", de: "fruehere-fassungen", en: "earlier-versions", nl: "eerdere-versies", fr: "versions-precedentes", ru: "predydushchie-versii", cs: "drivejsi-verze", sl: "prejsnje-razlicice", hu: "korabbi-valtozatok", es: "versiones-anteriores", it: "versioni-precedenti", pl: "wczesniejsze-wersje", da: "tidligere-versioner", sv: "tidigare-versioner" },
  exporting: { chapter: "files", de: "exportieren", en: "exporting", nl: "exporteren", ru: "eksport", cs: "export", sl: "izvoz", hu: "exportalas", es: "exportar", sv: "exportera" },
  attachments: { chapter: "files", de: "anhaenge", en: "attachments", nl: "bijlagen", ru: "vlozheniya", cs: "prilohy", sl: "priloge", es: "archivos-adjuntos", sv: "bilagor" },
  importing: { chapter: "files", de: "importieren", en: "importing", nl: "importeren", ru: "import", cs: "import", sl: "uvoz", hu: "importalas", es: "importar", sv: "importera" },
  largeMeshes: { chapter: "files", de: "grosse-netze", en: "large-meshes", nl: "grote-meshes", fr: "gros-maillages", ru: "bolshie-setki", cs: "velke-site", sl: "velike-mreze", hu: "nagy-halok", es: "mallas-grandes", it: "mesh-grandi", pl: "duze-siatki", da: "store-mesh", sv: "stora-mesh" },
  simplifyMesh: { chapter: "files", de: "ein-importiertes-netz-vereinfachen", en: "simplifying-an-imported-mesh", nl: "een-geimporteerde-mesh-vereenvoudigen", ru: "uproshchenie-importirovannoy-setki", cs: "zjednoduseni-importovane-site", sl: "poenostavitev-uvozene-mreze", hu: "importalt-halo-egyszerusitese", es: "simplificar-una-malla-importada", sv: "foerenkla-en-importerad-mesh" },
  clearanceCheck: { chapter: "measuring", de: "spiel-pruefen", en: "checking-clearance", nl: "speling-controleren", fr: "verifier-le-jeu", ru: "proverka-zazora", cs: "kontrola-vule", sl: "preverjanje-zracnosti", da: "tjek-spillerum", hu: "hezag-ellenorzese", es: "comprobar-la-holgura", it: "controllare-il-gioco", pl: "sprawdzanie-luzu", sv: "kontrollera-spelrum" },
  supportRib: { chapter: "printing", de: "stuetzrippen-fuer-ein-schraeges-teil", en: "support-ribs-for-a-tilted-part", fr: "nervures-de-support-pour-une-piece-inclinee", es: "nervios-de-soporte-para-una-pieza-inclinada", it: "nervature-di-supporto-per-un-pezzo-inclinato", nl: "steunribben-voor-een-schuin-onderdeel", pl: "zebra-podporowe-dla-pochylonej-czesci", cs: "podperna-zebra-pro-sikmy-dil", da: "st-tteribber-til-en-skra-del", hu: "tamasztobordak-megdoentoett-alkatreszhez", "pt-br": "nervuras-de-suporte-para-uma-peca-inclinada", ru: "opornye-rebra-dlya-naklonnoy-detali", sl: "podporna-rebra-za-poseven-del", sv: "stoedribbor-foer-en-lutad-del" },
  layerCheck: { chapter: "printing", de: "druckanalyse-und-schichtansicht", en: "print-analysis-and-layer-view", nl: "printanalyse-en-laagweergave", ru: "analiz-pechati-i-prosmotr-sloev", cs: "analyza-tisku-a-zobrazeni-vrstev", "pt-br": "analise-de-impressao-e-visualizacao-de-camadas" },
  printCheck: { chapter: "printing", de: "druck-pruefen", en: "checking-the-print", nl: "de-print-controleren", fr: "verifier-l-impression", ru: "proverka-pechati", cs: "kontrola-tisku", sl: "preverjanje-tiska", da: "tjek-printet", hu: "a-nyomtatas-ellenorzese", es: "comprobar-la-impresion", it: "controllare-la-stampa", pl: "sprawdzanie-wydruku", "pt-br": "verificar-a-impressao", sv: "kontrollera-utskriften" },
  protractor: { chapter: "measuring", de: "der-winkelmesser", en: "the-protractor", nl: "de-gradenboog", ru: "transportir", cs: "uhlomer", sl: "kotomer", hu: "a-szoegmero", es: "el-transportador", sv: "gradskivan" },
  tapeMeasure: { chapter: "measuring", de: "das-massband", en: "the-tape-measure", nl: "het-meetlint", ru: "ruletka", cs: "mereni-vzdalenosti", sl: "merilni-trak", hu: "a-meroszalag", es: "la-cinta-metrica", sv: "mattbandet" },
  notes: { chapter: "measuring", de: "notizen", en: "notes", nl: "notities", ru: "zametki", cs: "poznamky", sl: "opombe", hu: "jegyzetek", es: "notas", sv: "anteckningar" },
  sketchCorners: { chapter: "sketches", de: "ecken-runden-oder-fasen", en: "rounding-or-chamfering-corners", nl: "hoeken-afronden-of-afschuinen", ru: "skruglenie-i-faska-na-uglakh", cs: "zaobleni-a-zkoseni-rohu", sl: "zaokrozevanje-ali-posnetje-vogalov", hu: "sarkok-lekerekitese-vagy-letoerese", es: "redondear-o-achaflanar-esquinas", sv: "avrunda-eller-fasa-hoern" },
  sketchImage: { chapter: "sketches", de: "ein-bild-als-vorlage", en: "a-picture-as-template", nl: "een-afbeelding-als-sjabloon", ru: "kartinka-kak-podlozhka", cs: "obrazek-jako-predloha", sl: "slika-kot-predloga", hu: "kep-mint-minta", es: "una-imagen-como-plantilla", sv: "en-bild-som-mall" },
  sketchStroke: { chapter: "sketches", de: "als-kontur-bauen", en: "building-as-a-stroke", nl: "als-lijn-opbouwen", ru: "postroenie-obvodkoy", cs: "teleso-z-rozsirene-cary", sl: "gradnja-kot-kontura", hu: "vonalkent-epites", es: "construir-como-trazo", sv: "bygga-som-en-linje" },
  customFonts: { chapter: "text", de: "eigene-schriften", en: "your-own-fonts", nl: "je-eigen-lettertypen", ru: "svoi-shrifty", cs: "vlastni-pisma", sl: "lastne-pisave", hu: "sajat-betutipusok", es: "tus-fuentes", sv: "egna-typsnitt" },
  sketchFill: { chapter: "sketches", de: "fuellung-und-silhouette", en: "fill-and-silhouette", nl: "vulling-en-silhouet", ru: "zalivka-i-siluet", cs: "vypln-a-silueta", sl: "polnilo-in-silhueta", hu: "kitoeltes-es-sziluett", es: "relleno-y-silueta", sv: "fyllning-och-silhuett" },
  // The question mark beside Extrude, Revolve and Sweep, where a sketch is started (Discussion #1782): it led to "Making a body from it".
  sketchStart: { chapter: "sketches", de: "eine-skizze-beginnen", en: "starting-a-sketch", nl: "een-schets-beginnen", fr: "demarrer-une-esquisse", ru: "nachalo-eskiza", cs: "zahajeni-nacrtu", sl: "zacetek-skice", hu: "vazlat-inditasa", pl: "rozpoczynanie-szkicu", es: "empezar-un-boceto", it: "iniziare-uno-schizzo", da: "start-en-skitse", sv: "starta-en-skiss" },
  sketchDrawing: { chapter: "sketches", de: "zeichnen", en: "drawing", nl: "tekenen", ru: "risovanie", cs: "kresleni", sl: "risanje", hu: "rajzolas", es: "dibujar", sv: "rita" },
  sketchSweep: { chapter: "sketches", de: "entlang-eines-pfades-ziehen", en: "sweeping-along-a-path", nl: "langs-een-pad-trekken", fr: "balayer-le-long-d-un-chemin", ru: "protyagivanie-vdol-traektorii", cs: "protazeni-podel-drahy", sl: "vleka-vzdolz-poti", es: "barrer-a-lo-largo-de-una-trayectoria", sv: "svepa-laengs-en-bana" },
  sketchToBody: { chapter: "sketches", de: "ein-koerper-daraus-machen", en: "making-a-body-from-it", nl: "er-een-lichaam-van-maken", ru: "kak-sdelat-iz-nego-telo", cs: "vytvoreni-telesa", sl: "iz-tega-narediti-telo", hu: "test-keszitese-belole", es: "convertirlo-en-un-cuerpo", sv: "goera-en-kropp-av-skissen" },
  addShape: { chapter: "shapes", de: "eine-form-hinzufuegen", en: "adding-a-shape", nl: "een-vorm-toevoegen", ru: "dobavlenie-figury", cs: "pridani-tvaru", sl: "dodaj-obliko", hu: "alakzat-hozzaadasa", es: "anadir-una-forma", sv: "laegga-till-en-form" },
  rotating: { chapter: "select", cs: "otaceni-a-stred-otaceni", da: "rotation-og-indstilling-af-rotationspunkt", de: "drehen-und-den-drehpunkt-setzen", en: "rotating-and-setting-the-pivot", es: "girar-y-fijar-el-punto-de-giro", fr: "rotation-et-reglage-du-pivot", hu: "forgatas-es-a-forgatasi-pont-megadasa", nl: "draaien-en-het-draaipunt-instellen", pl: "obracanie-i-ustawianie-punktu-obrotu", ru: "vrashchenie-i-tsentr-vrashcheniya", sl: "vrtenje-in-postavitev-vrtisca", sv: "vrida-och-staella-in-rotationspunkten" },
  selecting: { chapter: "select", de: "auswaehlen", en: "selecting", nl: "selecteren", ru: "vydelenie", cs: "vyber", sl: "izbiranje", hu: "kijeloeles", es: "seleccionar", sv: "markera" },
  layFlat: { chapter: "select", de: "auf-eine-flaeche-legen", en: "laying-flat-on-a-face", nl: "plat-op-een-vlak-leggen", ru: "ukladka-na-gran", cs: "polozeni-na-plochu", sl: "polaganje-na-ploskev", hu: "lapra-fektetes", es: "apoyar-sobre-una-cara", sv: "laegga-platt-pa-en-yta" },
  referencePoints: { chapter: "measuring", de: "bezugspunkte", en: "reference-points", nl: "referentiepunten", ru: "opornye-tochki", cs: "referencni-body", sl: "referencne-tocke", hu: "referenciapontok", es: "puntos-de-referencia", sv: "referenspunkter" },
  referenceImage: { chapter: "measuring", de: "referenzbilder", en: "reference-images", nl: "referentieafbeeldingen", fr: "images-de-reference", ru: "etalonnye-izobrazheniya", cs: "referencni-obrazky", sl: "referencne-slike", hu: "mintakepek", es: "imagenes-de-referencia", sv: "referensbilder" },
  addingText: { chapter: "text", de: "text-hinzufuegen", en: "adding-text", nl: "tekst-toevoegen", ru: "dobavlenie-teksta", cs: "vlozeni-textu", sl: "dodajanje-besedila", hu: "szoeveg-hozzaadasa", es: "anadir-texto", sv: "laegga-till-text" },
  sketchMirror: { chapter: "sketches", de: "spiegeln", en: "mirroring", nl: "spiegelen", fr: "symetrie", ru: "zerkalnoe-otrazhenie", cs: "zrcadleni", sl: "zrcaljenje", hu: "tuekroezes", pl: "odbicie-lustrzane", da: "spejling", es: "reflejar", sv: "spegla" },
  sketchCurve: { chapter: "sketches", de: "eine-gerade-seite-kruemmen", en: "curving-a-straight-side", nl: "een-rechte-zijde-buigen", ru: "izgib-pryamoy-storony", cs: "prohnuti-prime-strany", sl: "ukrivljanje-ravne-stranice", hu: "egyenes-oldal-goerbitese", es: "curvar-un-lado-recto", sv: "boeja-en-rak-sida" },
  commandSearch: { chapter: "shortcuts", de: "befehlssuche", en: "command-search", nl: "opdrachten-zoeken", "pt-br": "pesquisa-de-comandos", ru: "poisk-komand", cs: "vyhledavani-prikazu", sl: "iskanje-ukazov", hu: "parancskereso", es: "busqueda-de-comandos", sv: "kommandosoekning" },
  customKeys: { chapter: "shortcuts", de: "eigene-tasten", en: "your-own-keys", nl: "je-eigen-toetsen", "pt-br": "suas-proprias-teclas", fr: "vos-propres-touches", it: "i-tuoi-tasti", da: "dine-egne-taster", pl: "wlasne-klawisze", ru: "svoi-klavishi", cs: "vlastni-klavesy", sl: "lastne-tipke", hu: "sajat-billentyuk", es: "tus-propias-teclas", sv: "egna-tangenter" },
  interactiveHelp: { chapter: "shortcuts", de: "interaktive-hilfe", en: "interactive-help", nl: "interactieve-hulp", "pt-br": "ajuda-interativa", fr: "aide-interactive", ru: "interaktivnaya-spravka", cs: "interaktivni-napoveda", sl: "interaktivna-pomoc", es: "ayuda-interactiva", sv: "interaktiv-hjaelp" },
  whatsNew: { chapter: "start", "pt-pt": "novidades-desde-a-tua-ultima-visita", de: "neu-seit-deinem-letzten-besuch", en: "new-since-your-last-visit", nl: "nieuw-sinds-je-laatste-bezoek", "pt-br": "novidades-desde-a-sua-ultima-visita", ru: "novoe-s-vashego-poslednego-vizita", cs: "novinky-od-posledni-navstevy", sl: "novo-od-tvojega-zadnjega-obiska", hu: "ujdonsagok-a-legutobbi-latogatasod-ota", es: "novedades-desde-tu-ultima-visita", sv: "nytt-sedan-ditt-senaste-besoek" },
  focusMode: { chapter: "start", de: "fokusmodus", en: "focus-mode", nl: "focusmodus", "pt-br": "modo-foco", "pt-pt": "modo-foco", ru: "rezhim-fokusa", cs: "rezim-soustredeni", sl: "nacin-osredotocenja", hu: "fokusz-mod", es: "modo-concentracion", fr: "mode-concentration", it: "modalita-concentrazione", pl: "tryb-skupienia", da: "fokustilstand", sv: "fokuslaege" },
  // Answers in the FAQ that a message of the program leads to (lib/noticeHelp.ts).
  faqSlowMesh: { chapter: "faq", en: "why-does-layerling-get-slow-with-my-stl", de: "warum-wird-layerling-mit-meiner-stl-langsam", cs: "proc-se-layerling-s-mym-stl-zpomaluje", da: "hvorfor-bliver-layerling-langsomt-med-min-stl", es: "por-que-layerling-va-lento-con-mi-stl", fr: "pourquoi-layerling-devient-il-lent-avec-mon-stl", hu: "miert-lassul-le-a-layerling-az-stl-emmel", it: "perche-layerling-diventa-lento-con-il-mio-stl", nl: "waarom-wordt-layerling-traag-met-mijn-stl", pl: "dlaczego-layerling-zwalnia-przy-moim-stl", "pt-br": "por-que-o-layerling-fica-lento-com-o-meu-stl", "pt-pt": "porque-e-que-o-layerling-fica-lento-com-o-meu-stl", ru: "pochemu-layerling-tormozit-s-moim-stl", sl: "zakaj-layerling-z-mojo-datoteko-stl-postane-pocasen", sv: "varfoer-blir-layerling-langsamt-med-min-stl" },
  faqHistoryShorter: { chapter: "faq", en: "why-are-steps-missing-from-my-history", de: "warum-fehlen-schritte-in-meinem-verlauf", cs: "proc-v-me-historii-chybi-kroky", da: "hvorfor-mangler-der-trin-i-min-historik", es: "por-que-faltan-pasos-en-mi-historial", fr: "pourquoi-manque-t-il-des-etapes-dans-mon-historique", hu: "miert-hianyoznak-lepesek-az-elozmenyeimbol", it: "perche-mancano-dei-passaggi-nella-mia-cronologia", nl: "waarom-ontbreken-er-stappen-in-mijn-geschiedenis", pl: "dlaczego-w-mojej-historii-brakuje-krokow", "pt-br": "por-que-faltam-passos-no-meu-historico", "pt-pt": "porque-faltam-passos-no-meu-historico", ru: "pochemu-v-moey-istorii-ne-khvataet-shagov", sl: "zakaj-v-moji-zgodovini-manjkajo-koraki", sv: "varfoer-saknas-det-steg-i-min-historik" },
  faqStorageFull: { chapter: "faq", en: "what-do-i-do-when-the-browser-s-storage-is-full", de: "was-tue-ich-wenn-der-speicher-des-browsers-voll-ist", cs: "co-delat-kdyz-je-uloziste-prohlizece-plne", da: "hvad-g-r-jeg-nar-browserens-lager-er-fuldt", es: "que-hago-cuando-el-almacenamiento-del-navegador-esta-lleno", fr: "que-faire-quand-le-stockage-du-navigateur-est-plein", hu: "mit-tegyek-ha-betelt-a-boengeszo-tarhelye", it: "che-cosa-faccio-quando-lo-spazio-di-archiviazione-del-browser-e-pieno", nl: "wat-doe-ik-als-de-opslag-van-de-browser-vol-is", pl: "co-zrobic-gdy-pamiec-przegladarki-jest-pelna", "pt-br": "o-que-faco-quando-o-armazenamento-do-navegador-esta-cheio", "pt-pt": "o-que-faco-quando-o-armazenamento-do-navegador-esta-cheio", ru: "chto-delat-kogda-khranilishche-brauzera-zapolneno", sl: "kaj-naredim-ko-je-shramba-brskalnika-polna", sv: "vad-goer-jag-naer-webblaesarens-lagring-aer-full" },
  faqTooLarge: { chapter: "faq", en: "my-design-is-too-large-to-save-what-now", de: "mein-entwurf-ist-zu-gross-zum-speichern-was-nun", cs: "muj-navrh-je-prilis-velky-na-ulozeni-co-ted", da: "mit-design-er-for-stort-til-at-blive-gemt-hvad-nu", es: "mi-diseno-es-demasiado-grande-para-guardarlo-y-ahora-que", fr: "mon-design-est-trop-volumineux-pour-etre-enregistre-que-faire", hu: "tul-nagy-a-tervem-a-menteshez-mit-tegyek", it: "il-mio-progetto-e-troppo-grande-per-essere-salvato-e-adesso", nl: "mijn-ontwerp-is-te-groot-om-op-te-slaan-wat-nu", pl: "moj-projekt-jest-za-duzy-zeby-go-zapisac-co-teraz", "pt-br": "meu-projeto-esta-grande-demais-para-salvar-e-agora", "pt-pt": "o-meu-projeto-e-demasiado-grande-para-ser-guardado-e-agora", ru: "moy-proekt-slishkom-velik-dlya-sokhraneniya-chto-teper", sl: "moj-nacrt-je-prevelik-za-shranjevanje-kaj-zdaj", sv: "min-design-aer-foer-stor-foer-att-sparas-vad-goer-jag-nu" },
  faqOutOfMemory: { chapter: "faq", en: "the-browser-has-run-out-of-memory-what-helps", de: "dem-browser-geht-der-arbeitsspeicher-aus-was-hilft", cs: "prohlizeci-dosla-pamet-co-pomuze", da: "browseren-er-l-bet-t-r-for-hukommelse-hvad-hj-lper", es: "el-navegador-se-ha-quedado-sin-memoria-que-ayuda", fr: "le-navigateur-n-a-plus-de-memoire-qu-est-ce-qui-aide", hu: "elfogyott-a-boengeszo-memoriaja-mi-segit", it: "il-browser-ha-esaurito-la-memoria-che-cosa-aiuta", nl: "de-browser-heeft-geen-geheugen-meer-wat-helpt", pl: "przegladarce-zabraklo-pamieci-co-pomaga", "pt-br": "o-navegador-ficou-sem-memoria-o-que-ajuda", "pt-pt": "o-navegador-ficou-sem-memoria-o-que-ajuda", ru: "brauzeru-ne-khvataet-pamyati-chto-pomogaet", sl: "brskalniku-zmanjkuje-pomnilnika-kaj-pomaga", sv: "webblaesaren-har-slut-pa-minne-vad-hjaelper" },
  faqOpensSlowly: { chapter: "faq", en: "a-design-opens-very-slowly-or-not-at-all-what-can-i-do", de: "ein-entwurf-oeffnet-sehr-langsam-oder-gar-nicht-was-kann-ich-tun", cs: "navrh-se-otevira-velmi-pomalu-nebo-vubec-co-mohu-delat", da: "et-design-abner-meget-langsomt-eller-slet-ikke-hvad-kan-jeg-g-re", es: "un-diseno-se-abre-muy-despacio-o-no-se-abre-que-puedo-hacer", fr: "un-design-s-ouvre-tres-lentement-ou-pas-du-tout-que-puis-je-faire", hu: "egy-terv-nagyon-lassan-vagy-egyaltalan-nem-nyilik-meg-mit-tehetek", it: "un-progetto-si-apre-molto-lentamente-o-non-si-apre-che-cosa-posso-fare", nl: "een-ontwerp-opent-heel-traag-of-helemaal-niet-wat-kan-ik-doen", pl: "projekt-otwiera-sie-bardzo-wolno-albo-wcale-co-moge-zrobic", "pt-br": "um-projeto-abre-muito-devagar-ou-nao-abre-o-que-posso-fazer", "pt-pt": "um-projeto-abre-muito-devagar-ou-nao-abre-o-que-posso-fazer", ru: "proekt-otkryvaetsya-ochen-medlenno-ili-ne-otkryvaetsya-vovse-chto-delat", sl: "nacrt-se-odpira-zelo-pocasi-ali-sploh-ne-kaj-lahko-naredim", sv: "en-design-oeppnas-mycket-langsamt-eller-inte-alls-vad-kan-jag-goera" },
  faqStandsStill: { chapter: "faq", en: "the-editor-stands-still-or-computes-for-a-long-time-wait-or-reload", de: "der-editor-bleibt-stehen-oder-rechnet-lange-warten-oder-neu-laden", cs: "editor-stoji-nebo-dlouho-pocita-cekat-nebo-nacist-znovu", da: "editoren-star-stille-eller-regner-l-nge-vente-eller-genindl-se", es: "el-editor-se-queda-parado-o-calcula-durante-mucho-tiempo-espero-o-recargo", fr: "l-editeur-reste-fige-ou-calcule-longtemps-attendre-ou-recharger", hu: "a-szerkeszto-megall-vagy-sokaig-szamol-varjak-vagy-toeltsem-ujra", it: "l-editor-resta-fermo-o-calcola-a-lungo-aspetto-o-ricarico", nl: "de-editor-staat-stil-of-rekent-heel-lang-wachten-of-herladen", pl: "edytor-stoi-w-miejscu-albo-dlugo-liczy-czekac-czy-odswiezyc", "pt-br": "o-editor-fica-parado-ou-calcula-por-muito-tempo-espero-ou-recarrego", "pt-pt": "o-editor-fica-parado-ou-calcula-durante-muito-tempo-espero-ou-recarrego", ru: "redaktor-zamer-ili-dolgo-schitaet-zhdat-ili-perezagruzit", sl: "urejevalnik-stoji-ali-dolgo-racuna-naj-pocakam-ali-nalozim-znova", sv: "editorn-star-still-eller-raeknar-laenge-vaenta-eller-ladda-om" },
  faqWebgl: { chapter: "faq", en: "the-3d-view-stays-empty-or-a-message-says-it-could-not-start-what-now", de: "die-3d-ansicht-bleibt-leer-oder-eine-meldung-sagt-sie-konnte-nicht-starten-was-nun", cs: "3d-zobrazeni-zustava-prazdne-nebo-hlaseni-rika-ze-se-nepodarilo-spustit-co-ted", da: "3d-visningen-forbliver-tom-eller-en-besked-siger-at-den-ikke-kunne-starte-hvad-nu", es: "la-vista-3d-se-queda-vacia-o-un-mensaje-dice-que-no-ha-podido-iniciarse-y-ahora-que", fr: "la-vue-3d-reste-vide-ou-un-message-dit-qu-elle-n-a-pas-pu-demarrer-que-faire", hu: "a-3d-nezet-ueres-marad-vagy-egy-uezenet-szerint-nem-tudott-elindulni-mit-tegyek", it: "la-vista-3d-resta-vuota-o-un-messaggio-dice-che-non-e-stato-possibile-avviarla-e-adesso", nl: "de-3d-weergave-blijft-leeg-of-een-melding-zegt-dat-ze-niet-kon-starten-wat-nu", pl: "widok-3d-pozostaje-pusty-albo-komunikat-mowi-ze-nie-udalo-sie-go-uruchomic-co-teraz", "pt-br": "a-vista-3d-fica-vazia-ou-uma-mensagem-diz-que-ela-nao-pode-ser-iniciada-e-agora", "pt-pt": "a-vista-3d-fica-vazia-ou-uma-mensagem-diz-que-nao-foi-possivel-inicia-la-e-agora", ru: "3d-vid-ostaetsya-pustym-ili-soobshchenie-govorit-chto-ego-ne-udalos-zapustit-chto-teper", sl: "3d-pogled-ostane-prazen-ali-sporocilo-pravi-da-se-ni-mogel-zagnati-kaj-zdaj", sv: "3d-vyn-foerblir-tom-eller-ett-meddelande-saeger-att-den-inte-kunde-starta-vad-goer-jag-nu" },
  faqCutFails: { chapter: "faq", en: "why-does-a-cut-fail-or-why-is-my-mesh-not-watertight", de: "warum-klappt-ein-schnitt-nicht-oder-warum-ist-mein-netz-nicht-dicht", cs: "proc-se-rez-nezdari-nebo-proc-moje-sit-neni-uzavrena", da: "hvorfor-mislykkes-en-udsk-ring-eller-hvorfor-er-mit-mesh-ikke-vandt-t", es: "por-que-falla-un-corte-o-por-que-mi-malla-no-es-estanca", fr: "pourquoi-une-decoupe-echoue-t-elle-ou-pourquoi-mon-maillage-n-est-il-pas-etanche", hu: "miert-nem-sikeruel-egy-vagas-vagy-miert-nem-zart-a-halom", it: "perche-un-taglio-non-riesce-o-perche-la-mia-mesh-non-e-a-tenuta-stagna", nl: "waarom-mislukt-een-snede-of-waarom-is-mijn-mesh-niet-waterdicht", pl: "dlaczego-ciecie-sie-nie-udaje-albo-dlaczego-moja-siatka-nie-jest-szczelna", "pt-br": "por-que-um-corte-falha-ou-por-que-a-minha-malha-nao-e-fechada", "pt-pt": "porque-e-que-um-corte-falha-ou-porque-e-que-a-minha-malha-nao-e-estanque", ru: "pochemu-ne-poluchaetsya-vyrez-ili-pochemu-moya-setka-negermetichna", sl: "zakaj-rez-ne-uspe-ali-zakaj-moja-mreza-ni-vodotesna", sv: "varfoer-misslyckas-en-skaerning-eller-varfoer-aer-mitt-naet-inte-vattentaett" },
  faqFilletFails: { chapter: "faq", en: "why-can-a-fillet-not-be-applied", de: "warum-laesst-sich-eine-verrundung-nicht-anwenden", cs: "proc-nelze-pouzit-zaobleni", da: "hvorfor-kan-en-runding-ikke-anvendes", es: "por-que-no-se-puede-aplicar-un-redondeo", fr: "pourquoi-un-conge-ne-peut-il-pas-etre-applique", hu: "miert-nem-alkalmazhato-egy-lekerekites", it: "perche-non-si-riesce-ad-applicare-un-raccordo", nl: "waarom-kan-een-afronding-niet-worden-toegepast", pl: "dlaczego-nie-mozna-zastosowac-zaokraglenia", "pt-br": "por-que-nao-e-possivel-aplicar-um-arredondamento", "pt-pt": "porque-nao-e-possivel-aplicar-um-arredondamento", ru: "pochemu-skruglenie-ne-primenyaetsya", sl: "zakaj-zaokrozitve-ni-mogoce-uporabiti", sv: "varfoer-gar-en-avrundning-inte-att-anvaenda" },
  faqFilletsAfterSketch: { chapter: "faq", en: "why-are-my-fillets-gone-after-i-changed-the-sketch", de: "warum-sind-meine-verrundungen-weg-nachdem-ich-die-skizze-geaendert-habe", cs: "proc-po-zmene-nacrtu-zmizela-moje-zaobleni", da: "hvorfor-er-mine-rundinger-v-k-efter-at-jeg-har-ndret-skitsen", es: "por-que-han-desaparecido-mis-redondeos-despues-de-cambiar-el-boceto", fr: "pourquoi-mes-conges-ont-ils-disparu-apres-la-modification-de-l-esquisse", hu: "miert-tuntek-el-a-lekerekiteseim-miutan-modositottam-a-vazlatot", it: "perche-i-miei-raccordi-sono-spariti-dopo-che-ho-modificato-lo-schizzo", nl: "waarom-zijn-mijn-afrondingen-weg-nadat-ik-de-schets-heb-gewijzigd", pl: "dlaczego-po-zmianie-szkicu-zniknely-moje-zaokraglenia", "pt-br": "por-que-os-meus-arredondamentos-sumiram-depois-que-alterei-o-esboco", "pt-pt": "porque-desapareceram-os-meus-arredondamentos-depois-de-alterar-o-esboco", ru: "pochemu-posle-izmeneniya-eskiza-propali-moi-skrugleniya", sl: "zakaj-so-po-spremembi-skice-moje-zaokrozitve-izginile", sv: "varfoer-aer-mina-avrundningar-borta-efter-att-jag-aendrade-skissen" },
  faqEdgesOfImports: { chapter: "faq", en: "why-can-i-not-pick-some-edges-of-an-imported-model", de: "warum-kann-ich-manche-kanten-eines-importierten-modells-nicht-waehlen", cs: "proc-nemohu-vybrat-nektere-hrany-importovaneho-modelu", da: "hvorfor-kan-jeg-ikke-v-lge-nogle-af-kanterne-pa-en-importeret-model", es: "por-que-no-puedo-elegir-algunas-aristas-de-un-modelo-importado", fr: "pourquoi-ne-puis-je-pas-selectionner-certaines-aretes-d-un-modele-importe", hu: "miert-nem-tudom-kivalasztani-egy-importalt-modell-egyes-eleit", it: "perche-non-posso-selezionare-alcuni-spigoli-di-un-modello-importato", nl: "waarom-kan-ik-sommige-randen-van-een-geimporteerd-model-niet-kiezen", pl: "dlaczego-nie-moge-wybrac-niektorych-krawedzi-zaimportowanego-modelu", "pt-br": "por-que-nao-consigo-selecionar-algumas-arestas-de-um-modelo-importado", "pt-pt": "porque-nao-consigo-selecionar-algumas-arestas-de-um-modelo-importado", ru: "pochemu-nekotorye-kromki-importirovannoy-modeli-nelzya-vybrat", sl: "zakaj-nekaterih-robov-uvozenega-modela-ne-morem-izbrati", sv: "varfoer-kan-jag-inte-vaelja-vissa-kanter-pa-en-importerad-modell" },
  faqGroupingFails: { chapter: "faq", en: "why-does-grouping-fail-or-why-does-the-result-have-gaps", de: "warum-klappt-das-gruppieren-nicht-oder-warum-hat-das-ergebnis-luecken", cs: "proc-se-slouceni-nezdari-nebo-proc-ma-vysledek-mezery", da: "hvorfor-mislykkes-gruppering-eller-hvorfor-har-resultatet-spr-kker", es: "por-que-falla-la-agrupacion-o-por-que-el-resultado-tiene-huecos", fr: "pourquoi-le-groupement-echoue-t-il-ou-pourquoi-le-resultat-a-t-il-des-trous", hu: "miert-nem-sikeruel-a-csoportositas-vagy-miert-vannak-resek-az-eredmenyben", it: "perche-il-raggruppamento-non-riesce-o-perche-il-risultato-ha-delle-aperture", nl: "waarom-mislukt-het-groeperen-of-waarom-heeft-het-resultaat-openingen", pl: "dlaczego-grupowanie-sie-nie-udaje-albo-dlaczego-wynik-ma-luki", "pt-br": "por-que-o-agrupamento-falha-ou-por-que-o-resultado-tem-frestas", "pt-pt": "porque-e-que-o-agrupamento-falha-ou-porque-e-que-o-resultado-tem-falhas", ru: "pochemu-ne-poluchaetsya-gruppirovka-ili-pochemu-v-rezultate-est-razryvy", sl: "zakaj-zdruzevanje-v-skupino-ne-uspe-ali-zakaj-ima-rezultat-vrzeli", sv: "varfoer-misslyckas-grupperingen-eller-varfoer-har-resultatet-glipor" },
  faqPrinterFit: { chapter: "faq", en: "why-does-layerling-say-a-part-does-not-fit-the-printer", de: "warum-sagt-layerling-ein-teil-passe-nicht-in-den-drucker", cs: "proc-layerling-hlasi-ze-se-dil-nevejde-do-tiskarny", da: "hvorfor-siger-layerling-at-en-del-ikke-passer-i-printeren", es: "por-que-dice-layerling-que-una-pieza-no-cabe-en-la-impresora", fr: "pourquoi-layerling-dit-il-qu-une-piece-ne-tient-pas-dans-l-imprimante", hu: "miert-mondja-a-layerling-hogy-egy-alkatresz-nem-fer-el-a-nyomtatoban", it: "perche-layerling-dice-che-un-pezzo-non-entra-nella-stampante", nl: "waarom-zegt-layerling-dat-een-onderdeel-niet-in-de-printer-past", pl: "dlaczego-layerling-mowi-ze-czesc-nie-miesci-sie-w-drukarce", "pt-br": "por-que-o-layerling-diz-que-uma-peca-nao-cabe-na-impressora", "pt-pt": "porque-e-que-o-layerling-diz-que-uma-peca-nao-cabe-na-impressora", ru: "pochemu-layerling-govorit-chto-detal-ne-pomeshchaetsya-v-printer", sl: "zakaj-layerling-pravi-da-del-ne-gre-v-tiskalnik", sv: "varfoer-saeger-layerling-att-en-del-inte-far-plats-i-skrivaren" },
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
  sbcBoard?: unknown;
  imagePlate?: unknown;
};

export function guideSectionForShape(shape: GuideShape): GuideSection | undefined {
  // A name tag (#215) is a bundle, but its panel is explained with the text.
  if (shape.layeredText && shape.groupedShapes?.length) return "textLayers";
  // An icon tag is a bundle too; its card is explained next to the name tag.
  if (shape.layeredIcon && shape.groupedShapes?.length) return "iconTag";
  // A QR code (#553), alone or on its plate, is explained with the texts and tags.
  if (shape.qrCode) return "qrCode";
  // An SBC board (#1098) is a group, but it is explained next to the port openings.
  if (shape.sbcBoard) return "sbcBoard";
  // A reference image (#680) is explained with the other measuring aids.
  if (shape.imagePlate) return "referenceImage";
  if (shape.groupedShapes?.length) {
    if (shape.groupOperation === "bundle") return "bundling";
    // A loft between two sketches is explained next to the hull and the cookie cutter.
    if (shape.groupOperation === "intersection" || shape.groupOperation === "hull" || shape.groupOperation === "loft") return "intersection";
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
    case "hirth":
    case "pulley":
      return "gears";
    case "spring":
      return "springs";
    case "bentTube":
      return "bentTubes";
    case "loft":
      return "loft";
    case "vase":
      return "vase";
    case "patties":
      return "patties";
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
    case "screwBoss":
      return "screwBoss";
    case "snapFit":
      return "snapFit";
    case "latch":
      return "latch";
    case "rib":
      return "ribs";
    case "teardrop":
      return "teardrop";
    case "port":
      return "ports";
    case "counterbore":
    case "countersink":
    case "doubleCountersink":
    case "finishingWasher":
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
    case "hirth":
    case "pulley":
    case "bentTube":
    case "loft":
    case "gridfinity":
    case "hinge":
    case "knurl":
    case "dovetail":
    case "screwBoss":
    case "snapFit":
    case "latch":
    case "rib":
    case "teardrop":
    case "port":
    case "counterbore":
    case "countersink":
    case "doubleCountersink":
    case "finishingWasher":
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
