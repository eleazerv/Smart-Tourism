import Image from "next/image";
import Link from "next/link";
import { iconicCities, photo } from "@/lib/home-data";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";

export function IconicRail() {
  return (
    <Section title="Tempat ikonik yang harus Anda lihat">
      <Rail label="Kota ikonik">
        {iconicCities.map((city) => (
          <Link
            key={city.name}
            href={`/destinations?q=${encodeURIComponent(city.name)}`}
            className="group relative aspect-[3/4] w-[60%] shrink-0 snap-start overflow-hidden rounded-2xl bg-brand-700 sm:w-[40%] lg:aspect-[4/3] lg:w-[calc(25%-0.75rem)]"
          >
            <Image
              src={photo(city.seed, 600, 800)}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 60vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-brand-900/45"
            />
            <span className="absolute inset-x-0 bottom-0 p-4">
              <span className="block font-display text-lg font-bold text-brand-50">
                {city.name}
              </span>
              <span className="block text-xs text-brand-100">{city.region}</span>
            </span>
          </Link>
        ))}
      </Rail>
    </Section>
  );
}
