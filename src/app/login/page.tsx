import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { LoginButton } from "~/components/auth/login-button";

export const metadata = {
  title: "Sign in",
  description: "Sign in to access your SEIF dashboard",
};

export default async function LoginPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Sign in to SEIF</h1>
      <p className="mt-2 text-sm text-gray-600">
        Use your institutional Microsoft account to access your dashboard and
        manage your applications.
      </p>
      <div className="mt-6">
        <LoginButton />
      </div>
    </div>
  );
}

