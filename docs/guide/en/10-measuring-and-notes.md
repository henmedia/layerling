---
title: Measuring and notes
summary: Tape measure, ruler and framing square, distances to the origin, notes that stay attached to a part, and reference points that things snap to.
---

To build a part exactly, you need to measure. layerling has several tools for that. None of them ends up in an export. Wall thickness and gaps inside a part are best measured in the [section view](chapter:view-and-workplane) with {{ui:camera.sectionMeasure}}.

## The tape measure

The tape measure sits at the lower end of the camera bar on the left edge ({{ui:camera.tapeTools}}). It measures distances between corners, edges and faces. A click on it opens five buttons. If they cover what you want to measure, drag them by the grip on the left anywhere on the workplane; a double-click on the grip puts them back:

![The tape measure with its buttons: add measurement, move measuring points, remove measurement, whole edges, delete all measurements.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Click one point, drag to the next and click it. The distance is labelled, with the axes it runs along in front: X, Y or Z for a straight one, XY, XZ or YZ across a plane, 3D for all three. Hover over the label to see how far it reaches along each axis, over a point to see its coordinates. While you place the second point, the axes, the distance and the reach along each axis show beside the pointer. A measurement that lies mostly behind another body fades; hovering its line or label brings it back. On an opposing edge or face, the second point snaps in at a right angle to the first when the pointer comes near - or anywhere on that edge or face while you hold [[Shift]]. Along the same face or on the workplane, [[Shift]] keeps the measurement straight along the main axis.
2. **{{ui:camera.moveMeasurement}}:** Grab the points and move them, the number follows.
3. **{{ui:camera.deleteMeasurement}}:** Afterwards click a measurement to remove it. While **{{ui:camera.addMeasurement}}** is active, holding [[Shift]] or [[Ctrl]] ([[Cmd]] on a Mac) and clicking a measurement point or line deletes it right away without switching modes.
4. **{{ui:camera.tapeWholeEdges}}:** A click on an edge measures all of it, the length of a circle for example. With this switched off, a click puts a point on the edge instead, and the second point goes anywhere, so you can measure the diameter or any other distance. [[Alt]] turns the switch round for one click. On a circle, the point across from the first one snaps in when the pointer comes near, and the points sit on the true circle, so the diameter comes out exact.
5. **{{ui:camera.deleteAllMeasurements}}:** Removes every measurement at once. Because this cannot be undone, layerling asks first; with no measurements there is nothing to do.
6. **{{ui:camera.tapeMarkMiddle}}:** In the middle of every measurement sits a small round mark, its lower half filled. It puts a [reference point](#reference-points) in the middle of the measurement: after a click on a round edge, such as the rim of a hole, in the centre of that circle - on an imported mesh too, where nothing else marks the middle of a hole - and for a diameter or any straight measurement halfway along it. A shape you drag then snaps to the point with its centre. A point that is there already is not made twice. The tape measure snaps to a reference point like to a corner, so you can measure from the centre of a circle or from the middle of a line: mark it, then click the point.
7. **{{ui:camera.tapeTypeLength}}:** When at least one end of a straight measurement sits on a body, its number can be clicked. Type a new length and press [[Enter]]: the body at the second point moves along the measured line until the distance is exactly that, as with the ruler in Tinkercad. If only the body at the first point is selected, that one moves instead. The measuring points stay on the body, so the measurement follows. Measure from a corner, an edge or a [reference point](#reference-points), such as the centre of a circle, to place parts at an exact distance. A negative length takes it that far past the first point, say 5 mm inside the edge of a box.

[[Esc]] leaves measuring mode.

## The ruler

You fetch the {{ui:shape.ruler}} from the shape library. It is purely a measuring tool: it appears in no export and can neither be grouped nor cut. For every body that touches or overlaps the ruler, it shows the extent as a floating number right in the view. You can change that number right there, and the body follows. Stand the ruler up or tip it, and it measures along its own direction: upright beside a body it shows the body's height. The floating plus symbol creates a copy of the measured shape; it is there while the ruler lies flat. Its printed scale is in millimetres along one long edge, with the tens numbered, and in inches along the other, with a line every sixteenth of an inch and the whole inches numbered. The scale of the unit you work in (the switch at the bottom right) runs along the top edge; a ruler narrower than 15 mm carries only that one.

## The framing square

Sometimes you measure better at a right angle. Click {{ui:camera.cornerRulerTool}} in the camera bar and then the workplane. A framing square with two arms at a right angle, with tick marks like a try square, is placed there. It has no body of its own either. Click close to the corner of a body, and its corner snaps exactly there. The design keeps the square where you set it, also in a saved .lyl file: when you open the design again, it is in the same place, turned the same way and measuring from the same points, until you remove it.

The framing square lies on the workplane. If that sits on the side of a body, the square lies on that side too, see [View and workplane](chapter:view-and-workplane). That is how you dimension on a vertical wall: put the workplane on the wall, place the square at its top left corner and click the handle until the arms point right and down.

- **Dragging the handle** moves it.
- **A short click on the handle** turns it by 90°.
- **The ×** beside it removes it.
- **The small button left of the handle** switches what is measured from: the outside of a body (endpoint, an icon with lines) or its middle (midpoint, a crosshair). A small switch of the same kind sits beside each green number and sets that number alone: for a standing cylinder the middle in the two arms and the bottom in height, for a lying one the middle across and an end along. When all three agree again, the button at the handle shows the common mode.

If bodies stand at one of the arms, the framing square shows their dimensions automatically, selected or not: bodies inside the square, beside an arm or across it. A body outside it, behind the corner or beside an arm from the outside, gets none. That works on the base plate only, not on the side of a body. The button with the arrow under the square's handle switches that off, so that only the selected bodies show their dimensions; it is kept with the design.

When you select a body, the framing square shows in green how far it is from the corner, along both arms and in height. Click a green number to type a distance, and the body moves exactly there. With several bodies selected, they count as one: the ruler measures their shared outline, and a typed value moves them all together without changing their positions relative to each other.

The guide lines of the green numbers run along the floor, the plane the framing square lies in, to the point below or beside the body; the height has its own arrow. The switch of each number sits in the frame of the number. The arms and the ticks are lines in the room: a body in front of them hides them, as a real square would be hidden. The small eye below the handle switches that: with the eye struck through, bodies hide the square (the start); with the eye open, the square stays in view over everything. The numbers on the arms fade where a body stands in front of them.

With the midpoint, the green numbers count to the middle of the body, in height as well. That way you place a sphere with its centre exactly 15 mm from an edge, without subtracting the radius. On a wall you place a hole 40 mm from the left and 190 mm from the top like this: select the hole, switch to midpoint, type 40 and 190. The height there counts outward from the wall.

Both the tape measure and the framing square stay where they are while you sketch and come back to the 3D view. Neither is in the history. The framing square is kept with the design, and so are the measurements of the tape measure, in the browser and in the .lyl file: they are there again when you open the design. The eye button among the tape measure's buttons hides all measurements and shows them again; whether they are hidden is kept as well, and adding, moving or deleting a measurement shows them first.

## Distances to the origin and while moving

In the settings under {{ui:workspace.appearance}} there are two switches for live dimensions:

- {{ui:workspace.showMoveDimensions}} shows by how much you move while dragging. That includes lifting with the black arrow above a body; the way up or down shows at its front corner. Once you let go, click such a number and type the exact distance; a minus goes down.
- {{ui:workspace.showOriginDimensions}} shows the distances of the selection to the origin of the plate, also with several selected bodies.

With {{ui:workspace.dimensionsAlwaysVisible}} the dimensions stay visible permanently. A body that does not stand on the workplane also shows its height above it; click the number to type a new one.

For a moment without them, press [[Q]]: the sizes and distances around the selection disappear, so a part you move is easy to see. [[Q]] again brings them back. A handle you point at still shows its size.

## Notes

A note records what the geometry does not say: "This screw is 0.3 mm too tight", "print the lid yet", "dimension from Peter". Place one with {{ui:editor.tool.note}} or the [[N]] key.

- If you place the note **on a body**, it travels with it.
- If you place it **beside**, it stays on the workplane ({{ui:note.free}}).
- {{ui:note.detach}} releases an attached note from the body.
- {{ui:editor.tool.group}} takes an attached note into the group; {{ui:editor.tool.ungroup}} hands it to the visible part under it, a group inside included. While a group is open with {{ui:group.edit}}, its notes move with the part under them and go back to the group with {{ui:group.done}}; cancelling puts them back as they were.
- If its body is deleted, or no visible body is under it any more, the note stays where it stood, on the workplane.
- Dragging the pin moves the note. A click on the pin folds the card away, only the small number stays; another click opens it again. A click into the text edits it.
- While you write, [[Enter]] keeps the text and [[Esc]] puts it back to how it was before you started; [[Shift]]+[[Enter]] starts a new line.
- **In a sketch**, {{ui:editor.tool.note}} (under {{ui:editor.group.manage}}) or [[N]] places a note too, anywhere on the sketch. All of a sketch's notes belong to its body: in the 3D view they sit on it, on the top of an extruded or swept body and on the drawn profile of a revolved one, and move with it. When you open the sketch again it shows the body's notes, including those placed in 3D. In the sketch, Undo takes back a note like a line, and {{ui:sketch.cancel}} discards what you changed in the notes. [[Shift]]+[[N]] shows or hides the notes here too.

Notes are saved in the design, appear in no export and can be shown or hidden with {{ui:visibility.notes}} (in {{ui:editor.visibilityOptions}}, the arrow beside the eye icon) or with [[Shift]]+[[N]].

## Reference points

A reference point is a bare mark in space, like a pencil mark or a layout point in a workshop: it belongs to no body, is never printed, and other things snap to it. Right-click a body and choose {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} or {{ui:contextMenu.markMidpoints}}: the points appear on the top face of the body (of the whole selection, if you selected several). {{ui:contextMenu.markFaceCenter}} puts one in the middle of the flat face you right-clicked instead, on a side or an end, say. With a pivot set, {{ui:contextMenu.markPivot}} puts one exactly on it, so another part's centre snaps to the point the selection turns about.

- Drag a point to move it: it snaps to the corners, the middles of the edges and faces of bodies, to their real corners and to other points; hold [[Alt]] to let it go free. Or click it to see its coordinates and type new ones; they use the unit you set. Each card can be dragged away by its title if it covers something, on its own: the others stay where they are, and a double-click on the title puts it back. The card you touched last stands in front of the others. **Delete all** in a card, or **Delete all reference points** in the right-click menu (of a body, or of an empty spot of the 3D view), deletes every point at once. {{ui:common.delete}} removes it.
- The tape measure can mark a point too: {{ui:camera.tapeMarkMiddle}}, the half-filled mark in the middle of a measurement, puts one in its middle, in the centre of a round hole for example. And it measures from a point: the tape snaps to reference points like to corners.
- When you drag a shape, its edges and its centre snap to a point, like they snap to other shapes ({{ui:workspace.objectSnap}}). The framing square snaps to points too.
- Points are saved in the design, appear in no export, and are shown or hidden together with the notes by {{ui:visibility.notes}} ([[Shift]]+[[N]]).
- An AI can mark, list and remove them with `layerling_add_reference_points`, `layerling_list_reference_points` and `layerling_remove_reference_points`.

## Reference images

A reference image is a picture to line parts up on: lay a photo of a circuit board on the floor of its case, and place the standoffs, holes and connector cut-outs right on it. It is a guide, not a body: it is never printed, never exported (STL, 3MF, OBJ, STEP, SVG), never part of a group, a bundle or a cut, and the print estimate leaves it out.

- Open {{ui:editor.import}} and choose {{ui:import.referenceImage}}, then a PNG, JPG, WebP, GIF or BMP picture. It lands on the workplane - on the plate, or on the face you set the workplane on - with its longer side 100 mm, half see-through.
- Move, turn and resize it with its handles like any shape. A body in front of it is picked first, so working on top of it does not grab the picture.
- {{ui:referenceImage.seeThrough}} in its settings fades it from solid to barely there.
- {{ui:referenceImage.calibrate}} gives it its true size, as in the sketch: click two points on the picture whose real distance you know - two mounting holes of the board, say - and type that distance in {{ui:referenceImage.distance}}. The picture keeps its proportions and its middle.
- Lock it with the lock in the header of its settings, and it stays put: clicks then go through it to the plate. Pick it in the object list to unlock it.
- The picture is saved once in the design file, however often it is copied or undone. A large picture makes the file larger by as much; the message when you add it says how large it is.
- An AI adds, moves, calibrates, fades and locks one with `layerling_reference_image`.
