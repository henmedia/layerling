/**
 * Videos by other people about layerling. Plain links, no embeds: an embedded
 * player would contact YouTube as soon as the page opens, and layerling keeps
 * visitors' data to itself. `lang` is the spoken language. Stefan's order (29.10.2026): the playlists of HL ModTech,
 * Making Layers, TECHNOBENTO and Printology first, then the other English videos, then those in other languages.
 * The guide has a chapter with the same list in every language: 16-*.md in docs/guide/<language>. Change both
 * together: tests/unit/videoList.test.ts fails when a language lacks a video or lists them in another order.
 */
export const LAYERLING_VIDEOS = [
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Layerling Tutorials",
    channel: "HL ModTech",
    lang: "EN",
    url: "https://www.youtube.com/playlist?list=PLZ-ZWS0D1JIk",
  },
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Layerling – Playlist",
    channel: "Making Layers",
    lang: "EN",
    url: "https://www.youtube.com/playlist?list=PLCsBmX2kOGWs",
  },
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Layerling",
    channel: "TECHNOBENTO",
    lang: "EN",
    url: "https://www.youtube.com/playlist?list=PLYqVFeqYBrPE",
  },
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Layerling CAD Videos",
    channel: "Printology",
    lang: "EN",
    url: "https://www.youtube.com/playlist?list=PLc09BHr_6nn8",
  },
  {
    title: "I Tried Layerling After Tinkercad… Is It REALLY Better?",
    channel: "Maker Mates Studio 3D Printing",
    lang: "EN",
    url: "https://youtu.be/5DpOxdoNwqs",
  },
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Print by Layer",
    channel: "Print N Repeat",
    lang: "EN",
    url: "https://www.youtube.com/playlist?list=PLejZBz4L7CGQ",
  },
  {
    title: "Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing",
    channel: "3D Jesus | 3D Printing & Design",
    lang: "EN",
    url: "https://youtu.be/kzV7fQ3rXhw",
  },
  {
    title: "Layerling en español: el CAD gratis que reemplaza a Tinkercad (2026)",
    channel: "Random Maker",
    lang: "ES",
    url: "https://youtu.be/iroftGBX-0Y",
  },
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Proyectos en Layerling",
    channel: "Fulcro 1900",
    lang: "ES",
    url: "https://www.youtube.com/playlist?list=PLTEdmvVC2bxs",
  },
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Layerling",
    channel: "Werkplaats Marc",
    lang: "NL",
    url: "https://www.youtube.com/playlist?list=PLQuXPoMXTnRQ",
  },
] as const;
