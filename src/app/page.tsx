import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { UserApplicationsTable } from "~/components/seif/user-applications-table";

export const metadata = {
  title: "My Dashboard",
  description: "Track and manage your SEIF applications",
};

export default async function Home() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-7xl py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Dashboard</h1>
          <p className="mt-1 text-gray-600">
            View and track the status of your applications.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/apply"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New application
          </Link>
        </div>
      </div>
      <section aria-labelledby="applications-heading" className="mt-8">
        <h2 id="applications-heading" className="sr-only">
          Your applications
        </h2>
        <UserApplicationsTable />
      </section>
    </div>
  );
}
