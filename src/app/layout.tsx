import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sentinel SAST | Developer-First Code Security & AI-Verified Static Analysis",
  description:
    "Sentinel SAST redefines code security with deep taint analysis, sub-second PR scans, and verified zero false positives. Built for modern engineering teams.",
  keywords: [
    "SAST",
    "code security",
    "static application security testing",
    "DevSecOps",
    "taint analysis",
    "LLM verification",
  ],
  authors: [{ name: "Sentinel Security" }],
  openGraph: {
    title: "Sentinel SAST | Redefining Code Security",
    description:
      "High-precision static analysis with zero false positives. Designed for software engineering and product security leaders.",
    type: "website",
  },
};

import Providers from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-900 dark:bg-black dark:text-white relative overflow-x-hidden antialiased selection:bg-yellow-500/30 selection:text-slate-900 dark:selection:text-white">
        {/* Subtle Edge-to-Edge Wireframe Grid Pattern */}
        <div className="fixed inset-0 bg-wireframe-grid pointer-events-none z-0" />

        {/* Screen-wide CSS Noise / Grain Overlay */}
        <div className="fixed inset-0 bg-grain-noise opacity-[0.015] dark:opacity-[0.035] pointer-events-none z-50 mix-blend-multiply dark:mix-blend-screen" />

        <div className="relative z-10 flex flex-col min-h-full">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
