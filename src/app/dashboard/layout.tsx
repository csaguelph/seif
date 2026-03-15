import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

/**
 * Dashboard layout: requires authentication.
 * Structure is ready for future sections (e.g. Applications, Follow-ups, Settings).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
