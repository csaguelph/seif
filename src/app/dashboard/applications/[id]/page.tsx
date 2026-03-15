import { notFound, redirect } from "next/navigation";

import { ApplicationDetailView } from "~/components/seif/application-detail-view";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export const metadata = {
  title: "Application Details",
  description: "Review your submitted SEIF application.",
};

export default async function DashboardApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const { id } = await params;
  const application = await api.application.getMineById({ id }).catch(() => null);
  if (!application) {
    notFound();
  }

  return (
    <ApplicationDetailView
      application={application}
      backHref="/dashboard"
      backLabel="← Back to my applications"
      showActionRoadmap
    />
  );
}
