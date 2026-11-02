/**
 * The languages layerling speaks, and everything about each one that is not a translated
 * sentence: how it names itself, how it writes numbers, where its community meets, what its
 * guide pages call things. One entry per language is all the code has to know; the sentences
 * themselves live in `messages.<code>.ts` and the guide in `docs/guide/<code>/`.
 *
 * Plain data on purpose, with no imports: the interface reaches it, and so does the guide builder
 * (scripts/build-guide.mjs) and the translation status script, which read it as a module in Node.
 * Keep it to what Node can run as it stands: types and constants, nothing else.
 *
 * To add a language, see docs/TRANSLATING.md.
 */
/*
 * The order of the language menu. English comes first, as the language everything falls back to;
 * then the languages written in the Latin alphabet, sorted by the name each one gives itself
 * (Čeština, Dansk, Deutsch, Français, ...); then the others, by the name in their own script.
 * A new language goes in at its place, not at the end.
 */
export const LANGUAGES = ["en", "cs", "da", "de", "es", "fr", "it", "hu", "nl", "pl", "pt-pt", "pt-br", "sl", "tr", "ru", "ar", "ja", "zh-cn", "zh-tw"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "en";

/**
 * Tags that name a script or a region before a language entry of their own: browsers write
 * zh-Hans, zh-Hant, zh-HK and zh-MO instead of zh-CN and zh-TW.
 */
export const LANGUAGE_TAG_ALIASES: Readonly<Record<string, Language>> = {
  "zh-hans": "zh-cn",
  "zh-hant": "zh-tw",
  "zh-hk": "zh-tw",
  "zh-mo": "zh-tw",
};

/** The words of a guide page that are not chapter text, in the language of the page. */
export type GuideStrings = {
  site: string;
  home: string;
  openEditor: string;
  backToEditor: string;
  editorElsewhere: string;
  chapters: string;
  onThisPage: string;
  previous: string;
  next: string;
  overviewLead: string;
  sourceNote: string;
  forum: string;
  /** Said at the top of a chapter that is not translated yet and shows its English text. */
  notTranslated: string;
  /** The label of the language menu on a guide page. */
  languageMenu: string;
  /** The search box at the top of a guide page: what it is called and what it says when nothing matches. */
  search: string;
  searchNothing: string;
  /** The link to the page with every chapter in a row, and what that page says (for printing the guide). */
  printAll: string;
  printAllTitle: string;
  printAllLead: string;
  printContents: string;
  printButton: string;
};

export type LanguageInfo = {
  /** The language's own name, as the language list shows it. */
  name: string;
  /** The tag for the `lang` attribute and for hreflang. */
  htmlLang: string;
  /** The locale numbers are written in (separators, grouping). */
  numberLocale: string;
  /** Opening and closing quotation marks. */
  quotes: readonly [string, string];
  /** Folder of its guide pages under the site root. */
  guideDir: string;
  /** Where its community meets: the forum or the project's discussions. */
  communityUrl: string;
  /** The README that explains the project in this language, as a file name in the repository. */
  readme: string;
  /** The anchor of the Windows quickstart section in that README. */
  quickstartAnchor: string;
  /** The built-in labels of the legal links in the footer. */
  legal: { imprint: string; privacy: string };
  /**
   * Whether people write "ae", "oe" and "ue" for the letters ä, ö and ü, as German does when the
   * keyboard has none; the guide search then finds one for the other.
   */
  asciiUmlauts: boolean;
  /** Names of keys and mouse actions where the language does not use the English ones. */
  keyNames: Readonly<Record<string, string>>;
  /**
   * Whether the language has every sentence of the interface. A complete language is held to it by
   * a test; any other shows the English sentence where its own is missing.
   */
  complete: boolean;
  guide: GuideStrings;
};

const GITHUB_DISCUSSIONS = "https://github.com/henmedia/layerling/discussions";
const DRUCKTIPPS_FORUM = "https://forum.drucktipps3d.de/forum/board/127-layerling/";

export const LANGUAGE_INFO: Readonly<Record<Language, LanguageInfo>> = {
  cs: {
    name: "Čeština",
    htmlLang: "cs",
    numberLocale: "cs-CZ",
    quotes: ["„", "“"],
    guideDir: "prirucka",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Údaje o provozovateli", privacy: "Ochrana osobních údajů" },
    keyNames: { Shift: "Shift", Delete: "Delete", Home: "Home", Click: "Kliknutí", RightClick: "Pravé tlačítko", Drag: "Tažení" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "Uživatelská příručka Layerlingu",
      home: "Uživatelská příručka",
      openEditor: "Otevřít editor",
      backToEditor: "Zpět do editoru",
      editorElsewhere: "Editor už je otevřený v jiné kartě. Přepněte se do ní.",
      chapters: "Kapitoly",
      onThisPage: "Na této stránce",
      previous: "Předchozí kapitola",
      next: "Další kapitola",
      overviewLead: "Možnosti Layerlingu krok za krokem. Obrázky pocházejí ze spuštěné aplikace a aktualizují se s každou verzí.",
      sourceNote: "Příručka se rozšiřuje spolu s aplikací. Pokud něco chybí nebo je nesprávně, napište do",
      forum: "diskuze",
      notTranslated: "Tato kapitola zatím není přeložená do češtiny. Následuje anglický text.",
      languageMenu: "Jazyk",
      search: "Hledat v příručce",
      searchNothing: "Nic nenalezeno.",
      printAll: "Vytisknout celou příručku",
      printAllTitle: "Celá uživatelská příručka",
      printAllLead: "Všechny kapitoly na jedné stránce pro tisk nebo uložení do PDF. Stiskněte Ctrl+P a v nastavení tisku vypněte záhlaví a zápatí. Pro tisk části příručky zvolte rozsah stránek.",
      printContents: "Obsah",
      printButton: "Vytisknout",
    },
  },
  en: {
    name: "English",
    htmlLang: "en",
    numberLocale: "en-US",
    quotes: ["“", "”"],
    guideDir: "guide",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Imprint", privacy: "Privacy Policy" },
    keyNames: { RightClick: "Right click" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "layerling user guide",
      home: "User guide",
      openEditor: "Open the editor",
      backToEditor: "Back to the editor",
      editorElsewhere: "The editor is already open in another tab - just switch to it.",
      chapters: "Chapters",
      onThisPage: "On this page",
      previous: "Previous chapter",
      next: "Next chapter",
      overviewLead: "Everything layerling can do, step by step. The pictures are taken from the running program and are renewed with every version.",
      sourceNote: "This guide grows with the program. If something is missing or wrong, tell us in the",
      forum: "discussions",
      notTranslated: "This chapter is not translated into your language yet. The English text follows.",
      languageMenu: "Language",
      search: "Search the guide",
      searchNothing: "Nothing found.",
      printAll: "Whole guide, to print",
      printAllTitle: "The whole guide on one page",
      printAllLead: "Every chapter one after the other, to print or to save as a PDF: press Ctrl+P and switch off \"Headers and footers\" in the print settings. To print only a part, choose its page numbers there.",
      printContents: "Contents",
      printButton: "Print",
    },
  },
  de: {
    name: "Deutsch",
    htmlLang: "de",
    numberLocale: "de-DE",
    quotes: ["„", "“"],
    guideDir: "anleitung",
    communityUrl: DRUCKTIPPS_FORUM,
    readme: "README.de.md",
    quickstartAnchor: "schnellstart-unter-windows",
    legal: { imprint: "Impressum", privacy: "Datenschutz" },
    keyNames: { Ctrl: "Strg", Shift: "Umschalt", Delete: "Entf", Backspace: "Rücktaste", Home: "Pos1", Click: "Klick", RightClick: "Rechtsklick", Drag: "Ziehen" },
    asciiUmlauts: true,
    complete: true,
    guide: {
      site: "layerling Anleitung",
      home: "Anleitung",
      openEditor: "Zum Editor",
      backToEditor: "Zurück zum Editor",
      editorElsewhere: "Der Editor ist schon in einem anderen Tab offen - wechsle einfach dorthin.",
      chapters: "Kapitel",
      onThisPage: "Auf dieser Seite",
      previous: "Vorheriges Kapitel",
      next: "Nächstes Kapitel",
      overviewLead: "Alles, was layerling kann, Schritt für Schritt. Die Bilder entstehen aus dem laufenden Programm und werden mit jeder Fassung neu aufgenommen.",
      sourceNote: "Diese Anleitung wächst mit dem Programm. Fehlt dir etwas oder stimmt etwas nicht, sag es im",
      forum: "Forum",
      notTranslated: "Dieses Kapitel ist noch nicht in deine Sprache übersetzt. Es folgt der englische Text.",
      languageMenu: "Sprache",
      search: "Anleitung durchsuchen",
      searchNothing: "Nichts gefunden.",
      printAll: "Ganze Anleitung zum Drucken",
      printAllTitle: "Die ganze Anleitung auf einer Seite",
      printAllLead: "Alle Kapitel hintereinander, zum Drucken oder zum Speichern als PDF: Drücke Strg+P und schalte in den Druckeinstellungen „Kopf- und Fußzeilen“ aus. Möchtest du nur einen Teil drucken, wähle dort die Seitenzahlen.",
      printContents: "Inhalt",
      printButton: "Drucken",
    },
  },
  // Spanish as written in Spain: the whole interface and the 17 chapters of the guide, informal ("tú") like the German
  // "du". A browser that asks for the Spanish of Latin America (es-MX, es-AR, ...) gets it too, rather than English.
  // Not marked complete on purpose, like Hungarian: sentences added later show in English until the Spanish ones follow
  // in a small pull request, so a release never waits for them. The README stays English.
  es: {
    name: "Español",
    htmlLang: "es-ES",
    numberLocale: "es-ES",
    quotes: ["«", "»"],
    guideDir: "guia-es",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.es.md",
    quickstartAnchor: "inicio-rápido-en-windows",
    legal: { imprint: "Aviso legal", privacy: "Política de privacidad" },
    // The labels of a Spanish keyboard.
    keyNames: {
      Ctrl: "Ctrl",
      Shift: "Mayús",
      Delete: "Supr",
      Backspace: "Retroceso",
      Home: "Inicio",
      End: "Fin",
      "Page Up": "Re Pág",
      "Page Down": "Av Pág",
      Enter: "Intro",
      Click: "Clic",
      RightClick: "Clic derecho",
      Drag: "Arrastrar",
    },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "Guía de usuario de layerling",
      home: "Guía de usuario",
      openEditor: "Abrir el editor",
      backToEditor: "Volver al editor",
      editorElsewhere: "El editor ya está abierto en otra pestaña: cambia a ella.",
      chapters: "Capítulos",
      onThisPage: "En esta página",
      previous: "Capítulo anterior",
      next: "Capítulo siguiente",
      overviewLead: "Todo lo que sabe hacer layerling, paso a paso. Las imágenes salen del programa en marcha y se renuevan con cada versión.",
      sourceNote: "Esta guía crece con el programa. Si falta algo o algo no es correcto, dínoslo en las",
      forum: "discusiones",
      notTranslated: "Este capítulo aún no está traducido al español. A continuación, el texto en inglés.",
      languageMenu: "Idioma",
      search: "Buscar en la guía",
      searchNothing: "No se ha encontrado nada.",
      printAll: "Guía completa, para imprimir",
      printAllTitle: "Toda la guía en una sola página",
      printAllLead: "Todos los capítulos seguidos, para imprimir o guardar como PDF: pulsa Ctrl+P y desactiva «Encabezados y pies de página» en las opciones de impresión. Para imprimir solo una parte, elige allí los números de página.",
      printContents: "Índice",
      printButton: "Imprimir",
    },
  },
  nl: {
    name: "Nederlands",
    htmlLang: "nl",
    numberLocale: "nl-NL",
    quotes: ["“", "”"],
    guideDir: "handleiding",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.nl.md",
    quickstartAnchor: "snelstart-op-windows",
    legal: { imprint: "Colofon", privacy: "Privacybeleid" },
    keyNames: { Click: "Klik", RightClick: "Rechtsklik", Drag: "Slepen" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "layerling handleiding",
      home: "Handleiding",
      openEditor: "Naar de editor",
      backToEditor: "Terug naar de editor",
      editorElsewhere: "De editor is al open in een ander tabblad - schakel daar gewoon naartoe.",
      chapters: "Hoofdstukken",
      onThisPage: "Op deze pagina",
      previous: "Vorig hoofdstuk",
      next: "Volgend hoofdstuk",
      overviewLead: "Alles wat layerling kan, stap voor stap. De afbeeldingen komen uit het draaiende programma en worden bij elke versie opnieuw gemaakt.",
      sourceNote: "Deze handleiding groeit mee met het programma. Mis je iets of klopt er iets niet, laat het ons weten in de",
      forum: "discussies",
      notTranslated: "Dit hoofdstuk is nog niet in jouw taal vertaald. Hieronder volgt de Engelse tekst.",
      languageMenu: "Taal",
      search: "Handleiding doorzoeken",
      searchNothing: "Niets gevonden.",
      printAll: "Hele handleiding, om af te drukken",
      printAllTitle: "De hele handleiding op één pagina",
      printAllLead: "Alle hoofdstukken achter elkaar, om af te drukken of als pdf op te slaan: druk op Ctrl+P en zet in de afdrukinstellingen \"Kop- en voetteksten\" uit. Wil je maar een deel afdrukken, kies daar dan de paginanummers.",
      printContents: "Inhoud",
      printButton: "Afdrukken",
    },
  },
  fr: {
    name: "Français",
    htmlLang: "fr",
    numberLocale: "fr-FR",
    quotes: ["« ", " »"],
    guideDir: "guide-fr",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Mentions légales", privacy: "Politique de confidentialité" },
    keyNames: {
      Ctrl: "Ctrl",
      Shift: "Maj",
      Delete: "Suppr",
      Backspace: "Retour arrière",
      Home: "Début",
      Click: "Clic",
      RightClick: "Clic droit",
      Drag: "Glisser",
    },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "Manuel d'utilisation layerling",
      home: "Manuel d'utilisation",
      openEditor: "Ouvrir l'éditeur",
      backToEditor: "Retour à l'éditeur",
      editorElsewhere: "L'éditeur est déjà ouvert dans un autre onglet - basculez simplement vers lui.",
      chapters: "Chapitres",
      onThisPage: "Sur cette page",
      previous: "Chapitre précédent",
      next: "Chapitre suivant",
      overviewLead: "Tout ce que layerling peut faire, pas à pas. Les images proviennent du programme en cours d'exécution et sont renouvelées à chaque version.",
      sourceNote: "Ce manuel grandit avec le programme. Si quelque chose manque ou est inexact, dites-le nous dans les",
      forum: "discussions",
      notTranslated: "Ce chapitre n'est pas encore traduit en français. Le texte en anglais suit.",
      languageMenu: "Langue",
      search: "Rechercher dans le manuel",
      searchNothing: "Aucun résultat trouvé.",
      printAll: "Guide complet, à imprimer",
      printAllTitle: "L'intégralité du guide sur une seule page",
      printAllLead: "Tous les chapitres les uns après les autres, à imprimer ou à enregistrer au format PDF : appuyez sur Ctrl+P et désactivez « En-têtes et pieds de page » dans les paramètres d'impression. Pour imprimer seulement une partie, choisissez ses numéros de page dans la boîte de dialogue.",
      printContents: "Table des matières",
      printButton: "Imprimer",
    },
  },
  // Polish: added as a language that is fetched when chosen, not complete yet (missing sentences show in English).
  // The README and the guide stay English until they are translated, so readme and quickstartAnchor point at the English ones.
  pl: {
    name: "Polski",
    htmlLang: "pl",
    numberLocale: "pl-PL",
    // Polish quotation marks: low opening, high closing (the same pair German uses).
    quotes: ["„", "”"],
    guideDir: "instrukcja",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Nota prawna", privacy: "Polityka prywatności" },
    // Polish keyboards label most keys in English; only the mouse actions get Polish names.
    keyNames: { Click: "Klik", RightClick: "Prawy klik", Drag: "Przeciągnij" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "Instrukcja layerling",
      home: "Instrukcja",
      openEditor: "Otwórz edytor",
      backToEditor: "Wróć do edytora",
      editorElsewhere: "Edytor jest już otwarty w innej karcie - po prostu do niej przejdź.",
      chapters: "Rozdziały",
      onThisPage: "Na tej stronie",
      previous: "Poprzedni rozdział",
      next: "Następny rozdział",
      overviewLead: "Wszystko, co potrafi layerling, krok po kroku. Obrazki pochodzą z działającego programu i są odnawiane przy każdej wersji.",
      sourceNote: "Ta instrukcja rośnie razem z programem. Jeśli czegoś brakuje albo coś się nie zgadza, napisz w",
      forum: "dyskusjach",
      notTranslated: "Ten rozdział nie jest jeszcze przetłumaczony na polski. Poniżej tekst angielski.",
      languageMenu: "Język",
      search: "Szukaj w instrukcji",
      searchNothing: "Nic nie znaleziono.",
      printAll: "Cała instrukcja do wydruku",
      printAllTitle: "Cała instrukcja na jednej stronie",
      printAllLead: "Wszystkie rozdziały jeden po drugim, do wydrukowania lub zapisania jako PDF: naciśnij Ctrl+P i wyłącz w ustawieniach drukowania „Nagłówki i stopki”. Aby wydrukować tylko część, wybierz tam numery stron.",
      printContents: "Spis treści",
      printButton: "Drukuj",
    },
  },
  tr: {
    name: "Türkçe",
    htmlLang: "tr",
    numberLocale: "tr-TR",
    // Turkish uses the plain double quotation marks.
    quotes: ["“", "”"],
    guideDir: "kilavuz",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Künye", privacy: "Gizlilik" },
    // Turkish keyboards label the keys in English; only the mouse actions get Turkish names.
    keyNames: { Click: "Tık", RightClick: "Sağ tık", Drag: "Sürükle" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "layerling kılavuzu",
      home: "Kılavuz",
      openEditor: "Editörü aç",
      backToEditor: "Editöre dön",
      editorElsewhere: "Editör zaten başka bir sekmede açık – oraya geçmen yeterli.",
      chapters: "Bölümler",
      onThisPage: "Bu sayfada",
      previous: "Önceki bölüm",
      next: "Sonraki bölüm",
      overviewLead: "layerling'in yapabildiği her şey, adım adım. Resimler çalışan programdan alınır ve her sürümle yenilenir.",
      sourceNote: "Bu kılavuz programla birlikte büyür. Bir şey eksik veya yanlışsa bunu şurada söyle:",
      forum: "forum",
      notTranslated: "Bu bölüm henüz Türkçeye çevrilmedi. Aşağıda İngilizce metin var.",
      languageMenu: "Dil",
      search: "Kılavuzda ara",
      searchNothing: "Sonuç yok.",
      printAll: "Yazdırmak için tüm kılavuz",
      printAllTitle: "Tüm kılavuz tek sayfada",
      printAllLead: "Tüm bölümler art arda, yazdırmak veya PDF olarak kaydetmek için: Ctrl+P'ye bas ve yazdırma ayarlarında „Üst bilgi ve alt bilgi” seçeneğini kapat. Sadece bir kısmını yazdırmak istiyorsan orada sayfa numaralarını seç.",
      printContents: "İçindekiler",
      printButton: "Yazdır",
    },
  },
  ru: {
    name: "Русский",
    htmlLang: "ru",
    numberLocale: "ru-RU",
    quotes: ["«", "»"],
    guideDir: "ru",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Выходные данные", privacy: "Политика конфиденциальности" },
    keyNames: { Ctrl: "Ctrl", Shift: "Shift", Delete: "Del", Backspace: "Backspace", Home: "Home", Click: "Щёлчок", RightClick: "Правый клик", Drag: "Перетаскивание" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "Руководство layerling",
      home: "Руководство",
      openEditor: "Открыть редактор",
      backToEditor: "Вернуться в редактор",
      editorElsewhere: "Редактор уже открыт в другой вкладке — просто переключитесь туда.",
      chapters: "Главы",
      onThisPage: "На этой странице",
      previous: "Предыдущая глава",
      next: "Следующая глава",
      overviewLead: "Всё, что умеет layerling, шаг за шагом. Картинки сняты с работающей программы и обновляются с каждой версией.",
      sourceNote: "Это руководство растёт вместе с программой. Если чего-то не хватает или что-то не так — напишите в",
      forum: "обсуждениях",
      notTranslated: "Эта глава ещё не переведена на ваш язык. Ниже идёт английский текст.",
      languageMenu: "Язык",
      search: "Поиск по руководству",
      searchNothing: "Ничего не найдено.",
      printAll: "Всё руководство для печати",
      printAllTitle: "Всё руководство на одной странице",
      printAllLead: "Все главы подряд — чтобы распечатать или сохранить как PDF: нажмите Ctrl+P и отключите в настройках печати «Колонтитулы». Если нужно распечатать только часть, выберите там номера страниц.",
      printContents: "Содержание",
      printButton: "Печать",
    },
  },
  // Brazilian Portuguese: fetched when chosen, not complete yet (missing sentences show in English).
  // The code carries the region so it is never taken for the Portuguese of Portugal. It stays a
  // valid language tag, as every code here is; its export swaps the hyphen (MESSAGES_PT_BR).
  // The README and the guide stay English until they are translated.
  "pt-br": {
    name: "Português do Brasil",
    htmlLang: "pt-BR",
    numberLocale: "pt-BR",
    quotes: ["“", "”"],
    guideDir: "guia",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Informações legais", privacy: "Política de privacidade" },
    keyNames: { Click: "Clique", RightClick: "Clique direito", Drag: "Arraste" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "Guia do usuário do layerling",
      home: "Guia do usuário",
      openEditor: "Abrir o editor",
      backToEditor: "Voltar ao editor",
      editorElsewhere: "O editor já está aberto em outra aba - é só mudar para ela.",
      chapters: "Capítulos",
      onThisPage: "Nesta página",
      previous: "Capítulo anterior",
      next: "Próximo capítulo",
      overviewLead: "Tudo o que o layerling sabe fazer, passo a passo. As imagens são tiradas do programa em funcionamento e renovadas a cada versão.",
      sourceNote: "Este guia cresce junto com o programa. Se algo estiver faltando ou errado, avise nas",
      forum: "discussões",
      notTranslated: "Este capítulo ainda não foi traduzido para o português. Segue o texto em inglês.",
      languageMenu: "Idioma",
      search: "Pesquisar no guia",
      searchNothing: "Nada encontrado.",
      printAll: "Guia completo, para imprimir",
      printAllTitle: "O guia completo em uma página",
      printAllLead: "Todos os capítulos em sequência, para imprimir ou salvar como PDF: pressione Ctrl+P e desative \"Cabeçalhos e rodapés\" nas configurações de impressão. Para imprimir só uma parte, escolha ali os números das páginas.",
      printContents: "Sumário",
      printButton: "Imprimir",
    },
  },
  // European Portuguese: partial interface; missing sentences fall back to English.
  "pt-pt": {
    name: "Português de Portugal",
    htmlLang: "pt-PT",
    numberLocale: "pt-PT",
    quotes: ["«", "»"],
    guideDir: "guia-pt-pt",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Informações legais", privacy: "Política de privacidade" },
    keyNames: { Click: "Clique", RightClick: "Clique com o botão direito", Drag: "Arrastar" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "Guia do utilizador do layerling",
      home: "Guia do utilizador",
      openEditor: "Abrir o editor",
      backToEditor: "Voltar ao editor",
      editorElsewhere: "O editor já está aberto noutro separador. Muda para esse separador.",
      chapters: "Capítulos",
      onThisPage: "Nesta página",
      previous: "Capítulo anterior",
      next: "Capítulo seguinte",
      overviewLead: "Tudo o que podes fazer com o layerling, passo a passo. As imagens são captadas no programa em funcionamento e atualizadas a cada versão.",
      sourceNote: "Este guia cresce com o programa. Se faltar alguma coisa ou encontrares um erro, diz-nos nas",
      forum: "discussões",
      notTranslated: "Este capítulo ainda não está traduzido para português de Portugal. Segue-se o texto em inglês.",
      languageMenu: "Idioma",
      search: "Pesquisar no guia",
      searchNothing: "Nenhum resultado encontrado.",
      printAll: "Guia completo para impressão",
      printAllTitle: "O guia completo numa página",
      printAllLead: "Todos os capítulos seguidos, para imprimir ou guardar em PDF: prime Ctrl+P e desativa «Cabeçalhos e rodapés» nas definições de impressão. Para imprimir apenas uma parte, escolhe aí os números das páginas.",
      printContents: "Índice",
      printButton: "Imprimir",
    },
  },
  sl: {
    name: "Slovenščina",
    htmlLang: "sl",
    numberLocale: "sl-SI",
    quotes: ["„", "“"],
    guideDir: "navodila",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Odtis", privacy: "Zasebnost" },
    keyNames: { Click: "Klik", RightClick: "Desni klik", Drag: "Vlečenje" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "layerling navodila",
      home: "Navodila",
      openEditor: "V urejevalnik",
      backToEditor: "Nazaj v urejevalnik",
      editorElsewhere: "Urejevalnik je že odprt v drugem zavihku – preprosto preklopi nanj.",
      chapters: "Poglavja",
      onThisPage: "Na tej strani",
      previous: "Prejšnje poglavje",
      next: "Naslednje poglavje",
      overviewLead: "Vse, kar zmore layerling, korak za korakom. Slike so posnete iz delujočega programa (v angleškem vmesniku).",
      sourceNote: "Ta navodila rastejo skupaj s programom. Če kaj manjka ali ne drži, sporoči v",
      forum: "razpravah",
      notTranslated: "To poglavje še ni prevedeno v tvoj jezik. Sledi angleško besedilo.",
      languageMenu: "Jezik",
      search: "Išči po navodilih",
      searchNothing: "Nič ni najdeno.",
      printAll: "Celotna navodila za tiskanje",
      printAllTitle: "Celotna navodila na eni strani",
      printAllLead: "Vsa poglavja eno za drugim, za tiskanje ali shranjevanje kot PDF: pritisni Ctrl+P in v nastavitvah tiskanja izklopi »Glave in noge«. Če želiš natisniti le del, tam izberi številke strani.",
      printContents: "Kazalo",
      printButton: "Natisni",
    },
  },
  // Hungarian: the whole interface and the 16 chapters of the guide, informal ("te") like the German "du". Not marked
  // complete on purpose: sentences added later show in English until the Hungarian ones follow in a small pull request,
  // so a release never waits for them. The README stays English, so readme and quickstartAnchor point at the English one.
  hu: {
    name: "Magyar",
    htmlLang: "hu",
    numberLocale: "hu-HU",
    // Hungarian quotation marks: low opening, high closing.
    quotes: ["„", "”"],
    guideDir: "utmutato",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Impresszum", privacy: "Adatvédelem" },
    // Hungarian keyboards label the keys in English; only the mouse actions get Hungarian names.
    keyNames: { Click: "Kattintás", RightClick: "Jobb kattintás", Drag: "Húzás" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "layerling útmutató",
      home: "Útmutató",
      openEditor: "Szerkesztő megnyitása",
      backToEditor: "Vissza a szerkesztőhöz",
      editorElsewhere: "A szerkesztő már nyitva van egy másik lapon – egyszerűen válts át oda.",
      chapters: "Fejezetek",
      onThisPage: "Ezen az oldalon",
      previous: "Előző fejezet",
      next: "Következő fejezet",
      overviewLead: "Minden, amit a layerling tud, lépésről lépésre. A képek a futó programból készülnek, és minden verzióval megújulnak.",
      sourceNote: "Ez az útmutató a programmal együtt bővül. Ha valami hiányzik vagy nem stimmel, szólj a",
      forum: "beszélgetésekben",
      notTranslated: "Ez a fejezet még nincs lefordítva magyarra. Alább az angol szöveg következik.",
      languageMenu: "Nyelv",
      search: "Keresés az útmutatóban",
      searchNothing: "Nincs találat.",
      printAll: "A teljes útmutató nyomtatáshoz",
      printAllTitle: "A teljes útmutató egy oldalon",
      printAllLead: "Minden fejezet egymás után, nyomtatáshoz vagy PDF-be mentéshez: nyomd meg a Ctrl+P-t, és a nyomtatási beállításokban kapcsold ki a „Fejlécek és láblécek” lehetőséget. Ha csak egy részt nyomtatnál, ott válaszd ki az oldalszámokat.",
      printContents: "Tartalom",
      printButton: "Nyomtatás",
    },
  },
  // Danish: the whole interface and the 16 chapters of the guide (PR #411). Not marked complete on purpose, like Hungarian:
  // sentences added later show in English until the Danish ones follow in a small pull request. The README stays English.
  da: {
    name: "Dansk",
    htmlLang: "da",
    numberLocale: "da-DK",
    quotes: ["“", "”"],
    guideDir: "vejledning",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Impressum", privacy: "Privatlivspolitik" },
    keyNames: { RightClick: "Højreklik" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "layerling brugervejledning",
      home: "Brugervejledning",
      openEditor: "Åbn editoren",
      backToEditor: "Tilbage til editoren",
      editorElsewhere: "Editoren er allerede åben i en anden fane – skift bare til den.",
      chapters: "Kapitler",
      onThisPage: "På denne side",
      previous: "Forrige kapitel",
      next: "Næste kapitel",
      overviewLead: "Alt hvad layerling kan, trin for trin. Billederne er taget fra det kørende program og bliver fornyet med hver version.",
      sourceNote: "Denne vejledning vokser sammen med programmet. Hvis noget mangler eller er forkert, så fortæl os i",
      forum: "diskussioner",
      notTranslated: "Dette kapitel er ikke oversat til dit sprog endnu. Den engelske tekst følger.",
      languageMenu: "Sprog",
      search: "Søg i vejledningen",
      searchNothing: "Intet fundet.",
      printAll: "Hele vejledningen, til udskrivning",
      printAllTitle: "Hele vejledningen på én side",
      printAllLead: "Hvert kapitel efter hinanden, til udskrivning eller til at gemme som PDF: tryk Ctrl+P og slå \"Sidehoveder og sidefødder\" fra i udskriftsindstillingerne. For kun at udskrive en del, vælg sidetallene der.",
      printContents: "Indhold",
      printButton: "Udskriv",
    },
  },
  // Italiano: interfaccia e guida utente in corso di traduzione. Non viene contrassegnata
  // come completa intenzionalmente. Le frasi aggiunte successivamente rimangono in inglese
  // finché non vengono tradotte in un aggiornamento successivo, così una nuova versione
  // del programma non deve attendere il completamento della traduzione. Il README rimane
  // in inglese, quindi readme e quickstartAnchor puntano a quelli inglesi.
  it: {
    name: "Italiano",
    htmlLang: "it",
    numberLocale: "it-IT",
    quotes: ["«", "»"],
    guideDir: "it",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Note legali", privacy: "Informativa sulla privacy" },
    keyNames: {
      Ctrl: "Ctrl",
      Shift: "Maiusc",
      Delete: "Canc",
      Backspace: "Backspace",
      Home: "Home",
      Click: "Clic",
      RightClick: "Clic destro",
      Drag: "Trascina",
    },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "Guida utente di layerling",
      home: "Guida utente",
      openEditor: "Apri l'editor",
      backToEditor: "Torna all'editor",
      editorElsewhere: "L'editor è già aperto in un'altra scheda: passa semplicemente a quella.",
      chapters: "Capitoli",
      onThisPage: "In questa pagina",
      previous: "Capitolo precedente",
      next: "Capitolo successivo",
      overviewLead: "Tutto quello che layerling può fare, passo dopo passo. Le immagini sono tratte dal programma in esecuzione e vengono aggiornate a ogni versione.",
      sourceNote: "Questa guida cresce insieme al programma. Se manca qualcosa o trovi un errore, segnalalo nelle",
      forum: "discussioni",
      notTranslated: "Questo capitolo non è ancora tradotto in italiano. Segue il testo inglese.",
      languageMenu: "Lingua",
      search: "Cerca nella guida",
      searchNothing: "Nessun risultato.",
      printAll: "Guida completa da stampare",
      printAllTitle: "La guida completa in una sola pagina",
      printAllLead: "Tutti i capitoli in sequenza, da stampare o salvare come PDF: premi Ctrl+P e disattiva le intestazioni e i piè di pagina nelle impostazioni di stampa. Per stampare solo una parte, seleziona i numeri delle pagine.",
      printContents: "Indice",
      printButton: "Stampa",
    },
  }, 
  // Arabic (Modern Standard Arabic): in progress, not complete. The interface is not mirrored for
  // right-to-left yet; the sentences come first, the layout is a separate change.
  ar: {
    name: "العربية",
    htmlLang: "ar",
    // ar-AE: Western digits (1, 2, 3) and a decimal point, the way measurements are typed in a CAD program.
    numberLocale: "ar-AE",
    quotes: ["«", "»"],
    guideDir: "dalil",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.ar.md",
    quickstartAnchor: "البدء-السريع-على-windows",
    legal: { imprint: "بيانات الناشر", privacy: "سياسة الخصوصية" },
    keyNames: { Click: "نقرة", RightClick: "نقرة بالزر الأيمن", Drag: "سحب" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "دليل استخدام layerling",
      home: "دليل الاستخدام",
      openEditor: "افتح المحرّر",
      backToEditor: "العودة إلى المحرّر",
      editorElsewhere: "المحرّر مفتوح بالفعل في علامة تبويب أخرى، فانتقل إليها.",
      chapters: "الفصول",
      onThisPage: "في هذه الصفحة",
      previous: "الفصل السابق",
      next: "الفصل التالي",
      overviewLead: "كل ما يستطيع layerling فعله، خطوة بخطوة. الصور مأخوذة من البرنامج أثناء تشغيله وتُحدَّث مع كل إصدار.",
      sourceNote: "ينمو هذا الدليل مع البرنامج. إذا كان هناك شيء ناقص أو خاطئ، فأخبرنا في",
      forum: "النقاشات",
      notTranslated: "لم يُترجَم هذا الفصل إلى لغتك بعد، ويليه النص الإنجليزي.",
      languageMenu: "اللغة",
      search: "ابحث في الدليل",
      searchNothing: "لم يُعثر على شيء.",
      printAll: "الدليل كاملًا للطباعة",
      printAllTitle: "الدليل كاملًا في صفحة واحدة",
      printAllLead: "جميع الفصول متتالية، للطباعة أو للحفظ بصيغة PDF: اضغط Ctrl+P وألغِ خيار \"الرؤوس والتذييلات\" في إعدادات الطباعة. لطباعة جزء فقط، اختر أرقام صفحاته هناك.",
      printContents: "المحتويات",
      printButton: "طباعة",
    },
  },
  // Japanese: written for upper primary school children and their teachers, with Tinkercad's
  // Japanese terms where Tinkercad has one. The guide is not translated yet.
  ja: {
    name: "日本語",
    htmlLang: "ja",
    numberLocale: "ja-JP",
    quotes: ["「", "」"],
    guideDir: "guide-ja",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "運営者情報", privacy: "プライバシーポリシー" },
    keyNames: { Click: "クリック", RightClick: "右クリック", Drag: "ドラッグ" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "layerling ユーザーガイド",
      home: "ユーザーガイド",
      openEditor: "エディターを開く",
      backToEditor: "エディターに戻る",
      editorElsewhere: "エディターはもう別のタブで開いています。そのタブに切り替えてください。",
      chapters: "章",
      onThisPage: "このページの内容",
      previous: "前の章",
      next: "次の章",
      overviewLead: "layerling でできることを、じゅんばんに説明します。画像は動いているプログラムからとったもので、新しいバージョンが出るたびにとり直しています。",
      sourceNote: "このガイドはプログラムといっしょに育っていきます。足りないところやまちがいがあったら、ここで教えてください:",
      forum: "ディスカッション",
      notTranslated: "この章はまだ日本語になっていません。このあとは英語で書かれています。",
      languageMenu: "言語",
      search: "ガイドを検索",
      searchNothing: "見つかりませんでした。",
      printAll: "ガイドをまとめて印刷",
      printAllTitle: "ガイドの全部を1ページに",
      printAllLead: "すべての章を順番にならべています。印刷するか、PDFとして保存できます。Ctrl+Pを押して、印刷の設定で「ヘッダーとフッター」をオフにしてください。一部だけ印刷したいときは、そこでページの番号を選んでください。",
      printContents: "目次",
      printButton: "印刷",
    },
  },
  // Simplified Chinese: the whole interface, the 17 chapters of the guide and a README of its own.
  // The code carries the region, as Brazilian Portuguese does, so a browser that asks for zh-CN or
  // zh-Hans-CN is served it; other Chinese variants stay on English until a translation exists.
  "zh-cn": {
    name: "简体中文",
    htmlLang: "zh-CN",
    numberLocale: "zh-CN",
    quotes: ["“", "”"],
    guideDir: "zh-cn",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.zh-cn.md",
    quickstartAnchor: "windows-快速上手",
    legal: { imprint: "版本说明", privacy: "隐私政策" },
    // Chinese keyboards label the keys in English; only the mouse actions get Chinese names.
    keyNames: { Ctrl: "Ctrl", Shift: "Shift", Delete: "Delete", Backspace: "Backspace", Home: "Home", End: "End", "Page Up": "Page Up", "Page Down": "Page Down", Enter: "Enter", Click: "单击", RightClick: "右键单击", Drag: "拖动" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "layerling 用户指南",
      home: "用户指南",
      openEditor: "打开编辑器",
      backToEditor: "返回编辑器",
      editorElsewhere: "编辑器已在另一个标签页中打开，请切换到那里。",
      chapters: "章节",
      onThisPage: "本页内容",
      previous: "上一章",
      next: "下一章",
      overviewLead: "layerling 的全部功能，逐步讲解。图片取自运行中的程序，并随每个版本更新。",
      sourceNote: "本指南随程序一同完善。如有缺漏或错误，请到",
      forum: "讨论区反馈",
      notTranslated: "本章尚未翻译为简体中文，以下为英文原文。",
      languageMenu: "语言",
      search: "搜索指南",
      searchNothing: "未找到结果。",
      printAll: "打印完整指南",
      printAllTitle: "完整用户指南",
      printAllLead: "所有章节依次排列，可打印或保存为 PDF：按 Ctrl+P，并在打印设置中关闭“页眉和页脚”。只打印部分章节时，请在其中选择页码。",
      printContents: "目录",
      printButton: "打印",
    },
  },
  // Traditional Chinese as written in Taiwan: the whole interface, the 17 chapters of the guide
  // and a README of its own. zh-TW, zh-Hant and the Hong Kong and Macau tags are matched to it.
  "zh-tw": {
    name: "繁體中文",
    htmlLang: "zh-TW",
    numberLocale: "zh-TW",
    quotes: ["「", "」"],
    guideDir: "zh-tw",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.zh-tw.md",
    quickstartAnchor: "windows-快速上手",
    legal: { imprint: "版本說明", privacy: "隱私權政策" },
    // Chinese keyboards label the keys in English; only the mouse actions get Chinese names.
    keyNames: { Ctrl: "Ctrl", Shift: "Shift", Delete: "Delete", Backspace: "Backspace", Home: "Home", End: "End", "Page Up": "Page Up", "Page Down": "Page Down", Enter: "Enter", Click: "點擊", RightClick: "右鍵點擊", Drag: "拖曳" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "layerling 使用者指南",
      home: "使用者指南",
      openEditor: "開啟編輯器",
      backToEditor: "返回編輯器",
      editorElsewhere: "編輯器已在另一個分頁中開啟，請切換到那裡。",
      chapters: "章節",
      onThisPage: "本頁內容",
      previous: "上一章",
      next: "下一章",
      overviewLead: "layerling 的全部功能，逐步說明。圖片取自執行中的程式，並隨每個版本更新。",
      sourceNote: "本指南隨程式一同完善。如有缺漏或錯誤，請到",
      forum: "討論區告訴我們",
      notTranslated: "本章尚未翻譯為繁體中文，以下為英文原文。",
      languageMenu: "語言",
      search: "搜尋指南",
      searchNothing: "找不到結果。",
      printAll: "列印完整指南",
      printAllTitle: "完整使用者指南",
      printAllLead: "所有章節依次排列，可列印或儲存為 PDF：按 Ctrl+P，並在列印設定中關閉「頁首及頁尾」。只列印部分章節時，請在其中選擇頁碼。",
      printContents: "目錄",
      printButton: "列印",
    },
  },
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The language a browser asks for, as far as we can serve it. `de-AT` and plain `de` both mean
 * German; anything layerling does not speak falls back to English. A language kept apart by its
 * region is matched on both: `pt-BR` is `pt-br`.
 */
export function languageFromTag(tag: string | undefined | null): Language | null {
  const subtags = tag?.trim().toLowerCase().split("-") ?? [];
  const withRegion = subtags.slice(0, 2).join("-");
  if (isLanguage(withRegion)) return withRegion;
  const alias = LANGUAGE_TAG_ALIASES[withRegion];
  if (alias) return alias;
  const primary = subtags[0];
  return isLanguage(primary) ? primary : null;
}
