import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Top Navigation */}
      <nav className="border-b border-green-900/50 bg-black/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-green-400 font-bold text-lg tracking-wider">
                SENTINEL<span className="text-green-600">_</span>
              </Link>
              <div className="hidden md:flex space-x-1">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-sm text-green-400/70 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors"
                >
                  [dashboard]
                </Link>
                <Link
                  href="/dashboard/projects"
                  className="px-3 py-2 text-sm text-green-400/70 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors"
                >
                  [projects]
                </Link>
                <Link
                  href="/dashboard/scans"
                  className="px-3 py-2 text-sm text-green-400/70 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors"
                >
                  [scans]
                </Link>
                <Link
                  href="/dashboard/vulnerabilities"
                  className="px-3 py-2 text-sm text-green-400/70 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors"
                >
                  [vulnerabilities]
                </Link>
                <Link
                  href="/dashboard/enterprise"
                  className="px-3 py-2 text-sm text-green-400/70 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors"
                >
                  [enterprise]
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-green-600">system::online</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
