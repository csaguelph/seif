import Link from "next/link";

export function ApplySuccess() {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
      <h2 className="text-xl font-semibold text-green-900">
        Application submitted
      </h2>
      <p className="mt-2 text-green-800">
        Thank you. Your SEIF application has been received. You will be contacted regarding next steps.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
      >
        Return home
      </Link>
    </div>
  );
}
