export default function Loading() {
  return (
    <div aria-busy="true"><p role="status" className="sr-only">Loading conversation</p>
      <div className="skel h-9 w-1/2" />
      <div className="mt-8 space-y-3">
        <div className="skel h-12 w-2/3" /><div className="skel ml-auto h-12 w-1/2" /><div className="skel h-12 w-3/5" /><div className="skel ml-auto h-12 w-2/5" /></div></div>
  );
}
