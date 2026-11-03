/** Shown instantly while a screen's data loads, so taps always respond. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">Loading</p>
      <div className="skel h-12 w-2/3 max-w-md" />
      <div className="skel mt-5 h-14 max-w-2xl" />
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}><div className="skel aspect-[4/5]" /><div className="skel mt-3 h-4 w-4/5" /><div className="skel mt-2 h-3 w-1/2" /></li>))}
      </ul>
    </div>
  );
}
