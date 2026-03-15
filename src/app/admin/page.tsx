import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-gray-900">SEIF Admin</h1>
      <p className="mt-1 text-gray-600">View and manage funding applications.</p>
      <nav className="mt-4 flex gap-4">
        <Link
          href="/admin"
          className="font-medium text-indigo-600 hover:text-indigo-900"
        >
          Applications
        </Link>
        <Link
          href="/admin/reports"
          className="font-medium text-gray-600 hover:text-indigo-900"
        >
          Reports
        </Link>
      </nav>
      <ApplicationsTable />
    </div>
  );
}
