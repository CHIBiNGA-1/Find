export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <div className="flex flex-col justify-center">{children}</div>
      <aside aria-hidden="true" className="blk-sage hidden items-end justify-center overflow-hidden px-10 pt-16 md:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="arch aspect-[3/4] w-full max-w-[24rem]"><img src="/hero.jpg" alt="" className="size-full object-cover" /></div>
      </aside>
    </div>
  );
}
