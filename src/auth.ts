/**
 * =============================================================================
 * Sentinel SAST Platform — Centralized Authentication Engine (Auth.js v5)
 * =============================================================================
 *
 * This module configures and exports Auth.js (NextAuth v5 beta) for the Sentinel
 * App Router architecture. It integrates:
 *
 * 1. PrismaAdapter: Connects directly to the PostgreSQL database for user,
 *    account, and session persistence.
 * 2. GitHub OAuth Provider: Automatically infers `AUTH_GITHUB_ID` and
 *    `AUTH_GITHUB_SECRET` from environment variables without hardcoded fallbacks.
 *    GitHub Developer Portal Callback URL:
 *    http://localhost:3000/api/auth/callback/github
 * 3. Sentinel SAST Automated API Key Provisioning:
 *    Listens on the `signIn` event and `jwt` callback for successful GitHub
 *    authorization handshakes. Automatically provisions a cryptographically secure,
 *    unique Sentinel API key prefixed with "snt_live_" for first-time users,
 *    permanently linking it to the authenticated GitHub identity.
 * 4. Core Exports:
 *    - handlers: NextAuth HTTP handlers { GET, POST } for the API route.
 *    - auth: Server-side session verification helper (Server Components, Route Handlers).
 *    - signIn: Server Action for initiating OAuth redirects.
 *    - signOut: Server Action for terminating sessions.
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key";

/**
 * Sentinel SAST Authentication Configuration
 */
export const authConfig: NextAuthConfig = {
  // Explicitly lock the Auth.js base path to prevent OAuth callback 404s
  basePath: "/api/auth",
  trustHost: true,

  // Database adapter linking NextAuth entities to Prisma schema models
  adapter: PrismaAdapter(prisma),

  // Use JWT session strategy for optimal performance with Server Actions
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Authentication Providers
  providers: [
    /**
     * GitHub OAuth Provider
     *
     * Auth.js v5 automatically infers:
     * - Client ID:     process.env.AUTH_GITHUB_ID (with fallback: process.env.GITHUB_CLIENT_ID)
     * - Client Secret: process.env.AUTH_GITHUB_SECRET (with fallback: process.env.GITHUB_CLIENT_SECRET)
     *
     * In the GitHub Developer Settings, configure:
     * Authorization callback URL: http://localhost:3000/api/auth/callback/github
     */
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET,
    }),

    /**
     * Sentinel Developer Credentials Provider (for instant demo sandbox access)
     */
    Credentials({
      id: "credentials",
      name: "Sentinel Developer",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const rawEmail =
          typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const email = rawEmail || "alex.chen@sentinel.sec";
        const fallbackName = email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const name =
          (typeof credentials?.name === "string" && credentials.name.trim()) ||
          fallbackName ||
          "Staff Security Engineer";

        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name,
              image:
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
            },
          });
        }

        // Auto-provision a Sentinel API key if developer demo user doesn't have one
        const existingKey = await prisma.apiKey.findFirst({
          where: { userId: user.id },
        });

        if (!existingKey) {
          const { rawKey, prefix } = generateApiKey();
          await prisma.apiKey.create({
            data: {
              key: rawKey,
              prefix,
              userId: user.id,
              label: "Default API Key",
            },
          });
          console.log(
            `[Sentinel] Auto-provisioned API key for demo user ${user.id} (prefix: ${prefix})`
          );
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],

  // Event Handlers
  events: {
    /**
     * Listen for successful sign-in events (including GitHub OAuth handshake).
     * Automatically verifies and provisions a unique Sentinel API key with the
     * "snt_live_" prefix for first-time users upon completing the OAuth flow.
     */
    async signIn({ user, account, profile }) {
      if (!user?.id) return;

      try {
        // 1. Check if user already possesses an active or historical Sentinel API key
        const existingKey = await prisma.apiKey.findFirst({
          where: { userId: user.id },
        });

        // 2. If first-time user login without an API key, generate & inject key into PostgreSQL
        if (!existingKey) {
          const { rawKey, prefix } = generateApiKey();
          await prisma.apiKey.create({
            data: {
              key: rawKey,
              prefix,
              userId: user.id,
              label: "Default API Key (GitHub OAuth)",
            },
          });
          console.log(
            `[Sentinel DevSecOps] Automatically provisioned live Sentinel API key for user ${user.id}: ${prefix}...`
          );
        }

        // 3. Persist and link the GitHub User ID to the User model if available
        if (account?.provider === "github") {
          const githubId = profile && "id" in profile && profile.id
            ? String(profile.id)
            : account.providerAccountId;

          if (githubId) {
            await prisma.user.update({
              where: { id: user.id },
              data: { githubId },
            }).catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              console.warn(
                `[Sentinel Auth] Notice syncing GitHub ID for user ${user.id}:`,
                msg
              );
            });
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[Sentinel Auth] Failed to provision API key or sync GitHub profile for user ${user.id}:`,
          errorMsg
        );
      }
    },
  },

  // Auth Lifecycle Callbacks
  callbacks: {
    /**
     * Called whenever a user signs in. Guarantees that even if events are asynchronous,
     * the user record has an active Sentinel API key and profile fields synced.
     */
    async signIn({ user, account, profile }) {
      if (!user?.id) return true;

      try {
        // Ensure Sentinel API key is provisioned (idempotent check)
        const existingKey = await prisma.apiKey.findFirst({
          where: { userId: user.id },
        });

        if (!existingKey) {
          const { rawKey, prefix } = generateApiKey();
          await prisma.apiKey.create({
            data: {
              key: rawKey,
              prefix,
              userId: user.id,
              label: "Default API Key (GitHub OAuth)",
            },
          });
          console.log(
            `[Sentinel Callback] Provisioned new Sentinel API key for user ${user.id}: ${prefix}...`
          );
        }

        // Link GitHub ID if signing in via GitHub OAuth
        if (account?.provider === "github") {
          const githubId = profile && "id" in profile && profile.id
            ? String(profile.id)
            : account.providerAccountId;

          if (githubId) {
            const currentUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { githubId: true },
            });

            if (!currentUser?.githubId) {
              await prisma.user.update({
                where: { id: user.id },
                data: { githubId },
              }).catch(() => {});
            }
          }
        }
      } catch (error: unknown) {
        console.error("[Sentinel Callback signIn error]:", error);
      }

      return true;
    },

    /**
     * JWT Callback: Persists user ID and metadata into the JSON Web Token.
     */
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "github" && (profile?.id || account.providerAccountId)) {
        token.githubId = String(profile?.id ?? account.providerAccountId);
      }
      return token;
    },

    /**
     * Session Callback: Exposes the user ID and custom claims onto the active session.
     */
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        if (token.githubId) {
          session.user.githubId = token.githubId as string;
        }
      }
      return session;
    },
  },
};

/**
 * Instantiate and export NextAuth core primitives
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export default auth;
