/**
 * =============================================================================
 * Sentinel SAST — Main Landing Canvas (React Server Component)
 * =============================================================================
 *
 * Conforms to Next.js App Router RSC paradigms. Passes the pure React Server
 * Component `GitHubSignInButton` into the interactive client layout.
 */

import React from "react";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import HomeClientWrapper from "@/components/HomeClientWrapper";

export default function Home() {
  return (
    <HomeClientWrapper
      gitHubSignInSlot={<GitHubSignInButton buttonText="Continue with GitHub" />}
    />
  );
}
