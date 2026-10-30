// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { setLanguage } from "@/lib/i18n";
import { importFailureReason } from "@/lib/modelImport";
import { importedShapeFromSvgWithReport, resolveSvgTextEntities, validateSvgSourcePreflight } from "@/lib/svgImport";

/*
 * Adobe Illustrator's "Save As SVG" declares its namespaces as entities and uses them on the <svg> element; such files
 * were refused whole with "SVG entities are not supported" (asked in the Facebook group). Plain text entities are
 * resolved now; everything that could blow a file up or reach outside it stays refused.
 */
const ILLUSTRATOR = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 27.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_extend "http://ns.adobe.com/Extensibility/1.0/">
	<!ENTITY ns_ai "http://ns.adobe.com/AdobeIllustrator/10.0/">
	<!ENTITY ns_graphs "http://ns.adobe.com/Graphs/1.0/">
	<!ENTITY ns_vars "http://ns.adobe.com/Variables/1.0/">
	<!ENTITY ns_imrep "http://ns.adobe.com/ImageReplacement/1.0/">
	<!ENTITY ns_sfw "http://ns.adobe.com/SaveForWeb/1.0/">
	<!ENTITY ns_custom "http://ns.adobe.com/GenericCustomNamespace/1.0/">
	<!ENTITY ns_adobe_xpath "http://ns.adobe.com/XPath/1.0/">
]>
<svg version="1.1" id="Layer_1" xmlns:x="&ns_extend;" xmlns:i="&ns_ai;" xmlns:graph="&ns_graphs;"
	 xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 100 50"
	 style="enable-background:new 0 0 100 50;" xml:space="preserve">
<switch>
	<foreignObject requiredExtensions="&ns_ai;" x="0" y="0" width="1" height="1">
		<i:aipgfRef  xlink:href="#adobe_illustrator_pgf"></i:aipgfRef>
	</foreignObject>
	<g i:extraneous="self">
		<rect x="10" y="10" fill="#C00000" width="80" height="30"/>
	</g>
</switch>
</svg>`;

describe("SVG entities", () => {
  afterEach(() => setLanguage("en"));

  it("resolves Illustrator's namespace entities and imports the drawing", () => {
    const resolved = resolveSvgTextEntities(ILLUSTRATOR);
    expect(resolved).not.toMatch(/<!ENTITY|&ns_/);
    expect(resolved).toContain('xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"');
    expect(resolved).toContain('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">');
    expect(() => validateSvgSourcePreflight(resolved)).not.toThrow();
    const { shape } = importedShapeFromSvgWithReport("logo.svg", ILLUSTRATOR);
    expect(shape.width).toBeGreaterThan(0);
    expect(shape.depth).toBeGreaterThan(0);
  });

  it("keeps refusing entities that could blow a file up or reach outside it", () => {
    const refused = [
      // An external entity, the classic way to read a file from the machine.
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&x;</text></svg>',
      // One entity built from others: the billion laughs.
      '<!DOCTYPE svg [<!ENTITY a "ha"><!ENTITY b "&a;&a;&a;&a;">]><svg xmlns="http://www.w3.org/2000/svg"><text>&b;</text></svg>',
      // Markup in a value, a parameter entity, an attribute list.
      '<!DOCTYPE svg [<!ENTITY x "<path d=\'M0 0\'/>">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
      '<!DOCTYPE svg [<!ENTITY % p "x">]><svg xmlns="http://www.w3.org/2000/svg"/>',
      '<!DOCTYPE svg [<!ENTITY x "a"><!ATTLIST svg y CDATA "1">]><svg xmlns="http://www.w3.org/2000/svg"/>',
      // A built-in entity may not be redefined.
      '<!DOCTYPE svg [<!ENTITY amp "x">]><svg xmlns="http://www.w3.org/2000/svg"/>',
    ];
    for (const source of refused) {
      expect(resolveSvgTextEntities(source)).toBe(source);
      expect(() => validateSvgSourcePreflight(resolveSvgTextEntities(source))).toThrow(/entities|document type/i);
    }
  });

  it("does not let thousands of uses grow the file without end", () => {
    const value = "x".repeat(2000);
    const source = `<!DOCTYPE svg [<!ENTITY big "${value}">]><svg xmlns="http://www.w3.org/2000/svg"><desc>${"&big;".repeat(200)}</desc></svg>`;
    expect(resolveSvgTextEntities(source)).toBe(source);
  });

  it("shows why a file did not come in, in the person's language", () => {
    setLanguage("de");
    const reason = importFailureReason({ fileName: "logo.svg", reason: "SVG entities are not supported" });
    expect(reason).toMatch(/Inkscape/);
    expect(reason).not.toMatch(/not supported/);
  });
});
