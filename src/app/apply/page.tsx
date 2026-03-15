import { ApplicationForm } from "~/components/seif/application-form";
import { ApplySuccess } from "~/components/seif/apply-success";

export const metadata = {
  title: "Apply for SEIF Funding",
  description: "Student Events and Initiatives Fund application",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {submitted === "1" ? (
        <ApplySuccess />
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-gray-900">
            SEIF Application
          </h1>
          <p className="mt-1 text-gray-600">
            Student Events and Initiatives Funding — request financial support for your event or initiative.
          </p>
          <ApplicationForm />
        </>
      )}
    </div>
  );
}
