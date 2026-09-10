/**
 * =============================================================================
 * Sentinel SAST — Pure React Server Component: "Sign In with GitHub" Button
 * =============================================================================
 *
 * DevSecOps Architectural Design:
 * This component intentionally avoids the 'use client' directive and traditional
 * client-side 'onClick' event listeners. In Next.js App Router and Auth.js v5,
 * triggering OAuth flows via client-side event handlers frequently results in
 * silent routing failures due to unhandled promise rejections, hydration mismatches,
 * and popup or cookie-synchronization blockers.
 *
 * By utilizing a pure React Server Component (RSC) containing a native HTML <form>
 * paired with an inline asynchronous Server Action ('use server'), the OAuth handshake
 * is executed directly on the Node.js server runtime. When 'await signIn("github")'
 * completes, NextAuth sets the secure PKCE and anti-CSRF state cookies directly
 * on the HTTP response headers and issues a deterministic HTTP 303/307 redirect
 * to the GitHub authorization endpoint.
 */

import { signIn } from "@/auth";

interface GitHubSignInButtonProps {
  className?: string;
  buttonText?: string;
  fullWidth?: boolean;
}

export default async function GitHubSignInButton({
  className,
  buttonText = "Sign In with GitHub",
  fullWidth = true,
}: GitHubSignInButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/" });
      }}
      className={fullWidth ? "w-full" : "inline-block"}
    >
      <button
        type="submit"
        className={
          className ||
          "w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition shadow-sm active:scale-[0.99] cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
        }
      >
        {/* GitHub Monochromatic SVG Icon */}
        <svg
          className="w-4 h-4 fill-current text-slate-900 shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span className="font-semibold text-slate-800">{buttonText}</span>
      </button>
    </form>
  );
}

export { GitHubSignInButton };
