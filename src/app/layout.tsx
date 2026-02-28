import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HireAnyPro — Find Trusted Home Service Pros in Miami",
  description: "Find and hire the best plumbers, electricians, roofers, HVAC technicians, and more in Miami-Dade County. Read reviews, compare ratings, and get quotes.",
  openGraph: {
    title: "HireAnyPro — Find Trusted Home Service Pros",
    description: "Find and hire the best home service professionals in Miami-Dade County.",
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
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
