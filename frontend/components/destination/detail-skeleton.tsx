/** Placeholder held by the Suspense boundary in the destination detail page. */

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export function DetailSkeleton() {
  return (
    <div className="container-page pt-5">
      <Block className="h-3 w-64 rounded-md" />

      <div className="mt-4 space-y-2">
        <Block className="h-8 w-72 rounded-md" />
        <Block className="h-4 w-56 rounded-md" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        <Block className="aspect-[4/3] sm:aspect-[3/2] lg:col-span-2 lg:row-span-2 lg:aspect-auto" />
        {Array.from({ length: 4 }, (_, i) => (
          <Block
            key={i}
            className={`aspect-[3/2] ${i > 1 ? "hidden sm:block" : ""}`}
          />
        ))}
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Block className="h-24" />
          <div className="space-y-2">
            <Block className="h-6 w-56 rounded-md" />
            <Block className="h-4 w-full rounded-md" />
            <Block className="h-4 w-full rounded-md" />
            <Block className="h-4 w-2/3 rounded-md" />
          </div>
          <Block className="h-32" />
        </div>
        <Block className="h-96" />
      </div>
    </div>
  );
}
