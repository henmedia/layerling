import { describe, expect, it } from "vitest";
import { isAppleTouchDevice } from "@/lib/fileAccept";

// iOS greys out files of types it does not know, so its file pickers are left without a list.
describe("file pickers on an iPad or iPhone", () => {
  const iPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const iPad = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const iPadAsMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
  const mac = iPadAsMac;
  const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

  it("recognises iPhone, iPad and an iPad that calls itself a Mac", () => {
    expect(isAppleTouchDevice(iPhone, 5)).toBe(true);
    expect(isAppleTouchDevice(iPad, 5)).toBe(true);
    expect(isAppleTouchDevice(iPadAsMac, 5)).toBe(true);
  });

  it("leaves a Mac without a touch screen and other systems alone", () => {
    expect(isAppleTouchDevice(mac, 0)).toBe(false);
    expect(isAppleTouchDevice(windows, 10)).toBe(false);
  });
});
