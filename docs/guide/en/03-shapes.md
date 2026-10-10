---
title: Placing and adjusting shapes
summary: The shape library, dimensions by number and by handle, colour, rotating, tapering and twisting.
---

Every part in layerling starts with a shape. From them you build everything else: shapes complement each other, cut each other out or are joined into a new shape.

## Adding a shape

Click {{ui:editor.addShape}} in the ribbon. The shape library opens.

![The shape library. Every little picture is rendered from the shape's real geometry.](shot:shape-menu)

Pick a shape. It now hangs on the mouse pointer and lands where you click. Move it over a body and it lies down on the face under the pointer, sloped ones too, like Cruise in Tinkercad; over the empty plate it lands on the workplane. [[Esc]] cancels placing. A tool that waits for a click, such as the tape measure, the framing square, a note, {{ui:camera.placeWorkplane}}, {{ui:editor.tool.layFlat}} or the edge tools, is switched off when you pick a shape, so the click places the shape. The other way round, switching one of those tools on puts the shape down again. If you would rather have the shape appear in the middle of the plate, you can switch off placing by click in the settings (area {{ui:workspace.appearance}}, switch {{ui:workspace.cruise}}).

What the library offers:

- **Basic shapes:** {{ui:shape.box}}, {{ui:shape.roundedBox}}, {{ui:shape.cylinder}}, {{ui:shape.slot}}, {{ui:shape.ellipse}}, {{ui:shape.polygon}} (three to twenty-four sides), {{ui:shape.sphere}}, {{ui:shape.cone}}, {{ui:shape.pyramid}} (with three to twenty-four sides, so three-sided too), {{ui:shape.wedge}}, {{ui:shape.roundRoof}}, {{ui:shape.halfSphere}} and {{ui:shape.torus}}.
- **Tubes:** {{ui:shape.tube}} and {{ui:shape.bentTube}}, made of up to twelve straight pieces with bends in between, and the {{ui:shape.loft}} from one outline to another, say from square to round.
- **Decorative shapes:** {{ui:shape.star}}, {{ui:shape.heart}} and {{ui:shape.crescent}}.
- **Lettering:** {{ui:shape.text}}, also along a circular arc. More in [Text](chapter:text).
- **Mechanics:** {{ui:shape.thread}} (threaded rod, screw, nut and tapped hole), {{ui:shape.spring}}, {{ui:shape.gear}} and the {{ui:shape.knurl}} for grips. More in [Threads and mechanics](chapter:threads-and-mechanics).
- **For constructions:** {{ui:shape.honeycomb}}, the print-in-place {{ui:shape.hinge}}, {{ui:shape.dovetail}}, the {{ui:shape.teardrop}} for horizontal holes, the {{ui:shape.counterbore}} and {{ui:shape.countersink}} for screw heads and the {{ui:shape.ruler}}, which is only a measuring tool and never shows up in an export.

You get a triangle in two ways: the {{ui:shape.polygon}} with three sides is an isosceles triangle, the "Roof" of Tinkercad, and the {{ui:shape.wedge}} is a right triangle. Both are true triangular prisms. For a triangular hole, copy the shape, make the copy smaller, mark it as a hole and line it up with {{ui:editor.tool.centerOnWorkplane}} or {{ui:editor.tool.align}}. Both work with the shape's bounding box, the smallest box that encloses it, so a halved square still counts as a whole square. The command search ([[Ctrl]]+[[K]]) also finds both shapes under "triangle" or "roof".

The {{ui:shape.slot}} can be narrower at one end than at the other, say for a guard over a belt between two pulleys. Under {{ui:inspector.properties}} set {{ui:prop.slotSmallEnd}}; the large end is as wide as the capsule, and the sides run straight from one arc to the other. {{ui:prop.slotCentreDistance}} is the distance between the two arcs' centres, that is how far apart the pulleys are. Change the small end and the centre distance stays, the capsule getting longer or shorter. The tapered capsule stays an exact body too, for fillets and STEP.

## The shape's settings

As soon as a shape is selected, its settings appear on the right. At the top is the name; the pencil beside it ({{ui:outliner.rename}}) lets you type a new one. [[Enter]] keeps it, [[Esc]] cancels, and an empty name brings back the shape's default name. Further right, the padlock locks the shape against accidental moving and the eye hides it. The arrow on the far left folds the settings down to their title bar.

The settings sit docked at the right edge. If they cover something you want to see, drag them by their title bar and they float wherever you drop them; they stay there for the next shape too. Drop them back at the top right, or double-click the title bar, and they dock again. While they float or are folded down, the snap step moves from the bottom of the settings to the bottom right of the workplane.

![The settings of a cylinder: solid or hole, diameter and height as a number and as a slider.](shot:editor-overview)

- **{{ui:inspector.solid}} or {{ui:inspector.hole}}:** A solid stays, a hole takes material away. A click on {{ui:inspector.solid}} opens the colours; colours of your own that you mix there wait under {{ui:inspector.recentColors}} afterwards, the last eight. More in [Solids and holes](chapter:solids-and-holes).
- **{{ui:inspector.transparent}}:** Lets you see through the body, for example to spot a shape behind it.
- **{{ui:inspector.multicolor}}:** For a group only. Switched on, every part of the group shows in its own colour, also in a group that was cut with holes into one body (the walls a hole leaves take the colour of the body they were cut into). Picking a colour for the group switches it off and colours the whole group. Bundles always keep their parts' colours. In a 3MF export every part keeps its colour, so the slicer can map the parts onto filaments; OBJ carries the colours on its points, so the border between two colours is a little rougher there.
- **{{ui:inspector.properties}}:** The dimensions and everything that belongs to this shape. For a cylinder the diameter, the height and the number of sides. For a gear the teeth, for a spring the turns. A value you have moved away from its default gets a small arrow next to its name: a click takes just that value back, whatever else you did since, unlike Undo. {{ui:inspector.saveDefaults}} at the bottom makes the current values the start values of this kind of shape (the same as {{ui:workspace.shapeDefaults}} in the settings), and {{ui:inspector.resetDefaults}} goes back to the app's own.
- **{{ui:inspector.taper}}:** Different sizes at the top and bottom, for example for a slope or a funnel.
- **{{ui:inspector.twist}}:** Twists the top against the bottom or shifts it sideways. That gives twisted columns and leaning towers.

![A group of an orange block, a blue peg and a hole, cut into one body. With Multicolor switched on, the peg stays blue, the block orange, and the walls of the hole take the block's colour.](shot:group-multicolor)

Taper and twist work on almost every shape. Only the gear, thread, spring, knurl, hinge, pyramid, bent tube, teardrop, the screw-head cutters and the ruler leave them out: they have fixed measures of their own or, like the pyramid, a top of their own already.

![A cone whose top radius and height were changed: a small arrow next to each takes the value back, and the two buttons at the bottom save or reset the defaults of the shape.](shot:property-reset)

A tapered or leaning box, cylinder, ellipse, polygon, tube or ring keeps its exact shape, and so do the capsule, star, heart, crescent, honeycomb, dovetail and a rounded box without rounded top and bottom edges: chamfers and fillets work on it as on the plain shape, and the STEP export writes it. The same holds for a twisted shape: its section turns exactly as it rises, and the sides wind evenly from bottom to top.

Typing is more exact than dragging. All number fields take millimetres, but also percentages: type "50 %" into a width of 40 mm and you get 20 mm. They calculate too: "15*3", "120-2*4" or "(40+2)/2" give 45, 112 and 21; x works instead of *. The field remembers the calculation, in the Properties panel as well as in the dimension boxes around the selected body: click into it again later and the formula stands there instead of the number, as long as the value still matches it, and you change it in place, "(140+2)/2" becoming "(40+6)/2". Drag the body by a handle or scale it and the formula no longer fits, so the field shows just the number again.

## How round is round? The side count

Round shapes such as cylinder, cone, tube, ellipse or the bores have the switch {{ui:prop.sidesFollowSize}} and the slider {{ui:prop.sides}} in their properties. The reason: for the view and for STL, 3MF and OBJ, layerling draws a circle as a polygon of many small sides. The more sides, the smoother it is, and the more triangles it takes.

**Where the side count matters**

- **In the export for the slicer** (STL, 3MF, OBJ). A cylinder with few sides arrives there as a polygon.
- **When bodies and holes are combined.** A bore cut by a hole with few sides is angular in the finished part. That includes screw holes.
- **In the view.** Many very fine shapes slow the editor down.

**Where it does not matter**

- **For the STEP export.** It writes the round shape, not the polygon.
- **For chamfers and fillets** ({{ui:editor.tool.chamfer}}, {{ui:editor.tool.fillet}}) as long as the shape stays round. That is the case when you have not set a side count, when the count is at least the shape's default, or when the polygon strays at most {{value:EXACT_ROUND_TOLERANCE}} mm from the circle. The default is {{value:ROUND_FROM_SIDES}} sides for cylinder, ellipse, tube and cone, {{value:ROUND_FROM_ROOF_SIDES}} for the {{ui:shape.roundRoof}}, {{value:ROUND_FROM_SPHERE_STEPS}} steps for the {{ui:shape.sphere}}, {{value:ROUND_FROM_HALF_SPHERE_STEPS}} for the {{ui:shape.halfSphere}}, and a {{ui:prop.quality}} of {{value:ROUND_FROM_BENT_TUBE_QUALITY}} for a round {{ui:shape.bentTube}}.
- **For a thread, a spring or a helical gear.** The edge tool and the STEP export take its exact body; its {{ui:prop.quality}} only sets how finely it is drawn.

**Where it matters again**

- **For chamfers and fillets on a shape with few sides.** If you set the side count below the default, the edge tool takes the shape as it is drawn: a cylinder with 6 sides stays a hexagonal bar, and the fillet runs round its six edges. That is how you can build, for instance, a nut pocket with rounded corners. For a round shape, leave {{ui:prop.sidesFollowSize}} on.

**How to use it**

- **Leave {{ui:prop.sidesFollowSize}} on.** Then layerling picks the side count from the diameter so that the polygon strays at most {{value:ROUND_DEVIATION_TOLERANCE}} mm from the true circle, far below what a printer resolves. Small shapes get at least {{value:MIN_AUTOMATIC_SIDES}} sides, large ones more.
- **Fewer sides** you take when you want a polygon on purpose (but there is the {{ui:shape.polygon}} for that) or when the editor gets slow with very many round shapes.
- **More sides** you hardly ever need. Only on very large round parts, when you see edges in the STL.
- **For parts you only treat with edges or hand on as STEP,** the side count does not matter.

## Working with the handles

Besides the settings there are handles on the shape itself:

- The **corners and edges** make the shape larger or smaller. Hold [[Shift]] while dragging a corner to scale width, depth and height together and keep the proportions; hold [[Alt]] to scale from the center instead of the opposite corner. Without a keyboard, or if you do not want to hold a key, switch on {{ui:inspector.keepProportions}} at the top of the properties: then the corners always keep the proportions, and typing one of width, depth or height scales the other two by the same factor. The setting is remembered.
- The **arrow on top** changes the height, the handle **in the middle** lifts or lowers the shape.
- The **curved arrows** rotate it.
- The **numbers** beside the shape show the dimensions. A click on one opens a field in which you type the number you want.
- A **click on a corner** (without dragging) opens width and depth together. Type the first, press [[Tab]] for the second and [[Enter]] to apply both. [[Esc]] cancels.

Without the mouse, use the keyboard: the arrow keys move the selection by one snap step, with [[Shift]] by five. They follow the view: [[→]] moves to where the screen's right is, [[↑]] away from you, even after turning the plate. Push a shape out of the picture and the view moves along. [[Ctrl]]+[[↑]] and [[Ctrl]]+[[↓]] raise and lower it. [[R]] rotates by 45°, [[Shift]]+[[R]] by 22.5°. [[D]] drops the selection onto the workplane.

The handles pull a shape as large as your plate, at least 220 mm wide and deep. Typing a number in the properties goes beyond that, and a shape made that large does not shrink back when you grab it again. A ceiling of your own per shape is set in the settings under {{ui:workspace.shapeDefaults}} with {{ui:workspace.customLimit}}.

The snap step is at the bottom right of the editor and can be changed at any time.

## Copying and duplicating

{{ui:editor.tool.copy}}, {{ui:editor.tool.paste}} and {{ui:editor.tool.duplicate}} are in the ribbon ({{ui:editor.group.clipboard}}). [[Ctrl]]+[[D]] duplicates a selection. layerling remembers how you last moved or rotated the copy and applies the same again on the next duplicate. That produces a row of holes or steps in a few key presses. For regular arrangements there is also the pattern, described in [Selecting and arranging](chapter:select-and-arrange).

> **Tip:** If a shape refuses to take the size you want, it is often the limits for new shapes. Under {{ui:workspace.shapeDefaults}} in the settings you decide how each shape starts and how large it may get.

## Custom shapes

A holder, a grip or a base plate you need again and again goes into the {{ui:myShapes.title}}. They sit at the top of the shape library, above the {{ui:myShapes.basicShapes}}, and fold away with their arrow.

1. Select one or more bodies, holes, groups or an imported model included.
2. Open the shape library and click {{ui:myShapes.saveSelection}}. Enter a name and confirm with {{ui:common.save}}.
3. In any design, a click on the tile inserts the shape, like any other shape. You can also drag the tile onto the workplane; it then lands where you let go.

Several bodies come back together, placed as they stood to each other, and stay selectable one by one. The pencil on a tile renames it, the bin removes it after asking. Shapes already inserted into designs stay as they are.

The {{ui:myShapes.title}} live in this browser, apart from the designs, and are there again the next time you start. {{ui:dashboard.backupAll}} on the start page backs them up with the designs, and opening the backup brings both back. To take only the shapes to another browser, {{ui:myShapes.backup}} (the arrow pointing down) saves them as a ZIP file and {{ui:myShapes.load}} (the arrow pointing up) brings them back there. {{ui:myShapes.load}} also takes single `.lyl` designs; each one becomes a shape. Shapes already there are not added twice.

### Custom shapes on the server

With the [shared server store](chapter:files-and-saving) switched on, the section shows two groups: {{ui:myShapes.onServer}} and {{ui:myShapes.inBrowser}}. When saving you choose where the shape goes; the server is chosen to start with. There it lives in the folder `Custom shapes`, as a `.lyl` file of its own with a picture, ready on every device that reaches the server. The cloud on a browser tile puts that shape on the server; it is then no longer kept twice.

The `Custom shapes` folder shows on the start page as well. Open a shape there like a design, change it, and it is saved automatically like any design on the server; the next insert takes the new version. As the server store has no login, everyone who reaches the server sees the same shapes.

## Wrapping around a cylinder

Should a pattern, a logo or lettering go onto a cup, a can or a tube? First lay it flat on the plate, as an imported SVG or as text for example, the way it should look from above. Then wrap it around a cylinder in the shape's settings under {{ui:inspector.wrapCylinder}}:

1. Open {{ui:inspector.wrapCylinder}} and enter the {{ui:inspector.wrapDiameter}} of the cylinder wall, such as the outside diameter of your cup.
2. Click {{ui:inspector.wrapApply}}. What ran from left to right now runs around the cylinder, the back edge becomes the top, and the thickness stands out of the wall.
3. Select the wrapped shape and the cylinder and centre both, left to right and front to back. The middle of the wrapped shape is the cylinder's axis, so it then sits right on its wall.

For an engraving, switch on {{ui:inspector.wrapInward}}: the thickness then goes into the wall. Make the shape a hole, centre it and group it with the cylinder.

The result is a mesh like an imported model. Undo lays the shape flat again; for another diameter, undo first and wrap again. It cannot go further than once around the cylinder; then layerling names the smallest diameter that fits.

