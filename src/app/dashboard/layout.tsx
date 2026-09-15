import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0e12] text-slate-800 dark:text-slate-100 font-mono transition-colors duration-200">
      {/* Top Navigation */}
      <nav className="border-b border-slate-200 dark:border-[#1e2330] bg-white/90 dark:bg-[#151820]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base sm:text-lg tracking-wider">
                <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-emerald-500/10 border border-slate-700 dark:border-emerald-500/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-500" />
                </div>
                <span>SENTINEL<span className="text-emerald-500">_</span></span>
              </Link>
              <div className="hidden md:flex space-x-1 font-mono text-xs">
                <Link
                  href="/dashboard/enterprise"
                  className="px-3 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 font-semibold"
                >
                  [enterprise]
                </Link>
                <Link
                  href="/#deep-taint"
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2330] rounded-lg transition-colors"
                >
                  [taint_graph]
                </Link>
                <Link
                  href="/#pipeline"
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2330] rounded-lg transition-colors"
                >
                  [ast_pipeline]
                </Link>
                <Link
                  href="/#terminal"
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2330] rounded-lg transition-colors"
                >
                  [cli_terminal]
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-700 dark:text-emerald-400">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>system::online</span>
              </div>
              <ThemeToggle />
              <Link
                href="/"
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#252b3b] hover:bg-slate-100 dark:hover:bg-[#1e2330] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
