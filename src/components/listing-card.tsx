import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";

type Props = { id: string; title: string; priceMinor: number; currency: string; condition?: string; image?: string; publishedAt?: string | null; sold?: boolean };

/** Photo first. No box, no shadow: the photo, a swing-tag price, and two lines of text. */
export function ListingCard({ id, title, priceMinor, currency, condition, image, publishedAt, sold }: Props) {
  const cond = condition ? CONDITION_LABEL[condition as (typeof CONDITIONS)[number]] ?? condition : null;
  return (
    <Link href={`/listing/${id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-md)] bg-sunken">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" className={`size-full object-cover ${sold ? "opacity-60" : ""}`} />
        ) : <span className="t-label absolute inset-0 grid place-items-center">No photo</span>}
        <span className="pricetag absolute bottom-3 left-2">{formatMoney(priceMinor, currency)}</span>
        {sold && <span className="tag tag-amber absolute right-2.5 top-2.5">Sold</span>}
      </div>
      <p className="mt-2.5 line-clamp-2 text-[0.9375rem] font-semibold leading-snug group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{title}</p>
      {(cond || publishedAt) && (
        <p className="t-meta mt-1 flex justify-between gap-3 text-[0.8125rem]">
          <span>{cond}</span>{publishedAt && <span>{timeAgo(publishedAt)}</span>}
        </p>)}
    </Link>
  );
}
