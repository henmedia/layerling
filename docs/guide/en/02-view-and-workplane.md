---
title: View and workplane
summary: Moving around the scene, looking straight on, and placing new shapes on any surface you like.
---

## Moving around

With the mouse:

| What you do | What happens |
| --- | --- |
| drag with the right button | rotate the view |
| click the right button | on a body, a menu with the most used commands: duplicate, hole or solid, group, hide, lock, delete and more; on empty space Paste and Select all |
| drag with the middle button | move the view |
| mouse wheel | zoom in and out |
| hold [[Ctrl]] / [[Cmd]] and drag with the left button | also moves the view (on a MacBook trackpad: hold [[Cmd]], press and drag); on a Mac, holding Control instead turns the view, as Control-click is the Mac's right click |
| double-click on empty workplane or beside the plate | moves the view so that the spot comes to the middle; the view then turns around it |

How fast the wheel zooms is set with {{ui:workspace.zoomSpeed}} in the settings, under {{ui:workspace.appearance}}: a slider from 1 to 14, 5 to begin with. It sets the wheel and the trackpad only: the buttons and the keys [[+]] and [[−]] always zoom in the same small steps. One notch of a mouse wheel zooms alike in every browser, a trackpad zooms with how far you stroke.

**Mouse buttons as in your slicer.** If you are used to Bambu Studio or OrcaSlicer, set {{ui:workspace.mouseScheme}} in the settings, under {{ui:workspace.appearance}}, to {{ui:workspace.mouseSchemeSlicer}}. A left drag on empty space then turns the view, the right button shifts it as the middle one does, and Shift with a left drag draws the selection box. A drag on a body still moves it, and a short right click still opens the menu. In a sketch the right button shifts the view too.

**3D mouse.** A SpaceMouse or another 3D mouse turns, shifts and zooms the 3D view: push the cap away to zoom in, slide it to shift the view, tilt it to tilt the view and twist it to turn the view round. In the settings, under {{ui:workspace.appearance}}, click {{ui:workspace.spaceMouseConnect}} and choose the device in the window the browser opens; it remembers the choice, so this is needed only once. This works in Chrome and Edge, which can reach such devices; Firefox and Safari cannot.

On a tablet or phone, two fingers zoom (spread and pinch) and move the view (slide together). One finger on empty space turns the view, and a tap there clears the selection; on a shape or a handle it works on the design, just like the left mouse button. To turn the view with a finger that starts on a shape too, switch on {{ui:camera.touchRotate}} in the camera bar. That switch shows on devices with a touch screen.

A graphics tablet with a pen behaves like a mouse: the tip is the left button, the barrel button on the pen the right one, for turning the view and for the menu. The tablet's hotkeys can be set in its driver to layerling's [keyboard shortcuts](chapter:shortcuts).

**On a tablet, work with a stylus if you can.** Its tip is far finer than a fingertip and does not cover what you aim at, so small points, thin lines and handles in a sketch, measuring points and edges are hit exactly, and longer work is less tiring. layerling already lets a finger reach a little further to points, lines, handles and edges than a mouse pointer does, but a stylus remains the more precise way. This holds for a pen that the tablet knows as a pen (an S Pen, an Apple Pencil and the like). A plain stylus with a rubber tip counts as a finger for the screen and is not finer than one.

There is no right mouse button on a tablet: hold a finger still on a shape or on empty space for half a second, and the menu opens that a right click opens, with **Select all** on empty space. **Select multiple** in the same menu stands in for Shift on a tablet: each tap on a body then adds it to the selection or takes it out again, until you tap empty space or press [[Esc]]; a finger on empty space still turns the view. The handles around a selected shape can be caught by a finger from a little beside them.

### The view cube

The cube in the top left shows where you are looking. A click on one of its sides jumps to the straight view from top, bottom, front, back, left or right. A click on a corner of the cube looks at the model diagonally from that corner, and a click near an edge looks from that edge, between two sides; the spot lights up while the pointer is on it. The number keys [[1]] to [[6]] give the straight views too. Hold [[Shift]] with them and the view also zooms to the selection, as [[Shift]]+[[F]] does.

Drag the cube to turn the view around, just like dragging with the right mouse button. With nothing selected, the arrow keys turn the view as well: 15° a press, 90° with [[Shift]]. They turn the model the way they point - [[→]] turns its front to the right, [[↑]] tilts its front upwards. With [[Ctrl]] held, the arrows slide the view across the screen instead: a tenth of the picture a press, half of it with [[Shift]] as well. The model moves the way they point. If something is selected, the arrows move it; click on empty space first to turn the view. On a touch screen this works with one finger, without switching on {{ui:camera.touchRotate}}.

### The camera bar

At the left edge is a narrow bar. From the top:

- {{ui:camera.home}} brings the whole scene back into view. The key is [[Home]]; [[F]] does it too when nothing is selected.
- {{ui:camera.focusSelection}} zooms to the selection ([[F]] or [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} and {{ui:camera.zoomOut}} zoom step by step, as do the keys [[+]] and [[−]].
- {{ui:camera.orthographic}} switches to a flat view in which parallel edges stay parallel. For measuring and lining up edges that is often more comfortable than the perspective view. [[O]] switches back and forth, and a second click returns.
- {{ui:camera.secondView}} opens a second view of the design in a window of its own, described below. A second click closes it.
- {{ui:camera.hideWorkplane}} (the eye over a grid) hides the plate with its grid, so you can look at the underside of a design from below. Only the view changes: new shapes still land on the workplane. A second click shows it again.
- {{ui:camera.placeWorkplane}}, the tape measure and the framing square are tools of their own, covered below and in [Measuring and notes](chapter:measuring-and-notes).

The small arrow at the very top of the bar hides it if it gets in the way. That same button, dragged, moves the bar anywhere in the editor, in a sketch too; a double click puts it back. The 3D preview of a revolved sketch moves by its title in the same way.

A design opens the way you left it: the angle, zoom and position of the view are kept with it in this browser, so you continue where you stopped, also after going Home or closing the page. A saved file (.lyl) carries the view along, so it opens in it elsewhere too. The view is not part of the undo history.

You can also keep four views of your own in each design. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] or [[Shift]]+[[0]] saves the view exactly as it is - angle, position, zoom, and flat or perspective - under that key, and the key alone ([[7]], [[8]], [[9]] or [[0]]) brings it back. A message at the bottom confirms the save; saving again under the same key replaces the view. Like the view above, the saved views stay with the design in this browser and travel in a saved file (.lyl), and they are not part of the undo history.

### A second view in its own window

{{ui:camera.secondView}} opens a window that shows the same design through a camera of its own, so you can see it from two sides at once - from the front, say, while you work from above. Every change you make in the editor shows there straight away; the design is only changed in the main window, and the handles stay there too. In the second window the mouse and the view cube turn its view as they do here, and so do the keys: [[1]] to [[6]], [[F]], [[Home]], [[O]], [[+]] and [[−]], the arrow keys to turn and [[Ctrl]] with the arrows to slide. [[F]] there zooms to what is selected in the editor. The design's four saved views work there too: [[7]], [[8]], [[9]] and [[0]] bring them back, and [[Shift]] with one of these keys saves that window's view under it - for both windows. Its own camera bar has {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} and {{ui:camera.hideWorkplane}}, and they act on that window alone. The window opens where you left it, at the same size, and closes with the editor. On phones and tablets the button is not shown.

## Looking inside: the section view

{{ui:camera.sectionView}}, the last button in the bar (the cut tool), cuts the view open along a plane so you can check walls, cavities and parts that fit into each other. Nothing is cut for real: the design, its files and every export stay whole. Where the plane goes through a solid, the cut is filled with the colour of the body a little darker, and a hole inside it stays empty, so you can tell solid from hollow; the filled face appears a moment after the plane stops moving. Under {{ui:camera.sectionCutFace}} you choose how the cut looks: {{ui:camera.sectionCutFaceHatch}}, the start, hatches it like a drawing, and a body that lies inside another is hatched the other way, so the two stand apart; {{ui:camera.sectionCutFaceFill}} fills it plain; {{ui:camera.sectionCutFaceOpen}} leaves it open, and you look into the skin of the body. The choice holds for every design.

- Choose the axis the plane stands across: X (width), Y (depth) or Z (height), as in the position fields. The plane starts in the middle of your design.
- {{ui:camera.sectionOrientation}} sets what these axes follow. {{ui:camera.sectionOrientationWorld}} takes the design's axes. {{ui:camera.sectionOrientationWorkplane}} takes the workplane's: Z then cuts parallel to it, X and Y square to it, and the position counts from its origin. With the workplane on a sloped face you cut parallel to that face, and the cut moves along when you move the workplane. {{ui:camera.sectionOrientationView}} turns the plane to face the screen: it takes away what lies in front, and the slider pushes it deeper into the design along your line of sight, for example to reach a buried part and click it. After turning the view, click it again and the cut follows the new view.
- {{ui:camera.sectionCoarse}} moves the plane across the whole design, {{ui:camera.sectionFine}} moves it a little either side of where it stands, for tenths of a millimetre. You can also type the position.
- The button beside the axes shows the other side of the cut, {{ui:camera.sectionReset}} puts the plane back in the middle, and {{ui:camera.sectionShowPlane}} hides the blue plane.
- You can click and select what the cut lays open, inner walls included.
- {{ui:camera.sectionWorkplane}} puts the workplane on the cut. It lies on the plane of the section and faces out of the body that stays, like the face a cut leaves. If you then switch to the sketch, it starts exactly there, and the faint outline shows the cut, which you can draw along and snap to. That is how you sketch a lid that fits the cavity you opened with the section, for example. The button beside the axes chooses which side stays, and with it which way the workplane faces. You put the workplane back on the base plate as usual.
- {{ui:camera.sectionSketch}} starts a new sketch right on the cut, with the cut's outlines already in it as lines: a hole comes in as a true circle, a rounded corner as an arc. Change them, delete what you don't need, draw more, and finish: the body grows out of the cut towards the side that is cut away, so a part that has to fit another one, such as a lid, an insert or a gasket, starts from that part's own outline. The button beside the axes chooses that side. As for the SVG, only visible bodies count and holes are already taken off.
- {{ui:camera.sectionMeasure}} measures right on the cut: the outline shows in blue, and two clicks on it give the distance, plus its parts along the plane's two axes. Both points snap to the outline, corners first. When the second click lands anywhere on the opposite wall, it snaps square to the first point - so you read wall thickness, gaps and clearance without aiming exactly. A third click starts the next measurement, [[Esc]] ends measuring. Moving the plane clears the measurement. On a round outline, such as the cut through a cylinder or a hole, a small cross marks the centre and the centre snaps too. Click a point on the circle, then go near the point across from it: the second click lands exactly across the centre, and the number reads Ø, the diameter. From the centre to a point on the circle you get R, the radius.
- {{ui:camera.sectionExportSvg}} saves the outlines on the cutting plane as an SVG at 1:1, for a laser, a plotter, a template or a gasket. An X cut is seen from the right, a Y cut from the front, a Z cut from above. As in the export, only visible bodies go in, holes are already taken off, and bodies of the same colour are joined into one outline. Each colour stays its own path without a fill, so laser software keeps them apart as layers.

The panel hangs on its button. If it covers something, drag it by its title bar anywhere on the workplane; it opens there next time too. Double-click the title bar or drop it at the button to put it back.

The X and [[Esc]] close the panel; with a measuring running, [[Esc]] ends it first. The cut stays until you switch it off with {{ui:camera.sectionActive}} or go back to the design overview. While it is on, its button stays highlighted. Anything you place on the side that is cut away only shows once you switch the cut off. A tablet has no [[Esc]], so there the panel has two more buttons: {{ui:camera.sectionBack}} ends the measuring if one is running and otherwise closes the panel, and {{ui:camera.sectionConfirm}} closes the panel in one step. A computer does not show them.

## The workplane

New shapes align with the workplane. At first that is the base plate with the grid. But you can put it on any surface, to place something on a side or a sloped face.

1. Press [[W]] or click {{ui:camera.placeWorkplane}}.
2. Move the mouse over a face of a body. It lights up.
3. A click puts the workplane there. Everything you add now sits on that face.

Click on the empty plate instead, and the workplane lies flat at the spot you clicked, on the snap grid. New shapes and a finished sketch, a revolved one too, then appear there rather than in the middle of the plate. While the workplane lies flat on the plate like this, the plate shows only its outline: two grids in the same plane would make a flickering pattern.

On a face the origin of the workplane otherwise snaps to the grid. Click close to a corner of the face and it sits exactly on that corner. Close to an edge it lies on the edge, and the grid lines up with it; that is how you choose the angle of the grid on purpose. Without a corner or an edge, the grid on a lying face runs parallel to the body, so on a turned box it is turned with it.

A click beside the plate or [[Esc]] returns the workplane to the base plate. Quicker still is {{ui:camera.resetWorkplane}}: the button with the downward arrow sits in the camera bar below the eye while the workplane lies on a face. [[Shift]]+[[W]] puts it directly on the currently selected face. [[Alt]]+[[W]] puts it back on the base plate at any time, whether something is selected or not. If you hold [[Shift]] while clicking, the plane points the other way.

While a workplane sits on a face, an eye appears next to {{ui:camera.placeWorkplane}}. It hides the workplane without dropping it, for a clear look at the design: new shapes still land on that face, and rotating still turns about it. A click on the eye shows it again, and so does setting a new workplane.

## Grid and snapping

The grid shows the size of the plate. At the bottom right is the **snap step**: moving and scaling snap in steps of that size, for example 1 mm. Make it smaller for fine work and larger for rough arranging. {{ui:editor.tool.snapToGrid}} in the ribbon moves the selected shapes afterwards onto the nearest grid crossing. While moving, shapes also snap to other shapes, see [Selecting and arranging](chapter:select-and-arrange). Without the mouse: [[Alt]]+[[1]] to [[Alt]]+[[0]] pick that entry of the menu ([[Alt]]+[[1]] turns snapping off), and [[,]] and [[.]] make the step one size finer or coarser. This works in a sketch too.

> **Tip:** Stop rotating the view when you fit parts together exactly. Use the number keys to go to the straight view from top or front and press [[O]] for the flat display. Then you see at once whether two edges are really flush.

### The settings window

The cogwheel in the title row ({{ui:editor.workspaceSettings}}) opens the settings. On the left are five areas: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} and {{ui:workspace.history}}. A change counts at once. {{ui:workspace.makeDefault}} at the bottom saves the current settings as the default, so that a new design starts with them. A file you open brings its own settings; {{ui:workspace.useMyDefault}} next to it puts your saved colours, grid and the rest on the open design, keeping its units. If your default has a printer, that printer comes along with its plate size; without one the design keeps its plate and printer. {{ui:workspace.close}} at the top right closes the window. This part goes through the settings one by one.

### Appearance: theme, toolbar and view cube

{{ui:workspace.theme}} sets the colour scheme of the whole program: {{ui:workspace.themeSystem}} follows your computer, the others are {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} and {{ui:workspace.themeGraphite}}. You can also change it at the top right of the editor.

{{ui:workspace.toolbarSize}} makes the buttons of the ribbon on top, its shape menu, the camera controls on the left and the properties panel on the right smaller or larger: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (as it always was) or {{ui:workspace.toolbarSizeLarge}}. Small leaves more room for the workplane on a laptop; large is easier to hit on a big screen or with a finger. With large buttons the groups of the ribbon go onto a second row when the window is too narrow for them. The size is kept in this browser and holds for every design.

{{ui:workspace.shapeColors}} puts the colour a new shape starts with on the pictures of the shape library (the colour of its kind, or the one you saved with {{ui:inspector.saveDefaults}}). Switch it off if you prefer grey pictures; your browser remembers the choice.

{{ui:workspace.viewCubePosition}} puts the view cube in another corner of the workplane: {{ui:workspace.viewCubePositionTopLeft}} (as it always was), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} or {{ui:workspace.viewCubePositionBottomRight}}. In any corner but the top left, the camera controls move up into the spot the cube left. In the bottom right the cube stands just above the {{ui:inspector.snapGrid}} control. While the properties of a shape are open on the right, a cube on the right steps to the left of them. The corner is kept in this browser and holds for every design. On a narrow window, such as a phone, the setting is hidden and the cube stays in the top left.

### Appearance: fast mode

{{ui:workspace.fastMode}} is for slower computers. It turns off shadows, edge lines on all bodies and the camera's inertia, and draws the view at screen resolution only. Your own settings are kept for later, and the switches it overrides say {{ui:workspace.offInFastMode}} while it is on. More about what helps on a slow computer is under "When layerling feels slow" below.

### Appearance: colours of the work area and the sketch

The colours of the work area are set under {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} and {{ui:workspace.surfaceColor}} for the light theme (the dark themes keep their own), next to the grid colour under {{ui:workspace.workplane}}. Each colour is a button that shows the colour. A click opens a small window with the colour field, a row of ready colours, a field for the hex value and an arrow that puts the colour back to what layerling started with. [[Enter]] takes a typed hex value, and so does a click outside the window.

The sketch view has its own colours: {{ui:workspace.sketchBackground}} for the window round the sheet, {{ui:workspace.sketchPlateColor}} for the sheet under the grid, and {{ui:workspace.sketchGridColor}}, all for the light theme. {{ui:workspace.sketchMatch}} takes over the work area's three colours in one click.

{{ui:workspace.classicLook}} sets the work area up as Tinkercad shows it: white ground, a pale blue millimetre grid with a darker line every centimetre, black edge lines, light from above with soft shadows. Every value can still be changed on its own afterwards. All of them start as layerling always looked, and what suits you depends on your monitor.

![The settings under Appearance: background and workplane colours for the light theme, and the switch for edge lines on all bodies.](shot:settings-appearance)

![The editor in the dark colour scheme. You set the colour scheme at the top right: System, Light, Dark or Graphite.](shot:editor-dark)

### Appearance: axis arrows and edge lines

{{ui:workspace.showAxes}} (on by default) draws three arrows at the back left corner of the plate: **X** in red to the right, **Y** in green to the back and **Z** in blue upwards, the way the position fields count. That is the right-hand rule Tinkercad, CAD programs and the slicers use too. With the workplane on a face they follow it. Switch them off here if they are in your way.

{{ui:workspace.edgeLines}} draws an outline on every body, in the colour of {{ui:workspace.edgeColor}} (black to begin with, as in Tinkercad): it helps when dark colours run into each other. It is off by default, and very large imported meshes are left out.

![Three dark bodies with edge lines switched on: the outlines keep them apart.](shot:edge-lines)

{{ui:workspace.strongHoles}} draws holes in a darker grey, less see-through and with a dark line round them. It helps when a hole is hard to find among see-through bodies. Unlike the edge lines it stays on in fast mode.

### Appearance: light and shadows

{{ui:workspace.showShadows}} switches the cast shadows on and off. Two sliders set how the bodies are lit. {{ui:workspace.shadowStrength}} says how dark the cast shadows are, and {{ui:workspace.shadeContrast}} moves light from the even ambient light to the main light: towards "punchy" the shaded sides get darker and the shadows show more, towards "soft" everything gets flatter. At the top end the contrast gets very strong, so shaded sides and shadows turn really dark. {{ui:workspace.shadowSoftness}} makes the edges of the shadows soft instead of crisp. {{ui:workspace.lightAzimuth}} turns the main light round the plate (0° from the front, 90° from the right), and {{ui:workspace.lightElevation}} lifts it; at 90° it stands straight above the plate as in Tinkercad, and the shadows fall right under the bodies. {{ui:workspace.softLighting}} brings most of the light from where you look, turning with the view: no face is left dark, and a face of a dark colour that points up is no longer burnt out to white. The main light stays a little for the shadows, and the contrast slider still works. If a bright reflection still shows with the light set low, lift {{ui:workspace.lightElevation}} to 90°: it then looks like Tinkercad. {{ui:workspace.lightReset}} puts everything back.

### Appearance: measures on the workplane

{{ui:workspace.showMoveDimensions}} shows by how much you move while dragging, {{ui:workspace.showOriginDimensions}} the distances of the selection to the origin of the plate, also with several bodies selected. With {{ui:workspace.dimensionsAlwaysVisible}} these measures stay visible permanently, and not only while you drag. While a turned body is selected, its angles show below it on the workplane; {{ui:workspace.showRotationAngles}} switches that off. More in [Measuring and notes](chapter:measuring-and-notes).

### Appearance: selecting and moving

{{ui:workspace.selectBeforeMoving}}: a body then has to be selected first, and only the next drag moves it. That helps when children or hurried hands touch bodies, and on a touch screen.

{{ui:workspace.frameByDirection}}: a frame dragged to the right selects only what lies completely inside it, one dragged to the left everything it touches (drawn dashed), as in SketchUp.

{{ui:workspace.doubleClickOpensSketch}} decides whether a double click on an extruded sketch opens the sketch again, as in Tinkercad, and {{ui:workspace.doubleClickOpensGroup}} whether a double click on a group or a bundle opens it for editing. {{ui:workspace.doubleClickCentersView}} decides whether a double click on empty workplane moves the view to that spot.

{{ui:workspace.objectSnap}} lets the edges and the centre of a shape snap to other shapes while you drag it; the grid menu at the bottom right has the same switch. {{ui:workspace.cruise}} makes a new shape hang on the mouse pointer and land on the face under it, like Cruise in Tinkercad; switched off, a new shape appears in the middle of the plate. More in [Selecting and arranging](chapter:select-and-arrange).

### Appearance: the view

{{ui:workspace.startInPerspective}}: the editor then opens in the perspective view, not in the flat one.

{{ui:workspace.startView}} sets the angle a new design opens in and {{ui:camera.home}} goes back to. Turn and zoom the view the way you like it, then click {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} brings back the usual view from the front right. It holds for every design in this browser. A design you open again still opens the way you left it.

{{ui:workspace.zoomSpeed}} is a slider from slow to fast: how fast the wheel and the trackpad zoom; the zoom buttons and keys keep their own small steps. {{ui:workspace.cameraInertia}}: after you let go of the mouse the view turns on for a moment and slows down gently. Switched off, it stops at once, as in Tinkercad and Fusion 360.

{{ui:workspace.overhangAngle}} is the angle from which a face counts as an overhang when you switch on Show overhangs in the visibility menu: those faces are hatched red and white. 30° is careful, 70° counts on good cooling of the print; 45° is the usual start.

{{ui:workspace.booleanTriangleLimit}} limits how many triangles an imported mesh may have when you cut, merge or intersect it, because that is calculated in your browser. A mesh above the limit is not processed; simplify the mesh first, or raise the limit if your computer can take it. A higher limit can freeze the editor for a few seconds.

### Measurement: units, scale and snap steps

Under {{ui:workspace.measurement}} you set the {{ui:workspace.units}}, the unit that measures are shown in ({{ui:workspace.scale}}: millimetres, centimetres or metres in metric, inches or feet in imperial), how many decimal places a number shows ({{ui:workspace.accuracy}}), the {{ui:workspace.snapGrid}} that moving and resizing snap to and your own snap steps under {{ui:workspace.customSnapGrids}}.

Under {{ui:workspace.measurement}} in the settings you set the {{ui:workspace.units}}. With {{ui:units.imperial}}, layerling shows every measure in inches, on the shape, in the properties panel, on the tape measure and the ruler. The snap grid then offers steps from 1/64 to 1 inch, and the grid on the plate is drawn in inches (1/8 to 1 inch, 1/4 inch by default) with a stronger line on every whole inch. Under {{ui:workspace.inchFormat}} you choose whether inches appear as fractions like in Tinkercad (1 5/8, rounded to 1/64 inch) or as decimals (1.625) with as many decimal places as set under {{ui:workspace.accuracy}}. You can type either, "1 5/8" included. A quick way between millimetres and inches is the small switch **mm | in** beside the {{ui:inspector.snapGrid}} at the bottom of the properties window: it changes the unit, the plate's grid and the snap step as the settings do, for this design.

Under {{ui:workspace.customSnapGrids}} in the same place you add snap steps of your own: a name and a size in millimetres, for example "Pin pitch 2.54 mm" for the spacing of DIP chips, pin headers and perfboard holes, or "MX Key Unit" with 19.05 mm for the spacing of keyboard keys. The snap step menu then offers that measure whole, halved and quartered (1 ×, ½ × and ¼ ×), so shapes can be moved by one pitch, half a pitch or a quarter pitch. If you want just the measure itself, untick {{ui:workspace.customSnapGridParts}} beside it; the menu then has only that one step. Custom steps are kept with the design and go along with {{ui:workspace.makeDefault}}.

### Workplane: plate and printer

{{ui:workspace.printer}} sizes the workplane to the build plate of your printer and flags bodies that reach past it, see [Printing](chapter:printing). {{ui:workspace.showPlateLabels}} writes the design's name on the plate, and the printer's name and build volume when a printer is chosen.

{{ui:workspace.size}} gives the plate a size of your own, with {{ui:workspace.width}} and {{ui:workspace.length}} in millimetres or the unit you chose. The grid always runs through the origin, so the stronger lines lie on the axes whatever the plate measures.

### Workplane: grid

{{ui:workspace.showGrid}} shows or hides the grid on the plate. {{ui:workspace.gridBlockSize}} sets the spacing of its lines, and {{ui:workspace.gridMajorEvery}} whether the darker line comes every 5 or every 10 grid steps; {{ui:workspace.gridMajorColor}} gives that line a colour of its own, and the centre cross and the plate border take it too. {{ui:workspace.gridColor}} is the colour of the ordinary lines.

Every line of the grid grows wider as you zoom in, as in Tinkercad, and stays visible as you zoom out. If that is too much for you, switch off {{ui:workspace.gridLinesGrow}} and the lines stay one pixel wide at every zoom, as in the sketch.

If the grid has disappeared, say because a colour was set to that of the plate, {{ui:workspace.resetGrid}} at the end of the {{ui:workspace.workplane}} area brings its visibility, colours, spacing and line weight back to the standard, here and in the default saved with {{ui:workspace.makeDefault}}.

### Shape defaults

Under {{ui:workspace.shapeDefaults}} you choose a shape with {{ui:workspace.shape}} and set how it starts when you add it: its width, length and height. {{ui:workspace.useAppDefaults}} takes the shape back to what the app starts it with. Shapes with settings of their own show them under {{ui:workspace.shapeDetails}}. The values apply to new shapes, not to those already on the plate. {{ui:workspace.customLimit}} sets a ceiling of your own for how large the handles and the properties may make that shape; left blank, the usual limits stay.

### Saved history

Under {{ui:workspace.history}} the slider {{ui:workspace.savedHistory}} sets how many completed actions stay available for Undo after you save or reopen a design. The default is 100 actions in a design. A lower limit permanently discards the older undo steps of the design.

## When layerling feels slow

layerling calculates and draws everything in your browser. On an older computer, with a weak graphics card or on several large screens the view can therefore feel sluggish. This helps:

- **{{ui:workspace.fastMode}}** under {{ui:workspace.appearance}} turns off at once everything that costs the view a lot: shadows, edge lines on all bodies and the camera's inertia. It also draws the view at the screen's own resolution only, which on high-resolution screens is up to four times fewer pixels. Your own settings are kept and apply again as soon as you turn it off.
- **The camera keeps turning:** When you let go of the mouse after turning, the view turns on for a moment and slows down gently. That is on purpose, not stutter. If you are used to Tinkercad or Fusion 360, turn off {{ui:workspace.cameraInertia}} under {{ui:workspace.appearance}}, and the view stops at once.
- **Single switches:** Without fast mode you can also turn off just {{ui:workspace.showShadows}} or {{ui:workspace.edgeLines}}.
- **Use the graphics card:** In Chrome open `chrome://gpu` (in Edge `edge://gpu`). Next to "WebGL" it should say "Hardware accelerated". If it says "Software only", hardware acceleration is off in the browser's settings. On Windows you can also pick "High performance" for the browser under Settings → System → Display → Graphics, so it uses the real graphics card and not the weaker one in the processor.
- **Simplify large imported meshes:** A model of many hundred thousand triangles slows any view down. How to thin it out is in the chapter on files, under "Simplifying an imported mesh".
- **Close other tabs:** Every open layerling tab and every other 3D page shares the same graphics card.
