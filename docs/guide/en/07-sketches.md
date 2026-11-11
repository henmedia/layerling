---
title: "Sketches: from outline to body"
summary: Draw a flat outline, round or chamfer its corners and pull or spin it into a body.
---

Not everything can be put together from basic shapes. For parts with a contour of their own, such as a bracket, a tooth profile or a vase, you first draw the **outline** and then make a body from it. That is what sketch mode is for.

## Starting a sketch

At the top, switch from {{ui:editor.modeGeometry}} to {{ui:editor.modeSketch}}. In the {{ui:sketch.group.create}} group of the ribbon, three buttons stand side by side for what the outline should become:

- **{{ui:sketch.extrude}}:** The outline is pulled upward, like a cookie cutter.
- **{{ui:sketch.revolve}}:** The outline is spun about an axis, as on a lathe. That gives vases, cups, cones and everything round.
- **{{ui:sketch.sweep}}:** The outline is pulled along a path: a cable channel that turns a corner, a conduit, a ring round a shape. See Sweeping along a path below.

The editor then shows a sheet with a grid. That is your drawing surface.

The sketch lies on the workplane. To draw on a face of a body, for an outline that should start higher up, say, first put the workplane on that face with [[W]] (see [View and workplane](chapter:view-and-workplane)), then start the sketch.

## Drawing

The ribbon in sketch mode is divided into areas. Below, each tool has a card of its own: what you do, one step to a line, and after an arrow what happens then. The key on the right of a card picks the tool.

### Drawing tools

::: icon=line {{ui:sketch.line}} | [[1]]
Click points one after another.
Hold [[Shift]] to snap the new line in 15° steps, horizontal and vertical included.
=> The length and angle of the new line show at the pointer.
To type how long it should be, see [Lines by numbers](#lines-by-numbers).
> Every point you click lands on the snap grid set under {{ui:inspector.snapGrid}}. With [[Shift]] held the 15° step comes first: the length still goes in grid steps, but the end can lie between the grid lines.
:::

::: icon=arc {{ui:sketch.arc}}
Click the two ends of the arc.
Click a third point the arc runs through.
=> Until that third click a preview follows the pointer, and the message names the radius.
=> An end clicked on an existing point joins it, so an arc can close an outline.
[[Esc]] drops the points clicked so far and goes back to {{ui:sketch.select}}.
> Once drawn, the arc is ordinary geometry made of points and curves: move, cut or erase it like any other line.
:::

::: icon=bezier {{ui:sketch.bezier}} | [[2]]
Click a point and drag in the direction the line should carry on, as with the pen tool in Illustrator or Inkscape.
=> The further you drag, the more it bends.
=> The stretch to the new point bends along while you drag, so you see what you get.
> Coming from Tinkercad and just want to click points? Take the {{ui:sketch.smooth}}.
> The first stretch only bends at its start if you drag at the first point too. Just clicked, the line leaves that point straight; to bend it later, select the point with {{ui:sketch.select}} and drag its handle.
:::

::: icon=smooth {{ui:sketch.smooth}} | [[3]]
Click points one after another.
=> It lays a flowing path through the points you click.
> At the two ends of an open line the curve heads straight for the next point, so the first and the last stretch bend less than the others. To bend one more, select its end point with {{ui:sketch.select}} and drag its handle. In a closed outline every point bends alike.
:::

::: Closing or ending a line
To close the outline, click the first point again at the end.
To end the chain of lines without closing the outline, right-click without moving the pointer, or double-click the last point.
=> A body comes only from a **closed** outline.
:::

::: icon=freehand {{ui:sketch.freehand}} | [[5]]
Draw with the pen, a finger or the mouse, as on paper.
=> When you lift it, the line becomes ordinary points: a corner where it turned sharply, smooth points in between, only as many as the shape needs, so each can be dragged afterwards.
Zoom in for fine detail: the closer you look, the more closely the line follows your hand.
=> A line that ends where it began closes into an outline that can become a body; an open one stays a line, for {{ui:sketch.stroke}} or as a path to sweep along.
Start on lines or on a template picture to trace a picture by hand.
Begin or end a stroke at an open end to carry that line on, so a shape can be drawn in several strokes.
> The stroke does not keep to the snap grid, so that it follows your hand. A point you drag afterwards does snap to it, unless {{ui:inspector.snapGrid}} is switched off.
:::

> The digits pick a tool as long as no line is being drawn; while one is, they are its length (see below). With {{ui:sketch.select}} and lines or points selected, the same keys change them instead: [[1]] makes lines straight and points corners, [[2]] turns lines into curves and [[3]] makes points smooth. With nothing selected they pick the tool as before.

### Shapes

::: {{ui:sketch.addShape}}
Pick a ready-made outline: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (a disc with holes), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, a {{ui:sketch.polygon}} or a {{ui:sketch.star}}.
Click it to put it at the origin of the sketch, or drag it from the menu to where you want it.
At the bottom of the menu, {{ui:sketch.polygonSides}} sets the number of sides of the polygon and of points of the star, and {{ui:sketch.starInner}} how deep the star's valleys reach in towards the middle (10 to 90 percent of the outer radius).
=> Both apply to the next shape you add.
=> Like every sketch shape they are ordinary corner points afterwards, so you can move, round or chamfer them one by one.
> The rectangle starts with the width and depth set for the box under {{ui:workspace.shapeDefaults}} in the settings, the circle and the ellipse with the width of the cylinder there; without a default of your own, and for the other shapes, they start 20 mm across.
:::

::: Overlapping outlines
Push two closed outlines over each other.
=> They stay two bodies, which merge in the 3D editor; the overlap is not a hole.
=> Moving does not join the lines where they cross, so you can pull the shapes apart again.
Draw a line across others instead, and layerling puts a point at every crossing.
> A hole only comes from an outline lying wholly inside another.
:::

### Select and change

::: icon=select {{ui:sketch.select}}
Click a point or a line and drag it to move it.
Click inside a closed outline to select the whole outline; inside a hole it picks the hole.
=> You can drag or resize it straight away.
Hold [[Shift]] and click to add a point or line to the selection or take it away again, so you can move several together.
Drag a box over empty space to select everything in it.
Drag a line to move it by its two ends, or all of the selection if it is part of one.
The arrow keys move the selection by one grid step, [[Shift]] with them by a larger one.
Hold [[Shift]] while you drag to keep the move on one axis.
:::

::: The frame round the selection
Drag a corner handle to change width and height together; hold [[Shift]] to keep the proportions.
Drag a side handle to change one direction only.
Click the width or height pill to type a new size, also as a sum ("60+12.5") or in percent ("150%").
Drag the curved arrows beyond the corners to turn the whole selection about its middle.
=> The figure over the pointer shows the angle; with [[Shift]] held it moves in steps of 15°.
=> While you turn, a ring appears: with the pointer inside it the turn snaps to 22.5°, outside it goes in whole degrees, whatever the grid.
[[R]] turns a whole closed outline by 45° at each press.
:::

::: The bar above the sketch
{{ui:sketch.keepProportions}} keeps the proportions without [[Shift]]: the corners and sides then stretch both ways alike, and a typed width or height changes the other one too.
=> layerling remembers the switch.
The X and Y fields show where the middle of the selection lies, in mm from the sketch's origin. Type a value to move it there, for a hole exactly 12 mm from the middle, say. Y counts upwards, as in the 3D editor.
With two or more outlines selected, the bar lines them up: left, centred or right, and top, centred or bottom, on the frame round all of them.
=> Each outline moves as a whole and keeps its shape; centred both ways, two circles become a ring.
:::

::: Locking an outline | [[Ctrl]]+[[L]]
Click {{ui:sketch.lockOutline}} in the bar to lock the selected outline, like a locked body in the 3D editor.
=> It can no longer be moved, resized, turned or changed. Its lines turn paler, its points grey, and the frame's handles turn grey and no longer respond.
=> Lines may still start at its corners.
=> When outlines are lined up, a locked one stays where it is and the others line up on it.
To free it, click the padlock in its corner while it is selected, or click {{ui:sketch.unlockOutline}}.
:::

::: icon=refine {{ui:sketch.refine}} | [[4]]
Click a section to add a point.
Click a point to remove it.
=> layerling joins its two neighbours, so the outline stays closed.
:::

::: icon=erase {{ui:sketch.erase}}
Click a point or a line to take it away.
Drag a window over several to take away everything inside it.
With something selected, the button erases the selection.
To get rid of only a piece of a circle, for a rounded corner say, click exactly that piece of arc between two points.
=> The rest stays.
:::

::: Closing a gap
Drag one open end onto the other, for example after erasing one side of a hexagon.
=> It snaps there and the two become one point, so the outline is closed again.
=> At a crossing, such as where a line cuts a circle, the sides that run straight on are joined: arc with arc, line with line, and the circle stays round.
:::

::: icon=image {{ui:sketch.addImage}}
Put a template picture under the sketch to trace it, see [A picture as template](#a-picture-as-template).
:::

### Clipboard and history

::: Copy, paste, duplicate, delete
{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} and {{ui:editor.tool.delete}} work on the selected points, lines and images, as in the 3D editor; [[Ctrl]]+[[X]] cuts.
=> Pasted and duplicated geometry lands next to the original with a 10 mm gap, on a free spot where it touches no existing line, so it never gets joined to what is already there.
=> It stays selected, so you can drag it straight into place.
{{ui:sketch.undo}} and {{ui:sketch.redo}} take a step back and forward again.
:::

### Notes

::: {{ui:editor.tool.note}} | [[N]]
Click {{ui:editor.tool.note}} under {{ui:sketch.viewControls}}, then click where the note should go: anywhere, on a line too.
Drag the pin to move it; a click on the pin folds the card away.
=> The notes of a sketch belong to its body: in the 3D view they sit on top of an extruded or swept body and on the drawn profile of a revolved one, and they move with it.
=> Opening the sketch again shows all of the body's notes, those placed in 3D too.
{{ui:sketch.undo}} takes back a note like a line, and {{ui:sketch.cancel}} discards what changed in the notes.
> More in the chapter [Measuring and notes](chapter:measuring-and-notes).
:::

### View and dimensions

::: Moving the view
Pan with the middle mouse button, or with [[Shift]] or [[Ctrl]] plus the right mouse button, as in the 3D editor.
With nothing selected, [[Ctrl]] and the arrow keys slide it too: a tenth of the view a press, half with [[Shift]] as well; the sketch moves the way they point.
[[Home]] fits the whole sketch in the view, [[F]] zooms to the selection (with nothing selected, to the whole sketch), and [[+]] and [[−]] zoom in and out, as in the 3D editor.
With nothing selected, double-click an empty spot to slide it to the middle of the view.
> {{ui:workspace.doubleClickCentersView}} in the settings switches the double-click off.
:::

::: Dimensions
Click a line or a point.
=> The sketch shows the length of the line, or for a point the lengths of the lines that meet there.
{{ui:sketch.showMeasurements}} on the sketch toolbar hides and shows these dimensions when they get in the way, for example while shaping curves.
The {{ui:camera.tapeTools}} on the sketch toolbar measures the distance between two points; it keeps working with the dimensions hidden.
:::

![An L-shaped outline. At the selected corner point, top left, the lengths of the two lines are shown in millimetres, and the angle between them in degrees.](shot:sketch-outline)

::: Typing a length
Click the dimension pill of a straight line and type the length in millimetres.
[[Enter]] applies it, [[Esc]] cancels.
=> The line keeps its direction, its start point stays where it is, and the lines at the other end follow. With an end point selected, that one moves.
[[Alt]]+[[Enter]] grows the line to both sides around its middle instead.
=> On curves the pill only shows the length.
:::

## Lines by numbers

Once you have set the first point with {{ui:sketch.line}} or {{ui:sketch.smooth}}, just type a number: two fields open next to the line, {{ui:sketch.typedLength}} in millimetres and {{ui:sketch.typedAngle}} in degrees. [[<]] or [[Tab]] moves to the angle, so "50<30" gives a line 50 mm long at 30°, as in AutoCAD. [[Enter]] sets the point, and you can type the next line straight away; [[Esc]] closes the fields without ending the line chain.

The angle counts counterclockwise from the right: 0° to the right, 90° up, 180° to the left, 270° down. Leave it empty and the line follows the pointer, so you give only the length and show the direction with the mouse. Sums like "40+12.5" work in both fields. If the point would land off the plate, the field says so and waits for another value.

## Curving a straight side

Select a straight line and click {{ui:sketch.curveLine}} in the bar that appears: the side bows out into a curve, as in Tinkercad, and shows its two handles. Drag them to shape the curve; the further out a handle stands, the stronger the bend. Under the pointer a handle turns orange, and it also catches a click just beside it, so a template image underneath does not move by mistake. {{ui:sketch.straightenLine}} makes the side straight again. A point you select can be made round with {{ui:sketch.smooth}}: it gets handles of its own and the lines next to it become curves. With three or more points selected, {{ui:sketch.curveThroughPoints}} in the bar lays one flowing curve from the first of them to the last, through every point in between, the way the {{ui:sketch.smooth}} tool draws one; the lines beyond the two ends stay as they are. Other programs call this "Fit curve" or "Fit point spline". The two differ: {{ui:sketch.curveLine}} bends each selected side on its own and keeps the corners between them, for an arch on one side; {{ui:sketch.curveThroughPoints}} runs one curve through the points with no corners left, for smoothing a jagged traced edge. Click a handle and it lights up: the arrow keys then move it by one grid step, with [[Shift]] by a larger step, so you can set a curve precisely.

Values can be typed too. A selected point shows {{ui:sketch.selectionX}} and {{ui:sketch.selectionY}} in the bar: where it lies, in mm from the sketch's origin, with Y counting up. Click a handle and the bar shows {{ui:sketch.handleX}} and {{ui:sketch.handleY}} instead: where the handle lies from its own point. On a smooth point the opposite handle turns along. Give the matching handle on the other side the same Y and the X with the opposite sign, and the curve comes out exactly mirrored; {{ui:sketch.mirror}} mirrors a whole half at once.

![The bottom side of the L-shaped outline bent into a curve, with its two handles at the ends.](shot:sketch-curve)

## Reading and typing angles

Click a corner point where **two straight lines** meet: next to the lengths, layerling shows the **angle** between them in degrees, with a small arc. On a closed outline it is the angle inside the shape, so a dent reads above 180°. Click the value and type a new angle. One of the two lines then turns about the corner and keeps its length, and the other stays where it is. The line that turns is drawn dashed; [[Tab]] switches to the other one, [[Enter]] applies and [[Esc]] cancels. What hangs at the far end of the turned line goes with it.

A locked point stays where it is, and a typed value works round it: a length moves the free end of the line, and an angle turns the line whose far end is free. A single point can be locked as well: select it and press [[Ctrl]]+[[L]]. That way you can make an outline exact one corner after the other: lock a corner, type the length and the angle of the next line, lock its end, and go on.

Moving a point changes three angles: at the point itself and at the two neighbouring corners at the far ends of its lines. So layerling shows those two as well, and each can be clicked and typed. That way you set, say, the bottom left corner to 75.5° while the top left point, which moves for it, is selected. You can calculate here too, e.g. "90-14.5".

A corner shows no angle where a curve meets it, or where more than two lines meet. The {{ui:sketch.showMeasurements}} button on the sketch toolbar hides the angle together with the lengths.

## Rounding or chamfering corners

Click a corner point and choose {{ui:sketch.filletCorner}} or {{ui:sketch.chamferCorner}}. A small field appears for the {{ui:sketch.filletRadius}} or the {{ui:sketch.chamferDistance}}. Enter the size and confirm with the check mark. This works for corners between two straight lines.

Several corners at once work too: select them with [[Shift]] and a click each, or pull a frame round them, and choose {{ui:sketch.filletCorner}} or {{ui:sketch.chamferCorner}} from the bar that appears. All of them get the same radius or distance. Where two selected corners share a side, each takes at most 45 % of it, so a rectangle rounded all round comes out alike at every corner. Points that are not a corner between two straight lines are left out, and the message says how many. A frame round a whole shape, or a click inside it, selects its corners and its lines together, and the bar then offers {{ui:sketch.curveLine}} and {{ui:sketch.straightenLine}} for all the selected lines next to the corner tools.

![The corner at the top left is rounded with a 12 mm radius.](shot:sketch-fillet)

## Mirroring

Select points and lines (click, [[Shift]] and click, or pull a frame round them) and click {{ui:sketch.mirror}} in the bar. Then choose the axis: {{ui:sketch.mirrorLeftRight}} mirrors across the vertical axis through the middle of the plate, {{ui:sketch.mirrorTopBottom}} across the horizontal one, and {{ui:sketch.mirrorAcrossLine}} across a straight line of the sketch that you click next. The copy is added on the other side and the original stays; nothing is linked, so you can change either on its own. Points that lie on the axis are shared, so a half outline whose ends sit on the axis becomes one closed outline: draw half of a bracket, select it, mirror it and make the body. A construction line makes a good axis. [[Esc]] cancels.

## Construction lines

A construction line helps you place points without becoming part of the body. It is drawn dashed and never counts as outline: you can pull it as far beyond the shape as you like and the body does not grow.

- Switch on {{ui:sketch.construction}} in the {{ui:sketch.group.draw}} group. New lines, those typed by measure too, are then construction lines. The button switches back to normal lines.
- A line you have drawn already becomes a construction line when you click it and choose {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} makes it a normal line again.
- New points snap to where a construction line crosses another line, a blue ring shows it, and to the ends of the construction line. That is how you put a corner on a middle, at a fixed distance from an edge or on a crossing, without calculating.
- New points also snap to the middle of every straight line of the sketch, to the centre of every circle and rounded corner, and to the middles of the sides of a body shown underneath (#624). A point that is being dragged ignores the middle of its own lines.
- A selection you drag snaps with its middle (#1236): the centre of a circle or the middle of a rectangle lands on the ends, corners and middles of the other lines, on the centres of circles, where construction lines cross and on the corners of a body underneath; a blue ring shows where. A shape dragged in from {{ui:sketch.addShape}} lands with its middle on these points too. Hold [[Alt]] to keep to the grid only.
- {{ui:sketch.fromMiddle}} in the {{ui:sketch.group.draw}} group draws a line from its middle: click the middle first, then the end, and the line runs the same length to the other side. The middle becomes a point of its own. Click the button again to draw normal lines.
- A construction line does not cut the outline apart where it crosses it. When revolving it may lie to the right of the axis too.

## Making a body from it

Click {{ui:sketch.finishSketch}}. The outline stands as a body on the workplane. In its settings you change the height, the colour and everything else as with any other shape. When you resize it, layerling builds it again from the sketch a moment later, and the sketch grows with it. So it stays an exact body that takes chamfers and fillets, and the next time you edit it the sketch has the size the body has.

If the workplane lies on the side of a body, you draw the way you look at that side: up in the sketch is up on the finished body too. The faint outline of the body in the sketch view shows where it stands. If the workplane cuts through a body, the sketch view shows the outline of that cut instead, so a hollow body appears as a ring and you can line the sketch up with its walls. A point you set or drag close to a corner of these outlines snaps exactly onto it; a small blue ring shows it. That way you take edges of other bodies into the sketch, even when the workplane does not lie exactly on them. To trace round existing work, switch on {{ui:sketch.showPartEdges}} (the layers button in the view buttons on the left): all the edges of the bodies are then drawn on the sketch plane, thin and faint, as if you looked through them, whatever height they lie at. A plane that stands upright, set on a front face for example, shows the front view this way. The choice is kept in the browser.

![The outline has become a body. The corner is rounded.](shot:sketch-result)

With {{ui:inspector.editSketch}} you can return to the sketch at any time to change it. A double click on the body does the same, as in Tinkercad (a locked body stays closed); {{ui:workspace.doubleClickOpensSketch}} in the settings switches that off. Edge treatments you already made on the body are lost, though, because the edges are created anew. A body you turned or moved in the 3D editor opens where it stands on the plate, turned as you see it there and on the plate's grid; only a tilted or mirrored body opens in its own frame.

A sketch with several outlines makes one body, and outlines that overlap merge in it. To have every outline on its own, select the body and click {{ui:inspector.separateParts}}: each outer outline becomes a body of its own, with the holes that lie in it, and keeps the body's height, colour and place. Each part has its own sketch to edit, with the construction lines, so you can raise or lower the parts one by one and join or cut them afterwards. Edge treatments block this, as does a body stretched since: it is then taken apart as a mesh.

**Another kind of body from the same sketch:** the badge at the top of the sketch says what it becomes, {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} or {{ui:sketch.modeBadgeSweep}}. Click it and pick another, also while you edit an existing body: an imported SVG, which comes in extruded, becomes a vase or a knob when you switch it to {{ui:sketch.modeBadgeRevolve}}. An outline reaching across the axis moves left until its right edge lies on the axis, so the half cross-section of an SVG turns about its straight side; [[Ctrl]]+[[Z]] takes the move back. When you finish, the new body takes the old one's place, name and colour, its foot at the same height. Edge treatments go, as with every edit of a sketch.

### Revolving

When revolving, you draw half the cross-section **to the left of the axis** shown in the sketch. Next to it you see a 3D preview of the revolve. It shows at once what the body will look like. You can turn, shift and zoom it with the mouse; the small button in its top right corner, or a double click on it, brings back the first view. The outline must be closed, or you build an open line as a stroke, see below. At the end click {{ui:sketch.finishRevolve}}. The other bodies of the design are shown from the front, in the same view as the profile, with the axis standing at the middle: draw the profile next to them or above them. The body stands where you drew it, and the horizontal line through the middle of the sketch is the ground: a profile drawn above it gives a body that stands higher, and its lowest point is the foot of the body. For a bigger radius, move the profile further from the axis, past the edge of the plate if need be: the plate grows with the sketch, its grid follows when you let go, and the minus button zooms out until all of it fits.

A revolved body is an exact body, like an extruded one: it takes chamfers and fillets, and you can hollow it, for a cup or a vase. A body revolved with an older layerling is a mesh; open {{ui:inspector.editSketch}} and finish it again to make it exact. A profile that reaches across the axis cannot be built exactly and becomes a mesh, as before.

**Smoother round faces: {{ui:prop.revolveSmoothness}}.** An exact revolved body is cut into small flat facets for the view, the export and the print, and on a large pot they can show on the print. Select the body and set {{ui:prop.revolveSmoothness}} in the properties panel to {{ui:prop.revolveSmoothnessFine}} or {{ui:prop.revolveSmoothnessExtraFine}}: the round faces are cut finer, at the cost of more triangles and a slower design. A helix or a mesh revolve has {{ui:prop.sides}} for this instead.

**One continuous strand: {{ui:prop.pitch}}.** A revolve turns its outline into closed rings. Select the revolved body and give it a {{ui:prop.pitch}} above 0 in the properties panel, the distance it climbs per turn, and the outline winds up as a helix instead: one continuous strand, like filament on a spool or a coil. {{ui:prop.sweep}} then becomes {{ui:prop.turns}}, up to 200; a negative number winds left-handed. Turns closer than the outline is high melt into one body, so a solid core with a fine pitch works too. A helix is built as a mesh, so fillet, chamfer and hollow do not work on it; keep {{ui:prop.sides}} low on many turns. A pitch of 0 makes rings again.

## Sweeping along a path

{{ui:sketch.sweep}} pulls an outline along a path: a cable channel that turns a corner, a conduit, a guard round a belt, a ring around a hexagon. It sits next to {{ui:sketch.extrude}} and {{ui:sketch.revolve}} in the {{ui:sketch.group.create}} group.

You draw two things on the same sheet:

- **The cross-section** as a closed outline, as usual. Draw it as you would see it looking along the path from its start: across the path is the sketch's left and right, up is up on the finished body. A hollow section, a channel or a tube, is an outline with another one inside it. By default the section is centred on the path. The menu next to the mode badge at the top lets you put its left or right edge on the path instead ({{ui:sketch.sweepAnchorLeft}}, {{ui:sketch.sweepAnchorRight}}, seen looking along the path), so a rail can sit on one side of the line or follow the edge of a part. The body stands on the sketch plane with the lowest point of the section.

- **The path** as a {{ui:sketch.construction}}: switch it on and draw lines or curves, one chain, open or closed (a closed chain gives a ring). The path lies flat in the sketch plane.

Draw the section near the end of the path where it should start; the path starts at the end nearest to it. Then click {{ui:sketch.finishSweep}}. A corner of straight pieces becomes a mitre, a curve stays smooth, and the section stays upright all the way. The body is exact, like an extruded one: fillet, chamfer and the STEP export work on it. If a closed outline or a path is missing, or there are several separate paths, layerling says so. With {{ui:inspector.editSketch}} you can return to the sketch and change the section or the path.

## Building as a stroke

Normally the area inside a closed outline becomes the body. With {{ui:sketch.stroke}} in the {{ui:sketch.group.finish}} section you build the line itself instead, with a width you set. Tick {{ui:sketch.strokeOn}} in the stroke window; the sketch shows straight away what comes out.

- A **closed outline** becomes a frame. {{ui:sketch.strokeAlign}} says where the wall lies: {{ui:sketch.strokeAlign.center}} on the drawn line, {{ui:sketch.strokeAlign.inside}} within it or {{ui:sketch.strokeAlign.outside}} outside it. Outside is handy for a tolerance: draw the outline of a hole, a dovetail for instance, and give it a 0.2 mm stroke outside to get the gap the print needs.
- An **open line** becomes a stripe, centred on the line. {{ui:sketch.strokeCap}} sets how its ends look: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (longer by half the width) or {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} applies to both: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} or {{ui:sketch.strokeJoin.bevel}}.

The sketch keeps the drawn line. Open it again and you go on changing line and stroke; untick the box and the area is built again. Curves are broken into short straight pieces for it.

In a revolve the stroke is a thin wall: draw the wall of a vase or a cup as **one open line** to the left of the axis, tick {{ui:sketch.stroke}} and set the width, and the revolve turns that band. What reaches across the axis is cut off at it.

## Fill and silhouette

You can set the stroke without opening the sketch too: in the properties of a sketch body, choose {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} or {{ui:prop.sketchFill.center}} under {{ui:prop.sketchFill}}, with {{ui:prop.sketchLineWidth}} and {{ui:sketch.strokeJoin}}. The body is built again straight away, where it stands. These match the fill modes of Tinkercad's SVG import: default, outer line and inner line. {{ui:prop.sketchFill.grow}} keeps the area filled and grows it by the line width all round, with sharp, round or bevelled corners: a base layer under a logo for a multicolour print, which the stroke outside alone would only give as a ring. {{ui:prop.sketchFill.shrink}} does the opposite: the area stays filled and its edge moves in by the line width all round, holes included (they grow). Use both on copies of one sketch for a fit: the hole at its drawn size, the part that goes through it {{ui:prop.sketchFill.shrink}} by 0.5 mm, or a wall inside a shape cut from the same outline. A width larger than the outline allows leaves nothing. In the sketch's stroke window the same two choices stand under {{ui:sketch.strokeAlign}}. With a line outside, inside or centred, {{ui:prop.sketchCuttingEdge}} makes the wall sharp on top: its top runs in to that width with a 45° chamfer on both sides, as on a cookie cutter. 0 leaves the top flat; the edge stays when you change the line width.

{{ui:prop.sketchSilhouette}} leaves out every outline lying inside another: holes and whatever lies in them. Only the outer outline stays. Together with {{ui:prop.sketchFill.outside}} it makes a cookie cutter: import an SVG twice, once with the silhouette as an area for the base and once with the silhouette and 1 to 2 mm of stroke outside as the wall. The switch is in the {{ui:sketch.stroke}} window in sketch mode as well.

Fillets and chamfers on the edges go when the body is built again, as when the sketch is edited. {{ui:inspector.taper}} and {{ui:inspector.twist}} stay; a taper grows or shrinks with the outline.

## Slanted walls, for stamps

An extruded sketch has vertical walls. A stamp, an embossing die or a punch wants slanted ones, outside and inside, with the same wall thickness all the way. Layerling has no draft angle for an extrusion, but for plain outlines the {{ui:inspector.taper}} gets you there. One way that works:

1. Draw the outline with the hole it needs and make a body of it. Duplicate the body ([[Ctrl]]+[[D]]).
2. On the first body, switch on {{ui:prop.sketchSilhouette}}, so the hole is filled, and give it a wider bottom than top with {{ui:inspector.taper}}.
3. On the copy, open its sketch again and delete the outer outline, so that only the outline of the hole is left. Finish the sketch, switch the body to {{ui:inspector.hole}} and give it a narrower bottom than top with {{ui:inspector.taper}}.
4. Move the hole into the first body, where the hole was, and group the two.

The walls now slope outside and inside. Taper scales the whole outline, so this is exact for plain shapes, where you can choose the sizes so the walls run parallel, and only an approximation for fine details such as lettering.

## A picture as template

With {{ui:sketch.addImage}} you put a photo or a drawing under the sketch and trace it, at any time, also before the first line. You can set its size, opacity and position. Once the picture sits right, lock it with [[Ctrl]]+[[L]] so you do not move it by accident while drawing. A locked image is out of the way: clicks go through it, so you can pick lines and points on top of it and drag a frame over them. The padlock in its corner unlocks it with one click; [[Alt]]+click selects it without unlocking it. If its settings at the right edge cover the picture, drag them away by their title bar; a double-click on it docks them again.

Under {{ui:sketch.imageAlign}} you line up a photo that was not taken straight:

- **{{ui:sketch.imageRotation}}:** Turn the picture about its centre, with the curved arrows beyond its corners or as a number in degrees. With [[Shift]] the arrows snap in 15° steps. Inside the ring that appears while turning they snap to 22.5°, outside it to whole degrees.
- **{{ui:sketch.centreImageX}}** and **{{ui:sketch.centreImageY}}:** put the picture's centre on X = 0 or Y = 0. For a revolve, X = 0 is the axis, so the picture then lies symmetric about it.
- **{{ui:sketch.calibrateImage}}:** Its button sits at the top, right under the preview. Click two points in the picture whose distance you know, the ends of a ruler or a known diameter, and type the real distance. The picture is scaled evenly so that distance is right; the first point stays where it was.
- **{{ui:sketch.cropImage}}:** The handles on the frame now crop the picture instead of scaling it; what is cut away stays stored and comes back with {{ui:sketch.uncropImage}} or when a handle is pulled out again.

All four touch the reference only, never the sketch.

**{{ui:sketch.traceImage}}**, in the picture's settings, sets the points for you: it traces the outline of the shape in the picture – a silhouette, a logo, a word – and shows it in red over the picture, square points for corners, round ones for smooth points. {{ui:sketch.traceDark}} or {{ui:sketch.traceLight}} picks which part of the picture is the shape, {{ui:sketch.traceThreshold}} where dark turns light, {{ui:sketch.tracePoints}} how many points the outlines get together (fewer give smoother curves, more follow the picture more closely), {{ui:sketch.traceCorners}} from what turn a point is a corner, {{ui:sketch.traceSpeck}} how small a speck is left out, and {{ui:sketch.traceHoles}} keeps the middle of an A or an O. {{ui:sketch.traceApply}} puts the outlines into the sketch exactly where the picture lies, at its size, turn and crop, and selects them: they are ordinary points to move, curve or remove, and [[Ctrl]]+[[Z]] takes them back in one step. It works best with clear contrast; cut a photo with a busy background out first. What falls away – around the outlines, in the holes, what is cut away – the preview covers in the plate's colour, so only what stays shows of the picture. Outlines that lie so close that loose curves would cross get more points by themselves; the card says so. For a border outside or inside the outline, give the sketch body a stroke outside or inside its lines, or offset the finished body.

For a photo – a toy on a white table, say – choose **{{ui:sketch.traceObject}}** under {{ui:sketch.tracePart}}: the background is the colour at the picture's edge, and everything that stands out from it becomes one outline, whatever its colours; {{ui:sketch.traceThreshold}} then sets how clearly it must stand out. A colourful picture on an even background starts this way. {{ui:sketch.tracePickAreas}} outlines more: click an area in the picture, a window say, and the patch of like colour round the spot is outlined ({{ui:sketch.traceAreaTolerance}} sets how like). Holes and clicked areas are listed under {{ui:sketch.traceList}}; pointing at one shows it in the preview, ✕ takes it out, and with {{ui:sketch.traceCut}} off it is drawn as a construction line instead of a hole. An area that reaches the picture's edge is the background and is not taken. What no threshold and no colour can tell apart – a shadow as dark as the wheels above it – {{ui:sketch.traceTrim}} takes away: click corners round it (a click on the first corner, a double click or [[Enter]] closes it), and the outline runs along the cut; it is listed as “Cut 1”.

The tree beside a house, a figure before a busy background – where no colour tells the shape from the rest, the **{{ui:sketch.traceLasso}}** catches it: click roughly along its edge, and between two clicks the line follows the edge by itself, round its bends too; while you move, the preview already shows where it will run. A click on the first point, a double click or [[Enter]] closes it, [[Esc]] throws it away. It is listed as “Lasso 1”, with the choice {{ui:sketch.traceRegionAdd}} (the area joins the shape) or {{ui:sketch.traceTrim}} (it is taken away); every cut has the same choice. Under {{ui:sketch.tracePart}}, **{{ui:sketch.traceLassoOnly}}** makes the shape only of what you catch this way – nothing else of the picture.

![A drawn house traced as the object, the threshold lowered for its light wall: the magnetic lasso has cut the tree away, and the eight window panes are picked as holes.](shot:trace-house)

![The house as a body: without the tree, the windows cut through.](shot:trace-house-body)

## Keys in sketch mode

| Key | Effect |
| --- | --- |
| [[Esc]] | put the note tool down; otherwise put the tool down (back to {{ui:sketch.select}}), then clear the selection |
| [[Delete]] | delete the selected element |
| [[Ctrl]]+[[C]] | copy the selection |
| [[Ctrl]]+[[X]] | cut the selection |
| [[Ctrl]]+[[V]] | paste |
| [[Ctrl]]+[[D]] | duplicate the selection |
| [[Ctrl]]+[[Z]] | undo |
| [[Ctrl]]+[[A]] | select every point and line |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | while drawing: snap the line in 15° steps; while dragging: keep movement on one axis |
| [[Alt]] | while setting or dragging a point: on the grid only, no snapping to corners and middles |
| digit, [[<]], [[Tab]], [[Enter]] | while drawing: type and set the length and angle of the next line |
| [[R]] | rotate the closed sketch by 45° |
| [[Ctrl]]+[[L]] | lock or unlock the selected outline, or the template image |
| [[N]] | place a note: the next click puts it on the sketch |
| [[Shift]]+[[N]] | show or hide the notes |

> **Tip:** Draw as few points as needed. An outline with a few well-placed points gives a smoother body than a tangle of many.
