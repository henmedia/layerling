import { describe, expect, it, vi } from "vitest";
import { searchCommands } from "@/lib/commandSearch";
import { customShapeCommands } from "@/lib/customShapeCommands";

const saved = [
  { id: "my-1", name: "Pen holder", thumbnail: "data:image/png;base64,AAAA" },
  { id: "server:Custom shapes/Hinge.lyl", name: "Hinge", thumbnail: "" },
  { id: "my-3", name: "Schraubdeckel", thumbnail: "data:image/png;base64,BBBB" },
];

describe("custom shapes in the command search", () => {
  const insert = vi.fn();
  const commands = customShapeCommands(saved, "Shapes", (name) => `Add custom shape: ${name}`, insert);

  it("makes one entry per saved shape, labelled with its name, and keeps its picture", () => {
    expect(commands.map((command) => command.label)).toEqual(["Add custom shape: Pen holder", "Add custom shape: Hinge", "Add custom shape: Schraubdeckel"]);
    expect(commands[0].image).toBe("data:image/png;base64,AAAA");
    expect(commands[1].image).toBeUndefined();
  });

  it("finds a shape by a part of its name, in any case", () => {
    expect(searchCommands(commands, "pen").map((command) => command.id)).toEqual(["custom-shape-my-1"]);
    expect(searchCommands(commands, "HINGE").map((command) => command.id)).toEqual(["custom-shape-server:Custom shapes/Hinge.lyl"]);
    expect(searchCommands(commands, "schraub").map((command) => command.id)).toEqual(["custom-shape-my-3"]);
  });

  it("is found by 'custom' as well, so the whole collection can be listed", () => {
    expect(searchCommands(commands, "custom")).toHaveLength(3);
  });

  it("is listed only once something is typed, and not remembered as recently used", () => {
    expect(commands.every((command) => command.searchOnly && command.transient)).toBe(true);
  });

  it("puts the chosen shape in by its id", () => {
    searchCommands(commands, "hinge")[0].run();
    expect(insert).toHaveBeenCalledWith("server:Custom shapes/Hinge.lyl");
  });

  it("makes no entries without shapes", () => {
    expect(customShapeCommands([], "Shapes", (name) => name, insert)).toEqual([]);
  });
});
