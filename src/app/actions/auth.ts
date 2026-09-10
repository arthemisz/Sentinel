"use server";

/**
 * =============================================================================
 * Sentinel SAST — Server Actions for Authentication
 * =============================================================================
 */

import { signIn, signOut } from "@/auth";

/**
 * Initiates GitHub OAuth authentication handshake via server-side redirect.
 */
export async function signInWithGitHubAction() {
  await signIn("github", { redirectTo: "/" });
}

/**
 * Terminates active user session and invalidates session cookies.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
