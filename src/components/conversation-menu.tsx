"use client";
import { ReportDialog } from "@/components/report-dialog";
import { blockUser, unblockUser } from "@/app/(app)/messages/actions";
import { Icon } from "@/components/icons";

/** Report and block live behind one quiet menu so the conversation stays the focus. */
export function ConversationMenu({ otherId, conversationId, lastOtherMessageId, blocked }: { otherId: string; conversationId: string; lastOtherMessageId?: string; blocked: boolean }) {
  return (
    <details className="relative">
      <summary aria-label="Conversation options" className="grid size-11 cursor-pointer list-none place-items-center rounded-full hover:bg-sunken [&::-webkit-details-marker]:hidden"><Icon name="more" size={22} /></summary>
      <div className="absolute right-0 z-10 mt-1 w-60 space-y-1 rounded-[var(--radius-md)] border border-line bg-white p-3 shadow-lg">
        {lastOtherMessageId && <ReportDialog type="message" targetId={lastOtherMessageId} label="Report last message" />}
        <ReportDialog type="user" targetId={otherId} label="Report this person" />
        <form action={(blocked ? unblockUser : blockUser).bind(null, otherId, conversationId)}>
          <button className="link-quiet">{blocked ? "Unblock this person" : "Block this person"}</button></form>
      </div>
    </details>
  );
}
