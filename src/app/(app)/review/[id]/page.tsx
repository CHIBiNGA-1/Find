import { notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { ReviewForm } from "@/components/review-form";

export const metadata = { title: "Leave a review" };

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await getContext();
  const { data: e } = await supabase.from("exchange_records").select("id, status, seller_id, buyer_id, listings(title)").eq("id", id).eq("status", "confirmed").maybeSingle();
  if (!e || ![e.seller_id, e.buyer_id].includes(userId)) notFound();
  return <main><h1 className="mb-1 t-page">Leave a review</h1>
    <p className="mb-6 text-muted">For your confirmed exchange{(e.listings as unknown as { title: string } | null)?.title ? `: ${(e.listings as unknown as { title: string }).title}` : ""}</p>
    <ReviewForm exchangeId={id} /></main>;
}
