"use client";

import { useTransition } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Pemilih bahasa di header.
 *
 * `usePathname` versi i18n mengembalikan path **tanpa** prefiks bahasa, jadi
 * `router.replace` di bawah menaruh pembaca di halaman yang persis sama dalam
 * bahasa lain — bukan melemparnya kembali ke beranda. `params` ikut dikirim
 * karena rute dinamis seperti `/destinations/[id]` butuh nilainya untuk
 * dirakit ulang.
 */
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      // @ts-expect-error -- `params` datang dari hook sebagai bentuk lepas;
      // pasangan pathname/params-nya baru diketahui saat runtime.
      router.replace({ pathname, params }, { locale: next });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("changeLanguage")}
          disabled={pending}
          className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-brand-tint/10 disabled:opacity-60 sm:inline-flex"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Globe className="h-4 w-4" aria-hidden />
          )}
          {locale.toUpperCase()}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-44 rounded-xl p-1.5">
        {routing.locales.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => switchTo(option)}
            className={cn(
              "cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm focus:bg-brand-tint/10 focus:text-brand-700",
              option === locale && "font-semibold text-brand-700",
            )}
          >
            <span className="flex-1">{LOCALE_LABELS[option]}</span>
            {option === locale && <Check className="h-4 w-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
