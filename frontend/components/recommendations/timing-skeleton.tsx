/** Placeholder held by the Suspense boundary in `app/recommendations/page.tsx`. */

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export function TimingSkeleton() {
  return (
    <>
      <div className="bg-brand-900 py-10">
        <div className="container-page space-y-3">
          <Block className="h-9 w-72 rounded-md bg-white/10" />
          <Block className="h-4 w-full max-w-xl rounded-md bg-white/10" />
          <div className="flex gap-2 pt-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Block key={i} className="h-8 w-24 rounded-full bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      <div className="container-page space-y-8 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Block key={i} className="h-56" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Block className="h-48" />
          <Block className="h-48" />
        </div>
      </div>
    </>
  );
}
