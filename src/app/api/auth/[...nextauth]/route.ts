/**
 * =============================================================================
 * Sentinel SAST Dynamic Route Handler for Auth.js (NextAuth v5)
 * =============================================================================
 *
 * Route: /api/auth/[...nextauth]
 *
 * This catch-all route handler acts as the core engine for the entire authentication
 * lifecycle in Next.js App Router. It strictly imports the `handlers` object
 * from the centralized `auth.ts` configuration and exports the destructured
 * HTTP GET and POST methods.
 *
 * Supported Actions & Endpoints:
 * - GET/POST /api/auth/signin/:provider  Initiates provider authorization
 * - GET/POST /api/auth/callback/github   Processes GitHub OAuth authorization callback
 * - GET      /api/auth/session           Returns current authenticated session JSON
 * - GET      /api/auth/csrf              Provides anti-CSRF token
 * - GET/POST /api/auth/signout           Terminates active session and invalidates cookies
 *
 * GitHub Developer Portal Configuration:
 * - Homepage URL:             http://localhost:3000
 * - Authorization callback URL: http://localhost:3000/api/auth/callback/github
 *   (Strictly without any trailing slash)
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
