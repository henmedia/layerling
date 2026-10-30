---
title: Getting started
summary: From a blank sheet to your first part for the 3D printer, in five minutes, with no account and nothing to install.
---

layerling is a design program for 3D printing that runs right in your browser. You build a part from simple shapes, cut holes into it, round the edges and send it to your slicer. There is nothing to install and nothing to sign up for. What you build stays on your computer.

![The start page of layerling: "Create new 3D design" at the top, your designs and the quick guide below.](shot:start-page)

## Creating a design

Open [layerling.com](https://layerling.com/). On the start page click {{ui:dashboard.createDesign}}. The editor opens with an empty workplane, the grid on which everything takes shape.

If you already have a file to continue with, use {{ui:dashboard.importGeometry}}. That works for layerling designs (`.lyl`) as well as STL, OBJ, 3MF, STEP or SVG files.

All your designs later appear on the start page with a preview picture. They are kept in your browser's storage and saved automatically after every change, so there is no save button. **layerling takes no responsibility for designs kept in the browser.** A browser can fail, or a browser update can cause problems, so back up your designs from time to time with {{ui:dashboard.backupAll}} on the start page, or save them as files. A backup comes back with {{ui:dashboard.restoreBackup}}. How to pack designs into a file and pass them on is covered in [Files and saving](chapter:files-and-saving). If you would like a reminder, switch on {{ui:workspace.confirmTabClose}} in the settings (the cogwheel in the ribbon): the browser then asks before a tab with an open design is closed or reloaded.

## The editor at a glance

![The editor with two shapes on the workplane. The ribbon on top, the camera controls on the left, the settings of the selected shape on the right.](shot:editor-overview)

- **On top** is the ribbon. It is sorted by task: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}} and {{ui:editor.group.manage}}; {{ui:editor.group.help}} sits above it in the title row, and the house beside the tabs leads back to the start page. When the window is too narrow for all groups, the ones used least fold into one button under their name, with a small arrow in the group's colour hanging beneath it: point at it or tap it, and its tools open beneath it. The pin at the top right, left of the magnifying glass, keeps all groups open instead. Hover over an icon to see its name, a greyed-out one too; {{ui:interactiveHelp.title}} (the question mark under {{ui:editor.group.help}}, or Shift+F1) explains any of them with a click and leads to its section of this guide. Wherever you see a small question mark, for example in a shape's settings, in the shape library or in the tool panels, it leads straight to the matching chapter of this guide.
- **In the middle** lies the workplane. This is where you place shapes, pull them into form and see the result.
- **On the right** appear the settings of the selected shape: colour, dimensions, position and whatever else makes up the shape. Typing numbers is more exact than dragging.
- **On the left** are the camera controls with the view cube above them. They move you around the scene, more in [View and workplane](chapter:view-and-workplane).
- **At the very top** you switch between {{ui:editor.modeGeometry}} and {{ui:editor.modeSketch}}, rename the design and choose language and colour scheme.

## The buttons around the work area

Hover over a button to see its name. If you are not sure what a button does, click {{ui:interactiveHelp.title}} in the {{ui:editor.group.help}} area ([[Shift]]+[[F1]]) and then the button. These are the ones asked about most.

### Paste

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) adds what you copied with {{ui:editor.tool.copy}} to the design. {{ui:common.duplicate}} copies and pastes in one step. A paste puts each part a little beside where it was. Parts that come from another program can land far from the plate, and for those there is {{ui:workspace.pasteCentered}} in the settings, under {{ui:workspace.appearance}}: a paste then sets the parts together in the middle of the workplane and drops them onto it.

### Delete

{{ui:common.delete}} ([[Delete]]) removes the selected shapes. {{ui:editor.tool.undo}} brings them back.

### Ungroup

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) takes the selected group apart again into the shapes it was made of.

### Workspace settings

{{ui:editor.workspaceSettings}} opens the settings of the work area: unit, size of the plate, printer, grid, colours, light and more. More in [View and workplane](chapter:view-and-workplane).

### Theme

{{ui:common.theme}} at the very top chooses how layerling looks: as your system, light, dark or graphite.

### Rename design

{{ui:editor.renameProject}}: the pencil beside the name at the very top. Type the new name and press [[Enter]].

### Design name

The name of the design ({{ui:confirm.projectName}}) stands at the very top. Click it, type, and [[Enter]] keeps the name.

### Visibility options

{{ui:editor.visibilityOptions}}, the arrow beside the eye icon, holds what you can show or hide: the list of objects, everything you hid, the notes and the overhangs of the print. More in [Select and arrange](chapter:select-and-arrange).

### Hide selected

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) hides the selected shapes. They stay in the design and in the object list; {{ui:editor.visibilityOptions}} shows them again.

### Search commands

{{ui:palette.open}}: type what you look for, a tool, a shape or a setting, and click the result.

### Hide camera controls

{{ui:camera.hide}} folds the camera controls on the left away and gives the work area more room; {{ui:camera.show}} brings them back.

### Snap Grid

{{ui:inspector.snapGrid}}, at the bottom of the properties, is the step that moving and resizing snaps to. Beside it the small switch **mm | in** changes the unit. More in [View and workplane](chapter:view-and-workplane).

### Unit: millimetres or inches

The switch **mm | in** beside {{ui:inspector.snapGrid}} changes the unit, the plate's grid and the snap step, for this design.

### The footer

At the foot of the window: {{ui:dashboard.sponsor}} leads to the page where you can support the project; {{ui:dashboard.userGuide}} opens this guide; {{ui:dashboard.forum}} leads to the place for questions, ideas and bug reports (the discussions on GitHub, in German the forum of drucktipps3d); {{ui:editor.bugReport}} makes a ZIP for a bug report; {{ui:dashboard.projectOnGitHub}} leads to the project on GitHub, and the version number opens the release notes. The links to the imprint and the privacy policy belong to whoever runs the copy of layerling you use.

## Your first part

As an example, we build a cube with a hole.

1. Click {{ui:editor.addShape}} in the ribbon and pick {{ui:shape.box}}. The shape now hangs on your mouse pointer. A click on the workplane sets it down.
2. On the right, set the dimensions, for example 40 mm long, 40 mm wide and 20 mm high.
3. Place a {{ui:shape.cylinder}} in the middle the same way, 14 mm across and 30 mm high. It should be taller than the cube so it reaches all the way through.
4. Select the cylinder and click {{ui:inspector.hole}} on the right. It turns see-through: the solid has become a tool that takes material away.
5. Select both shapes and click {{ui:editor.tool.group}}. The cube now has a hole.

![The cylinder is a hole and sticks out of the top of the cube.](shot:hole-before)

![After grouping, the cube has a bore.](shot:hole-after)

This is how bores, slots and pockets are made. The chapter [Solids and holes](chapter:solids-and-holes) explains it in detail.

## New since your last visit

When you open layerling again after an update, a card on the start page lists what has been added since you were last here: every version since then, the newest first. After a long absence you scroll down inside the card. Below them, {{ui:whatsNew.earlier}} adds the versions from before your last visit too. Close it with {{ui:whatsNew.dismiss}} and it stays away until the next update. {{ui:whatsNew.footerLink}} in the footer of the start page shows the latest additions again at any time. The browser remembers the last version you saw, and nothing about you leaves it.

On a copy of layerling on your own computer or server, the notice "Update available" has a button, {{ui:update.previewShow}}, that lists what the update brings before you install it. The list is fetched from GitHub only when you press the button.

## From design to print

When your part is done, click {{ui:editor.export}}, choose STL or 3MF and download the file. Open it in your slicer, for example Bambu Studio, PrusaSlicer, OrcaSlicer or Cura. If you choose your printer in the settings, you can see while building whether the part fits on the print bed. More in [Printing](chapter:printing).

> **Tip:** If you come from Tinkercad you will find your way quickly: plate, shapes, solid and hole, group, align and mirror work almost the same. What is new is mostly chamfer and fillet, hollowing, threads and sketches. Your own Tinkercad designs can come along too, see [Files, saving and sharing](chapter:files-and-saving).
