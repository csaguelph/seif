"use client";

import { ChevronDown, LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { authClient } from "~/server/better-auth/client";
import type { AuthSession } from "~/lib/auth-types";

interface UserDropdownProps {
  session: AuthSession | null;
}

export function UserDropdown({ session }: UserDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignIn = () => {
    void authClient.signIn.social({
      provider: "microsoft",
      callbackURL: "/",
    });
  };

  const handleSignOut = () => {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setOpen(false);
          router.refresh();
        },
      },
    });
  };

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </button>
    );
  }

  const { name, email, image } = session.user;
  const role = (session.user as { role?: string }).role ?? "USER";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {image ? (
          <img
            src={image}
            alt=""
            className="h-8 w-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-medium">
            {(name ?? email ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate sm:block">
          {name ?? email}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <div className="border-gray-100 border-b px-3 py-2">
            <p className="truncate text-sm font-medium text-gray-900">
              {name ?? "User"}
            </p>
            <p className="truncate text-xs text-gray-500">{email}</p>
            <p className="mt-0.5 text-xs text-gray-400">Role: {role}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
