import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { CONDITION_LABEL, type CONDITIONS } from "@/lib/listings/schema";

type Props = { id: string; title: string; priceMinor: number; currency: string; condition?: string; image?: string; publishedAt?: string | null; status?: string; priority?: boolean };

/** Photo first. No box: the photo, a swing-tag price, a title, and one quiet meta line. */
export function ListingCard({ id, title, priceMinor, currency, condition, image, publishedAt, status, priority }: Props) {
  const cond = condition ? CONDITION_LABEL[condition as (typeof CONDITIONS)[number]] ?? condition : null;
  const gone = status && status !== "active";
  return (
    <Link href={`/listing/${id}`} className="group block">
      <div className="photo">
        {image
           
          ? <img src={image} alt="" loading={priority ? "eager" : "lazy"} decoding="async" className={`size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${gone ? "opacity-55" : ""}`} />
          : <span className="t-meta absolute inset-0 grid place-items-center">No photo</span>}
        <span className="pricetag absolute bottom-3 left-2">{formatMoney(priceMinor, currency)}</span>
        {gone && <span className="tag tag-ink absolute right-2.5 top-2.5 capitalize">{status}</span>}
      </div>
      <p className="mt-2.5 line-clamp-2 text-[0.9375rem] font-semibold leading-snug">{title}</p>
      {(cond || publishedAt) && <p className="t-meta mt-0.5 flex gap-x-2 text-[0.8125rem]">{cond && <span>{cond}</span>}{cond && publishedAt && <span aria-hidden="true">·</span>}{publishedAt && <span>{timeAgo(publishedAt)}</span>}</p>}
    </Link>
  );
}
