---
title: Breaking edges and hollowing bodies
summary: Chamfer and fillet on chosen edges, walls of equal thickness for boxes, cups and cases.
---

## Chamfering and filleting edges

Sharp edges rarely look good on a printed part, and they are not particularly strong either. A **chamfer** cuts the edge off at an angle, a **fillet** rounds it. Both act on the edges you click.

1. Select the body (or the group).
2. Click {{ui:editor.tool.fillet}} or {{ui:editor.tool.chamfer}} in the ribbon, press [[B]] for the fillet or [[Shift+B]] for the chamfer, or right-click the body and pick it from the menu.
3. The body's edges light up. Click those that should be affected. Another click takes an edge out again. With [[Shift]] you add or remove a single edge.
4. Set the size and confirm with {{ui:edge.apply}} or [[Enter]]. Afterwards the window stays open on the new body with the same size, so the next fillet or chamfer can follow at once; {{ui:edge.done}}, [[Esc]] or the cross closes it. With [[Shift]] or [[Ctrl]] a click on {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} or {{ui:edge.horizontalEdges}} adds those edges to the ones picked instead of replacing them.

![The "Fillet edges" tool: all sharp edges are selected, the picture shows the preview with a 4 mm radius.](shot:fillet-preview)

The tool window sits at the top right. If it covers edges you want to click, drag it away by its title bar; it opens there next time too, and so do {{ui:editor.tool.hollow}} and {{ui:editor.tool.array}}. Double-click the title bar to put it back.

Picking a shape from the shape list while the tool window is open closes it without applying anything, and the edges you clicked are forgotten. The click then places the new shape instead of picking edges.

In the tool window you find:

- {{ui:edge.allSharpEdges}} selects every edge at once, {{ui:edge.clear}} empties the selection.
- **{{ui:edge.radius}}** for the fillet. For the chamfer you set {{ui:edge.distance}} or {{ui:edge.angle}}.
- {{ui:edge.variableRadius}} (fillet only) lets the radius change along one edge: small at one end, larger at the other, evenly in between, as where a straight wall meets a slanted one. Click a single edge, then set {{ui:edge.radiusStart}} and {{ui:edge.radiusEnd}}. Which end counts as the start follows from how the edge was built; if the larger radius comes out at the wrong end, {{ui:edge.swapEnds}} turns it round. It works on one edge at a time, so round several edges one after the other. {{ui:edge.editAction}} brings both values back.
- {{ui:edge.concave}} (fillet only) turns the fillet round: instead of rounding the edge off, it cuts a quarter-round scoop out of it, like the notched corners of a box. The scoop is a cylinder of the chosen {{ui:edge.radius}} lying along the edge, so it works for any angle between the faces, but on straight edges only, and not together with {{ui:edge.variableRadius}}. {{ui:edge.editAction}} brings it back.
- {{ui:edge.sharpThreshold}} decides which edges count as sharp at all. A value of 25° treats only clear kinks as edges and leaves flat transitions alone.
- {{ui:edge.verticalEdges}} picks the edges that stand straight up, such as the corners of a box: one fillet then rounds all the vertical corners at once.
- {{ui:edge.topEdges}} picks only the edges along the very top of the body. It is the quick way for a cookie cutter: build the outline in a sketch as a stroke, then chamfer the top edges. {{ui:edge.angle}} sets how steep the chamfer is; it cannot reach further than the wall is thick.
- {{ui:edge.bottomEdges}} picks only the edges along the very bottom of the body, the mirror of {{ui:edge.topEdges}}. It is the quick way to round or chamfer only the foot of a part.
- {{ui:edge.chamfillet}}, chosen at the top of the chamfer window next to {{ui:editor.tool.chamfer}}, makes the printable foot of a part: a chamfer at the plate that blends tangentially into a fillet toward the wall, so the first layers need no support and the edge still ends soft. {{ui:edge.distance}} is the height the foot takes up, {{ui:edge.angle}} (15° to 75°) the steepness of the chamfer at the plate. Pick the edges with {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} hides the edges that lie behind the body from where you look. By default every edge shows through the body, which gets confusing on a busy part; with the switch on you see, and can click, only the edges facing you. Turn the view to reach the others. An edge drawn in red (see below) always shows.
- {{ui:edge.tangentChains}}: a click then also picks edges that flow smoothly into each other, for example all edges around a face with rounded corners. The switch only decides what a click picks: the CAD kernel always carries a chamfer or fillet on along such smoothly continuing edges. The tool window tells you along how many more edges that happens.
- {{ui:edge.keepSize}} keeps the chamfer or fillet as large as it is, even if you scale the body later.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} or {{ui:edge.fine}}) decides how finely the preview is calculated. For difficult parts {{ui:edge.draft}} is faster.
- The window keeps its settings in this browser, one set each for chamfer, fillet and chamfer-fillet: size, angle, threshold, preview quality and the switches stay as you left them after {{ui:edge.apply}}, after an undo and the next time you open the tool. A size the body cannot take gives way to the one worked out from the body. Only {{ui:edge.tangentChains}} starts anew: on for a body's first chamfer or fillet, off after that.

While you adjust the size, layerling recalculates the preview. It can take a moment. You may keep adjusting; the last value you chose is what gets calculated.

If the size is too large for the edge, layerling says so and suggests a smaller value. Often one or two millimetres less will do. At sharp angles a fillet needs more room than its radius suggests. On a small screen the tool window scrolls down by itself so the message is in view.

When a selection that worked fails after you click one more edge, that edge turns red and is drawn wider: it is the one that cannot be treated together with the others at this size. Click it again to take it out, or make the size smaller. If you click more edges while the message stands, the first one stays red. When there is no earlier selection that worked - the very first click, or a size you just raised - the edges that fail even on their own turn red, or all of them if it is only their combination.

Before it gives up, layerling tries once more with the short edges at the ends of the picked ones, up to twice the size long. One sits where an earlier chamfer ends on a wall that is still sharp: a short slanted edge in the corner, and the corner cannot be treated while it stays sharp. If that helps, those edges are picked as well, and a message says how many were taken along. And where the picked edges meet in a sharp inner corner, as two discs of a cloud do, a fillet has no room at any size: layerling then rounds those corners first, at the same size or a smaller one, and the message says how many and how much (a chamfer chamfers them).

The edge under the pointer is drawn wider too, so you can see which one a click will pick.

A hole takes {{ui:editor.tool.chamfer}} and {{ui:editor.tool.fillet}} as well, and so do {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} and {{ui:editor.tool.deleteFace}}: it stays a hole and cuts with its new shape. Rounding the four upright edges of a box hole cuts a pocket with round inside corners, and a hole grown with {{ui:editor.tool.offset}} cuts with that much more room. To break the edge where a hole meets the part, treat the finished group instead: that edge belongs to it.

### Taking an edge treatment back

A treated body can always be treated again. Select it again and open the tool - Fillet, Chamfer or Hollow, each shows the list: under {{ui:edge.featureHistory}} you see what is already on it. {{ui:edge.revertAction}} takes back a single treatment. Note: if newer treatments lie on top, they go with it, and the tool window tells you how many.

Next to a chamfer, a fillet or a hollowing there is also {{ui:edge.editAction}}. It takes the treatment back the same way, but opens the tool again at once with the same edges and the old value. You change the value and apply it again: a 3 mm fillet becomes a 5 mm one without clicking the edges once more. If newer treatments lie on top, they go with it here too. This holds for edge treatments you make from now on; older ones only offer taking back, and so do single parts of a group.

On a group, say a cylinder with a hole, the treated edge belongs to the finished body, not to one of its parts. So the group becomes a single body. {{ui:editor.tool.ungroup}} still works on it: it takes the edge features back first and then dissolves the group, in one step that [[Ctrl]]+[[Z]] undoes. Take the treatment back as described above and the group returns with all its parts. The easiest way is to treat edges last. That goes for threads too: the edge tool takes a thread as its exact body, so a block with a tapped hole in it gets its edges rounded with the thread in place. Working out a thread's edges takes longer than for a plain shape, a few seconds for an M6 and about half a minute for a G1/2 pipe thread.

> **Good to know:** layerling works with real CAD geometry for fillets and chamfers, not just a triangle mesh. That is why a rounded edge is still a rounded edge in the STEP export.

A part imported as STEP keeps its CAD geometry too: chamfers, fillets and hollowing work on the body from the file, however finely the part is drawn on screen. STL, OBJ and 3MF bring only triangles, and a finely drawn part can be too dense for the edge tool. If a part is also available as STEP, import that. {{ui:editor.tool.makeExact}} turns such a part into an exact body with real planes and cylinders first, see [Files, saving and sharing](chapter:files-and-saving), "Making an imported mesh exact".

## Hollowing bodies

Boxes, cups, cases and covers have one thing in common: they are empty inside, with walls of equal thickness. That is exactly what {{ui:editor.tool.hollow}} does.

1. Select the body and click {{ui:editor.tool.hollow}}, or right-click the body and pick it from the menu.
2. Set the {{ui:shell.wall}}.
3. Under {{ui:shell.openings}}, switch on the sides that stay open: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} or {{ui:shell.side.right}}, as many as you like - {{ui:shell.side.front}} alone makes a slot for a drawer, {{ui:shell.side.left}} and {{ui:shell.side.right}} a tunnel. With no side switched on the body stays closed all round, with a cavity in the middle. {{ui:shell.side.closed}} switches every side off in one click. {{ui:shell.side.top}} is already on when the tool window opens; a click on it closes the top again. A body closed all round looks unchanged from outside: the section view shows the cavity.
4. Decide whether the {{ui:shell.edges}} should be {{ui:shell.edges.round}} or {{ui:shell.edges.sharp}}.
5. Click {{ui:shell.apply}}.

![The hollowing tool window with wall thickness, a switch for each side that stays open, and the inner edges.](shot:hollow-panel)

The walls grow inward. The outside stays as it is.

The {{ui:shell.edges}} only matter where the inner walls move apart - at a step in the body or around an opening. The corners of the cavity of a plain box are always sharp, with both settings. For a rounded inside, round the outside edges of the body first (see above), then hollow it: the inside follows with the radius minus the wall thickness. If the rounded inside cannot be built, which can happen with an outline made of very many short straight pieces such as a traced drawing, layerling builds the same hollow body with sharp inner corners instead.

![The result: a shell with a 3 mm wall, open at the top.](shot:hollow-result)

![The same box with only the front side open: a slot for a drawer.](shot:hollow-sides)

For every open side, the body needs a flat face at its very edge on that side. Spheres and free-form shapes therefore cannot be hollowed this way. If the wall is too thick for the body, layerling tells you and asks for a thinner one. A rounded box whose top and bottom edges are rounded as well is such a case: its wall has to be clearly thinner than that rounding, or set the rounding to 0 first.

A body with a pocket - a block with a hole that does not go all the way through, made by grouping a box with a raised hole - can be hollowed too, with the top open: the walls round the pocket are hollowed as well, so a ring of cavity stays between the outer wall and the pocket, open at the top, and a thin cavity lies under the pocket's floor.

**Bodies that end in a point,** such as a cone or a revolved triangle, have no flat face on top that could stay open. A fully closed cavity does not work there either, because a point cannot be offset inwards: even with a 1 mm wall you get the message that the walls cannot be this thick. Draw the wall into the profile before revolving instead: duplicate the outline, scale the copy down evenly, put it in the middle of the large outline and cut the large one with it, then revolve the whole (chapter Sketches, section Revolve). The distance between the two outlines is the wall thickness.

If you resize a hollowed body later, layerling hollows it again at the new size right away. The wall stays as thick as you chose, round bodies included. A cylinder you pull further one way than the other becomes an ellipse. Fillets and chamfers you laid on it after the hollowing go on again at the same edges.

> **Tip:** With a 0.4 mm nozzle, 1.2 to 2 mm of wall is a good start: thin enough to save material, thick enough for a sturdy part.

## A lid for an open body

{{ui:editor.tool.lid}} makes the lid for a body that is open at the top: a box you hollowed with its top open, a pot, a tray. Select the body and click {{ui:editor.tool.lid}}. In the window you choose the kind:

- {{ui:lid.type.plug}}: a plate as large as the body with a lip below it that goes into the opening.
- {{ui:lid.type.cap}}: a plate a wall wider than the body with a rim below it that goes over the outside.
- {{ui:lid.type.both}}: a plate a wall wider than the body with both: a lip into the opening and a rim over the outside. The body's wall sits in a groove between them, like on a food container.
- {{ui:lid.type.flat}}: only the plate, to lay on top or glue on.
- {{ui:lid.type.screw}}: a cap that screws on like a jar's lid, for a round body; more about it below.

Then you set the {{ui:lid.thickness}}, the {{ui:lid.fit}} (the {{ui:lid.gap}} between lid and body: 0.1 mm tight, 0.2 mm normal, 0.3 mm loose, or any value up to 1 mm) and how deep the lip or rim reaches down and how thick its wall is. Click {{ui:lid.apply}}: the lid lies beside the body, turned over with its plate down, so it prints without support. The body stays as it is. The lid follows any outline, round or angular, because it is taken from the body itself just below its rim. A body without an opening at the top only gets a flat lid; for the others, hollow it with the top open first. For a body that is an exact CAD body, such as a rounded box hollowed with Hollow, the lid is one too, with round corners that stay round: round or chamfer its edges with the edge tool like any other. Other bodies, and lids with posts for the magnets, get a lid made of triangles.

> **Tip:** How tight a lid sits depends on the printer. Print a small box with its lid first; if the lid is too tight, take the next looser fit.

Tick {{ui:lid.magnets}} and the lid holds by four round magnets instead of a tight fit. Pick a {{ui:lid.magnetSize}} (6 × 2, 8 × 3 or 10 × 3 mm) or set its {{ui:lid.magnetDiameter}} and {{ui:lid.magnetHeight}}, and the {{ui:lid.magnetGap}}: 0.1 mm to press the magnets in, 0.2 to 0.3 mm to glue them. Layerling cuts a pocket into each corner of the body's rim and one facing it into the lid's plate, a little deeper than the magnet, so it never stands proud. Where the wall is too thin for a pocket, a post fills the corner from the bottom up to the rim, and the lid's lip goes round it. The body is grouped with its pockets and posts: ungroup it and you have it back as it was. The plate must be at least the magnet's height plus 0.8 mm thick; switching the magnets on makes it so.

Tick {{ui:lid.hinge}} and the lid swings open about a pin along a straight side of the body: the back, or the side you pick under {{ui:lid.hingeSide}} (as in the starting view, where the back faces away from you). Knuckles take turns along it, the outer ones on the body and those between on the lid, {{ui:lid.hingeGap}} apart, and a hole for the pin goes through them all: with a {{ui:lid.hingePin}} of 1.75 mm a piece of filament is the pin; tick {{ui:lid.hingePrintPin}} for a thicker one printed apart. The pin sits tight in the body's part of the hinge, so a piece of filament pressed in stays put, and turns in the lid's: {{ui:lid.hingePinPlay}} is its room there on each side, 0.2 mm to begin with; give it more if the lid turns stiffly. The body's knuckles stand on a 45° slope, so the body prints upright without support; the lid's are flush with its top, so it still prints turned over. {{ui:lid.hingeKnuckles}} at 0 gives about one knuckle per 10 mm. A hinge goes with a lid that pushes in or a flat one; a rim round the outside would hit the back wall as it opens. On a round side, a pot or a tube, the hinge runs where the wall stays within a knuckle's radius of the hinge's line, and the body's knuckles stand on a small block that reaches in to the wall. {{ui:lid.hingeTeardrop}} (on to start with) gives the pin's holes a point on top as each part is printed, so they do not droop; a printed pin lies on a small flat. Under {{ui:lid.hingeStyle}}, {{ui:lid.hingeStyle.flush}} puts the knuckles into the wall instead of behind it: the box keeps its size, each part is notched round the other's knuckles, and the lid opens to about 140°. {{ui:lid.hingeStyle.pivot}} makes a lid that lies in the opening on a small ledge and turns on two pins through the side walls, to about 95°; the box keeps its size there too. Both need a straight side and go without magnets.

For a {{ui:lid.hingeStyle.flush}} hinge, tick {{ui:lid.hingeEndPlugs}} to close the pin's hole at both ends, so the pin stays hidden and cannot slide out. The last 4 mm of the hole at each end are then square, standing on a corner so that they too have a point on top and print without drooping, and just large enough for the pin to pass: push the pin in first, then press a plug into each end. The square plugs cannot turn and sit as tight as the pin does in the body; each is cut flush with the outside of the box, rounded corners included (on such a box the hinge runs on into the corners, with plugs or without). They come out beside the lid, lying on a flat side. The pin is shorter by them, and the status bar says how long.

> **Tip:** Press the magnets into the body first. Then set one more magnet on each of them, where it snaps on the right way round, and press the lid down onto them (with a drop of glue in its pockets if they are loose): each magnet goes into the lid facing its partner, so they attract.

Tick {{ui:lid.clickBumps}} and the lid clicks shut: small round bumps on the outside of its lip (on a lid that goes over the top, on the inside of its rim) snap into dimples that Layerling cuts into the body's wall at the same places, one in the middle of each straight side of 12 mm or more, two on a side over 80 mm, four round a round opening, and none on the hinge's side. {{ui:lid.clickBumpHeight}} is how far each bump reaches into the wall, 0.4 mm to begin with: less for a small box or a stiff lip, more for a firmer click. Under {{ui:lid.handle}}, {{ui:lid.handle.tab}} gives the plate a tab 6 mm out from its front edge (or the edge opposite the hinge), as thick as the plate, so the lid still prints turned over, and {{ui:lid.handle.notch}} cuts a recess for a finger into the body's front wall just below the lid's edge, always leaving 0.8 mm of the wall; neither goes with a pivot lid, nor do the bumps with a flat one.

Pick {{ui:lid.type.screw}} and the lid screws on like a jar's: the body gets a thread on the outside of its top, and the cap the same thread inside its rim. This needs a round body, such as a cylinder, a tube or a round pot hollowed with its top open, with a wall at least 0.8 mm thick; a box or an oval is refused. The thread is added to the outside of the wall rather than cut into it, so even a thin wall keeps its strength, and it is grouped with the body: ungroup it and you have the body back as it was. {{ui:lid.threadPitch}} is how far the thread climbs in one turn, 3 mm to begin with, as on a jar; the thread is three tenths of that deep (at most 1.5 mm), its flanks at 45°, so the body prints upright and the cap on its plate, both without support. {{ui:lid.threadTurns}} is how many times it goes round, and with the pitch how far the cap's rim reaches down. The {{ui:lid.gap}} is the thread's room on each side, measured across the radius as for a nut; if the cap turns stiffly, take a looser fit. Turn the cap clockwise to close it. Cap and thread are made of triangles, and magnets, a hinge, click bumps and a handle do not go with a screw lid.

## A cable channel through a body

{{ui:editor.tool.cableChannel}} runs a round tunnel through a body for a cable or an LED lead, from where it goes in to where it comes out, and finds the way itself. Select the body and click {{ui:editor.tool.cableChannel}}, then click on the body where the cable goes in ({{ui:cable.entry}}) and where it comes out ({{ui:cable.exit}}). The way starts and ends straight along the surface, runs straight where it can and bends where it must, never tighter than {{ui:cable.minBend}}, and keeps as far from the outside as it can, never closer than {{ui:cable.minWall}}. A cable pushes through a bend of about five times its diameter; {{ui:cable.diameter}} is the channel's own.

While the panel is open the body is seen through, with the channel inside it and a mark on each end. The panel says how long the channel is, its tightest bend and its thinnest wall, and in red when a bend or the wall had to be smaller than asked; a smaller value for {{ui:cable.minBend}} or another entry or exit helps then. {{ui:cable.pickAgain}} moves an end. {{ui:cable.apply}} cuts the channel in: it becomes a {{ui:shape.bentTube}} as a hole, grouped with the body, so the body stays exact, and after ungrouping the tube can still be changed. A bent tube has at most eleven bends; a way that needs more asks for another entry or exit.

## Offsetting bodies

Every face of a body can be moved by the same distance, out or in. That is what a press fit, a lid or a snap joint needs: a gap of 0.1 to 0.3 mm all round while the features stay where they are, which scaling cannot give you.

1. Select one body and click {{ui:editor.tool.offset}}, or right-click the body and choose it there.
2. Choose {{ui:offset.grow}} or {{ui:offset.shrink}} and set the {{ui:offset.distance}}.
3. The {{ui:offset.edges}} decide the outer corners: rounded keeps the offset surface round there, sharp lets the faces run on until they meet.
4. Tick {{ui:offset.copy}} to keep the part as it is and get the grown body as a copy that already is a hole. Group that hole with the mating part and it cuts exactly the clearance you chose.
5. Click {{ui:offset.apply}}.

Tick {{ui:offset.sideways}} when only the outline should grow or shrink: the sides move by the distance, while every flat top and bottom stays at its height. A sign gets a border all round, a base gets wider, and the body does not get taller. On a stepped body each step keeps its own height. A text that is offset through its outlines keeps its height then too.

Without the tick the body itself is offset. It becomes a fixed exact body, like after a chamfer: the list at the top of the tool window takes the offset back, and {{ui:edge.editAction}} opens the tool again with the old distance. Only bodies that are exact CAD bodies can be offset - boxes, cylinders and the other shapes, groups of them, imported STEP parts. A body that is only a triangle mesh, such as many STL imports, often cannot be. A distance that is too big for the body, for example a shrink beyond its thinnest wall, is refused.

A text whose letters the kernel cannot offset as a body - in some fonts an A, B, M, N, W or 9 - is offset through its outlines instead: it gets the fill {{ui:prop.textWider}} by the distance (narrower when it shrinks) and grows by as much at the top and the bottom. It stays a text you can go on editing. This works for a text with filled letters and no rounding; one that already has a fill mode is refused as before.

## Deleting faces

A fillet in the way, a hole in the wrong place, a boss you no longer need: {{ui:editor.tool.deleteFace}} takes it off the body again, without building the body anew.

1. Select the body and click {{ui:editor.tool.deleteFace}}, or right-click the body and pick it from the menu.
2. Click every face of what should go: the faces of a rounded edge, the wall of a hole, the side and the top of a boss. A picked face lights up; another click takes it out again. The tool window counts the faces.
3. Click {{ui:deleteFace.apply}} or press [[Delete]]. [[Esc]] closes the tool without changing anything.

The faces around the deleted ones grow until the gap is closed. A box with rounded top edges gets its sharp edges back, a hole is filled, a boss is gone. The body stays exact, so it can be filleted and chamfered again and the STEP export keeps its true faces. [[Ctrl]]+[[Z]] takes the deletion back in one step. It is also listed under {{ui:edge.featureHistory}} with the fillets and chamfers, where {{ui:edge.revertAction}} takes it back; there is no {{ui:edge.editAction}} for it. On a group, the result is a single body, as with an edge treatment.

Pick all the faces of what should go, and only those. If the faces around them cannot close the gap, layerling says so and nothing changes: a main side of a box, for example, has no neighbour that could take its place. Deleting only the floor of a pocket turns it into a hole straight through, because the walls of the pocket run on to the other side.

{{ui:editor.tool.deleteFace}} needs exact faces: it works on parts imported as STEP and on layerling's shapes. Whatever layerling keeps as a mesh has none: an imported STL, OBJ or 3MF, a split, wrapped or simplified body, or a very detailed shape such as a long text. Import a part as STEP if you can. On a detailed imported part, a few faces can be too much for the CAD kernel: after 45 seconds the deletion is stopped and nothing changes. A body resized after an edge treatment while keeping its edge size has no exact faces at its new size until the resize is taken back.

An imported mesh made exact with {{ui:editor.tool.makeExact}} can keep hair-thin faces where the file's triangles were bad, between faces that lie in one plane, so that one side comes out as strips that cannot be deleted on their own. Such a thin face, too narrow to click, goes with a picked face when it touches it and leads on to another face in the picked face's plane, together with the thin faces joined to it that touch a face in that plane too; the tool window counts them as taken along.
