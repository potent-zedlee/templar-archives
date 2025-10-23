import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { WebVitalsReporter } from "@/components/analytics/web-vitals"
import { Footer } from "@/components/footer"
import { CookieConsentBanner } from "@/components/cookie-consent-banner"
import "./globals.css"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  metadataBase: new URL('https://templar-archives.vercel.app'),
  title: {
    default: "Templar Archives - Poker Hand History Archive & Analysis",
    template: "%s | Templar Archives"
  },
  description: "Comprehensive poker hand history archive and analysis platform. Search, analyze, and share professional poker hands from major tournaments worldwide.",
  keywords: ["poker", "hand history", "tournament", "analysis", "archive", "WSOP", "Triton", "EPT", "poker hands"],
  authors: [{ name: "Templar Archives Team" }],
  creator: "Templar Archives",
  publisher: "Templar Archives",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://templar-archives.vercel.app",
    siteName: "Templar Archives",
    title: "Templar Archives - Poker Hand History Archive & Analysis",
    description: "Comprehensive poker hand history archive and analysis platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Templar Archives"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Templar Archives - Poker Hand History Archive",
    description: "Comprehensive poker hand history archive and analysis platform",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Google Search Console verification (추후 추가)
    // google: 'your-verification-code',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Footer />
          <CookieConsentBanner />
        </Providers>
        <WebVitalsReporter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
