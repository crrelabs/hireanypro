import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const GA_ID = "G-25DF5DE9QJ";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HireAnyPro — Find Trusted Home Service Pros in Miami",
  description: "Find and hire the best plumbers, electricians, roofers, HVAC technicians, and more in Florida. Read reviews, compare ratings, and get quotes.",
  openGraph: {
    title: "HireAnyPro — Find Trusted Home Service Pros",
    description: "Find and hire the best home service professionals in Florida.",
    type: "website",
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
