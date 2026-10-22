import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const GA_ID = "G-25DF5DE9QJ";

const siteJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "HireAnyPro",
    alternateName: ["Hire Any Pro", "HireAnyPro.com"],
    url: "https://hireanypro.com/",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: "https://hireanypro.com/search?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HireAnyPro",
    alternateName: "Hire Any Pro",
    url: "https://hireanypro.com/",
    logo: "https://hireanypro.com/logo.png",
    areaServed: "Florida",
  },
];

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hireanypro.com"),
  title: "HireAnyPro — Find Trusted Home Service Pros in Florida",
  description: "Find and hire the best plumbers, electricians, roofers, HVAC technicians, and more in Florida. Read reviews, compare ratings, and get quotes.",
  // canonical set per-page to avoid incorrect fallback to homepage
  openGraph: {
    title: "HireAnyPro — Find Trusted Home Service Pros",
    description: "Find and hire the best home service professionals in Florida.",
    type: "website",
    siteName: "HireAnyPro",
    url: 'https://hireanypro.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');`}
        </Script>
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
