import { AwardsBanner } from "@/components/home/awards-banner";
import { DestinationRail } from "@/components/home/destination-rail";
import { HeroSearch } from "@/components/home/hero-search";
import { IconicRail } from "@/components/home/iconic-rail";
import { InspirationRail } from "@/components/home/inspiration-rail";
import { InterestGrid } from "@/components/home/interest-grid";
import { PromoBanner } from "@/components/home/promo-banner";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { StoryCard } from "@/components/home/story-card";
import { stories } from "@/lib/home-data";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HeroSearch />
        <PromoBanner />
        <InterestGrid />
        <StoryCard story={stories[0]} />
        <DestinationRail />
        <StoryCard story={stories[1]} />
        <InspirationRail />
        <IconicRail />
        <AwardsBanner />
      </main>

      <SiteFooter />
    </div>
  );
}
