"use client";
import { usePathname } from "next/navigation";

/** Two panes on desktop; on phones, inbox and conversation are separate screens. */
export function MessagesShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const onThread = usePathname() !== "/messages";
  return (
    <div className="md:grid md:grid-cols-[22rem_1fr] md:gap-10">
      <aside className={`md:border-r md:border-line md:pr-6 ${onThread ? "hidden md:block" : ""}`}>{list}</aside>
      <section className={onThread ? "" : "hidden md:block"}>{children}</section>
    </div>
  );
}
