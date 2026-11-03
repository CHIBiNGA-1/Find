export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-[1fr_1fr]">
      <div className="flex flex-col justify-center">{children}</div>
      <aside aria-hidden="true" className="relative hidden bg-brand md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        <span className="pricetag !h-11 absolute bottom-10 left-0">Verified students only</span>
      </aside>
    </div>
  );
}
