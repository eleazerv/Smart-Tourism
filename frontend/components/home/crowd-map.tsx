import { cacheLife } from "next/cache";
import { getHeatmap, type HeatmapEntry } from "@/lib/api";
import { buildDensityPoints } from "@/lib/heatmap-data";
import { CrowdMapPanel } from "@/components/home/crowd-map-panel";
import { LoadError } from "@/components/home/load-error";
import { Section } from "@/components/home/section";

const TITLE = "Peta Kepadatan";
const SUBTITLE =
  "Sebaran kunjungan wisatawan per provinsi. Pilih daerahnya untuk melihat mana yang masih longgar.";

async function loadHeatmap() {
  "use cache";
  // `GET /api/heatmap` serves a monthly aggregate, so the numbers move slowly.
  cacheLife("hours");
  return getHeatmap();
}

/**
 * Landing-page crowd map. Anchored at `#peta-kepadatan` — the quick link in
 * the hero and the footer both jump here rather than to a page of its own.
 */
export async function CrowdMap() {
  let entries: HeatmapEntry[];
  try {
    entries = await loadHeatmap();
  } catch {
    return (
      <Section id="peta-kepadatan" title={TITLE}>
        <LoadError what="Peta kepadatan" />
      </Section>
    );
  }

  const points = buildDensityPoints(entries);
  if (points.length === 0) {
    return (
      <Section id="peta-kepadatan" title={TITLE}>
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Belum ada data kunjungan untuk periode ini.
        </p>
      </Section>
    );
  }

  return (
    <Section id="peta-kepadatan" title={TITLE} subtitle={SUBTITLE}>
      <CrowdMapPanel points={points} />
    </Section>
  );
}
