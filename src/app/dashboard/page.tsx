import { redirect } from "next/navigation";

import { UserApplicationsDashboard } from "~/components/seif/user-applications-dashboard";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export const metadata = {
  title: "My Applications",
  description: "Track the status of your SEIF applications.",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const applications = await api.application.listMine();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.55),transparent_38%),linear-gradient(135deg,#f8fafc,#ffffff)] px-6 py-8 shadow-sm sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
          User dashboard
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
          Track every SEIF application in one place.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          Review the latest status of each submission, open full application details, and prepare
          for future dashboard actions like resubmissions, reports, and document follow-ups.
        </p>
      </section>

      <UserApplicationsDashboard applications={applications} />
    </div>
  );
}
