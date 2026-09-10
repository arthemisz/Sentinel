"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Terminal,
  Cloud,
  Code2,
  ChevronDown,
  Briefcase,
  Users,
  Newspaper,
  ArrowRight,
  Menu,
  X,
  FileCheck2,
  Cpu,
  ShieldAlert,
  Key,
  Copy,
  Check,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";

interface NavbarProps {
  onOpenDemo?: () => void;
  onOpenSignIn?: () => void;
}

export default function Navbar({ onOpenDemo, onOpenSignIn }: NavbarProps) {
  const { data: session } = useSession();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [rawApiKey, setRawApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    let active = true;

    fetch("/api/user/key")
      .then((r) => r.json())
      .then((d) => {
        if (!active || !d?.apiKey) return;
        if (d.apiKey.key) {
          setRawApiKey(d.apiKey.key);
        }
        if (d.apiKey.prefix) {
          setApiKey(d.apiKey.prefix + "••••••••••••••••");
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [session]);

  const activeApiKey = session?.user ? apiKey : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyKey = () => {
    const keyToCopy = rawApiKey || activeApiKey;
    if (keyToCopy) {
      navigator.clipboard.writeText(keyToCopy);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Detect scroll to enhance glassmorphism shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = (name: string) => {
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  return (
    <header
      ref={navRef}
      className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-slate-200/90 shadow-sm"
          : "bg-white/80 backdrop-blur-md border-slate-200/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Sentinel Logo paired with Shield Icon */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:bg-slate-800 transition-colors">
              <Shield className="w-5 h-5 text-emerald-400 fill-emerald-400/20 transition-transform group-hover:scale-105" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 font-sans">
                Sentinel
              </span>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                SAST
              </span>
            </div>
          </Link>

          {/* Center: Desktop Navigation with Framer Motion Dropdowns */}
          <nav className="hidden md:flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
            {/* Product Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("product")}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "product" ? null : "product")
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeDropdown === "product"
                    ? "text-slate-900 bg-slate-100/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Product</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    activeDropdown === "product" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {activeDropdown === "product" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1 w-[460px] bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 z-50"
                  >
                    <div className="grid grid-cols-1 gap-1.5">
                      <Link
                        href="/#product-cli"
                        onClick={(e) => {
                          setActiveDropdown(null);
                          const el = document.getElementById("product-cli");
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: "smooth" });
                            window.dispatchEvent(new CustomEvent("sentinel-run-cli"));
                          }
                        }}
                        className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60 cursor-pointer"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-900 flex items-center gap-2">
                            <span>Sentinel API CLI</span>
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                              Sub-second
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Ultra-fast terminal scanner & pre-commit hooks. Scan millions of lines in milliseconds.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="#product-cloud"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <Cloud className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <span>Cloud Platform</span>
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                              Enterprise
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Centralized security policy management, compliance reporting, and repo orchestration.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="#product-ast"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <span>Deep Taint Graph Engine</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Interprocedural data flow tracking from untrusted sources to critical sinks.
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="mt-2 pt-2.5 border-t border-slate-100 px-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-[11px]">v2.4.0 Live • 35+ Languages</span>
                      <Link
                        href="#vulnerability-explorer"
                        onClick={() => setActiveDropdown(null)}
                        className="text-slate-900 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Explore Interactive Rules <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("solutions")}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "solutions" ? null : "solutions")
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeDropdown === "solutions"
                    ? "text-slate-900 bg-slate-100/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Solutions</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    activeDropdown === "solutions" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {activeDropdown === "solutions" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1 w-[440px] bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 z-50"
                  >
                    <div className="grid grid-cols-1 gap-1.5">
                      <Link
                        href="#solutions-leaders"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Security Leaders
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Executive visibility, SOC 2 & ISO 27001 audit posture, and verifiable risk reduction.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="#solutions-product-sec"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Product Security
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Zero false alarms. AI verification ensures AppSec teams only triage genuinely exploitable bugs.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="#solutions-engineering"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <Code2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            Software Engineering
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Frictionless PR checks. Inline code suggestions that developers actually want to merge.
                          </p>
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Static Link for Events */}
            <Link
              href="#events"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Events
            </Link>

            {/* Company Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("company")}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "company" ? null : "company")
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeDropdown === "company"
                    ? "text-slate-900 bg-slate-100/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>Company</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    activeDropdown === "company" ? "rotate-180 text-slate-900" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {activeDropdown === "company" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1 w-[320px] bg-white rounded-xl shadow-xl border border-slate-200/90 p-3 z-50"
                  >
                    <div className="grid grid-cols-1 gap-1">
                      <Link
                        href="#about"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">About Us</div>
                          <div className="text-xs text-slate-500">Our mission & engineering team</div>
                        </div>
                      </Link>

                      <Link
                        href="#news"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition">
                          <Newspaper className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">News & Press</div>
                          <div className="text-xs text-slate-500">Announcements & research papers</div>
                        </div>
                      </Link>

                      <Link
                        href="#manifesto"
                        onClick={() => setActiveDropdown(null)}
                        className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                      >
                        <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Security Manifesto</div>
                          <div className="text-xs text-slate-500">Zero telemetry code confidentiality</div>
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        {/* Right: Clean, Minimal Call-to-Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {session?.user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition shadow-sm"
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-6 h-6 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    {(session.user.name?.[0] || session.user.email?.[0] || "U").toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate text-xs font-semibold">
                  {session.user.name || session.user.email?.split("@")[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-3 px-4 z-50 space-y-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {session.user.name || "Developer"}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {session.user.email}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          Sentinel API Key
                        </span>
                        <div className="flex items-center gap-2">
                          {rawApiKey && (
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                              title={showKey ? "Hide key" : "Show key"}
                            >
                              {showKey ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleCopyKey}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                          >
                            {copiedKey ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Key</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 truncate bg-white px-2 py-1 rounded border border-slate-200 select-all">
                        {showKey && rawApiKey ? rawApiKey : (activeApiKey || "snt_live_••••••••••••••••")}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Use with <code className="font-mono text-slate-600">sentinel login</code>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition active:scale-95 border border-slate-800"
          >
            Book a Demo
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4"
          >
            <div className="space-y-1">
              <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider px-3 py-1">
                Product
              </div>
              <Link
                href="/#product-cli"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  const el = document.getElementById("product-cli");
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: "smooth" });
                    window.dispatchEvent(new CustomEvent("sentinel-run-cli"));
                  }
                }}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Sentinel API CLI
              </Link>
              <Link
                href="#product-cloud"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cloud Platform
              </Link>
              <Link
                href="#product-ast"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Deep Taint Graph Engine
              </Link>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider px-3 py-1">
                Solutions
              </div>
              <Link
                href="#solutions-leaders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Security Leaders
              </Link>
              <Link
                href="#solutions-product-sec"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Product Security
              </Link>
              <Link
                href="#solutions-engineering"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Software Engineering
              </Link>
            </div>

            <div className="space-y-1">
              <Link
                href="#events"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Events
              </Link>
              <Link
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                About Us & Press
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              {session?.user ? (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    {session.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                        {(session.user.name?.[0] || session.user.email?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {session.user.name || "Developer"}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {session.user.email}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] text-slate-600 truncate max-w-[150px] select-all">
                      {showKey && rawApiKey ? rawApiKey : (activeApiKey || "snt_live_••••••••")}
                    </span>
                    <div className="flex items-center gap-2">
                      {rawApiKey && (
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="text-slate-400 hover:text-slate-600"
                          title={showKey ? "Hide key" : "Show key"}
                        >
                          {showKey ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedKey ? "Copied" : "Copy Key"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full mt-1 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition text-center"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSignIn?.();
                  }}
                  className="w-full py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sign In
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDemo?.();
                }}
                className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                Book a Demo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
