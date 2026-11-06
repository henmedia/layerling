"use client";

import { useSyncExternalStore } from "react";
import { getPrinterPlay, subscribeToPrinterPlay } from "@/lib/printerPlay";

/** The printer's play (printerPlay.ts), kept up to date in every window that shows it. */
export function usePrinterPlay(): number | null {
  return useSyncExternalStore(subscribeToPrinterPlay, getPrinterPlay, () => null);
}
