import type { Metadata } from "next";
import { Inter, Montserrat } from 'next/font/google';
import { Providers } from "./providers";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { FloatingIntelButton } from "@/components/floating-intel-button";
import { FieldIntelligenceModal } from "@/components/field-intelligence-modal";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

// Inter is a variable font, so it handles weights 100-900 automatically
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

// SURGICAL FIX: Unlocked the full range of weights for Montserrat 
// to allow the "unbolding" in page.tsx to actually render.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: new URL("https://leopardfishintel.com"),
  title: "Leopardfish Intel | Strategic Insight for International Educators",
  description: "Military-grade precision intel for international educators, teacher salary forecasters, cost of living breakdowns, and school retention data.",
  applicationName: "Leopardfish Intel",
  authors: [{ name: "Leopardfish Intelligence Network" }],
  keywords: [
    "international school salary",
    "international teaching jobs",
    "cost of living calculator",
    "expat teacher savings",
    "international school reviews",
    "teacher retention rate",
    "education tactical intelligence"
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://leopardfishintel.com",
    siteName: "Leopardfish Intel",
    title: "Leopardfish Intel | Strategic Insight for International Educators",
    description: "Military-grade precision intel for international educators, teacher salary forecasters, cost of living breakdowns, and school retention data.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Leopardfish Intel - Strategic Insight for International Educators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leopardfish Intel | Strategic Insight for International Educators",
    description: "Military-grade precision intel for international educators, teacher salary forecasters, cost of living breakdowns, and school retention data.",
    creator: "@leopardfishintel",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://leopardfishintel.com",
  },
};

const rootJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://leopardfishintel.com/#organization",
      "name": "Leopardfish Intel",
      "url": "https://leopardfishintel.com",
      "logo": "https://leopardfishintel.com/assets/logo.svg",
      "description": "Strategic intelligence, financial forecasting, and verified data for international educators worldwide."
    },
    {
      "@type": "WebSite",
      "@id": "https://leopardfishintel.com/#website",
      "url": "https://leopardfishintel.com",
      "name": "Leopardfish Intel",
      "publisher": {
        "@id": "https://leopardfishintel.com/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://leopardfishintel.com/schools?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased min-h-screen bg-background text-white selection:bg-primary selection:text-white overflow-x-hidden`}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Header />

            <main className="flex-1 w-full">
              {children}
            </main>

            <Footer />
            <FloatingIntelButton />
            <FieldIntelligenceModal />
            <AnalyticsTracker />
          </div>
        </Providers>
      </body>
    </html>
  );
}