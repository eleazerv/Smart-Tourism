import { NextResponse } from "next/server";
import { cacheLife } from "next/cache";
import { getSeasonalRecommendations } from "@/lib/api";

/**
 * Bulan-bulan terbaik untuk mengunjungi satu destinasi.
 *
 * Jawabannya harus dirakit dari dua belas panggilan ke `/api/recommendations`
 * — satu per bulan — karena API itu menjawab "destinasi apa yang cocok di
 * bulan X", bukan "bulan apa yang cocok untuk destinasi X". Dua belas
 * permintaan dari browser tiap kali pratinjau dibuka jelas kemahalan, jadi
 * fan-out-nya dikerjakan di server ini dan hasilnya di-cache; pratinjau cukup
 * memanggil satu url.
 *
 * Pola musim berubah dalam hitungan bulan, bukan menit, jadi cache berjam-jam
 * masih jauh lebih segar daripada yang dibutuhkan.
 */

async function bestMonths(destinationId: string, provinceId: number | null) {
  "use cache";
  cacheLife("hours");

  const results = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) =>
      getSeasonalRecommendations({
        month: i + 1,
        province_id: provinceId ?? undefined,
      }),
    ),
  );

  const months: number[] = [];
  const seasons = new Set<string>();

  results.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const { destinations, season_info } = result.value;
    if (!destinations.some((item) => item.id === destinationId)) return;
    months.push(i + 1);
    // Panggilannya sudah dibatasi ke provinsi destinasi ini, jadi tiap entri
    // di sini menggambarkan iklim provinsi itu pada bulan yang cocok.
    for (const entry of season_info) seasons.add(entry.season);
  });

  return { months, seasons: [...seasons] };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const destinationId = searchParams.get("destination_id");
  if (!destinationId) {
    return NextResponse.json(
      { error: "invalid_query", months: [], seasons: [] },
      { status: 400 },
    );
  }

  const rawProvince = Number(searchParams.get("province_id"));
  const provinceId = Number.isInteger(rawProvince) && rawProvince > 0 ? rawProvince : null;

  try {
    return NextResponse.json(await bestMonths(destinationId, provinceId));
  } catch {
    // Pratinjau tetap berguna tanpa bagian ini, jadi kegagalannya tidak fatal:
    // daftar kosong membuat blok waktu terbaik hilang dengan sendirinya.
    return NextResponse.json(
      { error: "upstream_error", months: [], seasons: [] },
      { status: 502 },
    );
  }
}
