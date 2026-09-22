"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-black border-t border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 text-xs relative overflow-hidden">
      {/* Ambient Gradients */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-200/20 dark:bg-purple-900/15 blur-[150px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-amber-200/20 dark:bg-yellow-700/10 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 font-mono">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Status Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/Trademark.svg"
                alt="Sentinel Logo"
                width={34}
                height={27}
                className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white font-sans">
                Sentinel SAST
              </span>
            </Link>

            <p className="text-xs text-slate-600 dark:text-gray-400 max-w-sm leading-relaxed">
              The high-contrast, zero-false-positive static application security testing platform.
              Engineered for velocity, verified by deterministic reasoning.
            </p>

            {/* Live Operational Status Badge */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm text-[11px] text-slate-700 dark:text-gray-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>All Systems Operational</span>
                <span className="text-slate-300 dark:text-gray-600">|</span>
                <span className="text-slate-500 dark:text-gray-400">99.99% Uptime</span>
              </div>
            </div>

            {/* Compliance certifications */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300">
                SOC 2 TYPE II
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300">
                ISO/IEC 27001
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300">
                GDPR COMPLIANT
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-wider uppercase">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#product-cli" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Sentinel CLI
                </Link>
              </li>
              <li>
                <Link href="/#product-cloud" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Cloud Platform
                </Link>
              </li>
              <li>
                <Link href="/#product-ast" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Taint Graph Engine
                </Link>
              </li>
              <li>
                <Link href="#rules" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Rules as Code
                </Link>
              </li>
              <li>
                <Link href="#changelog" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Changelog (v2.4.0)
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-wider uppercase">
              Solutions
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#solutions-leaders" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Security Leaders
                </Link>
              </li>
              <li>
                <Link href="#solutions-product-sec" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Product Security
                </Link>
              </li>
              <li>
                <Link href="#solutions-engineering" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Software Engineering
                </Link>
              </li>
              <li>
                <Link href="#enterprise" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Enterprise On-Prem
                </Link>
              </li>
              <li>
                <Link href="#compliance" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Compliance Automation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-wider uppercase">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#about" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#news" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  News & Press
                </Link>
              </li>
              <li>
                <Link href="#manifesto" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Security Manifesto
                </Link>
              </li>
              <li>
                <Link href="#careers" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Careers <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">HIRING</span>
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-[#1e2330] flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Sentinel Security Inc. All rights reserved.</p>
          <div className="flex items-center space-x-6 text-xs">
            <Link href="#privacy" className="hover:text-slate-800 dark:hover:text-slate-200 transition">
              Privacy Policy
            </Link>
            <Link href="#terms" className="hover:text-slate-800 dark:hover:text-slate-200 transition">
              Terms of Service
            </Link>
            <Link href="#security" className="hover:text-slate-800 dark:hover:text-slate-200 transition">
              Security Trust Center
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
