---
title: Text and curved lettering
summary: Raised or engraved lettering in seven typefaces or one of your own, and if you like along a circular arc, such as on a coin, a lid or a ring.
---

## Adding text

Choose {{ui:shape.text}} in the shape library and place it. In the {{ui:prop.text}} field on the right, type what it should say. The settings below:

- **{{ui:prop.font}}:** Seven typefaces are available: Multilanguage, Sans, Serif, Script, Monospace, Rounded and Stencil (letters made of straight lines). New text starts in Sans. Accented letters such as ä, ö, ü, é and the € sign are in every typeface. Fonts of your own come on top, see [Your own fonts](#your-own-fonts) below.
- **{{ui:prop.height}}:** How far the lettering stands out from the surface.
- **{{ui:prop.bevel}}:** Rounds the letter edges so they look softer. With {{ui:prop.segments}} you decide in how many steps.
- **Size:** You set the length and width of the line as with any shape. Drag the handles or type the dimensions.

Text is at first a single body. If you want to treat the letters individually, click {{ui:inspector.separateParts}}. Then every letter is a shape of its own.

The edges of text can be chamfered or filleted too, straight or curved, see [Breaking edges and hollowing bodies](chapter:edges-and-hollowing). Use small sizes such as 0.2 to 0.5 mm, because the strokes of the letters are narrow.

## Your own fonts

Besides the seven built-in fonts you can use any font of your own: a font file from your computer or, in Chrome and Edge, a font installed on your computer. Choose {{ui:font.manage}} at the bottom of {{ui:prop.font}}. The {{ui:font.title}} window opens.

- **{{ui:font.addFile}}** takes a TrueType file (`.ttf`), an OpenType file (`.otf`) or a WOFF file (`.woff`). You can also simply drag the file into the window.
- **On Windows** the installed fonts live in the Fonts folder (`C:\Windows\Fonts`). The browser's file dialog hides it. Open it in Explorer instead and drag the font into the {{ui:font.title}} window. Fonts installed for you alone live in `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, which the file dialog shows too. On a Mac fonts live in `/Library/Fonts` and `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** lists the fonts installed on your computer. The first time, the browser asks whether layerling may read them. The search field finds a font quickly, a click takes it.

If a text is selected, it gets the new font at once. Otherwise the font shows up under {{ui:prop.font}} in the {{ui:font.customGroup}} group, and {{ui:font.use}} in the window puts it on the selected texts. Fonts of your own work like the built-in ones: text on a circular arc, chamfers and fillets on the edges and the STEP export all work the same. Letters a font lacks are taken from Sans.

### What works in which browser

| Browser | Choose a font file | Font from the computer |
| --- | --- | --- |
| Chrome and Edge on a computer, the installed layerling app too | yes | yes, after the browser asks |
| Firefox | yes | no |
| Safari on a Mac | yes | no |
| Tablet and phone | yes, from the device's files | no |

Web pages may not simply read the installed fonts. Only Chrome and Edge have a permission for it, and only on secure pages, over `https` as on layerling.com. When layerling runs over `http`, say on your own server or as a Docker install in your home network, {{ui:font.fromSystem}} is missing; drag the font over from Explorer then. In the other browsers you choose the font file from the fonts folder, with the same result. If you declined the question in Chrome or Edge, allow it again in the site settings, behind the padlock to the left of the address.

layerling cannot read WOFF2 files (there is almost always a TTF or OTF version), font collections (`.ttc`, several fonts in one file) or colour emoji fonts. From very large fonts, such as Chinese ones, layerling takes the first 8000 characters. A variable font is read in its default setting, usually the regular weight.

Some fonts, script and variable fonts above all, draw a letter from strokes that overlap. layerling merges them into one clean outline when it reads the font, so the body stays printable. Such letters are then made of very short straight pieces instead of curves; it does not show.

### Where the fonts are kept

A font of your own stays **in this browser on this computer**. Another browser or another computer does not know it until you add it there too. Clearing the browser's site data clears the fonts as well. In the {{ui:font.title}} window the bin removes a font from the browser. Your designs lose nothing by it, as the next section shows.

### Passing on designs with a font of your own

A design does **not store the font file**, only the outlines of the letters its texts use, those in earlier steps of the history included. If a text says "Hello", only H, e, l and o travel with it. That holds for every way a design is saved: in the browser, on your own server, as a `.lyl` file and in {{ui:myShapes.title}}.

So:

- **The design opens correctly anywhere**, also on a computer without the font. The texts look the same and can be moved, turned, scaled and filleted.
- **New letters need the font.** If someone without the font types a letter the design did not bring along, layerling draws it from Sans. Under {{ui:prop.font}} the font is then marked {{ui:font.fromDesign}}. Adding the font file brings back every letter.
- **Exports hold geometry only.** STL, 3MF, OBJ, STEP and SVG contain bodies and outlines, no font.
- **Older layerling versions** do not know fonts of one's own yet and draw such texts in Multilanguage.

**Licences:** Fonts are protected by copyright, and their licence says what you may do with them. The embedded letter outlines are what PDF files take along from a font, and most licences allow that. Some commercial fonts, though, forbid passing on even single letters. Before you pass on or publish a design with a font of your own, check the font's licence. Free fonts such as those from Google Fonts (mostly under the SIL Open Font License) can be passed on without worry. For a printed part or an exported STL it does not matter: they hold no font any more, only geometry.

## Raised or engraved

- **Raised:** Place the text on the surface and group it with the body. It grows out as a relief.
- **Engraved:** Switch the text to {{ui:inspector.hole}}, let it reach a little into the surface and group it with the body. The letters are then engraved.

For lettering on a side face, first put the workplane on that face, see [View and workplane](chapter:view-and-workplane).

## Outline, silhouette and wider

A text need not be built as filled letters. {{ui:prop.textFill}} in the properties offers the same choice as Tinkercad:

- **{{ui:prop.textFill.filled}}:** the letters as they are.
- **{{ui:prop.textFill.outline}}:** a line along the outline of the letters, half inside and half outside it.
- **{{ui:prop.textFill.outer}}:** a line round the outside of the letters.
- **{{ui:prop.textFill.inner}}:** a line on the inside of the letters.

With a line chosen, two settings appear right under the list: {{ui:prop.sketchLineWidth}} sets how thick the line is, {{ui:sketch.strokeJoin}} how it goes round the corners ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} or {{ui:sketch.strokeJoin.miter}}). The rarer settings are under {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} leaves out the holes in O, A or e, and {{ui:prop.textWider}} keeps the letters filled and makes them thicker by the line width all round; letters that touch grow into one piece.

With a line outside, a centred line or "Wider" the box of the text grows, while the letters keep their size. {{ui:prop.bevel}} and {{ui:prop.segments}} exist for filled letters only.

## Layers and name tags

A name tag for a multicolour print is a text in layers: the letters on top, under them the same text a little wider in a second colour, at the bottom a plate without holes in a third. layerling makes it in one click:

- **A new name tag:** choose {{ui:shape.nameTag}} in the shape library and place it. It says "Name" in white letters on a red rim and a dark plate.
- **From a text:** select the text and click {{ui:nameTag.makeLayers}} at the top of its settings.

All settings of the tag are in the card {{ui:nameTag.title}}, at the top of the settings:

- **{{ui:prop.text}}** and **{{ui:prop.font}}**, fonts of your own too. The tag grows with the words.
- **{{ui:nameTag.letterSize}}:** how tall the capital letters are, in mm. All layers follow and stay lined up.
- **{{ui:nameTag.layers}}:** one row per layer, from the top down. Each row has the colour (click the coloured square), how much wider the layer is than the letters, its height and {{ui:nameTag.noHoles}}, which fills the holes in letters such as O and A. {{ui:nameTag.corners}} sets how a wider layer goes round the corners of the letters: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} or {{ui:nameTag.corner.miter}}. The top row is the letters themselves. **+** adds a layer at the bottom, **–** takes the bottom layer away. A tag has two to six layers.
- **{{ui:nameTag.keyring}}:** gives the bottom layer a round ear with a hole for a key ring. Choose the {{ui:nameTag.keyringDiameter}} and the {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} or {{ui:nameTag.side.top}}. The hole goes through every layer it touches, and the ear moves along when you change the words, the letter size or the font.

Every change shows at once. The tag is a bundle: it moves as one, and each layer stays a body of its own in its own colour, the way a slicer needs them for a multicolour print. To round or bevel the edges of one layer, click {{ui:group.editBundle}} and pick the layer, see [Breaking edges and hollowing bodies](chapter:edges-and-hollowing).

### Many name tags at once

Type the names into {{ui:textLayers.names}}, one per line, up to a hundred. The button below says how many tags it will make, for example "Make 12 name tags". Every tag gets the same layers, letter size and key ring hole and is an object of its own; they are laid out in rows below the first, 5 mm apart. A plain text has the name list too, further down in its settings.

## Text on a circular arc

Should the lettering not run straight but follow the edge of a coin, a lid or a ring? For that there is the setting {{ui:prop.textCurved}}.

![Text follows a circle. All letters stand on one common line.](shot:curved-text)

Once you switch it on, the text runs along the circle. All letters stand on the same baseline, as evenly as with normal text. There are four settings:

- **{{ui:prop.textRadius}}** (5 to 500 mm): The radius of the circle the letters' baseline runs on.
- **{{ui:prop.textSize}}:** How tall the letters are. It no longer depends on the width of the shape.
- **{{ui:prop.textInward}}:** Moves the text from the top of the circle to its bottom. The letters then point with their heads to the centre.
- **{{ui:prop.textFlipped}}:** Turns only the letters over so you can read them from the other side. The text stays in its place on the circle.

**The centre of the circle is the centre of the shape.** That is why aligning works as usual: if you centre the text with a cylinder or ring, it sits exactly concentric on it. When you pull a handle, radius and letter size grow together, so the lettering is not distorted.

> **Tip:** At the top of the circle the letters stand outside the baseline; with {{ui:prop.textInward}} they stand inside, heads towards the centre. For the lettering to fit on a disc, the radius plus the letter size should be smaller than the disc's radius.
