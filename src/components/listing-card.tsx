import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";

type Props = { id: string; title: string; priceMinor: number; currency: string; condition: string; image?: string; sold?: boolean };

export function ListingCard({ id, title, priceMinor, currency, condition, image, sold }: Props) {
  return (
    <Link href={`/listing/${id}`} className="group block rounded-[var(--radius-md)] border border-line bg-surface">
      <div className="aspect-[4/3] overflow-hidden rounded-t-[var(--radius-md)] bg-bg">
        {image && /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image} alt="" loading="lazy" decoding="async" className="size-full object-cover" />}
      </div>
      <div className="p-3">
        <p className="price text-lg font-semibold">{formatMoney(priceMinor, currency)}{sold && <span className="ml-2 text-sm font-medium text-muted">Sold</span>}</p>
        <p className="line-clamp-2 text-sm">{title}</p>
        <p className="mt-1 text-xs text-muted">{CONDITION_LABEL[condition as (typeof CONDITIONS)[number]] ?? condition}</p>
      </div>
    </Link>
  );
}
