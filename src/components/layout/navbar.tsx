import Link from "next/link";

import { IconAsterisk } from "~/components/ui/icon-asterisk";
import { UserDropdown } from "~/components/auth/user-dropdown";
import { getSession } from "~/server/better-auth/server";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="border-gray-200 border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <IconAsterisk />
          <span className="text-xl font-semibold text-gray-900">SEIF</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/apply"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Apply
          </Link>
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Admin
            </Link>
          )}
          <UserDropdown session={session} />
        </nav>
      </div>
    </header>
  );
}
