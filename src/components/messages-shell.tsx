"use client";
import { usePathname } from "next/navigation";

/** Two panes on desktop; on phones the inbox and a conversation are separate screens. */
export function MessagesShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const onThread = usePathname() !== "/messages";
  return (
    <div className="md:grid md:grid-cols-[21rem_1fr] md:gap-10">
      <aside className={`md:sticky md:top-8 md:max-h-[calc(100dvh-4rem)] md:self-start md:overflow-y-auto md:border-r md:border-line md:pr-6 ${onThread ? "hidden md:block" : ""}`}>{list}</aside>
      <section className={onThread ? "" : "hidden md:block"}>{children}</section>
    </div>
  );
}
