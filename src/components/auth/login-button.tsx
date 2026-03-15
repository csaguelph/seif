"use client";

import { LogIn } from "lucide-react";
import { authClient } from "~/server/better-auth/client";

export function LoginButton() {
  const handleSignIn = () => {
    void authClient.signIn.social({
      provider: "microsoft",
      callbackURL: "/",
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
    >
      <LogIn className="h-4 w-4" />
      Sign in with Microsoft
    </button>
  );
}

