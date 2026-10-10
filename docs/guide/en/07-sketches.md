---
title: "Sketches: from outline to body"
summary: Draw a flat outline, round or chamfer its corners and pull or spin it into a body.
---

Not everything can be put together from basic shapes. For parts with a contour of their own, such as a bracket, a tooth profile or a vase, you first draw the **outline** and then make a body from it. That is what sketch mode is for.

## Starting a sketch

At the top, switch from {{ui:editor.modeGeometry}} to {{ui:editor.modeSketch}}. Click {{ui:sketch.to3d}} in the ribbon and choose what the outline should become:

- **{{ui:sketch.extrude}}:** The outline is pulled upward, like a cookie cutter.
- **{{ui:sketch.revolve}}:** The outline is spun about an axis, as on a lathe. That gives vases, cups, cones and everything round.

The editor then shows a sheet with a grid. That is your drawing surface.

## Drawing

The ribbon in sketch mode is divided into areas:

- **Draw:** {{ui:sketch.line}} makes straight sections: click points one after another; holding [[Shift]] snaps the new line in 15° steps, horizontal and vertical included. The length and angle of the new line show at the pointer. You can also type how long it should be, see [Lines by numbers](#lines-by-numbers). The {{ui:sketch.bezier}} is shaped with its handles: click a point and drag in the direction the line should carry on, as with the pen tool in Illustrator or Inkscape. The further you drag, the more it bends; the stretch to the new point bends along while you drag, so you see what you get. Dragging while you place a point bends the curve; if you come from Tinkercad and just want to click points, take the {{ui:sketch.smooth}}. The {{ui:sketch.smooth}} lays a flowing path through the points you click. To close the outline, click the first point again at the end.
- **Shapes:** {{ui:sketch.addShape}} offers ready-made outlines: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (a disc with holes), {{ui:sketch.triangle}} and {{ui:sketch.hexagon}}. Pick one and drag a frame.
- **Selection:** {{ui:sketch.select}} moves points and lines. A click inside a closed outline selects the whole outline, so you can drag or resize it straight away; inside a hole it picks the hole. The frame around the selection has eight handles: the corners change width and height together, keeping the proportions while you hold [[Shift]]. The ones on the sides change one direction only. Click the width or height pill to type a new size, also as a sum ("60+12.5") or in percent ("150%"). With [[Shift]] held, a click on a point or line adds it to the selection or takes it away again, so you can pick several and move them together. Drag a box over empty space to select everything in it. A line can be dragged too (it moves by its two ends, or all of the selection if it is part of one). The arrow keys move the selection by one grid step, [[Shift]] with them by a larger one, and [[Shift]] held while you drag keeps the move on one axis. {{ui:sketch.refine}}: a click on a section adds a point, a click on a point removes it. Also there are {{ui:sketch.erase}} and inserting a template image ({{ui:sketch.addImage}}).
- **Clipboard:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} and {{ui:editor.tool.delete}} work on the selected points, lines and images, as in the 3D editor; [[Ctrl]]+[[X]] cuts. Pasted and duplicated geometry lands next to the original with a 10 mm gap, on a free spot where it touches no existing line, so it never gets joined to what is already there. It stays selected, so you can drag it straight into place.
- **History:** {{ui:sketch.undo}} and {{ui:sketch.redo}}.
- **View:** [[F]] fits the whole sketch in the view, [[Shift]]+[[F]] zooms to the selection, as in the 3D editor. The {{ui:camera.tapeTools}} on the side bar measures the distance between two points. The sketch also shows dimensions as soon as you click something: the length of a line, or for a point the lengths of the lines that meet there. The {{ui:sketch.showMeasurements}} button on the side bar hides and shows these dimensions when they get in the way, for example while shaping curves; the tape measure keeps working. On a straight line you can click the dimension pill and type the length in millimetres; [[Enter]] applies it, [[Esc]] cancels. The line keeps its direction, its start point stays where it is, and the lines at the other end follow. With an end point selected, that one moves. [[Alt]]+[[Enter]] grows the line to both sides around its middle. On curves the pill only shows the length.

A body comes only from a **closed** outline.

![An L-shaped outline. At the selected corner point, top left, the lengths of the two lines are shown in millimetres, and the angle between them in degrees.](shot:sketch-outline)

## Lines by numbers

Once you have set the first point with {{ui:sketch.line}} or {{ui:sketch.smooth}}, just type a number: two fields open next to the line, {{ui:sketch.typedLength}} in millimetres and {{ui:sketch.typedAngle}} in degrees. [[<]] or [[Tab]] moves to the angle, so "50<30" gives a line 50 mm long at 30°, as in AutoCAD. [[Enter]] sets the point, and you can type the next line straight away; [[Esc]] closes the fields without ending the line chain.

The angle counts counterclockwise from the right: 0° to the right, 90° up, 180° to the left, 270° down. Leave it empty and the line follows the pointer, so you give only the length and show the direction with the mouse. Sums like "40+12.5" work in both fields. If the point would land off the plate, the field says so and waits for another value.

## Curving a straight side

Select a straight line and click {{ui:sketch.curveLine}} in the bar that appears: the side bows out into a curve, as in Tinkercad, and shows its two handles. Drag them to shape the curve; the further out a handle stands, the stronger the bend. {{ui:sketch.straightenLine}} makes the side straight again. A point you select can be made round with {{ui:sketch.smooth}}: it gets handles of its own and the lines next to it become curves.

![The bottom side of the L-shaped outline bent into a curve, with its two handles at the ends.](shot:sketch-curve)

## Reading and typing angles

Click a corner point where **two straight lines** meet: next to the lengths, layerling shows the **angle** between them in degrees, with a small arc. On a closed outline it is the angle inside the shape, so a dent reads above 180°. Click the value and type a new angle. One of the two lines then turns about the corner and keeps its length, and the other stays where it is. The line that turns is drawn dashed; [[Tab]] switches to the other one, [[Enter]] applies and [[Esc]] cancels. What hangs at the far end of the turned line goes with it.

Moving a point changes three angles: at the point itself and at the two neighbouring corners at the far ends of its lines. So layerling shows those two as well, and each can be clicked and typed. That way you set, say, the bottom left corner to 75.5° while the top left point, which moves for it, is selected. You can calculate here too, e.g. "90-14.5".

A corner shows no angle where a curve meets it, or where more than two lines meet. The {{ui:sketch.showMeasurements}} button on the side bar hides the angle together with the lengths.

## Rounding or chamfering corners

Click a corner point and choose {{ui:sketch.filletCorner}} or {{ui:sketch.chamferCorner}}. A small field appears for the {{ui:sketch.filletRadius}} or the {{ui:sketch.chamferDistance}}. Enter the size and confirm with the check mark. This works for corners between two straight lines.

![The corner at the top left is rounded with a 12 mm radius.](shot:sketch-fillet)

## Making a body from it

Click {{ui:sketch.finishSketch}}. The outline stands as a body on the workplane. In its settings you change the height, the colour and everything else as with any other shape. When you resize it, layerling builds it again from the sketch a moment later, and the sketch grows with it. So it stays an exact body that takes chamfers and fillets, and the next time you edit it the sketch has the size the body has.

If the workplane lies on the side of a body, you draw the way you look at that side: up in the sketch is up on the finished body too. The faint outline of the body in the sketch view shows where it stands. If the workplane cuts through a body, the sketch view shows the outline of that cut instead, so a hollow body appears as a ring and you can line the sketch up with its walls. A point you set or drag close to a corner of these outlines snaps exactly onto it; a small blue ring shows it. That way you take edges of other bodies into the sketch, even when the workplane does not lie exactly on them.

![The outline has become a body. The corner is rounded.](shot:sketch-result)

With {{ui:inspector.editSketch}} you can return to the sketch at any time to change it. A double click on the body does the same, as in Tinkercad (a locked body stays closed); {{ui:workspace.doubleClickOpensSketch}} in the settings switches that off. Edge treatments you already made on the body are lost, though, because the edges are created anew.

### Revolving

When revolving, you draw half the cross-section **to the left of the axis** shown in the sketch. Next to it you see a 3D preview of the revolve. It shows at once what the body will look like. The outline must be closed. At the end click {{ui:sketch.finishRevolve}}.

A revolved body is an exact body, like an extruded one: it takes chamfers and fillets, and you can hollow it, for a cup or a vase. A body revolved with an older layerling is a mesh; open {{ui:inspector.editSketch}} and finish it again to make it exact. A profile that reaches across the axis cannot be built exactly and becomes a mesh, as before.

## Building as a stroke

Normally the area inside a closed outline becomes the body. With {{ui:sketch.stroke}} in the {{ui:sketch.group.finish}} section you build the line itself instead, with a width you set. Tick {{ui:sketch.strokeOn}} in the panel; the sketch shows straight away what comes out.

- A **closed outline** becomes a frame. {{ui:sketch.strokeAlign}} says where the wall lies: {{ui:sketch.strokeAlign.center}} on the drawn line, {{ui:sketch.strokeAlign.inside}} within it or {{ui:sketch.strokeAlign.outside}} outside it. Outside is handy for a tolerance: draw the outline of a hole, a dovetail for instance, and give it a 0.2 mm stroke outside to get the gap the print needs.
- An **open line** becomes a stripe, centred on the line. {{ui:sketch.strokeCap}} sets how its ends look: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (longer by half the width) or {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} applies to both: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} or {{ui:sketch.strokeJoin.bevel}}.

The sketch keeps the drawn line. Open it again and you go on changing line and stroke; untick the box and the area is built again. Curves are broken into short straight pieces for it. A revolve has no stroke.

## Fill and silhouette

You can set the stroke without opening the sketch too: in the properties of a sketch body, choose {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} or {{ui:prop.sketchFill.center}} under {{ui:prop.sketchFill}}, with {{ui:prop.sketchLineWidth}} and {{ui:sketch.strokeJoin}}. The body is built again straight away, where it stands. These match the fill modes of Tinkercad's SVG import: default, outer line and inner line. {{ui:prop.sketchFill.grow}} keeps the area filled and grows it by the line width all round, with sharp, round or bevelled corners: a base layer under a logo for a multicolour print, which the stroke outside alone would only give as a ring.

{{ui:prop.sketchSilhouette}} leaves out every outline lying inside another: holes and whatever lies in them. Only the outer outline stays. Together with {{ui:prop.sketchFill.outside}} it makes a cookie cutter: import an SVG twice, once with the silhouette as an area for the base and once with the silhouette and 1 to 2 mm of stroke outside as the wall. The switch is in the {{ui:sketch.stroke}} panel in sketch mode as well.

Fillets and chamfers on the edges go when the body is built again, as when the sketch is edited.

## A picture as template

With {{ui:sketch.addImage}} you put a photo or a drawing under the sketch and trace it. You can set its size, opacity and position. Once the picture sits right, lock it with [[L]] so you do not move it by accident while drawing. A locked image is out of the way: clicks go through it, so you can pick lines and points on top of it and drag a frame over them. To select it again, for example to unlock it, [[Alt]]+click it. If its settings at the right edge cover the picture, drag them away by their title bar; a double-click on it docks them again.

Under {{ui:sketch.imageAlign}} you line up a photo that was not taken straight:

- **{{ui:sketch.imageRotation}}:** Turn the picture about its centre, with the round handle above its frame or as a number in degrees. With [[Shift]] the handle snaps in 15° steps.
- **{{ui:sketch.centreImageX}}** and **{{ui:sketch.centreImageY}}:** put the picture's centre on X = 0 or Y = 0. For a revolve, X = 0 is the axis, so the picture then lies symmetric about it.
- **{{ui:sketch.calibrateImage}}:** Click two points in the picture whose distance you know, the ends of a ruler or a known diameter, and type the real distance. The picture is scaled evenly so that distance is right; the first point stays where it was.
- **{{ui:sketch.cropImage}}:** The handles on the frame now crop the picture instead of scaling it; what is cut away stays stored and comes back with {{ui:sketch.uncropImage}} or when a handle is pulled out again.

All four touch the reference only, never the sketch.

## Keys in sketch mode

| Key | Effect |
| --- | --- |
| [[Esc]] | end the line chain, clear the selection |
| [[Delete]] | delete the selected element |
| [[Ctrl]]+[[C]] | copy the selection |
| [[Ctrl]]+[[X]] | cut the selection |
| [[Ctrl]]+[[V]] | paste |
| [[Ctrl]]+[[D]] | duplicate the selection |
| [[Ctrl]]+[[Z]] | undo |
| [[Shift]] | while drawing: snap the line in 15° steps; while dragging: keep movement on one axis |
| digit, [[<]], [[Tab]], [[Enter]] | while drawing: type and set the length and angle of the next line |
| [[R]] | rotate the closed sketch by 45° |
| [[L]] | lock or unlock the template image |

> **Tip:** Draw as few points as needed. An outline with a few well-placed points gives a smoother body than a tangle of many.
