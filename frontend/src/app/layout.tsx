import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legal Metrology Compliance",
  description: "AI-powered compliance verification system for Legal Metrology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="glass sticky top-0 z-50 w-full transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="font-semibold text-lg tracking-tight-heading">
                  LM Compliance
                </Link>
              </div>
              <div className="flex space-x-6">
                <Link href="/scanner" className="text-sm font-medium hover:opacity-70 transition-opacity active-scale">
                  Scanner
                </Link>
                <Link href="/inspections" className="text-sm font-medium hover:opacity-70 transition-opacity active-scale">
                  Inspections
                </Link>
                <Link href="/dashboard" className="text-sm font-medium hover:opacity-70 transition-opacity active-scale">
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-[calc(100vh-3.5rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
