import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";

type Props = { id: string; title: string; priceMinor: number; currency: string; condition: string; image?: string; sold?: boolean };

/** No box around the card: the photograph carries it. Price first, then title, then one quiet line. */
export function ListingCard({ id, title, priceMinor, currency, condition, image, sold }: Props) {
  return (
    <Link href={`/listing/${id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-line)] ring-1 ring-inset ring-black/5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async"
            className="size-full object-cover transition-transform duration-[400ms] ease-[var(--ease)] group-hover:scale-[1.025]" />
        ) : (
          <span className="t-label absolute inset-0 grid place-items-center">No photo</span>
        )}
        {sold && <span className="t-label absolute left-2 top-2 rounded-[var(--radius-sm)] bg-surface px-2 py-1 text-ink">Sold</span>}
      </div>
      <div className="mt-3">
        <p className="price text-[1.0625rem] font-semibold leading-none tracking-tight">{formatMoney(priceMinor, currency)}</p>
        <p className="mt-1.5 line-clamp-2 text-[0.9375rem] leading-snug group-hover:underline group-hover:decoration-[var(--color-line-strong)] group-hover:underline-offset-4">{title}</p>
        <p className="t-meta mt-1">{CONDITION_LABEL[condition as (typeof CONDITIONS)[number]] ?? condition}</p>
      </div>
    </Link>
  );
}
