import type { MessageKey } from "@/lib/i18n";

/**
 * Extra words the search of the settings window finds a setting by, in English and German whatever the language of the
 * interface is (as commandKeywords.ts does for the command search). The key is the label or the help of the setting.
 */
export const SETTINGS_KEYWORDS: Partial<Record<MessageKey, readonly string[]>> = {
  "workspace.zoomSpeed": ["zoom", "mouse wheel", "scroll wheel", "sensitivity", "mausrad", "scrollrad", "scrollen", "empfindlichkeit"],
  "workspace.panSpeed": ["pan", "move view", "sensitivity", "verschieben", "schwenken", "empfindlichkeit"],
  "workspace.mouseScheme": ["mouse buttons", "orbit", "rotate view", "pan", "navigation", "maustasten", "ansicht drehen", "slicer", "bambu studio", "orca", "prusa"],
  "workspace.cameraInertia": ["inertia", "momentum", "smooth", "trägheit", "nachlaufen", "schwung"],
  "workspace.spaceMouse": ["3dconnexion", "space mouse", "spacenavigator", "6dof", "3d maus"],
  "workspace.theme": ["dark mode", "light mode", "night", "colours", "colors", "dunkelmodus", "dunkel", "hell", "nachtmodus", "farbschema", "design"],
  "workspace.fastMode": ["performance", "slow", "speed", "lag", "fps", "graphics", "leistung", "langsam", "ruckeln", "grafik"],
  "workspace.simpleMode": ["kids", "children", "beginner", "school", "kinder", "anfänger", "schule", "einfach"],
  "workspace.backgroundColor": ["background", "colour", "color", "hintergrund", "farbe"],
  "workspace.surfaceColor": ["plate", "bed", "colour", "color", "druckbett", "platte", "farbe"],
  "workspace.edgeLines": ["outline", "wireframe", "contour", "umriss", "konturen"],
  "workspace.holeOpacity": ["transparency", "transparent", "see through", "transparenz", "durchsichtig"],
  "workspace.startInPerspective": ["orthographic", "camera", "orthografisch", "kamera", "perspektive"],
  "workspace.startView": ["home view", "camera", "kamera", "startansicht"],
  "workspace.showShadows": ["shadow", "light", "schatten", "licht"],
  "workspace.lightAzimuth": ["lamp", "sun", "lighting", "lampe", "sonne", "beleuchtung"],
  "workspace.lightElevation": ["lamp", "sun", "lighting", "lampe", "sonne", "beleuchtung"],
  "workspace.overhangAngle": ["support", "supports", "stützen", "stützstruktur"],
  "workspace.booleanTriangleLimit": ["polygons", "mesh", "memory", "polygone", "netz", "speicher"],
  "workspace.toolbarSize": ["ribbon", "icons", "bigger", "smaller", "menüband", "symbole", "größer", "kleiner"],
  "workspace.units": ["inch", "millimetre", "millimeter", "metric", "imperial", "zoll", "metrisch"],
  "workspace.accuracy": ["decimals", "decimal places", "precision", "rounding", "nachkommastellen", "dezimalstellen", "rundung"],
  "workspace.snapGrid": ["snap", "step", "fangen", "einrasten", "schrittweite"],
  "workspace.objectSnap": ["snap", "magnet", "fangen", "einrasten", "magnetisch"],
  "workspace.startWithCornerRuler": ["ruler", "lineal"],
  "workspace.printer": ["build plate", "bed size", "3d printer", "druckbett", "bauraum", "3d drucker"],
  "workspace.printerPlay": ["tolerance", "clearance", "fit", "toleranz", "passung", "spalt"],
  "workspace.size": ["build plate", "bed size", "druckbett", "bauraum"],
  "workspace.gridBlockSize": ["grid", "squares", "raster", "kästchen", "gitter"],
  "workspace.stlAsDownload": ["export", "save", "file", "print", "speichern", "datei"],
  "workspace.lylAsDownload": ["save", "file", "project", "speichern", "datei", "projekt"],
  "workspace.confirmTabClose": ["close", "warning", "leave", "schließen", "warnung", "verlassen"],
  "workspace.savedHistory": ["undo", "steps", "rückgängig", "schritte"],
  "backups.folder": ["backup", "directory", "sicherung", "verzeichnis"],
};
