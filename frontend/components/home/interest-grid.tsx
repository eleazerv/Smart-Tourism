import Image from "next/image";
import Link from "next/link";
import { interests, photo } from "@/lib/home-data";
import { Section } from "@/components/home/section";

export function InterestGrid() {
  return (
    <Section
      title="Hal yang Dapat Dilakukan berdasarkan minat"
      subtitle="Apa pun yang Anda inginkan, kami siap membantu"
      action={{ label: "Lihat semua", href: "/destinations" }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {interests.map((interest) => (
          <Link
            key={interest.slug}
            href={`/destinations?tags=${interest.slug}`}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-brand-700 sm:aspect-[4/3]"
          >
            <Image
              src={photo(interest.seed, 600, 700)}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-brand-900/40"
            />
            <span className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-bold leading-tight text-brand-50">
              {interest.name}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
