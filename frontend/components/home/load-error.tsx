import { useTranslations } from "next-intl";
import { API_BASE_URL } from "@/lib/api";

/**
 * Shown in place of a section whose API call failed, so one unreachable
 * endpoint degrades a single rail instead of taking down the whole page.
 */
export function LoadError({ what }: { what: string }) {
  const t = useTranslations("common");

  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {t("loadError", { what, url: API_BASE_URL })}
    </p>
  );
}
