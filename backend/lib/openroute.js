import 'dotenv/config';

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';


export async function estimateDrivingRoute({ fromLat, fromLng, toLat, toLng }) {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) throw new Error('OPENROUTESERVICE_API_KEY belum diset di .env');

  const res = await fetch(ORS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: key,
    },
    // ORS memakai urutan [longitude, latitude], kebalikan dari kebiasaan umum
    body: JSON.stringify({
      coordinates: [
        [Number(fromLng), Number(fromLat)],
        [Number(toLng), Number(toLat)],
      ],
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // 2010 = titik tidak terjangkau jalan; ini kasus antarpulau
    const code = data?.error?.code;
    if (res.status === 404 || code === 2010 || code === 2009) {
      return {
        routable: false,
        message: 'Tidak ada jalur darat antara kedua titik ini. Kemungkinan terpisah laut, jadi perlu penerbangan atau kapal.',
      };
    }

    const err = new Error('ORS_REQUEST_FAILED');
    err.status = res.status;
    err.detail = data;
    throw err;
  }

  const summary = data?.routes?.[0]?.summary;

  if (!summary) {
    return {
      routable: false,
      message: 'Rute darat tidak ditemukan antara kedua titik ini.',
    };
  }

  return {
    routable: true,
    distance_km: Math.round((summary.distance / 1000) * 10) / 10,
    duration_minutes: Math.round(summary.duration / 60),
  };
}
