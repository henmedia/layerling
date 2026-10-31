---
title: Solids and holes
summary: How simple shapes become bores, slots and pockets, and how to change a group again later.
---

This is the most important idea in layerling, and it is quickly learned: **Every shape is either a solid or a hole.** A solid stays. A hole is a tool that takes material away.

## Solid or hole

Select a shape and click {{ui:inspector.solid}} or {{ui:inspector.hole}} in its settings. The keyboard is faster: [[H]] makes the selection a hole, [[S]] makes it a solid again. Both are also in the menu a right click on the body opens. A hole is shown see-through so you can see where it sits. [[T]] makes a body see-through, say to look into a housing; a second press makes it opaque again. It works on the whole selection: if any body is already see-through, all become opaque, otherwise all become see-through.

As long as nothing is grouped, nothing happens with a hole. It just lies there and shows where something will disappear later.

![The cylinder is a hole. It sticks out of the top of the cube so that it cuts all the way through.](shot:hole-before)

## Grouping

Select solids and hole(s) and click {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Now the holes remove the material from the solids they touch. What remains is one single new shape.

![The result: a cube with a bore.](shot:hole-after)

This is how you get:

- **Bores:** a cylinder as a hole through a body.
- **Slots:** an elongated box as a hole at the edge.
- **Pockets:** a hole that does not go all the way through.
- **Threads in a part:** a tapped hole as a hole, see [Threads and mechanics](chapter:threads-and-mechanics).

If several solids are in the group, they are joined. Two solids that touch become a single part.

With large meshes, such as an imported STL with hundreds of thousands of triangles, the cut takes a few seconds. layerling then works in the background and shows "{{ui:status.computing}}"; meanwhile you can turn the view and use the interface. If you change the scene in that time, the result is dropped and layerling tells you so. The same goes for {{ui:editor.tool.split}}.

You can treat a group like a shape: move, rotate, colour, group again. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) dissolves it and the individual parts are back.

### Making a group a hole

A whole group can also be a solid or a hole. A simple rule applies:

- If the group consists only of solids (or only of holes), you switch it as a whole and its parts go along.
- If it contains both, say a cube with a bore, each part keeps its own state. The whole group then becomes a tool, but the bore stays a bore.

## Bundling

Sometimes parts should only stay together without becoming one - a white logo on a black plate for a multicolour print, say. That is what {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]) is for, as in Tinkercad. A bundle moves, turns and resizes like a shape, but nothing is merged:

- Every part keeps its colour and stays a solid or a hole. The bundle's settings have the same cards as a group's: {{ui:inspector.solid}} and {{ui:inspector.hole}} for the whole bundle (which keep the parts' colours), {{ui:inspector.transparent}} ([[T]]) and {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); with Multicolor switched off the bundle shows and exports in one colour. {{ui:inspector.separateParts}} takes the bundle apart, as [[Ctrl]]+[[Shift]]+[[G]] does.
- Holes cut nothing. When you group the bundle with other parts, its holes cut those parts but still not the bundle's own solids, as in Tinkercad. So a peg with its hole beside it, say, can be used again and again as a bundle.
- In an STL, 3MF or OBJ export every part is a body of its own; in 3MF and OBJ with its colour.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) takes a bundle apart again, [[E]] opens it for editing like a group. Chamfer, fillet and hollowing do not work on a bundle, because it is not one body: group it for that, or work on its parts one by one. If a hole in the bundle should cut the bundle's own solids too, take the bundle apart and group its parts ([[Ctrl]]+[[G]]).

## Intersection

{{ui:editor.tool.intersect}} keeps only what two or more bodies have in common. Lay two overlapping shapes on top of each other, select both and click it. That turns a cylinder and a box into a piece with one round and one straight side. A group counts the way it looks, holes included. If a hole is selected too, what remains is what all the solids share with all the holes. If the shapes share nothing, nothing is changed and a message says so. Next to it, {{ui:editor.tool.intersectPreview}} shows the common part before you apply it: the selected shapes turn see-through and what they share is drawn in green. Select and move each shape on its own and the green part follows; {{ui:editor.tool.intersect}} applies it, [[Esc]] closes the preview.

{{ui:editor.tool.hull}} wraps the selected shapes in one convex body, as if they were shrink-wrapped: the smallest body without dents that holds all of them. A half sphere on a cylinder becomes a dome with no step, four cylinders at the corners become a box with round corners, two spheres a capsule. Holes in the selection are cut out of the hull afterwards. The parts stay in it: {{ui:group.edit}} opens the hull like a group, and moving a part there and closing it builds the hull anew. The hull is a mesh, so round shapes show facets, and the edge tools work on it as on any mesh. When only holes are selected, the hull is a hole itself: two cylinder holes cut a slot.

{{ui:editor.tool.cookieCutter}} makes a cookie cutter from the selection: a thin wall round the outline, standing 15 mm high, and a flat rim of 2 mm round its foot, so the cutter stands on the rim and a thumb has something to press. Select one imported SVG or one sketch body and its own outline is used. A text lying flat gives its letters' own curves. Any other shape, a built one, an imported mesh or several parts, gives what it stands on: the outline the workplane cuts through it, so put it on the workplane first. Parts that overlap give one outline round all of them, as if they were grouped; parts apart from each other give a cutter each, in the same bundle. The outline is mirrored left to right: the cutter is printed standing on its rim and turned over to cut, so a text or a logo comes out the right way round on the dough. The wall's top runs in to a cutting edge 0.4 mm wide. Holes in the outline, the inside of an e or an a, get walls of their own, so they are cut out of the cookie too. They are a body of their own in the bundle, {{ui:cookieCutter.part.innerWalls}}: to have a text or a pattern only pressed into the dough instead of cut out, make them lower under Properties. With a wall of 15 mm and dough 5 mm thick, inner walls of 12 mm press 2 mm deep. Inner walls lower than the outer wall have a flat top instead of the cutting edge: they only press, and an edge would leave thin tips that break off and grooves that hold dough. Give them an edge under Properties if you want one. Two bridges at the rim, on the side your hand presses, hold each inner wall to the wall round it, spread round it, 4 mm wide and 3 mm high. Each bridge stands with its whole width on the walls, in the middle of a side that runs along the outline, and never across another piece. Pieces side by side, such as the letters of a name, are also joined to each other, the closest first, so the bridges run as a web through all of them and a letter in the middle of a word is held as well. A click on the tool opens a small window: there you choose a {{ui:cookieCutter.support.plate}} instead of the bridges, which fills the whole outline on the side you press, is steadier and sticks better to the print bed, but no longer lets you push the dough out from behind. {{ui:cookieCutter.fillet}} puts small 45° slopes where the walls stand on the rim, the bridges or the plate, so thin parts such as the dot of an i do not break off; they are a body of their own in the bundle. There you also set how much lower the inner walls are and whether the outline is mirrored; the values stay for the next cutter. Change their height under Properties like the rim's. The cutter replaces the selection as a bundle of sketch bodies, {{ui:group.edit}} opens it. Wall, inner walls and rim are the sketch fill modes, a line outside the silhouette: change the thickness, height or colour of each under Properties, and the wall's {{ui:prop.sketchCuttingEdge}} there too (0 for a flat top). Where a tight bend leaves no room for a chamfer on both sides, the wall is bevelled on its outside only, to the same edge. Where an outline cannot be chamfered at all - a logo with sharp points, an outline cut from a body's triangles - the edge is built in fine steps of 0.1 mm instead, which a print layer of 0.2 mm cannot tell from the slope; such a wall is a triangle mesh rather than an exact body. To keep the outline as drawn, mirror the cutter back with {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. A PNG or JPG picture works too: imported, it is traced into a sketch body, and the cutter follows that one.

{{ui:editor.tool.loftSketches}} joins two sketch bodies or imported SVGs into one body: the outline of the lower one at the bottom, the outline of the upper one at the top, with straight walls between them. That makes a funnel, a transition piece from square to round, or a frame that narrows towards the top. Put the two bodies one above the other where they belong, shifted and turned if you like, select both and click the tool. The loft reaches from the bottom of the lower body to the top of the upper one.

Each of the two needs exactly one outline. If it has a hole, a ring say, the other needs as many, and the holes are lofted too: two rings give a hollow wall. A sketch built as a line (a line outside, inside or centred under Properties) counts as such a ring. An imported SVG comes in filled; to make it a ring, give it a line under Properties. Both bodies must lie flat; the tool refuses tipped ones.

The loft is an exact CAD body; the edge tools and the STEP export take it as one. The two sketches stay inside it: {{ui:group.edit}} opens them like a group, and moving or changing one there, or editing its sketch, and closing it builds the loft anew. {{ui:editor.tool.ungroup}} sets the two sketches free again. For two rectangles, circles or polygons there is also the Loft shape among the shapes, whose ends you set as numbers.

## Cutting one body out of another

For parts that have to fit, a shaft in a collar, a bolt in a case, you make the one part and cut it out of the other. Select the two bodies and click {{ui:editor.tool.cutOut}} in the {{ui:editor.group.combine}} area, or right-click and choose it there. The panel names the part that stays and the body that gets the cavity; layerling takes the smaller one as the part, and a click on {{ui:cutOut.swap}} turns it around. The {{ui:cutOut.clearance}} makes the cavity that much larger than the part on every side: 0 fits exactly, 0.2 mm is a usual room for a printed fit. {{ui:cutOut.apply}} cuts a copy of the part out of the other body and leaves the part itself where it is. The result is a group: {{ui:editor.tool.ungroup}} takes the cut apart again. A clearance needs the part to be an exact body, like the {{ui:editor.tool.offset}} tool, which it uses.

## Editing a group

If a bore turned out too small, you do not have to dissolve the group and rebuild. Select the group and click {{ui:group.edit}} in its settings, the folder icon in the object list, or press [[E]]. A double click on the group does the same, as in Tinkercad, on a bundle too; if you would rather not, switch off {{ui:workspace.doubleClickOpensGroup}} in the settings. A part only starts to move once the pointer has been dragged a few pixels, so a shaky click or double click does not nudge it. The parts now lie separately and you change them with every tool: make a hole larger, move a body, add a hole.

![The group being edited: the bar at the bottom holds Cancel and Done, and the object list shows the parts.](shot:open-group)

A bar appears at the bottom of the picture. {{ui:group.done}} rebuilds the group, with its name, its colour and its state as solid or hole. {{ui:common.cancel}} puts it back untouched.

If one of the parts is itself a group, you can edit it the same way, and so on as deep as your design goes. The bar shows where you are, for example "Bracket › Screw boss". {{ui:group.done}} and {{ui:common.cancel}} always finish the innermost group and take you one level back out. While you are inside a group, only the groups among its parts can be edited; to edit another one, finish first.

Unlike {{ui:editor.tool.ungroup}}, which takes a group apart for good, editing keeps the group: its name and settings stay, and you can always go back with {{ui:common.cancel}}.

A note: fillets and chamfers you had put on the **whole** group are lost on rebuild. The bar tells you so.

## Splitting

{{ui:editor.tool.split}} in the {{ui:editor.group.modify}} area cuts the selection in two with a plane - a part too big for the print bed, say, or one you want to see the inside of. Select one or more solids or holes and click it. A translucent plane shows exactly where the cut will go, and a white line marks it on the bodies themselves, where the plane meets them; nothing changes until you apply it.

- {{ui:split.orientation}}: **X** makes an upright cut between left and right, **Y** between front and back, **Z** a horizontal cut between top and bottom. The axes are named as on the Position card, with Z up. The plane starts parallel to the workplane, so on the base plate with Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} lays the plane parallel to the workplane, {{ui:split.workplaneAcrossX}} and {{ui:split.workplaneAcrossY}} stand it square to it, across its X or Y direction. Where the workplane's origin crosses the selection the plane goes through it, otherwise through the middle. So you put the workplane on a sloped face with [[W]] and cut right there, without turning the sliders.
- {{ui:split.position}}: where the plane crosses, with the slider or typed in. It starts in the middle. You can also drag the arrow head on the plane; the plane moves along the arrow in 0.1 mm steps.
- {{ui:split.pickFace}}, the button next to the position, lays the plane on a face: click it, then click the face. Orientation, both rotations and position are set to match. While you pick, a blue plane under the pointer shows the face it will take. A face of a body that is not selected works too, to line the cut up with it, but the plane stays within the selection. [[Esc]] stops picking and leaves the plane where it was.
- The two rotation sliders below turn the plane about the other two axes, up to 180° either way, for an angled cut. They can be combined.

{{ui:split.apply}} or [[Enter]] makes the cut, [[Esc]] cancels (while picking a face, the first [[Esc]] only stops picking). Every object the plane crosses becomes two closed bodies, named after their side, for example "Box (Z+)" and "Box (Z-)"; objects it misses stay as they are. A hole becomes two holes, and a hollowed body keeps its cavity. Both halves stay where they were - for printing, lay each one on its cut face with {{ui:editor.tool.layFlat}}.

The halves are plain meshes: settings such as a cylinder's sides or a text's lettering are gone, so set those first. [[Ctrl]]+[[Z]] brings the original back in one step. Locked and hidden objects cannot be split.

An imported mesh needs a closed surface to be split, grouped or cut. If it has openings, such as the eyes of a figure left open or a crack in a scan, layerling closes them with a flat cap first and says how many it closed. It closes small openings and flat ones of any size; a large opening whose rim bends is left to you, and the message says so. Close it in the program the model comes from, or with a mesh repair tool, and import it again.

## Separating parts

If a shape consists of several separate pieces, such as text made of single letters, {{ui:inspector.separateParts}} splits it into independent shapes. The entry is also in the menu you get with a right click on the shape.

> **Tip:** Always build holes a little longer than the part they are to pass through. If the hole ends exactly flush with the face, a wafer-thin skin sometimes remains. One millimetre of overshoot makes sure.
