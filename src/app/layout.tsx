import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SiteChrome } from "@/components/layout/site-chrome";
import { JsonLd } from "@/components/seo/json-ld";
import { ThemeProvider } from "@/components/theme-provider";
import { company } from "@/data/company";
import { buildMetadata, buildOrganizationSchema, SITE_URL } from "@/lib/seo";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const rootMetadata = buildMetadata({
  title: "Precision Foam Manufacturing",
  description:
    "Victory Foam manufactures specified mattresses, comfort layers, industrial foam, and custom-cut components for trade customers across South Africa.",
  path: "/",
});

export const metadata: Metadata = {
  ...rootMetadata,
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-16x16.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1121" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA" suppressHydrationWarning className="dark h-full">
      <body
        className={`${inter.variable} ${plusJakarta.variable} flex min-h-full flex-col font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SiteChrome
            measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            formId={process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID}
          >
            <JsonLd data={buildOrganizationSchema(company)} />
            <Header />
            <Breadcrumbs />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
          </SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
