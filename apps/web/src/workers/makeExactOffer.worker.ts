/// <reference lib="webworker" />

import { buildMessage } from "@/lib/buildStamp";
import { exactOfferFits, type ExactOfferRequest, type ExactOfferResponse } from "@/lib/exactOfferCheck";

self.postMessage(buildMessage());

self.onmessage = (event: MessageEvent<ExactOfferRequest>) => {
  let fits = false;
  try {
    fits = exactOfferFits(event.data.positions);
  } catch {
    // No offer.
  }
  self.postMessage({ fits } satisfies ExactOfferResponse);
};
