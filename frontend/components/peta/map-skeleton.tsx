/** Placeholder held by the Suspense boundary in `app/peta/page.tsx`. */

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse bg-muted ${className}`} />;
}

export function MapSkeleton() {
  return (
    <div className="flex min-h-0 flex-col lg:h-full lg:flex-row">
      <div className="relative h-[60vh] min-h-[20rem] shrink-0 lg:h-full lg:min-h-0 lg:flex-1">
        <Block className="h-full w-full" />
        <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-3">
          <Block className="h-10 w-72 rounded-full" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <Block key={i} className="h-9 w-28 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 space-y-3 border-border p-4 lg:h-full lg:w-[22rem] lg:border-l">
        <Block className="h-44 rounded-2xl" />
        <Block className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
