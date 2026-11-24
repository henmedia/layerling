import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { isPictureFile, pictureHasTransparentEdge, picturePixels, pictureShapePart, svgEmbeddedPicture } from "@/lib/pictureIcon";
import { pattiesMotifFromRings } from "@/lib/pattiesMotifShapes";
import { traceRasterRings, type RasterPixels } from "@/lib/rasterTrace";
import { parseSvgForImport, svgProfilePaths } from "@/lib/svgImport";

/**
 * Patties: a figure of one's own for the motif pattern, read from a file. An SVG gives its filled outlines as they
 * are drawn; a PNG or JPG is traced the way the picture import traces it - on a transparent background everything
 * that is not transparent, otherwise the part that is not the background. What comes out is the motif as the plate
 * stores it (pattiesMotifShapes.ts): outer outlines only, inside a circle of radius 1.
 */

export const PATTIES_MOTIF_FILE_ACCEPT = ".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg";

/** How many straight pieces a curve of a drawing is read in; the motif is thinned out to its points afterwards. */
const CURVE_PIECES = 16;
/** How many line pieces a traced picture may have before it is thinned out. */
const TRACE_PIECES = 800;

/** The motif of a drawing: the outer outline of everything it fills. Null when it fills nothing. */
export function pattiesMotifFromSvg(source: string): number[][] | null {
  const shapes = svgProfilePaths(parseSvgForImport(source).paths).flatMap((path) => SVGLoader.createShapes(path));
  const rings = shapes.map((shape) => shape.getPoints(CURVE_PIECES).map((point) => ({ x: point.x, y: point.y })));
  return pattiesMotifFromRings(rings, true);
}

/** The motif of a picture: the outline of its shape, traced. Null when the picture shows no shape. */
export function pattiesMotifFromPicture(pixels: RasterPixels): number[][] | null {
  const traced = traceRasterRings(pixels, pictureHasTransparentEdge(pixels)
    ? { byOpacity: true, maxSegments: TRACE_PIECES }
    : { part: pictureShapePart(pixels), maxSegments: TRACE_PIECES });
  return pattiesMotifFromRings(traced.rings, true);
}

/** The motif of a file, an SVG, a PNG or a JPG; null when no outline could be read from it. */
export async function pattiesMotifFromFile(file: File): Promise<number[][] | null> {
  try {
    if (isPictureFile(file)) return pattiesMotifFromPicture(await picturePixels(file));
    const text = await file.text();
    // An SVG that only wraps a picture is traced like the picture.
    const embedded = svgEmbeddedPicture(text);
    if (embedded) return pattiesMotifFromPicture(await picturePixels(embedded));
    return pattiesMotifFromSvg(text);
  } catch {
    return null;
  }
}
