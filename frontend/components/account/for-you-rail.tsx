import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPersonalRecommendations } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { loadSavedIds } from "@/lib/saved-destinations";
import { DestinationCard } from "@/components/home/destination-card";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";

/**
 * Content-based recommendations from `/api/recommendations/for-you`.
 *
 * Reads the session cookie, so this is always dynamic — callers must place it
 * behind a Suspense boundary. On the public home page it renders nothing for
 * signed-out or preference-less visitors; on the account page it explains what
 * is missing instead.
 */
export async function ForYouRail({
  title,
  explainEmpty = false,
  bare = false,
}: {
  /** Dibiarkan kosong berarti pakai judul bawaan dari kamus. */
  title?: string;
  /** Show a call to action instead of disappearing when there is nothing yet. */
  explainEmpty?: boolean;
  /** Drop the page gutter, for rendering inside the account column. */
  bare?: boolean;
}) {
  const t = await getTranslations("home.forYou");
  const heading = title ?? t("title");

  const token = await getAccessToken();
  if (!token) return null;

  let preferenceTags;
  let destinations;
  try {
    ({ preference_tags: preferenceTags, destinations } =
      await getPersonalRecommendations({ token }));
  } catch {
    return null;
  }

  if (destinations.length === 0) {
    if (!explainEmpty) return null;
    return (
      <Section title={heading} bare={bare}>
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {preferenceTags.length === 0
            ? t("emptyNoPreferences")
            : t("emptyNoMatches")}
        </p>
      </Section>
    );
  }

  const savedIds = await loadSavedIds();

  return (
    <Section
      bare={bare}
      title={heading}
      subtitle={t("subtitle", {
        tags: preferenceTags.map((tag) => tag.name).join(", "),
      })}
      action={{ label: t("manage"), href: "/akun/minat" }}
    >
      <Rail label={t("railLabel")}>
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            saved={savedIds.has(destination.id)}
            note={
              destination.matched_tags.length > 0
                ? t("matched", {
                    tags: destination.matched_tags
                      .map((tag) => tag.name)
                      .join(", "),
                  })
                : undefined
            }
          />
        ))}
      </Rail>
    </Section>
  );
}

/** Sign-in nudge shown on the public home page in place of the rail. */
export async function ForYouPrompt() {
  const t = await getTranslations("home.forYou");

  const token = await getAccessToken();
  if (token) return null;

  return (
    <section className="container-page py-4">
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">
            {t("promptTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("promptBody")}
          </p>
        </div>
        <Link
          href="/auth/login"
          className="shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          {t("promptCta")}
        </Link>
      </div>
    </section>
  );
}
