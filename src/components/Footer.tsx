"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Status Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 font-sans">
                Sentinel SAST
              </span>
            </Link>

            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              The high-contrast, zero-false-positive static application security testing platform.
              Engineered for velocity, verified by deterministic reasoning.
            </p>

            {/* Live Operational Status Badge */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-[11px] font-mono text-slate-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>All Systems Operational</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">99.99% Uptime</span>
              </div>
            </div>

            {/* Compliance certifications */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono text-slate-500">
              <span className="px-2 py-0.5 rounded bg-slate-200/70 border border-slate-300/80">
                SOC 2 TYPE II
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 border border-slate-300/80">
                ISO/IEC 27001
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 border border-slate-300/80">
                GDPR COMPLIANT
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#product-cli" className="hover:text-slate-900 transition">
                  Sentinel CLI
                </Link>
              </li>
              <li>
                <Link href="/#product-cloud" className="hover:text-slate-900 transition">
                  Cloud Platform
                </Link>
              </li>
              <li>
                <Link href="/#product-ast" className="hover:text-slate-900 transition">
                  Taint Graph Engine
                </Link>
              </li>
              <li>
                <Link href="#rules" className="hover:text-slate-900 transition">
                  Rules as Code
                </Link>
              </li>
              <li>
                <Link href="#changelog" className="hover:text-slate-900 transition">
                  Changelog (v2.4.0)
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase">
              Solutions
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#solutions-leaders" className="hover:text-slate-900 transition">
                  Security Leaders
                </Link>
              </li>
              <li>
                <Link href="#solutions-product-sec" className="hover:text-slate-900 transition">
                  Product Security
                </Link>
              </li>
              <li>
                <Link href="#solutions-engineering" className="hover:text-slate-900 transition">
                  Software Engineering
                </Link>
              </li>
              <li>
                <Link href="#enterprise" className="hover:text-slate-900 transition">
                  Enterprise On-Prem
                </Link>
              </li>
              <li>
                <Link href="#compliance" className="hover:text-slate-900 transition">
                  Compliance Automation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs tracking-wider uppercase">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#about" className="hover:text-slate-900 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#news" className="hover:text-slate-900 transition">
                  News & Press
                </Link>
              </li>
              <li>
                <Link href="#manifesto" className="hover:text-slate-900 transition">
                  Security Manifesto
                </Link>
              </li>
              <li>
                <Link href="#careers" className="hover:text-slate-900 transition">
                  Careers <span className="text-[10px] text-emerald-600 font-mono">HIRING</span>
                </Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-slate-900 transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} Sentinel Security Inc. All rights reserved.</p>
          <div className="flex items-center space-x-6 text-xs">
            <Link href="#privacy" className="hover:text-slate-800 transition">
              Privacy Policy
            </Link>
            <Link href="#terms" className="hover:text-slate-800 transition">
              Terms of Service
            </Link>
            <Link href="#security" className="hover:text-slate-800 transition">
              Security Trust Center
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
