import { redirect } from "next/navigation";

export default function LegacySignupPage({
  searchParams,
}: {
  searchParams: {
    returnTo?: string;
  };
}) {
  const suffix = searchParams.returnTo
    ? `?returnTo=${encodeURIComponent(searchParams.returnTo)}`
    : "";
  redirect(`/signup${suffix}`);
}
