// Types for vase-own-picture.mjs: one's own picture or a text as a relief pattern of the vase.

/**
 * A picture as the vase's settings keep it (`patternImage`), the same form as one's own image of a Surface Texture:
 * whole numbers from 2 to OWN_PICTURE_SIZE and width x height grey values (0 to 255, a row at a time from the top) as
 * Base64; light is the raised relief.
 */
export type VaseOwnPicture = { readonly width: number; readonly height: number; readonly data: string };

export const OWN_PICTURE_SIZE: number;
export const OWN_TEXT_LENGTH: number;
export const PICTURE_FITS: Readonly<Record<string, string>>;

/** A picture as the settings may keep it, or null; one that passed comes back as it is. */
export function normalizeOwnPicture(input: unknown): VaseOwnPicture | null;
/** A short name for a picture that changes with any of its points: for the keys of caches. */
export function ownPictureKey(picture: unknown): string;
/** The picture as a tile of the pattern families' kind, or null. */
export function ownPictureTile(input: unknown): { size: number; aspect: number; values: Uint8Array; own: true } | null;
export function ownPicturePlaceholder(u: number, v: number): number;
