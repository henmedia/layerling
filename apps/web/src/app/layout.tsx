import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { LANGUAGES } from "@/lib/i18n";

const NAME = "layerling";
const TITLE = "layerling - Free 3D CAD for 3D printing in your browser";
const DESCRIPTION = "Free 3D CAD in your browser, no account: a Tinkercad alternative with fillets, chamfers, hollowing and threads. Export to STL, 3MF and STEP.";

// Tells search engines what layerling is: a free web application, not an
// article about one.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: NAME,
  url: "https://layerling.com/",
  description: DESCRIPTION,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any (web browser)",
  inLanguage: [...LANGUAGES],
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  image: "https://layerling.com/assets/layerling/layerling-social.png",
  sameAs: ["https://github.com/henmedia/layerling"],
};
const SOCIAL_CARD = "/assets/layerling/layerling-social.png";

// Chrome and Edge announce "this can be installed" once, often before React is
// running. The event is kept for the start page's install button
// (InstallAppHint); preventDefault only stops the small bar on phones.
const INSTALL_PROMPT_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__layerlingInstallPrompt=e;window.dispatchEvent(new Event("layerling-install-prompt"))});window.addEventListener("appinstalled",function(){window.__layerlingInstallPrompt=null;window.dispatchEvent(new Event("layerling-install-prompt"))});`;

export const metadata: Metadata = {
  // Damit die Bilder fuer Linkvorschauen als volle Adresse im Kopf stehen -
  // relative Angaben liest kein Forum und kein Messenger aus.
  metadataBase: new URL("https://layerling.com"),
  alternates: { canonical: "/" },
  title: TITLE,
  description: DESCRIPTION,
  applicationName: NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    // Das SVG ist das eigentliche Symbol; die .ico steht daneben fuer alles,
    // was stur /favicon.ico abholt, statt in den Kopf zu sehen.
    icon: [
      { url: "/assets/layerling/layerling-logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    // iOS nimmt hier ausschliesslich PNG. Stand da ein SVG, legte
    // "Zum Home-Bildschirm" einen Schnappschuss der Seite ab statt des Symbols.
    apple: { url: "/assets/layerling/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    siteName: NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en",
    images: [{ url: SOCIAL_CARD, width: 1280, height: 640, type: "image/png", alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SOCIAL_CARD],
  },
};

export const viewport: Viewport = {
  // Faerbt die Leiste des Browsers und, wenn layerling als App laeuft, deren
  // Titelzeile. Die Werte sind die der Werkzeugleiste, hell wie dunkel.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#2b2116" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
