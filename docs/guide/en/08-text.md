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

A text need not be built as filled letters. Under {{ui:prop.sketchFill}} in the properties you choose, as for sketches and SVG, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} or {{ui:prop.sketchFill.center}}, with {{ui:prop.sketchLineWidth}} and {{ui:sketch.strokeJoin}}: only a line of that width is built round the letters, outside, inside or centred on their outline. {{ui:prop.sketchFill.grow}} keeps the letters filled and makes them thicker by the line width all round; letters that touch grow into one piece. {{ui:prop.sketchSilhouette}} leaves out the holes in O, A or e.

The box of the text grows with a stroke outside, centred or with "Wider", while the letters keep their size. That makes a name tag for a multicolour print from three copies of one text, all in the same place: the letters themselves, the same text 1.5 mm wider in the second colour, and once more 3 mm wider with the silhouette as the base plate in the third. Each layer is a body of its own with its own colour and height; chamfers and fillets on the edges work on every one. {{ui:prop.bevel}} and {{ui:prop.segments}} exist for filled letters only.

## Layers and name tags

layerling also builds the three copies of the previous section in one step. The properties of a text hold the card {{ui:textLayers.title}}; {{ui:textLayers.split}} turns it into a stack: the white letters on top, under them the same text 1.5 mm wider in red, at the bottom 3 mm wider as a dark plate without holes. The stack is a bundle, so it moves as one, and every layer stays a text of its own with its own colour and height, the way a slicer needs them for a multicolour print.

With the stack selected, the same card shows text, font and the layers: {{ui:textLayers.count}} (up to six), and for each layer {{ui:textLayers.grow}}, {{ui:textLayers.height}}, {{ui:textLayers.color}} and {{ui:textLayers.silhouette}}. Every change builds the stack again at once, and new words run through all layers. {{ui:group.editBundle}} gets you to the single layers, say to fillet their edges; the stack becomes a plain bundle without the layers card as soon as one layer is no longer a text.

Under {{ui:textLayers.names}} you type a list, one name per line, up to a hundred. "Make tags" makes a tag per name from the selected text or stack, all the same size, in rows below with the chosen {{ui:textLayers.gap}}; the first takes the original's place. Each tag is an object of its own afterwards.

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
