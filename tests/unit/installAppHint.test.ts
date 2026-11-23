import { describe, expect, it } from "vitest";
import { installHintKey } from "@/lib/installHint";

describe("install hint for browsers without an install button", () => {
  const chrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
  const edge = `${chrome} Edg/140.0.0.0`;
  const safariMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
  const iPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const firefox = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0";

  it("names the way each browser installs", () => {
    expect(installHintKey(chrome, 0)).toBe("installHint.chromium");
    expect(installHintKey(edge, 0)).toBe("installHint.chromium");
    expect(installHintKey(safariMac, 0)).toBe("installHint.safariMac");
    expect(installHintKey(iPhone, 5)).toBe("installHint.ios");
    expect(installHintKey(firefox, 0)).toBe("installHint.firefoxWindows");
  });

  it("names the taskbar icon only for a Firefox that has it (#1978)", () => {
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:157.0) Gecko/20100101 Firefox/157.0";
    const android = "Mozilla/5.0 (Android 15; Mobile; rv:157.0) Gecko/157.0 Firefox/157.0";
    expect(installHintKey(firefox.replaceAll("143.0", "157.0"), 0)).toBe("installHint.firefoxWindows");
    expect(installHintKey(firefox.replaceAll("143.0", "142.0"), 0)).toBe("installHint.firefox");
    expect(installHintKey(mac, 0)).toBe("installHint.firefox");
    expect(installHintKey(android, 5)).toBe("installHint.firefox");
  });

  it("treats an iPad that reports itself as a Mac as an iPad", () => {
    expect(installHintKey(safariMac, 5)).toBe("installHint.ios");
  });
});
