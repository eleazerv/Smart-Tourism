import Image from "next/image";
import Link from "next/link";
import { photo } from "@/lib/home-data";

export function PromoBanner() {
  return (
    <section className="container-page py-4">
      <div className="grid overflow-hidden rounded-2xl bg-brand-100 md:grid-cols-2 dark:bg-brand-600">
        <div className="relative min-h-[220px] md:min-h-[300px]">
          <Image
            src={photo("bali-temple-gate", 900, 700)}
            alt="Dua wisatawan berjalan melewati gerbang pura di Bali"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
          <span className="absolute bottom-3 left-3 rounded-full bg-brand-900/70 px-3 py-1 text-xs font-medium text-brand-50 backdrop-blur">
            @adriansj88
          </span>
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-brand-900 sm:text-4xl dark:text-brand-50">
            Temukan hal yang dapat dilakukan untuk semua yang Anda inginkan
          </h2>
          <p className="text-sm text-brand-900/80 sm:text-base dark:text-brand-50/80">
            Telusuri lebih dari 40.000 pengalaman di seluruh Nusantara dan pesan
            melalui kami.
          </p>
          <Link
            href="/destinations"
            className="w-fit rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-brand-50 transition hover:bg-brand-700 dark:bg-brand-50 dark:text-brand-900 dark:hover:bg-brand-100"
          >
            Pesan sekarang
          </Link>
        </div>
      </div>
    </section>
  );
}
