import type { Metadata } from "next";
import { Web3Provider } from "@/contexts/Web3Context";
import { Navbar } from "@/components/Navbar";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans-family",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HashBazaar | Web3 Commerce",
  description: "Decentralized e-commerce powered by HashKey",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
        <Web3Provider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {children}
          </main>
        </Web3Provider>
      </body>
    </html>
  );
}
