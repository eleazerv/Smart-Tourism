/** Placeholder held by the Suspense boundary in `app/destinations/page.tsx`. */

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export function CatalogueSkeleton() {
  return (
    <>
      <div className="bg-brand-900/90">
        <div className="container-page space-y-3 py-10 sm:py-14">
          <Block className="h-3 w-40 rounded-md bg-brand-700" />
          <Block className="h-9 w-72 max-w-full rounded-md bg-brand-700" />
          <Block className="h-4 w-96 max-w-full rounded-md bg-brand-700" />
          <Block className="mt-4 h-12 w-full max-w-2xl rounded-full bg-brand-700" />
        </div>
      </div>

      <div className="border-b border-border">
        <div className="container-page flex gap-2 py-3">
          {Array.from({ length: 7 }, (_, i) => (
            <Block key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[16rem_1fr]">
        <div className="hidden space-y-4 lg:block">
          <Block className="h-5 w-32 rounded-md" />
          {Array.from({ length: 10 }, (_, i) => (
            <Block key={i} className="h-5 w-full rounded-md" />
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Block className="h-4 w-48 rounded-md" />
            <Block className="h-9 w-44 rounded-full" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <Block key={i} className="h-44 sm:h-40" />
          ))}
        </div>
      </div>
    </>
  );
}
