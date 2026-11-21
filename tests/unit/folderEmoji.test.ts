import { describe, expect, it } from "vitest";
import { folderNameParts } from "@/lib/folderEmoji";

describe("folderNameParts (#1932)", () => {
  it("takes an emoji at the start as the folder's picture", () => {
    expect(folderNameParts("💡 Ideas")).toEqual({ emoji: "💡", label: "Ideas" });
    expect(folderNameParts("🚀Rockets")).toEqual({ emoji: "🚀", label: "Rockets" });
  });

  it("keeps emoji made of several code points whole", () => {
    expect(folderNameParts("❤️ Gifts")).toEqual({ emoji: "❤️", label: "Gifts" });
    expect(folderNameParts("👩‍🔧 Repairs")).toEqual({ emoji: "👩‍🔧", label: "Repairs" });
    expect(folderNameParts("🇩🇪 Germany")).toEqual({ emoji: "🇩🇪", label: "Germany" });
    expect(folderNameParts("1️⃣ First")).toEqual({ emoji: "1️⃣", label: "First" });
    expect(folderNameParts("👍🏽 Good")).toEqual({ emoji: "👍🏽", label: "Good" });
  });

  it("leaves ordinary names as they are", () => {
    expect(folderNameParts("Brackets")).toEqual({ emoji: null, label: "Brackets" });
    expect(folderNameParts("2026 parts")).toEqual({ emoji: null, label: "2026 parts" });
    expect(folderNameParts("© 2026")).toEqual({ emoji: null, label: "© 2026" });
    expect(folderNameParts("Ideas 💡")).toEqual({ emoji: null, label: "Ideas 💡" });
  });

  it("keeps a name that is only an emoji as its label", () => {
    expect(folderNameParts("🪣")).toEqual({ emoji: "🪣", label: "🪣" });
  });
});
