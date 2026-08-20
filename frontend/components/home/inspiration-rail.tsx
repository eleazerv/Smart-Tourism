import Image from "next/image";
import Link from "next/link";
import { inspirations, photo } from "@/lib/home-data";
import { FavoriteButton } from "@/components/home/favorite-button";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";

export function InspirationRail() {
  return (
    <div className="bg-muted">
      <Section title="Inspirasi untuk membantu Anda memulai">
        <Rail label="Inspirasi perjalanan">
          {inspirations.map((item) => (
            <article
              key={item.title}
              className="w-[70%] shrink-0 snap-start sm:w-[45%] lg:w-[calc(33.333%-0.667rem)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-brand-700">
                <FavoriteButton label={item.title} />
                <Image
                  src={photo(item.seed, 700, 440)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 70vw"
                  className="object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <h3 className="mt-3 text-center text-sm font-semibold leading-snug">
                <Link href="/stories" className="underline-offset-2 hover:underline">
                  {item.title}
                </Link>
              </h3>
            </article>
          ))}
        </Rail>
      </Section>
    </div>
  );
}
