import { getLanguage, localizedText } from "@/lib/i18n";

const messages = {
  selectSolid: {
    de: "Gewindeeinsatz: Bitte genau einen festen Körper auswählen.",
    en: "Thread insert: Select exactly one solid body.",
  },

  closeOtherTool: {
    de: "Bitte zuerst das andere Werkzeug schließen.",
    en: "Please close the other tool first.",
  },

  selectFace: {
    de: "Bitte eine Fläche des ausgewählten Körpers anklicken.",
    en: "Please click a face of the selected body.",
  },

  partChangedRecheck: {
    de: "Bauteil wurde verändert. Bohrstelle wird neu geprüft.",
    en: "The part has changed. The hole position is being checked again.",
  },

  partChangedDuring: {
    de: "Bauteil wurde inzwischen verändert.",
    en: "The part has changed in the meantime.",
  },

  chooseNewPosition: {
    de: "Bauteil geändert: Bohrstelle bitte neu wählen.",
    en: "Part changed: Please choose a new hole position.",
  },

  holeCreated: {
    de: "Gewindebohrung {name} Ø {d3} mm, L {L} mm",
    en: "Thread insert hole {name} Ø {d3} mm, L {L} mm",
  },

} as const;

type DinguinUiKey = keyof typeof messages;

export function dinguinUiText(
  key: DinguinUiKey,
  values?: Record<string, string | number>,
): string {
  let result = localizedText(messages[key], getLanguage());

  if (values) {
    for (const [name, value] of Object.entries(values)) {
      result = result.split("{" + name + "}").join(String(value));
    }
  }

  return result;
}