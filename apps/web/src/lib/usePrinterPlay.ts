"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getPrinterPlay, getPrinterPlayFor, printerPlaySource, subscribeToPrinterPlay } from "@/lib/printerPlay";

/** The printer's play (printerPlay.ts) for the open design's printer, kept up to date in every window that shows it. */
export function usePrinterPlay(): number | null {
  return useSyncExternalStore(subscribeToPrinterPlay, getPrinterPlay, () => null);
}

/** The play for this printer ("" for none), and whether it is the printer's own or the play without a printer. */
export function usePrinterPlayFor(printer: string): { play: number | null; source: "printer" | "general" | null } {
  const play = useSyncExternalStore(subscribeToPrinterPlay, useCallback(() => getPrinterPlayFor(printer), [printer]), () => null);
  const source = useSyncExternalStore(subscribeToPrinterPlay, useCallback(() => printerPlaySource(printer), [printer]), () => null);
  return { play, source };
}
