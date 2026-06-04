import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import type { ReactNode } from "react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://repdock.net";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "RepDock",
  title: {
    default: "RepDock",
    template: "%s | RepDock",
  },
  description:
    "RepDock brings W2C finds, outfit posts, agent link conversion, QC photos and parcel tracking into one clean workflow.",
  keywords: [
    "RepDock",
    "W2C",
    "agent converter",
    "QC photos",
    "parcel tracking",
    "outfits",
    "Taobao",
    "Weidian",
    "1688",
  ],
  authors: [{ name: "RepDock" }],
  creator: "RepDock",
  publisher: "RepDock",
  category: "shopping",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/ico/favicon.ico" },
      { url: "/ico/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/ico/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/ico/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/ico/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "RepDock",
    title: "RepDock",
    description:
      "W2C finds, outfits, converter, QC photos and parcel tracking in one clean workflow.",
    images: [
      {
        url: "/RepDock-25.png",
        width: 512,
        height: 512,
        alt: "RepDock",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "RepDock",
    description:
      "W2C finds, outfits, converter, QC photos and parcel tracking in one clean workflow.",
    images: ["/RepDock-25.png"],
  },
  appleWebApp: {
    capable: true,
    title: "RepDock",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable}`}>{children}</body>
    </html>
  );
}
