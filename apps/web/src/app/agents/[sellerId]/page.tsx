import { notFound } from "next/navigation";
import type { SellerProfileResponse } from "@homemall/shared";
import { AgentProfileWorkspace } from "@/components/agents/agent-profile-workspace";
import { getServerSessionState } from "@/lib/server-session";
import { serverApi } from "@/lib/server-api";

export default async function AgentProfilePage({
  params,
}: {
  params: {
    sellerId: string;
  };
}) {
  const { isAuthenticated } = getServerSessionState();

  try {
    const { seller } = await serverApi<SellerProfileResponse>(
      `/api/sellers/${params.sellerId}`,
    );
    return (
      <AgentProfileWorkspace
        seller={seller}
        isAuthenticated={isAuthenticated}
      />
    );
  } catch {
    notFound();
  }
}
