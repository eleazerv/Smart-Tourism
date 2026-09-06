import { useTranslations } from "next-intl";
import { Compass, Landmark, MapPinned } from "lucide-react";
import type { DestinationDetail } from "@/lib/api";

/** Quick-facts strip under the title, the way a guide opens a place entry. */
export function Facts({ destination }: { destination: DestinationDetail }) {
  const t = useTranslations("destination");

  const facts = [
    {
      icon: Compass,
      label: t("category"),
      value: destination.category ?? t("uncategorised"),
    },
    {
      icon: MapPinned,
      label: t("city"),
      value: destination.cities?.name ?? "—",
    },
    {
      icon: Landmark,
      label: t("province"),
      value: destination.provinces?.name ?? "—",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-tint/10 text-brand-700">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="truncate text-sm font-semibold" title={value}>
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
