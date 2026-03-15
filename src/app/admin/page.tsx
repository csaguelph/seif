import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { ApplicationsTable } from "~/components/seif/applications-table";

export const metadata = {
  title: "SEIF Admin",
  description: "Manage SEIF applications",
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">SEIF Admin</h1>
      <p className="mt-1 text-gray-600">View and manage funding applications.</p>
      <ApplicationsTable />
    </div>
  );
}
