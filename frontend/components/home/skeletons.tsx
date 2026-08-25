/** Placeholders held by the Suspense boundaries in `app/page.tsx`. */

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

function Heading() {
  return (
    <div className="mb-4 space-y-2">
      <Block className="h-6 w-64 rounded-md" />
      <Block className="h-4 w-80 rounded-md" />
    </div>
  );
}

export function GridSkeleton({ items = 8 }: { items?: number }) {
  return (
    <section className="py-8 sm:py-10">
      <div className="container-page">
        <Heading />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: items }, (_, i) => (
            <Block key={i} className="aspect-[4/5] sm:aspect-[4/3]" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function RailSkeleton({ aspect = "aspect-[4/3]" }: { aspect?: string }) {
  return (
    <section className="py-8 sm:py-10">
      <div className="container-page">
        <Heading />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="w-[calc(75%-0.5rem)] shrink-0 space-y-2.5 sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"
            >
              <Block className={aspect} />
              <Block className="h-4 w-3/4 rounded-md" />
              <Block className="h-3 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MapSkeleton() {
  return (
    <section className="py-8 sm:py-10">
      <div className="container-page">
        <Heading />
        <div className="mb-4 flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Block key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Block className="h-[340px] sm:h-[440px] lg:h-[480px]" />
          <Block className="h-44" />
        </div>
      </div>
    </section>
  );
}
