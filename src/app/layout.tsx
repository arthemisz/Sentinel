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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
