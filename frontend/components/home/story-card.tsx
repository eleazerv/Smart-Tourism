import Image from "next/image";
import Link from "next/link";
import { photo, type Story } from "@/lib/home-data";

export function StoryCard({ story }: { story: Story }) {
  return (
    <article className="container-page py-3">
      <div className="flex flex-col items-stretch gap-4 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-40">
          <Image
            src={photo(story.seed, 400, 300)}
            alt=""
            fill
            sizes="(min-width: 640px) 160px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold leading-snug">
            {story.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {story.excerpt}
          </p>
        </div>

        <Link
          href="/stories"
          className="shrink-0 self-start rounded-full border border-brand-700 px-5 py-2.5 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-700 hover:text-brand-50 sm:self-auto dark:border-brand-100 dark:text-brand-100 dark:hover:bg-brand-100 dark:hover:text-brand-900"
        >
          {story.cta}
        </Link>
      </div>
    </article>
  );
}
