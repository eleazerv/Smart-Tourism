import Image from "next/image";
import { BedDouble, Compass, Map, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { tagImage } from "@/lib/tag-image";

/**
 * Perkenalan singkat ke empat menu utama. Tautannya sengaja tidak bisa diklik
 * dari sini — langkah ini masih di dalam wizard, dan meninggalkannya sebelum
 * "Mulai jelajahi" berarti isian wizard belum tersimpan.
 */
const FEATURES = [
  { icon: Compass, key: "destinations" },
  { icon: Map, key: "map" },
  { icon: Sparkles, key: "planner" },
  { icon: BedDouble, key: "booking" },
] as const;

/**
 * Spanduk penutup memakai foto tema pertama yang tadi dipilih: sudah diunduh
 * di langkah sebelumnya, jadi tidak menambah muatan sama sekali, dan layar
 * terakhir jadi memantulkan pilihan orangnya sendiri. `tagImage` yang
 * mengurus slug tanpa foto.
 */
export function WelcomeStep({
  name,
  heroSlug,
}: {
  name: string;
  heroSlug?: string;
}) {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-5">
      <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-brand-900 sm:aspect-[5/2]">
        <Image
          src={tagImage(heroSlug ?? "jelantara-welcome", 1000, 440)}
          alt=""
          fill
          sizes="(min-width: 768px) 520px, 92vw"
          className="object-cover"
        />
        <span aria-hidden className="absolute inset-0 bg-brand-900/45" />
        <p className="absolute inset-x-0 bottom-0 p-5 font-display text-xl font-bold leading-tight text-white sm:text-2xl">
          {t("welcomeBanner", { name: name || t("fallbackName") })}
        </p>
      </div>

      <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint/10 text-brand-700">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {t(`feature.${key}Title`)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t(`feature.${key}Body`)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        {t("footnote")}
      </p>
    </div>
  );
}
