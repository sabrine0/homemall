import { redirect } from "next/navigation";

export default function LegacyZoneDetailsPage({
  params,
}: {
  params: {
    zoneId: string;
  };
}) {
  redirect(`/zones/${params.zoneId}`);
}
