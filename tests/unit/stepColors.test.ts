import { describe, expect, it } from "vitest";
import { stepBodyColors } from "@/lib/stepColors";

/**
 * The colours a STEP file gives its bodies, which the kernel's XCAF document leaves out (#830): a product whose bodies
 * are surface models in a second representation, each styled on its own, as HOOPS Exchange writes them.
 */
const STEP = `DATA;
#1=PRODUCT('Screws','Screws - 2 x M5','',(#2));
#3=PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#1,.NOT_KNOWN.);
#4=PRODUCT_DEFINITION('design','',#3,#5);
#6=PRODUCT_DEFINITION_SHAPE('','',#4);
#7=SHAPE_DEFINITION_REPRESENTATION(#6,#8);
#8=SHAPE_REPRESENTATION('Screws',(#9),#10);
#11=MANIFOLD_SURFACE_SHAPE_REPRESENTATION('Screws',(#12,#13),#10);
#14=SHAPE_REPRESENTATION_RELATIONSHIP('','',#8,#11);
#12=SHELL_BASED_SURFACE_MODEL('Solid',(#20));
#13=SHELL_BASED_SURFACE_MODEL('Solid; second',(#21));
#30=STYLED_ITEM('',(#31),#12);
#31=PRESENTATION_STYLE_ASSIGNMENT((#32));
#32=SURFACE_STYLE_USAGE(.BOTH.,#33);
#33=SURFACE_SIDE_STYLE('',(#34));
#34=SURFACE_STYLE_FILL_AREA(#35);
#35=FILL_AREA_STYLE('',(#36));
#36=FILL_AREA_STYLE_COLOUR('',#37);
#37=COLOUR_RGB('',0.501960814,0.501960814,0.501960814);
#40=STYLED_ITEM('',(#41),#13);
#41=PRESENTATION_STYLE_ASSIGNMENT((#42));
#42=SURFACE_STYLE_USAGE(.BOTH.,#43);
#43=SURFACE_SIDE_STYLE('',(#44));
#44=SURFACE_STYLE_FILL_AREA(#45);
#45=FILL_AREA_STYLE('',(#46));
#46=FILL_AREA_STYLE_COLOUR('',#47);
#47=DRAUGHTING_PRE_DEFINED_COLOUR('white');
ENDSEC;`;

describe("the colours of a STEP file's bodies", () => {
  it("are read per body, in the file's order, under the product's id and name", () => {
    const colors = stepBodyColors(STEP);
    expect(colors.get("Screws")).toEqual(["#808080", "#ffffff"]);
    expect(colors.get("Screws - 2 x M5")).toEqual(["#808080", "#ffffff"]);
  });

  it("are none when the file styles no body", () => {
    expect(stepBodyColors(STEP.replace(/#(30|40)=STYLED_ITEM[^;]*;/g, "")).size).toBe(0);
  });
});
