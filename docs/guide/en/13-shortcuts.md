---
title: Keyboard shortcuts
summary: All keys at a glance, taken straight from the program so the list is always right.
---

The shortcuts work as long as the workplane has the focus. While you type in a field they keep out of the way. On the Mac, [[Cmd]] applies wherever [[Ctrl]] is listed here.

In the editor, {{ui:editor.keyboardShortcuts}} in the {{ui:editor.group.help}} area opens the same list as a window. The printer button in the window ({{ui:shortcuts.print}}) prints the list on its own, black on white, the whole list on one side of an A4 or Letter sheet in three columns, to keep at hand as a quick reference; the print dialog of the browser also offers to save it as a PDF.

The box at the top of the window searches the list: it keeps only the shortcuts whose sentence, group or keys contain every word you type, so "fillet" or "ctrl+z" leaves just those rows. Capital letters and accents do not matter, and a single letter or digit finds that key and the words that start with it. The X at the end of the box empties it; with the box empty the whole list is back. The printer button prints what the window shows, so after a search it prints only the shortcuts found.

![The keyboard shortcuts window in the editor.](shot:shortcuts)

## Command search

Can't find a tool? Press [[Ctrl]]+[[K]] or click the magnifying glass in the {{ui:editor.group.help}} area, then type what you are looking for: a tool ("fillet", "mirror"), a shape ("cylinder") or a command ("export", "undo"). Move with the arrow keys and press [[Enter]], or click the entry.

- The search understands the English and the German word alike and ignores capital letters and umlauts: "aushoehlen" finds {{ui:editor.tool.hollow}}. The search works in every script: a name is found as it is shown in the language of the interface ("円柱" in Japanese). Full-width and half-width letters, katakana and hiragana, and accents count as the same.
- Every entry shows the keys that do the same and the group of the ribbon it lives in, so you learn where it is.
- Entries that are greyed out cannot run right now, mostly because nothing is selected. They stay in the list so the search still tells you where the tool is.

The guide you are reading has a search box too, at the top of every page: type a word or two and it lists the sections that contain all of them, with the matching words marked. Click one, or press [[Enter]] for the first, to jump straight there. The page it opens marks every place your words appear and scrolls to the first one in that section; [[Esc]] or a click on a mark clears them.
- A shape's name adds that shape to the workplane, just like clicking it in the shapes menu.
- With an empty field the search lists the commands you used last at the top.
- The name of a body in your design finds that body and selects it, which helps in a design with many parts. Bodies only appear once you type.
- A custom shape you saved is found by its name too, once you type, and a click puts it into the design as in the shapes panel.
- It works in sketch mode as well, with the sketch tools.

## Your own keys

Any command of the command search can go on a key of your own: a tool you use all the time, a shape, {{ui:editor.tool.centerOnWorkplane}} or {{ui:palette.openShapes}}.

1. Open {{ui:editor.keyboardShortcuts}} and click {{ui:customKeys.add}} under {{ui:customKeys.title}} at the top of the window.
2. Type a few letters of the command and click it, or press [[Enter]] for the first one.
3. Press the key you want, alone or with [[Ctrl]], [[Alt]] or [[Shift]]. Letters, digits and F1 to F12 can take a command.

A key the editor already uses, one the browser keeps for itself (such as [[Ctrl]]+[[W]]) or one of your own keys is refused, and the window says what it does. Click a key in the list to change it, the X next to it to remove it, or {{ui:customKeys.removeAll}} to start over.

- The key runs the command just as the command search does. If it cannot run right now, mostly because nothing is selected, the status bar says so.
- Your keys show next to their commands in the command search and on the printed list.
- They stay in this browser, like the theme. A key for a sketch tool works in sketch mode, a key for the 3D editor outside it.
- While you type in a field, your keys keep out of the way like all the others.

## Interactive Help

Cannot find where to read about a button or a field? Let the program take you there. Click the question mark in the {{ui:editor.group.help}} area, or press [[Shift]]+[[F1]]. The pointer turns into a question mark, and whatever lies under it is outlined.

- Click a button, a field, a switch, a handle, a group of the ribbon or the title bar of a window. It does **not** do what it normally does. A small window opens instead, with the name of the element, a short summary of the part of this guide that is about it, up to two more places that mention it, and {{ui:interactiveHelp.open}}.
- The help is about the element you pointed at, not about the whole window around it. An element without a name of its own uses the nearest one around it; inside a window it falls back on that window's question mark.
- {{ui:interactiveHelp.open}} opens the guide at that section in a new tab. There the section is outlined in colour, from its heading to its end, so you see where it starts and stops.
- If the guide says nothing about the element, the window says so and offers {{ui:interactiveHelp.search}}.
- [[Esc]], or the question mark again, leaves the mode. On a touch screen there is no hover: a tap on an element opens the window straight away.

The window moves by its title bar like the other windows. The program finds the section by the name of the element - the label on a button, the name of a field - because this guide writes every button as it is called in the program. It looks it up in the same search as the box at the top of each guide page, in the language you are using, and runs entirely in your browser.

{{shortcuts}}
