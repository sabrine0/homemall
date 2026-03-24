import { redirect } from "next/navigation";
import { MessagesWorkspace } from "@/components/messages/messages-workspace";
import { getServerSessionState } from "@/lib/server-session";

export default function MessagesPage({
  searchParams,
}: {
  searchParams?: { conversationId?: string };
}) {
  const { isAuthenticated } = getServerSessionState();
  if (!isAuthenticated) {
    redirect("/login?returnTo=/messages");
  }

  return (
    <MessagesWorkspace initialConversationId={searchParams?.conversationId} />
  );
}
