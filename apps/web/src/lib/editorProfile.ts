import { sanitizeEdgeModifierSettings } from "@/lib/edgeModifierMemory";

export const EDITOR_PROFILE_ELEMENT_ID = "layerling-editor-profile";
export const EDITOR_PROFILE_MAX_LENGTH = 32_768;

type BooleanOption = { visible?: boolean; default?: boolean; locked?: boolean };

type ToolProfile = {
  visible?: boolean;
  options?: {
    amount?: { default: number };
    onlyVisibleEdges?: BooleanOption;
  };
};

type EditorProfile = {
  version: 1;
  base?: "simple" | "full";
  enlargeInSimpleMode?: boolean;
  tools: Record<string, ToolProfile>;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function boolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function parseEditorProfile(text: string): EditorProfile | null {
  if (text.length > EDITOR_PROFILE_MAX_LENGTH) return null;
  let profile;
  try {
    profile = record(JSON.parse(text));
  } catch {
    return null;
  }
  if (profile?.version !== 1) return null;

  const tools: EditorProfile["tools"] = Object.create(null);
  for (const [id, value] of Object.entries(record(profile.tools) ?? {})) {
    const tool = record(value);
    if (!tool || !/^[a-z][a-z0-9-]{0,63}$/i.test(id)) continue;
    const visible = boolean(tool.visible);
    if (visible !== undefined) tools[id] = { visible };
    if (id !== "fillet") continue;

    const options = record(tool.options);
    const { amount } = sanitizeEdgeModifierSettings({ amount: record(options?.amount)?.default }, "fillet");
    const onlyVisible = record(options?.onlyVisibleEdges);
    const defaultValue = boolean(onlyVisible?.default);
    if (amount !== undefined || onlyVisible) {
      tools[id] = {
        visible,
        options: {
          ...(amount !== undefined ? { amount: { default: amount } } : {}),
          ...(onlyVisible ? {
            onlyVisibleEdges: {
              visible: boolean(onlyVisible.visible),
              default: defaultValue,
              locked: defaultValue !== undefined && onlyVisible.locked === true,
            },
          } : {}),
        },
      };
    }
  }

  const base = profile.base === "simple" || profile.base === "full" ? profile.base : undefined;
  return { version: 1, base, enlargeInSimpleMode: boolean(profile.enlargeInSimpleMode), tools };
}

// The host supplies one profile with the document. It is never copied into browser or project settings.
let startupProfile: EditorProfile | null | undefined;

export function getEditorProfile() {
  if (typeof document === "undefined") return null;
  if (startupProfile === undefined) {
    const element = document.getElementById(EDITOR_PROFILE_ELEMENT_ID);
    if (!element && document.readyState === "loading") return null;
    startupProfile = element?.getAttribute("type") === "application/json"
      ? parseEditorProfile(element.textContent ?? "")
      : null;
  }
  return startupProfile;
}

export function profileToolVisible(profile: EditorProfile | null, id: string, fallback: boolean) {
  return profile?.tools[id]?.visible ?? fallback;
}

export function profileBooleanValue(option: BooleanOption | undefined, remembered: boolean | undefined) {
  return option?.locked ? option.default : remembered ?? option?.default;
}
