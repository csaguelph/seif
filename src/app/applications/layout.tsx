import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

export default async function ApplicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  return children;
}
