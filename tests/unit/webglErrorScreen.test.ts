import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SafeModeScreen } from "@/components/SafeModeErrorBoundary";
import { MESSAGES_DE } from "@/lib/messages.de";
import { MESSAGES_EN } from "@/lib/messages.en";
import { isWebGLContextError } from "@/lib/webglError";

const STEPS = ["crash.webgl.stepRestart", "crash.webgl.stepAcceleration", "crash.webgl.stepPrivacy", "crash.webgl.stepUpdate", "crash.webgl.stepOtherBrowser"] as const;

/** The screen as markup, with the text of the page as the browser would show it. */
function screen(error: Error | null) {
  const markup = renderToStaticMarkup(createElement(SafeModeScreen, { error, projectId: "p1", projectName: "Bracket", onGoToDashboard: () => {}, onNewEmptyProject: () => {} }));
  return markup.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
}

describe("telling a missing WebGL context from other errors (Issue #1863)", () => {
  it("knows the errors three.js and browsers give when there is no WebGL context", () => {
    expect(isWebGLContextError(new Error("Error creating WebGL context."))).toBe(true);
    expect(isWebGLContextError(new Error("Error creating WebGL context with your selected attributes."))).toBe(true);
    expect(isWebGLContextError(new Error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: Web page caused context loss and was blocked"))).toBe(true);
    expect(isWebGLContextError(new Error("WebGL2 context could not be created"))).toBe(true);
    expect(isWebGLContextError("WebGL is not supported")).toBe(true);
  });

  it("leaves every other error alone", () => {
    expect(isWebGLContextError(new Error("Cannot read properties of undefined (reading 'geometry')"))).toBe(false);
    expect(isWebGLContextError(new Error("The WebGLRenderTarget is too large. The canvas has no context menu."))).toBe(false);
    expect(isWebGLContextError(new Error(""))).toBe(false);
    expect(isWebGLContextError(null)).toBe(false);
    expect(isWebGLContextError(undefined)).toBe(false);
    expect(isWebGLContextError({ message: "Error creating WebGL context." })).toBe(false);
  });
});

describe("the error screen when the 3D view gets no WebGL context (Issue #1863)", () => {
  it("says what happened and what to try, instead of the general error", () => {
    const markup = screen(new Error("Error creating WebGL context."));
    expect(markup).toContain(MESSAGES_EN["crash.webgl.title"]);
    expect(markup).toContain(MESSAGES_EN["crash.webgl.description"]);
    expect(markup).toContain(MESSAGES_EN["crash.webgl.stepsTitle"]);
    for (const step of STEPS) expect(markup).toContain(`<li>${MESSAGES_EN[step]}</li>`);
    expect(markup).not.toContain(MESSAGES_EN["crash.title"]);
    expect(markup).not.toContain(MESSAGES_EN["crash.description"]);
  });

  it("keeps the ways out that work without the 3D view, and drops the new design, which would stop the same way", () => {
    const markup = screen(new Error("Error creating WebGL context."));
    expect(markup).toContain(MESSAGES_EN["crash.downloadBackup"]);
    expect(markup).toContain(MESSAGES_EN["crash.goToDashboard"]);
    expect(markup).toContain(MESSAGES_EN["crash.projectHint"].replace("{name}", "Bracket"));
    expect(markup).toContain("Error creating WebGL context.");
    expect(markup).not.toContain(MESSAGES_EN["crash.newEmptyProject"]);
  });

  it("shows any other error as before", () => {
    const markup = screen(new Error("Something else broke"));
    expect(markup).toContain(MESSAGES_EN["crash.title"]);
    expect(markup).toContain(MESSAGES_EN["crash.description"]);
    expect(markup).toContain(MESSAGES_EN["crash.newEmptyProject"]);
    expect(markup).not.toContain(MESSAGES_EN["crash.webgl.title"]);
    expect(markup).not.toContain("safe-mode-steps");
  });

  it("promises that the designs are kept and names the pages that show the state of WebGL", () => {
    expect(MESSAGES_EN["crash.webgl.description"]).toContain("not deleted");
    expect(MESSAGES_DE["crash.webgl.description"]).toContain("nicht gelöscht");
    for (const messages of [MESSAGES_EN, MESSAGES_DE]) {
      expect(messages["crash.webgl.stepAcceleration"]).toContain("chrome://gpu");
      expect(messages["crash.webgl.stepAcceleration"]).toContain("edge://gpu");
      expect(messages["crash.webgl.stepOtherBrowser"]).toContain(".lyl");
    }
  });
});
