---
title: Measuring and notes
summary: Tape measure, ruler and framing square, distances to the origin, and notes that stay attached to a part.
---

To build a part exactly, you need to measure. layerling has several tools for that. None of them ends up in an export.

## The tape measure

The tape measure sits at the lower end of the camera bar on the left edge ({{ui:camera.tapeTools}}). It measures distances between corners, edges and faces. A click on it opens three buttons. If they cover what you want to measure, drag them by the grip on the left anywhere on the workplane; a double-click on the grip puts them back:

![The tape measure with its three buttons: add measurement, move measuring points, remove measurement.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Click one point, drag to the next and click it. The distance is labelled.
2. **{{ui:camera.moveMeasurement}}:** Grab the points and move them, the number follows.
3. **{{ui:camera.deleteMeasurement}}:** Afterwards click a measurement to remove it.

[[Esc]] leaves measuring mode.

## The ruler

You fetch the {{ui:shape.ruler}} from the shape library. It is purely a measuring tool: it appears in no export and can neither be grouped nor cut. For every body that touches or overlaps the ruler, it shows the extent as a floating number right in the view. You can change that number right there, and the body follows. The floating plus symbol creates a copy of the measured shape.

## The framing square

Sometimes you measure better at a right angle. Click {{ui:camera.cornerRulerTool}} in the camera bar and then the workplane. A framing square with two arms at a right angle, with tick marks like a try square, is placed there. It has no body of its own either.

- **Dragging the handle** moves it.
- **A short click on the handle** turns it by 90°.
- **The ×** beside it removes it.

If bodies stand at one of the arms, the framing square shows their dimensions automatically.

When you select a body, the framing square shows in green how far it is from the corner, along both arms and in height. Click a green number to type a distance, and the body moves exactly there. With several bodies selected, they count as one: the ruler measures their shared outline, and a typed value moves them all together without changing their positions relative to each other.

## Distances to the origin and while moving

In the settings under {{ui:workspace.appearance}} there are two switches for live dimensions:

- {{ui:workspace.showMoveDimensions}} shows by how much you move while dragging.
- {{ui:workspace.showOriginDimensions}} shows the distances of the selection to the origin of the plate, also with several selected bodies.

With {{ui:workspace.dimensionsAlwaysVisible}} the dimensions stay visible permanently.

## Notes

A note records what the geometry does not say: "This screw is 0.3 mm too tight", "print the lid yet", "dimension from Peter". Place one with {{ui:editor.tool.note}} or the [[N]] key.

- If you place the note **on a body**, it travels with it.
- If you place it **beside**, it stays on the workplane ({{ui:note.free}}).
- {{ui:note.detach}} releases an attached note from the body.
- Dragging moves the note, a click opens it for editing.

Notes are saved in the design, appear in no export and can be shown or hidden with {{ui:visibility.notes}}.
