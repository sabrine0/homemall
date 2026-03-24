import { redirect } from "next/navigation";

export default function LegacyLoginPage({
  searchParams,
}: {
  searchParams: {
    returnTo?: string;
  };
}) {
  const suffix = searchParams.returnTo
    ? `?returnTo=${encodeURIComponent(searchParams.returnTo)}`
    : "";
  redirect(`/login${suffix}`);
}
