import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { photo } from "@/lib/home-data";

export function PromoBanner() {
  const t = useTranslations("home.promo");

  return (
    <section className="container-page py-4">
      <div className="grid overflow-hidden rounded-2xl bg-brand-700 md:grid-cols-2">
        <div className="relative min-h-[220px] md:min-h-[300px]">
          <Image
            src={photo("bali-temple-gate", 900, 700)}
            alt={t("imageAlt")}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
          {/* <span className="absolute bottom-3 left-3 rounded-full bg-brand-900/70 px-3 py-1 text-xs font-medium text-brand-50 backdrop-blur">
            @adriansj88
          </span> */}
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-sm text-white/80 sm:text-base">
            {t("body")}
          </p>
          {/* Stays light on hover. Darkening it to brand-900 would sink the
              button into the panel behind it, which is only a shade lighter. */}
          <Link
            href="/destinations"
            className="w-fit rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
