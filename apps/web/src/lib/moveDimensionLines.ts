import { formatLengthMm } from "@/lib/measurementUnits";

/** "lift" is the way up or down along the lift arrow (#979), shown as Z. */
export type MoveDimensionAxis = "x" | "z" | "lift";

/** The axis name the user sees: inside z is Y, counting towards the back (#182), and up is Z. */
export function moveDimensionAxisName(axis: MoveDimensionAxis) {
  return axis === "lift" ? "Z" : axis === "z" ? "Y" : "X";
}

export type MoveDimensionScreenPoint = {
  x: number;
  y: number;
};

export type MoveDimensionLine = {
  axis: MoveDimensionAxis;
  value: number;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
};

export type MoveDimensionGuide = {
  axis: MoveDimensionAxis;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type MoveDimensionOverlayData = {
  width: number;
  height: number;
  lines: MoveDimensionLine[];
  guides: MoveDimensionGuide[];
};

type MoveDimensionWorldPoint = {
  x: number;
  y: number;
  z: number;
};

/** A lift with the arrow: from `start`, `delta` along `axis`; `side` is a point the label keeps away from. */
export type MoveDimensionLift = {
  start: MoveDimensionWorldPoint;
  axis: MoveDimensionWorldPoint;
  delta: number;
  side: MoveDimensionWorldPoint;
};

type CreateMoveDimensionOverlayOptions = {
  originX: number;
  originZ: number;
  planeY: number;
  deltaX: number;
  deltaZ: number;
  lift?: MoveDimensionLift | null;
  accuracy: number;
  width: number;
  height: number;
  project: (point: MoveDimensionWorldPoint) => MoveDimensionScreenPoint;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatMoveDimension(value: number, accuracy: number) {
  return formatLengthMm(value, accuracy);
}

export function dimensionLabelPosition(
  origin: MoveDimensionScreenPoint,
  endpoint: MoveDimensionScreenPoint,
  otherEndpoint: MoveDimensionScreenPoint,
  hasOtherDimension: boolean,
  width: number,
  height: number,
) {
  const midpoint = {
    x: (origin.x + endpoint.x) / 2,
    y: (origin.y + endpoint.y) / 2,
  };
  const dx = endpoint.x - origin.x;
  const dy = endpoint.y - origin.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normal = { x: -dy / length, y: dx / length };
  const towardOther = (otherEndpoint.x - midpoint.x) * normal.x + (otherEndpoint.y - midpoint.y) * normal.y;
  const side = hasOtherDimension && Math.abs(towardOther) > 0.5
    ? towardOther >= 0 ? -1 : 1
    : 1;
  const offset = 30;

  return {
    x: clamp(midpoint.x + normal.x * offset * side, 48, Math.max(48, width - 48)),
    y: clamp(midpoint.y + normal.y * offset * side, 24, Math.max(24, height - 24)),
  };
}

export function dimensionLineStart(origin: MoveDimensionScreenPoint, endpoint: MoveDimensionScreenPoint) {
  const dx = endpoint.x - origin.x;
  const dy = endpoint.y - origin.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const overrun = 12;
  return {
    x: origin.x - (dx / length) * overrun,
    y: origin.y - (dy / length) * overrun,
  };
}

export function createMoveDimensionOverlay({
  originX,
  originZ,
  planeY,
  deltaX,
  deltaZ,
  accuracy,
  width,
  height,
  lift,
  project,
}: CreateMoveDimensionOverlayOptions): MoveDimensionOverlayData | null {
  const zeroThreshold = 0.5 * 10 ** -accuracy;
  const safeScreenPoint = (point: MoveDimensionScreenPoint) => ({
    x: Number.isFinite(point.x) ? point.x : width / 2,
    y: Number.isFinite(point.y) ? point.y : height / 2,
  });

  if (lift) {
    if (Math.abs(lift.delta) < zeroThreshold) {
      return null;
    }
    const origin = safeScreenPoint(project(lift.start));
    const endpoint = safeScreenPoint(project({
      x: lift.start.x + lift.axis.x * lift.delta,
      y: lift.start.y + lift.axis.y * lift.delta,
      z: lift.start.z + lift.axis.z * lift.delta,
    }));
    // The label sits on the side away from the body, so it does not cover what was lifted.
    const label = dimensionLabelPosition(origin, endpoint, safeScreenPoint(project(lift.side)), true, width, height);
    const start = dimensionLineStart(origin, endpoint);
    return {
      width,
      height,
      lines: [{
        axis: "lift",
        value: lift.delta,
        label: formatMoveDimension(lift.delta, accuracy),
        x1: start.x,
        y1: start.y,
        x2: endpoint.x,
        y2: endpoint.y,
        labelX: label.x,
        labelY: label.y,
      }],
      guides: [],
    };
  }

  if (Math.abs(deltaX) < zeroThreshold && Math.abs(deltaZ) < zeroThreshold) {
    return null;
  }

  const origin = safeScreenPoint(project({ x: originX, y: planeY, z: originZ }));
  const xEndpoint = safeScreenPoint(project({ x: originX + deltaX, y: planeY, z: originZ }));
  const zEndpoint = safeScreenPoint(project({ x: originX, y: planeY, z: originZ + deltaZ }));
  const currentAnchor = safeScreenPoint(project({ x: originX + deltaX, y: planeY, z: originZ + deltaZ }));
  const lines: MoveDimensionLine[] = [];
  const guides: MoveDimensionGuide[] = [];
  const hasXDimension = Math.abs(deltaX) >= zeroThreshold;
  const hasZDimension = Math.abs(deltaZ) >= zeroThreshold;

  if (hasXDimension) {
    const label = dimensionLabelPosition(origin, xEndpoint, zEndpoint, hasZDimension, width, height);
    const start = dimensionLineStart(origin, xEndpoint);
    lines.push({
      axis: "x",
      value: deltaX,
      label: formatMoveDimension(deltaX, accuracy),
      x1: start.x,
      y1: start.y,
      x2: xEndpoint.x,
      y2: xEndpoint.y,
      labelX: label.x,
      labelY: label.y,
    });
    if (Math.hypot(currentAnchor.x - xEndpoint.x, currentAnchor.y - xEndpoint.y) >= 1) {
      guides.push({
        axis: "x",
        x1: xEndpoint.x,
        y1: xEndpoint.y,
        x2: currentAnchor.x,
        y2: currentAnchor.y,
      });
    }
  }

  if (hasZDimension) {
    const label = dimensionLabelPosition(origin, zEndpoint, xEndpoint, hasXDimension, width, height);
    const start = dimensionLineStart(origin, zEndpoint);
    lines.push({
      axis: "z",
      // Shown as Y, counting towards the back (#182); inside it is z, towards the viewer.
      value: -deltaZ || 0,
      label: formatMoveDimension(-deltaZ || 0, accuracy),
      x1: start.x,
      y1: start.y,
      x2: zEndpoint.x,
      y2: zEndpoint.y,
      labelX: label.x,
      labelY: label.y,
    });
    if (Math.hypot(currentAnchor.x - zEndpoint.x, currentAnchor.y - zEndpoint.y) >= 1) {
      guides.push({
        axis: "z",
        x1: zEndpoint.x,
        y1: zEndpoint.y,
        x2: currentAnchor.x,
        y2: currentAnchor.y,
      });
    }
  }

  return lines.length > 0 ? { width, height, lines, guides } : null;
}
