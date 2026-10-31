---
title: Tablet and touch
summary: Working with fingers or a stylus: selecting several bodies, turning and zooming the view, the long press menu, and what to know on an iPad.
---

## Fingers and a stylus

layerling runs in the browser of a tablet, and as an app from its home screen. A finger does what the left mouse button does. Three things a tablet does not have, a right mouse button, a Shift key and a wheel, have a way of their own:

| You want to | On a tablet |
| --- | --- |
| Select a body | Tap it. |
| Select several bodies | Tap a body: a round button appears in the lower left. Tap it, and every further body you tap joins the selection; a tap on a selected body takes it out again. A tap on empty space changes nothing; a second tap on the button ends it and clears the selection. Or hold a finger still for half a second, choose {{ui:contextMenu.selectMultiple}}, then tap one body after another. |
| Select all bodies | Hold a finger still on empty space for half a second, choose {{ui:contextMenu.selectAll}}. |
| Open the menu of a right click | Hold a finger still on a body or on empty space for half a second. |
| Move a body | Drag it. |
| Resize, turn or lift a body | Drag its handles, the small squares and arrows around it. A finger catches them from a little beside. |
| Turn the view | One finger on empty space, or drag the view cube. |
| Zoom the view | Two fingers: spread to come closer, pinch to go away. |
| Move the view | Slide two fingers together. |
| Clear the selection | Tap empty space. Not while {{ui:camera.touchRotate}} is on, where one finger turns the view; and in {{ui:contextMenu.selectMultiple}} the first tap on empty space only ends the mode and leaves the selection as it is, the next one clears it. |

## Selecting several bodies

Without a Shift key, {{ui:contextMenu.selectMultiple}} in the menu of a long press does what Shift+click does on a computer. While it is on, a message says so, and each tap on a body adds it to the selection or takes it out again. A tap on empty space, or [[Esc]] on a keyboard, ends it and leaves the selection as it is. A finger on empty space still turns the view meanwhile. Then {{ui:editor.tool.group}}, {{ui:editor.tool.align}} or a move work on all the bodies you picked.

The same menu has {{ui:contextMenu.carry}}, the key [[C]] for a touch screen. The selection then follows the finger over the faces of other bodies; a tap sets it down on the face you tap, even a sloped one, and the first tap is enough. The menu entry is also found by searching for "set down" or "cruise" (the command search, [[Ctrl]]+[[K]] on a keyboard).

## Turning and zooming the view

One finger on empty space turns the view, two fingers zoom and move it. A finger that starts on a body works on the body, not on the view. If you would rather have it turn the view, switch on {{ui:camera.touchRotate}} in the view bar: one finger then turns the view instead of selecting, wherever it starts. That switch only shows on a device with a touch screen.

The view cube in the top left turns the view when you drag it, and a tap on one of its sides, corners or edges jumps to that view. See [View and workplane](chapter:view-and-workplane).

## Handles, small points and a stylus

A fingertip covers what it aims at. layerling lets a finger reach a little further to handles, points, lines and edges than a mouse pointer does, but a stylus is finer. This holds for a pen the tablet knows as a pen, such as an Apple Pencil or an S Pen. A plain stylus with a rubber tip counts as a finger for the screen and is not finer than one, so work with it as with a finger. An Apple Pencil that hovers above the screen on an iPad also shows the name of a control after a moment, in a small bubble, as the mouse pointer does with a tooltip.

If bodies slip when children or hurried hands touch them, switch on {{ui:workspace.selectBeforeMoving}} in the settings: a body then has to be selected first, and only the next drag moves it.

## On an iPad or iPhone

- **Install it as an app.** In Safari, tap the Share icon and choose "Add to Home Screen". The app opens in a window of its own without the address bar, and it works without a connection, see [Offline and install](chapter:offline-and-install).
- **Your designs live in the browser** (unless you host layerling yourself and set up a server folder). There is no account, and nothing is uploaded. Safari has a rule of its own against tracking: it deletes what a website stored after seven days in which you did not visit it in Safari. A web app added to the Home Screen is exempt from that rule, as WebKit documents it. That is one more reason to use the app from the Home Screen, and to back up important work: {{ui:dashboard.backupAll}} on the start page packs all designs into one file.
- **Files.** Safari lets a page write into a file only through a download, so {{ui:editor.export}} puts the file into the Downloads of the Files app, and [[Ctrl]]+[[S]] on a keyboard downloads it again; see [Files and saving](chapter:files-and-saving).
- **No keyboard needed.** Every tool has a button in the ribbon, and a number field opens the on-screen keyboard. A keyboard on the iPad adds the [keyboard shortcuts](chapter:shortcuts). A value box beside a body opens its number field with the second tap: the first tap only marks it, so a finger that lands on it by accident does not raise the keyboard.

## Workshops with children

Fingers and rubber-tip styluses work alike here. Two settings make a class easier: {{ui:workspace.selectBeforeMoving}} so that a touch does not move a body by accident, and {{ui:camera.touchRotate}} so that one finger always turns the view. The question mark button in the Help group of the ribbon switches on the {{ui:interactiveHelp.title}}: a tap on any button, field or handle then explains it, and the same button, or [[Esc]], leaves it.

For a whole class, switch on {{ui:workspace.simpleMode}} in the settings. The ribbon then keeps only the tools a workshop uses (copy, paste, duplicate, delete, undo, group, mirror, chamfer, fillet, hollow, align, export), the shape library a short list, the buttons are larger, and the start page shows the designs and nothing else: no news, no welcome text, no help buttons and no links out of layerling. Switching it on is a tap; switching it off is a press held for two seconds on the button that then takes its place. A link ending in `?mode=simple` switches it on for the device that opens it, `?mode=full` switches it off again. Whoever runs layerling on a server can start everyone in it with `LAYERLING_SIMPLE_MODE=true`, or fix it for everyone with `always`, so that the program has no switch to leave it; see the README.
