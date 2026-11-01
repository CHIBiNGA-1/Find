import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { Icon } from "@/components/icons";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";

type Props = { id: string; title: string; priceMinor: number; currency: string; condition?: string; image?: string; publishedAt?: string | null; sold?: boolean };

export function ListingCard({ id, title, priceMinor, currency, condition, image, publishedAt, sold }: Props) {
  return (
    <Link href={`/listing/${id}`} className="card card-link group block overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-mint)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-[500ms] ease-[var(--ease)] group-hover:scale-[1.03]" />
        ) : <span className="t-label absolute inset-0 grid place-items-center">No photo</span>}
        {sold && <span className="tag tag-amber absolute left-2.5 top-2.5">Sold</span>}
      </div>
      <div className="p-3.5">
        <p className="line-clamp-1 text-[0.9375rem] font-medium">{title}</p>
        <p className="price mt-1 text-[1.0625rem] font-semibold text-brand">{formatMoney(priceMinor, currency)}</p>
        {(publishedAt || condition) && (
          <p className="t-meta mt-2 flex items-center gap-1.5 text-[0.8125rem]">
            {publishedAt && <><Icon name="clock" size={13} />{timeAgo(publishedAt)}</>}
            {publishedAt && condition && <span aria-hidden="true">·</span>}
            {condition && <span>{CONDITION_LABEL[condition as (typeof CONDITIONS)[number]] ?? condition}</span>}
          </p>)}
      </div>
    </Link>
  );
}
