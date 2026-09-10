"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { signInWithGitHubAction } from "@/app/actions/auth";
import {
  X,
  Shield,
  Sparkles,
  ArrowRight,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  gitHubSignInSlot?: React.ReactNode;
}

export default function SignInModal({
  isOpen,
  onClose,
  gitHubSignInSlot,
}: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDemoSignIn = async () => {
    try {
      setLoadingProvider("demo");
      setErrorMessage(null);
      const res = await signIn("credentials", {
        email: "alex.chen@sentinel.sec",
        name: "Alex Chen",
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage("Authentication failed. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCustomEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoadingProvider("email");
      setErrorMessage(null);
      const res = await signIn("credentials", {
        email: email.trim(),
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage("Sign-in failed. Please check your email.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setEmail("");
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10"
          >
            {/* Header / Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Brand & Title */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-md mx-auto">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Sign in to Sentinel Cloud
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Authenticate to provision your Sentinel Cloud API key and access AST telemetry.
                </p>
              </div>

              {/* Status alerts */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Authenticated successfully! Redirecting...</span>
                </div>
              )}

              {!success && (
                <div className="space-y-4">
                  {/* Primary One-Click Demo Developer Sign In */}
                  <button
                    type="button"
                    onClick={handleDemoSignIn}
                    disabled={!!loadingProvider}
                    className="w-full relative group flex items-center justify-between p-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800 text-amber-400 group-hover:bg-slate-700 transition">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          Instant Demo Sign In
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            1-Click
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Sign in as Alex Chen (Security Staff)
                        </div>
                      </div>
                    </div>
                    {loadingProvider === "demo" ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                    )}
                  </button>

                  {/* GitHub OAuth Button via Server Component Slot or Native Server Action Form */}
                  {gitHubSignInSlot ? (
                    gitHubSignInSlot
                  ) : (
                    <form action={signInWithGitHubAction} className="w-full">
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition active:scale-[0.99] disabled:opacity-70 shadow-sm cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-current text-slate-900" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>Continue with GitHub</span>
                      </button>
                    </form>
                  )}

                  <div className="relative flex items-center justify-center py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative bg-white px-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      or developer email
                    </span>
                  </div>

                  {/* Direct Email Form */}
                  <form onSubmit={handleCustomEmailSignIn} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dev@yourcompany.com"
                        required
                        className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={!email || !!loadingProvider}
                        className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {loadingProvider === "email" ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                        ) : (
                          "Sign In"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Terminal Tip */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Auto-provisions a secure API key for CLI scans.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
