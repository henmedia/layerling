"use client";

import { useEffect, useState } from "react";

/** An iPhone or iPad - an iPad in desktop mode calls itself a Mac but has a touch screen. */
export function isAppleTouchDevice(userAgent: string, maxTouchPoints: number) {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/**
 * The `accept` list for a file picker. iOS and iPadOS grey out every file whose ending they do not
 * know as a type - `.stl`, `.lyl`, `.3mf` - so a list of such endings leaves the files one wants
 * unselectable, while a ZIP, which they know, still works (#219). There the picker is left open
 * and the app checks what it is given. Everywhere else the list narrows the picker as before; the
 * first render, on the server too, always has the list, so nothing differs between them.
 */
export function useFileAccept(accept: string): string | undefined {
  const [value, setValue] = useState<string | undefined>(accept);
  useEffect(() => {
    if (isAppleTouchDevice(navigator.userAgent, navigator.maxTouchPoints)) setValue(undefined);
  }, []);
  return value;
}
