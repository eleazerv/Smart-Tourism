import { Suspense } from "react";
import {
  ForYouPrompt,
  ForYouRail,
} from "@/components/account/for-you-rail";
import { DestinationRail } from "@/components/home/destination-rail";
import { HeroSearch } from "@/components/home/hero-search";
import { InspirationRail } from "@/components/home/inspiration-rail";
import { InterestGrid } from "@/components/home/interest-grid";
import { PromoBanner } from "@/components/home/promo-banner";
import { SeasonalRail } from "@/components/home/seasonal-rail";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { GridSkeleton, RailSkeleton } from "@/components/home/skeletons";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Each API-backed section streams in behind its own boundary, so a slow
          endpoint delays one rail instead of the whole page. */}
      <main className="flex-1">
        <HeroSearch />

        {/* Personalised slot: the rail for signed-in users, a sign-in nudge for
            everyone else. Both read cookies, so the shell stays static and this
            one hole streams in. */}
        <Suspense fallback={null}>
          <ForYouRail />
          <ForYouPrompt />
        </Suspense>

        <Suspense fallback={<GridSkeleton />}>
          <InterestGrid />
        </Suspense>

        <PromoBanner />

        <Suspense fallback={<RailSkeleton />}>
          <DestinationRail />
        </Suspense>

        <InspirationRail />

        <Suspense fallback={<RailSkeleton aspect="aspect-[3/4] lg:aspect-[4/3]" />}>
          <SeasonalRail />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
