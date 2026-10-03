---
title: View and workplane
summary: Moving around the scene, looking straight on, and placing new shapes on any surface you like.
---

## Moving around

With the mouse:

| What you do | What happens |
| --- | --- |
| drag with the right button | rotate the view |
| drag with the middle button | move the view |
| mouse wheel | zoom in and out |
| hold [[Ctrl]] and drag with the left button | also moves the view |

On a tablet or phone, two fingers zoom (spread and pinch) and move the view (slide together). One finger works on the design, just like the left mouse button. To rotate with one finger, switch on {{ui:camera.touchRotate}} in the camera bar. That switch only shows on devices with a touch screen.

### The view cube

The cube in the top left shows where you are looking. A click on one of its sides jumps to the straight view from top, bottom, front, back, left or right. The number keys [[1]] to [[6]] do the same.

Drag the cube to turn the view around, just like dragging with the right mouse button. On a touch screen this works with one finger, without switching on {{ui:camera.touchRotate}}.

### The camera bar

At the left edge is a narrow bar. From the top:

- {{ui:camera.home}} brings the whole scene back into view. The key is [[F]] or [[Home]].
- {{ui:camera.focusSelection}} zooms to the selection ([[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} and {{ui:camera.zoomOut}} zoom step by step.
- {{ui:camera.orthographic}} switches to a flat view in which parallel edges stay parallel. For measuring and lining up edges that is often more comfortable than the perspective view. [[O]] switches back and forth, and a second click returns.
- {{ui:camera.placeWorkplane}}, the tape measure and the framing square are tools of their own, covered below and in [Measuring and notes](chapter:measuring-and-notes).

The small arrow at the very top of the bar hides it if it gets in the way.

## Looking inside: the section view

{{ui:camera.sectionView}}, the last button in the bar (the cut tool), cuts the view open along a plane so you can check walls, cavities and parts that fit into each other. Nothing is cut for real: the design, its files and every export stay whole.

- Choose the axis (X, Y or Z) the plane stands across. The plane starts in the middle of your design.
- {{ui:camera.sectionCoarse}} moves the plane across the whole design, {{ui:camera.sectionFine}} moves it a little either side of where it stands, for tenths of a millimetre. You can also type the position.
- The button beside the axes shows the other side of the cut, {{ui:camera.sectionReset}} puts the plane back in the middle, and {{ui:camera.sectionShowPlane}} hides the blue plane.
- You can click and select what the cut lays open, inner walls included.
- {{ui:camera.sectionExportSvg}} saves the outlines on the cutting plane as an SVG at 1:1, for a laser, a plotter, a template or a gasket. An X cut is seen from the right, a Y cut from above, a Z cut from the front. As in the export, only visible bodies go in, holes are already taken off, and bodies of the same colour are joined into one outline. Each colour stays its own path without a fill, so laser software keeps them apart as layers.

The panel hangs on its button. If it covers something, drag it by its title bar anywhere on the workplane; it opens there next time too. Double-click the title bar or drop it at the button to put it back.

[[Esc]] closes the panel; the cut stays until you switch it off or go back to the design overview. While it is on, its button stays highlighted. Anything you place on the side that is cut away only shows once you switch the cut off.

## The workplane

New shapes align with the workplane. At first that is the base plate with the grid. But you can put it on any surface, to place something on a side or a sloped face.

1. Press [[W]] or click {{ui:camera.placeWorkplane}}.
2. Move the mouse over a face of a body. It lights up.
3. A click puts the workplane there. Everything you add now sits on that face.

A click on empty space or [[Esc]] returns the workplane to the base plate. [[Shift]]+[[W]] puts it directly on the currently selected face. If you hold [[Shift]] while clicking, the plane points the other way.

While a workplane sits on a face, an eye appears next to {{ui:camera.placeWorkplane}}. It hides the workplane without dropping it, for a clear look at the design: new shapes still land on that face, and rotating still turns about it. A click on the eye shows it again, and so does setting a new workplane.

## Grid and snapping

The grid shows the size of the plate. At the bottom right is the **snap step**: moving and scaling snap in steps of that size, for example 1 mm. Make it smaller for fine work and larger for rough arranging. {{ui:editor.tool.snapToGrid}} in the ribbon moves the selected shapes afterwards onto the nearest grid crossing. While moving, shapes also snap to other shapes, see [Selecting and arranging](chapter:select-and-arrange).

Under {{ui:workspace.measurement}} in the settings you set the {{ui:workspace.units}}. With {{ui:units.imperial}}, layerling shows every measure in inches, on the shape, in the properties panel, on the tape measure and the ruler. The snap grid then offers steps from 1/64 to 1 inch, and the grid on the plate is drawn in inches (1/8 to 1 inch, 1/4 inch by default) with a stronger line on every whole inch. Under {{ui:workspace.inchFormat}} you choose whether inches appear as fractions like in Tinkercad (1 5/8, rounded to 1/64 inch) or as decimals (1.625) with as many decimal places as set under {{ui:workspace.accuracy}}. You can type either, "1 5/8" included.

Size, grid width and colour of the plate are changed in the settings (the cogwheel in the ribbon): the areas are {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} and {{ui:workspace.history}}. Under {{ui:workspace.appearance}} you find switches such as {{ui:workspace.startInPerspective}}, {{ui:workspace.showShadows}} and {{ui:workspace.showGrid}}.

![The editor in the dark colour scheme. You set the colour scheme at the top right: System, Light, Dark or Graphite.](shot:editor-dark)

> **Tip:** Stop rotating the view when you fit parts together exactly. Use the number keys to go to the straight view from top or front and press [[O]] for the flat display. Then you see at once whether two edges are really flush.
