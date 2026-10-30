// The pictures of the user guide. Each scene builds one situation in the
// running editor and takes its screenshots. `ctx` comes from
// guide-screenshots.mjs: ctx.t(key) is the interface's own wording in the
// current language, ctx.mcp(action, params) drives the editor, ctx.shot(name)
// writes docs/guide/images/<language>/<name>.webp.

const BLUE = "#3f8fd2";
const ORANGE = "#e0793a";
const GREEN = "#5aa469";

/** Opens the editor on an empty plate. */
async function freshEditor(ctx) {
  await ctx.goto("/?editor=1");
  await ctx.clearScene();
}

/** The status pill fades by itself; waiting keeps it out of the picture. */
async function quiet(ctx, ms = 4500) {
  await ctx.wait(ms);
}

async function create(ctx, params) {
  // Named the way the editor names a shape a person drops in, in the reader's language.
  const name = params.name ?? ctx.t(`shape.${params.kind}`);
  const created = await ctx.mcp("create_shape", { ...params, name });
  return created.object?.id ?? created.id;
}

async function select(ctx, ids) {
  await ctx.mcp("select_objects", { ids });
  await ctx.wait(500);
}

/** A small, good-looking starting point: a plate with a few bodies. */
async function sampleParts(ctx) {
  const box = await create(ctx, { kind: "box", x: -20, z: 0, width: 30, depth: 30, height: 20, color: BLUE });
  const cylinder = await create(ctx, { kind: "cylinder", x: 22, z: 4, width: 26, depth: 26, height: 30, color: ORANGE });
  return { box, cylinder };
}

export const scenes = {
  async "start-page"(ctx) {
    await ctx.goto("/", 5000);
    await ctx.shot("start-page");
  },

  async "editor-overview"(ctx) {
    await freshEditor(ctx);
    const { box } = await sampleParts(ctx);
    await select(ctx, [box]);
    await quiet(ctx);
    await ctx.shot("editor-overview");
  },

  async "shape-menu"(ctx) {
    await freshEditor(ctx);
    const { box, cylinder } = await sampleParts(ctx);
    // Two custom shapes, so the picture shows that section filled.
    await ctx.mcp("save_custom_shape", { ids: [box, cylinder], name: ctx.language === "de" ? "Halter" : "Bracket", location: "browser" });
    await ctx.mcp("save_custom_shape", { ids: [cylinder], name: ctx.language === "de" ? "Abstandshülse" : "Spacer", location: "browser" });
    await select(ctx, []);
    await ctx.clickSelector(".shape-menu-trigger");
    await ctx.wait(800);
    await ctx.shot("shape-menu");
  },

  async "hole-before"(ctx) {
    await freshEditor(ctx);
    const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 40, depth: 40, height: 20, color: BLUE });
    const hole = await create(ctx, { kind: "cylinder", x: 0, z: 0, width: 16, depth: 16, height: 30, color: ORANGE });
    await ctx.mcp("update_object", { id: hole, hole: true });
    await select(ctx, [hole]);
    await quiet(ctx);
    await ctx.shot("hole-before");
    await ctx.mcp("group_objects", { ids: [box, hole] });
    await ctx.wait(2500);
    await select(ctx, []);
    await ctx.shot("hole-after");
  },

  async "fillet-tool"(ctx) {
    await freshEditor(ctx);
    const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 40, depth: 40, height: 25, color: BLUE });
    await select(ctx, [box]);
    await ctx.click(ctx.t("editor.tool.fillet"));
    await ctx.wait(4500);
    await ctx.shot("fillet-tool");
    await ctx.click(ctx.t("edge.allSharpEdges"));
    await ctx.setField(ctx.t("edge.radius"), 4);
    await ctx.wait(3500);
    await ctx.shot("fillet-preview");
  },

  async "hollow-tool"(ctx) {
    await freshEditor(ctx);
    const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 44, depth: 44, height: 30, color: GREEN });
    await select(ctx, [box]);
    await ctx.click(ctx.t("editor.tool.hollow"));
    await ctx.wait(1200);
    await ctx.shot("hollow-panel");
  },

  async "hollow-result"(ctx) {
    await freshEditor(ctx);
    const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 44, depth: 44, height: 30, color: GREEN });
    await ctx.mcp("hollow_object", { id: box, thickness: 3, openings: "top", edges: "round" });
    await ctx.wait(5000);
    await select(ctx, []);
    await ctx.shot("hollow-result");
  },

  // The Hollow tool leaves any side open: a drawer slot from a box.
  async "hollow-sides"(ctx) {
    await freshEditor(ctx);
    const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 44, depth: 44, height: 30, color: GREEN });
    await ctx.mcp("hollow_object", { id: box, thickness: 3, openings: ["front"], edges: "round" });
    await ctx.wait(5000);
    await select(ctx, []);
    await ctx.shot("hollow-sides");
  },

  // A group cut with a hole, in its parts' colours (the Multicolor switch).
  async "group-multicolor"(ctx) {
    await freshEditor(ctx);
    const body = await create(ctx, { kind: "box", x: 0, z: 0, width: 44, depth: 44, height: 24, color: ORANGE });
    const peg = await create(ctx, { kind: "cylinder", x: 12, z: -12, width: 18, depth: 18, height: 40, color: BLUE });
    const hole = await create(ctx, { kind: "cylinder", x: -8, z: 8, width: 18, depth: 18, height: 40, color: GREEN });
    await ctx.mcp("update_object", { id: hole, hole: true });
    const group = await ctx.mcp("group_objects", { ids: [body, peg, hole] });
    const id = group.object?.id ?? group.id;
    await ctx.mcp("update_object", { id, multicolor: true });
    await ctx.wait(4000);
    await select(ctx, [id]);
    await ctx.wait(1500);
    await ctx.shot("group-multicolor");
  },

  // Align faces: the part that moves is selected and the tool is open.
  async "mate-faces"(ctx) {
    await freshEditor(ctx);
    const left = await create(ctx, { kind: "box", x: -26, z: 0, width: 30, depth: 30, height: 24, color: BLUE });
    await create(ctx, { kind: "box", x: 24, z: 6, width: 30, depth: 30, height: 30, color: ORANGE, rotation: 20 });
    await select(ctx, [left]);
    await ctx.click(ctx.t("editor.tool.mateFaces"));
    await ctx.wait(1500);
    await ctx.shot("mate-faces");
  },

  // A turned body shows its angles under it, and the Rotation card in its settings takes them.
  async "rotation-card"(ctx) {
    await freshEditor(ctx);
    const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 36, depth: 24, height: 20, color: GREEN, rotation: 35, rotationX: 0, rotationZ: 12 });
    await select(ctx, [box]);
    await ctx.wait(1500);
    await ctx.evaluate(`(() => { const card = [...document.querySelectorAll("button, summary, h3, strong")].find((el) => el.textContent.trim() === ${JSON.stringify(ctx.t("inspector.rotation"))}); card?.click(); return Boolean(card); })()`);
    await ctx.wait(1000);
    await ctx.evaluate(`(() => { const card = [...document.querySelectorAll("button, summary, h3, strong")].find((el) => el.textContent.trim() === ${JSON.stringify(ctx.t("inspector.rotation"))}); card?.scrollIntoView({ block: "start" }); return Boolean(card); })()`);
    await ctx.wait(600);
    await ctx.shot("rotation-card");
  },

  async "pattern-tool"(ctx) {
    await freshEditor(ctx);
    const plate = await create(ctx, { kind: "cylinder", x: 0, z: 0, width: 60, depth: 60, height: 6, color: BLUE });
    const hole = await create(ctx, { kind: "cylinder", x: 20, z: 0, width: 6, depth: 6, height: 10, color: ORANGE });
    await ctx.mcp("update_object", { id: hole, hole: true });
    await select(ctx, [hole]);
    await ctx.click(ctx.t("editor.tool.array"));
    await ctx.wait(800);
    await ctx.click(ctx.t("array.mode.circle"));
    await ctx.wait(1500);
    await ctx.shot("pattern-tool");
  },

  async "object-list"(ctx) {
    await freshEditor(ctx);
    const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 40, depth: 40, height: 20, name: ctx.language === "de" ? "Grundplatte" : "Base plate", color: BLUE });
    const hole = await create(ctx, { kind: "cylinder", x: 0, z: 0, width: 14, depth: 14, height: 30, name: ctx.language === "de" ? "Bohrung" : "Bore", color: ORANGE });
    await ctx.mcp("update_object", { id: hole, hole: true });
    await create(ctx, { kind: "sphere", x: 45, z: 5, width: 20, depth: 20, height: 20, color: GREEN });
    await ctx.mcp("group_objects", { ids: [box, hole] });
    await ctx.wait(2500);
    await ctx.click(ctx.t("editor.tool.showOutliner"));
    await ctx.wait(1000);
    await ctx.shot("object-list");
  },

  async "settings-printer"(ctx) {
    await freshEditor(ctx);
    await sampleParts(ctx);
    await ctx.evaluate(`window.dispatchEvent(new Event("layerling:open-workspace-settings")); true`);
    await ctx.wait(1000);
    await ctx.click(ctx.t("workspace.workplane"), "button, [role=tab]");
    await ctx.wait(800);
    await ctx.chooseOption("Bambu Lab A1");
    await ctx.shot("settings-workplane");
  },

  async "export-panel"(ctx) {
    await freshEditor(ctx);
    const { box } = await sampleParts(ctx);
    await select(ctx, [box]);
    await ctx.click(ctx.t("editor.export"));
    await ctx.wait(1200);
    await ctx.shot("export-panel");
  },

  async "import-panel"(ctx) {
    await freshEditor(ctx);
    await ctx.click(ctx.t("editor.import"));
    await ctx.wait(1200);
    await ctx.shot("import-panel");
  },

  async "shortcuts"(ctx) {
    await freshEditor(ctx);
    await sampleParts(ctx);
    await ctx.click(ctx.t("editor.keyboardShortcuts"));
    await ctx.wait(1000);
    await ctx.shot("shortcuts");
  },

  async "curved-text"(ctx) {
    await freshEditor(ctx);
    await create(ctx, { kind: "cylinder", x: 0, z: 0, width: 64, depth: 64, height: 4, color: BLUE });
    const text = await create(ctx, { kind: "text", x: 0, z: 0, elevation: 4, height: 3, text: "layerling", color: ORANGE });
    await ctx.mcp("update_object", { id: text, textCurved: true, textRadius: 20, textSize: 8 });
    await select(ctx, [text]);
    await ctx.click(ctx.t("view.top"));
    await ctx.wait(1500);
    await ctx.reveal(ctx.t("prop.textFlipped"));
    await ctx.shot("curved-text");
  },

  async "thread-screw"(ctx) {
    await freshEditor(ctx);
    const screw = await create(ctx, { kind: "thread", threadRole: "screw", threadDiameter: 8, height: 30, color: ORANGE });
    await select(ctx, [screw]);
    await quiet(ctx, 1500);
    await ctx.shot("thread-screw");
  },
};


/** Opens the sketch editor for an extruded sketch and draws an L-shaped outline. */
async function drawOutline(ctx) {
  await ctx.goto("/?editor=1");
  await ctx.click(ctx.t("editor.modeSketch"));
  await ctx.wait(1500);
  // The "Sketch to 3D" menu is gone: the sketch ribbon offers the extrude button itself.
  await ctx.click(ctx.t("sketch.extrude"), undefined, true);
  await ctx.wait(2500);
  const points = [[430, 250], [640, 250], [640, 400], [540, 400], [540, 560], [430, 560], [430, 250]];
  for (const [x, y] of points) await ctx.mouse(x, y);
}

scenes["sketch"] = async (ctx) => {
  await drawOutline(ctx);
  await ctx.shot("sketch-outline");
  await ctx.click(ctx.t("sketch.filletCorner"));
  await ctx.setField(ctx.t("sketch.filletRadius"), 12);
  await ctx.shot("sketch-fillet");
  await ctx.clickSelector("button[aria-label='" + ctx.t("sketch.apply") + "']").catch(() => ctx.click(ctx.t("sketch.apply")));
  await ctx.wait(800);
  await ctx.click(ctx.t("sketch.finishSketch"));
  await ctx.wait(3500);
  await ctx.shot("sketch-result");
};

// A straight side bent into a curve, with its two handles.
scenes["sketch-curve"] = async (ctx) => {
  await drawOutline(ctx);
  await ctx.mouse(485, 560);
  await ctx.wait(600);
  await ctx.click(ctx.t("sketch.curveLine"));
  await ctx.wait(800);
  await ctx.shot("sketch-curve");
};

scenes["tape-measure"] = async (ctx) => {
  await freshEditor(ctx);
  const { box } = await sampleParts(ctx);
  await select(ctx, []);
  await ctx.clickSelector(".tape-trigger");
  await ctx.wait(800);
  await ctx.shot("tape-menu");
};

scenes["open-group"] = async (ctx) => {
  await freshEditor(ctx);
  const box = await create(ctx, { kind: "box", x: 0, z: 0, width: 40, depth: 40, height: 20, name: ctx.language === "de" ? "Grundplatte" : "Base plate", color: BLUE });
  const hole = await create(ctx, { kind: "cylinder", x: 0, z: 0, width: 14, depth: 14, height: 30, name: ctx.language === "de" ? "Bohrung" : "Bore", color: ORANGE });
  await ctx.mcp("update_object", { id: hole, hole: true });
  await ctx.mcp("group_objects", { ids: [box, hole] });
  await ctx.wait(2500);
  // The object list is open from the start; a click is needed only when it was hidden.
  await ctx.click(ctx.t("editor.tool.showOutliner")).catch(() => {});
  await ctx.click(ctx.t("group.edit"));
  await ctx.wait(2500);
  await ctx.shot("open-group");
};

scenes["align"] = async (ctx) => {
  await freshEditor(ctx);
  const a = await create(ctx, { kind: "box", x: -20, z: -10, width: 30, depth: 20, height: 15, color: BLUE });
  const b = await create(ctx, { kind: "cylinder", x: 25, z: 15, width: 24, depth: 24, height: 25, color: ORANGE });
  await select(ctx, [a, b]);
  await ctx.click(ctx.t("editor.tool.align"));
  await ctx.wait(1200);
  await ctx.shot("align");
};

scenes["printer-overhang"] = async (ctx) => {
  await freshEditor(ctx);
  await create(ctx, { kind: "box", x: 0, z: 0, width: 210, depth: 50, height: 30, color: BLUE });
  await ctx.evaluate(`window.dispatchEvent(new Event("layerling:open-workspace-settings")); true`);
  await ctx.wait(1000);
  await ctx.click(ctx.t("workspace.workplane"), "button, [role=tab]");
  // The A1 mini, as the guide says: its plate is narrower than the box, the A1's is not.
  await ctx.chooseOption("Bambu Lab A1 mini");
  await ctx.click(ctx.t("workspace.close"));
  await ctx.wait(1500);
  await ctx.click(ctx.t("view.top"));
  await ctx.wait(1500);
  await ctx.click(ctx.t("camera.home"));
  await ctx.wait(1500);
  await ctx.click(ctx.t("camera.zoomOut"));
  await ctx.click(ctx.t("camera.zoomOut"));
  await ctx.wait(1500);
  await ctx.mcp("select_objects", { ids: [] });
  await ctx.shot("printer-overhang");
};

scenes["editor-dark"] = async (ctx) => {
  await freshEditor(ctx);
  await sampleParts(ctx);
  await ctx.evaluate(`localStorage.setItem("layerling.theme", "dark"); true`);
  await ctx.goto("/?editor=1", 6000);
  await ctx.clearScene();
  await sampleParts(ctx);
  await select(ctx, []);
  await ctx.shot("editor-dark");
  await ctx.evaluate(`localStorage.setItem("layerling.theme", "light"); true`);
};

scenes["quick-guide"] = async (ctx) => {
  await freshEditor(ctx);
  await sampleParts(ctx);
  await ctx.click(ctx.t("editor.guide"));
  await ctx.wait(1200);
  await ctx.shot("quick-guide");
};

/** Switches the settings switch for edge lines on, through the open settings window. */
async function switchEdgeLinesOn(ctx) {
  const done = await ctx.evaluate(`(() => {
    const wanted = ${JSON.stringify(ctx.t("workspace.edgeLines"))};
    const row = [...document.querySelectorAll(".workspace-modal-body label, .workspace-modal-body div")].find((element) =>
      element.textContent.trim().startsWith(wanted) && element.querySelector("input[type=checkbox]"));
    const box = row?.querySelector("input[type=checkbox]");
    if (!box) return false;
    if (!box.checked) box.click();
    return true;
  })()`);
  if (!done) throw new Error("Edge lines switch not found");
  await ctx.wait(800);
}

/** Types a value into a panel slider's number field, which takes it when the field is left. */
async function setSliderValue(ctx, label, value) {
  const done = await ctx.evaluate(`(() => {
    const wanted = ${JSON.stringify(label)};
    const name = [...document.querySelectorAll(".array-panel label, .array-panel span, .array-panel div")].find((element) =>
      element.children.length < 3 && element.textContent.trim() === wanted && element.getBoundingClientRect().width > 0);
    let scope = name;
    let input = null;
    for (let depth = 0; depth < 4 && !input; depth += 1) {
      scope = scope?.parentElement;
      input = scope?.querySelector("input:not([type=range]):not([type=checkbox])");
    }
    if (!input) return false;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(String(value))});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.blur();
    return true;
  })()`);
  if (!done) throw new Error(`Slider "${label}" not found`);
  await ctx.wait(700);
}

scenes["pattern-spiral"] = async (ctx) => {
  await freshEditor(ctx);
  const post = await create(ctx, { kind: "box", x: 22, z: 0, width: 10, depth: 10, height: 6, color: ORANGE });
  await select(ctx, [post]);
  await ctx.click(ctx.t("editor.tool.array"));
  // The development server builds the panel the first time it is opened.
  await ctx.wait(3000);
  await ctx.click(ctx.t("array.mode.circle"));
  await ctx.wait(800);
  await setSliderValue(ctx, ctx.t("array.count"), 14);
  await setSliderValue(ctx, ctx.t("array.rise"), 3);
  await setSliderValue(ctx, ctx.t("array.radiusChange"), 1);
  await ctx.wait(1500);
  await ctx.shot("pattern-spiral");
};

scenes["property-reset"] = async (ctx) => {
  // A taller window, so the arrows and the two buttons at the bottom of Properties are in one picture.
  await ctx.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1180, deviceScaleFactor: 1, mobile: false });
  await freshEditor(ctx);
  // A cone as the toolbar makes it, then two values moved away from their defaults: each gets its arrow.
  const cone = await create(ctx, { kind: "cone", x: 0, z: 0, color: BLUE });
  await ctx.mcp("update_object", { id: cone, height: 34, topRadius: 5 });
  await select(ctx, [cone]);
  await quiet(ctx);
  await ctx.shot("property-reset");
  await ctx.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
};

scenes["settings-appearance"] = async (ctx) => {
  await freshEditor(ctx);
  await sampleParts(ctx);
  await ctx.evaluate(`window.dispatchEvent(new Event("layerling:open-workspace-settings")); true`);
  await ctx.wait(1000);
  await ctx.click(ctx.t("workspace.appearance"), "button, [role=tab]");
  await ctx.wait(800);
  await switchEdgeLinesOn(ctx);
  await ctx.shot("settings-appearance");
};

scenes["edge-lines"] = async (ctx) => {
  await freshEditor(ctx);
  await ctx.evaluate(`window.dispatchEvent(new Event("layerling:open-workspace-settings")); true`);
  await ctx.wait(1000);
  await ctx.click(ctx.t("workspace.appearance"), "button, [role=tab]");
  await ctx.wait(800);
  await switchEdgeLinesOn(ctx);
  await ctx.click(ctx.t("workspace.close"));
  await ctx.wait(800);
  await create(ctx, { kind: "box", x: -34, z: 0, width: 28, depth: 28, height: 24, color: "#1f3a5f" });
  await create(ctx, { kind: "cylinder", x: 4, z: 0, width: 28, depth: 28, height: 24, color: "#2e5e3e" });
  await create(ctx, { kind: "cone", x: 42, z: 0, width: 28, depth: 28, height: 24, color: "#6b1f2a" });
  await select(ctx, []);
  await quiet(ctx);
  await ctx.shot("edge-lines");
};
